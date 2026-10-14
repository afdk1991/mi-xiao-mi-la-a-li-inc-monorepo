// 配送员轨迹回传与纠偏：调用高德 v4/grasproad 轨迹纠偏接口，把飘点纠偏到道路上。
// 仅高德 + Web 服务 Key 支持（腾讯/OSM 无此能力）。缺 Key 或点数不足时返回可读错误。
// 字段要求（高德 v4 grasproad）：x(经度) y(纬度) ag(与正北夹角) tm(秒) sp(速度km/h)，最多 500 点。

import { type MapSettings } from './mapservice'
import { amapGraspRoad } from './amap'
import { haversine } from './geo'

export interface TrackPoint {
  lng: number
  lat: number
  ag?: number
  tm?: number
  sp?: number
}

export interface GraspResult {
  /** 纠偏后总距离（米） */
  distance: number
  /** 纠偏后坐标 [lat, lng][] */
  points: [number, number][]
}

export interface GraspOutcome {
  ok: boolean
  result?: GraspResult
  /** 失败原因（含该服务不支持的提示） */
  msg?: string
}

/**
 * 轨迹纠偏。points 为原始 GPS 轨迹（建议已含合理 sp/ag/tm，缺失时按相邻点估算）。
 * 返回 ok=false 时 msg 含可读原因。
 */
export async function graspRoad(
  points: TrackPoint[],
  settings: MapSettings,
  signal?: AbortSignal,
): Promise<GraspOutcome> {
  if (settings.service !== 'amap') {
    return { ok: false, msg: '轨迹纠偏仅支持高德（腾讯/OSM 暂无此能力）。' }
  }
  if (points.length < 2) return { ok: false, msg: '轨迹点不足（至少 2 个）。' }

  // 统一走 amap.ts 网关：仅 Web 服务通道支持 v4/grasproad（JS 通道会给出明确提示）
  const r = await amapGraspRoad(points, settings, signal)
  return r.ok && r.points
    ? { ok: true, result: { distance: Number(r.distance ?? 0), points: r.points } }
    : { ok: false, msg: r.msg ?? '轨迹纠偏失败。' }
}

/**
 * 由现有路线几何 [lat,lng][] 生成带噪声的示例轨迹，用于在无真实设备时演示纠偏效果。
 */
export function buildSampleTrack(geometry: [number, number][], sigma = 0.0009): TrackPoint[] {
  if (geometry.length < 2) return []
  return geometry.map(([lat, lng]) => ({
    lat: lat + (Math.random() - 0.5) * 2 * sigma,
    lng: lng + (Math.random() - 0.5) * 2 * sigma,
  }))
}

/** 折线总长度（米），用于展示纠偏前后里程对比。 */
export function trackLength(points: [number, number][]): number {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
  }
  return d
}
