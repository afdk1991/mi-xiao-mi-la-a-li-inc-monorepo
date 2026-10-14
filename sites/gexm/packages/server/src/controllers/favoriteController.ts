// @ts-nocheck
import type { Request, Response } from 'express'
import { successResponse, errorResponse } from '../utils/response'
import favoriteModel from '../models/favoriteModel'
import { GENERAL_ERRORS, AUTH_ERRORS, BUSINESS_ERRORS } from '../constants/errorCodes'

// 添加收藏请求
interface AddFavoriteBody {
  productId?: string
}

// 批量删除请求
interface BatchRemoveBody {
  ids?: string[]
}

const favoriteController = {
  async getFavorites(req: Request, res: Response): Promise<void> {
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) {
      errorResponse(
        res,
        '用户未登录',
        AUTH_ERRORS.UNAUTHORIZED.code,
        AUTH_ERRORS.UNAUTHORIZED.httpStatus
      )
      return
    }

    const favorites = favoriteModel.findByUserId(userId)
    successResponse(res, favorites, '获取成功')
  },

  async addFavorite(req: Request, res: Response): Promise<void> {
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) {
      errorResponse(
        res,
        '用户未登录',
        AUTH_ERRORS.UNAUTHORIZED.code,
        AUTH_ERRORS.UNAUTHORIZED.httpStatus
      )
      return
    }

    const { productId } = req.body as AddFavoriteBody

    if (!productId) {
      errorResponse(
        res,
        '商品ID不能为空',
        GENERAL_ERRORS.MISSING_PARAMETER.code,
        GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
      )
      return
    }

    const existing = favoriteModel.findByUserAndProduct(userId, String(productId))
    if (existing) {
      errorResponse(
        res,
        '商品已收藏',
        GENERAL_ERRORS.RESOURCE_CONFLICT.code,
        GENERAL_ERRORS.RESOURCE_CONFLICT.httpStatus
      )
      return
    }

    const favorite = favoriteModel.create(userId, String(productId))
    successResponse(res, favorite, '收藏成功', 0, 201)
  },

  async removeFavorite(req: Request, res: Response): Promise<void> {
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) {
      errorResponse(
        res,
        '用户未登录',
        AUTH_ERRORS.UNAUTHORIZED.code,
        AUTH_ERRORS.UNAUTHORIZED.httpStatus
      )
      return
    }

    const { productId } = req.params

    const existing = favoriteModel.findByUserAndProduct(userId, String(productId))
    if (!existing) {
      errorResponse(
        res,
        '收藏不存在',
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
      )
      return
    }

    favoriteModel.deleteByProductId(userId, String(productId))
    successResponse(res, null, '取消收藏成功')
  },

  async batchRemove(req: Request, res: Response): Promise<void> {
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) {
      errorResponse(
        res,
        '用户未登录',
        AUTH_ERRORS.UNAUTHORIZED.code,
        AUTH_ERRORS.UNAUTHORIZED.httpStatus
      )
      return
    }

    const { ids } = req.body as BatchRemoveBody

    if (!Array.isArray(ids) || ids.length === 0) {
      errorResponse(
        res,
        '请选择要取消收藏的商品',
        GENERAL_ERRORS.MISSING_PARAMETER.code,
        GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
      )
      return
    }

    const count = favoriteModel.deleteByIds(userId, ids)
    successResponse(res, { deleted: count }, `取消收藏成功，共取消${count}件商品`)
  },

  async checkFavorite(req: Request, res: Response): Promise<void> {
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) {
      errorResponse(
        res,
        '用户未登录',
        AUTH_ERRORS.UNAUTHORIZED.code,
        AUTH_ERRORS.UNAUTHORIZED.httpStatus
      )
      return
    }

    const { productId } = req.params
    const isFavorited = favoriteModel.isFavorited(userId, String(productId))
    successResponse(res, { isFavorited }, '获取成功')
  },
}

export default favoriteController
