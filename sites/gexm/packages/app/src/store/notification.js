import { defineStore } from 'pinia'
import notificationApi from '../api/notification'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
  }),

  getters: {
    readNotifications: (state) => {
      return state.notifications.filter((n) => n.read)
    },
    unreadNotifications: (state) => {
      return state.notifications.filter((n) => !n.read)
    },
  },

  actions: {
    async fetchNotifications(params = {}) {
      try {
        this.loading = true
        const result = await notificationApi.getList(params)
        this.notifications = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch notifications:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchUnreadCount() {
      try {
        const result = await notificationApi.getUnreadCount()
        this.unreadCount = result.data?.count || result?.count || 0
        return result
      } catch (e) {
        console.error('Failed to fetch unread count:', e)
        throw e
      }
    },

    async markAsRead(id) {
      try {
        const result = await notificationApi.markAsRead(id)
        const notification = this.notifications.find((n) => n.id === id)
        if (notification) {
          notification.read = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
        return result
      } catch (e) {
        console.error('Failed to mark notification as read:', e)
        throw e
      }
    },

    async markAllAsRead() {
      try {
        const result = await notificationApi.markAllAsRead()
        this.notifications.forEach((n) => {
          n.read = true
        })
        this.unreadCount = 0
        return result
      } catch (e) {
        console.error('Failed to mark all notifications as read:', e)
        throw e
      }
    },

    async refresh() {
      await Promise.all([
        this.fetchNotifications(),
        this.fetchUnreadCount(),
      ])
    },
  },
})