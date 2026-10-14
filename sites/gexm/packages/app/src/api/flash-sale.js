import http from './request'

export const flashSaleApi = {
  getActiveSales() {
    return http.get('/flash-sales/active')
  },

  getSaleDetail(id) {
    return http.get(`/flash-sales/${id}/items`)
  },

  getSaleProducts(id, params = {}) {
    return http.get(`/flash-sales/${id}/items`, params)
  },

  getProductDetail(id) {
    return http.get(`/flash-sales/products/${id}`)
  },

  joinFlashSale(productId, quantity = 1) {
    return http.post('/flash-sales/join', { productId, quantity })
  },

  getFlashSaleStatus(id) {
    return http.get(`/flash-sales/${id}/status`, {}, { loading: false })
  },

  getUserOrders(params = {}) {
    return http.get('/flash-sales/my-orders', params)
  },

  cancelOrder(orderId) {
    return http.post(`/flash-sales/my-orders/${orderId}/cancel`)
  },
}

export default flashSaleApi
