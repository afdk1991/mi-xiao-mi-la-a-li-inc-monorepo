import CryptoJS from 'crypto-js';
import type { IStorageModule } from '@/interfaces/IStorageModule';
import type { StorageOptions, StorageItem } from '@/interfaces/ITypes';

export class WebStorageModule implements IStorageModule {
  private storagePrefix: string;
  private encryptKey: string | null = null;
  private encryptionEnabled: boolean = false;
  private defaultTTL: number = 0;

  constructor(prefix: string = 'gexm_') {
    this.storagePrefix = prefix;
  }

  private getFullKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  private encryptValue(value: string): string {
    if (!this.encryptionEnabled || !this.encryptKey) {
      return value;
    }
    try {
      return CryptoJS.AES.encrypt(value, this.encryptKey).toString();
    } catch {
      return value;
    }
  }

  private decryptValue(value: string): string {
    if (!this.encryptionEnabled || !this.encryptKey) {
      return value;
    }
    try {
      const decrypted = CryptoJS.AES.decrypt(value, this.encryptKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch {
      return value;
    }
  }

  private createStorageItem(value: any, ttl?: number): StorageItem {
    return {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
      createdAt: Date.now(),
    };
  }

  get(key: string, options?: { encrypt?: boolean }): any {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);

      if (!stored) {
        return null;
      }

      const decrypted = options?.encrypt !== false ? this.decryptValue(stored) : stored;
      const item: StorageItem = JSON.parse(decrypted);

      if (item.expiresAt && Date.now() > item.expiresAt) {
        localStorage.removeItem(fullKey);
        return null;
      }

      return item.value;
    } catch {
      return null;
    }
  }

  set(key: string, value: any, options?: StorageOptions): boolean {
    try {
      const fullKey = this.getFullKey(key);
      const ttl = options?.ttl ?? this.defaultTTL;
      const item = this.createStorageItem(value, ttl);
      const serialized = JSON.stringify(item);
      const encrypted = options?.encrypt !== false ? this.encryptValue(serialized) : serialized;

      localStorage.setItem(fullKey, encrypted);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      const prefix = this.storagePrefix;
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }

  keys(): string[] {
    try {
      const prefix = this.storagePrefix;
      const keys: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key.substring(prefix.length));
        }
      }

      return keys;
    } catch {
      return [];
    }
  }

  has(key: string): boolean {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);

      if (!stored) {
        return false;
      }

      try {
        const item: StorageItem = JSON.parse(this.decryptValue(stored));
        if (item.expiresAt && Date.now() > item.expiresAt) {
          localStorage.removeItem(fullKey);
          return false;
        }
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  getLength(): number {
    return this.keys().length;
  }

  getItemInfo(key: string): { value: any; expiresAt?: number; createdAt: number } | null {
    try {
      const fullKey = this.getFullKey(key);
      const stored = localStorage.getItem(fullKey);

      if (!stored) {
        return null;
      }

      const decrypted = this.decryptValue(stored);
      const item: StorageItem = JSON.parse(decrypted);

      if (item.expiresAt && Date.now() > item.expiresAt) {
        localStorage.removeItem(fullKey);
        return null;
      }

      return {
        value: item.value,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
      };
    } catch {
      return null;
    }
  }

  setEncryptKey(key: string): void {
    this.encryptKey = key;
  }

  enableEncryption(enable: boolean): void {
    this.encryptionEnabled = enable;
  }

  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  cleanupExpired(): number {
    let cleaned = 0;

    try {
      const keys = this.keys();

      for (const key of keys) {
        const info = this.getItemInfo(key);
        if (info?.expiresAt && Date.now() > info.expiresAt) {
          this.remove(key);
          cleaned++;
        }
      }
    } catch {
      // ignore
    }

    return cleaned;
  }
}