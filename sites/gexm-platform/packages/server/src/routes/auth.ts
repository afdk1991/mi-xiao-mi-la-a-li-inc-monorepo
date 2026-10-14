import express from 'express'
import authController from '../controllers/authController'
import { authMiddleware } from '../middleware/auth'
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter'
import { validateSchema } from '../middleware/validateSchema'
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../schemas/auth'
import {
  rateLimitRegister,
  rateLimitVerifyCode,
  validateInput,
  sanitizeInput,
} from '../middleware/security'

const router = express.Router()

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 用户登录
 *     description: 使用用户名/邮箱和密码登录，返回 JWT Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名或邮箱
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 *       429:
 *         description: 请求过于频繁
 */
router.post(
  '/login',
  loginLimiter,
  validateInput,
  sanitizeInput,
  validateSchema(loginSchema),
  authController.login
)

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: 用户注册
 *     description: 注册新用户账户
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, email]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               password:
 *                 type: string
 *                 minLength: 6
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: 注册成功
 *       409:
 *         description: 用户名或邮箱已存在
 */
router.post(
  '/register',
  registerLimiter,
  rateLimitRegister,
  validateInput,
  sanitizeInput,
  validateSchema(registerSchema),
  authController.register
)

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 刷新 Token
 *     description: 使用 Refresh Token 获取新的 Access Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 刷新成功
 *       401:
 *         description: Refresh Token 无效
 */
router.post('/refresh', validateSchema(refreshTokenSchema), authController.refreshToken)

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 用户登出
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post('/logout', authMiddleware, validateSchema(refreshTokenSchema), authController.logout)

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: 获取用户信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户信息
 *       401:
 *         description: 未授权
 */
router.get('/profile', authMiddleware, authController.getProfile)
router.put(
  '/profile',
  authMiddleware,
  validateInput,
  sanitizeInput,
  validateSchema(updateProfileSchema),
  authController.updateProfile
)
router.put(
  '/password',
  authMiddleware,
  validateInput,
  sanitizeInput,
  validateSchema(changePasswordSchema),
  authController.changePassword
)
router.put(
  '/profile/complete',
  authMiddleware,
  validateInput,
  sanitizeInput,
  authController.completeProfile
)

router.post(
  '/send-phone-code',
  registerLimiter,
  rateLimitVerifyCode,
  validateInput,
  sanitizeInput,
  authController.sendPhoneCode
)
router.post(
  '/send-email-code',
  registerLimiter,
  rateLimitVerifyCode,
  validateInput,
  sanitizeInput,
  authController.sendEmailCode
)

router.post(
  '/phone-register',
  registerLimiter,
  rateLimitRegister,
  validateInput,
  sanitizeInput,
  authController.phoneRegister
)
router.post('/phone-login', loginLimiter, validateInput, sanitizeInput, authController.phoneLogin)

router.post('/verify-email', validateInput, sanitizeInput, authController.verifyEmail)
router.post(
  '/request-password-reset',
  rateLimitVerifyCode,
  validateInput,
  sanitizeInput,
  authController.requestPasswordReset
)
router.post('/reset-password', validateInput, sanitizeInput, authController.resetPassword)

export default router
