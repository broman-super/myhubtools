(function () {
  'use strict';

  function State(initial) {
    var state = JSON.parse(JSON.stringify(initial || {}));
    var listeners = {};

    function get(key) {
      return key ? state[key] : state;
    }

    function set(key, val) {
      if (typeof key === 'object') {
        Object.keys(key).forEach(function (k) { state[k] = key[k]; });
        Object.keys(key).forEach(function (k) { emit(k, state[k]); });
        emit('*', state);
        return;
      }
      state[key] = val;
      emit(key, val);
      emit('*', state);
    }

    function on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return function () { off(event, fn); };
    }

    function off(event, fn) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(function (f) { return f !== fn; });
    }

    function emit(event, data) {
      if (!listeners[event]) return;
      listeners[event].forEach(function (fn) {
        try { fn(data); } catch (e) { console.error('[State] listener error:', e); }
      });
    }

    function destroy() {
      Object.keys(listeners).forEach(function (k) { delete listeners[k]; });
    }

    return { get: get, set: set, on: on, off: off, emit: emit, destroy: destroy };
  }

  var store = State({
    mode: 'view',
    isAdmin: false,
    cats: [],
    links: [],
    viewCats: [],
    search: '',
    tab: 'all',
    delId: null,
    loading: false,
    toast: null
  });

  window.LATCH = window.LATCH || {};
  window.LATCH.state = store;
})();
