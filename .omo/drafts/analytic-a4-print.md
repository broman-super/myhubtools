# analytic-a4-print - Draft
intent: clear
review_required: false
classification: standard
slug: analytic-a4-print
status: awaiting-approval
plan_path: .omo/plans/analytic-a4-print.md

## Decisions (locked by user)
- Cakupan: GABUNGAN — Dashboard + Biaya dalam satu dokumen berurutan.
- Warna: FULL COLOR — series chart tetap berwarna di atas latar putih.
- Kedalaman: LENGKAP — semua tabel (Produk, Reseller, Marketplace, Kategori, Harian, Basket, + tabel Biaya).
- Header: TANPA blok header/branding di tiap halaman (juga tanpa nomor halaman).

## Defaults adopted (reversible internal — not asked, safe to default)
- Trigger: tombol "Cetak" di toolbar + Ctrl/Cmd+P (native).
- Print SELALU paksa tema light (CSS vars -> latar putih, teks gelap) lalu kembalikan ke tema layar setelah print.
- Layout: satu kolom penuh; urutan = urutan DOM (#mainContainer lalu #biayaContainer); `break-inside: avoid` per kartu/tabel agar tidak kepotong.
- Chart di-re-theme ke label/grid gelap di atas latar putih saat print, dikembalikan sesudah (series warna tetap).
- DataTable (#dtProduk, #biayaTable): saat print tampilkan semua baris (`page('all')`) & sembunyikan kontrol (length/filter/paginate/info).

## Components ledger (topology — each can fail independently)
- C1 Print stylesheet `@media print` (margin A4 15mm, single column, hide UI, table border, break-inside avoid).
- C2 Tab unification (paksa `#mainContainer` + `#biayaContainer` visible di print via `!important`).
- C3 Theme flip ke light saat print + restore via `sessionStorage`.
- C4 Chart re-theme (label/grid gelap, series tetap) + restore, lewat `Chart.instances`.
- C5 DataTable full-row + hide controls saat print.
- C6 Print trigger (tombol Cetak + native Ctrl/Cmd+P).
- C7 Table header repeat (`thead { display: table-header-group }`) + readability (border, font-size).

## Approach
Tambahkan satu blok `@media print` di dalam `<style>` Analytic.html, listener `beforeprint`/`afterprint` (flip tema + re-theme chart + expand DataTable), dan satu tombol "Cetak" di toolbar. Tidak mengubah logika data/perhitungan dashboard sama sekali — murni presentasi saat cetak.

## Evidence
- Tema: `Analytic.html:2` (`data-theme="light"`), `:41` dark block, vars `--bg/--card/--text/--border`.
- Grid: `.bento-container { display:grid; grid-template-columns: repeat(12,1fr) }` (`Analytic.html:151`), kartu `.bento-item.col-span-N` (`:1127+`).
- Chart registry: `let charts = {}` (`:1755`); biaya: `_biayaChartTren`/`_biayaChartKomposisi` (`:5060,5090`); `Chart.defaults.color` (`:3333`).
- DataTable: `#dtProduk` (`:1291,1953`), `#biayaTable` (`:5154`).
- DOM order: `#mainContainer` (`:1125`) lalu `#biayaContainer` (`:1405`).
- Hide targets: `#tabMain`(`:1069`), `#tabBiaya`(`:1070`), `#reportrange`(`:1112`), `#dropzone`(`:923`), `#biayaDropzone`(`:1380`), `#expenseModal`(`:818`), `#loginOverlay`(`:755`), `#processingOverlay`(`:784`).
- No existing `@media print` (grep kosong).

## Next action
Setelah approval user: buat `.omo/plans/analytic-a4-print.md` (rerun scaffold tanpa --draft-only), jalankan Metis gap-analysis, APPEND todo batches ke `## Todos`, isi `## TL;DR` terakhir.
