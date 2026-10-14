import oauthService from './oauthService'
import userModel from '../../models/userModel'
import oauthModel from '../../models/oauthModel'
import oauthStateModel from '../../models/oauthStateModel'
import type { OAuthAccount, OAuthUserInfo } from './interfaces'
import crypto from 'crypto'

const getUniqueId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16)

describe('OAuth Service', () => {
  describe('generateState', () => {
    it('should generate a state string', () => {
      const state = oauthService.generateState('https://example.com/callback')
      expect(state).toBeDefined()
      expect(state.length).toBe(64)
    })

    it('should generate state without redirectUri', () => {
      const state = oauthService.generateState()
      expect(state).toBeDefined()
      expect(state.length).toBe(64)
    })
  })

  describe('verifyState', () => {
    it('should return null for invalid state', () => {
      const result = oauthService.verifyState('invalid-state')
      expect(result).toBeNull()
    })

    it('should return redirectUri for valid state', () => {
      const state = oauthService.generateState('https://example.com/callback')
      const result = oauthService.verifyState(state)
      expect(result).not.toBeNull()
      expect(result?.redirectUri).toBe('https://example.com/callback')
    })

    it('should return undefined redirectUri when not provided', () => {
      const state = oauthService.generateState()
      const result = oauthService.verifyState(state)
      expect(result).not.toBeNull()
      expect(result?.redirectUri).toBeUndefined()
    })

    it('should return null for expired state', () => {
      const state = `test-expired-${getUniqueId()}`
      oauthStateModel.create(state, 'https://example.com', Date.now() - 1000)
      const result = oauthService.verifyState(state)
      expect(result).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false when expiresAt is undefined', () => {
      const account = { expiresAt: undefined } as OAuthAccount
      const result = oauthService.isTokenExpired(account)
      expect(result).toBe(false)
    })

    it('should return false when token is not expired', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString()
      const account = { expiresAt: futureDate } as OAuthAccount
      const result = oauthService.isTokenExpired(account)
      expect(result).toBe(false)
    })

    it('should return true when token is expired', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString()
      const account = { expiresAt: pastDate } as OAuthAccount
      const result = oauthService.isTokenExpired(account)
      expect(result).toBe(true)
    })
  })

  describe('getProvider', () => {
    it('should return provider for supported provider name', () => {
      const provider = oauthService.getProvider('wechat')
      expect(provider).not.toBeNull()
      expect(provider?.name).toBe('wechat')
    })

    it('should return null for unsupported provider name', () => {
      const provider = oauthService.getProvider('unsupported')
      expect(provider).toBeNull()
    })
  })

  describe('bindAccount', () => {
    it('should bind a new OAuth account', async () => {
      const userId = `bind_user_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Bind User',
      })

      const userInfo: OAuthUserInfo = {
        id: `provider_${getUniqueId()}`,
        username: 'test_username',
        nickname: 'Test Nickname',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg',
      }

      await oauthService.bindAccount(user.id, 'wechat', userInfo.id, userInfo)

      const accounts = oauthService.getLinkedAccounts(user.id)
      expect(accounts).toHaveLength(1)
      expect(accounts[0].provider).toBe('wechat')
      expect(accounts[0].providerUserId).toBe(userInfo.id)
    })

    it('should throw error when account is already bound to another user', async () => {
      const userId1 = `bind_user_${getUniqueId()}_1`
      const userId2 = `bind_user_${getUniqueId()}_2`

      const user1 = await userModel.create({
        username: userId1,
        email: `${userId1}@example.com`,
        password: 'Password123!',
        nickname: 'Test Bind User 1',
      })

      const user2 = await userModel.create({
        username: userId2,
        email: `${userId2}@example.com`,
        password: 'Password123!',
        nickname: 'Test Bind User 2',
      })

      const userInfo: OAuthUserInfo = {
        id: `shared_provider_${getUniqueId()}`,
        username: 'shared_user',
        nickname: 'Shared',
        email: '',
        avatar: '',
      }

      await oauthService.bindAccount(user1.id, 'wechat', userInfo.id, userInfo)

      await expect(
        oauthService.bindAccount(user2.id, 'wechat', userInfo.id, userInfo)
      ).rejects.toThrow('该第三方账号已绑定其他用户')
    })

    it('should update existing binding for same provider', async () => {
      const userId = `bind_user_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Bind User',
      })

      const userInfo1: OAuthUserInfo = {
        id: `provider_v1_${getUniqueId()}`,
        username: 'v1',
        nickname: 'V1',
        email: '',
        avatar: '',
      }

      const userInfo2: OAuthUserInfo = {
        id: `provider_v2_${getUniqueId()}`,
        username: 'v2',
        nickname: 'V2',
        email: 'updated@example.com',
        avatar: 'https://example.com/v2.jpg',
      }

      await oauthService.bindAccount(user.id, 'qq', userInfo1.id, userInfo1)
      await oauthService.bindAccount(user.id, 'qq', userInfo2.id, userInfo2)

      const accounts = oauthService.getLinkedAccounts(user.id)
      const qqAccount = accounts.find((a) => a.provider === 'qq')
      expect(qqAccount?.providerUserId).toBe(userInfo2.id)
      expect(qqAccount?.providerEmail).toBe('updated@example.com')
    })
  })

  describe('unbindAccount', () => {
    it('should throw error when no other login method exists', async () => {
      const userId = `unbind_user_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Unbind User',
      })

      const userInfo: OAuthUserInfo = {
        id: `only_provider_${getUniqueId()}`,
        username: 'only',
        nickname: 'Only',
        email: '',
        avatar: '',
      }

      await oauthService.bindAccount(user.id, 'wechat', userInfo.id, userInfo)

      await expect(oauthService.unbindAccount(user.id, 'wechat')).rejects.toThrow(
        '至少需要保留一个登录方式'
      )
    })

    it('should throw error when account not found', async () => {
      const userId = `unbind_user_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Unbind User',
      })

      await expect(oauthService.unbindAccount(user.id, 'wechat')).rejects.toThrow(
        '未找到该绑定关系'
      )
    })

    it('should unbind account when other methods exist', async () => {
      const userId = `unbind_user_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Unbind User',
      })

      const userInfo1: OAuthUserInfo = {
        id: `provider_1_${getUniqueId()}`,
        username: 'p1',
        nickname: 'P1',
        email: '',
        avatar: '',
      }

      const userInfo2: OAuthUserInfo = {
        id: `provider_2_${getUniqueId()}`,
        username: 'p2',
        nickname: 'P2',
        email: '',
        avatar: '',
      }

      await oauthService.bindAccount(user.id, 'wechat', userInfo1.id, userInfo1)
      await oauthService.bindAccount(user.id, 'qq', userInfo2.id, userInfo2)

      await oauthService.unbindAccount(user.id, 'wechat')

      const accounts = oauthService.getLinkedAccounts(user.id)
      expect(accounts).toHaveLength(1)
      expect(accounts[0].provider).toBe('qq')
    })
  })

  describe('getLinkedAccounts', () => {
    it('should return empty array for user with no linked accounts', async () => {
      const userId = `linked_user_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Linked User',
      })

      const accounts = oauthService.getLinkedAccounts(user.id)
      expect(accounts).toHaveLength(0)
    })

    it('should return all linked accounts for user', async () => {
      const userId = `multi_linked_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Multi Linked',
      })

      const userInfo1: OAuthUserInfo = {
        id: `wx_id_${getUniqueId()}`,
        username: 'wx',
        nickname: 'WeChat',
        email: '',
        avatar: '',
      }

      const userInfo2: OAuthUserInfo = {
        id: `qq_id_${getUniqueId()}`,
        username: 'qq',
        nickname: 'QQ',
        email: '',
        avatar: '',
      }

      await oauthService.bindAccount(user.id, 'wechat', userInfo1.id, userInfo1)
      await oauthService.bindAccount(user.id, 'qq', userInfo2.id, userInfo2)

      const accounts = oauthService.getLinkedAccounts(user.id)
      expect(accounts).toHaveLength(2)
      expect(accounts.map((a) => a.provider)).toContain('wechat')
      expect(accounts.map((a) => a.provider)).toContain('qq')
    })
  })

  describe('refreshAccessToken', () => {
    it('should return false when no account found', () => {
      const result = oauthService.refreshAccessToken('non-existent-user', 'wechat')
      expect(result).resolves.toBe(false)
    })

    it('should return false when no refresh token', async () => {
      const userId = `refresh_user_${getUniqueId()}`
      const user = await userModel.create({
        username: userId,
        email: `${userId}@example.com`,
        password: 'Password123!',
        nickname: 'Test Refresh User',
      })

      const userInfo: OAuthUserInfo = {
        id: `refresh_provider_${getUniqueId()}`,
        username: 'rp',
        nickname: 'Refresh Provider',
        email: '',
        avatar: '',
      }

      await oauthService.bindAccount(user.id, 'wechat', userInfo.id, userInfo)

      const result = oauthService.refreshAccessToken(user.id, 'wechat')
      expect(result).resolves.toBe(false)
    })
  })
})
