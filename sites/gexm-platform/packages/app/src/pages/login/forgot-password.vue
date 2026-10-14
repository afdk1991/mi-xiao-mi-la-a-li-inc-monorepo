<template>
  <view class="forgot-password-page">
    <gexm-nav-bar title="忘记密码" />

    <view class="content">
      <view class="form">
        <gexm-input
          v-model="form.email"
          label="邮箱"
          placeholder="请输入注册邮箱"
          :error="errors.email"
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
          v-model="form.newPassword"
          type="password"
          label="新密码"
          placeholder="请输入新密码（8位以上）"
          :error="errors.newPassword"
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
          @click="handleReset"
        >
          重置密码
        </gexm-button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { authApi } from '../../api'

const form = reactive({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})

const errors = reactive({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})

const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)

let countdownTimer = null

function validate() {
  let valid = true
  Object.keys(errors).forEach((k) => (errors[k] = ''))

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email) {
    errors.email = '请输入邮箱'
    valid = false
  } else if (!emailRegex.test(form.email)) {
    errors.email = '邮箱格式不正确'
    valid = false
  }

  if (!form.code) {
    errors.code = '请输入验证码'
    valid = false
  } else if (form.code.length !== 6) {
    errors.code = '验证码长度应为6位'
    valid = false
  }

  if (!form.newPassword) {
    errors.newPassword = '请输入新密码'
    valid = false
  } else if (form.newPassword.length < 8) {
    errors.newPassword = '密码长度不能少于8位'
    valid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    valid = false
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    valid = false
  }

  return valid
}

async function sendCode() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  if (!emailRegex.test(form.email)) {
    uni.showToast({ title: '邮箱格式不正确', icon: 'none' })
    return
  }

  sendingCode.value = true
  try {
    await authApi.requestPasswordReset(form.email)
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

async function handleReset() {
  if (!validate()) return

  loading.value = true
  try {
    await authApi.resetPassword({
      email: form.email,
      code: form.code,
      newPassword: form.newPassword,
    })

    uni.showToast({ title: '密码重置成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (err) {
    const msg = err?.message || err?.msg || '重置失败，请重试'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.forgot-password-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.content {
  padding: 32rpx;
}

.form {
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
</style>