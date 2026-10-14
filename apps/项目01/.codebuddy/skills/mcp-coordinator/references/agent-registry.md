# Agent 注册表 — 全系统 Agent 清单、角色与权限矩阵

## 注册表概述

本注册表是 B Admin 项目中所有 Agent 的权威清单。每个 Agent 在此声明其身份、角色、能力范围、权限边界和通信偏好。新 Agent 接入前必须在此注册。

## Agent 分类

### 第 0 级：协调层 (Coordination Layer)

| Agent ID | 类型 | Skill/定义 | 职责 | 状态 |
|----------|------|-----------|------|------|
| `mcp-coordinator` | coordinator | `skills/mcp-coordinator/SKILL.md` | 全局 Agent 编排、协议治理、注册表维护 | active |
| `lead-orchestrator` | coordinator | 内置 | 研究任务分解、子Agent调度、最终报告整合 | active |

**权限**: 对所有文件完全的读写权限。

### 第 1 级：领域层 — 项目核心 (Domain Layer — Project Core)

| Agent ID | 类型 | Skill/定义 | 职责 | 状态 |
|----------|------|-----------|------|------|
| `b-admin-rules` | domain | `skills/b-admin-rules/SKILL.md` | 项目强制约定执行、代码规范审查 | active |
| `backend-agent` | domain | `agents/backend-agent.md`* | 后端代码生成、API开发、数据库操作 | planned |
| `frontend-agent` | domain | `agents/frontend-agent.md`* | 前端代码生成、UI开发、IIFE模块 | planned |
| `test-agent` | domain | `agents/test-agent.md`* | 测试编写、Jest配置、覆盖率检查 | planned |
| `review-agent` | domain | `agents/review-agent.md`* | 代码审查、安全审计、性能检查 | planned |

(*) 标记为 planned 的 Agent 定义文件尚未创建，将在对应开发阶段生成。

### 第 2 级：领域层 — 外部插件 (Domain Layer — External Plugins)

| Agent ID | 类型 | Skill/定义 | 接入方式 | 数据权限 | 状态 |
|----------|------|-----------|---------|---------|------|
| `finance-analyst` | external | `finance@cb-teams-marketplace` | marketplace plugin | 只读数据库 | active |
| `trading-agent` | external | `trading-agent@cb-teams-marketplace` | marketplace plugin | 只读数据库 | active |
| `ai-hedge-fund` | external | `ai-hedge-fund@cb-teams-marketplace` | marketplace plugin | 只读数据库 | active |
| `data-analyst` | external | `data-analysis@cb-teams-marketplace` | marketplace plugin | 只读SQLite | active |
| `product-manager` | external | `product-management@cb-teams-marketplace` | marketplace plugin | API读写(projects/services) | active |
| `design-converter` | external | `design-to-code@cb-teams-marketplace` | marketplace plugin | 读写b-admin/ | active |
| `investment-banker` | external | `investment-banking@cb-teams-marketplace` | marketplace plugin | 只读 | active |
| `equity-researcher` | external | `equity-research@cb-teams-marketplace` | marketplace plugin | 只读 | active |
| `pe-analyst` | external | `private-equity@cb-teams-marketplace` | marketplace plugin | 只读 | active |
| `wealth-manager` | external | `wealth-management@cb-teams-marketplace` | marketplace plugin | 只读 | active |
| `spglobal-analyst` | external | `spglobal@cb-teams-marketplace` | marketplace plugin | 只读 | active |
| `lseg-analyst` | external | `lseg@cb-teams-marketplace` | marketplace plugin | 只读 | active |
| `cloudbase-deployer` | external | `cloudbase@cb-teams-marketplace` | marketplace plugin | 读取配置 | active |
| `video-generator` | external | `remotion-video-generator@cb-teams-marketplace` | marketplace plugin | 只读 | active |

### 辅助 Agent (Task Delegation)

| Agent ID | 类型 | 定义 | 职责 | 状态 |
|----------|------|------|------|------|
| `code-explorer` | support | 内置 | 代码库搜索、文件结构分析 | active |
| `research-subagent` | support | `plugins/deep-research/agents/research-subagent.md` | Web搜索、信息收集 | active |

---

## 权限矩阵

### 文件系统权限

| Agent | 项目代码<br>(server/ b-admin/) | 配置<br>(.codebuddy/) | 数据库<br>(data/) | 记忆<br>(memories/) | 输出<br>(*.html *.xlsx) | Agent定义<br>(agents/) |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| mcp-coordinator | R/W | R/W | R/W | R/W | R/W | R/W |
| lead-orchestrator | R/W | R/W | R/W | R/W | R/W | R/W |
| b-admin-rules | R/W | R/W | R/W | R/W | R/W | R |
| backend-agent | R/W | R | R/W | R/W (own) | R/W | R |
| frontend-agent | R/W | R | R | R/W (own) | R/W | R |
| test-agent | R/W | R | R (via memory) | R/W (own) | R/W | R |
| review-agent | R | R | R | R/W (own) | R | R/W |
| 所有 external | R* | R | R (read-only) | R/W (own) | R/W | R |

(*) 外部插件对项目代码的写入权限见跨插件规则矩阵。

### 跨插件写入权限明细

| 外部插件 | server/ | b-admin/ | DB 结构 | API 写入 | 独立输出 |
|----------|:---:|:---:|:---:|:---:|:---:|
| product-manager | NO | NO | NO | YES (projects, services) | YES |
| design-converter | NO | YES | NO | NO | YES |
| cloudbase-deployer | NO | NO | NO | NO | 部署配置 |
| 其他所有 external | NO | NO | NO | NO | YES |

### 操作权限

| 操作 | Coordinator | Domain Agent | External Plugin |
|------|:-----------:|:------------:|:---------------:|
| 创建新文件 | YES | YES (own domain) | YES (own output) |
| 修改项目文件 | YES | YES (own domain) | LIMITED |
| 删除文件 | YES | NO | NO |
| 读取数据库 | YES | YES | YES (read-only) |
| 写入数据库 | YES | YES (via API) | NO |
| 修改数据库结构 | YES | YES (via migration) | NO |
| 注册新 Agent | YES | NO | NO |
| 更新 dev-status.json | YES | YES | NO |
| 发送广播消息 | YES | NO | NO |

---

## Agent 生命周期

```
注册 (registered)
  → 活跃 (active)      ← 正在执行任务
  → 空闲 (idle)        ← 等待任务分配
  → 暂停 (paused)      ← 被协调器暂停
  → 错误 (error)        ← 执行异常
  → 终止 (terminated)   ← 任务完成或手动终止
```

### 状态转换规则

- `registered → active`: Agent 启动，写入心跳
- `active → idle`: 任务完成，无待处理任务
- `idle → active`: 收到新任务
- `any → paused`: 协调器发送暂停指令
- `paused → active/idle`: 协调器发送恢复指令
- `any → error`: 未捕获异常
- `error → active`: 错误恢复（需协调器确认）
- `any → terminated`: 任务完成/会话结束

---

## 注册流程

### 新 Agent 注册步骤

1. 创建 Agent 定义文件于 `agents/<agent-id>.md`
2. 在本注册表中添加记录（`agent-registry.md`）
3. 如为外部插件，遵循 `plugin-contract.md`
4. 在记忆总线创建注册文件：`memories/<agent-id>.json`
5. 协调器验证注册信息完整性和权限合理性
6. Agent 状态设为 `active` 或 `planned`

### 注册信息模板

```yaml
agentId: "unique-id"
agentType: "coordinator | domain | external | support"
displayName: "Human-readable name"
skillId: "skill-name or null"
definitionFile: "path/to/agent-definition.md"
capabilities:
  - "capability-1"
  - "capability-2"
permissions:
  fileSystem: "R | R/W | LIMITED"
  database: "R | R/W | NONE"
  api: "R | R/W | NONE"
  memory: "R/W (own) | R/W (all) | NONE"
status: "active | planned | deprecated"
registeredAt: "ISO-8601"
registeredBy: "agent-id of registrar"
```
