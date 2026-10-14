// 配送定位系统 Service Worker —— 纯运行时缓存，无需已知资源哈希
// 同源 GET 走缓存优先（带网络回退）；跨域（地图瓦片 / 第三方 API）直接放行，不缓存。
const CACHE = 'delivery-router-v1'
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function isCacheableAsset(url) {
  return /\.(?:js|css|svg|png|jpg|jpeg|gif|woff2?|json|webp)$/.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // 跨域请求（地图瓦片、高德/腾讯/OSM API 等）一律走网络，避免污染缓存
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // 导航请求：网络优先，失败回退缓存的 index.html（离线可用）
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  if (isCacheableAsset(url)) {
    // 静态资源：缓存优先 + 后台更新（stale-while-revalidate）
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
