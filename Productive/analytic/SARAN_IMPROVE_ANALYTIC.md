# Saran Improve Webtools Analytic

Berdasarkan pembacaan `Productive/analytic/Analytic.html`, schema Supabase (`supabase/fase2_fungsi.sql`), dan pola penggunaan saat ini.

## 1. Quick Wins (Bisa Langsung Diterapkan, Risiko Rendah)

| No | Saran | Alasan | Implementasi | Estimasi |
|---|---|---|---|---|
| 1.1 | **Tampilkan "Data Quality" mini di header** | Banyak transaksi bisa punya HPP 0, tipe tidak dikenali, atau nama produk beda format. Saat ini user tidak tahu ada issue. | Tambah badge "X issue" di navbar (klik bisa buka modal ringkas). Hitung: penjualan tanpa HPP, retur tanpa match faktur, tipe tidak terklasifikasi. | 1-2 jam |
| 1.2 | **Tambahkan disclaimer "Piutang = Estimasi/Proxy"** | Seperti dicatat di evaluasi, perhitungan piutang saat ini adalah proxy 7 hari. Sangat mudah disalahartikan sebagai saldo AR riil. | Tambah tooltip/disclaimer di kartu Piutang + di print view. | 15-30 menit |
| 1.3 | **Perbaiki label perbandingan periode** | Di mode "Bulan Ini/Bulan Lalu", label trend bisa membingungkan (kadang menampilkan label yang kurang jelas). RPC sudah ada `labelLalu` tapi bisa diperjelas. | Pastikan label pembanding selalu eksplisit ("vs 1 Apr - 19 Apr") di tooltip/badge. | 30-60 menit |
| 1.4 | **Tambahkan filter "Hanya dengan HPP"** | Biar bisa cross-check gross margin dengan cepat tanpa harus buka semua data. | Tambah toggle di filter produk/kategori atau dropdown baru. Filter `produkDetail`/render hanya yang punya HPP valid. | 1 jam |
| 1.5 | **Export CSV per tabel** | DataTables sudah ada, tapi export yang sering dipakai (Top Produk, Kontributor) bisa lebih cepat diakses. | Tambah tombol "Export CSV" di header tiap tabel penting (Top Produk, RFM/Top Pelanggan, Biaya per kategori). | 1 jam |

## 2. Fitur Baru yang Relevan dengan Database Yang Ada

| No | Fitur | Value | Kebutuhan Data | Cara Implementasi | Estimasi |
|---|---|---|---|---|---|
| 2.1 | **AR Aging (Sederhana)** | Tinggi untuk monitoring piutang | Butuh `Nomor #` (faktur), tanggal transaksi, nilai. Saat ini bisa dihitung umur faktur dari tanggal transaksi. Belum ada status lunas/belum - jadi bisa jadi "Umur Piutang by Faktur" berbasis tanggal faktur vs hari ini/range. | Kelompokkan penjualan per faktur (agregasi by `Nomor #` + pelanggan), hitung umur = (max(date) atau tanggal faktur) - tanggal, lalu bucket 0-7, 8-14, 15-30, >30. Tampilkan tabel + chart. | 3-4 jam |
| 2.2 | **Gross Margin per Produk/SKU** | Sangat berguna | Sudah ada di `rekapProdukDetail` (qty, sales, cogs, retur). Bisa dihitung langsung. | Tambah kolom Margin (Rp) dan Margin % di tabel "Top Produk". Sortable by margin % juga berguna. | 1-2 jam |
| 2.3 | **Return Rate per Kategori/Channel** | Berguna untuk QC | Sudah ada retur per kategori dan per produk. | Tambah KPI "Return Rate %" (Retur Rp / Penjualan Rp * 100) per kategori + top produk dengan return rate tertinggi. Bisa ditambahkan di tab atau panel baru. | 1-2 jam |
| 2.4 | **ABC Analysis (Pareto)** | Bagus untuk prioritas stok/fokus penjualan | Sudah ada penjualan per produk. | Hitung kontribusi kumulatif % dari omzet bersih per produk, klasifikasi A (80%), B (15%), C (5%). Tampilkan badge di tabel Top Produk. | 2 jam |
| 2.5 | **Repeat Purchase / Pelanggan Kembali** | Berguna untuk retention | Sudah ada `freqPelanggan` dan `firstPurchase`. | Hitung % pelanggan dengan frekuensi >= 2 dalam periode vs total pelanggan aktif. Bisa tambahkan di panel RFM/Kontributor. | 1-2 jam |
| 2.6 | **Biaya per Hari Rata-rata & Run-rate Biaya** | Pelengkap OPEX ratio | Sudah ada `totalBiaya` dan range tanggal. | Tambah metrik "Biaya/hari", "Proyeksi biaya bulan ini" (berdasarkan run-rate) di tab Biaya. | 1 jam |

## 3. Saran Perbaikan Logika/Penempatan

| No | Masalah | Observasi | Saran Perbaikan | Catatan |
|---|---|---|---|---|
| 3.1 | **Klasifikasi penjualan terlalu permisif** | Di mode sheet ada `if (!isRetur && !isBatal) isPenjualan = true;` (baris ~3515). Sangat berbahaya kalau ada tipe lain. Di RPC juga ada logika serupa. | Buat whitelist ketat: hanya terima tipe yang mengandung `faktur`, `penjualan`, `sales`, `invoice`. Sisanya masuk "Tidak Terklasifikasi" dan **tidak** dihitung sebagai penjualan. Tampilkan count-nya. | **Paling penting** - bisa bikin omzet overstated. |
| 3.2 | **HPP bisa 0 diam-diam** | Kalau produk tidak ketemu di tabel `produk`, HPP jadi 0. Gross profit jadi salah besar. | Validasi: kalau baris penjualan punya produk tapi `hppTotalBaris <= 0` dan bukan retur → tandai sebagai "HPP Hilang". Tambah counter + warning. Pertimbangkan exclude dari gross margin calc atau tampilkan "N/A" dengan alasan. | Perlu koordinasi dengan data master produk. |
| 3.3 | **Retur bisa bikin COGS negatif** | Saat retur, `dSkrg.cogs -= Math.abs(hppTotalBaris)`. Kalau retur qty > qty jual atau HPP beda bisa aneh. | Track COGS kumulatif penjualan per produk/faktur. Batasi pengurangan COGS retur tidak melebihi COGS penjualan terkait. Minimal: `dSkrg.cogs = Math.max(0, dSkrg.cogs - Math.abs(hppTotalBaris))`. | Aman untuk mencegah angka negatif. |
| 3.4 | **Basket tracking by nama pelanggan** | Nama bisa sama, beda orang. | Tambah disclaimer "Berdasarkan Nama Pelanggan" di kartu AOV/UPT/Basket Intel. Kalau ada duplikasi mencurigakan (nama sama beda pola) bisa di-flag. Idealnya butuh customer ID, tapi skema saat ini tidak ada. | Hanya bisa improve UX/disclaimer, bukan fix sempurna tanpa perubahan skema. |
| 3.5 | **Penempatan info** | "Basket Intel", "RFM", "Top Pelanggan" informatif tapi kadang user bingung bedain. | Pertimbangkan gabung jadi "Pelanggan" jadi satu panel dengan tab (Basket, RFM, Kontributor). Lebih rapi, scroll lebih sedikit. | Perbaikan UX, tidak ubah perhitungan. |
| 3.6 | **Filter reseller kurang konsisten** | Filter reseller ada di beberapa tempat, logika di frontend vs RPC bisa beda. | Pastikan logika filter konsisten antara mode sheet dan mode Supabase. Tambah indikator "Filter aktif" di header biar jelas. | Menghindari kebingungan saat switch mode. |

## 4. Rekomendasi Berdasarkan Database Yang Ada

**Bisa langsung pakai data existing:**
- Gross Margin per Produk, ABC Analysis, Return Rate, Repeat Purchase - semua bisa dihitung dari `transaksi` + `produk` yang sudah ada
- AR Aging sederhana by faktur - bisa pakai `Nomor #` + `Tanggal` + nilai
- Data Quality metrics - bisa dihitung dari data yang sudah di-load

**Butuh perubahan skema (opsional tapi ideal):**
- Customer ID (untuk basket tracking akurat)
- Status pembayaran / tanggal jatuh tempo (untuk AR aging real)
- Link retur ke faktur asli (untuk matching lebih akurat)

**Rekomendasi prioritas implementasi:**
1. **P0:** 3.1 (klasifikasi) + 3.2 (HPP validation) + 3.3 (retur COGS)
2. **P1:** 1.1 (Data Quality badge), 2.2 (Margin per produk), 2.3 (Return Rate), 1.2 (disclaimer piutang)
3. **P2:** 2.1 (AR Aging), 2.4 (ABC), 2.5 (Repeat Purchase), 3.5 (UX grouping)

## Kesimpulan

Dengan database yang sama, yang paling worth di-improve justru **validasi & transparansi data**, bukan nambah chart yang rumit. User butuh yakin angkanya bener dulu. Fokus ke (1) cegah mis-klasifikasi, (2) expose masalah HPP/retur, (3) tambahin metrik yang bisa dihitung dari data existing (margin per produk, return rate). Itu bisa kasih value terbesar dengan risiko paling kecil.