// Service worker: app shell in cache, dati "network first" con fallback offline.
const VERSION = 'oroscopo-v19';
const SHELL = ['/', '/index.html', '/theme.css', '/app.css', '/app.js',
  '/icon.svg'];

const ICON_PATHS = ['/manifest.webmanifest', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // dati oroscopo: rete prima, poi ultima copia salvata
  if (url.pathname === '/api/oroscopo') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      // una copia per periodo, senza il parametro refresh
      const key = `/api/oroscopo?period=${url.searchParams.get("period") || "giornaliero"}`;
      try {
        const res = await fetch(e.request);
        if (res.ok) cache.put(key, res.clone());
        return res;
      } catch {
        const hit = await cache.match(key);
        if (!hit) throw new Error('offline');
        const json = await hit.json();
        return new Response(JSON.stringify({ ...json, offline: true }), { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // icone personalizzate e manifest con l'icona scelta: sempre dalla rete
  // (il server serve l'ultima icona scelta anche agli indirizzi standard: niente copie in cache)
  if (url.pathname.startsWith("/icons/") || ICON_PATHS.includes(url.pathname)) return;

  // file dell'app (stessa origine): stale-while-revalidate
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || caches.match('/index.html');
    })());
    return;
  }

  // Google Fonts: cache first
  if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      c.put(e.request, res.clone());
      return res;
    }));
  }
});
