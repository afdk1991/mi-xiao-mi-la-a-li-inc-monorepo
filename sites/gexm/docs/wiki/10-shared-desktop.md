# 10 · 共享包与桌面端

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 10.1 @gexm/shared（共享包）

### 10.1.1 概述

- **路径**：[packages/shared/](file:///f:/gexm/packages/shared/)
- **入口**：[packages/shared/src/index.ts](file:///f:/gexm/packages/shared/src/index.ts)
- **职责**：跨端共享的 TypeScript 类型定义与工具函数

### 10.1.2 导出结构

仅导出 `types/index` 与 `utils/index`：

```typescript
// packages/shared/src/index.ts
export * from './types/index'
export * from './utils/index'
```

### 10.1.3 types/ 类型清单

跨端共享的 TypeScript 类型定义：

- `types/index.ts`：统一导出
- 业务类型：用户、订单、商品、支付、社交、聊天等
- 接口类型：API 请求/响应格式
- 枚举：状态码、错误码、业务枚举

### 10.1.4 utils/ 工具清单

| 文件 | 职责 |
| --- | --- |
| `utils/index.ts` | 工具函数统一导出 |
| `utils/platform.ts` | 平台判断工具 |
| `utils/tracing.ts` | TraceId 工具 |

### 10.1.5 依赖关系

被以下包通过 `file:../shared` 依赖：

- `@gexm/server`：[packages/server/package.json](file:///f:/gexm/packages/server/package.json)
- `@gexm/app`：[packages/app/package.json](file:///f:/gexm/packages/app/package.json)

```json
{
  "dependencies": {
    "@gexm/shared": "file:../shared"
  }
}
```

### 10.1.6 配置文件

- [package.json](file:///f:/gexm/packages/shared/package.json)
- [tsconfig.json](file:///f:/gexm/packages/shared/tsconfig.json)

## 10.2 @gexm/desktop（桌面端）

### 10.2.1 概述

- **路径**：[packages/desktop/](file:///f:/gexm/packages/desktop/)
- **技术栈**：Electron 28
- **职责**：提供桌面端用户体验，与 PC 后台共享部分代码

### 10.2.2 与 PC 后台的关系

桌面端与 PC 后台共享部分代码，通过 `@gexm/sdk` 的 `ElectronPlatformAdapter` 接入跨平台能力：

```
@Gexm/Desktop (Electron 28)
    ↓
@gexm/sdk (ElectronPlatformAdapter)
    ↓
底层 Electron API（Node.js + Chromium）
```

### 10.2.3 目录结构

```
packages/desktop/
├── .env.example         # 环境变量示例
├── .npmrc               # npm 配置
├── README.md            # 包说明
└── package.json         # 包配置
```

### 10.2.4 环境变量

参考 [.env.example](file:///f:/gexm/packages/desktop/.env.example)：

| 变量 | 说明 |
| --- | --- |
| `ELECTRON_API_BASE_URL` | 后端 API 地址 |
| `ELECTRON_TITLE` | 应用窗口标题 |
| `ELECTRON_WIDTH` | 窗口默认宽度 |
| `ELECTRON_HEIGHT` | 窗口默认高度 |

### 10.2.5 Electron 主进程与预加载

桌面端基于 Electron 28，典型结构包含：

- **主进程**（Main Process）：Node.js 环境，负责窗口管理、系统 API 调用
- **预加载脚本**（Preload Script）：在渲染进程加载前注入，桥接主进程与渲染进程
- **渲染进程**（Renderer Process）：Chromium 环境，加载 PC 后台的 Vue 应用

### 10.2.6 启动命令

```bash
# 开发模式
npm run dev:desktop

# 构建生产版本
npm run build:desktop
```

详见 [19-command-reference.md](file:///f:/gexm/docs/wiki/19-command-reference.md)。

## 10.3 跨包共享机制

### 10.3.1 类型共享

`@gexm/shared` 提供跨端共享的 TypeScript 类型定义，被 `@gexm/server` 和 `@gexm/app` 引用：

```typescript
// packages/server/src/services/orderService.ts
import { Order, OrderStatus } from '@gexm/shared'

async function createOrder(data: Order): Promise<Order> {
  // ...
}
```

```typescript
// packages/app/src/api/order.js
import { Order } from '@gexm/shared'

export async function getOrders(): Promise<Order[]> {
  // ...
}
```

### 10.3.2 工具函数共享

```typescript
// 跨端使用 platform.ts
import { isWeb, isWeixin, isApp } from '@gexm/shared/utils/platform'

if (isWeb()) {
  // Web 平台逻辑
} else if (isWeixin()) {
  // 微信小程序逻辑
}
```

```typescript
// 跨端使用 tracing.ts
import { generateTraceId } from '@gexm/shared/utils/tracing'

const traceId = generateTraceId()
fetch('/api/v1/users', { headers: { 'X-Trace-Id': traceId } })
```

### 10.3.3 SDK 适配器桥接

桌面端通过 SDK 接入跨平台能力：

```typescript
// packages/desktop/main.ts
import { GexmSDK } from '@gexm/sdk'

GexmSDK.init({ platform: 'electron' })

// 业务代码无需感知 Electron 与 Web 差异
const response = await GexmSDK.network.get('/api/v1/users')
await GexmSDK.storage.set('userInfo', userInfo)
```
