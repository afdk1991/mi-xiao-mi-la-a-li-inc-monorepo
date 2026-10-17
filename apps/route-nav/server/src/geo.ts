// 地理编码 / 逆地理编码 + 距离计算。
// 多级回退链（与 delivery-router 的服务端代理同思路）：
//   1. 高德 Web 服务（env: AMAP_WEB_KEY，GCJ-02）
//   2. 腾讯位置服务（env: TENCENT_KEY，GCJ-02）
//   3. Photon（komoot，免 Key，WGS-84）
//   4. Nominatim（OSM，免 Key，WGS-84）
// 距离一律用 haversine 本地计算，不依赖外部服务。

const AMAP_KEY = process.env.AMAP_WEB_KEY ?? ''
const TENCENT_KEY = process.env.TENCENT_KEY ?? ''

const FETCH_TIMEOUT_MS = 8000

export interface GeoPoint {
  latitude: number
  longitude: number
  displayName: string
  city: string
  /** 坐标体系：gcj02（高德/腾讯）或 wgs84（Photon/Nominatim） */
  coordSystem: 'gcj02' | 'wgs84'
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** haversine 大圆距离（米） */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// ---- 高德 ----
async function amapGeocode(query: string): Promise<GeoPoint | null> {
  const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(query)}&key=${encodeURIComponent(AMAP_KEY)}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: string
    geocodes?: Array<{ location: string; formatted_address: string; addressComponent?: { city?: string | string[]; province?: string | string[] } }>
  }
  if (json.status !== '1' || !json.geocodes?.length) return null
  const g = json.geocodes[0]
  const [lng, lat] = g.location.split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const city = pickAmapCity(g.addressComponent)
  return { latitude: lat, longitude: lng, displayName: g.formatted_address || query, city, coordSystem: 'gcj02' }
}

async function amapReverse(lat: number, lng: number): Promise<GeoPoint | null> {
  const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${encodeURIComponent(AMAP_KEY)}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: string
    regeocode?: { formatted_address: string; addressComponent?: { city?: string | string[]; province?: string | string[] } }
  }
  if (json.status !== '1' || !json.regeocode) return null
  const city = pickAmapCity(json.regeocode.addressComponent)
  return { latitude: lat, longitude: lng, displayName: json.regeocode.formatted_address, city, coordSystem: 'gcj02' }
}

/** 高德 city 字段在直辖市返回空数组/空串，此时回落到 province */
function pickAmapCity(comp?: { city?: string | string[]; province?: string | string[] }): string {
  const c = comp?.city
  const p = comp?.province
  const cStr = Array.isArray(c) ? c[0] : c
  const pStr = Array.isArray(p) ? p[0] : p
  return (cStr && cStr.trim()) || (pStr && pStr.trim()) || ''
}

// ---- 腾讯 ----
async function tencentGeocode(query: string): Promise<GeoPoint | null> {
  const url = `https://apis.map.qq.com/ws/geocoder/v1?address=${encodeURIComponent(query)}&key=${encodeURIComponent(TENCENT_KEY)}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: number
    result?: { location: { lat: number; lng: number }; address: string; address_components?: { city?: string } }
  }
  if (json.status !== 0 || !json.result) return null
  return {
    latitude: json.result.location.lat,
    longitude: json.result.location.lng,
    displayName: json.result.address || query,
    city: json.result.address_components?.city ?? '',
    coordSystem: 'gcj02',
  }
}

async function tencentReverse(lat: number, lng: number): Promise<GeoPoint | null> {
  const url = `https://apis.map.qq.com/ws/geocoder/v1?location=${lat},${lng}&key=${encodeURIComponent(TENCENT_KEY)}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) return null
  const json = (await res.json()) as {
    status: number
    result?: { address: string; address_components?: { city?: string } }
  }
  if (json.status !== 0 || !json.result) return null
  return { latitude: lat, longitude: lng, displayName: json.result.address, city: json.result.address_components?.city ?? '', coordSystem: 'gcj02' }
}

// ---- Photon（免 Key）----
async function photonGeocode(query: string): Promise<GeoPoint | null> {
  const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=1`
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const json = (await res.json()) as {
    features?: Array<{
      properties?: { name?: string; city?: string; locality?: string; county?: string; state?: string; country?: string; street?: string }
      geometry?: { coordinates?: [number, number] }
    }>
  }
  const f = json.features?.[0]
  const c = f?.geometry?.coordinates
  if (!f || !c) return null
  const p = f.properties ?? {}
  const city = p.city || p.locality || p.county || p.state || ''
  const name = p.name || p.street || city || query
  return { latitude: c[1], longitude: c[0], displayName: name, city, coordSystem: 'wgs84' }
}

async function photonReverse(lat: number, lng: number): Promise<GeoPoint | null> {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const json = (await res.json()) as {
    features?: Array<{
      properties?: { name?: string; city?: string; locality?: string; county?: string; state?: string; street?: string; housenumber?: string }
      geometry?: { coordinates?: [number, number] }
    }>
  }
  const f = json.features?.[0]
  const p = f?.properties ?? {}
  const city = p.city || p.locality || p.county || p.state || ''
  const street = p.street ? `${p.street}${p.housenumber ?? ''}` : ''
  const display = [p.name, street, city, p.state].filter(Boolean).join(' ') || `${lat},${lng}`
  return { latitude: lat, longitude: lng, displayName: display, city, coordSystem: 'wgs84' }
}

// ---- Nominatim（免 Key，海外更准）----
async function nominatimGeocode(query: string): Promise<GeoPoint | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json', 'User-Agent': 'route-nav-server/1.0' } })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; address?: { city?: string; town?: string; village?: string; state?: string } }>
  const d = data?.[0]
  if (!d) return null
  const city = d.address?.city || d.address?.town || d.address?.village || d.address?.state || ''
  return { latitude: parseFloat(d.lat), longitude: parseFloat(d.lon), displayName: d.display_name, city, coordSystem: 'wgs84' }
}

async function nominatimReverse(lat: number, lng: number): Promise<GeoPoint | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json', 'User-Agent': 'route-nav-server/1.0' } })
  if (!res.ok) return null
  const d = (await res.json()) as { display_name: string; address?: { city?: string; town?: string; village?: string; state?: string } }
  if (!d?.display_name) return null
  const city = d.address?.city || d.address?.town || d.address?.village || d.address?.state || ''
  return { latitude: lat, longitude: lng, displayName: d.display_name, city, coordSystem: 'wgs84' }
}

/** 地理编码：关键词 → 坐标。按优先级依次尝试，全部失败返回 null。 */
export async function geocode(query: string): Promise<GeoPoint | null> {
  if (AMAP_KEY) {
    try {
      const r = await amapGeocode(query)
      if (r) return r
    } catch { /* 落入下一级 */ }
  }
  if (TENCENT_KEY) {
    try {
      const r = await tencentGeocode(query)
      if (r) return r
    } catch { /* 落入下一级 */ }
  }
  try {
    const r = await photonGeocode(query)
    if (r) return r
  } catch { /* 落入下一级 */ }
  try {
    return await nominatimGeocode(query)
  } catch {
    return null
  }
}

/** 逆地理编码：坐标 → 地址。按优先级依次尝试，全部失败返回 null。 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoPoint | null> {
  if (AMAP_KEY) {
    try {
      const r = await amapReverse(lat, lng)
      if (r) return r
    } catch { /* 落入下一级 */ }
  }
  if (TENCENT_KEY) {
    try {
      const r = await tencentReverse(lat, lng)
      if (r) return r
    } catch { /* 落入下一级 */ }
  }
  try {
    const r = await photonReverse(lat, lng)
    if (r) return r
  } catch { /* 落入下一级 */ }
  try {
    return await nominatimReverse(lat, lng)
  } catch {
    return null
  }
}

/** 当前生效的地理编码提供商（用于 /health 展示） */
export function activeGeoProvider(): string {
  if (AMAP_KEY) return 'amap'
  if (TENCENT_KEY) return 'tencent'
  return 'osm(photon+nominatim)'
}
