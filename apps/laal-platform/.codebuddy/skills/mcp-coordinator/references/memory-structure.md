# 记忆总线规范 — Agent 记忆存储结构、作用域与生命周期

## 记忆总线架构

记忆总线是 Agent 间共享状态的持久化中间层。它采用文件系统存储，每个 Agent 拥有独立的记忆文件，同时支持共享记忆区域。

```
.codebuddy/memories/
├── _system/                          ← 系统级共享记忆
│   ├── project-snapshot.json         ← 项目全局快照
│   ├── event-log.json               ← 跨 Agent 事件日志
│   └── signal-queue/                 ← 信号队列
│       └── <signal-id>.json
├── registrations/                    ← Agent 注册信息
│   └── <agent-id>.json
├── agents/                           ← Agent 私有记忆
│   ├── <agent-id>.json              ← Agent 状态与上下文
│   └── <agent-id>/
│       ├── tasks/                    ← 任务执行记录
│       │   └── <task-id>.json
│       ├── context/                  ← 上下文快照
│       │   └── <context-id>.json
│       └── artifacts/                ← 产出物引用
│           └── <artifact-id>.json
└── shared/                           ← 跨 Agent 共享区域
    ├── analysis-results/             ← 分析结果共享池
    │   └── <result-id>.json
    └── notifications/                ← 通知信箱
        └── <notification-id>.json
```

## 记忆文件结构

### Agent 状态文件 (`agents/<agent-id>.json`)

```json
{
  "agentId": "string",
  "sessionId": "uuid-v4",
  "status": "active | idle | paused | error | terminated",
  "heartbeat": {
    "lastBeat": "ISO-8601",
    "interval": "PT5M",
    "missedBeats": 0
  },
  "currentTask": {
    "taskId": "uuid-v4 | null",
    "startedAt": "ISO-8601 | null",
    "description": "string | null"
  },
  "context": {
    "lastLoadedSkill": "string | null",
    "lastModifiedFile": "string | null",
    "activeReferences": ["string"]
  },
  "stats": {
    "tasksCompleted": 0,
    "errorsEncountered": 0,
    "totalRuntime": "ISO-8601 duration"
  },
  "updatedAt": "ISO-8601"
}
```

### 任务记录 (`agents/<agent-id>/tasks/<task-id>.json`)

```json
{
  "taskId": "uuid-v4",
  "agentId": "string",
  "type": "request | self-initiated | delegated",
  "status": "pending | running | completed | failed | cancelled",
  "priority": "low | normal | high | critical",
  "description": "string",
  "input": {},
  "output": {},
  "errors": [],
  "startedAt": "ISO-8601",
  "completedAt": "ISO-8601 | null",
  "duration": "ISO-8601 duration | null",
  "parentTaskId": "uuid-v4 | null",
  "childTaskIds": ["uuid-v4"]
}
```

### 上下文快照 (`agents/<agent-id>/context/<context-id>.json`)

```json
{
  "contextId": "uuid-v4",
  "agentId": "string",
  "snapshotType": "full | incremental",
  "capturedAt": "ISO-8601",
  "workspace": "f:/项目02",
  "files": {
    "modified": ["path"],
    "created": ["path"],
    "deleted": []
  },
  "state": {
    "dev-status": {},
    "project-context": {},
    "coordination-rules": "hash"
  },
  "memory": {
    "keyInsights": ["string"],
    "decisions": [{
      "id": "string",
      "description": "string",
      "rationale": "string",
      "timestamp": "ISO-8601"
    }],
    "openQuestions": ["string"]
  }
}
```

## 记忆作用域与访问规则

### 作用域层级

```
全局作用域 (_system/*)
  ├─ 所有 Agent 可读
  ├─ 仅协调器可写
  └─ 示例: project-snapshot.json, event-log.json

共享作用域 (shared/*)
  ├─ 所有 Agent 可读
  ├─ 所有 Agent 可写（遵守命名约定）
  └─ 示例: analysis-results/, notifications/

私有作用域 (agents/<agent-id>/*)
  ├─ 仅所属 Agent 可读写
  ├─ 协调器拥有超级读取权限
  └─ 示例: 任务记录、上下文快照

注册作用域 (registrations/*)
  ├─ 所有 Agent 可读
  ├─ 仅所属 Agent 可写
  └─ 示例: Agent 注册信息
```

### 访问控制规则

| 操作 | 自己的记忆 | 他人私有记忆 | 共享记忆 | 系统记忆 | 注册信息 |
|------|:---:|:---:|:---:|:---:|:---:|
| 创建 | YES | NO | YES | NO | YES (own) |
| 读取 | YES | NO | YES | YES | YES |
| 更新 | YES | NO | YES | NO | YES (own) |
| 删除 | YES | NO | NO | NO | NO |
| 列出 | YES | NO | YES | YES | YES |

**例外**：`mcp-coordinator` 拥有所有作用域的完全读写权限。

## 记忆生命周期

### TTL (Time To Live) 策略

| 记忆类型 | 默认 TTL | 清理策略 |
|---------|---------|---------|
| 任务记录 | 会话结束 + 24h | 手动或自动清理 |
| 上下文快照 | 7 天 | 滚动清理（保留最近 5 个） |
| 分析结果 | 30 天 | 手动清理 |
| 通知 | 已读后 1h | 自动清理 |
| 事件日志 | 永久 | 归档（超过 10MB 分割） |
| 注册信息 | 会话期间 | 会话结束时标记 inactive |
| 心跳 | 5 分钟 | 超过 3 次未响应标记 error |
| 信号 | 处理完成 + 1h | 自动清理 |

### 清理协议

1. Agent 终止时：标记状态为 `terminated`，任务记录保留 24h
2. 定期清理：协调器每次启动检查过期记忆
3. 手动清理：Agent 可清理自己的私有记忆
4. 归档：事件日志超过 10MB 自动分割归档

## 记忆合并策略

当多个 Agent 需要合并对同一份共享记忆的修改时：

1. **最后写入胜出 (LWW)**: 适用于分析结果、通知（最新覆盖最旧）
2. **追加合并**: 适用于事件日志（所有条目保留）
3. **冲突标记**: 适用于项目快照（标记冲突，人工裁决）

## 记忆总线 API

Agent 通过以下抽象接口与记忆总线交互（由 MCP 协调器提供）：

```
readMemory(scope, key)        → 读取记忆
writeMemory(scope, key, data) → 写入记忆（自动附加时间戳和 agentId）
deleteMemory(scope, key)      → 删除记忆
listMemory(scope)             → 列出作用域内所有记忆
watchMemory(scope, pattern)   → 监听记忆变更
publishSignal(signal)         → 发布信号到信号队列
consumeSignal(agentId)        → 消费发给自己的信号
snapshot()                    → 创建当前上下文快照
restore(snapshotId)           → 恢复到指定快照
```

## 持久化保证

- 每次写入操作立即 `fsync` 到磁盘（通过 200ms 防抖批量写入）
- 关键记忆（注册、心跳）双重写入到内存和磁盘
- 写入前创建临时文件，写入成功后原子替换
