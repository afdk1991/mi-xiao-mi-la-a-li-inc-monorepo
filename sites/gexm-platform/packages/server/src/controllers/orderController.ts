// @ts-nocheck
import type { Request, Response } from 'express'
import orderModel from '../models/orderModel'
import orderService from '../services/orderService'
import { successResponse, errorResponse, requireUser, paginate } from '../utils/response'
import { GENERAL_ERRORS, AUTH_ERRORS, BUSINESS_ERRORS } from '../constants/errorCodes'
import type { AuthenticatedUser } from '../middleware/auth'

type OrderStatus =
  'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunding' | 'refunded'

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

interface UpdateStatusBody {
  status?: OrderStatus
  remark?: string
}

interface BatchUpdateStatusBody {
  ids?: string[]
  status?: OrderStatus
  remark?: string
}

interface ShipOrderBody {
  shippingCompany?: string
  shippingNo?: string
}

interface AddLogisticsBody {
  location?: string
  description?: string
  status?: string
}

interface AuditRefundBody {
  approved?: boolean
  remark?: string
}

interface DirectBuyItem {
  productId: string
  skuId?: string
  quantity: number
}

interface PreviewOrderBody {
  type?: 'cart' | 'direct'
  cartItemIds?: string[]
  items?: DirectBuyItem[]
  addressId?: string
  couponId?: string
  usePoints?: boolean
}

interface CreateOrderBody {
  type?: 'cart' | 'direct'
  cartItemIds?: string[]
  items?: DirectBuyItem[]
  addressId?: string
  remark?: string
  couponId?: string
  usePoints?: boolean
}

interface CancelOrderBody {
  cancelReason?: string
}

interface ApplyRefundBody {
  reason?: string
  refundAmount?: number
}

const orderController = {
  async getAllOrders(req: Request, res: Response): Promise<Response> {
    const page = parseInt(String(req.query.page || 1), 10)
    const pageSize = parseInt(String(req.query.pageSize || 20), 10)
    const status = req.query.status ? String(req.query.status) : undefined
    const orderNo = req.query.orderNo ? String(req.query.orderNo) : undefined
    const userId = req.query.userId ? String(req.query.userId) : undefined
    const startTime = String(req.query.startTime || '')
    const endTime = String(req.query.endTime || '')

    const { orders, total } = orderService.getAllOrders({
      page,
      pageSize,
      status,
      orderNo,
      userId,
      startTime,
      endTime,
    })

    return successResponse(res, paginate(orders, total, page, pageSize), '获取成功')
  },

  async getOrderDetail(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const order = orderModel.getDetail(String(id))
    if (!order) {
      return errorResponse(res, '订单不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
    }

    if (order.user_id !== req.user?.id && req.user?.role !== 'admin') {
      return errorResponse(res, '无权查看该订单', AUTH_ERRORS.FORBIDDEN.code, 403)
    }

    return successResponse(res, order, '获取成功')
  },

  async updateOrderStatus(req: Request, res: Response): Promise<Response> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { status, remark } = req.body as UpdateStatusBody

    const order = orderModel.findById(String(id))
    if (!order) {
      return errorResponse(res, '订单不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
    }

    const validStatuses: OrderStatus[] = [
      'pending',
      'paid',
      'shipped',
      'completed',
      'cancelled',
      'refunding',
      'refunded',
    ]
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, '无效的订单状态', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
    }

    const updatedOrder = orderModel.updateStatus(String(id), status, { remark })

    return successResponse(res, updatedOrder, '更新成功')
  },

  async batchUpdateOrderStatus(req: Request, res: Response): Promise<Response> {
    const { ids, status, remark } = req.body as BatchUpdateStatusBody

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, '请选择要操作的订单', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
    }

    const validStatuses: OrderStatus[] = [
      'pending',
      'paid',
      'shipped',
      'completed',
      'cancelled',
      'refunding',
      'refunded',
    ]
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, '无效的订单状态', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
    }

    ids.forEach((orderId) => {
      orderModel.updateStatus(String(orderId), status, { remark })
    })

    return successResponse(res, { count: ids.length }, '批量更新成功')
  },

  async shipOrder(req: Request, res: Response): Promise<Response> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const { shippingCompany, shippingNo } = req.body as ShipOrderBody

      if (!shippingCompany || !shippingNo) {
        return errorResponse(
          res,
          '物流公司和运单号不能为空',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          400
        )
      }

      const order = orderService.shipOrder(String(id), {
        shippingCompany: String(shippingCompany),
        shippingNo: String(shippingNo),
      })
      return successResponse(res, order, '发货成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '发货失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async addLogistics(req: Request, res: Response): Promise<Response> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const { location, description, status } = req.body as AddLogisticsBody

      if (!status) {
        return errorResponse(res, '物流状态不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      }

      const logisticsId = orderService.addLogistics(String(id), {
        location: String(location),
        description: String(description),
        status: String(status),
      })
      return successResponse(res, { id: logisticsId }, '添加成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '添加物流信息失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async getOrderLogistics(req: Request, res: Response): Promise<Response> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

      const logistics = orderService.getLogistics(String(id), null)
      return successResponse(res, logistics, '获取成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '获取物流信息失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async auditRefund(req: Request, res: Response): Promise<Response> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const { approved, remark } = req.body as AuditRefundBody

      if (approved === undefined || approved === null) {
        return errorResponse(
          res,
          '审核结果不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const order = orderService.auditRefund(String(id), {
        approved: !!approved,
        remark: String(remark),
      })
      return successResponse(res, order, approved ? '退款审核通过' : '退款审核拒绝')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '退款审核失败', 1001, 400)
    }
  },

  async getOrderStatistics(req: Request, res: Response): Promise<Response> {
    const startTime = String(req.query.startTime || '')
    const endTime = String(req.query.endTime || '')

    const stats = orderModel.getStatistics(startTime, endTime)

    return successResponse(res, stats, '获取成功')
  },

  async getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const page = parseInt(String(req.query.page || 1), 10)
      const pageSize = parseInt(String(req.query.pageSize || 10), 10)
      const status = req.query.status ? String(req.query.status) : ''

      const { orders, total } = orderService.getOrderList(userId, {
        page,
        pageSize,
        status,
      })

      successResponse(res, paginate(orders, total, page, pageSize), '获取成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '获取订单列表失败', 1001, 400)
    }
  },

  async previewOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const {
        type = 'cart',
        cartItemIds = [],
        items = [],
        addressId,
        couponId,
        usePoints,
      } = req.body as PreviewOrderBody

      const preview = orderService.previewOrder(userId, {
        type,
        cartItemIds: Array.isArray(cartItemIds) ? cartItemIds : [],
        items: Array.isArray(items) ? items : [],
        addressId: addressId || null,
        couponId: couponId || undefined,
        usePoints: !!usePoints,
      })

      successResponse(res, preview, '获取成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '预览订单失败', 1001, 400)
    }
  },

  async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const {
        type = 'cart',
        cartItemIds = [],
        items = [],
        addressId,
        remark = '',
        couponId,
        usePoints,
      } = req.body as CreateOrderBody

      if (!addressId) {
        errorResponse(
          res,
          '请选择收货地址',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
        return
      }

      const order = await orderService.createOrder(userId, {
        type,
        cartItemIds: Array.isArray(cartItemIds) ? cartItemIds : [],
        items: Array.isArray(items) ? items : [],
        addressId: String(addressId),
        remark: String(remark),
        couponId: couponId || undefined,
        usePoints: !!usePoints,
      })

      successResponse(res, order, '订单创建成功', 0, 201)
    } catch (error) {
      errorResponse(res, (error as Error).message || '创建订单失败', 1001, 400)
    }
  },

  async cancelOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const { cancelReason } = req.body as CancelOrderBody

      const order = orderService.cancelOrder(String(id), userId, String(cancelReason))
      successResponse(res, order, '订单取消成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '取消订单失败', 1001, 400)
    }
  },

  async confirmReceive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

      const order = orderService.confirmReceive(String(id), userId)
      successResponse(res, order, '确认收货成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '确认收货失败', 1001, 400)
    }
  },

  async applyRefund(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = requireUser(req, res)
      if (!userId) {
        return
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const { reason, refundAmount } = req.body as ApplyRefundBody

      if (!reason) {
        errorResponse(
          res,
          '退款原因不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
        return
      }

      const order = orderService.applyRefund(String(id), userId, {
        reason: String(reason),
        refundAmount,
      })

      successResponse(res, order, '退款申请提交成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '申请退款失败', 1001, 400)
    }
  },

  async getLogistics(req: Request, res: Response): Promise<void> {
    await this.getOrderLogistics(req, res)
  },
}

export default orderController
