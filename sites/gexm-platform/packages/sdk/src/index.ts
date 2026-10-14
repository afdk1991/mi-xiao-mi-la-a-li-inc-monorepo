import type { SDKConfig, PlatformType } from '@/interfaces/ITypes';
import { PlatformFactory } from '@/core/platformFactory';
import { EventBus } from '@/core/eventBus';
import { PluginRegistry } from '@/core/pluginRegistry';
import { ErrorCodes, SDKError } from '@/core/errorCodes';
import { WebPlatformAdapter } from '@/adapters/web/index';
import { MPWeixinPlatformAdapter } from '@/adapters/mp-weixin/index';
import { MPAlipayPlatformAdapter } from '@/adapters/mp-alipay/index';
import { MPBaiduPlatformAdapter } from '@/adapters/mp-baidu/index';
import { MPToutiaoPlatformAdapter } from '@/adapters/mp-toutiao/index';
import { AppPlusPlatformAdapter } from '@/adapters/app-plus/index';
import { ElectronPlatformAdapter } from '@/adapters/electron/index';
import { MpHarmonyPlatformAdapter } from '@/adapters/mp-harmony/index';
import { AppHarmonyPlatformAdapter } from '@/adapters/app-harmony/index';

export * from '@/interfaces/index';
export * from '@/core/index';
export * from '@/adapters/web/index';
export * from '@/adapters/mp-weixin/index';
export * from '@/adapters/mp-alipay/index';
export * from '@/adapters/mp-baidu/index';
export * from '@/adapters/mp-toutiao/index';
export * from '@/adapters/app-plus/index';
export * from '@/adapters/electron/index';
export * from '@/adapters/mp-harmony/index';
export * from '@/adapters/app-harmony/index';

let isInitialized = false;
const eventBus = new EventBus();
const pluginRegistry = new PluginRegistry();

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
};

export class GexmSDK {
  static init(config: SDKConfig = {}): void {
    if (isInitialized) {
      throw new SDKError(ErrorCodes.SDK_ALREADY_INITIALIZED);
    }

    const platform = config.platform || PlatformFactory.detect();

    GexmSDK.registerDefaultAdapters(config);

    PlatformFactory.setCurrentPlatform(platform);

    const adapter = PlatformFactory.getCurrentAdapter();
    if (!adapter) {
      throw new SDKError(ErrorCodes.PLATFORM_ADAPTER_NOT_FOUND);
    }

    adapter.init(config);
    pluginRegistry.setAdapter(adapter);
    pluginRegistry.initAllPlugins();

    isInitialized = true;

    eventBus.emit('sdk:initialized', {
      platform,
      config,
    });
  }

  static registerDefaultAdapters(config: SDKConfig): void {
    Object.entries(defaultAdapters).forEach(([key, AdapterClass]) => {
      try {
        const adapter = new AdapterClass(config);
        PlatformFactory.register(key as PlatformType, adapter);
      } catch {
        console.warn(`Failed to register adapter for platform: ${key}`);
      }
    });
  }

  static destroy(): void {
    if (!isInitialized) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }

    pluginRegistry.destroyAllPlugins();

    const adapter = PlatformFactory.getCurrentAdapter();
    if (adapter) {
      adapter.destroy();
    }

    isInitialized = false;

    eventBus.emit('sdk:destroyed');
  }

  static isInitialized(): boolean {
    return isInitialized;
  }

  static getPlatform(): PlatformType | null {
    return PlatformFactory.getCurrentPlatform();
  }

  static getAdapter() {
    return PlatformFactory.getCurrentAdapter();
  }

  static get network() {
    if (!isInitialized) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    const adapter = PlatformFactory.getCurrentAdapter();
    if (!adapter) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    return adapter.network;
  }

  static get storage() {
    if (!isInitialized) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    const adapter = PlatformFactory.getCurrentAdapter();
    if (!adapter) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    return adapter.storage;
  }

  static get crypto() {
    if (!isInitialized) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    const adapter = PlatformFactory.getCurrentAdapter();
    if (!adapter) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    return adapter.crypto;
  }

  static get log() {
    if (!isInitialized) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    const adapter = PlatformFactory.getCurrentAdapter();
    if (!adapter) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    return adapter.log;
  }

  static get terminal() {
    if (!isInitialized) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    const adapter = PlatformFactory.getCurrentAdapter();
    if (!adapter || !adapter.terminal) {
      throw new SDKError(ErrorCodes.SDK_NOT_INITIALIZED);
    }
    return adapter.terminal;
  }

  static get eventBus(): EventBus {
    return eventBus;
  }

  static get pluginRegistry(): PluginRegistry {
    return pluginRegistry;
  }

  static registerPlatform(platform: PlatformType, adapter: any): void {
    PlatformFactory.register(platform, adapter);
  }

  static usePlugin(plugin: any): void {
    pluginRegistry.register(plugin);
  }
}

export { GexmSDK as SDK };

export default GexmSDK;