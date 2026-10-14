import type { OAuthTokens, OAuthUserInfo } from './interfaces'
import config from '../../config'
import BaseOAuthProvider from './baseProvider'

interface WeiboTokenResponse {
  access_token?: string
  remind_in?: string
  expires_in?: number
  uid?: string
  error?: string
  error_code?: number
}

interface WeiboUserInfoResponse {
  id?: number
  screen_name?: string
  name?: string
  profile_image_url?: string
  avatar_large?: string
  email?: string
  error?: string
  error_code?: number
}

class WeiboProvider extends BaseOAuthProvider {
  name = 'weibo'

  async getTokens(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: config.oauth.weibo.appId,
      client_secret: config.oauth.weibo.appSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri || config.oauth.weibo.redirectUri,
    })

    const data: WeiboTokenResponse = await this.getJsonResponse(
      `https://api.weibo.com/oauth2/access_token?${params}`,
      undefined,
      '微博OAuth请求'
    )

    if (data.error || data.error_code) {
      throw new Error(`微博OAuth错误[${data.error_code || 'N/A'}]: ${data.error || '未知错误'}`)
    }

    this.validateAccessToken(data.access_token, '微博')

    return {
      accessToken: data.access_token!,
      expiresAt: this.buildExpiresAt(data.expires_in),
    }
  }

  getAuthorizeUrl(state: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      client_id: config.oauth.weibo.appId,
      redirect_uri: redirectUri || config.oauth.weibo.redirectUri,
      response_type: 'code',
      state,
      scope: 'email',
    })
    return `https://api.weibo.com/oauth2/authorize?${params}`
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const tokenInfo = (await this.getJsonResponse(
      `https://api.weibo.com/oauth2/get_token_info?access_token=${tokens.accessToken}`,
      undefined,
      '微博获取token信息'
    )) as { error?: string; uid?: string }

    if (tokenInfo.error) {
      throw new Error(`微博获取用户信息错误: ${tokenInfo.error}`)
    }

    const uid = tokenInfo.uid || ''
    if (!uid) {
      throw new Error('微博OAuth: 缺少uid参数')
    }

    const userInfoParams = new URLSearchParams({
      access_token: tokens.accessToken,
      uid,
    })

    const data: WeiboUserInfoResponse = await this.getJsonResponse(
      `https://api.weibo.com/2/users/show.json?${userInfoParams}`,
      undefined,
      '微博获取用户信息'
    )

    if (data.error || data.error_code) {
      throw new Error(
        `微博获取用户信息错误[${data.error_code || 'N/A'}]: ${data.error || '未知错误'}`
      )
    }

    return {
      id: String(data.id || uid),
      username: data.screen_name || data.name || '',
      nickname: data.screen_name || data.name || '',
      avatar: data.avatar_large || data.profile_image_url || '',
      email: data.email || '',
    }
  }

  async verifyMiniProgramCode(_code: string): Promise<OAuthUserInfo & { sessionKey: string }> {
    throw new Error('微博小程序登录暂未实现')
  }
}

export default WeiboProvider
