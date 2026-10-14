// @ts-nocheck
import type { Request, Response } from 'express'
import notificationModel from '../models/notificationModel'
import { successResponse, paginate, getParamStr } from '../utils/response'

interface FindByUserIdOptions {
  page: number
  pageSize: number
  unreadOnly: boolean
}

const notificationController = {
  async getNotifications(req: Request, res: Response): Promise<Response> {
    const { page = 1, pageSize = 20, unreadOnly = 'false' } = req.query
    const userId = (req as Request & { userId?: string }).userId || ''

    const { notifications, total } = notificationModel.findByUserId(userId, {
      page: parseInt(String(page), 10),
      pageSize: parseInt(String(pageSize), 10),
      unreadOnly: unreadOnly === 'true',
    } as FindByUserIdOptions)

    return successResponse(
      res,
      paginate(notifications, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
      '获取成功'
    )
  },

  async getUnreadCount(req: Request, res: Response): Promise<Response> {
    const userId = (req as Request & { userId?: string }).userId || ''
    const count = notificationModel.getUnreadCount(userId)
    return successResponse(res, { count }, '获取成功')
  },

  async markAsRead(req: Request, res: Response): Promise<Response> {
    const id = getParamStr(req.params.id)
    const userId = (req as Request & { userId?: string }).userId || ''
    const notification = notificationModel.markAsRead(userId, id)

    if (!notification) {
      return successResponse(res, null, '通知不存在')
    }

    return successResponse(res, notification, '已标记为已读')
  },

  async markAllAsRead(req: Request, res: Response): Promise<Response> {
    const userId = (req as Request & { userId?: string }).userId || ''
    const count = notificationModel.markAllAsRead(userId)
    return successResponse(res, { count }, `已标记 ${count} 条为已读`)
  },
}

export default notificationController
