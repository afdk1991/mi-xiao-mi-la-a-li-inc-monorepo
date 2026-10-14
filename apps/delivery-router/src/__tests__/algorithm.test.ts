// 核心自研算法单元测试。
// 覆盖三类不依赖网络/浏览器的纯逻辑：TSP 路线优化、地理计算、坐标系转换。

import { describe, it, expect } from 'vitest'
import { haversine, bearing, bearingToCompass, formatDistance, formatDuration, estimateDuration } from '../geo'
import { gcj02ToBd09, bd09ToGcj02 } from '../bd09'
import { computeOrder } from '../optimize'
import type { Customer, Depot } from '../types'

// ---- 构造工具 ----

function mkCustomer(i: number, lat: number, lng: number): Customer {
  return {
    id: `c${i}`,
    name: `客户${i}`,
    address: `地址${i}`,
    lat,
    lng,
    geocoded: true,
    visited: false,
    createdAt: 0,
  }
}

const depot: Depot = { name: '仓库', address: '起点', lat: 0, lng: 0 }

/** 按给定顺序计算开放路径总里程（起点 → 各点依次） */
function pathLength(customers: Customer[], order: number[], d: Depot): number {
  let total = 0
  let prev: [number, number] = [d.lat, d.lng]
  for (const i of order) {
    const c = customers[i]
    total += haversine(prev[0], prev[1], c.lat, c.lng)
    prev = [c.lat, c.lng]
  }
  return total
}

// ---- 1. 地理计算 ----

describe('geo：地理计算', () => {
  it('haversine：同点距离为 0', () => {
    expect(haversine(39.9, 116.4, 39.9, 116.4)).toBe(0)
  })

  it('haversine：1 度纬度约 111.2 公里（误差 < 200m）', () => {
    const d = haversine(0, 0, 1, 0)
    expect(d).toBeGreaterThan(111000)
    expect(d).toBeLessThan(111400)
  })

  it('haversine：北京→上海 约 1067 公里（误差 < 2%）', () => {
    const d = haversine(39.9042, 116.4074, 31.2304, 121.4737) / 1000
    expect(d).toBeGreaterThan(1045)
    expect(d).toBeLessThan(1090)
  })

  it('bearing：正北为 0°，正东为 90°', () => {
    expect(bearing(0, 0, 1, 0)).toBeCloseTo(0, 5)
    expect(bearing(0, 0, 0, 1)).toBeCloseTo(90, 5)
  })

  it('bearingToCompass：八方位映射正确', () => {
    expect(bearingToCompass(0)).toBe('正北')
    expect(bearingToCompass(90)).toBe('正东')
    expect(bearingToCompass(180)).toBe('正南')
    expect(bearingToCompass(270)).toBe('正西')
    expect(bearingToCompass(45)).toBe('东北')
  })

  it('formatDistance：米/公里切换正确', () => {
    expect(formatDistance(500)).toBe('500 米')
    expect(formatDistance(1500)).toBe('1.50 公里')
  })

  it('formatDuration：分钟/小时切换正确', () => {
    expect(formatDuration(60)).toBe('1 分钟')
    expect(formatDuration(3600)).toBe('1 小时')
    expect(formatDuration(3660)).toBe('1 小时 1 分')
  })

  it('estimateDuration：按车速换算正确', () => {
    // 1000 米 @ 36km/h = 100 秒
    expect(estimateDuration(1000, 36)).toBeCloseTo(100, 6)
  })
})

// ---- 2. 坐标系转换 ----

describe('bd09：GCJ-02 与 BD-09 互转', () => {
  const samples: Array<[number, number]> = [
    [39.9042, 116.4074], // 北京
    [31.2304, 121.4737], // 上海
    [22.5431, 114.0579], // 深圳
  ]

  it('往返转换可还原原坐标（误差 < 1 米）', () => {
    // 换算成米来断言更贴合物理意义：转换公式存在三角函数截断，
    // 往返后残留约 1e-7 度（厘米级）属正常，要求"完全相等"不现实。
    for (const [lat, lng] of samples) {
      const [bLat, bLng] = gcj02ToBd09(lat, lng)
      const [gLat, gLng] = bd09ToGcj02(bLat, bLng)
      const errMeters = Math.hypot(gLat - lat, gLng - lng) * 111000
      expect(errMeters).toBeLessThan(1)
    }
  })

  it('BD-09 相对 GCJ-02 有固定偏移（不是恒等变换）', () => {
    const [lat, lng] = samples[0]
    const [bLat, bLng] = gcj02ToBd09(lat, lng)
    const shift = Math.hypot(bLat - lat, bLng - lng)
    // 百度偏移通常在数百米量级（约 0.001~0.01 度）
    expect(shift).toBeGreaterThan(0.0005)
    expect(shift).toBeLessThan(0.05)
  })
})

// ---- 3. TSP 路线优化 ----

describe('optimize：路线优化', () => {
  it('空列表返回空顺序', () => {
    expect(computeOrder([], depot, 'route')).toEqual([])
  })

  it('单个客户返回 [0]', () => {
    expect(computeOrder([mkCustomer(0, 1, 1)], depot, 'route')).toEqual([0])
  })

  it('distance 模式：按到起点距离升序', () => {
    // 故意打乱输入顺序：5 / 1 / 3
    const cs = [mkCustomer(0, 0, 5), mkCustomer(1, 0, 1), mkCustomer(2, 0, 3)]
    expect(computeOrder(cs, depot, 'distance')).toEqual([1, 2, 0])
  })

  it('route 模式：返回合法排列（不重不漏）', () => {
    const cs = [mkCustomer(0, 0, 5), mkCustomer(1, 0, 1), mkCustomer(2, 0, 3), mkCustomer(3, 2, 2)]
    const order = computeOrder(cs, depot, 'route')
    expect(order).toHaveLength(4)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
  })

  it('route 模式：优化里程应优于原始输入顺序', () => {
    // 同一条直线上打乱的点：输入顺序会来回折返
    const cs = [mkCustomer(0, 0, 5), mkCustomer(1, 0, 1), mkCustomer(2, 0, 3)]
    const naive = pathLength(cs, [0, 1, 2], depot)
    const order = computeOrder(cs, depot, 'route')
    const optimized = pathLength(cs, order, depot)
    expect(optimized).toBeLessThanOrEqual(naive)
    // 最优解应为 5（0→1→3→5），不应退化为折返的 11
    expect(optimized).toBeLessThan(naive)
  })

  it('route 模式：接受外部道路网矩阵且不改变排列合法性', () => {
    // 4 个点（含起点 index 0）构造一个非对称但确定的矩阵
    const cs = [mkCustomer(0, 0, 5), mkCustomer(1, 0, 1), mkCustomer(2, 0, 3)]
    const matrix = [
      [0, 5, 1, 3],
      [5, 0, 4, 2],
      [1, 4, 0, 2],
      [3, 2, 2, 0],
    ]
    const order = computeOrder(cs, depot, 'route', matrix)
    expect(order).toHaveLength(3)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2])
  })
})

describe('computeOrder 健壮性', () => {
  it('未定位（0,0）地址不参与排序，路线不会被拽到几内亚湾', () => {
    const cs = [
      mkCustomer(0, 39.9, 116.4),
      mkCustomer(1, 0, 0), // 未定位
      mkCustomer(2, 39.91, 116.41),
    ]
    const order = computeOrder(cs, depot, 'route')
    expect(order).not.toContain(1)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 2])
  })

  it('全部未定位时返回空顺序，而不是硬算一条飞线', () => {
    const cs = [mkCustomer(0, 0, 0), mkCustomer(1, 0, 0)]
    expect(computeOrder(cs, depot, 'route')).toEqual([])
    expect(computeOrder(cs, depot, 'distance')).toEqual([])
  })

  it('distance 模式同样排除未定位点', () => {
    const cs = [mkCustomer(0, 0, 0), mkCustomer(1, 0, 5)]
    expect(computeOrder(cs, depot, 'distance')).toEqual([1])
  })

  it('矩阵含不可达（Infinity/NaN）时仍覆盖全部站点，绝不丢单', () => {
    // 最近邻在 `d < bestD` 恒 false 时会提前 break，历史上会静默少掉后半段客户
    const cs = [mkCustomer(0, 0, 1), mkCustomer(1, 0, 2), mkCustomer(2, 0, 3), mkCustomer(3, 0, 4)]
    // 矩阵维度 = 起点 + 4 个客户 = 5×5；非对角元素交替 NaN / Infinity，制造「全部不可达」
    const bad = [NaN, Infinity]
    const matrix = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => (i === j ? 0 : bad[(i + j) % 2])),
    )
    const order = computeOrder(cs, depot, 'route', matrix)
    expect(order).toHaveLength(4)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
  })
})
