# R3 — Sinkron Stok Penjualan + Laporan · UIUX-DESIGN

**Penempatan:** tab Uang & Laporan → seksi baru **`03 Laporan`** (setelah 02 Pengeluaran & Penyesuaian).

## Seksi 03 Laporan (3 kartu bertumpuk)
1. **Rekap Produk & Qty** — tabel Produk | Dibawa | Terjual | Rusak | Kembali | Rekap (badge `tuntas`/`cek +n`, warna sama badge R2) + baris total ekstra-bold.
2. **Rekap Item Persiapan** — tabel Item | Kategori | Qty | Biaya (est.) | Status | Pulang + total estimasi; keterangan tegas: biaya **estimasi informatif — tidak mengurangi saldo kas**.
3. **Rekap Penggunaan Uang** — persamaan kas (dana awal, penjualan, transport, pengeluaran, penyesuaian, saldo) + tombol Cetak Laporan.

## Form penjualan
- Opsi produk menampilkan `(sisa N)` di label (`Kaos Balap (sisa 11)`).
- Teks bantuan kartu: "Qty dibatasi sisa stok (dibawa − terjual − rusak/hilang)".
- Penolakan: toast error "Stok tidak cukup — sisa N."

## Konsistensi
Table, badge, kartu, `psec` bernomor, warna token: mengikuti pola yang sama persis dengan R1/R2 (tidak ada kelas CSS baru). Overflow mobile: semuanya dalam `.overflow-x-auto`.