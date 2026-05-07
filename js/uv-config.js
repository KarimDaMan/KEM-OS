// Ultraviolet runtime configuration. Loaded by both the page and the SW.
self.__uv$config = {
  prefix: '/uv/service/',
  bare: '',                 // <-- set in Settings → Network → Proxy or via prompt
  encodeUrl: codec => codec, // overwritten below
  decodeUrl: codec => codec,
  handler: 'https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.handler.js',
  client:  'https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.client.js',
  bundle:  'https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.bundle.js',
  config:  '/uv/uv.config.js',
  sw:      '/uv/uv.sw.js',
};

// XOR codec (default) — same algorithm UV ships in its examples.
(function () {
  function xorEnc(str) {
    if (!str) return str;
    let out = '';
    for (let i = 0; i < str.length; i++) {
      out += i % 2 ? String.fromCharCode(str.charCodeAt(i) ^ 2) : str[i];
    }
    return encodeURIComponent(out);
  }
  function xorDec(str) {
    let s = decodeURIComponent(str);
    let out = '';
    for (let i = 0; i < s.length; i++) {
      out += i % 2 ? String.fromCharCode(s.charCodeAt(i) ^ 2) : s[i];
    }
    return out;
  }
  function b64Enc(str) { return encodeURIComponent(btoa(unescape(encodeURIComponent(str)))); }
  function b64Dec(str) { return decodeURIComponent(escape(atob(decodeURIComponent(str)))); }
  function plainEnc(str) { return encodeURIComponent(str); }
  function plainDec(str) { return decodeURIComponent(str); }

  self.__uv$codecs = {
    xor:    { encode: xorEnc, decode: xorDec },
    base64: { encode: b64Enc, decode: b64Dec },
    plain:  { encode: plainEnc, decode: plainDec },
  };

  // pick from registry if available, else default xor
  let chosen = 'xor';
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('kemos.registry.v1');
      if (raw) chosen = (JSON.parse(raw)['proxy.encoding']) || 'xor';
    }
  } catch (e) {}
  self.__uv$config.encodeUrl = self.__uv$codecs[chosen].encode;
  self.__uv$config.decodeUrl = self.__uv$codecs[chosen].decode;
})();
