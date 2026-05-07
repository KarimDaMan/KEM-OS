// 40 apps. Each app: { id, name, icon, category, pinned, launch(args) }.
(function () {
  const APPS = [];
  const byId = {};
  function reg(app) { APPS.push(app); byId[app.id] = app; }

  // --- helpers ----
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'style' && typeof attrs[k] === 'object') Object.assign(el.style, attrs[k]);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  };

  // ============ 1. File Explorer ============
  reg({
    id: 'files', name: 'File Explorer', icon: '📁', category: 'System', pinned: true,
    launch() {
      WM.open({
        appId: 'files', title: 'File Explorer', icon: '📁', width: 820, height: 540,
        render(body) {
          let cwd = '/';
          body.classList.add('fx');
          body.innerHTML = `
            <div class="side">
              <div class="item" data-p="/">🏠 Home</div>
              <div class="item" data-p="/Desktop">🖥 Desktop</div>
              <div class="item" data-p="/Documents">📄 Documents</div>
              <div class="item" data-p="/Downloads">⬇ Downloads</div>
              <div class="item" data-p="/Pictures">🖼 Pictures</div>
              <div class="item" data-p="/Music">🎵 Music</div>
              <div class="item" data-p="/Videos">🎬 Videos</div>
              <hr/>
              <button class="btn ghost" id="newFolder" style="width:100%;margin-top:6px;">+ New folder</button>
              <button class="btn ghost" id="newFile"   style="width:100%;margin-top:6px;">+ New file</button>
            </div>
            <div class="main">
              <div class="crumbs" id="crumbs"></div>
              <div class="grid" id="grid"></div>
            </div>`;
          const grid = body.querySelector('#grid');
          const crumbs = body.querySelector('#crumbs');
          function render() {
            crumbs.textContent = cwd;
            const items = FS.list(cwd);
            grid.innerHTML = '';
            if (cwd !== '/') {
              const up = h('div', { class: 'file', onclick: () => { cwd = FS.parent(cwd); render(); } },
                h('div', { class: 'ic' }, '⬆'), h('div', { class: 'nm' }, '..'));
              grid.appendChild(up);
            }
            items.forEach(it => {
              const isDir = it.type === 'dir';
              const ic = isDir ? '📁' : guessIcon(it.name);
              const f = h('div', {
                class: 'file',
                ondblclick: () => isDir ? (cwd = it.path, render()) : openFile(it.path),
                oncontextmenu: e => {
                  e.preventDefault();
                  OS.contextMenu(e, [
                    { label: 'Open', action: () => isDir ? (cwd = it.path, render()) : openFile(it.path) },
                    { label: 'Rename', action: () => {
                      const nn = prompt('New name', it.name); if (!nn) return;
                      FS.rename(it.path, FS.parent(it.path) + '/' + nn);
                      render();
                    } },
                    { label: 'Delete', action: () => { if (confirm('Delete ' + it.name + '?')) { FS.remove(it.path); render(); } } },
                  ]);
                }
              }, h('div', { class: 'ic' }, ic), h('div', { class: 'nm' }, it.name));
              grid.appendChild(f);
            });
          }
          function guessIcon(n) {
            const x = n.toLowerCase();
            if (/\.(png|jpe?g|gif|webp|svg)$/.test(x)) return '🖼';
            if (/\.(mp3|wav|ogg|flac)$/.test(x)) return '🎵';
            if (/\.(mp4|mkv|webm|mov)$/.test(x)) return '🎬';
            if (/\.(md|markdown)$/.test(x)) return '📝';
            if (/\.(html?|js|css|json|ts|py)$/.test(x)) return '📜';
            return '📄';
          }
          function openFile(p) {
            const x = p.toLowerCase();
            if (/\.(md|markdown)$/.test(x)) Apps.launch('markdown', { path: p });
            else if (/\.(png|jpe?g|gif|webp|svg)$/.test(x)) Apps.launch('imageviewer', { path: p });
            else if (/\.(mp3|wav|ogg|flac)$/.test(x)) Apps.launch('music', { path: p });
            else if (/\.(html?|js|css|json|ts|py)$/.test(x)) Apps.launch('code', { path: p });
            else Apps.launch('notepad', { path: p });
          }
          body.querySelectorAll('.side .item').forEach(it => {
            it.onclick = () => { cwd = it.dataset.p; render(); };
          });
          body.querySelector('#newFolder').onclick = () => {
            const n = prompt('Folder name'); if (!n) return;
            FS.mkdir((cwd === '/' ? '' : cwd) + '/' + n); render();
          };
          body.querySelector('#newFile').onclick = () => {
            const n = prompt('File name', 'untitled.txt'); if (!n) return;
            FS.write((cwd === '/' ? '' : cwd) + '/' + n, ''); render();
          };
          render();
        }
      });
    }
  });

  // ============ 2. Browser (Ultraviolet) ============
  reg({
    id: 'browser', name: 'Browser', icon: '🌐', category: 'Internet', pinned: true,
    launch(args = {}) {
      WM.open({
        appId: 'browser', title: 'Browser', icon: '🌐', width: 1000, height: 640,
        render(body, ctx) {
          body.classList.add('browser');
          body.innerHTML = `
            <div class="b-bar">
              <button class="btn ghost" id="back">←</button>
              <button class="btn ghost" id="fwd">→</button>
              <button class="btn ghost" id="reload">⟳</button>
              <button class="btn ghost" id="home">🏠</button>
              <input class="input" id="addr" placeholder="Search or paste a URL…" />
              <button class="btn" id="go">Go</button>
              <button class="btn ghost" id="newtab">+ Tab</button>
            </div>
            <iframe id="frame" sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"></iframe>`;
          const frame = body.querySelector('#frame');
          const addr = body.querySelector('#addr');
          async function go(target) {
            const q = target ?? addr.value.trim();
            if (!q && !target) return;
            try {
              const url = await Proxy.navigate(q);
              frame.src = url;
              addr.value = q;
              ctx.title('Browser — ' + q.slice(0, 60));
            } catch (e) {
              frame.removeAttribute('src');
              frame.srcdoc = `<body style="font-family:system-ui;padding:24px;background:#181820;color:#eee;">
                <h2>Proxy not configured</h2>
                <p>${e.message}</p>
                <p>Open <b>Settings → Network</b> and paste a bare server URL (e.g. one running TitaniumNetwork's bare-server-node).</p>
              </body>`;
            }
          }
          body.querySelector('#go').onclick = () => go();
          body.querySelector('#home').onclick = () => go(Registry.get('proxy.homepage'));
          body.querySelector('#reload').onclick = () => frame.contentWindow?.location.reload();
          body.querySelector('#back').onclick = () => { try { frame.contentWindow.history.back(); } catch (e) {} };
          body.querySelector('#fwd').onclick = () => { try { frame.contentWindow.history.forward(); } catch (e) {} };
          body.querySelector('#newtab').onclick = () => Apps.launch('browser');
          addr.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
          if (args && args.url) { addr.value = args.url; go(args.url); }
          else if (Proxy.bareConfigured()) go(Registry.get('proxy.homepage'));
          else {
            frame.srcdoc = `<body style="font-family:system-ui;padding:30px;background:#181820;color:#ddd;">
              <h2>Welcome to KEM Browser</h2>
              <p>Powered by <b>Ultraviolet</b>. To start surfing, configure a bare-server URL in
              <b>Settings → Network → Proxy</b>.</p>
              <p>You can use any TN-compatible bare server, e.g. <code>https://your-bare.example.com/</code>.</p>
            </body>`;
          }
        }
      });
    }
  });

  // ============ 3. Notepad ============
  reg({
    id: 'notepad', name: 'Notepad', icon: '📝', category: 'Productivity', pinned: true,
    launch(args = {}) {
      WM.open({
        appId: 'notepad', title: 'Notepad', icon: '📝', width: 600, height: 460,
        render(body, ctx) {
          body.classList.add('editor');
          body.innerHTML = `
            <div class="toolbar">
              <button class="btn ghost" id="open">Open</button>
              <button class="btn ghost" id="saveAs">Save As</button>
              <button class="btn ghost" id="save">Save</button>
              <span style="margin-left:auto;color:var(--text-dim);font-size:12px;" id="path"></span>
            </div>
            <textarea spellcheck="false"></textarea>`;
          const ta = body.querySelector('textarea');
          const lbl = body.querySelector('#path');
          let path = args.path || null;
          if (path) { ta.value = FS.read(path) || ''; lbl.textContent = path; ctx.title('Notepad — ' + path); }
          body.querySelector('#save').onclick = () => {
            if (!path) path = prompt('Save as path:', '/Documents/note.txt');
            if (!path) return;
            FS.write(path, ta.value); lbl.textContent = path; OS.toast('Saved', path);
          };
          body.querySelector('#saveAs').onclick = () => {
            const p = prompt('Save as:', path || '/Documents/note.txt'); if (!p) return;
            path = p; FS.write(p, ta.value); lbl.textContent = p; OS.toast('Saved', p);
          };
          body.querySelector('#open').onclick = () => {
            const p = prompt('Open path:', '/Documents/welcome.txt'); if (!p) return;
            const c = FS.read(p);
            if (c === null) return alert('Not found');
            ta.value = c; path = p; lbl.textContent = p;
          };
        }
      });
    }
  });

  // ============ 4. Calculator ============
  reg({
    id: 'calculator', name: 'Calculator', icon: '🧮', category: 'Utilities', pinned: true,
    launch() {
      WM.open({
        appId: 'calculator', title: 'Calculator', icon: '🧮', width: 320, height: 460,
        render(body) {
          body.classList.add('calc');
          body.innerHTML = `
            <div class="display"><small id="prev"></small><span id="cur">0</span></div>
            <div class="keys"></div>`;
          const keys = body.querySelector('.keys');
          const cur = body.querySelector('#cur');
          const prev = body.querySelector('#prev');
          const layout = ['C','±','%','÷','7','8','9','×','4','5','6','-','1','2','3','+','0','.','⌫','='];
          let expr = '';
          layout.forEach(k => {
            const b = h('button', { class: ['÷','×','-','+','%','±'].includes(k) ? 'op' : (k === '=' ? 'eq' : '') }, k);
            b.onclick = () => press(k);
            keys.appendChild(b);
          });
          function press(k) {
            if (k === 'C') { expr = ''; prev.textContent = ''; cur.textContent = '0'; return; }
            if (k === '⌫') { expr = expr.slice(0,-1); cur.textContent = expr || '0'; return; }
            if (k === '±') { if (expr) expr = (expr.startsWith('-') ? expr.slice(1) : '-'+expr); cur.textContent = expr || '0'; return; }
            if (k === '=') { try { const e = expr.replace(/×/g,'*').replace(/÷/g,'/'); const v = Function('"use strict";return ('+e+')')(); prev.textContent = expr+' ='; expr = String(v); cur.textContent = expr; } catch(e) { cur.textContent = 'Err'; expr=''; } return; }
            expr += k; cur.textContent = expr;
          }
          body.tabIndex = 0;
          body.addEventListener('keydown', e => {
            const m = { '*':'×','/':'÷' };
            if (/^[0-9.+\-*/%]$/.test(e.key)) press(m[e.key] || e.key);
            else if (e.key === 'Enter' || e.key === '=') press('=');
            else if (e.key === 'Backspace') press('⌫');
            else if (e.key === 'Escape') press('C');
          });
        }
      });
    }
  });

  // ============ 5. Settings (lives in settings.js) ============
  reg({
    id: 'settings', name: 'Settings', icon: '⚙', category: 'System', pinned: true,
    launch(args) { Settings.open(args); }
  });

  // ============ 6. Terminal ============
  reg({
    id: 'terminal', name: 'Terminal', icon: '🟩', category: 'System', pinned: true,
    launch() {
      WM.open({
        appId: 'terminal', title: 'Terminal', icon: '🟩', width: 720, height: 420,
        render(body) {
          body.classList.add('term');
          const out = h('div', { class: 'history' });
          const inputLine = h('div', { class: 'line' });
          const promptSpan = h('span', { class: 'prompt' }, Registry.get('system.user') + '@' + Registry.get('system.hostname') + ':~$ ');
          const input = h('input', { type: 'text', autofocus: 'true' });
          inputLine.appendChild(promptSpan); inputLine.appendChild(input);
          body.appendChild(out); body.appendChild(inputLine);
          function println(s) { const l = h('div', { class: 'line' }, s); out.appendChild(l); body.scrollTop = body.scrollHeight; }
          println('KEM-OS Terminal — type "help" for commands.');
          const cmds = {
            help: () => println('Commands: help, ls [path], cat <file>, echo <text>, clear, date, whoami, uname, settings, open <app>, ps, kill <id>, fortune, neofetch'),
            ls: a => FS.list(a[0] || '/').forEach(x => println(x.name + (x.type==='dir'?'/':''))),
            cat: a => { const c = FS.read(a[0]); println(c == null ? 'no such file' : c); },
            echo: a => println(a.join(' ')),
            clear: () => out.innerHTML = '',
            date: () => println(new Date().toString()),
            whoami: () => println(Registry.get('system.user')),
            uname: () => println('KEM-OS 1.0 (web)'),
            settings: () => Apps.launch('settings'),
            open: a => Apps.launch(a[0]),
            ps: () => WM.list().forEach(w => println(w.id + ' ' + (w.appId || '?') + ' — ' + w.title)),
            kill: a => WM.close(a[0]),
            fortune: () => println(['Stay curious.','RTFM.','You miss 100% of the shots you don\'t take.','Ship it!'][Math.floor(Math.random()*4)]),
            neofetch: () => println(`
   ▄▄▄▄▄▄▄▄▄
  ████████████   user@${Registry.get('system.hostname')}
  ████████████   OS: KEM-OS web 1.0
  ████████████   Theme: ${Registry.get('theme')}
  ████████████   Accent: ${Registry.get('accent')}
  ████████████   Apps: ${APPS.length}
   ▀▀▀▀▀▀▀▀▀     Resolution: ${innerWidth}x${innerHeight}`)
          };
          input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            const v = input.value;
            println(promptSpan.textContent + v);
            input.value = '';
            const [cmd, ...args] = v.trim().split(/\s+/);
            if (!cmd) return;
            if (cmds[cmd]) try { cmds[cmd](args); } catch (e) { println('error: ' + e.message); }
            else println(cmd + ': command not found');
          });
          setTimeout(() => input.focus(), 50);
        }
      });
    }
  });

  // ============ 7. Paint ============
  reg({
    id: 'paint', name: 'Paint', icon: '🎨', category: 'Creative',
    launch() {
      WM.open({
        appId: 'paint', title: 'Paint', icon: '🎨', width: 760, height: 520,
        render(body) {
          body.classList.add('paint');
          body.innerHTML = `
            <div class="toolbar">
              <input type="color" id="color" value="#000000"/>
              <input type="range" id="size" min="1" max="40" value="4"/>
              <button class="btn ghost" id="clear">Clear</button>
              <button class="btn ghost" id="save">Save .png</button>
              <select id="tool" class="select" style="width:auto;"><option>Brush</option><option>Eraser</option><option>Line</option><option>Rect</option></select>
            </div>
            <canvas id="cv" width="800" height="480"></canvas>`;
          const cv = body.querySelector('#cv');
          const ctx = cv.getContext('2d');
          ctx.fillStyle = 'white'; ctx.fillRect(0,0,cv.width,cv.height);
          let drawing = false, last = null, sx=0, sy=0, snap=null;
          const color = body.querySelector('#color');
          const size = body.querySelector('#size');
          const tool = body.querySelector('#tool');
          cv.addEventListener('mousedown', e => {
            const r = cv.getBoundingClientRect(); sx = e.clientX-r.left; sy = e.clientY-r.top;
            drawing = true; last = { x: sx, y: sy };
            snap = ctx.getImageData(0,0,cv.width,cv.height);
          });
          cv.addEventListener('mousemove', e => {
            if (!drawing) return;
            const r = cv.getBoundingClientRect(); const x = e.clientX-r.left, y = e.clientY-r.top;
            ctx.lineCap = 'round'; ctx.lineWidth = +size.value;
            ctx.strokeStyle = tool.value === 'Eraser' ? 'white' : color.value;
            if (tool.value === 'Brush' || tool.value === 'Eraser') {
              ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(x,y); ctx.stroke();
              last = { x, y };
            } else if (tool.value === 'Line') {
              ctx.putImageData(snap,0,0); ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(x,y); ctx.stroke();
            } else if (tool.value === 'Rect') {
              ctx.putImageData(snap,0,0); ctx.strokeRect(sx,sy,x-sx,y-sy);
            }
          });
          window.addEventListener('mouseup', () => drawing = false);
          body.querySelector('#clear').onclick = () => { ctx.fillStyle='white'; ctx.fillRect(0,0,cv.width,cv.height); };
          body.querySelector('#save').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL(); a.download='paint.png'; a.click(); };
        }
      });
    }
  });

  // ============ 8. Music Player ============
  reg({
    id: 'music', name: 'Music', icon: '🎵', category: 'Media',
    launch() {
      WM.open({ appId: 'music', title: 'Music Player', icon: '🎵', width: 480, height: 280,
        render(body) {
          body.innerHTML = `
            <div class="pad col">
              <input type="file" id="pick" accept="audio/*" multiple/>
              <audio id="aud" controls style="width:100%;"></audio>
              <div id="list" class="col" style="gap:4px;"></div>
            </div>`;
          const aud = body.querySelector('#aud');
          const list = body.querySelector('#list');
          body.querySelector('#pick').onchange = e => {
            list.innerHTML = '';
            [...e.target.files].forEach((f, i) => {
              const url = URL.createObjectURL(f);
              const row = h('div', { class: 'row' },
                h('button', { class: 'btn ghost', onclick: () => { aud.src = url; aud.play(); } }, '▶'),
                h('span', {}, f.name));
              list.appendChild(row);
              if (i === 0) { aud.src = url; }
            });
          };
        }});
    }
  });

  // ============ 9. Video Player ============
  reg({ id: 'video', name: 'Video', icon: '🎬', category: 'Media',
    launch() { WM.open({ appId:'video', title:'Video', icon:'🎬', width:640, height:480, render(body) {
      body.innerHTML = `<div class="pad col"><input type="file" id="vp" accept="video/*"/><video id="v" controls style="width:100%;background:#000;"></video></div>`;
      body.querySelector('#vp').onchange = e => body.querySelector('#v').src = URL.createObjectURL(e.target.files[0]);
    }}); }});

  // ============ 10. Image Viewer ============
  reg({ id: 'imageviewer', name: 'Photos', icon: '🖼', category: 'Media',
    launch(a={}) { WM.open({ appId:'imageviewer', title:'Photos', icon:'🖼', width:640, height:480, render(body) {
      body.style.background = '#111';
      body.innerHTML = `<div class="pad col" style="height:100%"><input type="file" id="ip" accept="image/*"/><img id="img" style="max-width:100%;max-height:100%;margin:auto;display:block;"/></div>`;
      const img = body.querySelector('#img');
      body.querySelector('#ip').onchange = e => img.src = URL.createObjectURL(e.target.files[0]);
      if (a.path && /\.(svg|png|jpe?g|gif|webp)$/i.test(a.path)) img.src = FS.read(a.path) || '';
    }}); }});

  // ============ 11. Clock ============
  reg({ id: 'clock', name: 'Clock', icon: '⏰', category: 'Utilities',
    launch() { WM.open({ appId:'clock', title:'Clock', icon:'⏰', width:380, height:280, render(body) {
      body.innerHTML = `<div class="center-msg" style="font-size:64px;font-variant-numeric:tabular-nums;"><div id="t"></div><small id="d" style="font-size:14px;"></small></div>`;
      const t = body.querySelector('#t'), d = body.querySelector('#d');
      const tick = () => { const n = new Date(); t.textContent = n.toLocaleTimeString(); d.textContent = n.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'}); };
      tick(); const i = setInterval(tick, 500);
      // best-effort cleanup is non-critical here
    }}); }});

  // ============ 12. Calendar ============
  reg({ id: 'calendar', name: 'Calendar', icon: '📅', category: 'Productivity',
    launch() { WM.open({ appId:'calendar', title:'Calendar', icon:'📅', width:520, height:480, render(body) {
      body.classList.add('pad');
      let ref = new Date();
      function render() {
        const y = ref.getFullYear(), m = ref.getMonth();
        const first = new Date(y,m,1).getDay();
        const days = new Date(y,m+1,0).getDate();
        let html = `<div class="row"><button class="btn ghost" id="prev">‹</button><div style="flex:1;text-align:center;font-weight:600;">${ref.toLocaleString(undefined,{month:'long',year:'numeric'})}</div><button class="btn ghost" id="next">›</button></div>`;
        html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:10px;">`;
        ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(x => html += `<div style="text-align:center;color:var(--text-dim);font-size:12px;">${x}</div>`);
        for (let i=0;i<first;i++) html += '<div></div>';
        for (let d=1; d<=days; d++) {
          const isToday = (new Date()).toDateString() === new Date(y,m,d).toDateString();
          html += `<div style="padding:8px;text-align:center;border-radius:6px;${isToday?'background:var(--accent);color:white;':''}">${d}</div>`;
        }
        html += '</div>';
        body.innerHTML = html;
        body.querySelector('#prev').onclick = () => { ref.setMonth(m-1); render(); };
        body.querySelector('#next').onclick = () => { ref.setMonth(m+1); render(); };
      }
      render();
    }}); }});

  // ============ 13. Weather ============
  reg({ id: 'weather', name: 'Weather', icon: '⛅', category: 'Lifestyle',
    launch() { WM.open({ appId:'weather', title:'Weather', icon:'⛅', width:420, height:340, render(body) {
      body.classList.add('pad');
      body.innerHTML = `<div class="col">
        <div class="row"><input class="input" id="city" placeholder="City"/><button class="btn" id="go">Go</button></div>
        <div id="out" class="center-msg"><div style="font-size:48px;">⛅</div><div style="font-size:24px;">—</div><small>Use any name; offline mock</small></div>
      </div>`;
      body.querySelector('#go').onclick = () => {
        const c = body.querySelector('#city').value || 'Anywhere';
        const tempC = Math.round(10 + Math.random()*20);
        const conds = ['Sunny ☀️','Cloudy ☁️','Rainy 🌧','Snow ❄️','Stormy ⛈'][Math.floor(Math.random()*5)];
        body.querySelector('#out').innerHTML = `<div style="font-size:48px;">${conds.split(' ')[1]||''}</div><div style="font-size:24px;">${c}: ${tempC}°C</div><small>${conds}</small>`;
      };
    }}); }});

  // ============ 14. Camera ============
  reg({ id: 'camera', name: 'Camera', icon: '📷', category: 'Media',
    launch() { WM.open({ appId:'camera', title:'Camera', icon:'📷', width:520, height:420, render(body) {
      body.innerHTML = `<div class="pad col" style="height:100%;align-items:center;justify-content:center;">
        <video id="v" autoplay playsinline style="max-width:100%;background:#000;"></video>
        <div class="row"><button class="btn" id="shot">📸 Snap</button></div>
        <a id="dl" download="snap.png" class="hidden">download</a>
      </div>`;
      const v = body.querySelector('#v');
      navigator.mediaDevices?.getUserMedia({ video: true }).then(s => v.srcObject = s).catch(()=> v.poster='');
      body.querySelector('#shot').onclick = () => {
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v,0,0); const a = body.querySelector('#dl'); a.href = c.toDataURL(); a.click();
      };
    }}); }});

  // ============ 15. Mail (mock) ============
  reg({ id: 'mail', name: 'Mail', icon: '✉', category: 'Internet',
    launch() { WM.open({ appId:'mail', title:'Mail', icon:'✉', width:680, height:460, render(body) {
      body.classList.add('pad');
      body.innerHTML = `<div class="row" style="height:100%;align-items:stretch;">
        <div class="col" style="flex:1;border-right:1px solid var(--border);padding-right:10px;">
          <h3>Inbox</h3>
          <div id="list" class="col"></div>
        </div>
        <div class="col" style="flex:2;padding-left:10px;" id="view"><div class="center-msg">Pick a message</div></div>
      </div>`;
      const samples = [
        { from:'system@kem-os', subj:'Welcome to KEM-OS Mail', body:'This is a local-only mock client.' },
        { from:'updates@kem-os', subj:'You have 0 updates', body:'Stay current!' },
        { from:'tips@kem-os', subj:'Try the Browser app', body:'Configure Settings → Network → Proxy first.' },
      ];
      const list = body.querySelector('#list'), view = body.querySelector('#view');
      samples.forEach((m,i) => {
        const it = h('div', { class:'btn ghost', style:{textAlign:'left'}, onclick:()=> view.innerHTML = `<h3>${m.subj}</h3><small>${m.from}</small><hr/><p>${m.body}</p>` }, m.subj);
        list.appendChild(it);
      });
    }}); }});

  // ============ 16. Maps (UV) ============
  reg({ id: 'maps', name: 'Maps', icon: '🗺', category: 'Internet',
    launch() { Apps.launch('browser', { url: 'https://www.openstreetmap.org' }); }});

  // ============ 17. Store (mock catalog) ============
  reg({ id: 'store', name: 'Store', icon: '🛍', category: 'System',
    launch() { WM.open({ appId:'store', title:'KEM Store', icon:'🛍', width:720, height:520, render(body) {
      body.classList.add('pad');
      const grid = h('div', { style:{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'10px'} });
      APPS.forEach(a => {
        const card = h('div', { class:'pad', style:{background:'var(--surface-2)', borderRadius:'10px', textAlign:'center'} },
          h('div', { style:{fontSize:'40px'} }, a.icon),
          h('div', { style:{fontWeight:600} }, a.name),
          h('div', { style:{fontSize:12, color:'var(--text-dim)', marginBottom:'8px'} }, a.category),
          h('button', { class:'btn', onclick:() => Apps.launch(a.id) }, 'Open')
        );
        grid.appendChild(card);
      });
      body.appendChild(grid);
    }}); }});

  // ============ 18. Tasks ============
  reg({ id:'tasks', name:'Tasks', icon:'✅', category:'Productivity',
    launch() { WM.open({ appId:'tasks', title:'Tasks', icon:'✅', width:420, height:540, render(body) {
      body.classList.add('pad');
      const list = JSON.parse(localStorage.getItem('kemos.tasks')||'[]');
      function save(){ localStorage.setItem('kemos.tasks', JSON.stringify(list)); render(); }
      function render() {
        body.innerHTML = '';
        const inp = h('input', { class:'input', placeholder:'New task and Enter' });
        inp.addEventListener('keydown', e => { if (e.key==='Enter' && inp.value.trim()) { list.push({t:inp.value.trim(),done:false}); save(); } });
        body.appendChild(inp);
        list.forEach((t,i) => {
          const row = h('div', { class:'row', style:{margin:'8px 0'} },
            h('input', { type:'checkbox', onchange:e=>{ list[i].done=e.target.checked; save(); }}),
            h('span', { style:{flex:1, textDecoration: t.done?'line-through':'none'} }, t.t),
            h('button', { class:'btn ghost', onclick:()=>{ list.splice(i,1); save(); }}, '×')
          );
          row.querySelector('input').checked = t.done;
          body.appendChild(row);
        });
      }
      render();
    }}); }});

  // ============ 19. Notes ============
  reg({ id:'notes', name:'Sticky Notes', icon:'🗒', category:'Productivity',
    launch() { WM.open({ appId:'notes', title:'Notes', icon:'🗒', width:380, height:340, render(body) {
      body.classList.add('pad');
      const ta = h('textarea', { style:{width:'100%',height:'100%',resize:'none',background:'#fff7ad',color:'#222',border:0,padding:'12px',borderRadius:'6px',font:'14px/1.4 Segoe UI'} });
      ta.value = localStorage.getItem('kemos.note') || '';
      ta.oninput = () => localStorage.setItem('kemos.note', ta.value);
      body.appendChild(ta);
    }}); }});

  // ============ 20. Voice Recorder ============
  reg({ id:'recorder', name:'Voice Recorder', icon:'🎙', category:'Media',
    launch() { WM.open({ appId:'recorder', title:'Voice Recorder', icon:'🎙', width:380, height:240, render(body) {
      body.classList.add('pad','col');
      let rec, chunks=[];
      const start = h('button', { class:'btn' }, '● Record');
      const stop = h('button', { class:'btn ghost' }, '■ Stop');
      const aud = h('audio', { controls:'' });
      body.appendChild(h('div',{class:'row'}, start, stop));
      body.appendChild(aud);
      start.onclick = async () => {
        const s = await navigator.mediaDevices.getUserMedia({audio:true});
        rec = new MediaRecorder(s); chunks=[];
        rec.ondataavailable = e => chunks.push(e.data);
        rec.onstop = () => aud.src = URL.createObjectURL(new Blob(chunks));
        rec.start();
      };
      stop.onclick = () => rec && rec.stop();
    }}); }});

  // ============ 21. Code Editor ============
  reg({ id:'code', name:'Code Editor', icon:'📜', category:'Productivity',
    launch(args={}) { WM.open({ appId:'code', title:'Code Editor', icon:'📜', width:780, height:520, render(body, ctx) {
      body.classList.add('editor');
      body.innerHTML = `<div class="toolbar"><span id="path" style="color:var(--text-dim);"></span><button class="btn ghost" id="save" style="margin-left:auto;">Save</button></div><textarea spellcheck="false"></textarea>`;
      const ta = body.querySelector('textarea'); const lbl = body.querySelector('#path');
      let p = args.path || null;
      if (p) { ta.value = FS.read(p) || ''; lbl.textContent = p; ctx.title('Code — '+p); }
      body.querySelector('#save').onclick = () => { p = p || prompt('Save as:', '/Documents/file.js'); if (!p) return; FS.write(p, ta.value); lbl.textContent = p; OS.toast('Saved', p); };
      ta.addEventListener('keydown', e => { if (e.key==='Tab'){ e.preventDefault(); const s=ta.selectionStart,e2=ta.selectionEnd; ta.value=ta.value.slice(0,s)+'  '+ta.value.slice(e2); ta.selectionStart=ta.selectionEnd=s+2; } });
    }}); }});

  // ============ 22. Markdown Editor ============
  reg({ id:'markdown', name:'Markdown', icon:'📑', category:'Productivity',
    launch(args={}) { WM.open({ appId:'markdown', title:'Markdown', icon:'📑', width:880, height:520, render(body) {
      body.style.display='grid'; body.style.gridTemplateColumns='1fr 1fr';
      const ta = h('textarea', { style:{padding:'12px',background:'var(--surface-solid)',color:'var(--text)',border:0,resize:'none',outline:'none',fontFamily:'ui-monospace,Consolas,monospace'} });
      const prev = h('div', { class:'pad scroll', style:{borderLeft:'1px solid var(--border)'} });
      const upd = () => prev.innerHTML = mdToHtml(ta.value);
      ta.oninput = upd;
      ta.value = args.path ? (FS.read(args.path) || '') : '# Hello\n\nType **markdown** here.\n\n- Live preview\n- Save with Ctrl+S';
      ta.addEventListener('keydown', e => { if (e.ctrlKey && e.key==='s') { e.preventDefault(); const p = args.path || prompt('Save as','/Documents/note.md'); if (p) { FS.write(p, ta.value); OS.toast('Saved', p); } } });
      body.appendChild(ta); body.appendChild(prev); upd();
    }}); }});
  function mdToHtml(s) {
    return s
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/^### (.*)$/gm,'<h3>$1</h3>')
      .replace(/^## (.*)$/gm,'<h2>$1</h2>')
      .replace(/^# (.*)$/gm,'<h1>$1</h1>')
      .replace(/^\s*-\s+(.*)$/gm,'<li>$1</li>')
      .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\n\n/g,'<br/><br/>');
  }

  // ============ 23. Snake ============
  reg({ id:'snake', name:'Snake', icon:'🐍', category:'Games',
    launch() { WM.open({ appId:'snake', title:'Snake', icon:'🐍', width:420, height:460, render(body) {
      body.classList.add('game-board');
      const cv = h('canvas', { width:360, height:360, style:{background:'#0a1f2b',borderRadius:'6px'} });
      body.appendChild(cv);
      const score = h('div'); body.appendChild(score);
      const ctx = cv.getContext('2d');
      const grid = 18, cells = 20;
      let snake = [{x:10,y:10}], dir = {x:1,y:0}, food = {x:5,y:5}, s = 0, dead = false;
      function step() {
        if (dead) return;
        const head = { x: (snake[0].x + dir.x + cells) % cells, y: (snake[0].y + dir.y + cells) % cells };
        if (snake.some(p => p.x===head.x && p.y===head.y)) { dead = true; score.textContent = 'Game over — score '+s+'. Click to retry.'; return; }
        snake.unshift(head);
        if (head.x===food.x && head.y===food.y) { s++; food = {x:Math.floor(Math.random()*cells), y:Math.floor(Math.random()*cells)}; } else snake.pop();
        ctx.fillStyle = '#0a1f2b'; ctx.fillRect(0,0,cv.width,cv.height);
        ctx.fillStyle = '#22c55e'; snake.forEach(p => ctx.fillRect(p.x*grid+1, p.y*grid+1, grid-2, grid-2));
        ctx.fillStyle = '#ef4444'; ctx.fillRect(food.x*grid+1, food.y*grid+1, grid-2, grid-2);
        score.textContent = 'Score: ' + s;
      }
      const iv = setInterval(step, 110);
      const onKey = e => {
        if (e.key==='ArrowUp' && dir.y===0) dir={x:0,y:-1};
        else if (e.key==='ArrowDown' && dir.y===0) dir={x:0,y:1};
        else if (e.key==='ArrowLeft' && dir.x===0) dir={x:-1,y:0};
        else if (e.key==='ArrowRight' && dir.x===0) dir={x:1,y:0};
      };
      window.addEventListener('keydown', onKey);
      cv.onclick = () => { if (dead) { snake=[{x:10,y:10}]; dir={x:1,y:0}; s=0; dead=false; } };
    }}); }});

  // ============ 24. Tic-Tac-Toe ============
  reg({ id:'ttt', name:'Tic-Tac-Toe', icon:'❌', category:'Games',
    launch() { WM.open({ appId:'ttt', title:'Tic-Tac-Toe', icon:'❌', width:340, height:380, render(body) {
      body.classList.add('game-board');
      let b = Array(9).fill(''), turn = 'X', done = false;
      const grid = h('div', { style:{display:'grid',gridTemplateColumns:'repeat(3,80px)',gap:'4px'} });
      const status = h('div', {}, 'Turn: X');
      function check() {
        const w = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const [a,c,d] of w) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a];
        return b.every(x => x) ? 'tie' : null;
      }
      function render() {
        grid.innerHTML='';
        b.forEach((v,i) => {
          const c = h('button', { style:{width:'80px',height:'80px',fontSize:'30px'}, onclick:() => {
            if (done || b[i]) return;
            b[i] = turn;
            const r = check();
            if (r) { status.textContent = r==='tie' ? 'Tie' : (r+' wins!'); done=true; }
            else { turn = turn==='X'?'O':'X'; status.textContent = 'Turn: '+turn; }
            render();
          }}, v);
          grid.appendChild(c);
        });
      }
      const reset = h('button', { class:'btn', onclick:() => { b=Array(9).fill(''); turn='X'; done=false; status.textContent='Turn: X'; render(); }}, 'Reset');
      body.appendChild(grid); body.appendChild(status); body.appendChild(reset);
      render();
    }}); }});

  // ============ 25. Minesweeper ============
  reg({ id:'mine', name:'Minesweeper', icon:'💣', category:'Games',
    launch() { WM.open({ appId:'mine', title:'Minesweeper', icon:'💣', width:380, height:420, render(body) {
      body.classList.add('game-board');
      const N=9, M=10;
      let cells, revealed, flagged, dead=false, win=false;
      function init() {
        cells = Array.from({length:N},()=>Array(N).fill(0));
        revealed = Array.from({length:N},()=>Array(N).fill(false));
        flagged = Array.from({length:N},()=>Array(N).fill(false));
        let placed=0; while (placed<M) { const x=Math.floor(Math.random()*N), y=Math.floor(Math.random()*N); if (cells[y][x]!==-1){ cells[y][x]=-1; placed++; }}
        for (let y=0;y<N;y++) for (let x=0;x<N;x++) if (cells[y][x]!==-1) {
          let n=0; for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) { const nx=x+dx,ny=y+dy; if (nx>=0&&ny>=0&&nx<N&&ny<N&&cells[ny][nx]===-1) n++; } cells[y][x]=n;
        }
        dead=false; win=false; render();
      }
      function reveal(x,y) {
        if (revealed[y][x]||flagged[y][x]) return;
        revealed[y][x]=true;
        if (cells[y][x]===-1) { dead=true; return; }
        if (cells[y][x]===0) for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) { const nx=x+dx,ny=y+dy; if (nx>=0&&ny>=0&&nx<N&&ny<N) reveal(nx,ny); }
      }
      function render() {
        body.innerHTML='';
        const status = h('div', {}, dead ? '💥 Boom — click to retry' : (win ? '🏆 Won!' : 'Right-click to flag'));
        status.onclick = () => init();
        const grid = h('div', { style:{display:'grid',gridTemplateColumns:`repeat(${N},28px)`,gap:'2px'} });
        for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
          const c = h('button', { style:{width:'28px',height:'28px',fontSize:'12px'} });
          if (revealed[y][x]) {
            c.style.background = 'rgba(255,255,255,0.05)';
            c.textContent = cells[y][x]===-1 ? '💣' : (cells[y][x] || '');
          } else if (flagged[y][x]) c.textContent = '🚩';
          c.oncontextmenu = e => { e.preventDefault(); flagged[y][x]=!flagged[y][x]; render(); };
          c.onclick = () => { if (dead) return; reveal(x,y); render(); };
          grid.appendChild(c);
        }
        body.appendChild(status); body.appendChild(grid);
      }
      init();
    }}); }});

  // ============ 26. 2048 ============
  reg({ id:'2048', name:'2048', icon:'🔢', category:'Games',
    launch() { WM.open({ appId:'2048', title:'2048', icon:'🔢', width:380, height:460, render(body) {
      body.classList.add('game-board');
      let g; const N=4;
      function spawn(){ const e=[]; for (let y=0;y<N;y++) for (let x=0;x<N;x++) if (!g[y][x]) e.push([x,y]); if (!e.length) return; const [x,y]=e[Math.floor(Math.random()*e.length)]; g[y][x] = Math.random()<0.9?2:4; }
      function init(){ g = Array.from({length:N},()=>Array(N).fill(0)); spawn(); spawn(); render(); }
      function slide(arr) { const a = arr.filter(x=>x); for (let i=0;i<a.length-1;i++) if (a[i]===a[i+1]) { a[i]*=2; a[i+1]=0; } return a.filter(x=>x).concat(Array(N-arr.filter(x=>x).length).fill(0)); }
      function move(d) {
        const before = JSON.stringify(g);
        if (d==='l') for (let y=0;y<N;y++) g[y]=slide(g[y]);
        if (d==='r') for (let y=0;y<N;y++) g[y]=slide(g[y].reverse()).reverse();
        if (d==='u') { for (let x=0;x<N;x++) { const c=slide(g.map(r=>r[x])); for (let y=0;y<N;y++) g[y][x]=c[y]; } }
        if (d==='d') { for (let x=0;x<N;x++) { const c=slide(g.map(r=>r[x]).reverse()).reverse(); for (let y=0;y<N;y++) g[y][x]=c[y]; } }
        if (JSON.stringify(g)!==before) spawn();
        render();
      }
      function render() {
        body.innerHTML='';
        const grid = h('div', { style:{display:'grid',gridTemplateColumns:`repeat(${N},60px)`,gap:'4px',background:'#bbada0',padding:'6px',borderRadius:'6px'} });
        const colors = {0:'#cdc1b4',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
        for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
          const v = g[y][x];
          grid.appendChild(h('div', { style:{width:'60px',height:'60px',background:colors[v]||'#3c3a32',color:v>4?'#fff':'#776e65',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'22px',borderRadius:'4px'} }, v||''));
        }
        body.appendChild(h('div', {}, 'Use arrow keys or WASD'));
        body.appendChild(grid);
      }
      const onKey = e => { if (['ArrowLeft','a','A'].includes(e.key)) move('l'); else if (['ArrowRight','d','D'].includes(e.key)) move('r'); else if (['ArrowUp','w','W'].includes(e.key)) move('u'); else if (['ArrowDown','s','S'].includes(e.key)) move('d'); };
      window.addEventListener('keydown', onKey);
      init();
    }}); }});

  // ============ 27. Pong ============
  reg({ id:'pong', name:'Pong', icon:'🏓', category:'Games',
    launch() { WM.open({ appId:'pong', title:'Pong', icon:'🏓', width:520, height:340, render(body) {
      body.classList.add('game-board');
      const cv = h('canvas',{width:480,height:280,style:{background:'#000',borderRadius:'4px'}}); body.appendChild(cv);
      const ctx = cv.getContext('2d');
      let p1=120, p2=120, ball={x:240,y:140,dx:3,dy:2}, s1=0,s2=0, keys={};
      window.addEventListener('keydown', e=> keys[e.key]=true);
      window.addEventListener('keyup', e=> keys[e.key]=false);
      function step(){
        if (keys['w']||keys['W']) p1=Math.max(0,p1-5);
        if (keys['s']||keys['S']) p1=Math.min(220,p1+5);
        if (keys['ArrowUp']) p2=Math.max(0,p2-5);
        if (keys['ArrowDown']) p2=Math.min(220,p2+5);
        ball.x+=ball.dx; ball.y+=ball.dy;
        if (ball.y<=0||ball.y>=280) ball.dy*=-1;
        if (ball.x<=10 && ball.y>p1 && ball.y<p1+60) ball.dx*=-1;
        if (ball.x>=470 && ball.y>p2 && ball.y<p2+60) ball.dx*=-1;
        if (ball.x<0){ s2++; ball.x=240; ball.y=140; ball.dx=3; }
        if (ball.x>480){ s1++; ball.x=240; ball.y=140; ball.dx=-3; }
        ctx.fillStyle='#000'; ctx.fillRect(0,0,480,280);
        ctx.fillStyle='#fff';
        ctx.fillRect(5,p1,8,60); ctx.fillRect(467,p2,8,60);
        ctx.fillRect(ball.x,ball.y,8,8);
        ctx.font='20px monospace'; ctx.fillText(s1+' : '+s2, 220, 24);
        requestAnimationFrame(step);
      }
      step();
      body.appendChild(h('div', {}, 'You: W/S — AI: arrows (or 2P)'));
    }}); }});

  // ============ 28. Chess (display-only board) ============
  reg({ id:'chess', name:'Chess', icon:'♟', category:'Games',
    launch() { WM.open({ appId:'chess', title:'Chess', icon:'♟', width:420, height:460, render(body) {
      body.classList.add('game-board');
      const board = [
        ['♜','♞','♝','♛','♚','♝','♞','♜'],
        ['♟','♟','♟','♟','♟','♟','♟','♟'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['♙','♙','♙','♙','♙','♙','♙','♙'],
        ['♖','♘','♗','♕','♔','♗','♘','♖'],
      ];
      let sel = null;
      function render() {
        body.innerHTML='';
        const g = h('div', { style:{display:'grid',gridTemplateColumns:'repeat(8,40px)'} });
        for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
          const c = h('div', { style:{width:'40px',height:'40px',background:(x+y)%2?'#779556':'#ebecd0',color:y<4?'#000':'#000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',cursor:'pointer'},
            onclick:() => { if (!sel) { if (board[y][x]) sel={x,y}; } else { board[y][x]=board[sel.y][sel.x]; board[sel.y][sel.x]=''; sel=null; } render(); } }, board[y][x]);
          if (sel && sel.x===x && sel.y===y) c.style.outline='2px solid var(--accent)';
          g.appendChild(c);
        }
        body.appendChild(g);
        body.appendChild(h('div', {}, 'Free move (no rule enforcement)'));
      }
      render();
    }}); }});

  // ============ 29. Scientific calculator ============
  reg({ id:'sci', name:'Scientific Calc', icon:'∑', category:'Utilities',
    launch() { WM.open({ appId:'sci', title:'Scientific Calc', icon:'∑', width:360, height:280, render(body) {
      body.classList.add('pad','col');
      const inp = h('input',{class:'input',placeholder:'e.g. Math.sin(Math.PI/2) + 2*3'});
      const out = h('div',{style:{fontSize:'22px',padding:'10px',background:'var(--surface-2)',borderRadius:'6px'}},'—');
      const go = h('button',{class:'btn',onclick:()=>{ try{ out.textContent = String(Function('with(Math){return ('+inp.value+')}')()); } catch(e){ out.textContent='Err'; } }},'Evaluate');
      inp.addEventListener('keydown', e => e.key==='Enter' && go.click());
      body.appendChild(inp); body.appendChild(go); body.appendChild(out);
    }}); }});

  // ============ 30. Color Picker ============
  reg({ id:'color', name:'Color Picker', icon:'🎯', category:'Utilities',
    launch() { WM.open({ appId:'color', title:'Color Picker', icon:'🎯', width:340, height:240, render(body) {
      body.classList.add('pad','col');
      const c = h('input',{type:'color',value:'#0078d4',style:{width:'100%',height:'80px'}});
      const o = h('div',{class:'col'});
      const upd = () => { const v = c.value; o.innerHTML = `<div>HEX: ${v}</div><div>RGB: ${parseInt(v.slice(1,3),16)}, ${parseInt(v.slice(3,5),16)}, ${parseInt(v.slice(5),16)}</div>`; };
      c.oninput = upd; upd();
      body.appendChild(c); body.appendChild(o);
    }}); }});

  // ============ 31. Unit Converter ============
  reg({ id:'units', name:'Unit Converter', icon:'📐', category:'Utilities',
    launch() { WM.open({ appId:'units', title:'Units', icon:'📐', width:380, height:240, render(body) {
      body.classList.add('pad','col');
      const types = { Length: { m:1, cm:0.01, km:1000, mi:1609.34, ft:0.3048, in:0.0254 }, Mass: { kg:1, g:0.001, lb:0.453592, oz:0.0283495 }, Temp: 'temp' };
      const tSel = h('select',{class:'select'}); Object.keys(types).forEach(k=>tSel.appendChild(h('option',{},k)));
      const fSel = h('select',{class:'select'}), tSel2 = h('select',{class:'select'});
      const inp = h('input',{class:'input',value:'1'});
      const out = h('div',{style:{fontSize:'18px'}},'—');
      function refresh() {
        const t = types[tSel.value];
        if (t==='temp') { fSel.innerHTML='<option>C</option><option>F</option><option>K</option>'; tSel2.innerHTML=fSel.innerHTML; }
        else { const opts = Object.keys(t).map(k=>`<option>${k}</option>`).join(''); fSel.innerHTML=opts; tSel2.innerHTML=opts; }
      }
      function calc(){
        const t = types[tSel.value]; const v = parseFloat(inp.value)||0;
        if (t==='temp') {
          let c = fSel.value==='C'? v : fSel.value==='F'? (v-32)*5/9 : v-273.15;
          let r = tSel2.value==='C'? c : tSel2.value==='F'? c*9/5+32 : c+273.15;
          out.textContent = r.toFixed(2)+' '+tSel2.value;
        } else {
          out.textContent = (v*t[fSel.value]/t[tSel2.value]).toFixed(4)+' '+tSel2.value;
        }
      }
      tSel.onchange = () => { refresh(); calc(); };
      [fSel,tSel2,inp].forEach(e => e.oninput = e.onchange = calc);
      refresh(); calc();
      body.appendChild(tSel); body.appendChild(h('div',{class:'row'},inp,fSel,h('span',{},'→'),tSel2)); body.appendChild(out);
    }}); }});

  // ============ 32. Stopwatch / Timer ============
  reg({ id:'stopwatch', name:'Stopwatch', icon:'⏱', category:'Utilities',
    launch() { WM.open({ appId:'stopwatch', title:'Stopwatch', icon:'⏱', width:320, height:220, render(body) {
      body.classList.add('pad','col');
      const display = h('div',{style:{fontSize:'40px',textAlign:'center',fontVariantNumeric:'tabular-nums'}},'00:00.00');
      let t0=0, acc=0, run=false, iv=null;
      const upd = () => { const e = (run? Date.now()-t0 : 0)+acc; const m = Math.floor(e/60000), s = Math.floor(e/1000)%60, ms = Math.floor(e/10)%100; display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`; };
      const start = h('button',{class:'btn',onclick:()=>{ if (!run){ run=true; t0=Date.now(); iv=setInterval(upd,30);} else { run=false; acc+=Date.now()-t0; clearInterval(iv); } }},'Start/Stop');
      const reset = h('button',{class:'btn ghost',onclick:()=>{ run=false; clearInterval(iv); acc=0; t0=0; upd(); }},'Reset');
      body.appendChild(display); body.appendChild(h('div',{class:'row'},start,reset));
    }}); }});

  // ============ 33. Drawing Pad (signature) ============
  reg({ id:'draw', name:'Drawing Pad', icon:'✒', category:'Creative',
    launch() { WM.open({ appId:'draw', title:'Drawing Pad', icon:'✒', width:520, height:360, render(body) {
      body.classList.add('paint');
      body.innerHTML = `<div class="toolbar"><button class="btn ghost" id="clr">Clear</button></div><canvas width="500" height="300"></canvas>`;
      const cv = body.querySelector('canvas'); const ctx = cv.getContext('2d');
      let d=false, last=null;
      cv.onmousedown = e => { d=true; const r=cv.getBoundingClientRect(); last={x:e.clientX-r.left,y:e.clientY-r.top}; };
      cv.onmousemove = e => { if (!d) return; const r=cv.getBoundingClientRect(); const x=e.clientX-r.left,y=e.clientY-r.top; ctx.lineWidth=2; ctx.lineCap='round'; ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(x,y); ctx.stroke(); last={x,y}; };
      window.addEventListener('mouseup', ()=>d=false);
      body.querySelector('#clr').onclick = () => ctx.clearRect(0,0,cv.width,cv.height);
    }}); }});

  // ============ 34. Sticky Notes (multi) ============
  reg({ id:'stickies', name:'Stickies', icon:'🟨', category:'Productivity',
    launch() { WM.open({ appId:'stickies', title:'Stickies', icon:'🟨', width:520, height:380, render(body) {
      body.classList.add('pad');
      const list = JSON.parse(localStorage.getItem('kemos.stickies')||'[]');
      function save(){ localStorage.setItem('kemos.stickies', JSON.stringify(list)); render(); }
      const grid = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px'}});
      function render(){
        body.innerHTML='';
        const add = h('button',{class:'btn',onclick:()=>{ list.push({c:'#fff7ad',t:'New note'}); save(); }},'+ Add');
        body.appendChild(add); body.appendChild(grid);
        grid.innerHTML='';
        list.forEach((s,i) => {
          const card = h('div',{style:{background:s.c,color:'#222',padding:'10px',borderRadius:'6px',minHeight:'120px'}});
          const ta = h('textarea',{style:{width:'100%',background:'transparent',border:0,color:'#222',resize:'none',height:'80px'}}, s.t);
          ta.oninput = () => { list[i].t = ta.value; save(); };
          const del = h('button',{class:'btn ghost',onclick:()=>{ list.splice(i,1); save(); }},'×');
          card.appendChild(ta); card.appendChild(del); grid.appendChild(card);
        });
      } render();
    }}); }});

  // ============ 35. PDF / Generic Open ============
  reg({ id:'opener', name:'PDF & Files', icon:'📕', category:'Media',
    launch() { WM.open({ appId:'opener', title:'PDF & Files', icon:'📕', width:680, height:520, render(body) {
      body.innerHTML = `<div class="pad"><input type="file" id="p"/></div><iframe style="width:100%;height:90%;border:0;" id="f"></iframe>`;
      body.querySelector('#p').onchange = e => body.querySelector('#f').src = URL.createObjectURL(e.target.files[0]);
    }}); }});

  // ============ 36. Task Manager ============
  reg({ id:'taskman', name:'Task Manager', icon:'📊', category:'System',
    launch() { WM.open({ appId:'taskman', title:'Task Manager', icon:'📊', width:520, height:360, render(body) {
      body.classList.add('pad');
      function render() {
        const list = WM.list();
        body.innerHTML = `<h3>Running windows: ${list.length}</h3>`;
        const t = h('table',{style:{width:'100%'}},
          h('thead',{},h('tr',{},h('th',{align:'left'},'App'),h('th',{align:'left'},'Title'),h('th',{align:'left'},'ID'),h('th'))));
        const tb = h('tbody');
        list.forEach(w => {
          const tr = h('tr',{},
            h('td',{},w.appId||'?'), h('td',{},w.title||''), h('td',{},w.id),
            h('td',{},h('button',{class:'btn ghost',onclick:()=>{WM.close(w.id);render();}},'End')));
          tb.appendChild(tr);
        });
        t.appendChild(tb); body.appendChild(t);
        const ram = `RAM: ${(performance.memory? (performance.memory.usedJSHeapSize/1048576).toFixed(1) : '—')} MB`;
        body.appendChild(h('p',{style:{color:'var(--text-dim)',fontSize:'12px'}}, ram + ' — Apps registered: ' + APPS.length));
      }
      render();
      const iv = setInterval(render, 1500);
    }}); }});

  // ============ 37. Console (UV diagnostics) ============
  reg({ id:'console', name:'Proxy Console', icon:'🛡', category:'System',
    launch() { WM.open({ appId:'console', title:'Proxy Console', icon:'🛡', width:560, height:340, render(body) {
      body.classList.add('pad','col');
      const status = h('div');
      function rerender() {
        const reg = !!navigator.serviceWorker?.controller;
        status.innerHTML = `
          <p><b>Service Worker:</b> ${'serviceWorker' in navigator ? 'available' : 'unavailable'}</p>
          <p><b>Registered:</b> ${reg ? 'yes' : 'no'}</p>
          <p><b>Bare URL:</b> <code>${Registry.get('proxy.bareUrl')||'(not set)'}</code></p>
          <p><b>Encoding:</b> ${Registry.get('proxy.encoding')}</p>
          <p><b>Search engine:</b> ${Registry.get('proxy.searchEngine')}</p>`;
      }
      const reg = h('button',{class:'btn',onclick:async()=>{ try { await Proxy.ensureSW(); OS.toast('Proxy', 'Service worker registered'); rerender(); } catch(e) { OS.toast('Proxy', e.message); } }},'Register service worker');
      const test = h('button',{class:'btn ghost',onclick:async()=>{ try { const u = await Proxy.navigate('https://example.com'); OS.toast('Proxy', 'Encoded: '+u.slice(0,80)+'...'); } catch(e) { OS.toast('Proxy', e.message); } }},'Test encode');
      const open = h('button',{class:'btn ghost',onclick:()=>Apps.launch('settings',{section:'Network'})},'Open Network settings');
      body.appendChild(status); body.appendChild(h('div',{class:'row'},reg,test,open));
      rerender();
    }}); }});

  // ============ 38. Bookmarks ============
  reg({ id:'bookmarks', name:'Bookmarks', icon:'🔖', category:'Internet',
    launch() { WM.open({ appId:'bookmarks', title:'Bookmarks', icon:'🔖', width:480, height:420, render(body) {
      body.classList.add('pad');
      const list = JSON.parse(localStorage.getItem('kemos.bookmarks')||'[]');
      function save(){ localStorage.setItem('kemos.bookmarks', JSON.stringify(list)); render(); }
      function render() {
        body.innerHTML='';
        const inp = h('input',{class:'input',placeholder:'https://…'});
        const add = h('button',{class:'btn',onclick:()=>{ if (!inp.value) return; list.push(inp.value); save(); }},'Add');
        body.appendChild(h('div',{class:'row'},inp,add));
        list.forEach((u,i) => {
          body.appendChild(h('div',{class:'row',style:{marginTop:'8px'}},
            h('button',{class:'btn ghost',onclick:()=>Apps.launch('browser',{url:u})}, u),
            h('button',{class:'btn ghost',onclick:()=>{ list.splice(i,1); save(); }}, '×')));
        });
      }
      render();
    }}); }});

  // ============ 39. Search ============
  reg({ id:'search', name:'Search', icon:'🔍', category:'System',
    launch() { WM.open({ appId:'search', title:'Search', icon:'🔍', width:520, height:380, render(body) {
      body.classList.add('pad','col');
      const inp = h('input',{class:'input',placeholder:'Search apps, settings, files…'});
      const out = h('div');
      inp.oninput = () => {
        const q = inp.value.toLowerCase().trim();
        out.innerHTML='';
        if (!q) return;
        APPS.filter(a => a.name.toLowerCase().includes(q)).forEach(a => out.appendChild(h('div',{class:'btn ghost',style:{display:'block',textAlign:'left',margin:'4px 0'},onclick:()=>Apps.launch(a.id)},`${a.icon} ${a.name}`)));
        Object.keys(Registry.defaults).filter(k => k.toLowerCase().includes(q)).slice(0,8).forEach(k => out.appendChild(h('div',{class:'btn ghost',style:{display:'block',textAlign:'left',margin:'4px 0'},onclick:()=>Apps.launch('settings')},'⚙ '+k)));
        Object.keys(FS.raw()).filter(p => p.toLowerCase().includes(q)).forEach(p => out.appendChild(h('div',{class:'btn ghost',style:{display:'block',textAlign:'left',margin:'4px 0'},onclick:()=>Apps.launch('files')},'📁 '+p)));
        if (Registry.get('search.web')) out.appendChild(h('div',{class:'btn',style:{display:'block',textAlign:'left',margin:'4px 0'},onclick:()=>Apps.launch('browser',{url:q})},'🌐 Search the web for "'+q+'"'));
      };
      body.appendChild(inp); body.appendChild(out);
      setTimeout(()=>inp.focus(), 50);
    }}); }});

  // ============ 40. Help / About ============
  reg({ id:'help', name:'Help & About', icon:'❔', category:'System', pinned:true,
    launch() { WM.open({ appId:'help', title:'Help & About', icon:'❔', width:560, height:520, render(body) {
      body.classList.add('pad','scroll');
      body.innerHTML = `
        <h2>KEM-OS</h2>
        <p>Static, fully offline-capable Windows-style web desktop with a built-in Ultraviolet proxy.</p>
        <h3>Quick start</h3>
        <ul>
          <li>Click <b>Start</b> (bottom-left grid icon) for the launcher.</li>
          <li>Right-click the desktop for a context menu.</li>
          <li>Drag windows by their titlebar; drop near edges to snap.</li>
          <li>Open <b>Settings</b> for 100+ tweaks (theme, proxy, taskbar, etc).</li>
        </ul>
        <h3>Keyboard</h3>
        <p><span class="kbd">Win/Meta</span> opens Start. <span class="kbd">Esc</span> closes menus.
        <span class="kbd">Ctrl+S</span> saves in editors.</p>
        <h3>Proxy (Ultraviolet)</h3>
        <p>The Browser app proxies sites through a TitaniumNetwork-style "bare server".
        Configure the URL in Settings → Network → Proxy.</p>
        <h3>About</h3>
        <p>Apps: ${APPS.length} • Version 1.0 • Source: vanilla JS, no build.</p>
      `;
    }}); }});

  // ============ Apps facade ============
  window.Apps = {
    list: () => APPS.slice(),
    get: id => byId[id],
    launch(id, args) { const a = byId[id]; if (a) a.launch(args); else OS.toast('App not found', id); },
  };
})();
