import { defineStore } from 'pinia'
import inboxApi from '../api/inbox'

export const useInboxStore = defineStore('inbox', {
  state: () => ({
    messages: [],
    currentMessage: null,
    unreadCount: 0,
  }),

  getters: {
    readMessages: (state) => {
      return state.messages.filter((m) => m.read)
    },
    unreadMessages: (state) => {
      return state.messages.filter((m) => !m.read)
    },
  },

  actions: {
    async fetchMessages(params = {}) {
      try {
        const result = await inboxApi.getList(params)
        this.messages = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch inbox messages:', e)
        throw e
      }
    },

    async fetchMessageDetail(id) {
      try {
        const result = await inboxApi.getDetail(id)
        this.currentMessage = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch message detail:', e)
        throw e
      }
    },

    async markAsRead(id) {
      try {
        const result = await inboxApi.markAsRead(id)
        const message = this.messages.find((m) => m.id === id)
        if (message) {
          message.read = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
        if (this.currentMessage?.id === id) {
          this.currentMessage.read = true
        }
        return result
      } catch (e) {
        console.error('Failed to mark message as read:', e)
        throw e
      }
    },

    async markAllAsRead() {
      try {
        const result = await inboxApi.markAllAsRead()
        this.messages.forEach((m) => {
          m.read = true
        })
        this.unreadCount = 0
        return result
      } catch (e) {
        console.error('Failed to mark all messages as read:', e)
        throw e
      }
    },

    async deleteMessage(id) {
      try {
        const result = await inboxApi.deleteMessage(id)
        const index = this.messages.findIndex((m) => m.id === id)
        if (index > -1) {
          const message = this.messages[index]
          if (!message.read) {
            this.unreadCount = Math.max(0, this.unreadCount - 1)
          }
          this.messages.splice(index, 1)
        }
        if (this.currentMessage?.id === id) {
          this.currentMessage = null
        }
        return result
      } catch (e) {
        console.error('Failed to delete message:', e)
        throw e
      }
    },

    async batchDelete(ids) {
      try {
        const result = await inboxApi.batchDelete(ids)
        ids.forEach((id) => {
          const index = this.messages.findIndex((m) => m.id === id)
          if (index > -1) {
            const message = this.messages[index]
            if (!message.read) {
              this.unreadCount = Math.max(0, this.unreadCount - 1)
            }
            this.messages.splice(index, 1)
          }
        })
        return result
      } catch (e) {
        console.error('Failed to batch delete messages:', e)
        throw e
      }
    },

    async replyMessage(id, content) {
      try {
        const result = await inboxApi.replyMessage(id, content)
        await this.fetchMessageDetail(id)
        return result
      } catch (e) {
        console.error('Failed to reply message:', e)
        throw e
      }
    },

    async fetchUnreadCount() {
      try {
        const result = await inboxApi.getUnreadCount()
        this.unreadCount = result.data?.count || result?.count || 0
        return result
      } catch (e) {
        console.error('Failed to fetch unread count:', e)
        throw e
      }
    },

    async refresh() {
      await Promise.all([
        this.fetchMessages(),
        this.fetchUnreadCount(),
      ])
    },

    clearCurrentMessage() {
      this.currentMessage = null
    },
  },
})