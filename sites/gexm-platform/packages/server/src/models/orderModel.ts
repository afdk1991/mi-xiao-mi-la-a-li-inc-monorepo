import { getDb } from '../models'
import { generateId } from '../utils/response'

// 订单接口定义
export interface Order {
  id: string
  order_no: string
  user_id: string
  status: string
  total_amount: number
  freight: number
  discount_amount: number
  pay_amount: number
  shipping_address: string | ShippingAddress
  remark?: string
  pay_method?: string
  pay_time?: string
  shipping_company?: string
  shipping_no?: string
  shipped_at?: string
  completed_at?: string
  cancelled_at?: string
  cancel_reason?: string
  refund_reason?: string
  refund_amount?: number
  refund_remark?: string
  refunded_at?: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

// 订单项接口
interface OrderItem {
  id: string
  order_id: string
  product_id: string
  sku_id?: string
  product_name: string
  product_image?: string
  sku_name?: string
  price: number
  quantity: number
  total_price: number
  created_at: string
}

// 物流信息接口
export interface Logistics {
  id: string
  order_id: string
  company?: string
  tracking_no?: string
  status?: string
  location?: string
  description?: string
  created_at: string
}

// 收货地址接口
interface ShippingAddress {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  address?: string
  postal_code?: string
}

// 创建订单数据
interface CreateOrderData {
  user_id: string
  total_amount?: number
  freight?: number
  discount_amount?: number
  pay_amount?: number
  shipping_address: ShippingAddress | string
  remark?: string
  coupon_id?: string | null
}

// 更新订单状态数据
interface UpdateOrderStatusData {
  pay_method?: string
  pay_time?: string
  pay_amount?: number
  shipping_company?: string
  shipping_no?: string
  shipped_at?: string
  completed_at?: string
  cancelled_at?: string
  cancel_reason?: string
  refund_reason?: string
  refund_amount?: number
  remark?: string
  refund_remark?: string
  refunded_at?: string
}

// 创建订单项数据
interface CreateOrderItemData {
  order_id: string
  product_id: string
  sku_id?: string
  product_name: string
  product_image?: string
  sku_name?: string
  price: number
  quantity: number
  total_price: number
}

// 查询订单选项
interface FindAllOptions {
  page?: number
  pageSize?: number
  status?: string
  orderNo?: string
  userId?: string
  startTime?: string
  endTime?: string
}

// 订单统计
interface OrderStatistics {
  totalOrders: number
  totalAmount: number
  pendingCount: number
  paidCount: number
  shippedCount: number
  completedCount: number
  cancelledCount: number
  refundingCount: number
  refundedCount: number
}

// 创建物流数据
interface CreateLogisticsData {
  order_id: string
  company?: string
  tracking_no?: string
  status?: string
  location?: string
  description?: string
}

function generateOrderNo(): string {
  const now = new Date()
  const timestamp =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0')
  const random = Math.floor(100000 + Math.random() * 900000).toString()
  return 'OD' + timestamp + random
}

const ORDER_STATES = [
  'pending',
  'paid',
  'shipped',
  'completed',
  'cancelled',
  'refunding',
  'refunded',
] as const

type OrderState = (typeof ORDER_STATES)[number]

const VALID_TRANSITIONS: Record<OrderState, OrderState[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'refunding', 'cancelled'],
  shipped: ['completed', 'refunding'],
  completed: [],
  cancelled: [],
  refunding: ['refunded', 'paid', 'shipped'],
  refunded: [],
}

function validateStateTransition(currentStatus: string, newStatus: string): boolean {
  if (!ORDER_STATES.includes(currentStatus as OrderState)) {
    return false
  }
  if (!ORDER_STATES.includes(newStatus as OrderState)) {
    return false
  }
  const validTransitions = VALID_TRANSITIONS[currentStatus as OrderState]
  return validTransitions.includes(newStatus as OrderState)
}

const orderModel = {
  findById(id: string): Order | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined
    return result || null
  },

  findByOrderNo(orderNo: string): Order | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo) as
      Order | undefined
    return result || null
  },

  findByUserId(
    userId: string,
    options: { page?: number; pageSize?: number; status?: string } = {}
  ): { orders: Order[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 10, status = '' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE user_id = ?'
    const params: (string | number)[] = [userId]

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM orders ${whereClause}`)
      .get(...params) as { count: number }

    const orders = db
      .prepare(
        `
        SELECT * FROM orders
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as Order[]

    return { orders, total: countResult.count }
  },

  create(orderData: CreateOrderData): Order | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()
    const orderNo = generateOrderNo()

    db.prepare(
      `
      INSERT INTO orders (
        id, order_no, user_id, status, total_amount, freight, discount_amount,
        pay_amount, shipping_address, remark, coupon_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      orderNo,
      orderData.user_id,
      'pending',
      orderData.total_amount || 0,
      orderData.freight || 0,
      orderData.discount_amount || 0,
      orderData.pay_amount || 0,
      typeof orderData.shipping_address === 'string'
        ? orderData.shipping_address
        : JSON.stringify(orderData.shipping_address || {}),
      orderData.remark || '',
      orderData.coupon_id || null,
      now,
      now
    )

    return this.findById(id)
  },

  updateStatus(id: string, newStatus: string, extraData: UpdateOrderStatusData = {}): Order | null {
    const db = getDb()
    const now = new Date().toISOString()

    const existingOrder = this.findById(id)
    if (!existingOrder) {
      throw new Error('订单不存在')
    }

    if (!validateStateTransition(existingOrder.status, newStatus)) {
      throw new Error(`订单状态转换不合法：${existingOrder.status} -> ${newStatus}`)
    }

    const fields: string[] = ['status = ?', 'updated_at = ?']
    const values: (string | number | undefined)[] = [newStatus, now]

    if (extraData.pay_method !== undefined) {
      fields.push('pay_method = ?')
      values.push(extraData.pay_method)
    }
    if (extraData.pay_time !== undefined) {
      fields.push('pay_time = ?')
      values.push(extraData.pay_time)
    }
    if (extraData.shipping_company !== undefined) {
      fields.push('shipping_company = ?')
      values.push(extraData.shipping_company)
    }
    if (extraData.shipping_no !== undefined) {
      fields.push('shipping_no = ?')
      values.push(extraData.shipping_no)
    }
    if (extraData.shipped_at !== undefined) {
      fields.push('shipped_at = ?')
      values.push(extraData.shipped_at)
    }
    if (extraData.completed_at !== undefined) {
      fields.push('completed_at = ?')
      values.push(extraData.completed_at)
    }
    if (extraData.cancelled_at !== undefined) {
      fields.push('cancelled_at = ?')
      values.push(extraData.cancelled_at)
    }
    if (extraData.cancel_reason !== undefined) {
      fields.push('cancel_reason = ?')
      values.push(extraData.cancel_reason)
    }
    if (extraData.refund_reason !== undefined) {
      fields.push('refund_reason = ?')
      values.push(extraData.refund_reason)
    }
    if (extraData.refund_amount !== undefined) {
      fields.push('refund_amount = ?')
      values.push(extraData.refund_amount)
    }
    if (extraData.refund_remark !== undefined) {
      fields.push('refund_remark = ?')
      values.push(extraData.refund_remark)
    }
    if (extraData.refunded_at !== undefined) {
      fields.push('refunded_at = ?')
      values.push(extraData.refunded_at)
    }

    values.push(id)

    db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  getOrderItems(orderId: string): OrderItem[] {
    const db = getDb()
    return db
      .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at DESC')
      .all(orderId) as OrderItem[]
  },

  getOrderItemsByOrderIds(orderIds: string[]): Record<string, OrderItem[]> {
    if (!orderIds || orderIds.length === 0) {
      return {}
    }
    const db = getDb()
    const placeholders = orderIds.map(() => '?').join(',')
    const allItems = db
      .prepare(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY created_at ASC`
      )
      .all(...orderIds) as OrderItem[]

    const itemsByOrder: Record<string, OrderItem[]> = {}
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = []
      }
      itemsByOrder[item.order_id].push(item)
    }

    return itemsByOrder
  },

  createOrderItem(itemData: CreateOrderItemData): string {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO order_items (
        id, order_id, product_id, sku_id, product_name, product_image,
        sku_name, price, quantity, total_price, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      itemData.order_id,
      itemData.product_id,
      itemData.sku_id || null,
      itemData.product_name,
      itemData.product_image || '',
      itemData.sku_name || '',
      itemData.price,
      itemData.quantity,
      itemData.total_price,
      now
    )

    return id
  },

  getOrderWithItems(id: string): Order | null {
    const order = this.findById(id)
    if (!order) {
      return null
    }

    if (order.shipping_address && typeof order.shipping_address === 'string') {
      try {
        order.shipping_address = JSON.parse(order.shipping_address)
      } catch {
        order.shipping_address = {}
      }
    }

    order.items = this.getOrderItems(id)
    return order
  },

  findAll(options: FindAllOptions = {}): { orders: Order[]; total: number } {
    const db = getDb()
    const {
      page = 1,
      pageSize = 20,
      status = '',
      orderNo = '',
      userId = '',
      startTime = '',
      endTime = '',
    } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }
    if (orderNo) {
      whereClause += ' AND order_no LIKE ?'
      params.push(`%${orderNo}%`)
    }
    if (userId) {
      whereClause += ' AND user_id = ?'
      params.push(userId)
    }
    if (startTime) {
      whereClause += ' AND created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      whereClause += ' AND created_at <= ?'
      params.push(endTime)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM orders ${whereClause}`)
      .get(...params) as { count: number }

    const orders = db
      .prepare(
        `
        SELECT * FROM orders
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as Order[]

    return { orders, total: countResult.count }
  },

  getDetail(id: string): Order | null {
    const order = this.getOrderWithItems(id)
    if (!order) {
      return null
    }
    return order
  },

  getStatistics(startTime = '', endTime = ''): OrderStatistics {
    const db = getDb()

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (startTime) {
      whereClause += ' AND created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      whereClause += ' AND created_at <= ?'
      params.push(endTime)
    }

    const result = db
      .prepare(
        `
        SELECT
          COUNT(*) as totalOrders,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'shipped', 'completed') THEN pay_amount ELSE 0 END), 0) as totalAmount,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paidCount,
          SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shippedCount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCount,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledCount,
          SUM(CASE WHEN status = 'refunding' THEN 1 ELSE 0 END) as refundingCount,
          SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refundedCount
        FROM orders
        ${whereClause}
      `
      )
      .get(...params) as {
      totalOrders: number
      totalAmount: number
      pendingCount: number
      paidCount: number
      shippedCount: number
      completedCount: number
      cancelledCount: number
      refundingCount: number
      refundedCount: number
    }

    return {
      totalOrders: result.totalOrders,
      totalAmount: parseFloat(String(result.totalAmount)),
      pendingCount: result.pendingCount,
      paidCount: result.paidCount,
      shippedCount: result.shippedCount,
      completedCount: result.completedCount,
      cancelledCount: result.cancelledCount,
      refundingCount: result.refundingCount,
      refundedCount: result.refundedCount,
    }
  },

  createLogistics(logisticsData: CreateLogisticsData): string {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO logistics (
        id, order_id, company, tracking_no, status, location, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      logisticsData.order_id,
      logisticsData.company || '',
      logisticsData.tracking_no || '',
      logisticsData.status || '',
      logisticsData.location || '',
      logisticsData.description || '',
      now
    )

    return id
  },

  getLogisticsByOrderId(orderId: string): Logistics[] {
    const db = getDb()
    return db
      .prepare('SELECT * FROM logistics WHERE order_id = ? ORDER BY created_at DESC')
      .all(orderId) as Logistics[]
  },
}

export default orderModel
