(function (tools) {
  'use strict';

  // Dipanggil main.js hanya untuk halaman hub dengan ?shell=1.
  if (window.__rhShellReady) return;
  if (!/[?&]shell=1(&|$)/.test(window.location.search)) return;

  var root = document.documentElement;
  var list = Array.isArray(tools) ? tools : [];

  root.classList.add('rh-shell');

  function hashNow() {
    return window.location.hash || '#dashboard';
  }

  function findTool(hash) {
    var h = hash === '#ss-' || hash.indexOf('#ss-') === 0 ? '#productive/planner' : hash;
    for (var i = 0; i < list.length; i++) {
      if (list[i].hash === h) return list[i];
    }
    return null;
  }

  function mount() {
    if (!document.body) {
      window.setTimeout(mount, 20);
      return;
    }
    if (window.__rhShellReady) return;
    window.__rhShellReady = true;

    var bar = document.createElement('header');
    bar.className = 'rh-appbar';
    bar.setAttribute('role', 'banner');
    bar.setAttribute('aria-label', 'ReynaHub');
    bar.innerHTML =
      '<button type="button" class="rh-brand" id="rh-brand" title="Beranda (Alt+←)" aria-label="Beranda">' +
        '<span class="rh-mark" aria-hidden="true">R</span>' +
        '<span class="rh-wordmark">REYNAHUB</span>' +
      '</button>' +
      '<span class="rh-sep" aria-hidden="true"></span>' +
      '<button type="button" class="rh-back" id="rh-back" title="Kembali ke workspace" aria-label="Kembali ke workspace">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
      '</button>' +
      '<span class="rh-title" id="rh-title">Workspace</span>' +
      '<div class="rh-actions">' +
        '<button type="button" class="rh-action rh-search" id="rh-search" title="Cari tool (Ctrl+K)" aria-label="Cari tool">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<span class="rh-search-label">Cari tool</span>' +
          '<kbd class="rh-kbd">Ctrl K</kbd>' +
        '</button>' +
        '<button type="button" class="rh-action rh-icon" id="rh-theme" title="Ubah tema" aria-label="Ubah tema">' +
          '<svg class="rh-theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z"/></svg>' +
          '<svg class="rh-theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>' +
        '</button>' +
        '<button type="button" class="rh-action rh-icon" id="rh-menu" title="Menu aplikasi" aria-label="Menu aplikasi">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
        '</button>' +
      '</div>';

    document.body.insertBefore(bar, document.body.firstChild);

    var titleEl = bar.querySelector('#rh-title');
    var backBtn = bar.querySelector('#rh-back');
    var brandBtn = bar.querySelector('#rh-brand');
    var searchBtn = bar.querySelector('#rh-search');
    var themeBtn = bar.querySelector('#rh-theme');
    var menuBtn = bar.querySelector('#rh-menu');

    function goHome() {
      if (hashNow() !== '#dashboard') {
        window.location.hash = '#dashboard';
        return;
      }
      var dashboard = document.getElementById('dashboard-view');
      if (dashboard) dashboard.scrollTop = 0;
    }

    function update() {
      var hash = hashNow();
      var isHome = hash === '#' || hash === '#dashboard';
      var tool = isHome ? null : findTool(hash);

      titleEl.textContent = isHome ? 'Workspace' : (tool ? tool.title : 'Modul');
      titleEl.title = isHome
        ? 'Semua modul'
        : (tool && tool.groupLabel ? tool.groupLabel : '');
      backBtn.classList.toggle('is-on', !isHome);
      backBtn.tabIndex = isHome ? -1 : 0;
    }

    function reportTheme() {
      var dark = root.getAttribute('data-theme') === 'dark';
      themeBtn.title = dark ? 'Tema terang' : 'Tema gelap';
      themeBtn.setAttribute('aria-label', dark ? 'Ubah ke tema terang' : 'Ubah ke tema gelap');
      if (window.reyna && typeof window.reyna.setTheme === 'function') {
        window.reyna.setTheme(dark ? 'dark' : 'light');
      }
    }

    brandBtn.addEventListener('click', goHome);
    backBtn.addEventListener('click', goHome);

    searchBtn.addEventListener('click', function () {
      if (window.reyna && typeof window.reyna.palette === 'function') {
        window.reyna.palette();
      }
    });

    menuBtn.addEventListener('click', function () {
      if (window.reyna && typeof window.reyna.menu === 'function') {
        window.reyna.menu();
      }
    });

    themeBtn.addEventListener('click', function () {
      var nativeToggle = document.getElementById('theme-btn');
      if (nativeToggle) nativeToggle.click();
    });

    window.addEventListener('hashchange', update);
    window.addEventListener('theme-changed', reportTheme);

    if (window.MutationObserver) {
      new window.MutationObserver(reportTheme).observe(root, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    update();
    reportTheme();
  }

  mount();
})
