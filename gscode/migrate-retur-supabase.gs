// ============================================
// MIGRATE RETUR TRACK GOOGLE SHEET → SUPABASE (SATU KALI)
// ------------------------------------------------------------
// DEPLOY:
// 1) Buka project Apps Script dari spreadsheet Retur Track.
//    (Editor > perluasan > Apps Script, atau Tools > Script editor.)
//    Pastikan terhubung ke spreadsheet yang berisi sheet "Tracking" & "Ekspedisi".
// 2) Hapus isi default, paste file ini.
// 3) Isi __SUPABASE_CONFIG__ di bawah (harus project yang sama dengan
//    retur_schema.sql dijalankan — UNITOOLS iyraamxkrygtzsqkvnqz).
// 4) Run `setupSupabaseProps` sekali (izinkan akses).
// 5) Run `migrateReturToSupabase`. Lihat hasil di View > Log.
//    Cara cek: buka Supabase > Table Editor > retur_tracking.
// 6) Script ini sudah tidak dipakai. Boleh dihapus/diarsip.
// ============================================

// ------------------------------------------------------------
// 1) Tempel 2 nilai di bawah. Run setupSupabaseProps sekali,
//    lalu blok ini otomatis dikosongkan.
// ------------------------------------------------------------
var __SUPABASE_CONFIG__ = {
  SUPABASE_URL: '',          // ← tempel Project URL di sini
  SERVICE_ROLE_KEY: ''       // ← tempel service_role key di sini
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
    options.headers['Prefer'] = 'return=minimal';
    options.payload = JSON.stringify(payload);
  }
  var res = UrlFetchApp.fetch(c.baseUrl + path, options);
  if (res.getResponseCode() >= 300) {
    throw new Error('Supabase ' + res.getResponseCode() + ' ' + path + ': ' + res.getContentText());
  }
  return res;
}

// Normalisasi tanggal sheet (Date object / d/m/yyyy / yyyy-MM-dd) → yyyy-MM-dd.
function returStandardDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    var p = function (n) { return (n.length < 2 ? '0' : '') + n; };
    return m[3] + '-' + p(m[2]) + '-' + p(m[1]);
  }
  var d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return null;
}

// Baca sheet + petakan header → object. Header dipetakan by nama, mirip getColumnMap_.
function returDataDariSheet_(ss, namaSheet) {
  var sh = ss.getSheetByName(namaSheet);
  if (!sh) throw new Error('Sheet "' + namaSheet + '" tidak ditemukan.');
  var data = sh.getDataRange().getValues();
  if (data.length === 0) return [];
  var header = data[0];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var h = 0; h < header.length; h++) {
      obj[String(header[h]).trim()] = row[h];
    }
    out.push(obj);
  }
  return out;
}

function returSendBatches_(path, rows) {
  var CHUNK = 400, done = 0;
  for (var i = 0; i < rows.length; i += CHUNK) {
    var batch = rows.slice(i, i + CHUNK);
    supabaseRequest_('post', path, batch);
    done += batch.length;
    Logger.log('Import %s: %s/%s baris', path, done, rows.length);
  }
  return done;
}

// ------------------------------------------------------------
// IMPORT UTAMA — baca sheet Tracking & Ekspedisi → Supabase.
// Reset tabel dulu (delete all) supaya idempoten.
// ------------------------------------------------------------
function migrateReturToSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  supabaseRequest_('delete', '/rest/v1/retur_tracking?id=gte.0');     // WHERE wajib di PostgREST
  supabaseRequest_('delete', '/rest/v1/retur_expeditions?id=gte.0');

  var trackingRows = returDataDariSheet_(ss, 'Tracking').map(function (r) {
    var tgl = returStandardDate_(r['Tanggal']);
    return {
      resi: String(r['Nomor Resi'] || '').trim(),
      ekspedisi: String(r['Ekspedisi'] || '').trim(),
      waktu_scan: String(r['Waktu Scan'] || '').trim(),
      tanggal: tgl || null,
      operator: String(r['Operator'] || '').trim(),
      status: String(r['Status'] || 'Pending').trim()
    };
  }).filter(function (r) { return r.resi && r.tanggal; });

  var expRows = returDataDariSheet_(ss, 'Ekspedisi').map(function (r) {
    return {
      nama: String(r['Nama'] || '').trim(),
      regex: String(r['Regex'] || '').trim()
    };
  }).filter(function (r) { return r.nama && r.regex; });

  var hasil = {
    tracking: returSendBatches_('/rest/v1/retur_tracking', trackingRows),
    ekspedisi: returSendBatches_('/rest/v1/retur_expeditions', expRows)
  };
  Logger.log('SELESAI. Hasil: %s', JSON.stringify(hasil));
  return hasil;
}