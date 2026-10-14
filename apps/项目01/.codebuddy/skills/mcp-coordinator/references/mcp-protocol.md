# MCP 通信协议规范

## 协议概述

MCP (Model Coordination Protocol) 是 B Admin 项目中所有 Agent、Skill、Plugin 之间的标准化通信协议。它定义了消息格式、通信通道、发现机制和错误处理。

## 消息格式

### 标准消息信封

所有 Agent 间通信消息遵循统一的 JSON 信封格式：

```json
{
  "header": {
    "protocol": "mcp/v1",
    "messageId": "uuid-v4",
    "correlationId": "uuid-v4 | null",
    "timestamp": "ISO-8601",
    "sender": {
      "agentId": "string",
      "agentType": "coordinator | domain | external",
      "skillId": "string | null"
    },
    "recipient": {
      "agentId": "string | * (broadcast)",
      "agentType": "string | null"
    },
    "priority": "low | normal | high | critical",
    "ttl": "ISO-8601 duration | null"
  },
  "body": {
    "type": "message type identifier",
    "payload": {},
    "contentType": "application/json"
  },
  "signature": {
    "hash": "sha256 of body",
    "timestamp": "ISO-8601"
  }
}
```

### 消息类型定义

| Type | 用途 | 方向 | 预期响应 |
|------|------|------|---------|
| `request.task` | 请求 Agent 执行任务 | 单向 | `response.task` |
| `response.task` | 任务执行结果 | 单向 | 无 |
| `notify.state` | 状态变更通知 | 广播 | `ack.state` |
| `ack.state` | 状态确认 | 单向 | 无 |
| `query.context` | 查询上下文/记忆 | 请求-响应 | `response.context` |
| `response.context` | 上下文查询结果 | 单向 | 无 |
| `notify.event` | 事件通知 | 广播 | 无 |
| `request.permission` | 权限申请 | 请求-响应 | `response.permission` |
| `response.permission` | 权限审批结果 | 单向 | 无 |
| `notify.error` | 错误通知 | 单向 | 无 |
| `heartbeat` | 心跳/存活检测 | 广播 | `heartbeat.ack` |
| `heartbeat.ack` | 心跳确认 | 单向 | 无 |

## 通信通道

### 通道类型

```
┌─────────────────────────────────────────────────────┐
│ 通道 1: 记忆总线 (Memory Bus)                        │
│ 路径: .codebuddy/memories/<agent-id>.json           │
│ 模式: 异步写入 / 轮询读取                            │
│ 用途: Agent 间状态共享、上下文传递                    │
│ 延迟: ~秒级 (取决于 Agent 轮询间隔)                   │
├─────────────────────────────────────────────────────┤
│ 通道 2: 文件信令 (File Signaling)                    │
│ 路径: .codebuddy/memories/signals/<signal-id>.json  │
│ 模式: 写入信号文件 + 轮询检测                        │
│ 用途: 任务委托、事件通知                              │
│ 延迟: ~秒级                                          │
├─────────────────────────────────────────────────────┤
│ 通道 3: 共享状态 (Shared State)                      │
│ 路径: .codebuddy/dev-status.json                    │
│ 模式: 读写锁 (read-first-then-write)                 │
│ 用途: 项目阶段状态同步                                │
│ 延迟: 实时 (同一会话内)                               │
├─────────────────────────────────────────────────────┤
│ 通道 4: 直接上下文 (Direct Context)                   │
│ 路径: Agent Team 内部 send_message                   │
│ 模式: 同步消息传递                                    │
│ 用途: 同一 Team 内 Agent 间实时通信                   │
│ 延迟: 实时                                            │
└─────────────────────────────────────────────────────┘
```

### 通道选择规则

| 场景 | 推荐通道 | 原因 |
|------|---------|------|
| 跨会话状态共享 | 记忆总线 | 持久化，跨会话可见 |
| 任务委托 | 文件信令 | 明确的任务边界 |
| 项目阶段追踪 | 共享状态 | 单一真相来源 |
| Team 内协作 | 直接上下文 | 最低延迟 |
| 外部插件报告 | 记忆总线 | 异步，不阻塞 |
| 紧急通知 | 文件信令 (priority: critical) | 可被快速轮询 |

## 发现机制

### Agent 自注册

每个 Agent 启动时在记忆总线写入注册信息：

```json
{
  "agentId": "unique-agent-id",
  "agentType": "domain",
  "skillId": "b-admin-rules",
  "capabilities": ["code-generation", "code-review", "database-ops"],
  "status": "active",
  "registeredAt": "2026-08-02T23:00:00Z",
  "heartbeatInterval": "PT5M",
  "contactChannel": "memory-bus",
  "workspace": "f:/项目02"
}
```

### Agent 发现

Agent 通过扫描 `.codebuddy/memories/` 中其他 Agent 的注册信息来发现对等方：

1. 扫描所有 `*.json` 文件
2. 过滤出包含 `"type": "agent-registration"` 的文件
3. 根据 `status` 过滤活跃 Agent
4. 建立本地 Agent 目录

## 错误处理

### 错误码体系

| 错误码 | 含义 | 处理方式 |
|--------|------|---------|
| `MCP-001` | 消息格式无效 | 记录日志，丢弃消息 |
| `MCP-002` | 接收方不可达 | 重试 3 次，间隔递增 |
| `MCP-003` | 权限不足 | 拒绝操作，通知发送方 |
| `MCP-004` | 通道不可用 | 降级到备用通道 |
| `MCP-005` | TTL 过期 | 丢弃消息 |
| `MCP-006` | 签名验证失败 | 记录安全事件 |
| `MCP-007` | 协议版本不兼容 | 协商降级版本 |
| `MCP-008` | 任务执行失败 | 返回错误详情 |
| `MCP-009` | 状态冲突 | 使用乐观锁重试 |
| `MCP-010` | 资源耗尽 | 限流，排队等待 |

### 重试策略

```
第 1 次失败: 等待 1s  → 重试
第 2 次失败: 等待 3s  → 重试
第 3 次失败: 等待 10s → 重试
第 4 次失败: 标记为 failure → 通知协调器
```

### 降级策略

当主通道不可用时：
- 记忆总线不可用 → 降级到文件信令
- 文件信令不可用 → 降级到直接文件写入
- 所有通道不可用 → Agent 进入独立模式（本地操作，恢复后同步）

## 安全规范

1. **消息签名**：关键消息附带 SHA-256 签名，接收方验证完整性
2. **Agent 身份**：通过 `agentId` + 注册时间戳唯一标识
3. **权限验证**：每次操作前检查 agent-registry.md 中的权限矩阵
4. **审计日志**：所有跨 Agent 通信记录在 `operation_logs` 表中
5. **TTL 管理**：消息必须设置 TTL，过期自动丢弃
