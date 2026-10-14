<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { authApi } from '@/api'
import { ElForm, ElFormItem, ElInput, ElButton, ElMessage, ElDivider, ElCheckbox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const isRegisterMode = ref(false)
const isPhoneMode = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const phoneForm = reactive({
  phone: '',
  code: '',
  password: '',
  nickname: '',
})

const registerForm = reactive({
  username: '',
  email: '',
  emailCode: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  phone: '',
})

const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const remember = ref(false)

let countdownTimer: ReturnType<typeof setInterval> | null = null

function switchMode(type: 'login' | 'register') {
  isRegisterMode.value = type === 'register'
  isPhoneMode.value = false
}

function togglePhoneMode() {
  isPhoneMode.value = !isPhoneMode.value
}

async function sendPhoneCode() {
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneForm.phone) {
    ElMessage.error('请输入手机号')
    return
  }
  if (!phoneRegex.test(phoneForm.phone)) {
    ElMessage.error('手机号格式不正确')
    return
  }

  sendingCode.value = true
  try {
    const type = isRegisterMode.value ? 'register' : 'login'
    await authApi.sendPhoneCode(phoneForm.phone, type)
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

async function sendEmailCode() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!registerForm.email) {
    ElMessage.error('请输入邮箱')
    return
  }
  if (!emailRegex.test(registerForm.email)) {
    ElMessage.error('邮箱格式不正确')
    return
  }

  sendingCode.value = true
  try {
    await authApi.sendEmailCode(registerForm.email, 'register')
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

async function handleUsernameLogin() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.error('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const loginRes = await authApi.login({
      username: loginForm.username,
      password: loginForm.password,
    })

    userStore.setToken(loginRes.accessToken, loginRes.refreshToken)

    let userInfo = loginRes.user
    try {
      userInfo = await authApi.getProfile()
    } catch (e) {
      console.warn('Failed to get profile, using login response user info:', e)
    }

    if (userInfo && typeof userInfo === 'object') {
      userStore.setUserInfo(userInfo)
    } else {
      userStore.setUserInfo(loginRes.user)
    }
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    const msg = (err as { message?: string })?.message || '登录失败，请检查账号密码'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

async function handlePhoneLogin() {
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneForm.phone) {
    ElMessage.error('请输入手机号')
    return
  }
  if (!phoneRegex.test(phoneForm.phone)) {
    ElMessage.error('手机号格式不正确')
    return
  }
  if (!phoneForm.code || phoneForm.code.length !== 6) {
    ElMessage.error('请输入6位验证码')
    return
  }

  loading.value = true
  try {
    const loginRes = await authApi.phoneLogin(phoneForm.phone, phoneForm.code)
    userStore.setToken(loginRes.accessToken, loginRes.refreshToken)
    userStore.setUserInfo(loginRes.user)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    const msg = (err as { message?: string })?.message || '登录失败，请重试'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!registerForm.username || registerForm.username.length < 3) {
    ElMessage.error('用户名长度不能少于3位')
    return
  }
  if (!registerForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
    ElMessage.error('请输入正确的邮箱')
    return
  }
  if (!registerForm.emailCode || registerForm.emailCode.length !== 6) {
    ElMessage.error('请输入6位邮箱验证码')
    return
  }
  if (!registerForm.password || registerForm.password.length < 8) {
    ElMessage.error('密码长度不能少于8位')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    const registerRes = await authApi.register({
      username: registerForm.username,
      email: registerForm.email,
      emailCode: registerForm.emailCode,
      password: registerForm.password,
      nickname: registerForm.nickname,
      phone: registerForm.phone,
    })

    userStore.setToken(registerRes.accessToken, registerRes.refreshToken)
    userStore.setUserInfo(registerRes.user)
    ElMessage.success('注册成功')
    router.push('/dashboard')
  } catch (err) {
    const msg = (err as { message?: string })?.message || '注册失败，请重试'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

async function handlePhoneRegister() {
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneForm.phone || !phoneRegex.test(phoneForm.phone)) {
    ElMessage.error('请输入正确的手机号')
    return
  }
  if (!phoneForm.code || phoneForm.code.length !== 6) {
    ElMessage.error('请输入6位验证码')
    return
  }
  if (!phoneForm.password || phoneForm.password.length < 8) {
    ElMessage.error('密码长度不能少于8位')
    return
  }

  loading.value = true
  try {
    const registerRes = await authApi.phoneRegister({
      phone: phoneForm.phone,
      code: phoneForm.code,
      password: phoneForm.password,
      nickname: phoneForm.nickname,
    })

    userStore.setToken(registerRes.accessToken, registerRes.refreshToken)
    userStore.setUserInfo(registerRes.user)
    ElMessage.success('注册成功')
    router.push('/dashboard')
  } catch (err) {
    const msg = (err as { message?: string })?.message || '注册失败，请重试'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function handleForgotPassword() {
  router.push('/forgot-password')
}

const showWechatPlatform = ref(false)

function toggleWechatPlatform() {
  showWechatPlatform.value = !showWechatPlatform.value
}

async function handleOAuthLogin(provider: string, platform?: string) {
  const platformNames: Record<string, string> = {
    wechat: '微信',
    qq: 'QQ',
    weibo: '微博',
    alipay: '支付宝',
    google: 'Google',
    facebook: 'Facebook',
    twitter: 'Twitter',
  }
  const platformName = platformNames[provider] || provider

  try {
    const authRes = provider === 'wechat' && platform === 'officialAccount'
      ? await authApi.oauthOfficialAccountAuthorize(provider)
      : await authApi.oauthAuthorize(provider, platform)
    
    if (authRes.authUrl) {
      localStorage.setItem('oauth_state', authRes.state)
      localStorage.setItem('oauth_provider', provider)
      localStorage.setItem('oauth_platform', platform || '')
      window.location.href = authRes.authUrl
    }
  } catch (err) {
    console.error(`${platformName} authorize failed:`, err)
    ElMessage.error(`获取${platformName}授权失败`)
  }
}

async function completeLogin(loginRes: any) {
  userStore.setToken(loginRes.accessToken, loginRes.refreshToken)

  let userInfo = loginRes.user
  try {
    userInfo = await authApi.getProfile()
  } catch (e) {
    console.warn('Failed to get profile:', e)
  }

  userStore.setUserInfo(userInfo)
  ElMessage.success(loginRes.isNewUser ? '注册并登录成功' : '登录成功')
  router.push('/dashboard')
}

router.afterEach(async (to) => {
  if (to.query.code && to.query.state) {
    const provider = localStorage.getItem('oauth_provider') || ''
    const state = localStorage.getItem('oauth_state') || ''
    const platform = localStorage.getItem('oauth_platform') || ''

    if (provider && state === to.query.state) {
      try {
        const loginRes = await authApi.oauthCallback(provider, to.query.code as string, state, platform || undefined)
        await completeLogin(loginRes)
      } catch (err) {
        console.error('OAuth callback failed:', err)
        ElMessage.error('登录失败，请重试')
      } finally {
        localStorage.removeItem('oauth_state')
        localStorage.removeItem('oauth_provider')
        localStorage.removeItem('oauth_platform')
      }
    }
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">
            <span class="logo-icon">G</span>
            <span class="logo-text">Gexm</span>
          </div>
          <h2 class="login-title">{{ isRegisterMode ? '欢迎注册' : '欢迎登录' }}</h2>
          <p class="login-subtitle">{{ isRegisterMode ? '创建您的账号' : '管理您的业务数据' }}</p>
        </div>

        <ElForm class="login-form" :model="isPhoneMode ? phoneForm : (isRegisterMode ? registerForm : loginForm)">
          <template v-if="!isPhoneMode">
            <template v-if="!isRegisterMode">
              <ElFormItem prop="username">
                <ElInput
                  v-model="loginForm.username"
                  placeholder="请输入用户名/邮箱"
                  size="large"
                  prefix-icon="User"
                  @keyup.enter="handleUsernameLogin"
                />
              </ElFormItem>
              <ElFormItem prop="password">
                <ElInput
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  size="large"
                  prefix-icon="Lock"
                  show-password
                  @keyup.enter="handleUsernameLogin"
                />
              </ElFormItem>
              <div class="login-options">
                <ElCheckbox v-model="remember">记住密码</ElCheckbox>
                <span class="login-forgot" @click="handleForgotPassword">忘记密码？</span>
              </div>
              <ElButton type="primary" size="large" class="login-btn" :loading="loading" @click="handleUsernameLogin">
                登录
              </ElButton>
            </template>

            <template v-else>
              <ElFormItem prop="username">
                <ElInput
                  v-model="registerForm.username"
                  placeholder="请输入用户名"
                  size="large"
                  prefix-icon="User"
                />
              </ElFormItem>
              <ElFormItem prop="email">
                <div class="email-input-wrapper">
                  <ElInput
                    v-model="registerForm.email"
                    placeholder="请输入邮箱"
                    size="large"
                    prefix-icon="Message"
                  />
                  <ElButton
                    type="primary"
                    size="large"
                    :loading="sendingCode"
                    :disabled="countdown > 0"
                    @click="sendEmailCode"
                  >
                    {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                  </ElButton>
                </div>
              </ElFormItem>
              <ElFormItem prop="emailCode">
                <ElInput
                  v-model="registerForm.emailCode"
                  placeholder="请输入邮箱验证码"
                  size="large"
                  prefix-icon="Verification"
                  maxlength="6"
                />
              </ElFormItem>
              <ElFormItem prop="password">
                <ElInput
                  v-model="registerForm.password"
                  type="password"
                  placeholder="请输入密码（8位以上）"
                  size="large"
                  prefix-icon="Lock"
                  show-password
                />
              </ElFormItem>
              <ElFormItem prop="confirmPassword">
                <ElInput
                  v-model="registerForm.confirmPassword"
                  type="password"
                  placeholder="请再次输入密码"
                  size="large"
                  prefix-icon="Lock"
                  show-password
                />
              </ElFormItem>
              <ElFormItem prop="nickname">
                <ElInput
                  v-model="registerForm.nickname"
                  placeholder="请输入昵称（选填）"
                  size="large"
                  prefix-icon="UserFilled"
                />
              </ElFormItem>
              <ElFormItem prop="phone">
                <ElInput
                  v-model="registerForm.phone"
                  placeholder="请输入手机号（选填）"
                  size="large"
                  prefix-icon="Phone"
                />
              </ElFormItem>
              <ElButton type="primary" size="large" class="login-btn" :loading="loading" @click="handleRegister">
                注册
              </ElButton>
            </template>
          </template>

          <template v-else>
            <ElFormItem prop="phone">
              <ElInput
                v-model="phoneForm.phone"
                placeholder="请输入手机号"
                size="large"
                prefix-icon="Phone"
                maxlength="11"
              />
            </ElFormItem>
            <ElFormItem prop="code">
              <div class="email-input-wrapper">
                <ElInput
                  v-model="phoneForm.code"
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
                  @click="sendPhoneCode"
                >
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </ElButton>
              </div>
            </ElFormItem>
            <ElFormItem prop="password" v-if="isRegisterMode">
              <ElInput
                v-model="phoneForm.password"
                type="password"
                placeholder="请设置密码（8位以上）"
                size="large"
                prefix-icon="Lock"
                show-password
              />
            </ElFormItem>
            <ElFormItem prop="nickname" v-if="isRegisterMode">
              <ElInput
                v-model="phoneForm.nickname"
                placeholder="请输入昵称（选填）"
                size="large"
                prefix-icon="UserFilled"
              />
            </ElFormItem>
            <ElButton type="primary" size="large" class="login-btn" :loading="loading" @click="isRegisterMode ? handlePhoneRegister() : handlePhoneLogin()">
              {{ isRegisterMode ? '注册' : '登录' }}
            </ElButton>
          </template>

          <div class="mode-switch">
            <span class="mode-switch-text">
              {{ isPhoneMode ? '使用账号密码' : '使用手机号' }}
            </span>
            <span class="mode-switch-link" @click="togglePhoneMode">
              {{ isPhoneMode ? '立即切换' : '立即切换' }}
            </span>
          </div>

          <ElDivider content-position="center">其他登录方式</ElDivider>

          <div class="login-third-party">
            <div class="wechat-platform-wrapper">
              <ElButton
                type="default"
                size="large"
                class="third-party-btn third-party-btn--wechat"
                @click="toggleWechatPlatform"
              >
                <span class="third-party-icon">💬</span>
                <span>微信</span>
                <span class="platform-arrow">{{ showWechatPlatform ? '▲' : '▼' }}</span>
              </ElButton>
              <div v-if="showWechatPlatform" class="wechat-platform-dropdown">
                <ElButton
                  type="default"
                  size="small"
                  class="platform-option"
                  @click="handleOAuthLogin('wechat', 'openPlatform')"
                >
                  <span>💻 网页扫码</span>
                </ElButton>
                <ElButton
                  type="default"
                  size="small"
                  class="platform-option"
                  @click="handleOAuthLogin('wechat', 'officialAccount')"
                >
                  <span>📱 公众号授权</span>
                </ElButton>
              </div>
            </div>
            <ElButton
              type="default"
              size="large"
              class="third-party-btn third-party-btn--qq"
              @click="handleOAuthLogin('qq')"
            >
              <span class="third-party-icon">🐧</span>
              <span>QQ</span>
            </ElButton>
            <ElButton
              type="default"
              size="large"
              class="third-party-btn third-party-btn--weibo"
              @click="handleOAuthLogin('weibo')"
            >
              <span class="third-party-icon">🌊</span>
              <span>微博</span>
            </ElButton>
            <ElButton
              type="default"
              size="large"
              class="third-party-btn third-party-btn--alipay"
              @click="handleOAuthLogin('alipay')"
            >
              <span class="third-party-icon">💳</span>
              <span>支付宝</span>
            </ElButton>
            <ElButton
              type="default"
              size="large"
              class="third-party-btn third-party-btn--google"
              @click="handleOAuthLogin('google')"
            >
              <span class="third-party-icon">🔷</span>
              <span>Google</span>
            </ElButton>
            <ElButton
              type="default"
              size="large"
              class="third-party-btn third-party-btn--facebook"
              @click="handleOAuthLogin('facebook')"
            >
              <span class="third-party-icon">📘</span>
              <span>Facebook</span>
            </ElButton>
            <ElButton
              type="default"
              size="large"
              class="third-party-btn third-party-btn--twitter"
              @click="handleOAuthLogin('twitter')"
            >
              <span class="third-party-icon">🐦</span>
              <span>Twitter</span>
            </ElButton>
          </div>

          <div class="login-footer">
            <span class="login-switch" @click="switchMode(isRegisterMode ? 'login' : 'register')">
              {{ isRegisterMode ? '已有账号？立即登录' : '还没有账号？立即注册' }}
            </span>
          </div>
        </ElForm>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
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
  max-width: 480px;
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

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.login-forgot {
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
}

.login-forgot:hover {
  color: #764ba2;
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

.mode-switch {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 14px;
  color: #909399;
}

.mode-switch-link {
  color: #667eea;
  cursor: pointer;
}

.mode-switch-link:hover {
  color: #764ba2;
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

.login-third-party {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.third-party-btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.third-party-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.third-party-icon {
  font-size: 18px;
}

.third-party-btn--wechat {
  border-color: #07c160;
  color: #07c160;
  background: #f0fff4;
}

.third-party-btn--wechat:hover {
  background: #07c160;
  color: #fff;
}

.third-party-btn--qq {
  border-color: #12b7f5;
  color: #12b7f5;
  background: #e6f7ff;
}

.third-party-btn--qq:hover {
  background: #12b7f5;
  color: #fff;
}

.third-party-btn--weibo {
  border-color: #e6162d;
  color: #e6162d;
  background: #fff0f0;
}

.third-party-btn--weibo:hover {
  background: #e6162d;
  color: #fff;
}

.third-party-btn--alipay {
  border-color: #1677ff;
  color: #1677ff;
  background: #e6f7ff;
}

.third-party-btn--alipay:hover {
  background: #1677ff;
  color: #fff;
}

.third-party-btn--google {
  border-color: #4285f4;
  color: #4285f4;
  background: #e8f0fe;
}

.third-party-btn--google:hover {
  background: #4285f4;
  color: #fff;
}

.third-party-btn--facebook {
  border-color: #1877f2;
  color: #1877f2;
  background: #e7f3ff;
}

.third-party-btn--facebook:hover {
  background: #1877f2;
  color: #fff;
}

.third-party-btn--twitter {
  border-color: #1da1f2;
  color: #1da1f2;
  background: #e8f5fd;
}

.third-party-btn--twitter:hover {
  background: #1da1f2;
  color: #fff;
}

.wechat-platform-wrapper {
  position: relative;
  flex: 1;
}

.platform-arrow {
  font-size: 12px;
  margin-left: 4px;
}

.wechat-platform-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.platform-option {
  width: 100%;
  justify-content: flex-start;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
  transition: all 0.2s;
}

.platform-option:hover {
  background: #f0f9ff;
  color: #07c160;
}
</style>