import http from './request'

export const syncApi = {
  pull(lastSyncTime = 0) {
    return http.get('/sync/pull', { lastSyncTime })
  },

  push(records) {
    return http.post('/sync/push', { records }, { loadingText: '同步中...' })
  },

  getStatus() {
    return http.get('/sync/status', {}, { loading: false })
  },

  clearOld(days = 30) {
    return http.post('/sync/clear', { days })
  },
}

export default syncApi
