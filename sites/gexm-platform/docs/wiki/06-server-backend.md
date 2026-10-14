# 06 · Express 后端服务（@gexm/server）

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 6.1 入口与启动流程

### 6.1.1 启动入口

**入口**：[packages/server/src/server.ts](file:///f:/gexm/packages/server/src/server.ts)

启动时序：

```
1. cacheService.init()           # Redis 初始化（可选，失败时降级为内存）
2. queueService.init()           # 队列服务初始化
3. initOrderQueueConsumers()     # 订单队列消费者
4. notificationService.init()    # 通知处理器
5. app.listen(PORT)              # HTTP 服务启动
6. websocketService.init(server) # WebSocket 挂载
7. monitoringService.init()      # 监控启动
8. cronService.init()            # 定时任务
9. backupUtil.startAutoBackup()  # 自动备份（生产 1h，开发 24h）
10. process.on(SIGTERM/SIGINT)   # 注册优雅停机
11. process.on(SIGUSR2)          # PM2 reload 信号
```

### 6.1.2 服务器启动代码示例

```typescript
// packages/server/src/server.ts
async function startServer(): Promise<void> {
  try {
    await cacheService.init(isProduction)
    await queueService.init()
    await initOrderQueueConsumers()
    await notificationService.initNotificationHandlers()
  } catch (err) {
    if (isProduction) process.exit(1)
    logger.warn('开发环境继续启动（降级模式）')
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`)
    if (process.send) process.send('ready')  // PM2 ready 信号
  })

  websocketService.init(server)
  monitoringService.init()
  cronService.init()
  backupUtil.startAutoBackup(isProduction ? undefined : 24 * 60 * 60 * 1000)

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
  process.on('SIGUSR2', async () => await gracefulShutdown('SIGUSR2'))
}
```

### 6.1.3 App 入口

**App 入口**：[packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts)

中间件挂载顺序：

```
1.  initDatabase()                  # 数据库初始化（建表、索引、默认数据）
2.  initTracing()                   # OpenTelemetry
3.  config.validateKeys()           # 密钥强度校验（生产强制，失败终止）
4.  compression()                   # Gzip/Brotli 压缩（level 6，threshold 1024）
5.  helmet()                        # 安全头（CSP/HSTS/X-Frame-Options）
6.  cors()                          # CORS（生产白名单，开发 localhost）
7.  express.json/urlencoded         # Body 解析（10mb 限制）
8.  cookieParser()
9.  requestLogger                   # 请求日志
10. apmMiddleware                   # APM 性能监控
11. metricsMiddleware               # Prometheus 指标采集
12. forceHttpsMiddleware            # HTTPS 强制跳转
13. securityHeadersMiddleware       # 自定义安全头
14. xssFilterMiddleware             # XSS 过滤
15. sanitizeInputMiddleware         # 输入净化
16. csrfTokenMiddleware             # CSRF Token 生成与校验
17. dataMaskingMiddleware           # 数据脱敏
18. cacheHeadersMiddleware          # ETag/304
19. apiCacheMiddleware              # API 缓存
20. /api/ → apiLimiter              # 全局速率限制
21. /static、/uploads               # 静态资源
22. /api/docs                       # Swagger UI
23. /api/health                     # 健康检查
24. /api/metrics、/metrics          # 指标端点
25. registerRoutes(app)             # 业务路由
26. notFoundHandler → errorHandler  # 404 与错误处理
```

### 6.1.4 中间件挂载示例

```typescript
// packages/server/src/app.ts
initDatabase()
initTracing()
config.validateKeys()  // 生产环境失败时 process.exit(1)

app.use(helmet({
  contentSecurityPolicy: { directives: cspDirectives },
  hsts: { maxAge: isProduction ? 31536000 : 0, includeSubDomains: isProduction },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}))

app.use(cors({ origin: ..., credentials: true, methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'] }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

app.use(requestLogger)
app.use(apmMiddleware)
app.use(metricsMiddleware)
app.use(forceHttpsMiddleware)
app.use(securityHeadersMiddleware)
app.use(xssFilterMiddleware)
app.use(sanitizeInputMiddleware)
app.use(csrfTokenMiddleware)
app.use(dataMaskingMiddleware)

app.use('/api/', apiLimiter)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '30d', immutable: true }))
app.use('/static', express.static(path.join(__dirname, '..', 'static'), { maxAge: '1y', immutable: true }))

registerRoutes(app)

app.use(notFoundHandler)
app.use(errorHandler)
```

## 6.2 路由模块清单

### 6.2.1 路由注册入口

**注册入口**：[packages/server/src/routes/index.ts](file:///f:/gexm/packages/server/src/routes/index.ts)

所有业务路由统一挂在 `/api/v1/*` 前缀下，共 40+ 路由模块（除 `monitoring`、`dualWrite`、`language`、`oauth`、`performance` 外均启用 CSRF 中间件）：

### 6.2.2 完整路由表

| 路由 | 文件 | CSRF | 主要功能 |
| --- | --- | --- | --- |
| `/api/v1/auth` | [auth.ts](file:///f:/gexm/packages/server/src/routes/auth.ts) | ✅ | 注册/登录/刷新 Token/退出 |
| `/api/v1/oauth` | [oauth.ts](file:///f:/gexm/packages/server/src/routes/oauth.ts) | ❌ | 第三方 OAuth（微信/QQ/微博/支付宝/Google/Facebook/Twitter） |
| `/api/v1/users` | [users.ts](file:///f:/gexm/packages/server/src/routes/users.ts) | ✅ | 用户资料管理 |
| `/api/v1/notifications` | [notifications.ts](file:///f:/gexm/packages/server/src/routes/notifications.ts) | ✅ | 通知中心 |
| `/api/v1/sync` | [sync.ts](file:///f:/gexm/packages/server/src/routes/sync.ts) | ✅ | 数据同步（与 WordPress） |
| `/api/v1/upload` | [upload.ts](file:///f:/gexm/packages/server/src/routes/upload.ts) | ✅ | 文件上传 |
| `/api/v1/error-logs` | [errorLogs.ts](file:///f:/gexm/packages/server/src/routes/errorLogs.ts) | ✅ | 错误日志上报 |
| `/api/v1/chat` | [chat.ts](file:///f:/gexm/packages/server/src/routes/chat.ts) | ✅ | 实时聊天（Socket.IO） |
| `/api/v1/cart` | [cart.ts](file:///f:/gexm/packages/server/src/routes/cart.ts) | ✅ | 购物车 |
| `/api/v1/favorites` | [favorites.ts](file:///f:/gexm/packages/server/src/routes/favorites.ts) | ✅ | 收藏 |
| `/api/v1/addresses` | [addresses.ts](file:///f:/gexm/packages/server/src/routes/addresses.ts) | ✅ | 收货地址 |
| `/api/v1/categories` | [categories.ts](file:///f:/gexm/packages/server/src/routes/categories.ts) | ✅ | 分类 |
| `/api/v1/reviews` | [reviews.ts](file:///f:/gexm/packages/server/src/routes/reviews.ts) | ✅ | 评价 |
| `/api/v1/search` | [search.ts](file:///f:/gexm/packages/server/src/routes/search.ts) | ✅ | 搜索 |
| `/api/v1/products` | [products.ts](file:///f:/gexm/packages/server/src/routes/products.ts) | ✅ | 商品 |
| `/api/v1/orders` | [orders.ts](file:///f:/gexm/packages/server/src/routes/orders.ts) | ✅ | 订单 |
| `/api/v1/payment` | [payment.ts](file:///f:/gexm/packages/server/src/routes/payment.ts) | ✅ | 支付（支付宝/微信/PayPal/Stripe） |
| `/api/v1/coupons` | [coupons.ts](file:///f:/gexm/packages/server/src/routes/coupons.ts) | ✅ | 优惠券 |
| `/api/v1/members` | [members.ts](file:///f:/gexm/packages/server/src/routes/members.ts) | ✅ | 会员等级 |
| `/api/v1/shipping` | [shipping.ts](file:///f:/gexm/packages/server/src/routes/shipping.ts) | ✅ | 物流 |
| `/api/v1/flash-sales` | [flashSales.ts](file:///f:/gexm/packages/server/src/routes/flashSales.ts) | ✅ | 限时抢购 |
| `/api/v1/checkins` | [checkins.ts](file:///f:/gexm/packages/server/src/routes/checkins.ts) | ✅ | 签到 |
| `/api/v1/tasks` | [tasks.ts](file:///f:/gexm/packages/server/src/routes/tasks.ts) | ✅ | 任务系统 |
| `/api/v1/inbox` | [inbox.ts](file:///f:/gexm/packages/server/src/routes/inbox.ts) | ✅ | 站内信 |
| `/api/v1/errands` | [errand.ts](file:///f:/gexm/packages/server/src/routes/errand.ts) | ✅ | 跑腿 |
| `/api/v1/admin` | [admin.ts](file:///f:/gexm/packages/server/src/routes/admin.ts) | ✅ | 管理后台 |
| `/api/v1/monitoring` | [monitoring.ts](file:///f:/gexm/packages/server/src/routes/monitoring.ts) | ❌ | 监控 |
| `/api/v1/queue` | [queue.ts](file:///f:/gexm/packages/server/src/routes/queue.ts) | ✅ | 队列管理 |
| `/api/v1/agent` | [agent.ts](file:///f:/gexm/packages/server/src/routes/agent.ts) | ✅ | AI Agent（LangChain + MCP） |
| `/api/v1/dual-write` | [dualWrite.ts](file:///f:/gexm/packages/server/src/routes/dualWrite.ts) | ❌ | 双写（SQLite + Postgres） |
| `/api/v1/language` | [language.ts](file:///f:/gexm/packages/server/src/routes/language.ts) | ❌ | 多语言 |
| `/api/v1/rides` | [ride.ts](file:///f:/gexm/packages/server/src/routes/ride.ts) | ✅ | 拼车 |
| `/api/v1/food` | [food.ts](file:///f:/gexm/packages/server/src/routes/food.ts) | ✅ | 外卖 |
| `/api/v1/referral` | [referral.ts](file:///f:/gexm/packages/server/src/routes/referral.ts) | ✅ | 推荐返利 |
| `/api/v1/social` | [social.ts](file:///f:/gexm/packages/server/src/routes/social.ts) | ✅ | 社交（动态/点赞/评论） |
| `/api/v1/group-buy` | [groupBuy.ts](file:///f:/gexm/packages/server/src/routes/groupBuy.ts) | ✅ | 拼团 |
| `/api/v1/tickets` | [tickets.ts](file:///f:/gexm/packages/server/src/routes/tickets.ts) | ✅ | 工单 |
| `/api/v1/push` | [push.ts](file:///f:/gexm/packages/server/src/routes/push.ts) | ✅ | 推送 |
| `/api/v1/merchants` | [merchant.ts](file:///f:/gexm/packages/server/src/routes/merchant.ts) | ✅ | 商家 |
| `/api/v1/drivers` | [drivers.ts](file:///f:/gexm/packages/server/src/routes/drivers.ts) | ✅ | 司机 |
| `/api/v1/activities` | [activities.ts](file:///f:/gexm/packages/server/src/routes/activities.ts) | ✅ | 活动 |
| `/api/v1/performance` | [performance.ts](file:///f:/gexm/packages/server/src/routes/performance.ts) | ❌ | 性能 |
| `/api` | [metrics.ts](file:///f:/gexm/packages/server/src/routes/metrics.ts) | - | 指标 |

### 6.2.3 路由注册代码

```typescript
// packages/server/src/routes/index.ts
interface RouteConfig {
  path: string
  router: express.Router
  csrf?: boolean
}

const API_VERSION = '/api/v1'

const routes: RouteConfig[] = [
  { path: `${API_VERSION}/auth`, router: authRoutes, csrf: true },
  { path: `${API_VERSION}/users`, router: userRoutes, csrf: true },
  // ... 40+ 路由
  { path: `${API_VERSION}/monitoring`, router: monitoringRoutes },          // 无 CSRF
  { path: `${API_VERSION}/oauth`, router: oauthRoutes },                    // 无 CSRF
  { path: `${API_VERSION}/dual-write`, router: dualWriteRoutes },           // 无 CSRF
  { path: `${API_VERSION}/language`, router: languageRoutes },              // 无 CSRF
  { path: `${API_VERSION}/performance`, router: performanceRoutes },        // 无 CSRF
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
```

## 6.3 控制器层（controllers/）

每个 controller 对应一个业务领域，遵循 `Controller → Service → Model` 三层结构。典型控制器清单（30+ 个）：

`authController` / `userController` / `oauthController`（隐式于 `oauthService`） / `productController` / `orderController` / `cartController` / `paymentController` / `couponController` / `memberController` / `merchantController` / `socialController` / `chatController` / `taskController` / `checkinController` / `referralController` / `reviewController` / `favoriteController` / `addressController` / `categoryController` / `searchController` / `shippingController` / `flashSaleController` / `groupBuyController` / `ticketController` / `errandController` / `foodController` / `rideController` / `driversController` / `activityController` / `notificationController` / `pushController` / `inboxController` / `adminController` / `auditController` / `rbacController` / `dashboardController` / `reconciliationController` / `errorLogController` / `syncController` / `uploadController`

## 6.4 模型层（models/）

### 6.4.1 数据库抽象

通过 [packages/server/src/models/index.ts](file:///f:/gexm/packages/server/src/models/index.ts) 提供 `getDb()` / `closeDb()` 工厂方法，返回 `IDbClient = ISyncDbClient & IAsyncDbClient`。

### 6.4.2 双客户端设计

| 接口 | 用途 | 实现 |
| --- | --- | --- |
| `ISyncDbClient` | 老代码同步调用 | `SQLiteSyncClient` / `PgSyncClient`（基于 deasync） |
| `IAsyncDbClient` | 新代码异步调用 | `SQLiteSyncClient`（Promise 包装）/ `PgAsyncClient` |

### 6.4.3 SQL 方言适配

[packages/server/src/models/sqlDialect.ts](file:///f:/gexm/packages/server/src/models/sqlDialect.ts) 通过：

- `translateSql(sql, params?)`：自动转换 SQLite ↔ PostgreSQL 语法
- `isPostgres()`：判断当前数据库类型
- `getTableColumns(tableName)`：获取表字段
- `getForeignKeyList(tableName)`：获取外键列表

### 6.4.4 完整 Model 文件清单

| 文件 | 模型 | 说明 |
| --- | --- | --- |
| [index.ts](file:///f:/gexm/packages/server/src/models/index.ts) | - | 工厂方法 getDb()/closeDb() |
| [dbClient.ts](file:///f:/gexm/packages/server/src/models/dbClient.ts) | - | 数据库客户端抽象 |
| [pgSyncClient.ts](file:///f:/gexm/packages/server/src/models/pgSyncClient.ts) | - | PostgreSQL 同步客户端 |
| [sqlDialect.ts](file:///f:/gexm/packages/server/src/models/sqlDialect.ts) | - | SQL 方言适配 |
| [postgresSchema.ts](file:///f:/gexm/packages/server/src/models/postgresSchema.ts) | - | PostgreSQL Schema |
| [userModel.ts](file:///f:/gexm/packages/server/src/models/userModel.ts) | userModel | 用户 |
| [oauthModel.ts](file:///f:/gexm/packages/server/src/models/oauthModel.ts) | oauthModel | OAuth 绑定 |
| [oauthStateModel.ts](file:///f:/gexm/packages/server/src/models/oauthStateModel.ts) | oauthStateModel | OAuth 状态 |
| [loginAttemptModel.ts](file:///f:/gexm/packages/server/src/models/loginAttemptModel.ts) | loginAttemptModel | 登录尝试 |
| [verifyCodeModel.ts](file:///f:/gexm/packages/server/src/models/verifyCodeModel.ts) | verifyCodeModel | 验证码 |
| [productModel.ts](file:///f:/gexm/packages/server/src/models/productModel.ts) | productModel | 商品 |
| [orderModel.ts](file:///f:/gexm/packages/server/src/models/orderModel.ts) | orderModel | 订单 |
| [cartModel.ts](file:///f:/gexm/packages/server/src/models/cartModel.ts) | cartModel | 购物车 |
| [paymentModel.ts](file:///f:/gexm/packages/server/src/models/paymentModel.ts) | paymentModel | 支付 |
| [couponModel.ts](file:///f:/gexm/packages/server/src/models/couponModel.ts) | couponModel | 优惠券 |
| [memberModel.ts](file:///f:/gexm/packages/server/src/models/memberModel.ts) | memberModel | 会员 |
| [merchantModel.ts](file:///f:/gexm/packages/server/src/models/merchantModel.ts) | merchantModel | 商家 |
| [categoryModel.ts](file:///f:/gexm/packages/server/src/models/categoryModel.ts) | categoryModel | 分类 |
| [reviewModel.ts](file:///f:/gexm/packages/server/src/models/reviewModel.ts) | reviewModel | 评价 |
| [favoriteModel.ts](file:///f:/gexm/packages/server/src/models/favoriteModel.ts) | favoriteModel | 收藏 |
| [addressModel.ts](file:///f:/gexm/packages/server/src/models/addressModel.ts) | addressModel | 收货地址 |
| [shippingModel.ts](file:///f:/gexm/packages/server/src/models/shippingModel.ts) | shippingModel | 物流 |
| [flashSaleModel.ts](file:///f:/gexm/packages/server/src/models/flashSaleModel.ts) | flashSaleModel | 限时抢购 |
| [groupBuyModel.ts](file:///f:/gexm/packages/server/src/models/groupBuyModel.ts) | groupBuyModel | 拼团 |
| [socialModel.ts](file:///f:/gexm/packages/server/src/models/socialModel.ts) | socialModel | 社交 |
| [chatModel.ts](file:///f:/gexm/packages/server/src/models/chatModel.ts) | chatModel | 聊天 |
| [taskModel.ts](file:///f:/gexm/packages/server/src/models/taskModel.ts) | taskModel | 任务 |
| [checkinModel.ts](file:///f:/gexm/packages/server/src/models/checkinModel.ts) | checkinModel | 签到 |
| [referralModel.ts](file:///f:/gexm/packages/server/src/models/referralModel.ts) | referralModel | 推荐返利 |
| [notificationModel.ts](file:///f:/gexm/packages/server/src/models/notificationModel.ts) | notificationModel | 通知 |
| [pushModel.ts](file:///f:/gexm/packages/server/src/models/pushModel.ts) | pushModel | 推送 |
| [inboxModel.ts](file:///f:/gexm/packages/server/src/models/inboxModel.ts) | inboxModel | 站内信 |
| [searchModel.ts](file:///f:/gexm/packages/server/src/models/searchModel.ts) | searchModel | 搜索 |
| [ticketModel.ts](file:///f:/gexm/packages/server/src/models/ticketModel.ts) | ticketModel | 工单 |
| [errandModel.ts](file:///f:/gexm/packages/server/src/models/errandModel.ts) | errandModel | 跑腿 |
| [foodModel.ts](file:///f:/gexm/packages/server/src/models/foodModel.ts) | foodModel | 外卖 |
| [rideModel.ts](file:///f:/gexm/packages/server/src/models/rideModel.ts) | rideModel | 拼车 |
| [driversModel.ts](file:///f:/gexm/packages/server/src/models/driversModel.ts) | driversModel | 司机 |
| [activityModel.ts](file:///f:/gexm/packages/server/src/models/activityModel.ts) | activityModel | 活动 |
| [auditLogModel.ts](file:///f:/gexm/packages/server/src/models/auditLogModel.ts) | auditLogModel | 审计日志 |
| [errorLogModel.ts](file:///f:/gexm/packages/server/src/models/errorLogModel.ts) | errorLogModel | 错误日志 |
| [roleModel.ts](file:///f:/gexm/packages/server/src/models/roleModel.ts) | roleModel | 角色 |
| [syncModel.ts](file:///f:/gexm/packages/server/src/models/syncModel.ts) | syncModel | 数据同步 |

## 6.5 中间件层（middleware/）

| 中间件 | 文件 | 职责 |
| --- | --- | --- |
| `requestLogger` | [requestLogger.ts](file:///f:/gexm/packages/server/src/middleware/requestLogger.ts) | 请求日志（含 TraceId） |
| `apmMiddleware` | [apm.ts](file:///f:/gexm/packages/server/src/middleware/apm.ts) | APM 性能监控 |
| `metricsMiddleware` | [metrics.ts](file:///f:/gexm/packages/server/src/middleware/metrics.ts) | Prometheus 指标采集 |
| `forceHttpsMiddleware` | [security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) | HTTPS 强制跳转 |
| `securityHeadersMiddleware` | [security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) | 自定义安全头 |
| `xssFilterMiddleware` | [security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) | XSS 过滤 |
| `sanitizeInputMiddleware` | [security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) | 输入净化 |
| `csrfTokenMiddleware` | [security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) / [csrfConfig.ts](file:///f:/gexm/packages/server/src/middleware/csrfConfig.ts) | CSRF Token 生成与校验 |
| `dataMaskingMiddleware` | [dataMasking.ts](file:///f:/gexm/packages/server/src/middleware/dataMasking.ts) | 敏感数据脱敏（手机/邮箱/身份证/密码/Token/IP） |
| `cacheHeadersMiddleware` | [cacheHeaders.ts](file:///f:/gexm/packages/server/src/middleware/cacheHeaders.ts) | ETag / If-None-Match / 304 |
| `apiCacheMiddleware` | [apiCache.ts](file:///f:/gexm/packages/server/src/middleware/apiCache.ts) | API 响应缓存 |
| `apiLimiter` | [rateLimiter.ts](file:///f:/gexm/packages/server/src/middleware/rateLimiter.ts) | 全局速率限制 |
| `auth` | [auth.ts](file:///f:/gexm/packages/server/src/middleware/auth.ts) | JWT 认证 |
| `permission` | [permission.ts](file:///f:/gexm/packages/server/src/middleware/permission.ts) | RBAC 权限校验 |
| `auditMiddleware` | [auditMiddleware.ts](file:///f:/gexm/packages/server/src/middleware/auditMiddleware.ts) | 审计日志 |
| `ipWhitelist` | [ipWhitelist.ts](file:///f:/gexm/packages/server/src/middleware/ipWhitelist.ts) | IP 白名单（支付回调等） |
| `sensitiveAction` | [sensitiveAction.ts](file:///f:/gexm/packages/server/src/middleware/sensitiveAction.ts) | 敏感操作二次验证 |
| `validateId` | [validateId.ts](file:///f:/gexm/packages/server/src/middleware/validateId.ts) | ID 参数校验 |
| `validateSchema` | [validateSchema.ts](file:///f:/gexm/packages/server/src/middleware/validateSchema.ts) | Zod Schema 校验 |
| `errorHandler` / `notFoundHandler` | [errorHandler.ts](file:///f:/gexm/packages/server/src/middleware/errorHandler.ts) | 错误处理 |

## 6.6 服务层（services/）

### 6.6.1 核心服务

| 服务 | 文件 | 职责 |
| --- | --- | --- |
| `cacheService` | [cacheService.ts](file:///f:/gexm/packages/server/src/services/cacheService.ts) | Redis 缓存（可选，降级为内存） |
| `cacheWarmupService` | [cacheWarmupService.ts](file:///f:/gexm/packages/server/src/services/cacheWarmupService.ts) | 缓存预热 |
| `queueService` | [queueService.ts](file:///f:/gexm/packages/server/src/services/queueService.ts) | 任务队列 |
| `orderQueueHandler` | [orderQueueHandler.ts](file:///f:/gexm/packages/server/src/services/orderQueueHandler.ts) | 订单异步处理 |
| `asyncEventHandler` | [asyncEventHandler.ts](file:///f:/gexm/packages/server/src/services/asyncEventHandler.ts) | 异步事件分发 |
| `cronService` | [cronService.ts](file:///f:/gexm/packages/server/src/services/cronService.ts) | 定时任务 |
| `notificationService` | [notificationService.ts](file:///f:/gexm/packages/server/src/services/notificationService.ts) | 通知中心（多通道） |
| `emailService` | [emailService.ts](file:///f:/gexm/packages/server/src/services/emailService.ts) | 邮件发送 |
| `monitoring` | [monitoring.ts](file:///f:/gexm/packages/server/src/services/monitoring.ts) | 监控服务 |
| `performanceService` | [performanceService.ts](file:///f:/gexm/packages/server/src/services/performanceService.ts) | 性能采集 |
| `statisticsService` | [statisticsService.ts](file:///f:/gexm/packages/server/src/services/statisticsService.ts) | 统计服务 |
| `serviceDiscovery` | [serviceDiscovery.ts](file:///f:/gexm/packages/server/src/services/serviceDiscovery.ts) | Consul 服务注册（含环境变量回退） |
| `dualWriteService` | [dualWriteService.ts](file:///f:/gexm/packages/server/src/services/dualWriteService.ts) | SQLite + Postgres 双写 |
| `grayscaleService` | [grayscaleService.ts](file:///f:/gexm/packages/server/src/services/grayscaleService.ts) | 灰度发布 |
| `faultInjection` | [faultInjection.ts](file:///f:/gexm/packages/server/src/services/faultInjection.ts) | 故障注入（测试用） |
| `transactionService` | [transactionService.ts](file:///f:/gexm/packages/server/src/services/transactionService.ts) | 事务封装 |
| `verifyCodeService` | [verifyCodeService.ts](file:///f:/gexm/packages/server/src/services/verifyCodeService.ts) | 验证码（短信/邮箱） |
| `referralService` | [referralService.ts](file:///f:/gexm/packages/server/src/services/referralService.ts) | 推荐返利 |
| `taskService` | [taskService.ts](file:///f:/gexm/packages/server/src/services/taskService.ts) | 任务系统 |
| `orderService` | [orderService.ts](file:///f:/gexm/packages/server/src/services/orderService.ts) | 订单核心逻辑 |
| `productService` | [productService.ts](file:///f:/gexm/packages/server/src/services/productService.ts) | 商品核心逻辑 |

### 6.6.2 支付网关

[packages/server/src/services/paymentGateways/](file:///f:/gexm/packages/server/src/services/paymentGateways/)：

- `alipay.ts`：支付宝 RSA2 签名
- `wechat.ts`：微信支付 HMAC-SHA256 签名
- `index.ts`：统一注册入口
- 通过 [services/paymentGateways.ts](file:///f:/gexm/packages/server/src/services/paymentGateways.ts) 注册

### 6.6.3 OAuth 提供方

[packages/server/src/services/oauth/](file:///f:/gexm/packages/server/src/services/oauth/)：

- `baseProvider.ts`：抽象基类
- `wechatProvider.ts` / `qqProvider.ts` / `weiboProvider.ts` / `alipayProvider.ts` / `googleProvider.ts` / `facebookProvider.ts` / `twitterProvider.ts`
- `oauthService.ts`：统一调度
- `interfaces.ts`：接口定义

### 6.6.4 AI Agent

[packages/server/src/services/agent/](file:///f:/gexm/packages/server/src/services/agent/)：

- `agentService.ts`：LangChain Agent 主入口
- `mcpServer.ts`：MCP Server 暴露
- `tools.ts`：工具集
- `skills/`：内置技能（product-search、order-inquiry、user-service）

### 6.6.5 报告生成器

[packages/server/src/services/reportGenerator/](file:///f:/gexm/packages/server/src/services/reportGenerator/)：

- `errorHandler.ts`：报告生成错误处理
- `notificationManager.ts`：报告通知
- `retryManager.ts`：重试机制
- `types.ts`：类型定义

### 6.6.6 任务队列

[packages/server/src/services/taskqueue/](file:///f:/gexm/packages/server/src/services/taskqueue/)：

- `taskQueue.ts`：通用任务队列抽象

## 6.7 工具与配置

| 工具 | 文件 | 职责 |
| --- | --- | --- |
| `logger` | [utils/logger.ts](file:///f:/gexm/packages/server/src/utils/logger.ts) | Winston 日志（含敏感数据脱敏、按日轮转） |
| `tracing` | [utils/tracing.ts](file:///f:/gexm/packages/server/src/utils/tracing.ts) | OpenTelemetry TraceId 生成与传播 |
| `crypto` | [utils/crypto.ts](file:///f:/gexm/packages/server/src/utils/crypto.ts) | 加密工具（PII 加密） |
| `response` | [utils/response.ts](file:///f:/gexm/packages/server/src/utils/response.ts) | 统一响应格式 |
| `backup` | [utils/backup.ts](file:///f:/gexm/packages/server/src/utils/backup.ts) | 自动备份 |
| `migration` | [utils/migration.ts](file:///f:/gexm/packages/server/src/utils/migration.ts) | 数据库迁移 |

### 6.7.1 配置入口

**配置**：[packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts)

- 支持 development / staging / production 三套 `.env`
- `getSecretKey(envVar)`：开发环境确定性回退密钥，生产强制环境变量
- `validateKeys()`：生产环境密钥强度强制校验（≥32 位、含大小写数字特殊字符）
- `getKeyHealthStatus()`：密钥健康状态查询

### 6.7.2 配置项详解

```typescript
// packages/server/src/config/index.ts
const config: Config = {
  port: process.env.PORT || 3000,
  env: currentEnv,
  jwt: { secret, expiresIn, refreshSecret, refreshExpiresIn, issuer, audience },
  security: { forceHttps, corsOrigins, csrfSecret, piiKey },
  oauth: { wechat, qq, weibo, alipay, google, facebook, twitter },
  database: { type, path, host, port, database, username, password, poolMax, ... },
  upload: { path, maxSize },
  rateLimit: { windowMs, max },
  payment: { secret, notifyUrl, signAlgorithm, wechat, alipay, ipWhitelist },
  logging: { level, file, maxSize, maxFiles, maxDays, compress, enableConsole, maskSensitiveData, maskPatterns },
  cache: cacheConfig,
  agent: { enabled, apiKey, baseUrl, model, temperature, maxTokens, mcpPort },
  validateKeys: () => boolean,
  getKeyHealthStatus: () => { healthy, warnings },
}
```

## 6.8 gracefulShutdown 流程

```typescript
// packages/server/src/server.ts
const gracefulShutdown = async (signal: string) => {
  logger.info('%s received, initiating graceful shutdown', signal)

  if (isShuttingDown) return
  isShuttingDown = true

  // 30 秒超时强制退出
  const forceExitTimeout = setTimeout(() => {
    logger.warn('Forced exit after 30s timeout')
    process.exit(0)
  }, 30000)

  const shutdownSteps = [
    { name: 'HTTP server',       action: () => new Promise(resolve => server.close(() => resolve())) },
    { name: 'WebSocket server',  action: async () => websocketService?.getIO?.close() },
    { name: 'Auto backup',       action: async () => backupUtil?.stopAutoBackup?.() },
    { name: 'Monitoring service',action: async () => monitoringService?.shutdown?.() },
    { name: 'Cron service',      action: async () => cronService?.shutdown?.() },
    { name: 'Cache service',     action: async () => await cacheService.shutdown() },
    { name: 'Queue service',     action: async () => await queueService.shutdown() },
    { name: 'Database',          action: async () => await closeDb() },
  ]

  for (const step of shutdownSteps) {
    try {
      await step.action()
      logger.info(`${step.name} closed`)
    } catch (e) {
      logger.warn(`${step.name} close skipped: %s`, (e as Error).message)
    }
  }
}
```

关闭顺序：HTTP → WebSocket → 备份 → 监控 → 定时任务 → 缓存 → 队列 → 数据库

## 6.9 WebSocket

[packages/server/src/websocket.js](file:///f:/gexm/packages/server/src/websocket.js)

- 基于 Socket.IO 4
- 在 HTTP 服务启动后挂载
- 支持聊天、通知、订单状态推送等实时场景
- 在 `gracefulShutdown` 中显式关闭

## 6.10 关键端点

### 6.10.1 健康检查

`GET /api/health`：返回服务状态、内存使用、运行时长、TraceId

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "running",
    "timestamp": 1721366400000,
    "version": "1.0.0",
    "uptime": 3600,
    "memory": { "rss": 100, "heapUsed": 50, "heapTotal": 80 },
    "traceId": "abc123"
  }
}
```

### 6.10.2 指标端点

- `GET /metrics`：Prometheus 标准格式（无认证）
- `GET /api/metrics`：JSON 格式（根据 Accept 头返回）
- `POST /api/metrics/reset`：重置指标

### 6.10.3 API 文档

- `GET /api/docs`：Swagger UI（基于 swaggerSpec）
- `GET /api-docs`：Swagger UI（基于 OpenAPI YAML）
- `GET /api-docs.json`：OpenAPI JSON
