/**
 * 平台安全区域适配层
 * 统一封装各平台的安全区域获取API
 */

let safeAreaCache = null
let systemInfoCache = null

function getSystemInfo() {
  if (systemInfoCache) return systemInfoCache

  try {
    systemInfoCache = uni.getSystemInfoSync()
    return systemInfoCache
  } catch (e) {
    console.error('[SafeArea] Failed to get system info:', e)
    return {
      statusBarHeight: 20,
      windowWidth: 375,
      windowHeight: 667,
      safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    }
  }
}

export function getSafeArea() {
  if (safeAreaCache) return safeAreaCache

  const info = getSystemInfo()

  safeAreaCache = {
    statusBarHeight: info.statusBarHeight || 20,
    navBarHeight: (info.statusBarHeight || 20) + 44,
    safeAreaInsets: {
      top: info.safeAreaInsets?.top || info.statusBarHeight || 20,
      bottom: info.safeAreaInsets?.bottom || 0,
      left: info.safeAreaInsets?.left || 0,
      right: info.safeAreaInsets?.right || 0,
    },
    windowWidth: info.windowWidth || 375,
    windowHeight: info.windowHeight || 667,
    screenWidth: info.screenWidth || 375,
    screenHeight: info.screenHeight || 667,
    pixelRatio: info.pixelRatio || 2,
  }

  return safeAreaCache
}

export function getStatusBarHeight() {
  return getSafeArea().statusBarHeight
}

export function getNavBarHeight() {
  return getSafeArea().navBarHeight
}

export function getSafeAreaBottom() {
  return getSafeArea().safeAreaInsets.bottom
}

export function getSafeAreaTop() {
  return getSafeArea().safeAreaInsets.top
}

export function getWindowWidth() {
  return getSafeArea().windowWidth
}

export function getWindowHeight() {
  return getSafeArea().windowHeight
}

export function getPixelRatio() {
  return getSafeArea().pixelRatio
}

export function isIPhoneX() {
  const info = getSystemInfo()
  if (info.model) {
    return (
      info.model.includes('iPhone X') ||
      info.model.includes('iPhone XR') ||
      info.model.includes('iPhone XS') ||
      info.model.includes('iPhone 11') ||
      info.model.includes('iPhone 12') ||
      info.model.includes('iPhone 13') ||
      info.model.includes('iPhone 14') ||
      info.model.includes('iPhone 15')
    )
  }
  const screenHeight = info.screenHeight || 0
  const screenWidth = info.screenWidth || 0
  return screenHeight >= 812 && screenWidth >= 375
}

export function hasHomeIndicator() {
  return getSafeArea().safeAreaInsets.bottom > 0
}

export function resetCache() {
  safeAreaCache = null
  systemInfoCache = null
}

export default {
  getSafeArea,
  getStatusBarHeight,
  getNavBarHeight,
  getSafeAreaBottom,
  getSafeAreaTop,
  getWindowWidth,
  getWindowHeight,
  getPixelRatio,
  isIPhoneX,
  hasHomeIndicator,
  resetCache,
}
