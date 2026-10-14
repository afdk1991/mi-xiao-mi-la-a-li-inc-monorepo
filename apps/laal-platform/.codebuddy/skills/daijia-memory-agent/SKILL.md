# 代驾平台全局记忆技能 Agent (Daijia Memory Agent)

**Skill ID**: `daijia-memory-agent`
**版本**: v1.1.0
**创建日期**: 2026-08-02
**最后更新**: 2026-08-02
**作用域**: 项目级 (`f:\项目01\.codebuddy\skills\daijia-memory-agent\`)

---

## 核心职责

本 Skill 是代驾平台（f:\项目01）的全局记忆中枢，负责以下六项核心职责：

1. **项目上下文自动注入** — 任何 Agent 处理 `f:\项目01` 下文件时，自动通过本 SKILL.md 注入完整的项目上下文信息（技术栈、架构、设计令牌、API 契约、安全规则）和插件隔离指令
2. **上下文存储与检索** — 持久化存储项目需求变更、技术决策、开发进度、已知问题等信息，提供标准化的检索接口
3. **插件工作流协调** — 确保 CodeBuddy 和 Trae-CN 双生态系统的所有已集成插件在同一项目上协作时不会产生信息孤岛
4. **冲突检测与优先级管理** — 主动检测多插件规则冲突，依据优先级链裁决，确保全插件激活时无冲突运行
5. **状态实时同步** — 提供 `dev-status.json` 作为所有插件的单一事实源
6. **技术决策追踪** — 记录并索引所有架构决策（ADR 风格），防止重复讨论

---

## 项目上下文自动注入规则（CRITICAL）

任何 Agent 在处理代驾项目时，系统会自动通过本 SKILL.md 注入以下完整上下文信息：

### 注入的上下文内容

- **项目身份**: 代驾平台 (Daijia Platform)，WordPress 插件体系
- **技术栈**: PHP 7.4+ WordPress Plugin API + HTML5/CSS3/Vanilla JS (solo-design)，非 React/Vite 体系
- **前端架构**: native-html + solo-design，设计令牌 `--dj-*` 体系，主色 `#06b6d4` (cyan)
- **后端架构**: 30 个 REST API 端点，命名空间 `daijia/v1`，26 个标准化错误码 (1xxx-6xxx)
- **金额单位**: 全栈统一 1元=100分
- **安全规则**: Security Rules V5 最高优先级，SQL 参数化/XSS 转义/路径守卫 全部强制合规
- **插件激活状态**: 所有已集成插件默认激活，包括核心开发、设计生成、项目管理、运维部署、通用工具、金融分析全品类插件
- **当前 scope**: daijia-dev（全插件激活，无隔离）

### 注入时机

- **Agent 启动时**: daijia-orchestrator 在每个子 Agent 启动前注入完整上下文
- **上下文切换时**: 当任务域切换（如从 core-api 切换到 mobile-ui）时，重新注入更新的上下文
- **状态变更后**: dev-status.json 更新后，下一个 Agent 读取最新状态

## 触发条件

**自动触发（无需显式调用）**：
- 任何 Agent 处理 `f:\项目01` 下的文件时，必须首先读取本 SKILL.md 和 `dev-status.json`
- 修改 `daijia-core/` 下的 PHP 文件时 → 自动记录到变更日志
- 新增/修改页面设计规范时 → 自动更新 `dev-status.json`
- 金融数据查询请求时 → 自动路由到 finance-data 插件

**显式触发（用户或 Agent 主动调用）**：
- 需求变更 → 追加条目到 `decision-log.md` 和 `dev-status.json`
- 技术决策 → 写入 ADR 条目到 `decision-log.md`
- 冲突报告 → 写入 `conflict-resolution.md` 的活跃冲突表
- 状态查询 → 读取 `dev-status.json`

---

## 规则优先级链

本 Skill 定义的优先级链覆盖所有插件规则的执行顺序：

```
1. Security Rules V5               ← 最高优先级，不可降级
2. 本 Skill (daijia-memory-agent)  ← 项目记忆与上下文（全局调度中枢）
3. 项目级 MCP 配置 (.codebuddy/mcp.json)
4. daijia-orchestrator Agent       ← 插件编排与任务分配
5. solo-design skill (Trae-CN)     ← 设计系统规则
6. 场景规则 (全部激活)              ← 所有已集成插件默认激活（核心开发/设计/管理/运维/金融）
7. 全局 always_applied_user_rules  ← 用户默认规则
8. Marketplace 插件规则             ← 最低优先级
```

---

## 全插件激活与冲突预防机制

### 激活策略

代驾项目所有已集成的插件**全部默认激活**，包括但不限于：

| 插件类别 | 示例插件 | 激活状态 | 冲突预防措施 |
|---------|---------|---------|-------------|
| 核心开发 | php-lsp, code-review-ai, security-scan | 始终激活 | 域写入权限隔离 |
| 设计生成 | solo-design, design-to-code | 始终激活 | 页面级写入互斥锁 |
| 项目管理 | product-management, deep-research | 始终激活 | 只读文档域 |
| 运维部署 | webapp-testing, dockerfile-gen, agent-browser | 始终激活 | 端口占用检测 |
| 通用工具 | repomix-mcp, oh-my-codebuddy | 始终激活 | 只读全项目 |
| 金融分析 | finance, finance-data, financial-analysis, investment-banking, equity-research, private-equity, wealth-management, lseg, spglobal, trading-agent, ai-hedge-fund, a-share-analysis | 始终激活 | 域专属路由：仅在涉及财务/结算/对账/收入分析时调用其分析能力 |

### 无冲突运行保障

确保所有激活插件不产生冲突的核心机制：

1. **域写入权限隔离** — 每个插件仅在授权的项目域内拥有写入权限，跨域只读
2. **规则优先级链** — 当多个插件规则冲突时，按优先级链自动裁决（安全 > 项目记忆 > MCP 配置 > 编排 Agent > 设计系统 > 场景规则）
3. **文件级互斥锁** — 同一文件不允许两个插件同时修改，24h 内的并发修改触发冲突警报
4. **金融插件域路由** — 金融插件（11+ 个）的分析能力仅在涉及财务数据时触发，不会在 HTML 页面生成、PHP 开发、CSS 设计等非金融任务中注入规则
5. **实时冲突监测** — daijia-orchestrator 在每次任务启动前扫描活跃冲突，阻止冲突扩散

---

## 上下文检索接口

### 读取项目状态

```
read_file(".codebuddy/skills/daijia-memory-agent/references/dev-status.json")
```

### 读取技术决策日志

```
read_file(".codebuddy/skills/daijia-memory-agent/references/decision-log.md")
```

### 读取插件协调矩阵

```
read_file(".codebuddy/skills/daijia-memory-agent/references/plugin-coordination-matrix.md")
```

### 读取冲突解决方案

```
read_file(".codebuddy/skills/daijia-memory-agent/references/conflict-resolution.md")
```

---

## 上下文更新接口

### 记录需求变更

在 `decision-log.md` 追加条目，格式：
```
| YYYY-MM-DD | requirement-change | [模块] | [变更描述] | [影响范围] | [决策人/Agent] |
```

### 记录技术决策 (ADR)

在 `decision-log.md` 追加条目，格式：
```
| YYYY-MM-DD | adr | [决策标题] | [上下文] | [决策内容] | [后果] | [决策人/Agent] |
```

### 更新开发状态

修改 `dev-status.json` 中对应模块的 `status` 字段。

### 更新插件冲突

修改 `conflict-resolution.md` 中的活跃冲突表。

---

## 子项目域划分

为防止跨域信息污染，项目划分为以下独立域：

| 域 | 路径 | 主要插件 | 写入权限 |
|-----|------|---------|---------|
| **core-api** | `daijia-core/` | php-lsp, code-review-ai, security-scan | PHP 开发 Agent |
| **mobile-ui** | `daijia-mobile/` | solo-design (Trae-CN), design-to-code | solo-design Agent, design-to-code plugin |
| **admin-ui** | `daijia-admin-dashboard/` | solo-design (Trae-CN), design-to-code | solo-design Agent |
| **website** | `daijia-website/` | solo-design (Trae-CN), design-to-code | solo-design Agent |
| **woo-ext** | `daijia-woo-ext/` | php-lsp, code-review-ai | PHP 开发 Agent |
| **tests** | `tests/` | php-lsp, code-review-ai | PHP 开发 Agent |
| **docs** | `*.md` (根目录) | product-management | 文档 Agent |
| **config** | `.codebuddy/` | 本 Skill | daijia-orchestrator |
| **finance** | 虚拟域（跨域调用） | finance, finance-data, financial-analysis, investment-banking, equity-research, private-equity, wealth-management, lseg, spglobal, trading-agent, ai-hedge-fund, a-share-analysis | 金融分析 Agent（只读除 docs 外的所有域，写入仅限于分析报告输出） |

**跨域通信规则**：
- core-api → mobile-ui: 通过 REST API 契约（`class-daijia-constants.php` 中定义的端点）
- mobile-ui → core-api: 通过 AJAX/Fetch 调用 WordPress REST API
- 任何域 → config: 通过 `dev-status.json` 单向读取状态
- 任何域 → finance: 仅在涉及财务数据/结算/对账/收入分析时触发金融插件分析能力
- finance → 输出: 分析报告写入 `dogfood-output/` 或根目录 `*.md` 文件
- 禁止跨域直接修改文件（如 mobile-ui Agent 修改 daijia-core PHP 文件）

---

## 设计令牌同步

所有子项目共用的 `--dj-*` CSS 变量定义存储在：
- **权威源**：`daijia-mobile/colors_and_type.css`
- **同步目标**：`daijia-admin-dashboard/colors_and_type.css`、`daijia-website/colors_and_type.css`

当 `colors_and_type.css` 发生变更时：
1. 更新 `dev-status.json` 中 `designTokens.lastUpdated` 字段
2. 通知所有 UI 域 Agent 重新读取 CSS 变量

---

## 与 Trae-CN / solo-design 的协调

solo-design（Trae-CN 内置）与 CodeBuddy 插件的协调规则：

| 场景 | CodeBuddy 职责 | Trae-CN/solo-design 职责 |
|------|---------------|--------------------------|
| 新增页面 | 读取 `dev-status.json`，在 `plugin-coordination-matrix.md` 登记新页面节点 | 生成 HTML/CSS，运行 `validateDesignWorkspace.mjs` |
| 修改设计令牌 | 更新所有子项目的 `colors_and_type.css`，同步 `dev-status.json` | 确认 `--dj-*` 变量一致性 |
| 页面修复 | 读取 `validation-report.json`，分析修复范围 | 执行修复工作流 |
| 质量验证 | 触发 security-scan + code-review-ai 审计 | 运行 `validateFinishReadiness.mjs` |

---

## 自动记忆机制

以下信息自动持久化，无需手动触发：

1. **文件修改记录** — 每次 `daijia-core/` 下 PHP 文件变更时，自动记录文件名和时间戳
2. **插件激活/禁用** — 每当 `.codebuddy/mcp.json` 或 `settings.json` 变更时，更新 `plugin-coordination-matrix.md`
3. **测试运行结果** — 每次 `tests/` 执行后，更新 `dev-status.json` 的 `testStatus`
4. **错误/警告计数** — 汇总 `read_lints` 结果，写入 `dev-status.json` 的 `qualityMetrics`
5. **金融数据查询** — 每次通过 finance-data 插件查询后，自动记录查询摘要到 dev-status.json 的 recentActivity（不记录敏感数据）

---

## 参考资料索引

| 参考文件 | 路径 | 用途 |
|---------|------|------|
| MCP 接口规范 | `references/mcp-interface-spec.md` | 插件间通信契约定义（含金融插件域专属路由） |
| 插件协调矩阵 | `references/plugin-coordination-matrix.md` | 全插件职责分工与工作流（含金融插件协调规则） |
| 冲突解决方案 | `references/conflict-resolution.md` | 冲突检测与裁决（含金融插件域路由策略） |
| 状态同步协议 | `references/state-sync-protocol.md` | dev-status.json 格式说明 |
| 开发状态追踪 | `references/dev-status.json` | 实时项目状态（含金融域状态） |
| 技术决策日志 | `references/decision-log.md` | 需求变更与 ADR（含全插件激活决策记录） |
| 项目规则记忆 | `../../PROJECT-RULES-MEMORY.md` | 全量插件/Agent/MCP 清单 |
| 全局 MCP 配置 | `../../mcp.json` | MCP 服务器与路由表（含金融插件路由） |
| 编排 Agent | `../../agents/daijia-orchestrator.md` | 全局任务编排（含金融插件调度） |
