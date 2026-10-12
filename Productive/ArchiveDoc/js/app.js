/* ============================================================
   SPPD Toolbox — bootstrap: stok SPT, render nav, hash router,
   event delegation, A.reload.
   ============================================================ */
(function (A) {
  var store = A.store;
  var ui = A;

  /* ---------- status koneksi cloud (GAS bridge) ---------- */
  function connCopy(state) {
    if (state === 'online') {
      return { badge: '☁ Tersambung', color: '#059669',
        title: 'Data tersinkron ke cloud (Supabase via GAS).',
        footer: 'Tersambung ke cloud — data ikut pindah perangkat.' };
    }
    if (state === 'error') {
      return { badge: '⚠ Offline', color: '#D97706',
        title: 'Gagal menyambung cloud. Data aman di browser ini dan akan disinkronkan saat tersambung lagi.',
        footer: 'Gagal menyambung cloud — data aman di browser ini, akan disinkronkan saat tersambung.' };
    }
    return { badge: 'Lokal', color: '#64748b',
      title: 'Belum ada cloud. Data hanya tersimpan di browser ini.',
      footer: 'Belum tersambung ke GAS & Supabase — data tersimpan di browser ini. Lihat halaman Pengaturan.' };
  }
  function paintConn(state) {
    var c = connCopy(state);
    var b = ui.$('#conn-badge');
    if (b) {
      b.textContent = c.badge;
      b.style.color = c.color;
      b.setAttribute('title', c.title);
    }
    var f = ui.$('#conn-footer');
    if (f) f.textContent = c.footer;
  }

  /* Navigasi dikelompokkan: Kerja (alur tugas) · Katalog (master) · Bantuan.
     "Produk Dagangan" = barang yang dijual; "Barang Bawaan" = alat/perbekalan
     non-dagangan — supaya dua katalog tidak lagi tampak kembar. */
  var NAV = [
    { group: 'Kerja', items: [
      { href: '#/dashboard', label: 'Dashboard' },
      { href: '#/events', label: 'Event & Tugas' },
      { href: '#/archive', label: 'Arsip' },
      { href: '#/reports', label: 'Rekap Global' }
    ] },
    { group: 'Katalog', items: [
      { href: '#/products', label: 'Produk Dagangan' },
      { href: '#/master', label: 'Barang Bawaan' }
    ] },
    { group: 'Bantuan', items: [
      { href: '#/guide', label: 'Panduan' },
      { href: '#/settings', label: 'Pengaturan' }
    ] }
  ];

  function navItem(n, active) {
    return '<a href="' + n.href + '" data-action="nav:go" data-href="' + n.href + '" ' +
      (active ? 'aria-current="page" ' : '') +
      'class="whitespace-nowrap px-3 py-2 text-sm font-bold rounded-full transition ' +
      (active ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-line') + '">' +
      ui.esc(n.label) + '</a>';
  }

  function renderNav(h) {
    var activeKey = 'dashboard';
    if (h.indexOf('#/events') === 0) activeKey = 'events';
    else if (h.indexOf('#/archive') === 0) activeKey = 'archive';
    else if (h.indexOf('#/products') === 0) activeKey = 'products';
    else if (h.indexOf('#/master') === 0) activeKey = 'master';
    else if (h.indexOf('#/reports') === 0) activeKey = 'reports';
    else if (h.indexOf('#/guide') === 0) activeKey = 'guide';
    else if (h.indexOf('#/settings') === 0) activeKey = 'settings';

    var html = NAV.map(function (g, gi) {
      var inner = g.items.map(function (n) {
        return navItem(n, activeKey === n.href.replace('#/', ''));
      }).join('');
      var sep = gi > 0 ? '<span class="nav-sep" aria-hidden="true"></span>' : '';
      return sep + '<span class="nav-group-label">' + ui.esc(g.group) + '</span>' + inner;
    }).join('');
    var top = ui.$('#topnav'); if (top) top.innerHTML = html;
    var mob = ui.$('#mobilenav'); if (mob) mob.innerHTML = html;

    var evs = store.events();
    var berjalan = evs.filter(function (e) { return e.status === 'berjalan'; }).length;
    var chips = ui.$('#nav-chips');
    if (chips) chips.textContent = berjalan > 0 ? berjalan + ' event berjalan' : berjalan + ' berjalan · ' + evs.length + ' total';
  }

  /* ---------- router ---------- */
  /* Hitung HTML untuk sebuah hash. Mengembalikan null bila event
     yang diminta tidak ada (agar pemanggil bisa mengalihkan). */
  function routeHTML(h) {
    var m = h.match(/^#\/events\/([^/]+)(?:\/(\w+))?/);
    if (m) {
      var ev = store.getEvent(m[1]);
      return ev ? A.pages.eventDetail(m[1], m[2]) : null;
    }
    if (h.indexOf('#/events') === 0) return A.pages.eventsList();
    if (h.indexOf('#/archive') === 0) return A.pages.archive();
    if (h.indexOf('#/products') === 0) return A.products();
    if (h.indexOf('#/master') === 0) return A.master();
    if (h.indexOf('#/reports') === 0) return A.reports();
    if (h.indexOf('#/guide') === 0) return A.guide();
    if (h.indexOf('#/settings') === 0) return A.settings();
    return A.pages.dashboard();
  }

  function render() {
    var h = location.hash || '#/dashboard';
    var app = ui.$('#app');
    var html = routeHTML(h);
    if (html === null) { location.hash = '#/events'; return; }
    app.innerHTML = html;
    renderNav(h);
  }

  /* ---------- jaga konteks saat reload ringan ---------- */
  function captureAccordion() {
    var open = [];
    ui.$$('#app .psec').forEach(function (s) {
      if (s.id && !s.classList.contains('closed')) open.push(s.id);
    });
    return open;
  }

  function applyAccordion(open) {
    ui.$$('#app .psec').forEach(function (s) {
      if (!s.id) return;
      var isOpen = open.indexOf(s.id) >= 0;
      s.classList.toggle('closed', !isOpen);
      var f = s.querySelector('.psec-fold');
      if (f) { f.textContent = isOpen ? '▾' : '▸'; f.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); }
    });
  }

  /* Salin nilai field teks/angka/select dari node lama ke node baru
     (bukan checkbox/radio) supaya isian yang belum disimpan tidak hilang. */
  function carryValues(live, fresh) {
    ui.$$('input, select, textarea', live).forEach(function (oldEl) {
      if (!oldEl.id) return;
      var t = oldEl.type;
      if (t === 'checkbox' || t === 'radio' || t === 'file') return;
      var newEl = fresh.querySelector('[id="' + oldEl.id + '"]');
      if (!newEl || newEl.nodeName !== oldEl.nodeName) return;
      if (newEl.nodeName === 'SELECT') {
        var has = false;
        for (var i = 0; i < newEl.options.length; i++) { if (newEl.options[i].value === oldEl.value) { has = true; break; } }
        if (has) newEl.value = oldEl.value;
      } else {
        newEl.value = oldEl.value;
      }
    });
  }

  /* Render ulang penuh, tetapi pertahankan posisi scroll & seksi terbuka. */
  A.reload = function () {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var open = captureAccordion();
    render();
    applyAccordion(open);
    window.scrollTo(0, y);
  };

  /* Re-render hanya node yang cocok (aksi ringan): pertahankan nilai field,
     status lipat, scroll, lalu fokuskan elemen pilihan bila ada. */
  A.reloadAt = function (selectors, focusSel) {
    var app = ui.$('#app');
    if (!app) { A.reload(); return; }
    var h = location.hash || '#/dashboard';
    var html = routeHTML(h);
    if (html === null) { A.reload(); return; }
    var frame = document.createElement('div');
    frame.innerHTML = html;
    var replaced = false;
    (selectors || []).forEach(function (sel) {
      var live = app.querySelector(sel);
      var fresh = frame.querySelector(sel);
      if (!live || !fresh) return;
      if (live.classList.contains('psec') && fresh.classList.contains('psec')) {
        var closed = live.classList.contains('closed');
        fresh.classList.toggle('closed', closed);
        var lf = live.querySelector('.psec-fold');
        var ff = fresh.querySelector('.psec-fold');
        if (ff) { ff.textContent = closed ? '▸' : '▾'; ff.setAttribute('aria-expanded', closed ? 'false' : 'true'); }
      }
      carryValues(live, fresh);
      live.parentNode.replaceChild(fresh, live);
      replaced = true;
    });
    if (!replaced) { A.reload(); return; }
    renderNav(h);
    if (focusSel) {
      var el = app.querySelector(focusSel);
      if (el && el.focus) { try { el.focus(); } catch (e) {} }
    }
  };

  function readData(el) {
    var d = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.indexOf('data-') === 0 && a.name !== 'data-action') d[a.name.slice(5)] = a.value;
    }
    return d;
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;
    var action = el.getAttribute('data-action');
    var h = ui.actions[action];
    if (!h) return;
    e.preventDefault();
    h(el, readData(el));
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || !el.hasAttribute || !el.hasAttribute('data-action')) return;
    var h = ui.actions[el.getAttribute('data-action')];
    if (h) h(el, readData(el));
  });

  /* Navigasi keyboard untuk tab (role="tab"): panah/Home/End pindah tab. */
  document.addEventListener('keydown', function (e) {
    var el = e.target;
    if (!el || !el.closest) return;
    var tab = el.closest('[role="tab"]');
    if (!tab || !tab.parentNode) return;
    var tabs = Array.prototype.slice.call(tab.parentNode.querySelectorAll('[role="tab"]'));
    if (tabs.length < 2) return;
    var i = tabs.indexOf(tab), next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;
    e.preventDefault();
    next.focus();
    next.click();
  });

  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); render(); });

  /* Percepat: Ctrl/Cmd+S menyimpan form utama yang sedang tampil
     (SPPD, pengaturan, dll) tanpa menggulir ke tombol Simpan. */
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
    var scope = ui.$('#modal-root .modal') || ui.$('#app');
    if (!scope) return;
    var btns = scope.querySelectorAll('[data-action$=":save"]');
    var btn = null;
    for (var i = 0; i < btns.length; i++) { if (btns[i].offsetParent !== null) { btn = btns[i]; break; } }
    if (!btn) return;
    e.preventDefault();
    btn.click();
  });

  function boot() {
    window.scrollTo(0, 0);
    render();
    store.onConn(paintConn);
    if (store.hasCloud()) {
      store.remoteLoad(function (err) { if (!err) { A.reload(); } });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.SPT);