# 项目状态机 — 版本化状态转换规则

## 状态机概述

B Admin 项目的开发遵循严格的状态机模型。每个开发阶段有明确的状态定义、进入条件、退出条件和转换规则。状态机由 `dev-status.json` 驱动，MCP 协调器负责执行转换验证。

## 顶层状态

```
项目整体状态 = {
  INITIALIZING → 环境就绪 → IN_DEVELOPMENT
  IN_DEVELOPMENT → 所有阶段 done → COMPLETE
  IN_DEVELOPMENT → 发现阻塞问题 → BLOCKED
  BLOCKED → 阻塞解除 → IN_DEVELOPMENT
  COMPLETE → 新的阶段追加 → IN_DEVELOPMENT
  ANY → 数据损坏/严重问题 → RECOVERY
  RECOVERY → 恢复成功 → IN_DEVELOPMENT
}
```

## 阶段状态定义

### Phase 状态机

```
         ┌──────────┐
         │ pending  │ ← 初始状态
         └────┬─────┘
              │ Agent 开始该阶段工作
              ▼
         ┌──────────┐
    ┌───→│in_progress│
    │    └────┬─────┘
    │         │ 所有任务完成 + Gate Check 通过
    │         ▼
    │    ┌──────────┐
    │    │   done   │ ← 终态（不可回退）
    │    └──────────┘
    │
    │    从 in_progress:
    │    用户取消或需求变更
    │         │
    │         ▼
    │    ┌──────────┐
    └────│ pending  │ ← 回到待处理（重新排队）
         └──────────┘
```

### 状态转换矩阵

| 当前状态 | 目标状态 | 条件 | 操作 |
|---------|---------|------|------|
| pending | in_progress | 前置阶段全部 done；Agent 明确声明开始 | 更新 dev-status.json |
| in_progress | done | 所有 Gate Check 通过；代码审查通过 | 更新 dev-status.json + project-context.md |
| in_progress | pending | 用户取消；需求变更导致需要重新设计 | 更新 dev-status.json，保留已完成的子任务记录 |
| done | in_progress | **FORBIDDEN** — 已完成阶段不可回退 | 如需重做，追加新阶段 |
| done | pending | **FORBIDDEN** — 同上 | 同上 |
| any | blocked | 外部依赖不可用；技术阻塞 | 更新 dev-status.json，在 pending 数组中记录阻塞原因 |
| blocked | in_progress | 阻塞解除 | 更新 dev-status.json，移除 pending 中的阻塞记录 |
| any | recovery | 数据库损坏；文件系统错误 | 进入错误恢复流程 |

## 阶段依赖图

```
0_environment ────┐
                  ├──→ 1_backend_skeleton
                  │         │
                  │         ├──→ 2_database
                  │         │         │
                  │         │         ├──→ 3_core_business
                  │         │         │         │
                  │         │         │         ├──→ 4_backend_tests
                  │         │         │         │         │
                  │         │         │         │         ├──→ 5_frontend_api_integration
                  │         │         │         │         │
                  │         │         │         │         │    (当前: DONE)
                  │         │         │         │         │
                  │         │         │         │         └──→ 6_frontend_ui_polish [planned]
                  │         │         │         │                   │
                  │         │         │         │                   └──→ 7_e2e_testing [planned]
                  │         │         │         │
                  │         │         │         └──→ (独立: 可在任何阶段后执行)
                  │         │         │                   8_performance_optimization [planned]
                  │         │         │                   9_security_hardening [planned]
                  │         │         │
                  │         │         └──→ (独立) 10_additional_modules [planned]
                  │         │
                  │         └──→ (独立) 11_api_documentation [planned]
                  │
                  └──→ (独立) 12_deployment_automation [planned]
```

## 版本标记规则

每个阶段使用三段式版本标记：

```
版本格式: <major>.<minor>.<patch>-<phase>

major: 架构级变更（数据库方案变更、核心框架升级）
minor: 功能新增（新模块、新端点）
patch: 修复与优化（Bug修复、性能优化）
phase: 当前阶段标识

示例:
- v2.0.0-phase5  → 当前版本，阶段5完成
- v2.1.0-phase6  → 新增功能，进入阶段6
- v2.1.1-phase6  → 阶段6中发现并修复一个Bug
```

## 状态变更协议

### 变更前检查

任何 Agent 在修改 `dev-status.json` 前必须：

1. 读取最新版本的 `dev-status.json`
2. 验证当前状态允许目标状态转换
3. 检查 `lastUpdated` 是否比本地缓存新（冲突检测）
4. 确认所有前置阶段的 Gate Check 已通过
5. 对于 `→ done` 转换，附加完成证据（变更列表或测试结果摘要）

### 变更模板

```json
{
  "operation": "status-transition",
  "agentId": "string",
  "timestamp": "ISO-8601",
  "transition": {
    "phase": "6_frontend_ui_polish",
    "from": "pending",
    "to": "in_progress"
  },
  "evidence": {
    "preconditions": ["5_frontend_api_integration is done"],
    "relatedChanges": ["b-admin/scripts/pages/dashboard.js"],
    "checklistResults": {
      "phase3_design": "passed",
      "dependencies_reviewed": "passed"
    }
  }
}
```

## 冲突解决

### 并发写入冲突

当两个 Agent 同时尝试修改 `dev-status.json`：

1. 先到的写入成功
2. 后到的检测到 `lastUpdated` 已变更 → 自动重试
3. 重试前重新读取最新版本
4. 如果目标状态已被修改（例如另一个 Agent 已将目标阶段设为 done），后到者必须放弃或请示协调器

### 状态不一致恢复

如果检测到状态不一致（例如 `dev-status.json` 显示 `done` 但代码未完成）：

1. 协调器标记项目为 `RECOVERY` 状态
2. 逐个阶段验证代码完成度
3. 修正不一致的阶段状态
4. 记录不一致原因到事件日志
5. 恢复为 `IN_DEVELOPMENT`

## 事件日志

所有状态变更记录在 `.codebuddy/memories/_system/event-log.json`：

```json
{
  "eventId": "uuid-v4",
  "eventType": "status-transition",
  "agentId": "string",
  "timestamp": "ISO-8601",
  "details": {
    "phase": "string",
    "from": "string",
    "to": "string",
    "reason": "string"
  },
  "version": {
    "before": "string",
    "after": "string"
  }
}
```
