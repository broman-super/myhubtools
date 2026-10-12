/* ============================================================
   SPPD Toolbox — data layer
   PROTOTYPE: localStorage + seed dummy.
   // FUTURE: GAS — semua fungsi di file ini nanti dipindah jadi
   //   fetch() ke URL Web App GAS (action router di SPESIFIKASI §7).
   // FUTURE: SUPABASE — GAS akan meneruskan ke REST Supabase
   //   (service key HANYA di GAS, tidak pernah di frontend ini).
   ============================================================ */
window.SPT = window.SPT || {};

(function (A) {

  var KEY = 'sppd_toolbox_db_v1';
  var DB = null;

  /* ---------- seed data dummy ---------- */
  function seed() {
    var p1 = { id: 'prd-1', userId: 'u1', nama: 'Kaos Balap', sku: 'KSR-1', satuan: 'pcs', hargaJualDefault: 150000, stokKantor: 50, aktif: true };
    var p2 = { id: 'prd-2', userId: 'u1', nama: 'Topi', sku: 'TOP-1', satuan: 'pcs', hargaJualDefault: 75000, stokKantor: 30, aktif: true };
    var p3 = { id: 'prd-3', userId: 'u1', nama: 'Stiker Pack', sku: 'STK-1', satuan: 'pack', hargaJualDefault: 10000, stokKantor: 200, aktif: true };
    var p4 = { id: 'prd-4', userId: 'u1', nama: 'Gelang', sku: 'GLG-1', satuan: 'pcs', hargaJualDefault: 15000, stokKantor: 150, aktif: true };
    var p5 = { id: 'prd-5', userId: 'u1', nama: 'Gantungan Kunci', sku: 'KEY-1', satuan: 'pcs', hargaJualDefault: 25000, stokKantor: 80, aktif: true };
    var p6 = { id: 'prd-6', userId: 'u1', nama: 'Jaket', sku: 'JKT-1', satuan: 'pcs', hargaJualDefault: 250000, stokKantor: 20, aktif: true };
    var p7 = { id: 'prd-7', userId: 'u1', nama: 'Minikar Pajangan', sku: 'MNT-1', satuan: 'pcs', hargaJualDefault: 180000, stokKantor: 25, aktif: true };
    var p8 = { id: 'prd-8', userId: 'u1', nama: 'Totebag', sku: 'TOB-1', satuan: 'pcs', hargaJualDefault: 50000, stokKantor: 40, aktif: true };

    var ev1 = {
      id: 'evt-1', userId: 'u1', nama: 'MotoGP Mandalika 2026', jenis: 'Booth Event Balapan',
      lokasi: 'Sirkuit Mandalika, Lombok', tanggalMulai: '2026-03-13', tanggalSelesai: '2026-03-15',
      status: 'berjalan', peranPic: 'PIC Booth', catatan: 'Stand merchandise utama dekat pit lane.', createdAt: '2026-02-20', updatedAt: '2026-03-13'
    };
    var ev2 = {
      id: 'evt-2', userId: 'u1', nama: 'Drag Race Sentul', jenis: 'Booth Event Balapan',
      lokasi: 'Sentul International Circuit', tanggalMulai: '2026-04-18', tanggalSelesai: '2026-04-18',
      status: 'draft', peranPic: 'PIC Booth', catatan: '', createdAt: '2026-03-20', updatedAt: '2026-03-20'
    };
    var ev3 = {
      id: 'evt-3', userId: 'u1', nama: 'IIMS 2026', jenis: 'Booth Event Balapan',
      lokasi: 'JIExpo Kemayoran, Jakarta', tanggalMulai: '2026-02-12', tanggalSelesai: '2026-02-21',
      status: 'selesai', peranPic: 'PIC Booth', catatan: 'Event rampung, laporan sudah disetor.', createdAt: '2025-12-10', updatedAt: '2026-02-25'
    };

    return {
      events: [ev1, ev2, ev3],
      sppd: [
        { id: 'spp-1', eventId: 'evt-1', noSurat: '039/SPPD/DIR/2026', tanggalTerbit: '2026-03-05', tujuan: 'NTB — Lombok', kegiatan: 'Menjadi PIC booth merchandise', instansi: 'PT Racing Merah', status: 'disetujui', danaAwal: 2500000, realisasi: 0, tampilkanRealisasi: false, linkDokumen: '', catatan: 'Penginapan diinapkan ke hotel panitia.' },
        { id: 'spp-3', eventId: 'evt-3', noSurat: '012/SPPD/DIR/2026', tanggalTerbit: '2026-02-01', tujuan: 'Jakarta', kegiatan: 'PIC booth & penjualan merchandise', instansi: 'PT Racing Merah', status: 'selesai', danaAwal: 3000000, realisasi: 1850000, tampilkanRealisasi: true, linkDokumen: '', catatan: '' }
      ],
      transports: [
        { id: 'trs-1', eventId: 'evt-1', leg: 'Berangkat', tanggal: '2026-03-13', mode: 'umum', ruteAsal: 'Jakarta', ruteTujuan: 'Lombok', totalBiaya: 1350000, detail: { jenis: 'Pesawat', noTiket: 'GA-452', harga: 1350000 }, catatan: 'Tiket pesawat PP sudah dibooking.' },
        { id: 'trs-2', eventId: 'evt-1', leg: 'Pulang', tanggal: '2026-03-16', mode: 'pribadi', ruteAsal: 'Lombok', ruteTujuan: 'Bandara', totalBiaya: 90000, detail: { jarakKm: 20, tarifPerKm: 4500, biayaBensinTol: 0 }, catatan: 'Taksi bandara' }
      ],
      products: [p1, p2, p3, p4, p5, p6, p7, p8],
      eventProducts: [
        { id: 'evp-1', eventId: 'evt-1', productId: 'prd-1', qtyDibawa: 20, qtyRusakHilang: 0, qtyKembali: 0, catatan: '' },
        { id: 'evp-2', eventId: 'evt-1', productId: 'prd-3', qtyDibawa: 100, qtyRusakHilang: 2, qtyKembali: 0, catatan: '2 sobek saat bongkar' },
        { id: 'evp-3', eventId: 'evt-1', productId: 'prd-4', qtyDibawa: 50, qtyRusakHilang: 0, qtyKembali: 0, catatan: '' }
      ],
      sales: [
        { id: 'sal-1', eventId: 'evt-1', productId: 'prd-1', tanggal: '2026-03-13', qty: 5, hargaSatuan: 150000, metode: 'QRIS', total: 750000, catatan: '' },
        { id: 'sal-2', eventId: 'evt-1', productId: 'prd-3', tanggal: '2026-03-13', qty: 30, hargaSatuan: 10000, metode: 'Cash', total: 300000, catatan: '' },
        { id: 'sal-3', eventId: 'evt-1', productId: 'prd-4', tanggal: '2026-03-14', qty: 12, hargaSatuan: 15000, metode: 'Cash', total: 180000, catatan: '' },
        { id: 'sal-4', eventId: 'evt-1', productId: 'prd-1', tanggal: '2026-03-14', qty: 4, hargaSatuan: 150000, metode: 'Transfer', total: 600000, catatan: '' }
      ],
      expenses: [
        { id: 'exp-1', eventId: 'evt-1', kategori: 'Akomodasi', tanggal: '2026-03-13', deskripsi: 'Top-up biaya antar ke venue', jumlah: 150000, buktiDriveId: '', buktiLink: '', catatan: '' },
        { id: 'exp-2', eventId: 'evt-1', kategori: 'Konsumsi', tanggal: '2026-03-13', deskripsi: 'Makan kru booth', jumlah: 120000, buktiDriveId: '', buktiLink: '', catatan: '' },
        { id: 'exp-3', eventId: 'evt-1', kategori: 'Operasional', tanggal: '2026-03-13', deskripsi: 'Sewa meja tambahan', jumlah: 200000, buktiDriveId: '', buktiLink: '', catatan: '' }
      ],
      milestones: [
        { id: 'mil-1', eventId: 'evt-1', judul: 'Persiapan', tanggal: '2026-03-10', status: 'selesai', urutan: 1, catatan: 'Packing barang, cek stok.' },
        { id: 'mil-2', eventId: 'evt-1', judul: 'Berangkat', tanggal: '2026-03-13', status: 'selesai', urutan: 2, catatan: '', attachments: [
          { id: 'att-1', nama: 'SPPD disetujui (scan)', noSurat: '039/SPPD/DIR/2026', url: '#', catatan: 'Scan surat sudah di folder Drive' }
        ] },
        { id: 'mil-3', eventId: 'evt-1', judul: 'Event H-1', tanggal: '2026-03-14', status: 'aktif', urutan: 3, catatan: 'Booth buka 08.00.' },
        { id: 'mil-4', eventId: 'evt-1', judul: 'Pulang', tanggal: '2026-03-16', status: 'todo', urutan: 4, catatan: '' },
        { id: 'mil-5', eventId: 'evt-1', judul: 'Laporan', tanggal: '', status: 'todo', urutan: 5, catatan: 'Laporan penjualan + penggunaan uang.', attachments: [
          { id: 'att-2', nama: 'Rencana penggunaan uang', noSurat: '', url: '', catatan: '' }
        ] }
      ],
      kasAdj: [
        { id: 'kad-1', eventId: 'evt-1', tanggal: '2026-03-15', keterangan: 'Setoran kas dari tim panitia (di luar transaksi booth)', jumlah: 500000 },
        { id: 'kad-2', eventId: 'evt-1', tanggal: '2026-03-16', keterangan: 'Selisih kas opname', jumlah: -25000 }
      ],
      prepItems: [
        { id: 'ppi-1', eventId: 'evt-1', nama: 'Sewa Hotel (3 malam)', kategori: 'Hotel & Penginapan', qty: 1, biaya: 900000, status: 'selesai', dibawa: false, pulang: false, catatan: 'Check-in 13.03' },
        { id: 'ppi-2', eventId: 'evt-1', nama: 'Sewa Kendaraan', kategori: 'Kendaraan', qty: 1, biaya: 250000, status: 'selesai', dibawa: false, pulang: false, catatan: 'Mobil panitia' },
        { id: 'ppi-3', eventId: 'evt-1', nama: 'Tiket Pesawat PP', kategori: 'Tiket', qty: 1, biaya: 1350000, status: 'disetujui', dibawa: false, pulang: false, catatan: '' }
      ],
      settings: {
        nama: 'Kael', instansi: 'PT Racing Merah', tarifKm: 4500,
        folderDriveId: '', catatanIntegrasi: 'Key GAS & Supabase belum diisi (prototype).'
      }
    };
  }

  /* ---------- load / save ---------- */
  function load() {
    if (DB) { return DB; }
    try {
      var raw = localStorage.getItem(KEY);
      DB = raw ? JSON.parse(raw) : seed();
    } catch (e) {
      DB = seed();
    }
    if (!DB.kasAdj) DB.kasAdj = [];
    if (!DB.prepItems) DB.prepItems = [];
    (DB.milestones || []).forEach(function (m) { m.attachments = m.attachments || []; });
    return DB;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); }
    catch (e) { A.toast('Gagal menyimpan ke localStorage', 'error'); }
  }

  /* ---------- events ---------- */
  function events() { return load().events; }
  function getEvent(id) { return events().find(function (e) { return e.id === id; }); }
  function saveEvent(ev, isNew) {
    if (isNew) { ev.id = A.uid(); ev.createdAt = A.isoToday(); ev.userId = 'u1'; load().events.push(ev); }
    else { var i = events().findIndex(function (e) { return e.id === ev.id; }); if (i > -1) events()[i] = ev; }
    ev.updatedAt = A.isoToday();
    save();
    return ev;
  }
  function deleteEvent(id) {
    var db = load();
    db.events = db.events.filter(function (e) { return e.id !== id; });
    db.sppd = db.sppd.filter(function (s) { return s.eventId !== id; });
    db.transports = db.transports.filter(function (t) { return t.eventId !== id; });
    db.eventProducts = db.eventProducts.filter(function (p) { return p.eventId !== id; });
    db.sales = db.sales.filter(function (s) { return s.eventId !== id; });
    db.expenses = db.expenses.filter(function (e) { return e.eventId !== id; });
    db.milestones = db.milestones.filter(function (m) { return m.eventId !== id; });
    db.kasAdj = db.kasAdj.filter(function (k) { return k.eventId !== id; });
    db.prepItems = db.prepItems.filter(function (p) { return p.eventId !== id; });
    save();
  }

  /* ---------- sppd ---------- */
  function getSppd(eventId) {
    var s = load().sppd.find(function (x) { return x.eventId === eventId; });
    if (!s) { s = { id: A.uid(), eventId: eventId, noSurat: '', tanggalTerbit: '', tujuan: '', kegiatan: '', instansi: '', status: 'draft', danaAwal: 0, realisasi: 0, tampilkanRealisasi: false, linkDokumen: '', catatan: '' }; saveSppd(s); }
    return s;
  }
  function saveSppd(s) {
    var arr = load().sppd;
    var i = arr.findIndex(function (x) { return x.id === s.id; });
    if (i > -1) arr[i] = s; else arr.push(s);
    save();
  }

  /* ---------- transports ---------- */
  function transports(eventId) { return load().transports.filter(function (t) { return t.eventId === eventId; }); }
  function saveTransport(t) {
    var arr = load().transports;
    if (t.id) { var i = arr.findIndex(function (x) { return x.id === t.id; }); arr[i] = t; }
    else { t.id = A.uid(); t.eventId = t.eventId; arr.push(t); }
    save();
  }
  function deleteTransport(id) {
    load().transports = load().transports.filter(function (t) { return t.id !== id; });
    save();
  }

  /* ---------- products ---------- */
  function products() { return load().products; }
  function saveProduct(p, isNew) {
    if (isNew) { p.id = A.uid(); p.userId = 'u1'; load().products.push(p); }
    else { var i = products().findIndex(function (x) { return x.id === p.id; }); products()[i] = p; }
    save();
  }
  function deleteProduct(id) {
    load().products = load().products.filter(function (p) { return p.id !== id; });
    load().eventProducts = load().eventProducts.filter(function (ep) { return ep.productId !== id; });
    load().sales = load().sales.filter(function (s) { return s.productId !== id; });
    save();
  }

  /* ---------- event products ---------- */
  function eventProducts(eventId) { return load().eventProducts.filter(function (p) { return p.eventId === eventId; }); }
  function qtyTerjual(eventId, productId) {
    return load().sales.filter(function (s) { return s.eventId === eventId && s.productId === productId; })
      .reduce(function (a, s) { return a + (Number(s.qty) || 0); }, 0);
  }
  // R3: sisa stok yang boleh dijual = dibawa − terjual − rusak/hilang (≥ 0).
  function stokSisa(eventId, productId) {
    var ep = eventProducts(eventId).find(function (x) { return x.productId === productId; });
    if (!ep) { return null; }
    return Math.max(
      (Number(ep.qtyDibawa) || 0)
      - qtyTerjual(eventId, productId)
      - (Number(ep.qtyRusakHilang) || 0), 0);
  }
  function saveEventProduct(ep) {
    var arr = load().eventProducts;
    var i = arr.findIndex(function (x) { return x.id === ep.id; });
    if (i > -1) arr[i] = ep; else arr.push(ep);
    save();
  }
  function removeEventProduct(epId) {
    load().eventProducts = load().eventProducts.filter(function (p) { return p.id !== epId; });
    save();
  }

  /* ---------- sales ---------- */
  function sales(eventId) { return load().sales.filter(function (s) { return s.eventId === eventId; }); }
  function saveSale(s) {
    var arr = load().sales;
    if (s.id) { var i = arr.findIndex(function (x) { return x.id === s.id; }); arr[i] = s; }
    else { s.id = A.uid(); s.total = (Number(s.qty) || 0) * (Number(s.hargaSatuan) || 0); arr.push(s); }
    save();
  }
  function deleteSale(id) {
    load().sales = load().sales.filter(function (s) { return s.id !== id; });
    save();
  }

  /* ---------- expenses ---------- */
  function expenses(eventId) { return load().expenses.filter(function (e) { return e.eventId === eventId; }); }
  function saveExpense(e) {
    var arr = load().expenses;
    if (e.id) { var i = arr.findIndex(function (x) { return x.id === e.id; }); arr[i] = e; }
    else { e.id = A.uid(); arr.push(e); }
    save();
  }
  function deleteExpense(id) {
    load().expenses = load().expenses.filter(function (e) { return e.id !== id; });
    save();
  }

  /* ---------- milestones ---------- */
  function milestones(eventId) {
    return load().milestones.filter(function (m) { return m.eventId === eventId; })
      .sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); });
  }
  function saveMilestone(m) {
    var arr = load().milestones;
    if (m.id) { var i = arr.findIndex(function (x) { return x.id === m.id; }); arr[i] = m; }
    else { m.id = A.uid(); arr.push(m); }
    save();
  }
  function deleteMilestone(id) {
    load().milestones = load().milestones.filter(function (m) { return m.id !== id; });
    save();
  }
  function ensureDefaultMilestones(eventId) {
    var ms = milestones(eventId);
    if (ms.length === 0) {
      var defaults = ['Persiapan', 'Berangkat', 'Event (H-0)', 'Pulang', 'Laporan'];
      defaults.forEach(function (j, i) {
        saveMilestone({ eventId: eventId, judul: j, tanggal: '', status: (i === 0 ? 'aktif' : 'todo'), urutan: i + 1, catatan: '' });
      });
    }
  }

  /* ---------- kas penyesuaian ---------- */
  function kasAdj(eventId) {
    return load().kasAdj.filter(function (k) { return k.eventId === eventId; })
      .sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id || '').localeCompare(a.id || ''); });
  }
  function saveKasAdj(x) {
    var arr = load().kasAdj;
    if (x.id) { var i = arr.findIndex(function (k) { return k.id === x.id; }); arr[i] = x; }
    else { x.id = A.uid(); x.createdAt = A.isoToday(); x.jumlah = Number(x.jumlah) || 0; arr.push(x); }
    save();
  }
  function deleteKasAdj(id) {
    load().kasAdj = load().kasAdj.filter(function (k) { return k.id !== id; });
    save();
  }

  /* ---------- item persiapan (non-produk) ---------- */
  function prepItems(eventId) {
    return load().prepItems.filter(function (p) { return p.eventId === eventId; });
  }
  function prepItemsDone(eventId) {
    var arr = prepItems(eventId);
    return arr.length > 0 && arr.every(function (p) { return p.status === 'selesai'; });
  }
  function prepBiaya(eventId) {
    return prepItems(eventId).reduce(function (a, p) { return a + (Number(p.biaya) || 0); }, 0);
  }
  function savePrepItem(p) {
    var arr = load().prepItems;
    if (p.id) { var i = arr.findIndex(function (x) { return x.id === p.id; }); arr[i] = p; }
    else { p.id = A.uid(); p.dibawa = !!p.dibawa; p.pulang = !!p.pulang; arr.push(p); }
    save();
  }
  function deletePrepItem(id) {
    load().prepItems = load().prepItems.filter(function (p) { return p.id !== id; });
    save();
  }

  /* ---------- cross-check berangkat/pulang (R2) ---------- */
  // anomali = terjual + rusak/hilang − dibawa. NOL/negatif = rekap tuntas
  // (sisa dibawa pulang); positif = oversold / kehilangan → perlu cek.
  function epAnomali(eventId, productId) {
    var ep = eventProducts(eventId).find(function (x) { return x.productId === productId; });
    if (!ep) { return 0; }
    return qtyTerjual(eventId, productId)
      + (Number(ep.qtyRusakHilang) || 0)
      - (Number(ep.qtyDibawa) || 0);
  }
  function berangkatOk(eventId) {
    var s = getSppd(eventId);
    var eps = eventProducts(eventId);
    var items = prepItems(eventId);
    if (!(s.status === 'disetujui' || s.status === 'selesai')) return false;
    if (eps.length === 0) return false;
    if (eps.some(function (ep) { return !(Number(ep.qtyDibawa) > 0); })) return false;
    if (items.length && items.some(function (p) { return p.status !== 'selesai'; })) return false;
    return true;
  }
  function pulangOk(eventId) {
    var eps = eventProducts(eventId);
    var items = prepItems(eventId);
    var rekapTuntas = eps.every(function (ep) { return epAnomali(eventId, ep.productId) <= 0; });
    var pulangAll = items.length === 0 || items.every(function (p) { return !!p.pulang; });
    return rekapTuntas && pulangAll;
  }

  /* ---------- attachment milestone (dokumen bukti) ---------- */
  function milestoneAttachments(milestoneId) {
    var m = load().milestones.find(function (x) { return x.id === milestoneId; });
    if (!m) { return []; }
    m.attachments = m.attachments || [];
    return m.attachments;
  }
  function saveMilestoneAttachment(milestoneId, att) {
    var m = load().milestones.find(function (x) { return x.id === milestoneId; });
    if (!m) { return; }
    m.attachments = m.attachments || [];
    var i = m.attachments.findIndex(function (a) { return a.id === att.id; });
    if (i > -1) { m.attachments[i] = att; } else { att.id = A.uid(); m.attachments.push(att); }
    save();
  }
  function deleteMilestoneAttachment(milestoneId, attId) {
    var m = load().milestones.find(function (x) { return x.id === milestoneId; });
    if (!m) { return; }
    m.attachments = (m.attachments || []).filter(function (a) { return a.id !== attId; });
    save();
  }

  /* ---------- keuangan ---------- */
  function financeSummary(eventId) {
    var sppd = getSppd(eventId);
    var danaAwal = Number(sppd.danaAwal) || 0;
    var totalSales = sales(eventId).reduce(function (a, s) { return a + (Number(s.total) || 0); }, 0);
    var totalTransport = transports(eventId).reduce(function (a, t) { return a + (Number(t.totalBiaya) || 0); }, 0);
    var totalExpense = expenses(eventId).reduce(function (a, e) { return a + (Number(e.jumlah) || 0); }, 0);
    var totalKasAdj = kasAdj(eventId).reduce(function (a, k) { return a + (Number(k.jumlah) || 0); }, 0);
    var pengeluaran = totalTransport + totalExpense;
    return {
      danaAwal: danaAwal, totalSales: totalSales, totalTransport: totalTransport,
      totalExpense: totalExpense, pengeluaran: pengeluaran, totalKasAdj: totalKasAdj,
      saldo: danaAwal + totalSales + totalKasAdj - pengeluaran
    };
  }

  /* ---------- settings & reports ---------- */
  function settings() {
    if (!load().settings) { load().settings = { nama: '', instansi: '', tarifKm: 4500, folderDriveId: '', catatanIntegrasi: '' }; }
    return load().settings;
  }
  function saveSettings(s) { load().settings = s; save(); }

  function globalReports() {
    var out = { byProduct: {}, byEvent: {}, totalSales: 0, totalSalesQty: 0, totalExpense: 0, totalSaldo: 0, events: {} };
    events().forEach(function (ev) {
      var s = financeSummary(ev.id);
      out.events[ev.id] = s;
      out.totalSales += s.totalSales;
      out.totalExpense += s.pengeluaran;
      out.totalSaldo += s.saldo;
      sales(ev.id).forEach(function (sa) {
        out.totalSalesQty += Number(sa.qty) || 0;
        if (!out.byProduct[sa.productId]) { out.byProduct[sa.productId] = { qty: 0, total: 0 }; }
        out.byProduct[sa.productId].qty += Number(sa.qty) || 0;
        out.byProduct[sa.productId].total += Number(sa.total) || 0;
      });
    });
    return out;
  }

  function resetData() {
    DB = seed();
    save();
  }

  A.store = {
    KEY: KEY, load: load, save: save, resetData: resetData,
    events: events, getEvent: getEvent, saveEvent: saveEvent, deleteEvent: deleteEvent,
    getSppd: getSppd, saveSppd: saveSppd,
    transports: transports, saveTransport: saveTransport, deleteTransport: deleteTransport,
    products: products, saveProduct: saveProduct, deleteProduct: deleteProduct,
    eventProducts: eventProducts, qtyTerjual: qtyTerjual, saveEventProduct: saveEventProduct, removeEventProduct: removeEventProduct,
    sales: sales, saveSale: saveSale, deleteSale: deleteSale,
    expenses: expenses, saveExpense: saveExpense, deleteExpense: deleteExpense,
    kasAdj: kasAdj, saveKasAdj: saveKasAdj, deleteKasAdj: deleteKasAdj,
    prepItems: prepItems, prepItemsDone: prepItemsDone, prepBiaya: prepBiaya, savePrepItem: savePrepItem, deletePrepItem: deletePrepItem,
    epAnomali: epAnomali, berangkatOk: berangkatOk, pulangOk: pulangOk, stokSisa: stokSisa,
    milestoneAttachments: milestoneAttachments, saveMilestoneAttachment: saveMilestoneAttachment, deleteMilestoneAttachment: deleteMilestoneAttachment,
    milestones: milestones, saveMilestone: saveMilestone, deleteMilestone: deleteMilestone, ensureDefaultMilestones: ensureDefaultMilestones,
    financeSummary: financeSummary, settings: settings, saveSettings: saveSettings, globalReports: globalReports
  };

})(window.SPT);