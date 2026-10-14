import http from './request'

export const memberApi = {
  getMemberInfo() {
    return http.get('/members/info')
  },

  getMemberLevel() {
    return http.get('/members/level')
  },

  getPointsBalance() {
    return http.get('/members/points')
  },

  getPointsLogs(params = {}) {
    return http.get('/members/points/logs', params)
  },

  getGrowthValue() {
    return http.get('/members/growth')
  },

  getMemberBenefits() {
    return http.get('/members/benefits')
  },

  getNextLevelInfo() {
    return http.get('/members/next-level')
  },
}

export default memberApi
