// @ts-nocheck
import type { Request, Response } from 'express'
import { successResponse, errorResponse, paginate, getParamStr } from '../utils/response'
import inboxModel, {
  type InboxMessage,
  type InboxMessageWithSender,
  type CreateMessageData,
  type MessageType,
} from '../models/inboxModel'
import { getDb } from '../models'
import { GENERAL_ERRORS, AUTH_ERRORS } from '../constants/errorCodes'

interface MessageResponse {
  id: string
  from_user_id: string | null
  to_user_id: string
  title: string
  content: string
  type: MessageType
  status: string
  read?: boolean
  read_at?: string | null
  created_at: string
  sender_nickname?: string
  sender_avatar?: string
}

interface GetMessagesOptions {
  page: number
  pageSize: number
  status?: string
  type?: string
}

const inboxController = {
  async getMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { page = 1, pageSize = 20, type, read } = req.query

      let status = ''
      if (read !== undefined) {
        status = read === 'true' ? 'read' : 'unread'
      }

      const result = inboxModel.getMessagesByReceiver(userId, {
        page: parseInt(String(page), 10),
        pageSize: parseInt(String(pageSize), 10),
        status,
        type: type || '',
      } as GetMessagesOptions)

      const data = result.messages.map(
        (msg: InboxMessageWithSender) =>
          ({
            id: msg.id,
            from_user_id: msg.sender_id,
            to_user_id: msg.receiver_id,
            title: msg.title,
            content: msg.content,
            type: msg.type,
            status: msg.status,
            read: msg.status === 'read',
            read_at: null,
            created_at: msg.created_at,
            sender_nickname: msg.sender_nickname,
            sender_avatar: msg.sender_avatar,
          }) as MessageResponse
      )

      return successResponse(
        res,
        paginate(data, result.total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async getMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const id = getParamStr(req.params.id)

      const message = inboxModel.findById(id)
      if (!message) {
        return errorResponse(
          res,
          '消息不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      if (message.receiver_id !== userId) {
        return errorResponse(
          res,
          '无权限查看此消息',
          AUTH_ERRORS.FORBIDDEN.code,
          AUTH_ERRORS.FORBIDDEN.httpStatus
        )
      }

      const readMessage = inboxModel.readMessage(id)

      return successResponse(
        res,
        {
          id: readMessage.id,
          from_user_id: readMessage.sender_id,
          to_user_id: readMessage.receiver_id,
          title: readMessage.title,
          content: readMessage.content,
          type: readMessage.type,
          status: readMessage.status,
          read: true,
          read_at: null,
          created_at: readMessage.created_at,
          sender_nickname: readMessage.sender_nickname,
          sender_avatar: readMessage.sender_avatar,
        } as MessageResponse,
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async sendMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { to_user_id, title, content, type = 'system' } = req.body

      if (!title) {
        return errorResponse(
          res,
          '消息标题不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      if (!content) {
        return errorResponse(
          res,
          '消息内容不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const validTypes: MessageType[] = ['system', 'user']
      if (!validTypes.includes(type as MessageType)) {
        return errorResponse(
          res,
          '无效的消息类型',
          GENERAL_ERRORS.INVALID_PARAMETER.code,
          GENERAL_ERRORS.INVALID_PARAMETER.httpStatus
        )
      }

      const message = inboxModel.create({
        sender_id: userId,
        receiver_id: to_user_id || 'all',
        title,
        content,
        type: type as MessageType,
        status: 'unread',
      })

      return successResponse(
        res,
        {
          id: message.id,
          from_user_id: message.sender_id,
          to_user_id: message.receiver_id,
          title: message.title,
          content: message.content,
          type: message.type,
          status: 'sent' as const,
          created_at: message.created_at,
        },
        '发送成功',
        0,
        201
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '发送失败', 1001, 400)
    }
  },

  async markAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const id = getParamStr(req.params.id)

      const message = inboxModel.findById(id)
      if (!message) {
        return errorResponse(
          res,
          '消息不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      if (message.receiver_id !== userId) {
        return errorResponse(
          res,
          '无权限操作此消息',
          AUTH_ERRORS.FORBIDDEN.code,
          AUTH_ERRORS.FORBIDDEN.httpStatus
        )
      }

      inboxModel.readMessage(id)

      return successResponse(res, null, '已标记为已读')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '操作失败', 1001, 400)
    }
  },

  async markAllAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const result = inboxModel.readAll(userId)

      return successResponse(res, { count: result ? 1 : 0 }, '已全部标记为已读')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '操作失败', 1001, 400)
    }
  },

  async deleteMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const id = getParamStr(req.params.id)

      const message = inboxModel.findById(id)
      if (!message) {
        return errorResponse(
          res,
          '消息不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      if (message.receiver_id !== userId) {
        return errorResponse(
          res,
          '无权限删除此消息',
          AUTH_ERRORS.FORBIDDEN.code,
          AUTH_ERRORS.FORBIDDEN.httpStatus
        )
      }

      inboxModel.delete(id)

      return successResponse(res, null, '删除成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '删除失败', 1001, 400)
    }
  },

  async getUnreadCount(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const count = inboxModel.getUnreadCount(userId)

      return successResponse(res, { unread_count: count }, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminSendMessage(req: Request, res: Response): Promise<Response> {
    try {
      const { to_user_id, title, content, type = 'system' } = req.body

      if (!title) {
        return errorResponse(
          res,
          '消息标题不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      if (!content) {
        return errorResponse(
          res,
          '消息内容不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const message = inboxModel.create({
        sender_id: null,
        receiver_id: to_user_id || 'all',
        title,
        content,
        type: type as MessageType,
        status: 'unread',
      })

      return successResponse(
        res,
        {
          id: message.id,
          from_user_id: 'admin' as const,
          to_user_id: message.receiver_id,
          title: message.title,
          content: message.content,
          type: message.type,
          status: 'sent' as const,
          created_at: message.created_at,
        },
        '发送成功',
        0,
        201
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '发送失败', 1001, 400)
    }
  },

  async adminListMessages(req: Request, res: Response): Promise<Response> {
    try {
      const { page = 1, pageSize = 20, type, to_user_id } = req.query
      const typeStr = String(type)
      const toUserIdStr = String(to_user_id)

      const db = getDb()
      let whereClause = 'WHERE 1=1'
      const params: (string | number)[] = []

      if (typeStr && typeStr !== 'undefined') {
        whereClause += ' AND type = ?'
        params.push(typeStr)
      }

      if (toUserIdStr && toUserIdStr !== 'undefined') {
        whereClause += ' AND receiver_id = ?'
        params.push(toUserIdStr)
      }

      const total = (
        db
          .prepare(`SELECT COUNT(*) as count FROM inbox_messages ${whereClause}`)
          .get(...params) as { count: number }
      ).count

      const offset = (parseInt(String(page), 10) - 1) * parseInt(String(pageSize), 10)
      const messages = db
        .prepare(
          `
          SELECT * FROM inbox_messages
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `
        )
        .all(...params, parseInt(String(pageSize), 10), offset) as Record<string, unknown>[]

      const data = messages.map((msg) => ({
        id: String(msg.id),
        from_user_id: msg.sender_id || 'admin',
        to_user_id: String(msg.receiver_id),
        title: String(msg.title),
        content: String(msg.content),
        type: msg.type as MessageType,
        status: String(msg.status),
        created_at: String(msg.created_at),
      }))

      return successResponse(
        res,
        paginate(data, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminGetMessage(req: Request, res: Response): Promise<Response> {
    try {
      const id = getParamStr(req.params.id)

      const message = inboxModel.findById(id)
      if (!message) {
        return errorResponse(
          res,
          '消息不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      return successResponse(
        res,
        {
          id: message.id,
          from_user_id: message.sender_id || 'admin',
          to_user_id: message.receiver_id,
          title: message.title,
          content: message.content,
          type: message.type,
          status: message.status,
          created_at: message.created_at,
        },
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminDeleteMessage(req: Request, res: Response): Promise<Response> {
    try {
      const id = getParamStr(req.params.id)

      const message = inboxModel.findById(id)
      if (!message) {
        return errorResponse(
          res,
          '消息不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      inboxModel.delete(id)

      return successResponse(res, null, '删除成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '删除失败', 1001, 400)
    }
  },
}

export default inboxController
