import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import config from './config'
import logger from './utils/logger'
import routes from './routes'
import { initDatabase, closeDb } from './models'
import { apiLimiter } from './middleware/rateLimiter'

const app = express()

app.use(helmet())
app.use(cors({
  origin: config.env === 'production' ? ['https://gexm.qoder.com'] : '*',
  credentials: true,
}))
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api', apiLimiter)
app.use('/api', routes)

app.get('/health', (req, res) => {
  res.status(200).json({
    code: 0,
    message: 'ok',
    service: 'user-service',
    timestamp: Date.now(),
  })
})

app.use((req, res) => {
  res.status(404).json({
    code: 1004,
    message: '接口不存在',
    data: null,
    timestamp: Date.now(),
  })
})

app.use((err: Error, req: express.Request, res: express.Response) => {
  logger.error('Server error:', err.message, { stack: err.stack })
  res.status(500).json({
    code: 1000,
    message: '服务器内部错误',
    data: null,
    timestamp: Date.now(),
  })
})

let server: ReturnType<typeof app.listen> | null = null

async function startServer(): Promise<void> {
  try {
    initDatabase()
    logger.info('User service database initialized')

    server = app.listen(config.port, () => {
      logger.info('User service started on port %d', config.port)
      logger.info('Health check: http://localhost:%d/health', config.port)
      logger.info('API prefix: /api')
    })

    server.on('error', (error) => {
      logger.error('Server error:', error.message)
      process.exit(1)
    })
  } catch (error) {
    logger.error('Failed to start user service:', (error as Error).message)
    process.exit(1)
  }
}

function gracefulShutdown(signal: string): void {
  logger.info('Received %s signal, shutting down user service...', signal)

  if (server) {
    server.close(() => {
      logger.info('Server closed')
      closeDb()
      logger.info('Database connection closed')
      process.exit(0)
    })

    setTimeout(() => {
      logger.error('Force shutdown after timeout')
      closeDb()
      process.exit(1)
    }, 10000)
  } else {
    closeDb()
    process.exit(0)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

if (require.main === module) {
  startServer()
}

export default app