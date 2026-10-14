import type { IPlatformAdapter } from '@/interfaces/IPlatformAdapter';
import type { INetworkModule } from '@/interfaces/INetworkModule';
import type { IStorageModule } from '@/interfaces/IStorageModule';
import type { ICryptoModule } from '@/interfaces/ICryptoModule';
import type { ILogModule } from '@/interfaces/ILogModule';
import type { PlatformType, NetworkRequestConfig, NetworkResponse, StorageOptions, StorageItem, LogLevel, LogMessage, EncryptionOptions } from '@/interfaces/ITypes';
import { TerminalModule } from '@/adapters/web/webTerminalModule';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

interface Interceptor<T> {
  id: number;
  axiosId: number;
  onFulfilled: (value: T) => T | Promise<T>;
  onRejected?: (error: any) => any;
}

export class ElectronNetworkModule implements INetworkModule {
  private axiosInstance: AxiosInstance;
  private requestInterceptors: Interceptor<InternalAxiosRequestConfig>[] = [];
  private responseInterceptors: Interceptor<AxiosResponse>[] = [];
  private interceptorIdCounter = 0;

  constructor(baseUrl?: string, timeout?: number) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: timeout || 30000,
      withCredentials: true,
    });
  }

  private transformConfig(config: NetworkRequestConfig): AxiosRequestConfig {
    return {
      url: config.url,
      method: config.method || 'GET',
      params: config.params,
      data: config.data,
      headers: config.headers,
      timeout: config.timeout,
      responseType: config.responseType as any,
      withCredentials: config.withCredentials,
    };
  }

  private transformResponse<T>(response: AxiosResponse): NetworkResponse<T> {
    return {
      data: response.data as T,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }

  async request<T = any>(config: NetworkRequestConfig): Promise<NetworkResponse<T>> {
    const axiosConfig = this.transformConfig(config);
    const response = await this.axiosInstance.request(axiosConfig);
    return this.transformResponse(response);
  }

  async get<_T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'GET', params, ...config });
  }

  async post<_T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'POST', data, ...config });
  }

  async put<_T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'PUT', data, ...config });
  }

  async delete<_T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'DELETE', params, ...config });
  }

  async patch<_T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>) {
    return this.request({ url, method: 'PATCH', data, ...config });
  }

  setBaseUrl(url: string) { this.axiosInstance.defaults.baseURL = url; }
  setDefaultHeaders(headers: Record<string, string>) { Object.assign(this.axiosInstance.defaults.headers.common, headers); }
  setDefaultTimeout(timeout: number) { this.axiosInstance.defaults.timeout = timeout; }

  addRequestInterceptor(onFulfilled: (config: NetworkRequestConfig) => NetworkRequestConfig | Promise<NetworkRequestConfig>, onRejected?: (error: any) => any): number {
    const id = ++this.interceptorIdCounter;

    const axiosId = this.axiosInstance.interceptors.request.use(
      async (axiosConfig: InternalAxiosRequestConfig) => {
        const config: NetworkRequestConfig = {
          url: axiosConfig.url || '',
          method: axiosConfig.method as any,
          params: axiosConfig.params,
          data: axiosConfig.data,
          headers: axiosConfig.headers as Record<string, string> || {},
          timeout: axiosConfig.timeout,
          responseType: axiosConfig.responseType as any,
          withCredentials: axiosConfig.withCredentials,
        };

        const result = await onFulfilled(config);

        return {
          ...axiosConfig,
          url: result.url,
          method: result.method,
          params: result.params,
          data: result.data,
          headers: result.headers || {},
          timeout: result.timeout,
          responseType: result.responseType,
          withCredentials: result.withCredentials,
        } as InternalAxiosRequestConfig;
      },
      onRejected
    );

    this.requestInterceptors.push({ id, axiosId, onFulfilled: onFulfilled as any, onRejected });
    return id;
  }

  addResponseInterceptor(onFulfilled: (response: NetworkResponse) => NetworkResponse | Promise<NetworkResponse>, onRejected?: (error: any) => any): number {
    const id = ++this.interceptorIdCounter;

    const axiosId = this.axiosInstance.interceptors.response.use(
      async (axiosResponse: AxiosResponse) => {
        const response = this.transformResponse(axiosResponse);
        const result = await onFulfilled(response);

        return {
          ...axiosResponse,
          data: result.data,
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
        };
      },
      onRejected
    );

    this.responseInterceptors.push({ id, axiosId, onFulfilled: onFulfilled as any, onRejected });
    return id;
  }

  removeRequestInterceptor(id: number): void {
    const interceptor = this.requestInterceptors.find((i) => i.id === id);
    if (interceptor) {
      this.axiosInstance.interceptors.request.eject(interceptor.axiosId);
      this.requestInterceptors = this.requestInterceptors.filter((i) => i.id !== id);
    }
  }

  removeResponseInterceptor(id: number): void {
    const interceptor = this.responseInterceptors.find((i) => i.id === id);
    if (interceptor) {
      this.axiosInstance.interceptors.response.eject(interceptor.axiosId);
      this.responseInterceptors = this.responseInterceptors.filter((i) => i.id !== id);
    }
  }
}

export class ElectronStorageModule implements IStorageModule {
  private storagePrefix: string;
  private storageDir: string;
  private encryptKey: string | null = null;
  private encryptionEnabled: boolean = false;
  private defaultTTL: number = 0;

  constructor(prefix: string = 'gexm_') {
    this.storagePrefix = prefix;
    this.storageDir = path.join(process.env.APPDATA || process.env.HOME || '.', '.gexm', 'storage');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.storageDir, `${this.storagePrefix}${key}.json`);
  }

  private encryptValue(value: string) {
    if (!this.encryptionEnabled || !this.encryptKey) return value;
    try { return CryptoJS.AES.encrypt(value, this.encryptKey).toString(); } catch { return value; }
  }

  private decryptValue(value: string) {
    if (!this.encryptionEnabled || !this.encryptKey) return value;
    try {
      const decrypted = CryptoJS.AES.decrypt(value, this.encryptKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch { return value; }
  }

  private createStorageItem(value: any, ttl?: number): StorageItem {
    return { value, expiresAt: ttl ? Date.now() + ttl * 1000 : undefined, createdAt: Date.now() };
  }

  get(key: string, options?: { encrypt?: boolean }) {
    try {
      const filePath = this.getFilePath(key);
      if (!fs.existsSync(filePath)) return null;

      const content = fs.readFileSync(filePath, 'utf8');
      const decrypted = options?.encrypt !== false ? this.decryptValue(content) : content;
      const item: StorageItem = JSON.parse(decrypted);

      if (item.expiresAt && Date.now() > item.expiresAt) {
        fs.unlinkSync(filePath);
        return null;
      }

      return item.value;
    } catch { return null; }
  }

  set(key: string, value: any, options?: StorageOptions): boolean {
    try {
      const filePath = this.getFilePath(key);
      const ttl = options?.ttl ?? this.defaultTTL;
      const item = this.createStorageItem(value, ttl);
      const serialized = JSON.stringify(item);
      const encrypted = options?.encrypt !== false ? this.encryptValue(serialized) : serialized;

      fs.writeFileSync(filePath, encrypted, 'utf8');
      return true;
    } catch { return false; }
  }

  remove(key: string): boolean {
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return true;
    } catch { return false; }
  }

  clear() {
    try {
      const files = fs.readdirSync(this.storageDir);
      files.forEach((file: string) => {
        if (file.startsWith(this.storagePrefix)) {
          fs.unlinkSync(path.join(this.storageDir, file));
        }
      });
    } catch {}
  }

  keys(): string[] {
    try {
      const files = fs.readdirSync(this.storageDir);
      return files
        .filter((file: string) => file.startsWith(this.storagePrefix) && file.endsWith('.json'))
        .map((file) => file.substring(this.storagePrefix.length, file.length - 5));
    } catch { return []; }
  }

  has(key: string): boolean {
    return fs.existsSync(this.getFilePath(key));
  }

  getLength(): number {
    return this.keys().length;
  }

  getItemInfo(key: string) {
    try {
      const filePath = this.getFilePath(key);
      if (!fs.existsSync(filePath)) return null;

      const content = fs.readFileSync(filePath, 'utf8');
      const decrypted = this.decryptValue(content);
      const item: StorageItem = JSON.parse(decrypted);

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

export class ElectronCryptoModule implements ICryptoModule {
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
    return Buffer.from(text).toString('base64');
  }

  base64Decode(encoded: string): string {
    return Buffer.from(encoded, 'base64').toString('utf8');
  }
  uuid() { return uuidv4(); }
  uuidv4() { return uuidv4(); }
}

export class ElectronLogModule implements ILogModule {
  private currentLevel: LogLevel = 'info';
  private consoleEnabled: boolean = true;
  private fileEnabled: boolean = false;
  private fileOutputPath: string = '';
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

    if (this.fileEnabled && this.fileOutputPath) {
      try {
        const logLine = `[${new Date(message.timestamp).toISOString()}] ${message.level.toUpperCase()}: ${message.message}\n`;
        fs.appendFileSync(this.fileOutputPath, logLine, 'utf8');
      } catch {}
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
  setFileOutput(path: string) { this.fileOutputPath = path; }
  getMessages(limit?: number) { return this.messages.slice(-(limit || this.messages.length)); }
  clearMessages() { this.messages = []; }
  onLog(listener: (message: LogMessage) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }
}

export class ElectronPlatformAdapter implements IPlatformAdapter {
  readonly platform: PlatformType = 'electron';
  readonly name: string = 'Electron Platform Adapter';
  readonly version: string = '1.0.0';

  network: INetworkModule;
  storage: IStorageModule;
  crypto: ICryptoModule;
  log: ILogModule;
  terminal: TerminalModule;

  constructor(config?: Record<string, any>) {
    this.network = new ElectronNetworkModule(config?.baseUrl, config?.timeout);
    this.storage = new ElectronStorageModule(config?.storagePrefix || 'gexm_');
    this.crypto = new ElectronCryptoModule();
    this.log = new ElectronLogModule();
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
    if (config?.storagePrefix) this.storage = new ElectronStorageModule(config.storagePrefix);
    if (config?.encryptionKey) {
      this.storage.setEncryptKey(config.encryptionKey);
      this.storage.enableEncryption(true);
    }
    if (config?.logLevel) this.log.setLevel(config.logLevel);

    this.log.info(`ElectronPlatformAdapter initialized`, { platform: this.platform, version: this.version });
  }

  destroy() {
    this.log.info(`ElectronPlatformAdapter destroyed`, { platform: this.platform });
  }

  isSupported(): boolean {
    return typeof process !== 'undefined' && process.versions?.electron !== undefined;
  }

  getPlatformInfo() {
    return {
      platform: this.platform,
      os: process.platform,
      osVersion: (process as any).getSystemVersion?.() || 'unknown',
      deviceModel: 'desktop',
      browser: 'electron',
      browserVersion: process.versions?.electron || 'unknown',
    };
  }
}