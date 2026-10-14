import request from './request'

export const adminApi = {
  getProducts(params = {}) {
    return request.get('/admin/products', { params })
  },

  getProductDetail(id) {
    return request.get(`/admin/products/${id}`)
  },

  createProduct(data) {
    return request.post('/admin/products', data)
  },

  updateProduct(id, data) {
    return request.put(`/admin/products/${id}`, data)
  },

  deleteProduct(id) {
    return request.delete(`/admin/products/${id}`)
  },

  updateProductStatus(id, status) {
    return request.patch(`/admin/products/${id}/status`, { status })
  },

  batchUpdateProductStatus(ids, status) {
    return request.post('/admin/products/batch/status', { ids, status })
  },

  batchDeleteProducts(ids) {
    return request.post('/admin/products/batch/delete', { ids })
  },

  getOrders(params = {}) {
    return request.get('/admin/orders', { params })
  },

  getOrderDetail(id) {
    return request.get(`/admin/orders/${id}`)
  },

  updateOrderStatus(id, status, remark = '') {
    return request.patch(`/admin/orders/${id}/status`, { status, remark })
  },

  batchUpdateOrderStatus(ids, status, remark = '') {
    return request.post('/admin/orders/batch/status', { ids, status, remark })
  },

  getOrderStatistics(params = {}) {
    return request.get('/admin/orders/statistics', { params })
  },

  getCategories() {
    return request.get('/admin/categories')
  },
}

export default adminApi
