# 插件接入契约 — 标准化集成流程与接口要求

## 契约概述

本契约定义了外部插件接入 B Admin 项目 MCP 协调系统的标准化流程和强制性接口要求。任何插件必须满足本契约的全部要求，才能被 Agent 注册表接受并参与 Agent 间协作。

## 接入前置条件

接入前，插件必须确认以下条件：

1. 插件已通过 CodeBuddy Marketplace 安装或本地部署
2. 插件具有明确的 `skill` 定义（`SKILL.md` 或等效描述文件）
3. 插件作者理解 B Admin 项目的三平面架构
4. 插件作者已阅读 `b-admin-rules/SKILL.md` 中的项目强制约定

## 接入流程（5 步）

### 步骤 1：能力声明 (Capability Declaration)

在 `.codebuddy/memories/registrations/<plugin-id>.json` 创建注册文件：

```json
{
  "type": "agent-registration",
  "agentId": "plugin-unique-id",
  "agentType": "external",
  "skillId": "plugin-skill-name",
  "displayName": "Human-readable name",
  "description": "What this plugin does",
  "capabilities": [
    "capability-1",
    "capability-2"
  ],
  "permissionLevel": "external",
  "dataAccess": {
    "database": "read-only",
    "api": "read-only",
    "files": "read-only"
  },
  "outputFormat": {
    "type": "independent-file",
    "extensions": [".html", ".xlsx"],
    "location": "project-root or specified subdirectory"
  },
  "status": "active",
  "registeredAt": "ISO-8601",
  "contactChannel": "memory-bus",
  "heartbeatInterval": "PT10M"
}
```

### 步骤 2：注册到 Agent 注册表

在 `mcp-coordinator/references/agent-registry.md` 的"外部插件"表格中添加一行：

```markdown
| `plugin-id` | external | `plugin-skill` | marketplace plugin | 只读数据库 | active |
```

### 步骤 3：声明数据边界

插件必须在能力声明中明确：

**读取权限边界**：
- 哪些数据库表需要读取？（全部 / 指定表）
- 是否需要读取 API 响应？（是 / 否）
- 是否需要读取项目文件？（是 / 否，哪些目录）

**写入权限边界**：
- 输出文件类型？（`.html` / `.xlsx` / `.mp4` / `.md` / `.json`）
- 输出文件位置？（项目根目录 / 子目录 / 外部目录）
- 是否写入数据库？（是 / 否，仅 product-management 可通过 API 写入）

**禁止操作清单**：
- 不得修改 `server/src/` 下的任何源代码
- 不得修改 `b-admin/` 下的文件（design-to-code 例外）
- 不得直接修改 `data/app.db` 结构（DDL）
- 不得修改 `.codebuddy/` 下的协调文件（除自己的注册文件）
- 不得删除任何文件

### 步骤 4：接入记忆总线

1. 在 `.codebuddy/memories/agents/<plugin-id>.json` 创建 Agent 状态文件
2. 设置心跳间隔（建议 10 分钟）
3. 声明需要的共享记忆区域：
   - `shared/analysis-results/` — 如果插件产出分析结果
   - `shared/notifications/` — 如果需要接收通知

### 步骤 5：验证（首次运行检查）

首次运行时，MCP 协调器自动执行以下验证：

- [ ] 注册文件存在且格式正确
- [ ] Agent 注册表中有对应记录
- [ ] 权限声明与操作一致（无越权行为）
- [ ] 输出文件位置符合声明
- [ ] 记忆总线连接正常
- [ ] 心跳机制正常工作

## 接口契约

### 强制接口

每个插件必须实现以下接口行为：

| 接口 | 说明 | 触发方式 |
|------|------|---------|
| `onRegister()` | 写入注册信息到记忆总线 | 插件首次激活 |
| `onHeartbeat()` | 定期更新心跳时间戳 | 定时触发 |
| `onTaskStart(taskId)` | 创建任务记录 | 收到任务时 |
| `onTaskComplete(taskId, result)` | 更新任务状态为完成，写入结果 | 任务完成时 |
| `onTaskError(taskId, error)` | 记录错误信息 | 任务失败时 |
| `onShutdown()` | 清理临时文件，标记 terminated | 插件停用时 |
| `publishResult(result)` | 将分析结果写入共享记忆 | 产出结果时 |

### 可选接口

| 接口 | 说明 | 适用场景 |
|------|------|---------|
| `onNotification(notification)` | 处理来自其他 Agent 的通知 | 需要协作的插件 |
| `queryContext(key)` | 从记忆总线查询上下文 | 需要其他 Agent 的产出 |
| `subscribeEvents(pattern)` | 订阅特定事件 | 需要事件驱动的插件 |

## 输出规范

### 文件命名

```
输出文件命名格式: [类型]-[内容摘要]-[日期].[扩展名]

示例:
- 分析报告: analysis-report-moutai-2026-08-02.html
- 财务模型: dcf-model-company-name-2026-08-02.xlsx
- 可视化: dashboard-project-metrics-2026-08-02.html
```

### 输出位置

| 插件类型 | 默认输出位置 | 说明 |
|---------|-------------|------|
| 金融分析类 | 项目根目录 | `.html`, `.xlsx` 文件 |
| 数据可视化 | 项目根目录 | `.html` 仪表盘 |
| 视频生成 | `out/` 目录 | `.mp4` 文件 |
| 产品管理 | API 写入 + 可选报告 | 数据写入数据库 |
| 设计转代码 | `b-admin/` 目录 | HTML/CSS/JS 文件 |

### 输出文件元数据

每个输出文件应附带元数据记录，写入 `shared/analysis-results/`：

```json
{
  "resultId": "uuid-v4",
  "pluginId": "string",
  "outputFile": "path/relative/to/project-root",
  "fileType": "html | xlsx | mp4 | md",
  "description": "string",
  "generatedAt": "ISO-8601",
  "inputSources": ["source-1", "source-2"],
  "keywords": ["tag-1", "tag-2"],
  "expiresAt": "ISO-8601 | null"
}
```

## 合规检查清单

接入前自检：

- [ ] 注册文件 `registrations/<plugin-id>.json` 已创建
- [ ] Agent 注册表已更新
- [ ] 数据边界已声明（读写权限明确）
- [ ] 禁止操作清单已确认理解
- [ ] 记忆总线状态文件已创建
- [ ] 心跳机制已配置
- [ ] 输出文件命名规范已遵守
- [ ] 输出文件位置符合约定
- [ ] 不会修改项目源代码
- [ ] 不会直接修改数据库结构

## 违规处理

| 违规行为 | 处理方式 |
|---------|---------|
| 修改项目源代码（非授权） | 立即终止 Agent，标记为违规 |
| 直接修改数据库结构 | 立即终止 Agent，回滚变更 |
| 删除项目文件 | 立即终止 Agent，从备份恢复 |
| 未注册即操作 | 拒绝所有操作请求 |
| 连续 3 次心跳丢失 | 标记为 error 状态 |
| 输出文件未按规范 | 警告，记录日志 |
| 越权读取私有记忆 | 警告，限制记忆访问 |

## 版本兼容性

| 契约版本 | MCP 协议版本 | 发布日期 | 变更说明 |
|---------|-------------|---------|---------|
| v1.0 | mcp/v1 | 2026-08-02 | 初始版本 |
