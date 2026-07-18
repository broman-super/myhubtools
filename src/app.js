// src/app.js - REYNAHUB Main Application (non-module)
(function() {
  var ui = {};
  var router = null;

  function init() {
    ui = {
      landing: document.getElementById('landing-page'),
      workspace: document.getElementById('workspace'),
      dbView: document.getElementById('dashboard-view'),
      frameCont: document.getElementById('frame-container'),
      frame: document.getElementById('main-frame'),
      navBtns: document.querySelectorAll('.nav-list .nav-btn'),
      secProd: document.getElementById('section-productive'),
      secUtil: document.getElementById('section-universal'),
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

    // Event listeners
    ui.enterBtn.addEventListener('click', enterWorkspace);
    ui.asideLogo.addEventListener('click', goHome);
    ui.themeBtn.addEventListener('click', toggleTheme);
    ui.aboutBtn.addEventListener('click', function() { ui.about.classList.add('open'); });
    ui.modalClose.addEventListener('click', function() { ui.about.classList.remove('open'); });
    ui.about.addEventListener('click', function(e) { if (e.target === ui.about) ui.about.classList.remove('open'); });
    ui.search.addEventListener('input', searchTools);

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
          ui.about.classList.remove('open');
        } else if (ui.frameCont.style.display === 'block') {
          goHome();
        }
      }
    });

    // Init
    restoreTheme();
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

    ui.dbView.style.display = 'none';
    ui.frameCont.style.display = 'block';

    // Set onload BEFORE changing src to avoid race condition
    ui.frame.onload = function() {
      broadcastTheme(document.documentElement.getAttribute('data-theme') || 'light');
    };

    if (ui.frame.src !== path) {
      ui.frame.src = path;
    } else {
      broadcastTheme(document.documentElement.getAttribute('data-theme') || 'light');
    }

    // Highlight correct sidebar nav
    for (var i = 0; i < ui.navBtns.length; i++) ui.navBtns[i].classList.remove('active');
    if (hash) {
      var group = hash.split('/')[0].replace('#', '');
      var btn = document.querySelector('.nav-btn[data-group="' + group + '"]');
      if (btn) btn.classList.add('active');
      else document.querySelector('.nav-btn[data-group="all"]').classList.add('active');
    }
  }

  function goHome() {
    ui.dbView.style.display = 'block';
    ui.frameCont.style.display = 'none';
    ui.frame.src = '';
    ui.dbView.scrollTop = 0;

    for (var i = 0; i < ui.navBtns.length; i++) ui.navBtns[i].classList.remove('active');
    document.querySelector('.nav-btn[data-group="all"]').classList.add('active');

    ui.secProd.classList.remove('hidden');
    ui.secUtil.classList.remove('hidden');
    ui.search.value = '';
    searchTools();
  }

  function filterGroup(type, el) {
    router.navigate('#dashboard');

    for (var i = 0; i < ui.navBtns.length; i++) ui.navBtns[i].classList.remove('active');
    el.classList.add('active');

    if (type === 'all') {
      ui.secProd.classList.remove('hidden');
      ui.secUtil.classList.remove('hidden');
    } else if (type === 'productive') {
      ui.secProd.classList.remove('hidden');
      ui.secUtil.classList.add('hidden');
    } else if (type === 'universal') {
      ui.secProd.classList.add('hidden');
      ui.secUtil.classList.remove('hidden');
    }
  }

  function searchTools() {
    var query = ui.search.value.toLowerCase().trim();
    var cards = document.querySelectorAll('.bento-card');

    for (var i = 0; i < cards.length; i++) {
      var keywords = cards[i].getAttribute('data-search') || '';
      cards[i].style.display = keywords.indexOf(query) !== -1 ? 'flex' : 'none';
    }

    // Hide sections with no visible cards
    var sections = [ui.secProd, ui.secUtil];
    for (var s = 0; s < sections.length; s++) {
      var visible = sections[s].querySelectorAll('.bento-card:not([style*="display: none"])');
      if (visible.length === 0) {
        sections[s].classList.add('hidden');
      } else {
        var activeGroup = document.querySelector('.nav-btn[data-group].active');
        var group = activeGroup ? activeGroup.dataset.group : 'all';
        if (group === 'all') {
          sections[s].classList.remove('hidden');
        }
      }
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    broadcastTheme(next);
  }

  function broadcastTheme(theme) {
    if (ui.frame && ui.frame.contentWindow) {
      ui.frame.contentWindow.postMessage({ type: 'SET_THEME', theme: theme }, '*');
    }
  }

  function restoreTheme() {
    var saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }

  function restoreLanding() {
    var entered = localStorage.getItem('workspace_entered');
    var hasHash = window.location.hash !== '' && window.location.hash !== '#';
    if (entered === 'true' || hasHash) {
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
