import crypto from 'crypto'
import logger from '../utils/logger'
import verifyCodeModel from '../models/verifyCodeModel'
import { hashEmail } from '../utils/encrypt'

const VERIFY_CODE_EXPIRES_IN = 5 * 60 * 1000
const VERIFY_CODE_COOLDOWN = 60 * 1000

const cooldownStore = new Map<string, number>()

let cleanupInterval: ReturnType<typeof setInterval> | null = null

const verifyCodeService: {
  generateCode: () => string
  sendPhoneCode: (phone: string, type: string) => Promise<{ success: boolean; message: string }>
  sendEmailCode: (email: string, type: string) => Promise<{ success: boolean; message: string }>
  verifyPhoneCode: (phone: string, type: string, code: string) => boolean
  verifyEmailCode: (email: string, type: string, code: string) => boolean
  isInCooldown: (key: string) => boolean
  cleanupExpired: () => void
  stopCleanup: () => void
  clearCooldowns: () => void
} = {
  generateCode() {
    return crypto.randomInt(100000, 999999).toString()
  },

  async sendPhoneCode(phone, type) {
    const key = `phone:${phone}:${type}`
    if (this.isInCooldown(key)) {
      return { success: false, message: '验证码发送过于频繁，请稍后重试' }
    }

    const code = this.generateCode()
    const expiresAt = new Date(Date.now() + VERIFY_CODE_EXPIRES_IN).toISOString()

    verifyCodeModel.create({
      phone,
      code,
      type,
      expiresAt,
    })

    cooldownStore.set(key, Date.now())

    logger.info(`[VERIFY] Phone verification code sent to ${phone} (type: ${type}): ${code}`)

    return { success: true, message: '验证码已发送，请注意查收' }
  },

  async sendEmailCode(email, type) {
    const key = `email:${email}:${type}`
    if (this.isInCooldown(key)) {
      return { success: false, message: '验证码发送过于频繁，请稍后重试' }
    }

    const code = this.generateCode()
    const expiresAt = new Date(Date.now() + VERIFY_CODE_EXPIRES_IN).toISOString()

    verifyCodeModel.create({
      email: hashEmail(email),
      code,
      type,
      expiresAt,
    })

    cooldownStore.set(key, Date.now())

    logger.info(`[VERIFY] Email verification code sent to ${email} (type: ${type}): ${code}`)

    return { success: true, message: '验证码已发送，请注意查收' }
  },

  verifyPhoneCode(phone, type, code) {
    return verifyCodeModel.verify(phone, undefined, type, code)
  },

  verifyEmailCode(email, type, code) {
    return verifyCodeModel.verify(undefined, hashEmail(email), type, code)
  },

  isInCooldown(key) {
    const lastTime = cooldownStore.get(key)
    if (!lastTime) {
      return false
    }
    return Date.now() - lastTime < VERIFY_CODE_COOLDOWN
  },

  cleanupExpired() {
    const now = Date.now()
    cooldownStore.forEach((timestamp, key) => {
      if (now - timestamp > VERIFY_CODE_COOLDOWN) {
        cooldownStore.delete(key)
      }
    })
    verifyCodeModel.cleanupExpired()
  },

  stopCleanup() {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  },

  clearCooldowns() {
    cooldownStore.clear()
  },
}

if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(() => {
    verifyCodeService.cleanupExpired()
  }, 60 * 1000)
}

export default verifyCodeService
