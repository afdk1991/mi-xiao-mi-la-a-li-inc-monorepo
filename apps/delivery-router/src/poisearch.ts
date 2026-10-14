// 商户 POI 搜索：把关键词（如「鹏驰」）转为地图上的点位。
// 复用 mapservice 的坐标系约定：amap/tencent 返回 GCJ-02，osm 返回 WGS-84，
// 与对应底图天然对齐，标记不会偏移。
// 高德/腾讯缺 Key 时自动回退 OSM（保证可用，但国内商户覆盖较弱）。

import { hasCredentials, type MapSettings } from './mapservice'
import { qqUrl } from './proxy'
import { amapPoi } from './amap'

export interface Poi {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  tel?: string
  /** 商户类别（高德 type / 腾讯 category / OSM type） */
  type?: string
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

/**
 * Photon（komoot 开源地理编码，基于 OSM 数据）。
 * 与 geocode.ts 同理：Nominatim 国内实测连不通（curl 000），Photon 可用且支持 CORS，
 * 中文关键词（如「咖啡厅」「北京西站」）实测能命中，故作为 OSM 兜底主力。
 */
const PHOTON = 'https://photon.komoot.io/api'

interface PhotonProps {
  name?: string
  housenumber?: string
  street?: string
  locality?: string
  district?: string
  city?: string
  state?: string
  country?: string
  osm_key?: string
  osm_value?: string
}

/** 拼出「省 市 区 街道 门牌」可读地址，缺失项自动跳过 */
function photonAddress(p: PhotonProps): string {
  const parts = [p.country, p.state, p.city, p.district, p.locality, p.street]
    .filter((s): s is string => !!s && s.trim() !== '')
  const seen = new Set<string>()
  const uniq = parts.filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
  if (p.housenumber) uniq.push(`${p.housenumber}号`)
  return uniq.join(' ')
}

/**
 * 搜索商户 POI。失败或无结果返回空数组。
 * city 为可选限定城市（amap/tencent 生效），OSM 忽略。
 * location 为可选搜索中心 [lat, lng]（实时定位点）：提供时改为「周边搜索」，
 * 结果按"离我最近"排序（高德 place/around、腾讯 nearby、OSM 距离加权）。
 * signal 用于取消上一次在途请求（实时搜索防抖时避免竞态）。
 */
export async function searchPoi(
  query: string,
  settings: MapSettings,
  city?: string,
  location?: [number, number] | null,
  signal?: AbortSignal,
): Promise<Poi[]> {
  const q = query.trim()
  if (!q) return []
  const useOsm = settings.service === 'osm' || !hasCredentials(settings)
  try {
    if (useOsm) return await searchOsm(q, location, signal)
    if (settings.service === 'amap') return await amapPoi(q, city, settings, signal, location)
    return await searchTencent(q, settings, city, signal, location)
  } catch {
    // 主服务异常时回退 OSM 兜底一次
    try {
      if (!useOsm) return await searchOsm(q, location, signal)
    } catch {
      /* ignore */
    }
    return []
  }
}

async function searchTencent(
  keyword: string,
  settings: MapSettings,
  city: string | undefined,
  signal?: AbortSignal,
  location?: [number, number] | null,
): Promise<Poi[]> {
  // boundary 需要保留括号与逗号（仅对城市名做编码）
  // 提供 location 时改用「周边搜索」，半径 3000m
  const b = location
    ? `nearby(${location[0]},${location[1]},3000,0)`
    : city
      ? `region(${encodeURIComponent(city)},0)`
      : 'region(全国,0)'
  const url = qqUrl(
    'https://apis.map.qq.com/ws/place/v1/search',
    { keyword, boundary: b, page_size: '25' },
    settings,
  )
  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const json = (await res.json()) as {
    status: number
    data?: Array<{
      id: string
      title: string
      address: string
      tel?: string
      category?: string
      location: { lat: number; lng: number }
    }>
  }
  if (json.status !== 0 || !json.data) return []
  return json.data.map((p) => ({
    id: p.id || `${p.location.lat},${p.location.lng}`,
    name: p.title,
    address: p.address || '',
    lat: p.location.lat,
    lng: p.location.lng,
    tel: p.tel,
    type: p.category,
  }))
}

async function searchOsm(
  q: string,
  location?: [number, number] | null,
  signal?: AbortSignal,
): Promise<Poi[]> {
  // 主力：Photon（国内可用）
  const p = await searchPhoton(q, location, signal)
  if (p.length) return p
  // 备用：Nominatim（海外更准）
  return await searchNominatim(q, location, signal)
}

/** Photon 搜索：返回 GeoJSON；给 location 时按距离加权（"附近优先"） */
async function searchPhoton(
  q: string,
  location?: [number, number] | null,
  signal?: AbortSignal,
): Promise<Poi[]> {
  const geo = location ? `&lat=${location[0]}&lon=${location[1]}` : ''
  const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=25${geo}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return []
  const json = (await res.json()) as {
    features?: Array<{ properties?: PhotonProps; geometry?: { coordinates?: number[] } }>
  }
  const out: Poi[] = []
  for (const f of json.features ?? []) {
    const c = f.geometry?.coordinates
    if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue
    const p = f.properties ?? {}
    const name = p.name || p.street || p.city || '未命名地点'
    out.push({
      id: `${c[1]},${c[0]}`,
      name,
      address: photonAddress(p) || name,
      lat: c[1],
      lng: c[0],
      type: p.osm_value || p.osm_key,
    })
  }
  return out
}

async function searchNominatim(
  q: string,
  location?: [number, number] | null,
  signal?: AbortSignal,
): Promise<Poi[]> {
  // lat/lon 让 Nominatim 按距离加权返回（"附近优先"）
  const geo = location ? `&lat=${location[0]}&lon=${location[1]}` : ''
  const url = `${NOMINATIM}?format=jsonv2&limit=25&addressdetails=0&q=${encodeURIComponent(q)}${geo}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return []
  const data = (await res.json()) as Array<{
    place_id: number
    display_name: string
    lat: string
    lon: string
    name?: string
    type?: string
  }>
  return data.map((d) => ({
    id: String(d.place_id),
    name: d.name || d.display_name.split(',')[0],
    address: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    type: d.type,
  }))
}
