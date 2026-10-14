/**
 * 响应式布局工具类
 * 支持多设备适配（手机、平板、折叠屏）
 */

/**
 * 设备类型枚举
 */
export const DeviceType = {
  PHONE: 'phone',
  TABLET: 'tablet',
  FOLDABLE: 'foldable',
  DESKTOP: 'desktop',
}

/**
 * 断点配置（基于屏幕宽度 px）
 */
export const Breakpoints = {
  SM: 375,
  MD: 414,
  LG: 768,
  XL: 1024,
  XXL: 1280,
}

/**
 * 获取当前设备类型
 * @returns {string} - DeviceType 枚举值
 */
export function getDeviceType() {
  const sysInfo = uni.getSystemInfoSync()
  const screenWidth = sysInfo.screenWidth || sysInfo.windowWidth || 0

  // #ifdef MP-HARMONY || APP-HARMONY
  if (screenWidth >= Breakpoints.XL) {
    return DeviceType.DESKTOP
  } else if (screenWidth >= Breakpoints.LG) {
    return DeviceType.TABLET
  } else {
    return DeviceType.PHONE
  }
  // #endif

  if (screenWidth >= Breakpoints.XL) {
    return DeviceType.DESKTOP
  } else if (screenWidth >= Breakpoints.LG) {
    return DeviceType.TABLET
  } else if (screenWidth >= Breakpoints.MD) {
    return DeviceType.PHONE
  } else {
    return DeviceType.PHONE
  }
}

/**
 * 判断是否为平板设备
 * @returns {boolean}
 */
export function isTablet() {
  return getDeviceType() === DeviceType.TABLET
}

/**
 * 判断是否为桌面设备
 * @returns {boolean}
 */
export function isDesktop() {
  return getDeviceType() === DeviceType.DESKTOP
}

/**
 * 判断是否为手机设备
 * @returns {boolean}
 */
export function isPhone() {
  return getDeviceType() === DeviceType.PHONE
}

/**
 * 获取网格列数
 * 根据设备类型返回推荐的网格列数
 * @returns {number}
 */
export function getGridColumns() {
  const deviceType = getDeviceType()

  switch (deviceType) {
    case DeviceType.DESKTOP:
      return 6
    case DeviceType.TABLET:
      return 4
    case DeviceType.FOLDABLE:
      return 3
    default:
      return 2
  }
}

/**
 * 获取内容区域最大宽度
 * @returns {number} - rpx 值
 */
export function getMaxContentWidth() {
  const deviceType = getDeviceType()

  switch (deviceType) {
    case DeviceType.DESKTOP:
      return 1400
    case DeviceType.TABLET:
      return 1000
    default:
      return 750
  }
}

/**
 * 获取页面边距
 * @returns {number} - rpx 值
 */
export function getPagePadding() {
  const deviceType = getDeviceType()

  switch (deviceType) {
    case DeviceType.DESKTOP:
      return 60
    case DeviceType.TABLET:
      return 40
    default:
      return 24
  }
}

/**
 * 获取字体缩放系数
 * @returns {number}
 */
export function getFontScale() {
  const deviceType = getDeviceType()

  switch (deviceType) {
    case DeviceType.DESKTOP:
      return 1.2
    case DeviceType.TABLET:
      return 1.1
    default:
      return 1
  }
}

/**
 * 响应式图片尺寸
 * 根据设备类型返回合适的图片尺寸
 * @param {number} baseSize - 基础尺寸 (px)
 * @returns {number}
 */
export function responsiveImageSize(baseSize) {
  const deviceType = getDeviceType()

  switch (deviceType) {
    case DeviceType.DESKTOP:
      return baseSize * 1.5
    case DeviceType.TABLET:
      return baseSize * 1.2
    default:
      return baseSize
  }
}

/**
 * 监听设备变化
 * @param {Function} callback - 设备变化回调
 * @returns {number} - 监听 ID
 */
export function onDeviceChange(callback) {
  // #ifdef APP-PLUS || APP-HARMONY
  return uni.onWindowResize((res) => {
    const newType = getDeviceType()
    callback(newType, res)
  })
  // #endif

  return null
}

/**
 * 获取安全区域信息
 * @returns {Object}
 */
export function getSafeArea() {
  const sysInfo = uni.getSystemInfoSync()

  return {
    top: sysInfo.safeArea?.top || sysInfo.statusBarHeight || 0,
    bottom: sysInfo.safeArea?.bottom || sysInfo.screenHeight - (sysInfo.windowHeight || 0),
    left: sysInfo.safeArea?.left || 0,
    right: sysInfo.safeArea?.right || 0,
  }
}

/**
 * 获取状态栏高度
 * @returns {number}
 */
export function getStatusBarHeight() {
  const sysInfo = uni.getSystemInfoSync()
  return sysInfo.statusBarHeight || 44
}

/**
 * 获取导航栏高度
 * @returns {number}
 */
export function getNavBarHeight() {
  return 88 + getStatusBarHeight()
}

/**
 * 获取底部安全区域高度
 * @returns {number}
 */
export function getBottomSafeHeight() {
  const sysInfo = uni.getSystemInfoSync()
  const screenHeight = sysInfo.screenHeight || 0
  const windowHeight = sysInfo.windowHeight || 0
  return Math.max(0, screenHeight - windowHeight)
}

/**
 * 获取屏幕方向
 * @returns {'portrait' | 'landscape'}
 */
export function getScreenOrientation() {
  const sysInfo = uni.getSystemInfoSync()
  const { screenWidth, screenHeight } = sysInfo

  if (screenWidth > screenHeight) {
    return 'landscape'
  }
  return 'portrait'
}

/**
 * 判断是否为横屏模式
 * @returns {boolean}
 */
export function isLandscape() {
  return getScreenOrientation() === 'landscape'
}

export default {
  DeviceType,
  Breakpoints,
  getDeviceType,
  isTablet,
  isDesktop,
  isPhone,
  getGridColumns,
  getMaxContentWidth,
  getPagePadding,
  getFontScale,
  responsiveImageSize,
  onDeviceChange,
  getSafeArea,
  getStatusBarHeight,
  getNavBarHeight,
  getBottomSafeHeight,
  getScreenOrientation,
  isLandscape,
}
