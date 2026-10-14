// @ts-nocheck
import type { Request, Response } from 'express'
import userModel, { type User } from '../models/userModel'
import { successResponse, errorResponse, paginate } from '../utils/response'
import logger from '../utils/logger'
import { GENERAL_ERRORS, BUSINESS_ERRORS } from '../constants/errorCodes'
import type { AuthenticatedUser } from '../middleware/auth'

interface CreateUserParams {
  username?: string
  email?: string
  password?: string
  nickname?: string
  phone?: string
  role?: string
  status?: string
}

interface UpdateUserParams {
  nickname?: string
  avatar?: string
  phone?: string
  role?: string
  status?: string
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

const userController = {
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(String(req.query.page || 1), 10)
      const pageSize = parseInt(String(req.query.pageSize || 20), 10)
      const keyword = String(req.query.keyword || '')

      const { users, total } = userModel.findAll({
        page,
        pageSize,
        keyword,
      })

      const sanitizedUsers = users.map((u) => userModel.sanitizeUser(u as User)).filter(Boolean)

      successResponse(res, paginate(sanitizedUsers, total, page, pageSize), '获取成功')
    } catch (error) {
      logger.error('Failed to fetch users:', (error as Error).message)
      errorResponse(res, '获取用户列表失败', GENERAL_ERRORS.OPERATION_FAILED.code, 500)
    }
  },

  async getUser(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const user = userModel.findById(String(id))

    if (!user) {
      errorResponse(
        res,
        '用户不存在',
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
      )
      return
    }

    successResponse(res, userModel.sanitizeUser(user), '获取成功')
  },

  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { username, email, password, nickname, phone, role, status } =
      req.body as CreateUserParams

    if (!username || !email || !password) {
      errorResponse(res, '用户名、邮箱和密码不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    if (userModel.findByUsername(String(username))) {
      errorResponse(res, '用户名已存在', BUSINESS_ERRORS.USERNAME_EXISTS.code, 409)
      return
    }

    if (userModel.findByEmail(String(email))) {
      errorResponse(res, '邮箱已被注册', BUSINESS_ERRORS.EMAIL_EXISTS.code, 409)
      return
    }

    const user = await userModel.create({
      username: String(username),
      email: String(email),
      password: String(password),
      nickname,
      phone,
      role,
      status,
    })

    logger.info('User created by admin: %s', username, { adminId: req.user?.id })

    successResponse(res, userModel.sanitizeUser(user), '创建成功', 0, 201)
  },

  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { nickname, avatar, phone, role, status } = req.body as UpdateUserParams

    const user = userModel.findById(String(id))
    if (!user) {
      errorResponse(
        res,
        '用户不存在',
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
      )
      return
    }

    const updatedUser = userModel.update(String(id), { nickname, avatar, phone, role, status })

    logger.info('User updated by admin: %s', user.username, { adminId: req.user?.id })

    successResponse(res, userModel.sanitizeUser(updatedUser), '更新成功')
  },

  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const user = userModel.findById(String(id))
    if (!user) {
      errorResponse(res, '用户不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (String(id) === String(req.user?.id)) {
      errorResponse(res, '不能删除自己', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    userModel.delete(String(id))

    logger.info('User deleted by admin: %s', user.username, { adminId: req.user?.id })

    successResponse(res, null, '删除成功')
  },
}

export default userController
