# 插件协调规则 —— B Admin 全栈项目 Agent 统一接入规范

> **定位**：任何 Agent 接入本项目的唯一参考入口。本文档定义了代码生成、数据操作、状态同步、错误恢复的全部强制性规范。
>
> **姊妹文档**：[project-context.md](./project-context.md)（项目概览与架构图）、[dev-status.json](./dev-status.json)（阶段追踪状态）

---

## 一、项目强制约定

以下规则适用于 **所有 Agent（无论角色/插件）** 生成或修改本项目代码时。

### 1.1 代码风格 [必须遵守]

| 规则 | 细节 | 违反后果 |
|------|------|---------|
| 模块系统 | ESM (`import/export`)，根 `package.json` 含 `"type": "module"` | `require()` 直接报错 |
| 分号/引号 | **无分号**、**单引号**、**2 空格缩进** | 与现有代码风格不一致 |
| 前端模块 | IIFE 模式，挂载到 `window.BA.*` 全局命名空间 | 变量泄漏到全局，污染作用域 |
| 后端分层 | `routes → controllers → services → db`，禁止跨层调用 | 破坏依赖倒置，测试困难 |
| 文件命名 | kebab-case：`auth.routes.js`、`user.service.js` | 与项目约定不一致 |

**正确示例 vs 错误示例：**

```javascript
// ✅ 正确：ESM + 无分号 + 单引号 + 2 空格
import { getDb } from '../db/index.js'
const users = await getDb().prepare('SELECT * FROM users WHERE status = ?').all('active')

// ❌ 错误：CommonJS + 分号 + 双引号 + 4 空格
const { getDb } = require("../db/index.js");
const users = await getDb().prepare("SELECT * FROM users WHERE status = ?").all("active");
```

```javascript
// ✅ 正确：IIFE + BA.* 命名空间
;(function (BA) {
  BA.pages = BA.pages || {}
  BA.pages.myPage = function () { /* ... */ }
})((window.BA = window.BA || {}))

// ❌ 错误：ES Module 前端（浏览器不直接支持裸导入，无打包工具）
export function myPage() { /* ... */ }
```

### 1.2 数据库操作 [必须遵守]

| 规则 | 细节 |
|------|------|
| 初始化 | 必须先 `await initDatabase()` 再 `getDb()` 同步获取实例 |
| SQL 参数 | 用 `?` 占位符，**禁止字符串拼接**（防 SQL 注入） |
| 写操作 | 调用 Statement 的 `run()` 方法，内部自动触发 200ms 防抖持久化 |
| 软删除 | `status = 'disabled'`（不物理删除记录） |
| 事务 | 用 `transaction(fn)` 工具函数或 db 代理的 `.transaction()` 方法 |
| 隔离 | 测试用 `:memory:` 数据库，通过 `initDatabase(':memory:')` 创建 |

```javascript
// ✅ 正确：参数化查询
const user = getDb().prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active')

// ❌ 错误：字符串拼接
const user = getDb().prepare(`SELECT * FROM users WHERE username = '${username}'`).get()
```

### 1.3 API 规范 [必须遵守]

| 规则 | 细节 |
|------|------|
| 前缀 | `/api/v1/` |
| 成功响应 | `{ code: 0, message: 'ok', data: ... }` |
| 分页响应 | `{ code: 0, message: 'ok', data: { list: [...], total: N, page: N, pageSize: N } }` |
| 错误响应 | `next(fail(message, code, httpStatus))` 由 errorHandler 统一捕获 |
| 请求头 | `Authorization: Bearer <accessToken>` |
| 错误码 | 40101(未登录)、40102(token过期)、40301(无权限)、40001(参数错误)、40401(资源不存在)、50001(服务端) |

### 1.4 前端约定 [必须遵守]

| 规则 | 细节 |
|------|------|
| 路由 | hash-based：`#workbench`、`#list`、`#card`、`#form`、`#login` |
| 事件 | `data-action` 属性 + 委托派发，**禁用内联 `onclick`** |
| 鉴权 | sessionStorage 存 `access_token` + `refresh_token` + `current_user` JSON |
| Token 刷新 | 401 时自动用 refresh token 换取新 access token，失败则跳 `#login` |
| 全局组件 | `Components.*`、`Icon()`、`Charts.*`、`escapeHtml()`、`BA.utils.*` |
| API 请求 | 统一使用 `BA.api` 命名空间下的函数，不直接调 `fetch` |

### 1.5 测试规则 [必须遵守]

| 规则 | 细节 |
|------|------|
| 框架 | Jest + Supertest |
| 数据库 | `:memory:` 隔离（每个测试独立数据库） |
| 初始化链 | `initDatabase(':memory:')` → `migrate()` → `seed()` → `createApp()` |
| Token 获取 | `loginAs(request, username, password)` 辅助函数返回 `{ accessToken, refreshToken }` |
| 文件位置 | `server/__tests__/` 下，按模块分组 |
| 命名 | `*.test.js`，单 `it()` 一个断言 |

---

## 二、技术决策记录 (ADR)

本节记录项目中每个关键架构决策的理由，帮助 Agent 理解"为什么这么做"而非仅仅"怎么做"。

### ADR-001: 数据库引擎选择 sql.js 而非 better-sqlite3

**背景**：项目初期计划使用 better-sqlite3（同步 API，生态成熟），但 Windows 开发环境缺少 Python 无法编译 native addon。

**决策**：采用 sql.js（SQLite 编译为 WASM，纯 JS 运行，零编译依赖）。

**影响**：
- sql.js 原生 API 是异步的（`db.prepare()` 返回 Statement 对象，需 `stmt.step()` + `stmt.getAsObject()` 手动遍历）
- 为此封装了 Statement 包装类，模拟 better-sqlite3 的同步 `get()`/`all()`/`run()` API
- 数据库初始化变为异步：`await initDatabase()` → 之后 `getDb()` 同步返回

**禁止**：不要直接使用 `db.prepare(sql).step()` 等 sql.js 原生 API，必须通过 Statement 包装类或 `getOne()`/`getAll()`/`run()` 工具函数。

```javascript
// ✅ 正确：通过工具函数
import { getOne, getAll, run } from '../db/index.js'
const user = getOne('SELECT * FROM users WHERE id = ?', userId)

// ❌ 错误：直接使用 sql.js 原生 API
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
stmt.bind([userId])
stmt.step()
const user = stmt.getAsObject()
```

### ADR-002: 前端使用 IIFE + BA.* 全局命名空间 而非 ES Module

**背景**：前端是 Vanilla JS 无构建工具的原生开发（通过 Vite 的 `server.proxy` 代理到后端），浏览器不直接支持裸 specifier 的 `import`。

**决策**：使用 IIFE 模式，所有模块挂载到 `window.BA` 全局对象，通过 `<script>` 标签顺序加载。

**模块加载顺序**（由 `scripts/dev.js` 控制 HTML 注入）：
```
BA.config → BA.utils → BA.store → BA.i18n → BA.monitor → BA.errorBoundary
                                                              ↓
BA.request → BA.api → BA.api.auth/users/... ← BA.auth
                                                              ↓
BA.form → BA.validate → Components → Icon → Charts → BA.pages.*
```

**禁止**：不要在前端文件中使用 `export`/`import` 关键字。

### ADR-003: sessionStorage 而非 localStorage 存储 Token

**背景**：需要存储 JWT access token 和 refresh token 以维持登录状态。

**决策**：使用 `sessionStorage`。

**理由**：
- sessionStorage 在标签页关闭时自动清除，避免 token 长期残留
- 每个标签页独立的 JWT 会话（刷新不影响其他标签）
- localStorage 在 XSS 攻击下风险更高（持久化存储）

**影响**：用户关闭标签页后需重新登录；刷新页面不影响（sessionStorage 对同源页面保持）。

### ADR-004: 200ms 防抖持久化写入间隔

**背景**：sql.js 运行在内存中，每次写操作后需序列化整个数据库为 `Uint8Array` 并写入磁盘。

**决策**：采用 200ms 防抖（`scheduleSave()`），而非每次写操作后立即保存。

**理由**：
- 频繁写入场景（如批量创建用户），减少磁盘 I/O
- 200ms 是用户体验与数据安全的平衡点（最坏情况丢失 200ms 内的写入）
- 手动 `saveNow()` 可强制即时保存（数据库关闭时自动调用）

### ADR-005: JWT 双 Token 机制 (access 2h + refresh 7d)

**背景**：需要在安全性（短有效期）和用户体验（免频繁登录）间取得平衡。

**决策**：
- Access Token：2 小时有效期，携带 `type: 'access'`
- Refresh Token：7 天有效期，携带 `type: 'refresh'` + `jti`（唯一标识）
- Refresh Token 存储在 `refresh_tokens` 表中，可主动撤销

**影响的实现**：
- 前端 `BA.request` 拦截 401 → 自动无感刷新 → 刷新失败跳登录
- 后端 auth 中间件只接受 `type === 'access'` 的 token

---

## 三、核心实现规范

### 3.1 sql.js Statement 包装类 API

位于 `server/src/db/index.js`，提供与 better-sqlite3 兼容的同步 API。

**Statement 类：**

```
new Statement(sqlDb, sql)   → 创建预编译语句
  .get(params)               → 返回单行对象 或 undefined
  .all(params)               → 返回行对象数组（空数组 [] 无结果）
  .run(params)               → 返回 { changes: number, lastInsertRowid: number }
                              内部自动调用 scheduleSave() 触发持久化
```

**参数规范 (normalizeParams)：**
- `null` / `undefined` → `[]`（空数组）
- `Array` → 原样传递（`[val1, val2]`）
- `Object`（命名参数）→ 原样传递（如 `{ $name: 'foo' }`）
- 其他 → 包装为单元素数组 `[val]`

**错误处理：** 所有方法在 catch 中抛出增强错误，附带 SQL 原文：`${e.message}\n  SQL: ${this._sql}`

### 3.2 数据库代理对象 API

`createDbProxy(sqlDb)` 返回完整的数据库操作对象：

| 方法 | 签名 | 说明 |
|------|------|------|
| `exec(sql)` | `(sql: string) => void` | 执行 DDL/DML，自动触发 scheduleSave() |
| `prepare(sql)` | `(sql: string) => Statement` | 创建预编译语句 |
| `pragma(str)` | `(str: string) => { value: any } \| void` | SET 返回 void，GET 返回 `{ value }` |
| `transaction(fn)` | `(fn: (db, ...args) => any) => (...args) => any` | 返回事务包装函数 |
| `run(sql, params)` | `(sql: string, params?: any[]) => { changes, lastInsertRowid }` | 快捷执行，自动 scheduleSave() |
| `close()` | `() => void` | 先 saveNow() 再关闭 |
| `exportDatabase()` | `() => Uint8Array` | 导出完整数据库二进制 |

**Pragma 配置（initDatabase 自动执行）：**

```sql
PRAGMA journal_mode = WAL        -- 写前日志，允许并发读写
PRAGMA foreign_keys = ON         -- 启用外键约束
PRAGMA synchronous = NORMAL     -- 平衡性能与数据安全（非 FULL）
PRAGMA busy_timeout = 5000      -- 锁等待超时 5 秒
```

### 3.3 防抖持久化协议

```
写操作发生 → Statement.run() → scheduleSave() → clearTimeout(saveTimer)
                ↓
           saveTimer = setTimeout(saveNow, 200)
                ↓
            200ms 内无新写入 → saveNow() → exportDatabase() → writeFileSync()
```

**关键函数：**

```javascript
saveNow()         // 立即持久化到磁盘（closeDb 时调用）
scheduleSave()    // 防抖触发（每次写操作调用）
isMemory          // :memory: 模式下跳过所有持久化
```

**测试环境：** `:memory:` 模式下 `isMemory = true`，`scheduleSave()` 和 `saveNow()` 直接 return，不做磁盘 I/O。

### 3.4 工具函数（便捷操作）

位于 `server/src/db/index.js`：

```javascript
import { getOne, getAll, run, transaction } from '../db/index.js'

getOne(sql, params)     // 等价于 getDb().prepare(sql).get(params)
getAll(sql, params)     // 等价于 getDb().prepare(sql).all(params)
run(sql, params)        // 等价于 getDb().prepare(sql).run(params)
transaction(fn)         // 等价于 getDb().transaction(fn)(getDb())
```

### 3.5 事务使用模式

**模式 1：使用 transaction() 工具函数**
```javascript
import { transaction } from '../db/index.js'

transaction((db) => {
  db.prepare('INSERT INTO users (...) VALUES (...)').run([...])
  db.prepare('INSERT INTO user_roles (...) VALUES (...)').run([...])
  // 任意一步失败，全部回滚
})
```

**模式 2：使用 db 代理的 .transaction() 方法**
```javascript
const db = getDb()
const transferFunds = db.transaction((db, fromId, toId, amount) => {
  db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, fromId)
  db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, toId)
})
transferFunds(fromId, toId, amount) // 自动 BEGIN/COMMIT/ROLLBACK
```

### 3.6 鉴权 JWT 工具 API

位于 `server/src/utils/jwt.js`：

```javascript
signAccessToken({ sub, username, roles })  // → JWT string (expires: 2h, type: 'access')
signRefreshToken({ sub, username, jti })   // → JWT string (expires: 7d, type: 'refresh')
verifyToken(token)                          // → payload object | null
decodeToken(token)                          // → payload object | null (不验证过期)
```

**Token Payload 结构：**

| 字段 | access token | refresh token |
|------|-------------|---------------|
| `sub` | userId | userId |
| `username` | username | username |
| `roles` | [roleCodes] | - |
| `type` | `'access'` | `'refresh'` |
| `jti` | - | UUID (用于撤销) |
| `exp` | 2h | 7d |

### 3.7 响应格式工具

位于 `server/src/utils/response.js`：

```javascript
// 成功
res.json(success(data, message?, code?))
// 等价于: res.json({ code: 0, message: 'ok', data: ... })

// 失败（通过 next() 传递给 errorHandler）
next(fail(message, code?, httpStatus?, data?))
// 创建一个 Error 实例，携带 .code、.status、.data 属性

// 分页参数标准化
pagination(req.query)  // → { page: number, pageSize: number, offset: number }
                       // page 最小 1, pageSize 1~100
```

### 3.8 Zod 校验中间件

位于 `server/src/middleware/validate.js`：

```javascript
validateRequest(schema, source = 'body')
// source: 'body' | 'query' | 'params'
// 成功：req[source] 被替换为经过 Zod 转换的数据
// 失败：next(fail('field: message', 40001, 400, issues))
```

---

## 四、模块接口契约

### 4.1 模块总览

| 模块 | 路由文件 | Controller | Service(s) | Validator | 权限码前缀 |
|------|---------|------------|------------|-----------|-----------|
| auth | auth.routes.js | auth.controller.js | auth.service.js | auth.validator.js | -（开放） |
| users | user.routes.js | user.controller.js | user.service.js, rbac.service.js | user.validator.js | user |
| roles | role.routes.js | role.controller.js | role.service.js, rbac.service.js | role.validator.js | role |
| permissions | permission.routes.js | role.controller.js | rbac.service.js | - | permission |
| menus | menu.routes.js | menu.controller.js | menu.service.js | - | menu |
| projects | project.routes.js | project.controller.js | project.service.js | project.validator.js | project |
| services | service.routes.js | service.controller.js | service.service.js | service.validator.js | service |
| workbench | workbench.routes.js | workbench.controller.js | workbench.service.js | - | -（登录即可） |
| dictionaries | dictionary.routes.js | dictionary.controller.js | dictionary.service.js | - | dict |
| logs | log.routes.js | log.controller.js | log.service.js | - | log |

### 4.2 auth 模块 — 认证与鉴权

| 方法 | 路径 | 鉴权 | 校验 | 说明 |
|------|------|------|------|------|
| POST | `/api/v1/auth/login` | 无（loginLimiter 限流 10/分） | loginSchema | 登录，返回 tokens + user |
| POST | `/api/v1/auth/refresh` | 无 | refreshSchema | 刷新 access token |
| POST | `/api/v1/auth/logout` | authMiddleware | - | 登出，撤销 refresh token |
| GET | `/api/v1/auth/profile` | authMiddleware | - | 当前用户信息 |
| PUT | `/api/v1/auth/password` | authMiddleware | changePasswordSchema | 修改密码 |

**loginSchema：**
```
username: string(1-50, required)
password: string(1-100, required)
remember: boolean (optional, default: false)
```

**changePasswordSchema：**
```
oldPassword: string(1+, required)
newPassword: string(6-100, required)
```

### 4.3 users 模块 — 用户管理

| 方法 | 路径 | 权限 | 校验 | 说明 |
|------|------|------|------|------|
| GET | `/api/v1/users` | user:read | - | 分页用户列表（支持 keyword/status 筛选） |
| GET | `/api/v1/users/:id` | user:read | - | 用户详情（含角色） |
| POST | `/api/v1/users` | user:create | createUserSchema | 创建用户 |
| PUT | `/api/v1/users/:id` | user:update | updateUserSchema | 更新用户信息 |
| DELETE | `/api/v1/users/:id` | user:delete | - | 软删除用户 |
| PUT | `/api/v1/users/:id/roles` | user:assign | updateUserRolesSchema | 更新用户角色分配 |

**createUserSchema：**
```
username: string(2-50, required)
password: string(6-100, required)
display_name: string(0-100, optional, default: '')
email: string(email format, optional, or '')
phone: string(regex /^1[3-9]\d{9}$/, optional, or '')
avatar: string(optional, default: '')
status: enum('active', 'disabled', 'locked', default: 'active')
role_ids: string[] (optional, default: [])
```

**updateUserSchema（所有字段可选）：** display_name, email, phone, avatar, status, role_ids

**updateUserRolesSchema：**
```
role_ids: string[].min(1).min(1)  （非空数组，每个元素非空字符串）
```

### 4.4 roles 模块 — 角色管理

| 方法 | 路径 | 权限 | 校验 | 说明 |
|------|------|------|------|------|
| GET | `/api/v1/roles` | role:read | - | 角色列表（含权限信息） |
| GET | `/api/v1/roles/:id` | role:read | - | 角色详情（含权限） |
| POST | `/api/v1/roles` | role:create | createRoleSchema | 创建角色 |
| PUT | `/api/v1/roles/:id` | role:update | updateRoleSchema | 更新角色 |
| DELETE | `/api/v1/roles/:id` | role:delete | - | 删除角色（软删除） |

**createRoleSchema：**
```
code: string(1-50, required)
name: string(1-50, required)
description: string(0-200, optional, default: '')
permission_ids: string[] (optional, default: [])
```

**updateRoleSchema：** name, description, status('active'|'disabled'), permission_ids（全部可选）

**边界条件：** 内置角色（admin）不可删除/不可修改 code

### 4.5 permissions 模块 — 权限管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/permissions` | permission:read | 权限列表（分组：用户/角色/权限/菜单/项目/服务/字典/日志） |
| GET | `/api/v1/permissions/tree` | permission:read | 权限树形结构 |

**注意：** permissions 模块共用 role.controller.js（`getPermissions`、`getPermissionTree` 控制器方法）

### 4.6 menus 模块 — 菜单管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/menus/tree` | 无额外权限（登录即可） | 当前用户可见的菜单树 |
| GET | `/api/v1/menus` | menu:read | 全部菜单列表 |
| GET | `/api/v1/menus/:id` | menu:read | 菜单详情 |
| POST | `/api/v1/menus` | menu:create | 创建菜单 |
| PUT | `/api/v1/menus/:id` | menu:update | 更新菜单 |
| DELETE | `/api/v1/menus/:id` | menu:delete | 删除菜单 |

**关键差异：** `/tree` 不需要 `menu:read` 权限，所有登录用户可访问（生成导航菜单用）。

### 4.7 projects 模块 — 项目管理

| 方法 | 路径 | 权限 | 校验 | 说明 |
|------|------|------|------|------|
| GET | `/api/v1/projects` | project:read | - | 分页项目列表 |
| GET | `/api/v1/projects/:id` | project:read | - | 项目详情 |
| POST | `/api/v1/projects` | project:create | createProjectSchema | 创建项目 |
| PUT | `/api/v1/projects/:id` | project:update | updateProjectSchema | 更新项目 |
| DELETE | `/api/v1/projects/:id` | project:delete | - | 软删除项目 |
| POST | `/api/v1/projects/batch-delete` | project:delete | - | 批量软删除 |

**createProjectSchema：**
```
project_name: string(1-100, required)
project_code: string(0-50, optional, default: '')
category: string(0-50, optional, default: '')
status: enum('active', 'archived', 'pending', default: 'active')
owner: string(0-50, optional, default: '')
description: string(0-500, optional, default: '')
priority: enum('low', 'medium', 'high', 'urgent', default: 'medium')
start_date: string(optional, default: '')
end_date: string(optional, default: '')
```

**排序支持：** `sortField` ∈ `{project_name, project_code, created_at, status, priority}`；`sortDir` ∈ `{asc, desc}`

### 4.8 services 模块 — 服务管理

| 方法 | 路径 | 权限 | 校验 | 说明 |
|------|------|------|------|------|
| GET | `/api/v1/services` | service:read | - | 服务列表 |
| GET | `/api/v1/services/:id` | service:read | - | 服务详情 |
| POST | `/api/v1/services` | service:create | createServiceSchema | 创建服务 |
| PUT | `/api/v1/services/:id` | service:update | updateServiceSchema | 更新服务 |
| DELETE | `/api/v1/services/:id` | service:delete | - | 软删除服务 |

**createServiceSchema：**
```
title: string(1-100, required)
description: string(0-500, optional, default: '')
category: string(0-50, optional, default: '')
icon: string(0-50, optional, default: '')
sort_order: int (optional, default: 0)
```

### 4.9 workbench 模块 — 工作台数据

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/workbench/overview` | 登录即可 | 概览卡片数据（项目总数、服务数、用户数、待办数） |
| GET | `/api/v1/workbench/sales-trend` | 登录即可 | 近 12 个月/周趋势数据 |
| GET | `/api/v1/workbench/channel-distribution` | 登录即可 | 渠道分布数据（饼图） |
| GET | `/api/v1/workbench/todos` | 登录即可 | 待办事项列表 |
| GET | `/api/v1/workbench/activities` | 登录即可 | 最近活动日志 |

**注意：** workbench 模块不需要额外权限码，仅 `authMiddleware` 鉴权。

### 4.10 dictionaries 模块 — 数据字典

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/dictionaries/:type` | 登录即可 | 按类型获取字典项（如 `project_status`、`service_category`） |
| GET | `/api/v1/dictionaries` | dict:read | 字典列表 |
| POST | `/api/v1/dictionaries` | dict:create | 创建字典 |
| PUT | `/api/v1/dictionaries/:id` | dict:update | 更新字典 |
| DELETE | `/api/v1/dictionaries/:id` | dict:delete | 删除字典 |

### 4.11 logs 模块 — 操作日志

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/logs` | log:read | 分页操作日志列表 |

---

## 五、数据流全路径

### 5.1 请求完整生命周期

```
┌──────────┐   fetch()    ┌──────────────────────────────────────────────────────┐
│ 浏览器    │ ──────────→  │  Express 应用 (端口 3000)                             │
│ (端口8080) │              │                                                     │
│ Vite 代理  │              │  ① helmet()      → 安全头（CSP 关闭）               │
│ /api/v1/* │              │  ② corsConfig    → CORS 白名单 (localhost:8080)     │
│ → localhost│              │  ③ requestLogger → morgan 日志输出                  │
│   :3000   │              │  ④ express.json() → body 解析 (limit 10mb)           │
└──────────┘              │  ⑤ rateLimiter   → 全局限流 (600/分)                 │
                           │  ⑥ loginLimiter  → 登录限流 (10/分, 仅 /auth)       │
                           │  ⑦ 路由匹配      → /api/v1/:module                   │
                           │       ↓                                              │
                           │  ⑧ authMiddleware → JWT 验证(req.user 注入)          │
                           │  ⑨ requirePermission → RBAC 权限检查                 │
                           │  ⑩ validateRequest → Zod schema 校验                 │
                           │       ↓                                              │
                           │  ⑪ Controller → 参数提取 + 调用 Service              │
                           │  ⑫ Service    → 业务逻辑 + DB 操作                   │
                           │  ⑬ DB (sql.js)→ Statement.get/all/run               │
                           │       ↓                                              │
                           │  ⑭ Controller → res.json(success(data))              │
                           │      或                                              │
                           │  ⑭ errorHandler → 统一错误 JSON 响应                 │
                           └──────────────────────────────────────────────────────┘
```

### 5.2 错误传播路径

```
Controller 层:
  → 参数校验失败: next(fail('field: message', 40001, 400))
  → 资源不存在:   next(fail('资源不存在', 40401, 404))
  → 服务层异常:   try/catch → next(fail(e.message, 50001, 500))

Service 层:
  → getOne() 返回 undefined → 抛出 Error 或返回 null
  → run() 抛出 Error（含 SQL 原文）
  → 业务规则不满足 → throw new Error('描述信息')

errorHandler (server/src/middleware/index.js → errorHandler):
  → 统一捕获 next(err) 传递的错误
  → 返回 { code: err.code || 50001, message: err.message, data: err.data || null }
  → HTTP 状态码: err.status || 500

errorLogger (server/src/middleware/index.js → errorLogger):
  → 服务端 console.error 记录完整错误堆栈
```

### 5.3 前端请求链路

```
用户操作 → data-action 委托 → BA.pages.* 函数
  → BA.api.module.method(params)
    → BA.request(method, url, data)
      → fetch(url, { headers: { Authorization: 'Bearer ' + token } })
        ├─ 200 → 解析 JSON → 返回 data
        ├─ 401 → BA.auth.refreshToken()
        │         ├─ 成功 → 重试原请求
        │         └─ 失败 → 清空 sessionStorage → 跳 #login
        └─ other → 显示错误提示
```

### 5.4 Token 刷新时序

```
1. BA.request 发送 API 请求
2. 后端返回 401（access token 过期）
3. BA.request 拦截器捕获 401
4. BA.auth.refreshToken() 用 refresh_token 调 POST /api/v1/auth/refresh
5. 成功 → 更新 sessionStorage 中的 access_token → 重试原请求
6. 失败 → 清空 sessionStorage → window.location.hash = '#login'
7. 并发保护：isRefreshing 标志防止多个 401 同时触发刷新
```

---

## 六、错误恢复手册

### 6.1 场景：数据库文件损坏

**症状**：启动报错 `file is not a database` 或 SQLite 相关错误。

**诊断命令：**
```bash
# 检查数据库文件大小（异常偏小或 0 字节即损坏）
ls -la data/app.db

# 尝试用 sql.js 读取（在项目内运行 Node.js REPL）
node -e "import('sql.js').then(S => S.default().then(s => { const db = new s.Database(require('fs').readFileSync('data/app.db')); console.log('OK') })).catch(e => console.error('CORRUPT:', e.message))"
```

**恢复步骤：**
```bash
# Step 1: 备份损坏文件（用于事后排查）
cp data/app.db data/app.db.corrupted.$(date +%Y%m%d%H%M%S)

# Step 2: 删除数据库文件
rm data/app.db

# Step 3: 重启服务器（自动重建数据库 + 迁移 + 种子数据）
npm run dev
```

**验证方法：** 用 admin/admin123 登录，确认工作台数据正常显示。

### 6.2 场景：Token 过期导致前端 401 循环

**症状**：刷新页面后所有 API 调用返回 401，页面无限跳转到登录页。

**诊断命令（浏览器控制台）：**
```javascript
// 检查 sessionStorage 中是否存在 token
console.log(sessionStorage.getItem('access_token'))
console.log(sessionStorage.getItem('refresh_token'))

// 手动测试 refresh 接口
fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: sessionStorage.getItem('refresh_token') })
}).then(r => r.json()).then(console.log)
```

**恢复步骤：**
1. 打开浏览器开发者工具 → Application → Storage → Session Storage
2. 手动清除 `access_token`、`refresh_token`、`current_user`
3. 刷新页面，重新登录
4. 如果后端 refresh_tokens 表异常，通过 API 或数据库直接清理：`后端清空 refresh_tokens 表 -- npm run db:reset 可选`

### 6.3 场景：API 不可用（端口 3000 无响应）

**症状**：前端所有请求返回 `ERR_CONNECTION_REFUSED` 或 502。

**诊断命令：**
```bash
# 检查端口 3000 是否有进程监听
netstat -ano | findstr :3000    # Windows
lsof -i :3000                    # macOS/Linux

# 检查 Express 进程是否运行
ps aux | grep "node.*server"     # macOS/Linux
tasklist | findstr node          # Windows

# 直接测试后端健康检查
curl http://localhost:3000/api/v1/health
```

**恢复步骤：**
```bash
# Step 1: 杀掉占用端口 3000 的进程
npx kill-port 3000

# Step 2: 重新启动
npm run dev
```

**验证方法：** `curl http://localhost:3000/api/v1/health` 应返回 `{ code: 0, data: { uptime: ..., timestamp: ... } }`

### 6.4 场景：npm install 失败（Windows 无 Python / 编译失败）

**症状**：`npm install` 报错 `gyp ERR!` 或 `python` not found。

**诊断命令：**
```bash
npm install --dry-run 2>&1 | grep -i "error\|gyp\|python"
```

**恢复步骤：**
```bash
# Step 1: 清理之前的安装
rm -rf node_modules package-lock.json

# Step 2: 跳过 native addon 编译
npm install --ignore-scripts

# Step 3: 手动安装 sql.js（WASM 版本，无需编译）
npm install sql.js@1.10.3 --ignore-scripts

# Step 4: 如果 sql.js 的 WASM 文件加载失败，检查路径
node -e "import('sql.js').then(m => m.default().then(s => console.log('sql.js OK:', Object.keys(s))))"
```

### 6.5 场景：端口冲突（8080 或 3000 已被占用）

**症状**：启动时报错 `EADDRINUSE: address already in use :::3000` 或 `:::8080`。

**诊断命令：**
```bash
# Windows
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8080"

# 如果找到 PID，杀掉进程
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                  # macOS/Linux
```

**恢复步骤：**
```bash
# 使用 kill-port 工具
npx kill-port 3000 8080

# 重新启动
npm run dev
```

### 6.6 前端回退策略

当后端 API 完全不可用时，前端有本地的 mock 数据兜底：

```javascript
// 访问任意页面时添加 ?mock=1 启用 mock 模式
// 例如：http://localhost:8080/#workbench?mock=1
// 这会绕过所有后端 API 调用，使用 BA.api.mock 中的硬编码数据
```

---

## 七、状态同步协议

### 7.1 前后端状态同步

```
┌─ sessionStorage ─────────────┐     ┌─ SQLite ──────────────┐
│ access_token  ←── 登录响应 ──│←───│ users 表               │
│ refresh_token ←── 登录响应 ──│←───│ refresh_tokens 表      │
│ current_user  ←── /profile ──│←───│ user_roles 表          │
│                              │     │ roles 表               │
│ BA.auth.refreshToken() ───────→  │ POST /auth/refresh      │
│   ↓ 成功：更新 access_token   │     │   → 生成新 access token│
│   ↓ 失败：清空 + 跳 #login    │     │   → 撤销旧 refresh    │
└──────────────────────────────┘     └────────────────────────┘
```

**同步保证：**
- 登录时：后端返回 `{ accessToken, refreshToken, user }`，前端同时存入 sessionStorage
- 刷新时：后端新 access token + 新 refresh token（旧 refresh token 被撤销），前端更新 sessionStorage
- 登出时：后端 `DELETE FROM refresh_tokens WHERE token = ?`，前端 `sessionStorage.clear()`
- 密码修改：无需清理 token，但可选择性撤销所有 refresh token

### 7.2 多 Agent 协调 — dev-status.json 协议

`dev-status.json` 是跨 Agent 会话的状态共享文件。多个 Agent 可能同时开发不同模块，需要遵守以下协议：

**写入规则：**
1. 修改 `phases.X.status` 前必须读取最新版本（防止覆盖其他 Agent 的更新）
2. 修改后立即更新 `lastUpdated` 字段为当前日期
3. 只修改与当前任务相关的 phase，不要触碰其他 phase

**状态语义：**
- `done` — 该阶段已完成，不可回退（除非用户明确要求重构）
- `done` → `pending` 是不允许的（表示已完成→需要重做，应该新增 phase）

**Phase 追踪约定：**
```json
{
  "phases": {
    "X_title": {
      "status": "done" | "in_progress" | "pending",
      "note": "一句话概括该阶段完成的工作"
    }
  },
  "pending": ["待处理事项1", "待处理事项2"]
}
```

**冲突处理：** 如果读取时发现 `lastUpdated` 比本地缓存新，说明其他 Agent 已更新，应基于最新版本操作。

### 7.3 多 Agent 协调 — project-context.md 更新策略

- **API 端点变化**（新增/删除/改名）：必须更新 `project-context.md` 的 API 端点列表
- **新增数据库表**：必须更新表清单
- **新增决策记录**：追加新的决策记录并编号
- **种子账号变更**：更新表格
- **不更新的情况**：仅有实现细节修改、风格统一、bug 修复（不改变接口契约）

---

## 八、跨插件协作规则

当用户触发以下外部插件时，Agent 必须遵守与 B Admin 项目的交互边界：

### 8.1 交互规则总表

| 外部插件 | 触发时行为 | 与 B Admin 交互方式 | 输出约束 |
|---------|-----------|-------------------|---------|
| finance / financial-analysis | 分析财报、建立财务模型 | **禁止**：不修改 B Admin 代码。**允许**：可读取 B Admin 项目/服务数据作为分析对象，在项目外生成 `.xlsx` 或报告文件 | 输出独立文件，不写入 `server/` 或 `b-admin/` |
| trading-agent / ai-hedge-fund | 投资分析、股票评估 | **禁止**：不修改 B Admin 代码。**允许**：可读取 B Admin `services` 表中的公司数据作为分析输入 | 生成独立报告文件，`.html` 可视化报告放在项目根目录 |
| data-analysis | 数据分析、可视化 | **允许**：读取 SQLite 数据（通过 `getDb().prepare().all()`）进行分析。**禁止**：修改数据库结构 | 输出 `.html` 仪表盘或 `.xlsx` 文件 |
| product-management | PRD、路线图、竞品分析 | **允许**：写入项目的 `projects` 表和 `services` 表（通过 API 或直接 DB）。**必须遵守**模块接口契约中的 Schema | 与 B Admin 项目数据融合 |
| design-to-code | 设计稿转代码 | **允许**：修改前端 `b-admin/` 下的 HTML/CSS/JS。**必须遵守**前端约定（IIFE + BA.* + hash 路由 + data-action） | 输出代码写入 `b-admin/` 目录 |
| investment-banking / equity-research / private-equity | 投行分析、研报 | **禁止**：不修改 B Admin 代码。**允许**：可读取 project/service 数据 | 生成独立文件 |
| wealth-management | 财富管理 | **禁止**：不修改 B Admin 代码 | 生成独立文件 |
| spglobal / lseg | 市场数据 | **禁止**：不修改 B Admin 代码 | 输出分析报告 |
| cloudbase | 云开发部署 | **允许**：读取项目配置，辅助部署。**关键**：不改变现有 Express + sql.js 架构 | 遵循 cloudbase 插件规范 |
| remotion-video-generator | 视频生成 | **禁止**：不修改 B Admin 代码 | 输出视频文件 |

### 8.2 数据桥梁规则

**当外部插件需要访问 B Admin 数据时，按以下优先级获取：**

1. **后端 API（生产/测试）** — 如果服务器在运行：`GET /api/v1/projects`、`GET /api/v1/services` 等
2. **数据库直读（离线分析）** — 如果服务器未运行：通过 `sql.js` 直接读取 `data/app.db`：
   ```javascript
   import initSqlJs from 'sql.js'
   import { readFileSync } from 'fs'
   const SQL = await initSqlJs()
   const buffer = readFileSync('data/app.db')
   const db = new SQL.Database(buffer)
   // 只读操作，不调用 .run()
   ```
3. **JSON 导出** — 从已有备份或 mock 数据中读取

**关键原则：** 外部插件对 B Admin 数据只做**只读分析**，不做**结构性修改**。需要写入时通过 REST API 接口而非直接 DB 操作。

### 8.3 插件冲突避免

当多个 Agent 同时工作时（例如 trading-agent 分析数据的同时 design-to-code 修改前端），通过以下方式避免冲突：

1. **文件隔离**：外部插件输出独立文件（`.html`、`.xlsx`），不写入 `server/` 或 `b-admin/` 目录
2. **数据隔离**：外部插件读数据时使用数据库副本或 API，不锁定 DB 文件
3. **状态协调**：dev-status.json 仅追踪 B Admin 项目自身的开发阶段，外部插件任务不记录在其中

---

## 九、开发生命周期

### 9.1 七阶段工作流

```
阶段 1: 需求分析         阶段 2: PRD 编写          阶段 3: 技术设计
  ↓                        ↓                        ↓
需求描述                 PRD 文档                 技术方案
用户故事                功能规格                  架构决策
验收标准                优先级排序                接口设计
  ↓                        ↓                        ↓
阶段 4: 编码实现         阶段 5: 测试              阶段 6: 代码审核
  ↓                        ↓                        ↓
按模块开发              单元测试                  代码规范检查
遵守本规范              集成测试                  安全审查
模块接口契约             E2E 测试                 性能检查
  ↓                        ↓                        ↓
阶段 7: 部署
  ↓
npm install → npm run dev → 验证
```

### 9.2 每阶段 Gate Check（Agent 自检清单）

**阶段 1 — 需求分析：**
- [ ] 用户需求是否已明确（无歧义）？
- [ ] 是否识别了所有利益相关者？
- [ ] 是否有明确的成功标准？

**阶段 2 — PRD 编写（由 product-management 插件处理）：**
- [ ] 是否包含完整的功能规格？
- [ ] 是否定义了验收标准？
- [ ] 是否评估了技术可行性？

**阶段 3 — 技术设计：**
- [ ] API 端点设计是否符合本规范 §1.3？
- [ ] 数据库表设计是否与现有 10 表兼容？
- [ ] 是否需要新的决策记录？
- [ ] 前端是否符合 IIFE + BA.* 架构？

**阶段 4 — 编码实现：**
- [ ] 是否使用 ESM + 无分号 + 单引号？
- [ ] SQL 是否使用参数化查询（`?` 占位符）？
- [ ] 新增路由是否注册到 `app.js`？
- [ ] 新增模块是否需要 Validator？
- [ ] Controller → Service 分层是否正确？
- [ ] 权限码是否正确分配？
- [ ] 前端代码是否使用 `data-action` 委托？

**阶段 5 — 测试：**
- [ ] 是否覆盖了正常流程？
- [ ] 是否覆盖了边界条件（空值、超长、特殊字符）？
- [ ] 是否覆盖了错误路径（未登录、无权限、资源不存在）？
- [ ] 是否使用 `:memory:` 数据库隔离？
- [ ] 测试是否可独立运行（不依赖其他测试的状态）？

**阶段 6 — 代码审核：**
- [ ] 是否有硬编码的密钥或凭证？
- [ ] 是否有 SQL 注入风险（字符串拼接）？
- [ ] 是否有 XSS 风险（未转义的用户输入渲染到 HTML）？
- [ ] API 是否有适当的权限控制？
- [ ] 错误信息是否不泄露内部实现细节？

**阶段 7 — 部署：**
- [ ] `npm install` 是否成功？
- [ ] `npm run dev` 是否无报错？
- [ ] 所有 API 端点是否返回正确响应？
- [ ] 数据库迁移是否成功执行？
- [ ] 种子数据是否就绪？
- [ ] 前端页面是否正常渲染？

### 9.3 dev-status.json 更新时机

| 时机 | 操作 |
|------|------|
| 完成一个阶段的所有任务 | 将该 phase 状态更新为 `done`，更新 `lastUpdated` |
| 开始一个阶段的工作 | 将该 phase 状态更新为 `in_progress` |
| 发现新的待处理事项 | 追加到 `pending` 数组 |
| 解决一个待处理事项 | 从 `pending` 数组移除 |

---

## 附录 A：错误码速查表

| 错误码 | HTTP 状态 | 含义 | 触发场景 |
|--------|----------|------|---------|
| 0 | 200/201 | 成功 | 正常响应 |
| 40101 | 401 | 未登录 | 无 token / token 无效 |
| 40102 | 401 | token 过期 | access token 过期，需刷新 |
| 40301 | 403 | 无权限 | 用户角色缺少对应权限码 |
| 40001 | 400 | 参数错误 | Zod 校验失败 |
| 40401 | 404 | 资源不存在 | 查询的 ID 不存在 |
| 42901 | 429 | 请求过于频繁 | 超过限流阈值 |
| 50001 | 500 | 服务器内部错误 | 未预料的异常 |

## 附录 B：权限码速查表

| 分组 | 权限码 | 说明 |
|------|--------|------|
| 用户管理 | `user:read`, `user:create`, `user:update`, `user:delete`, `user:assign` | 增删改查用户 + 角色分配 |
| 角色管理 | `role:read`, `role:create`, `role:update`, `role:delete` | 增删改查角色 |
| 权限管理 | `permission:read` | 查看权限列表/树 |
| 菜单管理 | `menu:read`, `menu:create`, `menu:update`, `menu:delete` | 菜单 CRUD |
| 项目管理 | `project:read`, `project:create`, `project:update`, `project:delete` | 项目 CRUD |
| 服务管理 | `service:read`, `service:create`, `service:update`, `service:delete` | 服务 CRUD |
| 字典管理 | `dict:read`, `dict:create`, `dict:update`, `dict:delete` | 字典 CRUD |
| 日志管理 | `log:read` | 查看操作日志 |

## 附录 C：常用命令速查

```bash
# 启动开发环境（前端 8080 + 后端 3000）
npm run dev

# 单独启动后端
npm run server

# 单独启动前端
npm run client

# 运行测试
npm test

# 运行特定测试文件
npm test -- --testPathPattern=auth

# 重置数据库（删除 app.db，重启后自动重建 + 迁移 + 种子）
npm run db:reset

# 检查数据库状态
node -e "import('./server/src/db/index.js').then(db => db.initDatabase().then(() => { const d = db.getDb(); console.log('Tables:', d.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all().map(r => r.name)) }))"
```
