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

  var KEY = 'sppd_toolbox_db_v2';
  var KEY_WRITE_VALUE = 'f71777528484496aa4dc15b12fdfca88';
  var LEGACY_KEYS = ['sppd_toolbox_db_v1'];
  var DB = null;
  /* Kunci tulis tim (BRIDGE_TOKEN di GAS). Ditanam di halaman: tanpa prompt.
     Risiko diterima: siapa pun yang membuka halaman ini bisa ikut menulis data. */
  function writeKey(ask) { return KEY_WRITE_VALUE; }
  /* Id yang ada saat load terakhir. Server hanya boleh menghapus id di daftar
     ini — mencegah tab basi mengosongkan tabel yang belum pernah ia lihat. */
  var _loadedIds = null;
  var SYNC_KEYS = ['events', 'sppd', 'transports', 'products', 'eventProducts', 'sales',
    'expenses', 'milestones', 'kasAdj', 'danaCair', 'prepItems', 'checklistTemplates',
    'checklistItems', 'itemCats', 'itemTemplates'];
  function idsOf(db) {
    var out = {};
    SYNC_KEYS.forEach(function (k) {
      out[k] = (db[k] || []).map(function (r) { return r.id; })
        .filter(function (x) { return x !== null && x !== undefined && x !== ''; });
    });
    return out;
  }
  /* Cache ringkasan keuangan per event; dikosongkan setiap save() supaya
     hasil selalu segar (semua mutasi melewati save()). */
  var _finCache = {};

  /* ============================================================
     CLOUD SYNC (opsional) — GAS bridge gas/sppdtoolbox.gs → Supabase.
     localStorage tetap penyimpanan instan; cloud disinkron di belakang
     (debounce). Mati total bila window.SPT_GAS_URL kosong.
     ponytail: full-DB sync, bukan diff per baris — cukup untuk skala
     prototipe; ganti ke diff kalau data sudah besar / save terasa lambat.
     ============================================================ */
  var GAS_URL = String(window.SPT_GAS_URL || '').trim();
  var _pushTimer = null;
  var _conn = 'local';           // 'local' | 'online' | 'error'
  var _connListeners = [];
  var _loading = false;
  var _loadListeners = [];

  function hasCloud() { return !!GAS_URL; }
  function onConn(fn) { _connListeners.push(fn); try { fn(_conn); } catch (e) {} }
  function setConn(s) {
    if (_conn === s) { return; }
    _conn = s;
    _connListeners.forEach(function (fn) { try { fn(s); } catch (e) {} });
  }
  function onLoading(fn) { _loadListeners.push(fn); try { fn(_loading); } catch (e) {} }
  function setLoading(v) {
    if (_loading === v) { return; }
    _loading = v;
    _loadListeners.forEach(function (fn) { try { fn(v); } catch (e) {} });
    if (window.SPT) {
      if (v) { if (window.SPT.showLoader) window.SPT.showLoader('Menyinkronkan data...'); }
      else { if (window.SPT.hideLoader) window.SPT.hideLoader(); }
    } else {
      var el = document.getElementById('global-loader');
      if (el) el.classList.toggle('is-active', !!v);
    }
  }
  function gasCall(action, payload) {
    var ctrl = null;
    var tmo = null;
    if (typeof AbortController !== 'undefined') ctrl = new AbortController();
    return new Promise(function (resolve, reject) {
      if (ctrl) {
        tmo = setTimeout(function () { try { ctrl.abort(); } catch (e) {} reject(new Error('Timeout sinkronisasi cloud (30s)')); }, 30000);
      }
      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, payload: payload || {}, token: writeKey(true) }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'Respons GAS tidak dikenal');
        resolve(j.data);
      }).catch(function (err) { reject(err); }).finally(function () {
        if (tmo) clearTimeout(tmo);
      });
    });
  }
  /* Dataset contoh lama (seedDemo) yang sempat bocor ke localStorage & cloud.
     Kenali lewat id-nya, lalu reset — agar tidak balik dimuat antar perangkat. */
  var LEGACY_DEMO_EVENT_IDS = { 'evt-1': 1, 'evt-2': 1, 'evt-3': 1, 'ev-d1': 1, 'ev-d2': 1, 'ev-d3': 1, 'ev-d4': 1, 'ev-d5': 1, 'ev-d6': 1 };
  function hasLegacyDemo(db) {
    return !!(db && db.events && db.events.length && db.events.some(function (e) { return LEGACY_DEMO_EVENT_IDS[e.id]; }));
  }

  function normalizeDb(obj) {
    if (!obj || typeof obj !== 'object') { return null; }
    DB = obj;
    ['events', 'sppd', 'transports', 'products', 'eventProducts', 'sales', 'expenses',
      'milestones', 'kasAdj', 'danaCair', 'prepItems', 'checklistTemplates', 'checklistItems',
      'itemCats', 'itemTemplates'].forEach(function (k) {
        if (!DB[k]) DB[k] = [];
      });
    if (hasLegacyDemo(DB)) { DB = seed(); }
    DB.sppd.forEach(function (s) { if (!s.budget) s.budget = []; });
    (DB.milestones || []).forEach(function (m) { m.attachments = m.attachments || []; });
    _finCache = {};
    return DB;
  }
  function remoteLoad(cb) {
    if (!hasCloud()) { setConn('local'); if (cb) cb(new Error('cloud-off')); return; }
    setLoading(true);
    gasCall('full', {}).then(function (data) {
      var empty = !data || ((data.events || []).length === 0 && (data.products || []).length === 0);
      if (empty) {
        save();               // DB cloud masih kosong �+' jangan timpa lokal, unggah seed
      } else {
        var legacy = hasLegacyDemo(data);
        normalizeDb(data);
        _loadedIds = idsOf(DB);
        try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {}
        if (legacy) { save(); }   // DB sudah direset kosong �+' bersihkan cloud juga
      }
      setConn('online');
      if (cb) cb(null);
    }).catch(function (err) { setConn('error'); if (cb) cb(err); }).finally(function () { setLoading(false); });
  }
  function schedulePush() {
    if (!hasCloud()) { return; }
    clearTimeout(_pushTimer);
    /* push senyap: loader fullscreen hanya untuk muat awal (remoteLoad);
       status koneksi cukup lewat badge onConn — jangan ganggu user saat mengetik */
    _pushTimer = setTimeout(function () {
      var payload = Object.assign({}, load());
      payload.__loadedIds = _loadedIds;
      gasCall('save', payload).then(function () {
        _loadedIds = idsOf(payload);
        setConn('online');
      }).catch(function () { setConn('error'); });
    }, 800);
  }

  var WALLETS = ['Bank', 'QRIS', 'Kas', 'E-Money'];
  var METODE_TO_WALLET = { Cash: 'Kas', QRIS: 'QRIS', Transfer: 'Bank', 'E-Money': 'E-Money' };

  /* ===== NEW: SPPD Wizard Data Structure (6 steps) ===== */
  // Mirrors Supabase schema: sppd_header + child tables
  // All linked by eventId
  var SPPD_BIAYA_MAX = 8;
  var SPPD_SPJ_MAX_ROWS = 6;
  
  function newSppdWizard() {
    return {
      // Step 1: Perusahaan
      perusahaan: {
        nama: 'PT. ELFIQA KARYA TRIANGGA',
        logo: '',
        wmMode: 'teks',
        wmImg: '',
        wmText: 'PT. ELFIQA KARYA TRIANGGA'
      },
      // Step 2: Info Perjalanan
      pemberiTugas: 'Direktur',
      departemen: 'SUPERSUB',
      tglBerangkat: '',
      jamBerangkat: '09.00 WIB',
      tglKembali: '',
      ketKembali: 'sampai dengan selesai',
      transport: { pribadi: true, travel: false, kereta: false, lainnya: '' },
      kota: '',
      target: ['', '', ''],
      // Step 3: Biaya Umum (max 8; default 5 baris — sama dgn form referensi)
      biaya: [
        { item: 'Bensin', jumlah: 0, ket: '' },
        { item: 'Penginapan', jumlah: 0, ket: '' },
        { item: 'Kas Kecil', jumlah: 0, ket: '' },
        { item: 'TOL', jumlah: 0, ket: '' },
        { item: '', jumlah: 0, ket: '' }
      ],
      // Step 4: Biaya SPJ - 4 daftar independen
      petugas: [''],
      uangSaku: [{ wq: 0, wa: 0, eq: 0, ea: 0 }],
      penginapan: [{ qty: 0, a: 0 }],
      konsumsi: [0],
      // Step 5: Penandatangan (tanggal maker default hari ini, sesuai praktik isi form)
      ttd: {
        maker: { nama: '', jabatan: '', tanggal: (A.isoToday ? A.isoToday() : ''), img: '' },
        checker: { nama: '', jabatan: '', tanggal: '', img: '' },
        signer: { nama: '', jabatan: '', tanggal: '', img: '' }
      },
      // Meta — status memakai kosakata form lama: draft|diajukan|disetujui|selesai
      status: 'draft',
      noSurat: '',
      tanggalTerbit: '',
      tujuan: '',
      kegiatan: '',
      instansi: '',
      catatan: '',
      danaAwal: 0,
      realisasi: 0,
      tampilkanRealisasi: false
    };
  }
  function walletKey(w) { return WALLETS.indexOf(w) >= 0 ? w : 'Kas'; }
  function normWallets(db) {
    (db.sales || []).forEach(function (s) { if (!s.wallet) s.wallet = walletKey(METODE_TO_WALLET[s.metode] || 'Kas'); });
    (db.expenses || []).forEach(function (e) { if (!e.wallet) e.wallet = 'Kas'; });
    (db.kasAdj || []).forEach(function (k) { if (!k.wallet) k.wallet = 'Kas'; });
    (db.transports || []).forEach(function (t) { if (!t.wallet) t.wallet = 'Kas'; });
  }

  /* Wallet tujuan untuk tiap baris alokasi SPPD. Komponen 'E-Money'
     dipaksa ke wallet E-Money (memang untuk dompet digital); komponen
     lain mengikuti wallet yang dipilih user, default 'Kas'. */
  function budgetWallet(kategori, w) {
    if (kategori === 'E-Money') { return 'E-Money'; }
    return walletKey(w);
  }
  function normBudgetWallet(db) {
    (db.sppd || []).forEach(function (s) {
      (s.budget || []).forEach(function (b) { b.wallet = budgetWallet(b.kategori, b.wallet); });
    });
  }

  /* ---------- seed data dummy ---------- */
  function builtinChecklist() {
    return [
      { id: 'ckt-01', userId: 'u1', kategori: 'Dokumen', nama: 'SPPD dibuat (no surat, tujuan, kegiatan)', urutan: 1 },
      { id: 'ckt-02', userId: 'u1', kategori: 'Dokumen', nama: 'SPPD disetujui atasan', urutan: 2 },
      { id: 'ckt-03', userId: 'u1', kategori: 'Dokumen', nama: 'Data instansi & NIP lengkap', urutan: 3 },
      { id: 'ckt-04', userId: 'u1', kategori: 'Dokumen', nama: 'Dokumen pendukung (undangan/surat tugas)', urutan: 4 },
      { id: 'ckt-05', userId: 'u1', kategori: 'Dokumen', nama: 'Brosur / daftar peserta dibawa', urutan: 5 },
      { id: 'ckt-06', userId: 'u1', kategori: 'Dokumen', nama: 'Kontak narahubung dicatat', urutan: 6 },
      { id: 'ckt-07', userId: 'u1', kategori: 'Logistik', nama: 'Transportasi dipesan', urutan: 7 },
      { id: 'ckt-08', userId: 'u1', kategori: 'Logistik', nama: 'Penginapan dipesan', urutan: 8 },
      { id: 'ckt-09', userId: 'u1', kategori: 'Logistik', nama: 'Produk / stok booth disiapkan', urutan: 9 },
      { id: 'ckt-10', userId: 'u1', kategori: 'Logistik', nama: 'Perlengkapan display & meja', urutan: 10 },
      { id: 'ckt-11', userId: 'u1', kategori: 'Logistik', nama: 'Katering / konsumsi kru diatur', urutan: 11 },
      { id: 'ckt-12', userId: 'u1', kategori: 'Logistik', nama: 'Alat tulis & kartu nama', urutan: 12 },
      { id: 'ckt-13', userId: 'u1', kategori: 'Keberangkatan', nama: 'Cek tiket & boarding pass', urutan: 13 },
      { id: 'ckt-14', userId: 'u1', kategori: 'Keberangkatan', nama: 'Uang kas harian disiapkan', urutan: 14 },
      { id: 'ckt-15', userId: 'u1', kategori: 'Keberangkatan', nama: 'Peralatan dicek (laptop/listrik)', urutan: 15 },
      { id: 'ckt-16', userId: 'u1', kategori: 'Keberangkatan', nama: 'Stok dikemas & dihitung', urutan: 16 },
      { id: 'ckt-17', userId: 'u1', kategori: 'Keberangkatan', nama: 'Kontak panitia lokal dikonfirmasi', urutan: 17 },
      { id: 'ckt-18', userId: 'u1', kategori: 'Keberangkatan', nama: 'Berangkat tepat waktu', urutan: 18 },
      { id: 'ckt-19', userId: 'u1', kategori: 'Laporan', nama: 'Catat penjualan harian', urutan: 19 },
      { id: 'ckt-20', userId: 'u1', kategori: 'Laporan', nama: 'Catat pengeluaran', urutan: 20 },
      { id: 'ckt-21', userId: 'u1', kategori: 'Laporan', nama: 'Kumpulkan bukti / kwitansi', urutan: 21 },
      { id: 'ckt-22', userId: 'u1', kategori: 'Laporan', nama: 'Rekap transportasi', urutan: 22 },
      { id: 'ckt-23', userId: 'u1', kategori: 'Laporan', nama: 'Laporan penggunaan uang disusun', urutan: 23 },
      { id: 'ckt-24', userId: 'u1', kategori: 'Laporan', nama: 'Saldo disetor & laporan diserahkan', urutan: 24 }
    ];
  }

  /* ---------- master barang dibawa (grup + item khusus) ---------- */
  function builtinItemCats() {
    return [
      { id: 'mcat-01', userId: 'u1', nama: 'Kelistrikan', urutan: 1 },
      { id: 'mcat-02', userId: 'u1', nama: 'Materi Promosi', urutan: 2 },
      { id: 'mcat-03', userId: 'u1', nama: 'Peralatan Stand', urutan: 3 },
      { id: 'mcat-04', userId: 'u1', nama: 'Alat Tulis & Admin', urutan: 4 },
      { id: 'mcat-05', userId: 'u1', nama: 'Keselamatan & Medis', urutan: 5 }
    ];
  }
  function builtinItemTemplates() {
    var t = [];
    var rows = [
      ['mcat-01', 'Kabel rol / stop kontak'], ['mcat-01', 'T-connector / stop kontak cabang'],
      ['mcat-01', 'Lampu LED meja'], ['mcat-01', 'Terminal listrik'], ['mcat-01', 'Power bank cadangan'], ['mcat-01', 'Adaptor / charger cadangan'],
      ['mcat-02', 'Banner / spanduk booth'], ['mcat-02', 'X-banner display'], ['mcat-02', 'Katalog & brosur produk'],
      ['mcat-02', 'Poster harga'], ['mcat-02', 'Kartu nama'], ['mcat-02', 'Gimmick / suvenir kecil'],
      ['mcat-03', 'Cover tablecloth'], ['mcat-03', 'Meja lipat'], ['mcat-03', 'Kursi lipat'], ['mcat-03', 'Rak display produk'],
      ['mcat-03', 'Kunci gembok'], ['mcat-03', 'Cermin / kaca pajang'],
      ['mcat-04', 'Pulpen & marker'], ['mcat-04', 'Kertas nota'], ['mcat-04', 'Kalkulator'],
      ['mcat-04', 'Lakban & gunting'], ['mcat-04', 'Buku tamu'], ['mcat-04', 'Laptop + charger'],
      ['mcat-05', 'P3K kit'], ['mcat-05', 'Hand sanitizer'], ['mcat-05', 'Masker cadangan'], ['mcat-05', 'Lampu senter'], ['mcat-05', 'APAR mini (pemadam)']
    ];
    rows.forEach(function (r, i) {
      t.push({ id: 'mtpl-' + String(i + 1).padStart(2, '0'), userId: 'u1', catId: r[0], nama: r[1], urutan: i + 1 });
    });
    return t;
  }

  /* Tool produksi: mulai dari DB kosong (tanpa data contoh).
     Template bawaan (checklist, master barang) & pengaturan tetap
     disiapkan otomatis oleh load(). */
  function seed() {
    return {
      events: [], sppd: [], transports: [], products: [], eventProducts: [],
      sales: [], expenses: [], milestones: [], kasAdj: [], danaCair: [], prepItems: [],
      checklistTemplates: builtinChecklist(), checklistItems: [],
      itemCats: builtinItemCats(), itemTemplates: builtinItemTemplates(),
      settings: { nama: '', instansi: '', tarifKm: 4500, folderDriveId: '', catatanIntegrasi: '' }
    };
  }


  /* ---------- load / save ---------- */
  function load() {
    if (DB) { return DB; }
    var purged = false;
    try {
      var raw = localStorage.getItem(KEY);
      DB = raw ? JSON.parse(raw) : seed();
      LEGACY_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e2) {} });
    } catch (e) {
      DB = seed();
    }
    if (hasLegacyDemo(DB)) { DB = seed(); purged = true; }
    if (!DB.kasAdj) DB.kasAdj = [];
    if (!DB.prepItems) DB.prepItems = [];
    if (!DB.danaCair) DB.danaCair = [];
    if (!DB.sppdWizard) DB.sppdWizard = {};
    DB.sppd.forEach(function (s) { if (!s.budget) s.budget = []; });
    normBudgetWallet(DB);
    DB.prepItems.forEach(function (p) { if (p.status !== 'selesai') p.status = 'belum'; });
    normWallets(DB);
    (DB.milestones || []).forEach(function (m) { m.attachments = m.attachments || []; });
    if (!DB.checklistTemplates || !DB.checklistTemplates.length) DB.checklistTemplates = builtinChecklist();
    if (!DB.checklistItems) DB.checklistItems = [];
    DB.events.forEach(function (ev) {
      var have = DB.checklistItems.filter(function (c) { return c.eventId === ev.id; });
      DB.checklistTemplates.forEach(function (tpl) {
        if (!have.some(function (c) { return c.templateId === tpl.id; })) {
          DB.checklistItems.push({ id: A.uid(), userId: ev.userId || 'u1', eventId: ev.id, templateId: tpl.id, status: 'todo', updatedAt: ev.createdAt || '' });
        }
      });
    });
if (!DB.itemCats || !DB.itemCats.length) DB.itemCats = builtinItemCats();
    if (!DB.itemTemplates || !DB.itemTemplates.length) DB.itemTemplates = builtinItemTemplates();
    if (purged) { save(); }
    return DB;
  }
  function save() {
    _finCache = {};
    normWallets(DB);
    normBudgetWallet(DB);
    try { localStorage.setItem(KEY, JSON.stringify(DB)); }
    catch (e) { A.toast('Gagal menyimpan data — penyimpanan browser penuh atau diblokir.', 'error'); }
    schedulePush();
  }
  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }
  function importJSON(str) {
    var obj;
    try { obj = JSON.parse(str); }
    catch (e) { throw new Error('File tidak bisa dibaca. Pastikan file .json hasil "Backup ke File".'); }
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.events)) {
      throw new Error('Format backup tidak dikenali. Pastikan file berasal dari tombol "Backup ke File".');
    }
    var before = events().length;
    DB = obj;
    if (!DB.kasAdj) DB.kasAdj = [];
    if (!DB.prepItems) DB.prepItems = [];
    if (!DB.danaCair) DB.danaCair = [];
    DB.sppd.forEach(function (s) { if (!s.budget) s.budget = []; });
    normBudgetWallet(DB);
    DB.prepItems.forEach(function (p) { if (p.status !== 'selesai') p.status = 'belum'; });
    normWallets(DB);
    if (!DB.milestones) DB.milestones = [];
    (DB.milestones || []).forEach(function (m) { m.attachments = m.attachments || []; });
    save();
    return { before: before, after: DB.events.length };
  }

  /* ---------- snapshot untuk undo (in-memory, tanpa ubah skema) ---------- */
  function snapshot() {
    return JSON.parse(JSON.stringify(load()));
  }
  function restore(snap) {
    if (!snap || typeof snap !== 'object') { return; }
    DB = JSON.parse(JSON.stringify(snap));
    if (!DB.kasAdj) DB.kasAdj = [];
    if (!DB.prepItems) DB.prepItems = [];
    if (!DB.danaCair) DB.danaCair = [];
    if (!DB.sppd) DB.sppd = [];
    DB.sppd.forEach(function (s) { if (!s.budget) s.budget = []; });
    if (!DB.milestones) DB.milestones = [];
    (DB.milestones || []).forEach(function (m) { m.attachments = m.attachments || []; });
    save();
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
    db.danaCair = db.danaCair.filter(function (x) { return x.eventId !== id; });
    db.prepItems = db.prepItems.filter(function (p) { return p.eventId !== id; });
    save();
  }

  /* ---------- sppd ---------- */
  function getSppd(eventId) {
    var s = load().sppd.find(function (x) { return x.eventId === eventId; });
    if (!s) { s = { id: A.uid(), eventId: eventId, noSurat: '', tanggalTerbit: '', tujuan: '', kegiatan: '', instansi: '', status: 'draft', danaAwal: 0, realisasi: 0, tampilkanRealisasi: false, linkDokumen: '', catatan: '', budget: [] }; saveSppd(s); }
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

  /* ---------- dana cair (R: checklist dana yang sudah masuk) ---------- */
  function danaCair(eventId) {
    return (load().danaCair || []).filter(function (x) { return x.eventId === eventId; })
      .sort(function (a, b) { return (a.tanggalCair || '').localeCompare(b.tanggalCair || '') || (a.id || '').localeCompare(b.id || ''); });
  }
  function saveDanaCair(x) {
    var arr = load().danaCair;
    if (x.id) { var i = arr.findIndex(function (d) { return d.id === x.id; }); arr[i] = x; }
    else { x.id = A.uid(); x.nominal = Number(x.nominal) || 0; arr.push(x); }
    save();
  }
  function deleteDanaCair(id) {
    load().danaCair = load().danaCair.filter(function (d) { return d.id !== id; });
    save();
  }

  /* ---------- alokasi SPPD rinci (anggaran per komponen, Fase 10) ---------- */
  // Komponen yang umum ada di SPPD: penginapan, sewa transport, jenis transport,
  // uang saku, kas kecil, biaya tol, biaya bensin, saldo e-money, dsb.
  var BUDGET_POS = ['Penginapan', 'Sewa Transport', 'Transport Umum', 'Uang Saku', 'Kas Kecil', 'BBM & Tol', 'E-Money', 'Operasional Lain'];
  function sppdBudget(eventId) {
    var s = getSppd(eventId);
    return (s.budget || []).slice();
  }
  function saveSppdBudgetItem(eventId, item) {
    var s = getSppd(eventId);
    s.budget = s.budget || [];
    if (item.id) {
      var i = s.budget.findIndex(function (b) { return b.id === item.id; });
      if (i > -1) { s.budget[i] = item; }
    } else {
      item.id = A.uid();
      item.alokasi = Number(item.alokasi) || 0;
      s.budget.push(item);
    }
    /* wallet tujuan alokasi: komponen 'E-Money' otomatis wallet E-Money,
       komponen lain mengikuti pilihan user (default Kas). */
    s.budget.forEach(function (b) { b.wallet = budgetWallet(b.kategori, b.wallet); });
    saveSppd(s);
  }
  function deleteSppdBudgetItem(eventId, id) {
    var s = getSppd(eventId);
    s.budget = (s.budget || []).filter(function (b) { return b.id !== id; });
    saveSppd(s);
  }
  function budgetTotal(eventId) {
    return sppdBudget(eventId).reduce(function (a, b) { return a + (Number(b.alokasi) || 0); }, 0);
  }

  /* realisasi otomatis per komponen SPPD (tersinkron dengan input kas).
     Aturan: expense kategori dicocokkan ke komponen (alias Akomodasi->Penginapan);
     transport sewa->'Sewa Transport', umum->'Transport Umum', pribadi & BBM/Tol expense -> 'BBM & Tol';
     uang saku / kas kecil dari expense kategori sesuai; sisa expense -> 'Operasional Lain'.
     Baris 'E-Money' = nilai yang dibayar dari wallet E-Money (info; TIDAK dijumlahkan ke total
     agar tidak dobel hitung dengan pos kategori). */
  function budgetRealisasi(eventId) {
    var s = getSppd(eventId);
    var allocs = {};
    var kets = {};
    var wallets = {};
    (s.budget || []).forEach(function (b) {
      allocs[b.kategori] = (allocs[b.kategori] || 0) + (Number(b.alokasi) || 0);
      if (b.ket && !kets[b.kategori]) { kets[b.kategori] = b.ket; }
      if (!wallets[b.kategori]) { wallets[b.kategori] = budgetWallet(b.kategori, b.wallet); }
    });
    var real = {};
    var emKeluar = 0;
    BUDGET_POS.forEach(function (k) { real[k] = 0; });
    function emCount(w) { return walletKey(w) === 'E-Money'; }
    expenses(eventId).forEach(function (e) {
      var v = Number(e.jumlah) || 0;
      if (emCount(e.wallet)) { emKeluar += v; }
      var k = e.kategori;
      if (k === 'Akomodasi') { k = 'Penginapan'; }
      if (BUDGET_POS.indexOf(k) >= 0 && k !== 'E-Money') { real[k] += v; }
      else { real['Operasional Lain'] += v; }
    });
    transports(eventId).forEach(function (t) {
      var v = Number(t.totalBiaya) || 0;
      if (emCount(t.wallet)) { emKeluar += v; }
      if (t.mode === 'sewa') { real['Sewa Transport'] += v; }
      else if (t.mode === 'umum') { real['Transport Umum'] += v; }
      else { real['BBM & Tol'] += v; }
    });
    kasAdj(eventId).forEach(function (k) {
      var v = Number(k.jumlah) || 0;
      if (emCount(k.wallet) && v < 0) { emKeluar += -v; }
    });
    real['E-Money'] = emKeluar;

    var pos = [];
    BUDGET_POS.forEach(function (k) { pos.push(k); });
    Object.keys(allocs).forEach(function (k) {
      if (pos.indexOf(k) === -1) { pos.push(k); }
    });
    var rows = pos.map(function (k) {
      var alokasi = allocs[k] || 0;
      var realisasi = real[k] || 0;
      return {
        kategori: k, alokasi: alokasi, realisasi: realisasi, sisa: alokasi - realisasi,
        ket: kets[k] || '', wallet: budgetWallet(k, wallets[k])
      };
    });
    var totalAlokasi = rows.reduce(function (a, r) { return a + r.alokasi; }, 0);
    var totalRealisasi = rows.filter(function (r) { return r.kategori !== 'E-Money'; })
      .reduce(function (a, r) { return a + r.realisasi; }, 0);
    var totalSisa = rows.filter(function (r) { return r.kategori !== 'E-Money'; })
      .reduce(function (a, r) { return a + r.sisa; }, 0);
    /* rekap alokasi per wallet tujuan (dari kolom Wallet di Rincian Alokasi) */
    var perWallet = WALLETS.map(function (w) { return { wallet: w, alokasi: 0, realisasi: 0 }; });
    rows.forEach(function (r) {
      var t = perWallet.find(function (x) { return x.wallet === r.wallet; });
      if (t) { t.alokasi += r.alokasi; t.realisasi += r.realisasi; }
    });
    var danaAwal = Number(s.danaAwal) || 0;
    return {
      rows: rows, totalAlokasi: totalAlokasi, totalRealisasi: totalRealisasi, totalSisa: totalSisa,
      perWallet: perWallet,
      danaAwal: danaAwal, selisihDanaAwal: totalAlokasi - danaAwal
    };
  }

  /* ============================================================
     NEW: SPPD Wizard (6 steps) — single SPPD per event
     Mirrors Supabase schema: sppd_header + child tables
     All linked by eventId
     ============================================================ */

  /* Isi wizard baru dari data yang sudah ada: form lama, event, profil
     perusahaan default. Dipanggil sekali saat record wizard dibuat. */
  function seedWizardFromLegacy(w, eventId) {
    var s = load().sppd.find(function (x) { return x.eventId === eventId; });
    var ev = getEvent(eventId);
    var P = settings().sppdProfile;
    if (s) {
      ['noSurat', 'tanggalTerbit', 'tujuan', 'kegiatan', 'instansi', 'status', 'catatan']
        .forEach(function (k) { if (s[k]) { w[k] = s[k]; } });
      if (Number(s.danaAwal) > 0) { w.danaAwal = Number(s.danaAwal); }
      if (Number(s.realisasi) > 0) { w.realisasi = Number(s.realisasi); }
      if (s.tampilkanRealisasi) { w.tampilkanRealisasi = true; }
    }
    if (ev) {
      if (!w.kota) { w.kota = ev.lokasi || ''; }
      if (!w.tglBerangkat) { w.tglBerangkat = ev.tanggalMulai || ''; }
      if (!w.tglKembali) { w.tglKembali = ev.tanggalSelesai || ''; }
      if (!w.tujuan) { w.tujuan = ev.lokasi || ''; }
      if (!w.kegiatan) { w.kegiatan = ev.nama || ''; }
    }
    if (P && typeof P === 'object') { w.perusahaan = Object.assign({}, w.perusahaan, P); }
  }

  function getSppdWizard(eventId) {
    var db = load();
    if (!db.sppdWizard) db.sppdWizard = {};
    var w = db.sppdWizard[eventId];
    if (!w) {
      w = newSppdWizard();
      seedWizardFromLegacy(w, eventId);
      db.sppdWizard[eventId] = w;
      save();
    }
    return w;
  }

  function saveSppdWizard(eventId, data) {
    var db = load();
    if (!db.sppdWizard) db.sppdWizard = {};
    db.sppdWizard[eventId] = data;
    save();
  }

  function deleteSppdWizard(eventId) {
    var db = load();
    if (db.sppdWizard) {
      delete db.sppdWizard[eventId];
      save();
    }
  }

  /* Sinkron wizard ⇄ form lama (SSOT ganda untuk field meta).
     ponytail: field meta (noSurat, status, danaAwal, dst) hanya punya input
     di FORM LAMA — jadi form lama menang bila terisi; wizard hanya mengisi
     saat form lama masih kosong. Nilai kosong TIDAK PERNAH menimpa isi
     (bug lama: wizard default kosong menghapus Nomor Surat/Status/Dana Awal).
     Bila nanti wizard dapat input sendiri untuk field tertentu, ubah arah
     per-field di sini (wizard menang). */
  function syncWizardToLegacy(eventId) {
    var w = getSppdWizard(eventId);
    var s = getSppd(eventId);

    ['noSurat', 'tanggalTerbit', 'tujuan', 'kegiatan', 'instansi', 'catatan'].forEach(function (k) {
      if (s[k]) { w[k] = s[k]; } else if (w[k]) { s[k] = w[k]; }
    });
    /* kosakata status pakai pilihan form lama; 'konsep' (data lama) → draft */
    if (s.status) { w.status = s.status; }
    else if (w.status) { s.status = w.status === 'konsep' ? 'draft' : w.status; }
    ['danaAwal', 'realisasi'].forEach(function (k) {
      if (Number(s[k]) > 0) { w[k] = Number(s[k]); } else if (Number(w[k]) > 0) { s[k] = Number(w[k]); }
    });
    if (s.tampilkanRealisasi) { w.tampilkanRealisasi = true; }
    else if (w.tampilkanRealisasi) { s.tampilkanRealisasi = true; }

    saveSppd(s);
    saveSppdWizard(eventId, w);
  }

  /* Build unified data object for print renderer (A.sppdPrintForm) */
  function getSppdPrintData(eventId) {
    var w = getSppdWizard(eventId);
    var ev = getEvent(eventId);
    var s = getSppd(eventId);
    var dc = danaCair(eventId);
    var fin = financeSummary(eventId);
    
    return {
      id: eventId,
      eventNama: ev ? ev.nama : '',
      eventLokasi: ev ? ev.lokasi : '',
      // Perusahaan
      perusahaan: w.perusahaan,
      // Header
      pemberiTugas: w.pemberiTugas,
      departemen: w.departemen,
      tglBerangkat: w.tglBerangkat,
      jamBerangkat: w.jamBerangkat,
      tglKembali: w.tglKembali,
      ketKembali: w.ketKembali,
      transport: w.transport,
      kota: w.kota,
      target: w.target,
      // Biaya umum
      biaya: w.biaya,
      // SPJ - 4 daftar independen
      petugas: w.petugas,
      uangSaku: w.uangSaku,
      penginapan: w.penginapan,
      konsumsi: w.konsumsi,
      // TTD
      sign: w.ttd,
      // Legacy compat
      danaAwal: w.danaAwal || s.danaAwal,
      realisasi: w.realisasi || s.realisasi,
      status: s.status || w.status,
      noSurat: w.noSurat || s.noSurat,
      // Alokasi (from legacy budget)
      budget: sppdBudget(eventId),
      // Dana cair
      danaCair: dc,
      // Finance summary
      finance: fin
    };
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

  /* ---------- checklist 24 item (template statis) ---------- */
  function ensureChecklistItems(eventId) {
    var db = load();
    if (!db.checklistTemplates || !db.checklistTemplates.length) db.checklistTemplates = builtinChecklist();
    if (!db.checklistItems) db.checklistItems = [];
    var has = db.checklistItems.some(function (c) { return c.eventId === eventId; });
    if (has) { return; }
    db.checklistTemplates.forEach(function (tpl) {
      db.checklistItems.push({ id: A.uid(), userId: 'u1', eventId: eventId, templateId: tpl.id, status: 'todo', updatedAt: '' });
    });
    save();
  }
  function checklistTemplates() { return load().checklistTemplates; }
  function checklistItems(eventId) {
    ensureChecklistItems(eventId);
    var tpls = checklistTemplates();
    function idx(tplId) {
      for (var i = 0; i < tpls.length; i++) { if (tpls[i].id === tplId) return i; }
      return 999;
    }
    return (load().checklistItems || []).filter(function (c) { return c.eventId === eventId; })
      .sort(function (a, b) { return idx(a.templateId) - idx(b.templateId); });
  }
  function checklistDone(eventId) {
    return checklistItems(eventId).filter(function (c) { return c.status === 'selesai'; }).length;
  }
  function saveChecklistItem(c) {
    var arr = load().checklistItems;
    var i = arr.findIndex(function (x) { return x.id === c.id; });
    if (i > -1) arr[i] = c; else arr.push(c);
    save();
  }

  /* ---------- master barang dibawa (aksesor) ---------- */
  function prepItemByTemplate(eventId, templateId) {
    return prepItems(eventId).find(function (p) { return p.templateId === templateId; });
  }
  function itemCats() {
    return (load().itemCats || []).slice().sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); });
  }
  function itemTemplates() {
    return (load().itemTemplates || []).slice().sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); });
  }
  function saveItemCat(c) {
    var arr = load().itemCats;
    var i = arr.findIndex(function (x) { return x.id === c.id; });
    if (i > -1) arr[i] = c;
    else { c.id = A.uid(); c.userId = c.userId || 'u1'; c.urutan = arr.length + 1; arr.push(c); }
    save();
  }
  function saveItemTemplate(t) {
    var arr = load().itemTemplates;
    var i = arr.findIndex(function (x) { return x.id === t.id; });
    if (i > -1) arr[i] = t;
    else { t.id = A.uid(); t.userId = t.userId || 'u1'; t.urutan = arr.length + 1; arr.push(t); }
    save();
  }
  function deleteItemCat(id) {
    var db = load();
    db.itemCats = (db.itemCats || []).filter(function (c) { return c.id !== id; });
    db.itemTemplates = (db.itemTemplates || []).filter(function (t) { return t.catId !== id; });
    save();
  }
  function deleteItemTemplate(id) {
    load().itemTemplates = (load().itemTemplates || []).filter(function (t) { return t.id !== id; });
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
    if (_finCache[eventId]) { return _finCache[eventId]; }
    var sppd = getSppd(eventId);
    var danaAwal = Number(sppd.danaAwal) || 0;
    var totalSales = sales(eventId).reduce(function (a, s) { return a + (Number(s.total) || 0); }, 0);
    var totalTransport = transports(eventId).reduce(function (a, t) { return a + (Number(t.totalBiaya) || 0); }, 0);
    var totalExpense = expenses(eventId).reduce(function (a, e) { return a + (Number(e.jumlah) || 0); }, 0);
    var totalKasAdj = kasAdj(eventId).reduce(function (a, k) { return a + (Number(k.jumlah) || 0); }, 0);
    var pengeluaran = totalTransport + totalExpense;
    var dcs = danaCair(eventId);
    var danaCairTotal = dcs.reduce(function (a, x) { return a + (Number(x.nominal) || 0); }, 0);
    var danaCairAmt = dcs.filter(function (x) { return x.status === 'cair'; })
      .reduce(function (a, x) { return a + (Number(x.nominal) || 0); }, 0);
    var wallets = {};
    WALLETS.forEach(function (w) { wallets[w] = { masuk: 0, keluar: 0 }; });
    function wadd(w, jenis, v) {
      var key = walletKey(w);
      wallets[key] = wallets[key] || { masuk: 0, keluar: 0 };
      wallets[key][jenis] += v;
    }
    sales(eventId).forEach(function (s) { wadd(s.wallet, 'masuk', Number(s.total) || 0); });
    kasAdj(eventId).forEach(function (k) {
      var amt = Number(k.jumlah) || 0;
      wadd(k.wallet, amt >= 0 ? 'masuk' : 'keluar', Math.abs(amt));
    });
    transports(eventId).forEach(function (t) { wadd(t.wallet, 'keluar', Number(t.totalBiaya) || 0); });
    expenses(eventId).forEach(function (e) { wadd(e.wallet, 'keluar', Number(e.jumlah) || 0); });
    var summary = {
      danaAwal: danaAwal, totalSales: totalSales, totalTransport: totalTransport,
      totalExpense: totalExpense, pengeluaran: pengeluaran, totalKasAdj: totalKasAdj,
      saldo: danaAwal + totalSales + totalKasAdj - pengeluaran,
      danaCair: danaCairAmt, danaCairTotal: danaCairTotal, wallets: wallets,
      budget: budgetRealisasi(eventId)
    };
    _finCache[eventId] = summary;
    return summary;
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

  function clearAll() {
    DB = seed();
    save();
  }

  A.store = {
    KEY: KEY, load: load, save: save, exportJSON: exportJSON, importJSON: importJSON, clearAll: clearAll,
    snapshot: snapshot, restore: restore,
    WALLETS: WALLETS, walletKey: walletKey, METODE_TO_WALLET: METODE_TO_WALLET,
    events: events, getEvent: getEvent, saveEvent: saveEvent, deleteEvent: deleteEvent,
    getSppd: getSppd, saveSppd: saveSppd,
    transports: transports, saveTransport: saveTransport, deleteTransport: deleteTransport,
    products: products, saveProduct: saveProduct, deleteProduct: deleteProduct,
    eventProducts: eventProducts, qtyTerjual: qtyTerjual, saveEventProduct: saveEventProduct, removeEventProduct: removeEventProduct,
    sales: sales, saveSale: saveSale, deleteSale: deleteSale,
    expenses: expenses, saveExpense: saveExpense, deleteExpense: deleteExpense,
    kasAdj: kasAdj, saveKasAdj: saveKasAdj, deleteKasAdj: deleteKasAdj,
    danaCair: danaCair, saveDanaCair: saveDanaCair, deleteDanaCair: deleteDanaCair,
    BUDGET_POS: BUDGET_POS, sppdBudget: sppdBudget, saveSppdBudgetItem: saveSppdBudgetItem,
    deleteSppdBudgetItem: deleteSppdBudgetItem, budgetTotal: budgetTotal, budgetRealisasi: budgetRealisasi,
    budgetWallet: budgetWallet,
    // NEW: SPPD Wizard
    newSppdWizard: newSppdWizard, getSppdWizard: getSppdWizard, saveSppdWizard: saveSppdWizard,
    deleteSppdWizard: deleteSppdWizard, syncWizardToLegacy: syncWizardToLegacy,
    getSppdPrintData: getSppdPrintData, SPPD_BIAYA_MAX: SPPD_BIAYA_MAX, SPPD_SPJ_MAX_ROWS: SPPD_SPJ_MAX_ROWS,
    prepItems: prepItems, prepItemsDone: prepItemsDone, prepBiaya: prepBiaya, savePrepItem: savePrepItem, deletePrepItem: deletePrepItem,
    checklistTemplates: checklistTemplates, checklistItems: checklistItems, checklistDone: checklistDone, saveChecklistItem: saveChecklistItem,
    itemCats: itemCats, itemTemplates: itemTemplates, saveItemCat: saveItemCat, saveItemTemplate: saveItemTemplate,
    deleteItemCat: deleteItemCat, deleteItemTemplate: deleteItemTemplate, prepItemByTemplate: prepItemByTemplate,
    epAnomali: epAnomali, berangkatOk: berangkatOk, pulangOk: pulangOk, stokSisa: stokSisa,
    milestoneAttachments: milestoneAttachments, saveMilestoneAttachment: saveMilestoneAttachment, deleteMilestoneAttachment: deleteMilestoneAttachment,
    milestones: milestones, saveMilestone: saveMilestone, deleteMilestone: deleteMilestone, ensureDefaultMilestones: ensureDefaultMilestones,
    financeSummary: financeSummary, settings: settings, saveSettings: saveSettings, globalReports: globalReports,
    hasCloud: hasCloud, onConn: onConn, remoteLoad: remoteLoad
  };
})(window.SPT);
