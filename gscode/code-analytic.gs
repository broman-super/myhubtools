// 1. MASUKIN API KEY GEMINI LU DI BAWAH INI
const GEMINI_API_KEY = 'AIzaSyBkaZBJpN3RXGDDcoEh6FrUNSR1KBbBO6o';

// ==========================================
// TIMEZONE CONFIGURATION - FORCE GMT+7
// ==========================================
const TIMEZONE = "Asia/Jakarta"; // GMT+7 - DIPAKSA PAKAI WAKTU JAKARTA

// ==========================================
// E2: GAS CacheService (5 menit)
// ==========================================
function getCachedDashboardData() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('dash_data_v2');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  var data = getAllDashboardData();
  try { cache.put('dash_data_v2', JSON.stringify(data), 300); } catch(e) {}
  return data;
}

// ==========================================
// E3: Error Retry Logic (exponential backoff)
// ==========================================
function fetchWithRetry(url, options, maxRetries) {
  maxRetries = maxRetries || 3;
  for (var i = 0; i < maxRetries; i++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() < 500) return response;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      Utilities.sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}

function doGet(e) {
  var action = e.parameter.action;

  // 1. Ambil Semua Data — BACA DARI SUPABASE (bukan sheet). dengan cache
  if (action === 'getSalesData') {
    var result = getCachedDashboardData();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3. Simpan Target — LANGSUNG ke Supabase settings
  if (action === 'saveTarget') {
    try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}
    var target = e.parameter.value;
    supabaseRequest_('post', '/rest/v1/settings?on_conflict=%22Key%22', [{ 'Key': 'Target', 'Value': target }]);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3.5. Tambah Biaya Baru — LANGSUNG ke Supabase biaya
  if (action === 'addBiaya') {
    try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}
    var tanggal = canonicalizeDate_(e.parameter.tanggal); // d/m/yyyy → yyyy-MM-dd (kolom DATE Postgres)
    var kategori = e.parameter.kategori;
    var nominal = parseFloat(e.parameter.nominal) || 0;
    supabaseRequest_('post', '/rest/v1/biaya', [{ 'Tanggal': tanggal, 'Kategori Biaya': kategori, 'Nominal': nominal }]);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3.6. Update Biaya (edit) — LANGSUNG ke Supabase biaya
  if (action === 'updateBiaya') {
    try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}
    var id = e.parameter.id;
    if (!id) throw new Error('id biaya kosong');
    var tanggal = canonicalizeDate_(e.parameter.tanggal);
    var kategori = e.parameter.kategori;
    var nominal = parseFloat(e.parameter.nominal) || 0;
    supabaseRequest_('patch', '/rest/v1/biaya?id=eq.' + encodeURIComponent(id),
      [{ 'Tanggal': tanggal, 'Kategori Biaya': kategori, 'Nominal': nominal }]);
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3.7. Hapus Biaya — LANGSUNG ke Supabase biaya
  if (action === 'deleteBiaya') {
    try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}
    var id = e.parameter.id;
    if (!id) throw new Error('id biaya kosong');
    supabaseRequest_('delete', '/rest/v1/biaya?id=eq.' + encodeURIComponent(id));
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 4. TAMBAHKAN INI: Agar Iframe di ReynaHub Bisa Menampilkan File GitHub
  return HtmlService.createHtmlOutput("API ReynaHub V2 Active")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// BACA SEMUA DATA DARI SUPABASE (GAS = backend murni, tanpa sheet)
// Format kembalian sama seperti dulu: {transaksi, produk, biaya, settings}
// ==========================================
function getAllDashboardData() {
  var transaksi = JSON.parse(supabaseRequest_('post', '/rest/v1/rpc/get_all_transaksi', {}).getContentText());
  // Buang kolom teknis (id, dedupe_key) — mengganggu getKeyOfRow & mesin lama
  transaksi = (Array.isArray(transaksi) ? transaksi : []).map(function(r) {
    var clean = {};
    for (var k in r) {
      if (k !== 'id' && k !== 'dedupe_key') clean[k] = r[k];
    }
    return clean;
  });
  return {
    transaksi: transaksi,
    produk: JSON.parse(supabaseRequest_('get', '/rest/v1/produk?select=*&order=id').getContentText()),
    biaya: JSON.parse(supabaseRequest_('get', '/rest/v1/biaya?select=*&order=id').getContentText()),
    settings: JSON.parse(supabaseRequest_('get', '/rest/v1/settings?select=*&order=id').getContentText())
  };
}

// ==========================================
// FUNGSI GEMINI AI (SUDAH DIPERBAIKI)
// ==========================================
function getAnalysisFromGemini(promptText) {
  // INI KODE PEMBERSIHNYA (.trim() buat buang spasi nyelip)
  var cleanApiKey = GEMINI_API_KEY.trim();

  // Mempertahankan model gemini-1.5-flash
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + cleanApiKey;

  // PERBAIKAN: AI sekarang menerima "promptText" dari Web (yang udah berisi data Net Sales, Target, Opex, dll)
  var payload = {
    "contents": [{
      "parts": [{
        "text": promptText
      }]
    }]
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    var response = fetchWithRetry(url, options);
    var data = JSON.parse(response.getContentText());

    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return "Pesan dari Gemini: " + response.getContentText();
    }
  } catch (e) {
    return "Error di Apps Script: " + e.message;
  }
}

// ==========================================
// NORMALISASI BARIS UPLOAD → PAYLOAD RPC (anti-wipe)
// Nilai kosong dikirim sebagai null → RPC COALESCE mempertahankan
// nilai existing di Supabase (tidak menimpa kolom yang tak ada di file).
// ==========================================
function normalizeUploadRow_(r) {
  if (!r['Tanggal']) return null; // baris tanpa tanggal = invalid, dilewati
  function v(x) { var s = String(x == null ? '' : x).trim(); return s === '' ? null : s; }
  var q = parseInt(String(r['Kuantitas'] == null ? '' : r['Kuantitas']).replace(/[^0-9]/g, ''), 10);
  var h = parseFloat(String(r['Total Harga'] == null ? '' : r['Total Harga']).replace(/[^0-9,-]/g, '').replace(/,/g, '.'));
  return {
    'Tanggal': r['Tanggal'],
    'Nomor #': v(r['Nomor #']),
    'Tipe Transaksi': v(r['Tipe Transaksi']),
    'Nama Pelanggan': v(r['Nama Pelanggan']),
    'Nama Kategori Pelanggan': v(r['Nama Kategori Pelanggan']),
    'Nama Barang': v(r['Nama Barang']),
    'Kuantitas': isNaN(q) ? null : q,
    'Total Harga': isNaN(h) ? null : h,
    'Penjualan': v(r['Penjualan']),
    dedupe_key: hitungDedupeKey_(r)
  };
}

// ==========================================
// ENDPOINT POST UNTUK BULK UPSERT TRANSAKSI
// ==========================================
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    if (action === 'getAnalysis') {
      var context = requestData.context || "";
      var analysisText = getAnalysisFromGemini(context);
      var hasilGemini = { analysis: analysisText };
      return ContentService.createTextOutput(JSON.stringify(hasilGemini))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'bulkUpsertTransactions') {
      var rows = requestData.rows;
      if (!rows || !Array.isArray(rows)) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Data Excel kosong atau format tidak valid!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // === E4: Validasi Data Backend ===
      var validationErrors = [];
      rows.forEach(function(r, idx) {
        var rowNum = idx + 2;
        var tgl = r.Tanggal || r.date || '';
        var nominal = parseFloat(String(r['Total Harga'] || r.Penjualan || r.Harga || r.Nilai || 0).replace(/[^0-9,-]/g, '').replace(/,/g, '.')) || 0;
        var qty = parseInt(String(r.Kuantitas || r.Qty || r.Jumlah || 0).replace(/[^0-9]/g, '')) || 0;
        if (qty < 0) validationErrors.push('Baris ' + rowNum + ': Kuantitas negatif (' + qty + ')');
        if (tgl && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(tgl).trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(String(tgl).trim())) {
          if (!isNaN(Date.parse(String(tgl)))) {} else {
            validationErrors.push('Baris ' + rowNum + ': Format tanggal tidak dikenal (' + tgl + ')');
          }
        }
      });
      if (validationErrors.length > 0) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "warning",
          message: validationErrors.join('; '),
          errors: validationErrors,
          proceed: true
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Invalidate cache karena data berubah
      try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}

      // Normalisasi → langsung tulis ke Supabase via RPC bulk_upsert_transaksi (service_role)
      var supabaseRows = rows.map(normalizeUploadRow_).filter(Boolean);
      if (supabaseRows.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Tidak ada baris valid (semua tanpa Tanggal)."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var mres = supabaseRequest_('post', '/rest/v1/rpc/bulk_upsert_transaksi', { rows: supabaseRows });
      var hasil = JSON.parse(mres.getContentText());
      // PostgREST kadang membungkus hasil RPC scalar sebagai array
      if (Array.isArray(hasil)) {
        if (hasil.length === 1 && hasil[0] && typeof hasil[0] === 'object' && 'bulk_upsert_transaksi' in hasil[0]) hasil = hasil[0].bulk_upsert_transaksi;
        else if (hasil.length === 1) hasil = hasil[0];
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: hasil.status || "success",
        added: hasil.added || 0,
        updated: hasil.updated || 0,
        skipped: hasil.skipped || 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Action tidak dikenali oleh backend!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
