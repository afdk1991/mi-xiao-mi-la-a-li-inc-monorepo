import type { Request, Response } from 'express'
import crypto from 'crypto'
import { getDb } from '../models'
import orderModel from '../models/orderModel'
import paymentModel, { type PaymentMethod, PAYMENT_METHODS } from '../models/paymentModel'
import userModel from '../models/userModel'
import { successResponse, errorResponse, requireUser } from '../utils/response'
import config from '../config'
import { getGateway, type PaymentGateway } from '../services/paymentGateways'
import { GENERAL_ERRORS, AUTH_ERRORS, BUSINESS_ERRORS } from '../constants/errorCodes'
import type { AuthenticatedUser } from '../middleware/auth'

const PAYMENT_SECRET = config.payment?.secret || ''

/**
 * 延迟校验 PAYMENT_SECRET 配置，避免模块加载时直接崩溃导致整个应用无法启动。
 * 在实际使用支付功能时才进行校验，允许应用在未配置支付密钥时启动（如测试环境）。
 */
function ensurePaymentSecretConfigured(): void {
  if (!PAYMENT_SECRET || PAYMENT_SECRET.length < 32) {
    throw new Error('PAYMENT_SECRET must be configured and at least 32 characters long')
  }
}

interface SignData {
  [key: string]: unknown
  sign?: string
}

interface PayParams {
  orderId: string
  payMethod: string
}

interface CallbackData {
  out_trade_no?: string
  paymentNo?: string
  orderNo?: string
  transaction_id?: string
  trade_no?: string
  thirdPartyNo?: string
  success?: boolean
  status?: string
  failure_reason?: string
  reason?: string
  [key: string]: unknown
}

interface PaymentQueryParams {
  page?: number | string
  pageSize?: number | string
  status?: string
  payMethod?: string
}

interface PaymentResult {
  paymentId: string
  paymentNo: string
  orderId: string
  amount: number
  payMethod: string
  status: string
}

interface PaymentStatusResult {
  orderId: string
  orderStatus: string
  payAmount: number
  payMethod: string | null
  payTime: string | null
  paymentStatus: string | null
  paymentNo: string | null
  paymentId: string | null
}

export function buildSignString(data: SignData): string {
  const sortedKeys = Object.keys(data).sort()
  return sortedKeys
    .filter(
      (key) =>
        key !== 'sign' &&
        key !== 'key' &&
        data[key] !== undefined &&
        data[key] !== null &&
        data[key] !== ''
    )
    .map((key) => `${key}=${String(data[key])}`)
    .join('&')
}

export function generateSignHMACSHA256(data: SignData, secret = PAYMENT_SECRET): string {
  const signStr = buildSignString(data)
  return crypto.createHmac('sha256', secret).update(signStr).digest('hex').toUpperCase()
}

export function verifySign(data: SignData, secret = PAYMENT_SECRET): boolean {
  if (!data.sign) {
    return false
  }
  const sign = String(data.sign).toUpperCase()
  const hmacSign = generateSignHMACSHA256(data, secret)
  const a = Buffer.from(sign)
  const b = Buffer.from(hmacSign)
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

const paymentController = {
  async pay(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const { orderId, payMethod } = req.body as PayParams

      if (!orderId || !payMethod) {
        return errorResponse(
          res,
          '订单ID和支付方式不能为空',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      if (!PAYMENT_METHODS.includes(payMethod as PaymentMethod)) {
        return errorResponse(
          res,
          '无效的支付方式',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const order = orderModel.findById(orderId)
      if (!order) {
        return errorResponse(
          res,
          '订单不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      if (order.user_id !== userId) {
        return errorResponse(
          res,
          '无权操作该订单',
          AUTH_ERRORS.FORBIDDEN.code,
          AUTH_ERRORS.FORBIDDEN.httpStatus
        )
      }

      if (order.status !== 'pending') {
        return errorResponse(
          res,
          '订单状态不支持支付',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const existingPayment = paymentModel.findLatestByOrderId(orderId)
      if (existingPayment && existingPayment.status === 'pending') {
        return errorResponse(
          res,
          '该订单已有待支付的记录',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      if (payMethod === 'balance') {
        const balance = userModel.getBalance(userId)
        if (balance < order.pay_amount) {
          return errorResponse(
            res,
            '余额不足，请充值后再试',
            BUSINESS_ERRORS.INSUFFICIENT_BALANCE.code,
            BUSINESS_ERRORS.INSUFFICIENT_BALANCE.httpStatus
          )
        }
      }

      const payment = paymentModel.create({
        order_id: orderId,
        user_id: userId,
        pay_method: payMethod as PaymentMethod,
        amount: order.pay_amount,
      })

      if (payMethod === 'mock' || payMethod === 'balance') {
        const db = getDb()
        const payTransaction = db.transaction(() => {
          const now = new Date().toISOString()
          const thirdPartyNo = payMethod === 'mock' ? 'MOCK' + Date.now() : 'BAL' + Date.now()

          if (payMethod === 'balance') {
            const deductSuccess = userModel.deductBalance(userId, order.pay_amount)
            if (!deductSuccess) {
              throw new Error('余额扣款失败，余额不足')
            }
          }

          paymentModel.updateStatus(payment.id, 'success', {
            third_party_no: thirdPartyNo,
            paid_at: now,
            callback_data: JSON.stringify({ method: payMethod, success: true }),
          })

          orderModel.updateStatus(orderId, 'paid', {
            pay_method: payMethod,
            pay_time: now,
          })

          const items = orderModel.getOrderItems(orderId)
          for (const item of items) {
            db.prepare('UPDATE products SET sales = sales + ? WHERE id = ?').run(
              item.quantity,
              item.product_id
            )
          }
        })

        try {
          payTransaction()
        } catch (error) {
          const err = error as Error
          paymentModel.updateStatus(payment.id, 'failed', {
            failure_reason: err.message,
          })
          return errorResponse(
            res,
            err.message || '支付失败',
            BUSINESS_ERRORS.PAYMENT_FAILED.code,
            400
          )
        }

        const mockResult: PaymentResult = {
          paymentId: payment.id,
          paymentNo: payment.payment_no,
          orderId,
          amount: order.pay_amount,
          payMethod,
          status: 'success',
        }

        return successResponse(res, mockResult, '支付成功')
      }

      if (payMethod === 'wechat' || payMethod === 'alipay') {
        const gateway = getGateway(payMethod)
        if (!gateway) {
          return errorResponse(
            res,
            `${payMethod === 'wechat' ? '微信' : '支付宝'}支付网关未配置，请联系管理员`,
            3402,
            500
          )
        }

        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1'

        let gatewayResult: Record<string, unknown> = {}

        if (payMethod === 'wechat') {
          const wechatGateway = gateway as PaymentGateway
          if ('unifiedOrder' in wechatGateway && wechatGateway.unifiedOrder) {
            gatewayResult = await wechatGateway.unifiedOrder({
              body: order.order_no || '订单支付',
              outTradeNo: payment.payment_no,
              totalFee: Math.round(order.pay_amount * 100),
              spbillCreateIp: clientIp,
              tradeType: 'JSAPI',
            })
          }
        } else {
          const alipayGateway = gateway as PaymentGateway
          if ('tradeCreate' in alipayGateway && alipayGateway.tradeCreate) {
            gatewayResult = await alipayGateway.tradeCreate({
              outTradeNo: payment.payment_no,
              totalAmount: order.pay_amount,
              subject: order.order_no || '订单支付',
              body: order.remark || '',
            })
          }
        }

        if (!gatewayResult || !gatewayResult.success) {
          paymentModel.updateStatus(payment.id, 'failed', {
            failure_reason: String(gatewayResult?.message || '支付下单失败'),
          })
          return errorResponse(res, String(gatewayResult?.message) || '支付下单失败', 3401, 400)
        }

        const result: Record<string, unknown> = {
          paymentId: payment.id,
          paymentNo: payment.payment_no,
          orderId,
          amount: order.pay_amount,
          payMethod,
          status: 'pending',
          gatewayResult,
        }

        return successResponse(res, result, '支付发起成功')
      }

      const result: PaymentResult = {
        paymentId: payment.id,
        paymentNo: payment.payment_no,
        orderId,
        amount: order.pay_amount,
        payMethod,
        status: 'pending',
      }

      return successResponse(res, result, '支付发起成功')
    } catch (error) {
      const err = error as Error
      return errorResponse(res, err.message || '支付发起失败', 1001, 400)
    }
  },

  async callback(req: Request, res: Response): Promise<Response> {
    try {
      const { method } = req.params as { method?: string }
      const callbackData = req.body as CallbackData

      if (!verifySign(callbackData)) {
        return errorResponse(res, '验签失败', BUSINESS_ERRORS.PAYMENT_SIGN_VERIFY_FAILED.code, 400)
      }

      const db = getDb()

      const paymentNo = callbackData.out_trade_no || callbackData.paymentNo || callbackData.orderNo
      const thirdPartyNo =
        callbackData.transaction_id || callbackData.trade_no || callbackData.thirdPartyNo
      const success = callbackData.success !== false && callbackData.status === 'success'

      if (!paymentNo) {
        return errorResponse(res, '缺少支付流水号', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      }

      const payment = paymentModel.findByPaymentNo(paymentNo)
      if (!payment) {
        return errorResponse(res, '支付记录不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      }

      if (payment.status !== 'pending') {
        return successResponse(res, { status: payment.status }, '支付状态已处理')
      }

      const order = orderModel.findById(payment.order_id)
      if (!order) {
        return errorResponse(res, '订单不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      }

      // 校验回调金额，防止金额篡改
      if (success) {
        const callbackAmount = Number(
          callbackData.total_amount || callbackData.amount || callbackData.totalAmount || 0
        )
        if (callbackAmount > 0 && Math.abs(order.pay_amount - callbackAmount) > 0.01) {
          paymentModel.updateStatus(payment.id, 'failed', {
            failure_reason: `金额不匹配: 期望${order.pay_amount}, 实际${callbackAmount}`,
            callback_data: JSON.stringify(callbackData),
          })
          return errorResponse(
            res,
            '支付金额校验失败',
            BUSINESS_ERRORS.PAYMENT_AMOUNT_MISMATCH.code,
            BUSINESS_ERRORS.PAYMENT_AMOUNT_MISMATCH.httpStatus
          )
        }
      }

      const callbackTransaction = db.transaction(() => {
        const now = new Date().toISOString()

        if (success) {
          paymentModel.updateStatus(payment.id, 'success', {
            third_party_no: thirdPartyNo,
            paid_at: now,
            callback_data: JSON.stringify(callbackData),
          })

          if (order.status === 'pending') {
            orderModel.updateStatus(order.id, 'paid', {
              pay_method: method,
              pay_time: now,
            })

            const items = orderModel.getOrderItems(order.id)
            for (const item of items) {
              db.prepare('UPDATE products SET sales = sales + ? WHERE id = ?').run(
                item.quantity,
                item.product_id
              )
            }
          }
        } else {
          paymentModel.updateStatus(payment.id, 'failed', {
            third_party_no: thirdPartyNo,
            failure_reason: callbackData.failure_reason || callbackData.reason || '支付失败',
            callback_data: JSON.stringify(callbackData),
          })
        }
      })

      callbackTransaction()

      return successResponse(res, { success: true }, '回调处理成功')
    } catch (error) {
      const err = error as Error
      return errorResponse(
        res,
        err.message || '回调处理失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const { orderId } = req.params as { orderId: string }

      const order = orderModel.findById(orderId)
      if (!order) {
        errorResponse(res, '订单不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
        return
      }

      if (order.user_id !== userId) {
        errorResponse(res, '无权查看该订单', AUTH_ERRORS.FORBIDDEN.code, 403)
        return
      }

      const payment = paymentModel.findLatestByOrderId(orderId)

      const result: PaymentStatusResult = {
        orderId,
        orderStatus: order.status,
        payAmount: order.pay_amount,
        payMethod: order.pay_method,
        payTime: order.pay_time,
        paymentStatus: payment ? payment.status : null,
        paymentNo: payment ? payment.payment_no : null,
        paymentId: payment ? payment.id : null,
      }

      successResponse(res, result, '获取成功')
    } catch (error) {
      const err = error as Error
      errorResponse(
        res,
        err.message || '获取支付状态失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async queryPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const { orderId } = req.params as { orderId: string }

      const order = orderModel.findById(orderId)
      if (!order) {
        errorResponse(res, '订单不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
        return
      }

      if (order.user_id !== userId) {
        errorResponse(res, '无权查看该订单', AUTH_ERRORS.FORBIDDEN.code, 403)
        return
      }

      const payment = paymentModel.findLatestByOrderId(orderId)
      if (!payment) {
        successResponse(res, { status: 'unpaid' }, '订单未发起支付')
        return
      }

      let status = payment.status
      let thirdPartyNo = payment.third_party_no
      let paidAt = payment.paid_at

      if (payment.status === 'pending') {
        if (payment.pay_method === 'mock') {
          status = 'success'
          thirdPartyNo = 'MOCK' + Date.now()
          paidAt = new Date().toISOString()
        }
      }

      successResponse(
        res,
        {
          paymentId: payment.id,
          paymentNo: payment.payment_no,
          orderId,
          status,
          payMethod: payment.pay_method,
          amount: payment.amount,
          thirdPartyNo,
          paidAt,
          createdAt: payment.created_at,
        },
        '查询成功'
      )
    } catch (error) {
      const err = error as Error
      errorResponse(res, err.message || '查询支付状态失败', 1001, 400)
    }
  },

  async closePayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const { orderId } = req.params as { orderId: string }

      const order = orderModel.findById(orderId)
      if (!order) {
        errorResponse(res, '订单不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
        return
      }

      if (order.user_id !== userId) {
        errorResponse(res, '无权操作该订单', AUTH_ERRORS.FORBIDDEN.code, 403)
        return
      }

      const payment = paymentModel.findLatestByOrderId(orderId)
      if (!payment) {
        errorResponse(res, '支付记录不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
        return
      }

      if (payment.status !== 'pending') {
        errorResponse(res, '当前支付状态不支持关闭', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
        return
      }

      const db = getDb()
      const closeTransaction = db.transaction(() => {
        const now = new Date().toISOString()

        paymentModel.updateStatus(payment.id, 'cancelled', {
          closed_at: now,
          failure_reason: '用户主动关闭支付',
        })
      })

      closeTransaction()

      successResponse(
        res,
        {
          paymentId: payment.id,
          status: 'cancelled',
        },
        '支付已关闭'
      )
    } catch (error) {
      const err = error as Error
      errorResponse(res, err.message || '关闭支付失败', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
    }
  },

  async getPaymentList(req: Request, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const { page = 1, pageSize = 20, status, payMethod } = req.query as PaymentQueryParams

      const result = paymentModel.findByUserId(userId, {
        page: parseInt(String(page), 10),
        pageSize: parseInt(String(pageSize), 10),
        status,
        payMethod,
      })

      successResponse(
        res,
        {
          list: result.payments,
          total: result.total,
          page: parseInt(String(page), 10),
          pageSize: parseInt(String(pageSize), 10),
          totalPages: Math.ceil(result.total / parseInt(String(pageSize), 10)) || 0,
        },
        '获取成功'
      )
    } catch (error) {
      const err = error as Error
      errorResponse(
        res,
        err.message || '获取支付列表失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async getPaymentDetail(req: Request, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const { id } = req.params as { id: string }

      const payment = paymentModel.findById(id)
      if (!payment) {
        errorResponse(res, '支付记录不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
        return
      }

      if (payment.user_id !== userId && req.user?.role !== 'admin') {
        errorResponse(res, '无权查看该支付记录', AUTH_ERRORS.FORBIDDEN.code, 403)
        return
      }

      successResponse(res, payment, '获取成功')
    } catch (error) {
      const err = error as Error
      errorResponse(res, err.message || '获取支付详情失败', 1001, 400)
    }
  },
}

export default paymentController
