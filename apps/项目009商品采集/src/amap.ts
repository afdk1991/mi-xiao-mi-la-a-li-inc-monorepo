// 高德统一网关：所有高德能力（地理编码 / 路径规划 / 输入提示 / POI / 天气 / 距离矩阵 / 轨迹纠偏）
// 都从这里进出，内部自动选择通道：
//
//   1) web  —— 高德「Web 服务 Key」+ restapi.amap.com（能力最全）
//              若 Key 在控制台开启了「数字签名」，必须同时提供签名私钥，本模块会自动
//              计算 sig=MD5(参数升序拼接 + 私钥) 追加到请求上，否则会返回 10007。
//   2) js   —— 高德「Web 端(JS) Key」+ JS API v2.0（需安全密钥 securityJsCode）
//              覆盖：地理编码 / 逆地理 / 驾车路径 / 输入提示 / POI / 天气。
//              不含：距离矩阵、轨迹纠偏（这两项仅有 Web 服务）。
//
// 每个 API 均按 web → js 顺序尝试，任一通道成功即返回，全部失败返回 null（调用方再兜底 OSM/直线）。

import { amapUrl, usingProxy } from './proxy'
import { loadAMap } from './amapLoader'
import { estimateDuration, formatDistance } from './geo'
import { decodeGCJPolyline, wgs84ToGcj02 } from './mapservice'
import type { MapSettings } from './mapservice'
import type { NavStep } from './types'

export interface AmapGeo {
  lat: number
  lng: number
}

export interface AmapRoute {
  distance: number
  duration: number
  geometry: Array<[number, number]>
  steps: NavStep[]
}

export interface AmapTip {
  id: string
  name: string
  district: string
  address: string
  location: [number, number] | null
}

export interface AmapPoiItem {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  tel?: string
  type?: string
}

export interface AmapWeatherNow {
  province: string
  city: string
  weather: string
  temperature: number
  windDirection: string
  windPower: string
  humidity: string
}

export interface AmapWeatherCast {
  date: string
  week: string
  dayWeather: string
  nightWeather: string
  dayTemp: number
  nightTemp: number
  dayWind: string
  dayPower: string
}

export interface AmapWeather {
  cityName: string
  now: AmapWeatherNow | null
  forecast: AmapWeatherCast[]
}

// ---- 通道判定 ----

/**
 * Web 服务通道的「可用标记」。
 * 代理模式下真实 Key 在服务端，这里返回占位符使通道判定为可用；
 * 实际请求由 sigUrl → amapUrl 打到代理，且不会携带任何 key/sig。
 */
function webKey(s: MapSettings): string {
  if (usingProxy(s)) return 'proxy'
  return (s.keys.amapWeb ?? '').trim()
}
/**
 * JS API 通道的 Key。
 * 代理模式下强制为空 —— JS API 必须把 Key 暴露在前端（只能靠 referer 白名单保护），
 * 走代理时应当完全禁用该通道，改为全部由服务端代理完成。
 */
function jsKey(s: MapSettings): string {
  if (usingProxy(s)) return ''
  return (s.keys.amap ?? '').trim()
}
function jsSecret(s: MapSettings): string {
  return (s.keys.amapSecret ?? '').trim()
}

export type AmapChannel = 'web' | 'js' | 'none'

/**
 * Web 服务通道「熔断」标记：一旦 restapi 返回 10007（数字签名）/10009（Key 类型不符），
 * 说明这枚 Web Key 在纯前端环境不可用，持久化后后续调用直接走 JS 通道，
 * 避免每个请求都白跑一次失败请求。用户在设置里改 Key 或点「恢复」时清除。
 */
const WEB_BLOCK_KEY = 'delivery.amapWebBlocked'
let webBlockedReason = ''
try {
  webBlockedReason = localStorage.getItem(WEB_BLOCK_KEY) ?? ''
} catch {
  /* ignore */
}

export function amapWebBlockReason(): string {
  return webBlockedReason
}
export function setAmapWebBlocked(reason: string): void {
  webBlockedReason = reason
  try {
    if (reason) localStorage.setItem(WEB_BLOCK_KEY, reason)
    else localStorage.removeItem(WEB_BLOCK_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 根据 infocode 判定 Web 通道是否永久不可用（本次会话内），返回可读原因。
 * - 10007 INVALID_USER_SIGNATURE：Key 开了数字签名但无私钥（纯前端无解，只能换通道）
 * - 10009 USERKEY_PLAT_NOMATCH：Key 类型不符（拿 JS Key 调 Web 服务）
 * - 10001/10002：Key 无效或未开通服务
 */
export function amapWebFailureReason(infocode?: string): string {
  switch (infocode) {
    case '10007':
      return '数字签名校验失败（10007）：该 Web 服务 Key 开启了数字签名，纯前端无法安全保管私钥'
    case '10009':
      return 'Key 类型不符（10009）：这枚不是「Web 服务」Key，restapi 不可用'
    case '10001':
    case '10002':
      return 'Web 服务 Key 无效或未开通对应服务'
    default:
      return ''
  }
}

/** 本次调用是否应尝试 Web 服务通道 */
function tryWeb(s: MapSettings): boolean {
  if (s.amapPref === 'js') return false
  if (webBlockedReason) return false
  return !!webKey(s)
}

/** 当前高德生效通道（供设置面板提示）：优先 web（可用时），否则 js */
export function amapChannel(s: MapSettings): AmapChannel {
  if (tryWeb(s)) return 'web'
  if (jsKey(s)) return 'js'
  return 'none'
}

/**
 * 构造 Web 服务 URL（高德全部 12 个端点都经由此处）。
 * - 代理模式：返回 `<proxy>?p=amap/v3/...&业务参数`，**不含 key / sig**，由服务端注入
 * - 直连模式：官方 URL + key；私钥非空时本地计算 sig（仅本地调试）
 */
function sigUrl(base: string, params: Record<string, string>, s: MapSettings): string {
  return amapUrl(base, params, s)
}

// ---- JS API 通用 Promise 包装 ----

async function withAMap(s: MapSettings): Promise<any> {
  return loadAMap(jsKey(s), jsSecret(s))
}

function toLatLng(p: any): [number, number] {
  const lng = typeof p?.lng === 'function' ? p.getLng() : p?.lng
  const lat = typeof p?.lat === 'function' ? p.getLat() : p?.lat
  return [lat, lng]
}

// ================= 地理编码（地址 → 坐标） =================

export async function amapGeocode(
  query: string,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapGeo | null> {
  if (tryWeb(s)) {
    try {
      const r = await webGeocode(query, s, signal)
      if (r) return r
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      return await jsGeocode(query, s, signal)
    } catch {
      /* ignore */
    }
  }
  return null
}

async function webGeocode(query: string, s: MapSettings, signal?: AbortSignal): Promise<AmapGeo | null> {
  const url = sigUrl(
    'https://restapi.amap.com/v3/geocode/geo',
    { address: query, key: webKey(s) },
    s,
  )
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: string
    geocodes?: Array<{ location?: string }>
  }
  if (json.status !== '1' || !json.geocodes?.length) return null
  const loc = json.geocodes[0].location
  if (!loc || !loc.includes(',')) return null
  const [lng, lat] = loc.split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng } // GCJ-02
}

async function jsGeocode(query: string, s: MapSettings, signal?: AbortSignal): Promise<AmapGeo | null> {
  const AMap = await withAMap(s)
  return new Promise<AmapGeo | null>((resolve) => {
    const onAbort = () => resolve(null)
    signal?.addEventListener('abort', onAbort)
    const geocoder = new AMap.Geocoder({ city: '全国', batch: false })
    geocoder.getLocation(query, (status: string, result: any) => {
      signal?.removeEventListener('abort', onAbort)
      if (status === 'complete' && result?.geocodes?.length) {
        const [lat, lng] = toLatLng(result.geocodes[0].location)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          resolve({ lat, lng })
          return
        }
      }
      resolve(null)
    })
  })
}

// ================= 逆地理编码（坐标 → 地址 / adcode） =================

export async function amapReverse(
  lat: number,
  lng: number,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<string | null> {
  if (tryWeb(s)) {
    try {
      const url = sigUrl(
        'https://restapi.amap.com/v3/geocode/regeo',
        { location: `${lng},${lat}`, extensions: 'base', key: webKey(s) },
        s,
      )
      const res = await fetch(url, { signal })
      if (res.ok) {
        const json = (await res.json()) as {
          status: string
          regeocode?: { formatted_address?: string }
        }
        if (json.status === '1' && json.regeocode?.formatted_address) return json.regeocode.formatted_address
      }
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      const AMap = await withAMap(s)
      return await new Promise<string | null>((resolve) => {
        const geocoder = new AMap.Geocoder({})
        geocoder.getAddress([lng, lat], (status: string, result: any) => {
          if (status === 'complete' && result?.regeocode) resolve(result.regeocode.formatted_address ?? null)
          else resolve(null)
        })
      })
    } catch {
      /* ignore */
    }
  }
  return null
}

/** 逆地理取 adcode（供天气等按行政区划查询的功能） */
export async function amapAdcode(
  lat: number,
  lng: number,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<string | null> {
  if (tryWeb(s)) {
    try {
      const url = sigUrl(
        'https://restapi.amap.com/v3/geocode/regeo',
        { location: `${lng},${lat}`, extensions: 'base', key: webKey(s) },
        s,
      )
      const res = await fetch(url, { signal })
      if (res.ok) {
        const json = (await res.json()) as {
          status: string
          regeocode?: { addressComponent?: { adcode?: string } }
        }
        const code = json.regeocode?.addressComponent?.adcode
        if (json.status === '1' && code) return String(code)
      }
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      const AMap = await withAMap(s)
      return await new Promise<string | null>((resolve) => {
        const geocoder = new AMap.Geocoder({})
        geocoder.getAddress([lng, lat], (status: string, result: any) => {
          const code = result?.regeocode?.addressComponent?.adcode
          if (status === 'complete' && code) resolve(String(code))
          else resolve(null)
        })
      })
    } catch {
      /* ignore */
    }
  }
  return null
}

// ================= 驾车路径规划 =================

export async function amapDriving(
  from: [number, number],
  to: [number, number],
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapRoute | null> {
  if (tryWeb(s)) {
    try {
      const r = await webDriving(from, to, s, signal)
      if (r) return r
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      return await jsDriving(from, to, s, signal)
    } catch {
      /* ignore */
    }
  }
  return null
}

async function webDriving(
  from: [number, number],
  to: [number, number],
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapRoute | null> {
  const url = sigUrl(
    'https://restapi.amap.com/v3/direction/driving',
    {
      origin: `${from[1]},${from[0]}`, // 高德：lng,lat
      destination: `${to[1]},${to[0]}`,
      extensions: 'all',
      key: webKey(s),
    },
    s,
  )
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: string
    route?: {
      paths?: Array<{
        distance: string
        duration: string
        polyline: string
        steps: Array<{ instruction: string; distance: string; duration: string; polyline: string }>
      }>
    }
  }
  if (json.status !== '1' || !json.route?.paths?.length) return null
  const path = json.route.paths[0]
  const geometry = decodeGCJPolyline(path.polyline)
  const steps: NavStep[] = path.steps.map((st) => ({
    instruction: st.instruction.replace(/<[^>]+>/g, ''),
    distance: Number(st.distance) || 0,
    duration: Number(st.duration) || estimateDuration(Number(st.distance) || 0),
    geometry: [decodeGCJPolyline(st.polyline)[0] ?? from],
  }))
  return {
    distance: Number(path.distance) || 0,
    duration: Number(path.duration) || estimateDuration(Number(path.distance) || 0),
    geometry,
    steps,
  }
}

async function jsDriving(
  from: [number, number],
  to: [number, number],
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapRoute | null> {
  const AMap = await withAMap(s)
  const policy = AMap.DrivingPolicy?.LEAST_DISTANCE ?? 2
  return new Promise<AmapRoute | null>((resolve) => {
    const onAbort = () => resolve(null)
    signal?.addEventListener('abort', onAbort)
    const driving = new AMap.Driving({ policy })
    driving.search(
      new AMap.LngLat(from[1], from[0]),
      new AMap.LngLat(to[1], to[0]),
      (status: string, result: any) => {
        signal?.removeEventListener('abort', onAbort)
        if (status !== 'complete' || !result?.routes?.length) {
          resolve(null)
          return
        }
        const route = result.routes[0]
        const geometry: Array<[number, number]> = []
        const steps: NavStep[] = (route.steps || []).map((st: any) => {
          const path: Array<[number, number]> = (st.path || []).map((p: any) => toLatLng(p))
          if (path.length) geometry.push(...path)
          const d = Number(st.distance) || 0
          return {
            instruction: String(st.instruction || `行驶${formatDistance(d)}`).replace(/<[^>]+>/g, ''),
            distance: d,
            duration: Number(st.time ?? estimateDuration(d)),
            geometry: path.length ? [path[0]] : [from],
          }
        })
        resolve({
          distance: Number(route.distance) || 0,
          duration: Number(route.time ?? estimateDuration(Number(route.distance) || 0)),
          geometry,
          steps,
        })
      },
    )
  })
}

// ================= 距离矩阵（仅 Web 服务） =================

export interface AmapMatrixRow {
  distances: number[]
  durations: number[]
}

/** 返回 null 表示不可用（无 Web 服务 Key），调用方应退化为直线距离 */
export async function amapDistanceRow(
  from: [number, number],
  to: Array<[number, number]>,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapMatrixRow | null> {
  if (!webKey(s)) return null
  const url = sigUrl(
    'https://restapi.amap.com/v3/distance',
    {
      type: '1',
      origins: `${from[1]},${from[0]}`,
      destination: to.map((p) => `${p[1]},${p[0]}`).join('|'),
      key: webKey(s),
    },
    s,
  )
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const json = (await res.json()) as {
      status: string
      results?: Array<{ distance?: string; duration?: string }>
    }
    if (json.status !== '1' || !json.results) return null
    const distances = json.results.map((r) => Number(r.distance) || 0)
    const durations = json.results.map((r, i) => Number(r.duration) || estimateDuration(distances[i]))
    return { distances, durations }
  } catch {
    return null
  }
}

// ================= 输入提示 =================

export async function amapTips(
  query: string,
  city: string | undefined,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapTip[]> {
  if (tryWeb(s)) {
    try {
      const params: Record<string, string> = { keywords: query, key: webKey(s) }
      if (city) {
        params.city = city
        params.citylimit = 'true'
      }
      const res = await fetch(sigUrl('https://restapi.amap.com/v3/assistant/inputtips', params, s), {
        signal,
      })
      if (res.ok) {
        const json = (await res.json()) as {
          status: string
          tips?: Array<{ id?: string; name?: string; district?: string; address?: string; location?: string }>
        }
        if (json.status === '1' && json.tips?.length) {
          const out = json.tips.filter((t) => t.name).map((t) => parseTip(t))
          if (out.length) return out
        }
      }
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      const AMap = await withAMap(s)
      return await new Promise<AmapTip[]>((resolve) => {
        const ac = new AMap.AutoComplete(city ? { city } : {})
        ac.search(query, (status: string, result: any) => {
          if (status !== 'complete' || !result?.tips?.length) {
            resolve([])
            return
          }
          resolve(
            result.tips
              .filter((t: any) => t.name)
              .map((t: any) => ({
                id: t.id || t.name,
                name: t.name,
                district: t.district ?? '',
                address: t.address ?? '',
                location: t.location ? toLatLng(t.location) : null,
              })),
          )
        })
      })
    } catch {
      /* ignore */
    }
  }
  return []
}

function parseTip(t: {
  id?: string
  name?: string
  district?: string
  address?: string
  location?: string
}): AmapTip {
  let location: [number, number] | null = null
  if (t.location && t.location.includes(',')) {
    const [lng, lat] = t.location.split(',').map(Number)
    if (Number.isFinite(lng) && Number.isFinite(lat) && (lng || lat)) location = [lat, lng]
  }
  return {
    id: t.id || t.name || '',
    name: t.name || '',
    district: t.district || '',
    address: t.address || '',
    location,
  }
}

// ================= POI 搜索 =================

export async function amapPoi(
  query: string,
  city: string | undefined,
  s: MapSettings,
  signal?: AbortSignal,
  location?: [number, number] | null,
): Promise<AmapPoiItem[]> {
  if (tryWeb(s)) {
    try {
      // 提供 location 时改用「周边搜索」（v3/place/around），按距离返回 3km 内结果
      const around = !!location
      const params: Record<string, string> = {
        keywords: query,
        offset: '25',
        page: '1',
        key: webKey(s),
        ...(around
          ? { location: `${location![0]},${location![1]}`, radius: '3000' }
          : city
            ? { city }
            : {}),
      }
      const res = await fetch(
        sigUrl(`https://restapi.amap.com/v3/place/${around ? 'around' : 'text'}`, params, s),
        { signal },
      )
      if (res.ok) {
        const json = (await res.json()) as {
          status: string
          infocode?: string
          pois?: Array<{ id?: string; name?: string; address?: string; location?: string; tel?: string; type?: string }>
        }
        if (json.status !== '1') {
          // Web 通道确认为不可恢复错误（签名/Key 类型）→ 熔断，后续直接走 JS
          const reason = amapWebFailureReason(json.infocode)
          if (reason) setAmapWebBlocked(reason)
        }
        if (json.status === '1' && json.pois?.length) {
          const out: AmapPoiItem[] = []
          for (const p of json.pois) {
            if (!p.location || !p.location.includes(',')) continue
            const [lng, lat] = p.location.split(',').map(Number)
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
            out.push({
              id: p.id || `${lat},${lng}`,
              name: p.name || '',
              address: p.address || '',
              lat,
              lng,
              tel: p.tel,
              type: p.type,
            })
          }
          if (out.length) return out
        }
      }
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      const AMap = await withAMap(s)
      return await new Promise<AmapPoiItem[]>((resolve) => {
        const ps = new AMap.PlaceSearch({ pageSize: 25, ...(city ? { city } : {}) })
        if (location) {
          // JS API 周边搜索：searchNearBy(关键词, 中心点, 半径)
          ps.searchNearBy(query, new AMap.LngLat(location[1], location[0]), 3000, (status: string, result: any) => {
            resolve(mapPlaceResult(result, status))
          })
        } else {
          ps.search(query, (status: string, result: any) => {
            resolve(mapPlaceResult(result, status))
          })
        }
      })
    } catch {
      /* ignore */
    }
  }
  return []
}

function mapPlaceResult(result: any, status: string): AmapPoiItem[] {
  const list = result?.poiList?.pois
  if (status !== 'complete' || !Array.isArray(list) || !list.length) return []
  return list.map((p: any) => {
    const [lat, lng] = toLatLng(p.location)
    return {
      id: p.id || `${lat},${lng}`,
      name: p.name || '',
      address: p.address || '',
      lat,
      lng,
      tel: p.tel,
      type: p.type,
    }
  })
}

// ================= 天气 =================

export async function amapWeather(
  adcode: string,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapWeather | null> {
  if (tryWeb(s)) {
    try {
      const r = await webWeather(adcode, s, signal)
      if (r) return r
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      return await jsWeather(adcode, s)
    } catch {
      /* ignore */
    }
  }
  return null
}

async function webWeather(adcode: string, s: MapSettings, signal?: AbortSignal): Promise<AmapWeather | null> {
  const url = sigUrl(
    'https://restapi.amap.com/v3/weather/weatherInfo',
    { city: adcode, extensions: 'all', key: webKey(s) },
    s,
  )
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: string
    lives?: Array<{
      province: string
      city: string
      weather: string
      temperature: string
      winddirection: string
      windpower: string
      humidity: string
    }>
    forecasts?: Array<{
      city: string
      casts: Array<{
        date: string
        week: string
        dayweather: string
        nightweather: string
        daytemp: string
        nighttemp: string
        daywind: string
        daypower: string
      }>
    }>
  }
  if (json.status !== '1') return null
  const live = json.lives?.[0]
  const f = json.forecasts?.[0]
  return {
    cityName: f?.city || live?.city || '',
    now: live
      ? {
          province: live.province,
          city: live.city,
          weather: live.weather,
          temperature: Number(live.temperature),
          windDirection: live.winddirection,
          windPower: live.windpower,
          humidity: live.humidity,
        }
      : null,
    forecast: (f?.casts ?? []).map((c) => ({
      date: c.date,
      week: c.week,
      dayWeather: c.dayweather,
      nightWeather: c.nightweather,
      dayTemp: Number(c.daytemp),
      nightTemp: Number(c.nighttemp),
      dayWind: c.daywind,
      dayPower: c.daypower,
    })),
  }
}

async function jsWeather(adcode: string, s: MapSettings): Promise<AmapWeather | null> {
  const AMap = await withAMap(s)
  const weather = new AMap.Weather()
  const live = await new Promise<AmapWeatherNow | null>((resolve) => {
    weather.getLive(adcode, (err: any, data: any) => {
      if (err || !data) {
        resolve(null)
        return
      }
      resolve({
        province: data.province ?? '',
        city: data.city ?? '',
        weather: data.weather ?? '',
        temperature: Number(data.temperature ?? 0),
        windDirection: data.windDirection ?? '',
        windPower: data.windPower ?? '',
        humidity: data.humidity ?? '',
      })
    })
  })
  const forecast = await new Promise<AmapWeatherCast[]>((resolve) => {
    weather.getForecast(adcode, (err: any, data: any) => {
      const casts = data?.forecasts?.[0]?.casts ?? data?.forecasts ?? []
      if (err || !Array.isArray(casts)) {
        resolve([])
        return
      }
      resolve(
        casts.map((c: any) => ({
          date: c.date ?? '',
          week: c.week ?? '',
          dayWeather: c.dayWeather ?? '',
          nightWeather: c.nightWeather ?? '',
          dayTemp: Number(c.dayTemp ?? 0),
          nightTemp: Number(c.nightTemp ?? 0),
          dayWind: c.dayWind ?? '',
          dayPower: c.dayPower ?? '',
        })),
      )
    })
  })
  if (!live && !forecast.length) return null
  return { cityName: live?.city ?? '', now: live, forecast }
}

// ================= 轨迹纠偏（仅 Web 服务） =================

export interface AmapGraspPoint {
  lng: number
  lat: number
  ag?: number
  tm?: number
  sp?: number
}

export interface AmapGraspOutcome {
  ok: boolean
  distance?: number
  points?: Array<[number, number]>
  msg?: string
}

export async function amapGraspRoad(
  points: AmapGraspPoint[],
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapGraspOutcome> {
  if (!webKey(s)) {
    return { ok: false, msg: '轨迹纠偏需要「高德 Web 服务 Key」+ 数字签名私钥（JS API 无此能力）。' }
  }
  if (points.length < 2) return { ok: false, msg: '轨迹点不足（至少 2 个）。' }

  const body = points.map((p, i) => {
    let ag = p.ag
    if (ag == null && i > 0) {
      const prev = points[i - 1]
      const dy = p.lat - prev.lat
      const dx = p.lng - prev.lng
      if (dx !== 0 || dy !== 0) ag = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
    }
    return { x: p.lng, y: p.lat, ag: ag ?? 0, tm: p.tm ?? i * 10, sp: p.sp ?? 25 }
  })

  try {
    const url = sigUrl('https://restapi.amap.com/v4/grasproad/driving', { key: webKey(s) }, s)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) return { ok: false, msg: `高德轨迹纠偏请求失败（HTTP ${res.status}）。` }
    const json = (await res.json()) as {
      errcode?: number
      data?: { distance?: number; points?: Array<{ x: number; y: number }> }
    }
    if (json.errcode && json.errcode !== 0) {
      return { ok: false, msg: `高德返回错误码 ${json.errcode}（点数过少或过于稀疏可能导致抓路失败）。` }
    }
    const d = json.data
    if (!d?.points?.length) {
      return { ok: false, msg: '抓路失败：未返回有效路径（建议点间隔 5~10 秒）。' }
    }
    return {
      ok: true,
      distance: Number(d.distance ?? 0),
      points: d.points.map((pt) => [pt.y, pt.x] as [number, number]),
    }
  } catch (e) {
    return { ok: false, msg: '请求异常：' + (e instanceof Error ? e.message : String(e)) }
  }
}

// ================= IP 定位 =================

export interface AmapIpLocation {
  city: string
  province?: string
  lat: number | null
  lng: number | null
}

/** IP 定位（城市级）。web 通道用 restapi/v3/ip；js 通道用 AMap.CitySearch。 */
export async function amapIpLocation(
  s: MapSettings,
  signal?: AbortSignal,
): Promise<AmapIpLocation | null> {
  if (tryWeb(s)) {
    try {
      const res = await fetch(sigUrl('https://restapi.amap.com/v3/ip', { key: webKey(s) }, s), { signal })
      if (res.ok) {
        const json = (await res.json()) as {
          status: string
          city?: string | unknown[]
          province?: string | unknown[]
          rectangle?: string
        }
        if (json.status === '1' && json.city && typeof json.city === 'string') {
          const province = typeof json.province === 'string' ? json.province : undefined
          const center =
            typeof json.rectangle === 'string' ? rectangleCenter(json.rectangle) : null
          return { city: json.city, province, lat: center?.[0] ?? null, lng: center?.[1] ?? null }
        }
      }
    } catch {
      /* 回退 JS */
    }
  }
  if (jsKey(s)) {
    try {
      const AMap = await withAMap(s)
      return await new Promise<AmapIpLocation | null>((resolve) => {
        const cs = new AMap.CitySearch()
        cs.getLocalCity((status: string, result: any) => {
          if (status !== 'complete' || !result?.city) {
            resolve(null)
            return
          }
          const c = boundsCenter(result.bounds)
          resolve({
            city: String(result.city),
            province: result.province ? String(result.province) : undefined,
            lat: c ? c[0] : null,
            lng: c ? c[1] : null,
          })
        })
      })
    } catch {
      /* ignore */
    }
  }
  return null
}

/** "lng1,lat1;lng2,lat2" 形式的矩形（高德 rectangle）→ 中心点 [lat, lng] */
function rectangleCenter(rect: string): [number, number] | null {
  const parts = rect.split(';')
  if (parts.length !== 2) return null
  const [lng1, lat1] = parts[0].split(',').map(Number)
  const [lng2, lat2] = parts[1].split(',').map(Number)
  if (![lng1, lat1, lng2, lat2].every((v) => Number.isFinite(v))) return null
  return [(lat1 + lat2) / 2, (lng1 + lng2) / 2]
}

/** AMap.Bounds → 中心点 [lat, lng]（兼容方法式与属性式取值） */
function boundsCenter(b: any): [number, number] | null {
  try {
    if (!b) return null
    const sw = typeof b.getSouthWest === 'function' ? b.getSouthWest() : b.southWest
    const ne = typeof b.getNorthEast === 'function' ? b.getNorthEast() : b.northEast
    if (!sw || !ne) return null
    const lng1 = typeof sw.getLng === 'function' ? sw.getLng() : sw.lng
    const lat1 = typeof sw.getLat === 'function' ? sw.getLat() : sw.lat
    const lng2 = typeof ne.getLng === 'function' ? ne.getLng() : ne.lng
    const lat2 = typeof ne.getLat === 'function' ? ne.getLat() : ne.lat
    if (![lng1, lat1, lng2, lat2].every((v) => Number.isFinite(v))) return null
    return [(lat1 + lat2) / 2, (lng1 + lng2) / 2]
  } catch {
    return null
  }
}

// ================= 坐标转换 =================

export type AmapCoordSource = 'gps' | 'amap' | 'baidu' | 'mapbar'

/** 高德 restapi 坐标转换支持的 coordsys */
const AMAP_COORDSYS: Partial<Record<AmapCoordSource, string>> = {
  gps: 'gps',
  baidu: 'baidu',
  mapbar: 'mapbar',
}

/**
 * 外部坐标 → GCJ-02（高德坐标系）。
 * web 通道调用 restapi/v3/assistant/coordinate/convert；js 通道退化为本地 WGS-84→GCJ-02 近似。
 * 任一环节失败时原样返回该点，绝不丢点。
 */
export async function amapConvertCoords(
  points: Array<[number, number]>,
  from: AmapCoordSource,
  s: MapSettings,
  signal?: AbortSignal,
): Promise<Array<[number, number]>> {
  if (!points.length || from === 'amap') return points

  if (tryWeb(s)) {
    const coordsys = AMAP_COORDSYS[from]
    if (coordsys) {
      try {
        const out: Array<[number, number]> = []
        for (const [lat, lng] of points) {
          const res = await fetch(
            sigUrl(
              'https://restapi.amap.com/v3/assistant/coordinate/convert',
              { locations: `${lng},${lat}`, coordsys, key: webKey(s) },
              s,
            ),
            { signal },
          )
          if (!res.ok) {
            out.push([lat, lng])
            continue
          }
          const json = (await res.json()) as { status: string; locations?: string }
          const loc = json.locations
          if (json.status === '1' && loc && loc.includes(',')) {
            const [nlng, nlat] = loc.split(',').map(Number)
            if (Number.isFinite(nlat) && Number.isFinite(nlng)) {
              out.push([nlat, nlng])
              continue
            }
          }
          out.push([lat, lng])
        }
        return out
      } catch {
        /* 落到本地近似 */
      }
    }
  }

  // JS 通道 / 兜底：仅 GPS 源可做本地近似（WGS-84 → GCJ-02）
  if (from === 'gps') {
    return points.map(([lat, lng]) => wgs84ToGcj02(lat, lng))
  }
  return points
}

// ================= Key 验证 =================

export interface AmapKeyTest {
  ok: boolean
  msg: string
  channel: AmapChannel
}

/**
 * 验证高德 Key：按当前通道用固定地址探测，失败时给出可操作的原因。
 * 特别处理 Web 服务常见错误码：10007（数字签名）、10009（Key 类型不符）。
 */
export async function amapTestKey(s: MapSettings, signal?: AbortSignal): Promise<AmapKeyTest> {
  let ch = amapChannel(s)
  if (ch === 'none') return { ok: false, msg: '未填写任何高德 Key', channel: ch }

  /** JS 通道探测（Web 失败时回落，或偏好为 js 时直接用） */
  const testJs = async (): Promise<AmapKeyTest> => {
    if (!jsKey(s)) {
      return { ok: false, msg: '未填写高德「Web 端(JS)」Key，无法回退 JS 通道', channel: 'none' }
    }
    try {
      const r = await jsGeocode('北京市天安门', s, signal)
      if (r) {
        return { ok: true, msg: '高德 JS API Key 有效（已成功解析测试地址，通道：JS API v2.0）', channel: 'js' }
      }
      return {
        ok: false,
        msg: '高德 JS API 验证失败：未解析到坐标（请确认该 Key 是「Web 端」类型、已开通地理编码/路径规划、域名白名单含本站，且安全密钥填写正确）',
        channel: 'js',
      }
    } catch (e) {
      return {
        ok: false,
        msg: '高德 JS API 加载/调用失败：' + (e instanceof Error ? e.message : String(e)),
        channel: 'js',
      }
    }
  }

  if (ch === 'web') {
    const params: Record<string, string> = { address: '北京市天安门', key: webKey(s) }
    const url = sigUrl('https://restapi.amap.com/v3/geocode/geo', params, s)
    let webErr = ''
    try {
      const res = await fetch(url, { signal })
      const json = (await res.json()) as {
        status: string
        info?: string
        infocode?: string
        errcode?: number
        errmsg?: string
      }
      // 代理层自身报错（如服务端未配置 AMAP_WEB_KEY）：直接给出可操作指引
      if (json.errcode) {
        return { ok: false, msg: `地图代理错误 ${json.errcode}：${json.errmsg ?? ''}`, channel: 'web' }
      }
      if (json.status === '1') {
        return {
          ok: true,
          msg: '高德 Web 服务 Key 有效（已成功解析测试地址，通道：Web 服务）',
          channel: 'web',
        }
      }
      const code = json.infocode ?? ''
      if (code === '10007') {
        webErr =
          '数字签名校验失败（10007）：该 Key 开启了数字签名，需填写「签名私钥」或在控制台关闭签名校验'
      } else if (code === '10009') {
        webErr = 'Key 类型不符（10009）：这枚不是「Web 服务」Key，restapi 不可用'
      } else if (code === '10001' || code === '10002') {
        webErr = 'Key 无效或未开通「地理编码 / 路径规划」服务'
      } else {
        webErr = json.info || '未知错误'
      }
      // 不可恢复错误（签名/Key 类型）→ 熔断 Web 通道，之后直接走 JS，不再每次白跑
      const fatal = amapWebFailureReason(code)
      if (fatal) setAmapWebBlocked(fatal)
    } catch (e) {
      webErr = '请求异常：' + (e instanceof Error ? e.message : String(e))
    }

    // 偏好「仅 Web 服务」时不回落，直接报错（用户明确要求走该通道）
    if (s.amapPref === 'web') {
      return { ok: false, msg: `高德 Web 服务验证失败：${webErr}`, channel: 'web' }
    }
    // 自动模式：回落到 JS 通道再探一次，JS 可用即整体视为可用
    const js = await testJs()
    ch = amapChannel(s)
    if (js.ok) {
      return {
        ok: true,
        msg: `Web 服务不可用（${webErr}），已自动回退 JS API v2.0：✓ 解析成功。建议把「通道」设为「仅 JS API」以避免每次多一次失败请求`,
        channel: ch,
      }
    }
    return { ok: false, msg: `高德验证失败：Web 服务（${webErr}）；JS API（${js.msg}）`, channel: ch }
  }

  return testJs()
}
