/**
 * SPPD Generator — Backend Google Apps Script
 * Frontend: Index.html (1 file; semua UI + renderer form ada di sana).
 * Penyimpanan:
 *   - Metadata riwayat  -> Google Sheet (sheet "Riwayat")
 *   - File print view   -> Google Drive folder "SPPD_Riwayat" (.html, bisa dipreview & diunduh)
 *   - Data mentah form  -> Google Drive folder yang sama (.json, dipakai fitur Edit)
 * Server TIDAK me-render tampilan form. Renderer tunggal = fungsi buildHTML() di Index.html.
 */

var CFG = {
  SHEET_NAME: 'Riwayat',
  FOLDER_NAME: 'SPPD_Riwayat',
  // Kosongkan = otomatis memakai spreadsheet yang terikat (container-bound).
  // Jika script standalone, isi dengan ID Spreadsheet.
  SPREADSHEET_ID: ''
};
var HEADERS = ['id', 'dibuat', 'diubah', 'kota', 'tglBerangkat', 'total', 'jsonFileId', 'htmlFileId', 'fileUrl'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SPPD Generator')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- Helper ---------- */
function getSheet_() {
  var ss = CFG.SPREADSHEET_ID ? SpreadsheetApp.openById(CFG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CFG.SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}
function getFolder_() {
  var it = DriveApp.getFoldersByName(CFG.FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.FOLDER_NAME);
}
function findRow_(sh, id) {
  var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return 0;
}

/* ---------- API untuk google.script.run ---------- */

/** payload: {id|null, json:string, html:string, meta:{kota,tglBerangkat,total,nama}} */
function saveRecord(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(), folder = getFolder_(), now = new Date().toISOString();
    var row = p.id ? findRow_(sh, p.id) : 0;
    var base = (p.meta.nama || 'SPPD.html').replace(/\.html$/i, '');

    if (row) {
      var v = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
      DriveApp.getFileById(v[7]).setContent(p.html);
      DriveApp.getFileById(v[6]).setContent(p.json);
      sh.getRange(row, 3, 1, 4).setValues([[now, p.meta.kota, p.meta.tglBerangkat, p.meta.total]]);
      return { id: p.id };
    }
    var id = Utilities.getUuid().slice(0, 8);
    var fHtml = folder.createFile(base + '_' + id + '.html', p.html, MimeType.HTML);
    var fJson = folder.createFile(base + '_' + id + '.json', p.json, MimeType.PLAIN_TEXT);
    sh.appendRow([id, now, now, p.meta.kota, p.meta.tglBerangkat, p.meta.total, fJson.getId(), fHtml.getId(), fHtml.getUrl()]);
    return { id: id };
  } finally {
    lock.releaseLock();
  }
}

/** Mengembalikan daftar metadata (tanpa isi file), terbaru di atas. */
function listRecords() {
  var sh = getSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues().map(function (r) {
    return { id: r[0], dibuat: String(r[1]), diubah: String(r[2]), kota: r[3], tglBerangkat: String(r[4]), total: Number(r[5]) || 0, fileUrl: r[8] };
  }).reverse();
}

/** Mengembalikan {json, html, fileUrl} untuk preview/unduh/edit. */
function getRecord(id) {
  var sh = getSheet_(), row = findRow_(sh, id);
  if (!row) throw new Error('Data tidak ditemukan');
  var v = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  return {
    json: DriveApp.getFileById(v[6]).getBlob().getDataAsString(),
    html: DriveApp.getFileById(v[7]).getBlob().getDataAsString(),
    fileUrl: v[8]
  };
}

/** Hapus baris riwayat + pindahkan file ke Trash Drive. */
function deleteRecord(id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(), row = findRow_(sh, id);
    if (!row) return false;
    var v = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    try { DriveApp.getFileById(v[6]).setTrashed(true); } catch (e) {}
    try { DriveApp.getFileById(v[7]).setTrashed(true); } catch (e) {}
    sh.deleteRow(row);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Profil perusahaan default (nama, logo, watermark) ---------- */
var PROFILE_FILE = 'profil_perusahaan.json';

/** Mengembalikan string JSON profil, atau '' bila belum pernah disimpan. */
function getProfile() {
  var it = getFolder_().getFilesByName(PROFILE_FILE);
  return it.hasNext() ? it.next().getBlob().getDataAsString() : '';
}

/** Menyimpan string JSON profil (logo & watermark berupa data-URI, sudah diperkecil di frontend). */
function saveProfile(json) {
  var folder = getFolder_(), it = folder.getFilesByName(PROFILE_FILE);
  if (it.hasNext()) it.next().setContent(json);
  else folder.createFile(PROFILE_FILE, json, MimeType.PLAIN_TEXT);
  return true;
}
