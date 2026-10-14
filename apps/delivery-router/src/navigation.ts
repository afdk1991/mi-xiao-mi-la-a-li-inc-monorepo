// 实时导航引擎（自建）。
//
// 为什么必须自己写：高德 / 腾讯 / 百度三家**都没有开放 Web 端导航引擎**——
// 它们提供的只是「路线规划」（给你 polyline + 步骤），真正的导航（GPS 匹配、偏航重算、
// 车道级引导、语音）只存在于各自的 Android/iOS 原生导航 SDK 里。
// 因此本项目把三家当作**算路数据源**，导航逻辑全部自建：
//
//   定位       浏览器 Geolocation watchPosition（HTTPS 下可用；无 GPS 时可开模拟模式）
//   地图匹配   把 GPS 点投影到路线 polyline 上，得到「沿路线已走距离」与「横向偏离」
//   偏航判定   横向偏离持续超阈值 → 用聚合算路重新规划到当前目的地
//   引导       当前步 / 下一步 / 距转弯点距离 / 剩余里程与 ETA
//   到达       距终点小于阈值即判定到达，回调外部推进到下一站
//
// 这样导航完全嵌在自家 App 内，不需要跳转到任何第三方导航 App。

import { haversine } from './geo'
import type { NavStep } from './types'

const M_PER_DEG_LAT = 111320

/**
 * 经纬度 → 平面米坐标。
 * 只用于「点与线段」的相对计算（投影、横向偏离、沿程距离），
 * 因此不需要引入投影库：按当前纬度做等距圆柱近似即可，城市尺度误差可忽略。
 */
function toMeters(lat: number, lng: number, originLat: number): [number, number] {
  const k = M_PER_DEG_LAT * Math.cos((originLat * Math.PI) / 180)
  return [lng * k, lat * M_PER_DEG_LAT]
}

/** 米坐标 → 经纬度（toMeters 的逆运算） */
function fromMeters(x: number, y: number, originLat: number): [number, number] {
  const k = M_PER_DEG_LAT * Math.cos((originLat * Math.PI) / 180)
  return [y / M_PER_DEG_LAT, x / k]
}

export interface NavRoute {
  fromName: string
  toName: string
  destination: [number, number]
  distance: number // 米
  duration: number // 秒
  geometry: Array<[number, number]>
  steps: NavStep[]
  /** 该路线由哪家服务商提供（用于 UI 展示） */
  providerLabel?: string
}

export type NavStatus =
  | 'idle'
  | 'waiting' // 已启动，等待首个定位
  | 'navigating'
  | 'offroute' // 检测到偏离
  | 'rerouting' // 正在重算
  | 'arrived'
  | 'error'

export interface NavPosition {
  lat: number
  lng: number
  /** 行进方向（度，正北为 0）；设备不提供时由前后两点推算 */
  heading: number
  /** 米/秒 */
  speed: number
  accuracy: number
}

export interface NavSnapshot {
  status: NavStatus
  position: NavPosition | null
  /** 匹配到路线上的点 */
  snapped: [number, number] | null
  /** 已走过的几何（用于地图灰化） */
  traveled: Array<[number, number]>
  stepIndex: number
  currentStep: NavStep | null
  nextStep: NavStep | null
  /** 距下一个转弯点（米） */
  distanceToManeuver: number
  distanceRemaining: number
  durationRemaining: number
  /** 横向偏离路线的距离（米） */
  offRouteDistance: number
  message: string
  providerLabel?: string
}

/** 偏航判定阈值：横向偏离超过这个值才算偏航 */
const OFF_ROUTE_M = 35
/** 需连续确认多少次才判定偏航（避免单帧 GPS 漂移误判） */
const OFF_ROUTE_CONFIRM = 3
/** 到达判定阈值 */
const ARRIVE_M = 25
/** 语音播报触发点（米），由远及近 */
const SPEAK_GATES = [500, 200, 100, 50, 20]

export interface NavEngineOptions {
  /** 偏航或需要重算时调用；返回新路线，引擎内部替换 */
  onReroute: (reason: string, from: [number, number]) => Promise<NavRoute | null>
  onUpdate: (s: NavSnapshot) => void
  onArrive: () => void
  /** 语音播报；外部可接 SpeechSynthesis 或直接忽略 */
  speak?: (text: string) => void
  /** 无真实 GPS 时沿路线模拟推进（演示/桌面调试用） */
  simulate?: boolean
  /** 模拟速度（米/秒），默认 12 m/s ≈ 43 km/h */
  simulateSpeed?: number
}

export class NavigationEngine {
  private route: NavRoute | null = null
  private cum: number[] = []
  private meters: Array<[number, number]> = []
  private originLat = 0
  private stepStartAlong: number[] = []
  private status: NavStatus = 'idle'
  private position: NavPosition | null = null
  private snapped: [number, number] | null = null
  private traveled: Array<[number, number]> = []
  private along = 0
  private offRouteHits = 0
  private lastIndex = 0
  private watchId: number | null = null
  private simTimer: number | null = null
  private lastSpeakKey = ''
  private finished = false

  constructor(private opts: NavEngineOptions) {}

  get currentStatus(): NavStatus {
    return this.status
  }

  get currentPosition(): NavPosition | null {
    return this.position
  }

  /** 当前匹配到的沿路线距离（米），供外部计算进度 */
  get progressAlong(): number {
    return this.along
  }

  start(route: NavRoute): void {
    this.finished = false
    this.setRoute(route)
    this.status = 'waiting'
    this.emit('等待定位…')
    if (this.opts.simulate) {
      this.startSimulation()
    } else {
      this.startWatch()
    }
  }

  stop(): void {
    this.finished = true
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    if (this.simTimer !== null) {
      clearInterval(this.simTimer)
      this.simTimer = null
    }
    this.status = 'idle'
    this.emit('导航已结束')
  }

  /** 外部完成重算后替换路线（偏航恢复 / 手动刷新） */
  setRoute(route: NavRoute): void {
    this.route = route
    this.originLat = route.geometry.length ? route.geometry[0][0] : 39.9
    this.meters = route.geometry.map(([lat, lng]) => toMeters(lat, lng, this.originLat))
    this.cum = [0]
    for (let i = 1; i < this.meters.length; i++) {
      const [x1, y1] = this.meters[i - 1]
      const [x2, y2] = this.meters[i]
      this.cum.push(this.cum[i - 1] + Math.hypot(x2 - x1, y2 - y1))
    }
    // 每个步骤的起点在几何上的位置：步骤只带首点，匹配到最近的几何点即可。
    // 直接在米坐标下比距离（而非逐点算 haversine），长路线下能省掉上万次三角函数。
    this.stepStartAlong = (route.steps ?? []).map((st) => {
      const p = st.geometry?.[0]
      if (!p) return 0
      const [px, py] = toMeters(p[0], p[1], this.originLat)
      let bi = 0
      let bd = Infinity
      for (let i = 0; i < this.meters.length; i++) {
        const dx = this.meters[i][0] - px
        const dy = this.meters[i][1] - py
        const d = dx * dx + dy * dy
        if (d < bd) {
          bd = d
          bi = i
        }
      }
      return this.cum[bi] ?? 0
    })
    this.lastIndex = 0
  }

  // ---- 定位 ----

  private startWatch(): void {
    if (!('geolocation' in navigator)) {
      this.status = 'error'
      this.emit('当前环境不支持定位（可开启「模拟导航」）')
      return
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const heading = Number.isFinite(pos.coords.heading as number)
          ? (pos.coords.heading as number)
          : this.inferHeading(pos.coords.latitude, pos.coords.longitude)
        this.position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading,
          speed: Number.isFinite(pos.coords.speed as number) ? (pos.coords.speed as number) : 0,
          accuracy: pos.coords.accuracy ?? 0,
        }
        this.onFix()
      },
      (err) => {
        this.status = 'error'
        this.emit(`定位失败：${err.message}（可开启「模拟导航」）`)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
    )
  }

  private inferHeading(lat: number, lng: number): number {
    if (!this.position) return 0
    const d = haversine(this.position.lat, this.position.lng, lat, lng)
    if (d < 1) return this.position.heading
    const dy = lat - this.position.lat
    const dx = (lng - this.position.lng) * Math.cos((lat * Math.PI) / 180)
    return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
  }

  /** 模拟模式：沿路线按固定速度推进，用于无 GPS 环境演示整条引导流程 */
  private startSimulation(): void {
    const speed = this.opts.simulateSpeed ?? 12
    const tick = 500
    let simAlong = 0
    this.simTimer = window.setInterval(() => {
      if (this.finished || !this.route) return
      simAlong += (speed * tick) / 1000
      const total = this.cum[this.cum.length - 1] || 1
      const t = Math.min(simAlong, total)
      const p = this.pointAtAlong(t)
      const ahead = this.pointAtAlong(Math.min(t + 5, total))
      const heading = ((Math.atan2(ahead[1] - p[1], ahead[0] - p[0]) * 180) / Math.PI + 360) % 360
      this.position = { lat: p[0], lng: p[1], heading, speed, accuracy: 5 }
      this.onFix()
    }, tick)
  }

  private pointAtAlong(along: number): [number, number] {
    const m = this.meters
    if (!m.length) return [0, 0]
    if (m.length === 1) return fromMeters(m[0][0], m[0][1], this.originLat)
    let i = 0
    while (i < this.cum.length - 2 && this.cum[i + 1] < along) i++
    const segLen = this.cum[i + 1] - this.cum[i] || 1
    const t = Math.min(1, Math.max(0, (along - this.cum[i]) / segLen))
    const x = m[i][0] + (m[i + 1][0] - m[i][0]) * t
    const y = m[i][1] + (m[i + 1][1] - m[i][1]) * t
    return fromMeters(x, y, this.originLat)
  }

  // ---- 地图匹配 ----

  private project(lat: number, lng: number): { along: number; cross: number; point: [number, number]; index: number } {
    const [px, py] = toMeters(lat, lng, this.originLat)
    const m = this.meters
    let best = { along: 0, cross: Infinity, point: [0, 0] as [number, number], index: 0 }

    // 从上一次位置附近开始扫（路线是单调推进的），距离过大时再全量扫描
    const scan = (fromIdx: number, toIdx: number) => {
      for (let i = fromIdx; i < toIdx; i++) {
        const [ax, ay] = m[i]
        const [bx, by] = m[i + 1]
        const dx = bx - ax
        const dy = by - ay
        const len2 = dx * dx + dy * dy
        let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
        t = Math.min(1, Math.max(0, t))
        const cx = ax + dx * t
        const cy = ay + dy * t
        const cross = Math.hypot(px - cx, py - cy)
        if (cross < best.cross) {
          best = {
            along: this.cum[i] + Math.sqrt(len2) * t,
            cross,
            point: fromMeters(cx, cy, this.originLat),
            index: i,
          }
        }
      }
    }

    scan(this.lastIndex, m.length - 1)
    if (best.cross > 200) {
      best.cross = Infinity
      scan(0, m.length - 1)
    }
    return best
  }

  // ---- 主循环 ----

  private onFix(): void {
    const route = this.route
    const pos = this.position
    if (!route || !pos || this.finished) return
    if (this.status === 'rerouting') return // 重算中不接受新定位推进

    const pr = this.project(pos.lat, pos.lng)
    this.snapped = pr.point
    this.along = pr.along
    this.lastIndex = pr.index
    // 已走过的几何：路线前缀 + 当前投影点
    this.traveled = route.geometry.slice(0, pr.index + 1).concat([pr.point])

    const total = this.cum[this.cum.length - 1] || 0
    const remaining = Math.max(0, total - pr.along)

    // 到达判定：剩余里程够小，或直线距离已非常接近终点
    const toDest = haversine(pos.lat, pos.lng, route.destination[0], route.destination[1])
    if (remaining <= ARRIVE_M || toDest <= ARRIVE_M) {
      this.status = 'arrived'
      this.speak(`已到达${route.toName || '目的地'}`)
      this.emit('已到达目的地')
      this.finished = true
      this.opts.onArrive()
      return
    }

    // 偏航判定
    if (pr.cross > OFF_ROUTE_M) {
      this.offRouteHits += 1
    } else {
      this.offRouteHits = 0
    }
    if (this.offRouteHits >= OFF_ROUTE_CONFIRM) {
      this.triggerReroute('检测到偏离路线')
      return
    }

    // 引导：定位当前处于哪一步
    let stepIndex = 0
    for (let i = 0; i < this.stepStartAlong.length; i++) {
      if (this.stepStartAlong[i] <= pr.along + 1) stepIndex = i
    }
    const steps = route.steps ?? []
    const currentStep = steps[stepIndex] ?? null
    const nextStep = steps[stepIndex + 1] ?? null
    const nextAlong = this.stepStartAlong[stepIndex + 1]
    const distanceToManeuver =
      nextAlong !== undefined ? Math.max(0, nextAlong - pr.along) : remaining

    // ETA：按路线平均速度外推，速度缺失时按 30km/h 兜底
    const avgSpeed = route.duration > 0 ? route.distance / route.duration : 8.3
    const durationRemaining = avgSpeed > 0 ? remaining / avgSpeed : 0

    this.status = 'navigating'
    this.announce(stepIndex, distanceToManeuver, nextStep)
    this.emit('', {
      stepIndex,
      currentStep,
      nextStep,
      distanceToManeuver,
      distanceRemaining: remaining,
      durationRemaining,
      offRouteDistance: pr.cross,
    })
  }

  // ---- 语音 ----

  private announce(stepIndex: number, distanceToManeuver: number, nextStep: NavStep | null): void {
    if (!this.opts.speak || !nextStep) return
    for (const gate of SPEAK_GATES) {
      if (distanceToManeuver <= gate) {
        const key = `${stepIndex}:${gate}`
        if (key !== this.lastSpeakKey) {
          this.lastSpeakKey = key
          this.speak(`前方${gate}米，${nextStep.instruction}`)
        }
        break
      }
    }
  }

  private speak(text: string): void {
    this.opts.speak?.(text)
  }

  // ---- 偏航重算 ----

  private async triggerReroute(reason: string): Promise<void> {
    if (this.status === 'rerouting') return
    this.status = 'rerouting'
    this.emit(reason + '，正在重新规划…')
    this.speak(reason)
    const from: [number, number] = this.snapped ??
      (this.position ? [this.position.lat, this.position.lng] : [0, 0])
    try {
      const next = await this.opts.onReroute(reason, from)
      if (next && !this.finished) {
        this.setRoute(next)
        this.offRouteHits = 0
        this.lastSpeakKey = ''
        this.status = 'navigating'
        this.emit('已重新规划路线')
      } else {
        this.status = 'navigating'
        this.offRouteHits = 0
        this.emit('重算失败，继续沿用原路线')
      }
    } catch {
      this.status = 'navigating'
      this.offRouteHits = 0
      this.emit('重算异常，继续沿用原路线')
    }
  }

  /** 手动重算（用户在 HUD 上点「重新规划」） */
  manualReroute(): void {
    if (!this.position) return
    void this.triggerReroute('手动重新规划')
  }

  // ---- 输出 ----

  private emit(message: string, extra?: Partial<NavSnapshot>): void {
    const route = this.route
    const total = this.cum[this.cum.length - 1] || 0
    const snap: NavSnapshot = {
      status: this.status,
      position: this.position,
      snapped: this.snapped,
      traveled: this.traveled,
      stepIndex: extra?.stepIndex ?? 0,
      currentStep: extra?.currentStep ?? null,
      nextStep: extra?.nextStep ?? null,
      distanceToManeuver: extra?.distanceToManeuver ?? 0,
      distanceRemaining: extra?.distanceRemaining ?? Math.max(0, total - this.along),
      durationRemaining: extra?.durationRemaining ?? 0,
      offRouteDistance: extra?.offRouteDistance ?? 0,
      message,
      providerLabel: route?.providerLabel,
    }
    this.opts.onUpdate(snap)
  }
}
