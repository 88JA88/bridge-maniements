const CACHE = 'bridge-couleur-v4';
const ASSETS = ['./', './index.html', './styles.css', './engine.js', './app.js', './manifest.webmanifest', './assets/logo-ja-applications.png', './icons/icon-192.svg', './icons/icon-512.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('bridge-couleur-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    if (response.ok && new URL(event.request.url).origin === self.location.origin) cache.put(event.request, copy);
    return response;
  }).catch(() => event.request.mode === 'navigate' ? cache.match('./index.html') : Response.error()))));
});
