// 高德 JS API 加载器（v2.0）。
// 用途：当「Web 服务 Key」不可用（未关闭数字签名 / 无签名私钥）时，高德分支回退到
// JS API 通道（AMap.Geocoder / AMap.Driving / AMap.AutoComplete / AMap.PlaceSearch / AMap.Weather）。
//
// v2.0 必须通过 window._AMapSecurityConfig.securityJsCode 预置安全密钥（jscode），
// 且必须在加载 maps 脚本之前设置；否则服务调用会返回 INVALID_USER_SCODE。
// 已一次性加载常用插件，避免多处重复发起脚本请求。

type AMapNS = any

const cache = new Map<string, Promise<AMapNS>>()

const PLUGINS = [
  'AMap.Geocoder',
  'AMap.Driving',
  'AMap.AutoComplete',
  'AMap.PlaceSearch',
  'AMap.Weather',
].join(',')

/**
 * 加载高德 JS API v2.0，返回 window.AMap。同一 key 仅加载一次。
 * securityJsCode 为空时仍可加载，但部分服务可能返回 INVALID_USER_SCODE。
 * 失败原因多为：Key 类型不符（Web 服务 Key 不能用于 JS API）、域名白名单未含本站、服务未开通。
 */
export function loadAMap(key: string, securityJsCode?: string): Promise<AMapNS> {
  const w = window as unknown as { AMap?: AMapNS; _AMapSecurityConfig?: { securityJsCode: string } }
  if (w.AMap) return Promise.resolve(w.AMap)
  const cacheKey = `${key}|${securityJsCode ?? ''}`
  const existing = cache.get(cacheKey)
  if (existing) return existing

  const p = new Promise<AMapNS>((resolve, reject) => {
    if (securityJsCode) w._AMapSecurityConfig = { securityJsCode }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=${PLUGINS}`
    script.async = true
    script.onload = () => {
      if (w.AMap) resolve(w.AMap)
      else reject(new Error('AMap 对象未就绪'))
    }
    script.onerror = () =>
      reject(new Error('AMap 脚本加载失败（检查网络 / Key 类型 / 域名白名单是否含本站）'))
    document.head.appendChild(script)
  })
  cache.set(cacheKey, p)
  return p
}
