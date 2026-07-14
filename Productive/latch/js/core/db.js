(function () {
  'use strict';
  var U = window.LATCH.utils;
  var cache = {};

  var GAS_URL = 'https://script.google.com/macros/s/AKfycbwzQuMgZWQUUgbz1umfs8zWcTqn0v9-mLrbbehxbMk53b5M79W0y7E0Yk8CnqgL30lI/exec';

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

  function gasFetch(action, payload) {
    var url = GAS_URL + '?action=' + encodeURIComponent(action);
    var options = {
      method: payload ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow'
    };
    if (payload) options.body = JSON.stringify(payload);
    return fetch(url, options).then(function (r) { return r.json(); });
  }

  var DB = {
    getData: function (force) {
      if (force) invalidate();
      return cached('allData', 5000, function () {
        return gasFetch('getData').then(function (data) {
          if (data && data.categories) {
            data.categories.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
          }
          return data;
        });
      });
    },

    verifyPin: function (pin) {
      return gasFetch('verifyPin', { pin: pin });
    },

    addRow: function (data) {
      return gasFetch('addRow', data).then(function (r) {
        if (r && r.success) invalidate();
        return r;
      });
    },

    saveRow: function (id, data) {
      var payload = Object.assign({ id: id }, data);
      return gasFetch('saveRow', payload).then(function (r) {
        if (r && r.success) invalidate();
        return r;
      });
    },

    deleteRow: function (id) {
      return gasFetch('deleteRow', { id: id }).then(function (r) {
        if (r && r.success) invalidate();
        return r;
      });
    },

    deleteMany: function (ids) {
      return gasFetch('deleteMany', { ids: ids }).then(function (r) {
        if (r && r.success) invalidate();
        return r;
      });
    },

    addCategory: function (name) {
      return gasFetch('addCategory', { name: name }).then(function (r) {
        if (r && r.success) invalidate();
        return r;
      });
    },

    deleteCategory: function (id) {
      return gasFetch('deleteCategory', { id: id }).then(function (r) {
        if (r && r.success) invalidate();
        return r;
      });
    },

    reorderLinks: function (catId, orderedIds) {
      return gasFetch('reorderLinks', { catId: catId, orderedIds: orderedIds }).then(function (r) {
        if (r && r.success) invalidate();
        return r;
      });
    },

    invalidate: invalidate
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.db = DB;
})();
