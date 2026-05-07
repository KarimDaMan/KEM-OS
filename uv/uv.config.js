// Mirror of /js/uv-config.js for direct import from the SW path. Keep in sync.
self.__uv$config = {
  prefix: '/uv/service/',
  bare: (self.localStorage && self.localStorage.getItem && JSON.parse(self.localStorage.getItem('kemos.registry.v1') || '{}')['proxy.bareUrl']) || '',
  encodeUrl: s => { let o=''; for (let i=0;i<s.length;i++) o += i%2 ? String.fromCharCode(s.charCodeAt(i) ^ 2) : s[i]; return encodeURIComponent(o); },
  decodeUrl: s => { s = decodeURIComponent(s); let o=''; for (let i=0;i<s.length;i++) o += i%2 ? String.fromCharCode(s.charCodeAt(i) ^ 2) : s[i]; return o; },
  handler: 'https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.handler.js',
  client:  'https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.client.js',
  bundle:  'https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.bundle.js',
  config:  '/uv/uv.config.js',
  sw:      '/uv/uv.sw.js',
};
