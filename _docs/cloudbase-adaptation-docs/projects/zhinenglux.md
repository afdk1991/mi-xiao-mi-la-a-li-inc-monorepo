# zhinenglux · CloudBase 适配方案

> 适配等级：**A · 原生受益（最高优先级）** ｜ 预估工作量：**2–3 天** ｜ 代码改动：**中等（后端为主）**

## 1. 现状诊断

| 维度 | 现状 |
|---|---|
| 技术栈 | Taro 跨端小程序（62 处）+ Koa/NestJS 后端 + PostgreSQL/SQLite/Supabase 依赖 |
| 源文件规模 | 84 个源文件 |
| 当前数据层 | server/package.json 同时声明 **Supabase / PostgreSQL / SQLite** 三种依赖，数据层选型未收敛 |
| 认证方式 | 未见独立认证模块，后端无 JWT/Bcrypt 信号 |
| 文件/存储 | src/network.ts 有文件上传逻辑（1 处） |
| 后端形态 | server/src 为 NestJS 结构（app.module.ts / app.controller.ts），main.ts 混入 Express |
| 已接入云服务 | **无** CloudBase 接入 |

这是 16 个项目里**与 CloudBase 契合度最高的一个**：跨端小程序 + Node 后端，正是 CloudBase 的主场。
关键发现：`server/package.json` 里已装了 **Supabase** —— 说明你原本就打算走 BaaS 路线，
但三类数据库依赖并存说明数据层没定型。这不是"迁移"，而是**趁早把 BaaS 选型收敛到 CloudBase**，代价最小。

## 2. CloudBase 能力映射

| 现有能力 | CloudBase 对应 | 迁移方式 |
|---|---|---|
| Supabase（已装未用/半用） | CloudBase 文档型数据库 + 云存储 | 卸载 supabase-js，改 @cloudbase/js-sdk；两者 API 形态接近（.from().select() → .collection().where().get()） |
| NestJS/Express 后端 | CloudBase 云函数（Node 运行时）或云托管 CloudRun | 轻量接口迁云函数；长驻服务（含连接池）走云托管，不要硬塞云函数 |
| PostgreSQL | CloudBase MySQL / PostgreSQL 实例 | CloudBase 现已提供关系型数据库，可保留 SQL 与既有 schema，不必改成文档型 |
| SQLite（本地文件） | 云数据库集合 | SQLite 在多实例云函数下不可靠（无共享文件系统），必须迁出 |
| 文件上传 | CloudBase 云存储 | app.storage.from(bucket).upload(key, file) 拿 fileID，库里只存 fileID |
| 小程序登录 | CloudBase 认证（微信登录） | app.auth().signInWithWeChat()；不要把登录逻辑搬进云函数 |

## 3. 接入点（需要改动的具体位置）

1. `server/package.json —— 移除 supabase / sqlite3，加 @cloudbase/node-sdk`
2. `server/src/app.module.ts —— 注入 CloudBase 初始化 provider`
3. `server/src/main.ts —— Express 与 Nest 混用需先厘清，再决定迁云函数还是云托管`
4. `src/network.ts —— 文件上传改走云存储直传`
5. `config/dev.ts、config/index.ts —— 新增 envId 配置项（占位符）`
6. `types/global.d.ts —— 支付相关类型定义，接入后需同步`

## 4. 改造步骤

### 步骤 1：收敛数据层选型（先做这个，别急着写代码）

当前 Supabase / PG / SQLite 三选一未定。先定：**关系型业务数据 → CloudBase MySQL/PG**；
**非结构化、读多写少 → 文档型数据库**。定完再动 package.json，否则会返工。

### 步骤 2：后端接入 Node SDK

```bash
cd server && npm uninstall @supabase/supabase-js sqlite3
npm install @cloudbase/node-sdk
```
在 app.module.ts 建一个 CloudBaseProvider，全局单例初始化，env 填 `YOUR_ENV_ID`。

### 步骤 3：SQLite 数据迁出

SQLite 是**必须先迁的**：云函数多实例不共享本地磁盘，写入会丢。
导出为 JSON → 用 Manager Node SDK 批量导入云数据库集合。

### 步骤 4：小程序端换 SDK

Taro 端装 `@cloudbase/js-sdk`（Taro 打包可用），或直接用微信原生 `wx.cloud` ——
若你的小程序已开微信云开发，走 `wx.cloud.database()` 更省事，两者不冲突。

### 步骤 5：文件存储切换

src/network.ts 的上传逻辑改为云存储直传，前端拿 fileID 存库，避免文件流经后端。

## 5. 风险与注意

- **别把 SQLite 留在云函数里** —— 多实例无共享磁盘，是最容易踩且最难排查的坑。
- Express 与 NestJS 混用（main.ts + app.module.ts 并存）说明后端结构本身未收敛，迁云前先厘清，否则会把混乱带进云端。
- CloudBase 文档型数据库是 MongoDB 兼容，若你已写了大量 SQL（PG），不要强行改文档型 —— CloudBase 现已支持 MySQL/PG，保留 SQL 改造量更小。
- 安全规则修改后有 **2–5 分钟缓存延迟**，改完立即写入可能报 DATABASE_PERMISSION_DENIED，不要误判为规则写错。

## 6. 对应离线文档

- `offline-docs/database/introduce.html`
- `offline-docs/database/doc-crud.html`
- `offline-docs/cloud-function/introduce.html`
- `offline-docs/authentication/index.html`
