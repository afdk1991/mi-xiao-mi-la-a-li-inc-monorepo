import queueService from './queueService'
import orderModel from '../models/orderModel'
import notificationService from './notificationService'
import logger from '../utils/logger'
import { getDb } from '../models'
import cacheService from './cacheService'
import { generateId } from '../utils/response'

interface OrderCreatedMessage {
  orderId: string
  orderNo: string
  userId: string
  payAmount: number
  createdAt: string
  timeoutMinutes: number
  items?: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
  }>
  status?: string
}

interface OrderPaidMessage {
  orderId: string
  orderNo: string
  userId: string
  payAmount: number
  payMethod: string
  paidAt: string
}

interface OrderCancelledMessage {
  orderId: string
  orderNo: string
  userId: string
  reason: string
}

const PROCESSED_KEY_PREFIX = 'processed:order:'
const PROCESSED_TTL_SECONDS = 30 * 60

async function markProcessed(orderId: string): Promise<void> {
  const key = `${PROCESSED_KEY_PREFIX}${orderId}`
  await cacheService.set(key, '1', PROCESSED_TTL_SECONDS)
}

async function isAlreadyProcessed(orderId: string): Promise<boolean> {
  const key = `${PROCESSED_KEY_PREFIX}${orderId}`
  return cacheService.exists(key)
}

async function handleOrderCreated(message: OrderCreatedMessage): Promise<void> {
  try {
    if (await isAlreadyProcessed(message.orderId)) {
      logger.debug(`Order ${message.orderId} already processed, skipping`)
      return
    }

    const order = orderModel.findById(message.orderId)
    if (!order) {
      logger.warn(`Order not found for timeout check: ${message.orderId}`)
      return
    }

    // 异步发送订单通知（不阻塞主流程）
    try {
      await notificationService.sendOrderNotification({
        orderId: message.orderId,
        orderNo: message.orderNo,
        userId: message.userId,
        status: message.status || order.status,
        totalAmount: message.payAmount,
        items: message.items || [],
        timestamp: Date.now(),
      })
    } catch (err) {
      logger.error(`异步发送订单通知失败 [${message.orderId}]:`, (err as Error).message)
    }

    // 异步更新商品销量统计
    try {
      if (message.items && message.items.length > 0) {
        const db = getDb()
        const productIdToQty = new Map<string, number>()
        for (const item of message.items) {
          const current = productIdToQty.get(item.productId) || 0
          productIdToQty.set(item.productId, current + item.quantity)
        }
        for (const [productId, qty] of productIdToQty.entries()) {
          db.prepare('UPDATE products SET sales_count = sales_count + ? WHERE id = ?').run(
            qty,
            productId
          )
        }
        logger.debug(`商品销量统计已更新 [${message.orderId}]`)
      }
    } catch (err) {
      logger.error(`异步更新商品销量失败 [${message.orderId}]:`, (err as Error).message)
    }

    // 异步记录订单日志
    try {
      const db = getDb()
      db.prepare(
        `INSERT INTO order_logs (id, order_id, action, operator_id, operator_type, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        generateId(),
        message.orderId,
        'created',
        message.userId,
        'user',
        JSON.stringify({ orderNo: message.orderNo, payAmount: message.payAmount }),
        new Date().toISOString()
      )
    } catch (err) {
      logger.error(`异步记录订单日志失败 [${message.orderId}]:`, (err as Error).message)
    }

    // 订单超时检查
    if (order.status !== 'pending') {
      logger.debug(`Order ${message.orderId} is already ${order.status}, skip timeout`)
      return
    }

    const createdAt = new Date(message.createdAt).getTime()
    const timeoutMs = (message.timeoutMinutes || 15) * 60 * 1000
    const now = Date.now()

    if (now - createdAt >= timeoutMs) {
      logger.info(`Order ${message.orderNo} timeout, cancelling...`)

      const db = getDb()
      const cancelTransaction = db.transaction(() => {
        const currentOrder = orderModel.findById(message.orderId)
        if (!currentOrder || currentOrder.status !== 'pending') {
          return
        }

        const items = orderModel.getOrderItems(message.orderId)

        const skuIdToQty = new Map<string, number>()
        const productIdToQty = new Map<string, number>()

        for (const item of items) {
          if (item.sku_id) {
            const current = skuIdToQty.get(item.sku_id) || 0
            skuIdToQty.set(item.sku_id, current + item.quantity)
          }
          const current = productIdToQty.get(item.product_id) || 0
          productIdToQty.set(item.product_id, current + item.quantity)
        }

        if (skuIdToQty.size > 0) {
          const skuPlaceholders = Array.from(skuIdToQty.keys())
            .map(() => '?')
            .join(',')
          const skuCaseWhen = Array.from(skuIdToQty.entries())
            .map(([_id, _qty]) => `WHEN ? THEN stock + ?`)
            .join(' ')
          const skuParams: unknown[] = []
          for (const [id, qty] of skuIdToQty.entries()) {
            skuParams.push(id, qty)
          }
          skuParams.push(...skuIdToQty.keys())
          db.prepare(
            `UPDATE product_skus SET stock = CASE id ${skuCaseWhen} ELSE stock END WHERE id IN (${skuPlaceholders})`
          ).run(...skuParams)
        }

        if (productIdToQty.size > 0) {
          const productPlaceholders = Array.from(productIdToQty.keys())
            .map(() => '?')
            .join(',')
          const productCaseWhen = Array.from(productIdToQty.entries())
            .map(([_id, _qty]) => `WHEN ? THEN stock + ?`)
            .join(' ')
          const productParams: unknown[] = []
          for (const [id, qty] of productIdToQty.entries()) {
            productParams.push(id, qty)
          }
          productParams.push(...productIdToQty.keys())
          db.prepare(
            `UPDATE products SET stock = CASE id ${productCaseWhen} ELSE stock END WHERE id IN (${productPlaceholders})`
          ).run(...productParams)
        }

        orderModel.updateStatus(message.orderId, 'cancelled', {
          cancelled_at: new Date().toISOString(),
          cancel_reason: '订单超时未支付',
        })
      })

      cancelTransaction()
      logger.info(`Order ${message.orderNo} cancelled due to timeout`)
      await markProcessed(message.orderId)
    }
  } catch (error) {
    logger.error(`OrderCreated handler error [${message.orderId}]:`, (error as Error).message)
    throw error
  }
}

async function handleOrderPaid(message: OrderPaidMessage): Promise<void> {
  try {
    if (await isAlreadyProcessed(message.orderId)) {
      logger.debug(`Order ${message.orderId} already processed, skipping`)
      return
    }

    const order = orderModel.findById(message.orderId)
    if (!order) {
      logger.warn(`Order not found for payment processing: ${message.orderId}`)
      return
    }

    if (order.status === 'paid' || order.status === 'shipped' || order.status === 'completed') {
      logger.info(`Order ${message.orderId} is already ${order.status}, skip payment processing`)
      return
    }

    const updateResult = orderModel.updateStatus(message.orderId, 'paid', {
      pay_time: message.paidAt,
      pay_method: message.payMethod,
      pay_amount: message.payAmount,
    })

    if (updateResult) {
      logger.info(`Order ${message.orderNo} paid successfully via ${message.payMethod}`)
    } else {
      logger.warn(`Failed to update order status to paid: ${message.orderId}`)
    }

    await markProcessed(message.orderId)
  } catch (error) {
    logger.error(`OrderPaid handler error [${message.orderId}]:`, (error as Error).message)
    throw error
  }
}

async function handleOrderCancelled(message: OrderCancelledMessage): Promise<void> {
  try {
    if (await isAlreadyProcessed(message.orderId)) {
      logger.debug(`Order ${message.orderId} already processed, skipping`)
      return
    }

    const order = orderModel.findById(message.orderId)
    if (!order) {
      logger.warn(`Order not found for cancelled handler: ${message.orderId}`)
      return
    }

    if (order.status === 'cancelled') {
      logger.debug(`Order ${message.orderId} is already cancelled, skip`)
      return
    }

    logger.info(`Order cancelled notification: ${message.orderNo}, reason: ${message.reason}`)
    await markProcessed(message.orderId)
  } catch (error) {
    logger.error(`OrderCancelled handler error [${message.orderId}]:`, (error as Error).message)
    throw error
  }
}

async function initOrderQueueConsumers(): Promise<void> {
  await queueService.subscribe(queueService.names.ORDER_CREATED, async (msg) => {
    const payload = msg.payload as OrderCreatedMessage
    await handleOrderCreated(payload)
  })

  await queueService.subscribe(queueService.names.ORDER_PAID, async (msg) => {
    const payload = msg.payload as OrderPaidMessage
    await handleOrderPaid(payload)
  })

  await queueService.subscribe(queueService.names.ORDER_CANCELLED, async (msg) => {
    const payload = msg.payload as OrderCancelledMessage
    await handleOrderCancelled(payload)
  })

  logger.info('Order queue consumers initialized')
}

export { initOrderQueueConsumers, handleOrderCreated, handleOrderPaid, handleOrderCancelled }
