/**
 * 分类相关API
 */
import http from './request'

const categoryApi = {
  /**
   * 获取分类树
   */
  getCategoryTree() {
    return http.get('/categories')
  },

  /**
   * 获取分类下商品
   */
  getCategoryProducts(categoryId, params = {}) {
    return http.get(`/categories/${categoryId}/products`, params)
  },

  /**
   * 创建分类（管理员）
   */
  createCategory(data) {
    return http.post('/categories', data)
  },

  /**
   * 更新分类（管理员）
   */
  updateCategory(categoryId, data) {
    return http.put(`/categories/${categoryId}`, data)
  },

  /**
   * 删除分类（管理员）
   */
  deleteCategory(categoryId) {
    return http.delete(`/categories/${categoryId}`)
  },
}

export default categoryApi
