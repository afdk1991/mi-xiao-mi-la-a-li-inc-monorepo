import { getDb } from './index'
import { generateId } from '../utils/response'

// 优惠券接口
interface Coupon {
  id: string
  name: string
  type: 'fixed' | 'percent'
  value: number
  min_amount: number
  max_discount?: number | null
  total_quantity: number
  per_user_limit: number
  start_time: string
  end_time: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// 用户优惠券接口
interface UserCoupon {
  id: string
  user_id: string
  coupon_id: string
  status: 'unused' | 'used' | 'expired'
  used_at?: string | null
  order_id?: string | null
  created_at: string
}

// 用户优惠券详情（带优惠券信息）
interface UserCouponDetail extends UserCoupon {
  name: string
  type: 'fixed' | 'percent'
  value: number
  min_amount: number
  max_discount?: number | null
  start_time: string
  end_time: string
  coupon_status: string
}

// 创建优惠券数据
interface CreateCouponData {
  name: string
  type?: 'fixed' | 'percent'
  value: number
  min_amount?: number
  max_discount?: number | null
  total_quantity?: number
  per_user_limit?: number
  start_time?: string | number
  end_time?: string | number
  status?: 'active' | 'inactive'
}

// 更新优惠券数据
interface UpdateCouponData {
  name?: string
  type?: 'fixed' | 'percent'
  value?: number
  min_amount?: number
  max_discount?: number | null
  total_quantity?: number
  per_user_limit?: number
  start_time?: number
  end_time?: number
  status?: 'active' | 'inactive'
}

// 领取结果
interface ClaimResult {
  id: string
  userId: string
  couponId: string
  status: 'unused'
  claimed_at: string
}

// 使用结果
interface UseResult extends UserCouponDetail {
  used_at: string
  order_id: string
}

const couponModel = {
  /**
   * 获取可用优惠券列表
   */
  findAvailable(now: number = Date.now()): Coupon[] {
    const db = getDb()
    const nowStr = new Date(now).toISOString()
    const stmt = db.prepare(`
      SELECT * FROM coupons
      WHERE status = 'active'
        AND start_time <= ?
        AND end_time >= ?
        AND total_quantity > 0
    `)
    return stmt.all(nowStr, nowStr) as Coupon[]
  },

  /**
   * 根据ID获取优惠券
   */
  findById(id: string): Coupon | null {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM coupons WHERE id = ?')
    const result = stmt.get(id) as Coupon | undefined
    return result || null
  },

  /**
   * 获取用户已领取的优惠券
   */
  findUserCoupons(userId: string, status: string | null = null): UserCouponDetail[] {
    const db = getDb()
    let sql = `
      SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.max_discount,
             c.start_time, c.end_time, c.status as coupon_status
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
    `
    const params: string[] = [userId]

    if (status) {
      sql += ' AND uc.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY uc.created_at DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as UserCouponDetail[]
  },

  /**
   * 获取用户对某优惠券的已领取数量
   */
  countUserCoupons(userId: string, couponId: string): number {
    const db = getDb()
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM user_coupons WHERE user_id = ? AND coupon_id = ?'
    )
    const result = stmt.get(userId, couponId) as { count: number }
    return result ? result.count : 0
  },

  /**
   * 统计优惠券已领取数量
   */
  countClaimed(couponId: string): number {
    const db = getDb()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ?')
    const result = stmt.get(couponId) as { count: number }
    return result ? result.count : 0
  },

  /**
   * 创建优惠券
   */
  create(couponData: CreateCouponData): Coupon | null {
    const db = getDb()
    const id = generateId('CPN')
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO coupons (id, name, type, value, min_amount, max_discount,
                          total_quantity, per_user_limit, start_time, end_time,
                          status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const startTime = couponData.start_time
      ? typeof couponData.start_time === 'number'
        ? new Date(couponData.start_time).toISOString()
        : couponData.start_time
      : now
    const endTime = couponData.end_time
      ? typeof couponData.end_time === 'number'
        ? new Date(couponData.end_time).toISOString()
        : couponData.end_time
      : now

    stmt.run(
      id,
      couponData.name,
      couponData.type || 'fixed',
      couponData.value,
      couponData.min_amount || 0,
      couponData.max_discount || null,
      couponData.total_quantity || 0,
      couponData.per_user_limit || 1,
      startTime,
      endTime,
      couponData.status || 'active',
      now,
      now
    )

    return this.findById(id)
  },

  /**
   * 更新优惠券
   */
  update(id: string, couponData: UpdateCouponData): Coupon | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (couponData.name !== undefined) {
      fields.push('name = ?')
      values.push(couponData.name)
    }
    if (couponData.type !== undefined) {
      fields.push('type = ?')
      values.push(couponData.type)
    }
    if (couponData.value !== undefined) {
      fields.push('value = ?')
      values.push(couponData.value)
    }
    if (couponData.min_amount !== undefined) {
      fields.push('min_amount = ?')
      values.push(couponData.min_amount)
    }
    if (couponData.max_discount !== undefined) {
      fields.push('max_discount = ?')
      values.push(couponData.max_discount)
    }
    if (couponData.total_quantity !== undefined) {
      fields.push('total_quantity = ?')
      values.push(couponData.total_quantity)
    }
    if (couponData.per_user_limit !== undefined) {
      fields.push('per_user_limit = ?')
      values.push(couponData.per_user_limit)
    }
    if (couponData.start_time !== undefined) {
      fields.push('start_time = ?')
      values.push(couponData.start_time)
    }
    if (couponData.end_time !== undefined) {
      fields.push('end_time = ?')
      values.push(couponData.end_time)
    }
    if (couponData.status !== undefined) {
      fields.push('status = ?')
      values.push(couponData.status)
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const sql = `UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`
    const stmt = db.prepare(sql)
    stmt.run(...values)

    return this.findById(id)
  },

  /**
   * 删除优惠券
   */
  delete(id: string): { changes: number } {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM coupons WHERE id = ?')
    return stmt.run(id)
  },

  /**
   * 分页获取优惠券列表
   */
  findAll(
    page: number = 1,
    pageSize: number = 20,
    status: string | null = null
  ): { data: Coupon[]; total: number } {
    const db = getDb()
    let countSql = 'SELECT COUNT(*) as total FROM coupons'
    let dataSql = 'SELECT * FROM coupons'
    const params: string[] = []

    if (status) {
      countSql += ' WHERE status = ?'
      dataSql += ' WHERE status = ?'
      params.push(status)
    }

    dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'

    const countStmt = db.prepare(countSql)
    const countResult =
      params.length > 0
        ? (countStmt.get(...params) as { total: number })
        : (countStmt.get() as { total: number })

    const dataStmt = db.prepare(dataSql)
    const offset = (page - 1) * pageSize
    const data =
      params.length > 0
        ? (dataStmt.all(...params, pageSize, offset) as Coupon[])
        : (dataStmt.all(pageSize, offset) as Coupon[])

    return { data, total: countResult.total }
  },

  /**
   * 领取优惠券（使用事务确保原子性）
   */
  claimCoupon(userId: string, couponId: string): ClaimResult {
    const db = getDb()
    const id = generateId('UCP')
    const now = new Date().toISOString()

    const claimTransaction = db.transaction(() => {
      // 查询优惠券
      const coupon = this.findById(couponId)
      if (!coupon) {
        throw new Error('优惠券不存在')
      }

      // 检查状态
      if (coupon.status !== 'active') {
        throw new Error('优惠券已失效')
      }

      const nowStr = new Date().toISOString()
      if (coupon.start_time > nowStr) {
        throw new Error('优惠券尚未开始')
      }
      if (coupon.end_time < nowStr) {
        throw new Error('优惠券已过期')
      }

      // 检查总量
      const claimedCount = this.countClaimed(couponId)
      if (claimedCount >= coupon.total_quantity) {
        throw new Error('优惠券已被领完')
      }

      // 检查用户限领
      const userClaimedCount = this.countUserCoupons(userId, couponId)
      if (coupon.per_user_limit > 0 && userClaimedCount >= coupon.per_user_limit) {
        throw new Error('您已达到领取上限')
      }

      // 插入用户优惠券
      const insertStmt = db.prepare(`
        INSERT INTO user_coupons (id, user_id, coupon_id, status, created_at)
        VALUES (?, ?, ?, 'unused', ?)
      `)
      insertStmt.run(id, userId, couponId, now)

      return { id, userId, couponId, status: 'unused' as const, claimed_at: now }
    })

    const result = claimTransaction()
    return { ...result, status: result.status as 'unused' } as ClaimResult
  },

  /**
   * 使用优惠券
   */
  useCoupon(userCouponId: string, userId: string, orderId: string): UseResult {
    const db = getDb()
    const now = new Date().toISOString()

    const useTransaction = db.transaction(() => {
      // 查询用户优惠券
      const stmt = db.prepare(`
        SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.max_discount,
               c.start_time, c.end_time, c.status as coupon_status
        FROM user_coupons uc
        JOIN coupons c ON uc.coupon_id = c.id
        WHERE uc.id = ? AND uc.user_id = ?
      `)
      const userCoupon = stmt.get(userCouponId, userId) as UserCouponDetail | undefined

      if (!userCoupon) {
        throw new Error('优惠券不存在或不属于您')
      }

      if (userCoupon.status !== 'unused') {
        throw new Error('优惠券已使用或已过期')
      }

      // 更新状态
      const updateStmt = db.prepare(`
        UPDATE user_coupons SET status = 'used', used_at = ?, order_id = ?
        WHERE id = ? AND user_id = ?
      `)
      updateStmt.run(now, orderId, userCouponId, userId)

      return {
        ...userCoupon,
        status: 'used' as const,
        used_at: now,
        order_id: orderId,
      } as UseResult
    })

    const result = useTransaction()
    return { ...result, status: result.status as 'used' } as UseResult
  },

  /**
   * 批量发放优惠券
   */
  batchIssue(couponId: string, userIds: string[]): string[] {
    const db = getDb()
    const now = new Date().toISOString()
    const results: string[] = []

    const batchTransaction = db.transaction(() => {
      const coupon = this.findById(couponId)
      if (!coupon) {
        throw new Error('优惠券不存在')
      }

      for (const userId of userIds) {
        const userClaimedCount = this.countUserCoupons(userId, couponId)
        if (coupon.per_user_limit > 0 && userClaimedCount >= coupon.per_user_limit) {
          continue
        }

        const id = generateId('UCP')
        const insertStmt = db.prepare(`
          INSERT INTO user_coupons (id, user_id, coupon_id, status, created_at)
          VALUES (?, ?, ?, 'unused', ?)
        `)
        insertStmt.run(id, userId, couponId, now)
        results.push(id)
      }
    })

    batchTransaction()
    return results
  },

  /**
   * 根据用户优惠券ID获取
   */
  findUserCouponById(userCouponId: string, userId: string): UserCouponDetail | null {
    const db = getDb()
    const stmt = db.prepare(`
      SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.max_discount,
             c.start_time, c.end_time, c.status as coupon_status
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.id = ? AND uc.user_id = ?
    `)
    const result = stmt.get(userCouponId, userId) as UserCouponDetail | undefined
    return result || null
  },
}

export default couponModel
