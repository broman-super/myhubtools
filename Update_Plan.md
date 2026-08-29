# Update Plan — Webtools Analytic: Dashboard Biaya ROAS/ROI

Tanggal: 2026-08-27
Status: Build — Opsi B + L1 + D1 (disepakati)

> File lama dikosongkan — diganti rencana Analytic Biaya ROAS/ROI per jawaban user 2026-08-27.

## Keputusan Kunci (dari diskusi)

- **Opsi B:** ROAS pecah Shopee / Tiktok / Total (bukan cuma Total)
- **Biaya Iklan = hanya Supersub** (KYX tidak masuk). `Iklan Generik` belum ada → `Biaya Iklan = 5 kategori baru saja` tanpa `IKLAN` generik
- **TOPUP SALDO IKLAN TIKTOK SUPERSUB → masuk Tiktok** (bukan Total saja)
- **ROI = ROI Iklan** (`Laba Bersih ÷ Biaya Iklan`)
- **Label eksplisit:** `Omzet Kotor` vs `Omzet Bersih` — user setuju
- **Layout L1:** 2 baris bento 4 kolom (8 kartu kecil) — paling rapi tanpa FAQ
- **Dropdown D1:** 1 dropdown global di header `DASHBOARD BIAYA` — `Omzet Kotor | Omzet Bersih` ganti semua ROAS/ROI
- **Warna ROAS/ROI:** diserahkan — harus mudah terbaca (success/danger/warning)

## Definisi (kunci anti abu-abu)

- `Omzet Kotor` = `Total Penjualan` (sebelum retur, sebelum HPP) — `sum Penjualan`
- `Omzet Bersih` = `Penjualan − Retur` — `__lastNetSales` (sudah ada, belum potong HPP)
- `Laba Bersih` = `Omzet Bersih − HPP − Total Biaya` — sudah ada
- `Biaya Iklan Shopee` = `IKLAN SHOPEE SUPERSUB` (hanya Supersub, KYX diabaikan)
- `Biaya Iklan Tiktok` = `IKLAN TIKTOK SUPERSUB` + `TOPUP SALDO IKLAN TIKTOK SUPERSUB`
- `Biaya Iklan Total` = Shopee + Tiktok
- `ROAS Shopee` = `Omzet Shopee ÷ Biaya Iklan Shopee` (x)
- `ROAS Tiktok` = `Omzet Tiktok ÷ Biaya Iklan Tiktok` (x)
- `ROAS Total` = `Omzet (sesuai dropdown) ÷ Biaya Iklan Total` (x)
- `ROI Iklan` = `Laba Bersih ÷ Biaya Iklan Total ×100%` (%)
- `Omzet Shopee/Tiktok` diambil dari `rekap_dashboard` (`rekapMarketplace` / `marketplace` per marketplace)
- `Lain-lain` = `Kategori Biaya` kosong/`LAIN*` → `deriveBiayaSubKat_(Keterangan)` hanya 5 kategori iklan, selain itu tetap `Lain-lain` — tooltip `?` di header Biaya jelaskan.

## Scope

- `Productive/analytic/Analytic.html` saja (frontend). `gscode` tidak perlu (hitung di frontend, data sudah ada).
- Tidak ubah DB/Supabase, tidak ubah upload flow (sudah fix header anti-gagal + preview debug).
- Dark mode + print tetap `display:none` untuk kartu baru.

## Layout L1 — 2 Baris Bento (8 Kartu Kecil)

Baris 1 (4 kartu): `Omzet Bersih (dropdown)` | `Biaya Iklan Total` | `ROAS Total` | `ROI Iklan`
Baris 2 (4 kartu): `ROAS Shopee` | `ROAS Tiktok` | `Laba Bersih` | `OPEX Ratio` (existing, tetap)

- Tetap pakai `bento-container` grid yang sudah ada — tambah 1 `bento-container` baru atau sisip di `biayaContainer` sebelum `biayaChartTren`.
- Kartu pakai `bento-item col-span-3` (4 kolom) biar 4 per baris, `bento-value` + `bento-sub` + `help-icon` tooltip rumus.

## Dropdown D1 — Omzet Kotor vs Bersih

- Lokasi: header `DASHBOARD BIAYA` sebelah kanan, sebelum `Catat Biaya`/`Upload Biaya` — `select` kecil `Pilih Omzet: [Omzet Kotor ▼]` / `[Omzet Bersih ▼]`
- State: `localStorage.biaya_omzet_mode = 'kotor'|'bersih'` (default `bersih` biar kompatibel lama)
- Helper `getOmzetForRoas(market, mode)`:
  - `kotor` → `sum Penjualan` per marketplace dari `rawDataTransaksi` / `rekap` (sebelum retur)
  - `bersih` → `__lastNetSales` per marketplace (sudah ada) atau `Omzet Bersih` global
- `onchange` → `drawBiaya()` → semua `ROAS*` re-render, simpan `localStorage`.

## Warna ROAS/ROI (mudah terbaca)

- `ROAS >= 1.0` / `ROI >= 0%` → `var(--success)` hijau `#10b981`
- `ROAS < 1.0` / `ROI < 0%` → `var(--danger)` merah `#ef4444`
- `ROAS 1.0–1.5` → `var(--warning)` amber `#f59e0b` (opsional, biar tidak cuma hijau/merah)
- Nilai format: `ROAS 3.2x`, `ROI 24.5%` — `font-weight:800`, `help-icon` tooltip `ROAS = Omzet ÷ Biaya Iklan`.

## Tooltip/Legend Lain-lain

- Header `DASHBOARD BIAYA` tambah `?` kedua: `Lain-lain = Kategori kosong/LAIN* → derive dari Keterangan Jurnal hanya 5 frasa iklan, selain itu tetap Lain-lain.`
- Di bawah rank list tambah legend kecil `Lain-lain: ...` kalau ada.

## Langkah Eksekusi

1. `Analytic.html` — tambah `<select id="biayaOmzetMode">` di header biaya + helper `getOmzetForRoas` + `localStorage` load/save
2. `Analytic.html` — tambah agregasi `Biaya Iklan` per marketplace (Supersub-only) di `drawBiaya()` + hitung `ROAS*`/`ROI Iklan` + render 8 kartu KPI baru (L1)
3. `Analytic.html` — tambah tooltip `Lain-lain` + legend + warna `success/danger` di kartu ROAS/ROI
4. Verifikasi: `file://` preview — ganti dropdown `Kotor↔Bersih` → ROAS ganti; dark mode; `Ctrl+P` kartu baru tidak ikut cetak (`no-print`); `Lain-lain` tooltip muncul

## Verifikasi

- `Omzet Kotor` vs `Bersih`切换 → `ROAS Shopee/Tiktok/Total` berubah sesuai
- `Biaya Iklan` hanya hitung `SUPERSUB` + `TOPUP` → `KYX` tidak masuk (cek via preview debug `Alasan`)
- `ROI Iklan` = `Laba Bersih ÷ Biaya Iklan`
- Dark mode & print tidak bocor
