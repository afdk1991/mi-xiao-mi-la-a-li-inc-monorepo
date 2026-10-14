import { getDb } from '../models'
import { generateId } from '../utils/response'

type ReviewStatus = 'active' | 'hidden' | 'deleted'

interface Review {
  id: string
  user_id: string
  order_id: string
  product_id: string
  sku_id: string | null
  rating: number
  content: string
  images: string | string[] | null
  status: ReviewStatus
  likes: number
  seller_reply?: string | null
  reply_time?: string | null
  created_at: string
  updated_at: string
}

interface ReviewWithDetails extends Review {
  nickname?: string
  avatar?: string
  user?: {
    id: string
    nickname?: string
    avatar?: string
  }
  product?: {
    id: string
    name?: string
    image?: string
    skuName?: string
  }
}

interface CreateReviewData {
  user_id: string
  order_id: string
  product_id: string
  sku_id?: string | null
  rating: number
  content: string
  images?: string[] | null
}

interface ReviewStats {
  total: number
  goodRate: number
  ratingCounts: number[]
  withImagesCount: number
}

interface FindAllOptions {
  page?: number
  pageSize?: number
  productId?: string
  userId?: string
  status?: string
  rating?: number | string
  keyword?: string
}

interface GetProductReviewsOptions {
  page?: number
  pageSize?: number
  filter?: 'all' | 'good' | 'neutral' | 'bad' | 'with_images'
}

interface GetUserReviewsOptions {
  page?: number
  pageSize?: number
}

function formatReview(review: Record<string, unknown>): Record<string, unknown> {
  const formatted = { ...review }
  if (formatted.images && typeof formatted.images === 'string') {
    try {
      formatted.images = JSON.parse(formatted.images)
    } catch {
      formatted.images = []
    }
  } else if (!formatted.images) {
    formatted.images = []
  }

  formatted.user = {
    id: review.user_id,
    nickname: review.nickname,
    avatar: review.avatar,
  }

  if (review.product_name || review.product_image) {
    formatted.product = {
      id: review.product_id as string,
      name: review.product_name as string | undefined,
      image: review.product_image as string | undefined,
      skuName: review.sku_name as string | undefined,
    }
  }

  return formatted
}

const reviewModel = {
  findById(id: string): Review | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as Review | undefined
    return result || null
  },

  create(reviewData: CreateReviewData): Review | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    const imagesValue = reviewData.images ? JSON.stringify(reviewData.images) : null

    db.prepare(
      `
      INSERT INTO reviews (id, user_id, order_id, product_id, sku_id, rating, content, images, status, likes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)
    `
    ).run(
      id,
      reviewData.user_id,
      reviewData.order_id,
      reviewData.product_id,
      reviewData.sku_id || null,
      reviewData.rating,
      reviewData.content,
      imagesValue,
      now,
      now
    )

    return this.findById(id)
  },

  getProductReviews(
    productId: string,
    options: GetProductReviewsOptions = {}
  ): { reviews: ReviewWithDetails[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 10, filter = 'all' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE r.product_id = ? AND r.status = ?'
    const params: (string | number)[] = [productId, 'active']

    switch (filter) {
      case 'good':
        whereClause += ' AND r.rating >= 4'
        break
      case 'neutral':
        whereClause += ' AND r.rating = 3'
        break
      case 'bad':
        whereClause += ' AND r.rating <= 2'
        break
      case 'with_images':
        whereClause += " AND r.images IS NOT NULL AND r.images != '[]'"
        break
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM reviews r ${whereClause}`)
      .get(...params) as { count: number }

    const reviews = db
      .prepare(
        `
      SELECT r.*, u.nickname, u.avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, pageSize, offset) as Record<string, unknown>[]

    const formattedReviews = reviews.map(
      (review) => formatReview(review) as unknown as ReviewWithDetails
    )

    return { reviews: formattedReviews, total: countResult.count }
  },

  getProductReviewStats(productId: string): ReviewStats {
    const db = getDb()

    const stats = db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as good_count,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as bad_count,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating5,
        SUM(CASE WHEN images IS NOT NULL AND images != '[]' THEN 1 ELSE 0 END) as with_images_count
      FROM reviews
      WHERE product_id = ? AND status = 'active'
    `
      )
      .get(productId) as Record<string, number>

    const total = stats.total || 0
    const goodCount = stats.good_count || 0

    return {
      total,
      goodRate: total > 0 ? Math.round((goodCount / total) * 100) / 100 : 0,
      ratingCounts: [
        stats.rating1 || 0,
        stats.rating2 || 0,
        stats.rating3 || 0,
        stats.rating4 || 0,
        stats.rating5 || 0,
      ],
      withImagesCount: stats.with_images_count || 0,
    }
  },

  getUserReviews(
    userId: string,
    options: GetUserReviewsOptions = {}
  ): { reviews: ReviewWithDetails[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 10 } = options
    const offset = (page - 1) * pageSize

    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?')
      .get(userId) as { count: number }

    const reviews = db
      .prepare(
        `
      SELECT r.*, p.name as product_name, p.main_image as product_image, ps.sku_name
      FROM reviews r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN product_skus ps ON r.sku_id = ps.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(userId, pageSize, offset) as Record<string, unknown>[]

    const formattedReviews = reviews.map(
      (review) => formatReview(review) as unknown as ReviewWithDetails
    )

    return { reviews: formattedReviews, total: countResult.count }
  },

  hasUserReviewedOrder(userId: string, orderId: string, productId: string): boolean {
    const db = getDb()
    const result = db
      .prepare(
        'SELECT COUNT(*) as count FROM reviews WHERE user_id = ? AND order_id = ? AND product_id = ?'
      )
      .get(userId, orderId, productId) as { count: number }
    return result.count > 0
  },

  findAll(options: FindAllOptions = {}): { reviews: ReviewWithDetails[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, productId, userId, status, rating, keyword } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (productId) {
      whereClause += ' AND r.product_id = ?'
      params.push(productId)
    }

    if (userId) {
      whereClause += ' AND r.user_id = ?'
      params.push(userId)
    }

    if (status) {
      whereClause += ' AND r.status = ?'
      params.push(status)
    }

    if (rating) {
      whereClause += ' AND r.rating = ?'
      params.push(parseInt(String(rating), 10))
    }

    if (keyword) {
      whereClause += ' AND r.content LIKE ?'
      params.push(`%${keyword}%`)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM reviews r ${whereClause}`)
      .get(...params) as { count: number }

    const reviews = db
      .prepare(
        `
      SELECT r.*, u.nickname, u.avatar, p.name as product_name, p.main_image as product_image, ps.sku_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN product_skus ps ON r.sku_id = ps.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, pageSize, offset) as Record<string, unknown>[]

    const formattedReviews = reviews.map(
      (review) => formatReview(review) as unknown as ReviewWithDetails
    )

    return { reviews: formattedReviews, total: countResult.count }
  },

  updateStatus(id: string, status: ReviewStatus): Review | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
    return this.findById(id)
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(id)
    return result.changes > 0
  },

  addSellerReply(id: string, replyContent: string): Review | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(
      'UPDATE reviews SET seller_reply = ?, reply_time = ?, updated_at = ? WHERE id = ?'
    ).run(replyContent, now, now, id)
    return this.findById(id)
  },

  batchDelete(ids: string[]): number {
    const db = getDb()

    const transaction = db.transaction(() => {
      const stmt = db.prepare('DELETE FROM reviews WHERE id = ?')
      let count = 0
      for (const id of ids) {
        const result = stmt.run(id)
        count += result.changes
      }
      return count
    })

    return transaction()
  },
}

export default reviewModel
