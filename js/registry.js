// Persistent settings store + event bus.
(function () {
  const KEY = 'kemos.registry.v1';

  const defaults = {
    // Personalization
    'theme': 'dark',                // dark | light
    'accent': 'blue',
    'wallpaper': 'preset:aurora',
    'lock.wallpaper': 'preset:nightcity',
    'animations': true,
    'animationSpeed': 1.0,
    'transparency': true,
    'blur.amount': 22,
    'shadows': true,
    'fontFamily': "'Segoe UI', system-ui, sans-serif",
    'fontSize': 14,
    'iconSize': 64,
    'density': 'normal',            // compact | normal | roomy
    'highContrast': false,
    'colorFilter': 'none',          // none | grayscale | invert | sepia
    'cursorSize': 1,
    'reduceMotion': false,
    'desktopIcons': true,

    // Taskbar
    'taskbar.position': 'bottom',   // bottom | top
    'taskbar.size': 'normal',       // small | normal
    'taskbar.alignment': 'center',  // center | left
    'taskbar.showSearch': true,
    'taskbar.showTaskView': true,
    'taskbar.showClock': true,
    'taskbar.showWeather': false,
    'taskbar.autohide': false,
    'taskbar.combine': true,
    'taskbar.badges': true,

    // Start menu
    'start.showRecent': true,
    'start.showRecommended': true,
    'start.fullscreen': false,
    'start.gridCols': 6,

    // System
    'system.hostname': 'KEM-PC',
    'system.user': 'User',
    'system.language': 'en-US',
    'system.timezone': 'auto',
    'system.timeFormat': '24',      // 12 | 24
    'system.dateFormat': 'YYYY-MM-DD',
    'system.firstDay': 'monday',
    'system.startupBoot': true,
    'system.fastBoot': true,
    'system.tooltips': true,
    'system.snap': true,            // window snapping
    'system.snapAssist': true,
    'system.shake': true,           // shake to minimize
    'system.peek': true,
    'system.scrollInactive': true,

    // Sound
    'sound.master': 80,
    'sound.startup': true,
    'sound.notifications': true,
    'sound.clicks': false,
    'sound.mute': false,

    // Display
    'display.brightness': 100,
    'display.nightLight': false,
    'display.nightLightStrength': 40,
    'display.scale': 100,
    'display.refresh': 60,

    // Notifications
    'notifications.enabled': true,
    'notifications.banners': true,
    'notifications.sound': true,
    'notifications.dnd': false,
    'notifications.lock': false,

    // Privacy
    'privacy.telemetry': false,
    'privacy.location': false,
    'privacy.camera': true,
    'privacy.microphone': true,
    'privacy.history': true,
    'privacy.searchHistory': true,
    'privacy.clipboardSync': false,

    // Updates
    'updates.auto': true,
    'updates.channel': 'stable',
    'updates.notify': true,
    'updates.metered': false,
    'updates.lastChecked': 0,

    // Power
    'power.plan': 'balanced',       // saver | balanced | performance
    'power.sleepMin': 15,
    'power.dimMin': 5,
    'power.lidClose': 'sleep',

    // Accounts
    'account.name': 'User',
    'account.email': '',
    'account.avatar': '🧑',
    'account.passwordless': true,

    // Network / Proxy
    'proxy.bareUrl': '',            // user supplies
    'proxy.bareApi': '/uv/service/',
    'proxy.encoding': 'xor',        // xor | base64 | plain
    'proxy.searchEngine': 'https://duckduckgo.com/?q=%s',
    'proxy.homepage': 'https://duckduckgo.com',
    'proxy.adblock': true,
    'proxy.killCookies': false,
    'proxy.spoofUA': false,
    'proxy.userAgent': '',
    'proxy.openExternal': false,

    // Apps
    'apps.defaultBrowser': 'browser',
    'apps.defaultEditor': 'notepad',
    'apps.defaultMusic': 'music',
    'apps.defaultImage': 'imageviewer',
    'apps.startup': [],             // app ids to launch on boot

    // Gaming
    'gaming.fps': false,
    'gaming.bar': true,
    'gaming.mode': false,

    // Devices
    'devices.bluetooth': false,
    'devices.printer': '',
    'devices.mouseSpeed': 5,
    'devices.touchpad': true,
    'devices.naturalScroll': false,

    // Accessibility
    'a11y.screenReader': false,
    'a11y.magnifier': false,
    'a11y.stickyKeys': false,
    'a11y.captions': false,
    'a11y.largeText': false,

    // Search
    'search.web': true,
    'search.indexFiles': true,

    // Clipboard
    'clipboard.history': true,

    // Storage
    'storage.sense': false,

    // Lockscreen
    'lock.showClock': true,
    'lock.showWeather': false,
    'lock.tips': true,
  };

  const listeners = {};
  let data = {};

  function load() {
    try { data = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { data = Object.assign({}, defaults); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  load();

  window.Registry = {
    get(k, fallback) { return k in data ? data[k] : (fallback ?? defaults[k]); },
    set(k, v) {
      const old = data[k];
      data[k] = v;
      save();
      (listeners[k] || []).forEach(fn => { try { fn(v, old); } catch (e) { console.error(e); } });
      (listeners['*'] || []).forEach(fn => { try { fn(k, v, old); } catch (e) {} });
    },
    on(k, fn) { (listeners[k] = listeners[k] || []).push(fn); return () => this.off(k, fn); },
    off(k, fn) { listeners[k] = (listeners[k] || []).filter(f => f !== fn); },
    all() { return Object.assign({}, data); },
    reset() { data = Object.assign({}, defaults); save(); location.reload(); },
    defaults,
    export() { return JSON.stringify(data, null, 2); },
    import(json) {
      try { const parsed = JSON.parse(json); data = Object.assign({}, defaults, parsed); save(); location.reload(); }
      catch (e) { alert('Invalid JSON'); }
    }
  };
})();
