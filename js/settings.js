// Settings app: 100+ rows organized into sections, all wired to Registry.
(function () {
  // Each row: { key, name, desc, type, opts? }
  // type: 'toggle' | 'select' | 'range' | 'text' | 'color' | 'button' | 'number'

  const sections = {
    'Personalization': [
      { key:'theme', name:'Theme', desc:'Dark or light', type:'select', opts:['dark','light'] },
      { key:'accent', name:'Accent color', desc:'Primary accent', type:'select', opts:['blue','purple','green','red','orange','pink','teal','yellow'] },
      { key:'wallpaper', name:'Wallpaper', desc:'preset:aurora · preset:nightcity · preset:mountains · preset:abstract · preset:plain · or any URL', type:'text' },
      { key:'lock.wallpaper', name:'Lock-screen wallpaper', desc:'Same options as wallpaper', type:'text' },
      { key:'animations', name:'Animations', desc:'Enable window/menu animations', type:'toggle' },
      { key:'animationSpeed', name:'Animation speed', desc:'0.25 = fast, 2 = slow', type:'range', opts:[0.25,2,0.05] },
      { key:'transparency', name:'Transparency / blur', desc:'Acrylic-style background blur', type:'toggle' },
      { key:'blur.amount', name:'Blur amount', desc:'pixels', type:'range', opts:[0,40,1] },
      { key:'shadows', name:'Window shadows', desc:'', type:'toggle' },
      { key:'fontFamily', name:'Font family', desc:'CSS font-family', type:'text' },
      { key:'fontSize', name:'UI font size', desc:'pixels', type:'range', opts:[11,18,1] },
      { key:'iconSize', name:'Desktop icon size', desc:'pixels', type:'range', opts:[40,96,4] },
      { key:'density', name:'UI density', desc:'compact / normal / roomy', type:'select', opts:['compact','normal','roomy'] },
      { key:'highContrast', name:'High contrast', desc:'Maximum contrast theme', type:'toggle' },
      { key:'colorFilter', name:'Color filter', desc:'Display-wide CSS filter', type:'select', opts:['none','grayscale','invert','sepia'] },
      { key:'cursorSize', name:'Cursor size', desc:'multiplier', type:'range', opts:[1,3,0.25] },
      { key:'reduceMotion', name:'Reduce motion', desc:'Respects prefers-reduced-motion', type:'toggle' },
      { key:'desktopIcons', name:'Show desktop icons', desc:'', type:'toggle' },
    ],
    'Taskbar & Start': [
      { key:'taskbar.position', name:'Taskbar position', desc:'top or bottom', type:'select', opts:['bottom','top'] },
      { key:'taskbar.size', name:'Taskbar size', desc:'', type:'select', opts:['small','normal'] },
      { key:'taskbar.alignment', name:'Start alignment', desc:'left / center', type:'select', opts:['center','left'] },
      { key:'taskbar.showSearch', name:'Show search button', desc:'', type:'toggle' },
      { key:'taskbar.showTaskView', name:'Show task view', desc:'', type:'toggle' },
      { key:'taskbar.showClock', name:'Show clock', desc:'', type:'toggle' },
      { key:'taskbar.showWeather', name:'Show weather', desc:'', type:'toggle' },
      { key:'taskbar.autohide', name:'Auto-hide taskbar', desc:'', type:'toggle' },
      { key:'taskbar.combine', name:'Combine app buttons', desc:'Hide window labels in taskbar', type:'toggle' },
      { key:'taskbar.badges', name:'Show badges', desc:'', type:'toggle' },
      { key:'start.showRecent', name:'Recent items in Start', desc:'', type:'toggle' },
      { key:'start.showRecommended', name:'Recommended apps in Start', desc:'', type:'toggle' },
      { key:'start.fullscreen', name:'Fullscreen Start', desc:'', type:'toggle' },
      { key:'start.gridCols', name:'Start grid columns', desc:'', type:'range', opts:[4,8,1] },
    ],
    'System': [
      { key:'system.hostname', name:'Device name', desc:'Used in terminal & welcome', type:'text' },
      { key:'system.user', name:'User name', desc:'', type:'text' },
      { key:'system.language', name:'Language tag', desc:'IETF tag, e.g. en-US', type:'text' },
      { key:'system.timezone', name:'Timezone', desc:'auto or IANA tz', type:'text' },
      { key:'system.timeFormat', name:'Time format', desc:'12 or 24 hour', type:'select', opts:['12','24'] },
      { key:'system.dateFormat', name:'Date format', desc:'token-style', type:'select', opts:['YYYY-MM-DD','MM/DD/YYYY','DD/MM/YYYY','D MMM YYYY'] },
      { key:'system.firstDay', name:'First day of week', desc:'', type:'select', opts:['monday','sunday'] },
      { key:'system.startupBoot', name:'Show boot animation', desc:'', type:'toggle' },
      { key:'system.fastBoot', name:'Fast boot', desc:'Skip lock & boot delay', type:'toggle' },
      { key:'system.tooltips', name:'Tooltips', desc:'', type:'toggle' },
      { key:'system.snap', name:'Window snapping', desc:'', type:'toggle' },
      { key:'system.snapAssist', name:'Snap assist', desc:'', type:'toggle' },
      { key:'system.shake', name:'Shake to minimize', desc:'', type:'toggle' },
      { key:'system.peek', name:'Aero Peek', desc:'', type:'toggle' },
      { key:'system.scrollInactive', name:'Scroll inactive windows', desc:'', type:'toggle' },
    ],
    'Sound': [
      { key:'sound.master', name:'Master volume', desc:'', type:'range', opts:[0,100,1] },
      { key:'sound.startup', name:'Startup sound', desc:'', type:'toggle' },
      { key:'sound.notifications', name:'Notification sounds', desc:'', type:'toggle' },
      { key:'sound.clicks', name:'Click sounds', desc:'', type:'toggle' },
      { key:'sound.mute', name:'Mute system', desc:'', type:'toggle' },
    ],
    'Display': [
      { key:'display.brightness', name:'Brightness', desc:'', type:'range', opts:[40,100,1] },
      { key:'display.nightLight', name:'Night light', desc:'Warm tint', type:'toggle' },
      { key:'display.nightLightStrength', name:'Night light strength', desc:'', type:'range', opts:[0,100,1] },
      { key:'display.scale', name:'UI scale (%)', desc:'', type:'range', opts:[80,150,5] },
      { key:'display.refresh', name:'Refresh rate (Hz)', desc:'cosmetic', type:'range', opts:[30,165,5] },
    ],
    'Notifications': [
      { key:'notifications.enabled', name:'Enable notifications', desc:'', type:'toggle' },
      { key:'notifications.banners', name:'Show banners', desc:'', type:'toggle' },
      { key:'notifications.sound', name:'Play sound', desc:'', type:'toggle' },
      { key:'notifications.dnd', name:'Do not disturb', desc:'', type:'toggle' },
      { key:'notifications.lock', name:'Show on lock screen', desc:'', type:'toggle' },
    ],
    'Privacy': [
      { key:'privacy.telemetry', name:'Telemetry', desc:'(off — there is none)', type:'toggle' },
      { key:'privacy.location', name:'Location services', desc:'', type:'toggle' },
      { key:'privacy.camera', name:'Camera access', desc:'', type:'toggle' },
      { key:'privacy.microphone', name:'Microphone access', desc:'', type:'toggle' },
      { key:'privacy.history', name:'Activity history', desc:'', type:'toggle' },
      { key:'privacy.searchHistory', name:'Search history', desc:'', type:'toggle' },
      { key:'privacy.clipboardSync', name:'Clipboard sync', desc:'', type:'toggle' },
    ],
    'Updates': [
      { key:'updates.auto', name:'Auto-install', desc:'', type:'toggle' },
      { key:'updates.channel', name:'Channel', desc:'', type:'select', opts:['stable','beta','dev'] },
      { key:'updates.notify', name:'Notify on update', desc:'', type:'toggle' },
      { key:'updates.metered', name:'Pause on metered connection', desc:'', type:'toggle' },
      { key:'updates.lastChecked', name:'Last checked (epoch)', desc:'read-only', type:'number' },
    ],
    'Power': [
      { key:'power.plan', name:'Power plan', desc:'', type:'select', opts:['saver','balanced','performance'] },
      { key:'power.sleepMin', name:'Sleep after (min)', desc:'', type:'number' },
      { key:'power.dimMin', name:'Dim after (min)', desc:'', type:'number' },
      { key:'power.lidClose', name:'On lid close', desc:'', type:'select', opts:['nothing','sleep','shutdown'] },
    ],
    'Accounts': [
      { key:'account.name', name:'Display name', desc:'', type:'text' },
      { key:'account.email', name:'Email', desc:'', type:'text' },
      { key:'account.avatar', name:'Avatar emoji', desc:'', type:'text' },
      { key:'account.passwordless', name:'Passwordless lock', desc:'', type:'toggle' },
    ],
    'Network': [
      { key:'proxy.bareUrl', name:'Bare server URL', desc:'TitaniumNetwork bare server (Node) for Ultraviolet, e.g. https://bare.example.com/', type:'text' },
      { key:'proxy.bareApi', name:'Service path', desc:'Default /uv/service/', type:'text' },
      { key:'proxy.encoding', name:'URL encoding', desc:'How proxied URLs are encoded', type:'select', opts:['xor','base64','plain'] },
      { key:'proxy.searchEngine', name:'Search engine URL', desc:'Use %s for the query token', type:'text' },
      { key:'proxy.homepage', name:'Browser homepage', desc:'', type:'text' },
      { key:'proxy.adblock', name:'Ad-block (cosmetic)', desc:'', type:'toggle' },
      { key:'proxy.killCookies', name:'Block cookies on proxied sites', desc:'', type:'toggle' },
      { key:'proxy.spoofUA', name:'Spoof User-Agent', desc:'', type:'toggle' },
      { key:'proxy.userAgent', name:'User-Agent override', desc:'', type:'text' },
      { key:'proxy.openExternal', name:'Open links externally', desc:'Bypass the proxy', type:'toggle' },
      { key:'__proxy.register', name:'Register / refresh service worker', desc:'Activates Ultraviolet', type:'button', opts:async()=>{ try { await Proxy.ensureSW(); OS.toast('Proxy','Service worker registered'); } catch(e){ OS.toast('Proxy', e.message); } } },
    ],
    'Apps': [
      { key:'apps.defaultBrowser', name:'Default browser app', desc:'', type:'select', opts:['browser'] },
      { key:'apps.defaultEditor', name:'Default text editor', desc:'', type:'select', opts:['notepad','code','markdown'] },
      { key:'apps.defaultMusic', name:'Default music player', desc:'', type:'select', opts:['music'] },
      { key:'apps.defaultImage', name:'Default image viewer', desc:'', type:'select', opts:['imageviewer'] },
      { key:'apps.startup', name:'Apps to start on boot', desc:'comma-separated app ids', type:'text' },
    ],
    'Gaming': [
      { key:'gaming.fps', name:'Show FPS overlay', desc:'', type:'toggle' },
      { key:'gaming.bar', name:'Game Bar', desc:'', type:'toggle' },
      { key:'gaming.mode', name:'Game mode', desc:'', type:'toggle' },
    ],
    'Devices': [
      { key:'devices.bluetooth', name:'Bluetooth', desc:'', type:'toggle' },
      { key:'devices.printer', name:'Default printer', desc:'', type:'text' },
      { key:'devices.mouseSpeed', name:'Mouse speed', desc:'', type:'range', opts:[1,10,1] },
      { key:'devices.touchpad', name:'Touchpad', desc:'', type:'toggle' },
      { key:'devices.naturalScroll', name:'Natural scroll', desc:'', type:'toggle' },
    ],
    'Accessibility': [
      { key:'a11y.screenReader', name:'Screen reader hints', desc:'', type:'toggle' },
      { key:'a11y.magnifier', name:'Magnifier', desc:'', type:'toggle' },
      { key:'a11y.stickyKeys', name:'Sticky keys', desc:'', type:'toggle' },
      { key:'a11y.captions', name:'Live captions', desc:'', type:'toggle' },
      { key:'a11y.largeText', name:'Large text', desc:'', type:'toggle' },
    ],
    'Search & Storage': [
      { key:'search.web', name:'Web search results', desc:'In Search app', type:'toggle' },
      { key:'search.indexFiles', name:'Index files', desc:'', type:'toggle' },
      { key:'clipboard.history', name:'Clipboard history', desc:'', type:'toggle' },
      { key:'storage.sense', name:'Storage sense', desc:'', type:'toggle' },
    ],
    'Lock screen': [
      { key:'lock.showClock', name:'Show clock on lock', desc:'', type:'toggle' },
      { key:'lock.showWeather', name:'Show weather on lock', desc:'', type:'toggle' },
      { key:'lock.tips', name:'Show tips & tricks', desc:'', type:'toggle' },
    ],
    'Backup & Reset': [
      { key:'__export', name:'Export settings', desc:'Copy JSON', type:'button', opts:()=>{ const j = Registry.export(); navigator.clipboard?.writeText(j); OS.toast('Settings','Copied JSON to clipboard'); }},
      { key:'__import', name:'Import settings', desc:'Paste JSON', type:'button', opts:()=>{ const j = prompt('Paste JSON'); if (j) Registry.import(j); }},
      { key:'__reset',  name:'Reset all settings', desc:'Restore defaults & reload', type:'button', opts:()=>{ if (confirm('Reset all settings?')) Registry.reset(); }},
      { key:'__clearfs', name:'Reset filesystem', desc:'Recreate Documents/etc.', type:'button', opts:()=>{ if (confirm('Reset filesystem?')) { FS.reset(); OS.toast('FS','Reset done'); } }},
    ],
  };

  function row(spec) {
    const wrap = document.createElement('div');
    wrap.className = 'settings-row';
    wrap.innerHTML = `<div class="meta"><div class="name">${spec.name}</div><div class="desc">${spec.desc||''}</div></div>`;
    const ctrl = document.createElement('div');
    const v = Registry.get(spec.key);
    if (spec.type === 'toggle') {
      const lbl = document.createElement('label'); lbl.className='switch';
      const inp = document.createElement('input'); inp.type='checkbox'; inp.checked = !!v;
      const sl = document.createElement('span'); sl.className='slider';
      inp.onchange = () => Registry.set(spec.key, inp.checked);
      lbl.appendChild(inp); lbl.appendChild(sl); ctrl.appendChild(lbl);
    } else if (spec.type === 'select') {
      const sel = document.createElement('select'); sel.className='select';
      spec.opts.forEach(o => { const op=document.createElement('option'); op.value=o; op.textContent=o; if (String(o)===String(v)) op.selected=true; sel.appendChild(op); });
      sel.onchange = () => Registry.set(spec.key, sel.value);
      ctrl.appendChild(sel);
    } else if (spec.type === 'range') {
      const inp = document.createElement('input'); inp.type='range';
      const [min,max,step] = spec.opts; inp.min=min; inp.max=max; inp.step=step; inp.value = v ?? min;
      const lbl = document.createElement('span'); lbl.style.marginLeft='8px'; lbl.textContent = inp.value;
      inp.oninput = () => { lbl.textContent = inp.value; Registry.set(spec.key, parseFloat(inp.value)); };
      const w = document.createElement('div'); w.appendChild(inp); w.appendChild(lbl);
      ctrl.appendChild(w);
    } else if (spec.type === 'text') {
      const inp = document.createElement('input'); inp.type='text'; inp.className='input'; inp.value = v ?? '';
      inp.onchange = () => Registry.set(spec.key, inp.value);
      ctrl.appendChild(inp);
    } else if (spec.type === 'number') {
      const inp = document.createElement('input'); inp.type='number'; inp.className='input'; inp.value = v ?? 0;
      inp.onchange = () => Registry.set(spec.key, parseFloat(inp.value)||0);
      ctrl.appendChild(inp);
    } else if (spec.type === 'button') {
      const b = document.createElement('button'); b.className='btn'; b.textContent='Run';
      b.onclick = () => spec.opts && spec.opts();
      ctrl.appendChild(b);
    }
    wrap.appendChild(ctrl);
    return wrap;
  }

  function open(args = {}) {
    WM.open({
      appId: 'settings', title: 'Settings', icon:'⚙', width: 920, height: 600, singleton:true,
      render(body) {
        body.classList.add('settings-app');
        const nav = document.createElement('div'); nav.className='nav';
        const pane = document.createElement('div'); pane.className='pane';
        body.appendChild(nav); body.appendChild(pane);

        // search at top
        const search = document.createElement('input');
        search.className='input'; search.placeholder='Find a setting…';
        search.style.margin='6px 6px 10px';
        nav.appendChild(search);

        const navBtns = {};
        Object.keys(sections).forEach((sec, idx) => {
          const b = document.createElement('button'); b.textContent = sec;
          b.onclick = () => show(sec); navBtns[sec] = b;
          nav.appendChild(b);
        });

        function show(sec) {
          Object.values(navBtns).forEach(b => b.classList.toggle('active', b.textContent === sec));
          pane.innerHTML = '';
          const h2 = document.createElement('h2'); h2.textContent = sec; pane.appendChild(h2);
          sections[sec].forEach(s => pane.appendChild(row(s)));
        }
        search.oninput = () => {
          const q = search.value.toLowerCase().trim();
          if (!q) { show(Object.keys(sections)[0]); return; }
          pane.innerHTML = '';
          const h2 = document.createElement('h2'); h2.textContent = 'Search: '+q; pane.appendChild(h2);
          Object.entries(sections).forEach(([sec, list]) => {
            list.filter(s => s.name.toLowerCase().includes(q) || (s.desc||'').toLowerCase().includes(q) || s.key.toLowerCase().includes(q))
              .forEach(s => { const r = row(s); pane.appendChild(r); });
          });
        };

        const initial = (args.section && sections[args.section]) ? args.section : Object.keys(sections)[0];
        show(initial);

        // Counter footer
        const total = Object.values(sections).reduce((a,b)=>a+b.length,0);
        const f = document.createElement('div');
        f.style.cssText = 'position:absolute;bottom:8px;left:14px;color:var(--text-dim);font-size:12px;';
        f.textContent = total + ' settings & tweaks';
        body.appendChild(f);
      }
    });
  }

  window.Settings = { open, sections };
})();
