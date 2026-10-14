import path from 'path'
import crypto from 'crypto'
import dotenv from 'dotenv'

const rootDir = path.resolve(__dirname, '../..')

const pm2Env = process.env.NODE_ENV

const envPath =
  pm2Env === 'production'
    ? path.join(rootDir, '.env.production')
    : pm2Env === 'staging'
      ? path.join(rootDir, '.env.staging')
      : path.join(rootDir, '.env')

dotenv.config({ path: envPath })

let currentEnv = pm2Env || process.env.NODE_ENV || 'development'

if (pm2Env && pm2Env !== process.env.NODE_ENV) {
  process.env.NODE_ENV = pm2Env
  currentEnv = pm2Env
}

import { cacheConfig } from './cache'

interface JWTConfig {
  secret: string
  expiresIn: string
  refreshSecret: string
  refreshExpiresIn: string
  issuer: string
  audience: string
}

interface SecurityConfig {
  forceHttps: boolean
  corsOrigins: string[]
  csrfSecret: string
  piiKey: string
}

interface OAuthPlatformConfig {
  appId: string
  appSecret: string
  appKey?: string
  redirectUri: string
  scope?: string
  authorizeUrl?: string
  tokenUrl?: string
  userInfoUrl?: string
}

interface WechatOAuthConfig {
  openPlatform: OAuthPlatformConfig
  officialAccount: OAuthPlatformConfig
  miniProgram: OAuthPlatformConfig
}

interface OAuthConfig {
  wechat: WechatOAuthConfig
  qq: OAuthPlatformConfig
  weibo: OAuthPlatformConfig
  alipay: OAuthPlatformConfig
  google: OAuthPlatformConfig
  facebook: OAuthPlatformConfig
  twitter: OAuthPlatformConfig
}

interface DatabaseConfig {
  type: 'sqlite' | 'postgres'
  path: string
  host: string
  port: number
  database: string
  username: string
  password: string
  poolMax: number
  poolIdleTimeout: number
  poolConnectionTimeout: number
  queryTimeout: number
}

interface UploadConfig {
  path: string
  maxSize: number
}

interface RateLimitConfig {
  windowMs: number
  max: number
}

interface PaymentConfig {
  secret: string
  notifyUrl: string
  signAlgorithm: string
  wechat?: {
    enabled: boolean
    appId?: string
    mchId?: string
    apiKey?: string
    certPath?: string
    keyPath?: string
    notifyUrl?: string
  }
  alipay?: {
    enabled: boolean
    appId?: string
    privateKey?: string
    publicKey?: string
    signType?: string
    notifyUrl?: string
  }
  ipWhitelist?: {
    enabled: boolean
    allowedIPs: string[]
    allowedCIDR: string[]
    proxyTrust: boolean
  }
}

interface LoggingMaskPatterns {
  phone: boolean
  email: boolean
  idCard: boolean
  password: boolean
  token: boolean
  ip: boolean
}

interface LoggingConfig {
  level: string
  file: string
  maxSize: number
  maxFiles: number
  maxDays: number
  compress: boolean
  enableConsole: boolean
  maskSensitiveData: boolean
  maskPatterns: LoggingMaskPatterns
}

interface KeyValidationResult {
  key: string
  name: string
  default: string
}

interface AgentConfig {
  enabled: boolean
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  mcpPort: number
}

interface Config {
  port: string | number
  env: string
  jwt: JWTConfig
  security: SecurityConfig
  oauth: OAuthConfig
  database: DatabaseConfig
  upload: UploadConfig
  rateLimit: RateLimitConfig
  payment: PaymentConfig
  logging: LoggingConfig
  cache: typeof cacheConfig
  agent: AgentConfig
  validateKeys: () => boolean
  getKeyHealthStatus: () => { healthy: boolean; warnings: string[] }
}

/**
 * 生成开发环境专用回退密钥（确定性，基于 envVar 名称派生）
 *
 * 注意：仅供 development/test 使用，生产环境必须通过环境变量显式设置强密钥。
 * 生成命令：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getSecretKey(envVar: string): string {
  const value = process.env[envVar]
  if (value) {
    return value
  }
  // 生产环境不提供回退，强制要求设置环境变量
  if (currentEnv === 'production') {
    return ''
  }
  // 开发/测试环境：生成确定性回退密钥（非公开已知值，通过强度校验）
  return crypto.createHash('sha256').update(`gexm_dev_fallback_${envVar}`).digest('hex')
}

const config: Config = {
  port: process.env.PORT || 3000,
  env: currentEnv,

  jwt: {
    secret: getSecretKey('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshSecret: getSecretKey('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'gexm',
    audience: process.env.JWT_AUDIENCE || 'gexm-client',
  },

  security: {
    forceHttps: process.env.FORCE_HTTPS === 'true',
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    csrfSecret: getSecretKey('CSRF_SECRET'),
    piiKey: getSecretKey('PII_ENCRYPTION_KEY'),
  },

  oauth: {
    wechat: {
      openPlatform: {
        appId: process.env.WECHAT_OPEN_APP_ID || '',
        appSecret: process.env.WECHAT_OPEN_APP_SECRET || '',
        redirectUri: process.env.WECHAT_OPEN_REDIRECT_URI || '',
        scope: 'snsapi_login',
      },
      officialAccount: {
        appId: process.env.WECHAT_OA_APP_ID || '',
        appSecret: process.env.WECHAT_OA_APP_SECRET || '',
        redirectUri: process.env.WECHAT_OA_REDIRECT_URI || '',
        scope: 'snsapi_userinfo',
      },
      miniProgram: {
        appId: process.env.WECHAT_MP_APP_ID || '',
        appSecret: process.env.WECHAT_MP_APP_SECRET || '',
        redirectUri: '',
      },
    },
    qq: {
      appId: process.env.QQ_APP_ID || '',
      appSecret: process.env.QQ_APP_KEY || '',
      redirectUri: process.env.QQ_REDIRECT_URI || '',
    },
    weibo: {
      appId: process.env.WEIBO_APP_KEY || '',
      appSecret: process.env.WEIBO_APP_SECRET || '',
      redirectUri: process.env.WEIBO_REDIRECT_URI || '',
    },
    alipay: {
      appId: process.env.ALIPAY_APP_ID || '',
      appSecret: process.env.ALIPAY_PRIVATE_KEY || '',
      redirectUri: process.env.ALIPAY_REDIRECT_URI || '',
    },
    google: {
      appId: process.env.GOOGLE_CLIENT_ID || '',
      appSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || '',
    },
    twitter: {
      appId: process.env.TWITTER_CLIENT_ID || '',
      appSecret: process.env.TWITTER_CLIENT_SECRET || '',
      redirectUri: process.env.TWITTER_REDIRECT_URI || '',
    },
  },

  database: {
    type: (process.env.DB_TYPE || 'sqlite') as 'sqlite' | 'postgres',
    path: process.env.DB_PATH || './data/gexm.db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'gexm',
    username: process.env.DB_USER || 'gexm',
    password: process.env.DB_PASSWORD || '',
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
    poolConnectionTimeout: parseInt(process.env.DB_POOL_CONN_TIMEOUT || '2000', 10),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),
  },

  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  payment: {
    secret: getSecretKey('PAYMENT_SECRET'),
    notifyUrl: process.env.PAYMENT_NOTIFY_URL || '',
    signAlgorithm: process.env.PAYMENT_SIGN_ALGORITHM || 'HMAC-SHA256',
    ipWhitelist: {
      enabled: process.env.PAYMENT_IP_WHITELIST_ENABLED === 'true',
      allowedIPs: (process.env.PAYMENT_IP_WHITELIST_IPS || '').split(',').filter(Boolean),
      allowedCIDR: (process.env.PAYMENT_IP_WHITELIST_CIDR || '').split(',').filter(Boolean),
      proxyTrust: process.env.PAYMENT_IP_TRUST_PROXY !== 'false',
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: parseInt(process.env.LOG_MAX_SIZE || '5242880', 10),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
    maxDays: parseInt(process.env.LOG_MAX_DAYS || '30', 10),
    compress: process.env.LOG_COMPRESS === 'true',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    maskSensitiveData:
      currentEnv === 'production' ? true : process.env.LOG_MASK_SENSITIVE_DATA !== 'false',
    maskPatterns: {
      phone: currentEnv === 'production' ? true : process.env.LOG_MASK_PHONE !== 'false',
      email: currentEnv === 'production' ? true : process.env.LOG_MASK_EMAIL !== 'false',
      idCard: currentEnv === 'production' ? true : process.env.LOG_MASK_IDCARD !== 'false',
      password: currentEnv === 'production' ? true : process.env.LOG_MASK_PASSWORD !== 'false',
      token: currentEnv === 'production' ? true : process.env.LOG_MASK_TOKEN !== 'false',
      ip: currentEnv === 'production' ? true : process.env.LOG_MASK_IP !== 'false',
    },
  },

  cache: cacheConfig,

  agent: {
    enabled: process.env.AGENT_ENABLED === 'true',
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048', 10),
    mcpPort: parseInt(process.env.MCP_PORT || '8080', 10),
  },

  /**
   * 密钥强度校验
   *
   * 生产环境强制校验规则：
   * - 密钥长度 >= 32 位
   * - 包含小写字母、大写字母、数字、特殊字符
   * - 禁止使用默认值
   * - Hex 格式密钥长度 >= 32 位
   *
   * 生成强随机密钥命令：
   * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # 生成 64 位 Hex
   * node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # 生成 Base64
   */
  validateKeys: function (): boolean {
    const isProd = this.env === 'production'
    const errors: string[] = []

    const keysToValidate: KeyValidationResult[] = [
      { key: this.jwt.secret, name: 'JWT_SECRET', default: 'gexm_jwt_secret_key_2024' },
      {
        key: this.jwt.refreshSecret,
        name: 'JWT_REFRESH_SECRET',
        default: 'gexm_refresh_secret_key_2024',
      },
      { key: this.payment.secret, name: 'PAYMENT_SECRET', default: 'gexm_payment_secret_key_2024' },
      { key: this.security.csrfSecret, name: 'CSRF_SECRET', default: 'gexm_csrf_secret_key_2024' },
      {
        key: this.security.piiKey,
        name: 'PII_ENCRYPTION_KEY',
        default: 'gexm_pii_encryption_key_2024_must_be_32_bytes',
      },
    ]

    if (isProd && cacheConfig.redis.enabled && !cacheConfig.redis.password) {
      errors.push('REDIS_PASSWORD 在生产环境不能为空')
    }

    for (const { key, name, default: defaultVal } of keysToValidate) {
      if (key === defaultVal) {
        errors.push(`${name} 使用了默认值，请更换为强随机密钥`)
        continue
      }
      const keyErrors = validateKeyStrength(key, name)
      if (keyErrors.length > 0) {
        errors.push(...keyErrors)
      }
    }

    if (errors.length > 0) {
      if (isProd) {
        const errorMsg = `密钥强度校验失败：\n${errors.map((e) => '  - ' + e).join('\n')}\n\n生成强随机密钥命令：\n  Hex格式: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n  Base64: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
        throw new Error(errorMsg)
      } else {
        console.warn('[WARN] 开发环境密钥强度警告：')
        errors.forEach((e) => console.warn('[WARN]   - ' + e))
        console.warn('[WARN] 生成强随机密钥命令：')
        console.warn(
          "[WARN]   Hex格式: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        )
      }
    }

    return errors.length === 0
  },

  /**
   * 获取密钥健康状态
   */
  getKeyHealthStatus: function (): { healthy: boolean; warnings: string[] } {
    const warnings: string[] = []

    const keysToCheck = [
      { key: this.jwt.secret, name: 'JWT_SECRET' },
      { key: this.jwt.refreshSecret, name: 'JWT_REFRESH_SECRET' },
      { key: this.payment.secret, name: 'PAYMENT_SECRET' },
      { key: this.security.csrfSecret, name: 'CSRF_SECRET' },
      { key: this.security.piiKey, name: 'PII_ENCRYPTION_KEY' },
    ]

    for (const { key, name } of keysToCheck) {
      const issues = validateKeyStrength(key, name)
      if (issues.length > 0) {
        warnings.push(...issues)
      }
    }

    return {
      healthy: warnings.length === 0,
      warnings,
    }
  },
}

function validateKeyStrength(key: string, name: string): string[] {
  const errors: string[] = []

  if (!key) {
    errors.push(`${name} 未设置`)
    return errors
  }

  const isHexFormat = /^[0-9a-fA-F]+$/.test(key)
  if (isHexFormat) {
    if (key.length < 32) {
      errors.push(`${name} Hex格式长度不足 32 位（当前 ${key.length} 位）`)
    }
    return errors
  }

  if (key.length < 32) {
    errors.push(`${name} 长度不足 32 位`)
  }
  if (!/[a-z]/.test(key)) {
    errors.push(`${name} 缺少小写字母`)
  }
  if (!/[A-Z]/.test(key)) {
    errors.push(`${name} 缺少大写字母`)
  }
  if (!/\d/.test(key)) {
    errors.push(`${name} 缺少数字`)
  }
  const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\\\'
  if (!specialChars.split('').some((char) => key.includes(char))) {
    errors.push(`${name} 缺少特殊字符`)
  }

  return errors
}

export default config
