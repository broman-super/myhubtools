// src/app.js - REYNAHUB Main Application (non-module)
(function() {
  var ui = {};
  var router = null;
  var themeManager = null;
  var activeGroup = 'all';

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
      modalClose: document.getElementById('modal-close-btn')
    };

    router = new ReynaHubRouter();
    router.onNavigate = function(info) {
      if (!info) goHome();
      else openTool(info.path, info.hash);
    };

    // Render cards
    ToolCard.renderAll();

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

    // Event listeners
    ui.enterBtn.addEventListener('click', enterWorkspace);
    ui.asideLogo.addEventListener('click', goHome);
    ui.themeBtn.addEventListener('click', function() { themeManager.toggle(); });
    // Modal: satu jalur buka/tutup dengan manajemen fokus (dialog semantics)
    var lastFocus = null;
    function openAbout() {
      lastFocus = document.activeElement;
      ui.about.classList.add('open');
      ui.modalClose.focus();
    }
    function closeAbout() {
      ui.about.classList.remove('open');
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
        } else if (ui.frameCont.style.display === 'block') {
          goHome();
        }
      }
    });

    // Theme broadcast on change
    window.addEventListener('theme-changed', function() {
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
    localStorage.setItem('workspace_entered', 'true');
    setTimeout(function() { router.handleRoute(); }, 300);
  }

  function openTool(path, hash) {
    if (!ui.landing.classList.contains('hide')) {
      ui.landing.classList.add('hide');
      ui.workspace.classList.add('active');
    }

    showFrame(path);

    // Highlight nav grup pemilik kartu (grup tidak lagi diturunkan dari prefix hash)
    var owner = hash ? document.querySelector('.bento-card[data-hash="' + hash + '"]') : null;
    activeGroup = owner ? owner.getAttribute('data-group') : 'all';
    setActiveNav(activeGroup);
  }

  function showFrame(toolPath) {
    var db = ui.dbView;
    var frame = ui.frameCont;
    db.style.opacity = '0';
    setTimeout(function() {
      db.style.display = 'none';
      frame.style.display = 'block';
      frame.classList.add('loading');
      ui.frame.src = toolPath;
      ui.frame.onload = function() {
        frame.classList.remove('loading');
        broadcastCurrentTheme();
      };
      ui.frame.onerror = function() {
        frame.classList.remove('loading');
        frame.style.opacity = '1';
        ui.frame.style.display = 'none';
        var errEl = document.createElement('div');
        errEl.style.cssText = 'text-align:center;padding:40px;opacity:0.5;';
        errEl.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Gagal memuat modul';
        frame.appendChild(errEl);
      };
      frame.style.opacity = '0';
      setTimeout(function() { frame.style.opacity = '1'; }, 50);
    }, 300);
  }

  function goHome() {
    ui.frameCont.style.opacity = '0';
    ui.frame.src = '';
    ui.frame.onload = null;
    ui.frame.onerror = null;
    setTimeout(function() {
      ui.frameCont.style.display = 'none';
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
      btns[i].classList.toggle('active', btns[i].getAttribute('data-group') === group);
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

    var totalVisible = document.querySelectorAll('.bento-card:not(.hidden-card)').length;
    var emptyEl = document.getElementById('search-empty');
    if (emptyEl) emptyEl.style.display = totalVisible === 0 ? 'block' : 'none';
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
      router.handleRoute();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
