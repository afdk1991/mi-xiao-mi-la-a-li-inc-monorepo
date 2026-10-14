# 系统整体架构 — 数据流与模块关系

## 三平面架构模型

B Admin 项目采用 **三平面架构**，将系统划分为三个正交平面：

```
┌──────────────────────────────────────────────────────────┐
│                   P1: 协调平面 (Coordination Plane)       │
│  MCP Coordinator → 通信协议 → 记忆总线 → 状态管理器       │
│  (定义 Agent 如何协作，不参与具体业务逻辑)                 │
└────────────┬────────────┬────────────┬──────────────────┘
             │            │            │
    ┌────────▼───┐ ┌──────▼─────┐ ┌───▼──────────────┐
    │ P2: 领域平面│ │P2: 领域平面│ │P2: 领域平面       │
    │ b-admin-   │ │ finance    │ │ trading-agent     │
    │ rules      │ │ plugin     │ │ plugin            │
    │ (项目规则) │ │ (财务分析) │ │ (交易分析)        │
    └─────┬──────┘ └──────┬─────┘ └───┬──────────────┘
          │               │            │
    ┌─────▼───────────────▼────────────▼──────────────────┐
    │                P3: 数据平面 (Data Plane)             │
    │  SQLite (app.db)  │  REST API (:3000)  │  文件系统   │
    └─────────────────────────────────────────────────────┘
```

### P1: 协调平面 — MCP Coordinator

负责全局编排，不持有业务数据。包含：
- 通信协议定义（消息格式、通道）
- Agent 注册表（角色、权限）
- 记忆总线（Agent 间共享状态）
- 状态机（项目生命周期）
- 插件契约（标准化接入）

### P2: 领域平面 — Domain Skills & Plugins

持有具体业务规则和领域知识。每个领域 Skill 独立维护自己的参考文件。当前领域：
- `b-admin-rules`: B Admin 全栈项目规范（代码风格、API、数据库、前端约定）
- 外部插件: finance、trading-agent、data-analysis 等（通过跨插件协议接入）

### P3: 数据平面 — Runtime Resources

实际运行时的数据和接口：
- SQLite 数据库（`data/app.db`）
- Express REST API（端口 3000，前缀 `/api/v1/`）
- 前端文件（`b-admin/`，Vite 代理端口 8080）
- 文件系统（日志、导出文件）

---

## 数据流全图

```
                        用户操作
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  浏览器 (localhost:8080)                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ BA.pages.* → BA.api.* → BA.request() → fetch()   │   │
│  │     ↑                          ↓                  │   │
│  │ sessionStorage           Authorization: Bearer    │   │
│  │ (token + user)           <access_token>           │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────────┘
                        │ Vite proxy: /api/v1/* → :3000
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Express Server (localhost:3000)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Middleware Stack:                                 │   │
│  │  helmet → cors → logger → json → rateLimit        │   │
│  │     ↓                                             │   │
│  │  authMiddleware → requirePermission → validate    │   │
│  │     ↓                                             │   │
│  │  Router (/api/v1/:module)                         │   │
│  │     ↓                                             │   │
│  │  Controller → Service → Database                  │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  SQLite (sql.js WASM)                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 10 tables: users, roles, permissions, user_roles, │   │
│  │  role_permissions, menus, dictionaries,           │   │
│  │  projects, services, refresh_tokens,              │   │
│  │  operation_logs, _migrations                      │   │
│  │                                                    │   │
│  │ 200ms debounce → exportDatabase() → app.db file   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Agent 间数据流（跨插件协作）

```
┌─────────────┐     记忆总线      ┌─────────────┐
│  Agent A    │ ─── 写入 ───────→ │ .codebuddy/  │
│ (分析任务)  │                   │ memories/    │
└──────┬──────┘                   │ agent-a.json │
       │                          │ agent-b.json │
       │ 读取数据库                │              │
       ▼                          │              │
┌─────────────┐                   │              │
│  SQLite     │ ◄── 只读 ──────── │              │
│  (app.db)   │                   │              │
└──────┬──────┘                   │              │
       │                          │              │
       │ API 写入                  │              │
       ▼                          │              │
┌─────────────┐                   │              │
│  REST API   │ ◄── 读写 ──────── │              │
│  (:3000)    │                   │              │
└─────────────┘                   └──────┬───────┘
                                         │
                                ┌────────▼───────┐
                                │  Agent B       │
                                │ (开发任务)     │
                                │                │
                                │ 读取记忆总线   │
                                │ → 获取上下文   │
                                │ → 采取行动     │
                                └────────────────┘
```

**关键规则**：
- Agent 之间不直接通信，通过记忆总线中转
- 读取数据：优先 API > 数据库直读 > JSON 导出
- 写入数据：必须通过 REST API（不直接写数据库）
- 外部插件：只读分析，输出独立文件

---

## 文件权限矩阵

| 路径 | Coordinator | Domain Agent | External Plugin |
|------|:-----------:|:------------:|:---------------:|
| `.codebuddy/dev-status.json` | R/W | R/W | R |
| `.codebuddy/project-context.md` | R/W | R/W | R |
| `.codebuddy/plugin-coordination.md` | R/W | R | R |
| `.codebuddy/skills/*/SKILL.md` | R/W | R/W | R |
| `.codebuddy/skills/*/references/*` | R/W | R/W (own domain) | R |
| `.codebuddy/memories/*` | R/W | R/W (own) | R/W (own) |
| `.codebuddy/agents/*` | R/W | R | R |
| `server/src/**` | R/W | R/W | R |
| `b-admin/**` | R/W | R/W (design-to-code) | R |
| `data/app.db` | R/W | R/W | R (read-only copy) |
| `*.html` (output) | R/W | R/W | R/W |
| `*.xlsx` (output) | R/W | R/W | R/W |

---

## 扩展点设计

系统预留了以下扩展点，供未来新模块接入：

| 扩展点 | 位置 | 接入方式 |
|--------|------|---------|
| 新领域 Skill | `.codebuddy/skills/<name>/` | 创建 SKILL.md + references |
| 新 Agent 定义 | `.codebuddy/agents/<name>.md` | 创建 .md 定义文件 |
| 新插件 | 外部 marketplace | 遵循 plugin-contract.md |
| 新记忆类型 | `.codebuddy/memories/<type>.json` | 在 memory-structure.md 声明 |
| 新状态阶段 | `dev-status.json` phases | 追加新 phase |
| 新数据库表 | SQLite DDL | 在 migrate.js 添加迁移 |
| 新 API 模块 | `server/src/routes/` | 遵循 api-contracts.md |
