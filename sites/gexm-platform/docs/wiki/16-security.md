# 16. 安全规范

> 本章详细描述 `gexm-platform` 的安全规范，覆盖输入验证、输出净化、CSRF/XSS/SQL 注入防护、权限与 RBAC、支付安全、数据脱敏、密钥管理、网关防护、Trae CN AI Agent 资源管控等。所有路径以 `file:///` 协议给出。

---

## 16.1 安全总览

### 16.1.1 安全设计原则

1. **纵深防御**：在 Nginx、Express 中间件、业务逻辑、数据库、主题 PHP 多层防护
2. **最小权限**：用户、服务、容器仅授予完成任务所需的最小权限
3. **默认安全**：所有安全开关默认启用（如 `LOG_MASK_SENSITIVE_DATA` 在生产默认 true）
4. **零信任**：所有外部输入（用户、第三方回调、AI Agent）均需验证
5. **可审计**：所有敏感操作记录审计日志，可追溯

### 16.1.2 安全模块清单

| 模块 | 路径 | 作用 |
| --- | --- | --- |
| Helmet 中间件 | [middleware/security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) | HTTP 安全头 |
| CORS | [app.ts](file:///f:/gexm/packages/server/src/app.ts) | 跨域白名单 |
| CSRF | [middleware/csrfConfig.ts](file:///f:/gexm/packages/server/src/middleware/csrfConfig.ts) | CSRF Token |
| Auth | [middleware/auth.ts](file:///f:/gexm/packages/server/src/middleware/auth.ts) | JWT 认证 |
| Permission | [middleware/permission.ts](file:///f:/gexm/packages/server/src/middleware/permission.ts) | RBAC 权限 |
| Rate Limit | [middleware/rateLimiter.ts](file:///f:/gexm/packages/server/src/middleware/rateLimiter.ts) | 速率限制 |
| IP Whitelist | [middleware/ipWhitelist.ts](file:///f:/gexm/packages/server/src/middleware/ipWhitelist.ts) | IP/CIDR 白名单 |
| Data Masking | [middleware/dataMasking.ts](file:///f:/gexm/packages/server/src/middleware/dataMasking.ts) | 数据脱敏 |
| Audit | [middleware/auditMiddleware.ts](file:///f:/gexm/packages/server/src/middleware/auditMiddleware.ts) | 审计日志 |
| Sensitive Action | [middleware/sensitiveAction.ts](file:///f:/gexm/packages/server/src/middleware/sensitiveAction.ts) | 敏感操作二次验证 |
| Validate ID | [middleware/validateId.ts](file:///f:/gexm/packages/server/src/middleware/validateId.ts) | 路径参数 ID 校验 |
| Validate Schema | [middleware/validateSchema.ts](file:///f:/gexm/packages/server/src/middleware/validateSchema.ts) | Zod Schema 校验 |
| XSS Filter | `xss` 包 | XSS 过滤 |

---

## 16.2 输入验证

### 16.2.1 输入验证分层

```
[用户输入]
    │
    ▼
[1. 类型校验]  - validateSchema (Zod)
    │
    ▼
[2. 业务校验]  - Controller / Service
    │
    ▼
[3. 净化]      - sanitize_text_field / intval / absint
    │
    ▼
[4. SQL 预处理] - $wpdb->prepare / parameterized query
    │
    ▼
[数据库]
```

### 16.2.2 Express 端输入验证

#### Zod Schema 校验

**文件**：[packages/server/src/middleware/validateSchema.ts](file:///f:/gexm/packages/server/src/middleware/validateSchema.ts)

```typescript
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(128),
  captcha: z.string().length(4).optional(),
})

export function validateSchema(schema: z.ZodSchema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return response.fail(res, 'VALIDATION_ERROR', result.error.message, 400)
    }
    req.validatedBody = result.data
    next()
  }
}
```

#### 路径参数 ID 校验

**文件**：[packages/server/src/middleware/validateId.ts](file:///f:/gexm/packages/server/src/middleware/validateId.ts)

```typescript
export function validateId(paramName = 'id') {
  return (req, res, next) => {
    const id = Number(req.params[paramName])
    if (!Number.isInteger(id) || id <= 0) {
      return response.fail(res, 'INVALID_ID', `Invalid ${paramName}`, 400)
    }
    req.params[paramName] = String(id)  // 防止 SQL 注入
    next()
  }
}
```

### 16.2.3 WordPress 端输入验证

| 场景 | 函数 |
| --- | --- |
| 文本输出（HTML 上下文） | `esc_html()` |
| 属性输出 | `esc_attr()` |
| URL 输出 | `esc_url()` |
| 富文本输出 | `wp_kses_post()` |
| 用户输入净化 | `sanitize_text_field()` |
| 整数输入 | `intval()` / `absint()` |
| URL 输入存储 | `esc_url_raw()` |
| 邮箱输入 | `sanitize_email()` |
| 文件名 | `sanitize_file_name()` |
| `$_SERVER` 超全局 | `wp_unslash(sanitize_text_field(...))` |

**示例**：

```php
// 安全的 URL 输出
echo '<a href="' . esc_url($url) . '">' . esc_html($text) . '</a>';

// 安全的 $_SERVER 访问
$remote_ip = isset($_SERVER['REMOTE_ADDR'])
    ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR']))
    : '';
```

---

## 16.3 输出净化

### 16.3.1 XSS 防护

#### Express 端

使用 `xss` 包过滤 HTML：

```typescript
import xss from 'xss'

const cleanHtml = (html: string) => xss(html, {
  whiteList: { a: ['href', 'title'], p: [], br: [] },
  stripIgnoreTag: true,
})
```

#### WordPress 端

```php
// 富文本输出（保留安全标签）
echo wp_kses_post($post->post_content);

// 纯文本输出
echo esc_html($user_input);

// 属性输出
echo '<input value="' . esc_attr($value) . '">';
```

### 16.3.2 HTTP 安全响应头

通过 Helmet 中间件统一设置：

| 头部 | 值 | 作用 |
| --- | --- | --- |
| `X-Frame-Options` | `DENY` | 防止点击劫持 |
| `X-Content-Type-Options` | `nosniff` | 防止 MIME 嗅探 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 控制 Referer |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | 限制浏览器 API |
| `X-XSS-Protection` | `1; mode=block` | 旧版浏览器 XSS 过滤 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS（HTTPS 强制） |
| `Content-Security-Policy` | 配置中 | CSP 策略 |

---

## 16.4 SQL 注入防护

### 16.4.1 WordPress 端（$wpdb）

**文件**：[wp-content/themes/mixm-laal/functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php)

#### $wpdb 表名使用规范

```php
/**
 * 1. 动态表名变量通过 $wpdb->prefix . '硬编码字符串' 构造，不接收用户输入
 * 2. $wpdb->prefix 是 WordPress 核心可信值
 * 3. 用户输入条件必须用 $wpdb->prepare() 或 in_array() 白名单
 * 4. $wpdb->insert/update/delete 内部已自动 prepare
 */
$table_name = $wpdb->prefix . 'mixm_laal_api_keys';  // 安全

// 用户输入条件必须 prepare
$results = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM {$table_name} WHERE user_id = %d AND status = %s",
    $user_id,
    $status
));

// ORDER BY 用白名单
$allowed_orderby = ['created_at', 'updated_at', 'id'];
$orderby = in_array($_GET['orderby'] ?? '', $allowed_orderby, true)
    ? $_GET['orderby']
    : 'created_at';
```

#### 集中式表存在检查

按 `project_memory.md` 约定，使用 `mixm_laal_ensure_table_exists` 函数 + 静态缓存 + prepared statement：

```php
function mixm_laal_ensure_table_exists($table_name, $ddl) {
    static $checked = [];

    if (isset($checked[$table_name])) {
        return $checked[$table_name];
    }

    global $wpdb;
    $exists = $wpdb->get_var($wpdb->prepare(
        "SHOW TABLES LIKE %s",
        $table_name
    ));

    if (!$exists) {
        dbDelta($ddl);
    }

    $checked[$table_name] = true;
    return true;
}
```

### 16.4.2 Express 端（IDbClient）

使用 prepared statement：

```typescript
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
const user = stmt.get(userId)  // 参数化查询
```

或使用 Zod 校验后传入：

```typescript
const schema = z.object({ id: z.number().int().positive() })
const { id } = schema.parse(req.params)
const user = await userModel.findById(id)
```

---

## 16.5 CSRF 防护

### 16.5.1 Express 端 CSRF

**文件**：[packages/server/src/middleware/csrfConfig.ts](file:///f:/gexm/packages/server/src/middleware/csrfConfig.ts)

```typescript
import csrf from 'csurf'

export const csrfOptions = {
  cookie: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  },
  signed: true,
  key: 'csrf',
}

export const csrfProtection = csrf(csrfOptions)

// 下发 CSRF Token
export function csrfTokenMiddleware(req, res, next) {
  res.cookie('csrf', req.csrfToken(), { httpOnly: false })  // 前端 JS 可读
  next()
}

// 路由级双重校验
export function getCsrfMiddleware(routeName: string) {
  return (req, res, next) => {
    // 自定义校验逻辑（如基于 routeName 的差异化处理）
    csrfProtection(req, res, next)
  }
}
```

### 16.5.2 豁免路由

按 `project_memory.md` 约定，以下路由豁免 CSRF：

- `/api/v1/auth/login`、`/api/v1/auth/refresh`、`/api/v1/auth/register`
- `/api/v1/monitoring/*`（监控）
- `/api/v1/dualWrite/*`（双写）
- `/api/v1/language/*`（语言切换）
- `/api/v1/oauth/*`（OAuth 回调）
- `/api/v1/performance/*`（性能指标）
- `/api/v1/payment/notify/*`（支付回调，使用签名校验替代）

### 16.5.3 WordPress 端 CSRF

所有 AJAX 使用 `mixm_laal_nonce`：

```php
// 生成 nonce
$nonce = wp_create_nonce('mixm_laal_nonce');

// 校验 nonce
if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'mixm_laal_nonce')) {
    wp_die('Security check failed', 403);
}
```

---

## 16.6 权限与 RBAC

### 16.6.1 Express 端 RBAC

**文件**：[packages/server/src/middleware/permission.ts](file:///f:/gexm/packages/server/src/middleware/permission.ts)

```typescript
export function checkPermission(permission: string) {
  return (req, res, next) => {
    if (!req.user?.permissions?.includes(permission)) {
      auditMiddleware.log(req, 'PERMISSION_DENIED', { permission })
      return response.fail(res, 'FORBIDDEN', '权限不足', 403)
    }
    next()
  }
}

export function checkAnyPermission(...permissions: string[]) { /* ... */ }
export function checkAllPermissions(...permissions: string[]) { /* ... */ }
export function requireRole(...roles: string[]) { /* ... */ }
```

### 16.6.2 权限命名约定

权限采用 `<module>:<action>` 格式：

| 模块 | 权限示例 |
| --- | --- |
| 用户 | `user:read`、`user:write`、`user:delete` |
| 订单 | `order:read`、`order:write`、`order:refund` |
| 商品 | `product:read`、`product:write`、`product:delete` |
| 财务 | `finance:read`、`finance:audit`、`finance:reconcile` |
| 系统 | `system:config`、`system:audit`、`system:backup` |

### 16.6.3 WordPress 端权限

```php
// 后台操作权限
if (!current_user_can('edit_posts')) {
    wp_die('权限不足', 403);
}

// 管理员操作
if (!current_user_can('manage_options')) {
    wp_die('权限不足', 403);
}
```

### 16.6.4 敏感操作二次验证

**文件**：[packages/server/src/middleware/sensitiveAction.ts](file:///f:/gexm/packages/server/src/middleware/sensitiveAction.ts)

- 修改密码、修改邮箱、删除账号、修改权限、数据库迁移等操作需二次验证
- 通过短信验证码、邮箱验证码、TOTP 二次确认

---

## 16.7 速率限制

**文件**：[packages/server/src/middleware/rateLimiter.ts](file:///f:/gexm/packages/server/src/middleware/rateLimiter.ts)

### 16.7.1 限制策略

| 类型 | 窗口 | 最大次数 | 适用场景 |
| --- | --- | --- | --- |
| 全局 | 15 分钟 | 100 | 默认所有路由 |
| 登录 | 5 分钟 | 5 | `/api/v1/auth/login` |
| 注册 | 1 小时 | 3 | `/api/v1/auth/register` |
| 敏感操作 | 1 小时 | 5 | 修改密码、支付等 |
| 文件上传 | 1 分钟 | 10 | `/api/v1/upload` |
| AI Agent | 1 分钟 | 20 | `/api/v1/agent/chat` |

### 16.7.2 用户标识

- 登录用户：`req.user.id`
- 匿名用户：`req.ip`（`X-Forwarded-For` 需通过 `app.set('trust proxy', 1)` 信任）

### 16.7.3 测试环境跳过

```typescript
if (process.env.NODE_ENV === 'test') {
  // 跳过速率限制，避免测试超时
  return (req, res, next) => next()
}
```

---

## 16.8 支付安全

### 16.8.1 IP 白名单

**文件**：[packages/server/src/middleware/ipWhitelist.ts](file:///f:/gexm/packages/server/src/middleware/ipWhitelist.ts)

```typescript
import { mixm_laal_ip_match_cidr } from '...'

export function ipWhitelist(allowedCidrs: string[]) {
  return (req, res, next) => {
    const clientIp = req.ip
    const matched = allowedCidrs.some(cidr => matchCidr(clientIp, cidr))
    if (!matched) {
      return res.status(403).json({ error: 'IP not allowed' })
    }
    next()
  }
}
```

各支付平台 IP 白名单（CIDR）：

| 平台 | 官方 IP 范围参考 |
| --- | --- |
| 支付宝 | https://opendocs.alipay.com/open/00a8bj |
| 微信支付 | https://pay.weixin.qq.com/doc/v3/merchant/4012791522 |
| PayPal | https://developer.paypal.com/api/rest/webhooks/ |
| Stripe | https://stripe.com/docs/ips |

### 16.8.2 签名验证

| 平台 | 算法 | 实现 |
| --- | --- | --- |
| 支付宝 | RSA2 | `crypto.verify('RSA-SHA256', data, publicKey, sign)` |
| 微信支付 | HMAC-SHA256 | `crypto.createHmac('sha256', apiKey).update(data).digest('hex')` |
| PayPal | Webhook Signature | PayPal API 验签 |
| Stripe | Webhook Signature | `stripe.webhooks.constructEvent(payload, sig, secret)` |

### 16.8.3 幂等性检查

按 `project_memory.md` 约定，所有支付回调必须实现幂等性检查，防止重复处理：

```php
// WordPress 端
$exists = $wpdb->get_var($wpdb->prepare(
    "SELECT COUNT(*) FROM {$wpdb->prefix}mixm_laal_payment_logs
     WHERE order_id = %s AND trade_no = %s AND status = 'success'",
    $order_id, $trade_no
));
if ($exists > 0) {
    return ['code' => 0, 'message' => '已处理'];
}
```

```typescript
// Express 端
const existing = await paymentLogModel.findOne({
  where: { orderId, tradeNo, status: 'success' }
})
if (existing) {
  return response.success(res, existing, '已处理')
}
```

### 16.8.4 金额校验

按 `project_memory.md` 约定，回调金额必须与订单金额匹配，误差 ≤ 0.01：

```typescript
const expectedAmount = order.totalAmount
const receivedAmount = callback.totalAmount
if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
  throw new Error(`Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`)
}
```

### 16.8.5 XML 解析安全（XXE 防护）

按 `project_memory.md` 约定，XML 解析必须禁用外部实体加载：

```php
// WordPress 端
$previous = libxml_disable_entity_loader(true);
$xml = simplexml_load_string($xmlString);
libxml_disable_entity_loader($previous);
```

### 16.8.6 动作白名单

```php
$allowed_actions = ['create', 'query', 'refund', 'close'];
if (!in_array($action, $allowed_actions, true)) {
    wp_die('Invalid action', 400);
}
```

---

## 16.9 数据脱敏

**文件**：[packages/server/src/middleware/dataMasking.ts](file:///f:/gexm/packages/server/src/middleware/dataMasking.ts)

### 16.9.1 脱敏规则

| 字段类型 | 正则 | 替换 |
| --- | --- | --- |
| 手机号 | `/(\d{3})\d{4}(\d{4})/` | `$1****$2` |
| 邮箱 | `/(\w{1,3})@(\w+)/` | `$1***@$2` |
| 身份证 | `/(\d{4})\d{10}(\w{4})/` | `$1**********$2` |
| 银行卡 | `/(\d{4})\d{8,12}(\d{4})/` | `$1********$2` |
| 密码 | `*` | `********` |
| Token / Bearer | `*` | `***` |
| IP 地址 | 末位脱敏 | `192.168.1.***` |

### 16.9.2 日志脱敏

日志通过 `LOG_MASK_SENSITIVE_DATA=true`（生产默认）启用，所有 `logger.*` 调用自动应用脱敏规则。

### 16.9.3 响应脱敏

通过 `dataMasking` 中间件统一处理响应数据：

```typescript
app.use(dataMasking({
  fields: ['phone', 'email', 'idCard', 'bankCard', 'password', 'token'],
  patterns: { /* 见上表 */ },
}))
```

---

## 16.10 密钥管理

### 16.10.1 密钥清单

| 密钥 | 用途 | 长度要求 |
| --- | --- | --- |
| `JWT_SECRET` | Access Token 签名 | ≥ 32 字符 |
| `JWT_REFRESH_SECRET` | Refresh Token 签名 | ≥ 32 字符 |
| `CSRF_SECRET` | CSRF Token | ≥ 32 字符 |
| `PII_ENCRYPTION_KEY` | PII 数据加密 | 32 字节（Base64） |
| `PAYMENT_SECRET` | 支付签名 | ≥ 32 字符 |
| `OPENAI_API_KEY` | OpenAI 调用 | OpenAI 提供 |
| `STRIPE_SECRET_KEY` | Stripe 调用 | Stripe 提供 |
| `PAYPAL_CLIENT_SECRET` | PayPal 调用 | PayPal 提供 |

### 16.10.2 密钥强度校验

**文件**：[packages/server/src/config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts)

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
      throw new Error(`Insufficient key strength`)
    }
  }
  return true
}
```

### 16.10.3 密钥生成

```bash
# Hex（64 字符）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 16.10.4 PII 加密

**文件**：[packages/server/src/utils/crypto.ts](file:///f:/gexm/packages/server/src/utils/crypto.ts)

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

export function encryptPII(text: string): string {
  const key = Buffer.from(config.pii.encryptionKey, 'base64')
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptPII(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':')
  const key = Buffer.from(config.pii.encryptionKey, 'base64')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

---

## 16.11 网关与路径防护

### 16.11.1 Nginx 屏蔽

**文件**：[infra/nginx/conf.d/gexm.conf](file:///f:/gexm/infra/nginx/conf.d/gexm.conf)

```nginx
# 屏蔽敏感路径
location ~* /(logs|backups|cache)/ {
    deny all;
    return 404;
}

location ~* \.(log|sql|bak|dump)$ {
    deny all;
    return 404;
}

# 屏蔽隐藏文件
location ~ /\. {
    deny all;
    return 404;
}
```

### 16.11.2 Apache .htaccess

按 `project_memory.md` 约定，Apache `.htaccess` 必须：
- Referer 白名单：`localhost`、`127.0.0.1`、`laal.top`、`*.laal.top`
- 屏蔽敏感目录：`PEM_Privatekey/`、`certs/`、`backups/`、`logs/`、`cache/`

### 16.11.3 WordPress 容器挂载隔离

按 `project_memory.md` 约定，WordPress 容器**仅挂载 `wp-content` 目录**，避免暴露 monorepo 敏感文件：

```yaml
volumes:
  - ./wp-content:/var/www/html/wp-content
```

### 16.11.4 URL `module` 参数白名单

按 `project_memory.md` 约定，URL `module` 参数需通过 37 项白名单校验，防止注入攻击：

```php
$allowed_modules = [
    'social', 'community', 'forum', 'shop', 'video',
    'webmaster', 'bottle', 'site', 'crawler', 'api',
    'mobile', 'app', 'xinzj', 'payment',
    // ... 共 37 项
];

if (!in_array($module, $allowed_modules, true)) {
    wp_die('Invalid module', 400);
}
```

---

## 16.12 日志安全

### 16.12.1 日志文件保护

按 `project_memory.md` 约定：

- 日志目录自动生成 `.htaccess`（Apache 2.2+ 兼容）和 `index.html`
- 日志文件 10MB 大小轮转，`LOCK_EX` 保证并发写安全
- 写日志必须检查 `mkdir`、`file_put_contents`、`rename` 返回值
- 日志条目字段长度限制，防止超大日志注入

### 16.12.2 日志写入示例

```php
function mixm_laal_log_secure($message, $level = 'info') {
    $log_dir = WP_CONTENT_DIR . '/uploads/mixm-laal-logs';

    if (!file_exists($log_dir)) {
        if (!mkdir($log_dir, 0755, true)) {
            return false;
        }
        // 生成 .htaccess 和 index.html
        file_put_contents($log_dir . '/.htaccess', "Deny from all\n");
        file_put_contents($log_dir . '/index.html', '');
    }

    $log_file = $log_dir . '/app-' . date('Y-m-d') . '.log';

    // 10MB 轮转
    if (file_exists($log_file) && filesize($log_file) > 10 * 1024 * 1024) {
        $rotated = $log_file . '.' . time();
        if (!rename($log_file, $rotated)) {
            return false;
        }
    }

    $entry = sprintf(
        "[%s] [%s] [%s] %s\n",
        date('c'),
        strtoupper($level),
        sanitize_text_field($message),
        wp_get_current_user()->ID ?: '-'
    );

    // 限制单条日志长度
    if (strlen($entry) > 4096) {
        $entry = substr($entry, 0, 4096) . "...\n";
    }

    return file_put_contents($log_file, $entry, FILE_APPEND | LOCK_EX);
}
```

---

## 16.13 社交模块安全

按 `project_memory.md` 约定：

- 点赞数使用 `GREATEST(likes_count - 1, 0)` 防止负数
- Post ID 必须验证存在性
- 隐私级别验证白名单：`['public', 'friends', 'private']`
- 好友关系数据库操作使用事务
- JSON 解析用户输入必须包含错误处理

---

## 16.14 文件操作安全

按 `project_memory.md` 约定：

- 路径参数必须净化，防止路径遍历攻击
- 文件上传必须通过 `wp_handle_upload()` 处理，限制 MIME 类型
- 远程文件下载必须验证源，防止中间人攻击
- 文件名使用 `sanitize_file_name()` 净化

```php
// 路径遍历防护
$filename = sanitize_file_name($_GET['file'] ?? '');
$path = realpath(UPLOAD_DIR . '/' . $filename);
if (strpos($path, UPLOAD_DIR) !== 0) {
    wp_die('Invalid file path', 400);
}
```

---

## 16.15 Trae CN AI Agent 资源管控

**文件**：[.trae/rules/task-scheduling-rules.md](file:///f:/gexm/.trae/rules/task-scheduling-rules.md)

### 16.15.1 强制规则

- **资源密集型任务串行执行**：lint、test、build、docker build、migrate、E2E 严禁并行启动
- **ESLint 必须通过 `lint-guarded.js` 包装**：禁止直接调用 `npx eslint` 或 `eslint packages/`
- **并行 Agent 调用 lint 的处理**：由主 Agent 统一调度，子 Agent 使用 `Read` / `SearchCodebase` / `Grep` 而非 ESLint

### 16.15.2 CPU 占用门槛

| CPU 占用 | 允许操作 |
| --- | --- |
| < 50% | 任意资源密集型任务 |
| 50% - 80% | lint / test；禁止 build / docker build |
| > 80% | 仅 Read / Search / Grep |
| > 90% | 自动停止 eslint 进程 |

### 16.15.3 监控脚本

**文件**：[scripts/monitor-cpu.ps1](file:///f:/gexm/scripts/monitor-cpu.ps1)

```powershell
# 后台启动 CPU 监控（DryRun 模式）
powershell -ExecutionPolicy Bypass -File f:\gexm\scripts\monitor-cpu.ps1 `
    -IntervalSeconds 30 -AlertThreshold 80 -CriticalThreshold 90 -DryRun `
    -LogPath f:\gexm\logs\cpu-monitor.jsonl
```

---

## 16.16 安全审计

### 16.16.1 审计日志

**文件**：[packages/server/src/middleware/auditMiddleware.ts](file:///f:/gexm/packages/server/src/middleware/auditMiddleware.ts)

```typescript
export function auditMiddleware(req, res, next) {
  const startTime = Date.now()

  res.on('finish', () => {
    const auditLog = {
      timestamp: new Date().toISOString(),
      traceId: req.traceId,
      userId: req.user?.id || null,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: Date.now() - startTime,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }

    auditLogModel.create(auditLog)
  })

  next()
}
```

### 16.16.2 审计范围

- 所有写操作（POST/PUT/DELETE）
- 所有 4xx/5xx 错误
- 所有敏感操作（修改密码、修改权限、数据导出）
- 所有支付相关操作
- 所有管理员操作

### 16.16.3 审计日志保留

- 默认保留 90 天
- 通过 `auditLogModel.cleanup(days)` 定期清理
- 重要操作（如权限修改）保留 1 年

---

## 16.17 安全检查清单

### 16.17.1 部署前检查

- [ ] 所有密钥已配置且强度达标
- [ ] `FORCE_HTTPS=true`
- [ ] `LOG_MASK_SENSITIVE_DATA=true`
- [ ] CORS 白名单已配置
- [ ] CSP 策略已配置
- [ ] 防火墙规则已配置
- [ ] SSL 证书已申请
- [ ] 数据库端口未对外暴露
- [ ] `.gitignore` 已包含所有敏感文件
- [ ] WordPress 容器仅挂载 `wp-content`
- [ ] Nginx 屏蔽敏感路径
- [ ] 速率限制已启用
- [ ] 监控告警已配置

### 16.17.2 代码审查重点

- [ ] 所有用户输入已校验（Zod / sanitize_text_field）
- [ ] 所有 SQL 查询使用 prepared statement
- [ ] 所有输出已净化（esc_html / esc_attr / esc_url / wp_kses_post）
- [ ] 所有 AJAX 包含 nonce 校验
- [ ] 所有表单包含 CSRF Token
- [ ] 所有敏感操作有权限检查
- [ ] 所有支付回调有 IP 白名单、签名验证、幂等检查、金额校验
- [ ] 所有日志已脱敏
- [ ] 所有错误信息不暴露内部细节
- [ ] 所有第三方依赖已审计

---

## 16.18 参考文档

- [packages/server/src/middleware/security.ts](file:///f:/gexm/packages/server/src/middleware/security.ts) — 安全中间件
- [packages/server/src/middleware/auth.ts](file:///f:/gexm/packages/server/src/middleware/auth.ts) — 认证中间件
- [packages/server/src/middleware/csrfConfig.ts](file:///f:/gexm/packages/server/src/middleware/csrfConfig.ts) — CSRF 配置
- [packages/server/src/middleware/permission.ts](file:///f:/gexm/packages/server/src/middleware/permission.ts) — RBAC 权限
- [packages/server/src/middleware/rateLimiter.ts](file:///f:/gexm/packages/server/src/middleware/rateLimiter.ts) — 速率限制
- [packages/server/src/middleware/ipWhitelist.ts](file:///f:/gexm/packages/server/src/middleware/ipWhitelist.ts) — IP 白名单
- [packages/server/src/middleware/dataMasking.ts](file:///f:/gexm/packages/server/src/middleware/dataMasking.ts) — 数据脱敏
- [packages/server/src/utils/crypto.ts](file:///f:/gexm/packages/server/src/utils/crypto.ts) — 加解密
- [wp-content/themes/mixm-laal/functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php) — 主题安全规范
- [infra/nginx/conf.d/gexm.conf](file:///f:/gexm/infra/nginx/conf.d/gexm.conf) — Nginx 安全配置
- [.trae/rules/task-scheduling-rules.md](file:///f:/gexm/.trae/rules/task-scheduling-rules.md) — AI Agent 资源管控
- [docs/security-audit.md](file:///f:/gexm/docs/security-audit.md) — 安全审计报告
