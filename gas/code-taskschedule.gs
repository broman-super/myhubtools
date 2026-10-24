// === SHEETS ===
// "Events" — ID | Nama | Mulai | Selesai | Deskripsi | Penyelenggara | Warna | Status | Tipe
// "Reminders" — ID | Nama | Mulai | Selesai | Deskripsi | Warna | Status | Tipe
// "Tasks" — existing sheet reused (query via doGet/?action=getTasks)

// Kunci tulis tim: Script Property BRIDGE_TOKEN (repo publik, jangan tulis nilainya di sini).
function bridgeToken_() {
  var t = PropertiesService.getScriptProperties().getProperty('BRIDGE_TOKEN');
  if (!t) throw new Error('BRIDGE_TOKEN belum diset di Script Properties project ini');
  return String(t).trim();
}

// Cek kunci tulis. String(t || '') = token kosong bila klien tidak mengirim; jangan diisi.
function requireToken_(body) {
  if (String((body && body.token) || '') !== bridgeToken_()) throw new Error('Kunci tulis tidak valid');
}

// ponytail: shared doPost router — add new actions alongside existing ones
function doPost(e) {
  var res = { success: false, message: '' };
  var lock = null;
  try {
    if (!e.postData || !e.postData.contents) throw new Error('Request body kosong');
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    if (action !== 'getCalendarData') requireToken_(params);
    if (action === 'getCalendarData') {
      res.result = getCalendarData_();
    } else if (action === 'saveCalendarItem' || action === 'saveTask' || action === 'saveTasksBatch') {
      // ponytail: lock hanya untuk tulis — baca tanpa lock (single-user tool, tulis = append/update sheet)
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      res.result = action === 'saveTasksBatch' ? saveTasksBatch_(params.data) : saveCalendarItem_(params.data);
    } else if (action === 'deleteCalendarItem' || action === 'deleteTask') {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      res.result = deleteCalendarItem_(params.data.id, params.data.type);
    } else if (action === 'createShare' || action === 'deleteShare') {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      res.result = action === 'createShare' ? createShare_(params.data) : deleteShare_(params.data);
    } else {
      res.message = 'Unknown action: ' + action;
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }
    res.success = true;
  } catch (e) {
    res.message = String(e.message || e);
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (err) {} }
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

// W7: simpan banyak row dalam 1 request (repeat/urutan = N POST sebelumnya)
// Stop-on-fail + daftar id tersimpan: client hanya buang optimis-add yang BENAR-BENAR tersimpan
function saveTasksBatch_(data) {
  var items = (data && data.items) || [];
  var saved = [];
  for (var i = 0; i < items.length; i++) {
    try {
      saved.push(saveCalendarItem_(items[i]).id || items[i].id);
    } catch (err) {
      return { saved: saved, failedId: items[i].id, message: String(err.message || err) };
    }
  }
  return { saved: saved, failedId: null, message: '' };
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'getTasks') {
      // ponytail: bare array — matches frontend GET fallback expectation (Array.isArray(raw))
      var res = getSheetData_(SpreadsheetApp.getActiveSpreadsheet(), 'Tasks');
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'getShare') {
      var share = getShare_(e.parameter.slug);
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: share })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'listShares') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: listShares_() })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Unknown action: ' + action })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: String(err.message || err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function isCampaignRow_(r) {
  if (['tipe', 'type', 'kategori'].some(function(k) { return String(r[k] || '').toLowerCase().trim() === 'campaign'; })) return true;
  if (['Instagram', 'Whatsapp', 'Tiktok', 'Shopee', 'Web', 'Event'].indexOf(String(r.tag || '')) > -1) return true;
  return /^(IG|WA|TT|SP|WB|WEB|EV|EVT)\s*\|/.test(String(r.title || r.nama || ''));
}

function getCalendarData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tasks = getSheetData_(ss, 'Tasks');
  var campaigns = tasks.filter(isCampaignRow_);
  var plainTasks = tasks.filter(function(r) { return !isCampaignRow_(r); });
  var events = getSheetData_(ss, 'Events');
  var reminders = getSheetData_(ss, 'Reminders');
  return { tasks: plainTasks, campaigns: campaigns, events: events, reminders: reminders };
}

function getSheetData_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0].map(String);
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue; // kosong
    var obj = {};
    headers.forEach(function(h, j) { obj[h.toLowerCase()] = row[j]; });
    result.push(obj);
  }
  return result;
}

// === SHARE (link publik #ss-<slug>, read-only per bulan) ===
// Sheet "Shares": Slug | Month | Label | CreatedAt — slug disimpan LENGKAP termasuk prefix ss-

function getSharesSheet_(ss) {
  var sh = ss.getSheetByName('Shares');
  if (!sh) {
    sh = ss.insertSheet('Shares');
    sh.appendRow(['Slug', 'Month', 'Label', 'CreatedAt']);
  }
  return sh;
}

// Date object → 'yyyy-MM-dd' (script TZ); string ISO/panjang → slice 10 char; else ''
function shareDateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

function shareRowStr_(r) {
  return String(r || '').toLowerCase().trim();
}

// Sheets mengubah string '2026-10' menjadi Date saat ditulis — normalkan balik ke yyyy-MM
function shareMonthStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM');
  var s = String(v || '').trim();
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : '';
}

// Baca baris share: {slug, month, label} — throw bila slug salah atau tidak ditemukan
function readShareRow_(ss, slug) {
  var sh = getSharesSheet_(ss);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (shareRowStr_(rows[i][0]) === slug) {
      return { row: i + 1, slug: slug, month: shareMonthStr_(rows[i][1]), label: String(rows[i][2] || '') };
    }
  }
  return null;
}

// Data bulan itu saja — filter overlap start <= monthEnd && end >= monthStart (mirror frontend getTimelineItems)
function getShare_(slugRaw) {
  var slug = shareRowStr_(slugRaw);
  if (!/^ss-[a-z0-9-]{1,57}$/.test(slug)) throw new Error('Slug tidak valid — format ss-<slug>');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var row = readShareRow_(ss, slug);
  if (!row || !/^\d{4}-\d{2}$/.test(row.month)) throw new Error('Share tidak ditemukan');
  var month = row.month;
  var monthStart = month + '-01';
  var monthEnd = month + '-' + new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

  function inMonth_(s, e) {
    if (!s) return false;
    return s <= monthEnd && (e || s) >= monthStart;
  }

  var tasksAll = getSheetData_(ss, 'Tasks');
  var tasks = [], campaigns = [];
  for (var i = 0; i < tasksAll.length; i++) {
    var t = tasksAll[i];
    var s = shareDateStr_(t.date || t.mulai || t.tanggal);
    if (!inMonth_(s, shareDateStr_(t.enddate || t.selesai))) continue;
    if (isCampaignRow_(t)) campaigns.push(t); else tasks.push(t);
  }
  var events = getSheetData_(ss, 'Events').filter(function(r) {
    return inMonth_(shareDateStr_(r.mulai), shareDateStr_(r.selesai));
  });
  var reminders = getSheetData_(ss, 'Reminders').filter(function(r) {
    return inMonth_(shareDateStr_(r.mulai), shareDateStr_(r.selesai));
  });
  return { slug: slug, month: month, label: row.label, tasks: tasks, campaigns: campaigns, events: events, reminders: reminders };
}

function createShare_(data) {
  var slug = shareRowStr_(data && data.slug);
  var month = String(data && data.month || '').trim();
  var label = String(data && data.label || '').trim().slice(0, 80);
  if (!/^ss-[a-z0-9-]{1,57}$/.test(slug)) throw new Error('Slug tidak valid — harus diawali ss-, huruf kecil/angka/tanda -');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Bulan tidak valid (format YYYY-MM)');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = getSharesSheet_(ss);
  var existing = readShareRow_(ss, slug);
  if (existing) {
    sh.getRange(existing.row, 2).setValue(month);
    sh.getRange(existing.row, 3).setValue(label);
    return { slug: slug, month: month, label: label, created: false };
  }
  sh.appendRow([slug, month, label, new Date()]);
  return { slug: slug, month: month, label: label, created: true };
}

function deleteShare_(data) {
  var slug = shareRowStr_(data && data.slug);
  if (!/^ss-[a-z0-9-]{1,57}$/.test(slug)) throw new Error('Slug tidak valid');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var row = readShareRow_(ss, slug);
  if (!row) return { slug: slug, deleted: false };
  getSharesSheet_(ss).deleteRow(row.row);
  return { slug: slug, deleted: true };
}

function listShares_() {
  var sh = getSharesSheet_(SpreadsheetApp.getActiveSpreadsheet());
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    out.push({ slug: shareRowStr_(rows[i][0]), month: shareMonthStr_(rows[i][1]), label: String(rows[i][2] || '') });
  }
  return out;
}

function saveCalendarItem_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = mapTypeToSheet_(data.type || 'task');
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    if (sheetName === 'Events') sheet = createEventsSheet_(ss);
    else if (sheetName === 'Reminders') sheet = createRemindersSheet_(ss);
    else throw new Error('Sheet ' + sheetName + ' tidak ditemukan');
  }
  var headers = sheet.getDataRange().getValues()[0].map(String);
  var lower = headers.map(function(h) { return h.toLowerCase(); });
  var idCol = lower.indexOf('id');

  // Reorder persist: auto-buat kolom Urutan bila payload membawa urutan
  if (data.urutan !== undefined && lower.indexOf('urutan') < 0) {
    sheet.insertColumnAfter(headers.length);
    sheet.getRange(1, headers.length + 1).setValue('Urutan');
    headers.push('Urutan');
    lower.push('urutan');
    idCol = lower.indexOf('id');
  }

  // Subtask persist: auto-buat kolom Subtasks bila payload membawa subtasks (JSON string)
  if (data.subtasks !== undefined && lower.indexOf('subtasks') < 0) {
    sheet.insertColumnAfter(headers.length);
    sheet.getRange(1, headers.length + 1).setValue('Subtasks');
    headers.push('Subtasks');
    lower.push('subtasks');
    idCol = lower.indexOf('id');
  }

  var rows = sheet.getDataRange().getValues();

  if (data.id) {
    // Update row by ID
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][idCol]) === String(data.id)) {
        var rowNum = i + 1;
        var updatedRow = headers.map(function(h, j) {
          var key = h.toLowerCase();
          if (data[key] !== undefined) return data[key];
          return j < rows[i].length ? rows[i][j] : '';
        });
        sheet.getRange(rowNum, 1, 1, updatedRow.length).setValues([updatedRow]);
        return { id: data.id, updated: true };
      }
    }
  }

  // Insert baru
  var newId = data.id || Utilities.getUuid().slice(0, 8);
  var newRow = headers.map(function(h) {
    return data[h.toLowerCase()] !== undefined ? data[h.toLowerCase()] : '';
  });
  if (idCol >= 0) newRow[idCol] = newId;
  sheet.appendRow(newRow);
  return { id: newId, updated: false };
}

function deleteCalendarItem_(id, type) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = mapTypeToSheet_(type || 'task');
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  var headers = sheet.getDataRange().getValues()[0].map(String);
  var idCol = headers.map(function(h) { return h.toLowerCase(); }).indexOf('id');
  if (idCol < 0) return false;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function mapTypeToSheet_(type) {
  var key = (type || '').toLowerCase();
  if (key.endsWith('s')) key = key.slice(0, -1);
  var map = { task: 'Tasks', campaign: 'Tasks', event: 'Events', reminder: 'Reminders' };
  return map[key] || 'Tasks';
}

function createEventsSheet_(ss) {
  var sheet = ss.insertSheet('Events');
  sheet.appendRow(['ID', 'Nama', 'Mulai', 'Selesai', 'Deskripsi', 'Penyelenggara', 'Warna', 'Status', 'Tipe']);
  return sheet;
}

function createRemindersSheet_(ss) {
  var sheet = ss.insertSheet('Reminders');
  sheet.appendRow(['ID', 'Nama', 'Mulai', 'Selesai', 'Deskripsi', 'Warna', 'Status', 'Tipe']);
  return sheet;
}
