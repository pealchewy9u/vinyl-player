/* Vinyl Collection offline cache. No GitHub API, tokens or listening history are cached. */
const VERSION = 'vinyl-shell-v1-20261104';
const SHELL = ['./', './index.html', './collection.json', './manifest.json'];
const COVERS = 'vinyl-covers-v1';
const DATA = 'vinyl-data-v1';
const ALLOWED = new Set([VERSION, COVERS, DATA]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(async path => {
      const response = await fetch(path, {cache:'reload'});
      if (response.ok) await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('vinyl-') && !ALLOWED.has(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Never intercept api.github.com or other cross-origin connections.
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  const path = url.pathname.toLowerCase();
  const isCover = path.includes('/photos/');
  const isData = path.endsWith('/collection.json');
  const isNavigation = req.mode === 'navigate';
  if (!isCover && !isData && !isNavigation && !path.endsWith('/manifest.json') && !path.endsWith('.png')) return;

  if (isCover) {
    event.respondWith((async () => {
      const cache = await caches.open(COVERS);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone()).catch(() => {});
      return res;
    })());
    return;
  }
  // Network first: online refresh gets the latest GitHub Pages content.
  // Offline: use the last cached application and collection snapshot.
  event.respondWith((async () => {
    const cache = await caches.open(isData ? DATA : VERSION);
    try {
      const fresh = await fetch(req);
      if (fresh.ok) await cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (error) {
      return (await cache.match(req)) ||
        (isData ? (await caches.open(VERSION)).match('./collection.json') :
          isNavigation ? (await caches.open(VERSION)).match('./index.html') : undefined) ||
        Response.error();
    }
  })());
});
