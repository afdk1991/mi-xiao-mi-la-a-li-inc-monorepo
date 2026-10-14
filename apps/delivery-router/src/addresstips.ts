// 地址输入提示（联想补全）：在高德/腾讯输入提示 API 基础上，为地址输入框提供实时下拉建议。
// 与 mapservice 坐标系约定一致：amap/tencent 返回 GCJ-02 坐标，osm 走 Nominatim 兜底（无专属输入提示接口）。
// 缺 Key 的高德/腾讯自动回退 OSM。

import { hasCredentials, type MapSettings } from './mapservice'
import { qqUrl } from './proxy'
import { amapTips } from './amap'

export interface AddressTip {
  id: string
  name: string
  district: string
  address: string
  /** [lat, lng]，无坐标时为 null */
  location: [number, number] | null
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

/**
 * 输入提示联想。失败或无结果返回空数组。
 * city 为可选限定城市（amap/tencent 生效）。
 */
export async function inputTips(
  query: string,
  settings: MapSettings,
  city?: string,
  signal?: AbortSignal,
): Promise<AddressTip[]> {
  const q = query.trim()
  if (!q) return []
  const useOsm = settings.service === 'osm' || !hasCredentials(settings)
  try {
    if (useOsm) return await tipsOsm(q, signal)
    if (settings.service === 'amap') {
      // 高德：网关自动择优（Web 服务 inputtips → JS API AutoComplete）
      return await amapTips(q, city, settings, signal)
    }
    return await tipsTencent(q, settings, city, signal)
  } catch {
    return []
  }
}

async function tipsTencent(
  keyword: string,
  settings: MapSettings,
  city: string | undefined,
  signal?: AbortSignal,
): Promise<AddressTip[]> {
  const url = qqUrl(
    'https://apis.map.qq.com/ws/place/v1/suggestion',
    { keyword, region: city ?? '全国' },
    settings,
  )
  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const json = (await res.json()) as {
    status: number
    data?: Array<{
      id: string
      title: string
      address?: string
      location?: { lat: number; lng: number }
      district?: string
      city?: string
    }>
  }
  if (json.status !== 0 || !json.data) return []
  return json.data.map((p) => {
    const loc: [number, number] | null = p.location ? [p.location.lat, p.location.lng] : null
    return {
      id: p.id || p.title,
      name: p.title,
      district: p.district || p.city || '',
      address: p.address || '',
      location: loc,
    }
  })
}

async function tipsOsm(q: string, signal?: AbortSignal): Promise<AddressTip[]> {
  const url = `${NOMINATIM}?format=jsonv2&limit=8&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return []
  const data = (await res.json()) as Array<{
    place_id: number
    display_name: string
    lat: string
    lon: string
    name?: string
  }>
  return data.map((d) => {
    const lat = parseFloat(d.lat)
    const lng = parseFloat(d.lon)
    return {
      id: String(d.place_id),
      name: d.name || d.display_name.split(',')[0],
      district: '',
      address: d.display_name,
      location: Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null,
    }
  })
}
