// 高德「猎鹰轨迹服务」适配层（可选的上云通道）。
//
// 与自建本地轨迹库（IndexedDB）的关系：
//   - 自建库：默认路径，离线可用、零配额、数据在本机，适合单机配送复盘。
//   - 猎鹰：需要「Web 服务类型 Key + 服务ID(sid) + 终端ID(tid)」，适合多车/多人云端归档与跨端回看。
//
// 端点（tsapi.amap.com/v1/track/*）：
//   service/add   (key,name)            -> data.sid
//   terminal/add  (key,sid,name)        -> data.tid
//   trace/add     (key,sid,tid,trname)  -> data.trid
//   point/upload  (key,sid,tid,trid,points)  POST，单次最多 100 点
//   terminal/trsearch (key,sid,tid,trid|start_time&end_time) 查询并可纠偏
//
// ⚠️ 浏览器直连 tsapi.amap.com 通常被 CORS 拦截，且 Key 会暴露在前端。
//    生产环境请填「代理地址」走本站边缘函数 /api/falcon（见 edge-functions/api/falcon.js）：
//    代理在服务端注入 Key（env.AMAP_FALCON_KEY），前端无需持有，也就不存在 Key 泄露问题。
//
// 代理契约：GET|POST <proxyBase>?p=<path>&<原始参数...>
//   例如 proxyBase=/api/falcon，path=service/add  =>  /api/falcon?p=service/add&key=...&name=...

export interface FalconConfig {
  /** 高德 Web 服务类型 Key（需在控制台绑定猎鹰服务）。走代理时服务端优先用 env 中的 Key，此值可留空 */
  key: string
  /** 服务 ID */
  sid: string
  /** 终端 ID */
  tid: string
  /** 轨迹 ID（上传时必填） */
  trid?: string
  /** 可选：代理前缀，如 /api/falcon（本站边缘函数）或 https://api.example.com/falcon */
  proxyBase?: string
}

export interface FalconPoint {
  lat: number
  lng: number
  /** 毫秒时间戳 */
  timeMs: number
  /** 速度 km/h */
  speed?: number
  /** 方向角 0~360，0 为正北 */
  direction?: number
}

export interface FalconResult<T> {
  ok: boolean
  data?: T
  msg?: string
}

/** 构造请求地址：代理模式走 `?p=<path>` 契约，直连模式走 tsapi.amap.com */
function endpoint(cfg: FalconConfig, path: string): string {
  const p = (cfg.proxyBase || '').trim().replace(/\/+$/, '')
  if (p) return `${p}?p=${encodeURIComponent(path)}`
  return `https://tsapi.amap.com/v1/track/${path}`
}

function errText(errcode: number, errmsg?: string): string {
  const known: Record<number, string> = {
    10001: 'key 不正确或已过期',
    10002: '无权限使用该服务（Key 需绑定猎鹰服务，且为 Web 服务类型）',
    10003: '访问已超限（QPS/配额）',
    20011: 'sid 不存在',
    20012: 'tid 不存在',
    20013: 'trid 不存在',
    30001: '参数错误',
    40001: '代理拒绝：path 不在白名单内',
    40002: '代理缺少 Key（请在 Makers 控制台配置环境变量 AMAP_FALCON_KEY，或前端填入 Key）',
    50001: '代理访问上游失败',
  }
  return known[errcode] || errmsg || `猎鹰返回错误码 ${errcode}`
}

async function call<T>(
  cfg: FalconConfig,
  path: string,
  params: Record<string, string | number | undefined>,
  method: 'GET' | 'POST' = 'GET',
): Promise<FalconResult<T>> {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') usp.set(k, String(v))
  })
  try {
    const target = endpoint(cfg, path)
    // 代理模式下 target 已含 ?p=，后续参数用 & 追加
    const url = method === 'GET' ? `${target}${target.includes('?') ? '&' : '?'}${usp.toString()}` : target
    const res = await fetch(url, {
      method,
      headers:
        method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: method === 'POST' ? usp.toString() : undefined,
    })
    if (!res.ok) return { ok: false, msg: `猎鹰请求失败（HTTP ${res.status}）` }
    const json = (await res.json()) as { errcode?: number; errmsg?: string; data?: T }
    const code = Number(json.errcode ?? 0)
    if (code !== 0 || !json.data) return { ok: false, msg: errText(code, json.errmsg) }
    return { ok: true, data: json.data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      msg: cfg.proxyBase
        ? `请求异常：${msg}。请确认代理地址可用。`
        : `请求异常（多为 CORS/网络）：${msg}。建议填写代理地址 /api/falcon。`,
    }
  }
}

function cfgOf(
  key: string,
  proxyBase: string | undefined,
  extra: Partial<FalconConfig> = {},
): FalconConfig {
  return { key, sid: '', tid: '', proxyBase, ...extra }
}

/** 创建猎鹰服务，返回 sid */
export async function falconCreateService(
  cfg: Pick<FalconConfig, 'key' | 'proxyBase'>,
  name: string,
): Promise<FalconResult<{ sid: number }>> {
  return call(cfgOf(cfg.key, cfg.proxyBase), 'service/add', { key: cfg.key, name }, 'POST')
}

/** 创建终端，返回 tid */
export async function falconAddTerminal(
  cfg: Pick<FalconConfig, 'key' | 'sid' | 'proxyBase'>,
  name: string,
): Promise<FalconResult<{ tid: number }>> {
  return call(cfgOf(cfg.key, cfg.proxyBase, { sid: cfg.sid }), 'terminal/add', {
    key: cfg.key,
    sid: cfg.sid,
    name,
  }, 'POST')
}

/** 创建轨迹，返回 trid */
export async function falconAddTrace(
  cfg: Pick<FalconConfig, 'key' | 'sid' | 'tid' | 'proxyBase'>,
  trname: string,
): Promise<FalconResult<{ trid: number }>> {
  return call(cfgOf(cfg.key, cfg.proxyBase, { sid: cfg.sid, tid: cfg.tid }), 'trace/add', {
    key: cfg.key,
    sid: cfg.sid,
    tid: cfg.tid,
    trname,
  }, 'POST')
}

/** 上传轨迹点（自动按 100 点分批）。返回成功点数与失败批次原因。 */
export async function falconUpload(
  cfg: FalconConfig,
  points: FalconPoint[],
): Promise<{ uploaded: number; errors: string[]; trid?: string }> {
  const errors: string[] = []
  if (!cfg.sid || !cfg.tid || !cfg.trid) {
    return { uploaded: 0, errors: ['缺少 sid / tid / trid'] }
  }
  if (!cfg.key && !cfg.proxyBase) {
    return { uploaded: 0, errors: ['缺少 key，或填写代理地址由服务端注入 Key'] }
  }
  let uploaded = 0
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100).map((p) => {
      const o: Record<string, unknown> = {
        location: `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`,
        locatetime: Math.round(p.timeMs),
      }
      if (p.speed != null) o.speed = Number(p.speed.toFixed(3))
      if (p.direction != null) o.direction = Number(p.direction.toFixed(4))
      return o
    })
    const r = await call<Record<string, unknown>>(
      cfg,
      'point/upload',
      {
        key: cfg.key,
        sid: cfg.sid,
        tid: cfg.tid,
        trid: cfg.trid,
        points: JSON.stringify(batch),
      },
      'POST',
    )
    if (r.ok) uploaded += batch.length
    else errors.push(`第 ${Math.floor(i / 100) + 1} 批：${r.msg}`)
  }
  return { uploaded, errors, trid: cfg.trid }
}

/** 查询并（可选）纠偏已上传轨迹。起止时间差最多 24 小时。 */
export async function falconSearchTrace(
  cfg: FalconConfig,
  opts: { startSec?: number; endSec?: number; trid?: string; correct?: boolean },
): Promise<FalconResult<{ points: Array<{ lat: number; lng: number; timeMs: number }> }>> {
  const params: Record<string, string | number | undefined> = {
    key: cfg.key,
    sid: cfg.sid,
    tid: cfg.tid,
  }
  if (opts.trid) params.trid = opts.trid
  if (opts.startSec) params.start_time = opts.startSec
  if (opts.endSec) params.end_time = opts.endSec
  if (opts.correct) params.recoup = 1
  const r = await call<{ counts?: number; list?: Array<{ location: string; locatetime: number }> }>(
    cfg,
    'terminal/trsearch',
    params,
    'GET',
  )
  if (!r.ok || !r.data?.list) return { ok: false, msg: r.msg || '未查询到轨迹点' }
  const points = r.data.list
    .map((it) => {
      const [lng, lat] = String(it.location).split(',').map(Number)
      return { lat, lng, timeMs: Number(it.locatetime) }
    })
    .filter((p) => !isNaN(p.lat) && !isNaN(p.lng))
  return { ok: true, data: { points } }
}
