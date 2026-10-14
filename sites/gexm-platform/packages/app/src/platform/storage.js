/**
 * 平台存储适配层
 * 统一封装 localStorage / uni.storage / wx.storage / plus.storage 的差异
 *
 * @example
 * import { storage } from '@/platform';
 * storage.set('key', { name: 'test' });
 * const data = storage.get('key');
 */

/**
 * 获取平台存储API
 */
function getStorageAdapter() {
  // #ifdef H5
  return {
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (e) {
        console.error('[Storage] H5 set error:', e)
        return false
      }
    },
    get: (key, defaultValue = null) => {
      try {
        const value = localStorage.getItem(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.error('[Storage] H5 get error:', e)
        return defaultValue
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem(key)
        return true
      } catch (e) {
        console.error('[Storage] H5 remove error:', e)
        return false
      }
    },
    clear: () => {
      try {
        localStorage.clear()
        return true
      } catch (e) {
        console.error('[Storage] H5 clear error:', e)
        return false
      }
    },
  }
  // #endif

  // #ifdef MP-WEIXIN
  return {
    set: (key, value) => {
      try {
        wx.setStorageSync(key, JSON.stringify(value))
        return true
      } catch (e) {
        console.error('[Storage] wx set error:', e)
        return false
      }
    },
    get: (key, defaultValue = null) => {
      try {
        const value = wx.getStorageSync(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.error('[Storage] wx get error:', e)
        return defaultValue
      }
    },
    remove: (key) => {
      try {
        wx.removeStorageSync(key)
        return true
      } catch (e) {
        console.error('[Storage] wx remove error:', e)
        return false
      }
    },
    clear: () => {
      try {
        wx.clearStorageSync()
        return true
      } catch (e) {
        console.error('[Storage] wx clear error:', e)
        return false
      }
    },
  }
  // #endif

  // #ifdef MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  return {
    set: (key, value) => {
      try {
        uni.setStorageSync(key, JSON.stringify(value))
        return true
      } catch (e) {
        console.error('[Storage] uni set error:', e)
        return false
      }
    },
    get: (key, defaultValue = null) => {
      try {
        const value = uni.getStorageSync(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.error('[Storage] uni get error:', e)
        return defaultValue
      }
    },
    remove: (key) => {
      try {
        uni.removeStorageSync(key)
        return true
      } catch (e) {
        console.error('[Storage] uni remove error:', e)
        return false
      }
    },
    clear: () => {
      try {
        uni.clearStorageSync()
        return true
      } catch (e) {
        console.error('[Storage] uni clear error:', e)
        return false
      }
    },
  }
  // #endif

  // #ifdef APP-PLUS
  return {
    set: (key, value) => {
      try {
        plus.storage.setItem(key, JSON.stringify(value))
        return true
      } catch (e) {
        console.error('[Storage] plus set error:', e)
        return false
      }
    },
    get: (key, defaultValue = null) => {
      try {
        const value = plus.storage.getItem(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.error('[Storage] plus get error:', e)
        return defaultValue
      }
    },
    remove: (key) => {
      try {
        plus.storage.removeItem(key)
        return true
      } catch (e) {
        console.error('[Storage] plus remove error:', e)
        return false
      }
    },
    clear: () => {
      try {
        plus.storage.clear()
        return true
      } catch (e) {
        console.error('[Storage] plus clear error:', e)
        return false
      }
    },
  }
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  const MAX_STORAGE_SIZE = 10 * 1024 * 1024

  function checkStorageLimit() {
    try {
      const info = uni.getStorageInfoSync()
      const usagePercent = (info.currentSize / MAX_STORAGE_SIZE) * 100
      if (usagePercent > 80) {
        console.warn(`[Storage] High storage usage: ${usagePercent.toFixed(1)}%`)
        return false
      }
      return true
    } catch (e) {
      console.error('[Storage] Failed to check storage limit:', e)
      return false
    }
  }

  return {
    set: (key, value) => {
      try {
        if (!checkStorageLimit()) {
          console.warn('[Storage] Storage limit exceeded, skipping set')
          return false
        }
        uni.setStorageSync(key, JSON.stringify(value))
        return true
      } catch (e) {
        console.error('[Storage] HarmonyOS set error:', e)
        return false
      }
    },
    get: (key, defaultValue = null) => {
      try {
        const value = uni.getStorageSync(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.error('[Storage] HarmonyOS get error:', e)
        return defaultValue
      }
    },
    remove: (key) => {
      try {
        uni.removeStorageSync(key)
        return true
      } catch (e) {
        console.error('[Storage] HarmonyOS remove error:', e)
        return false
      }
    },
    clear: () => {
      try {
        uni.clearStorageSync()
        return true
      } catch (e) {
        console.error('[Storage] HarmonyOS clear error:', e)
        return false
      }
    },
  }
  // #endif

  // #ifdef H5
  // H5 fallback - 使用 uni API
  // #endif
  return {
    set: (key, value) => {
      try {
        uni.setStorageSync(key, JSON.stringify(value))
        return true
      } catch (e) {
        console.error('[Storage] fallback set error:', e)
        return false
      }
    },
    get: (key, defaultValue = null) => {
      try {
        const value = uni.getStorageSync(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.error('[Storage] fallback get error:', e)
        return defaultValue
      }
    },
    remove: (key) => {
      try {
        uni.removeStorageSync(key)
        return true
      } catch (e) {
        console.error('[Storage] fallback remove error:', e)
        return false
      }
    },
    clear: () => {
      try {
        uni.clearStorageSync()
        return true
      } catch (e) {
        console.error('[Storage] fallback clear error:', e)
        return false
      }
    },
  }
}

export const storage = getStorageAdapter()

/**
 * 异步存储操作（部分平台支持）
 */
export const storageAsync = {
  set: (key, value) => {
    // #ifdef H5
    return Promise.resolve(storage.set(key, value))
    // #endif

    // #ifndef H5
    return new Promise((resolve, reject) => {
      uni.setStorage({
        key,
        data: JSON.stringify(value),
        success: () => resolve(true),
        fail: (err) => {
          console.error('[Storage] async set error:', err)
          reject(err)
        },
      })
    })
    // #endif
  },

  get: (key, defaultValue = null) => {
    // #ifdef H5
    return Promise.resolve(storage.get(key, defaultValue))
    // #endif

    // #ifndef H5
    return new Promise((resolve, reject) => {
      uni.getStorage({
        key,
        success: (res) => {
          try {
            resolve(JSON.parse(res.data) || defaultValue)
          } catch {
            resolve(defaultValue)
          }
        },
        fail: (err) => {
          console.error('[Storage] async get error:', err)
          resolve(defaultValue)
        },
      })
    })
    // #endif
  },
}

export default storage
