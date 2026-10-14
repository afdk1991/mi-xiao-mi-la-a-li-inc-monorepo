import request from 'supertest'
import app from '../../app'

describe('Product E2E Tests with PostgreSQL', () => {
  let adminToken: string
  let productId: string

  beforeAll(async () => {
    const loginResponse = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123456',
    })
    adminToken = loginResponse.body.data.accessToken
  })

  describe('GET /api/products', () => {
    it('should get product list with pagination', async () => {
      const response = await request(app).get('/api/products').query({
        page: 1,
        pageSize: 10,
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toHaveProperty('list')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('pageSize')
    })

    it('should get hot products', async () => {
      const response = await request(app).get('/api/products/hot')

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should get new products', async () => {
      const response = await request(app).get('/api/products/new')

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should get price range', async () => {
      const response = await request(app).get('/api/products/price-range')

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toHaveProperty('minPrice')
      expect(response.body.data).toHaveProperty('maxPrice')
    })
  })

  describe('GET /api/products/:id', () => {
    it('should get product detail by id', async () => {
      const listResponse = await request(app).get('/api/products')
      const firstProduct = listResponse.body.data.list[0]

      if (firstProduct) {
        const response = await request(app).get(`/api/products/${firstProduct.id}`)

        expect(response.status).toBe(200)
        expect(response.body.code).toBe(0)
        expect(response.body.data.id).toBe(firstProduct.id)
      }
    })

    it('should return 404 for non-existent product', async () => {
      const response = await request(app).get('/api/products/non-existent-id-123')

      expect(response.status).toBe(404)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('GET /api/products/:id/skus', () => {
    it('should get product skus', async () => {
      const listResponse = await request(app).get('/api/products')
      const firstProduct = listResponse.body.data.list[0]

      if (firstProduct) {
        const response = await request(app).get(`/api/products/${firstProduct.id}/skus`)

        expect(response.status).toBe(200)
        expect(response.body.code).toBe(0)
        expect(Array.isArray(response.body.data)).toBe(true)
      }
    })
  })

  describe('POST /api/products (Admin)', () => {
    it('should create a new product with admin token', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'PostgreSQL Test Product',
          price: 99.99,
          original_price: 129.99,
          stock: 100,
          description: 'Test product for PostgreSQL E2E tests',
          status: 'on_sale',
        })

      expect(response.status).toBe(201)
      expect(response.body.code).toBe(0)
      expect(response.body.data.name).toBe('PostgreSQL Test Product')
      expect(response.body.data.price).toBe(99.99)

      productId = response.body.data.id
    })

    it('should reject creating product without name', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 99.99,
          stock: 100,
        })

      expect(response.status).toBe(400)
      expect(response.body.code).not.toBe(0)
    })

    it('should reject creating product without admin token', async () => {
      const response = await request(app).post('/api/products').send({
        name: 'Unauthorized Product',
        price: 99.99,
        stock: 100,
      })

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/products/:id (Admin)', () => {
    it('should update product with admin token', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated PostgreSQL Test Product',
          price: 149.99,
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.name).toBe('Updated PostgreSQL Test Product')
      expect(response.body.data.price).toBe(149.99)
    })

    it('should return 404 when updating non-existent product', async () => {
      const response = await request(app)
        .put('/api/products/non-existent-id-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Product',
        })

      expect(response.status).toBe(404)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('PATCH /api/products/:id/status (Admin)', () => {
    it('should update product status', async () => {
      const response = await request(app)
        .patch(`/api/products/${productId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'off_sale',
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.status).toBe('off_sale')
    })

    it('should reject invalid status value', async () => {
      const response = await request(app)
        .patch(`/api/products/${productId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid_status',
        })

      expect(response.status).toBe(400)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('PATCH /api/products/:id/stock (Admin)', () => {
    it('should adjust product stock', async () => {
      const response = await request(app)
        .patch(`/api/products/${productId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 50,
          reason: 'Stock adjustment test',
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })

  describe('DELETE /api/products/:id (Admin)', () => {
    it('should delete product with admin token', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })

    it('should return 404 when deleting non-existent product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(404)
      expect(response.body.code).not.toBe(0)
    })
  })
})