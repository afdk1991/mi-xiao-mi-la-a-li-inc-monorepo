// @shared/map 统一入口。
// 消除此前 7 处独立地图服务实现（MIXMLAAL ×3、daijia ×2、项目009 ×1、gexm 内嵌 ×1），
// 收敛为「一份配置 + 一套 MapProvider 接口 + 四个 provider 适配器」。

import type { MapProvider, MapSettings } from './types'
import { createAmapProvider } from './providers/amap'
import { createTencentProvider } from './providers/tencent'
import { createBaiduProvider } from './providers/baidu'
import { createOsmProvider } from './providers/osm'

// 类型
export * from './types'

// 配置层
export {
  DEFAULT_SETTINGS,
  EMPTY_KEYS,
  KEYLESS_HINT,
  effectiveTileService,
  getKey,
  hasCredentials,
  needsKey,
  normalizeSettings,
  serviceLabel,
  tileUrlFor,
} from './config'

// 几何 / 坐标
export {
  bd09ToGcj02,
  decodeGCJPolyline,
  fmtLatLng,
  fmtLngLat,
  gcj02ToBd09,
  gcj02ToWgs84,
  haversine,
  outOfChina,
  wgs84ToGcj02,
} from './geo'

// 请求层（供需要自定义调用的场景复用，避免各项目再写一遍 URL 拼接）
export { buildUrl, requestJson, resolveBase, toQuery, OSRM_BASE } from './request'

// provider 工厂（需精细化控制时可直接使用）
export { createAmapProvider, createTencentProvider, createBaiduProvider, createOsmProvider }

/**
 * 按配置创建对应 provider —— 上层业务的唯一入口。
 *
 * 约定：无凭证（hasCredentials 为 false）时自动降级 osm，
 * 保证底图与结果同为 WGS-84，彻底避免坐标系混用导致的偏移。
 */
export function createProvider(settings: MapSettings): MapProvider {
  switch (settings.service) {
    case 'amap':
      return createAmapProvider(settings)
    case 'tencent':
      return createTencentProvider(settings)
    case 'baidu':
      return createBaiduProvider(settings)
    default:
      return createOsmProvider(settings)
  }
}
