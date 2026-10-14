import rateLimit from 'express-rate-limit'
import config from '../config'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    code: 6001,
    message: '登录尝试过于频繁，请15分钟后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    code: 6001,
    message: '注册过于频繁，请1小时后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    code: 6001,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
})