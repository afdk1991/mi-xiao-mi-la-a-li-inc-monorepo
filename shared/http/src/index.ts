// 统一 HTTP 请求封装。
// 消除此前 7+ 处各自实现的 request.ts / http.ts
// （APPsp、MIXMLAAL admin-react、MIXMLAAL miniapp、项目01 h5 / daijia client / gexm pc / foundation），
// 统一为：一套 ApiResult 结果契约 + 超时 + 错误处理 + 拦截器 + 多端适配器。

/** 统一结果契约。此前各项目有 {success,msg} / {ok,data} / 裸 data 三种风格，现统一为 ApiResult。 */
export interface ApiResult<T> {
  /** 0 表示成功，非 0 为业务/HTTP 错误码 */
  code: number
  message: string
  data: T
}

export function ok<T>(data: T): ApiResult<T> {
  return { code: 0, message: 'ok', data }
}

export function fail<T>(message: string, code = -1): ApiResult<T> {
  return { code, message, data: null as unknown as T }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestOptions {
  url: string
  method?: HttpMethod
  /** query 参数（GET）或 body（其余） */
  data?: Record<string, unknown> | string
  headers?: Record<string, string>
  timeout?: number
}

/** 适配器的原始响应，由 HttpClient 统一包装为 ApiResult */
export interface RawResponse {
  statusCode: number
  data: unknown
}

/**
 * 传输适配器。默认 fetch；uni-app / 小程序可注入 uni.request 适配器，
 * 从而让同一套上层代码跨端复用 —— 这是「统一接口规范」的关键抽象。
 */
export type HttpAdapter = (opts: {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  body?: string
  timeout: number
}) => Promise<RawResponse>

/** 默认 fetch 适配器 */
export const fetchAdapter: HttpAdapter = async ({ url, method, headers, body, timeout }) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal })
    const text = await res.text()
    let parsed: unknown = text
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      /* 非 JSON 响应直接返回文本 */
    }
    return { statusCode: res.status, data: parsed }
  } finally {
    clearTimeout(timer)
  }
}

/** uni-app / 小程序适配器工厂（uni.request 签名与 fetch 不同，需桥接） */
export interface UniLike {
  request(opts: {
    url: string
    method?: string
    data?: unknown
    header?: Record<string, string>
    timeout?: number
    success?: (res: { statusCode: number; data: unknown }) => void
    fail?: (err: unknown) => void
  }): void
}

export function createUniAdapter(uni: UniLike): HttpAdapter {
  return ({ url, method, headers, body, timeout }) =>
    new Promise<RawResponse>((resolve, reject) => {
      uni.request({
        url,
        method,
        header: headers,
        data: body ? (JSON.parse(body) as unknown) : undefined,
        timeout,
        success: (res) => resolve({ statusCode: res.statusCode, data: res.data }),
        fail: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      })
    })
}

export interface ClientConfig {
  baseUrl?: string
  timeout?: number
  headers?: Record<string, string>
  adapter?: HttpAdapter
  /** 请求拦截：可改写 options（如注入 token） */
  onRequest?: (opts: RequestOptions) => RequestOptions | Promise<RequestOptions>
  /** 响应拦截：可改写结果（如统一拆包、刷新 token） */
  onResponse?: <T>(res: ApiResult<T>) => ApiResult<T> | Promise<ApiResult<T>>
  /** 错误钩子（日志/埋点） */
  onError?: (err: unknown, opts: RequestOptions) => void
}

export class HttpClient {
  private readonly config: Required<Pick<ClientConfig, 'baseUrl' | 'timeout' | 'headers' | 'adapter'>> &
    ClientConfig

  constructor(config: ClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? '',
      timeout: config.timeout ?? 10000,
      headers: { 'Content-Type': 'application/json', ...(config.headers ?? {}) },
      adapter: config.adapter ?? fetchAdapter,
      onRequest: config.onRequest,
      onResponse: config.onResponse,
      onError: config.onError,
    }
  }

  /** 创建继承当前配置的新实例（用于切换 baseUrl / 注入 token） */
  extend(overrides: ClientConfig): HttpClient {
    return new HttpClient({
      baseUrl: overrides.baseUrl ?? this.config.baseUrl,
      timeout: overrides.timeout ?? this.config.timeout,
      headers: { ...this.config.headers, ...(overrides.headers ?? {}) },
      adapter: overrides.adapter ?? this.config.adapter,
      onRequest: overrides.onRequest ?? this.config.onRequest,
      onResponse: overrides.onResponse ?? this.config.onResponse,
      onError: overrides.onError ?? this.config.onError,
    })
  }

  /** 统一请求入口：永不抛异常，错误统一以 ApiResult 返回（code 非 0） */
  async request<T = unknown>(input: string | RequestOptions): Promise<ApiResult<T>> {
    let opts: RequestOptions =
      typeof input === 'string' ? { url: input } : { ...input }

    if (this.config.onRequest) {
      opts = await this.config.onRequest(opts)
    }

    const method: HttpMethod = opts.method ?? 'GET'
    const url = `${this.config.baseUrl}${opts.url}`
    const headers = { ...this.config.headers, ...(opts.headers ?? {}) }
    const timeout = opts.timeout ?? this.config.timeout

    let body: string | undefined
    let query = ''
    if (opts.data !== undefined) {
      if (method === 'GET') {
        const usp = new URLSearchParams()
        for (const [k, v] of Object.entries(opts.data as Record<string, unknown>)) {
          if (v === undefined || v === null) continue
          usp.append(k, String(v))
        }
        query = usp.toString()
      } else {
        body = typeof opts.data === 'string' ? opts.data : JSON.stringify(opts.data)
      }
    }
    const finalUrl = query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url

    try {
      const raw = await this.config.adapter({ url: finalUrl, method, headers, body, timeout })
      let result: ApiResult<T>
      if (raw.statusCode >= 200 && raw.statusCode < 300) {
        result = ok<T>(raw.data as T)
      } else {
        result = fail<T>(`HTTP ${raw.statusCode}`, raw.statusCode)
      }
      if (this.config.onResponse) {
        result = await this.config.onResponse<T>(result)
      }
      return result
    } catch (err) {
      this.config.onError?.(err, opts)
      const msg = err instanceof Error ? err.message : String(err)
      return fail<T>(msg)
    }
  }

  get<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResult<T>> {
    return this.request<T>({ url, method: 'GET', data })
  }

  post<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResult<T>> {
    return this.request<T>({ url, method: 'POST', data })
  }

  put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResult<T>> {
    return this.request<T>({ url, method: 'PUT', data })
  }

  del<T = unknown>(url: string, data?: Record<string, unknown>): Promise<ApiResult<T>> {
    return this.request<T>({ url, method: 'DELETE', data })
  }
}

/** 开箱即用的默认客户端 */
export const http = new HttpClient()
