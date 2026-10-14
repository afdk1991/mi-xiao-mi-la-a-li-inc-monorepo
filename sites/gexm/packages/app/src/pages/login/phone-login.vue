<template>
  <view class="phone-login-page">
    <gexm-nav-bar title="手机号登录" />

    <view class="login-content">
      <view class="login-form">
        <gexm-input
          v-model="form.phone"
          label="手机号"
          placeholder="请输入手机号"
          :error="errors.phone"
          maxlength="11"
        />

        <view class="code-input-wrapper">
          <gexm-input
            v-model="form.code"
            label="验证码"
            placeholder="请输入验证码"
            :error="errors.code"
            maxlength="6"
            style="flex: 1"
          />
          <gexm-button
            type="primary"
            size="small"
            :loading="sendingCode"
            :disabled="countdown > 0"
            @click="sendCode"
            class="code-button"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </gexm-button>
        </view>

        <gexm-input
          v-model="form.password"
          type="password"
          label="设置密码"
          placeholder="请设置密码（8位以上）"
          :error="errors.password"
          style="margin-top: 24rpx"
          v-if="isRegisterMode"
        />

        <gexm-input
          v-model="form.nickname"
          label="昵称"
          placeholder="请输入昵称"
          style="margin-top: 24rpx"
          v-if="isRegisterMode"
        />

        <gexm-button
          type="primary"
          size="large"
          block
          :loading="loading"
          style="margin-top: 48rpx"
          @click="handleSubmit"
        >
          {{ isRegisterMode ? '注册' : '登录' }}
        </gexm-button>

        <view class="mode-switch">
          <text>{{ isRegisterMode ? '已有账号？' : '还没有账号？' }}</text>
          <text class="mode-switch-link" @click="toggleMode">{{ isRegisterMode ? '立即登录' : '立即注册' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { authApi } from '../../api'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

const form = reactive({
  phone: '',
  code: '',
  password: '',
  nickname: '',
})

const errors = reactive({
  phone: '',
  code: '',
  password: '',
})

const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const isRegisterMode = ref(false)

let countdownTimer = null

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (currentPage?.options?.mode === 'register') {
    isRegisterMode.value = true
  }
})

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value
  form.code = ''
  form.password = ''
}

function validate() {
  let valid = true
  Object.keys(errors).forEach((k) => (errors[k] = ''))

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!form.phone) {
    errors.phone = '请输入手机号'
    valid = false
  } else if (!phoneRegex.test(form.phone)) {
    errors.phone = '手机号格式不正确'
    valid = false
  }

  if (!form.code) {
    errors.code = '请输入验证码'
    valid = false
  } else if (form.code.length !== 6) {
    errors.code = '验证码长度应为6位'
    valid = false
  }

  if (isRegisterMode.value) {
    if (!form.password) {
      errors.password = '请输入密码'
      valid = false
    } else if (form.password.length < 8) {
      errors.password = '密码长度不能少于8位'
      valid = false
    }
  }

  return valid
}

async function sendCode() {
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!form.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (!phoneRegex.test(form.phone)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return
  }

  sendingCode.value = true
  try {
    const type = isRegisterMode.value ? 'register' : 'login'
    await authApi.sendPhoneCode(form.phone, type)
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
    sendingCode.value = false
  }
}

async function handleSubmit() {
  if (!validate()) return

  loading.value = true
  try {
    let loginRes
    if (isRegisterMode.value) {
      loginRes = await authApi.phoneRegister({
        phone: form.phone,
        code: form.code,
        password: form.password,
        nickname: form.nickname,
      })
    } else {
      loginRes = await authApi.phoneLogin(form.phone, form.code)
    }

    userStore.setToken(loginRes.accessToken, loginRes.refreshToken)
    userStore.setUserInfo(loginRes.user)

    uni.showToast({ title: isRegisterMode.value ? '注册成功' : '登录成功', icon: 'success' })

    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1000)
  } catch (err) {
    const msg = err?.message || err?.msg || (isRegisterMode.value ? '注册失败' : '登录失败')
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.phone-login-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.login-content {
  padding: 32rpx;
}

.login-form {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: $shadow-sm;
}

.code-input-wrapper {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
}

.code-button {
  flex-shrink: 0;
  height: 88rpx;
  margin-top: 24rpx;
}

.mode-switch {
  text-align: center;
  margin-top: 32rpx;
  font-size: 28rpx;
  color: $text-color-secondary;

  &-link {
    color: $primary-color;
    margin-left: 8rpx;
  }
}
</style>