// Service Worker for thumbnail caching
// Cache-first strategy: Check cache first, then network

const CACHE_NAME = 'village-photos-thumbnails-v1';
const THUMBNAIL_CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event - claim all clients immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy for thumbnails
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache thumbnail and batch API requests
  if (url.pathname.includes('/api/thumbnail') || url.pathname.includes('/api/thumbnails/batch')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Check if cached response exists and is not expired
          if (cachedResponse) {
            const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date'));
            const now = new Date();

            // If cache is still valid, return it
            if (now - cachedDate < THUMBNAIL_CACHE_EXPIRY) {
              console.log('[SW] Cache hit:', url.pathname);
              return cachedResponse;
            } else {
              console.log('[SW] Cache expired:', url.pathname);
            }
          }

          // Cache miss or expired - fetch from network
          console.log('[SW] Fetching from network:', url.pathname);
          return fetch(event.request).then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              // Clone the response before caching
              const responseToCache = networkResponse.clone();

              // Add custom header with cache date
              const headers = new Headers(responseToCache.headers);
              headers.set('sw-cached-date', new Date().toISOString());

              const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers,
              });

              cache.put(event.request, cachedResponse);
              console.log('[SW] Cached:', url.pathname);
            }

            return networkResponse;
          }).catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // Return cached response even if expired if network fails
            if (cachedResponse) {
              console.log('[SW] Returning expired cache due to network error');
              return cachedResponse;
            }
            throw error;
          });
        });
      })
    );
  }
  // For all other requests, use default browser behavior
});

// Message event - for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing cache...');
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
