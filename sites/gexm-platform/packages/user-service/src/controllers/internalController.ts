import type { Request, Response } from 'express'
import userModel from '../models/userModel'
import addressModel from '../models/addressModel'
import { successResponse, errorResponse } from '../utils/response'
import logger from '../utils/logger'

interface BatchGetBody {
  ids: string[]
}

interface DeductPointsBody {
  points: number
  reason: string
  orderId?: string
}

interface AddPointsBody {
  points: number
  reason: string
  orderId?: string
}

const internalController = {
  getUserById(req: Request, res: Response): void {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const user = userModel.findById(String(id))

    if (!user) {
      errorResponse(res, '用户不存在', 1002, 404)
      return
    }

    successResponse(res, userModel.sanitizeUser(user), '获取成功')
  },

  batchGetUsers(req: Request, res: Response): void {
    const { ids } = req.body as BatchGetBody

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      errorResponse(res, '用户ID列表不能为空', 1001, 400)
      return
    }

    const users: unknown[] = []
    for (const id of ids) {
      const user = userModel.findById(id)
      if (user) {
        users.push(userModel.sanitizeUser(user))
      }
    }

    successResponse(res, { users, total: users.length }, '获取成功')
  },

  getUserPoints(req: Request, res: Response): void {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const user = userModel.findById(String(id))

    if (!user) {
      errorResponse(res, '用户不存在', 1002, 404)
      return
    }

    successResponse(
      res,
      { userId: user.id, points: user.points, levelId: user.level_id },
      '获取成功'
    )
  },

  deductPoints(req: Request, res: Response): void {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { points, reason, orderId } = req.body as DeductPointsBody

    if (!points || points <= 0) {
      errorResponse(res, '积分数量无效', 1001, 400)
      return
    }

    const user = userModel.findById(String(id))
    if (!user) {
      errorResponse(res, '用户不存在', 1002, 404)
      return
    }

    if (user.points < points) {
      errorResponse(res, '积分不足', 2003, 400)
      return
    }

    const updated = userModel.update(id, { points: user.points - points })

    logger.info('Points deducted', { userId: id, points, reason, orderId })
    successResponse(res, { userId: id, points: updated?.points }, '扣减成功')
  },

  addPoints(req: Request, res: Response): void {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { points, reason, orderId } = req.body as AddPointsBody

    if (!points || points <= 0) {
      errorResponse(res, '积分数量无效', 1001, 400)
      return
    }

    const user = userModel.findById(String(id))
    if (!user) {
      errorResponse(res, '用户不存在', 1002, 404)
      return
    }

    const updated = userModel.update(id, { points: user.points + points })

    logger.info('Points added', { userId: id, points, reason, orderId })
    successResponse(res, { userId: id, points: updated?.points }, '增加成功')
  },

  getUserAddresses(req: Request, res: Response): void {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
    const addresses = addressModel.findByUserId(userId)
    successResponse(res, addresses, '获取成功')
  },

  getDefaultAddress(req: Request, res: Response): void {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
    const address = addressModel.findDefault(userId)

    if (!address) {
      errorResponse(res, '默认地址不存在', 2001, 404)
      return
    }

    successResponse(res, address, '获取成功')
  },
}

export default internalController
