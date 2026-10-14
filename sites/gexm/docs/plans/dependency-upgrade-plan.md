# 依赖升级计划

## 执行摘要

| 项目 | 当前状态 | 目标状态 | 风险等级 |
|------|---------|---------|---------|
| Electron | 28.3.3 | 41.7.1 | 🔴 紧急 |
| WebSocket (ws) | 间接依赖 | 隔离升级 | 🔴 紧急 |
| path-to-regexp | <=0.1.12 | 0.1.13+ | 🔴 紧急 |
| bcryptjs | 2.4.3 | 3.0.3 | 🟡 中等 |
| helmet | 7.2.0 | 8.2.0 | 🟡 中等 |
| express-rate-limit | 7.5.1 | 8.5.2 | 🟡 中等 |
| uuid | 9.0.1 | 11.1.1 | 🟢 低 |
| better-sqlite3 | 9.6.0 | 11.10.0 | 🟢 低 |
| vite | 5.4.21 | 6.4.3 | 🟢 低 |
| pinia | 2.1.7 | 3.0.4 | 🟢 低 |

---

## 第一阶段：紧急修复（1-2天）

### 1.1 Electron 升级 (28.3.3 → 41.7.1)

**问题**：17个高危漏洞，包括 UAF、命令注入、ASAR 绕过等

**影响包**：
- `@gexm/desktop`

**升级步骤**：
```bash
# 1. 备份当前配置
cp desktop/package.json desktop/package.json.bak

# 2. 更新 Electron 版本
cd packages/desktop
npm install electron@41.7.1 --save

# 3. 更新 electron-builder
npm install electron-builder@26.15.3 --save-dev

# 4. 验证构建
npm run build:win
```

**Breaking Changes 注意事项**：
- Electron 41 移除了部分旧 API（`BrowserWindow.getContentSize()` 等）
- 需要测试主进程和渲染进程的兼容性
- 可能需要更新 Node.js 版本（建议 v20+）

**验证方法**：
```bash
# 启动桌面应用
npm run dev

# Windows 构建
npm run build:win
```

---

### 1.2 WebSocket 漏洞修复

**问题**：`ws` 8.0.0-8.20.1 存在内存泄露和 DoS

**影响路径**：
- `uni-app` → `vite` → `ws`
- `socket.io` → `ws`

**临时缓解方案**：
```bash
# 在 package.json 中添加 overrides
cd packages/app
npm install ws@8.18.0 --save --legacy-peer-deps
```

**根因解决方案**：
- 等待 `@dcloudio/vite-plugin-uni` 更新 `ws` 依赖
- 或考虑降级 uni-app 到 stable 版本

---

### 1.3 path-to-regexp ReDoS 漏洞

**问题**：ReDoS 正则表达式拒绝服务

**影响路径**：
- `@dcloudio/vite-plugin-uni` → `path-to-regexp`

**修复方案**：
```bash
# 在根目录 package.json 添加 overrides
"overrides": {
  "path-to-regexp": "0.1.12"
}
```

---

## 第二阶段：重要升级（3-5天）

### 2.1 bcryptjs 升级 (2.4.3 → 3.0.3)

**问题**：密码哈希算法性能问题

**升级影响**：
- 新版本 API 兼容，无需代码修改
- 需要重新哈希现有密码（可选）

**升级步骤**：
```bash
cd packages/server
npm install bcryptjs@3.0.3 --save
```

---

### 2.2 helmet 升级 (7.2.0 → 8.2.0)

**问题**：安全头部中间件版本过旧

**Breaking Changes**：
- 移除了 `helmet.crossdomain()`（已废弃）
- `helmet.contentSecurityPolicy()` 默认值更严格

**升级步骤**：
```bash
cd packages/server
npm install helmet@8.2.0 --save

# 检查并更新 security.js 中的 CSP 配置
```

---

### 2.3 express-rate-limit 升级 (7.5.1 → 8.5.2)

**问题**：限流中间件版本过旧

**升级影响**：
- 新版本 API 略有变化
- `max` 改为 `maxConnections`

**升级步骤**：
```bash
cd packages/server
npm install express-rate-limit@8.5.2 --save

# 检查 rateLimit 配置
```

---

## 第三阶段：常规升级（1周+）

### 3.1 依赖版本对齐

**问题**：vue 版本在 app 内被覆盖为 3.5.38

**解决方案**：
```bash
# 在根目录 package.json 更新 overrides
"overrides": {
  "vue": "3.5.39"
}
```

### 3.2 其他依赖升级

```bash
# server 包
npm install better-sqlite3@11.10.0 --save
npm install uuid@11.1.1 --save
npm install express@5.2.1 --save  # 需测试兼容性

# app 包
npm install vite@6.4.3 --save-dev
npm install pinia@3.0.4 --save
```

---

## 第四阶段：@dcloudio 依赖处理

### Alpha 版本风险

**当前状态**：
```
"@dcloudio/uni-app": "3.0.0-alpha-5000920260515001"
```

**建议**：
1. 监控官方 stable 版本发布
2. 在测试环境验证 stable 版本
3. 制定回滚方案

---

## 漏洞修复优先级

| 优先级 | 漏洞 | CVSS | 升级包 | 预计时间 |
|--------|------|------|--------|---------|
| P0 | ASAR Integrity Bypass | 9.6 | electron | 2天 |
| P0 | Use-after-free (多处) | 8.8 | electron | 2天 |
| P0 | 命令行注入 | 8.8 | electron | 2天 |
| P0 | ReDoS | 7.5 | path-to-regexp | 1天 |
| P0 | Memory Disclosure | 7.5 | ws | 1天 |
| P1 | XSS | 6.1 | helmet | 2天 |
| P1 | DoS | 5.9 | express-rate-limit | 1天 |
| P2 | 密码学问题 | 4.3 | bcryptjs | 1天 |
| P2 | 信息泄露 | 3.7 | uuid | 1天 |

---

## 回滚方案

### Electron 回滚
```bash
cd packages/desktop
npm install electron@28.3.3 --save
```

### 依赖回滚
```bash
# 使用 npm ci 配合 package-lock.json 恢复
npm ci
```

---

## 验证清单

- [ ] Electron 构建成功（Windows/macOS/Linux）
- [ ] 桌面应用启动正常
- [ ] WebSocket 连接正常
- [ ] API 请求/响应正常
- [ ] 支付流程正常
- [ ] 安全测试通过
- [ ] 性能测试通过

---

## 时间表

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| 第一阶段 | 紧急修复（Electron + WebSocket） | 2天 |
| 第二阶段 | 重要升级（bcryptjs + helmet） | 2天 |
| 第三阶段 | 常规升级 | 3天 |
| 第四阶段 | @dcloudio 依赖处理 | 待定 |

**总计**：约 7 个工作日 + 后续跟进
