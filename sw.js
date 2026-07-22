const CACHE_NAME = 'fgu-v3';
const PRECACHE_URLS = [
  '/',
  '/gamesdesign.min.css',
  '/script.js',
  '/cookieconsent.js',
  '/data.json',
  '/site.webmanifest',
  '/assets/og-image.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/gGames.jpg',
  '/fonts/Montserrat-VariableFont_wght.ttf',
  '/driving.html',
  '/skill.html',
  '/shooting.html',
  '/retro.html',
  '/calm.html',
  '/random.html',
  '/papasalley.html',
  '/blog/',
  '/suggestions.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function cachePut(request, response) {
  if (response && response.ok) {
    const clone = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
  }
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin === 'https://earnify.cc') return;

  // Game files and thumbnails: stale-while-revalidate (large, rarely change)
  if (url.pathname.startsWith('/games/') || url.pathname.startsWith('/gamesimages/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          return cachePut(event.request, response);
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML pages: network-first so deploys are visible immediately, cache as offline fallback
  const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHtml) {
    event.respondWith(
      fetch(event.request).then(response => {
        return cachePut(event.request, response);
      }).catch(() =>
        caches.match(event.request).then(cached =>
          cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        )
      )
    );
    return;
  }

  // Other static assets (css/js/json/fonts/images): cache-first, populate on miss
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        return cachePut(event.request, response);
      }).catch(() => new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
    )
  );
});
