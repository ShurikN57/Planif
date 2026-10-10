const CACHE = 'planif-v9-strava-1';
const APP_SHELL = [
  './',
  './index.html',
  './planif-strava.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  /* Les échanges COROS restent hors du cache PWA, y compris leurs métadonnées. */
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  const req = event.request;
  const isNavigation = req.mode === 'navigate' ||
    req.destination === 'document' ||
    new URL(req.url).pathname.endsWith('/Planif/') ||
    new URL(req.url).pathname.endsWith('/Planif/index.html');

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const copy = fresh.clone();
        const cache = await caches.open(CACHE);
        await cache.put('./index.html', copy.clone());
        await cache.put('./', copy);
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith(
    fetch(req).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
      return response;
    }).catch(() => caches.match(req))
  );
});


self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

