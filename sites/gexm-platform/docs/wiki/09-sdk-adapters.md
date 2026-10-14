# 09 · 跨平台 SDK（@gexm/sdk）

> 返回 [Wiki 索引](file:///f:/gexm/docs/wiki/README.md)

---

## 9.1 设计目标

通过**适配器模式**为 9 个平台提供统一的 network、storage、crypto、log、terminal 接口，业务代码无需感知底层平台差异。

## 9.2 主入口

[packages/sdk/src/index.ts](file:///f:/gexm/packages/sdk/src/index.ts)

### 9.2.1 GexmSDK 类完整 API

```typescript
class GexmSDK {
  // 初始化与销毁
  static init(config: SDKConfig = {}): void
  static destroy(): void
  static isInitialized(): boolean

  // 平台信息
  static getPlatform(): PlatformType | null
  static getAdapter(): IPlatformAdapter | null

  // 模块访问器（getter）
  static get network(): INetworkModule
  static get storage(): IStorageModule
  static get crypto(): ICryptoModule
  static get log(): ILogModule
  static get terminal(): ITerminalModule  // 仅部分平台支持

  // 核心机制
  static get eventBus(): EventBus
  static get pluginRegistry(): PluginRegistry

  // 扩展
  static registerPlatform(platform: PlatformType, adapter: IPlatformAdapter): void
  static usePlugin(plugin: IPlugin): void
  static registerDefaultAdapters(config: SDKConfig): void
}

export { GexmSDK as SDK }
export default GexmSDK
```

### 9.2.2 初始化流程

```typescript
// packages/sdk/src/index.ts
static init(config: SDKConfig = {}): void {
  if (isInitialized) {
    throw new SDKError(ErrorCodes.SDK_ALREADY_INITIALIZED)
  }

  // 1. 检测当前平台
  const platform = config.platform || PlatformFactory.detect()

  // 2. 注册所有默认适配器
  GexmSDK.registerDefaultAdapters(config)

  // 3. 设置当前平台
  PlatformFactory.setCurrentPlatform(platform)

  // 4. 获取当前适配器并初始化
  const adapter = PlatformFactory.getCurrentAdapter()
  if (!adapter) {
    throw new SDKError(ErrorCodes.PLATFORM_ADAPTER_NOT_FOUND)
  }

  adapter.init(config)
  pluginRegistry.setAdapter(adapter)
  pluginRegistry.initAllPlugins()

  isInitialized = true

  // 5. 触发初始化事件
  eventBus.emit('sdk:initialized', { platform, config })
}
```

## 9.3 平台适配器清单

| 平台 | 适配器类 | 文件 |
| --- | --- | --- |
| Web | `WebPlatformAdapter` | [adapters/web/index.ts](file:///f:/gexm/packages/sdk/src/adapters/web/index.ts) |
| 微信小程序 | `MPWeixinPlatformAdapter` | [adapters/mp-weixin/index.ts](file:///f:/gexm/packages/sdk/src/adapters/mp-weixin/index.ts) |
| 支付宝小程序 | `MPAlipayPlatformAdapter` | [adapters/mp-alipay/index.ts](file:///f:/gexm/packages/sdk/src/adapters/mp-alipay/index.ts) |
| 百度小程序 | `MPBaiduPlatformAdapter` | [adapters/mp-baidu/index.ts](file:///f:/gexm/packages/sdk/src/adapters/mp-baidu/index.ts) |
| 抖音小程序 | `MPToutiaoPlatformAdapter` | [adapters/mp-toutiao/index.ts](file:///f:/gexm/packages/sdk/src/adapters/mp-toutiao/index.ts) |
| App (uni-app plus) | `AppPlusPlatformAdapter` | [adapters/app-plus/index.ts](file:///f:/gexm/packages/sdk/src/adapters/app-plus/index.ts) |
| Electron | `ElectronPlatformAdapter` | [adapters/electron/index.ts](file:///f:/gexm/packages/sdk/src/adapters/electron/index.ts) |
| 鸿蒙小程序 | `MpHarmonyPlatformAdapter` | [adapters/mp-harmony/index.ts](file:///f:/gexm/packages/sdk/src/adapters/mp-harmony/index.ts) |
| 鸿蒙 App | `AppHarmonyPlatformAdapter` | [adapters/app-harmony/index.ts](file:///f:/gexm/packages/sdk/src/adapters/app-harmony/index.ts) |

### 9.3.1 默认适配器注册

```typescript
// packages/sdk/src/index.ts
const defaultAdapters = {
  web: WebPlatformAdapter,
  'mp-weixin': MPWeixinPlatformAdapter,
  'mp-alipay': MPAlipayPlatformAdapter,
  'mp-baidu': MPBaiduPlatformAdapter,
  'mp-toutiao': MPToutiaoPlatformAdapter,
  'app-plus': AppPlusPlatformAdapter,
  electron: ElectronPlatformAdapter,
  'mp-harmony': MpHarmonyPlatformAdapter,
  'app-harmony': AppHarmonyPlatformAdapter,
}

static registerDefaultAdapters(config: SDKConfig): void {
  Object.entries(defaultAdapters).forEach(([key, AdapterClass]) => {
    try {
      const adapter = new AdapterClass(config)
      PlatformFactory.register(key as PlatformType, adapter)
    } catch {
      console.warn(`Failed to register adapter for platform: ${key}`)
    }
  })
}
```

## 9.4 Web 适配器模块详解

[packages/sdk/src/adapters/web/](file:///f:/gexm/packages/sdk/src/adapters/web/) 目录下完整模块：

| 模块 | 文件 | 职责 |
| --- | --- | --- |
| Network | [webNetworkModule.ts](file:///f:/gexm/packages/sdk/src/adapters/web/webNetworkModule.ts) | 基于 fetch/axios 的网络请求 |
| Storage | [webStorageModule.ts](file:///f:/gexm/packages/sdk/src/adapters/web/webStorageModule.ts) | 基于 localStorage 的存储 |
| Crypto | [webCryptoModule.ts](file:///f:/gexm/packages/sdk/src/adapters/web/webCryptoModule.ts) | 基于 Web Crypto API 的加解密 |
| Log | [webLogModule.ts](file:///f:/gexm/packages/sdk/src/adapters/web/webLogModule.ts) | 基于 console 的日志 |
| Terminal | [webTerminalModule.ts](file:///f:/gexm/packages/sdk/src/adapters/web/webTerminalModule.ts) | Web 终端交互 |

## 9.5 模块接口

### 9.5.1 INetworkModule

统一网络请求接口，所有适配器必须实现：

```typescript
interface INetworkModule {
  request<T>(config: RequestConfig): Promise<Response<T>>
  get<T>(url: string, params?: object): Promise<Response<T>>
  post<T>(url: string, data?: object): Promise<Response<T>>
  put<T>(url: string, data?: object): Promise<Response<T>>
  delete<T>(url: string, params?: object): Promise<Response<T>>
}
```

### 9.5.2 IStorageModule

统一存储接口：

```typescript
interface IStorageModule {
  get(key: string): Promise<any>
  set(key: string, value: any): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}
```

### 9.5.3 ICryptoModule

统一加解密接口：

```typescript
interface ICryptoModule {
  encrypt(data: string, key?: string): Promise<string>
  decrypt(data: string, key?: string): Promise<string>
  hash(data: string, algorithm?: string): Promise<string>
  randomBytes(length: number): Promise<Uint8Array>
}
```

### 9.5.4 ILogModule

统一日志接口：

```typescript
interface ILogModule {
  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
}
```

### 9.5.5 ITerminalModule

终端交互接口（仅部分平台支持）：

```typescript
interface ITerminalModule {
  execute(command: string): Promise<TerminalResult>
  kill(processId: string): Promise<void>
  list(): Promise<ProcessInfo[]>
}
```

### 9.5.6 IPlatformAdapter

适配器接口：

```typescript
interface IPlatformAdapter {
  init(config: SDKConfig): void
  destroy(): void
  network: INetworkModule
  storage: IStorageModule
  crypto: ICryptoModule
  log: ILogModule
  terminal?: ITerminalModule  // 可选
}
```

### 9.5.7 IPluginHost

插件宿主接口：

```typescript
interface IPluginHost {
  usePlugin(plugin: IPlugin): void
  pluginRegistry: PluginRegistry
}
```

## 9.6 核心机制

### 9.6.1 PlatformFactory（平台工厂）

**职责**：平台检测与适配器工厂

- `detect()`：自动检测当前运行平台
- `register(platform, adapter)`：注册平台适配器
- `setCurrentPlatform(platform)`：设置当前平台
- `getCurrentPlatform()`：获取当前平台
- `getCurrentAdapter()`：获取当前适配器

### 9.6.2 EventBus（事件总线）

**职责**：发布订阅模式的事件总线

```typescript
class EventBus {
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
  once(event: string, callback: Function): void
  emit(event: string, data?: any): void
  removeAllListeners(event?: string): void
}
```

**核心事件**：

- `sdk:initialized`：SDK 初始化完成
- `sdk:destroyed`：SDK 销毁
- `platform:changed`：平台切换
- `plugin:registered`：插件注册
- `plugin:destroyed`：插件销毁

### 9.6.3 PluginRegistry（插件注册表）

**职责**：管理插件的注册、初始化、销毁

```typescript
class PluginRegistry {
  register(plugin: IPlugin): void
  unregister(name: string): void
  initAllPlugins(): void
  destroyAllPlugins(): void
  getPlugin(name: string): IPlugin | undefined
  setAdapter(adapter: IPlatformAdapter): void
}
```

### 9.6.4 ErrorCodes（统一错误码）

**职责**：定义 SDK 所有错误码

```typescript
enum ErrorCodes {
  SDK_ALREADY_INITIALIZED = 'SDK_ALREADY_INITIALIZED',
  SDK_NOT_INITIALIZED = 'SDK_NOT_INITIALIZED',
  PLATFORM_ADAPTER_NOT_FOUND = 'PLATFORM_ADAPTER_NOT_FOUND',
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
  PLUGIN_ALREADY_REGISTERED = 'PLUGIN_ALREADY_REGISTERED',
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',
  STORAGE_OPERATION_FAILED = 'STORAGE_OPERATION_FAILED',
  CRYPTO_OPERATION_FAILED = 'CRYPTO_OPERATION_FAILED',
}
```

## 9.7 SDK 配置

```typescript
interface SDKConfig {
  platform?: PlatformType        // 显式指定平台（默认自动检测）
  network?: NetworkConfig        // 网络配置
  storage?: StorageConfig        // 存储配置
  crypto?: CryptoConfig          // 加密配置
  log?: LogConfig                // 日志配置
  plugins?: IPlugin[]            // 初始插件列表
}

type PlatformType =
  | 'web'
  | 'mp-weixin'
  | 'mp-alipay'
  | 'mp-baidu'
  | 'mp-toutiao'
  | 'mp-harmony'
  | 'app-plus'
  | 'app-harmony'
  | 'electron'
```

## 9.8 使用示例

### 9.8.1 基础使用

```typescript
import { GexmSDK } from '@gexm/sdk'

// 1. 初始化（自动检测平台）
GexmSDK.init()

// 2. 网络请求
const response = await GexmSDK.network.get('/api/v1/users')

// 3. 存储
await GexmSDK.storage.set('token', 'xxx')
const token = await GexmSDK.storage.get('token')

// 4. 日志
GexmSDK.log.info('App started')

// 5. 加密
const encrypted = await GexmSDK.crypto.encrypt('sensitive data')
```

### 9.8.2 显式指定平台

```typescript
import { GexmSDK } from '@gexm/sdk'

GexmSDK.init({
  platform: 'mp-weixin',
  network: { baseURL: 'https://api.example.com', timeout: 5000 },
})
```

### 9.8.3 使用插件

```typescript
import { GexmSDK, MyPlugin } from '@gexm/sdk'

GexmSDK.init()
GexmSDK.usePlugin(new MyPlugin())
```

### 9.8.4 监听事件

```typescript
import { GexmSDK } from '@gexm/sdk'

GexmSDK.eventBus.on('platform:changed', (data) => {
  console.log('Platform changed:', data)
})
```

## 9.9 测试

**测试配置**：[jest.config.js](file:///f:/gexm/packages/sdk/jest.config.js)

**测试覆盖**：

- Web 适配器各模块（`webTerminalModule.test.ts` 等）
- PlatformFactory 平台检测
- EventBus 事件总线
- PluginRegistry 插件注册
- ErrorCodes 错误码

## 9.10 类型文档生成

**配置**：[typedoc.json](file:///f:/gexm/packages/sdk/typedoc.json)

通过 TypeDoc 自动生成 SDK 的 API 文档。
