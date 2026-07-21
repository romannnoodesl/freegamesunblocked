const CACHE_NAME = 'fgu-v2';
const PRECACHE_URLS = [
  '/',
  '/gamesdesign.css',
  '/script.js',
  '/cookieconsent.js',
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
  '/blog.html',
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
    )
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
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin === 'https://earnify.cc') return;

  if (url.pathname.startsWith('/games/') || url.pathname.startsWith('/gamesimages/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).catch(() => new Response('Offline', { status: 503 }))
    )
  );
});