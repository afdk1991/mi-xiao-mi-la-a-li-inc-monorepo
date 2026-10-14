import type { Request, Response } from 'express'
import {
  successResponse,
  errorResponse,
  paginate,
  getParamStr,
  getQueryStr,
} from '../utils/response'
import { getDb } from '../models'
import { GENERAL_ERRORS, BUSINESS_ERRORS } from '../constants/errorCodes'
import cacheService from '../services/cacheService'
import logger from '../utils/logger'
import flashSaleModel, {
  type FlashSale,
  type FlashSaleItem,
  type FlashSaleItemDetail,
  type FlashSaleStatus,
  type FindAllOptions,
  type CreateFlashSaleItemData,
} from '../models/flashSaleModel'

interface FlashSaleOrder {
  id: string
  user_id: string
  flash_sale_id: string
  flash_sale_item_id: string
  product_id: string
  sku_id: string | null
  quantity: number
  price: number
  original_price: number
  status: string
  created_at: string
}

const flashSaleController = {
  async getActiveSales(req: Request, res: Response): Promise<void> {
    try {
      const now = Date.now()
      const sales = flashSaleModel
        .getActiveSales()
        .map((sale: FlashSale) => {
          const startTime = new Date(sale.start_time).getTime()
          const endTime = new Date(sale.end_time).getTime()
          let currentStatus: FlashSaleStatus | 'upcoming' = sale.status

          if (sale.status === 'active') {
            if (startTime > now) {
              currentStatus = 'upcoming'
            } else if (endTime < now) {
              currentStatus = 'ended'
            }
          }

          return {
            ...sale,
            current_status: currentStatus,
            remaining_time: endTime > now ? endTime - now : 0,
          }
        })
        .filter((s) => s.current_status === 'active')

      successResponse(res, sales, '获取成功')
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },

  async getFlashSales(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(getQueryStr(req.query.page) || '', 10) || 1
      const pageSize = parseInt(getQueryStr(req.query.pageSize) || '', 10) || 20
      const status = getQueryStr(req.query.status)
      const now = Date.now()

      const result = flashSaleModel.findAll({
        page,
        pageSize,
        status,
      })

      const data = result.sales.map((sale: FlashSale) => {
        let currentStatus: FlashSaleStatus | 'upcoming' = sale.status
        const startTime = new Date(sale.start_time).getTime()
        const endTime = new Date(sale.end_time).getTime()

        if (sale.status === 'active') {
          if (startTime > now) {
            currentStatus = 'upcoming'
          } else if (endTime < now) {
            currentStatus = 'ended'
          }
        }

        return {
          ...sale,
          current_status: currentStatus,
          remaining_time: endTime > now ? endTime - now : 0,
        }
      })

      let filtered = data
      if (status) {
        filtered = data.filter((s) => s.current_status === status || s.status === status)
      }

      filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

      successResponse(res, paginate(filtered, result.total, page, pageSize), '获取成功')
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },

  async getFlashSaleItems(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const sale = flashSaleModel.findById(id)

      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const items = flashSaleModel.getSaleItems(id).map((item: FlashSaleItemDetail) => {
        const remaining = item.stock
        const totalStock = item.stock + (item.sold_count || 0)
        const progress = totalStock > 0 ? ((item.sold_count || 0) / totalStock) * 100 : 0

        return {
          ...item,
          sold_count: item.sold_count || 0,
          remaining_stock: remaining,
          progress: progress.toFixed(1),
        }
      })

      successResponse(
        res,
        {
          sale_info: sale,
          items,
        },
        '获取成功'
      )
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },

  async getFlashSaleItem(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const itemId = getParamStr(req.params.itemId)
      const sale = flashSaleModel.findById(id)

      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const item = flashSaleModel.findItemById(itemId)
      if (!item || item.flash_sale_id !== id) {
        errorResponse(
          res,
          '秒杀商品不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const remaining = item.stock
      const totalStock = item.stock + (item.sold_count || 0)
      const progress = totalStock > 0 ? ((item.sold_count || 0) / totalStock) * 100 : 0

      successResponse(
        res,
        {
          ...item,
          sold_count: item.sold_count || 0,
          remaining_stock: remaining,
          progress: progress.toFixed(1),
          sale_info: sale,
        },
        '获取成功'
      )
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },

  async buyFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const id = getParamStr(req.params.id)
      const { itemId, quantity = 1 } = req.body

      // 分布式锁防止超卖和限购绕过（锁粒度：秒杀商品项 + 用户）
      const lockKey = `flashsale:buy:${itemId}:${userId}`
      const lockAcquired = await cacheService.acquireLock(lockKey, 10, false)
      if (!lockAcquired) {
        errorResponse(
          res,
          '操作太频繁，请稍后重试',
          BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED_OR_ENDED.code,
          429
        )
        return
      }

      try {
        const result = flashSaleModel.buyFlashSale(userId, id, itemId, parseInt(String(quantity), 10))
        successResponse(res, result, '秒杀成功，请尽快支付', 0, 201)
      } finally {
        await cacheService.releaseLock(lockKey).catch((err: unknown) => {
          logger.warn('Failed to release flash sale lock:', (err as Error).message)
        })
      }
    } catch (error) {
      const errorCodeMap: Record<string, { code: number; status: number }> = {
        秒杀活动不存在: {
          code: GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          status: GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus,
        },
        秒杀活动未开始或已结束: {
          code: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED_OR_ENDED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED_OR_ENDED.httpStatus,
        },
        秒杀活动尚未开始: {
          code: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED.httpStatus,
        },
        秒杀活动已结束: {
          code: BUSINESS_ERRORS.FLASH_SALE_ENDED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_ENDED.httpStatus,
        },
        秒杀商品不存在: {
          code: GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          status: GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus,
        },
        库存不足: {
          code: BUSINESS_ERRORS.INSUFFICIENT_STOCK.code,
          status: BUSINESS_ERRORS.INSUFFICIENT_STOCK.httpStatus,
        },
      }

      let errorInfo = {
        code: GENERAL_ERRORS.INVALID_PARAMETER.code,
        status: GENERAL_ERRORS.INVALID_PARAMETER.httpStatus,
      }
      const message = (error as Error).message
      if (message && (message.includes('每人限购') || message.includes('超出限购数量'))) {
        errorInfo = {
          code: BUSINESS_ERRORS.FLASH_SALE_LIMIT_EXCEEDED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_LIMIT_EXCEEDED.httpStatus,
        }
      } else if (message && errorCodeMap[message]) {
        errorInfo = errorCodeMap[message]
      }

      errorResponse(res, message || '秒杀失败', errorInfo.code, errorInfo.status)
      return
    }
  },

  async adminCreate(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        description,
        start_time,
        end_time,
        status = 'pending' as FlashSaleStatus,
      } = req.body

      if (!name) {
        errorResponse(
          res,
          '活动名称不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
        return
      }

      if (!start_time || !end_time) {
        errorResponse(
          res,
          '活动时间不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
        return
      }

      const startTime = new Date(start_time).toISOString()
      const endTime = new Date(end_time).toISOString()

      if (new Date(start_time).getTime() >= new Date(end_time).getTime()) {
        errorResponse(
          res,
          '开始时间必须早于结束时间',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
        return
      }

      const sale = flashSaleModel.create({
        name,
        description,
        start_time: startTime,
        end_time: endTime,
        status,
      })

      successResponse(res, sale, '创建成功', 0, 201)
    } catch (error) {
      errorResponse(res, (error as Error).message || '创建失败', 1001, 400)
      return
    }
  },

  async adminUpdate(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const sale = flashSaleModel.findById(id)

      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const { name, description, start_time, end_time, status } = req.body

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) {
        updateData.name = name
      }
      if (description !== undefined) {
        updateData.description = description
      }
      if (start_time !== undefined) {
        updateData.start_time = new Date(start_time).toISOString()
      }
      if (end_time !== undefined) {
        updateData.end_time = new Date(end_time).toISOString()
      }
      if (status !== undefined) {
        updateData.status = status
      }

      const updated = flashSaleModel.update(
        id,
        updateData as Parameters<typeof flashSaleModel.update>[1]
      )

      successResponse(res, updated, '更新成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '更新失败', 1001, 400)
      return
    }
  },

  async adminDelete(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const sale = flashSaleModel.findById(id)

      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      flashSaleModel.delete(id)

      successResponse(res, null, '删除成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '删除失败', 1001, 400)
      return
    }
  },

  async adminAddItem(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const { product_id, sku_id, sale_price, original_price, stock, limit_per_user = 1 } = req.body

      const sale = flashSaleModel.findById(id)
      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      if (!product_id) {
        errorResponse(
          res,
          '商品ID不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
        return
      }

      const price = parseFloat(String(sale_price))
      if (isNaN(price) || price <= 0) {
        errorResponse(
          res,
          '秒杀价格必须大于0',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
        return
      }

      const stockNum = parseInt(String(stock), 10)
      if (isNaN(stockNum) || stockNum <= 0) {
        errorResponse(
          res,
          '库存数量必须大于0',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
        return
      }

      const item = flashSaleModel.createSaleItem({
        flash_sale_id: id,
        product_id,
        sku_id,
        flash_price: price,
        original_price: parseFloat(String(original_price)) || price,
        stock: stockNum,
        limit_per_user: parseInt(String(limit_per_user), 10) || 1,
      } as CreateFlashSaleItemData)

      successResponse(res, item, '添加成功', 0, 201)
    } catch (error) {
      errorResponse(res, (error as Error).message || '添加失败', 1001, 400)
      return
    }
  },

  async adminRemoveItem(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const itemId = getParamStr(req.params.itemId)
      const sale = flashSaleModel.findById(id)

      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const item = flashSaleModel.findItemById(itemId)
      if (!item || item.flash_sale_id !== id) {
        errorResponse(
          res,
          '秒杀商品不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      flashSaleModel.deleteSaleItem(itemId)

      successResponse(res, null, '删除成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '删除失败', 1001, 400)
      return
    }
  },

  async adminListOrders(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const page = parseInt(getQueryStr(req.query.page) || '', 10) || 1
      const pageSize = parseInt(getQueryStr(req.query.pageSize) || '', 10) || 20
      const status = getQueryStr(req.query.status)

      const sale = flashSaleModel.findById(id)
      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const result = flashSaleModel.findSaleOrders(id, {
        page,
        pageSize,
        status,
      })

      successResponse(res, paginate(result.orders, result.total, page, pageSize), '获取成功')
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },

  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const page = parseInt(getQueryStr(req.query.page) || '', 10) || 1
      const pageSize = parseInt(getQueryStr(req.query.pageSize) || '', 10) || 20
      const status = getQueryStr(req.query.status)

      const db = getDb()
      let whereClause = 'WHERE user_id = ?'
      const params: (string | number)[] = [userId]

      if (status) {
        whereClause += ' AND status = ?'
        params.push(status)
      }

      const countResult = db
        .prepare(`SELECT COUNT(*) as count FROM flash_sale_orders ${whereClause}`)
        .get(...params) as { count: number }

      const orders = db
        .prepare(
          `
          SELECT fso.*, fsi.flash_price, fsi.original_price, fsi.product_id,
                 p.name as product_name, p.main_image as product_image
          FROM flash_sale_orders fso
          LEFT JOIN flash_sale_items fsi ON fso.flash_sale_item_id = fsi.id
          LEFT JOIN products p ON fsi.product_id = p.id
          ${whereClause}
          ORDER BY fso.created_at DESC
          LIMIT ? OFFSET ?
        `
        )
        .all(...params, pageSize, (page - 1) * pageSize) as unknown[]

      successResponse(res, paginate(orders, countResult.count, page, pageSize), '获取成功')
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const orderId = getParamStr(req.params.orderId)

      const db = getDb()
      const order = db.prepare('SELECT * FROM flash_sale_orders WHERE id = ?').get(orderId) as
        FlashSaleOrder | undefined

      if (!order) {
        errorResponse(
          res,
          '订单不存在',
          BUSINESS_ERRORS.ORDER_NOT_FOUND.code,
          BUSINESS_ERRORS.ORDER_NOT_FOUND.httpStatus
        )
        return
      }

      if (order.user_id !== userId) {
        errorResponse(
          res,
          '无权操作此订单',
          BUSINESS_ERRORS.ORDER_CANNOT_CANCEL.code,
          BUSINESS_ERRORS.ORDER_CANNOT_CANCEL.httpStatus
        )
        return
      }

      if (order.status !== 'pending') {
        errorResponse(
          res,
          '订单状态不允许取消',
          BUSINESS_ERRORS.ORDER_CANNOT_CANCEL.code,
          BUSINESS_ERRORS.ORDER_CANNOT_CANCEL.httpStatus
        )
        return
      }

      db.prepare('UPDATE flash_sale_orders SET status = ? WHERE id = ?').run('cancelled', orderId)

      const item = db
        .prepare('SELECT * FROM flash_sale_items WHERE id = ?')
        .get(order.flash_sale_item_id) as FlashSaleItem | undefined

      if (item) {
        db.prepare(
          'UPDATE flash_sale_items SET stock = stock + ?, sold_count = sold_count - ? WHERE id = ?'
        ).run(order.quantity, order.quantity, order.flash_sale_item_id)
      }

      successResponse(res, null, '取消成功')
    } catch (error) {
      errorResponse(res, (error as Error).message || '取消失败', 1001, 400)
      return
    }
  },

  async getProductDetail(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const item = flashSaleModel.findItemById(id)

      if (!item) {
        errorResponse(
          res,
          '秒杀商品不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const sale = flashSaleModel.findById(item.flash_sale_id)
      const remaining = item.stock
      const totalStock = item.stock + (item.sold_count || 0)
      const progress = totalStock > 0 ? ((item.sold_count || 0) / totalStock) * 100 : 0

      successResponse(
        res,
        {
          ...item,
          sold_count: item.sold_count || 0,
          remaining_stock: remaining,
          progress: progress.toFixed(1),
          sale_info: sale,
        },
        '获取成功'
      )
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },

  async joinFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { productId, quantity = 1 } = req.body

      const item = flashSaleModel.findItemById(productId)
      if (!item) {
        errorResponse(
          res,
          '秒杀商品不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      // 分布式锁防止超卖和限购绕过（锁粒度：秒杀商品项 + 用户）
      const lockKey = `flashsale:buy:${productId}:${userId}`
      const lockAcquired = await cacheService.acquireLock(lockKey, 10, false)
      if (!lockAcquired) {
        errorResponse(
          res,
          '操作太频繁，请稍后重试',
          BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED_OR_ENDED.code,
          429
        )
        return
      }

      try {
        const result = flashSaleModel.buyFlashSale(
          userId,
          item.flash_sale_id,
          productId,
          parseInt(String(quantity), 10)
        )

        successResponse(res, result, '秒杀成功，请尽快支付', 0, 201)
      } finally {
        await cacheService.releaseLock(lockKey).catch((err: unknown) => {
          logger.warn('Failed to release flash sale lock:', (err as Error).message)
        })
      }
    } catch (error) {
      const errorCodeMap: Record<string, { code: number; status: number }> = {
        秒杀活动不存在: {
          code: GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          status: GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus,
        },
        秒杀活动未开始或已结束: {
          code: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED_OR_ENDED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED_OR_ENDED.httpStatus,
        },
        秒杀活动尚未开始: {
          code: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_NOT_STARTED.httpStatus,
        },
        秒杀活动已结束: {
          code: BUSINESS_ERRORS.FLASH_SALE_ENDED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_ENDED.httpStatus,
        },
        秒杀商品不存在: {
          code: GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          status: GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus,
        },
        库存不足: {
          code: BUSINESS_ERRORS.INSUFFICIENT_STOCK.code,
          status: BUSINESS_ERRORS.INSUFFICIENT_STOCK.httpStatus,
        },
      }

      let errorInfo = {
        code: GENERAL_ERRORS.INVALID_PARAMETER.code,
        status: GENERAL_ERRORS.INVALID_PARAMETER.httpStatus,
      }
      const message = (error as Error).message
      if (message && (message.includes('每人限购') || message.includes('超出限购数量'))) {
        errorInfo = {
          code: BUSINESS_ERRORS.FLASH_SALE_LIMIT_EXCEEDED.code,
          status: BUSINESS_ERRORS.FLASH_SALE_LIMIT_EXCEEDED.httpStatus,
        }
      } else if (message && errorCodeMap[message]) {
        errorInfo = errorCodeMap[message]
      }

      errorResponse(res, message || '秒杀失败', errorInfo.code, errorInfo.status)
      return
    }
  },

  async getFlashSaleStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = getParamStr(req.params.id)
      const sale = flashSaleModel.findById(id)

      if (!sale) {
        errorResponse(
          res,
          '秒杀活动不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
        return
      }

      const now = Date.now()
      const startTime = new Date(sale.start_time).getTime()
      const endTime = new Date(sale.end_time).getTime()
      let currentStatus: FlashSaleStatus | 'upcoming' = sale.status

      if (sale.status === 'active') {
        if (startTime > now) {
          currentStatus = 'upcoming'
        } else if (endTime < now) {
          currentStatus = 'ended'
        }
      }

      successResponse(
        res,
        {
          id: sale.id,
          name: sale.name,
          status: currentStatus,
          start_time: sale.start_time,
          end_time: sale.end_time,
          remaining_time: endTime > now ? endTime - now : 0,
        },
        '获取成功'
      )
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
      )
      return
    }
  },
}

export default flashSaleController
