// 异步编排放：并发上限、请求节流、带淘汰的结果缓存。
// 存在的理由：地图服务普遍有 QPS / 并发配额限制，而 `Promise.all(全部任务)` 会一次性打出
// N 个请求，在单量较大时直接触发限流（429），结果是「更快失败 + 白烧配额」。

/**
 * 有限并发地执行异步任务，并保持输入顺序。
 *
 * 与 Promise.all 的区别：同时最多只有 limit 个 fn 在跑，其余排队等待，
 * 既保护下游配额，也避免浏览器对同一域名的连接数抢占。
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const n = items.length
  if (n === 0) return []
  const out = new Array<R>(n)
  const size = Math.max(1, Math.min(limit, n))
  let cursor = 0

  async function worker(): Promise<void> {
    for (;;) {
      if (signal?.aborted) return
      const i = cursor++
      if (i >= n) return
      out[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: size }, () => worker()))
  return out
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * 全局请求节流器：保证相邻两次「实际发出」的请求间隔不小于 minGapMs。
 * 多个并发任务共享同一个节流器，通过 promise 链串行排队，避免自增时间戳在并发下发散。
 */
export function createThrottle(minGapMs: number) {
  if (minGapMs <= 0) return () => Promise.resolve()
  let lastStart = 0
  let tail: Promise<unknown> = Promise.resolve()

  return function acquire(): Promise<unknown> {
    const next = tail.then(async () => {
      const wait = Math.max(0, lastStart + minGapMs - Date.now())
      if (wait > 0) await sleep(wait)
      lastStart = Date.now()
    })
    // catch 掉自身异常，避免污染后续排队的 promise 触发 unhandled rejection
    tail = next.catch(() => undefined)
    return next
  }
}

/**
 * 定容 + 定期限的记忆化容器。
 *
 * - max：超过后按插入顺序淘汰最旧的键（Map 天然保序），防止长会话内存无限增长。
 * - ttlMs：条目有效期。路线/路况会变，永久缓存会用到过期数据。
 */
export class TTLCache<V> {
  private store = new Map<string, { v: V; t: number }>()

  constructor(
    private max: number,
    private ttlMs: number,
  ) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (Date.now() - hit.t > this.ttlMs) {
      this.store.delete(key)
      return undefined
    }
    // 重新插入把它移到末尾，维持 LRU 语义
    this.store.delete(key)
    this.store.set(key, hit)
    return hit.v
  }

  set(key: string, v: V): void {
    if (this.store.has(key)) this.store.delete(key)
    this.store.set(key, { v, t: Date.now() })
    while (this.store.size > this.max) {
      const oldest = this.store.keys().next()
      if (oldest.done) break
      this.store.delete(oldest.value)
    }
  }

  get size(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }
}

/** 坐标量化到约 1 米精度，用于拼缓存键（浮点直接拼会因微小抖动永远 miss）。 */
export function q(v: number): string {
  return v.toFixed(5)
}

/**
 * JSONP 请求。
 *
 * 存在的理由：百度地图 Web 服务 API **不返回 CORS 头**，浏览器直接 fetch 会被同源策略拦下。
 * 走服务端代理是最优解，但在「直连模式」下只能靠 JSONP 绕过（script 标签不受同源限制）。
 * 同样也用于部分老旧网关不支持 CORS 的兜底。
 */
export function jsonp<T>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cbName = `__jsonp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const script = document.createElement('script')
    // 超时句柄用 const：cleanup 虽在其之前定义，但只会在注册之后才被调用
    const timer: number = window.setTimeout(() => {
      cleanup()
      reject(new Error('JSONP 请求超时'))
    }, timeoutMs)

    function cleanup() {
      clearTimeout(timer)
      try {
        delete (window as unknown as Record<string, unknown>)[cbName]
      } catch {
        /* ignore */
      }
      script.remove()
    }

    ;(window as unknown as Record<string, unknown>)[cbName] = (data: T) => {
      cleanup()
      resolve(data)
    }
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP 请求失败（可能是 Key 无效或网络不可达）'))
    }

    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cbName}`
    document.body.appendChild(script)
  })
}
