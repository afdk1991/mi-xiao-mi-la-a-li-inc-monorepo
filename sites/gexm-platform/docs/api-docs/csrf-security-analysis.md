# CSRF 防护实现分析报告

## 1. 安全需求评估

### 需要 CSRF 保护的 HTTP 方法
根据 OWASP CSRF 防护最佳实践，以下 HTTP 方法需要进行 CSRF 保护：
- **POST**：创建新资源、提交表单、执行操作
- **PUT**：更新现有资源
- **DELETE**：删除资源
- **PATCH**：部分更新资源

### 不需要 CSRF 保护的 HTTP 方法
- **GET**：只读操作，不应改变服务器状态
- **HEAD**：只读操作，只获取响应头
- **OPTIONS**：获取支持的 HTTP 方法

## 2. 路由安全分析

### 高危路由（必须 CSRF 保护）

| 路由 | 方法 | 功能 | 安全等级 | CSRF 要求 |
|-----|-----|-----|---------|----------|
| `/api/auth/login` | POST | 用户登录 | 高 | 可选（首次访问） |
| `/api/auth/register` | POST | 用户注册 | 高 | 可选（首次访问） |
| `/api/auth/logout` | POST | 用户注销 | 高 | 必须 |
| `/api/auth/profile` | PUT | 更新用户信息 | 高 | 必须 |
| `/api/auth/password` | PUT | 修改密码 | 高 | 必须 |
| `/api/users` | POST | 创建用户 | 高 | 必须 |
| `/api/users/:id` | PUT | 更新用户 | 高 | 必须 |
| `/api/users/:id` | DELETE | 删除用户 | 高 | 必须 |
| `/api/chat/conversations` | POST | 创建会话 | 中 | 必须 |
| `/api/chat/conversations/:id/messages` | POST | 发送消息 | 中 | 必须 |
| `/api/chat/comments` | POST | 发表评论 | 中 | 必须 |
| `/api/chat/comments/:id` | DELETE | 删除评论 | 中 | 必须 |
| `/api/orders` | POST | 创建订单 | 高 | 必须 |
| `/api/payment` | POST | 支付处理 | 高 | 必须 |
| `/api/cart` | POST/PUT/DELETE | 购物车操作 | 中 | 必须 |

### 特殊处理路由

#### 登录和注册接口
**分析**：登录和注册接口在用户首次访问时使用，此时用户尚未获得 CSRF 令牌。如果强制 CSRF 保护，会导致新用户无法注册或登录。

**解决方案**：
1. 方案 A：登录/注册接口不启用 CSRF 保护，依赖速率限制器防止暴力攻击
2. 方案 B：前端在访问任何页面时先获取 CSRF 令牌，然后在登录/注册请求中携带令牌
3. 方案 C：使用 AJAX 请求，前端可以先 GET 获取 CSRF 令牌，然后 POST 登录

**推荐方案**：采用方案 B，在首次访问时由 csrfTokenMiddleware 自动生成并设置 CSRF Cookie，前端读取 Cookie 并在后续请求中携带 X-CSRF-Token 头。

## 3. 实现方案

### 后端实现
1. 全局启用 `csrfTokenMiddleware`，自动生成 CSRF Cookie
2. 在需要 CSRF 保护的路由上添加 `csrfProtectionMiddleware`
3. 创建路由级中间件配置，灵活控制 CSRF 保护范围

### 前端实现
```javascript
// 前端获取 CSRF Token
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return value;
    }
  }
  return null;
}

// 在请求头中携带 CSRF Token
axios.defaults.headers.common['X-CSRF-Token'] = getCsrfToken();
```

## 4. 安全策略分层

### 第一层：速率限制
- 登录限制器：防止暴力破解
- 注册限制器：防止批量注册
- 消息限制器：防止消息轰炸

### 第二层：认证授权
- JWT Token 验证用户身份
- 权限验证确保用户只能操作自己的资源

### 第三层：CSRF 防护
- Double-submit Cookie 模式
- Cookie 与 Header Token 双重验证

### 第四层：输入验证
- XSS 过滤中间件
- 输入清理中间件
- 参数类型验证

## 5. 实施计划

### Phase 1：全局 CSRF Token 分发（已完成）
- `csrfTokenMiddleware` 已全局启用
- 自动生成 CSRF Cookie

### Phase 2：关键路由 CSRF 保护（进行中）
- 用户管理路由
- 订单支付路由
- 数据修改路由

### Phase 3：前端 CSRF Token 携带（待实施）
- 前端统一请求拦截器
- 自动读取 Cookie 并设置 Header

### Phase 4：测试验证（待实施）
- CSRF Token 验证测试
- 异常请求拦截测试
- 安全评估报告

---

**文档更新日期**：2026-06-26