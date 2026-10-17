// route-nav 服务端入口。
// 零运行时依赖：node:http + node:sqlite，Node >= 22.18 可直接以 `node src/index.ts` 运行（TS 类型擦除）。
//
// 客户端响应格式约定（同时兼容两端）：
//   - Expo 客户端（client/utils/api.ts）：读取 body.data ?? body
//   - Taro 客户端（taro-app/src/utils/network.ts）：读取 body 本身
// 因此：
//   - 列表/单对象结果直接返回裸载荷（数组或对象）
//   - auth 相关同时提供 data.{...} 与顶层 token/user 两种形态
//   - 错误统一 { success: false, error } + 4xx/5xx 状态码

import { createServer } from 'node:http'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { activeGeoProvider, geocode, haversine, reverseGeocode } from './geo.ts'
import { optimize } from './optimize.ts'
import { buildExternalMapUrl, MAP_PROVIDERS, type MapProvider } from './extmap.ts'
import { hashPassword, issueToken, publicUser, userFromAuthHeader, verifyPassword } from './auth.ts'
import {
  createUser,
  deleteAddress,
  deleteRoute,
  findUserByEmail,
  findUserByLogin,
  findUserById,
  getAddress,
  getAddressesByIds,
  getAttraction,
  getRoute,
  insertAddress,
  insertRoute,
  listAddresses,
  listCities,
  listRoutes,
  queryAttractions,
  updateAddress,
} from './store.ts'
import { fail, HttpError, json, ok, readJson, createRouter, type Ctx, type Route } from './http.ts'
import type { AddressItem, OptimizationMode } from './types.ts'

// ---------- 工具 ----------

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

function requireAuth(ctx: Ctx): number {
  const uid = userFromAuthHeader(ctx.req.headers.authorization)
  if (!uid) throw new HttpError(401, '未登录或登录已过期')
  return uid
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

// ---------- 路由表 ----------

const routes: Route[] = [
  // ---- health ----
  {
    method: 'GET',
    pattern: '/api/v1/health',
    handler: (ctx) => {
      ok(ctx.res, { status: 'ok', geoProvider: activeGeoProvider(), uptime: process.uptime() })
    },
  },

  // ---- auth ----
  {
    method: 'POST',
    pattern: '/api/v1/auth/register',
    handler: async (ctx) => {
      const body = await readJson<{ username?: string; email?: string; password?: string }>(ctx.req)
      const username = (body.username ?? '').trim()
      const email = (body.email ?? '').trim().toLowerCase()
      const password = body.password ?? ''
      if (!username || username.length > 50) throw new HttpError(400, '用户名不能为空且不超过 50 字符')
      if (!isEmail(email)) throw new HttpError(400, '邮箱格式不正确')
      if (password.length < 6) throw new HttpError(400, '密码至少 6 位')
      if (findUserByEmail(email)) throw new HttpError(409, '该邮箱已注册')
      const id = createUser(username, email, hashPassword(password))
      const user = publicUser({ id, username, email })
      const token = issueToken(id)
      // 双端兼容：data.* 给 Expo，顶层 token/user 给 Taro
      json(ctx.res, 201, { success: true, data: { ...user, token }, user, token })
    },
  },
  {
    method: 'POST',
    pattern: '/api/v1/auth/login',
    handler: async (ctx) => {
      const body = await readJson<{ email?: string; username?: string; password?: string }>(ctx.req)
      const identifier = (body.email ?? body.username ?? '').trim()
      const password = body.password ?? ''
      if (!identifier || !password) throw new HttpError(400, '请输入账号和密码')
      const row = findUserByLogin(identifier.toLowerCase())
      if (!row || !verifyPassword(password, row.password_hash)) throw new HttpError(401, '账号或密码错误')
      const user = publicUser(row)
      const token = issueToken(row.id)
      json(ctx.res, 200, { success: true, data: { ...user, token }, user, token })
    },
  },
  {
    method: 'GET',
    pattern: '/api/v1/auth/me',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      const row = findUserById(uid)
      if (!row) throw new HttpError(401, '用户不存在')
      ok(ctx.res, publicUser(row))
    },
  },

  // ---- addresses ----
  {
    method: 'GET',
    pattern: '/api/v1/addresses',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      ok(ctx.res, listAddresses(uid))
    },
  },
  {
    method: 'POST',
    pattern: '/api/v1/addresses',
    handler: async (ctx) => {
      const uid = requireAuth(ctx)
      const body = await readJson<{ name?: string; address?: string; latitude?: number; longitude?: number; city?: string }>(ctx.req)
      const name = (body.name ?? '').trim()
      const address = (body.address ?? '').trim()
      const lat = num(body.latitude)
      const lng = num(body.longitude)
      if (!name) throw new HttpError(400, '名称不能为空')
      if (!address) throw new HttpError(400, '地址不能为空')
      if (lat === null || lat < -90 || lat > 90) throw new HttpError(400, '纬度不合法')
      if (lng === null || lng < -180 || lng > 180) throw new HttpError(400, '经度不合法')
      const count = listAddresses(uid).length
      const created = insertAddress(uid, {
        name,
        address,
        latitude: lat,
        longitude: lng,
        city: (body.city ?? '').trim() || undefined,
        isStart: false,
        isEnd: false,
        orderIndex: count,
      })
      json(ctx.res, 201, created)
    },
  },
  {
    method: 'GET',
    pattern: '/api/v1/addresses/:id',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      const id = num(ctx.params.id)
      if (id === null) throw new HttpError(400, 'id 不合法')
      const a = getAddress(uid, id)
      if (!a) throw new HttpError(404, '地址不存在')
      ok(ctx.res, a)
    },
  },
  {
    method: 'PUT',
    pattern: '/api/v1/addresses/:id',
    handler: async (ctx) => {
      const uid = requireAuth(ctx)
      const id = num(ctx.params.id)
      if (id === null) throw new HttpError(400, 'id 不合法')
      const body = await readJson<Partial<AddressItem>>(ctx.req)
      if (body.latitude !== undefined && (num(body.latitude) === null || Math.abs(num(body.latitude)!) > 90)) throw new HttpError(400, '纬度不合法')
      if (body.longitude !== undefined && (num(body.longitude) === null || Math.abs(num(body.longitude)!) > 180)) throw new HttpError(400, '经度不合法')
      const updated = updateAddress(uid, id, {
        ...body,
        latitude: body.latitude !== undefined ? num(body.latitude)! : undefined,
        longitude: body.longitude !== undefined ? num(body.longitude)! : undefined,
      })
      if (!updated) throw new HttpError(404, '地址不存在')
      ok(ctx.res, updated)
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/v1/addresses/:id',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      const id = num(ctx.params.id)
      if (id === null) throw new HttpError(400, 'id 不合法')
      if (!deleteAddress(uid, id)) throw new HttpError(404, '地址不存在')
      ok(ctx.res, { success: true })
    },
  },
  {
    // 景点 → 地址（单个）
    method: 'POST',
    pattern: '/api/v1/addresses/from-attraction/:attractionId',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      const aid = num(ctx.params.attractionId)
      if (aid === null) throw new HttpError(400, 'attractionId 不合法')
      const att = getAttraction(aid)
      if (!att) throw new HttpError(404, '景点不存在')
      const count = listAddresses(uid).length
      const created = insertAddress(uid, {
        name: att.name,
        address: att.address,
        latitude: att.latitude,
        longitude: att.longitude,
        city: att.city,
        isStart: false,
        isEnd: false,
        orderIndex: count,
      })
      json(ctx.res, 201, created)
    },
  },
  {
    // 景点 → 地址（批量）
    method: 'POST',
    pattern: '/api/v1/addresses/from-attractions',
    handler: async (ctx) => {
      const uid = requireAuth(ctx)
      const body = await readJson<{ attractionIds?: number[] }>(ctx.req)
      const ids = Array.isArray(body.attractionIds) ? body.attractionIds.map((v) => num(v)).filter((v): v is number => v !== null) : []
      if (!ids.length) throw new HttpError(400, 'attractionIds 不能为空')
      if (ids.length > 100) throw new HttpError(400, '单次最多添加 100 个景点')
      const created: AddressItem[] = []
      let count = listAddresses(uid).length
      for (const aid of ids) {
        const att = getAttraction(aid)
        if (!att) continue
        created.push(
          insertAddress(uid, {
            name: att.name,
            address: att.address,
            latitude: att.latitude,
            longitude: att.longitude,
            city: att.city,
            isStart: false,
            isEnd: false,
            orderIndex: count++,
          }),
        )
      }
      json(ctx.res, 201, { added: created.length, addresses: created })
    },
  },

  // ---- geocode ----
  {
    method: 'POST',
    pattern: '/api/v1/geocode',
    handler: async (ctx) => {
      const body = await readJson<{ query?: string }>(ctx.req)
      const query = (body.query ?? '').trim()
      if (!query) throw new HttpError(400, 'query 不能为空')
      if (query.length > 100) throw new HttpError(400, 'query 过长')
      const r = await geocode(query)
      if (!r) throw new HttpError(502, '地理编码失败：所有提供商均无结果（可配置 AMAP_WEB_KEY / TENCENT_KEY 提升国内准确度）')
      ok(ctx.res, r)
    },
  },
  {
    method: 'POST',
    pattern: '/api/v1/reverse-geocode',
    handler: async (ctx) => {
      const body = await readJson<{ latitude?: number; longitude?: number }>(ctx.req)
      const lat = num(body.latitude)
      const lng = num(body.longitude)
      if (lat === null || Math.abs(lat) > 90) throw new HttpError(400, '纬度不合法')
      if (lng === null || Math.abs(lng) > 180) throw new HttpError(400, '经度不合法')
      const r = await reverseGeocode(lat, lng)
      if (!r) throw new HttpError(502, '逆地理编码失败：所有提供商均无结果')
      ok(ctx.res, r)
    },
  },

  // ---- routes（注意：/optimize 必须先于 /:id 注册）----
  {
    method: 'POST',
    pattern: '/api/v1/routes/optimize',
    handler: async (ctx) => {
      const uid = requireAuth(ctx)
      const body = await readJson<{ addressIds?: number[]; mode?: string }>(ctx.req)
      const ids = Array.isArray(body.addressIds) ? body.addressIds.map((v) => num(v)).filter((v): v is number => v !== null) : []
      if (ids.length < 2) throw new HttpError(400, '至少需要 2 个地址才能优化')
      const mode: OptimizationMode = body.mode === 'balanced' || body.mode === 'regional' ? body.mode : 'shortest'
      const addresses = getAddressesByIds(uid, ids)
      if (addresses.length < 2) throw new HttpError(404, '地址不存在或不属于当前用户')
      const result = optimize({ addresses, mode })
      const ordered = result.orderedIndexes.map((i) => addresses[i])
      ok(ctx.res, {
        addressIds: ordered.map((a) => a.id),
        orderedAddresses: ordered,
        totalDistance: result.totalDistance,
        optimizationMode: mode,
      })
    },
  },
  {
    method: 'GET',
    pattern: '/api/v1/routes',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      ok(ctx.res, listRoutes(uid))
    },
  },
  {
    method: 'POST',
    pattern: '/api/v1/routes',
    handler: async (ctx) => {
      const uid = requireAuth(ctx)
      const body = await readJson<{
        name?: string
        optimizationMode?: string
        totalDistance?: number
        addressIds?: number[]
        orderedAddresses?: AddressItem[]
      }>(ctx.req)
      const name = (body.name ?? '').trim()
      if (!name) throw new HttpError(400, '路线名称不能为空')
      if (name.length > 100) throw new HttpError(400, '路线名称过长')
      const mode: OptimizationMode = body.optimizationMode === 'balanced' || body.optimizationMode === 'regional' ? body.optimizationMode : 'shortest'
      const addressIds = Array.isArray(body.addressIds) ? body.addressIds.map((v) => num(v)).filter((v): v is number => v !== null) : []
      const ordered = Array.isArray(body.orderedAddresses) ? body.orderedAddresses : []
      if (!ordered.length) throw new HttpError(400, 'orderedAddresses 不能为空')
      const total = num(body.totalDistance) ?? 0
      const created = insertRoute(uid, { name, optimizationMode: mode, totalDistance: total, addressIds, orderedAddresses: ordered })
      json(ctx.res, 201, created)
    },
  },
  {
    method: 'GET',
    pattern: '/api/v1/routes/:id',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      const id = num(ctx.params.id)
      if (id === null) throw new HttpError(400, 'id 不合法')
      const r = getRoute(uid, id)
      if (!r) throw new HttpError(404, '路线不存在')
      ok(ctx.res, r)
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/v1/routes/:id',
    handler: (ctx) => {
      const uid = requireAuth(ctx)
      const id = num(ctx.params.id)
      if (id === null) throw new HttpError(400, 'id 不合法')
      if (!deleteRoute(uid, id)) throw new HttpError(404, '路线不存在')
      ok(ctx.res, { success: true })
    },
  },

  // ---- distance ----
  {
    method: 'POST',
    pattern: '/api/v1/distance',
    handler: async (ctx) => {
      const body = await readJson<{ from?: { latitude?: number; longitude?: number }; to?: { latitude?: number; longitude?: number } }>(ctx.req)
      const fromLat = num(body.from?.latitude)
      const fromLng = num(body.from?.longitude)
      const toLat = num(body.to?.latitude)
      const toLng = num(body.to?.longitude)
      if (fromLat === null || fromLng === null || toLat === null || toLng === null) throw new HttpError(400, 'from/to 坐标不合法')
      const d = haversine(fromLat, fromLng, toLat, toLng)
      ok(ctx.res, { distance: Math.round(d), unit: 'm' })
    },
  },

  // ---- external map url ----
  {
    method: 'POST',
    pattern: '/api/v1/external-map-url',
    handler: async (ctx) => {
      const body = await readJson<{ latitude?: number; longitude?: number; name?: string; provider?: string }>(ctx.req)
      const lat = num(body.latitude)
      const lng = num(body.longitude)
      if (lat === null || Math.abs(lat) > 90) throw new HttpError(400, '纬度不合法')
      if (lng === null || Math.abs(lng) > 180) throw new HttpError(400, '经度不合法')
      const provider = (body.provider ?? 'amap') as MapProvider
      if (!MAP_PROVIDERS[provider]) throw new HttpError(400, `不支持的 provider：${String(body.provider)}`)
      ok(ctx.res, { url: buildExternalMapUrl(lat, lng, body.name, provider), provider })
    },
  },

  // ---- attractions（注意：/cities/list 必须先于 /:id 注册）----
  {
    method: 'GET',
    pattern: '/api/v1/attractions/cities/list',
    handler: (ctx) => {
      ok(ctx.res, listCities())
    },
  },
  {
    method: 'GET',
    pattern: '/api/v1/attractions',
    handler: (ctx) => {
      const limit = Math.min(Math.max(num(ctx.query.get('limit')) ?? 20, 1), 200)
      const offset = Math.max(num(ctx.query.get('offset')) ?? 0, 0)
      const { items, total } = queryAttractions({
        city: ctx.query.get('city') ?? undefined,
        category: ctx.query.get('category') ?? undefined,
        region: ctx.query.get('region') ?? undefined,
        search: ctx.query.get('search') ?? undefined,
        limit,
        offset,
      })
      ok(ctx.res, { items, total, limit, offset })
    },
  },
  {
    method: 'GET',
    pattern: '/api/v1/attractions/:id',
    handler: (ctx) => {
      const id = num(ctx.params.id)
      if (id === null) throw new HttpError(400, 'id 不合法')
      const att = getAttraction(id)
      if (!att) throw new HttpError(404, '景点不存在')
      ok(ctx.res, att)
    },
  },
]

const router = createRouter(routes)

// ---------- 启动 ----------

function start(): void {
  const PORT = Number(process.env.PORT ?? 9091)
  const HOST = process.env.HOST ?? '0.0.0.0'

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

    // CORS 预检
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      })
      res.end()
      return
    }

    const started = Date.now()
    const ctx: Ctx = {
      req,
      res,
      params: {},
      query: url.searchParams,
      pathname: url.pathname,
      userId: null,
    }

    try {
      await router(ctx)
    } catch (err) {
      if (err instanceof HttpError) {
        fail(res, err.status, err.message)
      } else {
        console.error('[server] unhandled error:', err)
        fail(res, 500, '服务器内部错误')
      }
    } finally {
      const ms = Date.now() - started
      console.log(`${req.method} ${url.pathname} ${res.statusCode} ${ms}ms`)
    }
  })

  server.listen(PORT, HOST, () => {
    console.log(`[route-nav] server listening on http://${HOST}:${PORT}（geo: ${activeGeoProvider()}）`)
  })
}

// 直接运行（node src/index.ts / tsx src/index.ts / node --watch）时才启动；
// 被 import（如 scripts/lint.mjs 做链接检查）时不启动。
const entry = process.argv[1]
if (entry && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))) {
  start()
}
