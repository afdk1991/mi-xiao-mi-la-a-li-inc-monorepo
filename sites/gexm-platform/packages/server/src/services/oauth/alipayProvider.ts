import crypto from 'crypto'
import type { OAuthTokens, OAuthUserInfo } from './interfaces'
import config from '../../config'
import BaseOAuthProvider from './baseProvider'

interface AlipayTokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  user_id?: string
  code?: string
  msg?: string
  sub_code?: string
  sub_msg?: string
}

interface AlipayUserInfoResponse {
  code?: string
  msg?: string
  sub_code?: string
  sub_msg?: string
  user_id?: string
  avatar?: string
  nick_name?: string
  province?: string
  city?: string
  gender?: string
}

function formatTimestamp(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function signParams(params: Record<string, string>, privateKey: string): string {
  const sortedKeys = Object.keys(params).sort()
  const signString = sortedKeys
    .filter((key) => params[key] && key !== 'sign')
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const sign = crypto.sign('RSA-SHA256', Buffer.from(signString), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  })

  return sign.toString('base64')
}

class AlipayProvider extends BaseOAuthProvider {
  name = 'alipay'

  async getTokens(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.oauth.alipay.appId,
      client_secret: config.oauth.alipay.appSecret,
      redirect_uri: redirectUri || config.oauth.alipay.redirectUri,
    })

    const data: AlipayTokenResponse = await this.getJsonResponse(
      `https://openapi.alipay.com/gateway.do?${params}`,
      undefined,
      '支付宝OAuth请求'
    )

    if (data.code && data.code !== '10000') {
      throw new Error(`支付宝OAuth错误[${data.code}]: ${data.sub_msg || data.msg || '未知错误'}`)
    }

    this.validateAccessToken(data.access_token, '支付宝')

    return {
      accessToken: data.access_token!,
      refreshToken: data.refresh_token || undefined,
      expiresAt: this.buildExpiresAt(data.expires_in),
    }
  }

  getAuthorizeUrl(state: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      app_id: config.oauth.alipay.appId,
      redirect_uri: redirectUri || config.oauth.alipay.redirectUri,
      response_type: 'code',
      scope: 'auth_base',
      state,
    })
    return `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?${params}`
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const params: Record<string, string> = {
      app_id: config.oauth.alipay.appId,
      method: 'alipay.user.info.share',
      format: 'JSON',
      charset: 'UTF-8',
      sign_type: 'RSA2',
      timestamp: formatTimestamp(),
      version: '1.0',
      auth_token: tokens.accessToken,
    }

    const privateKey = config.oauth.alipay.appSecret
    params.sign = signParams(params, privateKey)

    const data = (await this.getJsonResponse(
      `https://openapi.alipay.com/gateway.do?${new URLSearchParams(params)}`,
      undefined,
      '支付宝获取用户信息'
    )) as { alipay_user_info_share_response?: AlipayUserInfoResponse }

    const result: AlipayUserInfoResponse = data.alipay_user_info_share_response || {}

    if (result.code && result.code !== '10000') {
      throw new Error(
        `支付宝获取用户信息错误[${result.code}]: ${result.sub_msg || result.msg || '未知错误'}`
      )
    }

    return {
      id: result.user_id || '',
      nickname: result.nick_name || '',
      username: result.nick_name || '',
      avatar: result.avatar || '',
    }
  }

  async verifyMiniProgramCode(_code: string): Promise<OAuthUserInfo & { sessionKey: string }> {
    throw new Error('支付宝小程序登录暂未实现')
  }
}

export default AlipayProvider
