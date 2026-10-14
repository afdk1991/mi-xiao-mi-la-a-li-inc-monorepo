import type { NetworkRequestConfig, NetworkResponse } from './ITypes';

export interface INetworkModule {
  request<T = any>(config: NetworkRequestConfig): Promise<NetworkResponse<T>>;

  get<T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>>;

  post<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>>;

  put<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>>;

  delete<T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>>;

  patch<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>>;

  setBaseUrl(url: string): void;

  setDefaultHeaders(headers: Record<string, string>): void;

  setDefaultTimeout(timeout: number): void;

  addRequestInterceptor(onFulfilled: (config: NetworkRequestConfig) => NetworkRequestConfig | Promise<NetworkRequestConfig>, onRejected?: (error: any) => any): number;

  addResponseInterceptor(onFulfilled: (response: NetworkResponse) => NetworkResponse | Promise<NetworkResponse>, onRejected?: (error: any) => any): number;

  removeRequestInterceptor(id: number): void;

  removeResponseInterceptor(id: number): void;
}