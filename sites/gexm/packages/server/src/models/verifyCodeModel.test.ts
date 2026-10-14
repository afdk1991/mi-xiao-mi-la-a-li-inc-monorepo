import { getDb, closeDb } from './index'
import verifyCodeModel from './verifyCodeModel'

describe('Verify Code Model', () => {
  let db: ReturnType<typeof getDb>

  afterAll(() => {
    closeDb()
  })

  describe('create', () => {
    const testPhone = '13800138000'
    const testType = 'register'

    beforeEach(() => {
      db = getDb()
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should create verify code for phone', () => {
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '123456',
        type: testType,
        expiresAt,
      })

      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record).toBeDefined()
      expect(record?.code).toBe('123456')
      expect(record?.used).toBe(0)
      expect(record?.attempts).toBe(0)
    })

    it('should create verify code for email', () => {
      const testEmail = 'test@example.com'
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        email: testEmail,
        code: '654321',
        type: testType,
        expiresAt,
      })

      const record = verifyCodeModel.findByEmailAndType(testEmail, testType)
      expect(record).toBeDefined()
      expect(record?.code).toBe('654321')

      try {
        db.prepare('DELETE FROM verify_codes WHERE email = ? AND type = ?').run(testEmail, testType)
      } catch {}
    })
  })

  describe('findByPhoneAndType', () => {
    const testPhone = '13900139000'
    const testType = 'login'

    beforeEach(() => {
      db = getDb()
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '111111',
        type: testType,
        expiresAt,
      })
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should find record by phone and type', () => {
      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record).toBeDefined()
      expect(record?.code).toBe('111111')
    })

    it('should return undefined for non-existent phone', () => {
      const record = verifyCodeModel.findByPhoneAndType('13999999999', testType)
      expect(record).toBeUndefined()
    })

    it('should return undefined for non-existent type', () => {
      const record = verifyCodeModel.findByPhoneAndType(testPhone, 'unknown')
      expect(record).toBeUndefined()
    })
  })

  describe('findByEmailAndType', () => {
    const testEmail = 'find@example.com'
    const testType = 'forgot_password'

    beforeEach(() => {
      db = getDb()
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        email: testEmail,
        code: '222222',
        type: testType,
        expiresAt,
      })
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE email = ? AND type = ?').run(testEmail, testType)
      } catch {}
    })

    it('should find record by email and type', () => {
      const record = verifyCodeModel.findByEmailAndType(testEmail, testType)
      expect(record).toBeDefined()
      expect(record?.code).toBe('222222')
    })

    it('should return undefined for non-existent email', () => {
      const record = verifyCodeModel.findByEmailAndType('nonexistent@example.com', testType)
      expect(record).toBeUndefined()
    })
  })

  describe('verify', () => {
    const testPhone = '13700137000'
    const testType = 'verify_phone'

    beforeEach(() => {
      db = getDb()
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should verify correct code', () => {
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '333333',
        type: testType,
        expiresAt,
      })

      const result = verifyCodeModel.verify(testPhone, undefined, testType, '333333')
      expect(result).toBe(true)

      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record?.used).toBe(1)
    })

    it('should reject incorrect code', () => {
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '333333',
        type: testType,
        expiresAt,
      })

      const result = verifyCodeModel.verify(testPhone, undefined, testType, '999999')
      expect(result).toBe(false)

      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record?.attempts).toBe(1)
    })

    it('should reject expired code', () => {
      const expiresAt = new Date(Date.now() - 1000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '333333',
        type: testType,
        expiresAt,
      })

      const result = verifyCodeModel.verify(testPhone, undefined, testType, '333333')
      expect(result).toBe(false)
    })

    it('should reject used code', () => {
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '333333',
        type: testType,
        expiresAt,
      })

      verifyCodeModel.markUsed(testPhone, undefined, testType)

      const result = verifyCodeModel.verify(testPhone, undefined, testType, '333333')
      expect(result).toBe(false)
    })

    it('should reject when attempts >= 5', () => {
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '333333',
        type: testType,
        expiresAt,
      })

      for (let i = 0; i < 5; i++) {
        verifyCodeModel.incrementAttempts(testPhone, undefined, testType)
      }

      const result = verifyCodeModel.verify(testPhone, undefined, testType, '333333')
      expect(result).toBe(false)
    })

    it('should verify email code correctly', () => {
      const testEmail = 'verify@example.com'
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        email: testEmail,
        code: '444444',
        type: testType,
        expiresAt,
      })

      const result = verifyCodeModel.verify(undefined, testEmail, testType, '444444')
      expect(result).toBe(true)

      try {
        db.prepare('DELETE FROM verify_codes WHERE email = ? AND type = ?').run(testEmail, testType)
      } catch {}
    })
  })

  describe('markUsed', () => {
    const testPhone = '13600136000'
    const testType = 'mark_used'

    beforeEach(() => {
      db = getDb()
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '555555',
        type: testType,
        expiresAt,
      })
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should mark phone code as used', () => {
      verifyCodeModel.markUsed(testPhone, undefined, testType)
      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record?.used).toBe(1)
    })
  })

  describe('incrementAttempts', () => {
    const testPhone = '13500135000'
    const testType = 'increment'

    beforeEach(() => {
      db = getDb()
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '666666',
        type: testType,
        expiresAt,
      })
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should increment attempts', () => {
      verifyCodeModel.incrementAttempts(testPhone, undefined, testType)
      verifyCodeModel.incrementAttempts(testPhone, undefined, testType)

      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record?.attempts).toBe(2)
    })
  })

  describe('delete', () => {
    const testPhone = '13400134000'
    const testType = 'delete'

    beforeEach(() => {
      db = getDb()
      const expiresAt = new Date(Date.now() + 300000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '777777',
        type: testType,
        expiresAt,
      })
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should delete record', () => {
      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record).toBeDefined()

      verifyCodeModel.delete(record!.id)

      const deletedRecord = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(deletedRecord).toBeUndefined()
    })
  })

  describe('cleanupExpired', () => {
    const testPhone = '13300133000'
    const testType = 'cleanup'

    beforeEach(() => {
      db = getDb()
    })

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should cleanup expired codes', () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString()
      verifyCodeModel.create({
        phone: testPhone,
        code: '888888',
        type: testType,
        expiresAt: expiredAt,
      })

      const recordBefore = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(recordBefore).toBeDefined()

      verifyCodeModel.cleanupExpired()

      const recordAfter = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(recordAfter).toBeUndefined()
    })
  })
})
