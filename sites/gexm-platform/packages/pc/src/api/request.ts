import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

let isRefreshing = false
let requestQueue: ((token: string | null) => void)[] = []

function getCookie(name: string): string {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
  return ''
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

function getRefreshToken(): string {
  const userStore = useUserStore()
  return userStore.refreshToken || ''
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase())
}

function transformKeys(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item))
  }
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = transformKeys((obj as Record<string, unknown>)[key])
  }
  return result
}

async function refreshToken(): Promise<string> {
  const refreshTokenValue = getRefreshToken()
  if (!refreshTokenValue) {
    throw new Error('No refresh token')
  }

  const response = await axiosInstance.post('/auth/refresh', {
    refreshToken: refreshTokenValue,
  })

  if (response.data.code === 0) {
    const { accessToken, refreshToken: newRefreshToken } = response.data.data
    const userStore = useUserStore()
    userStore.setToken(accessToken, newRefreshToken)
    return accessToken
  }

  throw new Error('Token refresh failed')
}

function runQueue(token: string | null): void {
  requestQueue.forEach((callback) => callback(token))
  requestQueue = []
}

function handleTokenExpired(): void {
  const userStore = useUserStore()
  userStore.logout()
  ElMessage.error('登录已过期，请重新登录')
  window.location.href = '/login'
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore()
    const token = userStore.token || ''
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const csrfToken = getCookie('csrf-token')
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data

    if (data.code === 0) {
      response.data = transformKeys(data.data)
      return response
    } else if (data.code === 1007 || data.code === 1008) {
      const config = response.config as InternalAxiosRequestConfig & { _retry?: boolean }
      if (config._retry) {
        handleTokenExpired()
        return Promise.reject(data)
      }

      if (!isRefreshing) {
        isRefreshing = true
        refreshToken()
          .then((newToken) => {
            isRefreshing = false
            runQueue(newToken)
          })
          .catch(() => {
            isRefreshing = false
            handleTokenExpired()
            runQueue(null)
          })
      }

      return new Promise<AxiosResponse>((resolve, reject) => {
        requestQueue.push((newToken) => {
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`
          }
          config._retry = true
          axiosInstance(config)
            .then(resolve)
            .catch(reject)
        })
      })
    } else {
      ElMessage.error(data.message || '请求失败')
      return Promise.reject(data)
    }
  },
  (error) => {
    if (error.response?.status === 401) {
      handleTokenExpired()
    } else if (error.response?.status === 403) {
      ElMessage.error('无权限访问')
    } else {
      ElMessage.error(error.message || '网络请求失败')
    }
    return Promise.reject(error)
  }
)

export const http = {
  get: <T = unknown>(url: string, params?: unknown, config?: InternalAxiosRequestConfig): Promise<T> => {
    return axiosInstance.get(url, { params, ...config })
  },
  post: <T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig): Promise<T> => {
    return axiosInstance.post(url, data, config)
  },
  put: <T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig): Promise<T> => {
    return axiosInstance.put(url, data, config)
  },
  patch: <T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig): Promise<T> => {
    return axiosInstance.patch(url, data, config)
  },
  delete: <T = unknown>(url: string, config?: InternalAxiosRequestConfig): Promise<T> => {
    return axiosInstance.delete(url, config)
  },
}

export default axiosInstance