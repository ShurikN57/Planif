const CACHE = 'planif-v17-tools-42';
const APP_SHELL = [
  './',
  './index.html',
  './planif-version.js?v=2026.10.19.42',
  './planif-rules.js?v=2026.10.19.42',
  './planif-engine.js?v=2026.10.19.42',
  './planif-evidence.js?v=2026.10.19.42',
  './planif-studies.json?v=2026.10.19.42',
  './planif-coros.js?v=2026.10.19.42',
  './planif-ui.js?v=2026.10.19.42',
  './planif-strava.js?v=2026.10.19.42',
  './planif-calendar-drag.js?v=2026.10.19.42',
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
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const req = event.request;
  const navigation = req.mode === 'navigate' || req.destination === 'document' ||
    /\/Planif\/(?:index\.html)?$/.test(new URL(req.url).pathname);
  event.respondWith((async () => {
    let response;
    try { response = await fetch(req, navigation ? { cache: 'no-store' } : undefined); } catch (_) {}
    if (response?.ok) {
      try {
        const cache = await caches.open(CACHE);
        if (navigation) {
          await cache.put('./index.html', response.clone());
          await cache.put('./', response.clone());
        } else await cache.put(req, response.clone());
      } catch (_) { /* A full/unavailable cache must not discard a successful network response. */ }
      return response;
    }
    const keys = navigation ? ['./index.html', './'] : [req];
    for (const key of keys) {
      try { const cached = await caches.match(key); if (cached?.ok) return cached; } catch (_) {}
    }
    return response || new Response('Connexion indisponible. Réessaie avec une connexion Internet.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

