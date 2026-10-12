/* ============================================================
   SPPD Toolbox — halaman (bagian 2): tab Produk/Timeline/
   Penjualan/Keuangan + Master Produk + Laporan + Panduan +
   Pengaturan.
   ============================================================ */
window.SPT = window.SPT || {};

(function (A) {
  var store = A.store;
  var ui = A;

  var pageTitle = A.pageTitle;

  var progressBar = A.progressBar;

  /* ============================================================
     TAB PRODUK & CHECKLIST
     ============================================================ */
  function tabProduk(ev) {
    var eps = store.eventProducts(ev.id);
    var rows = eps.map(function (ep) {
      var p = store.products().find(function (x) { return x.id === ep.productId; });
      var terjual = store.qtyTerjual(ev.id, ep.productId);
      var kembali = Math.max((Number(ep.qtyDibawa) || 0) - terjual - (Number(ep.qtyRusakHilang) || 0), 0);
      return '<tr>' +
        '<td><b>' + ui.esc(p ? p.nama : '(produk terhapus)') + '</b><div class="text-xs text-muted">' + (p ? p.sku : '') + '</div></td>' +
        '<td><input id="ep-' + ep.id + '-bawa" type="number" min="0" class="input w-24" value="' + (ep.qtyDibawa || 0) + '"></td>' +
        '<td class="font-bold mono">' + terjual + '</td>' +
        '<td><input id="ep-' + ep.id + '-rusak" type="number" min="0" class="input w-24" value="' + (ep.qtyRusakHilang || 0) + '"></td>' +
        '<td class="font-bold mono">' + kembali + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" data-action="eventproduct:remove" data-id="' + ep.id + '">Hapus</button></td>' +
        '</tr>';
    }).join('');

    var avail = store.products().filter(function (p) {
      return !eps.some(function (ep) { return ep.productId === p.id; });
    });
    var sumTerjual = eps.reduce(function (a, ep) { return a + store.qtyTerjual(ev.id, ep.productId); }, 0);
    var sumBawa = eps.reduce(function (a, ep) { return a + (Number(ep.qtyDibawa) || 0); }, 0);
    var sumRusak = eps.reduce(function (a, ep) { return a + (Number(ep.qtyRusakHilang) || 0); }, 0);

    return '<div class="grid sm:grid-cols-3 gap-4 mb-6">' +
      ui.statCard('Total Dibawa', String(sumBawa), 'pcs/pack') +
      ui.statCard('Terjual', String(sumTerjual), 'otomatis dari Penjualan') +
      ui.statCard('Rusak/Hilang', String(sumRusak), 'input manual') +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Produk &amp; Qty</h2>' +
      '<p class="text-xs text-muted mb-4">Kembali = dibawa − terjual − rusak/hilang (dihitung otomatis).</p>' +
      (rows ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Produk</th><th>Qty Dibawa</th><th>Terjual</th><th>Rusak/Hilang</th><th>Kembali</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="flex justify-end mt-4"><button class="btn btn-ink" data-action="eventproduct:save" data-event="' + ev.id + '">Simpan Perubahan</button></div></div>' :
        ui.empty('Belum ada produk', 'Tambah produk yang dibawa ke booth.')) +
      '</div>' +

      '<div class="card card-pad">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Produk</div>' +
      (avail.length ?
        '<div class="form-grid form-grid-2"><div><label class="label" for="evp-produk">Produk</label><select id="evp-produk" class="select">' + avail.map(function (p) { return '<option value="' + p.id + '">' + ui.esc(p.nama) + '</option>'; }).join('') + '</select></div>' +
        '<div><label class="label" for="evp-qty">Qty Dibawa</label><input id="evp-qty" type="number" min="1" value="1" class="input"></div>' +
        '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="eventproduct:add" data-event="' + ev.id + '">Tambah</button></div></div>' :
        '<p class="text-sm text-muted">Semua produk sudah ada di checklist.</p>') +
      '</div>';
  }

  /* ============================================================
     TAB TIMELINE
     ============================================================ */
  function tabTimeline(ev) {
    var ms = store.milestones(ev.id);
    var done = ms.filter(function (m) { return m.status === 'selesai'; }).length;
    var rows = ms.map(function (m) {
      var statusSel = '<select class="select text-sm w-32" data-action="milestone:set" data-id="' + m.id + '" data-event="' + ev.id + '">' +
        '<option value="todo"' + (m.status === 'todo' ? ' selected' : '') + '>Belum</option>' +
        '<option value="aktif"' + (m.status === 'aktif' ? ' selected' : '') + '>Berjalan</option>' +
        '<option value="selesai"' + (m.status === 'selesai' ? ' selected' : '') + '>Selesai</option>' +
        '</select>';
      var bg = m.status === 'selesai' ? '#0f172a' : m.status === 'aktif' ? '#ff0000' : '#e2e8f0';
      var fg = m.status === 'todo' ? '#64748b' : '#fff';
      var docs = (m.attachments || []).map(function (att) {
        return '<div class="flex items-center gap-1 flex-wrap">' + A.docChip(att) +
          '<button class="btn btn-sm btn-ghost" data-action="milestone:att:delete" data-milestone="' + m.id + '" data-id="' + att.id + '">Hapus</button></div>';
      }).join('');
      return '<div class="flex items-start gap-4 py-3 border-b border-dashed border-line last:border-0">' +
        '<div class="w-6 h-6 mt-1 rounded-full flex-none text-center text-xs leading-6 font-bold" style="background:' + bg + ';color:' + fg + '">' + (m.status === 'selesai' ? '✓' : m.urutan) + '</div>' +
        '<div class="flex-1"><div class="font-bold">' + ui.esc(m.judul) + '</div>' +
        '<div class="text-xs text-muted">' + (m.tanggal ? ui.esc(m.tanggal) : 'tanpa tanggal') + (m.catatan ? ' · ' + ui.esc(m.catatan) : '') + '</div>' +
        (docs ? '<div class="mt-2">' + docs + '</div>' : '') + '</div>' +
        statusSel +
        '<button class="btn btn-sm btn-soft flex-none" data-action="milestone:att:add" data-id="' + m.id + '" data-event="' + ev.id + '">+ Dokumen</button>' +
        '<button class="btn btn-sm btn-ghost flex-none" data-action="milestone:delete" data-id="' + m.id + '">✕</button>' +
        '</div>';
    }).join('');

    return '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-2">Progress</h2>' + progressBar(done, ms.length) +
      '<div class="mt-4">' + (rows || '<p class="text-sm text-muted">Belum ada milestone.</p>') + '</div></div>' +

      '<div class="card card-pad">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Milestone</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="mil-judul">Judul Milestone</label><input id="mil-judul" class="input" placeholder="mis. Leg 1 selesai" aria-label="Judul milestone"></div>' +
      '<div><label class="label" for="mil-tgl">Tanggal</label><input id="mil-tgl" type="date" class="input" aria-label="Tanggal milestone"></div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="milestone:add" data-event="' + ev.id + '">Tambah</button></div>' +
      '</div></div>';
  }

  /* ============================================================
     TAB PENJUALAN
     ============================================================ */
  function tabPenjualan(ev) {
    var eps = store.eventProducts(ev.id);
    var sales = store.sales(ev.id).slice().sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || ''); });
    var pool = eps.length ? eps : store.products().map(function (p) { return { productId: p.id }; });
    var optHtml = pool.map(function (ep) {
      var id = ep.productId || ep.id;
      var p = store.products().find(function (x) { return x.id === id; });
      var sisa = store.stokSisa(ev.id, id);
      var suf = sisa === null ? '' : ' (sisa ' + sisa + ')';
      return '<option value="' + id + '" data-harga="' + (p ? p.hargaJualDefault : 0) + '">' + ui.esc(p ? p.nama : '(produk terhapus)') + suf + '</option>';
    }).join('');

    var rows = sales.map(function (sa) {
      var p = store.products().find(function (x) { return x.id === sa.productId; });
      var wm = A.store.METODE_TO_WALLET[sa.metode] || sa.wallet || 'Kas';
      return '<tr>' +
        '<td>' + ui.esc(sa.tanggal) + '</td>' +
        '<td>' + ui.esc(p ? p.nama : '(terhapus)') + '</td>' +
        '<td class="mono">' + sa.qty + '</td>' +
        '<td class="mono">' + ui.fmt(sa.hargaSatuan) + '</td>' +
        '<td><span class="badge" style="background:#f1f5f9;color:#0f172a">' + ui.esc(sa.metode) + '</span> <span class="badge" style="background:#ffe6e6;color:#e60000">' + ui.esc(wm) + '</span></td>' +
        '<td class="font-extrabold mono">' + ui.fmt(sa.total) + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" data-action="sale:delete" data-id="' + sa.id + '">Hapus</button></td>' +
        '</tr>';
    }).join('');

    var recap = {};
    sales.forEach(function (sa) {
      if (!recap[sa.productId]) recap[sa.productId] = { qty: 0, total: 0 };
      recap[sa.productId].qty += Number(sa.qty) || 0;
      recap[sa.productId].total += Number(sa.total) || 0;
    });
    var recapRows = Object.keys(recap).map(function (k) {
      var p = store.products().find(function (x) { return x.id === k; });
      return '<div class="eq"><div class="font-bold">' + ui.esc(p ? p.nama : '(terhapus)') + '</div>' +
        '<div class="flex gap-4"><span class="mono">' + recap[k].qty + ' pcs</span><span class="font-extrabold mono">' + ui.fmt(recap[k].total) + '</span></div></div>';
    }).join('');
    var grand = sales.reduce(function (a, s) { return a + (Number(s.total) || 0); }, 0);

    var defaultHarga = pool.length ? (store.products().find(function (x) { return x.id === (pool[0].productId || pool[0].id); }) || {}).hargaJualDefault || 0 : 0;

    return '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">' +
      '<div class="lg:col-span-2">' +
      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Tambah Transaksi</h2>' +
      '<p class="text-xs text-muted mb-4">Pencatatan manual — total dihitung otomatis. Qty dibatasi sisa stok (dibawa − terjual − rusak/hilang).</p>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="sa-produk">Produk</label><select id="sa-produk" class="select">' + optHtml + '</select></div>' +
      '<div><label class="label" for="sa-tgl">Tanggal</label><input id="sa-tgl" type="date" class="input" value="' + ui.isoToday() + '"></div>' +
      '<div><label class="label" for="sa-qty">Qty</label><input id="sa-qty" type="number" min="1" value="1" class="input"></div>' +
      '<div>' + ui.moneyInput('sa-harga', 'Harga Satuan', defaultHarga) + '</div>' +
      '<div><label class="label" for="sa-wallet">Metode / Wallet</label><select id="sa-wallet" class="select"><option value="Cash">Cash (Kas)</option><option value="QRIS">QRIS</option><option value="Transfer">Transfer (Bank)</option><option value="E-Money">E-Money</option></select></div>' +
      '<div><label class="label" for="sa-catatan">Catatan</label><input id="sa-catatan" class="input" placeholder="opsional"></div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="sale:add" data-event="' + ev.id + '">+ Catat Penjualan</button></div>' +
      '</div></div>' +

      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-3">Riwayat Transaksi</h2>' +
      (rows ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Qty</th><th>Harga</th><th>Metode / Wallet</th><th>Total</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : ui.empty('Belum ada transaksi', 'Catat penjualan pertama di form di atas.')) +
      '</div>' +
      '</div>' +

      '<div><div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-3">Rekap per Produk</h2>' +
      (recapRows || '<p class="text-sm text-muted">Belum ada data.</p>') +
      '<div class="eq font-bold mt-3"><span>Total Terjual</span><span class="font-extrabold mono">' + ui.fmt(grand) + '</span></div>' +
      '</div>' +
      '</div></div>';
  }

  /* ============================================================
     TAB KEUANGAN
     ============================================================ */
  function tabKeuangan(ev) {
    var s = store.financeSummary(ev.id);
    var expenses = store.expenses(ev.id).slice().sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || ''); });
    var rows = expenses.map(function (e) {
      return '<tr>' +
        '<td>' + ui.esc(e.tanggal) + '</td>' +
        '<td><b>' + ui.esc(e.kategori) + '</b><div class="text-xs text-muted">' + ui.esc(e.deskripsi) + '</div></td>' +
        '<td><span class="badge" style="background:#ffe6e6;color:#e60000">' + ui.esc(A.store.walletKey(e.wallet)) + '</span></td>' +
        '<td class="mono">' + ui.fmt(e.jumlah) + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" data-action="expense:delete" data-id="' + e.id + '">Hapus</button></td>' +
        '</tr>';
    }).join('');

    var catOpt = ['Penginapan', 'Konsumsi', 'Operasional', 'Uang Saku', 'Kas Kecil', 'BBM & Tol', 'Lainnya'].map(function (c) { return '<option>' + c + '</option>'; }).join('');

    return '<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">' +
      ui.statCard('Dana Awal', ui.fmt(s.danaAwal), 'dari SPPD') +
      ui.statCard('Penjualan', ui.fmt(s.totalSales), 'pemasukan') +
      ui.statCard('Penyesuaian Kas', ui.fmt(s.totalKasAdj), '+ ' + ui.fmt(Math.max(s.totalKasAdj, 0)) + ' / − ' + ui.fmt(Math.max(-s.totalKasAdj, 0)), s.totalKasAdj < 0) +
      ui.statCard('Pengeluaran', ui.fmt(s.pengeluaran), 'transport ' + ui.fmt(s.totalTransport) + ' + lainnya ' + ui.fmt(s.totalExpense)) +
      ui.statCard('Saldo', ui.fmt(s.saldo), s.saldo < 0 ? 'minus!' : 'sisa dana', s.saldo < 0) +
      '</div>' +

      '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">' +
      '<div class="lg:col-span-2">' +
      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Catat Pengeluaran</h2>' +
      '<p class="text-xs text-muted mb-4">Biaya transport dihitung otomatis dari seksi 01 (SPPD & Perjalanan).</p>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label" for="ex-kategori">Kategori</label><select id="ex-kategori" class="select">' + catOpt + '</select></div>' +
      '<div><label class="label" for="ex-tgl">Tanggal</label><input id="ex-tgl" type="date" class="input" value="' + ui.isoToday() + '"></div>' +
      '<div><label class="label" for="ex-deskripsi">Deskripsi</label><input id="ex-deskripsi" class="input" placeholder="mis. sewa meja, makan kru"></div>' +
      '<div>' + ui.moneyInput('ex-jumlah', 'Jumlah', 0) + '</div>' +
      '<div><label class="label" for="ex-wallet">Dibayar dari Wallet</label><select id="ex-wallet" class="select"><option>Kas</option><option>Bank</option><option>QRIS</option><option>E-Money</option></select></div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="expense:add" data-event="' + ev.id + '">+ Catat Pengeluaran</button></div>' +
      '</div></div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-3">Daftar Pengeluaran</h2>' +
      (rows ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Wallet</th><th>Jumlah</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : ui.empty('Belum ada pengeluaran manual', 'Transport otomatis tetap terhitung.')) +
      '</div>' +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Penyesuaian Kas</h2>' +
      '<p class="text-xs text-muted mb-4">Koreksi kas di luar penjualan/biaya: setoran, selisih hitung kas, dana talangan. Masuk pakai angka positif, keluar negatif.</p>' +
      '<div class="adj-form form-grid form-grid-2 mb-4">' +
      '<div><label class="label" for="adj-keterangan">Keterangan</label><input id="adj-keterangan" class="input" placeholder="mis. selisih hitung kas"></div>' +
      '<div><label class="label" for="adj-tanggal">Tanggal</label><input id="adj-tanggal" type="date" class="input" value="' + ui.isoToday() + '"></div>' +
      '<div>' + ui.signedInput('adj-jumlah', 'Nominal (±)', 0) + '</div>' +
      '<div><label class="label" for="adj-wallet">Wallet tujuan</label><select id="adj-wallet" class="select"><option>Kas</option><option>Bank</option><option>QRIS</option><option>E-Money</option></select></div>' +
      '<div class="sm:col-span-2 flex items-end justify-end"><button class="btn btn-primary" data-action="kasadj:add" data-event="' + ev.id + '">+ Catat Penyesuaian</button></div>' +
      '</div>' +
      '<div class="adj-list">' +
      (function () {
        var adjs = store.kasAdj(ev.id);
        if (!adjs.length) { return '<p class="text-sm text-muted">Belum ada penyesuaian kas.</p>'; }
        return adjs.map(function (k) {
          var cls = (Number(k.jumlah) || 0) >= 0 ? 'adj-in' : 'adj-out';
          var sign = (Number(k.jumlah) || 0) >= 0 ? '+' : '−';
          return '<div class="adj-row ' + cls + '"><div><div class="font-bold">' + ui.esc(k.keterangan) + '</div>' +
            '<div class="text-xs text-muted">' + ui.esc(k.tanggal) + ' · ' + ui.esc(A.store.walletKey(k.wallet)) + '</div></div>' +
            '<div class="flex items-center gap-2"><span class="amt mono">' + sign + ' ' + ui.fmt(Math.abs(Number(k.jumlah) || 0)) + '</span>' +
            '<button class="btn btn-sm btn-ghost" data-action="kasadj:delete" data-id="' + k.id + '">Hapus</button></div></div>';
        }).join('');
      })() +
      '</div></div>' +

      '<div><div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-3">Laporan Penggunaan Uang</h2>' +
      '<div class="eq"><span>Dana awal (SPPD)</span><span class="font-bold mono">' + ui.fmt(s.danaAwal) + '</span></div>' +
      '<div class="eq"><span>Hasil penjualan</span><span class="font-bold mono">+' + ui.fmt(s.totalSales) + '</span></div>' +
      '<div class="eq"><span>Transport</span><span class="mono">−' + ui.fmt(s.totalTransport) + '</span></div>' +
      '<div class="eq"><span>Pengeluaran lain</span><span class="mono">−' + ui.fmt(s.totalExpense) + '</span></div>' +
      '<div class="eq"><span>Penyesuaian kas</span><span class="mono">' + (s.totalKasAdj < 0 ? '−' : '+') + ui.fmt(Math.abs(s.totalKasAdj)) + '</span></div>' +
      '<div class="eq font-bold"><span>Saldo akhir</span><span class="font-extrabold mono">' + ui.fmt(s.saldo) + '</span></div>' +
      '<div class="mt-5"><button class="btn btn-ink w-full" data-action="report:event" data-event="' + ev.id + '">Cetak Laporan</button></div>' +
      '</div></div>' +
      '</div>';
  }

  /* ============================================================
     KONSOLIDASI 3 TAB (Persiapan / Uang & Laporan)
     ============================================================ */
  function psec(num, title, inner, sub, id, open) {
    var isOpen = open !== false;
    return '<section class="psec' + (isOpen ? '' : ' closed') + '"' + (id ? ' id="' + id + '"' : '') + '><div class="psec-head">' +
      '<span class="psec-num">' + num + '</span>' +
      '<h3 class="psec-title">' + title + (sub ? '<span class="psec-sub">' + sub + '</span>' : '') + '</h3>' +
      (id ? '<button type="button" class="psec-fold" data-action="psec:toggle" data-sel="#' + id + '" aria-label="Buka / tutup seksi" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' + (isOpen ? '▾' : '▸') + '</button>' : '') +
      '<span class="psec-rule"></span></div>' +
      '<div class="psec-body">' + inner + '</div></section>';
  }

  /* Blok lipat generik (dipakai checklist agar tidak lagi terbuka penuh). */
  function foldBlock(id, titleHtml, inner, open) {
    var isOpen = open !== false;
    return '<section class="psec psec-plain' + (isOpen ? '' : ' closed') + '" id="' + id + '">' +
      '<div class="psec-head">' +
      '<h3 class="psec-title">' + titleHtml + '</h3>' +
      '<button type="button" class="psec-fold" data-action="psec:toggle" data-sel="#' + id + '" aria-label="Buka / tutup" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' + (isOpen ? '▾' : '▸') + '</button>' +
      '<span class="psec-rule"></span></div>' +
      '<div class="psec-body">' + inner + '</div></section>';
  }

  /* Satu "langkah berikutnya" yang jelas, dihitung dari keadaan data event. */
  function workNext(ctx) {
    if (!(ctx.s.status === 'disetujui' || ctx.s.status === 'selesai')) return { sel: 'ps-1', label: 'Lengkapi & setujui SPPD' };
    if (ctx.ms.length === 0) return { sel: 'ps-2', label: 'Susun jadwal & milestone' };
    if (ctx.eps.length === 0) return { sel: 'ps-3', label: 'Catat produk yang dibawa' };
    if (ctx.items.length && ctx.itemDone < ctx.items.length) return { sel: 'ps-4', label: 'Centang item persiapan dibawa' };
    if (!ctx.bOk) return { sel: 'ps-7', label: 'Cek kesiapan berangkat' };
    if (ctx.sales.length === 0) return { sel: 'ps-5', label: 'Catat penjualan' };
    if (!ctx.pOk) return { sel: 'ps-7', label: 'Tuntaskan rekap pulang' };
    return { sel: 'ps-8', label: 'Susun & cetak laporan' };
  }

  function tabKerja(ev) {
    var s = store.getSppd(ev.id);
    var sppdLabel = { draft: 'Draft', diajukan: 'Diajukan', disetujui: 'Disetujui', selesai: 'Selesai' }[s.status] || 'Draft';
    var ruteN = store.transports(ev.id).length;
    var ms = store.milestones(ev.id);
    var msDone = ms.filter(function (m) { return m.status === 'selesai'; }).length;
    var msPct = ms.length ? Math.round((msDone / ms.length) * 100) : 0;
    var eps = store.eventProducts(ev.id);
    var items = store.prepItems(ev.id);
    var itemDone = items.filter(function (p) { return p.status === 'selesai'; }).length;
    var fin = store.financeSummary(ev.id);
    var sales = store.sales(ev.id);
    var expenses = store.expenses(ev.id);
    var cks = store.checklistItems(ev.id);
    var ckDone = store.checklistDone(ev.id);
    var bOk = store.berangkatOk(ev.id);
    var pOk = store.pulangOk(ev.id);
    var cc = bOk && pOk ? 'Berangkat & pulang tuntas'
      : bOk ? 'Siap berangkat' : pOk ? 'Pulang tuntas' : 'Belum siap berangkat';

    var checks = [
      { ok: s.status === 'disetujui' || s.status === 'selesai', label: 'SPPD lengkap' },
      { ok: eps.length > 0, label: 'Produk dicatat' },
      { ok: items.length === 0 || itemDone === items.length, label: 'Item persiapan dibawa' },
      { ok: !(s.danaAwal > 0 && fin.saldo < 0), label: 'Saldo aman' }
    ];
    if (eps.length > 0 || items.length > 0) {
      checks.push({ ok: bOk, label: 'Siap berangkat' });
      checks.push({ ok: pOk, label: 'Pulang tuntas' });
    }
    var heroChecks = '<div class="hero-checks">' + checks.map(function (c) {
      return '<span class="' + (c.ok ? 'check-yes' : 'check-no') + '">' + (c.ok ? '✓ ' : '• ') + c.label + '</span>';
    }).join('') + '</div>';

    var next = workNext({ s: s, ms: ms, eps: eps, items: items, itemDone: itemDone, sales: sales, bOk: bOk, pOk: pOk });

    var hero = '<div class="papan-dinas mb-6" id="work-hero">' +
      '<div class="text-xs font-bold text-muted uppercase tracking-wide">Papan Tugas Dinas &middot; Progres Tahapan</div>' +
      '<div class="big-num mt-2">' + msPct + '%</div>' +
      '<div class="bar"><span style="width:' + msPct + '%"></span></div>' +
      '<div class="text-sm text-muted">' + msDone + ' dari ' + ms.length + ' tahap selesai · Kas akhir ' + ui.fmt(fin.saldo) + ' · Dana cair ' + ui.fmt(fin.danaCair) + '</div>' +
      heroChecks +
      '<div class="flex flex-wrap items-center gap-2 mt-4">' +
      '<span class="hero-next-label">Langkah berikutnya</span>' +
      '<button class="btn btn-primary" data-action="scroll:to" data-sel="#' + next.sel + '">' + ui.esc(next.label) + '</button>' +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-2 mt-3">' +
      '<button class="btn btn-sm btn-ghost" data-action="scroll:to" data-sel="#ps-cek">Cek Persiapan (<span data-ck-count="hero">' + ckDone + '/' + cks.length + '</span>)</button>' +
      '<button class="btn btn-sm btn-ghost" data-action="report:event" data-event="' + ev.id + '">Cetak Laporan</button>' +
      '<button class="btn btn-sm btn-ghost" data-action="scroll:to" data-sel="#ps-1">Edit SPPD</button>' +
      (s.linkDokumen ? '<a class="btn btn-sm btn-ghost" href="' + ui.esc(s.linkDokumen) + '" target="_blank" rel="noopener">Download Dokumen</a>' : '') +
      '</div></div>';

    var steps = [
      ['ps-1', '01', 'SPPD'],
      ['ps-2', '02', 'Jadwal'],
      ['ps-3', '03', 'Produk'],
      ['ps-4', '04', 'Item'],
      ['ps-5', '05', 'Penjualan'],
      ['ps-6', '06', 'Kas'],
      ['ps-7', '07', 'Pulang'],
      ['ps-8', '08', 'Laporan']
    ];
    var doneMap = {
      'ps-1': s.status === 'disetujui' || s.status === 'selesai',
      'ps-2': ms.length > 0 && msDone === ms.length,
      'ps-3': eps.length > 0,
      'ps-4': items.length === 0 || itemDone === items.length,
      'ps-5': sales.length > 0,
      'ps-6': expenses.length > 0,
      'ps-7': bOk && pOk,
      'ps-8': cks.length > 0 && ckDone === cks.length
    };
    var flowBar = '<div class="flowbar"><span class="flowbar-label">Alur Kerja</span>' +
      steps.map(function (st) {
        var stDone = doneMap[st[0]];
        var isNext = !stDone && ('#' + st[0]) === ('#' + next.sel);
        var cls = 'flow-pill' + (stDone ? ' is-done' : (isNext ? ' is-next' : ''));
        var mark = stDone ? '✓ ' : (isNext ? '▸ ' : '');
        return '<button class="' + cls + '" data-action="scroll:to" data-sel="#' + st[0] + '" title="' + (stDone ? 'Selesai' : (isNext ? 'Langkah berikutnya' : 'Belum')) + '">' + mark + st[1] + ' ' + st[2] + '</button>';
      }).join('') + '</div>';

    return hero +
      '<div class="mb-6">' + foldBlock('ps-cek',
        'Cek Persiapan <span class="psec-sub" data-ck-count="sub">' + ckDone + ' / ' + cks.length + ' item selesai · checklist wajib sebelum berangkat</span>',
        ckSection(ev), false) + '</div>' +
      flowBar +
      '<div class="work-cols">' +
      '<div class="phase-block" data-phase="1">' +
      '<div class="phase-head"><span class="phase-num">Fase 1</span><span class="phase-title">Persiapan Sebelum Keberangkatan</span></div>' +
      psec('01', 'SPPD & Dana Cair', A.tabSppd(ev), 'SPPD ' + sppdLabel + (ruteN ? ' · ' + ruteN + ' rute' : '') + ' · Dana cair ' + ui.fmt(fin.danaCair), 'ps-1', next.sel === 'ps-1') +
      psec('02', 'Jadwal & Milestone', tabTimeline(ev), ms.length ? msDone + ' dari ' + ms.length + ' tahap selesai' : 'Belum ada tahap', 'ps-2', next.sel === 'ps-2') +
      psec('03', 'Produk & Qty (Aset Jual)', tabProduk(ev), eps.length ? eps.length + ' produk dicatat' : 'Belum ada produk', 'ps-3', next.sel === 'ps-3') +
      psec('04', 'Item Persiapan (Aset & Alat)', tabPrepItems(ev), items.length ? items.length + ' item · ' + itemDone + ' dibawa' : 'Belum ada item', 'ps-4', next.sel === 'ps-4') +
      '</div>' +
      '<div class="phase-block" data-phase="2">' +
      '<div class="phase-head"><span class="phase-num">Fase 2</span><span class="phase-title">Saat Keberangkatan</span></div>' +
      psec('05', 'Uang — Penjualan', tabPenjualan(ev), sales.length ? sales.length + ' transaksi · ' + ui.fmt(fin.totalSales) : 'Belum ada penjualan', 'ps-5', next.sel === 'ps-5') +
      psec('06', 'Uang — Pengeluaran & Penyesuaian', tabKeuangan(ev), expenses.length ? expenses.length + ' pengeluaran · saldo ' + ui.fmt(fin.saldo) : 'Saldo ' + ui.fmt(fin.saldo), 'ps-6', next.sel === 'ps-6') +
      '</div>' +
      '<div class="phase-block" data-phase="3">' +
      '<div class="phase-head"><span class="phase-num">Fase 3</span><span class="phase-title">Kepulangan / Laporan</span></div>' +
      psec('07', 'Cross-check Berangkat/Pulang', tabCrossCheck(ev), cc, 'ps-7', next.sel === 'ps-7') +
      psec('08', 'Uang — Laporan', tabLaporan(ev), 'Saldo akhir ' + ui.fmt(fin.saldo), 'ps-8', next.sel === 'ps-8') +
      '</div>' +
      '</div>';
  }

  function ckSection(ev) {
    var cks = store.checklistItems(ev.id);
    var ckTpl = {};
    store.checklistTemplates().forEach(function (t) { ckTpl[t.id] = t; });
    var ckDone = store.checklistDone(ev.id);
    var ckCats = ['Dokumen', 'Logistik', 'Keberangkatan', 'Laporan'];
    var ckBlocks = ckCats.map(function (k) {
      var rows = cks.filter(function (c) { var t = ckTpl[c.templateId]; return t && t.kategori === k; }).map(function (c) {
        var t = ckTpl[c.templateId] || { nama: c.templateId };
        var st = c.status === 'selesai';
        return '<label class="flex items-start gap-2 py-1 cursor-pointer">' +
          '<input type="checkbox" class="mt-1 accent-[#E11D2E]" data-action="checklist:toggle" data-event="' + ev.id + '" data-tpl="' + c.templateId + '"' + (st ? ' checked' : '') + '>' +
          '<span class="text-sm ' + (st ? 'text-muted line-through' : '') + '">' + ui.esc(t.nama) + '</span></label>';
      }).join('');
      return '<div class="card card-pad"><h4 class="text-xs font-extrabold uppercase tracking-wide text-muted mb-2">' + k + '</h4>' +
        (rows || '<p class="text-sm text-muted">-</p>') + '</div>';
    }).join('');
    return '<div class="grid sm:grid-cols-2 gap-4">' + ckBlocks + '</div>';
  }

  /* ============================================================
     LAPORAN LENGKAP (R3) — rekap produk & keuangan satu layar
     ============================================================ */
  function tabLaporan(ev) {
    var s = store.financeSummary(ev.id);
    var eps = store.eventProducts(ev.id);
    var items = store.prepItems(ev.id);

    var tot = { bawa: 0, terjual: 0, rusak: 0, kembali: 0 };
    var prodRows = eps.map(function (ep) {
      var p = store.products().find(function (x) { return x.id === ep.productId; });
      var bawa = Number(ep.qtyDibawa) || 0;
      var terjual = store.qtyTerjual(ev.id, ep.productId);
      var rusak = Number(ep.qtyRusakHilang) || 0;
      var kembali = Math.max(bawa - terjual - rusak, 0);
      var anomali = store.epAnomali(ev.id, ep.productId);
      tot.bawa += bawa; tot.terjual += terjual; tot.rusak += rusak; tot.kembali += kembali;
      var ok = anomali <= 0;
      return '<tr>' +
        '<td><b>' + ui.esc(p ? p.nama : '(produk terhapus)') + '</b>' + (p ? '<div class="text-xs text-muted">' + ui.esc(p.sku) + '</div>' : '') + '</td>' +
        '<td class="mono">' + bawa + '</td>' +
        '<td class="mono">' + terjual + '</td>' +
        '<td class="mono">' + rusak + '</td>' +
        '<td class="font-bold mono">' + kembali + '</td>' +
        '<td>' + (ok ? '<span class="badge" style="background:#ECFDF5;color:#059669">tuntas</span>' : '<span class="badge" style="background:#FEE2E2;color:#B91C1C">cek +' + anomali + '</span>') + '</td>' +
        '</tr>';
    }).join('');

    var prepRows = items.map(function (p) {
      var st = p.status === 'selesai' ? '<span class="badge" style="background:#ECFDF5;color:#059669">Sudah dibawa</span>'
        : '<span class="badge" style="background:#f1f5f9;color:#0f172a">Belum dibawa</span>';
      return '<tr>' +
        '<td><b>' + ui.esc(p.nama) + '</b></td>' +
        '<td><span class="badge" style="background:#f1f5f9;color:#0f172a">' + ui.esc(p.kategori || 'Lainnya') + '</span></td>' +
        '<td class="mono">' + (p.qty || 1) + '×</td>' +
        '<td class="mono">' + ui.fmt(p.biaya || 0) + '</td>' +
        '<td>' + st + '</td>' +
        '<td>' + (p.pulang ? '<span class="badge" style="background:#ECFDF5;color:#059669">dibawa pulang</span>' : '<span class="badge" style="background:#f1f5f9;color:#0f172a">belum dibawa pulang</span>') + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Rekap Produk &amp; Qty</h2>' +
      '<p class="text-xs text-muted mb-3">Dibawa → Terjual + Rusak/Hilang + Kembali. Badge tuntas muncul saat pembukuan pas (tidak ada kelebihan jual).</p>' +
      (eps.length ?
        '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Produk</th><th>Dibawa</th><th>Terjual</th><th>Rusak</th><th>Kembali</th><th>Rekap</th></tr></thead><tbody>' + prodRows +
        '<tr class="font-extrabold"><td>Total</td><td class="mono">' + tot.bawa + '</td><td class="mono">' + tot.terjual + '</td><td class="mono">' + tot.rusak + '</td><td class="mono">' + tot.kembali + '</td><td></td></tr>' +
        '</tbody></table></div>' :
        ui.empty('Belum ada produk', 'Tambah produk di seksi 03.')) +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Rekap Item Persiapan</h2>' +
      '<p class="text-xs text-muted mb-3">Biaya adalah <b>estimasi tercatat</b> — tidak otomatis mengurangi saldo kas.</p>' +
      (items.length ?
        '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Item</th><th>Kategori</th><th>Qty</th><th>Biaya (est.)</th><th>Status</th><th>Pulang</th></tr></thead><tbody>' + prepRows +
        '<tr class="font-extrabold"><td colspan="3">Total estimasi biaya persiapan</td><td class="mono">' + ui.fmt(store.prepBiaya(ev.id)) + '</td><td colspan="2"></td></tr>' +
        '</tbody></table></div>' :
        ui.empty('Belum ada item persiapan', 'Tambah di seksi 04.')) +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Laporan Arus Kas per Wallet</h2>' +
      '<p class="text-xs text-muted mb-3">Arus masuk/keluar per wallet (Bank, QRIS, Kas, E-Money) dari penjualan, pengeluaran, transport & penyesuaian kas.</p>' +
      (function () {
        var rows = A.store.WALLETS.map(function (w) {
          var x = s.wallets[w] || { masuk: 0, keluar: 0 };
          return '<tr><td><b>' + w + '</b></td><td class="mono">+' + ui.fmt(x.masuk) + '</td><td class="mono">−' + ui.fmt(x.keluar) + '</td><td class="font-bold mono">' + ui.fmt(x.masuk - x.keluar) + '</td></tr>';
        }).join('');
        return '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Wallet</th><th>Masuk</th><th>Keluar</th><th>Saldo</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      })() +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Anggaran vs Realisasi per Komponen</h2>' +
      '<p class="text-xs text-muted mb-3">Alokasi rinci SPPD (seksi 01) dibandingkan otomatis dengan realisasi dari transport &amp; pengeluaran. Total realisasi tidak menjumlahkan E-Money agar tidak dobel hitung (sudah di pos kategori).</p>' +
      (function () {
        var b = s.budget;
        var rows = b.rows.map(function (r) {
          var sisaCls = r.sisa < 0 ? 'style="color:#B91C1C"' : '';
          return '<tr><td><b>' + ui.esc(r.kategori) + '</b>' + (r.ket ? '<div class="text-xs text-muted">' + ui.esc(r.ket) + '</div>' : '') + '</td>' +
            '<td>' + ui.walletBadge(r.wallet) + '</td>' +
            '<td class="mono">' + ui.fmt(r.alokasi) + '</td>' +
            '<td class="mono">' + ui.fmt(r.realisasi) + '</td>' +
            '<td class="font-bold mono" ' + sisaCls + '>' + ui.fmt(r.sisa) + '</td></tr>';
        }).join('');
        var wRows = (b.perWallet || []).filter(function (w) { return w.alokasi > 0 || w.realisasi > 0; }).map(function (w) {
          return '<tr><td>' + ui.walletBadge(w.wallet) + '</td>' +
            '<td class="mono">' + ui.fmt(w.alokasi) + '</td>' +
            '<td class="mono">' + ui.fmt(w.realisasi) + '</td>' +
            '<td class="font-bold mono">' + ui.fmt(w.alokasi - w.realisasi) + '</td></tr>';
        }).join('');
        return '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Komponen</th><th>Wallet</th><th class="t">Alokasi</th><th class="t">Realisasi</th><th class="t">Sisa</th></tr></thead><tbody>' + rows +
          '<tr class="font-extrabold"><td>Total</td><td></td><td class="mono t">' + ui.fmt(b.totalAlokasi) + '</td><td class="mono t">' + ui.fmt(b.totalRealisasi) + '</td><td class="mono t">' + ui.fmt(b.totalSisa) + '</td></tr>' +
          '</tbody></table>' +
          '<div class="text-xs text-muted mt-2">Dana Awal SPPD: ' + ui.fmt(b.danaAwal) + ' · ' +
          (b.selisihDanaAwal !== 0
            ? 'selisih <span class="font-bold" style="color:' + (b.selisihDanaAwal < 0 ? '#B91C1C' : '#059669') + '">' + (b.selisihDanaAwal > 0 ? '+' : '−') + ui.fmt(Math.abs(b.selisihDanaAwal)) + '</span> dari total alokasi.</div>'
            : 'total alokasi sama dengan Dana Awal.</div>') +
          '</div>' +
          (wRows ?
            '<h3 class="font-extrabold text-sm mt-6 mb-2">Alokasi &amp; Realisasi per Wallet Tujuan</h3>' +
            '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Wallet</th><th class="t">Alokasi</th><th class="t">Realisasi</th><th class="t">Sisa</th></tr></thead><tbody>' + wRows +
            '</tbody></table></div>' : '');
      })() +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Bandingkan SPPD vs Realisasi vs Penjualan</h2>' +
      '<p class="text-xs text-muted mb-3">Satu baris pembanding untuk pertanggungjawaban: alokasi SPPD → dana cair → realisasi terpakai → hasil penjualan → saldo.</p>' +
      '<div class="eq"><span>Alokasi SPPD (dana awal)</span><span class="font-bold mono">' + ui.fmt(s.danaAwal) + '</span></div>' +
      '<div class="eq"><span>Dana sudah cair</span><span class="font-bold mono">+' + ui.fmt(s.danaCair) + '</span></div>' +
      '<div class="eq"><span>Realisasi terpakai (transport + belanja)</span><span class="mono">−' + ui.fmt(s.pengeluaran) + '</span></div>' +
      '<div class="eq"><span>Hasil penjualan</span><span class="mono">+' + ui.fmt(s.totalSales) + '</span></div>' +
      '<div class="eq font-bold"><span>Saldo akhir</span><span class="font-extrabold mono">' + ui.fmt(s.saldo) + '</span></div>' +
      '</div>' +

      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-3">Rekap Penggunaan Uang</h2>' +
      '<div class="eq"><span>Dana awal (SPPD)</span><span class="font-bold mono">' + ui.fmt(s.danaAwal) + '</span></div>' +
      '<div class="eq"><span>Hasil penjualan</span><span class="font-bold mono">+' + ui.fmt(s.totalSales) + '</span></div>' +
      '<div class="eq"><span>Transport</span><span class="mono">−' + ui.fmt(s.totalTransport) + '</span></div>' +
      '<div class="eq"><span>Pengeluaran lain</span><span class="mono">−' + ui.fmt(s.totalExpense) + '</span></div>' +
      '<div class="eq"><span>Penyesuaian kas</span><span class="mono">' + (s.totalKasAdj < 0 ? '−' : '+') + ui.fmt(Math.abs(s.totalKasAdj)) + '</span></div>' +
      '<div class="eq font-bold"><span>Saldo akhir</span><span class="font-extrabold mono">' + ui.fmt(s.saldo) + '</span></div>' +
      '<div class="mt-5"><button class="btn btn-ink w-full" data-action="report:event" data-event="' + ev.id + '">Cetak Laporan</button></div>' +
      '</div>';
  }

  /* ============================================================
     ITEM PERSIAPAN - checklist barang, alat & perbekalan non-produk
     ============================================================ */
  function tabPrepItems(ev) {
    var items = store.prepItems(ev.id);
    var sumBiaya = store.prepBiaya(ev.id);
    var doneCount = items.filter(function (p) { return p.status === 'selesai'; }).length;

    /* --- master checklist + form khusus pilihan --- */
    var tpls = store.itemTemplates();
    var cats = store.itemCats();
    var sel = A.bringSel || {};
    var savedId = {};
    items.forEach(function (p) { if (p.templateId) savedId[p.templateId] = true; });
    var selKeys = Object.keys(sel);

    var masterBlocks = cats.map(function (c) {
      var grpTpls = tpls.filter(function (t) { return t.catId === c.id; });
      var grpSel = grpTpls.filter(function (t) { return !!sel[t.id]; }).length;
      var checks = grpTpls.map(function (t) {
        var inDb = !!savedId[t.id];
        var on = !inDb && !!sel[t.id];
        return '<label class="flex items-start gap-2 py-1.5 cursor-pointer' + (inDb ? ' opacity-60' : '') + '"' + (inDb ? ' title="Sudah tercatat di Item Persiapan event ini"' : '') + '>' +
          '<input type="checkbox" class="mt-1" data-action="bring:toggle" data-tpl="' + t.id + '"' + (on ? ' checked' : '') + (inDb ? ' disabled' : '') + '>' +
          '<span class="text-sm">' + ui.esc(t.nama) + '</span>' +
          (inDb ? '<span class="badge" style="background:#ECFDF5;color:#059669">tercatat</span>' : '') +
          '</label>';
      }).join('');
      return '<div class="card card-pad"><h4 class="text-xs font-extrabold uppercase tracking-wide text-muted mb-2">' + ui.esc(c.nama) +
        ' <span class="text-muted">(' + grpSel + '/' + grpTpls.length + ' dipilih)</span></h4>' +
        (checks || '<p class="text-sm text-muted">Kosong — tambah di Barang Bawaan.</p>') + '</div>';
    }).join('');

    var masterCard = '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Pilih Item dari Barang Bawaan</h2>' +
      '<p class="text-xs text-muted mb-3">Daftar barang bawaan dari master. Kelola grup &amp; item di halaman <a class="font-bold hover:text-accent" href="#/master" data-action="nav:go" data-href="#/master">Barang Bawaan</a>. Item bertanda <b>tercatat</b> sudah ada di Item Persiapan event ini.</p>' +
      (masterBlocks ? '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">' + masterBlocks + '</div>' : ui.empty('Belum ada barang bawaan', 'Buka Barang Bawaan untuk membuat grup & item.')) +
      '</div>';

    var selRows = selKeys.map(function (tid) {
      var tpl = tpls.find(function (t) { return t.id === tid; });
      if (!tpl) return '';
      var c = cats.find(function (x) { return x.id === tpl.catId; });
      return '<div class="flex flex-wrap items-center gap-3 py-2 border-b border-dashed border-line last:border-0">' +
        '<div class="flex-1 min-w-[200px] text-sm"><span class="badge" style="background:#ffe6e6;color:#e60000">' + ui.esc(c ? c.nama : 'Barang') + '</span> <b>' + ui.esc(tpl.nama) + '</b></div>' +
        '<label class="flex items-center gap-2 text-xs font-bold text-muted">Qty<input type="number" min="1" value="' + (Number(sel[tid]) || 1) + '" id="bk-qty-' + tid + '" data-action="bring:qty" data-tpl="' + tid + '" class="input w-20"></label>' +
        '<button class="btn btn-sm btn-ghost" data-action="bring:remove" data-tpl="' + tid + '" title="Buang dari pilihan">Buang</button>' +
        '</div>';
    }).join('');

    var formKhusus = '<div class="card card-pad mb-6">' +
      '<div class="flex items-center justify-between gap-2 mb-1">' +
      '<h2 class="font-extrabold text-lg">Konfirmasi Item Pilihan</h2>' +
      (selKeys.length ? '<button class="btn btn-sm btn-ghost" data-action="bring:clear">Batal</button>' : '') +
      '</div>' +
      '<p class="text-xs text-muted mb-3">Centang item di master di atas. Pilihan tampil di sini sebagai <b>Nama Group &amp; Item</b>. Tekan <b>Simpan ke Item Persiapan</b> untuk mencatatnya.</p>' +
      (selKeys.length ?
        selRows +
        '<div class="flex justify-end mt-4"><button class="btn btn-primary" data-action="bring:commit" data-event="' + ev.id + '">Simpan ke Item Persiapan (' + selKeys.length + ')</button></div>'
        : '<p class="text-sm text-muted">Belum ada pilihan. Centang item di daftar master untuk mengisi form ini.</p>') +
      '</div>';

    var rows = items.map(function (p) {
      var done = p.status === 'selesai';
      return '<tr>' +
        '<td><b>' + ui.esc(p.nama) + '</b>' + (p.catatan ? '<div class="text-xs text-muted">' + ui.esc(p.catatan) + '</div>' : '') + '</td>' +
        '<td><span class="badge" style="background:#f1f5f9;color:#0f172a">' + ui.esc(p.kategori || 'Lainnya') + '</span></td>' +
        '<td class="mono">' + (p.qty || 1) + '×</td>' +
        '<td class="font-bold mono">' + ui.fmt(p.biaya || 0) + '</td>' +
        '<td><label class="flex items-center gap-2 text-xs font-bold cursor-pointer whitespace-nowrap"><input type="checkbox" class="w-4 h-4 accent-[#E11D2E]" data-action="prepitem:done" data-event="' + ev.id + '" data-id="' + p.id + '"' + (done ? ' checked' : '') + '> dibawa</label></td>' +
        '<td><button class="btn btn-sm btn-ghost" data-action="prepitem:delete" data-id="' + p.id + '">Hapus</button></td>' +
        '</tr>';
    }).join('');
    var catsMan = ['Alat & Tools', 'Perbekalan', 'Materi Kerja', 'Konsumsi', 'Lainnya'];
    var catOpt = catsMan.map(function (c) { return '<option value="' + ui.esc(c) + '">' + ui.esc(c) + '</option>'; }).join('');
    return '<div class="grid sm:grid-cols-3 gap-4 mb-6">' +
      ui.statCard('Item Persiapan', String(items.length), 'selain produk dagangan') +
      ui.statCard('Sudah Dibawa', doneCount + ' dari ' + items.length, 'centang Dibawa? tiap item') +
      ui.statCard('Biaya Persiapan', ui.fmt(sumBiaya), 'estimasi tercatat') +
      '</div>' +
      '<div class="card card-pad mb-6" id="ck3-saved">' +
      '<h2 class="font-extrabold text-lg mb-1">Item Persiapan</h2>' +
      '<p class="text-xs text-muted mb-4">Barang, alat, dan perbekalan non-produk lain yang wajib dibawa saat event. <b>Centang</b> setiap item yang sudah aman dibawa. Pembayaran & pencatatan uang (sewa, tiket, belanja) tetap di seksi Uang (05–06 & 08).</p>' +
      (items.length ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Item</th><th>Kategori</th><th>Qty</th><th>Biaya</th><th>Dibawa?</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' :
        ui.empty('Belum ada item persiapan', 'Tambah dari daftar master di bawah, atau lewat form manual.')) +
      '</div>' +
      masterCard + formKhusus +
      '<div class="card card-pad">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Item Persiapan</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div class="sm:col-span-2"><label class="label" for="prep-nama">Nama Item</label><input id="prep-nama" class="input" placeholder="mis. Kabel Rol 5 m" aria-label="Nama item persiapan"></div>' +
      '<div><label class="label" for="prep-kategori">Kategori</label><select id="prep-kategori" class="select w-full">' + catOpt + '</select></div>' +
      '<div><label class="label" for="prep-qty">Qty</label><input id="prep-qty" type="number" min="1" value="1" class="input"></div>' +
      '<div>' + ui.moneyInput('prep-biaya', 'Biaya (estimasi)', 0) + '</div>' +
      '<div class="sm:col-span-2"><label class="label" for="prep-catatan">Catatan (opsional)</label><input id="prep-catatan" class="input" placeholder="mis. jangan lupa dibawa" aria-label="Catatan item persiapan"></div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="prepitem:add" data-event="' + ev.id + '">Tambah Item</button></div>' +
      '</div></div>';
  }

  /* ============================================================
     CROSS-CHECK BERANGKAT / PULANG (R2) — go/no-go aset
     ============================================================ */
  function tabCrossCheck(ev) {
    var sppdR = store.getSppd(ev.id);
    var eps = store.eventProducts(ev.id);
    var items = store.prepItems(ev.id);
    var bOk = store.berangkatOk(ev.id);
    var pOk = store.pulangOk(ev.id);

    var missB = [];
    if (!(sppdR.status === 'disetujui' || sppdR.status === 'selesai')) missB.push('SPPD belum disetujui');
    if (eps.length === 0) missB.push('Produk belum dicatat');
    else if (eps.some(function (ep) { return !(Number(ep.qtyDibawa) > 0); })) missB.push('Qty dibawa masih ada yang 0');
    if (items.length && items.some(function (p) { return p.status !== 'selesai'; })) missB.push('Ada item persiapan belum ditandai dibawa');
    if (missB.length === 0 && !bOk) missB.push('Lengkapi data di seksi 01–04');

    var missP = [];
    var anyAsset = eps.length > 0 || items.length > 0;
    if (anyAsset) {
      if (eps.length) {
        var oversold = eps.filter(function (ep) { return store.epAnomali(ev.id, ep.productId) > 0; });
        if (oversold.length) missP.push('Ada produk yang terjual melebihi stok dibawa / hilang');
      }
      if (items.length && items.some(function (p) { return !p.pulang; })) missP.push('Ada item persiapan belum ditandai dibawa pulang');
    } else {
      missP.push('Belum ada aset (produk / item persiapan)');
    }

    var prodRows = eps.map(function (ep) {
      var p = store.products().find(function (x) { return x.id === ep.productId; });
      var bawa = Number(ep.qtyDibawa) || 0;
      var terjual = store.qtyTerjual(ev.id, ep.productId);
      var rusak = Number(ep.qtyRusakHilang) || 0;
      var anomali = store.epAnomali(ev.id, ep.productId);
      var kembali = Math.max(bawa - terjual - rusak, 0);
      var ok = anomali <= 0;
      return '<tr>' +
        '<td><b>' + ui.esc(p ? p.nama : '(produk terhapus)') + '</b><div class="text-xs text-muted">' + (p ? p.sku : '') + '</div></td>' +
        '<td><span class="badge" style="background:#f1f5f9;color:#0f172a">Produk</span></td>' +
        '<td class="text-xs text-muted">' + bawa + ' dibawa · ' + terjual + ' terjual · ' + rusak + ' rusak → <b class="mono">' + kembali + ' kembali</b></td>' +
        (ok ? '<td class="text-xs font-bold" style="color:#059669">otomatis ✓</td>' : '<td class="text-xs font-bold" style="color:#B91C1C">lebih jual ' + anomali + '</td>') +
        '<td>' + (ok ? '<span class="badge" style="background:#ECFDF5;color:#059669">rekap tuntas</span>' : '<span class="badge" style="background:#FEE2E2;color:#B91C1C">perlu cek</span>') + '</td>' +
        '</tr>';
    }).join('');
    var prepRows = items.map(function (p) {
      var st = p.status === 'selesai' ? '<span class="badge" style="background:#ECFDF5;color:#059669">Sudah dibawa</span>'
        : '<span class="badge" style="background:#f1f5f9;color:#0f172a">Belum dibawa</span>';
      return '<tr>' +
        '<td><b>' + ui.esc(p.nama) + '</b></td>' +
        '<td><span class="badge" style="background:#f1f5f9;color:#0f172a">' + ui.esc(p.kategori || 'Lainnya') + '</span></td>' +
        '<td class="text-xs text-muted">' + st + (p.catatan ? ' · ' + ui.esc(p.catatan) : '') + '</td>' +
        '<td><label class="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" data-action="prepitem:pulang" data-event="' + ev.id + '" data-id="' + p.id + '" class="w-4 h-4 accent-[#E11D2E]"' + (p.pulang ? ' checked' : '') + '> dibawa pulang</label></td>' +
        '<td>' + (p.pulang ? '<span class="badge" style="background:#ECFDF5;color:#059669">dibawa pulang</span>' : '<span class="badge" style="background:#f1f5f9;color:#0f172a">belum dibawa pulang</span>') + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="grid sm:grid-cols-2 gap-4 mb-6">' +
      '<div class="vc' + (bOk ? ' vc-go' : '') + '"><div class="vc-title"><span class="vc-dot ' + (bOk ? 'go' : 'no') + '"></span>' + (bOk ? 'Siap Berangkat' : 'Belum Siap Berangkat') + '</div>' +
      '<div class="vc-sub">' + (bOk ? 'Semua siap: SPPD disetujui, produk & qty dicatat, item persiapan sudah dibawa.' : 'Data wajib dilengkapi agar berangkat aman dan bisa dipertanggungjawabkan.') + '</div>' +
      (missB.length ? '<div class="vc-miss">' + missB.join(' · ') + '</div>' : '') + '</div>' +
      '<div class="vc' + (pOk ? ' vc-go' : '') + '"><div class="vc-title"><span class="vc-dot ' + (pOk ? 'go' : 'no') + '"></span>' + (pOk ? 'Siap Pulang · 0 Aset Tertinggal' : 'Belum Tuntas Pulang') + '</div>' +
      '<div class="vc-sub">' + (pOk ? 'Semua produk rekap qty tuntas & item persiapan sudah ditandai dibawa pulang.' : 'Pastikan tiap aset tercatat: terjual, rusak/hilang, kembali, dan dibawa pulang.') + '</div>' +
      (missP.length ? '<div class="vc-miss">' + missP.join(' · ') + '</div>' : '') + '</div>' +
      '</div>' +
      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-1">Audit Aset Berangkat & Pulang</h2>' +
      '<p class="text-xs text-muted mb-3">Rekap otomatis qty (dibawa = terjual + rusak/hilang + kembali) & status setiap item. Centang <b>dibawa pulang</b> setelah semua aset non-produk kembali ke tangan.</p>' +
      (anyAsset ?
        '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Aset</th><th>Jenis</th><th>Rekap / status</th><th>Dibawa pulang</th><th>Audit</th></tr></thead><tbody>' +
        (eps.length ? '<tr><td colspan="5" class="text-xs font-extrabold uppercase tracking-wide text-muted pt-4">Produk — rekap qty</td></tr>' + prodRows : '') +
        (items.length ? '<tr><td colspan="5" class="text-xs font-extrabold uppercase tracking-wide text-muted pt-4">Item Persiapan — aset non-produk</td></tr>' + prepRows : '') +
        '</tbody></table></div>' :
        ui.empty('Belum ada aset untuk diaudit', 'Tambah produk (seksi 03) atau item persiapan (seksi 04).')) +
      '</div>';
  }

  /* ============================================================
     MASTER PRODUK
     ============================================================ */
  function products() {
    var list = store.products();
    var rows = list.map(function (p) {
      return '<tr>' +
        '<td><b>' + ui.esc(p.nama) + '</b><div class="text-xs text-muted">' + ui.esc(p.sku) + '</div></td>' +
        '<td>' + ui.esc(p.satuan) + '</td>' +
        '<td class="mono">' + ui.fmt(p.hargaJualDefault) + '</td>' +
        '<td class="mono">' + (p.stokKantor || 0) + '</td>' +
        '<td>' + (p.aktif === false ? '<span class="badge" style="background:#FEE2E2;color:#B91C1C">nonaktif</span>' : '<span class="badge" style="background:#ECFDF5;color:#059669">aktif</span>') + '</td>' +
        '<td class="whitespace-nowrap"><button class="btn btn-sm btn-ghost" data-action="product:edit" data-id="' + p.id + '">Edit</button> ' +
        '<button class="btn btn-sm btn-danger" data-action="product:delete" data-id="' + p.id + '">Hapus</button></td>' +
        '</tr>';
    }).join('');

    return pageTitle('Produk Dagangan', 'Katalog produk yang dibawa ke booth.') +
      '<div class="flex justify-end mb-4"><button class="btn btn-primary" data-action="product:new">+ Produk Baru</button></div>' +
      '<div class="card card-pad"><div class="overflow-x-auto"><table class="table"><thead><tr><th>Produk</th><th>Satuan</th><th>Harga Jual</th><th>Stok Kantor</th><th>Status</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="text-center text-muted py-6">Belum ada produk.</td></tr>') + '</tbody></table></div></div>';
  }

  function productModal(p) {
    var isNew = !p;
    p = p || { nama: '', sku: '', satuan: 'pcs', hargaJualDefault: 0, stokKantor: 0, aktif: true };
    ui.modal(
      '<div class="card-pad">' +
      '<h3 class="text-lg font-extrabold mb-4">' + (isNew ? 'Produk Baru' : 'Edit Produk') + '</h3>' +
      '<div class="form-grid form-grid-2">' +
      '<div class="sm:col-span-2"><label class="label" for="pr-nama">Nama Produk</label><input id="pr-nama" class="input" value="' + ui.esc(p.nama) + '"></div>' +
      '<div><label class="label" for="pr-sku">SKU / Kode</label><input id="pr-sku" class="input" value="' + ui.esc(p.sku) + '"></div>' +
      '<div><label class="label" for="pr-satuan">Satuan</label><input id="pr-satuan" class="input" value="' + ui.esc(p.satuan) + '"></div>' +
      '<div>' + ui.moneyInput('pr-harga', 'Harga Jual Default', p.hargaJualDefault) + '</div>' +
      '<div><label class="label" for="pr-stok">Stok Kantor</label><input id="pr-stok" type="number" min="0" class="input" value="' + (p.stokKantor || 0) + '"></div>' +
      '<div class="sm:col-span-2"><span class="label" aria-hidden="true">&nbsp;</span>' +
      '<label class="flex items-center gap-2 text-sm font-bold cursor-pointer"><input type="checkbox" id="pr-aktif" class="w-4 h-4 accent-[#E11D2E]" ' + (p.aktif === false ? '' : 'checked') + '> Produk aktif</label></div>' +
      '</div>' +
      '<div class="flex justify-end gap-2 mt-5">' +
      '<button class="btn btn-ghost" data-action="modal:close">Batal</button>' +
      '<button class="btn btn-ink" data-action="product:save" data-new="' + (isNew ? '1' : '0') + '" data-id="' + ui.esc(p.id || '') + '">Simpan</button>' +
      '</div></div>', { static: true }
    );
  }

  /* ============================================================
     REKAP GLOBAL
     ============================================================ */
  function reports() {
    var rep = store.globalReports();
    var byProd = Object.keys(rep.byProduct).map(function (k) {
      var p = store.products().find(function (x) { return x.id === k; });
      return '<div class="eq"><span class="font-bold">' + ui.esc(p ? p.nama : '(terhapus)') + '</span>' +
        '<div class="flex gap-4"><span class="mono">' + rep.byProduct[k].qty + ' pcs</span><span class="font-extrabold mono">' + ui.fmt(rep.byProduct[k].total) + '</span></div></div>';
    }).join('');
    var byEv = store.events().map(function (e) {
      var s = rep.events[e.id] || { totalSales: 0, pengeluaran: 0, saldo: 0 };
      return '<div class="eq"><a href="#/events/' + e.id + '/keuangan" data-action="nav:go" data-href="#/events/' + e.id + '/keuangan" class="font-bold hover:text-accent">' + ui.esc(e.nama) + '</a>' +
        '<div class="flex gap-4 text-sm"><span class="mono">jual ' + ui.fmt(s.totalSales) + '</span><span class="mono">biaya ' + ui.fmt(s.pengeluaran) + '</span><span class="font-bold mono">' + ui.fmt(s.saldo) + '</span></div></div>';
    }).join('');

    return pageTitle('Rekap Global', 'Ringkasan keuangan lintas event. Laporan pertanggungjawaban resmi ada di Layar Kerja tiap event, seksi 08 Uang — Laporan.') +
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
      ui.statCard('Total Penjualan', ui.fmt(rep.totalSales), rep.totalSalesQty + ' barang') +
      ui.statCard('Total Pengeluaran', ui.fmt(rep.totalExpense), 'semua event') +
      ui.statCard('Saldo Total', ui.fmt(rep.totalSaldo), 'aggregat', rep.totalSaldo < 0) +
      ui.statCard('Jumlah Event', String(store.events().length), 'tercatat') +
      '</div>' +
      '<div class="grid lg:grid-cols-2 gap-6">' +
      '<div class="card card-pad"><h2 class="font-extrabold text-lg mb-3">Penjualan per Produk</h2>' + (byProd || '<p class="text-sm text-muted">Belum ada penjualan.</p>') + '</div>' +
      '<div class="card card-pad"><h2 class="font-extrabold text-lg mb-3">Ringkasan per Event</h2>' + (byEv || '<p class="text-sm text-muted">Belum ada event.</p>') + '</div>' +
      '</div>' +
      '<div class="mt-6 text-right"><button class="btn btn-ink" data-action="report:global">Cetak Rekap Global</button></div>';
  }

  /* ============================================================
     PANDUAN & FAQ
     ============================================================ */
  function guide() {
    var evs = store.events();
    var ev0 = evs[0];
    var g0 = function (tab) { return ev0 ? '#/events/' + ev0.id + '/' + tab : '#/events'; };
    return pageTitle('Panduan & FAQ', 'Semua yang perlu kamu tahu soal tool ini.') +
      '<div class="prose-guide max-w-3xl card card-pad">' +

      '<h3>Peta Menu</h3>' +
      '<p>Menu dikelompokkan: <b>Kerja</b> (Dashboard, Event &amp; Tugas, Arsip, Rekap Global) · <b>Katalog</b> (Produk Dagangan, Barang Bawaan) · <b>Bantuan</b> (Panduan, Pengaturan).</p>' +
      '<p><b>Dashboard</b> - ringkasan seluruh tugas: jumlah event, status SPPD, progress dan saldo kas tiap event.</p>' +
      '<p><b>Event & Tugas</b> - daftar & buat event. Klik satu event membuka satu <b>Layar Kerja</b> berisi 8 seksi.</p>' +
      '<p><a class="underline font-bold" href="#/archive" data-action="nav:go" data-href="#/archive">Arsip</a> - riwayat semua event lengkap dengan filter (status, periode, kata kunci). Pakai untuk mencari event lama.</p>' +
      '<p><a class="underline font-bold" href="#/products" data-action="nav:go" data-href="#/products">Produk Dagangan</a> - katalog produk yang dijual; menjadi Produk &amp; Qty di Layar Kerja, seksi 03.</p>' +
      '<p><a class="underline font-bold" href="#/master" data-action="nav:go" data-href="#/master">Barang Bawaan</a> - grup & item barang kerja PIC (kelistrikan, materi promosi, dan lainnya) selain dagangan; menjadi Item Persiapan di Layar Kerja, seksi 04.</p>' +
      '<p><a class="underline font-bold" href="#/reports" data-action="nav:go" data-href="#/reports">Rekap Global</a> - ringkasan keuangan lintas event dalam satu tampilan. <b>Panduan</b> - halaman ini. <a class="underline font-bold" href="#/settings" data-action="nav:go" data-href="#/settings">Pengaturan</a> - nama/NIP, instansi, tarif km, status integrasi, dan reset data.</p>' +
      '<p><b>Alur utama:</b> Dashboard, lalu <b>Event & Tugas</b> (pilih event), lalu buka <b>Layar Kerja</b> berisi 8 seksi berurutan: <a class="underline font-bold" href="' + g0('persiapan') + '" data-action="nav:go" data-href="' + g0('persiapan') + '">buka layar kerja (contoh)</a> — SPPD &amp; Dana Cair → Jadwal &amp; Milestone → Produk &amp; Qty → Item Persiapan → Uang (Penjualan, Pengeluaran &amp; Penyesuaian, Laporan) → Cross-check Berangkat/Pulang. Gunakan bar <b>Alur Kerja</b> untuk melompat ke seksi mana pun, dan hero <b>Progres persiapan</b> untuk status keseluruhan.</p>' +

      '<h3>Keterhubungan Data</h3>' +
      '<p>Satu <b>Event</b> menampung semua datanya: SPPD, produk & checklist, item persiapan, penjualan, pengeluaran, koreksi kas, milestone, bukti dokumen, dan saldo akhir.</p>' +
      '<p><b>Saldo</b> tiap event dihitung otomatis dari seksi Uang (05–06 &amp; 08): dana awal + penjualan + koreksi kas - transport - pengeluaran. Tiap transaksi bisa dibedakan per <b>wallet</b> (Bank, QRIS, Kas, E-Money) dan dirangkum di Laporan Arus Kas per Wallet seksi 08. Setiap input kas (transport, pengeluaran, penyesuaian) otomatis tersinkron ke tabel <b>Anggaran vs Realisasi per Komponen</b> di seksi 08 — alokasi rinci SPPD dibandingkan dengan realisasi tanpa dihitung manual. <a class="underline font-bold" href="#/reports" data-action="nav:go" data-href="#/reports">Rekap Global</a> menjumlahkan saldo seluruh event, sedangkan <a class="underline font-bold" href="#/archive" data-action="nav:go" data-href="#/archive">Arsip</a> menampilkan riwayatnya.</p>' +
      '<p><b>Checklist</b> mengambil dari 2 katalog: produk dagangan (<a class="underline font-bold" href="#/products" data-action="nav:go" data-href="#/products">halaman Produk Dagangan</a>) dan barang khusus (<a class="underline font-bold" href="#/master" data-action="nav:go" data-href="#/master">halaman Barang Bawaan</a>), lalu tersimpan per event. Mengubah master tidak menghapus data event yang sudah ada.</p>' +
      '<p><b>Database:</b> semua data tersimpan di localStorage browser ini. Belum ada server; data tidak ikut pindah perangkat. Saat GAS & Supabase tersambung nanti, data dipindah ke cloud secara otomatis.</p>' +

      '<h3>Bagaimana alokasi rinci tersinkron dengan kas?</h3>' +
      '<p>Setiap input kas menambal realisasi komponennya secara otomatis: transport <b>sewa</b> mengisi Sewa Transport, <b>umum</b> mengisi Transport Umum, <b>pribadi</b> mengisi BBM &amp; Tol; pengeluaran kategori Penginapan/Uang Saku/Kas Kecil/BBM &amp; Tol mengisi komponen yang sama; sisa pengeluaran masuk Operasional Lain. Wallet E-Money dihitung nilai yang dibayar dari e-money agar saldo bank/kas/QRIS tetap terjaga. Tabel perbandingannya ada di seksi 08 Uang — Laporan.</p>' +

      '<h3>1. Sistem ini untuk apa?</h3>' +
      '<p>Mengelola satu siklus tugas PIC booth event balapan: surat tugas (SPPD), transportasi, barang bawaan, progress, penjualan, dan uang — dalam satu tempat. Satu <b>Event</b> = satu siklus lengkap.</p>' +

      '<h3>2. Bagaimana memulai?</h3>' +
      '<p>Buka halaman <b>Event & Tugas</b> → tombol "+ Buat Event Baru" → isi nama, lokasi, tanggal, status. Lalu kerjakan di satu <b>Layar Kerja</b> dengan 8 seksi berurutan mengikuti alur kerja PIC: SPPD & Dana Cair → Jadwal & Milestone → Produk & Qty → Item Persiapan → Penjualan → Pengeluaran & Penyesuaian → Cross-check Berangkat/Pulang → Laporan.</p>' +

      '<h3>3. Apa itu SPPD & alurnya?</h3>' +
      '<p>Surat Perintah Perjalanan Dinas. Alur status: <b>Draft → Diajukan → Disetujui → Selesai</b>. Isi nomor surat, tujuan, kegiatan, instansi, dan dana awal di seksi 01 (SPPD & Dana Cair). Transportasi perjalanan juga dicatat di seksi 01.</p>' +

      '<h3>4. Apa itu dana awal, dana cair & realisasi?</h3>' +
      '<p><b>Dana awal</b> = alokasi dana tugas dari instansi. Isi juga <b>Rincian Alokasi SPPD</b> (seksi 01) agar anggaran terperinci per komponen — penginapan, transport, uang saku, kas kecil, tol, bensin, e-money, dan lainnya (boleh beda total dari Dana Awal; selisihnya ditampilkan). <b>Dana cair</b> = bagian alokasi yang benar-benar sudah masuk (transfer/kas) — dicatat per sumber di seksi 01 dengan status Belum/Cair. <b>Realisasi</b> = nominal yang benar-benar terpakai di akhir — aktifkan checkbox "Tampilkan realisasi" supaya kolomnya muncul saat mau pertanggungjawaban.</p>' +

      '<h3>5. Tiga mode transportasi, kapan pakai?</h3>' +
      '<p><b>Sewa kendaraan</b> = saat butuh mobilitas selama event (isi vendor & biaya sewa) · <b>Transport umum</b> = kereta/bus/pesawat (isi jenis & no tiket) · <b>Pribadi</b> = pakai kendaraan sendiri (jarak × tarif dihitung otomatis, bisa tambah bensin/tol). Isi per leg: berangkat & pulang bisa beda mode.</p>' +

      '<h3>6. Bedanya Produk &amp; Qty vs Penjualan?</h3>' +
      '<p><b>Produk &amp; Qty</b> = kondisi stok: berapa dibawa, rusak/hilang, dan kembali (otomatis: dibawa − terjual − rusak). <b>Penjualan</b> = transaksi tiap barang laku. Angka terjual otomatis masuk ke rekap Produk &amp; Qty.</p>' +

      '<h3>7. Bagaimana timeline membantu?</h3>' +
      '<p>Milestone bawaan (Persiapan → Berangkat → Event → Pulang → Laporan) tinggal ditandai Belum/Berjalan/Selesai. Dashboard menampilkan progress-nya.</p>' +

      '<h3>8. Bagaimana rekap penjualan dihitung?</h3>' +
      '<p>Otomatis dari tiap transaksi yang dicatat (qty × harga), lengkap dengan metode & wallet (Cash/Kas, QRIS, Transfer/Bank, E-Money). Rekap per produk & total tersedia di seksi 05 Uang — Penjualan.</p>' +

      '<h3>9. Apa itu Laporan Penggunaan Uang?</h3>' +
      '<p>Pertanggungjawaban: dana awal + hasil penjualan − transport − pengeluaran lain = saldo akhir, dibandingkan dengan dana cair (seksi 08: Bandingkan SPPD vs Realisasi). Ada juga <b>Laporan Arus Kas per Wallet</b> dan tombol cetak laporan di seksi 06 & 08.</p>' +

      '<h3>10. Berapa batas data? Buat apa lalu hilang?</h3>' +
      '<p>Data disimpan di <b>database cloud (Supabase)</b> lewat jembatan GAS, dengan salinan lokal di browser. Aman diakses dari perangkat mana pun yang tersambung.</p>' +

      '<h3>11. GAS & Supabase itu apa?</h3>' +
      '<p><b>Supabase</b> = database cloud tempat data disimpan permanen. <b>GAS</b> = jembatan aman yang menghubungkan website ke Supabase dan ke Google Drive (bukti foto).</p>' +

      '<h3>12. Kenapa ada "Prototype" di pojok?</h3>' +
      '<p>Ini versi produksi. Data bisa kamu isi sendiri; <b>Kosongkan Semua Data</b> menghapus semua isi (template bawaan tetap).</p>' +
      '</div>';
  }

  /* ============================================================
     PENGATURAN
     ============================================================ */
  function settings() {
    var st = store.settings();
    var cloud = store.hasCloud();
    var ok = 'background:#ECFDF5;color:#059669';
    var pend = 'background:#FEF3C7;color:#D97706';
    var badge = function (on, yes, no) { return '<span class="badge" style="' + (on ? ok : pend) + '">' + (on ? yes : no) + '</span>'; };
    return pageTitle('Pengaturan', 'Preferensi & status integrasi.') +
      '<div class="grid lg:grid-cols-2 gap-6">' +
      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-4">Identitas & Preferensi</h2>' +
      '<div class="form-grid">' +
      '<div><label class="label" for="st-nama">Nama / NIP</label><input id="st-nama" class="input" value="' + ui.esc(st.nama || '') + '"></div>' +
      '<div><label class="label" for="st-instansi">Instansi</label><input id="st-instansi" class="input" value="' + ui.esc(st.instansi || '') + '"></div>' +
      '<div>' + ui.moneyInput('st-tarif', 'Tarif Reimbursement / km', st.tarifKm) + '</div>' +
      '<div><label class="label" for="st-folder">Folder Drive Bukti (ID)</label><input id="st-folder" class="input" value="' + ui.esc(st.folderDriveId || '') + '" placeholder="ID folder Google Drive (opsional)"></div>' +
      '</div>' +
      '<div class="flex justify-end mt-4"><button class="btn btn-ink" data-action="settings:save">Simpan Pengaturan</button></div>' +
      '</div>' +

      '<div><div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-3">Status Integrasi</h2>' +
      '<div class="eq"><span>Database (Supabase)</span>' + badge(cloud, 'Terhubung', 'Pending') + '</div>' +
      '<div class="eq"><span>API Jembatan (GAS)</span>' + badge(cloud, 'Terhubung', 'Pending') + '</div>' +
      '<div class="eq"><span>Bukti Foto (Drive)</span>' + badge(cloud, 'Aktif', 'Pending') + '</div>' +
      '<div class="eq"><span>Penyimpanan saat ini</span><span class="badge" style="background:#ECFDF5;color:#059669">' + (cloud ? 'Cloud + lokal' : 'localStorage') + '</span></div>' +
      '<p class="text-xs text-muted mt-3">' + (cloud ? 'Tersambung ke cloud — data disinkron otomatis antar perangkat.' : 'Kredensial GAS &amp; Supabase belum diisi. Data hanya tersimpan di browser ini.') + '</p>' +
      '</div>' +

      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-3">Data</h2>' +
      '<p class="text-sm text-muted mb-3">Backup menyimpan seluruh data ke file <b>.json</b>. Pulihkan mengembalikan dari file backup. <b>Kosongkan Semua Data</b> menghapus semua isi (template bawaan tetap).</p>' +
      '<button class="btn btn-ink w-full" data-action="data:export">Backup ke File</button>' +
      '<button class="btn btn-ghost w-full mt-2" data-action="data:import">Pulihkan dari File</button>' +
      '<button class="btn btn-danger w-full mt-2" data-action="data:clear">Kosongkan Semua Data</button>' +
      '</div></div>' +
      '</div>';
  }

  /* ============================================================
     MASTER BARANG DIBAWA — grup & item khusus (template)
     ============================================================ */
  function master() {
    var cats = store.itemCats();
    var tpls = store.itemTemplates();
    var byCat = {};
    tpls.forEach(function (t) { (byCat[t.catId] = byCat[t.catId] || []).push(t); });

    var blocks = cats.map(function (c) {
      var rows = (byCat[c.id] || []).map(function (t) {
        return '<div class="flex items-center justify-between gap-2 py-1.5 border-b border-dashed border-line last:border-0">' +
          '<span class="text-sm">' + ui.esc(t.nama) + '</span>' +
          '<button class="btn btn-sm btn-ghost" data-action="master:itemdel" data-id="' + t.id + '">Hapus</button></div>';
      }).join('');
      return '<div class="card card-pad">' +
        '<div class="flex items-center justify-between gap-2 mb-3">' +
        '<h3 class="font-extrabold text-lg">' + ui.esc(c.nama) + '</h3>' +
        '<button class="btn btn-sm btn-ghost" data-action="master:catdel" data-id="' + c.id + '">Hapus Grup</button></div>' +
        '<div class="form-grid form-grid-2 mb-3">' +
        '<input id="mi-' + c.id + '" class="input" placeholder="item khusus — mis. Kabel rol 5m" aria-label="Nama item baru untuk grup ' + ui.esc(c.nama) + '">' +
        '<button class="btn btn-ink" data-action="master:itemadd" data-cat="' + c.id + '">Tambah</button></div>' +
        (rows || '<p class="text-sm text-muted">Belum ada item di grup ini.</p>') +
        '</div>';
    }).join('');

    return pageTitle('Barang Bawaan', 'Kelola grup & item khusus yang otomatis tersedia sebagai checklist di tiap event. Produk dagangan dikelola di halaman Produk Dagangan.') +
      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Buat Grup Baru</h2>' +
      '<p class="text-xs text-muted mb-3">Contoh: Kelistrikan, Materi Promosi, Peralatan Stand.</p>' +
      '<div class="form-grid form-grid-2 items-center">' +
      '<input id="mc-nama" class="input" placeholder="nama grup — mis. Kelistrikan" aria-label="Nama grup baru">' +
      '<button class="btn btn-primary" data-action="master:catadd">Buat Grup</button></div>' +
      '</div>' +
      '<div class="grid sm:grid-cols-2 gap-4">' + (blocks || '<p class="text-sm text-muted">Belum ada grup.</p>') + '</div>';
  }

  /* ============================================================
     CETAK LAPORAN
     ============================================================ */
  function printEvent(ev) {
    ui.modal(
      '<div class="card-pad">' +
      '<h3 class="text-lg font-extrabold mb-1">Cetak Laporan Keuangan</h3>' +
      '<p class="text-muted text-sm mb-5">Membuka jendela baru berisi laporan ' + ui.esc(ev.nama) + ' siap diprint.</p>' +
      '<div class="flex justify-end gap-2"><button class="btn btn-ghost" data-action="modal:close">Batal</button>' +
      '<button class="btn btn-ink" data-action="print:open" data-event="' + ev.id + '">Buka & Cetak</button></div></div>'
    );
  }

  function printHTML(ev) {
    var s = store.financeSummary(ev.id);
    var st = store.settings();
    var sppd = store.getSppd(ev.id);
    var tRows = store.transports(ev.id).map(function (t) {
      return '<tr><td>' + ui.esc(t.leg) + '</td><td>' + ui.esc(t.ruteAsal) + ' → ' + ui.esc(t.ruteTujuan) + '</td><td>' + ui.esc(t.mode) + '</td><td>' + ui.fmt(t.totalBiaya) + '</td></tr>';
    }).join('');
    var eRows = store.expenses(ev.id).map(function (e) {
      return '<tr><td>' + ui.esc(e.kategori) + '</td><td>' + ui.esc(e.deskripsi) + '</td><td>' + ui.esc(e.tanggal) + '</td><td>' + ui.esc(A.store.walletKey(e.wallet)) + '</td><td>' + ui.fmt(e.jumlah) + '</td></tr>';
    }).join('');
    var sal = store.sales(ev.id).reduce(function (a, sa) { return a + (Number(sa.total) || 0); }, 0);
    var wRows = A.store.WALLETS.map(function (w) {
      var x = s.wallets[w] || { masuk: 0, keluar: 0 };
      return '<tr><td>' + w + '</td><td class="t">+' + ui.fmt(x.masuk) + '</td><td class="t">−' + ui.fmt(x.keluar) + '</td><td class="t tot">' + ui.fmt(x.masuk - x.keluar) + '</td></tr>';
    }).join('');
    var bRows = s.budget.rows.map(function (r) {
      return '<tr><td>' + ui.esc(r.kategori) + (r.ket ? '<br><small>' + ui.esc(r.ket) + '</small>' : '') + '</td>' +
        '<td>' + ui.esc(r.wallet) + '</td>' +
        '<td class="t">' + ui.fmt(r.alokasi) + '</td><td class="t">' + ui.fmt(r.realisasi) + '</td><td class="t">' + ui.fmt(r.sisa) + '</td></tr>';
    }).join('') +
    '<tr class="tot"><td>Total</td><td></td><td class="t">' + ui.fmt(s.budget.totalAlokasi) + '</td><td class="t">' + ui.fmt(s.budget.totalRealisasi) + '</td><td class="t">' + ui.fmt(s.budget.totalSisa) + '</td></tr>';
    var bwRows = (s.budget.perWallet || []).filter(function (w) { return w.alokasi > 0 || w.realisasi > 0; }).map(function (w) {
      return '<tr><td>' + ui.esc(w.wallet) + '</td><td class="t">' + ui.fmt(w.alokasi) + '</td>' +
        '<td class="t">' + ui.fmt(w.realisasi) + '</td><td class="t">' + ui.fmt(w.alokasi - w.realisasi) + '</td></tr>';
    }).join('');

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + ui.esc(ev.nama) + '</title>' +
      '<style>body{font-family:sans-serif;color:#111;padding:32px;max-width:720px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}h1{font-size:20px;margin-bottom:2px}h2{font-size:14px;margin:24px 0 6px;border-bottom:2px solid #111;padding-bottom:4px}.t{text-align:right}.tot{font-weight:bold}@media print{button{display:none}}</style></head><body>' +
      '<h1>Laporan Penggunaan Uang</h1>' +
      '<p style="font-size:12px;color:#555">' + ui.esc(st.nama || '') + ' · ' + ui.esc(st.instansi || '') + '</p>' +
      '<h2>Event</h2><p>' + ui.esc(ev.nama) + ' — ' + ui.esc(ev.lokasi) + ' (' + ui.esc(ev.tanggalMulai) + ' → ' + ui.esc(ev.tanggalSelesai) + ')</p>' +
      '<h2>SPPD</h2><p>No: ' + ui.esc(sppd.noSurat) + ' · Tujuan: ' + ui.esc(sppd.tujuan) + ' · Kegiatan: ' + ui.esc(sppd.kegiatan) + ' · Dana awal: ' + ui.fmt(sppd.danaAwal) + '</p>' +
      '<h2>Transportasi</h2><table><thead><tr><th>Leg</th><th>Rute</th><th>Mode</th><th class="t">Biaya</th></tr></thead><tbody>' + (tRows || '<tr><td colspan="4">-</td></tr>') + '</tbody></table>' +
      '<h2>Pengeluaran Lain</h2><table><thead><tr><th>Kategori</th><th>Deskripsi</th><th>Tanggal</th><th>Wallet</th><th class="t">Jumlah</th></tr></thead><tbody>' + (eRows || '<tr><td colspan="5">-</td></tr>') + '</tbody></table>' +
      '<h2>Arus Kas per Wallet</h2><table><thead><tr><th>Wallet</th><th class="t">Masuk</th><th class="t">Keluar</th><th class="t">Saldo</th></tr></thead><tbody>' + wRows + '</tbody></table>' +
      '<h2>Anggaran vs Realisasi per Komponen</h2><table><thead><tr><th>Komponen</th><th>Wallet</th><th class="t">Alokasi</th><th class="t">Realisasi</th><th class="t">Sisa</th></tr></thead><tbody>' + bRows + '</tbody></table>' +
      '<table><tr><td>Alokasi SPPD (dana awal)</td><td class="t">' + ui.fmt(s.budget.danaAwal) + '</td></tr>' +
      '<tr><td>Dana sudah cair</td><td class="t">' + ui.fmt(s.danaCair) + '</td></tr>' +
      '<tr><td>Selisih (Total alokasi - Dana Awal)</td><td class="t">' + (s.budget.selisihDanaAwal > 0 ? '+' : s.budget.selisihDanaAwal < 0 ? '−' : '') + ui.fmt(Math.abs(s.budget.selisihDanaAwal)) + '</td></tr></table>' +
      (bwRows ? '<h2>Alokasi per Wallet Tujuan</h2><table><thead><tr><th>Wallet</th><th class="t">Alokasi</th><th class="t">Realisasi</th><th class="t">Sisa</th></tr></thead><tbody>' + bwRows + '</tbody></table>' : '') +
      '<table><tr><td>Hasil penjualan</td><td class="t">' + ui.fmt(sal) + '</td></tr>' +
      '<tr><td>Total biaya</td><td class="t">' + ui.fmt(s.pengeluaran) + '</td></tr>' +
      '<tr><td>Penyesuaian kas</td><td class="t">' + (s.totalKasAdj < 0 ? '−' : '+') + ui.fmt(Math.abs(s.totalKasAdj)) + '</td></tr>' +
      '<tr><td class="tot">Saldo akhir</td><td class="t tot">' + ui.fmt(s.saldo) + '</td></tr></table>' +
      '<p style="margin-top:40px;text-align:right">Mengetahui, ______________</p>' +
      '</body></html>';
  }

  A.pages2 = { kerja: tabKerja, produk: tabProduk, timeline: tabTimeline, penjualan: tabPenjualan, keuangan: tabKeuangan };
  A.products = products;
  A.productModal = productModal;
  A.reports = reports;
  A.guide = guide;
  A.settings = settings;
  A.master = master;
  A.printEvent = printEvent;
  A.printHTML = printHTML;
})(window.SPT);