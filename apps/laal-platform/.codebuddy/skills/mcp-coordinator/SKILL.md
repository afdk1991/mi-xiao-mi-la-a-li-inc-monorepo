---
name: mcp-coordinator
description: This skill serves as the global MCP (Model Coordination Protocol) orchestration hub for the B Admin project (f:/项目02). It governs ALL plugins, agents, and skills operating within this workspace. Use this skill when: (1) adding or integrating new plugins/agents, (2) debugging cross-agent communication issues, (3) establishing project-wide state synchronization, (4) defining agent permissions and memory access rules, (5) setting up version-controlled documentation workflows. It sits ABOVE all project-specific skills (like b-admin-rules) and defines the meta-layer coordination rules.
---

# MCP Coordinator — 全局多 Agent 协调中枢

## 定位

MCP Coordinator 是 B Admin 项目的**元层协调系统**，位于所有插件、Agent、Skill 之上。它不定义任何具体业务规则（那属于 `b-admin-rules` 的职责），而是定义**所有 Agent 如何协同工作的协议**。

## 系统架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Coordinator (元层)                       │
│  ┌───────────────┐ ┌──────────────┐ ┌─────────────────────────┐ │
│  │ 通信协议层    │ │ 记忆总线     │ │ 插件集成契约            │ │
│  │ (protocol)    │ │ (memory bus) │ │ (plugin contract)       │ │
│  └───────┬───────┘ └──────┬───────┘ └───────────┬─────────────┘ │
│          │                │                      │               │
│  ┌───────┴───────┐ ┌──────┴───────┐ ┌───────────┴─────────────┐ │
│  │ Agent 注册表  │ │ 状态管理器   │ │ 版本同步                │ │
│  │ (registry)    │ │ (state mgr)  │ │ (version sync)          │ │
│  └───────────────┘ └──────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   项目技能层 (Domain Skills)                      │
│  ┌──────────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ b-admin-rules    │ │ (future       │ │ (future              │ │
│  │ (项目强制约定)   │ │  skill B)     │ │  skill C)            │ │
│  └──────────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   外部插件层 (External Plugins)                   │
│  finance  trading-agent  data-analysis  design-to-code  ...     │
└─────────────────────────────────────────────────────────────────┘
```

## When to Use This Skill

Always load this skill when:

1. Any new plugin or agent is being added to the project workspace — follow the integration contract
2. Cross-agent communication is needed — follow the protocol specification
3. State needs to be shared between agents — use the memory bus
4. Project-wide decisions affect multiple agents — update the registry
5. Documentation must stay in sync with code — follow version sync protocols

## How to Use This Skill

Follow this loading priority for any coordination task:

1. Read `references/architecture.md` first — understand the overall data flow and module relationships
2. Read `references/mcp-protocol.md` — understand how agents communicate
3. Read `references/agent-registry.md` — know what agents exist and their permissions
4. Read `references/memory-structure.md` — understand how agent memories are stored and accessed
5. Read `references/plugin-contract.md` — follow this when integrating new plugins
6. Read `references/state-machine.md` — understand project state lifecycle
7. Read `references/version-sync.md` — ensure documentation stays current
8. Read `references/engine.md` — runtime engine architecture and API reference

## Runtime Engine

MCP 协调器规范已实现为运行时引擎，位于 `server/src/mcp/` 目录。详见 `references/engine.md`。

### 模块清单

| 模块 | 文件 | 职责 |
|------|------|------|
| 协议引擎 | `server/src/mcp/protocol.js` | Zod Schema 验证、消息构建、错误码映射、重试/降级 |
| 记忆总线 | `server/src/mcp/memory-bus.js` | 4 级作用域 CRUD、原子写入、TTL 清理、快照 |
| 注册中心 | `server/src/mcp/registry.js` | Agent 注册/发现、权限验证、生命周期管理 |
| 任务编排 | `server/src/mcp/task-orchestrator.js` | 12 阶段状态机、依赖验证、任务分解调度 |
| 配置中心 | `server/src/mcp/config.js` | 路径、TTL 策略、原子写入参数 |
| 统一入口 | `server/src/mcp/index.js` | 所有模块统一导出 + getCoordinator() 工厂 |

### 测试状态

4 测试套件, 113 测试用例, 全部通过。

### CLI 管理

```bash
npm run mcp:admin -- agent list|register|status
npm run mcp:admin -- memory clean|snapshot|restore
```

## Core Principles (ALL Agents MUST Follow)

### 1. Single Source of Truth

Every type of information has exactly ONE canonical location:

| Information Type | Canonical Location | Update Authority |
|-----------------|-------------------|------------------|
| Project code rules | `b-admin-rules/SKILL.md` | Any agent, with review |
| API contracts | `b-admin-rules/references/api-contracts.md` | Backend agents only |
| DB schema | `b-admin-rules/references/database-rules.md` | Backend agents only |
| Agent registry | `mcp-coordinator/references/agent-registry.md` | MCP Coordinator only |
| Project state | `.codebuddy/dev-status.json` | Any agent, read-first-then-write |
| Project context | `.codebuddy/project-context.md` | Any agent, atomic updates |
| Plugin permissions | `mcp-coordinator/references/plugin-contract.md` | MCP Coordinator only |
| ADR records | `b-admin-rules/references/adr.md` | Any agent, append-only |
| Agent memories | `.codebuddy/memories/<agent-id>.json` | Respective agent only |

### 2. Communication Hierarchy

```
Agent A → Message (follows mcp-protocol.md)
       → via Memory Bus (write to .codebuddy/memories/)
       → Agent B reads from Memory Bus
       → Agent B acknowledges (update read receipt)
```

Direct file modification by one agent of another agent's state file is FORBIDDEN. All inter-agent state sharing goes through the Memory Bus.

### 3. Permission Model

Every agent operates at one of three trust levels:

| Level | Scope | Examples |
|-------|-------|----------|
| **Coordinator** | Read/write ALL project files | MCP Coordinator, Lead Orchestrator |
| **Domain** | Read/write specific domain files | b-admin-rules skill, backend agent, frontend agent |
| **External** | Read project data, write INDEPENDENT files only | finance, trading-agent, data-analysis plugins |

### 4. Version Control

All coordination documents are version-tracked through `dev-status.json`. Every change to the coordination layer increments the relevant version marker. See `references/version-sync.md` for the complete protocol.

### 5. Extensibility

New plugins integrate via the **Plugin Integration Contract** (`references/plugin-contract.md`). Process:
1. Plugin author reads the contract
2. Implements the required interface (at minimum: capability declaration, memory spec, output format)
3. Registers in agent-registry.md
4. Gets assigned a permission level
5. Onboards to the memory bus
6. First run validates against contract

## Quick Decision Tree

```
New task received:
├─ Modifying B Admin code?
│  └─ Load b-admin-rules skill FIRST
├─ Adding a new plugin?
│  └─ Read plugin-contract.md → Register → Assign permissions
├─ Agent-to-agent communication needed?
│  └─ Follow mcp-protocol.md → Use memory bus
├─ State change across agents?
│  └─ Update dev-status.json → Notify via memory bus
├─ Documentation out of sync?
│  └─ Run version-sync.md reconciliation
└─ Unknown agent behavior?
   └─ Check agent-registry.md → Verify permissions
```

## Directory Inventory

```
.codebuddy/
├── plugin-coordination.md          ← Human-readable coordination overview
├── project-context.md              ← Project memory (auto-updated)
├── dev-status.json                 ← Phase tracking (multi-agent shared)
├── plans/                          ← Past and current development plans
├── agents/                         ← Agent definition files (.md)
├── memories/                       ← Agent memory bus storage (.json)
├── skills/
│   ├── mcp-coordinator/            ← THIS SKILL — global orchestration
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── architecture.md      ← System architecture & data flow
│   │       ├── mcp-protocol.md      ← Communication protocol spec
│   │       ├── agent-registry.md    ← All agent types & permissions
│   │       ├── memory-structure.md  ← Memory bus design
│   │       ├── plugin-contract.md   ← New plugin integration contract
│   │       ├── state-machine.md     ← Project state transitions
│   │       └── version-sync.md      ← Documentation sync protocol
│   └── b-admin-rules/              ← Project-specific mandatory rules
│       ├── SKILL.md
│       └── references/
│           ├── adr.md
│           ├── api-contracts.md
│           ├── checklist.md
│           ├── cross-plugin-rules.md
│           ├── database-rules.md
│           ├── error-recovery.md
│           └── state-sync.md
```
