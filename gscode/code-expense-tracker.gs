function doPost(e) {
  var res = { success: false, message: '' };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var d = params.data || {};
    if (action === 'initSpreadsheet') { res.result = initSpreadsheet_(); }
    else if (action === 'submitExpense') { res.result = submitExpense_(d); }
    else if (action === 'getExpenses') { res.result = getExpenses_(d); }
    else if (action === 'getExpenseById') { res.result = getExpenseById_(d.id); }
    else if (action === 'approveExpense') { res.result = approveExpense_(d.id, d.approver); }
    else if (action === 'rejectExpense') { res.result = rejectExpense_(d.id, d.reason, d.pengaju); }
    else if (action === 'markRealisasi') { res.result = markRealisasi_(d.id, d.lunas); }
    else if (action === 'markReimburse') { res.result = markReimburse_(d.id); }
    else if (action === 'cancelExpense') { res.result = cancelExpense_(d.id); }
    else if (action === 'deleteExpense') { res.result = deleteExpense_(d.id); }
    else if (action === 'getExpenseSummary') { res.result = getExpenseSummary_(d.periode); }
    else if (action === 'getExpenseCountByStatus') { res.result = getExpenseCountByStatus_(d.periode); }
    else if (action === 'getExpenseTrend') { res.result = getExpenseTrend_(); }
    else { res.message = 'Unknown action: ' + action; return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON); }
    res.success = true;
    if (res.result && res.result.success === false) { res.success = false; res.message = res.result.message || ''; }
  } catch (e) { res.message = String(e.message || e); }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

function doGet(e) {
  var res = { success: false, message: '' };
  try {
    var params = e.parameter;
    var action = params.action;
    if (action === 'initSpreadsheet') { res.result = initSpreadsheet_(); }
    else if (action === 'getExpenses') { res.result = getExpenses_({ page: parseInt(params.page) || 1, limit: parseInt(params.limit) || 20 }); }
    else if (action === 'getExpenseById') { res.result = getExpenseById_(params.id); }
    else if (action === 'getExpenseSummary') { res.result = getExpenseSummary_(params.periode || 'this_month'); }
    else if (action === 'getExpenseCountByStatus') { res.result = getExpenseCountByStatus_(params.periode || 'this_month'); }
    else if (action === 'getExpenseTrend') { res.result = getExpenseTrend_(); }
    else if (action === 'checkInit') { res.result = { sheetExists: getSheet_('Expenses') !== null }; }
    else { res.message = 'Unknown action: ' + action; return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON); }
    res.success = true;
  } catch (e) { res.message = String(e.message || e); }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function HEADER_ROW() {
  return ['id', 'tanggal', 'kategori', 'deskripsi', 'jumlah', 'buktiNama', 'buktiUrl', 'pengaju', 'status', 'approvedBy', 'tanggalApproved', 'statusRealisasi', 'tanggalUpdate', 'timeline'];
}

function initSpreadsheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var existing = ss.getSheetByName('Expenses');
  if (existing) { existing.clear(); existing.appendRow(HEADER_ROW()); return { initialized: true, sheetName: 'Expenses', rowsCleared: true }; }
  var sheet = ss.insertSheet('Expenses');
  sheet.appendRow(HEADER_ROW());
  sheet.setFrozenRows(1);
  return { initialized: true, sheetName: 'Expenses', rowsAdded: 1 };
}

function saveFileToDrive_(base64, filename, mimeType) {
  if (!base64 || !filename) return '-';
  var folderName = 'Expense Bukti';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType || 'application/octet-stream', filename);
  var file = folder.createFile(blob);
  return file.getUrl();
}

function appendTimeline_(sheet, rowIdx, newStatus, changedBy) {
  var headers = sheet.getDataRange().getValues()[0];
  var timelineCol = headers.indexOf('timeline');
  if (timelineCol < 0) return;
  var existing = sheet.getRange(rowIdx, timelineCol + 1).getValue() || '[]';
  var entries = JSON.parse(existing);
  entries.push({ at: new Date().toISOString(), status: newStatus, by: changedBy || '' });
  sheet.getRange(rowIdx, timelineCol + 1).setValue(JSON.stringify(entries));
}

function submitExpense_(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Expenses');
  if (!sheet) throw new Error('Sheet Expenses tidak ditemukan. Jalankan initSpreadsheet terlebih dahulu.');
  var id = 'exp_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '_' + String(sheet.getLastRow()).padStart(3, '0');
  var buktiUrl = '-';
  var buktiNama = '-';
  if (data.file && data.file.data) {
    buktiUrl = saveFileToDrive_(data.file.data, data.file.name, data.file.mime);
    buktiNama = data.file.name;
  }
  var pengaju = (data.pengaju || '').trim();
  var deskripsi = (data.deskripsi || '').trim();
  var status = data.status === 'draft' ? 'draft' : 'pengajuan';
  var now = new Date().toISOString();
  var timeline = JSON.stringify([{ at: now, status: status, by: pengaju }]);
  var row = [
    id, data.tanggal || '', (data.kategori || '').toLowerCase().trim(), deskripsi,
    Math.max(0, parseInt(data.jumlah) || 0), buktiNama, buktiUrl, pengaju,
    status, '', '', '-', now, timeline
  ];
  sheet.appendRow(row);
  return { success: true, id: id };
}

function getExpenses_(filter) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Expenses');
  if (!sheet) return { total: 0, page: 1, limit: 20, totalPages: 0, rows: [] };
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { total: 0, page: 1, limit: 20, totalPages: 0, rows: [] };
  var headers = rows[0];
  var idCol = headers.indexOf('id');
  var tanggalCol = headers.indexOf('tanggal');
  var kategoriCol = headers.indexOf('kategori');
  var deskripsiCol = headers.indexOf('deskripsi');
  var jumlahCol = headers.indexOf('jumlah');
  var pengajuCol = headers.indexOf('pengaju');
  var statusCol = headers.indexOf('status');
  var tanggalUpdateCol = headers.indexOf('tanggalUpdate');
  if (!filter) filter = {};
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][idCol]) continue;
    var row = {};
    row.id = rows[i][idCol];
    row.tanggal = rows[i][tanggalCol] || '';
    row.kategori = rows[i][kategoriCol] || '';
    row.deskripsi = rows[i][deskripsiCol] || '';
    row.jumlah = rows[i][jumlahCol] || 0;
    row.pengaju = rows[i][pengajuCol] || '';
    row.status = rows[i][statusCol] || 'pengajuan';
    row.tanggalUpdate = rows[i][tanggalUpdateCol] || '';
    if (filter.status && filter.status !== 'semua' && row.status !== filter.status) continue;
    if (filter.kategori && filter.kategori !== 'semua' && row.kategori !== filter.kategori) continue;
    if (filter.search && row.deskripsi.toLowerCase().indexOf(filter.search.toLowerCase()) === -1) continue;
    var tgl = String(row.tanggal || '');
    if (filter.from && tgl < filter.from) continue;
    if (filter.to && tgl > filter.to) continue;
    result.push(row);
  }
  result.sort(function(a, b) { return b.tanggalUpdate.localeCompare(a.tanggalUpdate); });
  var page = filter.page || 1;
  var limit = filter.limit || 20;
  var start = (page - 1) * limit;
  var total = result.length;
  return { total: total, page: page, limit: limit, totalPages: Math.ceil(total / limit), rows: result.slice(start, start + limit) };
}

function getExpenseById_(id) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Expenses');
  if (!sheet) return null;
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return null;
  var headers = rows[0];
  var idCol = headers.indexOf('id');
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) {
      var row = {};
      headers.forEach(function(h, j) { row[h] = rows[i][j]; });
      if (row.timeline && typeof row.timeline === 'string') {
        try { row.timeline = JSON.parse(row.timeline); } catch(e) { row.timeline = []; }
      }
      return row;
    }
  }
  return null;
}

function updateExpenseStatus_(id, newStatus, optFields, allowedFrom) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Expenses');
  if (!sheet) throw new Error('Sheet Expenses tidak ditemukan');
  var headers = sheet.getDataRange().getValues()[0];
  var idCol = headers.indexOf('id');
  var statusCol = headers.indexOf('status');
  var tanggalUpdateCol = headers.indexOf('tanggalUpdate');
  var lastRow = sheet.getLastRow();
  var now = new Date().toISOString();
  for (var i = 2; i <= lastRow; i++) {
    if (String(sheet.getRange(i, idCol + 1).getValue()) === String(id)) {
      var currentStatus = String(sheet.getRange(i, statusCol + 1).getValue());
      if (allowedFrom && allowedFrom.indexOf(currentStatus) === -1) {
        return { success: false, message: 'Status ' + currentStatus + ' tidak mengizinkan aksi ini' };
      }
      sheet.getRange(i, statusCol + 1).setValue(newStatus);
      sheet.getRange(i, tanggalUpdateCol + 1).setValue(now);
      if (optFields) {
        for (var col in optFields) {
          var ci = headers.indexOf(col);
          if (ci >= 0) sheet.getRange(i, ci + 1).setValue(optFields[col]);
        }
      }
      var pengaju = sheet.getRange(i, headers.indexOf('pengaju') + 1).getValue() || '';
      var changedBy = pengaju;
      if (optFields) {
        if (optFields.approvedBy) changedBy = optFields.approvedBy;
        else if (optFields.rejectedBy) changedBy = optFields.rejectedBy;
      }
      appendTimeline_(sheet, i, newStatus, changedBy);
      return { success: true, id: id };
    }
  }
  return { success: false, message: 'Expense not found: ' + id };
}

function approveExpense_(id, approver) {
  return updateExpenseStatus_(id, 'disetujui', { approvedBy: approver || '', tanggalApproved: new Date().toISOString() });
}

function rejectExpense_(id, reason, pengaju) {
  return updateExpenseStatus_(id, 'ditolak', { rejectedBy: pengaju || '' });
}

function markRealisasi_(id, lunas) {
  return updateExpenseStatus_(id, 'realisasi', { statusRealisasi: lunas ? 'lunas' : 'belum_lunas' });
}

function markReimburse_(id) {
  return updateExpenseStatus_(id, 'selesai');
}

function cancelExpense_(id) {
  return updateExpenseStatus_(id, 'batal', null, ['draft', 'pengajuan']);
}

function deleteExpense_(id) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Expenses');
  if (!sheet) throw new Error('Sheet Expenses tidak ditemukan');
  var headers = sheet.getDataRange().getValues()[0];
  var idCol = headers.indexOf('id');
  var statusCol = headers.indexOf('status');
  var lastRow = sheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    if (String(sheet.getRange(i, idCol + 1).getValue()) === String(id)) {
      var rowStatus = sheet.getRange(i, statusCol + 1).getValue();
      if (rowStatus !== 'draft') return { success: false, message: 'Hanya draft yang bisa dihapus' };
      sheet.deleteRow(i);
      return { success: true, id: id };
    }
  }
  return { success: false, message: 'Expense not found: ' + id };
}

function getExpenseSummary_(periode) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Expenses');
  if (!sheet) return emptySummary_();
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return emptySummary_();
  var headers = rows[0];
  var idCol = headers.indexOf('id');
  var tanggalCol = headers.indexOf('tanggal');
  var kategoriCol = headers.indexOf('kategori');
  var jumlahCol = headers.indexOf('jumlah');
  var statusCol = headers.indexOf('status');
  var result = emptySummary_();
  var filterMonth = parsePeriode_(periode);
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][idCol]) continue;
    if (filterMonth) {
      var t = String(rows[i][tanggalCol] || '');
      if (t.length >= 7 && t.slice(0, 7) !== filterMonth) continue;
    }
    var status = rows[i][statusCol] || '';
    var jumlah = Number(rows[i][jumlahCol]) || 0;
    var kategori = rows[i][kategoriCol] || 'lainnya';
    result.totalPengajuan += jumlah;
    result[status + 'Count'] = (result[status + 'Count'] || 0) + 1;
    if (status === 'disetujui') result.totalDisetujui += jumlah;
    if (status === 'realisasi') result.totalRealisasi += jumlah;
    if (status === 'selesai') result.totalReimburse += jumlah;
    if (status === 'batal') result.totalBatal += jumlah;
    if (status === 'ditolak') result.totalDitolak += jumlah;
    if (status === 'draft') result.totalDraf += jumlah;
    if (!result.perKategori[kategori]) result.perKategori[kategori] = { count: 0, total: 0 };
    result.perKategori[kategori].count++;
    result.perKategori[kategori].total += jumlah;
  }
  return result;
}

function emptySummary_() {
  return { totalPengajuan: 0, totalDisetujui: 0, totalRealisasi: 0, totalReimburse: 0, totalBatal: 0, totalDitolak: 0, totalDraf: 0, perKategori: {}, pengajuanCount: 0, disetujuiCount: 0, realisasiCount: 0, selesaiCount: 0, batalCount: 0, ditolakCount: 0 };
}

function parsePeriode_(periode) {
  if (!periode || periode === 'all') return null;
  if (periode === 'this_month') {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  if (/^\d{4}-\d{2}$/.test(periode)) return periode;
  return null;
}

function getExpenseTrend_() {
  var months = [];
  var d = new Date();
  for (var m = 0; m < 6; m++) {
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    months.push(y + '-' + mo);
    d.setMonth(d.getMonth() - 1);
  }
  months.reverse();
  var result = [];
  for (var i = 0; i < months.length; i++) {
    var sum = getExpenseSummary_(months[i]);
    result.push({ month: months[i], total: sum.totalPengajuan, count: sum.pengajuanCount + sum.disetujuiCount + sum.realisasiCount + sum.selesaiCount });
  }
  return result;
}

function getExpenseCountByStatus_(periode) {
  var summary = getExpenseSummary_(periode);
  return {
    draft: summary.draftCount || 0,
    pengajuan: summary.pengajuanCount || 0,
    disetujui: summary.disetujuiCount || 0,
    ditolak: summary.ditolakCount || 0,
    realisasi: summary.realisasiCount || 0,
    selesai: summary.selesaiCount || 0,
    batal: summary.batalCount || 0
  };
}
