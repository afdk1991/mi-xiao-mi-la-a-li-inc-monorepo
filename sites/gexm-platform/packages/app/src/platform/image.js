/**
 * 平台图片处理适配层
 * 统一封装 chooseImage / previewImage / getImageInfo / 保存图片的差异
 *
 * @example
 * import { image } from '@/platform';
 * const res = await image.chooseImage({ count: 9 });
 * image.previewImage({ urls: ['...'], current: 0 });
 */

/**
 * 选择图片
 * @param {Object} options
 * @param {number} options.count - 选择数量
 * @param {Array<string>} options.sourceType -图片来源 ['album', 'camera']
 * @param {Array<string>} options.sizeType - 图片大小 ['original', 'compressed']
 */
export function chooseImage(options = {}) {
  const {
    count = 9,
    sourceType = ['album', 'camera'],
    sizeType = ['original', 'compressed'],
  } = options

  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      sourceType,
      sizeType,
      success: (res) => {
        const tempFiles = res.tempFiles.map((file) => ({
          path: file.tempFilePath,
          size: file.size,
          width: file.width,
          height: file.height,
          type: file.fileType,
          name: file.tempFilePath.split('/').pop(),
        }))
        resolve({ success: true, tempFiles, tempFilePaths: res.tempFilePaths })
      },
      fail: (err) => reject(new Error(err.errMsg || '选择图片失败')),
    })
  })
  // #endif

  // #ifdef MP-ALIPAY
  return new Promise((resolve, reject) => {
    my.chooseImage({
      count,
      sourceType,
      success: (res) => {
        const tempFiles = res.apFilePaths.map((path, index) => ({
          path,
          size: 0,
          name: path.split('/').pop(),
        }))
        resolve({ success: true, tempFiles, tempFilePaths: res.apFilePaths })
      },
      fail: (err) => reject(new Error(err.errorMessage || '选择图片失败')),
    })
  })
  // #endif

  // #ifdef MP-BAIDU
  return new Promise((resolve, reject) => {
    swan.chooseImage({
      count,
      sourceType,
      sizeType,
      success: (res) => {
        const tempFiles = res.tempFiles.map((file) => ({
          path: file.tempFilePath,
          size: file.size,
          width: file.width,
          height: file.height,
          name: file.tempFilePath.split('/').pop(),
        }))
        resolve({ success: true, tempFiles, tempFilePaths: res.tempFilePaths })
      },
      fail: (err) => reject(new Error(err.errMsg || '选择图片失败')),
    })
  })
  // #endif

  // #ifdef MP-TOUTIAO
  return new Promise((resolve, reject) => {
    tt.chooseImage({
      count,
      sourceType,
      sizeType,
      success: (res) => {
        const tempFiles = res.tempFiles.map((file) => ({
          path: file.tempFilePath,
          size: file.size,
          width: file.width,
          height: file.height,
          name: file.tempFilePath.split('/').pop(),
        }))
        resolve({ success: true, tempFiles, tempFilePaths: res.tempFilePaths })
      },
      fail: (err) => reject(new Error(err.errMsg || '选择图片失败')),
    })
  })
  // #endif

  // #ifdef H5
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = count > 1
    input.onchange = (e) => {
      const files = Array.from(e.target.files)
      const tempFiles = files.map((file) => ({
        path: URL.createObjectURL(file),
        size: file.size,
        name: file.name,
        type: file.type,
        file,
      }))
      resolve({ success: true, tempFiles })
    }
    input.onerror = () => reject(new Error('选择图片失败'))
    input.click()
  })
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sourceType,
      sizeType,
      success: (res) => {
        const tempFiles = res.tempFiles.map((file) => ({
          path: file.path,
          size: file.size,
          name: file.name || file.path.split('/').pop(),
        }))
        resolve({ success: true, tempFiles, tempFilePaths: res.tempFilePaths })
      },
      fail: (err) => reject(new Error(err.errMsg || '选择图片失败')),
    })
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sourceType,
      sizeType,
      success: (res) => {
        const tempFiles = res.tempFiles.map((file) => ({
          path: file.path,
          size: file.size,
          name: file.name || file.path.split('/').pop(),
        }))
        resolve({ success: true, tempFiles, tempFilePaths: res.tempFilePaths })
      },
      fail: (err) => reject(new Error(err.errMsg || '选择图片失败')),
    })
  })
  // #endif

  return Promise.reject(new Error('当前环境不支持选择图片'))
}

/**
 * 预览图片
 * @param {Object} options
 * @param {Array<string>} options.urls - 图片URL列表
 * @param {number|string} options.current - 当前显示图片索引或URL
 */
export function previewImage(options = {}) {
  const { urls = [], current = 0 } = options

  // #ifdef MP-WEIXIN
  wx.previewImage({
    urls,
    current: typeof current === 'number' ? urls[current] : current,
    success: () => ({ success: true }),
    fail: (err) => ({ success: false, error: err.errMsg }),
  })
  // #endif

  // #ifdef MP-ALIPAY
  my.previewImage({
    urls,
    current: typeof current === 'number' ? urls[current] : current,
    success: () => ({ success: true }),
    fail: (err) => ({ success: false, error: err.errorMessage }),
  })
  // #endif

  // #ifdef MP-BAIDU
  swan.previewImage({
    urls,
    current: typeof current === 'number' ? urls[current] : current,
    success: () => ({ success: true }),
    fail: (err) => ({ success: false, error: err.errMsg }),
  })
  // #endif

  // #ifdef MP-TOUTIAO
  tt.previewImage({
    urls,
    current: typeof current === 'number' ? urls[current] : current,
    success: () => ({ success: true }),
    fail: (err) => ({ success: false, error: err.errMsg }),
  })
  // #endif

  // #ifdef H5
  // H5 使用图片查看器
  // 简单的全屏预览实现
  if (typeof window !== 'undefined') {
    const currentUrl = typeof current === 'number' ? urls[current] : current
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9); z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    `
    const img = document.createElement('img')
    img.src = currentUrl
    img.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain;'
    img.onclick = (e) => e.stopPropagation()
    overlay.appendChild(img)
    overlay.onclick = () => {
      document.body.removeChild(overlay)
      overlay.remove()
    }
    // ESC 关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.click()
        document.removeEventListener('keydown', escHandler)
      }
    }
    document.addEventListener('keydown', escHandler)
    document.body.appendChild(overlay)
  }
  return Promise.resolve({ success: true })
  // #endif

  // #ifdef APP-PLUS
  uni.previewImage({
    urls,
    current: typeof current === 'number' ? urls[current] : current,
    success: () => ({ success: true }),
    fail: (err) => ({ success: false, error: err.errMsg }),
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  uni.previewImage({
    urls,
    current: typeof current === 'number' ? urls[current] : current,
    success: () => ({ success: true }),
    fail: (err) => ({ success: false, error: err.errMsg }),
  })
  // #endif

  return Promise.resolve({ success: false, error: 'unsupported' })
}

/**
 * 获取图片信息
 * @param {string} src - 图片路径
 */
export function getImageInfo(src) {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: (res) =>
        resolve({ success: true, width: res.width, height: res.height, path: res.path }),
      fail: (err) => reject(new Error(err.errMsg || '获取图片信息失败')),
    })
  })
  // #endif

  // #ifdef MP-ALIPAY
  return new Promise((resolve, reject) => {
    my.getImageInfo({
      src,
      success: (res) =>
        resolve({ success: true, width: res.width, height: res.height, path: res.path }),
      fail: (err) => reject(new Error(err.errorMessage || '获取图片信息失败')),
    })
  })
  // #endif

  // #ifdef MP-BAIDU
  return new Promise((resolve, reject) => {
    swan.getImageInfo({
      src,
      success: (res) =>
        resolve({ success: true, width: res.width, height: res.height, path: res.path }),
      fail: (err) => reject(new Error(err.errMsg || '获取图片信息失败')),
    })
  })
  // #endif

  // #ifdef MP-TOUTIAO
  return new Promise((resolve, reject) => {
    tt.getImageInfo({
      src,
      success: (res) =>
        resolve({ success: true, width: res.width, height: res.height, path: res.path }),
      fail: (err) => reject(new Error(err.errMsg || '获取图片信息失败')),
    })
  })
  // #endif

  // #ifdef H5
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        success: true,
        width: img.naturalWidth,
        height: img.naturalHeight,
        path: src,
      })
    }
    img.onerror = () => reject(new Error('获取图片信息失败'))
    img.src = src
  })
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: (res) =>
        resolve({ success: true, width: res.width, height: res.height, path: res.path }),
      fail: (err) => reject(new Error(err.errMsg || '获取图片信息失败')),
    })
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: (res) =>
        resolve({ success: true, width: res.width, height: res.height, path: res.path }),
      fail: (err) => reject(new Error(err.errMsg || '获取图片信息失败')),
    })
  })
  // #endif

  return Promise.reject(new Error('当前环境不支持获取图片信息'))
}

/**
 * 保存图片到相册
 * @param {string} filePath - 图片路径
 */
export function saveImageToPhotos(filePath) {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve({ success: true }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          // 引导用户授权
          wx.openSetting()
        }
        reject(new Error(err.errMsg || '保存图片失败'))
      },
    })
  })
  // #endif

  // #ifdef MP-ALIPAY
  return new Promise((resolve, reject) => {
    my.saveImage({
      url: filePath,
      showActionSheet: true,
      success: () => resolve({ success: true }),
      fail: (err) => reject(new Error(err.errorMessage || '保存图片失败')),
    })
  })
  // #endif

  // #ifdef MP-BAIDU
  return new Promise((resolve, reject) => {
    swan.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve({ success: true }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          swan.openSetting()
        }
        reject(new Error(err.errMsg || '保存图片失败'))
      },
    })
  })
  // #endif

  // #ifdef MP-TOUTIAO
  return new Promise((resolve, reject) => {
    tt.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve({ success: true }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          tt.openSetting()
        }
        reject(new Error(err.errMsg || '保存图片失败'))
      },
    })
  })
  // #endif

  // #ifdef H5
  return new Promise((resolve, reject) => {
    const link = document.createElement('a')
    link.download = filePath.split('/').pop() || 'image.png'
    link.href = filePath
    link.click()
    resolve({ success: true })
  })
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve({ success: true }),
      fail: (err) => reject(new Error(err.errMsg || '保存图片失败')),
    })
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve({ success: true }),
      fail: (err) => reject(new Error(err.errMsg || '保存图片失败')),
    })
  })
  // #endif

  return Promise.reject(new Error('当前环境不支持保存图片'))
}

/**
 * 压缩图片
 * @param {string} src - 图片路径
 * @param {Object} options - 压缩选项
 */
export function compressImage(src, options = {}) {
  const { quality = 80, format = 'jpg' } = options

  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      quality,
      format,
      success: (res) => resolve({ success: true, tempFilePath: res.tempFilePath }),
      fail: (err) => reject(new Error(err.errMsg || '压缩图片失败')),
    })
  })
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    plus.zip.compressImage(
      {
        src,
        dst: src.replace(/\.[^.]+$/, `_compressed.${format}`),
        quality,
        format,
      },
      (res) => resolve({ success: true, tempFilePath: res.target }),
      (err) => reject(new Error(err.message || '压缩图片失败'))
    )
  })
  // #endif

  // #ifdef H5
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.naturalWidth * (quality / 100)
      canvas.height = img.naturalHeight * (quality / 100)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          const url = URL.createObjectURL(blob)
          resolve({ success: true, tempFilePath: url })
        },
        `image/${format}`,
        quality / 100
      )
    }
    img.onerror = () => reject(new Error('压缩图片失败'))
    img.src = src
  })
  // #endif

  // #ifdef MP-HARMONY || APP-HARMONY
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality,
      format,
      success: (res) => resolve({ success: true, tempFilePath: res.tempFilePath }),
      fail: (err) => reject(new Error(err.errMsg || '压缩图片失败')),
    })
  })
  // #endif

  return Promise.reject(new Error('当前环境不支持压缩图片'))
}

/**
 * 检查图片加载状态
 */
export function checkImageLoad(src) {
  return new Promise((resolve) => {
    // #ifdef H5
    const img = new Image()
    img.onload = () => resolve({ loaded: true, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ loaded: false })
    img.src = src
    // #endif

    // #ifndef H5
    getImageInfo(src)
      .then((info) => resolve({ loaded: true, width: info.width, height: info.height }))
      .catch(() => resolve({ loaded: false }))
    // #endif
  })
}

export default {
  chooseImage,
  previewImage,
  getImageInfo,
  saveImageToPhotos,
  compressImage,
  checkImageLoad,
}
