import http from './request'

export const inboxApi = {
  getList(params = {}) {
    return http.get('/inbox/messages', params)
  },

  getDetail(id) {
    return http.get(`/inbox/messages/${id}`)
  },

  markAsRead(id) {
    return http.put(`/inbox/messages/${id}/read`)
  },

  markAllAsRead() {
    return http.put('/inbox/messages/read-all')
  },

  deleteMessage(id) {
    return http.delete(`/inbox/messages/${id}`)
  },

  batchDelete(ids) {
    return http.post('/inbox/messages/batch/delete', { ids })
  },

  replyMessage(id, content) {
    return http.post(`/inbox/messages/${id}/reply`, { content })
  },

  getUnreadCount() {
    return http.get('/inbox/messages/unread-count', {}, { loading: false })
  },
}

export default inboxApi
