// @ts-nocheck
import type { Request, Response } from 'express'
import chatModel from '../models/chatModel'
import { successResponse, errorResponse, paginateMeta } from '../utils/response'
import logger from '../utils/logger'

type ConversationType = 'private' | 'group' | 'ai'
type CommentTargetType = 'global' | 'post' | 'product'
type MessageType = 'text' | 'image' | 'file' | 'system'

interface CreateConversationData {
  participantId?: string
  type?: ConversationType
  title?: string
}

interface SendMessageData {
  content: string
  type?: string
}

interface CreateCommentData {
  targetType: CommentTargetType
  targetId: string
  content: string
  parentId?: string
}

const chatController = {
  getConversations(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { page = 1, pageSize = 20 } = req.query

      const result = chatModel.getUserConversations(userId, {
        page: Number(page),
        pageSize: Number(pageSize),
      })

      return successResponse(res, {
        conversations: result.conversations,
        ...paginateMeta(result.total, Number(page), Number(pageSize)),
      })
    } catch (err) {
      logger.error('获取会话列表失败:', err)
      return errorResponse(res, '获取会话列表失败', 1000, 500)
    }
  },

  getConversationDetail(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const conversationId = String(req.params.conversationId)

      const conversation = chatModel.findConversationById(conversationId)
      if (!conversation) {
        return errorResponse(res, '会话不存在', 1001, 404)
      }

      if (conversation.creator_id !== userId && conversation.participant_id !== userId) {
        return errorResponse(res, '无权访问该会话', 1003, 403)
      }

      return successResponse(res, conversation)
    } catch (err) {
      logger.error('获取会话详情失败:', err)
      return errorResponse(res, '获取会话详情失败', 1000, 500)
    }
  },

  getAIConversation(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''

      const conversation = chatModel.getOrCreateAIConversation(userId)
      return successResponse(res, conversation)
    } catch (err) {
      logger.error('获取AI会话失败:', err)
      return errorResponse(res, '获取AI会话失败', 1000, 500)
    }
  },

  createConversation(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { participantId, type = 'private', title } = req.body as CreateConversationData

      if (type === 'private' && !participantId) {
        return errorResponse(res, '私聊必须指定参与者', 1001, 400)
      }

      const conversation = chatModel.createConversation(userId, { participantId, type, title })
      logger.info(`用户 ${userId} 创建会话 ${conversation?.id}`)
      return successResponse(res, conversation)
    } catch (err) {
      logger.error('创建会话失败:', err)
      return errorResponse(res, '创建会话失败', 1000, 500)
    }
  },

  async sendMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const conversationId = String(req.params.conversationId)
      const { content, type = 'text' } = req.body as SendMessageData

      if (!content) {
        return errorResponse(res, '消息内容不能为空', 1001, 400)
      }

      const conversation = chatModel.findConversationById(conversationId)
      if (!conversation) {
        return errorResponse(res, '会话不存在', 1001, 404)
      }

      if (conversation.creator_id !== userId && conversation.participant_id !== userId) {
        return errorResponse(res, '无权在该会话发送消息', 1003, 403)
      }

      const message = chatModel.sendMessage(userId, conversationId, {
        content,
        type: type as MessageType,
      })

      logger.info(`用户 ${userId} 在会话 ${conversationId} 发送消息`)

      if (conversation.type === 'ai') {
        global.setTimeout(() => {
          chatModel
            .sendAgentMessage(conversationId, userId, content)
            .then(() => {
              logger.info(`Agent助手在会话 ${conversationId} 回复消息`)
            })
            .catch((agentErr) => {
              logger.error(`Agent处理消息失败:`, agentErr)
              // 降级：使用随机回复
              try {
                chatModel.sendAIMessage(conversationId)
                logger.info(`降级模式：AI助手在会话 ${conversationId} 回复消息`)
              } catch (fallbackErr) {
                logger.error('降级回复也失败:', fallbackErr)
              }
            })
        }, 500)
      }

      return successResponse(res, message)
    } catch (err) {
      logger.error('发送消息失败:', err)
      return errorResponse(res, '发送消息失败', 1000, 500)
    }
  },

  getMessages(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const conversationId = String(req.params.conversationId)
      const { page = 1, pageSize = 50, beforeId } = req.query

      const conversation = chatModel.findConversationById(conversationId)
      if (!conversation) {
        return errorResponse(res, '会话不存在', 1001, 404)
      }

      if (conversation.creator_id !== userId && conversation.participant_id !== userId) {
        return errorResponse(res, '无权访问该会话', 1003, 403)
      }

      const result = chatModel.getConversationMessages(conversationId, {
        page: Number(page),
        pageSize: Number(pageSize),
        beforeId: beforeId ? String(beforeId) : undefined,
      })
      return successResponse(res, {
        messages: result.messages,
        ...paginateMeta(result.total, Number(page), Number(pageSize)),
      })
    } catch (err) {
      logger.error('获取消息历史失败:', err)
      return errorResponse(res, '获取消息历史失败', 1000, 500)
    }
  },

  getUnreadCount(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const count = chatModel.getUnreadCount(userId)
      return successResponse(res, { count })
    } catch (err) {
      logger.error('获取未读消息数失败:', err)
      return errorResponse(res, '获取未读消息数失败', 1000, 500)
    }
  },

  getComments(req: Request, res: Response): Response {
    try {
      const { targetType = 'global', targetId, page = 1, pageSize = 20 } = req.query

      const result = chatModel.getComments(
        String(targetType) as CommentTargetType,
        targetId ? String(targetId) : undefined,
        {
          page: Number(page),
          pageSize: Number(pageSize),
        }
      )

      return successResponse(res, {
        comments: result.comments,
        ...paginateMeta(result.total, Number(page), Number(pageSize)),
      })
    } catch (err) {
      logger.error('获取评论列表失败:', err)
      return errorResponse(res, '获取评论列表失败', 1000, 500)
    }
  },

  createComment(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const { targetType, targetId, content, parentId } = req.body as CreateCommentData
      if (!content) {
        return errorResponse(res, '评论内容不能为空', 1001, 400)
      }
      const comment = chatModel.createComment(userId, { targetType, targetId, content, parentId })
      logger.info(`用户 ${userId} 发表评论 ${comment?.id}`)
      return successResponse(res, comment)
    } catch (err) {
      logger.error('发表评论失败:', err)
      return errorResponse(res, '发表评论失败', 1000, 500)
    }
  },

  getCommentReplies(req: Request, res: Response): Response {
    try {
      const commentId = String(req.params.commentId)
      const { page = 1, pageSize = 10 } = req.query
      const result = chatModel.getCommentReplies(commentId, {
        page: Number(page),
        pageSize: Number(pageSize),
      })
      return successResponse(res, {
        replies: result.replies,
        ...paginateMeta(result.total, Number(page), Number(pageSize)),
      })
    } catch (err) {
      logger.error('获取评论回复失败:', err)
      return errorResponse(res, '获取评论回复失败', 1000, 500)
    }
  },

  likeComment(req: Request, res: Response): Response {
    try {
      const commentId = String(req.params.commentId)
      const comment = chatModel.likeComment(commentId)
      return successResponse(res, comment)
    } catch (err) {
      logger.error('点赞评论失败:', err)
      return errorResponse(res, '点赞评论失败', 1000, 500)
    }
  },

  deleteComment(req: Request, res: Response): Response {
    try {
      const userId = (req as Request & { user?: { id: string } }).user?.id || ''
      const commentId = String(req.params.commentId)
      const deleted = chatModel.deleteComment(userId, commentId)
      if (!deleted) {
        return errorResponse(res, '删除失败或无权删除', 1001, 400)
      }
      logger.info(`用户 ${userId} 删除评论 ${commentId}`)
      return successResponse(res, { message: '删除成功' })
    } catch (err) {
      logger.error('删除评论失败:', err)
      return errorResponse(res, '删除评论失败', 1000, 500)
    }
  },
}

export default chatController
