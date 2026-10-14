/**
 * 收藏相关API
 */
import http from './request'

const favoriteApi = {
  /**
   * 获取收藏列表
   */
  getFavorites() {
    return http.get('/favorites')
  },

  /**
   * 检查是否已收藏
   */
  checkFavorite(productId) {
    return http.get(`/favorites/check/${productId}`)
  },

  /**
   * 添加收藏
   */
  addFavorite(productId) {
    return http.post('/favorites', { productId })
  },

  /**
   * 取消收藏
   */
  removeFavorite(productId) {
    return http.delete(`/favorites/${productId}`)
  },

  /**
   * 批量取消收藏
   */
  removeFavorites(ids) {
    return http.delete('/favorites', { ids })
  },
}

export default favoriteApi
