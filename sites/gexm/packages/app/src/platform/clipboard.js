/**
 * 平台剪贴板适配层
 * 统一封装 H5 / 小程序 / App 的剪贴板API差异
 *
 * @example
 * import { clipboard } from '@/platform';
 * await clipboard.setClipboardData('hello world');
 * const text = await clipboard.getClipboardData();
 */

/**
 * 设置剪贴板内容
 * @param {string} data - 要复制的文本内容
 * @returns {Promise<{ success: boolean, errMsg?: string }>}
 */
export function setClipboardData(data) {
  // #ifdef H5
  return navigator.clipboard
    .writeText(data)
    .then(() => ({ success: true }))
    .catch((err) => ({ success: false, errMsg: err.message }))
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    wx.setClipboardData({
      data,
      success: () => resolve({ success: true }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  // #ifdef MP-ALIPAY
  return new Promise((resolve) => {
    my.setClipboard({
      text: data,
      success: () => resolve({ success: true }),
      fail: (err) => resolve({ success: false, errMsg: err.errorMessage || err.message }),
    })
  })
  // #endif

  // #ifdef MP-BAIDU
  return new Promise((resolve) => {
    swan.setClipboardData({
      data,
      success: () => resolve({ success: true }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  // #ifdef MP-TOUTIAO
  return new Promise((resolve) => {
    tt.setClipboardData({
      data,
      success: () => resolve({ success: true }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve) => {
    uni.setClipboardData({
      data,
      success: () => resolve({ success: true }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  return Promise.resolve({ success: false, errMsg: 'clipboard not supported' })
}

/**
 * 获取剪贴板内容
 * @returns {Promise<{ success: boolean, data?: string, errMsg?: string }>}
 */
export function getClipboardData() {
  // #ifdef H5
  return navigator.clipboard
    .readText()
    .then((text) => ({ success: true, data: text }))
    .catch((err) => ({ success: false, errMsg: err.message }))
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    wx.getClipboardData({
      success: (res) => resolve({ success: true, data: res.data }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  // #ifdef MP-ALIPAY
  return new Promise((resolve) => {
    my.getClipboard({
      success: (res) => resolve({ success: true, data: res.text }),
      fail: (err) => resolve({ success: false, errMsg: err.errorMessage || err.message }),
    })
  })
  // #endif

  // #ifdef MP-BAIDU
  return new Promise((resolve) => {
    swan.getClipboardData({
      success: (res) => resolve({ success: true, data: res.data }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  // #ifdef MP-TOUTIAO
  return new Promise((resolve) => {
    tt.getClipboardData({
      success: (res) => resolve({ success: true, data: res.data }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve) => {
    uni.getClipboardData({
      success: (res) => resolve({ success: true, data: res.data }),
      fail: (err) => resolve({ success: false, errMsg: err.errMsg }),
    })
  })
  // #endif

  return Promise.resolve({ success: false, errMsg: 'clipboard not supported' })
}

/**
 * 剪贴板是否可用检测
 * @returns {boolean}
 */
export function isClipboardAvailable() {
  // #ifdef H5
  return !!navigator.clipboard
  // #endif

  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-HARMONY || APP-HARMONY
  return true
  // #endif

  return false
}

export default {
  setClipboardData,
  getClipboardData,
  isClipboardAvailable,
}
