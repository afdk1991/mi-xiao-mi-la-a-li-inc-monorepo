import crypto from 'crypto'
import https from 'https'
import logger from '../../utils/logger'

interface AlipayConfig {
  appId: string
  privateKey: string
  publicKey: string
  notifyUrl: string
  sandbox?: boolean
}

interface TradeCreateParams {
  outTradeNo: string
  totalAmount: number
  subject: string
  body?: string
  productCode?: string
  timeoutExpress?: string
  passBackParams?: string
  goodsDetail?: string
}

interface TradeCreateResult {
  success: boolean
  message: string
  tradeNo?: string
  qrCode?: string
  params?: Record<string, string>
  subMsg?: string
}

interface TradeQueryParams {
  outTradeNo?: string
  tradeNo?: string
}

interface TradeQueryResult {
  success: boolean
  message: string
  tradeStatus?: string
  totalAmount?: number
  tradeNo?: string
  outTradeNo?: string
  payTime?: string
}

interface TradeCloseParams {
  outTradeNo?: string
  tradeNo?: string
}

interface TradeCloseResult {
  success: boolean
  message: string
  tradeNo?: string
  outTradeNo?: string
}

interface RefundParams {
  outTradeNo?: string
  tradeNo?: string
  refundAmount: number
  outRequestNo?: string
  refundReason?: string
}

interface RefundResult {
  success: boolean
  message: string
  tradeNo?: string
  outTradeNo?: string
  refundAmount?: number
}

class AlipayPaymentGateway {
  private config: AlipayConfig
  private apiBaseUrl: string
  private gatewayUrl: string

  constructor(config: AlipayConfig) {
    this.config = config
    this.apiBaseUrl = config.sandbox ? 'openapi.alipaydev.com' : 'openapi.alipay.com'
    this.gatewayUrl = config.sandbox
      ? 'https://openapi.alipaydev.com/gateway.do'
      : 'https://openapi.alipay.com/gateway.do'
  }

  private sign(data: Record<string, unknown>): string {
    const sortedKeys = Object.keys(data).sort()
    const signStr = sortedKeys
      .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
      .map((key) => `${key}=${data[key]}`)
      .join('&')

    return crypto
      .createSign('RSA-SHA256')
      .update(signStr, 'utf8')
      .sign(this.config.privateKey, 'base64')
  }

  private verifySign(data: Record<string, unknown>, sign: string): boolean {
    const sortedKeys = Object.keys(data).sort()
    const signStr = sortedKeys
      .filter(
        (key) => data[key] !== undefined && data[key] !== null && data[key] !== '' && key !== 'sign'
      )
      .map((key) => `${key}=${data[key]}`)
      .join('&')

    return crypto
      .createVerify('RSA-SHA256')
      .update(signStr, 'utf8')
      .verify(this.config.publicKey, sign, 'base64')
  }

  private async httpsPost(data: Record<string, unknown>): Promise<string> {
    return new Promise((resolve, reject) => {
      const postData = Object.keys(data)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(data[key]))}`)
        .join('&')

      const options = {
        hostname: this.apiBaseUrl,
        port: 443,
        path: '/gateway.do',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      }

      const req = https.request(options, (res) => {
        let responseData = ''
        res.on('data', (chunk) => {
          responseData += chunk
        })
        res.on('end', () => {
          resolve(responseData)
        })
      })

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${(error as Error).message}`))
      })

      req.write(postData)
      req.end()
    })
  }

  private parseResponse(response: string): Record<string, unknown> {
    try {
      return JSON.parse(response)
    } catch {
      const params: Record<string, unknown> = {}
      const pairs = response.split('&')
      for (const pair of pairs) {
        const [key, value] = pair.split('=')
        if (key) {
          params[key] = decodeURIComponent(value || '')
        }
      }
      return params
    }
  }

  async tradeCreate(params: TradeCreateParams): Promise<TradeCreateResult> {
    try {
      const data: Record<string, unknown> = {
        app_id: this.config.appId,
        method: 'alipay.trade.create',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        notify_url: this.config.notifyUrl,
        biz_content: JSON.stringify({
          out_trade_no: params.outTradeNo,
          total_amount: params.totalAmount,
          subject: params.subject,
          body: params.body,
          product_code: params.productCode || 'FAST_INSTANT_TRADE_PAY',
          timeout_express: params.timeoutExpress || '30m',
          passback_params: params.passBackParams,
          goods_detail: params.goodsDetail ? JSON.parse(params.goodsDetail) : undefined,
        }),
      }

      data.sign = this.sign(data)

      const response = await this.httpsPost(data)
      const result = this.parseResponse(response)
      const responseKey = 'alipay_trade_create_response'
      const resp = result[responseKey] as Record<string, unknown>

      if (resp?.code === '10000') {
        return {
          success: true,
          message: '下单成功',
          tradeNo: resp.trade_no as string,
        }
      }

      return {
        success: false,
        message: String(resp?.msg || '下单失败'),
        subMsg: String(resp?.sub_msg || ''),
      }
    } catch (error) {
      logger.error('支付宝下单失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '下单失败',
      }
    }
  }

  async tradePrecreate(params: TradeCreateParams): Promise<TradeCreateResult> {
    try {
      const data: Record<string, unknown> = {
        app_id: this.config.appId,
        method: 'alipay.trade.precreate',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        notify_url: this.config.notifyUrl,
        biz_content: JSON.stringify({
          out_trade_no: params.outTradeNo,
          total_amount: params.totalAmount,
          subject: params.subject,
          body: params.body,
          timeout_express: params.timeoutExpress || '30m',
          passback_params: params.passBackParams,
          goods_detail: params.goodsDetail ? JSON.parse(params.goodsDetail) : undefined,
        }),
      }

      data.sign = this.sign(data)

      const response = await this.httpsPost(data)
      const result = this.parseResponse(response)
      const responseKey = 'alipay_trade_precreate_response'
      const resp = result[responseKey] as Record<string, unknown>

      if (resp?.code === '10000') {
        return {
          success: true,
          message: '下单成功',
          tradeNo: resp.trade_no as string,
          qrCode: resp.qr_code as string,
        }
      }

      return {
        success: false,
        message: String(resp?.msg || '下单失败'),
        subMsg: String(resp?.sub_msg || ''),
      }
    } catch (error) {
      logger.error('支付宝预下单失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '预下单失败',
      }
    }
  }

  async tradeAppPay(params: TradeCreateParams): Promise<TradeCreateResult> {
    try {
      const data: Record<string, unknown> = {
        app_id: this.config.appId,
        method: 'alipay.trade.app.pay',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        notify_url: this.config.notifyUrl,
        biz_content: JSON.stringify({
          out_trade_no: params.outTradeNo,
          total_amount: params.totalAmount,
          subject: params.subject,
          body: params.body,
          timeout_express: params.timeoutExpress || '30m',
        }),
      }

      data.sign = this.sign(data)

      const paramsString = Object.keys(data)
        .sort()
        .map((key) => `${key}=${encodeURIComponent(String(data[key]))}`)
        .join('&')

      return {
        success: true,
        message: '下单成功',
        params: { paramsStr: paramsString },
      }
    } catch (error) {
      logger.error('支付宝APP支付下单失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '下单失败',
      }
    }
  }

  async tradeQuery(params: TradeQueryParams): Promise<TradeQueryResult> {
    try {
      const data: Record<string, unknown> = {
        app_id: this.config.appId,
        method: 'alipay.trade.query',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        biz_content: JSON.stringify({
          out_trade_no: params.outTradeNo,
          trade_no: params.tradeNo,
        }),
      }

      data.sign = this.sign(data)

      const response = await this.httpsPost(data)
      const result = this.parseResponse(response)
      const responseKey = 'alipay_trade_query_response'
      const resp = result[responseKey] as Record<string, unknown>

      if (resp?.code === '10000') {
        return {
          success: true,
          message: '查询成功',
          tradeStatus: resp.trade_status as string,
          totalAmount: parseFloat((resp.total_amount as string) || '0'),
          tradeNo: resp.trade_no as string,
          outTradeNo: resp.out_trade_no as string,
          payTime: resp.send_pay_date as string,
        }
      }

      return {
        success: false,
        message: String(resp?.msg || '查询失败'),
        tradeStatus: String(resp?.trade_status || ''),
      }
    } catch (error) {
      logger.error('支付宝订单查询失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '查询失败',
      }
    }
  }

  async tradeClose(params: TradeCloseParams): Promise<TradeCloseResult> {
    try {
      const data: Record<string, unknown> = {
        app_id: this.config.appId,
        method: 'alipay.trade.close',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        biz_content: JSON.stringify({
          out_trade_no: params.outTradeNo,
          trade_no: params.tradeNo,
        }),
      }

      data.sign = this.sign(data)

      const response = await this.httpsPost(data)
      const result = this.parseResponse(response)
      const responseKey = 'alipay_trade_close_response'
      const resp = result[responseKey] as Record<string, unknown>

      if (resp?.code === '10000') {
        return {
          success: true,
          message: '关闭成功',
          tradeNo: resp.trade_no as string,
          outTradeNo: resp.out_trade_no as string,
        }
      }

      return {
        success: false,
        message: String(resp?.msg || '关闭失败'),
      }
    } catch (error) {
      logger.error('支付宝订单关闭失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '关闭失败',
      }
    }
  }

  async tradeRefund(params: RefundParams): Promise<RefundResult> {
    try {
      const data: Record<string, unknown> = {
        app_id: this.config.appId,
        method: 'alipay.trade.refund',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        biz_content: JSON.stringify({
          out_trade_no: params.outTradeNo,
          trade_no: params.tradeNo,
          refund_amount: params.refundAmount,
          out_request_no: params.outRequestNo || `REFUND_${Date.now()}`,
          refund_reason: params.refundReason,
        }),
      }

      data.sign = this.sign(data)

      const response = await this.httpsPost(data)
      const result = this.parseResponse(response)
      const responseKey = 'alipay_trade_refund_response'
      const resp = result[responseKey] as Record<string, unknown>

      if (resp?.code === '10000') {
        return {
          success: true,
          message: '退款成功',
          tradeNo: resp.trade_no as string,
          outTradeNo: resp.out_trade_no as string,
          refundAmount: parseFloat((resp.refund_amount as string) || '0'),
        }
      }

      return {
        success: false,
        message: String(resp?.msg || '退款失败'),
      }
    } catch (error) {
      logger.error('支付宝退款失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '退款失败',
      }
    }
  }

  verifyCallback(data: Record<string, unknown>): boolean {
    const sign = data.sign as string
    if (!sign) {
      return false
    }

    const dataCopy: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'sign' && key !== 'sign_type') {
        dataCopy[key] = value
      }
    }

    return this.verifySign(dataCopy, sign)
  }
}

export { AlipayPaymentGateway }
