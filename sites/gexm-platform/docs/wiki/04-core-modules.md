# 04 · 核心模块职责

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 4.1 核心模块清单

| 模块 | 路径 | 职责 | 主要技术 |
| --- | --- | --- | --- |
| **mixm-laal 主题** | `wp-content/themes/mixm-laal/` | WordPress 前台 UI 与部分 AJAX 接口（13 模块） | PHP / WordPress |
| **@gexm/server** | `packages/server/` | 业务 API 后端，40+ 路由模块 | Express / TS / SQLite/PG |
| **@gexm/pc** | `packages/pc/` | PC 管理后台（订单/商品/审核/权限等） | Vue3 / Element Plus |
| **@gexm/app** | `packages/app/` | 多端 App（H5/小程序/App/鸿蒙） | uni-app 3 |
| **@gexm/sdk** | `packages/sdk/` | 跨平台适配器 SDK | TS / 适配器模式 |
| **@gexm/shared** | `packages/shared/` | 类型与工具共享 | TS |
| **@gexm/desktop** | `packages/desktop/` | Electron 桌面端 | Electron 28 |
| **Nginx 网关** | `infra/nginx/conf.d/gexm.conf` | 统一 API 网关、TLS、Gzip、缓存 | Nginx |
| **AI Agent** | `packages/server/src/services/agent/` | LangChain + MCP 工具调用 | LangChain 0.3 |

## 4.2 各模块详细职责

### 4.2.1 mixm-laal 主题

- **定位**：WordPress 前台 UI 与部分 AJAX 接口
- **入口**：[functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php)
- **模块数量**：13 个核心功能模块
- **核心职责**：
  - 内容发布与展示（首页、文章、分类、标签、搜索）
  - 电商功能（商城、商品详情、购物车、结算、订单、支付）
  - 社区互动（社交、社区、论坛、漂流瓶）
  - 内容管理（视频、网站分类、互联网采集）
  - 移动端适配（手机拉阿狸、APP 支持）
  - 后台管理（站长、API、新建站）
- **支付集成**：支付宝、微信支付、PayPal、Stripe
- **详见**：[05-wordpress-theme.md](file:///f:/gexm/docs/wiki/05-wordpress-theme.md)

### 4.2.2 @gexm/server（Express 后端）

- **定位**：业务 API 后端，承载订单/购物车/社交/AI Agent 等核心业务
- **入口**：[packages/server/src/server.ts](file:///f:/gexm/packages/server/src/server.ts)
- **App 入口**：[packages/server/src/app.ts](file:///f:/gexm/packages/server/src/app.ts)
- **核心职责**：
  - 提供 40+ RESTful 路由（`/api/v1/*`）
  - 用户认证（JWT + OAuth 7 个平台）
  - 订单/支付/购物车业务
  - 实时聊天（Socket.IO）
  - AI Agent（LangChain + MCP）
  - 监控与可观测性（Prometheus + OpenTelemetry）
- **架构**：Controller → Service → Model 三层结构
- **详见**：[06-server-backend.md](file:///f:/gexm/docs/wiki/06-server-backend.md)

### 4.2.3 @gexm/pc（PC 管理后台）

- **定位**：Vue3 PC 管理后台
- **入口**：[packages/pc/src/main.ts](file:///f:/gexm/packages/pc/src/main.ts)
- **核心职责**：
  - 数据看板（Dashboard）
  - 商品/订单/评价/分类管理
  - 用户/角色/权限管理（RBAC）
  - 审计日志
  - 聊天/站内信
  - 社交动态/评论管理
  - 限时抢购/推荐返利
  - 消息队列监控
- **技术栈**：Vue 3.4.21 + Element Plus 2.6 + Pinia 2.1.7 + Vue Router 4.3 + Vue I18n 9.13 + ECharts 5.5
- **详见**：[07-pc-admin.md](file:///f:/gexm/docs/wiki/07-pc-admin.md)

### 4.2.4 @gexm/app（多端 App）

- **定位**：uni-app 多端应用
- **入口**：[packages/app/src/main.js](file:///f:/gexm/packages/app/src/main.js)
- **核心职责**：
  - 跨端用户界面（H5/小程序/App/鸿蒙）
  - 商品浏览与下单
  - 用户认证（含 OAuth 第三方登录）
  - 实时聊天（Socket.IO Client）
  - 外卖、拼车、跑腿等 O2O 业务
- **支持平台**：H5、微信/支付宝/百度/抖音/鸿蒙小程序、App、鸿蒙 App
- **详见**：[08-app-multi-platform.md](file:///f:/gexm/docs/wiki/08-app-multi-platform.md)

### 4.2.5 @gexm/sdk（跨平台 SDK）

- **定位**：通过适配器模式统一 9 个平台的接口
- **入口**：[packages/sdk/src/index.ts](file:///f:/gexm/packages/sdk/src/index.ts)
- **核心职责**：
  - 统一 network（网络请求）/storage（存储）/crypto（加解密）/log（日志）/terminal（终端）接口
  - 提供事件总线（EventBus）
  - 提供插件注册表（PluginRegistry）
  - 屏蔽各平台 API 差异
- **支持平台**：Web、微信/支付宝/百度/抖音/鸿蒙小程序、App（uni-app plus）、Electron、鸿蒙 App
- **详见**：[09-sdk-adapters.md](file:///f:/gexm/docs/wiki/09-sdk-adapters.md)

### 4.2.6 @gexm/shared（共享包）

- **定位**：跨端共享的 TypeScript 类型定义与工具函数
- **入口**：[packages/shared/src/index.ts](file:///f:/gexm/packages/shared/src/index.ts)
- **核心职责**：
  - 跨端共享的类型定义（`types/`）
  - 跨端共享的工具函数（`utils/`）
  - 平台判断工具（`platform.ts`）
  - TraceId 工具（`tracing.ts`）
- **依赖关系**：被 `@gexm/server` 与 `@gexm/app` 通过 `file:../shared` 依赖
- **详见**：[10-shared-desktop.md](file:///f:/gexm/docs/wiki/10-shared-desktop.md)

### 4.2.7 @gexm/desktop（桌面端）

- **定位**：Electron 28 桌面端
- **路径**：[packages/desktop/](file:///f:/gexm/packages/desktop/)
- **核心职责**：
  - 提供桌面端用户体验
  - 与 PC 后台共享部分代码
  - 通过 `@gexm/sdk` 的 `ElectronPlatformAdapter` 接入跨平台能力
- **环境变量**：[packages/desktop/.env.example](file:///f:/gexm/packages/desktop/.env.example)
- **详见**：[10-shared-desktop.md](file:///f:/gexm/docs/wiki/10-shared-desktop.md)

### 4.2.8 Nginx 网关

- **定位**：统一 API 网关、TLS、Gzip、缓存
- **配置文件**：
  - [infra/nginx/conf.d/gexm.conf](file:///f:/gexm/infra/nginx/conf.d/gexm.conf)
  - [docker/nginx/gexm.conf](file:///f:/gexm/docker/nginx/gexm.conf)
  - [docker/nginx/prod.conf](file:///f:/gexm/docker/nginx/prod.conf)
- **核心职责**：
  - 反向代理：`/api/wp/` → WordPress、`/api/app/` → Express
  - TLS 1.2/1.3 + 安全 cipher suite
  - HSTS（max-age=31536000）
  - Gzip 压缩（level 6）
  - 静态资源 1 年缓存
  - 屏蔽敏感路径（`logs/`、`backups/`、`cache/`、`.log`、`.sql`、`.bak`）
- **详见**：[14-deployment.md](file:///f:/gexm/docs/wiki/14-deployment.md)

### 4.2.9 AI Agent

- **定位**：LangChain + MCP 工具调用
- **路径**：[packages/server/src/services/agent/](file:///f:/gexm/packages/server/src/services/agent/)
- **核心职责**：
  - LangChain Agent 主入口（`agentService.ts`）
  - MCP Server 暴露（`mcpServer.ts`）
  - 工具集（`tools.ts`）
  - 内置技能（`skills/`：product-search、order-inquiry、user-service）
- **依赖**：LangChain 0.3 + MCP SDK 1.29 + OpenAI

## 4.3 模块协作关系

### 4.3.1 用户下单流程

```
[@gexm/app/pc]
  ↓ HTTP 请求
[Nginx 网关]
  ↓ /api/app/* 转发
[@gexm/server Express]
  ↓ Controller → Service → Model
[SQLite/PostgreSQL]
  ↓ 异步任务
[Queue Service] → [Order Queue Handler] → [Notification Service]
  ↓ 通过 Socket.IO 推送
[@gexm/app/pc 实时更新]
```

### 4.3.2 跨端能力调用

```
[@gexm/app/pc 业务代码]
  ↓ 调用 SDK 接口（如 GexmSDK.network.request()）
[@gexm/sdk]
  ↓ 通过 PlatformFactory 获取当前平台适配器
[Platform Adapter (Web/MP/App/Electron/...)]
  ↓ 调用平台原生 API
[底层平台（浏览器/微信/支付宝/App/Electron/...）]
```

### 4.3.3 主题与 Express 互通

```
[WordPress 前台 mixm-laal 主题]
  ↓ wp_remote_get() 调用
[Nginx 网关 /api/app/*]
  ↓
[@gexm/server Express]
  ↓ 业务处理
[DB]
```
