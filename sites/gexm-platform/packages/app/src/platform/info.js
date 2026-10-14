/**
 * 平台信息适配层
 * 统一封装各平台的应用信息获取API
 */

/**
 * 获取应用版本信息
 * @returns {string} 应用版本号
 */
export function getAppVersion() {
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.getAccountInfoSync) {
    const accountInfo = wx.getAccountInfoSync()
    return accountInfo.miniProgram?.version || '1.0.0'
  }
  // #endif

  // #ifdef MP-ALIPAY
  if (typeof my !== 'undefined' && my.getSystemInfoSync) {
    const info = my.getSystemInfoSync()
    return info.appVersion || '1.0.0'
  }
  // #endif

  // #ifdef MP-BAIDU
  if (typeof swan !== 'undefined' && swan.getSystemInfoSync) {
    const info = swan.getSystemInfoSync()
    return info.version || '1.0.0'
  }
  // #endif

  // #ifdef MP-TOUTIAO
  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    const info = tt.getSystemInfoSync()
    return info.appVersion || '1.0.0'
  }
  // #endif

  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.version) {
    return plus.runtime.version
  }
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  if (typeof uni !== 'undefined') {
    try {
      const info = uni.getSystemInfoSync()
      return info.appVersion || '1.0.0'
    } catch (e) {
      return '1.0.0'
    }
  }
  // #endif

  return '1.0.0'
}

/**
 * 获取小程序账号信息（仅小程序环境）
 * @returns {Object|null} 账号信息
 */
export function getAccountInfo() {
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.getAccountInfoSync) {
    return wx.getAccountInfoSync()
  }
  // #endif

  // #ifdef MP-ALIPAY
  if (typeof my !== 'undefined') {
    return {
      miniProgram: {
        appId: my.getAppId?.() || '',
      },
    }
  }
  // #endif

  // #ifdef MP-BAIDU
  if (typeof swan !== 'undefined') {
    return {
      miniProgram: {
        appId: swan.getAppId?.() || '',
      },
    }
  }
  // #endif

  // #ifdef MP-TOUTIAO
  if (typeof tt !== 'undefined') {
    return {
      miniProgram: {
        appId: tt.getAppId?.() || '',
      },
    }
  }
  // #endif

  // #ifdef MP-HARMONY
  if (typeof uni !== 'undefined') {
    try {
      return uni.getAccountInfoSync?.() || { miniProgram: { appId: '' } }
    } catch (e) {
      return { miniProgram: { appId: '' } }
    }
  }
  // #endif

  return null
}

export default {
  getAppVersion,
  getAccountInfo,
}
