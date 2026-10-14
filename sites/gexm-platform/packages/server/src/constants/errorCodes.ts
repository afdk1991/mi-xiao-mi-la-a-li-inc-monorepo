export interface ErrorDetail {
  code: number
  message: string
  httpStatus: number
}

export interface ErrorMap {
  [key: string]: ErrorDetail
}

export const GENERAL_ERRORS: ErrorMap = {
  UNKNOWN_ERROR: { code: 1000, message: '未知错误', httpStatus: 500 },
  INVALID_PARAMETER: { code: 1001, message: '参数错误', httpStatus: 400 },
  MISSING_PARAMETER: { code: 1002, message: '缺少必需参数', httpStatus: 400 },
  INVALID_FORMAT: { code: 1003, message: '格式错误', httpStatus: 400 },
  RESOURCE_NOT_FOUND: { code: 1004, message: '资源不存在', httpStatus: 404 },
  RESOURCE_CONFLICT: { code: 1005, message: '资源冲突', httpStatus: 409 },
  OPERATION_FAILED: { code: 1006, message: '操作失败', httpStatus: 500 },
  SERVICE_UNAVAILABLE: { code: 1007, message: '服务暂不可用', httpStatus: 503 },
  INTERNAL_ERROR: { code: 1008, message: '服务器内部错误', httpStatus: 500 },
}

export const AUTH_ERRORS: ErrorMap = {
  UNAUTHORIZED: { code: 2001, message: '未登录或登录已过期', httpStatus: 401 },
  INVALID_TOKEN: { code: 2002, message: '无效的认证令牌', httpStatus: 401 },
  TOKEN_EXPIRED: { code: 2003, message: '认证令牌已过期', httpStatus: 401 },
  INVALID_CREDENTIALS: { code: 2004, message: '用户名或密码错误', httpStatus: 401 },
  FORBIDDEN: { code: 2005, message: '无权限访问', httpStatus: 403 },
  ACCOUNT_DISABLED: { code: 2006, message: '账号已被禁用', httpStatus: 403 },
  ACCOUNT_LOCKED: { code: 2007, message: '账号已被锁定', httpStatus: 403 },
}

export const BUSINESS_ERRORS: ErrorMap = {
  USERNAME_EXISTS: { code: 3001, message: '用户名已存在', httpStatus: 409 },
  EMAIL_EXISTS: { code: 3002, message: '邮箱已被使用', httpStatus: 409 },
  PHONE_EXISTS: { code: 3003, message: '手机号已被使用', httpStatus: 409 },
  INVALID_USERNAME: { code: 3004, message: '用户名格式不正确', httpStatus: 400 },
  INVALID_PASSWORD: { code: 3005, message: '密码格式不正确', httpStatus: 400 },

  CONVERSATION_NOT_FOUND: { code: 3101, message: '会话不存在', httpStatus: 404 },
  CONVERSATION_ACCESS_DENIED: { code: 3102, message: '无权限访问该会话', httpStatus: 403 },
  CANNOT_CHAT_WITH_SELF: { code: 3103, message: '不能和自己聊天', httpStatus: 400 },
  AI_SERVICE_ERROR: { code: 3104, message: 'AI 服务暂时不可用', httpStatus: 503 },

  PRODUCT_NOT_FOUND: { code: 3201, message: '商品不存在', httpStatus: 404 },
  PRODUCT_OFF_SHELF: { code: 3202, message: '商品已下架', httpStatus: 400 },
  INSUFFICIENT_STOCK: { code: 3203, message: '库存不足', httpStatus: 400 },

  ORDER_NOT_FOUND: { code: 3301, message: '订单不存在', httpStatus: 404 },
  ORDER_CANNOT_CANCEL: { code: 3302, message: '订单无法取消', httpStatus: 400 },
  ORDER_ALREADY_PAID: { code: 3303, message: '订单已支付', httpStatus: 400 },

  PAYMENT_FAILED: { code: 3401, message: '支付失败', httpStatus: 500 },
  PAYMENT_TIMEOUT: { code: 3402, message: '支付超时', httpStatus: 408 },
  PAYMENT_CANCELLED: { code: 3403, message: '支付已取消', httpStatus: 400 },
  PAYMENT_NOT_FOUND: { code: 3404, message: '支付记录不存在', httpStatus: 404 },
  INSUFFICIENT_BALANCE: { code: 3405, message: '余额不足', httpStatus: 400 },
  PAYMENT_SIGN_VERIFY_FAILED: { code: 3406, message: '支付验签失败', httpStatus: 400 },
  PAYMENT_ALREADY_PROCESSED: { code: 3407, message: '支付已处理', httpStatus: 400 },
  PAYMENT_INVALID_METHOD: { code: 3408, message: '无效的支付方式', httpStatus: 400 },
  PAYMENT_INVALID_STATUS: { code: 3409, message: '支付状态无效', httpStatus: 400 },
  PAYMENT_AMOUNT_MISMATCH: { code: 3410, message: '支付金额校验失败', httpStatus: 400 },

  FLASH_SALE_NOT_STARTED_OR_ENDED: {
    code: 3801,
    message: '秒杀活动未开始或已结束',
    httpStatus: 400,
  },
  FLASH_SALE_NOT_STARTED: { code: 3802, message: '秒杀活动尚未开始', httpStatus: 400 },
  FLASH_SALE_ENDED: { code: 3803, message: '秒杀活动已结束', httpStatus: 400 },
  FLASH_SALE_LIMIT_EXCEEDED: { code: 3804, message: '超出限购数量', httpStatus: 400 },
}

export const RESOURCE_ERRORS: ErrorMap = {
  FILE_TOO_LARGE: { code: 4001, message: '文件过大', httpStatus: 413 },
  FILE_TYPE_NOT_ALLOWED: { code: 4002, message: '文件类型不允许', httpStatus: 400 },
  FILE_UPLOAD_FAILED: { code: 4003, message: '文件上传失败', httpStatus: 500 },
  FILE_NOT_FOUND: { code: 4004, message: '文件不存在', httpStatus: 404 },
}

export const SECURITY_ERRORS: ErrorMap = {
  RATE_LIMIT_EXCEEDED: { code: 6001, message: '请求过于频繁', httpStatus: 429 },
  SUSPICIOUS_ACTIVITY: { code: 6002, message: '检测到可疑行为', httpStatus: 403 },
  CSRF_TOKEN_INVALID: { code: 6003, message: 'CSRF 令牌无效', httpStatus: 403 },
  CSRF_TOKEN_MISSING: { code: 6004, message: 'CSRF 令牌缺失', httpStatus: 403 },
  XSS_ATTACK_DETECTED: { code: 6005, message: '检测到 XSS 攻击', httpStatus: 403 },
  SQL_INJECTION_DETECTED: { code: 6006, message: '检测到 SQL 注入攻击', httpStatus: 403 },
  INVALID_REQUEST_ORIGIN: { code: 6007, message: '无效的请求来源', httpStatus: 403 },
}

export type ErrorType = 'GENERAL' | 'AUTH' | 'BUSINESS' | 'RESOURCE' | 'SECURITY'

export const ERROR_CODE_RANGES: Record<ErrorType, [number, number]> = {
  GENERAL: [1000, 1999],
  AUTH: [2000, 2999],
  BUSINESS: [3000, 3999],
  RESOURCE: [4000, 4999],
  SECURITY: [6000, 6999],
}

export function getErrorDetail(code: number): ErrorDetail {
  const allErrors: ErrorMap = {
    ...GENERAL_ERRORS,
    ...AUTH_ERRORS,
    ...BUSINESS_ERRORS,
    ...RESOURCE_ERRORS,
    ...SECURITY_ERRORS,
  }

  const found = Object.values(allErrors).find((err) => err.code === code)
  return found || GENERAL_ERRORS.UNKNOWN_ERROR
}

export function getErrorType(code: number): ErrorType {
  if (code >= 2000 && code < 3000) {
    return 'AUTH'
  }
  if (code >= 3000 && code < 4000) {
    return 'BUSINESS'
  }
  if (code >= 4000 && code < 5000) {
    return 'RESOURCE'
  }
  if (code >= 6000 && code < 7000) {
    return 'SECURITY'
  }
  return 'GENERAL'
}
