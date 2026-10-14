import { getDb } from './index'
import { generateId } from '../utils/response'

// 收藏接口
interface Favorite {
  id: string
  user_id: string
  product_id: string
  created_at: string
}

// 收藏详情（带商品信息）
interface FavoriteDetail extends Favorite {
  product_name?: string
  product_subtitle?: string
  product_image?: string
  product_price?: number
  product_original_price?: number
  product_sales?: number
  product_status?: string
}

const favoriteModel = {
  findByUserId(userId: string): FavoriteDetail[] {
    const db = getDb()
    return db
      .prepare(
        `
        SELECT 
          f.id,
          f.user_id,
          f.product_id,
          f.created_at,
          p.name as product_name,
          p.subtitle as product_subtitle,
          p.main_image as product_image,
          p.price as product_price,
          p.original_price as product_original_price,
          p.sales as product_sales,
          p.status as product_status
        FROM favorites f
        LEFT JOIN products p ON f.product_id = p.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
      `
      )
      .all(userId) as FavoriteDetail[]
  },

  findById(id: string): Favorite | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM favorites WHERE id = ?').get(id) as
      Favorite | undefined
    return result || null
  },

  findByUserAndProduct(userId: string, productId: string): Favorite | null {
    const db = getDb()
    const result = db
      .prepare('SELECT * FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(userId, productId) as Favorite | undefined
    return result || null
  },

  isFavorited(userId: string, productId: string): boolean {
    const db = getDb()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(userId, productId) as { count: number }
    return result.count > 0
  },

  create(userId: string, productId: string): Favorite | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO favorites (id, user_id, product_id, created_at)
      VALUES (?, ?, ?, ?)
    `
    ).run(id, userId, productId, now)

    return this.findById(id)
  },

  deleteByProductId(userId: string, productId: string): boolean {
    const db = getDb()
    const result = db
      .prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?')
      .run(userId, productId)
    return result.changes > 0
  },

  deleteByIds(userId: string, ids: string[]): number {
    const db = getDb()
    const placeholders = ids.map(() => '?').join(', ')
    const result = db
      .prepare(`DELETE FROM favorites WHERE user_id = ? AND product_id IN (${placeholders})`)
      .run(userId, ...ids)
    return result.changes
  },
}

export default favoriteModel
