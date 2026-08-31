# Update Plan — Webtools Analytic: Dashboard Biaya & Penjualan

Tanggal: 2026-08-27 (revisi — file lama dikosongkan)
Status: Build — sudah eksekusi ROAS/ROI, lanjut Piutang proxy + Print 8px

## Ringkasan Keputusan (dari diskusi beruntun)

- **Biaya — ROAS/ROI:** Opsi B (ROAS pecah Shopee/Tiktok/Total) + Biaya Iklan = hanya Supersub (KYX tidak masuk) + TOPUP → Tiktok + ROI = ROI Iklan + Layout L1 (2 baris bento 8 kartu) + Dropdown D1 (Omzet Kotor/Bersih global, simpan localStorage) + Label eksplisit Omzet Kotor vs Bersih
- **Lain-lain:** `Kategori Biaya` kosong/LAIN* → `deriveBiayaSubKat_(Keterangan Jurnal)` hanya 5 frasa iklan (SHOPEE/TIKTOK/KYX/SUPERSUB/TOPUP), selain itu tetap `Lain-lain` — tooltip di header Biaya jelaskan
- **Piutang (baru):** Template Excel sekarang tanpa kolom Status Pembayaran (kalau dipaksakan, Nama Barang malah hilang). Jadi Piutang tidak bisa baca kolom — pakai **proxy waktu 7 hari**: `Piutang = Omzet Bersih di 7 hari terakhir`, `Lunas = Omzet Bersih − Piutang`
- **Print:** Hemat kertas → `font-size:8px`, `bento-item break-inside:avoid`, `table thead` ulang tiap halaman, `chart-box 90px`

## Definisi Kunci

- `Omzet Kotor` = `Total Penjualan` (sebelum retur, sebelum HPP) — `sum Penjualan`
- `Omzet Bersih` = `Penjualan − Retur` — `__lastNetSales`
- `Laba Bersih` = `Omzet Bersih − HPP − Total Biaya`
- `Laba Kotor` = `Omzet Kotor − HPP − Total Biaya` (khusus saat dropdown Kotor)
- `Biaya Iklan Shopee` = `IKLAN SHOPEE SUPERSUB`
- `Biaya Iklan Tiktok` = `IKLAN TIKTOK SUPERSUB` + `TOPUP SALDO IKLAN TIKTOK SUPERSUB`
- `Biaya Iklan Total` = Shopee + Tiktok
- `ROAS Shopee` = `Omzet Shopee ÷ Biaya Iklan Shopee`
- `ROAS Tiktok` = `Omzet Tiktok ÷ Biaya Iklan Tiktok`
- `ROAS Total` = `Omzet (sesuai dropdown) ÷ Biaya Iklan Total`
- `ROI Iklan` = `Laba (sesuai dropdown Kotor/Bersih) ÷ Biaya Iklan ×100%`
- `Piutang` = `Omzet Bersih 7 hari terakhir` (proxy payout Shopee H+2/Tiktok H+3) — `Lunas = Omzet − Piutang − Retur Potensial (0, Retur Faktur tersendiri)`
- `Lain-lain` = `Kategori Biaya` kosong/LAIN* → derive hanya 5 frasa, selain itu tetap `Lain-lain`

## Scope

- `Productive/analytic/Analytic.html` saja (frontend). `gscode` tidak perlu untuk Piutang/Print (hitung di frontend, data sudah ada).
- Tidak ubah DB/Supabase untuk Piutang sekarang (tanpa kolom `status_bayar`).
- Upload flow Biaya sudah fix: header scan 5 baris + mapping manual fallback + preview debug + `Tanggal` fallback `No Bukti`.

## Layout

- **Biaya — 2 baris bento L1 (8 kartu):** Baris1 `Omzet (Bersih/Kotor dropdown) | Biaya Iklan | ROAS Total | ROI Iklan` — Baris2 `ROAS Shopee | ROAS Tiktok | Laba (Kotor/Bersih) | OPEX Ratio` — `col-span-3` 4 kolom, `bento-value` + `help-icon` tooltip rumus
- **Penjualan — tambah 1 bento `PIUTANG`** sebelah `LABA BERSIH`: `Piutang Rp (xx%) | Lunas Rp | Retur Rp` + tooltip `Piutang = Omzet 7 hari terakhir (proxy)`
- **Print:** `@media print` → `html,body {font-size:8px}` + `bento-item {break-inside:avoid; padding:6px}` + `chart-box {height:90px}` + `table thead {display:table-header-group}`

## Langkah Eksekusi Selanjutnya

1. **Piutang:** tambah `bento-item PIUTANG` di `biayaContainer` atau `mainContainer` + helper `getPiutangProxy(7)` + hitung `piutang/lunas` di `drawBiaya`/`prosesData` + warna `piutang >30% → warning`
2. **Print:** sesuaikan `@media print` ke `8px` + `break-inside:avoid` + test `Ctrl+P` tidak ada baris terpotong
3. Verifikasi: `file://` ganti dropdown `Kotor↔Bersih` → ROAS/ROI/Laba ganti; `Piutang` = 7 hari terakhir; dark mode; print 8px compact

## Verifikasi

- Dropdown `Kotor/Bersih` → `Omzet` & `ROAS` & `Laba` ganti
- `Biaya Iklan` hanya Supersub → KYX tidak masuk (cek preview debug)
- `Piutang` = 7 hari terakhir, `Lunas` = sisanya, `Retur` dari `Tipe Transaksi`
- Print `Ctrl+P` → tiap kartu utuh, tabel header keulang, font 8px hemat kertas
