/**
 * 地址相关API
 */
import http from './request'

const addressApi = {
  /**
   * 获取地址列表
   */
  getAddresses() {
    return http.get('/addresses')
  },

  /**
   * 获取默认地址
   */
  getDefaultAddress() {
    return http.get('/addresses/default')
  },

  /**
   * 获取地址详情
   */
  getAddressDetail(addressId) {
    return http.get(`/addresses/${addressId}`)
  },

  /**
   * 新增地址
   */
  createAddress(data) {
    return http.post('/addresses', data)
  },

  /**
   * 更新地址
   */
  updateAddress(addressId, data) {
    return http.put(`/addresses/${addressId}`, data)
  },

  /**
   * 删除地址
   */
  deleteAddress(addressId) {
    return http.delete(`/addresses/${addressId}`)
  },

  /**
   * 设为默认地址
   */
  setDefaultAddress(addressId) {
    return http.patch(`/addresses/${addressId}/default`)
  },
}

export default addressApi
