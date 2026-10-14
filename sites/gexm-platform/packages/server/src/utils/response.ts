import { v4 as uuidv4 } from 'uuid'
import { Request, Response } from 'express'
import { getErrorType, getErrorDetail, AUTH_ERRORS, GENERAL_ERRORS } from '../constants/errorCodes'
import type { ApiResponse, PaginatedResponse } from '@gexm/shared'
import logger from './logger'

export function generateId(prefix?: string): string {
  const uuid = uuidv4()
  if (prefix) {
    return `${prefix}${uuid.replace(/-/g, '').substring(0, 12)}`
  }
  return uuid
}

export function successResponse<T = unknown>(
  res: Response,
  data: T = null as T,
  message: string = '操作成功',
  code: number = 0,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    code,
    message,
    data,
    timestamp: Date.now(),
    requestId: generateId(),
  }
  return res.status(statusCode).json(response)
}

export function errorResponse(
  res: Response,
  message: string = '操作失败',
  code: number = 1000,
  statusCode: number = 400
): Response {
  const response: ApiResponse<null> = {
    code,
    message,
    data: null,
    timestamp: Date.now(),
    requestId: generateId(),
  }
  return res.status(statusCode).json(response)
}

/**
 * 异步控制器包装器，统一错误处理
 * 自动捕获控制器函数中的异常，返回统一格式的服务器内部错误响应
 * @param fn 异步控制器函数，接收 req 和 res，返回 Promise<Response | void>
 * @returns 包装后的控制器函数，异常时返回 500 错误响应
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response) => Promise<Response | void>
): (req: T, res: Response) => Promise<void> {
  return async (req: T, res: Response) => {
    try {
      await fn(req, res)
    } catch (error) {
      // 记录控制器异常日志，便于问题定位与追溯
      logger.error('Controller error:', error)
      // 返回统一格式的服务器内部错误响应，使用标准错误码常量
      errorResponse(
        res,
        '服务器内部错误',
        GENERAL_ERRORS.INTERNAL_ERROR.code,
        GENERAL_ERRORS.INTERNAL_ERROR.httpStatus
      )
    }
  }
}

export function requireUser(req: Request, res: Response): string | null {
  const userId = req.user?.id
  if (!userId) {
    errorResponse(res, '用户未登录', AUTH_ERRORS.UNAUTHORIZED.code, 401)
    return null
  }
  return userId
}

interface ErrorDetail {
  code: number
  message: string
  httpStatus: number
}

type ErrorDef = string | number | ErrorDetail

export function unifiedErrorResponse(
  res: Response,
  errorDef: ErrorDef,
  overrideCode?: number,
  overrideStatus?: number
): Response {
  let errorDetail: ErrorDetail

  if (typeof errorDef === 'object' && 'code' in errorDef) {
    errorDetail = errorDef
  } else if (typeof errorDef === 'number') {
    errorDetail = getErrorDetail(errorDef)
  } else {
    errorDetail = {
      code: overrideCode || 1000,
      message: errorDef,
      httpStatus: overrideStatus || 500,
    }
  }

  const code = overrideCode || errorDetail.code
  const httpStatus = overrideStatus || errorDetail.httpStatus

  const response = {
    code,
    message: errorDetail.message,
    errorType: getErrorType(code),
    data: null,
    timestamp: Date.now(),
    requestId: generateId(),
  }

  return res.status(httpStatus).json(response)
}

export function authError(res: Response, errorDef: ErrorDef): Response {
  return unifiedErrorResponse(res, errorDef)
}

export function businessError(res: Response, errorDef: ErrorDef): Response {
  return unifiedErrorResponse(res, errorDef)
}

export function resourceError(res: Response, errorDef: ErrorDef): Response {
  return unifiedErrorResponse(res, errorDef)
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number | string,
  pageSize: number | string
): PaginatedResponse<T> {
  const pageNum = parseInt(page as string, 10) || 1
  const pageSizeNum = parseInt(pageSize as string, 10) || 10
  const totalNum = parseInt(total as unknown as string, 10) || 0
  return {
    list: data,
    total: totalNum,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(totalNum / pageSizeNum) || 0,
  }
}

export function paginateMeta(total: number, page: number | string, pageSize: number | string) {
  const pageNum = parseInt(page as string, 10) || 1
  const pageSizeNum = parseInt(pageSize as string, 10) || 10
  const totalNum = parseInt(total as unknown as string, 10) || 0
  return {
    total: totalNum,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(totalNum / pageSizeNum) || 0,
  }
}

export function getParamStr(value: string | string[] | undefined): string {
  if (!value) {
    return ''
  }
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value
}

export function getQueryStr(value: unknown): string | undefined {
  if (!value) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return String(value[0])
  }
  return undefined
}
