/* ============================================================
   SPPD Toolbox — halaman (bagian 1): Dashboard, Event, SPPD,
   Transportasi. Rendering murni; semua handler di actions.js.
   ============================================================ */
window.SPT = window.SPT || {};

(function (A) {
  var store = A.store;
  var ui = A;

  /* ---------- utilitas render ---------- */
  var pageTitle = A.pageTitle;

  function bgTabs(id, tabs, activeKey) {
    var html = '<div class="flex gap-1 overflow-x-auto py-1 -mx-1 px-1 mb-5">';
    tabs.forEach(function (t) {
      var active = t.key === activeKey ? ' active' : '';
      html += '<button class="tab-btn' + active + '" data-action="tab:goto" data-event="' + id + '" data-tab="' + t.key + '">' + ui.esc(t.label) + '</button>';
    });
    return html + '</div>';
  }

  var progressBar = A.progressBar;

  function integrationBanner() {
    return '<div class="card border border-dashed mt-6 p-4 text-sm flex flex-wrap gap-2 items-center">' +
      '<span class="badge" style="background:#FEF3C7;color:#D97706">Prototype</span>' +
      '<span class="text-muted">Data hanya tersimpan di browser ini (localStorage). GAS &amp; Supabase belum tersambung, jadi data belum pindah perangkat.</span></div>';
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function dashboard() {
    var evs = store.events();
    var active = evs.filter(function (e) { return e.status === 'berjalan'; });
    var next = evs.filter(function (e) { return e.status === 'draft' || e.status === 'diajukan' || e.status === 'disetujui'; });
    var rep = store.globalReports();

    var ongoing = ui.empty('Belum ada progres berjalan', 'Buka halaman Event & Tugas dan tandai milestone yang sedang dikerjakan.');
    var anyEv = null, anyMs = null;
    evs.forEach(function (e) {
      store.milestones(e.id).forEach(function (m) { if (m.status === 'aktif' && !anyMs) { anyMs = m; anyEv = e; } });
    });
    if (anyEv) {
      var ms = store.milestones(anyEv.id);
      var done = ms.filter(function (m) { return m.status === 'selesai'; }).length;
      var pctHero = ms.length ? Math.round((done / ms.length) * 100) : 0;
      ongoing = '<div class="overall-progress watch-stat">' +
        '<div class="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Sedang berjalan</div>' +
        '<a href="#/events/' + anyEv.id + '/roadmap" data-action="nav:go" data-href="#/events/' + anyEv.id + '/roadmap" class="text-lg font-extrabold text-white hover:text-accent underline-offset-4 hover:underline">' + ui.esc(anyEv.nama) + '</a>' +
        '<div class="big-num mt-2">' + pctHero + '%</div>' +
        '<div class="bar"><span style="width:' + pctHero + '%"></span></div>' +
        '<p class="text-sm text-white/70 mt-1 mb-3">Tahap aktif: ' + ui.esc(anyMs.judul) + '</p>' +
        progressBar(done, ms.length) + '</div>';
    }

    var aktifCards = active.map(function (e) {
      var s = rep.events[e.id] || store.financeSummary(e.id);
      var _ms = store.milestones(e.id);
      var _done = _ms.filter(function (m) { return m.status === 'selesai'; }).length;
      return '<div class="card card-pad hover:translate-y-[-2px] hover:shadow-xl transition-transform">' +
        '<div class="flex justify-between gap-2 items-start"><a href="#/events/' + e.id + '" data-action="nav:go" data-href="#/events/' + e.id + '" class="font-extrabold hover:text-accent">' + ui.esc(e.nama) + '</a>' + ui.badge(e.status) + '</div>' +
        '<div class="text-xs text-muted mt-1">' + ui.esc(e.lokasi) + ' · ' + ui.esc(e.tanggalMulai) + ' → ' + ui.esc(e.tanggalSelesai) + '</div>' +
        '<div class="grid grid-cols-2 gap-3 mt-4">' +
        '<div><div class="text-xs text-muted">Penjualan</div><div class="font-extrabold mono">' + ui.fmt(s.totalSales) + '</div></div>' +
        '<div><div class="text-xs text-muted">Saldo</div><div class="font-extrabold mono">' + ui.fmt(s.saldo) + '</div></div>' +
        '</div>' +
        '<div class="mt-3">' + ui.progress(_done, _ms.length) + '</div></div>';
    }).join('');

    return pageTitle('Dashboard', 'Ringkasan tugas PIC kamu.') +
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
      ui.statCard('Event Berjalan', String(active.length), 'dari ' + evs.length + ' total') +
      ui.statCard('Total Penjualan', ui.fmt(rep.totalSales), 'semua event') +
      ui.statCard('Total Pengeluaran', ui.fmt(rep.totalExpense), 'transport + operasional') +
      ui.statCard('Saldo Akhir', ui.fmt(rep.totalSaldo), 'dana + penjualan − biaya', true) +
      '</div>' +

      '<div class="grid lg:grid-cols-3 gap-6">' +
      '<div class="lg:col-span-2"><h2 class="font-extrabold text-lg mb-3">Event berjalan</h2>' +
      (aktifCards.length ? '<div class="grid sm:grid-cols-2 gap-4">' + aktifCards + '</div>' : ui.empty('Tidak ada event berjalan', 'Buat event baru dari halaman Event & Tugas untuk mulai tugas.')) +
      '<div class="mt-4"><a class="btn btn-ink" href="#/events" data-action="nav:go" data-href="#/events">Lihat semua event</a></div>' +
      '</div>' +
      '<div><h2 class="font-extrabold text-lg mb-3">Progress</h2>' + ongoing + '</div>' +
      '</div>' +

      (next.length ? '<div class="card card-pad mt-6"><div class="text-xs font-bold text-muted uppercase mb-3">Disiapkan</div>' +
        next.map(function (e) {
          return '<div class="eq"><a href="#/events/' + e.id + '" data-action="nav:go" data-href="#/events/' + e.id + '" class="font-bold hover:text-accent">' + ui.esc(e.nama) + '</a><span class="text-xs text-muted">' + ui.esc(e.tanggalMulai) + '</span></div>';
        }).join('') + '</div>' : '') +

      integrationBanner();
  }

  /* ============================================================
     EVENT LIST
     ============================================================ */
  var eventFilter = 'semua';

  function eventsList() {
    var evs = store.events().slice().sort(function (a, b) { return (a.tanggalMulai || '').localeCompare(b.tanggalMulai || ''); });
    var shown = evs.filter(function (e) { return eventFilter === 'semua' || e.status === eventFilter; });
    var chipKeys = ['semua', 'draft', 'diajukan', 'berjalan', 'disetujui', 'selesai', 'dibatalkan'];
    var chipLabels = ['Semua', 'Draft', 'Diajukan', 'Berjalan', 'Disetujui', 'Selesai', 'Dibatalkan'];
    var chips = chipKeys.map(function (f, i) {
      var label = chipLabels[i];
      var cls = f === eventFilter ? ' bg-ink text-white' : ' bg-surface border border-line';
      return '<button class="tab-btn' + cls + '" data-action="events:filter" data-f="' + f + '">' + label + '</button>';
    }).join('');

    var list = shown.map(function (e) {
      var s = store.financeSummary(e.id);
      var _ms = store.milestones(e.id);
      var _done = _ms.filter(function (m) { return m.status === 'selesai'; }).length;
      var pct = _ms.length ? Math.round((_done / _ms.length) * 100) : 0;
      return '<div class="card card-pad">' +
        '<div class="flex justify-between gap-3 items-start flex-wrap">' +
        '<div><a href="#/events/' + e.id + '" data-action="nav:go" data-href="#/events/' + e.id + '" class="text-lg font-extrabold hover:text-accent">' + ui.esc(e.nama) + '</a>' +
        '<div class="text-xs text-muted mt-1">' + ui.esc(e.lokasi) + ' · ' + ui.esc(e.tanggalMulai) + ' → ' + ui.esc(e.tanggalSelesai) + '</div></div>' + ui.badge(e.status) + '</div>' +
        '<div class="grid grid-cols-3 gap-3 mt-4 text-sm">' +
        '<div><span class="text-xs text-muted block">Progress</span><span class="font-bold">' + pct + '%</span></div>' +
        '<div><span class="text-xs text-muted block">Penjualan</span><span class="font-bold mono">' + ui.fmt(s.totalSales) + '</span></div>' +
        '<div><span class="text-xs text-muted block">Saldo</span><span class="font-bold mono">' + ui.fmt(s.saldo) + '</span></div>' +
        '</div>' +
        '<div class="mt-3">' + ui.progress(_done, _ms.length) + '</div></div>';
    }).join('');

    return pageTitle('Event & Tugas', 'Satu event = satu siklus tugas PIC lengkap.') +
      '<div class="flex justify-between items-center gap-3 flex-wrap mb-5">' +
      '<div class="filter-scroll flex gap-1">' + chips + '</div>' +
      '<button class="btn btn-primary" data-action="event:new">+ Buat Event Baru</button>' +
      '</div>' +
      (list || ui.empty('Tidak ada event', 'Belum ada event di kategori ini. Buat event baru atau ubah filter.'));
  }

  function eventModal(ev) {
    var isNew = !ev;
    ev = ev || { nama: '', lokasi: '', jenis: 'Booth Event Balapan', tanggalMulai: '', tanggalSelesai: '', status: 'draft', peranPic: 'PIC Booth', catatan: '' };
    ui.modal(
      '<div class="card-pad">' +
      '<h3 class="text-lg font-extrabold mb-4">' + (isNew ? 'Buat Event Baru' : 'Edit Event') + '</h3>' +
      '<div class="form-grid form-grid-2">' +
      '<div class="sm:col-span-2"><label class="label" for="ev-nama">Nama Event / Tugas</label><input id="ev-nama" class="input" value="' + ui.esc(ev.nama) + '" placeholder="mis. MotoGP Mandalika 2026"></div>' +
      '<div class="sm:col-span-2"><label class="label" for="ev-lokasi">Lokasi</label><input id="ev-lokasi" class="input" value="' + ui.esc(ev.lokasi) + '"></div>' +
      '<div><label class="label" for="ev-jenis">Jenis Tugas</label><input id="ev-jenis" class="input" value="' + ui.esc(ev.jenis) + '"></div>' +
      '<div><label class="label" for="ev-peran">Peran PIC</label><input id="ev-peran" class="input" value="' + ui.esc(ev.peranPic) + '"></div>' +
      '<div><label class="label" for="ev-tglmulai">Tanggal Mulai</label>' + ui.dateField('ev-tglmulai', 'Tanggal Mulai', ev.tanggalMulai) + '</div>' +
      '<div><label class="label" for="ev-tglselesai">Tanggal Selesai</label>' + ui.dateField('ev-tglselesai', 'Tanggal Selesai', ev.tanggalSelesai) + '</div>' +
      '<div class="sm:col-span-2"><label class="label" for="ev-status">Status</label>' +
      '<select id="ev-status" class="select"><option value="draft">Draft</option><option value="diajukan">Diajukan</option><option value="berjalan">Berjalan</option><option value="disetujui">Disetujui</option><option value="selesai">Selesai</option><option value="dibatalkan">Dibatalkan</option></select></div>' +
      '<div class="sm:col-span-2"><label class="label" for="ev-catatan">Catatan</label><textarea id="ev-catatan" class="textarea">' + ui.esc(ev.catatan) + '</textarea></div>' +
      '</div>' +
      '<div class="flex justify-end gap-2 mt-5">' +
      '<button class="btn btn-ghost" data-action="modal:close">Batal</button>' +
      '<button class="btn btn-ink" data-action="event:save" data-new="' + (isNew ? '1' : '0') + '" data-id="' + ui.esc(ev.id || '') + '">' + (isNew ? 'Simpan' : 'Simpan Perubahan') + '</button>' +
      '</div></div>', { static: true }
    );
    var sel = ui.$('#ev-status'); if (sel) sel.value = ev.status;
  }

  /* ============================================================
     EVENT DETAIL
     ============================================================ */
  var TABS = [
    { key: 'kerja', label: 'Layar Kerja' }
  ];
  var LEGACY = { roadmap: 'kerja', ringkasan: 'kerja', sppd: 'kerja', produk: 'kerja', timeline: 'kerja', persiapan: 'kerja', uang: 'kerja', penjualan: 'kerja', keuangan: 'kerja' };

  function bgTabsSeg(id, tabs, activeKey) {
    var html = '<div class="tabseg" role="tablist" aria-label="Bagian event">';
    tabs.forEach(function (t) {
      var active = t.key === activeKey;
      html += '<div class="tabseg-item' + (active ? ' active' : '') + '" role="tab" tabindex="' + (active ? '0' : '-1') + '" aria-selected="' + (active ? 'true' : 'false') + '" data-action="tab:goto" data-event="' + id + '" data-tab="' + t.key + '">' + ui.esc(t.label) + '</div>';
    });
    return html + '</div>';
  }

  function evHead(ev, id) {
    return '<div class="ev-head">' +
      '<div class="ev-head-main">' +
      '<div class="ev-head-kicker">' + ui.esc(ev.jenis || 'Event Tugas') + '</div>' +
      '<h1 class="stat-num text-3xl text-ink leading-none">' + ui.esc(ev.nama) + '</h1>' +
      '<div class="text-xs text-muted mt-1">' + ui.esc(ev.lokasi) + ' · ' + ui.esc(ev.tanggalMulai) + ' → ' + ui.esc(ev.tanggalSelesai) + '</div>' +
      '</div>' +
      '<div class="ev-head-actions">' + ui.badge(ev.status) +
      '<button class="btn btn-sm btn-ghost" data-action="event:edit" data-id="' + id + '">Edit event</button>' +
      '<button class="btn btn-sm btn-danger" data-action="event:delete" data-id="' + id + '">Hapus event</button></div></div>';
  }

  function eventDetail(id, tab) {
    var ev = store.getEvent(id);
    if (!ev) { return '<div class="py-20">' + ui.empty('Event tidak ditemukan', 'Kembali ke daftar event.') + '</div>'; }
    if (!TABS.some(function (t) { return t.key === tab; })) tab = LEGACY[tab] || 'kerja';
    if (A.bringEv !== id) { A.bringSel = {}; A.bringEv = id; }
    store.ensureDefaultMilestones(id);
    var renderer = { kerja: A.pages2.kerja }[tab];
    return evHead(ev, id) + renderer(ev);
  }

  function roadmapAttModal(mId) {
    ui.modal(
      '<div class="card-pad">' +
      '<h3 class="text-lg font-extrabold mb-4">Lampirkan Dokumen Bukti</h3>' +
      '<p class="text-xs text-muted mb-4">Prototype hanya menyimpan metadata (nama, nomor, tautan). Saat GAS tersambung, tautan menunjuk ke berkas Google Drive — berkasnya tidak disimpan di sini.</p>' +
      '<div class="form-grid">' +
      '<div><label class="label" for="att-nama">Nama Dokumen</label><input id="att-nama" class="input" placeholder="mis. SPPD disetujui (scan)"></div>' +
      '<div><label class="label" for="att-nosurat">Nomor Surat (opsional)</label><input id="att-nosurat" class="input" placeholder="mis. 039/SPPD/UKM/2026"></div>' +
      '<div><label class="label" for="att-url">Tautan Dokumen (opsional)</label><input id="att-url" class="input" placeholder="Tautan Google Drive atau berkas"></div>' +
      '<div><label class="label" for="att-catatan">Catatan</label><input id="att-catatan" class="input"></div>' +
      '</div>' +
      '<div class="flex justify-end gap-2 mt-5">' +
      '<button class="btn btn-ghost" data-action="modal:close">Batal</button>' +
      '<button class="btn btn-ink" data-action="milestone:att:save" data-id="' + mId + '">Simpan Dokumen</button>' +
      '</div></div>', { static: true }
    );
  }

  function danaCairBlock(ev) {
    var dc = store.danaCair(ev.id);
    var total = dc.reduce(function (a, x) { return a + (Number(x.nominal) || 0); }, 0);
    var cair = dc.filter(function (x) { return x.status === 'cair'; })
      .reduce(function (a, x) { return a + (Number(x.nominal) || 0); }, 0);
    var rows = dc.map(function (x) {
      var ok = x.status === 'cair';
      return '<div class="eq">' +
        '<div><div class="font-bold">' + ui.esc(x.sumber) + (ok ? ' <span class="badge" style="background:#ECFDF5;color:#059669">cair</span>' : ' <span class="badge" style="background:#f1f5f9;color:#0f172a">belum</span>') + '</div>' +
        '<div class="text-xs text-muted">' + (x.rekening ? ui.esc(x.rekening) + ' · ' : '') + (x.tanggalCair ? 'cair ' + ui.esc(x.tanggalCair) : 'belum ada tanggal') + (x.catatan ? ' · ' + ui.esc(x.catatan) : '') + '</div></div>' +
        '<div class="flex items-center gap-2"><span class="font-extrabold mono">' + ui.fmt(x.nominal) + '</span>' +
        '<select class="select text-sm w-28" data-action="danaCair:status" data-id="' + x.id + '" data-event="' + ev.id + '"><option value="belum"' + (!ok ? ' selected' : '') + '>Belum</option><option value="cair"' + (ok ? ' selected' : '') + '>Cair</option></select>' +
        '<button class="btn btn-sm btn-ghost" data-action="danaCair:delete" data-id="' + x.id + '">Hapus</button></div></div>';
    }).join('');
    return '<div class="card card-pad mb-6">' +
      '<div class="flex items-center justify-between flex-wrap gap-2 mb-1">' +
      '<div><h2 class="font-extrabold text-lg">Dana Cair — mana saja yang sudah masuk</h2>' +
      '<p class="text-xs text-muted mt-1">Checklist dana tugas yang benar-benar sudah cair (transfer/kas), berbeda dari <b>alokasi</b> di SPPD.</p></div>' +
      '<div class="text-right"><div class="text-xs font-bold text-muted">Sudah cair</div><div class="font-extrabold mono">' + ui.fmt(cair) + ' <span class="text-xs text-muted">/ ' + ui.fmt(total) + '</span></div></div></div>' +
      (rows ? '<div class="mt-2">' + rows + '</div>' : '<p class="text-sm text-muted mt-3">Belum ada sumber dana dicatat.</p>') +
      '<div class="mt-5 border-t border-line pt-5">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Sumber Dana</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="dc-sumber">Sumber (mis. Transfer instansi / Kas)</label><input id="dc-sumber" class="input" placeholder="mis. Transfer instansi (BCA)"></div>' +
      '<div><label class="label" for="dc-rekening">No. Rekening / Ref (opsional)</label><input id="dc-rekening" class="input"></div>' +
      '<div><label class="label" for="dc-tgl">Tanggal Cair</label>' + ui.dateField('dc-tgl', 'Tanggal Cair') + '</div>' +
      '<div>' + ui.moneyInput('dc-nominal', 'Nominal', 0) + '</div>' +
      '<div><label class="label" for="dc-status">Status</label><select id="dc-status" class="select"><option value="belum">Belum cair</option><option value="cair">Sudah cair</option></select></div>' +
      '<div class="flex items-end justify-end"><button class="btn btn-primary" data-action="danaCair:add" data-event="' + ev.id + '">+ Catat Sumber Dana</button></div>' +
      '</div></div></div>';
  }

  function sppdBudgetBlock(ev) {
    var items = store.sppdBudget(ev.id);
    var total = items.reduce(function (a, b) { return a + (Number(b.alokasi) || 0); }, 0);
    var danaAwal = Number(store.getSppd(ev.id).danaAwal) || 0;
    var rows = items.map(function (b) {
      var w = store.budgetWallet(b.kategori, b.wallet);
      return '<div class="eq">' +
        '<div><span class="badge" style="background:#ffe6e6;color:#e60000">' + ui.esc(b.kategori) + '</span> ' +
        ui.walletBadge(w) +
        (b.ket ? ' <span class="text-xs text-muted">' + ui.esc(b.ket) + '</span>' : '') + '</div>' +
        '<div class="flex items-center gap-2"><span class="font-extrabold mono">' + ui.fmt(b.alokasi) + '</span>' +
        '<button class="btn btn-sm btn-ghost" data-action="budget:delete" data-id="' + b.id + '" data-event="' + ev.id + '">Hapus</button></div></div>';
    }).join('');
    var posOpts = budgetKatOptions(store.BUDGET_POS);
    var walletOpts = A.store.WALLETS.map(function (w) {
      return '<option value="' + ui.esc(w) + '"' + (w === 'Kas' ? ' selected' : '') + '>' + ui.esc(w) + '</option>';
    }).join('');
    return '<div class="card card-pad mb-6">' +
      '<div class="flex items-center justify-between flex-wrap gap-2 mb-1">' +
      '<div><h2 class="font-extrabold text-lg">Rincian Alokasi SPPD</h2>' +
      '<p class="text-xs text-muted mt-1">Anggaran per komponen seperti di surat SPPD (penginapan, transport, uang saku, kas kecil, tol, bensin, e-money, dll). Tentukan juga <b>wallet tujuan</b> — dana alokasi ini akan masuk ke dompet mana. <b>Total bisa beda dari Dana Awal</b> — selisihnya tampil di bawah dan di seksi 08.</p></div></div>' +
      (rows ? '<div class="mt-2">' + rows + '</div>' : '<p class="text-sm text-muted mt-3">Belum ada alokasi rinci. Tambah di bawah — boleh kosong selama nilai Dana Awal di atas dipakai.</p>') +
      (function () {
        if (!items.length) { return ''; }
        var agg = {};
        items.forEach(function (b) {
          var w = store.budgetWallet(b.kategori, b.wallet);
          agg[w] = (agg[w] || 0) + (Number(b.alokasi) || 0);
        });
        var chips = Object.keys(agg).map(function (w) {
          return '<span class="eq" style="padding:8px 4px;gap:10px"><span class="text-xs text-muted font-bold">Alokasi ' + ui.esc(w) + '</span>' +
            '<span class="font-extrabold mono">' + ui.fmt(agg[w]) + '</span></span>';
        }).join('');
        return '<div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3">' + chips + '</div>';
      })() +
      '<div class="mt-4 pt-4 border-t border-line flex items-center justify-between flex-wrap gap-2">' +
      '<div class="text-xs font-bold text-muted">Total alokasi rinci</div><div class="font-extrabold mono">' + ui.fmt(total) + '</div></div>' +
      '<div class="mt-1 flex items-center justify-between flex-wrap gap-2">' +
      '<div class="text-xs font-bold text-muted">Dana Awal SPPD</div><div class="font-bold mono">' + ui.fmt(danaAwal) + '</div></div>' +
      '<div class="mt-5 border-t border-line pt-5">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Alokasi per Komponen</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="bg-kategori">Komponen</label><select id="bg-kategori" class="select" data-action="budget:katmode">' + posOpts + '</select></div>' +
      '<div id="bg-custom-wrap" class="hidden"><label class="label" for="bg-custom">Kategori Lain</label><input id="bg-custom" class="input" placeholder="mis. Sewa Generator"></div>' +
      '<div>' + ui.moneyInput('bg-alokasi', 'Alokasi (Rp)', 0) + '</div>' +
      '<div><label class="label" for="bg-wallet">Masuk ke Wallet</label><select id="bg-wallet" class="select">' + walletOpts + '</select>' +
      '<p class="text-xs text-muted mt-1">Alokasi ini dicatat ke dompet ini saat dana dipakai.</p></div>' +
      '<div class="sm:col-span-2"><label class="label" for="bg-ket">Keterangan (opsional)</label><input id="bg-ket" class="input" placeholder="mis. 2 malam hotel"></div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="budget:add" data-event="' + ev.id + '">+ Tambah Alokasi</button></div>' +
      '</div></div></div>';
  }

  /* Ringkasan uang satu pandangan: menyatukan tiga istilah yang sering
     dibingungkan PIC (Dana Awal SPPD · Total Alokasi rinci · Dana Cair) plus
     saldo kas, supaya tidak perlu memetakan angka antar blok secara mental. */
  function moneySummary(ev) {
    var fin = store.financeSummary(ev.id);
    var b = fin.budget;
    var sel = b.selisihDanaAwal;
    var selTxt = (sel > 0 ? '+' : '') + ui.fmt(sel);
    var selSub = sel === 0 ? 'sama dengan Dana Awal'
      : (sel > 0 ? 'alokasi lebih besar dari Dana Awal' : 'alokasi lebih kecil dari Dana Awal');
    return '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Ringkasan Uang</h2>' +
      '<p class="text-xs text-muted mb-4">Dana Awal, alokasi rinci, dan dana yang sudah cair — satu pandangan.</p>' +
      '<div class="grid grid-cols-2 lg:grid-cols-5 gap-4">' +
      ui.statCard('Dana Awal SPPD', ui.fmt(fin.danaAwal), 'nilai di surat SPPD') +
      ui.statCard('Total Alokasi Rinci', ui.fmt(b.totalAlokasi), 'jumlah komponen di bawah') +
      ui.statCard('Selisih', selTxt, selSub, sel !== 0) +
      ui.statCard('Dana Sudah Cair', ui.fmt(fin.danaCair), 'masuk ke rekening / kas') +
      ui.statCard('Saldo Kas', ui.fmt(fin.saldo), fin.saldo < 0 ? 'minus — cek pengeluaran' : 'sisa dana', fin.saldo < 0) +
      '</div></div>';
  }

  /* Opsi komponen anggaran dikelompokkan (optgroup) supaya daftar panjang
     lebih cepat dipindai saat memilih di ponsel. */
  var BUDGET_GROUPS = [
    ['Akomodasi & Perjalanan', ['Penginapan', 'Sewa Transport', 'Transport Umum', 'BBM & Tol']],
    ['Uang & Operasional', ['Uang Saku', 'Kas Kecil', 'Operasional Lain']],
    ['Digital', ['E-Money']]
  ];
  function budgetKatOptions(pos) {
    var used = {};
    var html = BUDGET_GROUPS.map(function (g) {
      var opts = g[1].filter(function (k) { return pos.indexOf(k) >= 0; })
        .map(function (k) { used[k] = 1; return '<option>' + ui.esc(k) + '</option>'; }).join('');
      return opts ? '<optgroup label="' + ui.esc(g[0]) + '">' + opts + '</optgroup>' : '';
    }).join('');
    var rest = pos.filter(function (k) { return !used[k]; })
      .map(function (k) { return '<option>' + ui.esc(k) + '</option>'; }).join('');
    if (rest) { html += rest; }
    return html + '<option value="__custom__">Lainnya (kategori sendiri)…</option>';
  }

  /* Checklist kesiapan sebelum mencetak dokumen resmi. */
  function printReadiness(ev) {
    var s = store.getSppd(ev.id);
    var fin = store.financeSummary(ev.id);
    var ms = store.milestones(ev.id);
    var msDone = ms.filter(function (m) { return m.status === 'selesai'; }).length;
    var checks = [
      { ok: s.status === 'disetujui' || s.status === 'selesai', label: 'SPPD disetujui' },
      { ok: !!s.noSurat, label: 'Nomor surat terisi' },
      { ok: ms.length > 0 && msDone === ms.length, label: 'Semua tahap selesai' },
      { ok: fin.danaCair > 0, label: 'Dana cair dicatat' },
      { ok: fin.saldo >= 0, label: 'Saldo tidak minus' }
    ];
    var pct = checks.filter(function (c) { return c.ok; }).length;
    return '<div class="print-ready"><span class="print-ready-title">Siap cetak? ' + pct + '/' + checks.length + '</span>' +
      checks.map(function (c) {
        return '<span class="badge" style="' + (c.ok ? 'background:#ECFDF5;color:#059669' : 'background:#FEF3C7;color:#D97706') + '">' +
          (c.ok ? '✓ ' : '• ') + ui.esc(c.label) + '</span>';
      }).join('') + '</div>';
  }

  function slugify(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  A._sppdPrintState = A._sppdPrintState || {};
  A._sppdActiveTab = A._sppdActiveTab || {};

  /* legacy, sengaja dipertahankan — renderer aktif sekarang buildSppdHtml.
     Masih dirujuk aksi lama (sppd:print:edit); jangan dihapus. */
  function sppdPrintForm(ev) {
    var stPrint = A._sppdPrintState[ev.id] || { edit: false, logoSrc: '', wmSrc: '', ttd: {} };
    A._sppdPrintState[ev.id] = stPrint;
    var s = store.getSppd(ev.id);
    var fin = store.financeSummary(ev.id);
    var ms = store.milestones(ev.id);
    var eps = store.eventProducts(ev.id);
    var items = store.prepItems(ev.id);
    var sales = store.sales(ev.id);
    var expenses = store.expenses(ev.id);

    var berangkat = ev.tanggalMulai || '';
    var kembali = ev.tanggalSelesai || '';
    var tujuanKota = ev.lokasi || s.tujuan || '';
    var target1 = ms[0] ? ms[0].judul : '';
    var target2 = ms[1] ? ms[1].judul : '';
    var target3 = ms[2] ? ms[2].judul : '';

    var trList = store.transports(ev.id);
    var trMode = '';
    for (var i = 0; i < trList.length; i++) {
      if (trList[i].leg === 'Berangkat') { trMode = trList[i].mode; break; }
      if (trList[i].leg === 'Pulang' && !trMode) { trMode = trList[i].mode; break; }
    }
    var trLabel = '';
    if (trMode === 'pribadi') trLabel = 'Kendaraan Pribadi';
    else if (trMode === 'sewa') trLabel = 'Sewa Kendaraan';
    else if (trMode === 'umum') trLabel = 'Transport Umum';
    else trLabel = 'Kendaraan Pribadi';

    var cbPribadi = (trLabel === 'Kendaraan Pribadi') ? ' on' : '';
    var cbTravel = (trLabel === 'Sewa Kendaraan' || trLabel === 'Travel') ? ' on' : '';
    var cbKereta = (trLabel === 'Kereta Api' || trLabel === 'Transport Umum') ? ' on' : '';
    var cbLain = (!cbPribadi && !cbTravel && !cbKereta) ? ' on' : '';
    var lainText = (!cbLain) ? 'Lainnya : ' : 'Lainnya : ' + trLabel;

    var sppdBudgetItems = store.sppdBudget(ev.id);
    var biayaA = 0, biayaB = 0, biayaC = 0, biayaD = 0, biayaE = 0;
    for (var b = 0; b < sppdBudgetItems.length; b++) {
      var kb = sppdBudgetItems[b];
      var kat = (kb.kategori || '').toLowerCase();
      var al = Number(kb.alokasi) || 0;
      if (kat.indexOf('bensin') >= 0 || kat.indexOf('bbm') >= 0) { biayaA += al; continue; }
      if (kat.indexOf('penginap') >= 0) { biayaB += al; continue; }
      if (kat.indexOf('kas kecil') >= 0 || kat.indexOf('kaskecil') >= 0) { biayaC += al; continue; }
      if (kat.indexOf('tol') >= 0) { biayaD += al; continue; }
      biayaE += al;
    }
    var dcList = store.danaCair(ev.id);
    for (var d = 0; d < dcList.length; d++) {
      var xs = dcList[d];
      var sm = (xs.sumber || '').toLowerCase();
      var nm = Number(xs.nominal) || 0;
      if (sm.indexOf('bensin') >= 0 || sm.indexOf('bbm') >= 0) { biayaA += nm; continue; }
      if (sm.indexOf('penginap') >= 0) { biayaB += nm; continue; }
      if (sm.indexOf('kas kecil') >= 0) { biayaC += nm; continue; }
      if (sm.indexOf('tol') >= 0) { biayaD += nm; continue; }
    }

    function rp(n) { var x = Number(n) || 0; return 'Rp' + (false ? ' ' : '') + x.toLocaleString('id-ID'); }
    function num(v){ return v ? v.toString().replace(/\D/g,'') : ''; }
    function valRp(n){ var x=Number(n)||0; return x? rp(x):''; }

    var spjRows = [];
    for (var sr = 0; sr < Math.max(1, Math.min(6, sales.length + expenses.length || 3)); sr++) { spjRows.push(sr); }

    var wmHtml = '';
    if (stPrint.wmSrc) {
      wmHtml = '<div class="wm" id="wm"><img id="wmImg" alt="" src="' + stPrint.wmSrc + '"></div>';
    } else {
      wmHtml = '<div class="wm" id="wm"><span class="wmtext" id="wmText">[ WATERMARK DUMMY ]<br>PT. ELFIQA KARYA TRIANGGA</span><img id="wmImg" alt="" hidden></div>';
    }
    var logoHtml = '';
    if (stPrint.logoSrc) {
      logoHtml = '<div class="logo" id="logo" data-action="sppd:print:logo"><img id="logoImg" alt="Logo" src="' + stPrint.logoSrc + '"><div class="cap ed" id="logoCap">[PT. ELFIQA KARYA TRIANGGA]</div></div>';
    } else {
      logoHtml = '<div class="logo" id="logo" data-action="sppd:print:logo"><img id="logoImg" alt="Logo" hidden><div class="dummy" id="logoDummy">LOGO</div><div class="cap ed" id="logoCap">[PT. ELFIQA KARYA TRIANGGA]</div></div>';
    }

    var ttdMImg = stPrint.ttd && stPrint.ttd.makerSrc ? '<img alt="" src="' + stPrint.ttd.makerSrc + '">' : '<img alt="" hidden>';
    var ttdCImg = stPrint.ttd && stPrint.ttd.checkerSrc ? '<img alt="" src="' + stPrint.ttd.checkerSrc + '">' : '<img alt="" hidden>';
    var ttdSImg = stPrint.ttd && stPrint.ttd.signerSrc ? '<img alt="" src="' + stPrint.ttd.signerSrc + '">' : '<img alt="" hidden>';
    var hasM = (stPrint.ttd && stPrint.ttd.makerSrc) ? ' has' : '';
    var hasC = (stPrint.ttd && stPrint.ttd.checkerSrc) ? ' has' : '';
    var hasS = (stPrint.ttd && stPrint.ttd.signerSrc) ? ' has' : '';

    var paperCls = stPrint.edit ? 'paper is-edit' : 'paper';
    var editLabel = stPrint.edit ? 'Lihat (Preview)' : 'Edit';

    var spjTbody = '';
    for (var r = 0; r < spjRows.length; r++) {
      var rn = r + 1;
      spjTbody += '<tr class="spjrow"><td class="c n">' + rn + '</td><td class="ed"></td>' +
        '<td class="q"><input class="" value=""></td><td><input class="m" value=""></td><td class="r wd"></td>' +
        '<td class="q"><input class="" value=""></td><td><input class="m" value=""></td><td class="r we"></td>' +
        '<td class="q"><input class="" value=""></td><td><input class="m" value=""></td><td class="r pg"></td>' +
        '<td><input class="m" value=""></td><td></td><td class="ed"></td></tr>';
    }

    var html = '<div class="sppd-actions">' +
      '<button class="btn btn-sm btn-ghost" data-action="sppd:print:edit" data-event="' + ev.id + '">' + editLabel + '</button>' +
      '<button class="btn btn-sm btn-ghost" data-action="sppd:print:download" data-event="' + ev.id + '">Download .html</button>' +
      '<button class="btn btn-sm btn-ink" onclick="window.print()">Cetak (PDF)</button>' +
      '</div>' +
      '<div class="sppd-print-wrap"><div class="zoomer"><div class="' + paperCls + '" id="paper-sppd-' + ev.id + '">' +
      wmHtml +
      '<h1>FORM PENGAJUAN BIAYA PERJALANAN DINAS</h1>' +
      '<table class="main" id="main">' +
      '<colgroup><col style="width:3%"><col style="width:8%"><col style="width:4%"><col style="width:7%"><col style="width:8%"><col style="width:4%"><col style="width:7%"><col style="width:8%"><col style="width:4%"><col style="width:7%"><col style="width:8%"><col style="width:8%"><col style="width:11%"><col style="width:13%"></colgroup>' +
      '<tr><td class="l" colspan="2">Pemberi Tugas</td><td class="ed b" colspan="3">Direktur</td><td class="l" colspan="3">Departemen</td><td class="ed" colspan="4">SUPERSUB</td><td colspan="2" rowspan="2" style="padding:0">' + logoHtml + '</td></tr>' +
      '<tr><td class="l" colspan="2" style="height:9mm">Tanggal dan Jam Berangkat</td><td class="ed" colspan="3">' + ui.esc(berangkat) + '</td><td class="l" colspan="3">Tanggal dan Jam Kembali</td><td class="ed" colspan="4">' + ui.esc(kembali) + '</td></tr>' +
      '<tr><td class="l" colspan="2">Transportasi</td><td class="on' + cbPribadi + '" colspan="3"><span class="cb' + cbPribadi + '"><i></i>&nbsp;<span class="ed">Kendaraan Pribadi</span></span></td><td colspan="3"><span class="cb' + cbTravel + '"><i></i>&nbsp;<span class="ed">Travel</span></span></td><td colspan="4"><span class="cb' + cbKereta + '"><i></i>&nbsp;<span class="ed">Kereta Api</span></span></td><td colspan="2" class="ed">' + ui.esc(lainText) + '</td></tr>' +
      '<tr><td class="l" colspan="2">Kota Tujuan</td><td class="ed" colspan="12">' + ui.esc(tujuanKota) + '</td></tr>' +
      '<tr><td class="l" colspan="2" rowspan="3">Target Pekerjaan</td><td class="c">1</td><td class="ed" colspan="11">' + ui.esc(target1) + '</td></tr>' +
      '<tr><td class="c">2</td><td class="ed" colspan="11">' + ui.esc(target2) + '</td></tr>' +
      '<tr><td class="c">3</td><td class="ed" colspan="11">' + ui.esc(target3) + '</td></tr>' +
      '<tr><td class="l" colspan="14" style="border-bottom:3px solid #000">Biaya-Biaya :</td></tr>' +
      '<tr><td class="hd">NO</td><td class="hd" colspan="11">ITEMS</td><td class="hd">JUMLAH</td><td class="hd">KETERANGAN</td></tr>' +
      '<tr><td class="c">A</td><td class="ed" colspan="11">Bensin</td><td><input class="m top" value="' + num(biayaA) + '"></td><td class="ed"></td></tr>' +
      '<tr><td class="c">B</td><td class="ed" colspan="11">Penginapan</td><td><input class="m top" value="' + num(biayaB) + '"></td><td class="ed"></td></tr>' +
      '<tr><td class="c">C</td><td class="ed" colspan="11">Kas Kecil</td><td><input class="m top" value="' + num(biayaC) + '"></td><td class="ed">Untuk Kembalian</td></tr>' +
      '<tr><td class="c">D</td><td class="ed" colspan="11">TOL</td><td><input class="m top" value="' + num(biayaD) + '"></td><td class="ed"></td></tr>' +
      '<tr><td class="c">E</td><td class="ed" colspan="11"></td><td><input class="m top" value="' + num(biayaE) + '"></td><td class="ed"></td></tr>' +
      '<tr><td class="l" colspan="12" style="border-bottom:3px solid #000">Biaya SPJ</td><td></td><td></td></tr>' +
      '<tr><td class="sh" rowspan="2" style="background:#d9e1f2">No</td><td class="sh" rowspan="2">Yang Bertugas</td><td class="sh" colspan="3">Uang Weekday</td><td class="sh" colspan="3">Uang Weekend</td><td class="sh" colspan="3">Penginapan</td><td class="sh">Lain lain</td><td rowspan="2"></td><td rowspan="2"></td></tr>' +
      '<tr><td class="sh">Qty</td><td class="sh">@</td><td class="sh">Jumlah</td><td class="sh">Qty</td><td class="sh">@</td><td class="sh">Jumlah</td><td class="sh">Qty</td><td class="sh">@</td><td class="sh">Jumlah</td><td class="sh">Konsumsi</td></tr>' +
      spjTbody +
      '<tr style="font-weight:700"><td colspan="2"></td><td></td><td></td><td class="r" id="sWd">Rp0</td><td></td><td></td><td class="r" id="sWe">Rp0</td><td></td><td></td><td class="r" id="sPg">Rp0</td><td class="r" id="sKs">Rp0</td><td class="r" id="sSpj" style="border-bottom:3px solid #000">Rp 0</td><td></td></tr>' +
      '<tr style="font-weight:700;border-top:3px solid #000"><td colspan="12" class="r" style="border-top:3px solid #000">TOTAL BIAYA</td><td class="r" id="grand" style="border-top:3px solid #000">' + ui.fmt(fin.totalBiaya || (biayaA+biayaB+biayaC+biayaD+biayaE)) + '</td><td style="border-top:3px solid #000"></td></tr>' +
      '</table>' +
      '<table class="sig"><colgroup><col style="width:9%"><col style="width:24.3%"><col style="width:9%"><col style="width:24.3%"><col style="width:9%"><col style="width:24.4%"></colgroup>' +
      '<tr><th colspan="2">Maker</th><th colspan="2">Checker</th><th colspan="2">Signer</th></tr>' +
      '<tr><td class="sb" colspan="2"><div class="sign' + hasM + '" data-sign data-role="maker" data-event="' + ev.id + '">' + ttdMImg + '<span class="hint">Klik untuk unggah TTD (atau biarkan kosong untuk TTD basah)</span><button class="x" title="Hapus TTD">×</button></div></td><td class="sb" colspan="2"><div class="sign' + hasC + '" data-sign data-role="checker" data-event="' + ev.id + '">' + ttdCImg + '<span class="hint">Klik untuk unggah TTD (atau biarkan kosong untuk TTD basah)</span><button class="x" title="Hapus TTD">×</button></div></td><td class="sb" colspan="2"><div class="sign' + hasS + '" data-sign data-role="signer" data-event="' + ev.id + '">' + ttdSImg + '<span class="hint">Klik untuk unggah TTD (atau biarkan kosong untuk TTD basah)</span><button class="x" title="Hapus TTD">×</button></div></td></tr>' +
      '<tr><td class="lb">Nama</td><td class="ed" style="font-weight:700">: </td><td class="lb">Nama</td><td class="ed" style="font-weight:700">: </td><td class="lb">Nama</td><td class="ed" style="font-weight:700">: </td></tr>' +
      '<tr><td class="lb">Jabatan</td><td class="ed">: </td><td class="lb">Jabatan</td><td class="ed">: </td><td class="lb">Jabatan</td><td class="ed">: </td></tr>' +
      '<tr><td class="lb">Tanggal</td><td class="ed">: </td><td class="lb">Tanggal</td><td class="ed">: </td><td class="lb">Tanggal</td><td class="ed">: </td></tr>' +
      '</table>' +
      '</div></div></div>';
    return html;
  }

  /* ============================================================
     WIZARD SPPD (6 langkah) — modal inline di ps-1
     State: A._sppdWizard[eventId] = { step, maxStep }
     Data SSOT: store.getSppdWizard(eventId)
     ============================================================ */
  var WZ_STEPS = ['Perusahaan', 'Info Perjalanan', 'Biaya Umum', 'Biaya SPJ', 'Penandatangan', 'Review & Simpan'];

  function wzState(ev) {
    A._sppdWizard = A._sppdWizard || {};
    var st = A._sppdWizard[ev.id];
    if (!st) { st = A._sppdWizard[ev.id] = { step: 0, maxStep: 0 }; }
    return st;
  }
  function wzStepper(st) {
    return '<div class="wz-steps">' + WZ_STEPS.map(function (t, i) {
      var cls = i === st.step ? 'wz-step on' : (i <= st.maxStep ? 'wz-step done' : 'wz-step');
      return '<button type="button" class="' + cls + '" data-action="sppd:wizard:step" data-step="' + i + '"' +
        (i > st.maxStep ? ' disabled' : '') + '>' +
        '<b>LANGKAH ' + (i + 1) + '</b>' + ui.esc(t) + '</button>';
    }).join('') + '</div>';
  }
  function wzNav(ev, st) {
    return '<div class="wz-foot">' +
      '<div class="wz-total">Total biaya: <span id="wz-total">' + ui.fmt(wzTotal(store.getSppdWizard(ev.id))) + '</span></div>' +
      '<button type="button" class="btn btn-ghost" data-action="sppd:wizard:prev"' + (st.step ? '' : ' disabled') + '>&larr; Kembali</button>' +
      (st.step < WZ_STEPS.length - 1
        ? '<button type="button" class="btn btn-primary" data-action="sppd:wizard:next">Lanjut &rarr;</button>'
        : '<button type="button" class="btn btn-primary" data-action="sppd:wizard:save">Simpan SPPD</button>') +
      '</div>';
  }
  function wzTotal(d) {
    var tot = 0;
    (d.biaya || []).forEach(function (b) { tot += Number(b.jumlah) || 0; });
    (d.uangSaku || []).forEach(function (u) { tot += ((Number(u.wq) || 0) * (Number(u.wa) || 0)) + ((Number(u.eq) || 0) * (Number(u.ea) || 0)); });
    (d.penginapan || []).forEach(function (p) { tot += (Number(p.qty) || 0) * (Number(p.a) || 0); });
    (d.konsumsi || []).forEach(function (k) { tot += Number(k) || 0; });
    return tot;
  }
  /* ponytail: gradasi dataURI langsung via canvas — cukup untuk logo/TTD/wm, upload Drive nanti */
  function wzImg(src, key, label) {
    return '<div class="wz-imgrow">' + (src ? '<img src="' + ui.esc(src) + '" alt="">' : '') +
      '<div class="flex flex-col gap-2"><button type="button" class="btn btn-sm" data-action="sppd:wizard:upload" data-img="' + key + '">' +
      (src ? 'Ganti' : 'Unggah') + ' ' + label + '</button>' +
      (src ? '<button type="button" class="btn btn-sm btn-ghost" data-action="sppd:wizard:imgclear" data-img="' + key + '">Hapus</button>' : '') +
      '</div></div>';
  }

  /* Kepala wizard: judul (nama event), langkah aktif, status penyimpanan,
     plus bar progres — pengganti baris meta polos. */
  function wzHead(st, judul) {
    var pct = Math.round(((st.step + 1) / WZ_STEPS.length) * 100);
    return '<div class="wz-head">' +
      '<div>' +
      '<div class="wz-title">' + ui.esc(judul) + '</div>' +
      '<div class="wz-subtitle">' + ui.esc(WZ_STEPS[st.step]) + ' · Langkah ' + (st.step + 1) + ' dari ' + WZ_STEPS.length + '</div>' +
      '</div>' +
      '<span class="wz-store">Data tersimpan di browser ini' +
      (store.hasCloud() ? ' · sinkron cloud aktif' : '') + '</span>' +
      '</div>' +
      '<div class="wz-progress" role="progressbar" aria-label="Progres langkah" aria-valuemin="1" aria-valuemax="' + WZ_STEPS.length + '" aria-valuenow="' + (st.step + 1) + '">' +
      '<i style="width:' + pct + '%"></i></div>';
  }

  function sppdWizardModal(ev) {
    var st = wzState(ev);
    var d = store.getSppdWizard(ev.id);
    var evo = store.getEvent(ev.id);
    return '<div class="wz" id="wz-root">' +
      wzHead(st, (evo && evo.nama) || 'Form SPPD') +
      wzStepper(st) +
      '<div class="card card-pad">' + sppdWizardStepHTML(st.step, d, ev.id) + '</div>' +
      wzNav(ev, st) + '</div>';
  }

  function sppdWizardStepHTML(n, d, evId) {
    var h = '', i;
    if (n === 0) {
      h += '<div class="form-grid form-grid-2">' +
        '<div class="sm:col-span-2"><label class="label" for="wz-pnama">Nama Perusahaan</label>' +
        '<input id="wz-pnama" class="input" value="' + ui.esc(d.perusahaan.nama) + '" data-wz="perusahaan.nama"></div>' +
        '<div class="sm:col-span-2"><span class="label">Logo</span>' + wzImg(d.perusahaan.logo, 'logo', 'logo') + '</div>' +
        '<div class="sm:col-span-2"><label class="label" for="wz-wm">Watermark</label>' +
        '<select id="wz-wm" class="select" data-action="sppd:wizard:wmmode" data-wz="perusahaan.wmMode">' +
        [['teks', 'Teks nama perusahaan'], ['logo', 'Pakai logo'], ['gambar', 'Gambar khusus'], ['off', 'Tanpa watermark']]
          .map(function (o) { return '<option value="' + o[0] + '"' + (d.perusahaan.wmMode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
        '</select></div>' +
        (d.perusahaan.wmMode === 'gambar' ? '<div class="sm:col-span-2"><span class="label">Gambar Watermark</span>' + wzImg(d.perusahaan.wmImg, 'wm', 'watermark') + '</div>' : '') +
        '</div>' +
        '<div class="wz-signcard mt-3"><h4 class="wz-sh">Jadikan default</h4>' +
        '<p class="text-xs text-muted mb-2">Simpan nama, logo, dan watermark ini agar otomatis terisi di setiap SPPD baru.</p>' +
        '<button type="button" class="btn btn-sm" data-action="sppd:wizard:saveprof">Simpan sebagai default perusahaan</button>' +
        (store.settings().sppdProfile ? ' <span class="text-xs text-muted">Profil default tersimpan.</span>' : '') +
        '</div>' +
        '<p class="text-xs text-muted mt-3">Identitas ini tampil di kanan-atas form resmi.</p>';
    } else if (n === 1) {
      var T = d.transport;
      h += '<div class="form-grid form-grid-2">' +
        '<div><label class="label" for="wz-ptugas">Pemberi Tugas</label><input id="wz-ptugas" class="input" value="' + ui.esc(d.pemberiTugas) + '" data-wz="pemberiTugas"></div>' +
        '<div><label class="label" for="wz-dept">Departemen</label><input id="wz-dept" class="input" value="' + ui.esc(d.departemen) + '" data-wz="departemen"></div>' +
        '<div>' + ui.dateField('wz-tglb', 'Tanggal Berangkat *', d.tglBerangkat, { attr: 'data-wz="tglBerangkat"' }) + '</div>' +
        '<div>' + ui.timeField('wz-jamb', 'Jam Berangkat', d.jamBerangkat, { attr: 'data-wz="jamBerangkat"' }) + '</div>' +
        '<div>' + ui.dateField('wz-tglk', 'Tanggal Kembali', d.tglKembali, { attr: 'data-wz="tglKembali"' }) + '</div>' +
        '<div><label class="label" for="wz-ketk">Keterangan Kembali</label><input id="wz-ketk" class="input" value="' + ui.esc(d.ketKembali) + '" data-wz="ketKembali" placeholder="sampai dengan selesai"></div>' +
        '<div class="sm:col-span-2"><span class="label">Transportasi</span><div class="flex flex-wrap gap-3 mt-1">' +
        [['pribadi', 'Kendaraan Pribadi'], ['travel', 'Travel'], ['kereta', 'Kereta Api']].map(function (o) {
          return '<label class="wz-ck"><input type="checkbox" data-wz="transport.' + o[0] + '"' + (T[o[0]] ? ' checked' : '') + '> ' + o[1] + '</label>';
        }).join('') +
        '<input class="input" style="max-width:200px" value="' + ui.esc(T.lainnya) + '" data-wz="transport.lainnya" placeholder="Lainnya (mis. Pesawat)">' +
        '</div></div>' +
        '<div><label class="label" for="wz-kota">Kota Tujuan *</label><input id="wz-kota" class="input" value="' + ui.esc(d.kota) + '" data-wz="kota" placeholder="mis. Banyumas"></div>' +
        '<div><label class="label" for="wz-t1">Target Pekerjaan 1 *</label><input id="wz-t1" class="input" value="' + ui.esc(d.target[0]) + '" data-wz="target.0" placeholder="mis. Buka stan MAG Enduro 2026"></div>' +
        '<div><label class="label" for="wz-t2">Target 2</label><input id="wz-t2" class="input" value="' + ui.esc(d.target[1]) + '" data-wz="target.1"></div>' +
        '<div><label class="label" for="wz-t3">Target 3</label><input id="wz-t3" class="input" value="' + ui.esc(d.target[2]) + '" data-wz="target.2"></div>' +
        '</div>';
    } else if (n === 2) {
      var cap = store.SPPD_BIAYA_MAX;
      h += '<p class="text-xs text-muted mb-3">Maksimal ' + cap + ' item. Jumlah kosong tampil "-" di form resmi.</p>';
      for (i = 0; i < d.biaya.length; i++) {
        var b = d.biaya[i];
        h += '<div class="wz-row">' +
          '<span class="wz-letter">' + 'ABCDEFGH'[i] + '</span>' +
          '<input class="input" value="' + ui.esc(b.item) + '" data-wz="biaya.' + i + '.item" placeholder="Item" aria-label="Item biaya ' + (i + 1) + '">' +
          '<input class="input" type="number" min="0" value="' + (Number(b.jumlah) || '') + '" data-wz="biaya.' + i + '.jumlah" data-n="1" placeholder="Jumlah (Rp)" aria-label="Jumlah item biaya ' + (i + 1) + '">' +
          '<input class="input" value="' + ui.esc(b.ket) + '" data-wz="biaya.' + i + '.ket" placeholder="Keterangan" aria-label="Keterangan item biaya ' + (i + 1) + '">' +
          '</div>';
      }
      h += '<div class="flex flex-wrap gap-2 mt-3">' +
        '<button type="button" class="btn btn-sm" data-action="sppd:wizard:addbiaya"' + (d.biaya.length >= cap ? ' disabled' : '') + '>+ Tambah Item (' + d.biaya.length + '/' + cap + ')</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-action="sppd:wizard:delbiaya"' + (d.biaya.length <= 1 ? ' disabled' : '') + '>&minus; Hapus Item Terakhir</button>' +
        '</div>';
    } else if (n === 3) {
      h += '<p class="text-xs text-muted mb-3">Keempat daftar berdiri sendiri (tidak terikat per orang). Baris form = daftar terbanyak, maks. ' + store.SPPD_SPJ_MAX_ROWS + ' per daftar.</p>';
      h += '<div class="wz-spjgrid">';
      h += '<div><h4 class="wz-sh">Yang Bertugas</h4>';
      for (i = 0; i < d.petugas.length; i++) {
        h += '<div class="wz-nrow"><input class="input" value="' + ui.esc(d.petugas[i]) + '" data-wz="petugas.' + i + '" placeholder="Nama petugas ' + (i + 1) + '" aria-label="Petugas ' + (i + 1) + '"></div>';
      }
      h += '</div><div><h4 class="wz-sh">Uang Saku (Qty &times; Tarif)</h4>';
      for (i = 0; i < d.uangSaku.length; i++) {
        var u = d.uangSaku[i];
        h += '<div class="wz-nrow"><input class="input" type="number" min="0" value="' + (Number(u.wq) || '') + '" data-wz="uangSaku.' + i + '.wq" data-n="1" placeholder="WD Qty" aria-label="Weekday Qty baris ' + (i + 1) + '">' +
          '<input class="input" type="number" min="0" value="' + (Number(u.wa) || '') + '" data-wz="uangSaku.' + i + '.wa" data-n="1" placeholder="WD @" aria-label="Weekday tarif baris ' + (i + 1) + '">' +
          '<input class="input" type="number" min="0" value="' + (Number(u.eq) || '') + '" data-wz="uangSaku.' + i + '.eq" data-n="1" placeholder="WE Qty" aria-label="Weekend Qty baris ' + (i + 1) + '">' +
          '<input class="input" type="number" min="0" value="' + (Number(u.ea) || '') + '" data-wz="uangSaku.' + i + '.ea" data-n="1" placeholder="WE @" aria-label="Weekend tarif baris ' + (i + 1) + '">' +
          '<div class="wz-sub" id="wz-su' + i + '"></div></div>';
      }
      h += '</div><div><h4 class="wz-sh">Penginapan (Qty &times; Tarif)</h4>';
      for (i = 0; i < d.penginapan.length; i++) {
        var p = d.penginapan[i];
        h += '<div class="wz-nrow"><input class="input" type="number" min="0" value="' + (Number(p.qty) || '') + '" data-wz="penginapan.' + i + '.qty" data-n="1" placeholder="Qty malam" aria-label="Jumlah malam baris ' + (i + 1) + '">' +
          '<input class="input" type="number" min="0" value="' + (Number(p.a) || '') + '" data-wz="penginapan.' + i + '.a" data-n="1" placeholder="Tarif/malam" aria-label="Tarif per malam baris ' + (i + 1) + '">' +
          '<div class="wz-sub" id="wz-sp' + i + '"></div></div>';
      }
      h += '</div><div><h4 class="wz-sh">Konsumsi (Nominal)</h4>';
      for (i = 0; i < d.konsumsi.length; i++) {
        h += '<div class="wz-nrow"><input class="input" type="number" min="0" value="' + (Number(d.konsumsi[i]) || '') + '" data-wz="konsumsi.' + i + '" data-n="1" placeholder="Nominal konsumsi ' + (i + 1) + '" aria-label="Konsumsi baris ' + (i + 1) + '"></div>';
      }
      h += '</div></div>';
      h += '<div class="flex flex-wrap gap-2 mt-4">' +
        [['petugas', 'Petugas'], ['uangSaku', 'Uang Saku'], ['penginapan', 'Penginapan'], ['konsumsi', 'Konsumsi']].map(function (o) {
          return '<div class="flex gap-1"><button type="button" class="btn btn-sm" data-action="sppd:wizard:addrow" data-list="' + o[0] + '">+ ' + o[1] + '</button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-action="sppd:wizard:delrow" data-list="' + o[0] + '">&minus;</button></div>';
        }).join('') + '</div>';
    } else if (n === 4) {
      h += '<p class="text-xs text-muted mb-3">Tanda tangan opsional — kosongkan bila ingin TTD basah setelah dicetak.</p>';
      [['maker', 'Maker (pembuat)'], ['checker', 'Checker (pemeriksa)'], ['signer', 'Signer (penandatangan)']].forEach(function (r, k) {
        var sg = d.ttd[r[0]];
        h += '<div class="wz-signcard"><h4 class="wz-sh">' + r[1] + '</h4>' +
          '<div class="form-grid form-grid-3">' +
          '<div><label class="label" for="wz-sg-n' + k + '">Nama</label><input id="wz-sg-n' + k + '" class="input" value="' + ui.esc(sg.nama) + '" data-wz="ttd.' + r[0] + '.nama"></div>' +
          '<div><label class="label" for="wz-sg-j' + k + '">Jabatan</label><input id="wz-sg-j' + k + '" class="input" value="' + ui.esc(sg.jabatan) + '" data-wz="ttd.' + r[0] + '.jabatan"></div>' +
          '<div>' + ui.dateField('wz-sg-t' + k, 'Tanggal', sg.tanggal, { attr: 'data-wz="ttd.' + r[0] + '.tanggal"' }) + '</div>' +
          '</div>' + wzImg(sg.img, 'ttd:' + r[0], 'tanda tangan') +
          '</div>';
      });
    } else {
      var c = wzTotal(d);
      h += '<div class="wz-review">' +
        '<div class="flex flex-wrap items-center justify-between gap-3 mb-3">' +
        '<div class="text-sm text-muted">Pratinjau mengikuti form resmi 1 halaman A4 landscape. Di layar kecil, geser mendatar atau buka Pratinjau Penuh.</div>' +
        '<div class="font-extrabold mono">Total: ' + ui.fmt(c) + '</div></div>' +
        '<div class="vw" id="wz-vw"><iframe id="wz-pv" title="Pratinjau SPPD"></iframe></div>' +
        '<div class="flex flex-wrap gap-2 mt-3">' +
        (evId ? '<button type="button" class="btn btn-sm btn-ghost" data-action="sppd:viewPrint" data-event="' + evId + '">Pratinjau Penuh</button>' : '') +
        '<button type="button" class="btn btn-sm" data-action="sppd:wizard:download">Unduh .html</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-action="sppd:wizard:print">Cetak / Simpan PDF</button>' +
        '</div></div>';
    }
    return h;
  }

  /* Validasi minimal: langkah 1 wajib kota, tanggal berangkat, target 1.
     `missing` mengembalikan path data-wz yang kosong supaya UI bisa
     menandai + fokus field bermasalah (bukan toast saja). */
  function sppdWizardMissing(n, d) {
    if (n !== 1) { return []; }
    var m = [];
    if (!String(d.kota || '').trim()) { m.push('kota'); }
    if (!String(d.tglBerangkat || '').trim()) { m.push('tglBerangkat'); }
    if (!String((d.target || [])[0] || '').trim()) { m.push('target.0'); }
    return m;
  }
  function sppdWizardValidate(n, d) {
    return sppdWizardMissing(n, d).length === 0;
  }

  /* ============================================================
     RENDERER CETAK SPPD — satu-satunya sumber tampilan form.
     Dipakai untuk: pratinjau modal, review wizard, unduhan .html,
     dan cetak (A4 landscape). Port dari Draft_UPD/Form_Web_SPPD.
     ============================================================ */
  var SPPD_PRINT_CSS =
    '@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0}' +
    'body{background:#8a8f99;font-family:Calibri,Carlito,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.bar{padding:8px;text-align:center}.bar button{font:inherit;padding:6px 14px}' +
    '.paper{position:relative;width:297mm;height:209mm;margin:0 auto 8px;padding:6mm 10mm;background:#fff;color:#000;font-size:8.5pt;overflow:hidden}' +
    '.paper>*{position:relative;z-index:1}' +
    '.paper>.wm{position:absolute;z-index:0;left:0;right:0;top:48mm;height:100mm;display:flex;align-items:center;justify-content:center;opacity:.07}' +
    '.wm img{max-width:150mm;max-height:100mm}.wm span{font-size:42pt;font-weight:800;text-align:center}' +
    'h1{margin:0 0 3mm;text-align:center;font-size:12pt}table{border-collapse:collapse;width:100%;table-layout:fixed}' +
    '.m{border:2.5px solid #000}.m td{border:1px solid #000;padding:0 4px;height:var(--rh);line-height:1.1;vertical-align:middle;overflow:hidden;white-space:nowrap}' +
    '.l{font-weight:700;text-transform:uppercase}.hd{background:#00b0f0;font-weight:700;text-align:center}.sh{background:#d9e1f2;font-weight:700;text-align:center}' +
    '.c{text-align:center}.r{text-align:right}.b{font-weight:700}.on{background:#c6e0b4}.t3{border-top:3px solid #000!important}.b3{border-bottom:3px solid #000!important}' +
    '.cb{display:inline-block;width:9px;height:9px;border:1px solid #000;font-size:8px;line-height:8px;text-align:center;vertical-align:middle;margin-right:4px}' +
    '.logo{display:flex;flex-direction:column;align-items:center;justify-content:center;height:calc(var(--rh)*2.6);gap:1px;overflow:hidden}' +
    '.logo img{max-width:100%;max-height:calc(var(--rh)*1.6)}' +
    '.logo .d{width:calc(var(--rh)*1.5);height:calc(var(--rh)*1.5);border:1.5px dashed #000;font-size:6pt;font-weight:700;display:flex;align-items:center;justify-content:center}' +
    '.logo .cp{font-size:6.5pt;font-weight:700;white-space:nowrap}' +
    '.sig{width:calc(100% - 4.7%);margin:3.5mm 0 0 4.7%;border:2px solid #000}' +
    '.sig td,.sig th{border:1px solid #000;padding:0 4px;height:var(--rh);font-size:inherit}.sig th{height:calc(var(--rh)*1.3)}' +
    '.sig td.sb{height:calc(var(--rh)*4);padding:0;text-align:center}.sig td.sb img{max-width:100%;max-height:calc(var(--rh)*3.8)}.sig td.lb{width:9%}' +
    '@media print{body{background:#fff}.bar{display:none}.paper{margin:0}}';

  var SPPD_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var SPPD_BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function sppdDShort(s) { if (!s) { return ''; } var p = s.split('-'); return p[2] + '-' + SPPD_MON[+p[1] - 1] + '-' + p[0].slice(2); }
  function sppdDLong(s) { if (!s) { return ''; } var p = s.split('-'); return (+p[2]) + ' ' + SPPD_BLN[+p[1] - 1] + ' ' + p[0]; }
  function sppdRp(n, sp) { return 'Rp' + (sp ? ' ' : '') + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function sppdNum(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

  /* `d` = objek wizard store.getSppdWizard(eventId). Mengembalikan dokumen
     HTML **utuh** (CSS inline, A4 landscape) — dipakai preview & unduhan. */
  function buildSppdHtml(d) {
    var n = 0, i;
    d.biaya = d.biaya || [];
    d.petugas = d.petugas || []; d.uangSaku = d.uangSaku || [];
    d.penginapan = d.penginapan || []; d.konsumsi = d.konsumsi || [];
    n = Math.max(1, d.petugas.length, d.uangSaku.length, d.penginapan.length, d.konsumsi.length);

    var wd = 0, we = 0, pg = 0, ks = 0, top = 0;
    for (i = 0; i < n; i++) {
      var u = d.uangSaku[i] || {}, p = d.penginapan[i] || {};
      var a = sppdNum(u.wq) * sppdNum(u.wa), b = sppdNum(u.eq) * sppdNum(u.ea), c = sppdNum(p.qty) * sppdNum(p.a), k = sppdNum(d.konsumsi[i]);
      wd += a; we += b; pg += c; ks += k;
    }
    d.biaya.forEach(function (x) { top += sppdNum(x.jumlah); });
    var spj = wd + we + pg + ks, total = top + spj;

    var H = Math.max(3.8, Math.min(5, (190 - 23.5) / (23 + d.biaya.length + n)));
    H = Math.round(H * 100) / 100;
    var fs = H < 4.7 ? 8 : 8.5;

    var P = d.perusahaan || {};
    var logo = P.logo ? '<img src="' + ui.esc(P.logo) + '" alt="Logo">' : '<div class="d">LOGO</div>';
    var wmSrc = P.wmMode === 'logo' ? P.logo : (P.wmMode === 'gambar' ? P.wmImg : '');
    var wm = P.wmMode === 'off' ? '' : '<div class="wm">' + (wmSrc ? '<img src="' + ui.esc(wmSrc) + '" alt="">' : '<span>' + ui.esc(P.nama || '') + '</span>') + '</div>';
    var kembali = ui.esc(sppdDShort(d.tglKembali)) + (d.ketKembali ? '<br>' + ui.esc(d.ketKembali) : '');
    var T = d.transport || {};

    var h = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
      '<title>SPPD ' + ui.esc(d.kota) + ' ' + ui.esc(sppdDShort(d.tglBerangkat)) + '</title>' +
      '<style>' + SPPD_PRINT_CSS + '</style></head><body>' +
      '<div class="bar"><button onclick="window.print()">Cetak / Simpan PDF</button></div>' +
      '<div class="paper" style="--rh:' + H + 'mm;font-size:' + fs + 'pt">' + wm +
      '<h1>FORM PENGAJUAN BIAYA PERJALANAN DINAS</h1>' +
      '<table class="m"><colgroup><col style="width:3%"><col style="width:8%"><col style="width:4%"><col style="width:7%"><col style="width:8%"><col style="width:4%"><col style="width:7%"><col style="width:8%"><col style="width:4%"><col style="width:7%"><col style="width:8%"><col style="width:8%"><col style="width:11%"><col style="width:13%"></colgroup>' +
      '<tr><td class="l" colspan="2">Pemberi Tugas</td><td class="b" colspan="3">' + ui.esc(d.pemberiTugas) + '</td><td class="l" colspan="3">Departemen</td><td colspan="4">' + ui.esc(d.departemen) + '</td><td colspan="2" rowspan="2" style="padding:0"><div class="logo">' + logo + '<div class="cp">[' + ui.esc(P.nama) + ']</div></div></td></tr>' +
      '<tr><td class="l" colspan="2" style="height:calc(var(--rh)*1.7)">Tanggal dan Jam Berangkat</td><td colspan="3">' + ui.esc(sppdDShort(d.tglBerangkat)) + '<br>' + ui.esc(d.jamBerangkat) + '</td><td class="l" colspan="3">Tanggal dan Jam Kembali</td><td colspan="4">' + kembali + '</td></tr>';

    function cb(on, t) { return '<span class="cb">' + (on ? '✓' : '') + '</span>' + t; }
    h += '<tr><td class="l" colspan="2">Transportasi</td>' +
      '<td colspan="3"' + (T.pribadi ? ' class="on"' : '') + '>' + cb(T.pribadi, 'Kendaraan Pribadi') + '</td>' +
      '<td colspan="3"' + (T.travel ? ' class="on"' : '') + '>' + cb(T.travel, 'Travel') + '</td>' +
      '<td colspan="4"' + (T.kereta ? ' class="on"' : '') + '>' + cb(T.kereta, 'Kereta Api') + '</td>' +
      '<td colspan="2">' + (T.lainnya ? 'Lainnya : ' + ui.esc(T.lainnya) : '') + '</td></tr>' +
      '<tr><td class="l" colspan="2">Kota Tujuan</td><td colspan="12">' + ui.esc(d.kota) + '</td></tr>';
    for (i = 0; i < 3; i++) {
      h += '<tr>' + (i ? '' : '<td class="l" colspan="2" rowspan="3">Target Pekerjaan</td>') +
        '<td class="c">' + (i + 1) + '</td><td colspan="11">' + ui.esc((d.target || [])[i] || '') + '</td></tr>';
    }
    h += '<tr><td class="l b3" colspan="14">Biaya-Biaya :</td></tr>' +
      '<tr><td class="hd">NO</td><td class="hd" colspan="11">ITEMS</td><td class="hd">JUMLAH</td><td class="hd">KETERANGAN</td></tr>';
    d.biaya.forEach(function (x, k) {
      h += '<tr><td class="c">' + 'ABCDEFGH'[k] + '</td><td colspan="11">' + ui.esc(x.item) + '</td>' +
        '<td class="r">' + (sppdNum(x.jumlah) ? sppdRp(x.jumlah, 1) : '-') + '</td><td>' + ui.esc(x.ket) + '</td></tr>';
    });
    h += '<tr><td class="l b3" colspan="12">Biaya SPJ</td><td></td><td></td></tr>' +
      '<tr><td class="sh" rowspan="2">No</td><td class="sh" rowspan="2">Yang Bertugas</td><td class="sh" colspan="3">Uang Weekday</td><td class="sh" colspan="3">Uang Weekend</td><td class="sh" colspan="3">Penginapan</td><td class="sh">Lain lain</td><td rowspan="2"></td><td rowspan="2"></td></tr>' +
      '<tr>' + ['Qty', '@', 'Jumlah', 'Qty', '@', 'Jumlah', 'Qty', '@', 'Jumlah'].map(function (t) { return '<td class="sh">' + t + '</td>'; }).join('') + '<td class="sh">Konsumsi</td></tr>';

    function mm(v) { return sppdNum(v) ? sppdRp(v) : ''; }
    for (i = 0; i < n; i++) {
      var uu = d.uangSaku[i] || {}, pp = d.penginapan[i] || {}, nm = d.petugas[i] || '';
      var wq = sppdNum(uu.wq), wa = sppdNum(uu.wa), eq = sppdNum(uu.eq), ea = sppdNum(uu.ea);
      var pj = sppdNum(pp.qty), pa = sppdNum(pp.a), ko = sppdNum(d.konsumsi[i]);
      h += '<tr><td class="c">' + (nm ? i + 1 : '') + '</td><td>' + ui.esc(nm) + '</td>' +
        '<td class="c">' + (wq || '') + '</td><td class="r">' + mm(wa) + '</td><td class="r">' + (wq * wa ? sppdRp(wq * wa) : '') + '</td>' +
        '<td class="c">' + (eq || '') + '</td><td class="r">' + mm(ea) + '</td><td class="r">' + (eq * ea ? sppdRp(eq * ea) : '') + '</td>' +
        '<td class="c">' + (pj || '') + '</td><td class="r">' + mm(pa) + '</td><td class="r">' + (pj * pa ? sppdRp(pj * pa) : '') + '</td>' +
        '<td class="r">' + mm(ko) + '</td><td></td><td></td></tr>';
    }
    h += '<tr class="b"><td colspan="4"></td><td class="r">' + sppdRp(wd) + '</td><td colspan="2"></td><td class="r">' + sppdRp(we) + '</td><td colspan="2"></td><td class="r">' + sppdRp(pg) + '</td><td class="r">' + sppdRp(ks) + '</td><td class="r b3">' + sppdRp(spj, 1) + '</td><td></td></tr>' +
      '<tr class="b"><td colspan="12" class="r t3">TOTAL BIAYA</td><td class="r t3">' + sppdRp(total, 1) + '</td><td class="t3"></td></tr></table>' +
      '<table class="sig"><colgroup><col style="width:9%"><col style="width:24.3%"><col style="width:9%"><col style="width:24.3%"><col style="width:9%"><col style="width:24.4%"></colgroup>' +
      '<tr><th colspan="2">Maker</th><th colspan="2">Checker</th><th colspan="2">Signer</th></tr><tr>';

    var R = ['maker', 'checker', 'signer'];
    R.forEach(function (r) {
      var sg = (d.ttd || {})[r] || {};
      h += '<td class="sb" colspan="2">' + (sg.img ? '<img src="' + ui.esc(sg.img) + '" alt="TTD">' : '') + '</td>';
    });
    h += '</tr>';
    [['Nama', 'nama', 1], ['Jabatan', 'jabatan', 0], ['Tanggal', 'tanggal', 0]].forEach(function (f) {
      h += '<tr>' + R.map(function (r) {
        var v = (d.ttd || {})[r] ? (d.ttd[r][f[1]] || '') : '';
        if (f[1] === 'tanggal') { v = sppdDLong(v); }
        return '<td class="lb">' + f[0] + '</td><td' + (f[2] ? ' class="b"' : '') + '>: ' + ui.esc(v) + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</table></div></body></html>';
  }

  A.SPPD_PRINT_CSS = SPPD_PRINT_CSS;
  A.buildSppdHtml = buildSppdHtml;

  function tabSppd(ev) {
    var s = store.getSppd(ev.id);
    var w = store.getSppdWizard(ev.id);
    var realisasiHtml = s.tampilkanRealisasi
      ? '<div class="sm:col-span-2">' + ui.moneyInput('spp-realisasi', 'Realisasi (dana yang benar-benar terpakai)', s.realisasi) + '</div>'
      : '';
    var noSurat = (w && w.noSurat) || s.noSurat || '';
    var hasWizard = w && !!(
      noSurat || w.kota || w.tglBerangkat ||
      (w.petugas || []).some(function (n) { return n; }) ||
      (w.biaya || []).some(function (b) { return Number(b.jumlah) > 0; }) ||
      (w.ttd && w.ttd.signer && w.ttd.signer.nama)
    );
    /* status dikontrol form lama; 'konsep' (data wizard lama) tetap ditampilkan apa adanya */
    var statusLabel = { draft: 'Draft', konsep: 'Konsep', diajukan: 'Diajukan', disetujui: 'Disetujui', selesai: 'Selesai' }[s.status || (w && w.status)] || 'Draft';
    
    // Chip view if wizard exists, else show "Buat SPPD" button
    var chipHtml = '';
    if (hasWizard) {
      var totalBiaya = w.biaya.reduce(function(a,b){return a + (Number(b.jumlah)||0);},0);
      var spjRows = Math.max(w.petugas.length, w.uangSaku.length, w.penginapan.length, w.konsumsi.length);
      chipHtml = '<div class="card card-pad mb-4 chip-card">' +
        '<div class="flex flex-wrap items-center justify-between gap-4">' +
        '<div class="flex items-center gap-3">' +
        '<span class="badge" style="background:var(--accent-soft);color:var(--accent)">SPPD</span>' +
        '<div>' +
        '<div class="font-extrabold text-lg">' + ui.esc(noSurat || '(Belum bernomor)') + '</div>' +
        '<div class="text-sm text-muted">' + ui.esc(w.kota) + ' · ' + ui.esc(w.tglBerangkat) + ' · ' + statusLabel + '</div>' +
        '<div class="text-xs text-muted mt-1">Biaya: ' + ui.fmt(totalBiaya) + ' · SPJ: ' + spjRows + ' baris · TTD: ' +
          (w.ttd.maker.nama?'M':'–') + (w.ttd.checker.nama?'C':'–') + (w.ttd.signer.nama?'S':'–') + '</div>' +
        '</div>' +
        '</div></div>' +
        '<div class="chip-actions">' +
        '<button class="btn btn-primary" data-action="sppd:wizard:open" data-event="' + ev.id + '">Edit SPPD</button>' +
        '<button class="btn btn-ghost" data-action="sppd:viewPrint" data-event="' + ev.id + '">Pratinjau Cetak</button>' +
        '<button class="btn btn-ghost" data-action="sppd:print:download" data-event="' + ev.id + '">Unduh .html</button>' +
        '<button class="btn btn-danger" data-action="sppd:wizard:delete" data-event="' + ev.id + '">Hapus SPPD</button>' +
        '</div>' +
        '</div>';
    } else {
      chipHtml = '<div class="card card-pad mb-4 text-center py-8">' +
        '<div class="text-muted mb-4">Belum ada SPPD untuk event ini</div>' +
        '<button class="btn btn-primary btn-lg" data-action="sppd:wizard:open" data-event="' + ev.id + '">+ Buat SPPD Baru</button>' +
        '</div>';
    }
    
    var dataPane = '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-4">Surat Perjalanan Dinas (Data Lama)</h2>' +
      '<p class="text-xs text-muted mb-4">Form ini untuk input cepat. Untuk format resmi gunakan wizard "Edit SPPD" di atas.</p>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="spp-no">Nomor Surat</label><input id="spp-no" class="input" value="' + ui.esc(s.noSurat) + '" placeholder="mis. 039/SPPD/2026"></div>' +
      '<div><label class="label" for="spp-tgl">Tanggal Terbit</label>' + ui.dateField('spp-tgl', 'Tanggal Terbit', s.tanggalTerbit) + '</div>' +
      '<div><label class="label" for="spp-tujuan">Tujuan</label><input id="spp-tujuan" class="input" value="' + ui.esc(s.tujuan) + '"></div>' +
      '<div><label class="label" for="spp-kegiatan">Kegiatan</label><input id="spp-kegiatan" class="input" value="' + ui.esc(s.kegiatan) + '"></div>' +
      '<div><label class="label" for="spp-instansi">Instansi Pemberi Tugas</label><input id="spp-instansi" class="input" value="' + ui.esc(s.instansi) + '"></div>' +
      '<div><label class="label" for="spp-status">Status Alur</label>' +
      '<select id="spp-status" class="select"><option value="draft">Draft</option><option value="diajukan">Diajukan</option><option value="disetujui">Disetujui</option><option value="selesai">Selesai</option></select></div>' +
      '<div>' + ui.moneyInput('spp-dana', 'Dana Awal (alokasi tugas)', s.danaAwal) + '</div>' +
      '<div><span class="label">Visibilitas</span>' +
      '<label class="flex items-center gap-2 text-sm font-bold cursor-pointer pt-2"><input type="checkbox" id="spp-tampilreal" class="w-4 h-4 accent-[#E11D2E]" ' + (s.tampilkanRealisasi ? 'checked' : '') + '> Tampilkan realisasi</label>' +
      '<p class="text-xs text-muted mt-1">Nyalakan saat pertanggungjawaban akhir.</p></div>' +
      realisasiHtml +
      '<div class="sm:col-span-2"><label class="label" for="spp-catatan">Catatan</label><textarea id="spp-catatan" class="textarea">' + ui.esc(s.catatan) + '</textarea></div>' +
      '</div>' +
      printReadiness(ev) +
      '<div class="flex flex-wrap items-center justify-end gap-2 mt-4">' +
      '<button class="btn btn-ink border-2 border-[#E11D2E] font-extrabold" data-action="report:event" data-event="' + ev.id + '">Cetak Laporan</button>' +
      '<button class="btn btn-ink" data-action="sppd:save" data-id="' + ev.id + '">Simpan SPPD</button></div>' +
      '</div>' +
      sppdBudgetBlock(ev) +
      danaCairBlock(ev) +
      transportsBlock(ev);
    
    return moneySummary(ev) + chipHtml + dataPane;
  }

  function transportsBlock(ev) {
    var list = store.transports(ev.id);
    var rows = list.map(function (t) {
      var det = t.mode === 'sewa' ? (t.detail.vendor || '') + ' (' + (t.detail.jenisKendaraan || '') + ') · ' + (t.detail.durasi || '')
        : t.mode === 'umum' ? (t.detail.jenis || '') + ' · tiket ' + (t.detail.noTiket || '')
        : (t.detail.jarakKm || 0) + ' km × ' + (t.detail.tarifPerKm || 0) + ' + bensin/tol ' + ui.fmt(t.detail.biayaBensinTol || 0);
      return '<div class="eq">' +
        '<div><div class="font-bold">' + ui.esc(t.leg) + ' · ' + ui.esc(t.ruteAsal) + ' → ' + ui.esc(t.ruteTujuan) + '</div>' +
        '<div class="text-xs text-muted">' + ui.esc(t.tanggal) + ' · ' + ui.esc(t.mode) + ' · ' + ui.esc(det) + ' · bayar ' + ui.esc(t.wallet || 'Kas') + '</div></div>' +
        '<div class="flex items-center gap-3"><span class="font-extrabold mono">' + ui.fmt(t.totalBiaya) + '</span>' +
        '<button class="btn btn-sm btn-ghost" data-action="transport:delete" data-id="' + t.id + '">Hapus</button></div>' +
        '</div>';
    }).join('');

    return '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-1">Transportasi</h2>' +
      '<p class="text-xs text-muted mb-4">Mode: sewa kendaraan, transport umum, atau pribadi (reimbursement km × tarif).</p>' +
      (rows || '<p class="text-sm text-muted mb-4">Belum ada rute perjalanan.</p>') +
      '<div class="mt-5 border-t border-line pt-5">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Rute</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="tr-leg">Leg</label><select id="tr-leg" class="select"><option>Berangkat</option><option>Pulang</option><option>Lainnya</option></select></div>' +
      '<div><label class="label" for="tr-tgl">Tanggal</label>' + ui.dateField('tr-tgl', 'Tanggal') + '</div>' +
      '<div><label class="label" for="tr-mode">Mode</label><select id="tr-mode" class="select" data-action="transport:mode"><option value="sewa">Sewa Kendaraan</option><option value="umum">Transport Umum</option><option value="pribadi">Pribadi</option></select></div>' +
      '<div><label class="label" for="tr-wallet">Dibayar dari Wallet</label><select id="tr-wallet" class="select"><option>Kas</option><option>Bank</option><option>QRIS</option><option>E-Money</option></select></div>' +
      '<div><label class="label" for="tr-asal">Rute Asal</label><input id="tr-asal" class="input"></div>' +
      '<div class="sm:col-span-2"><label class="label" for="tr-tujuan">Rute Tujuan</label><input id="tr-tujuan" class="input"></div>' +
      '</div>' +
      '<div class="form-grid form-grid-2 mt-3" id="tr-detail"></div>' +
      '<div class="flex justify-end mt-4"><button class="btn btn-primary" data-action="transport:add" data-event="' + ev.id + '">Tambah Rute</button></div>' +
      '</div></div>';
  }

  function transportDetailFields(mode) {
    if (mode === 'umum') {
      return '<div><label class="label" for="tr-jeniskend">Jenis</label><select id="tr-jeniskend" class="select"><option>Kereta</option><option>Bus</option><option>Pesawat</option><option>Kapal</option><option>Lainnya</option></select></div>' +
        '<div><label class="label" for="tr-vendor">No. Tiket</label><input id="tr-vendor" class="input"></div>' +
        '<div>' + ui.moneyInput('tr-biyasewa', 'Harga Tiket', 0) + '</div>' +
        '<div><label class="label" for="tr-durasi">Durasi (opsional)</label><input id="tr-durasi" class="input"></div>';
    }
    if (mode === 'pribadi') {
      var st = store.settings();
      return '<div><label class="label" for="tr-jarak">Jarak (km)</label><input id="tr-jarak" type="number" min="0" class="input"></div>' +
        '<div><label class="label" for="tr-tarif">Tarif / km</label><input id="tr-tarif" type="number" min="0" class="input" value="' + ui.esc(st.tarifKm) + '"></div>' +
        '<div class="sm:col-span-2">' + ui.moneyInput('tr-biyasewa', 'Biaya Bensin / Tol (opsional)', 0) + '</div>' +
        '<div><label class="label" for="tr-durasi">Durasi (opsional)</label><input id="tr-durasi" class="input"></div>';
    }
    return '<div><label class="label" for="tr-vendor">Vendor</label><input id="tr-vendor" class="input"></div>' +
      '<div><label class="label" for="tr-jeniskend">Jenis Kendaraan</label><input id="tr-jeniskend" class="input"></div>' +
      '<div>' + ui.moneyInput('tr-biyasewa', 'Biaya Sewa', 0) + '</div>' +
      '<div><label class="label" for="tr-durasi">Durasi</label><input id="tr-durasi" class="input" placeholder="mis. 3 hari"></div>';
  }

  function archive() {
    A.archiveState = A.archiveState || { status: '', month: '', year: '', q: '' };
    var st = A.archiveState;
    var evs = store.events().slice().sort(function (a, b) { return (b.tanggalMulai || '').localeCompare(a.tanggalMulai || ''); });
    var years = {};
    evs.forEach(function (e) { if (e.tanggalMulai) years[e.tanggalMulai.slice(0, 4)] = true; });
    var yList = Object.keys(years).sort().reverse();

    var rows = evs.filter(function (e) {
      if (st.status && e.status !== st.status) return false;
      if (st.month && (!e.tanggalMulai || e.tanggalMulai.slice(5, 7) !== st.month)) return false;
      if (st.year && (!e.tanggalMulai || e.tanggalMulai.slice(0, 4) !== st.year)) return false;
      if (st.q) {
        var hay = (e.nama + ' ' + e.lokasi + ' ' + e.jenis + ' ' + e.peranPic).toLowerCase();
        if (hay.indexOf(st.q.toLowerCase()) === -1) return false;
      }
      return true;
    }).map(function (e) {
      var s = store.financeSummary(e.id);
      return '<div class="card card-pad flex items-start justify-between gap-3 flex-wrap">' +
        '<div class="min-w-0">' +
        '<a href="#/events/' + e.id + '" data-action="nav:go" data-href="#/events/' + e.id + '" class="font-extrabold hover:text-accent">' + ui.esc(e.nama) + '</a>' +
        '<div class="text-xs text-muted mt-1">' + ui.esc(e.lokasi || '-') + ' · ' + ui.esc(e.tanggalMulai || '-') + (e.tanggalSelesai ? ' → ' + ui.esc(e.tanggalSelesai) : '') + '</div>' +
        '<div class="text-xs text-muted mt-1">Saldo akhir: <b class="mono">' + ui.fmt(s.saldo) + '</b> · Bawa: ' + ui.esc(e.peranPic || '-') + '</div>' +
        '</div>' + ui.badge(e.status) + '</div>';
    }).join('');

    function opt(v, label, cur) { return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + label + '</option>'; }
    function fsel(key, label, optsHtml) {
      return '<div><label class="label" for="ar-' + key + '">' + label + '</label>' +
        '<select id="ar-' + key + '" class="select w-full" data-action="archive:set" data-key="' + key + '">' + optsHtml + '</select></div>';
    }
    var statusOpts = opt('', 'Semua', st.status) + ['draft', 'diajukan', 'berjalan', 'disetujui', 'selesai', 'dibatalkan'].map(function (s) {
      var L = { draft: 'Draft', diajukan: 'Diajukan', berjalan: 'Berjalan', disetujui: 'Disetujui', selesai: 'Selesai', dibatalkan: 'Dibatalkan' };
      return opt(s, L[s], st.status);
    }).join('');
    var mn = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    var mL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var monthOpts = opt('', 'Semua', st.month) + mn.map(function (m2, i) { return opt(m2, mL[i], st.month); }).join('');
    var yearOpts = opt('', 'Semua', st.year) + yList.map(function (y) { return opt(y, y, st.year); }).join('');

    return pageTitle('Arsip', 'Riwayat event & tugas dengan filter.') +
      '<div class="card card-pad mb-6">' +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">' +
      fsel('status', 'Status', statusOpts) +
      fsel('month', 'Bulan (mulai)', monthOpts) +
      fsel('year', 'Tahun (mulai)', yearOpts) +
      '<div><label class="label" for="ar-q">Cari kata</label><input id="ar-q" class="input w-full" value="' + ui.esc(st.q) + '" placeholder="nama / lokasi / peran"></div>' +
      '</div>' +
      '<div class="flex justify-end mt-4"><button class="btn btn-ink" data-action="archive:set" data-key="q">Terapkan</button></div>' +
      '</div>' +
      '<div class="flex flex-col gap-3">' + (rows || '<p class="text-sm text-muted">Tidak ada event yang cocok dengan filter.</p>') + '</div>';
  }

  A.transportFields = transportDetailFields;
  A.tabSppd = tabSppd;
  A.sppdBudgetBlock = sppdBudgetBlock;
  A.eventFilter = function (v) { if (v !== undefined) eventFilter = v; return eventFilter; };
  A.pages = {
    dashboard: dashboard,
    eventsList: eventsList,
    eventModal: eventModal,
    eventDetail: eventDetail,
    archive: archive
  };
  A.roadmapAttModal = roadmapAttModal;
  A.sppdPrintForm = sppdPrintForm;
  A.sppdWizardModal = sppdWizardModal;
  A.sppdWizardStepHTML = sppdWizardStepHTML;
  A.sppdWizardValidate = sppdWizardValidate;
  A.sppdWizardMissing = sppdWizardMissing;
})(window.SPT);