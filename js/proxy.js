// Ultraviolet client: SW registration + URL encoding helpers.
(function () {
  const SW_PATH = '/uv/uv.sw.js';
  const SW_SCOPE = '/uv/service/';

  let registration = null;
  let registering = null;

  function isSupported() { return 'serviceWorker' in navigator && location.protocol !== 'file:'; }

  async function ensureSW() {
    if (!isSupported()) throw new Error('Service workers not available');
    if (registration && registration.active) return registration;
    if (registering) return registering;
    registering = navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE })
      .then(reg => { registration = reg; return reg; })
      .finally(() => { registering = null; });
    return registering;
  }

  function activeCodec() {
    const c = Registry.get('proxy.encoding');
    return (self.__uv$codecs && self.__uv$codecs[c]) || self.__uv$codecs.xor;
  }

  function encodeUrl(url) { return activeCodec().encode(url); }

  function bareConfigured() { return !!Registry.get('proxy.bareUrl'); }

  function buildSearchUrl(query) {
    if (!query) return Registry.get('proxy.homepage');
    const looksLikeUrl = /^https?:\/\//i.test(query) || /^[\w-]+\.[\w.-]+\/?/i.test(query);
    if (looksLikeUrl) return /^https?:\/\//i.test(query) ? query : 'https://' + query;
    const eng = Registry.get('proxy.searchEngine') || 'https://duckduckgo.com/?q=%s';
    return eng.replace('%s', encodeURIComponent(query));
  }

  async function navigate(input) {
    const url = buildSearchUrl(input);
    if (!bareConfigured()) {
      throw new Error('Proxy bare server is not configured. Open Settings → Network and paste a bare URL.');
    }
    await ensureSW();
    self.__uv$config.bare = Registry.get('proxy.bareUrl');
    self.__uv$config.encodeUrl = activeCodec().encode;
    self.__uv$config.decodeUrl = activeCodec().decode;
    return SW_SCOPE + encodeUrl(url);
  }

  // Refresh codec on registry change
  Registry.on('proxy.encoding', () => {
    self.__uv$config.encodeUrl = activeCodec().encode;
    self.__uv$config.decodeUrl = activeCodec().decode;
  });
  Registry.on('proxy.bareUrl', v => { self.__uv$config.bare = v; });
  // Initial sync
  self.__uv$config.bare = Registry.get('proxy.bareUrl');

  window.Proxy = { ensureSW, encodeUrl, navigate, buildSearchUrl, isSupported, bareConfigured };
})();
