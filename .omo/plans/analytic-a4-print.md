# analytic-a4-print

intent: clear
review_required: false
classification: standard
slug: analytic-a4-print

## TL;DR
Tambah fitur cetak A4 ke `Productive/analytic/Analytic.html`. **Batch A (portrait) SUDAH diimplementasikan & diuji user** (dengan perbaikan iteratif: DataTable `page.len(-1)`, border kartu `#94a3b8`, sembunyikan `#biayaContainer` bila kosong, chart `resize()` saat print). **Batch B (upgrade ke Landscape + typography ramping + divider section) SIAP & tercatat di bawah — menunggu eksekusi via `/start-work`** (plan-mode guard memblokir edit langsung ke HTML). Hasil akhir: Dashboard + Biaya satu dokumen, A4 landscape, full color, font ramping, divider "DASHBOARD"/"BIAYA", semua tabel lengkap, tanpa header branding. Tidak ubah logika data.

## Context
Dashboard Analytic (`Productive/analytic/Analytic.html`) saat ini TIDAK punya fitur cetak/export. User ingin mencetak laporan A4 berisi Dashboard + Biaya secara berurutan, full color, semua tabel lengkap, tanpa header/branding. Ini fitur murni presentasi — TIDAK mengubah logika data/perhitungan apa pun.

## Decisions (locked by user)
- Cakupan: GABUNGAN — Dashboard + Biaya dalam satu dokumen berurutan.
- Warna: FULL COLOR — series chart tetap berwarna di atas latar putih.
- Kedalaman: LENGKAP — semua tabel (Produk, Reseller, Marketplace, Kategori, Harian, Basket, + tabel Biaya).
- Header: TANPA blok header/branding di tiap halaman (juga tanpa nomor halaman).

## Defaults adopted (reversible internal)
- Trigger: tombol "Cetak" di toolbar + Ctrl/Cmd+P (native).
- Print SELALU paksa tema light (CSS vars -> latar putih, teks gelap) lalu kembalikan ke tema layar setelah print.
- Layout: satu kolom penuh; urutan = urutan DOM (`#mainContainer` lalu `#biayaContainer`); `break-inside: avoid` per kartu/tabel.
- Chart di-re-theme ke label/grid gelap di atas latar putih saat print, dikembalikan sesudah (series warna tetap).
- DataTable (`#dtProduk`, `#biayaTable`): saat print tampilkan semua baris (`page('all')`) & sembunyikan kontrol.

## Evidence (file: Productive/analytic/Analytic.html)
- Tema: `<html data-theme="light">` (`:2`); `:root` vars `--bg/--card/--text/--border` (`:24`); `[data-theme="dark"]` (`:41`); `Chart.defaults.color` (`:3333`).
- Grid: `.bento-container { display:grid; grid-template-columns: repeat(12,1fr) }` (`:151`); kartu `.bento-item.col-span-N` (`:1127+`).
- Chart registry: `let charts = {}` (`:1755`); biaya `_biayaChartTren`/`_biayaChartKomposisi` (`:5060,5090`); Chart.js v3/v4 -> `Chart.instances` tersedia.
- DataTable: `#dtProduk` (`:1291,1953`), `#biayaTable` (`:5154`).
- DOM order: `#mainContainer` (`:1125`) lalu `#biayaContainer` (`:1405`).
- Hide targets: `#tabMain`(`:1069`), `#tabBiaya`(`:1070`), `#reportrange`(`:1112`), `#dropzone`(`:923`), `#biayaDropzone`(`:1380`), `#expenseModal`(`:818`), `#loginOverlay`(`:755`), `#processingOverlay`(`:784`).
- Tidak ada `@media print` existing (grep kosong).

## Approach / Implementation (1 file: Analytic.html)

### 1. CSS — blok `@media print` (tambah di akhir `<style>`)
```css
@media print {
  @page { size: A4; margin: 15mm; }
  html, body { background: #ffffff !important; }
  #mainContainer, #biayaContainer { display: block !important; }   /* paksa 2 tab tampil */
  .bento-container { display: block !important; }
  .bento-item { grid-column: auto !important; width: 100% !important; margin-bottom: 12px !important; break-inside: avoid; }
  .chart-box { break-inside: avoid; }
  .chart-box canvas { width: 100% !important; height: auto !important; }
  #tabMain, #tabBiaya, #reportrange, #dropzone, #biayaDropzone,
  #expenseModal, #loginOverlay, #processingOverlay, .no-print { display: none !important; }
  table { width: 100% !important; border-collapse: collapse !important; font-size: 10px; }
  th, td { border: 1px solid #cbd5e1 !important; padding: 3px 6px !important; }
  thead { display: table-header-group; }            /* header tabel berulang tiap halaman */
  .dataTables_length, .dataTables_filter, .dataTables_paginate, .dataTables_info { display: none !important; }
}
```

### 2. JS — listener `beforeprint`/`afterprint` (tambah di `<script>`, dekat theme toggle ~`:3720`)
```js
function applyPrintTheme(){
  const prev = document.documentElement.getAttribute('data-theme') || 'light';
  sessionStorage.setItem('printPrevTheme', prev);
  if (prev === 'dark') document.documentElement.setAttribute('data-theme','light');
  Chart.defaults.color = '#334155';
  Object.values(Chart.instances).forEach(c => {
    ['x','y'].forEach(ax => {
      const s = c.options.scales && c.options.scales[ax];
      if (s) {
        s.ticks = Object.assign({}, s.ticks, { color:'#334155' });
        if (s.grid) s.grid.color = '#e2e8f0';
      }
    });
    if (c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels)
      c.options.plugins.legend.labels.color = '#334155';
    c.update('none');
  });
  try { $('#dtProduk').DataTable().page('all').draw(false); } catch(e){}
  try { $('#biayaTable').DataTable().page('all').draw(false); } catch(e){}
}
function restoreScreenTheme(){
  const prev = sessionStorage.getItem('printPrevTheme') || 'light';
  document.documentElement.setAttribute('data-theme', prev);
  Chart.defaults.color = prev === 'dark' ? '#94a3b8' : '#64748b';
  Object.values(Chart.instances).forEach(c => c.update('none'));
  try { $('#dtProduk').DataTable().page(0).draw(false); } catch(e){}
  try { $('#biayaTable').DataTable().page(0).draw(false); } catch(e){}
}
window.addEventListener('beforeprint', applyPrintTheme);
window.addEventListener('afterprint', restoreScreenTheme);
```
Catatan: `Chart.instances` ada di Chart.js v3/v4 (sudah dipakai). Bila versi <3, ganti dengan iterasi `charts` + `_biayaChartTren` + `_biayaChartKomposisi`.

### 3. Tombol Cetak (tambah di toolbar ~`:1112`, class `no-print`)
```html
<button class="no-print" onclick="window.print()">Cetak</button>
```
Tombol ini memanggil print dan disembunyikan saat print via `.no-print`.

## Components ledger (topology)
- C1 Print stylesheet `@media print` (margin A4, single column, hide UI, table border, break-inside avoid, thead repeat, DataTable hide controls).
- C2 Tab unification (paksa `#mainContainer`+`#biayaContainer` visible di print).
- C3 Theme flip ke light saat print + restore via `sessionStorage`.
- C4 Chart re-theme (label/grid gelap, series tetap) + restore via `Chart.instances`.
- C5 DataTable full-row + hide controls saat print.
- C6 Print trigger (tombol Cetak + native Ctrl/Cmd+P).
- C7 Table header repeat (`thead { display: table-header-group }`) + readability.

## Verification
- Buka `Analytic.html` di browser (mode light DAN dark).
- Ctrl/Cmd+P -> pratinjau: kedua tab muncul, satu kolom, chart berwarna di latar putih, semua tabel (Produk + Biaya) tampil lengkap, tanpa header/branding.
- Export ke PDF -> multi-halaman rapi; baris tabel tidak kepotong; header tabel berulang tiap halaman.
- Tutup pratinjau -> tema, chart, & paging DataTable kembali seperti sebelum print.
- `node --check` pada potongan JS (handler valid).

## TODOs
- [ ] 1. [Batch A-1] Analytic.html `<style>`: tambah blok `@media print` — `@page { size:A4; margin:15mm }`, paksa `#mainContainer`+`#biayaContainer` `display:block !important`, `.bento-container` jadi block & `.bento-item` full-width `break-inside:avoid`, sembunyikan `#tabMain,#tabBiaya,#reportrange,#dropzone,#biayaDropzone,#expenseModal,#loginOverlay,#processingOverlay,.no-print`, tabel `border-collapse`+border `#cbd5e1`+`thead{display:table-header-group}`, sembunyikan kontrol DataTable (`.dataTables_length/.dataTables_filter/.dataTables_paginate/.dataTables_info`) — refs `:151,:1125,:1405,:1069,:1070,:1112,:923,:1380,:818,:755,:784`
- [ ] 2. [Batch A-2] Analytic.html `<script>`: tambah `applyPrintTheme()` (simpan tema ke `sessionStorage`, flip ke light bila dark, `Chart.defaults.color='#334155'`, iterasi `Chart.instances` set ticks/grid `#e2e8f0`/legend label `#334155` + `update('none')`, `#dtProduk` & `#biayaTable` `page('all').draw(false)`) dan `restoreScreenTheme()` (kembalikan tema + re-theme + paging `page(0)`), pasang `addEventListener('beforeprint'/'afterprint')` — refs `:1755,:3333,:3282-3380,:5060-5097,:1950-1953,:5154,:3720-3731`
- [ ] 3. [Batch A-3] Analytic.html toolbar (~`:1112`): tambah `<button class="no-print" onclick="window.print()">Cetak</button>`
- [ ] 4. [Batch A-4] Verifikasi manual (portrait): SUDAH diimplementasikan & diuji user — 2 tab muncul, full color, semua tabel, tanpa header; perbaikan iteratif diterapkan (DataTable `page.len(-1)`, border kartu `#94a3b8`, sembunyikan `#biayaContainer` bila kosong, chart `resize()` saat print).

### Batch B — Upgrade ke Landscape (PENDING execution: jalankan /start-work)
- [x] 1. [Batch B-1] Analytic.html `<style>` `@media print`: `@page` → `A4 landscape; margin:10mm`; `body{font-size:10px}`; `#mainContainer::before`/`#biayaContainer::before` label "Dashboard"/"Biaya" `border-bottom:2px solid #94a3b8` uppercase; grid gap `12px`; `.bento-item` padding `8px 10px`; typography ramping (`.bento-value`16px, `.bento-title`10px, `.bento-sub`9px, `.badge`8px, `.help-icon`{display:none}); `.chart-box` height `185px` + border `#94a3b8`; `table`/`th,td` font `8px`. **DITERAPKAN (user jalankan)**.
- [ ] 2. [Batch B-2] Verifikasi landscape: Ctrl+P → pratinjau A4 landscape, 2 kolom lebar (~125mm/chart), font ramping, divider "DASHBOARD"/"BIAYA" jelas, chart full color di putih, tabel utuh; tutup → tema/chart/paging normal. (Belum diuji browser oleh agent — sandbox tanpa browser; user uji manual.)
## Final Verification Wave
- [ ] F1. Print preview (Ctrl+P) mode light: konfirmasi layout satu kolom, kedua tab, chart berwarna di putih, semua tabel, tanpa header/branding.
- [ ] F2. Print preview mode dark: konfirmasi otomatis flip ke light (putih), chart terbaca (label gelap, series warna), setelah tutup pratinjau tema & chart kembali dark.
- [ ] F3. DataTable `#dtProduk` & `#biayaTable`: semua baris tampil (`page('all')`), kontrol tersembunyi; setelah print paging kembali normal.
- [ ] F4. Multi-halaman: tidak ada baris tabel kepotong di tengah & `thead` berulang tiap halaman.
