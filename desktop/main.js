'use strict';

// ReynaHub desktop — pembungkus tipis untuk https://reynahub.web.id.
// Aplikasi ini SENGAJA tidak membundel aset tool: situs dimuat langsung dari
// GitHub Pages supaya update tool tidak perlu install ulang aplikasi.
// Satu-satunya berkas lokal adalah offline.html (layar "internet mati").

const { app, BrowserWindow, Menu, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_URL = 'https://reynahub.web.id/';
const APP_ORIGIN = new URL(APP_URL).origin;

const PROBE_TIMEOUT_MS = 6000;  // batas satu percobaan koneksi
const RETRY_MS = 5000;          // jeda coba ulang saat layar offline tampil
const WATCH_MS = 30000;         // cek berkala selama aplikasi online
const MISS_LIMIT = 2;           // gagal berturut-turut sebelum dianggap offline
const DEFAULT_BOUNDS = { width: 1280, height: 800 };

let win = null;
let retryTimer = null;
let watchTimer = null;
let stateTimer = null;
let misses = 0;
let showingOffline = false;

// ---------- simpan ukuran/posisi jendela ----------
function statePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8')) || {};
  } catch (e) {
    return {};
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
    fs.writeFileSync(statePath(), JSON.stringify(win.getNormalBounds()));
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
    const res = await fetch(APP_URL + '?ping=' + Date.now(), {
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

function isInternal(url) {
  if (!url) return false;
  if (url.startsWith('file://')) return true;
  return url.startsWith(APP_ORIGIN);
}

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

// ---------- alur online / offline ----------
function showApp() {
  if (!win || win.isDestroyed()) return;
  clearTimers();
  misses = 0;
  showingOffline = false;
  win.loadURL(APP_URL);
  watchTimer = setInterval(async () => {
    if (await probe()) {
      misses = 0;
      return;
    }
    if (++misses >= MISS_LIMIT) showOffline();
  }, WATCH_MS);
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

async function boot() {
  if (await probe()) showApp();
  else showOffline();
}

// ---------- jendela ----------
function createWindow() {
  const saved = usableBounds(readState());
  win = new BrowserWindow({
    ...(saved || DEFAULT_BOUNDS),
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f1115',
    title: 'ReynaHub',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
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
  win.on('closed', () => { win = null; });

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

  // Navigasi utama gagal (internet putus di tengah pemakaian) → layar offline.
  // -3 = ERR_ABORTED, yaitu loadURL baru menggantikan navigasi sebelumnya.
  win.webContents.on('did-fail-load', (event, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    if (!isInternal(url)) return;
    if (url.startsWith('file://') && showingOffline) return;
    showOffline();
  });

  boot();
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
    Menu.setApplicationMenu(null);

    ipcMain.handle('reyna:retry', async () => {
      if (!win || win.isDestroyed()) return false;
      if (await probe()) {
        showApp();
        return true;
      }
      return false;
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => app.quit());
}
