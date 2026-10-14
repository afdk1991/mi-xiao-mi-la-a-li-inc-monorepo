/**
 * 平台支付适配层
 * 统一封装 H5支付 / 小程序支付 / App支付的差异
 *
 * @example
 * import { payment } from '@/platform';
 * await payment.requestPayment({ orderId: 'xxx', amount: 100 });
 */

/**
 * 支付结果回调处理
 */
const paymentResult = {
  success: false,
  errMsg: '',
}

// #ifdef MP-HARMONY || APP-HARMONY
const HARMONY_PAYMENT_CHANNELS = {
  wxpay: {
    supported: true,
    provider: 'wxpay',
    merchantId: '__UNI__GEXM_HARMONY_WX',
  },
  alipay: {
    supported: true,
    provider: 'alipay',
    merchantId: '__UNI__GEXM_HARMONY_ALIPAY',
  },
}

function validateHarmonyPaymentChannel(payChannel) {
  const channel = HARMONY_PAYMENT_CHANNELS[payChannel]
  if (!channel || !channel.supported) {
    throw new Error(`Payment channel ${payChannel} not supported on HarmonyOS`)
  }
  return channel
}
// #endif

/**
 * 微信小程序支付
 */
function weixinPay(paymentData) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.requestPayment({
      timeStamp: paymentData.timeStamp,
      nonceStr: paymentData.nonceStr,
      package: paymentData.package,
      signType: paymentData.signType || 'MD5',
      paySign: paymentData.paySign,
      success: (res) => {
        paymentResult.success = true
        paymentResult.errMsg = res.errMsg || 'requestPayment:ok'
        resolve({ ...paymentResult })
      },
      fail: (err) => {
        paymentResult.success = false
        paymentResult.errMsg = err.errMsg || 'requestPayment:fail'
        reject(new Error(paymentResult.errMsg))
      },
    })
    // #endif

    // #ifndef MP-WEIXIN
    reject(new Error('微信支付仅支持小程序环境'))
    // #endif
  })
}

/**
 * 支付宝小程序支付
 */
function alipayPay(paymentData) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-ALIPAY
    my.tradePay({
      tradeNO: paymentData.tradeNO,
      success: (res) => {
        paymentResult.success = res.resultCode === '9000'
        paymentResult.errMsg = res.resultCode
        if (paymentResult.success) {
          resolve({ ...paymentResult })
        } else {
          reject(new Error(`支付宝支付失败: ${res.resultCode}`))
        }
      },
      fail: (err) => {
        paymentResult.success = false
        paymentResult.errMsg = err.errorMessage || err.message || 'pay failed'
        reject(new Error(paymentResult.errMsg))
      },
    })
    // #endif

    // #ifndef MP-ALIPAY
    reject(new Error('支付宝支付仅支持支付宝小程序环境'))
    // #endif
  })
}

/**
 * App端支付（uni-app原生能力）
 */
function appPay(paymentData) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    uni.requestPayment({
      provider: paymentData.provider || 'wxpay',
      orderInfo: paymentData.orderInfo || paymentData,
      success: (res) => {
        paymentResult.success = true
        paymentResult.errMsg = res.errMsg || 'payment success'
        resolve({ ...paymentResult })
      },
      fail: (err) => {
        paymentResult.success = false
        paymentResult.errMsg = err.errMsg || 'payment failed'
        reject(new Error(paymentResult.errMsg))
      },
    })
    // #endif

    // #ifndef APP-PLUS
    // #ifdef MP-HARMONY || APP-HARMONY
    try {
      const channel = validateHarmonyPaymentChannel(paymentData.provider || 'wxpay')
      uni.requestPayment({
        provider: channel.provider,
        orderInfo: paymentData.orderInfo || paymentData,
        success: (res) => {
          paymentResult.success = true
          paymentResult.errMsg = res.errMsg || 'payment success'
          resolve({ ...paymentResult })
        },
        fail: (err) => {
          paymentResult.success = false
          paymentResult.errMsg = err.errMsg || 'payment failed'
          reject(new Error(paymentResult.errMsg))
        },
      })
    } catch (e) {
      reject(e)
    }
    // #endif

    // #ifndef MP-HARMONY || APP-HARMONY
    reject(new Error('App支付仅支持App环境'))
    // #endif
    // #endif
  })
}

/**
 * H5支付（跳转支付页面或唤起App）
 */
function h5Pay(paymentData) {
  // #ifdef H5 || MP-BAIDU || MP-TOUTIAO
  return new Promise((resolve, reject) => {
    if (paymentData.payUrl) {
      // #ifdef H5
      window.location.href = paymentData.payUrl
      setTimeout(() => {
        resolve({ success: true, errMsg: 'h5_pay_redirect' })
      }, 100)
      // #endif

      // #ifdef MP-BAIDU
      swan.openUrl({ url: paymentData.payUrl })
      setTimeout(() => {
        resolve({ success: true, errMsg: 'baidu_pay_redirect' })
      }, 100)
      // #endif

      // #ifdef MP-TOUTIAO
      tt.openUrl({ url: paymentData.payUrl })
      setTimeout(() => {
        resolve({ success: true, errMsg: 'toutiao_pay_redirect' })
      }, 100)
      // #endif
    } else if (paymentData.qrCode) {
      resolve({ success: true, qrCode: paymentData.qrCode, errMsg: 'h5_pay_qrcode' })
    } else {
      reject(new Error('支付参数错误'))
    }
  })
  // #endif

  // #ifndef H5 || MP-BAIDU || MP-TOUTIAO
  return Promise.reject(new Error('支付仅支持H5/百度/头条环境'))
  // #endif
}

/**
 * 统一支付请求接口
 * @param {Object} options - 支付参数
 * @param {string} options.orderId - 订单ID
 * @param {string} options.payChannel - 支付渠道：wxpay/alipay/h5pay
 * @param {Object} options.paymentData - 平台特定支付数据
 */
export function requestPayment(options) {
  const { payChannel = 'wxpay', paymentData } = options

  switch (payChannel) {
    case 'wxpay':
      // #ifdef MP-WEIXIN
      return weixinPay(paymentData)
      // #endif
      // #ifdef APP-PLUS
      return appPay({ ...paymentData, provider: 'wxpay' })
      // #endif
      // #ifdef MP-HARMONY || APP-HARMONY
      return appPay({ ...paymentData, provider: 'wxpay' })
      // #endif
      // #ifdef H5 || MP-BAIDU || MP-TOUTIAO
      return h5Pay(paymentData)
      // #endif
      return Promise.reject(new Error('当前环境不支持微信支付'))

    case 'alipay':
      // #ifdef MP-ALIPAY
      return alipayPay(paymentData)
      // #endif
      // #ifdef APP-PLUS
      return appPay({ ...paymentData, provider: 'alipay' })
      // #endif
      // #ifdef MP-HARMONY || APP-HARMONY
      return appPay({ ...paymentData, provider: 'alipay' })
      // #endif
      // #ifdef H5 || MP-BAIDU || MP-TOUTIAO
      return h5Pay(paymentData)
      // #endif
      return Promise.reject(new Error('当前环境不支持支付宝支付'))

    case 'h5pay':
      return h5Pay(paymentData)

    default:
      return Promise.reject(new Error(`不支持的支付渠道: ${payChannel}`))
  }
}

/**
 * 支付是否可用检测
 */
export function isPaymentAvailable(payChannel = 'wxpay') {
  // #ifdef H5 || MP-BAIDU || MP-TOUTIAO
  return true
  // #endif

  // #ifdef MP-WEIXIN
  return payChannel === 'wxpay'
  // #endif

  // #ifdef MP-ALIPAY
  return payChannel === 'alipay'
  // #endif

  // #ifdef APP-PLUS
  return true
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return true
  // #endif

  return false
}

export default {
  requestPayment,
  isPaymentAvailable,
}
