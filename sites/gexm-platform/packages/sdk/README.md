# @gexm/sdk

Gexm 跨平台适配 SDK，提供统一的平台检测、网络请求、存储管理、加密、日志、事件总线等核心能力，支持 H5、微信小程序、支付宝小程序、百度小程序、抖音小程序、HarmonyOS、App、Electron 等多端平台。

## 模块简介

本 SDK 旨在消除多端平台的 API 差异，为业务层提供一套统一的调用接口。通过适配器模式（Adapter Pattern），将各平台的原生能力封装为标准化接口，业务代码无需关心运行平台，由 SDK 在运行时自动检测并选择合适的适配器实现。

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 语言 | TypeScript | 6.0.x，全量类型定义 |
| 构建工具 | Vite | 5.0.x，多产物构建（ES/UMD/CJS） |
| HTTP 客户端 | axios | 1.6.x |
| 加密库 | crypto-js | 4.2.x，AES/DES/TripleDES |
| 唯一标识 | uuid | 9.0.x |
| 类型文档 | TypeDoc | 0.25.x，自动生成 API 文档 |
| 测试框架 | Jest | 29.7.x |
| 类型声明 | vite-plugin-dts | 3.7.x，自动生成 .d.ts |

## 目录结构

```
packages/sdk/
├── src/
│   ├── core/                       # 核心层
│   │   ├── index.ts                # 核心模块入口
│   │   ├── platformFactory.ts      # 平台工厂（检测/注册/获取适配器）
│   │   ├── eventBus.ts             # 事件总线
│   │   ├── pluginRegistry.ts       # 插件注册中心
│   │   ├── errorCodes.ts           # 错误码与 SDKError
│   │   └── utils.ts                # 通用工具（debounce/throttle/uuid/merge 等）
│   ├── adapters/                   # 平台适配器层
│   │   ├── web/                    # Web/H5 适配器
│   │   │   └── index.ts
│   │   ├── mp-weixin/              # 微信小程序适配器
│   │   │   └── index.ts
│   │   ├── mp-alipay/              # 支付宝小程序适配器
│   │   │   └── index.ts
│   │   ├── mp-baidu/               # 百度小程序适配器
│   │   │   └── index.ts
│   │   ├── mp-toutiao/             # 抖音小程序适配器（已注册，按需启用）
│   │   ├── app-plus/               # uni-app App 适配器（iOS/Android）
│   │   │   └── index.ts
│   │   ├── electron/               # Electron 桌面端适配器
│   │   │   └── index.ts
│   │   ├── mp-harmony/             # 鸿蒙小程序适配器
│   │   └── app-harmony/            # 鸿蒙 App 适配器
│   ├── interfaces/                 # 接口定义层
│   │   ├── index.ts                # 接口聚合
│   │   ├── ITypes.ts               # 公共类型（PlatformType / SDKConfig 等）
│   │   ├── INetworkModule.ts       # 网络模块接口
│   │   ├── IStorageModule.ts       # 存储模块接口
│   │   ├── ICryptoModule.ts        # 加密模块接口
│   │   ├── ILogModule.ts           # 日志模块接口
│   │   ├── IPlatformAdapter.ts     # 平台适配器接口
│   │   └── IPluginHost.ts          # 插件宿主接口
│   ├── globals.d.ts                # 全局类型声明
│   └── index.ts                    # SDK 入口（GexmSDK 类）
├── tests/                          # 单元测试
│   ├── setup.ts
│   ├── gexmSDK.test.ts
│   ├── platformFactory.test.ts
│   ├── eventBus.test.ts
│   ├── pluginRegistry.test.ts
│   ├── errorCodes.test.ts
│   ├── webCryptoModule.test.ts
│   ├── webStorageModule.test.ts
│   └── automation/
│       └── testRunner.ts
├── scripts/
│   └── build-all.ts                # 一键多端构建
├── docs/                           # TypeDoc 生成的 API 文档
├── dist/                           # 构建产物（ES/UMD/CJS + d.ts）
├── coverage/                       # 测试覆盖率报告
├── .github/workflows/ci-cd.yml     # CI/CD 配置
├── vite.config.ts                  # 默认 Vite 配置
├── vite.config.web.ts              # Web 构建配置
├── vite.config.mp-weixin.ts        # 微信小程序构建配置
├── vite.config.mp-alipay.ts        # 支付宝小程序构建配置
├── tsconfig.json
├── typedoc.json                    # TypeDoc 配置
├── jest.config.js
└── package.json
```

## 核心功能

| 能力 | 模块 | 说明 |
|------|------|------|
| 平台检测 | `PlatformFactory` | 自动识别运行平台，支持手动指定；提供适配器注册与获取 |
| 网络请求 | `INetworkModule` | 基于 axios 的统一请求接口，支持 GET/POST/PUT/DELETE/PATCH、超时、凭证 |
| 存储管理 | `IStorageModule` | 键值存储，支持 TTL 过期、加密存储、命名空间前缀 |
| 加密 | `ICryptoModule` | 基于 crypto-js 的对称加密（AES/DES/TripleDES），支持自定义 IV |
| 日志 | `ILogModule` | 分级日志（trace/debug/info/warn/error/fatal），支持上下文与时间戳 |
| 事件总线 | `EventBus` | 发布订阅模式，跨模块通信，支持 SDK 生命周期事件 |
| 插件系统 | `PluginRegistry` | 插件注册、初始化、销毁，运行时扩展 SDK 能力 |
| 错误处理 | `SDKError` + `ErrorCodes` | 统一错误码与错误对象，便于业务侧识别与处理 |
| 工具函数 | `utils` | debounce、throttle、uuid、merge、deepClone、formatDate、retry 等 |

## 适配器说明

SDK 默认注册以下适配器，运行时由 `PlatformFactory.detect()` 自动选择：

| 适配器 | 平台标识 | 适用场景 |
|--------|----------|----------|
| `WebPlatformAdapter` | `web` | 浏览器环境、H5 应用、PWA |
| `MPWeixinPlatformAdapter` | `mp-weixin` | 微信小程序 |
| `MPAlipayPlatformAdapter` | `mp-alipay` | 支付宝小程序 |
| `MPBaiduPlatformAdapter` | `mp-baidu` | 百度小程序 |
| `MPToutiaoPlatformAdapter` | `mp-toutiao` | 抖音小程序 |
| `MpHarmonyPlatformAdapter` | `mp-harmony` | 鸿蒙小程序 |
| `AppPlusPlatformAdapter` | `app-plus` | uni-app 编译的 App（iOS/Android） |
| `AppHarmonyPlatformAdapter` | `app-harmony` | 鸿蒙 App |
| `ElectronPlatformAdapter` | `electron` | Electron 桌面端 |

每个适配器实现统一的 `IPlatformAdapter` 接口，内部封装对应平台的 `network`、`storage`、`crypto`、`log` 模块。

## 快速开始

### 安装

在 monorepo 工作区内直接引用：

```json
{
  "dependencies": {
    "@gexm/sdk": "file:../sdk"
  }
}
```

或通过 npm 安装：

```bash
npm install @gexm/sdk
```

### 初始化

```typescript
import { GexmSDK } from '@gexm/sdk';

// 默认配置（自动检测平台）
GexmSDK.init();

// 自定义配置
GexmSDK.init({
  platform: 'web',           // 显式指定平台
  baseUrl: 'https://api.yourdomain.com',
  timeout: 10000,
  debug: true,
  logLevel: 'info',
  storagePrefix: 'gexm_',
  encryptionKey: 'your-secret-key',
});
```

### 使用示例

#### 网络请求

```typescript
// GET
const res = await GexmSDK.network.get('/api/products', { params: { page: 1 } });

// POST
const res = await GexmSDK.network.post('/api/auth/login', { data: { username, password } });

// 完整配置
const res = await GexmSDK.network.request({
  url: '/api/orders',
  method: 'POST',
  data: { items: [...] },
  headers: { Authorization: `Bearer ${token}` },
  timeout: 15000,
});
```

#### 存储管理

```typescript
// 普通存储
GexmSDK.storage.set('user', { id: 1, name: 'Tom' });

// 加密存储 + TTL（秒）
GexmSDK.storage.set('token', 'secret-token', { encrypt: true, ttl: 3600 });

// 读取
const user = GexmSDK.storage.get('user');

// 删除
GexmSDK.storage.remove('token');

// 清空
GexmSDK.storage.clear();
```

#### 加密

```typescript
const plaintext = 'hello world';
const ciphertext = GexmSDK.crypto.encrypt(plaintext);
const decrypted = GexmSDK.crypto.decrypt(ciphertext);

// 自定义算法
const cipher = GexmSDK.crypto.encrypt(plaintext, { algorithm: 'AES', iv: 'custom-iv' });
```

#### 日志

```typescript
GexmSDK.log.trace('详细追踪信息');
GexmSDK.log.debug('调试信息', { context: 'value' });
GexmSDK.log.info('普通信息');
GexmSDK.log.warn('警告信息');
GexmSDK.log.error('错误信息', { code: 500 });
GexmSDK.log.fatal('致命错误');
```

#### 事件总线

```typescript
// 订阅
const off = GexmSDK.eventBus.on('user:login', (payload) => {
  console.log('用户登录', payload);
});

// 发布
GexmSDK.eventBus.emit('user:login', { userId: 1 });

// 取消订阅
off();

// SDK 生命周期事件
GexmSDK.eventBus.on('sdk:initialized', ({ platform, config }) => {
  console.log('SDK 已初始化', platform);
});
```

#### 插件扩展

```typescript
import { GexmSDK } from '@gexm/sdk';

const myPlugin = {
  info: { id: 'my-plugin', name: 'MyPlugin', version: '1.0.0', enabled: true },
  init(adapter) { /* 初始化逻辑 */ },
  destroy() { /* 销毁逻辑 */ },
};

GexmSDK.usePlugin(myPlugin);
```

### 销毁

```typescript
GexmSDK.destroy();
```

## API 概览

完整 API 文档由 TypeDoc 自动生成，运行 `npm run docs` 后可在 `docs/` 目录查看。

### GexmSDK 静态方法

| 方法 | 说明 |
|------|------|
| `GexmSDK.init(config)` | 初始化 SDK |
| `GexmSDK.destroy()` | 销毁 SDK，释放资源 |
| `GexmSDK.isInitialized()` | 是否已初始化 |
| `GexmSDK.getPlatform()` | 获取当前平台标识 |
| `GexmSDK.getAdapter()` | 获取当前平台适配器实例 |
| `GexmSDK.registerPlatform(type, adapter)` | 注册自定义平台适配器 |
| `GexmSDK.usePlugin(plugin)` | 注册插件 |

### GexmSDK 静态属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `GexmSDK.network` | `INetworkModule` | 网络请求模块 |
| `GexmSDK.storage` | `IStorageModule` | 存储模块 |
| `GexmSDK.crypto` | `ICryptoModule` | 加密模块 |
| `GexmSDK.log` | `ILogModule` | 日志模块 |
| `GexmSDK.eventBus` | `EventBus` | 事件总线 |
| `GexmSDK.pluginRegistry` | `PluginRegistry` | 插件注册中心 |

### 主要类型

| 类型 | 说明 |
|------|------|
| `PlatformType` | 平台标识联合类型 |
| `SDKConfig` | SDK 初始化配置 |
| `NetworkRequestConfig` | 网络请求配置 |
| `NetworkResponse<T>` | 网络响应结构 |
| `StorageOptions` | 存储选项（加密/TTL） |
| `EncryptionOptions` | 加密选项（算法/IV） |
| `LogLevel` | 日志级别 |
| `ErrorCode` | 错误码结构 |
| `SDKError` | SDK 错误对象 |

## 多端构建

SDK 针对不同平台提供独立的 Vite 构建配置：

```bash
# 默认构建（全量产物：ES/UMD/CJS + 类型声明）
npm run build

# 仅 Web 产物
npm run build:web

# 微信小程序产物
npm run build:mp-weixin

# 支付宝小程序产物
npm run build:mp-alipay

# 一键构建所有平台
npm run build:all
```

构建产物位于 `dist/` 目录。

## 测试

```bash
# 全量测试
npm test

# 覆盖率
npm run test:coverage

# 微信小程序专项测试
npm run test:mp-weixin

# 支付宝小程序专项测试
npm run test:mp-alipay
```

## 类型检查与文档

```bash
# 类型检查
npm run typecheck

# 生成 API 文档（TypeDoc）
npm run docs
```

## 许可证

MIT
