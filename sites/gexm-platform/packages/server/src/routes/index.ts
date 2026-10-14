import express, { Express } from 'express'

import { getCsrfMiddleware } from '../middleware/csrfConfig'
import authRoutes from './auth'
import userRoutes from './users'
import notificationRoutes from './notifications'
import syncRoutes from './sync'
import uploadRoutes from './upload'
import errorLogRoutes from './errorLogs'
import chatRoutes from './chat'
import cartRoutes from './cart'
import favoriteRoutes from './favorites'
import addressRoutes from './addresses'
import categoryRoutes from './categories'
import reviewRoutes from './reviews'
import searchRoutes from './search'
import productRoutes from './products'
import orderRoutes from './orders'
import paymentRoutes from './payment'
import couponRoutes from './coupons'
import memberRoutes from './members'
import shippingRoutes from './shipping'
import flashSaleRoutes from './flashSales'
import checkinRoutes from './checkins'
import inboxRoutes from './inbox'
import adminRoutes from './admin'
import metricsRoutes from './metrics'
import monitoringRoutes from './monitoring'
import oauthRoutes from './oauth'
import agentRoutes from './agent'
import queueRoutes from './queue'

interface RouteConfig {
  path: string
  router: express.Router
  csrf?: boolean
}

const routes: RouteConfig[] = [
  { path: '/api/auth', router: authRoutes, csrf: true },
  { path: '/api/users', router: userRoutes, csrf: true },
  { path: '/api/notifications', router: notificationRoutes, csrf: true },
  { path: '/api/sync', router: syncRoutes, csrf: true },
  { path: '/api/upload', router: uploadRoutes, csrf: true },
  { path: '/api/error-logs', router: errorLogRoutes, csrf: true },
  { path: '/api/chat', router: chatRoutes, csrf: true },
  { path: '/api/cart', router: cartRoutes, csrf: true },
  { path: '/api/favorites', router: favoriteRoutes, csrf: true },
  { path: '/api/addresses', router: addressRoutes, csrf: true },
  { path: '/api/categories', router: categoryRoutes, csrf: true },
  { path: '/api/reviews', router: reviewRoutes, csrf: true },
  { path: '/api/search', router: searchRoutes, csrf: true },
  { path: '/api/products', router: productRoutes, csrf: true },
  { path: '/api/orders', router: orderRoutes, csrf: true },
  { path: '/api/payment', router: paymentRoutes, csrf: true },
  { path: '/api/coupons', router: couponRoutes, csrf: true },
  { path: '/api/members', router: memberRoutes, csrf: true },
  { path: '/api/shipping', router: shippingRoutes, csrf: true },
  { path: '/api/flash-sales', router: flashSaleRoutes, csrf: true },
  { path: '/api/checkins', router: checkinRoutes, csrf: true },
  { path: '/api/inbox', router: inboxRoutes, csrf: true },
  // 管理后台路由启用 CSRF 保护，与其他业务路由保持一致
  { path: '/api/admin', router: adminRoutes, csrf: true },
  { path: '/api/monitoring', router: monitoringRoutes },
  { path: '/api/queue', router: queueRoutes, csrf: true },
  { path: '/api/agent', router: agentRoutes, csrf: true },
  { path: '/api', router: metricsRoutes },
  { path: '/api/oauth', router: oauthRoutes },
]

export function registerRoutes(app: Express): void {
  routes.forEach(({ path, router, csrf }) => {
    if (csrf) {
      const routeName = path.replace('/api/', '')
      app.use(path, getCsrfMiddleware(routeName), router)
    } else {
      app.use(path, router)
    }
  })
}

export default routes
