// 百度地图 Web 服务封装（路线规划 / 地理编码 / 逆地理编码）。
//
// 与高德、腾讯不同，百度有两点必须单独处理：
//   1. 坐标系：百度用自有 BD-09，本项目的底图与路线数据全是 GCJ-02。
//      这里在「入参前 GCJ-02→BD-09、出参后 BD-09→GCJ-02」做双向转换，
//      保证拿到的几何可以直接和既有路线一起画，不会出现几百米偏移。
//   2. 跨域：百度 Web 服务**不返回 CORS 头**，浏览器直接 fetch 会被拦。
//      代理模式走 /api/map（Key 由服务端注入）；直连模式只能退化为 JSONP。
//
// 底图说明：百度未提供免密钥的 Web 瓦片直链，且其 BD-09MC 投影与 Leaflet 标准墨卡托
// 不兼容（强行接入会整体偏移）。因此选择「百度」时算路用百度数据，底图沿用 GCJ-02 瓦片。

import { jsonp } from './async'
import { bd09ToGcj02, gcj02ToBd09 } from './bd09'
import { proxyOf } from './proxy'
import type { MapSettings } from './mapservice'
import type { NavStep } from './types'

const BD = 'https://api.map.baidu.com'

/** 百度算路方式 → 端点名 */
const MODE_PATH: Record<string, string> = {
  driving: 'driving',
  walking: 'walking',
  bicycling: 'riding', // 百度把骑行叫 riding
}

export interface BdRoute {
  distance: number // 米
  duration: number // 秒
  geometry: Array<[number, number]> // 已转换为 GCJ-02
  steps: NavStep[] // 几何同样为 GCJ-02
}

function pathOf(base: string): string {
  return base.replace(/^https?:\/\//, '').replace(/^api\.map\.baidu\.com\/?/, '')
}

/**
 * 统一的百度 GET。
 * 返回 null 表示「这次没拿到可用结果」，由调用方决定是否降级（不抛异常打断流程）。
 */
async function bdGet<T>(
  base: string,
  params: Record<string, string>,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<T | null> {
  const qs = new URLSearchParams()
  for (const k of Object.keys(params)) {
    if (k === 'ak' || k === 'p' || k === 'output') continue
    qs.set(k, params[k])
  }

  const proxy = proxyOf(s)
  if (proxy) {
    qs.set('p', `baidu/${pathOf(base)}`)
    try {
      const res = await fetch(`${proxy}?${qs.toString()}`, { signal })
      const ct = res.headers.get('content-type') ?? ''
      // 代理没配好时会命中 SPA 回退返回 HTML，必须识别出来
      if (!res.ok || !ct.includes('json')) return null
      return (await res.json()) as T
    } catch {
      return null
    }
  }

  const ak = (s.keys.baidu ?? '').trim()
  if (!ak) return null
  qs.set('ak', ak)
  qs.set('output', 'json')
  try {
    return await jsonp<T>(`${base}?${qs.toString()}`)
  } catch {
    return null
  }
}

interface BdRouteResp {
  status?: number
  message?: string
  result?: {
    routes?: Array<{
      distance?: number
      duration?: number
      steps?: Array<{
        distance?: number
        duration?: number
        instructions?: string
        road_name?: string
        /** 形如 "39.9,116.3;39.91,116.31" 的 BD-09 坐标串 */
        path?: string
      }>
    }>
  }
}

/** 解析 "lat,lng;lat,lng" 坐标串并转为 GCJ-02 */
function parsePath(path?: string): Array<[number, number]> {
  if (!path) return []
  const out: Array<[number, number]> = []
  for (const seg of path.split(';')) {
    const [a, b] = seg.split(',')
    const lat = parseFloat(a)
    const lng = parseFloat(b)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    out.push(bd09ToGcj02(lat, lng))
  }
  return out
}

/**
 * 百度路线规划（directionlite v1）。
 * 注意方向：百度要求 origin/destination 是「纬度,经度」，与高德的「经度,纬度」相反。
 */
export async function baiduRoute(
  from: [number, number],
  to: [number, number],
  s: MapSettings,
  mode = 'driving',
  signal?: AbortSignal,
): Promise<BdRoute | null> {
  const [fLat, fLng] = gcj02ToBd09(from[0], from[1])
  const [tLat, tLng] = gcj02ToBd09(to[0], to[1])
  const verb = MODE_PATH[mode] ?? 'driving'

  const json = await bdGet<BdRouteResp>(
    `${BD}/directionlite/v1/${verb}`,
    {
      origin: `${fLat},${fLng}`,
      destination: `${tLat},${tLng}`,
      // 显式声明入参/出参坐标系，避免服务端默认值变化带来的偏移
      coord_type: 'bd09ll',
      ret_coordtype: 'bd09ll',
      steps: '1',
    },
    s,
    signal,
  )
  if (!json || json.status !== 0) return null
  const route = json.result?.routes?.[0]
  if (!route) return null

  const steps: NavStep[] = []
  const geometry: Array<[number, number]> = []
  for (const st of route.steps ?? []) {
    const pts = parsePath(st.path)
    if (pts.length) {
      // 相邻 step 首尾点重复，拼接时去重，避免几何里出现零长线段
      if (geometry.length) pts.shift()
      geometry.push(...pts)
    }
    steps.push({
      instruction: (st.instructions || st.road_name || '继续行驶').replace(/<[^>]+>/g, ''),
      distance: st.distance ?? 0,
      duration: st.duration ?? 0,
      geometry: pts.length ? [pts[0]] : [],
    })
  }

  if (!geometry.length) return null
  return {
    distance: route.distance ?? 0,
    duration: route.duration ?? 0,
    geometry,
    steps,
  }
}

interface BdGeoResp {
  status?: number
  result?: { location?: { lat?: number; lng?: number } }
}

/** 百度正向地理编码（地址 → 坐标），返回 GCJ-02 */
export async function baiduGeocode(
  address: string,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number } | null> {
  const json = await bdGet<BdGeoResp>(
    `${BD}/geocoding/v3`,
    { address, ret_coordtype: 'bd09ll' },
    s,
    signal,
  )
  const loc = json?.result?.location
  if (json?.status !== 0 || !loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
    return null
  }
  const [lat, lng] = bd09ToGcj02(loc.lat as number, loc.lng as number)
  return { lat, lng }
}

interface BdReverseResp {
  status?: number
  result?: {
    formatted_address?: string
    addressComponent?: { province?: string; city?: string; district?: string }
  }
}

/** 百度逆地理编码（坐标 → 地址）。入参为 GCJ-02，内部转 BD-09 再请求。 */
export async function baiduReverse(
  lat: number,
  lng: number,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<{ address: string } | null> {
  const [bLat, bLng] = gcj02ToBd09(lat, lng)
  const json = await bdGet<BdReverseResp>(
    `${BD}/reverse_geocoding/v3`,
    { location: `${bLat},${bLng}`, coordtype: 'bd09ll', ret_coordtype: 'bd09ll' },
    s,
    signal,
  )
  if (json?.status !== 0) return null
  return { address: json.result?.formatted_address ?? '' }
}

/** 百度 Key 可用性探测：用固定地址打一次地理编码，把常见错误码翻成可操作提示 */
export async function baiduTestKey(s: MapSettings): Promise<{ ok: boolean; msg: string }> {
  const r = await baiduGeocode('北京市天安门', s)
  if (r) return { ok: true, msg: '百度 AK 可用（地理编码正常）' }
  return {
    ok: false,
    msg: '百度 AK 不可用：请确认已创建「服务端」类型应用并勾选「地理编码」，且配额已分配',
  }
}
