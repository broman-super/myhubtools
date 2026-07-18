// src/core/iframe-communicator.js - Parent-child iframe communication (non-module)
class IframeCommunicator {
  constructor() {
    this.listeners = new Map();
    this.setupMessageListener();
  }

  setupMessageListener() {
    var self = this;
    window.addEventListener('message', function(event) { self.handleMessage(event); });
  }

  handleMessage(event) {
    var data = event.data || {};
    var type = data.type;
    var source = data.source;
    if (source !== 'reynahub-shell' && source !== 'reynahub-child') return;
    if (!this.listeners.has(type)) return;
    var callbacks = this.listeners.get(type);
    for (var i = 0; i < callbacks.length; i++) {
      try { callbacks[i](data.data, source, event.origin); } catch(e) { console.error('Handler error:', e); }
    }
  }

  addMessageListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
    var self = this;
    return function() {
      var list = self.listeners.get(type);
      var idx = list.indexOf(callback);
      if (idx > -1) list.splice(idx, 1);
    };
  }

  sendToChild(targetId, type, data) {
    var iframe = document.getElementById(targetId);
    if (!iframe || !iframe.contentWindow) return false;
    iframe.contentWindow.postMessage({ type: type, data: data, source: 'reynahub-shell' }, window.location.origin);
    return true;
  }

  sendToParent(type, data) {
    window.parent.postMessage({ type: type, data: data, source: 'reynahub-shell' }, window.location.origin);
  }
}

if (typeof module !== 'undefined') module.exports = { IframeCommunicator };
