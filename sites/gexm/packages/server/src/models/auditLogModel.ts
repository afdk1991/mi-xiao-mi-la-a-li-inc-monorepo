import { getDb } from './index'
import { generateId } from '../utils/response'
import logger from '../utils/logger'

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'cookie']
const MAX_DATA_LENGTH = 10000

// 审计日志接口
interface AuditLog {
  id: string
  admin_id?: string | null
  admin_name?: string | null
  action: string
  resource_type: string
  resource_id?: string | null
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  ip?: string | null
  user_agent?: string | null
  status?: string
  error_message?: string | null
  created_at: string
}

// 创建审计日志数据
interface CreateAuditLogData {
  admin_id?: string | null
  admin_name?: string | null
  action: string
  resource_type: string
  resource_id?: string | null
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  ip?: string | null
  user_agent?: string | null
  status?: string
  error_message?: string | null
}

// 查询选项
interface FindAllOptions {
  page?: number
  pageSize?: number
  adminId?: string
  action?: string
  resourceType?: string
  startDate?: string
  endDate?: string
}

// 统计选项
interface StatsOptions {
  startDate?: string
  endDate?: string
}

// 统计结果
interface AuditLogStats {
  total: number
  success_count: number
  failed_count: number
  action_stats: { action: string; count: number }[]
  resource_stats: { resource_type: string; count: number }[]
  admin_stats: { admin_id: string; admin_name: string; count: number }[]
}

function maskSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data
  }

  const masked = Array.isArray(data) ? [...data] : { ...data }

  function maskObject(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const result = Array.isArray(obj) ? [...obj] : { ...(obj as Record<string, unknown>) }

    for (const key of Object.keys(result as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        ;(result as Record<string, unknown>)[key] = '***'
      } else if (
        typeof (result as Record<string, unknown>)[key] === 'object' &&
        (result as Record<string, unknown>)[key] !== null
      ) {
        ;(result as Record<string, unknown>)[key] = maskObject(
          (result as Record<string, unknown>)[key]
        )
      }
    }

    return result
  }

  return maskObject(masked)
}

function truncateData(data: unknown): unknown {
  if (data === undefined || data === null) {
    return null
  }

  try {
    const jsonStr = JSON.stringify(data)
    if (jsonStr.length <= MAX_DATA_LENGTH) {
      return data
    }

    // 从截断点向前扫描，找到最后一个完整的 JSON 对象/数组边界
    let safeEnd = MAX_DATA_LENGTH
    let braceDepth = 0
    let inString = false
    let escape = false

    for (let i = 0; i < safeEnd; i++) {
      const char = jsonStr[i]

      if (escape) {
        escape = false
        continue
      }

      if (char === '\\') {
        escape = true
        continue
      }

      if (char === '"') {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{' || char === '[') {
          braceDepth++
        } else if (char === '}' || char === ']') {
          braceDepth--
        }
      }
    }

    // 如果在字符串内或括号未闭合，向后扫描到安全边界
    if (inString || braceDepth > 0) {
      for (let i = safeEnd; i < jsonStr.length; i++) {
        const char = jsonStr[i]

        if (escape) {
          escape = false
          continue
        }

        if (char === '\\') {
          escape = true
          continue
        }

        if (char === '"') {
          inString = !inString
          continue
        }

        if (!inString) {
          if (char === '{' || char === '[') {
            braceDepth++
          } else if (char === '}' || char === ']') {
            braceDepth--
            if (braceDepth === 0) {
              safeEnd = i + 1
              break
            }
          }
        }
      }
    }

    const truncatedStr = jsonStr.substring(0, safeEnd)
    const parsed = JSON.parse(truncatedStr)
    if (parsed && typeof parsed === 'object') {
      parsed._truncated = true
    }
    return parsed
  } catch {
    // 无法安全截断，返回带标记的字符串摘要
    try {
      const jsonStr = JSON.stringify(data)
      return {
        _truncated: true,
        _summary: jsonStr.substring(0, MAX_DATA_LENGTH),
      }
    } catch {
      return data
    }
  }
}

const auditLogModel = {
  create(logData: CreateAuditLogData): AuditLog | null {
    try {
      const db = getDb()
      const id = generateId('AUD')
      const now = new Date().toISOString()

      const beforeData = logData.before_data
        ? truncateData(maskSensitiveData(logData.before_data))
        : null
      const afterData = logData.after_data
        ? truncateData(maskSensitiveData(logData.after_data))
        : null

      const stmt = db.prepare(`
        INSERT INTO audit_logs (
          id, admin_id, admin_name, action, resource_type, resource_id,
          before_data, after_data, ip, user_agent, status, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        logData.admin_id || null,
        logData.admin_name || null,
        logData.action,
        logData.resource_type,
        logData.resource_id || null,
        beforeData ? JSON.stringify(beforeData) : null,
        afterData ? JSON.stringify(afterData) : null,
        logData.ip || null,
        logData.user_agent || null,
        logData.status || 'success',
        logData.error_message || null,
        now
      )

      return { id, ...logData, created_at: now }
    } catch (err) {
      logger.error('Audit log creation failed:', (err as Error).message)
      return null
    }
  },

  async createAsync(logData: CreateAuditLogData): Promise<void> {
    setImmediate(() => {
      this.create(logData)
    })
  },

  findAll(options: FindAllOptions = {}): {
    data: AuditLog[]
    total: number
    page: number
    pageSize: number
  } {
    const db = getDb()
    const { page = 1, pageSize = 20, adminId, action, resourceType, startDate, endDate } = options
    const whereClauses: string[] = []
    const params: (string | number)[] = []

    if (adminId) {
      whereClauses.push('admin_id = ?')
      params.push(adminId)
    }
    if (action) {
      whereClauses.push('action = ?')
      params.push(action)
    }
    if (resourceType) {
      whereClauses.push('resource_type = ?')
      params.push(resourceType)
    }
    if (startDate) {
      whereClauses.push('created_at >= ?')
      params.push(startDate)
    }
    if (endDate) {
      whereClauses.push('created_at <= ?')
      params.push(endDate)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereSql}`)
    const countResult = countStmt.get(...params) as { total: number }

    const offset = (page - 1) * pageSize
    const dataStmt = db.prepare(`
      SELECT * FROM audit_logs
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const rawData = dataStmt.all(...params, pageSize, offset) as Record<string, unknown>[]

    const data = rawData.map((row) => ({
      ...row,
      before_data: row.before_data ? JSON.parse(row.before_data as string) : null,
      after_data: row.after_data ? JSON.parse(row.after_data as string) : null,
    })) as AuditLog[]

    return { data, total: countResult.total, page, pageSize }
  },

  findById(id: string): AuditLog | null {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM audit_logs WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) {
      return null
    }

    return {
      ...row,
      before_data: row.before_data ? JSON.parse(row.before_data as string) : null,
      after_data: row.after_data ? JSON.parse(row.after_data as string) : null,
    } as AuditLog
  },

  getStats(options: StatsOptions = {}): AuditLogStats {
    const db = getDb()
    const { startDate, endDate } = options
    const whereClauses: string[] = []
    const params: string[] = []

    if (startDate) {
      whereClauses.push('created_at >= ?')
      params.push(startDate)
    }
    if (endDate) {
      whereClauses.push('created_at <= ?')
      params.push(endDate)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    function buildWhereSql(extraCondition: string | null): string {
      if (whereClauses.length === 0) {
        return extraCondition ? `WHERE ${extraCondition}` : ''
      }
      return extraCondition ? `${whereSql} AND ${extraCondition}` : whereSql
    }

    const totalStmt = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereSql}`)
    const totalResult = totalStmt.get(...params) as { total: number }

    const successStmt = db.prepare(`
      SELECT COUNT(*) as success_count FROM audit_logs ${buildWhereSql("status = 'success'")}
    `)
    const successResult = successStmt.get(...params) as { success_count: number }

    const failedStmt = db.prepare(`
      SELECT COUNT(*) as failed_count FROM audit_logs ${buildWhereSql("status = 'failed'")}
    `)
    const failedResult = failedStmt.get(...params) as { failed_count: number }

    const actionStmt = db.prepare(`
      SELECT action, COUNT(*) as count FROM audit_logs
      ${whereSql}
      GROUP BY action ORDER BY count DESC LIMIT 10
    `)
    const actionStats = actionStmt.all(...params) as { action: string; count: number }[]

    const resourceStmt = db.prepare(`
      SELECT resource_type, COUNT(*) as count FROM audit_logs
      ${whereSql}
      GROUP BY resource_type ORDER BY count DESC LIMIT 10
    `)
    const resourceStats = resourceStmt.all(...params) as { resource_type: string; count: number }[]

    const adminStmt = db.prepare(`
      SELECT admin_id, admin_name, COUNT(*) as count FROM audit_logs
      ${buildWhereSql('admin_id IS NOT NULL')}
      GROUP BY admin_id, admin_name ORDER BY count DESC LIMIT 10
    `)
    const adminStats = adminStmt.all(...params) as {
      admin_id: string
      admin_name: string
      count: number
    }[]

    return {
      total: totalResult.total,
      success_count: successResult.success_count,
      failed_count: failedResult.failed_count,
      action_stats: actionStats,
      resource_stats: resourceStats,
      admin_stats: adminStats,
    }
  },
}

export default auditLogModel
