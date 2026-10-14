import { getDb } from '../models'
import orderModel, { type Order } from '../models/orderModel'
import couponModel from '../models/couponModel'
import memberModel from '../models/memberModel'
import queueService from './queueService'
import cacheService from './cacheService'
import logger from '../utils/logger'
import { generateId } from '../utils/response'

let timeoutTimer: NodeJS.Timeout | null = null

// 购物车项接口
interface CartItem {
  cart_id: string
  product_id: string
  sku_id?: string | null
  quantity: number
  product_name: string
  product_image: string
  product_price: number
  product_stock: number
  sku_name?: string
  sku_price?: number
  sku_stock?: number
  [key: string]: unknown
}

// 直接购买项接口
interface DirectBuyItem {
  productId: string
  skuId?: string
  quantity: number
}

// 订单项接口
interface OrderItem {
  product_id: string
  sku_id: string | null
  product_name: string
  product_image: string
  sku_name: string
  price: number
  quantity: number
  total_price: number
}

interface AmountResult {
  totalAmount: number
  freight: number
  discountAmount: number
  payAmount: number
  couponDiscount?: number
  pointsDiscount?: number
}

// 收货地址接口
interface ShippingAddress {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  tag?: string
  [key: string]: unknown
}

// 订单预览结果接口
interface OrderPreviewResult extends AmountResult {
  items: OrderItem[]
  shippingAddress: ShippingAddress | null
}

interface CreateOrderParams {
  type?: 'cart' | 'direct'
  cartItemIds?: string[]
  items?: DirectBuyItem[]
  addressId: string
  remark?: string
  couponId?: string
  usePoints?: boolean
}

// 订单列表查询参数接口
interface OrderListParams {
  page?: number
  pageSize?: number
  status?: string
  orderNo?: string
  userId?: string
  startTime?: string
  endTime?: string
}

const orderService = {
  getCartItems(userId: string, cartItemIds: string[] = []): CartItem[] {
    const db = getDb()
    let sql = `
      SELECT 
        c.id as cart_id,
        c.product_id,
        c.sku_id,
        c.quantity,
        p.name as product_name,
        p.main_image as product_image,
        p.price as product_price,
        p.stock as product_stock,
        sk.sku_name,
        sk.price as sku_price,
        sk.stock as sku_stock
      FROM carts c
      INNER JOIN products p ON c.product_id = p.id
      LEFT JOIN product_skus sk ON c.sku_id = sk.id
      WHERE c.user_id = ? AND c.selected = 1
    `
    const params: unknown[] = [userId]

    if (cartItemIds.length > 0) {
      const placeholders = cartItemIds.map(() => '?').join(',')
      sql += ` AND c.id IN (${placeholders})`
      params.push(...cartItemIds)
    }

    return db.prepare(sql).all(...params) as CartItem[]
  },

  getDirectBuyItems(items: DirectBuyItem[]) {
    const db = getDb()

    const productIds = items.map((item) => item.productId)
    const skuIds = items.filter((item) => item.skuId).map((item) => item.skuId!)

    const productPlaceholders = productIds.map(() => '?').join(',')
    const products = db
      .prepare(
        `SELECT id, name, main_image, price, stock FROM products WHERE id IN (${productPlaceholders})`
      )
      .all(...productIds) as Array<{
      id: string
      name: string
      main_image: string
      price: number
      stock: number
    }>

    const productMap = new Map<string, (typeof products)[0]>()
    for (const product of products) {
      productMap.set(product.id, product)
    }

    const skuMap = new Map<string, { id: string; sku_name: string; price: number; stock: number }>()
    if (skuIds.length > 0) {
      const skuPlaceholders = skuIds.map(() => '?').join(',')
      const skus = db
        .prepare(
          `SELECT id, sku_name, price, stock FROM product_skus WHERE id IN (${skuPlaceholders})`
        )
        .all(...skuIds) as Array<{ id: string; sku_name: string; price: number; stock: number }>
      for (const sku of skus) {
        skuMap.set(sku.id, sku)
      }
    }

    const result: Array<{
      product_id: string
      sku_id: string | null
      product_name: string
      product_image: string
      sku_name: string
      price: number
      stock: number
      quantity: number
    }> = []

    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new Error('商品不存在')
      }

      let price = product.price
      let stock = product.stock
      let skuName = ''

      if (item.skuId) {
        const sku = skuMap.get(item.skuId)
        if (!sku) {
          throw new Error(`SKU不存在: ${item.skuId}`)
        }
        price = sku.price
        stock = sku.stock
        skuName = sku.sku_name
      }

      result.push({
        product_id: product.id,
        sku_id: item.skuId || null,
        product_name: product.name,
        product_image: product.main_image,
        sku_name: skuName,
        price,
        stock,
        quantity: item.quantity || 1,
      })
    }

    return result
  },

  calculateAmount(
    items: Array<{ sku_price?: number; price: number; quantity?: number }>,
    freight = 0
  ): AmountResult {
    let totalAmount = 0

    for (const item of items) {
      const price = item.sku_price !== undefined ? item.sku_price : item.price
      const quantity = item.quantity || 1
      totalAmount += price * quantity
    }

    return {
      totalAmount,
      freight,
      discountAmount: 0,
      payAmount: totalAmount + freight,
      couponDiscount: 0,
      pointsDiscount: 0,
    }
  },

  calculateWithDiscount(
    baseAmount: AmountResult,
    userId: string,
    couponId?: string,
    usePoints?: boolean
  ): AmountResult {
    const { totalAmount, freight } = baseAmount
    let payAmount = baseAmount.payAmount
    let couponDiscount = 0
    let pointsDiscount = 0

    if (couponId) {
      const coupon = couponModel.findUserCouponById(couponId, userId)
      if (coupon && coupon.status === 'unused') {
        const now = Date.now()
        const startTime =
          typeof coupon.start_time === 'string'
            ? new Date(coupon.start_time).getTime()
            : coupon.start_time
        const endTime =
          typeof coupon.end_time === 'string'
            ? new Date(coupon.end_time).getTime()
            : coupon.end_time
        if (startTime <= now && endTime >= now) {
          if (payAmount >= coupon.min_amount) {
            if (coupon.type === 'fixed') {
              couponDiscount = Math.min(coupon.value, payAmount)
              if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
                couponDiscount = Math.min(couponDiscount, coupon.max_discount)
              }
            } else {
              couponDiscount = Math.floor((payAmount * coupon.value) / 100)
              if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
                couponDiscount = Math.min(couponDiscount, coupon.max_discount)
              }
            }
            payAmount -= couponDiscount
          }
        }
      }
    }

    if (usePoints) {
      const userPoints = memberModel.getUserPoints(userId)
      if (userPoints) {
        const availablePoints = userPoints.balance || 0
        const maxPointsDiscount = Math.floor(payAmount)
        pointsDiscount = Math.min(availablePoints, maxPointsDiscount)
        payAmount -= pointsDiscount
      }
    }

    const discountAmount = couponDiscount + pointsDiscount

    return {
      totalAmount,
      freight,
      discountAmount,
      payAmount: Math.max(0, payAmount),
      couponDiscount,
      pointsDiscount,
    }
  },

  // 统一获取订单商品（购物车 / 直接购买）
  getOrderItems(
    userId: string,
    options: {
      type: 'cart' | 'direct'
      cartItemIds?: string[]
      items?: DirectBuyItem[]
    }
  ): { items: Array<Record<string, unknown>>; cartIds: string[] } {
    const { type, cartItemIds = [], items = [] } = options

    let orderItems: Array<Record<string, unknown>> = []
    let cartIds: string[] = []

    if (type === 'cart') {
      const cartItems = this.getCartItems(userId, cartItemIds)
      if (cartItems.length === 0) {
        throw new Error('请选择要结算的商品')
      }
      orderItems = cartItems as unknown as Array<Record<string, unknown>>
      cartIds = cartItems.map((item) => item.cart_id)
    } else if (type === 'direct') {
      if (!items || items.length === 0) {
        throw new Error('请选择要购买的商品')
      }
      orderItems = this.getDirectBuyItems(items) as unknown as Array<Record<string, unknown>>
    } else {
      throw new Error('无效的订单类型')
    }

    return { items: orderItems, cartIds }
  },

  // 统一验证商品库存
  validateOrderItemsStock(orderItems: Array<Record<string, unknown>>): void {
    for (const item of orderItems) {
      const stock = (item.sku_stock !== undefined ? item.sku_stock : item.stock) as number
      if (stock < (item.quantity as number)) {
        throw new Error(`商品"${item.product_name}"库存不足`)
      }
    }
  },

  // 统一计算订单金额（基础金额 + 优惠券/积分折扣）
  calculateOrderAmount(
    orderItems: Array<Record<string, unknown>>,
    userId: string,
    couponId?: string,
    usePoints?: boolean
  ): AmountResult {
    const baseAmount = this.calculateAmount(
      orderItems as unknown as Array<{ sku_price?: number; price: number; quantity?: number }>
    )
    return this.calculateWithDiscount(baseAmount, userId, couponId, usePoints)
  },

  // 统一获取收货地址
  getShippingAddress(
    db: ReturnType<typeof getDb>,
    userId: string,
    addressId: string | null,
    required = false
  ): ShippingAddress | null {
    let shippingAddress: ShippingAddress | null = null

    if (addressId) {
      shippingAddress =
        (db
          .prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?')
          .get(addressId, userId) as ShippingAddress | undefined) || null
    } else {
      shippingAddress =
        (db
          .prepare('SELECT * FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1')
          .get(userId) as ShippingAddress | undefined) || null
    }

    if (required && !shippingAddress) {
      throw new Error('收货地址不存在')
    }

    return shippingAddress
  },

  /**
   * 预览订单，计算价格、运费、优惠等
   * @param userId - 用户 ID
   * @param options - 预览参数（类型、商品、优惠券等）
   * @returns 订单预览信息（含商品列表、价格明细、地址信息）
   */
  previewOrder(
    userId: string,
    options: {
      type?: 'cart' | 'direct'
      cartItemIds?: string[]
      items?: DirectBuyItem[]
      addressId?: string | null
      couponId?: string
      usePoints?: boolean
    } = {}
  ): OrderPreviewResult {
    const db = getDb()
    const {
      type = 'cart',
      cartItemIds = [],
      items = [],
      addressId = null,
      couponId,
      usePoints,
    } = options

    const { items: orderItems } = this.getOrderItems(userId, { type, cartItemIds, items })

    this.validateOrderItemsStock(orderItems)

    const amount = this.calculateOrderAmount(orderItems, userId, couponId, usePoints)

    const shippingAddress = this.getShippingAddress(db, userId, addressId)

    const itemsDetail: OrderItem[] = orderItems.map((item) => ({
      product_id: item.product_id as string,
      sku_id: (item.sku_id as string | null) || null,
      product_name: item.product_name as string,
      product_image: item.product_image as string,
      sku_name: (item.sku_name as string) || '',
      price: (item.sku_price !== undefined ? item.sku_price : item.price) as number,
      quantity: item.quantity as number,
      total_price:
        ((item.sku_price !== undefined ? item.sku_price : item.price) as number) *
        (item.quantity as number),
    }))

    return {
      items: itemsDetail,
      ...amount,
      shippingAddress,
    }
  },

  /**
   * 创建订单（扣减库存、应用优惠券、积分抵扣）
   * @param userId - 用户 ID
   * @param params - 订单参数（类型、商品、地址、优惠券、积分等）
   * @returns 创建的订单信息
   * @throws {Error} 库存不足、地址不存在、商品不存在等
   */
  async createOrder(userId: string, params: CreateOrderParams) {
    const db = getDb()
    const {
      type = 'cart',
      cartItemIds = [],
      items = [],
      addressId,
      remark = '',
      couponId,
      usePoints,
    } = params

    if (!addressId) {
      throw new Error('请选择收货地址')
    }

    const address = this.getShippingAddress(db, userId, addressId, true)!

    const { items: orderItems, cartIds = [] } = this.getOrderItems(userId, {
      type,
      cartItemIds,
      items,
    })

    const shippingAddress: Omit<
      ShippingAddress,
      'is_default' | 'user_id' | 'created_at' | 'updated_at'
    > = {
      id: address.id,
      name: address.name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      tag: address.tag,
    }

    const amount = this.calculateOrderAmount(orderItems, userId, couponId, usePoints)

    // 获取分布式锁，防止并发下单导致库存超卖
    const lockKeys: string[] = []
    for (const item of orderItems) {
      const productId = item.product_id as string
      const skuId = item.sku_id as string | null
      const lockKey = skuId ? `stock:sku:${skuId}` : `stock:product:${productId}`
      if (!lockKeys.includes(lockKey)) {
        lockKeys.push(lockKey)
      }
    }

    // 按顺序获取所有锁（避免死锁：按 key 排序）
    lockKeys.sort()
    const acquiredLocks: string[] = []
    try {
      for (const lockKey of lockKeys) {
        const acquired = await cacheService.acquireLock(lockKey, 10, true)
        if (!acquired) {
          throw new Error('系统繁忙，请稍后重试')
        }
        acquiredLocks.push(lockKey)
      }
    } catch (err) {
      // 获取锁失败时，释放已获取的锁
      for (const key of acquiredLocks) {
        await cacheService.releaseLock(key, true).catch(() => {})
      }
      throw err
    }

    const createTransaction = db.transaction(() => {
      const skuItems = orderItems.filter((item) => item.sku_id) as Array<Record<string, unknown>>
      const productItems = orderItems as Array<Record<string, unknown>>

      const skuIdToQty = new Map<string, number>()
      for (const item of skuItems) {
        const current = skuIdToQty.get(item.sku_id as string) || 0
        skuIdToQty.set(item.sku_id as string, current + (item.quantity as number))
      }

      const productIdToQty = new Map<string, number>()
      for (const item of productItems) {
        const current = productIdToQty.get(item.product_id as string) || 0
        productIdToQty.set(item.product_id as string, current + (item.quantity as number))
      }

      if (skuIdToQty.size > 0) {
        const stmt = db.prepare(
          'UPDATE product_skus SET stock = stock - ? WHERE id = ? AND stock >= ?'
        )
        for (const [skuId, qty] of skuIdToQty.entries()) {
          const result = stmt.run(qty, skuId, qty)
          if (result.changes === 0) {
            const item = skuItems.find((i) => i.sku_id === skuId)
            throw new Error(`商品"${item?.product_name}"库存不足`)
          }
        }
      }

      if (productIdToQty.size > 0) {
        const stmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        for (const [productId, qty] of productIdToQty.entries()) {
          const result = stmt.run(qty, productId, qty)
          if (result.changes === 0) {
            throw new Error('库存不足')
          }
        }
      }

      const order = orderModel.create({
        user_id: userId,
        total_amount: amount.totalAmount,
        freight: amount.freight,
        discount_amount: amount.discountAmount,
        pay_amount: amount.payAmount,
        shipping_address: shippingAddress,
        remark,
        coupon_id: couponId || null,
      })

      if (usePoints && amount.pointsDiscount && amount.pointsDiscount > 0) {
        memberModel.spendPoints(userId, amount.pointsDiscount, '订单抵扣', order.id)
      }

      if (couponId) {
        couponModel.useCoupon(couponId, userId, order.id)
      }

      const orderItemValues: Array<{
        id: string
        order_id: string
        product_id: string
        sku_id: string | null
        product_name: string
        product_image: string
        sku_name: string
        price: number
        quantity: number
        total_price: number
      }> = []

      for (const item of orderItems) {
        const price = (item.sku_price !== undefined ? item.sku_price : item.price) as number
        orderItemValues.push({
          id: generateId(),
          order_id: order.id,
          product_id: item.product_id as string,
          sku_id: (item.sku_id as string) || null,
          product_name: item.product_name as string,
          product_image: item.product_image as string,
          sku_name: (item.sku_name as string) || '',
          price,
          quantity: item.quantity as number,
          total_price: price * (item.quantity as number),
        })
      }

      if (orderItemValues.length > 0) {
        const now = new Date().toISOString()
        const insertPlaceholders = orderItemValues
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ')
        const params: Array<unknown> = []
        for (const item of orderItemValues) {
          params.push(
            item.id,
            item.order_id,
            item.product_id,
            item.sku_id,
            item.product_name,
            item.product_image,
            item.sku_name,
            item.price,
            item.quantity,
            item.total_price,
            now
          )
        }
        db.prepare(
          `INSERT INTO order_items (id, order_id, product_id, sku_id, product_name, product_image, sku_name, price, quantity, total_price, created_at) VALUES ${insertPlaceholders}`
        ).run(...params)
      }

      if (type === 'cart' && cartIds.length > 0) {
        const placeholders = cartIds.map(() => '?').join(',')
        db.prepare(`DELETE FROM carts WHERE id IN (${placeholders}) AND user_id = ?`).run(
          ...cartIds,
          userId
        )
      }

      const createdOrder = orderModel.getOrderWithItems(order.id)

      const orderItemsData = orderModel.getOrderItems(order.id).map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        price: item.price,
      }))

      return { createdOrder, orderItemsData }
    })

    let createdOrder: Order
    let orderItemsData: Array<{
      productId: string
      productName: string
      quantity: number
      price: number
    }>

    try {
      const result = createTransaction() as {
        createdOrder: Order
        orderItemsData: Array<{
          productId: string
          productName: string
          quantity: number
          price: number
        }>
      }
      createdOrder = result.createdOrder
      orderItemsData = result.orderItemsData
    } finally {
      // 无论事务成功或失败，都释放分布式锁
      for (const lockKey of acquiredLocks) {
        await cacheService.releaseLock(lockKey, true).catch((err) => {
          logger.warn(`释放库存锁失败 [${lockKey}]:`, (err as Error).message)
        })
      }
    }

    // 事务成功后才执行副作用，避免事务回滚时副作用无法回滚
    // 通知、销量统计、订单日志均由队列消费者异步处理
    try {
      queueService
        .publish(queueService.names.ORDER_CREATED, {
          orderId: createdOrder.id,
          orderNo: createdOrder.order_no,
          userId,
          payAmount: createdOrder.pay_amount,
          createdAt: createdOrder.created_at,
          timeoutMinutes: 15,
          status: createdOrder.status,
          items: orderItemsData,
        })
        .catch((err) => {
          logger.error('Failed to publish order created message:', err)
        })
    } catch (err) {
      logger.error('Failed to publish order created message:', err)
    }

    return createdOrder
  },

  /**
   * 取消订单（恢复库存、退还优惠券、退还积分）
   * @param orderId - 订单 ID
   * @param userId - 用户 ID（权限校验）
   * @param cancelReason - 取消原因
   * @throws {Error} 订单不存在、无权限、状态不允许取消
   */
  cancelOrder(orderId: string, userId: string, cancelReason = '') {
    const db = getDb()
    const order = orderModel.findById(orderId)

    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.user_id !== userId) {
      throw new Error('无权操作该订单')
    }

    if (order.status !== 'pending') {
      throw new Error('仅待付款订单可取消')
    }

    const items = orderModel.getOrderItems(orderId)

    const cancelTransaction = db.transaction(() => {
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

      return orderModel.updateStatus(orderId, 'cancelled', {
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason,
      })
    })

    return (cancelTransaction as unknown as () => unknown)()
  },

  /**
   * 确认收货
   * @param orderId - 订单 ID
   * @param userId - 用户 ID（权限校验）
   * @throws {Error} 订单不存在、无权限、状态不允许确认
   */
  confirmReceive(orderId: string, userId: string) {
    const order = orderModel.findById(orderId)

    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.user_id !== userId) {
      throw new Error('无权操作该订单')
    }

    if (order.status !== 'shipped') {
      throw new Error('仅待收货订单可确认收货')
    }

    return orderModel.updateStatus(orderId, 'completed', {
      completed_at: new Date().toISOString(),
    })
  },

  async handlePaymentCallback(params: {
    orderId: string
    orderNo: string
    payStatus: 'success' | 'failed'
    payAmount: number
    payMethod: string
    payTime?: string
  }) {
    const { orderId, orderNo, payStatus, payAmount, payMethod, payTime } = params
    const db = getDb()
    const order = orderModel.findById(orderId)

    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.order_no !== orderNo) {
      throw new Error('订单号不匹配')
    }

    if (order.status === 'paid') {
      return order
    }

    if (payStatus === 'success') {
      if (Math.abs(order.pay_amount - payAmount) > 0.01) {
        throw new Error('支付金额不匹配')
      }

      const payTransaction = db.transaction(() => {
        const paidAt = payTime || new Date().toISOString()
        const updatedOrder = orderModel.updateStatus(orderId, 'paid', {
          pay_method: payMethod,
          pay_time: paidAt,
        })

        queueService
          .publish(queueService.names.ORDER_PAID, {
            orderId: updatedOrder.id,
            orderNo: updatedOrder.order_no,
            userId: updatedOrder.user_id,
            payAmount: updatedOrder.pay_amount,
            payMethod,
            paidAt,
          })
          .catch((err) => {
            logger.error('Failed to publish order paid message:', err)
          })

        return updatedOrder
      })

      return (payTransaction as unknown as () => unknown)()
    } else {
      queueService
        .publish(queueService.names.ORDER_CANCELLED, {
          orderId,
          orderNo,
          userId: order.user_id,
          reason: '支付失败',
        })
        .catch((err) => {
          logger.error('Failed to publish order cancelled message:', err)
        })

      return orderModel.updateStatus(orderId, 'cancelled', {
        cancelled_at: new Date().toISOString(),
        cancel_reason: '支付失败',
      })
    }
  },

  /**
   * 发货（管理员操作，记录物流信息）
   * @param orderId - 订单 ID
   * @param params - 物流信息（快递公司、快递单号）
   * @throws {Error} 订单不存在、状态不允许发货
   */
  shipOrder(orderId: string, params: { shippingCompany: string; shippingNo: string }) {
    const db = getDb()
    const order = orderModel.findById(orderId)
    const { shippingCompany, shippingNo } = params

    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.status !== 'paid') {
      throw new Error('仅待发货订单可发货')
    }

    if (!shippingCompany || !shippingNo) {
      throw new Error('物流公司和运单号不能为空')
    }

    const shipTransaction = db.transaction(() => {
      const updatedOrder = orderModel.updateStatus(orderId, 'shipped', {
        shipping_company: shippingCompany,
        shipping_no: shippingNo,
        shipped_at: new Date().toISOString(),
      })

      orderModel.createLogistics({
        order_id: orderId,
        company: shippingCompany,
        tracking_no: shippingNo,
        status: 'shipped',
        location: '发货仓库',
        description: '商家已发货',
      })

      return updatedOrder
    })

    return (shipTransaction as unknown as () => unknown)()
  },

  addLogistics(
    orderId: string,
    params: { location?: string; description?: string; status: string }
  ) {
    const order = orderModel.findById(orderId)
    const { location, description, status } = params

    if (!order) {
      throw new Error('订单不存在')
    }

    if (!['shipped', 'delivering', 'delivered'].includes(status)) {
      throw new Error('无效的物流状态')
    }

    return orderModel.createLogistics({
      order_id: orderId,
      company: order.shipping_company,
      tracking_no: order.shipping_no,
      status,
      location: location || '',
      description: description || '',
    })
  },

  getLogistics(orderId: string, userId: string) {
    const order = orderModel.findById(orderId)

    if (!order) {
      throw new Error('订单不存在')
    }

    if (userId && order.user_id !== userId) {
      throw new Error('无权查看该订单物流')
    }

    return orderModel.getLogisticsByOrderId(orderId)
  },

  applyRefund(
    orderId: string,
    userId: string,
    params: { reason: string; refundAmount?: number | string }
  ) {
    const order = orderModel.findById(orderId)
    const { reason, refundAmount } = params

    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.user_id !== userId) {
      throw new Error('无权操作该订单')
    }

    if (!['paid', 'shipped'].includes(order.status)) {
      throw new Error('当前订单状态不可申请退款')
    }

    if (!reason) {
      throw new Error('退款原因不能为空')
    }

    const amount = refundAmount ? Number(refundAmount) : order.pay_amount
    if (amount <= 0 || amount > order.pay_amount) {
      throw new Error('退款金额无效')
    }

    return orderModel.updateStatus(orderId, 'refunding', {
      refund_reason: reason,
      refund_amount: amount,
    })
  },

  /**
   * 审核退款（管理员操作，批准/拒绝退款，恢复库存）
   * @param orderId - 订单 ID
   * @param params - 审核参数（是否批准、备注）
   * @throws {Error} 订单不存在、状态不允许审核
   */
  auditRefund(orderId: string, params: { approved: boolean; remark?: string }) {
    const db = getDb()
    const order = orderModel.findById(orderId)
    const { approved, remark } = params

    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.status !== 'refunding') {
      throw new Error('仅退款中订单可审核')
    }

    const auditTransaction = db.transaction(() => {
      if (approved) {
        const items = orderModel.getOrderItems(orderId)

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

        return orderModel.updateStatus(orderId, 'refunded', {
          refund_remark: remark || '',
          refunded_at: new Date().toISOString(),
        })
      } else {
        const previousStatus = order.shipped_at ? 'shipped' : 'paid'
        return orderModel.updateStatus(orderId, previousStatus, {
          refund_remark: remark || '',
        })
      }
    })

    return (auditTransaction as unknown as () => unknown)()
  },

  attachOrderItems(
    orders: Array<{ id: string; shipping_address?: string | unknown; [key: string]: unknown }>
  ) {
    const orderIds = orders.map((o) => o.id)
    const itemsByOrder = orderModel.getOrderItemsByOrderIds(orderIds)

    return orders.map((order) => {
      const orderCopy = { ...order }
      if (orderCopy.shipping_address && typeof orderCopy.shipping_address === 'string') {
        try {
          orderCopy.shipping_address = JSON.parse(orderCopy.shipping_address)
        } catch {
          orderCopy.shipping_address = {}
        }
      }
      orderCopy.items = itemsByOrder[order.id] || []
      return orderCopy
    })
  },

  /**
   * 获取订单列表（支持分页、状态筛选、关键字搜索）
   * @param params - 查询参数（页码、每页数、状态、关键字）
   * @returns 订单列表和总数
   */
  getOrderList(
    userId: string,
    options: { page?: number; pageSize?: number; status?: string } = {}
  ) {
    const { page = 1, pageSize = 10, status = '' } = options
    const { orders, total } = orderModel.findByUserId(userId, { page, pageSize, status })

    if (orders.length === 0) {
      return { orders: [], total }
    }

    const ordersWithItems = this.attachOrderItems(
      orders as unknown as Array<Record<string, unknown>>
    )
    return { orders: ordersWithItems, total }
  },

  getAllOrders(options: OrderListParams = {}) {
    const {
      page = 1,
      pageSize = 20,
      status = '',
      orderNo = '',
      userId = '',
      startTime = '',
      endTime = '',
    } = options

    const { orders, total } = orderModel.findAll({
      page,
      pageSize,
      status,
      orderNo,
      userId,
      startTime,
      endTime,
    })

    if (orders.length === 0) {
      return { orders: [], total }
    }

    const ordersWithItems = this.attachOrderItems(
      orders as unknown as Array<Record<string, unknown>>
    )
    return { orders: ordersWithItems, total }
  },

  /**
   * 获取订单详情（含商品列表、物流信息、订单日志）
   * @param orderId - 订单 ID
   * @param userId - 用户 ID（权限校验）
   * @returns 订单详情
   * @throws {Error} 订单不存在、无权限查看
   */
  getOrderDetail(orderId: string, userId: string) {
    const order = orderModel.getOrderWithItems(orderId)

    if (!order) {
      throw new Error('订单不存在')
    }

    if (order.user_id !== userId) {
      throw new Error('无权查看该订单')
    }

    return order
  },

  async cancelExpiredOrders() {
    const db = getDb()
    const timeoutMinutes = 15
    const expiredTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString()

    const expiredOrders = db
      .prepare('SELECT * FROM orders WHERE status = ? AND created_at <= ?')
      .all('pending', expiredTime) as Order[]

    if (expiredOrders.length === 0) {
      logger.debug('No expired orders to cancel')
      return
    }

    logger.info(`Found ${expiredOrders.length} expired orders, starting cancellation...`)

    for (const order of expiredOrders) {
      try {
        const items = orderModel.getOrderItems(order.id)

        const cancelTransaction = db.transaction(() => {
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

          return orderModel.updateStatus(order.id, 'cancelled', {
            cancelled_at: new Date().toISOString(),
            cancel_reason: '订单超时',
          })
        })

        const cancelledOrder = (cancelTransaction as unknown as () => unknown)() as Order

        queueService
          .publish(queueService.names.ORDER_CANCELLED, {
            orderId: cancelledOrder.id,
            orderNo: cancelledOrder.order_no,
            userId: cancelledOrder.user_id,
            reason: '订单超时',
          })
          .catch((err) => {
            logger.error('Failed to publish order cancelled message:', err)
          })

        logger.info(`Cancelled expired order: ${order.order_no}`)
      } catch (err) {
        logger.error(`Failed to cancel expired order ${order.order_no}:`, (err as Error).message)
      }
    }
  },

  init() {
    const intervalMinutes = 5
    timeoutTimer = setInterval(
      async () => {
        try {
          await this.cancelExpiredOrders()
        } catch (err) {
          logger.error('Error in expired orders cancellation task:', (err as Error).message)
        }
      },
      intervalMinutes * 60 * 1000
    )

    logger.info(`Order timeout cancellation task started, running every ${intervalMinutes} minutes`)
  },

  shutdown() {
    if (timeoutTimer) {
      clearInterval(timeoutTimer)
      timeoutTimer = null
      logger.info('Order timeout cancellation task stopped')
    }
  },
}

export default orderService
