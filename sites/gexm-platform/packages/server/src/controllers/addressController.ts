// @ts-nocheck
import type { Request, Response } from 'express'
import addressModel from '../models/addressModel'
import { successResponse, errorResponse } from '../utils/response'
import type { AuthenticatedUser } from '../middleware/auth'

interface AddressData {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  isDefault?: boolean
  tag?: string
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

const addressController = {
  async getAddresses(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id
    if (!userId) {
      errorResponse(res, '用户未登录', 1003, 401)
      return
    }
    const addresses = addressModel.findByUserId(userId)
    successResponse(res, addresses, '获取成功')
  },
  async getDefaultAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id
    if (!userId) {
      errorResponse(res, '用户未登录', 1003, 401)
      return
    }
    const address = addressModel.findDefault(userId)
    if (!address) {
      successResponse(res, null, '暂无默认地址')
      return
    }
    successResponse(res, address, '获取成功')
  },
  async getAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id
    if (!userId) {
      errorResponse(res, '用户未登录', 1003, 401)
      return
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const address = addressModel.findById(String(id))
    if (!address) {
      errorResponse(res, '地址不存在', 1004, 404)
      return
    }
    if (address.user_id !== userId) {
      errorResponse(res, '无权限查看', 1003, 403)
      return
    }
    successResponse(res, address, '获取成功')
  },
  async createAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id
    if (!userId) {
      errorResponse(res, '用户未登录', 1003, 401)
      return
    }
    const { name, phone, province, city, district, detail, isDefault, tag } =
      req.body as AddressData
    const address = addressModel.create(userId, {
      name,
      phone,
      province,
      city,
      district,
      detail,
      is_default: isDefault,
      tag,
    })
    successResponse(res, address, '创建成功', 0, 201)
  },
  async updateAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id
    if (!userId) {
      errorResponse(res, '用户未登录', 1003, 401)
      return
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { name, phone, province, city, district, detail, isDefault, tag } =
      req.body as AddressData
    const address = addressModel.findById(String(id))
    if (!address) {
      errorResponse(res, '地址不存在', 1004, 404)
      return
    }
    if (address.user_id !== userId) {
      errorResponse(res, '无权限修改', 1003, 403)
      return
    }
    const updated = addressModel.update(String(id), userId, {
      name,
      phone,
      province,
      city,
      district,
      detail,
      is_default: isDefault,
      tag,
    })
    successResponse(res, updated, '更新成功')
  },
  async deleteAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id
    if (!userId) {
      errorResponse(res, '用户未登录', 1003, 401)
      return
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const address = addressModel.findById(String(id))
    if (!address) {
      errorResponse(res, '地址不存在', 1004, 404)
      return
    }
    if (address.user_id !== userId) {
      errorResponse(res, '无权限删除', 1003, 403)
      return
    }
    addressModel.delete(String(id), userId)
    successResponse(res, null, '删除成功')
  },
  async setDefault(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id
    if (!userId) {
      errorResponse(res, '用户未登录', 1003, 401)
      return
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const address = addressModel.findById(String(id))
    if (!address) {
      errorResponse(res, '地址不存在', 1004, 404)
      return
    }
    if (address.user_id !== userId) {
      errorResponse(res, '无权限操作', 1003, 403)
      return
    }
    const updated = addressModel.setDefault(String(id), userId)
    successResponse(res, updated, '设置成功')
  },
}

export default addressController
