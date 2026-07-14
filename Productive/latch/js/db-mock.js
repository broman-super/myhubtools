(function () {
  'use strict';

  var STORAGE_KEY = 'latch-db';
  var READY = false;
  var QUEUE = [];

  function sha256Fallback(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    return Promise.resolve(Math.abs(hash).toString(16).padStart(64, '0'));
  }

  function sha256(str) {
    if (typeof crypto === 'undefined' || !crypto.subtle || !crypto.subtle.digest) {
      return sha256Fallback(str);
    }
    try {
      var encoder = new TextEncoder();
      var data = encoder.encode(str);
      return crypto.subtle.digest('SHA-256', data).then(function (buf) {
        var b = new Uint8Array(buf);
        var hex = '';
        for (var i = 0; i < b.length; i++) {
          hex += ('0' + b[i].toString(16)).slice(-2);
        }
        return hex;
      });
    } catch (e) {
      return sha256Fallback(str);
    }
  }

  function randomHex(len) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var a = new Uint8Array(len);
      crypto.getRandomValues(a);
      var s = '';
      for (var i = 0; i < a.length; i++) {
        s += ('0' + a[i].toString(16)).slice(-2);
      }
      return s;
    }
    var s = '';
    for (var i = 0; i < len * 2; i++) {
      s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    }
    return s;
  }

  function genSalt() { return randomHex(16); }
  function genToken() { return randomHex(24); }

  var failCount = 0;
  var failReset = 0;
  var MAX_ATTEMPTS = 5;
  var RATE_WINDOW = 60000;

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadRaw() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return null;
  }

  function init() {
    var existing = loadRaw();
    if (existing) { READY = true; return Promise.resolve(existing); }
    var salt = genSalt();
    return sha256('12345' + salt).then(function (hash) {
      var data = {
        config: { pin_salt: salt, pin_hash: hash },
        login_log: [],
        categories: [
          { id: 'cat-design', name: 'Design & Creative', feather: 'palette', sort: 1 },
          { id: 'cat-dev', name: 'Development', feather: 'terminal', sort: 2 },
          { id: 'cat-project', name: 'Project Management', feather: 'clipboard', sort: 3 },
          { id: 'cat-ops', name: 'Monitoring & Ops', feather: 'bar-chart-2', sort: 4 },
          { id: 'cat-hr', name: 'HR & Internal', feather: 'users', sort: 5 },
          { id: 'cat-marketing', name: 'Marketing', feather: 'trending-up', sort: 6 }
        ],
        links: [
          { id: 'l01', title: 'Master Design System', url: 'https://figma.com', categoryId: 'cat-design', updated: 1, badge: 'core', sort: 0 },
          { id: 'l02', title: 'Brand Guidelines Doc', url: 'https://docs.google.com/document', categoryId: 'cat-design', updated: 3, sort: 1 },
          { id: 'l03', title: 'Moodboard Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-design', updated: 0, badge: 'daily', sort: 2 },
          { id: 'l04', title: 'Aset Visual GDrive', url: 'https://drive.google.com', categoryId: 'cat-design', updated: 5, badge: 'archive', sort: 3 },
          { id: 'l05', title: 'Template Presentasi', url: 'https://docs.google.com/presentation', categoryId: 'cat-design', updated: 12, sort: 4 },
          { id: 'l06', title: 'Brief Desain Baru', url: 'https://docs.google.com/document', categoryId: 'cat-design', updated: 0, badge: 'hot', sort: 5 },
          { id: 'l07', title: 'Prototype Figma', url: 'https://figma.com', categoryId: 'cat-design', updated: 2, badge: 'core', sort: 6 },
          { id: 'l08', title: 'Design Review Board', url: 'https://miro.com', categoryId: 'cat-design', updated: 6, sort: 7 },
          { id: 'l09', title: 'Icon Library', url: 'https://figma.com', categoryId: 'cat-design', updated: 10, sort: 8 },
          { id: 'l10', title: 'Dokumentasi API', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 2, badge: 'core', sort: 0 },
          { id: 'l11', title: 'Database Schema', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-dev', updated: 7, sort: 1 },
          { id: 'l12', title: 'Env & Config GDrive', url: 'https://drive.google.com', categoryId: 'cat-dev', updated: 0, sort: 2 },
          { id: 'l13', title: 'Technical Specs', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 4, sort: 3 },
          { id: 'l14', title: 'Bug Tracker Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-dev', updated: 1, badge: 'daily', sort: 4 },
          { id: 'l15', title: 'Release Checklist', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-dev', updated: 0, badge: 'hot', sort: 5 },
          { id: 'l16', title: 'Archived Projects', url: 'https://drive.google.com', categoryId: 'cat-dev', updated: 45, badge: 'archive', sort: 6 },
          { id: 'l17', title: 'Sprint Planning Doc', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 3, badge: 'daily', sort: 7 },
          { id: 'l18', title: 'Repo GitHub', url: 'https://github.com', categoryId: 'cat-dev', updated: 1, badge: 'core', sort: 8 },
          { id: 'l19', title: 'CI/CD Pipeline', url: 'https://gitlab.com', categoryId: 'cat-dev', updated: 2, sort: 9 },
          { id: 'l20', title: 'Code Review Guide', url: 'https://docs.google.com/document', categoryId: 'cat-dev', updated: 14, sort: 10 },
          { id: 'l21', title: 'Project Timeline', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-project', updated: 0, badge: 'daily', sort: 0 },
          { id: 'l22', title: 'Rapat Notes GDrive', url: 'https://drive.google.com', categoryId: 'cat-project', updated: 2, sort: 1 },
          { id: 'l23', title: 'Meeting Minutes', url: 'https://docs.google.com/document', categoryId: 'cat-project', updated: 5, sort: 2 },
          { id: 'l24', title: 'OKR Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-project', updated: 1, badge: 'core', sort: 3 },
          { id: 'l25', title: 'Risk Register', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-project', updated: 8, sort: 4 },
          { id: 'l26', title: 'Proposal Dokumen', url: 'https://docs.google.com/document', categoryId: 'cat-project', updated: 14, sort: 5 },
          { id: 'l27', title: 'GDrive Arsip Proyek', url: 'https://drive.google.com', categoryId: 'cat-project', updated: 90, badge: 'archive', sort: 6 },
          { id: 'l28', title: 'Project Charter', url: 'https://docs.google.com/document', categoryId: 'cat-project', updated: 3, sort: 7 },
          { id: 'l29', title: 'Trello Board', url: 'https://trello.com', categoryId: 'cat-project', updated: 4, sort: 8 },
          { id: 'l30', title: 'Notion Workspace', url: 'https://notion.so', categoryId: 'cat-project', updated: 1, badge: 'core', sort: 9 },
          { id: 'l31', title: 'SOP Operasional', url: 'https://docs.google.com/document', categoryId: 'cat-ops', updated: 10, sort: 0 },
          { id: 'l32', title: 'Incident Report Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-ops', updated: 0, badge: 'hot', sort: 1 },
          { id: 'l33', title: 'Inventory GDrive', url: 'https://drive.google.com', categoryId: 'cat-ops', updated: 20, badge: 'archive', sort: 2 },
          { id: 'l34', title: 'Backup Logs', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-ops', updated: 2, sort: 3 },
          { id: 'l35', title: 'Security Checklist', url: 'https://docs.google.com/document', categoryId: 'cat-ops', updated: 6, badge: 'core', sort: 4 },
          { id: 'l36', title: 'Vendor Kontrak', url: 'https://drive.google.com', categoryId: 'cat-ops', updated: 120, sort: 5 },
          { id: 'l37', title: 'Uptime Monitoring Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-ops', updated: 0, badge: 'daily', sort: 6 },
          { id: 'l38', title: 'Cloud Console', url: 'https://cloud.google.com', categoryId: 'cat-ops', updated: 1, sort: 7 },
          { id: 'l39', title: 'Deploy Dashboard', url: 'https://vercel.com', categoryId: 'cat-ops', updated: 3, sort: 8 },
          { id: 'l40', title: 'Kontrak Karyawan', url: 'https://drive.google.com', categoryId: 'cat-hr', updated: 30, badge: 'archive', sort: 0 },
          { id: 'l41', title: 'Data Karyawan Sheet', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 5, sort: 1 },
          { id: 'l42', title: 'SOP Kepegawaian', url: 'https://docs.google.com/document', categoryId: 'cat-hr', updated: 14, sort: 2 },
          { id: 'l43', title: 'Onboarding Checklist', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 0, badge: 'daily', sort: 3 },
          { id: 'l44', title: 'Training Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 7, sort: 4 },
          { id: 'l45', title: 'Kebijakan Perusahaan', url: 'https://docs.google.com/document', categoryId: 'cat-hr', updated: 60, sort: 5 },
          { id: 'l46', title: 'Calendar Libur', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-hr', updated: 1, sort: 6 },
          { id: 'l47', title: 'Brand Assets Marketing', url: 'https://drive.google.com', categoryId: 'cat-marketing', updated: 3, badge: 'core', sort: 0 },
          { id: 'l48', title: 'Content Calendar', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-marketing', updated: 0, badge: 'daily', sort: 1 },
          { id: 'l49', title: 'Social Media Tracker', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-marketing', updated: 4, sort: 2 },
          { id: 'l50', title: 'Campaign Report', url: 'https://docs.google.com/presentation', categoryId: 'cat-marketing', updated: 18, sort: 3 },
          { id: 'l51', title: 'Marketing Budget', url: 'https://docs.google.com/spreadsheets', categoryId: 'cat-marketing', updated: 2, sort: 4 },
          { id: 'l52', title: 'SEO Audit Doc', url: 'https://docs.google.com/document', categoryId: 'cat-marketing', updated: 9, sort: 5 },
          { id: 'l53', title: 'Brand Guideline Eksternal', url: 'https://figma.com', categoryId: 'cat-marketing', updated: 5, sort: 6 }
        ]
      };
      save(data);
      READY = true;
      return data;
    });
  }

  var initPromise = init();

  function migratePin(d) {
    if (!d.config.admin_pin || d.config.pin_hash) return Promise.resolve();
    var salt = genSalt();
    return sha256(d.config.admin_pin + salt).then(function (hash) {
      d.config.pin_salt = salt;
      d.config.pin_hash = hash;
      delete d.config.admin_pin;
      save(d);
    });
  }

  function genId() {
    return 'l' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  }

  function genCatId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  }

  function resolveCategory(nameOrId, categories) {
    var match = categories.find(function (c) { return c.id === nameOrId || c.name === nameOrId; });
    if (match) return match.id;
    var newId = genCatId();
    categories.push({ id: newId, name: nameOrId, feather: 'folder', sort: categories.length + 1 });
    return newId;
  }

  function isRateLimited() {
    var now = Date.now();
    if (now > failReset) {
      failCount = 0;
      failReset = 0;
    }
    if (failCount >= MAX_ATTEMPTS) {
      return { limited: true, retryAfter: Math.ceil((failReset - now) / 1000) };
    }
    return { limited: false };
  }

  function recordFail() {
    var now = Date.now();
    if (now > failReset) {
      failCount = 0;
      failReset = 0;
    }
    failCount++;
    if (failCount === 1) {
      failReset = now + RATE_WINDOW;
    }
  }

  function assignSort(data) {
    var cats = data.categories;
    cats.forEach(function (cat) {
      var catLinks = data.links.filter(function (l) { return l.categoryId === cat.id; });
      catLinks.sort(function (a, b) {
        var sa = typeof a.sort === 'number' ? a.sort : 0;
        var sb = typeof b.sort === 'number' ? b.sort : 0;
        return sa - sb;
      });
      catLinks.forEach(function (l, i) { l.sort = i; });
    });
  }

  window.db = {
    ready: initPromise,

    getData: function () {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            assignSort(d);
            res({ config: d.config, categories: d.categories, links: d.links });
          }, 100);
        });
      });
    },

    reorderLinks: function (catId, orderedIds) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            var catLinks = d.links.filter(function (l) { return l.categoryId === catId; });
            var idSet = {};
            orderedIds.forEach(function (id, i) { idSet[id] = i; });
            catLinks.forEach(function (l) {
              if (typeof idSet[l.id] === 'number') l.sort = idSet[l.id];
            });
            save(d);
            res({ success: true });
          }, 200);
        });
      });
    },

    verifyPin: function (pin) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var rl = isRateLimited();
            if (rl.limited) {
              res({ valid: false, error: 'Terlalu banyak percobaan. Coba lagi dalam ' + rl.retryAfter + ' detik.', rateLimited: true });
              return;
            }
            var d = loadRaw();
            migratePin(d).then(function () {
              sha256(pin + d.config.pin_salt).then(function (inputHash) {
                if (inputHash === d.config.pin_hash) {
                  failCount = 0;
                  var token = genToken();
                  sessionStorage.setItem('latch-token', token);
                  sessionStorage.setItem('latch-admin', 'true');
                  res({ valid: true, token: token });
                } else {
                  recordFail();
                  res({ valid: false, error: 'PIN salah' });
                }
              });
            });
          }, 150);
        });
      });
    },

    addRow: function (data) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            var catId = data.categoryId ? resolveCategory(data.categoryId, d.categories) : d.categories[0].id;
          var sameCat = d.links.filter(function (l) { return l.categoryId === catId; });
          var maxSort = sameCat.length ? Math.max.apply(null, sameCat.map(function (l) { return l.sort || 0; })) : -1;
          var link = { id: genId(), title: data.title || 'Link Baru', url: data.url || '', categoryId: catId, updated: 0, sort: maxSort + 1 };
          d.links.push(link);
            save(d);
            res({ success: true, id: link.id, link: link });
          }, 250);
        });
      });
    },

    saveRow: function (id, data) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            var idx = d.links.findIndex(function (l) { return l.id === id; });
            if (idx === -1) { res({ success: false }); return; }
          var update = {};
          if (data.title !== undefined) update.title = data.title;
          if (data.url !== undefined) update.url = data.url;
          if (data.categoryId !== undefined) update.categoryId = resolveCategory(data.categoryId, d.categories);
          update.updated = 0;
          d.links[idx] = Object.assign({}, d.links[idx], update);
          if (typeof d.links[idx].sort !== 'number') d.links[idx].sort = idx;
            save(d);
            res({ success: true, link: d.links[idx] });
          }, 250);
        });
      });
    },

    deleteRow: function (id) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            d.links = d.links.filter(function (l) { return l.id !== id; });
            save(d);
            res({ success: true });
          }, 250);
        });
      });
    },

    deleteMany: function (ids) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            d.links = d.links.filter(function (l) { return ids.indexOf(l.id) === -1; });
            save(d);
            res({ success: true, deleted: ids.length });
          }, 300);
        });
      });
    },

    addCategory: function (name) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            var newId = genCatId();
            d.categories.push({ id: newId, name: name, feather: 'folder', sort: d.categories.length + 1 });
            save(d);
            res({ success: true, id: newId });
          }, 200);
        });
      });
    },

    deleteCategory: function (id) {
      return initPromise.then(function () {
        return new Promise(function (res) {
          setTimeout(function () {
            var d = loadRaw();
            d.categories = d.categories.filter(function (c) { return c.id !== id; });
            save(d);
            res({ success: true });
          }, 200);
        });
      });
    }
  };

})();
