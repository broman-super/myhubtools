(function () {
  'use strict';

  var LO = {};
  var loaded = {};

  function fromInline(name) {
    var el = document.getElementById('fragment-' + name);
    if (el) return el.innerHTML;
    return null;
  }

  LO.loadFragment = function (name) {
    return new Promise(function (resolve, reject) {
      if (loaded[name]) { resolve(loaded[name]); return; }

      var inline = fromInline(name);
      if (inline) {
        loaded[name] = inline;
        resolve(inline);
        return;
      }

      var url = 'views/' + name + '.html';
      fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error('Failed to load ' + url);
          return r.text();
        })
        .then(function (html) {
          loaded[name] = html;
          resolve(html);
        })
        .catch(function (err) {
          console.error('[Layout] Cannot load', name, err);
          reject(err);
        });
    });
  };

  LO.loadAll = function (names) {
    return Promise.all(names.map(function (n) { return LO.loadFragment(n); }));
  };

  LO.render = function () {
    var app = document.getElementById('app');
    if (!app) return Promise.reject(new Error('#app not found'));
    app.innerHTML = '';
    return LO.loadAll(['public', 'admin', 'modals', 'footer']).then(function (fragments) {
      app.innerHTML = fragments.join('');
    });
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.layout = LO;
})();
