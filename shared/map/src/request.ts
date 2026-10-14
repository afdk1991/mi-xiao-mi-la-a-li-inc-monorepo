// 地图 HTTP 请求层：统一「服务端代理优先、直连兜底」的端点解析与 JSON 请求。
// 各 provider 只负责拼参数与解析响应，不再各自实现 URL 拼接与错误处理 —— 消除重复。

import type { MapService, MapSettings } from './types'
import { getKey } from './config'

/** 各服务官方 REST 基址（直连模式使用） */
const OFFICIAL_BASE: Record<MapService, string> = {
  amap: 'https://restapi.amap.com/v3',
  tencent: 'https://apis.map.qq.com/ws',
  baidu: 'https://api.map.baidu.com',
  osm: 'https://nominatim.openstreetmap.org',
}

/** OSRM 路线服务基址（osm provider 专用，与地理编码基址不同） */
export const OSRM_BASE = 'https://router.project-osrm.org'

export type QueryParams = Record<string, string | number | boolean | undefined>

/** 解析请求基址：代理模式返回代理地址，直连模式返回官方基址 */
export function resolveBase(settings: MapSettings, service: MapService): string {
  const proxy = (settings.proxy ?? '').trim()
  if (proxy) return proxy
  return service === 'osm' ? OFFICIAL_BASE.osm : OFFICIAL_BASE[service]
}

/** 序列化查询参数（跳过 undefined / 空串） */
export function toQuery(params: QueryParams): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue
    usp.append(k, String(v))
  }
  return usp.toString()
}

/**
 * 构造完整请求 URL。
 * - 代理模式：把 service / path 作为元参数交给服务端，由服务端注入 Key 与签名（推荐，前端零凭证）
 * - 直连模式：官方基址 + path，并附带本地 Key（仅调试）
 */
export function buildUrl(
  settings: MapSettings,
  service: MapService,
  path: string,
  params: QueryParams = {}
): string {
  const base = resolveBase(settings, service)
  const qs = toQuery(params)
  const proxy = Boolean((settings.proxy ?? '').trim())

  if (proxy) {
    const meta: QueryParams = { service, path, ...params }
    const s = toQuery(meta)
    return s ? `${base}?${s}` : base
  }

  const key = getKey(settings, service)
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const parts = [qs]
  if (key) {
    // 百度 REST 用 ak 参数名，其余服务用 key
    const keyParam = service === 'baidu' ? 'ak' : 'key'
    parts.push(`${keyParam}=${encodeURIComponent(key)}`)
  }
  const finalQs = parts.filter(Boolean).join('&')
  return finalQs ? `${url}?${finalQs}` : url
}

/** 带超时的 JSON GET 请求；失败统一返回 null 并告警，不向上抛异常。 */
export async function requestJson<T>(
  settings: MapSettings,
  service: MapService,
  path: string,
  params: QueryParams = {},
  timeoutMs = 10000
): Promise<T | null> {
  const url = buildUrl(settings, service, path, params)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      console.warn(`[shared/map] ${service} 请求失败 HTTP ${res.status}: ${path}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[shared/map] ${service} 请求异常: ${path} -> ${msg}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}
