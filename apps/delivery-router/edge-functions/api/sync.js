// 云同步端点（EdgeOne Makers Edge Function / V8 运行时）。
//
// 目的：解决「数据只在本机、换设备或卸载即丢」的问题——无需自建服务器，
//      直接用 EdgeOne Makers **KV 存储**（边缘 KV，全球 60s 内同步）。
//
// 契约（无需登录，凭「同步码」存取，同步码即密钥，请勿泄露）：
//   GET    /api/sync?code=ABC123     取回该同步码下的数据（含 updatedAt）
//   POST   /api/sync?code=ABC123     上传覆盖（body 为备份 JSON，≤ 2MB）
//   DELETE /api/sync?code=ABC123     删除云端数据
//
// ⚠️ 约束：V8 运行时，禁用 Node 内置模块、require、npm 包；Response.json() 不可用。
//
// 开通步骤（控制台，一次性）：
//   1. EdgeOne 控制台 → KV 存储 → 申请开通（免费额度 1GB）
//   2. 创建命名空间（如 delivery-sync）
//   3. 绑定到本项目，变量名填 **sync_kv**（下方 KV 变量名需与控制台一致）
// 未开通时本端点返回 501 并给出引导，前端会自动隐藏云同步入口。

const KV_NAME = 'sync_kv'
// 平台限制：边缘函数请求体上限 1MB，此处留余量（轨迹数据多时请先清理旧轨迹）
const MAX_BYTES = 900 * 1024
const CODE_RE = /^[A-Za-z0-9]{6,16}$/

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  // Electron / Capacitor / 本地调试下 origin 与部署域名不同，需显式放开
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

/** KV 未开通时给出可操作的引导，而不是抛 ReferenceError */
function kvMissing() {
  return json(
    {
      ok: false,
      error: 'KV_NOT_ENABLED',
      message:
        '云同步未开通：请在 EdgeOne 控制台「KV 存储」申请开通 → 创建命名空间 → 绑定到本项目，变量名填写 sync_kv',
    },
    501,
  )
}

function getKV() {
  // KV 是控制台绑定的全局变量，不在 context.env 上
  try {
    return typeof globalThis[KV_NAME] !== 'undefined' ? globalThis[KV_NAME] : null
  } catch {
    return null
  }
}

function keyOf(code) {
  return `sync:${code}`
}

export async function onRequest({ request }) {
  const url = new URL(request.url)
  const code = (url.searchParams.get('code') || '').trim()

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS })
  if (!CODE_RE.test(code)) {
    return json({ ok: false, error: 'BAD_CODE', message: '同步码需为 6-16 位字母或数字' }, 400)
  }

  const kv = getKV()
  if (!kv) return kvMissing()
  const key = keyOf(code)

  try {
    if (request.method === 'GET') {
      const data = await kv.get(key, 'json')
      if (!data || typeof data !== 'object') {
        return json({ ok: true, exists: false })
      }
      return json({
        ok: true,
        exists: true,
        updatedAt: data.updatedAt ?? null,
        customers: Array.isArray(data.customers) ? data.customers.length : 0,
        tracks: Array.isArray(data.tracks) ? data.tracks.length : 0,
        data,
      })
    }

    if (request.method === 'POST') {
      const raw = await request.text()
      if (raw.length > MAX_BYTES) {
        return json(
          { ok: false, error: 'TOO_LARGE', message: `数据超过 ${MAX_BYTES} 字节上限` },
          413,
        )
      }
      let payload
      try {
        payload = JSON.parse(raw)
      } catch {
        return json({ ok: false, error: 'BAD_JSON', message: '上传内容不是合法 JSON' }, 400)
      }
      if (!payload || !Array.isArray(payload.customers)) {
        return json({ ok: false, error: 'BAD_PAYLOAD', message: '缺少 customers 数组' }, 400)
      }
      // 服务端再次兜底：绝不允许把地图凭证写入云端。
      // 注意 localStorage['delivery.mapSettings'] 里也嵌着一份完整 MapSettings（含 keys），
      // 只删 payload.settings.keys 是不够的——那是「备份文件可能带 Key」的真实漏点。
      if (payload.settings) delete payload.settings.keys
      if (payload.localStorage && typeof payload.localStorage === 'object') {
        const raw = payload.localStorage['delivery.mapSettings']
        if (typeof raw === 'string') {
          try {
            const p = JSON.parse(raw)
            if (p && typeof p === 'object') {
              p.keys = {}
              payload.localStorage['delivery.mapSettings'] = JSON.stringify(p)
            }
          } catch {
            delete payload.localStorage['delivery.mapSettings']
          }
        }
      }
      const record = {
        ...payload,
        updatedAt: Date.now(),
        bytes: raw.length,
      }
      await kv.put(key, JSON.stringify(record))
      return json({ ok: true, updatedAt: record.updatedAt, bytes: record.bytes })
    }

    if (request.method === 'DELETE') {
      await kv.delete(key)
      return json({ ok: true })
    }

    return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405)
  } catch (e) {
    return json({ ok: false, error: 'KV_ERROR', message: String(e && e.message ? e.message : e) }, 500)
  }
}
