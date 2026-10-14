// 坐标与几何工具：polyline 解码、WGS-84 ↔ GCJ-02 互转、球面距离。
// 整合自 apps/项目009商品采集/src/mapservice.ts（GCJ-02 对齐高德，已在生产验证）。

const PI = Math.PI
const A = 6378245.0
// WGS-84 偏心率平方。JS 双精度有效位约 17 位，超长字面量会被静默截断。
const EE = 0.006693421622965943

/** 判断是否在中国境外（境外不做偏移） */
export function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  r += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3
  r += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3
  return r
}

function transformLng(x: number, y: number): number {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  r += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3
  r += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3
  return r
}

/**
 * 解码高德/腾讯的 polyline 加密字符串为 [lat, lng][]。
 * 算法与 Google encoded polyline 同族（偏移 -63-1）。
 */
export function decodeGCJPolyline(str: string): Array<[number, number]> {
  const points: Array<[number, number]> = []
  let index = 0
  let lat = 0
  let lng = 0
  const len = str.length
  while (index < len) {
    let result = 1
    let shift = 0
    let b: number
    do {
      b = str.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1

    result = 1
    shift = 0
    do {
      b = str.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1

    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

/** WGS-84 → GCJ-02（把 GPS/Google 坐标校正到国内底图） */
export function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng]
  let dLat = transformLat(lng - 105, lat - 35)
  let dLng = transformLng(lng - 105, lat - 35)
  const radLat = (lat / 180) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return [lat + dLat, lng + dLng]
}

/** GCJ-02 → WGS-84（逆变换，迭代逼近） */
export function gcj02ToWgs84(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng]
  const [gLat, gLng] = wgs84ToGcj02(lat, lng)
  return [lat * 2 - gLat, lng * 2 - gLng]
}

/**
 * BD-09（百度）→ GCJ-02。百度数据在接入层统一转换，避免上层各写一份。
 */
export function bd09ToGcj02(lat: number, lng: number): [number, number] {
  const xPi = (PI * 3000.0) / 180.0
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * xPi)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * xPi)
  return [z * Math.sin(theta), z * Math.cos(theta)]
}

/** GCJ-02 → BD-09 */
export function gcj02ToBd09(lat: number, lng: number): [number, number] {
  const xPi = (PI * 3000.0) / 180.0
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * xPi)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * xPi)
  return [z * Math.sin(theta) + 0.006, z * Math.cos(theta) + 0.0065]
}

/** 球面距离（米，Haversine）。用于配送排序、POI 距离估算。 */
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * PI) / 180
  const dLng = ((b.lng - a.lng) * PI) / 180
  const la1 = (a.lat * PI) / 180
  const la2 = (b.lat * PI) / 180
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 坐标格式化为「lng,lat」（高德/腾讯 REST 约定） */
export function fmtLngLat(p: { lat: number; lng: number }): string {
  return `${p.lng},${p.lat}`
}

/** 坐标格式化为「lat,lng」（百度/腾讯部分接口约定） */
export function fmtLatLng(p: { lat: number; lng: number }): string {
  return `${p.lat},${p.lng}`
}
