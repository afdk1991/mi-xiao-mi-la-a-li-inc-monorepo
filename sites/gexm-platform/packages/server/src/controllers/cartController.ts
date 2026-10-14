// @ts-nocheck
import type { Request, Response } from 'express'
import cartModel from '../models/cartModel'
import { successResponse, errorResponse, requireUser } from '../utils/response'
import { GENERAL_ERRORS, AUTH_ERRORS } from '../constants/errorCodes'

interface AddToCartBody {
  productId?: string
  skuId?: string | null
  quantity?: number | string
}

interface UpdateQuantityBody {
  quantity?: number | string
}

interface UpdateSelectedBody {
  id?: string
  selected?: boolean | number
  allSelected?: boolean
}

interface BatchDeleteBody {
  ids?: string[]
}

const cartController = {
  async getCart(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }
    const cartItems = cartModel.findByUserId(userId)
    successResponse(res, cartItems, '获取成功')
  },

  async addToCart(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }
    const { productId, skuId, quantity = 1 } = req.body as AddToCartBody

    if (!productId) {
      errorResponse(res, '商品ID不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const qty = parseInt(String(quantity), 10)
    if (isNaN(qty) || qty <= 0) {
      errorResponse(res, '数量必须大于0', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const existing = cartModel.findByUserAndSku(userId, productId, skuId || null)

    let cartItem
    if (existing) {
      cartItem = cartModel.incrementQuantity(existing.id, qty)
    } else {
      cartItem = cartModel.create(userId, productId, skuId || null, qty)
    }

    successResponse(res, cartItem, '添加成功', 0, 201)
  },

  async updateQuantity(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }
    const { id } = req.params
    const { quantity } = req.body as UpdateQuantityBody

    const qty = parseInt(String(quantity), 10)
    if (isNaN(qty) || qty <= 0) {
      errorResponse(res, '数量必须大于0', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const cartItem = cartModel.findById(String(id))
    if (!cartItem) {
      errorResponse(res, '购物车商品不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (cartItem.user_id !== userId) {
      errorResponse(res, '无权限操作', AUTH_ERRORS.FORBIDDEN.code, 403)
      return
    }

    const updated = cartModel.updateQuantity(String(id), qty)
    successResponse(res, updated, '更新成功')
  },

  async deleteItem(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }
    const { id } = req.params

    const cartItem = cartModel.findById(String(id))
    if (!cartItem) {
      errorResponse(res, '购物车商品不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (cartItem.user_id !== userId) {
      errorResponse(res, '无权限操作', AUTH_ERRORS.FORBIDDEN.code, 403)
      return
    }

    cartModel.delete(String(id))
    successResponse(res, null, '删除成功')
  },

  async batchDelete(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }
    const { ids } = req.body as BatchDeleteBody

    if (!Array.isArray(ids) || ids.length === 0) {
      errorResponse(res, '请选择要删除的商品', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const count = cartModel.deleteByIds(userId, ids)
    successResponse(res, { deleted: count }, `删除成功，共删除${count}件商品`)
  },

  async updateSelected(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }
    const { id, selected, allSelected } = req.body as UpdateSelectedBody

    if (allSelected !== undefined) {
      const sel = allSelected ? 1 : 0
      cartModel.updateAllSelected(userId, sel)
      successResponse(res, null, allSelected ? '全选成功' : '取消全选成功')
      return
    }

    if (!id) {
      errorResponse(res, '购物车ID不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const cartItem = cartModel.findById(String(id))
    if (!cartItem) {
      errorResponse(res, '购物车商品不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (cartItem.user_id !== userId) {
      errorResponse(res, '无权限操作', AUTH_ERRORS.FORBIDDEN.code, 403)
      return
    }

    const sel = selected ? 1 : 0
    const updated = cartModel.updateSelected(String(id), sel)
    successResponse(res, updated, '更新成功')
  },

  async getCount(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }
    const count = cartModel.getCount(userId)
    successResponse(res, { count }, '获取成功')
  },
}

export default cartController
