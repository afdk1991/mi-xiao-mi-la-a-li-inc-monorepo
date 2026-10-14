import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getDb } from './index'
import config from '../config'
import { generateId } from '../utils/response'
import { encrypt, decrypt } from '../utils/encrypt'

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

export interface User {
  id: string
  username: string
  email: string
  password: string
  nickname: string
  avatar: string
  phone: string
  status: string
  role: string
  balance: number
  level_id: string
  points: number
  email_verified: number
  phone_verified: number
  is_new_user: number
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface SanitizedUser extends Omit<User, 'password'> {}

export interface CreateUserData {
  username: string
  email: string
  password: string
  nickname?: string
  avatar?: string
  phone?: string
  role?: string
  status?: string
}

export interface UpdateUserData {
  nickname?: string
  avatar?: string
  phone?: string
  status?: string
  role?: string
  balance?: number
  points?: number
  phone_verified?: number
  email_verified?: number
  is_new_user?: number
}

export interface FindAllOptions {
  page?: number
  pageSize?: number
  keyword?: string
}

export interface FindAllResult {
  users: SanitizedUser[]
  total: number
}

const userModel: {
  findById: (id: string) => User | undefined
  findByUsername: (username: string) => User | undefined
  findByEmail: (email: string) => User | undefined
  create: (userData: CreateUserData) => Promise<User>
  update: (id: string, data: UpdateUserData) => User
  getBalance: (userId: string) => number
  updateBalance: (userId: string, amount: number) => boolean
  deductBalance: (userId: string, amount: number) => boolean
  rechargeBalance: (userId: string, amount: number) => boolean
  updatePassword: (id: string, newPassword: string) => Promise<void>
  updateLastLogin: (id: string) => void
  findAll: (options?: FindAllOptions) => FindAllResult
  delete: (id: string) => boolean
  comparePassword: (password: string, hash: string) => Promise<boolean>
  generateToken: (user: User) => string
  generateRefreshToken: (userId: string) => string
  verifyRefreshToken: (token: string) => { id: string } | null
  revokeRefreshToken: (token: string) => void
  sanitizeUser: (user: User | undefined) => SanitizedUser | null
} = {
  findById(id) {
    const db = getDb()
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  },

  findByUsername(username) {
    const db = getDb()
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  },

  findByEmail(email) {
    const db = getDb()
    const emailHash = hashEmail(email)
    return db.prepare('SELECT * FROM users WHERE email_hash = ?').get(emailHash)
  },

  async create(userData) {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()
    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : ''

    db.prepare(
      `
      INSERT INTO users (id, username, email, email_hash, password, nickname, avatar, phone, status, role, email_verified, phone_verified, is_new_user, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      userData.username,
      encrypt(userData.email),
      hashEmail(userData.email),
      hashedPassword,
      userData.nickname || userData.username,
      userData.avatar || '',
      encrypt(userData.phone || ''),
      'active',
      'user',
      userData.email ? 0 : 1,
      userData.phone ? 0 : 1,
      1,
      now,
      now
    )

    return this.findById(id) as User
  },

  update(id, data) {
    const db = getDb()
    const now = new Date().toISOString()

    const fields = []
    const values = []

    const allowedFields = ['nickname', 'avatar', 'phone', 'status', 'role', 'balance', 'points', 'email_verified', 'phone_verified', 'is_new_user']
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`)
        values.push(field === 'phone' ? encrypt(data[field]) : data[field])
      }
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id) as User
  },

  getBalance(userId) {
    const db = getDb()
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId)
    return user ? parseFloat(user.balance || 0) : 0
  },

  updateBalance(userId, amount) {
    const db = getDb()
    const now = new Date().toISOString()
    const result = db
      .prepare('UPDATE users SET balance = balance + ?, updated_at = ? WHERE id = ?')
      .run(amount, now, userId)
    return result.changes > 0
  },

  deductBalance(userId, amount) {
    const db = getDb()
    const now = new Date().toISOString()
    const result = db
      .prepare(
        'UPDATE users SET balance = balance - ?, updated_at = ? WHERE id = ? AND balance >= ?'
      )
      .run(amount, now, userId, amount)
    return result.changes > 0
  },

  rechargeBalance(userId, amount) {
    return this.updateBalance(userId, amount)
  },

  async updatePassword(id, newPassword) {
    const db = getDb()
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const now = new Date().toISOString()

    db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(
      hashedPassword,
      now,
      id
    )
  },

  updateLastLogin(id) {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, id)
  },

  findAll({ page = 1, pageSize = 20, keyword = '' } = {}) {
    const db = getDb()
    const offset = (page - 1) * pageSize

    let whereClause = ''
    const params = []

    if (keyword) {
      whereClause = 'WHERE username LIKE ? OR nickname LIKE ?'
      const searchPattern = `%${keyword}%`
      params.push(searchPattern, searchPattern)
    }

    const total = db
      .prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`)
      .get(...params).count as number

    const users = db
      .prepare(
        `
      SELECT id, username, email, nickname, avatar, phone, status, role, balance, email_verified, phone_verified, is_new_user, created_at, updated_at, last_login_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, pageSize, offset) as SanitizedUser[]

    return { users, total }
  },

  delete(id) {
    const db = getDb()
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)
    return result.changes > 0
  },

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash)
  },

  generateToken(user) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    })
  },

  generateRefreshToken(userId) {
    const db = getDb()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const token = jwt.sign({ id: userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    })

    db.prepare(
      `
      INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(generateId(), userId, token, expiresAt.toISOString(), now.toISOString())

    return token
  },

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as { id: string }
      const db = getDb()
      const record = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(token)

      if (!record) {return null}
      if (new Date(record.expires_at) < new Date()) {
        db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token)
        return null
      }

      return decoded
    } catch {
      return null
    }
  },

  revokeRefreshToken(token) {
    const db = getDb()
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token)
  },

  sanitizeUser(user) {
    if (!user) {return null}
    const { password, ...sanitized } = user
    void password
    return {
      ...sanitized,
      email: decrypt((sanitized as Record<string, unknown>).email as string),
      phone: decrypt((sanitized as Record<string, unknown>).phone as string),
    }
  },
}

export default userModel
