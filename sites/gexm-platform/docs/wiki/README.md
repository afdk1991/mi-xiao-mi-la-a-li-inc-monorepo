# MixM Laal 全平台应用系统 · Code Wiki 索引

> **仓库根路径**：`f:\gexm`
> **项目代号**：`gexm-platform`（npm workspaces）
> **当前主题版本**：`mxmlaal v 0.0.1- (2025-11-03 14:30:25)`
> **文档生成日期**：2026-07-19
> **License**：MIT（前端/后端）；GPLv2+（WordPress 主题）

---

## 文档导航

本 Wiki 已从单文件 `CODE_WIKI.md` 拆分为模块化文档，位于 `docs/wiki/` 目录下。各章节文件如下：

| 序号 | 文档 | 主题 |
| --- | --- | --- |
| 01 | [01-overview.md](file:///f:/gexm/docs/wiki/01-overview.md) | 项目概览（定位、技术栈、版本信息） |
| 02 | [02-architecture.md](file:///f:/gexm/docs/wiki/02-architecture.md) | 整体架构图（含文字版架构图、模块关系、数据流向） |
| 03 | [03-directory-structure.md](file:///f:/gexm/docs/wiki/03-directory-structure.md) | 目录结构总览（完整树形结构） |
| 04 | [04-core-modules.md](file:///f:/gexm/docs/wiki/04-core-modules.md) | 核心模块职责（各包职责清单） |
| 05 | [05-wordpress-theme.md](file:///f:/gexm/docs/wiki/05-wordpress-theme.md) | WordPress 主题模块（mixm-laal 13 模块详解） |
| 06 | [06-server-backend.md](file:///f:/gexm/docs/wiki/06-server-backend.md) | Express 后端（路由、中间件、Model、配置） |
| 07 | [07-pc-admin.md](file:///f:/gexm/docs/wiki/07-pc-admin.md) | PC 管理后台（views、router、store、i18n、API） |
| 08 | [08-app-multi-platform.md](file:///f:/gexm/docs/wiki/08-app-multi-platform.md) | 多端 App（uni-app 多端构建、平台适配器、pages.json） |
| 09 | [09-sdk-adapters.md](file:///f:/gexm/docs/wiki/09-sdk-adapters.md) | 跨平台 SDK（9 个 Adapter、PluginRegistry、EventBus） |
| 10 | [10-shared-desktop.md](file:///f:/gexm/docs/wiki/10-shared-desktop.md) | 共享包与桌面端（shared 类型、Electron） |
| 11 | [11-key-classes-functions.md](file:///f:/gexm/docs/wiki/11-key-classes-functions.md) | 关键类与函数说明 |
| 12 | [12-dependencies.md](file:///f:/gexm/docs/wiki/12-dependencies.md) | 依赖关系图（包间依赖、外部依赖） |
| 13 | [13-data-flow.md](file:///f:/gexm/docs/wiki/13-data-flow.md) | 数据流与运行时序（请求生命周期、JWT、支付回调） |
| 14 | [14-deployment.md](file:///f:/gexm/docs/wiki/14-deployment.md) | 部署与运行方式（Docker Compose、Nginx、systemd） |
| 15 | [15-configuration.md](file:///f:/gexm/docs/wiki/15-configuration.md) | 配置与环境变量（.env 完整清单） |
| 16 | [16-security.md](file:///f:/gexm/docs/wiki/16-security.md) | 安全规范（CSRF/XSS/SQL 注入/速率限制） |
| 17 | [17-testing.md](file:///f:/gexm/docs/wiki/17-testing.md) | 测试体系（Jest 30、Vitest 4、Playwright） |
| 18 | [18-subprojects.md](file:///f:/gexm/docs/wiki/18-subprojects.md) | 其它子项目（归档项目清单） |
| 19 | [19-command-reference.md](file:///f:/gexm/docs/wiki/19-command-reference.md) | 命令速查（npm scripts、Docker、调试） |
| 20 | [20-development-guide.md](file:///f:/gexm/docs/wiki/20-development-guide.md) | 开发指南（环境搭建、调试、ESLint、提交规范） |

---

## 项目概览

**MixM Laal** 是一个由 WordPress 主题、Express API、Vue3 PC 后台、uni-app 多端 App、Electron 桌面端、跨平台 SDK 共同组成的「全平台应用系统」，目标是「统一用户体验和功能一致性」。

### 技术栈速览

| 层级 | 技术选型 |
| --- | --- |
| 主题层 | PHP 8.0+ / WordPress 6.2+ / mixm-laal 主题（13 模块） |
| 后端 | Node.js 18+ / TypeScript 5 / Express 4 / Socket.IO 4 |
| 数据持久层 | SQLite（默认/测试） + PostgreSQL 16（生产） + Redis 7（可选） |
| PC 后台 | Vue 3.4 + TypeScript + Element Plus 2.6 + Pinia 2 + ECharts 5 + Vue Router 4 |
| 多端 App | uni-app 3.0（H5 / 微信、支付宝、百度、抖音小程序 / App / 鸿蒙） |
| 桌面端 | Electron 28 |
| SDK | 自研跨平台适配器（9 个平台 Adapter） |
| AI Agent | LangChain 0.3 + MCP SDK 1.29 + OpenAI |
| 网关 | Nginx（统一 `/api/wp/` → WordPress、`/api/app/` → Express） |
| 容器化 | Docker Compose（独立 Compose + 共享网络 + `.env` 统一管理） |

### 核心模块

- **mixm-laal 主题**：`wp-content/themes/mixm-laal/`
- **@gexm/server**：`packages/server/`（40+ 路由模块）
- **@gexm/pc**：`packages/pc/`（Vue3 PC 后台）
- **@gexm/app**：`packages/app/`（uni-app 多端应用）
- **@gexm/sdk**：`packages/sdk/`（9 个平台适配器）
- **@gexm/shared**：`packages/shared/`（共享类型与工具）
- **@gexm/desktop**：`packages/desktop/`（Electron 28 桌面端）

### 快速命令

```bash
npm run dev              # 后端 + H5（并行）
npm run dev:all          # 后端 + H5 + 桌面端
npm --workspace @gexm/pc run dev  # PC 后台
npm run build:server     # 后端构建
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**
```

详见 [19-command-reference.md](file:///f:/gexm/docs/wiki/19-command-reference.md)。

---

## 文档维护说明

- 本 Wiki 基于代码仓库截至 **2026-07-19** 的快照生成
- 如发现与实际代码不一致，请以代码为准并同步更新对应章节
- 主流程模块（`server`/`pc`/`app`/`desktop`/`sdk`/`shared`）的变更需在对应章节同步
- 归档子项目（`mixmlaal`/`mixmlaal-inc` 等）变更无需同步

## 参考文档

仓库内已有的详细文档（位于 `docs/` 与根目录）：

- [docs/architecture.md](file:///f:/gexm/docs/architecture.md)
- [docs/architecture-overview.md](file:///f:/gexm/docs/architecture-overview.md)
- [docs/api-documentation.md](file:///f:/gexm/docs/api-documentation.md)
- [docs/api-openapi.yaml](file:///f:/gexm/docs/api-openapi.yaml)
- [docs/database-design.md](file:///f:/gexm/docs/database-design.md)
- [docs/deployment-guide.md](file:///f:/gexm/docs/deployment-guide.md)
- [docs/security-audit.md](file:///f:/gexm/docs/security-audit.md)
- [docs/modules-backend.md](file:///f:/gexm/docs/modules-backend.md)
- [docs/modules-frontend.md](file:///f:/gexm/docs/modules-frontend.md)
- [docs/ops-monitoring.md](file:///f:/gexm/docs/ops-monitoring.md)
- [docs/test-report.md](file:///f:/gexm/docs/test-report.md)
- [系统架构设计.md](file:///f:/gexm/系统架构设计.md)
- [需求规格说明书.md](file:///f:/gexm/需求规格说明书.md)
- [技术决策备忘录.md](file:///f:/gexm/技术决策备忘录.md)
