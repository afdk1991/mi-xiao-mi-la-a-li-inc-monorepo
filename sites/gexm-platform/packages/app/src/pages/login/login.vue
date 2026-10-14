<template>
  <view class="login-page">
    <view class="login-header">
      <view class="login-logo">G</view>
      <text class="login-title">欢迎使用 Gexm</text>
      <text class="login-subtitle">全平台统一体验</text>
    </view>

    <view class="login-form">
      <gexm-input
        v-model="form.username"
        placeholder="请输入用户名/邮箱"
        :error="errors.username"
      />

      <gexm-input
        v-model="form.password"
        type="password"
        placeholder="请输入密码"
        :error="errors.password"
        style="margin-top: 24rpx"
      />

      <view class="login-options">
        <view class="login-remember">
          <checkbox :checked="remember" @change="remember = !remember" />
          <text>记住密码</text>
        </view>
        <text class="login-forgot" @click="goForgotPassword">忘记密码？</text>
      </view>

      <gexm-button
        type="primary"
        size="large"
        block
        :loading="loading"
        style="margin-top: 48rpx"
        @click="handleLogin"
      >
        登录
      </gexm-button>

      <view class="login-register">
        <text>还没有账号？</text>
        <text class="login-register-link" @click="goRegister">立即注册</text>
      </view>

      <view class="login-third-party">
        <view class="login-third-party__divider">
          <view class="divider-line" />
          <text class="divider-text">其他登录方式</text>
          <view class="divider-line" />
        </view>
        <view class="login-third-party__list">
          <view class="third-party-item" @click="handleOAuthLogin('wechat')">
            <view class="third-party-icon third-party-icon--wechat">💬</view>
            <text class="third-party-text">微信</text>
          </view>
          <view class="third-party-item" @click="handleOAuthLogin('qq')">
            <view class="third-party-icon third-party-icon--qq">🐧</view>
            <text class="third-party-text">QQ</text>
          </view>
          <view class="third-party-item" @click="handleOAuthLogin('weibo')">
            <view class="third-party-icon third-party-icon--weibo">🌊</view>
            <text class="third-party-text">微博</text>
          </view>
          <view class="third-party-item" @click="handleOAuthLogin('alipay')">
            <view class="third-party-icon third-party-icon--alipay">💳</view>
            <text class="third-party-text">支付宝</text>
          </view>
          <view class="third-party-item" @click="handleOAuthLogin('google')">
            <view class="third-party-icon third-party-icon--google">🔷</view>
            <text class="third-party-text">Google</text>
          </view>
          <view class="third-party-item" @click="handleOAuthLogin('facebook')">
            <view class="third-party-icon third-party-icon--facebook">📘</view>
            <text class="third-party-text">Facebook</text>
          </view>
          <view class="third-party-item" @click="handleOAuthLogin('twitter')">
            <view class="third-party-icon third-party-icon--twitter">🐦</view>
            <text class="third-party-text">Twitter</text>
          </view>
          <view class="third-party-item" @click="handlePhoneLogin">
            <view class="third-party-icon third-party-icon--phone">📱</view>
            <text class="third-party-text">手机号</text>
          </view>
        </view>
      </view>
    </view>

    <view class="login-footer">
      <text class="login-agreement">
        登录即表示您同意
        <text class="login-link">《用户协议》</text>
        和
        <text class="login-link">《隐私政策》</text>
      </text>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import { authApi } from '../../api'

const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
})

const errors = reactive({
  username: '',
  password: '',
})

const loading = ref(false)
const remember = ref(false)
const redirectUrl = ref('')

onLoad((options) => {
  if (options.redirect) {
    redirectUrl.value = decodeURIComponent(options.redirect)
  }
})

function validate() {
  let valid = true
  errors.username = ''
  errors.password = ''

  if (!form.username) {
    errors.username = '请输入用户名或邮箱'
    valid = false
  }

  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (form.password.length < 6) {
    errors.password = '密码长度不能少于6位'
    valid = false
  }

  return valid
}

async function handleLogin() {
  if (!validate()) return

  loading.value = true
  try {
    const loginRes = await authApi.login({
      username: form.username,
      password: form.password,
    })

    userStore.setToken(loginRes.accessToken, loginRes.refreshToken)

    let userInfo = loginRes.user
    try {
      const profileRes = await authApi.getProfile()
      userInfo = profileRes
    } catch (e) {
      console.warn('Failed to get profile, using login response user info:', e)
    }

    userStore.setUserInfo(userInfo)

    uni.showToast({ title: '登录成功', icon: 'success' })

    setTimeout(() => {
      if (redirectUrl.value) {
        uni.redirectTo({ url: redirectUrl.value })
      } else {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        } else {
          uni.switchTab({ url: '/pages/index/index' })
        }
      }
    }, 1000)
  } catch (err) {
    console.error('Login failed:', err)
    const msg = err?.message || err?.msg || '登录失败，请检查账号密码'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goRegister() {
  const url = redirectUrl.value
    ? `/pages/register/register?redirect=${encodeURIComponent(redirectUrl.value)}`
    : '/pages/register/register'
  uni.navigateTo({ url })
}

function goForgotPassword() {
    uni.navigateTo({ url: '/pages/login/forgot-password' })
  }

async function handleOAuthLogin(provider) {
  const platformNames = {
    wechat: '微信',
    qq: 'QQ',
    weibo: '微博',
    alipay: '支付宝',
    google: 'Google',
    facebook: 'Facebook',
    twitter: 'Twitter',
  }
  
  const platformName = platformNames[provider] || provider

  if (provider === 'wechat' && typeof wx !== 'undefined' && wx.login) {
    loading.value = true
    try {
      const res = await uni.login({ provider: 'weixin' })
      if (res.code) {
        const loginRes = await authApi.oauthLogin('wechat', res.code)
        await completeLogin(loginRes)
      } else {
        uni.showToast({ title: `${platformName}登录失败`, icon: 'none' })
      }
    } catch (err) {
      console.error(`${platformName} login failed:`, err)
      uni.showToast({ title: `${platformName}登录失败，请重试`, icon: 'none' })
    } finally {
      loading.value = false
    }
  } else {
    try {
      const authRes = await authApi.oauthAuthorize(provider)
      if (authRes.authUrl) {
        uni.setStorageSync('oauth_state', authRes.state)
        uni.setStorageSync('oauth_provider', provider)
        uni.setStorageSync('oauth_redirect', redirectUrl.value)
        uni.navigateTo({ url: `/pages/login/oauth-callback?url=${encodeURIComponent(authRes.authUrl)}` })
      }
    } catch (err) {
      console.error(`${platformName} authorize failed:`, err)
      uni.showToast({ title: `获取${platformName}授权失败`, icon: 'none' })
    }
  }
}

async function handlePhoneLogin() {
  uni.navigateTo({ url: '/pages/login/phone-login' })
}

async function completeLogin(loginRes) {
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
    if (redirectUrl.value) {
      uni.redirectTo({ url: redirectUrl.value })
    } else {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }
  }, 1000)
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, $primary-color 0%, $bg-color-page 60%);
  padding: 120rpx 48rpx 48rpx;
  display: flex;
  flex-direction: column;
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;

  &-logo {
    width: 160rpx;
    height: 160rpx;
    background: #fff;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 32rpx;
    font-size: 80rpx;
    font-weight: bold;
    color: $primary-color;
    box-shadow: 0 8rpx 32rpx rgba(64, 158, 255, 0.3);
  }

  &-title {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 12rpx;
  }

  &-subtitle {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.login-form {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  box-shadow: $shadow-base;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24rpx;
  font-size: 26rpx;
  color: $text-color-secondary;
}

.login-remember {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.login-forgot {
  color: $primary-color;
}

.login-register {
  text-align: center;
  margin-top: 32rpx;
  font-size: 28rpx;
  color: $text-color-secondary;

  &-link {
    color: $primary-color;
    margin-left: 8rpx;
  }
}

.login-third-party {
  margin-top: 48rpx;

  &__divider {
    display: flex;
    align-items: center;
    margin-bottom: 32rpx;
  }

  &__list {
    display: flex;
    justify-content: center;
    gap: 64rpx;
  }
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: $border-color-lighter;
}

.divider-text {
  padding: 0 24rpx;
  font-size: 24rpx;
  color: $text-color-placeholder;
}

.third-party-item {
  display: flex;
  flex-direction: column;
  align-items: center;

  &:active {
    opacity: 0.7;
  }
}

.third-party-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-bottom: 12rpx;

  &--wechat {
    background: rgba(7, 193, 96, 0.1);
  }

  &--qq {
    background: rgba(18, 183, 245, 0.1);
  }

  &--phone {
    background: rgba(255, 107, 53, 0.1);
  }
}

.third-party-text {
  font-size: 22rpx;
  color: $text-color-secondary;
}

.login-footer {
  margin-top: auto;
  text-align: center;

  &-agreement {
    font-size: 24rpx;
    color: $text-color-placeholder;
    line-height: 1.6;
  }

  &-link {
    color: $primary-color;
  }
}
</style>
