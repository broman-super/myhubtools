// src/app.js - REYNAHUB Main Application (non-module)
(function() {
  var ui = {};
  var router = null;
  var themeManager = null;
  var activeGroup = 'all';

  // Elemen yang tidak aktif harus keluar dari tab order + a11y tree (opacity:0 saja tidak cukup)
  function setInert(el, on) {
    if (!el) return;
    el.inert = !!on;
    if (on) el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
  }

  function setToolOpen(on) {
    if (ui.workspace) ui.workspace.classList.toggle('is-tool-open', !!on);
    if (ui.asideLogo) {
      ui.asideLogo.setAttribute(
        'aria-label',
        on ? 'Kembali ke workspace' : 'REYNAHUB, beranda workspace'
      );
    }
  }

  function init() {
    ui = {
      landing: document.getElementById('landing-page'),
      workspace: document.getElementById('workspace'),
      dbView: document.getElementById('dashboard-view'),
      frameCont: document.getElementById('frame-container'),
      frame: document.getElementById('main-frame'),
      navBtns: document.querySelectorAll('.nav-list .nav-btn'),
      search: document.getElementById('toolSearch'),
      about: document.getElementById('aboutModal'),
      enterBtn: document.getElementById('enter-btn'),
      themeBtn: document.getElementById('theme-btn'),
      aboutBtn: document.getElementById('about-btn'),
      asideLogo: document.getElementById('aside-logo'),
      hubBack: document.getElementById('hub-back'),
      modalClose: document.getElementById('modal-close-btn')
    };

    router = new ReynaHubRouter();
    router.onNavigate = function(info) {
      if (!info) goHome();
      else openTool(info.path, info.hash);
    };

    // Render cards
    ToolCard.renderAll();
    setInert(ui.workspace, true);

    // Label manifest diisi dari data kartu (anti-hardcode jumlah modul)
    var countIn = function(id, sel) {
      var el = document.getElementById(id);
      if (el) el.textContent = String(document.querySelectorAll(sel).length);
    };
    countIn('count-total', '.bento-card');
    countIn('count-categories', '.group-section');
    countIn('count-header', '.bento-card');
    countIn('count-groups', '.group-section');

    // Daftar modul di modal dibangun dari konfigurasi kartu (satu sumber kebenaran)
    var aboutList = document.getElementById('about-modules');
    if (aboutList) {
      var listHtml = '';
      for (var mi = 0; mi < ToolCard.configs.length; mi++) {
        var mcfg = ToolCard.configs[mi];
        listHtml += '<li><button type="button" class="about-link" data-hash="' + mcfg.hash + '">' +
          '<strong>' + mcfg.title + '</strong><span>' + mcfg.desc + '</span></button></li>';
      }
      aboutList.innerHTML = listHtml;
      aboutList.addEventListener('click', function(e) {
        var link = e.target.closest('.about-link');
        if (!link) return;
        localStorage.setItem('workspace_entered', 'true');
        closeAbout();
        router.navigate(link.getAttribute('data-hash'));
      });
    }

    // Badge RND Roadmap: angka notifikasi dibaca dari localStorage (ditulis oleh tool)
    var updateRndBadge = function() {
      var badge = document.getElementById('badge-rnd-roadmap');
      if (!badge) return;
      var n = parseInt(localStorage.getItem('rnd-alert-count') || '0', 10) || 0;
      if (n > 0) {
        badge.textContent = n > 99 ? '99+' : String(n);
        badge.removeAttribute('hidden');
      } else {
        badge.setAttribute('hidden', '');
      }
    };
    updateRndBadge();
    setInterval(updateRndBadge, 5000);

    // Theme — use ThemeManager singleton, migrate old key
    if (localStorage.getItem('theme') && !localStorage.getItem('reynahub-theme')) {
      localStorage.setItem('reynahub-theme', localStorage.getItem('theme'));
    }
    themeManager = new ThemeManager();

    function syncShellChrome() {
      var dark = themeManager && themeManager.getEffectiveTheme();
      if (ui.themeBtn) {
        ui.themeBtn.setAttribute('aria-label', dark ? 'Ubah ke tema terang' : 'Ubah ke tema gelap');
      }
    }

    function restoreBackgroundInert() {
      var landingShown = ui.landing && !ui.landing.classList.contains('hide');
      setInert(ui.landing, !landingShown);
      setInert(ui.workspace, landingShown);
    }

    // Event listeners
    ui.enterBtn.addEventListener('click', enterWorkspace);
    ui.asideLogo.addEventListener('click', goHome);
    if (ui.hubBack) ui.hubBack.addEventListener('click', goHome);
    ui.themeBtn.addEventListener('click', function() { themeManager.toggle(); });
    syncShellChrome();
    // Modal: satu jalur buka/tutup dengan manajemen fokus (dialog semantics)
    var lastFocus = null;
    function openAbout() {
      lastFocus = document.activeElement;
      setInert(ui.landing, true);
      setInert(ui.workspace, true);
      ui.about.classList.add('open');
      ui.about.removeAttribute('aria-hidden');
      ui.modalClose.focus();
    }
    function closeAbout() {
      ui.about.classList.remove('open');
      ui.about.setAttribute('aria-hidden', 'true');
      restoreBackgroundInert();
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
      lastFocus = null;
    }
    ui.aboutBtn.addEventListener('click', openAbout);
    ui.modalClose.addEventListener('click', closeAbout);
    ui.about.addEventListener('click', function(e) { if (e.target === ui.about) closeAbout(); });
    var enterModules = document.getElementById('enter-modules');
    if (enterModules) enterModules.addEventListener('click', openAbout);
    // Focus trap saat modal terbuka
    ui.about.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab') return;
      var f = ui.about.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var searchTimer;
    ui.search.addEventListener('input', function(e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() { searchTools(); }, 300);
    });

    // Sidebar nav
    for (var i = 0; i < ui.navBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() { filterGroup(btn.dataset.group, btn); });
      })(ui.navBtns[i]);
    }

    // Card clicks (delegated)
    document.addEventListener('click', function(e) {
      var card = e.target.closest('.bento-card');
      if (card) {
        var hash = card.getAttribute('data-hash');
        if (hash) router.navigate(hash);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (ui.about.classList.contains('open')) {
          closeAbout();
        } else if (ui.frameCont.classList.contains('is-open')) {
          goHome();
        }
      }
    });

    // Theme broadcast on change
    window.addEventListener('theme-changed', function() {
      syncShellChrome();
      broadcastCurrentTheme();
    });

    // Respond to theme requests + child theme changes (hub = sumber kebenaran)
    window.addEventListener('message', function(e) {
      if (!e.data) return;
      var isChild = false;
      var frames = document.querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === e.source) { isChild = true; break; }
      }
      if (!isChild) return;
      if (e.data.type === 'request-theme') {
        var theme = themeManager && themeManager.getEffectiveTheme() ? 'dark' : 'light';
        e.source.postMessage({ type: 'SET_THEME', theme: theme }, '*');
      } else if (e.data.type === 'THEME_CHANGED' && (e.data.theme === 'dark' || e.data.theme === 'light')) {
        if (themeManager) {
          themeManager.currentTheme = e.data.theme;
          themeManager.applyTheme();
        }
      }
    });

    restoreLanding();
  }

  function enterWorkspace() {
    ui.landing.classList.add('hide');
    ui.workspace.classList.add('active');
    setInert(ui.landing, true);
    setInert(ui.workspace, false);
    localStorage.setItem('workspace_entered', 'true');
    setTimeout(function() { router.handleRoute(); }, 300);
  }

  function openTool(path, hash) {
    if (!ui.landing.classList.contains('hide')) {
      ui.landing.classList.add('hide');
      ui.workspace.classList.add('active');
      setInert(ui.landing, true);
      setInert(ui.workspace, false);
    }

    // Nama frame = judul modul, supaya screen reader tahu isi iframe
    var owner = hash ? document.querySelector('.bento-card[data-hash="' + hash + '"]') : null;
    ui.frame.title = owner ? owner.querySelector('h3').textContent : 'Modul workspace';

    // Mulai unduh modul selama fade dashboard 300ms, bukan setelahnya
    // (dulu src baru diset di dalam setTimeout, +0,3s ke setiap buka modul)
    ui.frameLoad = false;
    ui.frame.onload = function() {
      ui.frameLoad = true;
      ui.frameCont.classList.remove('loading');
      broadcastCurrentTheme();
    };
    ui.frame.onerror = function() {
      ui.frameCont.classList.remove('loading');
      ui.frameCont.style.opacity = '1';
      ui.frame.style.display = 'none';
      var errEl = document.createElement('div');
      errEl.style.cssText = 'text-align:center;padding:40px;opacity:0.5;';
      errEl.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Gagal memuat modul';
      frameCont.appendChild(errEl);
    };
    if (ui.frame.getAttribute('src') !== path) ui.frame.setAttribute('src', path);

    showFrame();
    setToolOpen(true);

    // Highlight nav grup pemilik kartu (grup tidak lagi diturunkan dari prefix hash)
    activeGroup = owner ? owner.getAttribute('data-group') : 'all';
    setActiveNav(activeGroup);
  }

  function showFrame() {
    // src sudah diset oleh openTool: unduhan modul paralel dengan fade dashboard
    // (dulu menunggu 300ms kosong sebelum src diset).
    var db = ui.dbView;
    var frame = ui.frameCont;
    db.style.opacity = '0';
    openFrameTimer = setTimeout(function() {
      db.style.display = 'none';
      frame.style.display = 'flex';
      frame.classList.add('is-open');
      if (!ui.frameLoad) frame.classList.add('loading');
      frame.style.opacity = '0';
      setTimeout(function() { frame.style.opacity = '1'; }, 50);
    }, 300);
  }

  var openFrameTimer;

  function goHome() {
    router.reset();
    setToolOpen(false);
    clearTimeout(openFrameTimer);
    ui.frameLoad = false;
    ui.frameCont.style.opacity = '0';
    ui.frame.src = '';
    ui.frame.onload = null;
    ui.frame.onerror = null;
    openFrameTimer = setTimeout(function() {
      ui.frameCont.style.display = 'none';
      ui.frameCont.classList.remove('is-open');
      ui.dbView.style.display = 'block';
      ui.dbView.style.opacity = '1';
      ui.dbView.scrollTop = 0;
    }, 300);

    setActiveNav(activeGroup);
    ui.search.value = '';
    searchTools();
  }

  function setActiveNav(group) {
    var btns = document.querySelectorAll('.nav-list .nav-btn');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-group') === group;
      btns[i].classList.toggle('active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  // Section tampil bila cocok grup aktif DAN masih punya kartu yang lolos pencarian
  function applyGroupFilter() {
    var secs = document.querySelectorAll('.group-section');
    for (var i = 0; i < secs.length; i++) {
      var g = secs[i].getAttribute('data-group');
      var hasCard = secs[i].querySelector('.bento-card:not(.hidden-card)') !== null;
      secs[i].classList.toggle('hidden', !hasCard || (activeGroup !== 'all' && g !== activeGroup));
    }
  }

  function filterGroup(type, el) {
    router.navigate('#dashboard');

    activeGroup = type;
    setActiveNav(type);
    applyGroupFilter();
  }

  function searchTools() {
    var query = ui.search.value.toLowerCase().trim();
    var cards = document.querySelectorAll('.bento-card');

    for (var i = 0; i < cards.length; i++) {
      var keywords = cards[i].getAttribute('data-search') || '';
      var hidden = keywords.indexOf(query) === -1;
      cards[i].classList.toggle('hidden-card', hidden);
      cards[i].setAttribute('tabindex', hidden ? '-1' : '0');
    }

    // Visibilitas section: gabungan filter grup + hasil pencarian
    applyGroupFilter();

    // Hitung hanya kartu di section yang benar-benar tampil (filter grup + pencarian)
    var totalVisible = document.querySelectorAll('.group-section:not(.hidden) .bento-card:not(.hidden-card)').length;
    var emptyEl = document.getElementById('search-empty');
    if (emptyEl) emptyEl.style.display = totalVisible === 0 ? 'block' : 'none';
    var statusEl = document.getElementById('search-status');
    if (statusEl) statusEl.textContent = totalVisible === 0 ? 'Tidak ada modul yang cocok' : totalVisible + ' modul ditemukan';
  }

  function broadcastCurrentTheme() {
    var isDark = themeManager ? themeManager.getEffectiveTheme() : false;
    var theme = isDark ? 'dark' : 'light';
    if (ui.frame && ui.frame.contentWindow) {
      ui.frame.contentWindow.postMessage({ type: 'SET_THEME', theme: theme }, '*');
    }
  }

  function restoreLanding() {
    // Landing SELALU tampil di awal; hanya deep-link hash yang langsung membuka modul
    var hasHash = window.location.hash !== '' && window.location.hash !== '#';
    if (hasHash) {
      ui.landing.style.display = 'none';
      ui.landing.classList.add('hide');
      ui.workspace.classList.add('active');
      setInert(ui.landing, true);
      setInert(ui.workspace, false);
      router.handleRoute();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
