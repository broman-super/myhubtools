// ============================================================
// MIGRATE GOOGLE SHEET → SUPABASE (FASE 1 — SATU KALI)
// Dipanggil manual dari editor Apps Script (bukan oleh web).
// Helper sheet (ambilDataDariSheet, formatDate) ADA DI FILE INI
// sendiri — migrasi bisa jalan tanpa bergantung code-analytic.gs
// yang kini murni backend Supabase.
// ============================================================

// ------------------------------------------------------------
// HELPER BACA SHEET (hanya untuk migrasi sekali-pakai)
// ------------------------------------------------------------
function ambilDataDariSheet(ss, namaSheet) {
  var sheet = ss.getSheetByName(namaSheet);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return h.toString().trim(); });
  var result = [];
  var tz = ss.getSpreadsheetTimeZone();

  function normHeader(h) {
    return (h || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function isDateHeader(h) {
    var n = normHeader(h);
    if (n === "tanggal" || n === "date") return true;
    return n.indexOf("tanggal") !== -1;
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] === "" && row[1] === "") continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];

      if (isDateHeader(key)) {
        if (val instanceof Date) {
          obj[key] = Utilities.formatDate(val, tz, "yyyy-MM-dd");
        } else if (val !== null && val !== "") {
          var normalized = formatDate(val);
          obj[key] = normalized || val.toString().trim();
        } else {
          obj[key] = "";
        }
      } else {
        obj[key] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

function formatDate(d) {
  if (d === null || d === undefined) return "";

  var tz = TIMEZONE;
  try {
    tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  } catch (e) {}

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function getMonthMap() {
    return {
      'januari': 1, 'pebruari': 2, 'februari': 2, 'maret': 3, 'april': 4,
      'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8, 'september': 9,
      'oktober': 10, 'november': 11, 'desember': 12,
      'january': 1, 'february': 2, 'march': 3, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'october': 10, 'december': 12,
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7,
      'aug': 8, 'ags': 8, 'agu': 8, 'sep': 9, 'oct': 10, 'okt': 10,
      'nov': 11, 'dec': 12, 'des': 12
    };
  }

  function excelSerialToYMD(serial) {
    if (serial === null || serial === undefined || serial === "") return "";
    var s = parseFloat(serial);
    if (isNaN(s)) return "";
    var day = Math.floor(s);
    if (day <= 0) return "";
    var date = new Date((day - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return "";
    return date.getUTCFullYear() + "-" + pad2(date.getUTCMonth() + 1) + "-" + pad2(date.getUTCDate());
  }

  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    return Utilities.formatDate(d, tz, "yyyy-MM-dd");
  }

  if (typeof d === 'number') {
    return excelSerialToYMD(d);
  }

  var s = d.toString().trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  var isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];

  if (/^\d+(\.\d+)?$/.test(s)) {
    var fromSerial = excelSerialToYMD(s);
    if (fromSerial) return fromSerial;
  }

  var dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    var dd = parseInt(dmyMatch[1], 10);
    var mm = parseInt(dmyMatch[2], 10);
    var yy = parseInt(dmyMatch[3], 10);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return yy + "-" + pad2(mm) + "-" + pad2(dd);
    }
  }

  var monthMap = getMonthMap();
  var strLow = s.toLowerCase();

  var dmyWord = strLow.match(/^(\d{1,2})[\s\-]+([a-z]+)[\s\-]+(\d{4})/);
  if (dmyWord) {
    var dDay = parseInt(dmyWord[1], 10);
    var dMon = monthMap[dmyWord[2]];
    var dYear = parseInt(dmyWord[3], 10);
    if (dDay >= 1 && dDay <= 31 && dMon && dYear > 1900) {
      return dYear + "-" + pad2(dMon) + "-" + pad2(dDay);
    }
  }

  var mdyWord = strLow.match(/^([a-z]+)[\s\-]+(\d{1,2})[,\s\-]+(\d{4})/);
  if (mdyWord) {
    var mMon = monthMap[mdyWord[1]];
    var mDay = parseInt(mdyWord[2], 10);
    var mYear = parseInt(mdyWord[3], 10);
    if (mDay >= 1 && mDay <= 31 && mMon && mYear > 1900) {
      return mYear + "-" + pad2(mMon) + "-" + pad2(mDay);
    }
  }

  var parts = s.split(/[^0-9]/);
  var nums = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== "" && !isNaN(parseInt(parts[i], 10))) {
      nums.push(parseInt(parts[i], 10));
    }
  }
  if (nums.length >= 3) {
    if (nums[0] >= 1 && nums[0] <= 31 && nums[1] >= 1 && nums[1] <= 12 && nums[2] > 1000) {
      return nums[2] + "-" + pad2(nums[1]) + "-" + pad2(nums[0]);
    }
    if (nums[0] > 1000 && nums[1] >= 1 && nums[1] <= 12 && nums[2] >= 1 && nums[2] <= 31) {
      return nums[0] + "-" + pad2(nums[1]) + "-" + pad2(nums[2]);
    }
  }

  return s;
}

var __MIGRATE_BATCH = 500;

// ------------------------------------------------------------
// SETUP SATU KALI (tanpa parameter — tombol Run Apps Script
// tidak bisa mengisi argumen).
// 1) Tempel 2 nilai di __SUPABASE_CONFIG__ di bawah ini.
// 2) Run fungsi `setupSupabaseProps` sekali.
// 3) Nilai tersimpan di Script Properties, lalu blok ini
//    OTOMATIS dikosongkan (kunci rahasia tidak tersisa di file).
// ------------------------------------------------------------
var __SUPABASE_CONFIG__ = {
  SUPABASE_URL: 'https://ciukvojsknsdnkysbpjl.supabase.co',       // ← tempel Project URL di sini
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdWt2b2pza25zZG5reXNicGpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA4Mzc0OCwiZXhwIjoyMTAxNjU5NzQ4fQ.Qh7rmC0ExaYuiaTcLrCyag_2cW4qxdJWyzIz4FwQQfY'    // ← tempel service_role key di sini
};

function setupSupabaseProps() {
  var props = PropertiesService.getScriptProperties();
  var url = String(__SUPABASE_CONFIG__.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  var key = String(__SUPABASE_CONFIG__.SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) throw new Error('Isi __SUPABASE_CONFIG__ (SUPABASE_URL & SERVICE_ROLE_KEY) dulu.');
  props.setProperty('SUPABASE_URL', url);
  props.setProperty('SERVICE_ROLE_KEY', key);
  __SUPABASE_CONFIG__.SUPABASE_URL = '';
  __SUPABASE_CONFIG__.SERVICE_ROLE_KEY = '';
  return {
    SUPABASE_URL_SET: !!props.getProperty('SUPABASE_URL'),
    SERVICE_ROLE_SET: !!props.getProperty('SERVICE_ROLE_KEY')
  };
}

function supabaseCreds_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Belum set kredensial. Isi __SUPABASE_CONFIG__ lalu Run setupSupabaseProps dulu.');
  return { baseUrl: url, apiKey: key };
}

function supabaseRequest_(method, path, payload) {
  var c = supabaseCreds_();
  var options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      'apikey': c.apiKey,
      'Authorization': 'Bearer ' + c.apiKey
    }
  };
  if (payload) {
    options.contentType = 'application/json';
    // RPC (/rpc/) butuh body balasan (get_all_transaksi, bulk_upsert_transaksi).
    // Tabel biasa: return=minimal supaya ringan.
    if (path.indexOf('/rpc/') === -1) {
      options.headers['Prefer'] = (path.indexOf('on_conflict=') !== -1) ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal';
    }
    options.payload = JSON.stringify(payload);
  }
  var res = UrlFetchApp.fetch(c.baseUrl + path, options);
  if (res.getResponseCode() >= 300) {
    throw new Error('Supabase ' + res.getResponseCode() + ' ' + path + ': ' + res.getContentText());
  }
  return res;
}

// ------------------------------------------------------------
// DEDUPE KEY — mirror persis getSheetRowKey di code-analytic.gs
// (pk bila ada; kalau tidak, composite tgl_pel_barang_qty_hrg).
// ------------------------------------------------------------
function hitungDedupeKey_(row) {
  function getVal(cands) {
    for (var i = 0; i < cands.length; i++) {
      for (var key in row) {
        if (key.toLowerCase() === cands[i].toLowerCase() && row[key] !== '' && row[key] !== null && row[key] !== undefined) {
          return row[key].toString().trim();
        }
      }
    }
    return '';
  }
  var pkVal = getVal(['No. Transaksi', 'No. Faktur', 'No. Invoice', 'No', 'ID', 'No. Pesanan', 'Invoice', 'ID Transaksi', 'Nomor', 'Nomor #', 'No #', 'No. #']);
  var barVal = getVal(['Nama Barang', 'Barang', 'Produk', 'Item']).toUpperCase();
  if (pkVal) return barVal ? pkVal + '_' + barVal : pkVal;
  var tgl = canonicalizeDate_(getVal(['Tanggal', 'Date']));
  var pel = getVal(['Nama Pelanggan', 'Pelanggan', 'Customer']).toUpperCase();
  var qty = parseInt(getVal(['Kuantitas', 'Qty', 'Jumlah', 'Quantity']).replace(/[^0-9]/g, '')) || 0;
  var hrg = parseFloat(getVal(['Total Harga', 'Penjualan', 'Harga', 'Nilai', 'Amount']).replace(/[^0-9,-]/g, '').replace(/,/g, '.')) || 0;
  return tgl + '_' + pel + '_' + barVal + '_' + qty + '_' + hrg;
}

// kanonikalkan tanggal ke yyyy-MM-dd: import (sheet, sudah ISO) dan upload harian
// (d/m/yyyy) menghasilkan dedupe_key yang SAMA → RPC bulk_upsert tidak menduplikasi.
function canonicalizeDate_(v) {
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    var p = function(n) { return (n.length < 2 ? '0' : '') + n; };
    return m[3] + '-' + p(m[2]) + '-' + p(m[1]);
  }
  return s;
}

function angka_(v) {
  if (typeof v === 'number') return v;
  return parseFloat(String(v || 0).replace(/[^0-9,-]/g, '').replace(/,/g, '.')) || 0;
}

// ------------------------------------------------------------
// NORMALISASI PER TABEL
// ------------------------------------------------------------
function normalizeTransaksi_(r) {
  if (!r['Tanggal']) return null; // baris tanpa tanggal = data invalid, dilewati
  var row = {
    'Tanggal': r['Tanggal'] || '',
    'Nomor #': r['Nomor #'] || r['No. Transaksi'] || '',
    'Tipe Transaksi': r['Tipe Transaksi'] || r['Tipe'] || '',
    'Nama Pelanggan': r['Nama Pelanggan'] || '',
    'Nama Kategori Pelanggan': r['Nama Kategori Pelanggan'] || '',
    'Nama Barang': r['Nama Barang'] || '',
    'Kuantitas': parseInt(String(r['Kuantitas'] || r['Qty'] || 0).replace(/[^0-9]/g, '')) || 0,
    'Total Harga': angka_(r['Total Harga'] || r['Penjualan'] || r['Harga'] || r['Nilai'] || 0),
    'Penjualan': angka_(r['Penjualan'] || r['Total Harga'] || 0)
  };
  row.dedupe_key = hitungDedupeKey_(row);
  return row;
}

function normalizeProduk_(r) {
  return {
    'Nama Barang': r['Nama Barang'] || '',
    'Kode Series': r['Kode Series'] || '',
    'Nama Series': r['Nama Series'] || '',
    'Kategori Produk': r['Kategori Produk'] || '',
    // ponytail: sheet selama ini menaruh HPP di kolom 'Kategori Produk' (kolom HPP kosong).
    // Kolom HPP/Modal tetap menang bila terisi; fallback ini menyelamatkan data tanpa memindah 263 baris manual.
    'HPP': angka_(r['HPP'] || r['Modal'] || r['Kategori Produk'] || 0)
  };
}

function normalizeBiaya_(r) {
  return {
    'Tanggal': r['Tanggal'] || '',
    'Kategori Biaya': r['Kategori Biaya'] || '',
    'Nominal': angka_(r['Nominal'] || 0)
  };
}

function normalizeSettings_(r) {
  return { 'Key': r['Key'] || '', 'Value': r['Value'] || '' };
}

// ------------------------------------------------------------
// KIRIM BATCH
// ------------------------------------------------------------
function sendBatches_(path, rows, normalizeFn) {
  var clean = [];
  rows.forEach(function (r) {
    var n = normalizeFn(r);
    if (n && (n['Nama Barang'] || n['Nomor #'] || n['No. Transaksi'] || n['Key'] || n['Tanggal'])) clean.push(n);
  });
  if (clean.length && clean[0].dedupe_key !== undefined) {
    var seen = {};
    var dup = 0;
    clean.forEach(function (n) { if (seen[n.dedupe_key]) dup++; seen[n.dedupe_key] = 1; });
    Logger.log('Info: baris ber-dedupe_key kembar (baris ke-2+): %s dari %s', dup, clean.length);
  }
  var total = clean.length;
  var done = 0;
  for (var i = 0; i < total; i += __MIGRATE_BATCH) {
    var chunk = clean.slice(i, i + __MIGRATE_BATCH);
    supabaseRequest_('post', path, chunk);
    done += chunk.length;
    Logger.log('Import %s: %s/%s baris', path, done, total);
  }
  return total;
}

// ------------------------------------------------------------
// IMPORT UTAMA — jalankan setelah SQL Fase 0 sukses
// ------------------------------------------------------------
function migrateToSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Reset SEMUA tabel dulu (delete all) supaya import idempoten.
  // Tanpa reset, tiap run migrasi MENAMBAH duplikat (sendBatches_ = INSERT polos).
  ['transaksi', 'produk', 'biaya', 'settings'].forEach(function (t) {
    supabaseRequest_('delete', '/rest/v1/' + t + '?id=gte.0');
  });
  var hasil = {
    transaksi: sendBatches_('/rest/v1/transaksi', ambilDataDariSheet(ss, 'Transaksi'), normalizeTransaksi_),
    produk:    sendBatches_('/rest/v1/produk', ambilDataDariSheet(ss, 'Produk'), normalizeProduk_),
    biaya:     sendBatches_('/rest/v1/biaya', ambilDataDariSheet(ss, 'Biaya'), normalizeBiaya_),
    settings:  sendBatches_('/rest/v1/settings?on_conflict=%22Key%22', ambilDataDariSheet(ss, 'Settings'), normalizeSettings_)
  };
  Logger.log('SELESAI. Hasil: %s', JSON.stringify(hasil));
  return hasil;
}

// ------------------------------------------------------------
// ------------------------------------------------------------
// Hapus SEMUA baris produk di Supabase (service_role, melewati RLS).
// Jalankan SEKALI sebelum migrateToSupabase() agar impor ulang bersih
// (tanpa duplikat dari import HPP=0 sebelumnya).
// ponytail: sekali pakai, boleh dihapus setelah HPP beres.
// ------------------------------------------------------------
function resetProdukSupabase() {
  var res = supabaseRequest_('delete', '/rest/v1/produk?id=gte.0'); // WHERE wajib ada di PostgREST
  Logger.log('produk dikosongkan, code: %s', res.getResponseCode());
  return { status: 'ok', code: res.getResponseCode() };
}

function cekCountSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tables = ['transaksi', 'produk', 'biaya', 'settings'];
  var sheetNames = ['Transaksi', 'Produk', 'Biaya', 'Settings'];
  var out = {};
  for (var i = 0; i < tables.length; i++) {
    var sheetRows = Math.max(0, ambilDataDariSheet(ss, sheetNames[i]).length);
    out[tables[i]] = { sheet: sheetRows };
  }
  out.transaksi.supabase = countREST_('/rest/v1/transaksi');
  out.produk.supabase = countREST_('/rest/v1/produk');
  out.biaya.supabase = countREST_('/rest/v1/biaya');
  out.settings.supabase = countREST_('/rest/v1/settings');
  Logger.log('Perbandingan: %s', JSON.stringify(out));
  return out;
}

function countREST_(path) {
  var c = supabaseCreds_();
  var options = {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'apikey': c.apiKey,
      'Authorization': 'Bearer ' + c.apiKey,
      'Range': '0-0',
      'Prefer': 'count=exact'
    }
  };
  var res = UrlFetchApp.fetch(c.baseUrl + path + '?select=id', options);
  var cr = res.getHeaders()['Content-Range'] || '';
  var m = cr.match(/\/(\d+)$/);
  return m ? parseInt(m[1], 10) : -1;
}

// ------------------------------------------------------------
// DIAGNOSTIK — cek project mana yang dihubungi & tabel apa yang
// terlihat via REST. Run lalu salin output (View > Log) ke sini.
// ------------------------------------------------------------
function cekKoneksiSupabase() {
  var c = supabaseCreds_();
  var out = { baseUrl: c.baseUrl, tables: {} };
  var options = {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'apikey': c.apiKey,
      'Authorization': 'Bearer ' + c.apiKey,
      'Range': '0-0',
      'Prefer': 'count=exact'
    }
  };
  ['transaksi', 'produk', 'biaya', 'settings'].forEach(function (t) {
    var res = UrlFetchApp.fetch(c.baseUrl + '/rest/v1/' + t + '?select=id', options);
    out.tables[t] = { code: res.getResponseCode(), body: res.getContentText().slice(0, 200) };
  });
  Logger.log(JSON.stringify(out, null, 1));
  return out;
}

// ------------------------------------------------------------
// DIAGNOSTIK — tampilkan header asli sheet Produk/Biaya + baris
// data pertama. Run lalu salin output (View > Log) ke sini.
// ponytail: sementara, dihapus setelah HPP beres.
// ------------------------------------------------------------
function debugSheetHeaders_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  function dump(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return { error: 'Sheet tidak ada: ' + name };
    var vals = sh.getDataRange().getValues();
    if (!vals.length) return { error: 'Sheet kosong: ' + name };
    return {
      headers: vals[0].map(function (h) { return h.toString().trim(); }),
      sample: vals.slice(1, 6),
      totalRows: vals.length
    };
  }
  var out = { produk: dump('Produk'), biaya: dump('Biaya') };

  // Hitung kolom mana yang benar-benar terisi angka (HPP vs Kategori Produk)
  var sh = ss.getSheetByName('Produk');
  if (sh) {
    var data = sh.getDataRange().getValues();
    var headers = data[0].map(function (h) { return h.toString().trim(); });
    function filledCount(colName) {
      var idx = headers.indexOf(colName);
      if (idx < 0) return -1;
      var n = 0;
      for (var i = 1; i < data.length; i++) {
        var v = data[i][idx];
        if (v !== '' && v !== null && Number(v) !== 0) n++;
      }
      return n;
    }
    out.produk.hppFilled = filledCount('HPP');
    out.produk.kategoriProdukFilled = filledCount('Kategori Produk');
  }
  Logger.log('DEBUG HEADERS: %s', JSON.stringify(out, null, 1));
  return out;
}
