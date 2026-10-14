// 路径优化排序算法
//  - route 模式：最近邻初始化 + 2-opt 改良的旅行商问题（TSP）近似解，最小化总行驶里程
//  - distance 模式：按到起点的直线距离升序排列（简单、可解释）
// 距离矩阵使用 Haversine 直线距离（快速、无需外部调用），适合大规模客户批量排序。

import { haversine, isValidCoord } from './geo'
import { mapLimit } from './async'
import {
  getSegmentRoute,
  getTruckRoute,
  distanceMatrix as roadNetworkMatrix,
  type RouteMode,
  type TruckOptions,
} from './routing'
import type { MapSettings } from './mapservice'
import type { Customer, Depot, OptimizeMode, OptimizeResult, RouteSegment } from './types'

type Pt = [number, number]

function distanceMatrix(points: Pt[]): number[][] {
  const n = points.length
  const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversine(points[i][0], points[i][1], points[j][0], points[j][1])
      m[i][j] = d
      m[j][i] = d
    }
  }
  return m
}

/** 最近邻：从 start 出发，每次选最近的未访问点 */
function nearestNeighbor(m: number[][], start: number): number[] {
  const n = m.length
  const visited = new Array(n).fill(false)
  const tour = [start]
  visited[start] = true
  for (let k = 1; k < n; k++) {
    let best = -1
    let bestD = Infinity
    const last = tour[tour.length - 1]
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue
      const d = m[last][j]
      if (Number.isFinite(d) && d < bestD) {
        bestD = d
        best = j
      }
    }
    // 矩阵里出现 NaN / Infinity（不可达、坐标异常）时，`d < bestD` 恒为 false，
    // 会直接 break 掉剩下的站点——表现为「优化后莫名少了几个客户」。
    // 宁可顺序次优，也不能静默丢单：兜底取第一个未访问点把 tour 补齐。
    if (best === -1) best = visited.indexOf(false)
    if (best === -1) break
    visited[best] = true
    tour.push(best)
  }
  return tour
}

/**
 * 2-opt 改良：反复反转片段直到无法改进。
 *
 * 注意这里是**开放路径**（起点固定、不返回起点），与实际生成的 segments 一致：
 * depot → s1 → … → sn。早前版本用 `(k+1) % n` 回绕到起点，等于按闭环 TSP 优化，
 * 会为了「最后一点连回仓库最短」而牺牲真实总里程，在长路线尾部产生明显绕行。
 * 现在越过末点的反转一律跳过。
 */
function twoOpt(m: number[][], tour: number[]): number[] {
  const n = tour.length
  const dist = (a: number, b: number) => m[a][b]
  const best = tour.slice()
  if (n < 4) return best

  const MAX_PASS = 40 // 防御：异常矩阵下的兜底，正常数据几轮就收敛
  let improved = true
  let pass = 0
  while (improved && pass < MAX_PASS) {
    pass++
    improved = false
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        // 反转 [i, k] 后，被切断的是 (i-1,i) 与 (k,k+1) 两条边；k+1 越界则跳过（开放路径）
        if (k + 1 >= n) continue
        const a = best[i - 1]
        const b = best[i]
        const c = best[k]
        const d = best[k + 1]
        const before = dist(a, b) + dist(c, d)
        const after = dist(a, c) + dist(b, d)
        if (after + 1e-6 >= before) continue
        // 原地反转，避免每轮 slice/concat 产生临时数组
        let lo = i
        let hi = k
        while (lo < hi) {
          const t = best[lo]
          best[lo] = best[hi]
          best[hi] = t
          lo++
          hi--
        }
        improved = true
      }
    }
  }
  return best
}

/**
 * Or-opt：把长度为 1~3 的连续片段搬到别处（可反向），进一步消除 2-opt 处理不了的绕行。
 *
 * 走位收益用「断开两条边 vs 接回两条边」的增量算，不重算整条路径，
 * 因此单次检查是 O(1) 而非 O(n)。
 */
function orOpt(m: number[][], tour: number[]): number[] {
  const n = tour.length
  const dist = (a: number, b: number) => m[a][b]
  let best = tour.slice()
  if (n < 5) return best

  let improved = true
  let guard = 0
  while (improved && guard < 30) {
    guard++
    improved = false
    outer: for (let segLen = 1; segLen <= 3 && segLen <= n - 2; segLen++) {
      for (let i = 1; i + segLen <= n; i++) {
        const segEnd = i + segLen
        const prev = best[i - 1]
        const seg = best.slice(i, segEnd)
        const hasNext = segEnd < n
        // 移除 seg 节省的距离：拆 prev→seg首 与 seg尾→next，接回 prev→next
        const removed =
          dist(prev, seg[0]) + (hasNext ? dist(seg[segLen - 1], best[segEnd]) - dist(prev, best[segEnd]) : 0)
        const rest = best.slice(0, i).concat(best.slice(segEnd))
        const variants = segLen > 1 ? [seg, seg.slice().reverse()] : [seg]
        for (let j = 1; j < rest.length; j++) {
          const u = rest[j - 1]
          const v = rest[j]
          const uv = dist(u, v)
          for (const cand of variants) {
            const added = dist(u, cand[0]) + dist(cand[cand.length - 1], v) - uv
            if (added + 1e-6 >= removed) continue
            best = rest.slice(0, j).concat(cand, rest.slice(j))
            improved = true
            break outer // 位置全变了，重新扫描最稳妥
          }
        }
      }
    }
  }
  return best
}

/**
 * 计算优化顺序（不含起点），返回 customers 下标数组。
 * matrix 可选：传入道路网真实距离矩阵（来自 routing.distanceMatrix）以替代默认 Haversine 直线矩阵。
 */
export function computeOrder(
  customers: Customer[],
  depot: Depot,
  mode: OptimizeMode,
  matrix?: number[][],
): number[] {
  // 未定位（lat/lng = 0，即几内亚湾）的地址不得参与排序：
  // 一旦纳入，整条路线会被这个点拽飞，总里程与 ETA 全失真。
  // 面板上「有 N 条地址未定位，不参与计算」的提示必须与实际行为一致。
  const idxs = customers.map((_, i) => i).filter((i) => isValidCoord(customers[i].lat, customers[i].lng))
  const kept = idxs.map((i) => customers[i])
  const n = kept.length
  if (n === 0) return []
  if (n === 1) return [idxs[0]]

  if (mode === 'distance') {
    // 按到起点直线距离升序
    return kept
      .map((c, k) => ({
        k,
        d: haversine(depot.lat, depot.lng, c.lat, c.lng),
      }))
      .sort((a, b) => a.d - b.d)
      .map((x) => idxs[x.k])
  }

  // route 模式：把起点作为虚拟第 0 个点纳入矩阵
  const pts: Pt[] = [[depot.lat, depot.lng], ...kept.map((c) => [c.lat, c.lng] as Pt)]
  const m = matrix ?? distanceMatrix(pts)
  // 启发式：最近邻起步，2-opt 消除交叉，Or-opt 再搬移短片段进一步压里程
  let tour = nearestNeighbor(m, 0)
  tour = orOpt(m, twoOpt(m, tour))
  // 去掉起点（index 0），并把 kept 内下标还原为 customers 下标
  return tour.filter((x) => x !== 0).map((x) => idxs[x - 1])
}

/**
 * 构建完整路线结果（含每段地图路线与步骤），异步并发获取各段。
 * opts.roadNetwork=true 时，route 模式改用道路网真实距离矩阵做 TSP 排序（更准，但会产生多次 API 调用，需关注配额）。
 * opts.travelMode 指定出行方式（驾车/步行/骑行）；道路网矩阵与高德均按驾车近似，OSM 会切换 foot/bicycle 剖面。
 * opts.truck 提供时，各段改用货车路线规划（getTruckRoute）；未开通货车服务的 Key 会自动退化为驾车/直线。
 */
export async function buildRoute(
  customers: Customer[],
  depot: Depot,
  mode: OptimizeMode,
  settings: MapSettings,
  signal?: AbortSignal,
  opts?: { roadNetwork?: boolean; truck?: TruckOptions; travelMode?: RouteMode },
): Promise<OptimizeResult> {
  // 先剔除未定位地址：既避免把路线拽到 (0,0)，也保证下方距离矩阵的点集与排序点集严格对齐
  // （矩阵下标一旦与 customers 下标错位，TSP 会拿着错行算出一串错序）
  const validIdx = customers.map((_, i) => i).filter((i) => isValidCoord(customers[i].lat, customers[i].lng))
  const kept = validIdx.map((i) => customers[i])

  let matrix: number[][] | undefined
  if (opts?.roadNetwork && mode === 'route' && kept.length) {
    const pts: Pt[] = [[depot.lat, depot.lng], ...kept.map((c) => [c.lat, c.lng] as Pt)]
    // 道路网矩阵按当前出行方式计算（腾讯原生支持步行/骑行；高德仅有驾车口径 → 内部退化为直线）
    const dm = await roadNetworkMatrix(pts, settings, { signal, mode: opts?.travelMode ?? 'driving' })
    matrix = dm.distances
  }
  const order = computeOrder(kept, depot, mode, matrix).map((k) => validIdx[k])
  const stops = order.map((i) => customers[i])
  const fullPts: Pt[] = [[depot.lat, depot.lng], ...stops.map((c) => [c.lat, c.lng] as Pt)]

  const legs = fullPts.slice(0, -1)
  // 并发上限：Promise.all 会把 N 段一次性打出去，单量一大必然触发服务商限流（429）
  // 反而更慢且白烧配额。这里按各服务常见的 QPS 上限取保守值。
  const legsConc = settings.service === 'osm' ? 2 : 4
  const segments: RouteSegment[] = await mapLimit(
    legs,
    legsConc,
    (from, idx) => {
      const fromName = idx === 0 ? depot.name : stops[idx - 1].name
      const toName = stops[idx].name
      return opts?.truck
        ? getTruckRoute(from, fullPts[idx + 1], fromName, toName, idx, idx + 1, settings, opts.truck, signal)
        : getSegmentRoute(from, fullPts[idx + 1], fromName, toName, idx, idx + 1, settings, signal, {
            mode: opts?.travelMode ?? 'driving',
          })
    },
    signal,
  )

  const totalDistance = segments.reduce((s, x) => s + x.distance, 0)
  const totalDuration = segments.reduce((s, x) => s + x.duration, 0)

  return { mode, order, totalDistance, totalDuration, segments }
}
