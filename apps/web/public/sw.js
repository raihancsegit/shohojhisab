// ShohojHisab - Local Business OS Service Worker (Offline-First Engine)
const CACHE_NAME = 'shohoj-os-v2';
const STATIC_ASSETS = [
  '/',
  '/pos',
  '/khata',
  '/installments',
  '/stock',
  '/products',
  '/expenses',
  '/dealers',
  '/reports',
  '/day-end',
  '/ai-assistant',
  '/settings',
  '/notifications',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip caching external or non-HTTP calls
  if (!url.protocol.startsWith('http')) return;

  // Stale-While-Revalidate for static assets & pages for instant (0ms) render!
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for a page/navigation, fallback to root or cached route
          if (event.request.mode === 'navigate') {
            return cache.match(event.request).then(page => page || cache.match('/pos') || cache.match('/'));
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
