# 技术决策日志 — 代驾平台 ADR 与需求变更追踪

**版本**: v1.0.0
**创建日期**: 2026-08-02

本文件记录代驾平台开发过程中的所有关键技术决策（ADR 格式）和需求变更。遵循不可变日志原则：每个条目只追加、不修改、不删除。

---

## 决策条目格式

| 日期 | 类型 | 标题 | 上下文 | 决策内容 | 后果 | 决策人/Agent |
|------|------|------|--------|---------|------|-------------|
| YYYY-MM-DD | adr / requirement-change / tech-debt | 简短标题 | 为什么需要做这个决策 | 做了什么决策 | 决策带来的影响 | 谁做的决策 |

---

## 决策条目

| 日期 | 类型 | 标题 | 上下文 | 决策内容 | 后果 | 决策人/Agent |
|------|------|------|--------|---------|------|-------------|
| 2026-08-02 | adr | 建立 daijia-memory-agent 为全局记忆中枢 | 项目运行在 CodeBuddy（239插件）+ Trae-CN（163插件）双生态之上，缺乏统一的状态管理和插件协调机制 | 以 `.codebuddy/skills/daijia-memory-agent/` 作为全局记忆中枢，`dev-status.json` 为单一事实源，`decision-log.md` 记录所有技术决策 | 所有 Agent 启动时需先读取 SKILL.md 和 dev-status.json；增加少量上下文开销，但杜绝信息孤岛 | daijia-orchestrator |
| 2026-08-02 | adr | 前端技术栈锁定为 native-html + solo-design | Web App Dev System 规则集默认 React/Vite/Tailwind，与现有 solo-design 生成的 HTML 页面冲突 | 声明 `FRONTEND_TECH = "native-html + solo-design"`，React 模板仅在新子项目启动时考虑 | 保持现有 3 个 UI 子项目的架构不变；新增页面也使用 solo-design 或原生 HTML | daijia-orchestrator |
| 2026-08-02 | adr | 金融插件默认禁用，按需激活 | 10 个金融插件在 system prompt 中注入约 15,000 字符规则，在代驾开发中造成上下文污染 | 通过 `.codebuddy/mcp.json` 的 `contextIsolation` 定义 `daijia-dev` scope，金融插件仅在财务场景手动激活 | 代驾开发时上下文更清洁；财务分析时需手动切换 scope | daijia-orchestrator |
| 2026-08-02 | adr | MCP 配置分级：项目级 > 全局级 | 全局 `~/.codebuddy/mcp.json` 中 mcpServers 为空，导致多个 MCP 依赖插件功能不可用 | 在项目级 `.codebuddy/mcp.json` 中定义 daijia-context、daijia-decision-log、design-converter、repomix、php-lsp 5 个 MCP 服务器 | 项目内 MCP 功能恢复可用；全局 MCP 配置保持为空（避免跨项目污染） | daijia-orchestrator |
| 2026-08-02 | tech-debt | solo-design 域与 CodeBuddy 域通过 dev-status.json 桥接 | solo-design 运行在 Trae-CN 中，其 runtime-orchestration-summary.json 不为 CodeBuddy 插件所知 | 在 dev-status.json 中维护 solo-design 页面的状态摘要，orchestrator 负责同步 | 需要手动保持两个 JSON 文件的一致性；未来可考虑自动化同步脚本 | daijia-orchestrator |
| 2026-08-02 | adr | 7 级规则优先级链 | 多个规则集可能对同一场景给出矛盾指令，需要明确的优先级顺序 | 定义 Security V5 → daijia-memory-agent → MCP 配置 → orchestrator → solo-design → 场景规则 → 全局规则 → 插件规则 的优先级链 | 冲突裁决有章可循；安全性始终最高优先级 | daijia-orchestrator |
| 2026-08-02 | requirement-change | 新增 MCP 规则与记忆技能 Agent 统筹体系 | 原有开发流程中插件各自为政，存在信息孤岛和规则冲突 | 建立完整体系：统一 MCP 接口规范 + 全局记忆 Agent + 插件协调矩阵 + 冲突检测 + 状态同步 | 所有新任务自动受此体系统筹；开发效率和一致性提升 | 用户 |
| 2026-08-02 | adr | 金融插件从隔离策略改为全激活 + 域路由策略 | 原方案将 12 个金融插件在 daijia-dev scope 中禁用，改为在财务任务中手动激活。用户要求所有已集成插件默认激活、不产生冲突 | 撤销 contextIsolation 禁用列表，金融插件全部默认激活；新增 domainRoutedPlugins 域专属路由机制：每个金融插件定义 triggerConditions，仅在涉及财务/结算/投资任务时注入规则 | 金融插件随时可用，无需手动切换 scope；非金融任务不受金融规则干扰；任务切换时无需上下文重建 | 用户 |

---

## 变更记录

| 日期 | 操作 | 描述 |
|------|------|------|
| 2026-08-02 | 创建 | 初始化决策日志，记录 7 条初始决策 |
| 2026-08-02 | 更新 | 撤销 ADR-003（金融插件默认禁用），新增 ADR-008（全激活 + 域路由策略）|
