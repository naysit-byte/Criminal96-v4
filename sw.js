/* Legal Pro — Service Worker v1.0 */
const CACHE = 'legal-pro-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ──── Install: cache app shell ──── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ──── Activate: clear old caches ──── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ──── Fetch: cache-first for app shell, network-first for API ──── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* API calls (jsonbin, generativelanguage) → network only, no cache */
  if (url.hostname.includes('jsonbin.io') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('generativelanguage')) {
    return; /* let browser handle normally */
  }

  /* App shell → cache-first */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        /* cache successful same-origin responses */
        if (resp && resp.status === 200 && url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        /* offline fallback: return cached index.html */
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
