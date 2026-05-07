// Tiny in-memory + localStorage virtual filesystem.
(function () {
  const KEY = 'kemos.fs.v1';

  function seed() {
    return {
      '/': { type: 'dir' },
      '/Desktop': { type: 'dir' },
      '/Documents': { type: 'dir' },
      '/Documents/welcome.txt': { type: 'file', content:
`Welcome to KEM-OS!

This is a fully client-side, GitHub Pages-friendly Windows-style desktop.
- 40 apps in the Start menu
- 100+ tweakable settings
- Built-in Ultraviolet web proxy (configure a bare server in Settings → Network)

Right-click anywhere to explore. Drag windows, snap them to edges, theme
the whole thing from Settings → Personalization.
` },
      '/Documents/notes.md': { type: 'file', content: '# Notes\n\n- Buy milk\n- Tweak accent color\n- Try the Browser app\n' },
      '/Pictures': { type: 'dir' },
      '/Music': { type: 'dir' },
      '/Videos': { type: 'dir' },
      '/Downloads': { type: 'dir' },
    };
  }

  let tree = {};
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      tree = raw ? JSON.parse(raw) : seed();
    } catch (e) { tree = seed(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(tree)); } catch (e) {} }
  load();

  function norm(p) {
    if (!p) return '/';
    if (!p.startsWith('/')) p = '/' + p;
    return p.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
  }
  function parent(p) { p = norm(p); if (p === '/') return '/'; return p.split('/').slice(0,-1).join('/') || '/'; }
  function name(p) { p = norm(p); return p === '/' ? '/' : p.split('/').pop(); }

  window.FS = {
    list(p) {
      p = norm(p);
      if (!tree[p] || tree[p].type !== 'dir') return [];
      const prefix = p === '/' ? '/' : p + '/';
      return Object.keys(tree)
        .filter(k => k !== p && k.startsWith(prefix) && k.slice(prefix.length).indexOf('/') === -1)
        .map(k => ({ path: k, name: name(k), type: tree[k].type, size: tree[k].content ? tree[k].content.length : 0 }));
    },
    exists(p) { return !!tree[norm(p)]; },
    read(p) { p = norm(p); return tree[p] && tree[p].type === 'file' ? tree[p].content || '' : null; },
    write(p, content) {
      p = norm(p);
      const par = parent(p);
      if (!tree[par]) this.mkdir(par);
      tree[p] = { type: 'file', content: String(content) };
      save();
    },
    mkdir(p) {
      p = norm(p);
      if (tree[p]) return;
      const par = parent(p);
      if (par !== p && !tree[par]) this.mkdir(par);
      tree[p] = { type: 'dir' };
      save();
    },
    remove(p) {
      p = norm(p);
      Object.keys(tree).forEach(k => { if (k === p || k.startsWith(p + '/')) delete tree[k]; });
      save();
    },
    rename(oldP, newP) {
      oldP = norm(oldP); newP = norm(newP);
      Object.keys(tree).forEach(k => {
        if (k === oldP || k.startsWith(oldP + '/')) {
          const dst = newP + k.slice(oldP.length);
          tree[dst] = tree[k];
          delete tree[k];
        }
      });
      save();
    },
    parent, name, norm,
    raw() { return tree; },
    reset() { tree = seed(); save(); }
  };
})();
