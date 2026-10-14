import { getDb } from '../models'
import { generateId } from '../utils/response'

type MessageStatus = 'unread' | 'read'
type MessageType = 'system' | 'user'

interface InboxMessage {
  id: string
  sender_id: string | null
  receiver_id: string
  title: string
  content: string
  type: MessageType
  status: MessageStatus
  reply_to_id: string | null
  created_at: string
}

interface InboxMessageWithSender extends InboxMessage {
  sender_nickname?: string
  sender_avatar?: string
}

interface CreateMessageData {
  sender_id?: string | null
  receiver_id: string
  title: string
  content: string
  type?: MessageType
  status?: MessageStatus
  reply_to_id?: string | null
}

interface GetMessagesOptions {
  page?: number
  pageSize?: number
  status?: string
  type?: string
}

interface GetConversationOptions {
  page?: number
  pageSize?: number
}

interface MessageStatistics {
  totalCount: number
  unreadCount: number
  firstMessage: string | null
  lastMessage: string | null
}

const inboxModel = {
  findById(id: string): InboxMessage | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(id) as
      InboxMessage | undefined
    return result || null
  },

  findByIdWithSender(id: string): InboxMessageWithSender | null {
    const db = getDb()
    const result = db
      .prepare(
        `
        SELECT im.*, u.nickname as sender_nickname, u.avatar as sender_avatar
        FROM inbox_messages im
        LEFT JOIN users u ON im.sender_id = u.id
        WHERE im.id = ?
      `
      )
      .get(id) as InboxMessageWithSender | undefined
    return result || null
  },

  getMessagesByReceiver(
    receiverId: string,
    options: GetMessagesOptions = {}
  ): { messages: InboxMessageWithSender[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, status = '', type = '' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE im.receiver_id = ?'
    const params: (string | number)[] = [receiverId]

    if (status) {
      whereClause += ' AND im.status = ?'
      params.push(status)
    }
    if (type) {
      whereClause += ' AND im.type = ?'
      params.push(type)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM inbox_messages im ${whereClause}`)
      .get(...params) as { count: number }

    const messages = db
      .prepare(
        `
        SELECT im.*, u.nickname as sender_nickname, u.avatar as sender_avatar
        FROM inbox_messages im
        LEFT JOIN users u ON im.sender_id = u.id
        ${whereClause}
        ORDER BY im.created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as InboxMessageWithSender[]

    return { messages, total: countResult.count }
  },

  getUnreadCount(receiverId: string): number {
    const db = getDb()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM inbox_messages WHERE receiver_id = ? AND status = ?')
      .get(receiverId, 'unread') as { count: number }
    return result.count
  },

  create(messageData: CreateMessageData): InboxMessageWithSender | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO inbox_messages (
        id, sender_id, receiver_id, title, content, type, status, reply_to_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      messageData.sender_id || null,
      messageData.receiver_id,
      messageData.title,
      messageData.content,
      messageData.type || 'system',
      messageData.status || 'unread',
      messageData.reply_to_id || null,
      now
    )

    return this.findByIdWithSender(id)
  },

  sendSystemMessage(
    receiverId: string,
    title: string,
    content: string
  ): InboxMessageWithSender | null {
    return this.create({
      sender_id: null,
      receiver_id: receiverId,
      title,
      content,
      type: 'system',
      status: 'unread',
    })
  },

  sendUserMessage(
    senderId: string,
    receiverId: string,
    title: string,
    content: string,
    replyToId: string | null = null
  ): InboxMessageWithSender | null {
    return this.create({
      sender_id: senderId,
      receiver_id: receiverId,
      title,
      content,
      type: 'user',
      status: 'unread',
      reply_to_id: replyToId,
    })
  },

  sendBatchMessages(
    senderId: string | null,
    receiverIds: string[],
    title: string,
    content: string,
    type: MessageType = 'system'
  ): { success: boolean; count: number } {
    const db = getDb()
    const now = new Date().toISOString()

    const insertStmt = db.prepare(
      `
      INSERT INTO inbox_messages (
        id, sender_id, receiver_id, title, content, type, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )

    receiverIds.forEach((receiverId) => {
      insertStmt.run(
        generateId(),
        senderId || null,
        receiverId,
        title,
        content,
        type,
        'unread',
        now
      )
    })

    return { success: true, count: receiverIds.length }
  },

  readMessage(id: string): InboxMessageWithSender | null {
    const db = getDb()
    db.prepare('UPDATE inbox_messages SET status = ? WHERE id = ?').run('read', id)
    return this.findByIdWithSender(id)
  },

  readAll(receiverId: string): boolean {
    const db = getDb()
    const result = db
      .prepare('UPDATE inbox_messages SET status = ? WHERE receiver_id = ? AND status = ?')
      .run('read', receiverId, 'unread')
    return result.changes > 0
  },

  update(
    id: string,
    data: Partial<Pick<InboxMessage, 'title' | 'content' | 'type' | 'status'>>
  ): InboxMessageWithSender | null {
    const db = getDb()

    const fields: string[] = []
    const values: (string | number)[] = []

    const allowedFields: (keyof InboxMessage)[] = ['title', 'content', 'type', 'status']
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`)
        values.push(data[field] as string)
      }
    }

    values.push(id)

    db.prepare(`UPDATE inbox_messages SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findByIdWithSender(id)
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM inbox_messages WHERE id = ?').run(id)
    return result.changes > 0
  },

  deleteByReceiver(receiverId: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM inbox_messages WHERE receiver_id = ?').run(receiverId)
    return result.changes > 0
  },

  getReplyChain(messageId: string): InboxMessageWithSender[] {
    const chain: InboxMessageWithSender[] = []
    let currentId: string | null = messageId

    while (currentId) {
      const message = this.findByIdWithSender(currentId)
      if (!message) {
        break
      }

      chain.unshift(message)
      currentId = message.reply_to_id
    }

    return chain
  },

  getConversation(
    senderId: string,
    receiverId: string,
    options: GetConversationOptions = {}
  ): { messages: InboxMessageWithSender[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20 } = options
    const offset = (page - 1) * pageSize

    const countResult = db
      .prepare(
        `
        SELECT COUNT(*) as count FROM inbox_messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      `
      )
      .get(senderId, receiverId, receiverId, senderId) as { count: number }

    const messages = db
      .prepare(
        `
        SELECT im.*, u.nickname as sender_nickname, u.avatar as sender_avatar
        FROM inbox_messages im
        LEFT JOIN users u ON im.sender_id = u.id
        WHERE (im.sender_id = ? AND im.receiver_id = ?) OR (im.sender_id = ? AND im.receiver_id = ?)
        ORDER BY im.created_at ASC
        LIMIT ? OFFSET ?
      `
      )
      .all(senderId, receiverId, receiverId, senderId, pageSize, offset) as InboxMessageWithSender[]

    return { messages, total: countResult.count }
  },

  getMessageTypes(): string[] {
    const db = getDb()
    const results = db.prepare('SELECT DISTINCT type FROM inbox_messages').all() as {
      type: string
    }[]
    return results.map((r) => r.type)
  },

  getStatistics(receiverId: string): MessageStatistics {
    const db = getDb()
    const result = db
      .prepare(
        `
        SELECT COUNT(*) as total_count,
               SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread_count,
               MIN(created_at) as first_message,
               MAX(created_at) as last_message
        FROM inbox_messages
        WHERE receiver_id = ?
      `
      )
      .get(receiverId) as {
      total_count: number
      unread_count: number
      first_message: string | null
      last_message: string | null
    }

    return {
      totalCount: parseInt(String(result.total_count || 0)),
      unreadCount: parseInt(String(result.unread_count || 0)),
      firstMessage: result.first_message,
      lastMessage: result.last_message,
    }
  },
}

export type { MessageType, InboxMessage, InboxMessageWithSender, CreateMessageData }
export default inboxModel
