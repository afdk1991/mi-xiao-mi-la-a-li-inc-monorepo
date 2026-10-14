# 插件协调矩阵 — 代驾平台多插件协作规范 v1.0

**版本**: v1.0.0
**生效日期**: 2026-08-02

---

## 1. 协调原则

代驾平台运行在 CodeBuddy（239 插件）+ Trae-CN（163 插件）双生态系统之上。协调矩阵的核心目标是消除信息孤岛，确保每个插件知道自己做什么、不做什么、和谁协作。

### 1.1 三大协调原则

1. **单域单主** — 每个子项目域只有一个负责写入的插件或 Agent
2. **跨域只读** — 插件可以读取其他域的文件获取信息，但绝对不能写入
3. **状态广播** — 任何可能影响其他域的操作，必须在 `dev-status.json` 中记录

---

## 2. 插件职责分工表

### 2.1 核心开发插件（始终启用）

| 插件 | 域 | 核心职责 | 协作方 | 产出物 |
|------|-----|---------|--------|--------|
| php-lsp@official | core-api, woo-ext, tests | PHP 语法检查、自动补全、诊断 | code-review-ai | LSP Diagnostic |
| code-review-ai@official | core-api, woo-ext, tests | PHP 代码审查、安全规则合规检查 | security-scan | 审查报告 |
| security-scan@official | core-api, woo-ext, tests | 安全漏洞扫描（SQL注入、XSS、命令注入） | code-review-ai | 扫描报告 |
| agent-browser@official | mobile-ui, admin-ui, website | 浏览器自动化测试、截图验证 | webapp-testing | 测试截图 |

### 2.2 设计生成插件（按需启用）

| 插件 | 域 | 核心职责 | 协作方 | 产出物 |
|------|-----|---------|--------|--------|
| solo-design@trae-cn | mobile-ui, admin-ui, website | 页面设计生成（HTML/CSS/JS） | design-to-code | .html, .css, .design 文件 |
| design-to-code@cb_teams | mobile-ui, admin-ui, website | Figma/截图转代码（需要 MCP design-converter） | solo-design | React/Vue 组件 |

**注意**：solo-design 和 design-to-code 不能同时修改同一个 HTML 文件，避免样式冲突。优先级：solo-design > design-to-code（因为 solo-design 的更完整的设计令牌体系）。

### 2.3 项目管理插件

| 插件 | 域 | 核心职责 | 协作方 | 产出物 |
|------|-----|---------|--------|--------|
| product-management@cb_teams | docs | PRD 撰写、路线图规划、用户研究 | daijia-orchestrator | PRD, 路线图 |
| deep-research@cb_teams | all (read-only) | 深度调研、审计报告 | repomix | 调研报告 |

### 2.4 运维/部署插件

| 插件 | 域 | 核心职责 | 协作方 | 产出物 |
|------|-----|---------|--------|--------|
| dockerfile-gen@cb_teams | config | Dockerfile 生成 | - | Dockerfile, .dockerignore |
| webapp-testing@official | mobile-ui, admin-ui | Web 应用测试 | agent-browser | 测试报告 |

### 2.5 通用工具插件

| 插件 | 域 | 核心职责 | 协作方 | 产出物 |
|------|-----|---------|--------|--------|
| repomix-mcp@official | all (read-only) | 代码库打包分析 | deep-research | 代码分析报告 |
| oh-my-codebuddy@official | all | 综合工具集 | - | 各类辅助 |

### 2.6 金融插件（默认激活，域专属路由）

以下插件默认全部激活，但通过域专属路由机制，其分析能力仅在涉及特定任务域时触发。在非金融任务中不注入规则：

| 插件 | 触发条件 | 输出域 | 说明 |
|------|---------|--------|------|
| finance@cb_teams | 结算对账、财务报表、会计分录 | docs, dogfood-output | 财务工作流（journal-entry/reconciliation/variance-analysis/financial-statements/SOX） |
| finance-data@cb_teams | 需要金融数据时（股票/指数/基金/期货/宏观） | - (数据提供) | 全品类金融数据（15大类 209接口），所有金融插件的数据源 |
| financial-analysis@cb_teams | DCF估值、可比公司、LBO、三表模型 | docs, dogfood-output | 金融建模分析 |
| investment-banking@cb_teams | 投行场景（pitch-deck/merger-model/CIM/teaser/buyer-list） | docs, dogfood-output | 投行工具集 |
| equity-research@cb_teams | 股票研究（initiating-coverage/earnings-analysis/idea-generation） | docs, dogfood-output | 股票研究与财报分析 |
| private-equity@cb_teams | PE 分析（deal-sourcing/dd-checklist/ic-memo/portfolio-monitoring） | docs, dogfood-output | 私募股权工具集 |
| wealth-management@cb_teams | 财富管理（client-review/financial-plan/investment-proposal/rebalance） | docs, dogfood-output | 财富管理工具集 |
| lseg@cb_teams | 固定收益/外汇/衍生品（bond-rv/bond-futures/fx-carry/option-vol） | docs, dogfood-output | LSEG 市场数据框架 |
| spglobal@cb_teams | 公司 tearsheet、财报预览、融资动态 | docs, dogfood-output | S&P Global 市场情报 |
| trading-agent@cb_teams | 交易决策（股票买卖建议，触发完整 11 Agent SOP） | docs, dogfood-output | 多角色辩论式交易分析 |
| ai-hedge-fund@cb_teams | 投资评估（19 位大师投票 + 风险管理 + 投资组合决策） | docs, dogfood-output | AI 对冲基金多大师分析 |
| a-share-analysis@cb_teams | A 股/沪深市场分析 | docs, dogfood-output | A 股专项分析工具集 |

**域路由机制**：金融插件分析规则仅在触发条件满足时注入子 Agent 上下文。例如：
- 用户说"修复 driver-orders.html 的 bug" → 不触发任何金融插件规则
- 用户说"分析一下平台收入数据" → 触发 finance@cb_teams 和 financial-analysis@cb_teams
- 用户说"帮我看看茅台该不该买" → 触发 trading-agent@cb_teams 完整 SOP 工作流

---

## 3. 工作流协同矩阵

### 3.1 新增业务功能（端到端）

```
Phase 1: 需求定义
  product-management@cb_teams → PRD 写入 docs/

Phase 2: 数据库 + API
  PHP 开发 Agent → 修改 daijia-core/ (新增 REST 端点、数据库表)
  code-review-ai@official → 审查 PHP 代码
  security-scan@official → 安全审计

Phase 3: 前端页面
  [如需全新页面] solo-design@trae-cn → 生成 HTML/CSS
  [如需修改现有页面] PHP 开发 Agent → 直接修改 HTML
  agent-browser@official → 浏览器测试

Phase 4: 测试
  PHP 开发 Agent → 编写 tests/ 用例
  webapp-testing@official → 端到端测试

Phase 5: 文档更新
  daijia-orchestrator → 更新 dev-status.json
  daijia-memory-agent → 更新 decision-log.md
```

### 3.2 Bug 修复流程

```
Step 1: 定位
  repomix-mcp@official → 代码分析定位问题文件

Step 2: 修复
  PHP 开发 Agent → 修改 daijia-core/
  或 solo-design@trae-cn → 修复 UI 问题

Step 3: 验证
  php-lsp@official → LSP 诊断
  security-scan@official → 安全复查
  agent-browser@official → 浏览器回归测试

Step 4: 记录
  daijia-memory-agent → 更新 dev-status.json 的 knownIssues
```

### 3.3 审计/安全扫描流程

```
Step 1: 代码库扫描
  security-scan@official → 扫描 daijia-core/ + daijia-woo-ext/

Step 2: 代码审查
  code-review-ai@official → 深度审查

Step 3: 报告生成
  deep-research@cb_teams → 聚合扫描结果 + 审查意见 → 审计报告

Step 4: 修复跟踪
  daijia-memory-agent → dev-status.json 记录待修复项
  PHP 开发 Agent → 逐个修复
  daijia-memory-agent → 标记已修复
```

---

## 4. 信息孤岛消除策略

### 4.1 已识别孤岛

| 孤岛 | 描述 | 解决方案 |
|------|------|---------|
| solo-design 状态不可见 | CodeBuddy 侧无法感知 solo-design 生成的页面最新状态 | 在 `dev-status.json` 中维护 solo-design 的 `runtime-orchestration-summary.json` 摘要 |
| 金融插件规则污染 | 12 个金融插件在代驾开发中可能注入大量金融专用规则，在非金融任务中造成上下文膨胀 | 域专属路由策略：金融插件规则仅在涉及财务/结算/对账/收入分析/投资决策时注入对应子 Agent；其他任务不触发金融规则，保持上下文精简 |
| 测试结果分散 | 单元测试、浏览器测试、安全扫描结果分散在不同报告中 | 统一汇总到 `dev-status.json` 的 `qualityMetrics` |
| 设计令牌不一致 | 3 个 UI 子项目可能使用不同版本的 `colors_and_type.css` | 通过 `mcp-interface-spec.md` 的令牌同步协议确保一致性 |

### 4.2 信息汇总机制

所有关键信息通过 `dev-status.json` 唯一出口广播：

```
solo-design runtime-orchestration-summary.json ──┐
code-review-ai 审查报告 ────────────────────────┤
security-scan 扫描结果 ─────────────────────────┤
                                                  ├──→ dev-status.json ←── 所有插件读取
php-lsp 诊断摘要 ────────────────────────────────┤
agent-browser 测试结果 ─────────────────────────┤
product-management PRD 状态 ─────────────────────┘
finance-data 查询摘要 ────────────────────────────┘
金融插件分析报告 ─────────────────────────────────┘
```

---

## 5. 插件激活/禁用决策树

```
新任务到来
  │
  ├── 涉及 PHP 代码修改？
  │   ├── 是 → 激活: php-lsp + code-review-ai + security-scan
  │   └── 否 → 跳过 PHP 工具链
  │
  ├── 涉及 UI 页面生成/修改？
  │   ├── 是 → 激活: solo-design (Trae-CN) / design-to-code (CodeBuddy)
  │   │       禁用: 金融插件（自动隔离）
  │   └── 否 → 跳过设计工具链
  │
  ├── 涉及财务/结算/收入分析相关？
  │   ├── 是 → 域路由触发: finance + finance-data + financial-analysis
  │   │       输出: docs 或 dogfood-output（非金融任务的其他插件不受影响）
  │   └── 否 → 金融插件保持待命（规则不注入当前上下文）
  │
  ├── 涉及投资/交易分析？
  │   ├── 是 → 域路由触发: trading-agent / ai-hedge-fund / equity-research / a-share-analysis
  │   │       输出: docs 或 dogfood-output
  │   └── 否 → 交易插件保持待命
  │
  ├── 涉及安全审计？
  │   ├── 是 → 激活: security-scan + code-review-ai + deep-research
  │   └── 否 → 保持基础安全检查（php-lsp 自动运行）
  │
  └── 涉及文档/报告？
      ├── 是 → 激活: product-management / deep-research
      └── 否 → 跳过
```
