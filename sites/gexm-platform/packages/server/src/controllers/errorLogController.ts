// @ts-nocheck
import type { Request, Response } from 'express'
import errorLogModel from '../models/errorLogModel'
import { successResponse, paginate } from '../utils/response'
import logger from '../utils/logger'

interface ErrorLogData {
  userId: string | null
  platform: string
  appVersion: string
  errorType: string
  errorMessage: string
  stackTrace: string
  userAgent: string
}

interface FindAllOptions {
  page: number
  pageSize: number
  platform?: string
  errorType?: string
}

const errorLogController = {
  async report(req: Request, res: Response): Promise<Response> {
    try {
      const { platform, appVersion, errorType, errorMessage, stackTrace, userAgent } = req.body

      const result = errorLogModel.create({
        userId: (req as Request & { userId?: string }).userId || null,
        platform,
        appVersion,
        errorType,
        errorMessage,
        stackTrace,
        userAgent,
      } as ErrorLogData)

      logger.warn('Error reported from client: %s', errorMessage, {
        platform,
        appVersion,
        errorType,
        userId: (req as Request & { userId?: string }).userId,
      })

      return successResponse(res, result, '上报成功')
    } catch (err) {
      logger.error('Error report failed:', err)
      return successResponse(res, null, '上报失败', 1)
    }
  },

  async getLogs(req: Request, res: Response): Promise<Response> {
    const { page = 1, pageSize = 20, platform = '', errorType = '' } = req.query
    const pageNum = parseInt(String(page), 10)
    const pageSizeNum = parseInt(String(pageSize), 10)

    try {
      const { logs, total } = errorLogModel.findAll({
        page: pageNum,
        pageSize: pageSizeNum,
        platform,
        errorType,
      } as FindAllOptions)

      return successResponse(res, paginate(logs, total, pageNum, pageSizeNum), '获取成功')
    } catch (err) {
      logger.error('Get error logs failed:', err)
      return successResponse(res, paginate([], 0, pageNum, pageSizeNum), '获取失败', 1)
    }
  },

  async getStats(req: Request, res: Response): Promise<Response> {
    try {
      const { days = 7 } = req.query
      const stats = errorLogModel.getStats(parseInt(String(days), 10))
      return successResponse(res, stats, '获取成功')
    } catch (err) {
      logger.error('Get error stats failed:', err)
      return successResponse(res, null, '获取失败', 1)
    }
  },
}

export default errorLogController
