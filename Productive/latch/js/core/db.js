(function () {
  'use strict';
  var U = window.LATCH.utils;
  var cache = {};

  function invalidate() {
    cache = {};
  }

  function cached(key, ttl, fetcher) {
    return new Promise(function (resolve, reject) {
      var now = Date.now();
      if (cache[key] && (now - cache[key].time < ttl)) {
        resolve(cache[key].data);
        return;
      }
      fetcher().then(function (data) {
        cache[key] = { data: data, time: now };
        resolve(data);
      }).catch(reject);
    });
  }

  function withError(fn) {
    return function () {
      var args = arguments;
      return new Promise(function (resolve) {
        try {
          fn.apply(null, args).then(function (r) { resolve(r); }).catch(function (err) {
            console.error('[DB] Error:', err);
            resolve({ success: false, error: err.message || 'Unknown error' });
          });
        } catch (err) {
          console.error('[DB] Error:', err);
          resolve({ success: false, error: err.message || 'Unknown error' });
        }
      });
    };
  }

  var DB = {
    getData: function (force) {
      if (force) invalidate();
      return cached('allData', 5000, function () {
        return window.db.getData().then(function (data) {
          data.categories.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
          return data;
        });
      });
    },

    verifyPin: function (pin) {
      return window.db.verifyPin(pin);
    },

    addRow: withError(function (data) {
      return window.db.addRow(data).then(function (r) {
        if (r.success) invalidate();
        return r;
      });
    }),

    saveRow: withError(function (id, data) {
      return window.db.saveRow(id, data).then(function (r) {
        if (r.success) invalidate();
        return r;
      });
    }),

    deleteRow: withError(function (id) {
      return window.db.deleteRow(id).then(function (r) {
        if (r.success) invalidate();
        return r;
      });
    }),

    deleteMany: withError(function (ids) {
      return window.db.deleteMany(ids).then(function (r) {
        if (r.success) invalidate();
        return r;
      });
    }),

    addCategory: withError(function (name) {
      return window.db.addCategory(name).then(function (r) {
        if (r.success) invalidate();
        return r;
      });
    }),

    deleteCategory: withError(function (id) {
      return window.db.deleteCategory(id).then(function (r) {
        if (r.success) invalidate();
        return r;
      });
    }),

    reorderLinks: withError(function (catId, orderedIds) {
      return window.db.reorderLinks(catId, orderedIds).then(function (r) {
        if (r.success) invalidate();
        return r;
      });
    }),

    invalidate: invalidate
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.db = DB;
})();
