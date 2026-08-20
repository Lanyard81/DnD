// FableTable Solo — service worker for the GitHub Pages / installed-PWA
// deployment. Cache-first for the app shell so the app works fully offline
// after the first successful load. Never fetches anything the app itself
// doesn't already request — no analytics, no third-party calls, ever.
//
// Bump CACHE_VERSION whenever index.html/manifest.json/icons change so
// clients pick up the new version instead of serving a stale cached shell.
const CACHE_VERSION = 'fabletable-v1';
const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only ever handle same-origin GET requests — this app makes no other
  // network calls, and we don't want to accidentally start caching or
  // proxying anything else.
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached: nothing more we can do for this request
    })
  );
});
