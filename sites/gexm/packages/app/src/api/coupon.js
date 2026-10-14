import http from './request'

export const couponApi = {
  getList(params = {}) {
    return http.get('/coupons', params)
  },

  getAvailable() {
    return http.get('/coupons/available')
  },

  getMine(params = {}) {
    return http.get('/coupons/mine', params)
  },

  getCouponDetail(id) {
    return http.get(`/coupons/${id}`)
  },

  claimCoupon(id) {
    return http.post(`/coupons/${id}/claim`)
  },

  batchClaimCoupon(ids) {
    return http.post('/coupons/batch/claim', { ids })
  },
}

export default couponApi
