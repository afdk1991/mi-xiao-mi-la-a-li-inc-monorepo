import type { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'
import { errorResponse, unifiedErrorResponse } from '../utils/response'
import { AUTH_ERRORS, GENERAL_ERRORS } from '../constants/errorCodes'

declare global {
  interface Error {
    type?: string
    code?: string | number
    status?: number
    errors?: Array<{ msg: string; param: string; location: string }>
  }
}

function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error: %s', err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  })

  if (err.type === 'entity.too.large') {
    errorResponse(res, '文件大小超出限制', 1001, 413)
    return
  }

  if (err.errors && Array.isArray(err.errors)) {
    const messages = err.errors.map((e) => `${e.param}: ${e.msg}`).join('; ')
    errorResponse(res, messages, 1001, 400)
    return
  }

  if (err.status) {
    const errorCode =
      typeof err.code === 'number' ? err.code : err.code ? parseInt(String(err.code), 10) : 1001
    errorResponse(res, err.message || '请求错误', isNaN(errorCode) ? 1001 : errorCode, err.status)
    return
  }

  if (err.message.includes('invalid signature')) {
    unifiedErrorResponse(res, AUTH_ERRORS.INVALID_TOKEN)
    return
  }

  if (err.message.includes('jwt expired')) {
    unifiedErrorResponse(res, AUTH_ERRORS.TOKEN_EXPIRED)
    return
  }

  if (err.message.includes('not found')) {
    unifiedErrorResponse(res, GENERAL_ERRORS.NOT_FOUND)
    return
  }

  if (err.message.includes('permission') || err.message.includes('无权')) {
    unifiedErrorResponse(res, AUTH_ERRORS.FORBIDDEN)
    return
  }

  errorResponse(res, '服务器内部错误', 1005, 500)
}

function notFoundHandler(req: Request, res: Response): void {
  errorResponse(res, '接口不存在', 1004, 404)
}

export { errorHandler, notFoundHandler }
