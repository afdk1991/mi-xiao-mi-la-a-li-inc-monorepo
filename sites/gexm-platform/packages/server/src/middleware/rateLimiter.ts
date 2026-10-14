/**
 * 速率限制中间件
 * 防止暴力破解、API滥用和消息轰炸
 */
import rateLimit from 'express-rate-limit'
import type { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

const isTestEnv = process.env.NODE_ENV === 'test'

function createRateLimiter(options: Record<string, unknown>) {
  if (isTestEnv) {
    return (_req: Request, _res: Response, next: NextFunction) => next()
  }
  return rateLimit(options as Parameters<typeof rateLimit>[0])
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const readLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1020,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Read rate limit exceeded for IP: %s, path: %s', req.ip, req.path)
    res.status(429).json({
      code: 1020,
      message: '请求过于频繁，请稍后再试',
      data: null,
      timestamp: Date.now(),
    })
  },
})

const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1020,
    message: '操作过于频繁，请稍后再试',
    data: null,
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Write rate limit exceeded for IP: %s, path: %s', req.ip, req.path)
    res.status(429).json({
      code: 1020,
      message: '操作过于频繁，请稍后再试',
      data: null,
      timestamp: Date.now(),
    })
  },
})

function apiLimiter(req: Request, res: Response, next: NextFunction): void {
  if (READ_METHODS.has(req.method.toUpperCase())) {
    readLimiter(req, res, next)
  } else {
    writeLimiter(req, res, next)
  }
}

const loginLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1021,
    message: '登录尝试过于频繁，请 5 分钟后再试',
    data: null,
  },
  handler: (req: Request, _res: Response) => {
    logger.warn('Login rate limit exceeded for IP: %s', req.ip)
  },
})

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1022,
    message: '注册请求过于频繁，请 1 小时后再试',
    data: null,
  },
  handler: (req: Request, _res: Response) => {
    logger.warn('Register rate limit exceeded for IP: %s', req.ip)
  },
})

const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1023,
    message: '发送消息过于频繁，请稍后再试',
    data: null,
  },
  handler: (req: Request, _res: Response) => {
    logger.warn(
      'Message rate limit exceeded for user: %s, IP: %s',
      (req as Request & { user?: { id: string } }).user?.id,
      req.ip
    )
  },
})

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1024,
    message: '文件上传过于频繁，请稍后再试',
    data: null,
  },
  handler: (req: Request, _res: Response) => {
    logger.warn(
      'Upload rate limit exceeded for user: %s, IP: %s',
      (req as Request & { user?: { id: string } }).user?.id,
      req.ip
    )
  },
})

const oauthLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1025,
    message: 'OAuth登录尝试过于频繁，请 5 分钟后再试',
    data: null,
  },
  handler: (req: Request, _res: Response) => {
    logger.warn('OAuth rate limit exceeded for IP: %s, provider: %s', req.ip, req.params.provider)
  },
})

const oauthBindLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1026,
    message: '账号绑定操作过于频繁，请 1 小时后再试',
    data: null,
  },
  handler: (req: Request, _res: Response) => {
    logger.warn(
      'OAuth bind rate limit exceeded for user: %s, IP: %s',
      (req as Request & { user?: { id: string } }).user?.id,
      req.ip
    )
  },
})

export {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  messageLimiter,
  uploadLimiter,
  oauthLimiter,
  oauthBindLimiter,
}
