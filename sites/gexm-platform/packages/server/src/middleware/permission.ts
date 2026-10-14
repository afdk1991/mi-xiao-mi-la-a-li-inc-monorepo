import roleModel from '../models/roleModel'
import { errorResponse } from '../utils/response'
import type { Request, Response, NextFunction } from 'express'

export function requirePermission(resource: string, action: string) {
  return function (req: Request, res: Response, next: NextFunction): Response | void {
    if (!req.user) {
      return errorResponse(res, '未认证', 1002, 401)
    }

    const hasPerm = roleModel.hasPermission(req.user.role, resource, action)

    if (!hasPerm) {
      return errorResponse(res, '权限不足', 1003, 403)
    }

    next()
  }
}

export function requireRole(roles: string[]) {
  return function (req: Request, res: Response, next: NextFunction): Response | void {
    if (!req.user) {
      return errorResponse(res, '未认证', 1002, 401)
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, '权限不足', 1003, 403)
    }

    next()
  }
}

export const permissionMiddleware = requirePermission
export const roleMiddleware = requireRole

export default {
  requirePermission,
  requireRole,
  permissionMiddleware,
  roleMiddleware,
}
