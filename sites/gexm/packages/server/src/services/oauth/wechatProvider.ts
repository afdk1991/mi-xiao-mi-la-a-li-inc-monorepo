import type { IOAuthProvider, OAuthTokens, OAuthUserInfo, WechatPlatform } from './interfaces'
import config from '../../config'
import BaseOAuthProvider from './baseProvider'

interface WechatTokenResponse {
  errcode?: number
  errmsg?: string
  access_token?: string
  refresh_token?: string
  expires_in?: number
  openid?: string
  unionid?: string
  scope?: string
}

interface WechatUserInfoResponse {
  errcode?: number
  errmsg?: string
  openid?: string
  nickname?: string
  headimgurl?: string
  unionid?: string
  sex?: number
  province?: string
  city?: string
  country?: string
}

interface WechatMiniProgramResponse {
  errcode?: number
  errmsg?: string
  openid?: string
  session_key?: string
  unionid?: string
}

class WechatProvider extends BaseOAuthProvider implements IOAuthProvider {
  name = 'wechat'

  private getPlatformConfig(platform: WechatPlatform) {
    return config.oauth.wechat[platform]
  }

  async getTokens(
    code: string,
    _redirectUri?: string,
    platform: WechatPlatform = 'openPlatform'
  ): Promise<OAuthTokens> {
    const platformConfig = this.getPlatformConfig(platform)
    const params = new URLSearchParams({
      appid: platformConfig.appId,
      secret: platformConfig.appSecret,
      code,
      grant_type: 'authorization_code',
    })

    const data: WechatTokenResponse = await this.getJsonResponse(
      `https://api.weixin.qq.com/sns/oauth2/access_token?${params}`,
      undefined,
      '微信OAuth请求'
    )

    if (data.errcode) {
      throw new Error(`微信OAuth错误[${data.errcode}]: ${data.errmsg || '未知错误'}`)
    }

    this.validateAccessToken(data.access_token, '微信')

    return {
      accessToken: data.access_token!,
      refreshToken: data.refresh_token || undefined,
      expiresAt: this.buildExpiresAt(data.expires_in),
      providerData: {
        openid: data.openid,
        unionid: data.unionid,
        scope: data.scope,
        platform,
      },
    }
  }

  getAuthorizeUrl(
    state: string,
    redirectUri?: string,
    platform: WechatPlatform = 'openPlatform'
  ): string {
    const platformConfig = this.getPlatformConfig(platform)
    const scope =
      platformConfig.scope || (platform === 'openPlatform' ? 'snsapi_login' : 'snsapi_userinfo')

    const params = new URLSearchParams({
      appid: platformConfig.appId,
      redirect_uri: redirectUri || platformConfig.redirectUri,
      response_type: 'code',
      scope,
      state,
    })

    let baseUrl = ''
    switch (platform) {
      case 'openPlatform':
        baseUrl = 'https://open.weixin.qq.com/connect/qrconnect'
        break
      case 'officialAccount':
        baseUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize'
        break
      default:
        throw new Error('小程序不支持网页授权URL')
    }

    return `${baseUrl}?${params}&connect_redirect=1#wechat_redirect`
  }

  async getUserInfo(tokens: OAuthTokens): Promise<OAuthUserInfo> {
    const openid = tokens.providerData?.openid as string
    if (!openid) {
      throw new Error('微信OAuth: 缺少openid参数')
    }

    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      openid,
      lang: 'zh_CN',
    })

    const data: WechatUserInfoResponse = await this.getJsonResponse(
      `https://api.weixin.qq.com/sns/userinfo?${params}`,
      undefined,
      '微信获取用户信息'
    )

    if (data.errcode) {
      throw new Error(`微信获取用户信息错误[${data.errcode}]: ${data.errmsg || '未知错误'}`)
    }

    return {
      id: data.openid || openid,
      username: data.nickname || '',
      nickname: data.nickname || '',
      avatar: data.headimgurl || '',
    }
  }

  async verifyMiniProgramCode(code: string): Promise<OAuthUserInfo & { sessionKey: string }> {
    const platformConfig = this.getPlatformConfig('miniProgram')
    const params = new URLSearchParams({
      appid: platformConfig.appId,
      secret: platformConfig.appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    })

    const data: WechatMiniProgramResponse = await this.getJsonResponse(
      `https://api.weixin.qq.com/sns/jscode2session?${params}`,
      undefined,
      '微信小程序登录'
    )

    if (data.errcode) {
      throw new Error(`微信小程序登录错误[${data.errcode}]: ${data.errmsg || '未知错误'}`)
    }

    if (!data.openid) {
      throw new Error('微信小程序登录错误: openid为空')
    }

    if (!data.session_key) {
      throw new Error('微信小程序登录错误: session_key为空')
    }

    return {
      id: data.openid,
      username: '',
      nickname: '',
      avatar: '',
      sessionKey: data.session_key,
    }
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens | null> {
    const params = new URLSearchParams({
      appid: config.oauth.wechat.openPlatform.appId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    try {
      const data: WechatTokenResponse = await this.getJsonResponse(
        `https://api.weixin.qq.com/sns/oauth2/refresh_token?${params}`,
        undefined,
        '微信刷新token'
      )

      if (data.errcode) {
        return null
      }

      this.validateAccessToken(data.access_token, '微信')

      return {
        accessToken: data.access_token!,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: this.buildExpiresAt(data.expires_in),
        providerData: {
          openid: data.openid,
          unionid: data.unionid,
          scope: data.scope,
        },
      }
    } catch {
      return null
    }
  }
}

export default WechatProvider
