import { BASE_URL, PUBLISHABLE_KEY, USE_MOCK } from '../config';
import type { ApiResult } from './types';
import { mockPosts, mockProducts, mockTools } from '../mock/data';

/** 简易 mock 路由：按 url 返回本地数据 */
function mockResolve<T>(url: string): ApiResult<T> | null {
  if (url.startsWith('/products')) {
    return { code: 0, message: 'ok', data: mockProducts as unknown as T };
  }
  if (url.startsWith('/posts')) {
    return { code: 0, message: 'ok', data: mockPosts as unknown as T };
  }
  if (url === '/tools/list' || url.startsWith('/tools')) {
    return { code: 0, message: 'ok', data: mockTools as unknown as T };
  }
  return null;
}

export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST';
  data?: Record<string, unknown>;
}

/** 统一请求封装：mock 优先，否则走 CloudBase PG REST */
export function request<T = unknown>(opts: RequestOptions): Promise<ApiResult<T>> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hit = mockResolve<T>(opts.url);
        if (hit) resolve(hit);
        else resolve({ code: 404, message: `mock not found: ${opts.url}`, data: null as unknown as T });
      }, 200);
    });
  }

  // CloudBase PG REST 直接返回数组，包装成统一 ApiResult
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + opts.url,
      method: opts.method ?? 'GET',
      data: opts.data,
      header: {
        'Authorization': `Bearer ${PUBLISHABLE_KEY}`,
        'apikey': PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ code: 0, message: 'ok', data: res.data as T });
        } else {
          uni.showToast({ title: `请求失败 ${res.statusCode}`, icon: 'none' });
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        reject(err);
      },
    });
  });
}
