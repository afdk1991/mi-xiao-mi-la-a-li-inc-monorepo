// 地图开放平台「统一服务端代理」（EdgeOne Makers Edge Function / V8 运行时）。
//
// 目的：让前端彻底不持有任何地图 Key。
//   - Key 只存在于服务端环境变量，浏览器拿不到；
//   - 高德「数字签名」私钥（AMAP_SIG）也留在服务端并在此计算 sig —— 纯前端做不到，
//     这也是之前前端直连报 INVALID_USER_SIGNATURE(10007) 的根因。
//
// 契约：GET|POST /api/map?p=<前缀>/<官方路径>&<业务参数...>
//   例：/api/map?p=amap/v3/geocode/geo&address=北京市天安门
//       /api/map?p=tencent/ws/geocoder/v1&address=北京市天安门
//   key / sig 由服务端注入；客户端传入的 key / sig 一律丢弃（防代理被当跳板）。
//
// 环境变量（edgeone makers env set <NAME> <VALUE> -e production）：
//   AMAP_WEB_KEY  高德「Web 服务」Key（必填，否则高德接口 40002）
//   AMAP_SIG      高德数字签名私钥（该 Key 在控制台开启签名校验时必填）
//   TENCENT_KEY   腾讯 WebServiceAPI Key（使用腾讯服务时必填）
//   BAIDU_AK      百度服务端 AK（使用百度服务时必填；百度凭证参数名为 ak）
//   ALLOW_CLIENT_KEY  置 '1' 才允许客户端自带 key（默认关闭，仅本地调试）
//
// ⚠️ 约束：V8 运行时，禁用 Node 内置模块、require、npm 包；Response.json() 不可用。

const AMAP_UPSTREAM = 'https://restapi.amap.com'
const TENCENT_UPSTREAM = 'https://apis.map.qq.com'
const BAIDU_UPSTREAM = 'https://api.map.baidu.com'

// 白名单：只允许业务真正用到的端点，避免沦为任意地址的开放代理
const AMAP_ALLOWED = new Set([
  'v3/geocode/geo',
  'v3/geocode/regeo',
  'v3/direction/driving',
  'v3/direction/walking',
  'v3/direction/transit',
  'v3/distance',
  'v3/assistant/inputtips',
  'v3/place/text',
  'v3/place/around',
  'v3/place/detail',
  'v3/weather/weatherInfo',
  'v3/ip',
  'v3/assistant/coordinate/convert',
  'v4/grasproad/driving',
])

const TENCENT_ALLOWED = new Set([
  'ws/geocoder/v1',
  'ws/location/v1/ip',
  'ws/coord/v1/translate',
  'ws/place/v1/search',
  'ws/place/v1/suggestion',
  'ws/direction/v1/driving',
  'ws/direction/v1/walking',
  'ws/direction/v1/bicycling',
  'ws/direction/v1/transit',
  'ws/direction/v1/trucking',
  'ws/distance/v1/matrix',
  'ws/distance/v1/isochrone',
  'ws/weather/v1',
])

// 百度凭证参数名是 ak（不是 key），返回坐标系自行处理（前端已做 BD-09↔GCJ-02 转换）
const BAIDU_ALLOWED = new Set([
  'geocoding/v3',
  'reverse_geocoding/v3',
  'directionlite/v1/driving',
  'directionlite/v1/riding',
  'directionlite/v1/walking',
])

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}

// ---- MD5（V8 运行时无 crypto MD5，高德签名必须 MD5，故自带最小实现）----

function md5Hex(input) {
  const msg = []
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i)
    if (c < 0x80) {
      msg.push(c)
    } else if (c < 0x800) {
      msg.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c < 0xd800 || c >= 0xe000) {
      msg.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    } else {
      i++
      const c2 = input.charCodeAt(i)
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff))
      msg.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    }
  }

  const bitLen = msg.length * 8
  msg.push(0x80)
  while (msg.length % 64 !== 56) msg.push(0)
  const low = bitLen >>> 0
  const high = Math.floor(bitLen / 0x100000000) >>> 0
  for (let i = 0; i < 4; i++) msg.push((low >>> (i * 8)) & 0xff)
  for (let i = 0; i < 4; i++) msg.push((high >>> (i * 8)) & 0xff)

  const SHIFT = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
    20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
    10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ]
  const K = new Array(64)
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let off = 0; off < msg.length; off += 64) {
    const M = new Array(16)
    for (let j = 0; j < 16; j++) {
      const i0 = off + j * 4
      M[j] = msg[i0] | (msg[i0 + 1] << 8) | (msg[i0 + 2] << 16) | (msg[i0 + 3] << 24)
    }
    let A = a0
    let B = b0
    let C = c0
    let D = d0
    for (let i = 0; i < 64; i++) {
      let f
      let g
      if (i < 16) {
        f = (B & C) | (~B & D)
        g = i
      } else if (i < 32) {
        f = (D & B) | (~D & C)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = B ^ C ^ D
        g = (3 * i + 5) % 16
      } else {
        f = C ^ (B | ~D)
        g = (7 * i) % 16
      }
      const tmp = (f + A + K[i] + M[g]) >>> 0
      A = D
      D = C
      C = B
      B = (B + ((tmp << SHIFT[i]) | (tmp >>> (32 - SHIFT[i])))) >>> 0
    }
    a0 = (a0 + A) >>> 0
    b0 = (b0 + B) >>> 0
    c0 = (c0 + C) >>> 0
    d0 = (d0 + D) >>> 0
  }

  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0')
  return hex(a0) + hex(b0) + hex(c0) + hex(d0)
}

/** 高德签名：sig = MD5(除 sig 外全部参数按名升序 "k=v" 拼接 + 私钥) */
function amapSig(params, secret) {
  const names = Object.keys(params).sort()
  const raw = names.map((k) => `${k}=${params[k]}`).join('&')
  return md5Hex(raw + secret)
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ errcode: 40500, errmsg: 'method not allowed' }, 405)
  }

  const url = new URL(request.url)

  // 请求体只能读一次：读完后 request.clone() 会抛 TypeError（历史写法把它 catch 掉，
  // 结果是 body 静默变空）。且必须按 Content-Type 区分表单与 JSON —— JSON body
  // （高德 v4/grasproad 就是 JSON）若被当表单解析，既会往上流注入垃圾 query 参数，
  // 又会丢掉真实 body，导致轨迹纠偏必失败。
  let rawBody = ''
  if (request.method === 'POST') {
    try {
      rawBody = await request.text()
    } catch {
      rawBody = ''
    }
  }
  const contentType = request.headers.get('content-type') || ''
  const form =
    request.method === 'POST' && contentType.includes('application/x-www-form-urlencoded')
      ? new URLSearchParams(rawBody)
      : null

  // p 优先取 query（前端约定），其次取表单兜底
  const p = String(url.searchParams.get('p') || (form ? form.get('p') : '') || '')
    .replace(/^\/+|\/+$/g, '')

  if (!p) return json({ errcode: 40001, errmsg: 'missing param: p' }, 400)

  const isAmap = p.startsWith('amap/')
  const isTencent = p.startsWith('tencent/')
  const isBaidu = p.startsWith('baidu/')
  if (!isAmap && !isTencent && !isBaidu) {
    return json({ errcode: 40001, errmsg: `path not allowed: ${p}` }, 400)
  }

  const sub = p.slice(p.indexOf('/') + 1).replace(/\/+$/g, '')
  const allowed = isAmap ? AMAP_ALLOWED : isTencent ? TENCENT_ALLOWED : BAIDU_ALLOWED
  if (!allowed.has(sub)) {
    return json({ errcode: 40001, errmsg: `path not allowed: ${p}` }, 400)
  }

  const upstreamBase = isAmap ? AMAP_UPSTREAM : isTencent ? TENCENT_UPSTREAM : BAIDU_UPSTREAM
  const upstream = new URL(`${upstreamBase}/${sub}`)

  // 透传业务参数；凭证参数（key / sig / ak）与 p 一律不透传（服务端注入）
  const params = {}
  url.searchParams.forEach((v, k) => {
    if (k === 'p' || k === 'key' || k === 'sig' || k === 'ak') return
    params[k] = v
  })
  if (form) {
    form.forEach((v, k) => {
      if (k === 'p' || k === 'key' || k === 'sig' || k === 'ak') return
      params[k] = v
    })
  }
  for (const k of Object.keys(params)) upstream.searchParams.set(k, params[k])

  // Key：服务端环境变量优先；仅当显式开启 ALLOW_CLIENT_KEY 时才接受客户端传入
  const serverKey = isAmap
    ? (env && (env.AMAP_WEB_KEY || env.AMAP_KEY)) || ''
    : isTencent
      ? (env && env.TENCENT_KEY) || ''
      : (env && env.BAIDU_AK) || ''
  const allowClient = (env && env.ALLOW_CLIENT_KEY) === '1'
  const clientKey =
    url.searchParams.get('key') ||
    (form ? form.get('key') : '') ||
    url.searchParams.get('ak') ||
    (form ? form.get('ak') : '') ||
    ''
  const key = serverKey || (allowClient ? clientKey : '')
  if (!key) {
    const hint = isAmap
      ? 'AMAP_WEB_KEY'
      : isTencent
        ? 'TENCENT_KEY'
        : 'BAIDU_AK'
    return json(
      {
        errcode: 40002,
        errmsg: `服务端未配置 ${hint}（edgeone makers env set ${hint} <Key> -e production）`,
      },
      400,
    )
  }
  // 百度用 ak，高德/腾讯用 key —— 凭证参数名不同，不能统一
  upstream.searchParams.set(isBaidu ? 'ak' : 'key', key)

  // 高德数字签名（服务端持有私钥，前端永远做不到）
  const secret = isAmap ? (env && env.AMAP_SIG) || '' : ''
  if (secret) {
    const forSig = { ...params, key }
    upstream.searchParams.set('sig', amapSig(forSig, secret))
  }

  // POST：
  //  - 表单 → 用「已过滤的 params」重建（天然剔除 p/key/sig）
  //  - JSON → 原样透传 rawBody（必须先在上面单独读取，此时不能再 clone）
  const init = { method: request.method }
  if (request.method === 'POST') {
    if (form) {
      const rebuilt = new URLSearchParams()
      Object.keys(params).forEach((k) => rebuilt.set(k, params[k]))
      init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
      init.body = rebuilt.toString()
    } else if (rawBody) {
      init.headers = { 'Content-Type': 'application/json' }
      init.body = rawBody
    }
  }

  try {
    const res = await fetch(upstream.toString(), init)
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8',
        ...CORS,
      },
    })
  } catch (e) {
    return json({ errcode: 50001, errmsg: `upstream error: ${e && e.message ? e.message : e}` }, 502)
  }
}
