# Artifact — Breakdown Lengkap Logika & Alur SAS (Sales Analytic Simplify)

Dokumen ini menelusuri **semua logika, alur data, dan bagian kode** dari webtool Analytic apa adanya saat ini (tanpa perubahan). Dibuat dari pembacaan menyeluruh kedua file sumber:

| File | Ukuran | Isi |
|---|---|---|
| `Productive/analytic/Analytic.html` | ±231.883 bytes / 4270 baris | Frontend mandiri (HTML+CSS inline+JS) |
| `gscode/code-analytic.gs` | ±21.841 bytes / 585 baris | Backend Google Apps Script |

---

## 1. Arsitektur & Prinsip Dasar

```
Google Spreadsheet (3 kamar data + settings)
        │
        ▼
Google Apps Script Web App  (code-analytic.gs, di-deploy /exec)
   - doGet / doPost, cache 5 menit, retry 3x, forced GMT+7
        │  JSON
        ▼
Analytic.html (iframe di hub REYNAHUB)
   - auth lokal (sessionStorage)
   - fetch → parse (olahDataMentah) → render (prosesData)
   - cache offline (localStorage)
```

### 1.1 Titik masuk & identitas
- `<title>`: `SAS - SALES ANALYTIC SIMPLIFY - Bento Edition` (L8).
- `API_URL` di `Analytic.html:1369` menunjuk Web App GAS:
  `https://script.google.com/macros/s/AKfycbx0OmcRVvhCSmX9r4J-RBsejZ_Th0fdfy46TaaPsdx6r1RxczSmmfcfeTHJe4fIFb1HEw/exec`
- Dimuat hub via iframe; tema di-swap lewat `postMessage` `SET_THEME` (L4262-4267).

### 1.2 Kontrak aksi backend (permukaan API)
| Aksi | Method | Fungsi frontend |
|---|---|---|
| `getSalesData` | GET | `syncDashboardData()` / `initDashboard()` |
| `saveTarget` | GET | `saveTargetToGAS()` |
| `addBiaya` | GET | `saveExpenseToGAS()` |
| `getAnalysis` | POST | `mintaSaranAI()` |
| `bulkUpsertTransactions` | POST | `sendExcelToGAS()` |

---

## 2. Model Data (Sumber di Google Sheets)

Dibaca oleh `getAllDashboardData()` (`code-analytic.gs:108`) dari 4 tab dengan nama **persis** huruf besar: `Transaksi`, `Produk`, `Biaya`, `Settings`. Output JSON:

```json
{ "transaksi": [...], "produk": [...], "biaya": [...], "settings": [...] }
```

### 2.1 Tab Transaksi — kolom yang dipakai frontend
| Kolom (sinonim) | Dipakai untuk |
|---|---|
| `Total Harga` / `Penjualan` / `Harga` / `Nilai` | nilai nominal transaksi |
| `Kuantitas` / `Qty` / `Jumlah` | qty |
| `Nama Barang` / `Barang` / `Produk` | kunci ke katalog produk (uppercase) |
| `Tanggal` / `Date` | tanggal transaksi |
| `Tipe Transaksi` / `Tipe` | deteksi penjualan vs retur |
| `Nama Kategori Pelanggan` / `Kategori Pelanggan` / `Nama Kategori P` | kategori (RESELLER/UMUM dll) |
| `Nama Pelanggan` / `Pelanggan` | nama pembeli |
| `Status` / `Status Transaksi` / `Status Pembayaran` | deteksi batal/void/cancel/refund |

### 2.2 Tab Produk (kamus)
Kolom yang dibaca: `Nama Barang`, `Kode Series`, `Nama Series`, `Kategori Produk`, `HPP`. (Sinonim: `Barang`, `Series`, `Kategori`, `Modal`.)

### 2.3 Tab Biaya
Kolom: `Tanggal`, `Kategori Biaya`, `Nominal`.

### 2.4 Tab Settings
Format key-value: kolom A = `Key`, kolom B = `Value`. Satu-satunya key yang dipakai: **`Target`** (target omzet, default `820000000` di `Analytic.html:1581`).

---

## 3. Alur Lengkap Sisi Frontend

### 3.1 Bootstrap & Login (L1331-1368, L4240-4259)
- `ICONS` = kamus SVG inline (L1332-1368).
- `checkLogin()`: jika `sessionStorage.intel_auth === '1'` → sembunyikan `loginOverlay` → `initDashboard()`. Jika belum → tampilkan form password.
- `verifyPwd()`: `btoa(pwd) === 'QWRtaW5A'` (base64 dari `Admin@`). Simpan `intel_auth='1'`, sembunyikan overlay, `initDashboard()`.
- `pwdInput` juga jalan saat Enter (L4256).
- `window.isProcessingGAS` (L1372) + `beforeunload` guard (L1375-1381): cegah keluar halaman saat ada proses tulis ke GAS.
- Tema awal dibaca dari `localStorage.theme` (L3298-3300).

### 3.2 Inisialisasi — `initDashboard()` (L2101-2221)
Alur:
1. Bangun **roadmap 3 titik** (3-dot progress, bukan spinner) di `loadingScreen`.
2. `setStage(0/1/2, ...)` menggerakkan titik + label.
3. `inputExpenseDate` diisi `moment().format('YYYY-MM-DD')` (hari ini).
4. `initDropzone()` untuk modal upload.
5. Simpan cache lama dari `localStorage.intel_pro_cache_v3` → `memoriLama`.
6. `fetch(API_URL + "?action=getSalesData")` dengan `AbortController` + timeout 90 detik.
7. Pada sukses:
   - Pre-fill `inputTargetSales` dari `settings[].Key === 'Target'`.
   - Simpan cache `intel_pro_cache_v3` (wrap try/catch — data besar bisa gagal di localStorage).
   - `setStage(2, 'active', 'Mengolah data...')` → `olahDataMentah(dataMentah)` → `setupDatePicker()` → `prosesData()` → `unlock()`.
   - `syncStatus.innerText = "Data Terkini"`.
8. Pada gagal:
   - Jika ada `memoriLama` → `setStage(1,'active','Memakai data cache lokal...')` → `olahDataMentah(JSON.parse(memoriLama))` → lanjut `setupDatePicker()` + `prosesData()` + `unlock()`. Label: `"Data Offline (Cached)"`.
   - Jika tidak → `alert("Gagal mengambil data dari Google Sheet. Cek API!")`.

> Catatan (L2154-2155): loading screen **mengunci front-end** sampai data fresh tiba — cache TIDAK ditampilkan lebih dulu, baru dipakai bila fetch gagal.

### 3.3 Dynamic Sync — `syncDashboardData()` (L1529-1574)
Digunakan setelah `saveTarget` / `saveExpense` / upload bulk untuk memperbarui dashboard **tanpa reload**:
1. `fetch(getSalesData)` → cache → `olahDataMentah()`.
2. Sinkron `inputTargetSales` dari settings.
3. `prosesData()` (render ulang).
4. **Stale AI guard:** jika `aiResultBox` tampil, sisipkan banner `aiStaleWarning` (pernah ada, referensi `aiStaleWarning`) di atas `aiContent` — rekomendasi lama bisa usang.
5. Return `true/false` untuk overlay sukses/gagal di pemanggil.

### 3.4 Pipeline Parsing — `olahDataMentah()` (L1683-1834)
Input: JSON mentah GAS. Langkah:

1. **Adaptor array** (L1684): jika payload ternyata array polos → bungkus jadi `{transaksi: data, produk: [], biaya: []}`.
2. **Target** (L1687-1696): ambil dari `konfigurasi.targetSales`, lalu timpa dari `settings[].Key==='Target'` (parse int). Update teks `kpiSalesGap`.
3. **Katalog produk** (L1699-1713): untuk tiap baris, kunci = `Nama Barang`.toUpperCase().trim(). Simpan `{seriesKode, seriesNama, kategori, hpp}`. HPP dibersihkan `replace(/[^0-9,-]/g,'')`.
4. **Transaksi** (L1716-1757) — tiap baris menghasilkan objek *enriched*:
   - `parsedNilai`: dari `Total Harga|Penjualan|Harga|Nilai`, angka dibersihkan `[^0-9,-]` → `,` jadi `.`.
   - `parsedQty`: dari `Kuantitas|Qty|Jumlah`, `parseInt`.
   - `prodUp`: nama barang uppercase.
   - `infoProduk` = lookup katalog (fallback `{seriesKode:'LAINNYA', seriesNama:'Lainnya', kategori:'UMUM', hpp:0}`).
   - `parsedDate`: `parseFlexibleDate(tgl)` → split `Y-M-D` → `new Date(y, m-1, d, 0,0,0,0)`; gagal → `new Date()` (hari ini).
   - `tipeLow`, `katUp`, `statusLow`: lowercase/uppercase dari kolom masing-masing.
   - `namaPelanggan`: fallback `'Tanpa Nama'`.
   - `seriesKode`, `seriesNama`, `hppSatuan`, `totalHpp` (= hpp × qty).
5. **Biaya** (L1760-1788): sama, hasil `{parsedDate, kategoriBiaya (uppercase), nominal}`.
6. **Dropdown kategori** (L1790-1799): isi `filterProdukKategori` dari set unik `katUp` (selain `'UMUM'`), pertahankan pilihan lama bila masih ada.
7. **`firstPurchaseData`** (L1802-1811): untuk tiap pelanggan simpan tanggal transaksi **pertama** (tanggal minimum). Basis hitung "pelanggan baru" / retensi.
8. **Datalist OPEX** (L1814-1833): gabungkan default `[IKLAN, GAJI, ONGKIR, OPERASIONAL, LAIN-LAIN]` + kategori biaya historis unik.

### 3.5 Date Range — `setupDatePicker()` (L1836-1889) + fallback native (L1891-2099)
- `refEnd` = tanggal transaksi **terakhir** di data (atau `moment()` bila kosong). Dipakai untuk preset `'Bulan Ini'`.
- Default range = **7 hari terakhir literal dari hari ini** (`today-6d` s.d. `today`).
- Hidden inputs: `startDate`, `endDate` (format `YYYY-MM-DD`), `comparisonMode` (`rolling` default).
- Jika plugin `daterangepicker` ada → init dengan ranges:
  - `Hari Ini`, `7/14/30 Hari Terakhir` = literal dari `moment()` (boleh kosong — data lag ±7 hari).
  - `Bulan Ini` = anchor ke `refEnd`.
  - Callback `applyRange`: set hidden, sembunyikan `aiResultBox` (usang), `prosesData()`.
- Jika plugin gagal load → **fallback native** `buildNativeRangePicker()`: picker custom (preset kiri + 2 kalender kanan), menimpa `#reportrange`. Ada komentar `ponytail:` menandai keputusan ini.
- `setCompareMode(mode)` (L3156): update pill visual, tulis ulang `data-tooltip` semua elemen bertooltip, lalu `prosesData()`.

### 3.6 Mesin Agregasi — `prosesData()` (L2226-2866)
Fungsi terbesar. Baca `startDate/endDate/comparisonMode`, lalu hitung **periode ini** dan **periode pembanding**.

**"Mesin Waktu" (L2252-2273):**
- `monthly`: tanggal yang sama di bulan sebelumnya (`pStart = gStart - 1 bulan`, dst).
- `rolling`: `N` hari sebelum rentang (`pEnd = gStart-1ms`, `pStart = pEnd - (N-1) hari`), `N = countDaysInclusive`.

**Rekap utama (objek akumulator):**
| Variabel | Isi |
|---|---|
| `dSkrg` / `dLalu` | `{sales, salesQty, retur, returQty, trx, cogs}` |
| `totalBiaya` / `totalBiayaLalu` | nominal biaya |
| `omzetBaru` / `omzetLama` | omzet pelanggan baru vs lama (retensi) |
| `rekapTren` | per-offset-hari: `{label, sales, retur, salesLalu, ts}` |
| `rekapReseller` / `rekapMarketplace` | omzet per pelanggan B2B / B2C |
| `rekapKat` / `rekapKatLalu` | omzet per kategori (2 periode) |
| `rekapProd` | qty per produk |
| `rekapCont` | omzet per kontributor |
| `rekapHari` | omzet per hari Senin–Minggu |
| `rekapSeri` | qty per kode series |
| `rekapWarna` | qty per warna (dari token kata produk) |
| `rekapBiaya` | nominal per kategori biaya |
| `rekapProdukDetail` | per produk `{qty,sales,cogs,returQty,returRp}` |
| `rekapTrendProd` | per produk `{skrg, lalu}` qty |
| `freqPelanggan` | jumlah transaksi per pelanggan |
| `basketData` | per `dateKey_pel`: `{items:Set, qty, nominal, isReseller}` |
| `lastOrder` | tanggal transaksi terakhir per pelanggan |

**Deteksi klasifikasi tiap baris (L2304-2309):**
- `isRetur` = tipe mengandung `retur`/`kembali`.
- `isBatal` = status mengandung `batal`/`void`/`cancel`.
- `isPenjualan` = tipe mengandung `faktur`/`penjualan`/`sales`; **jika bukan retur & bukan batal → dipaksa `true`** (fix "data kosong = penjualan").

**Filter produk (L2317-2319):** `filterProdukKategori` (kategori) dan jika kategori = RESELLER → `filterResellerPelanggan` (nama reseller) ikut dipakai.

**Agregasi inti (L2321-2410):**
- Baris penjualan valid: seri + warna + `lastOrder` (diluar filter produk), rekapTren, produk detail, basket, RFM freq, retensi, kontributor, hari, trx.
- Retur: kurangi `dSkrg.retur/returQty`, `cogs -= totalHpp`, `rekapKat -= nilai`, detail produk.
- Penjualan: tambah `sales/salesQty`, `cogs += totalHpp`, `barisDihitung++`, rekap produk/kat/kontributor/hari, `trx++`.

**Periode lalu (L2413-2440):** agresi ke `pStart..pEnd` → `dLalu`, `rekapKatLalu`, dan `rekapTren[offsetLalu].salesLalu`. Label bulan lalu disimpan di `labelLalu`.

**Biaya (L2444-2455):** `totalBiaya` (periode ini), `rekapBiaya`, `totalBiayaLalu`.

**Derivasi finansial (L2457-2482):**
- `netSales = sales - retur`
- `grossProfit = netSales - cogs`
- `netProfit = grossProfit - totalBiaya`
- `netMargin = netProfit/netSales`, `opexRatio = totalBiaya/netSales`
- `runRate = (netSales / hariBerjalan) × totalHariRate`

**`hitungVsText()` (L2467-2474):** span ▲/▼ persen vs periode lalu dengan warna (bisa `revertColor` utk metrik yang bagusnya turun).

**AVG & Run Rate statis (L2494-2555)** — mengunci pada **bulan berjalan** (bukan rentang terpilih):
- Iterasi ulang `rawDataTransaksi` mentah (bukan hasil enrich) untuk bulan sekarang & bulan lalu.
- `staticMonthlySales/Qty`, `staticMaxDate`, `daysInCurrentMonth`, `isEndOfCurrentMonth`.
- `pembagiHari = max(staticMaxDate, today)` → `staticAvg = staticMonthlySales/pembagiHari` → `staticRunRate = staticAvg × daysInCurrentMonth`.
- Keluaran ke `kpiSalesPct` (AVG/hari) dan `kpiSalesRunRate` (Proyeksi Akhir).

**Gap/defisit (L2557-2578):** `TARGET` tercapai → badge "🔥 TARGET TEMBUS!"; belum → "Defisit: - Rp...". Plus "Net QTY: X Unit (▲/+n)" vs bulan lalu.

**Retur KPI (L2580-2583):** `kpiRetur`, `kpiReturVs`, `kpiReturDetail` = `returQty Unit | lossRate% Loss Rate` (`retur/netSales`).

**Profit & CAC (L2585-2594):** `kpiNetProfit`, `kpiNetVs`, `pelBaruBulanIni` dari `firstPurchaseData` dalam rentang, `CAC = totalBiaya / pelBaruBulanIni`, `kpiOpexDetail`.

**Insights (L2596-2600):** `kpiGoldenDay` = hari omzet max; `kpiTopCont` = kontributor omzet teratas.

**Basket Intelijen (L2602-2645):** `UPT = totalItemsKeranjang/totalBasket`, `avgRsl` & `avgOth` per-basket reseller/marketplace, plus kartu CAC. Di-render ke `#basketIntel`.

**RFM VIP (L2647-2731):** dua kolom — Reseller (B2B) & Marketplace (B2C), masing-masing top 50, badge:
- `AWAS KABUR (nH)` bila `daysAgo > 14`
- `👑 SULTAN (fx)` bila frekuensi ≥ 3 (icon crown)
- `AKTIF` selain itu.
- `vipInsight`: "RISIKO CHURN (>14 HARI)" = jumlah pelanggan `daysAgo > 14` + potensi omzet hilang.

**Top Produk & Momentum (L2734-2770):** dari `rekapProdukDetail` → `_netSales`, `_netQty`, sort `_netSales` desc, top 100. Per baris: `margin%`, `returRate%`, `momDff%` dari `rekapTrendProd`. Tabel diisi via `table.rows.add().draw()` (DataTables). Semua dimasukkan `try/catch` (error tidak boleh mematikan render lain).

**Margin analysis (L2778-2800):** `OPEX% (totalBiaya/grossProfit)`, `NET MARGIN% (netProfit/grossProfit)`, `BOCOR RETUR% (retur/sales)`.

**Tabel kategori (L2802-2828):** per kategori: porsi `%` share, momentum `▲/▼` vs lalu, warna bergilir dari `warnaKategori`.

**Opex list (L2830-2833):** rekap biaya desc → `#opexList`.

**Diagnostik (L2851-2863):** `setTimeout(300ms)` → `jalankanDiagnosaLokal(...)` dengan 22 parameter.

**Render chart (L2865):** `renderCharts(rekapTren sorted by ts, rekapKat, rekapProd, grossProfit, netProfit, totalBiaya, rekapHari)`.

### 3.7 Render Chart — `renderCharts()` (L2868-2990)
Chart.js defaults mengikuti tema (`data-theme`). Semua chart di-destroy dulu (`charts['x'].destroy()`) sebelum buat baru.

| Chart | Tipe | Data |
|---|---|---|
| `chartTren` | line (fill gradien biru) | Periode Ini (solid), Periode Pembanding (dash), Retur (dash merah); zoom x + pan (plugin zoom, pinch via hammerjs) |
| `chartMargin` | doughnut cutout 75% | `[Net Profit, Beban OPEX]` |
| `chartKategori` | doughnut cutout 70% | omzet per kategori, warna 5 gelap |
| `chartHari` | bar + datalabels | omzet per hari (label `x.xM`) |

**Tooltip tren (L2897-2914):** untuk seri "Periode Pembanding" menampilkan `labelLalu` (tanggal aktual bulan lalu) + mode komparasi aktif.

### 3.8 Local Diagnostic Engine — `jalankanDiagnosaLokal()` (L2992-3154)
Bangun array `warnings` (HTML string) dengan **10 pengecekan**:

| # | Nama | Ambang / Kondisi |
|---|---|---|
| 1 | Target Projection | `proyPct<100 && achPct<100` → shortfall; `proyPct>=100` → aman |
| 2 | Rugi Bandar | `netProfit<0 && netSales>0` |
| 3 | Retur Kritis | `lossRate > 5%` |
| 4 | Dominasi Reseller Tunggal | share top reseller `> 40%` |
| 5 | Volume vs Harga (AOV) | sales↑ & qty↓, sales↓ & qty↑, atau double drop (`< -5%`) |
| 6 | CAC vs Profit Radar | `cac > avgMarginPerCust` → "IKLAN BERDARAH"; `cac/margin > 60%` → kritis |
| 7 | Category Collapse | top-3 kategori turun `> 25%` vs lalu |
| 8 | Golden Time Shift | `worstShare < expectedShare×0.4` → "HARI MATI" |
| 9 | Churn Value Alert | `churnCount > 3` → urgent; `>0` → pantau |

Jika kosong → "KONDISI SEHAT". Hasil masuk `#localWarningBox`.

**Prompt AI (L3110-3153):** bangun `contextForAI` — string sistem untuk Gemini: identitas "FINANCIAL & SALES AUDITOR YANG KERAS", kerangka WHO/WHAT/WHEN, format `Masalah Utama → Taktik Konkret → Target Hasil`, lalu isi:
- `[DATA RINGKAS]`: target achievement, proyeksi, net sales, growth, net QTY, AOV, net profit/margin, opex terbesar, loss rate.
- `[DATA KATEGORI B1]`: top 4 kategori + tren.
- `[DATA PELANGGAN B2]`: B2B vs B2C split + top 3 reseller + churn (B4).
- `[ANOMALI TERDETEKSI LOKAL]`: daftar warning (tag HTML di-strip).

### 3.9 Tanya Gemini — `mintaSaranAI()` (L3262-3284)
1. Tampilkan `aiResultBox` + "Gemini memproses strategi... ⚡".
2. `POST` ke `API_URL` dengan `Content-Type: text/plain;charset=utf-8`, body `{action:'getAnalysis', context: contextForAI}`.
3. Parse `json.analysis`; bila berupa objek → coba `candidates[0].content.parts[0].text`, gagal → `JSON.stringify`.
4. Render pakai `marked.parse` (fallback `<br>` bila marked tidak ada).

### 3.10 Simpan Target — `saveTargetToGAS()` (L3180-3211)
- Validasi `inputTargetSales > 0`, tutup modal.
- `GET ?action=saveTarget&value=...`.
- Sukses: hapus cache `intel_pro_cache_v3` → `syncDashboardData()` → overlay sukses/gagal sesuai hasil sync.

### 3.11 Catat Biaya — `saveExpenseToGAS()` (L3213-3260)
- Validasi tanggal/kategori/nominal.
- Konversi tanggal `YYYY-MM-DD` → `d/m/yyyy` (format database).
- `GET ?action=addBiaya&tanggal=...&kategori=...&nominal=...`.
- Sukses: kosongkan form → hapus cache → `syncDashboardData()`.

### 3.12 Toggle Tema — `toggleTheme()` (L3286-3296)
Balik `data-theme`, simpan `localStorage.theme`, re-render `prosesData()` (biasanya agar Chart.js mengambil warna baru).

---

## 4. Alur Bulk Import Excel (Upsert)

### 4.1 State & target kolom (L3305-3318)
- `uploadedData`, `excelHeaders`, `excelRawRows`, `excelWorksheet`, `mappingState`.
- `TARGET_COLUMNS`: 6 kolom sasaran dengan `candidates` untuk auto-detect:
  `noTransaksi`, `tanggal`, `namaPelanggan`, `namaBarang`, `kuantitas`, `totalHarga`.

### 4.2 Dropzone (L3320-3356)
Klik / drag-drop / file input → `handleExcelFileSelect(file)`.

### 4.3 Baca file — `handleExcelFileSelect()` (L3600-3710)
1. `XLSX.read(..., {cellDates:true})` → sheet pertama.
2. `sheet_to_json(header:1)` → array of arrays.
3. Cari **baris header** yang mengandung sekaligus kolom tanggal (`tanggal/date/tgl`) dan nomor (`nomor/no/faktur/invoice`).
4. Baris data → objek `{header: value}`; nilai sel diambil via `getExcelCellValue()` yang **memprioritaskan `cell.w`** (teks tampilan Excel) untuk sel tanggal — bebas bug timezone.
5. Jika header tidak ketemu → fallback baris non-kosong pertama.
6. Lanjut: `autoDetectMappings()` → `renderMappingControls()` → `renderPreviewTable()` → `goToUploadStep(2)`.

### 4.4 Auto mapping (L3712-3744)
Normalisasi header (`lowercase, hapus non alnum & #`), cek exact-match `candidates`, lalu substring-match. Badge: `Cocok Otomatis` / `Manual` / `Belum Cocok`.

### 4.5 Preview (L3822-3867)
5 baris pertama di-render dengan format: tanggal `d/m/yyyy`, qty `parseInt`, harga `Rp x.xxx`.

### 4.6 Analisis — `runDataAnalysis()` (L3869-3949)
- Validasi esensial: `tanggal` & `namaBarang` wajib; plus minimal `noTransaksi` **atau** `namaPelanggan`.
- Map tiap baris ke objek dengan header **asli sheet** (cari nama header dari `rawDataTransaksi[0]`; kolom yang tidak punya pasangan diisi `""`).
- Tanggal dinormalisasi `parseFlexibleDate` → `d/m/yyyy`.
- `goToUploadStep(3)` → `analyzeUploadedRows(uploadedData)`.

### 4.7 Kunci dedup — `getKeyOfRow()` (L3951-4010)
1. **Primary Key**: dari kandidat `no. transaksi, no. faktur, no. invoice, no, id, ...` (nilai non-kosong) → kombinasi `pk_barang` (mendukung multi-item per invoice).
2. **Fallback composite key**: `tanggal_pelanggan_barang_qty_harga`.
- Frontend pakai key ini untuk menandai BARU/UPDATE/SKIP di `analyzeUploadedRows` (L4012-4137): update jika ada field berbeda (tanggal dibandingkan lewat `parseFlexibleDate`), skip jika identik.

### 4.8 Kirim — `sendExcelToGAS()` (L4147-4238)
- `showProcessingOverlayWithProgress` + **progress bar simulasi** (timer 200ms, fase: unggah → ingest → pencocokan asimtotik).
- `POST {action:'bulkUpsertTransactions', rows}`.
- Sukses: update progress 100% → hapus cache → `closeUploadModal()` → `syncDashboardData()` → overlay hasil `{added, updated, skipped}`.
- `beforeunload` mencegah keluar selama proses (`isProcessingGAS`).

---

## 5. Alur Backend GAS (`code-analytic.gs`)

### 5.1 Konfigurasi
- `GEMINI_API_KEY` (L2) — **API key keras-kode, ter-expose di repo** (lihat catatan §8).
- `TIMEZONE = "Asia/Jakarta"` (L7), dipakai `formatDate()` bila spreadsheet punya tz sendiri → pakai tz spreadsheet (`getSpreadsheetTimeZone()`).

### 5.2 Cache & retry
- `getCachedDashboardData()` (L12-21): `CacheService.getScriptCache()` key `dash_data_v2`, TTL 300 detik. Semua aksi tulis **invalidasi** key ini.
- `fetchWithRetry()` (L26-38): 3 percobaan, backoff eksponensial (`1s, 2s, 4s`), berhenti bila status < 500.

### 5.3 `doGet` (L40-103)
- `getSalesData` → `getCachedDashboardData()`.
- `saveTarget` (L53-76): invalidasi cache → tulis ke sheet `Settings` (buat bila belum ada, cari row `Key=='Target'` lalu `setValue`, atau append).
- `addBiaya` (L79-97): invalidasi cache → append `[tanggal, kategori, nominal]` ke sheet `Biaya` (buat bila belum ada).
- Default (L100-102): `HtmlService` respons "API ReynaHub V2 Active" dengan `X-Frame-Options ALLOWALL` (agar iframe hub bisa menampilkan).

### 5.4 `getAllDashboardData()` (L108-124)
Baca 4 tab → `{transaksi, produk, biaya, settings}`.

### 5.5 `ambilDataDariSheet()` (L127-176)
- Baris pertama = header (di-trim). Lewati baris kosong (kolom 1 & 2 kosong).
- **Tanggal distabilkan**: header deteksi via `normHeader` (hapus non-alnum); jika kolom tanggal → `Utilities.formatDate(val, tz, 'yyyy-MM-dd')` untuk `Date`, atau `formatDate(val)` untuk string.
- Output: array objek `{header: value}`.

### 5.6 `getAnalysisFromGemini()` (L181-216)
- Model **`gemini-1.5-flash`**, endpoint `generateContent`, key di-trim.
- `muteHttpExceptions:true` + `fetchWithRetry`.
- Bila `candidates` ada → `text`; selain itu pesan mentah; error → pesan error.

### 5.7 `doPost` (L221-443)
- Parse `JSON.parse(e.postData.contents)` → `action`.
- `getAnalysis` (L226-232): panggil Gemini dengan `context` dari frontend.
- `bulkUpsertTransactions` (L234-430):
  1. **Validasi backend** (L243-264): qty negatif & format tanggal tak dikenal (harus `d/m/yyyy` atau `yyyy-MM-dd` atau parse-able). Bila ada error → balas `{status:'warning', proceed:true}` (bukan error keras).
  2. Cari `pkColIdx` dari kandidat kolom PK (L280).
  3. `colIdxs` untuk tanggal/pelanggan/barang/qty/harga.
  4. Index sheet: `getSheetRowKey()` (sama logika key frontend: PK_barang atau composite).
  5. Untuk tiap baris Excel: bentuk `rowValues` sesuai urutan header sheet (qty & harga dinormalisasi, tanggal disimpan **mentah string**).
  6. Hitung key excel → ada di map? update (jika beda) / skip (jika sama) : append.
  7. Balas `{status, added, updated, skipped}`.

### 5.8 Helper (L448-470)
- `findColIndex(headers, candidates)`: normalisasi header → exact match.
- `findExcelValue(excelRow, headerName)`: normalisasi kunci → ambil nilai.

### 5.9 `formatDate()` (L476-585)
Parser tanggal kalender **selaras dengan `parseFlexibleDate()` di frontend** — urutan coba:
1. `Date` objek → `Utilities.formatDate(tz)`.
2. angka → `excelSerialToYMD` (serial Excel, offset 25569, komponen UTC).
3. `YYYY-MM-DD` → langsung; ISO prefix `YYYY-MM-DD...` → ambil prefix.
4. `d/m/yyyy` → konversi.
5. `d-Mon-yyyy` / `Mon-d,yyyy` (bulan kata, map ID/EN lengkap).
6. fallback split non-digit → deteksi DMY / YMD.
7. Tidak cocok → kembalikan string asli.

---

## 6. Ringkasan Formula & Metrik

| Metrik | Rumus | Lokasi |
|---|---|---|
| Net Sales | `sales − retur` | `prosesData` L2457 |
| Gross Profit | `netSales − cogs` | L2458 |
| Net Profit | `grossProfit − totalBiaya` | L2459 |
| Net Margin | `netProfit/netSales × 100` | L2461 |
| Opex Ratio | `totalBiaya/netSales × 100` | L2462 |
| Run Rate | `netSales/hariBerjalan × totalHariRate` | L2479 |
| Static AVG | `omzetBulanIni/max(staticMaxDate, today)` | L2551 |
| Static Run Rate | `staticAvg × daysInMonth` | L2552 |
| Loss Rate | `retur/netSales × 100` | L2582 |
| CAC | `totalBiaya/pelangganBaru` | L2592 |
| UPT | `totalQtyKeranjang/totalBasket` | L2618 |
| AOV | `netSales/trx` | L2840 |
| Churn | pelanggan `lastOrder > 14 hari` | L2844-2846 |
| HPP baris | `hppSatuan × qty` | L1755 |
| Momentum MoM | `(skrg−lalu)/lalu × 100` | L2754, L2810 |

---

## 7. Konfigurasi & Konstanta Penting

| Konstanta | Nilai | Lokasi |
|---|---|---|
| `API_URL` | (Web App GAS) | `Analytic.html:1369` |
| `TARGET_SALES` | `820000000` (default) | `:1581` |
| `KODE_SERI_MASTER` | `['S WP','SAG','STT','STX','STC','SX','S']` (sort by length desc) | `:1583` |
| `WARNA_MASTER` | 16 nama warna | `:1584` |
| Cache key | `intel_pro_cache_v3` | beberapa tempat |
| Cache GAS | `dash_data_v2` (TTL 300s) | `code-analytic.gs:14` |
| Auth | `sessionStorage.intel_auth`, pwd `Admin@` (btoa) | `:4241-4248` |

---

## 8. Catatan Risiko & Utang Teknis (dari pembacaan kode)

- **API key Gemini keras-kode** di `code-analytic.gs:2` — siapa pun dengan akses repo bisa memakainya.
- **Password login client-side** (`Admin@`) — lihat README §3.9.
- **`beforeunload` guard** hanya aktif bila `isProcessingGAS` true; pada kegagalan fetch dini bisa menampilkan pesan mengganggu.
- **Kartu KPI gap** (`kpiSalesGap`) di-write sekali di `olahDataMentah` lalu di-overwrite render detail di `prosesData`.
- **DataTables `dtProduk` di-destroy + rebuild tiap `prosesData()`** — pilihan length user di-reset ke 5 (README §3.6).
- **Preset tanggal ter-anchor hari ini literal** untuk 7/14/30 hari — keputusan user, jangan diganti (README §3.4).
- **Dua definisi `normalizeText`** pernah terdeteksi di audit lintas-tool (parser.js vs app.js) — di file ini tidak ada, tapi ingat saat membedah tool lain.
- **`prosesData` memanggil `updateResellerPelangganDropdown` di tengah loop agregasi** (L2293) — membangun ulang dropdown setiap render.

---

## 9. Peta Navigasi Cepat (file → area)

| Area | Baris (Analytic.html) |
|---|---|
| CSS tema + layout bento | L23–754 |
| Login / loading / overlay | L758–818 |
| Modal Expense / Settings / Upload | L821–1062 |
| Nav bar + kontrol | L1064–1122 |
| Grid bento ROW 1–5 | L1124–1330 |
| `ICONS` + `API_URL` + overlay helpers | L1331–1526 |
| `syncDashboardData` | L1529–1574 |
| State global + konstanta | L1576–1600 |
| Filter kategori/reseller + DataTables init | L1601–1681 |
| `olahDataMentah` (parsing) | L1683–1834 |
| `setupDatePicker` + fallback native | L1836–2099 |
| `initDashboard` (bootstrap) | L2101–2221 |
| `prosesData` (agregasi) | L2226–2866 |
| `renderCharts` | L2868–2990 |
| `jalankanDiagnosaLokal` + `contextForAI` | L2992–3154 |
| `setCompareMode`, save target/biaya, Gemini | L3156–3284 |
| Theme + upload state + TARGET_COLUMNS | L3286–3318 |
| Dropzone / read / mapping / preview / analyze | L3320–3949 |
| `getKeyOfRow` / `analyzeUploadedRows` / kirim | L3951–4238 |
| Auth + theme postMessage | L4240–4267 |
