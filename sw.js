const CACHE_NAME = 'hockey-timer-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/alarm.wav',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Intentando cachear:', urlsToCache);
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Error en cache.addAll:', error);
          throw error;
        });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(error => {
        console.error('Error en fetch:', error);
      })
  );
});

