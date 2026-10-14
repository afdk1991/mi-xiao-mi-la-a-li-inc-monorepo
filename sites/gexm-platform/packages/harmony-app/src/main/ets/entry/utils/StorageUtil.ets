/**
 * StorageUtil - 存储工具类
 * 
 * 注意：此文件为 ArkTS 代码示例，需将其内容复制到 DevEco Studio 生成的 Stage 工程中使用
 * 
 * 功能：
 * 1. 封装 Preferences 操作
 * 2. 提供统一的键名管理
 * 3. 处理数据序列化/反序列化
 */

import { Preferences } from '@kit.DataKit'
import { hilog } from '@kit.CoreKit'

const TAG = 'StorageUtil'
const PREFERENCES_NAME = 'gexm_app'

const StorageKeys = {
  TOKEN: 'token',
  USER: 'user',
  CART: 'cart',
  ADDRESS: 'address',
  SETTINGS: 'settings'
}

class StorageUtil {
  private preferences: Preferences | null = null

  async init(): Promise<void> {
    try {
      this.preferences = await Preferences.getPreferences(getContext(this), PREFERENCES_NAME)
      hilog.info(0x0000, TAG, 'StorageUtil initialized')
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to initialize StorageUtil')
    }
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.preferences) {
      await this.init()
    }

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      await this.preferences?.put(key, serialized)
      hilog.info(0x0000, TAG, `Set key: ${key}`)
    } catch (error) {
      hilog.error(0x0000, TAG, `Failed to set key ${key}: ${JSON.stringify(error)}`)
    }
  }

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    if (!this.preferences) {
      await this.init()
    }

    try {
      const value = await this.preferences?.get(key, defaultValue)
      
      if (value === null || value === undefined || typeof value === 'string' && value === '') {
        return defaultValue as T
      }

      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T
        } catch {
          return value as T
        }
      }

      return value as T
    } catch (error) {
      hilog.error(0x0000, TAG, `Failed to get key ${key}: ${JSON.stringify(error)}`)
      return defaultValue as T
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.preferences) {
      await this.init()
    }

    try {
      await this.preferences?.delete(key)
      hilog.info(0x0000, TAG, `Deleted key: ${key}`)
    } catch (error) {
      hilog.error(0x0000, TAG, `Failed to delete key ${key}: ${JSON.stringify(error)}`)
    }
  }

  async clear(): Promise<void> {
    if (!this.preferences) {
      await this.init()
    }

    try {
      await this.preferences?.clear()
      hilog.info(0x0000, TAG, 'Cleared all storage')
    } catch (error) {
      hilog.error(0x0000, TAG, `Failed to clear storage: ${JSON.stringify(error)}`)
    }
  }

  async contains(key: string): Promise<boolean> {
    if (!this.preferences) {
      await this.init()
    }

    try {
      const value = await this.preferences?.get(key, null)
      return value !== null && value !== undefined
    } catch (error) {
      hilog.error(0x0000, TAG, `Failed to check key ${key}: ${JSON.stringify(error)}`)
      return false
    }
  }
}

export const storageUtil = new StorageUtil()
export { StorageKeys }