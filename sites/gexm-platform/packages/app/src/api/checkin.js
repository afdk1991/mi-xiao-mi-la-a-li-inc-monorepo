import http from './request'

export const checkinApi = {
  getCheckinStatus() {
    return http.get('/checkin/status')
  },

  getCheckinHistory(params = {}) {
    return http.get('/checkin/history', params)
  },

  doCheckin() {
    return http.post('/checkin')
  },

  getCheckinReward() {
    return http.get('/checkin/reward')
  },

  getCheckinCalendar(year, month) {
    return http.get(`/checkin/calendar/${year}/${month}`)
  },
}

export default checkinApi
