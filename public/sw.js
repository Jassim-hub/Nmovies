// NicholMoviesUg Service Worker
// Handles caching for PWA offline support

const CACHE_NAME = 'nicholmoviesug-v1';
const OFFLINE_URL = '/';

// Assets to precache for offline shell
const PRECACHE_ASSETS = [
  '/',
  '/logo.png',
  '/manifest.json',
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests except images
  if (url.origin !== location.origin && !request.destination === 'image') return;

  // Skip API routes — always network
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (
          request.destination === 'image' ||
          request.destination === 'style' ||
          request.destination === 'script' ||
          request.destination === 'font'
        )) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Fallback: try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return cached home page
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notification handler (for browsers that don't use OneSignal's worker)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.message || data.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      image: data.imageUrl || data.big_picture,
      data: data.data || {},
      vibrate: [100, 50, 100],
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'NicholMoviesUg', options)
    );
  } catch {
    // Not JSON, skip
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data;
  let targetUrl = '/';

  if (notifData && notifData.type && notifData.id) {
    targetUrl = `/${notifData.type === 'movie' ? 'movies' : 'series'}/${notifData.id}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
