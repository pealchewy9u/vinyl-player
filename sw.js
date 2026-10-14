// Caches just the app shell (HTML/CSS/JS/icons) so the app opens even with no
// connection. collection.json is deliberately NOT cached here -- index.html
// already falls back to its own localStorage cache for that when offline,
// and we always want a fresh network fetch of the data when one is possible.
const CACHE_NAME = 'vinyl-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('collection.json')) {
    return; // always go to the network for data, never serve a stale cached copy
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
