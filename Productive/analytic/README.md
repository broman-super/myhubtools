# SAS — Sales Analytic Simplify (Bento Edition)

Dashboard analitik penjualan real-time berbasis **Google Sheets + Google Apps Script (GAS)**. Satu file HTML mandiri (CSS & JS inline) yang di-load hub REYNAHUB melalui iframe.

- **File:** `Productive/analytic/Analytic.html` (±4270 baris, self-contained)
- **Backend:** `gas/code-analytic.gs` (di-deploy sebagai Apps Script Web App)
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
- `API_URL = https://script.google.com/macros/s/AKfycbyIEtC_S0q7ObAsHxxfP9UsVe2l1CAknAQWT4EdzJex17vBoy6sX9ano42XKEx2jTfLpw/exec`
- Action: `getSalesData`, `saveTarget`, `addBiaya`, `updateBiaya`, `deleteBiaya`, `bulkUpsertTransactions`, `bulkUpsertBiaya`, `bulkUpsertProduk`
- Backend disimpan di `gas/code-analytic.gs` — **bukan** lagi di `Productive/planner/`.
- Data mentah lag ±7 hari dari hari ini (sheet update manual). Konsekuensi penting di §3.4.

### 2.2 Hub & Shell
- Router: `#productive/analytic` → `Productive/analytic/Analytic.html` (`src/core/router.js`). Hash TIDAK berubah walau path folder berubah.
- Dimuat sebagai iframe → **CSS/JS tidak bocor antar-tool**.
- Tema via `postMessage` (`src/app.js`): hub minta child ganti tema → tool menukar CSS variables. **Jangan ganti nama variabel** (`--primary`, `--card`, `--accent`, `--border`, `--text`, `--danger`, `--success`, `--warning`).
- Service worker `src/sw.js` cache versi `reynahub-v4` (route `/Productive/`, strategi **network-first**). Setelah edit file ini, bump versi cache.

### 2.3 Dependency (CDN, versi ter-pin)
Chart.js 3.9.1 · datalabels 2.2.0 · zoom 2.0.1 (+hammerjs 2.0.8) · jQuery 3.7.1 · moment 2.29.4 · daterangepicker 3.1.0 · DataTables 1.13.6 · SheetJS (xlsx) 0.18.5 · marked.

> Jangan "upgrade" ke major baru tanpa uji — unpinned version pernah jadi masalah (catatan internal).

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
**Fix terpasang:** `.chart-box { height:<tetap>; min-height:0; flex:0 0 auto }` — chart ukuran tetap, daftar teks memakai `flex:1` untuk mengisi sisa tinggi kartu.
**Aturan:** chart yang memakai pola `flex:1` + canvas Chart.js bisa kena lagi (mis. PETA WAKTU GACOR). Kalau kartu nyangkut, terapkan pola yang sama: lepaskan flex-grow chart-box atau beri tinggi tetap.

### 3.1b 🎨 Model layout: "band seragam + isi mengisi"
Grid default merentangkan semua kartu setinggi kartu tertinggi sebaris. Agar rapi, jangan biarkan ruang kosong di bawah isi pendek:
- Kartu chart-doughnut (MARKET SHARE, RASIO): chart-box **tinggi tetap** (180/300px, `flex:0 0 auto`) — doughnut jelek jika diregang.
- Kartu chart-bar/line (PETA, TREN): chart-box boleh `flex:1` (chart ikut membesar, aman).
- Semua daftar teks (tableKategori, marginAnalysis, opexList, basketIntel, rfmList): `flex:1` supaya mengisi sisa kartu.
- Tombol/elemen penutup (mis. TANYA GEMINI): `margin-top:auto` agar menempel bawah kartu.
- Jangan pakai `align-self:start` — itu meninggalkan kartu pendek dengan lubang di bawahnya; isi memakai `flex:1` sebagai gantinya.

### 3.2 🔴 Date picker nutup sendiri setelah 1 klik tanggal — SUDAH DIPERBAIKI
**Akar:** `onDayClick` → `renderCalendars()` me-*render* ulang kalender sehingga tombol yang baru diklik terlepas dari DOM; listener `document` melihat `wrap.contains(e.target) === false` → `closePop()`.
**Fix:** `e.stopPropagation()` di handler klik sel tanggal. **Jangan dihapus** — menghilangkannya mengembalikan bug.

### 3.3 Loading screen — HANYA roadmap, tanpa spinner
Spinner & `loadingScreenText` sengaja **dihapus** (diganti 3-dot roadmap via `setStage(0..2)`). Jangan menambahkan kembali elemen spinner/text; urutannya: stage 0 "Menghubungkan...", stage 1 "Mengambil data...", stage 2 "Mengolah data...", lalu `unlock()` sembunyikan layar.

### 3.4 🟡 Preset tanggal ter-anchor ke "hari ini" literal
- **7/14/30 Hari Terakhir + default range = `moment()` hari ini** (boleh kosong bila data GAS belum masuk — data lag ±7 hari).
- **Bulan Ini = anchor ke `refEnd`** (timestamp transaksi terakhir di data), bukan hari ini.
Jangan "perbaiki" preset jadi anchor `refEnd` semua — itu keputusan user (default kosong boleh).

### 3.4b AVG & Proyeksi kartu "OMZET VS TARGET" — mengikuti RENTANG
- AVG/hari = omzet bersih **rentang terpilih** ÷ jumlah hari rentang yang sudah lewat (`hariBerjalan`); tanggal masa depan tidak ikut dibagi.
- Proyeksi = AVG × jumlah hari di bulan tanggal **akhir rentang**; label memakai bulan itu (`AVG (Okt 2026)` / `Proyeksi (Okt 2026)`).
- `kpiSalesGap` kiri menampilkan **persen pencapaian target** (hijau ≥100% / kuning ≥80% / merah) dari omzet rentang, dan Net QTY memakai QTY rentang vs rentang pembanding.
- 🔴 Jangan kembali ke pola lama: blok ini dulu menyaring tanggal ke `today.getMonth()` (bulan berjalan), sehingga memilih rentang Agustus tetap menampilkan angka November. Itu akar bug "KPI terkunci bulan sekarang".
- Konsekuensi yang diterima: pembagi tidak lagi memakai "hari terakhir berdata" (kompensasi lag), jadi AVG sedikit lebih kecil bila hari terakhir rentang belum masuk.

### 3.4c 🛟 Tooltip kalkulasi KPI — JS global + dua varian
- Tooltip **bukan CSS lagi** — pakai satu elemen global `#kpiTip` (`position:fixed; z-index:2147483000`) yang digerakkan delegasi event di akhir skrip utama. Alasannya: `.bento-item:hover { transform: translateY(-4px) }` menciptakan *stacking context* yang mengunci z-index tooltip di dalam kartu → tertutup chart lain; dan `translateX(-50%)` memotong tooltip di tepi layar.
- Posisi mengikuti mouse dengan **flip otomatis** (horizontal + vertikal) + clamp 4px dari tepi viewport → tidak pernah keluar layar.
- `.help-icon` + `data-tooltip` = tooltip **dinamis** (baris "vs periode") → `setCompareMode` menambahkan suffix "Mode komparasi".
- `.help-icon` + `data-static-tooltip` = tooltip **rumus murni** (omzet, AVG, proyeksi, %, margin, CAC, loss rate, nota, insights) — tidak kena suffix mode.
- Aturan: nilai KPI di-set via `innerText` → ikon harus jadi **saudara statis** di HTML/JS template, bukan bagian dari teks nilai. Bungkus: `flex` container (value + icon).

### 3.4d 📊 Tab BIAYA (Dashboard khusus OPEX)
- Nav-bar mendapat **segmented pill** `DASHBOARD`/`BIAYA` (`showTab`) — satu baris dengan tombol dark mode. `biayaContainer` adalah bento grid kedua (hidden default). Baris tanggal & pill komparasi **tetap global**.
- **Data:** baris biaya di-fetch langsung ke Supabase REST (`GET /rest/v1/biaya?...` filter `"Tanggal" gte/lte`, anon, RLS public read) — **tanpa SQL/RPC baru**. Fetch lazy + cache per rentang (`_biayaRangeKey`/`_biayaPrevKey`); refetch saat rentang/mode komparasi berubah atau setelah tambah/edit/hapus. Mode `DATA_SOURCE==='supabase'` **wajib** ambil baris ke tabel `biaya` — `rawDataBiaya` hanya terisi di mode GAS, jadi memakainya di mode Supabase membuat tabel kosong.
- **Rentang kosong bukan error:** bila tak ada baris di rentang terpilih, tabel menampilkan tanggal biaya terakhir (`_biayaLatestIso`) sebagai hint. Jangan ganti dengan pesan "gagal memuat".
- **Rentang pembanding** dihitung ulang di `getPrevRangeIso()` — duplikat logika `pStart/pEnd` di `prosesData` (monthly = tanggal sama bulan lalu; rolling = N hari sebelum rentang). Jangan "refactor" salah satu saja tanpa menyesuaikan yang lain.
- **Widget:** KPI×4 (TOTAL BIAYA +% vs lalu [naik=merah], OPEX RATIO = biaya÷omzet bersih, BIAYA/NOTA = biaya÷nota, KATEGORI TERBESAR + share%) · TREN BIAYA **di-overlay omzet bersih** (`_trendDaily`) · doughnut KOMPOSISI + RANKING kategori (+selisih vs lalu / NEW) · TABEL per-entri (DataTables) dengan **EDIT** (reuse `expenseModal` mode update `_editBiayaId` → GAS `updateBiaya`) & **HAPUS** (confirm → GAS `deleteBiaya`).
- **GAS:** `deleteBiaya` & `updateBiaya` baru di `doGet` (`supabaseRequest_` method `delete`/`patch` — helper sudah generik). Simpanan cache `dash_data_v2` dihapus agar sync ambil data terbaru.
- **Global state yang dipakai tab biaya:** `__lastNetSales` & `__lastNotaCount` di-set di `prosesData` (jangan dihapus); `_trendDaily` (omzet per hari) dari `renderCharts`. Chart biaya di-`destroy` tiap re-render (anti-leak Chart.js).
- **WAJIB menunggu `prosesData()`:** semua pemanggilan lewat `jalankanProsesData_()` (mencatat `_prosesDataPromise`), dan `renderBiayaTab()` meng-`await` promise itu sebelum menggambar. Tanpa ini Total Biaya (dari baris tabel) sudah baru sementara Omzet/OPEX Ratio/Laba/ROAS/ROI masih angka rentang sebelumnya — lihat §3.11.
- `updateGranPills` di-scope `#mainContainer` supaya tidak menyentuh pill granularity tab biaya (`updateBiayaGranPills` terpisah).
- **Pendekatan komputasi:** semua KPI/komposisi/delta dihitung **client-side dari baris biaya** (bukan dari agregat RPC `rekapBiaya`) — konsisten antar widget di tab ini.

### 3.4e 📦 Tab HPP (master SKU & HPP)
- Pill ketiga `HPP` di nav-bar (`showTab('hpp')`) → `#hppContainer`. Tab ini **tidak ikut tercetak** (`@media print` menyembunyikannya).
- **Baca:** `GET /rest/v1/produk?select=id,"Nama Barang","Kode Series","Nama Series","Kategori Produk","HPP"` — RLS "allow public read", tanpa SQL/RPC baru.
- **Edit langsung:** tabel HPP bisa mengubah Nama Barang, Kode Series, Kategori, dan HPP per baris. Perubahan disimpan per-kolom di `_hppDirty[id] = {nama?,kode?,kategori?,hpp?}` (hanya field yang berubah yang dikirim), baris kena highlight, dan nilai yang belum disimpan tetap tampil saat tabel di-render ulang (lewat `hppVal_()`) — render tidak boleh mengembalikan nilai lama.
  - Nama Barang dipakai sebagai kunci pencocokan HPP ke transaksi, jadi: nama kosong ditolak, nama bentrok dengan SKU lain ditolak, dan rename minta konfirmasi (`confirm`) karena transaksi lama dengan nama lama kehilangan HPP-nya.
  - GAS membedakan `undefined` (jangan ubah) vs string kosong (sengaja dikosongkan) untuk kolom Kode Series / Nama Series / Kategori. Jangan kembalikan ke `if (r.kategori)` — mengosongkan kategori jadi mustahil.
- **Tulis:** GAS action `bulkUpsertProduk` (anon tidak punya policy INSERT/UPDATE). Payload `{rows:[{id?, hpp, nama?, kode_series?, nama_series?, kategori?}]}`. Server membaca peta `nama → id` sekali, jadi baris tanpa id menempel ke SKU yang sudah ada dan impor berulang **tidak** membuat duplikat. ⚠️ Setelah mengubah `gas/code-analytic.gs`, **deploy ulang Web App**; kalau belum, simpan akan gagal dengan "Action tidak dikenali oleh backend!".
- **Impor Excel:** header dideteksi dari 10 baris pertama (`Nama Barang`/`SKU`/`Produk` + `HPP`/`Modal`; opsional Kode Series, Nama Series, Kategori Produk). Pencocokan: Nama Barang (uppercase + trim) → lalu Kode Series. Baris tak cocok default **SKU baru**; dropdown per baris bisa diganti ke **Hubungkan ke SKU terdaftar** (HPP masuk ke SKU pilihan) atau **Buat SKU baru**. Tombol simpan terkunci sampai semua baris mode taut punya SKU tujuan.
- Setelah simpan sukses: `_hppRows` + `_produkMasterCache` di-reset dan `jalankanProsesData_()` dipanggil bila Dashboard aktif, supaya laba/margin langsung memakai HPP baru.
- HPP 0 tetap dianggap **kosong** (badge KOSONG, masuk KPI "HPP KOSONG") karena HPP 0 = laba produk dihitung terlalu besar. Jangan ubah jadi "ada".
- **`Kategori Produk` = teks, bukan harga.** Sheet lama menaruh HPP di kolom ini (kolom HPP kosong), jadi 261 dari 263 baris berisi angka. `normalizeProduk_` di `gas/migrate-supabase.gs` sekarang membaca HPP dari HPP/Modal lebih dulu dan mengisi kategori dari `Nama Series` bila selnya angka/`-`/kosong; GAS `bulkUpsertProduk` menolak kategori berupa angka dengan pesan jelas. Data lama dibersihkan lewat `supabase/migrasi_bersihkan_kategori_produk.sql` (mencadangkan nilai lama ke `produk_kategori_backup`, RLS aktif tanpa policy). Kategori asli tidak ada di sumber mana pun — jangan mengarang kategori lain selain `Nama Series`.

### 3.5 🟡 Responsif
- `html`/`body` `min-width:360px` + `body { overflow-x:auto }` (kunci minimum layar HP).
- Breakpoint: **1280px** (KPI `col-span-3→6`, `col-span-4→6`, `col-span-8→12`, header/nav `flex-wrap`), **768px** (nav kolom, `#reportrange` & pill full-width, kartu tetap 2-up), **640px** (semua kartu full-width, padding card 18px, `#rfmList` 1 kolom, baris detail KPI `flex-wrap` anti-overlap, tinggi chart trend dikecilkan).
- `.bento-container` `max-width:1440px` + `margin:0 auto` (desktop tidak melebar tak terkendali).
- Uji di lebar sempit setelah mengubah struktur; jangan hapus breakpoint karena "tidak kelihatan masalah" di layar lebar.

### 3.6 🟡 DataTables `dtProduk`
- `initDtProdukTable()`: `pageLength:10`, `lengthMenu:[5,10,25]`, di-`destroy` + buat ulang tiap `prosesData()`.
- **Konsekuensi:** pilihan "length" user di-reset ke 10 setiap render. Ini perilaku saat ini — kalau ingin persist, simpan & restore `page.len()` secara eksplisit.
- Nomor Rank di-tulis ulang di `drawCallback` — jangan geser kolom tanpa menyesuaikan `columnDefs` dan `order:[[4,'desc']]`.

### 3.7 🟡 Hati-hati mengubah struktur kartu
JS merujuk elemen **via id** (`chartTren`, `chartHari`, `chartMargin`, `chartKategori`, `dtProduk`, `tableKategori`, `marginAnalysis`, `rfmList`, `vipInsight`, dst). **Memindah kartu = aman. Mengubah/rename id = putus kabel diam-diam.** Jika menukar posisi kartu, pastikan keduanya `col-span-4` (atau sesuaikan grid 12 kolom).

**Setiap kartu (`.bento-item`) punya id sendiri** — dipakai untuk menunjuk kartu dari CSS/JS, mis. `document.getElementById('cardTopProduk').scrollIntoView()`. Pola: `cardKpiOmzet/Biaya…`, `cardTren|PetaWaktu|Rasio|MarketShare|TopProduk|Keranjang|Vip|Diagnosa`, dan versi tab biaya `cardBiayaTotal|Ratio|PerNota|KategoriTop|Omzet|Iklan|RoasTotal|RoiIklan|Shopee|Tiktok|Laba|Tren|Komposisi|Ranking|Detail`. Id ini **dekoratif** (tidak dibaca JS) — rename aman selama tidak dipakai kode luar. Catatan: jangan mengandalkan `#cardX` di URL dari hub, karena hash dipakai router (`#productive/analytic`) dan tool ini jalan di iframe.

### 3.8 🟡 Verifikasi layout pakai ukuran, bukan mata
Bug layout di file ini mustahil dideteksi sekilas (lihat §3.1). Setelah mengubah layout, ukur tinggi kartu vs konten di beberapa kondisi (mis. length 5 → 25 → 5) — bisa dengan Chrome headless.

### 3.10 🔴 Tooltip Trend Sales vs Retur menampilkan string `<svg ...>` — SUDAH DIPERBAIKI
**Gejala:** saat mode komparasi "Bandingkan Bulan Lalu", hover di grafik Trend menampilkan markup `<svg xmlns=...` mentah sebagai judul tooltip.
**Akar:** tooltip `title` callback menempelkan `ICONS.calendar` (string SVG) ke teks tooltip. Chart.js tooltip merender teks polos (`textContent`) — SVG tidak pernah dirender, malah tampil sebagai string.
**Fix:** ikon dihapus dari `title` callback chart Tren. **Aturan: jangan pernah menaruh string SVG/HTML ke dalam callback tooltip Chart.js** — tooltip tidak mendukung HTML; kalau mau ikon di tooltip, pakai `external` tooltip (elemen kustom).

### 3.11 🔴 Tab Biaya: Total Biaya benar, KPI lain kosong/angka lama — SUDAH DIPERBAIKI
**Gejala:** Total Biaya menampilkan angka benar, tapi OPEX RATIO / BIAYA-NOTA / ROAS / ROI / LABA tampak `0%` atau tetap angka rentang sebelumnya.
**Akar:** `drawBiaya()` membaca global hasil `prosesData()` (`__lastNetSales`, `__lastNotaCount`, `__lastNetProfit`, `_trendDaily`), sementara pemanggil (`applyRange`, `setCompareMode`, `toggleTheme`) memanggil `prosesData()` tanpa `await` lalu langsung `renderBiayaTab()`. Baris biaya di-fetch sendiri, jadi Total Biaya segar; global penjualan belum ter-update.
**Perbaikan:** satu jalur `jalankanProsesData_()` + `await _prosesDataPromise` di awal `renderBiayaTab()`. Jangan panggil `prosesData()` langsung dari handler baru — gunakan helper itu.

### 3.12 🔴 Grafik TREN memunculkan bulan/data pembanding padahal periode sebelumnya kosong — SUDAH DIPERBAIKI
**Gejala:** rentang Januari–Oktober + pill **Bulan Lalu** (granularitas Bulanan) memunculkan bucket bulan di luar rentang (mis. `NOV 26`) yang penjualannya `0` tetapi garis pembandingnya berisi nominal; angka pembanding tiap bulan juga tidak sama dengan total bulan sebelumnya.
**Akar (3 lapis, semuanya di jalur yang sama):**
1. `pEnd.setMonth(pEnd.getMonth() - 1)` pada tanggal 29–31 *melempar* hari ke bulan berikutnya (31 Okt → 1 Okt), jadi periode pembanding memakan 1 hari data periode ini (31 Des → sisa seluruh Desember). Ini juga membuat `getPrevRangeIso()` (tab Biaya) salah rentang.
2. `bucketTrend()` membuat bucket dari entry yang ada, sehingga entry sisa hari pembanding itu melahirkan bulan hantu di luar rentang.
3. Nilai pembanding dijumlahkan per *offset hari*, padahal panjang bulan berbeda → bucket Feb berisi 1–28 Jan, bucket Mar berisi 29 Jan–28 Feb, dst. Label tooltip lalu menulis "Bulan Lalu (JAN 26)" untuk angka Desember.
**Perbaikan:** satu helper `hitungRentangPembanding()` + `geserBulanClamp_()` (hari di-clamp ke akhir bulan tujuan) dipakai `prosesData()` **dan** `getPrevRangeIso()`; bucket bulanan dibuat lengkap hanya untuk bulan di rentang tanggal; nilai pembanding dipetakan ke bulan tanggalnya + 1 bulan, sehingga tiap bulan dibandingkan dengan total bulan kalender sebelumnya.
**Aturan:** jangan kembali ke `setMonth()` polos untuk menggeser bulan, dan jangan membuat bucket chart dari data (buat dari rentang tanggal). Regresi dikunci di `tests/analytic-trend.test.js`.

### 3.13 🖨️ Aturan tata letak cetak (A4 landscape)
- **Satu sumber tinggi chart**: blok "Tinggi chart per peran" di `@media print` — `.chart-box` 130px, `.col-span-12` (TREN) 180px, kartu Market Share 100px, tab Biaya 150px. Jangan menambah aturan `.chart-box` kedua di tempat lain: dulu ada `.col-span-12 .chart-box{200px}` yang diam-diam menimpa dan membuat baris pertama meluap.
- **Daftar kategori Market Share** dipaksa `display:grid` 2 kolom di print (inline-nya `display:flex; flex-direction:column`), supaya kartunya tidak 2x lebih tinggi dari tabel TOP PRODUK di sebelahnya. `column-count` tidak bisa dipakai di kontainer flex.
- **Pemenggalan halaman**: `.bento-item` tetap `break-inside:avoid` (kartu tidak boleh terbelah), `.bento-header` + separator `#...::before` memakai `break-after:avoid` (judul tidak menggantung di dasar halaman), tabel boleh pecah (`table{break-inside:auto}`, `tr{break-inside:avoid}`, `thead{display:table-header-group}`).
- **Jangan sembunyikan kartu di print.** Dulu 6 kartu (INSIGHTS, RASIO KESEHATAN, PETA WAKTU, KERANJANG, VIP, DIAGNOSA) di-`display:none` "hemat kertas"; akibatnya laporan cetak kehilangan semua bagian tulisannya walau di layar tampil. Hanya kontrol (`.compare-pill`) yang dibuang; tab non-aktif & HPP sudah otomatis tidak tercetak lewat `display` inline dari `showTab()`.
- **Hasil terukur (data Nov 2026)**: Dashboard 2 halaman — hal.1 KPI + TREN, hal.2 Market Share/Top Produk + Retensi/Retur/Katalog + Riwayat (sebelumnya 3 halaman dengan lubang 159px dan 235px). Tab Biaya: 19 kartu bertumpuk 1 kolom, kartu tertinggi 205px dari tinggi halaman 718px.
- **Pemicu luapan di layar (bukan print)**: (1) track grid `1fr` punya minimum `auto`, jadi kanvas Chart.js selebar jendela lama bisa melebarkan track → pakai `minmax(0,1fr)` + `min-width:0` di `.bento-item`; (2) Chart.js menunda `resize` selama animasi (`_resizeBeforeDraw`) dan penundaan itu tidak pernah diterapkan lagi → handler `resize` (debounce 120 ms) di akhir skrip; (3) `#rfmList` dulu `max-height:400px` dengan `overflow` visible → baris partner menonjol keluar kartu.
- **Cara mengukur** tanpa dialog print: sunting isi `@media print` ke `<style>` lalu ukur **clone** kartu di kontainer selebar 1046px (A4 landscape 190mm). Mengukur elemen aslinya menipu: `prosesData()` mengganti node kartu, jadi hasilnya nilai basi.

### 3.14 ⚠️ Peringatan SKU terjual tanpa HPP
- Banner `#hppWarningBanner` (tepat di atas baris KPI, `grid-column:1/-1`) muncul saat rentang terpilih memuat penjualan dari SKU yang HPP-nya 0/kosong, dan menyebut jumlah SKU, omzet terdampak, serta unit. Tombol **Isi HPP** pindah ke tab HPP dengan pencarian terisi; tombol **Tutup** hanya menyembunyikan banner sampai `prosesData()` berikutnya.
- **Mode Sheet:** `hppKosongMap` dikumpulkan per baris penjualan saat `totalHpp` baris itu 0.
- **Mode Supabase (aktif):** `rawDataTransaksi` **kosong** — data datang agregat dari RPC, jadi loop per baris tidak pernah jalan dan `dqMissingHpp` selalu 0. Deteksi karena itu diambil dari `rekapProdukDetail` (agregat per SKU): `sales > 0`, `qty > 0`, `cogs == 0`. `cogs` di SQL = `sum(abs(hpp*qty))` dari join ke master `produk`, jadi cogs 0 berarti HPP 0 **atau** nama SKU tidak ada di master — dua-duanya data yang harus dibetulkan. Jangan pindahkan deteksi kembali ke loop transaksi tanpa memuat baris transaksi di mode Supabase.
- SKU tanpa master (mis. `S PINK BIRU`) tidak akan ketemu di tabel HPP; tombol **Isi HPP** sengaja memilih SKU pertama yang ada di master supaya tidak mendarat di pencarian kosong. SKU seperti itu hanya bisa masuk lewat impor Excel (opsi "Buat SKU baru").

### 3.15 ⚠️ Pembaca file export (Upload Biaya & Import Penjualan)
- Export akuntansi (Accurate) punya 4–6 baris judul di atas header dan kolom pemisah kosong. Header **jangan** dicari hanya di 5 baris pertama: `handleBiayaFileSelect` memakai batas 30 baris.
- Sel tanggal diperlakukan sebagai **tanggal kalender**, bukan instant. `getExcelCellValue` mengembalikan `YYYY-MM-DD` dari nilai asli (Date/serial) dan **bukan** `cell.w`, karena `cell.w` bisa berbentuk `11/2/26` yang ambigu D/M vs M/D dan menggeser bulan saat dikirim ke GAS.
- `parseFlexibleDate` menerima Date, serial Excel (angka maupun teks), `YYYY-MM-DD`, `D/M/Y` (tahun 2 atau 4 digit), nama bulan Indonesia (`Agustus`, `Agu`), dan `Date.toString()` (`Mon Nov 02 2026 00:00:00 GMT+0000 ...` — nama hari di depan diabaikan oleh pola `mdyWordMatch`). Jangan ganti dengan `new Date(str)` mentah: `Date.parse` membaca `11/2/26` sebagai **M/D**, berbeda dari default D/M di GAS.
- **Upload Biaya:** tanggal wajib `YYYY-MM-DD` **dan nyata** (`tanggalIsoValid_`: tahun 1900–2100, tanggal harus ada di kalender — `31/02` dan `46235-01-01` ditolak). Baris yang gagal **dilewati**, dicatat di `_biayaDilewati` (nomor baris Excel + isi sel tanggal aslinya), dan didaftarkan satu per satu di info pratinjau — bukan hanya jumlahnya. `sendBiayaToGAS` memfilter ulang sebelum kirim sebagai jaring terakhir. Kalau tersimpan sebagai `Tanggal: null`, baris itu tidak akan pernah muncul di rentang dashboard mana pun (semua widget difilter per tanggal).
- **Baris hanya Kredit:** jurnal dengan `Debit` 0 dan `Kredit > 0` tetap **tidak diimpor** (bukan biaya), tetapi tidak boleh hilang tanpa jejak: `_biayaKredit` menampung nomor baris Excel, No Bukti, dan nominalnya, lalu pratinjau menampilkan **jumlah baris + total Rp** beserta daftar barisnya (pola sama dengan daftar tanggal invalid). Kolom Kredit dicari otomatis dari header (`kredit`/`credit`); di jalur pemetaan manual dicari dari `window._biayaHeaders`.
- Pratinjau Biaya menampilkan kolom **Tanggal** — satu-satunya tempat memastikan tanggal hasil baca sebelum KIRIM DATA. Jangan dihapus tanpa pengganti.

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
