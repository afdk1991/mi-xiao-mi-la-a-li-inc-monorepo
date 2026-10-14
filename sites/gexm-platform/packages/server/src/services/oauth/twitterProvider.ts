import type { OAuthTokens, OAuthUserInfo } from './interfaces'
import config from '../../config'
import BaseOAuthProvider from './baseProvider'

interface TwitterTokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  error?: string
  error_description?: string
}

interface TwitterUserInfoResponse {
  data?: {
    id?: string
    name?: string
    username?: string
    profile_image_url?: string
  }
  errors?: Array<{
    message?: string
    code?: number
  }>
}

class TwitterProvider extends BaseOAuthProvider {
  name = 'twitter'

  async getTokens(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const authHeader = Buffer.from(
      `${config.oauth.twitter.appId}:${config.oauth.twitter.appSecret}`
    ).toString('base64')

    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri || config.oauth.twitter.redirectUri,
      code_verifier: 'challenge_code',
    })

    const data: TwitterTokenResponse = await this.getJsonResponse(
      'https://api.twitter.com/2/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
        body: params.toString(),
      },
      'Twitter OAuth请求'
    )

    if (data.error) {
      throw new Error(`Twitter OAuth错误: ${data.error_description || data.error}`)
    }

    this.validateAccessToken(data.access_token, 'Twitter')

    return {
      accessToken: data.access_token!,
      refreshToken: data.refresh_token || undefined,
      expiresAt: this.buildExpiresAt(data.expires_in),
    }
  }

  getAuthorizeUrl(state: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.twitter.appId,
      redirect_uri: redirectUri || config.oauth.twitter.redirectUri,
      scope: 'users.read tweet.read',
      state,
      code_challenge: 'challenge_code',
      code_challenge_method: 'plain',
    })
    return `https://twitter.com/i/oauth2/authorize?${params}`
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const data: TwitterUserInfoResponse = await this.getJsonResponse(
      'https://api.twitter.com/2/users/me',
      {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      },
      'Twitter获取用户信息'
    )

    if (data.errors && data.errors.length > 0) {
      throw new Error(
        `Twitter获取用户信息错误[${data.errors[0].code || 'N/A'}]: ${data.errors[0].message || '未知错误'}`
      )
    }

    const userData = data.data || {}

    return {
      id: userData.id || '',
      username: userData.username || userData.name || '',
      nickname: userData.name || userData.username || '',
      avatar: userData.profile_image_url || '',
    }
  }

  async verifyMiniProgramCode(_code: string): Promise<OAuthUserInfo & { sessionKey: string }> {
    throw new Error('Twitter小程序登录暂未实现')
  }
}

export default TwitterProvider
