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

export type ErrorType = 'GENERAL' | 'AUTH' | 'BUSINESS' | 'SECURITY'

export const ERROR_CODE_RANGES: Record<ErrorType, [number, number]> = {
  GENERAL: [1000, 1999],
  AUTH: [2000, 2999],
  BUSINESS: [3000, 3999],
  SECURITY: [6000, 6999],
}

export function getErrorDetail(code: number): ErrorDetail {
  const allErrors: ErrorMap = {
    ...GENERAL_ERRORS,
    ...AUTH_ERRORS,
    ...BUSINESS_ERRORS,
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
  if (code >= 6000 && code < 7000) {
    return 'SECURITY'
  }
  return 'GENERAL'
}