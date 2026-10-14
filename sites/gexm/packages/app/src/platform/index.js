/**
 * 平台适配层统一导出
 *
 * 该模块统一封装了跨平台差异化的功能接口，
 * 使用条件编译(#ifdef)确保各平台只打包必要的代码。
 *
 * @example
 * import { storage, payment, share, image, getPlatform } from '@/platform';
 */

// 平台工具
export { getPlatform } from '@/utils'
export { getPlatform as getCurrentPlatform } from '@/utils'

// 存储适配
export { storage, storageAsync } from './storage'

// 支付适配
export { requestPayment, isPaymentAvailable } from './payment'

// 分享适配
export {
  shareWebpage,
  shareImage,
  isShareAvailable,
  getShareConfig,
  getShareProvider,
} from './share'

// 图片处理适配
export {
  chooseImage,
  previewImage,
  getImageInfo,
  saveImageToPhotos,
  compressImage,
  checkImageLoad,
} from './image'

// 剪贴板适配
export { setClipboardData, getClipboardData, isClipboardAvailable } from './clipboard'

// 定位适配
export { getLocation, watchLocation, stopLocationUpdate, isLocationAvailable } from './location'

// 平台信息
export { getAppVersion, getAccountInfo } from './info'

// 错误监听适配
export { onGlobalError, onUnhandledRejection } from './error'

/**
 * 平台类型常量
 */
export const PlatformType = {
  H5: 'h5',
  MP_WEIXIN: 'mp-weixin',
  MP_ALIPAY: 'mp-alipay',
  MP_BAIDU: 'mp-baidu',
  MP_TOUTIAO: 'mp-toutiao',
  MP_HARMONY: 'mp-harmony',
  APP_PLUS: 'app-plus',
  APP_HARMONY: 'app-harmony',
}

/**
 * 检测是否为移动端H5
 */
export const isH5 = () => {
  // #ifdef H5
  return true
  // #endif
  return false
}

/**
 * 检测是否为微信小程序
 */
export const isMiniProgram = () => {
  // #ifdef MP-WEIXIN
  return true
  // #endif
  return false
}

/**
 * 检测是否为支付宝小程序
 */
export const isAlipayMiniProgram = () => {
  // #ifdef MP-ALIPAY
  return true
  // #endif
  return false
}

/**
 * 检测是否为百度小程序
 */
export const isBaiduMiniProgram = () => {
  // #ifdef MP-BAIDU
  return true
  // #endif
  return false
}

/**
 * 检测是否为头条小程序
 */
export const isToutiaoMiniProgram = () => {
  // #ifdef MP-TOUTIAO
  return true
  // #endif
  return false
}

/**
 * 检测是否为App环境
 */
export const isApp = () => {
  // #ifdef APP-PLUS
  return true
  // #endif
  // #ifdef APP-HARMONY
  return true
  // #endif
  return false
}

/**
 * 检测是否为HarmonyOS小程序环境
 */
export const isHarmonyMiniProgram = () => {
  // #ifdef MP-HARMONY
  return true
  // #endif
  return false
}

/**
 * 检测是否为HarmonyOS App环境
 */
export const isHarmonyApp = () => {
  // #ifdef APP-HARMONY
  return true
  // #endif
  return false
}

/**
 * 检测是否为HarmonyOS环境（小程序或App）
 */
export const isHarmony = () => {
  // #ifdef MP-HARMONY || APP-HARMONY
  return true
  // #endif
  return false
}

/**
 * 平台能力检测
 */
export const platformFeatures = {
  // #ifdef H5
  supportLocalStorage: true,
  supportShare: !!navigator.share,
  supportClipboard: !!navigator.clipboard,
  supportPayment: false, // H5需跳转外部
  // #endif

  // #ifdef MP-WEIXIN
  supportLocalStorage: true,
  supportShare: true,
  supportClipboard: true,
  supportPayment: true,
  // #endif

  // #ifdef MP-ALIPAY
  supportLocalStorage: true,
  supportShare: true,
  supportClipboard: true,
  supportPayment: true,
  // #endif

  // #ifdef APP-PLUS
  supportLocalStorage: true,
  supportShare: true,
  supportClipboard: true,
  supportPayment: true,
  // #endif

  // #ifdef MP-BAIDU || MP-TOUTIAO
  supportLocalStorage: true,
  supportShare: true,
  supportClipboard: true,
  supportPayment: false,
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  supportLocalStorage: true,
  supportShare: true,
  supportClipboard: true,
  supportPayment: true,
  // #endif
}

export default {
  PlatformType,
  isH5,
  isMiniProgram,
  isAlipayMiniProgram,
  isBaiduMiniProgram,
  isToutiaoMiniProgram,
  isApp,
  isHarmony,
  isHarmonyMiniProgram,
  isHarmonyApp,
  platformFeatures,
}
