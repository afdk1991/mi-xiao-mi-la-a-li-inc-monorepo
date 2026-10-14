// @ts-nocheck
import type { Request, Response } from 'express'
import couponModel from '../models/couponModel'
import { successResponse, errorResponse, paginate } from '../utils/response'

interface ApplyParams {
  couponId: string
  totalAmount: number | string
}

interface UseCouponParams {
  couponId: string
  orderId: string
}

const errorCodeMap: Record<string, { code: number; status: number }> = {
  优惠券不存在: { code: 1004, status: 404 },
  优惠券已失效: { code: 3501, status: 400 },
  优惠券尚未开始: { code: 3502, status: 400 },
  优惠券已过期: { code: 3503, status: 400 },
  优惠券已被领完: { code: 3504, status: 400 },
  您已达到领取上限: { code: 3505, status: 400 },
  优惠券不存在或不属于您: { code: 3506, status: 400 },
  优惠券已使用或已过期: { code: 3507, status: 400 },
}

const couponController = {
  async getAvailable(_req: Request, res: Response): Promise<Response> {
    try {
      const now = Date.now()
      const availableCoupons = couponModel.findAvailable(now)
      return successResponse(res, availableCoupons, '获取成功')
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '获取失败', 1001, 400)
    }
  },

  async getMine(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const { status } = req.query as { status?: string }
      const userCoupons = couponModel.findUserCoupons(userId, status)
      return successResponse(res, userCoupons, '获取成功')
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '获取失败', 1001, 400)
    }
  },

  async claim(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const id = req.params.id as string
      const result = couponModel.claimCoupon(userId, id)
      return successResponse(res, result, '领取成功', 0, 201)
    } catch (error) {
      const err = error as Error
      const errorInfo = errorCodeMap[err.message] || { code: 1001, status: 400 }
      return errorResponse(res, err.message, errorInfo.code, errorInfo.status)
    }
  },

  async apply(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const { couponId, totalAmount } = req.body as ApplyParams

      if (!couponId) {
        return errorResponse(res, '优惠券ID不能为空', 1001, 400)
      }

      const amount = parseFloat(String(totalAmount))
      if (isNaN(amount) || amount <= 0) {
        return errorResponse(res, '订单金额必须大于0', 1001, 400)
      }

      const userCoupon = couponModel.findUserCouponById(couponId, userId)
      if (!userCoupon) {
        return errorResponse(res, '优惠券不存在或不属于您', 3506, 400)
      }

      if (userCoupon.status !== 'unused') {
        return errorResponse(res, '优惠券已使用或已过期', 3507, 400)
      }

      if (userCoupon.end_time < new Date().toISOString()) {
        return errorResponse(res, '优惠券已过期', 3503, 400)
      }

      if (amount < userCoupon.min_amount) {
        return errorResponse(res, `订单金额未达到使用门槛 ${userCoupon.min_amount} 元`, 3508, 400)
      }

      let discount = 0
      if (userCoupon.type === 'fixed') {
        discount = userCoupon.value
      } else if (userCoupon.type === 'percent') {
        discount = amount * (1 - userCoupon.value / 100)
      }

      discount = Math.min(discount, userCoupon.max_discount || discount)
      const finalAmount = Math.max(0, amount - discount)

      return successResponse(
        res,
        {
          coupon_id: couponId,
          discount: discount.toFixed(2),
          final_amount: finalAmount.toFixed(2),
        },
        '计算成功'
      )
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '计算失败', 1001, 400)
    }
  },

  async useCoupon(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id
      const { couponId, orderId } = req.body as UseCouponParams

      if (!couponId || !orderId) {
        return errorResponse(res, '优惠券ID和订单ID不能为空', 1001, 400)
      }

      const result = couponModel.useCoupon(couponId, userId, orderId)
      return successResponse(res, result, '使用成功')
    } catch (error) {
      const err = error as Error
      const errorInfo = errorCodeMap[err.message] || { code: 1001, status: 400 }
      return errorResponse(res, err.message, errorInfo.code, errorInfo.status)
    }
  },

  async adminCreate(req: Request, res: Response): Promise<Response> {
    try {
      const {
        name,
        type,
        value,
        min_amount,
        max_discount,
        total_quantity,
        per_user_limit,
        start_time,
        end_time,
        status = 'active',
      } = req.body

      if (!name) {
        return errorResponse(res, '优惠券名称不能为空', 1001, 400)
      }

      if (!['fixed', 'percent'].includes(type)) {
        return errorResponse(res, '无效的优惠券类型', 1001, 400)
      }

      const val = parseFloat(String(value))
      if (isNaN(val) || val <= 0) {
        return errorResponse(res, '优惠值必须大于0', 1001, 400)
      }

      const minAmt = parseFloat(String(min_amount))
      if (isNaN(minAmt) || minAmt < 0) {
        return errorResponse(res, '最低消费金额不能为负数', 1001, 400)
      }

      const coupon = couponModel.create({
        name,
        type,
        value: val,
        min_amount: minAmt,
        max_discount: max_discount ? parseFloat(String(max_discount)) : null,
        total_quantity: parseInt(String(total_quantity), 10) || 0,
        per_user_limit: parseInt(String(per_user_limit), 10) || 1,
        start_time: start_time
          ? new Date(String(start_time)).toISOString()
          : new Date().toISOString(),
        end_time: end_time
          ? new Date(String(end_time)).toISOString()
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status,
      })

      return successResponse(res, coupon, '创建成功', 0, 201)
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '创建失败', 1001, 400)
    }
  },

  async adminList(req: Request, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
      } = req.query as { page?: number | string; pageSize?: number | string; status?: string }
      const result = couponModel.findAll(
        parseInt(String(page), 10),
        parseInt(String(pageSize), 10),
        status
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
      const err = error as Error
      return errorResponse(res, err.message || '获取失败', 1001, 400)
    }
  },

  async adminUpdate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params as { id: string }

      const existing = couponModel.findById(id)
      if (!existing) {
        return errorResponse(res, '优惠券不存在', 1004, 404)
      }

      const {
        name,
        type,
        value,
        min_amount,
        max_discount,
        total_quantity,
        per_user_limit,
        start_time,
        end_time,
        status,
      } = req.body

      const coupon = couponModel.update(id, {
        name,
        type,
        value: value !== undefined ? parseFloat(String(value)) : undefined,
        min_amount: min_amount !== undefined ? parseFloat(String(min_amount)) : undefined,
        max_discount: max_discount !== undefined ? parseFloat(String(max_discount)) : undefined,
        total_quantity:
          total_quantity !== undefined ? parseInt(String(total_quantity), 10) || 0 : undefined,
        per_user_limit:
          per_user_limit !== undefined ? parseInt(String(per_user_limit), 10) || 1 : undefined,
        start_time: start_time ? new Date(String(start_time)).getTime() : undefined,
        end_time: end_time ? new Date(String(end_time)).getTime() : undefined,
        status,
      })

      return successResponse(res, coupon, '更新成功')
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '更新失败', 1001, 400)
    }
  },

  async adminDelete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params as { id: string }

      const existing = couponModel.findById(id)
      if (!existing) {
        return errorResponse(res, '优惠券不存在', 1004, 404)
      }

      couponModel.delete(id)
      return successResponse(res, null, '删除成功')
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '删除失败', 1001, 400)
    }
  },

  async adminIssue(req: Request, res: Response): Promise<Response> {
    try {
      const { couponId, userIds } = req.body as { couponId: string; userIds: string[] }

      if (!couponId) {
        return errorResponse(res, '优惠券ID不能为空', 1001, 400)
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return errorResponse(res, '用户ID列表不能为空', 1001, 400)
      }

      const issuedIds = couponModel.batchIssue(couponId, userIds)

      return successResponse(
        res,
        { issued: issuedIds.length },
        `发放成功，共发放${issuedIds.length}张`
      )
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '发放失败', 1001, 400)
    }
  },
}

export default couponController
