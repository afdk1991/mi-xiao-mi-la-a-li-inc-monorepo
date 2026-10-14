import { http } from './request'
import type { UserInfo } from '@/store/user'

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: UserInfo
  expiresIn: number
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  emailCode?: string
  nickname?: string
  phone?: string
}

export interface PhoneRegisterRequest {
  phone: string
  code: string
  password: string
  nickname?: string
}

export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
}

export interface OAuthAuthorizeResponse {
  authUrl: string
  state: string
}

export interface OAuthLoginResponse extends LoginResponse {
  isNewUser: boolean
}

export const authApi = {
  login(data: { username: string; password: string }): Promise<LoginResponse> {
    return http.post('/auth/login', data)
  },

  register(data: RegisterRequest): Promise<{ user: UserInfo }> {
    return http.post('/auth/register', data)
  },

  logout(data?: { refreshToken?: string }): Promise<void> {
    return http.post('/auth/logout', data)
  },

  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return http.post('/auth/refresh', { refreshToken })
  },

  getProfile(): Promise<UserInfo> {
    return http.get('/auth/profile')
  },

  updateProfile(data: { nickname?: string; avatar?: string; phone?: string }): Promise<UserInfo> {
    return http.put('/auth/profile', data)
  },

  changePassword(data: { oldPassword: string; newPassword: string }): Promise<void> {
    return http.put('/auth/password', data)
  },

  oauthAuthorize(provider: string, platform?: string): Promise<OAuthAuthorizeResponse> {
    return http.get(`/oauth/${provider}/authorize`, { params: { platform } })
  },

  oauthCallback(provider: string, code: string, state: string, platform?: string): Promise<OAuthLoginResponse> {
    return http.get(`/oauth/${provider}/callback`, { params: { code, state, platform } })
  },

  oauthLogin(provider: string, code: string): Promise<OAuthLoginResponse> {
    return http.post(`/oauth/${provider}/login`, { code })
  },

  oauthOfficialAccountLogin(provider: string, code: string): Promise<OAuthLoginResponse> {
    return http.post(`/oauth/${provider}/official-account/login`, { code })
  },

  oauthOfficialAccountAuthorize(provider: string): Promise<OAuthAuthorizeResponse> {
    return http.get(`/oauth/${provider}/official-account/authorize`)
  },

  oauthBind(provider: string, code: string, platform?: string): Promise<{ success: boolean }> {
    return http.post(`/oauth/${provider}/bind`, { code, platform })
  },

  oauthUnbind(provider: string): Promise<{ success: boolean }> {
    return http.delete(`/oauth/${provider}/unbind`)
  },

  getLinkedAccounts(): Promise<{ provider: string; providerUsername: string; avatar: string }[]> {
    return http.get('/oauth/accounts')
  },

  sendPhoneCode(phone: string, type: string = 'register'): Promise<{ success: boolean; message: string }> {
    return http.post('/auth/send-phone-code', { phone, type })
  },

  sendEmailCode(email: string, type: string = 'register'): Promise<{ success: boolean; message: string }> {
    return http.post('/auth/send-email-code', { email, type })
  },

  phoneRegister(data: PhoneRegisterRequest): Promise<LoginResponse> {
    return http.post('/auth/phone-register', data)
  },

  phoneLogin(phone: string, code: string): Promise<LoginResponse> {
    return http.post('/auth/phone-login', { phone, code })
  },

  verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    return http.post('/auth/verify-email', { email, code })
  },

  requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    return http.post('/auth/request-password-reset', { email })
  },

  resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean; message: string }> {
    return http.post('/auth/reset-password', data)
  },

  completeProfile(data: { nickname?: string; phone?: string; avatar?: string }): Promise<UserInfo> {
    return http.put('/auth/profile/complete', data)
  },
}
