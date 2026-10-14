import config from '../config'
import logger from '../utils/logger'

export interface PaymentGateway {
  unifiedOrder?: (params: {
    body: string
    outTradeNo: string
    totalFee: number
    spbillCreateIp: string
    tradeType?: string
    notifyUrl?: string
  }) => Promise<Record<string, unknown>>
  tradeCreate?: (params: {
    outTradeNo: string
    totalAmount: number
    subject: string
    body?: string
    notifyUrl?: string
  }) => Promise<Record<string, unknown>>
  queryOrder?: (params: {
    outTradeNo?: string
    transactionId?: string
  }) => Promise<Record<string, unknown>>
  closeOrder?: (params: { outTradeNo: string }) => Promise<Record<string, unknown>>
  refund?: (params: {
    outTradeNo?: string
    transactionId?: string
    refundAmount: number
    refundReason?: string
  }) => Promise<Record<string, unknown>>
}

interface GatewayConfig {
  enabled: boolean
  appId?: string
  appSecret?: string
  mchId?: string
  apiKey?: string
  privateKey?: string
  publicKey?: string
  signType?: string
  notifyUrl?: string
}

interface Gateways {
  wechat: PaymentGateway | null
  alipay: PaymentGateway | null
}

const gateways: Gateways = {
  wechat: null,
  alipay: null,
}

function createWechatGateway(config: GatewayConfig): PaymentGateway {
  return {
    unifiedOrder: async (params) => {
      if (!config.enabled) {
        return { success: false, message: '微信支付未启用' }
      }
      logger.info('微信统一下单模拟: outTradeNo=%s', params.outTradeNo)
      return {
        success: true,
        message: '模拟微信支付下单成功',
        prepayId: 'prepay_' + Date.now(),
        outTradeNo: params.outTradeNo,
      }
    },
    queryOrder: async (params) => {
      return {
        success: true,
        status: 'SUCCESS',
        outTradeNo: params.outTradeNo,
      }
    },
    closeOrder: async (params) => {
      return { success: true, message: '订单已关闭' }
    },
    refund: async (params) => {
      return { success: true, refundId: 'refund_' + Date.now() }
    },
  }
}

function createAlipayGateway(config: GatewayConfig): PaymentGateway {
  return {
    tradeCreate: async (params) => {
      if (!config.enabled) {
        return { success: false, message: '支付宝支付未启用' }
      }
      logger.info('支付宝创建交易模拟: outTradeNo=%s', params.outTradeNo)
      return {
        success: true,
        message: '模拟支付宝下单成功',
        tradeNo: 'trade_' + Date.now(),
        outTradeNo: params.outTradeNo,
      }
    },
    queryOrder: async (params) => {
      return {
        success: true,
        status: 'TRADE_SUCCESS',
        outTradeNo: params.outTradeNo,
      }
    },
    closeOrder: async (params) => {
      return { success: true, message: '订单已关闭' }
    },
    refund: async (params) => {
      return { success: true, refundId: 'refund_' + Date.now() }
    },
  }
}

export function initPaymentGateways(): void {
  const paymentConfig = config.payment || { secret: '', notifyUrl: '', signAlgorithm: 'MD5' }

  if (paymentConfig.wechat?.enabled) {
    gateways.wechat = createWechatGateway(paymentConfig.wechat)
    logger.info('微信支付网关初始化完成')
  } else {
    gateways.wechat = createWechatGateway({ enabled: false })
    logger.info('微信支付网关未启用，使用模拟模式')
  }

  if (paymentConfig.alipay?.enabled) {
    gateways.alipay = createAlipayGateway(paymentConfig.alipay)
    logger.info('支付宝支付网关初始化完成')
  } else {
    gateways.alipay = createAlipayGateway({ enabled: false })
    logger.info('支付宝支付网关未启用，使用模拟模式')
  }
}

export function getGateway(method: string): PaymentGateway | null {
  const normalizedMethod = method.toLowerCase() as keyof Gateways
  return gateways[normalizedMethod] || null
}

export function getEnabledGateways(): string[] {
  const enabled: string[] = []
  if (gateways.wechat) {
    enabled.push('wechat')
  }
  if (gateways.alipay) {
    enabled.push('alipay')
  }
  return enabled
}

export default {
  initPaymentGateways,
  getGateway,
  getEnabledGateways,
}
