import { http } from './request'

export interface ChatMessage {
  id: string
  conversationId: string
  userId?: string
  content: string
  type: 'text' | 'image' | 'system'
  isAI: boolean
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  title: string
  lastMessage?: string
  lastMessageTime?: string
  messageCount: number
  unreadCount: number
  isAI: boolean
  createdAt: string
  updatedAt: string
}

export const chatApi = {
  getConversations(): Promise<Conversation[]> {
    return http.get('/chat/conversations')
  },

  getConversation(id: string): Promise<Conversation> {
    return http.get(`/chat/conversations/${id}`)
  },

  createConversation(data: { title?: string; isAI?: boolean }): Promise<Conversation> {
    return http.post('/chat/conversations', data)
  },

  updateConversation(id: string, data: { title?: string }): Promise<Conversation> {
    return http.put(`/chat/conversations/${id}`, data)
  },

  deleteConversation(id: string): Promise<void> {
    return http.delete(`/chat/conversations/${id}`)
  },

  getMessages(conversationId: string, page?: number, pageSize?: number): Promise<{ list: ChatMessage[]; total: number }> {
    return http.get(`/chat/conversations/${conversationId}/messages`, { page, pageSize })
  },

  sendMessage(conversationId: string, data: { content: string; type?: string }): Promise<ChatMessage> {
    return http.post(`/chat/conversations/${conversationId}/messages`, data)
  },

  deleteMessage(id: string): Promise<void> {
    return http.delete(`/chat/messages/${id}`)
  },

  sendAIMessage(data: { content: string; conversationId?: string }): Promise<{ conversation: Conversation; message: ChatMessage }> {
    return http.post('/chat/ai', data)
  },
}
