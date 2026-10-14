import { getDb } from '../models'
import productModel from '../models/productModel'
import cacheService from './cacheService'
import { getTTL, buildKey } from '../config/cache'

// 商品查询参数接口
interface GetProductsParams {
  page?: number
  pageSize?: number
  categoryId?: string
  keyword?: string
  minPrice?: number | string
  maxPrice?: number | string
  sort?: 'newest' | 'sales' | 'price_asc' | 'price_desc'
}

// SKU验证结果接口
interface SkuValidationResult {
  valid: boolean
  sku: unknown
  price: number | null
  stock?: number
}

// 价格区间接口
interface PriceRange {
  minPrice: number
  maxPrice: number
}

// 库存调整结果接口
interface StockAdjustmentResult {
  productId: string
  skuId?: string
  beforeStock: number
  afterStock: number
  quantity: number
}

const productService = {
  /**
   * 获取商品列表（支持分页、分类筛选、价格区间、关键字搜索与排序，含缓存）
   * @param params - 查询参数（页码、每页数、分类、关键字、价格区间、排序方式）
   * @returns 商品列表（含分页信息）
   */
  async getProducts(params: GetProductsParams) {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      keyword,
      minPrice,
      maxPrice,
      sort = 'newest',
    } = params

    const discretizePrice = (price: number | string | undefined): string => {
      if (price === undefined || price === '') {
        return 'none'
      }
      const num = Math.floor(parseFloat(String(price)) / 50) * 50
      return String(num)
    }

    const shouldCache = !keyword

    if (!shouldCache) {
      return productModel.findAll({
        page: Number(page),
        pageSize: Number(pageSize),
        categoryId,
        keyword,
        minPrice,
        maxPrice,
        sort,
        status: 'on_sale',
      })
    }

    const cacheKey = buildKey('product', 'list', {
      categoryId: categoryId || 'all',
      page,
      pageSize,
      sort,
      minPrice: discretizePrice(minPrice),
      maxPrice: discretizePrice(maxPrice),
    })

    return cacheService.getOrSet(
      cacheKey,
      () =>
        Promise.resolve(
          productModel.findAll({
            page: Number(page),
            pageSize: Number(pageSize),
            categoryId,
            keyword,
            minPrice,
            maxPrice,
            sort,
            status: 'on_sale',
          })
        ),
      getTTL('productList')
    )
  },

  /**
   * 获取商品详情（含缓存）
   * @param productId - 商品 ID
   * @returns 商品详情信息
   */
  async getProductDetail(productId: string) {
    const cacheKey = buildKey('product', 'detail', { id: productId })

    return cacheService.getOrSet(
      cacheKey,
      () => Promise.resolve(productModel.getDetail(productId)),
      getTTL('productDetail')
    )
  },

  /**
   * 按分类获取商品列表（含缓存）
   * @param categoryId - 分类 ID
   * @param options - 分页参数（页码、每页数）
   * @returns 商品列表
   */
  async getProductsByCategory(
    categoryId: string,
    options: { page?: number; pageSize?: number } = {}
  ) {
    const { page = 1, pageSize = 20 } = options
    const cacheKey = buildKey('product', 'list', {
      categoryId,
      page,
      pageSize,
      sort: 'default',
    })

    return cacheService.getOrSet(
      cacheKey,
      () => Promise.resolve(productModel.findByCategoryId(categoryId, options)),
      getTTL('productList')
    )
  },

  /**
   * 获取商品的 SKU 列表
   * @param productId - 商品 ID
   * @returns SKU 列表
   * @throws {Error} 商品不存在
   */
  getProductSkus(productId: string) {
    const product = productModel.findById(productId)
    if (!product) {
      throw new Error('商品不存在')
    }
    return productModel.findSkusByProductId(productId)
  },

  /**
   * 验证 SKU 有效性及库存是否充足
   * @param skuId - SKU ID（为空时跳过验证并返回有效结果）
   * @param quantity - 需要的数量，默认为 1
   * @returns SKU 验证结果（含 SKU 信息、价格、库存）
   * @throws {Error} SKU不存在、库存不足
   */
  validateSku(skuId: string, quantity = 1): SkuValidationResult {
    if (!skuId) {
      return { valid: true, sku: null, price: null }
    }

    const sku = productModel.findSkuById(skuId)
    if (!sku) {
      throw new Error('SKU不存在')
    }

    if (sku.stock < quantity) {
      throw new Error(`库存不足，当前库存: ${sku.stock}`)
    }

    return {
      valid: true,
      sku,
      price: sku.price,
      stock: sku.stock,
    }
  },

  /**
   * 调整商品或 SKU 的库存（正数增加、负数扣减）
   * @param productId - 商品 ID
   * @param options - 调整选项（SKU ID、数量、原因、操作人 ID）
   * @returns 库存调整结果（含调整前后库存）
   * @throws {Error} 商品不存在、调整数量为0、SKU不存在、SKU不属于该商品
   */
  adjustStock(
    productId: string,
    options: { skuId?: string; quantity: number; reason?: string; operatorId?: string | null }
  ): StockAdjustmentResult {
    const product = productModel.findById(productId)
    if (!product) {
      throw new Error('商品不存在')
    }

    if (options.quantity === 0) {
      throw new Error('调整数量不能为0')
    }

    if (options.skuId) {
      const sku = productModel.findSkuById(options.skuId)
      if (!sku) {
        throw new Error('SKU不存在')
      }
      if (sku.product_id !== productId) {
        throw new Error('SKU不属于该商品')
      }
    }

    return productModel.adjustStock({
      productId,
      skuId: options.skuId,
      quantity: options.quantity,
      reason: options.reason,
      operatorId: options.operatorId ?? null,
    })
  },

  /**
   * 获取库存低于阈值的商品列表
   * @param threshold - 库存阈值，默认为 10
   * @returns 低库存商品列表
   */
  getLowStockProducts(threshold = 10) {
    return productModel.findLowStock(threshold)
  },

  /**
   * 获取商品库存变更日志（支持分页）
   * @param productId - 商品 ID
   * @param options - 分页参数（页码、每页数）
   * @returns 库存变更日志列表
   * @throws {Error} 商品不存在
   */
  getStockLogs(productId: string, options: { page?: number; pageSize?: number } = {}) {
    const product = productModel.findById(productId)
    if (!product) {
      throw new Error('商品不存在')
    }
    return productModel.getStockLogs(productId, options)
  },

  /**
   * 搜索在售商品
   * @param keyword - 搜索关键字
   * @param options - 搜索选项（页码、每页数、分类）
   * @returns 商品列表
   */
  searchProducts(
    keyword: string,
    options: { page?: number; pageSize?: number; categoryId?: string } = {}
  ) {
    const { page = 1, pageSize = 20, categoryId } = options

    return productModel.findAll({
      page,
      pageSize,
      categoryId,
      keyword,
      status: 'on_sale',
    })
  },

  /**
   * 获取在售商品的价格区间
   * @param categoryId - 分类 ID（可选，限定分类下的价格区间）
   * @returns 价格区间（最低价、最高价）
   */
  getPriceRange(categoryId: string | null = null): PriceRange {
    const db = getDb()
    let sql = 'SELECT MIN(price) as minPrice, MAX(price) as maxPrice FROM products WHERE status = ?'
    const params: string[] = ['on_sale']

    if (categoryId) {
      sql += ' AND category_id = ?'
      params.push(categoryId)
    }

    const result = db.prepare(sql).get(...params) as {
      minPrice: number | null
      maxPrice: number | null
    }
    return {
      minPrice: result.minPrice || 0,
      maxPrice: result.maxPrice || 0,
    }
  },

  /**
   * 获取热销商品列表（按销量降序排序，含缓存）
   * @param limit - 返回数量，默认为 10
   * @returns 热销商品列表
   */
  async getHotProducts(limit = 10) {
    const cacheKey = buildKey('product', 'hot', { limit })

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const db = getDb()
        return db
          .prepare(
            `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'on_sale' AND p.stock > 0
            ORDER BY p.sales DESC, p.created_at DESC
            LIMIT ?
          `
          )
          .all(limit)
      },
      getTTL('hotProducts')
    )
  },

  /**
   * 获取新品商品列表（按创建时间降序排序，含缓存）
   * @param limit - 返回数量，默认为 10
   * @returns 新品商品列表
   */
  async getNewProducts(limit = 10) {
    const cacheKey = buildKey('product', 'new', { limit })

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const db = getDb()
        return db
          .prepare(
            `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'on_sale' AND p.stock > 0
            ORDER BY p.created_at DESC
            LIMIT ?
          `
          )
          .all(limit)
      },
      getTTL('newProducts')
    )
  },

  /**
   * 批量更新商品状态
   * @param ids - 商品 ID 列表
   * @param status - 目标状态（on_sale 上架 / off_sale 下架）
   * @returns 更新的记录数
   * @throws {Error} 商品ID列表为空、无效的状态值
   */
  batchUpdateStatus(ids: string[], status: string): number {
    if (!ids || ids.length === 0) {
      throw new Error('商品ID列表不能为空')
    }

    if (!['on_sale', 'off_sale'].includes(status)) {
      throw new Error('无效的状态值')
    }

    return productModel.batchUpdateStatus(ids, status)
  },

  /**
   * 批量删除商品
   * @param ids - 商品 ID 列表
   * @returns 删除的记录数
   * @throws {Error} 商品ID列表为空
   */
  batchDelete(ids: string[]): number {
    if (!ids || ids.length === 0) {
      throw new Error('商品ID列表不能为空')
    }

    return productModel.batchDelete(ids)
  },

  /**
   * 获取推荐商品列表（同分类优先，不足时随机补充，含缓存）
   * @param productId - 当前商品 ID（排除自身）
   * @param categoryId - 分类 ID（同分类优先推荐，可为空）
   * @param limit - 返回数量，默认为 6
   * @returns 推荐商品列表
   */
  async getRecommendedProducts(productId: string, categoryId: string | null, limit = 6) {
    const cacheKey = buildKey('product', 'recommended', {
      id: productId,
      categoryId: categoryId || 'none',
      limit,
    })

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const db = getDb()
        let products: unknown[] = []

        if (categoryId) {
          // 先统计同分类可推荐商品总数，再用随机 OFFSET 取数，避免 ORDER BY RANDOM() 全表扫描
          const countRow = db
            .prepare(
              `SELECT COUNT(*) as total FROM products
               WHERE status = 'on_sale' AND stock > 0 AND category_id = ? AND id != ?`
            )
            .get(categoryId, productId) as { total: number } | undefined

          const total = countRow?.total ?? 0
          if (total > 0) {
            const take = Math.min(limit, total)
            const offset = Math.floor(Math.random() * Math.max(0, total - take))
            products = db
              .prepare(
                `
                SELECT * FROM products
                WHERE status = 'on_sale' AND stock > 0 AND category_id = ? AND id != ?
                LIMIT ? OFFSET ?
              `
              )
              .all(categoryId, productId, take, offset)

            if (Array.isArray(products) && products.length >= limit) {
              return products
            }
          }
        }

        const needed = limit - (products?.length || 0)
        if (needed > 0) {
          const excludeIds = products ? (products as Array<{ id: string }>).map((p) => p.id) : []
          excludeIds.push(productId)

          const whereClause =
            excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})` : ''

          // 先统计可补充商品总数，再用随机 OFFSET 取数，避免 ORDER BY RANDOM() 全表扫描
          const countRow = db
            .prepare(
              `SELECT COUNT(*) as total FROM products
               WHERE status = 'on_sale' AND stock > 0 ${whereClause}`
            )
            .get(...excludeIds) as { total: number } | undefined

          const total = countRow?.total ?? 0
          if (total > 0) {
            const take = Math.min(needed, total)
            const offset = Math.floor(Math.random() * Math.max(0, total - take))
            const additionalProducts = db
              .prepare(
                `
                SELECT * FROM products
                WHERE status = 'on_sale' AND stock > 0 ${whereClause}
                LIMIT ? OFFSET ?
              `
              )
              .all(...excludeIds, take, offset)

            return [...(products || []), ...additionalProducts]
          }
        }

        return products || []
      },
      getTTL('recommendedProducts')
    )
  },

  /**
   * 清除商品相关缓存
   * @param productId - 商品 ID（传入时仅清除该商品相关缓存，为空时清除所有商品缓存）
   * @returns 无返回值
   */
  async clearCache(productId: string | null = null): Promise<void> {
    if (productId) {
      await cacheService.invalidateProduct(productId)
    } else {
      await cacheService.delByPattern(buildKey('product', '*'))
    }
  },
}

export default productService
