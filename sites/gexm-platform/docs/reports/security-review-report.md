# 安全中间件代码审查报告

## 审查范围
- [security.js](file:///f:/gexm/packages/server/src/middleware/security.js) - 安全中间件核心模块
- [csrfConfig.js](file:///f:/gexm/packages/server/src/middleware/csrfConfig.js) - CSRF 保护配置

## 审查时间
2026-06-26

---

## 审查结果

| # | Category | Title | Severity | Confidence | Evidence (Source → Sink) | Recommendation | Location |
|---|----------|-------|----------|------------|-------------------------|----------------|----------|
| 1 | xss_bypass | XSS 正则过滤模式不完整 | MEDIUM | 0.85 | 用户输入 → XSS_PATTERNS 正则匹配 → 部分恶意标签未被过滤 | 扩展 XSS_PATTERNS 模式，或使用专业 XSS 过滤库（如 DOMPurify） | [security.js:4-11](file:///f:/gexm/packages/server/src/middleware/security.js#L4-L11) |
| 2 | xss_bypass | 事件处理器正则匹配不够严格 | MEDIUM | 0.82 | `<img onerror=alert(1)>` → 正则 `on\w+\s*=\s*["'].*?["']` → 不匹配无引号形式 | 修改正则以匹配无引号的事件处理器，或使用 `on\w+\s*=\s*\S+` | [security.js:7](file:///f:/gexm/packages/server/src/middleware/security.js#L7) |
| 3 | defense_in_depth | 双重输入清理可能导致数据损坏 | LOW | 0.80 | req.body → xssFilterMiddleware 删除标签 → sanitizeInputMiddleware HTML 转义 → 数据可能被双重处理 | 建议合并为单一清理流程，明确区分删除和转义的目的 | [security.js:37-47, 133-168](file:///f:/gexm/packages/server/src/middleware/security.js#L37-L47) |

---

## 详细分析

### 1. XSS 正则过滤模式不完整

**问题描述**：
当前 XSS_PATTERNS 仅覆盖部分常见的 XSS 攻击模式，以下攻击向量未被覆盖：
- `<img src=x onerror=alert(1)>` - img 标签的事件处理器
- `<svg onload=alert(1)>` - SVG 标签的事件处理器
- `<body onload=alert(1)>` - body 标签的事件处理器
- `<input onfocus=alert(1)>` - input 标签的事件处理器
- `<marquee onstart=alert(1)>` - marquee 标签的事件处理器
- `<details ontoggle=alert(1)>` - details 标签的事件处理器

**攻击路径**：
```
用户输入: <img src=x onerror=alert(1)>
↓
xssFilterMiddleware: 正则匹配失败（img 标签不在过滤列表）
↓
数据存储或输出: XSS 攻击成功
```

**建议**：
1. 扩展 XSS_PATTERNS 模式列表
2. 使用专业 XSS 过滤库（如 DOMPurify、xss-filters）
3. 对所有 HTML 标签进行白名单过滤

---

### 2. 事件处理器正则匹配不够严格

**问题描述**：
当前正则 `on\w+\s*=\s*["'].*?["']` 仅匹配带引号的事件处理器，以下变体未被匹配：
- `<img onerror=alert(1)>` - 无引号形式
- `<img onerror =alert(1)>` - 空格变体
- `<img onerror	=alert(1)>` - 制表符变体

**攻击路径**：
```
用户输入: <img onerror=alert(1)>
↓
正则匹配: on\w+\s*=\s*["'].*?["'] → 不匹配（缺少引号）
↓
XSS 攻击成功
```

**建议**：
修改正则表达式为：
```javascript
/on\w+\s*=\s*(["'].*?["']|\S+)/gi
```
或更严格的版本：
```javascript
/on\w+\s*=\s*[^\s>]+/gi
```

---

### 3. 双重输入清理问题

**问题描述**：
xssFilterMiddleware 和 sanitizeInputMiddleware 都会处理 req.body，可能导致：
1. 先删除危险标签，再对剩余内容进行 HTML 转义
2. 如果内容包含 `<script>alert("xss")</script>`，会先被删除为空，再转义为空
3. 如果内容包含 `<b>hello</b>`，会先被删除为 `hello`，再转义为 `hello`（无问题）
4. 但如果用户输入正常的 HTML 如 `<b>test</b>`，会被意外删除

**建议**：
1. 明确两个中间件的用途分工：
   - xssFilterMiddleware：删除恶意代码（用于存储安全）
   - sanitizeInputMiddleware：转义 HTML（用于输出安全）
2. 根据场景选择使用，避免同时使用
3. 建议使用白名单过滤而非黑名单删除

---

## 最佳实践确认

### ✅ 安全实现

| 功能 | 实现方式 | 安全评估 |
|-----|---------|---------|
| CSRF Token 生成 | `crypto.getRandomValues()` | ✅ 使用 CSPRNG，安全 |
| CSRF Cookie 配置 | `sameSite: 'strict'` | ✅ 最佳实践 |
| CSRF Cookie 安全 | `secure: process.env.NODE_ENV === 'production'` | ✅ 正确配置 |
| HTTP 方法过滤 | `['GET', 'HEAD', 'OPTIONS']` | ✅ 符合 OWASP 建议 |
| Token 双重验证 | Cookie + Header | ✅ Double-submit cookie 模式 |
| 安全头设置 | X-Frame-Options: DENY | ✅ 防止点击劫持 |
| HSTS 配置 | max-age=31536000 | ✅ 强制 HTTPS |
| CSP 配置 | default-src 'self' | ✅ 限制资源来源 |

---

## 改进建议

### 优先级 P0（立即修复）
1. 扩展 XSS_PATTERNS 模式，覆盖 img、svg、body 等标签
2. 修改事件处理器正则，匹配无引号形式

### 优先级 P1（短期修复）
1. 统一输入清理策略，明确分工
2. 添加 XSS 过滤单元测试覆盖更多攻击向量

### 优先级 P2（长期优化）
1. 引入专业 XSS 过滤库（DOMPurify）
2. 建立安全中间件性能基准测试
3. 创建安全配置审计日志

---

## 结论

整体安全中间件实现符合 OWASP 最佳实践，主要安全机制（CSRF、安全头）实现正确。XSS 过滤存在部分绕过风险，建议扩展过滤模式或引入专业过滤库。双重清理机制需要明确分工，避免数据损坏。

**审查结论**：✅ 通过（需修复 2 个中等风险问题）

---

**审查人**：AI 安全审查助手
**审查日期**：2026-06-26