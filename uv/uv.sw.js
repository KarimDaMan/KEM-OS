// Service worker that hosts Ultraviolet on /uv/service/*.
importScripts('/uv/uv.config.js');
importScripts(self.__uv$config.bundle);

const uv = new UVServiceWorker(self.__uv$config);

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  if (event.request.url.startsWith(location.origin + self.__uv$config.prefix)) {
    event.respondWith((async () => {
      try { return await uv.fetch(event); }
      catch (err) {
        return new Response('Ultraviolet error: ' + err.message + '\n\nCheck Settings → Network → Proxy bare server URL.', { status: 500 });
      }
    })());
  }
});
