// @ts-nocheck
import type { Request, Response } from 'express'
import { successResponse, errorResponse, paginate } from '../utils/response'
import checkinModel from '../models/checkinModel'

const checkinController = {
  async checkin(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const result = checkinModel.checkin(userId)

      return successResponse(
        res,
        {
          record: result,
          message:
            result.consecutive_days > 1
              ? `签到成功！连续签到${result.consecutive_days}天，获得${result.points_earned}积分`
              : '签到成功！获得10积分',
        },
        '签到成功'
      )
    } catch (error) {
      if ((error as Error).message === '今日已签到') {
        return errorResponse(res, '今日已签到', 3901, 400)
      }
      return errorResponse(res, (error as Error).message || '签到失败', 1001, 400)
    }
  },

  async getHistory(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { page = 1, pageSize = 30 } = req.query

      const result = checkinModel.findByUser(
        userId,
        parseInt(String(page), 10),
        parseInt(String(pageSize), 10)
      )

      return successResponse(
        res,
        paginate(
          result.data,
          result.total,
          parseInt(String(page), 10),
          parseInt(String(pageSize), 10)
        ),
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async getStats(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const stats = checkinModel.getStats(userId)

      return successResponse(res, stats, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async getCalendar(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { year, month } = req.query

      const result = checkinModel.getCalendar(
        userId,
        year ? parseInt(String(year), 10) : undefined,
        month !== undefined ? parseInt(String(month), 10) : undefined
      )

      return successResponse(res, result, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminGetConfig(req: Request, res: Response): Promise<Response> {
    try {
      const config = checkinModel.getConfig()
      return successResponse(res, config, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminUpdateConfig(req: Request, res: Response): Promise<Response> {
    try {
      const { daily_points, consecutive_bonus, max_consecutive_days } = req.body

      const config = checkinModel.getConfig()

      if (daily_points !== undefined) {
        const points = parseInt(String(daily_points), 10)
        if (isNaN(points) || points < 0) {
          return errorResponse(res, '每日积分必须大于等于0', 1001, 400)
        }
        config.daily_points = points
      }

      if (consecutive_bonus !== undefined && Array.isArray(consecutive_bonus)) {
        config.consecutive_bonus = consecutive_bonus.map(
          (p: unknown) => parseInt(String(p), 10) || 0
        )
      }

      if (max_consecutive_days !== undefined) {
        const max = parseInt(String(max_consecutive_days), 10)
        if (isNaN(max) || max < 1) {
          return errorResponse(res, '最大连续天数必须大于0', 1001, 400)
        }
        config.max_consecutive_days = max
      }

      return successResponse(res, config, '更新成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '更新失败', 1001, 400)
    }
  },

  async adminGetStats(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.query.userId ? String(req.query.userId) : null
      const stats = checkinModel.adminGetStats(userId)

      return successResponse(res, stats, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },
}

export default checkinController
