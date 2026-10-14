import { getDb } from './index'
import { generateId } from '../utils/response'

// 购物车项接口
interface CartItem {
  id: string
  user_id: string
  product_id: string
  sku_id?: string | null
  quantity: number
  selected: number
  created_at: string
  updated_at: string
}

// 购物车项详情（带商品信息）
interface CartItemDetail extends CartItem {
  product_name?: string
  product_image?: string
  product_price?: number
  product_original_price?: number
  product_status?: string
  sku_name?: string
  sku_price?: number
  sku_original_price?: number
  sku_stock?: number
  sku_image?: string
  specs?: Record<string, string> | string
}

const cartModel = {
  findByUserId(userId: string): CartItemDetail[] {
    const db = getDb()
    const items = db
      .prepare(
        `
        SELECT 
          c.id,
          c.user_id,
          c.product_id,
          c.sku_id,
          c.quantity,
          c.selected,
          c.created_at,
          c.updated_at,
          p.name as product_name,
          p.main_image as product_image,
          p.price as product_price,
          p.original_price as product_original_price,
          p.status as product_status,
          ps.sku_name,
          ps.price as sku_price,
          ps.original_price as sku_original_price,
          ps.stock as sku_stock,
          ps.sku_image,
          ps.specs
        FROM carts c
        LEFT JOIN products p ON c.product_id = p.id
        LEFT JOIN product_skus ps ON c.sku_id = ps.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `
      )
      .all(userId) as CartItemDetail[]

    items.forEach((item) => {
      if (item.specs && typeof item.specs === 'string') {
        try {
          item.specs = JSON.parse(item.specs)
        } catch {
          item.specs = {}
        }
      }
    })

    return items
  },

  findById(id: string): CartItem | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM carts WHERE id = ?').get(id) as CartItem | undefined
    return result || null
  },

  findByUserAndSku(userId: string, productId: string, skuId?: string | null): CartItem | null {
    const db = getDb()
    if (skuId) {
      const result = db
        .prepare('SELECT * FROM carts WHERE user_id = ? AND product_id = ? AND sku_id = ?')
        .get(userId, productId, skuId) as CartItem | undefined
      return result || null
    }
    const result = db
      .prepare('SELECT * FROM carts WHERE user_id = ? AND product_id = ? AND sku_id IS NULL')
      .get(userId, productId) as CartItem | undefined
    return result || null
  },

  create(
    userId: string,
    productId: string,
    skuId: string | null,
    quantity: number
  ): CartItem | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO carts (id, user_id, product_id, sku_id, quantity, selected, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `
    ).run(id, userId, productId, skuId || null, quantity, now, now)

    return this.findById(id)
  },

  updateQuantity(id: string, quantity: number): CartItem | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE carts SET quantity = ?, updated_at = ? WHERE id = ?').run(quantity, now, id)
    return this.findById(id)
  },

  incrementQuantity(id: string, quantity: number): CartItem | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE carts SET quantity = quantity + ?, updated_at = ? WHERE id = ?').run(
      quantity,
      now,
      id
    )
    return this.findById(id)
  },

  updateSelected(id: string, selected: number): CartItem | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE carts SET selected = ?, updated_at = ? WHERE id = ?').run(selected, now, id)
    return this.findById(id)
  },

  updateAllSelected(userId: string, selected: number): void {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE carts SET selected = ?, updated_at = ? WHERE user_id = ?').run(
      selected,
      now,
      userId
    )
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM carts WHERE id = ?').run(id)
    return result.changes > 0
  },

  deleteByIds(userId: string, ids: string[]): number {
    const db = getDb()
    const placeholders = ids.map(() => '?').join(', ')
    const result = db
      .prepare(`DELETE FROM carts WHERE user_id = ? AND id IN (${placeholders})`)
      .run(userId, ...ids)
    return result.changes
  },

  getCount(userId: string): number {
    const db = getDb()
    const result = db
      .prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM carts WHERE user_id = ?')
      .get(userId) as { total: number }
    return result.total
  },
}

export default cartModel
