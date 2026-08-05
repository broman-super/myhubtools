// 1. MASUKIN API KEY GEMINI LU DI BAWAH INI
const GEMINI_API_KEY = 'AIzaSyBkaZBJpN3RXGDDcoEh6FrUNSR1KBbBO6o';

// ==========================================
// TIMEZONE CONFIGURATION - FORCE GMT+7
// ==========================================
const TIMEZONE = "Asia/Jakarta"; // GMT+7 - DIPAKSA PAKAI WAKTU JAKARTA

// ==========================================
// E2: GAS CacheService (5 menit)
// ==========================================
function getCachedDashboardData() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('dash_data_v2');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  var data = getAllDashboardData();
  try { cache.put('dash_data_v2', JSON.stringify(data), 300); } catch(e) {}
  return data;
}

// ==========================================
// E3: Error Retry Logic (exponential backoff)
// ==========================================
function fetchWithRetry(url, options, maxRetries) {
  maxRetries = maxRetries || 3;
  for (var i = 0; i < maxRetries; i++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() < 500) return response;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      Utilities.sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}

function doGet(e) {
  var action = e.parameter.action;
  
  // 1. Ambil Semua Data (Sistem 3 Kamar) — dengan cache
  if (action === 'getSalesData') {
    var result = getCachedDashboardData(); 
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Ambil Analisis AI Gemini (DIPINDAHKAN KE doPost UNTUK MENGHINDARI LIMIT URL GET)

  // 3. Simpan Target (dengan invalidasi cache)
  if (action === 'saveTarget') {
    try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}
    var target = e.parameter.value;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Settings");
    if (!sheet) {
      sheet = ss.insertSheet("Settings");
      sheet.appendRow(TAB_HEADERS_()["Settings"]);
      sheet.appendRow(["Target", target]);
    } else {
      var data = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 0; i < data.length; i++) {
        if (data[i][0] === "Target") {
          sheet.getRange(i+1, 2).setValue(target);
          found = true;
          break;
        }
      }
      if (!found) sheet.appendRow(["Target", target]);
    }
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 3.5. Tambah Biaya Baru ke Sheet "Biaya" (dengan invalidasi cache)
  if (action === 'addBiaya') {
    try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}
    var tanggal = e.parameter.tanggal;
    var kategori = e.parameter.kategori;
    var nominal = parseFloat(e.parameter.nominal) || 0;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Biaya");
    
    if (!sheet) {
      sheet = ss.insertSheet("Biaya");
      sheet.appendRow(TAB_HEADERS_()["Biaya"]);
    }
    
    sheet.appendRow([tanggal, kategori, nominal]);
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 4. TAMBAHKAN INI: Agar Iframe di ReynaHub Bisa Menampilkan File GitHub
  return HtmlService.createHtmlOutput("API ReynaHub V2 Active")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// FUNGSI UTAMA PENARIK DATA 3 SHEET
// ==========================================

// Header standar per tab — sumber tunggal untuk auto-create (hindari drift header)
function TAB_HEADERS_() {
  return {
    Transaksi: ['No. Transaksi', 'Tanggal', 'Nama Pelanggan', 'Nama Barang', 'Kuantitas', 'Total Harga', 'Tipe Transaksi', 'Nama Kategori Pelanggan', 'Status'],
    Produk: ['Nama Barang', 'Kode Series', 'Nama Series', 'Kategori Produk', 'HPP'],
    Biaya: ['Tanggal', 'Kategori Biaya', 'Nominal'],
    Settings: ['Key', 'Value']
  };
}

// Kalibrasi otomatis: buat tab + header bila tidak ada ATAU kosong. Balik true jika ada perubahan.
function pastikanTabAda_(ss, nama) {
  var headers = TAB_HEADERS_()[nama];
  if (!headers) return false;
  var sheet = ss.getSheetByName(nama);
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    var kosong = data.length === 0 || (data.length === 1 && String(data[0][0]).trim() === '');
    if (!kosong) return false;
    sheet.appendRow(headers);
    return true;
  }
  var created = ss.insertSheet(nama);
  created.appendRow(headers);
  return true;
}

function getAllDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Kalibrasi: auto-create tab yang hilang/kosong, lalu buang cache GAS supaya tidak nyajikan data lama
  var berubah = false;
  ['Transaksi', 'Produk', 'Biaya', 'Settings'].forEach(function(n) { if (pastikanTabAda_(ss, n)) berubah = true; });
  if (berubah) { try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {} }

  // PASTIKAN NAMA TAB DI EXCEL LU PERSIS SEPERTI INI (T, P, B huruf besar)
  var dataTransaksi = ambilDataDariSheet(ss, "Transaksi");
  var dataProduk    = ambilDataDariSheet(ss, "Produk");
  var dataBiaya     = ambilDataDariSheet(ss, "Biaya");
  var dataSettings  = ambilDataDariSheet(ss, "Settings");

  // Format baru yang dibaca oleh Web Dashboard
  return {
    transaksi: dataTransaksi,
    produk: dataProduk,
    biaya: dataBiaya,
    settings: dataSettings
  };
}

// Mesin Pembersih Baris Excel
function ambilDataDariSheet(ss, namaSheet) {
  var sheet = ss.getSheetByName(namaSheet);
  if (!sheet) return []; 

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; 
  
  var headers = data[0].map(function(h) { return h.toString().trim(); });
  var result = [];
  var tz = ss.getSpreadsheetTimeZone();

  function normHeader(h) {
    return (h || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function isDateHeader(h) {
    var n = normHeader(h);
    // umum dipakai di sheet dashboard ini
    if (n === "tanggal" || n === "date") return true;
    // fallback: header yang mengandung kata tanggal
    return n.indexOf("tanggal") !== -1;
  }
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] === "" && row[1] === "") continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];

      // Stabilkan format tanggal: selalu kirim yyyy-MM-dd tanpa shift timezone.
      if (isDateHeader(key)) {
        if (val instanceof Date) {
          obj[key] = Utilities.formatDate(val, tz, "yyyy-MM-dd");
        } else if (val !== null && val !== "") {
          var normalized = formatDate(val);
          obj[key] = normalized || val.toString().trim();
        } else {
          obj[key] = "";
        }
      } else {
        obj[key] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

// ==========================================
// FUNGSI GEMINI AI (SUDAH DIPERBAIKI)
// ==========================================
function getAnalysisFromGemini(promptText) {
  // INI KODE PEMBERSIHNYA (.trim() buat buang spasi nyelip)
  var cleanApiKey = GEMINI_API_KEY.trim();
  
  // Mempertahankan model gemini-1.5-flash
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + cleanApiKey;

  // PERBAIKAN: AI sekarang menerima "promptText" dari Web (yang udah berisi data Net Sales, Target, Opex, dll)
  var payload = {
    "contents": [{
      "parts": [{
        "text": promptText
      }]
    }]
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true 
  };
  
  try {
    var response = fetchWithRetry(url, options);
    var data = JSON.parse(response.getContentText());

    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return "Pesan dari Gemini: " + response.getContentText();
    }
  } catch (e) {
    return "Error di Apps Script: " + e.message;
  }
}

// ==========================================
// ENDPOINT POST UNTUK BULK UPSERT TRANSAKSI
// ==========================================
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    
    if (action === 'getAnalysis') {
      var context = requestData.context || "";
      var analysisText = getAnalysisFromGemini(context); 
      var hasilGemini = { analysis: analysisText };
      return ContentService.createTextOutput(JSON.stringify(hasilGemini))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'bulkUpsertTransactions') {
      var rows = requestData.rows;
      if (!rows || !Array.isArray(rows)) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Data Excel kosong atau format tidak valid!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // === E4: Validasi Data Backend ===
      var validationErrors = [];
      rows.forEach(function(r, idx) {
        var rowNum = idx + 2;
        var tgl = r.Tanggal || r.date || '';
        var nominal = parseFloat(String(r['Total Harga'] || r.Penjualan || r.Harga || r.Nilai || 0).replace(/[^0-9,-]/g, '').replace(/,/g, '.')) || 0;
        var qty = parseInt(String(r.Kuantitas || r.Qty || r.Jumlah || 0).replace(/[^0-9]/g, '')) || 0;
        if (qty < 0) validationErrors.push('Baris ' + rowNum + ': Kuantitas negatif (' + qty + ')');
        if (tgl && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(tgl).trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(String(tgl).trim())) {
          if (!isNaN(Date.parse(String(tgl)))) {} else {
            validationErrors.push('Baris ' + rowNum + ': Format tanggal tidak dikenal (' + tgl + ')');
          }
        }
      });
      if (validationErrors.length > 0) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "warning",
          message: validationErrors.join('; '),
          errors: validationErrors,
          proceed: true
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Transaksi");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Sheet 'Transaksi' tidak ditemukan di Spreadsheet Anda!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var sheetData = sheet.getDataRange().getValues();
      var headers = sheetData[0].map(function(h) { return h.toString().trim(); });
      
      // Cari index Primary Key jika ada (termasuk "nomor", "nomor #", "no #")
      var pkColIdx = -1;
      var pkCandidates = ["No. Transaksi", "No. Faktur", "No. Invoice", "No", "ID", "No. Pesanan", "Invoice", "ID Transaksi", "Nomor", "Nomor #", "No #", "No. #"];
      pkColIdx = findColIndex(headers, pkCandidates);
      
      // Cari index kolom penting untuk Fallback Composite Key
      var colIdxs = {
        tanggal: findColIndex(headers, ["Tanggal", "Date"]),
        pelanggan: findColIndex(headers, ["Nama Pelanggan", "Pelanggan", "Customer"]),
        barang: findColIndex(headers, ["Nama Barang", "Barang", "Produk", "Item"]),
        qty: findColIndex(headers, ["Kuantitas", "Qty", "Jumlah", "Quantity"]),
        harga: findColIndex(headers, ["Total Harga", "Penjualan", "Harga", "Nilai", "Amount"])
      };
      
      // Fungsi penentu unik untuk data baris sheet
      function getSheetRowKey(rowData) {
        var pkVal = "";
        if (pkColIdx !== -1 && rowData[pkColIdx] !== "") {
          pkVal = rowData[pkColIdx].toString().trim();
        }
        var barVal = colIdxs.barang !== -1 ? rowData[colIdxs.barang].toString().toUpperCase().trim() : "";
        
        if (pkVal !== "") {
          // Gabungkan PK dengan nama barang jika ada (mendukung multi-item)
          return barVal !== "" ? pkVal + "_" + barVal : pkVal;
        }
        
        var tgl = colIdxs.tanggal !== -1 ? (rowData[colIdxs.tanggal] ? rowData[colIdxs.tanggal].toString().trim() : "") : "";
        var pel = colIdxs.pelanggan !== -1 ? rowData[colIdxs.pelanggan].toString().toUpperCase().trim() : "";
        var qty = colIdxs.qty !== -1 ? parseInt(rowData[colIdxs.qty].toString().replace(/[^0-9]/g, '')) || 0 : 0;
        var hrg = colIdxs.harga !== -1 ? parseFloat(rowData[colIdxs.harga].toString().replace(/[^0-9,-]/g, '').replace(/,/g, '.')) || 0 : 0;
        return tgl + "_" + pel + "_" + barVal + "_" + qty + "_" + hrg;
      }
      
      // Indexing sheet yang ada saat ini
      var sheetMap = {};
      for (var i = 1; i < sheetData.length; i++) {
        var key = getSheetRowKey(sheetData[i]);
        if (key) {
          sheetMap[key] = {
            rowIdx: i + 1, // 1-based index
            data: sheetData[i]
          };
        }
      }
      
      // Invalidate cache karena data berubah
      try { CacheService.getScriptCache().remove('dash_data_v2'); } catch(e) {}

      var added = 0;
      var updated = 0;
      var skipped = 0;
      
      // Loop data Excel yang diunggah
      for (var u = 0; u < rows.length; u++) {
        var excelRow = rows[u];
        
        // Bentuk row values sesuai susunan header sheet
        var rowValues = [];
        for (var h = 0; h < headers.length; h++) {
            var headerName = headers[h];
            var val = findExcelValue(excelRow, headerName);

            // Kolom tanggal: langsung pakai string dari frontend (sudah YYYY-MM-DD)
            // Kolom lain tetap dinormalisasi
            if (h === colIdxs.qty) {
                val = val !== "" ? parseInt(val.toString().replace(/[^0-9]/g, '')) || 0 : 0;
            } else if (h === colIdxs.harga) {
                val = val !== "" ? parseFloat(val.toString().replace(/[^0-9,-]/g, '').replace(/,/g, '.')) || 0 : 0;
            } else if (h === colIdxs.tanggal) {
                // Simpan tanggal mentah sesuai format upload (locked: DD/MM/YYYY)
                val = val ? val.toString().trim() : "";
            } else {
                val = val ? val.toString().trim() : "";
            }
            rowValues.push(val);
        }
        
        // Tentukan key unik untuk baris excel
        var excelKey = "";
        var excelPkVal = "";
        if (pkColIdx !== -1) {
          var pkValRaw = findExcelValue(excelRow, headers[pkColIdx]);
          if (pkValRaw !== "") {
            excelPkVal = pkValRaw.toString().trim();
          }
        }
        var excelBarVal = colIdxs.barang !== -1 ? findExcelValue(excelRow, headers[colIdxs.barang]).toString().toUpperCase().trim() : "";
        
        if (excelPkVal !== "") {
          excelKey = excelBarVal !== "" ? excelPkVal + "_" + excelBarVal : excelPkVal;
        } else {
          var tgl = colIdxs.tanggal !== -1 ? findExcelValue(excelRow, headers[colIdxs.tanggal]) : "";
          var pel = colIdxs.pelanggan !== -1 ? findExcelValue(excelRow, headers[colIdxs.pelanggan]) : "";
          var qty = colIdxs.qty !== -1 ? findExcelValue(excelRow, headers[colIdxs.qty]) : "";
          var hrg = colIdxs.harga !== -1 ? findExcelValue(excelRow, headers[colIdxs.harga]) : "";
          
          var tglFmt = tgl ? tgl.toString().trim() : "";
          var pelUp = pel ? pel.toString().toUpperCase().trim() : "";
          var qtyVal = qty ? parseInt(qty.toString().replace(/[^0-9]/g, '')) || 0 : 0;
          var hrgVal = hrg ? parseFloat(hrg.toString().replace(/[^0-9,-]/g, '').replace(/,/g, '.')) || 0 : 0;
          
          excelKey = tglFmt + "_" + pelUp + "_" + excelBarVal + "_" + qtyVal + "_" + hrgVal;
        }
        
        if (sheetMap[excelKey]) {
          var existing = sheetMap[excelKey];
          var isDifferent = false;
          
          for (var c = 0; c < headers.length; c++) {
            var sheetValStr = existing.data[c] !== null ? existing.data[c].toString().trim() : "";
            var excelValStr = rowValues[c] !== null ? rowValues[c].toString().trim() : "";
            
            if (c === colIdxs.tanggal) {
              // Bandingkan tanggal mentah agar 100% identik dengan nilai upload.
              sheetValStr = existing.data[c] !== null ? existing.data[c].toString().trim() : "";
              excelValStr = rowValues[c] !== null ? rowValues[c].toString().trim() : "";
            }
            
            if (sheetValStr !== excelValStr) {
              isDifferent = true;
              break;
            }
          }
          
          if (isDifferent) {
            // Update baris di sheet
            sheet.getRange(existing.rowIdx, 1, 1, headers.length).setValues([rowValues]);
            // Update cache sheetMap
            sheetMap[excelKey].data = rowValues;
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Append baris baru
          sheet.appendRow(rowValues);
          var newRowIdx = sheet.getLastRow();
          sheetMap[excelKey] = {
            rowIdx: newRowIdx,
            data: rowValues
          };
          added++;
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        added: added,
        updated: updated,
        skipped: skipped
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Action tidak dikenali oleh backend!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// HELPER FUNCTIONS UNTUK PEMROSESAN DATA
// ==========================================
function findColIndex(headers, candidates) {
  for (var j = 0; j < headers.length; j++) {
    var hNorm = headers[j].toLowerCase().replace(/[^a-z0-9]/g, '');
    for (var k = 0; k < candidates.length; k++) {
      var candNorm = candidates[k].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (hNorm === candNorm) {
        return j;
      }
    }
  }
  return -1;
}

function findExcelValue(excelRow, headerName) {
  var hNorm = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (var key in excelRow) {
    var kNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (kNorm === hNorm) {
      return excelRow[key];
    }
  }
  return "";
}

// ==========================================
// PARSER TANGGAL KALENDER (selaras dengan Analytic.html)
// Prinsip: tanggal tanpa jam = tanggal kalender, tanpa shift timezone.
// ==========================================
function formatDate(d) {
  if (d === null || d === undefined) return "";

  var tz = TIMEZONE;
  try {
    tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  } catch (e) {}

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function getMonthMap() {
    return {
      'januari': 1, 'pebruari': 2, 'februari': 2, 'maret': 3, 'april': 4,
      'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8, 'september': 9,
      'oktober': 10, 'november': 11, 'desember': 12,
      'january': 1, 'february': 2, 'march': 3, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'october': 10, 'december': 12,
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7,
      'aug': 8, 'ags': 8, 'agu': 8, 'sep': 9, 'oct': 10, 'okt': 10,
      'nov': 11, 'dec': 12, 'des': 12
    };
  }

  // Serial Excel → UTC midnight; ambil komponen UTC (offset 25569 sudah benar)
  function excelSerialToYMD(serial) {
    if (serial === null || serial === undefined || serial === "") return "";
    var s = parseFloat(serial);
    if (isNaN(s)) return "";
    var day = Math.floor(s);
    if (day <= 0) return "";
    var date = new Date((day - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return "";
    return date.getUTCFullYear() + "-" + pad2(date.getUTCMonth() + 1) + "-" + pad2(date.getUTCDate());
  }

  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    return Utilities.formatDate(d, tz, "yyyy-MM-dd");
  }

  if (typeof d === 'number') {
    return excelSerialToYMD(d);
  }

  var s = d.toString().trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  var isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];

  if (/^\d+(\.\d+)?$/.test(s)) {
    var fromSerial = excelSerialToYMD(s);
    if (fromSerial) return fromSerial;
  }

  var dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    var dd = parseInt(dmyMatch[1], 10);
    var mm = parseInt(dmyMatch[2], 10);
    var yy = parseInt(dmyMatch[3], 10);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return yy + "-" + pad2(mm) + "-" + pad2(dd);
    }
  }

  var monthMap = getMonthMap();
  var strLow = s.toLowerCase();

  var dmyWord = strLow.match(/^(\d{1,2})[\s\-]+([a-z]+)[\s\-]+(\d{4})/);
  if (dmyWord) {
    var dDay = parseInt(dmyWord[1], 10);
    var dMon = monthMap[dmyWord[2]];
    var dYear = parseInt(dmyWord[3], 10);
    if (dDay >= 1 && dDay <= 31 && dMon && dYear > 1900) {
      return dYear + "-" + pad2(dMon) + "-" + pad2(dDay);
    }
  }

  var mdyWord = strLow.match(/^([a-z]+)[\s\-]+(\d{1,2})[,\s\-]+(\d{4})/);
  if (mdyWord) {
    var mMon = monthMap[mdyWord[1]];
    var mDay = parseInt(mdyWord[2], 10);
    var mYear = parseInt(mdyWord[3], 10);
    if (mDay >= 1 && mDay <= 31 && mMon && mYear > 1900) {
      return mYear + "-" + pad2(mMon) + "-" + pad2(mDay);
    }
  }

  var parts = s.split(/[^0-9]/);
  var nums = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== "" && !isNaN(parseInt(parts[i], 10))) {
      nums.push(parseInt(parts[i], 10));
    }
  }
  if (nums.length >= 3) {
    if (nums[0] >= 1 && nums[0] <= 31 && nums[1] >= 1 && nums[1] <= 12 && nums[2] > 1000) {
      return nums[2] + "-" + pad2(nums[1]) + "-" + pad2(nums[0]);
    }
    if (nums[0] > 1000 && nums[1] >= 1 && nums[1] <= 12 && nums[2] >= 1 && nums[2] <= 31) {
      return nums[0] + "-" + pad2(nums[1]) + "-" + pad2(nums[2]);
    }
  }

  return s;
}