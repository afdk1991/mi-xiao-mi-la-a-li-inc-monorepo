import request from 'supertest'
import app from '../../app'

describe('Order E2E Tests with PostgreSQL', () => {
  let userToken: string
  let userId: string
  let productId: string
  let addressId: string
  let orderId: string

  beforeAll(async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      username: 'order_test_user',
      email: 'order_test@gexm.com',
      password: 'Password123',
      nickname: '订单测试用户',
    })

    userId = registerResponse.body.data.user.id

    const loginResponse = await request(app).post('/api/auth/login').send({
      username: 'order_test_user',
      password: 'Password123',
    })

    userToken = loginResponse.body.data.accessToken

    const productsResponse = await request(app).get('/api/products')
    if (productsResponse.body.data.list.length > 0) {
      productId = productsResponse.body.data.list[0].id
    }

    const addressResponse = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: '测试用户',
        phone: '13800138000',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园路88号',
        is_default: 1,
      })

    addressId = addressResponse.body.data.id
  })

  describe('GET /api/orders', () => {
    it('should get order list with valid token', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toHaveProperty('list')
      expect(response.body.data).toHaveProperty('total')
    })

    it('should reject order list access without token', async () => {
      const response = await request(app).get('/api/orders')

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/orders/statistics', () => {
    it('should get order statistics with valid token', async () => {
      const response = await request(app)
        .get('/api/orders/statistics')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toBeDefined()
    })
  })

  describe('POST /api/orders/preview', () => {
    it('should preview order with direct purchase', async () => {
      if (!productId || !addressId) {
        return
      }

      const response = await request(app)
        .post('/api/orders/preview')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'direct',
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
          addressId,
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toHaveProperty('totalAmount')
      expect(response.body.data).toHaveProperty('payAmount')
    })
  })

  describe('POST /api/orders', () => {
    it('should create order with direct purchase', async () => {
      if (!productId || !addressId) {
        return
      }

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'direct',
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
          addressId,
          remark: 'Test order for PostgreSQL',
        })

      expect(response.status).toBe(201)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('order_no')
      expect(response.body.data.status).toBe('pending')

      orderId = response.body.data.id
    })

    it('should reject creating order without addressId', async () => {
      if (!productId) {
        return
      }

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'direct',
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
        })

      expect(response.status).toBe(400)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should get order detail with valid token', async () => {
      if (!orderId) {
        return
      }

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.id).toBe(orderId)
    })

    it('should reject access to another user order', async () => {
      if (!orderId) {
        return
      }

      const anotherUserResponse = await request(app).post('/api/auth/register').send({
        username: 'another_order_user',
        email: 'another_order@gexm.com',
        password: 'Password123',
      })

      const anotherUserId = anotherUserResponse.body.data.user.id

      const anotherLoginResponse = await request(app).post('/api/auth/login').send({
        username: 'another_order_user',
        password: 'Password123',
      })

      const anotherUserToken = anotherLoginResponse.body.data.accessToken

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)

      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/non-existent-order-id')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(404)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('PATCH /api/orders/:id/cancel', () => {
    it('should cancel pending order', async () => {
      if (!orderId) {
        return
      }

      const response = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          cancelReason: 'Test cancellation',
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.status).toBe('cancelled')
    })

    it('should reject cancelling already cancelled order', async () => {
      if (!orderId) {
        return
      }

      const response = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(400)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('POST /api/orders/:id/refund/apply', () => {
    it('should create order and apply for refund', async () => {
      if (!productId || !addressId) {
        return
      }

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'direct',
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
          addressId,
        })

      const newOrderId = createResponse.body.data.id

      const refundResponse = await request(app)
        .post(`/api/orders/${newOrderId}/refund/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Product not as described',
        })

      expect(refundResponse.status).toBe(200)
      expect(refundResponse.body.code).toBe(0)
    })

    it('should reject refund application without reason', async () => {
      if (!productId || !addressId) {
        return
      }

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'direct',
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
          addressId,
        })

      const newOrderId = createResponse.body.data.id

      const refundResponse = await request(app)
        .post(`/api/orders/${newOrderId}/refund/apply`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})

      expect(refundResponse.status).toBe(400)
      expect(refundResponse.body.code).not.toBe(0)
    })
  })
})