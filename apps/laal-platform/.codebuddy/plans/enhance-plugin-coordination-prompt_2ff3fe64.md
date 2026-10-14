---
name: enhance-plugin-coordination-prompt
overview: 增强 `.codebuddy/plugin-coordination.md`，使其成为全项目级别的统一 Agent 协调中枢，包含详尽的功能需求、技术决策理由、实现细节、跨插件协作规范和状态同步机制。
todos:
  - id: analyze-existing-files
    content: 分析并比对三个协调文件（plugin-coordination.md、project-context.md、dev-status.json），确定内容边界与交叉引用策略
    status: completed
  - id: write-decision-records
    content: 编写"技术决策记录"章节：sql.js 替代理由、IIFE 选择依据、sessionStorage 安全性分析，附各决策的正确/错误示例
    status: completed
    dependencies:
      - analyze-existing-files
  - id: write-implementation-specs
    content: 编写"核心实现规范"章节：Statement 包装类完整 API 文档、防抖持久化时序说明、数据库代理对象参考表、事务使用模式
    status: completed
    dependencies:
      - analyze-existing-files
  - id: write-module-contracts
    content: 编写"模块接口契约"章节：10 个后端模块的端点清单、Zod Schema 引用、Service 函数签名、权限码映射、边界条件表
    status: completed
    dependencies:
      - analyze-existing-files
  - id: write-dataflow-and-recovery
    content: 编写"数据流全路径"和"错误恢复手册"章节：完整请求生命周期时序、5 种错误场景的逐步诊断与恢复操作指南
    status: completed
    dependencies:
      - write-implementation-specs
      - write-module-contracts
  - id: write-state-sync-and-lifecycle
    content: 编写"状态同步协议"和"开发生命周期"章节：前后端 Token 同步机制、多 Agent dev-status.json 读写协议、7 阶段开发工作流与 Agent 检查清单
    status: completed
    dependencies:
      - analyze-existing-files
  - id: write-cross-plugin-rules
    content: 编写"跨插件协作规则"章节：定义各外部插件触发时的行为协议表、与 B Admin 代码的交互边界和输出约束
    status: completed
    dependencies:
      - write-module-contracts
  - id: final-assemble-and-validate
    content: 将所有章节组装为完整的 plugin-coordination.md，验证内部一致性、与 project-context.md 无冗余冲突、所有代码示例与源码一致
    status: completed
    dependencies:
      - write-decision-records
      - write-implementation-specs
      - write-module-contracts
      - write-dataflow-and-recovery
      - write-state-sync-and-lifecycle
      - write-cross-plugin-rules
---

## 用户需求
将 `f:/项目02/.codebuddy/plugin-coordination.md` 从当前的 52 行基础规则扩展为一份完整的跨插件协作提示词，使其成为任何 Agent 接入本项目的唯一参考入口。在保持原有目标（多插件统一协调、上下文记忆共享、跨插件状态同步）不变的前提下，从以下 8 个维度全面增强：

1. **功能需求规格化** — 为每个后端模块（auth/users/roles/projects/services/workbench）定义接口契约、Zod 校验规则、边界条件和预期行为
2. **技术决策理由** — 记录关键架构选择的原因：sql.js 替代 better-sqlite3、IIFE 而非 ES Module 前端、sessionStorage 而非 localStorage
3. **实现细节** — 完整描述 sql.js Statement 包装类（get/all/run API）、200ms 防抖持久化、Pragma 配置、事务支持、db 代理对象 API
4. **跨插件协作规则** — 定义 finance/trading-agent/data-analysis/design-to-code 等插件被触发时，如何与 B Admin 项目代码交互的明确协议
5. **数据流完整规范** — 描摹请求从浏览器到 Express 到 SQLite 的完整生命周期，包括 middleware 链、controller/service 分层、错误传播机制
6. **错误恢复详细流程** — 将当前简短表格扩展为 5 种场景的逐步操作指南，含前置条件、执行步骤、验证方法
7. **状态同步协议** — 定义前后端之间（sessionStorage vs SQLite）、多个 Agent 之间（dev-status.json）的数据一致性保证机制
8. **开发生命周期** — 定义从需求分析 → PRD → 技术设计 → 开发 → 测试 → 部署的完整协调工作流

## 核心特性
- Agent 接入本项目的唯一参考入口，消除上下文歧义
- 完整的模块接口契约，Agent 可直接据此生成/修改代码
- 跨插件协作协议，确保多 Agent 并行工作时状态同步
- 可执行的错误恢复流程，降低人工介入成本

## 技术方案

### 实现策略
本任务为纯文档工程，不涉及代码修改。核心策略：基于已通过 codebase exploration 验证的项目实际代码（Express 分层架构、sql.js 单例、Zod 校验、IIFE 前端模块），将隐式约定转换为显式规范文档。

### 文档架构设计

增强后的 `plugin-coordination.md` 将按以下结构组织，确保 Agent 可以精确理解并执行开发指令：

**Section 1: 项目强制约定（保留并细化）**
- 代码风格、数据库操作、API 规范、前端约定、测试规则
- 新增：每项约定的违反后果与正确/错误示例对比

**Section 2: 技术决策记录（新增）**
- 从 `project-context.md` 提取关键决策记录并扩展理由
- 补充：sql.js Pragma 配置选择理由、防抖 200ms 的选择依据

**Section 3: 核心实现规范（新增）**
- sql.js Statement 包装类完整 API 文档（prepare/get/all/run/transaction）
- 防抖持久化协议（scheduleSave 时序图）
- 数据库代理对象完整 API 表

**Section 4: 模块接口契约（新增）**
- 10 个后端模块的端点、校验规则、响应格式、权限要求
- 每个模块包含：路由定义、Zod Schema 引用、Service 函数签名、边界条件

**Section 5: 数据流全路径（新增）**
- 浏览器 → Express middleware 链 → controller → service → db 的完整时序
- 错误传播与统一响应的机制说明

**Section 6: 错误恢复手册（扩展）**
- 5 种场景的详细恢复步骤（数据库损坏/Token过期/API不可用/npm失败/端口冲突）
- 每项包含：症状识别 → 诊断命令 → 解决步骤 → 验证方法

**Section 7: 状态同步协议（新增）**
- 前后端状态同步：sessionStorage ↔ JWT access/refresh ↔ SQLite refresh_tokens
- 多 Agent 协调：dev-status.json 读写锁约定、project-context.md 更新策略

**Section 8: 跨插件协作规则（新增）**
- 各外部插件触发时的行为协议表
- 与 B Admin 代码的交互边界定义

**Section 9: 开发生命周期（新增）**
- 7 阶段工作流（需求 → PRD → 技术设计 → 编码 → 测试 → 审核 → 部署）
- 每阶段的可验证产出物和 Agent 检查清单

### 参考的现有文件
- `plugin-coordination.md`：保留全部现有内容作为基准
- `project-context.md`：提取技术栈、决策记录、API 端点
- `dev-status.json`：引用阶段追踪数据
- `server/src/db/index.js`：提取 Statement 包装类 API
- `server/src/utils/response.js`：提取响应格式规范
- `server/src/middleware/auth.js`：提取 JWT 鉴权流程
- `server/src/routes/`：提取路由定义

### 实施注意事项
- **向后兼容**：保留现有全部内容，仅追加和扩展
- **可验证性**：所有代码示例必须与实际代码库一致（已通过 exploration 验证）
- **可执行性**：错误恢复步骤必须包含实际可运行的命令
- **去冗余**：与 `project-context.md` 交叉引用的内容使用链接而非重复
