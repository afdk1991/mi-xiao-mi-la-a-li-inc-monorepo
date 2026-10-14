import request from 'supertest'
import express from 'express'
import { getDb, closeDb } from '../models'
import userModel from '../models/userModel'
import orderModel from '../models/orderModel'
import paymentModel from '../models/paymentModel'
import { buildSignString, generateSignHMACSHA256, verifySign } from './paymentController'
import { generateId } from '../utils/response'
import config from '../config'
import paymentRouter from '../routes/payment'
import authRouter from '../routes/auth'

const app = express()
app.use(express.json())
app.use('/payment', paymentRouter)
app.use('/auth', authRouter)

describe('Payment Controller', () => {
  let db: ReturnType<typeof getDb>

  afterAll(() => {
    closeDb()
  })

  describe('Sign Functions', () => {
    it('should build sign string correctly', () => {
      const data = {
        name: 'test',
        amount: 100,
        sign: 'ignore',
        key: 'ignore',
        empty: '',
        nullVal: null,
        undefinedVal: undefined,
      }

      const result = buildSignString(data)
      expect(result).toBe('amount=100&name=test')
    })

    it('should generate HMACSHA256 sign correctly', () => {
      const data: Record<string, unknown> = {
        orderId: 'ORD001',
        amount: 100,
      }

      const sign1 = generateSignHMACSHA256(data, 'test_secret_12345678901234567890123456789012')
      const sign2 = generateSignHMACSHA256(data, 'test_secret_12345678901234567890123456789012')

      expect(sign1).toBe(sign2)
      expect(sign1.length).toBe(64)
    })

    it('should verify sign correctly', () => {
      const data: Record<string, unknown> = {
        orderId: 'ORD001',
        amount: 100,
      }

      const sign = generateSignHMACSHA256(data, 'test_secret_12345678901234567890123456789012')
      const result = verifySign({ ...data, sign }, 'test_secret_12345678901234567890123456789012')
      expect(result).toBe(true)
    })

    it('should reject invalid sign', () => {
      const data: Record<string, unknown> = {
        orderId: 'ORD001',
        amount: 100,
        sign: 'invalid_sign',
      }

      const result = verifySign(data, 'test_secret_12345678901234567890123456789012')
      expect(result).toBe(false)
    })

    it('should reject missing sign', () => {
      const data: Record<string, unknown> = {
        orderId: 'ORD001',
        amount: 100,
      }

      const result = verifySign(data, 'test_secret_12345678901234567890123456789012')
      expect(result).toBe(false)
    })
  })

  describe('Payment Model Integration', () => {
    let testUserId: string
    let testOrderId: string

    beforeEach(async () => {
      db = getDb()

      const username = `test_pay_model_${Date.now()}`
      const user = await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })
      testUserId = user.id

      testOrderId = generateId()
      const now = new Date().toISOString()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        testOrderId,
        `MODEL${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now
      )
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE order_id = ?').run(testOrderId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should create payment record', () => {
      const payment = paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })

      expect(payment).toBeDefined()
      expect(payment.id).toBeDefined()
      expect(payment.order_id).toBe(testOrderId)
      expect(payment.user_id).toBe(testUserId)
      expect(payment.pay_method).toBe('mock')
      expect(payment.amount).toBe(100)
    })

    it('should update payment status', () => {
      const payment = paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })

      const updatedPayment = paymentModel.updateStatus(payment.id, 'success', {
        third_party_no: 'TEST123',
      })

      expect(updatedPayment?.status).toBe('success')
      expect(updatedPayment?.third_party_no).toBe('TEST123')
    })

    it('should find payment by order id', () => {
      const payment = paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })

      const foundPayment = paymentModel.findLatestByOrderId(testOrderId)
      expect(foundPayment?.id).toBe(payment.id)
    })

    it('should find payment by payment no', () => {
      const payment = paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })

      const foundPayment = paymentModel.findByPaymentNo(payment.payment_no)
      expect(foundPayment?.id).toBe(payment.id)
    })
  })

  describe('POST /payment/pay', () => {
    let testUserId: string
    let testOrderId: string
    let token: string

    beforeEach(async () => {
      db = getDb()
      db.prepare(
        'DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
      ).run('test_pay_user_%')

      const username = `test_pay_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      token = loginResponse.body.data.accessToken
      testUserId = loginResponse.body.data.user.id

      const now = new Date().toISOString()
      testOrderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        testOrderId,
        `PAY${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now
      )
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE order_id = ?').run(testOrderId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
        db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(testUserId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should require authentication', async () => {
      const response = await request(app).post('/payment/pay').send({
        orderId: testOrderId,
        payMethod: 'mock',
      })

      expect(response.status).toBe(401)
    })

    it('should reject payment without orderId', async () => {
      const response = await request(app)
        .post('/payment/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({ payMethod: 'mock' })

      expect(response.status).toBe(400)
    })

    it('should reject payment without payMethod', async () => {
      const response = await request(app)
        .post('/payment/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: testOrderId })

      expect(response.status).toBe(400)
    })

    it('should reject invalid payMethod', async () => {
      const response = await request(app)
        .post('/payment/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: testOrderId, payMethod: 'invalid_method' })

      expect(response.status).toBe(400)
    })

    it('should reject payment for non-existent order', async () => {
      const response = await request(app)
        .post('/payment/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: 'non_existent_order', payMethod: 'mock' })

      expect(response.status).toBe(404)
    })

    it('should reject payment for order not owned by user', async () => {
      const otherUsername = `test_pay_other_${Date.now()}`
      await userModel.create({
        username: otherUsername,
        email: `${otherUsername}@example.com`,
        password: 'Test@1234',
      })

      const otherLogin = await request(app)
        .post('/auth/login')
        .send({ username: otherUsername, password: 'Test@1234' })
      const otherToken = otherLogin.body.data.accessToken

      const response = await request(app)
        .post('/payment/pay')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ orderId: testOrderId, payMethod: 'mock' })

      expect(response.status).toBe(403)
    })

    it('should reject payment for order not in pending status', async () => {
      db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(testOrderId)

      const response = await request(app)
        .post('/payment/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: testOrderId, payMethod: 'mock' })

      expect(response.status).toBe(400)
    })

    it('should process mock payment successfully', async () => {
      const response = await request(app)
        .post('/payment/pay')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: testOrderId, payMethod: 'mock' })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.status).toBe('success')
      expect(response.body.data.orderId).toBe(testOrderId)

      const order = orderModel.findById(testOrderId)
      expect(order?.status).toBe('paid')

      const payment = paymentModel.findLatestByOrderId(testOrderId)
      expect(payment?.status).toBe('success')
    })
  })

  describe('POST /payment/callback/:method', () => {
    let testUserId: string
    let testOrderId: string
    let paymentId: string

    beforeEach(async () => {
      db = getDb()

      const username = `test_callback_user_${Date.now()}`
      const user = await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })
      testUserId = user.id

      testOrderId = generateId()
      const now = new Date().toISOString()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        testOrderId,
        `CALL${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now
      )

      const payment = paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'wechat',
        amount: 100,
      })
      paymentId = payment.id
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should reject callback without valid sign', async () => {
      const response = await request(app).post('/payment/callback/wechat').send({
        paymentId: paymentId,
        status: 'success',
        amount: 100,
      })

      expect(response.status).toBe(400)
    })

    it('should reject callback for non-existent payment', async () => {
      const data = {
        paymentId: 'non_existent_payment',
        status: 'success',
        amount: 100,
      }
      const sign = generateSignHMACSHA256(data, 'test_secret_12345678901234567890123456789012')

      const response = await request(app)
        .post('/payment/callback/wechat')
        .send({
          ...data,
          sign,
        })

      expect(response.status).toBe(400)
    })

    it('should handle successful callback', async () => {
      const payment = paymentModel.findById(paymentId)
      expect(payment).toBeDefined()

      const data = {
        paymentNo: payment!.payment_no,
        status: 'success',
        amount: 100,
        thirdPartyNo: 'TEST_CALLBACK_001',
        success: true,
      }
      const sign = generateSignHMACSHA256(data, config.payment.secret)

      const response = await request(app)
        .post('/payment/callback/wechat')
        .send({
          ...data,
          sign,
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)

      const updatedPayment = paymentModel.findById(paymentId)
      expect(updatedPayment?.status).toBe('success')
    })
  })

  describe('GET /payment/:orderId/status', () => {
    let testUserId: string
    let testOrderId: string
    let token: string

    beforeEach(async () => {
      db = getDb()

      const username = `test_status_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      token = loginResponse.body.data.accessToken
      testUserId = loginResponse.body.data.user.id

      const now = new Date().toISOString()
      testOrderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        testOrderId,
        `STAT${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now
      )
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE order_id = ?').run(testOrderId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should require authentication', async () => {
      const response = await request(app).get(`/payment/${testOrderId}/status`)
      expect(response.status).toBe(401)
    })

    it('should return payment status for order without payment', async () => {
      const response = await request(app)
        .get(`/payment/${testOrderId}/status`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orderId).toBe(testOrderId)
      expect(response.body.data.paymentStatus).toBe(null)
    })

    it('should return payment status for order with payment', async () => {
      paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })

      const response = await request(app)
        .get(`/payment/${testOrderId}/status`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orderId).toBe(testOrderId)
      expect(response.body.data.paymentStatus).toBe('pending')
    })
  })

  describe('GET /payment/:orderId/query', () => {
    let testUserId: string
    let testOrderId: string
    let token: string

    beforeEach(async () => {
      db = getDb()

      const username = `test_query_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      token = loginResponse.body.data.accessToken
      testUserId = loginResponse.body.data.user.id

      const now = new Date().toISOString()
      testOrderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        testOrderId,
        `QUERY${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now
      )
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE order_id = ?').run(testOrderId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should require authentication', async () => {
      const response = await request(app).get(`/payment/${testOrderId}/query`)
      expect(response.status).toBe(401)
    })

    it('should return unpaid status for order without payment', async () => {
      const response = await request(app)
        .get(`/payment/${testOrderId}/query`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /payment/:orderId/close', () => {
    let testUserId: string
    let testOrderId: string
    let token: string

    beforeEach(async () => {
      db = getDb()

      const username = `test_close_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      token = loginResponse.body.data.accessToken
      testUserId = loginResponse.body.data.user.id

      const now = new Date().toISOString()
      testOrderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        testOrderId,
        `CLOSE${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now
      )
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE order_id = ?').run(testOrderId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should require authentication', async () => {
      const response = await request(app).post(`/payment/${testOrderId}/close`)
      expect(response.status).toBe(401)
    })

    it('should close pending payment', async () => {
      paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })

      const response = await request(app)
        .post(`/payment/${testOrderId}/close`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.status).toBe('cancelled')

      const payment = paymentModel.findLatestByOrderId(testOrderId)
      expect(payment?.status).toBe('cancelled')
    })
  })

  describe('GET /payment/list', () => {
    let testUserId: string
    let token: string

    beforeEach(async () => {
      db = getDb()

      const username = `test_list_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      token = loginResponse.body.data.accessToken
      testUserId = loginResponse.body.data.user.id
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE user_id = ?').run(testUserId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should require authentication', async () => {
      const response = await request(app).get('/payment/list')
      expect(response.status).toBe(401)
    })

    it('should return payment list', async () => {
      const response = await request(app)
        .get('/payment/list')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })

  describe('GET /payment/detail/:id', () => {
    let testUserId: string
    let testOrderId: string
    let token: string
    let paymentId: string

    beforeEach(async () => {
      db = getDb()

      const username = `test_detail_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      token = loginResponse.body.data.accessToken
      testUserId = loginResponse.body.data.user.id

      const now = new Date().toISOString()
      testOrderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        testOrderId,
        `DETAIL${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now
      )

      const payment = paymentModel.create({
        order_id: testOrderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })
      paymentId = payment.id
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId)
        db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId)
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      } catch {}
    })

    it('should require authentication', async () => {
      const response = await request(app).get(`/payment/detail/${paymentId}`)
      expect(response.status).toBe(401)
    })

    it('should return payment detail', async () => {
      const response = await request(app)
        .get(`/payment/detail/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.id).toBe(paymentId)
    })
  })
})
