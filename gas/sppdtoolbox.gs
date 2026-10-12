// ============================================
// SPPD TOOLBOX (ArchiveDoc) — Google Apps Script backend (Supabase)
// ------------------------------------------------------------
// DEPLOY (sekali):
// 1) Buat project Apps Script baru, hapus isi default, paste seluruh file ini.
// 2) Isi __SUPABASE_CONFIG__ di bawah (Project URL & service_role project UNITOOLS).
// 3) Pilih fungsi `setupSupabaseProps` di toolbar > Run > izinkan akses.
//    (nilai tersimpan di Script Properties, blok config otomatis dikosongkan)
// 4) Deploy > New deployment > Web app
//       - Execute as: Me
//       - Who has access: Anyone
// 5) Tempel URL .../exec hasil deploy ke window.SPT_GAS_URL di ArchiveDoc/index.html
//    (atau Productive/ArchiveDoc/js/store.js bagian GAS_URL).
// ------------------------------------------------------------
// Arsitektur: SEMUA baca/tulis lewat sini memakai service_role (key tidak
// pernah ada di browser). Tabel sppd_* punya RLS aktif TANPA policy anon,
// jadi anon key pun tidak bisa menyentuh data. Lihat sppd_schema.sql.
// ============================================

var __SUPABASE_CONFIG__ = {
  SUPABASE_URL: 'https://iyraamxkrygtzsqkvnqz.supabase.co',       // ← tempel Project URL project UNITOOLS di sini
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

function supabaseRequest_(method, path, payload, prefer) {
  var c = supabaseCreds_();
  var options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      'apikey': c.apiKey,
      'Authorization': 'Bearer ' + c.apiKey,
      'Accept': 'application/json'
    }
  };
  if (payload) {
    options.contentType = 'application/json';
    options.headers['Prefer'] = prefer || 'return=minimal';
    options.payload = JSON.stringify(payload);
  }
  var res = UrlFetchApp.fetch(c.baseUrl + path, options);
  var code = res.getResponseCode();
  if (code >= 300) {
    throw new Error('Supabase ' + code + ' ' + path + ': ' + res.getContentText());
  }
  return res;
}

// ============================================
// Peta tabel: kunci DB di store.js  →  tabel Supabase + kolom + PK
// ============================================
var TABLES = {
  events:              { table: 'sppd_events',              pk: 'id',      cols: ['id','user_id','nama','jenis','lokasi','tanggal_mulai','tanggal_selesai','status','peran_pic','catatan','created_at','updated_at'] },
  sppd:                { table: 'sppd_surat',               pk: 'id',      cols: ['id','user_id','event_id','no_surat','tanggal_terbit','tujuan','kegiatan','instansi','status','dana_awal','realisasi','tampilkan_realisasi','link_dokumen','catatan','budget'] },
  transports:          { table: 'sppd_transports',          pk: 'id',      cols: ['id','user_id','event_id','leg','tanggal','mode','rute_asal','rute_tujuan','total_biaya','wallet','detail','catatan'] },
  products:            { table: 'sppd_products',            pk: 'id',      cols: ['id','user_id','nama','sku','satuan','harga_jual_default','stok_kantor','aktif'] },
  eventProducts:       { table: 'sppd_event_products',      pk: 'id',      cols: ['id','user_id','event_id','product_id','qty_dibawa','qty_rusak_hilang','qty_kembali','catatan'] },
  sales:               { table: 'sppd_sales',               pk: 'id',      cols: ['id','user_id','event_id','product_id','tanggal','qty','harga_satuan','total','metode','wallet','catatan'] },
  expenses:            { table: 'sppd_expenses',            pk: 'id',      cols: ['id','user_id','event_id','kategori','tanggal','deskripsi','jumlah','wallet','bukti_drive_id','bukti_link','catatan'] },
  milestones:          { table: 'sppd_milestones',          pk: 'id',      cols: ['id','user_id','event_id','judul','tanggal','status','urutan','catatan','attachments'] },
  kasAdj:              { table: 'sppd_kas_adj',             pk: 'id',      cols: ['id','user_id','event_id','tanggal','keterangan','jumlah','wallet','created_at'] },
  danaCair:            { table: 'sppd_dana_cair',           pk: 'id',      cols: ['id','user_id','event_id','sumber','rekening','nominal','tanggal_cair','status','catatan'] },
  prepItems:           { table: 'sppd_prep_items',          pk: 'id',      cols: ['id','user_id','event_id','template_id','nama','kategori','qty','biaya','status','dibawa','pulang','catatan'] },
  checklistTemplates:  { table: 'sppd_checklist_templates', pk: 'id',      cols: ['id','user_id','kategori','nama','urutan'] },
  checklistItems:      { table: 'sppd_checklist_items',     pk: 'id',      cols: ['id','user_id','event_id','template_id','status','updated_at'] },
  itemCats:            { table: 'sppd_item_cats',           pk: 'id',      cols: ['id','user_id','nama','urutan'] },
  itemTemplates:       { table: 'sppd_item_templates',      pk: 'id',      cols: ['id','user_id','cat_id','nama','urutan'] }
};
var JSONB_COLS = { budget: 1, detail: 1, attachments: 1 };

var USER_ID = 'u1'; // ponytail: satu pemilik dulu; multi-akun tinggal ganti dari auth

function camel_(s) { return s.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); }); }
function snake_(s) { return s.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); }); }

// JS object → baris Supabase (kolom seragam supaya bulk insert valid)
function toRow_(cols, obj) {
  var row = {};
  cols.forEach(function (col) {
    var v = obj[camel_(col)];
    if (v === undefined) v = (JSONB_COLS[col] ? (col === 'detail' ? {} : []) : (col === 'user_id' ? USER_ID : null));
    row[col] = v;
  });
  return row;
}
// baris Supabase → JS object
function fromRow_(obj) {
  var out = {};
  for (var k in obj) out[camel_(k)] = obj[k];
  return out;
}

// ============================================
// Router
// ============================================
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, result: 'SPPD Toolbox bridge active' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var payload = body.payload || {};
    var data;
    if (action === 'full') data = fullLoad_();
    else if (action === 'save') data = fullSave_(payload);
    else if (action === 'bukti.upload') data = uploadBukti_(payload);
    else throw new Error('Action tidak dikenal: ' + action);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err.message || err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Ambil seluruh DB dari Supabase, bentuk ulang jadi objek seperti store.js
function fullLoad_() {
  var db = {};
  for (var key in TABLES) {
    var t = TABLES[key];
    var rows = JSON.parse(supabaseRequest_('get', '/rest/v1/' + t.table + '?select=*').getContentText());
    db[key] = (rows || []).map(fromRow_);
  }
  var st = JSON.parse(supabaseRequest_('get', '/rest/v1/sppd_settings?select=*').getContentText());
  db.settings = (st && st.length) ? fromRow_(st[0]) : null;
  return db;
}

// Tulis seluruh DB. ponytail: full-table sync (hapus yatim via not.in + upsert).
// Ganti ke diff per-baris kalau data sudah besar / save terasa lambat.
function fullSave_(db) {
  var summary = {};
  for (var key in TABLES) {
    var t = TABLES[key];
    var rows = (db[key] || []).map(function (r) { return toRow_(t.cols, r); });
    var ids = rows.map(function (r) { return r[t.pk]; }).filter(function (x) { return x !== null && x !== undefined && x !== ''; });

    // 1) hapus baris yang tidak ada lagi di klien
    var delPath = '/rest/v1/' + t.table + '?' + t.pk + '=' +
      (ids.length ? 'not.in.(' + ids.map(encodeURIComponent).join(',') + ')' : 'not.is.null');
    supabaseRequest_('delete', delPath);

    // 2) upsert (insert atau update by PK)
    if (rows.length) {
      supabaseRequest_('post', '/rest/v1/' + t.table + '?on_conflict=' + t.pk, rows,
        'resolution=merge-duplicates,return=minimal');
    }
    summary[key] = rows.length;
  }
  // settings: satu baris
  if (db.settings) {
    var s = db.settings;
    var srow = {
      user_id: USER_ID,
      nama: s.nama || '', instansi: s.instansi || '',
      tarif_km: Number(s.tarifKm) || 0, folder_drive_id: s.folderDriveId || '',
      catatan_integrasi: s.catatanIntegrasi || ''
    };
    supabaseRequest_('post', '/rest/v1/sppd_settings?on_conflict=user_id', [srow], 'resolution=merge-duplicates,return=minimal');
    summary.settings = 1;
  }
  return { saved: summary };
}

// Terima foto yang sudah dikompres klien (base64) → simpan ke Drive → balikkan ref
function uploadBukti_(payload) {
  var base64 = String(payload.base64 || '');
  if (!base64) throw new Error('base64 kosong');
  var name = String(payload.name || ('bukti-' + Date.now() + '.jpg'));
  var mime = String(payload.mime || 'image/jpeg');
  var folderId = String(payload.folderId || '').trim();

  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, mime, name);
  var file = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { driveId: file.getId(), link: file.getUrl() };
}

// ------------------------------------------------------------
// Self-check (jalankan sekali setelah setupSupabaseProps):
// memastikan kolom TABLES cocok dengan tabel nyata.
// ------------------------------------------------------------
function demoSchema_() {
  var out = {};
  for (var key in TABLES) {
    var t = TABLES[key];
    var row = JSON.parse(supabaseRequest_('get', '/rest/v1/' + t.table + '?select=*&limit=1').getContentText());
    out[t.table] = (row && row[0]) ? Object.keys(row[0]) : '(kosong, kolom tak bisa dicek dari data)';
  }
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
