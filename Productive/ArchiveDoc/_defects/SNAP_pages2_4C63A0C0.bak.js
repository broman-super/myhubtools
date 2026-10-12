/* ============================================================
   SPPD Toolbox — halaman (bagian 2): tab Produk/Timeline/
   Penjualan/Keuangan + Master Produk + Laporan + Panduan +
   Pengaturan.
   ============================================================ */
window.SPT = window.SPT || {};

(function (A) {
  var store = A.store;
  var ui = A;

  function pageTitle(title, sub) {
    return '<div class="flex items-end justify-between gap-3 flex-wrap mb-6">' +
      '<div><h1 class="stat-num text-4xl text-ink leading-none">' + ui.esc(title) + '</h1>' +
      (sub ? '<p class="text-muted text-sm mt-1">' + ui.esc(sub) + '</p>' : '') + '</div></div>';
  }

  function progressBar(done, total) {
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return '<div class="h-2 bg-line rounded-full overflow-hidden"><div style="width:' + pct + '%" class="h-full bg-accent transition-all"></div></div>' +
      '<div class="text-xs text-muted mt-1">' + done + ' dari ' + total + ' selesai (' + pct + '%)</div>';
  }

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
      '<h2 class="font-extrabold text-lg mb-1">Checklist Produk</h2>' +
      '<p class="text-xs text-muted mb-4">Kembali = dibawa − terjual − rusak/hilang (dihitung otomatis).</p>' +
      (rows ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Produk</th><th>Qty Dibawa</th><th>Terjual</th><th>Rusak/Hilang</th><th>Kembali</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="flex justify-end mt-4"><button class="btn btn-ink" data-action="eventproduct:save" data-event="' + ev.id + '">Simpan Perubahan</button></div></div>' :
        ui.empty('Belum ada produk', 'Tambah produk yang dibawa ke booth.')) +
      '</div>' +

      '<div class="card card-pad">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Produk ke Checklist</div>' +
      (avail.length ?
        '<div class="form-grid form-grid-2"><div><select id="evp-produk" class="select">' + avail.map(function (p) { return '<option value="' + p.id + '">' + ui.esc(p.nama) + '</option>'; }).join('') + '</select></div>' +
        '<div><input id="evp-qty" type="number" min="1" value="1" class="input"></div>' +
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
      var bg = m.status === 'selesai' ? '#111' : m.status === 'aktif' ? '#E11D2E' : '#eee';
      var fg = m.status === 'todo' ? '#777' : '#fff';
      return '<div class="flex items-start gap-4 py-3 border-b border-dashed border-line last:border-0">' +
        '<div class="w-6 h-6 mt-1 rounded-full flex-none text-center text-xs leading-6 font-bold" style="background:' + bg + ';color:' + fg + '">' + (m.status === 'selesai' ? '✓' : m.urutan) + '</div>' +
        '<div class="flex-1"><div class="font-bold">' + ui.esc(m.judul) + '</div>' +
        '<div class="text-xs text-muted">' + (m.tanggal ? ui.esc(m.tanggal) : 'tanpa tanggal') + (m.catatan ? ' · ' + ui.esc(m.catatan) : '') + '</div></div>' +
        statusSel +
        '<button class="btn btn-sm btn-ghost" data-action="milestone:delete" data-id="' + m.id + '">✕</button>' +
        '</div>';
    }).join('');

    return '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-2">Progress</h2>' + progressBar(done, ms.length) +
      '<div class="mt-4">' + (rows || '<p class="text-sm text-muted">Belum ada milestone.</p>') + '</div></div>' +

      '<div class="card card-pad">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Milestone</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div><input id="mil-judul" class="input" placeholder="judul milestone"></div>' +
      '<div><input id="mil-tgl" type="date" class="input"></div>' +
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
      return '<tr>' +
        '<td>' + ui.esc(sa.tanggal) + '</td>' +
        '<td>' + ui.esc(p ? p.nama : '(terhapus)') + '</td>' +
        '<td class="mono">' + sa.qty + '</td>' +
        '<td class="mono">' + ui.fmt(sa.hargaSatuan) + '</td>' +
        '<td><span class="badge" style="background:#F3F4F6;color:#111">' + ui.esc(sa.metode) + '</span></td>' +
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
      '<div><label class="label">Produk</label><select id="sa-produk" class="select">' + optHtml + '</select></div>' +
      '<div><label class="label">Tanggal</label><input id="sa-tgl" type="date" class="input" value="' + ui.isoToday() + '"></div>' +
      '<div><label class="label">Qty</label><input id="sa-qty" type="number" min="1" value="1" class="input"></div>' +
      '<div>' + ui.moneyInput('sa-harga', 'Harga Satuan', defaultHarga) + '</div>' +
      '<div><label class="label">Metode</label><select id="sa-metode" class="select"><option>Cash</option><option>QRIS</option><option>Transfer</option></select></div>' +
      '<div><label class="label">Catatan</label><input id="sa-catatan" class="input" placeholder="opsional"></div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="sale:add" data-event="' + ev.id + '">+ Catat Penjualan</button></div>' +
      '</div></div>' +

      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-3">Riwayat Transaksi</h2>' +
      (rows ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Qty</th><th>Harga</th><th>Metode</th><th>Total</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : ui.empty('Belum ada transaksi', 'Catat penjualan pertama di form di atas.')) +
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
        '<td class="mono">' + ui.fmt(e.jumlah) + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" data-action="expense:delete" data-id="' + e.id + '">Hapus</button></td>' +
        '</tr>';
    }).join('');

    var catOpt = ['Akomodasi', 'Konsumsi', 'Operasional', 'Lainnya'].map(function (c) { return '<option>' + c + '</option>'; }).join('');

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
      '<p class="text-xs text-muted mb-4">Biaya transport dihitung otomatis dari tab SPPD &amp; Perjalanan.</p>' +
      '<div class="form-grid form-grid-2">' +
      '<div><label class="label">Kategori</label><select id="ex-kategori" class="select">' + catOpt + '</select></div>' +
      '<div><label class="label">Tanggal</label><input id="ex-tgl" type="date" class="input" value="' + ui.isoToday() + '"></div>' +
      '<div><label class="label">Deskripsi</label><input id="ex-deskripsi" class="input" placeholder="mis. sewa meja, makan kru"></div>' +
      '<div>' + ui.moneyInput('ex-jumlah', 'Jumlah', 0) + '</div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="expense:add" data-event="' + ev.id + '">+ Catat Pengeluaran</button></div>' +
      '</div></div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-3">Daftar Pengeluaran</h2>' +
      (rows ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Jumlah</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : ui.empty('Belum ada pengeluaran manual', 'Transport otomatis tetap terhitung.')) +
      '</div>' +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Penyesuaian Kas</h2>' +
      '<p class="text-xs text-muted mb-4">Koreksi kas di luar penjualan/biaya: setoran, selisih opname, dana talangan. Masuk pakai angka positif, keluar negatif.</p>' +
      '<div class="adj-form form-grid form-grid-2 mb-4">' +
      '<div><label class="label">Keterangan</label><input id="adj-keterangan" class="input" placeholder="mis. selisih kas opname"></div>' +
      '<div><label class="label">Tanggal</label><input id="adj-tanggal" type="date" class="input" value="' + ui.isoToday() + '"></div>' +
      '<div>' + ui.signedInput('adj-jumlah', 'Nominal (±)', 0) + '</div>' +
      '<div class="flex items-end justify-end"><button class="btn btn-primary" data-action="kasadj:add" data-event="' + ev.id + '">+ Catat Penyesuaian</button></div>' +
      '</div>' +
      '<div class="adj-list">' +
      (function () {
        var adjs = store.kasAdj(ev.id);
        if (!adjs.length) { return '<p class="text-sm text-muted">Belum ada penyesuaian kas.</p>'; }
        return adjs.map(function (k) {
          var cls = (Number(k.jumlah) || 0) >= 0 ? 'adj-in' : 'adj-out';
          var sign = (Number(k.jumlah) || 0) >= 0 ? '+' : '−';
          return '<div class="adj-row ' + cls + '"><div><div class="font-bold">' + ui.esc(k.keterangan) + '</div>' +
            '<div class="text-xs text-muted">' + ui.esc(k.tanggal) + '</div></div>' +
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
  function psec(num, title, inner) {
    return '<section class="psec"><div class="psec-head">' +
      '<span class="psec-num">' + num + '</span>' +
      '<span class="psec-title">' + title + '</span>' +
      '<span class="psec-rule"></span></div>' +
      '<div class="psec-body">' + inner + '</div></section>';
  }

  function tabPersiapan(ev) {
    return psec('01', 'SPPD & Perjalanan', A.tabSppd(ev)) +
      psec('02', 'Produk & Checklist', tabProduk(ev)) +
      psec('03', 'Item Persiapan', tabPrepItems(ev)) +
      psec('04', 'Cross-check Berangkat/Pulang', tabCrossCheck(ev)) +
      psec('05', 'Jadwal (Timeline)', tabTimeline(ev));
  }

  function tabUang(ev) {
    return psec('01', 'Penjualan', tabPenjualan(ev)) +
      psec('02', 'Pengeluaran & Penyesuaian', tabKeuangan(ev)) +
      psec('03', 'Laporan', tabLaporan(ev));
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
      var st = p.status === 'selesai' ? '<span class="badge" style="background:#ECFDF5;color:#059669">Selesai</span>'
        : p.status === 'disetujui' ? '<span class="badge" style="background:#FDEAEA;color:#B8121F">Disetujui</span>'
        : p.status === 'proses' ? '<span class="badge" style="background:#FEF3C7;color:#B45309">Dalam proses</span>'
        : '<span class="badge" style="background:#F3F0EC;color:#111">Belum dipesan</span>';
      return '<tr>' +
        '<td><b>' + ui.esc(p.nama) + '</b></td>' +
        '<td><span class="badge" style="background:#F3F0EC;color:#111">' + ui.esc(p.kategori || 'Lainnya') + '</span></td>' +
        '<td class="mono">' + (p.qty || 1) + '×</td>' +
        '<td class="mono">' + ui.fmt(p.biaya || 0) + '</td>' +
        '<td>' + st + '</td>' +
        '<td>' + (p.pulang ? '<span class="badge" style="background:#ECFDF5;color:#059669">kembali</span>' : '<span class="badge" style="background:#F3F0EC;color:#111">tunggu</span>') + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Rekap Produk &amp; Qty</h2>' +
      '<p class="text-xs text-muted mb-3">Dibawa → Terjual + Rusak/Hilang + Kembali. Badge = rekap keuangan-selesai saat tidak oversold.</p>' +
      (eps.length ?
        '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Produk</th><th>Dibawa</th><th>Terjual</th><th>Rusak</th><th>Kembali</th><th>Rekap</th></tr></thead><tbody>' + prodRows +
        '<tr class="font-extrabold"><td>Total</td><td class="mono">' + tot.bawa + '</td><td class="mono">' + tot.terjual + '</td><td class="mono">' + tot.rusak + '</td><td class="mono">' + tot.kembali + '</td><td></td></tr>' +
        '</tbody></table></div>' :
        ui.empty('Belum ada produk', 'Tambah produk di tab Persiapan → seksi 02.')) +
      '</div>' +

      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Rekap Item Persiapan</h2>' +
      '<p class="text-xs text-muted mb-3">Biaya adalah <b>estimasi tercatat</b> — tidak otomatis mengurangi saldo kas.</p>' +
      (items.length ?
        '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Item</th><th>Kategori</th><th>Qty</th><th>Biaya (est.)</th><th>Status</th><th>Pulang</th></tr></thead><tbody>' + prepRows +
        '<tr class="font-extrabold"><td colspan="3">Total estimasi biaya persiapan</td><td class="mono">' + ui.fmt(store.prepBiaya(ev.id)) + '</td><td colspan="2"></td></tr>' +
        '</tbody></table></div>' :
        ui.empty('Belum ada item persiapan', 'Tambah di tab Persiapan → seksi 03.')) +
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
     ITEM PERSIAPAN (non-produk) — hotel, kendaraan, tiket, dll.
     ============================================================ */
  function tabPrepItems(ev) {
    var items = store.prepItems(ev.id);
    var sumBiaya = store.prepBiaya(ev.id);
    var doneCount = items.filter(function (p) { return p.status === 'selesai'; }).length;
    var rounds = { belum: 'Belum dipesan', proses: 'Dalam proses', disetujui: 'Disetujui', selesai: 'Selesai' };
    var rows = items.map(function (p) {
      var statusSel = '<select class="select w-36" data-action="prepitem:setstatus" data-event="' + ev.id + '" data-id="' + p.id + '">' +
        Object.keys(rounds).map(function (k) { return '<option value="' + k + '"' + (p.status === k ? ' selected' : '') + '>' + rounds[k] + '</option>'; }).join('') +
        '</select>';
      return '<tr>' +
        '<td><b>' + ui.esc(p.nama) + '</b>' + (p.catatan ? '<div class="text-xs text-muted">' + ui.esc(p.catatan) + '</div>' : '') + '</td>' +
        '<td><span class="badge" style="background:#F3F0EC;color:#111">' + ui.esc(p.kategori || 'Lainnya') + '</span></td>' +
        '<td class="mono">' + (p.qty || 1) + '×</td>' +
        '<td class="font-bold mono">' + ui.fmt(p.biaya || 0) + '</td>' +
        '<td>' + statusSel + '</td>' +
        '<td><button class="btn btn-sm btn-ghost" data-action="prepitem:delete" data-id="' + p.id + '">Hapus</button></td>' +
        '</tr>';
    }).join('');
    var cats = ['Hotel & Penginapan', 'Kendaraan', 'Tiket', 'Lainnya'];
    var catOpt = cats.map(function (c) { return '<option value="' + ui.esc(c) + '">' + ui.esc(c) + '</option>'; }).join('');
    return '<div class="grid sm:grid-cols-3 gap-4 mb-6">' +
      ui.statCard('Item Persiapan', String(items.length), 'selain produk dagangan') +
      ui.statCard('Siap / Selesai', doneCount + ' dari ' + items.length, 'status tiap item') +
      ui.statCard('Biaya Persiapan', ui.fmt(sumBiaya), 'estimasi tercatat') +
      '</div>' +
      '<div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-1">Checklist Item Persiapan</h2>' +
      '<p class="text-xs text-muted mb-4">Sewa hotel, kendaraan, pembelian tiket, atau kebutuhan non-produk lain. Status <b>Selesai</b> = item sudah aman & dibawa.</p>' +
      (items.length ? '<div class="overflow-x-auto"><table class="table"><thead><tr><th>Item</th><th>Kategori</th><th>Qty</th><th>Biaya</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' :
        ui.empty('Belum ada item persiapan', 'Tambah persiapan seperti sewa hotel, kendaraan, atau tiket.')) +
      '</div>' +
      '<div class="card card-pad">' +
      '<div class="text-sm font-extrabold mb-3">Tambah Item Persiapan</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div class="sm:col-span-2"><input id="prep-nama" class="input" placeholder="nama item — mis. Sewa Hotel 3 malam"></div>' +
      '<div><label class="label">Kategori</label><select id="prep-kategori" class="select w-full">' + catOpt + '</select></div>' +
      '<div><label class="label">Qty</label><input id="prep-qty" type="number" min="1" value="1" class="input"></div>' +
      '<div>' + ui.moneyInput('prep-biaya', 'Biaya (estimasi)', 0) + '</div>' +
      '<div><label class="label">Status awal</label><select id="prep-status" class="select w-full"><option value="belum">Belum dipesan</option><option value="proses">Dalam proses</option><option value="disetujui">Disetujui</option></select></div>' +
      '<div class="sm:col-span-2"><input id="prep-catatan" class="input" placeholder="catatan (opsional)"></div>' +
      '<div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" data-action="prepitem:add" data-event="' + ev.id + '">Tambah ke Checklist</button></div>' +
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
    if (items.length && items.some(function (p) { return p.status !== 'selesai'; })) missB.push('Ada item persiapan belum selesai');
    if (missB.length === 0 && !bOk) missB.push('Lengkapi data di seksi 01–03');

    var missP = [];
    var anyAsset = eps.length > 0 || items.length > 0;
    if (anyAsset) {
      if (eps.length) {
        var oversold = eps.filter(function (ep) { return store.epAnomali(ev.id, ep.productId) > 0; });
        if (oversold.length) missP.push('Produk ada yang oversold / kehilangan');
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
        '<td><span class="badge" style="background:#F3F0EC;color:#111">Produk</span></td>' +
        '<td class="text-xs text-muted">' + bawa + ' dibawa · ' + terjual + ' terjual · ' + rusak + ' rusak → <b class="mono">' + kembali + ' kembali</b></td>' +
        (ok ? '<td class="text-xs font-bold" style="color:#059669">otomatis ✓</td>' : '<td class="text-xs font-bold" style="color:#B91C1C">oversold ' + anomali + '</td>') +
        '<td>' + (ok ? '<span class="badge" style="background:#ECFDF5;color:#059669">rekap tuntas</span>' : '<span class="badge" style="background:#FEE2E2;color:#B91C1C">perlu cek</span>') + '</td>' +
        '</tr>';
    }).join('');
    var prepRows = items.map(function (p) {
      var st = p.status === 'selesai' ? '<span class="badge" style="background:#ECFDF5;color:#059669">Selesai</span>'
        : p.status === 'disetujui' ? '<span class="badge" style="background:#FDEAEA;color:#B8121F">Disetujui</span>'
        : p.status === 'proses' ? '<span class="badge" style="background:#FEF3C7;color:#B45309">Dalam proses</span>'
        : '<span class="badge" style="background:#F3F0EC;color:#111">Belum dipesan</span>';
      return '<tr>' +
        '<td><b>' + ui.esc(p.nama) + '</b></td>' +
        '<td><span class="badge" style="background:#F3F0EC;color:#111">' + ui.esc(p.kategori || 'Lainnya') + '</span></td>' +
        '<td class="text-xs text-muted">' + st + (p.catatan ? ' · ' + ui.esc(p.catatan) : '') + '</td>' +
        '<td><label class="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" data-action="prepitem:pulang" data-event="' + ev.id + '" data-id="' + p.id + '" class="w-4 h-4 accent-[#E11D2E]"' + (p.pulang ? ' checked' : '') + '> dibawa pulang</label></td>' +
        '<td>' + (p.pulang ? '<span class="badge" style="background:#ECFDF5;color:#059669">terhitung</span>' : '<span class="badge" style="background:#F3F0EC;color:#111">tunggu cek</span>') + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="grid sm:grid-cols-2 gap-4 mb-6">' +
      '<div class="vc' + (bOk ? ' vc-go' : '') + '"><div class="vc-title"><span class="vc-dot ' + (bOk ? 'go' : 'no') + '"></span>' + (bOk ? 'Siap Berangkat' : 'Belum Siap Berangkat') + '</div>' +
      '<div class="vc-sub">' + (bOk ? 'Semua siap: SPPD disetujui, produk & qty dicatat, item persiapan selesai.' : 'Data wajib dilengkapi agar berangkat aman dan bisa dipertanggungjawabkan.') + '</div>' +
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
        ui.empty('Belum ada aset untuk diaudit', 'Tambah produk (seksi 02) atau item persiapan (seksi 03).')) +
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

    return pageTitle('Master Produk', 'Katalog produk yang dibawa ke booth.') +
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
      '<div class="sm:col-span-2"><label class="label">Nama Produk</label><input id="pr-nama" class="input" value="' + ui.esc(p.nama) + '"></div>' +
      '<div><label class="label">SKU / Kode</label><input id="pr-sku" class="input" value="' + ui.esc(p.sku) + '"></div>' +
      '<div><label class="label">Satuan</label><input id="pr-satuan" class="input" value="' + ui.esc(p.satuan) + '"></div>' +
      '<div>' + ui.moneyInput('pr-harga', 'Harga Jual Default', p.hargaJualDefault) + '</div>' +
      '<div><label class="label">Stok Kantor</label><input id="pr-stok" type="number" min="0" class="input" value="' + (p.stokKantor || 0) + '"></div>' +
      '<div class="sm:col-span-2"><label class="label">&nbsp;</label>' +
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

    return pageTitle('Rekap Global', 'Ringkasan keuangan lintas event. Laporan pertanggungjawaban resmi ada di tab Uang & Laporan tiap event (seksi 03 Laporan).') +
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
    return pageTitle('Panduan & FAQ', 'Semua yang perlu kamu tahu soal tool ini.') +
      '<div class="prose-guide max-w-3xl card card-pad">' +

      '<h3>1. Sistem ini untuk apa?</h3>' +
      '<p>Mengelola satu siklus tugas PIC booth event balapan: surat tugas (SPPD), transportasi, barang bawaan, progress, penjualan, dan uang — dalam satu tempat. Satu <b>Event</b> = satu siklus lengkap.</p>' +

      '<h3>2. Bagaimana memulai?</h3>' +
      '<p>Buka halaman <b>Event & Tugas</b> → tombol "+ Buat Event Baru" → isi nama, lokasi, tanggal, status. Lalu kerjakan dari 3 tab event: <b>Roadmap</b> (tahap, status, bukti dokumen) → <b>Persiapan</b> (SPPD, transport, produk, jadwal) → <b>Uang & Laporan</b> (penjualan, pengeluaran, laporan).</p>' +

      '<h3>3. Apa itu SPPD & alurnya?</h3>' +
      '<p>Surat Perintah Perjalanan Dinas. Alur status: <b>Draft → Diajukan → Disetujui → Selesai</b>. Isi nomor surat, tujuan, kegiatan, instansi, dan dana awal di tab <b>Persiapan</b>.</p>' +

      '<h3>4. Apa itu dana awal & realisasi?</h3>' +
      '<p><b>Dana awal</b> = alokasi dana tugas dari instansi. <b>Realisasi</b> = nominal yang benar-benar terpakai di akhir — aktifkan checkbox "Tampilkan realisasi" supaya kolomnya muncul saat mau pertanggungjawaban.</p>' +

      '<h3>5. Tiga mode transportasi, kapan pakai?</h3>' +
      '<p><b>Sewa kendaraan</b> = saat butuh mobilitas selama event (isi vendor & biaya sewa) · <b>Transport umum</b> = kereta/bus/pesawat (isi jenis & no tiket) · <b>Pribadi</b> = pakai kendaraan sendiri (jarak × tarif dihitung otomatis, bisa tambah bensin/tol). Isi per leg: berangkat & pulang bisa beda mode.</p>' +

      '<h3>6. Bedanya Produk & Checklist vs Penjualan?</h3>' +
      '<p><b>Checklist</b> = kondisi stok: berapa dibawa, rusak/hilang, dan kembali (otomatis: dibawa − terjual − rusak). <b>Penjualan</b> = transaksi tiap barang laku. Angka terjual otomatis masuk ke checklist.</p>' +

      '<h3>7. Bagaimana timeline membantu?</h3>' +
      '<p>Milestone bawaan (Persiapan → Berangkat → Event → Pulang → Laporan) tinggal ditandai Belum/Berjalan/Selesai. Dashboard menampilkan progress-nya.</p>' +

      '<h3>8. Bagaimana rekap penjualan dihitung?</h3>' +
      '<p>Otomatis dari tiap transaksi yang dicatat (qty × harga). Rekap per produk & total tersedia di tab <b>Uang & Laporan</b> (bagian Penjualan).</p>' +

      '<h3>9. Apa itu Laporan Penggunaan Uang?</h3>' +
      '<p>Pertanggungjawaban: dana awal + hasil penjualan − transport − pengeluaran lain = saldo akhir. Ada tombol cetak laporan di tab <b>Uang & Laporan</b>.</p>' +

      '<h3>10. Berapa batas data? Buat apa lalu hilang?</h3>' +
      '<p>Prototype ini menyimpan data di <b>localStorage browser</b> — aman selama browser yang sama & belum di-clear. Saat nanti GAS/Supabase tersambung, data dipindah ke database cloud.</p>' +

      '<h3>11. GAS & Supabase itu apa?</h3>' +
      '<p><b>Supabase</b> = database cloud tempat data disimpan permanen. <b>GAS</b> = jembatan aman yang menghubungkan website ke Supabase dan ke Google Drive (bukti foto). Keduanya belum aktif di prototype ini — nanti otomatis terhubung.</p>' +

      '<h3>12. Kenapa ada "Prototype" di pojok?</h3>' +
      '<p>Ini versi uji coba. Semua data contoh (dummy) untuk mengetes alur. Tombol reset di Pengaturan untuk mengembalikan data contoh.</p>' +
      '</div>';
  }

  /* ============================================================
     PENGATURAN
     ============================================================ */
  function settings() {
    var st = store.settings();
    return pageTitle('Pengaturan', 'Preferensi & status integrasi.') +
      '<div class="grid lg:grid-cols-2 gap-6">' +
      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-4">Identitas & Preferensi</h2>' +
      '<div class="form-grid">' +
      '<div><label class="label">Nama / NIP</label><input id="st-nama" class="input" value="' + ui.esc(st.nama || '') + '"></div>' +
      '<div><label class="label">Instansi</label><input id="st-instansi" class="input" value="' + ui.esc(st.instansi || '') + '"></div>' +
      '<div>' + ui.moneyInput('st-tarif', 'Tarif Reimbursement / km', st.tarifKm) + '</div>' +
      '<div><label class="label">Folder Drive Bukti (ID)</label><input id="st-folder" class="input" value="' + ui.esc(st.folderDriveId || '') + '" placeholder="kosong di prototype"></div>' +
      '</div>' +
      '<div class="flex justify-end mt-4"><button class="btn btn-ink" data-action="settings:save">Simpan Pengaturan</button></div>' +
      '</div>' +

      '<div><div class="card card-pad mb-6">' +
      '<h2 class="font-extrabold text-lg mb-3">Status Integrasi</h2>' +
      '<div class="eq"><span>Database (Supabase)</span><span class="badge" style="background:#FEF3C7;color:#D97706">Pending</span></div>' +
      '<div class="eq"><span>API Jembatan (GAS)</span><span class="badge" style="background:#FEF3C7;color:#D97706">Pending</span></div>' +
      '<div class="eq"><span>Bukti Foto (Drive)</span><span class="badge" style="background:#FEF3C7;color:#D97706">Pending</span></div>' +
      '<div class="eq"><span>Penyimpanan saat ini</span><span class="badge" style="background:#ECFDF5;color:#059669">localStorage</span></div>' +
      '<p class="text-xs text-muted mt-3">Setelah key GAS &amp; Supabase tersedia, tinggal ganti data layer di <code>js/store.js</code> — struktur sudah disiapkan. Tandai <b>// FUTURE</b>.</p>' +
      '</div>' +

      '<div class="card card-pad">' +
      '<h2 class="font-extrabold text-lg mb-3">Data</h2>' +
      '<p class="text-sm text-muted mb-3">Reset menghapus semua data uji coba dan mengembalikan contoh dummy.</p>' +
      '<button class="btn btn-danger w-full" data-action="data:reset">Reset Data Dummy</button>' +
      '</div></div>' +
      '</div>';
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
      return '<tr><td>' + t.leg + '</td><td>' + t.ruteAsal + ' → ' + t.ruteTujuan + '</td><td>' + t.mode + '</td><td>' + ui.fmt(t.totalBiaya) + '</td></tr>';
    }).join('');
    var eRows = store.expenses(ev.id).map(function (e) {
      return '<tr><td>' + e.kategori + '</td><td>' + e.deskripsi + '</td><td>' + e.tanggal + '</td><td>' + ui.fmt(e.jumlah) + '</td></tr>';
    }).join('');
    var sal = store.sales(ev.id).reduce(function (a, sa) { return a + (Number(sa.total) || 0); }, 0);

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + ev.nama + '</title>' +
      '<style>body{font-family:sans-serif;color:#111;padding:32px;max-width:720px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}h1{font-size:20px;margin-bottom:2px}h2{font-size:14px;margin:24px 0 6px;border-bottom:2px solid #111;padding-bottom:4px}.t{text-align:right}.tot{font-weight:bold}@media print{button{display:none}}</style></head><body>' +
      '<h1>Laporan Penggunaan Uang</h1>' +
      '<p style="font-size:12px;color:#555">' + (st.nama || '') + ' · ' + (st.instansi || '') + '</p>' +
      '<h2>Event</h2><p>' + ev.nama + ' — ' + ev.lokasi + ' (' + ev.tanggalMulai + ' → ' + ev.tanggalSelesai + ')</p>' +
      '<h2>SPPD</h2><p>No: ' + sppd.noSurat + ' · Tujuan: ' + sppd.tujuan + ' · Kegiatan: ' + sppd.kegiatan + ' · Dana awal: ' + ui.fmt(sppd.danaAwal) + '</p>' +
      '<h2>Transportasi</h2><table><thead><tr><th>Leg</th><th>Rute</th><th>Mode</th><th class="t">Biaya</th></tr></thead><tbody>' + (tRows || '<tr><td colspan="4">-</td></tr>') + '</tbody></table>' +
      '<h2>Pengeluaran Lain</h2><table><thead><tr><th>Kategori</th><th>Deskripsi</th><th>Tanggal</th><th class="t">Jumlah</th></tr></thead><tbody>' + (eRows || '<tr><td colspan="4">-</td></tr>') + '</tbody></table>' +
      '<table><tr><td>Hasil penjualan</td><td class="t">' + ui.fmt(sal) + '</td></tr>' +
      '<tr><td>Total biaya</td><td class="t">' + ui.fmt(s.pengeluaran) + '</td></tr>' +
      '<tr><td>Penyesuaian kas</td><td class="t">' + (s.totalKasAdj < 0 ? '−' : '+') + ui.fmt(Math.abs(s.totalKasAdj)) + '</td></tr>' +
      '<tr><td class="tot">Saldo akhir</td><td class="t tot">' + ui.fmt(s.saldo) + '</td></tr></table>' +
      '<p style="margin-top:40px;text-align:right">Mengetahui, ______________</p>' +
      '</body></html>';
  }

  A.pages2 = { produk: tabProduk, timeline: tabTimeline, penjualan: tabPenjualan, keuangan: tabKeuangan, persiapan: tabPersiapan, uang: tabUang };
  A.products = products;
  A.productModal = productModal;
  A.reports = reports;
  A.guide = guide;
  A.settings = settings;
  A.printEvent = printEvent;
  A.printHTML = printHTML;
})(window.SPT);