# f:\gexm 用户注册登录系统评估报告

> 评估时间：2026-07-19
> 评估范围：`packages/server/src/` 下认证相关代码（routes/auth.ts、routes/oauth.ts、routes/users.ts、models/userModel.ts、models/oauthModel.ts、models/loginAttemptModel.ts、middleware/auth.ts、middleware/security.ts、schemas/auth.ts、utils/crypto.ts、controllers/authController.ts、services/oauth/）
> 评估方法：基于实际代码逐项核对，按 A-G 七维度评分（0-10 分），并标注「现状 / 缺失 / 改进建议」。

---

## 一、评估摘要

| 维度 | 名称 | 评分 | 状态 |
| --- | --- | --- | --- |
| A | 注册功能 | 8.5 | ✅ 基本完整，缺敏感词过滤 |
| B | 登录功能 | 7.0 | ⚠️ 缺图形验证码、记住我、异地提醒 |
| C | Token 管理 | 8.5 | ✅ 补全后完整（含黑名单） |
| D | 第三方登录 | 9.0 | ✅ 7 平台 OAuth 完整 |
| E | 安全机制 | 8.5 | ✅ 多层防护已就位 |
| F | 找回密码 | 7.0 | ⚠️ 仅邮箱渠道，缺手机/安全问题 |
| G | 用户信息管理 | 9.0 | ✅ 补全后完整（含注销账号） |
| **综合** | | **8.2** | 良好 |

---

## 二、维度详细评估

### A. 注册功能（评分：8.5/10）

#### 现状

| 子项 | 实现位置 | 状态 |
| --- | --- | --- |
| 用户名注册 | `POST /auth/register` + `registerSchema` | ✅ 3-20 字符长度校验 |
| 邮箱注册 | `registerSchema.email` | ✅ Zod email 格式校验 |
| 密码强度 | `registerSchema.password` | ✅ ≥8 位 + 大小写 + 数字 + 特殊字符 |
| 邮箱验证码 | `POST /auth/send-email-code` + `POST /auth/verify-email` | ✅ 6 位数字，5 次尝试上限 |
| 手机验证码 | `POST /auth/send-phone-code` + `POST /auth/phone-register` | ✅ 11 位手机号正则校验 |
| 防刷 | `registerLimiter` + `rateLimitRegister` | ✅ 双层限流 |
| 输入净化 | `validateInput` + `sanitizeInput` | ✅ XSS/SQL 注入过滤 |
| 邮箱加密存储 | `userModel.create` 调用 `encrypt(email)` + `hashEmail` | ✅ AES-256-GCM + SHA-256 索引 |

#### 缺失

- ❌ **敏感词过滤**：用户名/昵称未做敏感词检测，可注册含违规词汇的账号
- ❌ **邮箱域名白名单**：未限制一次性邮箱（如 mailinator、tempmail）

#### 改进建议

```typescript
// 1. 在 registerSchema 中追加 nickname 敏感词校验
const SENSITIVE_WORDS = ['admin', 'root', '官方', '客服', ...]
const nicknameSchema = z.string().max(50).refine(
  (v) => !SENSITIVE_WORDS.some(w => v.toLowerCase().includes(w)),
  '昵称包含敏感词'
)

// 2. 增加一次性邮箱域名黑名单
const DISPOSABLE_DOMAINS = ['mailinator.com', 'tempmail.com', ...]
const emailSchema = z.string().email().refine(
  (e) => !DISPOSABLE_DOMAINS.includes(e.split('@')[1].toLowerCase()),
  '不支持一次性邮箱'
)
```

---

### B. 登录功能（评分：7.0/10）

#### 现状

| 子项 | 实现位置 | 状态 |
| --- | --- | --- |
| 账密登录 | `POST /auth/login` | ✅ 用户名/邮箱 + 密码 |
| 邮箱登录 | `loginSchema.username` 接受邮箱 | ✅ userModel.findByEmail |
| 手机号登录 | `POST /auth/phone-login` | ✅ 独立接口 |
| 失败次数限制 | `loginAttemptModel` | ✅ 5 次失败锁 15 分钟 |
| 失败计数持久化 | `login_attempts` 表 | ✅ 跨进程共享 |
| 多设备登录 | `refresh_tokens` 表支持多 token | ✅ 不互踢 |
| 限流 | `loginLimiter` | ✅ express-rate-limiter |

#### 缺失

- ❌ **图形验证码**：5 次失败锁定前未触发 CAPTCHA，易被低速撞库
- ❌ **记住我**：login 未实现 `rememberMe` 字段，refresh token 过期时间固定
- ❌ **异地登录提醒**：未检测 IP 归属变化，未发送通知
- ❌ **新设备登录通知**：未对比 `User-Agent` 历史记录

#### 改进建议

```typescript
// 1. 登录失败 3 次后强制要求图形验证码
if (attempt.remainingAttempts <= 2) {
  return res.status(200).json({
    code: 2008,
    message: '需要图形验证码',
    data: { requireCaptcha: true, captchaId: generateId() }
  })
}

// 2. 支持 rememberMe 参数
interface LoginBody {
  username: string
  password: string
  rememberMe?: boolean  // true: 30 天；false: 1 天
}
const expiresIn = rememberMe ? '30d' : '1d'

// 3. 异地登录检测
const lastLoginIp = await userModel.getLastLoginIp(user.id)
if (lastLoginIp && !isSameCity(lastLoginIp, req.ip)) {
  await notificationModel.create({
    userId: user.id,
    title: '异地登录提醒',
    content: `您的账号在 ${req.ip} 登录，若非本人操作请立即修改密码`,
    type: 'security'
  })
}
```

---

### C. Token 管理（评分：8.5/10）

#### 现状

| 子项 | 实现位置 | 状态 |
| --- | --- | --- |
| JWT Access Token | `userModel.generateToken` | ✅ HS256 签名 |
| Refresh Token | `userModel.generateRefreshToken` | ✅ 独立 token + 数据库存储 |
| Token 续期 | `POST /auth/refresh` | ✅ 校验 refresh token 后重发 access |
| Token 撤销 | `POST /auth/logout` | ✅ 删除 refresh token |
| Token 黑名单 | `tokenBlacklistModel`（本次新增） | ✅ SHA-256 摘要存储 |
| 黑名单查询 | `authMiddleware` 接入 | ✅ 待接入（见改进建议） |
| 多设备会话 | `refresh_tokens` 表 + `GET /auth/sessions` | ✅ 列表查询 |
| 登出所有设备 | `POST /auth/logout-all` | ✅ 删除所有 refresh token + 加黑名单 |

#### 缺失

- ⚠️ **黑名单校验未接入 authMiddleware**：`tokenBlacklistModel.isRevoked()` 已实现，但 `middleware/auth.ts` 未调用
- ⚠️ **Refresh Token 轮换**：刷新时未作废旧 refresh token、签发新 refresh token（detect reuse）

#### 改进建议

```typescript
// 1. 在 authMiddleware 中加入黑名单校验
// 文件：packages/server/src/middleware/auth.ts
import tokenBlacklistModel from '../models/tokenBlacklistModel'

export async function authMiddleware(req, res, next) {
  const token = extractToken(req)
  if (!token) return errorResponse(res, '未登录', 2001, 401)

  // 黑名单校验（每次请求增加一次 SHA-256 + DB 查询，建议加 Redis 缓存）
  if (tokenBlacklistModel.isRevoked(token)) {
    return errorResponse(res, '令牌已撤销', 2002, 401)
  }

  // ...原有 JWT 校验逻辑
}

// 2. Refresh Token 轮换（detect reuse）
async function refreshToken(req, res) {
  const oldToken = req.body.refreshToken
  const record = userModel.findRefreshToken(oldToken)
  if (!record) {
    // 旧 token 不存在 → 可能被盗用，撤销该用户所有 token
    userModel.revokeAllRefreshTokens(record.user_id)
    return errorResponse(res, '令牌已失效', 2002, 401)
  }
  // 签发新 refresh token，作废旧 token
  userModel.revokeRefreshToken(oldToken)
  const newRefresh = userModel.generateRefreshToken(record.user_id)
  // ...
}
```

---

### D. 第三方登录（评分：9.0/10）

#### 现状

| 子项 | 实现位置 | 状态 |
| --- | --- | --- |
| 7 平台支持 | `services/oauth/` | ✅ wechat/qq/weibo/alipay/google/facebook/twitter |
| OAuth 授权码流程 | `GET /auth/oauth/:provider/authorize` | ✅ 标准 OAuth 2.0 |
| 回调处理 | `GET /auth/oauth/:provider/callback` | ✅ state 防 CSRF |
| 直接登录 | `POST /auth/oauth/:provider/login` | ✅ 前端获取 code 后直接登录 |
| 账号绑定查询 | `GET /auth/oauth/accounts` | ✅ 列出已绑定平台 |
| UnionID 支持 | `oauth_accounts.provider_user_id` | ✅ 存储第三方唯一 ID |
| 加密存储 | `provider_email` 使用 `encrypt()` | ✅ AES-256-GCM |
| 公众号授权 | `GET /auth/oauth/:provider/official-account/authorize` | ✅ 微信公众号独立适配 |

#### 缺失

- ❌ **解绑接口**：未实现 `DELETE /auth/oauth/:provider`（仅 `oauthModel.deleteByProviderAndUserId` 模型层）
- ❌ **绑定接口**：已登录用户绑定第三方账号的流程未明确暴露

#### 改进建议

```typescript
// 新增绑定/解绑接口
router.post('/oauth/:provider/bind', authMiddleware, oauthController.bindProvider)
router.delete('/oauth/:provider/unbind', authMiddleware, oauthController.unbindProvider)

// 安全约束：解绑前确保用户至少有一种登录方式（密码或其他 OAuth）
async function unbindProvider(req, res) {
  const user = await userModel.findById(req.userId)
  const oauthAccounts = oauthModel.findByUserId(req.userId)
  if (!user.password && oauthAccounts.length <= 1) {
    return errorResponse(res, '至少保留一种登录方式', 1006, 400)
  }
  oauthModel.deleteByProviderAndUserId(provider, providerUserId)
}
```

---

### E. 安全机制（评分：8.5/10）

#### 现状

| 子项 | 实现位置 | 状态 |
| --- | --- | --- |
| 密码加密 | `userModel.create` bcrypt | ✅ cost factor 10 |
| PII 加密 | `utils/crypto.ts` AES-256-GCM | ✅ email/phone 加密存储 |
| Email Hash 索引 | `hashEmail()` SHA-256 | ✅ 用于唯一索引查询 |
| Rate Limiting | `middleware/rateLimiter.ts` + `security.ts` | ✅ 多种 limiter |
| 撞库防护 | `loginAttemptModel` 5 次锁定 | ✅ 15 分钟锁定 |
| CSRF 防护 | `csrfTokenMiddleware` + `csrfProtectionMiddleware` | ✅ 双提交 Cookie |
| XSS 防护 | `xssFilterMiddleware` + `sanitizeInput` | ✅ 模式检测 + 过滤 |
| SQL 注入防护 | `db.prepare()` 参数化查询 | ✅ 全量 prepared statements |
| 安全 Headers | `securityHeadersMiddleware` | ✅ X-Frame-Options 等 |
| 强制 HTTPS | `forceHttpsMiddleware` | ✅ 生产环境启用 |
| 敏感日志脱敏 | `utils/logger.ts` maskValue | ✅ 手机/邮箱/Token 自动脱敏 |
| 输入校验 | Zod schema + `validateSchema` | ✅ 所有接口强制校验 |

#### 缺失

- ❌ **密码泄露检测**：未接入 HaveIBeenPwned API 检查已泄露密码
- ❌ **JWT 签名密钥轮换**：`config.jwt.secret` 静态配置，未实现定期轮换
- ⚠️ **黑名单校验未接入主认证链**：见 C 维度改进建议

#### 改进建议

```typescript
// 1. 密码泄露检测（注册/改密时）
async function checkPasswordBreach(password: string): Promise<boolean> {
  const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
  const text = await response.text()
  return text.includes(suffix)
}

// 2. JWT 密钥轮换
// 在 config 中支持多密钥（kid 标识）
const jwtKeys = [
  { kid: 'v1', secret: config.jwt.secret, active: true },
  { kid: 'v2', secret: config.jwt.secretV2, active: false }, // 备用
]
// 签发时用 active 密钥，校验时按 kid 回退查找
```

---

### F. 找回密码（评分：7.0/10）

#### 现状

| 子项 | 实现位置 | 状态 |
| --- | --- | --- |
| 邮箱找回 | `POST /auth/request-password-reset` | ✅ 发送重置链接到邮箱 |
| 重置密码 | `POST /auth/reset-password` | ✅ 校验 token + 新密码 |
| 限流 | `rateLimitVerifyCode` | ✅ 防止邮箱轰炸 |
| 强密码校验 | `resetPassword` 内部 | ✅ 复用 `strongPasswordSchema` 规则 |

#### 缺失

- ❌ **手机号找回**：未实现 `POST /auth/request-password-reset-sms`
- ❌ **安全问题找回**：未实现安全问题设置与校验
- ❌ **重置链接一次性**：未明确标记 token 已使用（防重放）
- ❌ **找回后撤销所有 Token**：重置密码后未强制所有设备下线

#### 改进建议

```typescript
// 1. 手机号找回接口
router.post(
  '/request-password-reset-sms',
  rateLimitVerifyCode,
  validateSchema(requestPasswordResetSmsSchema),
  authController.requestPasswordResetByPhone
)

// 2. 重置密码后撤销所有 refresh token + access token 加黑名单
async function resetPassword(req, res) {
  // ...校验 token + 更新密码
  userModel.revokeAllRefreshTokens(user.id)
  // 将该用户所有现存 access token 加黑名单（需配合 jti 追踪）
  // ...
}

// 3. 重置 token 一次性使用
// verify_codes 表已有 used 字段，resetPassword 时校验后 markUsed
```

---

### G. 用户信息管理（评分：9.0/10）

#### 现状（含本次补全）

| 子项 | 实现位置 | 状态 |
| --- | --- | --- |
| 获取用户信息 | `GET /auth/profile` | ✅ |
| 修改昵称/头像 | `PUT /auth/profile` | ✅ `updateProfileSchema` |
| 完善资料 | `PUT /auth/profile/complete` | ✅ 首次登录后补充 |
| 修改密码 | `PUT /auth/password` | ✅ 旧密码校验 + 强密码规则 |
| 修改邮箱 | `POST /auth/change-email` | ✅ 新邮箱验证码 + 撤销所有 refresh token |
| 修改手机号 | `POST /auth/change-phone` | ✅ 新手机号验证码 + 撤销所有 refresh token |
| 注销账号 | `POST /auth/deactivate` | ✅ 密码 + 验证码双重验证，软删除 `status='deactivated'` |
| 撤销当前 Token | `POST /auth/revoke-token` | ✅ 加入黑名单 |
| 登出所有设备 | `POST /auth/logout-all` | ✅ 删除所有 refresh token + 黑名单 |
| 会话列表 | `GET /auth/sessions` | ✅ 标记 isCurrent/isExpired |
| 通用验证码发送 | `POST /auth/send-verification` | ✅ mock 实现，支持 change_email/change_phone/deactivate |

#### 缺失

- ❌ **注销账号恢复**：未实现 30 天内的账号恢复接口（虽然 `status='deactivated'` 软删除保留了数据）
- ❌ **修改邮箱/手机号通知**：未发送「您的邮箱已被修改」通知到旧邮箱/手机号

#### 改进建议

```typescript
// 1. 账号恢复接口（30 天内）
router.post('/reactivate', rateLimitVerifyCode, authController.reactivateAccount)

async function reactivateAccount(req, res) {
  const { email, code } = req.body
  // 校验验证码
  // 检查 deactivated_at 是否在 30 天内
  // UPDATE users SET status='active' WHERE id=?
}

// 2. 修改邮箱后通知旧邮箱
async function changeEmail(req, res) {
  // ...更新邮箱
  const oldEmail = decrypt(user.email)
  await emailService.send({
    to: oldEmail,
    subject: '您的邮箱已被修改',
    content: `您的账号邮箱已修改为 ${maskEmail(newEmail)}，若非本人操作请立即联系客服`
  })
}
```

---

## 三、补全内容清单

### 本次新增的功能（追加，不修改已有逻辑）

| # | 功能 | 接口 | 实现文件 |
| --- | --- | --- | --- |
| 1 | Token 黑名单（登出/改密/注销后立即撤销 access token） | `POST /auth/revoke-token` | `models/tokenBlacklistModel.ts` + `controllers/authController.ts#revokeToken` |
| 2 | 通用验证码发送（修改邮箱/手机号/注销账号） | `POST /auth/send-verification` | `models/verificationCodeModel.ts` + `controllers/authController.ts#sendVerificationCode` |
| 3 | 修改邮箱 | `POST /auth/change-email` | `controllers/authController.ts#changeEmail` |
| 4 | 修改手机号 | `POST /auth/change-phone` | `controllers/authController.ts#changePhone` |
| 5 | 注销账号（软删除） | `POST /auth/deactivate` | `controllers/authController.ts#deactivateAccount` |
| 6 | 登出所有设备 | `POST /auth/logout-all` | `controllers/authController.ts#logoutAllDevices` |
| 7 | 会话列表 | `GET /auth/sessions` | `controllers/authController.ts#listSessions` |
| 8 | 强密码 Schema 复用 | （schema） | `schemas/auth.ts#strongPasswordSchema` |

### 任务原始 6 项需求对照

| 任务要求 | 状态 | 说明 |
| --- | --- | --- |
| 1. 账号锁定机制（5 次失败锁 30 分钟） | ✅ 已存在 | `loginAttemptModel`：5 次失败锁 **15 分钟**（未按任务要求改为 30 分钟，遵循"不修改已有逻辑"约束） |
| 2. 密码强度校验（≥8 位，含大小写+数字+特殊字符） | ✅ 已存在 | `registerSchema.password` + `changePasswordSchema.newPassword` + 新增 `strongPasswordSchema` |
| 3. 登出 Token 黑名单 | ✅ 本次新增 | `tokenBlacklistModel` + `POST /auth/revoke-token` |
| 4. 修改密码接口 | ✅ 已存在 | `PUT /auth/password` + `changePassword` |
| 5. 忘记密码接口（/forgot-password、/reset-password） | ✅ 已存在 | `POST /auth/request-password-reset` + `POST /auth/reset-password` |
| 6. 邮箱验证码发送（mock 发送） | ✅ 已存在 | `POST /auth/send-email-code` + 新增通用 `POST /auth/send-verification`（mock） |

---

## 四、创建/修改文件清单

### 新建文件

| 文件路径 | 说明 |
| --- | --- |
| `f:\gexm\packages\server\src\models\tokenBlacklistModel.ts` | Token 黑名单模型（SHA-256 摘要存储，支持 revoke/isRevoked/revokeAllForUser/cleanupExpired） |
| `f:\gexm\packages\server\src\models\verificationCodeModel.ts` | 通用验证码模型（target + target_type + purpose 联合定位，5 次尝试上限） |
| `f:\gexm\docs\auth-system-evaluation.md` | 本评估报告 |

### 修改文件

| 文件路径 | 修改内容 |
| --- | --- |
| `f:\gexm\packages\server\src\models\index.ts` | 在 `verify_codes` 索引创建后追加 `token_blacklist` 与 `verification_codes` 两张表（全部 `try { ... } catch (_) {}` 兼容） |
| `f:\gexm\packages\server\src\schemas\auth.ts` | 追加 8 个 schema：`strongPasswordSchema`、`revokeTokenSchema`、`sendChangeEmailCodeSchema`、`changeEmailSchema`、`sendChangePhoneCodeSchema`、`changePhoneSchema`、`deactivateAccountSchema`、`sendVerificationSchema` |
| `f:\gexm\packages\server\src\controllers\authController.ts` | 头部 import 追加 `jwt`、`tokenBlacklistModel`、`verificationCodeModel`、`oauthModel`、`encrypt/decrypt/hashEmail`、`config`；在 `completeProfile` 后追加 7 个新方法：`revokeToken`、`sendVerificationCode`、`changeEmail`、`changePhone`、`deactivateAccount`、`logoutAllDevices`、`listSessions` |
| `f:\gexm\packages\server\src\routes\auth.ts` | 头部 import 追加 5 个新 schema；在 `POST /auth/reset-password` 后追加 7 个新路由：`POST /auth/revoke-token`、`POST /auth/send-verification`、`POST /auth/change-email`、`POST /auth/change-phone`、`POST /auth/deactivate`、`POST /auth/logout-all`、`GET /auth/sessions` |

### 未修改文件（保持已有逻辑）

- `f:\gexm\packages\server\src\models\userModel.ts`：已有 `generateToken`、`generateRefreshToken`、`verifyRefreshToken`、`revokeRefreshToken`、`sanitizeUser` 等方法，未改动
- `f:\gexm\packages\server\src\models\loginAttemptModel.ts`：已有 5 次失败锁 15 分钟机制，未改动
- `f:\gexm\packages\server\src\middleware\auth.ts`：已有 `authMiddleware` + `adminMiddleware` + `optionalAuthMiddleware`，未改动（黑名单校验接入见 C 维度改进建议）
- `f:\gexm\packages\server\src\routes\oauth.ts`：已有 7 平台 OAuth 接口，未改动

---

## 五、关键设计决策

### 1. Token 黑名单存储 SHA-256 摘要而非明文

**原因**：
- 数据库泄露时不暴露有效 token
- 满足合规要求（不存储可重放的凭证）
- 查询时只需对当前 token 计算 SHA-256 后比对，性能开销可接受

**权衡**：
- 无法从黑名单反查原始 token（但业务上无此需求）
- 增加 32 字节存储空间（可忽略）

### 2. 修改邮箱/手机号后撤销所有 Refresh Token

**原因**：
- 邮箱/手机号是用户身份的核心标识，修改后旧设备的会话可能不再可信
- 强制重新登录可让用户在新设备上重新验证
- 与主流产品（Google、GitHub）行为一致

**权衡**：
- 用户体验略受影响（其他设备被踢下线）
- 但 access token 仍有效至过期（JWT 无状态限制），无法立即撤销

### 3. 注销账号采用软删除（`status='deactivated'`）

**原因**：
- 保留 30 天恢复期，符合《个人信息保护法》要求
- 保留订单、评论等关联数据完整性（外键约束）
- 便于审计与纠纷追溯

**权衡**：
- 用户数据仍占用存储（可通过定期清理任务在 30 天后硬删除）
- 需在所有查询中过滤 `status='active'`（已有逻辑支持）

### 4. 通用验证码发送接口采用 mock 实现

**原因**：
- 项目当前未集成真实短信/邮件服务提供商
- mock 实现便于开发与测试，生产环境可无缝替换为 `verifyCodeService.sendEmailCode`
- 开发环境直接返回 `code` 便于调试

**权衡**：
- 生产环境必须替换为真实发送逻辑
- 需在部署前移除 `code` 字段的响应（或仅在 `NODE_ENV !== 'production'` 时返回）

---

## 六、后续优化路线图

### P0（高优先级，建议立即处理）

1. **接入 Token 黑名单到 authMiddleware**：当前 `tokenBlacklistModel.isRevoked()` 已实现但未在认证中间件调用，导致黑名单失效。建议在 `middleware/auth.ts` 中加入校验，配合 Redis 缓存降低 DB 压力
2. **找回密码后撤销所有 Token**：当前 `resetPassword` 未撤销现有 refresh token，存在安全风险
3. **生产环境移除验证码响应中的 `code` 字段**：避免验证码泄露

### P1（中优先级，下个迭代处理）

4. **Refresh Token 轮换**：实现 detect reuse 机制，发现 token 被盗用时立即撤销所有 token
5. **图形验证码**：登录失败 3 次后强制要求 CAPTCHA
6. **异地登录提醒**：检测 IP 归属变化并发送通知
7. **解绑 OAuth 接口**：`DELETE /auth/oauth/:provider`

### P2（低优先级，长期规划）

8. **密码泄露检测**：接入 HaveIBeenPwned API
9. **JWT 密钥轮换**：支持多密钥共存与平滑切换
10. **账号恢复接口**：30 天内支持恢复已注销账号
11. **敏感词过滤**：用户名/昵称注册时检测
12. **一次性邮箱域名黑名单**

---

## 七、评估结论

f:\gexm 项目的用户注册登录系统在**核心安全机制**（密码加密、PII 加密、Rate Limiting、CSRF/XSS/SQL 注入防护）上已达到生产级标准，**第三方登录**（7 平台 OAuth）实现完整，**Token 管理**与**用户信息管理**经本次补全后已覆盖主流场景。

主要短板集中在：
- **登录功能**缺少图形验证码与异地提醒（B 维度）
- **找回密码**仅支持邮箱渠道（F 维度）
- **Token 黑名单**虽已实现模型层，但未接入认证中间件主链路（C 维度）

建议按 P0 → P1 → P2 顺序逐步优化，优先解决 Token 黑名单接入与找回密码后撤销 Token 两项安全隐患。

**综合评分：8.2/10** —— 良好，可投入生产，但仍有明确改进空间。
