// IMPORTANT: this version number has to change any time this file's behavior
// changes, or the browser won't recognize there's a new version to install at
// all -- it compares this file byte-for-byte, and if sw.js looks identical, it
// assumes nothing changed and keeps the old one running indefinitely.
const CACHE_NAME = 'vinyl-shell-v2';
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

// Network-FIRST, not cache-first: always try to get the current version of a
// file from GitHub when there's a connection, and only fall back to whatever
// was last cached if the network request fails (genuinely offline). The
// previous version always served the cached copy first, which meant a code
// update here would never actually reach an already-installed PWA -- this is
// the fix for "I updated index.html but nothing changed."
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('collection.json')) {
    return; // handled entirely by the page itself, not the service worker
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
