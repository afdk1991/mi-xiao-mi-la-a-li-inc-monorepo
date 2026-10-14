// 安全随机数生成器检测：优先使用 crypto API，不可用时回退到 Math.random()
const cryptoObj: Crypto | null =
  typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined'
    ? globalThis.crypto
    : typeof window !== 'undefined' && typeof window.crypto !== 'undefined'
      ? window.crypto
      : null;

let _cryptoWarned = false;
function warnInsecureRandom(): void {
  if (!_cryptoWarned) {
    console.warn('[Security] crypto.getRandomValues is not available, falling back to Math.random() (insecure)');
    _cryptoWarned = true;
  }
}

export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
};

export const isNode = (): boolean => {
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
};

export const isElectron = (): boolean => {
  if (isNode()) {
    return !!process.versions?.electron;
  }
  if (isBrowser()) {
    return !!(window as any).electron;
  }
  return false;
};

export const isMiniProgram = (): boolean => {
  if (!isBrowser()) return false;
  
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('miniprogram') ||
    ua.includes('micromessenger') ||
    ua.includes('alipay') ||
    ua.includes('baidu') ||
    ua.includes('toutiao') ||
    ua.includes('douyin') ||
    window.__wxjs_environment === 'miniprogram'
  );
};

export const getTimestamp = (): number => {
  return Date.now();
};

export const getISOString = (): string => {
  return new Date().toISOString();
};

export const formatDate = (date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as T;
  }

  if (typeof obj === 'object') {
    const cloned: Record<string, any> = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned as T;
  }

  return obj;
};

export const merge = <T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T => {
  const result = deepClone(target);

  for (const source of sources) {
    if (source === null || typeof source !== 'object') {
      continue;
    }

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const targetValue = result[key];
        const sourceValue = source[key];

        if (
          typeof targetValue === 'object' &&
          typeof sourceValue === 'object' &&
          targetValue !== null &&
          sourceValue !== null
        ) {
          result[key] = merge(targetValue, sourceValue);
        } else {
          (result as Record<string, any>)[key] = sourceValue;
        }
      }
    }
  }

  return result;
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const uuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r: number;
    if (cryptoObj) {
      const arr = new Uint32Array(1);
      cryptoObj.getRandomValues(arr);
      r = arr[0] % 16;
    } else {
      warnInsecureRandom();
      r = (Math.random() * 16) | 0;
    }
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  if (cryptoObj) {
    const array = new Uint32Array(length);
    cryptoObj.getRandomValues(array);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
    return result;
  }
  warnInsecureRandom();
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const regex = /^1[3-9]\d{9}$/;
  return regex.test(phone);
};

export const validateUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

export const truncateString = (str: string, maxLength: number, suffix: string = '...'): string => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
};

export const removeWhitespace = (str: string): string => {
  return str.replace(/\s+/g, '');
};

export const trimString = (str: string): string => {
  return str.trim();
};

export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
};

export const isNotEmpty = (value: any): boolean => {
  return !isEmpty(value);
};

export const safeParseJSON = <T = any>(jsonString: string): T | null => {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
};

export const safeStringifyJSON = (obj: any, replacer?: any, space?: number): string => {
  try {
    return JSON.stringify(obj, replacer, space);
  } catch {
    return '{}';
  }
};

export const getType = (value: any): string => {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await delay(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError || new Error('Retry failed');
};