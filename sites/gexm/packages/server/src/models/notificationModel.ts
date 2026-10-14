import { getDb } from '../models'
import { generateId } from '../utils/response'

interface Notification {
  id: string
  user_id: string
  title: string
  content: string
  type: string
  read: number
  created_at: string
}

interface CreateNotificationData {
  title: string
  content: string
  type?: string
}

interface FindByUserIdOptions {
  page?: number
  pageSize?: number
  unreadOnly?: boolean
}

const notificationModel = {
  create(userId: string, data: CreateNotificationData): Notification | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO notifications (id, user_id, title, content, type, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, userId, data.title, data.content, data.type || 'system', 0, now)

    return this.findById(id)
  },

  findById(id: string): Notification | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as
      Notification | undefined
    return result || null
  },

  findByUserId(
    userId: string,
    options: FindByUserIdOptions = {}
  ): { notifications: Notification[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, unreadOnly = false } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE user_id = ?'
    const params: (string | number)[] = [userId]

    if (unreadOnly) {
      whereClause += ' AND read = 0'
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM notifications ${whereClause}`)
      .get(...params) as { count: number }

    const notifications = db
      .prepare(
        `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, pageSize, offset) as Notification[]

    return { notifications, total: countResult.count }
  },

  getUnreadCount(userId: string): number {
    const db = getDb()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0')
      .get(userId) as { count: number }
    return result.count
  },

  markAsRead(userId: string, id: string): Notification | null {
    const db = getDb()
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, userId)
    return this.findById(id)
  },

  markAllAsRead(userId: string): number {
    const db = getDb()
    const result = db
      .prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0')
      .run(userId)
    return result.changes
  },

  delete(userId: string, id: string): boolean {
    const db = getDb()
    const result = db
      .prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
      .run(id, userId)
    return result.changes > 0
  },
}

export default notificationModel
