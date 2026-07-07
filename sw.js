/* Service Worker — يخزّن تطبيق المصاريف للعمل بدون إنترنت.
   بيانات المصاريف في localStorage تحت مفتاح daily_expenses_v1 فقط. */
const CACHE_NAME = 'expenses-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './expenses/',
  './expenses/index.html',
  './expenses/styles.css',
  './expenses/app.js',
  './expenses/manifest.webmanifest',
  './expenses/icon-192.png',
  './expenses/icon-512.png',
  './expenses-desktop.url',
  './expenses.desktop',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
