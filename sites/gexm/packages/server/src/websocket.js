/**
 * WebSocket 服务模块
 * 基于 Socket.io 实现实时通信，替代 HTTP 轮询
 *
 * 支持的事件：
 * - connection: 客户端连接
 * - disconnect: 客户端断开
 * - chat:join: 加入会话
 * - chat:leave: 离开会话
 * - chat:send: 发送消息
 * - chat:typing: 正在输入
 * - chat:read: 标记已读
 * - notification:push: 推送通知
 */

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const logger = require('./utils/logger')
const chatModel = require('./models/chatModel')
const notificationModel = require('./models/notificationModel')
const config = require('./config')

class WebSocketService {
  constructor() {
    this.io = null
    this.connectedUsers = new Map() // userId -> Set<socketId>
  }

  /**
   * 初始化 WebSocket 服务
   * @param {http.Server} server - HTTP 服务器实例
   */
  init(server) {
    const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').filter(Boolean)

    this.io = new Server(server, {
      cors: {
        origin:
          process.env.NODE_ENV === 'production' && allowedOrigins.length > 0
            ? allowedOrigins
            : true,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingInterval: 25000,
      pingTimeout: 20000,
      maxHttpBufferSize: 1e6,
    })

    // 认证中间件
    // 安全修复：优先从 auth.token（Socket.IO 客户端）读取，其次从 Authorization header（uni.connectSocket）读取，
    // 最后保留 query.token 作为向后兼容
    this.io.use((socket, next) => {
      try {
        const authHeader = socket.handshake.headers?.authorization || ''
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
        const token = socket.handshake.auth?.token || bearerToken || socket.handshake.query?.token

        if (!token) {
          return next(new Error('Authentication required'))
        }

        const decoded = jwt.verify(token, config.jwt.secret, {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        })
        socket.user = decoded
        next()
      } catch (err) {
        logger.warn('WebSocket authentication failed: %s', err.message)
        next(new Error('Invalid authentication token'))
      }
    })

    // 连接事件
    this.io.on('connection', (socket) => {
      this.handleConnection(socket)
    })

    logger.info('WebSocket service initialized')
    return this.io
  }

  /**
   * 处理客户端连接
   */
  handleConnection(socket) {
    const userId = socket.user?.id
    logger.info('WebSocket connected: userId=%s, socketId=%s', userId, socket.id)

    // 记录用户连接
    if (userId) {
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set())
      }
      this.connectedUsers.get(userId).add(socket.id)
    }

    // 加入个人房间（用于定向推送）
    if (userId) {
      socket.join(`user:${userId}`)
    }

    // 注册事件处理器
    this.registerChatHandlers(socket)
    this.registerNotificationHandlers(socket)

    // 断开连接
    socket.on('disconnect', () => {
      this.handleDisconnect(socket)
    })
  }

  /**
   * 处理客户端断开
   */
  handleDisconnect(socket) {
    const userId = socket.user?.id
    logger.info('WebSocket disconnected: userId=%s, socketId=%s', userId, socket.id)

    // 清理用户连接记录
    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socket.id)
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId)
      }
    }
  }

  /**
   * 注册聊天相关事件处理器
   */
  registerChatHandlers(socket) {
    const userId = socket.user?.id

    // 加入会话房间
    socket.on('chat:join', ({ conversationId }) => {
      if (!conversationId) {
        return
      }

      socket.join(`conversation:${conversationId}`)
      logger.debug('User %s joined conversation %s', userId, conversationId)

      // 标记消息为已读
      if (userId) {
        chatModel.markMessagesAsRead(userId, conversationId)
        // 广播已读状态
        this.io.to(`conversation:${conversationId}`).emit('chat:read', {
          conversationId,
          userId,
          timestamp: Date.now(),
        })
      }
    })

    // 离开会话房间
    socket.on('chat:leave', ({ conversationId }) => {
      if (!conversationId) {
        return
      }
      socket.leave(`conversation:${conversationId}`)
      logger.debug('User %s left conversation %s', userId, conversationId)
    })

    // 发送消息
    socket.on('chat:send', async ({ conversationId, content, type = 'text' }) => {
      if (!conversationId || !content || !userId) {
        return
      }

      try {
        // 保存消息到数据库
        const message = chatModel.addMessage(conversationId, userId, content, type)

        // 广播到会话房间
        this.io.to(`conversation:${conversationId}`).emit('chat:message', {
          message,
          conversationId,
        })

        // 获取会话参与者并推送通知
        const conversation = chatModel.findConversationById(conversationId)
        if (conversation) {
          const otherUserId =
            conversation.creator_id === userId
              ? conversation.participant_id
              : conversation.creator_id

          if (otherUserId) {
            // 发送通知
            this.sendNotification(otherUserId, {
              type: 'new_message',
              title: conversation.type === 'ai' ? 'AI助手' : '新消息',
              content: content.substring(0, 50),
              data: {
                conversationId,
                messageId: message.id,
              },
            })
          }
        }

        // 如果是AI对话，触发AI回复
        if (conversation?.type === 'ai') {
          this.triggerAIReply(conversationId, content)
        }
      } catch (err) {
        logger.error('Chat send failed: %s', err.message)
        socket.emit('chat:error', {
          conversationId,
          error: err.message,
        })
      }
    })

    // 正在输入状态
    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      if (!conversationId || !userId) {
        return
      }

      socket.to(`conversation:${conversationId}`).emit('chat:typing', {
        conversationId,
        userId,
        isTyping,
        timestamp: Date.now(),
      })
    })

    // 标记消息已读
    socket.on('chat:read', ({ conversationId }) => {
      if (!conversationId || !userId) {
        return
      }

      chatModel.markMessagesAsRead(userId, conversationId)

      this.io.to(`conversation:${conversationId}`).emit('chat:read', {
        conversationId,
        userId,
        timestamp: Date.now(),
      })
    })
  }

  /**
   * 注册通知相关事件处理器
   */
  registerNotificationHandlers(socket) {
    const userId = socket.user?.id

    // 标记通知已读
    socket.on('notification:read', async ({ notificationId }) => {
      if (!notificationId || !userId) {
        return
      }

      try {
        notificationModel.markAsRead(userId, notificationId)
        socket.emit('notification:read:success', { notificationId })
      } catch (err) {
        logger.error('Mark notification read failed: %s', err.message)
      }
    })

    // 标记所有通知已读
    socket.on('notification:read-all', async () => {
      if (!userId) {
        return
      }

      try {
        notificationModel.markAllAsRead(userId)
        socket.emit('notification:read-all:success', { timestamp: Date.now() })
      } catch (err) {
        logger.error('Mark all notifications read failed: %s', err.message)
      }
    })
  }

  /**
   * 触发AI回复（异步）
   */
  async triggerAIReply(conversationId, content) {
    try {
      // 模拟AI思考延迟
      const thinkTime = 500 + Math.random() * 1000

      setTimeout(() => {
        const aiReply = this.generateAIReply(content)

        // 保存AI消息
        const message = chatModel.addMessage(conversationId, 'ai_assistant', aiReply, 'text')

        if (message) {
          // 广播到会话房间
          this.io.to(`conversation:${conversationId}`).emit('chat:message', {
            message,
            conversationId,
          })

          // 更新最后消息
          chatModel.updateLastMessage(conversationId, message)
        }
      }, thinkTime)
    } catch (err) {
      logger.error('AI reply generation failed: %s', err.message)
    }
  }

  /**
   * 生成AI回复（模拟）
   */
  generateAIReply(_content) {
    const replies = [
      '您好！我是AI助手，很高兴为您服务。',
      '这是一个很好的问题，让我来帮您分析一下。',
      '感谢您的提问，我会尽力为您解答。',
      '我理解您的需求，请稍等片刻。',
      '好的，我已经记录下来了。还有什么可以帮您的吗？',
    ]

    return replies[Math.floor(Math.random() * replies.length)]
  }

  /**
   * 向指定用户发送通知
   */
  sendNotification(userId, notification) {
    try {
      // 保存通知到数据库
      const saved = notificationModel.create({
        user_id: userId,
        type: notification.type || 'system',
        title: notification.title || '通知',
        content: notification.content || '',
        data: JSON.stringify(notification.data || {}),
      })

      // 如果用户在线，实时推送
      if (this.isUserOnline(userId)) {
        this.io.to(`user:${userId}`).emit('notification:new', saved)
      }

      return saved
    } catch (err) {
      logger.error('Send notification failed: %s', err.message)
      return null
    }
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0
  }

  /**
   * 获取在线用户数量
   */
  getOnlineUserCount() {
    return this.connectedUsers.size
  }

  /**
   * 获取IO实例
   */
  getIO() {
    return this.io
  }
}

module.exports = new WebSocketService()
