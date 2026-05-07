# KEM-OS

A static, GitHub Pages-friendly Windows-style web desktop with an Ultraviolet
proxy, 40 apps, and 100+ tweakable settings.

No build step. No bundler. Vanilla HTML/CSS/JS. Drop the repo on GitHub Pages
(or any static host) and it runs.

## Features

- Boot screen, lock screen, sign-in flow.
- Desktop with right-click context menu and pinned icons.
- Draggable, resizable, snappable, minimizable, maximizable windows.
- Taskbar (top/bottom/small/normal), Start menu, Action Center, Power menu.
- 40 built-in apps (see Apps section).
- 100+ tweakable settings persisted to localStorage.
- Theme engine: dark/light, 8 accent colors, wallpapers, blur, density, fonts,
  high contrast, color filters, night light, animation toggle.
- Virtual filesystem (`/Documents`, `/Desktop`, ...) for editors & viewers.
- Built-in **Ultraviolet** proxy integration via service worker.

## GitHub Pages setup

1. Push this repo to GitHub.
2. **Settings → Pages → Source: Deploy from branch** → pick the branch and
   `/ (root)`.
3. Visit your `https://<user>.github.io/<repo>/` URL.

`.nojekyll` is included so GH Pages serves files like `js/uv-config.js` raw.

> If you serve from a sub-path (e.g. `/<repo>/`) the service worker needs the
> proxy assets at `/uv/...`. The simplest fix is to deploy at the **root** of
> a custom domain or `<user>.github.io`. If you must deploy under a sub-path,
> see "Sub-path deployments" below.

## Configuring the proxy

Ultraviolet is split into two halves: a **frontend service worker** (this
repo) and a **bare server** running Node. GitHub Pages can host the
frontend; the bare server has to live somewhere with a runtime.

You can use any TitaniumNetwork-compatible bare server, e.g.
[`@tomphttp/bare-server-node`](https://github.com/tomphttp/bare-server-node).

1. Run a bare server somewhere reachable over HTTPS (Render, Fly.io, Railway,
   Replit, your own VPS, etc).
2. Open KEM-OS → **Settings → Network**:
   - Paste the bare URL into **Bare server URL** (must end with `/`).
   - Click **Register / refresh service worker**.
3. Open the Browser app — pages route through your bare server.

The encoder (XOR/base64/plain) and search engine are configurable in the same
panel. Bookmarks, the proxy console (diagnostics), and Maps live alongside it.

### Sub-path deployments

If your site URL has a path prefix (e.g. `https://user.github.io/kem-os/`),
edit `js/uv-config.js` and `uv/uv.config.js`:

```js
prefix: '/kem-os/uv/service/',
config: '/kem-os/uv/uv.config.js',
sw:     '/kem-os/uv/uv.sw.js',
```

…and register the SW with that scope (the `Proxy.ensureSW()` path in
`js/proxy.js`).

## Apps (40)

File Explorer · Browser (UV) · Notepad · Calculator · Settings · Terminal ·
Paint · Music · Video · Photos · Clock · Calendar · Weather · Camera · Mail ·
Maps · Store · Tasks · Notes · Voice Recorder · Code Editor · Markdown ·
Snake · Tic-Tac-Toe · Minesweeper · 2048 · Pong · Chess · Scientific Calc ·
Color Picker · Unit Converter · Stopwatch · Drawing Pad · Stickies · PDF/Files ·
Task Manager · Proxy Console · Bookmarks · Search · Help & About.

## Settings (100+)

Personalization (18) · Taskbar & Start (14) · System (15) · Sound (5) ·
Display (5) · Notifications (5) · Privacy (7) · Updates (5) · Power (4) ·
Accounts (4) · Network/Proxy (11) · Apps (5) · Gaming (3) · Devices (5) ·
Accessibility (5) · Search & Storage (4) · Lock screen (3) · Backup & Reset (4).

Each row mutates a key in the registry (`localStorage: kemos.registry.v1`)
and the change is reflected live across the OS via an event bus.

## Keyboard

- `Win` / `Meta` (or `Ctrl+Esc`) — toggle Start menu
- `Esc` — close menus
- `Ctrl+S` — save in Notepad/Code/Markdown
- Window arrow snap during drag

## File layout

```
index.html
styles.css
.nojekyll
js/
  uv-config.js   ← UV runtime config (page side)
  registry.js    ← settings store + event bus
  fs.js          ← virtual filesystem
  wm.js          ← window manager
  proxy.js       ← UV SW registration & nav
  apps.js        ← 40 apps
  settings.js    ← 100+ settings panel
  os.js          ← shell: boot, lock, taskbar, start menu, theming
uv/
  uv.config.js   ← UV runtime config (SW side mirror)
  uv.sw.js       ← service worker hosting UV
```

## Notes / caveats

- The bare server is **not** included; you must run/host one.
- Ultraviolet bundle/handler/client are loaded from the jsdelivr CDN
  (`@titaniumnetwork-dev/ultraviolet@3.2.10`). Vendor-locally if you want
  fully offline operation — drop the files into `uv/dist/` and update the URL
  paths in both `uv-config.js` files.
- Some sites block iframing regardless of proxy (frame-ancestors / X-Frame).
- This is for personal/educational use; respect destination sites' ToS.
