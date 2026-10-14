import { getDb } from '../models'
import { generateId } from '../utils/response'

type FlashSaleStatus = 'pending' | 'active' | 'ended'

interface FlashSale {
  id: string
  name: string
  description: string | null
  start_time: string
  end_time: string
  status: FlashSaleStatus
  created_at: string
  updated_at: string
  items?: FlashSaleItemDetail[]
}

interface FlashSaleItem {
  id: string
  flash_sale_id: string
  product_id: string
  sku_id: string | null
  flash_price: number
  original_price: number
  stock: number
  sold_count: number
  limit_per_user: number
  status: string
  created_at: string
}

interface FlashSaleItemDetail extends FlashSaleItem {
  product_name?: string
  product_image?: string
  sku_name?: string
}

interface FlashSaleOrder {
  id: string
  user_id: string
  flash_sale_id: string
  flash_sale_item_id: string
  product_id: string
  sku_id: string | null
  quantity: number
  price: number
  original_price: number
  status: string
  created_at: string
}

interface CreateFlashSaleData {
  name: string
  description?: string
  start_time: string
  end_time: string
  status?: FlashSaleStatus
}

interface UpdateFlashSaleData {
  name?: string
  description?: string
  start_time?: string
  end_time?: string
  status?: FlashSaleStatus
}

interface CreateFlashSaleItemData {
  flash_sale_id: string
  product_id: string
  sku_id?: string | null
  flash_price?: number
  original_price?: number
  stock?: number
  limit_per_user?: number
  status?: string
}

interface UpdateFlashSaleItemData {
  flash_price?: number
  original_price?: number
  stock?: number
  sold_count?: number
  limit_per_user?: number
  status?: string
}

interface FindAllOptions {
  page?: number
  pageSize?: number
  status?: string
}

interface DeductStockResult {
  success: boolean
  data?: FlashSaleItemDetail
  message?: string
}

interface BuyFlashSaleResult {
  id: string
  user_id: string
  sale_id: string
  item_id: string
  product_id: string
  sku_id: string | null
  quantity: number
  price: number
  original_price: number
  status: string
  created_at: string
}

interface FlashSaleStatistics {
  saleId: string
  saleName: string
  totalStock: number
  totalSold: number
  status: string
}

export type {
  FlashSaleStatus,
  FlashSale,
  FlashSaleItem,
  FlashSaleItemDetail,
  CreateFlashSaleData,
  UpdateFlashSaleData,
  CreateFlashSaleItemData,
  UpdateFlashSaleItemData,
  FindAllOptions,
  BuyFlashSaleResult,
}

const flashSaleModel = {
  findById(id: string): FlashSale | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM flash_sales WHERE id = ?').get(id) as
      FlashSale | undefined
    return result || null
  },

  findAll(options: FindAllOptions = {}): { sales: FlashSale[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, status = '' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM flash_sales ${whereClause}`)
      .get(...params) as { count: number }

    const sales = db
      .prepare(
        `
        SELECT * FROM flash_sales
        ${whereClause}
        ORDER BY start_time DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as FlashSale[]

    return { sales, total: countResult.count }
  },

  getActiveSales(): FlashSale[] {
    const db = getDb()
    const now = new Date().toISOString()
    return db
      .prepare(
        `
        SELECT * FROM flash_sales
        WHERE start_time <= ? AND end_time >= ? AND status = 'active'
        ORDER BY start_time DESC
      `
      )
      .all(now, now) as FlashSale[]
  },

  getUpcomingSales(): FlashSale[] {
    const db = getDb()
    const now = new Date().toISOString()
    return db
      .prepare(
        `
        SELECT * FROM flash_sales
        WHERE start_time > ? AND status = 'pending'
        ORDER BY start_time ASC
      `
      )
      .all(now) as FlashSale[]
  },

  create(saleData: CreateFlashSaleData): FlashSale | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO flash_sales (id, name, description, start_time, end_time, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      saleData.name,
      saleData.description || null,
      saleData.start_time,
      saleData.end_time,
      saleData.status || 'pending',
      now,
      now
    )

    return this.findById(id)
  },

  update(id: string, data: UpdateFlashSaleData): FlashSale | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    const allowedFields: (keyof UpdateFlashSaleData)[] = [
      'name',
      'description',
      'start_time',
      'end_time',
      'status',
    ]
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`)
        values.push(data[field] !== undefined ? data[field] : null)
      }
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE flash_sales SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM flash_sales WHERE id = ?').run(id)
    return result.changes > 0
  },

  updateStatus(id: string, status: FlashSaleStatus): FlashSale | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE flash_sales SET status = ?, updated_at = ? WHERE id = ?').run(
      status,
      now,
      id
    )
    return this.findById(id)
  },

  findItemById(id: string): FlashSaleItem | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM flash_sale_items WHERE id = ?').get(id) as
      FlashSaleItem | undefined
    return result || null
  },

  getSaleItems(saleId: string): FlashSaleItemDetail[] {
    const db = getDb()
    return db
      .prepare(
        `
        SELECT fsi.*, p.name as product_name, p.main_image as product_image,
               ps.sku_name as sku_name
        FROM flash_sale_items fsi
        LEFT JOIN products p ON fsi.product_id = p.id
        LEFT JOIN product_skus ps ON fsi.sku_id = ps.id
        WHERE fsi.flash_sale_id = ?
        ORDER BY fsi.created_at DESC
      `
      )
      .all(saleId) as FlashSaleItemDetail[]
  },

  createSaleItem(itemData: CreateFlashSaleItemData): FlashSaleItem | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO flash_sale_items (
        id, flash_sale_id, product_id, sku_id, flash_price,
        original_price, stock, sold_count, limit_per_user, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      itemData.flash_sale_id,
      itemData.product_id,
      itemData.sku_id || null,
      itemData.flash_price || 0,
      itemData.original_price || 0,
      itemData.stock || 0,
      0,
      itemData.limit_per_user || 1,
      itemData.status || 'active',
      now
    )

    return this.findItemById(id)
  },

  updateSaleItem(id: string, data: UpdateFlashSaleItemData): FlashSaleItem | null {
    const db = getDb()

    const fields: string[] = []
    const values: (number | string | null)[] = []

    const allowedFields: (keyof UpdateFlashSaleItemData)[] = [
      'flash_price',
      'original_price',
      'stock',
      'sold_count',
      'limit_per_user',
      'status',
    ]
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`)
        values.push(data[field] !== undefined ? data[field] : null)
      }
    }

    values.push(id)

    db.prepare(`UPDATE flash_sale_items SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findItemById(id)
  },

  deleteSaleItem(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM flash_sale_items WHERE id = ?').run(id)
    return result.changes > 0
  },

  deductStock(itemId: string, quantity: number = 1): DeductStockResult {
    const db = getDb()

    let result: DeductStockResult
    try {
      const transaction = db.transaction((): DeductStockResult => {
        const item = this.findItemById(itemId)
        if (!item || item.status !== 'active') {
          throw new Error('秒杀商品不存在或已失效')
        }
        if (item.stock < quantity) {
          throw new Error('库存不足')
        }

        db.prepare(
          'UPDATE flash_sale_items SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ? AND stock >= ?'
        ).run(quantity, quantity, itemId, quantity)

        return { success: true, data: this.findItemById(itemId) }
      })
      result = (transaction as unknown as () => DeductStockResult)()
    } catch (e) {
      const err = e as Error
      result = { success: false, message: err.message }
    }

    return result
  },

  getSaleWithItems(id: string): FlashSale | null {
    const sale = this.findById(id)
    if (!sale) {
      return null
    }

    sale.items = this.getSaleItems(id)
    return sale
  },

  getStatistics(saleId: string): FlashSaleStatistics {
    const db = getDb()
    const result = db
      .prepare(
        `
        SELECT COALESCE(SUM(stock), 0) as total_stock,
               COALESCE(SUM(sold_count), 0) as total_sold
        FROM flash_sale_items
        WHERE flash_sale_id = ?
      `
      )
      .get(saleId) as { total_stock: number; total_sold: number }

    const sale = this.findById(saleId)

    return {
      saleId,
      saleName: sale ? sale.name : '',
      totalStock: parseInt(String(result.total_stock || 0)),
      totalSold: parseInt(String(result.total_sold || 0)),
      status: sale ? sale.status : '',
    }
  },

  syncStatus(): void {
    const db = getDb()
    const now = new Date().toISOString()

    db.prepare(
      'UPDATE flash_sales SET status = ?, updated_at = ? WHERE status = ? AND start_time <= ?'
    ).run('active', now, 'pending', now)

    db.prepare(
      'UPDATE flash_sales SET status = ?, updated_at = ? WHERE status = ? AND end_time < ?'
    ).run('ended', now, 'active', now)
  },

  buyFlashSale(
    userId: string,
    saleId: string,
    itemId: string,
    quantity: number = 1
  ): BuyFlashSaleResult {
    const db = getDb()
    const now = new Date().toISOString()

    const transaction = db.transaction((): BuyFlashSaleResult => {
      const sale = this.findById(saleId)
      if (!sale) {
        throw new Error('秒杀活动不存在')
      }

      if (sale.status !== 'active') {
        throw new Error('秒杀活动未开始或已结束')
      }

      const nowTime = new Date(now).getTime()
      const startTime = new Date(sale.start_time).getTime()
      const endTime = new Date(sale.end_time).getTime()

      if (startTime > nowTime) {
        throw new Error('秒杀活动尚未开始')
      }

      if (endTime < nowTime) {
        throw new Error('秒杀活动已结束')
      }

      const item = this.findItemById(itemId)
      if (!item || item.flash_sale_id !== saleId) {
        throw new Error('秒杀商品不存在')
      }

      if (item.status !== 'active') {
        throw new Error('秒杀商品已下架')
      }

      const qty = parseInt(String(quantity), 10)
      if (isNaN(qty) || qty <= 0) {
        throw new Error('购买数量必须大于0')
      }

      const limitPerUser = item.limit_per_user || 1
      if (qty > limitPerUser) {
        throw new Error(`每人限购${limitPerUser}件`)
      }

      const userPurchasedStmt = db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM flash_sale_orders
        WHERE user_id = ? AND flash_sale_item_id = ?
      `)
      const userPurchasedResult = userPurchasedStmt.get(userId, itemId) as { total: number }
      const userPurchased = userPurchasedResult.total

      if (userPurchased + qty > limitPerUser) {
        throw new Error('超出限购数量')
      }

      if (item.stock < qty) {
        throw new Error('库存不足')
      }

      db.prepare(
        'UPDATE flash_sale_items SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ? AND stock >= ?'
      ).run(qty, qty, itemId, qty)

      const orderId = generateId('FSO')
      const insertOrderStmt = db.prepare(`
        INSERT INTO flash_sale_orders (
          id, user_id, flash_sale_id, flash_sale_item_id, product_id, sku_id,
          quantity, price, original_price, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `)

      insertOrderStmt.run(
        orderId,
        userId,
        saleId,
        itemId,
        item.product_id,
        item.sku_id,
        qty,
        item.flash_price,
        item.original_price,
        now
      )

      return {
        id: orderId,
        user_id: userId,
        sale_id: saleId,
        item_id: itemId,
        product_id: item.product_id,
        sku_id: item.sku_id,
        quantity: qty,
        price: item.flash_price,
        original_price: item.original_price,
        status: 'pending',
        created_at: now,
      }
    })

    return (transaction as unknown as () => BuyFlashSaleResult)()
  },

  findSaleOrders(
    saleId: string,
    options: FindAllOptions = {}
  ): { orders: FlashSaleOrder[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, status = '' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE flash_sale_id = ?'
    const params: (string | number)[] = [saleId]

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM flash_sale_orders ${whereClause}`)
      .get(...params) as { count: number }

    const orders = db
      .prepare(
        `
        SELECT * FROM flash_sale_orders
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as FlashSaleOrder[]

    return { orders, total: countResult.count }
  },
}

export default flashSaleModel
