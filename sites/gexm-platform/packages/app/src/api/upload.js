import { useUserStore } from '../store/user'
import { useAppStore } from '../store/app'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getAuthHeader() {
  const userStore = useUserStore()
  const header = {}
  if (userStore.token) {
    header.Authorization = `Bearer ${userStore.token}`
  }
  return header
}

function handleUploadResponse(res, resolve, reject, showError = true) {
  const appStore = useAppStore()
  appStore.hideLoading()

  try {
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    if (data.code === 0) {
      resolve(data.data)
    } else if (data.code === 1007 || data.code === 1008) {
      handleTokenExpired()
      reject(data)
    } else {
      if (showError) {
        uni.showToast({ title: data.message || '上传失败', icon: 'none' })
      }
      reject(data)
    }
  } catch (e) {
    if (showError) {
      uni.showToast({ title: '解析响应失败', icon: 'none' })
    }
    reject(e)
  }
}

function handleUploadFail(err, reject, showError = true) {
  const appStore = useAppStore()
  appStore.hideLoading()

  if (!appStore.isOnline) {
    if (showError) {
      uni.showToast({ title: '网络连接不可用', icon: 'none' })
    }
  } else if (showError) {
    uni.showToast({ title: '上传失败', icon: 'none' })
  }
  reject(err)
}

async function handleTokenExpired() {
  const userStore = useUserStore()

  if (userStore.refreshToken) {
    try {
      const res = await new Promise((resolve, reject) => {
        uni.request({
          url: BASE_URL + '/auth/refresh',
          method: 'POST',
          data: { refreshToken: userStore.refreshToken },
          success: (res) => {
            if (res.statusCode === 200 && res.data.code === 0) {
              resolve(res.data.data)
            } else {
              reject(res.data)
            }
          },
          fail: reject,
        })
      })

      if (res.accessToken) {
        userStore.setToken(res.accessToken, res.refreshToken)
      }
    } catch {
      userStore.logout()
      uni.reLaunch({ url: '/pages/login/login' })
    }
  } else {
    userStore.logout()
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

/**
 * 压缩图片，减少上传体积
 * 仅对大于 500KB 的图片进行压缩
 * @param {string} filePath - 原始图片路径
 * @returns {Promise<string>} 压缩后的图片路径
 */
function compressImage(filePath) {
  return new Promise((resolve) => {
    uni.getImageInfo({
      src: filePath,
      success: (info) => {
        // 小于 500KB 不压缩
        if (info.size && info.size < 500 * 1024) {
          resolve(filePath)
          return
        }
        uni.compressImage({
          src: filePath,
          quality: 80,
          compressedWidth: Math.min(info.width, 1280),
          success: (res) => resolve(res.tempFilePath),
          fail: () => resolve(filePath),
        })
      },
      fail: () => resolve(filePath),
    })
  })
}

export const uploadApi = {
  async uploadImage(filePath) {
    const appStore = useAppStore()
    appStore.showLoading('上传中...')

    // 压缩图片
    const compressedPath = await compressImage(filePath)

    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_URL}/upload/image`,
        filePath: compressedPath,
        name: 'image',
        header: getAuthHeader(),
        success: (res) => handleUploadResponse(res, resolve, reject),
        fail: (err) => handleUploadFail(err, reject),
      })
    })
  },

  async uploadFile(filePath, fileName) {
    const appStore = useAppStore()
    appStore.showLoading('上传中...')

    // 压缩图片类文件
    const compressedPath = await compressImage(filePath)

    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_URL}/upload/file`,
        filePath: compressedPath,
        name: 'file',
        header: getAuthHeader(),
        formData: fileName ? { fileName } : {},
        success: (res) => handleUploadResponse(res, resolve, reject),
        fail: (err) => handleUploadFail(err, reject),
      })
    })
  },
}

export default uploadApi
