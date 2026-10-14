import type { OAuthTokens, OAuthUserInfo } from './interfaces'
import config from '../../config'
import BaseOAuthProvider from './baseProvider'

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  id_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

interface GoogleUserInfoResponse {
  sub?: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
  email_verified?: boolean
  locale?: string
  error?: string
}

class GoogleProvider extends BaseOAuthProvider {
  name = 'google'

  async getTokens(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: config.oauth.google.appId,
      client_secret: config.oauth.google.appSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri || config.oauth.google.redirectUri,
    })

    const data: GoogleTokenResponse = await this.getJsonResponse(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      },
      'Google OAuth请求'
    )

    if (data.error) {
      throw new Error(`Google OAuth错误: ${data.error_description || data.error}`)
    }

    this.validateAccessToken(data.access_token, 'Google')

    return {
      accessToken: data.access_token!,
      refreshToken: data.refresh_token || undefined,
      expiresAt: this.buildExpiresAt(data.expires_in),
    }
  }

  getAuthorizeUrl(state: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      client_id: config.oauth.google.appId,
      redirect_uri: redirectUri || config.oauth.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account consent',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const data: GoogleUserInfoResponse = await this.getJsonResponse(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      },
      'Google获取用户信息'
    )

    if (data.error) {
      throw new Error(`Google获取用户信息错误: ${data.error}`)
    }

    return {
      id: data.sub || '',
      username: data.name || data.given_name || '',
      nickname: data.given_name || data.name || '',
      avatar: data.picture || '',
      email: data.email || '',
    }
  }

  async verifyMiniProgramCode(_code: string): Promise<OAuthUserInfo & { sessionKey: string }> {
    throw new Error('Google小程序登录暂未实现')
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens | null> {
    const params = new URLSearchParams({
      client_id: config.oauth.google.appId,
      client_secret: config.oauth.google.appSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    try {
      const data: GoogleTokenResponse = await this.getJsonResponse(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        },
        'Google刷新token'
      )

      if (data.error) {
        return null
      }

      this.validateAccessToken(data.access_token, 'Google')

      return {
        accessToken: data.access_token!,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: this.buildExpiresAt(data.expires_in),
      }
    } catch {
      return null
    }
  }
}

export default GoogleProvider
