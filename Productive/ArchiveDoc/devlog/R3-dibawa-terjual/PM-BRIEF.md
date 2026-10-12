# R3 — Sinkron Stok Penjualan + Laporan Lengkap · PM-BRIEF

## Apa (sesuai pilihan user, 2 dari 4 opsi)
1. **Validasi stok saat input penjualan**: qty transaksi dibatasi `sisa stok = dibawa − terjual − rusak/hilang`; input melebihi sisa ditolak dengan pesan jelas.
2. **Laporan lengkap**: satu layar rekap produk & qty, item persiapan, dan penggunaan uang.

## Kenapa
Tanpa batas stok, user bisa mencatat "terjual 30 padahal bawa 20" → laporan akhir kacau dan R2 memunculkan oversold. Laporan terpisah di 2 tempat (rekap penjualan / penggunaan uang) membuat rekap produk utuh tidak terlihat di satu tempat.

## Keluar dari lingkup (dipilih user: NOT)
- Biaya persiapan → potong saldo kas (tetap estimasi informatif).
- Saldo kas lanjutan lintas event.

## Kriteria sukses
- `sisa stok` benar: prd-1=11, prd-3=68, prd-4=38; produk tanpa checklist = tak dibatasi.
- Oversold ditolak & tidak tersimpan; jual valid tersimpan.
- Seksi `03 Laporan` hadir dengan 3 kartu; tanpa migrasi schema; regresi overflow/console hijau.