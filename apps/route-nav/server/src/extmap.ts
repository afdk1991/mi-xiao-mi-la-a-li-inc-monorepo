// 外部地图跳转 URL 构造 + 坐标系转换。
// 输入坐标统一按 GCJ-02 处理（应用主坐标系，与高德/腾讯默认返回一致）：
//   - 高德 URI：GCJ-02 原生，直接使用
//   - 百度：GCJ-02 → BD-09
//   - Google / Apple：GCJ-02 → WGS-84

const X_PI = (Math.PI * 3000) / 180
const PI = Math.PI
const A = 6378245.0
const EE = 0.006693421622965943

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  r += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3
  r += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((x * PI) / 30)) * 2) / 3
  return r
}

function transformLng(x: number, y: number): number {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  r += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3
  r += ((150 * Math.sin((y / 12) * PI) + 300 * Math.sin((y / 30) * PI)) * 2) / 3
  return r
}

/** GCJ-02 → WGS-84（近似逆变换） */
export function gcj02ToWgs84(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng]
  let dLat = transformLat(lng - 105, lat - 35)
  let dLng = transformLng(lng - 105, lat - 35)
  const radLat = (lat / 180) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return [lat * 2 - (lat + dLat), lng * 2 - (lng + dLng)]
}

/** GCJ-02 → BD-09 */
export function gcj02ToBd09(lat: number, lng: number): [number, number] {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI)
  return [z * Math.sin(theta) + 0.006, z * Math.cos(theta) + 0.0065]
}

export type MapProvider = 'amap' | 'baidu' | 'google' | 'apple'

export const MAP_PROVIDERS: Record<MapProvider, string> = {
  amap: '高德地图',
  baidu: '百度地图',
  google: 'Google Maps',
  apple: 'Apple Maps',
}

/**
 * 构造外部地图跳转 URL。lat/lng 按 GCJ-02 传入。
 * name 为可选标注名。
 */
export function buildExternalMapUrl(lat: number, lng: number, name: string | undefined, provider: MapProvider): string {
  const label = (name ?? '').trim()
  switch (provider) {
    case 'amap':
      return `https://uri.amap.com/marker?position=${lng},${lat}${label ? `&name=${encodeURIComponent(label)}` : ''}&src=route-nav&coordinate=gaode`
    case 'baidu': {
      const [bdLat, bdLng] = gcj02ToBd09(lat, lng)
      return `https://api.map.baidu.com/marker?location=${bdLat},${bdLng}&coord_type=bd09ll&output=html${label ? `&title=${encodeURIComponent(label)}` : ''}`
    }
    case 'google': {
      const [wLat, wLng] = gcj02ToWgs84(lat, lng)
      return `https://www.google.com/maps/search/?api=1&query=${wLat},${wLng}`
    }
    case 'apple': {
      const [wLat, wLng] = gcj02ToWgs84(lat, lng)
      return `https://maps.apple.com/?ll=${wLat},${wLng}${label ? `&q=${encodeURIComponent(label)}` : ''}`
    }
  }
}
