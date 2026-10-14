import { errorLogApi } from '../api'
import { getPlatform } from './index'
import { onGlobalError, onUnhandledRejection } from '../platform'

class ErrorMonitor {
  constructor() {
    this.initialized = false
    this.appVersion = '1.0.0'
    this.platform = getPlatform()
    this.queue = []
    this.reportTimer = null
    this.batchSize = 10
    this.reportInterval = 5000
    this.userId = null
  }

  init() {
    if (this.initialized) return

    this.setupGlobalErrorHandler()
    this.setupUnhandledRejection()

    this.initialized = true
    console.log('Error monitor initialized')
  }

  setupGlobalErrorHandler() {
    onGlobalError((error) => {
      this.captureError({
        type: 'global_error',
        message: error.message,
        stack: error.stack,
        filename: error.filename,
        lineNo: error.lineNo,
        columnNo: error.columnNo,
      })
    })
  }

  setupUnhandledRejection() {
    onUnhandledRejection((error) => {
      this.captureError({
        type: 'unhandled_rejection',
        message: error.message,
        stack: error.stack,
      })
    })
  }

  captureError(errorInfo) {
    const errorLog = {
      platform: this.platform,
      appVersion: this.appVersion,
      errorType: errorInfo.type || 'unknown',
      errorMessage: errorInfo.message || '',
      stackTrace: errorInfo.stack || '',
      userAgent: this.getUserAgent(),
      timestamp: Date.now(),
    }

    this.queue.push(errorLog)

    if (this.queue.length >= this.batchSize) {
      this.flushQueue()
    } else if (!this.reportTimer) {
      this.reportTimer = setTimeout(() => {
        this.flushQueue()
      }, this.reportInterval)
    }
  }

  async flushQueue() {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.batchSize)
    this.reportTimer = null

    try {
      for (const error of batch) {
        await errorLogApi.report(error).catch(() => {})
      }
    } catch (e) {
      console.error('Failed to report errors:', e)
      this.queue.unshift(...batch)
    }
  }

  getUserAgent() {
    // #ifdef H5
    return navigator.userAgent
    // #endif
    // #ifndef H5
    return ''
    // #endif
  }

  manualReport(error, context = {}) {
    this.captureError({
      type: 'manual',
      message: error.message || String(error),
      stack: error.stack,
      ...context,
    })
  }

  setUserInfo(userId) {
    this.userId = userId
  }

  clearUserInfo() {
    this.userId = null
  }
}

export const errorMonitor = new ErrorMonitor()
export default errorMonitor
