// @ts-nocheck
import type { Request, Response } from 'express'
import productModel, {
  type CreateProductData,
  type UpdateProductData,
} from '../models/productModel'
import categoryModel from '../models/categoryModel'
import productService from '../services/productService'
import { successResponse, errorResponse, paginate } from '../utils/response'
import { GENERAL_ERRORS } from '../constants/errorCodes'

type SortType = 'newest' | 'sales' | 'price_asc' | 'price_desc'
type ProductStatus = 'on_sale' | 'off_sale'

interface AdjustStockBody {
  skuId?: string
  quantity?: number | string
  reason?: string
  operatorId?: string | null
}

interface BatchUpdateBody {
  ids?: string[]
  status?: ProductStatus
}

const productController = {
  async getProducts(req: Request, res: Response): Promise<void> {
    const page = parseInt(String(req.query.page || 1), 10)
    const pageSize = parseInt(String(req.query.pageSize || 20), 10)
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined
    const keyword = req.query.keyword ? String(req.query.keyword) : undefined
    const minPrice = req.query.minPrice ? parseFloat(String(req.query.minPrice)) : undefined
    const maxPrice = req.query.maxPrice ? parseFloat(String(req.query.maxPrice)) : undefined
    const sort = (req.query.sort as SortType) || 'newest'

    const { products, total } = await productService.getProducts({
      page,
      pageSize,
      categoryId,
      keyword,
      minPrice,
      maxPrice,
      sort,
    })

    successResponse(res, paginate(products, total, page, pageSize), '获取成功')
  },

  async getProductDetail(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const product = await productService.getProductDetail(String(id))

    if (!product) {
      errorResponse(res, '商品不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    successResponse(res, product, '获取成功')
  },

  async getProductSkus(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const skus = productService.getProductSkus(String(id))
      successResponse(res, skus, '获取成功')
    } catch (error) {
      const message = (error as Error).message || '获取失败'
      if (message === '商品不存在') {
        errorResponse(res, message, GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      } else {
        errorResponse(res, message, GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      }
    }
  },

  async getHotProducts(req: Request, res: Response): Promise<void> {
    const limit = parseInt(String(req.query.limit || 10), 10)
    const products = await productService.getHotProducts(limit)
    successResponse(res, products, '获取成功')
  },

  async getNewProducts(req: Request, res: Response): Promise<void> {
    const limit = parseInt(String(req.query.limit || 10), 10)
    const products = await productService.getNewProducts(limit)
    successResponse(res, products, '获取成功')
  },

  async getPriceRange(req: Request, res: Response): Promise<void> {
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : null
    const range = productService.getPriceRange(categoryId)
    successResponse(res, range, '获取成功')
  },

  async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const { skuId, quantity, reason, operatorId } = req.body as AdjustStockBody

      if (quantity === undefined || quantity === null) {
        errorResponse(res, '调整数量不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
        return
      }

      const result = productService.adjustStock(String(id), {
        skuId: skuId ? String(skuId) : undefined,
        quantity: Number(quantity),
        reason: String(reason),
        operatorId: operatorId || null,
      })

      successResponse(res, result, '调整成功')
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '调整失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async getStockLogs(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const page = parseInt(String(req.query.page || 1), 10)
      const pageSize = parseInt(String(req.query.pageSize || 20), 10)

      const { logs, total } = productService.getStockLogs(String(id), {
        page,
        pageSize,
      })

      successResponse(res, paginate(logs, total, page, pageSize), '获取成功')
    } catch (error) {
      errorResponse(
        res,
        (error as Error).message || '获取失败',
        GENERAL_ERRORS.INVALID_PARAMETER.code,
        400
      )
    }
  },

  async getLowStockProducts(req: Request, res: Response): Promise<void> {
    const threshold = parseInt(String(req.query.threshold || 10), 10)
    const products = productService.getLowStockProducts(threshold)
    successResponse(res, products, '获取成功')
  },

  async getAllProducts(req: Request, res: Response): Promise<void> {
    const page = parseInt(String(req.query.page || 1), 10)
    const pageSize = parseInt(String(req.query.pageSize || 20), 10)
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined
    const keyword = req.query.keyword ? String(req.query.keyword) : undefined
    const status = req.query.status ? String(req.query.status) : undefined

    const { products, total } = productModel.findAll({
      page,
      pageSize,
      categoryId,
      keyword,
      status,
    })

    successResponse(res, paginate(products, total, page, pageSize), '获取成功')
  },

  async createProduct(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateProductData

    if (!body.name) {
      errorResponse(res, '商品名称不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    if (body.price === undefined || body.price === null) {
      errorResponse(res, '商品价格不能为空', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    if (body.category_id) {
      const category = categoryModel.findById(String(body.category_id))
      if (!category) {
        errorResponse(res, '分类不存在', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
        return
      }
    }

    const product = productModel.create({
      ...body,
      status: body.status || 'on_sale',
    })

    await productService.clearCache()

    successResponse(res, product, '创建成功', 0, 201)
  },

  async updateProduct(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const body = req.body as UpdateProductData

    const product = productModel.findById(String(id))
    if (!product) {
      errorResponse(res, '商品不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (body.category_id) {
      const category = categoryModel.findById(String(body.category_id))
      if (!category) {
        errorResponse(res, '分类不存在', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
        return
      }
    }

    const updatedProduct = productModel.update(String(id), body)

    await productService.clearCache(String(id))

    successResponse(res, updatedProduct, '更新成功')
  },

  async deleteProduct(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const product = productModel.findById(String(id))
    if (!product) {
      errorResponse(res, '商品不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    productModel.delete(String(id))

    await productService.clearCache(String(id))

    successResponse(res, null, '删除成功')
  },

  async updateProductStatus(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const { status } = req.body as { status?: ProductStatus }

    const product = productModel.findById(String(id))
    if (!product) {
      errorResponse(res, '商品不存在', GENERAL_ERRORS.RESOURCE_NOT_FOUND.code, 404)
      return
    }

    if (!status || !['on_sale', 'off_sale'].includes(status)) {
      errorResponse(res, '无效的状态值', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const updatedProduct = productModel.updateStatus(String(id), status)

    await productService.clearCache(String(id))

    successResponse(res, updatedProduct, '更新成功')
  },

  async batchUpdateProductStatus(req: Request, res: Response): Promise<void> {
    const { ids, status } = req.body as BatchUpdateBody

    if (!Array.isArray(ids) || ids.length === 0) {
      errorResponse(res, '请选择要操作的商品', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    if (!status || !['on_sale', 'off_sale'].includes(status)) {
      errorResponse(res, '无效的状态值', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const count = productService.batchUpdateStatus(ids, status)
    await productService.clearCache()

    successResponse(res, { count }, '批量更新成功')
  },

  async batchDeleteProducts(req: Request, res: Response): Promise<void> {
    const { ids } = req.body as { ids?: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      errorResponse(res, '请选择要删除的商品', GENERAL_ERRORS.INVALID_PARAMETER.code, 400)
      return
    }

    const count = productService.batchDelete(ids)
    await productService.clearCache()

    successResponse(res, { count }, '批量删除成功')
  },
}

export default productController
