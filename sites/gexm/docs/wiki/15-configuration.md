# 15. 配置与环境变量

> 本章详细列出 `gexm-platform` 全部环境变量、配置文件、各包配置入口、密钥管理、平台差异配置等。所有路径以 `file:///` 协议给出。

---

## 15.1 配置文件总览

| 文件 | 路径 | 用途 |
| --- | --- | --- |
| 根 `.env` | [.env](file:///f:/gexm/.env) | 全局共享变量（Docker Compose 用） |
| 根 `.env.example` | [.env.example](file:///f:/gexm/.env.example) | 示例 |
| Server `.env` | [packages/server/.env](file:///f:/gexm/packages/server/.env) | 后端专用 |
| Server `.env.example` | [packages/server/.env.example](file:///f:/gexm/packages/server/.env.example) | 后端示例 |
| Server config | [packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts) | 后端配置入口 |
| PC config | [packages/pc/src/config/](file:///f:/gexm/packages/pc/src/config/) | PC 配置 |
| App manifest | [packages/app/src/manifest.json](file:///f:/gexm/packages/app/src/manifest.json) | uni-app 平台配置 |
| App pages | [packages/app/src/pages.json](file:///f:/gexm/packages/app/src/pages.json) | uni-app 页面配置 |
| SDK config | [packages/sdk/src/interfaces/ITypes.ts](file:///f:/gexm/packages/sdk/src/interfaces/ITypes.ts) | SDKConfig 类型 |
| Desktop .env | [packages/desktop/.env.example](file:///f:/gexm/packages/desktop/.env.example) | 桌面端示例 |
| Docker Compose | [docker-compose.yml](file:///f:/gexm/docker-compose.yml) | 容器编排 |
| Nginx | [infra/nginx/conf.d/gexm.conf](file:///f:/gexm/infra/nginx/conf.d/gexm.conf) | 网关 |
| PostgreSQL | [infra/postgres/postgresql.conf](file:///f:/gexm/infra/postgres/postgresql.conf) | 数据库 |
| Redis | [infra/redis/redis.conf](file:///f:/gexm/infra/redis/redis.conf) | 缓存 |
| MySQL | [infra/mysql/my.cnf](file:///f:/gexm/infra/mysql/my.cnf) | WordPress 数据库 |

---

## 15.2 服务端核心环境变量

**文件**：[packages/server/.env.example](file:///f:/gexm/packages/server/.env.example) 与 [packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts)

### 15.2.1 基础配置

| 变量 | 默认值 | 说明 | 必填 |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | 环境（development/staging/production/test） | 是 |
| `PORT` | `3000` | 服务端口 | 否 |
| `LOG_LEVEL` | `info` | 日志级别（debug/info/warn/error） | 否 |
| `LOG_FILE` | `./logs/app.log` | 日志文件路径 | 否 |
| `LOG_MASK_SENSITIVE_DATA` | `true`（prod） | 日志脱敏开关 | 否 |

### 15.2.2 数据库配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_TYPE` | `sqlite` | 数据库类型（sqlite/postgres） |
| `DB_PATH` | `./data/gexm.db` | SQLite 路径 |
| `DATABASE_PATH` | `./data/gexm.db` | 别名（与 `DB_PATH` 等效） |
| `DB_HOST` | `localhost` | PostgreSQL 主机 |
| `DB_PORT` | `5432` | PostgreSQL 端口 |
| `DB_NAME` | `gexm` | PostgreSQL 数据库 |
| `DB_USER` | `gexm` | PostgreSQL 用户 |
| `DB_PASSWORD` | — | PostgreSQL 密码 |
| `POSTGRES_URL` | `postgres://gexm:gexm_password@postgres:5432/gexm` | Docker Compose 默认 |

### 15.2.3 Redis 配置（可选）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `REDIS_URL` | — | Redis 连接 URL |
| `REDIS_ENABLED` | `false` | 是否启用 Redis |
| `REDIS_PORT` | `6379` | Docker 端口映射 |

### 15.2.4 服务发现配置（可选）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CONSUL_ENABLED` | `false` | 是否启用 Consul |
| `CONSUL_HOST` | `localhost` | Consul 主机 |
| `CONSUL_PORT` | `8500` | Consul 端口 |
| `CONSUL_INSTANCES` | — | 静态实例列表（禁用 Consul 时回退） |
| `SERVICE_HOST` | — | 单实例主机 |
| `SERVICE_PORT` | — | 单实例端口 |

### 15.2.5 安全密钥配置

| 变量 | 默认值 | 说明 | 必填（prod） |
| --- | --- | --- | --- |
| `JWT_SECRET` | — | JWT Access Token 密钥 | 是 |
| `JWT_EXPIRES_IN` | `2h` | Access Token 过期时间 | 否 |
| `JWT_REFRESH_SECRET` | — | Refresh Token 密钥 | 是 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh Token 过期时间 | 否 |
| `JWT_ISSUER` | `gexm` | JWT 签发者 | 否 |
| `JWT_AUDIENCE` | `gexm-client` | JWT 受众 | 否 |
| `CSRF_SECRET` | — | CSRF 密钥 | 是 |
| `PII_ENCRYPTION_KEY` | — | PII 加密密钥（32 字节） | 是 |
| `PAYMENT_SECRET` | — | 支付签名密钥 | 是 |
| `PAYMENT_SIGN_ALGORITHM` | `HMAC-SHA256` | 支付签名算法 | 否 |
| `ADMIN_DEFAULT_PASSWORD` | `admin123456` | 管理员默认密码（首次启动） | 是 |

### 15.2.6 密钥强度要求

生产环境（`NODE_ENV=production`）强制：
- 长度 ≥ 32 字符
- 包含大小写字母 + 数字 + 特殊字符
- 或 Hex/Base64 格式 ≥ 32 字节

生成命令：

```bash
# Hex（64 字符）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 15.2.7 支付配置

| 变量 | 说明 |
| --- | --- |
| `PAYMENT_IP_WHITELIST_ENABLED` | 支付 IP 白名单开关（默认 false） |
| `PAYMENT_IP_WHITELIST_IPS` | 支付 IP 白名单（逗号分隔） |
| `PAYMENT_IP_WHITELIST_CIDR` | 支付 CIDR 白名单（逗号分隔） |

#### 支付宝专用

| 变量 | 说明 |
| --- | --- |
| `ALIPAY_APP_ID` | 应用 ID |
| `ALIPAY_APP_SECRET` | 应用密钥 |
| `ALIPAY_PRIVATE_KEY` | 商户私钥（RSA2） |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥 |
| `ALIPAY_REDIRECT_URI` | OAuth 回调 |
| `ALIPAY_GATEWAY` | 网关地址（默认沙箱） |
| `ALIPAY_NOTIFY_URL` | 异步通知地址 |

#### 微信支付专用

| 变量 | 说明 |
| --- | --- |
| `WECHAT_PAY_APP_ID` | 应用 ID |
| `WECHAT_PAY_MCH_ID` | 商户号 |
| `WECHAT_PAY_API_KEY` | API 密钥（HMAC-SHA256） |
| `WECHAT_PAY_CERT_PATH` | 证书路径 |
| `WECHAT_PAY_NOTIFY_URL` | 异步通知地址 |

#### PayPal 专用

| 变量 | 说明 |
| --- | --- |
| `PAYPAL_CLIENT_ID` | 客户端 ID |
| `PAYPAL_CLIENT_SECRET` | 密钥 |
| `PAYPAL_MODE` | sandbox / live |
| `PAYPAL_WEBHOOK_ID` | Webhook ID |

#### Stripe 专用

| 变量 | 说明 |
| --- | --- |
| `STRIPE_SECRET_KEY` | 密钥 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 密钥 |
| `STRIPE_PUBLISHABLE_KEY` | 公钥（前端用） |

### 15.2.8 OAuth 第三方登录

| 平台 | 变量前缀 | 必需变量 |
| --- | --- | --- |
| 微信开放平台 | `WECHAT_OPEN_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI` |
| 微信公众号 | `WECHAT_OA_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI` |
| 微信小程序 | `WECHAT_MP_` | `APP_ID`、`APP_SECRET` |
| QQ | `QQ_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI` |
| 微博 | `WEIBO_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI` |
| 支付宝 | `ALIPAY_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI`、`PRIVATE_KEY` |
| Google | `GOOGLE_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI` |
| Facebook | `FACEBOOK_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI` |
| Twitter | `TWITTER_` | `APP_ID`、`APP_SECRET`、`REDIRECT_URI` |

### 15.2.9 CORS 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CORS_ORIGINS` | — | CORS 白名单（逗号分隔） |
| `FORCE_HTTPS` | `false` | 是否强制 HTTPS |

### 15.2.10 速率限制

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `RATE_LIMIT_WINDOW` | `15` | 速率限制窗口（分钟） |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 速率限制窗口（毫秒，覆盖上面） |
| `RATE_LIMIT_MAX` | `100` | 窗口内最大请求数 |

### 15.2.11 上传配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `UPLOAD_PATH` | `./uploads` | 上传目录 |
| `UPLOAD_MAX_SIZE` | `10485760` | 最大文件大小（字节，默认 10MB） |

### 15.2.12 AI Agent 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | OpenAI API Key |
| `OPENAI_MODEL` | `gpt-4o-mini` | AI 模型 |
| `OPENAI_BASE_URL` | — | 自定义 API 端点（兼容代理） |
| `MCP_PORT` | `8080` | MCP 服务端口 |
| `AGENT_ENABLED` | `false` | AI Agent 开关 |

### 15.2.13 可观测性配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OTEL_EXPORTER_JAEGER_ENDPOINT` | — | Jaeger 导出端点 |
| `OTEL_SERVICE_NAME` | `gexm-server` | 服务名 |
| `OTEL_SERVICE_VERSION` | `1.0.0` | 服务版本 |
| `PROMETHEUS_METRICS_PATH` | `/metrics` | Prometheus 指标路径 |

---

## 15.3 后端配置入口

**文件**：[packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts)

### 15.3.1 Config 对象完整结构

```typescript
export const config = {
  // 基础
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // 数据库
  db: {
    type: process.env.DB_TYPE || 'sqlite',
    path: process.env.DB_PATH || process.env.DATABASE_PATH || './data/gexm.db',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'gexm',
    user: process.env.DB_USER || 'gexm',
    password: process.env.DB_PASSWORD || '',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    enabled: parseBool(process.env.REDIS_ENABLED, false),
  },

  // Consul
  consul: {
    enabled: parseBool(process.env.CONSUL_ENABLED, false),
    host: process.env.CONSUL_HOST || 'localhost',
    port: Number(process.env.CONSUL_PORT) || 8500,
    instances: parseList(process.env.CONSUL_INSTANCES),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'gexm',
    audience: process.env.JWT_AUDIENCE || 'gexm-client',
  },

  // CSRF
  csrf: {
    secret: process.env.CSRF_SECRET,
  },

  // PII 加密
  pii: {
    encryptionKey: process.env.PII_ENCRYPTION_KEY,
  },

  // 支付
  payment: {
    secret: process.env.PAYMENT_SECRET,
    algorithm: process.env.PAYMENT_SIGN_ALGORITHM || 'HMAC-SHA256',
    ipWhitelist: {
      enabled: parseBool(process.env.PAYMENT_IP_WHITELIST_ENABLED, false),
      ips: parseList(process.env.PAYMENT_IP_WHITELIST_IPS),
      cidr: parseList(process.env.PAYMENT_IP_WHITELIST_CIDR),
    },
    alipay: { /* ... */ },
    wechat: { /* ... */ },
    paypal: { /* ... */ },
    stripe: { /* ... */ },
  },

  // OAuth
  oauth: {
    wechatOpen: { appId, appSecret, redirectUri },
    wechatOA: { /* ... */ },
    wechatMP: { /* ... */ },
    qq: { /* ... */ },
    weibo: { /* ... */ },
    alipay: { /* ... */ },
    google: { /* ... */ },
    facebook: { /* ... */ },
    twitter: { /* ... */ },
  },

  // CORS
  cors: {
    origins: parseList(process.env.CORS_ORIGINS),
  },

  // HTTPS
  forceHttps: parseBool(process.env.FORCE_HTTPS, false),

  // 速率限制
  rateLimit: {
    window: Number(process.env.RATE_LIMIT_WINDOW) || 15,
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  },

  // 日志
  log: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maskSensitiveData: parseBool(process.env.LOG_MASK_SENSITIVE_DATA, process.env.NODE_ENV === 'production'),
  },

  // 上传
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: Number(process.env.UPLOAD_MAX_SIZE) || 10485760,
  },

  // AI Agent
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL,
  },
  mcp: {
    port: Number(process.env.MCP_PORT) || 8080,
  },
  agent: {
    enabled: parseBool(process.env.AGENT_ENABLED, false),
  },

  // OpenTelemetry
  otel: {
    jaegerEndpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME || 'gexm-server',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  },

  // Prometheus
  prometheus: {
    metricsPath: process.env.PROMETHEUS_METRICS_PATH || '/metrics',
  },
}
```

### 15.3.2 配置子模块

| 文件 | 用途 |
| --- | --- |
| [config/cache.ts](file:///f:/gexm/packages/server/src/config/cache.ts) | 缓存配置（Redis 键前缀、TTL） |
| [config/queue.ts](file:///f:/gexm/packages/server/src/config/queue.ts) | 队列配置（并发、重试） |
| [config/swagger.ts](file:///f:/gexm/packages/server/src/config/swagger.ts) | OpenAPI 文档配置 |

### 15.3.3 工具函数

```typescript
function parseBool(value: string | undefined, defaultValue: boolean): boolean
function parseList(value: string | undefined): string[]
function parseNumber(value: string | undefined, defaultValue: number): number
```

### 15.3.4 密钥强度校验

```typescript
export function validateKeys(): boolean {
  if (config.env !== 'production') return true

  const required = [
    config.jwt.secret,
    config.jwt.refreshSecret,
    config.csrf.secret,
    config.pii.encryptionKey,
    config.payment.secret,
  ]

  for (const key of required) {
    if (!key || key.length < 32) {
      throw new Error(`Insufficient key strength: ${key?.length || 0}`)
    }
  }

  return true
}
```

---

## 15.4 PC 前端配置

### 15.4.1 Vite 配置

**文件**：[packages/pc/vite.config.ts](file:///f:/gexm/packages/pc/vite.config.ts)

```typescript
export default defineConfig({
  plugins: [vue(), AutoImport(), Components({ resolvers: [ElementPlusResolver()] })],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus'],
          'echarts': ['echarts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

### 15.4.2 环境变量

PC 前端通过 `import.meta.env` 读取 Vite 环境变量：

| 变量 | 用途 |
| --- | --- |
| `VITE_API_BASE_URL` | API 基础地址（默认 `/api`） |
| `VITE_APP_TITLE` | 应用标题 |
| `VITE_APP_VERSION` | 应用版本 |

---

## 15.5 多端 App 配置

### 15.5.1 manifest.json

**文件**：[packages/app/src/manifest.json](file:///f:/gexm/packages/app/src/manifest.json)

uni-app 跨平台配置，关键节点：

| 平台 | 节点 | 关键配置 |
| --- | --- | --- |
| H5 | `h5` | `router.mode`、`publicPath`、`devServer.port` |
| 微信小程序 | `mp-weixin` | `appid`、`setting`、`usingComponents` |
| 支付宝小程序 | `mp-alipay` | `appid`、`setting` |
| 百度小程序 | `mp-baidu` | `appid`、`setting` |
| 抖音小程序 | `mp-toutiao` | `appid`、`setting` |
| 鸿蒙小程序 | `mp-harmony` | `appid`、`setting` |
| App | `app-plus` | `modules`、`distribute` |
| 鸿蒙 App | `app-harmony` | `appid`、`modules` |

### 15.5.2 pages.json

**文件**：[packages/app/src/pages.json](file:///f:/gexm/packages/app/src/pages.json)

详见 [08-app-multi-platform.md](file:///f:/gexm/docs/wiki/08-app-multi-platform.md)。

### 15.5.3 vite.config.js

**文件**：[packages/app/vite.config.js](file:///f:/gexm/packages/app/vite.config.js)

```javascript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    uni(),
    compression({ algorithm: 'gzip', ext: '.gz' }),
  ],
  server: {
    port: 8080,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
```

---

## 15.6 SDK 配置

### 15.6.1 SDKConfig 接口

**文件**：[packages/sdk/src/interfaces/ITypes.ts](file:///f:/gexm/packages/sdk/src/interfaces/ITypes.ts)

```typescript
export interface SDKConfig {
  /** 平台类型，未指定时自动检测 */
  platform?: PlatformType

  /** 网络配置 */
  network?: {
    baseURL?: string
    timeout?: number
    headers?: Record<string, string>
  }

  /** 存储配置 */
  storage?: {
    prefix?: string
    defaultTTL?: number
  }

  /** 加密配置 */
  crypto?: {
    algorithm?: 'AES-256-GCM' | 'AES-128-GCM'
    key?: string
  }

  /** 日志配置 */
  log?: {
    level?: 'debug' | 'info' | 'warn' | 'error'
    transports?: ('console' | 'file')[]
  }

  /** 调试模式 */
  debug?: boolean
}

export type PlatformType =
  | 'web'
  | 'mp-weixin'
  | 'mp-alipay'
  | 'mp-baidu'
  | 'mp-toutiao'
  | 'app-plus'
  | 'electron'
  | 'mp-harmony'
  | 'app-harmony'
```

### 15.6.2 使用示例

```typescript
GexmSDK.init({
  platform: 'mp-weixin',
  network: {
    baseURL: 'https://laal.top/api/app',
    timeout: 10000,
    headers: { 'X-App-Version': '1.0.0' },
  },
  storage: { prefix: 'gexm_', defaultTTL: 86400 },
  crypto: { algorithm: 'AES-256-GCM', key: 'xxx' },
  log: { level: 'info', transports: ['console'] },
  debug: process.env.NODE_ENV !== 'production',
})
```

---

## 15.7 桌面端配置

**文件**：[packages/desktop/.env.example](file:///f:/gexm/packages/desktop/.env.example)

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 环境 |
| `GEXM_API_URL` | `https://laal.top/api/app` | API 地址 |
| `GEXM_UPDATE_SERVER` | `https://laal.top/desktop-updates` | 自动更新服务器 |
| `GEXM_REPORT_ERRORS` | `true` | 错误上报 |

---

## 15.8 WordPress 主题配置

### 15.8.1 主题元信息

**文件**：[wp-content/themes/mixm-laal/style.css](file:///f:/gexm/wp-content/themes/mixm-laal/style.css)

```css
/*
Theme Name: MixM Laal
Theme URI: https://laal.top/
Author: Gexm Team
Description: 全平台应用系统主题
Version: 1.0.0
License: GPL v2 or later
Text Domain: mixm-laal
Domain Path: /languages
*/
```

### 15.8.2 主题 Customizer

通过 WordPress 后台「外观 → 自定义」配置：

| 选项 | 用途 |
| --- | --- |
| 主色 | 主题主色调 |
| 文字色 | 正文文字颜色 |
| 背景色 | 页面背景色 |
| 标题字体 | h1-h6 字体 |
| 正文字体 | body 字体 |
| 是否显示侧边栏 | 布局开关 |
| 页脚列数 | 1/2/3/4 列 |

### 15.8.3 主题同步配置

通过 `admin/theme-sync.php` 暴露 AJAX 接口：

```php
add_action('wp_ajax_mixm_laal_sync_status', 'mixm_laal_sync_status_handler')
add_action('wp_ajax_nopriv_mixm_laal_sync_status', 'mixm_laal_sync_status_handler')
```

---

## 15.9 Docker Compose 环境变量

**文件**：[docker-compose.yml](file:///f:/gexm/docker-compose.yml)

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 环境 |
| `SERVER_PORT` | `3000` | 服务端端口映射 |
| `APP_PORT` | `80` | App H5 端口映射 |
| `PC_PORT` | `8080` | PC 端口映射 |
| `REDIS_PORT` | `6379` | Redis 端口映射 |
| `POSTGRES_PORT` | `5432` | PostgreSQL 端口映射 |
| `EXPOSE_DB_PORTS` | `true` | 是否暴露数据库端口（生产设 false） |
| `DB_TYPE` | `sqlite` | 数据库类型 |
| `DB_PATH` | `/app/packages/server/data/gexm.db` | SQLite 容器内路径 |
| `REDIS_URL` | `redis://redis:6379` | Redis 连接 |
| `POSTGRES_URL` | `postgres://gexm:gexm_password@postgres:5432/gexm` | PostgreSQL 连接 |
| `POSTGRES_DB` | `gexm` | PostgreSQL 数据库名 |
| `POSTGRES_USER` | `gexm` | PostgreSQL 用户 |
| `POSTGRES_PASSWORD` | `gexm_password` | PostgreSQL 密码 |
| `JWT_SECRET` | `your-secret-key-change-in-production` | JWT 密钥（生产强制修改） |
| `LOG_LEVEL` | `info` | 日志级别 |
| `API_BASE_URL` | `http://server:3000` | 容器间调用地址 |
| `WP_PORT` | `8081` | WordPress 端口映射 |
| `WP_DB_NAME` | `wordpress` | WordPress 数据库 |
| `WP_DB_USER` | `wordpress` | WordPress 数据库用户 |
| `WP_DB_PASSWORD` | — | WordPress 数据库密码 |
| `MYSQL_ROOT_PASSWORD` | — | MySQL root 密码 |

---

## 15.10 环境变量优先级

按以下顺序读取（后者覆盖前者）：

1. 系统环境变量
2. `.env.production` / `.env.staging` / `.env.development`（按 `NODE_ENV`）
3. `.env.local`（个人开发覆盖，gitignore）
4. `.env`（项目默认）
5. 代码内默认值

---

## 15.11 密钥管理最佳实践

### 15.11.1 本地开发

```bash
# 复制示例
cp packages/server/.env.example packages/server/.env

# 生成开发密钥
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> packages/server/.env
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> packages/server/.env
node -e "console.log('CSRF_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> packages/server/.env
node -e "console.log('PII_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))" >> packages/server/.env
node -e "console.log('PAYMENT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> packages/server/.env
```

### 15.11.2 生产环境

- 使用密钥管理服务（如 HashiCorp Vault、AWS Secrets Manager、阿里云 KMS）
- 通过 `EnvironmentFile` 注入 systemd 服务
- 定期轮换密钥（建议每 90 天）
- 不同环境使用不同密钥

### 15.11.3 .gitignore 配置

```
# 环境变量
.env
.env.local
.env.*.local
.env.production
.env.staging

# 密钥与证书
certs/
PEM_Privatekey/
*.pfx
*.jks
*.pem
*.key

# 数据库
*.sql
*.dump
*.bak

# 日志
*.log

# 脚本（敏感）
*.ps1
*.sh
*.bat
```

---

## 15.12 参考文档

- [packages/server/.env.example](file:///f:/gexm/packages/server/.env.example) — 后端环境变量示例
- [packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts) — 后端配置入口
- [packages/server/src/config/cache.ts](file:///f:/gexm/packages/server/src/config/cache.ts) — 缓存配置
- [packages/server/src/config/queue.ts](file:///f:/gexm/packages/server/src/config/queue.ts) — 队列配置
- [packages/server/src/config/swagger.ts](file:///f:/gexm/packages/server/src/config/swagger.ts) — Swagger 配置
- [packages/app/src/manifest.json](file:///f:/gexm/packages/app/src/manifest.json) — uni-app 平台配置
- [packages/app/src/pages.json](file:///f:/gexm/packages/app/src/pages.json) — uni-app 页面配置
- [packages/sdk/src/interfaces/ITypes.ts](file:///f:/gexm/packages/sdk/src/interfaces/ITypes.ts) — SDK 配置类型
- [packages/desktop/.env.example](file:///f:/gexm/packages/desktop/.env.example) — 桌面端环境变量
- [docker-compose.yml](file:///f:/gexm/docker-compose.yml) — Docker Compose
