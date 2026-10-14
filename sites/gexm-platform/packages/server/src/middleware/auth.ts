import jwt from 'jsonwebtoken'
import config from '../config'
import userModel from '../models/userModel'
import cacheService from '../services/cacheService'
import { errorResponse } from '../utils/response'
import type { Request, Response, NextFunction } from 'express'

// 用户信息缓存 TTL（5 分钟）
const USER_CACHE_TTL = 300

export interface AuthenticatedUser {
  id: string
  username: string
  email: string
  phone: string
  role: string
  status: string
  avatar: string
  points: number
  level_id: string
  [key: string]: unknown
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      userId?: string
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, '未提供认证令牌', 1002, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as { id: string }

    const userId = decoded.id
    const cacheKey = `auth:user:${userId}`

    // 先从缓存查找用户
    let user = (await cacheService.get(cacheKey)) as AuthenticatedUser | null

    // 缓存未命中 → 查询 DB 并写入缓存
    if (!user) {
      const dbUser = userModel.findById(userId)
      if (!dbUser) {
        await cacheService.del(cacheKey)
        return errorResponse(res, '用户不存在', 1002, 401)
      }
      if (dbUser.status !== 'active') {
        await cacheService.del(cacheKey)
        return errorResponse(res, '账号已被禁用', 1003, 403)
      }
      const sanitized = userModel.sanitizeUser(dbUser)
      if (sanitized) {
        user = sanitized as AuthenticatedUser
        await cacheService.set(cacheKey, user, USER_CACHE_TTL)
      }
    }

    if (!user) {
      return errorResponse(res, '用户不存在', 1002, 401)
    }

    req.user = user
    req.userId = user.id
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return errorResponse(res, '令牌已过期', 1007, 401)
    }
    return errorResponse(res, '无效的认证令牌', 1008, 401)
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): Response | void {
  if (req.user?.role !== 'admin') {
    return errorResponse(res, '需要管理员权限', 1003, 403)
  }
  next()
}

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as { id: string }

      const userId = decoded.id
      const cacheKey = `auth:user:${userId}`

      // 先从缓存查找用户
      let user = (await cacheService.get(cacheKey)) as AuthenticatedUser | null

      // 缓存未命中 → 查询 DB 并写入缓存
      if (!user) {
        const dbUser = userModel.findById(userId)
        if (dbUser && dbUser.status === 'active') {
          const sanitized = userModel.sanitizeUser(dbUser)
          if (sanitized) {
            user = sanitized as AuthenticatedUser
            await cacheService.set(cacheKey, user, USER_CACHE_TTL)
          }
        } else {
          // 用户不存在或状态异常，清除缓存
          await cacheService.del(cacheKey)
        }
      }

      if (user) {
        req.user = user
        req.userId = user.id
      }
    } catch {
      // Token 无效时继续，不报错
    }
  }

  next()
}

export const verifyToken = authMiddleware
export const verifyAdmin = adminMiddleware

export default {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  verifyToken,
  verifyAdmin,
}
