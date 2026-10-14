/**
 * 平台定位适配层
 * 统一封装各平台的定位API差异
 *
 * @example
 * import { location } from '@/platform';
 * const result = await location.getLocation();
 */

/**
 * 获取当前位置
 * @param {Object} options - 定位选项
 * @param {string} options.type - 定位类型: wgs84/gcj02/bd09
 * @param {boolean} options.highAccuracy - 是否高精度定位
 * @param {number} options.timeout - 超时时间(ms)
 * @returns {Promise<{ success: boolean, data?: LocationData, errMsg?: string }>}
 */
export function getLocation(options = {}) {
  const { type = 'gcj02', highAccuracy = true, timeout = 10000 } = options

  // #ifdef H5
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ success: false, errMsg: 'Geolocation not supported' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          },
        })
      },
      (error) => {
        resolve({ success: false, errMsg: error.message })
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: 0,
      }
    )
  })
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    wx.getLocation({
      type,
      highAccuracyExpireTime: highAccuracy ? timeout : 0,
      timeout,
      success: (res) => {
        resolve({
          success: true,
          data: {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            altitude: res.altitude,
            speed: res.speed,
            address: res.address,
            city: res.city,
            district: res.district,
            province: res.province,
            street: res.street,
            streetNum: res.streetNum,
            adcode: res.adcode,
            nation: res.nation,
          },
        })
      },
      fail: (err) => {
        resolve({ success: false, errMsg: err.errMsg })
      },
    })
  })
  // #endif

  // #ifdef MP-ALIPAY
  return new Promise((resolve) => {
    my.getLocation({
      type: type === 'wgs84' ? 'gcj02' : type,
      success: (res) => {
        resolve({
          success: true,
          data: {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            address: res.address,
            city: res.city,
            district: res.district,
            province: res.province,
          },
        })
      },
      fail: (err) => {
        resolve({ success: false, errMsg: err.errorMessage || err.message })
      },
    })
  })
  // #endif

  // #ifdef MP-BAIDU
  return new Promise((resolve) => {
    swan.getLocation({
      type: type === 'wgs84' ? 'gcj02' : type,
      highAccuracy: highAccuracy,
      timeout,
      success: (res) => {
        resolve({
          success: true,
          data: {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            altitude: res.altitude,
            speed: res.speed,
            address: res.address,
            city: res.city,
            district: res.district,
            province: res.province,
          },
        })
      },
      fail: (err) => {
        resolve({ success: false, errMsg: err.errMsg })
      },
    })
  })
  // #endif

  // #ifdef MP-TOUTIAO
  return new Promise((resolve) => {
    tt.getLocation({
      type: type === 'wgs84' ? 'gcj02' : type,
      success: (res) => {
        resolve({
          success: true,
          data: {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            altitude: res.altitude,
            speed: res.speed,
          },
        })
      },
      fail: (err) => {
        resolve({ success: false, errMsg: err.errMsg })
      },
    })
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve) => {
    uni.getLocation({
      type,
      success: (res) => {
        resolve({
          success: true,
          data: {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            altitude: res.altitude,
            speed: res.speed,
            address: res.address,
            city: res.city,
            district: res.district,
            province: res.province,
            street: res.street,
            streetNum: res.streetNum,
            adcode: res.adcode,
            nation: res.nation,
          },
        })
      },
      fail: (err) => {
        resolve({ success: false, errMsg: err.errMsg })
      },
    })
  })
  // #endif

  return Promise.resolve({ success: false, errMsg: 'location not supported' })
}

/**
 * 开启位置监听
 * @param {Object} options - 监听选项
 * @param {Function} callback - 位置变化回调
 * @returns {Promise<{ success: boolean, errMsg?: string }>}
 */
export function watchLocation(options = {}, callback) {
  const { type = 'gcj02', highAccuracy = true } = options

  // #ifdef H5
  if (!navigator.geolocation) {
    return Promise.resolve({ success: false, errMsg: 'Geolocation not supported' })
  }
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback &&
        callback({
          success: true,
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        })
    },
    (error) => {
      callback && callback({ success: false, errMsg: error.message })
    },
    { enableHighAccuracy: highAccuracy, maximumAge: 0 }
  )
  return Promise.resolve({ success: true, watchId })
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    const watchId = wx.watchLocation({
      type,
      highAccuracyExpireTime: highAccuracy ? 10000 : 0,
      success: (res) => {
        callback &&
          callback({
            success: true,
            data: {
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy,
            },
          })
      },
      fail: (err) => {
        callback && callback({ success: false, errMsg: err.errMsg })
      },
    })
    resolve({ success: true, watchId })
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve) => {
    const watchId = uni.watchLocation({
      type,
      success: (res) => {
        callback &&
          callback({
            success: true,
            data: {
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy,
            },
          })
      },
      fail: (err) => {
        callback && callback({ success: false, errMsg: err.errMsg })
      },
    })
    resolve({ success: true, watchId })
  })
  // #endif

  // #ifdef MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  return Promise.resolve({ success: false, errMsg: 'watchLocation not supported' })
  // #endif

  return Promise.resolve({ success: false, errMsg: 'watchLocation not supported' })
}

/**
 * 关闭位置监听
 * @param {number} watchId - 监听ID
 * @returns {void}
 */
export function stopLocationUpdate(watchId) {
  // #ifdef H5
  navigator.geolocation.clearWatch(watchId)
  return
  // #endif

  // #ifdef MP-WEIXIN
  wx.stopLocationUpdate()
  return
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  uni.stopLocationUpdate()
  return
  // #endif
}

/**
 * 定位是否可用检测
 * @returns {boolean}
 */
export function isLocationAvailable() {
  // #ifdef H5
  return !!navigator.geolocation
  // #endif

  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-HARMONY || APP-HARMONY
  return true
  // #endif

  return false
}

export default {
  getLocation,
  watchLocation,
  stopLocationUpdate,
  isLocationAvailable,
}
