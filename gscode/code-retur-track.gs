// code-retur-track.gs — GAS Backend for Retur Track Tool
// Sheet: "Tracking" — Kolom: Nomor Resi | Ekspedisi | Waktu Scan | Tanggal | Operator | Status

var SHEET_NAME = "Tracking";
var HEADERS = ["Nomor Resi", "Ekspedisi", "Waktu Scan", "Tanggal", "Operator", "Status"];

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ result: "ok" })).setMimeType(ContentService.MimeType.JSON);
}

var FN_MAP = {
  submitBatchData: submitBatchData,
  getTrackingHistory: getTrackingHistory,
  updateTrackingStatus: updateTrackingStatus,
  getExpeditionConfig: getExpeditionConfig,
  lookupExpedition: lookupExpedition
};

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var fn = params.function || params.action;
    var args = params.args || params.data || [];
    if (typeof FN_MAP[fn] !== "function") throw new Error("Function " + fn + " not found");
    var result = FN_MAP[fn].apply(null, args);
    return ContentService.createTextOutput(JSON.stringify({ success: true, result: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: String(err.message || err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  var lastCol = sheet.getLastColumn();
  var existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (existingHeaders.length < HEADERS.length || existingHeaders.join(",") !== HEADERS.join(",")) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

// Self-check prefix-learning (jalankan sekali sebagai fungsi GAS setelah deploy):
// REQUIRE hitungPrefix_(rows) mengenali JY dari contoh manual. Jalankan via Run > demoLookupExpedition_.
function demoLookupExpedition_() {
  var sample = [
    ['JY10001', 'J&T'], ['JY10002', 'J&T'], ['SPX9000', 'Shopee Xpress'], ['SP9001', 'Sicepat']
  ];
  var JY = applyLookup_(sample, 'JY10099');
  var SPX = applyLookup_(sample, 'SPX7777');
  var SP = applyLookup_(sample, 'SP1234');
  if (JY !== 'J&T') throw new Error('lookupExpedition JY gagal: ' + JY);
  if (SPX !== 'Shopee Xpress') throw new Error('lookupExpedition SPX gagal: ' + SPX);
  if (SP !== 'Sicepat') throw new Error('lookupExpedition SP gagal: ' + SP);
  Logger.log('demoLookupExpedition_ OK');
}

function applyLookup_(rows, resi) {
  var key = String(resi).toUpperCase().trim();
  var prefix = (key.match(/^[A-Z]+/) || [""])[0] || "";
  var prefixCount = {};
  rows.forEach(function(x) {
    var r = String(x[0]).toUpperCase().trim();
    var e = String(x[1] || "").trim();
    var p = (r.match(/^[A-Z]+/) || [""])[0] || "";
    if (!p || !e) return;
    if (!prefixCount[p]) prefixCount[p] = {};
    prefixCount[p][e] = (prefixCount[p][e] || 0) + 1;
  });
  if (prefix && prefixCount[prefix]) {
    var best = null, n = -1;
    for (var e in prefixCount[prefix]) if (prefixCount[prefix][e] > n) { n = prefixCount[prefix][e]; best = e; }
    return best;
  }
  return "";
}

function getColumnMap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return null;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < HEADERS.length; i++) {
    var idx = headers.indexOf(HEADERS[i]);
    if (idx !== -1) map[HEADERS[i]] = idx;
    else Logger.log('getColumnMap_: header "' + HEADERS[i] + '" not found, using index ' + i);
  }
  return map;
}

function parseToStandardDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  var str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  var match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    var d = match[1].padStart(2, '0');
    var m = match[2].padStart(2, '0');
    var y = match[3];
    return y + '-' + m + '-' + d;
  }
  var dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return null;
}

// === EXPEDITION CONFIG ===
var EXP_SHEET = "Ekspedisi";
var EXP_DEFAULTS = [
  ["JNE", "JNE"],
  ["J&T", "JT|JD|JY|JX|JP"],
  ["Shopee Xpress", "SPX|SX"],
  ["Sicepat", "SP|SI"],
  ["AnterAja", "AA"],
  ["Ninja", "NV|NI|NINJA"],
  ["Pos Indonesia", "RP|RO|RC|POS"],
  ["Tiki", "TI"],
  ["Wahana", "WH"],
  ["Lion Parcel", "LP"],
  ["Paxel", "PX"],
  ["GoSend", "GO"],
  ["GrabExpress", "GR|GRAB"]
];

function getExpeditionConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EXP_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(EXP_SHEET);
    sheet.getRange(1, 1, 1, 2).setValues([["Nama", "Regex"]]);
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1, EXP_DEFAULTS.length, 2).setValues(EXP_DEFAULTS);
  }
  // Default kode selalu menang untuk nama baku (deploy lama yang regex-nya basi
  // otomatis ter-fix, mis. J&T tanpa JY/JD/JX). Isi sheet menambah ekspedisi baru.
  var extra = {};
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var n = String(data[i][0] || "").trim();
    var r = String(data[i][1] || "").trim();
    if (n && r) extra[n] = r;
  }
  var result = EXP_DEFAULTS.map(function(d) { return { name: d[0], regex: d[1] }; });
  var seen = {};
  EXP_DEFAULTS.forEach(function(d) { seen[d[0]] = true; });
  for (var name in extra) {
    if (!seen[name]) result.push({ name: name, regex: extra[name] });
  }
  return result;
}

// === LOOKUP EXPEDITION ===
// 1) Exact match (huruf besar) dengan baris riwayat — resi yang sama pernah di-scan.
// 2) Prefix-learning: bila resi baru, ambil awalan huruf (mis. "JY", "SPX", "CM")
//    dari baris yang SUDAH diklasifikasi manual di sheet, kembalikan ekspedisi
//    yang paling sering dipakai untuk awalan itu. Tie → baris paling baru.
function lookupExpedition(resi) {
  try {
    var sheet = getOrCreateSheet_();
    var data = sheet.getDataRange().getValues();
    var key = String(resi || "").toUpperCase().trim();
    if (!key) return "";
    var prefix = (key.match(/^[A-Z]+/) || [""])[0] || "";

    var exactSeen = {};
    var prefixCount = {};
    var prefixAge = {};
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var r = String(data[i][0] || "").toUpperCase().trim();
      var e = String(data[i][1] || "").trim();
      if (!r || !e) continue;
      rows.push({ r: r, e: e, idx: i });
    }
    // exact match — paling baru menang
    rows.forEach(function(x) { exactSeen[x.r] = x.e; });
    if (exactSeen[key]) return exactSeen[key];

    // prefix — pakai contoh dengan awalan huruf sama
    rows.forEach(function(x) {
      var p = (x.r.match(/^[A-Z]+/) || [""])[0] || "";
      if (!p) return;
      if (!prefixCount[p]) { prefixCount[p] = {}; prefixAge[p] = 0; }
      prefixCount[p][x.e] = (prefixCount[p][x.e] || 0) + 1;
      prefixAge[p] = Math.max(prefixAge[p], x.idx);
    });
    if (prefix && prefixCount[prefix]) {
      var counts = prefixCount[prefix];
      var best = null, bestN = -1;
      for (var e in counts) {
        if (counts[e] > bestN) { bestN = counts[e]; best = e; }
      }
      if (best) return best;
    }
  } catch (e) { Logger.log('lookupExpedition error: ' + String(e)); }
  return "";
}

// === SUBMIT BATCH DATA ===
function submitBatchData(stagingData) {
  try {
    var sheet = getOrCreateSheet_();
    var tz = Session.getScriptTimeZone();
    var now = new Date();

    // Ensure all columns exist in HEADERS order
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var hi = 0; hi < HEADERS.length; hi++) {
      if (existingHeaders.indexOf(HEADERS[hi]) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(HEADERS[hi]);
      }
    }
    // Rewrite header row to guarantee correct order
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

    var colMap = getColumnMap_();
    if (!colMap) throw new Error('Column mapping failed');
    var rows = [];
    for (var i = 0; i < stagingData.length; i++) {
      var d = stagingData[i];
      var ts = d.timestamp ? new Date(Number(d.timestamp)) : now;
      var ds = Utilities.formatDate(ts, tz, "yyyy-MM-dd");
      var ws = Utilities.formatDate(ts, tz, "HH:mm:ss");
      var operator = d.operator || '';
      var rowArr = new Array(HEADERS.length).fill('');
      rowArr[colMap['Nomor Resi']] = d.resi || '';
      rowArr[colMap['Ekspedisi']] = d.ekspedisi || '';
      rowArr[colMap['Waktu Scan']] = ws;
      rowArr[colMap['Tanggal']] = ds;
      rowArr[colMap['Operator']] = operator;
      rowArr[colMap['Status']] = 'Pending';
      rows.push(rowArr);
    }
    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: String(e.message || e) };
  }
}

// === GET TRACKING HISTORY ===
function getTrackingHistory(filter) {
  try {
    var sheet = getOrCreateSheet_();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, groups: [] };

    var colMap = getColumnMap_();
    var idxResi = colMap && colMap["Nomor Resi"] >= 0 ? colMap["Nomor Resi"] : 0;
    var idxExp  = colMap && colMap["Ekspedisi"]   >= 0 ? colMap["Ekspedisi"]   : 1;
    var idxWkt  = colMap && colMap["Waktu Scan"]  >= 0 ? colMap["Waktu Scan"]  : 2;
    var idxTgl  = colMap && colMap["Tanggal"]     >= 0 ? colMap["Tanggal"]     : 3;
    var idxOp   = colMap && colMap["Operator"]    >= 0 ? colMap["Operator"]    : -1;
    var idxSts  = colMap && colMap["Status"]      >= 0 ? colMap["Status"]      : 5;

    var tz = Session.getScriptTimeZone();
    var today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    var cutoff7 = new Date(); cutoff7.setDate(cutoff7.getDate() - 7);
    var cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
    var str7 = Utilities.formatDate(cutoff7, tz, "yyyy-MM-dd");
    var str30 = Utilities.formatDate(cutoff30, tz, "yyyy-MM-dd");

    var groupsMap = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var resi = String(row[idxResi] || "").trim();
      if (!resi) continue;

      var ekspedisi = String(row[idxExp] || "").trim();
      var waktu = String(row[idxWkt] || "").trim();
      var rawDate = row[idxTgl];
      var operator = idxOp >= 0 ? String(row[idxOp] || "").trim() : "";
      var status = idxSts < row.length ? String(row[idxSts] || "Pending") : "Pending";

      var rowDate = parseToStandardDate_(rawDate);
      if (!rowDate) { Logger.log('getTrackingHistory: skip row ' + i + ' unparseable date "' + rawDate + '"'); continue; }

      // Apply filter
      if (filter === "today" && rowDate !== today) continue;
      if (filter === "7days" && rowDate < str7) continue;
      if (filter === "30days" && rowDate < str30) continue;

      var dateObj = new Date(rowDate + "T12:00:00");
      var months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      var label = dateObj.getDate() + " " + months[dateObj.getMonth()] + " " + dateObj.getFullYear();

      if (!groupsMap[label]) {
        groupsMap[label] = { label: label, summary: "", total: 0, items: [] };
      }
      groupsMap[label].items.push({
        row: i + 1,
        resi: resi,
        ekspedisi: ekspedisi,
        tanggal: rowDate,
        waktu: waktu,
        operator: operator,
        status: status
      });
    }

    var groups = Object.keys(groupsMap).sort(function(a, b) {
      var da = new Date(a.replace(/(\d+)\s+(\w+)\s+(\d+)/, "$1 $2 $3"));
      var db = new Date(b.replace(/(\d+)\s+(\w+)\s+(\d+)/, "$1 $2 $3"));
      return db - da;
    }).map(function(key) {
      var g = groupsMap[key];
      g.total = g.items.length;

      var pending = g.items.filter(function(it) { return it.status === "Pending"; }).length;
      var parts = [];
      if (pending > 0) parts.push(pending + " pending");
      var expCount = {};
      g.items.forEach(function(it) { expCount[it.ekspedisi] = (expCount[it.ekspedisi] || 0) + 1; });
      var expStr = Object.keys(expCount).sort().map(function(k) { return k + ":" + expCount[k]; }).join(" ");
      parts.push(expStr);
      g.summary = parts.join(" — ");

      return g;
    });

    return { success: true, groups: groups };
  } catch (e) {
    return { success: false, message: String(e.message || e), groups: [] };
  }
}

// === UPDATE TRACKING STATUS ===
function updateTrackingStatus(rowNum, status) {
  try {
    var sheet = getOrCreateSheet_();
    var colMap = getColumnMap_();
    var idxSts = colMap && colMap["Status"] >= 0 ? colMap["Status"] : 4;
    sheet.getRange(rowNum, idxSts + 1).setValue(status);
    return { success: true };
  } catch (e) {
    return { success: false, message: String(e.message || e) };
  }
}
