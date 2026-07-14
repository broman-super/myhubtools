(function () {
  'use strict';
  var storage = window.LATCH.storage;
  var T = {};

  T.init = function () {
    var s = storage.get('latch-theme');
    if (s) {
      document.documentElement.setAttribute('data-theme', s);
    } else {
      var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
    }
    T.updateIcon();
  };

  T.toggle = function () {
    var cur = document.documentElement.getAttribute('data-theme');
    var nxt = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nxt);
    storage.set('latch-theme', nxt);
    T.updateIcon();
  };

  T.updateIcon = function () {
    if (typeof feather !== 'undefined') feather.replace();
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.theme = T;
})();
