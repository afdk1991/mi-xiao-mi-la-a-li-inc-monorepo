import http from './request'

export const notificationApi = {
  getList(params = {}) {
    return http.get('/notifications', params)
  },

  getUnreadCount() {
    return http.get('/notifications/unread-count', {}, { loading: false })
  },

  markAsRead(id) {
    return http.put(`/notifications/${id}/read`)
  },

  markAllAsRead() {
    return http.put('/notifications/read-all', {}, { loadingText: '处理中...' })
  },
}

export default notificationApi
