<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api'
import { ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'

const router = useRouter()

const form = reactive({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})

const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null

async function sendCode() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email) {
    ElMessage.error('请输入邮箱')
    return
  }
  if (!emailRegex.test(form.email)) {
    ElMessage.error('邮箱格式不正确')
    return
  }

  sendingCode.value = true
  try {
    await authApi.requestPasswordReset(form.email)
    ElMessage.success('验证码已发送')

    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
      }
    }, 1000)
  } catch (err) {
    const msg = (err as { message?: string })?.message || '发送失败，请重试'
    ElMessage.error(msg)
  } finally {
    sendingCode.value = false
  }
}

async function handleReset() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email || !emailRegex.test(form.email)) {
    ElMessage.error('请输入正确的邮箱')
    return
  }
  if (!form.code || form.code.length !== 6) {
    ElMessage.error('请输入6位验证码')
    return
  }
  if (!form.newPassword || form.newPassword.length < 8) {
    ElMessage.error('密码长度不能少于8位')
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    await authApi.resetPassword({
      email: form.email,
      code: form.code,
      newPassword: form.newPassword,
    })

    ElMessage.success('密码重置成功')
    setTimeout(() => {
      router.push('/login')
    }, 1000)
  } catch (err) {
    const msg = (err as { message?: string })?.message || '重置失败，请重试'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function goLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="forgot-password-page">
    <div class="login-bg"></div>
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">
            <span class="logo-icon">G</span>
            <span class="logo-text">Gexm</span>
          </div>
          <h2 class="login-title">忘记密码</h2>
          <p class="login-subtitle">通过邮箱找回您的账号</p>
        </div>

        <ElForm class="login-form" :model="form">
          <ElFormItem prop="email">
            <ElInput
              v-model="form.email"
              placeholder="请输入注册邮箱"
              size="large"
              prefix-icon="Message"
            />
          </ElFormItem>

          <ElFormItem prop="code">
            <div class="email-input-wrapper">
              <ElInput
                v-model="form.code"
                placeholder="请输入验证码"
                size="large"
                prefix-icon="Verification"
                maxlength="6"
              />
              <ElButton
                type="primary"
                size="large"
                :loading="sendingCode"
                :disabled="countdown > 0"
                @click="sendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </ElButton>
            </div>
          </ElFormItem>

          <ElFormItem prop="newPassword">
            <ElInput
              v-model="form.newPassword"
              type="password"
              placeholder="请输入新密码（8位以上）"
              size="large"
              prefix-icon="Lock"
              show-password
            />
          </ElFormItem>

          <ElFormItem prop="confirmPassword">
            <ElInput
              v-model="form.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              size="large"
              prefix-icon="Lock"
              show-password
            />
          </ElFormItem>

          <ElButton type="primary" size="large" class="login-btn" :loading="loading" @click="handleReset">
            重置密码
          </ElButton>

          <div class="login-footer">
            <span class="login-switch" @click="goLogin">返回登录</span>
          </div>
        </ElForm>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.forgot-password-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 0 24px;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  font-weight: bold;
}

.logo-text {
  font-size: 28px;
  font-weight: bold;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #909399;
}

.login-form {
  width: 100%;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
}

.email-input-wrapper {
  display: flex;
  gap: 12px;
}

.email-input-wrapper :deep(.el-input) {
  flex: 1;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
}

.login-switch {
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s;
}

.login-switch:hover {
  color: #764ba2;
}
</style>