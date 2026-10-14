import { Request, Response, NextFunction } from 'express'
import {
  xssFilterMiddleware,
  csrfTokenMiddleware,
  csrfProtectionMiddleware,
  securityHeadersMiddleware,
  forceHttpsMiddleware,
} from './security'

describe('Security Middleware', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {}
    res = {
      setHeader: jest.fn(),
      redirect: jest.fn(),
    }
    next = jest.fn()
  })

  describe('xssFilterMiddleware', () => {
    it('should set X-XSS-Protection header', () => {
      xssFilterMiddleware(req as Request, res as Response, next)
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
    })

    it('should set X-Content-Type-Options header', () => {
      xssFilterMiddleware(req as Request, res as Response, next)
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
    })

    it('should call next', () => {
      xssFilterMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('csrfTokenMiddleware', () => {
    it('should set X-CSRF-Token header', () => {
      csrfTokenMiddleware(req as Request, res as Response, next)
      expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', '')
    })

    it('should call next', () => {
      csrfTokenMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('csrfProtectionMiddleware', () => {
    it('should reject request without CSRF token', () => {
      req.headers = {}
      const testRes = {
        ...res,
        status: jest.fn(() => ({ json: jest.fn() })),
      } as unknown as Response
      csrfProtectionMiddleware(req as Request, testRes, next)
      expect(next).not.toHaveBeenCalled()
    })

    it('should allow request with CSRF token', () => {
      req.headers = { 'x-csrf-token': 'valid-token' }
      csrfProtectionMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('securityHeadersMiddleware', () => {
    it('should set HSTS header', () => {
      securityHeadersMiddleware(req as Request, res as Response, next)
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      )
    })

    it('should set X-Frame-Options header', () => {
      securityHeadersMiddleware(req as Request, res as Response, next)
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
    })

    it('should set Referrer-Policy header', () => {
      securityHeadersMiddleware(req as Request, res as Response, next)
      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      )
    })

    it('should set Permissions-Policy header', () => {
      securityHeadersMiddleware(req as Request, res as Response, next)
      expect(res.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
      )
    })

    it('should call next', () => {
      securityHeadersMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('forceHttpsMiddleware', () => {
    it('should redirect HTTP to HTTPS in production', () => {
      process.env.NODE_ENV = 'production'
      const testReq = { protocol: 'http', hostname: 'example.com', originalUrl: '/api/test' }
      forceHttpsMiddleware(testReq as Request, res as Response, next)
      expect(res.redirect).toHaveBeenCalledWith('https://example.com/api/test')
    })

    it('should not redirect in development', () => {
      process.env.NODE_ENV = 'development'
      const testReq = { protocol: 'http' }
      forceHttpsMiddleware(testReq as Request, res as Response, next)
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('should not redirect HTTPS requests', () => {
      process.env.NODE_ENV = 'production'
      const testReq = { protocol: 'https' }
      forceHttpsMiddleware(testReq as Request, res as Response, next)
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })
  })
})
