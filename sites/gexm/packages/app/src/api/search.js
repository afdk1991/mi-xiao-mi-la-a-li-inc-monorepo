/**
 * 搜索相关API
 */
import http from './request'

const searchApi = {
  /**
   * 搜索商品
   */
  searchProducts(params = {}) {
    return http.get('/search', params)
  },

  /**
   * 热门搜索词
   */
  getHotKeywords() {
    return http.get('/search/hot')
  },

  /**
   * 搜索联想
   */
  getSuggestions(keyword) {
    return http.get('/search/suggest', { keyword })
  },
}

export default searchApi
