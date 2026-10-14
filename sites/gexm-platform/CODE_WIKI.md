# Gexm 全平台应用系统 · Code Wiki

> **仓库根路径**：[`f:\gexm`](file:///f:/gexm)
> **项目代号**：`gexm-platform`（npm workspaces monorepo）
> **主题版本**：`MixM Laal v1.0.0`
> **文档生成日期**：2026-07-23
> **License**：MIT（前端/后端/SDK）；GPLv2+（WordPress 主题/插件）

---

## 一、项目概览

### 1.1 一句话定位

Gexm 是一套基于 **npm workspaces monorepo** 架构的全平台应用系统，涵盖 Express.js 后端、uni-app 多端前端、Vue3 PC 管理后台、Electron 桌面端、跨平台 SDK、共享类型库以及 WordPress 主题/插件生态，覆盖打车、外卖、商城、跑腿、拼团、秒杀、会员、分销、社交、社区、论坛等十余个业务场景。

### 1.2 技术栈一览

| 层级 | 技术选型 | 关键依赖 |
| --- | --- | --- |
| Monorepo | npm workspaces | [`package.json`](file:///f:/gexm/package.json) `workspaces: ["packages/*"]` |
| 后端 | Express.js + TypeScript | express 4.18, better-sqlite3 12.3, pg 8.22, redis 4.7, socket.io 4.8, jwt 9.0, zod 3.25, langchain 0.3, helmet, winston |
| 前端 App | uni-app 3.0 + Vue 3.4.21 | @dcloudio/uni-app, pinia 2.1.7, socket.io-client, vue-router |
| PC 管理后台 | Vue 3 + TypeScript + Element Plus | element-plus 2.6.1, echarts 5.5, pinia, vue-i18n 9.13, vite-plugin-pwa |
| 桌面端 | Electron 28.2.0 + electron-builder 25 | electron-store, electron-updater, dompurify |
| SDK | TypeScript + Vite | axios, crypto-js, uuid；9 平台适配器 |
| 共享库 | TypeScript | dayjs；OpenTelemetry peer deps |
| WordPress | PHP 7.4+ / WP 6.0+ | mixm-laal 主题 + mixm-core/commerce/security 插件 |
| 数据库 | SQLite（默认）+ PostgreSQL（可选）+ Redis（缓存） | better-sqlite3, pg, ioredis |
| 实时通信 | Socket.IO | socket.io 4.8（聊天 + AI 助手推送） |
| AI/Agent | LangChain + MCP | @langchain/openai, @modelcontextprotocol/sdk |
| 部署 | Docker Compose + Nginx + PM2 | 5 服务容器 + 3 网络隔离 |

### 1.3 核心特性

- **多端覆盖**：H5、微信/支付宝/百度/抖音小程序、App（iOS/Android）、鸿蒙小程序、鸿蒙 App、Electron 桌面端
- **双数据库**：SQLite（开发默认）与 PostgreSQL（生产可选）通过 `IDbClient` 接口抽象，支持同步/异步双 API
- **JWT 双 Token**：Access Token + Refresh Token，含 Token 黑名单与自动续期
- **安全加固**：Helmet CSP、CORS 白名单、CSRF 防护、XSS 过滤、SQL 注入防护、速率限制、敏感数据脱敏、IPC 来源校验（Electron）
- **REST API**：后端 40+ 路由模块，WordPress 端 8 个 REST 控制器（rides/food/errands/drivers/merchants/activities/group-buys/tickets）
- **实时通信**：Socket.IO 支持聊天、AI 助手回复推送、订单状态实时更新
- **国际化**：后端 351+ WordPress 国际化字符串，PC 端 vue-i18n 中英双语
- **性能优化**：Critical CSS 内联、WebP 自动检测、字体预加载、defer 脚本、CDN 配置、对象缓存（Redis）、查询 LIMIT 防全表扫描

---

## 二、整体架构

### 2.1 顶层架构图（文字版）

```
┌─────────────────────────────────────────────────────────────────────┐
│                         客户端层（多端入口）                          │
├──────────┬──────────┬──────────┬──────────┬─────────────────────────┤
│  H5/Web  │ 小程序×4  │  App     │ 鸿蒙端×2  │  Electron 桌面端        │
│ (app)    │ (app)    │ (app)    │ (app)    │  (desktop)              │
│          │ 微信/支付宝│ iOS/And  │ 小程序/App│  内嵌 PC 管理后台       │
│          │ /百度/抖音 │          │          │                         │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬────────────────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    @gexm/sdk（跨平台 SDK 适配层）                    │
│  9 平台适配器：web / mp-weixin / mp-alipay / mp-baidu / mp-toutiao  │
│                app-plus / electron / mp-harmony / app-harmony       │
│  统一接口：network / storage / crypto / log / terminal              │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Nginx 反向代理（API 网关 + 静态资源 + SSL）             │
│  api.laal.top → Express API    www.laal.top → WordPress             │
└────────┬────────────────────────────────┬───────────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────┐        ┌─────────────────────────────────────┐
│  Express 后端服务    │        │        WordPress 站点                │
│  @gexm/server        │        │  主题：mixm-laal（13 模块）          │
│  - 40+ REST 路由     │◄──────►│  插件：mixm-core（8 REST 控制器）    │
│  - Socket.IO 实时    │  双向  │        mixm-commerce（商城）         │
│  - LangChain+MCP AI  │  同步  │        mixm-security（安全防护）     │
│  - JWT 双 Token      │        │  共享：用户体系 / 支付 / 商品         │
└────────┬────────────┘        └────────────┬────────────────────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        数据持久层                                     │
├──────────────┬──────────────────┬────────────────────────────────────┤
│ SQLite(开发) │ PostgreSQL(生产) │ Redis（缓存 + 会话 + 限流）        │
│ better-sqlite3│ pg 8.22         │ ioredis                            │
└──────────────┴──────────────────┴────────────────────────────────────┘
```

### 2.2 分层职责

| 层级 | 包名 | 职责 |
| --- | --- | --- |
| 客户端 | [`@gexm/app`](file:///f:/gexm/packages/app) | uni-app 多端前端，36 API 模块、24+ 组件、19 Pinia stores |
| 客户端 | [`@gexm/pc`](file:///f:/gexm/packages/pc) | Vue3 PC 管理后台，22 路由、Element Plus 按需引入 |
| 客户端 | [`@gexm/desktop`](file:///f:/gexm/packages/desktop) | Electron 桌面端，内嵌 PC 后台，secureHandle 安全 IPC |
| 适配层 | [`@gexm/sdk`](file:///f:/gexm/packages/sdk) | 9 平台适配器，惰性工厂模式，统一 network/storage/crypto/log |
| 共享层 | [`@gexm/shared`](file:///f:/gexm/packages/shared) | 类型定义（50+ 接口）+ 工具函数（10 模块） |
| 服务层 | [`@gexm/server`](file:///f:/gexm/packages/server) | Express + TS 后端，40+ 路由、50+ 数据表、Socket.IO |
| CMS 层 | [`wp-content/themes/mixm-laal`](file:///f:/gexm/wp-content/themes/mixm-laal) | WordPress 主题，13 核心模块、70+ inc/ PHP 文件 |
| CMS 层 | [`wp-content/plugins/mixm-core`](file:///f:/gexm/wp-content/plugins/mixm-core) | WordPress 核心插件，8 REST 控制器、12 数据表 |
| CMS 层 | [`wp-content/plugins/mixm-commerce`](file:///f:/gexm/wp-content/plugins/mixm-commerce) | 商城插件，商品/订单/支付 |
| CMS 层 | [`wp-content/plugins/mixm-security`](file:///f:/gexm/wp-content/plugins/mixm-security) | 安全插件，防暴力破解/XSS/SQL 注入 |

### 2.3 三网隔离（Docker 部署）

根据 [`docker-compose.yml`](file:///f:/gexm/docker-compose.yml)，生产部署采用三网络隔离：

| 网络名 | 子网 | 用途 | 内部 |
| --- | --- | --- | --- |
| `gexm-frontend` | 10.20.0.0/24 | 前端容器（app/pc）+ Nginx 入口 | 否 |
| `gexm-backend` | 10.21.0.0/24 | 后端容器（server）+ 前端容器 | 否 |
| `gexm-db` | 10.22.0.0/24 | 数据库容器（redis/postgres）+ 后端容器 | 是（不可外访） |

---

## 三、模块详解

### 3.1 后端服务 [`packages/server`](file:///f:/gexm/packages/server)

#### 3.1.1 概述

- **技术栈**：Express 4.18 + TypeScript + better-sqlite3/pg/redis + Socket.IO 4.8 + LangChain 0.3
- **入口**：[`src/server.ts`](file:///f:/gexm/packages/server/src/server.ts) → [`src/app.ts`](file:///f:/gexm/packages/server/src/app.ts)
- **API 前缀**：`/api/v1`

#### 3.1.2 应用初始化（[`src/app.ts`](file:///f:/gexm/packages/server/src/app.ts)）

初始化流程：
1. `trust proxy = 1`（信任反向代理）
2. 初始化数据库 `initDatabase()`
3. 配置 compression、helmet（含 CSP）
4. CORS 白名单（不做 origin 反射）
5. 安全中间件链：`forceHttps` → `securityHeaders` → `xssFilter` → `sanitizeInput` → `csrfToken`
6. 速率限制（`/api/` 路径）
7. 静态文件 `/uploads`
8. Swagger UI（仅开发环境）
9. 健康检查 `/api/health` + 指标 `/api/metrics`（生产需管理员权限）
10. 注册 40+ 路由
11. 初始化支付网关

#### 3.1.3 路由注册（[`src/routes/index.ts`](file:///f:/gexm/packages/server/src/routes/index.ts)）

共注册 **40+ 路由模块**，统一挂载在 `/api/v1` 下：

| 路由 | 路径 | CSRF | 说明 |
| --- | --- | --- | --- |
| auth | `/auth` | 启用 | 登录/注册/刷新 Token/登出 |
| users | `/users` | 启用 | 用户资料/头像/密码 |
| notifications | `/notifications` | 启用 | 通知列表/已读 |
| sync | `/sync` | 启用 | 数据同步 |
| upload | `/upload` | 启用 | 文件上传 |
| chat | `/chat` | 启用 | 聊天会话/消息 |
| cart | `/cart` | 启用 | 购物车 |
| favorites | `/favorites` | 启用 | 收藏 |
| addresses | `/addresses` | 启用 | 收货地址 |
| categories | `/categories` | 启用 | 分类 |
| reviews | `/reviews` | 启用 | 评论 |
| search | `/search` | 启用 | 搜索 |
| products | `/products` | 启用 | 商品 |
| orders | `/orders` | 启用 | 订单 |
| payment | `/payment` | 启用 | 支付 |
| coupons | `/coupons` | 启用 | 优惠券 |
| members | `/members` | 启用 | 会员 |
| shipping | `/shipping` | 启用 | 配送 |
| flash-sales | `/flash-sales` | 启用 | 秒杀 |
| checkins | `/checkins` | 启用 | 签到 |
| tasks | `/tasks` | 启用 | 任务 |
| inbox | `/inbox` | 启用 | 站内信 |
| errands | `/errands` | 启用 | 跑腿 |
| admin | `/admin` | 启用 | 后台管理 |
| oauth | `/oauth` | 豁免 | OAuth 登录（第三方回调无 CSRF） |
| agent | `/agent` | 启用 | AI Agent |
| queue | `/queue` | 启用 | 消息队列 |
| dual-write | `/dual-write` | 豁免 | 双写同步（内部服务调用） |
| language | `/language` | 豁免 | 语言切换（需匿名访问） |
| food | `/food` | 启用 | 外卖 |
| ride | `/ride` | 启用 | 打车 |
| referral | `/referral` | 启用 | 分销 |
| social | `/social` | 启用 | 社交动态 |
| group-buy | `/group-buy` | 启用 | 拼团 |
| tickets | `/tickets` | 启用 | 工单 |
| push | `/push` | 启用 | 推送 |
| merchants | `/merchants` | 启用 | 商家 |
| drivers | `/drivers` | 启用 | 骑手 |
| activities | `/activities` | 启用 | 活动 |
| monitoring | `/monitoring` | 豁免 | 监控（Prometheus 抓取） |
| performance | `/performance` | 豁免 | 性能指标 |
| achievements | `/achievements` | 启用 | 成就 |
| learning | `/learning` | 启用 | 学习路径 |
| price-compare | `/price-compare` | 启用 | 比价 |
| metrics | `/metrics` | 豁免 | 指标（生产需管理员权限） |

#### 3.1.4 配置系统（[`src/config/index.ts`](file:///f:/gexm/packages/server/src/config/index.ts)）

配置接口涵盖：
- `port` / `env`
- `jwt`：secret / refresh / issuer / audience
- `security`：forceHttps / corsOrigins / csrfSecret / piiKey
- `oauth`：wechat / qq / weibo / alipay / google / facebook / twitter
- `database`：sqlite / postgres（含连接池配置）
- `upload` / `rateLimit`
- `payment`：wechat / alipay / ipWhitelist
- `logging`：maskPatterns（敏感数据脱敏）
- `cache` / `apm` / `agent`（OpenAI）

关键方法：
- `getSecretKey()`：生产环境强制要求密钥，开发环境 fallback
- `validateKeys()`：密钥强度校验（32+ 字符，含大小写/数字/特殊字符）
- `getKeyHealthStatus()`：密钥健康状态报告

#### 3.1.5 错误码系统（[`src/constants/errorCodes.ts`](file:///f:/gexm/packages/server/src/constants/errorCodes.ts)）

| 范围 | 类型 | 示例 |
| --- | --- | --- |
| 1000-1999 | GENERAL | 1001 未知错误、1002 参数无效 |
| 2000-2999 | AUTH | 2001 未登录、2002 Token 过期、2003 权限不足 |
| 3000-3999 | BUSINESS | 3001 用户名已存在、3401-3410 支付错误、3501-3508 优惠券错误 |
| 4000-4999 | RESOURCE | 4001 文件未找到、4002 文件过大 |
| 6000-6999 | SECURITY | 6001 速率限制、6002 CSRF 验证失败、6003 XSS 检测、6004 SQL 注入检测 |

辅助函数：`getErrorDetail(code)`、`getErrorType(code)`

#### 3.1.6 数据模型（[`src/models/index.ts`](file:///f:/gexm/packages/server/src/models/index.ts)）

数据库抽象层：
- `IDbClient` 接口：统一同步/异步 API
- `SQLiteSyncClient`：基于 better-sqlite3
- `PgSyncClient`：基于 pg
- `initDatabase()` / `createTables()`：创建 **50+ 数据表**
- `initDefaultData()`：初始化管理员、RBAC 角色/权限、商城/任务/学习/成就示例数据

数据表分类：
- **用户体系**：users, refresh_tokens, oauth_accounts, oauth_states, login_attempts, verify_codes, token_blacklist
- **社交**：friends, feeds, feed_likes, feed_comments, comment_likes, shares, comments
- **电商**：products, product_skus, carts, orders, order_items, order_logs, logistics, payments, reviews, favorites, stock_logs, coupons, user_coupons
- **外卖**：merchants, dishes, food_orders
- **打车**：drivers, ride_orders, ride_tracks
- **跑腿**：errand_orders, errand_tracks
- **拼团/秒杀**：group_buy_activities, group_buy_orders, group_buy_records, flash_sales, flash_sale_items
- **会员/积分**：member_levels, user_points, point_logs, checkins
- **分销**：distributor_levels, distributors, referral_relationships, commission_records, withdraw_records
- **消息**：conversations, messages, notifications, push_tasks, inbox_messages, tickets, ticket_messages
- **RBAC**：roles, permissions, role_permissions, user_roles
- **学习/成就**：learning_profiles, learning_contents, learning_paths, learning_path_nodes, learning_progress, learning_behaviors, achievement 系列
- **系统**：files, sync_records, error_logs, activities, tasks, user_tasks, search_history, shipping_templates, sensitive_verify_tokens, reconciliation_records, device_tokens, push_logs, verification_codes

#### 3.1.7 服务器启动与优雅关闭（[`src/server.ts`](file:///f:/gexm/packages/server/src/server.ts)）

启动流程：
1. 初始化缓存服务（生产失败则退出，开发降级）
2. 初始化队列服务
3. 初始化订单队列消费者
4. 初始化通知处理器
5. 启动 HTTP 监听
6. 初始化 WebSocket（Socket.IO）
7. 初始化监控服务、定时任务
8. 启动自动备份（生产立即启动，开发 24h 间隔）

优雅关闭顺序：HTTP server → WebSocket → 自动备份 → 监控 → 定时任务 → 缓存 → 队列 → 数据库，含 30s 强制退出超时。

---

### 3.2 跨平台 SDK [`packages/sdk`](file:///f:/gexm/packages/sdk)

#### 3.2.1 概述

- **构建**：Vite 输出 `dist/index.cjs.js` / `dist/index.es.js` / `dist/index.d.ts`
- **依赖**：axios, crypto-js, uuid；peer: vue 3.3.13
- **入口**：[`src/index.ts`](file:///f:/gexm/packages/sdk/src/index.ts)

#### 3.2.2 GexmSDK 静态类

核心 API：
- `GexmSDK.init(config)`：初始化 SDK，检测平台、注册适配器工厂、实例化当前平台适配器
- `GexmSDK.destroy()`：销毁所有插件与适配器
- `GexmSDK.getPlatform()` / `getAdapter()`：获取当前平台/适配器
- `GexmSDK.network` / `storage` / `crypto` / `log` / `terminal`：模块访问器（惰性初始化检查）
- `GexmSDK.eventBus` / `pluginRegistry`：事件总线与插件注册表
- `GexmSDK.registerPlatform()` / `usePlugin()`：扩展接口

#### 3.2.3 惰性工厂模式（[`src/core/platformFactory.ts`](file:///f:/gexm/packages/sdk/src/core/platformFactory.ts)）

设计要点：
- `adapterFactories: Map<PlatformType, AdapterFactory>`：工厂函数注册表
- `adapterInstances: Map<PlatformType, IPlatformAdapter>`：实例缓存
- `get(platform)`：优先返回缓存实例，否则通过工厂惰性创建
- `registerFactory()`：注册工厂后清除旧实例缓存
- `detect()`：基于 `navigator.userAgent` + `window.__wxjs_environment` + `window.electron` + `window.__uni__` + `process.versions.electron` 检测平台

#### 3.2.4 9 平台适配器

| 适配器 | 平台 | 基类 |
| --- | --- | --- |
| `WebPlatformAdapter` | web | 直接实现 IPlatformAdapter |
| `MPWeixinPlatformAdapter` | mp-weixin | UniMPBaseAdapter |
| `MPAlipayPlatformAdapter` | mp-alipay | UniMPBaseAdapter |
| `MPBaiduPlatformAdapter` | mp-baidu | UniMPBaseAdapter |
| `MPToutiaoPlatformAdapter` | mp-toutiao | UniMPBaseAdapter |
| `AppPlusPlatformAdapter` | app-plus | UniMPBaseAdapter |
| `ElectronPlatformAdapter` | electron | 直接实现 |
| `MpHarmonyPlatformAdapter` | mp-harmony | UniMPBaseAdapter |
| `AppHarmonyPlatformAdapter` | app-harmony | UniMPBaseAdapter |

每个适配器实现 5 个模块：`network` / `storage` / `crypto` / `log` / `terminal`

#### 3.2.5 类型定义（[`src/interfaces/ITypes.ts`](file:///f:/gexm/packages/sdk/src/interfaces/ITypes.ts)）

- `PlatformType`：14 个字面量联合类型（从 @gexm/shared 引入）
- `SDKConfig`：platform / baseUrl / timeout / debug / logLevel / storagePrefix / encryptionKey
- `NetworkRequestConfig` / `NetworkResponse`：网络请求/响应
- `StorageOptions` / `StorageItem`：存储（含加密/TTL）
- `LogMessage` / `LogLevel`：日志
- `EncryptionOptions`：AES / DES / TripleDES
- `PluginInfo` / `ErrorCode`：插件与错误

---

### 3.3 共享库 [`packages/shared`](file:///f:/gexm/packages/shared](file:///f:/gexm/packages/shared)

#### 3.3.1 概述

- **依赖**：dayjs；peer: OpenTelemetry 系列
- **构建**：`tsc --declaration --outDir dist`
- **入口**：[`src/index.ts`](file:///f:/gexm/packages/shared/src/index.ts)（re-export types + utils）

#### 3.3.2 类型定义（[`src/types/index.ts`](file:///f:/gexm/packages/shared/src/types/index.ts)）

涵盖 **50+ 业务接口**，分类：
- **用户**：User, LoginRequest/Response, RegisterRequest, UpdateProfileRequest, ChangePasswordRequest
- **商品**：Product, ProductSku, StockLog, Category
- **订单**：Order, OrderItem, OrderStatistics, Logistics, OrderStatus
- **购物车**：CartItem
- **支付**：Payment, PaymentMethod, PaymentStatus
- **优惠券**：Coupon, UserCoupon
- **会员**：MemberLevel, MemberPointsLog, CheckinRecord, CheckinConfig
- **秒杀**：FlashSale, FlashSaleItem
- **分销**：Referral, ReferralOrder, ReferralWithdraw
- **社交**：Conversation, Message, Comment
- **收藏/评价**：Favorite, Review
- **推送**：PushMessage
- **地址**：Address
- **系统**：ApiResponse, PaginatedResponse, AppConfig, Notification, UploadFile, SyncRecord, ErrorLog, ServiceConfig, DatabaseConfig, RedisConfig, JwtConfig, TraceContext, RequestContext, CacheConfig, QueueConfig

#### 3.3.3 工具函数（[`src/utils/index.ts`](file:///f:/gexm/packages/shared/src/utils/index.ts)）

10 个工具模块：
- `env`：环境检测（Node.js / 浏览器 / 小程序）
- `crypto`：HMAC-SHA256 / 随机字符串 / 哈希
- `uuid`：UUID v4 / 短 ID / 订单号
- `html`：实体转义 / XSS 净化
- `date`：格式化 / 相对时间 / 范围判断
- `string`：截断 / 大小写转换 / 脱敏 / JSON 安全解析
- `validator`：邮箱 / 手机号 / 身份证 / 银行卡 / UUID
- `misc`：数组 / 对象 / 函数 / 异步 / 数值 / 格式化 / 文件 / HTTP
- `platform`：平台检测（uni-app 条件编译）
- `tracing`：分布式追踪（OpenTelemetry 集成）

---

### 3.4 前端应用 [`packages/app`](file:///f:/gexm/packages/app)

#### 3.4.1 概述

- **框架**：uni-app 3.0 + Vue 3.4.21 + Pinia 2.1.7
- **多端构建**：H5、微信/支付宝/百度/抖音小程序、App、鸿蒙小程序、鸿蒙 App
- **入口**：[`src/main.js`](file:///f:/gexm/packages/app/src/main.js)（createSSRApp，SSR 兼容）

#### 3.4.2 应用初始化（[`src/App.vue`](file:///f:/gexm/packages/app/src/App.vue)）

`onLaunch` 流程：
1. `appStore.initApp()`：应用初始化
2. `userStore.initFromStorage()`：从本地存储恢复用户状态
3. `errorMonitor.init()`：错误监控初始化
4. `initRouterGuard()`：注册路由守卫（navigateTo/redirectTo/reLaunch/switchTab 拦截器）
5. 已登录用户初始化聊天 WebSocket

路由守卫逻辑：
- 白名单页面直接放行
- `/subPackages/admin` 路径需登录 + 管理员角色
- 认证页面需登录，否则重定向

#### 3.4.3 目录结构

| 目录 | 内容 | 数量 |
| --- | --- | --- |
| `src/api/` | API 请求模块（auth, cart, chat, food, order, payment, ride 等） | 36 个 |
| `src/components/` | gexm- 前缀组件（gexm-button, gexm-card, gexm-chat-input, gexm-product-card, gexm-sku-selector, gexm-tab-bar 等） | 24+ 个 |
| `src/store/` | Pinia stores（address, app, cart, category, chat, checkin, comment, coupon, favorite, flashSale, inbox, member, notification, order, product, review, search, user） | 19 个 |
| `src/pages/` | 主包页面（index, category, cart, profile, login, register, product, about） | 8 个 |
| `src/subPackages/` | 分包（admin, content, social, user） | 4 个 |
| `src/platform/` | 平台能力（clipboard, error, image, info, location, payment, safeArea, share, storage） | 9 个 |
| `src/utils/` | 工具（errorHandler, errorMonitor, responsive, routerGuard, websocket） | 5 个 |

#### 3.4.4 页面配置（[`src/pages.json`](file:///f:/gexm/packages/app/src/pages.json)）

- `easycom`：自动扫描 + 自定义组件映射（`^gexm-(.*)` → `@/components/gexm-$1/index.vue`）
- 主包页面：首页、分类、购物车、我的、登录（含 OAuth 回调/手机登录）、注册、商品详情/列表、关于
- 分包：admin（管理端）、content（业务内容）、social（社交）、user（用户中心）

---

### 3.5 PC 管理后台 [`packages/pc`](file:///f:/gexm/packages/pc)

#### 3.5.1 概述

- **框架**：Vue 3.4.21 + TypeScript + Element Plus 2.6.1 + ECharts 5.5 + Pinia + vue-i18n
- **构建**：Vite 5.1 + terser + gzip + brotliCompress
- **入口**：[`src/main.ts`](file:///f:/gexm/packages/pc/src/main.ts)

#### 3.5.2 应用初始化（[`src/main.ts`](file:///f:/gexm/packages/pc/src/main.ts)）

1. 创建 Vue 应用 + Pinia（含 persistedstate 持久化插件）
2. 注册 i18n（中英双语）
3. 注册 `v-permission` 指令（按钮级权限控制）
4. 从本地存储恢复用户状态
5. 注册路由
6. Element Plus 按需引入（由 unplugin-vue-components 自动注册）
7. 命令式组件样式手动导入（ElMessage/ElMessageBox/ElNotification/ElLoading）
8. 加载 design-tokens.css（CSS 变量主题切换）+ global.scss + accessibility.scss（WCAG 2.1 AA）

#### 3.5.3 路由配置（[`src/router/index.ts`](file:///f:/gexm/packages/pc/src/router/index.ts)）

共 **22 个路由**，含登录/忘记密码/404，以及布局下的子路由：

| 路径 | 名称 | 权限 |
| --- | --- | --- |
| /login | 登录 | 无需认证 |
| /forgot-password | 忘记密码 | 无需认证 |
| /dashboard | 数据看板 | 需认证 |
| /products | 商品管理 | 需认证 |
| /orders | 订单管理 | 需认证 |
| /chat | 消息中心 | 需认证 |
| /profile | 个人中心 | 需认证 |
| /users | 用户管理 | 管理员专属 |
| /reviews | 评论管理 | 需认证 |
| /roles | 角色管理 | 管理员专属 |
| /permissions | 权限管理 | 管理员专属 |
| /audit | 审计日志 | 管理员专属 |
| /categories | 分类管理 | 需认证 |
| /flash-sales | 秒杀管理 | 需认证 |
| /social/feeds | 动态管理 | 需认证 |
| /social/comments | 评论管理 | 需认证 |
| /referral | 分销管理 | 需认证 |
| /inbox | 站内信管理 | 管理员专属 |
| /queue | 消息队列 | 管理员专属 |
| /learning | 学习路径 | 需认证 |
| /achievement | 成就中心 | 需认证 |
| /settings | 系统设置 | 管理员专属 |

路由守卫：未登录重定向 `/login`；管理员路径（/users, /roles, /permissions, /audit, /settings, /queue, /inbox）对非 admin/super_admin 角色重定向 `/dashboard`。

#### 3.5.4 Vite 构建配置（[`vite.config.ts`](file:///f:/gexm/packages/pc/vite.config.ts)）

关键特性：
- **CSP 注入器**：自定义插件 `csp-injector`，开发环境保留 unsafe-inline/unsafe-eval（HMR 需要），生产环境移除所有 unsafe-*
- **Element Plus 按需引入**：AutoImport + Components + ElementPlusResolver
- **压缩**：生产环境 gzip + brotliCompress（threshold 1024，minRatio 0.8）
- **PWA**：VitePWA（仅生产启用），manifest + workbox runtimeCaching（NetworkFirst）
- **分包**：manualChunks 拆分 element-plus / vue / echarts / axios / dayjs / alien-signals / vendors
- **环境变量安全**：仅暴露 `VITE_` 前缀变量（防止敏感信息泄露到浏览器端）
- **Terser 混淆**：生产 drop_console + drop_debugger + toplevel mangle
- **CSS**：scss additionalData 注入 variables.scss；生产 cssnano 压缩

---

### 3.6 桌面端 [`packages/desktop`](file:///f:/gexm/packages/desktop)

#### 3.6.1 概述

- **框架**：Electron 28.2.0 + electron-builder 25
- **appId**：`com.gexm.desktop`
- **内嵌资源**：`extraResources` 从 `../pc/dist` 拷贝到 `app` 目录（即内嵌 PC 管理后台）
- **构建目标**：Windows（NSIS + zip）、macOS（DMG + zip）、Linux（deb + rpm + AppImage + tar.gz）

#### 3.6.2 主进程（[`src/main/index.js`](file:///f:/gexm/packages/desktop/src/main/index.js)）

安全机制：
- **IPC 来源校验**：`validateSender(event)` 校验 `senderFrame.origin`，允许 `file://` / `app://` / `http://localhost:3000` / `http://localhost:5173`，开发环境放宽 localhost，拒绝空 origin（防绕过）
- **secureHandle 包装器**：所有 `ipcMain.handle` 通过 `secureHandle` 包装，自动校验 sender
- **Store key 白名单**：`ALLOWED_STORE_KEYS` 限制可访问的配置键（app.preferences, app.theme, window.bounds 等）
- **路径白名单**：`isPathAllowed()` 限制文件写入在 userData/downloads/temp 目录内
- **URL 协议白名单**：`isSafeExternalUrl()` 仅允许 http/https 协议打开外部链接
- **BrowserWindow 安全**：nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true

功能模块：
- `createMainWindow()`：主窗口（1280×800，最小 960×640）
- `createTray()`：系统托盘（显示/新建窗口/设置/检查更新/关于/退出）
- `createNewWindow()`：多窗口管理
- `setupGlobalShortcuts()`：全局快捷键（Ctrl+Shift+N 新建窗口、Ctrl+Shift+M 显示/隐藏、Ctrl+K 搜索）
- `setupIpcHandlers()`：窗口控制、Store 读写、版本/平台/主题、文件保存、外部链接打开
- `checkForUpdates()`：自动更新（electron-updater）
- `createMenu()`：应用菜单（文件/编辑/视图/窗口/帮助）

#### 3.6.3 Preload 桥接（[`src/preload/index.js`](file:///f:/gexm/packages/desktop/src/preload/index.js)）

通过 `contextBridge.exposeInMainWorld('gexmDesktop', ...)` 暴露安全 API：
- `window`：minimize / maximize / close / new
- `app.store`：get / set / delete（受白名单限制）
- `app`：version / platform / theme / openExternal
- `file`：save
- `on` / `once` / `removeListener`：IPC 监听（频道白名单 + WeakMap 回调映射）
- `updater`：check / download / install / cancel / getInfo / setInterval
- `version`：getCurrent / getInfo / getHistory / getRollbackPoints / rollback

WeakMap 回调映射修复了 `removeListener` 引用不一致问题，避免内存泄漏。

#### 3.6.4 electron-builder 配置

| 平台 | 目标 | 架构 | 安装包 |
| --- | --- | --- | --- |
| Windows | NSIS + zip | x64, ia32 | Gexm-Setup-{version}-{arch}.exe |
| macOS | DMG + zip | x64, arm64 | Gexm-{version}-mac-{arch}.dmg |
| Linux | deb + rpm + AppImage + tar.gz | x64 | Gexm-{version}-linux-{arch}.* |

发布配置：GitHub Releases（owner: gexm-team, repo: gexm-desktop）

---

### 3.7 WordPress 主题与插件 [`wp-content`](file:///f:/gexm/wp-content)

#### 3.7.1 主题 mixm-laal

##### 目录结构

```
wp-content/themes/mixm-laal/
├── functions.php              # 主题函数入口（缓存管理器、资源版本号、购物车会话）
├── style.css                  # 主题样式（带主题头部注释）
├── header.php / footer.php    # 头尾模板
├── index.php / home.php / front-page.php  # 首页模板
├── single.php / page.php / archive.php    # 文章/页面/归档
├── 404.php / comments.php / author.php    # 404/评论/作者
├── category.php / date.php / tag.php      # 分类/日期/标签
├── search.php / content.php / content-none.php / content-page.php / content-search.php
├── forum.php / forum-topic.php            # 论坛
├── community.php                          # 社区
├── bottle.php                             # 漂流瓶
├── crawler.php                            # 采集
├── video.php                              # 视频
├── app.php / app-admin.php                # App 模块
├── api.php / api-test.php                 # API
├── site.php / xinzj.php                   # 站点/新装置
├── archive-mixm_product.php / archive-news_flash.php  # 自定义文章类型归档
├── admin/
│   ├── api-keys.php          # API 密钥管理
│   └── theme-sync.php        # 主题同步
├── assets/
│   ├── css/ (30+ 样式文件)   # api/app/bottle/checkin/community/crawler/forum/payment 等
│   ├── js/ (40+ 脚本文件)    # announcements/api/app/bottle/checkin/commerce/community 等
│   └── images/               # banner/content/favicon
├── css/
│   ├── style.css             # 主样式
│   └── forum-style.css       # 论坛样式
├── fonts/                    # Font Awesome 6（css/js/less/scss/svgs/sprites）
├── images/                   # favicon/placeholder
└── inc/ (70+ PHP 模块)       # 功能模块（见下表）
```

##### inc/ 功能模块

| 类别 | 文件 | 功能 |
| --- | --- | --- |
| API | api-admin.php, api-functions.php, api-security.php | REST API 管理/函数/安全 |
| 文章 | article-features.php, post-pagination.php | 文章特性/分页 |
| 商城 | commerce-admin.php, commerce-functions.php, commerce-helpers.php | 商城管理/函数/辅助 |
| 支付 | payment-gateway.php, hupijiao-payment.php | 支付网关/虎皮椒支付 |
| 优惠券 | coupon-admin.php, coupon-functions.php | 优惠券管理/函数 |
| 会员 | member-admin.php, member-functions.php | 会员管理/函数 |
| 积分 | points-admin.php, points-functions.php | 积分管理/函数 |
| 签到 | checkin-admin.php, checkin-functions.php | 签到管理/函数 |
| 漂流瓶 | bottle-admin.php, bottle-functions.php | 漂流瓶管理/函数 |
| 论坛 | forum-enhancements.php, forum-functions.php | 论坛增强/函数 |
| 视频 | video-admin.php, video-functions.php | 视频管理/函数 |
| 采集 | crawler-admin.php, crawler-functions.php | 采集管理/函数 |
| 站点 | site-admin.php, site-functions.php | 站点管理/函数 |
| 手机 | mobile-admin.php, mobile-functions.php, mobile-login.php | 手机端管理/函数/登录 |
| 社交 | social-functions.php, social-login.php | 社交函数/登录 |
| 分销 | referral-admin.php, referral-functions.php | 分销管理/函数 |
| 打赏 | reward-admin.php, reward-functions.php | 打赏管理/函数 |
| 投票 | poll-admin.php, poll-functions.php | 投票管理/函数 |
| 搜索 | search-box.php | 搜索框 |
| 模板 | template-functions.php | 模板函数 |
| 模块 | module-integration.php, module-loader.php, module-router.php | 模块集成/加载/路由 |
| 插件 | plugin-bridge.php, plugin-modules.php, plugin-roles.php, plugin-shortcodes.php | 插件桥接/模块/角色/短代码 |
| 内容 | content-modules.php, display-conditions.php | 内容模块/显示条件 |
| SEO | seo-optimization.php, custom-seo-support.php, homepage-seo-title.php, seo-feature-toggle.php | SEO 优化/自定义/首页标题/开关 |
| 性能 | lazy-load.php, lazyload-functions.php, webp-support.php, jquery-update.php | 懒加载/WebP/jQuery 更新 |
| 存储 | oss-storage-admin.php, cdn-admin.php | OSS 存储/CDN |
| 国际化 | i18n-admin.php, i18n-functions.php | 国际化管理/函数 |
| 数据库 | db-migrations.php | 数据库迁移 |
| 错误 | error-handler.php | 错误处理 |
| 健康 | health-check.php | 健康检查 |
| 安全 | sensitive-words.txt | 敏感词 |
| 其他 | additional-features.php, announcements-admin.php, baidu-map-ak.php, comment-callback.php, comment-widget-fix.php, github-login.php, header-avatar-menu.php, logistics-functions.php, logo-size-settings.php, meilisearch-admin.php, mixm-laal-support.php, navigation.php, paid-content-admin.php, sample-data.php, sample-data-admin.php, start-websocket.php, themer-framework.php, virtual-card-admin.php, visual-editor.php, webmaster-admin.php, wechat-share-admin.php, websocket-server.php, widget-sorting.php, xinzj-admin.php | 各种附加功能 |

##### functions.php 关键类

**MixM_Laal_Cache**（双层缓存）：
- `get(key, default)`：先查 wp_cache_get，再查 get_transient
- `set(key, value, expiration)`：同时写 wp_cache_set + set_transient
- `delete(key)`：同时删 wp_cache_delete + delete_transient
- `flush()`：批量删除 `_transient_%mixm%` 选项
- `remember(key, callback, expiration)`：缓存不存在时执行回调并缓存

**mixm_laal_get_cart_session_id()**：游客购物车会话（Cookie + Transient，替代 session_start，避免与 WP 缓存插件冲突）

#### 3.7.2 插件 mixm-core

##### 概述

- **描述**：拉阿狸核心整合插件，将现代微服务架构整合到 WordPress，包含打车、外卖、跑腿、商家管理、骑手管理等核心业务
- **入口**：[`mixm-core.php`](file:///f:/gexm/wp-content/plugins/mixm-core/mixm-core.php)
- **数据表**：创建 12 张表（rides, food_orders, errands, drivers, merchants, dishes, merchant_categories, activities, group_buys, group_buy_records, tickets）

##### REST API 控制器（[`includes/api/routes.php`](file:///f:/gexm/wp-content/plugins/mixm-core/includes/api/routes.php)）

注册 8 个 REST 控制器，统一挂载在 `wp-json/mixm-core/v1/` 下：

| 控制器 | 前缀 | 主要路由 |
| --- | --- | --- |
| MixM_Core_Ride_Controller | `/rides` | GET/POST /, GET/PUT/DELETE /{id}, /{id}/accept, /{id}/start-ride, /{id}/complete, /{id}/rate |
| MixM_Core_Food_Controller | `/food` | /orders (CRUD), /merchants, /merchants/{id}/dishes, /orders/{id}/confirm/cook/ready/deliver/complete |
| MixM_Core_Errand_Controller | `/errands` | GET/POST /, GET/PUT/DELETE /{id}, /{id}/accept/pickup/deliver/complete/rate |
| MixM_Core_Driver_Controller | `/drivers` | GET/POST /, GET/PUT /{id} |
| MixM_Core_Merchant_Controller | `/merchants` | 商家管理 |
| MixM_Core_Activity_Controller | `/activities` | 活动管理 |
| MixM_Core_Group_Buy_Controller | `/group-buys` | 拼团管理 |
| MixM_Core_Ticket_Controller | `/tickets` | 工单管理 |

安全机制：
- `mixm_core_rest_nonce_check()`：验证 X-WP-Nonce 或 _wpnonce 参数
- `mixm_core_rest_permission_with_nonce()`：非 GET 请求必须验证 nonce
- `mixm_core_rest_permission_check()`：权限检查

##### 辅助函数（[`includes/functions.php`](file:///f:/gexm/wp-content/plugins/mixm-core/includes/functions.php)）

- `mixm_core_check_permission(capability, object_id)`：权限检查（is_user_logged_in + current_user_can）
- `mixm_core_ajax_permission_denied(message)`：AJAX 权限不足响应（403）
- `mixm_core_generate_random_string(length)`：随机字符串（random_int）
- 订单号生成（随机前缀 + 日期时间，防枚举）

#### 3.7.3 插件 mixm-commerce

- **描述**：拉阿狸网站商城插件，提供商品展示、购物车、订单管理、支付系统集成
- **数据表**：mixm_products, mixm_orders 等
- **支付集成**：支付宝、微信、PayPal、Stripe

#### 3.7.4 插件 mixm-security

- **描述**：拉阿狸网站安全插件，提供登录安全、XSS 防护、SQL 注入防护
- **数据表**：mixm_security_logs（type, message, context, ip, user_agent, request_uri, user_id）
- **默认选项**：login_attempts=5, lockout_duration=900, enable_brute_force=1, enable_xss=1, enable_sql_injection=1
- **核心类**：`class-security-guard.php`

---

### 3.8 部署配置

#### 3.8.1 Docker Compose（[`docker-compose.yml`](file:///f:/gexm/docker-compose.yml)）

5 个服务容器：

| 服务 | 镜像/构建 | 端口 | 资源限制 | 网络 |
| --- | --- | --- | --- | --- |
| server | packages/server/Dockerfile | 3000 | 2 CPU / 2G | backend, db |
| app | packages/app/Dockerfile | 80 | 0.5 CPU / 512M | frontend, backend |
| pc | packages/pc/Dockerfile | 8080 | 0.5 CPU / 512M | frontend, backend |
| redis | redis:7.2-alpine | 6379 | 0.5 CPU / 256M | db |
| postgres | postgres:16-alpine | 5432 | 1 CPU / 1G | db |

安全加固：
- `no-new-privileges:true`
- `cap_drop: ALL` + `cap_add: NET_BIND_SERVICE`
- `tmpfs`：/tmp（noexec, nosuid）
- 健康检查（server: curl /api/health；app/pc: wget /；redis: redis-cli ping；postgres: pg_isready）
- 日志限制（json-file, max-size 50-100m, max-file 3-5）

环境变量（必需）：`POSTGRES_URL`, `JWT_SECRET`, `REDIS_PASSWORD`, `POSTGRES_PASSWORD`

#### 3.8.2 独立基础设施（[`infra/`](file:///f:/gexm/infra)）

| 目录 | 内容 |
| --- | --- |
| `express-api/` | Express API 独立 docker-compose.yml |
| `monitoring/` | Prometheus + AlertManager + Loki + Promtail |
| `mysql/` | MySQL + my.cnf |
| `nginx/` | Nginx + conf.d/gexm.conf |
| `postgres/` | PostgreSQL + postgresql.conf |
| `redis/` | Redis + redis.conf |
| `wordpress/` | WordPress 独立 docker-compose.yml |
| `network.yml` | 共享网络定义（172.20.0.0/16） |

#### 3.8.3 Nginx 配置（[`deploy/nginx/gexm.conf`](file:///f:/gexm/deploy/nginx/gexm.conf)）

- `worker_processes auto`，`worker_rlimit_nofile 65535`
- `events`：10240 连接，multi_accept, epoll
- `server_tokens off`，`autoindex off`
- 速率限制：api_limit 10r/s, auth_limit 1r/s, general_limit 20r/s, conn_limit
- gzip：comp_level 6, min_length 1024, 含 svg+xml
- `client_max_body_size 10m`
- upstream `gexm_backend` → 127.0.0.1:3000（keepalive 64）
- HSTS：max-age=31536000; includeSubDomains

#### 3.8.4 部署脚本（[`deploy/scripts/`](file:///f:/gexm/deploy/scripts)）

| 脚本 | 用途 |
| --- | --- |
| deploy.sh | 部署脚本 |
| gexm.service | systemd 服务文件 |
| health-check.sh | 健康检查 |
| ssl-setup.sh | SSL 证书配置 |

#### 3.8.5 Docker 配置（[`docker/`](file:///f:/gexm/docker)）

| 目录 | 内容 |
| --- | --- |
| `nginx/` | gexm.conf, prod.conf |
| `redis/` | redis.conf |
| `wordpress/` | Dockerfile, apache/Dockerfile, nginx.conf, php.ini, supervisord.conf |

---

## 四、关键类与函数说明

### 4.1 后端关键类

| 类名 | 文件 | 职责 |
| --- | --- | --- |
| `IDbClient` | [models/index.ts](file:///f:/gexm/packages/server/src/models/index.ts) | 数据库客户端接口（同步+异步 API） |
| `SQLiteSyncClient` | 同上 | SQLite 实现（better-sqlite3） |
| `PgSyncClient` | 同上 | PostgreSQL 实现（pg） |
| `App` | [app.ts](file:///f:/gexm/packages/server/src/app.ts) | Express 应用实例（中间件链+路由注册） |
| `Config` | [config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts) | 配置管理（含 getSecretKey/validateKeys） |

### 4.2 后端关键函数

| 函数名 | 文件 | 职责 |
| --- | --- | --- |
| `initDatabase()` | [models/index.ts](file:///f:/gexm/packages/server/src/models/index.ts) | 初始化数据库连接 |
| `createTables()` | 同上 | 创建 50+ 数据表 |
| `initDefaultData()` | 同上 | 初始化管理员/RBAC/示例数据 |
| `getSecretKey()` | [config/index.ts](file:///f:/gexm/packages/server/src/config/index.ts) | 获取密钥（生产强制） |
| `validateKeys()` | 同上 | 密钥强度校验（32+ 字符） |
| `getErrorDetail(code)` | [errorCodes.ts](file:///f:/gexm/packages/server/src/constants/errorCodes.ts) | 错误码详情 |
| `gracefulShutdown(signal)` | [server.ts](file:///f:/gexm/packages/server/src/server.ts) | 优雅关闭（8 步顺序） |

### 4.3 SDK 关键类

| 类名 | 文件 | 职责 |
| --- | --- | --- |
| `GexmSDK` | [index.ts](file:///f:/gexm/packages/sdk/src/index.ts) | SDK 入口静态类 |
| `PlatformFactory` | [platformFactory.ts](file:///f:/gexm/packages/sdk/src/core/platformFactory.ts) | 平台工厂（惰性实例化） |
| `EventBus` | [eventBus.ts](file:///f:/gexm/packages/sdk/src/core/eventBus.ts) | 事件总线 |
| `PluginRegistry` | [pluginRegistry.ts](file:///f:/gexm/packages/sdk/src/core/pluginRegistry.ts) | 插件注册表 |
| `SDKError` | [errorCodes.ts](file:///f:/gexm/packages/sdk/src/core/errorCodes.ts) | SDK 错误类 |

### 4.4 Desktop 关键函数

| 函数名 | 文件 | 职责 |
| --- | --- | --- |
| `validateSender(event)` | [main/index.js](file:///f:/gexm/packages/desktop/src/main/index.js) | IPC 来源校验 |
| `secureHandle(channel, handler)` | 同上 | 安全 IPC 注册包装器 |
| `isSafeExternalUrl(url)` | 同上 | URL 协议白名单校验 |
| `isPathAllowed(filePath)` | 同上 | 文件路径白名单校验 |
| `isStoreKeyAllowed(key)` | 同上 | Store key 白名单校验 |
| `wrapCallback(callback)` | [preload/index.js](file:///f:/gexm/packages/desktop/src/preload/index.js) | WeakMap 回调映射（防内存泄漏） |

### 4.5 WordPress 关键类/函数

| 类/函数名 | 文件 | 职责 |
| --- | --- | --- |
| `MixM_Laal_Cache` | [functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php) | 双层缓存（wp_cache + transient） |
| `mixm_laal_get_cart_session_id()` | 同上 | 游客购物车会话（Cookie+Transient） |
| `mixm_laal_asset_version(path)` | 同上 | 资源版本号（filemtime） |
| `mixm_core_check_permission(cap, id)` | [functions.php](file:///f:/gexm/wp-content/plugins/mixm-core/includes/functions.php) | 权限检查 |
| `mixm_core_rest_nonce_check(req)` | [routes.php](file:///f:/gexm/wp-content/plugins/mixm-core/includes/api/routes.php) | REST API nonce 验证 |
| `mixm_core_register_rest_routes()` | 同上 | 注册 8 个 REST 控制器 |

---

## 五、依赖关系

### 5.1 内部包依赖

```
@gexm/app ──────► @gexm/shared
    │
    └────► @gexm/sdk ──► @gexm/shared

@gexm/pc ────────► @gexm/shared（隐式，通过类型）

@gexm/desktop ───► @gexm/pc（extraResources 拷贝 dist）
    │
    └────► electron / electron-store / electron-updater

@gexm/server ───► @gexm/shared（隐式）
    │
    └────► express / better-sqlite3 / pg / redis / socket.io / langchain / mcp

@gexm/sdk ───────► @gexm/shared
    │
    └────► axios / crypto-js / uuid
```

### 5.2 WordPress 与后端关系

```
WordPress 站点 ◄──── 双向同步 ────► Express 后端
    │                                    │
    ├─ mixm-laal 主题                    ├─ /api/v1/* REST 路由
    │   └─ 13 核心模块                   ├─ Socket.IO 实时
    │       (首页/社交/社区/论坛/商城/    ├─ LangChain AI Agent
    │        视频/站长/漂流瓶/采集/API/   ├─ JWT 双 Token
    │        手机/APP)                    └─ Redis 缓存
    │
    ├─ mixm-core 插件
    │   └─ 8 REST 控制器
    │       (rides/food/errands/drivers/
    │        merchants/activities/
    │        group-buys/tickets)
    │
    ├─ mixm-commerce 插件
    │   └─ 商品/订单/支付（支付宝/微信/PayPal/Stripe）
    │
    └─ mixm-security 插件
        └─ 防暴力破解/XSS/SQL 注入
```

### 5.3 外部核心依赖

| 类别 | 依赖 | 用途 |
| --- | --- | --- |
| Web 框架 | express 4.18 | HTTP 服务 |
| 数据库 | better-sqlite3 12.3, pg 8.22 | SQLite/PostgreSQL |
| 缓存 | redis 4.7 | Redis 客户端 |
| 实时 | socket.io 4.8 | WebSocket |
| 认证 | jsonwebtoken 9.0 | JWT |
| 校验 | zod 3.25 | Schema 校验 |
| AI | langchain 0.3, @langchain/openai | LLM 链 |
| Agent | @modelcontextprotocol/sdk | MCP 协议 |
| 安全 | helmet, cors, express-rate-limit | HTTP 安全 |
| 日志 | winston | 结构化日志 |
| 文档 | swagger-ui-express | API 文档 |
| 前端 | vue 3.4.21, pinia 2.1.7 | 响应式+状态 |
| UI | element-plus 2.6.1 | PC 组件库 |
| 图表 | echarts 5.5 | 数据可视化 |
| 多端 | @dcloudio/uni-app 3.0 | 跨平台编译 |
| 桌面 | electron 28.2.0 | 跨平台桌面 |
| 构建 | vite 5, typescript 6 | 构建+类型 |
| WordPress | PHP 7.4+, WP 6.0+ | CMS |

---

## 六、项目运行方式

### 6.1 环境要求

- **Node.js**：>= 18（见 [package.json](file:///f:/gexm/package.json) `engines`）
- **npm**：包管理器（项目使用 npm workspaces，非 pnpm）
- **PHP**：7.4+（WordPress 部分）
- **Docker**：可选（用于容器化部署）
- **Redis**：可选（默认禁用，通过 `REDIS_ENABLED` 控制）
- **PostgreSQL**：可选（默认 SQLite）

### 6.2 根目录脚本（[package.json](file:///f:/gexm/package.json)）

```bash
# 安装依赖（在根目录执行，自动安装所有 workspace 依赖）
npm install

# 开发（并行启动所有服务）
npm run dev

# 构建
npm run build              # 构建所有
npm run build:server       # 仅后端
npm run build:app-h5       # 仅 H5
npm run build:app-mp-weixin # 仅微信小程序
npm run build:pc           # 仅 PC 管理后台
npm run build:desktop      # 仅桌面端

# 代码检查（必须通过 lint-guarded.js 包装）
npm run lint               # 检查
npm run lint:fix           # 自动修复
npm run lint:force         # 强制绕过锁

# 测试
npm test                   # 运行所有测试

# 类型检查
npm run typecheck
```

### 6.3 后端开发

```bash
cd packages/server

# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 启动生产服务
npm start

# 健康检查
curl http://localhost:3000/api/health
```

**环境变量**（见 [`.env.example`](file:///f:/gexm/packages/server/.env.example)）：
- `PORT`：服务端口（默认 3000）
- `NODE_ENV`：环境
- `DB_TYPE`：sqlite / postgres
- `DB_PATH`：SQLite 路径
- `POSTGRES_URL`：PostgreSQL 连接 URL
- `REDIS_URL`：Redis 连接 URL
- `REDIS_ENABLED`：是否启用 Redis
- `JWT_SECRET` / `JWT_REFRESH_SECRET`：JWT 密钥
- `LOG_LEVEL`：日志级别

### 6.4 前端 App 开发

```bash
cd packages/app

# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# 支付宝小程序开发
npm run dev:mp-alipay

# App 开发
npm run dev:app

# 鸿蒙小程序开发
npm run dev:mp-harmony

# 构建所有平台
npm run build:all
```

### 6.5 PC 管理后台开发

```bash
cd packages/pc

# 开发（默认端口 5174）
npm run dev

# 构建
npm run build

# 预览
npm run preview

# 类型检查
npm run typecheck
```

**代理配置**（见 [vite.config.ts](file:///f:/gexm/packages/pc/vite.config.ts)）：
- `/api` → `http://localhost:3000`

### 6.6 桌面端开发

```bash
cd packages/desktop

# 开发模式（需先启动 PC 管理后台 dev server）
npm run dev

# 打包（不生成安装包）
npm run pack:win    # Windows
npm run pack:mac    # macOS
npm run pack:linux  # Linux

# 构建安装包
npm run build:win
npm run build:mac
npm run build:linux
npm run build:all   # 全平台
```

**开发环境要求**：
- 开发模式下加载 `http://localhost:5173`（PC dev server）
- 生产模式下加载 `process.resourcesPath/app/index.html`（内嵌 PC dist）

### 6.7 Docker 部署

```bash
# 一键启动所有服务（需要设置必需环境变量）
export POSTGRES_URL="postgres://gexm:password@postgres:5432/gexm"
export JWT_SECRET="your-32+char-secret-key"
export REDIS_PASSWORD="your-redis-password"
export POSTGRES_PASSWORD="your-postgres-password"

> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**

# 查看日志

# 健康检查
```

**服务端口**：
- server: 3000
- app (H5): 80
- pc: 8080
- redis: 6379
- postgres: 5432

### 6.8 WordPress 站点

WordPress 文件位于仓库根目录（wp-admin/, wp-includes/, wp-config-sample.php 等），主题/插件位于 [wp-content/](file:///f:/gexm/wp-content)。

通过 Docker 部署见 [`docker/wordpress/Dockerfile`](file:///f:/gexm/docker/wordpress/Dockerfile) 或 [`infra/wordpress/docker-compose.yml`](file:///f:/gexm/infra/wordpress/docker-compose.yml)。

---

## 七、API 接口概览

### 7.1 Express 后端 API

**基础 URL**：`/api/v1`

详见 [3.1.3 路由注册](#313-路由注册-srcroutesindextspackages-server-srcroutesindexts) 章节，共 40+ 路由模块。

**通用响应格式**（`ApiResponse<T>`）：
```typescript
{
  code: number;        // 业务码（0 成功，非 0 失败）
  message: string;     // 消息
  data: T;             // 数据
  timestamp: number;   // 时间戳
  requestId: string;   // 请求 ID
}
```

**分页响应格式**（`PaginatedResponse<T>`）：
```typescript
{
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

**认证**：JWT Bearer Token（`Authorization: Bearer <accessToken>`），支持 Refresh Token 续期。

### 7.2 WordPress REST API

**基础 URL**：`/wp-json/mixm-core/v1/`

| 控制器 | 路径前缀 | 方法 |
| --- | --- | --- |
| Ride | `/rides` | GET/POST/PUT/DELETE, accept/start-ride/complete/rate |
| Food | `/food/orders`, `/food/merchants` | CRUD + confirm/cook/ready/deliver/complete |
| Errand | `/errands` | CRUD + accept/pickup/deliver/complete/rate |
| Driver | `/drivers` | GET/POST/PUT |
| Merchant | `/merchants` | 商家管理 |
| Activity | `/activities` | 活动管理 |
| Group Buy | `/group-buys` | 拼团管理 |
| Ticket | `/tickets` | 工单管理 |

**认证**：Nonce（`X-WP-Nonce` 头或 `_wpnonce` 参数），非 GET 请求必须验证。

---

## 八、数据模型

### 8.1 后端数据表（50+）

详见 [3.1.6 数据模型](#316-数据模型-srcmodelsindexts-packages-server-srcmodelsindexts) 章节，按业务分类：
- 用户体系（7 表）
- 社交（7 表）
- 电商（16 表）
- 外卖（3 表）
- 打车（3 表）
- 跑腿（2 表）
- 拼团/秒杀（5 表）
- 会员/积分（4 表）
- 分销（5 表）
- 消息（7 表）
- RBAC（4 表）
- 学习/成就（7+ 表）
- 系统（16 表）

### 8.2 WordPress 数据表

**mixm-core 插件**（12 表）：
- `mixm_ride_orders`：打车订单
- `mixm_food_orders`：外卖订单
- `mixm_errands`：跑腿订单
- `mixm_drivers`：骑手
- `mixm_merchants`：商家
- `mixm_dishes`：菜品
- `mixm_merchant_categories`：商家分类
- `mixm_activities`：活动
- `mixm_group_buys`：拼团活动
- `mixm_group_buy_records`：拼团记录
- `mixm_tickets`：工单

**mixm-commerce 插件**：
- `mixm_products`：商品
- `mixm_orders`：订单

**mixm-security 插件**：
- `mixm_security_logs`：安全日志（type, message, context, ip, user_agent, request_uri, user_id）

### 8.3 共享类型定义

详见 [`packages/shared/src/types/index.ts`](file:///f:/gexm/packages/shared/src/types/index.ts)，涵盖 50+ 业务接口（User, Product, Order, CartItem, Coupon, Payment, Referral, FlashSale 等）。

---

## 九、附录

### 9.1 项目规则

- [`.trae/rules/project_rules.md`](file:///f:/gexm/.trae/rules/project_rules.md)：WordPress 开发主题 UI 和主题网站 UI 规则
- [`.trae/rules/task-scheduling-rules.md`](file:///f:/gexm/.trae/rules/task-scheduling-rules.md)：AI Agent 任务调度与资源管控规则（防止并行 ESLint/build 导致 CPU 飙升）

### 9.2 关键脚本

| 脚本 | 路径 | 用途 |
| --- | --- | --- |
| lint-guarded.js | [scripts/lint-guarded.js](file:///f:/gexm/scripts/lint-guarded.js) | ESLint 文件锁包装器（防止并行执行） |
| monitor-cpu.ps1 | [scripts/monitor-cpu.ps1](file:///f:/gexm/scripts/monitor-cpu.ps1) | CPU 监控（>90% 自动杀 eslint） |
| cleanup-project-root.ps1 | [scripts/cleanup-project-root.ps1](file:///f:/gexm/scripts/cleanup-project-root.ps1) | 项目根目录清理 |
| pre-commit-checks.js | [scripts/pre-commit-checks.js](file:///f:/gexm/scripts/pre-commit-checks.js) | Husky pre-commit 检查 |

### 9.3 文档目录

| 目录 | 内容 |
| --- | --- |
| [docs/wiki/](file:///f:/gexm/docs/wiki) | 20 个拆分的 Code Wiki 章节 |
| [docs/api-docs/](file:///f:/gexm/docs/api-docs) | API 文档 + OpenAPI YAML |
| [docs/architecture/](file:///f:/gexm/docs/architecture) | 架构文档 |
| [docs/design/](file:///f:/gexm/docs/design) | 设计文档（数据库/设计系统） |
| [docs/guides/](file:///f:/gexm/docs/guides) | 开发指南 |
| [docs/plans/](file:///f:/gexm/docs/plans) | 开发计划 |
| [docs/reports/](file:///f:/gexm/docs/reports) | 报告（安全审计/代码审查/性能优化等） |

### 9.4 CI/CD

- [`.github/workflows/ci-cd.yml`](file:///f:/gexm/.github/workflows/ci-cd.yml)：GitHub Actions CI/CD
- `.husky/pre-commit`：提交前检查（lint-staged + commitlint）
- `.husky/commit-msg`：提交消息规范检查

### 9.5 其他子包

除核心 6 个包外，[`packages/`](file:///f:/gexm/packages) 下还包含以下辅助/实验性子包：

| 包名 | 描述 |
| --- | --- |
| `coze-projects` | Coze 项目集成 |
| `daijiatongxcx` | 代驾通小程序 |
| `harmony-app` | 鸿蒙原生应用 |
| `mixmlaal` | MixM Laal 小程序 |
| `mixmlaal-inc` | MixM Laal Inc |
| `order-service` | 订单微服务 |
| `price-compare` | 比价服务 |
| `route-nav` | 路线导航 |
| `user-service` | 用户微服务 |
| `weidangzhenghe` | 围挡整合 |
| `zhinenglux` | 智能路径 |

---

> **文档说明**：本文档基于 2026-07-23 的项目代码实际读取生成，所有引用的文件路径均为真实存在。如需查看拆分版详细章节，请访问 [`docs/wiki/`](file:///f:/gexm/docs/wiki) 目录。
