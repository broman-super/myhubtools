(function () {
  'use strict';

  var state = window.LATCH.state;
  var db = window.LATCH.db;
  var C = window.LATCH.components;
  var U = window.LATCH.utils;
  var $ = U.$id;

  var A = {};

  function init() {
    window.LATCH.layout.render().then(function () {
      var stored = sessionStorage.getItem('latch-admin');
      if (stored === 'true') {
        state.set({ isAdmin: true, mode: 'dashboard' });
      }
      A.cacheDom();
      window.LATCH.theme.init();
      A.events();
      A.loadData();
    }).catch(function (err) {
      console.error('[App] Layout render failed, using inline fallback', err);
      var stored = sessionStorage.getItem('latch-admin');
      if (stored === 'true') {
        state.set({ isAdmin: true, mode: 'dashboard' });
      }
      A.cacheDom();
      window.LATCH.theme.init();
      A.events();
      A.loadData();
    });
  }

  A.cacheDom = function () {
    A.dom = {
      view: $('viewContent'),
      dash: $('dashboardContent'),
      loginBtn: $('loginBtn'),
      loginModal: $('loginModal'),
      loginPin: $('loginPin'),
      loginErr: $('loginError'),
      loginSub: $('loginSubmit'),
      loginCan: $('loginCancel'),
      logout: $('logoutBtn'),
      addBtn: $('addRowBtn'),
      delModal: $('deleteModal'),
      delYes: $('deleteConfirm'),
      delNo: $('deleteCancel'),
      theme: $('themeToggle'),
      search: $('searchInput'),
      footer: $('footerArea')
    };
  };

  A.events = function () {
    if (A.dom.theme) A.dom.theme.addEventListener('click', window.LATCH.theme.toggle);

    if (A.dom.search) {
      var debouncedSearch = U.debounce(function () {
        window.LATCH.view.onSearch(A.dom.search.value);
      }, 300);
      A.dom.search.addEventListener('input', debouncedSearch);
    }

    document.addEventListener('keydown', A.onKey);

    if (A.dom.loginBtn) A.dom.loginBtn.addEventListener('click', A.showLogin);
    if (A.dom.loginSub) A.dom.loginSub.addEventListener('click', A.doLogin);
    if (A.dom.loginCan) A.dom.loginCan.addEventListener('click', A.hideLogin);
    if (A.dom.loginPin) {
      A.dom.loginPin.addEventListener('keydown', function (e) { if (e.key === 'Enter') A.doLogin(); });
    }
    if (A.dom.loginModal) {
      A.dom.loginModal.addEventListener('click', function (e) { if (e.target === A.dom.loginModal) A.hideLogin(); });
    }

    if (A.dom.logout) A.dom.logout.addEventListener('click', A.doLogout);
    if (A.dom.addBtn) A.dom.addBtn.addEventListener('click', function () { window.LATCH.dashboard.addRow(); });
    if (A.dom.delNo) A.dom.delNo.addEventListener('click', function () { C.hideModal('deleteModal'); });
    if (A.dom.delYes) A.dom.delYes.addEventListener('click', function () { window.LATCH.dashboard.confirmDelete(); });
    if (A.dom.delModal) {
      A.dom.delModal.addEventListener('click', function (e) { if (e.target === A.dom.delModal) C.hideModal('deleteModal'); });
    }
  };

  A.onKey = function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (state.get('mode') === 'dashboard' && $('dashSearchInput')) {
        $('dashSearchInput').focus();
      } else if (A.dom.search) {
        A.dom.search.focus();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      if (state.get('mode') === 'view') {
        var firstLink = document.querySelector('.grid-container a');
        if (firstLink) window.open(firstLink.href, '_blank');
      }
    }
    if (e.key === 'Escape') {
      if ($('slideDrawer') && $('slideDrawer').style.display === 'flex') { window.LATCH.dashboard.closeDrawer(); return; }
      if (A.dom.loginModal && A.dom.loginModal.style.display === 'flex') { A.hideLogin(); return; }
      if (A.dom.delModal && A.dom.delModal.style.display === 'flex') { C.hideModal('deleteModal'); return; }
      if (state.get('mode') !== 'dashboard' && A.dom.search) {
        A.dom.search.value = '';
        window.LATCH.view.onSearch('');
        A.dom.search.blur();
      }
    }
  };

  A.loadData = function () {
    C.showLoading();
    var loadingTimer = setTimeout(function () {
      C.hideLoading();
      C.toast('Gagal memuat data. Coba buka lewat server lokal (localhost).', 'error');
    }, 8000);
    db.getData().then(function (data) {
      clearTimeout(loadingTimer);
      var cats = data.categories;

      var allLinks = data.links.slice();
      var viewCats = cats.map(function (c) {
        return { id: c.id, name: c.name, feather: c.feather, links: data.links.filter(function (l) { return l.categoryId === c.id; }) };
      });
      viewCats.unshift({ id: 'all', name: 'Semua', feather: 'grid', links: allLinks });

      state.set({ cats: cats, links: data.links, viewCats: viewCats });
      A.showMode();
      C.hideLoading();
    }).catch(function (err) {
      clearTimeout(loadingTimer);
      C.hideLoading();
      C.toast('Gagal memuat data: ' + (err.message || err), 'error');
    });
  };

  A.showMode = function () {
    var goDash = state.get('mode') === 'dashboard' && state.get('isAdmin');
    var out = goDash ? A.dom.view : A.dom.dash;
    var inn = goDash ? A.dom.dash : A.dom.view;
    if (inn) {
      if (goDash) {
        A.initDashboard();
        if (A.dom.loginBtn) A.dom.loginBtn.style.display = 'none';
      } else {
        A.initView();
        if (A.dom.loginBtn) A.dom.loginBtn.style.display = '';
      }
      if (out) {
        out.classList.add('fade-out');
        inn.style.display = '';
        inn.classList.remove('fade-in');
        void inn.offsetWidth;
        inn.classList.add('fade-in');
        setTimeout(function () {
          out.style.display = 'none';
          out.classList.remove('fade-out');
        }, 300);
      } else {
        inn.style.display = '';
      }
    }
  };

  A.initView = function () {
    window.LATCH.view.init();
  };

  A.initDashboard = function () {
    window.LATCH.dashboard.init();
  };

  /* ───── LOGIN ───── */
  A.showLogin = function () {
    if (A.dom.loginPin) A.dom.loginPin.value = '';
    if (A.dom.loginErr) A.dom.loginErr.style.display = 'none';
    C.showModal('loginModal');
    if (A.dom.loginPin) A.dom.loginPin.focus();
  };

  A.hideLogin = function () {
    C.hideModal('loginModal');
  };

  A.doLogin = function () {
    var pin = A.dom.loginPin ? A.dom.loginPin.value.trim() : '';
    if (!pin) {
      if (A.dom.loginErr) {
        A.dom.loginErr.textContent = 'Masukkan PIN';
        A.dom.loginErr.style.display = 'block';
      }
      if (A.dom.loginPin) C.shakeElement(A.dom.loginPin);
      return;
    }
    if (A.dom.loginSub) {
      A.dom.loginSub.disabled = true;
      A.dom.loginSub.textContent = '⏳';
    }
    db.verifyPin(pin).then(function (r) {
      if (A.dom.loginSub) {
        A.dom.loginSub.disabled = false;
        A.dom.loginSub.textContent = 'Masuk';
      }
      if (r.valid) {
        A.hideLogin();
        state.set({ isAdmin: true, mode: 'dashboard' });
        A.showMode();
        C.toast('Selamat datang, Admin!', 'success');
      } else {
        if (A.dom.loginErr) {
          A.dom.loginErr.textContent = r.error || 'PIN salah';
          A.dom.loginErr.style.display = 'block';
        }
        if (A.dom.loginPin) { A.dom.loginPin.focus(); C.shakeElement(A.dom.loginPin); }
      }
    });
  };

  A.doLogout = function () {
    sessionStorage.removeItem('latch-admin');
    state.set({ isAdmin: false, mode: 'view' });
    A.showMode();
    C.toast('Berhasil keluar', 'info');
  };

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').then(function () {
        console.log('[SW] Registered');
      }).catch(function (err) {
        console.warn('[SW] Registration failed', err);
      });
    }
  }

  init();
  if (location.protocol !== 'file:') registerSW();
})();
