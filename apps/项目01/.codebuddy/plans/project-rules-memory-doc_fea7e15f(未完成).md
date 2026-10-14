---
name: project-rules-memory-doc
overview: 生成项目规则记忆文档：汇总所有插件、MCP配置、Agent技能映射、规则冲突及解决方案。
todos:
  - id: pack-codebase
    content: 使用 [mcp:codebuddy-plugins-official/repomix-mcp/repomix] 的 pack_codebase 打包项目生成结构化文件清单和统计
    status: pending
  - id: query-docs
    content: 使用 [mcp:codebuddy-plugins-official/context7/context7] 查询 WordPress Plugin API 与 CodeBuddy 插件命名规范
    status: pending
  - id: compile-plugin-inventory
    content: 编译三大来源完整插件清单：CodeBuddy 239插件（按类别分组）+ Trae-CN 163插件 + 81 marketplace技能，标注重复项
    status: pending
    dependencies:
      - pack-codebase
      - query-docs
  - id: analyze-conflicts
    content: 分析并编写 5 类跨插件规则冲突：同名插件冲突矩阵、MCP依赖断裂、金融服务场景叠加、样式优先权、安全规则覆盖
    status: pending
    dependencies:
      - compile-plugin-inventory
  - id: build-agent-skill-matrix
    content: 构建 Agent 技能映射表：solo-design 版本/子项目/工具链映射、质量门控配置、设计令牌汇总
    status: pending
    dependencies:
      - compile-plugin-inventory
  - id: write-solutions
    content: 编写每类冲突的解决方案：版本优先级建议、MCP配置模板、场景去重策略、样式隔离规则、安全规则分层建议
    status: pending
    dependencies:
      - analyze-conflicts
  - id: finalize-document
    content: 汇编完整 PROJECT-RULES-MEMORY.md 文档并写入 f:\项目01\PROJECT-RULES-MEMORY.md
    status: pending
    dependencies:
      - build-agent-skill-matrix
      - write-solutions
---

## 用户需求

生成完整的项目规则记忆文档 `PROJECT-RULES-MEMORY.md`，涵盖以下核心内容：

1. **项目识别信息**：项目名称、技术栈、目录结构、品牌令牌
2. **完整插件清单**：CodeBuddy 插件（239个）、Trae-CN 远程插件（163个）、Marketplace 技能（81个），按来源、类别、状态分类
3. **MCP 配置详情**：当前 MCP 服务器配置状态、依赖 MCP 的插件清单、配置缺口分析
4. **Agent 技能映射表**：solo-design 技能版本与子项目映射、确定性工具链（6个 .mjs 脚本）、页面生成质量门控
5. **跨插件规则冲突分析**：同名插件冲突（15+ 对）、MCP 依赖断裂、金融服务场景叠加、样式规则优先级、安全规则覆盖
6. **冲突解决建议**：每类冲突的具体解决方案和优先级排序

## 产品概述

这是一份纯文档生成任务，不涉及任何代码修改。目标文件为 `f:\项目01\PROJECT-RULES-MEMORY.md`，将作为项目的单一真相来源（Single Source of Truth），记录所有插件、技能、配置和规则依赖关系。

## 核心功能

- 自动汇总前置扫描阶段收集的所有配置数据
- 按维度（来源、类别、状态）分类展示插件和技能
- 识别跨 marketplace 同名插件冲突并给出版本优先建议
- 标注 MCP 依赖断裂点并提供配置模板
- 生成 Agent 技能映射矩阵表
- 输出可执行的冲突解决优先级路线图

## 技术方案

### 实现策略

采用纯文档编译方式：将前置扫描阶段收集的全部结构化数据（JSON 配置、文件树、规则清单）按预设模板组织为 Markdown 文档。无需运行任何代码或脚本。

### 文档结构设计

文档分为 8 个主章节：

1. **项目识别** — 从扫描结果中提取项目元数据
2. **插件清单** — 三大来源（CodeBuddy marketplace、Trae-CN remote、Marketplace skills）分类展示
3. **MCP 配置与依赖** — MCP 现状、依赖矩阵、缺失标注
4. **Agent 技能映射** — solo-design 使用详情、确定性工具链、质量门控配置
5. **跨插件规则冲突** — 逐一列举 5 类冲突及影响评估
6. **冲突解决建议** — 每类冲突的具体修复方案
7. **附录** — 配置参考模板、版本对照表

### 数据来源映射

| 数据类型 | 来源文件 | 用途 |
|---------|---------|------|
| 项目结构 | code-explorer 子代理扫描结果 | 第1章 |
| CodeBuddy 插件 | `C:\Users\addk1\.codebuddy\settings.json` | 第2章 |
| Trae-CN 插件 | `C:\Users\addk1\.trae-cn\installed-plugins.json` | 第2章 |
| 技能管理 | `C:\Users\addk1\.trae-cn\skill-config.json` | 第2章 |
| Marketplace 来源 | `C:\Users\addk1\.codebuddy\plugins\known_marketplaces.json` | 第2章 |
| MCP 配置 | `C:\Users\addk1\.codebuddy\mcp.json` | 第3章 |
| AI 模型 | `C:\Users\addk1\.codebuddy\models.json` | 第1章 |
| solo-design 快照 | `daijia-mobile/runtime-orchestration-summary.json` | 第4章 |
| solo-design 快照 | `daijia-admin-dashboard/runtime-orchestration-summary.json` | 第4章 |
| solo-design 快照 | `daijia-website/runtime-orchestration-summary.json` | 第4章 |
| PWA 清单 | `daijia-mobile/manifest.json` | 第1章 |
| 项目审计报告 | `AUDIT-REPORT-20260802.md` | 交叉引用 |
| 用户级规则 | always_applied_user_rules (system prompt) | 第2/5章 |

### 冲突分析算法

1. 对 CodeBuddy 和 Trae-CN 插件名做交集运算，识别同名插件
2. 对 MCP 工具声明做反向索引，找出所有引用不存在 MCP 服务器的插件
3. 对场景规则做类别聚类，识别金融服务场景的过度叠加
4. 对比 solo-design CSS 变量命名与全局前端规则中的样式指令

## 使用的扩展能力

### MCP

- **codebuddy-plugins-official/repomix-mcp/repomix** (pack_codebase)
  - 用途：将 `f:\项目01` 的完整代码库打包为结构化输出，用于提取项目文件清单和大小统计
  - 预期结果：获得项目文件树、行数统计、语言分布数据

- **codebuddy-plugins-official/context7/context7** (resolve-library-id + query-docs)
  - 用途：查询 WordPress Plugin API 和 CodeBuddy 插件系统的文档规范，确保文档引用的 API 和约定准确
  - 预期结果：获得官方文档支持的插件命名规范和配置格式参考

### Skill

- **repomix-mcp** (generate_skill 参考)
  - 用途：参照其输出结构（SKILL.md + references/ 格式），设计 PROJECT-RULES-MEMORY.md 的文档骨架
  - 预期结果：文档结构对齐业界最佳实践，便于后续自动化索引
