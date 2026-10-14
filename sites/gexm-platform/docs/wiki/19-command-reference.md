# 19. 命令速查

> 本章汇总 `gexm-platform` 全部常用命令，覆盖开发、构建、代码质量、测试、数据库迁移、预览、Docker、Git Hooks 等场景。所有命令均在仓库根目录 `f:\gexm` 执行（除非另有说明）。

---

## 19.1 开发命令

### 19.1.1 根目录命令

```bash
# 启动后端 + H5（并行）
npm run dev

# 启动全部（后端 + H5 + 桌面端）
npm run dev:all

# 仅后端
npm run dev:server

# 仅 H5
npm run dev:app-h5

# 微信小程序
npm run dev:app-mp-weixin

# App（uni-app plus）
npm run dev:app-app

# 桌面端
npm run dev:desktop

# PC 后台
npm --workspace @gexm/pc run dev
```

### 19.1.2 工作区命令

```bash
# 后端
npm --workspace @gexm/server run dev

# PC
npm --workspace @gexm/pc run dev

# App（H5）
npm --workspace @gexm/app run dev:h5

# App（微信小程序）
npm --workspace @gexm/app run dev:mp-weixin

# App（支付宝小程序）
npm --workspace @gexm/app run dev:mp-alipay

# App（百度小程序）
npm --workspace @gexm/app run dev:mp-baidu

# App（抖音小程序）
npm --workspace @gexm/app run dev:mp-toutiao

# App（鸿蒙小程序）
npm --workspace @gexm/app run dev:mp-harmony

# App（uni-app plus）
npm --workspace @gexm/app run dev:app

# App（鸿蒙 App）
npm --workspace @gexm/app run dev:app-harmony

# 桌面端
npm --workspace @gexm/desktop run dev

# SDK
npm --workspace @gexm/sdk run dev
```

### 19.1.3 端口规划

| 服务 | 命令 | 端口 |
| --- | --- | --- |
| Express Server | `npm run dev:server` | 3000 |
| PC 后台 | `npm --workspace @gexm/pc run dev` | 5173 |
| H5 | `npm run dev:app-h5` | 8080 |
| MCP Server | （随 server 启动） | 8080 |
| 桌面端 | `npm run dev:desktop` | — |
| PostgreSQL | Docker | 5432 |
| Redis | Docker | 6379 |
| Jaeger UI | Docker | 16686 |

---

## 19.2 构建命令

### 19.2.1 根目录构建

```bash
# 后端构建
npm run build:server

# H5 构建
npm run build:app-h5

# 微信小程序构建
npm run build:app-mp-weixin

# App 构建
npm run build:app-app

# 桌面端构建
npm run build:desktop

# PC 后台构建
npm --workspace @gexm/pc run build
```

### 19.2.2 工作区构建

```bash
# 后端
npm --workspace @gexm/server run build
npm --workspace @gexm/server run build:dev    # 开发模式（含 sourceMap + watch）

# PC
npm --workspace @gexm/pc run build

# App（所有平台）
npm --workspace @gexm/app run build:h5
npm --workspace @gexm/app run build:mp-weixin
npm --workspace @gexm/app run build:mp-alipay
npm --workspace @gexm/app run build:mp-baidu
npm --workspace @gexm/app run build:mp-toutiao
npm --workspace @gexm/app run build:mp-harmony
npm --workspace @gexm/app run build:app
npm --workspace @gexm/app run build:app-harmony
npm --workspace @gexm/app run build:all       # 全平台构建

# SDK
npm --workspace @gexm/sdk run build
npm --workspace @gexm/sdk run build:dev
npm --workspace @gexm/sdk run build:web
npm --workspace @gexm/sdk run build:mp-weixin
npm --workspace @gexm/sdk run build:mp-alipay
npm --workspace @gexm/sdk run build:all

# 共享包
npm --workspace @gexm/shared run build

# 桌面端
npm --workspace @gexm/desktop run build
npm --workspace @gexm/desktop run build:win    # Windows
npm --workspace @gexm/desktop run build:mac    # macOS
npm --workspace @gexm/desktop run build:linux  # Linux
```

### 19.2.3 类型检查

```bash
# 根目录
npm run typecheck   # （如配置）

# 工作区
npm --workspace @gexm/server run typecheck
npm --workspace @gexm/pc run typecheck
npm --workspace @gexm/sdk run typecheck
npm --workspace @gexm/shared run typecheck
```

---

## 19.3 代码质量命令

### 19.3.1 ESLint（通过 lint-guarded.js 包装）

```bash
# 检查
npm run lint

# 自动修复
npm run lint:fix

# 强制（绕过文件锁，仅在用户明确要求时使用）
npm run lint:force

# 直接调用（不推荐，绕过文件锁）
npm run lint:direct
```

### 19.3.2 工作区 ESLint

```bash
# 后端
npm --workspace @gexm/server run lint
npm --workspace @gexm/server run lint:fix
npm --workspace @gexm/server run lint:security    # 安全规则

# PC
npm --workspace @gexm/pc run lint

# SDK
npm --workspace @gexm/sdk run lint
```

### 19.3.3 Prettier 格式化

```bash
# 格式化所有
npm run format

# 检查格式（不修改）
npm run format:check
```

### 19.3.4 ESLint 资源管控

按 `.trae/rules/task-scheduling-rules.md` 约定：

| 场景 | 命令 |
| --- | --- |
| 推荐 | `npm run lint` / `npm run lint:fix` |
| 备用 | `node scripts/lint-guarded.js` / `--fix` |
| 强制 | `npm run lint:force`（绕过锁，仅用户明确要求时） |
| 禁止 | `npx eslint packages/`（绕过包装脚本） |

---

## 19.4 测试命令

### 19.4.1 根目录测试

```bash
# 运行 PC 测试（默认）
npm test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage
```

### 19.4.2 工作区测试

```bash
# 后端单元测试
npm --workspace @gexm/server run test
npm --workspace @gexm/server run test:watch

# 后端 PostgreSQL 集成测试
npm --workspace @gexm/server run test:postgres

# 后端 PG 测试 setup/teardown
npm --workspace @gexm/server run test:postgres:setup
npm --workspace @gexm/server run test:postgres:teardown

# PC 测试
npm --workspace @gexm/pc run test
npm --workspace @gexm/pc run test:watch
npm --workspace @gexm/pc run test:coverage

# SDK 测试
npm --workspace @gexm/sdk run test
npm --workspace @gexm/sdk run test:coverage
```

### 19.4.3 E2E 测试

```bash
# CI E2E（chromium + firefox + webkit）
npm run preview:ci

# 指定浏览器
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# 指定测试文件
npx playwright test auth.spec.ts

# UI 模式（交互调试）
npx playwright test --ui

# 查看报告
npx playwright show-report
```

### 19.4.4 视觉回归

```bash
# 创建基线
npm run preview:baseline

# 视觉对比
npm run preview:compare
```

### 19.4.5 全平台预览

```bash
# 全平台预览
npm run preview

# 仅 PC
npm run preview:pc

# 仅 H5
npm run preview:h5

# 启动画廊
npm run preview:gallery

# 生成画册
npm run preview:gallery:generate
```

### 19.4.6 测试约束

按 `project_memory.md` 约定：

- `maxWorkers: 1`：串行执行
- `DB_PATH=:memory:`：内存数据库
- `NODE_ENV=test`：跳过速率限制
- WSL2 后端：PostgreSQL 集成测试必需

---

## 19.5 数据库迁移命令

```bash
# 运行迁移
npm --workspace @gexm/server run migrate

# 运行迁移（显式）
npm --workspace @gexm/server run migrate:run

# 验证迁移
npm --workspace @gexm/server run migrate:verify
```

### 19.5.1 手动调用迁移脚本

```bash
# 直接执行 TS 脚本
npx tsx packages/server/src/commands/migrate.ts run
npx tsx packages/server/src/commands/migrate.ts verify
```

### 19.5.2 PostgreSQL 迁移

```bash
# 使用 PostgreSQL 迁移脚本
npx tsx packages/server/scripts/migrate-postgres.ts
```

---

## 19.6 Docker 命令

### 19.6.1 主 Compose

```bash
# 开发环境启动
> **注：原 Docker 部署/运行指令已移除，请改用对应服务的原生运行方式（如 `go run` / `npm run dev` / `python -m` / 直接启动构建产物）。**

# 生产环境启动（覆写）

# 测试环境启动

# WordPress 独立栈

# 查看运行状态

# 查看日志

# 停止

# 停止并删除数据卷（慎用）

# 重新构建镜像
```

### 19.6.2 单独 Compose

按 `project_memory.md` 约定，每个服务使用独立 Compose：

```bash
# Nginx

# Express API

# MySQL（WordPress 用）

# Redis

# WordPress

# 监控栈（Prometheus + Grafana + Loki）
```

### 19.6.3 Docker 构建

```bash
# 构建所有镜像

# 构建单个服务

# 不使用缓存
```

### 19.6.4 进入容器

```bash
# 进入 server 容器

# 进入 postgres 容器

# 进入 redis 容器
```

### 19.6.5 数据库备份与恢复

```bash
# PostgreSQL 备份

# PostgreSQL 恢复

# Redis 备份

# MySQL 备份（WordPress）
```

---

## 19.7 Nginx 命令

```bash
# 测试配置

# 重新加载配置

# 重启

# 查看 access log

# 查看 error log
```

---

## 19.8 systemd 命令（生产部署）

```bash
# 启动
sudo systemctl start gexm

# 停止
sudo systemctl stop gexm

# 重启
sudo systemctl restart gexm

# 启用开机自启
sudo systemctl enable gexm

# 禁用开机自启
sudo systemctl disable gexm

# 查看状态
sudo systemctl status gexm

# 查看日志
sudo journalctl -u gexm -f
sudo journalctl -u gexm --since "1 hour ago"

# 重载 systemd 配置
sudo systemctl daemon-reload
```

---

## 19.9 PM2 命令（可选）

```bash
# 启动
pm2 start packages/server/ecosystem.config.js --env production

# 停止
pm2 stop gexm-server

# 重启
pm2 restart gexm-server

# 查看状态
pm2 status

# 查看日志
pm2 logs gexm-server --lines 100

# 监控
pm2 monit

# 保存进程列表
pm2 save

# 开机自启
pm2 startup
```

---

## 19.10 Git Hooks

### 19.10.1 Husky Hooks

**目录**：[.husky/](file:///f:/gexm/.husky/)

| Hook | 作用 |
| --- | --- |
| `pre-commit` | lint-staged（Prettier + ESLint） |
| `commit-msg` | commitlint（Conventional Commits） |

### 19.10.2 lint-staged

**文件**：`.lintstagedrc.json`

```json
{
  "packages/**/*.{js,vue,ts,json,css,scss}": [
    "prettier --write",
    "eslint --fix"
  ]
}
```

### 19.10.3 commitlint

**文件**：[commitlint.config.js](file:///f:/gexm/commitlint.config.js)

提交格式：Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type** 可选值：

| type | 说明 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（既不是新增功能，也不是修改 bug） |
| `perf` | 性能优化 |
| `test` | 增加测试 |
| `chore` | 构建过程或辅助工具的变动 |
| `ci` | CI 配置变更 |
| `revert` | 回滚到上一个版本 |

**示例**：

```
feat(server): 新增订单批量导出接口

- 支持 CSV / Excel 格式
- 通过 queueService 异步处理
- 完成后通过 WebSocket 推送通知

Closes #123
```

---

## 19.11 SSL 证书命令

```bash
# 申请 Let's Encrypt 证书
sudo certbot --nginx -d laal.top -d www.laal.top \
  --email admin@laal.top \
  --agree-tos --no-eff-email --redirect

# 测试续期
sudo certbot renew --dry-run

# 手动续期
sudo certbot renew

# 重启 Nginx 加载新证书
sudo systemctl reload nginx
```

---

## 19.12 监控命令

### 19.12.1 CPU 监控（Trae CN）

**文件**：[scripts/monitor-cpu.ps1](file:///f:/gexm/scripts/monitor-cpu.ps1)

```powershell
# 后台启动 CPU 监控（DryRun 模式，仅记录不杀进程）
powershell -ExecutionPolicy Bypass -File f:\gexm\scripts\monitor-cpu.ps1 `
    -IntervalSeconds 30 -AlertThreshold 80 -CriticalThreshold 90 -DryRun `
    -LogPath f:\gexm\logs\cpu-monitor.jsonl

# 实时查询 CPU 占用
(Get-CimInstance Win32_Processor).LoadPercentage

# 查询告警记录
Get-Content f:\gexm\logs\cpu-monitor.jsonl |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Where-Object { $_.level -in @('WARN','CRITICAL') } |
  Select-Object timestamp, cpu_load_pct, message |
  Format-Table -AutoSize
```

### 19.12.2 Prometheus 指标

```bash
# 查看指标
curl http://localhost:3000/metrics

# 健康检查
curl http://localhost:3000/api/health

# 查看 Jaeger UI
# 浏览器访问 http://localhost:16686
```

### 19.12.3 Grafana

```bash
# 启动监控栈

# 访问 Grafana
# 浏览器访问 http://localhost:3001
# 默认账号：admin / admin
```

---

## 19.13 工具脚本

**目录**：[scripts/](file:///f:/gexm/scripts/)

| 脚本 | 用途 |
| --- | --- |
| [lint-guarded.js](file:///f:/gexm/scripts/lint-guarded.js) | ESLint 文件锁包装 |
| [monitor-cpu.ps1](file:///f:/gexm/scripts/monitor-cpu.ps1) | CPU 监控 |
| [p0-recheck.mjs](file:///f:/gexm/scripts/p0-recheck.mjs) | P0 风险复检 |
| [patch-uni-app.js](file:///f:/gexm/scripts/patch-uni-app.js) | uni-app 编译补丁 |
| [homepage-validate.js](file:///f:/gexm/scripts/homepage-validate.js) | 首页校验 |

### 19.13.1 调用示例

```bash
# ESLint 包装
node scripts/lint-guarded.js
node scripts/lint-guarded.js --fix

# CPU 监控
powershell -File scripts/monitor-cpu.ps1 -DryRun

# P0 风险复检
node scripts/p0-recheck.mjs

# uni-app 编译补丁
node scripts/patch-uni-app.js

# 首页校验
node scripts/homepage-validate.js
```

---

## 19.14 调试命令

### 19.14.1 后端调试

```bash
# 启动后端（带 inspector）
npx tsx --inspect packages/server/src/server.ts

# Chrome DevTools 调试
# 浏览器访问 chrome://inspect，点击 "inspect"

# VS Code 调试
# 在 .vscode/launch.json 中配置
```

### 19.14.2 PC 调试

```bash
# 启动 PC（带 sourceMap）
npm --workspace @gexm/pc run dev

# Vue DevTools
# 浏览器扩展安装 Vue.js devtools
```

### 19.14.3 数据库调试

```bash
# SQLite 命令行
sqlite3 packages/server/data/gexm.db

# PostgreSQL 命令行

# Redis 命令行
```

### 19.14.4 检查数据库连接

```bash
# 后端数据库检查脚本
node packages/server/check-db.js

# 测试 API（启动后）
node packages/server/test-api-all.js

# 测试启动
node packages/server/test-startup.js
```

---

## 19.15 生成聊天数据

```bash
# 生成测试用聊天数据
node packages/server/generate-chat.js
```

---

## 19.16 包管理命令

```bash
# 安装所有依赖
npm install

# 安装单个工作区依赖
npm --workspace @gexm/server install <package>

# 升级依赖
npm update

# 检查可升级的包
npm outdated

# 安全审计
npm audit
npm audit --omit=dev
npm audit fix
npm audit fix --force

# 清理缓存
npm cache clean --force

# 删除 node_modules
npx rimraf node_modules packages/*/node_modules
```

---

## 19.17 Git 命令

```bash
# 查看状态
git status

# 查看暂存区差异
git diff --cached

# 查看工作区差异
git diff

# 提交（带 commitlint 校验）
git add .
git commit -m "feat(server): 新增订单批量导出接口"

# 推送
git push origin <branch>

# 拉取
git pull --rebase origin <branch>

# 查看历史
git log --oneline -n 10

# 创建分支
git checkout -b feature/xxx

# 合并分支
git checkout main
git merge feature/xxx

# 回滚
git revert <commit>
```

---

## 19.18 命令速查表

### 18.18.1 日常开发

| 场景 | 命令 |
| --- | --- |
| 启动后端 + H5 | `npm run dev` |
| 启动全部 | `npm run dev:all` |
| 启动 PC | `npm --workspace @gexm/pc run dev` |
| 启动微信小程序 | `npm run dev:app-mp-weixin` |
| Lint 检查 | `npm run lint` |
| Lint 修复 | `npm run lint:fix` |
| 格式化 | `npm run format` |
| 运行测试 | `npm test` |
| 运行后端测试 | `npm --workspace @gexm/server run test` |

### 19.18.2 构建

| 场景 | 命令 |
| --- | --- |
| 后端构建 | `npm run build:server` |
| H5 构建 | `npm run build:app-h5` |
| 微信小程序构建 | `npm run build:app-mp-weixin` |
| PC 构建 | `npm --workspace @gexm/pc run build` |
| 桌面端构建 | `npm run build:desktop` |

### 19.18.3 部署

| 场景 | 命令 |
| --- | --- |
| Docker 开发 | `docker compose up -d` |
| Docker 生产 | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |
| WordPress | `docker compose -f docker-compose.wp.yml up -d` |
| systemd 启动 | `sudo systemctl start gexm` |
| systemd 状态 | `sudo systemctl status gexm` |
| PM2 启动 | `pm2 start packages/server/ecosystem.config.js --env production` |

### 19.18.4 数据库

| 场景 | 命令 |
| --- | --- |
| 运行迁移 | `npm --workspace @gexm/server run migrate` |
| 验证迁移 | `npm --workspace @gexm/server run migrate:verify` |
| PG 备份 | `docker compose exec postgres pg_dump -U gexm gexm > backup.sql` |
| Redis 备份 | `docker compose exec redis redis-cli SAVE` |

### 19.18.5 监控

| 场景 | 命令 |
| --- | --- |
| 健康检查 | `curl http://localhost:3000/api/health` |
| Prometheus 指标 | `curl http://localhost:3000/metrics` |
| CPU 占用 | `(Get-CimInstance Win32_Processor).LoadPercentage` |
| CPU 监控启动 | `powershell -File scripts/monitor-cpu.ps1 -DryRun` |

---

## 19.19 参考文档

- [package.json](file:///f:/gexm/package.json) — 根 scripts
- [packages/server/package.json](file:///f:/gexm/packages/server/package.json) — 后端 scripts
- [packages/pc/package.json](file:///f:/gexm/packages/pc/package.json) — PC scripts
- [packages/app/package.json](file:///f:/gexm/packages/app/package.json) — App scripts
- [packages/sdk/package.json](file:///f:/gexm/packages/sdk/package.json) — SDK scripts
- [packages/desktop/package.json](file:///f:/gexm/packages/desktop/package.json) — 桌面端 scripts
- [docker-compose.yml](file:///f:/gexm/docker-compose.yml) — Docker Compose
- [scripts/](file:///f:/gexm/scripts/) — 工具脚本
- [.husky/](file:///f:/gexm/.husky/) — Git Hooks
- [commitlint.config.js](file:///f:/gexm/commitlint.config.js) — 提交规范
