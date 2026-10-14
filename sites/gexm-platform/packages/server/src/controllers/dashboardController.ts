// @ts-nocheck
import type { Request, Response } from 'express'
import statisticsService from '../services/statisticsService'
import { successResponse } from '../utils/response'

const dashboardController = {
  async getDashboardOverview(req: Request, res: Response) {
    const result = await statisticsService.getDashboardOverview()
    return successResponse(res, result, '获取成功')
  },

  async getOrderTrend(req: Request, res: Response) {
    const { period = 'day', startDate, endDate } = req.query
    const result = await statisticsService.getOrderTrend(
      String(period),
      String(startDate),
      String(endDate)
    )
    return successResponse(res, result, '获取成功')
  },

  async getProductRank(req: Request, res: Response) {
    const { topN = 10, startDate, endDate } = req.query
    const result = await statisticsService.getProductRank(
      parseInt(String(topN), 10),
      String(startDate),
      String(endDate)
    )
    return successResponse(res, result, '获取成功')
  },

  async getUserTrend(req: Request, res: Response) {
    const { period = 'day', startDate, endDate } = req.query
    const result = await statisticsService.getUserTrend(
      String(period),
      String(startDate),
      String(endDate)
    )
    return successResponse(res, result, '获取成功')
  },

  async getConversion(req: Request, res: Response) {
    const { startDate, endDate } = req.query
    const result = await statisticsService.getConversion(String(startDate), String(endDate))
    return successResponse(res, result, '获取成功')
  },

  async getPaymentStats(req: Request, res: Response) {
    const { startDate, endDate } = req.query
    const result = await statisticsService.getPaymentStats(String(startDate), String(endDate))
    return successResponse(res, result, '获取成功')
  },

  async getRefundStats(req: Request, res: Response) {
    const { startDate, endDate } = req.query
    const result = await statisticsService.getRefundStats(String(startDate), String(endDate))
    return successResponse(res, result, '获取成功')
  },

  async getCouponStats(req: Request, res: Response) {
    const { startDate, endDate } = req.query
    const result = await statisticsService.getCouponStats(String(startDate), String(endDate))
    return successResponse(res, result, '获取成功')
  },
}

export default dashboardController
