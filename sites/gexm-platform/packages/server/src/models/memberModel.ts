import { getDb } from './index'
import { generateId } from '../utils/response'

interface MemberLevel {
  id: string
  name: string
  min_points: number
  discount_rate: number
  sort_order: number
  created_at?: string
  updated_at?: string
}

interface UserPoints {
  id: string
  user_id: string
  balance: number
  level_id: string
  total_earned: number
  total_spent: number
  created_at: string
  updated_at: string
  level?: MemberLevel
}

interface PointLog {
  id: string
  user_id: string
  type: 'earn' | 'spend'
  amount: number
  balance: number
  reason: string
  order_id?: string | null
  created_at: string
}

interface UpdateLevelData {
  name?: string
  min_points?: number
  discount_rate?: number
  sort_order?: number
}

interface PointsResult {
  logId: string
  userId: string
  type: 'earn' | 'spend'
  amount: number
  balance: number
  reason: string
  orderId?: string | null
  level?: MemberLevel
  createdAt: string
}

const DEFAULT_LEVELS: MemberLevel[] = [
  { id: 'LVL1', name: '普通会员', min_points: 0, discount_rate: 1, sort_order: 1 },
  { id: 'LVL2', name: '白银会员', min_points: 1000, discount_rate: 0.98, sort_order: 2 },
  { id: 'LVL3', name: '黄金会员', min_points: 5000, discount_rate: 0.95, sort_order: 3 },
  { id: 'LVL4', name: '钻石会员', min_points: 20000, discount_rate: 0.9, sort_order: 4 },
]

const memberModel = {
  initializeLevels(): void {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO member_levels (id, name, min_points, discount_rate, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    for (const level of DEFAULT_LEVELS) {
      stmt.run(level.id, level.name, level.min_points, level.discount_rate, level.sort_order, now)
    }
  },

  findAllLevels(): MemberLevel[] {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM member_levels ORDER BY sort_order ASC')
    return stmt.all() as MemberLevel[]
  },

  findLevelById(id: string): MemberLevel | null {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM member_levels WHERE id = ?')
    const result = stmt.get(id) as MemberLevel | undefined
    return result || null
  },

  updateLevel(id: string, levelData: UpdateLevelData): MemberLevel | null {
    const db = getDb()
    const fields: string[] = []
    const values: (string | number)[] = []

    if (levelData.name !== undefined) {
      fields.push('name = ?')
      values.push(levelData.name)
    }
    if (levelData.min_points !== undefined) {
      fields.push('min_points = ?')
      values.push(levelData.min_points)
    }
    if (levelData.discount_rate !== undefined) {
      fields.push('discount_rate = ?')
      values.push(levelData.discount_rate)
    }
    if (levelData.sort_order !== undefined) {
      fields.push('sort_order = ?')
      values.push(levelData.sort_order)
    }

    if (fields.length === 0) {
      return this.findLevelById(id)
    }

    const sql = `UPDATE member_levels SET ${fields.join(', ')} WHERE id = ?`
    const stmt = db.prepare(sql)
    stmt.run(...values, id)

    return this.findLevelById(id)
  },

  getUserPoints(userId: string): UserPoints | null {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM user_points WHERE user_id = ?')
    let userPoints = stmt.get(userId) as UserPoints | undefined

    if (!userPoints) {
      const defaultLevel = this.findLevelById('LVL1')
      const now = new Date().toISOString()

      const insertStmt = db.prepare(`
        INSERT INTO user_points (id, user_id, balance, level_id, total_earned, total_spent, created_at, updated_at)
        VALUES (?, ?, 0, ?, 0, 0, ?, ?)
      `)
      insertStmt.run(generateId('PTS'), userId, defaultLevel?.id || 'LVL1', now, now)

      userPoints = stmt.get(userId) as UserPoints | undefined
    }

    if (userPoints && userPoints.level_id) {
      userPoints.level = this.findLevelById(userPoints.level_id)
    }

    return userPoints || null
  },

  calculateLevel(points: number): MemberLevel {
    const levels = this.findAllLevels()
    const sorted = [...levels].sort((a, b) => b.min_points - a.min_points)

    for (const level of sorted) {
      if (points >= level.min_points) {
        return level
      }
    }

    return levels[0]
  },

  earnPoints(
    userId: string,
    amount: number,
    reason: string = '积分入账',
    orderId: string | null = null
  ): PointsResult {
    const db = getDb()
    const logId = generateId('PLG')
    const now = new Date().toISOString()

    const earnTransaction = db.transaction(() => {
      const userPoints = this.getUserPoints(userId)
      if (!userPoints) {
        throw new Error('用户积分记录不存在')
      }

      const updateStmt = db.prepare(`
        UPDATE user_points
        SET balance = balance + ?,
            total_earned = total_earned + ?,
            level_id = ?,
            updated_at = ?
        WHERE user_id = ?
      `)

      const newLevel = this.calculateLevel(userPoints.balance + amount)
      updateStmt.run(amount, amount, newLevel.id, now, userId)

      const insertLogStmt = db.prepare(`
        INSERT INTO point_logs (id, user_id, type, amount, balance, reason, order_id, created_at)
        VALUES (?, ?, 'earn', ?, ?, ?, ?, ?)
      `)
      insertLogStmt.run(logId, userId, amount, userPoints.balance + amount, reason, orderId, now)

      return {
        logId,
        userId,
        type: 'earn' as const,
        amount,
        balance: userPoints.balance + amount,
        reason,
        orderId,
        level: newLevel,
        createdAt: now,
      }
    })

    return earnTransaction()
  },

  spendPoints(
    userId: string,
    amount: number,
    reason: string = '积分消费',
    orderId: string | null = null
  ): PointsResult {
    const db = getDb()
    const logId = generateId('PLG')
    const now = new Date().toISOString()

    const spendTransaction = db.transaction(() => {
      const userPoints = this.getUserPoints(userId)

      if (!userPoints || userPoints.balance < amount) {
        throw new Error('积分不足')
      }

      const updateStmt = db.prepare(`
        UPDATE user_points
        SET balance = balance - ?,
            total_spent = total_spent + ?,
            level_id = ?,
            updated_at = ?
        WHERE user_id = ?
      `)

      const newLevel = this.calculateLevel(userPoints.balance - amount)
      updateStmt.run(amount, amount, newLevel.id, now, userId)

      const insertLogStmt = db.prepare(`
        INSERT INTO point_logs (id, user_id, type, amount, balance, reason, order_id, created_at)
        VALUES (?, ?, 'spend', ?, ?, ?, ?, ?)
      `)
      insertLogStmt.run(logId, userId, -amount, userPoints.balance - amount, reason, orderId, now)

      return {
        logId,
        userId,
        type: 'spend' as const,
        amount: -amount,
        balance: userPoints.balance - amount,
        reason,
        orderId,
        level: newLevel,
        createdAt: now,
      }
    })

    return spendTransaction()
  },

  findPointLogs(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    type: 'earn' | 'spend' | null = null
  ): { data: PointLog[]; total: number } {
    const db = getDb()
    let sql = 'SELECT * FROM point_logs WHERE user_id = ?'
    const params: (string | number)[] = [userId]

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'

    const countSql = type
      ? 'SELECT COUNT(*) as total FROM point_logs WHERE user_id = ? AND type = ?'
      : 'SELECT COUNT(*) as total FROM point_logs WHERE user_id = ?'
    const countParams: (string | number)[] = type ? [userId, type] : [userId]

    const countStmt = db.prepare(countSql)
    const total = countStmt.get(...countParams) as { total: number }

    const stmt = db.prepare(sql)
    const offset = (page - 1) * pageSize
    const data = stmt.all(...params, pageSize, offset) as PointLog[]

    return { data, total: total.total }
  },

  adminAdjustPoints(userId: string, amount: number, reason: string = ''): PointsResult {
    const db = getDb()
    const logId = generateId('PLG')
    const now = new Date().toISOString()

    const adjustTransaction = db.transaction(() => {
      const userPoints = this.getUserPoints(userId)
      if (!userPoints) {
        throw new Error('用户积分记录不存在')
      }

      const newBalance = Math.max(0, userPoints.balance + amount)
      const newLevel = this.calculateLevel(newBalance)

      const updateStmt = db.prepare(`
        UPDATE user_points
        SET balance = ?,
            total_earned = total_earned + ?,
            level_id = ?,
            updated_at = ?
        WHERE user_id = ?
      `)

      const earnedAmount = amount > 0 ? amount : 0
      updateStmt.run(newBalance, earnedAmount, newLevel.id, now, userId)

      const logReason = reason || (amount > 0 ? '管理员加分' : '管理员减分')
      const insertLogStmt = db.prepare(`
        INSERT INTO point_logs (id, user_id, type, amount, balance, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      insertLogStmt.run(
        logId,
        userId,
        amount > 0 ? 'earn' : 'spend',
        amount,
        newBalance,
        logReason,
        now
      )

      return {
        logId,
        userId,
        type: (amount > 0 ? 'earn' : 'spend') as 'earn' | 'spend',
        amount,
        balance: newBalance,
        reason: logReason,
        level: newLevel,
        createdAt: now,
      }
    })

    return adjustTransaction()
  },

  adminGetMember(userId: string): UserPoints | null {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
    const user = stmt.get(userId)
    if (!user) {
      return null
    }
    return this.getUserPoints(userId)
  },

  adminListMembers(
    page: number = 1,
    pageSize: number = 20,
    levelId: string | null = null
  ): { data: (UserPoints & { level_name?: string; discount_rate?: number })[]; total: number } {
    const db = getDb()
    let sql = `
      SELECT up.*, ml.name as level_name, ml.discount_rate
      FROM user_points up
      LEFT JOIN member_levels ml ON up.level_id = ml.id
    `
    const params: (string | number)[] = []

    if (levelId) {
      sql += ' WHERE up.level_id = ?'
      params.push(levelId)
    }

    sql += ' ORDER BY up.updated_at DESC LIMIT ? OFFSET ?'

    const countSql = levelId
      ? 'SELECT COUNT(*) as total FROM user_points WHERE level_id = ?'
      : 'SELECT COUNT(*) as total FROM user_points'
    const countParams: (string | number)[] = levelId ? [levelId] : []

    const countStmt = db.prepare(countSql)
    const total = countStmt.get(...countParams) as { total: number }

    const stmt = db.prepare(sql)
    const offset = (page - 1) * pageSize
    const data = stmt.all(
      ...(params.length > 0 ? [...params, pageSize, offset] : [pageSize, offset])
    ) as (UserPoints & { level_name?: string; discount_rate?: number })[]

    return { data, total: total.total }
  },
}

export default memberModel
