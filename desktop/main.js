'use strict';

// ReynaHub desktop — pembungkus tipis untuk https://reynahub.web.id.
// Aplikasi ini SENGAJA tidak membundel aset tool: situs dimuat langsung dari
// GitHub Pages supaya update tool tidak perlu install ulang aplikasi.
//
// Mode shell: halaman dimuat dengan `?shell=1` sehingga hub menyembunyikan
// landing dan sidebar-nya sendiri; navigasi disediakan menu jendela native di
// bawah ini. Tool tetap berjalan di dalam iframe hub, jadi sinkronisasi tema
// lewat postMessage (window.parent) tidak berubah.

const { app, BrowserWindow, Menu, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Bisa ditimpa untuk uji lokal: REYNA_APP_URL=http://127.0.0.1:8900/
const APP_URL = process.env.REYNA_APP_URL || 'https://reynahub.web.id/';
const APP_ORIGIN = new URL(APP_URL).origin;
const DEFAULT_HASH = '#dashboard';

const PROBE_TIMEOUT_MS = 6000;  // batas satu percobaan koneksi
const RETRY_MS = 5000;          // jeda coba ulang saat layar offline tampil
const WATCH_MS = 30000;         // cek berkala selama aplikasi online
const MISS_LIMIT = 2;           // gagal berturut-turut sebelum dianggap offline
const DEFAULT_BOUNDS = { width: 1280, height: 800 };

const GROUP_LABEL = {
  analitik: 'Analitik & Insight',
  operasional: 'Operasional & Logistik',
  dokumen: 'Dokumen & Arsip',
  tim: 'Perencanaan & Tim'
};

// Setelah deploy, service worker baru (skipWaiting + clients.claim) mengambil
// alih halaman. Tanpa ini jendela tetap memakai CSS/JS lama sampai pengguna
// menekan Ctrl+R sendiri — persis penyebab gap 76px yang terlihat dulu.
// Penanda `refreshing` hanya hidup per muat halaman, jadi tidak ada reload
// berulang, dan deploy berikutnya tetap memicu satu reload lagi.
const WATCH_SW_SCRIPT = `(function () {
  if (!('serviceWorker' in navigator)) return;
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
})();`;

let win = null;
let palette = null;
let retryTimer = null;
let watchTimer = null;
let stateTimer = null;
let misses = 0;
let showingOffline = false;
let tools = [];
let lastHash = DEFAULT_HASH;

// ---------- daftar tool (dihasilkan scripts/build-tools.js) ----------
function loadTools() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools.json'), 'utf8'));
    tools = Array.isArray(raw) ? raw : [];
  } catch (e) {
    tools = [];
    console.warn('[reyna] tools.json belum ada — menu tool kosong. Jalankan: npm run tools');
  }
}

// ---------- simpan ukuran/posisi jendela + tool terakhir ----------
function statePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function readState() {
  try {
    const s = JSON.parse(fs.readFileSync(statePath(), 'utf8')) || {};
    return {
      bounds: s.bounds || null,
      lastHash: typeof s.lastHash === 'string' && s.lastHash ? s.lastHash : DEFAULT_HASH
    };
  } catch (e) {
    return { bounds: null, lastHash: DEFAULT_HASH };
  }
}

// Jendela bisa saja dulu dibuka di monitor yang sekarang sudah dicabut.
function usableBounds(saved) {
  if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return null;
  if (!Number.isFinite(saved.width) || !Number.isFinite(saved.height)) return null;
  const area = screen.getDisplayMatching({
    x: saved.x, y: saved.y, width: saved.width, height: saved.height
  }).workArea;
  const visible =
    saved.x < area.x + area.width - 80 &&
    saved.x + saved.width > area.x + 80 &&
    saved.y < area.y + area.height - 80 &&
    saved.y + saved.height > area.y + 80;
  if (!visible) return null;
  return {
    x: saved.x,
    y: saved.y,
    width: Math.min(Math.max(saved.width, 800), area.width),
    height: Math.min(Math.max(saved.height, 600), area.height)
  };
}

function saveState() {
  if (!win || win.isDestroyed()) return;
  try {
    fs.writeFileSync(statePath(), JSON.stringify({
      bounds: win.getNormalBounds(),
      lastHash: lastHash
    }));
  } catch (e) {
    // gagal menyimpan ukuran bukan alasan untuk mengganggu pemakaian
  }
}

function scheduleStateSave() {
  clearTimeout(stateTimer);
  stateTimer = setTimeout(saveState, 400);
}

// ---------- deteksi koneksi ----------
// navigator.onLine tidak dipakai: WiFi bisa tersambung tanpa internet.
async function probe() {
  try {
    const url = new URL(APP_URL);
    url.searchParams.set('ping', String(Date.now()));
    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
    });
    return res.status < 500;
  } catch (e) {
    return false;
  }
}

function clearTimers() {
  clearTimeout(retryTimer);
  clearInterval(watchTimer);
  retryTimer = null;
  watchTimer = null;
}

function isHubUrl(url) {
  return String(url || '').startsWith(APP_ORIGIN);
}

function isInternal(url) {
  return isHubUrl(url) || String(url || '').startsWith('file://');
}

// Jendela bisa saja masih di about:blank saat menu diklik.
function isShellPage(url) {
  try {
    return new URL(url).searchParams.get('shell') === '1';
  } catch (e) {
    return false;
  }
}

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function hashOf(url) {
  try {
    return new URL(url).hash || DEFAULT_HASH;
  } catch (e) {
    return DEFAULT_HASH;
  }
}

function shellUrl(hash) {
  const url = new URL(APP_URL);
  url.searchParams.set('shell', '1');
  return url.href + (hash && hash !== DEFAULT_HASH ? hash : '');
}

// ---------- alur online / offline ----------
function startWatch() {
  clearInterval(watchTimer);
  watchTimer = setInterval(async () => {
    if (await probe()) {
      misses = 0;
      return;
    }
    if (++misses >= MISS_LIMIT) showOffline();
  }, WATCH_MS);
}

function showApp() {
  if (!win || win.isDestroyed()) return;
  clearTimers();
  misses = 0;
  showingOffline = false;
  win.loadURL(shellUrl(lastHash));
  startWatch();
}

function showOffline() {
  if (!win || win.isDestroyed()) return;
  clearTimers();
  showingOffline = true;
  win.loadFile(path.join(__dirname, 'offline.html'));
  retryTimer = setTimeout(async function tick() {
    if (!win || win.isDestroyed()) return;
    if (await probe()) {
      showApp();
      return;
    }
    retryTimer = setTimeout(tick, RETRY_MS);
  }, RETRY_MS);
}

// Navigasi dari menu/palette. Saat situs sudah terbuka, pakai hash supaya
// pindah tool tidak memuat ulang seluruh halaman (hub menangani hashchange).
async function openHash(hash) {
  const target = hash || DEFAULT_HASH;
  lastHash = target;
  scheduleStateSave();
  if (!win || win.isDestroyed()) return;

  if (!(await probe())) {
    showOffline();
    return;
  }
  clearTimers();
  misses = 0;

  const current = win.webContents.getURL();
  if (!showingOffline && isHubUrl(current) && isShellPage(current)) {
    try {
      await win.webContents.executeJavaScript(
        'window.location.hash = ' + JSON.stringify(target) + ';'
      );
      startWatch();
      return;
    } catch (e) {
      // halaman belum siap → jatuh ke muat ulang penuh
    }
  }
  showApp();
}

async function boot(saved) {
  lastHash = saved.lastHash;
  if (await probe()) showApp();
  else showOffline();
}

// ---------- palette pencarian tool (Ctrl+K) ----------
function closePalette() {
  if (palette && !palette.isDestroyed()) palette.destroy();
  palette = null;
}

function openPalette() {
  if (!win || win.isDestroyed()) return;
  if (palette && !palette.isDestroyed()) {
    palette.focus();
    return;
  }
  palette = new BrowserWindow({
    width: 640,
    height: 460,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: win,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  palette.loadFile(path.join(__dirname, 'palette.html'));
  palette.once('ready-to-show', () => {
    if (palette && !palette.isDestroyed()) palette.show();
  });
  palette.on('blur', closePalette);
  palette.on('closed', () => { palette = null; });
}

// ---------- menu native ----------
function buildMenu() {
  const toolMenus = Object.keys(GROUP_LABEL)
    .filter((g) => tools.some((t) => t.group === g))
    .map((g) => ({
      label: GROUP_LABEL[g] || g,
      submenu: tools.filter((t) => t.group === g).map((t) => ({
        label: t.title,
        click: () => { openHash(t.hash); }
      }))
    }));

  const template = [
    {
      label: 'ReynaHub',
      submenu: [
        { label: 'Beranda', accelerator: 'Alt+Left', click: () => { openHash(DEFAULT_HASH); } },
        { label: 'Cari Tool…', accelerator: 'CommandOrControl+K', click: () => { openPalette(); } },
        { type: 'separator' },
        {
          label: 'Muat ulang halaman',
          accelerator: 'CommandOrControl+R',
          click: () => { if (win && !win.isDestroyed()) win.webContents.reload(); }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Keluar' }
      ]
    },
    ...toolMenus,
    {
      label: 'Tampilan',
      submenu: [
        { role: 'togglefullscreen', label: 'Layar penuh' },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Perbesar' },
        { role: 'zoomOut', label: 'Perkecil' },
        { role: 'resetZoom', label: 'Ukuran normal' },
        ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools', label: 'DevTools' }])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function titleFor(url) {
  const tool = tools.find((t) => t.hash === hashOf(url));
  return tool ? 'ReynaHub — ' + tool.title : 'ReynaHub';
}

// ---------- jendela ----------
function createWindow() {
  const stored = readState();
  const saved = usableBounds(stored.bounds);
  win = new BrowserWindow({
    ...(saved || DEFAULT_BOUNDS),
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f1115',
    title: 'ReynaHub',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => win.show());
  win.on('resize', scheduleStateSave);
  win.on('move', scheduleStateSave);
  win.on('close', saveState);
  win.on('closed', () => { win = null; closePalette(); });

  // Tautan keluar (mis. link di tool) dibuka di browser, bukan di dalam aplikasi.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isInternal(url)) return;
    event.preventDefault();
    openExternal(url);
  });

  // Judul jendela mengikuti tool yang sedang dibuka.
  const refreshTitle = (url) => {
    if (!win || win.isDestroyed()) return;
    // Layar offline dimuat dari file:// tanpa hash. Kalau lastHash ikut ditimpa,
    // tool terakhir hilang dan aplikasi kembali ke beranda setelah internet pulih.
    if (isHubUrl(url)) {
      const next = hashOf(url);
      if (next !== lastHash) {
        lastHash = next;
        scheduleStateSave();
      }
    }
    win.setTitle(titleFor(url));
  };
  win.webContents.on('did-navigate', (e, url) => refreshTitle(url));
  win.webContents.on('did-navigate-in-page', (e, url) => refreshTitle(url));

  // Hanya halaman hub (bukan layar offline/palette) yang punya service worker.
  win.webContents.on('dom-ready', () => {
    if (!win || win.isDestroyed()) return;
    if (!isHubUrl(win.webContents.getURL())) return;
    win.webContents.executeJavaScript(WATCH_SW_SCRIPT).catch(() => {});
  });

  // Navigasi utama gagal (internet putus di tengah pemakaian) → layar offline.
  // -3 = ERR_ABORTED, yaitu loadURL baru menggantikan navigasi sebelumnya.
  win.webContents.on('did-fail-load', (event, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    if (!isInternal(url)) return;
    if (url.startsWith('file://') && showingOffline) return;
    showOffline();
  });

  boot(stored);
}

// ---------- siklus hidup ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId('id.reynahub.desktop');

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    loadTools();
    buildMenu();

    ipcMain.handle('reyna:retry', async () => {
      if (!win || win.isDestroyed()) return false;
      if (await probe()) {
        showApp();
        return true;
      }
      return false;
    });

    // `reyna:open` hanya untuk palette (file://). Halaman situs memakai preload
    // yang sama, jadi tanpa cek pengirim sebuah tool bisa memicu navigasi sendiri.
    const fromFile = (event) => {
      const url = event && event.senderFrame ? event.senderFrame.url : '';
      return String(url || '').startsWith('file://');
    };

    ipcMain.handle('reyna:tools', () => tools.map((t) => ({
      group: t.group,
      groupLabel: GROUP_LABEL[t.group] || t.group,
      title: t.title, desc: t.desc, hash: t.hash
    })));

    ipcMain.handle('reyna:open', (event, hash) => {
      if (!fromFile(event)) return false;
      if (typeof hash !== 'string' || hash.charAt(0) !== '#') return false;
      closePalette();
      openHash(hash);
      return true;
    });

    ipcMain.on('reyna:close', () => { closePalette(); });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => app.quit());
}
