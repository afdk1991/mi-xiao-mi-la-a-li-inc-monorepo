---
name: project-rules-memory-document
overview: 扫描整个项目生态系统（项目代码库 + CodeBuddy 全局配置 + Trae-CN 插件体系），生成一份完整的项目规则记忆文档，包含插件清单、MCP 配置详情、Agent 技能映射表、跨插件规则冲突解决方案。
todos:
  - id: generate-rules-memory
    content: 基于前期全部探索结果，将 7 章完整内容写入 f:/项目01/PROJECT-RULES-MEMORY.md，包含插件清单、MCP配置、Agent技能表、用户规则审计、代驾专属配置、6 类冲突分析及解决方案
    status: completed
---

## 用户需求

对代驾平台项目 (`f:\项目01`) 执行全量规则记忆化操作：

1. 自动扫描项目结构和代码库，识别所有已安装插件和模块
2. 统一应用 MCP 规则配置，确保各插件间的规则一致性和互操作性
3. 记忆并记录当前项目的技能 Agent 设置、插件依赖关系和配置参数
4. 生成完整的项目规则记忆文档，包含插件列表、MCP 配置详情、Agent 技能映射表，以及跨插件的规则冲突解决方案

## 产品概述

生成一份系统级的 `PROJECT-RULES-MEMORY.md` 文档，作为整个项目的"规则大脑"，记录全局插件状态、MCP 服务器配置、Agent 技能矩阵、用户级规则审计、代驾项目专属设计令牌与架构配置，并输出跨插件冲突分析及解决方案。

## 核心功能

- 全局插件清单与依赖矩阵：列出 239 个 CodeBuddy 插件 + 163 个 Trae-CN 插件的来源、启用状态和功能分类
- 同名插件冲突识别：识别两个 marketplace 中约 30+ 个重复插件，给出禁用/保留建议
- MCP 配置映射：记录当前空配置状态，列出需要 MCP 支持的插件及缺失影响，提供推荐配置
- Agent 技能映射表：solo-design 工具脚本映射、SubAgent 用途清单、Trae-CN 81 个 skill 映射
- 用户级规则审计：安全规则 V5 的 13 条对代驾项目的影响分析，金融场景叠加矩阵，前端规则与 solo-design 的兼容性评估
- 代驾项目专属配置提取：设计令牌、PWA 配置、REST API 结构、数据库 Schema、错误码体系
- 跨插件规则冲突解决方案：6 类关键冲突的根因分析和具体解决步骤
- 插件最佳实践建议：冗余插件禁用清单、缺失插件补充清单、规则执行优先级定义

## 技术方案

### 实施策略

这是一项纯文档生成任务，不涉及代码修改。基于前期已完成的全面代码库扫描和配置探索结果，直接生成 Markdown 文档写入项目根目录。

### 输出文件

| 文件路径 | 说明 |
|---------|------|
| `f:\项目01\PROJECT-RULES-MEMORY.md` | 项目规则记忆完整文档，约 6000-8000 行 |

### 文档结构

```
PROJECT-RULES-MEMORY.md
├── 头部元信息 (生成日期、项目名称、版本)
├── 1. 全局插件清单与依赖矩阵
│   ├── 1.1 插件来源概览 (2 个 Marketplace)
│   ├── 1.2 同名插件冲突矩阵 (30+ 个)
│   └── 1.3 场景规则插件启用状态
├── 2. MCP 配置映射
│   ├── 2.1 当前 MCP 状态 (CodeBuddy + Trae-CN)
│   ├── 2.2 需要 MCP 支持的插件及缺失状态
│   └── 2.3 推荐的 MCP 配置
├── 3. Agent 技能映射表
│   ├── 3.1 CodeBuddy Skills 清单
│   ├── 3.2 Trae-CN Skills 清单 (81 个)
│   ├── 3.3 solo-design 确定性工具脚本映射
│   └── 3.4 SubAgent 清单
├── 4. 用户级规则审计
│   ├── 4.1 规则分类总览
│   ├── 4.2 安全规则 V5 详细审计
│   ├── 4.3 金融场景规则叠加分析
│   └── 4.4 Web Application Development System 规则审计
├── 5. 代驾项目专属配置
│   ├── 5.1 项目结构
│   ├── 5.2 核心常量与配置
│   ├── 5.3 solo-design 设计令牌
│   ├── 5.4 PWA 配置
│   └── 5.5 测试套件
├── 6. 跨插件规则冲突分析与解决方案 (6 类冲突)
├── 7. 插件启用最佳实践建议
│   ├── 7.1 建议禁用的冗余插件
│   ├── 7.2 建议添加的插件/工具
│   └── 7.3 规则执行优先级
└── 附录 A: 插件功能分类矩阵
```

### 关键数据来源

- `C:\Users\addk1\.codebuddy\settings.json` -- 239 个启用插件
- `C:\Users\addk1\.codebuddy\mcp.json` -- MCP 空配置
- `C:\Users\addk1\.codebuddy\models.json` -- 4 个 DeepSeek 模型
- `C:\Users\addk1\.codebuddy\plugins\known_marketplaces.json` -- 2 个 marketplace
- `C:\Users\addk1\.trae-cn\plugin-config.json` -- 163 个 remote 插件
- `C:\Users\addk1\.trae-cn\skill-config.json` -- 81 个 skills
- `f:\项目01\daijia-mobile\runtime-orchestration-summary.json` -- solo-design 设计令牌
- `f:\项目01\daijia-mobile\manifest.json` -- PWA 配置
- `f:\项目01\daijia-core\includes\class-daijia-constants.php` -- 核心常量
- `f:\项目01\daijia-core\includes\class-daijia-error-handler.php` -- 错误码体系
- 用户级 always_applied_rules (安全规则 V5 + 20 场景规则)

## Agent Extensions

### Skill
- **solo-design**
  - 用途：作为本项目的核心设计技能，其设计令牌、工具脚本和验证流程已在前期探索中被完整提取，将作为文档第 5 章的主要内容
  - 预期产出：完整的设计令牌表、确定性工具映射、生成页面状态记录

### SubAgent
- **code-explorer**
  - 用途：在前期已用于全面扫描项目代码库 (69+ 文件)，所有扫描结果已收集
  - 预期产出：项目文件结构树、各 PHP 模块功能注释 (已完成)
