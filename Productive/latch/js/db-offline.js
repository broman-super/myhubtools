(function () {
  'use strict';

  var STORAGE_KEY = 'latch-db-v2';

  var failCount = 0;
  var failReset = 0;
  var MAX_ATTEMPTS = 5;
  var RATE_WINDOW = 60000;

  function hashPin(pin) {
    var s = pin + 'offline-dev';
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
    return Math.abs(h).toString(16).padStart(8, '0');
  }

  function isRateLimited() {
    var now = Date.now();
    if (now > failReset) { failCount = 0; failReset = 0; }
    if (failCount >= MAX_ATTEMPTS) return { limited: true, retryAfter: Math.ceil((failReset - now) / 1000) };
    return { limited: false };
  }
  function recordFail() {
    var now = Date.now();
    if (now > failReset) { failCount = 0; failReset = 0; }
    failCount++;
    if (failCount === 1) failReset = now + RATE_WINDOW;
  }

  function genId() { return 'l' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4); }
  function genCatId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4); }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.warn('[DB] Save failed', e); }
  }
  function loadRaw() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function assignSort(data) {
    if (!data || !data.categories) return;
    data.categories.forEach(function (cat) {
      var catLinks = (data.links || []).filter(function (l) { return l.categoryId === cat.id; });
      catLinks.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
      catLinks.forEach(function (l, i) { l.sort = i; });
    });
  }

  function resolveCategory(nameOrId, categories) {
    if (!categories) return null;
    var match = categories.find(function (c) { return c.id === nameOrId || c.name === nameOrId; });
    if (match) return match.id;
    var newId = genCatId();
    categories.push({ id: newId, name: nameOrId, feather: 'folder', sort: categories.length + 1 });
    return newId;
  }

  var SEED = {
    config: { pinHash: hashPin('12345') },
    categories: [
      { id: 'cat-design', name: 'Design & Creative', feather: 'palette', sort: 1 },
      { id: 'cat-dev', name: 'Development', feather: 'terminal', sort: 2 },
      { id: 'cat-project', name: 'Project Management', feather: 'clipboard', sort: 3 },
      { id: 'cat-ops', name: 'Monitoring & Ops', feather: 'bar-chart-2', sort: 4 },
      { id: 'cat-hr', name: 'HR & Internal', feather: 'users', sort: 5 },
      { id: 'cat-marketing', name: 'Marketing', feather: 'trending-up', sort: 6 },
      { id: 'cat-youtube', name: 'YouTube', feather: 'play', sort: 7 },
      { id: 'cat-instagram', name: 'Instagram', feather: 'camera', sort: 8 }
    ],
    links: [
      { id: 'l01', title: 'Master Design System', url: 'https://figma.com', categoryId: 'cat-design', updated: 1, badge: 'core', sort: 0 },
      { id: 'l02', title: 'Brand Guidelines Doc', url: 'https://docs.google.com/document', categoryId: 'cat-design', updated: 3, sort: 1 },
      { id: 'l03', title: 'Moodboard Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-design', updated: 0, badge: 'daily', sort: 2 },
      { id: 'l04', title: 'Aset Visual GDrive', url: 'https://drive.google.com/drive/folders/aset-visual', categoryId: 'cat-design', updated: 5, badge: 'archive', sort: 3 },
      { id: 'l05', title: 'Template Presentasi', url: 'https://docs.google.com/presentation', categoryId: 'cat-design', updated: 12, sort: 4 },
      { id: 'l06', title: 'Brief Desain Baru', url: 'https://docs.google.com/document', categoryId: 'cat-design', updated: 0, badge: 'hot', sort: 5 },
      { id: 'l07', title: 'Prototype Figma', url: 'https://figma.com', categoryId: 'cat-design', updated: 2, badge: 'core', sort: 6 },
      { id: 'l08', title: 'Design Review Board', url: 'https://miro.com', categoryId: 'cat-design', updated: 6, sort: 7 },
      { id: 'l09', title: 'Icon Library', url: 'https://figma.com', categoryId: 'cat-design', updated: 10, sort: 8 },
      { id: 'l10', title: 'Dokumentasi API', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 2, badge: 'core', sort: 0 },
      { id: 'l11', title: 'Database Schema', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-dev', updated: 7, sort: 1 },
      { id: 'l12', title: 'Env & Config GDrive', url: 'https://drive.google.com/drive/folders/env-config', categoryId: 'cat-dev', updated: 0, sort: 2 },
      { id: 'l13', title: 'Technical Specs', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 4, sort: 3 },
      { id: 'l14', title: 'Bug Tracker Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-dev', updated: 1, badge: 'daily', sort: 4 },
      { id: 'l15', title: 'Release Checklist', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-dev', updated: 0, badge: 'hot', sort: 5 },
      { id: 'l16', title: 'Archived Projects', url: 'https://drive.google.com/drive/folders/arsip-dev', categoryId: 'cat-dev', updated: 45, badge: 'archive', sort: 6 },
      { id: 'l17', title: 'Sprint Planning Doc', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 3, badge: 'daily', sort: 7 },
      { id: 'l18', title: 'Repo GitHub', url: 'https://github.com', categoryId: 'cat-dev', updated: 1, badge: 'core', sort: 8 },
      { id: 'l19', title: 'CI/CD Pipeline', url: 'https://gitlab.com', categoryId: 'cat-dev', updated: 2, sort: 9 },
      { id: 'l20', title: 'Code Review Guide', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 14, sort: 10 },
      { id: 'l21', title: 'Project Timeline', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-project', updated: 0, badge: 'daily', sort: 0 },
      { id: 'l22', title: 'Rapat Notes GDrive', url: 'https://drive.google.com/drive/folders/notes-rapat', categoryId: 'cat-project', updated: 2, sort: 1 },
      { id: 'l23', title: 'Meeting Minutes', url: 'https://docs.google.com/document', categoryId: 'cat-project', updated: 5, sort: 2 },
      { id: 'l24', title: 'OKR Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-project', updated: 1, badge: 'core', sort: 3 },
      { id: 'l25', title: 'Risk Register', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-project', updated: 8, sort: 4 },
      { id: 'l26', title: 'Proposal Dokumen', url: 'https://docs.google.com/document', categoryId: 'cat-project', updated: 14, sort: 5 },
      { id: 'l27', title: 'GDrive Arsip Proyek', url: 'https://drive.google.com/drive/folders/arsip-proyek', categoryId: 'cat-project', updated: 90, badge: 'archive', sort: 6 },
      { id: 'l28', title: 'Project Charter', url: 'https://docs.google.com/document', categoryId: 'cat-project', updated: 3, sort: 7 },
      { id: 'l29', title: 'Trello Board', url: 'https://trello.com', categoryId: 'cat-project', updated: 4, sort: 8 },
      { id: 'l30', title: 'Notion Workspace', url: 'https://notion.so', categoryId: 'cat-project', updated: 1, badge: 'core', sort: 9 },
      { id: 'l31', title: 'SOP Operasional', url: 'https://docs.google.com/document', categoryId: 'cat-ops', updated: 10, sort: 0 },
      { id: 'l32', title: 'Incident Report Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-ops', updated: 0, badge: 'hot', sort: 1 },
      { id: 'l33', title: 'Inventory GDrive', url: 'https://drive.google.com/drive/folders/inventory', categoryId: 'cat-ops', updated: 20, badge: 'archive', sort: 2 },
      { id: 'l34', title: 'Backup Logs', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-ops', updated: 2, sort: 3 },
      { id: 'l35', title: 'Security Checklist', url: 'https://docs.google.com/document', categoryId: 'cat-ops', updated: 6, badge: 'core', sort: 4 },
      { id: 'l36', title: 'Vendor Kontrak', url: 'https://drive.google.com/drive/folders/kontrak', categoryId: 'cat-ops', updated: 120, sort: 5 },
      { id: 'l37', title: 'Uptime Monitoring Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-ops', updated: 0, badge: 'daily', sort: 6 },
      { id: 'l38', title: 'Cloud Console', url: 'https://cloud.google.com', categoryId: 'cat-ops', updated: 1, sort: 7 },
      { id: 'l39', title: 'Deploy Dashboard', url: 'https://vercel.com', categoryId: 'cat-ops', updated: 3, sort: 8 },
      { id: 'l40', title: 'Kontrak Karyawan', url: 'https://drive.google.com/drive/folders/kontrak-karyawan', categoryId: 'cat-hr', updated: 30, badge: 'archive', sort: 0 },
      { id: 'l41', title: 'Data Karyawan Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 5, sort: 1 },
      { id: 'l42', title: 'SOP Kepegawaian', url: 'https://docs.google.com/document', categoryId: 'cat-hr', updated: 14, sort: 2 },
      { id: 'l43', title: 'Onboarding Checklist', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 0, badge: 'daily', sort: 3 },
      { id: 'l44', title: 'Training Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 7, sort: 4 },
      { id: 'l45', title: 'Kebijakan Perusahaan', url: 'https://docs.google.com/document', categoryId: 'cat-hr', updated: 60, sort: 5 },
      { id: 'l46', title: 'Calendar Libur', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 1, sort: 6 },
      { id: 'l47', title: 'Brand Assets Marketing', url: 'https://drive.google.com/drive/folders/brand-assets', categoryId: 'cat-marketing', updated: 3, badge: 'core', sort: 0 },
      { id: 'l48', title: 'Content Calendar', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-marketing', updated: 0, badge: 'daily', sort: 1 },
      { id: 'l49', title: 'Social Media Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-marketing', updated: 4, sort: 2 },
      { id: 'l50', title: 'Campaign Report', url: 'https://docs.google.com/presentation', categoryId: 'cat-marketing', updated: 18, sort: 3 },
      { id: 'l51', title: 'Marketing Budget', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-marketing', updated: 2, sort: 4 },
      { id: 'l52', title: 'SEO Audit Doc', url: 'https://docs.google.com/document', categoryId: 'cat-marketing', updated: 9, sort: 5 },
      { id: 'l53', title: 'Brand Guideline Eksternal', url: 'https://figma.com', categoryId: 'cat-marketing', updated: 5, sort: 6 },
      { id: 'l54', title: 'Tutorial Firebase GDoc', url: 'https://docs.google.com/document', categoryId: 'cat-youtube', updated: 0, badge: 'hot', sort: 0 },
      { id: 'l55', title: 'Playlist Design System', url: 'https://www.youtube.com/playlist', categoryId: 'cat-youtube', updated: 2, sort: 1 },
      { id: 'l56', title: 'Channel Overview Recording', url: 'https://www.youtube.com/watch', categoryId: 'cat-youtube', updated: 5, sort: 2 },
      { id: 'l57', title: 'Video Panduan GDrive', url: 'https://drive.google.com/file/d/video-panduan', categoryId: 'cat-youtube', updated: 1, sort: 3 },
      { id: 'l58', title: 'Webinar Replay Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-youtube', updated: 3, sort: 4 },
      { id: 'l59', title: 'Instagram Content Plan', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-instagram', updated: 0, badge: 'daily', sort: 0 },
      { id: 'l60', title: 'Feed Design GDrive', url: 'https://drive.google.com/drive/folders/feed-design', categoryId: 'cat-instagram', updated: 2, sort: 1 },
      { id: 'l61', title: 'IG Story Template', url: 'https://docs.google.com/presentation', categoryId: 'cat-instagram', updated: 7, sort: 2 },
      { id: 'l62', title: 'Reels Script Doc', url: 'https://docs.google.com/document', categoryId: 'cat-instagram', updated: 1, sort: 3 },
      { id: 'l63', title: 'Influencer Tracker Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-instagram', updated: 4, sort: 4 },
      { id: 'l64', title: 'IG Analytics Report', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-instagram', updated: 6, sort: 5 },
      { id: 'l65', title: 'Portfolio Feed Figma', url: 'https://figma.com', categoryId: 'cat-instagram', updated: 0, badge: 'core', sort: 6 }
    ]
  };

  function getDefault() {
    return JSON.parse(JSON.stringify(SEED));
  }

  var initPromise = (function () {
    var existing = loadRaw();
    if (existing && existing.categories && existing.links) {
      assignSort(existing);
      return Promise.resolve(existing);
    }
    save(SEED);
    return Promise.resolve(getDefault());
  })();

  function getValidData() {
    var d = loadRaw();
    if (d && d.categories && d.links) { assignSort(d); return d; }
    return getDefault();
  }

  function delay(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  /* ───── Public API ───── */
  window.db = {
    ready: initPromise,

    getData: function () {
      return initPromise.then(function () {
        return delay(30).then(function () {
          var d = getValidData();
          return { config: d.config, categories: d.categories, links: d.links };
        });
      });
    },

    reorderLinks: function (catId, orderedIds) {
      return initPromise.then(function () {
        return delay(50).then(function () {
          var d = getValidData();
          var idSet = {};
          orderedIds.forEach(function (id, i) { idSet[id] = i; });
          (d.links || []).forEach(function (l) { if (l.categoryId === catId && typeof idSet[l.id] === 'number') l.sort = idSet[l.id]; });
          save(d);
          return { success: true };
        });
      });
    },

    verifyPin: function (pin) {
      return initPromise.then(function () {
        var rl = isRateLimited();
        if (rl.limited) return { valid: false, error: 'Terlalu banyak percobaan. Coba lagi dalam ' + rl.retryAfter + ' detik.', rateLimited: true };
        var d = getValidData();
        var expected = d.config.pinHash || hashPin('12345');
        if (hashPin(pin) === expected) {
          failCount = 0;
          var token = 'tok-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
          sessionStorage.setItem('latch-token', token);
          sessionStorage.setItem('latch-admin', 'true');
          return { valid: true, token: token };
        }
        recordFail();
        return { valid: false, error: 'PIN salah' };
      });
    },

    addRow: function (data) {
      return initPromise.then(function () {
        return delay(50).then(function () {
          var d = getValidData();
          var catId = data.categoryId ? resolveCategory(data.categoryId, d.categories) : d.categories[0].id;
          if (!catId) return { success: false, error: 'Kategori tidak ditemukan' };
          var sameCat = d.links.filter(function (l) { return l.categoryId === catId; });
          var maxSort = sameCat.length ? Math.max.apply(null, sameCat.map(function (l) { return l.sort || 0; })) : -1;
          var link = { id: genId(), title: data.title || 'Link Baru', url: data.url || '', categoryId: catId, updated: 0, sort: maxSort + 1 };
          d.links.push(link);
          save(d);
          return { success: true, id: link.id, link: link };
        });
      });
    },

    saveRow: function (id, data) {
      return initPromise.then(function () {
        return delay(50).then(function () {
          var d = getValidData();
          var idx = d.links.findIndex(function (l) { return l.id === id; });
          if (idx === -1) return { success: false };
          if (data.title !== undefined) d.links[idx].title = data.title;
          if (data.url !== undefined) d.links[idx].url = data.url;
          if (data.categoryId !== undefined) d.links[idx].categoryId = resolveCategory(data.categoryId, d.categories);
          d.links[idx].updated = 0;
          if (typeof d.links[idx].sort !== 'number') d.links[idx].sort = idx;
          save(d);
          return { success: true, link: d.links[idx] };
        });
      });
    },

    deleteRow: function (id) {
      return initPromise.then(function () {
        return delay(30).then(function () {
          var d = getValidData();
          d.links = d.links.filter(function (l) { return l.id !== id; });
          save(d);
          return { success: true };
        });
      });
    },

    deleteMany: function (ids) {
      return initPromise.then(function () {
        return delay(50).then(function () {
          var d = getValidData();
          d.links = d.links.filter(function (l) { return ids.indexOf(l.id) === -1; });
          save(d);
          return { success: true, deleted: ids.length };
        });
      });
    },

    addCategory: function (name) {
      return initPromise.then(function () {
        return delay(30).then(function () {
          var d = getValidData();
          var newId = genCatId();
          d.categories.push({ id: newId, name: name, feather: 'folder', sort: d.categories.length + 1 });
          save(d);
          return { success: true, id: newId };
        });
      });
    },

    deleteCategory: function (id) {
      return initPromise.then(function () {
        return delay(50).then(function () {
          var d = getValidData();
          d.categories = d.categories.filter(function (c) { return c.id !== id; });
          d.links = d.links.filter(function (l) { return l.categoryId !== id; });
          save(d);
          return { success: true };
        });
      });
    }
  };
})();
