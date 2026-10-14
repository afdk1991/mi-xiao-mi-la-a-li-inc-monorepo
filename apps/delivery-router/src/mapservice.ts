// 地图服务抽象层：统一分派底图瓦片、地理编码、路径规划。
// 支持三种服务：
//   - amap    高德地图（坐标体系 GCJ-02 火星坐标），地理编码/路径需自备 Web 服务 Key
//   - tencent 腾讯地图（坐标体系 GCJ-02 火星坐标），地理编码/路径需自备 Web 服务 Key
//   - osm     OpenStreetMap（坐标体系 WGS-84），免 Key（地理编码 Nominatim + 路径 OSRM）
//
// 关键约束：底图瓦片与服务返回的坐标必须同坐标系，否则点位会偏移。
// 本文件保证「选 amap/tencent 时全部走 GCJ-02，选 osm 时全部走 WGS-84」，天然对齐。

export type MapService = 'amap' | 'tencent' | 'baidu' | 'osm'

/**
 * 高德通道偏好：
 * - auto 自动：优先 Web 服务（能力最全），失败自动回退 JS API
 * - web  仅 Web 服务：签名/Key 类型不符时直接失败（不回落）
 * - js   仅 JS API：完全跳过 restapi（Web Key 开启数字签名且无私钥时选此项）
 */
export type AmapPref = 'auto' | 'web' | 'js'

export interface MapSettings {
  service: MapService
  /** 高德通道偏好，默认 auto */
  amapPref: AmapPref
  /**
   * 服务端代理地址（同源路径或绝对 URL）。
   * 非空 → 所有地理编码/路径/搜索/天气等请求打到该代理，Key 与签名由服务端注入，
   *        浏览器内不存在任何凭证（推荐，也是默认值）。
   * 置空 → 回退「直连模式」：浏览器直接请求官方域名并附带下方自填 Key
   *        （Key 会出现在 DevTools / JS 包里，仅本地调试用）。
   */
  proxy: string
  /**
   * 各服务独立凭证（仅在「直连模式」下使用；代理模式下留空即可）：
   * - amap      高德「Web 端 / JS API」Key（配合 amapSecret 使用 JS API v2.0 通道）
   * - amapSecret 高德 JS API 安全密钥 securityJsCode（jscode）
   * - amapWeb   高德「Web 服务」Key（restapi 通道，能力最全）
   * - amapSig   高德 Web 服务「数字签名」私钥（Key 开启签名校验时必填）
   * - tencent   腾讯 WebServiceAPI Key
   */
  keys: {
    amap: string
    amapSecret: string
    amapWeb: string
    amapSig: string
    tencent: string
    /** 百度服务端 AK（百度坐标体系为 BD-09，接入层已做双向转换） */
    baidu: string
  }
}

/**
 * 默认设置：高德 + 服务端代理。
 *
 * ⚠️ 安全约定：本文件**不得**再硬编码任何 Key。
 * 曾经预填的三枚高德 Key 与腾讯 Key 会随 JS 包发布到线上，任何人打开 DevTools 都能扒走并盗用配额。
 * 现在一律改为「前端零凭证」：Key 放边缘函数环境变量（AMAP_WEB_KEY / AMAP_SIG / TENCENT_KEY），
 * 前端只请求本站 /api/map，由服务端注入 key 并在服务端计算数字签名。
 */
export const DEFAULT_SETTINGS: MapSettings = {
  service: 'amap',
  amapPref: 'auto',
  proxy: '/api/map',
  keys: {
    amap: '',
    amapSecret: '',
    amapWeb: '',
    amapSig: '',
    tencent: '',
    baidu: '',
  },
}

/** 空凭证集合。新增凭证字段时必须只改这一处，避免各处「清除/重置」遗漏新字段。 */
export const EMPTY_KEYS: MapSettings['keys'] = {
  amap: '',
  amapSecret: '',
  amapWeb: '',
  amapSig: '',
  tencent: '',
  baidu: '',
}

/** 取指定服务的 Key（缺省取当前 service）；osm 恒为空 */
export function getKey(s: MapSettings, service: MapService = s.service): string {
  if (service === 'osm') return ''
  return s.keys[service]?.trim() ?? ''
}

/**
 * 当前服务是否具备可用凭证。
 * - 代理模式（proxy 非空）：凭证由服务端注入，前端无需 Key，恒为 true
 * - 直连模式：高德需 Web 服务 Key 或 JS Key 任一非空；腾讯需 WebServiceAPI Key
 * - osm 恒为 false（免 Key 走公共实例）
 */
export function hasCredentials(s: MapSettings): boolean {
  if (s.service === 'osm') return false
  if ((s.proxy ?? '').trim()) return true
  if (s.service === 'amap') {
    return !!((s.keys.amap ?? '').trim() || (s.keys.amapWeb ?? '').trim())
  }
  if (s.service === 'baidu') return !!(s.keys.baidu ?? '').trim()
  return !!(s.keys.tencent ?? '').trim()
}

export interface TileSpec {
  url: string
  subdomains: string
  attribution: string
}

/** 底图瓦片规格。高德/腾讯使用免 Key 的瓦片直链（社区长期可用），osm 使用官方瓦片。 */
export function tileUrlFor(service: MapService): TileSpec {
  switch (service) {
    case 'amap':
      return {
        url:
          'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
        subdomains: '1234',
        attribution: '&copy; 高德地图 Autonavi',
      }
    case 'tencent':
      return {
        url: 'https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&style=0',
        subdomains: '0123',
        attribution: '&copy; 腾讯地图 Tencent',
      }
    case 'baidu':
      // 百度未提供免密钥 Web 瓦片，且 BD-09MC 投影与 Leaflet 标准墨卡托不兼容
      // （强行接入会整体偏移数百米）。算路/地址解析用百度数据，底图沿用 GCJ-02 瓦片。
      return {
        url:
          'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
        subdomains: '1234',
        attribution: '&copy; 百度数据 · 底图瓦片沿用高德（百度无兼容 Web 瓦片）',
      }
    default:
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: 'abc',
        attribution: '&copy; OpenStreetMap contributors',
      }
  }
}

export function serviceLabel(service: MapService): string {
  switch (service) {
    case 'amap':
      return '高德地图'
    case 'tencent':
      return '腾讯地图'
    case 'baidu':
      return '百度地图'
    default:
      return 'OpenStreetMap'
  }
}

/** 当前服务是否需要 Key 才能做地理编码/路径规划 */
export function needsKey(service: MapService): boolean {
  return service !== 'osm'
}

/**
 * 底图瓦片实际采用的服务。
 *
 * 关键：底图瓦片的坐标系必须与「地理编码 / 路线」返回的坐标系一致，否则点位会偏移。
 * - service 为 osm → 恒为 osm（WGS-84）
 * - 其余服务（amap/tencent/baidu）：只要 hasCredentials 为真（代理模式 或 直连填了 Key）
 *   就沿用所选服务的底图（GCJ-02），与同坐标系的地理编码结果对齐
 * - 否则（直连无 Key / 代理不可用）→ 退化为 osm（WGS-84），
 *   与「地理编码 / 路线 OSM 兜底」同坐标系，彻底避免"GCJ-02 底图 + WGS-84 标记"的偏移
 *
 * 注：代理模式下若部署端未注入环境变量，checkProxy 会自动把 proxy 清空回到直连，
 * 此时 hasCredentials 变 false，本函数随之回落 osm，瓦片与标记坐标系保持一致。
 */
export function effectiveTileService(s: MapSettings): MapService {
  if (s.service === 'osm') return 'osm'
  return hasCredentials(s) ? s.service : 'osm'
}

/**
 * 缺 Key 时的统一说明。
 * 原先各面板各自抛出红色告警（"POI 搜索将使用 OSM""地理编码与路线将回退 OSM，产生偏移"），
 * 既分散又惊悚。这里收敛为一条温和、可执行的说明，明确"已经自动降级到 OSM（无偏移）"以及"如何获得精准结果"。
 */
export const KEYLESS_HINT =
  '未配置地图 Key，已自动改用 OpenStreetMap 公开服务（免 Key、坐标系一致、无偏移）。如需国内精准结果与商户覆盖，请到「设置」填入高德 / 腾讯 Key，或让部署端配置服务端代理（环境变量注入）。'

/**
 * 解码高德/腾讯的 polyline 加密字符串为 [lat, lng][]。
 * 算法与 Google encoded polyline 同族（偏移 -63-1），适用于高德、腾讯返回的路径坐标。
 */
export function decodeGCJPolyline(str: string): Array<[number, number]> {
  const points: Array<[number, number]> = []
  let index = 0
  let lat = 0
  let lng = 0
  const len = str.length
  while (index < len) {
    let result = 1
    let shift = 0
    let b: number
    do {
      b = str.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1

    result = 1
    shift = 0
    do {
      b = str.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1

    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

// ---- WGS-84 ↔ GCJ-02 坐标转换（供手动输入外部 GPS 坐标时校正）----
const PI = Math.PI
const A = 6378245.0
// 偏心率平方（WGS-84）。注意：JS 双精度有效位约 17 位，
// 再多的位数会被静默截断，写成超长字面量只会触发 lint 的精度告警。
const EE = 0.006693421622965943

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}
function transformLat(x: number, y: number): number {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  r += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3
  r += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3
  return r
}
function transformLng(x: number, y: number): number {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  r += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3
  r += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3
  return r
}

/** WGS-84 → GCJ-02（用于把 GPS/Google 坐标校正到国内底图） */
export function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng]
  let dLat = transformLat(lng - 105, lat - 35)
  let dLng = transformLng(lng - 105, lat - 35)
  const radLat = (lat / 180) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return [lat + dLat, lng + dLng]
}

/** GCJ-02 → WGS-84（逆变换，迭代逼近） */
export function gcj02ToWgs84(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng]
  const [gLat, gLng] = wgs84ToGcj02(lat, lng)
  return [lat * 2 - gLat, lng * 2 - gLng]
}
