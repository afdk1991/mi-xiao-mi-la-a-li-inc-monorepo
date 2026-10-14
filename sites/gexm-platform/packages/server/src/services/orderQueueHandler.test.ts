/**
 * 订单队列处理器集成测试
 * 验证 Redis-backed 幂等性机制、订单超时取消、支付处理等核心流程
 */
import cacheService from './cacheService'
import { handleOrderCreated, handleOrderPaid, handleOrderCancelled } from './orderQueueHandler'
import { getDb, closeDb } from '../models'
import orderModel from '../models/orderModel'
import userModel from '../models/userModel'

describe('Order Queue Handler Integration Tests', () => {
  let db: ReturnType<typeof getDb>
  let testUserId: string
  let testOrderId: string
  const testOrderNo = 'TEST-ORD-001'

  beforeAll(async () => {
    await cacheService.init(false)
    db = getDb()

    const user = await userModel.create({
      username: 'test_queue_user',
      email: 'test_queue@example.com',
      password: 'Test@1234',
    })
    testUserId = user.id
  })

  afterAll(async () => {
    if (testOrderId) {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(testOrderId)
      db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
    closeDb()
    await cacheService.shutdown()
  })

  afterEach(async () => {
    // 清理幂等性标记
    if (testOrderId) {
      await cacheService.del(`processed:order:${testOrderId}`)
    }
  })

  describe('幂等性验证', () => {
    it('应正确标记订单为已处理', async () => {
      const orderId = 'idempotency-test-001'
      const key = `processed:order:${orderId}`

      const existsBefore = await cacheService.exists(key)
      expect(existsBefore).toBe(false)

      await cacheService.set(key, '1', 30 * 60)
      const existsAfter = await cacheService.exists(key)
      expect(existsAfter).toBe(true)
    })

    it('重复处理同一订单应被跳过', async () => {
      const orderId = 'idempotency-test-002'
      await cacheService.set(`processed:order:${orderId}`, '1', 30 * 60)

      const message = {
        orderId,
        orderNo: 'TEST-DUP-001',
        userId: testUserId,
        payAmount: 100,
        payMethod: 'wechat',
        paidAt: new Date().toISOString(),
      }

      // 第一次调用应跳过（已标记为已处理）
      await handleOrderPaid(message)

      const order = orderModel.findById(orderId)
      expect(order).toBeNull()
    })
  })

  describe('handleOrderCreated - 超时取消', () => {
    it('订单不存在时应安全跳过', async () => {
      const message = {
        orderId: 'non_existent_order',
        orderNo: 'NONEXIST-001',
        userId: testUserId,
        payAmount: 100,
        createdAt: new Date().toISOString(),
        timeoutMinutes: 15,
      }

      await expect(handleOrderCreated(message)).resolves.not.toThrow()
    })

    it('未超时的订单不应被取消', async () => {
      // 创建测试订单
      const now = new Date().toISOString()
      testOrderId = `test-order-${Date.now()}`
      db.prepare(
        `INSERT INTO orders (id, order_no, user_id, status, total_amount, pay_amount, freight, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 100, 100, 0, ?, ?)`
      ).run(testOrderId, testOrderNo, testUserId, now, now)

      const message = {
        orderId: testOrderId,
        orderNo: testOrderNo,
        userId: testUserId,
        payAmount: 100,
        createdAt: now,
        timeoutMinutes: 15,
      }

      await handleOrderCreated(message)

      const order = orderModel.findById(testOrderId)
      expect(order).not.toBeNull()
      expect(order.status).toBe('pending')
    })

    it('超时订单应被自动取消', async () => {
      // 创建超时订单（创建时间为20分钟前）
      const pastTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()
      const expiredOrderId = `test-expired-${Date.now()}`
      db.prepare(
        `INSERT INTO orders (id, order_no, user_id, status, total_amount, pay_amount, freight, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 100, 100, 0, ?, ?)`
      ).run(expiredOrderId, `EXPIRED-${Date.now()}`, testUserId, pastTime, pastTime)

      const message = {
        orderId: expiredOrderId,
        orderNo: `EXPIRED-${Date.now()}`,
        userId: testUserId,
        payAmount: 100,
        createdAt: pastTime,
        timeoutMinutes: 15,
      }

      await handleOrderCreated(message)

      const order = orderModel.findById(expiredOrderId)
      expect(order).not.toBeNull()
      expect(order.status).toBe('cancelled')

      // 清理
      db.prepare('DELETE FROM orders WHERE id = ?').run(expiredOrderId)
      await cacheService.del(`processed:order:${expiredOrderId}`)
    })

    it('已取消的订单不应重复处理', async () => {
      const pastTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()
      const cancelledOrderId = `test-cancelled-${Date.now()}`
      db.prepare(
        `INSERT INTO orders (id, order_no, user_id, status, total_amount, pay_amount, freight, created_at, updated_at)
         VALUES (?, ?, ?, 'cancelled', 100, 100, 0, ?, ?)`
      ).run(cancelledOrderId, `CANCELLED-${Date.now()}`, testUserId, pastTime, pastTime)

      const message = {
        orderId: cancelledOrderId,
        orderNo: `CANCELLED-${Date.now()}`,
        userId: testUserId,
        payAmount: 100,
        createdAt: pastTime,
        timeoutMinutes: 15,
      }

      await handleOrderCreated(message)

      const order = orderModel.findById(cancelledOrderId)
      expect(order.status).toBe('cancelled')

      // 清理
      db.prepare('DELETE FROM orders WHERE id = ?').run(cancelledOrderId)
    })
  })

  describe('handleOrderPaid - 支付处理', () => {
    it('订单不存在时应安全跳过', async () => {
      const message = {
        orderId: 'non_existent_paid_order',
        orderNo: 'NONEXIST-PAID-001',
        userId: testUserId,
        payAmount: 100,
        payMethod: 'wechat',
        paidAt: new Date().toISOString(),
      }

      await expect(handleOrderPaid(message)).resolves.not.toThrow()
    })

    it('已支付的订单不应重复处理', async () => {
      const paidOrderId = `test-paid-${Date.now()}`
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO orders (id, order_no, user_id, status, total_amount, pay_amount, freight, created_at, updated_at)
         VALUES (?, ?, ?, 'paid', 100, 100, 0, ?, ?)`
      ).run(paidOrderId, `PAID-${Date.now()}`, testUserId, now, now)

      const message = {
        orderId: paidOrderId,
        orderNo: `PAID-${Date.now()}`,
        userId: testUserId,
        payAmount: 100,
        payMethod: 'wechat',
        paidAt: now,
      }

      await handleOrderPaid(message)

      const order = orderModel.findById(paidOrderId)
      expect(order.status).toBe('paid')

      // 清理
      db.prepare('DELETE FROM orders WHERE id = ?').run(paidOrderId)
    })

    it('pending订单应成功更新为paid状态', async () => {
      const pendingOrderId = `test-pending-paid-${Date.now()}`
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO orders (id, order_no, user_id, status, total_amount, pay_amount, freight, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 100, 100, 0, ?, ?)`
      ).run(pendingOrderId, `PENDING-PAID-${Date.now()}`, testUserId, now, now)

      const message = {
        orderId: pendingOrderId,
        orderNo: `PENDING-PAID-${Date.now()}`,
        userId: testUserId,
        payAmount: 100,
        payMethod: 'alipay',
        paidAt: now,
      }

      await handleOrderPaid(message)

      const order = orderModel.findById(pendingOrderId)
      expect(order).not.toBeNull()
      expect(order.status).toBe('paid')

      // 清理
      db.prepare('DELETE FROM orders WHERE id = ?').run(pendingOrderId)
      await cacheService.del(`processed:order:${pendingOrderId}`)
    })
  })

  describe('handleOrderCancelled - 取消通知', () => {
    it('订单不存在时应安全跳过', async () => {
      const message = {
        orderId: 'non_existent_cancel_order',
        orderNo: 'NONEXIST-CANCEL-001',
        userId: testUserId,
        reason: '测试取消',
      }

      await expect(handleOrderCancelled(message)).resolves.not.toThrow()
    })

    it('已取消的订单应跳过处理', async () => {
      const cancelledOrderId = `test-already-cancelled-${Date.now()}`
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO orders (id, order_no, user_id, status, total_amount, pay_amount, freight, created_at, updated_at)
         VALUES (?, ?, ?, 'cancelled', 100, 100, 0, ?, ?)`
      ).run(cancelledOrderId, `ALREADY-CANCELLED-${Date.now()}`, testUserId, now, now)

      const message = {
        orderId: cancelledOrderId,
        orderNo: `ALREADY-CANCELLED-${Date.now()}`,
        userId: testUserId,
        reason: '重复取消测试',
      }

      await handleOrderCancelled(message)

      const order = orderModel.findById(cancelledOrderId)
      expect(order.status).toBe('cancelled')

      // 清理
      db.prepare('DELETE FROM orders WHERE id = ?').run(cancelledOrderId)
    })
  })
})
