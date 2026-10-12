# R2 — Cross-check Berangkat/Pulang · PM-BRIEF

## Apa
Dua gerbang audit agar "0 aset tertinggal" di akhir event:
1. **Siap berangkat** — aman berangkat bila semua produk cukup dibawa (`qtyDibawa >= qtyTerjual + qtyRusakHilang`) DAN semua item persiapan berstatus `selesai`.
2. **Pulang tuntas** — aman pulang bila tidak ada kelebihan jual/kehilangan (anomali `terjual + rusak − dibawa <= 0`) DAN semua item persiapan sudah ditandai `pulang` (dibawa pulang).

## Kenapa
R1 menambah item persiapan tapi belum ada pemeriksaan "semua kembali". Pengguna butuh satu layar penjawab: *"Besok berangkat, aman?"* dan *"Rekap habis, tuntas?"* — dengan penjelasan bila belum.

## Target pengguna
PIC booth single-user (localStorage). Verifikasi via headless CDP (tanpa gambar).

## Ruang lingkup
- Kirim: kartu verdict + tabel audit Produk & Item Persiapan dalam satu seksi bernomor `04` di tab Persiapan.
- Chip roadmap `Siap berangkat` / `Pulang tuntas` menggantikan chip R1 "Persiapan siap".

## Kriteria sukses
- Anomali negatif/nol = badge "rekap tuntas"; positif = "perlu cek" (oversold).
- Verdict pulang = anomali semua produk OK && semua prep `pulang`.
- Verdict berangkat = semua produk cukup && semua prep `selesai`.
- Toggle `pulang` tersimpan lintas reload; tanpa migrasi schema.

## Diluar lingkup
Estimasi biaya persiapan → kas/laporan (digeser ke R3). Sinkronisasi produk dibawa↔terjual digeser ke R3.