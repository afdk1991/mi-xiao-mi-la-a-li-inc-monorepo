import express from 'express'
import request from 'supertest'
import { getDb } from '../models'
import userModel from '../models/userModel'
import orderModel from '../models/orderModel'
import paymentModel from '../models/paymentModel'
import reconciliationController from './reconciliationController'
import { generateId } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import authRouter from '../routes/auth'

const app = express()
app.use(express.json())
app.use('/auth', authRouter)
app.use(authMiddleware)
app.get('/reconciliation', adminMiddleware, reconciliationController.getReconciliation)
app.get('/reconciliation/list', adminMiddleware, reconciliationController.getReconciliationHistory)

describe('Reconciliation Controller', () => {
  let db: ReturnType<typeof getDb>
  let adminToken: string
  let testUserId: string

  beforeAll(async () => {
    db = getDb()
    const username = `test_admin_${Date.now()}`
    await userModel.create({
      username,
      email: `${username}@example.com`,
      password: 'Test@1234',
      role: 'admin',
    })

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username, password: 'Test@1234' })
    adminToken = loginResponse.body.data.accessToken
  })

  afterEach(() => {
    try {
      db.prepare('DELETE FROM reconciliation_records WHERE recon_date >= ?').run('2024-01-01')
      db.prepare('DELETE FROM payments WHERE pay_method = ?').run('test')
      db.prepare('DELETE FROM orders WHERE order_no LIKE ?').run('TEST_%')
      if (testUserId) {
        db.prepare('DELETE FROM users WHERE id = ?').run(testUserId)
      }
    } catch {}
  })

  describe('GET /reconciliation', () => {
    it('should require admin authentication', async () => {
      const response = await request(app).get('/reconciliation').query({ date: '2024-01-01' })

      expect(response.status).toBe(401)
    })

    it('should reject without date parameter', async () => {
      const response = await request(app)
        .get('/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(400)
      expect(response.body.code).toBe(1001)
    })

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date: '2024/01/01' })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe(1001)
    })

    it('should return reconciliation result for empty data', async () => {
      const response = await request(app)
        .get('/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date: '2024-01-01' })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.orderCount).toBe(0)
      expect(response.body.data.paymentCount).toBe(0)
      expect(response.body.data.diffCount).toBe(0)
    })

    it('should detect order without payment', async () => {
      const username = `test_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      testUserId = loginResponse.body.data.user.id

      const today = new Date().toISOString().split('T')[0]
      const now = `${today} 12:00:00`
      const orderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, pay_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        orderId,
        `TEST_${Date.now()}`,
        testUserId,
        'paid',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now,
        now
      )

      const response = await request(app)
        .get('/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date: today })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.diffCount).toBe(1)
      expect(response.body.data.diffs[0].type).toBe('order_without_payment')
    })

    it('should detect payment without order', async () => {
      const username = `test_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      testUserId = loginResponse.body.data.user.id

      const today = new Date().toISOString().split('T')[0]
      const now = `${today} 12:00:00`
      const orderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, pay_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        orderId,
        `TEST_${Date.now()}`,
        testUserId,
        'pending',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now,
        now
      )

      const payment = paymentModel.create({
        order_id: orderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })
      paymentModel.updateStatus(payment.id, 'success', {
        paid_at: `${today} 12:00:00`,
      })

      db.prepare('PRAGMA foreign_keys = OFF').run()
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId)
      db.prepare('PRAGMA foreign_keys = ON').run()

      const response = await request(app)
        .get('/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date: today })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.diffCount).toBe(1)
      expect(response.body.data.diffs[0].type).toBe('payment_without_order')
    })

    it('should detect amount mismatch', async () => {
      const username = `test_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      testUserId = loginResponse.body.data.user.id

      const today = new Date().toISOString().split('T')[0]
      const now = `${today} 12:00:00`
      const orderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, pay_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        orderId,
        `TEST_${Date.now()}`,
        testUserId,
        'paid',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now,
        now
      )

      const payment = paymentModel.create({
        order_id: orderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 99,
      })
      paymentModel.updateStatus(payment.id, 'success', {
        paid_at: `${today} 12:00:00`,
      })

      const response = await request(app)
        .get('/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date: today })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.diffCount).toBe(1)
      expect(response.body.data.diffs[0].type).toBe('amount_mismatch')
    })

    it('should return matched result when order and payment match', async () => {
      const username = `test_user_${Date.now()}`
      await userModel.create({
        username,
        email: `${username}@example.com`,
        password: 'Test@1234',
      })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password: 'Test@1234' })
      testUserId = loginResponse.body.data.user.id

      const today = new Date().toISOString().split('T')[0]
      const now = `${today} 12:00:00`
      const orderId = generateId()
      db.prepare(
        'INSERT INTO orders (id, order_no, user_id, status, total_amount, freight, discount_amount, pay_amount, shipping_address, pay_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        orderId,
        `TEST_${Date.now()}`,
        testUserId,
        'paid',
        100,
        0,
        0,
        100,
        '{"name":"Test"}',
        now,
        now,
        now
      )

      const payment = paymentModel.create({
        order_id: orderId,
        user_id: testUserId,
        pay_method: 'mock',
        amount: 100,
      })
      paymentModel.updateStatus(payment.id, 'success', {
        paid_at: `${today} 12:00:00`,
      })

      const response = await request(app)
        .get('/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ date: today })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.diffCount).toBe(0)
    })
  })

  describe('GET /reconciliation/list', () => {
    it('should require admin authentication', async () => {
      const response = await request(app).get('/reconciliation/list')

      expect(response.status).toBe(401)
    })

    it('should return reconciliation history', async () => {
      const response = await request(app)
        .get('/reconciliation/list')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toHaveProperty('list')
      expect(response.body.data).toHaveProperty('total')
    })

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/reconciliation/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'matched' })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/reconciliation/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })
})
