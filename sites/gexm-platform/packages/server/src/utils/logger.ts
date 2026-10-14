import winston from 'winston'
import 'winston-daily-rotate-file'
import config from '../config'

interface LogPatterns {
  phone: RegExp
  email: RegExp
  idCard: RegExp
  password: RegExp
  token: RegExp
  ip: RegExp
}

const LOG_PATTERNS: LogPatterns = {
  phone: /1[3-9]\d{9}/g,
  email: /[\w.-]+@[\w.-]+\.\w+/gi,
  idCard: /[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
  password: /(?:password|pass|pwd)[\s:=]*['"]?[\w@#$%^&*!]+['"]?/gi,
  token: /(?:token|access_token|refresh_token)[\s:=]*['"]?[\w.-]+['"]?/gi,
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
}

function maskValue(value: string): string {
  if (!value || typeof value !== 'string') {
    return value
  }

  if (config.logging.maskSensitiveData) {
    const patterns = config.logging.maskPatterns

    if (patterns.phone) {
      value = value.replace(LOG_PATTERNS.phone, (match) => {
        return match.slice(0, 3) + '****' + match.slice(-4)
      })
    }

    if (patterns.email) {
      value = value.replace(LOG_PATTERNS.email, (match) => {
        const [name, domain] = match.split('@')
        return name.slice(0, 2) + '****@' + domain
      })
    }

    if (patterns.idCard) {
      value = value.replace(LOG_PATTERNS.idCard, (match) => {
        return match.slice(0, 6) + '********' + match.slice(-4)
      })
    }

    if (patterns.password) {
      value = value.replace(LOG_PATTERNS.password, (match) => {
        const parts = match.split(/[:=\s]/)
        if (parts.length >= 2) {
          return parts[0] + '=******'
        }
        return '******'
      })
    }

    if (patterns.token) {
      value = value.replace(LOG_PATTERNS.token, (match) => {
        const parts = match.split(/[:=\s]/)
        if (parts.length >= 2) {
          const token = parts[1].replace(/['"]/g, '')
          if (token.length > 8) {
            return parts[0] + '=' + token.slice(0, 8) + '****'
          }
          return parts[0] + '=******'
        }
        return '******'
      })
    }

    if (patterns.ip) {
      value = value.replace(LOG_PATTERNS.ip, (match) => {
        const parts = match.split('.')
        return parts[0] + '.' + parts[1] + '.***.***'
      })
    }
  }

  return value
}

function maskObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const masked: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()
    const value = (obj as Record<string, unknown>)[key]

    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key') ||
      lowerKey.includes('phone') ||
      lowerKey.includes('mobile') ||
      lowerKey.includes('email') ||
      lowerKey.includes('idcard') ||
      lowerKey.includes('id_card') ||
      lowerKey.includes('identity')
    ) {
      masked[key] = '******'
    } else if (Array.isArray(value)) {
      masked[key] = value.map((item) => maskObject(item))
    } else if (typeof value === 'object') {
      masked[key] = maskObject(value)
    } else if (typeof value === 'string') {
      masked[key] = maskValue(value)
    } else {
      masked[key] = value
    }
  }
  return masked
}

const maskFormat = winston.format((info) => {
  if (config.logging.maskSensitiveData) {
    if (typeof info.message === 'string') {
      info.message = maskValue(info.message)
    }
    if (info.meta && typeof info.meta === 'object') {
      info.meta = maskObject(info.meta) as never
    }
    for (const key of Object.keys(info)) {
      if (key !== 'message' && key !== 'level' && key !== 'timestamp' && key !== 'service') {
        if (typeof info[key] === 'string') {
          info[key] = maskValue(info[key])
        } else if (typeof info[key] === 'object') {
          info[key] = maskObject(info[key]) as never
        }
      }
    }
  }
  return info
})

const baseRotateConfig = {
  datePattern: 'YYYY-MM-DD',
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  maxDays: config.logging.maxDays,
  zippedArchive: config.logging.compress,
  tailable: true,
}

const isTestEnv = config.env === 'test'
const logFileBase = isTestEnv
  ? config.logging.file.replace('app.log', 'test-app.log')
  : config.logging.file

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    maskFormat(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'gexm-server' },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: logFileBase.replace('.log', '-%DATE%.log'),
      ...baseRotateConfig,
    }),
    new winston.transports.DailyRotateFile({
      filename: logFileBase.replace('.log', '-error-%DATE%.log'),
      level: 'error',
      ...baseRotateConfig,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: logFileBase.replace('.log', '-exceptions-%DATE%.log'),
      ...baseRotateConfig,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: logFileBase.replace('.log', '-rejections-%DATE%.log'),
      ...baseRotateConfig,
    }),
  ],
})

if (config.logging.enableConsole && config.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let metaStr = ''
          if (Object.keys(meta).length > 0) {
            try {
              metaStr = JSON.stringify(maskObject(meta))
            } catch {
              metaStr = String(meta)
            }
          }
          return `${timestamp} [${level}]: ${message} ${metaStr}`
        })
      ),
    })
  )
}

export default logger
module.exports = logger
