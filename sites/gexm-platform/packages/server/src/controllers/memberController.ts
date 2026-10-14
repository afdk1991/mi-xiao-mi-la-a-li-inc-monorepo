// @ts-nocheck
import type { Request, Response } from 'express'
import { successResponse, errorResponse, paginate, asyncHandler } from '../utils/response'
import memberModel from '../models/memberModel'
import { GENERAL_ERRORS, BUSINESS_ERRORS } from '../constants/errorCodes'

interface MemberLevel {
  id: string
  name: string
  min_points: number
  discount_rate: number
  sort_order: number
}

interface UserPoints {
  user_id: string
  balance: number
  total_earned: number
  total_spent: number
  level?: MemberLevel
  created_at: string
  updated_at: string
}

interface ExchangeItem {
  id: number
  name: string
  points_required: number
  coupon_value?: number
  min_amount?: number
  type?: string
  duration?: number
}

const memberController = {
  // 使用 asyncHandler 包装，统一处理控制器异常
  getMemberInfo: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''
    const userPoints = memberModel.getUserPoints(userId) as UserPoints

    return successResponse(
      res,
      {
        user_id: userId,
        points: userPoints.balance,
        level_id: userPoints.level?.id || 'LVL1',
        level_name: userPoints.level?.name || '普通会员',
        discount: userPoints.level?.discount_rate || 1,
        total_spent: userPoints.total_spent,
        order_count: 0,
        created_at: userPoints.created_at,
        updated_at: userPoints.updated_at,
      },
      '获取成功'
    )
  }),

  // 使用 asyncHandler 包装，统一处理控制器异常
  getMemberLevel: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''
    const userPoints = memberModel.getUserPoints(userId) as UserPoints

    return successResponse(
      res,
      {
        level_id: userPoints.level?.id || 'LVL1',
        level_name: userPoints.level?.name || '普通会员',
        discount_rate: userPoints.level?.discount_rate || 1,
        min_points: userPoints.level?.min_points || 0,
      },
      '获取成功'
    )
  }),

  // 使用 asyncHandler 包装，统一处理控制器异常
  getPointsBalance: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''
    const userPoints = memberModel.getUserPoints(userId) as UserPoints

    return successResponse(
      res,
      {
        balance: userPoints.balance,
        total_earned: userPoints.total_earned,
        total_spent: userPoints.total_spent,
      },
      '获取成功'
    )
  }),

  // 使用 asyncHandler 包装，统一处理控制器异常
  getGrowthValue: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''
    const userPoints = memberModel.getUserPoints(userId) as UserPoints
    const allLevels = memberModel.findAllLevels()
    const sortedLevels = [...allLevels].sort((a, b) => a.min_points - b.min_points)
    const currentLevelIndex = sortedLevels.findIndex((l) => l.id === userPoints.level?.id)
    const nextLevel =
      currentLevelIndex < sortedLevels.length - 1 ? sortedLevels[currentLevelIndex + 1] : null
    const currentLevel = sortedLevels[currentLevelIndex] || sortedLevels[0]
    const progress = nextLevel
      ? ((userPoints.balance - currentLevel.min_points) /
          (nextLevel.min_points - currentLevel.min_points)) *
        100
      : 100

    return successResponse(
      res,
      {
        current_points: userPoints.balance,
        next_level_min_points: nextLevel?.min_points || 0,
        progress: Math.min(100, Math.max(0, progress)),
        growth_value: userPoints.balance,
      },
      '获取成功'
    )
  }),

  // 使用 asyncHandler 包装，统一处理控制器异常
  getMemberBenefits: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''
    const userPoints = memberModel.getUserPoints(userId) as UserPoints
    const benefits = []

    if (userPoints.level?.discount_rate && userPoints.level.discount_rate < 1) {
      benefits.push({
        type: 'discount',
        value: userPoints.level.discount_rate,
        description: `会员专属折扣 ${(1 - userPoints.level.discount_rate) * 100}% OFF`,
      })
    }
    benefits.push({
      type: 'points',
      value: userPoints.balance,
      description: `当前积分 ${userPoints.balance}`,
    })

    return successResponse(res, { benefits }, '获取成功')
  }),

  // 使用 asyncHandler 包装，统一处理控制器异常
  getNextLevelInfo: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''
    const userPoints = memberModel.getUserPoints(userId) as UserPoints
    const allLevels = memberModel.findAllLevels()
    const sortedLevels = [...allLevels].sort((a, b) => a.min_points - b.min_points)
    const currentLevelIndex = sortedLevels.findIndex((l) => l.id === userPoints.level?.id)
    const nextLevel =
      currentLevelIndex < sortedLevels.length - 1 ? sortedLevels[currentLevelIndex + 1] : null

    if (nextLevel) {
      const pointsNeeded = nextLevel.min_points - userPoints.balance

      return successResponse(
        res,
        {
          next_level_id: nextLevel.id,
          next_level_name: nextLevel.name,
          next_level_discount: nextLevel.discount_rate,
          points_needed: Math.max(0, pointsNeeded),
          current_points: userPoints.balance,
          next_level_min_points: nextLevel.min_points,
        },
        '获取成功'
      )
    }

    return successResponse(res, { message: '已达到最高等级', next_level_id: null }, '获取成功')
  }),

  async getPointLogs(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const page = parseInt(String(req.query.page || 1), 10)
      const pageSize = parseInt(String(req.query.pageSize || 20), 10)
      const type = req.query.type as 'earn' | 'spend' | undefined

      const result = memberModel.findPointLogs(userId, page, pageSize, type)

      return successResponse(res, paginate(result.data, result.total, page, pageSize), '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async earnPoints(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { amount, reason, orderId } = req.body

      if (!amount) {
        return errorResponse(
          res,
          '积分数量不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const points = parseInt(String(amount), 10)
      if (isNaN(points) || points <= 0) {
        return errorResponse(
          res,
          '积分数量必须大于0',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const result = memberModel.earnPoints(userId, points, reason || '积分入账', orderId)

      return successResponse(res, { points: result.balance, log: result }, '积分入账成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '积分入账失败', 1001, 400)
    }
  },

  async spendPoints(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { amount, reason, orderId } = req.body

      if (!amount) {
        return errorResponse(
          res,
          '积分数量不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const points = parseInt(String(amount), 10)
      if (isNaN(points) || points <= 0) {
        return errorResponse(
          res,
          '积分数量必须大于0',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const result = memberModel.spendPoints(userId, points, reason || '积分消费', orderId)

      return successResponse(res, { points: result.balance, log: result }, '积分消费成功')
    } catch (error) {
      if ((error as Error).message === '积分不足') {
        return errorResponse(
          res,
          '积分不足',
          BUSINESS_ERRORS.INSUFFICIENT_POINTS.code,
          BUSINESS_ERRORS.INSUFFICIENT_POINTS.httpStatus
        )
      }
      return errorResponse(res, (error as Error).message || '积分消费失败', 1001, 400)
    }
  },

  async exchangePoints(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { exchangeId } = req.body

      if (!exchangeId) {
        return errorResponse(
          res,
          '兑换项ID不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const exchangeItems: ExchangeItem[] = [
        { id: 1, name: '10元优惠券', points_required: 1000, coupon_value: 10, min_amount: 50 },
        { id: 2, name: '免运费券', points_required: 500, type: 'shipping_free' },
        { id: 3, name: '双倍积分卡', points_required: 2000, type: 'double_points', duration: 7 },
      ]

      const item = exchangeItems.find((i) => i.id === parseInt(String(exchangeId), 10))
      if (!item) {
        return errorResponse(
          res,
          '兑换项不存在',
          BUSINESS_ERRORS.REWARD_ITEM_NOT_FOUND.code,
          BUSINESS_ERRORS.REWARD_ITEM_NOT_FOUND.httpStatus
        )
      }

      const userPoints = memberModel.getUserPoints(userId) as UserPoints
      if (userPoints.balance < item.points_required) {
        return errorResponse(
          res,
          '积分不足',
          BUSINESS_ERRORS.INSUFFICIENT_POINTS.code,
          BUSINESS_ERRORS.INSUFFICIENT_POINTS.httpStatus
        )
      }

      const result = memberModel.spendPoints(userId, item.points_required, `兑换${item.name}`)

      return successResponse(
        res,
        {
          points: result.balance,
          exchanged_item: item,
        },
        '兑换成功'
      )
    } catch (error) {
      if ((error as Error).message === '积分不足') {
        return errorResponse(
          res,
          '积分不足',
          BUSINESS_ERRORS.INSUFFICIENT_POINTS.code,
          BUSINESS_ERRORS.INSUFFICIENT_POINTS.httpStatus
        )
      }
      return errorResponse(res, (error as Error).message || '兑换失败', 1001, 400)
    }
  },

  async adminGetLevels(req: Request, res: Response): Promise<Response> {
    try {
      const levels = memberModel.findAllLevels()
      return successResponse(res, levels, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminUpdateLevel(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id as string
      const name = req.body.name as string | undefined
      const minPoints = req.body.min_points as string | undefined
      const discount = req.body.discount as string | undefined
      const icon = req.body.icon as string | undefined

      const existing = memberModel.findLevelById(id)
      if (!existing) {
        return errorResponse(
          res,
          '会员等级不存在',
          BUSINESS_ERRORS.MEMBER_LEVEL_NOT_FOUND.code,
          BUSINESS_ERRORS.MEMBER_LEVEL_NOT_FOUND.httpStatus
        )
      }

      const level = memberModel.updateLevel(id, {
        name,
        min_points: minPoints !== undefined ? parseInt(String(minPoints), 10) : undefined,
        discount_rate: discount !== undefined ? parseFloat(String(discount)) : undefined,
        sort_order: icon !== undefined ? parseInt(String(icon), 10) : undefined,
      })

      return successResponse(res, level, '更新成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '更新失败', 1001, 400)
    }
  },

  async adminGetMember(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.userId as string
      const member = memberModel.adminGetMember(userId)

      if (!member) {
        return errorResponse(
          res,
          '会员信息不存在',
          BUSINESS_ERRORS.MEMBER_NOT_FOUND.code,
          BUSINESS_ERRORS.MEMBER_NOT_FOUND.httpStatus
        )
      }

      return successResponse(res, member, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminListMembers(req: Request, res: Response): Promise<Response> {
    try {
      const page = parseInt(String(req.query.page || 1), 10)
      const pageSize = parseInt(String(req.query.pageSize || 20), 10)
      const levelId = req.query.level_id as string | undefined

      const result = memberModel.adminListMembers(page, pageSize, levelId)

      return successResponse(res, paginate(result.data, result.total, page, pageSize), '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminAdjustPoints(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.userId as string
      const amount = req.body.amount as string | number
      const reason = req.body.reason as string | undefined

      if (!amount) {
        return errorResponse(
          res,
          '积分数量不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const points = parseInt(String(amount), 10)
      if (isNaN(points)) {
        return errorResponse(
          res,
          '积分数量格式错误',
          GENERAL_ERRORS.INVALID_FORMAT.code,
          GENERAL_ERRORS.INVALID_FORMAT.httpStatus
        )
      }

      const result = memberModel.adminAdjustPoints(userId, points, reason)

      return successResponse(
        res,
        { points: result.balance },
        points > 0 ? '积分增加成功' : '积分扣除成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '调整失败', 1001, 400)
    }
  },
}

export default memberController
