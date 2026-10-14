# Gexm 平台安全审计与加固方案

## 文档概述

本文档对 Gexm 全平台应用系统进行全面的安全审计，识别潜在安全风险并提供加固方案。所有发现的问题按严重程度分级：**严重**、**中等**、**建议**。

---

## 一、代码安全审计

### 1.1 SQL 注入防护

**审计结果：✅ 整体良好**

**现状分析：**
- 使用 `better-sqlite3` 的 `prepare()` 预编译语句
- 所有查询都使用参数化查询（`?` 占位符）
- 动态拼接 SQL 的场景都有白名单控制

**检查的关键模块：**

| 模块 | 文件 | 风险等级 | 状态 |
|------|------|----------|------|
| 用户模块 | `models/userModel.js` | - | ✅ 安全 |
| 商品模块 | `models/productModel.js` | - | ✅ 安全 |
| 订单模块 | `services/orderService.js` | - | ✅ 安全 |
| 搜索模块 | `controllers/searchController.js` | - | ✅ 安全 |
| 聊天模块 | `controllers/chatController.js` | - | ✅ 安全 |

**动态 SQL 拼接验证：**

1. **产品列表查询** (`productModel.findAll`)
   - WHERE 条件动态拼接，但参数通过 `params` 数组传递
   - ORDER BY 使用 switch 白名单控制
   - ✅ 无注入风险

2. **订单服务中的 IN 查询** (`orderService.getCartItems`)
   ```javascript
   const placeholders = cartItemIds.map(() => '?').join(',');
   sql += ` AND c.id IN (${placeholders})`;
   params.push(...cartItemIds);
   ```
   - 使用占位符 + 参数数组
   - ✅ 无注入风险

3. **用户搜索查询** (`userModel.findAll`)
   - LIKE 查询使用参数化
   - ✅ 无注入风险

**加固建议（建议级）：**

1. **定期代码审计**
   - 使用 ESLint 规则检测 SQL 拼接
   - Code Review 重点关注动态 SQL

2. **输入类型校验**
   - 数字型 ID 提前做类型转换
   - 避免意外的字符串拼接

---

### 1.2 XSS 攻击防护

**审计结果：⚠️ 中等风险 - 防护机制存在但设计有缺陷**

**现状分析：**

现有防护措施：
1. `xssFilterMiddleware` - 过滤危险标签和属性
2. `sanitizeInputMiddleware` - HTML 实体编码
3. `helmet` + CSP 安全头

**发现的问题：**

#### 问题 1：双重转义可能导致业务问题 【中等】

**位置：** `middleware/security.js`

两个中间件都对输入进行处理：
- `xssFilterMiddleware`：正则过滤危险标签
- `sanitizeInputMiddleware`：将 `<>"'&` 全部转义为 HTML 实体

**风险：**
- 用户输入 `5 < 3` 被存为 `5 &lt; 3`
- 输出时如果再次转义会变成 `5 &amp;lt; 3`
- 商品描述、评论内容等富文本场景完全无法使用

**建议方案：**
- 采用「输入过滤 + 输出编码」的标准模式
- 存储原始数据，输出时根据场景编码
- 或使用成熟的 XSS 过滤库（如 DOMPurify）

#### 问题 2：XSS 过滤规则可绕过 【中等】

**位置：** `middleware/security.js` 中的 XSS_PATTERNS

**绕过风险：**
```
<img src=x onerror=alert(1)>
```
- 正则过滤了 `onerror=` 形式
- 但可能存在编码绕过、换行绕过等技巧

**建议方案：**
- 对于 H5 端，优先使用 CSP 防护
- 关键输出位置做输出编码
- 考虑使用 DOMPurify 等成熟方案

#### 问题 3：小程序/APP 端 XSS 风险较低

**分析：**
- uni-app 小程序端原生不支持 HTML 渲染
- APP 端 WebView 需要额外注意
- 主要风险在 H5 端

**加固建议：**

| 优先级 | 措施 | 实施难度 |
|--------|------|----------|
| 高 | 修复双重转义问题，保留输入原始性 | 中 |
| 高 | H5 端确保 CSP 头正确配置 | 低 |
| 中 | 富文本场景使用 DOMPurify 白名单过滤 | 中 |
| 低 | 评估是否需要替换为专业 XSS 库 | 低 |

---

### 1.3 CSRF 防护验证

**审计结果：⚠️ 中等风险 - 机制存在但有配置缺陷**

**现状分析：**

现有防护：
1. Cookie 存储 CSRF Token
2. 请求头 `X-CSRF-Token` 验证
3. 按路由配置保护级别

**发现的问题：**

#### 问题 1：CSRF Cookie 的 httpOnly 设为 false 【严重】

**位置：** `middleware/security.js:82`

```javascript
res.cookie('csrf-token', csrfToken, {
  httpOnly: false,  // ❌ 不安全
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
});
```

**风险分析：**
- `httpOnly: false` 意味着 JS 可以读取 Cookie
- 虽然 CSRF Token 设计上就是需要前端读取的，但：
  - 如果有 XSS 漏洞，攻击者可以直接获取 CSRF Token
  - 降低了 XSS + CSRF 组合攻击的门槛

**权衡说明：**
- CSRF Token 的工作机制要求前端能读取到 Token
- 这是 CSRF 防护的标准做法
- 真正的解决方案是彻底杜绝 XSS 漏洞

**建议：**
- 保持现状（这是标准做法）
- 但要确保 XSS 防护到位
- ⚠️ 标记为「需要关注」，不作为严重问题

#### 问题 2：小程序/APP 端 CSRF 防护失效 【中等】

**位置：** `utils/request.js:25-27`

```javascript
// 其他平台返回空（小程序/APP 不支持 Cookie）
#ifndef H5
return '';
#endif
```

**风险分析：**
- 小程序和 APP 端不支持 Cookie
- CSRF Token 无法通过 Cookie 传递
- 这些平台的 POST 请求不受 CSRF 保护

**技术背景：**
- 小程序的网络请求有同源限制，CSRF 风险较低
- APP 端原生请求不存在 CSRF 问题
- 主要风险在 H5 Web 端

**建议方案：**
- H5 端保持 CSRF 防护
- 小程序/APP 端可考虑使用 Header Token 方案
- 或接受这些平台的低风险现状

#### 问题 3：登录/注册接口排除 CSRF 保护 【建议】

**位置：** `middleware/csrfConfig.js:46`

```javascript
auth: {
  enabled: true,
  exclude: ['/login', '/register', '/refresh'],  // 排除了登录注册
}
```

**分析：**
- 登录接口 CSRF 攻击风险较低（攻击者不知道密码）
- 但存在「CSRF 登录」攻击可能：攻击者诱导用户登录自己的账号
- 通常做法是排除登录注册，避免首次访问无 Token 的问题

**建议：**
- 保持现状，这是行业常见做法
- 如果安全要求高，可考虑在登录页先 GET 获取 Token

---

### 1.4 敏感数据加密检查

**审计结果：⚠️ 中等风险 - 密码存储安全，但配置有改进空间**

#### 1.4.1 密码存储

**现状：✅ 良好**

- 使用 `bcryptjs` 进行密码哈希
- 盐轮数：10 轮
- 符合安全最佳实践

**验证位置：**
- `models/userModel.js:27` - 创建用户时哈希
- `models/userModel.js:106` - 修改密码时哈希
- `models/userModel.js:161` - 密码比对

**加固建议：**

| 项 | 现状 | 建议 | 优先级 |
|----|------|------|--------|
| 哈希算法 | bcryptjs | bcryptjs（保持） | - |
| 盐轮数 | 10 | 12（性能可接受的话） | 低 |
| 密码长度 | 6 位 | 8 位 + 复杂度要求 | 中 |

#### 1.4.2 JWT Token 安全

**发现的问题：**

#### 问题 1：默认 JWT 密钥强度不足 【严重】

**位置：** `config/index.js:8`

```javascript
secret: process.env.JWT_SECRET || 'gexm_jwt_secret_key_2024',  // ⚠️ 默认密钥
```

**风险分析：**
- 生产环境如果忘记配置环境变量，会使用默认弱密钥
- 默认密钥在代码仓库中公开，等于无密钥
- 攻击者可以伪造任意用户的 Token

**现有保护：**
- `app.js:43-54` 有生产环境密钥长度检查和警告
- 但只是警告，不阻止启动

**加固建议：**
```javascript
// 生产环境强制要求强密钥
if (config.env === 'production') {
  if (config.jwt.secret.length < 32 || config.jwt.secret === 'gexm_jwt_secret_key_2024') {
    logger.error('JWT_SECRET is too weak! Please set a strong secret in production.');
    process.exit(1);  // 强制退出，拒绝启动
  }
}
```

#### 问题 2：Token 有效期较长 【中等】

**现状：**
- Access Token: 24小时
- Refresh Token: 7天

**风险分析：**
- Token 被盗用后可使用较长时间
- 没有 Token 撤销机制（只能等过期）

**加固建议：**
| Token 类型 | 建议有效期 | 场景 |
|-----------|-----------|------|
| Access Token | 2小时 | 降低泄露影响 |
| Refresh Token | 7天 | 保持登录体验 |
| 敏感操作 | 需要重新验证密码 | 修改密码、支付等 |

#### 问题 3：JWT 未配置 issuer/audience 【建议】

**建议：**
```javascript
jwt.sign(payload, secret, {
  expiresIn: '2h',
  issuer: 'gexm-platform',
  audience: 'gexm-app',
});
```

---

### 1.5 文件上传安全

**审计结果：⚠️ 中等风险 - 基础防护存在，可进一步加强**

**现状分析：**

现有防护措施：
1. 文件大小限制（10MB）
2. MIME 类型白名单检查
3. 随机文件名（UUID）
4. 文件存储在 uploads 目录

**发现的问题：**

#### 问题 1：仅验证 MIME 类型，易被绕过 【中等】

**位置：** `controllers/uploadController.js:66-73`

```javascript
const isValidType = ALLOWED_FILE_TYPES.some(
  type => req.file.mimetype.startsWith(type) || req.file.mimetype === type
);
```

**风险：**
- MIME 类型由客户端提供，可伪造
- 攻击者可以上传 `.php` 文件但声称是 `image/jpeg`
- 虽然当前是 Node.js 环境，但仍有其他风险

**加固建议：**
1. **文件头验证**（魔数检查）
   ```javascript
   const fs = require('fs');
   
   function isValidImage(filePath) {
     const buffer = fs.readFileSync(filePath, 0, 4);
     const magic = buffer.toString('hex');
     // JPEG: ffd8ff, PNG: 89504e47, GIF: 47494638
     return magic.startsWith('ffd8ff') || 
            magic.startsWith('89504e47') || 
            magic.startsWith('47494638');
   }
   ```

2. **文件扩展名验证**
   - 检查文件扩展名与 MIME 是否匹配
   - 白名单允许的扩展名

#### 问题 2：上传目录可直接执行风险 【建议】

**风险分析：**
- 当前 Express 静态服务 `/uploads`
- 如果攻击者上传可执行文件，可能被执行
- Node.js 环境下风险相对较低

**加固建议：**
1. 上传目录与代码目录分离
2. Nginx 托管静态文件时禁用脚本执行
3. 使用独立域名/对象存储

#### 问题 3：缺少文件病毒扫描 【建议】

- 如有条件，集成 ClamAV 等病毒扫描
- 适合用户量较大的场景

---

## 二、认证与授权审计

### 2.1 JWT Token 安全配置

#### 问题汇总表

| 问题 | 严重级别 | 位置 | 修复建议 |
|------|----------|------|----------|
| 默认密钥弱 | 严重 | `config/index.js:8` | 生产环境强制强密钥，否则拒绝启动 |
| Access Token 24小时偏长 | 中等 | `config/index.js:9` | 缩短为 2 小时 |
| 无 Token 黑名单/撤销 | 中等 | - | 关键场景需要时引入 Redis |
| 缺少 issuer/audience | 建议 | `models/userModel.js:165` | 添加 iss/aud 声明 |

### 2.2 权限验证完整性检查

**审计结果：✅ 整体良好**

**验证的权限控制点：**

| 模块 | 权限检查 | 状态 |
|------|----------|------|
| 订单详情 | 验证 `order.user_id === userId` | ✅ |
| 订单操作 | 验证 `order.user_id === userId` | ✅ |
| 会话详情 | 验证 `creator_id` 或 `participant_id` | ✅ |
| 消息发送 | 验证会话成员身份 | ✅ |
| 评论删除 | 验证 `userId === comment.userId` | ✅ |
| 管理员接口 | `adminMiddleware` 验证 role | ✅ |

**发现的潜在越权点：**

#### 问题 1：地址操作越权检查 【建议确认】

**需要检查：** `controllers/addressController.js`
- 查询、修改、删除地址时是否验证 `user_id`
- 防止通过 `id` 遍历他人地址

#### 问题 2：收藏操作越权检查 【建议确认】

**需要检查：** `controllers/favoriteController.js`
- 取消收藏时是否验证属于当前用户

### 2.3 接口权限边界检查

**管理员接口权限：✅ 良好**

```javascript
// routes/admin.js
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.verifyAdmin);
```

- 所有 `/api/admin/*` 路由都经过管理员验证
- 管理员路由独立挂载，边界清晰

**普通用户接口：**
- 需要登录的接口使用 `authMiddleware`
- 公开接口（商品列表、详情等）不强制登录
- 整体设计合理

---

## 三、输入验证审计

### 3.1 参数验证完整性

**审计结果：⚠️ 中等风险 - 关键接口有验证，但不全面**

**验证充分的接口：**
- 注册：用户名长度、邮箱格式、密码长度 ✅
- 登录：用户名密码非空 ✅
- 商品创建：名称、价格必填 ✅
- 库存调整：数量有效性检查 ✅

**缺少充分验证的接口：**

| 接口 | 缺少的验证 | 风险等级 |
|------|-----------|----------|
| 用户更新资料 | 昵称长度、手机号格式、头像 URL 格式 | 低 |
| 修改密码 | 新密码复杂度检查 | 中 |
| 创建地址 | 各字段长度限制、手机号格式 | 低 |
| 提交评论 | 内容长度限制 | 中 |
| 发送消息 | 内容长度限制 | 中 |
| 搜索关键词 | 关键词长度限制 | 低 |
| 订单备注 | 备注长度限制 | 低 |

### 3.2 输入验证规范建议

**建议引入统一的验证中间件或库：**

方案一：手动验证（轻量）
```javascript
// utils/validator.js
const validators = {
  isUsername: (v) => /^[a-zA-Z0-9_]{3,20}$/.test(v),
  isEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  isPhone: (v) => /^1[3-9]\d{9}$/.test(v),
  isSafeString: (v, max = 255) => typeof v === 'string' && v.length <= max,
  isInt: (v, min, max) => {
    const n = parseInt(v, 10);
    return !isNaN(n) && n >= min && n <= max;
  },
};
```

方案二：使用 Joi / Zod 等验证库（推荐）
- 更完善的验证规则
- 更好的错误提示
- 适合项目规模扩大后

### 3.3 特殊字符过滤

**现状：**
- `sanitizeInputMiddleware` 全局转义 HTML 特殊字符
- 属于「过度防护」但相对安全

**建议调整：**
- 不要在入口统一转义（破坏原始数据）
- 在输出时根据场景做编码
- 数据库存储原始内容

---

## 四、生产环境安全

### 4.1 HTTP 安全头配置

**审计结果：✅ 配置较全面**

**现有配置：** `middleware/security.js:135-146`

| 安全头 | 值 | 状态 |
|--------|-----|------|
| X-Content-Type-Options | nosniff | ✅ |
| X-Frame-Options | DENY | ✅ |
| X-XSS-Protection | 1; mode=block | ✅ |
| HSTS | max-age=31536000; includeSubDomains | ✅ |
| CSP | 已配置 | ⚠️ 需优化 |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | 已配置 | ✅ |

**CSP 优化建议：**

当前 CSP：
```
default-src 'self'; 
script-src 'self' 'unsafe-inline'; 
style-src 'self' 'unsafe-inline'; 
img-src 'self' data: https:; 
font-src 'self'; 
connect-src 'self' https: wss:;
```

**问题：**
- `'unsafe-inline'` 降低了 CSP 的防护效果
- 但 uni-app H5 构建可能依赖内联脚本

**建议：**
- 评估是否可以移除 `unsafe-inline`
- 如果必须保留，至少 CSP 能防御外部脚本注入

### 4.2 HTTPS 强制跳转

**现状：✅ 已配置**

```javascript
function forceHttpsMiddleware(req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https' && 
      process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}
```

**注意事项：**
- 依赖 `x-forwarded-proto` 头
- 确保反向代理（Nginx）正确设置此头
- 防止绕过：配置 `app.set('trust proxy', true)`

### 4.3 接口速率限制

**审计结果：✅ 配置良好**

**现有速率限制：**

| 类型 | 限制 | 窗口 | 适用 |
|------|------|------|------|
| 通用 API | 60次/分钟 | 1分钟 | 所有 /api/ 路径 |
| 登录 | 5次/5分钟 | 5分钟 | 登录接口 |
| 注册 | 3次/小时 | 1小时 | 注册接口 |
| 发消息 | 20次/分钟 | 1分钟 | 消息接口 |
| 上传 | 5次/分钟 | 1分钟 | 上传接口 |

**问题：**
- 登录/注册限制器定义了，但需要确认是否实际应用到路由上

**检查建议：**
- 确认 `authRoutes` 中是否使用了 `loginLimiter` 和 `registerLimiter`
- 消息接口是否使用了 `messageLimiter`

### 4.4 错误信息脱敏

**审计结果：✅ 良好**

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res) {
  logger.error('Unhandled error: %s', err.message, {
    stack: err.stack,  // 仅记录到日志
    url: req.url,
    method: req.method,
    ip: req.ip,
  });
  return errorResponse(res, '服务器内部错误', 1005, 500);  // 对外只返回通用错误
}
```

- 错误堆栈只记录在服务端日志
- 客户端只返回「服务器内部错误」
- ✅ 符合安全最佳实践

---

## 五、安全问题汇总与修复优先级

### 严重问题（必须立即修复）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | JWT 默认密钥生产环境可使用 | `config/index.js` + `app.js` | Token 伪造，全系统权限失控 |
| 2 | 登录速率限制器可能未应用 | `routes/auth.js` | 暴力破解密码 |

### 中等问题（近期修复）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | 双重输入转义可能导致业务问题 | `middleware/security.js` | 数据异常，用户体验差 |
| 2 | 文件上传仅验证 MIME 类型 | `controllers/uploadController.js` | 恶意文件上传 |
| 3 | Access Token 有效期 24 小时偏长 | `config/index.js` | Token 泄露后影响时间长 |
| 4 | 密码强度要求低（仅 6 位） | `controllers/authController.js` | 弱密码易被破解 |
| 5 | 多个接口缺少参数长度/格式验证 | 多个 controller | 数据异常、存储膨胀 |
| 6 | XSS 过滤规则可能被绕过 | `middleware/security.js` | XSS 攻击风险 |

### 建议优化（按需实施）

| # | 问题 | 位置 |
|---|------|------|
| 1 | JWT 缺少 issuer/audience | `models/userModel.js` |
| 2 | bcrypt 盐轮数可提升到 12 | `models/userModel.js` |
| 3 | 上传文件缺少内容头验证 | `controllers/uploadController.js` |
| 4 | 敏感操作缺少二次密码验证 | - |
| 5 | 无操作日志审计 | - |
| 6 | CSP 包含 unsafe-inline | `middleware/security.js` |
| 7 | 缺少密码错误次数锁定 | - |

---

## 六、加固实施路线图

### 第一阶段：严重问题修复（1 天）

- [ ] 生产环境强制 JWT 强密钥，弱密钥拒绝启动
- [ ] 确认登录/注册接口应用速率限制
- [ ] 增加密码错误次数临时锁定（可选）

### 第二阶段：中等问题修复（2-3 天）

- [ ] 修复双重转义问题，调整 XSS 防护策略
- [ ] 文件上传增加文件头和扩展名验证
- [ ] 缩短 Access Token 有效期至 2 小时
- [ ] 提升密码强度要求（8位+复杂度）
- [ ] 为主要接口添加参数长度/格式验证

### 第三阶段：安全增强（1-2 周）

- [ ] 添加操作审计日志
- [ ] 敏感操作二次验证
- [ ] 考虑引入 Redis 实现 Token 黑名单
- [ ] 优化 CSP 策略
- [ ] 安全头进一步加固
- [ ] 定期安全扫描和依赖检查

---

## 七、安全最佳实践清单

### 开发阶段
- [ ] 代码安全扫描（ESLint security 插件）
- [ ] Code Review 关注安全点
- [ ] 依赖定期更新（npm audit）
- [ ] 安全测试用例覆盖

### 部署阶段
- [ ] 环境变量管理（不提交密钥到代码库）
- [ ] HTTPS 强制开启
- [ ] 安全头配置验证
- [ ] 日志脱敏处理

### 运维阶段
- [ ] 定期安全审计
- [ ] 漏洞监控与响应
- [ ] 备份与恢复演练
- [ ] 入侵检测
