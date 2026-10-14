import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export * from './platform';

// ==================== 原有工具函数 ====================

export function formatDate(date: string | Date | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(format);
}

export function formatRelativeTime(date: string | Date | number): string {
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;

  const diffHours = now.diff(target, 'hour');
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = now.diff(target, 'day');
  if (diffDays < 7) return `${diffDays}天前`;

  return formatDate(date, 'YYYY-MM-DD');
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  } as T;
}

export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let last = 0;
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  } as T;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  const result = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key]);
    }
  }
  return result;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatPrice(price: number): string {
  return `¥${parseFloat(price.toString()).toFixed(2)}`;
}

export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function getStatusLabel(status: string, statusMap: Record<string, { label: string; color: string }>): string {
  return statusMap[status]?.label || status;
}

export function getStatusColor(status: string, statusMap: Record<string, { label: string; color: string }>): string {
  return statusMap[status]?.color || '#999';
}

export function removeEmptyFields<T>(obj: T): Partial<T> {
  const result = {} as Partial<T>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        result[key] = value;
      }
    }
  }
  return result;
}

export function generateOrderNo(): string {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(100000 + Math.random() * 900000).toString();
  return 'OD' + timestamp + random;
}

export function getWeekDays(): string[] {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
}

export function getMonthDays(year: number, month: number): number[] {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => i + 1);
}

export function isToday(date: string | Date | number): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

export function isYesterday(date: string | Date | number): boolean {
  return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
}

export function generateRandomString(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
