// === SHEETS ===
// "Events" — ID | Nama | Mulai | Selesai | Deskripsi | Penyelenggara | Warna | Status | Tipe
// "Reminders" — ID | Nama | Mulai | Selesai | Deskripsi | Warna | Status | Tipe
// "Tasks" — existing sheet reused (query via doGet/?action=getTasks)

// ponytail: shared doPost router — add new actions alongside existing ones
function doPost(e) {
  var res = { success: false, message: '' };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    if (action === 'getCalendarData') {
      res.result = getCalendarData_();
    } else if (action === 'saveCalendarItem' || action === 'saveTask') {
      res.result = saveCalendarItem_(params.data);
    } else if (action === 'deleteCalendarItem' || action === 'deleteTask') {
      res.result = deleteCalendarItem_(params.data.id, params.data.type);
    } else {
      res.message = 'Unknown action: ' + action;
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }
    res.success = true;
  } catch (e) {
    res.message = String(e.message || e);
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function getCalendarData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tasks = getSheetData_(ss, 'Tasks');
  var campaigns = tasks.filter(function(r) { return (r.type || '').toLowerCase() === 'campaign'; });
  var plainTasks = tasks.filter(function(r) { return (r.type || '').toLowerCase() !== 'campaign'; });
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
  var idCol = headers.indexOf('ID');
  var rows = sheet.getDataRange().getValues();

  if (data.id) {
    // Update row by ID
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][idCol]) === String(data.id)) {
        var rowNum = i + 1;
        headers.forEach(function(h, j) {
          var key = h.toLowerCase();
          if (data[key] !== undefined) sheet.getRange(rowNum, j + 1).setValue(data[key]);
        });
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
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function mapTypeToSheet_(type) {
  var map = { task: 'Tasks', campaign: 'Tasks', event: 'Events', reminder: 'Reminders' };
  return map[type] || 'Tasks';
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
