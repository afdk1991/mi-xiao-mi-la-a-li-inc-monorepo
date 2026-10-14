// 从 @gexm/shared 导入可复用工具函数
import {
  formatDate,
  formatRelativeTime,
  generateId,
  debounce,
  throttle,
  deepClone,
  isValidEmail,
  isValidPhone,
  formatFileSize,
  sleep,
  formatPrice,
  formatNumber,
  getStatusLabel,
  getStatusColor,
  removeEmptyFields,
  generateOrderNo,
  getWeekDays,
  getMonthDays,
  isToday,
  isYesterday,
  generateRandomString,
  getPlatform,
  getPlatformInfo,
  isH5,
  isMp,
  isApp,
  isWeiXin,
  isAliPay,
} from '@gexm/shared'

// ==================== uni-app 特有存储实现 ====================

/**
 * uni-app 平台存储适配器
 * 封装 uni 的 storage API 以适配 shared 模块接口
 */
const uniStorage = {
  set(key, value) {
    try {
      uni.setStorageSync(key, JSON.stringify(value))
      return true
    } catch (e) {
      console.error('Storage set error:', e)
      return false
    }
  },

  get(key, defaultValue = null) {
    try {
      const value = uni.getStorageSync(key)
      return value ? JSON.parse(value) : defaultValue
    } catch (e) {
      console.error('Storage get error:', e)
      return defaultValue
    }
  },

  remove(key) {
    try {
      uni.removeStorageSync(key)
      return true
    } catch (e) {
      console.error('Storage remove error:', e)
      return false
    }
  },

  clear() {
    try {
      uni.clearStorageSync()
      return true
    } catch (e) {
      console.error('Storage clear error:', e)
      return false
    }
  },

  has(key) {
    try {
      return uni.getStorageInfoSync().keys.includes(key)
    } catch {
      return false
    }
  },

  keys() {
    try {
      return uni.getStorageInfoSync().keys || []
    } catch {
      return []
    }
  },

  size() {
    try {
      return uni.getStorageInfoSync().currentSize || 0
    } catch {
      return 0
    }
  },
}

// ==================== uni-app 特有工具函数 ====================

/**
 * 检查用户是否已登录
 */
export function checkAuth(redirect = true) {
  const userStore = require('@/store/user').useUserStore()
  if (!userStore.isLoggedIn) {
    if (redirect) {
      uni.navigateTo({ url: '/pages/login/login' })
    }
    return false
  }
  return true
}

/**
 * 检查用户是否为管理员
 */
export function checkAdmin(redirect = true) {
  const userStore = require('@/store/user').useUserStore()
  if (!userStore.isLoggedIn) {
    if (redirect) {
      uni.navigateTo({ url: '/pages/login/login' })
    }
    return false
  }
  if (userStore.role !== 'admin') {
    if (redirect) {
      uni.showToast({ title: '需要管理员权限', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
    return false
  }
  return true
}

// ==================== 导出所有工具函数 ====================

import * as responsive from './responsive'

export {
  // 从 shared 导入的工具函数
  formatDate,
  formatRelativeTime,
  generateId,
  debounce,
  throttle,
  deepClone,
  isValidEmail,
  isValidPhone,
  formatFileSize,
  sleep,
  formatPrice,
  formatNumber,
  getStatusLabel,
  getStatusColor,
  removeEmptyFields,
  generateOrderNo,
  getWeekDays,
  getMonthDays,
  isToday,
  isYesterday,
  generateRandomString,
  // 平台检测
  getPlatform,
  getPlatformInfo,
  isH5,
  isMp,
  isApp,
  isWeiXin,
  isAliPay,
  // 存储
  uniStorage as storage,
  // 响应式布局
  responsive,
}

// 默认导出统一的工具对象
export default {
  // 日期时间
  formatDate,
  formatRelativeTime,
  isToday,
  isYesterday,
  getWeekDays,
  getMonthDays,

  // 格式化
  formatPrice,
  formatNumber,
  formatFileSize,

  // 生成
  generateId,
  generateOrderNo,
  generateRandomString,

  // 函数工具
  debounce,
  throttle,
  deepClone,
  sleep,

  // 验证
  isValidEmail,
  isValidPhone,
  getStatusLabel,
  getStatusColor,
  removeEmptyFields,

  // 平台
  getPlatform,
  getPlatformInfo,
  isH5,
  isMp,
  isApp,
  isWeiXin,
  isAliPay,

  // 存储
  storage: uniStorage,

  // 权限
  checkAuth,
  checkAdmin,

  // 响应式布局
  responsive,
}
