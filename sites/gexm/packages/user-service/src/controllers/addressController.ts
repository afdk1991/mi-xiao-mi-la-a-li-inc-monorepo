import type { Request, Response } from 'express'
import addressModel from '../models/addressModel'
import { successResponse, errorResponse } from '../utils/response'
import logger from '../utils/logger'
import type { AuthenticatedUser } from '../middleware/auth'

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
  userId?: string
}

interface CreateAddressBody {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  is_default?: boolean
  tag?: string
}

interface UpdateAddressBody {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  is_default?: boolean
  tag?: string
}

const addressController = {
  list(req: AuthenticatedRequest, res: Response): void {
    const userId = req.userId!
    const addresses = addressModel.findByUserId(userId)
    successResponse(res, addresses, '获取成功')
  },

  get(req: AuthenticatedRequest, res: Response): void {
    const userId = req.userId!
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const address = addressModel.findById(id)
    if (!address || address.user_id !== userId) {
      errorResponse(res, '地址不存在', 2001, 404)
      return
    }

    successResponse(res, address, '获取成功')
  },

  create(req: AuthenticatedRequest, res: Response): void {
    const userId = req.userId!
    const body = req.body as CreateAddressBody

    if (!body.name || !body.phone || !body.province || !body.city || !body.district || !body.detail) {
      errorResponse(res, '请填写完整的地址信息', 2001, 400)
      return
    }

    const address = addressModel.create(userId, body)

    logger.info('Address created for user: %s', userId, { addressId: address?.id })
    successResponse(res, address, '添加成功', 0, 201)
  },

  update(req: AuthenticatedRequest, res: Response): void {
    const userId = req.userId!
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const body = req.body as UpdateAddressBody

    const existing = addressModel.findById(id)
    if (!existing || existing.user_id !== userId) {
      errorResponse(res, '地址不存在', 2001, 404)
      return
    }

    const address = addressModel.update(id, userId, body)

    logger.info('Address updated for user: %s', userId, { addressId: id })
    successResponse(res, address, '更新成功')
  },

  setDefault(req: AuthenticatedRequest, res: Response): void {
    const userId = req.userId!
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const existing = addressModel.findById(id)
    if (!existing || existing.user_id !== userId) {
      errorResponse(res, '地址不存在', 2001, 404)
      return
    }

    const address = addressModel.setDefault(id, userId)

    logger.info('Address set as default for user: %s', userId, { addressId: id })
    successResponse(res, address, '设置成功')
  },

  remove(req: AuthenticatedRequest, res: Response): void {
    const userId = req.userId!
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const existing = addressModel.findById(id)
    if (!existing || existing.user_id !== userId) {
      errorResponse(res, '地址不存在', 2001, 404)
      return
    }

    addressModel.delete(id, userId)

    logger.info('Address deleted for user: %s', userId, { addressId: id })
    successResponse(res, null, '删除成功')
  },
}

export default addressController
