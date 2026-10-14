/**
 * 支付相关API
 *
 * 跨平台支付模块，提供统一的支付接口
 * 各平台支付实现细节由 @/platform/payment 封装
 */
import http from './request'
import { requestPayment, isPaymentAvailable } from '@/platform/payment'
import { getPlatform } from '@/utils'

const paymentApi = {
  /**
   * 发起支付
   * @param {Object} data - 支付参数
   * @param {string} data.orderId - 订单ID
   * @param {string} data.payChannel - 支付渠道 wxpay/alipay/h5pay
   */
  async pay(data) {
    // 先获取支付参数
    const paymentData = await http.post('/payment/pay', data)

    // 根据平台和支付渠道选择合适的支付方式
    const platform = getPlatform()
    let payChannel = data.payChannel || 'wxpay'

    // 自动检测可用支付渠道
    if (!payChannel || payChannel === 'auto') {
      if (platform === 'mp-weixin') {
        payChannel = 'wxpay'
      } else if (platform === 'mp-alipay') {
        payChannel = 'alipay'
      } else if (platform === 'h5') {
        // H5 优先微信H5支付
        payChannel = 'wxpay'
      } else if (platform === 'app-plus') {
        payChannel = data.provider || 'wxpay'
      }
    }

    // 调用平台支付适配
    try {
      await requestPayment({
        orderId: data.orderId,
        payChannel,
        paymentData,
      })
      return { success: true, message: '支付成功' }
    } catch (error) {
      // 支付失败或取消
      return { success: false, message: error.message || '支付失败' }
    }
  },

  /**
   * 检查支付功能是否可用
   * @param {string} payChannel - 支付渠道
   */
  checkPaymentAvailable(payChannel = 'wxpay') {
    return isPaymentAvailable(payChannel)
  },

  /**
   * 查询支付状态
   */
  getPaymentStatus(orderId) {
    return http.get(`/payment/${orderId}/status`)
  },

  /**
   * 查询支付状态（新接口）
   */
  queryPayment(orderId) {
    return http.get(`/payment/${orderId}/query`)
  },

  /**
   * 关闭支付
   */
  closePayment(orderId) {
    return http.post(`/payment/${orderId}/close`)
  },

  /**
   * 获取支付结果（轮询）
   * @param {string} orderId - 订单ID
   * @param {number} maxAttempts - 最大轮询次数
   * @param {number} interval - 轮询间隔（毫秒）
   */
  async waitForPaymentResult(orderId, maxAttempts = 10, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval))
      try {
        const result = await this.queryPayment(orderId)
        if (result.status === 'paid' || result.status === 'success') {
          return { success: true, status: result.status, data: result }
        }
      } catch (e) {
        console.warn('[Payment] Query attempt', i + 1, 'failed:', e)
      }
    }
    return { success: false, message: '支付状态查询超时' }
  },
}

export default paymentApi
