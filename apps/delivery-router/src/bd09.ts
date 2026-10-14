// 百度坐标系 BD-09 转换。
//
// 为什么单独成文件：百度在国内三家（高德/腾讯/百度）里是唯一使用自有坐标系的一家。
// 高德、腾讯都是 GCJ-02（火星坐标），本项目底图与既有路线数据也全是 GCJ-02；
// 百度 Web 服务默认返回 BD-09，直接用会出现约 300~600 米的固定偏移。
//
// 约定：本文件所有函数签名统一为 (lat, lng) → [lat, lng]，与 mapservice.ts 的
// wgs84ToGcj02 保持一致，避免调用方记两套参数顺序。

const PI = Math.PI
const X_PI = (PI * 3000.0) / 180.0

/**
 * GCJ-02 → BD-09。
 * 用于「把本项目的 GCJ-02 坐标喂给百度接口」。
 */
export function gcj02ToBd09(lat: number, lng: number): [number, number] {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI)
  const bdLng = z * Math.cos(theta) + 0.0065
  const bdLat = z * Math.sin(theta) + 0.006
  return [bdLat, bdLng]
}

/**
 * BD-09 → GCJ-02。
 * 用于「把百度返回的结果转回本项目坐标系」再交给底图渲染 / 导航引擎。
 */
export function bd09ToGcj02(lat: number, lng: number): [number, number] {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  const gLng = z * Math.cos(theta)
  const gLat = z * Math.sin(theta)
  return [gLat, gLng]
}
