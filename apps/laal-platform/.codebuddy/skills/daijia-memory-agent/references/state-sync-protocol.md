# 状态同步协议 — dev-status.json 规范 v1.0

**版本**: v1.0.0
**生效日期**: 2026-08-02

---

## 1. 概述

`dev-status.json` 是代驾平台所有插件获取项目最新状态的**单一事实源**。任何插件在启动时都应该首先读取此文件以获取当前项目上下文。

---

## 2. 文件位置与格式

**路径**: `.codebuddy/skills/daijia-memory-agent/references/dev-status.json`

**编码**: UTF-8

**Schema 版本**: `1.0.0`

---

## 3. 数据结构规范

```json
{
  "schemaVersion": "1.0.0",
  "projectName": "代驾平台 (Daijia Platform)",
  "lastUpdated": "2026-08-02T12:00:00+08:00",
  "updatedBy": "daijia-orchestrator",

  "domains": {
    "core-api": {
      "path": "daijia-core/",
      "status": "active",
      "version": "1.0.0",
      "lastModified": "2026-08-02T00:00:00+08:00",
      "techStack": "PHP 7.4+, WordPress Plugin API",
      "keyFiles": {
        "constants": "includes/class-daijia-constants.php",
        "auth": "includes/class-daijia-auth.php",
        "orders": "includes/class-daijia-order.php",
        "restController": "includes/class-daijia-rest-controller.php"
      },
      "endpoints": 30,
      "errorCodes": 26,
      "orderStates": ["PENDING", "ACCEPTED", "ONGOING", "COMPLETED", "CANCELLED", "DISPUTE"]
    },
    "mobile-ui": {
      "path": "daijia-mobile/",
      "status": "active",
      "version": "1.0.0",
      "lastModified": "2026-07-29T17:28:00+08:00",
      "techStack": "HTML5 + CSS3 + Vanilla JS, PWA",
      "designSystem": "solo-design v2026.07.22",
      "brandPrefix": "dj",
      "pages": {
        "passenger-home": { "file": "pages/passenger-home.html", "status": "completed", "completedAt": "2026-07-29" },
        "driver-orders": { "file": "pages/driver-orders.html", "status": "completed", "completedAt": "2026-07-29", "issues": ["mobile-navigation-consistency"] },
        "member-services": { "file": "pages/member-services.html", "status": "completed", "completedAt": "2026-07-29" }
      },
      "pwa": {
        "manifest": "manifest.json",
        "serviceWorker": "service-worker.js",
        "offlineSupported": true
      }
    },
    "admin-ui": {
      "path": "daijia-admin-dashboard/",
      "status": "active",
      "version": "1.0.0",
      "lastModified": "2026-08-01T00:00:00+08:00",
      "techStack": "HTML5 + CSS3, Liquid Glass UI",
      "designSystem": "solo-design v2026.07.22",
      "brandPrefix": "dj",
      "pages": {
        "admin-dashboard": { "file": "admin.html", "status": "completed" },
        "admin-login": { "file": "login.html", "status": "completed" }
      }
    },
    "website": {
      "path": "daijia-website/",
      "status": "active",
      "version": "1.0.0",
      "lastModified": "2026-07-29T00:00:00+08:00",
      "techStack": "HTML5 + CSS3, Static",
      "designSystem": "solo-design v2026.07.22",
      "designFile": "daijia-website.design"
    },
    "woo-ext": {
      "path": "daijia-woo-ext/",
      "status": "active",
      "version": "1.0.0",
      "lastModified": "2026-07-29T00:00:00+08:00",
      "techStack": "PHP 7.4+, WooCommerce Extension API",
      "modules": ["checkout-fields", "order-integration"]
    },
    "tests": {
      "path": "tests/",
      "status": "active",
      "totalTests": 7,
      "lastRun": null,
      "coverage": {
        "unit": "auth, order, validator, cache, constants, error-handler",
        "integration": "rest-api"
      }
    }
  },

  "qualityMetrics": {
    "lastAudit": "2026-08-02",
    "securityCompliance": {
      "total": 13,
      "passed": 10,
      "pending": 2,
      "unknown": 1,
      "reportPath": "AUDIT-REPORT-20260802.md"
    },
    "codeReview": {
      "lastReview": "2026-08-01",
      "reportPath": "BROOKS-SWEEP-REPORT-20260801.md"
    },
    "lspDiagnostics": {
      "errors": 0,
      "warnings": 0,
      "lastChecked": null
    },
    "testResults": {
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "lastRun": null
    }
  },

  "designTokens": {
    "source": "daijia-mobile/colors_and_type.css",
    "brandPrefix": "dj",
    "primaryColor": "#06b6d4",
    "fontSans": "Inter, PingFang SC, sans-serif",
    "fontMono": "SF Mono, JetBrains Mono, monospace",
    "surfaceDepthModel": "border-first-light-static-cards",
    "ctaTreatment": "filled-primary-on-light",
    "lastUpdated": "2026-07-29T17:21:00+08:00"
  },

  "mcpConfiguration": {
    "configPath": ".codebuddy/mcp.json",
    "activeServers": ["daijia-context", "daijia-decision-log", "design-converter", "repomix", "php-lsp"],
    "contextScope": "daijia-dev",
    "lastUpdated": "2026-08-02"
  },

  "activeConflicts": 0,
  "knownIssues": [
    {
      "id": "ISSUE-001",
      "domain": "mobile-ui",
      "file": "pages/driver-orders.html",
      "severity": "medium",
      "description": "mobile-navigation-consistency — bottom nav 缺少 data-nav-key 属性",
      "status": "needs-fix",
      "reportedAt": "2026-07-29",
      "reporter": "solo-design validateDesignWorkspace"
    }
  ],

  "recentActivity": [
    {
      "timestamp": "2026-07-29T17:28:00+08:00",
      "action": "page-generation-completed",
      "domain": "mobile-ui",
      "detail": "3 pages generated by solo-design (passenger-home, driver-orders, member-services)",
      "agent": "solo-design@trae-cn"
    }
  ]
}
```

---

## 4. 更新触发机制

### 4.1 自动触发（daijia-orchestrator 自动执行）

| 触发事件 | 更新字段 | 频率限制 |
|---------|---------|---------|
| 任何 daijia-core/ 下 PHP 文件被修改 | `domains.core-api.lastModified` | 非高频限制 |
| 任何 daijia-mobile/ 下页面文件被修改 | `domains.mobile-ui.pages[page].status` | 非高频限制 |
| 设计令牌 CSS 文件变更 | `designTokens.lastUpdated` | 即时 |
| .codebuddy/mcp.json 变更 | `mcpConfiguration.lastUpdated` | 即时 |
| security-scan 完成 | `qualityMetrics.securityCompliance` | 每次扫描 |
| code-review-ai 完成 | `qualityMetrics.codeReview` | 每次审查 |
| tests/ 执行完成 | `qualityMetrics.testResults` | 每次测试 |
| read_lints 结果变更 | `qualityMetrics.lspDiagnostics` | 批量汇总 |

### 4.2 手动触发（Agent 显式调用）

- 新页面计划加入 → 更新 `domains.{domain}.pages`
- 新需求变更 → 更新 `knownIssues` 或添加 `recentActivity`
- 跨域操作 → 在 `recentActivity` 中记录
- 版本号更新 → 更新对应 `domains.{domain}.version`

---

## 5. 读取协议

### 5.1 Agent 启动时

```
1. read_file("f:\项目01\.codebuddy\skills\daijia-memory-agent\references\dev-status.json")
2. 检查 schemaVersion 是否为当前版本
3. 提取相关域的 status 信息
4. 检查 activeConflicts 是否 > 0
5. 检查 knownIssues 中是否有当前域相关的待修复项
```

### 5.2 任务执行中

```
如需要了解其他域的状态 → 重新读取 dev-status.json（利用操作系统的文件缓存）
```

### 5.3 任务完成时

```
1. 更新对应域的 lastModified
2. 添加 recentActivity 条目
3. 如果修复了 knownIssue → 更新对应条目的 status
```

---

## 6. 冲突防护

- 同一时间只允许一个 Agent 更新 `dev-status.json`
- 更新前必须读取最新版本，基于最新版本修改
- 如有并发写入冲突 → 最后一次写入者负责合并

---

## 7. 扩展性

未来可扩展的字段：
- `domains.{domain}.dependencies` — 域间依赖关系
- `domains.{domain}.openPRs` — 进行中的变更
- `qualityMetrics.performanceBudget` — 性能指标
- `environment.variables` — 环境变量状态
