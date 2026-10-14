import { useUserStore } from '../store/user'
import { useAppStore } from '../store/app'

let BASE_URL = '/api'

// #ifdef H5
BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
// #endif

// #ifdef MP-WEIXIN
BASE_URL = import.meta.env.VITE_API_BASE_URL_MP || 'http://localhost:3000/api'
// #endif

// #ifdef MP-ALIPAY
BASE_URL = import.meta.env.VITE_API_BASE_URL_MP || 'http://localhost:3000/api'
// #endif

let isRefreshing = false
let requestQueue = []

function getCsrfToken() {
  // #ifdef H5
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') {
      return decodeURIComponent(value)
    }
  }
  // #endif
  return ''
}

function getToken() {
  const userStore = useUserStore()
  return userStore.token || uni.getStorageSync('gexm_access_token')
}

function getRefreshToken() {
  const userStore = useUserStore()
  return userStore.refreshToken || uni.getStorageSync('gexm_refresh_token')
}

function refreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token'))
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json' },
      timeout: 10000,
      success: (res) => {
        const response = res.data
        if (res.statusCode === 200 && response.code === 0) {
          const { accessToken, refreshToken: newRefreshToken } = response.data
          const userStore = useUserStore()
          userStore.setToken(accessToken, newRefreshToken)
          resolve({ accessToken, newRefreshToken })
        } else {
          reject(new Error(response.message || 'Token refresh failed'))
        }
      },
      fail: () => {
        reject(new Error('Network error during token refresh'))
      },
    })
  })
}

function runQueue(token) {
  requestQueue.forEach((callback) => callback(token))
  requestQueue = []
}

function handleTokenExpired() {
  const userStore = useUserStore()
  userStore.logout()
  uni.reLaunch({ url: '/pages/login/login' })
}

const request = (options) => {
  const userStore = useUserStore()
  const appStore = useAppStore()

  return new Promise((resolve, reject) => {
    const header = {
      'Content-Type': 'application/json',
      ...options.header,
    }

    const token = getToken()
    if (token) {
      header.Authorization = `Bearer ${token}`
    }

    const method = (options.method || 'GET').toUpperCase()
    const csrfToken = getCsrfToken()
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      header['X-CSRF-Token'] = csrfToken
    }

    const showLoading = options.loading !== false
    if (showLoading) {
      appStore.showLoading(options.loadingText || '加载中...')
    }

    const retryRequest = () => {
      const newToken = getToken()
      if (newToken) {
        header.Authorization = `Bearer ${newToken}`
      }
      executeRequest()
    }

    const executeRequest = () => {
      uni.request({
        url: BASE_URL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header,
        timeout: options.timeout || 30000,
        success: (res) => {
          const response = res.data

          if (res.statusCode === 200) {
            if (response.code === 0) {
              resolve(response.data)
            } else if (response.code === 1007 || response.code === 1008) {
              if (options._retry) {
                handleTokenExpired()
                reject(response)
                return
              }

              if (!isRefreshing) {
                isRefreshing = true
                refreshToken()
                  .then(() => {
                    isRefreshing = false
                    runQueue(getToken())
                  })
                  .catch(() => {
                    isRefreshing = false
                    handleTokenExpired()
                    runQueue(null)
                  })
              }

              requestQueue.push((newToken) => {
                if (newToken) {
                  options._retry = true
                  retryRequest()
                } else {
                  reject(response)
                }
              })
            } else {
              if (options.showError !== false) {
                uni.showToast({
                  title: response.message || '请求失败',
                  icon: 'none',
                })
              }
              reject(response)
            }
          } else if (res.statusCode === 403 && response?.code === 6003) {
            if (options.showError !== false) {
              uni.showToast({
                title: '安全验证失败，请刷新页面重试',
                icon: 'none',
              })
            }
            reject(res)
          } else if (res.statusCode === 401) {
            if (!options._retry && response?.code === 1007) {
              if (!isRefreshing) {
                isRefreshing = true
                refreshToken()
                  .then(() => {
                    isRefreshing = false
                    runQueue(getToken())
                  })
                  .catch(() => {
                    isRefreshing = false
                    handleTokenExpired()
                    runQueue(null)
                  })
              }

              requestQueue.push((newToken) => {
                if (newToken) {
                  options._retry = true
                  retryRequest()
                } else {
                  reject(res)
                }
              })
            } else {
              handleTokenExpired()
              reject(res)
            }
          } else {
            if (options.showError !== false) {
              uni.showToast({
                title: `请求错误: ${res.statusCode}`,
                icon: 'none',
              })
            }
            reject(res)
          }
        },
        fail: (err) => {
          if (!appStore.isOnline) {
            uni.showToast({
              title: '网络连接不可用',
              icon: 'none',
            })
          } else if (options.showError !== false) {
            uni.showToast({
              title: '网络请求失败',
              icon: 'none',
            })
          }
          reject(err)
        },
        complete: () => {
          if (showLoading) {
            appStore.hideLoading()
          }
        },
      })
    }

    executeRequest()
  })
}

export const http = {
  get: (url, data = {}, options = {}) => {
    return request({ url, method: 'GET', data, ...options })
  },
  post: (url, data = {}, options = {}) => {
    return request({ url, method: 'POST', data, ...options })
  },
  put: (url, data = {}, options = {}) => {
    return request({ url, method: 'PUT', data, ...options })
  },
  delete: (url, data = {}, options = {}) => {
    return request({ url, method: 'DELETE', data, ...options })
  },
}

export default http