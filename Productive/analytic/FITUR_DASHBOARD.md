# Fitur Dashboard Analytic — Daftar Lengkap

> File: `Productive/analytic/Analytic.html` + `gscode/code-analytic.gs` | Update: 2026-08-27

## 1. Autentikasi & Shell
- Login gate `sessionStorage intel_auth` (password `Admin@`), `checkLogin()` auto-hide `loginOverlay`
- Hub REYNAHUB iframe routing `#productive/analytic` + `postMessage` sync tema `data-theme`
- Service Worker `src/sw.js` network-first, cache `reynahub-v4`

## 2. Dashboard Utama (Penjualan)
### KPI Cards (Bento 12-kolom)
- **Omzet Bersih** (`Penjualan − Retur`) + % vs periode lalu + gap Target
- **Total Retur** + Loss Rate + unit retur
- **Laba Bersih** (`Omzet Bersih − HPP − Total Biaya OPEX`) + Net Margin + OPEX Ratio
- **OPEX Detail** (`Biaya: Rp | Margin: %` + tooltip CAC)
- **Hari Gacor / Hari Mati** (Golden Day)
- **Market Share** (doughnut kategori) + **Top Produk & Momentum** (DataTables rank, margin, retur rate, momentum MoM)
- **Rasio Kesehatan Keuangan** (doughnut Net Profit vs OPEX)
- **Peta Waktu Gacor** (bar per hari Senin–Minggu)
- **Intelijen Keranjang & CAC** (AOV, UPT, CAC, radar kebocoran)
- **VIP Segmentation & Churn** (RFM: SULTAN/AKTIF/AWAS KABUR, B2B Reseller vs B2C Marketplace)
- **Instant Diagnostics** (engine anomali lokal + tombol Tanya Gemini `getAnalysis` via GAS)

### Charts
- **Tren Sales vs Retur** — line chart zoom/pan (`chartjs-plugin-zoom` + hammerjs), datalabels print, mode Harian/Mingguan/Bulanan auto (>60h→mingguan, >180h→bulanan)
- **Market Share** — doughnut kategori
- **Rasio Kesehatan** — doughnut Net Profit vs OPEX
- **Peta Waktu Gacor** — bar per hari
- Semua chart `Chart.defaults.color` ikut `data-theme`, `print-color-adjust: exact`

### Filter & Navigasi
- **Date Range Picker** (`daterangepicker` + `moment`) — preset 7/14/30 Hari, Bulan Ini, custom
- **Mode Komparasi** `rolling` (N hari sebelum) vs `monthly` (bulan lalu tanggal sama)
- **Filter Kategori Produk** + **Reseller/Pelanggan** (dropdown dinamis dari `rekap`)
- Pill granularity Tren: Hari/Minggu/Bulan

### Tabel
- **Top Produk & Momentum** (`#dtProduk` DataTables 1.13.6) — pageLength 5, lengthMenu 5/10/25, rank, margin, retur
- **Tabel Kategori, Margin Analysis** — teks flex:1 biar kartu tidak kosong

## 3. Dashboard Biaya (OPEX) — Tab Terpisah
> `showTab('biaya')` → `bento-container #biayaContainer` (hidden default), tanggal & komparasi global

### KPI Biaya (2 baris bento L1 — 8 kartu)
- **TOTAL BIAYA** + % vs lalu
- **OPEX RATIO** (`Total Biaya ÷ Omzet Bersih`)
- **BIAYA / NOTA** (`Total Biaya ÷ Nota`)
- **KATEGORI TERBESAR** + share%
- **OMZET (KOTOR/BERSIH)** — dropdown `Omzet Kotor (Penjualan)` vs `Omzet Bersih (Penjualan − Retur)`, simpan `localStorage.biaya_omzet_mode`
- **BIAYA IKLAN** (Supersub-only: `IKLAN SHOPEE SUPERSUB` + `IKLAN TIKTOK SUPERSUB` + `TOPUP SALDO IKLAN TIKTOK SUPERSUB`; KYX tidak masuk)
- **ROAS TOTAL** (`Omzet ÷ Biaya Iklan` — ikut dropdown Kotor/Bersih)
- **ROI IKLAN** (`Laba ÷ Biaya Iklan` — ikut dropdown, `Laba Kotor = Omzet Kotor − HPP − Biaya`)
- **ROAS SHOPEE** + **ROI SHOPEE** (dalam 1 kartu SHOPPEE: ROAS di atas, ROI di bawah)
- **ROAS TIKTOK** + **ROI TIKTOK** (dalam 1 kartu TIKTOK)
- **LABA BERSIH/KOTOR** (ikut dropdown)
- Warna ROAS/ROI: `≥1.5x / ≥0% → success hijau`, `1.0–1.5x → warning amber`, `<1.0 / <0% → danger merah`

### Chart Biaya
- **Tren Biaya & Omzet** — line `Biaya` vs `Omzet Bersih` per hari/minggu/bulan (`bucketBiaya`)
- **Komposisi Kategori** — doughnut Top 8 kategori (palette `_BIYA_PALETTE` include `#a855f7` IG purple)
- **Ranking Kategori** — bar list Top 10 + delta vs lalu

### Tabel Biaya
- **Detail Per-Entri** (`#biayaTable` DataTables) — Tanggal | Kategori | Nominal | Aksi (Edit/Hapus)
- **Edit** reuse `expenseModal` (`_editBiayaId` → GAS `updateBiaya`), **Hapus** confirm → GAS `deleteBiaya`
- Kategori `Lain-lain`/`Lainnya` auto-derive dari `Keterangan Jurnal` hanya 5 frasa iklan (case/hyphen/spasi toleran), selain itu tetap `Lain-lain` — tooltip `?` di header jelaskan

### Data Biaya
- Fetch langsung Supabase REST `GET /rest/v1/biaya?select=...&Tanggal=gte/lte&order=Tanggal.asc` (anon, RLS public read), cache per rentang `_biayaRangeKey/_biayaPrevKey`
- **Bulk Import Biaya**: modal `uploadBiayaModal` — dropzone + `biayaFileInput` (`.xlsx/.xls/.csv` via SheetJS 0.18.5), header detection scan 5 baris + **mapping manual** fallback (dropdown pilih kolom No Bukti/Keterangan/Debit/Tanggal/Kategori), preview 8 baris + kolom **Kategori →** (hasil derive) + **Alasan** + ringkasan `KATEGORI: count`, dedup `biayaKey(Tanggal,No Bukti,Keterangan,Debit)` di GAS, `Tanggal` fallback `parseNoBuktiDate` kalau kosong

## 4. Import & Data Lain
- **Import Excel Penjualan (Bulk Upsert)** — SheetJS, auto-detect mapping kolom, preview, `bulkUpsertTransaksi` (GAS), dedup `dedupe_key`
- **Target Sales** — `saveTarget` (GAS) + `localStorage` + KPI gap
- **Biaya Manual** — `bukaModalBiaya` → `expenseModal` → GAS `addBiaya`
- **Cache** `intel_pro_cache_v3` (GAS) + `intel_pro_cache_v4` (Supabase rekap) — offline fallback

## 5. Print / Export
- `@media print` A4 landscape (10mm margin), `bento-container` 3 kolom, `bento-item` `break-inside:avoid`, `chart-box` 90/120px, `print-color-adjust:exact`
- Sembunyikan di print: `nav-bar`, `settingsModal`, `uploadExcelModal`, `uploadBiayaModal`, `expenseModal`, `loginOverlay`, `processingOverlay`, `dropzone`, `biayaDropzone`, `biayaMappingBox`, `biayaPreviewBox`, tombol `openBiayaUploadModal`/`bukaModalBiaya`/`Import Excel`
- **Print View Analytic (Team Planner)** — `.tpb.camp` background `#a855f7` (IG) preserve via `print-color-adjust: exact`

## 6. UI/UX & Tema
- **Design tokens** `src/styles/design-system.css` (`--bg`, `--card`, `--primary`, `--border`, `--text`, `--success`, `--danger`, `--warning`, `--warning-strong`) + `color-scheme: light/dark` untuk native controls
- **Dark mode** `data-theme="dark"` + daterangepicker dark override + DataTables dark
- **Bento grid** 12 kolom, `max-width:1440px` center, `min-width:360px`, `overflow-x:auto`, breakpoint 1280px/768px/640px
- **Tooltip** global `#kpiTip` `position:fixed` z-2147483000, flip otomatis
- **Loading** 3-dot roadmap `setStage(0..2)` tanpa spinner

## 7. Integrasi & Dependency
- CDN ter-pin: Chart.js 3.9.1, datalabels 2.2.0, zoom 2.0.1, hammerjs 2.0.8, jQuery 3.7.1, moment 2.29.4, daterangepicker 3.1.1, DataTables 1.13.6, SheetJS 0.18.5, marked
- Backend: `gscode/code-analytic.gs` (Web App `API_URL`), Supabase `rekap_dashboard` RPC (SECURITY INVOKER, `GRANT EXECUTE TO anon`), tabel `transaksi` + `biaya` + `produk` (HPP)

## 8. Catatan Penting
- `HPP` dari `produk.HPP/Modal` → `katalogProduk[NAMA BARANG UPPER].hpp` → `totalHpp = hpp*qty` → `Laba Bersih`
- `__lastNetSales/__lastGrossSales/__lastCogs/__lastNetProfit` di-set di `prosesData` untuk ROAS/ROI
- `biaya_omzet_mode` simpan di `localStorage`, `onchange` + `addEventListener` (double-bind sudah dihapus)
