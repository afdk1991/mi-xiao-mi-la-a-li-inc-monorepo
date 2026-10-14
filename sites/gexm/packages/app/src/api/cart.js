/**
 * 购物车相关API
 */
import http from './request'

const cartApi = {
  /**
   * 获取购物车列表
   */
  getCart() {
    return http.get('/cart')
  },

  /**
   * 获取购物车数量
   */
  getCartCount() {
    return http.get('/cart/count')
  },

  /**
   * 添加购物车
   */
  addToCart(data) {
    return http.post('/cart', data)
  },

  /**
   * 修改购物车数量
   */
  updateCartItem(cartId, quantity) {
    return http.put(`/cart/${cartId}`, { quantity })
  },

  /**
   * 删除购物车项
   */
  deleteCartItem(cartId) {
    return http.delete(`/cart/${cartId}`)
  },

  /**
   * 批量删除购物车
   */
  deleteCartItems(ids) {
    return http.delete('/cart', { ids })
  },

  /**
   * 切换选中状态
   */
  toggleSelect(data) {
    return http.patch('/cart/select', data)
  },
}

export default cartApi
