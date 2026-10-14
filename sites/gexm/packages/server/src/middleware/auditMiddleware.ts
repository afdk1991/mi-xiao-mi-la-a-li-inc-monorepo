import type { Request, Response, NextFunction } from 'express'
import auditLogModel from '../models/auditLogModel'
import logger from '../utils/logger'

// 审计日志选项接口
interface AuditOptions {
  getBeforeData?: (req: Request) => unknown | Promise<unknown>
  getAfterData?: (req: Request, responseData: unknown) => unknown | Promise<unknown>
  getResourceIdFn?: (req: Request) => string | null
}

// 扩展的 Response 类型
type AuditedResponse = Response & { auditData?: unknown }

function getClientIp(req: Request): string | null {
  const xForwardedFor = req.headers['x-forwarded-for']
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0]?.trim() || null
  }
  if (Array.isArray(xForwardedFor)) {
    return (xForwardedFor[0] as string)?.split(',')[0]?.trim() || null
  }
  return (
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    (req as Request & { connection?: { remoteAddress?: string } }).connection?.remoteAddress ||
    null
  )
}

function getResourceId(req: Request): string | null {
  const params = req.params as Record<string, string | string[]>
  if (params.id) {
    return Array.isArray(params.id) ? params.id[0] : params.id
  }
  if (params.userId) {
    return Array.isArray(params.userId) ? params.userId[0] : params.userId
  }
  if (params.couponId) {
    return Array.isArray(params.couponId) ? params.couponId[0] : params.couponId
  }
  if (params.orderId) {
    return Array.isArray(params.orderId) ? params.orderId[0] : params.orderId
  }
  if (req.body?.ids && Array.isArray(req.body.ids)) {
    return req.body.ids.join(',')
  }
  return null
}

function auditLog(action: string, resourceType: string, options: AuditOptions = {}) {
  const { getBeforeData = null, getAfterData = null, getResourceIdFn = null } = options

  return async function auditMiddleware(
    req: Request,
    res: AuditedResponse,
    next: NextFunction
  ): Promise<void> {
    const originalJson = res.json.bind(res) as (body?: unknown) => unknown
    const originalSend = res.send.bind(res) as (body?: unknown) => unknown

    let beforeData: unknown = null

    try {
      if (typeof getBeforeData === 'function') {
        beforeData = await Promise.resolve(getBeforeData(req))
      }
    } catch (err) {
      logger.warn('Audit: getBeforeData failed:', (err as Error).message)
    }

    const writeAuditLog = async (
      status: string,
      errorMessage: string | null = null,
      responseData: unknown = null
    ): Promise<void> => {
      try {
        let afterData: unknown = null

        if (typeof getAfterData === 'function') {
          try {
            afterData = await Promise.resolve(getAfterData(req, responseData))
          } catch (err) {
            logger.warn('Audit: getAfterData failed:', (err as Error).message)
          }
        } else if (
          status === 'success' &&
          responseData &&
          (responseData as Record<string, unknown>).data
        ) {
          afterData = (responseData as Record<string, unknown>).data
        }

        const resourceId = getResourceIdFn
          ? typeof getResourceIdFn === 'function'
            ? getResourceIdFn(req)
            : null
          : getResourceId(req)

        const user = req as Request & {
          user?: { id?: string; nickname?: string; username?: string }
        }
        const adminName = user.user?.nickname || user.user?.username || null

        const logData = {
          admin_id: user.user?.id || null,
          admin_name: adminName,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          before_data: beforeData as Record<string, unknown> | null,
          after_data: afterData as Record<string, unknown> | null,
          ip: getClientIp(req),
          user_agent: req.headers['user-agent'] || null,
          status,
          error_message: errorMessage,
        }

        auditLogModel.createAsync(logData)
      } catch (err) {
        logger.error('Audit log write failed:', (err as Error).message)
      }
    }

    // 使用类型断言覆盖响应方法以捕获审计数据
    ;(res.json as unknown as (data: unknown) => unknown) = function (data: unknown) {
      const responseData = data as Record<string, unknown>
      const status = responseData && responseData.code === 0 ? 'success' : 'failed'
      const errorMessage =
        responseData && responseData.code !== 0 ? (responseData.message as string) : null

      writeAuditLog(status, errorMessage, data)

      return originalJson(data)
    }

    ;(res.send as unknown as (data: unknown) => unknown) = function (data: unknown) {
      return originalSend(data)
    }

    next()
  }
}

export default auditLog
