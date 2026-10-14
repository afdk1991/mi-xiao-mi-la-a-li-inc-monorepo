// 地理计算工具：Haversine 距离、方位角、格式化

const R = 6371000 // 地球半径（米）

const toRad = (d: number) => (d * Math.PI) / 180

/**
 * 两点间球面距离（Haversine），返回米
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * 初始方位角（从点1指向点2），返回度 [0,360)
 */
export function bearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/**
 * 坐标是否可用。
 *
 * 「已地理编码」与「坐标可用」是两件事：导入失败、手工清空、后端返回空都会留下 lat/lng = 0，
 * 而这个点落在大西洋几内亚湾（0°N 0°E）。把它当成正常站点参与 TSP，
 * 会直接把整条路线拉飞、总里程失真。故所有参与计算/绘图的入口都要先过这一关。
 */
export function isValidCoord(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    !(lat === 0 && lng === 0)
  )
}

const DIRS = ['正北', '东北', '正东', '东南', '正南', '西南', '正西', '西北']
/** 把方位角转为中文八方位描述 */
export function bearingToCompass(deg: number): string {
  const idx = Math.round(deg / 45) % 8
  return DIRS[idx]
}

/** 把米格式化为易读字符串 */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} 米`
  return `${(m / 1000).toFixed(2)} 公里`
}

/** 把秒格式化为易读字符串 */
export function formatDuration(sec: number): string {
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`
}

/**
 * 按平均车速估算行驶时间（秒）。
 * 城区配送默认 25 km/h，可由调用方覆盖。
 */
export function estimateDuration(m: number, speedKmh = 25): number {
  return (m / 1000 / speedKmh) * 3600
}
