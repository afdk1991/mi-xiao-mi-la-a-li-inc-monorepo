import { getDb, closeDb } from '../models'
import verifyCodeService from './verifyCodeService'
import verifyCodeModel from '../models/verifyCodeModel'

describe('Verify Code Service', () => {
  let db: ReturnType<typeof getDb>

  afterAll(() => {
    closeDb()
  })

  beforeEach(() => {
    db = getDb()
    verifyCodeService.clearCooldowns()
  })

  describe('generateCode', () => {
    it('should generate 6-digit code', () => {
      const code = verifyCodeService.generateCode()
      expect(code.length).toBe(6)
      expect(/^\d{6}$/.test(code)).toBe(true)
    })

    it('should generate different codes each time', () => {
      const code1 = verifyCodeService.generateCode()
      const code2 = verifyCodeService.generateCode()
      const code3 = verifyCodeService.generateCode()
      const codes = new Set([code1, code2, code3])
      expect(codes.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('sendPhoneCode', () => {
    const testPhone = '13811111111'
    const testType = 'service_register'

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should send phone code successfully', async () => {
      const result = await verifyCodeService.sendPhoneCode(testPhone, testType)
      expect(result.success).toBe(true)
      expect(result.message).toBe('验证码已发送，请注意查收')

      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record).toBeDefined()
      expect(record?.code.length).toBe(6)
    })

    it('should reject sending code during cooldown', async () => {
      await verifyCodeService.sendPhoneCode(testPhone, testType)

      const result = await verifyCodeService.sendPhoneCode(testPhone, testType)
      expect(result.success).toBe(false)
      expect(result.message).toBe('验证码发送过于频繁，请稍后重试')
    })
  })

  describe('sendEmailCode', () => {
    const testEmail = 'service_test@example.com'
    const testType = 'service_forgot'

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE email LIKE ? AND type = ?').run(
          `%${testEmail}%`,
          testType
        )
      } catch {}
    })

    it('should send email code successfully', async () => {
      const result = await verifyCodeService.sendEmailCode(testEmail, testType)
      expect(result.success).toBe(true)
      expect(result.message).toBe('验证码已发送，请注意查收')
    })

    it('should reject sending code during cooldown', async () => {
      await verifyCodeService.sendEmailCode(testEmail, testType)

      const result = await verifyCodeService.sendEmailCode(testEmail, testType)
      expect(result.success).toBe(false)
      expect(result.message).toBe('验证码发送过于频繁，请稍后重试')
    })
  })

  describe('verifyPhoneCode', () => {
    const testPhone = '13822222222'
    const testType = 'service_verify'

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE phone = ? AND type = ?').run(testPhone, testType)
      } catch {}
    })

    it('should verify correct phone code', async () => {
      await verifyCodeService.sendPhoneCode(testPhone, testType)

      const record = verifyCodeModel.findByPhoneAndType(testPhone, testType)
      expect(record).toBeDefined()

      const result = verifyCodeService.verifyPhoneCode(testPhone, testType, record!.code)
      expect(result).toBe(true)
    })

    it('should reject incorrect phone code', async () => {
      await verifyCodeService.sendPhoneCode(testPhone, testType)

      const result = verifyCodeService.verifyPhoneCode(testPhone, testType, '999999')
      expect(result).toBe(false)
    })
  })

  describe('verifyEmailCode', () => {
    const testEmail = 'verify_service@example.com'
    const testType = 'service_email'

    afterEach(() => {
      try {
        db.prepare('DELETE FROM verify_codes WHERE email LIKE ? AND type = ?').run(
          `%${testEmail}%`,
          testType
        )
      } catch {}
    })

    it('should verify correct email code', async () => {
      await verifyCodeService.sendEmailCode(testEmail, testType)

      const result = verifyCodeService.verifyEmailCode(testEmail, testType, '123456')
      expect(result).toBe(false)
    })
  })

  describe('isInCooldown', () => {
    it('should return false for new key', () => {
      const result = verifyCodeService.isInCooldown('test:key')
      expect(result).toBe(false)
    })
  })

  describe('cleanupExpired', () => {
    it('should cleanup expired codes', () => {
      verifyCodeService.cleanupExpired()
    })
  })

  describe('stopCleanup', () => {
    it('should stop cleanup interval', () => {
      verifyCodeService.stopCleanup()
    })
  })
})
