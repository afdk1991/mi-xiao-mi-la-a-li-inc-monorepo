// 高德「猎鹰轨迹服务」服务端代理（EdgeOne Makers Edge Function / V8 运行时）。
//
// 作用：前端不再直连 tsapi.amap.com，从而
//   1) 规避浏览器 CORS 拦截；
//   2) Key 不落前端 —— 由服务端环境变量 AMAP_FALCON_KEY 注入。
//
// 契约：GET|POST /api/falcon?p=<path>&<猎鹰原始参数...>
//   p 取值（白名单）：service/add | terminal/add | trace/add | point/upload | terminal/trsearch
// 例：/api/falcon?p=service/add&name=delivery  （key 由服务端注入，前端可不传）
//
// 环境变量（Makers 控制台 → 项目 → 环境变量）：
//   AMAP_FALCON_KEY  高德 Web 服务类型 Key，需绑定猎鹰服务
//
// ⚠️ 约束：V8 运行时，禁用 Node 内置模块、require、npm 包；Response.json() 不可用。

const UPSTREAM = 'https://tsapi.amap.com/v1/track'

// 白名单：只转发猎鹰轨迹管理必需的几个接口，避免沦为开放代理
const ALLOWED = new Set([
  'service/add',
  'terminal/add',
  'trace/add',
  'point/upload',
  'terminal/trsearch',
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

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ errcode: 40500, errmsg: 'method not allowed' }, 405)
  }

  const url = new URL(request.url)

  // POST 时先取 body，便于同时支持 p 放在 query 或 form 里
  let form = null
  if (request.method === 'POST') {
    form = new URLSearchParams(await request.text())
  }

  // p 优先取 query（前端约定），其次取 form 兜底
  const p = String(url.searchParams.get('p') || (form ? form.get('p') : '') || '')
    .replace(/^\/+|\/+$/g, '')
  if (!ALLOWED.has(p)) {
    return json({ errcode: 40001, errmsg: `path not allowed: ${p || '(empty)'}` }, 400)
  }

  // Key 优先取服务端环境变量，其次取前端传入
  const serverKey = (env && (env.AMAP_FALCON_KEY || env.AMAP_KEY)) || ''
  const clientKey = url.searchParams.get('key') || ''

  const upstream = new URL(`${UPSTREAM}/${p}`)
  let bodyText = null

  if (request.method === 'POST') {
    const bodyKey = form.get('key') || ''
    const key = serverKey || bodyKey || clientKey
    if (!key) return json({ errcode: 40002, errmsg: 'missing key' }, 400)
    // p 是代理自有参数，不向上游透传；其余原样转发
    form.delete('p')
    form.set('key', key)
    bodyText = form.toString()
  } else {
    url.searchParams.forEach((v, k) => {
      if (k !== 'p') upstream.searchParams.set(k, v)
    })
    const key = serverKey || clientKey
    if (!key) return json({ errcode: 40002, errmsg: 'missing key' }, 400)
    upstream.searchParams.set('key', key)
  }

  const init = { method: request.method }
  if (bodyText !== null) {
    init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
    init.body = bodyText
  }

  try {
    const res = await fetch(upstream.toString(), init)
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
    })
  } catch (e) {
    return json({ errcode: 50001, errmsg: `upstream error: ${e && e.message ? e.message : e}` }, 502)
  }
}
