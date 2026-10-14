/**
 * 评价相关API
 */
import http from './request'

const reviewApi = {
  /**
   * 获取商品评价列表
   */
  getProductReviews(productId, params = {}) {
    return http.get(`/products/${productId}/reviews`, params)
  },

  /**
   * 获取商品评价统计
   */
  getProductReviewStats(productId) {
    return http.get(`/products/${productId}/reviews/stats`)
  },

  /**
   * 发布评价
   */
  createReview(data) {
    return http.post('/reviews', data)
  },

  /**
   * 获取我的评价
   */
  getMyReviews(params = {}) {
    return http.get('/reviews/mine', params)
  },
}

export default reviewApi
