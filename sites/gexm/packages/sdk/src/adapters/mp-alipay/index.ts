import type { IPlatformAdapter } from '@/interfaces/IPlatformAdapter';
import type { INetworkModule } from '@/interfaces/INetworkModule';
import type { IStorageModule } from '@/interfaces/IStorageModule';
import type { ICryptoModule } from '@/interfaces/ICryptoModule';
import type { ILogModule } from '@/interfaces/ILogModule';
import type { PlatformType, NetworkRequestConfig, NetworkResponse, StorageOptions, StorageItem, LogLevel, LogMessage, EncryptionOptions } from '@/interfaces/ITypes';
import { TerminalModule } from '@/adapters/web/webTerminalModule';
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

interface Interceptor {
  onFulfilled: (value: any) => any;
  onRejected?: (error: any) => any;
}

export class MPAlipayNetworkModule implements INetworkModule {
  private baseUrl: string = '';
  private timeout: number = 30000;
  private defaultHeaders: Record<string, string> = {};
  private requestInterceptors = new Map<number, Interceptor>();
  private responseInterceptors = new Map<number, Interceptor>();
  private interceptorIdCounter = 0;

  async request<T = any>(config: NetworkRequestConfig): Promise<NetworkResponse<T>> {
    const url = config.url.startsWith('http') ? config.url : `${this.baseUrl}${config.url}`;

    return new Promise((resolve, reject) => {
      uni.request({
        url,
        method: (config.method || 'GET') as any,
        data: config.data || config.params,
        header: { ...this.defaultHeaders, ...config.headers },
        timeout: config.timeout || this.timeout,
        responseType: config.responseType as any,
        success: (res: any) => {
          resolve({
            data: res.data as T,
            status: res.statusCode,
            statusText: '',
            headers: res.header || {},
          });
        },
        fail: (err: any) => {
          reject(err);
        },
      });
    });
  }

  async get<T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'GET', params, ...config });
  }

  async post<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'POST', data, ...config });
  }

  async put<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'PUT', data, ...config });
  }

  async delete<T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'DELETE', params, ...config });
  }

  async patch<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'PATCH', data, ...config });
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = headers;
  }

  setDefaultTimeout(timeout: number) {
    this.timeout = timeout;
  }

  addRequestInterceptor(onFulfilled: (config: NetworkRequestConfig) => NetworkRequestConfig | Promise<NetworkRequestConfig>, onRejected?: (error: any) => any): number {
    const id = ++this.interceptorIdCounter;
    this.requestInterceptors.set(id, { onFulfilled, onRejected });
    return id;
  }

  addResponseInterceptor(onFulfilled: (response: NetworkResponse) => NetworkResponse | Promise<NetworkResponse>, onRejected?: (error: any) => any): number {
    const id = ++this.interceptorIdCounter;
    this.responseInterceptors.set(id, { onFulfilled, onRejected });
    return id;
  }

  removeRequestInterceptor(id: number) {
    this.requestInterceptors.delete(id);
  }

  removeResponseInterceptor(id: number) {
    this.responseInterceptors.delete(id);
  }
}

export class MPAlipayStorageModule implements IStorageModule {
  private storagePrefix: string;
  private encryptKey: string | null = null;
  private encryptionEnabled: boolean = false;
  private defaultTTL: number = 0;

  constructor(prefix: string = 'gexm_') {
    this.storagePrefix = prefix;
  }

  private getFullKey(key: string) {
    return `${this.storagePrefix}${key}`;
  }

  private encryptValue(value: string) {
    if (!this.encryptionEnabled || !this.encryptKey) return value;
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(value));
  }

  private decryptValue(value: string) {
    if (!this.encryptionEnabled || !this.encryptKey) return value;
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(value));
  }

  private createStorageItem(value: any, ttl?: number): StorageItem {
    return { value, expiresAt: ttl ? Date.now() + ttl * 1000 : undefined, createdAt: Date.now() };
  }

  get(key: string, options?: { encrypt?: boolean }) {
    try {
      const fullKey = this.getFullKey(key);
      const stored = uni.getStorageSync(fullKey);
      if (!stored) return null;

      const decrypted = options?.encrypt !== false ? this.decryptValue(stored) : stored;
      const item: StorageItem = JSON.parse(decrypted);

      if (item.expiresAt && Date.now() > item.expiresAt) {
        uni.removeStorageSync(fullKey);
        return null;
      }

      return item.value;
    } catch { return null; }
  }

  set(key: string, value: any, options?: StorageOptions): boolean {
    try {
      const fullKey = this.getFullKey(key);
      const ttl = options?.ttl ?? this.defaultTTL;
      const item = this.createStorageItem(value, ttl);
      const serialized = JSON.stringify(item);
      const encrypted = options?.encrypt !== false ? this.encryptValue(serialized) : serialized;

      uni.setStorageSync(fullKey, encrypted);
      return true;
    } catch { return false; }
  }

  remove(key: string): boolean {
    try { uni.removeStorageSync(this.getFullKey(key)); return true; } catch { return false; }
  }

  clear() {
    try {
      const keys = this.keys();
      keys.forEach((key) => uni.removeStorageSync(this.getFullKey(key)));
    } catch {}
  }

  keys(): string[] {
    try {
      const info = uni.getStorageInfoSync();
      const prefix = this.storagePrefix;
      return info.keys.filter((key: string) => key.startsWith(prefix)).map((key: string) => key.substring(prefix.length));
    } catch { return []; }
  }

  has(key: string): boolean { return this.get(key) !== null; }

  getLength(): number { return this.keys().length; }

  getItemInfo(key: string) {
    try {
      const fullKey = this.getFullKey(key);
      const stored = uni.getStorageSync(fullKey);
      if (!stored) return null;
      const item: StorageItem = JSON.parse(this.decryptValue(stored));
      return { value: item.value, expiresAt: item.expiresAt, createdAt: item.createdAt };
    } catch { return null; }
  }

  setEncryptKey(key: string) { this.encryptKey = key; }

  enableEncryption(enable: boolean) { this.encryptionEnabled = enable; }

  setDefaultTTL(ttl: number) { this.defaultTTL = ttl; }

  cleanupExpired(): number {
    let cleaned = 0;
    try {
      const keys = this.keys();
      keys.forEach((key) => {
        const info = this.getItemInfo(key);
        if (info?.expiresAt && Date.now() > info.expiresAt) {
          this.remove(key);
          cleaned++;
        }
      });
    } catch {}
    return cleaned;
  }
}

export class MPAlipayCryptoModule implements ICryptoModule {
  encrypt(text: string, key: string, options?: EncryptionOptions): string {
    const algorithm = options?.algorithm || 'AES';
    const iv = options?.iv || this.generateIV(16);
    const keyHash = CryptoJS.SHA256(key).toString();
    const ivBytes = CryptoJS.enc.Hex.parse(iv);

    if (algorithm === 'AES') {
      const encrypted = CryptoJS.AES.encrypt(text, keyHash, { iv: ivBytes, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      return `${iv}:${encrypted.toString()}`;
    }

    if (algorithm === 'DES') {
      const desKey = CryptoJS.SHA256(key).toString().substring(0, 16);
      const encrypted = CryptoJS.DES.encrypt(text, desKey, { iv: ivBytes, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      return `${iv}:${encrypted.toString()}`;
    }

    throw new Error('Unsupported algorithm');
  }

  decrypt(ciphertext: string, key: string, options?: EncryptionOptions): string {
    const algorithm = options?.algorithm || 'AES';
    const [iv, encrypted] = ciphertext.split(':');
    if (!iv || !encrypted) throw new Error('Invalid ciphertext format');

    const keyHash = CryptoJS.SHA256(key).toString();
    const ivBytes = CryptoJS.enc.Hex.parse(iv);

    if (algorithm === 'AES') {
      const decrypted = CryptoJS.AES.decrypt(encrypted, keyHash, { iv: ivBytes, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      return decrypted.toString(CryptoJS.enc.Utf8);
    }

    if (algorithm === 'DES') {
      const desKey = CryptoJS.SHA256(key).toString().substring(0, 16);
      const decrypted = CryptoJS.DES.decrypt(encrypted, desKey, { iv: ivBytes, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      return decrypted.toString(CryptoJS.enc.Utf8);
    }

    throw new Error('Unsupported algorithm');
  }

  md5(text: string) { return CryptoJS.MD5(text).toString(); }

  sha256(text: string) { return CryptoJS.SHA256(text).toString(); }

  sha512(text: string) { return CryptoJS.SHA512(text).toString(); }

  hmacSHA256(text: string, key: string) { return CryptoJS.HmacSHA256(text, key).toString(); }

  hmacSHA512(text: string, key: string) { return CryptoJS.HmacSHA512(text, key).toString(); }

  generateRandomKey(length?: number): string {
    const len = length || 32;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  generateIV(length?: number): string {
    const len = length || 16;
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  base64Encode(text: string): string {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text));
  }

  base64Decode(encoded: string): string {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(encoded));
  }

  uuid() { return uuidv4(); }

  uuidv4() { return uuidv4(); }
}

export class MPAlipayLogModule implements ILogModule {
  private currentLevel: LogLevel = 'info';
  private consoleEnabled: boolean = true;
  private fileEnabled: boolean = false;
  private messages: LogMessage[] = [];
  private maxMessages: number = 1000;
  private listeners: ((message: LogMessage) => void)[] = [];

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLevel];
  }

  private createMessage(level: LogLevel, message: string, context?: Record<string, any>): LogMessage {
    return { level, message, timestamp: Date.now(), context };
  }

  private output(message: LogMessage) {
    if (this.consoleEnabled) {
      const formattedTime = new Date(message.timestamp).toISOString();
      const contextStr = message.context ? ` ${JSON.stringify(message.context)}` : '';
      console.log(`[${formattedTime}] ${message.level.toUpperCase()}: ${message.message}${contextStr}`);
    }

    if (this.messages.length >= this.maxMessages) this.messages.shift();
    this.messages.push(message);

    this.listeners.forEach((listener) => {
      try { listener(message); } catch {}
    });
  }

  trace(message: string, context?: Record<string, any>) { if (this.shouldLog('trace')) this.output(this.createMessage('trace', message, context)); }

  debug(message: string, context?: Record<string, any>) { if (this.shouldLog('debug')) this.output(this.createMessage('debug', message, context)); }

  info(message: string, context?: Record<string, any>) { if (this.shouldLog('info')) this.output(this.createMessage('info', message, context)); }

  warn(message: string, context?: Record<string, any>) { if (this.shouldLog('warn')) this.output(this.createMessage('warn', message, context)); }

  error(message: string, context?: Record<string, any>) { if (this.shouldLog('error')) this.output(this.createMessage('error', message, context)); }

  fatal(message: string, context?: Record<string, any>) { if (this.shouldLog('fatal')) this.output(this.createMessage('fatal', message, context)); }

  setLevel(level: LogLevel) { this.currentLevel = level; }

  getLevel() { return this.currentLevel; }

  enableConsole(enable: boolean) { this.consoleEnabled = enable; }

  enableFile(enable: boolean) { this.fileEnabled = enable; }

  setFileOutput(path: string) {}

  getMessages(limit?: number) { return this.messages.slice(-(limit || this.messages.length)); }

  clearMessages() { this.messages = []; }

  onLog(listener: (message: LogMessage) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }
}

export class MPAlipayPlatformAdapter implements IPlatformAdapter {
  readonly platform: PlatformType = 'mp-alipay';
  readonly name: string = 'Alipay Mini Program Platform Adapter';
  readonly version: string = '1.0.0';

  network: INetworkModule;
  storage: IStorageModule;
  crypto: ICryptoModule;
  log: ILogModule;
  terminal: TerminalModule;

  constructor(config?: Record<string, any>) {
    this.network = new MPAlipayNetworkModule();
    this.storage = new MPAlipayStorageModule(config?.storagePrefix || 'gexm_');
    this.crypto = new MPAlipayCryptoModule();
    this.log = new MPAlipayLogModule();
    this.terminal = new TerminalModule();

    if (config?.baseUrl) this.network.setBaseUrl(config.baseUrl);
    if (config?.timeout) this.network.setDefaultTimeout(config.timeout);
    if (config?.logLevel) this.log.setLevel(config.logLevel);
    if (config?.debug) this.log.setLevel('debug');

    this.terminal.writeln('Terminal initialized in READ-WRITE mode', 'info');
    this.terminal.writeln('User input and command execution are enabled', 'info');
  }

  init(config?: Record<string, any>) {
    if (config?.baseUrl) this.network.setBaseUrl(config.baseUrl);
    if (config?.timeout) this.network.setDefaultTimeout(config.timeout);
    if (config?.storagePrefix) this.storage = new MPAlipayStorageModule(config.storagePrefix);
    if (config?.encryptionKey) {
      this.storage.setEncryptKey(config.encryptionKey);
      this.storage.enableEncryption(true);
    }
    if (config?.logLevel) this.log.setLevel(config.logLevel);

    this.log.info(`MPAlipayPlatformAdapter initialized`, { platform: this.platform, version: this.version });
  }

  destroy() {
    this.log.info(`MPAlipayPlatformAdapter destroyed`, { platform: this.platform });
  }

  isSupported(): boolean {
    return typeof uni !== 'undefined' && typeof uni.getSystemInfoSync === 'function';
  }

  getPlatformInfo() {
    try {
      const sysInfo = uni.getSystemInfoSync();
      return {
        platform: this.platform,
        os: sysInfo.platform || 'unknown',
        osVersion: sysInfo.system || 'unknown',
        deviceModel: sysInfo.model || 'unknown',
        browser: 'alipay',
        browserVersion: sysInfo.version || 'unknown',
      };
    } catch {
      return { platform: this.platform };
    }
  }
}