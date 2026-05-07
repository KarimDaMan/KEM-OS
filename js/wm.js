// Window manager: open, focus, drag, resize, snap, minimize, maximize.
(function () {
  const layer = () => document.getElementById('windowLayer');
  const taskbarApps = () => document.getElementById('taskbarApps');
  const wins = new Map();
  let zCounter = 100;
  let focusedId = null;

  function uid() { return 'w' + Math.random().toString(36).slice(2, 9); }

  function makeWindow(opts) {
    const id = opts.id || uid();
    if (opts.singleton && [...wins.values()].some(w => w.appId === opts.appId)) {
      const existing = [...wins.values()].find(w => w.appId === opts.appId);
      focus(existing.id);
      return existing.id;
    }

    const el = document.createElement('div');
    el.className = 'win';
    el.dataset.id = id;
    if (Registry.get('transparency') === false || Registry.get('theme') === 'light') el.classList.add('no-blur');

    const tb = `
      <div class="win-titlebar">
        <div class="win-title"><span class="ic">${opts.icon || '🗔'}</span><span>${opts.title || 'Window'}</span></div>
        <div class="win-controls">
          <button class="min" title="Minimize">—</button>
          <button class="max" title="Maximize">▢</button>
          <button class="close" title="Close">✕</button>
        </div>
      </div>
      <div class="win-body"></div>
      <div class="win-resize r-t"></div><div class="win-resize r-b"></div>
      <div class="win-resize r-l"></div><div class="win-resize r-r"></div>
      <div class="win-resize r-tl"></div><div class="win-resize r-tr"></div>
      <div class="win-resize r-bl"></div><div class="win-resize r-br"></div>
    `;
    el.innerHTML = tb;

    const w = opts.width || 720, h = opts.height || 480;
    const lr = layer().getBoundingClientRect();
    const x = Math.max(20, (lr.width - w) / 2 + (Math.random() * 60 - 30));
    const y = Math.max(20, (lr.height - h) / 2 + (Math.random() * 60 - 30));
    Object.assign(el.style, {
      width: w + 'px', height: h + 'px',
      left: x + 'px', top: y + 'px',
      zIndex: ++zCounter
    });

    layer().appendChild(el);
    const body = el.querySelector('.win-body');
    if (typeof opts.render === 'function') opts.render(body, { id, close: () => closeWin(id), title: t => setTitle(id, t) });
    else if (typeof opts.html === 'string') body.innerHTML = opts.html;

    // Controls
    el.querySelector('.close').onclick = () => closeWin(id);
    el.querySelector('.max').onclick = () => toggleMax(id);
    el.querySelector('.min').onclick = () => minimize(id);
    el.querySelector('.win-titlebar').addEventListener('dblclick', () => toggleMax(id));

    // Drag
    const titlebar = el.querySelector('.win-titlebar');
    titlebar.addEventListener('mousedown', e => {
      if (e.target.closest('.win-controls')) return;
      const rect = el.getBoundingClientRect();
      const off = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (el.classList.contains('maximized')) {
        const ratio = off.x / rect.width;
        toggleMax(id, true);
        const newW = parseFloat(el.style.width);
        off.x = newW * ratio; off.y = 16;
      }
      const move = ev => {
        const lay = layer().getBoundingClientRect();
        let nx = ev.clientX - off.x - lay.left;
        let ny = ev.clientY - off.y - lay.top;
        nx = Math.max(-rect.width + 80, Math.min(lay.width - 60, nx));
        ny = Math.max(0, Math.min(lay.height - 30, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
        showSnapPreview(ev, lay);
      };
      const up = ev => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        const snap = currentSnap;
        hideSnapPreview();
        if (snap && Registry.get('system.snap')) applySnap(id, snap);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      focus(id);
    });

    // Resize
    el.querySelectorAll('.win-resize').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        e.stopPropagation();
        const dir = handle.className.split(' ').find(c => c.startsWith('r-')).slice(2);
        const start = { x: e.clientX, y: e.clientY,
          w: el.offsetWidth, h: el.offsetHeight,
          l: el.offsetLeft, t: el.offsetTop };
        const move = ev => {
          const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
          if (dir.includes('r')) el.style.width = Math.max(280, start.w + dx) + 'px';
          if (dir.includes('b')) el.style.height = Math.max(180, start.h + dy) + 'px';
          if (dir.includes('l')) { const nw = Math.max(280, start.w - dx); el.style.width = nw + 'px'; el.style.left = (start.l + (start.w - nw)) + 'px'; }
          if (dir.includes('t')) { const nh = Math.max(180, start.h - dy); el.style.height = nh + 'px'; el.style.top = (start.t + (start.h - nh)) + 'px'; }
        };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    });

    el.addEventListener('mousedown', () => focus(id));

    const winObj = { id, el, appId: opts.appId, title: opts.title, icon: opts.icon, minimized: false, maximized: false };
    wins.set(id, winObj);
    addTaskbarItem(winObj);
    focus(id);
    return id;
  }

  function setTitle(id, t) {
    const w = wins.get(id); if (!w) return;
    w.title = t;
    w.el.querySelector('.win-title span:last-child').textContent = t;
    const btn = taskbarApps().querySelector(`[data-win="${id}"]`);
    if (btn) btn.title = t;
  }

  function focus(id) {
    const w = wins.get(id); if (!w) return;
    if (w.minimized) { w.el.classList.remove('minimized'); w.minimized = false; }
    [...wins.values()].forEach(o => o.el.classList.remove('focused'));
    w.el.classList.add('focused');
    w.el.style.zIndex = ++zCounter;
    focusedId = id;
    updateTaskbar();
  }
  function minimize(id) {
    const w = wins.get(id); if (!w) return;
    w.minimized = true;
    w.el.classList.add('minimized');
    updateTaskbar();
  }
  function toggleMax(id, forceRestore) {
    const w = wins.get(id); if (!w) return;
    if (w.maximized || forceRestore) {
      w.maximized = false; w.el.classList.remove('maximized');
      Object.assign(w.el.style, w._pre || {});
    } else {
      w._pre = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
      w.maximized = true; w.el.classList.add('maximized');
      Object.assign(w.el.style, { left: '0px', top: '0px', width: '100%', height: '100%' });
    }
  }
  function closeWin(id) {
    const w = wins.get(id); if (!w) return;
    w.el.style.transition = 'transform 0.15s, opacity 0.15s';
    w.el.style.transform = 'scale(0.96)';
    w.el.style.opacity = '0';
    setTimeout(() => { w.el.remove(); }, 140);
    wins.delete(id);
    const btn = taskbarApps().querySelector(`[data-win="${id}"]`);
    if (btn) btn.remove();
  }
  function closeAll() { [...wins.keys()].forEach(closeWin); }
  function minimizeAll() { [...wins.keys()].forEach(minimize); }

  function addTaskbarItem(w) {
    const btn = document.createElement('button');
    btn.className = 'tb-btn';
    btn.dataset.win = w.id;
    btn.innerHTML = `<span style="margin-right:6px;">${w.icon || '🗔'}</span>${Registry.get('taskbar.combine') ? '' : (w.title || '')}`;
    btn.title = w.title || '';
    btn.onclick = () => {
      const win = wins.get(w.id);
      if (!win) return;
      if (focusedId === w.id && !win.minimized) minimize(w.id);
      else focus(w.id);
    };
    taskbarApps().appendChild(btn);
  }
  function updateTaskbar() {
    taskbarApps().querySelectorAll('.tb-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.win === focusedId);
    });
  }

  // Snap handling
  let currentSnap = null;
  function showSnapPreview(e, lay) {
    if (!Registry.get('system.snap')) return;
    const t = 16;
    let snap = null;
    if (e.clientY < t) snap = 'top';
    else if (e.clientX < t) snap = 'left';
    else if (e.clientX > lay.right - t) snap = 'right';
    if (snap !== currentSnap) {
      hideSnapPreview();
      currentSnap = snap;
      if (snap) {
        const p = document.createElement('div');
        p.className = 'snap-preview';
        p.id = 'snapPrev';
        let s = { left: 0, top: 0, width: '50%', height: '100%' };
        if (snap === 'left') s = { left: 0, top: 0, width: '50%', height: '100%' };
        if (snap === 'right') s = { left: '50%', top: 0, width: '50%', height: '100%' };
        if (snap === 'top') s = { left: 0, top: 0, width: '100%', height: '100%' };
        Object.assign(p.style, s);
        layer().appendChild(p);
      }
    }
  }
  function hideSnapPreview() { const p = document.getElementById('snapPrev'); if (p) p.remove(); currentSnap = null; }
  function applySnap(id, snap) {
    const w = wins.get(id); if (!w) return;
    w.maximized = false; w.el.classList.remove('maximized');
    if (snap === 'top') return toggleMax(id);
    if (snap === 'left') Object.assign(w.el.style, { left: '0px', top: '0px', width: '50%', height: '100%' });
    if (snap === 'right') Object.assign(w.el.style, { left: '50%', top: '0px', width: '50%', height: '100%' });
  }

  window.WM = { open: makeWindow, close: closeWin, closeAll, minimizeAll, focus, list: () => [...wins.values()] };
})();
