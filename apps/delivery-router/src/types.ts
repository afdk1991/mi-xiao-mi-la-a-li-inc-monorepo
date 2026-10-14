// 核心数据模型

/** 客户地址记录 */
export interface Customer {
  id: string
  name: string
  phone?: string
  address: string
  lat: number
  lng: number
  note?: string
  /** 坐标是否来自地理编码（true）还是手工/导入自带（false） */
  geocoded: boolean
  /** 优化后的配送顺序，从 1 开始；未优化为 undefined */
  order?: number
  /** 是否已送达 */
  visited: boolean
  createdAt: number
}

/** 配送起点（仓库/门店） */
export interface Depot {
  name: string
  address: string
  lat: number
  lng: number
}

/** 优化模式 */
export type OptimizeMode =
  | 'route' // 路线最优（TSP：最近邻 + 2-opt）
  | 'distance' // 按到起点直线距离升序

/** 单个导航步骤 */
export interface NavStep {
  instruction: string
  distance: number // 米
  duration: number // 秒
  /** 步骤几何点 [lat, lng][]，用于地图高亮 */
  geometry?: Array<[number, number]>
}

/** 一段配送路段（相邻两个站点之间） */
export interface RouteSegment {
  fromIndex: number // 在优化序列中的序号（含起点）
  toIndex: number
  fromName: string
  toName: string
  distance: number // 米
  duration: number // 秒
  steps: NavStep[]
  geometry: Array<[number, number]> // 整段路线几何
}

/** 优化结果 */
export interface OptimizeResult {
  mode: OptimizeMode
  /** 有序站点（不含起点），每项指向 customers 数组下标 */
  order: number[]
  totalDistance: number // 米
  totalDuration: number // 秒
  segments: RouteSegment[]
}
