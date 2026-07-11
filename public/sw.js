// Rock 88.7 — Service Worker (Workbox-style, no dependency)
// Provides offline fallback shell + runtime caching strategies

const CACHE_VERSION = 'rock887-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE = `${CACHE_VERSION}-api`
const IMG_CACHE = `${CACHE_VERSION}-img`

// Assets to pre-cache for offline shell
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
]

// Install — pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  )
  self.skipWaiting()
})

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('rock887-') && key !== STATIC_CACHE && key !== API_CACHE && key !== IMG_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

// Fetch — routing strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip WebSocket upgrade
  if (request.headers.get('upgrade') === 'websocket') return

  // Skip cross-origin requests (except our gateway)
  if (url.origin !== self.location.origin) return

  // API requests — NetworkFirst (fresh data, fall back to cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, 300)) // 5 min cache
    return
  }

  // Images — StaleWhileRevalidate (instant from cache, update in background)
  if (request.destination === 'image' || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE))
    return
  }

  // Static assets — CacheFirst (rarely change)
  if (url.pathname.startsWith('/_next/static/') || /\.(css|js|woff2?|ttf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Pages — NetworkFirst with offline fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE, 0, '/'))
    return
  }

  // Default — try network, fall back to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((r) => r || new Response('Offline', { status: 503 }))),
  )
})

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName, maxAgeSec = 0, fallbackUrl = null) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) {
      // Check age if maxAge specified
      if (maxAgeSec > 0) {
        const cachedTime = cached.headers.get('date')
        if (cachedTime) {
          const age = (Date.now() - new Date(cachedTime).getTime()) / 1000
          if (age > maxAgeSec && fallbackUrl) {
            const fallback = await cache.match(fallbackUrl)
            if (fallback) return fallback
          }
        }
      }
      return cached
    }
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl)
      if (fallback) return fallback
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || fetchPromise
}

// Push notifications (VAPID)
self.addEventListener('push', (event) => {
  let data = { title: 'Rock 88.7', body: 'New notification' }
  try {
    data = event.data?.json() ?? data
  } catch {
    data = { title: 'Rock 88.7', body: event.data?.text() ?? 'New notification' }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: data.data ?? { url: '/' },
    actions: data.actions ?? [],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(self.clients.openWindow(url))
})

// Background sync (queue offline mutations)
self.addEventListener('sync', (event) => {
  if (event.tag === 'rock887-sync') {
    event.waitUntil(syncOfflineQueue())
  }
})

async function syncOfflineQueue() {
  // Replay queued mutations when connection restored
  const cache = await caches.open(`${CACHE_VERSION}-queue`)
  const keys = await cache.keys()
  for (const req of keys) {
    try {
      const response = await fetch(req)
      if (response.ok) await cache.delete(req)
    } catch {
      // Will retry on next sync
    }
  }
}
