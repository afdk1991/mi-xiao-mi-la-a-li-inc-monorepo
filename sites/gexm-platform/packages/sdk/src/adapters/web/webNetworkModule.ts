import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { INetworkModule } from '@/interfaces/INetworkModule';
import type { NetworkRequestConfig, NetworkResponse } from '@/interfaces/ITypes';

interface Interceptor<T> {
  id: number;
  axiosId: number;
  onFulfilled: (value: T) => T | Promise<T>;
  onRejected?: (error: any) => any;
}

export class WebNetworkModule implements INetworkModule {
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
    try {
      const axiosConfig = this.transformConfig(config);
      const response = await this.axiosInstance.request(axiosConfig);
      return this.transformResponse(response);
    } catch (error) {
      throw error;
    }
  }

  async get<T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>> {
    return this.request({
      url,
      method: 'GET',
      params,
      ...config,
    });
  }

  async post<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>> {
    return this.request({
      url,
      method: 'POST',
      data,
      ...config,
    });
  }

  async put<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>> {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...config,
    });
  }

  async delete<T = any>(url: string, params?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>> {
    return this.request({
      url,
      method: 'DELETE',
      params,
      ...config,
    });
  }

  async patch<T = any>(url: string, data?: Record<string, any>, config?: Omit<NetworkRequestConfig, 'url' | 'method'>): Promise<NetworkResponse<T>> {
    return this.request({
      url,
      method: 'PATCH',
      data,
      ...config,
    });
  }

  setBaseUrl(url: string): void {
    this.axiosInstance.defaults.baseURL = url;
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.axiosInstance.defaults.headers.common, headers);
  }

  setDefaultTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
  }

  addRequestInterceptor(onFulfilled: (config: NetworkRequestConfig) => NetworkRequestConfig | Promise<NetworkRequestConfig>, onRejected?: (error: any) => any): number {
    const id = ++this.interceptorIdCounter;
    
    const axiosId = this.axiosInstance.interceptors.request.use(
      async (axiosConfig) => {
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
      async (axiosResponse) => {
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