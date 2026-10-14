import request from 'supertest'
import express from 'express'
import authRouter from './auth'
import { getDb, closeDb } from '../models'
import verifyCodeService from '../services/verifyCodeService'
import verifyCodeModel from '../models/verifyCodeModel'
import { hashEmail } from '../utils/encrypt'

describe('Auth Routes', () => {
  const app = express()
  app.use(express.json())
  app.use('/auth', authRouter)

  let db: ReturnType<typeof getDb>

  beforeEach(() => {
    db = getDb()
    db.prepare('DELETE FROM login_attempts').run()
    db.prepare('DELETE FROM refresh_tokens').run()
    db.prepare('DELETE FROM verify_codes').run()
    verifyCodeService.clearCooldowns()
  })

  afterAll(() => {
    verifyCodeService.stopCleanup()
    closeDb()
  })

  afterEach(() => {
    db.prepare(
      'DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
    ).run('test_auth_%')
    db.prepare('DELETE FROM login_attempts').run()
    db.prepare('DELETE FROM users WHERE username LIKE ?').run('test_auth_%')
  })

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app).post('/auth/register').send({
        username: 'test_auth_user',
        email: 'test_auth@example.com',
        password: 'Test@1234',
      })

      expect(response.status).toBe(201)
      expect(response.body.code).toBe(0)
      expect(response.body.data).toHaveProperty('user')
      expect(response.body.data.user.username).toBe('test_auth_user')
    })

    it('should reject registration with weak password', async () => {
      const response = await request(app).post('/auth/register').send({
        username: 'test_auth_weak',
        email: 'test_auth_weak@example.com',
        password: 'password',
      })

      expect(response.status).toBe(400)
    })

    it('should reject registration with duplicate username', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_dup',
        email: 'test_auth_dup1@example.com',
        password: 'Test@1234',
      })

      const response = await request(app).post('/auth/register').send({
        username: 'test_auth_dup',
        email: 'test_auth_dup2@example.com',
        password: 'Test@1234',
      })

      expect(response.status).toBe(409)
    })
  })

  describe('POST /auth/login', () => {
    it('should login with correct credentials', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_login',
        email: 'test_auth_login@example.com',
        password: 'Test@1234',
      })

      const response = await request(app).post('/auth/login').send({
        username: 'test_auth_login',
        password: 'Test@1234',
      })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveProperty('accessToken')
      expect(response.body.data).toHaveProperty('refreshToken')
      expect(response.body.data.user.username).toBe('test_auth_login')
    })

    it('should reject login with wrong password', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_wrong',
        email: 'test_auth_wrong@example.com',
        password: 'Test@1234',
      })

      const response = await request(app).post('/auth/login').send({
        username: 'test_auth_wrong',
        password: 'Wrong@1234',
      })

      expect(response.status).toBe(400)
    })

    it('should reject login with non-existent user', async () => {
      const response = await request(app).post('/auth/login').send({
        username: 'non_existent_user',
        password: 'Test@1234',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_refresh',
        email: 'test_auth_refresh@example.com',
        password: 'Test@1234',
      })

      const loginResponse = await request(app).post('/auth/login').send({
        username: 'test_auth_refresh',
        password: 'Test@1234',
      })

      const refreshToken = loginResponse.body.data.refreshToken

      const response = await request(app).post('/auth/refresh').send({
        refreshToken,
      })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveProperty('accessToken')
      expect(response.body.data).toHaveProperty('refreshToken')
    })

    it('should reject invalid refresh token', async () => {
      const response = await request(app).post('/auth/refresh').send({
        refreshToken: 'invalid_token',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /auth/profile', () => {
    it('should get profile with valid token', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_profile',
        email: 'test_auth_profile@example.com',
        password: 'Test@1234',
      })

      const loginResponse = await request(app).post('/auth/login').send({
        username: 'test_auth_profile',
        password: 'Test@1234',
      })

      const accessToken = loginResponse.body.data.accessToken

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.username).toBe('test_auth_profile')
    })

    it('should reject profile access without token', async () => {
      const response = await request(app).get('/auth/profile')

      expect(response.status).toBe(401)
    })

    it('should reject profile access with invalid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid_token')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_logout',
        email: 'test_auth_logout@example.com',
        password: 'Test@1234',
      })

      const loginResponse = await request(app).post('/auth/login').send({
        username: 'test_auth_logout',
        password: 'Test@1234',
      })

      const accessToken = loginResponse.body.data.accessToken
      const refreshToken = loginResponse.body.data.refreshToken

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })

      expect(response.status).toBe(200)
    })

    it('should reject logout without token', async () => {
      const response = await request(app).post('/auth/logout').send({
        refreshToken: 'some_token',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /auth/profile', () => {
    it('should update profile successfully', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_update',
        email: 'test_auth_update@example.com',
        password: 'Test@1234',
      })

      const loginResponse = await request(app).post('/auth/login').send({
        username: 'test_auth_update',
        password: 'Test@1234',
      })

      const accessToken = loginResponse.body.data.accessToken

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nickname: 'Updated Nickname',
          avatar: 'https://example.com/avatar.png',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.nickname).toBe('Updated Nickname')
    })
  })

  describe('PUT /auth/password', () => {
    it('should change password successfully', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_password',
        email: 'test_auth_password@example.com',
        password: 'Test@1234',
      })

      const loginResponse = await request(app).post('/auth/login').send({
        username: 'test_auth_password',
        password: 'Test@1234',
      })

      const accessToken = loginResponse.body.data.accessToken

      const response = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'Test@1234',
          newPassword: 'NewPass@5678',
        })

      expect(response.status).toBe(200)
    })

    it('should reject change password with wrong old password', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_pwd_fail',
        email: 'test_auth_pwd_fail@example.com',
        password: 'Test@1234',
      })

      const loginResponse = await request(app).post('/auth/login').send({
        username: 'test_auth_pwd_fail',
        password: 'Test@1234',
      })

      const accessToken = loginResponse.body.data.accessToken

      const response = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'Wrong@1234',
          newPassword: 'NewPass@5678',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /auth/send-phone-code', () => {
    it('should reject empty phone', async () => {
      const response = await request(app).post('/auth/send-phone-code').send({})

      expect(response.status).toBe(400)
    })

    it('should reject invalid phone format', async () => {
      const response = await request(app).post('/auth/send-phone-code').send({ phone: '12345' })

      expect(response.status).toBe(400)
    })

    it('should send phone code successfully', async () => {
      const response = await request(app).post('/auth/send-phone-code').send({
        phone: '13800138000',
        type: 'register',
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })

  describe('POST /auth/send-email-code', () => {
    it('should reject empty email', async () => {
      const response = await request(app).post('/auth/send-email-code').send({})

      expect(response.status).toBe(400)
    })

    it('should reject invalid email format', async () => {
      const response = await request(app).post('/auth/send-email-code').send({ email: 'invalid' })

      expect(response.status).toBe(400)
    })

    it('should send email code successfully', async () => {
      const response = await request(app).post('/auth/send-email-code').send({
        email: 'test_auth_code@example.com',
        type: 'register',
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })

  describe('POST /auth/verify-email', () => {
    it('should reject empty email or code', async () => {
      const response = await request(app).post('/auth/verify-email').send({})

      expect(response.status).toBe(400)
    })

    it('should reject invalid verification code', async () => {
      const response = await request(app).post('/auth/verify-email').send({
        email: 'test_auth_verify@example.com',
        code: '000000',
      })

      expect(response.status).toBe(400)
    })

    it('should verify email successfully', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_verify',
        email: 'test_auth_verify@example.com',
        password: 'Test@1234',
      })

      await request(app).post('/auth/send-email-code').send({
        email: 'test_auth_verify@example.com',
        type: 'verify_email',
      })

      const codeRecord = verifyCodeModel.findByEmailAndType(
        hashEmail('test_auth_verify@example.com'),
        'verify_email'
      )
      const response = await request(app).post('/auth/verify-email').send({
        email: 'test_auth_verify@example.com',
        code: codeRecord?.code,
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })

  describe('POST /auth/request-password-reset', () => {
    it('should reject empty email', async () => {
      const response = await request(app).post('/auth/request-password-reset').send({})

      expect(response.status).toBe(400)
    })

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/request-password-reset')
        .send({ email: 'invalid' })

      expect(response.status).toBe(400)
    })

    it('should reject unregistered email', async () => {
      const response = await request(app)
        .post('/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' })

      expect(response.status).toBe(404)
    })

    it('should send reset code successfully', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_reset',
        email: 'test_auth_reset@example.com',
        password: 'Test@1234',
      })

      const response = await request(app)
        .post('/auth/request-password-reset')
        .send({ email: 'test_auth_reset@example.com' })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })

  describe('POST /auth/reset-password', () => {
    it('should reject empty fields', async () => {
      const response = await request(app).post('/auth/reset-password').send({})

      expect(response.status).toBe(400)
    })

    it('should reject short password', async () => {
      const response = await request(app).post('/auth/reset-password').send({
        email: 'test_auth_reset@example.com',
        code: '123456',
        newPassword: 'short',
      })

      expect(response.status).toBe(400)
    })

    it('should reset password successfully', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_reset2',
        email: 'test_auth_reset2@example.com',
        password: 'Test@1234',
      })

      await request(app)
        .post('/auth/request-password-reset')
        .send({ email: 'test_auth_reset2@example.com' })

      const codeRecord = verifyCodeModel.findByEmailAndType(
        hashEmail('test_auth_reset2@example.com'),
        'reset_password'
      )
      const response = await request(app).post('/auth/reset-password').send({
        email: 'test_auth_reset2@example.com',
        code: codeRecord?.code,
        newPassword: 'NewPass@5678',
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(0)
    })
  })

  describe('PUT /auth/profile/complete', () => {
    it('should complete profile successfully', async () => {
      await request(app).post('/auth/register').send({
        username: 'test_auth_complete',
        email: 'test_auth_complete@example.com',
        password: 'Test@1234',
      })

      const loginResponse = await request(app).post('/auth/login').send({
        username: 'test_auth_complete',
        password: 'Test@1234',
      })

      const accessToken = loginResponse.body.data.accessToken

      const response = await request(app)
        .put('/auth/profile/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nickname: 'Completed Name',
          avatar: 'https://example.com/new-avatar.png',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.nickname).toBe('Completed Name')
    })
  })

  describe('POST /auth/phone-register', () => {
    it('should reject empty fields', async () => {
      const response = await request(app).post('/auth/phone-register').send({})

      expect(response.status).toBe(400)
    })

    it('should reject invalid phone format', async () => {
      const response = await request(app).post('/auth/phone-register').send({
        phone: '123',
        code: '123456',
        password: 'Test@1234',
      })

      expect(response.status).toBe(400)
    })

    it('should reject invalid verification code', async () => {
      const response = await request(app).post('/auth/phone-register').send({
        phone: '13800138001',
        code: '000000',
        password: 'Test@1234',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /auth/phone-login', () => {
    it('should reject empty fields', async () => {
      const response = await request(app).post('/auth/phone-login').send({})

      expect(response.status).toBe(400)
    })

    it('should reject invalid phone format', async () => {
      const response = await request(app).post('/auth/phone-login').send({
        phone: '123',
        code: '123456',
      })

      expect(response.status).toBe(400)
    })

    it('should reject invalid verification code', async () => {
      const response = await request(app).post('/auth/phone-login').send({
        phone: '13800138002',
        code: '000000',
      })

      expect(response.status).toBe(400)
    })
  })
})
