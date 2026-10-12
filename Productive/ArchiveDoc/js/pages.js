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
      '<div><label class="label" for="ev-tglmulai">Tanggal Mulai</label><input id="ev-tglmulai" type="date" class="input" value="' + ui.esc(ev.tanggalMulai) + '"></div>' +
      '<div><label class="label" for="ev-tglselesai">Tanggal Selesai</label><input id="ev-tglselesai" type="date" class="input" value="' + ui.esc(ev.tanggalSelesai) + '"></div>' +
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
      '<div><label class="label" for="dc-tgl">Tanggal Cair</label><input id="dc-tgl" type="date" class="input"></div>' +
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

  function tabSppd(ev) {
    var s = store.getSppd(ev.id);
    var realisasiHtml = s.tampilkanRealisasi
      ? '<div class="sm:col-span-2">' + ui.moneyInput('spp-realisasi', 'Realisasi (dana yang benar-benar terpakai)', s.realisasi) + '</div>'
      : '';
    return moneySummary(ev) +
      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-4">Surat Perjalanan Dinas</h2>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="spp-no">Nomor Surat</label><input id="spp-no" class="input" value="' + ui.esc(s.noSurat) + '" placeholder="mis. 039/SPPD/2026"></div>' +
      '<div><label class="label" for="spp-tgl">Tanggal Terbit</label><input id="spp-tgl" type="date" class="input" value="' + ui.esc(s.tanggalTerbit) + '"></div>' +
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
      '<div><label class="label" for="tr-tgl">Tanggal</label><input id="tr-tgl" type="date" class="input"></div>' +
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
})(window.SPT);