import orderService from './orderService'
import { getDb, closeDb } from '../models'
import userModel from '../models/userModel'
import productModel from '../models/productModel'
import couponModel from '../models/couponModel'
import memberModel from '../models/memberModel'
import orderModel from '../models/orderModel'
import { generateId } from '../utils/response'

// 测试用类型别名，避免 TS 隐式 any 报错
type OrderRow = {
  id: string
  order_no: string
  user_id: string
  status: string
  total_amount: number
  freight: number
  discount_amount: number
  pay_amount: number
  shipping_address: string | Record<string, unknown>
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
  items?: unknown[]
}

type OrderItemRow = {
  id: string
  order_id: string
  product_id: string
  sku_id?: string | null
  product_name: string
  product_image?: string
  sku_name?: string
  price: number
  quantity: number
  total_price: number
  created_at: string
}

describe('Order Service', () => {
  let db: ReturnType<typeof getDb>

  // 测试数据 ID，在 beforeEach 中初始化
  let testUserId: string
  let otherUserId: string
  let testAddressId: string
  let testProductId: string
  let testSkuId: string

  afterAll(() => {
    closeDb()
  })

  beforeEach(async () => {
    db = getDb()

    // 清理可能残留的测试数据（按外键顺序）
    cleanupTestData()

    // 创建测试用户
    const username = `test_order_user_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const user = await userModel.create({
      username,
      email: `${username}@example.com`,
      password: 'Test@1234',
    })
    testUserId = user.id

    const otherUsername = `test_order_other_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const otherUser = await userModel.create({
      username: otherUsername,
      email: `${otherUsername}@example.com`,
      password: 'Test@1234',
    })
    otherUserId = otherUser.id

    // 创建测试收货地址
    const now = new Date().toISOString()
    testAddressId = generateId('ADDR')
    db.prepare(
      'INSERT INTO addresses (id, user_id, name, phone, province, city, district, detail, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
    ).run(
      testAddressId,
      testUserId,
      '测试用户',
      '13800138000',
      '广东省',
      '深圳市',
      '南山区',
      '科技园路1号',
      now,
      now
    )

    // 创建测试商品（带 SKU）
    const product = productModel.create({
      name: '测试商品',
      subtitle: '测试副标题',
      price: 100,
      stock: 100,
      main_image: 'https://example.com/test.jpg',
      description: '测试商品描述',
      skus: [
        { sku_name: '标准版', price: 90, stock: 50 },
        { sku_name: '豪华版', price: 120, stock: 30 },
      ],
    })
    testProductId = product!.id
    const skus = productModel.findSkusByProductId(testProductId)
    testSkuId = skus[0].id
  })

  afterEach(() => {
    cleanupTestData()
  })

  function cleanupTestData(): void {
    try {
      // 按外键依赖顺序清理
      db.prepare(
        'DELETE FROM logistics WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?))'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?))'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM addresses WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM user_coupons WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM point_logs WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM user_points WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
      ).run('test_order_%')
      db.prepare(
        'DELETE FROM product_skus WHERE product_id IN (SELECT id FROM products WHERE name LIKE ?)'
      ).run('测试商品%')
      db.prepare('DELETE FROM products WHERE name LIKE ?').run('测试商品%')
      db.prepare('DELETE FROM coupons WHERE name LIKE ?').run('测试优惠券%')
      db.prepare('DELETE FROM users WHERE username LIKE ?').run('test_order_%')
    } catch {
      // 忽略清理错误
    }
  }

  // 辅助函数：创建测试订单
  function createTestOrder(
    userId: string,
    options: {
      productId?: string
      quantity?: number
      addressId?: string
      status?: string
      payAmount?: number
    } = {}
  ): OrderRow {
    const {
      productId = testProductId,
      quantity = 1,
      addressId = testAddressId,
      status = 'pending',
      payAmount,
    } = options

    const orderId = generateId('ORD')
    const orderNo = `TEST${Date.now()}${Math.floor(Math.random() * 10000)}`
    const now = new Date().toISOString()
    const amount = payAmount ?? 100 * quantity

    db.prepare(
      `INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount,
       pay_amount, shipping_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`
    ).run(orderId, orderNo, userId, status, amount, amount, '{"name":"测试用户"}', now, now)

    db.prepare(
      `INSERT INTO order_items (id, order_id, product_id, sku_id, product_name, product_image,
       sku_name, price, quantity, total_price, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      generateId('OIT'),
      orderId,
      productId,
      null,
      '测试商品',
      'https://example.com/test.jpg',
      '',
      100,
      quantity,
      100 * quantity,
      now
    )

    return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as OrderRow
  }

  describe('calculateAmount', () => {
    it('应正确计算订单总金额', () => {
      const items = [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 3 },
      ]

      const result = orderService.calculateAmount(items)

      expect(result.totalAmount).toBe(350)
      expect(result.freight).toBe(0)
      expect(result.discountAmount).toBe(0)
      expect(result.payAmount).toBe(350)
    })

    it('应优先使用 sku_price 计算金额', () => {
      const items = [
        { price: 100, sku_price: 80, quantity: 2 },
        { price: 50, quantity: 3 },
      ]

      const result = orderService.calculateAmount(items)

      expect(result.totalAmount).toBe(310)
    })

    it('应正确处理运费', () => {
      const items = [{ price: 100, quantity: 1 }]

      const result = orderService.calculateAmount(items, 15)

      expect(result.totalAmount).toBe(100)
      expect(result.freight).toBe(15)
      expect(result.payAmount).toBe(115)
    })

    it('应处理数量缺省为1', () => {
      const items = [{ price: 100 }]

      const result = orderService.calculateAmount(items)

      expect(result.totalAmount).toBe(100)
    })
  })

  describe('calculateWithDiscount', () => {
    it('无优惠券和积分时返回原始金额', () => {
      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])

      const result = orderService.calculateWithDiscount(baseAmount, testUserId)

      expect(result.payAmount).toBe(200)
      expect(result.couponDiscount).toBe(0)
      expect(result.pointsDiscount).toBe(0)
      expect(result.discountAmount).toBe(0)
    })

    it('应正确应用固定金额优惠券', () => {
      const coupon = couponModel.create({
        name: '测试优惠券固定',
        type: 'fixed',
        value: 20,
        min_amount: 100,
        total_quantity: 100,
        start_time: new Date(Date.now() - 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      })
      couponModel.claimCoupon(testUserId, coupon!.id)
      const userCoupon = couponModel.findUserCoupons(testUserId)[0]

      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])
      const result = orderService.calculateWithDiscount(baseAmount, testUserId, userCoupon.id)

      expect(result.couponDiscount).toBe(20)
      expect(result.payAmount).toBe(180)
    })

    it('应正确应用百分比优惠券', () => {
      const coupon = couponModel.create({
        name: '测试优惠券百分比',
        type: 'percent',
        value: 10,
        min_amount: 0,
        total_quantity: 100,
        start_time: new Date(Date.now() - 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      })
      couponModel.claimCoupon(testUserId, coupon!.id)
      const userCoupon = couponModel.findUserCoupons(testUserId)[0]

      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])
      const result = orderService.calculateWithDiscount(baseAmount, testUserId, userCoupon.id)

      expect(result.couponDiscount).toBe(20)
      expect(result.payAmount).toBe(180)
    })

    it('应遵守优惠券 max_discount 上限', () => {
      const coupon = couponModel.create({
        name: '测试优惠券上限',
        type: 'percent',
        value: 50,
        min_amount: 0,
        max_discount: 50,
        total_quantity: 100,
        start_time: new Date(Date.now() - 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      })
      couponModel.claimCoupon(testUserId, coupon!.id)
      const userCoupon = couponModel.findUserCoupons(testUserId)[0]

      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])
      const result = orderService.calculateWithDiscount(baseAmount, testUserId, userCoupon.id)

      expect(result.couponDiscount).toBe(50)
      expect(result.payAmount).toBe(150)
    })

    it('订单金额低于优惠券最低消费时不应用', () => {
      const coupon = couponModel.create({
        name: '测试优惠券高门槛',
        type: 'fixed',
        value: 20,
        min_amount: 500,
        total_quantity: 100,
        start_time: new Date(Date.now() - 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      })
      couponModel.claimCoupon(testUserId, coupon!.id)
      const userCoupon = couponModel.findUserCoupons(testUserId)[0]

      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])
      const result = orderService.calculateWithDiscount(baseAmount, testUserId, userCoupon.id)

      expect(result.couponDiscount).toBe(0)
      expect(result.payAmount).toBe(200)
    })

    it('应正确应用积分抵扣', () => {
      memberModel.earnPoints(testUserId, 500, '测试积分')

      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])
      const result = orderService.calculateWithDiscount(baseAmount, testUserId, undefined, true)

      expect(result.pointsDiscount).toBe(200)
      expect(result.payAmount).toBe(0)
    })

    it('积分不足时仅抵扣可用部分', () => {
      memberModel.earnPoints(testUserId, 50, '测试积分')

      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])
      const result = orderService.calculateWithDiscount(baseAmount, testUserId, undefined, true)

      expect(result.pointsDiscount).toBe(50)
      expect(result.payAmount).toBe(150)
    })

    it('应同时应用优惠券和积分抵扣', () => {
      const coupon = couponModel.create({
        name: '测试优惠券组合',
        type: 'fixed',
        value: 20,
        min_amount: 0,
        total_quantity: 100,
        start_time: new Date(Date.now() - 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      })
      couponModel.claimCoupon(testUserId, coupon!.id)
      const userCoupon = couponModel.findUserCoupons(testUserId)[0]

      memberModel.earnPoints(testUserId, 100, '测试积分')

      const baseAmount = orderService.calculateAmount([{ price: 100, quantity: 2 }])
      const result = orderService.calculateWithDiscount(baseAmount, testUserId, userCoupon.id, true)

      expect(result.couponDiscount).toBe(20)
      expect(result.pointsDiscount).toBe(100)
      expect(result.discountAmount).toBe(120)
      expect(result.payAmount).toBe(80)
    })
  })

  describe('previewOrder', () => {
    it('购物车无选中商品时应抛出错误', () => {
      expect(() => {
        orderService.previewOrder(testUserId, { type: 'cart', cartItemIds: [] })
      }).toThrow('请选择要结算的商品')
    })

    it('无效订单类型应抛出错误', () => {
      expect(() => {
        orderService.previewOrder(testUserId, { type: 'invalid' as 'cart' })
      }).toThrow('无效的订单类型')
    })

    it('直接购买未传商品时应抛出错误', () => {
      expect(() => {
        orderService.previewOrder(testUserId, { type: 'direct', items: [] })
      }).toThrow('请选择要购买的商品')
    })

    it('商品不存在时应抛出错误', () => {
      expect(() => {
        orderService.previewOrder(testUserId, {
          type: 'direct',
          items: [{ productId: 'non_existent_product', quantity: 1 }],
        })
      }).toThrow('商品不存在')
    })

    it('库存不足时应抛出错误', () => {
      expect(() => {
        orderService.previewOrder(testUserId, {
          type: 'direct',
          items: [{ productId: testProductId, quantity: 9999 }],
        })
      }).toThrow('库存不足')
    })

    it('应正确预览直接购买订单', () => {
      const result = orderService.previewOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 2 }],
        addressId: testAddressId,
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].product_id).toBe(testProductId)
      expect(result.items[0].quantity).toBe(2)
      expect(result.totalAmount).toBe(200)
      expect(result.payAmount).toBe(200)
      expect(result.shippingAddress).not.toBeNull()
      expect(result.shippingAddress?.id).toBe(testAddressId)
    })

    it('应正确预览带优惠券和积分的订单', () => {
      const coupon = couponModel.create({
        name: '测试优惠券预览',
        type: 'fixed',
        value: 30,
        min_amount: 0,
        total_quantity: 100,
        start_time: new Date(Date.now() - 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      })
      couponModel.claimCoupon(testUserId, coupon!.id)
      const userCoupon = couponModel.findUserCoupons(testUserId)[0]

      memberModel.earnPoints(testUserId, 50, '测试积分')

      const result = orderService.previewOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 2 }],
        addressId: testAddressId,
        couponId: userCoupon.id,
        usePoints: true,
      })

      expect(result.couponDiscount).toBe(30)
      expect(result.pointsDiscount).toBe(50)
      expect(result.payAmount).toBe(120)
    })

    it('未指定地址时应返回默认地址', () => {
      const result = orderService.previewOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 1 }],
      })

      expect(result.shippingAddress).not.toBeNull()
      expect(result.shippingAddress?.name).toBe('测试用户')
    })
  })

  describe('createOrder', () => {
    it('未选择收货地址时应抛出错误', async () => {
      await expect(
        orderService.createOrder(testUserId, {
          type: 'direct',
          items: [{ productId: testProductId, quantity: 1 }],
          addressId: '',
        })
      ).rejects.toThrow('请选择收货地址')
    })

    it('收货地址不存在时应抛出错误', async () => {
      await expect(
        orderService.createOrder(testUserId, {
          type: 'direct',
          items: [{ productId: testProductId, quantity: 1 }],
          addressId: 'non_existent_address',
        })
      ).rejects.toThrow('收货地址不存在')
    })

    it('商品不存在时应抛出错误', async () => {
      await expect(
        orderService.createOrder(testUserId, {
          type: 'direct',
          items: [{ productId: 'non_existent_product', quantity: 1 }],
          addressId: testAddressId,
        })
      ).rejects.toThrow('商品不存在')
    })

    it('直接购买未传商品时应抛出错误', async () => {
      await expect(
        orderService.createOrder(testUserId, {
          type: 'direct',
          items: [],
          addressId: testAddressId,
        })
      ).rejects.toThrow('请选择要购买的商品')
    })

    it('无效订单类型应抛出错误', async () => {
      await expect(
        orderService.createOrder(testUserId, {
          type: 'invalid' as 'cart',
          addressId: testAddressId,
        })
      ).rejects.toThrow('无效的订单类型')
    })

    it('购物车无选中商品时应抛出错误', async () => {
      await expect(
        orderService.createOrder(testUserId, {
          type: 'cart',
          cartItemIds: [],
          addressId: testAddressId,
        })
      ).rejects.toThrow('请选择要结算的商品')
    })

    it('应成功创建直接购买订单', async () => {
      const order = (await orderService.createOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 2 }],
        addressId: testAddressId,
        remark: '测试订单备注',
      })) as OrderRow

      expect(order).toBeDefined()
      expect(order.user_id).toBe(testUserId)
      expect(order.total_amount).toBe(200)
      expect(order.pay_amount).toBe(200)
      expect(order.status).toBe('pending')
      expect(order.remark).toBe('测试订单备注')

      const items = db
        .prepare('SELECT * FROM order_items WHERE order_id = ?')
        .all(order.id) as OrderItemRow[]
      expect(items).toHaveLength(1)
      expect(items[0].product_id).toBe(testProductId)
      expect(items[0].quantity).toBe(2)

      const product = productModel.findById(testProductId)
      expect(product?.stock).toBe(98)
    })

    it('应成功创建带 SKU 的直接购买订单', async () => {
      const order = (await orderService.createOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, skuId: testSkuId, quantity: 2 }],
        addressId: testAddressId,
      })) as OrderRow

      expect(order).toBeDefined()
      expect(order.total_amount).toBe(180)

      const items = db
        .prepare('SELECT * FROM order_items WHERE order_id = ?')
        .all(order.id) as OrderItemRow[]
      expect(items).toHaveLength(1)
      expect(items[0].sku_id).toBe(testSkuId)
      expect(items[0].price).toBe(90)
    })

    it('应成功创建带优惠券的订单', async () => {
      const coupon = couponModel.create({
        name: '测试优惠券下单',
        type: 'fixed',
        value: 20,
        min_amount: 100,
        total_quantity: 100,
        start_time: new Date(Date.now() - 60000).toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      })
      couponModel.claimCoupon(testUserId, coupon!.id)
      const userCoupon = couponModel.findUserCoupons(testUserId)[0]

      const order = (await orderService.createOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 2 }],
        addressId: testAddressId,
        couponId: userCoupon.id,
      })) as OrderRow

      expect(order.discount_amount).toBe(20)
      expect(order.pay_amount).toBe(180)

      const updatedCoupon = couponModel.findUserCouponById(userCoupon.id, testUserId)
      expect(updatedCoupon?.status).toBe('used')
    })

    it('应成功创建带积分抵扣的订单', async () => {
      memberModel.earnPoints(testUserId, 500, '测试积分')

      const order = (await orderService.createOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 2 }],
        addressId: testAddressId,
        usePoints: true,
      })) as OrderRow

      expect(order.discount_amount).toBe(200)
      expect(order.pay_amount).toBe(0)

      const points = memberModel.getUserPoints(testUserId)
      expect(points?.balance).toBe(300)
    })

    it('库存不足时应抛出错误', async () => {
      productModel.update(testProductId, { stock: 1 })

      await expect(
        orderService.createOrder(testUserId, {
          type: 'direct',
          items: [{ productId: testProductId, quantity: 2 }],
          addressId: testAddressId,
        })
      ).rejects.toThrow('库存不足')
    })

    it('应成功创建购物车订单并清除购物车项', async () => {
      const now = new Date().toISOString()
      const cartId = generateId('CART')
      // 使用 SKU，购物车项通过 sku_price 计算价格
      db.prepare(
        'INSERT INTO carts (id, user_id, product_id, sku_id, quantity, selected, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
      ).run(cartId, testUserId, testProductId, testSkuId, 2, now, now)

      const order = (await orderService.createOrder(testUserId, {
        type: 'cart',
        cartItemIds: [cartId],
        addressId: testAddressId,
      })) as OrderRow

      expect(order).toBeDefined()
      expect(order.total_amount).toBe(180)

      const cartItems = db.prepare('SELECT * FROM carts WHERE id = ?').get(cartId)
      expect(cartItems).toBeUndefined()
    })
  })

  describe('getOrderDetail', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.getOrderDetail('non_existent_order', testUserId)
      }).toThrow('订单不存在')
    })

    it('无权查看时应抛出错误', () => {
      const order = createTestOrder(testUserId)

      expect(() => {
        orderService.getOrderDetail(order.id, otherUserId)
      }).toThrow('无权查看该订单')
    })

    it('应成功获取订单详情（含订单项）', () => {
      const order = createTestOrder(testUserId)

      const detail = orderService.getOrderDetail(order.id, testUserId) as OrderRow

      expect(detail).toBeDefined()
      expect(detail.id).toBe(order.id)
      expect(detail.items).toHaveLength(1)
      expect(detail.shipping_address).toEqual(expect.objectContaining({ name: '测试用户' }))
    })
  })

  describe('getOrderList', () => {
    it('无订单时应返回空列表', () => {
      const result = orderService.getOrderList('non_existent_user')

      expect(result).toEqual({ orders: [], total: 0 })
    })

    it('应返回用户订单列表', () => {
      createTestOrder(testUserId)
      createTestOrder(testUserId, { quantity: 2 })

      const result = orderService.getOrderList(testUserId)

      expect(result.total).toBe(2)
      expect(result.orders).toHaveLength(2)
      expect(result.orders[0].items).toBeDefined()
    })

    it('应按状态筛选订单', () => {
      createTestOrder(testUserId, { status: 'pending' })
      createTestOrder(testUserId, { status: 'paid' })

      const result = orderService.getOrderList(testUserId, { status: 'paid' })

      expect(result.total).toBe(1)
      expect(result.orders[0].status).toBe('paid')
    })

    it('应正确分页', () => {
      for (let i = 0; i < 5; i++) {
        createTestOrder(testUserId)
      }

      const page1 = orderService.getOrderList(testUserId, { page: 1, pageSize: 2 })
      const page2 = orderService.getOrderList(testUserId, { page: 2, pageSize: 2 })

      expect(page1.total).toBe(5)
      expect(page1.orders).toHaveLength(2)
      expect(page2.orders).toHaveLength(2)
      // 确保不同页不重复
      expect(page1.orders[0].id).not.toBe(page2.orders[0].id)
    })
  })

  describe('getAllOrders', () => {
    it('无订单时应返回空列表', () => {
      const result = orderService.getAllOrders()

      expect(result).toEqual({ orders: [], total: 0 })
    })

    it('应返回所有订单', () => {
      createTestOrder(testUserId)
      createTestOrder(otherUserId)

      const result = orderService.getAllOrders({ userId: '' })

      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('应按用户筛选', () => {
      createTestOrder(testUserId)
      createTestOrder(otherUserId)

      const result = orderService.getAllOrders({ userId: testUserId })

      expect(result.total).toBe(1)
      expect(result.orders[0].user_id).toBe(testUserId)
    })

    it('应按状态筛选', () => {
      createTestOrder(testUserId, { status: 'pending' })
      createTestOrder(testUserId, { status: 'paid' })

      const result = orderService.getAllOrders({ status: 'paid' })

      expect(result.total).toBe(1)
      expect(result.orders[0].status).toBe('paid')
    })

    it('应按订单号筛选', () => {
      const order = createTestOrder(testUserId)

      const result = orderService.getAllOrders({ orderNo: order.order_no })

      expect(result.total).toBe(1)
      expect(result.orders[0].order_no).toBe(order.order_no)
    })

    it('应正确分页', () => {
      for (let i = 0; i < 5; i++) {
        createTestOrder(testUserId)
      }

      const page1 = orderService.getAllOrders({ page: 1, pageSize: 2 })
      const page2 = orderService.getAllOrders({ page: 2, pageSize: 2 })

      expect(page1.orders).toHaveLength(2)
      expect(page2.orders).toHaveLength(2)
    })
  })

  describe('cancelOrder', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.cancelOrder('non_existent_order', testUserId)
      }).toThrow('订单不存在')
    })

    it('无权操作时应抛出错误', () => {
      const order = createTestOrder(testUserId)

      expect(() => {
        orderService.cancelOrder(order.id, otherUserId)
      }).toThrow('无权操作该订单')
    })

    it('非待付款订单不可取消', () => {
      const order = createTestOrder(testUserId, { status: 'paid' })

      expect(() => {
        orderService.cancelOrder(order.id, testUserId)
      }).toThrow('仅待付款订单可取消')
    })

    it('应成功取消待付款订单', async () => {
      const order = (await orderService.createOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 3 }],
        addressId: testAddressId,
      })) as OrderRow

      const result = orderService.cancelOrder(order.id, testUserId) as OrderRow

      expect(result.status).toBe('cancelled')
      expect(result.cancel_reason).toBe('')

      // 验证库存已恢复
      const product = productModel.findById(testProductId)
      expect(product?.stock).toBe(100)
    })

    it('应记录取消原因', () => {
      const order = createTestOrder(testUserId)

      const result = orderService.cancelOrder(order.id, testUserId, '不想要了') as OrderRow

      expect(result.status).toBe('cancelled')
      expect(result.cancel_reason).toBe('不想要了')
    })
  })

  describe('handlePaymentCallback', () => {
    it('订单不存在时应抛出错误', async () => {
      await expect(
        orderService.handlePaymentCallback({
          orderId: 'non_existent_order',
          orderNo: 'TEST123',
          payStatus: 'success',
          payAmount: 100,
          payMethod: 'wechat',
        })
      ).rejects.toThrow('订单不存在')
    })

    it('订单号不匹配时应抛出错误', async () => {
      const order = createTestOrder(testUserId)

      await expect(
        orderService.handlePaymentCallback({
          orderId: order.id,
          orderNo: 'WRONG_ORDER_NO',
          payStatus: 'success',
          payAmount: 100,
          payMethod: 'wechat',
        })
      ).rejects.toThrow('订单号不匹配')
    })

    it('支付金额不匹配时应抛出错误', async () => {
      const order = createTestOrder(testUserId, { payAmount: 100 })

      await expect(
        orderService.handlePaymentCallback({
          orderId: order.id,
          orderNo: order.order_no,
          payStatus: 'success',
          payAmount: 200,
          payMethod: 'wechat',
        })
      ).rejects.toThrow('支付金额不匹配')
    })

    it('应成功处理支付回调', async () => {
      const order = createTestOrder(testUserId, { payAmount: 100 })

      const result = (await orderService.handlePaymentCallback({
        orderId: order.id,
        orderNo: order.order_no,
        payStatus: 'success',
        payAmount: 100,
        payMethod: 'wechat',
      })) as OrderRow

      expect(result.status).toBe('paid')
      expect(result.pay_method).toBe('wechat')
      expect(result.pay_time).toBeDefined()
    })

    it('已支付订单重复回调应返回原订单', async () => {
      const order = createTestOrder(testUserId, { status: 'paid', payAmount: 100 })

      const result = (await orderService.handlePaymentCallback({
        orderId: order.id,
        orderNo: order.order_no,
        payStatus: 'success',
        payAmount: 100,
        payMethod: 'wechat',
      })) as OrderRow

      expect(result.status).toBe('paid')
      expect(result.id).toBe(order.id)
    })

    it('支付失败应取消订单', async () => {
      const order = createTestOrder(testUserId)

      const result = (await orderService.handlePaymentCallback({
        orderId: order.id,
        orderNo: order.order_no,
        payStatus: 'failed',
        payAmount: 100,
        payMethod: 'wechat',
      })) as OrderRow

      expect(result.status).toBe('cancelled')
      expect(result.cancel_reason).toBe('支付失败')
    })
  })

  describe('shipOrder', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.shipOrder('non_existent_order', {
          shippingCompany: '顺丰',
          shippingNo: 'SF123',
        })
      }).toThrow('订单不存在')
    })

    it('非待发货订单不可发货', () => {
      const order = createTestOrder(testUserId, { status: 'pending' })

      expect(() => {
        orderService.shipOrder(order.id, { shippingCompany: '顺丰', shippingNo: 'SF123' })
      }).toThrow('仅待发货订单可发货')
    })

    it('物流公司为空时应抛出错误', () => {
      const order = createTestOrder(testUserId, { status: 'paid' })

      expect(() => {
        orderService.shipOrder(order.id, { shippingCompany: '', shippingNo: 'SF123' })
      }).toThrow('物流公司和运单号不能为空')
    })

    it('运单号为空时应抛出错误', () => {
      const order = createTestOrder(testUserId, { status: 'paid' })

      expect(() => {
        orderService.shipOrder(order.id, { shippingCompany: '顺丰', shippingNo: '' })
      }).toThrow('物流公司和运单号不能为空')
    })

    it('应成功发货并创建物流记录', () => {
      const order = createTestOrder(testUserId, { status: 'paid' })

      const result = orderService.shipOrder(order.id, {
        shippingCompany: '顺丰',
        shippingNo: 'SF123456',
      }) as OrderRow

      expect(result.status).toBe('shipped')
      expect(result.shipping_company).toBe('顺丰')
      expect(result.shipping_no).toBe('SF123456')
      expect(result.shipped_at).toBeDefined()

      const logistics = orderModel.getLogisticsByOrderId(order.id)
      expect(logistics).toHaveLength(1)
      expect(logistics[0].company).toBe('顺丰')
      expect(logistics[0].status).toBe('shipped')
    })
  })

  describe('confirmReceive', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.confirmReceive('non_existent_order', testUserId)
      }).toThrow('订单不存在')
    })

    it('无权操作时应抛出错误', () => {
      const order = createTestOrder(testUserId, { status: 'shipped' })

      expect(() => {
        orderService.confirmReceive(order.id, otherUserId)
      }).toThrow('无权操作该订单')
    })

    it('非待收货订单不可确认收货', () => {
      const order = createTestOrder(testUserId, { status: 'pending' })

      expect(() => {
        orderService.confirmReceive(order.id, testUserId)
      }).toThrow('仅待收货订单可确认收货')
    })

    it('应成功确认收货', () => {
      const order = createTestOrder(testUserId, { status: 'shipped' })

      const result = orderService.confirmReceive(order.id, testUserId) as OrderRow

      expect(result.status).toBe('completed')
      expect(result.completed_at).toBeDefined()
    })
  })

  describe('applyRefund', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.applyRefund('non_existent_order', testUserId, { reason: '质量问题' })
      }).toThrow('订单不存在')
    })

    it('无权操作时应抛出错误', () => {
      const order = createTestOrder(testUserId, { status: 'paid' })

      expect(() => {
        orderService.applyRefund(order.id, otherUserId, { reason: '质量问题' })
      }).toThrow('无权操作该订单')
    })

    it('当前状态不可申请退款', () => {
      const order = createTestOrder(testUserId, { status: 'pending' })

      expect(() => {
        orderService.applyRefund(order.id, testUserId, { reason: '质量问题' })
      }).toThrow('当前订单状态不可申请退款')
    })

    it('退款原因为空时应抛出错误', () => {
      const order = createTestOrder(testUserId, { status: 'paid' })

      expect(() => {
        orderService.applyRefund(order.id, testUserId, { reason: '' })
      }).toThrow('退款原因不能为空')
    })

    it('退款金额超过支付金额时应抛出错误', () => {
      const order = createTestOrder(testUserId, { status: 'paid', payAmount: 100 })

      expect(() => {
        orderService.applyRefund(order.id, testUserId, { reason: '质量问题', refundAmount: 200 })
      }).toThrow('退款金额无效')
    })

    it('退款金额为负数时应抛出错误', () => {
      const order = createTestOrder(testUserId, { status: 'paid', payAmount: 100 })

      expect(() => {
        orderService.applyRefund(order.id, testUserId, { reason: '质量问题', refundAmount: -10 })
      }).toThrow('退款金额无效')
    })

    it('应成功申请退款', () => {
      const order = createTestOrder(testUserId, { status: 'paid', payAmount: 100 })

      const result = orderService.applyRefund(order.id, testUserId, {
        reason: '质量问题',
      }) as OrderRow

      expect(result.status).toBe('refunding')
      expect(result.refund_reason).toBe('质量问题')
      expect(result.refund_amount).toBe(100)
    })

    it('应支持已发货订单申请退款', () => {
      const order = createTestOrder(testUserId, { status: 'shipped', payAmount: 100 })

      const result = orderService.applyRefund(order.id, testUserId, {
        reason: '商品损坏',
      }) as OrderRow

      expect(result.status).toBe('refunding')
    })
  })

  describe('auditRefund', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.auditRefund('non_existent_order', { approved: true })
      }).toThrow('订单不存在')
    })

    it('非退款中订单不可审核', () => {
      const order = createTestOrder(testUserId, { status: 'paid' })

      expect(() => {
        orderService.auditRefund(order.id, { approved: true })
      }).toThrow('仅退款中订单可审核')
    })

    it('应成功批准退款并恢复库存', async () => {
      // 先创建订单（扣减库存）
      const order = (await orderService.createOrder(testUserId, {
        type: 'direct',
        items: [{ productId: testProductId, quantity: 3 }],
        addressId: testAddressId,
      })) as OrderRow

      // 模拟支付后申请退款
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('refunding', order.id)

      const productBefore = productModel.findById(testProductId)
      expect(productBefore?.stock).toBe(97)

      const result = orderService.auditRefund(order.id, {
        approved: true,
        remark: '同意退款',
      }) as OrderRow

      expect(result.status).toBe('refunded')
      expect(result.refund_remark).toBe('同意退款')
      expect(result.refunded_at).toBeDefined()

      // 库存应恢复
      const productAfter = productModel.findById(testProductId)
      expect(productAfter?.stock).toBe(100)
    })

    it('应成功拒绝退款', () => {
      const order = createTestOrder(testUserId, { status: 'refunding', payAmount: 100 })

      const result = orderService.auditRefund(order.id, {
        approved: false,
        remark: '拒绝退款',
      }) as OrderRow

      expect(result.status).toBe('paid')
      expect(result.refund_remark).toBe('拒绝退款')
    })
  })

  describe('addLogistics', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.addLogistics('non_existent_order', { status: 'shipped' })
      }).toThrow('订单不存在')
    })

    it('无效物流状态应抛出错误', () => {
      const order = createTestOrder(testUserId)

      expect(() => {
        orderService.addLogistics(order.id, { status: 'invalid_status' })
      }).toThrow('无效的物流状态')
    })

    it('应成功添加物流信息', () => {
      const order = createTestOrder(testUserId, { status: 'shipped' })
      db.prepare('UPDATE orders SET shipping_company = ?, shipping_no = ? WHERE id = ?').run(
        '顺丰',
        'SF123',
        order.id
      )

      const logisticsId = orderService.addLogistics(order.id, {
        status: 'delivering',
        location: '深圳转运中心',
        description: '运输中',
      }) as string

      expect(logisticsId).toBeDefined()

      const logistics = orderModel.getLogisticsByOrderId(order.id)
      expect(logistics).toHaveLength(1)
      expect(logistics[0].status).toBe('delivering')
      expect(logistics[0].location).toBe('深圳转运中心')
    })
  })

  describe('getLogistics', () => {
    it('订单不存在时应抛出错误', () => {
      expect(() => {
        orderService.getLogistics('non_existent_order', testUserId)
      }).toThrow('订单不存在')
    })

    it('无权查看时应抛出错误', () => {
      const order = createTestOrder(testUserId)

      expect(() => {
        orderService.getLogistics(order.id, otherUserId)
      }).toThrow('无权查看该订单物流')
    })

    it('应成功获取物流信息', () => {
      const order = createTestOrder(testUserId, { status: 'shipped' })

      orderModel.createLogistics({
        order_id: order.id,
        company: '顺丰',
        tracking_no: 'SF123',
        status: 'shipped',
        location: '仓库',
        description: '已发货',
      })

      const logistics = orderService.getLogistics(order.id, testUserId)

      expect(logistics).toHaveLength(1)
      expect(logistics[0].company).toBe('顺丰')
      expect(logistics[0].tracking_no).toBe('SF123')
    })
  })

  describe('attachOrderItems', () => {
    it('应解析 JSON 格式的 shipping_address', () => {
      const orders = [
        {
          id: 'test_order_attach_1',
          shipping_address: '{"name":"测试","phone":"13800138000"}',
        },
      ]

      const result = orderService.attachOrderItems(orders)

      expect(result[0].shipping_address).toEqual({ name: '测试', phone: '13800138000' })
      expect(result[0].items).toEqual([])
    })

    it('应处理无效 JSON 的 shipping_address', () => {
      const orders = [
        {
          id: 'test_order_attach_2',
          shipping_address: 'invalid_json',
        },
      ]

      const result = orderService.attachOrderItems(orders)

      expect(result[0].shipping_address).toEqual({})
    })

    it('应附加订单项到订单', () => {
      const order = createTestOrder(testUserId)
      const orders = [{ id: order.id, shipping_address: '{}' }]

      const result = orderService.attachOrderItems(orders)

      expect(result[0].items).toHaveLength(1)
    })
  })
})
