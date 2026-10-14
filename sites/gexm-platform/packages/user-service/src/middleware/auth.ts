import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import config from '../config'
import userModel from '../models/userModel'
import { errorResponse } from '../utils/response'
import { AUTH_ERRORS } from '../constants/errorCodes'

export interface AuthenticatedUser {
  id: string
  username: string
  role: string
  email: string
  avatar: string
  phone: string
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
  userId?: string
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    errorResponse(res, AUTH_ERRORS.UNAUTHORIZED.message, AUTH_ERRORS.UNAUTHORIZED.code, AUTH_ERRORS.UNAUTHORIZED.httpStatus)
    return
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; username: string; role: string }
    const user = userModel.findById(decoded.id)

    if (!user) {
      errorResponse(res, AUTH_ERRORS.INVALID_TOKEN.message, AUTH_ERRORS.INVALID_TOKEN.code, AUTH_ERRORS.INVALID_TOKEN.httpStatus)
      return
    }

    const sanitizedUser = userModel.sanitizeUser(user)
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: sanitizedUser?.email || '',
      avatar: user.avatar,
      phone: sanitizedUser?.phone || '',
    }
    req.userId = user.id

    next()
  } catch (error) {
    if ((error as Error).name === 'TokenExpiredError') {
      errorResponse(res, AUTH_ERRORS.TOKEN_EXPIRED.message, AUTH_ERRORS.TOKEN_EXPIRED.code, AUTH_ERRORS.TOKEN_EXPIRED.httpStatus)
    } else {
      errorResponse(res, AUTH_ERRORS.INVALID_TOKEN.message, AUTH_ERRORS.INVALID_TOKEN.code, AUTH_ERRORS.INVALID_TOKEN.httpStatus)
    }
  }
}

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    errorResponse(res, AUTH_ERRORS.FORBIDDEN.message, AUTH_ERRORS.FORBIDDEN.code, AUTH_ERRORS.FORBIDDEN.httpStatus)
    return
  }
  next()
}