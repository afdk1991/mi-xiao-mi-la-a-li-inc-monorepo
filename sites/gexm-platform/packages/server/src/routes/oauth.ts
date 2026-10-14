import express from 'express'
import type { Request, Response } from 'express'
import oauthService from '../services/oauth/oauthService'
import { authMiddleware } from '../middleware/auth'
import { oauthLimiter, oauthBindLimiter } from '../middleware/rateLimiter'
import { successResponse, errorResponse } from '../utils/response'
import logger from '../utils/logger'
import type { WechatPlatform } from '../services/oauth/interfaces'

const router = express.Router()

router.get('/:provider/authorize', oauthLimiter, (req: Request, res: Response) => {
  const provider = String(req.params.provider)
  const { redirect_uri: redirectUri, platform } = req.query

  const oauthProvider = oauthService.getProvider(provider)
  if (!oauthProvider) {
    errorResponse(res, '不支持的OAuth提供商: ' + provider, 1001, 400)
    return
  }

  const redirectUriStr = typeof redirectUri === 'string' ? redirectUri : undefined
  const state = oauthService.generateState(redirectUriStr)
  const authUrl = oauthProvider.getAuthorizeUrl(state, redirectUriStr, platform as WechatPlatform)

  successResponse(res, { authUrl, state }, '获取授权URL成功')
})

router.get('/:provider/callback', oauthLimiter, async (req: Request, res: Response) => {
  const provider = String(req.params.provider)
  const { code, state, redirect_uri: redirectUri, platform } = req.query

  const codeStr = typeof code === 'string' ? code : undefined
  const stateStr = typeof state === 'string' ? state : undefined
  const redirectUriStr = typeof redirectUri === 'string' ? redirectUri : undefined

  if (!codeStr) {
    errorResponse(res, '缺少授权码', 1001, 400)
    return
  }

  try {
    const result = await oauthService.handleOAuthCallback(
      provider,
      codeStr,
      stateStr,
      redirectUriStr,
      (platform as WechatPlatform) || undefined
    )

    logger.info('OAuth login success: ' + provider + ' -> ' + (result.user?.username || ''))
    successResponse(res, result, '登录成功')
  } catch (err) {
    logger.error('OAuth login failed: ' + provider, { error: (err as Error).message })
    errorResponse(res, (err as Error).message, 1001, 400)
  }
})

router.post('/:provider/login', oauthLimiter, async (req: Request, res: Response) => {
  const provider = String(req.params.provider)
  const { code } = req.body

  if (!code) {
    errorResponse(res, '缺少授权码', 1001, 400)
    return
  }

  try {
    const result = await oauthService.handleMiniProgramLogin(provider, String(code))
    logger.info('Mini program login success: ' + provider)
    successResponse(res, result, '登录成功')
  } catch (err) {
    logger.error('Mini program login failed: ' + provider, { error: (err as Error).message })
    errorResponse(res, (err as Error).message, 1001, 400)
  }
})

router.post(
  '/:provider/official-account/login',
  oauthLimiter,
  async (req: Request, res: Response) => {
    const provider = String(req.params.provider)
    const { code } = req.body
    const codeStr = Array.isArray(code) ? code[0] : code

    if (!codeStr) {
      errorResponse(res, '缺少授权码', 1001, 400)
      return
    }

    try {
      const result = await oauthService.handleOfficialAccountLogin(provider, codeStr)
      logger.info('Official account login success: ' + provider)
      successResponse(res, result, '登录成功')
    } catch (err) {
      logger.error('Official account login failed: ' + provider, { error: (err as Error).message })
      errorResponse(res, (err as Error).message, 1001, 400)
    }
  }
)

router.get('/:provider/official-account/authorize', oauthLimiter, (req: Request, res: Response) => {
  const provider = String(req.params.provider)
  const { redirect_uri: redirectUri } = req.query
  const redirectUriStr = typeof redirectUri === 'string' ? redirectUri : undefined

  const oauthProvider = oauthService.getProvider(provider)
  if (!oauthProvider) {
    errorResponse(res, '不支持的OAuth提供商: ' + provider, 1001, 400)
    return
  }

  const state = oauthService.generateState(redirectUriStr)
  const authUrl = oauthProvider.getAuthorizeUrl(state, redirectUriStr || '', 'officialAccount')

  successResponse(res, { authUrl, state }, '获取公众号授权URL成功')
})

router.post(
  '/:provider/bind',
  authMiddleware,
  oauthBindLimiter,
  async (req: Request, res: Response) => {
    const provider = String(req.params.provider)
    const { code } = req.body
    const codeStr = Array.isArray(code) ? code[0] : code
    const userId = String(req.userId || '')

    if (!codeStr) {
      errorResponse(res, '缺少授权码', 1001, 400)
      return
    }

    try {
      const oauthProvider = oauthService.getProvider(provider)
      if (!oauthProvider) {
        errorResponse(res, '不支持的OAuth提供商: ' + provider, 1001, 400)
        return
      }

      const tokens = await oauthProvider.getTokens(codeStr)
      const userInfo = await oauthProvider.getUserInfo(tokens)

      await oauthService.bindAccount(userId, provider, userInfo.id, userInfo)
      logger.info('OAuth bind success: ' + userId + ' -> ' + provider)
      successResponse(res, null, '绑定成功')
    } catch (err) {
      logger.error('OAuth bind failed: ' + userId + ' -> ' + provider, {
        error: (err as Error).message,
      })
      errorResponse(res, (err as Error).message, 1001, 400)
    }
  }
)

router.delete('/:provider/unbind', authMiddleware, async (req: Request, res: Response) => {
  const provider = String(req.params.provider)
  const userId = String(req.userId || '')

  try {
    await oauthService.unbindAccount(userId, provider)
    logger.info('OAuth unbind success: ' + userId + ' -> ' + provider)
    successResponse(res, null, '解绑成功')
  } catch (err) {
    logger.error('OAuth unbind failed: ' + userId + ' -> ' + provider, {
      error: (err as Error).message,
    })
    errorResponse(res, (err as Error).message, 1001, 400)
  }
})

router.get('/accounts', authMiddleware, (req: Request, res: Response) => {
  const userId = String(req.userId || '')
  const accounts = oauthService.getLinkedAccounts(userId)
  successResponse(res, accounts, '获取绑定账号成功')
})

export default router
