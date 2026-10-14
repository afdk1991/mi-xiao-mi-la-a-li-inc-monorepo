import { Request, Response, NextFunction } from 'express'
import { csrfProtectionMiddleware } from './security'

interface CsrfRouteConfig {
  enabled: boolean
  exclude: string[]
}

interface CsrfProtectedRoutes {
  [key: string]: CsrfRouteConfig
}

function conditionalCsrfProtection(excludePaths: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    // 使用 req.path（相对于路由挂载点的路径）或 req.originalUrl 的相对部分
    const requestPath = req.path

    const isExcluded = excludePaths.some((path) => {
      // 通配符匹配：path 以 * 结尾时，匹配前缀
      if (path.endsWith('*')) {
        const prefix = path.slice(0, -1)
        return requestPath.startsWith(prefix)
      }
      // 精确匹配
      return requestPath === path
    })

    if (isExcluded) {
      return next()
    }

    return csrfProtectionMiddleware(req, res, next)
  }
}

const CSRF_PROTECTED_ROUTES: CsrfProtectedRoutes = {
  users: { enabled: true, exclude: [] },
  auth: { enabled: true, exclude: ['/login', '/register', '/refresh'] },
  cart: { enabled: true, exclude: [] },
  favorites: { enabled: true, exclude: [] },
  addresses: { enabled: true, exclude: [] },
  orders: { enabled: true, exclude: [] },
  payment: { enabled: true, exclude: ['/callback'] },
  reviews: { enabled: true, exclude: [] },
  chat: { enabled: true, exclude: [] },
  notifications: { enabled: true, exclude: [] },
  upload: { enabled: true, exclude: [] },
  sync: { enabled: true, exclude: [] },
  products: { enabled: true, exclude: [] },
  categories: { enabled: true, exclude: [] },
  search: { enabled: false, exclude: [] },
  errorLogs: { enabled: false, exclude: [] },
  coupons: { enabled: true, exclude: ['/', '/mine', '/apply'] },
  members: { enabled: true, exclude: [] },
  shipping: { enabled: true, exclude: [] },
  flashSales: { enabled: true, exclude: [] },
  checkins: { enabled: true, exclude: [] },
  inbox: { enabled: true, exclude: [] },
  // 管理后台路由启用 CSRF 保护，所有非 GET 请求需携带 X-CSRF-Token
  admin: { enabled: true, exclude: [] },
}

export function getCsrfMiddleware(
  routeName: string
): (req: Request, res: Response, next: NextFunction) => Response | void {
  const config = CSRF_PROTECTED_ROUTES[routeName]
  if (!config || !config.enabled) {
    return (_req: Request, _res: Response, next: NextFunction) => next()
  }
  return conditionalCsrfProtection(config.exclude)
}

export { conditionalCsrfProtection, CSRF_PROTECTED_ROUTES }
