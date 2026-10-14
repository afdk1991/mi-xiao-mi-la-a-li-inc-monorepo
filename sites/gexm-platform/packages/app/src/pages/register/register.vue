<template>
  <view class="register-page">
    <gexm-nav-bar title="注册账号" />

    <view class="register-content">
      <view class="register-form">
        <gexm-input
          v-model="form.username"
          label="用户名"
          placeholder="请输入用户名"
          :error="errors.username"
        />

        <view class="email-input-wrapper">
          <gexm-input
            v-model="form.email"
            label="邮箱"
            placeholder="请输入邮箱地址"
            :error="errors.email"
            style="flex: 1"
          />
          <gexm-button
            type="primary"
            size="small"
            :loading="sendingEmailCode"
            :disabled="countdown > 0"
            @click="sendEmailCode"
            class="code-button"
            v-if="showEmailCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </gexm-button>
        </view>

        <gexm-input
          v-model="form.emailCode"
          label="邮箱验证码"
          placeholder="请输入邮箱验证码"
          :error="errors.emailCode"
          style="margin-top: 24rpx"
          v-if="showEmailCode"
        />

        <gexm-input
          v-model="form.nickname"
          label="昵称"
          placeholder="请输入昵称（选填）"
          style="margin-top: 24rpx"
        />

        <gexm-input
          v-model="form.phone"
          label="手机号"
          placeholder="请输入手机号（选填）"
          :error="errors.phone"
          style="margin-top: 24rpx"
        />

        <gexm-input
          v-model="form.password"
          type="password"
          label="密码"
          placeholder="请输入密码（8-20位）"
          :error="errors.password"
          style="margin-top: 24rpx"
        />

        <gexm-input
          v-model="form.confirmPassword"
          type="password"
          label="确认密码"
          placeholder="请再次输入密码"
          :error="errors.confirmPassword"
          style="margin-top: 24rpx"
        />

        <gexm-button
          type="primary"
          size="large"
          block
          :loading="loading"
          style="margin-top: 48rpx"
          @click="handleRegister"
        >
          注册
        </gexm-button>

        <view class="register-login">
          <text>已有账号？</text>
          <text class="register-login-link" @click="goLogin">立即登录</text>
        </view>

        <view class="register-mode-switch">
          <text>使用手机号注册？</text>
          <text class="register-mode-switch-link" @click="goPhoneRegister">点击跳转</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authApi } from '../../api'
import { useUserStore } from '../../store/user'
import { isValidEmail, isValidPhone } from '../../utils'

const userStore = useUserStore()

const form = reactive({
  username: '',
  email: '',
  emailCode: '',
  nickname: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  username: '',
  email: '',
  emailCode: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const sendingEmailCode = ref(false)
const countdown = ref(0)
const showEmailCode = ref(true)
const redirectUrl = ref('')

let countdownTimer = null

onLoad((options) => {
  if (options.redirect) {
    redirectUrl.value = decodeURIComponent(options.redirect)
  }
})

function validate() {
  let valid = true
  Object.keys(errors).forEach((k) => (errors[k] = ''))

  if (!form.username) {
    errors.username = '请输入用户名'
    valid = false
  } else if (form.username.length < 3 || form.username.length > 20) {
    errors.username = '用户名长度应为3-20个字符'
    valid = false
  }

  if (!form.email) {
    errors.email = '请输入邮箱'
    valid = false
  } else if (!isValidEmail(form.email)) {
    errors.email = '邮箱格式不正确'
    valid = false
  }

  if (showEmailCode.value) {
    if (!form.emailCode) {
      errors.emailCode = '请输入邮箱验证码'
      valid = false
    } else if (form.emailCode.length !== 6) {
      errors.emailCode = '验证码长度应为6位'
      valid = false
    }
  }

  if (form.phone && !isValidPhone(form.phone)) {
    errors.phone = '手机号格式不正确'
    valid = false
  }

  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (form.password.length < 8) {
    errors.password = '密码长度不能少于8位'
    valid = false
  } else if (form.password.length > 20) {
    errors.password = '密码长度不能超过20位'
    valid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    valid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    valid = false
  }

  return valid
}

async function sendEmailCode() {
  if (!form.email) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  if (!isValidEmail(form.email)) {
    uni.showToast({ title: '邮箱格式不正确', icon: 'none' })
    return
  }

  sendingEmailCode.value = true
  try {
    await authApi.sendEmailCode(form.email, 'register')
    uni.showToast({ title: '验证码已发送', icon: 'success' })

    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer)
      }
    }, 1000)
  } catch (err) {
    const msg = err?.message || err?.msg || '发送失败，请重试'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    sendingEmailCode.value = false
  }
}

async function handleRegister() {
  if (!validate()) return

  loading.value = true
  try {
    const registerData = {
      username: form.username,
      email: form.email,
      password: form.password,
      nickname: form.nickname,
      phone: form.phone,
    }

    if (showEmailCode.value && form.emailCode) {
      registerData.emailCode = form.emailCode
    }

    const registerRes = await authApi.register(registerData)

    uni.showToast({ title: '注册成功', icon: 'success' })

    userStore.setToken(registerRes.accessToken, registerRes.refreshToken)
    userStore.setUserInfo(registerRes.user)

    setTimeout(() => {
      if (redirectUrl.value) {
        uni.redirectTo({ url: redirectUrl.value })
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }, 1000)
  } catch (err) {
    console.error('Register failed:', err)
    const msg = err?.message || err?.msg || '注册失败，请重试'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goLogin() {
  uni.navigateBack()
}

function goPhoneRegister() {
  uni.navigateTo({ url: '/pages/login/phone-login?mode=register' })
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.register-content {
  padding: 32rpx;
}

.register-form {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: $shadow-sm;
}

.email-input-wrapper {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
}

.code-button {
  flex-shrink: 0;
  height: 88rpx;
  margin-top: 0;
}

.register-login {
  text-align: center;
  margin-top: 32rpx;
  font-size: 28rpx;
  color: $text-color-secondary;

  &-link {
    color: $primary-color;
    margin-left: 8rpx;
  }
}

.register-mode-switch {
  text-align: center;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $border-color-lighter;
  font-size: 26rpx;
  color: $text-color-secondary;

  &-link {
    color: $primary-color;
    margin-left: 8rpx;
  }
}
</style>
