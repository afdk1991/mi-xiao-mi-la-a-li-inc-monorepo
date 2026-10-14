// 多源聚合算路：同一段起终点并发问多家（高德 / 腾讯 / 百度），按策略选一条。
//
// 为什么要聚合，而不是只调当前选中的那一家：
//   1) 容错 —— 任一家配额用尽、Key 失效、网络抖动时，另一家能立刻顶上，
//      导航过程中「算不出路」比「算得慢」严重得多；
//   2) 择优 —— 各家路网数据与实时路况策略不同，同一段路给出的里程/耗时能差出 10% 以上，
//      「best」策略会等所有家返回后取最短的一条。
//
// 注意：聚合只发生在**算路数据源**层面；导航所需的 GPS 定位、地图匹配、引导播报
// 全部由本项目自己的导航引擎完成（三家都没有开放 Web 端导航引擎）。

import { hasCredentials, serviceLabel, type MapService, type MapSettings } from './mapservice'
import { getSegmentRoute, routeForService, type RouteMode } from './routing'

/** 参与聚合的国内服务商顺序（高德优先，仅影响同分时的取舍） */
const PROVIDERS: MapService[] = ['amap', 'tencent', 'baidu']

export interface AggregatedRoute {
  /** 实际采用的服务商 */
  provider: MapService
  providerLabel: string
  distance: number
  duration: number
  geometry: Array<[number, number]>
  steps: Array<{ instruction: string; distance: number; duration: number; geometry?: Array<[number, number]> }>
  /** 各家是否成功（用于 UI 展示「聚合命中情况」） */
  attempts: Array<{ provider: MapService; ok: boolean }>
}

/** 该服务商当前是否具备调用条件 */
export function providerAvailable(service: MapService, s: MapSettings): boolean {
  if (service === 'osm') return true
  return hasCredentials({ ...s, service })
}

/** 并发取「最先成功返回」的结果；全失败返回 null */
function firstSuccess<T>(tasks: Array<Promise<T | null>>): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    let pending = tasks.length
    if (pending === 0) return resolve(null)
    for (const t of tasks) {
      t.then(
        (v) => {
          if (v) resolve(v)
        },
        () => {
          /* 该家失败，继续等其它家 */
        },
      ).finally(() => {
        pending -= 1
        if (pending === 0) resolve(null)
      })
    }
  })
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
    )
  })
}

export interface AggregateOptions {
  mode?: RouteMode
  signal?: AbortSignal
  /**
   * fastest 取最先返回的一家（延迟最低，适合导航中偏航重算）
   * best    等全部返回后取里程最短的一家（质量最优，适合出发前规划）
   */
  strategy?: 'fastest' | 'best'
  /** 单个服务商超时（毫秒） */
  timeoutMs?: number
}

/**
 * 聚合算路。全部服务商失败时，退化为「当前服务 + 既有兜底链（OSRM / 直线）」，
 * 保证导航永远有路可走。
 */
export async function planRouteAggregated(
  from: [number, number],
  to: [number, number],
  settings: MapSettings,
  opts: AggregateOptions = {},
): Promise<AggregatedRoute | null> {
  const mode = opts.mode ?? 'driving'
  const strategy = opts.strategy ?? 'fastest'
  const timeoutMs = opts.timeoutMs ?? 8000

  const usable = PROVIDERS.filter((p) => providerAvailable(p, settings))
  const attempts: Array<{ provider: MapService; ok: boolean }> = []

  type Hit = { provider: MapService; r: NonNullable<Awaited<ReturnType<typeof routeForService>>> }

  const tasks = usable.map((p) =>
    withTimeout(
      routeForService(p, from, to, settings, opts.signal, mode).then((r) => {
        attempts.push({ provider: p, ok: !!r })
        return r ? ({ provider: p, r } as Hit) : null
      }),
      timeoutMs,
    ),
  )

  let chosen: Hit | null = null
  if (strategy === 'best') {
    const all = await Promise.all(tasks)
    const ok = all.filter((x): x is Hit => !!x)
    chosen =
      ok.length > 0 ? ok.reduce((a, b) => (b.r.distance < a.r.distance ? b : a)) : null
  } else {
    chosen = await firstSuccess(tasks)
  }

  if (chosen) {
    return {
      provider: chosen.provider,
      providerLabel: serviceLabel(chosen.provider),
      distance: chosen.r.distance,
      duration: chosen.r.duration,
      geometry: chosen.r.geometry,
      steps: chosen.r.steps,
      attempts,
    }
  }

  // 全部失败：走既有兜底链（OSRM / 直线），标注为当前服务 + 兜底
  const seg = await getSegmentRoute(from, to, '', '', 0, 1, settings, opts.signal, { mode })
  return {
    provider: settings.service,
    providerLabel: `${serviceLabel(settings.service)}（兜底）`,
    distance: seg.distance,
    duration: seg.duration,
    geometry: seg.geometry,
    steps: seg.steps,
    attempts,
  }
}
