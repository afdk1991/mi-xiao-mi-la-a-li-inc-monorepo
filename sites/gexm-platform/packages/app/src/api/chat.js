/**
 * 对话相关API
 */
import http from './request'

const chatApi = {
  // ========== 会话管理 ==========

  /**
   * 获取用户会话列表
   */
  getConversations(page = 1, pageSize = 20) {
    return http.get('/chat/conversations', { page, pageSize })
  },

  /**
   * 创建新会话
   */
  createConversation(data) {
    return http.post('/chat/conversations', data)
  },

  /**
   * 获取/创建AI对话会话
   */
  getAIConversation() {
    return http.get('/chat/conversations/ai')
  },

  /**
   * 获取会话详情和消息
   */
  getConversationDetail(conversationId, page = 1, pageSize = 50) {
    return http.get(`/chat/conversations/${conversationId}`, { page, pageSize })
  },

  // ========== 消息管理 ==========

  /**
   * 发送消息
   */
  sendMessage(conversationId, content, type = 'text') {
    return http.post(`/chat/conversations/${conversationId}/messages`, { content, type })
  },

  /**
   * 获取消息历史
   */
  getMessages(conversationId, page = 1, pageSize = 50, beforeId = null) {
    const params = { page, pageSize }
    if (beforeId) params.beforeId = beforeId
    return http.get(`/chat/conversations/${conversationId}/messages`, params)
  },

  /**
   * 获取未读消息数
   */
  getUnreadCount() {
    return http.get('/chat/unread-count')
  },
}

export default chatApi
