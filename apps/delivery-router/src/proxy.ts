// 统一「服务端代理」层：让前端彻底不持有任何地图 Key。
//
// 背景：纯前端 SPA 里写死或让用户填 Key，最终都会出现在浏览器 JS 包 / DevTools 中，
// 任何人都能扒走并盗用配额。正确做法是把 Key 放到服务端（边缘函数环境变量），
// 前端只请求本站的 /api/map?p=<端点>&<业务参数>，由服务端注入 key 并计算签名。
//
// 两种模式：
//   1) 代理模式（settings.proxy 非空，默认 '/api/map'）
//      请求打到本站代理，key / sig 一律不出现在前端，服务端注入。
//   2) 直连模式（proxy 为空）
//      沿用旧行为：浏览器直接请求官方域名并附带用户自填的 key（会暴露，仅本地调试用）。
//
// 数字签名（sig）必须在服务端算：高德签名私钥一旦落到前端就失去意义，
// 且纯前端无解（这也是之前 10007 报错的根因）。

import { md5 } from './md5'
import type { MapSettings } from './mapservice'

/** 本站边缘函数代理地址（同源，避免跨域与 Key 暴露） */
export const DEFAULT_PROXY = '/api/map'

export function proxyOf(s: MapSettings): string {
  return (s.proxy ?? '').trim()
}

/** 是否走服务端代理（Key 由服务端注入） */
export function usingProxy(s: MapSettings): boolean {
  return !!proxyOf(s)
}

/** 官方 URL → 代理 path，例如 https://restapi.amap.com/v3/geocode/geo → amap/v3/geocode/geo */
function pathOf(base: string): string {
  const raw = base.replace(/^https?:\/\//, '')
  const i = raw.indexOf('/')
  const host = i < 0 ? raw : raw.slice(0, i)
  const path = i < 0 ? '' : raw.slice(i + 1)
  if (host.startsWith('restapi.amap.com')) return `amap/${path}`
  if (host.startsWith('apis.map.qq.com')) return `tencent/${path}`
  if (host.startsWith('api.map.baidu.com')) return `baidu/${path}`
  return path
}

/** 代理参数透传：剥离 key / sig（服务端注入），并剔除代理自有参数 p */
function proxyQuery(base: string, params: Record<string, string>): string {
  const qs = new URLSearchParams()
  for (const k of Object.keys(params)) {
    if (k === 'key' || k === 'sig' || k === 'p') continue
    qs.set(k, params[k])
  }
  qs.set('p', pathOf(base))
  return qs.toString()
}

function directQuery(params: Record<string, string>): string {
  const names = Object.keys(params).sort()
  const qs = new URLSearchParams()
  for (const n of names) qs.set(n, params[n])
  return qs.toString()
}

/**
 * 高德 Web 服务 URL 构造。
 * - 代理模式：`<proxy>?p=amap/v3/...&业务参数`（不含 key/sig）
 * - 直连模式：官方 URL + key（+ 私钥非空时自动计算 sig）
 */
export function amapUrl(base: string, params: Record<string, string>, s: MapSettings): string {
  const proxy = proxyOf(s)
  if (proxy) return `${proxy}?${proxyQuery(base, params)}`

  const full: Record<string, string> = { ...params }
  const key = (s.keys.amapWeb ?? '').trim()
  if (key) full.key = key
  const qs = directQuery(full)
  const secret = (s.keys.amapSig ?? '').trim()
  if (secret) {
    // sig = MD5(参数按名升序拼接 + 私钥)，sign 本身不参与拼接
    const raw = Object.keys(full)
      .sort()
      .map((k) => `${k}=${full[k]}`)
      .join('&')
    return `${base}?${qs}&sig=${md5(raw + secret)}`
  }
  return `${base}?${qs}`
}

/**
 * 腾讯 WebService URL 构造。
 * - 代理模式：`<proxy>?p=tencent/ws/...&业务参数`（不含 key）
 * - 直连模式：官方 URL + key
 */
export function qqUrl(base: string, params: Record<string, string>, s: MapSettings): string {
  const proxy = proxyOf(s)
  if (proxy) return `${proxy}?${proxyQuery(base, params)}`

  const full: Record<string, string> = { ...params }
  const key = (s.keys.tencent ?? '').trim()
  if (key) full.key = key
  return `${base}?${directQuery(full)}`
}

export interface ProxyProbe {
  ok: boolean
  /** 代理路由是否可达（函数是否已部署）。不可达才应回落直连/OSM；可达但报错多为「没配 Key」 */
  reachable: boolean
  /** 代理自身返回的业务错误码（如 40002 = 函数已部署但服务端未注入 Key） */
  code?: number
  msg: string
}

/**
 * 探测服务端代理是否真的可用。
 *
 * 两类不可用场景必须被识别出来：
 *   1) 边缘函数没被部署（如只上传了静态资源）：/api/map 会命中 SPA 回退，
 *      返回 HTTP 200 + index.html —— 此时若不识别，每个地理编码都要先吃一次
 *      「HTML → res.json() 抛错 → 再兜底 OSM」的失败往返。
 *   2) 服务端没注入 Key：返回代理自身的 errcode（40001/40002）。
 * 两者的正确处置都是立刻改走直连/OSM，而不是每次都试一遍。
 */
export async function probeProxy(s: MapSettings, signal?: AbortSignal): Promise<ProxyProbe> {
  const proxy = proxyOf(s)
  if (!proxy) return { ok: true, reachable: true, msg: '直连模式：浏览器直接请求官方域名' }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  try {
    const probe = '北京市天安门'
    const url =
      s.service === 'amap'
        ? amapUrl('https://restapi.amap.com/v3/geocode/geo', { address: probe }, s)
        : qqUrl('https://apis.map.qq.com/ws/geocoder/v1/', { address: probe }, s)
    const res = await fetch(url, { signal: signal ?? ctrl.signal })
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('json')) {
      // 返回的是 SPA 回退 HTML → 边缘函数根本没部署，代理不可用，应回落直连/OSM
      return {
        ok: false,
        reachable: false,
        msg: `代理 ${proxy} 未生效：返回的不是 JSON（多为边缘函数未部署，请求被静态回退吃掉）`,
      }
    }
    const j = (await res.json()) as { errcode?: number; errmsg?: string }
    if (j.errcode) {
      // 函数已部署并正常响应（JSON + errcode），只是服务端没注入 Key 等业务错误。
      // 这种情况路由是活的，应保持代理待命，引导用户去配环境变量或改用直连填 Key，
      // 而不是误判「代理不可用」把 proxy 清空回落 OSM（那样会掩盖真实问题）。
      return {
        ok: false,
        reachable: true,
        code: j.errcode,
        msg: `代理已部署但报错 ${j.errcode}：${j.errmsg ?? ''}（多为服务端未配置 Key 环境变量，请在 EdgeOne 设置 AMAP_WEB_KEY/TENCENT_KEY 等，或改用「直连」在设置里填 Key）`,
      }
    }
    return { ok: true, reachable: true, msg: '代理可用，Key 与签名均在服务端' }
  } catch (e) {
    return { ok: false, reachable: false, msg: '代理请求异常：' + (e instanceof Error ? e.message : String(e)) }
  } finally {
    clearTimeout(timer)
  }
}

/** 腾讯 URLSearchParams 版（routing.ts 里已用 URLSearchParams 拼参的场景） */
export function qqUrlSp(base: string, sp: URLSearchParams, s: MapSettings): string {
  const params: Record<string, string> = {}
  sp.forEach((v, k) => {
    if (k === 'key' || k === 'sig' || k === 'p') return
    params[k] = v
  })
  return qqUrl(base, params, s)
}
