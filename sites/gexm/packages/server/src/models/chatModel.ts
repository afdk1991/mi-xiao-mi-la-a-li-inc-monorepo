import { getDb } from '../models'
import { generateId } from '../utils/response'
import { processAgentMessage } from '../services/agent/agentService'

export type ConversationType = 'private' | 'ai' | 'group' | 'system'
export type MessageType = 'text' | 'image' | 'file' | 'system'
export type MessageStatus = 'sent' | 'read'
export type CommentTargetType = 'global' | 'post' | 'product'

interface Conversation {
  id: string
  creator_id: string
  participant_id: string | null
  type: ConversationType
  title: string
  status: string
  last_message: string
  last_message_at: string
  created_at: string
  updated_at: string
}

interface ConversationWithUnread extends Conversation {
  user_last_read_at?: string
  unread_count?: number
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  type: MessageType
  status: MessageStatus
  created_at: string
}

interface Comment {
  id: string
  user_id: string
  target_type: CommentTargetType
  target_id: string
  content: string
  parent_id: string | null
  status: string
  likes: number
  created_at: string
  updated_at: string
}

interface CommentWithUser extends Comment {
  user_nickname?: string
  user_avatar?: string
}

interface CreateConversationData {
  participantId?: string
  type?: ConversationType
  title?: string
}

interface SendMessageData {
  content: string
  type?: MessageType
}

interface CreateCommentData {
  targetType?: CommentTargetType
  targetId?: string
  content: string
  parentId?: string
}

interface GetUserConversationsOptions {
  page?: number
  pageSize?: number
}

interface GetConversationMessagesOptions {
  page?: number
  pageSize?: number
  beforeId?: string | null
}

interface GetCommentsOptions {
  page?: number
  pageSize?: number
}

interface GetCommentRepliesOptions {
  page?: number
  pageSize?: number
}

const chatModel = {
  createConversation(userId: string, data: CreateConversationData): Conversation | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO conversations (id, creator_id, participant_id, type, title, status, last_message, last_message_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      userId,
      data.participantId || null,
      data.type || 'private',
      data.title || '',
      'active',
      '',
      now,
      now,
      now
    )

    return this.findConversationById(id)
  },

  findConversationById(id: string): Conversation | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
      Conversation | undefined
    return result || null
  },

  getUserConversations(
    userId: string,
    options: GetUserConversationsOptions = {}
  ): { conversations: ConversationWithUnread[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20 } = options
    const offset = (page - 1) * pageSize

    const countResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM conversations 
      WHERE (creator_id = ? OR participant_id = ?) AND status != 'deleted'
    `
      )
      .get(userId, userId) as { count: number }

    const conversations = db
      .prepare(
        `
      SELECT 
        c.*,
        COALESCE(cr.last_read_at, '1970-01-01T00:00:00.000Z') as user_last_read_at,
        (
          SELECT COUNT(*) FROM messages m 
          WHERE m.conversation_id = c.id 
          AND m.sender_id != ? 
          AND m.created_at > COALESCE(cr.last_read_at, '1970-01-01T00:00:00.000Z')
        ) as unread_count
      FROM conversations c
      LEFT JOIN conversation_reads cr ON cr.conversation_id = c.id AND cr.user_id = ?
      WHERE (c.creator_id = ? OR c.participant_id = ?) AND c.status != 'deleted'
      ORDER BY c.last_message_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(userId, userId, userId, userId, pageSize, offset) as ConversationWithUnread[]

    return { conversations, total: countResult.count }
  },

  getOrCreateAIConversation(userId: string): Conversation | null {
    const db = getDb()
    const existing = db
      .prepare(
        `
      SELECT * FROM conversations 
      WHERE creator_id = ? AND type = 'ai' AND status = 'active'
      ORDER BY last_message_at DESC
      LIMIT 1
    `
      )
      .get(userId) as Conversation | undefined

    if (existing) {
      return existing
    }

    return this.createConversation(userId, {
      participantId: 'ai_assistant',
      type: 'ai',
      title: 'AI智能助手',
    })
  },

  updateLastMessage(conversationId: string, message: Message | undefined): void {
    const db = getDb()
    const now = new Date().toISOString()
    const content = message?.content || ''

    db.prepare(
      `
      UPDATE conversations 
      SET last_message = ?, last_message_at = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(content.substring(0, 100), now, now, conversationId)
  },

  sendMessage(userId: string, conversationId: string, data: SendMessageData): Message | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO messages (id, conversation_id, sender_id, content, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, conversationId, userId, data.content, data.type || 'text', 'sent', now)

    const message = this.findMessageById(id)
    this.updateLastMessage(conversationId, message)

    return message
  },

  sendAIMessage(conversationId: string): Message | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    const aiResponses = [
      '您好！我是Gexm智能助手，很高兴为您服务。',
      '感谢您的提问，我来为您分析一下这个问题。',
      '这是一个很好的问题，让我为您详细解答。',
      '根据您描述的情况，我建议您可以尝试以下方案...',
      '您的反馈很有价值，我会记录下来并持续改进服务。',
      '如果您有其他问题，随时可以向我提问。',
    ]

    const content = aiResponses[Math.floor(Math.random() * aiResponses.length)]

    db.prepare(
      `
      INSERT INTO messages (id, conversation_id, sender_id, content, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, conversationId, 'ai_assistant', content, 'text', 'sent', now)

    const message = this.findMessageById(id)
    this.updateLastMessage(conversationId, message)

    return message
  },

  async sendAgentMessage(
    conversationId: string,
    userId: string,
    userMessage: string
  ): Promise<Message | null> {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    const content = await processAgentMessage(conversationId, userId, userMessage)

    db.prepare(
      `
      INSERT INTO messages (id, conversation_id, sender_id, content, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, conversationId, 'ai_assistant', content, 'text', 'sent', now)

    const message = this.findMessageById(id)
    this.updateLastMessage(conversationId, message)

    return message
  },

  sendSystemMessage(conversationId: string, content: string): Message | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO messages (id, conversation_id, sender_id, content, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, conversationId, 'system', content, 'system', 'sent', now)

    return this.findMessageById(id)
  },

  findMessageById(id: string): Message | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message | undefined
    return result || null
  },

  getConversationMessages(
    conversationId: string,
    options: GetConversationMessagesOptions = {}
  ): { messages: Message[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 50, beforeId = null } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE conversation_id = ?'
    const params: (string | number)[] = [conversationId]

    if (beforeId) {
      const beforeMessage = this.findMessageById(beforeId)
      if (beforeMessage) {
        whereClause += ' AND created_at < ?'
        params.push(beforeMessage.created_at)
      }
    }

    const countResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM messages ${whereClause}
    `
      )
      .get(...params) as { count: number }

    const messages = db
      .prepare(
        `
      SELECT * FROM messages
      ${whereClause}
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, pageSize, offset) as Message[]

    return { messages, total: countResult.count }
  },

  markMessagesAsRead(userId: string, conversationId: string): number {
    const db = getDb()
    const now = new Date().toISOString()

    const result = db
      .prepare(
        `
      UPDATE messages 
      SET status = 'read' 
      WHERE conversation_id = ? AND sender_id != ? AND status = 'sent'
    `
      )
      .run(conversationId, userId)

    db.prepare(
      `
      INSERT INTO conversation_reads (id, user_id, conversation_id, last_read_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, conversation_id) DO UPDATE SET
        last_read_at = excluded.last_read_at,
        updated_at = excluded.updated_at
    `
    ).run(generateId(), userId, conversationId, now, now)

    return result.changes
  },

  getUnreadCount(userId: string): number {
    const db = getDb()

    const count = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.creator_id = ? OR c.participant_id = ?) 
      AND m.sender_id != ? 
      AND m.status = 'sent'
    `
      )
      .get(userId, userId, userId) as { count: number }

    return count.count
  },

  createComment(userId: string, data: CreateCommentData): CommentWithUser | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO comments (id, user_id, target_type, target_id, content, parent_id, status, likes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      userId,
      data.targetType || 'global',
      data.targetId || '',
      data.content,
      data.parentId || null,
      'active',
      0,
      now,
      now
    )

    return this.findCommentById(id)
  },

  findCommentById(id: string): CommentWithUser | null {
    const db = getDb()
    const result = db
      .prepare(
        `
      SELECT c.*, u.nickname as user_nickname, u.avatar as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `
      )
      .get(id) as CommentWithUser | undefined
    return result || null
  },

  getComments(
    targetType: CommentTargetType,
    targetId: string | null | undefined,
    options: GetCommentsOptions = {}
  ): { comments: CommentWithUser[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20 } = options
    const offset = (page - 1) * pageSize

    let whereClause = "WHERE c.target_type = ? AND c.status = 'active'"
    const params: (string | number)[] = [targetType]

    if (targetId) {
      whereClause += ' AND c.target_id = ?'
      params.push(targetId)
    }

    const countResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM comments c ${whereClause}
    `
      )
      .get(...params) as { count: number }

    const comments = db
      .prepare(
        `
      SELECT c.*, u.nickname as user_nickname, u.avatar as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, pageSize, offset) as CommentWithUser[]

    return { comments, total: countResult.count }
  },

  getCommentReplies(
    parentId: string,
    options: GetCommentRepliesOptions = {}
  ): { replies: CommentWithUser[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 10 } = options
    const offset = (page - 1) * pageSize

    const countResult = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM comments WHERE parent_id = ? AND status = 'active'
    `
      )
      .get(parentId) as { count: number }

    const replies = db
      .prepare(
        `
      SELECT c.*, u.nickname as user_nickname, u.avatar as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.parent_id = ? AND c.status = 'active'
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `
      )
      .all(parentId, pageSize, offset) as CommentWithUser[]

    return { replies, total: countResult.count }
  },

  likeComment(commentId: string): CommentWithUser | null {
    const db = getDb()
    db.prepare(
      `
      UPDATE comments SET likes = likes + 1 WHERE id = ?
    `
    ).run(commentId)
    return this.findCommentById(commentId)
  },

  deleteComment(userId: string, commentId: string): boolean {
    const db = getDb()
    const result = db
      .prepare(
        `
      DELETE FROM comments WHERE id = ? AND user_id = ?
    `
      )
      .run(commentId, userId)
    return result.changes > 0
  },
}

export default chatModel
