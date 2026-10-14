# 11. 关键类与函数说明

> 本章梳理 `gexm-platform` 仓库中跨模块复用、承担核心职责的关键类与函数，覆盖 SDK、数据库、配置、中间件、服务、WordPress 主题与 PC 前端。所有路径均以 `file:///` 协议给出，便于在 Trae CN 中直接跳转。

---

## 11.1 SDK 主类 GexmSDK

**文件**：[packages/sdk/src/index.ts](file:///f:/gexm/packages/sdk/src/index.ts)

`GexmSDK` 是跨平台 SDK 的统一入口，全静态方法设计，业务代码通过 `GexmSDK.network / storage / crypto / log / terminal` 五大模块获得与平台无关的能力调用。

### 11.1.1 类签名

```typescript
export class GexmSDK {
  static init(config: SDKConfig = {}): void
  static destroy(): void
  static isInitialized(): boolean
  static getPlatform(): PlatformType | null
  static getAdapter(): IPlatformAdapter | null

  // 五大模块（懒加载，未初始化时抛 SDK_NOT_INITIALIZED）
  static get network(): INetworkModule
  static get storage(): IStorageModule
  static get crypto(): ICryptoModule
  static get log(): ILogModule
  static get terminal(): ITerminalModule

  // 事件与插件
  static get eventBus(): EventBus
  static get pluginRegistry(): PluginRegistry

  // 扩展点
  static registerPlatform(platform: PlatformType, adapter: IPlatformAdapter): void
  static registerDefaultAdapters(config: SDKConfig): void
  static usePlugin(plugin: IPlugin): void
}

export { GexmSDK as SDK }
export default GexmSDK
```

### 11.1.2 关键行为

- **单次初始化**：`isInitialized` 模块级布尔守卫，重复调用 `init` 抛 `SDK_ALREADY_INITIALIZED`
- **默认适配器注册**：`registerDefaultAdapters` 遍历 9 个内置适配器（web/mp-weixin/mp-alipay/mp-baidu/mp-toutiao/app-plus/electron/mp-harmony/app-harmony）逐一注册到 `PlatformFactory`
- **平台检测**：未在 `config.platform` 指定时调用 `PlatformFactory.detect()` 自动判定
- **生命周期事件**：`init` 完成后通过 `eventBus.emit('sdk:initialized', { platform, config })` 广播；`destroy` 后广播 `sdk:destroyed`
- **销毁顺序**：先 `pluginRegistry.destroyAllPlugins()` → 再 `adapter.destroy()` → 最后置 `isInitialized = false`

### 11.1.3 使用示例

```typescript
import { GexmSDK } from '@gexm/sdk'

// 基础初始化（自动检测平台）
GexmSDK.init()

// 显式指定平台
GexmSDK.init({ platform: 'mp-weixin' })

// 调用网络模块
const res = await GexmSDK.network.get('/api/v1/users')

// 监听事件
GexmSDK.eventBus.on('sdk:initialized', (payload) => {
  GexmSDK.log.info('SDK ready', payload)
})

// 销毁
GexmSDK.destroy()
```

---

## 11.2 数据库抽象 IDbClient

**文件**：[packages/server/src/models/dbClient.ts](file:///f:/gexm/packages/server/src/models/dbClient.ts) 与 [packages/server/src/models/index.ts](file:///f:/gexm/packages/server/src/models/index.ts)

`IDbClient` 通过 `ISyncDbClient & IAsyncDbClient` 联合类型同时承载同步与异步两种调用风格，便于历史代码（基于 `better-sqlite3` 的同步 API）平滑迁移到 PostgreSQL 异步驱动。

### 11.2.1 接口定义

```typescript
export interface ISyncDbClient {
  prepare(sql: string): SyncPreparedStatement
  exec(sql: string): void
  transaction<T>(fn: () => T): () => T
  pragma(sql: string): unknown[]
  close(): void
  healthCheck(): boolean
  getConnectionInfo(): Record<string, unknown>
}

export interface IAsyncDbClient {
  prepareAsync(sql: string): IAsyncPreparedStatement
  execAsync(sql: string): Promise<void>
  transactionAsync<T>(fn: () => Promise<T>): Promise<T>
  closeAsync(): Promise<void>
  healthCheckAsync(): Promise<boolean>
}

export type IDbClient = ISyncDbClient & IAsyncDbClient
```

### 11.2.2 工厂方法

```typescript
// packages/server/src/models/index.ts
export function getDb(): IDbClient
export function closeDb(): void
```

- `getDb()` 首次调用根据 `config.db.type` 选择 SQLite (`better-sqlite3`) 或 PostgreSQL (`PgSyncClient`)，后续调用返回缓存实例
- `closeDb()` 关闭并清空缓存，主要用于测试套件间隔离（参见 `__tests__/unit/dbClient.test.ts`）

### 11.2.3 PgSyncClient（历史遗留）

**文件**：[packages/server/src/models/pgSyncClient.ts](file:///f:/gexm/packages/server/src/models/pgSyncClient.ts)

基于 `deasync.loopWhile` 阻塞 Node 事件循环，把异步 `pg` Client 包装成同步接口。

**注意**：
- 在 Jest 异步测试环境中易引发 Promise 死锁（已记入 `project_memory.md`）
- 新代码应直接使用 `IAsyncDbClient`，并参考 [packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md](file:///f:/gexm/packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md) 迁移

### 11.2.4 SQL 方言适配

**文件**：[packages/server/src/models/sqlDialect.ts](file:///f:/gexm/packages/server/src/models/sqlDialect.ts)

| 函数 | 用途 |
| --- | --- |
| `translateSql(sql, params?)` | SQLite ↔ PostgreSQL 语句自动转换（`?` ↔ `$1`、`AUTOINCREMENT` ↔ `SERIAL`、`PRAGMA` ↔ `SHOW` 等） |
| `isPostgres(): boolean` | 当前是否为 PostgreSQL 模式 |
| `getTableColumns(tableName): string[]` | 获取表字段列表（用于白名单校验） |
| `getForeignKeyList(tableName): ForeignKeyInfo[]` | 获取外键信息 |

---

## 11.3 配置与密钥校验

**文件**：[packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts)

### 11.3.1 Config 对象结构

```typescript
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  db: {
    type: process.env.DB_TYPE || 'sqlite',
    path: process.env.DB_PATH || './data/gexm.db',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'gexm',
    user: process.env.DB_USER || 'gexm',
    password: process.env.DB_PASSWORD || '',
  },
  redis: { url: process.env.REDIS_URL, enabled: parseBool(process.env.REDIS_ENABLED, false) },
  consul: { enabled: parseBool(process.env.CONSUL_ENABLED, false) },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'gexm',
    audience: process.env.JWT_AUDIENCE || 'gexm-client',
  },
  csrf: { secret: process.env.CSRF_SECRET },
  pii: { encryptionKey: process.env.PII_ENCRYPTION_KEY },
  payment: { /* see 15-configuration */ },
  cors: { origins: parseList(process.env.CORS_ORIGINS) },
  rateLimit: { window: Number(process.env.RATE_LIMIT_WINDOW) || 15, max: Number(process.env.RATE_LIMIT_MAX) || 100 },
  log: { level: process.env.LOG_LEVEL || 'info', file: process.env.LOG_FILE || './logs/app.log' },
  openai: { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
  mcp: { port: Number(process.env.MCP_PORT) || 8080 },
  agent: { enabled: parseBool(process.env.AGENT_ENABLED, false) },
}
```

### 11.3.2 密钥强度校验 validateKeys()

```typescript
export function validateKeys(): boolean
```

**规则**：
- 生产环境 (`NODE_ENV=production`) 强制要求 `JWT_SECRET`、`JWT_REFRESH_SECRET`、`CSRF_SECRET`、`PII_ENCRYPTION_KEY`、`PAYMENT_SECRET` 全部非空
- 长度 ≥ 32 字符，且包含大小写字母 + 数字 + 特殊字符；或 Hex/Base64 格式 ≥ 32 字节
- 不满足时抛 `Error('Insufficient key strength')`，启动终止

### 11.3.3 生成强密钥命令

```bash
# Hex（64 字符）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 11.4 中间件层关键函数

**目录**：[packages/server/src/middleware/](file:///f:/gexm/packages/server/src/middleware/)

### 11.4.1 authMiddleware

**文件**：[packages/server/src/middleware/auth.ts](file:///f:/gexm/packages/server/src/middleware/auth.ts)

```typescript
export function authMiddleware(req: Request, res: Response, next: NextFunction): void
```

- 从 `Authorization: Bearer <token>` 提取 Access Token
- 使用 `jsonwebtoken.verify` 校验签名、过期、`iss`/`aud` 声明
- 校验通过后将 `userId`、`roles`、`permissions` 挂载到 `req.user`
- 失败返回 401 `UNAUTHORIZED`，并通过 `requestLogger` 记录原因

可选导出：

```typescript
export function optionalAuth(req, res, next): void   // 未携带 Token 时不报错
export function requireRole(...roles: string[]): Middleware  // RBAC 装饰器
export function requirePermission(permission: string): Middleware
```

### 11.4.2 csrfConfig 与 csrfTokenMiddleware

**文件**：[packages/server/src/middleware/csrfConfig.ts](file:///f:/gexm/packages/server/src/middleware/csrfConfig.ts)

```typescript
export const csrfOptions: Options = {
  cookie: { httpOnly: true, sameSite: 'lax', secure: isHttps },
  signed: true,
  key: 'csrf',
}

export function csrfTokenMiddleware(req, res, next): void
export function getCsrfMiddleware(routeName: string): Middleware  // 路由级双重校验
```

- `/api/v1/auth/login`、`/api/v1/auth/refresh` 等路由豁免 CSRF（参见 [packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts)）
- 监控、双写、语言、OAuth、性能等路由也豁免（与 `project_memory.md` 约束一致）

### 11.4.3 rateLimiter

**文件**：[packages/server/src/middleware/rateLimiter.ts](file:///f:/gexm/packages/server/src/middleware/rateLimiter.ts)

```typescript
export function rateLimiter(opts?: { windowMs?: number; max?: number }): Middleware
export function authRateLimiter(): Middleware   // 登录/注册专用（5 次/5 分钟）
export function sensitiveRateLimiter(): Middleware  // 支付、密钥修改等
```

- 基于 `express-rate-limit`，使用 token bucket 算法
- 用户标识：登录用户用 `user_id`，匿名用户用 IP
- `NODE_ENV=test` 时自动跳过（参见 [packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts)）

### 11.4.4 permission

**文件**：[packages/server/src/middleware/permission.ts](file:///f:/gexm/packages/server/src/middleware/permission.ts)

```typescript
export function checkPermission(permission: string): Middleware
export function checkAnyPermission(...permissions: string[]): Middleware
export function checkAllPermissions(...permissions: string[]): Middleware
```

RBAC 中间件，依赖 `req.user.permissions`（由 `authMiddleware` 注入），不通过时返回 403 `FORBIDDEN`。

### 11.4.5 其他中间件清单

| 中间件 | 文件 | 作用 |
| --- | --- | --- |
| `securityMiddleware` | [middleware/security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) | Helmet + XSS 过滤 + 安全响应头 |
| `apiCache` | [middleware/apiCache.ts](file:///f:/gexm/packages/server/src/middleware/apiCache.ts) | API 响应缓存（支持 ETag/304） |
| `cacheHeaders` | [middleware/cacheHeaders.ts](file:///f:/gexm/packages/server/src/middleware/cacheHeaders.ts) | 静态资源 Cache-Control + 条件 GET |
| `dataMasking` | [middleware/dataMasking.ts](file:///f:/gexm/packages/server/src/middleware/dataMasking.ts) | 响应数据脱敏（手机/邮箱/身份证/Token） |
| `auditMiddleware` | [middleware/auditMiddleware.ts](file:///f:/gexm/packages/server/src/middleware/auditMiddleware.ts) | 操作审计日志 |
| `errorHandler` | [middleware/errorHandler.ts](file:///f:/gexm/packages/server/src/middleware/errorHandler.ts) | 全局错误捕获 + 统一响应 |
| `ipWhitelist` | [middleware/ipWhitelist.ts](file:///f:/gexm/packages/server/src/middleware/ipWhitelist.ts) | IP/CIDR 白名单（支付回调用） |
| `metrics` | [middleware/metrics.ts](file:///f:/gexm/packages/server/src/middleware/metrics.ts) | Prometheus 指标采集 |
| `requestLogger` | [middleware/requestLogger.ts](file:///f:/gexm/packages/server/src/middleware/requestLogger.ts) | 请求日志 + TraceId 注入 |
| `sensitiveAction` | [middleware/sensitiveAction.ts](file:///f:/gexm/packages/server/src/middleware/sensitiveAction.ts) | 敏感操作二次验证 |
| `validateId` | [middleware/validateId.ts](file:///f:/gexm/packages/server/src/middleware/validateId.ts) | 路径参数 ID 校验（防 SQL 注入） |
| `validateSchema` | [middleware/validateSchema.ts](file:///f:/gexm/packages/server/src/middleware/validateSchema.ts) | Zod Schema 校验 |
| `apm` | [middleware/apm.ts](file:///f:/gexm/packages/server/src/middleware/apm.ts) | APM 性能监控 |

---

## 11.5 服务层关键函数

### 11.5.1 initDatabase()

**文件**：[packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts)

启动时初始化数据库，按依赖顺序建表、创建索引、写入默认数据（管理员账号、默认角色、权限）。失败时启动终止。

### 11.5.2 registerRoutes(app)

**文件**：[packages/server/src/routes/index.ts](file:///f:/gexm/packages/server/src/routes/index.ts)

注册全部 42 条业务路由，每条路由通过 `app.use('/api/v1/xxx', router)` 挂载，路由级 CSRF 通过 `getCsrfMiddleware(routeName)` 双重校验。

### 11.5.3 initPaymentGateways()

**文件**：[packages/server/src/services/paymentGateways/index.ts](file:///f:/gexm/packages/server/src/services/paymentGateways/index.ts)

```typescript
export function initPaymentGateways(): void
export function getPaymentGateway(name: 'alipay' | 'wechat' | 'paypal' | 'stripe'): PaymentGateway
```

- 启动时根据 `config.payment` 加载已配置的支付网关
- 支持热插拔：未配置密钥的网关不注册，对应路由返回 503 `SERVICE_UNAVAILABLE`
- 每个网关实例统一实现 `createOrder`、`queryOrder`、`verifyCallback`、`refund` 接口

### 11.5.4 服务发现 registerService / deregisterService

**文件**：[packages/server/src/services/serviceDiscovery.ts](file:///f:/gexm/packages/server/src/services/serviceDiscovery.ts)

```typescript
export async function registerService(opts: {
  name: string
  port: number
  address: string
  tags?: string[]
  meta?: Record<string, string>
}): Promise<void>

export async function deregisterService(): Promise<void>
```

- 启用 Consul 时调用 Consul Agent API 注册服务
- 禁用时回退到环境变量静态实例列表（`CONSUL_INSTANCES` 或单实例 `SERVICE_HOST`/`SERVICE_PORT`）
- `deregisterService` 在 `gracefulShutdown` 中调用

### 11.5.5 initTracing / getCurrentTraceId

**文件**：[packages/server/src/utils/tracing.ts](file:///f:/gexm/packages/server/src/utils/tracing.ts)

```typescript
export function initTracing(): void
export function getCurrentTraceId(): string | undefined
export function setTraceId(traceId: string): void
```

- 初始化 OpenTelemetry Node SDK，注册 Express 与 HTTP instrumentation
- 导出到 Jaeger（`OTEL_EXPORTER_JAEGER_ENDPOINT`）
- 每个请求通过 `requestLogger` 注入 `X-Trace-Id` 响应头，TraceId 同时写入日志上下文

### 11.5.6 translateSql

参见 11.2.4。

### 11.5.7 validateKeys

参见 11.3.2。

### 11.5.8 gracefulShutdown

**文件**：[packages/server/src/server.ts](file:///f:/gexm/packages/server/src/server.ts)

```typescript
export async function gracefulShutdown(signal: string): Promise<void>
```

**关闭顺序**（与 `project_memory.md` 工程约定一致）：

1. HTTP Server 停止接收新连接
2. WebSocket（Socket.IO）广播 `disconnect` 并关闭
3. 备份服务（`utils/backup.ts`）完成最后一次增量备份
4. 监控服务（`services/monitoring.ts`）发送 `service:shutdown` 事件
5. 定时任务（`services/cronService.ts`）停止所有 cron job
6. 缓存（`services/cacheService.ts`）flush 到 Redis
7. 队列（`services/queueService.ts`）等待进行中任务完成（最长 30s）
8. 数据库（`models/index.ts` 的 `closeDb()`）关闭连接

**超时**：30 秒强制 `process.exit(1)`，避免僵尸进程。

### 11.5.9 logger

**文件**：[packages/server/src/utils/logger.ts](file:///f:/gexm/packages/server/src/utils/logger.ts)

```typescript
export const logger: winston.Logger
export function getLogger(module: string): winston.Logger
```

- 基于 `winston` + `winston-daily-rotate-file`
- 输出格式：`{ timestamp, level, module, traceId, userId, message, ...meta }`
- 日志脱敏由 `dataMasking` 中间件统一处理，logger 本身不重复脱敏

---

## 11.6 WordPress 主题核心函数

**文件**：[wp-content/themes/mixm-laal/functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php) 与 [wp-content/themes/mixm-laal/inc/](file:///f:/gexm/wp-content/themes/mixm-laal/inc/)

### 11.6.1 关键函数清单

| 函数 | 文件 | 作用 |
| --- | --- | --- |
| `mixm_laal_get_cart_session_id()` | functions.php | 游客购物车会话 ID（Cookie + Transient，替代 `session_start`） |
| `mixm_laal_setup()` | functions.php | 主题支持注册（title-tag、post-thumbnails、html5、custom-logo 等） |
| `mixm_laal_scripts()` | functions.php | 资源加载（条件加载社交/社区/论坛/商城等模块 CSS/JS） |
| `mixm_laal_add_sri_attributes($html, $handle)` | functions.php | 为 CDN 资源注入 SRI 完整性校验 |
| `mixm_laal_ip_match_cidr($ip, $cidr)` | inc/api-functions.php | IP 与 CIDR 范围匹配（IPv4/IPv6 兼容） |
| `mixm_laal_verify_nonce($action)` | inc/security-functions.php | Nonce 校验封装 |
| `mixm_laal_ensure_table_exists($table_name, $ddl)` | inc/db-functions.php | 集中式表存在检查（静态缓存 + prepared statement） |
| `mixm_laal_log_secure($message, $level)` | inc/logger-functions.php | 安全日志（10MB 轮转 + LOCK_EX） |
| `mixm_laal_sanitize_ip($ip)` | inc/security-functions.php | IP 净化（`wp_unslash` + `sanitize_text_field`） |

### 11.6.2 AJAX 接口

| Action | 文件 | 用途 |
| --- | --- | --- |
| `mixm_laal_sync_status` | admin/theme-sync.php | 主题同步状态查询 |
| `mixm_laal_social_like` | inc/social-functions.php | 点赞 |
| `mixm_laal_social_comment` | inc/social-functions.php | 评论 |
| `mixm_laal_cart_add` | inc/shop-functions.php | 加入购物车 |
| `mixm_laal_cart_update` | inc/shop-functions.php | 更新购物车 |
| `mixm_laal_order_create` | inc/shop-functions.php | 创建订单 |

所有 AJAX 均使用 `mixm_laal_nonce` 作为 CSRF Token，未通过校验返回 403。

### 11.6.3 函数声明守卫

主题 `functions.php` 与 `inc/*.php` 中所有函数定义均以 `function_exists()` 守卫，避免子主题或插件冲突导致 "Cannot redeclare function" 致命错误：

```php
if (!function_exists('mixm_laal_get_cart_session_id')) {
    function mixm_laal_get_cart_session_id() {
        // ...
    }
}
```

---

## 11.7 PC 前端核心

### 11.7.1 useUserStore（Pinia）

**文件**：[packages/pc/src/store/user.ts](file:///f:/gexm/packages/pc/src/store/user.ts)

```typescript
export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    refreshToken: '',
    user: null as UserInfo | null,
    permissions: [] as string[],
    roles: [] as string[],
  }),
  actions: {
    initFromStorage()                 // 从 localStorage 恢复
    async login(credentials)          // 登录
    async refreshAccessToken()        // 刷新 Token
    async fetchProfile()              // 获取用户信息
    logout()                          // 登出并清空存储
    hasPermission(perm: string): boolean
    hasRole(role: string): boolean
  },
})
```

`main.ts` 启动时调用 `userStore.initFromStorage()`，从 `localStorage` 恢复登录态，配合 `router.beforeEach` 守卫实现页面级权限控制。

### 11.7.2 密码强度检测

**文件**：[packages/pc/src/utils/passwordStrength.ts](file:///f:/gexm/packages/pc/src/utils/passwordStrength.ts)

```typescript
export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4 | 5    // 0 最弱，5 最强
  label: '极弱' | '弱' | '一般' | '较强' | '强' | '极强'
  suggestions: string[]            // 改进建议
  passed: boolean                  // 是否达到最低要求（score >= 3）
}

export function checkPasswordStrength(password: string): PasswordStrengthResult
```

评分规则：
- 长度（< 8 / 8-11 / 12-15 / 16-19 / ≥ 20）
- 是否包含大写字母、小写字母、数字、特殊字符
- 是否命中常见弱密码字典（top 1000）
- 是否为连续字符（`12345678`）或重复字符（`aaaaaaaa`）

### 11.7.3 CaptchaCanvas

**文件**：[packages/pc/src/components/CaptchaCanvas.vue](file:///f:/gexm/packages/pc/src/components/CaptchaCanvas.vue)

Canvas 实现的图形验证码组件，支持：
- 4 位字符（数字 + 字母混合）
- 干扰线、噪点
- 点击刷新
- `v-model` 绑定当前验证码值（用于前端校验，后端通过 `verifyCodeService` 二次校验）

### 11.7.4 router.beforeEach 守卫

**文件**：[packages/pc/src/router/index.ts](file:///f:/gexm/packages/pc/src/router/index.ts)

```typescript
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth === false) {
    return next()
  }

  if (!userStore.token) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  // 管理员路径检查
  if (to.meta.adminOnly && !userStore.hasRole('admin')) {
    return next({ name: 'Dashboard' })
  }

  // 权限检查
  if (to.meta.permission && !userStore.hasPermission(to.meta.permission as string)) {
    return next({ name: 'Dashboard' })
  }

  next()
})
```

管理员专属路径：`/users`、`/roles`、`/permissions`、`/audit`（`meta.adminOnly = true`）。

---

## 11.8 多端 App 核心函数

### 11.8.1 useAppStore（Pinia）

**文件**：[packages/app/src/store/app.js](file:///f:/gexm/packages/app/src/store/app.js)

```javascript
export const useAppStore = defineStore('app', {
  state: () => ({
    token: uni.getStorageSync('token') || '',
    user: null,
    cart: [],
    platform: '',  // 当前平台标识
  }),
  actions: {
    async login(credentials)
    async refreshAccessToken()
    setToken(token) { this.token = token; uni.setStorageSync('token', token) }
    clearToken() { this.token = ''; uni.removeStorageSync('token') }
    addToCart(product)
    async checkout()
  },
})
```

### 11.8.2 API 请求封装

**文件**：[packages/app/src/api/index.js](file:///f:/gexm/packages/app/src/api/index.js)

```javascript
const request = (options) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': `Bearer ${useAppStore().token}`,
        'X-Trace-Id': generateTraceId(),
        ...options.header,
      },
      success: (res) => {
        if (res.statusCode === 401) {
          // 自动刷新 Token
        }
        resolve(res.data)
      },
      fail: reject,
    })
  })
}
```

---

## 11.9 SDK 核心机制

### 11.9.1 PlatformFactory

**文件**：[packages/sdk/src/core/platformFactory.ts](file:///f:/gexm/packages/sdk/src/core/platformFactory.ts)

```typescript
export class PlatformFactory {
  static detect(): PlatformType                    // 自动检测当前平台
  static register(platform: PlatformType, adapter: IPlatformAdapter): void
  static getAdapter(platform?: PlatformType): IPlatformAdapter | null
  static setCurrentPlatform(platform: PlatformType): void
  static getCurrentPlatform(): PlatformType | null
  static getCurrentAdapter(): IPlatformAdapter | null
}
```

`detect()` 判定顺序：
1. `process.versions.electron` → `electron`
2. `typeof window !== 'undefined'` 且 `window.__UNI__` → 对应小程序平台
3. `typeof wx !== 'undefined'` → `mp-weixin`
4. 默认 → `web`

### 11.9.2 EventBus

**文件**：[packages/sdk/src/core/eventBus.ts](file:///f:/gexm/packages/sdk/src/core/eventBus.ts)

```typescript
export class EventBus {
  on(event: string, handler: EventHandler): void
  once(event: string, handler: EventHandler): void
  off(event: string, handler?: EventHandler): void
  emit(event: string, payload?: unknown): void
  clear(): void
}
```

内置事件：
- `sdk:initialized` / `sdk:destroyed`
- `network:request:start` / `network:request:success` / `network:request:error`
- `storage:changed`

### 11.9.3 PluginRegistry

**文件**：[packages/sdk/src/core/pluginRegistry.ts](file:///f:/gexm/packages/sdk/src/core/pluginRegistry.ts)

```typescript
export class PluginRegistry {
  register(plugin: IPlugin): void
  unregister(name: string): void
  getPlugin(name: string): IPlugin | null
  initAllPlugins(): void
  destroyAllPlugins(): void
}
```

插件通过 `GexmSDK.usePlugin(plugin)` 注册，初始化时调用 `plugin.init(adapter)`，销毁时调用 `plugin.destroy()`。

### 11.9.4 ErrorCodes

**文件**：[packages/sdk/src/core/errorCodes.ts](file:///f:/gexm/packages/sdk/src/core/errorCodes.ts)

```typescript
export enum ErrorCodes {
  SDK_NOT_INITIALIZED = 'SDK_NOT_INITIALIZED',
  SDK_ALREADY_INITIALIZED = 'SDK_ALREADY_INITIALIZED',
  PLATFORM_ADAPTER_NOT_FOUND = 'PLATFORM_ADAPTER_NOT_FOUND',
  NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',
  STORAGE_KEY_NOT_FOUND = 'STORAGE_KEY_NOT_FOUND',
  CRYPTO_ENCRYPT_FAILED = 'CRYPTO_ENCRYPT_FAILED',
  PLUGIN_INIT_FAILED = 'PLUGIN_INIT_FAILED',
  // ...
}

export class SDKError extends Error {
  constructor(public code: ErrorCodes, message?: string, public cause?: unknown)
}
```

---

## 11.10 工具函数

### 11.10.1 response 统一响应

**文件**：[packages/server/src/utils/response.ts](file:///f:/gexm/packages/server/src/utils/response.ts)

```typescript
export function success<T>(res: Response, data: T, message?: string): Response
export function fail(res: Response, code: string, message: string, status?: number): Response
export function paginate<T>(res: Response, list: T[], total: number, page: number, pageSize: number): Response
```

统一响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "xxx"
}
```

### 11.10.2 crypto 加解密

**文件**：[packages/server/src/utils/crypto.ts](file:///f:/gexm/packages/server/src/utils/crypto.ts)

```typescript
export function hashPassword(password: string): Promise<string>   // bcrypt
export function comparePassword(password: string, hash: string): Promise<boolean>
export function encryptPII(text: string): string                  // AES-256-GCM
export function decryptPII(ciphertext: string): string
export function generateToken(length?: number): string
export function signJWT(payload: object, secret: string, expiresIn: string): string
export function verifyJWT(token: string, secret: string): JwtPayload
```

### 11.10.3 backup 备份

**文件**：[packages/server/src/utils/backup.ts](file:///f:/gexm/packages/server/src/utils/backup.ts)

```typescript
export async function backupDatabase(opts?: { incremental?: boolean }): Promise<string>
export async function restoreBackup(filepath: string): Promise<void>
export function listBackups(): BackupInfo[]
```

- SQLite 模式：直接拷贝 `.db` 文件
- PostgreSQL 模式：调用 `pg_dump`
- 增量备份：基于上次全量备份 + WAL 日志
- 在 `gracefulShutdown` 中调用最后一次增量备份

### 11.10.4 migration 迁移

**文件**：[packages/server/src/utils/migration.ts](file:///f:/gexm/packages/server/src/utils/migration.ts) 与 [packages/server/src/commands/migrate.ts](file:///f:/gexm/packages/server/src/commands/migrate.ts)

```typescript
export async function runMigrations(): Promise<MigrationResult>
export async function verifyMigrations(): Promise<VerificationResult>
export function getMigrationHistory(): MigrationRecord[]
```

- 迁移脚本位于 `packages/server/scripts/migrate.ts`
- 支持 SQLite 与 PostgreSQL 双库
- 每次迁移记录版本号、执行时间、SQL 摘要到 `migrations` 表

---

## 11.11 参考文档

- [packages/sdk/src/index.ts](file:///f:/gexm/packages/sdk/src/index.ts) — SDK 主入口
- [packages/server/src/models/dbClient.ts](file:///f:/gexm/packages/server/src/models/dbClient.ts) — 数据库客户端
- [packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts) — 配置与密钥校验
- [packages/server/src/middleware/](file:///f:/gexm/packages/server/src/middleware/) — 中间件目录
- [packages/server/src/server.ts](file:///f:/gexm/packages/server/src/server.ts) — 优雅停机
- [packages/pc/src/store/user.ts](file:///f:/gexm/packages/pc/src/store/user.ts) — PC 用户态
- [packages/pc/src/utils/passwordStrength.ts](file:///f:/gexm/packages/pc/src/utils/passwordStrength.ts) — 密码强度
- [wp-content/themes/mixm-laal/functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php) — 主题核心函数
- [packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md](file:///f:/gexm/packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md) — PostgreSQL 异步迁移指南
