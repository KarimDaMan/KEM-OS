// Top-level OS shell: boot/lock, start menu, action center, taskbar, themeing,
// context menu, keyboard, notifications, registry sync.
(function () {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  // Wallpaper presets
  const WALLPAPERS = {
    'preset:aurora':    'linear-gradient(135deg,#0a1f3d 0%,#1f3a73 50%,#5a8fd6 100%)',
    'preset:nightcity': 'linear-gradient(180deg,#0a0a23 0%,#1a1a40 50%,#5e2a8a 100%)',
    'preset:mountains': 'linear-gradient(180deg,#1e3a5f 0%,#3a6494 60%,#dab27a 100%)',
    'preset:abstract':  'conic-gradient(from 220deg at 60% 30%, #ec4899, #6366f1, #06b6d4, #10b981, #ec4899)',
    'preset:plain':     'linear-gradient(180deg,#0c0c12,#1a1a25)',
    'preset:sunset':    'linear-gradient(135deg,#ff7e5f,#feb47b)',
    'preset:forest':    'linear-gradient(135deg,#134e5e,#71b280)',
  };
  function wallpaperCss(v) {
    if (!v) return WALLPAPERS['preset:aurora'];
    if (WALLPAPERS[v]) return WALLPAPERS[v];
    if (/^https?:|^data:/i.test(v)) return `url("${v}")`;
    return WALLPAPERS['preset:aurora'];
  }

  // ===== Theme syncing =====
  function applyTheme() {
    const r = Registry;
    const body = document.body;
    body.classList.toggle('theme-dark', r.get('theme') === 'dark');
    body.classList.toggle('theme-light', r.get('theme') === 'light');
    body.className = body.className.replace(/accent-\w+/g, '').trim();
    body.classList.add('accent-' + r.get('accent'));

    document.documentElement.style.setProperty('--wallpaper', wallpaperCss(r.get('wallpaper')));
    document.documentElement.style.setProperty('--lock-wallpaper', wallpaperCss(r.get('lock.wallpaper')));
    document.documentElement.style.setProperty('--font', r.get('fontFamily'));
    document.documentElement.style.setProperty('--fontsize', r.get('fontSize') + 'px');
    document.documentElement.style.setProperty('--iconsize', r.get('iconSize') + 'px');
    document.documentElement.style.setProperty('--blur', r.get('blur.amount') + 'px');
    document.documentElement.style.setProperty('--animspeed', r.get('animationSpeed'));
    document.documentElement.style.setProperty('--brightness', (r.get('display.brightness') / 100));

    body.classList.toggle('no-anim', !r.get('animations') || r.get('reduceMotion'));
    body.classList.toggle('high-contrast', !!r.get('highContrast'));
    body.classList.remove('density-compact','density-roomy');
    if (r.get('density') === 'compact') body.classList.add('density-compact');
    if (r.get('density') === 'roomy') body.classList.add('density-roomy');
    body.classList.toggle('taskbar-top', r.get('taskbar.position') === 'top');
    body.classList.toggle('taskbar-small', r.get('taskbar.size') === 'small');
    body.classList.toggle('start-left', r.get('taskbar.alignment') === 'left');

    // Color filter
    const f = r.get('colorFilter');
    document.getElementById('wallpaper').style.filter =
      `brightness(${r.get('display.brightness')/100})` +
      (f === 'grayscale' ? ' grayscale(1)' : f === 'invert' ? ' invert(1)' : f === 'sepia' ? ' sepia(0.7)' : '');

    // Night light overlay
    let nl = document.getElementById('nightLight');
    if (!nl) { nl = document.createElement('div'); nl.id='nightLight'; nl.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9998;'; document.body.appendChild(nl); }
    nl.style.background = r.get('display.nightLight') ? `rgba(255,160,30,${r.get('display.nightLightStrength')/250})` : 'transparent';

    // Cursor size
    document.documentElement.style.cursor = r.get('cursorSize') > 1 ? `default` : 'default';

    // Visibility of taskbar elements
    $('#searchBtn').style.display = r.get('taskbar.showSearch') ? '' : 'none';
    $('#taskViewBtn').style.display = r.get('taskbar.showTaskView') ? '' : 'none';
    $('#clockBtn').style.display = r.get('taskbar.showClock') ? '' : 'none';

    // Desktop icons toggle
    $('#desktopIcons').style.display = r.get('desktopIcons') ? '' : 'none';
  }
  Registry.on('*', applyTheme);

  // ===== Desktop icons =====
  function renderDesktopIcons() {
    const host = $('#desktopIcons'); host.innerHTML = '';
    const pinned = Apps.list().filter(a => a.pinned).slice(0, 8);
    pinned.forEach(a => {
      const el = document.createElement('div');
      el.className = 'desk-icon';
      el.innerHTML = `<div class="ic">${a.icon}</div><div class="lbl">${a.name}</div>`;
      el.style.setProperty('width', `var(--iconsize, 88px)`);
      el.ondblclick = () => Apps.launch(a.id);
      el.onclick = e => { $$('.desk-icon').forEach(o=>o.classList.remove('selected')); el.classList.add('selected'); };
      host.appendChild(el);
    });
  }

  // ===== Start menu =====
  function renderStartMenu() {
    const pinnedHost = $('#smPinned'); const grid = $('#smGrid');
    pinnedHost.innerHTML = ''; grid.innerHTML = '';
    pinnedHost.style.gridTemplateColumns = `repeat(${Registry.get('start.gridCols')}, 1fr)`;
    grid.style.gridTemplateColumns = `repeat(${Registry.get('start.gridCols')}, 1fr)`;

    Apps.list().filter(a=>a.pinned).forEach(a => pinnedHost.appendChild(smTile(a)));
    Apps.list().forEach(a => grid.appendChild(smTile(a)));
  }
  function smTile(a) {
    const el = document.createElement('div');
    el.className = 'sm-app';
    el.innerHTML = `<div class="ic">${a.icon}</div><div>${a.name}</div>`;
    el.onclick = () => { closeMenus(); Apps.launch(a.id); };
    return el;
  }
  function toggleStart() {
    const m = $('#startMenu'); const isHidden = m.classList.contains('hidden');
    closeMenus();
    if (isHidden) {
      m.classList.remove('hidden');
      $('#startBtn').classList.add('active');
      setTimeout(() => $('#startSearch').focus(), 30);
    }
  }
  $('#startBtn').onclick = e => { e.stopPropagation(); toggleStart(); };
  $('#startSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    $$('#smGrid .sm-app').forEach(el => el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none');
  });
  $('#startSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('#smGrid .sm-app:not([style*="display: none"])');
      if (first) first.click();
    }
  });
  $('#smSettings').onclick = () => { closeMenus(); Apps.launch('settings'); };
  $('#smPower').onclick = e => { e.stopPropagation(); $('#powerMenu').classList.toggle('hidden'); };
  $('#smUser').onclick = () => { closeMenus(); Apps.launch('settings', { section: 'Accounts' }); };
  $$('#powerMenu button').forEach(b => b.onclick = () => {
    const a = b.dataset.power;
    if (a === 'lock') return showLock();
    if (a === 'shutdown') return shutdown();
    if (a === 'restart') return location.reload();
    if (a === 'sleep') return showLock();
  });

  // ===== Action center =====
  function renderQuick() {
    const q = $('#acQuick'); q.innerHTML = '';
    const tiles = [
      { id:'wifi', label:'Wi-Fi', icon:'📶', key:'devices.bluetooth' === 'no' ? '': '' },
      { id:'bt', label:'Bluetooth', icon:'🔵', key:'devices.bluetooth' },
      { id:'dnd', label:'Do not disturb', icon:'🔕', key:'notifications.dnd' },
      { id:'night', label:'Night light', icon:'🌙', key:'display.nightLight' },
      { id:'theme', label:'Theme', icon:'🌗', action:() => Registry.set('theme', Registry.get('theme')==='dark'?'light':'dark') },
      { id:'mute', label:'Mute', icon:'🔇', key:'sound.mute' },
      { id:'game', label:'Game mode', icon:'🎮', key:'gaming.mode' },
      { id:'fps', label:'FPS', icon:'📈', key:'gaming.fps' },
    ];
    tiles.forEach(t => {
      const el = document.createElement('div'); el.className='ac-q';
      el.innerHTML = `<span class="ic">${t.icon}</span><span>${t.label}</span>`;
      const isOn = t.key ? !!Registry.get(t.key) : false;
      if (isOn) el.classList.add('on');
      el.onclick = () => { if (t.action) t.action(); else Registry.set(t.key, !Registry.get(t.key)); renderQuick(); };
      q.appendChild(el);
    });
  }
  $('#acBrightness').oninput = e => Registry.set('display.brightness', +e.target.value);
  $('#acVolume').oninput = e => Registry.set('sound.master', +e.target.value);
  $('#actionCenterBtn').onclick = e => { e.stopPropagation(); const ac = $('#actionCenter'); closeMenus(); ac.classList.toggle('hidden'); if (!ac.classList.contains('hidden')) renderQuick(); };

  // ===== Show desktop / minimize all =====
  $('#showDesktopBtn').onclick = () => WM.minimizeAll();
  $('#taskViewBtn').onclick = () => Apps.launch('taskman');
  $('#searchBtn').onclick = () => Apps.launch('search');
  $('#trayProxy').onclick = () => Apps.launch('console');
  $('#clockBtn').onclick = () => Apps.launch('calendar');

  // ===== Clock =====
  function tickClock() {
    const t = $('#tbTime'), d = $('#tbDate');
    const n = new Date();
    const fmt = Registry.get('system.timeFormat') === '12'
      ? n.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })
      : n.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false });
    if (t) t.textContent = fmt;
    if (d) d.textContent = n.toLocaleDateString();
    const lt = $('#lockTime'), ld = $('#lockDate');
    if (lt) lt.textContent = fmt;
    if (ld) ld.textContent = n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  }
  setInterval(tickClock, 1000); tickClock();

  // ===== Context menu =====
  function showContext(e, items) {
    e.preventDefault();
    const m = $('#contextMenu'); m.innerHTML = ''; m.classList.remove('hidden');
    items.forEach(it => {
      if (it === '-') { const s=document.createElement('div'); s.className='sep'; m.appendChild(s); return; }
      const d = document.createElement('div'); d.className='item'; d.textContent = it.label;
      d.onclick = () => { closeMenus(); it.action && it.action(); };
      m.appendChild(d);
    });
    const r = m.getBoundingClientRect();
    let x = e.clientX, y = e.clientY;
    if (x + r.width > innerWidth) x = innerWidth - r.width - 4;
    if (y + r.height > innerHeight) y = innerHeight - r.height - 4;
    m.style.left = x+'px'; m.style.top = y+'px';
  }
  document.addEventListener('contextmenu', e => {
    if (e.target.closest('.win-body')) return; // app handles
    if (e.target.closest('input,textarea')) return;
    showContext(e, [
      { label:'🖥 Refresh', action:() => { renderDesktopIcons(); renderStartMenu(); } },
      '-',
      { label:'🎨 Personalize', action:() => Apps.launch('settings', { section:'Personalization' }) },
      { label:'⚙ Settings',   action:() => Apps.launch('settings') },
      { label:'📁 Open File Explorer', action:() => Apps.launch('files') },
      { label:'🟩 Open Terminal',     action:() => Apps.launch('terminal') },
      '-',
      { label:'❔ About KEM-OS',      action:() => Apps.launch('help') },
    ]);
  });

  // ===== Close menus on click outside =====
  function closeMenus() {
    $('#startMenu').classList.add('hidden');
    $('#contextMenu').classList.add('hidden');
    $('#actionCenter').classList.add('hidden');
    $('#powerMenu').classList.add('hidden');
    $('#startBtn').classList.remove('active');
  }
  document.addEventListener('click', e => {
    const inMenu = e.target.closest('#startMenu, #contextMenu, #actionCenter, #powerMenu, #startBtn, #actionCenterBtn');
    if (!inMenu) closeMenus();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenus();
    if (e.key === 'Meta' || (e.ctrlKey && e.key === 'Escape')) { e.preventDefault(); toggleStart(); }
  });

  // ===== Toasts =====
  const toastHost = $('#toastHost');
  const notifications = [];
  window.OS = {
    contextMenu: showContext,
    toast(title, body) {
      if (!Registry.get('notifications.enabled') || Registry.get('notifications.dnd')) return;
      const t = document.createElement('div'); t.className='toast';
      t.innerHTML = `<div class="t-title">${title}</div><div class="t-body">${body||''}</div>`;
      toastHost.appendChild(t);
      notifications.unshift({ title, body, at: new Date() });
      renderNotifList();
      setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(40px)'; t.style.transition='0.2s'; setTimeout(()=>t.remove(),220); }, 4200);
    },
  };
  function renderNotifList() {
    const list = $('#acNotifList'); if (!list) return;
    list.innerHTML = '';
    notifications.slice(0,8).forEach(n => {
      const e = document.createElement('div'); e.className='ac-notif';
      e.innerHTML = `<b>${n.title}</b><div>${n.body||''}</div><small style="color:var(--text-dim);">${n.at.toLocaleTimeString()}</small>`;
      list.appendChild(e);
    });
  }

  // ===== Lock screen =====
  function showLock() {
    if (!Registry.get('system.fastBoot')) {
      $('#lock').classList.remove('hidden');
    } else {
      $('#lock').classList.remove('hidden');
    }
  }
  function hideLock() { $('#lock').classList.add('hidden'); }
  $('#lock').addEventListener('click', hideLock);
  document.addEventListener('keydown', e => { if (!$('#lock').classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')) hideLock(); });

  function shutdown() {
    document.body.style.transition = 'opacity 0.6s';
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.body.innerHTML = '<div style="position:fixed;inset:0;background:#000;color:#666;display:flex;align-items:center;justify-content:center;font-family:system-ui;">It is now safe to close this tab.</div>';
      document.body.style.opacity = '1';
    }, 600);
  }

  // ===== Boot sequence =====
  function boot() {
    applyTheme();
    renderDesktopIcons();
    renderStartMenu();
    renderQuick();
    renderNotifList();

    const fast = Registry.get('system.fastBoot');
    const showBoot = Registry.get('system.startupBoot') && !fast;

    setTimeout(() => {
      $('#boot').classList.add('hidden');
      $('#desktop').classList.remove('hidden');
      if (!fast) showLock();
      // Run startup apps
      const list = (Registry.get('apps.startup') || '').toString();
      list.split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
        try { Apps.launch(id); } catch (e) {}
      });
      OS.toast('Welcome', `Hello, ${Registry.get('account.name') || Registry.get('system.user')} — ${Apps.list().length} apps ready.`);
      // Best-effort proxy SW registration if user already configured a bare URL
      if (Registry.get('proxy.bareUrl') && Proxy.isSupported()) {
        Proxy.ensureSW().catch(()=>{});
      }
    }, showBoot ? 1100 : 50);
  }

  // Listeners that change the world live
  Registry.on('wallpaper', applyTheme);
  Registry.on('start.gridCols', renderStartMenu);
  Registry.on('desktopIcons', renderDesktopIcons);
  Registry.on('iconSize', renderDesktopIcons);

  // Refresh start grid when apps could be added later
  setTimeout(renderStartMenu, 0);

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
