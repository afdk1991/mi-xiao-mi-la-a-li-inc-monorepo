/**
 * API 平台差异化配置
 *
 * 用于配置不同平台的 API 端点、请求超时、缓存策略等差异
 *
 * @example
 * import { apiPlatformConfig } from './platform-config';
 * const baseUrl = apiPlatformConfig.getBaseUrl();
 */

import { getPlatform } from '@/utils'

/**
 * 平台配置
 */
export const apiPlatformConfig = {
  /**
   * 获取当前平台
   */
  platform: getPlatform(),

  /**
   * 获取 API 基础地址
   * 不同平台可能需要不同的 API 地址
   */
  getBaseUrl() {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

    // #ifdef H5
    // H5 使用相对路径或配置的后端地址
    return baseUrl
    // #endif

    // #ifdef MP-WEIXIN
    // 小程序可以使用云开发或配置的后端地址
    return baseUrl
    // #endif

    // #ifdef APP-PLUS
    // App 可以直接使用本地地址或配置的后端地址
    return baseUrl
    // #endif

    return baseUrl
  },

  /**
   * 获取请求超时时间（毫秒）
   */
  getTimeout() {
    // #ifdef H5
    return 30000
    // #endif
    // #ifdef MP-WEIXIN
    return 60000 // 小程序网络可能不稳定
    // #endif
    // #ifdef APP-PLUS
    return 45000
    // #endif
    return 30000
  },

  /**
   * 是否显示加载提示
   */
  shouldShowLoading() {
    // #ifdef H5
    return true
    // #endif
    // #ifdef MP-WEIXIN
    return true
    // #endif
    // #ifdef APP-PLUS
    return true
    // #endif
    return true
  },

  /**
   * 获取错误提示方式
   */
  getErrorDisplayMethod() {
    // #ifdef H5
    return 'toast' // toast 或 console
    // #endif
    // #ifdef MP-WEIXIN
    return 'toast'
    // #endif
    // #ifdef APP-PLUS
    return 'toast'
    // #endif
    return 'toast'
  },

  /**
   * 是否启用请求缓存
   */
  isRequestCacheEnabled() {
    // #ifdef H5
    return false // H5 可使用 Service Worker 缓存
    // #endif
    // #ifdef MP-WEIXIN
    return true // 小程序有 storage 缓存
    // #endif
    // #ifdef APP-PLUS
    return true
    // #endif
    return false
  },

  /**
   * 认证失败处理
   */
  handleAuthFailure() {
    // #ifdef H5
    // H5 跳转登录页
    uni.reLaunch({ url: '/pages/login/login' })
    // #endif

    // #ifdef MP-WEIXIN
    // 小程序跳转登录页
    uni.reLaunch({ url: '/pages/login/login' })
    // #endif

    // #ifdef APP-PLUS
    // App 跳转登录页
    uni.reLaunch({ url: '/pages/login/login' })
    // #endif
  },

  /**
   * 获取平台特定请求头
   */
  getPlatformHeaders() {
    // #ifdef H5
    return {
      'X-Platform': 'h5',
      'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    }
    // #endif

    // #ifdef MP-WEIXIN
    return {
      'X-Platform': 'mp-weixin',
      'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    }
    // #endif

    // #ifdef MP-ALIPAY
    return {
      'X-Platform': 'mp-alipay',
      'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    }
    // #endif

    // #ifdef APP-PLUS
    // 获取 App 版本信息
    let appVersion = '1.0.0'
    // #ifdef APP-PLUS
    if (plus.runtime && plus.runtime.version) {
      appVersion = plus.runtime.version
    }
    // #endif
    return {
      'X-Platform': 'app-plus',
      'X-App-Version': appVersion,
      'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    }
    // #endif

    return {
      'X-Platform': 'unknown',
    }
  },
}

/**
 * 检查是否需要刷新 Token
 */
export function shouldRefreshToken(errorCode) {
  // 常见的 Token 过期错误码
  const tokenExpiredCodes = [401, 1007, 1008, 'TOKEN_EXPIRED', 'INVALID_TOKEN']

  // #ifdef MP-WEIXIN
  // 小程序特定错误码
  return tokenExpiredCodes.includes(errorCode) || errorCode === -1
  // #endif

  return tokenExpiredCodes.includes(errorCode)
}

/**
 * 获取重试策略
 */
export function getRetryStrategy() {
  // #ifdef H5
  return {
    maxRetries: 2,
    retryDelay: 1000,
    retryOn: [0, 1, 2], // 网络错误码
  }
  // #endif

  // #ifdef MP-WEIXIN
  return {
    maxRetries: 3,
    retryDelay: 1500,
    retryOn: [-1], // 小程序错误码
  }
  // #endif

  // #ifdef APP-PLUS
  return {
    maxRetries: 2,
    retryDelay: 1000,
    retryOn: [-1],
  }
  // #endif

  return {
    maxRetries: 1,
    retryDelay: 1000,
    retryOn: [],
  }
}

export default apiPlatformConfig
