import winston from 'winston'
import 'winston-daily-rotate-file'

const logFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''
  return `${timestamp} [${level}]: ${message} ${metaStr}`
})

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }),
]

transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  })
)

transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/app-error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  })
)

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports,
  defaultMeta: { service: 'gexm-user-service' },
})

export default logger
