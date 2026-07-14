(function () {
  'use strict';

  var S = {};
  var store = typeof PropertiesService !== 'undefined'
    ? { get: function (k) { return PropertiesService.getScriptProperties().getProperty(k); },
        set: function (k, v) { PropertiesService.getScriptProperties().setProperty(k, v); },
        remove: function (k) { PropertiesService.getScriptProperties().deleteProperty(k); } }
    : { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
        remove: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };

  S.get = function (key, def) {
    try {
      var raw = store.get(key);
      if (raw === null || raw === undefined) return def;
      try { return JSON.parse(raw); } catch (e) { return raw; }
    } catch (e) { return def; }
  };

  S.set = function (key, value) {
    try {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {}
  };

  S.remove = function (key) {
    try { store.remove(key); } catch (e) {}
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.storage = S;
})();
