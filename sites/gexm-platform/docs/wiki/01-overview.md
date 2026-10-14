# 01 · 项目概览

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 1.1 一句话定位

**MixM Laal** 是一个由 WordPress 主题、Express API、Vue3 PC 后台、uni-app 多端 App、Electron 桌面端、跨平台 SDK 共同组成的「全平台应用系统」，目标是「统一用户体验和功能一致性」。

## 1.2 项目基本信息

| 字段 | 值 |
| --- | --- |
| 仓库根路径 | `f:\gexm` |
| 项目代号 | `gexm-platform`（npm workspaces） |
| 当前主题版本 | `mxmlaal v 0.0.1- (2025-11-03 14:30:25)` |
| 文档生成日期 | 2026-07-19 |
| License | MIT（前端/后端）；GPLv2+（WordPress 主题） |
| Node.js 要求 | ≥ 18.0.0 |
| npm 要求 | ≥ 9.0.0 |
| PHP 要求 | ≥ 8.0 |
| WordPress 要求 | ≥ 6.2 |

## 1.3 技术栈一览

| 层级 | 技术选型 |
| --- | --- |
| 主题层 | PHP 8.0+ / WordPress 6.2+ / mixm-laal 主题（13 模块） |
| 后端 | Node.js 18+ / TypeScript 5 / Express 4 / Socket.IO 4 |
| 数据持久层 | SQLite（默认/测试） + PostgreSQL 16（生产） + Redis 7（可选缓存） |
| PC 后台 | Vue 3.4.21 + TypeScript + Element Plus 2.6 + Pinia 2.1.7 + ECharts 5.5 + Vue Router 4.3 |
| 多端 App | uni-app 3.0（H5 / 微信、支付宝、百度、抖音小程序 / App / 鸿蒙） |
| 桌面端 | Electron 28 |
| SDK | 自研跨平台适配器（9 个平台 Adapter） |
| AI Agent | LangChain 0.3 + MCP SDK 1.29 + OpenAI |
| 网关 | Nginx（统一 `/api/wp/` → WordPress、`/api/app/` → Express） |
| 容器化 | Docker Compose（独立 Compose + 共享网络 + `.env` 统一管理） |
| 可观测 | Winston 日志 / OpenTelemetry + Jaeger / Prometheus 指标 |
| 服务发现 | Consul（可选，默认环境变量静态实例回退） |
| 支付 | 支付宝（RSA2） / 微信支付（HMAC-SHA256） / PayPal / Stripe |
| OAuth | 微信 / QQ / 微博 / 支付宝 / Google / Facebook / Twitter |

## 1.4 核心特性

- **跨端一致性**：通过 `@gexm/sdk` 提供 9 个平台适配器，统一 network/storage/crypto/log/terminal 接口
- **API 双栈**：WordPress REST API（内容/电商/社区）+ Express REST API（业务/订单/社交/AI）
- **多数据库支持**：通过 `sqlDialect.ts` 适配 SQLite/PostgreSQL 方言差异；`PgSyncClient` 用 `deasync` 提供同步接口；`IAsyncDbClient` 为新代码提供异步接口
- **安全合规**：Helmet / CORS / CSRF / XSS 过滤 / 数据脱敏 / IP 白名单 / 速率限制 / 密钥强度校验 / PII 加密
- **可观测性**：TraceId 通过 `X-Trace-Id` 响应头传播，全链路日志关联
- **优雅停机**：`gracefulShutdown` 顺序关闭 HTTP → WebSocket → 备份 → 监控 → 定时任务 → 缓存 → 队列 → 数据库

## 1.5 版本与兼容性

### 1.5.1 npm workspaces 配置

参考 [package.json](file:///f:/gexm/package.json)：

```json
{
  "name": "gexm-platform",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "engines": { "node": ">=18.0.0", "npm": ">=9.0.0" }
}
```

### 1.5.2 Vue 版本锁定

通过 `overrides` 字段统一锁定 Vue 全家桶版本：

```json
"overrides": {
  "vue": "3.4.21",
  "pinia": "2.1.7",
  "@vue/server-renderer": "3.4.21",
  "@vue/reactivity": "3.4.21",
  "@vue/runtime-core": "3.4.21"
}
```

### 1.5.3 WordPress 主题版本

- 主题入口：[wp-content/themes/mixm-laal/functions.php](file:///f:/gexm/wp-content/themes/mixm-laal/functions.php)
- 版本 1.0.0 (2025-11-03)：完成 13 个核心功能模块、支付系统、响应式设计
- 版本 0.0.1 (2025-10-31)：初始版本发布，基础框架搭建

## 1.6 主流程 vs 归档子项目

### 主流程包（6 个）

| 包 | 路径 | 说明 |
| --- | --- | --- |
| `@gexm/server` | `packages/server/` | Express + TypeScript 后端 |
| `@gexm/pc` | `packages/pc/` | Vue3 PC 管理后台 |
| `@gexm/app` | `packages/app/` | uni-app 多端应用 |
| `@gexm/sdk` | `packages/sdk/` | 跨平台适配器 SDK |
| `@gexm/shared` | `packages/shared/` | 共享类型与工具 |
| `@gexm/desktop` | `packages/desktop/` | Electron 桌面端 |

### 归档子项目

详见 [18-subprojects.md](file:///f:/gexm/docs/wiki/18-subprojects.md)。包含 `mixmlaal`、`mixmlaal-inc`、`route-nav`、`zhinenglux`、`coze-projects`、`daijiatongxcx`、`omniplex-platform`、`weidangzhenghe`、`harmony-app`、`order-service`、`product-service`、`user-service` 等历史项目。
