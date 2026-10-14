# 冲突检测与优先级管理 — 代驾平台多插件冲突裁决规则 v1.0

**版本**: v1.0.0
**生效日期**: 2026-08-02

---

## 1. 冲突检测机制

本系统通过以下三种方式检测跨插件冲突：

### 1.1 静态分析检测（编译时）

在 Agent 启动时，daijia-orchestrator 自动扫描：
- 同名插件跨 Marketplace 注册（约 30+ 组已知冲突）
- 共享文件写入权限冲突（多个插件声明对同一文件的写权限）
- 规则冲突（不同插件对同一场景给出矛盾的指令）

### 1.2 运行时检测（操作时）

在 Agent 执行操作时：
- 文件写入前检查：目标文件是否在另一个插件的独占写入域中
- 规则注入前检查：新注入的规则是否与已激活规则冲突
- 工具调用拦截：如果调用会影响其他插件的管辖区

### 1.3 事后审计检测（完成后）

通过 `dev-status.json` 和 `decision-log.md` 的变更记录：
- 对比两次 `dev-status.json` 快照，检测意外文件变更
- 审计 `decision-log.md` 中是否有多方对同一问题给出矛盾决策

---

## 2. 6 类已知跨插件冲突及解决方案

### 冲突 1：同名插件跨 Marketplace 重复

**涉及插件**：约 30+ 组（具体清单见 PROJECT-RULES-MEMORY.md 第 6.1 节）

**裁决规则**：
- codebuddy-plugins-official > cb_teams_marketplace（官方版更新更全）
- 如两个版本功能相同 → 保留 official，禁用 cb_teams
- 如两个版本功能互补 → 保留两者，声明职责边界

**当前执行方案**：
- 推荐禁用 cb_teams 中的 15 个重复项
- 保留 cb_teams 中独有的 8 个专业场景插件

### 冲突 2：solo-design vs design-to-code 页面写入冲突

**冲突描述**：两个插件都可能生成/修改 `daijia-mobile/pages/*.html` 文件。

**裁决规则**：
- solo-design 是页面设计生成的主要工具（有完整的设计令牌体系和管理运行时）
- design-to-code 仅在有 Figma JSON 导出或截图输入时使用
- 优先级：solo-design > design-to-code
- 禁止两个插件同时修改同一个 HTML 文件

**检测方法**：
- `dev-status.json` 中维护每个 HTML 文件的 `lastModifiedBy` 字段
- 如果同一个文件 24 小时内被两个插件修改 → 触发冲突警报

### 冲突 3：金融插件规则与代驾开发上下文共存策略

**冲突描述**：12 个金融插件全部默认激活后，每个插件的 system prompt 规则（约 15,000+ 字符）可能在非金融任务中造成上下文膨胀。

**裁决规则**：
- 金融插件全部默认激活，但通过**域专属路由**确保其规则仅在特定触发条件下注入子 Agent 上下文
- 域路由触发条件：财务结算/对账/收入分析/投资决策/股票分析/估值建模/投行场景等
- 非金融任务（HTML 生成、PHP 开发、CSS 设计、页面修复、测试、文档、审计）不触发任何金融插件规则
- 数据源优先级：finance-data > lseg > spglobal > web search（fallback）

**检测方法**：
- daijia-orchestrator 在启动子 Agent 前判断任务域
- 如果任务不属于金融触发条件，不将金融插件 system prompt 注入子 Agent 上下文
- 如果出现意外注入 → 通过 `conflict-resolution.md` 记录并排查

### 冲突 4：React/Tailwind 规则与 native HTML 架构不兼容

**冲突描述**：Web App Development System 规则集假设 React + Vite + Tailwind + shadcn/ui 技术栈，而代驾项目前端是原生 HTML + solo-design 的 `--dj-*` CSS 变量体系。

**裁决规则**：
- 代驾项目前端技术栈声明：`FRONTEND_TECH = "native-html + solo-design"`
- Web App Dev 规则仅在创建**全新**子项目时考虑使用
- 对于已有 solo-design 产出页面，严格遵守原生 HTML 架构
- 图标库兼容：两者都推荐 lucide-icons（无冲突）

**检测方法**：
- 如果 Agent 建议将已有 HTML 页面迁移到 React → 立即阻止并记录

### 冲突 5：Security Rules V5 与 Agent Team 自动化冲突

**冲突描述**：Security Rules V5 的 13 条安全规则在所有代码生成前检查。部分 Agent Team（如 AI Hedge Fund）可能在分析报告中生成动态 HTML/JS，触发 XSS 规则。

**裁决规则**：
- Security Rules V5 保持最高优先级，不可降级
- 对纯分析性/文档生成任务，提供以下豁免：
  - 文档/报告场景 → SQL/命令注入/路径遍历规则可豁免
  - 数据分析 HTML 输出 → XSS 规则保持生效
  - PHP 代码生成 → 全部安全规则生效

**检测方法**：
- 安全规则违规由 `security-scan@official` 自动检测
- `code-review-ai@official` 在审查阶段二次确认

### 冲突 6：Trae-CN 与 CodeBuddy 状态不同步

**冲突描述**：solo-design 在 Trae-CN 中的操作（生成/验证/修复页面）不会自动同步到 CodeBuddy 的上下文中，可能导致 CodeBuddy Agent 使用过时的页面信息。

**裁决规则**：
- `dev-status.json` 作为唯一状态同步桥梁
- 每次 solo-design 完成操作后，orchestrator 必须更新 `dev-status.json` 中对应页面的状态
- 每次 CodeBuddy Agent 启动时，必须先读取 `dev-status.json`

**检测方法**：
- 对比 `dev-status.json` 的 `lastUpdated` 与 solo-design `runtime-orchestration-summary.json` 的时间戳
- 如超过 1 小时未同步 → 触发状态同步提醒

---

## 3. 冲突优先级管理

### 3.1 全局优先级链

```
Level 0 — Security Rules V5 (不可降级)
  │
Level 1 — daijia-memory-agent SKILL.md (项目记忆中枢)
  │
Level 2 — .codebuddy/mcp.json (项目级 MCP 配置)
  │
Level 3 — daijia-orchestrator Agent (全局任务编排)
  │
Level 4 — solo-design Skill (设计系统规则，Trae-CN)
  │
Level 5 — 场景规则 (deep-research / webapp-testing / dockerfile-gen)
  │
Level 6 — 全局 always_applied_user_rules
  │
Level 7 — Marketplace 插件规则 (最低优先级)
```

### 3.2 冲突裁决原则

| 原则 | 说明 | 示例 |
|------|------|------|
| 安全优先 | 安全性 > 功能性 | Security Rules V5 可以否决任何插件的文件写入操作 |
| 项目级优先 | 项目级配置 > 全局配置 | `.codebuddy/mcp.json` > `~/.codebuddy/mcp.json` |
| 专用性优先 | 专用规则 > 通用规则 | solo-design 的页面生成规则 > Web App Dev 的通用前端规则 |
| 显式优先 | 显式声明 > 隐式推导 | `FRONTEND_TECH = "native-html"` > 默认的 React 建议 |
| 最新优先 | 新决策 > 旧决策 | `decision-log.md` 中同主题的最新条目 > 旧条目 |

### 3.3 冲突升级流程

当两个插件或规则发生冲突且无法自动裁决时：

1. **记录冲突** → 写入 `conflict-resolution.md` 的活跃冲突表
2. **标记状态** → 在 `dev-status.json` 中标记 `activeConflicts > 0`
3. **暂停受影响域** → 涉及冲突的子项目域暂停修改，直到裁决完成
4. **人工裁决** → 用户通过 daijia-orchestrator 做出裁决
5. **记录裁决** → 写入 `decision-log.md`，更新冲突表状态

---

## 4. 活跃冲突追踪表

当前代驾平台的活跃冲突（如有）：

| ID | 冲突类型 | 涉及插件 | 涉及文件 | 检测日期 | 状态 | 解决方案 |
|----|---------|---------|---------|---------|------|---------|
| — | — | — | — | — | 无活跃冲突 | — |
