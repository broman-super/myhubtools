# Saran Improve Analytic (Realistis - Sesuai Data Yang Ada)

Berdasarkan kolom yang tersedia: `transaksi` (Tanggal, Nomor #, Tipe Transaksi, Nama Pelanggan, Nama Kategori Pelanggan, Nama Barang, Kuantitas, Total Harga, Penjualan, dedupe_key), `produk` (HPP, Kode Series), `biaya`, `settings`. Tidak ada kolom Customer ID, status pembayaran, tanggal jatuh tempo, atau link retur eksplisit.

## 1. Quick Wins (Langsung Bisa Diterapkan)

| No | Saran | Alasan | Implementasi | Estimasi |
|---|---|---|---|---|
| 1.1 | **Data Quality Badge** | Bisa langsung hitung dari data yang ada - transaksi tanpa HPP (produk tidak ketemu atau HPP 0), tipe tidak terklasifikasi, retur tanpa konteks. | Tambah badge di header navbar: "X issue". Klik buka modal ringkas berisi list issue + count. | 1-2 jam |
| 1.2 | **Disclaimer Piutang** | Penting biar tidak disalahartikan sebagai AR riil. | Tambah tooltip "Piutang = estimasi berdasarkan pola periode (bukan saldo piutang aktual)" di kartu Piutang. Tambah juga di print view. | 15-30 menit |
| 1.3 | **Gross Margin per Produk** | Sudah bisa dihitung dari `produkDetail` (sales, cogs, qty). Sangat berguna. | Tambah kolom "Margin (Rp)" dan "Margin %" di tabel Top Produk. Bisa di-sort by margin %. | 1-2 jam |
| 1.4 | **Return Rate per Kategori** | Hitung dari retur vs penjualan per kategori yang sudah ada. | Tambah tabel/kartu "Return Rate per Kategori" (Retur Rp / Penjualan Rp * 100). Highlight kategori dengan return rate tinggi. | 1-2 jam |
| 1.5 | **Export CSV per tabel kunci** | Mempercepat analisis diluar dashboard. | Tambah tombol export CSV di header tabel Top Produk, Top Pelanggan/Kontributor, Biaya per Kategori. | 1 jam |

## 2. Fitur Baru (Bisa Dengan Kolom Yang Ada)

| No | Fitur | Value | Cara Implementasi (pakai data existing) | Estimasi |
|---|---|---|---|---|
| 2.1 | **AR Aging Sederhana (by Faktur)** | Tinggi | Agregasi per `Nomor #` (faktur). Ambil tanggal faktur (min/max tanggal per nomor faktur), jumlah nilai penjualan bersih per faktur. Hitung umur = (tanggal referensi - tanggal faktur). Bucket: 0-7, 8-14, 15-30, 31-60, >60 hari. **Bukan** berdasarkan status bayar (karena tidak ada), tapi umur faktur. Label harus jelas "Umur Faktur (belum ada status pembayaran)". | 3-4 jam |
| 2.2 | **ABC Analysis (Pareto)** | Tinggi | Pakai `produkDetail` - urutkan produk by omzet bersih (sales-retur) desc, hitung kontribusi kumulatif %, klasifikasi A/B/C (mis. 80/15/5). Tambah badge A/B/C di tabel Top Produk. | 2 jam |
| 2.3 | **Repeat Purchase** | Sedang-Tinggi | Pakai `freqPelanggan` (sudah ada). Hitung: % pelanggan dengan `freq >= 2` / total pelanggan aktif periode. Tambah di panel Kontributor/RFM. | 1-2 jam |
| 2.4 | **Top Produk dengan Margin Negatif** | Praktis | Filter produk dengan `cogs > sales` (atau margin < 0) - bisa karena HPP salah/0 atau retur. Langsung terlihat masalah. | 30-60 menit |
| 2.5 | **Biaya/Hari & Proyeksi** | Pelengkap | `totalBiaya / jumlahHari` dan proyeksi berdasarkan run-rate. Sudah ada range tanggal, bisa hitung. | 1 jam |

## 3. Perbaikan Logika/Penempatan (Kritis)

| No | Masalah | Saran | Prioritas |
|---|---|---|---|
| 3.1 | **Klasifikasi penjualan terlalu permisif** | Ganti fallback "default jadi penjualan" jadi whitelist ketat. Tipe yang tidak match whitelist masuk "Tidak Terklasifikasi" (counter) dan **tidak** dihitung. Terapkan di mode sheet dan pertimbangkan di RPC. | **P0** |
| 3.2 | **HPP 0 diam-diam merusak margin** | Validasi: penjualan dengan produk ditemukan tapi HPP 0/tidak valid → flag "HPP Hilang". Tampilkan di Data Quality. Jangan biarkan gross margin terlihat normal tanpa warning. | **P0** |
| 3.3 | **Retur bisa bikin COGS negatif** | `dSkrg.cogs = Math.max(0, dSkrg.cogs - Math.abs(hppTotalBaris))`. Cukup simpel, mencegah anomali. | **P0** |
| 3.4 | **Basket by nama pelanggan** | Tambah disclaimer "Berdasarkan Nama Pelanggan (bisa duplikasi)". Ini realistis karena tidak ada Customer ID. | P1 |
| 3.5 | **Gabung panel pelanggan** | Gabung "Basket Intel", "RFM", "Top Pelanggan" jadi satu panel dengan tab biar lebih ringkas. | P2 (UX) |

## Rekomendasi Prioritas

**Fokus utama:** validasi data + transparansi. Karena kita tidak bisa tambah kolom ke database/export, yang paling aman dan berguna adalah:

1. **P0:** Perketat klasifikasi (3.1), validasi HPP (3.2), cegah COGS negatif (3.3) + Data Quality badge (1.1)
2. **P1:** Gross Margin per produk (1.3), Return Rate per kategori (1.4), AR Aging by Faktur dengan label jelas (2.1), Top produk margin negatif (2.4)
3. **P2:** ABC Analysis (2.2), Repeat Purchase (2.3), UX grouping (3.5)

**Catatan:** Untuk "AR Aging", karena tidak ada status pembayaran, lebih tepat dinamakan **"Umur Faktur"** bukan "AR Aging". Ini jujur tentang keterbatasan data dan tetap berguna untuk monitoring umur tagihan.