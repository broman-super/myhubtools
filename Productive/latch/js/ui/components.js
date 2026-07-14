(function () {
  'use strict';
  var state = window.LATCH.state;
  var U = window.LATCH.utils;
  var C = {};

  C.toast = function (message, type) {
    type = type || 'info';
    var existing = document.querySelector('.latch-toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.className = 'latch-toast latch-toast-' + type;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('latch-toast-visible');
    });
    setTimeout(function () {
      el.classList.remove('latch-toast-visible');
      setTimeout(function () { el.remove(); }, 300);
    }, 3000);
  };

  C.toastUndo = function (message, onUndo) {
    var el = document.createElement('div');
    el.className = 'latch-toast latch-toast-info latch-toast-undo';
    el.innerHTML = '<span>' + message + '</span><button class="toast-undo-btn">Undo</button>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('latch-toast-visible'); });
    var timeout = setTimeout(function () {
      el.classList.remove('latch-toast-visible');
      setTimeout(function () { el.remove(); }, 300);
    }, 5000);
    el.querySelector('.toast-undo-btn').addEventListener('click', function () {
      clearTimeout(timeout);
      if (onUndo) onUndo();
      el.classList.remove('latch-toast-visible');
      setTimeout(function () { el.remove(); }, 300);
    });
  };

  C.showLoading = function () {
    var el = U.$id('loadingOverlay');
    if (!el) return;
    el.innerHTML = '<div class="skeleton-grid" id="skeletonGrid">' +
      Array(6).fill('<div class="skeleton-card"><div class="skeleton-row"><div class="skeleton-icon"></div><div class="skeleton-lines"><div class="skeleton-line w-60"></div><div class="skeleton-line w-30"></div></div></div></div>').join('') +
      '</div>';
    el.style.display = 'flex';
  };

  C.hideLoading = function () {
    var el = U.$id('loadingOverlay');
    if (el) el.style.display = 'none';
  };

  C.shakeElement = function (el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(function () { el.classList.remove('shake'); }, 400);
  };

  C.showModal = function (id) {
    var el = U.$id(id);
    if (el) {
      el.style.display = 'flex';
      el.classList.add('modal-open');
      C.trapFocus(el);
    }
  };

  C.hideModal = function (id) {
    var el = U.$id(id);
    if (el) {
      el.style.display = 'none';
      el.classList.remove('modal-open');
      var event = new Event('modal-closed');
      el.dispatchEvent(event);
    }
  };

  C.trapFocus = function (container) {
    var focusable = container.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (first) first.focus();
    function handler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    container.addEventListener('keydown', handler);
    var cleanup = function () {
      container.removeEventListener('keydown', handler);
      container.removeEventListener('modal-closed', cleanup);
    };
    container.addEventListener('modal-closed', cleanup);
  };

  C.skeletonHTML = function (count) {
    count = count || 6;
    return '<div class="skeleton-grid">' +
      Array(count).fill('<div class="skeleton-card"><div class="skeleton-row"><div class="skeleton-icon"></div><div class="skeleton-lines"><div class="skeleton-line w-60"></div><div class="skeleton-line w-30"></div></div></div></div>').join('') +
      '</div>';
  };

  C.renderError = function (msg) {
    return '<div class="error-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>' + U.esc(msg) + '</p></div>';
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.components = C;
})();
