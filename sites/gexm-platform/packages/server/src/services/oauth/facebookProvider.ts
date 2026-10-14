import type { OAuthTokens, OAuthUserInfo } from './interfaces'
import config from '../../config'
import BaseOAuthProvider from './baseProvider'

interface FacebookTokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

interface FacebookUserInfoResponse {
  id?: string
  name?: string
  first_name?: string
  last_name?: string
  picture?: {
    data?: {
      url?: string
    }
  }
  email?: string
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

class FacebookProvider extends BaseOAuthProvider {
  name = 'facebook'

  async getTokens(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: config.oauth.facebook.appId,
      client_secret: config.oauth.facebook.appSecret,
      code,
      redirect_uri: redirectUri || config.oauth.facebook.redirectUri,
    })

    const data: FacebookTokenResponse = await this.getJsonResponse(
      `https://graph.facebook.com/v18.0/oauth/access_token?${params}`,
      undefined,
      'Facebook OAuth请求'
    )

    if (data.error) {
      throw new Error(
        `Facebook OAuth错误[${data.error.code || 'N/A'}]: ${data.error.message || '未知错误'}`
      )
    }

    this.validateAccessToken(data.access_token, 'Facebook')

    return {
      accessToken: data.access_token!,
      expiresAt: this.buildExpiresAt(data.expires_in),
    }
  }

  getAuthorizeUrl(state: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      client_id: config.oauth.facebook.appId,
      redirect_uri: redirectUri || config.oauth.facebook.redirectUri,
      response_type: 'code',
      scope: 'public_profile email',
      state,
    })
    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      fields: 'id,name,first_name,last_name,picture.type(large),email',
    })

    const data: FacebookUserInfoResponse = await this.getJsonResponse(
      `https://graph.facebook.com/v18.0/me?${params}`,
      undefined,
      'Facebook获取用户信息'
    )

    if (data.error) {
      throw new Error(
        `Facebook获取用户信息错误[${data.error.code || 'N/A'}]: ${data.error.message || '未知错误'}`
      )
    }

    return {
      id: data.id || '',
      username: data.name || data.first_name || '',
      nickname: data.first_name || data.name || '',
      avatar: data.picture?.data?.url || '',
      email: data.email || '',
    }
  }

  async verifyMiniProgramCode(_code: string): Promise<OAuthUserInfo & { sessionKey: string }> {
    throw new Error('Facebook小程序登录暂未实现')
  }
}

export default FacebookProvider
