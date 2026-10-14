// 地理编码：把地址文本转为经纬度坐标。
// 支持三种服务：amap（高德）/ tencent（腾讯）/ osm（OpenStreetMap Nominatim）。
// 高德/腾讯返回 GCJ-02 火星坐标，OSM 返回 WGS-84；均由调用方配合对应底图使用。
// 未填 Key 的高德/腾讯会自动回退到 OSM（保证功能可用，但国内精度下降）。
//
// 高德分支说明：高德有两条通道（详见 amap.ts）——
//   ① Web 服务 Key（restapi，需在控制台关闭数字签名或提供签名私钥）
//   ② Web 端 JS Key + 安全密钥（JS API v2.0）
// 统一走 amap.ts 网关自动择优，坐标恒为 GCJ-02，与高德底图对齐。

import { hasCredentials, type MapSettings } from './mapservice'
import { qqUrl } from './proxy'
import {
  amapAdcode,
  amapConvertCoords,
  amapGeocode,
  amapIpLocation,
  amapReverse,
  amapTestKey,
  type AmapCoordSource,
} from './amap'
import { baiduGeocode, baiduReverse } from './baidu'
import { createThrottle, mapLimit, TTLCache } from './async'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

/**
 * Photon（komoot 提供的开源地理编码，基于 OSM 数据）。
 *
 * 为什么加它：Nominatim 官方站在国内网络下实测**完全连不通**（curl 返回 000 / TLS 失败），
 * 而 Photon 实测可用——支持 CORS（Access-Control-Allow-Origin: *）、中文地址与中文 POI 均能命中、
 * 且提供 reverse 逆地理编码。所以它取代 Nominatim 成为 OSM 兜底的**主力**，
 * Nominatim 退居备用（海外网络下精度更高）。两者均返回 WGS-84，与 OSM 底图对齐。
 */
const PHOTON = 'https://photon.komoot.io/api'
const PHOTON_REVERSE = 'https://photon.komoot.io/reverse'

/**
 * 地理编码结果缓存。
 *
 * 原先各子函数各自 `cache.set` 且键不统一（`osm:${q}` vs 复合键 `${service}:${q}`），
 * 导致两处真实缺陷：
 *   1. 高德路径**根本没有写入**，同一地址每次都重新请求；
 *   2. 主服务失败回落 OSM 兜底时，写的是 `osm:xxx`，下一次按 `amap:xxx` 读永远 miss。
 * 现在统一由 `geocode()` 单点读写，并加容量上限防止长时间会话内存无限增长。
 */
const cache = new TTLCache<GeoResult>(800, 60 * 60 * 1000)

export interface GeoResult {
  lat: number
  lng: number
}

/**
 * 缓存键必须带上**实际返回坐标系**。
 *
 * 只用 service 作前缀是有缺陷的：未配置 Key 时高德/腾讯会静默回落 OSM（WGS-84），
 * 此时写入的是 `amap:xxx` 键却存着 WGS-84 坐标；等用户填好 Key 重新查询，
 * 会命中这份旧缓存拿到 WGS-84 点，画到 GCJ-02 底图上就整体偏移数百米，
 * 且极难排查（表现为"我明明填了 Key，点位还是偏的"）。
 * 故把「是否走了 OSM 兜底」编码进键里，坐标系一变自然 miss 重取。
 */
export function geoSourceTag(settings: MapSettings): string {
  return settings.service === 'osm' || !hasCredentials(settings) ? 'osm' : settings.service
}

function cacheKey(q: string, settings: MapSettings): string {
  return `${geoSourceTag(settings)}:${q}`
}

/**
 * 地理编码单个地址。失败返回 null。
 */
export async function geocode(
  query: string,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const q = query.trim()
  if (!q) return null
  const expected = geoSourceTag(settings)
  const hit = cache.get(cacheKey(q, settings))
  if (hit !== undefined) return hit

  const useOsm = expected === 'osm'

  let r: GeoResult | null = null
  // 结果实际来自哪家（决定坐标系）：主服务成功才归主服务，兜底一律记 osm
  let actual: string = expected
  try {
    if (useOsm) {
      // 本就是 OSM 链路，geocodeOsm 内部已兜 Photon→Nominatim，不要再补一次（白白多烧一次公共服务请求）
      r = await geocodeOsm(q, signal)
    } else if (settings.service === 'amap') r = await amapGeocode(q, settings, signal)
    else if (settings.service === 'baidu') r = await baiduGeocode(q, settings, signal)
    else r = await geocodeTencent(q, settings, signal)
    // 主服务查不到（非空结果）时，再给 OSM 一次机会
    if (!useOsm && !r) {
      r = await geocodeOsm(q, signal)
      if (r) actual = 'osm'
    }
  } catch {
    // 网络异常时也尝试 OSM 兜底一次（高德双通道均失败同样会落到这里）
    try {
      r = await geocodeOsm(q, signal)
      if (r) actual = 'osm'
    } catch {
      /* ignore */
    }
  }

  // 只缓存成功结果：失败往往是网络抖动或限流，缓存进去下次还会拿到过期失败。
  // 键按**实际来源**写：主服务失败兜底出的 WGS-84 结果只归 osm 键，
  // 绝不写进 amap/tencent 键（否则填 Key 后会命中它，把 WGS-84 点画到 GCJ-02 底图上）。
  if (r) cache.set(`${actual}:${q}`, r)
  return r
}

async function geocodeOsm(q: string, signal?: AbortSignal): Promise<GeoResult | null> {
  // 主力：Photon（国内可用、支持 CORS）
  const p = await geocodePhoton(q, signal)
  if (p) return p
  // 备用：Nominatim（海外网络更准，国内通常连不通，失败即返回 null）
  return await geocodeNominatim(q, signal)
}

/** Photon 正向地理编码：返回 GeoJSON，坐标恒为 WGS-84 */
async function geocodePhoton(q: string, signal?: AbortSignal): Promise<GeoResult | null> {
  const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    features?: Array<{ geometry?: { coordinates?: number[] } }>
  }
  const c = json.features?.[0]?.geometry?.coordinates
  if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null
  return { lat: c[1], lng: c[0] }
}

async function geocodeNominatim(q: string, signal?: AbortSignal): Promise<GeoResult | null> {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (res.status === 429 || res.status === 503) {
    // Nominatim 严格限速（1 QPS），退避一次再试
    await new Promise((r) => setTimeout(r, 1200))
    const res2 = await fetch(url, { headers: { Accept: 'application/json' }, signal })
    if (!res2.ok) return null
    return parseOsm(await res2.json())
  }
  if (!res.ok) return null
  return parseOsm(await res.json())
}

function parseOsm(data: Array<{ lat: string; lon: string }>): GeoResult | null {
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

/**
 * 腾讯正向地址解析（纯网络调用）。
 * 缓存与 OSM 兜底统一由上层 `geocode()` 负责，此处不再重复处理，避免出现两套 key 逻辑。
 */
async function geocodeTencent(
  q: string,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  // 代理模式下不带 key（服务端注入）；直连模式下 qqUrl 会自动附上用户自填 Key
  const url = qqUrl('https://apis.map.qq.com/ws/geocoder/v1/', { address: q }, settings)
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: number
    result?: { location: { lat: number; lng: number } }
  }
  if (json.status !== 0 || !json.result) return null
  return { lat: json.result.location.lat, lng: json.result.location.lng } // 腾讯返回 GCJ-02
}

/**
 * 批量地理编码。
 *
 * 原先是完全串行 + 每两条之间固定 sleep：
 *   - OSM 模式 1.1s × N → 100 条要等近 2 分钟，绝大部分时间花在 sleep 上；
 *   - 命中缓存（零请求）也要 sleep，纯属浪费。
 * 现在改为「有限并发 + 全局最小请求间隔」：并发摊掉网络往返时间，节流保证不触碰服务限速，
 * 且只有真正要发网络请求时才占用配额间隔。
 */
export async function geocodeBatch(
  queries: string[],
  settings: MapSettings,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Array<GeoResult | null>> {
  // 限速策略按兜底源区分：
  //   - Nominatim 官方要求 1 QPS（串行 1100ms），但当前 OSM 兜底主力是 Photon（无此硬性限制），
  //     沿用 1 QPS 会让 100 条地址等近 2 分钟，明显过慢。
  //   - 故 OSM 模式放宽为「并发 2 + 600ms 最小间隔」（约 3.3 QPS），兼顾速度与公共服务的礼貌限流。
  const isOsm = settings.service === 'osm'
  const conc = isOsm ? 2 : 3
  const throttle = createThrottle(isOsm ? 600 : 220)
  let done = 0

  return mapLimit(
    queries,
    conc,
    async (q) => {
      if (signal?.aborted) return null
      const ck = cacheKey(q.trim(), settings)
      const cached = cache.get(ck)
      if (cached !== undefined) {
        done++
        onProgress?.(done, queries.length)
        return cached
      }
      await throttle()
      const r = await geocode(q, settings, signal)
      done++
      onProgress?.(done, queries.length)
      return r
    },
    signal,
  )
}

// Key 有效性验证：用固定测试地址探测一次，返回可读的成功/失败原因（含 Key 类型与白名单提示）。
export interface KeyTestResult {
  ok: boolean
  msg: string
}

export async function testKey(settings: MapSettings, signal?: AbortSignal): Promise<KeyTestResult> {
  if (settings.service === 'osm') return { ok: true, msg: 'OpenStreetMap 免 Key，无需验证' }
  if (!hasCredentials(settings)) return { ok: false, msg: '请先填写 Key 再验证' }
  const probe = '北京市天安门'
  try {
    if (settings.service === 'amap') {
      // 高德：按当前通道（Web 服务 / JS API）探测，失败时给出可操作原因
      const t = await amapTestKey(settings, signal)
      return { ok: t.ok, msg: t.msg }
    }
    // tencent
    const url = qqUrl('https://apis.map.qq.com/ws/geocoder/v1/', { address: probe }, settings)
    const res = await fetch(url, { signal })
    const json = (await res.json()) as {
      status: number
      message?: string
      errcode?: number
      result?: unknown
    }
    if (json.status === 0 && json.result) return { ok: true, msg: '腾讯 Key 有效（已成功解析测试地址）' }
    // 代理返回 40002 = 服务端未配置 TENCENT_KEY，给出可操作指引
    if (json.errcode === 40002) {
      return { ok: false, msg: `代理未配置腾讯 Key：${json.message || '请在服务端设置 TENCENT_KEY 环境变量'}` }
    }
    return {
      ok: false,
      msg: `腾讯验证失败：${json.message || '未知错误'}（请确认已启用「WebServiceAPI」且已配置域名白名单）`,
    }
  } catch (e) {
    return { ok: false, msg: '请求异常：' + (e instanceof Error ? e.message : String(e)) }
  }
}

// ---- 逆地址解析：把经纬度坐标转为文字地址 ----
// 与上方正向 geocode（地址→坐标）配对；高德/腾讯返回 GCJ-02 坐标系下的地址。

/**
 * 逆地址解析单个坐标，返回可读地址字符串；失败返回 null。
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<string | null> {
  const useOsm = settings.service === 'osm' || !hasCredentials(settings)
  try {
    if (useOsm) return await reverseOsm(lat, lng, signal)
    if (settings.service === 'amap') return await amapReverse(lat, lng, settings, signal)
    if (settings.service === 'baidu') {
      const r = await baiduReverse(lat, lng, settings, signal)
      return r?.address ?? null
    }
    return await reverseTencent(lat, lng, settings, signal)
  } catch {
    try {
      return await reverseOsm(lat, lng, signal)
    } catch {
      return null
    }
  }
}

async function reverseOsm(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  // 主力：Photon reverse（实测可用，返回中文地址）
  const p = await reversePhoton(lat, lng, signal)
  if (p) return p
  // 备用：Nominatim
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return null
  const json = (await res.json()) as { display_name?: string }
  return json.display_name ?? null
}

/** Photon 逆地理编码：把 properties 拼成可读中文地址 */
async function reversePhoton(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `${PHOTON_REVERSE}?lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return null
  const json = (await res.json()) as { features?: Array<{ properties?: PhotonProps }> }
  return formatPhotonAddress(json.features?.[0]?.properties)
}

interface PhotonProps {
  name?: string
  housenumber?: string
  street?: string
  locality?: string
  district?: string
  city?: string
  state?: string
  country?: string
}

/** 把 Photon 的分级属性拼成「xx省xx市xx区xx街xx号 xx」形式，缺失项自动跳过 */
function formatPhotonAddress(p?: PhotonProps): string | null {
  if (!p) return null
  const parts = [
    p.country,
    p.state,
    p.city,
    p.district,
    p.locality,
    p.street,
    p.housenumber ? `${p.housenumber}号` : '',
    p.name,
  ].filter((s): s is string => !!s && s.trim() !== '')
  // 去重（Photon 有时 city 与 state 同值）
  const seen = new Set<string>()
  const uniq = parts.filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
  return uniq.length ? uniq.join(' ') : null
}

async function reverseTencent(
  lat: number,
  lng: number,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = qqUrl(
    'https://apis.map.qq.com/ws/geocoder/v1/',
    { location: `${lat},${lng}`, get_poi: '0' },
    settings,
  )
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: number
    result?: {
      address?: string
      formatted_addresses?: { recommend?: string; standard_address?: string }
    }
  }
  if (json.status !== 0 || !json.result) return null
  return json.result.formatted_addresses?.recommend || json.result.address || null
}

/**
 * 逆地址解析并提取行政区划 adcode（供天气等按行政区划查询的功能使用）。
 * - amap：经 amap.ts 网关（Web 服务 regeo / JS API Geocoder）取 addressComponent.adcode。
 * - tencent：走 WebService，取 result.ad_info.adcode。
 * - osm 无该能力，返回 null。
 */
export async function reverseGeocodeAdcode(
  lat: number,
  lng: number,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<string | null> {
  if (settings.service === 'osm') return null
  if (settings.service === 'amap') return await amapAdcode(lat, lng, settings, signal)
  if (!hasCredentials(settings)) return null
  const url = qqUrl(
    'https://apis.map.qq.com/ws/geocoder/v1/',
    { location: `${lat},${lng}`, get_poi: '0' },
    settings,
  )
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const json = (await res.json()) as {
      status: number
      result?: { ad_info?: { adcode?: number } }
    }
    if (json.status !== 0 || !json.result?.ad_info?.adcode) return null
    return String(json.result.ad_info.adcode)
  } catch {
    return null
  }
}

// ---- IP 定位（腾讯 /ws/location/v1/ip）：终端 IP → 城市级位置 ----
// 仅到城市级精度，适合初始化默认城市 / 天气城市，不做精确定位。

export interface IpLocation {
  city: string
  province?: string
  /** 城市级坐标（无法取得时为 null） */
  lat: number | null
  lng: number | null
}

export async function locateByIp(settings: MapSettings, signal?: AbortSignal): Promise<IpLocation | null> {
  if (settings.service === 'osm') return null

  // 高德：走 amap.ts 网关（web 通道 restapi/v3/ip；js 通道 AMap.CitySearch）
  if (settings.service === 'amap') {
    return await amapIpLocation(settings, signal)
  }

  if (!hasCredentials(settings)) return null
  const url = qqUrl('https://apis.map.qq.com/ws/location/v1/ip', {}, settings)
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const json = (await res.json()) as {
      status: number
      result?: {
        location?: { lat: number; lng: number }
        ad_info?: { province?: string; city?: string }
      }
    }
    if (json.status !== 0 || !json.result?.ad_info?.city) return null
    const loc = json.result.location
    return {
      city: String(json.result.ad_info.city),
      province: json.result.ad_info.province ? String(json.result.ad_info.province) : undefined,
      lat: Number.isFinite(loc?.lat) ? (loc as { lat: number }).lat : null,
      lng: Number.isFinite(loc?.lng) ? (loc as { lng: number }).lng : null,
    }
  } catch {
    return null
  }
}

// ---- 坐标转换（腾讯 /ws/coord/v1/translate）：第三方坐标 → 当前服务坐标系 ----

export type CoordSource = 'gps' | 'amap' | 'baidu' | 'sogou' | 'mapbar'

/** 腾讯 type 参数：1 GPS / 2 搜狗 / 3 百度 / 4 图吧 / 5 高德 */
const TENCENT_COORD_TYPE: Record<CoordSource, number> = {
  gps: 1,
  sogou: 2,
  baidu: 3,
  mapbar: 4,
  amap: 5,
}

const TRANSLATE_CHUNK = 20 // 单次转换上限保守取 20 点

/** 高德 restapi 坐标转换支持的源（无搜狗，按 GPS 近似；amap 源即恒等） */
const AMAP_COORD_SOURCE: Record<CoordSource, AmapCoordSource> = {
  gps: 'gps',
  amap: 'amap',
  baidu: 'baidu',
  mapbar: 'mapbar',
  sogou: 'gps',
}

/**
 * 把外部来源坐标批量转换到当前服务的坐标系。
 * - 腾讯：调用 /ws/coord/v1/translate（真实纠偏）。
 * - 高德：走 amap.ts 网关（web 通道 restapi/v3/assistant/coordinate/convert；不可用时原样返回）。
 * - OSM：目标本身就是 WGS-84，原样返回。
 * - 任一环节失败：原样返回该批点，绝不丢点。
 */
export async function translateCoords(
  points: Array<[number, number]>,
  from: CoordSource,
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<Array<[number, number]>> {
  if (!points.length) return points
  // OSM 目标即 WGS-84，无需转换
  if (settings.service === 'osm') return points

  // 高德：走 amap.ts 网关
  if (settings.service === 'amap') {
    return await amapConvertCoords(points, AMAP_COORD_SOURCE[from], settings, signal)
  }

  if (!hasCredentials(settings)) return points

  const type = TENCENT_COORD_TYPE[from]
  const out: Array<[number, number]> = []
  for (let i = 0; i < points.length; i += TRANSLATE_CHUNK) {
    const chunk = points.slice(i, i + TRANSLATE_CHUNK)
    const locations = chunk.map(([lat, lng]) => `${lng},${lat}`).join(';')
    const url = qqUrl(
      'https://apis.map.qq.com/ws/coord/v1/translate',
      { locations, type: String(type) },
      settings,
    )
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) {
        out.push(...chunk)
        continue
      }
      const json = (await res.json()) as {
        status: number
        locations?: Array<{ lat: number; lng: number }>
        result?: { locations?: Array<{ lat: number; lng: number }> }
      }
      const arr = json.locations ?? json.result?.locations
      if (json.status !== 0 || !Array.isArray(arr) || arr.length !== chunk.length) {
        out.push(...chunk)
        continue
      }
      arr.forEach((l, k) => {
        const lat = Number(l?.lat)
        const lng = Number(l?.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) out.push([lat, lng])
        else out.push(chunk[k])
      })
    } catch {
      out.push(...chunk)
    }
  }
  return out
}

