import crypto from 'crypto'
import https from 'https'
import logger from '../../utils/logger'

interface WechatConfig {
  appId: string
  mchId: string
  apiKey: string
  notifyUrl: string
  sandbox?: boolean
}

interface UnifiedOrderParams {
  body: string
  outTradeNo: string
  totalFee: number
  spbillCreateIp: string
  tradeType?: string
  openid?: string
  productId?: string
  timeExpire?: string
  goodsTag?: string
}

interface UnifiedOrderResult {
  success: boolean
  message: string
  prepayId?: string
  codeUrl?: string
  appid?: string
  mchId?: string
  nonceStr?: string
  timestamp?: string
  sign?: string
  errCode?: string
  errCodeDes?: string
}

interface QueryOrderParams {
  outTradeNo?: string
  transactionId?: string
}

interface QueryOrderResult {
  success: boolean
  message: string
  tradeState?: string
  tradeStateDesc?: string
  totalFee?: number
  transactionId?: string
  outTradeNo?: string
  payTime?: string
}

interface CloseOrderParams {
  outTradeNo: string
}

interface CloseOrderResult {
  success: boolean
  message: string
}

class WechatPaymentGateway {
  private config: WechatConfig
  private apiBaseUrl: string

  constructor(config: WechatConfig) {
    this.config = config
    this.apiBaseUrl = config.sandbox ? 'api.mch.weixin.qq.com/sandboxnew' : 'api.mch.weixin.qq.com'
  }

  private buildSign(data: Record<string, unknown>): string {
    const sortedKeys = Object.keys(data).sort()
    let signStr = sortedKeys
      .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
      .map((key) => `${key}=${data[key]}`)
      .join('&')

    signStr += `&key=${this.config.apiKey}`

    return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase()
  }

  private buildXml(data: Record<string, unknown>): string {
    let xml = '<xml>'
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        xml += `<${key}>${value}</${key}>`
      }
    }
    xml += '</xml>'
    return xml
  }

  private parseXml(xml: string): Record<string, string> {
    const result: Record<string, string> = {}
    const regex = /<([^>]+)>([^<]+)<\/\1>/g
    let match
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2]
    }
    return result
  }

  private async httpsPost(
    path: string,
    data: Record<string, unknown>
  ): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const xml = this.buildXml(data)
      const options = {
        hostname: this.apiBaseUrl,
        port: 443,
        path: `/${path}`,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(xml),
        },
      }

      const req = https.request(options, (res) => {
        let responseData = ''
        res.on('data', (chunk) => {
          responseData += chunk
        })
        res.on('end', () => {
          try {
            resolve(this.parseXml(responseData))
          } catch (error) {
            reject(new Error(`XML解析失败: ${(error as Error).message}`))
          }
        })
      })

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${(error as Error).message}`))
      })

      req.write(xml)
      req.end()
    })
  }

  async unifiedOrder(params: UnifiedOrderParams): Promise<UnifiedOrderResult> {
    try {
      const data: Record<string, unknown> = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        nonce_str: crypto.randomBytes(16).toString('hex').toUpperCase(),
        body: params.body,
        out_trade_no: params.outTradeNo,
        total_fee: params.totalFee,
        spbill_create_ip: params.spbillCreateIp,
        notify_url: this.config.notifyUrl,
        trade_type: params.tradeType || 'JSAPI',
        openid: params.openid,
        product_id: params.productId,
        time_expire: params.timeExpire,
        goods_tag: params.goodsTag,
      }

      data.sign = this.buildSign(data)

      const result = await this.httpsPost('pay/unifiedorder', data)

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        const prepayId = result.prepay_id
        const nonceStr = crypto.randomBytes(16).toString('hex').toUpperCase()
        const timestamp = Math.floor(Date.now() / 1000).toString()

        const paySignData: Record<string, unknown> = {
          appId: this.config.appId,
          timeStamp: timestamp,
          nonceStr,
          package: `prepay_id=${prepayId}`,
          signType: 'MD5',
        }

        const paySign = this.buildSign(paySignData)

        return {
          success: true,
          message: '下单成功',
          prepayId,
          codeUrl: result.code_url,
          appid: this.config.appId,
          mchId: this.config.mchId,
          nonceStr,
          timestamp,
          sign: paySign,
        }
      }

      return {
        success: false,
        message: result.err_code_des || '下单失败',
        errCode: result.err_code,
        errCodeDes: result.err_code_des,
      }
    } catch (error) {
      logger.error('微信支付统一下单失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '统一下单失败',
      }
    }
  }

  async queryOrder(params: QueryOrderParams): Promise<QueryOrderResult> {
    try {
      const data: Record<string, unknown> = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        nonce_str: crypto.randomBytes(16).toString('hex').toUpperCase(),
        out_trade_no: params.outTradeNo,
        transaction_id: params.transactionId,
      }

      data.sign = this.buildSign(data)

      const result = await this.httpsPost('pay/orderquery', data)

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        return {
          success: true,
          message: '查询成功',
          tradeState: result.trade_state,
          tradeStateDesc: result.trade_state_desc,
          totalFee: parseInt(result.total_fee || '0', 10),
          transactionId: result.transaction_id,
          outTradeNo: result.out_trade_no,
          payTime: result.time_end,
        }
      }

      return {
        success: false,
        message: result.err_code_des || '查询失败',
        tradeState: result.trade_state,
      }
    } catch (error) {
      logger.error('微信支付订单查询失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '查询失败',
      }
    }
  }

  async closeOrder(params: CloseOrderParams): Promise<CloseOrderResult> {
    try {
      const data: Record<string, unknown> = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        nonce_str: crypto.randomBytes(16).toString('hex').toUpperCase(),
        out_trade_no: params.outTradeNo,
      }

      data.sign = this.buildSign(data)

      const result = await this.httpsPost('pay/closeorder', data)

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        return {
          success: true,
          message: '关闭成功',
        }
      }

      return {
        success: false,
        message: result.err_code_des || '关闭失败',
      }
    } catch (error) {
      logger.error('微信支付订单关闭失败:', (error as Error).message)
      return {
        success: false,
        message: (error as Error).message || '关闭失败',
      }
    }
  }

  verifyCallback(data: Record<string, unknown>): boolean {
    const sign = data.sign as string
    const dataCopy = { ...data }
    delete dataCopy.sign

    const expectedSign = this.buildSign(dataCopy)
    return sign === expectedSign
  }

  parseCallback(xml: string): Record<string, string> {
    return this.parseXml(xml)
  }
}

export { WechatPaymentGateway }
