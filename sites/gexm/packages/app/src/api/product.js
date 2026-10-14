/**
 * 商品相关API
 */
import http from './request'

const productApi = {
  /**
   * 获取商品列表
   */
  getProducts(params = {}) {
    return http.get('/products', params)
  },

  /**
   * 获取商品详情
   */
  getProductDetail(productId) {
    return http.get(`/products/${productId}`)
  },

  /**
   * 获取商品SKU列表
   */
  getProductSkus(productId) {
    return http.get(`/products/${productId}/skus`)
  },

  /**
   * 创建商品（管理员）
   */
  createProduct(data) {
    return http.post('/products', data)
  },

  /**
   * 更新商品（管理员）
   */
  updateProduct(productId, data) {
    return http.put(`/products/${productId}`, data)
  },

  /**
   * 删除商品（管理员）
   */
  deleteProduct(productId) {
    return http.delete(`/products/${productId}`)
  },

  /**
   * 更新商品状态（管理员）
   */
  updateProductStatus(productId, status) {
    return http.patch(`/products/${productId}/status`, { status })
  },

  /**
   * 获取相关商品推荐
   */
  getRelatedProducts(productId, params = {}) {
    return http.get(`/products/${productId}/related`, params)
  },

  /**
   * 获取商品库存
   */
  getProductStock(productId, skuId) {
    const url = skuId
      ? `/products/${productId}/stock?skuId=${skuId}`
      : `/products/${productId}/stock`
    return http.get(url)
  },
}

export default productApi
