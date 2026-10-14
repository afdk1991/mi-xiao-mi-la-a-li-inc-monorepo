<template>
  <view class="oauth-callback">
    <view class="oauth-loading">
      <view class="loading-icon">🔄</view>
      <text class="loading-text">正在验证身份...</text>
    </view>
  </view>
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app'
import { authApi } from '../../api'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

function parseUrlParams(url) {
  const params = {}
  if (!url) return params

  const urlObj = new URL(url.startsWith('http') ? url : `http://localhost/${url}`)
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}

function getAuthParams(options) {
  let code = ''
  let state = ''

  if (options.code) {
    code = String(options.code)
  }
  if (options.state) {
    state = String(options.state)
  }

  if (!code) {
    const urlParam = options.url || options.$url || ''
    const urlParams = parseUrlParams(String(urlParam))
    if (urlParams.code) {
      code = urlParams.code
    }
    if (urlParams.state) {
      state = urlParams.state
    }
  }

  return { code, state }
}

onLoad(async (options) => {
    const { code, state } = getAuthParams(options)

  if (!code) {
    uni.showToast({ title: '授权失败', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }

  const provider = uni.getStorageSync('oauth_provider') || ''
  const storedState = uni.getStorageSync('oauth_state') || ''
  const redirectUrl = uni.getStorageSync('oauth_redirect') || ''

  if (!provider) {
    uni.showToast({ title: '登录状态丢失', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }

  try {
    const loginRes = await authApi.oauthCallback(provider, code, state || storedState)

    userStore.setToken(loginRes.accessToken, loginRes.refreshToken)

    let userInfo = loginRes.user
    try {
      const profileRes = await authApi.getProfile()
      userInfo = profileRes
    } catch (e) {
      console.warn('Failed to get profile:', e)
    }

    userStore.setUserInfo(userInfo)

    uni.showToast({ title: loginRes.isNewUser ? '注册并登录成功' : '登录成功', icon: 'success' })

    setTimeout(() => {
      if (redirectUrl) {
        uni.redirectTo({ url: redirectUrl })
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }, 1000)
  } catch (err) {
    console.error('OAuth callback failed:', err)
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})
</script>

<style lang="scss" scoped>
.oauth-callback {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oauth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.loading-icon {
  font-size: 80rpx;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 32rpx;
  color: $text-color-secondary;
}
</style>