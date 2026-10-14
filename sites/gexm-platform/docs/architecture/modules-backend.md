# GEXM 后端模块分析文档

## 目录

1. [项目概览](#1-项目概览)
2. [核心基础设施模块](#2-核心基础设施模块)
3. [业务模块分析](#3-业务模块分析)
4. [模块间依赖关系图](#4-模块间依赖关系图)
5. [错误码体系](#5-错误码体系)

---

## 1. 项目概览

### 1.1 技术栈

| 技术/库 | 用途 | 版本/说明 |
|--------|------|----------|
| Express.js | Web 应用框架 | 核心 HTTP 服务框架 |
| better-sqlite3 | 数据库 | 同步 SQLite 驱动，高性能 |
| JSON Web Token (JWT) | 身份认证 | 双 Token 机制（Access + Refresh） |
| bcryptjs | 密码加密 | 密码哈希存储与验证 |
| helmet | 安全头 | HTTP 安全响应头 |
| cors | 跨域资源共享 | 支持凭证的跨域请求 |
| express-rate-limit | 请求限流 | 多维度限流策略 |
| winston | 日志系统 | 多传输日志记录 |
| multer | 文件上传 | 处理 multipart/form-data |
| uuid | 唯一 ID 生成 | v4 版本 UUID |
| dotenv | 环境变量 | .env 文件配置加载 |

### 1.2 架构模式

项目采用 **MVC (Model-View-Controller)** 架构模式：

- **Model 层** (`src/models/`)：数据访问层，封装数据库操作
- **Controller 层** (`src/controllers/`)：业务逻辑层，处理请求参数校验与业务编排
- **Route 层** (`src/routes/`)：路由配置层，定义 API 端点与中间件绑定
- **Middleware 层** (`src/middleware/`)：横切关注点（认证、安全、限流、日志等）
- **Service 层** (`src/services/`)：复杂业务服务（如订单服务）
- **Utils 层** (`src/utils/`)：通用工具函数
- **Config 层** (`src/config/`)：配置管理
- **Constants 层** (`src/constants/`)：常量定义（错误码等）

### 1.3 中间件体系

中间件执行顺序（从外到内）：

```
请求 → helmet → CORS → bodyParser → cookieParser
     → requestLogger → forceHttps → securityHeaders
     → xssFilter → sanitizeInput → csrfToken
     → apiLimiter(/api/前缀) → 路由层
     → authMiddleware → adminMiddleware → Controller
     ↓
响应 ← errorHandler ← notFoundHandler
```

### 1.4 项目目录结构

```
src/
├── app.js                    # 应用入口与中间件配置
├── server.js                 # 服务器启动
├── websocket.js              # WebSocket 支持
├── config/
│   └── index.js              # 配置管理
├── constants/
│   └── errorCodes.js         # 错误码定义
├── controllers/              # 控制器层（22个）
│   ├── authController.js
│   ├── userController.js
│   ├── productController.js
│   ├── categoryController.js
│   ├── cartController.js
│   ├── favoriteController.js
│   ├── orderController.js
│   ├── paymentController.js
│   ├── reviewController.js
│   ├── searchController.js
│   ├── addressController.js
│   ├── notificationController.js
│   ├── chatController.js
│   ├── uploadController.js
│   ├── couponController.js
│   ├── memberController.js
│   ├── flashSaleController.js
│   ├── checkinController.js
│   ├── inboxController.js
│   ├── shippingController.js
│   ├── adminController.js
│   ├── errorLogController.js
│   ├── reconciliationController.js
│   └── syncController.js
├── middleware/               # 中间件层
│   ├── auth.js               # 认证中间件
│   ├── security.js           # 安全中间件
│   ├── csrfConfig.js         # CSRF 配置
│   ├── rateLimiter.js        # 限流中间件
│   ├── errorHandler.js       # 错误处理
│   └── requestLogger.js      # 请求日志
├── models/                   # 模型层
│   ├── index.js              # 数据库初始化与表结构
│   ├── userModel.js
│   ├── productModel.js
│   ├── categoryModel.js
│   ├── cartModel.js
│   ├── favoriteModel.js
│   ├── orderModel.js
│   ├── paymentModel.js
│   ├── reviewModel.js
│   ├── searchModel.js
│   ├── addressModel.js
│   ├── notificationModel.js
│   ├── chatModel.js
│   ├── couponModel.js (内存)
│   ├── memberModel.js (内存)
│   ├── flashSaleModel.js (内存)
│   ├── checkinModel.js (内存)
│   ├── inboxModel.js (内存)
│   ├── shippingModel.js (内存)
│   ├── errorLogModel.js
│   ├── syncModel.js
│   └── ...
├── routes/                   # 路由层（22个）
│   └── *.js
├── services/                 # 服务层
│   └── orderService.js       # 订单服务
└── utils/                    # 工具层
    ├── response.js           # 响应工具
    └── logger.js             # 日志系统
```

---

## 2. 核心基础设施模块

### 2.1 app.js - 应用入口与中间件配置

**文件路径**: `src/app.js`

#### 功能描述
Express 应用的主入口文件，负责：
- 初始化数据库连接
- 配置全局中间件（安全、解析、日志、限流等）
- 挂载所有业务路由
- 配置错误处理中间件
- 生产环境安全检查（JWT 密钥强度校验）

#### 关键组件

| 组件 | 作用 | 行号范围 |
|------|------|---------|
| `initDatabase()` | 初始化数据库 | 第 35 行 |
| JWT 安全检查 | 生产环境强制强密钥 | 第 37-67 行 |
| helmet 配置 | 安全响应头 | 第 69-72 行 |
| CORS 配置 | 跨域支持 | 第 74-91 行 |
| 请求体解析 | JSON/URL编码，10MB 限制 | 第 93-95 行 |
| 安全中间件链 | XSS/CSRF/输入净化等 | 第 99-104 行 |
| 全局 API 限流 | `/api/` 前缀路径 | 第 107 行 |
| 静态资源服务 | `/uploads` 目录 | 第 109 行 |
| 健康检查接口 | `/api/health` | 第 111-121 行 |
| 路由挂载 | 22 个业务模块路由 | 第 124-147 行 |
| 错误处理 | 404 + 全局错误 | 第 149-150 行 |

#### 配置要求
- 生产环境必须设置 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`，且长度 ≥ 32 字符
- `CORS_ORIGINS` 环境变量配置允许的跨域源（逗号分隔）
- `NODE_ENV` 决定运行环境

#### 集成点
- 所有路由通过 `app.use('/api/xxx', ...)` 挂载
- CSRF 中间件按路由组分别应用
- 管理后台路由 `/api/admin` 独立配置

---

### 2.2 config/index.js - 配置管理

**文件路径**: `src/config/index.js`

#### 功能描述
集中管理应用配置，从环境变量读取并提供默认值。

#### 配置项清单

| 配置组 | 配置项 | 默认值 | 说明 |
|--------|--------|--------|------|
| 基础 | `port` | 3000 | 服务端口 |
| 基础 | `env` | 'development' | 运行环境 |
| JWT | `jwt.secret` | 'gexm_jwt_secret_key_2024' | Access Token 密钥 |
| JWT | `jwt.expiresIn` | '24h' | Access Token 有效期 |
| JWT | `jwt.refreshSecret` | 'gexm_refresh_secret_key_2024' | Refresh Token 密钥 |
| JWT | `jwt.refreshExpiresIn` | '7d' | Refresh Token 有效期 |
| 安全 | `security.forceHttps` | false | 是否强制 HTTPS |
| 安全 | `security.corsOrigins` | [] | 允许的跨域源 |
| 数据库 | `database.path` | './data/gexm.db' | SQLite 数据库路径 |
| 上传 | `upload.path` | './uploads' | 上传文件目录 |
| 上传 | `upload.maxSize` | 10MB | 最大上传大小 |
| 限流 | `rateLimit.windowMs` | 15分钟 | 限流时间窗口 |
| 限流 | `rateLimit.max` | 100 | 窗口内最大请求数 |
| 支付 | `payment.secret` | 'gexm_payment_secret_key_2024' | 支付签名密钥 |
| 支付 | `payment.notifyUrl` | '' | 支付回调地址 |
| 日志 | `logging.level` | 'info' | 日志级别 |
| 日志 | `logging.file` | './logs/app.log' | 日志文件路径 |

#### 依赖关系
- 依赖 `dotenv` 加载 `.env` 文件

#### 使用示例
```javascript
const config = require('./config');
console.log(config.jwt.secret); // 访问 JWT 密钥
```

---

### 2.3 middleware/auth.js - 认证中间件

**文件路径**: `src/middleware/auth.js`

#### 功能描述
提供用户认证与权限校验中间件，支持三种认证模式。

#### 关键函数

| 函数 | 功能 | 参数 | 输出 |
|------|------|------|------|
| `authMiddleware` | 强制认证中间件 | req, res, next | 向 req 注入 user、userId |
| `adminMiddleware` | 管理员权限校验 | req, res, next | 校验 req.user.role === 'admin' |
| `optionalAuthMiddleware` | 可选认证中间件 | req, res, next | 有 token 则注入用户，无则继续 |

#### 认证流程
1. 从 `Authorization: Bearer <token>` 头部提取 Token
2. 使用 `jwt.verify()` 验证 Token 有效性
3. 从数据库查找用户，验证用户状态为 `active`
4. 将用户信息（脱敏后）注入 `req.user`，用户 ID 注入 `req.userId`

#### Token 错误处理
- 缺少 Token → 错误码 1002（401）
- Token 过期 → 错误码 1007（401）
- Token 无效 → 错误码 1008（401）
- 用户不存在 → 错误码 1002（401）
- 用户被禁用 → 错误码 1003（403）

#### 依赖关系
- 依赖 `jsonwebtoken` 库
- 依赖 `config` 获取 JWT 密钥
- 依赖 `userModel` 查询用户信息
- 依赖 `utils/response` 返回错误响应

#### 别名导出
```javascript
module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  verifyToken: authMiddleware,    // 别名
  verifyAdmin: adminMiddleware,    // 别名
};
```

---

### 2.4 middleware/security.js - 安全中间件

**文件路径**: `src/middleware/security.js`

#### 功能描述
提供全面的 Web 安全防护中间件，包括 XSS 过滤、CSRF 防护、安全头、输入净化等。

#### 关键组件

| 组件 | 类型 | 功能 |
|------|------|------|
| `xssFilterMiddleware` | 中间件 | XSS 攻击过滤 |
| `csrfTokenMiddleware` | 中间件 | CSRF Token 生成与 Cookie 设置 |
| `csrfProtectionMiddleware` | 中间件 | CSRF Token 验证 |
| `securityHeadersMiddleware` | 中间件 | 安全响应头设置 |
| `forceHttpsMiddleware` | 中间件 | 生产环境强制 HTTPS 重定向 |
| `sanitizeInputMiddleware` | 中间件 | 输入长度与深度限制 |
| `sanitizeString` | 工具函数 | 字符串 XSS 过滤 |
| `generateCsrfToken` | 工具函数 | 生成 32 位 CSRF Token |

#### XSS 过滤规则
过滤以下危险内容：
- `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<form>` 标签
- `javascript:`, `vbscript:`, `data:text/html`, `data:image/svg+xml` 协议
- `on*` 事件处理器（onclick, onerror 等）
- `<style>`, `<base>`, `<link>`, `<meta>` 标签

#### CSRF 防护机制
- **Token 生成**: 32 字符随机字符串，存储在 Cookie `csrf-token` 中
- **Token 验证**: 非 GET/HEAD/OPTIONS 请求需在 `X-CSRF-Token` 头部携带相同 Token
- **Cookie 属性**: `sameSite: strict`，生产环境 `secure: true`，有效期 24 小时

#### 安全响应头
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy`（CSP）
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`（地理位置、麦克风、摄像头禁用）

#### 输入净化限制
- 最大字符串长度：10,000 字符
- 最大数组长度：100 项
- 最大对象嵌套深度：5 层

#### 依赖关系
- 依赖 `crypto` 模块生成 CSRF Token
- 依赖 `utils/logger` 记录安全警告

---

### 2.5 middleware/rateLimiter.js - 限流中间件

**文件路径**: `src/middleware/rateLimiter.js`

#### 功能描述
基于 `express-rate-limit` 提供多维度请求限流，防止暴力破解、API 滥用和消息轰炸。

#### 限流策略清单

| 限流器 | 适用场景 | 时间窗口 | 最大请求数 | 错误码 |
|--------|---------|---------|-----------|--------|
| `apiLimiter` | 全局 API | 1 分钟 | 60 次 | 1020 |
| `loginLimiter` | 登录接口 | 5 分钟 | 5 次 | 1021 |
| `registerLimiter` | 注册接口 | 1 小时 | 3 次 | 1022 |
| `messageLimiter` | 消息发送 | 1 分钟 | 20 条 | 1023 |
| `uploadLimiter` | 文件上传 | 1 分钟 | 5 次 | 1024 |

#### 响应格式
```json
{
  "code": 1020,
  "message": "请求过于频繁，请稍后再试",
  "data": null,
  "timestamp": 1234567890
}
```

#### 依赖关系
- 依赖 `express-rate-limit` 库
- 依赖 `utils/logger` 记录限流警告

#### 使用方式
```javascript
// 路由级别的限流
router.post('/login', loginLimiter, authController.login);

// 全局 API 限流（在 app.js 中应用）
app.use('/api/', apiLimiter);
```

---

### 2.6 middleware/errorHandler.js - 错误处理

**文件路径**: `src/middleware/errorHandler.js`

#### 功能描述
全局错误处理中间件，捕获未处理异常并返回统一格式的错误响应。

#### 关键函数

| 函数 | 功能 |
|------|------|
| `errorHandler` | 全局错误处理中间件（4 参数） |
| `notFoundHandler` | 404 未找到处理中间件 |

#### 错误处理逻辑
1. 记录错误日志（错误信息、堆栈、请求 URL、方法、IP）
2. 特殊错误类型处理：
   - `entity.too.large` → 文件过大（413，错误码 1001）
3. 默认返回：服务器内部错误（500，错误码 1005）

#### 依赖关系
- 依赖 `utils/logger` 记录错误日志
- 依赖 `utils/response` 返回错误响应

---

### 2.7 middleware/requestLogger.js - 请求日志

**文件路径**: `src/middleware/requestLogger.js`

#### 功能描述
记录所有 HTTP 请求的访问日志，包括方法、URL、状态码、响应时间和客户端 IP。

#### 日志级别
- 状态码 ≥ 500 → `error` 级别
- 状态码 ≥ 400 → `warn` 级别
- 其他 → `info` 级别

#### 日志字段
- `method`: HTTP 方法
- `url`: 请求路径
- `statusCode`: 响应状态码
- `duration`: 响应耗时（毫秒）
- `ip`: 客户端 IP
- `userAgent`: 用户代理

#### 实现原理
监听 `res.on('finish')` 事件，在响应完成时记录日志。

#### 依赖关系
- 依赖 `utils/logger` 输出日志

---

### 2.8 utils/response.js - 响应工具

**文件路径**: `src/utils/response.js`

#### 功能描述
提供统一的响应格式工具函数，确保所有 API 响应结构一致。

#### 统一响应格式

**成功响应**:
```json
{
  "code": 0,
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1234567890,
  "requestId": "uuid-v4"
}
```

**错误响应**:
```json
{
  "code": 1001,
  "message": "参数错误",
  "data": null,
  "timestamp": 1234567890,
  "requestId": "uuid-v4"
}
```

#### 关键函数

| 函数 | 功能 | 参数 |
|------|------|------|
| `generateId()` | 生成 UUID v4 | 无 |
| `successResponse(res, data, message, code, statusCode)` | 成功响应 | data 默认 null，code 默认 0 |
| `errorResponse(res, message, code, statusCode)` | 错误响应 | code 默认 1000，statusCode 默认 400 |
| `unifiedErrorResponse(res, errorDef, overrideCode, overrideStatus)` | 统一错误响应 | 支持错误码对象/数字/消息 |
| `authError(res, errorDef)` | 认证错误快捷函数 | - |
| `businessError(res, errorDef)` | 业务错误快捷函数 | - |
| `resourceError(res, errorDef)` | 资源错误快捷函数 | - |
| `paginate(data, total, page, pageSize)` | 分页数据封装 | - |
| `paginateMeta(total, page, pageSize)` | 分页元数据 | - |

#### 分页响应格式
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

#### 依赖关系
- 依赖 `uuid` 库生成 requestId
- 依赖 `constants/errorCodes` 获取错误码详情

---

### 2.9 utils/logger.js - 日志系统

**文件路径**: `src/utils/logger.js`

#### 功能描述
基于 Winston 的日志系统，支持多传输通道和结构化日志。

#### 日志传输通道

| 传输方式 | 级别 | 说明 |
|---------|------|------|
| File (app.log) | info 及以上 | 主日志文件，5MB/文件，最多5个 |
| File (app-error.log) | error | 仅错误日志 |
| Console | - | 开发环境启用，彩色输出 |

#### 日志格式
- 文件输出：JSON 格式（含 timestamp、service、stack）
- 控制台输出：格式化文本（带颜色）

#### 配置项
- `config.logging.level`: 日志级别
- `config.logging.file`: 日志文件路径
- `config.env`: 非生产环境启用控制台输出

#### 使用示例
```javascript
const logger = require('./utils/logger');
logger.info('User logged in: %s', username, { userId: user.id });
logger.error('Database error:', err);
logger.warn('Rate limit exceeded for IP: %s', req.ip);
```

---

### 2.10 models/index.js - 数据库初始化与表结构

**文件路径**: `src/models/index.js`

#### 功能描述
数据库初始化入口，负责：
- 创建 SQLite 数据库连接
- 配置数据库性能参数（WAL 模式、外键、缓存等）
- 创建所有数据表和索引
- 初始化默认数据（分类、商品等）
- 提供数据库实例访问接口

#### 数据库性能配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| journal_mode | WAL | 写前日志，提升并发性能 |
| foreign_keys | ON | 启用外键约束 |
| synchronous | NORMAL | 平衡安全性与性能 |
| cache_size | -64000 | 64MB 页缓存 |
| temp_store | MEMORY | 临时表存储在内存 |
| mmap_size | 268435456 | 256MB 内存映射 |

#### 数据库表清单

| 表名 | 用途 | 索引 |
|------|------|------|
| `users` | 用户表 | username, email |
| `refresh_tokens` | 刷新令牌表 | - |
| `notifications` | 通知表 | user_id, read |
| `files` | 文件表 | - |
| `sync_records` | 同步记录表 | user_id |
| `error_logs` | 错误日志表 | created_at |
| `conversations` | 会话表 | creator_id, participant_id |
| `messages` | 消息表 | conversation_id, created_at |
| `comments` | 评论/留言表 | target_type+target_id, parent_id |
| `conversation_reads` | 会话阅读状态表 | user_id, conversation_id |
| `categories` | 分类表 | - |
| `products` | 商品表 | - |
| `product_skus` | 商品 SKU 表 | - |
| `carts` | 购物车表 | - |
| `favorites` | 收藏表 | - |
| `addresses` | 地址表 | - |
| `orders` | 订单表 | - |
| `order_items` | 订单项表 | - |
| `order_logistics` | 订单物流表 | - |
| `order_refunds` | 订单退款表 | - |
| `payments` | 支付记录表 | - |
| `reviews` | 评价表 | - |
| `search_history` | 搜索历史表 | - |
| `stock_logs` | 库存变动日志表 | - |

#### 关键函数

| 函数 | 功能 |
|------|------|
| `initDatabase()` | 初始化数据库（建表 + 初始化数据） |
| `createTables()` | 创建所有数据表和索引 |
| `initDefaultData()` | 初始化默认分类和商品数据 |
| `getDb()` | 获取数据库单例 |

#### 默认数据
- 7 个商品分类（手机数码、服装鞋包、美妆护肤、食品生鲜、家居生活、运动户外、图书音像）
- 8 个示例商品（含 SKU 数据）

#### 依赖关系
- 依赖 `better-sqlite3` 库
- 依赖 `config` 获取数据库路径
- 依赖 `utils/logger` 记录初始化日志

---

## 3. 业务模块分析

### 3.1 认证模块 (auth)

**文件路径**: 
- Controller: `src/controllers/authController.js`
- Route: `src/routes/auth.js`
- Model: `src/models/userModel.js`

#### 功能描述
用户认证与账户管理，支持登录、注册、Token 刷新、退出登录、个人资料管理和密码修改。

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 | 限流 |
|------|------|------|------|------|
| POST | `/api/auth/login` | 用户登录 | 否 | loginLimiter (5次/5分钟) |
| POST | `/api/auth/register` | 用户注册 | 否 | registerLimiter (3次/小时) |
| POST | `/api/auth/refresh` | 刷新 Token | 否 | - |
| POST | `/api/auth/logout` | 退出登录 | 是 | - |
| GET | `/api/auth/profile` | 获取个人资料 | 是 | - |
| PUT | `/api/auth/profile` | 更新个人资料 | 是 | - |
| PUT | `/api/auth/password` | 修改密码 | 是 | - |

#### 核心方法说明

**login** - 用户登录
- 输入：`username` (用户名或邮箱), `password`
- 验证：用户存在 + 状态 active + 密码匹配
- 输出：`accessToken`, `refreshToken`, `user`, `expiresIn`

**register** - 用户注册
- 输入：`username`, `email`, `password`, `nickname?`, `phone?`
- 校验规则：
  - 用户名长度 3-20 字符
  - 密码长度 ≥ 8 位，必须包含字母和数字
  - 邮箱格式验证
  - 用户名/邮箱唯一性校验
- 密码使用 bcryptjs 哈希（salt rounds = 10）

**refreshToken** - Token 刷新
- 输入：`refreshToken`
- 验证 Refresh Token 有效性和数据库记录
- 吊销旧 Token，生成新的双 Token

#### 依赖的其他模块
- `userModel`: 用户数据操作、密码验证、Token 生成

#### 配置项
- `config.jwt.secret`: Access Token 签名密钥
- `config.jwt.expiresIn`: Access Token 有效期
- `config.jwt.refreshSecret`: Refresh Token 签名密钥
- `config.jwt.refreshExpiresIn`: Refresh Token 有效期

---

### 3.2 用户模块 (users)

**文件路径**:
- Controller: `src/controllers/userController.js`
- Route: `src/routes/users.js`
- Model: `src/models/userModel.js`

#### 功能描述
管理员用户管理功能，提供用户的 CRUD 操作。仅管理员可访问。

#### 数据库表结构
**users 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 用户 ID (UUID) |
| username | TEXT UNIQUE | 用户名 |
| email | TEXT UNIQUE | 邮箱 |
| password | TEXT | 密码哈希 |
| nickname | TEXT | 昵称 |
| avatar | TEXT | 头像 URL |
| phone | TEXT | 手机号 |
| status | TEXT | 状态 (active/disabled) |
| role | TEXT | 角色 (user/admin) |
| balance | REAL | 账户余额 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |
| last_login_at | TEXT | 最后登录时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/users` | 用户列表（分页+搜索） | 管理员 |
| GET | `/api/users/:id` | 用户详情 | 管理员 |
| POST | `/api/users` | 创建用户 | 管理员 |
| PUT | `/api/users/:id` | 更新用户 | 管理员 |
| DELETE | `/api/users/:id` | 删除用户 | 管理员 |

#### 核心方法说明

**findAll** - 分页查询用户
- 支持按用户名、昵称、邮箱模糊搜索
- 返回脱敏用户列表（不含密码）

**updateBalance / deductBalance / rechargeBalance** - 余额操作
- `updateBalance(userId, amount)`: 增加/减少余额
- `deductBalance(userId, amount)`: 扣除余额（带余额充足校验）
- `rechargeBalance(userId, amount)`: 充值余额（updateBalance 别名）

**sanitizeUser** - 用户信息脱敏
- 移除 password 字段后返回

#### 被哪些模块依赖
- `authMiddleware`: 认证时查询用户
- `authController`: 登录/注册/资料管理
- `paymentController`: 支付时扣除余额
- `memberController`: 会员积分与余额

#### 已知限制
- 删除用户时不能删除自己
- 用户名和邮箱有唯一性约束

---

### 3.3 商品模块 (products)

**文件路径**:
- Controller: `src/controllers/productController.js`
- Route: `src/routes/products.js`
- Model: `src/models/productModel.js`

#### 功能描述
商品管理，包括商品列表、详情、SKU 管理、库存管理等。

#### 数据库表结构
**products 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 商品 ID |
| name | TEXT | 商品名称 |
| subtitle | TEXT | 副标题 |
| category_id | TEXT | 分类 ID |
| main_image | TEXT | 主图 URL |
| images | TEXT | 图片 JSON 数组 |
| price | REAL | 售价 |
| original_price | REAL | 原价 |
| stock | INTEGER | 总库存 |
| sales | INTEGER | 销量 |
| description | TEXT | 商品描述 |
| status | TEXT | 状态 (on_sale/off_shelf) |
| sort_order | INTEGER | 排序值 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**product_skus 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | SKU ID |
| product_id | TEXT | 商品 ID |
| sku_name | TEXT | SKU 名称 |
| specs | TEXT | 规格 JSON |
| price | REAL | SKU 价格 |
| original_price | REAL | SKU 原价 |
| stock | INTEGER | SKU 库存 |
| sku_image | TEXT | SKU 图片 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**stock_logs 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 日志 ID |
| product_id | TEXT | 商品 ID |
| sku_id | TEXT | SKU ID |
| change_type | TEXT | 变动类型 |
| change_amount | INTEGER | 变动数量 |
| before_stock | INTEGER | 变动前库存 |
| after_stock | INTEGER | 变动后库存 |
| remark | TEXT | 备注 |
| operator_id | TEXT | 操作人 ID |
| created_at | TEXT | 创建时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/products` | 商品列表 | 公开 |
| GET | `/api/products/:id` | 商品详情 | 公开 |
| GET | `/api/products/:id/skus` | 商品 SKU 列表 | 公开 |
| POST | `/api/products` | 创建商品 | 管理员 |
| PUT | `/api/products/:id` | 更新商品 | 管理员 |
| DELETE | `/api/products/:id` | 删除商品 | 管理员 |
| PATCH | `/api/products/:id/status` | 更新商品状态 | 管理员 |
| PATCH | `/api/products/:id/stock` | 调整库存 | 管理员 |
| GET | `/api/products/:id/stock-logs` | 库存变动日志 | 管理员 |
| GET | `/api/products/low-stock/list` | 低库存商品列表 | 管理员 |

#### 核心方法说明
- `findAll({ page, pageSize, categoryId, keyword, status })`: 分页查询商品
- `getDetail(id)`: 获取商品详情（含 SKU 列表）
- `adjustStock(productId, skuId, amount, changeType, operatorId, remark)`: 库存调整（记录日志）

#### 依赖的其他模块
- `categoryModel`: 分类关联查询

#### 被哪些模块依赖
- `categoryController`: 分类下商品查询
- `cartModel`: 购物车关联商品信息
- `orderService`: 下单时库存扣减
- `searchController`: 搜索商品
- `adminController`: 管理后台商品管理
- `reviewController`: 商品评价关联

#### 已知限制
- 商品图片以 JSON 字符串形式存储
- 库存管理包含商品总库存和 SKU 库存两级

---

### 3.4 分类模块 (categories)

**文件路径**:
- Controller: `src/controllers/categoryController.js`
- Route: `src/routes/categories.js`
- Model: `src/models/categoryModel.js`

#### 功能描述
商品分类管理，支持多级分类树结构。

#### 数据库表结构
**categories 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 分类 ID |
| name | TEXT | 分类名称 |
| parent_id | TEXT | 父分类 ID（顶级为 NULL） |
| level | INTEGER | 层级（1=一级） |
| icon | TEXT | 分类图标 |
| sort_order | INTEGER | 排序值 |
| status | TEXT | 状态 (active/inactive) |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/categories` | 分类树 | 公开 |
| GET | `/api/categories/:id/products` | 分类下商品 | 公开 |
| GET | `/api/categories/:id/path` | 分类路径 | 公开 |
| POST | `/api/categories` | 创建分类 | 管理员 |
| PUT | `/api/categories/:id` | 更新分类 | 管理员 |
| DELETE | `/api/categories/:id` | 删除分类 | 管理员 |
| PATCH | `/api/categories/:id/sort` | 更新排序 | 管理员 |
| POST | `/api/categories/batch/sort` | 批量排序 | 管理员 |

#### 核心方法说明
- `findTree()`: 递归构建分类树结构
- `findByParentId(parentId)`: 查询子分类列表

#### 依赖的其他模块
- `productModel`: 查询分类下的商品

#### 被哪些模块依赖
- `productController`: 商品分类关联
- `adminController`: 管理后台分类管理

---

### 3.5 购物车模块 (cart)

**文件路径**:
- Controller: `src/controllers/cartController.js`
- Route: `src/routes/cart.js`
- Model: `src/models/cartModel.js`

#### 功能描述
购物车管理，支持添加、修改数量、删除、批量操作、选择状态等。

#### 数据库表结构
**carts 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 购物车项 ID |
| user_id | TEXT | 用户 ID |
| product_id | TEXT | 商品 ID |
| sku_id | TEXT | SKU ID |
| quantity | INTEGER | 数量 |
| selected | INTEGER | 是否选中 (0/1) |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/cart` | 购物车列表 | 是 |
| GET | `/api/cart/count` | 购物车商品数量 | 是 |
| POST | `/ | 添加到购物车 | 是 |
| PUT | `/api/cart/:id` | 更新数量 | 是 |
| DELETE | `/api/cart/:id` | 删除单项 | 是 |
| DELETE | `/api/cart` | 批量删除 | 是 |
| PATCH | `/api/cart/select` | 更新选中状态 | 是 |

#### 核心方法说明
- `findByUserId(userId)`: 查询用户购物车（关联商品和 SKU 信息）
- `findByUserAndSku(userId, productId, skuId)`: 查找已存在的购物车项
- `incrementQuantity(id, qty)`: 增加数量（已存在时）

#### 依赖的其他模块
- `productModel`: 关联商品信息
- 被 `orderController.previewOrder` 使用

---

### 3.6 收藏模块 (favorites)

**文件路径**:
- Controller: `src/controllers/favoriteController.js`
- Route: `src/routes/favorites.js`
- Model: `src/models/favoriteModel.js`

#### 功能描述
商品收藏功能，用户可以收藏/取消收藏商品。

#### 数据库表结构
**favorites 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 收藏 ID |
| user_id | TEXT | 用户 ID |
| product_id | TEXT | 商品 ID |
| created_at | TEXT | 创建时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/favorites` | 收藏列表 | 是 |
| GET | `/api/favorites/check/:productId` | 检查是否收藏 | 是 |
| POST | `/api/favorites` | 添加收藏 | 是 |
| DELETE | `/api/favorites/:productId` | 取消收藏 | 是 |
| DELETE | `/api/favorites` | 批量取消 | 是 |

---

### 3.7 订单模块 (orders) + orderService

**文件路径**:
- Controller: `src/controllers/orderController.js`
- Route: `src/routes/orders.js`
- Model: `src/models/orderModel.js`
- Service: `src/services/orderService.js`

#### 功能描述
订单管理，包括订单创建、预览、查询、取消、确认收货、退款申请等。

#### 数据库表结构
**orders 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 订单 ID |
| order_no | TEXT | 订单号 |
| user_id | TEXT | 用户 ID |
| total_amount | REAL | 商品总金额 |
| shipping_fee | REAL | 运费 |
| discount_amount | REAL | 优惠金额 |
| coupon_id | TEXT | 优惠券 ID |
| pay_amount | REAL | 实付金额 |
| status | TEXT | 订单状态 |
| pay_method | TEXT | 支付方式 |
| pay_time | TEXT | 支付时间 |
| address_id | TEXT | 地址 ID |
| address_snapshot | TEXT | 地址快照 JSON |
| remark | TEXT | 订单备注 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**order_items 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 订单项 ID |
| order_id | TEXT | 订单 ID |
| product_id | TEXT | 商品 ID |
| sku_id | TEXT | SKU ID |
| product_name | TEXT | 商品名称快照 |
| sku_name | TEXT | SKU 名称快照 |
| product_image | TEXT | 商品图片快照 |
| price | REAL | 单价快照 |
| quantity | INTEGER | 数量 |
| subtotal | REAL | 小计 |
| created_at | TEXT | 创建时间 |

**order_logistics 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 物流 ID |
| order_id | TEXT | 订单 ID |
| company | TEXT | 物流公司 |
| tracking_no | TEXT | 物流单号 |
| status | TEXT | 物流状态 |
| details | TEXT | 物流详情 JSON |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**order_refunds 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 退款 ID |
| order_id | TEXT | 订单 ID |
| user_id | TEXT | 用户 ID |
| amount | REAL | 退款金额 |
| reason | TEXT | 退款原因 |
| status | TEXT | 退款状态 |
| audit_time | TEXT | 审核时间 |
| auditor_id | TEXT | 审核人 ID |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 订单状态流转
```
pending (待支付)
  ├─ 支付 → paid (待发货)
  │     ├─ 发货 → shipped (已发货)
  │     │     └─ 确认收货 → completed (已完成)
  │     └─ 申请退款 → refunding (退款中)
  │           ├─ 审核通过 → refunded (已退款)
  │           └─ 审核拒绝 → paid (恢复待发货)
  └─ 取消 → cancelled (已取消)
```

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/orders` | 订单列表 | 是 |
| GET | `/api/orders/:id` | 订单详情 | 是 |
| GET | `/api/orders/:id/logistics` | 物流信息 | 是 |
| POST | `/api/orders/preview` | 订单预览 | 是 |
| POST | `/ | 创建订单 | 是 |
| PATCH | `/api/orders/:id/cancel` | 取消订单 | 是 |
| PATCH | `/api/orders/:id/confirm` | 确认收货 | 是 |
| POST | `/api/orders/:id/refund/apply` | 申请退款 | 是 |

#### 核心服务 (orderService)
- `previewOrder(userId, items, addressId, couponId)`: 订单预览（计算金额、运费、优惠）
- `createOrder(userId, orderData)`: 创建订单（扣减库存、生成订单号）

#### 依赖的其他模块
- `productModel`: 库存扣减、商品信息
- `cartModel`: 从购物车创建订单
- `addressModel`: 收货地址
- `couponController`: 优惠券使用
- `shippingController`: 运费计算

#### 被哪些模块依赖
- `paymentController`: 支付订单
- `reviewController`: 订单商品评价
- `adminController`: 管理后台订单管理

---

### 3.8 支付模块 (payment)

**文件路径**:
- Controller: `src/controllers/paymentController.js`
- Route: `src/routes/payment.js`
- Model: `src/models/paymentModel.js`

#### 功能描述
支付管理，支持多种支付方式、支付回调、支付查询等。

#### 数据库表结构
**payments 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 支付记录 ID |
| payment_no | TEXT | 支付单号 |
| order_id | TEXT | 订单 ID |
| user_id | TEXT | 用户 ID |
| amount | REAL | 支付金额 |
| pay_method | TEXT | 支付方式 |
| status | TEXT | 支付状态 |
| third_party_no | TEXT | 第三方支付单号 |
| paid_at | TEXT | 支付完成时间 |
| refund_amount | REAL | 已退款金额 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 支付方式
- `wechat`: 微信支付
- `alipay`: 支付宝
- `balance`: 余额支付
- `mock`: 模拟支付（测试用）

#### 支付状态
- `pending`: 待支付
- `success`: 支付成功
- `failed`: 支付失败
- `cancelled`: 已取消
- `refunded`: 已退款

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| POST | `/api/payment/callback/:method` | 支付回调 | 公开 |
| POST | `/api/payment/pay` | 发起支付 | 认证用户 |
| GET | `/api/payment/list` | 支付记录列表 | 认证用户 |
| GET | `/api/payment/:id` | 支付详情 | 认证用户 |
| GET | `/api/payment/:orderId/status` | 订单支付状态 | 认证用户 |
| GET | `/api/payment/:orderId/query` | 查询支付状态 | 认证用户 |
| POST | `/api/payment/:orderId/close` | 关闭支付 | 认证用户 |
| GET | `/api/payment/reconciliation` | 对账 | 管理员 |
| GET | `/api/payment/reconciliation/list` | 对账历史 | 管理员 |

#### 核心方法说明
- `generateSign(data, secret)`: MD5 签名生成（参数排序 + 密钥拼接）
- `verifySign(data, secret)`: 签名验证
- `pay(userId, orderId, payMethod)`: 发起支付
- `callback(method, data)`: 支付回调处理

#### 依赖的其他模块
- `orderModel`: 订单状态更新
- `userModel`: 余额支付扣除

---

### 3.9 评价模块 (reviews)

**文件路径**:
- Controller: `src/controllers/reviewController.js`
- Route: `src/routes/reviews.js`, `src/routes/products.js`
- Model: `src/models/reviewModel.js`

#### 功能描述
商品评价管理，用户可以对已购买商品进行评价。

#### 数据库表结构
**reviews 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 评价 ID |
| order_id | TEXT | 订单 ID |
| product_id | TEXT | 商品 ID |
| sku_id | TEXT | SKU ID |
| user_id | TEXT | 用户 ID |
| rating | INTEGER | 评分 (1-5) |
| content | TEXT | 评价内容 |
| images | TEXT | 图片 JSON 数组 |
| reply | TEXT | 商家回复 |
| reply_at | TEXT | 回复时间 |
| status | TEXT | 状态 |
| likes | INTEGER | 点赞数 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/products/:id/reviews` | 商品评价列表 | 公开 |
| GET | `/api/products/:id/reviews/stats` | 评价统计 | 公开 |
| POST | `/api/reviews` | 发表评价 | 认证用户 |
| GET | `/api/reviews/mine` | 我的评价 | 认证用户 |

#### 核心方法说明
- `getProductReviews(productId, { page, pageSize, filter })`: 获取商品评价（支持全部/好评/中评/差评筛选）
- `getProductReviewStats(productId)`: 获取评价统计（好评率、各星级数量）
- `hasUserReviewedOrder(userId, orderId, productId)`: 检查是否已评价

---

### 3.10 搜索模块 (search)

**文件路径**:
- Controller: `src/controllers/searchController.js`
- Route: `src/routes/search.js`
- Model: `src/models/searchModel.js`

#### 功能描述
商品搜索功能，支持关键词搜索、分类筛选、价格区间、排序等。

#### 数据库表结构
**search_history 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 历史记录 ID |
| user_id | TEXT | 用户 ID |
| keyword | TEXT | 搜索关键词 |
| created_at | TEXT | 创建时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/search` | 搜索商品 | 可选 |
| GET | `/api/search/hot` | 热门搜索词 | 否 |
| GET | `/api/search/suggest` | 搜索建议 | 否 |
| GET | `/api/search/history` | 搜索历史 | 是 |
| DELETE | `/api/search/history` | 清空历史 | 是 |
| DELETE | `/api/search/history/item` | 删除单条历史 | 是 |

#### 搜索参数
- `keyword`: 关键词（匹配名称和副标题）
- `categoryId`: 分类 ID
- `minPrice` / `maxPrice`: 价格区间
- `sort`: 排序方式（default/price_asc/price_desc/sales_desc/newest）
- `page` / `pageSize`: 分页

---

### 3.11 地址模块 (addresses)

**文件路径**:
- Controller: `src/controllers/addressController.js`
- Route: `src/routes/addresses.js`
- Model: `src/models/addressModel.js`

#### 功能描述
用户收货地址管理，支持增删改查和默认地址设置。

#### 数据库表结构
**addresses 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 地址 ID |
| user_id | TEXT | 用户 ID |
| name | TEXT | 收货人姓名 |
| phone | TEXT | 收货人电话 |
| province | TEXT | 省份 |
| city | TEXT | 城市 |
| district | TEXT | 区县 |
| detail | TEXT | 详细地址 |
| is_default | INTEGER | 是否默认 (0/1) |
| tag | TEXT | 标签（家/公司等） |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/addresses` | 地址列表 | 是 |
| GET | `/api/addresses/default` | 默认地址 | 是 |
| GET | `/api/addresses/:id` | 地址详情 | 是 |
| POST | `/api/addresses` | 新增地址 | 是 |
| PUT | `/api/addresses/:id` | 更新地址 | 是 |
| DELETE | `/api/addresses/:id` | 删除地址 | 是 |
| PATCH | `/api/addresses/:id/default` | 设为默认 | 是 |

---

### 3.12 通知模块 (notifications)

**文件路径**:
- Controller: `src/controllers/notificationController.js`
- Route: `src/routes/notifications.js`
- Model: `src/models/notificationModel.js`

#### 功能描述
系统通知管理，支持通知列表、未读数、标记已读等。

#### 数据库表结构
**notifications 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 通知 ID |
| user_id | TEXT | 用户 ID |
| title | TEXT | 通知标题 |
| content | TEXT | 通知内容 |
| type | TEXT | 类型 (system/order/promotion) |
| read | INTEGER | 是否已读 (0/1) |
| created_at | TEXT | 创建时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/notifications` | 通知列表 | 是 |
| GET | `/api/notifications/unread-count` | 未读数量 | 是 |
| PUT | `/api/notifications/:id/read` | 标记已读 | 是 |
| PUT | `/api/notifications/read-all` | 全部已读 | 是 |

---

### 3.13 AI 对话模块 (chat)

**文件路径**:
- Controller: `src/controllers/chatController.js`
- Route: `src/routes/chat.js`
- Model: `src/models/chatModel.js`

#### 功能描述
会话与消息管理，支持用户间对话、AI 对话、评论留言等功能。

#### 数据库表结构
**conversations 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 会话 ID |
| creator_id | TEXT | 创建者 ID |
| participant_id | TEXT | 参与者 ID |
| type | TEXT | 类型 (private/ai/group) |
| title | TEXT | 会话标题 |
| status | TEXT | 状态 (active/archived) |
| last_message | TEXT | 最后一条消息 |
| last_message_at | TEXT | 最后消息时间 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**messages 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 消息 ID |
| conversation_id | TEXT | 会话 ID |
| sender_id | TEXT | 发送者 ID |
| content | TEXT | 消息内容 |
| type | TEXT | 类型 (text/image/system) |
| status | TEXT | 状态 (sent/delivered/read) |
| created_at | TEXT | 创建时间 |

**comments 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 评论 ID |
| user_id | TEXT | 用户 ID |
| target_type | TEXT | 目标类型 |
| target_id | TEXT | 目标 ID |
| content | TEXT | 评论内容 |
| parent_id | TEXT | 父评论 ID |
| status | TEXT | 状态 |
| likes | INTEGER | 点赞数 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**conversation_reads 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | ID |
| user_id | TEXT | 用户 ID |
| conversation_id | TEXT | 会话 ID |
| last_read_at | TEXT | 最后阅读时间 |
| updated_at | TEXT | 更新时间 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/chat/conversations` | 会话列表 | 是 |
| POST | `/api/chat/conversations` | 创建会话 | 是 |
| GET | `/api/chat/conversations/ai` | 获取/创建 AI 会话 | 是 |
| GET | `/api/chat/conversations/:conversationId` | 会话详情 | 是 |
| POST | `/api/chat/conversations/:conversationId/messages` | 发送消息 | 是 + 消息限流 |
| GET | `/api/chat/conversations/:conversationId/messages` | 消息历史 | 是 |
| GET | `/api/chat/unread-count` | 未读消息数 | 是 |
| GET | `/api/chat/comments` | 评论列表 | 否 |
| POST | `/api/chat/comments` | 发表评论 | 是 |
| GET | `/api/chat/comments/:commentId/replies` | 评论回复 | 否 |
| POST | `/api/chat/comments/:commentId/like` | 点赞评论 | 否 |
| DELETE | `/api/chat/comments/:commentId` | 删除评论 | 是 |

---

### 3.14 文件上传模块 (upload)

**文件路径**:
- Controller: `src/controllers/uploadController.js`
- Route: `src/routes/upload.js`

#### 功能描述
文件上传服务，支持图片上传和通用文件上传，包含文件类型校验和魔数验证。

#### 支持的文件类型
**图片类型**: .jpg, .jpeg, .png, .gif, .webp, .bmp
**通用文件类型**: 图片 + .pdf, .zip, .txt, .doc, .docx, .xls, .xlsx, .mp4, .mov, .avi, .mp3, .wav

#### 安全机制
- 文件扩展名白名单校验
- 文件魔数（Magic Number）验证（防止伪造扩展名）
- 上传限流（5次/分钟）
- 文件大小限制（10MB）
- 随机文件名生成（防止路径遍历）

#### 关键 API 接口

| 方法 | 路径 | 功能 | 认证 | 限流 |
|------|------|------|------|------|
| POST | `/api/upload/file` | 通用文件上传 | 是 | uploadLimiter |
| POST | `/api/upload/image` | 图片上传 | 是 | uploadLimiter |

#### 数据库表结构
**files 表**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 文件 ID |
| user_id | TEXT | 上传者 ID |
| name | TEXT | 原始文件名 |
| url | TEXT | 访问 URL |
| size | INTEGER | 文件大小（字节） |
| type | TEXT | 文件类型 |
| created_at | TEXT | 上传时间 |

#### 依赖的其他模块
- `config.upload`: 上传路径和大小限制

---

### 3.15 优惠券模块 (coupons)

**文件路径**:
- Controller: `src/controllers/couponController.js`
- Route: `src/routes/coupons.js`

#### 功能描述
优惠券系统，支持优惠券领取、使用、管理等功能。

> **注意**: 此模块当前使用内存存储（数组），未持久化到数据库。

#### 内存数据结构
**coupons**: 优惠券模板列表
**userCoupons**: 用户优惠券记录

#### 优惠券类型
- 满减券
- 折扣券

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/coupons` | 可领取优惠券列表 | 认证用户 |
| GET | `/api/coupons/mine` | 我的优惠券 | 认证用户 |
| POST | `/api/coupons/:id/claim` | 领取优惠券 | 认证用户 |
| POST | `/api/coupons/apply` | 计算优惠券优惠 | 认证用户 |
| POST | `/api/coupons/use` | 使用优惠券 | 认证用户 |
| POST | `/api/coupons/admin` | 创建优惠券 | 管理员 |
| GET | `/api/coupons/admin` | 优惠券列表 | 管理员 |
| PUT | `/api/coupons/admin/:id` | 更新优惠券 | 管理员 |
| DELETE | `/api/coupons/admin/:id` | 删除优惠券 | 管理员 |
| POST | `/api/coupons/admin/issue` | 发放优惠券 | 管理员 |

#### 已知限制
- 数据存储在内存中，服务重启后数据丢失
- 无持久化数据库表

---

### 3.16 会员积分模块 (members)

**文件路径**:
- Controller: `src/controllers/memberController.js`
- Route: `src/routes/members.js`

#### 功能描述
会员等级与积分系统，支持积分获取、消耗、等级升级等。

> **注意**: 此模块当前使用内存存储，未持久化到数据库。

#### 会员等级配置

| 等级 | 名称 | 最低积分 | 折扣率 |
|------|------|---------|--------|
| 1 | 普通会员 | 0 | 100% |
| 2 | 白银会员 | 1000 | 98% |
| 3 | 黄金会员 | 5000 | 95% |
| 4 | 钻石会员 | 20000 | 90% |

#### 积分获取途径
- 签到奖励
- 消费返积分
- 活动奖励

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/members` | 会员信息 | 认证用户 |
| GET | `/api/members/points/logs` | 积分明细 | 认证用户 |
| POST | `/api/members/points/earn` | 获取积分 | 认证用户 |
| POST | `/api/members/points/spend` | 消耗积分 | 认证用户 |
| POST | `/api/members/points/exchange` | 积分兑换 | 认证用户 |
| GET | `/api/members/admin/levels` | 等级列表 | 管理员 |
| PUT | `/api/members/admin/levels/:id` | 更新等级 | 管理员 |
| GET | `/api/members/admin/members` | 会员列表 | 管理员 |
| GET | `/api/members/admin/members/:userId` | 会员详情 | 管理员 |
| PUT | `/api/members/admin/members/:userId/points` | 调整积分 | 管理员 |

#### 已知限制
- 数据存储在内存中，服务重启后数据丢失

---

### 3.17 秒杀活动模块 (flashSales)

**文件路径**:
- Controller: `src/controllers/flashSaleController.js`
- Route: `src/routes/flashSales.js`

#### 功能描述
限时秒杀活动，支持活动管理、商品秒杀、秒杀订单等。

> **注意**: 此模块当前使用内存存储，未持久化到数据库。

#### 活动状态
- `upcoming`: 即将开始
- `active`: 进行中
- `ended`: 已结束

#### 内存数据结构
- `flashSales`: 秒杀活动列表
- `flashSaleItems`: 秒杀商品列表
- `flashSaleOrders`: 秒杀订单记录

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/flash-sales` | 秒杀活动列表 | 认证用户 |
| GET | `/api/flash-sales/:id/items` | 活动商品列表 | 认证用户 |
| GET | `/api/flash-sales/:id/items/:itemId` | 秒杀商品详情 | 认证用户 |
| POST | `/api/flash-sales/:id/buy` | 秒杀购买 | 认证用户 |
| POST | `/api/flash-sales/admin` | 创建活动 | 管理员 |
| PUT | `/api/flash-sales/admin/:id` | 更新活动 | 管理员 |
| DELETE | `/api/flash-sales/admin/:id` | 删除活动 | 管理员 |
| POST | `/api/flash-sales/admin/:id/items` | 添加商品 | 管理员 |
| DELETE | `/api/flash-sales/admin/:id/items/:itemId` | 移除商品 | 管理员 |
| GET | `/api/flash-sales/admin/:id/orders` | 秒杀订单 | 管理员 |

#### 已知限制
- 数据存储在内存中，服务重启后数据丢失
- 无真正的库存扣减和并发控制

---

### 3.18 签到模块 (checkins)

**文件路径**:
- Controller: `src/controllers/checkinController.js`
- Route: `src/routes/checkins.js`

#### 功能描述
每日签到系统，支持连续签到奖励、签到日历、统计等。

> **注意**: 此模块当前使用内存存储，未持久化到数据库。

#### 签到配置
- 每日基础积分：10 分
- 连续签到奖励：第 2 天 +5，第 3 天 +10，第 4 天 +15，第 5 天 +20，第 6 天 +25，第 7 天 +30
- 最大连续天数：7 天

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| POST | `/api/checkins` | 签到 | 认证用户 |
| GET | `/api/checkins/history` | 签到历史 | 认证用户 |
| GET | `/api/checkins/stats` | 签到统计 | 认证用户 |
| GET | `/api/checkins/calendar` | 签到日历 | 认证用户 |
| GET | `/api/checkins/admin/config` | 签到配置 | 管理员 |
| PUT | `/api/checkins/admin/config` | 更新配置 | 管理员 |
| GET | `/api/checkins/admin/stats` | 签到统计 | 管理员 |

#### 已知限制
- 数据存储在内存中，服务重启后数据丢失

---

### 3.19 站内信模块 (inbox)

**文件路径**:
- Controller: `src/controllers/inboxController.js`
- Route: `src/routes/inbox.js`

#### 功能描述
站内消息系统，支持用户间消息、系统广播、已读状态等。

> **注意**: 此模块当前使用内存存储，未持久化到数据库。

#### 内存数据结构
- `messages`: 消息列表
- `messageStatus`: 消息阅读状态（按 userId-messageId 索引）

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/inbox` | 消息列表 | 认证用户 |
| GET | `/api/inbox/unread-count` | 未读数 | 认证用户 |
| GET | `/api/inbox/:id` | 消息详情 | 认证用户 |
| POST | `/api/inbox` | 发送消息 | 认证用户 |
| PUT | `/api/inbox/:id/read` | 标记已读 | 认证用户 |
| PUT | `/api/inbox/read-all` | 全部已读 | 认证用户 |
| DELETE | `/api/inbox/:id` | 删除消息 | 认证用户 |
| POST | `/api/inbox/admin` | 管理员发消息 | 管理员 |
| GET | `/api/inbox/admin` | 消息列表 | 管理员 |
| GET | `/api/inbox/admin/:id` | 消息详情 | 管理员 |
| DELETE | `/api/inbox/admin/:id` | 删除消息 | 管理员 |

#### 已知限制
- 数据存储在内存中，服务重启后数据丢失

---

### 3.20 运费模板模块 (shipping)

**文件路径**:
- Controller: `src/controllers/shippingController.js`
- Route: `src/routes/shipping.js`

#### 功能描述
运费模板管理，支持运费计算、模板管理。

> **注意**: 此模块当前使用内存存储，包含 2 个默认模板。

#### 默认运费模板

| 模板 | 类型 | 基础运费 | 包邮门槛 | 时效 |
|------|------|---------|---------|------|
| 标准配送 | standard | ¥10 | ¥99 | 3-5天 |
| 加急配送 | express | ¥20 | ¥199 | 1-2天 |

#### 关键 API 接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| POST | `/api/shipping/calculate` | 计算运费 | 认证用户 |
| GET | `/api/shipping/templates` | 模板列表 | 认证用户 |
| GET | `/api/shipping/templates/:id` | 模板详情 | 认证用户 |
| POST | `/api/shipping/admin/templates` | 创建模板 | 管理员 |
| PUT | `/api/shipping/admin/templates/:id` | 更新模板 | 管理员 |
| DELETE | `/api/shipping/admin/templates/:id` | 删除模板 | 管理员 |

#### 已知限制
- 数据存储在内存中，服务重启后数据丢失
- 运费计算逻辑较简单

---

### 3.21 管理后台模块 (admin)

**文件路径**:
- Controller: `src/controllers/adminController.js`
- Route: `src/routes/admin.js`

#### 功能描述
管理后台综合接口，包括商品管理、订单管理、用户管理、数据统计仪表盘等。

#### 关键 API 接口

**商品管理**:
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/products` | 商品列表 |
| GET | `/api/admin/products/:id` | 商品详情 |
| POST | `/api/admin/products` | 创建商品 |
| PUT | `/api/admin/products/:id` | 更新商品 |
| DELETE | `/api/admin/products/:id` | 删除商品 |
| PATCH | `/api/admin/products/:id/status` | 更新状态 |
| GET | `/api/admin/products/low-stock` | 低库存列表 |

**订单管理**:
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/orders` | 订单列表 |
| GET | `/api/admin/orders/:id` | 订单详情 |
| PATCH | `/api/admin/orders/:id/status` | 更新状态 |
| POST | `/api/admin/orders/:id/ship` | 发货 |
| POST | `/api/admin/orders/:id/logistics` | 添加物流 |
| POST | `/api/admin/orders/:id/refund/audit` | 退款审核 |
| POST | `/api/admin/orders/batch/status` | 批量更新状态 |
| GET | `/api/admin/orders/statistics` | 订单统计 |

**数据仪表盘**:
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/dashboard/overview` | 概览数据 |
| GET | `/api/admin/dashboard/order-trend` | 订单趋势 |
| GET | `/api/admin/dashboard/product-rank` | 商品排行 |
| GET | `/api/admin/dashboard/user-trend` | 用户趋势 |
| GET | `/api/admin/dashboard/conversion` | 转化率 |
| GET | `/api/admin/dashboard/payment-stats` | 支付统计 |
| GET | `/api/admin/dashboard/refund-stats` | 退款统计 |
| GET | `/api/admin/dashboard/coupon-stats` | 优惠券统计 |

**分类管理**:
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/categories` | 分类列表 |

**评价管理**:
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/reviews` | 评价列表 |
| GET | `/api/admin/reviews/:id` | 评价详情 |
| DELETE | `/api/admin/reviews/:id` | 删除评价 |
| PATCH | `/api/admin/reviews/:id/reply` | 回复评价 |
| PATCH | `/api/admin/reviews/:id/status` | 更新状态 |
| POST | `/api/admin/reviews/batch/delete` | 批量删除 |

#### 依赖的其他模块
- 几乎所有业务模块都被管理后台调用

---

## 4. 模块间依赖关系图

### 4.1 核心依赖层（基础设施层）

所有业务模块都依赖的基础设施：

```
┌─────────────────────────────────────────────────────────┐
│                    业务模块层 (22个)                      │
└──────────────┬───────────────────┬──────────────────────┘
               │                   │
               ▼                   ▼
┌──────────────────────────┐ ┌──────────────────────────┐
│      Utils 工具层         │ │    Middleware 中间件层    │
│  ├─ response.js          │ │  ├─ auth.js              │
│  ├─ logger.js            │ │  ├─ security.js          │
│  └─ generateId           │ │  ├─ rateLimiter.js       │
└──────────────┬───────────┘ │  ├─ errorHandler.js      │
               │             │  ├─ requestLogger.js     │
               │             │  └─ csrfConfig.js        │
               │             └──────────────┬───────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Config 配置层                         │
│                    config/index.js                      │
└─────────────────────────────┬───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Database 层                           │
│                 models/index.js                         │
│              (better-sqlite3 + WAL)                     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 业务模块调用关系

```
                    ┌─────────────┐
                    │   用户模块   │  ← 认证模块依赖
                    │  userModel  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   地址模块    │  │  收藏模块    │  │   通知模块    │
│  addresses   │  │  favorites   │  │ notifications │
└──────────────┘  └──────┬───────┘  └──────────────┘
                         │
                         ▼
                   ┌──────────────┐
                   │   商品模块    │
                   │   products   │
                   └──────┬───────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
  ┌───────────┐    ┌───────────┐    ┌───────────┐
  │ 分类模块   │    │ 购物车    │    │  搜索模块  │
  │categories │    │   cart    │    │  search   │
  └───────────┘    └─────┬─────┘    └───────────┘
                         │
                         ▼
                   ┌───────────┐
                   │  订单模块  │  ← 订单服务
                   │  orders   │     orderService
                   └─────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌───────────┐   ┌───────────┐   ┌───────────┐
  │ 支付模块   │   │ 评价模块   │   │ 退款模块   │
  │  payment  │   │  reviews  │   │  refunds  │
  └───────────┘   └───────────┘   └───────────┘

  ┌───────────┐   ┌───────────┐   ┌───────────┐
  │ 优惠券模块 │   │ 会员模块   │   │ 运费模板  │
  │  coupons  │   │  members  │   │ shipping  │
  └───────────┘   └───────────┘   └───────────┘
       (内存)          (内存)          (内存)

  ┌───────────┐   ┌───────────┐   ┌───────────┐
  │  秒杀模块  │   │  签到模块  │   │  站内信   │
  │flashSales │   │ checkins  │   │   inbox   │
  └───────────┘   └───────────┘   └───────────┘
       (内存)          (内存)          (内存)

                    ┌───────────┐
                    │ 管理后台   │
                    │   admin   │  ← 调用所有模块
                    └───────────┘
```

### 4.3 数据流方向

#### 用户下单数据流
```
用户 → 购物车(cart) → 订单预览(orderService.previewOrder)
     → 计算优惠(coupons.apply) + 计算运费(shipping.calculate)
     → 创建订单(orderService.createOrder)
     → 扣减库存(productModel)
     → 生成订单 + 订单项(orderModel)
     → 发起支付(payment.pay)
     → 余额扣除(userModel.deductBalance)
     → 更新订单状态(orderModel.updateStatus)
     → 发送通知(notifications)
     → 增加会员积分(memberController.earnPoints)
```

#### 商品搜索数据流
```
用户 → 搜索关键词(searchController)
     → 查询商品表(products JOIN product_skus)
     → 按条件过滤(分类/价格区间/排序)
     → 返回分页结果
     → 记录搜索历史(search_history)
```

#### 认证数据流
```
用户 → 登录(authController.login)
     → 查询用户(userModel.findByUsername/Email)
     → 验证密码(bcrypt.compare)
     → 生成 Access Token (jwt.sign + config.jwt.secret)
     → 生成 Refresh Token (存入 refresh_tokens 表)
     → 更新最后登录时间
     → 返回双 Token
```

### 4.4 模块分层总结

| 层级 | 模块 | 持久化 | 说明 |
|------|------|--------|------|
| L1 基础设施 | config, utils, middleware, models/index | - | 所有模块的基础 |
| L2 核心数据 | users, products, categories, orders, payments | 数据库 | 核心业务数据 |
| L3 关联数据 | cart, favorites, addresses, notifications, reviews | 数据库 | 与核心数据关联 |
| L4 功能模块 | search, chat, upload, errorLogs, sync | 数据库 | 专项功能 |
| L5 活动模块 | coupons, members, flashSales, checkins, inbox, shipping | 内存 | 运营活动（待持久化） |
| L6 管理后台 | admin | - | 综合管理，调用下层所有模块 |

---

## 5. 错误码体系

### 5.1 错误码分类

| 错误码范围 | 类型 | 说明 | HTTP 状态码范围 |
|-----------|------|------|-----------------|
| 0 | 成功 | 请求成功 | 200-299 |
| 1000-1999 | GENERAL | 通用错误 | 400-599 |
| 2000-2999 | AUTH | 认证错误 | 401, 403 |
| 3000-3999 | BUSINESS | 业务错误 | 400, 404 |
| 4000-4999 | RESOURCE | 资源错误 | 400, 404, 413 |
| 6000-6999 | SECURITY | 安全错误 | 403, 429 |

### 5.2 常用错误码列表

#### 通用错误 (1000-1999)

| 错误码 | 消息 | HTTP 状态码 | 说明 |
|--------|------|-------------|------|
| 1000 | 操作失败 | 500 | 通用失败 |
| 1001 | 参数错误 | 400 | 参数校验失败 |
| 1002 | 用户不存在 | 401 | 认证时用户不存在 |
| 1003 | 无权限操作 | 403 | 权限不足 |
| 1004 | 接口不存在 / 资源不存在 | 404 | 404 错误 |
| 1005 | 服务器内部错误 | 500 | 未处理异常 |
| 1007 | Token 已过期 | 401 | JWT 过期 |
| 1008 | 无效的认证令牌 | 401 | JWT 无效 |
| 1020 | 请求过于频繁 | 429 | 全局 API 限流 |
| 1021 | 登录尝试过于频繁 | 429 | 登录限流 |
| 1022 | 注册请求过于频繁 | 429 | 注册限流 |
| 1023 | 发送消息过于频繁 | 429 | 消息限流 |
| 1024 | 文件上传过于频繁 | 429 | 上传限流 |

#### 认证错误 (2000-2999)

| 错误码 | 消息 | HTTP 状态码 | 说明 |
|--------|------|-------------|------|
| 2001 | 未登录 | 401 | - |
| 2002 | 登录已过期 | 401 | - |
| 2003 | 账号被禁用 | 403 | - |
| 2004 | 用户名或密码错误 | 401 | - |
| 2005 | Token 无效 | 401 | - |

#### 业务错误 (3000-3999)

**用户相关 (3000-3099)**:
| 错误码 | 消息 | HTTP 状态码 |
|--------|------|-------------|
| 3001 | 用户不存在 | 404 |
| 3002 | 用户名已存在 | 409 |
| 3003 | 邮箱已被注册 | 409 |
| 3004 | 用户名格式不正确 | 400 |
| 3005 | 密码格式不正确 | 400 |

**会话/对话相关 (3100-3199)**:
| 错误码 | 消息 | HTTP 状态码 |
|--------|------|-------------|
| 3101 | 会话不存在 | 404 |
| 3102 | 无权访问该会话 | 403 |
| 3103 | 不能和自己聊天 | 400 |
| 3104 | AI 服务暂时不可用 | 503 |

**商品相关 (3200-3299)**:
| 错误码 | 消息 | HTTP 状态码 |
|--------|------|-------------|
| 3201 | 商品不存在 | 404 |
| 3202 | 商品已下架 | 400 |
| 3203 | 库存不足 | 400 |

**订单相关 (3300-3399)**:
| 错误码 | 消息 | HTTP 状态码 |
|--------|------|-------------|
| 3301 | 订单不存在 | 404 |
| 3302 | 订单无法取消 | 400 |
| 3303 | 订单已支付 | 400 |

**支付相关 (3400-3499)**:
| 错误码 | 消息 | HTTP 状态码 |
|--------|------|-------------|
| 3401 | 支付失败 | 500 |
| 3402 | 支付超时 | 408 |
| 3403 | 支付已取消 | 400 |
| 3404 | 支付记录不存在 | 404 |
| 3405 | 余额不足 | 400 |
| 3406 | 支付验签失败 | 400 |
| 3407 | 支付已处理 | 400 |
| 3408 | 无效的支付方式 | 400 |
| 3409 | 支付状态无效 | 400 |

**签到相关 (3900-3999)**:
| 错误码 | 消息 | HTTP 状态码 |
|--------|------|-------------|
| 3901 | 今日已签到 | 400 |

#### 资源错误 (4000-4999)

| 错误码 | 消息 | HTTP 状态码 | 说明 |
|--------|------|-------------|------|
| 4001 | 文件过大 | 413 | 超过大小限制 |
| 4002 | 文件类型不允许 | 400 | 不在白名单内 |
| 4003 | 文件上传失败 | 500 | 上传过程出错 |
| 4004 | 文件不存在 | 404 | - |

#### 安全错误 (6000-6999)

| 错误码 | 消息 | HTTP 状态码 | 说明 |
|--------|------|-------------|------|
| 6001 | 请求过于频繁 | 429 | 安全限流 |
| 6002 | 检测到可疑行为 | 403 | 异常请求 |
| 6003 | CSRF 令牌无效 | 403 | Token 不匹配 |
| 6004 | CSRF 令牌缺失 | 403 | 缺少 Token |
| 6005 | 检测到 XSS 攻击 | 403 | 恶意脚本 |
| 6006 | 检测到 SQL 注入攻击 | 403 | SQL 注入 |
| 6007 | 无效的请求来源 | 403 | CORS 拒绝 |

### 5.3 错误响应格式

```json
{
  "code": 1001,
  "message": "参数错误",
  "errorType": "GENERAL",
  "data": null,
  "timestamp": 1719567890000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 业务错误码 |
| message | string | 错误描述 |
| errorType | string | 错误类型分类（GENERAL/AUTH/BUSINESS/RESOURCE/SECURITY） |
| data | null | 错误时固定为 null |
| timestamp | number | 响应时间戳（毫秒） |
| requestId | string | 请求唯一标识（UUID v4），用于排障 |

### 5.4 成功响应格式（对比参考）

```json
{
  "code": 0,
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1719567890000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 附录：模块完成度说明

### 数据库持久化模块（已实现）
以下模块已使用 SQLite 数据库持久化存储：
- ✅ 用户模块 (users)
- ✅ 商品模块 (products)
- ✅ 分类模块 (categories)
- ✅ 购物车模块 (cart)
- ✅ 收藏模块 (favorites)
- ✅ 订单模块 (orders)
- ✅ 支付模块 (payment)
- ✅ 评价模块 (reviews)
- ✅ 搜索模块 (search)
- ✅ 地址模块 (addresses)
- ✅ 通知模块 (notifications)
- ✅ AI 对话模块 (chat)
- ✅ 文件上传模块 (upload)
- ✅ 错误日志模块 (errorLogs)
- ✅ 数据同步模块 (sync)

### 内存存储模块（待持久化）
以下模块当前使用内存数组存储，服务重启后数据会丢失：
- ⚠️ 优惠券模块 (coupons)
- ⚠️ 会员积分模块 (members)
- ⚠️ 秒杀活动模块 (flashSales)
- ⚠️ 签到模块 (checkins)
- ⚠️ 站内信模块 (inbox)
- ⚠️ 运费模板模块 (shipping)
