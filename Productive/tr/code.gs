/**
 * SUPERSUB - Activity Tracker & Workload System (Backend API)
 * Zona waktu tetap: Asia/Jakarta (GMT+7), format 24 jam.
 */

var APP_TIMEZONE = 'Asia/Jakarta';
var MAX_BACKDATE_DAYS = 30;
var USERS_CACHE_KEY = 'users_db_v1';
var USERS_CACHE_TTL = 600;

function formatDateJakarta(date) {
  return Utilities.formatDate(new Date(date), APP_TIMEZONE, 'yyyy-MM-dd');
}

function getTodayJakarta() {
  return formatDateJakarta(new Date());
}

function buildActivityTimestamp(tanggalStr, mulaiStr) {
  var mulai = mulaiStr || '00:00';
  var dateParts = tanggalStr.split('-');
  var timeParts = mulai.split(':');
  var h = parseInt(timeParts[0], 10) || 0;
  var m = parseInt(timeParts[1], 10) || 0;
  var pad = function(n) { return (n < 10 ? '0' : '') + n; };
  var iso = dateParts[0] + '-' + dateParts[1] + '-' + dateParts[2] + ' ' +
    pad(h) + ':' + pad(m) + ':00';
  return Utilities.parseDate(iso, APP_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function validateActivityDateStr(tanggalStr) {
  if (!tanggalStr || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) {
    return { valid: false, msg: 'Format tanggal aktivitas tidak valid.' };
  }
  var today = getTodayJakarta();
  if (tanggalStr > today) {
    return { valid: false, msg: 'Tanggal aktivitas tidak boleh di masa depan (WIB).' };
  }
  var oldestDate = new Date(buildActivityTimestamp(today, '00:00').getTime());
  oldestDate.setDate(oldestDate.getDate() - MAX_BACKDATE_DAYS);
  var oldestStr = formatDateJakarta(oldestDate);
  if (tanggalStr < oldestStr) {
    return { valid: false, msg: 'Input hanya boleh hingga ' + MAX_BACKDATE_DAYS + ' hari ke belakang.' };
  }
  return { valid: true };
}

function timeToMinutesGAS(tStr) {
  if (!tStr) return 0;
  var parts = tStr.toString().trim().split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function minutesToDurationLabel(mins) {
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  return h + 'j ' + (m < 10 ? '0' : '') + m + 'm';
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'active',
    message: 'SUPERSUB Backend is running!',
    timezone: APP_TIMEZONE
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var response = { success: false, msg: 'Metode tidak dikenal.' };

  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    if (action === 'checkLogin') {
      response = checkLogin(requestData.username, requestData.password);
    } else if (action === 'submitActivity') {
      response = submitActivity(requestData.data);
    } else if (action === 'getSPVSummary') {
      response = { success: true, data: getSPVSummary(requestData.startDate, requestData.endDate) };
    } else if (action === 'getDashboardBundle') {
      response = {
        success: true,
        data: getDashboardBundle(requestData.startDate, requestData.endDate)
      };
    } else if (action === 'getUserActivities') {
      var histStart = requestData.startDate || requestData.date;
      var histEnd = requestData.endDate || histStart;
      response = { success: true, data: getUserActivities(requestData.username, histStart, histEnd) };
    } else if (action === 'getYesterdayActivities') {
      response = {
        success: true,
        data: getYesterdayActivities(requestData.username)
      };
    } else if (action === 'getDayDuration') {
      response = {
        success: true,
        data: getDayDurationSummary(requestData.username, requestData.tanggal)
      };
    } else if (action === 'getCrossOverlap') {
      response = {
        success: true,
        data: getCrossUserOverlapAudit(requestData.startDate, requestData.endDate)
      };
    } else if (action === 'exportCsv') {
      response = { success: true, data: exportActivitiesCsv(requestData.startDate, requestData.endDate) };
    } else if (action === 'exportUserCsv') {
      response = {
        success: true,
        data: exportUserActivitiesCsv(
          requestData.username,
          requestData.startDate,
          requestData.endDate || requestData.startDate
        )
      };
    } else if (action === 'getUsersList') {
      response = { success: true, data: getUsersList() };
    } else if (action === 'deleteActivity') {
      response = deleteActivity(requestData.rowIndex, requestData.username);
    } else if (action === 'editActivity') {
      response = editActivity(requestData.rowIndex, requestData.username, requestData.data);
    }
  } catch (err) {
    response = { success: false, msg: 'Error backend: ' + err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function getLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Log_Aktivitas');
  if (!sheet) {
    sheet = ss.insertSheet('Log_Aktivitas');
    sheet.appendRow([
      'Timestamp', 'Tanggal_Log', 'Nama', 'Fungsi', 'Tipe_Tugas', 'Beban',
      'Aktivitas', 'Waktu_Mulai', 'Waktu_Selesai', 'Output'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }
  ensureLogSheetStructure(sheet);
  return sheet;
}

function ensureLogSheetStructure(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var hasTanggalLog = false;
  for (var i = 0; i < headers.length; i++) {
    if ((headers[i] || '').toString().trim() === 'Tanggal_Log') {
      hasTanggalLog = true;
      break;
    }
  }
  if (!hasTanggalLog) {
    sheet.insertColumnAfter(1);
    sheet.getRange(1, 2).setValue('Tanggal_Log');
    var lastRow = sheet.getLastRow();
    for (var r = 2; r <= lastRow; r++) {
      var ts = sheet.getRange(r, 1).getValue();
      if (ts) {
        sheet.getRange(r, 2).setValue(formatDateJakarta(ts));
      }
    }
  }
}

function getLogColumnMap(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var indexOf = function(name) {
    for (var i = 0; i < headers.length; i++) {
      if ((headers[i] || '').toString().trim() === name) return i;
    }
    return -1;
  };
  var hasTanggalLog = indexOf('Tanggal_Log') >= 0;
  return {
    hasTanggalLog: hasTanggalLog,
    tanggalLog: indexOf('Tanggal_Log'),
    nama: indexOf('Nama') >= 0 ? indexOf('Nama') : (hasTanggalLog ? 2 : 1),
    fungsi: indexOf('Fungsi') >= 0 ? indexOf('Fungsi') : (hasTanggalLog ? 3 : 2),
    tipe: indexOf('Tipe_Tugas') >= 0 ? indexOf('Tipe_Tugas') : (hasTanggalLog ? 4 : 3),
    beban: indexOf('Beban') >= 0 ? indexOf('Beban') : (hasTanggalLog ? 5 : 4),
    aktivitas: indexOf('Aktivitas') >= 0 ? indexOf('Aktivitas') : (hasTanggalLog ? 6 : 5),
    mulai: indexOf('Waktu_Mulai') >= 0 ? indexOf('Waktu_Mulai') : (hasTanggalLog ? 7 : 6),
    selesai: indexOf('Waktu_Selesai') >= 0 ? indexOf('Waktu_Selesai') : (hasTanggalLog ? 8 : 7),
    output: indexOf('Output') >= 0 ? indexOf('Output') : (hasTanggalLog ? 9 : 8)
  };
}

function cellVal(row, idx) {
  if (idx < 0 || idx >= row.length) return '';
  var v = row[idx];
  return v == null ? '' : v;
}

function getRowTanggalLog(row, colMap) {
  if (colMap.tanggalLog >= 0) {
    var s = cellVal(row, colMap.tanggalLog).toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  if (row[0]) return formatDateJakarta(row[0]);
  return '';
}

function normalizePersonName(val) {
  return (val || '').toString().trim();
}

function isKnownDivisiLabel(name) {
  var n = normalizePersonName(name).toLowerCase();
  if (!n) return true;
  var labels = [
    'manajemen', 'sales/cs', 'sales / cs', 'marketing/kreatif', 'marketing / kreatif',
    'operasional', 'keuangan/admin', 'keuangan / admin', 'r&d', 'r&d / riset'
  ];
  for (var i = 0; i < labels.length; i++) {
    if (n === labels[i]) return true;
  }
  return false;
}

function isRegisteredUser(name) {
  var n = normalizePersonName(name).toLowerCase();
  if (!n) return false;
  var users = getCachedUsers(false);
  for (var i = 0; i < users.length; i++) {
    if (users[i].name.toLowerCase() === n) return true;
  }
  return false;
}

function rowToActivityObject(row, rowIndex1Based, colMap) {
  var tanggal = getRowTanggalLog(row, colMap);
  var rawNama = normalizePersonName(cellVal(row, colMap.nama));
  var rawFungsi = normalizePersonName(cellVal(row, colMap.fungsi));
  var nama = rawNama;

  // Perbaiki baris lama / salah kolom: jika "nama" berisi label divisi, abaikan baris
  if (isKnownDivisiLabel(nama)) {
    return null;
  }

  var startTime = formatTimeCell(cellVal(row, colMap.mulai));
  var endTime = formatTimeCell(cellVal(row, colMap.selesai));
  return {
    rowIndex: rowIndex1Based,
    nama: nama,
    kategori: rawFungsi || 'Operasional',
    tipe: normalizePersonName(cellVal(row, colMap.tipe)),
    beban: normalizePersonName(cellVal(row, colMap.beban)),
    aktivitas: normalizePersonName(cellVal(row, colMap.aktivitas)),
    mulai: startTime,
    selesai: endTime,
    durasi: startTime + ' - ' + endTime,
    output: normalizePersonName(cellVal(row, colMap.output)),
    tanggal: tanggal
  };
}

function getUsersFromSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Daftar_User');

  var defaultUsers = [
    ['Firman', 'SPV', 'Admin@'],
    ['Bono', 'SMS', '1'],
    ['Nesa', 'CSO', '1'],
    ['Salsa', 'Akutansi', '1'],
    ['Fathan', 'R&D', '1'],
    ['Yudi', 'Logistik', '1']
  ];

  if (!sheet) {
    sheet = ss.insertSheet('Daftar_User');
    sheet.appendRow(['Nama', 'Role', 'Password']);
    sheet.getRange('A1:C1').setFontWeight('bold');
    for (var i = 0; i < defaultUsers.length; i++) {
      sheet.appendRow(defaultUsers[i]);
    }
  }

  var data = sheet.getDataRange().getValues();
  data.shift();
  var usersList = [];
  for (var j = 0; j < data.length; j++) {
    if (data[j][0]) {
      usersList.push({
        name: data[j][0].toString().trim(),
        role: data[j][1].toString().trim(),
        pass: data[j][2].toString().trim()
      });
    }
  }
  return usersList;
}

function getCachedUsers(forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    var cached = cache.get(USERS_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
  }
  var users = getUsersFromSpreadsheet();
  cache.put(USERS_CACHE_KEY, JSON.stringify(users), USERS_CACHE_TTL);
  return users;
}

function getUsersList() {
  return getCachedUsers(false).map(function(u) {
    return { name: u.name, role: u.role };
  });
}

function checkLogin(username, password) {
  var user = username.toString().trim();
  var pass = password.toString().trim();
  var userDb = getCachedUsers(false);
  var found = userDb.find(function(u) {
    return u.name.toLowerCase() === user.toLowerCase() && u.pass === pass;
  });
  if (found) {
    return { success: true, role: found.role, name: found.name };
  }
  return { success: false, msg: 'Kredensial Otoritas Tidak Valid.' };
}

function submitActivity(data) {
  var tanggal = (data.tanggal || '').toString().trim() || getTodayJakarta();
  var dateCheck = validateActivityDateStr(tanggal);
  if (!dateCheck.valid) {
    return { success: false, msg: dateCheck.msg };
  }

  var sheet = getLogSheet();
  var ts = buildActivityTimestamp(tanggal, data.mulai);

  sheet.appendRow([
    ts,
    tanggal,
    data.name,
    data.kategori,
    data.tipe,
    data.beban,
    data.deskripsi,
    data.mulai,
    data.selesai,
    data.output
  ]);

  return { success: true, msg: 'Aktivitas terekam untuk tanggal ' + tanggal + ' (WIB).' };
}

function filterActivitiesByDateRange(startDate, endDate) {
  var sheet = getLogSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var colMap = getLogColumnMap(sheet);
  var startStr = startDate;
  var endStr = endDate || startDate;
  var filtered = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var rowDateStr = getRowTanggalLog(row, colMap);
    if (rowDateStr >= startStr && rowDateStr <= endStr) {
      var act = rowToActivityObject(row, i + 1, colMap);
      if (act && act.nama && isRegisteredUser(act.nama)) {
        filtered.push(act);
      }
    }
  }
  return filtered;
}

function getSPVSummary(startDate, endDate) {
  var staffList = getUsersList();
  return {
    activities: filterActivitiesByDateRange(startDate, endDate),
    staff: staffList
  };
}

function getUserActivities(username, startDate, endDate) {
  var all = filterActivitiesByDateRange(startDate, endDate);
  var uname = username.toLowerCase();
  return all.filter(function(a) {
    return (a.nama || '').toString().trim().toLowerCase() === uname;
  });
}

function getYesterdayJakarta() {
  var today = buildActivityTimestamp(getTodayJakarta(), '12:00');
  today.setDate(today.getDate() - 1);
  return formatDateJakarta(today);
}

function getYesterdayActivities(username) {
  var y = getYesterdayJakarta();
  return getUserActivities(username, y, y);
}

function getDayDurationSummary(username, tanggal) {
  var acts = getUserActivities(username, tanggal, tanggal);
  var totalMinutes = 0;
  acts.forEach(function(a) {
    var times = (a.durasi || '0:00 - 0:00').split(' - ');
    var dur = Math.max(0, timeToMinutesGAS(times[1]) - timeToMinutesGAS(times[0]));
    totalMinutes += dur;
  });
  return {
    tanggal: tanggal,
    count: acts.length,
    totalMinutes: totalMinutes,
    totalHours: (totalMinutes / 60).toFixed(1),
    label: minutesToDurationLabel(totalMinutes)
  };
}

function getCrossUserOverlapAudit(startDate, endDate) {
  var activities = filterActivitiesByDateRange(startDate, endDate);
  var byDate = {};
  var overlaps = [];

  activities.forEach(function(a) {
    var d = a.tanggal || 'unknown';
    if (!byDate[d]) byDate[d] = [];
    var times = (a.durasi || '0:00 - 0:00').split(' - ');
    byDate[d].push({
      nama: a.nama,
      start: timeToMinutesGAS(times[0]),
      end: timeToMinutesGAS(times[1]),
      aktivitas: a.aktivitas,
      kategori: a.kategori,
      durasi: a.durasi
    });
  });

  Object.keys(byDate).forEach(function(date) {
    var list = byDate[date];
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        if (list[i].nama === list[j].nama) continue;
        if (list[i].start < list[j].end && list[j].start < list[i].end) {
          var oStart = Math.max(list[i].start, list[j].start);
          var oEnd = Math.min(list[i].end, list[j].end);
          overlaps.push({
            tanggal: date,
            userA: list[i].nama,
            userB: list[j].nama,
            actA: list[i].aktivitas,
            actB: list[j].aktivitas,
            durasiA: list[i].durasi,
            durasiB: list[j].durasi,
            overlapMinutes: Math.max(0, oEnd - oStart)
          });
        }
      }
    }
  });

  return {
    count: overlaps.length,
    items: overlaps,
    note: 'Overlap lintas user = indikator beban kerja paralel, bukan error.'
  };
}

function getDashboardBundle(startDate, endDate) {
  var end = endDate || startDate;
  return {
    spvSummary: getSPVSummary(startDate, end),
    crossOverlap: getCrossUserOverlapAudit(startDate, end)
  };
}

function exportUserActivitiesCsv(username, startDate, endDate) {
  var activities = getUserActivities(username, startDate, endDate);
  var lines = [
    'Tanggal_Log,Nama,Fungsi,Tipe_Tugas,Beban,Aktivitas,Waktu_Mulai,Waktu_Selesai,Output'
  ];
  activities.forEach(function(a) {
    var times = (a.durasi || ' - ').split(' - ');
    lines.push([
      a.tanggal,
      csvEscape(a.nama),
      csvEscape(a.kategori),
      csvEscape(a.tipe),
      csvEscape(a.beban),
      csvEscape(a.aktivitas),
      times[0] || '',
      times[1] || '',
      csvEscape(a.output)
    ].join(','));
  });
  var endStr = endDate || startDate;
  return {
    csv: lines.join('\n'),
    filename: 'riwayat_' + username.replace(/\s+/g, '_') + '_' + startDate +
      (endStr !== startDate ? '_' + endStr : '') + '.csv'
  };
}

function exportActivitiesCsv(startDate, endDate) {
  var activities = filterActivitiesByDateRange(startDate, endDate || startDate);
  var lines = [
    'Tanggal_Log,Nama,Fungsi,Tipe_Tugas,Beban,Aktivitas,Waktu_Mulai,Waktu_Selesai,Output'
  ];

  activities.forEach(function(a) {
    var times = (a.durasi || ' - ').split(' - ');
    var row = [
      a.tanggal,
      csvEscape(a.nama),
      csvEscape(a.kategori),
      csvEscape(a.tipe),
      csvEscape(a.beban),
      csvEscape(a.aktivitas),
      times[0] || '',
      times[1] || '',
      csvEscape(a.output)
    ];
    lines.push(row.join(','));
  });

  var endStr = endDate || startDate;
  return {
    csv: lines.join('\n'),
    filename: 'log_aktivitas_' + startDate + (endStr !== startDate ? '_' + endStr : '') + '.csv'
  };
}

function csvEscape(val) {
  var s = (val == null ? '' : val).toString();
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function deleteActivity(rowIndex, username) {
  try {
    var sheet = getLogSheet();
    var maxRow = sheet.getLastRow();
    if (rowIndex < 2 || rowIndex > maxRow) {
      return { success: false, msg: 'Baris tidak valid atau sudah tidak ada.' };
    }
    var rowName = sheet.getRange(rowIndex, 3).getValue().toString().trim();
    if (rowName.toLowerCase() !== username.toLowerCase().trim()) {
      return { success: false, msg: 'Otoritas ditolak. Anda tidak berhak menghapus log ini.' };
    }
    sheet.deleteRow(rowIndex);
    return { success: true, msg: 'Aktivitas berhasil dihapus secara permanen.' };
  } catch (err) {
    return { success: false, msg: 'Gagal menghapus backend: ' + err.toString() };
  }
}

function editActivity(rowIndex, username, data) {
  try {
    var sheet = getLogSheet();
    var maxRow = sheet.getLastRow();
    if (rowIndex < 2 || rowIndex > maxRow) {
      return { success: false, msg: 'Baris tidak valid atau sudah tidak ada.' };
    }
    var rowName = sheet.getRange(rowIndex, 3).getValue().toString().trim();
    if (rowName.toLowerCase() !== username.toLowerCase().trim()) {
      return { success: false, msg: 'Otoritas ditolak. Anda tidak berhak mengedit log ini.' };
    }
    sheet.getRange(rowIndex, 4).setValue(data.kategori);
    sheet.getRange(rowIndex, 5).setValue(data.tipe);
    sheet.getRange(rowIndex, 6).setValue(data.beban);
    sheet.getRange(rowIndex, 7).setValue(data.deskripsi);
    sheet.getRange(rowIndex, 8).setValue(data.mulai);
    sheet.getRange(rowIndex, 9).setValue(data.selesai);
    sheet.getRange(rowIndex, 10).setValue(data.output);
    return { success: true, msg: 'Perubahan aktivitas berhasil disimpan.' };
  } catch (err) {
    return { success: false, msg: 'Gagal memperbarui backend: ' + err.toString() };
  }
}

function formatTimeCell(val) {
  if (!val) return '00:00';
  if (val instanceof Date) {
    return Utilities.formatDate(val, APP_TIMEZONE, 'HH:mm');
  }
  var str = val.toString().trim();
  if (str.match(/^\d{1,2}:\d{2}$/) || str.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
    var parts = str.split(':');
    var hStr = parts[0];
    var mStr = parts[1];
    if (hStr.length < 2) hStr = '0' + hStr;
    return hStr + ':' + mStr;
  }
  if (str.indexOf('GMT') !== -1 || str.indexOf('Dec 30 1899') !== -1) {
    var d = new Date(val);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, APP_TIMEZONE, 'HH:mm');
    }
  }
  return str;
}
