import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { getDb } from '../models'
import { generateId, errorResponse, successResponse } from '../utils/response'

const TOKEN_TTL = 5 * 60 * 1000
const MAX_ATTEMPTS = 5

interface SensitiveAction {
  path: string
  method: string
  action: string
}

interface VerifyTokenResult {
  valid: boolean
  reason?: string
  tokenId?: string
}

interface SensitiveVerifyToken {
  id: string
  user_id: string
  token: string
  expires_at: string
  used: number
  attempts: number
  created_at: string
}

/**
 * 敏感操作配置表
 * 定义哪些操作需要二次验证
 */
const SENSITIVE_ACTIONS: SensitiveAction[] = [
  { path: '/api/admin/products', method: 'DELETE', action: 'delete_product' },
  { path: '/api/admin/products/batch/delete', method: 'POST', action: 'batch_delete_product' },
  { path: '/api/admin/orders/:id/refund/audit', method: 'POST', action: 'refund_audit' },
  { path: '/api/admin/roles/:id', method: 'DELETE', action: 'delete_role' },
  { path: '/api/admin/users/roles', method: 'POST', action: 'assign_role' },
  { path: '/api/admin/users/:userId/roles/:roleId', method: 'DELETE', action: 'remove_role' },
]

/**
 * 检查请求是否匹配敏感操作
 */
function matchSensitiveAction(req: Request): SensitiveAction | undefined {
  const method = req.method.toUpperCase()
  const path = req.route?.path || req.path

  // 替换 route path 参数为实际值进行匹配
  for (const sensitive of SENSITIVE_ACTIONS) {
    if (sensitive.method !== method) {
      continue
    }

    const pattern = sensitive.path.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/')

    const regex = new RegExp(`^${pattern}$`)
    if (regex.test(path)) {
      return sensitive
    }
  }

  return undefined
}

/**
 * 检查操作是否需要二次验证
 */
function isSensitiveAction(req: Request): boolean {
  // 检查 URL 路径 + 方法是否匹配敏感操作
  const path = req.originalUrl.split('?')[0]

  for (const sensitive of SENSITIVE_ACTIONS) {
    if (sensitive.method !== req.method.toUpperCase()) {
      continue
    }

    // 转换路径参数为正则
    const sensitivePathPattern = sensitive.path.replace(/:[^/]+/g, '[^/]+')

    const regex = new RegExp(`^${sensitivePathPattern}$`)
    if (regex.test(path)) {
      return true
    }
  }

  return false
}

function generateVerifyToken(userId: string): string {
  const db = getDb()
  const token = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TOKEN_TTL).toISOString()
  const id = generateId('SVT')

  db.prepare(
    'INSERT INTO sensitive_verify_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, userId, token, expiresAt, now.toISOString())

  return token
}

function verifyToken(userId: string, token: string): VerifyTokenResult {
  const db = getDb()
  const now = new Date().toISOString()

  const record = db
    .prepare(
      `
    SELECT * FROM sensitive_verify_tokens
    WHERE user_id = ? AND token = ? AND expires_at > ? AND used = 0 AND attempts < ?
    ORDER BY created_at DESC LIMIT 1
  `
    )
    .get(userId, token, now, MAX_ATTEMPTS) as SensitiveVerifyToken | undefined

  if (!record) {
    return { valid: false, reason: 'invalid_token' }
  }

  db.prepare('UPDATE sensitive_verify_tokens SET attempts = attempts + 1 WHERE id = ?').run(
    record.id
  )

  return { valid: true, tokenId: record.id }
}

function markTokenUsed(tokenId: string): void {
  const db = getDb()
  db.prepare('UPDATE sensitive_verify_tokens SET used = 1, used_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    tokenId
  )
}

/**
 * 请求二次验证token
 */
function requestVerify(req: Request, res: Response): void {
  if (!(req as Request & { user?: { id: string } }).user) {
    errorResponse(res, '未登录', 1002, 401)
    return
  }

  const userId = (req as Request & { user?: { id: string } }).user?.id || ''
  const token = generateVerifyToken(userId)
  successResponse(res, { verify_token: token, expires_in: TOKEN_TTL / 1000 }, '请进行二次验证')
}

/**
 * 敏感操作二次验证中间件
 * 自动检查请求是否需要二次验证，如需要则验证token
 */
function sensitiveActionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 检查是否需要二次验证
  if (!isSensitiveAction(req)) {
    next()
    return
  }

  const verifyTokenHeader = req.headers['x-sensitive-verify-token'] as string | undefined

  if (!verifyTokenHeader) {
    res.status(403).json({
      code: 1010,
      message: '敏感操作需要二次验证',
      data: {
        require_verify: true,
        action: matchSensitiveAction(req)?.action,
        verify_endpoint: '/api/admin/sensitive/request-verify',
        hint: '请先调用 /api/admin/sensitive/request-verify 获取验证令牌',
      },
    })
    return
  }

  const userId = (req as Request & { user?: { id: string } }).user?.id || ''
  const result = verifyToken(userId, verifyTokenHeader)

  if (!result.valid) {
    errorResponse(res, '二次验证失败或令牌已过期', 1011, 403)
    return
  }

  if (result.tokenId) {
    markTokenUsed(result.tokenId)
  }

  next()
}

/**
 * 获取敏感操作列表（供管理界面使用）
 */
function getSensitiveActions(): SensitiveAction[] {
  return SENSITIVE_ACTIONS
}

export default {
  generateVerifyToken,
  verifyToken,
  markTokenUsed,
  requestVerify,
  sensitiveActionMiddleware,
  isSensitiveAction,
  matchSensitiveAction,
  getSensitiveActions,
  SENSITIVE_ACTIONS,
}
