# EVALUASI FITUR WEBTOOLS ANALYTIC
**Tanggal:** 29 Oktober 2026  
**Tujuan:** Analisis potensi kecacatan, logic error, dan rencana perbaikan dari perspektif Akuntansi  
**Target:** Webtools Analytic (`Productive/analytic/Analytic.html`)  

---

## 1. RINGKASAN TEMUAN

Berdasarkan pembacaan kode, dashboard Analytic sudah cukup komprehensif. Namun terdapat beberapa area yang perlu diperbaiki terutama pada akurasi perhitungan akuntansi (COGS/HPP, klasifikasi transaksi, piutang).

---

## 2. DAFTAR POTENSI KECACATAN & LOGIC ERROR

| No | Modul/Fungsi | Temuan | Tingkat Risiko | Dampak | Status Saat Ini | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `prosesData()` - Klasifikasi Penjualan (Line ~3515) | Fallback `if (!isRetur && !isBatal) isPenjualan = true;` akan mengklasifikasikan transaksi non-penjualan sebagai penjualan jika kolom "Tipe Transaksi" kosong/tidak terbaca | **KRITIS** | Overstated Omzet, salah hitung laba | Ada | Sangat berbahaya - perlu validasi ketat berbasis whitelist tipe transaksi yang valid |
| 2 | `prosesData()` - HPP/COGS (Line ~3533) | TODO: `grossCogs ideally salesQty*avgHPP, fallback to net cogs`. Saat ini ambil langsung dari `hppTotalBaris` per baris. Jika nilai HPP kosong/salah/tidak konsisten bisa merusak gross profit | **KRITIS** | Gross Margin salah, Laba kotor/laba bersih meleset | Ada (terdokumentasi) | Perlu validasi keberadaan HPP, hitung rata-rata HPP per produk, atau blocking jika HPP tidak ada |
| 3 | `prosesData()` - Piutang (Line ~3578-3586) | Piutang dihitung sebagai proxy `netSales * (piutangDays/totalDaysForPiutang)` dengan asumsi 7 hari terakhir. Bukan data AR aging real | **KRITIS** | Neraca/AR tidak akurat | Ada (proxy) | Butuh data jatuh tempo & status pembayaran dari sumber data untuk perhitungan akurat |
| 4 | `prosesData()` - Basket Tracking (Line ~3527-3531) | Menggunakan nama pelanggan (`pel`) sebagai key. Pelanggan berbeda bisa punya nama sama → digabungkan salah. | **TINGGI** | AOV/UPT/Frekuensi salah, analisis pelanggan bias | Ada | Perlu ID pelanggan unik dari sumber data |
| 5 | `prosesData()` - Retur Handling (Line ~3505-3511) | Saat retur, `dSkrg.cogs -= Math.abs(hppTotalBaris)`. Jika retur qty > qty jual, atau HPP retur beda dengan HPP jual bisa bikin COGS negatif/tidak balance | **TINGGI** | COGS tidak konsisten, laba bisa negatif artifisial | Ada | Perlu matching retur ke faktur jual (FIFO/Match by Nota), validasi qty retur <= qty jual |
| 6 | `prosesData()` - Reseller Detection (Line ~3445-3447, ~3475) | Logika kompleks berbasis kategori/keyword. Rentan salah klasifikasi saat ada kategori baru | **SEDANG** | Segmentasi reseller vs marketplace salah, perhitungan reseller vs non-reseller bias | Ada | Perlu mapping kategori yang eksplisit/terpusat, bukan inferensi dari keyword |
| 7 | `prosesData()` - First Purchase Logic (Line ~3540-3549) | Bergantung `firstPurchaseData` yang mungkin tidak lengkap untuk data historis. Menentukan pelanggan baru vs lama bisa bias | **SEDANG** | Omzet Baru/Lama salah, analisis retensi bias | Ada | Perlu validasi kelengkapan historical data, atau default handling yang jelas |
| 8 | `prosesData()` - Tanggal Parsing (Berbagai lokasi) | Beragam cara parsing tanggal (split, moment, Date constructor). Potensi issue timezone/off-by-one | **SEDANG** | Filter rentang tanggal bisa meleset 1 hari | Ada | Standardisasi parsing ke local date tanpa timezone shift |
| 9 | `rawDataBiaya` Processing (Line ~3615-3627) | Fetch biaya terpisah dari Supabase dengan logika sendiri. Perlu pastikan konsistensi dengan periode filter | **SEDANG** | KPI Biaya/OPEX Ratio bisa mismatch dengan dashboard penjualan | Ada | Cross-check total biaya vs periode yang sama, pastikan deduplication |
| 10 | `terapkanRekapSupabase()` - Mode Supabase | Di mode Supabase, `rawDataTransaksi` kosong dan menggunakan data dari RPC. Perlu pastikan mapping field konsisten dengan mode sheet | **SEDANG** | Render chart/tabel bisa kosong atau salah hitung | Ada | Validasi mapping field antara RPC response vs expected structure |

---

## 3. RENCANA SOLUSI (DARI PERSPEKTIF AKUNTAN)

### FASE 1: QUICK FIX - VALIDASI KRITIS (Prioritas: SEGERA)
| No | Aksi Perbaikan | Target File/Line | Detail Teknis | Estimasi | Verifikasi |
|---|---|---|---|---|---|
| 1.1 | **Hapus/Perketat fallback klasifikasi penjualan** | `Analytic.html` ~3515 | Ganti `if (!isRetur && !isBatal) isPenjualan = true;` menjadi whitelist ketat. Hanya terima tipe transaksi yang eksplisit mengandung kata kunci penjualan valid. Log transaksi yang ditolak ke console untuk audit. | 1-2 jam | Test dengan data yang ada - pastikan tidak ada penjualan valid yang terlewat, transaksi aneh tidak terhitung |
| 1.2 | **Validasi HPP/COGS** | `Analytic.html` ~3500-3535 | Jika baris penjualan tidak memiliki HPP valid (>0) dan bukan retur, flag warning atau gunakan metode alternatif. Tambahkan counter transaksi tanpa HPP. Tampilkan alert di UI jika % transaksi tanpa HPP > threshold. | 2-3 jam | Bandingkan gross profit dengan perhitungan manual, pastikan tidak ada COGS negatif |
| 1.3 | **Perbaiki handling retur** | `Analytic.html` ~3505-3511 | Pastikan retur tidak membuat COGS negatif. Pertimbangkan untuk tidak mengurangi COGS lebih dari COGS penjualan terkait, atau tracking by nota. Tambahkan validasi. | 1-2 jam | Test skenario retur parsial/full, pastikan balance tetap wajar |

### FASE 2: IMPROVEMENT - AKURASI PERHITUNGAN (Prioritas: TINGGI)
| No | Aksi Perbaikan | Target File/Line | Detail Teknis | Estimasi | Verifikasi |
|---|---|---|---|---|---|
| 2.1 | **Perbaiki basket tracking** | `Analytic.html` ~3527-3531 | Jika ada ID pelanggan unik, gunakan itu. Jika tidak ada, buat composite key yang lebih robust (nama+alamat/telepon) atau minimal tambahkan warning. | 2-3 jam | Cek duplikasi pelanggan, validasi AOV/UPT |
| 2.2 | **Konsistensi perhitungan biaya** | `Analytic.html` ~1941, ~2037, ~3615-3627 | Pastikan OPEX Ratio menggunakan definisi yang sama konsisten. Validasi total biaya vs kategori breakdown. Tambahkan cross-check. | 2-3 jam | Bandingkan KPI di tab Dashboard vs tab Biaya |
| 2.3 | **Perbaiki piutang** | `Analytic.html` ~3578-3586 | Tambahkan flag "Piutang adalah estimasi/proxy" lebih jelas. Jika ada kolom status pembayaran di data, gunakan yang real. | 1-2 jam | Evaluasi akurasi dengan data aktual marketplace |

### FASE 3: ENHANCEMENT - FITUR BARU (Prioritas: MENENGAH)
| No | Aksi Perbaikan | Target File/Line | Detail Teknis | Estimasi | Verifikasi |
|---|---|---|---|---|---|
| 3.1 | **Tambah validasi data quality** | `Analytic.html` (baru) | Tambah panel "Data Quality" yang menampilkan: transaksi tanpa tipe, tanpa HPP, retur orphan, duplikasi nota, dll. | 3-4 jam | Panel muncul dan menunjukkan isu real |
| 3.2 | **Perbaiki first purchase logic** | `Analytic.html` ~3540-3549 | Pastikan `firstPurchaseData` terisi lengkap. Tambahkan fallback jika data tidak lengkap. | 1-2 jam | Validasi split pelanggan baru vs lama |
| 3.3 | **Standardisasi tanggal** | `Analytic.html` berbagai lokasi | Buat helper function terpusat untuk parse tanggal lokal, gunakan konsisten di semua tempat | 2-3 jam | Test filter rentang, tidak ada off-by-one |

---

## 4. KOLOM EVALUASI UNTUK SENIOR ENGINEER

### A. EVALUASI KECACATAN
| No | Kecacatan Ditemukan | File & Line | Reproduksi (Steps) | Severity (Critical/High/Med/Low) | Bisa Reproduksi? (Ya/Tidak/Perlu Data) | Root Cause Analisis | Rencana Fix | Risiko Fix | Test Case | Hasil Verifikasi (Diisi SE) | Status (Open/In Progress/Fixed/Rejected) | Catatan SE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-01 | | | | | | | | | | | | |
| E-02 | | | | | | | | | | | | |
| E-03 | | | | | | | | | | | | |
| E-04 | | | | | | | | | | | | |
| E-05 | | | | | | | | | | | | |

### B. EVALUASI LOGIC
| No | Logic Issue | File & Line | Kondisi Saat Ini | Kondisi Seharusnya | Impact ke Laporan Keuangan | Benar Secara Akuntansi? (Ya/Tidak/Perlu Review) | Justifikasi Akuntansi | Fix yang Disarankan | Apakah Perlu Change Data Structure? (Ya/Tidak) | Hasil Review (Diisi SE) | Status (Open/In Progress/Fixed/Rejected) | Catatan SE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L-01 | | | | | | | | | | | | |
| L-02 | | | | | | | | | | | | |
| L-03 | | | | | | | | | | | | |
| L-04 | | | | | | | | | | | | |
| L-05 | | | | | | | | | | | | |

### C. EVALUASI FITUR BARU
| No | Usulan Fitur | Sumber Data Tersedia? (Ya/Tidak/Parsial) | Kebutuhan Kolom Tambahan? (Ya/Tidak - Sebutkan) | Nilai untuk Akuntansi (High/Med/Low) | Kompleksitas Implementasi (High/Med/Low) | Priority (P0/P1/P2) | UI Impact | Risiko | Estimasi Jam | Layak Dikerjakan? (Ya/Tidak) | Alasan (Diisi SE) | Catatan SE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-01 | AR Aging (0-30, 31-60, >60) | | | | | | | | | | | |
| F-02 | Gross Margin per Produk/SKU | | | | | | | | | | | |
| F-03 | Break-Even Point (BEP) | | | | | | | | | | | |
| F-04 | ABC Analysis Produk (Pareto) | | | | | | | | | | | |
| F-05 | Customer Lifetime Value (CLV) | | | | | | | | | | | |
| F-06 | Return Rate per Channel | | | | | | | | | | | |
| F-07 | Data Quality Dashboard | | | | | | | | | | | |
| F-08 | Budget vs Actual per Kategori Biaya | | | | | | | | | | | |

### D. CHECKLIST VERIFIKASI SEBELUM DEPLOY
| No | Item Check | Metode Verifikasi | Expected Result | Hasil (Pass/Fail/NA) | Diuji Oleh | Tanggal | Catatan |
|---|---|---|---|---|---|---|---|
| V-01 | Klasifikasi transaksi tidak over-count penjualan | Cek log transaksi dengan tipe tidak jelas | Hanya transaksi valid yang terhitung sebagai penjualan | | | | |
| V-02 | COGS tidak negatif | Hitung COGS vs Sales di periode test | COGS >= 0 dan masuk akal vs margin | | | | |
| V-03 | Retur seimbang | Bandingkan retur qty/rp dengan faktur asli | Retur tidak melebihi penjualan terkait | | | | |
| V-04 | Konsistensi Dashboard vs Biaya Tab | Bandingkan Net Sales, Total Biaya, Laba Bersih | Angka sama persis di kedua tab | | | | |
| V-05 | Filter tanggal akurat | Test boundary date (awal/akhir bulan) | Tidak ada transaksi off-by-one | | | | |
| V-06 | Perbandingan periode benar | Bandingkan mode monthly vs rolling | Perhitungan periode lalu sesuai logika | | | | |

---

## 5. CATATAN AKUNTANSI PENTING

- **Omzet Bersih** = Penjualan - Retur (sudah diterapkan)
- **Laba Kotor** = Omzet Bersih - HPP/COGS
- **Laba Bersih** = Laba Kotor - Biaya Operasional (OPEX)
- **Piutang** saat ini adalah PROXY, bukan saldo piutang riil. Jangan digunakan untuk pelaporan keuangan final tanpa verifikasi
- **AOV/UPT** bergantung akurasi basket tracking - perlu hati-hati interpretasinya
- **Gross Margin** sangat bergantung akurasi nilai HPP per baris transaksi

---

**Disiapkan oleh:** AI Assistant (Analisis Perspektif Akuntansi)  
**Untuk di-review oleh:** Senior Engineer  
**Status:** MENUNGGU REVIEW & EVALUASI SENIOR ENGINEER
