# 第 20 章 开发指南

> 本章面向 gexm-platform 仓库的所有开发者（前端 / 后端 / WordPress 主题 / 桌面端 / SDK），统一描述本地开发环境搭建、调试技巧、ESLint 规则、Git 提交规范、分支策略、代码审查、CI/CD 流水线与 Trae CN AI Agent 资源管控规则。任何新成员加入团队应优先阅读本章。

---

## 目录

1. [前置环境要求](#1-前置环境要求)
2. [本地开发环境搭建](#2-本地开发环境搭建)
3. [开发端口规划](#3-开发端口规划)
4. [开发命令速查](#4-开发命令速查)
5. [后端开发调试](#5-后端开发调试)
6. [PC 管理后台调试](#6-pc-管理后台调试)
7. [App 多端调试](#7-app-多端调试)
8. [SDK 与桌面端调试](#8-sdk-与桌面端调试)
9. [WordPress 主题调试](#9-wordpress-主题调试)
10. [ESLint 规则详解](#10-eslint-规则详解)
11. [Prettier 代码格式化](#11-prettier-代码格式化)
12. [lint-guarded.js 并发控制](#12-lint-guardedjs-并发控制)
13. [Git 提交规范](#13-git-提交规范)
14. [分支管理策略](#14-分支管理策略)
15. [代码审查规范](#15-代码审查规范)
16. [CI/CD 流水线](#16-cicd-流水线)
17. [Trae CN AI Agent 资源管控](#17-trae-cn-ai-agent-资源管控)
18. [常见问题排查](#18-常见问题排查)
19. [开发最佳实践](#19-开发最佳实践)

---

## 1. 前置环境要求

### 1.1 必备工具版本

| 工具 | 最低版本 | 推荐版本 | 验证命令 |
| --- | --- | --- | --- |
| Node.js | 18.0.0 | 20.x LTS | `node --version` |
| npm | 9.0.0 | 10.x | `npm --version` |
| Git | 2.30+ | 2.40+ | `git --version` |
| Docker Desktop | 4.20+ | 4.30+（含 WSL2 后端） | `docker --version` |
| Docker Compose | v2.10+ | v2.20+ | `docker compose version` |
| PHP | 8.0+ | 8.2+（WordPress 主题） | `php --version` |
| MySQL | 5.7+ / MariaDB 10.4+ | 8.0+ | `mysql --version` |
| PowerShell | 5.1+ | 7.x（Windows） | `$PSVersionTable.PSVersion` |

### 1.2 引用配置

来源：[file:///f:/gexm/package.json](file:///f:/gexm/package.json) `engines` 字段：

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 1.3 操作系统支持

- **Windows 10/11**：需启用 WSL2 后端运行 Docker Linux 容器（PostgreSQL、Redis 集成测试依赖）
- **macOS 12+**：原生支持 Docker Desktop
- **Ubuntu 22.04+ / Debian 12+**：原生 Linux 环境，推荐用于生产部署

### 1.4 推荐编辑器

| 编辑器 | 用途 | 必装扩展 |
| --- | --- | --- |
| Trae CN | 主编辑器（AI 增强） | ESLint、Prettier、Vue Language Features、TypeScript |
| VS Code | 备用编辑器 | 同上 + WordPress Coding Standards（PHP） |
| PhpStorm | WordPress 主题开发 | PHP 8.2 兼容、WPCS |

---

## 2. 本地开发环境搭建

### 2.1 克隆仓库

```bash
git clone <repo-url> gexm
cd gexm
```

### 2.2 安装依赖

由于使用 npm workspaces monorepo，**仅在根目录执行一次 `npm install`** 即可安装所有子包依赖：

```bash
npm install
```

安装过程会：

1. 读取 [file:///f:/gexm/package.json](file:///f:/gexm/package.json) 的 `workspaces: ["packages/*"]` 配置
2. 将所有 `packages/*` 子目录链接到根 `node_modules/@gexm/*`
3. 应用 `overrides` 字段统一 Vue 3.4.21、pinia 2.1.7、@babel/core 7.29.7、@intlify/* 版本
4. 执行 `allowScripts` 白名单中的原生模块编译（better-sqlite3、electron、esbuild 等）

### 2.3 配置环境变量

复制示例文件并填写真实值：

```bash
cp packages/server/.env.example packages/server/.env
```

关键变量（详见 [file:///f:/gexm/docs/wiki/15-configuration.md](file:///f:/gexm/docs/wiki/15-configuration.md)）：

```bash
# 开发环境可不设置（自动生成临时密钥），生产环境必须设置
JWT_SECRET=
JWT_REFRESH_SECRET=
CSRF_SECRET=
PII_ENCRYPTION_KEY=
PAYMENT_SECRET=

# 数据库
DATABASE_PATH=./data/gexm.db
DB_TYPE=sqlite

# Redis（可选）
REDIS_URL=
```

### 2.4 初始化数据库

后端使用 SQLite（开发默认）或 PostgreSQL（生产）：

```bash
# SQLite（零配置，自动创建）
mkdir -p packages/server/data
# 首次启动服务时自动创建表结构

# PostgreSQL（可选，用于集成测试）
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**
# 等待健康检查通过后执行迁移
npm run migrate --workspace=@gexm/server
```

### 2.5 启动开发服务

```bash
# 同时启动后端 + H5 App
npm run dev

# 同时启动后端 + H5 App + 桌面端
npm run dev:all

# 单独启动各服务
npm run dev:server              # 后端（端口 3000）
npm run dev:app-h5              # App H5（端口 5173）
npm run dev:app-mp-weixin       # App 微信小程序
npm run dev:app-app             # App 原生（HBuilderX）
npm run dev:desktop             # 桌面端
```

### 2.6 启动 WordPress 主题

WordPress 主题开发使用独立 Docker Compose：

```bash
```

主题源码位于 [file:///f:/gexm/wp-content/themes/mixm-laal/](file:///f:/gexm/wp-content/themes/mixm-laal/)，会通过 volume 挂载到 WordPress 容器内。

---

## 3. 开发端口规划

为避免端口冲突，项目统一规划各服务监听端口：

| 服务 | 端口 | 配置位置 | 说明 |
| --- | --- | --- | --- |
| 后端 Express API | 3000 | `packages/server/.env` `PORT` | 主 API 服务 |
| PC 管理后台（Vite dev） | 5174 | `packages/pc/vite.config.ts` `server.port` | Vue 3 + Element Plus |
| App H5（Vite dev） | 5173 | `packages/app/vite.config.js` `server.port` | uni-app H5 |
| WordPress | 8080 | `docker-compose.wp.yml` | WordPress 容器 |
| MySQL | 3306 | `docker-compose.wp.yml` | WordPress 数据库 |
| PostgreSQL | 5432 | `docker-compose.yml` | 主数据库（可选） |
| Redis | 6379 | `docker-compose.yml` | 缓存（可选） |
| Nginx（生产） | 80 / 443 | `infra/nginx/conf.d/gexm.conf` | 反向代理网关 |
| Jaeger UI | 16686 | `docker-compose.yml` | OpenTelemetry 追踪 |
| Prometheus | 9090 | `infra/monitoring/` | 指标采集 |
| Grafana | 3001 | `infra/monitoring/` | 指标可视化 |

> **重要**：开发环境下，App H5 (5173) 与 PC (5174) 通过 Vite proxy 将 `/api` 请求转发至后端 (3000)，因此前端无需配置 CORS。

---

## 4. 开发命令速查

### 4.1 根目录命令（[file:///f:/gexm/package.json](file:///f:/gexm/package.json)）

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动后端 + H5 App |
| `npm run dev:all` | 同时启动后端 + H5 App + 桌面端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run dev:app-h5` | 仅启动 App H5 |
| `npm run dev:app-mp-weixin` | 仅启动 App 微信小程序 |
| `npm run dev:app-app` | 仅启动 App 原生（HBuilderX） |
| `npm run dev:desktop` | 仅启动桌面端 Electron |
| `npm run build:server` | 构建后端 |
| `npm run build:app-h5` | 构建 App H5 |
| `npm run build:app-mp-weixin` | 构建 App 微信小程序 |
| `npm run build:app-app` | 构建 App 原生 |
| `npm run build:desktop` | 构建桌面端安装包 |
| `npm run lint` | 通过 `lint-guarded.js` 运行 ESLint（推荐） |
| `npm run lint:fix` | 自动修复 ESLint 问题 |
| `npm run lint:direct` | 直接调用 `eslint packages/`（绕过文件锁） |
| `npm run lint:force` | 强制运行 lint，忽略已有锁 |
| `npm run format` | Prettier 全量格式化 |
| `npm run format:check` | Prettier 检查（不修改文件） |
| `npm test` | 运行 PC 测试套件 |
| `npm run test:watch` | 监听模式运行 PC 测试 |
| `npm run test:coverage` | 生成 PC 测试覆盖率报告 |
| `npm run preview` | 运行 Playwright 跨平台预览 |
| `npm run preview:pc` | 仅 PC 平台预览 |
| `npm run preview:h5` | 仅 H5 平台预览 |
| `npm run preview:compare` | 视觉回归对比 |
| `npm run preview:baseline` | 创建视觉回归基线 |
| `npm run preview:ci` | CI 环境跨浏览器（chromium/firefox/webkit）E2E |
| `npm run preview:gallery` | 启动预览图库本地服务（端口 5175） |
| `npm run preview:gallery:generate` | 生成预览图库 |

### 4.2 Workspace 命令

```bash
# 后端
npm run build --workspace=@gexm/server
npm run dev --workspace=@gexm/server
npm test --workspace=@gexm/server
npm run typecheck --workspace=@gexm/server

# PC
npm run build --workspace=@gexm/pc
npm run dev --workspace=@gexm/pc

# App
npm run build:h5 --workspace=@gexm/app
npm run build:mp-weixin --workspace=@gexm/app
npm run build:app --workspace=@gexm/app

# SDK
npm run build --workspace=@gexm/sdk
npm test --workspace=@gexm/sdk
```

---

## 5. 后端开发调试

### 5.1 启动开发服务器

后端使用 `nodemon` 监听 `src/**/*.ts` 文件变化自动重启：

```bash
npm run dev:server
```

配置文件：[file:///f:/gexm/packages/server/nodemon.json](file:///f:/gexm/packages/server/nodemon.json)

```json
{
  "watch": ["src/**/*.ts"],
  "ignore": ["node_modules", "data", "uploads", "logs"],
  "ext": "ts",
  "exec": "npx ts-node src/server.ts",
  "delay": 500,
  "env": {
    "NODE_ENV": "development"
  },
  "signal": "SIGTERM"
}
```

### 5.2 VS Code / Trae CN 调试

在 `.vscode/launch.json` 中添加调试配置（IDE 内 F5 启动）：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server (ts-node)",
      "type": "node",
      "request": "launch",
      "runtimeArgs": ["-r", "ts-node/register", "src/server.ts"],
      "cwd": "${workspaceFolder}/packages/server",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3000"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### 5.3 Inspector 协议调试

启动带 Inspector 的 Node 进程：

```bash
# 在 packages/server 目录
node --inspect=0.0.0.0:9229 -r ts-node/register src/server.ts
```

Chrome 浏览器访问 `chrome://inspect`，点击 "inspect" 即可断点调试。

### 5.4 数据库调试

#### SQLite CLI

```bash
# 进入 SQLite 交互式命令行
sqlite3 packages/server/data/gexm.db

# 常用命令
.tables                          # 列出所有表
.schema users                    # 查看 users 表结构
SELECT * FROM users LIMIT 10;    # 查询数据
.quit                            # 退出
```

#### PostgreSQL CLI

```bash
# 通过 Docker 进入 psql

# 常用命令
\dt                              # 列出所有表
\d users                         # 查看 users 表结构
SELECT * FROM users LIMIT 10;
\q                               # 退出
```

### 5.5 日志查看

后端日志位于 `packages/server/logs/`，使用 winston 按日轮转：

```bash
# 实时查看日志
tail -f packages/server/logs/app.log

# 查看错误日志
tail -f packages/server/logs/error.log

# 通过 Docker 查看
```

### 5.6 Query Monitor

生产环境推荐使用 WordPress 的 Query Monitor 插件查看数据库查询、钩子执行顺序、HTTP 请求等。后端 Express 服务可通过 [file:///f:/gexm/packages/server/src/utils/logger.ts](file:///f:/gexm/packages/server/src/utils/logger.ts) 的 `logger` 工具记录详细调试信息。

---

## 6. PC 管理后台调试

### 6.1 启动开发服务器

```bash
npm run dev --workspace=@gexm/pc
```

Vite 启动后访问 `http://localhost:5174`。

### 6.2 Vite 配置要点

配置文件：[file:///f:/gexm/packages/pc/vite.config.ts](file:///f:/gexm/packages/pc/vite.config.ts)

- **端口**：5174（可通过 `VITE_PORT` 环境变量覆盖）
- **API 代理**：`/api` → `http://localhost:3000`
- **HMR**：热模块替换开启 overlay 错误提示
- **别名**：`@` → `src/`
- **生产构建**：terser 压缩 + gzip + brotli + manualChunks 分包

### 6.3 Vue DevTools

安装 Vue.js devtools 浏览器扩展，可：

- 实时查看组件树
- 检查 Pinia Store 状态
- 路由跳转追踪
- 性能分析

### 6.4 Element Plus 按需引入

PC 后台使用 `unplugin-vue-components` + `unplugin-auto-import` 实现 Element Plus 按需引入，无需手动注册组件：

```typescript
// 自动导入示例（无需手动 import）
<template>
  <el-button type="primary">按钮</el-button>
</template>
```

### 6.5 状态管理调试

Pinia Store 调试通过 Vue DevTools 的 "Pinia" 面板：

- 查看每个 Store 的 state、getters、actions
- 时间旅行调试（Time Travel）
- 持久化状态查看

参考：[file:///f:/gexm/packages/pc/src/store/user.ts](file:///f:/gexm/packages/pc/src/store/user.ts)

---

## 7. App 多端调试

### 7.1 H5 调试

```bash
npm run dev:app-h5
```

访问 `http://localhost:5173`，Chrome DevTools 切换移动设备模式调试。

### 7.2 微信小程序调试

```bash
npm run dev:app-mp-weixin
```

构建产物位于 `packages/app/dist/dev/mp-weixin/`，使用微信开发者工具打开此目录调试。

**重要**：构建后会自动执行 `wechatProjectConfigPatch()` 插件，修复 `project.config.json` 中的 `packNpmManually`、`appid` 等配置。详见 [file:///f:/gexm/packages/app/vite.config.js](file:///f:/gexm/packages/app/vite.config.js)。

### 7.3 支付宝小程序调试

```bash
npm run dev:app-mp-alipay --workspace=@gexm/app
```

使用支付宝小程序开发者工具打开 `packages/app/dist/dev/mp-alipay/` 调试。

### 7.4 字节跳动小程序调试

```bash
npm run dev:app-mp-toutiao --workspace=@gexm/app
```

使用字节跳动小程序开发者工具打开 `packages/app/dist/dev/mp-toutiao/` 调试。

### 7.5 百度小程序调试

```bash
npm run dev:app-mp-baidu --workspace=@gexm/app
```

使用百度小程序开发者工具调试。

### 7.6 App 原生调试

```bash
npm run dev:app-app
```

需安装 HBuilderX，通过 HBuilderX 的真机运行功能调试 iOS / Android。

### 7.7 鸿蒙调试

鸿蒙分两种模式：

- **mp-harmony**（鸿蒙小程序）：使用 DevEco Studio 打开 `packages/app/dist/dev/mp-harmony/`
- **app-harmony**（鸿蒙原生）：详见 [file:///f:/gexm/packages/harmony-app/](file:///f:/gexm/packages/harmony-app/)

### 7.8 条件编译

uni-app 使用条件编译处理多端差异：

```javascript
// #ifdef H5
console.log('仅 H5 平台执行')
// #endif

// #ifdef MP-WEIXIN
console.log('仅微信小程序执行')
// #endif

// #ifndef APP-PLUS
console.log('除 App 原生外的所有平台执行')
// #endif
```

---

## 8. SDK 与桌面端调试

### 8.1 SDK 开发调试

SDK 位于 [file:///f:/gexm/packages/sdk/](file:///f:/gexm/packages/sdk/)，使用 Vite 库模式构建：

```bash
# 开发模式（监听文件变化）
npm run dev --workspace=@gexm/sdk

# 构建（同时输出 es/cjs/umd 三种格式）
npm run build --workspace=@gexm/sdk

# 运行测试
npm test --workspace=@gexm/sdk
```

Vite 配置：[file:///f:/gexm/packages/sdk/vite.config.ts](file:///f:/gexm/packages/sdk/vite.config.ts) 输出 `GexmSDK` 全局变量，外部化 `vue`、`@dcloudio/*`、`electron` 等依赖。

### 8.2 桌面端调试

桌面端位于 [file:///f:/gexm/packages/desktop/](file:///f:/gexm/packages/desktop/)，基于 Electron 28.2.0：

```bash
# 开发模式
npm run dev:desktop

# 构建安装包
npm run build --workspace=@gexm/desktop
npm run build:win --workspace=@gexm/desktop    # Windows
npm run build:mac --workspace=@gexm/desktop    # macOS
npm run build:linux --workspace=@gexm/desktop  # Linux
```

**重要**：桌面端通过 `extraResources` 配置将 PC 构建产物（`../pc/dist`）打包到 `app/` 目录，主进程通过 `BrowserWindow.loadFile` 加载。因此**必须先构建 PC（`npm run build --workspace=@gexm/pc`）再构建桌面端**。

调试 Electron 主进程：在 Electron 应用启动时添加 `--inspect=5858` 参数，然后用 Chrome 访问 `chrome://inspect`。

---

## 9. WordPress 主题调试

### 9.1 启动 WordPress 容器

```bash
```

访问 `http://localhost:8080`，管理后台 `http://localhost:8080/wp-admin/`。

### 9.2 主题调试

主题源码：[file:///f:/gexm/wp-content/themes/mixm-laal/](file:///f:/gexm/wp-content/themes/mixm-laal/)

容器通过 volume 挂载主题目录，修改 PHP 文件即时生效。

### 9.3 开启 WP_DEBUG

在 `wp-config.php` 中添加：

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);   // 写入 /wp-content/debug.log
define('WP_DEBUG_DISPLAY', false); // 不在页面显示错误
```

查看日志：

```bash
tail -f wp-content/debug.log
```

### 9.4 Query Monitor 插件

安装 Query Monitor 插件可查看：

- 数据库查询（含耗时、调用栈）
- PHP 错误与警告
- 钩子执行顺序
- HTTP API 请求
- AJAX 请求
- 资源加载（CSS/JS）

### 9.5 主题同步调试

主题内置 `admin/theme-sync.php`，注册 `mixm_laal_sync_status` AJAX 动作，用于与 Express 后端同步主题配置：

- 前端调试：访问 `wp-admin/admin-ajax.php?action=mixm_laal_sync_status`
- 日志：`wp-content/themes/mixm-laal/logs/`

---

## 10. ESLint 规则详解

### 10.1 配置文件

主配置：[file:///f:/gexm/eslint.config.js](file:///f:/gexm/eslint.config.js)

采用 ESLint 9.x Flat Config 格式，组合三个配置块：

1. **基础配置**：`@eslint/js` recommended + `eslint-plugin-vue` flat/recommended + prettier
2. **JS/Vue 配置**：使用 `vue-eslint-parser`，注入 `uni`、`wx`、`getCurrentPages` 等多端全局变量
3. **TypeScript 配置**：使用 `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` recommended

### 10.2 全局变量声明

为支持 uni-app 多端开发，JS/Vue 配置块声明以下全局变量：

```javascript
languageOptions: {
  globals: {
    ...globals.browser,
    ...globals.node,
    uni: 'readonly',           // uni-app 主对象
    wx: 'readonly',            // 微信小程序
    getCurrentPages: 'readonly',
    uniCloud: 'readonly',
    my: 'readonly',            // 支付宝小程序
    swan: 'readonly',          // 百度小程序
    tt: 'readonly',            // 字节跳动小程序
    plus: 'readonly',          // App 原生
    workbox: 'readonly',       // PWA Service Worker
    importScripts: 'readonly',
  }
}
```

### 10.3 核心规则

#### JS/Vue 规则

| 规则 | 等级 | 说明 |
| --- | --- | --- |
| `prefer-const` | warn | 优先使用 const |
| `no-useless-escape` | warn | 禁止无用转义 |
| `no-console` | warn（允许 warn/error/info） | 禁止 console.log |
| `vue/multi-word-component-names` | off | 允许单词组件名 |
| `vue/no-v-html` | off | 允许 v-html（需自行保证安全） |
| `prettier/prettier` | warn | 与 Prettier 集成 |

#### TypeScript 规则

| 规则 | 等级 | 说明 |
| --- | --- | --- |
| `@typescript-eslint/no-explicit-any` | warn | 警告使用 any |
| `@typescript-eslint/no-unused-vars` | warn | 未使用变量警告（args 以 `_` 开头忽略） |
| `@typescript-eslint/no-namespace` | off | 允许 namespace |
| `@typescript-eslint/no-empty-object-type` | off | 允许空对象类型 |
| `@typescript-eslint/ban-ts-comment` | off | 允许 @ts-ignore |
| `prefer-const` | warn | 优先使用 const |
| `no-console` | warn（允许 warn/error/info） | 禁止 console.log |
| `prettier/prettier` | warn | Prettier 集成 |

### 10.4 忽略文件

```javascript
ignores: [
  'dist/**',
  'node_modules/**',
  '**/dist/**',
  '**/build-output/**',
  '**/electron-output/**',
  '**/out/**',
  '**/*.test.ts',
  '**/__tests__/**',
  '**/tests/**',
  '**/*.test.js',
  '**/generate-chat.js',
  '**/check-db.js',
]
```

### 10.5 执行 ESLint

**推荐方式**（通过包装脚本，含文件锁和缓存）：

```bash
npm run lint              # 检查
npm run lint:fix          # 自动修复
```

**直接方式**（绕过文件锁，不推荐）：

```bash
npm run lint:direct
```

**强制方式**（忽略已有锁，仅用户明确要求时使用）：

```bash
npm run lint:force
```

详细差异见 [§12 lint-guarded.js 并发控制](#12-lint-guardedjs-并发控制)。

---

## 11. Prettier 代码格式化

### 11.1 配置文件

[file:///f:/g:/gexm/.prettierrc](file:///f:/gexm/.prettierrc)

```json
{
  "semi": false,                  // 不使用分号
  "singleQuote": true,            // 单引号
  "tabWidth": 2,                  // 缩进 2 空格
  "useTabs": false,               // 使用空格而非 tab
  "trailingComma": "es5",         // ES5 尾随逗号
  "bracketSpacing": true,         // 对象字面量空格 { foo: 1 }
  "bracketSameLine": false,       // JSX 闭合括号换行
  "arrowParens": "always",        // 箭头函数参数始终加括号
  "printWidth": 100,              // 每行最大 100 字符
  "endOfLine": "auto",            // 自动处理换行符
  "vueIndentScriptAndStyle": false,
  "htmlWhitespaceSensitivity": "ignore",
  "proseWrap": "preserve"
}
```

### 11.2 忽略文件

[file:///f:/gexm/.prettierignore](file:///f:/gexm/.prettierignore) 排除以下内容：

- `dist/`、`build/`、`node_modules/`
- `*.min.js`、`*.min.css`
- `package-lock.json`
- WordPress 核心目录（`wp-admin/`、`wp-includes/`）

### 11.3 执行 Prettier

```bash
# 全量格式化
npm run format

# 仅检查不修改
npm run format:check

# 格式化特定文件
npx prettier --write packages/server/src/server.ts
```

### 11.4 与 ESLint 集成

通过 `eslint-plugin-prettier` + `eslint-config-prettier` 实现：

- `eslint-plugin-prettier`：将 Prettier 错误作为 ESLint 错误显示
- `eslint-config-prettier`：关闭所有与 Prettier 冲突的 ESLint 规则

---

## 12. lint-guarded.js 并发控制

### 12.1 设计背景

历史问题：AI Agent（Trae CN Agent、子 Agent、并行 Agent）同时启动多个 ESLint 进程，消耗 43-44% CPU 及 5.8-12GB 内存，导致系统卡顿。

解决方案：[file:///f:/gexm/scripts/lint-guarded.js](file:///f:/gexm/scripts/lint-guarded.js) 通过文件锁保证全局只有一个 ESLint 实例运行。

### 12.2 工作机制

1. **文件锁**：`.lint.lock` 包含 PID + 启动时间戳
2. **跳过策略**：若已有任务运行，新调用直接返回 0（跳过），输出提示
3. **缓存加速**：启用 `--cache --cache-location .eslintcache`，重复执行跳过未修改文件
4. **僵尸锁清理**：锁文件超过 10 分钟自动清理；持锁进程已退出时自动清理
5. **异常退出处理**：注册 `exit`、`SIGINT`、`SIGTERM`、`uncaughtException` 钩子，确保锁文件释放

### 12.3 用法

```bash
# 推荐：通过 npm script
npm run lint              # 检查
npm run lint:fix          # 自动修复

# 备用：直接调用包装脚本
node scripts/lint-guarded.js
node scripts/lint-guarded.js --fix

# 自定义参数透传给 eslint
node scripts/lint-guarded.js src/ --ext .ts

# 强制绕过锁（仅在用户明确要求"强制 lint"时使用）
LINT_FORCE=1 node scripts/lint-guarded.js
npm run lint:force
```

### 12.4 锁文件结构

`.lint.lock` 示例内容：

```json
{
  "pid": 12345,
  "timestamp": 1784443218000,
  "startedAt": "2026-07-19T12:00:18.000Z",
  "argv": ["--fix"]
}
```

### 12.5 跨平台支持

- **Windows**：通过 `tasklist /FI "PID eq <pid>"` 检查进程存活
- **Unix**：通过 `process.kill(pid, 0)` 探测

---

## 13. Git 提交规范

### 13.1 Commitlint 配置

配置文件：[file:///f:/gexm/commitlint.config.js](file:///f:/gexm/commitlint.config.js)

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // Bug 修复
        'docs',     // 文档更新
        'style',    // 代码格式（不影响功能）
        'refactor', // 重构（既不是新增功能，也不是修复 Bug）
        'perf',     // 性能优化
        'test',     // 测试相关
        'build',    // 构建系统或外部依赖变更
        'ci',       // CI 配置变更
        'chore',    // 杂项（不修改 src 或测试）
        'revert',   // 回退提交
      ],
    ],
  },
}
```

### 13.2 提交信息格式

```
<类型>(<作用域>): <描述>

[可选的详细描述]

[可选的 footer]
```

### 13.3 提交类型说明

| 类型 | 说明 | 示例 |
| --- | --- | --- |
| `feat` | 新功能 | `feat(auth): 添加 OAuth 微信登录` |
| `fix` | Bug 修复 | `fix(cart): 修复购物车数量计算错误` |
| `docs` | 文档更新 | `docs(api): 更新用户接口文档` |
| `style` | 代码格式 | `style: 格式化 server.ts` |
| `refactor` | 重构 | `refactor(order): 重构订单状态机` |
| `perf` | 性能优化 | `perf(db): 添加用户表索引` |
| `test` | 测试 | `test(user): 添加用户服务单元测试` |
| `build` | 构建配置 | `build(docker): 优化 Dockerfile 多阶段构建` |
| `ci` | CI 配置 | `ci(actions): 添加 Node 20 测试矩阵` |
| `chore` | 杂项 | `chore: 升级依赖版本` |
| `revert` | 回退 | `revert: 撤销 feat(auth) 提交` |

### 13.4 提交示例

**简单提交**：

```
feat: 添加 VIP 会员系统
```

**详细提交**：

```
fix(auth): 修复登录页表单验证问题

- 修复用户名验证正则表达式
- 添加密码强度提示
- 优化错误信息显示

Closes #123
```

**带作用域的提交**：

```
feat(payment): 接入支付宝当面付

- 实现 RSA2 签名验证
- 添加订单查询接口
- 支持异步回调通知处理

BREAKING CHANGE: 支付接口返回值结构调整，金额单位从分改为元
```

### 13.5 Git Hooks

#### pre-commit（[file:///f:/gexm/.husky/pre-commit](file:///f:/gexm/.husky/pre-commit)）

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

执行 `lint-staged`，仅对暂存区文件运行 linter。

#### commit-msg（[file:///f:/gexm/.husky/commit-msg](file:///f:/gexm/.husky/commit-msg)）

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

执行 `commitlint`，校验提交信息格式。

### 13.6 lint-staged 配置

配置文件：[file:///f:/gexm/.lintstagedrc.json](file:///f:/gexm/.lintstagedrc.json)

```json
{
  "*.js": ["eslint --fix"],
  "*.ts": ["eslint --fix"],
  "*.vue": ["eslint --fix"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

提交时：

- `.js` / `.ts` / `.vue` 文件 → ESLint 自动修复
- `.json` / `.md` / `.yml` / `.yaml` 文件 → Prettier 格式化

---

## 14. 分支管理策略

完整分支策略见 [file:///f:/gexm/BRANCHING.md](file:///f:/gexm/BRANCHING.md)。以下为核心要点。

### 14.1 主要分支

| 分支名称 | 用途 | 生命周期 |
| --- | --- | --- |
| `main` | 生产环境稳定代码 | 长期 |
| `develop` | 开发集成分支 | 长期 |

### 14.2 支持分支

| 分支类型 | 命名规则 | 用途 |
| --- | --- | --- |
| 功能分支 | `feature/{功能名称}` | 开发新功能 |
| Bug 修复分支 | `fix/{bug描述}` | 修复生产环境 bug |
| 热修复分支 | `hotfix/{修复描述}` | 紧急修复生产环境严重问题 |
| 发布分支 | `release/{版本号}` | 准备新版本发布 |
| 测试分支 | `test/{测试内容}` | 特定测试目的 |

### 14.3 分支命名示例

```bash
feature/vip-system              # VIP 系统功能
feature/responsive-design       # 响应式设计
fix/login-error                 # 登录错误修复
fix/responsive-issue            # 响应式问题修复
hotfix/payment-failure          # 支付失败紧急修复
hotfix/security-vulnerability   # 安全漏洞紧急修复
release/1.0.0                   # 1.0.0 版本发布
release/1.1.0-beta              # 1.1.0 beta 版本
test/performance-test           # 性能测试
test/compatibility-test         # 兼容性测试
```

### 14.4 功能开发流程

```bash
# 1. 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/功能名称

# 2. 开发并提交
git add .
git commit -m "feat: 添加功能描述"

# 3. 推送
git push origin feature/功能名称

# 4. 创建 Pull Request (feature → develop)
# 5. 代码审查通过后合并
# 6. 删除分支
git checkout develop
git branch -d feature/功能名称
git push origin --delete feature/功能名称
```

### 14.5 热修复流程

```bash
# 1. 从 main 创建热修复分支
git checkout main
git pull origin main
git checkout -b hotfix/修复描述

# 2. 修复并提交
git add .
git commit -m "fix: 紧急修复描述"

# 3. 推送
git push origin hotfix/修复描述

# 4. 创建 PR (hotfix → main) 和 (hotfix → develop)
# 5. 先合并到 main，再合并到 develop
# 6. 在 main 上打标签
git checkout main
git tag -a v1.0.1 -m "版本1.0.1热修复"
git push origin v1.0.1
```

### 14.6 版本号规范

遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)：

- **主版本号 (Major)**：不兼容的 API 修改
- **次版本号 (Minor)**：向下兼容的功能性新增
- **修订号 (Patch)**：向下兼容的问题修正

示例：`v1.2.3` → Major=1, Minor=2, Patch=3

---

## 15. 代码审查规范

### 15.1 审查内容

| 维度 | 检查点 |
| --- | --- |
| 代码质量 | 是否清晰、可维护、高效 |
| 功能完整性 | 是否实现了预期功能 |
| 安全性 | 是否存在安全漏洞（XSS、SQL 注入、CSRF 等） |
| 测试覆盖 | 是否有适当的测试覆盖 |
| 文档 | 是否有必要文档说明 |
| 命名规范 | 是否遵循命名规范（snake_case / camelCase / PascalCase） |
| 性能 | 是否存在性能问题（N+1 查询、内存泄漏等） |
| 兼容性 | 是否兼容目标平台（浏览器、Node 版本等） |

### 15.2 审查流程

1. 开发者创建 Pull Request 并分配审查者
2. 审查者在 24 小时内进行初始审查
3. 开发者根据反馈修改
4. 审查者验证修改是否符合要求
5. 审查通过后批准合并

### 15.3 审查标准

- 至少需要 **1 名**审查者批准
- 关键功能或高风险修改需要 **2 名**审查者批准
- 所有评论必须得到解决
- 必须通过所有自动化测试（CI/CD）
- 必须通过 ESLint 检查
- 必须通过 TypeScript 类型检查

### 15.4 Pull Request 模板

```markdown
## 变更描述

[简要描述本次变更内容]

## 变更类型

- [ ] 新功能 (feat)
- [ ] Bug 修复 (fix)
- [ ] 重构 (refactor)
- [ ] 性能优化 (perf)
- [ ] 文档更新 (docs)
- [ ] 测试 (test)
- [ ] 构建/CI (build/ci)
- [ ] 其他 (chore)

## 测试情况

- [ ] 本地测试通过
- [ ] 新增/修改了单元测试
- [ ] CI 测试通过

## 关联 Issue

Closes #[issue-number]

## 检查清单

- [ ] 代码遵循项目编码规范
- [ ] 自审过代码
- [ ] 添加了必要的注释
- [ ] 不引入新的警告
- [ ] 不破坏向后兼容性（或已说明 BREAKING CHANGE）
```

---

## 16. CI/CD 流水线

### 16.1 流水线配置

配置文件：[file:///f:/gexm/.github/workflows/ci-cd.yml](file:///f:/gexm/.github/workflows/ci-cd.yml)

### 16.2 触发条件

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  release:
    types: [created]
```

### 16.3 环境变量

```yaml
env:
  NODE_VERSION: '20'
  CI: true
```

### 16.4 Job 流水线

| Job | 依赖 | 说明 |
| --- | --- | --- |
| `lint` | - | ESLint 检查 |
| `typecheck` | - | TypeScript 类型检查 |
| `test` | lint, typecheck | 运行测试套件 |
| `server-build` | lint, typecheck, test | 构建后端 |
| `app-build` | lint, typecheck, test | 构建前端 |
| `pc-build` | lint, typecheck, test | 构建 PC 管理后台 |
| `docker-build` | server-build, app-build, pc-build | 构建 Docker 镜像 |
| `deploy-staging` | docker-build | 部署到测试环境（仅 develop 分支） |
| `deploy-production` | docker-build | 部署到生产环境（仅 main 分支 / release） |

### 16.5 关键 Job 示例

#### Lint Job

```yaml
lint:
  name: Code Linting
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    - run: npm ci
    - run: npm run lint
```

#### Test Job（带依赖）

```yaml
test:
  name: Run Tests
  runs-on: ubuntu-latest
  needs: [lint, typecheck]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    - run: npm ci
    - run: npm test --workspace=@gexm/server
```

#### Build Job（带产物上传）

```yaml
server-build:
  name: Server Build
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build --workspace=@gexm/server
    - uses: actions/upload-artifact@v4
      with:
        name: server-dist
        path: packages/server/dist/
```

### 16.6 缓存优化

- **npm 缓存**：`actions/setup-node@v4` 的 `cache: 'npm'` 参数自动缓存 `~/.npm`
- **Docker layer 缓存**：使用 `docker/build-push-action` 时启用 `cache-from` 和 `cache-to`
- **ESLint 缓存**：`.eslintcache` 文件提交到仓库，加速重复检查

---

## 17. Trae CN AI Agent 资源管控

### 17.1 规则文件

完整规则见 [file:///f:/gexm/.trae/rules/task-scheduling-rules.md](file:///f:/gexm/.trae/rules/task-scheduling-rules.md)。

### 17.2 强制规则（MUST）

#### 17.2.1 资源密集型任务串行执行

下列任务**严禁并行启动**，必须按顺序执行：

| 任务类型 | 命令示例 | 单次预期耗时 |
| --- | --- | --- |
| ESLint 检查 | `npm run lint` / `npx eslint` / `node scripts/lint-guarded.js` | 5-30s |
| 单元测试 | `npm test` / `npm run test:watch` / `jest` | 10-60s |
| 生产构建 | `npm run build:server` / `npm run build:app-h5` / `vite build` | 30-180s |
| Docker 构建镜像 | `docker build` / `docker compose build` | 60-300s |
| 数据库迁移 | `npm run migrate` / `npx prisma migrate` | 10-60s |
| Playwright E2E | `npm run preview:ci` / `npx playwright test` | 60-600s |

**判定标准**：以上任务在任意时刻全局只允许 1 个实例运行。

#### 17.2.2 ESLint 必须通过 lint-guarded.js 调用

```bash
# 推荐
npm run lint              # 检查
npm run lint:fix          # 自动修复

# 备用
node scripts/lint-guarded.js
node scripts/lint-guarded.js --fix

# 强制绕过锁（仅用户明确要求"强制 lint"时使用）
npm run lint:force
```

#### 17.2.3 并行 Agent 调用 lint 的处理

- **不得**让每个子 Agent 都独立调用 `npm run lint`
- **必须**由主 Agent 在所有子 Agent 完成后，统一调用一次 `npm run lint`
- 子 Agent 需要静态分析结果时，应使用 `Read` / `SearchCodebase` / `Grep` 工具直接读取代码

#### 17.2.4 CPU 占用率门槛

| 当前 CPU 占用 | 允许的操作 |
| --- | --- |
| < 50% | 可启动任意资源密集型任务 |
| 50% - 80% | 可启动 lint / test；**禁止**启动 build / docker build |
| > 80% | **禁止**启动任何新的资源密集型任务；仅允许 Read / Search / Grep |
| > 90% | 触发 `scripts/monitor-cpu.ps1` 自动停止 eslint 进程 |

查询当前 CPU 占用：

```powershell
(Get-CimInstance Win32_Processor).LoadPercentage
```

### 17.3 推荐做法（SHOULD）

#### 17.3.1 优先使用增量检查

- **ESLint 增量缓存**：`npm run lint` 已默认启用 `--cache --cache-location .eslintcache`
- **Jest 增量测试**：使用 `npm run test -- --onlyChanged` 或 `--findRelatedTests <files>`
- **Docker 构建缓存**：Dockerfile 必须使用多阶段构建，将 `COPY package*.json` 与 `RUN npm ci` 分层

#### 17.3.2 任务优先级队列

1. **P0（最高）**：用户当前对话中明确请求的任务
2. **P1**：提交前钩子触发的任务（lint-staged / husky pre-commit）
3. **P2**：背景验证任务（如代码审查后的 lint 验证）
4. **P3（最低）**：定时清理、健康检查、报告生成

#### 17.3.3 长任务后台化

预期耗时 > 30 秒的任务（build / docker build / E2E test），应使用 `blocking: false` 启动，避免阻塞主对话。但**后台任务同样受 17.2.1 串行规则约束**。

### 17.4 禁止行为（MUST NOT）

- ❌ 在同一个 Agent 响应中并行调用 `npm run lint` 多次
- ❌ 在子 Agent 中调用 `npm run lint`（必须由主 Agent 统一调度）
- ❌ 使用 `Start-Job` / `Start-Process` 在后台并行启动多个 lint/test/build
- ❌ 使用 `concurrently` 同时启动多个 npm script（`dev` 例外）
- ❌ 绕过 `lint-guarded.js` 直接调用 `eslint` CLI
- ❌ 在 CPU > 80% 时主动启动新的资源密集型任务

### 17.5 例外场景

以下场景**允许**并行，但必须在响应中明确说明理由：

- `npm run dev` / `npm run dev:all`：开发服务器需要并行启动（前端 + 后端）
- `docker compose up`：同时启动多个容器是 compose 的正常行为
- 用户显式要求"并行执行"且已知会消耗高资源

### 17.6 CPU 监控脚本

[file:///f:/gexm/scripts/monitor-cpu.ps1](file:///f:/gexm/scripts/monitor-cpu.ps1) 后台启动 CPU 监控：

```powershell
# DryRun 模式（仅记录不杀进程）
powershell -ExecutionPolicy Bypass -File f:\gexm\scripts\monitor-cpu.ps1 `
    -IntervalSeconds 30 -AlertThreshold 80 -CriticalThreshold 90 -DryRun `
    -LogPath f:\gexm\logs\cpu-monitor.jsonl
```

日志位置：`f:\gexm\logs\cpu-monitor.jsonl`（JSONL 格式）

查询告警记录：

```powershell
Get-Content f:\gexm\logs\cpu-monitor.jsonl |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Where-Object { $_.level -in @('WARN','CRITICAL') } |
  Select-Object timestamp, cpu_load_pct, message, top_processes |
  Format-Table -AutoSize
```

### 17.7 自动恢复

`monitor-cpu.ps1` 在非 DryRun 模式下，CPU >= 90% 时会自动停止 `eslint.exe` 和通过 `node.exe` 启动的 eslint 调用（排除 `lint-guarded.js` 自身和 Trae CN 编辑器进程）。

---

## 18. 常见问题排查

### 18.1 后端启动失败

#### 问题 1：端口 3000 已被占用

```bash
# 查找占用进程
netstat -ano | findstr :3000
# Windows
taskkill /PID <pid> /F
# Linux/Mac
kill -9 <pid>
```

#### 问题 2：SQLite 数据库文件锁

```bash
# 删除 .db-shm 和 .db-wal 文件
rm packages/server/data/gexm.db-shm
rm packages/server/data/gexm.db-wal
```

#### 问题 3：环境变量未加载

确保 `packages/server/.env` 文件存在且包含必需变量。开发环境可不设置密钥（自动生成临时密钥）。

### 18.2 前端构建失败

#### 问题 1：node_modules 版本冲突

```bash
# 清理并重装
rm -rf node_modules package-lock.json
npm install
```

#### 问题 2：Vue 版本不一致

项目通过 `overrides` 强制统一 Vue 版本为 3.4.21。若子包引入其他 Vue 版本，检查 [file:///f:/gexm/package.json](file:///f:/gexm/package.json) `overrides` 字段是否正确应用。

#### 问题 3：better-sqlite3 编译失败

```bash
# 重新编译原生模块
npm rebuild better-sqlite3
```

### 18.3 ESLint 错误

#### 问题 1：lint-guarded.js 提示已有任务运行

```bash
# 查看锁文件
cat .lint.lock

# 强制执行
npm run lint:force

# 或清理僵尸锁
rm .lint.lock
```

#### 问题 2：TypeScript 类型错误

```bash
# 单独运行类型检查
npm run typecheck --workspace=@gexm/server
```

#### 问题 3：Prettier 与 ESLint 冲突

确保使用 `eslint-config-prettier` 关闭冲突规则，配置见 [file:///f:/gexm/eslint.config.js](file:///f:/gexm/eslint.config.js)。

### 18.4 Git Hooks 失败

#### 问题 1：commit-msg 校验失败

提交信息必须符合 Conventional Commits 格式：

```bash
# 正确示例
git commit -m "feat(auth): 添加微信登录"

# 错误示例
git commit -m "更新代码"  # 缺少类型前缀
```

#### 问题 2：pre-commit lint 失败

修复 lint 错误后重新提交：

```bash
npm run lint:fix
git add .
git commit -m "..."
```

#### 问题 3：跳过 Hooks（紧急情况）

```bash
# 仅跳过 pre-commit（不推荐）
git commit --no-verify -m "..."

# 注意：CI 流水线仍会运行 lint，建议本地修复
```

### 18.5 Docker 容器问题

#### 问题 1：容器无法启动

```bash
# 查看容器日志

# 查看容器状态
```

#### 问题 2：端口冲突

修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  server:
    ports:
      - "3001:3000"  # 改为 3001 映射
```

#### 问题 3：WSL2 未启用

Windows 用户需启用 WSL2 后端：

```powershell
wsl --install
# 重启 Docker Desktop
```

### 18.6 测试失败

#### 问题 1：测试套件数据污染

所有测试套件必须使用 `DB_PATH=:memory:` 内存数据库，并通过 `maxWorkers: 1` 串行执行。详见 [file:///f:/gexm/docs/wiki/17-testing.md](file:///f:/gexm/docs/wiki/17-testing.md)。

#### 问题 2：测试超时

`NODE_ENV` 必须设置为 `test` 以跳过限流：

```bash
NODE_ENV=test npm test --workspace=@gexm/server
```

#### 问题 3：PgSyncClient 死锁

`PgSyncClient` 使用 `deasync.loopWhile` 会阻塞事件循环，导致 Jest 异步测试死锁。解决：使用 `PgAsyncClient` 或在测试中 mock 数据库。详见 [file:///f:/gexm/docs/wiki/17-testing.md](file:///f:/gexm/docs/wiki/17-testing.md)。

---

## 19. 开发最佳实践

### 19.1 代码组织

1. **单一职责**：每个函数/类只做一件事
2. **模块化**：按功能模块组织代码，避免循环依赖
3. **DRY 原则**：避免重复代码，提取公共逻辑到 `packages/shared/`
4. **YAGNI 原则**：不要过度设计，仅实现当前需要的功能

### 19.2 TypeScript 最佳实践

1. **启用严格模式**：新增模块应使用 `strict: true`（项目当前为渐进式迁移）
2. **避免 any**：使用 `unknown` 或泛型代替 `any`
3. **接口优先**：优先使用 `interface` 而非 `type`
4. **类型导出**：公共类型应导出，便于其他模块引用

### 19.3 Vue 3 最佳实践

1. **Composition API**：使用 `<script setup>` 语法
2. **响应式**：使用 `ref` / `reactive` / `computed`，避免手动解包
3. **组件通信**：优先 `props` + `emits`，复杂场景用 `provide` / `inject`
4. **性能**：大列表用 `v-memo`，昂贵计算用 `computed`

### 19.4 数据库最佳实践

1. **使用预处理语句**：所有 SQL 必须通过 `$wpdb->prepare()`（WordPress）或参数化查询（Express）
2. **索引优化**：频繁查询的字段添加索引
3. **事务处理**：跨表操作使用事务保证一致性
4. **缓存策略**：频繁访问的数据使用 Redis 缓存

### 19.5 安全最佳实践

详见 [file:///f:/gexm/docs/wiki/16-security.md](file:///f:/gexm/docs/wiki/16-security.md)。核心要点：

1. **输入验证**：所有用户输入必须验证（类型、长度、格式）
2. **输出净化**：所有输出必须净化（`esc_html`、`esc_attr`、`esc_url`、`wp_kses_post`）
3. **权限校验**：所有敏感操作必须校验权限（`current_user_can`、JWT middleware）
4. **Nonce 验证**：所有表单/AJAX 必须包含 nonce
5. **密钥管理**：敏感数据加密存储，密钥通过环境变量管理

### 19.6 性能最佳实践

1. **图片优化**：使用 WebP 格式、`loading="lazy"`、预设尺寸避免 CLS
2. **代码分割**：路由级别 code splitting，Vite manualChunks 分包
3. **缓存策略**：HTTP 缓存（ETag、Cache-Control）、CDN、Redis 缓存
4. **数据库优化**：避免 N+1 查询，使用 `WP_Query` 的 `no_found_rows` 参数

### 19.7 文档最佳实践

1. **代码注释**：所有函数/类必须带「功能说明 + 参数类型 + 返回值」注释
2. **复杂逻辑**：复杂逻辑需加行内注释
3. **README**：每个 `packages/*` 子包应有 `README.md`
4. **API 文档**：使用 OpenAPI/Swagger 自动生成 API 文档

### 19.8 提交最佳实践

1. **小而频繁的提交**：每次提交专注于单个功能或修复
2. **清晰的提交信息**：遵循 Conventional Commits 格式
3. **及时处理 PR**：避免 PR 长时间未处理
4. **遵循流程**：严格按照分支管理流程操作

### 19.9 调试最佳实践

1. **断点调试**：使用 IDE 断点而非 `console.log`
2. **日志分级**：使用 `logger.debug` / `logger.info` / `logger.warn` / `logger.error`
3. **Query Monitor**：WordPress 开发必装 Query Monitor 插件
4. **Vue DevTools**：前端开发必装 Vue DevTools 浏览器扩展

### 19.10 AI Agent 协作最佳实践

1. **资源管控**：严格遵守 [§17 Trae CN AI Agent 资源管控](#17-trae-cn-ai-agent-资源管控) 规则
2. **任务串行**：lint / test / build 必须串行执行
3. **主 Agent 统一调度**：子 Agent 不独立调用 lint，由主 Agent 统一调度
4. **CPU 监控**：高负载时启动 `monitor-cpu.ps1` 监控
5. **工具优先级**：使用 `Read` / `SearchCodebase` / `Grep` 工具直接读取代码，而非通过 ESLint

---

## 参考文档

- [file:///f:/gexm/BRANCHING.md](file:///f:/gexm/BRANCHING.md) - 分支管理策略完整版
- [file:///f:/gexm/CONTRIBUTING.md](file:///f:/gexm/CONTRIBUTING.md) - 贡献指南
- [file:///f:/gexm/CODE_OF_CONDUCT.md](file:///f:/gexm/CODE_OF_CONDUCT.md) - 行为准则
- [file:///f:/gexm/.trae/rules/project_rules.md](file:///f:/gexm/.trae/rules/project_rules.md) - 项目规则
- [file:///f:/gexm/.trae/rules/task-scheduling-rules.md](file:///f:/gexm/.trae/rules/task-scheduling-rules.md) - AI Agent 任务调度规则
- [file:///f:/gexm/docs/wiki/15-configuration.md](file:///f:/gexm/docs/wiki/15-configuration.md) - 配置说明
- [file:///f:/gexm/docs/wiki/16-security.md](file:///f:/gexm/docs/wiki/16-security.md) - 安全规范
- [file:///f:/gexm/docs/wiki/17-testing.md](file:///f:/gexm/docs/wiki/17-testing.md) - 测试体系
- [file:///f:/gexm/docs/wiki/19-command-reference.md](file:///f:/gexm/docs/wiki/19-command-reference.md) - 命令速查
