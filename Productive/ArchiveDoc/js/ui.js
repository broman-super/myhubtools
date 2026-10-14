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
  setTimeout(function(){ try{ A._initDatePickers(document); }catch(e){} },0);
  document.addEventListener('click', function(e){
    var pop=e.target.closest('.date-popover'); if(pop){ return; }
    var disp=e.target.closest('[data-date-display]'); if(disp){ return; }
    A._closeDatePickers();
  }, true);
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){ A._closeDatePickers(); return; }
    var pop=document.querySelector('.date-popover.is-open'); if(!pop) return;
    if(e.key==='Tab'){ return; }
    if(e.key==='Enter'&&e.target&&e.target.classList.contains('cal-day')){ e.preventDefault(); var iso=e.target.getAttribute('data-cal-day'); var tid=pop.dataset.targetId; if(iso&&tid){ A._setDate(tid,iso); A._closeDatePickers(); } return; }
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
      var days=Array.prototype.slice.call(pop.querySelectorAll('.cal-day'));
      if(!days.length) return;
      var cur=document.activeElement; var idx=days.indexOf(cur); if(idx<0) idx=0;
      var col=7;
      if(e.key==='ArrowLeft') idx=Math.max(0,idx-1);
      if(e.key==='ArrowRight') idx=Math.min(days.length-1,idx+1);
      if(e.key==='ArrowUp') idx=Math.max(0,idx-col);
      if(e.key==='ArrowDown') idx=Math.min(days.length-1,idx+col);
      days[idx].focus(); e.preventDefault(); return;
    }
  }, true);
  document.addEventListener('click', function(e){
    var b=e.target.closest('[data-cal]');
    if(!b) return;
    var pop=b.closest('.date-popover'); if(!pop) return;
    var act=b.getAttribute('data-cal');
    if(act==='prev'||act==='next'){
      var v=parseISO(pop.dataset.calView); if(!v)return;
      if(act==='prev') v=new Date(v.y,v.mo-1,1); else v=new Date(v.y,v.mo+1,1);
      var tid=pop.dataset.targetId;
      var cur=document.getElementById(tid); var ciso=cur?cur.value:'';
      A._buildCalendar(pop, ciso, tid);
      var t=pop.querySelector('.cal-title'); if(t){ try{ t.setAttribute('tabindex','-1'); t.focus(); }catch(e){} }
      return;
    }
    if(act==='today'){ var td=new Date(); var tiso=toISO(td.getFullYear(),td.getMonth(),td.getDate()); var tid2=pop.dataset.targetId; if(tid2){ A._setDate(tid2,tiso); A._closeDatePickers(); } return; }
    if(act==='clear'){ var tid3=pop.dataset.targetId; if(tid3){ A._setDate(tid3,''); A._closeDatePickers(); } return; }
  }, true);
  document.addEventListener('click', function(e){
    var d=e.target.closest('[data-cal-day]');
    if(!d) return;
    var pop=d.closest('.date-popover'); if(!pop) return;
    var iso=d.getAttribute('data-cal-day');
    var tid=pop.dataset.targetId; if(iso&&tid){ A._setDate(tid,iso); A._closeDatePickers(); }
  }, true);

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

  A.downloadHtml = function (filename, html) {
    try {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || 'form.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 200);
    } catch (e) { console.error(e); }
  };

  /* ---------- tanggal ---------- */
  var ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  A.fmtDateId = function (iso) {
    if (!iso) { return ''; }
    var s = String(iso).trim();
    if (!s) { return ''; }
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) { return s; }
    var y = parseInt(m[1], 10);
    var mo = parseInt(m[2], 10) - 1;
    var d = parseInt(m[3], 10);
    if (isNaN(d) || mo < 0 || mo > 11) { return s; }
    return d + ' ' + ID_MONTHS[mo] + ' ' + y;
  };

  /* Field tanggal: mempertahankan input[type=date] asli (id tetap) agar readVal/actions bekerja.
     Menampilkan teks terformat; pada pointer halus membuka popover kalender kustom, pada HP tetap pakai native picker. */
  A.dateField = function (id, label, valueISO, opts) {
    opts = opts || {};
    var wrapId = A.uid();
    var popId = A.uid();
    var fmt = A.fmtDateId(valueISO);
    var html = '<div class="date-wrap" data-date-wrap="' + wrapId + '">' +
      '<label class="label" for="' + id + '">' + A.esc(label) + '</label>' +
      '<div class="date-field">' +
      '<button type="button" class="date-display" data-date-display="' + wrapId + '" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="date-text">' + (fmt || 'Pilih tanggal') + '</span>' +
      '<svg class="date-ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 6H5v12h14V8z" fill="currentColor"/></svg>' +
      '</button>' +
      '<input id="' + id + '" type="date" class="input date-native" value="' + A.esc(valueISO || '') + '"' + (opts.attr ? ' ' + opts.attr : '') + '>' +
      '<div class="date-popover" id="' + popId + '" data-date-popover="' + wrapId + '" role="dialog" aria-modal="false" aria-label="Kalender ' + A.esc(label || '') + '"></div>' +
      '</div></div>';
    return html;
  };

  var CAL = {};
  CAL.monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  CAL.dow = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  function toISO(y,m,d){ return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
  function parseISO(s){
    var m=s&&s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m)return null;
    return {y:parseInt(m[1],10),mo:parseInt(m[2],10)-1,d:parseInt(m[3],10)};
  }
  function sameDay(a,b){ return a&&b&&a.y===b.y&&a.mo===b.mo&&a.d===b.d; }
  function isValid(p){ return p&&p.y>=1000&&p.y<=9999&&p.mo>=0&&p.mo<=11&&p.d>=1&&p.d<=31; }

  A._buildCalendar = function(popEl, currentISO, targetId){
    if(!popEl) return;
    var cur=parseISO(currentISO)||{y:(new Date()).getFullYear(),mo:(new Date()).getMonth(),d:(new Date()).getDate()};
    var y=cur.y, mo=cur.mo;
    var first=new Date(y,mo,1);
    var startDow=first.getDay(); // 0 Sun
    var daysInMonth=new Date(y,mo+1,0).getDate();
    var today=new Date();
    var tISO=toISO(today.getFullYear(),today.getMonth(),today.getDate());
    var sel=parseISO(currentISO);
    var html='';
    html+='<div class="cal-head">';
    html+='<button type="button" class="cal-btn" data-cal="prev" aria-label="Bulan sebelumnya">&lt;</button>';
    html+='<div class="cal-title">'+CAL.monthNames[mo]+' '+y+'</div>';
    html+='<button type="button" class="cal-btn" data-cal="next" aria-label="Bulan berikutnya">&gt;</button>';
    html+='</div>';
    html+='<div class="cal-grid">';
    for(var i=0;i<CAL.dow.length;i++){ html+='<div class="cal-dow">'+CAL.dow[i]+'</div>'; }
    // leading
    for(var p=0;p<startDow;p++){
      var pd=new Date(y,mo,1 - (startDow-p));
      html+='<div class="cal-day is-out" data-cal-day="'+toISO(pd.getFullYear(),pd.getMonth(),pd.getDate())+'">'+pd.getDate()+'</div>';
    }
    for(var d=1;d<=daysInMonth;d++){
      var isoD=toISO(y,mo,d);
      var c=[];
      if(isoD===tISO)c.push('is-today');
      if(sel&&isoD===currentISO)c.push('is-selected');
      html+='<div class="cal-day '+c.join(' ')+'" data-cal-day="'+isoD+'" tabindex="0">'+d+'</div>';
    }
    // trailing
    var total=startDow+daysInMonth;
    var rem=(7 - (total%7))%7;
    for(var r=0;r<rem;r++){
      var nd=new Date(y,mo,daysInMonth+1+r);
      html+='<div class="cal-day is-out" data-cal-day="'+toISO(nd.getFullYear(),nd.getMonth(),nd.getDate())+'">'+nd.getDate()+'</div>';
    }
    html+='</div>';
        html+='<div class="cal-foot">';
    html+='<button type="button" class="cal-link" data-cal="today">Hari ini</button>';
    html+='<button type="button" class="cal-link" data-cal="clear">Bersihkan</button>';
    html+='</div>';
    popEl.innerHTML=html;
    popEl.dataset.calView=toISO(y,mo,1);
    popEl.dataset.targetId=targetId||'';
  };

  A._openDatePicker = function(wrap){
    if(!wrap) return;
    var disp=wrap.querySelector('[data-date-display]');
    var pop=wrap.querySelector('[data-date-popover]');
    var nat=wrap.querySelector('.date-native');
    if(!disp||!pop||!nat) return;
    var iso=nat.value||'';
    A._buildCalendar(pop, iso, nat.id);
    pop.classList.add('is-open');
    disp.setAttribute('aria-expanded','true');
    setTimeout(function(){ try{ var f=pop.querySelector('.cal-day.is-selected')||pop.querySelector('.cal-day'); if(f) f.focus(); }catch(e){} },10);
  };
  A._closeDatePickers = function(except){
    var pops=document.querySelectorAll('.date-popover.is-open');
    for(var i=0;i<pops.length;i++){
      var p=pops[i]; if(except&&p===except) continue;
      p.classList.remove('is-open');
      var w=p.closest('[data-date-wrap]'); var d=w&&w.querySelector('[data-date-display]'); if(d) d.setAttribute('aria-expanded','false');
    }
  };
  A._syncDateDisplay = function(nat){
    if(!nat) return;
    var w=nat.closest('[data-date-wrap]');
    var t=w&&w.querySelector('.date-text');
    if(t){ var v=A.fmtDateId(nat.value||''); t.textContent=v||'Pilih tanggal'; }
  };
  A._setDate = function(targetId, iso){
    var el=document.getElementById(targetId);
    if(!el) return;
    el.value=iso||'';
    A._syncDateDisplay(el);
    try{ el.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){}
    try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(e){}
  };
  A._initDatePickers = function(root){
    root=root||document;
    var wraps=root.querySelectorAll('[data-date-wrap]');
    for(var i=0;i<wraps.length;i++){
      var w=wraps[i];
      if(w.dataset.dpInit==='1') continue;
      w.dataset.dpInit='1';
      var disp=w.querySelector('[data-date-display]');
      var pop=w.querySelector('[data-date-popover]');
      var nat=w.querySelector('.date-native');
      if(disp){ disp.addEventListener('click', function(ev){ ev.preventDefault(); var ww=this.closest('[data-date-wrap]'); var pp=ww&&ww.querySelector('[data-date-popover]'); if(pp&&pp.classList.contains('is-open')){ A._closeDatePickers(); } else { A._closeDatePickers(); A._openDatePicker(ww); } }); }
      if(nat){ nat.addEventListener('change', function(){ A._syncDateDisplay(this); }); A._syncDateDisplay(nat); }
    }
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

  A.loaderHtml = function (msg) {
    msg = msg || 'Memuat data...';
    return '<div class="loader-overlay" id="global-loader">' +
      '<div class="loader-card">' +
      '<div class="spinner"></div>' +
      '<div class="loader-text">' + A.esc(msg) + '</div>' +
      '</div></div>';
  };
  A.showLoader = function (msg) {
    var root = A.$('#loader-root');
    if (root && !A.$('#global-loader')) { root.innerHTML = A.loaderHtml(msg); }
    var el = A.$('#global-loader');
    if (el) { el.classList.add('is-active'); }
  };
  A.hideLoader = function () {
    var el = A.$('#global-loader');
    if (el) { el.classList.remove('is-active'); }
  };

})(window.SPT);