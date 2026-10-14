# MCP 引擎 — 运行时架构文档

## 概述

MCP 引擎是 mcp-coordinator 技能的运行时实现，将 `.codebuddy/skills/mcp-coordinator/references/` 中的规范文档转化为可执行的 Node.js 代码。引擎位于 `server/src/mcp/` 目录下，作为独立模块嵌入现有 Express 服务器。

## 模块架构

```
server/src/mcp/
├── config.js               # 引擎配置：路径、TTL 映射、清理间隔、原子写入参数
├── protocol.js             # 协议引擎：Zod Schema 定义、消息构建器、错误码映射、重试/降级
├── memory-bus.js           # 记忆总线：4 级作用域 CRUD、原子写入、TTL 清理、快照恢复
├── registry.js             # 注册中心：Agent 自注册、能力发现、权限验证、生命周期
├── task-orchestrator.js    # 任务编排器：阶段状态机、依赖验证、任务分解、并发调度
└── index.js                # 统一导出入口
```

## 模块关系图

```
config.js （配置常量）
    ↓ 被所有模块引用
    ├── protocol.js ──────────────────────────┐
    ├── memory-bus.js ──→ registry.js ──────→ │
    │       ↑                  │              │
    │       └──────────────────┘              │
    ├── registry.js                           │
    └── task-orchestrator.js ─────────────────┤
                                             ↓
                                        index.js
                                    （统一导出 + 工厂函数）
```

## API 参考

### config.js

集中定义引擎常量，单一配置源。

导出: `MCP_CONFIG` 对象，包含 `projectRoot`, `memoryRoot`, `scopes`, `ttl`, `atomicWrite`, `heartbeat`, `protocol`, `logPrefix`, `cleanupInterval` 等字段。

```javascript
import MCP_CONFIG from './config.js'
console.log(MCP_CONFIG.memoryRoot) // → f:/项目02/.codebuddy/memories
```

### protocol.js

实现消息协议层标准（参考 `mcp-protocol.md`）。

**Zod Schema 导出**:
- `MessageEnvelopeSchema` — 完整消息信封 Schema
- `SenderSchema`, `RecipientSchema`, `HeaderSchema`, `BodySchema` — 子组件 Schema
- `MESSAGE_TYPES` — 12 种消息类型枚举

**消息构建器**:
- `buildMessage(type, payload, sender, recipient, options)` — 构建标准消息
- `buildResponse(correlationId, payload, sender, recipient, type)` — 构建关联响应
- `buildErrorNotification(code, detail, sender, recipient, correlationId)` — 构建错误通知

**验证函数**:
- `validateMessage(message)` — 完整 Schema 验证
- `validateHeader(header)` — 仅验证消息头
- `isExpired(message)` — 检查消息 TTL 是否过期

**错误处理**:
- `MCP_ERRORS` — MCP-001 到 MCP-010 完整错误码映射表
- `createMCPError(code, detail)` — 创建带 MCP 错误码的 Error 实例
- `withRetry(fn, options)` — 递增间隔重试包装器（默认 1s/3s/10s）
- `ChannelFallbackManager` — 通道降级管理器（memory-bus → file-signaling → shared-state → direct-context → 独立模式）

**通道降级逻辑**:
```
memory-bus → file-signaling → shared-state → direct-context → null（独立模式）
```

### memory-bus.js

实现 4 级作用域记忆总线（参考 `memory-structure.md`）。

**路径函数**:
- `scopePath(scope, agentId)` — 解析作用域到文件系统路径。agentId 可选，用于 agents/registrations 作用域
  - `scopePath('system')` → `{memoryRoot}/_system`
  - `scopePath('agents')` → `{memoryRoot}/agents`（基目录）
  - `scopePath('agents', 'agent-1')` → `{memoryRoot}/agents/agent-1`（特定 agent 目录）

**CRUD API**:
- `readMemory(scope, key, readerAgentId, readerAgentType)` — 读取记忆（含 TTL 过期检查）
- `writeMemory(scope, key, data, writerAgentId, writerAgentType, ttl)` — 写入记忆（含原子写入）
- `deleteMemory(scope, key, callerAgentId, callerType)` — 删除记忆
- `listMemory(scope, readerAgentId, readerType)` — 列出作用域内所有记忆键名

**原子写入**:
- `atomicWrite(filePath, data)` — 三段式原子写入：临时文件 → fsync → 重命名

**TTL 管理**:
- `cleanExpired(scopes)` — 惰性 + 定时清理过期记忆
- `startTTLCleaner(intervalMs)` — 启动定时清理器（默认 300 秒）
- `stopTTLCleaner()` — 停止定时清理器

**快照**:
- `createSnapshot(agentId, snapshotData)` — 创建上下文快照
- `restoreSnapshot(agentId, snapshotId)` — 恢复上下文快照

**Agent 专用**:
- `readAgentState(agentId)` — 读取 Agent 状态文件
- `writeAgentState(agentId, state)` — 写入 Agent 状态文件
- `createTaskRecord(agentId, task)` — 创建任务记录

**访问控制矩阵**:
| 作用域 | create | read | update | delete | list |
|--------|--------|------|--------|--------|------|
| system | coordinator only | all | coordinator only | none | all |
| shared | all | all | all | none | all |
| agents | coordinator or self | coordinator or self | coordinator or self | coordinator or self | coordinator or self |
| registrations | self only | all | self only | none | all |

### registry.js

实现 Agent 注册与生命周期管理（参考 `agent-registry.md` 和 `plugin-contract.md`）。

**注册与发现**:
- `register(agentId, registration, registrarAgentId)` — 注册新 Agent（写入 registrations + agents 状态文件）
- `discover(filter)` — 发现符合条件的 Agent（带 Map 缓存）
- `listActiveAgents()` — 列出所有活跃 Agent
- `listAgentsByType()` — 按类型分组列出 Agent
- `exportRegistryTable()` — 导出注册表为 Markdown 表格

**权限验证**:
- `checkPermission(agentId, operation, target)` — 四维权限验证（文件系统/数据库/API/记忆）
- `PERMISSION_MATRIX` — 四维权限矩阵定义（coordinator/domain/external/support）

**生命周期管理**:
- `updateStatus(agentId, newStatus)` — 更新 Agent 状态（含转换验证）
- `getStatus(agentId)` — 获取 Agent 当前状态
- `validateTransition(current, target)` — 验证状态转换合法性
- `sendHeartbeat(agentId)` — 发送心跳
- `checkHeartbeat(agentId)` — 检查心跳状态

**Agent 状态机**:
```
registered → active → idle ←→ paused
                ↓        ↓
              error → terminated(终态)
```
- `STATUS_TRANSITIONS` — 状态转换矩阵
- `AGENT_STATUSES` — 6 种 Agent 状态枚举

### task-orchestrator.js

实现任务分解与编排调度（参考 `state-machine.md`）。

**阶段定义**:
- `PHASES` — 12 个开发阶段清单
- `PHASE_DEPENDENCIES` — 阶段依赖图
- `STATE_TRANSITIONS` — 状态转换矩阵

**编排函数**:
- `validateTransition(phase, from, to)` — 验证状态转换合法性
- `checkDependencies(phase, dependencyGraph)` — 检查前置阶段完成状态
- `decomposeTask(description)` — 将高层任务分解为子任务列表
- `scheduleExecution(tasks)` — 生成并行/顺序调度计划

**Gate Check**:
- `executeGateCheck(phase, checklist)` — 执行阶段完成条件检查
- `PHASE_GATES` — 各阶段 Gate Check 清单

### index.js

统一导出入口和工厂函数。

```javascript
import { getCoordinator } from './mcp/index.js'
const coordinator = getCoordinator()
```

`getCoordinator()` 返回包含所有模块 API 的协调器实例，方便外部统一调用。

## 使用指南

### 快速开始

```javascript
// 引入协调器
import { getCoordinator } from './server/src/mcp/index.js'
const mcp = getCoordinator()

// 注册 Agent
await mcp.registry.register('my-agent', {
  agentType: 'domain',
  capabilities: ['data-analysis'],
  displayName: 'My Agent'
})

// 构建消息
const msg = mcp.protocol.buildMessage('request.task',
  { action: 'analyze', target: 'sales-data' },
  { agentId: 'my-agent', agentType: 'domain', skillId: null },
  { agentId: 'data-analyst', agentType: 'external' }
)

// 写入记忆
await mcp.memory.writeMemory('shared', 'analysis-001',
  { result: 'completed', data: {...} },
  'my-agent', 'domain',
  new Date(Date.now() + 24 * 3600 * 1000).toISOString()
)

// 启动 TTL 清理器
mcp.memory.startTTLCleaner(300000)
```

### CLI 管理工具

通过 `npm run mcp:admin` 运行管理工具：

```bash
# 列出所有注册 Agent
npm run mcp:admin -- agent list

# 注册新 Agent
npm run mcp:admin -- agent register --agent-id=my-agent --type=domain

# 更新 Agent 状态
npm run mcp:admin -- agent status --agent-id=my-agent --status=idle

# TTL 清理
npm run mcp:admin -- memory clean

# 创建快照
npm run mcp:admin -- memory snapshot --agent-id=my-agent

# 查看阶段
npm run mcp:admin -- phase list

# 分解任务
npm run mcp:admin -- task decompose --description="实现用户认证模块"
```

### 测试

```bash
# 运行所有 MCP 引擎测试
npm run test -- --testPathPattern='server/tests/mcp/'

# 结果: 4 测试套件, 113 测试用例, 全部通过
```

## 设计决策

1. **零额外依赖**：仅使用项目已有的 uuid 和 zod，文件操作基于 Node.js 内置模块
2. **JSON 文件存储**：与规范文档设计一致，不使用数据库
3. **原子写入保证**：临时文件 → fsync → 重命名三段式，确保崩溃安全
4. **ESM 单例模块**：通过模块级变量管理状态，import 即用
5. **协调器权限优先**：coordinator 类型 Agent 绕过所有权限检查，确保管理层操作不受限
6. **TTL 惰性+定时双重清理**：读取时检查单个记忆过期 + 定时器批量扫描
