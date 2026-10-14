import { getDb } from '../models'
import { generateId } from '../utils/response'

interface ErrorLog {
  id: string
  user_id: string | null
  platform: string
  app_version: string
  error_type: string
  error_message: string
  stack_trace: string
  user_agent: string
  created_at: string
}

interface CreateErrorLogData {
  userId?: string
  platform?: string
  appVersion?: string
  errorType?: string
  errorMessage?: string
  stackTrace?: string
  userAgent?: string
}

interface FindAllOptions {
  page?: number
  pageSize?: number
  platform?: string
  errorType?: string
}

interface ErrorLogStatistics {
  totalCount: number
  byPlatform: { platform: string; count: number }[]
  byType: { error_type: string; count: number }[]
  days: number
}

const errorLogModel = {
  create(data: CreateErrorLogData): { id: string; createdAt: string } {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO error_logs (id, user_id, platform, app_version, error_type, error_message, stack_trace, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.userId || null,
      data.platform || '',
      data.appVersion || '',
      data.errorType || '',
      data.errorMessage || '',
      data.stackTrace || '',
      data.userAgent || '',
      now
    )

    return { id, createdAt: now }
  },

  findAll(options: FindAllOptions = {}): { logs: ErrorLog[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, platform = '', errorType = '' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (platform) {
      whereClause += ' AND platform = ?'
      params.push(platform)
    }
    if (errorType) {
      whereClause += ' AND error_type = ?'
      params.push(errorType)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM error_logs ${whereClause}`)
      .get(...params) as { count: number }

    const logs = db
      .prepare(
        `
      SELECT * FROM error_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, pageSize, offset) as ErrorLog[]

    return { logs, total: countResult.count }
  },

  getStats(days: number = 7): ErrorLogStatistics {
    const db = getDb()
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const totalCount = db
      .prepare('SELECT COUNT(*) as count FROM error_logs WHERE created_at >= ?')
      .get(cutoff) as { count: number }

    const byPlatform = db
      .prepare(
        `
      SELECT platform, COUNT(*) as count
      FROM error_logs
      WHERE created_at >= ?
      GROUP BY platform
      ORDER BY count DESC
    `
      )
      .all(cutoff) as { platform: string; count: number }[]

    const byType = db
      .prepare(
        `
      SELECT error_type, COUNT(*) as count
      FROM error_logs
      WHERE created_at >= ?
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10
    `
      )
      .all(cutoff) as { error_type: string; count: number }[]

    return { totalCount: totalCount.count, byPlatform, byType, days }
  },
}

export default errorLogModel
