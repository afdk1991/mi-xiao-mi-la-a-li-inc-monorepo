// 路线优化：haversine 距离下的最近邻（NN）+ 2-opt 局部改进。
// 三种模式：
//   shortest 最短总里程：NN + 2-opt（目标 = 总里程最小）
//   balanced 均衡：NN + 2-opt（目标 = 各段里程平方和最小，路段更平滑）
//   regional 区域聚类：按城市分组，组间按质心 NN 排序，组内 NN
// 尊重 isStart / isEnd 钉子点（固定首尾，只优化中间段）。

import { haversine } from './geo.ts'
import type { AddressItem, OptimizationMode } from './types.ts'

interface Point {
  lat: number
  lng: number
}

function dist(a: Point, b: Point): number {
  return haversine(a.lat, a.lng, b.lat, b.lng)
}

/** 路径总里程（米） */
export function pathLength(order: number[], points: Point[]): number {
  let total = 0
  for (let i = 1; i < order.length; i++) {
    total += dist(points[order[i - 1]], points[order[i]])
  }
  return total
}

/** 路径「平滑度」：各段里程平方和（balanced 模式的目标） */
function pathSmoothness(order: number[], points: Point[]): number {
  let sum = 0
  for (let i = 1; i < order.length; i++) {
    const d = dist(points[order[i - 1]], points[order[i]])
    sum += d * d
  }
  return sum
}

function nearestNeighbor(points: Point[], startIdx = 0): number[] {
  const n = points.length
  const visited = new Set<number>([startIdx])
  const order = [startIdx]
  while (order.length < n) {
    const last = points[order[order.length - 1]]
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue
      const d = dist(last, points[i])
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    visited.add(best)
    order.push(best)
  }
  return order
}

/**
 * 2-opt 局部搜索。
 * @param order 初始路径（下标序列）
 * @param points 坐标数组
 * @param cost 路径代价函数（total 或 smoothness）
 * @param fixedFirst fixedLast 为 true 时首/尾位置钉住不动
 */
function twoOpt(order: number[], points: Point[], cost: (o: number[], p: Point[]) => number, fixedFirst = false, fixedLast = false): number[] {
  let best = [...order]
  let bestCost = cost(best, points)
  const lo = fixedFirst ? 1 : 0
  const hi = fixedLast ? best.length - 1 : best.length
  let improved = true
  while (improved) {
    improved = false
    for (let i = lo; i < hi - 1; i++) {
      for (let j = i + 1; j < hi; j++) {
        const candidate = [...best]
        // 反转 [i, j] 段
        for (let a = i, b = j; a < b; a++, b--) {
          const t = candidate[a]
          candidate[a] = candidate[b]
          candidate[b] = t
        }
        const c = cost(candidate, points)
        if (c < bestCost - 1e-6) {
          best = candidate
          bestCost = c
          improved = true
        }
      }
    }
  }
  return best
}

/** 按城市聚类（regional 模式）：组间质心 NN，组内 NN */
function regionalOrder(points: Point[], cities: string[]): number[] {
  const groups = new Map<string, number[]>()
  points.forEach((_, i) => {
    const key = cities[i]?.trim() || '未知'
    const arr = groups.get(key)
    if (arr) arr.push(i)
    else groups.set(key, [i])
  })
  const groupKeys = [...groups.keys()]
  // 各组质心
  const centroid = (idxs: number[]): Point => {
    let lat = 0
    let lng = 0
    for (const i of idxs) {
      lat += points[i].lat
      lng += points[i].lng
    }
    return { lat: lat / idxs.length, lng: lng / idxs.length }
  }
  const centroids = groupKeys.map((k) => centroid(groups.get(k)!))
  const groupOrder = nearestNeighbor(centroids, 0)
  const result: number[] = []
  for (const gi of groupOrder) {
    const members = groups.get(groupKeys[gi])!
    if (members.length === 1) {
      result.push(members[0])
      continue
    }
    const subPoints = members.map((i) => points[i])
    const subOrder = nearestNeighbor(subPoints, 0)
    for (const si of subOrder) result.push(members[si])
  }
  return result
}

export interface OptimizeInput {
  addresses: AddressItem[]
  mode: OptimizationMode
}

export interface OptimizeResult {
  orderedIndexes: number[]
  totalDistance: number
}

/**
 * 优化地址顺序。
 * - 起点：优先 isStart 标记的地址，否则第 0 个
 * - 终点：若有 isEnd 标记的地址则固定末位
 */
export function optimize({ addresses, mode }: OptimizeInput): OptimizeResult {
  const n = addresses.length
  if (n <= 1) return { orderedIndexes: addresses.map((_, i) => i), totalDistance: 0 }

  const points: Point[] = addresses.map((a) => ({ lat: a.latitude, lng: a.longitude }))
  const cities = addresses.map((a) => a.city ?? '')

  const startIdx = addresses.findIndex((a) => a.isStart)
  const endIdx = addresses.findIndex((a) => a.isEnd && a !== addresses[startIdx >= 0 ? startIdx : 0])

  let order: number[]

  if (startIdx >= 0 || endIdx >= 0) {
    // 钉子点模式：固定首尾，中间段优化
    const head = startIdx >= 0 ? startIdx : 0
    const pinned = new Set<number>([head])
    if (endIdx >= 0 && endIdx !== head) pinned.add(endIdx)
    const middle = addresses.map((_, i) => i).filter((i) => !pinned.has(i))
    let middleOrder: number[]
    if (mode === 'regional') {
      middleOrder = regionalOrder(
        middle.map((i) => points[i]),
        middle.map((i) => cities[i]),
      )
      middleOrder = middleOrder.map((si) => middle[si])
    } else {
      middleOrder = nearestNeighbor(
        middle.map((i) => points[i]),
        0,
      )
      middleOrder = middleOrder.map((si) => middle[si])
      middleOrder = twoOpt(middleOrder, points, mode === 'balanced' ? pathSmoothness : pathLength)
    }
    const tail = endIdx >= 0 && endIdx !== head ? [endIdx] : []
    order = [head, ...middleOrder, ...tail]
  } else if (mode === 'regional') {
    order = regionalOrder(points, cities)
  } else {
    order = nearestNeighbor(points, 0)
    order = twoOpt(order, points, mode === 'balanced' ? pathSmoothness : pathLength)
  }

  return { orderedIndexes: order, totalDistance: pathLength(order, points) }
}
