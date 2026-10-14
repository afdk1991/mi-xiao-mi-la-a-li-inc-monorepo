import { getDb } from './index'
import { generateId } from '../utils/response'

// 产品接口定义
export interface Product {
  id: string
  name: string
  subtitle?: string
  category_id?: string
  category_name?: string
  main_image?: string
  images?: string | string[]
  price: number
  original_price?: number
  stock: number
  sales: number
  description?: string
  status?: string
  sort_order?: number
  created_at: string
  updated_at: string
  skus?: ProductSku[]
}

// SKU 接口定义
export interface ProductSku {
  id: string
  product_id: string
  sku_name?: string
  specs?: string | Record<string, string>
  price: number
  original_price?: number
  stock: number
  sku_image?: string
  created_at: string
  updated_at: string
}

// 库存日志接口
export interface StockLog {
  id: string
  product_id: string
  sku_id?: string
  change_type: string
  quantity: number
  before_stock: number
  after_stock: number
  reason?: string
  operator_id?: string
  operator_name?: string
  created_at: string
}

// 查询选项接口
interface FindAllOptions {
  page?: number
  pageSize?: number
  categoryId?: string
  keyword?: string
  minPrice?: number | string
  maxPrice?: number | string
  sort?: 'newest' | 'sales' | 'price_asc' | 'price_desc'
  status?: string
}

// 创建产品数据接口
export interface CreateProductData {
  name: string
  subtitle?: string
  category_id?: string
  main_image?: string
  images?: string[]
  price?: number
  original_price?: number
  stock?: number
  description?: string
  status?: string
  sort_order?: number
  skus?: CreateSkuData[]
}

// 更新产品数据接口
export interface UpdateProductData {
  name?: string
  subtitle?: string
  category_id?: string
  main_image?: string
  images?: string[]
  price?: number
  original_price?: number
  stock?: number
  description?: string
  status?: string
  sort_order?: number
  skus?: CreateSkuData[]
}

// SKU 数据接口
interface CreateSkuData {
  sku_name?: string
  specs?: Record<string, string>
  price?: number
  original_price?: number
  stock?: number
  sku_image?: string
}

// 调整库存选项
interface AdjustStockOptions {
  productId: string
  skuId?: string
  quantity: number
  reason?: string
  operatorId?: string | null
}

const productModel = {
  findById(id: string): Product | null {
    const db = getDb()
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined
    if (product && product.images) {
      if (typeof product.images === 'string') {
        product.images = JSON.parse(product.images)
      }
    }
    return product || null
  },

  findAll(options: FindAllOptions = {}): { products: Product[]; total: number } {
    const db = getDb()
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      keyword,
      minPrice,
      maxPrice,
      sort = 'newest',
      status,
    } = options
    const offset = (page - 1) * pageSize

    const whereClause: string[] = []
    const params: (string | number)[] = []

    if (categoryId) {
      whereClause.push('category_id = ?')
      params.push(categoryId)
    }

    if (keyword) {
      whereClause.push('(name LIKE ? OR subtitle LIKE ? OR description LIKE ?)')
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    if (minPrice !== undefined && minPrice !== '') {
      whereClause.push('price >= ?')
      params.push(parseFloat(String(minPrice)))
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      whereClause.push('price <= ?')
      params.push(parseFloat(String(maxPrice)))
    }

    if (status) {
      whereClause.push('status = ?')
      params.push(status)
    }

    const whereSql = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''

    let orderBy = 'created_at DESC'
    switch (sort) {
      case 'sales':
        orderBy = 'sales DESC'
        break
      case 'price_asc':
        orderBy = 'price ASC'
        break
      case 'price_desc':
        orderBy = 'price DESC'
        break
      case 'newest':
      default:
        orderBy = 'created_at DESC'
        break
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM products ${whereSql}`)
      .get(...params) as { count: number }

    const products = db
      .prepare(
        `
        SELECT * FROM products
        ${whereSql}
        ORDER BY ${orderBy}, sort_order ASC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as Product[]

    products.forEach((p) => {
      if (p.images && typeof p.images === 'string') {
        p.images = JSON.parse(p.images)
      }
    })

    return { products, total: countResult.count }
  },

  findByCategoryId(
    categoryId: string,
    options: { page?: number; pageSize?: number } = {}
  ): { products: Product[]; total: number } {
    return this.findAll({ ...options, categoryId, status: 'on_sale' })
  },

  create(data: CreateProductData): Product | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO products (id, name, subtitle, category_id, main_image, images, price, original_price, stock, sales, description, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.name,
      data.subtitle || '',
      data.category_id || null,
      data.main_image || '',
      data.images ? JSON.stringify(data.images) : JSON.stringify([]),
      data.price || 0,
      data.original_price || null,
      data.stock || 0,
      data.description || '',
      data.status || 'on_sale',
      data.sort_order || 0,
      now,
      now
    )

    if (data.skus && Array.isArray(data.skus) && data.skus.length > 0) {
      data.skus.forEach((sku) => {
        this.createSku(id, sku)
      })
    }

    return this.findById(id)
  },

  update(id: string, data: UpdateProductData): Product | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    const allowedFields = [
      'name',
      'subtitle',
      'category_id',
      'main_image',
      'price',
      'original_price',
      'stock',
      'description',
      'status',
      'sort_order',
    ]
    for (const field of allowedFields) {
      if (data[field as keyof UpdateProductData] !== undefined) {
        fields.push(`${field} = ?`)
        values.push(data[field as keyof UpdateProductData] as string | number)
      }
    }

    if (data.images !== undefined) {
      fields.push('images = ?')
      values.push(JSON.stringify(data.images))
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values)

    if (data.skus !== undefined && Array.isArray(data.skus)) {
      this.deleteSkusByProductId(id)
      data.skus.forEach((sku) => {
        this.createSku(id, sku)
      })
    }

    return this.findById(id)
  },

  updateStatus(id: string, status: string): Product | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE products SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
    return this.findById(id)
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return result.changes > 0
  },

  findSkusByProductId(productId: string): ProductSku[] {
    const db = getDb()
    const skus = db
      .prepare('SELECT * FROM product_skus WHERE product_id = ? ORDER BY created_at ASC')
      .all(productId) as ProductSku[]
    skus.forEach((sku) => {
      if (sku.specs && typeof sku.specs === 'string') {
        sku.specs = JSON.parse(sku.specs)
      }
    })
    return skus
  },

  findSkuById(skuId: string): ProductSku | null {
    const db = getDb()
    const sku = db.prepare('SELECT * FROM product_skus WHERE id = ?').get(skuId) as
      ProductSku | undefined
    if (sku && sku.specs && typeof sku.specs === 'string') {
      sku.specs = JSON.parse(sku.specs)
    }
    return sku || null
  },

  createSku(productId: string, skuData: CreateSkuData): ProductSku | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO product_skus (id, product_id, sku_name, specs, price, original_price, stock, sku_image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      productId,
      skuData.sku_name || '',
      skuData.specs ? JSON.stringify(skuData.specs) : JSON.stringify({}),
      skuData.price || 0,
      skuData.original_price || null,
      skuData.stock || 0,
      skuData.sku_image || '',
      now,
      now
    )

    return this.findSkuById(id)
  },

  deleteSkusByProductId(productId: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM product_skus WHERE product_id = ?').run(productId)
    return result.changes > 0
  },

  getDetail(id: string): Product | null {
    const db = getDb()
    const product = db
      .prepare(
        `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `
      )
      .get(id) as Product | undefined
    if (!product) {
      return null
    }

    if (product.images && typeof product.images === 'string') {
      product.images = JSON.parse(product.images)
    }

    product.skus = this.findSkusByProductId(id)
    return product
  },

  adjustStock(options: AdjustStockOptions): {
    productId: string
    skuId?: string
    beforeStock: number
    afterStock: number
    quantity: number
  } {
    const { productId, skuId, quantity, reason, operatorId = null } = options
    const db = getDb()
    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      let beforeStock: number
      let afterStock: number
      let changeType: string

      if (skuId) {
        const sku = db.prepare('SELECT * FROM product_skus WHERE id = ?').get(skuId) as
          ProductSku | undefined
        if (!sku) {
          throw new Error('SKU不存在')
        }
        beforeStock = sku.stock
        afterStock = beforeStock + quantity
        if (afterStock < 0) {
          throw new Error('库存不足')
        }
        changeType = quantity > 0 ? 'increase' : 'decrease'

        db.prepare('UPDATE product_skus SET stock = ?, updated_at = ? WHERE id = ?').run(
          afterStock,
          now,
          skuId
        )

        const skuStocks = db
          .prepare('SELECT SUM(stock) as total FROM product_skus WHERE product_id = ?')
          .get(productId) as { total: number }
        db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(
          skuStocks.total || 0,
          now,
          productId
        )
      } else {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as
          Product | undefined
        if (!product) {
          throw new Error('商品不存在')
        }
        beforeStock = product.stock
        afterStock = beforeStock + quantity
        if (afterStock < 0) {
          throw new Error('库存不足')
        }
        changeType = quantity > 0 ? 'increase' : 'decrease'

        db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(
          afterStock,
          now,
          productId
        )
      }

      const logId = generateId()
      db.prepare(
        `
        INSERT INTO stock_logs (id, product_id, sku_id, change_type, quantity, before_stock, after_stock, reason, operator_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        logId,
        productId,
        skuId || null,
        changeType,
        quantity,
        beforeStock,
        afterStock,
        reason || '',
        operatorId,
        now
      )

      return {
        productId,
        skuId,
        beforeStock,
        afterStock,
        quantity,
      }
    })

    return (transaction as unknown as () => unknown)() as {
      productId: string
      skuId?: string
      beforeStock: number
      afterStock: number
      quantity: number
    }
  },

  findLowStock(threshold = 10): Product[] {
    const db = getDb()
    const products = db
      .prepare(
        `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock <= ? AND p.status != 'deleted'
        ORDER BY p.stock ASC, p.created_at DESC
      `
      )
      .all(threshold) as Product[]

    products.forEach((p) => {
      if (p.images && typeof p.images === 'string') {
        p.images = JSON.parse(p.images)
      }
    })

    return products
  },

  getStockLogs(
    productId: string,
    options: { page?: number; pageSize?: number } = {}
  ): { logs: StockLog[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20 } = options
    const offset = (page - 1) * pageSize

    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM stock_logs WHERE product_id = ?')
      .get(productId) as { count: number }

    const logs = db
      .prepare(
        `
        SELECT sl.*, u.nickname as operator_name
        FROM stock_logs sl
        LEFT JOIN users u ON sl.operator_id = u.id
        WHERE sl.product_id = ?
        ORDER BY sl.created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(productId, pageSize, offset) as StockLog[]

    return { logs, total: countResult.count }
  },

  batchUpdateStatus(ids: string[], status: string): number {
    const db = getDb()
    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      const stmt = db.prepare('UPDATE products SET status = ?, updated_at = ? WHERE id = ?')
      let count = 0
      for (const id of ids) {
        const result = stmt.run(status, now, id)
        count += result.changes
      }
      return count
    })

    return (transaction as unknown as () => unknown)() as number
  },

  batchDelete(ids: string[]): number {
    const db = getDb()

    const transaction = db.transaction(() => {
      const stmt = db.prepare('DELETE FROM products WHERE id = ?')
      let count = 0
      for (const id of ids) {
        const result = stmt.run(id)
        count += result.changes
      }
      return count
    })

    return (transaction as unknown as () => unknown)() as number
  },
}

export default productModel
