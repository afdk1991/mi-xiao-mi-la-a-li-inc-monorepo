# API 接口文档

## 文档概述

本文档描述了 GEXM 电商平台的所有 API 接口，涵盖认证、用户管理、商品、订单、支付、聊天等核心业务模块。后端基于 Express.js + SQLite (better-sqlite3) 构建，前端采用 uni-app + Vue3 + Pinia 技术栈。

### 接口总览

| 模块 | 接口数量 | 说明 |
|------|---------|------|
| 认证模块 | 7 | 用户登录、注册、令牌管理等 |
| 用户管理 | 5 | 管理员用户增删改查 |
| 商品模块 | 9 | 商品 CRUD、SKU、评论等 |
| 分类模块 | 5 | 分类树、分类商品管理 |
| 购物车 | 7 | 购物车增删改查、批量操作 |
| 订单模块 | 6 | 订单创建、查询、取消等 |
| 支付模块 | 3 | 支付发起、回调、状态查询 |
| 收藏模块 | 5 | 收藏列表、添加、取消等 |
| 地址模块 | 7 | 收货地址管理 |
| 通知模块 | 4 | 系统通知管理 |
| 聊天模块 | 12 | 会话、消息、评论管理 |
| 评论模块 | 2 | 商品评论发表、查询 |
| 搜索模块 | 3 | 商品搜索、热门词、建议 |
| 上传模块 | 2 | 文件和图片上传 |
| 同步模块 | 4 | 数据同步管理 |
| 错误日志 | 3 | 错误上报和统计 |
| 管理后台 | 13 | 后台管理专用接口 |
| 系统接口 | 1 | 健康检查 |
| **合计** | **96** | |

---

## 基础信息

### Base URL

- **开发环境**: `http://localhost:3000/api`
- **生产环境**: `https://your-domain.com/api`

### 数据格式

- **协议**: HTTPS (生产环境) / HTTP (开发环境)
- **数据格式**: JSON
- **字符编码**: UTF-8
- **时间格式**: ISO 8601 (如 `2024-01-01T00:00:00.000Z`)
- **时间戳**: 毫秒级 Unix 时间戳

### 统一响应格式

所有接口响应均采用统一格式：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {},
  "timestamp": 1704067200000,
  "requestId": "req_abc123def456"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 状态码，0 表示成功，非 0 表示错误 |
| message | string | 响应消息描述 |
| data | any | 响应数据，成功时返回业务数据，失败时为 null |
| timestamp | number | 服务器响应时间戳（毫秒） |
| requestId | string | 请求唯一标识，用于问题排查 |

#### 成功响应

`code = 0` 表示请求成功。

#### 错误响应

`code != 0` 表示请求失败，具体错误码见下文错误码表。

### 分页格式

分页接口的 `data` 字段包含以下结构：

```json
{
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| list | array | 数据列表 |
| total | number | 总记录数 |
| page | number | 当前页码 |
| pageSize | number | 每页数量 |
| totalPages | number | 总页数 |

### 认证方式

使用 Bearer Token 认证，在请求头中携带：

```
Authorization: Bearer <access_token>
```

> **注意**: 所有需要认证的接口，请求失败时返回 `code: 2001`，客户端需跳转到登录页。

### CSRF 说明

- **H5 环境**: 所有 POST/PUT/PATCH/DELETE 请求需携带 `X-CSRF-Token` 请求头
- **小程序/App 环境**: 不需要 CSRF Token
- CSRF Token 可通过接口响应头或登录接口获取

请求头示例：

```
X-CSRF-Token: <csrf_token>
```

### 调用频率限制

为防止滥用，部分接口设有频率限制。超出限制时返回 `code: 6001`。

---

## 通用错误码表

### 错误码分类

| 错误码范围 | 分类 | 说明 |
|-----------|------|------|
| 1000-1999 | 通用错误 | 未知错误、参数错误、资源不存在等 |
| 2000-2999 | 认证授权错误 | 未登录、Token无效、权限不足等 |
| 3000-3999 | 业务逻辑错误 | 用户名已存在、库存不足、订单无法取消等 |
| 4000-4999 | 资源操作错误 | 文件过大、文件类型不允许等 |
| 5000-5999 | 第三方服务错误 | 外部服务调用失败 |
| 6000-6999 | 安全相关错误 | 请求过于频繁、检测到攻击等 |

### 通用错误码 (1000-1999)

| code | 说明 | HTTP状态码 |
|------|------|-----------|
| 1000 | 未知错误 | 500 |
| 1001 | 参数错误 | 400 |
| 1002 | 缺少必需参数 | 400 |
| 1003 | 格式错误 | 400 |
| 1004 | 资源不存在 | 404 |
| 1005 | 资源冲突 | 409 |
| 1006 | 操作失败 | 500 |
| 1007 | 服务暂不可用 | 503 |

### 认证授权错误码 (2000-2999)

| code | 说明 | HTTP状态码 |
|------|------|-----------|
| 2001 | 未登录或登录已过期 | 401 |
| 2002 | 无效的认证令牌 | 401 |
| 2003 | 认证令牌已过期 | 401 |
| 2004 | 用户名或密码错误 | 401 |
| 2005 | 无权限访问 | 403 |
| 2006 | 账号已被禁用 | 403 |
| 2007 | 账号已被锁定 | 403 |

### 业务逻辑错误码 (3000-3999)

| code | 说明 | HTTP状态码 |
|------|------|-----------|
| 3001 | 用户名已存在 | 409 |
| 3002 | 邮箱已被使用 | 409 |
| 3003 | 手机号已被使用 | 409 |
| 3004 | 用户名格式不正确 | 400 |
| 3005 | 密码格式不正确 | 400 |
| 3101 | 会话不存在 | 404 |
| 3102 | 无权限访问该会话 | 403 |
| 3103 | 不能和自己聊天 | 400 |
| 3104 | AI 服务暂时不可用 | 503 |
| 3201 | 商品不存在 | 404 |
| 3202 | 商品已下架 | 400 |
| 3203 | 库存不足 | 400 |
| 3301 | 订单不存在 | 404 |
| 3302 | 订单无法取消 | 400 |
| 3303 | 订单已支付 | 400 |
| 3401 | 支付失败 | 500 |
| 3402 | 支付超时 | 408 |
| 3403 | 支付已取消 | 400 |

### 资源操作错误码 (4000-4999)

| code | 说明 | HTTP状态码 |
|------|------|-----------|
| 4001 | 文件过大 | 413 |
| 4002 | 文件类型不允许 | 400 |
| 4003 | 文件上传失败 | 500 |
| 4004 | 文件不存在 | 404 |

### 安全相关错误码 (6000-6999)

| code | 说明 | HTTP状态码 |
|------|------|-----------|
| 6001 | 请求过于频繁 | 429 |
| 6002 | 检测到可疑行为 | 403 |
| 6003 | CSRF 令牌无效 | 403 |
| 6004 | CSRF 令牌缺失 | 403 |
| 6005 | 检测到 XSS 攻击 | 403 |
| 6006 | 检测到 SQL 注入攻击 | 403 |
| 6007 | 无效的请求来源 | 403 |

---

## 1. 认证模块 (/api/auth)

### 1.1 登录

| 项目 | 内容 |
|------|------|
| 接口名称 | 登录 |
| 功能描述 | 用户使用用户名/邮箱和密码登录，获取访问令牌 |
| 请求URL | `/api/auth/login` |
| HTTP方法 | POST |
| 权限要求 | 公开 |
| 调用频率 | 5分钟内最多10次 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Content-Type | 是 | application/json |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| username | string | 是 | - | 用户名或邮箱 |
| password | string | 是 | - | 密码 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| accessToken | string | 访问令牌 |
| refreshToken | string | 刷新令牌 |
| expiresIn | number | 令牌有效期（秒） |
| user | object | 用户信息对象 |
| user.id | string | 用户ID |
| user.username | string | 用户名 |
| user.email | string | 邮箱 |
| user.nickname | string | 昵称 |
| user.avatar | string | 头像URL |
| user.phone | string | 手机号 |
| user.status | string | 状态（active/disabled） |
| user.role | string | 角色（admin/user） |
| user.created_at | string | 创建时间 |
| user.updated_at | string | 更新时间 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "user_001",
      "username": "admin",
      "email": "admin@gexm.com",
      "nickname": "超级管理员",
      "avatar": "",
      "phone": "",
      "status": "active",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**错误响应示例**:

```json
{
  "code": 2004,
  "message": "用户名或密码错误",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2004 | 用户名或密码错误 |
| 2006 | 账号已被禁用 |
| 6001 | 请求过于频繁 |

---

### 1.2 注册

| 项目 | 内容 |
|------|------|
| 接口名称 | 注册 |
| 功能描述 | 新用户注册账号 |
| 请求URL | `/api/auth/register` |
| HTTP方法 | POST |
| 权限要求 | 公开 |
| 调用频率 | 1小时内最多5次 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Content-Type | 是 | application/json |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| username | string | 是 | - | 用户名（3-20字符，字母数字下划线） |
| email | string | 是 | - | 邮箱地址 |
| password | string | 是 | - | 密码（至少6位） |
| nickname | string | 否 | - | 昵称 |
| phone | string | 否 | - | 手机号 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| user | object | 用户信息对象 |
| user.id | string | 用户ID |
| user.username | string | 用户名 |
| user.email | string | 邮箱 |
| user.nickname | string | 昵称 |
| user.avatar | string | 头像URL |
| user.phone | string | 手机号 |
| user.status | string | 状态 |
| user.role | string | 角色 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_002",
      "username": "testuser",
      "email": "test@gexm.com",
      "nickname": "测试用户",
      "avatar": "",
      "phone": "",
      "status": "active",
      "role": "user"
    }
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**错误响应示例**:

```json
{
  "code": 3001,
  "message": "用户名已存在",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 3001 | 用户名已存在 |
| 3002 | 邮箱已被使用 |
| 3004 | 用户名格式不正确 |
| 3005 | 密码格式不正确 |
| 6001 | 请求过于频繁 |

---

### 1.3 刷新令牌

| 项目 | 内容 |
|------|------|
| 接口名称 | 刷新令牌 |
| 功能描述 | 使用 refresh token 刷新 access token |
| 请求URL | `/api/auth/refresh` |
| HTTP方法 | POST |
| 权限要求 | 公开（需提供 refreshToken） |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| refreshToken | string | 是 | - | 刷新令牌 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| accessToken | string | 新的访问令牌 |
| refreshToken | string | 新的刷新令牌 |
| expiresIn | number | 有效期（秒） |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "令牌刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2002 | 无效的认证令牌 |
| 2003 | 认证令牌已过期 |

---

### 1.4 退出登录

| 项目 | 内容 |
|------|------|
| 接口名称 | 退出登录 |
| 功能描述 | 退出登录，吊销 refresh token |
| 请求URL | `/api/auth/logout` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| refreshToken | string | 是 | - | 刷新令牌 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "退出成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 1.5 获取用户资料

| 项目 | 内容 |
|------|------|
| 接口名称 | 获取用户资料 |
| 功能描述 | 获取当前登录用户的详细资料 |
| 请求URL | `/api/auth/profile` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 用户ID |
| username | string | 用户名 |
| email | string | 邮箱 |
| nickname | string | 昵称 |
| avatar | string | 头像URL |
| phone | string | 手机号 |
| status | string | 状态（active/disabled） |
| role | string | 角色（admin/user） |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "id": "user_001",
    "username": "admin",
    "email": "admin@gexm.com",
    "nickname": "超级管理员",
    "avatar": "",
    "phone": "",
    "status": "active",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 1.6 更新用户资料

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新用户资料 |
| 功能描述 | 更新当前登录用户的资料信息 |
| 请求URL | `/api/auth/profile` |
| HTTP方法 | PUT |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| nickname | string | 否 | - | 昵称 |
| avatar | string | 否 | - | 头像URL |
| phone | string | 否 | - | 手机号 |

**成功响应**: 返回更新后的用户资料（同获取用户资料）

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 2001 | 未登录或登录已过期 |
| 3003 | 手机号已被使用 |

---

### 1.7 修改密码

| 项目 | 内容 |
|------|------|
| 接口名称 | 修改密码 |
| 功能描述 | 修改当前登录用户的登录密码 |
| 请求URL | `/api/auth/password` |
| HTTP方法 | PUT |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| oldPassword | string | 是 | - | 旧密码 |
| newPassword | string | 是 | - | 新密码（至少6位） |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "密码修改成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2004 | 用户名或密码错误（旧密码错误） |
| 3005 | 密码格式不正确 |

---

## 2. 用户管理 (/api/users) - 管理员接口

### 2.1 用户列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 用户列表 |
| 功能描述 | 分页获取用户列表（管理员接口） |
| 请求URL | `/api/users` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| keyword | string | 否 | - | 搜索关键词（用户名/邮箱） |
| role | string | 否 | - | 角色筛选（admin/user） |
| status | string | 否 | - | 状态筛选（active/disabled） |

**成功响应**: 分页格式，list 中每项为用户对象

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 2.2 用户详情

| 项目 | 内容 |
|------|------|
| 接口名称 | 用户详情 |
| 功能描述 | 获取指定用户的详细信息（管理员接口） |
| 请求URL | `/api/users/:id` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 用户ID |

**成功响应**: 用户详情对象

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 2.3 创建用户

| 项目 | 内容 |
|------|------|
| 接口名称 | 创建用户 |
| 功能描述 | 管理员创建新用户 |
| 请求URL | `/api/users` |
| HTTP方法 | POST |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| username | string | 是 | - | 用户名 |
| email | string | 是 | - | 邮箱 |
| password | string | 是 | - | 密码 |
| nickname | string | 否 | - | 昵称 |
| phone | string | 否 | - | 手机号 |
| role | string | 否 | user | 角色（admin/user） |

**成功响应**: 创建的用户信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 3001 | 用户名已存在 |
| 3002 | 邮箱已被使用 |

---

### 2.4 更新用户

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新用户 |
| 功能描述 | 管理员更新用户信息 |
| 请求URL | `/api/users/:id` |
| HTTP方法 | PUT |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 用户ID |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| nickname | string | 否 | - | 昵称 |
| email | string | 否 | - | 邮箱 |
| phone | string | 否 | - | 手机号 |
| role | string | 否 | - | 角色（admin/user） |
| status | string | 否 | - | 状态（active/disabled） |
| password | string | 否 | - | 新密码（重置时使用） |

**成功响应**: 更新后的用户信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 3002 | 邮箱已被使用 |

---

### 2.5 删除用户

| 项目 | 内容 |
|------|------|
| 接口名称 | 删除用户 |
| 功能描述 | 管理员删除指定用户 |
| 请求URL | `/api/users/:id` |
| HTTP方法 | DELETE |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 用户ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

## 3. 商品模块 (/api/products)

### 3.1 商品列表（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 商品列表 |
| 功能描述 | 获取商品列表，支持分页、筛选、排序 |
| 请求URL | `/api/products` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| categoryId | string | 否 | - | 分类ID |
| keyword | string | 否 | - | 搜索关键词 |
| minPrice | number | 否 | - | 最低价格 |
| maxPrice | number | 否 | - | 最高价格 |
| sort | string | 否 | newest | 排序方式（newest/price_asc/price_desc/sales） |

**成功响应**: 分页格式，list 中每项为商品对象

**商品对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 商品ID |
| name | string | 商品名称 |
| subtitle | string | 副标题 |
| category_id | string | 分类ID |
| main_image | string | 主图URL |
| images | string | 图片列表JSON字符串 |
| price | number | 销售价格 |
| original_price | number | 原价 |
| stock | number | 库存数量 |
| sales | number | 销量 |
| description | string | 商品描述 |
| status | string | 状态（on_sale/off_sale） |
| sort_order | number | 排序权重 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": "product_001",
        "name": "智能手机 Pro Max",
        "subtitle": "全新旗舰，性能怪兽",
        "category_id": "cat_001",
        "main_image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
        "images": "[\"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800\"]",
        "price": 5999,
        "original_price": 6999,
        "stock": 100,
        "sales": 50,
        "description": "搭载最新处理器，超清屏幕，超长续航",
        "status": "on_sale",
        "sort_order": 0,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |

---

### 3.2 商品详情（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 商品详情 |
| 功能描述 | 获取单个商品的详细信息 |
| 请求URL | `/api/products/:id` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**成功响应**: 商品详情对象（包含 skus、category、review_stats 等扩展信息）

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 3201 | 商品不存在 |

---

### 3.3 商品SKU列表（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 商品SKU列表 |
| 功能描述 | 获取指定商品的所有SKU |
| 请求URL | `/api/products/:id/skus` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**成功响应**: SKU数组

**SKU对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | SKU ID |
| product_id | string | 商品ID |
| sku_name | string | SKU名称 |
| specs | string | 规格JSON字符串 |
| price | number | 价格 |
| original_price | number | 原价 |
| stock | number | 库存 |
| sku_image | string | SKU图片URL |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "id": "sku_001",
      "product_id": "product_001",
      "sku_name": "标准版",
      "specs": "{\"版本\":\"标准版\"}",
      "price": 5999,
      "original_price": 6999,
      "stock": 60,
      "sku_image": "https://..."
    }
  ],
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 3201 | 商品不存在 |

---

### 3.4 商品评论列表（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 商品评论列表 |
| 功能描述 | 获取指定商品的评论列表 |
| 请求URL | `/api/products/:id/reviews` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页数量 |
| rating | number | 否 | - | 评分筛选（1-5） |

**成功响应**: 分页格式，list 中每项为评论对象

**常见错误码**:

| code | 说明 |
|------|------|
| 3201 | 商品不存在 |

---

### 3.5 商品评论统计（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 商品评论统计 |
| 功能描述 | 获取指定商品的评论统计数据 |
| 请求URL | `/api/products/:id/reviews/stats` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| total | number | 评论总数 |
| avg_rating | number | 平均评分 |
| rating_distribution | object | 评分分布 |
| rating_distribution.5 | number | 5星数量 |
| rating_distribution.4 | number | 4星数量 |
| rating_distribution.3 | number | 3星数量 |
| rating_distribution.2 | number | 2星数量 |
| rating_distribution.1 | number | 1星数量 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "total": 100,
    "avg_rating": 4.8,
    "rating_distribution": {
      "5": 80,
      "4": 15,
      "3": 3,
      "2": 1,
      "1": 1
    }
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 3201 | 商品不存在 |

---

### 3.6 创建商品（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 创建商品 |
| 功能描述 | 管理员创建新商品 |
| 请求URL | `/api/products` |
| HTTP方法 | POST |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| name | string | 是 | - | 商品名称 |
| subtitle | string | 否 | - | 副标题 |
| category_id | string | 否 | - | 分类ID |
| main_image | string | 否 | - | 主图URL |
| images | array | 否 | - | 图片URL列表 |
| price | number | 是 | - | 销售价格 |
| original_price | number | 否 | - | 原价 |
| stock | number | 否 | 0 | 库存数量 |
| description | string | 否 | - | 商品描述 |
| status | string | 否 | on_sale | 状态（on_sale/off_sale） |
| sort_order | number | 否 | 0 | 排序权重 |
| skus | array | 否 | - | SKU列表 |

**成功响应**: 创建的商品详情

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 3.7 更新商品（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新商品 |
| 功能描述 | 管理员更新商品信息 |
| 请求URL | `/api/products/:id` |
| HTTP方法 | PUT |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**请求体参数**: 同创建商品，所有参数可选

**成功响应**: 更新后的商品详情

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 3201 | 商品不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 3.8 删除商品（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 删除商品 |
| 功能描述 | 管理员删除指定商品 |
| 请求URL | `/api/products/:id` |
| HTTP方法 | DELETE |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 3201 | 商品不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 3.9 更新商品状态（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新商品状态 |
| 功能描述 | 管理员更新商品上架/下架状态 |
| 请求URL | `/api/products/:id/status` |
| HTTP方法 | PATCH |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| status | string | 是 | - | 状态（on_sale/off_sale） |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "状态更新成功",
  "data": {
    "id": "product_001",
    "status": "off_sale"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 3201 | 商品不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

## 4. 分类模块 (/api/categories)

### 4.1 分类树（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 分类树 |
| 功能描述 | 获取分类树形结构 |
| 请求URL | `/api/categories` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**成功响应**: 分类树数组，每个分类包含 children 子分类数组

**分类对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 分类ID |
| name | string | 分类名称 |
| parent_id | string | 父分类ID |
| level | number | 层级 |
| icon | string | 图标 |
| sort_order | number | 排序权重 |
| status | string | 状态（active/inactive） |
| children | array | 子分类列表 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "id": "cat_001",
      "name": "数码电子",
      "parent_id": null,
      "level": 1,
      "icon": "📱",
      "sort_order": 1,
      "status": "active",
      "children": [
        {
          "id": "cat_002",
          "name": "手机",
          "parent_id": "cat_001",
          "level": 2,
          "icon": "📲",
          "sort_order": 1,
          "status": "active",
          "children": []
        }
      ]
    }
  ],
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

---

### 4.2 分类下商品（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 分类下商品 |
| 功能描述 | 获取指定分类下的商品列表 |
| 请求URL | `/api/categories/:id/products` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 分类ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| sort | string | 否 | newest | 排序方式 |
| includeSubcategories | boolean | 否 | true | 是否包含子分类商品 |

**成功响应**: 分页格式，同商品列表

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |

---

### 4.3 创建分类（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 创建分类 |
| 功能描述 | 管理员创建新分类 |
| 请求URL | `/api/categories` |
| HTTP方法 | POST |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| name | string | 是 | - | 分类名称 |
| parent_id | string | 否 | null | 父分类ID |
| icon | string | 否 | - | 图标 |
| sort_order | number | 否 | 0 | 排序权重 |
| status | string | 否 | active | 状态（active/inactive） |

**成功响应**: 创建的分类信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 4.4 更新分类（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新分类 |
| 功能描述 | 管理员更新分类信息 |
| 请求URL | `/api/categories/:id` |
| HTTP方法 | PUT |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 分类ID |

**请求体参数**: 同创建分类，所有参数可选

**成功响应**: 更新后的分类信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 4.5 删除分类（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 删除分类 |
| 功能描述 | 管理员删除指定分类 |
| 请求URL | `/api/categories/:id` |
| HTTP方法 | DELETE |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 分类ID |

**特殊说明**: 有子分类时无法删除，需先删除子分类

**成功响应示例**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 1005 | 资源冲突（存在子分类） |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

## 5. 购物车 (/api/cart)

### 5.1 购物车列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 购物车列表 |
| 功能描述 | 获取当前用户的购物车列表 |
| 请求URL | `/api/cart` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**成功响应**: 购物车项数组

**购物车项字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 购物车项ID |
| user_id | string | 用户ID |
| product_id | string | 商品ID |
| sku_id | string | SKU ID |
| quantity | number | 数量 |
| selected | number | 是否选中（0/1） |
| product | object | 商品信息 |
| sku | object | SKU信息 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "id": "cart_001",
      "user_id": "user_001",
      "product_id": "product_001",
      "sku_id": "sku_001",
      "quantity": 2,
      "selected": 1,
      "product": {
        "id": "product_001",
        "name": "智能手机 Pro Max",
        "main_image": "https://...",
        "price": 5999
      },
      "sku": {
        "id": "sku_001",
        "sku_name": "标准版",
        "price": 5999
      }
    }
  ],
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 5.2 购物车数量

| 项目 | 内容 |
|------|------|
| 接口名称 | 购物车数量 |
| 功能描述 | 获取当前用户购物车商品总数量 |
| 请求URL | `/api/cart/count` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| count | number | 购物车商品总数 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "count": 5
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 5.3 添加商品

| 项目 | 内容 |
|------|------|
| 接口名称 | 添加商品到购物车 |
| 功能描述 | 向购物车添加商品 |
| 请求URL | `/api/cart` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| productId | string | 是 | - | 商品ID |
| skuId | string | 否 | - | SKU ID |
| quantity | number | 否 | 1 | 数量 |

**成功响应**: 新增的购物车项

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 3201 | 商品不存在 |
| 3203 | 库存不足 |

---

### 5.4 更新数量

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新购物车数量 |
| 功能描述 | 更新购物车中指定商品的数量 |
| 请求URL | `/api/cart/:id` |
| HTTP方法 | PUT |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 购物车项ID |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| quantity | number | 是 | - | 数量 |

**成功响应**: 更新后的购物车项

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 3203 | 库存不足 |

---

### 5.5 删除商品

| 项目 | 内容 |
|------|------|
| 接口名称 | 删除购物车商品 |
| 功能描述 | 从购物车中删除指定商品 |
| 请求URL | `/api/cart/:id` |
| HTTP方法 | DELETE |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 购物车项ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |

---

### 5.6 批量删除

| 项目 | 内容 |
|------|------|
| 接口名称 | 批量删除购物车商品 |
| 功能描述 | 批量删除购物车中的商品 |
| 请求URL | `/api/cart` |
| HTTP方法 | DELETE |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ids | array | 是 | - | 购物车项ID列表 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "批量删除成功",
  "data": {
    "deletedCount": 3
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |

---

### 5.7 更新选中状态

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新选中状态 |
| 功能描述 | 更新购物车商品的选中状态，支持单个切换和全选 |
| 请求URL | `/api/cart/select` |
| HTTP方法 | PATCH |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | string | 否 | - | 购物车项ID（单个切换时使用） |
| selected | number | 否 | - | 选中状态（0/1），配合 id 使用 |
| allSelected | number | 否 | - | 全选状态（0/1），设置全选 |

**特殊说明**: 
- 单个切换：传入 `id` 和 `selected`
- 全选切换：传入 `allSelected`

**成功响应示例**:

```json
{
  "code": 0,
  "message": "更新成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 2001 | 未登录或登录已过期 |

---

## 6. 订单模块 (/api/orders)

### 6.1 订单列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 订单列表 |
| 功能描述 | 获取当前用户的订单列表 |
| 请求URL | `/api/orders` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页数量 |
| status | string | 否 | - | 订单状态筛选 |

**订单状态枚举**:

| 状态 | 说明 |
|------|------|
| pending | 待付款 |
| paid | 待发货 |
| shipped | 待收货 |
| completed | 已完成 |
| cancelled | 已取消 |

**订单对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 订单ID |
| order_no | string | 订单编号 |
| user_id | string | 用户ID |
| status | string | 订单状态 |
| total_amount | number | 商品总金额 |
| freight | number | 运费 |
| discount_amount | number | 优惠金额 |
| pay_amount | number | 实付金额 |
| pay_method | string | 支付方式 |
| pay_time | string | 支付时间 |
| shipping_address | string | 收货地址JSON |
| remark | string | 订单备注 |
| created_at | string | 创建时间 |
| items | array | 订单项列表 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": "order_001",
        "order_no": "ORD202401010001",
        "user_id": "user_001",
        "status": "pending",
        "total_amount": 5999,
        "freight": 0,
        "discount_amount": 0,
        "pay_amount": 5999,
        "pay_method": null,
        "pay_time": null,
        "shipping_address": "{...}",
        "created_at": "2024-01-01T00:00:00.000Z",
        "items": []
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 6.2 订单详情

| 项目 | 内容 |
|------|------|
| 接口名称 | 订单详情 |
| 功能描述 | 获取指定订单的详细信息 |
| 请求URL | `/api/orders/:id` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 订单ID |

**成功响应**: 订单详情对象（包含完整订单项和物流信息）

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3301 | 订单不存在 |

---

### 6.3 订单预览

| 项目 | 内容 |
|------|------|
| 接口名称 | 订单预览 |
| 功能描述 | 预览订单信息，包括商品、金额、地址等 |
| 请求URL | `/api/orders/preview` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| type | string | 否 | cart | 类型（cart/direct） |
| cartItemIds | array | 否 | - | 购物车ID列表（type=cart时） |
| items | array | 否 | - | 直接购买商品列表（type=direct时） |
| addressId | string | 否 | - | 收货地址ID |

**直接购买商品项结构**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| productId | string | 商品ID |
| skuId | string | SKU ID |
| quantity | number | 数量 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| items | array | 商品项列表 |
| total_amount | number | 商品总金额 |
| freight | number | 运费 |
| discount_amount | number | 优惠金额 |
| pay_amount | number | 实付金额 |
| shipping_address | object | 收货地址 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "product_id": "product_001",
        "sku_id": "sku_001",
        "product_name": "智能手机 Pro Max",
        "product_image": "https://...",
        "sku_name": "标准版",
        "price": 5999,
        "quantity": 1,
        "total_price": 5999
      }
    ],
    "total_amount": 5999,
    "freight": 0,
    "discount_amount": 0,
    "pay_amount": 5999,
    "shipping_address": {
      "id": "addr_001",
      "name": "张三",
      "phone": "13800138000",
      "province": "广东省",
      "city": "深圳市",
      "district": "南山区",
      "detail": "科技园路1号",
      "is_default": 1
    }
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 2001 | 未登录或登录已过期 |
| 3203 | 库存不足 |

---

### 6.4 创建订单

| 项目 | 内容 |
|------|------|
| 接口名称 | 创建订单 |
| 功能描述 | 创建新订单 |
| 请求URL | `/api/orders` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| type | string | 否 | cart | 类型（cart/direct） |
| cartItemIds | array | 否 | - | 购物车ID列表（type=cart时） |
| items | array | 否 | - | 直接购买商品列表（type=direct时） |
| addressId | string | 是 | - | 收货地址ID |
| remark | string | 否 | - | 订单备注 |

**成功响应**: 创建的订单信息

**成功响应示例**:

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "order_001",
    "order_no": "ORD202401010001",
    "status": "pending",
    "total_amount": 5999,
    "pay_amount": 5999,
    "shipping_address": {...},
    "items": []
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 3203 | 库存不足 |

---

### 6.5 取消订单

| 项目 | 内容 |
|------|------|
| 接口名称 | 取消订单 |
| 功能描述 | 取消指定订单 |
| 请求URL | `/api/orders/:id/cancel` |
| HTTP方法 | PATCH |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 订单ID |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| cancelReason | string | 否 | - | 取消原因 |

**特殊说明**: 仅待付款（pending）和待发货（paid）状态可取消

**成功响应示例**:

```json
{
  "code": 0,
  "message": "取消成功",
  "data": {
    "id": "order_001",
    "status": "cancelled"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3301 | 订单不存在 |
| 3302 | 订单无法取消 |

---

### 6.6 确认收货

| 项目 | 内容 |
|------|------|
| 接口名称 | 确认收货 |
| 功能描述 | 确认订单已收货 |
| 请求URL | `/api/orders/:id/confirm` |
| HTTP方法 | PATCH |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 订单ID |

**特殊说明**: 仅待收货（shipped）状态可确认

**成功响应示例**:

```json
{
  "code": 0,
  "message": "确认收货成功",
  "data": {
    "id": "order_001",
    "status": "completed"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3301 | 订单不存在 |

---

## 7. 支付模块 (/api/payment)

### 7.1 支付回调（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 支付回调 |
| 功能描述 | 第三方支付平台回调接口，用于更新订单支付状态 |
| 请求URL | `/api/payment/callback/:method` |
| HTTP方法 | POST |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| method | string | 是 | 支付方式（wechat/alipay/mock） |

**请求体参数**: 根据不同支付方式，参数格式不同

**通用回调参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| out_trade_no | string | 是 | 商户订单号 |
| transaction_id | string | 否 | 第三方交易号 |
| status | string | 是 | 支付状态（success/failed） |
| amount | number | 否 | 支付金额 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 3301 | 订单不存在 |
| 3401 | 支付失败 |

---

### 7.2 发起支付

| 项目 | 内容 |
|------|------|
| 接口名称 | 发起支付 |
| 功能描述 | 发起订单支付 |
| 请求URL | `/api/payment/pay` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| orderId | string | 是 | - | 订单ID |
| payMethod | string | 是 | - | 支付方式（wechat/alipay/mock） |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| paymentId | string | 支付记录ID |
| paymentNo | string | 支付流水号 |
| orderId | string | 订单ID |
| amount | number | 支付金额 |
| payMethod | string | 支付方式 |
| status | string | 支付状态 |
| payParams | object | 支付参数（用于调起第三方支付） |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "支付发起成功",
  "data": {
    "paymentId": "pay_001",
    "paymentNo": "PAY202401010001",
    "orderId": "order_001",
    "amount": 5999,
    "payMethod": "mock",
    "status": "success",
    "payParams": {}
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 3301 | 订单不存在 |
| 3303 | 订单已支付 |
| 3401 | 支付失败 |

---

### 7.3 支付状态查询

| 项目 | 内容 |
|------|------|
| 接口名称 | 支付状态查询 |
| 功能描述 | 查询指定订单的支付状态 |
| 请求URL | `/api/payment/:orderId/status` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| orderId | string | 是 | 订单ID |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| orderId | string | 订单ID |
| orderStatus | string | 订单状态 |
| payAmount | number | 支付金额 |
| payMethod | string | 支付方式 |
| payTime | string | 支付时间 |
| paymentStatus | string | 支付状态 |
| paymentNo | string | 支付流水号 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "orderId": "order_001",
    "orderStatus": "paid",
    "payAmount": 5999,
    "payMethod": "mock",
    "payTime": "2024-01-01T00:00:00.000Z",
    "paymentStatus": "success",
    "paymentNo": "PAY202401010001"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3301 | 订单不存在 |

---

## 8. 收藏模块 (/api/favorites)

### 8.1 收藏列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 收藏列表 |
| 功能描述 | 获取当前用户的收藏列表 |
| 请求URL | `/api/favorites` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |

**成功响应**: 分页格式，list 中每项为收藏项（含商品信息）

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 8.2 检查是否收藏

| 项目 | 内容 |
|------|------|
| 接口名称 | 检查是否收藏 |
| 功能描述 | 检查指定商品是否已收藏 |
| 请求URL | `/api/favorites/check/:productId` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| productId | string | 是 | 商品ID |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| isFavorited | boolean | 是否已收藏 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "isFavorited": true
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 8.3 添加收藏

| 项目 | 内容 |
|------|------|
| 接口名称 | 添加收藏 |
| 功能描述 | 添加商品到收藏夹 |
| 请求URL | `/api/favorites` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| productId | string | 是 | - | 商品ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "收藏成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 3201 | 商品不存在 |
| 1005 | 资源冲突（已收藏） |

---

### 8.4 取消收藏

| 项目 | 内容 |
|------|------|
| 接口名称 | 取消收藏 |
| 功能描述 | 取消收藏指定商品 |
| 请求URL | `/api/favorites/:productId` |
| HTTP方法 | DELETE |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| productId | string | 是 | 商品ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "取消收藏成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 1004 | 资源不存在 |

---

### 8.5 批量取消

| 项目 | 内容 |
|------|------|
| 接口名称 | 批量取消收藏 |
| 功能描述 | 批量取消收藏商品 |
| 请求URL | `/api/favorites` |
| HTTP方法 | DELETE |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ids | array | 是 | - | 收藏ID列表 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "批量取消成功",
  "data": {
    "deletedCount": 3
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |

---

## 9. 地址模块 (/api/addresses)

### 9.1 地址列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 地址列表 |
| 功能描述 | 获取当前用户的收货地址列表 |
| 请求URL | `/api/addresses` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**成功响应**: 地址数组

**地址对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 地址ID |
| user_id | string | 用户ID |
| name | string | 收货人姓名 |
| phone | string | 手机号 |
| province | string | 省份 |
| city | string | 城市 |
| district | string | 区县 |
| detail | string | 详细地址 |
| is_default | number | 是否默认（0/1） |
| tag | string | 标签（家/公司等） |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 9.2 默认地址

| 项目 | 内容 |
|------|------|
| 接口名称 | 默认地址 |
| 功能描述 | 获取当前用户的默认收货地址 |
| 请求URL | `/api/addresses/default` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**成功响应**: 地址对象，如无默认地址返回 null

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 9.3 地址详情

| 项目 | 内容 |
|------|------|
| 接口名称 | 地址详情 |
| 功能描述 | 获取指定地址的详细信息 |
| 请求URL | `/api/addresses/:id` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 地址ID |

**成功响应**: 地址对象

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |

---

### 9.4 新增地址

| 项目 | 内容 |
|------|------|
| 接口名称 | 新增地址 |
| 功能描述 | 新增收货地址 |
| 请求URL | `/api/addresses` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| name | string | 是 | - | 收货人姓名 |
| phone | string | 是 | - | 手机号 |
| province | string | 是 | - | 省份 |
| city | string | 是 | - | 城市 |
| district | string | 是 | - | 区县 |
| detail | string | 是 | - | 详细地址 |
| is_default | number | 否 | 0 | 是否默认（0/1） |
| tag | string | 否 | - | 标签（家/公司等） |

**成功响应**: 创建的地址信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |

---

### 9.5 更新地址

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新地址 |
| 功能描述 | 更新收货地址信息 |
| 请求URL | `/api/addresses/:id` |
| HTTP方法 | PUT |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 地址ID |

**请求体参数**: 同新增地址，所有参数可选

**成功响应**: 更新后的地址信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |

---

### 9.6 删除地址

| 项目 | 内容 |
|------|------|
| 接口名称 | 删除地址 |
| 功能描述 | 删除指定收货地址 |
| 请求URL | `/api/addresses/:id` |
| HTTP方法 | DELETE |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 地址ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |

---

### 9.7 设为默认

| 项目 | 内容 |
|------|------|
| 接口名称 | 设为默认地址 |
| 功能描述 | 将指定地址设置为默认地址 |
| 请求URL | `/api/addresses/:id/default` |
| HTTP方法 | PATCH |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 地址ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "设置成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |

---

## 10. 通知模块 (/api/notifications)

### 10.1 通知列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 通知列表 |
| 功能描述 | 获取当前用户的系统通知列表 |
| 请求URL | `/api/notifications` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| unreadOnly | boolean | 否 | false | 仅显示未读 |
| type | string | 否 | - | 通知类型筛选 |

**通知对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 通知ID |
| user_id | string | 用户ID |
| title | string | 通知标题 |
| content | string | 通知内容 |
| type | string | 通知类型（system/order/promotion） |
| read | number | 是否已读（0/1） |
| created_at | string | 创建时间 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": "notif_001",
        "user_id": "user_001",
        "title": "系统通知",
        "content": "您的订单已发货",
        "type": "system",
        "read": 0,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 10.2 未读数量

| 项目 | 内容 |
|------|------|
| 接口名称 | 未读数量 |
| 功能描述 | 获取当前用户未读通知数量 |
| 请求URL | `/api/notifications/unread-count` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| count | number | 未读数量 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "count": 5
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 10.3 标记已读

| 项目 | 内容 |
|------|------|
| 接口名称 | 标记已读 |
| 功能描述 | 将指定通知标记为已读 |
| 请求URL | `/api/notifications/:id/read` |
| HTTP方法 | PUT |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 通知ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "标记成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |

---

### 10.4 全部已读

| 项目 | 内容 |
|------|------|
| 接口名称 | 全部已读 |
| 功能描述 | 将所有通知标记为已读 |
| 请求URL | `/api/notifications/read-all` |
| HTTP方法 | PUT |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "全部标记成功",
  "data": {
    "updatedCount": 5
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

## 11. 聊天模块 (/api/chat)

### 11.1 会话列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 会话列表 |
| 功能描述 | 获取当前用户的会话列表 |
| 请求URL | `/api/chat/conversations` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |

**会话对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 会话ID |
| creator_id | string | 创建者ID |
| participant_id | string | 参与者ID |
| type | string | 会话类型（private/ai） |
| title | string | 会话标题 |
| status | string | 状态 |
| last_message | string | 最后一条消息 |
| last_message_at | string | 最后消息时间 |
| unread_count | number | 未读消息数 |
| created_at | string | 创建时间 |

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 11.2 创建会话

| 项目 | 内容 |
|------|------|
| 接口名称 | 创建会话 |
| 功能描述 | 创建新的会话 |
| 请求URL | `/api/chat/conversations` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| participantId | string | 否 | - | 参与者ID（私聊时） |
| type | string | 否 | private | 类型（private/ai） |
| title | string | 否 | - | 会话标题 |

**成功响应**: 创建的会话信息

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3103 | 不能和自己聊天 |

---

### 11.3 获取AI会话

| 项目 | 内容 |
|------|------|
| 接口名称 | 获取AI会话 |
| 功能描述 | 获取或创建AI助手会话 |
| 请求URL | `/api/chat/conversations/ai` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**成功响应**: AI会话对象

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3104 | AI 服务暂时不可用 |

---

### 11.4 会话详情

| 项目 | 内容 |
|------|------|
| 接口名称 | 会话详情 |
| 功能描述 | 获取会话详情和消息列表 |
| 请求URL | `/api/chat/conversations/:conversationId` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversationId | string | 是 | 会话ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 50 | 每页数量 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| conversation | object | 会话信息 |
| messages | array | 消息列表 |
| page | number | 当前页码 |
| pageSize | number | 每页数量 |
| total | number | 总消息数 |
| totalPages | number | 总页数 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "conversation": {
      "id": "conv_001",
      "creator_id": "user_001",
      "participant_id": "user_002",
      "type": "private",
      "title": "用户A",
      "status": "active",
      "last_message": "你好",
      "last_message_at": "2024-01-01T00:00:00.000Z"
    },
    "messages": [],
    "page": 1,
    "pageSize": 50,
    "total": 10,
    "totalPages": 1
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3101 | 会话不存在 |
| 3102 | 无权限访问该会话 |

---

### 11.5 发送消息

| 项目 | 内容 |
|------|------|
| 接口名称 | 发送消息 |
| 功能描述 | 向指定会话发送消息 |
| 请求URL | `/api/chat/conversations/:conversationId/messages` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 每分钟最多20条 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversationId | string | 是 | 会话ID |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| content | string | 是 | - | 消息内容 |
| type | string | 否 | text | 消息类型（text/image/file） |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 消息ID |
| conversation_id | string | 会话ID |
| sender_id | string | 发送者ID |
| content | string | 消息内容 |
| type | string | 消息类型 |
| status | string | 状态 |
| created_at | string | 发送时间 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "发送成功",
  "data": {
    "id": "msg_001",
    "conversation_id": "conv_001",
    "sender_id": "user_001",
    "content": "你好",
    "type": "text",
    "status": "sent",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 3101 | 会话不存在 |
| 3102 | 无权限访问该会话 |
| 6001 | 请求过于频繁 |

---

### 11.6 消息历史

| 项目 | 内容 |
|------|------|
| 接口名称 | 消息历史 |
| 功能描述 | 获取会话的历史消息 |
| 请求URL | `/api/chat/conversations/:conversationId/messages` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversationId | string | 是 | 会话ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 50 | 每页数量 |
| beforeId | string | 否 | - | 更早的消息ID（分页用） |

**成功响应**: 分页格式，list 中每项为消息对象

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 3101 | 会话不存在 |
| 3102 | 无权限访问该会话 |

---

### 11.7 未读消息数

| 项目 | 内容 |
|------|------|
| 接口名称 | 未读消息数 |
| 功能描述 | 获取当前用户未读消息总数 |
| 请求URL | `/api/chat/unread-count` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| count | number | 未读消息总数 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "count": 5
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 11.8 评论列表（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 评论列表 |
| 功能描述 | 获取评论/留言板列表 |
| 请求URL | `/api/chat/comments` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| targetType | string | 否 | global | 目标类型 |
| targetId | string | 否 | - | 目标ID |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |

**成功响应**: 分页格式，list 中每项为评论对象

**评论对象字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 评论ID |
| user_id | string | 用户ID |
| user | object | 用户信息 |
| content | string | 评论内容 |
| target_type | string | 目标类型 |
| target_id | string | 目标ID |
| parent_id | string | 父评论ID |
| likes | number | 点赞数 |
| reply_count | number | 回复数 |
| created_at | string | 创建时间 |

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |

---

### 11.9 发表评论

| 项目 | 内容 |
|------|------|
| 接口名称 | 发表评论 |
| 功能描述 | 发表评论或回复 |
| 请求URL | `/api/chat/comments` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| content | string | 是 | - | 评论内容 |
| targetType | string | 否 | global | 目标类型 |
| targetId | string | 否 | - | 目标ID |
| parentId | string | 否 | - | 父评论ID（回复时） |

**成功响应**: 创建的评论信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |

---

### 11.10 评论回复（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 评论回复列表 |
| 功能描述 | 获取指定评论的回复列表 |
| 请求URL | `/api/chat/comments/:commentId/replies` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| commentId | string | 是 | 评论ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页数量 |

**成功响应**: 分页格式，list 中每项为回复对象

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |

---

### 11.11 点赞评论（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 点赞评论 |
| 功能描述 | 点赞或取消点赞评论 |
| 请求URL | `/api/chat/comments/:commentId/like` |
| HTTP方法 | POST |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| commentId | string | 是 | 评论ID |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 评论ID |
| likes | number | 点赞数 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "点赞成功",
  "data": {
    "id": "comment_001",
    "likes": 10
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |

---

### 11.12 删除评论

| 项目 | 内容 |
|------|------|
| 接口名称 | 删除评论 |
| 功能描述 | 删除自己发表的评论 |
| 请求URL | `/api/chat/comments/:commentId` |
| HTTP方法 | DELETE |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| X-CSRF-Token | 否 | H5环境必填 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| commentId | string | 是 | 评论ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问（非本人评论） |

---

## 12. 评论模块 (/api/reviews)

### 12.1 发表评论

| 项目 | 内容 |
|------|------|
| 接口名称 | 发表商品评论 |
| 功能描述 | 对已购买的商品发表评价 |
| 请求URL | `/api/reviews` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| orderId | string | 是 | - | 订单ID |
| productId | string | 是 | - | 商品ID |
| skuId | string | 否 | - | SKU ID |
| rating | number | 是 | - | 评分（1-5） |
| content | string | 是 | - | 评价内容 |
| images | array | 否 | - | 图片URL列表 |

**成功响应**: 创建的评论信息

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 3301 | 订单不存在 |

---

### 12.2 我的评论

| 项目 | 内容 |
|------|------|
| 接口名称 | 我的评论 |
| 功能描述 | 获取当前用户发表的商品评论列表 |
| 请求URL | `/api/reviews/mine` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 10 | 每页数量 |

**成功响应**: 分页格式，list 中每项为评论对象

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

## 13. 搜索模块 (/api/search)

### 13.1 搜索商品（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 搜索商品 |
| 功能描述 | 按关键词搜索商品 |
| 请求URL | `/api/search` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| keyword | string | 是 | - | 搜索关键词 |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| categoryId | string | 否 | - | 分类筛选 |
| sort | string | 否 | default | 排序方式 |

**成功响应**: 分页格式，同商品列表

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |

---

### 13.2 热门搜索词（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 热门搜索词 |
| 功能描述 | 获取热门搜索关键词列表 |
| 请求URL | `/api/search/hot` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| keywords | array | 热门关键词列表 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "keywords": ["手机", "电脑", "耳机", "手表", "平板"]
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

---

### 13.3 搜索建议（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 搜索建议 |
| 功能描述 | 根据关键词前缀获取搜索建议 |
| 请求URL | `/api/search/suggest` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| keyword | string | 是 | - | 关键词前缀 |
| limit | number | 否 | 10 | 返回数量限制 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| suggestions | array | 搜索建议列表 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "suggestions": ["手机壳", "手机支架", "手机充电器"]
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1002 | 缺少必需参数 |

---

## 14. 上传模块 (/api/upload)

### 14.1 文件上传

| 项目 | 内容 |
|------|------|
| 接口名称 | 文件上传 |
| 功能描述 | 上传普通文件 |
| 请求URL | `/api/upload/file` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 每分钟最多5次 |
| Content-Type | multipart/form-data |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | multipart/form-data |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 文件 |

**文件限制**:
- 最大文件大小: 10MB
- 支持格式: 常见文档、压缩包等格式

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| url | string | 文件访问URL |
| name | string | 文件原名 |
| size | number | 文件大小（字节） |
| type | string | 文件类型 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "url": "/uploads/2024/01/01/file_abc123.pdf",
    "name": "document.pdf",
    "size": 102400,
    "type": "application/pdf"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 4001 | 文件过大 |
| 4002 | 文件类型不允许 |
| 4003 | 文件上传失败 |
| 6001 | 请求过于频繁 |

---

### 14.2 图片上传

| 项目 | 内容 |
|------|------|
| 接口名称 | 图片上传 |
| 功能描述 | 上传图片文件 |
| 请求URL | `/api/upload/image` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 每分钟最多5次 |
| Content-Type | multipart/form-data |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | multipart/form-data |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 图片文件 |

**图片限制**:
- 最大文件大小: 10MB
- 支持格式: jpg, jpeg, png, gif, webp

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| url | string | 图片访问URL |
| name | string | 图片原名 |
| size | number | 文件大小（字节） |
| width | number | 图片宽度 |
| height | number | 图片高度 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "url": "/uploads/2024/01/01/img_abc123.jpg",
    "name": "photo.jpg",
    "size": 204800,
    "width": 1920,
    "height": 1080
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 4001 | 文件过大 |
| 4002 | 文件类型不允许 |
| 4003 | 文件上传失败 |
| 6001 | 请求过于频繁 |

---

## 15. 同步模块 (/api/sync)

### 15.1 拉取数据

| 项目 | 内容 |
|------|------|
| 接口名称 | 拉取数据 |
| 功能描述 | 从服务器拉取增量同步数据 |
| 请求URL | `/api/sync/pull` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| lastSyncTime | number | 否 | 0 | 最后同步时间戳（毫秒） |
| tables | string | 否 | - | 指定表名，多个用逗号分隔 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| syncTime | number | 同步时间戳 |
| records | array | 同步记录列表 |

**同步记录字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| tableName | string | 表名 |
| recordId | string | 记录ID |
| action | string | 操作类型（create/update/delete） |
| data | object | 数据内容 |
| timestamp | number | 操作时间戳 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "拉取成功",
  "data": {
    "syncTime": 1704067200000,
    "records": [
      {
        "tableName": "carts",
        "recordId": "cart_001",
        "action": "create",
        "data": {},
        "timestamp": 1704067200000
      }
    ]
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 15.2 推送数据

| 项目 | 内容 |
|------|------|
| 接口名称 | 推送数据 |
| 功能描述 | 向服务器推送本地变更数据 |
| 请求URL | `/api/sync/push` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| records | array | 是 | - | 待同步记录列表 |

**同步记录结构**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| tableName | string | 表名 |
| recordId | string | 记录ID |
| action | string | 操作类型（create/update/delete） |
| data | object | 数据内容 |
| timestamp | number | 操作时间戳 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| syncTime | number | 同步时间戳 |
| successCount | number | 成功数量 |
| failedCount | number | 失败数量 |
| failedRecords | array | 失败记录列表 |

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |

---

### 15.3 同步状态

| 项目 | 内容 |
|------|------|
| 接口名称 | 同步状态 |
| 功能描述 | 获取当前用户的同步状态信息 |
| 请求URL | `/api/sync/status` |
| HTTP方法 | GET |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| lastSyncTime | number | 最后同步时间戳 |
| pendingCount | number | 待同步记录数 |
| tables | object | 各表同步状态 |

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

### 15.4 清理旧记录

| 项目 | 内容 |
|------|------|
| 接口名称 | 清理旧记录 |
| 功能描述 | 清理指定时间之前的同步记录 |
| 请求URL | `/api/sync/clear` |
| HTTP方法 | POST |
| 权限要求 | 需登录 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | Bearer {token} |
| Content-Type | 是 | application/json |
| X-CSRF-Token | 否 | H5环境必填 |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| beforeTime | number | 否 | - | 清理此时间之前的记录（毫秒时间戳） |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| clearedCount | number | 清理的记录数 |

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |

---

## 16. 错误日志 (/api/error-logs)

### 16.1 上报错误

| 项目 | 内容 |
|------|------|
| 接口名称 | 上报错误 |
| 功能描述 | 上报客户端错误日志，用于问题排查 |
| 请求URL | `/api/error-logs/report` |
| HTTP方法 | POST |
| 权限要求 | 公开（可选认证） |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求头**:

| 头名称 | 必填 | 说明 |
|--------|------|------|
| Authorization | 否 | Bearer {token}（已登录用户携带） |
| Content-Type | 是 | application/json |

**请求体参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| platform | string | 否 | 平台（h5/mp-weixin/app/desktop） |
| appVersion | string | 否 | 应用版本 |
| errorType | string | 否 | 错误类型（js_error/api_error/render_error/network_error） |
| errorMessage | string | 否 | 错误信息 |
| stackTrace | string | 否 | 堆栈信息 |
| userAgent | string | 否 | 用户代理 |
| url | string | 否 | 发生错误的页面URL |
| extra | object | 否 | 额外信息 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "上报成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |

---

### 16.2 日志列表（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 错误日志列表 |
| 功能描述 | 分页获取错误日志列表（管理员接口） |
| 请求URL | `/api/error-logs` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| errorType | string | 否 | - | 错误类型筛选 |
| platform | string | 否 | - | 平台筛选 |
| startDate | string | 否 | - | 开始日期 |
| endDate | string | 否 | - | 结束日期 |
| keyword | string | 否 | - | 关键词搜索 |

**成功响应**: 分页格式，list 中每项为错误日志对象

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 16.3 统计信息（管理员）

| 项目 | 内容 |
|------|------|
| 接口名称 | 错误统计 |
| 功能描述 | 获取错误日志统计信息（管理员接口） |
| 请求URL | `/api/error-logs/stats` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| startDate | string | 否 | - | 开始日期 |
| endDate | string | 否 | - | 结束日期 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| total | number | 总错误数 |
| todayCount | number | 今日错误数 |
| typeDistribution | object | 按类型分布 |
| platformDistribution | object | 按平台分布 |
| dailyTrend | array | 每日趋势 |

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

## 17. 管理后台 (/api/admin)

### 17.1 商品列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台商品列表 |
| 功能描述 | 管理后台获取商品列表，支持高级筛选 |
| 请求URL | `/api/admin/products` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| keyword | string | 否 | - | 搜索关键词 |
| categoryId | string | 否 | - | 分类ID |
| status | string | 否 | - | 状态筛选（on_sale/off_sale） |
| sort | string | 否 | - | 排序方式 |

**成功响应**: 分页格式，list 中每项为商品对象

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 17.2 商品详情

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台商品详情 |
| 功能描述 | 管理后台获取商品详细信息 |
| 请求URL | `/api/admin/products/:id` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**成功响应**: 商品详情对象

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 3201 | 商品不存在 |

---

### 17.3 创建商品

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台创建商品 |
| 功能描述 | 管理后台创建新商品 |
| 请求URL | `/api/admin/products` |
| HTTP方法 | POST |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求体参数**: 同 `/api/products` 创建商品

**成功响应**: 创建的商品详情

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 6003 | CSRF 令牌无效 |

---

### 17.4 更新商品

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台更新商品 |
| 功能描述 | 管理后台更新商品信息 |
| 请求URL | `/api/admin/products/:id` |
| HTTP方法 | PUT |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**请求体参数**: 同创建商品，所有参数可选

**成功响应**: 更新后的商品详情

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 3201 | 商品不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 6003 | CSRF 令牌无效 |

---

### 17.5 删除商品

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台删除商品 |
| 功能描述 | 管理后台删除指定商品 |
| 请求URL | `/api/admin/products/:id` |
| HTTP方法 | DELETE |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 3201 | 商品不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 6003 | CSRF 令牌无效 |

---

### 17.6 更新商品状态

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台更新商品状态 |
| 功能描述 | 管理后台更新商品上架/下架状态 |
| 请求URL | `/api/admin/products/:id/status` |
| HTTP方法 | PATCH |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 商品ID |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| status | string | 是 | - | 状态（on_sale/off_sale） |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "状态更新成功",
  "data": {
    "id": "product_001",
    "status": "off_sale"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 3201 | 商品不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 6003 | CSRF 令牌无效 |

---

### 17.7 批量更新商品状态

| 项目 | 内容 |
|------|------|
| 接口名称 | 批量更新商品状态 |
| 功能描述 | 批量更新商品上架/下架状态 |
| 请求URL | `/api/admin/products/batch/status` |
| HTTP方法 | POST |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ids | array | 是 | - | 商品ID列表 |
| status | string | 是 | - | 状态（on_sale/off_sale） |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| successCount | number | 成功数量 |
| failedCount | number | 失败数量 |

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 6003 | CSRF 令牌无效 |

---

### 17.8 批量删除商品

| 项目 | 内容 |
|------|------|
| 接口名称 | 批量删除商品 |
| 功能描述 | 批量删除商品 |
| 请求URL | `/api/admin/products/batch/delete` |
| HTTP方法 | POST |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ids | array | 是 | - | 商品ID列表 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| successCount | number | 成功数量 |
| failedCount | number | 失败数量 |

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 6003 | CSRF 令牌无效 |

---

### 17.9 订单列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台订单列表 |
| 功能描述 | 管理后台获取订单列表，支持高级筛选 |
| 请求URL | `/api/admin/orders` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页数量 |
| orderNo | string | 否 | - | 订单号搜索 |
| status | string | 否 | - | 订单状态 |
| startDate | string | 否 | - | 开始日期 |
| endDate | string | 否 | - | 结束日期 |
| keyword | string | 否 | - | 关键词搜索 |

**成功响应**: 分页格式，list 中每项为订单对象

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 17.10 订单详情

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台订单详情 |
| 功能描述 | 管理后台获取订单详细信息 |
| 请求URL | `/api/admin/orders/:id` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 订单ID |

**成功响应**: 订单详情对象

**常见错误码**:

| code | 说明 |
|------|------|
| 1004 | 资源不存在 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 3301 | 订单不存在 |

---

### 17.11 更新订单状态

| 项目 | 内容 |
|------|------|
| 接口名称 | 更新订单状态 |
| 功能描述 | 管理后台更新订单状态（发货等） |
| 请求URL | `/api/admin/orders/:id/status` |
| HTTP方法 | PATCH |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 订单ID |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| status | string | 是 | - | 订单状态 |
| remark | string | 否 | - | 备注 |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "状态更新成功",
  "data": {
    "id": "order_001",
    "status": "shipped"
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 3301 | 订单不存在 |
| 6003 | CSRF 令牌无效 |

---

### 17.12 批量更新订单状态

| 项目 | 内容 |
|------|------|
| 接口名称 | 批量更新订单状态 |
| 功能描述 | 批量更新订单状态 |
| 请求URL | `/api/admin/orders/batch/status` |
| HTTP方法 | POST |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |
| Content-Type | application/json |

**请求体参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ids | array | 是 | - | 订单ID列表 |
| status | string | 是 | - | 订单状态 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| successCount | number | 成功数量 |
| failedCount | number | 失败数量 |

**常见错误码**:

| code | 说明 |
|------|------|
| 1001 | 参数错误 |
| 1002 | 缺少必需参数 |
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |
| 6003 | CSRF 令牌无效 |

---

### 17.13 订单统计

| 项目 | 内容 |
|------|------|
| 接口名称 | 订单统计 |
| 功能描述 | 获取订单统计数据 |
| 请求URL | `/api/admin/orders/statistics` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| startDate | string | 否 | - | 开始日期 |
| endDate | string | 否 | - | 结束日期 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| totalOrders | number | 总订单数 |
| totalAmount | number | 总销售额 |
| pendingCount | number | 待付款数量 |
| paidCount | number | 待发货数量 |
| shippedCount | number | 待收货数量 |
| completedCount | number | 已完成数量 |
| cancelledCount | number | 已取消数量 |
| dailyTrend | array | 每日趋势 |
| statusDistribution | object | 状态分布 |

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

### 17.14 分类列表

| 项目 | 内容 |
|------|------|
| 接口名称 | 管理后台分类列表 |
| 功能描述 | 管理后台获取分类列表（平铺结构） |
| 请求URL | `/api/admin/categories` |
| HTTP方法 | GET |
| 权限要求 | 管理员 |
| 调用频率 | 无特殊限制 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| parentId | string | 否 | - | 父分类ID |
| status | string | 否 | - | 状态筛选 |

**成功响应**: 分类数组（平铺结构）

**常见错误码**:

| code | 说明 |
|------|------|
| 2001 | 未登录或登录已过期 |
| 2005 | 无权限访问 |

---

## 18. 系统接口

### 18.1 健康检查（公开）

| 项目 | 内容 |
|------|------|
| 接口名称 | 健康检查 |
| 功能描述 | 检查服务运行状态 |
| 请求URL | `/api/health` |
| HTTP方法 | GET |
| 权限要求 | 公开 |
| 调用频率 | 无特殊限制 |

**成功响应**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| status | string | 服务状态（running） |
| timestamp | number | 服务器时间戳 |
| version | string | 服务版本号 |
| uptime | number | 运行时长（秒） |

**成功响应示例**:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "running",
    "timestamp": 1704067200000,
    "version": "1.0.0",
    "uptime": 86400
  },
  "timestamp": 1704067200000,
  "requestId": "req_abc123"
}
```

---

## 附录：WebSocket 实时消息

### 连接方式

```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('WebSocket connected');
});

socket.emit('auth', { token: 'Bearer <access_token>' });
```

### 消息事件

| 事件 | 说明 | 数据格式 |
|------|------|----------|
| message | 收到新消息 | `{ conversationId, message }` |
| conversation_update | 会话更新 | `{ conversation }` |
| typing | 对方正在输入 | `{ conversationId, userId }` |
| notification | 系统通知 | `{ notification }` |
| order_status_change | 订单状态变更 | `{ orderId, status }` |

---

**文档版本**: v1.0.0
**最后更新**: 2024-01-01