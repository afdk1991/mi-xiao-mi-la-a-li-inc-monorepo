import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { errorResponse } from '../utils/response'
import logger from '../utils/logger'
import config from '../config'

const MAX_REGISTER_PER_HOUR = 5
const MAX_VERIFY_CODE_REQUESTS = 10
const ipRegistry = new Map<
  string,
  {
    registerCount: number
    lastRegisterTime: number
    verifyCodeCount: number
    lastVerifyCodeTime: number
  }
>()

function getIpInfo(ip: string) {
  let info = ipRegistry.get(ip)
  if (!info) {
    info = { registerCount: 0, lastRegisterTime: 0, verifyCodeCount: 0, lastVerifyCodeTime: 0 }
    ipRegistry.set(ip, info)
  }
  return info
}

function resetHourlyCounter(
  info: typeof ipRegistry extends Map<string, infer V> ? V : never,
  now: number
) {
  const ONE_HOUR = 60 * 60 * 1000
  if (now - info.lastRegisterTime > ONE_HOUR) {
    info.registerCount = 0
    info.lastRegisterTime = now
  }
  if (now - info.lastVerifyCodeTime > ONE_HOUR) {
    info.verifyCodeCount = 0
    info.lastVerifyCodeTime = now
  }
}

export function rateLimitRegister(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  if (process.env.NODE_ENV === 'test') {
    return next()
  }

  const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown'
  const now = Date.now()
  const info = getIpInfo(ip)

  resetHourlyCounter(info, now)

  if (info.registerCount >= MAX_REGISTER_PER_HOUR) {
    logger.warn('Registration rate limit exceeded for IP: %s', ip)
    return errorResponse(res, '注册过于频繁，请一小时后再试', 1010, 429)
  }

  info.registerCount++
  info.lastRegisterTime = now

  next()
}

export function rateLimitVerifyCode(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  if (process.env.NODE_ENV === 'test') {
    return next()
  }

  const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown'
  const now = Date.now()
  const info = getIpInfo(ip)

  resetHourlyCounter(info, now)

  if (info.verifyCodeCount >= MAX_VERIFY_CODE_REQUESTS) {
    logger.warn('Verify code rate limit exceeded for IP: %s', ip)
    return errorResponse(res, '验证码请求过于频繁，请一小时后再试', 1011, 429)
  }

  info.verifyCodeCount++
  info.lastVerifyCodeTime = now

  next()
}

export function validateInput(req: Request, res: Response, next: NextFunction): Response | void {
  // 综合 XSS 攻击模式检测（大小写不敏感）
  const xssPatterns: RegExp[] = [
    /<script\b/i,                    // <script 标签
    /<\/script>/i,                   // </script> 闭合标签
    /javascript:/i,                  // javascript: 协议
    /vbscript:/i,                    // vbscript: 协议
    /data:text\/html/i,              // data:text/html 协议
    /\son\w+\s*=/i,                  // on* 事件处理器 (onerror=, onclick= 等)
    /\beval\s*\(/i,                  // eval() 调用
    /\balert\s*\(/i,                 // alert() 调用
    /\bconfirm\s*\(/i,               // confirm() 调用
    /\bprompt\s*\(/i,                // prompt() 调用
    /\bdocument\.cookie/i,           // document.cookie 访问
    /\bdocument\.write/i,            // document.write 调用
    /\bwindow\.location/i,           // window.location 操控
    /<iframe\b/i,                    // <iframe 标签
    /<object\b/i,                    // <object 标签
    /<embed\b/i,                     // <embed 标签
    /<svg\b/i,                       // <svg 标签（可包含脚本）
  ]

  const hasXssPattern = (value: string): boolean => {
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        return true
      }
    }
    return false
  }

  const checkObject = (obj: Record<string, unknown> | undefined): boolean => {
    if (!obj) return false
    for (const key of Object.keys(obj)) {
      const value = obj[key]
      if (typeof value === 'string' && hasXssPattern(value)) {
        return true
      }
    }
    return false
  }

  // 检查 body、query 和 params（不仅仅是 body）
  if (
    checkObject(req.body as Record<string, unknown>) ||
    checkObject(req.query as Record<string, unknown>) ||
    checkObject(req.params as Record<string, unknown>)
  ) {
    logger.warn('Potential XSS attempt detected from IP: %s, path: %s', req.ip, req.path)
    return errorResponse(res, '输入内容包含非法字符', 1012, 400)
  }

  next()
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  for (const key of Object.keys(req.body)) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = sanitizeStringValue(req.body[key])
    }
  }
  next()
}

/**
 * 清理字符串中的 XSS 攻击向量
 *
 * 处理顺序（关键：不能先清理标签再反转义实体，否则会重新创建攻击向量）：
 * 1. 移除危险的 HTML 标签及其内容（script、iframe、object、embed、svg）
 * 2. 移除 on* 事件处理器属性
 * 3. 移除 javascript: 和 vbscript: 协议
 * 4. 移除剩余 HTML 标签（保留文本内容）
 * 5. 不反转义 HTML 实体（修复原有双重转义漏洞）
 */
function sanitizeStringValue(input: string): string {
  return input
    // 移除危险标签及其内容
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    // 移除 on* 事件处理器（带引号和不带引号的形式）
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    // 移除危险协议
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    // 移除剩余 HTML 标签（保留纯文本内容）
    .replace(/<[^>]*>/g, '')
    .trim()
}

export function xssFilterMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
}

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_TTL = 30 * 60 * 1000 // 30 分钟有效期

/**
 * 生成 CSRF token（HMAC-SHA256，基于 csrfSecret + 随机 nonce + 时间戳）
 *
 * Token 格式：{nonce}.{timestamp}.{signature}
 * - nonce：16 字节随机数，防止重放
 * - timestamp：生成时间，用于过期校验
 * - signature：HMAC-SHA256(secret, nonce.timestamp)，防止伪造
 */
function generateCsrfToken(secret: string): string {
  const nonce = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now().toString()
  const payload = `${nonce}.${timestamp}`
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${signature}`
}

/**
 * 验证 CSRF token 的签名与有效期
 */
function verifyCsrfToken(token: string, secret: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [nonce, timestamp, signature] = parts
    if (!nonce || !timestamp || !signature) return false

    const ts = parseInt(timestamp, 10)
    if (Number.isNaN(ts)) return false
    const age = Date.now() - ts
    if (age > CSRF_TOKEN_TTL || age < 0) return false

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${nonce}.${timestamp}`)
      .digest('hex')

    // 长度不一致时直接返回，避免 timingSafeEqual 抛出异常
    if (signature.length !== expectedSig.length) return false
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
  } catch {
    return false
  }
}

export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = config.security.csrfSecret
  if (!secret) {
    logger.warn('CSRF secret not configured, skipping CSRF token generation')
    next()
    return
  }
  const token = generateCsrfToken(secret)
  res.setHeader('X-CSRF-Token', token)
  // 双提交 Cookie 模式：cookie 需前端 JS 读取后放入自定义 header，故 httpOnly=false
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: config.env === 'production',
    path: '/',
    maxAge: CSRF_TOKEN_TTL,
  })
  next()
}

export function csrfProtectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  // GET/HEAD/OPTIONS 不修改服务端状态，跳过校验
  const allowedMethods = ['GET', 'HEAD', 'OPTIONS']
  if (allowedMethods.includes(req.method)) {
    return next()
  }

  // test 环境跳过校验
  if (process.env.NODE_ENV === 'test') {
    return next()
  }

  const secret = config.security.csrfSecret
  if (!secret) {
    logger.error('CSRF secret not configured, rejecting mutating request')
    return errorResponse(res, '服务器安全配置异常', 1500, 500)
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined

  if (!headerToken || !cookieToken) {
    logger.warn('CSRF token missing (header or cookie) for path: %s', req.path)
    return errorResponse(res, 'CSRF token missing', 403, 403)
  }

  // 双提交模式：header 与 cookie 中的 token 必须一致（使用 timingSafeEqual 防时序攻击）
  if (headerToken.length !== cookieToken.length) {
    return errorResponse(res, 'CSRF token invalid', 403, 403)
  }
  let tokensMatch: boolean
  try {
    tokensMatch = crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))
  } catch {
    return errorResponse(res, 'CSRF token invalid', 403, 403)
  }
  if (!tokensMatch) {
    return errorResponse(res, 'CSRF token invalid', 403, 403)
  }

  // 验证 token 签名与有效期（防止攻击者伪造任意值）
  if (!verifyCsrfToken(cookieToken, secret)) {
    logger.warn('CSRF token signature/expiry invalid for path: %s', req.path)
    return errorResponse(res, 'CSRF token invalid or expired', 403, 403)
  }

  next()
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
}

export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction): void {
  sanitizeInput(req, res, next)
}

export function forceHttpsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production' && req.protocol === 'http') {
    return res.redirect(`https://${req.hostname}${req.originalUrl}`)
  }
  next()
}

export const securityMiddleware = {
  rateLimitRegister,
  rateLimitVerifyCode,
  validateInput,
  sanitizeInput,
  xssFilterMiddleware,
  csrfTokenMiddleware,
  csrfProtectionMiddleware,
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  forceHttpsMiddleware,
}

export default securityMiddleware
