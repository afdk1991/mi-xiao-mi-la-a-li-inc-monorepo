# Gexm 项目安全审查报告

> **审查日期**：2026-07-21
> **审查范围**：f:\gexm 全栈项目（Express.js 后端、Vue 3/uni-app 前端、Vue 3 + Element Plus PC 管理端、Electron 桌面端、WordPress PHP、Nginx/Docker 部署配置）
> **审查方法**：基于 `security-best-practices` 技能指导，结合代码静态审查、配置审计、关键路径追踪
> **审查人**：安全最佳实践审查智能体

---

## 一、执行摘要（Executive Summary）

Gexm 项目整体安全基线**良好**，已实施业界主流安全防护措施，包括 Helmet + 严格 CSP、CSRF 双提交 Cookie、多维度限流、JWT 算法锁定（HS256）、AES-256-GCM PII 加密、bcrypt 密码哈希、文件上传 magic number 校验、Electron contextIsolation + sandbox、Nginx 完整安全头与 TLS 1.2/1.3、Docker 容器最小权限。

**本次审查共发现 12 项待改进项**：
- **高危**：4 项（涉及内部指标未授权访问、API 文档暴露、HTTPS 强制重定向可被 Host 头欺骗、Electron IPC 空起源放行）
- **中危**：5 项（涉及 /uploads 静态服务、Nginx CSP 含 unsafe-inline、Redis 密码占位符未替换、CORS 允许空 Origin、HSTS includeSubDomains）
- **低危**：3 项（涉及 HSTS 在开发环境也设置、/preview 端点无权限、未显式配置 trust proxy）

**核心结论**：未发现 SQL 注入、XSS、CSRF、远程代码执行等关键漏洞；现有问题集中在**信息泄露面**与**配置严格度不足**，建议按优先级修复高危及部分中危项。

---

## 二、审查范围与技术栈

| 模块 | 技术栈 | 关键路径 |
| --- | --- | --- |
| 后端 API | Express.js 4 + TypeScript + Knex/SQLite/PostgreSQL | `packages/server/src/` |
| 移动端 H5/小程序 | Vue 3 + uni-app + Pinia | `packages/app/src/` |
| PC 管理后台 | Vue 3 + Element Plus + Pinia + TypeScript | `packages/pc/src/` |
| 桌面端 | Electron 28 + electron-builder | `packages/desktop/src/` |
| 反向代理 | Nginx 1.27 | `docker/nginx/`、`deploy/nginx/` |
| 缓存 | Redis 7 | `docker/redis/redis.conf` |
| 容器编排 | Docker Compose | `docker-compose.prod.yml` |
| WordPress | WordPress 核心（无自定义主题/插件代码） | `wp-content/themes/`、`wp-content/plugins/`（均为空） |

---

## 三、Critical（严重）级别发现

> 本次审查未发现 Critical 级别漏洞。

---

## 四、High（高危）级别发现

### H-01：`/api/metrics` 与 `/api/metrics/reset` 缺少权限校验

- **位置**：`f:\gexm\packages\server\src\app.ts:337-355`
- **代码引用**：
  ```typescript
  // app.ts:337
  app.get('/api/metrics', (req, res) => {
    const acceptHeader = req.headers.accept || ''
    if (acceptHeader.includes('text/plain') || acceptHeader.includes('prometheus')) {
      return metricsEndpoint(req, res)
    }
    res.json({ code: 0, message: 'ok', data: getMetrics() })
  })

  // app.ts:349
  app.post('/api/metrics/reset', (req, res) => {
    resetMetrics()
    res.json({ code: 0, message: 'metrics reset' })
  })
  ```
- **风险描述**：
  - `GET /api/metrics` 返回内部监控数据（CPU、内存、QPS、错误率等），暴露服务架构与运行状态
  - `POST /api/metrics/reset` 可被任意访问者调用清除监控数据，干扰告警与排查
- **影响**：攻击者可获取系统内部指标用于侦察；可清除监控数据掩盖攻击痕迹
- **建议修复**：
  ```typescript
  // 增加 admin 权限校验中间件
  app.get('/api/metrics', requireAdmin, (req, res) => { ... })
  app.post('/api/metrics/reset', requireAdmin, (req, res) => { ... })
  ```
  或在 Nginx 层限制内网访问（`allow 127.0.0.1; deny all;`）

---

### H-02：Swagger API 文档在生产环境暴露

- **位置**：`f:\gexm\packages\server\src\app.ts:358-370`
- **代码引用**：
  ```typescript
  if (swaggerDocument) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { ... }))
    app.get('/api-docs.json', (req, res) => { res.json(swaggerDocument) })
  }
  ```
- **风险描述**：API 文档暴露所有接口路径、参数、模型结构，攻击者无需侦察即可了解完整 API 攻击面
- **影响**：显著降低攻击者侦察成本，加速漏洞挖掘
- **建议修复**：
  ```typescript
  if (!isProduction && swaggerDocument) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { ... }))
  }
  ```

---

### H-03：`forceHttpsMiddleware` 使用 `req.hostname` 存在开放重定向风险

- **位置**：`f:\gexm\packages\server\src\middleware\security.ts:438-443`
- **代码引用**：
  ```typescript
  export function forceHttpsMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (process.env.NODE_ENV === 'production' && req.protocol === 'http') {
      return res.redirect(`https://${req.hostname}${req.originalUrl}`)
    }
    next()
  }
  ```
- **风险描述**：
  - `req.hostname` 来源于 HTTP `Host` 头，攻击者可构造恶意 Host 头（如 `evil.com`）
  - 受害者访问 `http://api.laal.top/...` 时若被中间人或代理篡改 Host 头，会被重定向到 `https://evil.com/...`
  - 项目未显式配置 `app.set('trust proxy', ...)`，无法正确识别反向代理后的真实协议
- **影响**：开放重定向至攻击者控制的域名，可用于钓鱼攻击
- **建议修复**：
  ```typescript
  // 方案 1：使用配置的固定域名
  const ALLOWED_HOSTNAME = process.env.PUBLIC_HOSTNAME || 'api.laal.top'
  if (req.hostname !== ALLOWED_HOSTNAME) {
    return res.status(400).send('Invalid Host')
  }
  return res.redirect(`https://${ALLOWED_HOSTNAME}${req.originalUrl}`)

  // 方案 2：配置 trust proxy（仅信任内网 Nginx）
  // app.set('trust proxy', 'loopback, 172.16.0.0/12')
  ```

---

### H-04：Electron `validateSender` 允许空 origin 通过

- **位置**：`f:\gexm\packages\desktop\src\main\index.js:49-72`
- **代码引用**：
  ```javascript
  function validateSender(event) {
    if (!event.senderFrame) return false
    const allowedOrigins = ['file://', 'app://', 'http://localhost:3000', 'http://localhost:5173']
    const origin = event.senderFrame.origin
    if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
      return true
    }
    if (isDev && origin.startsWith('http://localhost')) {
      return true
    }
    // 空 origin（部分 file:// 加载场景）允许通过
    if (!origin) {
      return true  // ← 风险点
    }
    console.error(`[Security] IPC sender validation failed: ${origin}`)
    return false
  }
  ```
- **风险描述**：`if (!origin) { return true }` 在 origin 为空字符串时直接放行。部分跨域场景或被篡改的 iframe 可能产生空 origin，绕过白名单校验
- **影响**：恶意页面若能注入到 BrowserWindow 中并以空 origin 触发 IPC，可调用全部 `secureHandle` 注册的接口（写入文件、读取 store 等）
- **建议修复**：
  ```javascript
  // 移除空 origin 放行；file:// 场景已通过白名单匹配
  if (!origin) {
    console.error('[Security] IPC sender validation failed: empty origin')
    return false
  }
  ```

---

## 五、Medium（中危）级别发现

### M-01：`/uploads` 静态文件服务缺少 Content-Disposition 与类型白名单

- **位置**：`f:\gexm\packages\server\src\app.ts:279`
- **代码引用**：
  ```typescript
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
  ```
- **风险描述**：
  - 上传文件若为 HTML/SVG，浏览器直接访问会渲染并执行其中脚本（存储型 XSS）
  - 虽然上传时通过 magic number 校验，但 SVG 等文本格式可绕过 magic 检测
- **影响**：若攻击者上传恶意 SVG/HTML，可通过 `https://api.laal.top/uploads/xxx.svg` 触发存储型 XSS
- **建议修复**：
  ```typescript
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res, filepath) => {
      // 强制下载，禁止浏览器渲染
      res.setHeader('Content-Disposition', 'attachment')
      // 限制 Content-Type 白名单
      const ext = path.extname(filepath).toLowerCase()
      const safeTypes = { '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }
      res.setHeader('Content-Type', safeTypes[ext] || 'application/octet-stream')
      res.setHeader('X-Content-Type-Options', 'nosniff')
    }
  }))
  ```

---

### M-02：Nginx CSP 包含 `unsafe-inline`，与 PC 端严格 CSP 不一致

- **位置**：`f:\gexm\docker\nginx\gexm.conf:115`、`f:\gexm\docker\nginx\gexm.conf:237`、`f:\gexm\deploy\nginx\gexm.conf:118`
- **代码引用**：
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https://api.weixin.qq.com https://openapi.alipay.com" always;
  ```
- **风险描述**：
  - PC 端 `packages/pc/src/utils/csp.ts` 已实现生产环境严格 CSP（`script-src 'self'`，不含 `unsafe-inline`）
  - 但 Nginx 层 CSP 包含 `script-src 'self' 'unsafe-inline'`，使 PC 端的严格策略被覆盖
  - `unsafe-inline` 允许任意内联脚本，显著削弱 XSS 防护
- **影响**：XSS 攻击者可注入任意内联脚本，PC 端严格 CSP 失效
- **建议修复**：
  ```nginx
  # 生产环境严格 CSP（与 PC 端 csp.ts prodCSP 对齐）
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-hashes'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https://api.weixin.qq.com https://openapi.alipay.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;
  ```

---

### M-03：Redis 配置 `requirepass ${REDIS_PASSWORD}` 不会被 Redis 自动替换

- **位置**：`f:\gexm\docker\redis\redis.conf:4`
- **代码引用**：
  ```conf
  requirepass ${REDIS_PASSWORD}
  ```
- **风险描述**：
  - Redis 服务端不会解析 `${ENV_VAR}` 占位符，会将其当作字面密码
  - 若直接挂载此配置文件，Redis 实际密码变为字符串 `"${REDIS_PASSWORD}"`
  - 攻击者猜测到此配置后可直接连接 Redis
- **影响**：Redis 密码可被轻易猜到，导致缓存数据泄露/篡改
- **建议修复**：
  ```yaml
  # docker-compose.yml 中使用 command 注入环境变量
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}", "--bind", "127.0.0.1", "--protected-mode", "yes"]
  ```
  或使用 entrypoint 脚本动态生成配置

---

### M-04：CORS 中间件允许空 Origin 通过

- **位置**：`f:\gexm\packages\server\src\app.ts:215-219`
- **代码引用**：
  ```typescript
  origin: function (origin, callback) {
    if (!origin) {
      callback(null, true)  // ← 允许无 Origin 头的请求
      return
    }
    // ...
  }
  ```
- **风险描述**：
  - 同源请求、curl、Postman 等工具默认不发送 Origin 头，放行是为了兼容性
  - 但与 `credentials: true` 配合时，可能被利用发起跨站请求
- **影响**：在某些场景下放宽了 CORS 限制
- **建议修复**：
  ```typescript
  // 仅允许 GET/HEAD 无 Origin 请求（同源场景）
  if (!origin) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      callback(null, true)
    } else {
      callback(null, false)
    }
    return
  }
  ```

---

### M-05：HSTS 配置 `includeSubDomains` 影响所有子域

- **位置**：`f:\gexm\docker\nginx\gexm.conf:80, 112, 201, 231`、`f:\gexm\packages\server\src\middleware\security.ts:426`
- **代码引用**：
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  ```
  ```typescript
  // security.ts:426
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  ```
- **风险描述**：
  - `includeSubDomains` 会让浏览器对所有子域强制 HTTPS
  - 若存在不支持 HTTPS 的子域（如内部测试环境、第三方服务），将导致访问失败
  - HSTS 一旦生效无法立即撤销（需等待 max-age 过期）
- **影响**：可能影响未启用 HTTPS 的子域访问；根据 skill 指引，HSTS 应谨慎使用
- **建议修复**：
  - 确认所有子域均支持 HTTPS 后再启用 `includeSubDomains`
  - 或先使用较短的 max-age（如 300）进行灰度验证
  - 开发环境应完全关闭 HSTS（见 L-01）

---

## 六、Low（低危）级别发现

### L-01：`securityHeadersMiddleware` 在开发环境也设置 HSTS

- **位置**：`f:\gexm\packages\server\src\middleware\security.ts:425-432`
- **代码引用**：
  ```typescript
  export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')  // ← 无条件设置
    // ...
  }
  ```
- **风险描述**：开发环境通常使用 HTTP，HSTS 头会被浏览器记录并影响后续访问
- **影响**：开发环境访问可能被浏览器强制升级到 HTTPS 导致连接失败
- **建议修复**：
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  ```

---

### L-02：`/preview` 端点缺少权限校验

- **位置**：`f:\gexm\packages\server\src\app.ts:332-335`
- **代码引用**：
  ```typescript
  app.get('/preview', (req, res) => {
    const previewPath = path.join(__dirname, '../', '../', '../', 'preview.html')
    res.sendFile(previewPath)
  })
  ```
- **风险描述**：路径硬编码无遍历风险，但 preview.html 可能包含内部预览内容
- **影响**：内部预览页面被外部访问，可能泄露未发布功能
- **建议修复**：增加 admin 权限校验或限制内网访问

---

### L-03：未显式配置 `app.set('trust proxy', ...)`

- **位置**：`f:\gexm\packages\server\src\app.ts`（缺失）
- **风险描述**：
  - 项目部署在 Nginx 反向代理后，但 Express 未配置 trust proxy
  - `req.ip`、`req.protocol`、`req.hostname` 将获取到代理而非真实客户端信息
  - 限流（基于 IP）将基于代理 IP（通常为 127.0.0.1），失去效果
- **影响**：限流可能失效；`forceHttpsMiddleware` 判断 `req.protocol` 不准确
- **建议修复**：
  ```typescript
  // 仅信任第一层反向代理
  app.set('trust proxy', 1)
  // 或指定可信代理 IP
  app.set('trust proxy', 'loopback, 172.16.0.0/12')
  ```

---

## 七、通过的安全检查（Passed Checks）

### 7.1 后端 Express.js 安全

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| Helmet 安全头 | ✅ | `app.ts:184-200` |
| CSP（生产严格） | ✅ | `app.ts:188` + `pc/src/utils/csp.ts` |
| HSTS | ✅ | `app.ts:190-193`（Helmet） |
| X-Frame-Options: DENY | ✅ | `app.ts:194-196` |
| XSS Filter | ✅ | `app.ts:198` + `security.ts:xssFilterMiddleware` |
| CORS 白名单 | ✅ | `app.ts:213-260`（非生产也用白名单） |
| CSRF 双提交 Cookie | ✅ | `security.ts:csrfTokenMiddleware`（HMAC-SHA256 + timingSafeEqual） |
| 输入净化 | ✅ | `security.ts:sanitizeInput` |
| 多维度限流 | ✅ | `rateLimiter.ts`（auth/api/upload/login/register/message/oauth） |
| Body 大小限制 | ✅ | `app.ts:262-264`（10mb） |
| Cookie Parser | ✅ | `app.ts:265` |

### 7.2 认证与授权

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| JWT 算法固定 HS256 | ✅ | `auth.ts:57-61, 187-191`（`algorithms: ['HS256']`） |
| Token 黑名单 fail-closed | ✅ | `auth.ts:80-88` |
| 用户状态再校验 | ✅ | `auth.ts`（缓存 + 状态校验） |
| 角色权限检查 | ✅ | `auth.ts`（admin middleware） |
| 密码 bcrypt 哈希 | ✅ | `authController.ts` |
| 密码强度校验 | ✅ | `authController.ts`（注册时） |
| 登录锁定 | ✅ | `authController.ts`（lockout check） |
| Refresh Token 轮换 | ✅ | `authController.ts` |
| 注销时撤销所有会话 | ✅ | `authController.ts`（password reset + deactivate） |
| 双因素验证（停用账号） | ✅ | `authController.ts`（password + code） |

### 7.3 数据安全

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| AES-256-GCM PII 加密 | ✅ | `crypto.ts`（email/phone/idcard 加密） |
| 随机 IV（12 bytes）+ Auth Tag | ✅ | `crypto.ts` |
| Email 哈希索引（SHA-256） | ✅ | `userModel.ts` |
| 敏感数据脱敏 | ✅ | `crypto.ts`（maskEmail/maskPhone/maskIdCard） |
| 日志脱敏 | ✅ | 配置 `LOG_MASK_SENSITIVE_DATA=true` |
| 密钥强度校验（32+ 字符） | ✅ | `config/index.ts` |
| 生产环境强制密钥 | ✅ | `config/index.ts`（`getSecretKey` 抛错） |

### 7.4 文件上传安全

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| 扩展名白名单 | ✅ | `uploadController.ts` |
| Magic Number 校验 | ✅ | `uploadController.ts` |
| 随机文件名（非用户输入） | ✅ | `uploadController.ts`（`generateId()`） |
| 文件大小限制 | ✅ | multer 配置 |

### 7.5 SQL 注入防护

| 检查项 | 状态 | 说明 |
| --- | --- | --- |
| 参数化查询 | ✅ | 全项目使用 Knex ORM + prepared statements |
| 无 raw query 拼接 | ✅ | Grep 搜索 `.raw(`、`knex.raw`、`.whereRaw(` 均无结果 |
| DDL 语句无用户输入 | ✅ | `achievementModel.ts:100` 的 `db.exec` 仅用于 CREATE TABLE |
| Redis Lua 脚本硬编码 | ✅ | `cacheService.ts:481-487` 等处脚本为字面量 |

### 7.6 前端 Vue 安全

| 检查项 | 状态 | 说明 |
| --- | --- | --- |
| 无 v-html 使用 | ✅ | Grep 搜索 `v-html` 在 app/src、pc/src 中无结果 |
| 无 innerHTML 赋值 | ✅ | Grep 搜索 `innerHTML\s*=` 无结果 |
| CSP 工具严格（PC 端） | ✅ | `pc/src/utils/csp.ts`（生产 script-src 仅 'self'） |
| Token 存储策略（PC 端） | ✅ | `pc/src/store/user.ts:35-63`（rememberMe=false 不持久化；rememberMe=true 用 sessionStorage；refresh_token 永不写入 Web Storage） |
| Token 存储策略（移动端） | ✅ | `app/src/store/user.js`（uni.setStorageSync 原生存储，无 XSS 风险） |
| WebSocket Token 通过 Header | ✅ | `app/src/utils/websocket.js:114-126`（不通过 URL 传递） |
| OAuth State 校验 | ✅ | `app/src/pages/login/login.vue:255` |

### 7.7 Electron 桌面端安全

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| contextIsolation: true | ✅ | `main/index.js:192, 325` |
| nodeIntegration: false | ✅ | `main/index.js:191, 324` |
| sandbox: true | ✅ | `main/index.js:195, 328` |
| webSecurity: true | ✅ | `main/index.js:194, 327` |
| enableRemoteModule: false | ✅ | `main/index.js:193, 326` |
| Preload 隔离 | ✅ | `main/index.js:190`（独立 preload 脚本） |
| IPC 频道白名单 | ✅ | `preload/index.js:34-46`（validChannels） |
| IPC Sender 校验 | ✅ | `main/index.js:49-72`（validateSender） |
| contextBridge API 暴露 | ✅ | `preload/index.js:48`（contextBridge.exposeInMainWorld） |
| 外部 URL 协议限制 | ✅ | `main/index.js:93-101`（仅 http/https） |
| 文件写入路径白名单 | ✅ | `main/index.js:128-137`（isPathAllowed） |
| Store Key 白名单 | ✅ | `main/index.js:142-173`（isStoreKeyAllowed） |
| 窗口 open handler 拦截 | ✅ | `main/index.js:231-237, 340-345` |
| macOS hardenedRuntime | ✅ | `desktop/package.json:109` |
| asar 打包 | ✅ | `desktop/package.json:82` |
| Windows 代码签名配置 | ✅ | `desktop/package.json:166-173` |

### 7.8 Nginx / 部署安全

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| TLS 1.2/1.3 only | ✅ | `nginx/gexm.conf:100-101, 221-222` |
| 强密码套件（ECDHE+AESGCM+CHACHA20） | ✅ | `nginx/gexm.conf:101, 222` |
| ssl_session_tickets off | ✅ | `nginx/gexm.conf:105, 226` |
| ssl_stapling on | ✅ | `nginx/gexm.conf:107-108, 228-229` |
| HTTP 强制跳转 HTTPS | ✅ | `nginx/gexm.conf:88-90, 209-211` |
| server_tokens off | ✅ | `nginx/gexm.conf:18` |
| autoindex off | ✅ | `nginx/gexm.conf:19` |
| 速率限制（auth/api/general） | ✅ | `nginx/gexm.conf:35-41` |
| 隐藏点号文件 | ✅ | `nginx/gexm.conf:187-191, 273-277` |
| 禁止上传目录执行脚本 | ✅ | `nginx/gexm.conf:165-167, 216-218` |
| 防盗链 Referer 校验 | ✅ | `nginx/gexm.conf:149-154, 192-197, 262-267, 205-210` |
| 完整安全头 | ✅ | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, CSP |
| Gzip 压缩 | ✅ | `nginx/gexm.conf:43-56` |
| Body 大小限制 | ✅ | `nginx/gexm.conf:58`（10m） |

### 7.9 Docker 容器安全

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| no-new-privileges | ✅ | `docker-compose.prod.yml:115-116` |
| cap_drop: ALL | ✅ | `docker-compose.prod.yml:117-118` |
| 最小 cap_add | ✅ | `docker-compose.prod.yml:119-123`（仅 NET_BIND_SERVICE/CHOWN/SETGID/SETUID） |
| tmpfs noexec,nosuid | ✅ | `docker-compose.prod.yml:124-127` |
| 非 root 用户运行 | ✅ | `docker-compose.prod.yml:82`（`user: "nginx:nginx"`） |
| 数据库网络隔离 | ✅ | `docker-compose.prod.yml:176-178`（`internal: true`） |
| 日志大小限制 | ✅ | `docker-compose.prod.yml:27-31`（max-size + max-file） |
| 健康检查 | ✅ | `docker-compose.prod.yml:128-133` |
| 资源限制 | ✅ | `docker-compose.prod.yml:96-101` |

### 7.10 Redis 安全

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| bind 127.0.0.1 | ✅ | `redis.conf:1` |
| protected-mode yes | ✅ | `redis.conf:2` |
| 密码保护 | ⚠️ | `redis.conf:4`（占位符未替换，见 M-03） |
| AOF 持久化 | ✅ | `redis.conf:35-41` |

### 7.11 环境变量与配置

| 检查项 | 状态 | 实现位置 |
| --- | --- | --- |
| .env.example 无真实密钥 | ✅ | `.env.example`（全部为占位符） |
| .env 在 .gitignore 中 | ✅ | `.gitignore` |
| 密钥生成指南 | ✅ | `.env.example:16-18` |
| 不同环境不同密钥提示 | ✅ | `.env.example:13` |
| 密钥轮换建议 | ✅ | `.env.example:14` |

### 7.12 WordPress 安全

| 检查项 | 状态 | 说明 |
| --- | --- | --- |
| 无自定义主题代码 | ✅ | `wp-content/themes/` 为空（仅 index.php） |
| 无自定义插件代码 | ✅ | `wp-content/plugins/` 为空（仅 hello.php、index.php） |
| 项目仅使用 WordPress 核心 | ✅ | 所有 PHP 文件均为 WordPress 核心文件 |

---

## 八、修复优先级建议

### P0（立即修复 - 1 周内）

| ID | 问题 | 影响 |
| --- | --- | --- |
| H-01 | `/api/metrics` 与 `/api/metrics/reset` 无权限 | 内部数据泄露、监控被清除 |
| H-02 | Swagger API 文档生产暴露 | 攻击面侦察成本降低 |
| H-03 | forceHttpsMiddleware Host 头欺骗 | 开放重定向至攻击者域名 |
| H-04 | Electron IPC 空 origin 放行 | IPC 白名单可被绕过 |

### P1（优先修复 - 2 周内）

| ID | 问题 | 影响 |
| --- | --- | --- |
| M-01 | /uploads 静态服务无 Content-Disposition | 存储型 XSS（SVG/HTML） |
| M-02 | Nginx CSP 含 unsafe-inline | PC 端严格 CSP 失效 |
| M-03 | Redis 密码占位符未替换 | Redis 可被未授权访问 |
| L-03 | 未配置 trust proxy | 限流可能失效 |

### P2（计划修复 - 1 个月内）

| ID | 问题 | 影响 |
| --- | --- | --- |
| M-04 | CORS 允许空 Origin | 限制放宽 |
| M-05 | HSTS includeSubDomains | 子域兼容性风险 |
| L-01 | 开发环境设置 HSTS | 开发环境访问异常 |
| L-02 | /preview 端点无权限 | 内部页面泄露 |

---

## 九、审查方法说明

### 9.1 审查工具

- **Grep**：基于正则表达式的代码模式搜索（v-html、innerHTML、eval、exec、raw query 等）
- **Read**：关键文件逐行审查（app.ts、security.ts、auth.ts、csp.ts、main/index.js、nginx.conf 等）
- **Glob**：文件结构扫描（wp-content、deploy、docker 等）
- **SearchCodebase**：基于语义的代码搜索

### 9.2 审查覆盖

- 后端 Express.js：核心中间件、控制器、模型、配置
- 前端 Vue/uni-app：状态管理、API 调用、WebSocket、登录流程
- PC 管理端 Vue 3 + Element Plus：CSP 工具、Token 存储、API 调用
- Electron 桌面端：主进程安全配置、Preload 隔离、IPC 校验、构建配置
- WordPress：自定义主题/插件代码扫描（结果为空，仅核心代码）
- 部署配置：Nginx、Docker Compose、Redis、环境变量

### 9.3 审查局限

- 未进行动态渗透测试
- 未审查第三方依赖的已知漏洞（建议执行 `npm audit`）
- 未审查 Docker 镜像基础层漏洞
- 未审查 CI/CD 流水线密钥管理
- 未审查日志收集系统的访问控制

---

## 十、附录：关键安全配置参考

### 10.1 PC 端生产 CSP（参考实现）

```typescript
// f:\gexm\packages\pc\src\utils\csp.ts:94-99
const prodCSP: CSPDirective = {
  ...baseCSP,
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-hashes'"],
  'upgrade-insecure-requests': [],
}
```

### 10.2 PC 端 Token 存储策略（参考实现）

```typescript
// f:\gexm\packages\pc\src\store\user.ts:35-63
function credentialStorage(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage
}

function tokenStorage(remember: boolean): Storage | null {
  return remember ? sessionStorage : null  // refresh_token 永不写入 Web Storage
}
```

### 10.3 Electron 安全配置（参考实现）

```javascript
// f:\gexm\packages\desktop\src\main\index.js:189-196
webPreferences: {
  preload: path.join(__dirname, '../preload/index.js'),
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
  webSecurity: true,
  sandbox: true,
}
```

### 10.4 JWT 算法锁定（参考实现）

```typescript
// f:\gexm\packages\server\src\middleware\auth.ts:57-61
jwt.verify(token, secret, {
  algorithms: ['HS256'],  // 算法锁定，防止 alg=none 攻击
  // ...
})
```

---

**报告结束**

如需对任一发现进行详细解释、修复方案讨论或代码审查，请告知。
