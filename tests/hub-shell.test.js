// tests/hub-shell.test.js — regresi shell hub: router (hash basi) & toggle tema
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

// Muat file non-modul (kelas global) dengan dependensi browser distub.
function loadClass(rel, name, globals) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  const fn = new Function(
    'window', 'localStorage', 'document', 'requestAnimationFrame',
    src + '\nreturn ' + name + ';'
  );
  return fn(globals.window, globals.localStorage, globals.document, globals.raf);
}

function makeWindow(hash) {
  const w = {
    location: { hash: hash || '', pathname: '/', search: '' },
    replaced: null,
    addEventListener() {},
    dispatchEvent() {},
    matchMedia: function (q) { return { matches: /dark/.test(q) && w.forceDark, addEventListener() {} }; },
    forceDark: false,
    history: {
      replaceState: function (state, title, url) {
        w.replaced = url;
        w.location.hash = url;
      }
    }
  };
  return w;
}

test('router.reset() menetralkan hash supaya modul yang sama bisa dibuka lagi', () => {
  const w = makeWindow('#productive/analytic');
  const R = loadClass('src/core/router.js', 'ReynaHubRouter', {
    window: w, localStorage: {}, document: {}, raf: function (f) { return f(); }
  });
  const router = new R();
  router.currentHash = '#productive/analytic';

  router.reset();

  assert.strictEqual(router.currentHash, '#dashboard', 'currentHash harus kembali ke dashboard');
  assert.strictEqual(w.replaced, '#dashboard', 'hash harus diganti lewat replaceState');
  assert.notStrictEqual(w.location.hash, '#productive/analytic', 'hash modul lama tidak boleh tertinggal');
});

test('router.reset() tidak menyentuh hash kalau sudah di dashboard', () => {
  const w = makeWindow('#dashboard');
  const R = loadClass('src/core/router.js', 'ReynaHubRouter', {
    window: w, localStorage: {}, document: {}, raf: function (f) { return f(); }
  });
  const router = new R();
  router.reset();
  assert.strictEqual(w.replaced, null, 'tidak perlu replaceState');
});

function makeThemeGlobals(forceDark, stored) {
  const store = { 'reynahub-theme': stored || 'system' };
  const localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); }
  };
  const document = {
    documentElement: { setAttribute() {}, classList: { add() {}, remove() {} } },
    querySelectorAll: function () { return []; },
    createElement: function () { return {}; },
    head: { appendChild() {} }
  };
  const w = makeWindow('');
  w.forceDark = forceDark;
  return { window: w, localStorage: localStorage, document: document, raf: function (f) { return f(); } };
}

test('toggle tema dari system + OS terang langsung berubah ke gelap', () => {
  const g = makeThemeGlobals(false, 'system');
  const T = loadClass('src/core/theme-manager.js', 'ThemeManager', g);
  const tm = new T();
  assert.strictEqual(tm.getEffectiveTheme(), false, 'awal harus terang');

  tm.toggle();

  assert.strictEqual(tm.currentTheme, 'dark');
  assert.strictEqual(tm.getEffectiveTheme(), true);
});

test('toggle tema dari system + OS gelap berubah ke terang', () => {
  const g = makeThemeGlobals(true, 'system');
  const T = loadClass('src/core/theme-manager.js', 'ThemeManager', g);
  const tm = new T();
  assert.strictEqual(tm.getEffectiveTheme(), true);

  tm.toggle();

  assert.strictEqual(tm.currentTheme, 'light');
  assert.strictEqual(tm.getEffectiveTheme(), false);
});

test('shell punya landmark, wordmark tombol, dan jalur kembali iframe', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<a class="skip-link" href="#workspace-main">/);
  assert.match(html, /<nav class="nav-list" aria-label="Grup modul">/);
  assert.match(html, /id="aside-logo"[^>]*aria-label="REYNAHUB, beranda workspace"/);
  assert.match(html, /<button type="button" class="aside-logo" id="aside-logo"/);
  assert.match(html, /id="hub-back"/);
  assert.match(html, /Kembali ke workspace/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /id="workspace-main"/);
  assert.match(html, /<h1>Workspace<\/h1>/);
});

test('modal Tentang memakai paragraf arsitektur, bukan manifesto', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<h2 class="modal-title" id="about-title">Tentang REYNAHUB<\/h2>/);
  assert.match(html, /Satu navbar, satu tema, satu bahasa desain/);
  assert.match(html, /id="about-modules"/);
  assert.match(html, /REYNAHUB · reynahub\.web\.id/);
  assert.doesNotMatch(html, /Tentang Kami/);
  assert.doesNotMatch(html, /Pusat Kedaulatan/);
  assert.doesNotMatch(html, /benteng ekselensi/);
});

test('app.js mengunci latar dialog dan menandai grup aktif', () => {
  const src = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  assert.match(src, /setInert\(ui\.landing, true\)/);
  assert.match(src, /setInert\(ui\.workspace, true\)/);
  assert.match(src, /restoreBackgroundInert/);
  assert.match(src, /setAttribute\('aria-pressed'/);
  assert.match(src, /setToolOpen\(true\)/);
  assert.match(src, /hubBack/);
  assert.match(src, /classList\.contains\('is-open'\)/);
});
