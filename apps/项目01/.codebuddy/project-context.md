# B Admin 全栈项目上下文记忆

## 项目标识
- **名称**: b-admin-fullstack v2.0.0
- **描述**: B 端后台管理系统（Express + SQL.js + Vanilla JS）
- **路径**: `f:/项目02`

## 架构概览

```
端口 8080 (前端 vite)  ←fetch→  端口 3000 (后端 Express /api/v1)
     b-admin/                         server/src/
     ├── index.html                   ├── app.js          (Express 工厂)
     ├── scripts/                     ├── server.js       (启动入口)
     │   ├── config.js    (apiBase)   ├── config/         (dotenv)
     │   ├── api/                     ├── db/
     │   │   ├── request.js (fetch)   │   ├── index.js    (sql.js 单例)
     │   │   ├── endpoints.js         │   ├── migrate.js  (DDL)
     │   │   └── mock.js              │   └── seed.js     (种子数据)
     │   ├── auth/index.js(JWT)       ├── middleware/
     │   ├── pages/                   │   ├── auth.js     (JWT 校验)
     │   │   ├── login.js             │   ├── validate.js (Zod)
     │   │   ├── workbench.js         │   └── requirePermission.js
     │   │   ├── list.js              ├── controllers/  (8个)
     │   │   ├── card.js              ├── services/     (11个)
     │   │   └── form.js              ├── validators/   (5个)
     │   └── store/index.js           └── routes/       (10个)
     └── styles/
```

## 技术栈

| 层 | 技术 | 备注 |
|----|------|------|
| 数据库 | sql.js (SQLite WASM) | 替换 better-sqlite3，无需编译 |
| 后端 | Express 4.21 + helmet + cors | `type: module`, ESM |
| 鉴权 | JWT (access 2h + refresh 7d) | jsonwebtoken HS256 |
| 密码 | bcryptjs | 10 轮哈希 |
| 校验 | Zod 3.23 | body/query/params |
| 日志 | morgan + 自定义 logger | |
| 安全 | rate-limit (600/分) + CSP | 登录限流 10/分 |
| 前端 | Vanilla JS + IIFE 模块 | BA.* 命名空间 |
| 测试 | Jest + Supertest | :memory: 数据库 |
| 包管理 | npm + ESM | `"type": "module"` |

## 数据库 (10 张表)

users / roles / permissions / user_roles / role_permissions / menus / dictionaries / projects / services / refresh_tokens / operation_logs / _migrations

## 种子账号

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | admin123 | admin | 全部 (40+) |

## API 端点 (10 组，前缀 /api/v1)

auth / users / roles / permissions / menus / dictionaries / projects / services / workbench / logs / health

## 关键决策记录

1. **sql.js 替代 better-sqlite3**: Windows 环境缺少 Python 无法编译 native addon，用纯 JS/WASM 的 sql.js 替代，通过 initDatabase() 一次性加载，之后 getDb() 同步返回
2. **数据持久化**: 每次写操作后 200ms 防抖保存到文件
3. **前端 API 切换**: apiBase 从 `/api` 改为 `/api/v1`，endpoints 用相对路径
4. **Mock 模式**: 仅 `?mock=1` 参数启用
5. **Token 存储**: sessionStorage（非 localStorage，关闭标签即失效）

## 当前开发状态

- 阶段 0-4: 后端骨架、数据库、核心业务、测试 → 已完成
- 阶段 5: 前端 API 连接改造 → 已完成（config/auth/endpoints/request/workbench/card/form/list 已修改）
- **待完成**: npm install + 启动测试

## 用户偏好

- 语言: zh-CN
- 代码风格: ESM, 无分号, 单引号
- Vanilla JS 前端，不引入框架
