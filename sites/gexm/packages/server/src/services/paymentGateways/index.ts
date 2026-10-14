import config from '../../config'
import logger from '../../utils/logger'
import { WechatPaymentGateway } from './wechat'
import { AlipayPaymentGateway } from './alipay'

interface UnifiedOrderParams {
  body: string
  outTradeNo: string
  totalFee: number
  spbillCreateIp: string
  tradeType?: string
  openid?: string
}

interface TradeCreateParams {
  outTradeNo: string
  totalAmount: number
  subject: string
  body?: string
}

interface PaymentGatewayResult {
  success: boolean
  message: string
  prepayId?: string
  codeUrl?: string
  tradeNo?: string
  params?: Record<string, string>
  errCode?: string
}

interface PaymentGateway {
  unifiedOrder?(params: UnifiedOrderParams): Promise<PaymentGatewayResult>
  tradeCreate?(params: TradeCreateParams): Promise<PaymentGatewayResult>
}

interface GatewayInstances {
  wechat: InstanceType<typeof WechatPaymentGateway> | null
  alipay: InstanceType<typeof AlipayPaymentGateway> | null
}

const gateways: GatewayInstances = {
  wechat: null,
  alipay: null,
}

function initPaymentGateways(): void {
  const wechatEnabled = process.env.WECHAT_PAY_ENABLED === 'true'
  const alipayEnabled = process.env.ALIPAY_ENABLED === 'true'

  if (wechatEnabled) {
    const wechatConfig = {
      appId: process.env.WECHAT_APP_ID || '',
      mchId: process.env.WECHAT_MCH_ID || '',
      apiKey: process.env.WECHAT_API_KEY || '',
      notifyUrl: process.env.WECHAT_NOTIFY_URL || config.payment.notifyUrl,
      sandbox: process.env.WECHAT_SANDBOX === 'true',
    }

    if (!wechatConfig.appId || !wechatConfig.mchId || !wechatConfig.apiKey) {
      logger.warn('微信支付配置不完整，跳过初始化')
    } else {
      gateways.wechat = new WechatPaymentGateway(wechatConfig)
      logger.info('微信支付网关初始化成功')
    }
  }

  if (alipayEnabled) {
    const alipayConfig = {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
      notifyUrl: process.env.ALIPAY_NOTIFY_URL || config.payment.notifyUrl,
      sandbox: process.env.ALIPAY_SANDBOX === 'true',
    }

    if (!alipayConfig.appId || !alipayConfig.privateKey || !alipayConfig.publicKey) {
      logger.warn('支付宝支付配置不完整，跳过初始化')
    } else {
      gateways.alipay = new AlipayPaymentGateway(alipayConfig)
      logger.info('支付宝支付网关初始化成功')
    }
  }
}

function getGateway(method: string): PaymentGateway | null {
  switch (method) {
    case 'wechat':
      return gateways.wechat
    case 'alipay':
      return gateways.alipay
    default:
      return null
  }
}

function isGatewayEnabled(method: string): boolean {
  return getGateway(method) !== null
}

export {
  initPaymentGateways,
  getGateway,
  isGatewayEnabled,
  gateways,
  type PaymentGateway,
  type UnifiedOrderParams,
  type TradeCreateParams,
  type PaymentGatewayResult,
}
export default {
  initPaymentGateways,
  getGateway,
  isGatewayEnabled,
  gateways,
}
