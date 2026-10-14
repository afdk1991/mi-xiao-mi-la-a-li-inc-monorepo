/**
 * 订单相关API
 */
import http from './request'

const orderApi = {
  /**
   * 获取订单列表
   */
  getOrders(params = {}) {
    return http.get('/orders', params)
  },

  /**
   * 获取订单详情
   */
  getOrderDetail(orderId) {
    return http.get(`/orders/${orderId}`)
  },

  /**
   * 订单预览
   */
  previewOrder(data) {
    return http.post('/orders/preview', data)
  },

  /**
   * 创建订单
   */
  createOrder(data) {
    return http.post('/orders', data)
  },

  /**
   * 取消订单
   */
  cancelOrder(orderId) {
    return http.patch(`/orders/${orderId}/cancel`)
  },

  /**
   * 确认收货
   */
  confirmOrder(orderId) {
    return http.patch(`/orders/${orderId}/confirm`)
  },

  /**
   * 获取物流信息
   */
  getLogistics(orderId) {
    return http.get(`/orders/${orderId}/logistics`)
  },

  /**
   * 申请退款
   */
  applyRefund(orderId, data) {
    return http.post(`/orders/${orderId}/refund/apply`, data)
  },

  /**
   * 再次购买
   */
  buyAgain(orderId) {
    return http.post(`/orders/${orderId}/buy-again`)
  },
}

export default orderApi
