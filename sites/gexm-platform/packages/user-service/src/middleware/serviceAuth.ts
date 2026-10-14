import type { Request, Response, NextFunction } from 'express'
import config from '../config'
import { errorResponse } from '../utils/response'
import logger from '../utils/logger'

export function serviceAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const serviceToken = req.headers['x-service-token'] as string

  if (!config.serviceAuth.enabled) {
    next()
    return
  }

  if (!serviceToken) {
    errorResponse(res, '缺少服务认证令牌', 1006, 401)
    return
  }

  if (serviceToken !== config.serviceAuth.secret) {
    logger.warn('Invalid service token attempted')
    errorResponse(res, '服务认证令牌无效', 1006, 401)
    return
  }

  next()
}
