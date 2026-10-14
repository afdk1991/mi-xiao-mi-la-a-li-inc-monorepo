import type { Request, Response } from 'express'
import userModel from '../models/userModel'
import loginAttemptModel from '../models/loginAttemptModel'
import { successResponse, errorResponse, generateId } from '../utils/response'
import logger from '../utils/logger'
import type { AuthenticatedUser } from '../middleware/auth'

interface LoginBody {
  username?: string
  password?: string
}

interface RegisterBody {
  username?: string
  email?: string
  password?: string
  nickname?: string
  phone?: string
}

interface RefreshTokenBody {
  refreshToken?: string
}

interface UpdateProfileBody {
  nickname?: string
  avatar?: string
  phone?: string
}

interface ChangePasswordBody {
  oldPassword?: string
  newPassword?: string
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
  userId?: string
}

interface PhoneCodeBody {
  phone?: string
  type?: string
}

interface EmailCodeBody {
  email?: string
  type?: string
}

interface PhoneRegisterBody {
  phone?: string
  code?: string
  password?: string
  nickname?: string
}

interface PhoneLoginBody {
  phone?: string
  code?: string
}

interface VerifyEmailBody {
  email?: string
  code?: string
}

interface PasswordResetBody {
  email?: string
  code?: string
  newPassword?: string
}

interface CompleteProfileBody {
  nickname?: string
  avatar?: string
}

const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body as LoginBody

    if (!username || !password) {
      errorResponse(res, '用户名和密码不能为空', 1001, 400)
      return
    }

    const loginResult = loginAttemptModel.recordAttempt(String(username), false)
    if (loginResult.locked) {
      errorResponse(res, `账号已被锁定，请${Math.ceil((new Date(loginResult.lockoutEndTime!).getTime() - Date.now()) / 60000)}分钟后再试`, 1008, 423)
      return
    }

    const user = userModel.findByUsername(String(username)) || userModel.findByEmail(String(username))

    if (!user) {
      errorResponse(res, `用户名或密码错误，还剩${loginResult.remainingAttempts}次机会`, 1001, 400)
      return
    }

    if (user.status !== 'active') {
      errorResponse(res, '账号已被禁用', 1003, 403)
      return
    }

    const passwordValid = await userModel.comparePassword(String(password), user.password)
    if (!passwordValid) {
      errorResponse(res, `用户名或密码错误，还剩${loginResult.remainingAttempts}次机会`, 1001, 400)
      return
    }

    loginAttemptModel.recordAttempt(String(username), true)

    userModel.updateLastLogin(user.id)

    const accessToken = userModel.generateToken(user)
    const refreshToken = userModel.generateRefreshToken(user.id)

    logger.info('User logged in: %s', String(username), { userId: user.id })

    successResponse(
      res,
      {
        accessToken,
        refreshToken,
        user: userModel.sanitizeUser(user),
        expiresIn: 7200,
      },
      '登录成功'
    )
  },

  async register(req: Request, res: Response): Promise<void> {
    const { username, email, password, nickname, phone } = req.body as RegisterBody

    if (!username || !email || !password) {
      errorResponse(res, '用户名、邮箱和密码不能为空', 1001, 400)
      return
    }

    if (username.length < 3 || username.length > 20) {
      errorResponse(res, '用户名长度应为3-20个字符', 1001, 400)
      return
    }

    if (password.length < 8) {
      errorResponse(res, '密码长度不能少于8位', 1001, 400)
      return
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/
    if (!passwordRegex.test(password)) {
      errorResponse(res, '密码必须包含字母和数字', 1001, 400)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errorResponse(res, '邮箱格式不正确', 1001, 400)
      return
    }

    if (userModel.findByUsername(String(username))) {
      errorResponse(res, '用户名已存在', 1001, 409)
      return
    }

    if (userModel.findByEmail(String(email))) {
      errorResponse(res, '邮箱已被注册', 1001, 409)
      return
    }

    const user = await userModel.create({
      username: String(username),
      email: String(email),
      password: String(password),
      nickname,
      phone,
    })

    logger.info('User registered: %s', String(username), { userId: user?.id })

    successResponse(
      res,
      {
        user: userModel.sanitizeUser(user),
      },
      '注册成功',
      0,
      201
    )
  },

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenBody

    if (refreshToken) {
      userModel.revokeRefreshToken(String(refreshToken))
    }

    logger.info('User logged out: %s', req.user?.username)
    successResponse(res, null, '退出成功')
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenBody

    if (!refreshToken) {
      errorResponse(res, '刷新令牌不能为空', 1001, 400)
      return
    }

    const decoded = userModel.verifyRefreshToken(String(refreshToken))

    if (!decoded) {
      errorResponse(res, '刷新令牌无效或已过期', 1007, 401)
      return
    }

    const user = userModel.findById(String(decoded.id))
    if (!user || user.status !== 'active') {
      errorResponse(res, '用户不存在或已被禁用', 1002, 401)
      return
    }

    userModel.revokeRefreshToken(String(refreshToken))

    const newAccessToken = userModel.generateToken(user)
    const newRefreshToken = userModel.generateRefreshToken(user.id)

    successResponse(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 86400,
      },
      '令牌刷新成功'
    )
  },

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    successResponse(res, req.user, '获取成功')
  },

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { nickname, avatar, phone } = req.body as UpdateProfileBody

    const user = userModel.update(String(req.userId), { nickname, avatar, phone })

    logger.info('User profile updated: %s', req.user?.username)
    successResponse(res, userModel.sanitizeUser(user), '更新成功')
  },

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { oldPassword, newPassword } = req.body as ChangePasswordBody

    if (!oldPassword || !newPassword) {
      errorResponse(res, '旧密码和新密码不能为空', 1001, 400)
      return
    }

    if (newPassword.length < 8) {
      errorResponse(res, '新密码长度不能少于8位', 1001, 400)
      return
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/
    if (!passwordRegex.test(newPassword)) {
      errorResponse(res, '新密码必须包含字母和数字', 1001, 400)
      return
    }

    const user = userModel.findById(String(req.userId))
    const oldPasswordValid = await userModel.comparePassword(String(oldPassword), user?.password || '')
    if (!oldPasswordValid) {
      errorResponse(res, '旧密码错误', 1001, 400)
      return
    }

    await userModel.updatePassword(String(req.userId), String(newPassword))

    logger.info('User password changed: %s', req.user?.username)
    successResponse(res, null, '密码修改成功')
  },

  async sendPhoneCode(req: Request, res: Response): Promise<void> {
    const { phone, type = 'register' } = req.body as PhoneCodeBody

    if (!phone) {
      errorResponse(res, '手机号不能为空', 1001, 400)
      return
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(String(phone))) {
      errorResponse(res, '手机号格式不正确', 1001, 400)
      return
    }

    successResponse(res, null, '验证码已发送')
  },

  async sendEmailCode(req: Request, res: Response): Promise<void> {
    const { email, type = 'register' } = req.body as EmailCodeBody

    if (!email) {
      errorResponse(res, '邮箱不能为空', 1001, 400)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(email))) {
      errorResponse(res, '邮箱格式不正确', 1001, 400)
      return
    }

    successResponse(res, null, '验证码已发送')
  },

  async phoneRegister(req: Request, res: Response): Promise<void> {
    const { phone, code, password, nickname } = req.body as PhoneRegisterBody

    if (!phone || !code || !password) {
      errorResponse(res, '手机号、验证码和密码不能为空', 1001, 400)
      return
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(String(phone))) {
      errorResponse(res, '手机号格式不正确', 1001, 400)
      return
    }

    if (password.length < 8) {
      errorResponse(res, '密码长度不能少于8位', 1001, 400)
      return
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/
    if (!passwordRegex.test(password)) {
      errorResponse(res, '密码必须包含字母和数字', 1001, 400)
      return
    }

    const existingUser = userModel.findByEmail(String(phone))
    if (existingUser) {
      errorResponse(res, '该手机号已被注册', 1001, 409)
      return
    }

    const username = `user_${generateId().slice(0, 8)}`
    const email = `${phone}@phone.gexm`

    const user = await userModel.create({
      username,
      email,
      password: String(password),
      nickname: nickname || `用户${String(phone).slice(-4)}`,
      phone,
    })

    userModel.update(user.id, { phone_verified: 1 })

    logger.info('User registered via phone: %s', phone, { userId: user?.id })

    const accessToken = userModel.generateToken(user)
    const refreshToken = userModel.generateRefreshToken(user.id)

    successResponse(
      res,
      {
        user: userModel.sanitizeUser(user),
        accessToken,
        refreshToken,
        expiresIn: 86400,
        isNewUser: true,
      },
      '注册成功',
      0,
      201
    )
  },

  async phoneLogin(req: Request, res: Response): Promise<void> {
    const { phone, code } = req.body as PhoneLoginBody

    if (!phone || !code) {
      errorResponse(res, '手机号和验证码不能为空', 1001, 400)
      return
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(String(phone))) {
      errorResponse(res, '手机号格式不正确', 1001, 400)
      return
    }

    const user = userModel.findByEmail(String(phone)) || userModel.findByEmail(`${phone}@phone.gexm`)

    if (!user) {
      errorResponse(res, '用户不存在，请先注册', 1002, 404)
      return
    }

    if (user.status !== 'active') {
      errorResponse(res, '账号已被禁用', 1003, 403)
      return
    }

    userModel.updateLastLogin(user.id)

    const accessToken = userModel.generateToken(user)
    const refreshToken = userModel.generateRefreshToken(user.id)

    logger.info('User logged in via phone: %s', phone, { userId: user.id })

    successResponse(
      res,
      {
        accessToken,
        refreshToken,
        user: userModel.sanitizeUser(user),
        expiresIn: 86400,
        isNewUser: user.is_new_user === 1,
      },
      '登录成功'
    )
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { email, code } = req.body as VerifyEmailBody

    if (!email || !code) {
      errorResponse(res, '邮箱和验证码不能为空', 1001, 400)
      return
    }

    const user = userModel.findByEmail(String(email))
    if (!user) {
      errorResponse(res, '用户不存在', 1002, 404)
      return
    }

    userModel.update(user.id, { email_verified: 1 })

    logger.info('Email verified for user: %s', email, { userId: user.id })
    successResponse(res, null, '邮箱验证成功')
  },

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const { email } = req.body as EmailCodeBody

    if (!email) {
      errorResponse(res, '邮箱不能为空', 1001, 400)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(email))) {
      errorResponse(res, '邮箱格式不正确', 1001, 400)
      return
    }

    const user = userModel.findByEmail(String(email))
    if (!user) {
      errorResponse(res, '该邮箱未注册', 1002, 404)
      return
    }

    successResponse(res, null, '验证码已发送')
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { email, code, newPassword } = req.body as PasswordResetBody

    if (!email || !code || !newPassword) {
      errorResponse(res, '邮箱、验证码和新密码不能为空', 1001, 400)
      return
    }

    if (newPassword.length < 8) {
      errorResponse(res, '新密码长度不能少于8位', 1001, 400)
      return
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/
    if (!passwordRegex.test(newPassword)) {
      errorResponse(res, '新密码必须包含字母和数字', 1001, 400)
      return
    }

    const user = userModel.findByEmail(String(email))
    if (!user) {
      errorResponse(res, '用户不存在', 1002, 404)
      return
    }

    await userModel.updatePassword(user.id, String(newPassword))

    logger.info('Password reset for user: %s', email, { userId: user.id })
    successResponse(res, null, '密码重置成功，请重新登录')
  },

  async completeProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { nickname, avatar } = req.body as CompleteProfileBody

    const user = userModel.update(String(req.userId), { nickname, avatar, is_new_user: 0 })

    logger.info('Profile completed for user: %s', req.userId)
    successResponse(res, userModel.sanitizeUser(user), '资料完善成功')
  },
}

export default authController