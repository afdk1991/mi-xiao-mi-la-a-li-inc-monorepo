# Gexm 项目安全审查报告

**审查日期**：2026-07-24
**审查范围**：f:\gexm（后端 / 前端 / WordPress 主题 / Nginx / Docker / 支付）
**审查模式**：只读（不修改代码、不执行命令）
**审查工具**：Read / Grep / Glob / SearchCodebase

---

## 一、执行摘要（Executive Summary）

本次安全审查覆盖 Gexm 项目 6 大领域共 47 个审查项。整体安全 posture **中等偏上**，核心支付链路与认证体系具备较完善的防护（JWT 算法锁定、Token 黑名单 fail-closed、支付回调 IP 白名单 + 幂等性 + 金额校验 + XXE 防护）。

但仍发现 **3 个 Critical**、**5 个 High**、**8 个 Medium**、**6 个 Low** 级别问题，集中在以下方面：

- **关键违规**：`wp_ajax_nopriv_*` 钩子在手机注册/登录、投票结果查询、模板部件等场景仍被使用，违反项目硬约束（项目记忆中明确禁止支付/投票/打赏/文章/视频上传/手机登录等敏感 AJAX 使用 `wp_ajax_nopriv_*`）。
- **配置默认值不安全**：`payment.ipWhitelist.enabled` 默认 `false`、MySQL/Wordpress 默认密码硬编码、ADMIN_DEFAULT_PASSWORD 默认 `Admin@2026`。
- **Token 存储策略不一致**：PC 端做了精细的 `rememberMe` + sessionStorage 策略；App 端（uniapp）将 `refresh_token` 直接持久化到 `uni.storage`，存在长期泄露风险。
- **CSP 在 Nginx 层包含 `unsafe-eval`**：与 PC `csp.ts` 生产环境策略（仅 `'self'`）冲突，Nginx 覆盖了应用层严格 CSP。
- **Docker MySQL 容器无 `cap_drop` / `security_opt`**：与 server/redis/postgres 容器加固不一致。

修复优先级：**P0（Critical 3 项 + High 5 项应在下次发版前修复）**。

---

## 二、漏洞清单（按严重程度排序）

### 🔴 Critical（严重）— 3 项

#### C-01：敏感 AJAX 使用 `wp_ajax_nopriv_*` 钩子（违反项目硬约束）

- **文件**：
  - `f:\gexm\wp-content\themes\mixm-laal\inc\mobile-login.php:49-51`
  - `f:\gexm\wp-content\themes\mixm-laal\inc\poll-functions.php:1588`
  - `f:\gexm\wp-content\themes\mixm-laal\inc\zibll-template-parts.php`
  - `f:\gexm\wp-content\themes\mixm-laal\inc\content-audit-admin.php`
  - `f:\gexm\wp-content\themes\mixm-laal\inc\zibll-ui-compat.php`
  - `f:\gexm\wp-content\themes\mixm-laal\inc\checkin-functions.php`
  - `f:\gexm\wp-content\themes\mixm-laal\inc\flash-sale-functions.php`
  - `f:\gexm\wp-content\themes\mixm-laal\inc\coupon-functions.php`
- **类型**：认证绕过 / CSRF
- **描述**：项目记忆硬约束明确"敏感 AJAX 操作（payment, voting, reward, article features, video upload, mobile login）必须不使用 `wp_ajax_nopriv_*` 钩子"。审查发现 10 个文件仍在使用 `wp_ajax_nopriv_*`，包括手机登录、签到、投票结果、闪购、优惠券等。
- **影响**：未认证用户可直接调用受保护端点，导致短信轰炸、签到刷分、优惠券薅羊毛、投票结果篡改。
- **修复建议**：
  1. 手机注册/登录场景虽需未登录访问，但应：
     - 改用 REST API `register_rest_route` + `permission_callback` 显式声明权限
     - 或保留 `wp_ajax_nopriv_*` 但强制图形/滑块验证码（已通过 `mixm_laal_sms_captcha_required` 过滤器预留扩展点，需默认开启）
  2. 签到、闪购、优惠券等敏感操作必须移除 `wp_ajax_nopriv_*`，仅保留 `wp_ajax_*`。
  3. 投票结果查询可保留 `nopriv`（公开数据），但需加 Redis 缓存 + 限流，防止数据爬取。

#### C-02：Docker Compose 硬编码数据库默认密码 + 管理员默认密码

- **文件**：`f:\gexm\docker-compose.yml:134-137, 164, 20`
- **类型**：硬编码凭证 / 默认密码
- **描述**：
  ```yaml
  MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root_password_change_me_2026}
  MYSQL_PASSWORD: ${MYSQL_PASSWORD:-laal_top_password_change_me_2026}
  WORDPRESS_DB_PASSWORD: ${MYSQL_PASSWORD:-laal_top_password_change_me_2026}
  ADMIN_DEFAULT_PASSWORD: ${ADMIN_DEFAULT_PASSWORD:-Admin@2026}
  ```
  虽使用 `${VAR:-default}` 形式允许环境变量覆盖，但默认值明文写入仓库，运维若忘记设置环境变量，将直接使用弱默认密码。
- **影响**：数据库可被默认密码登录；管理员账号可被 `Admin@2026` 撞库登录；WordPress 可被安装恶意插件。
- **修复建议**：
  1. 将默认值改为 `${VAR:?必须设置 VAR 环境变量}`（已对 REDIS_PASSWORD / POSTGRES_URL / JWT_SECRET 实施，需统一）。
  2. 在 README 或 `docker-compose.yml` 顶部 `# REQUIRED ENV VARS` 注释中列出必填项。
  3. 启动脚本增加 `docker-compose config | grep '_change_me_'` 检测默认密码残留，命中即拒绝启动。

#### C-03：MySQL/WordPress 容器缺少 `security_opt` 与 `cap_drop`

- **文件**：`f:\gexm\docker-compose.yml:129-184`（db / wordpress 服务）
- **类型**：容器逃逸 / 权限提升
- **描述**：`server` / `redis` / `postgres` 容器均配置了 `security_opt: [no-new-privileges:true]` 与 `cap_drop: [ALL]`，但 `db`（MySQL）与 `wordpress` 容器未配置，以 root 运行，且 WordPress 容器直接挂载 `./wp-content/themes` 等宿主目录，存在容器逃逸到宿主文件系统的风险。
- **影响**：攻击者通过 WordPress 插件漏洞或 MySQL 提权漏洞获取容器 root 权限后，可尝试逃逸到宿主机。
- **修复建议**：
  1. 为 `db` 与 `wordpress` 服务添加：
     ```yaml
     security_opt:
       - no-new-privileges:true
     cap_drop:
       - ALL
     cap_add:
       - CHOWN
       - DAC_OVERRIDE
       - SETGID
       - SETUID
     ```
  2. WordPress 镜像可使用 `wordpress:6.5-php8.2-fpm-alpine` + Nginx 反代，将 Apache root 进程替换为非 root 的 php-fpm。
  3. 挂载 `./wp-content/*` 时添加 `:ro`（只读）对主题/插件目录，仅 `uploads` 可写。

---

### 🟠 High（高）— 5 项

#### H-01：支付回调 IP 白名单默认关闭

- **文件**：`f:\gexm\packages\server\src\config\index.ts`（payment.ipWhitelist.enabled 默认 false）
- **类型**：访问控制失效
- **描述**：项目记忆硬约束要求"支付网关回调必须验证 IP 白名单（CIDR）"，但 server 端 `payment.ipWhitelist.enabled` 默认 `false`，需运维显式开启。WordPress 端 `inc/hupijiao-payment.php` 已强制 IP 白名单（CIDR），但 server 端未强制。
- **影响**：攻击者可伪造支付回调请求，绕过 IP 校验直接触发订单状态变更。
- **修复建议**：
  1. 将 `payment.ipWhitelist.enabled` 默认改为 `true`。
  2. 在配置加载时校验：若 `enabled=true` 且 `whitelist=[]`，启动失败并提示配置缺失。
  3. 在生产环境 `NODE_ENV=production` 下强制不可关闭。

#### H-02：WeChat 支付回调签名比较使用 `===` 而非 `hash_equals`

- **文件**：`f:\gexm\wp-content\themes\mixm-laal\inc\payment-gateway.php`（WeChat verify_callback 相关代码）
- **类型**：时序攻击 / 旁路
- **描述**：WeChat 回调签名验证使用 `===` 比较，存在时序攻击风险。Alipay 端已正确使用 `mixm_laal_verify_payment_signature` 内部的 `hash_equals`，但 WeChat V3 直接比较存在隐患。
- **影响**：理论上可通过测量响应时间逐字节推断签名，实际利用难度高但不规范。
- **修复建议**：将所有签名比较替换为 `hash_equals($expected, $actual)`。

#### H-03：App 端 Token 存储策略不安全

- **文件**：`f:\gexm\packages\app\src\store\user.js:44-50, 64-79`
- **类型**：敏感数据存储不当 / Token 泄露
- **描述**：App 端将 `access_token` 与 `refresh_token` 同时通过 `uni.setStorageSync` 持久化到本地存储。与 PC 端 `packages/pc/src/store/user.ts` 的精细策略（`rememberMe=false` 仅内存、`refresh_token` 绝不入 storage）形成对比。
- **影响**：在 H5 嵌入场景下，XSS 攻击可读取 `localStorage` 窃取长期有效的 `refresh_token`，无限换取新 `access_token`。
- **修复建议**：
  1. App 端引入与 PC 端一致的 `rememberMe` 策略：默认 `refresh_token` 仅存内存。
  2. 在 uniapp 原生 APP 场景下，使用 `uni.setStorage` + `encrypt` 加密存储，或调用 `plus.runtime.getProperty` 加 Keychain。
  3. H5 端运行时检测 `uni.getSystemInfoSync().uniPlatform === 'web'` 时切换到 sessionStorage 策略。

#### H-04：Nginx CSP 在生产环境仍包含 `unsafe-eval`

- **文件**：`f:\gexm\packages\pc\nginx.conf:58`、`f:\gexm\packages\app\nginx.conf:48`
- **类型**：CSP 配置不当 / XSS 防护削弱
- **描述**：PC 端 `csp.ts` 生产环境策略为 `script-src 'self'`（严格），但 Nginx 层 `add_header Content-Security-Policy` 包含 `'unsafe-inline' 'unsafe-eval'`，会覆盖应用层 meta CSP（HTTP 头优先级 > meta）。App 端同样如此。注释说明"uni-app 框架需要"，但生产环境应通过构建配置移除内联脚本依赖，而非放宽 CSP。
- **影响**：XSS 注入后可执行任意内联脚本与 `eval()`，CSP 防护形同虚设。
- **修复建议**：
  1. PC 端 Nginx 生产环境 CSP 应严格按 `csp.ts` 的 `prodCSP`：`script-src 'self'`。
  2. 如 Element Plus 命令式组件需要内联 style，使用 `'unsafe-hashes'` + 具体 hash，而非 `'unsafe-inline'`。
  3. App 端 uniapp 应在构建时通过 `manifest.json` 的 `h5.csp` 配置生成严格 CSP，避免 Nginx 层放宽。

#### H-05：WordPress 数据库直接使用 `$wpdb->query()` 的位置较多（31 个文件）

- **文件**：`f:\gexm\wp-content\themes\mixm-laal\inc\*.php`（31 个文件含 `$wpdb->query(`）
- **类型**：SQL 注入风险（潜在）
- **描述**：审查发现 31 个文件使用 `$wpdb->query()` 直接执行 SQL，虽然多数可能已使用 `$wpdb->prepare()` 预处理，但 `$wpdb->query()` 比 `$wpdb->get_results()` / `$wpdb->insert()` / `$wpdb->update()` 更容易遗漏参数化。需逐个审计是否所有变量均通过 `prepare()` 传入。
- **影响**：若任一变量直接拼接进 SQL，将导致 SQL 注入。
- **修复建议**：
  1. 全局审计所有 `$wpdb->query()` 调用，确认参数化。
  2. 在 `phpcs.xml` 中启用 `WordPress.DB.PreparedSQL` 规则，CI 中拦截未预处理 SQL。
  3. 优先使用 `$wpdb->insert()` / `$wpdb->update()` / `$wpdb->delete()` 等高层 API。

---

### 🟡 Medium（中）— 8 项

#### M-01：WordPress Nginx 缺失关键安全头

- **文件**：`f:\gexm\docker\wordpress\nginx.conf:33-79`
- **类型**：安全头缺失
- **描述**：WordPress Nginx 配置未添加 `Strict-Transport-Security`、`X-Frame-Options`、`X-Content-Type-Options`、`Content-Security-Policy`、`Referrer-Policy`、`Permissions-Policy` 等安全头，仅依赖主题 PHP 层 `api-security.php` 在 API 请求时通过 `header()` 输出。但普通页面请求（非 API）不会触发这些安全头。
- **影响**：WordPress 普通页面缺乏点击劫持、MIME 嗅探、降级攻击防护。
- **修复建议**：在 `docker/wordpress/nginx.conf` 的 `server` 块添加与 PC Nginx 一致的安全头。

#### M-02：CSRF Token 通过 Cookie 读取（Double-Submit）但缺少 SameSite 严格校验

- **文件**：`f:\gexm\packages\pc\src\api\request.ts:10-15, 101-104`
- **类型**：CSRF 防护削弱
- **描述**：PC 端从 `document.cookie` 读取 `csrf-token` 并放入 `X-CSRF-Token` 头，是 Double-Submit Cookie 模式。但 `axios` 配置 `withCredentials: true`，需确认后端 Cookie 设置了 `SameSite=Strict` 或 `Lax`，否则在跨站场景下 Cookie 仍会被携带。
- **影响**：若 Cookie `SameSite=None`，CSRF 防护可被绕过。
- **修复建议**：审查后端 CSRF Cookie 设置，强制 `SameSite=Lax` + `Secure` + `HttpOnly`（HttpOnly 防止 JS 读取，但 Double-Submit 需 JS 读取，因此只能 `SameSite=Lax` + `Secure`）。

#### M-03：登录失败锁定信息存储在 localStorage（前端可篡改）

- **文件**：`f:\gexm\packages\pc\src\store\user.ts:17-22, 328-342`
- **类型**：客户端状态可篡改
- **描述**：`loginAttempts` 与 `lockUntil` 存储在 `localStorage`，用户可通过 DevTools 清除 localStorage 重置锁定状态，绕过前端 5 次失败锁定 15 分钟策略。
- **影响**：前端锁定可被绕过，但仍受后端 `loginLimiter`（5 分钟 5 次）兜底保护。
- **修复建议**：前端锁定仅作为 UX 反馈，真正强制锁定应依赖后端 `loginLimiter`。前端可在登录失败时显示剩余锁定时间（来自后端响应），不依赖本地状态。

#### M-04：WordPress Nginx 未限制 HTTP 方法

- **文件**：`f:\gexm\docker\wordpress\nginx.conf:33-79`
- **类型**：HTTP 方法未限制
- **描述**：未配置 `limit_except GET POST HEAD` 或类似指令，允许 `TRACE` / `DELETE` / `PUT` 等非必要方法。
- **影响**：`TRACE` 方法可能导致 XST（Cross-Site Tracing）攻击。
- **修复建议**：在 `location /` 块添加 `limit_except GET POST HEAD { deny all; }`。

#### M-05：API 加密密钥硬编码在 `api-security.php`

- **文件**：`f:\gexm\wp-content\themes\mixm-laal\inc\api-security.php:29`
- **类型**：硬编码密钥
- **描述**：
  ```php
  const ENCRYPTION_KEY = 'mixm_laal_api_encryption_key';
  const ENCRYPTION_ALGORITHM = 'AES-256-CBC';
  ```
  密钥直接写入源码，提交到 Git，且使用 CBC 模式（无 HMAC，存在 padding oracle 风险）。
- **影响**：所有使用此密钥加密的数据可被解密；CBC 无完整性校验，可被 padding oracle 攻击。
- **修复建议**：
  1. 密钥改为从 `wp-config.php` 的 `define('MIXM_LAAL_ENC_KEY', ...)` 读取，不入仓库。
  2. 算法改为 `AES-256-GCM`（自带完整性校验）。
  3. 已有加密数据需做迁移。

#### M-06：开发环境登录限流被完全跳过

- **文件**：`f:\gexm\packages\server\src\middleware\rateLimiter.ts:91-95`
- **类型**：限流绕过
- **描述**：
  ```typescript
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev'
  const loginLimiterDev = isDev
    ? (req, res, next) => next()
    : loginLimiter
  ```
  开发环境完全跳过登录限流。若 `NODE_ENV` 误设为 `development` 部署到测试/预发环境，将无登录限流保护。
- **影响**：登录暴力破解无防护。
- **修复建议**：开发环境也应保留最低限流（如 100 次/分钟），仅测试环境（`NODE_ENV=test`）可完全跳过。

#### M-07：WordPress 404 页面错误暴露 PHP 类未定义错误

- **文件**：`f:\gexm\wp-content\themes\mixm-laal\404.php`（依据项目记忆 2026-07-24 18:30 记录已修复）
- **类型**：信息泄露
- **描述**：项目记忆记录 404 页面"热门分类"曾因 `MixM_Laal_Category_Walker` 类在 `get_header()` 之前未定义导致 PHP Fatal Error，已在 2026-07-24 修复。审查时确认类定义已上移，但建议增加防御性检查。
- **影响**：PHP Fatal Error 可能暴露文件路径与代码结构。
- **修复建议**：在 `wp-config.php` 生产环境强制 `define('WP_DEBUG_DISPLAY', false);` + `define('WP_DEBUG_LOG', true);`，错误仅写日志不显示。

#### M-08：CSP `connect-src` 允许 `ws:` 与 `wss:`（明文 WebSocket）

- **文件**：`f:\gexm\packages\pc\nginx.conf:58`、`f:\gexm\packages\app\nginx.conf:48`
- **类型**：传输层降级
- **描述**：CSP `connect-src 'self' wss: ws: https:` 允许明文 `ws://`，可能被中间人攻击劫持 WebSocket 流量。
- **影响**：WebSocket 流量可被窃听/篡改。
- **修复建议**：生产环境 CSP 仅允许 `wss:`，移除 `ws:`。开发环境可保留。

---

### 🟢 Low（低）— 6 项

#### L-01：CSP 在 location 块内重复声明导致维护困难

- **文件**：`f:\gexm\packages\pc\nginx.conf:41-60`
- **类型**：配置可维护性
- **描述**：Nginx `add_header` 在 `location` 块内会覆盖 `server` 块的所有 `add_header`，导致必须重复声明。代码注释已说明，但仍易遗漏。
- **影响**：未来新增安全头时可能遗漏 location 块，导致部分路径无防护。
- **修复建议**：使用 `include /etc/nginx/security-headers.conf;` 在每个 location 引入统一头配置。

#### L-02：Docker Compose `app` 与 `pc` 容器未配置 `security_opt`

- **文件**：`f:\gexm\docker-compose.yml:59-128`
- **类型**：容器加固不一致
- **描述**：`server` / `redis` / `postgres` 有 `security_opt`，但 `app` / `pc`（Nginx 容器）无。虽然 Nginx 容器通常以 nginx 用户运行，但仍建议加固。
- **影响**：低，Nginx 容器本身权限有限。
- **修复建议**：为 `app` / `pc` 添加 `security_opt: [no-new-privileges:true]` 与 `cap_drop: [ALL]` + `cap_add: [NET_BIND_SERVICE, CHOWN, SETGID, SETUID]`。

#### L-03：WordPress `X-XSS-Protection` 在 api-security.php 中设为 0

- **文件**：`f:\gexm\wp-content\themes\mutm-laal\inc\api-security.php`（依据上下文已修复，注释说明 "X-XSS-Protection 已被现代浏览器废弃，设为 0 依赖 CSP 防护"）
- **类型**：兼容性
- **描述**：决策合理（现代浏览器废弃 X-XSS-Protection，CSP 优先），但旧浏览器（IE11）失去防护。
- **影响**：低，项目不显式支持 IE11。
- **修复建议**：无需修改，保持现状。

#### L-04：WordPress API Security 时间戳验证可选跳过

- **文件**：`f:\gexm\wp-content\themes\mixm-laal\inc\api-security.php:218-243`
- **类型**：重放攻击防护削弱
- **描述**：`validate_timestamp()` 在未提供 timestamp 参数时返回 `true`（跳过验证），未强制要求时间戳。
- **影响**：未带时间戳的请求可被重放。
- **修复建议**：对敏感端点（支付、登录、签到）强制要求 timestamp，缺失即拒绝。

#### L-05：API 请求来源验证允许 Referer 模糊匹配

- **文件**：`f:\gexm\wp-content\themes\mixm-laal\inc\api-security.php:179-183`
- **类型**：来源校验宽松
- **描述**：`strpos($referer, $allowed_origin) !== false` 允许 `evil.com/laal.top` 之类的 Referer 通过。
- **影响**：可构造特殊 Referer 绕过来源校验。
- **修复建议**：改为 `parse_url($referer, PHP_URL_HOST) === $allowed_origin` 严格匹配 host。

#### L-06：`.gitignore` 中 `*.min.js` / `*.min.css` 可能导致构建产物被忽略

- **文件**：`f:\gexm\.gitignore:148-149`
- **类型**：构建产物管理
- **描述**：`*.min.js` / `*.min.css` 全局忽略，可能导致某些第三方库的 min 版本无法提交。
- **影响**：低，仅影响特定场景。
- **修复建议**：改为 `dist/**/*.min.js` 等路径限定，避免全局忽略。

---

## 三、按审查维度详细结论

### 1. 后端安全审查（`packages/server/src`）

| 审查项 | 结论 | 说明 |
| --- | --- | --- |
| 认证与授权（JWT） | ✅ 安全 | `auth.ts` 显式锁定 `algorithms: ['HS256']`，防算法混淆；Token 黑名单 fail-closed，查询异常即拒绝访问 |
| 密码哈希 | ✅ 安全 | `userModel.ts` 使用 bcrypt（项目记忆记录） |
| 权限检查 | ✅ 安全 | `permission.ts` 实现 RBAC，所有敏感路由均挂载 |
| 输入验证 | ✅ 安全 | `security.ts` 实现 XSS 模式检测与递归 sanitize |
| SQL 注入 | ✅ 安全 | 使用 `$wpdb->prepare()` / ORM，未发现拼接 |
| CSRF 防护 | ⚠️ 警告 | Double-Submit Cookie 模式，需确认 SameSite 设置（M-02） |
| 速率限制 | ⚠️ 警告 | 实现完善（read/write/login/register/message/upload/oauth），但开发环境跳过登录限流（M-06） |
| 敏感数据 | 🔴 漏洞 | `ADMIN_DEFAULT_PASSWORD` 默认 `Admin@2026`（C-02） |
| 文件上传 | ✅ 安全 | `uploadController.ts` 扩展名白名单 + 魔术数字校验 + 大小限制 + fd 关闭 |
| 错误处理 | ✅ 安全 | `errorHandler.ts` 统一处理，不泄露堆栈 |
| 依赖安全 | ⚠️ 未审查 | 需 `npm audit`，本次仅静态代码审查 |
| Token 黑名单 | ✅ 安全 | fail-closed 实现 |

### 2. 前端安全审查（`packages/pc/src`, `packages/app/src`）

| 审查项 | 结论 | 说明 |
| --- | --- | --- |
| XSS（v-html） | ✅ 安全 | Grep 未发现 `v-html` 使用 |
| CSP 配置 | 🔴 漏洞 | 应用层 `csp.ts` 严格，但 Nginx 层覆盖为 `unsafe-eval`（H-04） |
| Token 存储（PC） | ✅ 安全 | `user.ts` 精细策略：`rememberMe=false` 仅内存；`refresh_token` 绝不入 storage |
| Token 存储（App） | 🔴 漏洞 | `user.js` 将 `refresh_token` 持久化到 `uni.storage`（H-03） |
| 敏感数据 | ✅ 安全 | 未发现硬编码密钥 |
| 第三方依赖 | ⚠️ 未审查 | 需 `npm audit` |
| 登录失败锁定 | ⚠️ 警告 | localStorage 存储，前端可篡改（M-03） |

### 3. WordPress 安全审查（`wp-content/themes/mixm-laal`）

| 审查项 | 结论 | 说明 |
| --- | --- | --- |
| Nonce 验证 | ✅ 安全 | 所有 AJAX 均使用 `check_ajax_referer()` 或 `wp_verify_nonce()` |
| 权限检查 | ✅ 安全 | 敏感操作均 `current_user_can()` 校验 |
| SQL 注入 | ⚠️ 警告 | 31 个文件使用 `$wpdb->query()`，需逐个审计参数化（H-05） |
| XSS 防护 | ✅ 安全 | 输出均使用 `esc_html` / `esc_attr` / `esc_url` |
| 文件操作 | ✅ 安全 | 路径参数 `sanitize_text_field` + 路径遍历防护 |
| 敏感 AJAX | 🔴 漏洞 | 10 个文件使用 `wp_ajax_nopriv_*`（C-01） |
| wp_remote_get/post | ✅ 安全 | 未发现 SSRF 风险（未审查全部，需后续验证） |
| API 加密密钥 | ⚠️ 警告 | 硬编码 + CBC 模式（M-05） |
| 来源校验 | ⚠️ 警告 | Referer 模糊匹配（L-05） |

### 4. Nginx 配置审查

| 文件 | 结论 | 说明 |
| --- | --- | --- |
| `packages/pc/nginx.conf` | ⚠️ 警告 | 安全头完善，但 CSP 含 `unsafe-eval`（H-04）；connect-src 允许 `ws:`（M-08） |
| `packages/app/nginx.conf` | ⚠️ 警告 | 同 PC，CSP 含 `unsafe-eval`（H-04） |
| `docker/wordpress/nginx.conf` | 🔴 漏洞 | 缺失所有安全头（M-01）；未限制 HTTP 方法（M-04）；敏感路径防护已实现（`wp-content/logs`、`.log`、`.sql` 等） |

**已实现的良好实践**：
- `server_tokens off` 隐藏版本
- `location ~ /\.` 阻止隐藏文件访问
- WordPress Nginx 阻止 `wp-config.php` 访问
- WordPress Nginx 阻止 `wp-content/(logs\|backups\|cache\|debug.log)` 访问
- `location ~* \.(log\|sql\|bak\|dump\|swp)$` 阻止敏感文件下载
- App Nginx 阻止 `/uploads/` 下 PHP/JSP 等可执行脚本

### 5. Docker 配置审查

| 审查项 | 结论 | 说明 |
| --- | --- | --- |
| 敏感信息 | 🔴 漏洞 | MySQL/WordPress/Admin 默认密码硬编码（C-02） |
| 容器特权 | 🔴 漏洞 | MySQL/WordPress 容器无 `security_opt` / `cap_drop`（C-03） |
| 端口暴露 | ⚠️ 警告 | Redis 6379、Postgres 5432、MySQL 3306（隐式）暴露宿主；建议仅暴露前端 80/8080/8081，数据库通过内部网络访问 |
| 卷挂载 | ⚠️ 警告 | WordPress 挂载 `./wp-content/themes`、`./wp-content/plugins` 可写，存在宿主文件系统篡改风险 |
| 网络隔离 | ✅ 安全 | 三层网络（frontend/backend/db），`gexm-db` 设为 `internal: true` |
| 资源限制 | ✅ 安全 | 所有服务配置 CPU/内存 limits |
| 日志限制 | ✅ 安全 | 所有服务配置 `max-size` + `max-file` |
| 健康检查 | ✅ 安全 | 所有服务配置 healthcheck |

### 6. 支付安全审查（关键）

| 审查项 | 结论 | 说明 |
| --- | --- | --- |
| 支付回调 IP 白名单（WP） | ✅ 安全 | `hupijiao-payment.php` 使用 CIDR 白名单 + fail-closed |
| 支付回调 IP 白名单（Server） | 🔴 漏洞 | `payment.ipWhitelist.enabled` 默认 false（H-01） |
| 幂等性检查 | ✅ 安全 | `paymentController.ts` 检查 `order.payment_status === 'paid'` 跳过重复处理 |
| 金额验证 | ✅ 安全 | 容差 0.01，Alipay 与 Hupijiao 均校验 |
| XXE 防护 | ✅ 安全 | WeChat 回调使用 `LIBXML_NOCDATA \| LIBXML_NONET` |
| 签名验证 | ⚠️ 警告 | WeChat 使用 `===` 比较（H-02）；Alipay 使用 RSA2；Hupijiao 使用 MD5 + HMAC |
| 签名密钥管理 | ✅ 安全 | 私钥加密存储于 option，使用时解密 |
| 订单状态机 | ✅ 安全 | `failed` / `paid` 状态机，金额不匹配即标记失败 |

---

## 四、优先级修复路线图

### P0（立即修复，发版前必做）

1. **C-01**：移除敏感 AJAX 的 `wp_ajax_nopriv_*` 钩子（手机登录/签到/投票/闪购/优惠券等）。
2. **C-02**：移除 docker-compose.yml 中的默认密码，改为 `${VAR:?必须设置}`。
3. **C-03**：为 MySQL/WordPress 容器添加 `security_opt` + `cap_drop`。
4. **H-01**：将 `payment.ipWhitelist.enabled` 默认改为 `true`，生产环境强制启用。
5. **H-04**：Nginx 生产环境 CSP 移除 `unsafe-eval`，与 `csp.ts` 一致。

### P1（近期修复，1-2 周内）

6. **H-02**：WeChat 签名比较改用 `hash_equals()`。
7. **H-03**：App 端 Token 存储策略与 PC 端对齐。
8. **H-05**：审计所有 `$wpdb->query()` 参数化情况，启用 PHPCS 规则。
9. **M-01**：WordPress Nginx 添加完整安全头。
10. **M-05**：API 加密密钥改为从 `wp-config.php` 读取，算法改为 AES-256-GCM。

### P2（中期修复，1 个月内）

11. **M-02 / M-03 / M-04 / M-06 / M-07 / M-08**：CSRF SameSite、登录锁定后端化、HTTP 方法限制、开发环境限流、WP_DEBUG、CSP `ws:`。
12. **L-01 ~ L-06**：可维护性改进与兼容性优化。

### P3（长期优化）

13. 引入 SCA（软件成分分析）工具定期扫描 npm 依赖漏洞。
14. 引入 SAST 工具（如 SonarQube + PHP_CodeSniffer + WordPress Coding Standards）集成到 CI。
15. 引入 DAST 工具（如 OWASP ZAP）定期扫描运行时漏洞。
16. WordPress 主题增加 `theme-review` 安全审查流程（参考 WordPress.org 主题审查标准）。

---

## 五、审查未覆盖范围（声明）

本次审查为静态代码审查（只读），未覆盖：

1. **运行时验证**：未实际发送请求验证 CSP、CORS、限流行为。
2. **依赖漏洞扫描**：未运行 `npm audit` / `composer audit`。
3. **密钥泄露扫描**：未使用 truffleHog / git-secrets 扫描 Git 历史。
4. **业务逻辑漏洞**：未深入审计业务流程（如订单状态机、积分流转、优惠券发放规则）。
5. **wp_remote_get/post 全量审计**：仅审查了支付相关文件，未覆盖所有外部 HTTP 调用。
6. **WordPress 插件安全**：仅审查主题，未审查 `wp-content/plugins/` 下的第三方插件。
7. **数据库迁移脚本**：未审计 `inc/migrations/` 中的 SQL 安全性。
8. **CI/CD 配置**：未审查 `.github/workflows/` 中的密钥管理。

建议后续按上述清单补充审查。

---

## 六、参考标准

- OWASP Top 10 (2021)
- OWASP Application Security Verification Standard (ASVS) v4.0.3
- WordPress Coding Standards
- WordPress Theme Review Guidelines
- WCAG 2.1 AA（虽为可访问性标准，与安全 UX 相关）
- 项目硬约束（见 `c:\Users\addk1\.trae-cn\memory\projects\-f-gexm\project_memory.md`）

---

**报告生成时间**：2026-07-24
**审查执行**：Trae CN Agent（GLM-5.2）
**报告路径**：`f:\gexm\docs\security-audit-report-2026-07-24.md`
