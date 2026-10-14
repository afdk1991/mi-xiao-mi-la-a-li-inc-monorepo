import userModel from './userModel'
import { getDb, closeDb } from './index'

describe('User Model', () => {
  let db: ReturnType<typeof getDb>

  beforeEach(() => {
    db = getDb()
  })

  afterAll(() => {
    closeDb()
  })

  afterEach(() => {
    db.prepare('DELETE FROM users WHERE username LIKE ?').run('test_%')
    db.prepare(
      'DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username LIKE ?)'
    ).run('test_%')
  })

  describe('create', () => {
    it('should create a user with encrypted email and phone', async () => {
      const user = await userModel.create({
        username: 'test_create_user',
        email: 'test@example.com',
        password: 'Test@1234',
        nickname: '测试用户',
        phone: '13800138000',
      })

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.username).toBe('test_create_user')
      expect(user.nickname).toBe('测试用户')
      expect(user.role).toBe('user')
      expect(user.status).toBe('active')
    })

    it('should encrypt email during storage', async () => {
      await userModel.create({
        username: 'test_encrypt_email',
        email: 'encrypt@example.com',
        password: 'Test@1234',
      })

      const rawUser = db
        .prepare('SELECT email FROM users WHERE username = ?')
        .get('test_encrypt_email') as { email: string }
      expect(rawUser.email).not.toBe('encrypt@example.com')
      expect(rawUser.email).toContain(':')
    })

    it('should encrypt phone during storage', async () => {
      await userModel.create({
        username: 'test_encrypt_phone',
        email: 'phone@example.com',
        password: 'Test@1234',
        phone: '13900139000',
      })

      const rawUser = db
        .prepare('SELECT phone FROM users WHERE username = ?')
        .get('test_encrypt_phone') as { phone: string }
      expect(rawUser.phone).not.toBe('13900139000')
      expect(rawUser.phone).toContain(':')
    })
  })

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      await userModel.create({
        username: 'test_find_user',
        email: 'find@example.com',
        password: 'Test@1234',
      })

      const user = userModel.findByUsername('test_find_user')
      expect(user).toBeDefined()
      expect(user?.username).toBe('test_find_user')
    })

    it('should return undefined for non-existent username', () => {
      const user = userModel.findByUsername('nonexistent_user')
      expect(user).toBeUndefined()
    })
  })

  describe('findById', () => {
    it('should find user by id', async () => {
      const created = await userModel.create({
        username: 'test_find_id',
        email: 'findid@example.com',
        password: 'Test@1234',
      })

      const found = userModel.findById(created.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
    })

    it('should return undefined for non-existent id', () => {
      const user = userModel.findById('non-existent-id')
      expect(user).toBeUndefined()
    })
  })

  describe('sanitizeUser', () => {
    it('should remove password from user object', async () => {
      const user = await userModel.create({
        username: 'test_sanitize',
        email: 'sanitize@example.com',
        password: 'Test@1234',
        phone: '13700137000',
      })

      const sanitized = userModel.sanitizeUser(user)
      expect(sanitized).not.toHaveProperty('password')
      expect(sanitized?.email).toBe('sanitize@example.com')
      expect(sanitized?.phone).toBe('13700137000')
    })

    it('should return null for undefined user', () => {
      const sanitized = userModel.sanitizeUser(undefined)
      expect(sanitized).toBeNull()
    })
  })

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const user = await userModel.create({
        username: 'test_compare_pwd',
        email: 'compare@example.com',
        password: 'Test@1234',
      })

      const result = await userModel.comparePassword('Test@1234', user.password)
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const user = await userModel.create({
        username: 'test_compare_pwd_wrong',
        email: 'comparewrong@example.com',
        password: 'Test@1234',
      })

      const result = await userModel.comparePassword('Wrong@1234', user.password)
      expect(result).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate a JWT token', async () => {
      const user = await userModel.create({
        username: 'test_generate_token',
        email: 'token@example.com',
        password: 'Test@1234',
      })

      const token = userModel.generateToken(user)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate and store a refresh token', async () => {
      const user = await userModel.create({
        username: 'test_refresh_token',
        email: 'refresh@example.com',
        password: 'Test@1234',
      })

      const token = userModel.generateRefreshToken(user.id)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const stored = db.prepare('SELECT * FROM refresh_tokens WHERE user_id = ?').get(user.id)
      expect(stored).toBeDefined()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', async () => {
      const user = await userModel.create({
        username: 'test_verify_refresh',
        email: 'verifyrefresh@example.com',
        password: 'Test@1234',
      })

      const token = userModel.generateRefreshToken(user.id)
      const result = userModel.verifyRefreshToken(token)

      expect(result).toBeDefined()
      expect(result?.id).toBe(user.id)
    })

    it('should return null for invalid token', () => {
      const result = userModel.verifyRefreshToken('invalid-token')
      expect(result).toBeNull()
    })
  })

  describe('updateLastLogin', () => {
    it('should update last_login_at timestamp', async () => {
      const user = await userModel.create({
        username: 'test_update_login',
        email: 'updatelogin@example.com',
        password: 'Test@1234',
      })

      const before = new Date(user.last_login_at || 0).getTime()
      userModel.updateLastLogin(user.id)

      const updated = userModel.findById(user.id)
      const after = new Date(updated?.last_login_at || 0).getTime()

      expect(after).toBeGreaterThan(before)
    })
  })

  describe('update', () => {
    it('should update user fields', async () => {
      const user = await userModel.create({
        username: 'test_update_user',
        email: 'update@example.com',
        password: 'Test@1234',
        nickname: 'Original',
      })

      const updated = userModel.update(user.id, {
        nickname: 'Updated',
      })

      expect(updated?.nickname).toBe('Updated')
      const found = userModel.findById(user.id)
      expect(found?.nickname).toBe('Updated')
    })
  })

  describe('delete', () => {
    it('should delete user', async () => {
      const user = await userModel.create({
        username: 'test_delete_user',
        email: 'delete@example.com',
        password: 'Test@1234',
      })

      const result = userModel.delete(user.id)
      expect(result).toBe(true)

      const found = userModel.findById(user.id)
      expect(found).toBeUndefined()
    })
  })

  describe('getBalance', () => {
    it('should get user balance', async () => {
      const user = await userModel.create({
        username: 'test_get_balance',
        email: 'balance@example.com',
        password: 'Test@1234',
      })

      const balance = userModel.getBalance(user.id)
      expect(balance).toBe(0)
    })
  })

  describe('updateBalance', () => {
    it('should update balance', async () => {
      const user = await userModel.create({
        username: 'test_update_balance',
        email: 'updatebalance@example.com',
        password: 'Test@1234',
      })

      const result = userModel.updateBalance(user.id, 100)
      expect(result).toBe(true)

      const balance = userModel.getBalance(user.id)
      expect(balance).toBe(100)
    })

    it('should deduct balance', async () => {
      const user = await userModel.create({
        username: 'test_deduct_balance',
        email: 'deduct@example.com',
        password: 'Test@1234',
      })

      userModel.updateBalance(user.id, 200)
      const result = userModel.deductBalance(user.id, 50)

      expect(result).toBe(true)
      const balance = userModel.getBalance(user.id)
      expect(balance).toBe(150)
    })

    it('should return false for insufficient balance', async () => {
      const user = await userModel.create({
        username: 'test_insufficient',
        email: 'insufficient@example.com',
        password: 'Test@1234',
      })

      const result = userModel.deductBalance(user.id, 100)
      expect(result).toBe(false)
    })
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await userModel.create({
        username: 'test_find_email',
        email: 'findemail@example.com',
        password: 'Test@1234',
      })

      const user = userModel.findByEmail('findemail@example.com')
      expect(user).toBeDefined()
      expect(user?.username).toBe('test_find_email')
    })

    it('should return undefined for non-existent email', () => {
      const user = userModel.findByEmail('nonexistent@example.com')
      expect(user).toBeUndefined()
    })
  })
})
