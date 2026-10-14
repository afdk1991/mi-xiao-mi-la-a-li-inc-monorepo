/**
 * 平台错误监听适配层
 * 统一封装各平台的全局错误监听API
 */

/**
 * 设置全局错误监听
 * @param {Function} callback - 错误回调函数
 */
export function onGlobalError(callback) {
  // #ifdef H5
  window.addEventListener('error', (event) => {
    callback({
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineNo: event.lineno,
      columnNo: event.colno,
    })
  })
  // #endif

  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.onError) {
    wx.onError((error) => {
      callback({
        message: error.message || String(error),
        stack: error.stack,
      })
    })
  }
  // #endif

  // #ifdef MP-ALIPAY
  if (typeof my !== 'undefined' && my.onError) {
    my.onError((error) => {
      callback({
        message: error.message || String(error),
        stack: error.stack,
      })
    })
  }
  // #endif

  // #ifdef MP-BAIDU
  if (typeof swan !== 'undefined' && swan.onError) {
    swan.onError((error) => {
      callback({
        message: error.message || String(error),
        stack: error.stack,
      })
    })
  }
  // #endif

  // #ifdef MP-TOUTIAO
  if (typeof tt !== 'undefined' && tt.onError) {
    tt.onError((error) => {
      callback({
        message: error.message || String(error),
        stack: error.stack,
      })
    })
  }
  // #endif

  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.runtime) {
    plus.runtime.error = (error) => {
      callback({
        message: error.message || String(error),
        stack: error.stack,
      })
    }
  }
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  if (typeof uni !== 'undefined' && uni.onError) {
    uni.onError((error) => {
      callback({
        message: error.message || String(error),
        stack: error.stack,
      })
    })
  }
  // #endif
}

/**
 * 设置未处理Promise拒绝监听
 * @param {Function} callback - 错误回调函数
 */
export function onUnhandledRejection(callback) {
  // #ifdef H5
  window.addEventListener('unhandledrejection', (event) => {
    callback({
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    })
  })
  // #endif

  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.onUnhandledRejection) {
    wx.onUnhandledRejection((error) => {
      callback({
        message: error.reason?.message || String(error.reason),
        stack: error.reason?.stack,
      })
    })
  }
  // #endif
}

export default {
  onGlobalError,
  onUnhandledRejection,
}
