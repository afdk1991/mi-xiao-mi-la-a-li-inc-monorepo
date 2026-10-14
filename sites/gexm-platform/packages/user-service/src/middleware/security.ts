import type { Request, Response, NextFunction } from 'express'
import xss from 'xss'
import { errorResponse } from '../utils/response'
import { SECURITY_ERRORS } from '../constants/errorCodes'

export function validateInput(req: Request, res: Response, next: NextFunction): void {
  if (!req.body) {
    next()
    return
  }

  const suspiciousPatterns = [
    /(<script[^>]*>.*?<\/script>)/gi,
    /(<img[^>]*src\s*=\s*["']?javascript:)/gi,
    /(on\w+\s*=\s*["']?[^"']*["']?)/gi,
    /(javascript:)/gi,
  ]

  const bodyString = JSON.stringify(req.body)
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(bodyString)) {
      errorResponse(res, SECURITY_ERRORS.XSS_ATTACK_DETECTED.message, SECURITY_ERRORS.XSS_ATTACK_DETECTED.code, SECURITY_ERRORS.XSS_ATTACK_DETECTED.httpStatus)
      return
    }
  }

  next()
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  function sanitize(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return xss(obj)
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize)
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitizedObj: Record<string, unknown> = {}
      for (const key of Object.keys(obj)) {
        sanitizedObj[key] = sanitize((obj as Record<string, unknown>)[key])
      }
      return sanitizedObj
    }
    return obj
  }

  if (req.body) {
    req.body = sanitize(req.body)
  }

  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key])
      }
    }
  }

  next()
}

export function rateLimitRegister(req: Request, res: Response, next: NextFunction): void {
  next()
}

export function rateLimitVerifyCode(req: Request, res: Response, next: NextFunction): void {
  next()
}