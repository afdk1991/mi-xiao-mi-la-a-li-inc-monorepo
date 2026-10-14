// @ts-nocheck
import type { Request, Response } from 'express'
import { getDb } from '../models'
import searchModel from '../models/searchModel'
import { successResponse, errorResponse, paginate } from '../utils/response'
import { GENERAL_ERRORS } from '../constants/errorCodes'

type SortType = 'default' | 'sales' | 'price_asc' | 'price_desc' | 'newest'

interface FindUserHistoryOptions {
  page: number
  pageSize: number
}

const searchController = {
  async searchProducts(req: Request, res: Response): Promise<Response> {
    const {
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      sort = 'default',
      page = 1,
      pageSize = 20,
    } = req.query
    const userId = (req as Request & { user?: { id: string } }).user?.id || null

    const db = getDb()
    const offset = (parseInt(String(page), 10) - 1) * parseInt(String(pageSize), 10)

    let whereClause = "WHERE p.status = 'on_sale'"
    const params: (string | number)[] = []

    if (keyword) {
      whereClause += ' AND (p.name LIKE ? OR p.subtitle LIKE ?)'
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern)
    }

    if (categoryId) {
      whereClause += ' AND p.category_id = ?'
      params.push(String(categoryId))
    }

    if (minPrice !== undefined && minPrice !== '') {
      whereClause += ' AND p.price >= ?'
      params.push(parseFloat(String(minPrice)))
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      whereClause += ' AND p.price <= ?'
      params.push(parseFloat(String(maxPrice)))
    }

    let orderBy = 'ORDER BY p.sort_order ASC, p.created_at DESC'
    switch (sort as SortType) {
      case 'sales':
        orderBy = 'ORDER BY p.sales DESC'
        break
      case 'price_asc':
        orderBy = 'ORDER BY p.price ASC'
        break
      case 'price_desc':
        orderBy = 'ORDER BY p.price DESC'
        break
      case 'newest':
        orderBy = 'ORDER BY p.created_at DESC'
        break
    }

    const total = db
      .prepare(`SELECT COUNT(*) as count FROM products p ${whereClause}`)
      .get(...params).count

    const products = db
      .prepare(
        `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, parseInt(String(pageSize), 10), offset) as Record<string, unknown>[]

    const formattedProducts = products.map((product) => ({
      ...product,
      images: product.images ? JSON.parse(String(product.images)) : [],
    }))

    if (keyword) {
      searchModel.recordSearch(String(keyword), userId)
    }

    return successResponse(
      res,
      paginate(
        formattedProducts,
        total,
        parseInt(String(page), 10),
        parseInt(String(pageSize), 10)
      ),
      '搜索成功'
    )
  },

  async getHotKeywords(req: Request, res: Response): Promise<Response> {
    const { limit = 10 } = req.query
    const hotKeywords = searchModel.getHotKeywords(parseInt(String(limit), 10))

    if (hotKeywords.length === 0) {
      const defaultKeywords = [
        '智能手机',
        '蓝牙耳机',
        '运动T恤',
        '保湿精华',
        '坚果礼盒',
        '台灯护眼',
        '跑步鞋',
        '畅销小说',
        '无线耳机',
        '休闲服饰',
      ]
      return successResponse(res, defaultKeywords, '获取成功')
    }

    return successResponse(res, hotKeywords, '获取成功')
  },

  async getSuggestions(req: Request, res: Response): Promise<Response> {
    const { keyword, limit = 5 } = req.query

    if (!keyword) {
      return successResponse(res, [], '获取成功')
    }

    const suggestions = searchModel.getSuggestions(String(keyword), parseInt(String(limit), 10))

    return successResponse(res, suggestions, '获取成功')
  },

  async getSearchHistory(req: Request, res: Response): Promise<Response> {
    const { page = 1, pageSize = 20 } = req.query
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''

    const { history, total } = searchModel.getUserSearchHistory(userId, {
      page: parseInt(String(page), 10),
      pageSize: parseInt(String(pageSize), 10),
    } as FindUserHistoryOptions)

    return successResponse(
      res,
      paginate(history, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
      '获取成功'
    )
  },

  async clearSearchHistory(req: Request, res: Response): Promise<Response> {
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''
    const count = searchModel.clearUserSearchHistory(userId)
    return successResponse(res, { count }, '清空成功')
  },

  async deleteSearchHistoryItem(req: Request, res: Response): Promise<Response> {
    const { keyword } = req.body
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''

    if (!keyword) {
      return errorResponse(
        res,
        '关键词不能为空',
        GENERAL_ERRORS.MISSING_PARAMETER.code,
        GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
      )
    }

    const result = searchModel.deleteUserSearchHistoryItem(userId, String(keyword))
    if (!result) {
      return errorResponse(
        res,
        '记录不存在',
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
        GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
      )
    }

    return successResponse(res, null, '删除成功')
  },
}

export default searchController
