import type { StorageOptions } from './ITypes';

export interface IStorageModule {
  get(key: string, options?: { encrypt?: boolean }): any;

  set(key: string, value: any, options?: StorageOptions): boolean;

  remove(key: string): boolean;

  clear(): void;

  keys(): string[];

  has(key: string): boolean;

  getLength(): number;

  getItemInfo(key: string): { value: any; expiresAt?: number; createdAt: number } | null;

  setEncryptKey(key: string): void;

  enableEncryption(enable: boolean): void;

  setDefaultTTL(ttl: number): void;

  cleanupExpired(): number;
}