import { errorMonitor } from './errorMonitor'

export const ERROR_TYPES = {
  NETWORK: 'network',
  SERVER: 'server',
  AUTH: 'auth',
  VALIDATION: 'validation',
  BUSINESS: 'business',
  UNKNOWN: 'unknown',
}

export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: '网络异常',
    message: '网络连接不稳定，请检查网络设置后重试',
    actions: [
      {
        label: '重试',
        type: 'primary',
        callback: () => {
          uni.showToast({ title: '正在重试', icon: 'loading', duration: 1000 })
        },
      },
    ],
  },
  [ERROR_TYPES.SERVER]: {
    title: '服务器错误',
    message: '服务器暂时无法响应，请稍后再试',
    actions: [
      {
        label: '刷新',
        type: 'primary',
        callback: () => {
          uni.showToast({ title: '正在刷新', icon: 'loading', duration: 1000 })
        },
      },
    ],
  },
  [ERROR_TYPES.AUTH]: {
    title: '登录失效',
    message: '您的登录已过期，请重新登录',
    actions: [
      {
        label: '去登录',
        type: 'primary',
        callback: () => {
          uni.navigateTo({ url: '/pages/login/login' })
        },
      },
      {
        label: '取消',
        type: 'secondary',
      },
    ],
  },
  [ERROR_TYPES.VALIDATION]: {
    title: '参数错误',
    message: '请检查输入内容是否正确',
    actions: [],
  },
  [ERROR_TYPES.BUSINESS]: {
    title: '业务错误',
    message: '操作失败，请稍后重试',
    actions: [],
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: '未知错误',
    message: '发生未知错误，请重试',
    actions: [
      {
        label: '重试',
        type: 'primary',
      },
    ],
  },
}

class GlobalErrorHandler {
  constructor() {
    this.currentError = null
    this.errorListeners = []
  }

  handleError(error, context = {}) {
    const errorInfo = this.parseError(error, context)

    errorMonitor.captureError({
      type: errorInfo.type,
      message: errorInfo.message,
      stack: error.stack,
      context: JSON.stringify(context),
    })

    this.currentError = errorInfo

    this.notifyListeners(errorInfo)

    this.showErrorToast(errorInfo)
  }

  parseError(error, context) {
    if (error.response) {
      const { status, data } = error.response

      if (status >= 500) {
        return {
          type: ERROR_TYPES.SERVER,
          title: ERROR_MESSAGES[ERROR_TYPES.SERVER].title,
          message: data?.message || ERROR_MESSAGES[ERROR_TYPES.SERVER].message,
          code: status,
          actions: ERROR_MESSAGES[ERROR_TYPES.SERVER].actions,
          ...context,
        }
      }

      if (status === 401) {
        return {
          type: ERROR_TYPES.AUTH,
          title: ERROR_MESSAGES[ERROR_TYPES.AUTH].title,
          message: data?.message || ERROR_MESSAGES[ERROR_TYPES.AUTH].message,
          code: status,
          actions: ERROR_MESSAGES[ERROR_TYPES.AUTH].actions,
          ...context,
        }
      }

      if (status === 400) {
        return {
          type: ERROR_TYPES.VALIDATION,
          title: ERROR_MESSAGES[ERROR_TYPES.VALIDATION].title,
          message: data?.message || ERROR_MESSAGES[ERROR_TYPES.VALIDATION].message,
          code: status,
          actions: ERROR_MESSAGES[ERROR_TYPES.VALIDATION].actions,
          ...context,
        }
      }

      if (status >= 400 && status < 500) {
        return {
          type: ERROR_TYPES.BUSINESS,
          title: data?.message || ERROR_MESSAGES[ERROR_TYPES.BUSINESS].title,
          message: data?.detail || ERROR_MESSAGES[ERROR_TYPES.BUSINESS].message,
          code: status,
          actions: ERROR_MESSAGES[ERROR_TYPES.BUSINESS].actions,
          ...context,
        }
      }
    }

    if (error.message && (error.message.includes('network') || error.message.includes('Network'))) {
      return {
        type: ERROR_TYPES.NETWORK,
        title: ERROR_MESSAGES[ERROR_TYPES.NETWORK].title,
        message: ERROR_MESSAGES[ERROR_TYPES.NETWORK].message,
        actions: ERROR_MESSAGES[ERROR_TYPES.NETWORK].actions,
        ...context,
      }
    }

    return {
      type: ERROR_TYPES.UNKNOWN,
      title: ERROR_MESSAGES[ERROR_TYPES.UNKNOWN].title,
      message: error.message || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN].message,
      actions: ERROR_MESSAGES[ERROR_TYPES.UNKNOWN].actions,
      ...context,
    }
  }

  showErrorToast(errorInfo) {
    if (errorInfo.type === ERROR_TYPES.AUTH) {
      return
    }

    uni.showToast({
      title: errorInfo.message,
      icon: 'none',
      duration: 3000,
    })
  }

  showErrorModal(errorInfo) {
    const actions = errorInfo.actions || []
    const showCancel = actions.length > 1

    uni.showModal({
      title: errorInfo.title,
      content: errorInfo.message,
      showCancel,
      cancelText: showCancel ? actions[1]?.label || '取消' : '',
      confirmText: actions[0]?.label || '确定',
      success: (res) => {
        if (res.confirm && actions[0]?.callback) {
          actions[0].callback()
        }
        if (res.cancel && actions[1]?.callback) {
          actions[1].callback()
        }
      },
    })
  }

  addListener(callback) {
    if (typeof callback === 'function') {
      this.errorListeners.push(callback)
    }
  }

  removeListener(callback) {
    const index = this.errorListeners.indexOf(callback)
    if (index > -1) {
      this.errorListeners.splice(index, 1)
    }
  }

  notifyListeners(errorInfo) {
    this.errorListeners.forEach((callback) => {
      try {
        callback(errorInfo)
      } catch (e) {
        console.error('Error listener failed:', e)
      }
    })
  }

  clearError() {
    this.currentError = null
    this.notifyListeners(null)
  }

  getCurrentError() {
    return this.currentError
  }
}

export const globalErrorHandler = new GlobalErrorHandler()

export function createError(type, message, actions = [], context = {}) {
  return {
    type,
    title: ERROR_MESSAGES[type]?.title || '错误',
    message: message || ERROR_MESSAGES[type]?.message || '发生错误',
    actions: actions.length > 0 ? actions : ERROR_MESSAGES[type]?.actions || [],
    ...context,
  }
}

export function handleApiError(error, context = {}) {
  globalErrorHandler.handleError(error, context)
  return Promise.reject(error)
}
