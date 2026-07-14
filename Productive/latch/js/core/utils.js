(function () {
  'use strict';
  var U = {};

  U.$id = function (id) { return document.getElementById(id); };

  U.debounce = function (fn, ms) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); timer = null; }, ms);
    };
  };

  U.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  U.sanitize = function (s) {
    return String(s).replace(/<[^>]*>/g, '').replace(/[<>\"'`]/g, '').trim();
  };

  U.copyToClipboard = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; });
    }
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { resolve(document.execCommand('copy')); }
      catch (e) { resolve(false); }
      document.body.removeChild(ta);
    });
  };

  U.relTime = function (d) {
    if (d === 0) return 'Hari ini';
    if (d === 1) return 'Kemarin';
    if (d <= 7) return d + ' hari lalu';
    if (d <= 30) return Math.floor(d / 7) + ' minggu lalu';
    if (d <= 365) return Math.floor(d / 30) + ' bulan lalu';
    return Math.floor(d / 365) + ' tahun lalu';
  };

  U.favIcon = function (url) {
    try { return 'https://www.google.com/s2/favicons?domain=' + new URL(url).hostname + '&sz=64'; } catch (e) { return ''; }
  };

  U.svcIcon = function (url) {
    try {
      var u = new URL(url);
      if (u.hostname === 'drive.google.com') return 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_32dp.png';
      if (u.hostname === 'docs.google.com') {
        if (u.pathname.includes('spreadsheets')) return 'https://ssl.gstatic.com/images/branding/product/2x/sheets_2020q4_32dp.png';
        if (u.pathname.includes('presentation')) return 'https://ssl.gstatic.com/images/branding/product/2x/slides_2020q4_32dp.png';
        if (u.pathname.includes('forms')) return 'https://ssl.gstatic.com/images/branding/product/2x/forms_2020q4_32dp.png';
        return 'https://ssl.gstatic.com/images/branding/product/2x/docs_2020q4_32dp.png';
      }
      return null;
    } catch (e) { return null; }
  };

  U.onError = function (imgEl, url) {
    var cb = function () {
      var f = U.favIcon(url);
      if (f) { imgEl.src = f; imgEl.onerror = function () { imgEl.parentElement.innerHTML = '🔗'; }; }
      else { imgEl.parentElement.innerHTML = '🔗'; }
    };
    return cb;
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.utils = U;
})();
