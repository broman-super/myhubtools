# R3 — Sinkron Stok Penjualan + Laporan · QA

## Hasil verifikasi (headless CDP)

| Cek | Hasil | Bukti |
| --- | --- | --- |
| `stokSisa` seed | ✅ | prd-1=11 (20−9), prd-3=68 (100−2−30), prd-4=38 (50−12), prd-999=null |
| Label opsi produk | ✅ | "Kaos Balap (sisa 11)" |
| Oversold DITOLAK (qty 12, sisa 11) | ✅ | `terjual prd-1` tetap 9 — tidak tersimpan, tidak reload |
| Jual valid masuk | ✅ | qty 5 → terjual 14, sisa 6 |
| Seksi 03 Laporan render | ✅ | `has03:true` + Rekap Produk & Qty, Rekap Item Persiapan, Rekap Penggunaan Uang |
| Overflow mobile semua route | ✅ | `docOverflow`/`bodyOverflow` `-15` (uang/sppd/persiapan flag tabel nonaktif: di `.overflow-x-auto` — bukan defect) |
| Console errors / exceptions | ✅ | "(tidak ada)" |

## Regresi
- mobile_test (dashboard/roadmap/persiapan/uang/sppd/keuangan) hijau setelah edit R3.
- Guard click R2 (input/select/textarea → `change`) tidak disentuh.

## Verdict
R3 **SELESAI** — kriteria sukses terpenuhi; map R0–R3 tuntas.