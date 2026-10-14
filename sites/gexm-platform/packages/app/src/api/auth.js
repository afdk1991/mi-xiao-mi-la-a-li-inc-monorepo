import http from './request'

export const authApi = {
  login(data) {
    return http.post('/auth/login', data, { loadingText: '登录中...' })
  },

  register(data) {
    return http.post('/auth/register', data, { loadingText: '注册中...' })
  },

  logout(data) {
    return http.post('/auth/logout', data, { showError: false })
  },

  refreshToken(refreshToken) {
    return http.post('/auth/refresh', { refreshToken }, { showError: false, loading: false })
  },

  getProfile() {
    return http.get('/auth/profile')
  },

  updateProfile(data) {
    return http.put('/auth/profile', data, { loadingText: '保存中...' })
  },

  changePassword(data) {
    return http.put('/auth/password', data, { loadingText: '修改中...' })
  },

  oauthAuthorize(provider, redirectUri) {
    return http.get(`/oauth/${provider}/authorize`, { redirect_uri: redirectUri }, { loading: false })
  },

  oauthCallback(provider, code, state, redirectUri) {
    return http.get(`/oauth/${provider}/callback`, { code, state, redirect_uri: redirectUri }, { loading: false })
  },

  oauthLogin(provider, code) {
    return http.post(`/oauth/${provider}/login`, { code }, { loadingText: '登录中...' })
  },

  oauthBind(provider, code) {
    return http.post(`/oauth/${provider}/bind`, { code }, { loadingText: '绑定中...' })
  },

  oauthUnbind(provider) {
    return http.delete(`/oauth/${provider}/unbind`, { loadingText: '解绑中...' })
  },

  getLinkedAccounts() {
    return http.get('/oauth/accounts')
  },

  sendPhoneCode(phone, type = 'register') {
    return http.post('/auth/send-phone-code', { phone, type }, { loading: false })
  },

  sendEmailCode(email, type = 'register') {
    return http.post('/auth/send-email-code', { email, type }, { loading: false })
  },

  phoneRegister(data) {
    return http.post('/auth/phone-register', data, { loadingText: '注册中...' })
  },

  phoneLogin(phone, code) {
    return http.post('/auth/phone-login', { phone, code }, { loadingText: '登录中...' })
  },

  verifyEmail(email, code) {
    return http.post('/auth/verify-email', { email, code }, { loadingText: '验证中...' })
  },

  requestPasswordReset(email) {
    return http.post('/auth/request-password-reset', { email }, { loadingText: '发送中...' })
  },

  resetPassword(data) {
    return http.post('/auth/reset-password', data, { loadingText: '重置中...' })
  },

  completeProfile(data) {
    return http.put('/auth/profile/complete', data, { loadingText: '保存中...' })
  },
}

export default authApi
