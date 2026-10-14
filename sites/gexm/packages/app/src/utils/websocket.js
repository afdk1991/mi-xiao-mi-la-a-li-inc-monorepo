/**
 * WebSocket 实时通信服务
 * H5: 基于 Socket.IO 客户端实现，token 通过 auth 机制传递（不出现在 URL 中）
 * 非 H5: 基于 uni.connectSocket 实现，token 通过 Authorization header 传递
 *
 * 支持的事件：
 * - chat:message 收到新消息
 * - chat:typing 对方正在输入
 * - chat:read 对方已读
 * - notification:new 收到新通知
 * - connect 连接成功
 * - disconnect 连接断开
 * - error 连接错误
 */

import { useUserStore } from '@/store/user'

// #ifdef H5
import { io } from 'socket.io-client'
// #endif

class WebSocketService {
  constructor() {
    this.socketTask = null
    this.isConnected = false
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.baseUrl = ''
    this.url = ''
    this.token = ''
    this.eventHandlers = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
  }

  /**
   * 初始化连接
   */
  connect() {
    const userStore = useUserStore()
    if (!userStore.token) {
      console.warn('[WS] No token available, skip connection')
      return
    }

    this.token = userStore.token

    // 开发环境使用本地服务器，生产环境使用当前域名
    const baseUrl = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000'
    this.baseUrl = baseUrl

    // #ifdef H5
    this.connectSocketIO()
    // #endif

    // #ifndef H5
    const wsBase = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    // 安全修复：token 不再通过 URL 查询参数传递，改用 Authorization header
    this.url = `${wsBase}/socket.io/?EIO=4&transport=websocket`
    this.connectUniSocket()
    // #endif
  }

  /**
   * H5 环境使用 Socket.IO 客户端连接
   * 安全修复：token 通过 auth 机制传递，不出现在 URL 中，避免在日志/历史记录中泄露
   */
  // #ifdef H5
  connectSocketIO() {
    if (this.socketTask) {
      this.close()
    }

    try {
      this.socketTask = io(this.baseUrl, {
        auth: { token: this.token },
        transports: ['websocket'],
        reconnection: false, // 自行管理重连逻辑
      })

      this.socketTask.on('connect', () => {
        console.log('[WS] Socket.IO connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connect')
      })

      this.socketTask.on('disconnect', () => {
        console.log('[WS] Socket.IO disconnected')
        this.isConnected = false
        this.emit('disconnect')
        this.tryReconnect()
      })

      this.socketTask.on('connect_error', (error) => {
        console.error('[WS] Socket.IO error:', error)
        this.emit('error', error)
      })

      // 代理所有服务端事件到内部事件系统
      this.socketTask.onAny((eventName, data) => {
        this.emit(eventName, data)
      })
    } catch (err) {
      console.error('[WS] Failed to create Socket.IO connection:', err)
      this.tryReconnect()
    }
  }
  // #endif

  /**
   * 非 H5 环境使用 uni.connectSocket
   * 安全修复：token 通过 Authorization header 传递，不出现在 URL 中
   */
  // #ifndef H5
  connectUniSocket() {
    if (this.socketTask) {
      this.close()
    }

    try {
      this.socketTask = uni.connectSocket({
        url: this.url,
        header: {
          Authorization: `Bearer ${this.token}`,
        },
        complete: () => {},
      })

      this.socketTask.onOpen(() => {
        console.log('[WS] uni-app socket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connect')
        this.startHeartbeat()
      })

      this.socketTask.onMessage((res) => {
        this.handleSocketIOMessage(res.data)
      })

      this.socketTask.onClose(() => {
        console.log('[WS] uni-app socket closed')
        this.isConnected = false
        this.stopHeartbeat()
        this.emit('disconnect')
        this.tryReconnect()
      })

      this.socketTask.onError((err) => {
        console.error('[WS] uni-app socket error:', err)
        this.emit('error', err)
      })
    } catch (err) {
      console.error('[WS] Failed to create uni socket:', err)
      this.tryReconnect()
    }
  }
  // #endif

  /**
   * 处理 Socket.io 协议消息（仅非 H5 环境使用）
   * Socket.io Engine.IO 协议：
   * 0 = open, 1 = close, 2 = ping, 3 = pong, 4 = message
   */
  // #ifndef H5
  handleSocketIOMessage(data) {
    try {
      // Engine.IO 帧类型
      if (typeof data === 'string' && data.length > 0) {
        const frameType = data[0]

        switch (frameType) {
          case '0': // open
            console.log('[WS] Engine.IO open packet received')
            break
          case '2': // ping
            // 响应 pong
            this.sendRaw('3')
            break
          case '3': // pong
            // 收到心跳响应
            break
          case '4': // message
            // Socket.IO 消息
            this.handleSocketIOMessagePayload(data.substring(1))
            break
          default:
            // 可能是 JSON 消息
            break
        }
      }
    } catch (err) {
      console.error('[WS] Failed to parse message:', err)
    }
  }

  /**
   * 处理 Socket.IO 消息载荷
   */
  handleSocketIOMessagePayload(payload) {
    try {
      // Socket.IO 消息格式：类型+命名空间+JSON数组
      // 例如: 2["chat:message", {...}]
      if (payload.startsWith('0')) {
        // 连接确认
        return
      }

      if (payload.startsWith('2')) {
        // 事件消息
        const eventData = payload.substring(1)
        const parsed = JSON.parse(eventData)
        if (Array.isArray(parsed) && parsed.length >= 1) {
          const eventName = parsed[0]
          const eventData2 = parsed[1]
          this.emit(eventName, eventData2)
        }
      }
    } catch (err) {
      console.error('[WS] Failed to parse payload:', err)
    }
  }

  /**
   * 发送原始数据（仅非 H5 环境使用）
   */
  sendRaw(data) {
    if (!this.isConnected || !this.socketTask) return false

    try {
      this.socketTask.send({ data })
      return true
    } catch (err) {
      console.error('[WS] Failed to send raw data:', err)
      return false
    }
  }
  // #endif

  /**
   * 发送事件（Socket.io 格式）
   */
  emitEvent(eventName, data) {
    // #ifdef H5
    if (this.socketTask && this.isConnected) {
      this.socketTask.emit(eventName, data)
      return true
    }
    return false
    // #endif

    // #ifndef H5
    const payload = ['2', JSON.stringify([eventName, data])].join('')
    return this.sendRaw(payload)
    // #endif
  }

  /**
   * 注册事件监听
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event).add(handler)
  }

  /**
   * 取消事件监听
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler)
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((handler) => {
        try {
          handler(data)
        } catch (err) {
          console.error(`[WS] Event handler error for ${event}:`, err)
        }
      })
    }
  }

  /**
   * 开始心跳（仅非 H5 环境使用，H5 由 Socket.IO 客户端自动管理）
   */
  // #ifndef H5
  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendRaw('2') // ping
      }
    }, 25000)
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  // #endif

  /**
   * 尝试重连
   */
  tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnection attempts reached')
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 3)

    console.log(
      `[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    )

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 关闭连接
   */
  close() {
    // #ifndef H5
    this.stopHeartbeat()
    // #endif

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socketTask) {
      try {
        // #ifdef H5
        this.socketTask.disconnect()
        // #endif

        // #ifndef H5
        this.socketTask.close()
        // #endif
      } catch (err) {
        console.error('[WS] Error closing socket:', err)
      }
      this.socketTask = null
    }

    this.isConnected = false
  }

  // ========== 聊天相关方法 ==========

  /**
   * 加入会话
   */
  joinConversation(conversationId) {
    return this.emitEvent('chat:join', { conversationId })
  }

  /**
   * 离开会话
   */
  leaveConversation(conversationId) {
    return this.emitEvent('chat:leave', { conversationId })
  }

  /**
   * 发送消息
   */
  sendMessage(conversationId, content, type = 'text') {
    return this.emitEvent('chat:send', { conversationId, content, type })
  }

  /**
   * 发送正在输入状态
   */
  sendTyping(conversationId, isTyping) {
    return this.emitEvent('chat:typing', { conversationId, isTyping })
  }

  /**
   * 标记消息已读
   */
  markRead(conversationId) {
    return this.emitEvent('chat:read', { conversationId })
  }

  // ========== 通知相关方法 ==========

  /**
   * 标记通知已读
   */
  markNotificationRead(notificationId) {
    return this.emitEvent('notification:read', { notificationId })
  }

  /**
   * 标记所有通知已读
   */
  markAllNotificationsRead() {
    return this.emitEvent('notification:read-all', {})
  }
}

export default new WebSocketService()
