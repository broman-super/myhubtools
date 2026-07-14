(function () {
  'use strict';
  var state = window.LATCH.state;
  var db = window.LATCH.db;
  var C = window.LATCH.components;
  var U = window.LATCH.utils;
  var $ = U.$id;

  var V = {};
  var filterCache = {};

  function invalidateFilterCache() {
    filterCache = {};
  }

  function getActiveLinks() {
    var cacheKey = state.get('tab') + '::' + state.get('search');
    if (filterCache[cacheKey]) return filterCache[cacheKey];
    var viewCats = state.get('viewCats');
    var cat = viewCats.find(function (c) { return c.id === state.get('tab'); });
    if (!cat) return [];
    var links = cat.links;
    var q = state.get('search').toLowerCase().trim();
    if (q) {
      links = links.filter(function (l) { return l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q); });
    }
    filterCache[cacheKey] = links;
    return links;
  }

  V.renderTabs = function () {
    var el = $('tabsContainer');
    if (!el) return;
    el.setAttribute('role', 'tablist');
    var wrap = $('tabsWrapper');
    if (wrap) wrap.scrollLeft = 0;
    var current = state.get('tab');
    el.innerHTML = state.get('viewCats').map(function (c) {
      var a = c.id === current ? 'active' : '';
      var s = c.id === current ? 'true' : 'false';
      return '<button class="tab-chip ' + a + '" data-id="' + c.id + '" role="tab" aria-selected="' + s + '"><i data-feather="' + c.feather + '"></i><span>' + U.esc(c.name) + '</span><span class="tab-count">' + c.links.length + '</span></button>';
    }).join('');
    el.querySelectorAll('.tab-chip').forEach(function (b) {
      b.addEventListener('click', function () { V.switchTab(this.dataset.id); });
    });
    if (typeof feather !== 'undefined') feather.replace();
  };

  V.switchTab = function (id) {
    var prevTab = state.get('tab');
    var searchCache = state.get('searchCache') || {};
    var input = $('searchInput');
    if (input && prevTab) {
      searchCache[prevTab] = input.value;
    }
    var restored = searchCache[id] || '';
    state.set({ tab: id, search: restored });
    if (input) input.value = restored;
    state.set('searchCache', searchCache);
    invalidateFilterCache();
    V.renderTabs();
    var grid = $('linksGrid');
    if (grid) {
      if (grid._scrollObs) grid._scrollObs.disconnect();
      grid._scrollObs = null;
      grid._allData = null;
      grid._batchCount = 0;
    }
    V.renderLinks();
    if (input) input.focus();
  };

  function highlightText(text, query) {
    if (!query) return U.esc(text);
    var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return U.esc(text).replace(re, '<span class="search-highlight">$1</span>');
  }

  var BATCH_SIZE = 24;

  function renderLink(l, i, q, icon, cb, hTitle) {
    return '<div class="link-card-wrap" style="animation-delay:' + ((i % 12) * 50) + 'ms">' +
      '<a href="' + U.esc(l.url) + '" target="_blank" rel="noopener noreferrer" class="link-card-row' + (l.badge === 'hot' ? ' link-hot' : '') + '" data-url="' + U.esc(l.url) + '" aria-label="Buka ' + U.esc(l.title) + ' di tab baru">' +
      '<div class="link-icon-row"><img src="' + icon + '" alt="' + U.esc(l.title) + '" loading="lazy" decoding="async" onerror="' + cb + '"></div>' +
      '<div class="link-content-row"><span class="link-title-row" title="' + U.esc(l.title) + '">' + hTitle + '</span>' +
      '<span class="link-meta-row">' + U.relTime(l.updated) + '</span></div></a>' +
      '<button class="link-copy-btn" data-url="' + U.esc(l.url) + '" data-title="' + U.esc(l.title) + '" aria-label="Salin link ' + U.esc(l.title) + '" title="Salin link">📋</button></div>';
  }

  function prepareLinkData(l, q) {
    var icon = U.svcIcon(l.url) || U.favIcon(l.url);
    var cb = U.svcIcon(l.url)
      ? 'this.onerror=function(){var f=\'' + U.favIcon(l.url) + '\';if(f){this.src=f;this.onerror=function(){this.parentElement.innerHTML=\'🔗\'}}else{this.parentElement.innerHTML=\'🔗\'}}'
      : 'this.parentElement.innerHTML=\'🔗\'';
    var hTitle = highlightText(l.title, q);
    return { icon: icon, cb: cb, hTitle: hTitle };
  }

  V.renderLinks = function () {
    var grid = $('linksGrid');
    var counter = $('gridCounter');
    var noRes = $('noResults');
    if (!grid) return;
    var links = getActiveLinks();
    var q = state.get('search');
    if (!links.length) {
      grid.innerHTML = '';
      if (counter) counter.textContent = '';
      if (noRes) {
        var cat = state.get('viewCats').find(function (c) { return c.id === state.get('tab'); });
        if (q) {
          noRes.querySelector('.no-results-title').textContent = 'Tidak ada link ditemukan';
          noRes.querySelector('.no-results-hint').textContent = 'Coba ubah kata kunci pencarian';
        } else if (cat && cat.name !== 'Semua') {
          noRes.querySelector('.no-results-title').textContent = 'Kategori "' + cat.name + '" kosong';
          noRes.querySelector('.no-results-hint').textContent = 'Belum ada link di kategori ini';
        } else {
          noRes.querySelector('.no-results-title').textContent = 'Belum ada link';
          noRes.querySelector('.no-results-hint').textContent = 'Tambahkan link pertama Anda';
        }
        noRes.style.display = 'flex';
      }
      grid._batchCount = 0;
      return;
    }
    if (noRes) noRes.style.display = 'none';
    var sortedLinks = links.slice().sort(function (a, b) {
      return (typeof a.sort === 'number' ? a.sort : 0) - (typeof b.sort === 'number' ? b.sort : 0);
    });

    grid._allData = sortedLinks;
    grid._batchCount = 0;
    grid.innerHTML = '';

    V.renderBatch(grid);
    V.setupInfiniteScroll(grid);

    V.updateCounter(grid);
  };

  V.updateCounter = function (grid) {
    var counter = $('gridCounter');
    if (!counter) return;
    var data = grid._allData || [];
    var loaded = Math.min(grid._batchCount * BATCH_SIZE, data.length);
    var q = state.get('search');
    var cat = state.get('viewCats').find(function (c) { return c.id === state.get('tab'); });
    var total = cat ? cat.links.length : 0;
    var totalAll = state.get('links') ? state.get('links').length : 0;
    var catCount = state.get('viewCats') ? state.get('viewCats').length - 1 : 0;
    var label = cat ? cat.name : 'Semua';
    counter.textContent = q
      ? ('Menampilkan ' + data.length + ' dari ' + total + ' link · "' + label + '"')
      : ('Menampilkan ' + loaded + '/' + data.length + ' link di ' + label + ' · ' + totalAll + ' total · ' + catCount + ' folder');
  };

  V.renderBatch = function (grid) {
    var data = grid._allData || [];
    var start = grid._batchCount * BATCH_SIZE;
    var end = Math.min(start + BATCH_SIZE, data.length);
    if (start >= data.length) return;

    var loadMore = grid.querySelector('.load-more');
    if (loadMore) loadMore.remove();

    var q = state.get('search');
    var html = '';
    var frag = document.createDocumentFragment();
    var temp = document.createElement('div');
    for (var i = start; i < end; i++) {
      var l = data[i];
      var p = prepareLinkData(l, q);
      html += renderLink(l, i, q, p.icon, p.cb, p.hTitle);
    }
    temp.innerHTML = html;
    while (temp.firstChild) {
      frag.appendChild(temp.firstChild);
    }
    grid.appendChild(frag);
    grid._batchCount++;

    V.updateCounter(grid);

    grid.querySelectorAll('.link-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var url = this.dataset.url;
        var title = this.dataset.title;
        U.copyToClipboard(url).then(function (ok) {
          if (ok) C.toast('Link disalin: ' + title, 'success');
          else C.toast('Gagal menyalin link', 'error');
        });
      });
    });
    if (end < data.length) {
      if (!loadMore) {
        loadMore = document.createElement('div');
        loadMore.className = 'load-more';
      }
      loadMore.textContent = 'Muat lebih banyak...';
      loadMore.onclick = function () { V.renderBatch(grid); };
      grid.appendChild(loadMore);
    } else {
      var doneEl = document.createElement('div');
      doneEl.className = 'load-all-done';
      doneEl.textContent = '— Semua ditampilkan —';
      grid.appendChild(doneEl);
    }
  };

  V.setupInfiniteScroll = function (grid) {
    if (grid._scrollObs) grid._scrollObs.disconnect();
    var sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    grid.appendChild(sentinel);
    grid._scrollObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        var before = grid._batchCount;
        V.renderBatch(grid);
        var data = grid._allData || [];
        if (grid._batchCount * BATCH_SIZE >= data.length) {
          grid._scrollObs.disconnect();
          var s = grid.querySelector('.scroll-sentinel');
          if (s) s.remove();
          // Jika renderBatch return early (start>=length), show All done
          if (before === grid._batchCount && data.length > 0) {
            var doneEl = document.createElement('div');
            doneEl.className = 'load-all-done';
            doneEl.textContent = '— Semua ditampilkan —';
            grid.appendChild(doneEl);
          }
        }
      }
    }, { rootMargin: '200px' });
    grid._scrollObs.observe(sentinel);
  };

  V.render = function () {
    V.renderTabs();
    V.renderLinks();
  };

  V.onSearch = function (value) {
    state.set('search', value);
    invalidateFilterCache();
    V.renderLinks();
  };

  V.startClock = function () {
    var el = $('atmClock');
    if (!el || el.dataset.clockStarted) return;
    el.dataset.clockStarted = '1';
    function update() {
      var d = new Date();
      var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      var dayName = days[d.getDay()];
      var date = d.getDate();
      var month = months[d.getMonth()];
      var year = d.getFullYear();
      var h = String(d.getHours()).padStart(2, '0');
      var m = String(d.getMinutes()).padStart(2, '0');
      el.textContent = dayName + ', ' + date + ' ' + month + ' ' + year + ' · ' + h + ':' + m;
    }
    update();
    setInterval(update, 30000);
  };

  V.initBackToTop = function () {
    var btn = $('backToTop');
    if (!btn) return;
    function check() {
      btn.classList.toggle('visible', window.scrollY > 300);
    }
    window.addEventListener('scroll', check, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  V.initSwipe = function () {
    var grid = $('linksGrid');
    if (!grid) return;
    var startX = 0;
    var startY = 0;
    grid.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    grid.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 1.5) return;
      var viewCats = state.get('viewCats');
      var current = state.get('tab');
      var idx = viewCats.findIndex(function (c) { return c.id === current; });
      if (dx < 0 && idx < viewCats.length - 1) {
        V.switchTab(viewCats[idx + 1].id);
      } else if (dx > 0 && idx > 0) {
        V.switchTab(viewCats[idx - 1].id);
      }
    }, { passive: true });
  };

  V.init = function () {
    V.render();
    V.startClock();
    V.initBackToTop();
    V.initSwipe();
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.view = V;
})();
