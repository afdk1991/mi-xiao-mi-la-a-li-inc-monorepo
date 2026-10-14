import type { Request, Response } from 'express'
import productModel from '../models/productModel'
import categoryModel from '../models/categoryModel'
import orderModel from '../models/orderModel'
import orderService from '../services/orderService'
import auditLogModel from '../models/auditLogModel'
import { getDb } from '../models'
import {
  successResponse,
  errorResponse,
  paginate,
  getParamStr,
  getQueryStr,
  asyncHandler,
} from '../utils/response'
import { GENERAL_ERRORS, AUTH_ERRORS, BUSINESS_ERRORS } from '../constants/errorCodes'

function toDateString(value: unknown): string | undefined {
  if (!value) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return String(value[0])
  }
  return undefined
}

type OrderStatus =
  'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunding' | 'refunded'

/**
 * 构建日期范围 WHERE 子句，避免在多个统计方法中重复编写日期过滤逻辑（DRY 原则）。
 * @param alias 表别名，如 'o'、'u'、'c'
 * @param startDateStr 开始日期字符串
 * @param endDateStr 结束日期字符串
 * @returns 包含 whereClause 和 params 的对象
 */
function buildDateRangeClause(
  alias: string,
  startDateStr?: string,
  endDateStr?: string
): { whereClause: string; params: string[] } {
  let whereClause = ''
  const params: string[] = []

  if (startDateStr) {
    whereClause = `WHERE ${alias}.created_at >= ?`
    params.push(startDateStr)
  }
  if (endDateStr) {
    whereClause += (startDateStr ? ' AND' : 'WHERE') + ` ${alias}.created_at <= ?`
    params.push(endDateStr)
  }

  return { whereClause, params }
}

/**
 * 将查询参数解析为正整数，支持默认值和上限校验。
 * @param value 原始查询参数
 * @param defaultValue 默认值
 * @param maxVal 最大值限制
 * @returns 解析后的数字或错误信息
 */
function parsePositiveInt(
  value: unknown,
  defaultValue: number,
  maxVal?: number
): number | { error: string } {
  if (value === undefined || value === null) {
    return defaultValue
  }
  const parsed = parseInt(String(value), 10)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { error: '参数必须为正整数' }
  }
  if (maxVal !== undefined && parsed > maxVal) {
    return { error: `参数不能超过${maxVal}` }
  }
  return parsed
}

type Period = 'day' | 'week' | 'month'

interface DashboardOverview {
  today: {
    orderCount: number
    salesAmount: number
    userCount: number
  }
  week: {
    orderCount: number
    salesAmount: number
    avgOrderValue: number
    orderGrowth: number
    salesGrowth: number
  }
  month: {
    orderCount: number
    salesAmount: number
    avgOrderValue: number
    orderGrowth: number
    salesGrowth: number
  }
}

interface OrderTrendData {
  period: Period
  data: {
    date: string
    orderCount: number
    salesAmount: number
  }[]
}

interface ProductRankItem {
  productId: string
  productName: string
  productImage: string
  totalQuantity: number
  totalSales: number
  orderCount: number
}

interface UserTrendData {
  period: Period
  data: {
    date: string
    registerCount: number
  }[]
}

interface ConversionStats {
  visitConversion: number
  addCartConversion: number
  orderConversion: number
  payConversion: number
  metrics: {
    visitCount: number
    addCartCount: number
    addCartUserCount: number
    orderCount: number
    paidOrderCount: number
  }
}

interface PaymentStats {
  total: {
    orderCount: number
    totalAmount: number
  }
  data: {
    paymentMethod: string
    orderCount: number
    totalAmount: number
    orderPercentage: number
    amountPercentage: number
  }[]
}

interface RefundStats {
  refundOrderCount: number
  refundAmount: number
  refundRate: number
  refundAmountRate: number
  totalOrderCount: number
  totalSalesAmount: number
}

interface CouponStats {
  receivedCount: number
  usedCount: number
  usedRate: number
}

const adminController = {
  async getAllProducts(req: Request, res: Response) {
    const { page, pageSize, categoryId, keyword, status } = req.query

    // 参数校验：page 必须是正整数，默认1
    const pageNumResult = parsePositiveInt(page, 1)
    if (typeof pageNumResult !== 'number') {
      return errorResponse(
        res,
        '页码必须为正整数',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    // 参数校验：pageSize 必须是正整数，默认20，最大100
    const pageSizeResult = parsePositiveInt(pageSize, 20, 100)
    if (typeof pageSizeResult !== 'number') {
      return errorResponse(
        res,
        pageSizeResult.error === '参数不能超过100' ? '每页数量不能超过100' : '每页数量必须为正整数',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    // 参数校验：categoryId 可选，必须是有效字符串
    let categoryIdStr = ''
    if (categoryId !== undefined && categoryId !== null) {
      if (typeof categoryId !== 'string' && !Array.isArray(categoryId)) {
        return errorResponse(
          res,
          '分类ID格式不正确',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
      categoryIdStr = String(categoryId)
    }

    // 参数校验：keyword 可选，必须是字符串，最大长度100
    let keywordStr = ''
    if (keyword !== undefined && keyword !== null) {
      if (typeof keyword !== 'string' && !Array.isArray(keyword)) {
        return errorResponse(
          res,
          '关键词格式不正确',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
      keywordStr = String(keyword)
      if (keywordStr.length > 100) {
        return errorResponse(
          res,
          '关键词长度不能超过100',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
    }

    // 参数校验：status 可选，必须是有效状态值
    const validProductStatuses = ['on_sale', 'off_sale']
    let statusStr = ''
    if (status !== undefined && status !== null) {
      statusStr = String(status)
      if (statusStr && !validProductStatuses.includes(statusStr)) {
        return errorResponse(
          res,
          '无效的状态值',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
    }

    const { products, total } = productModel.findAll({
      page: pageNumResult,
      pageSize: pageSizeResult,
      categoryId: categoryIdStr,
      keyword: keywordStr,
      status: statusStr,
    })

    return successResponse(
      res,
      paginate(products, total, pageNumResult, pageSizeResult),
      '获取成功'
    )
  },

  async getProductDetail(req: Request, res: Response) {
    const id = getParamStr(req.params.id)
    const product = productModel.getDetail(id)

    if (!product) {
      return errorResponse(
        res,
        '商品不存在',
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.code,
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.httpStatus
      )
    }

    return successResponse(res, product, '获取成功')
  },

  // 使用 asyncHandler 包装，统一处理控制器异常
  createProduct: asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      subtitle,
      category_id,
      main_image,
      images,
      price,
      original_price,
      stock,
      description,
      status,
      sort_order,
      skus,
    } = req.body

    // 参数校验：name 必填，字符串，长度1-200
    if (name === undefined || name === null || typeof name !== 'string') {
      return errorResponse(
        res,
        '商品名称必须为字符串',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }
    if (name.length < 1 || name.length > 200) {
      return errorResponse(
        res,
        '商品名称长度必须在1-200之间',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    // 参数校验：price 必填，正数
    if (price === undefined || price === null) {
      return errorResponse(
        res,
        '商品价格不能为空',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }
    const priceNum = Number(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      return errorResponse(
        res,
        '商品价格必须为正数',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    // 参数校验：category_id 可选，字符串
    if (category_id !== undefined && category_id !== null && category_id !== '') {
      if (typeof category_id !== 'string') {
        return errorResponse(
          res,
          '分类ID必须为字符串',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
      const category = categoryModel.findById(category_id)
      if (!category) {
        return errorResponse(
          res,
          '分类不存在',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
    }

    // 参数校验：status 可选，必须是有效状态枚举值
    const validProductStatuses = ['on_sale', 'off_sale']
    if (status !== undefined && status !== null && status !== '') {
      if (typeof status !== 'string' || !validProductStatuses.includes(status)) {
        return errorResponse(
          res,
          '无效的状态值',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
    }

    // 参数校验：sort_order 可选，整数
    if (sort_order !== undefined && sort_order !== null) {
      if (!Number.isInteger(Number(sort_order))) {
        return errorResponse(
          res,
          '排序值必须为整数',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
    }

    // 参数校验：skus 可选，数组
    if (skus !== undefined && skus !== null) {
      if (!Array.isArray(skus)) {
        return errorResponse(
          res,
          'SKU必须为数组',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
    }

    const product = productModel.create({
      name,
      subtitle,
      category_id,
      main_image,
      images,
      price,
      original_price,
      stock,
      description,
      status: status || 'on_sale',
      sort_order,
      skus,
    })

    return successResponse(res, product, '创建成功', 0, 201)
  }),

  // 使用 asyncHandler 包装，统一处理控制器异常
  updateProduct: asyncHandler(async (req: Request, res: Response) => {
    const id = getParamStr(req.params.id)
    const {
      name,
      subtitle,
      category_id,
      main_image,
      images,
      price,
      original_price,
      stock,
      description,
      status,
      sort_order,
      skus,
    } = req.body

    const product = productModel.findById(id)
    if (!product) {
      return errorResponse(
        res,
        '商品不存在',
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.code,
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.httpStatus
      )
    }

    if (category_id) {
      const category = categoryModel.findById(category_id)
      if (!category) {
        return errorResponse(
          res,
          '分类不存在',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }
    }

    const updatedProduct = productModel.update(id, {
      name,
      subtitle,
      category_id,
      main_image,
      images,
      price,
      original_price,
      stock,
      description,
      status,
      sort_order,
      skus,
    })

    return successResponse(res, updatedProduct, '更新成功')
  }),

  async deleteProduct(req: Request, res: Response) {
    const id = getParamStr(req.params.id)

    const product = productModel.findById(id)
    if (!product) {
      return errorResponse(
        res,
        '商品不存在',
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.code,
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.httpStatus
      )
    }

    productModel.delete(id)

    return successResponse(res, null, '删除成功')
  },

  async updateProductStatus(req: Request, res: Response) {
    const id = getParamStr(req.params.id)
    const { status } = req.body

    const product = productModel.findById(id)
    if (!product) {
      return errorResponse(
        res,
        '商品不存在',
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.code,
        BUSINESS_ERRORS.PRODUCT_NOT_FOUND.httpStatus
      )
    }

    if (!['on_sale', 'off_sale'].includes(status)) {
      return errorResponse(
        res,
        '无效的状态值',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    const updatedProduct = productModel.updateStatus(id, status)

    return successResponse(res, updatedProduct, '更新成功')
  },

  async batchUpdateProductStatus(req: Request, res: Response) {
    const { ids, status } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(
        res,
        '请选择要操作的商品',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    if (!['on_sale', 'off_sale'].includes(status)) {
      return errorResponse(
        res,
        '无效的状态值',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    const count = productModel.batchUpdateStatus(ids, status)
    return successResponse(res, { count }, '批量更新成功')
  },

  async batchDeleteProducts(req: Request, res: Response) {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(
        res,
        '请选择要删除的商品',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    const count = productModel.batchDelete(ids)
    return successResponse(res, { count }, '批量删除成功')
  },

  async getAllOrders(req: Request, res: Response) {
    const { page = 1, pageSize = 20, status, orderNo, userId, startTime, endTime } = req.query

    const { orders, total } = orderService.getAllOrders({
      page: parseInt(String(page), 10),
      pageSize: parseInt(String(pageSize), 10),
      status: getQueryStr(status),
      orderNo: getQueryStr(orderNo),
      userId: getQueryStr(userId),
      startTime: getQueryStr(startTime),
      endTime: getQueryStr(endTime),
    })

    return successResponse(
      res,
      paginate(orders, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
      '获取成功'
    )
  },

  async getOrderDetail(req: Request, res: Response) {
    const id = getParamStr(req.params.id)

    const order = orderModel.getDetail(id)
    if (!order) {
      return errorResponse(
        res,
        '订单不存在',
        BUSINESS_ERRORS.ORDER_NOT_FOUND.code,
        BUSINESS_ERRORS.ORDER_NOT_FOUND.httpStatus
      )
    }

    return successResponse(res, order, '获取成功')
  },

  async updateOrderStatus(req: Request, res: Response) {
    const id = getParamStr(req.params.id)
    const { status, remark } = req.body

    const order = orderModel.findById(id)
    if (!order) {
      return errorResponse(
        res,
        '订单不存在',
        BUSINESS_ERRORS.ORDER_NOT_FOUND.code,
        BUSINESS_ERRORS.ORDER_NOT_FOUND.httpStatus
      )
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
    if (!validStatuses.includes(status)) {
      return errorResponse(
        res,
        '无效的订单状态',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    const updatedOrder = orderModel.updateStatus(id, status, { remark })

    return successResponse(res, updatedOrder, '更新成功')
  },

  async batchUpdateOrderStatus(req: Request, res: Response) {
    const { ids, status, remark } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(
        res,
        '请选择要操作的订单',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
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
    if (!validStatuses.includes(status)) {
      return errorResponse(
        res,
        '无效的订单状态',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }

    ids.forEach((id: string) => {
      orderModel.updateStatus(id, status, { remark })
    })

    return successResponse(res, { count: ids.length }, '批量更新成功')
  },

  async shipOrder(req: Request, res: Response) {
    try {
      const id = getParamStr(req.params.id)
      const { shippingCompany, shippingNo } = req.body

      if (!shippingCompany || !shippingNo) {
        return errorResponse(
          res,
          '物流公司和运单号不能为空',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const order = orderService.shipOrder(id, { shippingCompany, shippingNo })
      return successResponse(res, order, '发货成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '发货失败', 1001, 400)
    }
  },

  async addLogistics(req: Request, res: Response) {
    try {
      const id = getParamStr(req.params.id)
      const { location, description, status } = req.body

      if (!status) {
        return errorResponse(
          res,
          '物流状态不能为空',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const logisticsId = orderService.addLogistics(id, { location, description, status })
      return successResponse(res, { id: logisticsId }, '添加成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '添加物流信息失败', 1001, 400)
    }
  },

  async getOrderLogistics(req: Request, res: Response) {
    try {
      const id = getParamStr(req.params.id)

      const logistics = orderService.getLogistics(id, null)
      return successResponse(res, logistics, '获取成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '获取物流信息失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }
  },

  async auditRefund(req: Request, res: Response) {
    try {
      const id = getParamStr(req.params.id)
      const { approved, remark } = req.body

      if (approved === undefined || approved === null) {
        return errorResponse(
          res,
          '审核结果不能为空',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const order = orderService.auditRefund(id, { approved: !!approved, remark })
      return successResponse(res, order, approved ? '退款审核通过' : '退款审核拒绝')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '退款审核失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }
  },

  async getOrderStatistics(req: Request, res: Response) {
    const { startTime, endTime } = req.query

    const stats = orderModel.getStatistics(startTime as string, endTime as string)

    return successResponse(res, stats, '获取成功')
  },

  async getCategories(req: Request, res: Response) {
    const categories = categoryModel.findAll()
    return successResponse(res, categories, '获取成功')
  },

  async getDashboardOverview(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekStartStr = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate()
    ).toISOString()

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekStartStr = new Date(
      lastWeekStart.getFullYear(),
      lastWeekStart.getMonth(),
      lastWeekStart.getDate()
    ).toISOString()
    const lastWeekEndStr = new Date(
      lastWeekEnd.getFullYear(),
      lastWeekEnd.getMonth(),
      lastWeekEnd.getDate()
    ).toISOString()

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const todayOrders = (
      db
        .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at < ?')
        .get(todayStart, todayEnd) as { count: number }
    ).count

    const todaySales = (
      db
        .prepare(
          'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ? AND created_at < ?'
        )
        .get('paid', 'shipped', 'completed', todayStart, todayEnd) as { amount: number }
    ).amount

    const todayUsers = (
      db
        .prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?')
        .get(todayStart, todayEnd) as { count: number }
    ).count

    const weekOrders = (
      db
        .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?')
        .get(weekStartStr) as {
        count: number
      }
    ).count

    const weekSales = (
      db
        .prepare(
          'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ?'
        )
        .get('paid', 'shipped', 'completed', weekStartStr) as { amount: number }
    ).amount

    const monthOrders = (
      db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').get(monthStart) as {
        count: number
      }
    ).count

    const monthSales = (
      db
        .prepare(
          'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ?'
        )
        .get('paid', 'shipped', 'completed', monthStart) as { amount: number }
    ).amount

    const lastWeekOrders = (
      db
        .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at < ?')
        .get(lastWeekStartStr, lastWeekEndStr) as { count: number }
    ).count

    const lastWeekSales = (
      db
        .prepare(
          'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ? AND created_at < ?'
        )
        .get('paid', 'shipped', 'completed', lastWeekStartStr, lastWeekEndStr) as { amount: number }
    ).amount

    const lastMonthOrders = (
      db
        .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at < ?')
        .get(lastMonthStart, lastMonthEnd) as { count: number }
    ).count

    const lastMonthSales = (
      db
        .prepare(
          'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ? AND created_at < ?'
        )
        .get('paid', 'shipped', 'completed', lastMonthStart, lastMonthEnd) as { amount: number }
    ).amount

    const weekOrderGrowth =
      lastWeekOrders > 0 ? (((weekOrders - lastWeekOrders) / lastWeekOrders) * 100).toFixed(2) : '0'
    const weekSalesGrowth =
      lastWeekSales > 0 ? (((weekSales - lastWeekSales) / lastWeekSales) * 100).toFixed(2) : '0'
    const monthOrderGrowth =
      lastMonthOrders > 0
        ? (((monthOrders - lastMonthOrders) / lastMonthOrders) * 100).toFixed(2)
        : '0'
    const monthSalesGrowth =
      lastMonthSales > 0 ? (((monthSales - lastMonthSales) / lastMonthSales) * 100).toFixed(2) : '0'

    const avgOrderValue = weekOrders > 0 ? (weekSales / weekOrders).toFixed(2) : '0'

    const overview: DashboardOverview = {
      today: {
        orderCount: todayOrders,
        salesAmount: parseFloat(String(todaySales)),
        userCount: todayUsers,
      },
      week: {
        orderCount: weekOrders,
        salesAmount: parseFloat(String(weekSales)),
        avgOrderValue: parseFloat(avgOrderValue),
        orderGrowth: parseFloat(weekOrderGrowth),
        salesGrowth: parseFloat(weekSalesGrowth),
      },
      month: {
        orderCount: monthOrders,
        salesAmount: parseFloat(String(monthSales)),
        avgOrderValue: monthOrders > 0 ? parseFloat((monthSales / monthOrders).toFixed(2)) : 0,
        orderGrowth: parseFloat(monthOrderGrowth),
        salesGrowth: parseFloat(monthSalesGrowth),
      },
    }

    return successResponse(res, overview, '获取成功')
  },

  async getOrderTrend(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const { period = 'day', startDate, endDate } = req.query
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    const { whereClause, params } = buildDateRangeClause('o', startDateStr, endDateStr)

    let dateFormat: string, groupBy: string
    switch (period) {
      case 'week':
        dateFormat = "strftime('%Y-%W', o.created_at)"
        groupBy = "strftime('%Y-%W', o.created_at)"
        break
      case 'month':
        dateFormat = "strftime('%Y-%m', o.created_at)"
        groupBy = "strftime('%Y-%m', o.created_at)"
        break
      case 'day':
      default:
        dateFormat = "strftime('%Y-%m-%d', o.created_at)"
        groupBy = "strftime('%Y-%m-%d', o.created_at)"
        break
    }

    const trendData = db
      .prepare(
        `
        SELECT
          ${dateFormat} as date,
          COUNT(o.id) as orderCount,
          COALESCE(SUM(CASE WHEN o.status IN ('paid', 'shipped', 'completed') THEN o.pay_amount ELSE 0 END), 0) as salesAmount
        FROM orders o
        ${whereClause}
        GROUP BY ${groupBy}
        ORDER BY date ASC
      `
      )
      .all(...params) as Record<string, unknown>[]

    const result: OrderTrendData = {
      period: period as Period,
      data: trendData.map((item) => ({
        date: String(item.date),
        orderCount: Number(item.orderCount),
        salesAmount: parseFloat(String(item.salesAmount)),
      })),
    }

    return successResponse(res, result, '获取成功')
  },

  async getProductRank(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const { topN = 10, startDate, endDate } = req.query
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    const { whereClause, params } = buildDateRangeClause('o', startDateStr, endDateStr)

    const productRank = db
      .prepare(
        `
        SELECT
          oi.product_id,
          p.name as productName,
          p.main_image as productImage,
          SUM(oi.quantity) as totalQuantity,
          SUM(oi.total_price) as totalSales,
          COUNT(DISTINCT o.id) as orderCount
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        ${whereClause}
        GROUP BY oi.product_id, p.name, p.main_image
        ORDER BY totalQuantity DESC
        LIMIT ?
      `
      )
      .all(...params, parseInt(String(topN), 10)) as Record<string, unknown>[]

    const result = {
      topN: parseInt(String(topN), 10),
      data: productRank.map((item) => ({
        productId: String(item.product_id),
        productName: String(item.productName),
        productImage: String(item.productImage),
        totalQuantity: Number(item.totalQuantity),
        totalSales: parseFloat(String(item.totalSales)),
        orderCount: Number(item.orderCount),
      })) as ProductRankItem[],
    }

    return successResponse(res, result, '获取成功')
  },

  async getUserTrend(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const { period = 'day', startDate, endDate } = req.query
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    const { whereClause, params } = buildDateRangeClause('u', startDateStr, endDateStr)

    let dateFormat: string, groupBy: string
    switch (period) {
      case 'week':
        dateFormat = "strftime('%Y-%W', u.created_at)"
        groupBy = "strftime('%Y-%W', u.created_at)"
        break
      case 'month':
        dateFormat = "strftime('%Y-%m', u.created_at)"
        groupBy = "strftime('%Y-%m', u.created_at)"
        break
      case 'day':
      default:
        dateFormat = "strftime('%Y-%m-%d', u.created_at)"
        groupBy = "strftime('%Y-%m-%d', u.created_at)"
        break
    }

    const trendData = db
      .prepare(
        `
        SELECT
          ${dateFormat} as date,
          COUNT(u.id) as registerCount
        FROM users u
        ${whereClause}
        GROUP BY ${groupBy}
        ORDER BY date ASC
      `
      )
      .all(...params) as Record<string, unknown>[]

    const result: UserTrendData = {
      period: period as Period,
      data: trendData.map((item) => ({
        date: String(item.date),
        registerCount: Number(item.registerCount),
      })),
    }

    return successResponse(res, result, '获取成功')
  },

  async getConversion(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const { startDate, endDate } = req.query
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    const orderRange = buildDateRangeClause('o', startDateStr, endDateStr)
    const userRange = buildDateRangeClause('u', startDateStr, endDateStr)
    const cartRange = buildDateRangeClause('c', startDateStr, endDateStr)
    const orderWhereClause = orderRange.whereClause
    const userWhereClause = userRange.whereClause
    const cartWhereClause = cartRange.whereClause
    const orderParams = orderRange.params
    const userParams = userRange.params
    const cartParams = cartRange.params

    const orderCount = (
      db
        .prepare(`SELECT COUNT(*) as count FROM orders o ${orderWhereClause}`)
        .get(...orderParams) as { count: number }
    ).count

    const paidOrderCount = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM orders o ${orderWhereClause ? orderWhereClause + ' AND' : 'WHERE'} o.status IN ('paid', 'shipped', 'completed')`
        )
        .get(...orderParams) as { count: number }
    ).count

    const userCount = (
      db.prepare(`SELECT COUNT(*) as count FROM users u ${userWhereClause}`).get(...userParams) as {
        count: number
      }
    ).count

    const cartCount = (
      db
        .prepare(`SELECT COUNT(DISTINCT user_id) as count FROM carts c ${cartWhereClause}`)
        .get(...cartParams) as { count: number }
    ).count

    const cartAddCount = (
      db.prepare(`SELECT COUNT(*) as count FROM carts c ${cartWhereClause}`).get(...cartParams) as {
        count: number
      }
    ).count

    const addOrderUserCount = (
      db
        .prepare(
          `
        SELECT COUNT(DISTINCT o.user_id) as count
        FROM orders o
        JOIN carts c ON o.user_id = c.user_id
        ${orderWhereClause}
      `
        )
        .get(...orderParams) as { count: number }
    ).count

    const visitConversion = userCount > 0 ? ((orderCount / userCount) * 100).toFixed(2) : '0'
    const addCartConversion = userCount > 0 ? ((cartCount / userCount) * 100).toFixed(2) : '0'
    const orderConversion = cartCount > 0 ? ((addOrderUserCount / cartCount) * 100).toFixed(2) : '0'
    const payConversion = orderCount > 0 ? ((paidOrderCount / orderCount) * 100).toFixed(2) : '0'

    const result: ConversionStats = {
      visitConversion: parseFloat(visitConversion),
      addCartConversion: parseFloat(addCartConversion),
      orderConversion: parseFloat(orderConversion),
      payConversion: parseFloat(payConversion),
      metrics: {
        visitCount: userCount,
        addCartCount: cartAddCount,
        addCartUserCount: cartCount,
        orderCount,
        paidOrderCount,
      },
    }

    return successResponse(res, result, '获取成功')
  },

  async getPaymentStats(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const { startDate, endDate } = req.query
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    const { whereClause, params } = buildDateRangeClause('o', startDateStr, endDateStr)

    const paymentWhereClause = whereClause
      ? `${whereClause} AND o.status IN ('paid', 'shipped', 'completed') AND o.pay_method IS NOT NULL`
      : `WHERE o.status IN ('paid', 'shipped', 'completed') AND o.pay_method IS NOT NULL`

    const paymentStats = db
      .prepare(
        `
        SELECT
          o.pay_method as paymentMethod,
          COUNT(o.id) as orderCount,
          COALESCE(SUM(o.pay_amount), 0) as totalAmount
        FROM orders o
        ${paymentWhereClause}
        GROUP BY o.pay_method
        ORDER BY totalAmount DESC
      `
      )
      .all(...params) as Record<string, unknown>[]

    const totalOrderCount = paymentStats.reduce((sum, item) => sum + Number(item.orderCount), 0)
    const totalAmount = paymentStats.reduce(
      (sum, item) => sum + parseFloat(String(item.totalAmount)),
      0
    )

    const result: PaymentStats = {
      total: {
        orderCount: totalOrderCount,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
      data: paymentStats.map((item) => ({
        paymentMethod: String(item.paymentMethod),
        orderCount: Number(item.orderCount),
        totalAmount: parseFloat(String(item.totalAmount)),
        orderPercentage:
          totalOrderCount > 0
            ? parseFloat(((Number(item.orderCount) / totalOrderCount) * 100).toFixed(2))
            : 0,
        amountPercentage:
          totalAmount > 0
            ? parseFloat(((parseFloat(String(item.totalAmount)) / totalAmount) * 100).toFixed(2))
            : 0,
      })),
    }

    return successResponse(res, result, '获取成功')
  },

  async getRefundStats(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const { startDate, endDate } = req.query
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    const { whereClause, params } = buildDateRangeClause('o', startDateStr, endDateStr)

    const totalOrders = (
      db.prepare(`SELECT COUNT(*) as count FROM orders o ${whereClause}`).get(...params) as {
        count: number
      }
    ).count

    const refundOrders = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM orders o ${whereClause ? whereClause + ' AND' : 'WHERE'} o.status IN ('refunding', 'refunded')`
        )
        .get(...params) as { count: number }
    ).count

    const refundAmount = (
      db
        .prepare(
          `SELECT COALESCE(SUM(o.refund_amount), 0) as amount FROM orders o ${whereClause ? whereClause + ' AND' : 'WHERE'} o.status = 'refunded'`
        )
        .get(...params) as { amount: number }
    ).amount

    const totalSales = (
      db
        .prepare(
          `SELECT COALESCE(SUM(o.pay_amount), 0) as amount FROM orders o ${whereClause ? whereClause + ' AND' : 'WHERE'} o.status IN ('paid', 'shipped', 'completed', 'refunded')`
        )
        .get(...params) as { amount: number }
    ).amount

    const refundRate = totalOrders > 0 ? ((refundOrders / totalOrders) * 100).toFixed(2) : '0'
    const refundAmountRate =
      totalSales > 0 ? ((parseFloat(String(refundAmount)) / totalSales) * 100).toFixed(2) : '0'

    const result: RefundStats = {
      refundOrderCount: refundOrders,
      refundAmount: parseFloat(String(refundAmount)),
      refundRate: parseFloat(refundRate),
      refundAmountRate: parseFloat(refundAmountRate),
      totalOrderCount: totalOrders,
      totalSalesAmount: parseFloat(String(totalSales)),
    }

    return successResponse(res, result, '获取成功')
  },

  async getCouponStats(req: Request, res: Response): Promise<Response> {
    const db = getDb()
    const { startDate, endDate } = req.query
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    const { whereClause, params } = buildDateRangeClause('uc', startDateStr, endDateStr)

    const receivedCount = (
      db.prepare(`SELECT COUNT(*) as count FROM user_coupons uc ${whereClause}`).get(...params) as {
        count: number
      }
    ).count

    const usedCount = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM user_coupons uc ${whereClause ? whereClause + ' AND' : 'WHERE'} uc.status = 'used'`
        )
        .get(...params) as { count: number }
    ).count

    const usedRate = receivedCount > 0 ? ((usedCount / receivedCount) * 100).toFixed(2) : '0'

    const result: CouponStats = {
      receivedCount,
      usedCount,
      usedRate: parseFloat(usedRate),
    }

    return successResponse(res, result, '获取成功')
  },

  // 使用 asyncHandler 包装，统一处理控制器异常，移除内部 try-catch
  getAuditLogs: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 20, adminId, action, resourceType, startDate, endDate } = req.query

    const result = auditLogModel.findAll({
      page: parseInt(String(page), 10),
      pageSize: parseInt(String(pageSize), 10),
      adminId: getQueryStr(adminId),
      action: getQueryStr(action),
      resourceType: getQueryStr(resourceType),
      startDate: getQueryStr(startDate),
      endDate: getQueryStr(endDate),
    })

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
  }),

  async getAuditLogDetail(req: Request, res: Response): Promise<Response> {
    try {
      const id = getParamStr(req.params.id)
      const log = auditLogModel.findById(id)

      if (!log) {
        return errorResponse(
          res,
          '日志不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      return successResponse(res, log, '获取成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }
  },

  async getAuditStats(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query
      const stats = auditLogModel.getStats({
        startDate: getQueryStr(startDate),
        endDate: getQueryStr(endDate),
      })
      return successResponse(res, stats, '获取成功')
    } catch (error) {
      return errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
    }
  },
}

export default adminController
