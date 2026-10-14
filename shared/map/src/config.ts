// 地图配置层：默认设置、凭证判定、瓦片规格、坐标系一致性判定。
// 整合自 apps/项目009商品采集/src/mapservice.ts（该实现已在 EdgeOne Pages 生产验证）。

import type { AmapPref, MapService, MapSettings, TileSpec } from './types'

/**
 * 默认设置：高德 + 服务端代理。
 *
 * 安全约定：本文件不得硬编码任何 Key。Key 统一放边缘函数环境变量
 * （AMAP_WEB_KEY / AMAP_SIG / TENCENT_KEY），前端只请求本站 /api/map。
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

/** 空凭证集合。新增凭证字段时只改这一处，避免各处「清除/重置」遗漏新字段。 */
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
 * - 代理模式（proxy 非空）：凭证由服务端注入，恒为 true
 * - 直连模式：高德需 Web 服务 Key 或 JS Key 任一非空；腾讯需 WebServiceAPI Key
 * - osm 恒为 false（免 Key 走公共实例）
 */
export function hasCredentials(s: MapSettings): boolean {
  if (s.service === 'osm') return false
  if ((s.proxy ?? '').trim()) return true
  if (s.service === 'amap') {
    return Boolean((s.keys.amap ?? '').trim() || (s.keys.amapWeb ?? '').trim())
  }
  if (s.service === 'baidu') return Boolean((s.keys.baidu ?? '').trim())
  return Boolean((s.keys.tencent ?? '').trim())
}

/** 底图瓦片规格。高德/腾讯使用免 Key 瓦片直链，osm 使用官方瓦片。 */
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
      // 百度无免密钥 Web 瓦片，且 BD-09MC 投影与标准墨卡托不兼容（强行接入偏移数百米），
      // 故算路/地址解析用百度数据，底图沿用 GCJ-02 瓦片。
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
 * 关键：底图瓦片坐标系必须与「地理编码 / 路线」返回坐标系一致，否则点位偏移。
 * - osm → 恒 osm（WGS-84）
 * - amap/tencent/baidu 且有凭证 → 沿用所选服务底图（GCJ-02）
 * - 否则 → 退化为 osm（WGS-84），与 OSM 兜底同坐标系，避免「GCJ-02 底图 + WGS-84 标记」偏移
 */
export function effectiveTileService(s: MapSettings): MapService {
  if (s.service === 'osm') return 'osm'
  return hasCredentials(s) ? s.service : 'osm'
}

/** 缺 Key 时的统一说明（收敛各面板分散的红色告警） */
export const KEYLESS_HINT =
  '未配置地图 Key，已自动改用 OpenStreetMap 公开服务（免 Key、坐标系一致、无偏移）。' +
  '如需国内精准结果与商户覆盖，请到「设置」填入高德 / 腾讯 Key，或让部署端配置服务端代理（环境变量注入）。'

/** 合并用户设置与默认设置（浅合并 keys，缺失字段回落到空串） */
export function normalizeSettings(partial?: Partial<MapSettings>): MapSettings {
  const base = DEFAULT_SETTINGS
  if (!partial) return { ...base, keys: { ...EMPTY_KEYS } }
  return {
    service: partial.service ?? base.service,
    amapPref: (partial.amapPref ?? base.amapPref) as AmapPref,
    proxy: partial.proxy ?? base.proxy,
    keys: { ...EMPTY_KEYS, ...(partial.keys ?? {}) },
  }
}
