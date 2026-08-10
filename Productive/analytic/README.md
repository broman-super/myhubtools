# SAS — Sales Analytic Simplify (Bento Edition)

Dashboard analitik penjualan real-time berbasis **Google Sheets + Google Apps Script (GAS)**. Satu file HTML mandiri (CSS & JS inline) yang di-load hub REYNAHUB melalui iframe.

- **File:** `Productive/analytic/Analytic.html` (±4270 baris, self-contained)
- **Backend:** `gscode/code-analytic.gs` (di-deploy sebagai Apps Script Web App)
- **Status:** ✅ Stable — GAS integration

---

## 1. Fitur & Cara Pakai

| Area | Fitur |
|---|---|
| KPI Cards | Total penjualan, profit, transaksi, rata-rata/trx, gap target, insights (hari gacor, top kontributor) |
| TREN SALES VS RETUR | Line chart zoomable (chart.js-plugin-zoom) + pembanding periode |
| MARKET SHARE | Doughnut porsi kategori + rincian omzet vs periode lalu |
| TOP PRODUK & MOMENTUM | DataTables: rank, margin, retur rate, terjual, momentum MoM |
| RASIO KESEHATAN KEUANGAN | Doughnut Net Profit vs OPEX + margin analysis |
| PETA WAKTU GACOR | Bar rekap penjualan per hari |
| INTELIJEN KERANJANG & CAC | AOV, UPT, CAC + radar kebocoran biaya |
| VIP SEGMENTATION & CHURN | RFM: SULTAN / AKTIF / AWAS KABUR |
| INSTANT DIAGNOSTICS | Engine anomali lokal + tombol tanya Gemini |
| Lainnya | Import Excel (SheetJS), export, banding 2 periode (rolling/monthly), date range picker |

**Alur pakai:** buka → login (password) → otomatis fetch data GAS → olah → render dashboard. Data di-cache ke localStorage untuk buka berikutnya / offline.

---

## 2. Keterkaitan (yang wajib tahu sebelum menyentuh kode)

### 2.1 Backend GAS
- `API_URL = https://script.google.com/macros/s/AKfycbx0OmcRVvhCSmX9r4J-RBsejZ_Th0fdfy46TaaPsdx6r1RxczSmmfcfeTHJe4fIFb1HEw/exec`
- Action: `getSalesData`, `saveTarget`, `addBiaya`
- Backend disimpan di `gscode/code-analytic.gs` — **bukan** lagi di `Productive/Task/`.
- Data mentah lag ±7 hari dari hari ini (sheet update manual). Konsekuensi penting di §3.4.

### 2.2 Hub & Shell
- Router: `#productive/analytic` → `Productive/analytic/Analytic.html` (`src/core/router.js`). Hash TIDAK berubah walau path folder berubah.
- Dimuat sebagai iframe → **CSS/JS tidak bocor antar-tool**.
- Tema via `postMessage` (`src/core/iframe-communicator.js`): hub minta child ganti tema → tool menukar CSS variables. **Jangan ganti nama variabel** (`--primary`, `--card`, `--accent`, `--border`, `--text`, `--danger`, `--success`, `--warning`).
- Service worker `src/sw.js` cache versi `reynahub-v4` (route `/Productive/`, strategi **network-first**). Setelah edit file ini, bump versi cache.

### 2.3 Dependency (CDN, versi ter-pin)
Chart.js 3.9.1 · datalabels 2.2.0 · zoom 2.0.1 (+hammerjs 2.0.8) · jQuery 3.7.1 · moment 2.29.4 · daterangepicker 3.1.1 · DataTables 1.13.6 · SheetJS (xlsx) 0.18.5 · marked.

> Jangan "upgrade" ke major baru tanpa uji — BugFound.md (DD2) mencatat unpinned version pernah jadi masalah.

### 2.4 Storage
| Key | Scope | Fungsi |
|---|---|---|
| `intel_auth` | sessionStorage | Gate login (`'1'` = sudah login) |
| `intel_pro_cache_v3` | localStorage | Cache data GAS; dipakai saat fetch gagal (offline) |
| `theme` | localStorage | `dark` / `light` |

### 2.5 Struktur Layout (bento grid 12 kolom)
- ROW 2: TREN SALES VS RETUR (12) — full width + toggle Harian/Mingguan/Bulanan (mode Auto: >60 hari → Mingguan, >180 hari → Bulanan)
- ROW 3: MARKET SHARE (4) + TOP PRODUK & MOMENTUM (8)
- ROW 4: RASIO KESEHATAN KEUANGAN (4) + PETA WAKTU GACOR (4) + INTELIJEN KERANJANG & CAC (4)
- ROW 5: VIP SEGMENTATION & CHURN (4) + INSTANT DIAGNOSTICS (8)

---

## 3. Catatan Perubahan & Aturan Anti-Bug Minor

> Ringkasan bug yang pernah terjadi + akar masalahnya, supaya perubahan berikutnya tidak mengulanginya.

### 3.1 🔴 Kartu macet tidak mengecil (Circular Sizing Lock) — SUDAH DIPERBAIKI
**Gejala:** tinggi kartu tidak mengecil walau isi (tabel) mengecil — mis. `dtProduk_length` diubah 25→5, kartu tetap tinggi.
**Akar:** Chart.js (`maintainAspectRatio:false`) menulis `height:858px` inline di canvas. Canvas itu jadi *content-height* dari `.chart-box { flex:1 }` di dalam flex-column ber-tinggi-auto → mengunci tinggi baris grid. Saat baris harus menyusut, canvas tidak pernah menyusut.
**Fix terpasang (kartu RASIO):** `.chart-box { height:300px; min-height:0; flex:0 0 auto }` + kartu `align-self:start`.
**Aturan:** chart yang memakai pola `flex:1` + canvas Chart.js bisa kena lagi (mis. PETA WAKTU GACOR). Kalau kartu nyangkut, terapkan pola yang sama: lepaskan flex-grow chart-box atau beri tinggi tetap.

### 3.2 🔴 Date picker nutup sendiri setelah 1 klik tanggal — SUDAH DIPERBAIKI
**Akar:** `onDayClick` → `renderCalendars()` me-*render* ulang kalender sehingga tombol yang baru diklik terlepas dari DOM; listener `document` melihat `wrap.contains(e.target) === false` → `closePop()`.
**Fix:** `e.stopPropagation()` di handler klik sel tanggal. **Jangan dihapus** — menghilangkannya mengembalikan bug.

### 3.3 Loading screen — HANYA roadmap, tanpa spinner
Spinner & `loadingScreenText` sengaja **dihapus** (diganti 3-dot roadmap via `setStage(0..2)`). Jangan menambahkan kembali elemen spinner/text; urutannya: stage 0 "Menghubungkan...", stage 1 "Mengambil data...", stage 2 "Mengolah data...", lalu `unlock()` sembunyikan layar.

### 3.4 🟡 Preset tanggal ter-anchor ke "hari ini" literal
- **7/14/30 Hari Terakhir + default range = `moment()` hari ini** (boleh kosong bila data GAS belum masuk — data lag ±7 hari).
- **Bulan Ini = anchor ke `refEnd`** (timestamp transaksi terakhir di data), bukan hari ini.
Jangan "perbaiki" preset jadi anchor `refEnd` semua — itu keputusan user (default kosong boleh).

### 3.5 🟡 Responsif
- `html`/`body` `min-width:360px` + `body { overflow-x:auto }` (kunci minimum layar HP).
- Nav & `#reportrange` punya breakpoint 1200px (wrap) dan 768px (kolom).
- Uji di lebar sempit setelah mengubah struktur; jangan hapus breakpoint karena "tidak kelihatan masalah" di layar lebar.

### 3.6 🟡 DataTables `dtProduk`
- `initDtProdukTable()`: `pageLength:5`, `lengthMenu:[5,10,25]`, di-`destroy` + buat ulang tiap `prosesData()`.
- **Konsekuensi:** pilihan "length" user di-reset ke 5 setiap render. Ini perilaku saat ini — kalau ingin persist, simpan & restore `page.len()` secara eksplisit.
- Nomor Rank di-tulis ulang di `drawCallback` — jangan geser kolom tanpa menyesuaikan `columnDefs` dan `order:[[4,'desc']]`.

### 3.7 🟡 Hati-hati mengubah struktur kartu
JS merujuk elemen **via id** (`chartTren`, `chartHari`, `chartMargin`, `chartKategori`, `dtProduk`, `tableKategori`, `marginAnalysis`, `rfmList`, `vipInsight`, dst). **Memindah kartu = aman. Mengubah/rename id = putus kabel diam-diam.** Jika menukar posisi kartu, pastikan keduanya `col-span-4` (atau sesuaikan grid 12 kolom).

### 3.8 🟡 Verifikasi layout pakai ukuran, bukan mata
Bug layout di file ini mustahil dideteksi sekilas (lihat §3.1). Setelah mengubah layout, ukur tinggi kartu vs konten di beberapa kondisi (mis. length 5 → 25 → 5) — bisa dengan Chrome headless.

### 3.10 🔴 Tooltip Trend Sales vs Retur menampilkan string `<svg ...>` — SUDAH DIPERBAIKI
**Gejala:** saat mode komparasi "Bandingkan Bulan Lalu", hover di grafik Trend menampilkan markup `<svg xmlns=...` mentah sebagai judul tooltip.
**Akar:** tooltip `title` callback menempelkan `ICONS.calendar` (string SVG) ke teks tooltip. Chart.js tooltip merender teks polos (`textContent`) — SVG tidak pernah dirender, malah tampil sebagai string.
**Fix:** ikon dihapus dari `title` callback chart Tren. **Aturan: jangan pernah menaruh string SVG/HTML ke dalam callback tooltip Chart.js** — tooltip tidak mendukung HTML; kalau mau ikon di tooltip, pakai `external` tooltip (elemen kustom).


- Password login **hardcoded** `'Admin@'` di client-side (BugFound DD1) — siapa pun bisa lihat via inspect element. Deploy auth di backend untuk menghilangkan ini.
- `<link>` sebelum `<meta charset>` (spec violation, BugFound A2).

---

## 4. Flow Data (ringkas)

```
Buka dashboard (auth: sessionStorage intel_auth)
  → initDashboard():
      fetch(API_URL?action=getSalesData)
        → sukses: olahDataMentah() → setupDatePicker() → prosesData() → unlock()
        → gagal:  pakai cache localStorage (intel_pro_cache_v3) bila ada, kalau tidak → alert
  → prosesData():
      baca startDate/endDate + comparisonMode
      loop rawDataTransaksi → agregasi (rekap produk, tren, kategori, pelanggan, biaya)
      render KPI + chart + DataTables
```
