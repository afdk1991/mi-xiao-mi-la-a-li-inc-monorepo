import request from 'supertest'
import app from '../../app'

describe('Auth E2E Tests with PostgreSQL', () => {
  let accessToken: string
  let refreshToken: string

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser_postgres',
        email: 'testuser_postgres@gexm.com',
        password: 'Password123',
        nickname: '测试用户',
      })

      expect(response.status).toBe(201)
      expect(response.body.code).toBe(0)
      expect(response.body.data.user.username).toBe('testuser_postgres')
      expect(response.body.data.user.email).toBe('testuser_postgres@gexm.com')
    })

    it('should reject duplicate username', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser_postgres',
        email: 'another@gexm.com',
        password: 'Password123',
      })

      expect(response.status).toBe(409)
      expect(response.body.code).not.toBe(0)
    })

    it('should reject duplicate email', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'anotheruser',
        email: 'testuser_postgres@gexm.com',
        password: 'Password123',
      })

      expect(response.status).toBe(409)
      expect(response.body.code).not.toBe(0)
    })

    it('should reject weak password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'weakuser',
        email: 'weak@gexm.com',
        password: '123456',
      })

      expect(response.status).toBe(400)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: 'testuser_postgres',
        password: 'Password123',
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
      expect(response.body.data.user.username).toBe('testuser_postgres')

      accessToken = response.body.data.accessToken
      refreshToken = response.body.data.refreshToken
    })

    it('should reject login with wrong password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: 'testuser_postgres',
        password: 'WrongPassword',
      })

      expect(response.status).toBe(400)
      expect(response.body.code).not.toBe(0)
    })

    it('should reject login with non-existent user', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: 'nonexistent',
        password: 'Password123',
      })

      expect(response.status).toBe(400)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.username).toBe('testuser_postgres')
    })

    it('should reject profile access without token', async () => {
      const response = await request(app).get('/api/auth/profile')

      expect(response.status).toBe(401)
    })

    it('should reject profile access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nickname: '更新后的昵称',
          phone: '13800138000',
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.nickname).toBe('更新后的昵称')
      expect(response.body.data.phone).toBe('13800138000')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()

      accessToken = response.body.data.accessToken
    })

    it('should reject refresh with invalid token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid_refresh_token',
      })

      expect(response.status).toBe(401)
      expect(response.body.code).not.toBe(0)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken,
        })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })

    it('should reject access with revoked token after logout', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(401)
    })
  })
})