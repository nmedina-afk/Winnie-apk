const CACHE_NAME = 'hockey-cache-v1';
const ASSETS = [
  'index.html','app.js','manifest.json','alarm.wav','icon-192.png','icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  const msg = event.data;
  if(msg && msg.cmd === 'show-notif'){
    const { title, opts } = msg;
    self.registration.showNotification(title, opts || {});
  }
});
