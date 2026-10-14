import app from './app'
import config from './config'
import logger from './utils/logger'
import websocketService from './websocket'
import backupUtil from './utils/backup'
import cacheService from './services/cacheService'
import monitoringService from './services/monitoring'
import cronService from './services/cronService'

import queueService from './services/queueService'
import notificationService from './services/notificationService'
import { initOrderQueueConsumers } from './services/orderQueueHandler'
import { getDb, closeDb } from './models'

const PORT = config.port
const isProduction = config.env === 'production'

let connectionCount = 0
let isShuttingDown = false

async function startServer(): Promise<void> {
  try {
    await cacheService.init(isProduction)
  } catch (err) {
    logger.error('Cache service initialization failed: %s', (err as Error).message)
    if (isProduction) {
      logger.error('【生产环境】关键服务初始化失败，服务无法启动')
      process.exit(1)
    }
    logger.warn('【开发环境】继续启动（降级模式）')
  }

  try {
    await queueService.init()
  } catch (err) {
    logger.error('Queue service initialization failed: %s', (err as Error).message)
    if (isProduction) {
      logger.error('【生产环境】关键服务初始化失败，服务无法启动')
      process.exit(1)
    }
    logger.warn('【开发环境】继续启动（降级模式）')
  }

  try {
    await initOrderQueueConsumers()
  } catch (err) {
    logger.error('Order queue consumers initialization failed: %s', (err as Error).message)
  }

  try {
    await notificationService.initNotificationHandlers()
  } catch (err) {
    logger.error('Notification handlers initialization failed: %s', (err as Error).message)
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`)
    logger.info(`Environment: ${config.env}`)
    logger.info(`Health check: http://localhost:${PORT}/api/health`)

    if (process.send) {
      process.send('ready')
      logger.info('PM2 ready signal sent')
    }
  })

  server.on('connection', (socket) => {
    connectionCount++
    socket.on('close', () => {
      connectionCount--
      if (isShuttingDown && connectionCount === 0) {
        logger.info('All connections closed, exiting')
        process.exit(0)
      }
    })
  })

  websocketService.init(server)
  logger.info('WebSocket service enabled')

  monitoringService.init()
  cronService.init()

  if (isProduction) {
    backupUtil.startAutoBackup()
  } else {
    backupUtil.startAutoBackup(24 * 60 * 60 * 1000)
  }

  const gracefulShutdown = async (signal: string) => {
    logger.info('%s received, initiating graceful shutdown', signal)

    if (isShuttingDown) {
      logger.info('Already shutting down, ignoring')
      return
    }

    isShuttingDown = true

    const shutdownSteps = [
      {
        name: 'HTTP server',
        action: () => new Promise<void>((resolve) => server.close(() => resolve())),
      },
      {
        name: 'WebSocket server',
        action: async () => {
          if (websocketService?.getIO) {
            websocketService.getIO().close()
          }
        },
      },
      {
        name: 'Auto backup',
        action: async () => {
          if (backupUtil?.stopAutoBackup) {
            backupUtil.stopAutoBackup()
          }
        },
      },
      {
        name: 'Monitoring service',
        action: async () => {
          if (monitoringService?.shutdown) {
            monitoringService.shutdown()
          }
        },
      },
      {
        name: 'Cron service',
        action: async () => {
          if (cronService?.shutdown) {
            cronService.shutdown()
          }
        },
      },
      { name: 'Cache service', action: async () => await cacheService.shutdown() },
      { name: 'Queue service', action: async () => await queueService.shutdown() },
      { name: 'Database', action: async () => await closeDb() },
    ]

    for (const step of shutdownSteps) {
      try {
        await step.action()
        logger.info(`${step.name} closed`)
      } catch (e) {
        logger.warn(`${step.name} close skipped: %s`, (e as Error).message)
      }
    }

    const shutdownTimeout = setTimeout(() => {
      logger.warn('Forced exit after timeout')
      process.exit(0)
    }, 30000)

    const checkConnections = setInterval(() => {
      logger.info(`Active connections remaining: ${connectionCount}`)
      if (connectionCount === 0) {
        clearInterval(checkConnections)
        clearTimeout(shutdownTimeout)
        logger.info('All connections closed gracefully')
        process.exit(0)
      }
    }, 1000)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)

  process.on('SIGUSR2', async () => {
    logger.info('SIGUSR2 received, preparing for PM2 reload')
    await gracefulShutdown('SIGUSR2')
  })
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception: %s', error.message, { stack: error.stack })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at: %s, reason: %s', promise, reason)
})

startServer()
