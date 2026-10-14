import cacheService from './cacheService'
import { cacheConfig } from '../config/cache'

describe('Cache Service Integration Tests', () => {
  beforeAll(async () => {
    await cacheService.init(false)
  })

  afterAll(async () => {
    await cacheService.shutdown()
  })

  beforeEach(() => {
    cacheService.resetStats()
  })

  describe('get/set operations', () => {
    it('should set and get a simple value', async () => {
      const key = 'test:simple:key'
      const value = 'test value'

      const setResult = await cacheService.set(key, value, 60)
      expect(setResult).toBe(true)

      const getResult = await cacheService.get(key)
      expect(getResult).toBe(value)
    })

    it('should set and get an object value', async () => {
      const key = 'test:object:key'
      const value = { id: 1, name: 'test', data: [1, 2, 3] }

      const setResult = await cacheService.set(key, value, 60)
      expect(setResult).toBe(true)

      const getResult = await cacheService.get(key)
      expect(getResult).toEqual(value)
    })

    it('should return null for non-existent key', async () => {
      const key = 'test:nonexistent:key'
      const result = await cacheService.get(key)
      expect(result).toBe(null)
    })

    it('should delete a key', async () => {
      const key = 'test:delete:key'
      await cacheService.set(key, 'value', 60)

      const beforeDelete = await cacheService.get(key)
      expect(beforeDelete).toBe('value')

      const deleteResult = await cacheService.del(key)
      expect(deleteResult).toBe(true)

      const afterDelete = await cacheService.get(key)
      expect(afterDelete).toBe(null)
    })

    it('should check key existence', async () => {
      const existingKey = 'test:exists:key'
      const nonExistingKey = 'test:notexists:key'

      await cacheService.set(existingKey, 'value', 60)

      expect(await cacheService.exists(existingKey)).toBe(true)
      expect(await cacheService.exists(nonExistingKey)).toBe(false)
    })
  })

  describe('getOrSet with lock', () => {
    it('should fetch and cache data on first call', async () => {
      const key = 'test:getorset:key'
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched' })

      const result = await cacheService.getOrSet(key, fetchFn, 60)

      expect(result).toEqual({ data: 'fetched' })
      expect(fetchFn).toHaveBeenCalledTimes(1)

      const cachedResult = await cacheService.get(key)
      expect(cachedResult).toEqual({ data: 'fetched' })
    })

    it('should return cached data on subsequent calls', async () => {
      const key = 'test:getorset:cached'
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched' })

      await cacheService.set(key, { data: 'cached' }, 60)

      const result = await cacheService.getOrSet(key, fetchFn, 60)

      expect(result).toEqual({ data: 'cached' })
      expect(fetchFn).not.toHaveBeenCalled()
    })
  })

  describe('increment/decrement', () => {
    it('should increment a counter', async () => {
      const key = 'test:incr:key'
      await cacheService.del(key)

      const result1 = await cacheService.incr(key)
      expect(result1).toBe(1)

      const result2 = await cacheService.incr(key)
      expect(result2).toBe(2)

      const result3 = await cacheService.incr(key, 5)
      expect(result3).toBe(7)
    })

    it('should decrement a counter', async () => {
      const key = 'test:decr:key'
      await cacheService.del(key)

      await cacheService.set(key, 10, 60)

      const result1 = await cacheService.decr(key)
      expect(result1).toBe(9)

      const result2 = await cacheService.decr(key, 5)
      expect(result2).toBe(4)
    })
  })

  describe('cache invalidation', () => {
    it('should invalidate product cache', async () => {
      const productId = 'test-product-123'
      const detailKey = cacheService.buildKey('product', 'detail', { id: productId })
      const listKey = cacheService.buildKey('product', 'list', { categoryId: 'cat1' })

      await cacheService.set(detailKey, { id: productId, name: 'test' }, 60)
      await cacheService.set(listKey, [{ id: productId }], 60)

      expect(await cacheService.exists(detailKey)).toBe(true)
      expect(await cacheService.exists(listKey)).toBe(true)

      await cacheService.invalidateProduct(productId)

      expect(await cacheService.exists(detailKey)).toBe(false)
    })

    it('should invalidate category cache', async () => {
      const categoryId = 'test-category-123'
      const listKey = cacheService.buildKey('category', 'list')
      const productListKey = cacheService.buildKey('product', 'list', { categoryId })

      await cacheService.set(listKey, [{ id: categoryId }], 60)
      await cacheService.set(productListKey, [{ category_id: categoryId }], 60)

      expect(await cacheService.exists(listKey)).toBe(true)

      await cacheService.invalidateCategory(categoryId)

      expect(await cacheService.exists(productListKey)).toBe(false)
    })

    it('should invalidate cart cache', async () => {
      const userId = 'test-user-123'
      const cartKey = cacheService.buildKey('cart', 'user', { id: userId })

      await cacheService.set(cartKey, { items: [] }, 60)
      expect(await cacheService.exists(cartKey)).toBe(true)

      await cacheService.invalidateCart(userId)

      expect(await cacheService.exists(cartKey)).toBe(false)
    })
  })

  describe('delByPattern', () => {
    it('should delete keys by pattern', async () => {
      await cacheService.set('test:pattern:a', 'value1', 60)
      await cacheService.set('test:pattern:b', 'value2', 60)
      await cacheService.set('other:pattern:a', 'value3', 60)

      expect(await cacheService.exists('test:pattern:a')).toBe(true)
      expect(await cacheService.exists('test:pattern:b')).toBe(true)
      expect(await cacheService.exists('other:pattern:a')).toBe(true)

      const deleted = await cacheService.delByPattern('test:pattern:*')

      expect(deleted).toBeGreaterThanOrEqual(2)
      expect(await cacheService.exists('test:pattern:a')).toBe(false)
      expect(await cacheService.exists('test:pattern:b')).toBe(false)
      expect(await cacheService.exists('other:pattern:a')).toBe(true)
    })
  })

  describe('cache statistics', () => {
    it('should track cache hits and misses', async () => {
      const key = 'test:stats:key'

      await cacheService.get(key)
      let stats = cacheService.getStats()
      expect(stats.misses).toBe(1)
      expect(stats.hits).toBe(0)

      await cacheService.set(key, 'value', 60)
      stats = cacheService.getStats()
      expect(stats.sets).toBe(1)

      await cacheService.get(key)
      stats = cacheService.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)

      await cacheService.del(key)
      stats = cacheService.getStats()
      expect(stats.deletes).toBe(1)
    })

    it('should calculate hit rate', async () => {
      const stats = cacheService.getStats()
      expect(stats.hitRate).toBeDefined()
      expect(typeof stats.hitRate).toBe('string')
    })
  })

  describe('cache warmup', () => {
    it('should run warmup without error', async () => {
      const originalEnabled = cacheConfig.warmup.enabled
      cacheConfig.warmup.enabled = false

      await expect(cacheService.warmup({ force: true })).resolves.not.toThrow()

      cacheConfig.warmup.enabled = originalEnabled
    })
  })
})
