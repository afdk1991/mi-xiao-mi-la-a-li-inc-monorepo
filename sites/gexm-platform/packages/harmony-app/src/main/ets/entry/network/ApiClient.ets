/**
 * ApiClient - 网络请求客户端
 * 
 * 注意：此文件为 ArkTS 代码示例，需将其内容复制到 DevEco Studio 生成的 Stage 工程中使用
 * 
 * 功能：
 * 1. 封装 HTTP 请求
 * 2. 添加请求拦截器（Token、Header）
 * 3. 添加响应拦截器（错误处理、Token过期处理）
 * 4. 统一错误处理
 */

import { http } from '@kit.NetworkKit'
import { hilog } from '@kit.CoreKit'
import { Preferences } from '@kit.DataKit'
import { router } from '@kit.AbilityKit'

const TAG = 'ApiClient'
const BASE_URL = 'https://api.example.com'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

class ApiClient {
  private static instance: ApiClient
  private preferences: Preferences | null = null

  private constructor() {
    this.init()
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  private async init() {
    try {
      this.preferences = await Preferences.getPreferences(getContext(this), 'gexm_app')
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to init preferences')
    }
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url, params)
    const headers = await this.buildHeaders()

    hilog.info(0x0000, TAG, `GET ${fullUrl}`)

    try {
      const response = await http.get(fullUrl, { headers })
      return this.handleResponse(response)
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async post<T>(url: string, data?: Record<string, any>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url)
    const headers = await this.buildHeaders()

    hilog.info(0x0000, TAG, `POST ${fullUrl}`)

    try {
      const response = await http.post(fullUrl, JSON.stringify(data), { headers })
      return this.handleResponse(response)
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async put<T>(url: string, data?: Record<string, any>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url)
    const headers = await this.buildHeaders()

    hilog.info(0x0000, TAG, `PUT ${fullUrl}`)

    try {
      const response = await http.put(fullUrl, JSON.stringify(data), { headers })
      return this.handleResponse(response)
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async delete<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url, params)
    const headers = await this.buildHeaders()

    hilog.info(0x0000, TAG, `DELETE ${fullUrl}`)

    try {
      const response = await http.delete(fullUrl, { headers })
      return this.handleResponse(response)
    } catch (error) {
      throw this.handleError(error)
    }
  }

  private buildUrl(url: string, params?: Record<string, any>): string {
    let fullUrl = `${BASE_URL}${url}`
    
    if (params) {
      const queryString = new URLSearchParams(params).toString()
      if (queryString) {
        fullUrl += `?${queryString}`
      }
    }
    
    return fullUrl
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    if (this.preferences) {
      try {
        const token = await this.preferences.get('token', '')
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      } catch (error) {
        hilog.error(0x0000, TAG, 'Failed to get token from preferences')
      }
    }

    return headers
  }

  private handleResponse(response: http.HttpResponse): ApiResponse<any> {
    if (response.responseCode !== 200) {
      throw new Error(`HTTP Error: ${response.responseCode}`)
    }

    try {
      const result = JSON.parse(response.result.toString())
      
      if (result.code === 401) {
        this.handleTokenExpired()
        throw new Error('Token expired')
      }

      if (result.code !== 0) {
        throw new Error(result.message || 'Request failed')
      }

      return result
    } catch (error) {
      throw new Error('Invalid response format')
    }
  }

  private handleError(error: any): Error {
    hilog.error(0x0000, TAG, `Request error: ${JSON.stringify(error)}`)

    let message = '网络请求失败'

    if (error instanceof Error) {
      message = error.message
    }

    return new Error(message)
  }

  private async handleTokenExpired() {
    if (this.preferences) {
      await this.preferences.delete('token')
      await this.preferences.delete('user')
    }

    router.replaceUrl({ url: 'pages/login/login' })
  }
}

export const apiClient = ApiClient.getInstance()