const { app, BrowserWindow, Menu, shell, screen, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) { app.quit(); }

// app:// - ilova fayllari ham, tashqi "media" papka (rasm/audio) ham shu orqali beriladi
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: true }
}]);

const stateFile = path.join(app.getPath('userData'), 'window-state.json');
const configFile = path.join(app.getPath('userData'), 'config.json');
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const writeJson = (f, o) => { try { fs.writeFileSync(f, JSON.stringify(o)); } catch {} };

function saveState(win) {
  try { writeJson(stateFile, { ...win.getNormalBounds(), maximized: win.isMaximized(), fullscreen: win.isFullScreen() }); } catch {}
}

// ---- Media papkasini topish (ichida images/ bo'lgan papka) ----
const hasMedia = (d) => { try { return !!d && fs.statSync(path.join(d, 'images')).isDirectory(); } catch { return false; } };

function findMediaDir() {
  const exeDir = path.dirname(process.execPath);
  const portable = process.env.PORTABLE_EXECUTABLE_DIR;
  const candidates = [
    readJson(configFile).mediaDir,
    portable, portable && path.join(portable, 'media'),
    exeDir, path.join(exeDir, 'media'),
    __dirname, path.join(__dirname, 'media')
  ];
  return candidates.find(hasMedia) || null;
}

async function askMediaDir(parent) {
  while (true) {
    const r = await dialog.showOpenDialog(parent, {
      title: "Qur'on rasmlari va audiolari joylashgan papkani tanlang",
      message: "Ichida 'images' va 'audios1' papkalari bo'lgan papkani tanlang",
      properties: ['openDirectory']
    });
    if (r.canceled || !r.filePaths[0]) return null;
    if (hasMedia(r.filePaths[0])) {
      const cfg = readJson(configFile); cfg.mediaDir = r.filePaths[0]; writeJson(configFile, cfg);
      return r.filePaths[0];
    }
    await dialog.showMessageBox(parent, { type: 'warning', message: "Tanlangan papkada 'images' papkasi topilmadi.", buttons: ['OK'] });
  }
}

// ---- app:// handler (Range qo'llab-quvvatlanadi: audio surish/seek ishlashi uchun) ----
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };

function registerHandler(mediaDir) {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const isMedia = /^(images|audios\d*)\//.test(rel);
    const base = path.resolve(isMedia ? (mediaDir || __dirname) : __dirname);
    const full = path.resolve(base, rel);
    if (!full.startsWith(base + path.sep)) return new Response('Forbidden', { status: 403 });
    let st;
    try { st = fs.statSync(full); if (!st.isFile()) throw 0; } catch { return new Response('Not found', { status: 404 }); }

    const headers = { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
    if (m) {
      let start = m[1] === '' ? Math.max(0, st.size - parseInt(m[2], 10)) : parseInt(m[1], 10);
      let end = m[1] === '' || m[2] === '' ? st.size - 1 : Math.min(parseInt(m[2], 10), st.size - 1);
      if (start > end || start >= st.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${st.size}` } });
      headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
      headers['Content-Length'] = String(end - start + 1);
      return new Response(Readable.toWeb(fs.createReadStream(full, { start, end })), { status: 206, headers });
    }
    headers['Content-Length'] = String(st.size);
    return new Response(Readable.toWeb(fs.createReadStream(full)), { status: 200, headers });
  });
}

let win;
async function createWindow() {
  const st = readJson(stateFile);
  const wa = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: st.width || Math.min(1400, wa.width), height: st.height || Math.min(900, wa.height),
    x: st.x, y: st.y, minWidth: 900, minHeight: 600,
    title: "Qur'on tilovati",
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#e6e1d6', show: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  Menu.setApplicationMenu(null);

  let mediaDir = findMediaDir();
  if (!mediaDir) {
    win.show();
    await dialog.showMessageBox(win, { type: 'info', message: "Rasmlar va audio fayllar topilmadi.",
      detail: "Keyingi oynada 'images', 'audios1' (va 'audios2') papkalari joylashgan papkani tanlang. Keyinroq o'zgartirish uchun Ctrl+O bosing.", buttons: ['Tanlash'] });
    mediaDir = await askMediaDir(win);
  }
  registerHandler(mediaDir);
  win.loadURL('app://local/index.html');

  win.once('ready-to-show', () => { if (st.maximized) win.maximize(); win.show(); if (st.fullscreen) win.setFullScreen(true); });

  win.webContents.on('before-input-event', async (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = input.key.toLowerCase();
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'Escape' && win.isFullScreen()) { win.setFullScreen(false); }
    else if (input.control && input.shift && k === 'i') { win.webContents.toggleDevTools(); }
    else if (input.control && k === 'o') { e.preventDefault(); const d = await askMediaDir(win); if (d) { app.relaunch(); app.exit(0); } }
    else if (input.key === 'F5' || (input.control && k === 'r')) { e.preventDefault(); }
  });

  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); shell.openExternal(url); } });
  win.on('close', () => saveState(win));
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
