// ============================================
// OUTBOND TRACK — Google Apps Script backend (Supabase)
// ------------------------------------------------------------
// DEPLOY (sekali):
// 1) Buat project Apps Script baru, hapus isi default, paste seluruh file ini.
// 2) Isi __SUPABASE_CONFIG__ di bawah (Project URL & service_role project UNITOOLS).
// 3) Pilih fungsi `setupSupabaseProps` di toolbar > Run > izinkan akses.
//    (nilai tersimpan di Script Properties, blok config otomatis dikosongkan)
// 4) Deploy > New deployment > Web app
//       - Execute as: Me
//       - Who has access: Anyone
// 5) Tempel URL .../exec hasil deploy ke SCRIPT_URL di Outbondtrack.html.
// ------------------------------------------------------------
// Frontend hanya memanggil action "simpanDataGudang" ke sini (write).
// Read (getRiwayatGrouped / getDetailById) langsung ke Supabase REST
// via anon key di frontend — tabel outbond_paket tidak punya policy insert.
// ============================================

// ------------------------------------------------------------
// 1) Tempel 2 nilai di __SUPABASE_CONFIG__ di bawah ini.
// 2) Run fungsi `setupSupabaseProps` sekali.
// 3) Nilai tersimpan di Script Properties, lalu blok ini
//    OTOMATIS dikosongkan (kunci rahasia tidak tersisa di file).
// ------------------------------------------------------------
var __SUPABASE_CONFIG__ = {
  SUPABASE_URL: '',       // ← tempel Project URL project UNITOOLS di sini
  SERVICE_ROLE_KEY: ''    // ← tempel service_role key di sini
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

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var payload = body.payload;

  // Simpan batch paket. Payload = array [waktu, idPenginputan, resi, kurir]
  if (action === 'simpanDataGudang') {
    if (!Array.isArray(payload) || payload.length === 0) {
      return jsonOut({ success: false, error: 'Payload kosong' });
    }
    var rows = payload.map(function (r) {
      return {
        'id_penginputan': r[1],
        'resi': r[2],
        'ekspedisi': r[3],
        'waktu': r[0]
      };
    });
    supabaseRequest_('post', '/rest/v1/outbond_paket', rows);
    return jsonOut({ success: true, data: { inserted: rows.length } });
  }

  return jsonOut({ success: false, error: 'Action tidak dikenal: ' + action });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
