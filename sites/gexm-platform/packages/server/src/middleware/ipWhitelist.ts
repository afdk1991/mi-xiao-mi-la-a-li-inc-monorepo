import { Request, Response, NextFunction } from 'express'
import config from '../config'
import { errorResponse } from '../utils/response'

interface IPWhitelistConfig {
  enabled: boolean
  allowedIPs: string[]
  allowedCIDR: string[]
  proxyTrust: boolean
}

function getClientIP(req: Request): string {
  const proxyTrust = config.payment?.ipWhitelist?.proxyTrust !== false

  const forwardedFor = req.headers['x-forwarded-for']
  if (forwardedFor && proxyTrust) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]
    return ips.trim()
  }

  const realIP = req.headers['x-real-ip']
  if (realIP && proxyTrust) {
    return Array.isArray(realIP) ? realIP[0] : realIP
  }

  return req.socket?.remoteAddress?.replace(/^::ffff:/, '') || ''
}

function isIPAllowed(ip: string, whitelist: IPWhitelistConfig): boolean {
  if (!whitelist.enabled) {
    return true
  }

  if (whitelist.allowedIPs.includes(ip)) {
    return true
  }

  for (const cidr of whitelist.allowedCIDR) {
    if (isIPInCIDR(ip, cidr)) {
      return true
    }
  }

  return false
}

function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/')
    const mask = parseInt(bits, 10)

    if (isNaN(mask) || mask < 0 || mask > 32) {
      return false
    }

    const maskBits = mask === 0 ? 0 : ~((1 << (32 - mask)) - 1)

    const ipBits = ipToNumber(ip)
    const rangeBits = ipToNumber(range)

    return (ipBits & maskBits) === (rangeBits & maskBits)
  } catch {
    return false
  }
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return 0
  }

  return parts.reduce((acc, part) => {
    const num = parseInt(part, 10)
    if (isNaN(num) || num < 0 || num > 255) {
      return 0
    }
    return (acc << 8) + num
  }, 0)
}

function ipWhitelistMiddleware(req: Request, res: Response, next: NextFunction): void {
  const whitelistConfig: IPWhitelistConfig = {
    enabled: config.payment?.ipWhitelist?.enabled === true,
    allowedIPs: config.payment?.ipWhitelist?.allowedIPs || [],
    allowedCIDR: config.payment?.ipWhitelist?.allowedCIDR || [],
    proxyTrust: config.payment?.ipWhitelist?.proxyTrust !== false,
  }

  if (!whitelistConfig.enabled) {
    next()
    return
  }

  if (whitelistConfig.allowedIPs.length === 0 && whitelistConfig.allowedCIDR.length === 0) {
    next()
    return
  }

  const clientIP = getClientIP(req)

  if (!isIPAllowed(clientIP, whitelistConfig)) {
    const logger = require('../utils/logger')
    logger.warn(`支付回调IP白名单拒绝: IP=${clientIP}, Path=${req.path}, Method=${req.method}`)

    errorResponse(res, 'IP地址不在允许范围内', 1007, 403)
    return
  }

  next()
}

export { ipWhitelistMiddleware, getClientIP, isIPAllowed, isIPInCIDR }
