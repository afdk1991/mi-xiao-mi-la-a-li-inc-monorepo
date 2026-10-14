// @ts-nocheck
import type { Request, Response } from 'express'
import { successResponse, errorResponse, paginate, getParamStr } from '../utils/response'
import auditLogModel from '../models/auditLogModel'
import { GENERAL_ERRORS } from '../constants/errorCodes'

interface FindAllOptions {
  page: number
  pageSize: number
  adminId?: string
  action?: string
  resourceType?: string
  startDate?: string
  endDate?: string
}

interface GetStatsOptions {
  startDate?: string
  endDate?: string
}

const auditController = {
  async getLogs(req: Request, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        pageSize = 20,
        admin_id,
        module,
        action,
        start_date,
        end_date,
        resourceType,
        adminId,
        startDate,
        endDate,
      } = req.query

      const resultData = auditLogModel.findAll({
        page: parseInt(String(page), 10),
        pageSize: parseInt(String(pageSize), 10),
        adminId: admin_id || adminId,
        action,
        resourceType: module || resourceType,
        startDate: start_date || startDate,
        endDate: end_date || endDate,
      } as FindAllOptions)

      return successResponse(
        res,
        paginate(
          resultData.data,
          resultData.total,
          parseInt(String(page), 10),
          parseInt(String(pageSize), 10)
        ),
        '获取成功'
      )
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async getLogDetail(req: Request, res: Response): Promise<Response> {
    try {
      const id = getParamStr(req.params.id)
      const log = auditLogModel.findById(id)

      if (!log) {
        return errorResponse(res, '日志不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      }

      return successResponse(res, log, '获取成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async getStats(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate, start_date, end_date } = req.query
      const stats = auditLogModel.getStats({
        startDate: start_date || startDate,
        endDate: end_date || endDate,
      } as GetStatsOptions)
      return successResponse(res, stats, '获取成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },
}

export default auditController
