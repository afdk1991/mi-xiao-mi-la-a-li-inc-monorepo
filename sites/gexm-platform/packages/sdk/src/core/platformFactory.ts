import type { PlatformType } from '@/interfaces/ITypes';
import type { IPlatformAdapter } from '@/interfaces/IPlatformAdapter';

const adapters = new Map<PlatformType, IPlatformAdapter>();
let currentPlatform: PlatformType | null = null;

export class PlatformFactory {
  static register(platform: PlatformType, adapter: IPlatformAdapter): void {
    adapters.set(platform, adapter);
  }

  static unregister(platform: PlatformType): void {
    adapters.delete(platform);
  }

  static get(platform: PlatformType): IPlatformAdapter | undefined {
    return adapters.get(platform);
  }

  static getAll(): Map<PlatformType, IPlatformAdapter> {
    return new Map(adapters);
  }

  static setCurrentPlatform(platform: PlatformType): void {
    if (!adapters.has(platform)) {
      throw new Error(`Platform adapter not registered: ${platform}`);
    }
    currentPlatform = platform;
  }

  static getCurrentPlatform(): PlatformType | null {
    return currentPlatform;
  }

  static getCurrentAdapter(): IPlatformAdapter | null {
    if (!currentPlatform) {
      return null;
    }
    return adapters.get(currentPlatform) || null;
  }

  static detect(): PlatformType {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();

      if (ua.includes('miniprogram') || ua.includes('micromessenger')) {
        return 'mp-weixin';
      }

      if (ua.includes('alipay')) {
        return 'mp-alipay';
      }

      if (ua.includes('baidu')) {
        return 'mp-baidu';
      }

      if (ua.includes('toutiao') || ua.includes('douyin')) {
        return 'mp-toutiao';
      }

      if (window.__wxjs_environment === 'miniprogram') {
        return 'mp-weixin';
      }

      if (window.electron) {
        return 'electron';
      }

      if (window.__uni__) {
        const uniEnv = (window as any).__uni__?.platform;
        if (uniEnv === 'app-plus') {
          return 'app-plus';
        }
        if (uniEnv === 'mp-harmony') {
          return 'mp-harmony';
        }
        if (uniEnv === 'app-harmony') {
          return 'app-harmony';
        }
      }
    }

    if (typeof process !== 'undefined' && process.versions?.electron) {
      return 'electron';
    }

    return 'web';
  }

  static autoDetectAndSet(): PlatformType {
    const detected = this.detect();
    this.setCurrentPlatform(detected);
    return detected;
  }

  static isRegistered(platform: PlatformType): boolean {
    return adapters.has(platform);
  }

  static getRegisteredPlatforms(): PlatformType[] {
    return Array.from(adapters.keys());
  }

  static reset(): void {
    adapters.clear();
    currentPlatform = null;
  }
}