import type { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()
  const { method, url, ip } = req

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const { statusCode } = res

    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

    logger[logLevel](`${method} ${url} ${statusCode} - ${duration}ms - ${ip}`, {
      method,
      url,
      statusCode,
      duration,
      ip,
      userAgent: req.headers['user-agent'],
    })
  })

  next()
}

export default requestLogger
