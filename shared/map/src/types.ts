// 统一地图服务类型定义。
// 整合自 apps/项目009商品采集/src/mapservice.ts + types.ts，并补齐跨项目所需的 provider 能力类型。

/** 支持的地图服务。坐标系约定：amap/tencent 为 GCJ-02，baidu 数据为 BD-09（接入层转换），osm 为 WGS-84。 */
export type MapService = 'amap' | 'tencent' | 'baidu' | 'osm'

/**
 * 高德通道偏好：
 * - auto 自动：优先 Web 服务，失败回退 JS API
 * - web  仅 Web 服务
 * - js   仅 JS API
 */
export type AmapPref = 'auto' | 'web' | 'js'

/** 地图服务配置。凭证一律运行时注入，源码不得硬编码。 */
export interface MapSettings {
  service: MapService
  amapPref: AmapPref
  /**
   * 服务端代理地址（同源路径或绝对 URL）。
   * 非空 → 所有请求打到该代理，Key 与签名由服务端注入（推荐）。
   * 置空 → 直连模式，浏览器直连官方域名并附带下方自填 Key（仅本地调试）。
   */
  proxy: string
  keys: {
    /** 高德 Web 端 / JS API Key */
    amap: string
    /** 高德 JS API 安全密钥 securityJsCode */
    amapSecret: string
    /** 高德 Web 服务 Key（restapi 通道） */
    amapWeb: string
    /** 高德 Web 服务数字签名私钥 */
    amapSig: string
    /** 腾讯 WebServiceAPI Key */
    tencent: string
    /** 百度服务端 AK */
    baidu: string
  }
}

/** 底图瓦片规格 */
export interface TileSpec {
  url: string
  subdomains: string
  attribution: string
}

/** 经纬度点 */
export interface GeoPoint {
  lat: number
  lng: number
}

/** POI 搜索结果项 */
export interface PoiItem {
  id: string
  name: string
  address: string
  location: GeoPoint
  /** 距搜索中心距离（米），POI 搜索场景可用 */
  distance?: number
  /** 所属服务，便于上层区分来源 */
  provider: MapService
}

/** 单个导航步骤 */
export interface RouteStep {
  instruction: string
  distance: number
  duration: number
  geometry?: Array<[number, number]>
}

/** 路径规划结果（两点间） */
export interface RouteResult {
  distance: number
  duration: number
  steps: RouteStep[]
  geometry: Array<[number, number]>
  provider: MapService
}

/** 距离矩阵单元格 */
export interface MatrixCell {
  distance: number
  duration: number
  /** 无法到达时为 false */
  ok: boolean
}

/** 距离矩阵结果：rows[起点下标][终点下标] */
export interface DistanceMatrixResult {
  rows: MatrixCell[][]
  provider: MapService
}

/** 路线偏好 */
export interface RouteOptions {
  /** 货车模式（腾讯/高德货车路线） */
  truck?: boolean
  /** 排序策略：距离最短 / 时间最短 */
  strategy?: 'distance' | 'duration'
}

/**
 * 地图能力统一接口。所有 provider（amap/tencent/baidu/osm）必须实现，
 * 上层业务只依赖本接口，不再关心具体服务商差异 —— 这是「统一接口规范」的核心。
 */
export interface MapProvider {
  readonly service: MapService
  /** 地理编码：地址 → 坐标 */
  geocode(address: string): Promise<GeoPoint | null>
  /** 逆地理编码：坐标 → 地址 */
  reverseGeocode(point: GeoPoint): Promise<string | null>
  /** POI / 关键字搜索 */
  searchPoi(keyword: string, center?: GeoPoint): Promise<PoiItem[]>
  /** 路径规划 */
  route(from: GeoPoint, to: GeoPoint, options?: RouteOptions): Promise<RouteResult | null>
  /** 距离矩阵（多点配送排序用） */
  distanceMatrix(
    origins: GeoPoint[],
    destinations: GeoPoint[],
    options?: RouteOptions
  ): Promise<DistanceMatrixResult | null>
}
