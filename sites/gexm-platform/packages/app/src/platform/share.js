/**
 * 平台分享适配层
 * 统一封装 H5分享 / 小程序分享 / App分享的差异
 */

function showShareFailToast(errMsg) {
  uni.showToast({
    title: errMsg || '分享失败',
    icon: 'none',
    duration: 2000,
  })
}

function weixinShare(options) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    const { title, desc, url, imageUrl } = options

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
      success: () => {
        if (wx.updateShareMenu) {
          wx.updateShareMenu({
            withShareTicket: true,
            success: () => {
              resolve({
                success: true,
                platform: 'weixin',
                title,
                desc,
                path: url,
                imageUrl,
              })
            },
            fail: (err) => {
              console.warn('[Share] WeChat updateShareMenu failed:', err)
              resolve({
                success: true,
                platform: 'weixin',
                title,
                desc,
                path: url,
                imageUrl,
              })
            },
          })
        } else {
          resolve({
            success: true,
            platform: 'weixin',
            title,
            desc,
            path: url,
            imageUrl,
          })
        }
      },
      fail: (err) => {
        console.error('[Share] WeChat showShareMenu failed:', err)
        showShareFailToast('分享功能暂不可用')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifndef MP-WEIXIN
    reject(new Error('微信分享仅支持微信小程序环境'))
    // #endif
  })
}

function alipayShare(options) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-ALIPAY
    const { title, desc, url, imageUrl } = options

    my.showSharePanel({
      title,
      desc,
      url,
      imageUrl,
      success: () => {
        resolve({
          success: true,
          platform: 'alipay',
          title,
          desc,
          path: url,
          imageUrl,
        })
      },
      fail: (err) => {
        console.error('[Share] Alipay share failed:', err)
        showShareFailToast('分享失败')
        reject(new Error(err.errorMessage || err.message || '分享失败'))
      },
    })
    // #endif

    // #ifndef MP-ALIPAY
    reject(new Error('支付宝分享仅支持支付宝小程序环境'))
    // #endif
  })
}

function baiduShare(options) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-BAIDU
    const { title, desc, url, imageUrl } = options

    swan.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
      success: () => {
        resolve({
          success: true,
          platform: 'baidu',
          title,
          desc,
          path: url,
          imageUrl,
        })
      },
      fail: (err) => {
        console.error('[Share] Baidu share failed:', err)
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifndef MP-BAIDU
    reject(new Error('百度分享仅支持百度小程序环境'))
    // #endif
  })
}

function toutiaoShare(options) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-TOUTIAO
    const { title, desc, url, imageUrl } = options

    tt.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
      success: () => {
        resolve({
          success: true,
          platform: 'toutiao',
          title,
          desc,
          path: url,
          imageUrl,
        })
      },
      fail: (err) => {
        console.error('[Share] Toutiao share failed:', err)
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifndef MP-TOUTIAO
    reject(new Error('头条分享仅支持头条小程序环境'))
    // #endif
  })
}

function appShare(options) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    const { title, desc, url, imageUrl } = options

    uni.share({
      provider: 'weixin',
      type: 0,
      title,
      scene: 'WXSceneSession',
      summary: desc,
      href: url,
      imageUrl,
      success: (res) => {
        resolve({ success: true, platform: 'app-weixin', ...res })
      },
      fail: (err) => {
        console.error('[Share] App share failed:', err)
        uni.share({
          provider: 'weixin',
          type: 0,
          title,
          scene: 'WXSenceTimeline',
          summary: desc,
          href: url,
          imageUrl,
          success: (res2) => {
            resolve({ success: true, platform: 'app-timeline', ...res2 })
          },
          fail: (err2) => {
            showShareFailToast('分享失败')
            reject(new Error(err2.errMsg || '分享失败'))
          },
        })
      },
    })
    // #endif

    // #ifndef APP-PLUS
    reject(new Error('App分享仅支持App环境'))
    // #endif
  })
}

function harmonyShare(options) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-HARMONY || APP-HARMONY
    const { title, desc, url, imageUrl } = options

    uni.share({
      provider: 'weixin',
      type: 0,
      title,
      scene: 'WXSceneSession',
      summary: desc,
      href: url,
      imageUrl,
      success: (res) => {
        resolve({ success: true, platform: 'harmony-weixin', ...res })
      },
      fail: (err) => {
        console.error('[Share] Harmony share failed:', err)
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifndef MP-HARMONY || APP-HARMONY
    reject(new Error('HarmonyOS分享仅支持HarmonyOS环境'))
    // #endif
  })
}

function h5CopyLink(url) {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          uni.showToast({ title: '链接已复制', icon: 'success' })
          resolve({ success: true, platform: 'h5-clipboard' })
        })
        .catch(() => {
          fallbackCopy(url, resolve, reject)
        })
    } else {
      fallbackCopy(url, resolve, reject)
    }
    // #endif

    // #ifndef H5
    reject(new Error('复制链接仅支持H5环境'))
    // #endif
  })
}

function fallbackCopy(text, resolve, reject) {
  // #ifdef H5
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    document.body.removeChild(textarea)
    uni.showToast({ title: '链接已复制', icon: 'success' })
    resolve({ success: true, platform: 'h5-clipboard-fallback' })
  } catch (err) {
    document.body.removeChild(textarea)
    showShareFailToast('复制失败')
    reject(new Error('复制失败'))
  }
  // #endif
}

function h5Share(options) {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const { title, desc, url, imageUrl } = options

    if (navigator.share) {
      navigator
        .share({
          title,
          text: desc,
          url,
        })
        .then(() => {
          resolve({ success: true, platform: 'h5-native' })
        })
        .catch((err) => {
          console.warn('[Share] H5 native share cancelled:', err)
          h5CopyLink(url).then(resolve).catch(reject)
        })
    } else {
      h5CopyLink(url).then(resolve).catch(reject)
    }
    // #endif

    // #ifndef H5
    reject(new Error('H5分享仅支持H5环境'))
    // #endif
  })
}

export function shareWebpage(options) {
  const provider = getShareProvider()

  switch (provider) {
    case 'weixin':
      return weixinShare(options)
    case 'alipay':
      return alipayShare(options)
    case 'baidu':
      return baiduShare(options)
    case 'toutiao':
      return toutiaoShare(options)
    case 'app':
      return appShare(options)
    case 'harmony':
      return harmonyShare(options)
    case 'h5':
      return h5Share(options)
    default:
      showShareFailToast('当前环境不支持分享')
      return Promise.reject(new Error('当前环境不支持分享功能'))
  }
}

export function shareImage(imageUrl) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.showShareImageMenu({
      url: imageUrl,
      success: () => {
        resolve({ success: true, platform: 'weixin-image' })
      },
      fail: (err) => {
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifdef MP-ALIPAY
    my.showSharePanel({
      imageUrl,
      success: () => {
        resolve({ success: true, platform: 'alipay-image' })
      },
      fail: (err) => {
        showShareFailToast('分享失败')
        reject(new Error(err.errorMessage || '分享失败'))
      },
    })
    // #endif

    // #ifdef MP-BAIDU
    swan.showShareImageMenu({
      url: imageUrl,
      success: () => {
        resolve({ success: true, platform: 'baidu-image' })
      },
      fail: (err) => {
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifdef MP-TOUTIAO
    tt.showShareImageMenu({
      url: imageUrl,
      success: () => {
        resolve({ success: true, platform: 'toutiao-image' })
      },
      fail: (err) => {
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifdef APP-PLUS
    uni.share({
      provider: 'weixin',
      type: 2,
      imageUrl,
      success: (res) => {
        resolve({ success: true, platform: 'app-image', ...res })
      },
      fail: (err) => {
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifdef MP-HARMONY || APP-HARMONY
    uni.share({
      provider: 'weixin',
      type: 2,
      imageUrl,
      success: (res) => {
        resolve({ success: true, platform: 'harmony-image', ...res })
      },
      fail: (err) => {
        showShareFailToast('分享失败')
        reject(new Error(err.errMsg || '分享失败'))
      },
    })
    // #endif

    // #ifdef H5
    h5CopyLink(imageUrl).then(resolve).catch(reject)
    // #endif

    // #ifndef H5 || MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || APP-PLUS || MP-HARMONY || APP-HARMONY
    showShareFailToast('当前环境不支持分享图片')
    reject(new Error('当前环境不支持分享图片'))
    // #endif
  })
}

export function isShareAvailable() {
  const provider = getShareProvider()

  if (provider === 'h5') {
    return typeof navigator !== 'undefined' && (navigator.share || document.execCommand)
  }
  if (provider === 'weixin') {
    return typeof wx !== 'undefined' && wx.showShareMenu
  }
  if (provider === 'alipay') {
    return typeof my !== 'undefined' && my.showSharePanel
  }
  if (provider === 'baidu') {
    return typeof swan !== 'undefined' && swan.showShareMenu
  }
  if (provider === 'toutiao') {
    return typeof tt !== 'undefined' && tt.showShareMenu
  }
  if (provider === 'app') {
    return typeof uni !== 'undefined' && uni.share
  }
  if (provider === 'harmony') {
    return typeof uni !== 'undefined' && uni.share
  }
  return false
}

export function getShareProvider() {
  // #ifdef MP-WEIXIN
  return 'weixin'
  // #endif
  // #ifdef MP-ALIPAY
  return 'alipay'
  // #endif
  // #ifdef MP-BAIDU
  return 'baidu'
  // #endif
  // #ifdef MP-TOUTIAO
  return 'toutiao'
  // #endif
  // #ifdef APP-PLUS
  return 'app'
  // #endif
  // #ifdef MP-HARMONY || APP-HARMONY
  return 'harmony'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
  return 'unknown'
}

export function getShareConfig(options) {
  const { title, desc, url, imageUrl } = options || {}

  // #ifdef MP-WEIXIN
  return {
    title: title || 'Gexm',
    desc: desc || '全平台应用系统',
    url: url || window.location.href,
    imageUrl: imageUrl || '',
  }
  // #endif

  // #ifndef MP-WEIXIN
  return {
    title: title || 'Gexm',
    desc: desc || '全平台应用系统',
    path: url || '/pages/index/index',
    imageUrl: imageUrl || '',
  }
  // #endif
}

export default {
  shareWebpage,
  shareImage,
  isShareAvailable,
  getShareConfig,
  getShareProvider,
}
