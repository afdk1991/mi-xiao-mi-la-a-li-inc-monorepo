# 12. 依赖关系图

> 本章梳理 `gexm-platform` 仓库内部 npm workspaces 包之间的依赖、对外部 npm 包的依赖、版本约束（`overrides` / `engines`）、运行时服务依赖、部署拓扑依赖，以及依赖治理规则。所有路径以 `file:///` 协议给出。

---

## 12.1 npm workspaces 内部依赖

### 12.1.1 依赖图

```
                         ┌─────────────────┐
                         │  @gexm/shared   │
                         │  (类型 + 工具)   │
                         └────────┬────────┘
                                  │
                  file:../shared  │
                                  │
            ┌─────────────────────┴─────────────────────┐
            │                                            │
            ▼                                            ▼
   ┌──────────────────┐                        ┌──────────────────┐
   │  @gexm/server    │                        │  @gexm/app       │
   │  (Express + TS)  │                        │  (uni-app 3.0)   │
   └──────────────────┘                        └──────────────────┘

   @gexm/pc          (无内部依赖，纯前端)
   @gexm/sdk         (无内部依赖，纯适配器层)
   @gexm/desktop     (无内部依赖，独立 Electron 应用，构建时打包 pc/dist)
```

### 12.1.2 内部依赖明细

| 包 | 内部依赖 | 声明方式 |
| --- | --- | --- |
| `@gexm/server` | `@gexm/shared` | `"@gexm/shared": "file:../shared"` |
| `@gexm/app` | `@gexm/shared` | `"@gexm/shared": "file:../shared"` |
| `@gexm/pc` | （无） | — |
| `@gexm/sdk` | （无） | — |
| `@gexm/desktop` | （无 package.json 依赖；构建时通过 `extraResources` 拷贝 `../pc/dist`） | — |
| `@gexm/shared` | （无） | — |

### 12.1.3 跨包代码共享机制

1. **类型共享**：`@gexm/shared/src/types/` 导出跨端类型（如 `UserInfo`、`ApiResponse`、`PlatformType`），server 与 app 共用
2. **工具共享**：`@gexm/shared/src/utils/` 导出 `platform.ts`、`tracing.ts` 等工具函数
3. **SDK 适配器桥接**：`@gexm/desktop` 通过 `@gexm/sdk` 的 `ElectronPlatformAdapter` 复用 PC 端代码
4. **构建产物复用**：`@gexm/desktop` 的 `electron-builder` 配置 `extraResources: [{ from: "../pc/dist", to: "app" }]`，将 PC 构建产物打包到桌面端资源目录

---

## 12.2 各包外部依赖清单

### 12.2.1 根 package.json 关键依赖

**文件**：[package.json](file:///f:/gexm/package.json)

| 类型 | 包 | 版本 | 用途 |
| --- | --- | --- | --- |
| dependencies | `vue` | `3.4.21` | 全局锁定 Vue 版本 |
| devDependencies | `@commitlint/cli` | `^19.8.0` | 提交规范校验 |
| devDependencies | `@commitlint/config-conventional` | `^19.8.0` | Conventional Commits 配置 |
| devDependencies | `@playwright/test` | `^1.61.1` | E2E 测试 |
| devDependencies | `concurrently` | `^9.2.3` | 并行启动多服务 |
| devDependencies | `cross-env` | `^10.1.0` | 跨平台环境变量 |
| devDependencies | `eslint` | `^9.39.4` | Lint（Flat Config） |
| devDependencies | `eslint-plugin-prettier` | `^5.5.6` | Prettier 集成 |
| devDependencies | `eslint-plugin-vue` | `^10.9.2` | Vue 文件 Lint |
| devDependencies | `husky` | `^9.1.7` | Git Hooks |
| devDependencies | `lint-staged` | `^15.5.0` | 暂存区 Lint |
| devDependencies | `prettier` | `^3.8.4` | 代码格式化 |
| devDependencies | `typescript` | `^6.0.3` | TypeScript 编译 |
| devDependencies | `vue-eslint-parser` | `^10.4.1` | Vue SFC 解析 |

### 12.2.2 版本统一约束（overrides）

为避免 workspaces 中不同包引入不兼容版本，根 `package.json` 通过 `overrides` 字段强制统一关键依赖版本：

```json
{
  "overrides": {
    "vue": "3.4.21",
    "pinia": "2.1.7",
    "@vue/server-renderer": "3.4.21",
    "@vue/reactivity": "3.4.21",
    "@vue/runtime-core": "3.4.21",
    "@vue/runtime-dom": "3.4.21",
    "@vue/compiler-sfc": "3.4.21",
    "@vue/compiler-dom": "3.4.21",
    "@vue/shared": "3.4.21",
    "@babel/core": "7.29.7",
    "@eslint/plugin-kit": "0.3.4",
    "@intlify/core-base": "^9.14.5",
    "@intlify/message-resolver": "^9.14.5",
    "@intlify/message-compiler": "^9.14.5",
    "@intlify/runtime": "^9.14.5"
  }
}
```

**意义**：
- Vue 3.4.21 锁定：避免子包（PC、App、SDK）的 peerDependency 解析到 3.5+ 引入破坏性变更
- `@babel/core` 统一：uni-app 与 PC 都依赖 Babel，统一到 7.29.7 避免重复加载
- `@intlify/*` 统一：vue-i18n 内部依赖统一，避免 i18n 实例冲突

### 12.2.3 engines 约束

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

Node 18+ 用于支持：原生 `fetch`、`crypto.randomUUID()`、`AbortSignal.timeout()` 等现代 API。

### 12.2.4 @gexm/server 外部依赖

**文件**：[packages/server/package.json](file:///f:/gexm/packages/server/package.json)

#### dependencies（运行时）

| 包 | 版本 | 用途 |
| --- | --- | --- |
| `express` | `^4.18.3` | Web 框架 |
| `socket.io` | `^4.8.3` | WebSocket 实时通信 |
| `better-sqlite3` | `^12.3.0` | SQLite 同步驱动 |
| `pg` | `^8.22.0` | PostgreSQL 异步驱动 |
| `@types/pg` | `^8.20.0` | PG 类型 |
| `deasync` | `^0.1.31` | 同步阻塞包装（PgSyncClient 用） |
| `redis` | `^4.7.1` | Redis 客户端 |
| `jsonwebtoken` | `^9.0.2` | JWT |
| `bcryptjs` | `^2.4.3` | 密码哈希 |
| `helmet` | `^7.1.0` | HTTP 安全头 |
| `cors` | `^2.8.5` | CORS |
| `compression` | `^1.7.4` | Gzip 压缩 |
| `cookie-parser` | `^1.4.7` | Cookie 解析 |
| `express-rate-limit` | `^7.5.1` | 速率限制 |
| `multer` | `^1.4.5-lts.1` | 文件上传 |
| `xss` | `^1.0.15` | XSS 过滤 |
| `zod` | `^3.25.76` | Schema 校验 |
| `swagger-jsdoc` | `^6.3.0` | OpenAPI 文档生成 |
| `swagger-ui-express` | `^5.0.1` | Swagger UI |
| `winston` | `^3.12.0` | 日志 |
| `winston-daily-rotate-file` | `^5.0.0` | 日志轮转 |
| `uuid` | `^9.0.1` | UUID 生成 |
| `yaml` | `^2.9.0` | YAML 解析 |
| `dotenv` | `^16.4.5` | 环境变量加载 |
| `@langchain/core` | `^0.3.80` | LangChain 核心 |
| `@langchain/openai` | `^0.6.17` | OpenAI 集成 |
| `@langchain/mcp-adapters` | `^0.6.0` | MCP 适配器 |
| `langchain` | `^0.3.37` | LangChain 框架 |
| `@modelcontextprotocol/sdk` | `^1.29.0` | MCP SDK |

#### devDependencies（开发时）

| 包 | 版本 | 用途 |
| --- | --- | --- |
| `typescript` | （根统一） | TypeScript |
| `tsx` | — | TS 脚本执行器（通过 npx） |
| `jest` | `^30.4.2` | 单元测试 |
| `ts-jest` | `^29.4.11` | Jest TS 支持 |
| `supertest` | `^7.2.2` | HTTP 集成测试 |
| `nodemon` | `^3.1.0` | 热重启 |
| `eslint` | `^9.39.4` | Lint |
| `eslint-plugin-security` | `^4.0.1` | 安全规则 |
| `eslint-plugin-unicorn` | `^59.0.1` | 通用规则 |
| `@typescript-eslint/*` | `^8.62.1` | TS ESLint |

### 12.2.5 @gexm/pc 外部依赖

**文件**：[packages/pc/package.json](file:///f:/gexm/packages/pc/package.json)

| 类型 | 包 | 版本 | 用途 |
| --- | --- | --- | --- |
| dependencies | `vue` | `^3.4.21` | 框架 |
| dependencies | `vue-router` | `^4.3.0` | 路由 |
| dependencies | `pinia` | `^2.1.7` | 状态管理 |
| dependencies | `element-plus` | `^2.6.1` | UI 组件库 |
| dependencies | `axios` | `^1.6.7` | HTTP 客户端 |
| dependencies | `echarts` | `^5.5.0` | 图表 |
| dependencies | `vue-i18n` | `^9.13.0` | 国际化 |
| dependencies | `dayjs` | `^1.11.10` | 日期处理 |
| dependencies | `alien-signals` | `^1.0.13` | 响应式增强 |
| devDependencies | `vite` | `^5.1.0` | 构建工具 |
| devDependencies | `@vitejs/plugin-vue` | `^5.0.4` | Vue 插件 |
| devDependencies | `typescript` | `^5.3.3` | TypeScript |
| devDependencies | `vue-tsc` | `^2.2.12` | Vue 类型检查 |
| devDependencies | `vitest` | `^4.1.10` | 单元测试 |
| devDependencies | `@vue/test-utils` | `^2.4.11` | Vue 测试工具 |
| devDependencies | `jsdom` | `^29.1.1` | DOM 模拟 |
| devDependencies | `sass` | `^1.70.0` | SCSS |
| devDependencies | `vite-plugin-compression` | `^0.5.1` | Gzip 压缩 |
| devDependencies | `vite-plugin-pwa` | `^0.20.5` | PWA |
| devDependencies | `rollup-plugin-visualizer` | `^5.14.0` | 包大小可视化 |
| devDependencies | `canvas` | `^3.2.3` | Canvas（验证码测试用） |

### 12.2.6 @gexm/app 外部依赖

**文件**：[packages/app/package.json](file:///f:/gexm/packages/app/package.json)

| 类型 | 包 | 版本 | 用途 |
| --- | --- | --- | --- |
| dependencies | `@dcloudio/uni-app` | `3.0.0-alpha-5020120260706001` | uni-app 框架 |
| dependencies | `@dcloudio/uni-app-plus` | 同上 | App 平台 |
| dependencies | `@dcloudio/uni-h5` | 同上 | H5 平台 |
| dependencies | `@dcloudio/uni-mp-weixin` | 同上 | 微信小程序 |
| dependencies | `@dcloudio/uni-mp-alipay` | 同上 | 支付宝小程序 |
| dependencies | `@dcloudio/uni-mp-baidu` | 同上 | 百度小程序 |
| dependencies | `@dcloudio/uni-mp-toutiao` | 同上 | 抖音小程序 |
| dependencies | `@dcloudio/uni-mp-harmony` | 同上 | 鸿蒙小程序 |
| dependencies | `@dcloudio/uni-app-harmony` | 同上 | 鸿蒙 App |
| dependencies | `@dcloudio/uni-components` | 同上 | 通用组件 |
| dependencies | `vue` | `3.4.21` | Vue |
| dependencies | `vue-router` | `^4.4.4` | 路由 |
| dependencies | `pinia` | `2.1.7` | 状态管理 |
| dependencies | `socket.io-client` | `^4.8.0` | WebSocket 客户端 |
| devDependencies | `vite` | `^5.2.8` | 构建 |
| devDependencies | `@vitejs/plugin-vue` | `^5.0.4` | Vue 插件 |
| devDependencies | `@dcloudio/vite-plugin-uni` | 同上 | uni-app Vite 插件 |
| devDependencies | `sass` | `^1.71.1` | SCSS |
| devDependencies | `vite-plugin-compression` | `^0.5.1` | Gzip 压缩 |
| devDependencies | `@babel/core` | `^7.29.7` | Babel |
| devDependencies | `@babel/preset-env` | `^7.29.7` | Babel 预设 |

### 12.2.7 @gexm/sdk 外部依赖

**文件**：[packages/sdk/package.json](file:///f:/gexm/packages/sdk/package.json)

| 类型 | 包 | 版本 | 用途 |
| --- | --- | --- | --- |
| dependencies | `axios` | `^1.6.0` | HTTP 客户端 |
| dependencies | `crypto-js` | `^4.2.0` | 加解密 |
| dependencies | `uuid` | `^9.0.1` | UUID |
| peerDependencies | `vue` | `^3.3.13` | Vue（peer，由消费方提供） |
| devDependencies | `vite` | `^5.0.12` | 构建 |
| devDependencies | `vite-plugin-dts` | `^3.7.2` | 类型声明生成 |
| devDependencies | `typedoc` | `^0.25.4` | API 文档生成 |
| devDependencies | `typescript` | `^6.0.3` | TypeScript |

### 12.2.8 @gexm/shared 外部依赖

**文件**：[packages/shared/package.json](file:///f:/gexm/packages/shared/package.json)

| 类型 | 包 | 版本 | 用途 |
| --- | --- | --- | --- |
| dependencies | `dayjs` | `^1.11.10` | 日期工具 |
| peerDependencies | `@opentelemetry/api` | `^1.9.0` | OpenTelemetry API |
| peerDependencies | `@opentelemetry/sdk-trace-base` | `^1.25.0` | OTel SDK |
| peerDependencies | `@opentelemetry/sdk-node` | `^0.55.0` | OTel Node SDK |
| peerDependencies | `@opentelemetry/exporter-jaeger` | `^1.25.0` | Jaeger 导出器 |
| peerDependencies | `@opentelemetry/instrumentation-express` | `^0.41.0` | Express instrumentation |
| peerDependencies | `@opentelemetry/instrumentation-http` | `^0.55.0` | HTTP instrumentation |
| devDependencies | `typescript` | `^6.0.3` | TypeScript |
| devDependencies | `style-dictionary` | `^4.0.0` | 设计令牌生成 |

### 12.2.9 @gexm/desktop 外部依赖

**文件**：[packages/desktop/package.json](file:///f:/gexm/packages/desktop/package.json)

| 类型 | 包 | 版本 | 用途 |
| --- | --- | --- | --- |
| dependencies | `electron-store` | `^8.1.0` | 持久化存储 |
| dependencies | `electron-updater` | `^6.1.7` | 自动更新 |
| devDependencies | `electron` | `28.2.0` | Electron 运行时 |
| devDependencies | `electron-builder` | `^25.0.0` | 打包工具 |

---

## 12.3 运行时服务依赖

### 12.3.1 Express Server 运行时依赖

```
Express Server ──┬──→ SQLite (默认) 或 PostgreSQL (生产)
                 ├──→ Redis (可选缓存，REDIS_ENABLED=true 启用)
                 ├──→ Consul (可选服务发现，CONSUL_ENABLED=true 启用)
                 ├──→ Jaeger (可选 Tracing，OTEL_EXPORTER_JAEGER_ENDPOINT 配置后启用)
                 ├──→ WordPress (通过 wp_remote_get 调用 REST API)
                 ├──→ OpenAI (AI Agent，OPENAI_API_KEY 配置后启用)
                 └──→ MCP Server (端口 8080，AGENT_ENABLED=true 时启动)
```

### 12.3.2 WordPress 运行时依赖

```
WordPress ──┬──→ MySQL（独立部署或通过 docker-compose.wp.yml）
            ├──→ 主题 mixm-laal（必需）
            ├──→ wp-content/plugins/（可选插件）
            ├──→ 通过 Nginx 反向代理与 Express 互通
            └──→ 通过 wp_remote_get 调用 Express REST API（如 AI Agent 接口）
```

### 12.3.3 PC 前端运行时依赖

```
@gexm/pc ──┬──→ Express Server (通过 /api/app/ 反向代理)
           ├──→ Element Plus 图标库（CDN 可选）
           └──→ ECharts（打包进 chunk）
```

### 12.3.4 App 运行时依赖

```
@gexm/app ──┬──→ Express Server (H5 通过 /api/app/，小程序直连)
            ├──→ Socket.IO Server（实时聊天、订单状态推送）
            ├──→ 微信开放平台 API（OAuth、支付）
            ├──→ 支付宝开放平台 API（OAuth、支付）
            └──→ @gexm/sdk 平台适配器
```

---

## 12.4 部署拓扑依赖

### 12.4.1 Nginx 网关路由

```
Nginx 网关 (infra/nginx/conf.d/gexm.conf)
  ├── /api/wp/*     → WordPress 容器 (gexm-wp)
  ├── /api/app/*    → Express 容器 (gexm-server)
  ├── /api/health   → Express 健康检查
  ├── /api/payment/notify/wechat  → Express 支付回调（单独 access_log）
  ├── /api/payment/notify/alipay  → Express 支付回调（单独 access_log）
  ├── /              → WordPress 前台
  ├── /wp-admin/     → WordPress 后台
  ├── /wp-content/   → WordPress 静态资源（30 天缓存）
  ├── /uploads/      → WordPress 上传文件（30 天缓存）
  └── *.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)
                    → 静态资源（1 年缓存，immutable）
```

### 12.4.2 Docker Compose 服务依赖

**文件**：[docker-compose.yml](file:///f:/gexm/docker-compose.yml)

```yaml
services:
  server:    # 依赖：postgres, redis（运行时连接）
  app:       # 依赖：server (condition: service_healthy)
  pc:        # 依赖：server (condition: service_healthy)
  redis:     # 依赖：无
  postgres:  # 依赖：无
```

**启动顺序**：`postgres` / `redis` → `server`（等待 healthcheck 通过）→ `app` / `pc`

### 12.4.3 三网络隔离

| 网络 | 子网 | 成员 |
| --- | --- | --- |
| `gexm-frontend` | `172.20.0.0/24` | `app`, `pc` |
| `gexm-backend` | `172.21.0.0/24` | `server`, `app`, `pc` |
| `gexm-db` | `172.22.0.0/24` | `server`, `redis`, `postgres` |

- 前端容器（app/pc）可访问后端（server）但不能直接访问数据库
- 数据库容器（redis/postgres）只与 server 共享网络
- 网络隔离通过 `networks:` 字段声明，Docker Bridge 自动隔离

---

## 12.5 依赖治理规则

### 12.5.1 版本锁定策略

- **生产依赖**：使用 `^` 范围，但根 `package-lock.json` 锁定具体版本
- **peer 依赖**：`@gexm/sdk` 与 `@gexm/shared` 通过 `peerDependencies` 声明，由消费方提供
- **关键依赖统一**：`vue`、`pinia`、`@vue/*`、`@babel/core`、`@intlify/*` 通过根 `overrides` 强制统一
- **Node 引擎**：`engines.node >= 18.0.0`，CI 通过 `volta` 或 `.nvmrc` 锁定具体版本

### 12.5.2 安全审计

```bash
# 全仓库审计
npm audit

# 仅审计生产依赖
npm audit --omit=dev

# 修复可自动修复的漏洞
npm audit fix

# 强制修复（可能引入 breaking change）
npm audit fix --force
```

### 12.5.3 依赖更新策略

- **手动更新**：通过 `npm outdated` 检查可更新包，逐个评估后更新
- **安全更新**：通过 `npm audit fix` 自动修复安全漏洞
- **主版本升级**：需评估 breaking change，单独开 PR + 完整回归测试
- **uni-app 版本**：固定到 `3.0.0-alpha-5020120260706001`，升级需评估所有小程序平台兼容性

### 12.5.4 依赖治理工具

| 工具 | 用途 | 配置文件 |
| --- | --- | --- |
| `eslint-plugin-security` | 检测不安全依赖用法 | [eslint.config.js](file:///f:/gexm/eslint.config.js) |
| `eslint-plugin-unicorn` | 通用最佳实践 | 同上 |
| `lint-staged` | 提交前 Lint | `.lintstagedrc.json` |
| `husky` | Git Hooks | `.husky/` |
| `commitlint` | 提交规范 | [commitlint.config.js](file:///f:/gexm/commitlint.config.js) |

---

## 12.6 微服务（独立子项目）依赖

以下子项目位于 `packages/` 但**不属于主流程**，独立部署：

| 子项目 | 路径 | 依赖说明 |
| --- | --- | --- |
| `order-service` | [packages/order-service/](file:///f:/gexm/packages/order-service/) | 独立订单微服务，通过 HTTP API 与主服务通信 |
| `product-service` | [packages/product-service/](file:///f:/gexm/packages/product-service/) | 独立商品微服务 |
| `user-service` | [packages/user-service/](file:///f:/gexm/packages/user-service/) | 独立用户微服务 |
| `harmony-app` | [packages/harmony-app/](file:///f:/gexm/packages/harmony-app/) | 鸿蒙原生 App（ArkTS） |

详见 [18-subprojects.md](file:///f:/gexm/docs/wiki/18-subprojects.md)。

---

## 12.7 参考文档

- [package.json](file:///f:/gexm/package.json) — 根 workspaces 配置
- [packages/server/package.json](file:///f:/gexm/packages/server/package.json) — 后端依赖
- [packages/pc/package.json](file:///f:/gexm/packages/pc/package.json) — PC 依赖
- [packages/app/package.json](file:///f:/gexm/packages/app/package.json) — App 依赖
- [packages/sdk/package.json](file:///f:/gexm/packages/sdk/package.json) — SDK 依赖
- [packages/shared/package.json](file:///f:/gexm/packages/shared/package.json) — 共享包依赖
- [packages/desktop/package.json](file:///f:/gexm/packages/desktop/package.json) — 桌面端依赖
- [docker-compose.yml](file:///f:/gexm/docker-compose.yml) — Docker 服务编排
- [infra/nginx/conf.d/gexm.conf](file:///f:/gexm/infra/nginx/conf.d/gexm.conf) — Nginx 路由配置
