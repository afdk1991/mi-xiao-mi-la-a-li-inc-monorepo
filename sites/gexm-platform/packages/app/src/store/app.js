import { defineStore } from 'pinia'
import { getPlatform } from '@/utils'
import { getAppVersion } from '@/platform'

const TAB_BAR_PAGES = [
  'pages/index/index',
  'pages/category/category',
  'pages/cart/cart',
  'pages/profile/profile',
]

let onlineHandler = null
let offlineHandler = null
let networkChangeHandler = null

export const useAppStore = defineStore('app', {
  state: () => ({
    appVersion: '1.0.0',
    platform: '',
    systemInfo: null,
    safeArea: null,
    isOnline: true,
    theme: 'light',
    language: 'zh-CN',
    enablePush: true,
    enableOffline: true,
    loadingCount: 0,
    deviceType: '',
    serviceStatus: 'unknown',
    serviceStatusText: '检测中',
    systemHealth: null,
    healthCheckFailCount: 0,
    lastHealthCheck: null,
    isTabBarPage: false,
  }),

  getters: {
    isLoading: (state) => state.loadingCount > 0,
    statusBarHeight: (state) => state.safeArea?.statusBarHeight || 20,
    navBarHeight: (state) => (state.safeArea?.statusBarHeight || 20) + 44,
    safeAreaBottom: (state) => state.safeArea?.safeAreaInsets?.bottom || 0,
    isH5: (state) => state.platform === 'h5',
    isMpWeixin: (state) => state.platform === 'mp-weixin',
    isMpAlipay: (state) => state.platform === 'mp-alipay',
    isApp: (state) => state.platform === 'app-plus',
    isMobile: (state) =>
      [
        'h5',
        'mp-weixin',
        'mp-alipay',
        'mp-baidu',
        'mp-toutiao',
        'mp-harmony',
        'app-plus',
        'app-harmony',
      ].includes(state.platform),
    isServiceHealthy: (state) => state.serviceStatus === 'healthy',
    platformText: (state) => {
      const map = {
        h5: 'H5 网页版',
        'mp-weixin': '微信小程序',
        'mp-alipay': '支付宝小程序',
        'mp-baidu': '百度小程序',
        'mp-toutiao': '抖音小程序',
        'app-plus': 'App',
        'mp-harmony': '鸿蒙小程序',
        'app-harmony': '鸿蒙App',
      }
      return map[state.platform] || '未知平台'
    },
    networkStatusText: (state) => (state.isOnline ? '已连接' : '未连接'),
  },

  actions: {
    initApp() {
      this.getSystemInfo()
      this.checkNetwork()
      this.initPlatform()
      this.initDeviceType()
    },

    getSystemInfo() {
      try {
        const info = uni.getSystemInfoSync()
        const windowInfo = uni.getWindowInfo ? uni.getWindowInfo() : {}

        this.systemInfo = {
          ...info,
          windowWidth: windowInfo.windowWidth || info.windowWidth,
          windowHeight: windowInfo.windowHeight || info.windowHeight,
        }

        this.safeArea = {
          statusBarHeight: info.statusBarHeight,
          safeAreaInsets: {
            top: info.statusBarHeight,
            bottom: info.safeAreaInsets?.bottom || 0,
            left: info.safeAreaInsets?.left || 0,
            right: info.safeAreaInsets?.right || 0,
          },
        }
      } catch (e) {
        console.error('Failed to get system info:', e)
      }
    },

    initPlatform() {
      this.platform = getPlatform()
      this.appVersion = getAppVersion()

      // #ifdef H5
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-platform', 'h5')
      }
      // #endif
    },

    initDeviceType() {
      // #ifdef H5
      if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent
        if (/iPhone|iPad|iPod/i.test(ua)) {
          this.deviceType = 'iOS'
        } else if (/Android/i.test(ua)) {
          this.deviceType = 'Android'
        } else if (/Macintosh|Mac OS X/i.test(ua)) {
          this.deviceType = 'macOS'
        } else if (/Windows/i.test(ua)) {
          this.deviceType = 'Windows'
        } else {
          this.deviceType = '桌面端'
        }
      }
      // #endif

      // #ifdef MP-WEIXIN
      this.deviceType = '微信小程序'
      // #endif

      // #ifdef MP-ALIPAY
      this.deviceType = '支付宝小程序'
      // #endif

      // #ifdef MP-BAIDU
      this.deviceType = '百度小程序'
      // #endif

      // #ifdef MP-TOUTIAO
      this.deviceType = '抖音小程序'
      // #endif

      // #ifdef APP-PLUS
      this.deviceType = 'App'
      // #endif

      // #ifdef MP-HARMONY || APP-HARMONY
      this.deviceType = '鸿蒙设备'
      // #endif
    },

    checkNetwork() {
      uni.getNetworkType({
        success: (res) => {
          this.isOnline = res.networkType !== 'none'
        },
      })

      if (networkChangeHandler) {
        try {
          if (typeof uni.offNetworkStatusChange === 'function') {
            uni.offNetworkStatusChange(networkChangeHandler)
          }
        } catch (e) {}
      }
      networkChangeHandler = (res) => {
        const wasOnline = this.isOnline
        this.isOnline = res.isConnected
        if (!wasOnline && res.isConnected) {
          this.healthCheckFailCount = 0
        }
      }
      uni.onNetworkStatusChange(networkChangeHandler)

      // #ifdef H5
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        this.isOnline = navigator.onLine

        if (onlineHandler) {
          window.removeEventListener('online', onlineHandler)
          window.removeEventListener('offline', offlineHandler)
        }
        onlineHandler = () => {
          const wasOnline = this.isOnline
          this.isOnline = true
          if (!wasOnline) {
            this.healthCheckFailCount = 0
          }
        }
        offlineHandler = () => {
          this.isOnline = false
        }
        window.addEventListener('online', onlineHandler)
        window.addEventListener('offline', offlineHandler)
      }
      // #endif
    },

    setServiceHealthy(data) {
      this.healthCheckFailCount = 0
      this.serviceStatus = 'healthy'
      this.serviceStatusText = '运行正常'
      this.systemHealth = {
        status: data?.status,
        uptime: data?.uptime,
        memory: data?.memory,
        timestamp: data?.timestamp || Date.now(),
      }
      this.lastHealthCheck = Date.now()
    },

    setServiceUnhealthy() {
      this.serviceStatus = 'unhealthy'
      this.serviceStatusText = '服务异常'
    },

    incrementHealthCheckFailCount() {
      this.healthCheckFailCount++
    },

    resetHealthCheckFailCount() {
      this.healthCheckFailCount = 0
    },

    setTabBarPage(isTabBar) {
      this.isTabBarPage = !!isTabBar
    },

    checkCurrentPageTabBar() {
      try {
        const pages = getCurrentPages()
        const current = pages[pages.length - 1]
        if (!current) return false
        const rawRoute = current.route || (current.$page && current.$page.route) || ''
        const route = rawRoute.replace(/^\/+/, '')
        const isTabBar = TAB_BAR_PAGES.includes(route)
        this.isTabBarPage = isTabBar
        return isTabBar
      } catch (e) {
        return false
      }
    },

    showLoading(title = '加载中...') {
      if (this.loadingCount === 0) {
        uni.showLoading({ title, mask: true })
      }
      this.loadingCount++
    },

    hideLoading() {
      this.loadingCount = Math.max(0, this.loadingCount - 1)
      if (this.loadingCount === 0) {
        try {
          uni.hideLoading()
        } catch (e) {
          console.warn('hideLoading failed, loading may not be showing:', e)
        }
      }
    },

    setTheme(theme) {
      this.theme = theme
    },

    setLanguage(lang) {
      this.language = lang
    },

    toast(title, icon = 'none', duration = 2000) {
      uni.showToast({ title, icon, duration })
    },
  },
})
