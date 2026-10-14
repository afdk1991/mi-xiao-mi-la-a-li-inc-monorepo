import dotenv from 'dotenv'

dotenv.config()

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  env: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  database: {
    type: process.env.DATABASE_TYPE || 'sqlite',
    path: process.env.DATABASE_PATH || './data/user-service.db',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'gexm_user',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
  },

  oauth: {
    wechat: {
      open: {
        appId: process.env.WECHAT_OPEN_APP_ID || '',
        appSecret: process.env.WECHAT_OPEN_APP_SECRET || '',
        redirectUri: process.env.WECHAT_OPEN_REDIRECT_URI || '',
      },
      officialAccount: {
        appId: process.env.WECHAT_OA_APP_ID || '',
        appSecret: process.env.WECHAT_OA_APP_SECRET || '',
        redirectUri: process.env.WECHAT_OA_REDIRECT_URI || '',
      },
      miniProgram: {
        appId: process.env.WECHAT_MP_APP_ID || '',
        appSecret: process.env.WECHAT_MP_APP_SECRET || '',
      },
    },
    qq: {
      appId: process.env.QQ_APP_ID || '',
      appSecret: process.env.QQ_APP_SECRET || '',
      redirectUri: process.env.QQ_REDIRECT_URI || '',
    },
    weibo: {
      appId: process.env.WEIBO_APP_ID || '',
      appSecret: process.env.WEIBO_APP_SECRET || '',
      redirectUri: process.env.WEIBO_REDIRECT_URI || '',
    },
    alipay: {
      appId: process.env.ALIPAY_APP_ID || '',
      appSecret: process.env.ALIPAY_APP_SECRET || '',
      redirectUri: process.env.ALIPAY_REDIRECT_URI || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    },
    google: {
      appId: process.env.GOOGLE_APP_ID || '',
      appSecret: process.env.GOOGLE_APP_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || '',
    },
    twitter: {
      appId: process.env.TWITTER_APP_ID || '',
      appSecret: process.env.TWITTER_APP_SECRET || '',
      redirectUri: process.env.TWITTER_REDIRECT_URI || '',
    },
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  cryptoKey: process.env.CRYPTO_KEY || '',

  serviceAuth: {
    enabled: process.env.SERVICE_AUTH_ENABLED === 'true',
    secret: process.env.SERVICE_AUTH_SECRET || 'gexm-internal-service-token',
  },
}

export default config
