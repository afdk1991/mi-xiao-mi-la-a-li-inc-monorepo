// @ts-nocheck
import type { Request, Response } from 'express'
import categoryModel from '../models/categoryModel'
import productModel from '../models/productModel'
import { successResponse, errorResponse, paginate } from '../utils/response'
import { GENERAL_ERRORS } from '../constants/errorCodes'

interface CategoryData {
  name?: string
  parent_id?: string | null
  icon?: string
  sort_order?: number
  status?: string
}

interface SortItem {
  id: string
  sort_order: number
}

const categoryController = {
  async getCategoryTree(req: Request, res: Response): Promise<void> {
    const tree = categoryModel.findTree()
    successResponse(res, tree, '获取成功')
  },

  async getCategoryProducts(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const page = parseInt(String(req.query.page || 1), 10)
    const pageSize = parseInt(String(req.query.pageSize || 20), 10)

    const category = categoryModel.findById(String(id))
    if (!category) {
      errorResponse(res, '分类不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    const { products, total } = productModel.findByCategoryId(String(id), {
      page,
      pageSize,
    })

    successResponse(res, paginate(products, total, page, pageSize), '获取成功')
  },

  async createCategory(req: Request, res: Response): Promise<void> {
    const { name, parent_id, icon, sort_order, status } = req.body as CategoryData

    if (!name) {
      errorResponse(res, '分类名称不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    if (parent_id) {
      const parent = categoryModel.findById(String(parent_id))
      if (!parent) {
        errorResponse(res, '父分类不存在', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
        return
      }
    }

    const category = categoryModel.create({
      name,
      parent_id,
      icon,
      sort_order,
      status,
    })

    successResponse(res, category, '创建成功', 201)
  },

  async updateCategory(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { name, parent_id, icon, sort_order, status } = req.body as CategoryData

    const category = categoryModel.findById(String(id))
    if (!category) {
      errorResponse(res, '分类不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (parent_id && String(parent_id) === String(id)) {
      errorResponse(res, '不能将自己设为父分类', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    if (parent_id) {
      const parent = categoryModel.findById(String(parent_id))
      if (!parent) {
        errorResponse(res, '父分类不存在', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
        return
      }
    }

    const updatedCategory = categoryModel.update(String(id), {
      name,
      parent_id,
      icon,
      sort_order,
      status,
    })

    successResponse(res, updatedCategory, '更新成功')
  },

  async deleteCategory(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const category = categoryModel.findById(String(id))
    if (!category) {
      errorResponse(res, '分类不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (categoryModel.hasChildren(String(id))) {
      errorResponse(res, '请先删除子分类', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    categoryModel.delete(String(id))

    successResponse(res, null, '删除成功')
  },

  async updateCategorySort(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { sort_order } = req.body as { sort_order?: number | string }

    const category = categoryModel.findById(String(id))
    if (!category) {
      errorResponse(res, '分类不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    const sortOrder = parseInt(String(sort_order), 10)
    if (isNaN(sortOrder)) {
      errorResponse(res, '排序值无效', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const updatedCategory = categoryModel.updateSortOrder(String(id), sortOrder)
    successResponse(res, updatedCategory, '更新成功')
  },

  async batchUpdateCategorySort(req: Request, res: Response): Promise<void> {
    const { items } = req.body as { items?: SortItem[] }

    if (!Array.isArray(items) || items.length === 0) {
      errorResponse(res, '请提供要排序的分类列表', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    for (const item of items) {
      if (!item.id || item.sort_order === undefined) {
        errorResponse(res, '排序参数不完整', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
        return
      }
      const category = categoryModel.findById(String(item.id))
      if (!category) {
        errorResponse(res, `分类 ${item.id} 不存在`, GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
        return
      }
    }

    const count = categoryModel.batchUpdateSortOrder(items)
    successResponse(res, { count }, '批量排序成功')
  },

  async getCategoryPath(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const category = categoryModel.findById(String(id))
    if (!category) {
      errorResponse(res, '分类不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    const path = categoryModel.getCategoryPath(String(id))
    successResponse(res, path, '获取成功')
  },
}

export default categoryController
