// ============================================
// RND ROADMAP TRACKER — Google Apps Script backend (Supabase)
// ------------------------------------------------------------
// DEPLOY (sekali):
// 1) Buat project Apps Script baru, hapus isi default, paste seluruh file ini.
// 2) Isi __SUPABASE_CONFIG__ di bawah (Project URL & service_role project UNITOOLS).
// 3) Pilih fungsi `setupSupabaseProps` di toolbar > Run > izinkan akses.
//    (nilai tersimpan di Script Properties, blok config otomatis dikosongkan)
// 4) Deploy > New deployment > Web app
//       - Execute as: Me
//       - Who has access: Anyone
// 5) Tempel URL .../exec hasil deploy ke GAS_SCRIPT_URL di src/config.js.
// ------------------------------------------------------------
// Frontend memanggil action "sync" ke sini (write via service_role).
// Read langsung ke Supabase REST via anon key di frontend
// (tabel rnd_roadmap hanya punya policy select untuk anon).
// ============================================

var __SUPABASE_CONFIG__ = {
  SUPABASE_URL: 'https://iyraamxkrygtzsqkvnqz.supabase.co',       // ← tempel Project URL project UNITOOLS di sini
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cmFhbXhrcnlndHpzcWt2bnF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUwMTc1NCwiZXhwIjoyMTAyMDc3NzU0fQ.VJODIL3SbUyDQHdM9ljsScOFqPIRDNoYR51QClAiuVY'    // ← tempel service_role key di sini
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

function supabaseRequest_(method, path, payload, prefer) {
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
    options.headers['Prefer'] = prefer || 'return=minimal';
    options.payload = JSON.stringify(payload);
  }
  var res = UrlFetchApp.fetch(c.baseUrl + path, options);
  if (res.getResponseCode() >= 300) {
    throw new Error('Supabase ' + res.getResponseCode() + ' ' + path + ': ' + res.getContentText());
  }
  return res;
}

function doPost(e) {
 try {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var payload = body.payload || {};

  // Sinkronisasi: upsert semua baris yang ada + hapus id yang dikirim.
  if (action === 'sync') {
    var rows = payload.rows || [];
    var deletes = payload.deletes || [];

    if (rows.length) {
      var mapped = rows.map(function (r) {
        return { id: r.id, data: r.data };
      });
      supabaseRequest_('post', '/rest/v1/rnd_roadmap', mapped, 'resolution=merge-duplicates,return=minimal');
    }

    if (deletes.length) {
      var q = '?id=in.(' + deletes.map(function (d) { return '"' + d + '"'; }).join(',') + ')';
      supabaseRequest_('delete', '/rest/v1/rnd_roadmap' + q, null);
    }

    return jsonOut({ success: true, upserted: rows.length, deleted: deletes.length });
  }

  if (action === 'uploadPhoto') {
    return uploadPhoto_(payload);
  }

  return jsonOut({ success: false, error: 'Action tidak dikenal: ' + action });
 } catch (err) {
  return jsonOut({ success: false, error: 'GAS error: ' + (err && err.message ? err.message : err) });
 }
}

function getFolder_() {
  // Folder Drive tujuan (disediakan user)
  var FOLDER_ID = '1gFfbxeNtP6t_mwZ8VG7Uw74c3D3REy7I';
  return DriveApp.getFolderById(FOLDER_ID);
}

function uploadPhoto_(p) {
  var data = p.base64 || '';
  var mime = p.mime || 'image/png';
  var idx = data.indexOf(',');
  if (idx !== -1) {
    var header = data.substring(0, idx); // data:image/png;base64
    var m = header.match(/data:(.*?);base64/);
    if (m) mime = m[1];
    data = data.substring(idx + 1);
  }
  var bytes = Utilities.base64Decode(data);
  var blob = Utilities.newBlob(bytes, mime, p.name || 'photo.png');
  var file = getFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
  var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
  return jsonOut({ success: true, photoUrl: url, id: file.getId() });
}

function doGet(e) {
  var configured = false;
  try {
    var c = supabaseCreds_();
    configured = !!(c.baseUrl && c.apiKey);
  } catch (err) {
    configured = false;
  }
  return jsonOut({
    status: 'ok',
    service: 'rndtracker',
    configured: configured,
    note: 'GET=status. POST action=sync untuk simpan dari webtool.'
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Jalankan fungsi ini sekali dari editor (tombol Run) untuk memicu izin Google Drive.
function izinkanDrive() {
  DriveApp.getRootFolder();
  return "Drive OK";
}
