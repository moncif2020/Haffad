self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept audio requests
  if (url.hostname === 'cdn.islamic.network' && url.pathname.includes('/audio/')) {
    event.respondWith(
      caches.match(event.request.url).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request, { mode: 'no-cors' });
      })
    );
  }
});