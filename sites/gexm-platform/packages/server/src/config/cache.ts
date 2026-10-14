import 'dotenv/config'

interface RedisConfig {
  enabled: boolean
  host: string
  port: number
  password: string
  db: number
  maxRetriesPerRequest: number
  retryDelayOnFailover: number
  enableReadyCheck: boolean
  connectTimeout: number
  commandTimeout: number
}

interface MemoryConfig {
  enabled: boolean
  maxSize: number
  cleanupInterval: number
}

interface CacheTTL {
  categoryList: number
  productList: number
  productDetail: number
  userCart: number
  hotProducts: number
  newProducts: number
  priceRange: number
  recommendedProducts: number
  userSession: number
  systemConfig: number
}

interface CacheWarmup {
  enabled: boolean
  onStartup: boolean
  categories: boolean
  hotProducts: boolean
  hotProductsLimit: number
  newProducts: boolean
  newProductsLimit: number
  homepage: boolean
  scheduledInterval: number
}

interface CacheStats {
  enabled: boolean
  logInterval: number
}

interface CacheInvalidation {
  onProductUpdate: boolean
  onCategoryUpdate: boolean
  onCartUpdate: boolean
}

interface HotDataConfig {
  enabled: boolean
  threshold: number
  checkInterval: number
  promotionTTL: number
  demotionTTL: number
}

interface CacheConsistency {
  writeStrategy: 'write-through' | 'write-behind' | 'write-around'
  syncDelay: number
  maxRetries: number
}

interface CacheProtection {
  nullCacheTTL: number
  ttlJitterRatio: number
  maxMissPerSecond: number
}

interface CacheConfig {
  redis: RedisConfig
  memory: MemoryConfig
  ttl: CacheTTL
  keyPrefix: string
  warmup: CacheWarmup
  stats: CacheStats
  invalidation: CacheInvalidation
  hotData: HotDataConfig
  consistency: CacheConsistency
  protection: CacheProtection
}

const cacheConfig: CacheConfig = {
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    connectTimeout: 5000,
    commandTimeout: 5000,
  },

  memory: {
    enabled: process.env.MEMORY_CACHE_ENABLED !== 'false',
    maxSize: parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000', 10),
    cleanupInterval: parseInt(process.env.MEMORY_CACHE_CLEANUP_INTERVAL || '60000', 10),
  },

  ttl: {
    categoryList: parseInt(process.env.CACHE_TTL_CATEGORY_LIST || '3600', 10),
    productList: parseInt(process.env.CACHE_TTL_PRODUCT_LIST || '300', 10),
    productDetail: parseInt(process.env.CACHE_TTL_PRODUCT_DETAIL || '600', 10),
    userCart: parseInt(process.env.CACHE_TTL_USER_CART || '1800', 10),
    hotProducts: parseInt(process.env.CACHE_TTL_HOT_PRODUCTS || '900', 10),
    newProducts: parseInt(process.env.CACHE_TTL_NEW_PRODUCTS || '900', 10),
    priceRange: parseInt(process.env.CACHE_TTL_PRICE_RANGE || '1800', 10),
    recommendedProducts: parseInt(process.env.CACHE_TTL_RECOMMENDED_PRODUCTS || '600', 10),
    userSession: parseInt(process.env.CACHE_TTL_USER_SESSION || '1800', 10),
    systemConfig: parseInt(process.env.CACHE_TTL_SYSTEM_CONFIG || '86400', 10),
  },

  keyPrefix: process.env.CACHE_KEY_PREFIX || 'gexm:',

  warmup: {
    enabled: process.env.CACHE_WARMUP_ENABLED === 'true',
    onStartup: process.env.CACHE_WARMUP_ON_STARTUP === 'true',
    categories: process.env.CACHE_WARMUP_CATEGORIES === 'true',
    hotProducts: process.env.CACHE_WARMUP_HOT_PRODUCTS === 'true',
    hotProductsLimit: parseInt(process.env.CACHE_WARMUP_HOT_PRODUCTS_LIMIT || '20', 10),
    newProducts: process.env.CACHE_WARMUP_NEW_PRODUCTS === 'true',
    newProductsLimit: parseInt(process.env.CACHE_WARMUP_NEW_PRODUCTS_LIMIT || '20', 10),
    homepage: process.env.CACHE_WARMUP_HOMEPAGE === 'true',
    scheduledInterval: parseInt(process.env.CACHE_WARMUP_SCHEDULED_INTERVAL || '3600000', 10),
  },

  stats: {
    enabled: process.env.CACHE_STATS_ENABLED !== 'false',
    logInterval: parseInt(process.env.CACHE_STATS_LOG_INTERVAL || '300000', 10),
  },

  invalidation: {
    onProductUpdate: true,
    onCategoryUpdate: true,
    onCartUpdate: true,
  },

  hotData: {
    enabled: process.env.HOT_DATA_ENABLED === 'true',
    threshold: parseInt(process.env.HOT_DATA_THRESHOLD || '100', 10),
    checkInterval: parseInt(process.env.HOT_DATA_CHECK_INTERVAL || '60000', 10),
    promotionTTL: parseInt(process.env.HOT_DATA_PROMOTION_TTL || '3600', 10),
    demotionTTL: parseInt(process.env.HOT_DATA_DEMOTION_TTL || '600', 10),
  },

  consistency: {
    writeStrategy:
      (process.env.CACHE_WRITE_STRATEGY as 'write-through' | 'write-behind' | 'write-around') ||
      'write-through',
    syncDelay: parseInt(process.env.CACHE_SYNC_DELAY || '1000', 10),
    maxRetries: parseInt(process.env.CACHE_MAX_RETRIES || '3', 10),
  },

  protection: {
    nullCacheTTL: parseInt(process.env.CACHE_NULL_TTL || '60', 10),
    ttlJitterRatio: parseInt(process.env.CACHE_TTL_JITTER || '10', 10) / 100,
    maxMissPerSecond: parseInt(process.env.CACHE_MAX_MISS_PER_SEC || '100', 10),
  },
}

function getTTL(type: string): number {
  return cacheConfig.ttl[type as keyof CacheTTL] || 300
}

function buildKey(
  type: string,
  identifier?: string,
  params: string | Record<string, unknown> = {}
): string {
  let key = `${cacheConfig.keyPrefix}${type}`

  if (identifier) {
    key += `:${identifier}`
  }

  if (typeof params === 'string') {
    key += `:${params}`
  } else {
    const paramKeys = Object.keys(params as Record<string, unknown>).sort()
    if (paramKeys.length > 0) {
      const paramStr = paramKeys
        .map((k) => `${k}:${(params as Record<string, unknown>)[k]}`)
        .join(':')
      key += `:${paramStr}`
    }
  }

  return key
}

export { cacheConfig, getTTL, buildKey }
export default { cacheConfig, getTTL, buildKey }
