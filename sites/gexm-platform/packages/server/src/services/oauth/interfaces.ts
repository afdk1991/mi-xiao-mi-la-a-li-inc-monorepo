export interface OAuthUserInfo {
  id: string
  username?: string
  email?: string
  nickname?: string
  avatar?: string
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  providerData?: Record<string, unknown>
}

export interface OAuthAccount {
  id: string
  userId: string
  provider: string
  providerUserId: string
  providerUsername: string
  providerEmail: string
  avatar: string
  accessToken: string
  refreshToken: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface IOAuthProvider {
  name: string
  getAuthorizeUrl(state: string, redirectUri?: string, platform?: string): string
  getTokens(code: string, redirectUri?: string, platform?: string): Promise<OAuthTokens>
  getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo>
  refreshToken?: (refreshToken: string) => Promise<OAuthTokens | null>
  verifyMiniProgramCode?: (code: string) => Promise<OAuthUserInfo & { sessionKey: string }>
}

export interface OAuthPlatformConfig {
  appId: string
  appSecret: string
  redirectUri: string
  scope?: string
  authorizeUrl?: string
  tokenUrl?: string
  userInfoUrl?: string
}

export type WechatPlatform = 'openPlatform' | 'officialAccount' | 'miniProgram'

export interface WechatOAuthConfig {
  openPlatform: OAuthPlatformConfig
  officialAccount: OAuthPlatformConfig
  miniProgram: OAuthPlatformConfig
}

export interface OAuthConfig {
  wechat: WechatOAuthConfig
  qq: OAuthPlatformConfig
  weibo: OAuthPlatformConfig
  alipay: OAuthPlatformConfig
  google: OAuthPlatformConfig
  facebook: OAuthPlatformConfig
  twitter: OAuthPlatformConfig
}
