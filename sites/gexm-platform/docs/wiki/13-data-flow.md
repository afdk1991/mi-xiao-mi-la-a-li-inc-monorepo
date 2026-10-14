# 13. 数据流与运行时序

> 本章描述 `gexm-platform` 中关键业务流程的数据流与时序，包括用户登录、订单创建、支付回调、OAuth 第三方登录、AI Agent 调用、跨平台能力调用、主题与 Express 互通等。所有时序图采用 ASCII 文字流程图，便于在 Trae CN 中直接阅读。

---

## 13.1 请求生命周期（通用）

### 13.1.1 中间件链顺序

**文件**：[packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts)

```
[Client]
   │
   │  HTTP Request
   ▼
[Nginx 网关]
   │  /api/app/* → 转发到 Express
   ▼
[Express App]
   │
   ├── 1. requestLogger         (注入 TraceId、记录请求开始)
   ├── 2. securityMiddleware    (Helmet + 安全响应头)
   ├── 3. corsMiddleware        (CORS 白名单)
   ├── 4. compressionMiddleware (Gzip 压缩)
   ├── 5. cookieParser
   ├── 6. express.json          (Body 解析)
   ├── 7. rateLimiter           (全局限速)
   ├── 8. csrfTokenMiddleware   (下发 CSRF Token)
   ├── 9. apiCache              (响应缓存)
   ├── 10. cacheHeaders         (条件 GET / ETag)
   ├── 11. authMiddleware       (JWT 解析，可选)
   ├── 12. permission           (RBAC 校验，路由级)
   ├── 13. validateId           (路径参数 ID 校验)
   ├── 14. validateSchema       (Zod Body 校验)
   ├── 15. auditMiddleware      (操作审计)
   ├── 16. sensitiveAction      (敏感操作二次验证)
   ├── 17. dataMasking          (响应脱敏)
   │
   ▼
[业务路由 /api/v1/*]
   │
   ▼
[Controller] → [Service] → [Model] → [DB]
   │
   ▼
[response.success / response.fail]
   │
   ├── 18. metrics              (Prometheus 指标)
   ├── 19. requestLogger        (记录请求结束)
   └── 20. errorHandler         (错误兜底)
   │
   ▼
[Client]
```

### 13.1.2 TraceId 传播

```
[Client] → [Nginx] → [Express requestLogger]
                          │
                          ├── 检查 X-Trace-Id 请求头
                          ├── 缺失则生成新 TraceId (uuid v4)
                          ├── 注入到 req.traceId
                          ├── 写入 logger 上下文
                          └── 响应头回写 X-Trace-Id
                          │
                          ▼
                      [业务逻辑]
                          │
                          ├── 所有 logger.* 调用自动带上 traceId
                          ├── 所有数据库操作日志带上 traceId
                          └── 所有外部调用（wp_remote_get、OpenAI）带上 traceId
                          │
                          ▼
                      [Jaeger] (可选，OTel 导出)
```

---

## 13.2 用户登录时序

### 13.2.1 完整时序

```
[App/PC]                [Nginx]              [Express]              [DB]            [Redis]
   │                       │                    │                    │                │
   │  GET /api/v1/auth/csrf                     │                    │                │
   ├──────────────────────▶│                    │                    │                │
   │                       ├───────────────────▶│                    │                │
   │                       │                    │ csrfTokenMiddleware│                │
   │                       │                    │ 生成 CSRF Token    │                │
   │                       │                    │ Set-Cookie: csrf   │                │
   │                       │                    │ 200 + {token}      │                │
   │                       │◀───────────────────│                    │                │
   │  200 + Cookie + JSON  │                    │                    │                │
   │◀──────────────────────│                    │                    │                │
   │                       │                    │                    │                │
   │  POST /api/v1/auth/login                  │                    │                │
   │  Body: {username, password}               │                    │                │
   │  Header: X-CSRF-Token                     │                    │                │
   │  Cookie: csrf=xxx                         │                    │                │
   ├──────────────────────▶│                    │                    │                │
   │                       │  转发              │                    │                │
   │                       ├───────────────────▶│                    │                │
   │                       │                    │ authRateLimiter    │                │
   │                       │                    │ (5次/5分钟)        │                │
   │                       │                    │                    │                │
   │                       │                    │ validateSchema     │                │
   │                       │                    │ (Zod 校验)         │                │
   │                       │                    │                    │                │
   │                       │                    │ 查询用户            │                │
   │                       │                    ├───────────────────▶│                │
   │                       │                    │◀───user────────────│                │
   │                       │                    │                    │                │
   │                       │                    │ bcrypt.compare     │                │
   │                       │                    │                    │                │
   │                       │                    │ 登录失败计数检查    │                │
   │                       │                    │ (loginAttemptModel)│                │
   │                       │                    │                    │                │
   │                       │                    │ 签发 JWT           │                │
   │                       │                    │  - access (2h)     │                │
   │                       │                    │  - refresh (7d)    │                │
   │                       │                    │                    │                │
   │                       │                    │ 缓存 session        │                │
   │                       │                    ├───────────────────────────────────▶│
   │                       │                    │ 200 + {accessToken, refreshToken,  │
   │                       │                    │       user, permissions}           │
   │                       │◀───────────────────│                    │                │
   │  200 + Token + Cookie │                    │                    │                │
   │◀──────────────────────│                    │                    │                │
   │                       │                    │                    │                │
   │  后续请求带 Authorization: Bearer <access> │                    │                │
   │                + X-CSRF-Token             │                    │                │
   ├──────────────────────▶│                    │                    │                │
   │                       ├───────────────────▶│                    │                │
   │                       │                    │ authMiddleware     │                │
   │                       │                    │  - verify JWT      │                │
   │                       │                    │  - 检查 iss/aud    │                │
   │                       │                    │  - 注入 req.user   │                │
   │                       │                    │                    │                │
   │                       │                    │ csrfMiddleware     │                │
   │                       │                    │  - 校验 X-CSRF     │                │
   │                       │                    │                    │                │
   │                       │                    │ permission         │                │
   │                       │                    │  - RBAC 校验       │                │
   │                       │                    │                    │                │
   │                       │                    │ ...业务逻辑...     │                │
```

### 13.2.2 Token 刷新流程

```
[Client]                                   [Express]                       [Redis]
   │                                          │
   │  POST /api/v1/auth/refresh              │
   │  Body: {refreshToken}                   │
   ├─────────────────────────────────────────▶│
   │                                          │ verify refresh JWT
   │                                          │ 检查 Redis 黑名单
   │                                          ├──────────────────────────────▶│
   │                                          │◀─────not in blacklist────────│
   │                                          │
   │                                          │ 签发新 access Token
   │                                          │ 200 + {accessToken}
   │◀─────────────────────────────────────────│
   │                                          │
   │  旧 access Token 过期/登出时             │
   │  加入 Redis 黑名单（剩余 TTL）          │
```

### 13.2.3 登录失败保护

| 失败次数 | 触发动作 |
| --- | --- |
| 1-4 次 | 记录到 `login_attempts` 表，返回 401 |
| 5 次 | 锁定账号 15 分钟，返回 423 `LOCKED` |
| 10 次 | 锁定账号 1 小时，发送告警邮件给管理员 |
| 20 次 | 永久锁定，需管理员手动解锁 |

---

## 13.3 订单创建时序（含队列异步处理）

### 13.3.1 完整时序

```
[Client]              [Express]              [DB]              [Queue]            [orderQueueHandler]
   │                      │                    │                   │                      │
   │  POST /api/v1/orders                    │                   │                      │
   │  Body: {items, addressId, couponId}     │                   │                      │
   ├─────────────────────▶│                    │                   │                      │
   │                      │ authMiddleware     │                   │                      │
   │                      │ validateSchema     │                   │                      │
   │                      │                    │                   │                      │
   │                      │ 开启事务            │                   │                      │
   │                      ├───────────────────▶│                   │                      │
   │                      │                    │                   │                      │
   │                      │ 1. 检查库存         │                   │                      │
   │                      │ 2. 计算价格         │                   │                      │
   │                      │ 3. 应用优惠券       │                   │                      │
   │                      │ 4. 写入 orders 表  │                   │                      │
   │                      │ 5. 写入 order_items│                   │                      │
   │                      │ 6. 预扣库存          │                   │                      │
   │                      │ 7. 提交事务          │                   │                      │
   │                      │◀───────────────────│                   │                      │
   │                      │                    │                   │                      │
   │                      │ 推送异步任务        │                   │                      │
   │                      │  - 库存最终扣减      │                   │                      │
   │                      │  - 物流创建          │                   │                      │
   │                      │  - 通知服务          │                   │                      │
   │                      │  - 统计服务          │                   │                      │
   │                      ├───────────────────────────────────────▶│                      │
   │                      │                    │                   │                      │
   │                      │ 201 + {orderId,    │                   │                      │
   │                      │       paymentInfo} │                   │                      │
   │◀─────────────────────│                    │                   │                      │
   │                      │                    │                   │                      │
   │                      │                    │                   │ 异步消费              │
   │                      │                    │                   ├─────────────────────▶│
   │                      │                    │                   │                      │
   │                      │                    │                   │                      │ ├── 库存扣减
   │                      │                    │                   │                      │ ├── 物流创建
   │                      │                    │                   │                      │ ├── 通知服务
   │                      │                    │   ┌──────────────┐│                      │ └── 统计服务
   │                      │                    │   │ 通知服务      ││                      │
   │                      │                    │   │  - 邮件       ││                      │
   │                      │                    │   │  - 短信       ││                      │
   │                      │                    │   │  - 站内信     ││                      │
   │                      │                    │   │  - WebSocket  ││                      │
   │                      │                    │   └──────────────┘│                      │
```

### 13.3.2 幂等性保证

订单创建使用客户端生成的 `idempotencyKey`（UUID v4），同一 Key 重复提交返回同一订单：

```typescript
// packages/server/src/controllers/orderController.ts
async create(req, res) {
  const idempotencyKey = req.headers['idempotency-key'] as string

  // 检查 Redis 是否已处理
  const existing = await cacheService.get(`idempotency:${idempotencyKey}`)
  if (existing) {
    return response.success(res, JSON.parse(existing), '已处理')
  }

  // 创建订单...
  const order = await orderService.create(...)

  // 缓存 24 小时
  await cacheService.set(
    `idempotency:${idempotencyKey}`,
    JSON.stringify(order),
    86400,
  )

  return response.success(res, order, '订单创建成功')
}
```

---

## 13.4 支付回调时序

### 13.4.1 完整时序（以支付宝为例）

```
[支付宝服务器]              [Nginx]              [Express]              [DB]
   │                          │                    │                    │
   │  POST /api/payment/notify/alipay            │                    │
   │  Body: {out_trade_no, trade_no, total_amount, sign, ...}          │
   ├─────────────────────────▶│                    │                    │
   │                          │ 单独 access_log    │                    │
   │                          │ /var/log/nginx/    │                    │
   │                          │ gexm_payment_      │                    │
   │                          │ alipay.log         │                    │
   │                          ├───────────────────▶│                    │
   │                          │                    │                    │
   │                          │                    │ 1. IP 白名单校验     │
   │                          │                    │    (ipWhitelist)   │
   │                          │                    │    CIDR 范围匹配    │
   │                          │                    │                    │
   │                          │                    │ 2. 签名验证          │
   │                          │                    │    RSA2 公钥验签    │
   │                          │                    │    (alipay.publicKey)│
   │                          │                    │                    │
   │                          │                    │ 3. 幂等性检查        │
   │                          │                    │    查 payment_logs │
   │                          │                    │    是否已处理       │
   │                          │                    ├───────────────────▶│
   │                          │                    │◀───not exists──────│
   │                          │                    │                    │
   │                          │                    │ 4. 金额校验          │
   │                          │                    │    |received - expected| ≤ 0.01
   │                          │                    │                    │
   │                          │                    │ 5. 参数净化          │
   │                          │                    │    sanitize_text_field
   │                          │                    │    action 白名单校验 │
   │                          │                    │                    │
   │                          │                    │ 6. 开启事务          │
   │                          │                    │    - 更新订单状态    │
   │                          │                    │    - 写入 payment_logs
   │                          │                    │    - 释放预扣库存    │
   │                          │                    │    - 触发通知队列    │
   │                          │                    │    - 提交事务        │
   │                          │                    ├───────────────────▶│
   │                          │                    │◀───success──────────│
   │                          │                    │                    │
   │                          │                    │ 7. 响应支付宝         │
   │                          │                    │    success          │
   │                          │◀───────────────────│                    │
   │  HTTP 200 + "success"    │                    │                    │
   │◀─────────────────────────│                    │                    │
   │                          │                    │                    │
   │                          │                    │ 8. 异步通知          │
   │                          │                    │    - WebSocket 推送  │
   │                          │                    │    - 站内信          │
   │                          │                    │    - 邮件            │
```

### 13.4.2 不同支付方式差异

| 维度 | 支付宝 | 微信支付 | PayPal | Stripe |
| --- | --- | --- | --- | --- |
| 签名算法 | RSA2 | HMAC-SHA256 | Webhook Signature | Webhook Signature |
| 回调格式 | form-urlencoded | XML | JSON | JSON |
| IP 白名单 | CIDR | CIDR | API 端点 | API 端点 |
| 幂等性 | `out_trade_no` | `out_trade_no` | `event_id` | `event_id` |
| 金额校验 | `total_amount` | `total_fee` | `amount` | `amount` |
| XML 安全 | — | XXE 防护（`libxml_disable_entity_loader`） | — | — |

### 13.4.3 幂等性实现

```php
// wp-content/themes/mixm-laal/inc/payment-functions.php
function mixm_laal_handle_payment_callback($provider, $data) {
    global $wpdb;

    $order_id = $data['out_trade_no'];
    $trade_no = $data['trade_no'];

    // 幂等性检查
    $exists = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}mixm_laal_payment_logs
         WHERE order_id = %s AND trade_no = %s AND status = 'success'",
        $order_id, $trade_no
    ));

    if ($exists > 0) {
        return ['code' => 0, 'message' => '已处理'];
    }

    // ... 处理支付 ...
}
```

---

## 13.5 OAuth 第三方登录时序

### 13.5.1 完整时序（以微信开放平台为例）

```
[User]   [Client]            [Express]         [WeChat API]         [DB]
   │         │                    │                  │                │
   │  点击"微信登录"              │                  │                │
   ├────────▶│                    │                  │                │
   │         │  GET /api/v1/oauth/wechat/authorize  │                │
   │         ├───────────────────▶│                  │                │
   │         │                    │ 生成 state       │                │
   │         │                    │ 存 OAuth 状态    │                │
   │         │                    ├─────────────────────────────────▶│
   │         │                    │ 302 Redirect     │                │
   │         │◀───────────────────│                  │                │
   │         │                    │                  │                │
   │  Redirect 到微信授权页        │                  │                │
   │◀────────│                    │                  │                │
   │         │                    │                  │                │
   │  用户扫码/确认                │                  │                │
   ├──────────────────────────────────────────────────▶                │
   │         │                    │                  │                │
   │  Redirect 回 /api/v1/oauth/wechat/callback?code=xxx&state=yyy    │
   │◀──────────────────────────────────────────────────                │
   │         │                    │                  │                │
   │  浏览器跳转 callback          │                  │                │
   ├────────▶│                    │                  │                │
   │         ├───────────────────▶│                  │                │
   │         │                    │ 校验 state        │                │
   │         │                    │ (oauthStateModel) │                │
   │         │                    │                  │                │
   │         │                    │ 换取 access_token │                │
   │         │                    ├─────────────────▶│                │
   │         │                    │◀──{access_token, │                │
   │         │                    │    openid}───────│                │
   │         │                    │                  │                │
   │         │                    │ 获取用户信息      │                │
   │         │                    ├─────────────────▶│                │
   │         │                    │◀──{nickname,     │                │
   │         │                    │    avatar, unionid}──────────────│
   │         │                    │                  │                │
   │         │                    │ 查询/创建用户     │                │
   │         │                    │  - oauthModel     │                │
   │         │                    │    按 provider+   │                │
   │         │                    │    openid 查询    │                │
   │         │                    │  - 不存在则创建   │                │
   │         │                    │    user + oauth   │                │
   │         │                    ├─────────────────────────────────▶│
   │         │                    │◀──user───────────────────────────│
   │         │                    │                  │                │
   │         │                    │ 签发 JWT          │                │
   │         │                    │ 302 Redirect      │                │
   │         │                    │ ?token=xxx        │                │
   │         │◀───────────────────│                  │                │
   │         │                    │                  │                │
   │  Redirect 回前端首页 + Token │                  │                │
   │◀────────│                    │                  │                │
```

### 13.5.2 OAuth Provider 清单

**目录**：[packages/server/src/services/oauth/](file:///f:/gexm/packages/server/src/services/oauth/)

| Provider | 文件 | 平台 |
| --- | --- | --- |
| `wechatProvider` | [oauth/wechatProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/wechatProvider.ts) | 微信开放平台 / 公众号 / 小程序 |
| `qqProvider` | [oauth/qqProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/qqProvider.ts) | QQ |
| `weiboProvider` | [oauth/weiboProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/weiboProvider.ts) | 微博 |
| `alipayProvider` | [oauth/alipayProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/alipayProvider.ts) | 支付宝 |
| `googleProvider` | [oauth/googleProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/googleProvider.ts) | Google |
| `facebookProvider` | [oauth/facebookProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/facebookProvider.ts) | Facebook |
| `twitterProvider` | [oauth/twitterProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/twitterProvider.ts) | Twitter |

所有 Provider 继承自 [oauth/baseProvider.ts](file:///f:/gexm/packages/server/src/services/oauth/baseProvider.ts)，实现 `getAuthorizeUrl(state)`、`getAccessToken(code)`、`getUserInfo(accessToken)` 三个方法。

---

## 13.6 AI Agent 调用时序

**目录**：[packages/server/src/services/agent/](file:///f:/gexm/packages/server/src/services/agent/)

### 13.6.1 完整时序

```
[Client]              [Express]              [AgentService]          [MCP Server]        [OpenAI]
   │                      │                       │                       │                  │
   │  POST /api/v1/agent/chat                    │                       │                  │
   │  Body: {message, conversationId}            │                       │                  │
   ├─────────────────────▶│                       │                       │                  │
   │                      │ authMiddleware        │                       │                  │
   │                      │ rateLimiter           │                       │                  │
   │                      ├──────────────────────▶│                       │                  │
   │                      │                       │                       │                  │
   │                      │                       │ 加载历史对话           │                  │
   │                      │                       │ 构建 Prompt            │                  │
   │                      │                       │                       │                  │
   │                      │                       │ LangChain Agent.invoke│                  │
   │                      │                       ├──────────────────────────────────────────▶│
   │                      │                       │                       │                  │
   │                      │                       │                       │   工具调用        │
   │                      │                       │◀──────────────────────────────────────────│
   │                      │                       │                       │                  │
   │                      │                       │ 调用 MCP 工具           │                  │
   │                      │                       │  - order-inquiry      │                  │
   │                      │                       │  - product-search     │                  │
   │                      │                       │  - user-service       │                  │
   │                      │                       ├──────────────────────▶│                  │
   │                      │                       │◀──tool result─────────│                  │
   │                      │                       │                       │                  │
   │                      │                       │ 继续推理               │                  │
   │                      │                       ├──────────────────────────────────────────▶│
   │                      │                       │◀──final answer───────────────────────────│
   │                      │                       │                       │                  │
   │                      │                       │ 保存对话历史           │                  │
   │                      │                       │                       │                  │
   │                      │◀──────────────────────│                       │                  │
   │  200 + {reply,       │                       │                       │                  │
   │       toolsUsed,     │                       │                       │                  │
   │       traceId}       │                       │                       │                  │
   │◀─────────────────────│                       │                       │                  │
```

### 13.6.2 内置 Skills

**目录**：[packages/server/src/services/agent/skills/](file:///f:/gexm/packages/server/src/services/agent/skills/)

| Skill | 路径 | 用途 |
| --- | --- | --- |
| `order-inquiry` | [skills/order-inquiry/SKILL.md](file:///f:/gexm/packages/server/src/services/agent/skills/order-inquiry/SKILL.md) | 订单查询 |
| `product-search` | [skills/product-search/SKILL.md](file:///f:/gexm/packages/server/src/services/agent/skills/product-search/SKILL.md) | 商品搜索 |
| `user-service` | [skills/user-service/SKILL.md](file:///f:/gexm/packages/server/src/services/agent/skills/user-service/SKILL.md) | 用户服务 |

---

## 13.7 跨平台能力调用流程

### 13.7.1 SDK 初始化与平台检测

```
[App 启动]
   │
   ▼
[main.js / main.ts]
   │
   ├── import { GexmSDK } from '@gexm/sdk'
   │
   ├── GexmSDK.init()
   │   │
   │   ├── PlatformFactory.detect()
   │   │   │
   │   │   ├── process.versions.electron?  ── yes → 'electron'
   │   │   ├── window.__UNI__?             ── yes → 对应小程序平台
   │   │   ├── typeof wx?                  ── yes → 'mp-weixin'
   │   │   └── default                              → 'web'
   │   │
   │   ├── registerDefaultAdapters(config)
   │   │   └── 注册 9 个适配器到 PlatformFactory
   │   │
   │   ├── PlatformFactory.setCurrentPlatform(platform)
   │   │
   │   ├── adapter.init(config)
   │   │   └── 初始化 Network / Storage / Crypto / Log / Terminal
   │   │
   │   ├── pluginRegistry.setAdapter(adapter)
   │   ├── pluginRegistry.initAllPlugins()
   │   │
   │   └── eventBus.emit('sdk:initialized', { platform, config })
   │
   ▼
[业务代码]
   │
   ├── GexmSDK.network.get('/api/v1/users')
   │   │
   │   └── WebAdapter.network.get   → axios
   │   └── MPWeixinAdapter.network.get → wx.request
   │   └── ElectronAdapter.network.get → axios (with node http)
   │
   ├── GexmSDK.storage.set('key', 'value')
   │   │
   │   └── WebAdapter.storage.set   → localStorage
   │   └── MPWeixinAdapter.storage.set → wx.setStorageSync
   │   └── ElectronAdapter.storage.set → electron-store
   │
   └── GexmSDK.crypto.encrypt('text')
       │
       └── 统一使用 crypto-js AES-256-GCM
```

### 13.7.2 跨端网络请求差异

| 平台 | 底层 API | 特性 |
| --- | --- | --- |
| Web | `axios` | 支持 HTTP/2、拦截器、取消请求 |
| 微信小程序 | `wx.request` | 不支持 HTTP/2，最大 10 个并发 |
| 支付宝小程序 | `my.request` | 同上 |
| App (uni-app plus) | `uni.request` | 走原生网络栈 |
| Electron | `axios` (Node http) | 完整 HTTP 支持 |
| 鸿蒙 | `uni.request` | 走 ArkTS HTTP |

---

## 13.8 WordPress 主题与 Express 互通

### 13.8.1 主题调用 Express API

```
[WordPress 主题 PHP]
   │
   │  wp_remote_get('https://laal.top/api/app/v1/xxx')
   │  或 wp_remote_post(...)
   │
   ▼
[Nginx]
   │  /api/app/* → 转发到 Express
   ▼
[Express]
   │
   │  返回 JSON
   │
   ▼
[WordPress 主题 PHP]
   │
   │  wp_remote_retrieve_body($response)
   │  json_decode($body, true)
   │
   ▼
[模板渲染]
```

**应用场景**：
- 主题首页调用 Express 获取热门商品
- 商城页面调用 Express 获取购物车
- 社区模块调用 Express 获取用户动态

### 13.8.2 Express 调用 WordPress REST API

```
[Express Service]
   │
   │  axios.get('https://laal.top/wp-json/wp/v2/posts')
   │  或调用 wp-content/themes/mixm-laal/inc/api-functions.php 暴露的自定义 REST 路由
   │
   ▼
[Nginx]
   │  /wp-json/* → 转发到 WordPress
   ▼
[WordPress Core]
   │
   │  WP_REST_Server::dispatch()
   │  返回 JSON
   │
   ▼
[Express Service]
   │
   │  解析响应，整合到业务逻辑
   │
   ▼
[Client]
```

**应用场景**：
- AI Agent 通过 MCP 工具查询 WordPress 内容
- PC 后台拉取 WordPress 文章列表
- 多端 App 调用 WordPress 文章 API

---

## 13.9 WebSocket 实时通信时序

**文件**：[packages/server/src/websocket.js](file:///f:/gexm/packages/server/src/websocket.js)

### 13.9.1 连接建立

```
[Client]                                    [Express Socket.IO]
   │                                          │
   │  io('https://laal.top/api/app', {       │
   │    extraHeaders: { Authorization: ... } │
   │  })                                     │
   ├──────────────────────────────────────────▶│
   │                                          │ JWT 校验
   │                                          │ 加入用户房间 user:{userId}
   │                                          │ 加入角色房间 role:{role}
   │                                          │
   │  connected event                         │
   │◀──────────────────────────────────────────│
```

### 13.9.2 消息推送场景

| 场景 | 触发方 | 接收方 | 事件名 |
| --- | --- | --- | --- |
| 订单状态变更 | orderQueueHandler | 用户本人 | `order:updated` |
| 站内信 | notificationService | 用户本人 | `notification:new` |
| 聊天消息 | chatController | 对方用户 | `chat:message` |
| 系统公告 | adminController | 全体在线用户 | `system:broadcast` |
| 商品下架 | productService | 商品浏览中用户 | `product:offline` |

---

## 13.10 数据流图汇总

```
┌──────────────────────────────────────────────────────────────────────┐
│                          终端用户 / 多端入口                            │
│   (H5/小程序/App)  (PC 后台)  (桌面端)  (WordPress 前台)              │
└──────────┬──────────────┬──────────────┬──────────────┬─────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
       ┌──────────────────────────────────────────────────────────┐
       │              Nginx 网关 (80/443)                          │
       │   /api/wp/* → WordPress   /api/app/* → Express           │
       └──────────┬─────────────────────────────┬────────────────┘
                  │                             │
                  ▼                             ▼
       ┌────────────────────┐       ┌─────────────────────────┐
       │  WordPress Core    │       │  @gexm/server (Express) │
       │  + mixm-laal 主题  │◀─────▶│  + Socket.IO            │
       │  + MySQL           │ 互调  │  + AI Agent             │
       └─────────┬──────────┘       └────┬────────┬───────────┘
                 │                       │        │
                 ▼                       ▼        ▼
              ┌────────┐         ┌──────────┐  ┌──────────┐
              │ MySQL  │         │SQLite/PG │  │  Redis   │
              └────────┘         └──────────┘  └──────────┘
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │  OpenAI (AI Agent)        │
                              │  MCP Server (端口 8080)    │
                              │  Jaeger (OTel Trace)      │
                              │  Consul (服务发现)         │
                              └──────────────────────────┘
```

---

## 13.11 参考文档

- [packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts) — 中间件链
- [packages/server/src/server.ts](file:///f:/gexm/packages/server/src/server.ts) — 启动与停机
- [packages/server/src/services/oauth/](file:///f:/gexm/packages/server/src/services/oauth/) — OAuth Provider
- [packages/server/src/services/agent/](file:///f:/gexm/packages/server/src/services/agent/) — AI Agent
- [packages/server/src/services/paymentGateways/](file:///f:/gexm/packages/server/src/services/paymentGateways/) — 支付网关
- [packages/server/src/websocket.js](file:///f:/gexm/packages/server/src/websocket.js) — WebSocket
- [docs/architecture.md](file:///f:/gexm/docs/architecture.md) — 架构设计
- [docs/api-documentation.md](file:///f:/gexm/docs/api-documentation.md) — API 文档
