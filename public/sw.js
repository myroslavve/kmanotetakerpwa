const CACHE_NAME = 'notetaker-shell-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', networkResponse.clone());
          return networkResponse;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cachedNavigation = await cache.match(request, {
            ignoreSearch: true,
          });
          if (cachedNavigation) {
            return cachedNavigation;
          }

          const appShell = await cache.match('/index.html');
          if (appShell) {
            return appShell;
          }

          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })(),
    );
    return;
  }

  // Cache visited static resources by pathname so dev query params (e.g. ?t=...)
  // can still resolve from cache when offline.
  const cacheKey = url.pathname;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse =
        (await cache.match(cacheKey)) ?? (await cache.match(request));

      if (cachedResponse) {
        event.waitUntil(
          fetch(request)
            .then(async (networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                await cache.put(cacheKey, networkResponse.clone());
              }
            })
            .catch(() => {
              // Keep serving stale cache when network is unavailable.
            }),
        );

        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          await cache.put(cacheKey, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const fallback = await cache.match('/index.html');
        if (fallback) {
          return fallback;
        }

        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
