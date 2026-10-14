import type { IPlatformAdapter } from '@/interfaces/IPlatformAdapter';
import type { PlatformType } from '@/interfaces/ITypes';
import { WebNetworkModule } from './webNetworkModule';
import { WebStorageModule } from './webStorageModule';
import { WebCryptoModule } from './webCryptoModule';
import { WebLogModule } from './webLogModule';
import { TerminalModule } from './webTerminalModule';

export { TerminalModule } from './webTerminalModule';

export class WebPlatformAdapter implements IPlatformAdapter {
  readonly platform: PlatformType = 'web';
  readonly name: string = 'Web Platform Adapter';
  readonly version: string = '1.0.0';

  network: WebNetworkModule;
  storage: WebStorageModule;
  crypto: WebCryptoModule;
  log: WebLogModule;
  terminal: TerminalModule;

  constructor(config?: Record<string, any>) {
    this.network = new WebNetworkModule(config?.baseUrl, config?.timeout);
    this.storage = new WebStorageModule(config?.storagePrefix || 'gexm_');
    this.crypto = new WebCryptoModule();
    this.log = new WebLogModule();
    this.terminal = new TerminalModule();

    if (config?.logLevel) {
      this.log.setLevel(config.logLevel);
    }

    if (config?.debug) {
      this.log.setLevel('debug');
    }

    this.terminal.writeln('Terminal initialized in READ-WRITE mode', 'info');
    this.terminal.writeln('User input and command execution are enabled', 'info');
  }

  init(config?: Record<string, any>): void {
    if (config?.baseUrl) {
      this.network.setBaseUrl(config.baseUrl);
    }

    if (config?.timeout) {
      this.network.setDefaultTimeout(config.timeout);
    }

    if (config?.storagePrefix) {
      this.storage = new WebStorageModule(config.storagePrefix);
    }

    if (config?.encryptionKey) {
      this.storage.setEncryptKey(config.encryptionKey);
      this.storage.enableEncryption(true);
    }

    if (config?.logLevel) {
      this.log.setLevel(config.logLevel);
    }

    this.log.info(`WebPlatformAdapter initialized`, {
      platform: this.platform,
      version: this.version,
    });
  }

  destroy(): void {
    this.log.info(`WebPlatformAdapter destroyed`, {
      platform: this.platform,
    });
  }

  isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  getPlatformInfo(): {
    platform: PlatformType;
    os?: string;
    osVersion?: string;
    deviceModel?: string;
    browser?: string;
    browserVersion?: string;
  } {
    const ua = navigator.userAgent.toLowerCase();

    let os = 'unknown';
    let osVersion = 'unknown';
    let browser = 'unknown';
    let browserVersion = 'unknown';

    if (ua.includes('windows')) {
      os = 'windows';
      const match = ua.match(/windows nt (\d+\.\d+)/);
      osVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('mac os')) {
      os = 'macos';
      const match = ua.match(/mac os x (\d+[_.]\d+)/);
      osVersion = match ? match[1].replace('_', '.') : 'unknown';
    } else if (ua.includes('linux')) {
      os = 'linux';
      osVersion = 'unknown';
    }

    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'chrome';
      const match = ua.match(/chrome\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('edg')) {
      browser = 'edge';
      const match = ua.match(/edg\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('firefox')) {
      browser = 'firefox';
      const match = ua.match(/firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'safari';
      const match = ua.match(/version\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }

    return {
      platform: this.platform,
      os,
      osVersion,
      browser,
      browserVersion,
    };
  }
}