import { getDb } from './index'
import { generateId } from '../utils/response'

interface CheckinConfig {
  daily_points: number
  consecutive_bonus: number[]
  max_consecutive_days: number
}

interface CheckinRecord {
  id: string
  user_id: string
  checkin_date: string
  consecutive_days: number
  points_earned: number
  created_at: string
}

interface CheckinResult {
  id: string
  user_id: string
  date: string
  consecutive_days: number
  points_earned: number
  created_at: string
}

interface CheckinStats {
  total_days: number
  total_points: number
  current_streak: number
  month_days: number
  today_checked: boolean
}

interface CalendarDay {
  date: string
  checked: boolean
  consecutive_days: number
  points_earned: number
}

interface CheckinCalendar {
  year: number
  month: number
  calendar: CalendarDay[]
}

interface AdminStats {
  total_checkins: number
  total_points: number
  today_checkins: number
  active_users: number
}

const DEFAULT_CONFIG: CheckinConfig = {
  daily_points: 10,
  consecutive_bonus: [0, 5, 10, 15, 20, 25, 30],
  max_consecutive_days: 7,
}

const checkinModel = {
  getConfig(): CheckinConfig {
    return { ...DEFAULT_CONFIG }
  },

  formatDate(date: Date | string): string {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  isSameDay(timestamp1: Date | string, timestamp2: Date | string): boolean {
    return this.formatDate(timestamp1) === this.formatDate(timestamp2)
  },

  isYesterday(timestamp: Date | string): boolean {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return this.formatDate(timestamp) === this.formatDate(yesterday)
  },

  checkin(userId: string): CheckinResult {
    const db = getDb()
    const now = new Date()
    const today = this.formatDate(now)

    const checkinTransaction = db.transaction(() => {
      const todayStmt = db.prepare('SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?')
      const todayRecord = todayStmt.get(userId, today) as CheckinRecord | undefined

      if (todayRecord) {
        throw new Error('今日已签到')
      }

      const lastCheckinStmt = db.prepare(
        'SELECT * FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1'
      )
      const lastCheckin = lastCheckinStmt.get(userId) as CheckinRecord | undefined

      let consecutiveDays = 1
      if (lastCheckin) {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = this.formatDate(yesterday)

        if (lastCheckin.checkin_date === yesterdayStr) {
          consecutiveDays = (lastCheckin.consecutive_days || 1) + 1
        }
      }

      consecutiveDays = Math.min(consecutiveDays, DEFAULT_CONFIG.max_consecutive_days)

      const basePoints = DEFAULT_CONFIG.daily_points
      const bonusPoints = DEFAULT_CONFIG.consecutive_bonus[consecutiveDays - 1] || 0
      const totalPoints = basePoints + bonusPoints

      const insertStmt = db.prepare(`
        INSERT INTO checkins (id, user_id, checkin_date, consecutive_days, points_earned, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      insertStmt.run(
        generateId('CKI'),
        userId,
        today,
        consecutiveDays,
        totalPoints,
        now.toISOString()
      )

      return {
        id: generateId('CKI'),
        user_id: userId,
        date: today,
        consecutive_days: consecutiveDays,
        points_earned: totalPoints,
        created_at: now.toISOString(),
      }
    })

    return checkinTransaction()
  },

  findByUser(
    userId: string,
    page: number = 1,
    pageSize: number = 30
  ): { data: CheckinRecord[]; total: number } {
    const db = getDb()

    const countStmt = db.prepare('SELECT COUNT(*) as total FROM checkins WHERE user_id = ?')
    const total = countStmt.get(userId) as { total: number }

    const stmt = db.prepare(`
      SELECT * FROM checkins
      WHERE user_id = ?
      ORDER BY checkin_date DESC
      LIMIT ? OFFSET ?
    `)
    const offset = (page - 1) * pageSize
    const data = stmt.all(userId, pageSize, offset) as CheckinRecord[]

    return { data, total: total.total }
  },

  getStats(userId: string): CheckinStats {
    const db = getDb()
    const now = new Date()
    const today = this.formatDate(now)

    const statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total_days,
        COALESCE(SUM(points_earned), 0) as total_points
      FROM checkins WHERE user_id = ?
    `)
    const stats = statsStmt.get(userId) as { total_days: number; total_points: number }

    const lastCheckinStmt = db.prepare(
      'SELECT * FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1'
    )
    const lastCheckin = lastCheckinStmt.get(userId) as CheckinRecord | undefined

    let currentStreak = 0
    if (lastCheckin) {
      if (this.isSameDay(lastCheckin.created_at, now)) {
        currentStreak = lastCheckin.consecutive_days
      } else if (this.isYesterday(lastCheckin.created_at)) {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = this.formatDate(yesterday)
        if (lastCheckin.checkin_date === yesterdayStr) {
          currentStreak = (lastCheckin.consecutive_days || 1) + 1
        }
      }
    }

    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const monthStmt = db.prepare(`
      SELECT COUNT(*) as month_days FROM checkins
      WHERE user_id = ?
      AND EXTRACT(MONTH FROM checkin_date) = ?
      AND EXTRACT(YEAR FROM checkin_date) = ?
    `)
    const monthDays = monthStmt.get(userId, thisMonth + 1, thisYear) as { month_days: number }

    const todayStmt = db.prepare('SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?')
    const todayRecord = todayStmt.get(userId, today) as CheckinRecord | undefined

    return {
      total_days: stats.total_days,
      total_points: stats.total_points,
      current_streak: currentStreak,
      month_days: monthDays.month_days,
      today_checked: !!todayRecord,
    }
  },

  getCalendar(userId: string, year?: number, month?: number): CheckinCalendar {
    const db = getDb()
    const targetYear = year || new Date().getFullYear()
    const targetMonth = month || new Date().getMonth()

    const startDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`
    const endDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-31`

    const stmt = db.prepare(`
      SELECT * FROM checkins
      WHERE user_id = ?
      AND checkin_date >= ?
      AND checkin_date <= ?
      ORDER BY checkin_date ASC
    `)
    const userRecords = stmt.all(userId, startDate, endDate) as CheckinRecord[]

    const calendar: CalendarDay[] = []
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const record = userRecords.find((r) => r.checkin_date === dateStr)

      calendar.push({
        date: dateStr,
        checked: !!record,
        consecutive_days: record ? record.consecutive_days : 0,
        points_earned: record ? record.points_earned : 0,
      })
    }

    return {
      year: targetYear,
      month: targetMonth,
      calendar,
    }
  },

  adminGetStats(userId: string | null = null): AdminStats {
    const db = getDb()
    const today = this.formatDate(new Date())

    let whereClause = ''
    const params: string[] = []

    if (userId) {
      whereClause = 'WHERE user_id = ?'
      params.push(userId)
    }

    const statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total_checkins,
        COALESCE(SUM(points_earned), 0) as total_points
      FROM checkins ${whereClause}
    `)
    let stats: { total_checkins: number; total_points: number }
    if (params.length > 0) {
      stats = statsStmt.get(...params) as { total_checkins: number; total_points: number }
    } else {
      stats = statsStmt.get() as { total_checkins: number; total_points: number }
    }

    let todayStmt: string
    let todayParams: string[]
    if (userId) {
      todayStmt =
        'SELECT COUNT(*) as today_checkins FROM checkins WHERE checkin_date = ? AND user_id = ?'
      todayParams = [today, userId]
    } else {
      todayStmt = 'SELECT COUNT(*) as today_checkins FROM checkins WHERE checkin_date = ?'
      todayParams = [today]
    }
    const todayResult = db.prepare(todayStmt).get(...todayParams) as { today_checkins: number }

    let usersStmt: string
    if (userId) {
      usersStmt = 'SELECT COUNT(DISTINCT user_id) as active_users FROM checkins WHERE user_id = ?'
    } else {
      usersStmt = 'SELECT COUNT(DISTINCT user_id) as active_users FROM checkins'
    }
    const usersResult = db.prepare(usersStmt).get(...(userId ? [userId] : [])) as {
      active_users: number
    }

    return {
      total_checkins: stats.total_checkins,
      total_points: stats.total_points,
      today_checkins: todayResult.today_checkins,
      active_users: usersResult.active_users,
    }
  },
}

export default checkinModel
