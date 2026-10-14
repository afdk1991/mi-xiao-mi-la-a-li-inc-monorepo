import crypto from 'crypto'
import userModel, { type User } from '../../models/userModel'
import oauthModel from '../../models/oauthModel'
import oauthStateModel from '../../models/oauthStateModel'
import WechatProvider from './wechatProvider'
import QQProvider from './qqProvider'
import WeiboProvider from './weiboProvider'
import AlipayProvider from './alipayProvider'
import GoogleProvider from './googleProvider'
import FacebookProvider from './facebookProvider'
import TwitterProvider from './twitterProvider'
import type {
  IOAuthProvider,
  OAuthUserInfo,
  OAuthTokens,
  WechatPlatform,
  OAuthAccount,
} from './interfaces'

const providers: Record<string, IOAuthProvider> = {
  wechat: new WechatProvider(),
  qq: new QQProvider(),
  weibo: new WeiboProvider(),
  alipay: new AlipayProvider(),
  google: new GoogleProvider(),
  facebook: new FacebookProvider(),
  twitter: new TwitterProvider(),
}

function isWechatProvider(provider: IOAuthProvider): provider is WechatProvider {
  return provider.name === 'wechat'
}

interface FindOrCreateUserOptions {
  providerName: string
  userInfo: OAuthUserInfo
  tokens?: OAuthTokens
  defaultNickname?: string
  defaultUsernamePrefix?: string
  bindToExistingEmail?: boolean
}

async function findOrCreateUser({
  providerName,
  userInfo,
  tokens,
  defaultNickname,
  defaultUsernamePrefix,
  bindToExistingEmail = false,
}: FindOrCreateUserOptions): Promise<{ user: User; isNewUser: boolean }> {
  const oauthAccount = oauthModel.findByProviderAndUserId(providerName, userInfo.id)

  if (oauthAccount) {
    const user = userModel.findById(oauthAccount.userId)
    if (!user) {
      throw new Error('用户不存在')
    }

    if (tokens) {
      oauthModel.update(oauthAccount.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        providerUsername: userInfo.username,
        providerEmail: userInfo.email,
        avatar: userInfo.avatar,
      })
    }

    userModel.updateLastLogin(user.id)
    return { user, isNewUser: false }
  }

  const email = userInfo.email || `${userInfo.id}@${providerName}.oauth`

  if (bindToExistingEmail && userInfo.email) {
    const existingUser = userModel.findByEmail(email)
    if (existingUser) {
      oauthModel.create({
        userId: existingUser.id,
        provider: providerName,
        providerUserId: userInfo.id,
        providerUsername: userInfo.username,
        providerEmail: userInfo.email,
        avatar: userInfo.avatar,
        accessToken: tokens?.accessToken,
        refreshToken: tokens?.refreshToken,
        expiresAt: tokens?.expiresAt,
      })

      userModel.updateLastLogin(existingUser.id)
      return { user: existingUser, isNewUser: false }
    }
  }

  let username =
    userInfo.nickname ||
    userInfo.username ||
    `${defaultUsernamePrefix || 'user'}_${userInfo.id.slice(0, 16)}`

  let counter = 1
  while (userModel.findByUsername(username)) {
    username = `${userInfo.nickname || defaultUsernamePrefix || 'user'}_${counter++}`
  }

  const newUser = await userModel.create({
    username,
    email,
    password: '',
    nickname: userInfo.nickname || userInfo.username || defaultNickname || '',
    avatar: userInfo.avatar,
  })

  oauthModel.create({
    userId: newUser.id,
    provider: providerName,
    providerUserId: userInfo.id,
    providerUsername: userInfo.username,
    providerEmail: userInfo.email,
    avatar: userInfo.avatar,
    accessToken: tokens?.accessToken,
    refreshToken: tokens?.refreshToken,
    expiresAt: tokens?.expiresAt,
  })

  userModel.updateLastLogin(newUser.id)
  return { user: newUser, isNewUser: true }
}

interface LoginResponse {
  user: ReturnType<typeof userModel.sanitizeUser>
  accessToken: string
  refreshToken: string
  expiresIn: number
}

function generateLoginResponse(user: User): LoginResponse {
  const accessToken = userModel.generateToken(user)
  const refreshToken = userModel.generateRefreshToken(user.id)

  return {
    user: userModel.sanitizeUser(user),
    accessToken,
    refreshToken,
    expiresIn: 86400,
  }
}

const oauthService: {
  getProvider: (providerName: string) => IOAuthProvider | null
  generateState: (redirectUri?: string) => string
  verifyState: (state: string) => { redirectUri?: string } | null
  handleOAuthCallback: (
    providerName: string,
    code: string,
    state: string,
    redirectUri?: string,
    platform?: WechatPlatform
  ) => Promise<{
    user: ReturnType<typeof userModel.sanitizeUser>
    accessToken: string
    refreshToken: string
    expiresIn: number
    isNewUser: boolean
  }>
  handleMiniProgramLogin: (
    providerName: string,
    code: string
  ) => Promise<{
    user: ReturnType<typeof userModel.sanitizeUser>
    accessToken: string
    refreshToken: string
    expiresIn: number
    isNewUser: boolean
  }>
  handleOfficialAccountLogin: (
    providerName: string,
    code: string
  ) => Promise<{
    user: ReturnType<typeof userModel.sanitizeUser>
    accessToken: string
    refreshToken: string
    expiresIn: number
    isNewUser: boolean
  }>
  bindAccount: (
    userId: string,
    providerName: string,
    providerUserId: string,
    userInfo: OAuthUserInfo
  ) => Promise<void>
  unbindAccount: (userId: string, providerName: string) => Promise<void>
  getLinkedAccounts: (userId: string) => ReturnType<typeof oauthModel.findByUserId>
  refreshAccessToken: (userId: string, providerName: string) => Promise<boolean>
  isTokenExpired: (oauthAccount: OAuthAccount) => boolean
} = {
  getProvider(providerName) {
    return providers[providerName] || null
  },

  generateState(redirectUri?: string) {
    const state = crypto.randomBytes(32).toString('hex')
    oauthStateModel.create(state, redirectUri, Date.now() + 5 * 60 * 1000)
    return state
  },

  verifyState(state) {
    const data = oauthStateModel.findByState(state)
    if (!data || data.expiresAt < Date.now()) {
      return null
    }
    oauthStateModel.deleteByState(state)
    return { redirectUri: data.redirectUri || undefined }
  },

  async handleOAuthCallback(providerName, code, state, redirectUri, platform) {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`不支持的OAuth提供商: ${providerName}`)
    }

    const stateData = this.verifyState(state)
    if (!stateData) {
      throw new Error('无效或过期的state参数')
    }

    let tokens: OAuthTokens
    if (platform && isWechatProvider(provider)) {
      tokens = await provider.getTokens(code, redirectUri || stateData.redirectUri, platform)
    } else {
      tokens = await provider.getTokens(code, redirectUri || stateData.redirectUri)
    }

    const userInfo = await provider.getUserInfo(tokens)

    const { user, isNewUser } = await findOrCreateUser({
      providerName,
      userInfo,
      tokens,
      bindToExistingEmail: true,
    })
    return {
      ...generateLoginResponse(user),
      isNewUser,
    }
  },

  async handleMiniProgramLogin(providerName, code) {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`不支持的OAuth提供商: ${providerName}`)
    }

    if (!provider.verifyMiniProgramCode) {
      throw new Error('该提供商不支持小程序登录')
    }

    const userInfo = await provider.verifyMiniProgramCode(code)
    const defaultNickname = `微信用户${userInfo.id.slice(0, 8)}`

    const { user, isNewUser } = await findOrCreateUser({
      providerName,
      userInfo,
      defaultNickname,
      defaultUsernamePrefix: 'wx',
    })
    return {
      ...generateLoginResponse(user),
      isNewUser,
    }
  },

  async handleOfficialAccountLogin(providerName, code) {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`不支持的OAuth提供商: ${providerName}`)
    }

    if (!isWechatProvider(provider)) {
      throw new Error('公众号登录仅支持微信提供商')
    }

    const tokens = await provider.getTokens(code, undefined, 'officialAccount')
    const scope = tokens.providerData?.scope as string

    let userInfo: OAuthUserInfo
    const defaultNickname = `微信公众号用户${(tokens.providerData?.openid as string)?.slice(0, 8) || ''}`

    if (scope === 'snsapi_base') {
      userInfo = {
        id: tokens.providerData?.openid as string,
        username: '',
        nickname: '',
        avatar: '',
      }
    } else {
      userInfo = await provider.getUserInfo(tokens)
    }

    const { user, isNewUser } = await findOrCreateUser({
      providerName,
      userInfo,
      tokens,
      defaultNickname,
      defaultUsernamePrefix: 'wx_oa',
    })
    return {
      ...generateLoginResponse(user),
      isNewUser,
    }
  },

  async bindAccount(userId, providerName, providerUserId, userInfo) {
    const existingAccount = oauthModel.findByProviderAndUserId(providerName, providerUserId)
    if (existingAccount && existingAccount.userId !== userId) {
      throw new Error('该第三方账号已绑定其他用户')
    }

    const existingBinding = oauthModel
      .findByUserId(userId)
      .find((acc) => acc.provider === providerName)
    if (existingBinding) {
      await oauthModel.update(existingBinding.id, {
        providerUserId,
        providerUsername: userInfo.username,
        providerEmail: userInfo.email,
        avatar: userInfo.avatar,
      })
      return
    }

    await oauthModel.create({
      userId,
      provider: providerName,
      providerUserId,
      providerUsername: userInfo.username,
      providerEmail: userInfo.email,
      avatar: userInfo.avatar,
    })
  },

  async unbindAccount(userId, providerName) {
    const accounts = oauthModel.findByUserId(userId)

    const targetAccount = accounts.find((acc) => acc.provider === providerName)
    if (!targetAccount) {
      throw new Error('未找到该绑定关系')
    }

    const localAccount = accounts.find((acc) => acc.provider === 'local')
    if (!localAccount && accounts.length <= 1) {
      throw new Error('至少需要保留一个登录方式')
    }

    await oauthModel.delete(targetAccount.id)
  },

  getLinkedAccounts(userId) {
    return oauthModel.findByUserId(userId)
  },

  async refreshAccessToken(userId: string, providerName: string): Promise<boolean> {
    const accounts = oauthModel.findByUserId(userId)
    const oauthAccount = accounts.find((acc) => acc.provider === providerName)
    if (!oauthAccount) {
      return false
    }

    if (!oauthAccount.refreshToken) {
      return false
    }

    const provider = this.getProvider(providerName)
    if (!provider) {
      return false
    }

    try {
      const newTokens = await provider.refreshToken(oauthAccount.refreshToken)
      if (newTokens) {
        oauthModel.update(oauthAccount.id, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || oauthAccount.refreshToken,
          expiresAt: newTokens.expiresAt,
        })
        return true
      }
      return false
    } catch {
      return false
    }
  },

  isTokenExpired(oauthAccount: OAuthAccount): boolean {
    if (!oauthAccount.expiresAt) {
      return false
    }
    return new Date(oauthAccount.expiresAt).getTime() < Date.now()
  },
}

export default oauthService
