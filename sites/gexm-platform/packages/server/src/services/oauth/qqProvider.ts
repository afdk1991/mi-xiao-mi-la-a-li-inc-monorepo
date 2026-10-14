import type { OAuthTokens, OAuthUserInfo } from './interfaces'
import config from '../../config'
import BaseOAuthProvider from './baseProvider'

interface QQUserInfoResponse {
  ret?: number
  msg?: string
  nickname?: string
  figureurl_qq_2?: string
  figureurl_1?: string
}

class QQProvider extends BaseOAuthProvider {
  name = 'qq'

  async getTokens(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.oauth.qq.appId,
      client_secret: config.oauth.qq.appSecret,
      code,
      redirect_uri: redirectUri || config.oauth.qq.redirectUri,
    })

    const response = await this.fetchWithTimeout(`https://graph.qq.com/oauth2.0/token?${params}`)
    this.validateResponse(response, 'QQ OAuth请求')

    const text = await response.text()
    const tokenData = new URLSearchParams(text)
    const accessToken = tokenData.get('access_token')

    if (!accessToken) {
      throw new Error('QQ OAuth错误: 获取access_token失败')
    }

    return {
      accessToken,
      refreshToken: tokenData.get('refresh_token') || undefined,
      expiresAt: this.buildExpiresAt(
        tokenData.get('expires_in') ? parseInt(tokenData.get('expires_in')!, 10) : undefined
      ),
    }
  }

  getAuthorizeUrl(state: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.qq.appId,
      redirect_uri: redirectUri || config.oauth.qq.redirectUri,
      state,
      scope: 'get_user_info',
    })
    return `https://graph.qq.com/oauth2.0/authorize?${params}`
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const openIdResponse = await this.fetchWithTimeout(
      `https://graph.qq.com/oauth2.0/me?access_token=${tokens.accessToken}`
    )
    this.validateResponse(openIdResponse, 'QQ获取openid')

    const openIdText = await openIdResponse.text()
    const openIdMatch = openIdText.match(/"openid":"([^"]+)"/)
    if (!openIdMatch) {
      throw new Error('QQ OAuth错误: 获取openid失败')
    }
    const openId = openIdMatch[1]

    const userInfoParams = new URLSearchParams({
      access_token: tokens.accessToken,
      oauth_consumer_key: config.oauth.qq.appId,
      openid: openId,
      format: 'json',
    })

    const data: QQUserInfoResponse = await this.getJsonResponse(
      `https://graph.qq.com/user/get_user_info?${userInfoParams}`,
      undefined,
      'QQ获取用户信息'
    )

    if (data.ret !== 0) {
      throw new Error(`QQ获取用户信息错误[${data.ret}]: ${data.msg || '未知错误'}`)
    }

    return {
      id: openId,
      username: data.nickname || '',
      nickname: data.nickname || '',
      avatar: data.figureurl_qq_2 || data.figureurl_1 || '',
    }
  }

  async verifyMiniProgramCode(_code: string): Promise<OAuthUserInfo & { sessionKey: string }> {
    throw new Error('QQ小程序登录暂未实现')
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens | null> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.oauth.qq.appId,
      client_secret: config.oauth.qq.appSecret,
      refresh_token: refreshToken,
    })

    try {
      const response = await this.fetchWithTimeout(`https://graph.qq.com/oauth2.0/token?${params}`)
      this.validateResponse(response, 'QQ刷新token')

      const text = await response.text()
      const tokenData = new URLSearchParams(text)
      const accessToken = tokenData.get('access_token')

      if (!accessToken) {
        return null
      }

      return {
        accessToken,
        refreshToken: tokenData.get('refresh_token') || refreshToken,
        expiresAt: this.buildExpiresAt(
          tokenData.get('expires_in') ? parseInt(tokenData.get('expires_in')!, 10) : undefined
        ),
      }
    } catch {
      return null
    }
  }
}

export default QQProvider
