# Rencana Implementasi: Form SPPD Fokus di Fase 1

## Tujuan
- Bagi panel ps-1 jadi 2 sub-tab: Data SPPD / Form Cetak (Preview)
- Fase 1 fokus ke file siap cetak (preview, edit inline, download .html, cetak A4 Landscape)
- SSOT dari store; non-destructive; jaga ps-1..ps-8, work-cols, scroll:to, psec:toggle, workNext

## Perubahan File
- js/ui.js: tambah A.downloadHtml(filename, html)
- css/styles.css: styling sub-tab + preview edit state
- js/pages.js: sppdPrintForm() + tabSppd() jadi 2 pane
- js/actions.js (opsional): sppd:tab
- js/pages2.js (opsional): tombol Lihat Form SPPD di hero

## Langkah Eksekusi
1. ui.js + styles.css (done)
2. pages.js (renderer + refactor tabSppd) - next
3. actions.js (handler sppd:tab) - next
4. pages2.js (hero button opsional)
5. verifikasi

## Default
tab 'print' (Form Cetak Preview). Fase awal read-only SSOT + export/cetak aman.

## Status
Step 1 done: downloadHtml + styles. Syntax OK. No new detect findings on edited files.

