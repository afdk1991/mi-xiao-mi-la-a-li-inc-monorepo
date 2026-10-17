// HTTP 基础设施：JSON 响应、请求体解析、CORS、:param 路由匹配。
// 仅用 node:http，不引入 Express（保持零运行时依赖）。

import type { IncomingMessage, ServerResponse } from 'node:http'

export interface Ctx {
  req: IncomingMessage
  res: ServerResponse
  /** 路径参数（:param 匹配结果） */
  params: Record<string, string>
  /** 查询字符串 */
  query: URLSearchParams
  /** 请求路径（不含 query） */
  pathname: string
  /** 已通过鉴权的用户 id（仅 requireAuth 命中的路由可用） */
  userId: number | null
}

export type Handler = (ctx: Ctx) => Promise<void> | void

const MAX_BODY_BYTES = 1024 * 1024

export function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(payload)
}

export function ok(res: ServerResponse, data: unknown = { success: true }): void {
  json(res, 200, data)
}

export function fail(res: ServerResponse, status: number, error: string): void {
  json(res, status, { success: false, error })
}

export async function readJson<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '请求体过大')
    chunks.push(chunk as Buffer)
  }
  if (!chunks.length) return {} as T
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
  } catch {
    throw new HttpError(400, '请求体不是合法 JSON')
  }
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/** 把 '/api/v1/addresses/:id' 编译为匹配函数；返回 null 表示不匹配 */
function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split('/')
  const u = pathname.split('/')
  if (p.length !== u.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) {
      params[p[i].slice(1)] = decodeURIComponent(u[i])
    } else if (p[i] !== u[i]) {
      return null
    }
  }
  return params
}

export interface Route {
  method: string
  pattern: string
  handler: Handler
}

export function createRouter(routes: Route[]): Handler {
  return async (ctx: Ctx) => {
    for (const r of routes) {
      if (r.method !== ctx.req.method) continue
      const params = matchRoute(r.pattern, ctx.pathname)
      if (params) {
        ctx.params = params
        await r.handler(ctx)
        return
      }
    }
    fail(ctx.res, 404, `Not Found: ${ctx.req.method} ${ctx.pathname}`)
  }
}
