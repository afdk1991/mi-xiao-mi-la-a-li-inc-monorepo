/**
 * 缓存服务模块
 * 支持 Redis 主缓存和内存缓存降级模式
 * 符合互联网缓存最佳实践，包含缓存穿透、击穿、雪崩防护
 */

import { cacheConfig, getTTL, buildKey } from '../config/cache'
import logger from '../utils/logger'
import { getDb } from '../models/index.js'
import categoryModel from '../models/categoryModel.js'

// Redis 客户端类型
interface RedisClient {
  get(key: string): Promise<string | null>
  setEx(key: string, ttl: number, value: string): Promise<void>
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>
  del(key: string | string[]): Promise<number>
  keys(pattern: string): Promise<string[]>
  scan(
    cursor: number,
    options?: { MATCH?: string; COUNT?: number }
  ): Promise<{ cursor: number; keys: string[] }>
  exists(key: string): Promise<number>
  incr(key: string): Promise<number>
  incrBy(key: string, increment: number): Promise<number>
  quit(): Promise<void>
  ping(): Promise<string>
  eval(script: string, options: { keys: string[]; args: string[] }): Promise<unknown>
}

// 缓存统计接口
interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  memoryHits: number
  redisHits: number
}

// 缓存服务接口
interface CacheService {
  init(isProduction?: boolean): Promise<void>
  shutdown(): Promise<void>
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, ttl?: number | null): Promise<boolean>
  del(key: string): Promise<boolean>
  delByPattern(pattern: string): Promise<number>
  incr(key: string, increment?: number): Promise<number>
  decr(key: string, decrement?: number): Promise<number>
  exists(key: string): Promise<boolean>
  getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number | null): Promise<T | null>
  invalidateProduct(productId: string): Promise<void>
  invalidateCategory(categoryId?: string | null): Promise<void>
  invalidateCart(userId: string): Promise<void>
  warmup(options?: {
    force?: boolean
    categories?: boolean
    hotProducts?: boolean
    newProducts?: boolean
    homepage?: boolean
  }): Promise<void>
  startScheduledWarmup(): void
  stopScheduledWarmup(): void
  getStats(): Record<string, unknown>
  resetStats(): void
  acquireLock(key: string, ttl?: number, enableRenew?: boolean): Promise<boolean>
  releaseLock(key: string, force?: boolean): Promise<void>
  isLockOwner(key: string): boolean
  getLockInfo(key: string): LockInfo | null
  isAvailable(): boolean
  incrWithExpire(key: string, windowMs: number): Promise<number>
  buildKey: typeof buildKey
  getTTL: typeof getTTL
}

// Redis 客户端（延迟加载）
let redisClient: RedisClient | null = null
let redisConnected = false

// 内存缓存存储
const memoryCache = new Map<string, unknown>()
// 内存缓存过期时间记录
const memoryCacheExpiry = new Map<string, number>()
// 内存缓存访问时间戳（用于 LRU 淘汰）
const memoryCacheAccess = new Map<string, number>()

// 缓存统计
const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  memoryHits: 0,
  redisHits: 0,
}

// 清理定时器
let cleanupTimer: NodeJS.Timeout | null = null
let statsLogTimer: NodeJS.Timeout | null = null

// 空值标记（防止缓存穿透）
const NULL_MARKER = '__NULL__'

// 锁机制（防止缓存击穿）
interface LockInfo {
  expiry: number
  value: string
  reentrantCount: number
  renewTimer?: NodeJS.Timeout
}
const lockMap = new Map<string, LockInfo>()
// 锁清理定时器
let lockCleanupTimer: NodeJS.Timeout | null = null
// 当前进程锁标识（用于重入判断）
const processLockId = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`

// 热点数据访问计数（用于自动识别热点）
const hotDataCounters = new Map<string, number>()
// 热点数据标记（已提升为热点的数据）
const hotDataMarked = new Map<string, number>()
// 热点数据检查定时器
let hotDataTimer: NodeJS.Timeout | null = null

// 写后异步同步队列（write-behind策略）
const writeBehindQueue: Array<{ key: string; value: unknown; ttl: number }> = []
// 写后同步定时器
let writeBehindTimer: NodeJS.Timeout | null = null

/**
 * 初始化 Redis 客户端
 * @returns 是否成功连接
 */
async function initRedis(): Promise<boolean> {
  if (!cacheConfig.redis.enabled) {
    logger.info('Redis 缓存未启用，使用内存缓存模式')
    return false
  }

  try {
    let redis: typeof import('redis')
    try {
      redis = require('redis')
    } catch {
      logger.warn('Redis 模块未安装，使用内存缓存降级模式')
      return false
    }

    const client = redis.createClient({
      socket: {
        host: cacheConfig.redis.host,
        port: cacheConfig.redis.port,
        connectTimeout: cacheConfig.redis.connectTimeout,
        reconnectStrategy: (retries: number) => {
          if (retries > cacheConfig.redis.maxRetriesPerRequest) {
            logger.error('Redis 连接重试次数超限，切换到内存缓存模式')
            return new Error('Redis 连接失败')
          }
          return Math.min(retries * cacheConfig.redis.retryDelayOnFailover, 3000)
        },
      },
      password: cacheConfig.redis.password,
      database: cacheConfig.redis.db,
    } as Parameters<typeof redis.createClient>[0])

    client.on('error', (err: Error) => {
      logger.error('Redis 客户端错误:', err.message)
      redisConnected = false
      stats.errors++
    })

    client.on('connect', () => {
      logger.info('Redis 连接建立')
    })

    client.on('ready', () => {
      logger.info('Redis 连接就绪')
      redisConnected = true
    })

    client.on('end', () => {
      logger.warn('Redis 连接断开')
      redisConnected = false
    })

    await client.connect()
    redisClient = client as unknown as RedisClient
    redisConnected = true
    return true
  } catch (error) {
    logger.error('Redis 初始化失败:', (error as Error).message)
    redisConnected = false
    return false
  }
}

/**
 * Redis 健康检查
 * 生产环境下，如果配置了 Redis 但无法连接，则抛出错误（fail-fast）
 * @param isProduction - 是否生产环境
 */
async function redisHealthCheck(isProduction: boolean): Promise<void> {
  if (!cacheConfig.redis.enabled) {
    logger.info('Redis 未启用，跳过健康检查')
    return
  }

  const startTime = Date.now()
  let success = false

  try {
    if (redisClient) {
      await redisClient.ping()
      success = true
    } else {
      success = await initRedis()
    }
  } catch (error) {
    logger.error('Redis 健康检查失败:', (error as Error).message)
  }

  const latency = Date.now() - startTime

  if (!success) {
    const errorMsg =
      `Redis 健康检查失败！延迟: ${latency}ms\n` +
      `配置: host=${cacheConfig.redis.host}, port=${cacheConfig.redis.port}\n` +
      `请检查：1) Redis 服务是否启动 2) 网络是否可达 3) 密码是否正确 4) 防火墙是否开放端口`

    if (isProduction) {
      logger.error('【生产环境】Redis 不可用，服务启动失败:', errorMsg)
      throw new Error(errorMsg)
    } else {
      logger.warn('【开发环境】Redis 不可用，降级到内存缓存:', errorMsg)
    }
  } else {
    logger.info(`Redis 健康检查通过，延迟: ${latency}ms`)
  }
}

/**
 * 初始化内存缓存清理
 */
function initMemoryCacheCleanup(): void {
  if (!cacheConfig.memory.enabled) {
    return
  }

  // 定期清理过期缓存
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    let cleaned = 0

    for (const [key, expiry] of memoryCacheExpiry.entries()) {
      if (now > expiry) {
        memoryCache.delete(key)
        memoryCacheExpiry.delete(key)
        memoryCacheAccess.delete(key)
        cleaned++
      }
    }

    // LRU 淘汰：如果超过最大容量，淘汰最少访问的条目
    if (memoryCache.size > cacheConfig.memory.maxSize) {
      const entries = Array.from(memoryCacheAccess.entries())
      entries.sort((a, b) => a[1] - b[1])

      const toRemove = memoryCache.size - cacheConfig.memory.maxSize
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        const key = entries[i][0]
        memoryCache.delete(key)
        memoryCacheExpiry.delete(key)
        memoryCacheAccess.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug(`内存缓存清理: 清理 ${cleaned} 条过期条目`)
    }
  }, cacheConfig.memory.cleanupInterval)

  // 定期清理过期内存锁（防止死锁）
  lockCleanupTimer = setInterval(() => {
    const now = Date.now()
    let cleaned = 0
    for (const [key, lockInfo] of lockMap.entries()) {
      if (typeof lockInfo.expiry === 'number' && now > lockInfo.expiry) {
        if (lockInfo.renewTimer) {
          clearInterval(lockInfo.renewTimer)
        }
        lockMap.delete(key)
        cleaned++
      }
    }
    if (cleaned > 0) {
      logger.debug(`锁清理: 清理 ${cleaned} 条过期锁`)
    }
  }, 60000)

  // 定期输出统计日志
  if (cacheConfig.stats.enabled) {
    statsLogTimer = setInterval(() => {
      const hitRate =
        stats.hits + stats.misses > 0
          ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
          : '0.00'

      logger.info(
        `缓存统计: 命中率 ${hitRate}%, 命中 ${stats.hits}, 未命中 ${stats.misses}, 设置 ${stats.sets}, 删除 ${stats.deletes}, 错误 ${stats.errors}`
      )
    }, cacheConfig.stats.logInterval)
  }
}

/**
 * 初始化热点数据自动检测
 */
function initHotDataDetection(): void {
  if (!cacheConfig.hotData.enabled) {
    return
  }

  hotDataTimer = setInterval(() => {
    const now = Date.now()
    let promoted = 0
    let demoted = 0

    for (const [key, count] of hotDataCounters.entries()) {
      if (count >= cacheConfig.hotData.threshold) {
        const lastMarked = hotDataMarked.get(key)
        if (!lastMarked || now - lastMarked > cacheConfig.hotData.checkInterval) {
          hotDataMarked.set(key, now)
          promoted++
          logger.debug(`热点数据提升: ${key}, 访问次数: ${count}`)
          if (redisConnected && redisClient) {
            const value = memoryCache.get(key)
            if (value !== undefined && value !== NULL_MARKER) {
              const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value)
              redisClient.setEx(key, cacheConfig.hotData.promotionTTL, serialized).catch(() => {})
            }
          }
        }
      } else {
        const lastMarked = hotDataMarked.get(key)
        if (lastMarked && now - lastMarked > cacheConfig.hotData.demotionTTL * 1000) {
          hotDataMarked.delete(key)
          demoted++
        }
      }
    }

    if (promoted > 0 || demoted > 0) {
      logger.info(
        `热点数据检测: 提升 ${promoted} 条, 降级 ${demoted} 条, 当前热点 ${hotDataMarked.size} 条`
      )
    }

    hotDataCounters.clear()
  }, cacheConfig.hotData.checkInterval)
}

/**
 * 初始化写后异步同步（write-behind策略）
 */
function initWriteBehindSync(): void {
  if (cacheConfig.consistency.writeStrategy !== 'write-behind') {
    return
  }

  writeBehindTimer = setInterval(async () => {
    if (writeBehindQueue.length === 0) {
      return
    }

    const batch = [...writeBehindQueue]
    writeBehindQueue.length = 0

    for (const item of batch) {
      if (redisConnected && redisClient) {
        try {
          const serialized =
            typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)
          await redisClient.setEx(item.key, item.ttl, serialized)
        } catch (error) {
          logger.error(`写后同步失败 [${item.key}]:`, (error as Error).message)
          writeBehindQueue.push(item)
        }
      }
    }
  }, cacheConfig.consistency.syncDelay)
}

/**
 * 获取缓存锁（防止缓存击穿）
 * 优先使用 Redis SET NX PX 实现分布式锁，多实例部署可正确防止缓存击穿；
 * Redis 不可用时回退到进程内 Map 锁（仅适用于单实例场景）。
 * 支持锁重入和自动续约机制。
 * @param key - 缓存键
 * @param ttl - 锁过期时间（秒），默认 30
 * @param enableRenew - 是否启用锁续约，默认 true
 * @returns 是否获得锁
 */
async function acquireLock(
  key: string,
  ttl: number = 30,
  enableRenew: boolean = true
): Promise<boolean> {
  const lockKey = `lock:${key}`
  const lockValue = `${processLockId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  if (redisConnected && redisClient) {
    try {
      const existingValue = await redisClient.get(lockKey)

      if (existingValue && existingValue.startsWith(processLockId)) {
        const luaScript = `
          if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('pexpire', KEYS[1], ARGV[2])
          else
            return 0
          end
        `
        const result = await redisClient.eval(luaScript, {
          keys: [lockKey],
          args: [existingValue, String(ttl * 1000)],
        })

        if (result) {
          const lockInfo = lockMap.get(lockKey)
          if (lockInfo) {
            lockInfo.reentrantCount++
            lockInfo.expiry = Date.now() + ttl * 1000
          }

          return true
        }
      }

      const result = await redisClient.set(lockKey, lockValue, 'PX', ttl * 1000, 'NX')
      if (result === 'OK') {
        startLockRenewal(lockKey, ttl, lockValue)

        lockMap.set(lockKey, {
          expiry: Date.now() + ttl * 1000,
          value: lockValue,
          reentrantCount: 1,
        })

        return true
      }

      return false
    } catch (error) {
      logger.warn(`Redis 分布式锁获取失败 [${key}]，回退内存锁:`, (error as Error).message)
    }
  }

  const existing = lockMap.get(lockKey)
  if (existing && existing.value.startsWith(processLockId)) {
    existing.reentrantCount++
    existing.expiry = Date.now() + ttl * 1000
    return true
  }

  if (existing && existing.expiry > Date.now()) {
    return false
  }

  lockMap.set(lockKey, {
    expiry: Date.now() + ttl * 1000,
    value: lockValue,
    reentrantCount: 1,
  })

  return true
}

/**
 * 启动锁续约定时器
 * @param lockKey - 锁键
 * @param ttl - 锁过期时间（秒）
 * @param expectedValue - 预期的锁值（用于验证锁归属）
 */
function startLockRenewal(lockKey: string, ttl: number, expectedValue: string): void {
  if (!redisConnected || !redisClient) {
    return
  }

  const renewInterval = Math.max((ttl * 1000) / 3, 1000)

  const renewTimer = setInterval(async () => {
    try {
      const currentValue = await redisClient!.get(lockKey)

      if (currentValue !== expectedValue) {
        clearInterval(renewTimer)
        return
      }

      await redisClient!.set(lockKey, expectedValue, 'PX', ttl * 1000)

      const lockInfo = lockMap.get(lockKey)
      if (lockInfo) {
        lockInfo.expiry = Date.now() + ttl * 1000
      }
    } catch (error) {
      logger.warn(`锁续约失败 [${lockKey}]:`, (error as Error).message)
      clearInterval(renewTimer)
    }
  }, renewInterval)

  const lockInfo = lockMap.get(lockKey)
  if (lockInfo) {
    lockInfo.renewTimer = renewTimer
  }
}

/**
 * 释放缓存锁
 * 支持重入锁的正确释放（需要释放与获取次数相同）
 * @param key - 缓存键
 * @param force - 是否强制释放（忽略重入计数），默认 false
 */
async function releaseLock(key: string, force: boolean = false): Promise<void> {
  const lockKey = `lock:${key}`

  const lockInfo = lockMap.get(lockKey)
  if (lockInfo && !force) {
    lockInfo.reentrantCount--

    if (lockInfo.reentrantCount > 0) {
      return
    }
  }

  if (lockInfo?.renewTimer) {
    clearInterval(lockInfo.renewTimer)
  }

  lockMap.delete(lockKey)

  if (redisConnected && redisClient) {
    try {
      const luaScript = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
          return redis.call('del', KEYS[1])
        else
          return 0
        end
      `

      await redisClient.eval(luaScript, {
        keys: [lockKey],
        args: [lockInfo?.value || ''],
      })
    } catch (error) {
      logger.warn(`Redis 分布式锁释放失败 [${key}]，已清理内存锁:`, (error as Error).message)
    }
  }
}

/**
 * 检查是否持有指定锁
 * @param key - 缓存键
 * @returns 是否持有锁
 */
function isLockOwner(key: string): boolean {
  const lockKey = `lock:${key}`
  const lockInfo = lockMap.get(lockKey)

  if (!lockInfo || lockInfo.expiry <= Date.now()) {
    return false
  }

  // lockMap 是进程内的，只有当前进程获取过的锁才会在 lockMap 中
  // 因此只要存在且未过期，即表明当前进程持有该锁
  return true
}

/**
 * 获取锁信息
 * @param key - 缓存键
 * @returns 锁信息或 null
 */
function getLockInfo(key: string): LockInfo | null {
  const lockKey = `lock:${key}`
  const lockInfo = lockMap.get(lockKey)

  if (!lockInfo || lockInfo.expiry <= Date.now()) {
    return null
  }

  return lockInfo
}

/**
 * 检查 Redis 是否可用
 * @returns Redis 是否已连接
 */
function isAvailable(): boolean {
  return redisConnected
}

/**
 * 原子性自增并设置过期时间（用于分布式限流）
 * 使用 Lua 脚本保证 INCR + PEXPIRE 的原子性：
 * - 第一次请求（count == 1）时设置 PEXPIRE = windowMs
 * - 后续请求仅 INCR，不重置过期时间
 * @param key - 缓存键
 * @param windowMs - 过期时间（毫秒）
 * @returns 自增后的计数值
 */
async function incrWithExpire(key: string, windowMs: number): Promise<number> {
  if (!redisConnected || !redisClient) {
    throw new Error('Redis is not available')
  }
  try {
    const luaScript = `
      local count = redis.call('incr', KEYS[1])
      if count == 1 then
        redis.call('pexpire', KEYS[1], ARGV[1])
      end
      return count
    `
    const result = await redisClient.eval(luaScript, {
      keys: [key],
      args: [String(windowMs)],
    })
    return typeof result === 'number' ? result : Number(result)
  } catch (error) {
    logger.error(`incrWithExpire 失败 [${key}]:`, (error as Error).message)
    stats.errors++
    throw error
  }
}

/**
 * 获取缓存
 * 多级缓存策略：内存缓存优先，减少 Redis 网络开销
 * @param key - 缓存键
 * @returns 缓存值，不存在返回 null
 */
async function get(key: string): Promise<unknown> {
  try {
    // 热点数据计数（用于自动识别热点）
    if (cacheConfig.hotData.enabled) {
      hotDataCounters.set(key, (hotDataCounters.get(key) || 0) + 1)
    }

    // 优先从内存缓存获取（多级缓存策略：L1 缓存）
    if (cacheConfig.memory.enabled) {
      const expiry = memoryCacheExpiry.get(key)
      if (expiry && Date.now() < expiry) {
        const value = memoryCache.get(key)
        if (value !== undefined) {
          stats.hits++
          stats.memoryHits++
          memoryCacheAccess.set(key, Date.now())
          if (value === NULL_MARKER) {
            return null
          }
          return value
        }
      }
    }

    // 内存缓存未命中，从 Redis 获取（L2 缓存）
    if (redisConnected && redisClient) {
      const value = await redisClient.get(key)
      if (value !== null) {
        stats.hits++
        stats.redisHits++
        if (value === NULL_MARKER) {
          if (cacheConfig.memory.enabled) {
            memoryCache.set(key, NULL_MARKER)
            memoryCacheExpiry.set(key, Date.now() + cacheConfig.protection.nullCacheTTL * 1000)
          }
          return null
        }
        try {
          const parsed = JSON.parse(value)
          if (cacheConfig.memory.enabled) {
            const ttl = getTTLFromKey(key)
            memoryCache.set(key, parsed)
            memoryCacheExpiry.set(key, Date.now() + ttl * 1000)
            memoryCacheAccess.set(key, Date.now())
          }
          return parsed
        } catch {
          return value
        }
      }
    }

    stats.misses++
    return null
  } catch (error) {
    logger.error(`缓存获取失败 [${key}]:`, (error as Error).message)
    stats.errors++
    return null
  }
}

function getTTLFromKey(key: string): number {
  if (key.includes('category')) {
    return getTTL('categoryList')
  }
  if (key.includes('product') && key.includes('list')) {
    return getTTL('productList')
  }
  if (key.includes('product') && key.includes('detail')) {
    return getTTL('productDetail')
  }
  if (key.includes('cart')) {
    return getTTL('userCart')
  }
  if (key.includes('hot')) {
    return getTTL('hotProducts')
  }
  if (key.includes('new')) {
    return getTTL('newProducts')
  }
  return getTTL('default')
}

/**
 * 设置缓存
 * 根据配置的写入策略执行不同的缓存更新方式
 * @param key - 缓存键
 * @param value - 缓存值
 * @param ttl - 过期时间（秒），默认使用配置
 * @returns 是否成功
 */
async function set(key: string, value: unknown, ttl: number | null = null): Promise<boolean> {
  try {
    stats.sets++

    const cacheValue = value === null ? NULL_MARKER : value
    const effectiveTTL = ttl || getTTL('default')
    // 空值使用独立的短 TTL（防止缓存穿透），正常值添加随机抖动（防止缓存雪崩）
    let actualTTL: number
    if (value === null) {
      actualTTL = Math.min(effectiveTTL, cacheConfig.protection.nullCacheTTL)
    } else {
      const jitter = cacheConfig.protection.ttlJitterRatio
      const jitterAmount = effectiveTTL * jitter * (Math.random() * 2 - 1)
      actualTTL = Math.max(1, Math.round(effectiveTTL + jitterAmount))
    }

    const strategy = cacheConfig.consistency.writeStrategy

    if (strategy === 'write-behind') {
      writeBehindQueue.push({ key, value: cacheValue, ttl: actualTTL })
      if (cacheConfig.memory.enabled) {
        memoryCache.set(key, cacheValue)
        memoryCacheExpiry.set(key, Date.now() + actualTTL * 1000)
        memoryCacheAccess.set(key, Date.now())
      }
      return true
    }

    if (strategy === 'write-around') {
      if (cacheConfig.memory.enabled) {
        memoryCache.set(key, cacheValue)
        memoryCacheExpiry.set(key, Date.now() + actualTTL * 1000)
        memoryCacheAccess.set(key, Date.now())
      }
      return true
    }

    if (redisConnected && redisClient) {
      const serialized =
        typeof cacheValue === 'object' ? JSON.stringify(cacheValue) : String(cacheValue)
      await redisClient.setEx(key, actualTTL, serialized)
    }

    if (cacheConfig.memory.enabled) {
      memoryCache.set(key, cacheValue)
      memoryCacheExpiry.set(key, Date.now() + actualTTL * 1000)
      memoryCacheAccess.set(key, Date.now())
    }

    return true
  } catch (error) {
    logger.error(`缓存设置失败 [${key}]:`, (error as Error).message)
    stats.errors++
    return false
  }
}

/**
 * 删除缓存
 * @param key - 缓存键
 * @returns 是否成功
 */
async function del(key: string): Promise<boolean> {
  try {
    stats.deletes++

    // 删除 Redis 缓存
    if (redisConnected && redisClient) {
      await redisClient.del(key)
    }

    // 删除内存缓存
    if (cacheConfig.memory.enabled) {
      memoryCache.delete(key)
      memoryCacheExpiry.delete(key)
      memoryCacheAccess.delete(key)
    }

    return true
  } catch (error) {
    logger.error(`缓存删除失败 [${key}]:`, (error as Error).message)
    stats.errors++
    return false
  }
}

/**
 * 批量删除缓存（按模式）
 * 使用 SCAN 命令迭代式扫描，避免 KEYS 阻塞 Redis 主线程
 * @param pattern - 缓存键模式（支持 * 通配符）
 * @returns 删除的数量
 */
async function delByPattern(pattern: string): Promise<number> {
  try {
    let deleted = 0
    const startTime = Date.now()
    const timeout = 5000

    if (redisConnected && redisClient) {
      let cursor = 0
      let totalScanned = 0
      const batchSize = 100

      do {
        if (Date.now() - startTime > timeout) {
          logger.warn(`批量缓存删除超时 [${pattern}], 已删除 ${deleted} 条`)
          break
        }

        const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: batchSize })
        cursor = result.cursor
        const keys = result.keys

        totalScanned += keys.length

        if (keys.length > 0) {
          await redisClient.del(keys)
          deleted += keys.length
        }

        if (totalScanned > 10000) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      } while (cursor !== 0)
    }

    if (cacheConfig.memory.enabled) {
      // 先转义所有正则元字符（. + ^ $ { } ( ) | \），再将通配符 * ? 转换为正则
      const escaped = pattern.replace(/[.+^${}()|\\]/g, '\\$&')
      const regexPattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.')
      const regex = new RegExp(`^${regexPattern}$`)

      // 先收集要删除的 key，再统一删除，避免在迭代 Map 时修改导致的行为不确定
      const keysToDelete: string[] = []
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key)
        }
      }
      for (const key of keysToDelete) {
        memoryCache.delete(key)
        memoryCacheExpiry.delete(key)
        memoryCacheAccess.delete(key)
        deleted++
      }
    }

    stats.deletes += deleted
    return deleted
  } catch (error) {
    logger.error(`批量缓存删除失败 [${pattern}]:`, (error as Error).message)
    stats.errors++
    return 0
  }
}

/**
 * 自增计数器
 * @param key - 缓存键
 * @param increment - 增量，默认 1
 * @returns 增后的值
 */
async function incr(key: string, increment = 1): Promise<number> {
  try {
    // Redis 自增
    if (redisConnected && redisClient) {
      if (increment === 1) {
        return await redisClient.incr(key)
      }
      return await redisClient.incrBy(key, increment)
    }

    // 内存缓存自增
    if (cacheConfig.memory.enabled) {
      const current = (memoryCache.get(key) as number) || 0
      const newValue = current + increment
      memoryCache.set(key, newValue)
      return newValue
    }

    return 0
  } catch (error) {
    logger.error(`缓存自增失败 [${key}]:`, (error as Error).message)
    stats.errors++
    return 0
  }
}

/**
 * 自减计数器
 * @param key - 缓存键
 * @param decrement - 减量，默认 1
 * @returns 减后的值
 */
async function decr(key: string, decrement = 1): Promise<number> {
  return incr(key, -decrement)
}

/**
 * 检查缓存是否存在
 * @param key - 缓存键
 * @returns 是否存在
 */
async function exists(key: string): Promise<boolean> {
  try {
    // Redis 检查
    if (redisConnected && redisClient) {
      return (await redisClient.exists(key)) > 0
    }

    // 内存缓存检查
    if (cacheConfig.memory.enabled) {
      const expiry = memoryCacheExpiry.get(key)
      if (expiry && Date.now() < expiry) {
        return memoryCache.has(key)
      }
    }

    return false
  } catch (error) {
    logger.error(`缓存检查失败 [${key}]:`, (error as Error).message)
    return false
  }
}

/**
 * 获取或设置缓存（防止缓存击穿的封装方法）
 * 锁失败时使用有限次循环 + sleep，避免无限制递归导致栈溢出或雪崩放大。
 * @param key - 缓存键
 * @param fetchFn - 数据获取函数
 * @param ttl - 过期时间（秒）
 * @returns 缓存值或获取的数据
 */
async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number | null
): Promise<T | null> {
  const maxRetries = 3
  const retryDelay = 100

  for (let i = 0; i < maxRetries; i++) {
    // 先尝试获取缓存
    const cached = await get(key)
    if (cached !== null) {
      return cached as T
    }
    // 空值标记也可能存在于缓存中，使用 exists 判断
    if (await exists(key)) {
      return cached as T | null
    }

    // 获取锁防止缓存击穿
    const lockAcquired = await acquireLock(key)
    if (lockAcquired) {
      try {
        // 双重检查：等待锁期间可能已被其他请求缓存
        const cachedAfterLock = await get(key)
        if (cachedAfterLock !== null) {
          return cachedAfterLock as T
        }
        if (await exists(key)) {
          return cachedAfterLock as T | null
        }

        // 获取数据
        const value = await fetchFn()

        // 设置缓存（包括空值，防止缓存穿透）
        await set(key, value, ttl ?? null)

        return value
      } finally {
        await releaseLock(key)
      }
    }

    // 未获取到锁，等待后重试
    await new Promise((resolve) => setTimeout(resolve, retryDelay))
  }

  // 超过重试次数，直接执行 fetchFn（接受可能的缓存击穿风险，避免请求堆积）
  const value = await fetchFn()
  if (value !== null && value !== undefined) {
    await set(key, value, ttl ?? null)
  }
  return value
}

/**
 * 缓存失效 - 商品相关
 * @param productId - 商品ID
 */
async function invalidateProduct(productId: string): Promise<void> {
  const patterns = [
    buildKey('product', 'detail', { id: productId }),
    buildKey('product', 'list', '*'),
    buildKey('product', 'hot', '*'),
    buildKey('product', 'new', '*'),
    buildKey('product', 'recommended', { id: productId }),
  ]

  for (const pattern of patterns) {
    await delByPattern(pattern)
  }

  logger.debug(`商品缓存失效: ${productId}`)
}

/**
 * 缓存失效 - 分类相关
 * @param categoryId - 分类ID（可选，不传则失效所有分类缓存）
 */
async function invalidateCategory(categoryId: string | null = null): Promise<void> {
  if (categoryId) {
    await del(buildKey('category', 'list', { id: categoryId }))
    await delByPattern(buildKey('product', 'list', { categoryId }))
  } else {
    await delByPattern(buildKey('category', '*'))
    await delByPattern(buildKey('product', 'list', '*'))
  }

  logger.debug(`分类缓存失效: ${categoryId || '全部'}`)
}

/**
 * 缓存失效 - 购物车相关
 * @param userId - 用户ID
 */
async function invalidateCart(userId: string): Promise<void> {
  await del(buildKey('cart', 'user', { id: userId }))
  logger.debug(`购物车缓存失效: ${userId}`)
}

/**
 * 缓存预热
 * @param options - 预热选项
 */
let warmupTimer: NodeJS.Timeout | null = null

async function warmup(
  options: {
    force?: boolean
    categories?: boolean
    hotProducts?: boolean
    newProducts?: boolean
    homepage?: boolean
  } = {}
): Promise<void> {
  if (!cacheConfig.warmup.enabled && !options.force) {
    return
  }

  logger.info('开始缓存预热...')

  try {
    const db = getDb()

    // 预热分类列表
    if (cacheConfig.warmup.categories || options.categories) {
      const categories = categoryModel.findAll()
      await set(buildKey('category', 'list'), categories, getTTL('categoryList'))
      logger.info(`预热分类列表: ${categories.length} 条`)
    }

    // 预热热门商品
    if (cacheConfig.warmup.hotProducts || options.hotProducts) {
      const limit = cacheConfig.warmup.hotProductsLimit || 20
      const hotProducts = db
        .prepare(
          `
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.status = 'on_sale' AND p.stock > 0
          ORDER BY p.sales DESC, p.created_at DESC
          LIMIT ?
        `
        )
        .all(limit)

      await set(buildKey('product', 'hot'), hotProducts, getTTL('hotProducts'))
      logger.info(`预热热门商品: ${hotProducts.length} 条`)
    }

    // 预热新品
    if (cacheConfig.warmup.newProducts || options.newProducts) {
      const limit = cacheConfig.warmup.newProductsLimit || 20
      const newProducts = db
        .prepare(
          `
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.status = 'on_sale' AND p.stock > 0
          ORDER BY p.created_at DESC
          LIMIT ?
        `
        )
        .all(limit)

      await set(buildKey('product', 'new'), newProducts, getTTL('newProducts'))
      logger.info(`预热新品列表: ${newProducts.length} 条`)
    }

    // 预热首页数据（聚合分类 + 热门商品 + 新品）
    if (cacheConfig.warmup.homepage || options.homepage) {
      const categories = categoryModel.findAll()

      const hotLimit = cacheConfig.warmup.hotProductsLimit || 20
      const hotProducts = db
        .prepare(
          `SELECT * FROM products WHERE status = 'on_sale' AND stock > 0 ORDER BY sales DESC LIMIT ?`
        )
        .all(hotLimit)

      const newLimit = cacheConfig.warmup.newProductsLimit || 20
      const newProducts = db
        .prepare(
          `SELECT * FROM products WHERE status = 'on_sale' AND stock > 0 ORDER BY created_at DESC LIMIT ?`
        )
        .all(newLimit)

      const homepageData = {
        categories,
        hotProducts,
        newProducts,
        warmedAt: new Date().toISOString(),
      }

      await set(buildKey('homepage'), homepageData, getTTL('default'))
      logger.info('预热首页数据完成')
    }

    logger.info('缓存预热完成')
  } catch (error) {
    logger.error('缓存预热失败:', (error as Error).message)
  }
}

/**
 * 启动定时缓存预热
 */
function startScheduledWarmup(): void {
  if (warmupTimer) {
    clearInterval(warmupTimer)
  }

  const interval = cacheConfig.warmup.scheduledInterval
  warmupTimer = setInterval(async () => {
    logger.debug('执行定时缓存预热...')
    await warmup({ force: true }).catch(() => {})
  }, interval)

  logger.info(`定时缓存预热已启动，间隔: ${interval}ms`)
}

/**
 * 停止定时缓存预热
 */
function stopScheduledWarmup(): void {
  if (warmupTimer) {
    clearInterval(warmupTimer)
    warmupTimer = null
    logger.info('定时缓存预热已停止')
  }
}

/**
 * 获取缓存统计信息
 * @returns 统计信息
 */
function getStats(): Record<string, unknown> {
  const hitRate =
    stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
      : '0.00'

  const memoryHitRate = stats.hits > 0 ? ((stats.memoryHits / stats.hits) * 100).toFixed(2) : '0.00'

  return {
    ...stats,
    hitRate: `${hitRate}%`,
    memoryHitRate: `${memoryHitRate}%`,
    memoryCacheSize: memoryCache.size,
    hotDataCount: hotDataMarked.size,
    writeBehindQueueSize: writeBehindQueue.length,
    redisConnected,
    writeStrategy: cacheConfig.consistency.writeStrategy,
    timestamp: new Date().toISOString(),
  }
}

/**
 * 重置统计信息
 */
function resetStats(): void {
  stats.hits = 0
  stats.misses = 0
  stats.sets = 0
  stats.deletes = 0
  stats.errors = 0
  stats.memoryHits = 0
  stats.redisHits = 0
}

/**
 * 关闭缓存服务
 */
async function shutdown(): Promise<void> {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  if (statsLogTimer) {
    clearInterval(statsLogTimer)
    statsLogTimer = null
  }
  if (hotDataTimer) {
    clearInterval(hotDataTimer)
    hotDataTimer = null
  }
  if (writeBehindTimer) {
    clearInterval(writeBehindTimer)
    writeBehindTimer = null
  }
  if (lockCleanupTimer) {
    clearInterval(lockCleanupTimer)
    lockCleanupTimer = null
  }
  if (warmupTimer) {
    clearInterval(warmupTimer)
    warmupTimer = null
  }

  for (const lockInfo of lockMap.values()) {
    if (lockInfo.renewTimer) {
      clearInterval(lockInfo.renewTimer)
    }
  }

  if (redisClient) {
    try {
      await redisClient.quit()
      logger.info('Redis 连接已关闭')
    } catch (error) {
      logger.error('Redis 关闭错误:', (error as Error).message)
    }
    redisClient = null
    redisConnected = false
  }

  memoryCache.clear()
  memoryCacheExpiry.clear()
  memoryCacheAccess.clear()
  lockMap.clear()
  hotDataCounters.clear()
  hotDataMarked.clear()
  writeBehindQueue.length = 0

  logger.info('缓存服务已关闭')
}

/**
 * 初始化缓存服务
 * @param isProduction - 是否生产环境（用于Redis健康检查fail-fast）
 */
async function init(isProduction: boolean = false): Promise<void> {
  await initRedis()
  await redisHealthCheck(isProduction)
  initMemoryCacheCleanup()
  initHotDataDetection()
  initWriteBehindSync()

  if (cacheConfig.warmup.onStartup) {
    await warmup()
  }

  logger.info(
    `缓存服务初始化完成，模式: ${redisConnected ? 'Redis' : '内存缓存'}, 写入策略: ${cacheConfig.consistency.writeStrategy}`
  )
}

// 缓存服务对象
const cacheService: CacheService = {
  init,
  shutdown,
  get,
  set,
  del,
  delByPattern,
  incr,
  decr,
  exists,
  getOrSet,
  invalidateProduct,
  invalidateCategory,
  invalidateCart,
  warmup,
  startScheduledWarmup,
  stopScheduledWarmup,
  getStats,
  resetStats,
  acquireLock,
  releaseLock,
  isLockOwner,
  getLockInfo,
  isAvailable,
  incrWithExpire,
  buildKey,
  getTTL,
}

export default cacheService
