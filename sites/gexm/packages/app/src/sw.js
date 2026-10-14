importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js')

if (workbox) {
  workbox.setConfig({
    debug: false,
  })

  workbox.core.setCacheNameDetails({
    prefix: 'gexm',
    suffix: 'v1',
    precache: 'precache',
    runtime: 'runtime',
  })

  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || [])

  // 静态资源缓存策略：优先使用缓存，同时在后台更新
  // 适用于：HTML、CSS、JavaScript、JSON 配置文件
  workbox.routing.registerRoute(
    /\.(?:html|css|js|json)$/,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'gexm-static',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    })
  )

  // 图片缓存策略：优先使用缓存，适合不经常变化的图片资源
  // 适用场景：商品图片、用户头像、品牌图标等
  workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/,
    new workbox.strategies.CacheFirst({
      cacheName: 'gexm-images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  )

  // 商品列表缓存策略：优先网络，网络失败时返回缓存
  // 适用场景：商品搜索、分类列表、热门商品、新品推荐等
  const PRODUCT_API_PATTERN =
    /\/(api|rest)\/(products|categories|hot|new|recommended|search|flash-sale)/
  workbox.routing.registerRoute(
    PRODUCT_API_PATTERN,
    new workbox.strategies.NetworkFirst({
      cacheName: 'gexm-product-api',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
      networkTimeoutSeconds: 3,
    })
  )

  // 用户数据缓存策略：后台更新，保持数据新鲜度
  // 适用场景：用户信息、会员等级、积分余额等
  workbox.routing.registerRoute(
    /\/(api|rest)\/(user|profile|member|points)/,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'gexm-user-data',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 10 * 60,
        }),
      ],
    })
  )

  // 本地数据缓存策略：优先缓存，减少服务器压力
  // 适用场景：购物车、收藏夹、收货地址、优惠券等
  workbox.routing.registerRoute(
    /\/(api|rest)\/(cart|favorites|address|coupons|chat)/,
    new workbox.strategies.NetworkFirst({
      cacheName: 'gexm-local-data',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 15 * 60,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
      networkTimeoutSeconds: 2,
    })
  )

  // 订单数据缓存策略：实时优先，确保订单状态准确
  // 适用场景：订单列表、订单详情、物流信息等
  workbox.routing.registerRoute(
    /\/(api|rest)\/(orders?|logistics|payment|refund)/,
    new workbox.strategies.NetworkOnly({
      cacheName: 'gexm-order-data',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 2 * 60,
        }),
      ],
    }),
    'GET'
  )

  // 错误处理：针对不同类型的请求返回合适的降级响应
  workbox.routing.setCatchHandler(async ({ event }) => {
    // 页面导航降级：返回首页缓存
    if (event.request.mode === 'navigate') {
      return workbox.precaching.matchPrecache('/index.html')
    }
    // 图片请求降级：返回占位图
    if (event.request.destination === 'image') {
      return new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="#f5f5f5"/><text x="200" y="150" font-family="sans-serif" font-size="16" fill="#999" text-anchor="middle">图片加载失败</text></svg>`,
        { headers: { 'Content-Type': 'image/svg+xml' } }
      )
    }
    // API 请求降级：返回统一的错误响应
    return new Response(
      JSON.stringify({
        code: -1,
        message: '网络连接失败，请检查网络后重试',
        data: null,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  })

  // 安装阶段：预缓存核心资源
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('gexm-precache').then((cache) => {
        return cache.addAll(['/', '/index.html'])
      })
    )
    self.skipWaiting()
  })

  // 激活阶段：清理旧版本缓存
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('gexm') && !cacheName.endsWith('v1'))
            .map((cacheName) => caches.delete(cacheName))
        )
      })
    )
    self.clients.claim()
  })

  // 消息处理：支持手动触发缓存更新和清理
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting()
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName)
        })
      })
    }
    // 支持按缓存名称清理指定缓存
    if (event.data && event.data.type === 'CLEAR_CACHE_BY_NAME' && event.data.cacheName) {
      caches.delete(event.data.cacheName)
    }
  })
} else {
  console.warn('Workbox could not be loaded. Offline functionality will not work.')
}
