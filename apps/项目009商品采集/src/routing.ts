// 路径规划：调用地图服务获取真实道路路线与转向步骤。
// 支持：amap（高德 driving）/ tencent（腾讯 driving）/ osm（OSRM 公共实例）。
// 高德/腾讯返回 GCJ-02 坐标（已解码 polyline）；OSM 返回 WGS-84。
// 任一服务失败（网络/CORS/限流/缺Key）时降级为直线几何 + 合成步骤，保证功能可用。

import { bearingToCompass, estimateDuration, formatDistance, haversine } from './geo'
import { decodeGCJPolyline, hasCredentials, wgs84ToGcj02 } from './mapservice'
import { amapDistanceRow, amapDriving } from './amap'
import { baiduRoute } from './baidu'
import { qqUrl, qqUrlSp } from './proxy'
import { q, TTLCache } from './async'
import type { MapService, MapSettings } from './mapservice'
import type { NavStep, RouteSegment } from './types'

const OSRM = 'https://router.project-osrm.org/route/v1'

/** 算路方式（对应腾讯 /ws/direction/v1/{mode}、高德 /v3/direction/{mode}） */
export type RouteMode = 'driving' | 'walking' | 'bicycling'

interface OSRMStep {
  distance: number
  duration: number
  maneuver: { location: [number, number] }
  name?: string
  instruction?: string
}
interface OSRMRoute {
  geometry: { coordinates: Array<[number, number]> } // [lng, lat]
  legs: Array<{ steps: OSRMStep[]; distance: number; duration: number }>
  distance: number
  duration: number
}

function lngLatToLatLng(coords: Array<[number, number]>): Array<[number, number]> {
  return coords.map(([lng, lat]) => [lat, lng])
}

/**
 * OSRM 返回 WGS-84，而高德/腾讯底图是 GCJ-02。
 * 缺少这一步时，「高德 + 步行/骑行」兜底到 OSRM 的路线会整体偏移约 300~500 米
 * （表现为路线画在道路旁的楼块/空地上）。故非 OSM 服务一律转 GCJ-02 后再绘制。
 */
function toCurrentCRS(coords: Array<[number, number]>, settings: MapSettings): Array<[number, number]> {
  if (settings.service === 'osm') return coords
  return coords.map(([lat, lng]) => wgs84ToGcj02(lat, lng))
}

function shouldUseOsm(settings: MapSettings): boolean {
  return settings.service === 'osm' || !hasCredentials(settings)
}

/**
 * 获取一段从 A 到 B 的路线（直线距离用于降级与距离估算）。
 * opts.mode 支持 walking / bicycling（腾讯原生；OSRM 换用 foot/bicycle 剖面；高德 JS API 仅驾车）。
 * opts.fromPoi 为起点 POI ID，用于起点吸附纠偏（腾讯生效）。
 */
export async function getSegmentRoute(
  from: [number, number],
  to: [number, number],
  fromName: string,
  toName: string,
  fromIndex: number,
  toIndex: number,
  settings: MapSettings,
  signal?: AbortSignal,
  opts?: { mode?: RouteMode; fromPoi?: string },
): Promise<RouteSegment> {
  const straight = haversine(from[0], from[1], to[0], to[1])
  const mode = opts?.mode ?? 'driving'

  if (!shouldUseOsm(settings)) {
    const r = await serviceRoute(from, to, settings, signal, mode, mode, opts?.fromPoi)
    if (r) {
      return {
        fromIndex,
        toIndex,
        fromName,
        toName,
        distance: r.distance,
        duration: r.duration,
        steps: r.steps,
        geometry: r.geometry,
      }
    }
  }

  // OSM / 兜底：尝试 OSRM（按出行方式选剖面），失败则直线降级
  const osrm = await osrmRoute(from, to, settings, signal, mode)
  if (osrm) {
    return {
      fromIndex,
      toIndex,
      fromName,
      toName,
      distance: osrm.distance,
      duration: osrm.duration,
      steps: osrm.steps,
      geometry: osrm.geometry,
    }
  }
  return straightFallback(from, to, fromName, toName, fromIndex, toIndex, straight)
}

/** OSRM 公共实例算路（结果按服务坐标系对齐后缓存，无 Key 时这是主链路） */
async function osrmRoute(
  from: [number, number],
  to: [number, number],
  settings: MapSettings,
  signal: AbortSignal | undefined,
  mode: RouteMode,
): Promise<ServiceRoute | null> {
  const ck = routeCacheKey(from, to, settings, `osrm:${mode}`)
  const hit = routeCache.get(ck)
  if (hit) return hit

  const profile = mode === 'walking' ? 'foot' : mode === 'bicycling' ? 'bicycle' : 'driving'
  const url = `${OSRM}/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&steps=true&geometries=geojson`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { signal: signal ?? ctrl.signal })
    clearTimeout(t)
    if (!res.ok) throw new Error('osrm ' + res.status)
    const json = (await res.json()) as { code: string; routes: OSRMRoute[] }
    if (json.code !== 'Ok' || !json.routes.length) throw new Error('no route')
    const route = json.routes[0]
    const r: ServiceRoute = {
      distance: route.distance,
      duration: route.duration,
      geometry: toCurrentCRS(lngLatToLatLng(route.geometry.coordinates), settings),
      steps: (route.legs[0]?.steps ?? []).map((s) => ({
        instruction: s.instruction || `沿${s.name || '道路'}行驶${formatDistance(s.distance)}`,
        distance: s.distance,
        duration: s.duration,
        geometry: toCurrentCRS(lngLatToLatLng([s.maneuver.location]), settings),
      })),
    }
    routeCache.set(ck, r)
    return r
  } catch {
    return null
  }
}

function straightFallback(
  from: [number, number],
  to: [number, number],
  fromName: string,
  toName: string,
  fromIndex: number,
  toIndex: number,
  straight: number,
): RouteSegment {
  const deg = ((Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI + 360) % 360
  const dir = bearingToCompass(deg)
  return {
    fromIndex,
    toIndex,
    fromName,
    toName,
    distance: straight,
    duration: estimateDuration(straight),
    steps: [
      {
        instruction: `从「${fromName}」向${dir}方向直行${formatDistance(straight)}到达「${toName}」`,
        distance: straight,
        duration: estimateDuration(straight),
        geometry: [from, to],
      },
    ],
    geometry: [from, to],
  }
}

interface ServiceRoute {
  distance: number
  duration: number
  geometry: Array<[number, number]>
  steps: NavStep[]
}

/**
 * 真实算路结果缓存。
 *
 * 必要性：「开始优化」会对 N 段一次性发起请求，而站点往往重复（重算、改单、切回页面都重触）。
 * 同一个 from→to 在短时间内结果不会变，缓存后二次优化几乎零请求。
 * 只缓存成功的服务结果（不含直线降级），以免网络恢复后仍沿用旧的近似路线。
 */
const routeCache = new TTLCache<ServiceRoute>(400, 10 * 60 * 1000)

function routeCacheKey(
  from: [number, number],
  to: [number, number],
  settings: MapSettings,
  tag: string,
): string {
  return `${settings.service}|${tag}|${q(from[0])},${q(from[1])}|${q(to[0])},${q(to[1])}`
}

/**
 * 指定服务商单独算一次路（不做 OSRM/直线兜底）。
 * 供「多源聚合算路」使用：聚合层需要知道每一家是**真的算出来了**还是失败了，
 * 若这里兜底成直线，聚合就失去了「择优/容错」的意义。
 */
export async function routeForService(
  service: MapService,
  from: [number, number],
  to: [number, number],
  settings: MapSettings,
  signal: AbortSignal | undefined,
  mode: RouteMode,
): Promise<ServiceRoute | null> {
  if (service === 'osm') return null // OSM 不做为「服务」参与聚合，由聚合层统一兜底
  if (!hasCredentials({ ...settings, service })) return null
  return serviceRoute(from, to, { ...settings, service }, signal, mode, mode)
}

/** 暴露 ServiceRoute 类型，供聚合层组装结果 */
export type { ServiceRoute }

async function serviceRoute(
  from: [number, number],
  to: [number, number],
  settings: MapSettings,
  signal: AbortSignal | undefined,
  mode: RouteMode,
  tag: string,
  fromPoi?: string,
): Promise<ServiceRoute | null> {
  const ck = routeCacheKey(from, to, settings, tag + (fromPoi ? `|poi:${fromPoi}` : ''))
  const hit = routeCache.get(ck)
  if (hit) return hit
  try {
    let r: ServiceRoute | null
    if (settings.service === 'amap') {
      // 高德网关目前仅封装驾车（JS API 限制）；步行/骑行返回 null 交由下方 OSRM 的
      // foot/bicycle 剖面处理，避免拿驾车结果冒充步行/骑行路线
      r = mode === 'driving' ? await amapDriving(from, to, settings, signal) : null
    } else if (settings.service === 'baidu') {
      // 百度 directionlite 返回 BD-09，baidu.ts 内部已转成 GCJ-02
      const bd = await baiduRoute(from, to, settings, mode, signal)
      r = bd ? { distance: bd.distance, duration: bd.duration, geometry: bd.geometry, steps: bd.steps } : null
    } else {
      r = await routeTencent(from, to, settings, signal, mode, fromPoi)
    }
    if (r) routeCache.set(ck, r)
    return r
  } catch {
    return null
  }
}

async function routeTencent(
  from: [number, number],
  to: [number, number],
  settings: MapSettings,
  signal?: AbortSignal,
  mode: RouteMode = 'driving',
  fromPoi?: string,
): Promise<ServiceRoute | null> {
  const fromStr = `${from[0]},${from[1]}` // 腾讯：lat,lng
  const toStr = `${to[0]},${to[1]}`
  const params: Record<string, string> = { from: fromStr, to: toStr }
  // 起点吸附纠偏：传入起点 POI ID，避免坐标落在路口/停车场导致的起点偏移
  if (fromPoi) params.from_poi = fromPoi
  const url = qqUrl(`https://apis.map.qq.com/ws/direction/v1/${mode}/`, params, settings)
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: number
    result?: {
      routes?: Array<{
        distance: number
        duration: number
        polyline: string
        steps: Array<{ instruction: string; distance: number; duration: number; polyline: string }>
      }>
    }
  }
  if (json.status !== 0 || !json.result?.routes?.length) return null
  const route = json.result.routes[0]
  const geometry = decodeGCJPolyline(route.polyline)
  const steps: NavStep[] = route.steps.map((s) => ({
    instruction: s.instruction,
    distance: s.distance,
    duration: s.duration,
    geometry: [decodeGCJPolyline(s.polyline)[0] ?? from],
  }))
  return {
    distance: route.distance,
    duration: route.duration,
    geometry,
    steps,
  }
}

/**
 * 获取整条多点路线（按顺序访问所有站点）的几何，用于地图 _polyline 绘制。
 * 返回所有站点间的合并几何；失败返回 null（调用方改用各段 geometry 拼接）。
 */
export async function getFullRoute(
  points: Array<[number, number]>,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<Array<[number, number]> | null> {
  if (points.length < 2) return null
  if (shouldUseOsm(settings)) {
    const coord = points.map((p) => `${p[1]},${p[0]}`).join(';')
    const url = `${OSRM}/driving/${coord}?overview=full&geometries=geojson`
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(url, { signal: signal ?? ctrl.signal })
      clearTimeout(t)
      if (!res.ok) throw new Error('osrm ' + res.status)
      const json = (await res.json()) as { code: string; routes: OSRMRoute[] }
      if (json.code !== 'Ok' || !json.routes.length) return null
      return toCurrentCRS(lngLatToLatLng(json.routes[0].geometry.coordinates), settings)
    } catch {
      return null
    }
  }
  // 高德/腾讯整条路线：逐段请求并拼接概览几何
  try {
    const segs: Array<[number, number]>[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const r =
        settings.service === 'amap'
          ? await amapDriving(points[i], points[i + 1], settings, signal)
          : await routeTencent(points[i], points[i + 1], settings, signal)
      if (!r) return null
      if (i > 0) r.geometry.shift() // 去掉与上段重复的连接点
      segs.push(r.geometry)
    }
    return segs.flat()
  } catch {
    return null
  }
}

// ---- 距离矩阵（道路网真实距离，可用于提升 TSP 排序质量）----
export interface DistanceMatrix {
  /** 米，distances[i][j] 为第 i 点到第 j 点的路面距离 */
  distances: number[][]
  /** 秒，durations[i][j] 为第 i 点到第 j 点的预估时长 */
  durations: number[][]
}

interface MatrixRow {
  distances: number[]
  durations: number[]
}

const MATRIX_CHUNK = 200 // 单次请求最多 200 个终点（腾讯一对多上限）

async function matrixRowTencent(
  from: [number, number],
  to: Array<[number, number]>,
  settings: MapSettings,
  signal?: AbortSignal,
  mode: RouteMode = 'driving',
): Promise<MatrixRow> {
  const toStr = to.map((p) => `${p[0]},${p[1]}`).join(';')
  const url = qqUrl(
    'https://apis.map.qq.com/ws/distance/v1/matrix',
    { mode, from: `${from[0]},${from[1]}`, to: toStr },
    settings,
  )
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('tencent matrix ' + res.status)
  const json = (await res.json()) as {
    status: number
    message?: string
    result?: { rows?: Array<{ elements: Array<{ distance: number; duration: number }> }> }
  }
  if (json.status !== 0 || !json.result?.rows?.length) throw new Error(json.message || 'tencent matrix err')
  const row = json.result.rows[0]
  return {
    distances: row.elements.map((e) => e.distance),
    durations: row.elements.map((e) => e.duration),
  }
}

/**
 * 高德距离矩阵行（仅 Web 服务通道可用；JS 通道无此能力）。
 * 不可用时抛出错误，由上层 catch 退化为直线距离。
 */
async function matrixRowAmap(
  from: [number, number],
  to: Array<[number, number]>,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<MatrixRow> {
  const r = await amapDistanceRow(from, to, settings, signal)
  if (!r) throw new Error('amap distance matrix unavailable（需要 Web 服务 Key）')
  return r
}

/**
 * 批量计算点集两两之间的道路网距离/时长矩阵。
 * - 高德/腾讯且有 Key：调用官方距离矩阵接口（腾讯返回真实时长；高德仅距离，时长估算）。
 * - OSM 或缺失 Key：退化为 Haversine 直线距离 + 估算时长。
 * - 单行请求失败自动退化为该行直线距离，保证返回完整矩阵。
 * 注意：点数较多时会产生多次网络请求（每行一次，按 200 终点分批），请关注配额。
 */
export async function distanceMatrix(
  points: Array<[number, number]>,
  settings: MapSettings,
  opts?: { mode?: 'driving' | 'walking' | 'bicycling'; signal?: AbortSignal },
): Promise<DistanceMatrix> {
  const n = points.length
  const distances: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  const durations: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  if (n === 0) return { distances, durations }

  const signal = opts?.signal
  const mode = opts?.mode ?? 'driving'
  // 代理模式下凭证在服务端，不能用前端 getKey 判定，统一走 hasCredentials
  // 高德距离矩阵（v3/distance）按直线/驾车计算，无步行/骑行口径，故非驾车一律走 OSM 退化
  const useReal =
    settings.service !== 'osm' && hasCredentials(settings) && (settings.service !== 'amap' || mode === 'driving')
  if (!useReal) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const d = haversine(points[i][0], points[i][1], points[j][0], points[j][1])
        distances[i][j] = d
        durations[i][j] = estimateDuration(d)
      }
    }
    return { distances, durations }
  }

  const fetchRow = async (i: number): Promise<MatrixRow> => {
    const from = points[i]
    const dist = new Array(n).fill(0)
    const dur = new Array(n).fill(0)
    for (let c = 0; c < n; c += MATRIX_CHUNK) {
      const sub = points.slice(c, c + MATRIX_CHUNK)
      const row =
        settings.service === 'amap'
          ? await matrixRowAmap(from, sub, settings, signal)
          : await matrixRowTencent(from, sub, settings, signal, mode)
      for (let k = 0; k < sub.length; k++) {
        dist[c + k] = row.distances[k]
        dur[c + k] = row.durations[k]
      }
    }
    return { distances: dist, durations: dur }
  }

  const concurrency = 5
  let idx = 0
  const worker = async () => {
    while (idx < n) {
      const i = idx++
      try {
        const row = await fetchRow(i)
        distances[i] = row.distances
        durations[i] = row.durations
      } catch {
        for (let j = 0; j < n; j++) {
          if (i === j) continue
          const d = haversine(points[i][0], points[i][1], points[j][0], points[j][1])
          distances[i][j] = d
          durations[i][j] = estimateDuration(d)
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, n) }, () => worker()))
  return { distances, durations }
}

// ---- 货车路线规划 ----
export interface TruckOptions {
  /** 车型：1 微型 / 2 轻型 / 3 中型 / 4 重型 */
  size?: 1 | 2 | 3 | 4
  /** 车长（米） */
  length?: number
  /** 车高（米） */
  height?: number
  /** 车宽（米） */
  width?: number
  /** 总重（吨） */
  weight?: number
  /** 核定载重（吨） */
  load?: number
  /** 车牌号（设置后可避让政策性限行） */
  plateNumber?: string
  /** 策略偏好 1-10（参考实时路况/少收费/不走高速等） */
  policy?: number
}

/**
 * 货车路线规划。
 * - 腾讯：调用 /ws/direction/v1/trucking（**高级付费服务**，未开通商务试用时返回 null 走兜底）。
 * - 高德：货车路线为独立付费服务（Key 类型不同），此处降级用驾车路线近似。
 * - OSM / 兜底：直线降级。
 */
export async function getTruckRoute(
  from: [number, number],
  to: [number, number],
  fromName: string,
  toName: string,
  fromIndex: number,
  toIndex: number,
  settings: MapSettings,
  truck?: TruckOptions,
  signal?: AbortSignal,
): Promise<RouteSegment> {
  const straight = haversine(from[0], from[1], to[0], to[1])
  if (settings.service !== 'osm' && hasCredentials(settings)) {
    try {
      let r: ServiceRoute | null = null
      if (settings.service === 'amap') {
        r = await amapDriving(from, to, settings, signal) // 高德货车为独立付费服务，降级为驾车近似
      } else {
        r = await routeTencentTruck(from, to, settings, truck, signal)
      }
      if (r) {
        return {
          fromIndex,
          toIndex,
          fromName,
          toName,
          distance: r.distance,
          duration: r.duration,
          steps: r.steps,
          geometry: r.geometry,
        }
      }
    } catch {
      /* 落到下方兜底 */
    }
  }
  return straightFallback(from, to, fromName, toName, fromIndex, toIndex, straight)
}

async function routeTencentTruck(
  from: [number, number],
  to: [number, number],
  settings: MapSettings,
  truck: TruckOptions | undefined,
  signal?: AbortSignal,
): Promise<ServiceRoute | null> {
  const params = new URLSearchParams()
  params.set('from', `${from[0]},${from[1]}`)
  params.set('to', `${to[0]},${to[1]}`)
  if (truck?.size) params.set('size', String(truck.size))
  if (truck?.length) params.set('length', String(truck.length))
  if (truck?.height) params.set('height', String(truck.height))
  if (truck?.width) params.set('width', String(truck.width))
  if (truck?.weight) params.set('weight', String(truck.weight))
  if (truck?.load) params.set('load', String(truck.load))
  if (truck?.plateNumber) params.set('plate_number', truck.plateNumber)
  if (truck?.policy) params.set('policy', String(truck.policy))
  const url = qqUrlSp('https://apis.map.qq.com/ws/direction/v1/trucking', params, settings)
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: number
    result?: {
      routes?: Array<{
        distance: number
        duration: number
        polyline: string
        steps: Array<{ instruction: string; distance: number; duration: number; polyline: string }>
      }>
    }
  }
  if (json.status !== 0 || !json.result?.routes?.length) return null
  const route = json.result.routes[0]
  return {
    distance: route.distance,
    duration: route.duration,
    geometry: decodeGCJPolyline(route.polyline),
    steps: route.steps.map((s) => ({
      instruction: s.instruction,
      distance: s.distance,
      duration: s.duration,
      geometry: [decodeGCJPolyline(s.polyline)[0] ?? from],
    })),
  }
}

// ---- 等时等距可达圈（isochrone）----
// 腾讯：/ws/distance/v1/isochrone（按时间/距离结合街区面生成可达范围）。
// 高德（JS API Key，无可达圈能力）与 OSM：退化为圆形近似，保证 UI 仍有可展示范围。

export interface IsochroneResult {
  /** 可达范围轮廓 [lat, lng][]（闭合多边形） */
  polygon: Array<[number, number]>
  /** true = 服务不支持/解析失败，此轮廓为圆形近似 */
  approx: boolean
  /** 实际半径（米） */
  radius: number
}

/** 城市配送均速（米/秒），用于「秒 → 米」换算 */
const CITY_SPEED_MS = 25 / 3.6

/** 生成圆形近似轮廓（服务不支持时兜底） */
function circlePolygon(center: [number, number], radiusMeters: number, steps = 48): Array<[number, number]> {
  const [lat, lng] = center
  const latDeg = radiusMeters / 111320
  const cos = Math.cos((lat * Math.PI) / 180)
  const lngDeg = radiusMeters / (111320 * (Math.abs(cos) < 1e-6 ? 1 : cos))
  const out: Array<[number, number]> = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    out.push([lat + latDeg * Math.sin(t), lng + lngDeg * Math.cos(t)])
  }
  out.push(out[0])
  return out
}

/** 防御式解析可达圈轮廓（兼容 "lat,lng" 字符串 / {lat,lng} 对象 / [lng,lat] 数组） */
function parseIsoPolygon(raw: unknown): Array<[number, number]> | null {
  if (!Array.isArray(raw)) return null
  const pts: Array<[number, number]> = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const [a, b] = item.split(',').map(Number)
      if (Number.isFinite(a) && Number.isFinite(b)) pts.push([a, b])
    } else if (Array.isArray(item) && item.length >= 2) {
      const [a, b] = [Number(item[0]), Number(item[1])]
      if (Number.isFinite(a) && Number.isFinite(b)) {
        // 依据数值范围判定顺序：国内纬度 < 经度，故较小者为纬度
        pts.push(a < b ? [a, b] : [b, a])
      }
    } else if (item && typeof item === 'object') {
      const o = item as { lat?: number; lng?: number }
      if (Number.isFinite(o.lat) && Number.isFinite(o.lng)) pts.push([o.lat as number, o.lng as number])
    }
  }
  return pts.length >= 3 ? pts : null
}

/**
 * 等时/等距可达圈。二选一传入 seconds（等时）或 meters（等距）。
 * 腾讯 + WebServiceAPI Key 时请求真实街区面轮廓；否则返回圆形近似（approx=true）。
 */
export async function getIsochrone(
  center: [number, number],
  opts: { seconds?: number; meters?: number; mode?: RouteMode },
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<IsochroneResult | null> {
  const radius = Math.max(1, Math.round(opts.meters ?? (opts.seconds ?? 600) * CITY_SPEED_MS))
  const mode = opts.mode ?? 'driving'

  if (settings.service === 'tencent' && hasCredentials(settings)) {
    try {
      const p = new URLSearchParams()
      p.set('mode', mode)
      p.set('location', `${center[0]},${center[1]}`)
      // 二选一：给了距离用 radius，否则用 time（秒）
      if (opts.meters) p.set('radius', String(radius))
      else p.set('time', String(Math.round(opts.seconds ?? 600)))
      const url = qqUrlSp('https://apis.map.qq.com/ws/distance/v1/isochrone', p, settings)
      const res = await fetch(url, { signal })
      if (res.ok) {
        const json = (await res.json()) as { status: number; result?: { polygon?: unknown } }
        if (json.status === 0) {
          const poly = parseIsoPolygon(json.result?.polygon)
          if (poly) return { polygon: poly, approx: false, radius }
        }
      }
    } catch {
      /* 落到下方圆形近似 */
    }
  }
  return { polygon: circlePolygon(center, radius), approx: true, radius }
}
