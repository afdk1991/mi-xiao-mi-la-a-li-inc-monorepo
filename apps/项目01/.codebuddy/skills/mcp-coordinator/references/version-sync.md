# 版本同步协议 — 文档自动更新规则

## 协议概述

版本同步协议确保项目的代码、配置、协调文档和 Agent 记忆始终保持一致。当代码或配置发生变更时，相关文档必须同步更新。本协议定义了"什么变更触发什么文档更新"的完整规则。

## 变更触发矩阵

### 代码变更 → 文档更新

| 变更类型 | 触发更新的文档 | 更新内容 | 负责人 |
|---------|--------------|---------|--------|
| 新增 API 端点 | `api-contracts.md`, `project-context.md` | 添加端点记录、更新端点计数 | 变更的 Agent |
| 修改 API 端点 | `api-contracts.md` | 更新 Schema、描述 | 变更的 Agent |
| 删除 API 端点 | `api-contracts.md`, `project-context.md` | 标记废弃、更新计数 | 变更的 Agent |
| 新增数据库表 | `database-rules.md`, `project-context.md` | 添加表清单、更新 DDL | 变更的 Agent |
| 修改数据库表 | `database-rules.md`, migrate.js | 更新 DDL | 变更的 Agent |
| 新增前端模块 | `project-context.md` | 更新前端文件清单 | 变更的 Agent |
| 新增中间件 | `plugin-coordination.md` | 更新请求生命周期图 | 变更的 Agent |
| Bug 修复 | 无需更新 | - | - |
| 代码重构（无接口变更） | 无需更新 | - | - |

### 配置变更 → 文档更新

| 变更类型 | 触发更新的文档 | 更新内容 | 负责人 |
|---------|--------------|---------|--------|
| 端口变更 | `project-context.md`, `plugin-coordination.md` | 更新端口号 | 变更的 Agent |
| 环境变量变更 | `project-context.md` | 更新 .env 说明 | 变更的 Agent |
| JWT 配置变更 | `plugin-coordination.md`, `api-contracts.md` | 更新 Token 描述 | 变更的 Agent |
| 限流配置变更 | `plugin-coordination.md` | 更新阈值说明 | 变更的 Agent |
| CORS 配置变更 | `project-context.md` | 更新白名单 | 变更的 Agent |

### 协调文档变更

| 变更类型 | 触发更新的文档 | 更新内容 | 负责人 |
|---------|--------------|---------|--------|
| dev-status.json phase 完成 | `project-context.md` | 更新完成状态 | 完成阶段的 Agent |
| 新 ADR 决策 | `adr.md` | 追加新记录 | 决策者 Agent |
| 新 Agent 注册 | `agent-registry.md` | 添加记录 | MCP Coordinator |
| 插件接入 | `agent-registry.md`, `plugin-contract.md` | 添加记录、更新示例 | MCP Coordinator |
| 跨插件规则变更 | `cross-plugin-rules.md` | 更新矩阵 | MCP Coordinator |
| 错误恢复流程变更 | `error-recovery.md` | 更新场景 | 变更的 Agent |

## 文档版本管理

### 文档版本标记

所有协调文档在文件头部包含版本行：

```markdown
<!-- version: 2.0.0 | last-updated: 2026-08-02 | updated-by: mcp-coordinator -->
```

### 版本号规则

协调文档的版本号独立于项目代码版本：

```
格式: X.Y.Z (遵循 SemVer)

X (主版本): 协调规则架构变更（不兼容的协议变更）
Y (次版本): 新增章节、Agent、插件
Z (修订版): 修正错误、更新描述、优化措辞
```

### 当前文档版本

| 文档 | 版本 | 最后更新 |
|------|------|---------|
| plugin-coordination.md | 2.0.0 | 2026-08-02 |
| project-context.md | 2.0.0 | 2026-08-02 |
| dev-status.json | 2.0.0 | 2026-08-02 |
| mcp-coordinator/SKILL.md | 1.0.0 | 2026-08-02 |
| mcp-protocol.md | 1.0.0 | 2026-08-02 |
| agent-registry.md | 1.0.0 | 2026-08-02 |
| memory-structure.md | 1.0.0 | 2026-08-02 |
| plugin-contract.md | 1.0.0 | 2026-08-02 |
| state-machine.md | 1.0.0 | 2026-08-02 |
| architecture.md | 1.0.0 | 2026-08-02 |
| version-sync.md | 1.0.0 | 2026-08-02 |
| b-admin-rules/SKILL.md | 1.0.0 | 2026-08-02 |

## 同步工作流

### 代码变更后的同步流程

```
1. Agent 完成代码变更
2. Agent 检查变更触发矩阵（本文件）
3. 确定需要更新的文档清单
4. 逐一更新文档：
   a. 读取最新版本 → 修改 → 写入
   b. 更新文档版本行
5. 更新 dev-status.json（如适用）
6. 在记忆总线记录变更事件
```

### 文档冲突解决

当两个 Agent 同时更新同一份文档：

1. 先写入者成功
2. 后写入者检测到内容变更 → 放弃本地修改
3. 后写入者重新读取最新版本
4. 后写入者在最新版本基础上应用自己的修改
5. 重新写入
6. 如果冲突无法自动解决 → 标记冲突 → 等待协调器裁决

## 一致性检查

### 自动检查项

协调器定期（每次启动或每 24h）执行以下一致性检查：

| 检查项 | 说明 | 不通过时的操作 |
|--------|------|--------------|
| API 端点数一致性 | `project-context.md` 中的端点数 vs `api-contracts.md` | 更新 project-context.md |
| Agent 注册表完整性 | `agent-registry.md` vs `registrations/` 目录 | 清理失效注册 |
| 记忆文件有效性 | `memories/` vs `agent-registry.md` 活跃 Agent | 清理孤儿记忆 |
| 版本标记一致性 | 各文档版本号 vs 实际内容完整性 | 报告不一致 |
| 阶段依赖完整性 | `dev-status.json` phases 依赖关系 | 标记缺失前置 |
| 文件引用有效性 | 文档中引用的文件路径是否存在 | 报告死链 |

### 手动检查命令

```bash
# 检查所有协调文档的一致性
# (未来可通过脚本实现: scripts/check-consistency.sh)
```

## 文档更新最佳实践

1. **原子更新**：一次变更涉及多个文档时，应在同一批次中更新，避免部分更新导致不一致
2. **先读后写**：永远读取最新版本后再修改，避免覆盖其他 Agent 的更改
3. **变更记录**：在事件日志中记录所有文档变更
4. **向后兼容**：文档格式变更应保持向后兼容
5. **最小变更**：只更新与变更相关的部分，避免无关修改
6. **交叉验证**：更新完成后，验证引用该文档的其他文档是否需要同步更新
