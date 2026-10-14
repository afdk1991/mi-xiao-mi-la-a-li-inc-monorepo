import express from 'express'
import path from 'path'
import zlib from 'zlib'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import { initDatabase } from './models'
import requestLogger from './middleware/requestLogger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { apiLimiter } from './middleware/rateLimiter'
import swaggerSpec from './config/swagger'
import {
  xssFilterMiddleware,
  csrfTokenMiddleware,
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  forceHttpsMiddleware,
} from './middleware/security'
import { apmMiddleware, getMetrics, resetMetrics } from './middleware/apm'
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics'

import yaml from 'yaml'
import fs from 'fs'
import { registerRoutes } from './routes'
import { initPaymentGateways } from './services/paymentGateways'
import config from './config'
import logger from './utils/logger'

// 加载 OpenAPI 文档
let swaggerDocument: Record<string, unknown> | null = null
try {
  const openapiPath = path.join(__dirname, '..', '..', '..', 'docs', 'api-openapi.yaml')
  if (fs.existsSync(openapiPath)) {
    const fileContent = fs.readFileSync(openapiPath, 'utf-8')
    swaggerDocument = yaml.parse(fileContent) as Record<string, unknown>
    logger.info('OpenAPI 文档加载成功')
  } else {
    logger.warn('OpenAPI 文档文件未找到: ' + openapiPath)
  }
} catch (error) {
  logger.error('OpenAPI 文档加载失败:', (error as Error).message)
}

/** @type {import('express').Express} */
const app = express()

initDatabase()

try {
  config.validateKeys()
} catch (error) {
  logger.error('密钥校验失败，服务启动终止：%s', (error as Error).message)
  process.exit(1)
}

let compression:
  | ((options?: import('compression').CompressionOptions) => import('express').RequestHandler)
  | null = null
/* eslint-disable @typescript-eslint/no-require-imports */
try {
  compression = require('compression')
} catch {
  compression = null
}
/* eslint-enable @typescript-eslint/no-require-imports */

if (compression) {
  app.use(
    compression({
      level: zlib.constants.Z_BEST_COMPRESSION,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false
        }
        const contentType = res.getHeader('Content-Type')
        if (!contentType) {
          return false
        }
        const compressibleTypes = [
          'text/',
          'application/json',
          'application/javascript',
          'application/xml',
          'application/rss+xml',
          'application/atom+xml',
          'image/svg+xml',
          'text/css',
        ]
        return compressibleTypes.some((type) => contentType.toString().startsWith(type))
      },
    })
  )
} else {
  app.use((req, res, next) => {
    const originalSend = res.send.bind(res)

    function shouldCompress(req, res) {
      if (req.headers['x-no-compression']) {
        return false
      }
      const contentType = res.getHeader('Content-Type')
      if (!contentType) {
        return false
      }
      const compressibleTypes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/rss+xml',
        'application/atom+xml',
        'image/svg+xml',
        'text/css',
      ]
      return compressibleTypes.some((type) => contentType.toString().startsWith(type))
    }

    res.send = function (body) {
      if (
        !shouldCompress(req, res) ||
        typeof body !== 'string' ||
        body.length < 1024 ||
        res.getHeader('Content-Encoding')
      ) {
        return originalSend(body)
      }

      const acceptEncoding = req.headers['accept-encoding'] || ''
      let encoding = null
      let zlibMethod = null

      if (acceptEncoding.includes('gzip')) {
        encoding = 'gzip'
        zlibMethod = zlib.gzip
      } else if (acceptEncoding.includes('deflate')) {
        encoding = 'deflate'
        zlibMethod = zlib.deflate
      }

      if (!encoding) {
        return originalSend(body)
      }

      zlibMethod(body, { level: zlib.constants.Z_BEST_COMPRESSION }, (err, compressed) => {
        if (err) {
          return originalSend(body)
        }
        res.setHeader('Content-Encoding', encoding)
        res.setHeader('Vary', 'Accept-Encoding')
        res.setHeader('Content-Length', compressed.length)
        return originalSend(compressed)
      })
    }

    res.json = function (body) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      return res.send(JSON.stringify(body))
    }

    next()
  })
}

const isProduction = process.env.NODE_ENV === 'production'

const cspDirectives: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: isProduction
    ? ["'self'", "'strict-dynamic'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: isProduction ? ["'self'", "'strict-dynamic'"] : ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https://*'],
  fontSrc: ["'self'", 'https://*'],
  objectSrc: ["'none'"],
}

if (isProduction) {
  cspDirectives.upgradeInsecureRequests = ['upgrade-insecure-requests']
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
    hsts: {
      maxAge: isProduction ? 31536000 : 0,
      includeSubDomains: isProduction,
    },
    frameguard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
  })
)

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)

const devAllowedOrigins = ['http://localhost:*', 'http://127.0.0.1:*']

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }

      const allowedList = isProduction ? allowedOrigins : devAllowedOrigins

      if (allowedList.length === 0) {
        if (!isProduction) {
          callback(null, true)
        } else {
          callback(null, false)
        }
        return
      }

      const isAllowed = allowedList.some((allowed) => {
        if (allowed.includes('*')) {
          const pattern = new RegExp(
            '^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '[^:]*') + '$'
          )
          return pattern.test(origin)
        }
        return origin === allowed
      })

      if (isAllowed) {
        callback(null, origin)
      } else {
        callback(null, false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Session-Id',
    ],
    exposedHeaders: ['X-CSRF-Token', 'X-Session-Id'],
    maxAge: 86400,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

app.use(requestLogger)
app.use(apmMiddleware)
app.use(metricsMiddleware)

app.use(forceHttpsMiddleware)
app.use(securityHeadersMiddleware)
app.use(xssFilterMiddleware)
app.use(sanitizeInputMiddleware)
app.use(csrfTokenMiddleware)

app.use('/api/', apiLimiter)

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// Swagger 接口文档
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage()
  const uptime = process.uptime()
  const traceId = getCurrentTraceId()
  if (traceId) {
    res.setHeader('X-Trace-Id', traceId)
  }
  res.json({
    code: 0,
    message: 'ok',
    data: {
      status: 'running',
      timestamp: Date.now(),
      version: '1.0.0',
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      traceId,
    },
  })
})

app.get('/preview', (req, res) => {
  const previewPath = path.join(__dirname, '../', '../', '../', 'preview.html')
  res.sendFile(previewPath)
})

app.get('/api/metrics', (req, res) => {
  const acceptHeader = req.headers.accept || ''
  if (acceptHeader.includes('text/plain') || acceptHeader.includes('prometheus')) {
    return metricsEndpoint(req, res)
  }
  res.json({
    code: 0,
    message: 'ok',
    data: getMetrics(),
  })
})

app.post('/api/metrics/reset', (req, res) => {
  resetMetrics()
  res.json({
    code: 0,
    message: 'metrics reset',
  })
})

// Swagger UI - API 文档
if (swaggerDocument) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Gexm API 文档',
    })
  )
  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerDocument)
  })
}

registerRoutes(app)

initPaymentGateways()

app.use(notFoundHandler)
app.use(errorHandler)

export default app
