export type PlatformType = 'web' | 'mp-weixin' | 'mp-alipay' | 'mp-baidu' | 'mp-toutiao' | 'app-plus' | 'electron' | 'mp-harmony' | 'app-harmony';

export interface SDKConfig {
  platform?: PlatformType;
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
  logLevel?: LogLevel;
  storagePrefix?: string;
  encryptionKey?: string;
}

export interface NetworkRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, any>;
  data?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob';
  withCredentials?: boolean;
}

export interface NetworkResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface StorageOptions {
  encrypt?: boolean;
  ttl?: number;
}

export interface StorageItem {
  value: any;
  expiresAt?: number;
  createdAt: number;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface EncryptionOptions {
  algorithm?: 'AES' | 'DES' | 'TripleDES';
  keySize?: number;
  iv?: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
}

export interface ErrorCode {
  code: number;
  message: string;
  details?: string;
  suggestion?: string;
}