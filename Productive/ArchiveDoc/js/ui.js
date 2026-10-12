/* ============================================================
   SPPD Toolbox — UI helpers (tanpa framework)
   ============================================================ */
window.SPT = window.SPT || {};

(function (A) {

  A.$ = function (sel, root) { return (root || document).querySelector(sel); };
  A.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  A.esc = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  A.fmt = function (n) {
    n = Number(n) || 0;
    return 'Rp ' + n.toLocaleString('id-ID');
  };

  A.isoToday = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  A.uid = function () {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  };

  A.readVal = function (id) {
    var el = A.$('#' + id);
    return el ? el.value : '';
  };

  A.num = function (id) {
    var v = parseFloat(A.readVal(id));
    return isNaN(v) ? 0 : v;
  };

  /* ---------- badges ---------- */
  var STATUS_MAP = {
    draft: ['Draft', '#64748b', '#f1f5f9', '●'],
    berjalan: ['Berjalan', '#0f172a', '#f1f5f9', '●'],
    disetujui: ['Disetujui', '#059669', '#ECFDF5', '●'],
    diajukan: ['Diajukan', '#D97706', '#FEF3C7', '●'],
    selesai: ['Selesai', '#1D4ED8', '#EFF6FF', '●'],
    diajukan2: ['Diajukan', '#D97706', '#FEF3C7', '●'],
    todo: ['Belum', '#64748b', '#f1f5f9', '○']
  };

  A.badge = function (key) {
    var m = STATUS_MAP[key] || [key, '#64748b', '#f1f5f9', '●'];
    return '<span class="badge" style="background:' + m[2] + ';color:' + m[1] + '">' +
      m[3] + '&nbsp;' + A.esc(m[0]) + '</span>';
  };

  /* ---------- preferensi gerak ---------- */
  A.reducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  A.scrollBehavior = function () { return A.reducedMotion() ? 'auto' : 'smooth'; };

  /* ---------- toast ---------- */
  A.toast = function (msg, type) {
    var root = A.$('#toast-root');
    if (!root) { return; }
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.setAttribute('role', 'status');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(function () { el.remove(); }, 3000);
  };

  /* Toast dengan aksi "Batalkan" untuk hapus destruktif (undo).
     Timer 7 detik; klik tombol menjalankan onUndo lalu menutup toast. */
  A.toastUndo = function (msg, onUndo, opts) {
    opts = opts || {};
    var root = A.$('#toast-root');
    if (!root) { return; }
    var el = document.createElement('div');
    el.className = 'toast toast-action ' + (opts.type || '');
    el.setAttribute('role', 'status');
    var text = document.createElement('span');
    text.className = 'toast-msg';
    text.textContent = msg;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-undo';
    btn.textContent = opts.label || 'Batalkan';
    var done = false;
    function fade() {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s';
      setTimeout(function () { el.remove(); }, 320);
    }
    var timer = setTimeout(function () { if (!done) { done = true; fade(); } }, opts.duration || 7000);
    btn.addEventListener('click', function () {
      if (done) { return; }
      done = true;
      clearTimeout(timer);
      fade();
      onUndo();
    });
    el.appendChild(text);
    el.appendChild(btn);
    root.appendChild(el);
  };

  /* ---------- modal ---------- */
  var activeModal = null;

  function focusables(root) {
    if (!root) { return []; }
    return A.$$('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root);
  }

  A.modal = function (html, opts) {
    opts = opts || {};
    var root = A.$('#modal-root');
    var restoreFocus = document.activeElement;
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true" tabindex="-1">' + html + '</div>';
    var modalEl = A.$('.modal', backdrop);

    function close() {
      if (!backdrop.parentNode) { return; }
      backdrop.remove();
      document.removeEventListener('keydown', onKey, true);
      if (activeModal && activeModal.backdrop === backdrop) { activeModal = null; }
      if (restoreFocus && document.contains(restoreFocus) && restoreFocus.focus) {
        try { restoreFocus.focus(); } catch (e) {}
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') { return; }
      var f = focusables(modalEl);
      if (!f.length) { e.preventDefault(); if (modalEl) { modalEl.focus(); } return; }
      var first = f[0];
      var last = f[f.length - 1];
      var active = document.activeElement;
      var inside = modalEl.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) { e.preventDefault(); last.focus(); }
      } else {
        if (!inside || active === last) { e.preventDefault(); first.focus(); }
      }
    }

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop && !opts.static) close();
    });
    document.addEventListener('keydown', onKey, true);
    root.appendChild(backdrop);

    activeModal = { close: close, backdrop: backdrop, modal: modalEl };

    var first = focusables(modalEl)[0] || modalEl;
    if (first) { try { first.focus(); } catch (e) {} }
    return { close: close, modal: modalEl, backdrop: backdrop };
  };

  /* Tutup modal aktif dari mana pun (dipakai actions.js). */
  A.closeModal = function () {
    if (activeModal) { activeModal.close(); return true; }
    return false;
  };

  /* Konfirmasi aksi berisiko. `opts.confirm` menamai aksi pada tombolnya
     (mis. "Hapus event", "Reset data") agar bukan label generik "OK". */
  A.confirm = function (title, text, onOk, opts) {
    opts = opts || {};
    var okLabel = opts.confirm || 'Hapus';
    var h = A.modal(
      '<div class="card-pad">' +
      '<h3 class="text-lg font-extrabold mb-1">' + A.esc(title) + '</h3>' +
      '<p class="text-muted text-sm mb-5">' + A.esc(text) + '</p>' +
      '<div class="flex justify-end gap-2">' +
      '<button type="button" class="btn btn-ghost" data-cf="cancel">Batal</button>' +
      '<button type="button" class="btn btn-danger" data-cf="ok">' + A.esc(okLabel) + '</button>' +
      '</div></div>'
    );
    var cancel = A.$('[data-cf="cancel"]', h.modal);
    var ok = A.$('[data-cf="ok"]', h.modal);
    if (cancel) { cancel.addEventListener('click', function () { h.close(); }); }
    if (ok) { ok.addEventListener('click', function () { h.close(); onOk(); }); }
  };

  /* ---------- komponen kecil ---------- */
  /* Judul halaman bersama (dipakai pages.js & pages2.js). */
  A.pageTitle = function (title, sub) {
    return '<div class="flex items-end justify-between gap-3 flex-wrap mb-6">' +
      '<div><h1 class="stat-num text-4xl text-ink leading-none">' + A.esc(title) + '</h1>' +
      (sub ? '<p class="text-muted text-sm mt-1">' + A.esc(sub) + '</p>' : '') + '</div></div>';
  };

  A.statCard = function (label, value, sub, dark) {
    return '' +
      '<div class="stat-card' + (dark ? ' stat-card-dark' : '') + '">' +
      '<div class="stat-label">' + A.esc(label) + '</div>' +
      '<div class="stat-value stat-num-card mt-2">' + value + '</div>' +
      (sub ? '<div class="stat-sub">' + sub + '</div>' : '') +
      '</div>';
  };

  /* Bar progres tunggal (dipakai dashboard & tab) — sebelumnya terduplikasi
     di pages.js dan pages2.js. */
  A.progressBar = function (done, total) {
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return '<div class="h-2 bg-line rounded-full overflow-hidden"><div style="width:' + pct + '%" class="h-full bg-accent progress-fill"></div></div>' +
      '<div class="text-xs text-muted mt-1">' + done + ' dari ' + total + ' selesai (' + pct + '%)</div>';
  };

  A.empty = function (title, sub) {
    return '<div class="card card-pad text-center py-12 empty-state">' +
      '<span class="empty-mark" aria-hidden="true"></span>' +
      '<div class="font-extrabold text-lg mb-1">' + A.esc(title) + '</div>' +
      (sub ? '<div class="text-sm text-muted max-w-md mx-auto">' + A.esc(sub) + '</div>' : '') +
      '</div>';
  };

  A.moneyInput = function (id, label, value) {
    return '<div><label class="label" for="' + id + '">' + A.esc(label) + '</label>' +
      '<input id="' + id + '" type="number" min="0" step="500" class="input" value="' + (value || 0) + '"></div>';
  };

  A.signedInput = function (id, label, value) {
    return '<div><label class="label" for="' + id + '">' + A.esc(label) + '</label>' +
      '<input id="' + id + '" type="number" step="500" class="input" value="' + (value || 0) + '" placeholder="+ masuk / − keluar"></div>';
  };

  A.progress = function (done, total) {
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return '<div class="flex items-center gap-3">' +
      '<div class="progress"><div class="bar"><span style="width:' + pct + '%"></span></div></div>' +
      '<div class="progress-num">' + pct + '%</div></div>';
  };

  /* Badge wallet (Bank / QRIS / Kas / E-Money) supaya konsisten
     di daftar penjualan, pengeluaran, transport, dan alokasi SPPD. */
  A.walletBadge = function (w) {
    var map = {
      'Bank': ['#EFF6FF', '#1D4ED8'],
      'QRIS': ['#f1f5f9', '#0f172a'],
      'Kas': ['#ECFDF5', '#059669'],
      'E-Money': ['#ffe6e6', '#e60000']
    };
    var m = map[w] || ['#f1f5f9', '#64748b'];
    return '<span class="badge" style="background:' + m[0] + ';color:' + m[1] + '">' + A.esc(w) + '</span>';
  };

  A.docChip = function (att) {
    var surat = (att.noSurat || '') ? ' · ' + A.esc(att.noSurat) : '';
    var url = att.url || '';
    var inner = '<span class="font-bold">' + A.esc(att.nama || 'Dokumen') + '</span>' + surat +
      (att.catatan ? '<span class="text-muted"> · ' + A.esc(att.catatan) + '</span>' : '');
    return url
      ? '<a class="doc-chip' + (att.noSurat ? ' surat' : '') + '" href="' + A.esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>'
      : '<span class="doc-chip' + (att.noSurat ? ' surat' : '') + '">' + inner + '</span>';
  };

})(window.SPT);