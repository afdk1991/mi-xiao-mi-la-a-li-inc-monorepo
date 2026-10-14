import express from 'express'
import authController from '../controllers/authController'
import { authMiddleware } from '../middleware/auth'
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter'
import { validateInput, sanitizeInput, rateLimitRegister, rateLimitVerifyCode } from '../middleware/security'

const router = express.Router()

router.post('/login', loginLimiter, validateInput, sanitizeInput, authController.login)
router.post('/register', registerLimiter, rateLimitRegister, validateInput, sanitizeInput, authController.register)
router.post('/refresh', authController.refreshToken)
router.post('/logout', authMiddleware, authController.logout)

router.get('/profile', authMiddleware, authController.getProfile)
router.put('/profile', authMiddleware, validateInput, sanitizeInput, authController.updateProfile)
router.put('/password', authMiddleware, validateInput, sanitizeInput, authController.changePassword)
router.put('/profile/complete', authMiddleware, validateInput, sanitizeInput, authController.completeProfile)

router.post('/send-phone-code', registerLimiter, rateLimitVerifyCode, validateInput, sanitizeInput, authController.sendPhoneCode)
router.post('/send-email-code', registerLimiter, rateLimitVerifyCode, validateInput, sanitizeInput, authController.sendEmailCode)

router.post('/phone-register', registerLimiter, rateLimitRegister, validateInput, sanitizeInput, authController.phoneRegister)
router.post('/phone-login', loginLimiter, validateInput, sanitizeInput, authController.phoneLogin)

router.post('/verify-email', validateInput, sanitizeInput, authController.verifyEmail)
router.post('/request-password-reset', rateLimitVerifyCode, validateInput, sanitizeInput, authController.requestPasswordReset)
router.post('/reset-password', validateInput, sanitizeInput, authController.resetPassword)

export default router