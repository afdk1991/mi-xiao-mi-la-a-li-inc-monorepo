# MCP 接口规范 — 代驾平台插件通信协议 v1.0

**版本**: v1.0.0
**生效日期**: 2026-08-02
**维护者**: daijia-memory-agent

---

## 1. 总则

本文档定义代驾平台中所有插件通信的统一接口规范，确保 CodeBuddy 体系（239 插件）和 Trae-CN 体系（163 插件）在共享项目工作区时能无缝协作。

### 1.1 核心设计原则

- **单一事实源 (Single Source of Truth)** — `dev-status.json` 是所有插件获取项目状态的唯一入口
- **契约优先** — 插件间通过明确定义的接口契约通信，禁止直接修改其他插件的管辖文件
- **显式声明** — 所有跨域操作必须在 `dev-status.json` 或 `decision-log.md` 中留痕
- **失败安全** — 接口调用失败不得导致项目不可用状态，所有变更操作需支持回滚

---

## 2. 通信协议层

### 2.1 文件系统协议（最常用）

代驾平台插件通信的核心协议。所有插件通过读写项目文件中约定的路径来交换状态信息。

**读取接口**：
```
read_file(path) → content | error
```

**写入接口**：
```
write_to_file(path, content) | replace_in_file(path, old, new) → success | error
```

**约定路径表**：

| 路径 | 写入方 | 读取方 | 内容格式 | 更新频率 |
|------|--------|--------|---------|---------|
| `.codebuddy/skills/daijia-memory-agent/references/dev-status.json` | daijia-orchestrator | 所有插件 | JSON | 每次状态变更 |
| `.codebuddy/skills/daijia-memory-agent/references/decision-log.md` | 所有插件（追加） | 所有插件 | Markdown 表格 | 每次决策 |
| `PROJECT-RULES-MEMORY.md` | daijia-orchestrator | 所有插件 | Markdown | 插件配置变更时 |
| `daijia-core/includes/class-daijia-constants.php` | PHP 开发 Agent | mobile-ui / admin-ui | PHP | 常量变更时 |

### 2.2 REST API 协议（前后端通信）

代驾平台前端（mobile / admin-dashboard / website）通过 WordPress REST API 与后端（daijia-core）通信。

**API 命名空间**: `daijia/v1`

**标准请求格式**：
```json
{
  "method": "GET | POST | PUT | DELETE",
  "endpoint": "/daijia/v1/{resource}/{action}",
  "headers": {
    "Authorization": "Bearer {token}",
    "Content-Type": "application/json"
  },
  "body": {}
}
```

**标准响应格式**：
```json
{
  "success": true | false,
  "data": {},
  "error": {
    "code": "error_code",
    "message": "描述信息",
    "status": 400
  }
}
```

**端点清单**（源文件: `class-daijia-constants.php`）：

| 控制器 | 端点 | 方法 | 描述 |
|--------|------|------|------|
| Auth REST | `/auth/login` | POST | 用户登录 |
| Auth REST | `/auth/register` | POST | 用户注册 |
| Auth REST | `/auth/token/refresh` | POST | Token 刷新 |
| User REST | `/users/*` | GET/PUT | 用户 CRUD |
| Order REST | `/orders/*` | GET/POST/PUT | 订单 CRUD (5 端点) |
| Payment REST | `/payments/*` | GET/POST | 支付操作 |
| Admin REST | `/admin/*` | GET | 管理查询 |

### 2.3 LSP 协议（代码质量）

PHP Language Server Protocol 提供实时代码诊断。

**接口**：
```
read_lints(filePath?) → Diagnostic[]
```

**诊断分类与严重级别**：
| 分类 | 级别 | 对应安全规则 |
|------|------|------------|
| SQL 注入 | Error | CWE-89 |
| XSS | Warning | CWE-79 |
| 未使用变量 | Hint | - |
| 类型不匹配 | Error | - |

### 2.4 Solo-Design 确定性工具协议（Trae-CN 侧）

solo-design 的 6 个 Node.js 工具脚本提供设计系统级接口：

| 工具 | 命令模板 | 输入 | 输出 |
|------|---------|------|------|
| applyHtmlHeadContract | `node ...apply-html-head-contract.mjs <css> <html> --title=... --lang=... --prefix=dj` | CSS 文件 + HTML 文件 | 填充后的 HTML |
| recordDispatchCompletion | `node ...record-dispatch-completion.mjs <project> --node-id=... --html-src=... --status=...` | 项目路径 + 页面节点 ID | 更新 runtime-orchestration-summary.json |
| buildPageDispatchManifest | `node ...build-page-dispatch-manifest.mjs <project>` | 项目路径 | 生成分发清单 |
| validateDesignWorkspace | `node ...validate-design-workspace.mjs <project>` | 项目路径 | validation-report.json |
| validateFinishReadiness | `node ...validate-finish-readiness.mjs <project>` | 项目路径 | finish-readiness-report.json |
| validateRestoreContract | `node ...validate-restore-contract.mjs <project>` | 项目路径 | restore-contract-report.json |

---

## 3. 数据交换格式契约

### 3.1 设计令牌（CSS 变量）

所有 UI 子项目共用 `--dj-*` 命名空间的 CSS 变量，不允许自定义品牌前缀。

**主变量表**（源：`daijia-mobile/colors_and_type.css`）：
```
--dj-primary: #06b6d4 (cyan-500)
--dj-font-sans: 'Inter', 'PingFang SC', sans-serif
--dj-font-mono: 'SF Mono', 'JetBrains Mono', monospace
--dj-radius-sm: 6px
--dj-radius-md: 12px
--dj-radius-lg: 16px
--dj-radius-full: 9999px
```

### 3.2 错误码

代驾平台使用统一的 4 位数字错误码体系（定义在 `class-daijia-error-handler.php`）：

| 段位 | HTTP 状态 | 示例 |
|------|----------|------|
| 1xxx | 401/403 | 1001=未登录, 1002=Token过期 |
| 2xxx | 400 | 2001=用户不存在 |
| 3xxx | 400 | 3001=订单不存在, 3002=无效状态转换 |
| 4xxx | 400/402 | 4001=支付金额不符 |
| 5xxx | 500 | 5001=数据库错误 |
| 6xxx | 422 | 6001=参数缺失, 6002=格式错误 |

### 3.3 金额单位

**全栈统一**：1 元 = 100 分

- PHP 后端：所有金额以分（整数）存储和计算
- 数据库：`BIGINT` 类型，单位分
- 前端显示：除以 100 后格式化为元，两位小数
- API 传输：JSON number 类型，单位分

---

## 4. 权限边界

### 4.1 域写入权限矩阵

| 域 \ 插件 | daijia-orchestrator | PHP 开发 Agent | solo-design | design-to-code | code-review | security-scan |
|-----------|-------------------|---------------|-------------|---------------|-------------|---------------|
| core-api (`daijia-core/`) | R | W | - | - | R | R |
| mobile-ui (`daijia-mobile/`) | R | - | W | W | - | - |
| admin-ui (`daijia-admin-dashboard/`) | R | - | W | W | - | - |
| website (`daijia-website/`) | R | - | W | W | - | - |
| woo-ext (`daijia-woo-ext/`) | R | W | - | - | R | R |
| tests (`tests/`) | R | W | - | - | R | R |
| config (`.codebuddy/`) | W | - | - | - | - | - |
| docs (`*.md`) | W | R | - | - | - | - |

R = 只读，W = 读写，- = 无权限

### 4.2 跨域操作审批流程

任何需要跨域写入的操作必须经过以下流程：
1. 在 `dev-status.json` 中登记跨域操作意图
2. daijia-orchestrator 审批
3. 操作执行
4. 在 `dev-status.json` 中标记完成

---

## 5. 版本兼容性

| 接口版本 | 最低 CodeBuddy 版本 | 最低 Node.js | 状态 |
|---------|-------------------|-------------|------|
| v1.0.0 | 当前版本 | 16+ | 活跃 |
