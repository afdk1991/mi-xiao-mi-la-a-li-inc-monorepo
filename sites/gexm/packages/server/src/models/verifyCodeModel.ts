import { getDb } from './index'
import { generateId } from '../utils/response'

const verifyCodeModel: {
  create: (data: {
    phone?: string
    email?: string
    code: string
    type: string
    expiresAt: string
  }) => void
  findByPhoneAndType: (
    phone: string,
    type: string
  ) =>
    | {
        id: string
        code: string
        expires_at: string
        used: number
        attempts: number
      }
    | undefined
  findByEmailAndType: (
    email: string,
    type: string
  ) =>
    | {
        id: string
        code: string
        expires_at: string
        used: number
        attempts: number
      }
    | undefined
  verify: (phone?: string, email?: string, type?: string, code?: string) => boolean
  markUsed: (phone?: string, email?: string, type?: string) => void
  incrementAttempts: (phone?: string, email?: string, type?: string) => void
  delete: (id: string) => void
  cleanupExpired: () => void
} = {
  create(data) {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `INSERT INTO verify_codes (id, phone, email, code, type, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.phone || '', data.email || '', data.code, data.type, data.expiresAt, now)
  },

  findByPhoneAndType(phone, type) {
    const db = getDb()
    return db
      .prepare(
        'SELECT id, code, expires_at, used, attempts FROM verify_codes WHERE phone = ? AND type = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(phone, type) as
      { id: string; code: string; expires_at: string; used: number; attempts: number } | undefined
  },

  findByEmailAndType(email, type) {
    const db = getDb()
    return db
      .prepare(
        'SELECT id, code, expires_at, used, attempts FROM verify_codes WHERE email = ? AND type = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(email, type) as
      { id: string; code: string; expires_at: string; used: number; attempts: number } | undefined
  },

  verify(phone, email, type, code) {
    let record:
      { id: string; code: string; expires_at: string; used: number; attempts: number } | undefined

    if (phone && type) {
      record = this.findByPhoneAndType(phone, type)
    } else if (email && type) {
      record = this.findByEmailAndType(email, type)
    }

    if (!record) {
      return false
    }
    if (record.used) {
      return false
    }
    if (record.attempts >= 5) {
      return false
    }
    if (new Date(record.expires_at) < new Date()) {
      return false
    }
    if (record.code !== code) {
      this.incrementAttempts(phone, email, type)
      return false
    }

    this.markUsed(phone, email, type)
    return true
  },

  markUsed(phone, email, type) {
    const db = getDb()
    let sql = ''
    const params: unknown[] = []

    if (phone && type) {
      sql = 'UPDATE verify_codes SET used = 1 WHERE phone = ? AND type = ?'
      params.push(phone, type)
    } else if (email && type) {
      sql = 'UPDATE verify_codes SET used = 1 WHERE email = ? AND type = ?'
      params.push(email, type)
    }

    if (sql) {
      db.prepare(sql).run(...params)
    }
  },

  incrementAttempts(phone, email, type) {
    const db = getDb()
    let sql = ''
    const params: unknown[] = []

    if (phone && type) {
      sql = 'UPDATE verify_codes SET attempts = attempts + 1 WHERE phone = ? AND type = ?'
      params.push(phone, type)
    } else if (email && type) {
      sql = 'UPDATE verify_codes SET attempts = attempts + 1 WHERE email = ? AND type = ?'
      params.push(email, type)
    }

    if (sql) {
      db.prepare(sql).run(...params)
    }
  },

  delete(id) {
    const db = getDb()
    db.prepare('DELETE FROM verify_codes WHERE id = ?').run(id)
  },

  cleanupExpired() {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('DELETE FROM verify_codes WHERE expires_at < ?').run(now)
  },
}

export default verifyCodeModel
