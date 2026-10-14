/**
 * 对话状态管理
 * 管理会话列表、当前会话、消息列表、未读数等
 */
import { defineStore } from 'pinia'
import chatApi from '../api/chat'
import websocketService from '../utils/websocket'

// 本地存储键
const CURRENT_CONVERSATION_KEY = 'gexm_current_conversation'

export const useChatStore = defineStore('chat', {
  state: () => ({
    // 会话列表
    conversations: [],
    conversationsTotal: 0,
    conversationsPage: 1,

    // 当前活跃会话
    currentConversation: null,

    // 当前会话的消息列表
    messages: [],
    messagesTotal: 0,
    messagesPage: 1,

    // 未读消息数
    unreadCount: 0,

    // AI对话会话
    aiConversation: null,

    // 连接状态
    isConnected: false,

    // 发送状态
    isSending: false,

    // WebSocket 事件 handler 引用（非响应式，用于 clearAll 时注销监听）
    _wsHandlers: null,
  }),

  getters: {
    // 是否有会话
    hasConversations: (state) => state.conversations.length > 0,

    // 当前会话ID
    currentConversationId: (state) => state.currentConversation?.id || null,

    // 当前会话类型
    currentConversationType: (state) => state.currentConversation?.type || null,

    // 是否为AI对话
    isAIConversation: (state) => state.currentConversation?.type === 'ai',

    // 最新消息
    latestMessage: (state) =>
      state.messages.length > 0 ? state.messages[state.messages.length - 1] : null,

    // 是否有更多消息
    hasMoreMessages: (state) => state.messages.length < state.messagesTotal,
  },

  actions: {
    /**
     * 初始化对话状态和 WebSocket 连接
     */
    async init() {
      // 从本地存储恢复当前会话
      try {
        const savedConversation = uni.getStorageSync(CURRENT_CONVERSATION_KEY)
        if (savedConversation) {
          this.currentConversation =
            typeof savedConversation === 'string'
              ? JSON.parse(savedConversation)
              : savedConversation
        }
      } catch (e) {
        console.error('Failed to restore conversation:', e)
      }

      // 获取未读数
      await this.fetchUnreadCount()

      // 初始化 WebSocket 连接（如果已登录）
      this.initWebSocket()
    },

    /**
     * 初始化 WebSocket 连接并注册事件
     * 注意：handler 引用保存到 state._wsHandlers，clearAll 时按引用注销监听
     */
    initWebSocket() {
      // 防止重复注册：先注销旧 handler
      this.removeWsHandlers()

      // 注册消息事件
      const messageHandler = (data) => {
        if (data?.message) {
          this.addReceivedMessage(data.message)
        }
      }

      // 注册连接状态事件
      const connectHandler = () => {
        this.isConnected = true
        console.log('[Chat] WebSocket connected')

        // 如果有当前会话，自动加入
        if (this.currentConversationId) {
          websocketService.joinConversation(this.currentConversationId)
        }
      }

      const disconnectHandler = () => {
        this.isConnected = false
        console.log('[Chat] WebSocket disconnected')
      }

      websocketService.on('chat:message', messageHandler)
      websocketService.on('connect', connectHandler)
      websocketService.on('disconnect', disconnectHandler)

      // 保存 handler 引用，clearAll 时按引用注销
      this._wsHandlers = {
        'chat:message': messageHandler,
        connect: connectHandler,
        disconnect: disconnectHandler,
      }
    },

    /**
     * 注销 WebSocket 事件监听（按 handler 引用精准注销）
     */
    removeWsHandlers() {
      if (!this._wsHandlers) return
      for (const [event, handler] of Object.entries(this._wsHandlers)) {
        if (typeof handler === 'function') {
          websocketService.off(event, handler)
        }
      }
      this._wsHandlers = null
    },

    /**
     * 获取会话列表
     */
    async fetchConversations(page = 1, pageSize = 20) {
      try {
        const result = await chatApi.getConversations(page, pageSize)
        this.conversations = result.conversations || []
        this.conversationsTotal = result.total || 0
        this.conversationsPage = page
        return result
      } catch (e) {
        console.error('Failed to fetch conversations:', e)
        throw e
      }
    },

    /**
     * 创建新会话
     */
    async createConversation(data) {
      try {
        const conversation = await chatApi.createConversation(data)
        this.conversations.unshift(conversation)
        this.conversationsTotal++
        return conversation
      } catch (e) {
        console.error('Failed to create conversation:', e)
        throw e
      }
    },

    /**
     * 获取/创建AI对话会话
     */
    async getOrCreateAIConversation() {
      try {
        const conversation = await chatApi.getAIConversation()
        this.aiConversation = conversation

        // 如果会话列表中没有，添加到列表
        const exists = this.conversations.find((c) => c.id === conversation.id)
        if (!exists) {
          this.conversations.unshift(conversation)
        }

        return conversation
      } catch (e) {
        console.error('Failed to get AI conversation:', e)
        throw e
      }
    },

    /**
     * 设置当前会话
     */
    setCurrentConversation(conversation) {
      // 如果之前有会话，先离开
      if (this.currentConversationId && this.isConnected) {
        websocketService.leaveConversation(this.currentConversationId)
      }

      this.currentConversation = conversation
      this.messages = []
      this.messagesTotal = 0
      this.messagesPage = 1

      // 保存到本地存储
      if (conversation) {
        uni.setStorageSync(CURRENT_CONVERSATION_KEY, JSON.stringify(conversation))

        // 加入新会话
        if (this.isConnected) {
          websocketService.joinConversation(conversation.id)
        }
      } else {
        uni.removeStorageSync(CURRENT_CONVERSATION_KEY)
      }
    },

    /**
     * 获取会话消息
     */
    async fetchMessages(conversationId, page = 1, pageSize = 50) {
      try {
        const result = await chatApi.getConversationDetail(conversationId, page, pageSize)

        // 更新当前会话信息
        if (result.conversation && page === 1) {
          this.currentConversation = result.conversation
        }

        // 加载第一页时替换，加载更多时追加到头部（历史消息在上）
        const newMessages = result.messages || []
        const total = result.total || 0

        if (page === 1) {
          this.messages = newMessages
        } else {
          // 去重，避免重复消息
          const existingIds = new Set(this.messages.map((m) => m.id))
          const uniqueNewMessages = newMessages.filter((m) => !existingIds.has(m.id))
          this.messages = [...uniqueNewMessages, ...this.messages]
        }

        this.messagesTotal = total
        this.messagesPage = page

        return result
      } catch (e) {
        console.error('Failed to fetch messages:', e)
        throw e
      }
    },

    /**
     * 发送消息
     */
    async sendMessage(content, type = 'text') {
      if (!this.currentConversationId) {
        throw new Error('没有活跃的会话')
      }

      if (!content || !content.trim()) {
        throw new Error('消息内容不能为空')
      }

      this.isSending = true

      try {
        const message = await chatApi.sendMessage(this.currentConversationId, content, type)

        // 添加到消息列表
        this.messages.push(message)
        this.messagesTotal++

        // 更新会话列表中的最后消息
        const convIndex = this.conversations.findIndex((c) => c.id === this.currentConversationId)
        if (convIndex !== -1) {
          this.conversations[convIndex].last_message = content.substring(0, 100)
          this.conversations[convIndex].last_message_at = message.created_at
        }

        return message
      } catch (e) {
        console.error('Failed to send message:', e)
        throw e
      } finally {
        this.isSending = false
      }
    },

    /**
     * 获取未读消息数
     */
    async fetchUnreadCount() {
      try {
        const result = await chatApi.getUnreadCount()
        this.unreadCount = result.count || 0
        return result.count
      } catch (e) {
        console.error('Failed to fetch unread count:', e)
        return 0
      }
    },

    /**
     * 加载更多消息
     */
    async loadMoreMessages() {
      if (!this.hasMoreMessages || !this.currentConversationId) {
        return null
      }

      const nextPage = this.messagesPage + 1
      return this.fetchMessages(this.currentConversationId, nextPage)
    },

    /**
     * 添加接收到的消息（用于实时推送）
     */
    addReceivedMessage(message) {
      // 检查消息是否属于当前会话
      if (message.conversation_id === this.currentConversationId) {
        // 避免重复添加
        const exists = this.messages.find((m) => m.id === message.id)
        if (!exists) {
          this.messages.push(message)
          this.messagesTotal++
        }
      }

      // 更新未读数
      if (message.sender_id !== this.currentConversation?.creator_id) {
        this.unreadCount++
      }

      // 更新会话列表
      const convIndex = this.conversations.findIndex((c) => c.id === message.conversation_id)
      if (convIndex !== -1) {
        this.conversations[convIndex].last_message = message.content.substring(0, 100)
        this.conversations[convIndex].last_message_at = message.created_at
      }
    },

    /**
     * 清空当前会话消息
     */
    clearMessages() {
      this.messages = []
      this.messagesTotal = 0
      this.messagesPage = 1
    },

    /**
     * 清空对话状态
     */
    clearAll() {
      // 先注销 WebSocket 事件监听，避免内存泄漏
      this.removeWsHandlers()

      this.conversations = []
      this.conversationsTotal = 0
      this.currentConversation = null
      this.messages = []
      this.messagesTotal = 0
      this.unreadCount = 0
      this.aiConversation = null
      this.isConnected = false

      uni.removeStorageSync(CURRENT_CONVERSATION_KEY)
    },
  },
})
