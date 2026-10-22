# Changelog — Suite PDF Merger

Catatan perubahan, urut terbaru di atas. Satu entri per blok fitur yang selesai.

## [Blok 10 — Workflow Builder] — 2026-10-22

### Ditambahkan
- `WORKFLOW.html` — palet langkah (+ Kompres, + Watermark, + Nomor Halaman, + N-Up/Booklet, + Split akhir), rantai yang bisa **diseret (SortableJS 1.15.0 — pin sama dengan OPERASI)**, parameter per baris langkah, tombol Kosongkan Rantai, **Jalankan Workflow** sekali klik; output 1 PDF (atau ZIP kalau ada Split) otomatis ter-download.
- `assets/js/features/workflow/workflow.js` — registry `WF_TYPES` yang **memanggil fungsi fitur yang sudah ada** (`compressPdf`, `addWatermark`, `addPageNumbers`, `makeNup`, `extractPages`+`parsePageRange`); validasi Split wajib jadi langkah terakhir; progres status per langkah; `MutationObserver` untuk enable/disable tombol jalankan.
- Urutan skrip mengikuti aturan README: `repair.js` (loadTolerant) sebelum `compress.js`; `rangeParser`/`split` untuk langkah split.
- Nav suite: tautan `Workflow` di semua 11 halaman.

---

## [Blok 9 — Anotasi, Form & E-Sign] — 2026-10-22

### Ditambahkan
- `ANNOTATE.html` — viewer satu-halaman (prev/next/pilih-halaman, zoom 50–200%) dengan toolbar alat: **Arahkan, Sorot, Catatan, Gambar, Tanda Tangan, Field, Redact** + 4 warna; panel Catatan (editor per catatan, lompat antar-halaman), panel Form (field terdeteksi + field baru + flatten), pad tanda tangan (gambar sendiri atau upload, slider ukuran), Ekspor/Impor **JSON** anotasi, tombol Simpan PDF.
- `assets/js/features/annotate/viewer.js` — state anotasi `[{page,type,...}]` (koordinat ruang tampilan pt, y dari atas, sama seperti Crop), render pdf.js `rotation:0`, overlay DOM+SVG live (termasuk preview saat drag), hit-test/pindah, seleksi (Del/Hapus), orkestrasi simpan.
- `assets/js/features/annotate/annotDraw.js` — `applyHighlights` (rect translusid), `applyNotes` (ikon sticky + kotak teks, wrap manual WinAnsi, maks 8 baris — selalu terlihat di pembaca mana pun), `applyDraws` (rantai `drawLine` + simplifikasi titik; ceiling: bukan `drawSvgPath` karena orientasi Y tak bisa diverifikasi tanpa browser).
- `assets/js/features/annotate/formFiller.js` — `detectFormWidgets` (posisi widget via `page.node.Annots()` + `/Rect`, nama via `/T` atau `/Parent/T`, tipe via `/FT` + bit radio `Ff&32768`; dilengkapi opsi dari API form publik) + `applyFormFill` (isi text/checkbox/radio/dropdown, **field baru** `createTextField`/`createCheckBox` + `addToPage`, `flatten` opsional).
- `assets/js/features/annotate/eSign.js` — `applySigns` (`embedPng`/`embedJpg` sekali per gambar, cache per-save).
- `assets/js/features/annotate/redact.js` — `redactRun`: render halaman terkait via pdf.js (scale 2, rotation 0), kotak hitam di canvas, halaman jadi JPEG di **PDF baru** (`removePage`+`insertPage`) — teks target hilang total, sesuai resep dokumen.
- `utils.js` + `dataUrlToBytes` (dipakai E-Sign & Redact; penambahan murni).
- Nav suite: tautan `Anotasi` di semua 10 halaman.

### Batas yang disadari (ceiling)
- Catatan & sorotan dirender sebagai **konten halaman** (bukan objek annotasi PDF pop-up Acrobat) — selalu terlihat, tapi tanpa balon komentar asli Acrobat.
- Redact merender halaman jadi gambar: teks/lapisan interaktif (termasuk field) di halaman itu ikut hilang (ditampilkan di dialog konfirmasi).
- Posisi field form yang ada ditampilkan sebagai kotak bantu; nama field yang tidak cocok antara `/T` dan API form tetap bisa diisi lewat panel.
- Highlight = kotak area (bukan snap per-kata ke textLayer).

---

## [Blok 8 — Office ↔ PDF (LibreOffice WASM)] — 2026-10-22

### Ditambahkan
- `OFFICE.html` — deteksi arah otomatis dari ekstensi (Office→PDF; PDF→Office dengan pilihan docx/xlsx/pptx/odt/txt/html), progress via `onProgress`, badge status `crossOriginIsolated` + tombol **"Buka di tab baru"** sebagai fallback bila SW iframe ditolak browser.
- `coi-serviceworker.js` di root folder — mengaktifkan SharedArrayBuffer tanpa header server (pola demo resmi repo matbee). Scope = folder suite; **jangan dipindah ke subfolder** (risiko reload-loop, lihat KNOWN_ISSUES).
- `assets/vendor/lo/` — glue JS LibreOffice WASM terpin dari unpkg `@matbee/libreoffice-converter@2.7.2` (browser.js, browser.worker.global.js, soffice.js, soffice.worker.js, diverifikasi terhadap integrity sha256 unpkg); binary berat dari mirror CORS resmi `erseco.github.io/libreoffice-document-converter` (~240MB sekali unduh, di-cache).
- `assets/js/features/office/office.js` — `runLoConvert`: dynamic import vendor, init-once, reset promise bila init gagal (bisa retry), guard `crossOriginIsolated` dengan pesan jelas.
- `KNOWN_ISSUES.md` — risiko yang diketahui: ukuran unduhan + `max-age=600` GitHub Pages, coi-serviceworker di iframe, sinkronisasi versi glue↔mirror, batas kualitas PDF→Office (import Draw), fitur ini butuh http(s)/localhost.
- Nav suite: tautan `Office` ditambahkan ke semua 9 halaman (8 lama + OFFICE.html).

---

## [Blok 7 — Crop + N-Up/Booklet] — 2026-10-22

### Ditambahkan
- `CROP.html` — seleksi area dengan drag (pointer events, dimensi pt + mm), preset A4/A5/A6/Letter/F4/Separuh-A4 (auto-orient & clamp), dimensi hasil real-time, **preview hasil crop** per-update (anti-basi pakai sequence guard), CropBox+MediaBox semua halaman.
- `NUP.html` — mode 2-up (vertikal, pola dokumen), 4-up (2×2), Booklet (imposisi pasangan `[N-2i, 2i+1]` / `[2i+2, N-2i-1]`, auto-pad kelipatan 4), info jumlah lembar/sisi keluaran.
- `assets/js/features/page-ops/crop.js` — `applyCrop` (CropBox+MediaBox identik).
- `assets/js/features/page-ops/nup.js` — `makeNup` + `drawFit` (scale jaga aspek, margin 12pt).
- `thumbnails.js` + parameter opsional `absRot` pada `renderThumb` (crop butuh tampilan tanpa rotasi bawaan halaman; pemakaai lama tidak terpengaruh).

---

## [Blok 6 — Nomor Halaman + Watermark] — 2026-10-22

### Ditambahkan
- `STAMP.html` — dua mode: Nomor Halaman (6 posisi, format `1` / `1 / n` / `Halaman 1 dari n`, mulai-dari, ukuran pt) dan Watermark (teks warna-warni atau gambar PNG/JPG, opasitas, rotasi 0–359°, 5 posisi) — **preview live** via overlay DOM di atas render pdf.js (halaman bisa dipilih), sesuai ketentuan dokumen "wajib preview".
- `assets/js/features/page-ops/pageNumbers.js` — `addPageNumbers` + `buildNumberLabel` (label preview = label output).
- `assets/js/features/page-ops/watermark.js` — `addWatermark`; posisi dihitung sebagai target pusat box (inset 24pt) + koreksi anchor rotasi agar watermark tetap terpusat, konsisten dengan matematika preview.

---

## [Blok 5 — Konverter PDF<>Gambar] — 2026-10-22

### Ditambahkan
- `KONVERTER.html` — dua mode: PDF→Gambar (JPG/PNG, DPI 72/150/300, kualitas JPG, pilihan halaman via rangeParser, 1 halaman=langsung / banyak=ZIP) dan Gambar→PDF (multi PNG/JPG, ukuran sesuai-gambar/A4/Letter, orientasi, margin mm).
- `assets/js/features/convert/convert.js` — `pdfToImages` (pdf.js, scale dpi/72, lepas memori per halaman) + `imagesToPdf` (pdf-lib embed, fit-to-page dengan margin & orientasi).
- `utils.js` + `loadJszip()` (dipindah dari SPLIT jadi bersama; SPLIT memakai ulang).

### Diubah
- `suite.css`: selektor dropzone diduplikasi jadi `#dropzone, .dropzone` (halaman bisa punya dua dropzone).

---

## [Blok 4 — Kompres + Repair] — 2026-10-22

### Ditambahkan
- `COMPRESS.html` — 3 level kompresi (Ringan/Sedang/Tinggi), statistik sebelum/sesudah/%, tombol Perbaiki (Repair) terpisah.
- `assets/js/features/optimize/compress.js` — lapis 1 `save({useObjectStreams})`; lapis 2 re-encode JPEG (DCTDecode) via canvas dengan guard ColorSpace sederhana + skip downscale bila ada SMask. Ceiling sadar: PNG/Flate & non-RGB tidak disentuh (aman).
- `assets/js/features/optimize/repair.js` — `stripLeadingJunk` (buang sampah sebelum `%PDF`) + `loadTolerant` + `repairPdf` (rebuild halaman).
- `utils.js` + `formatSize(n)` (penambahan murni, fungsi lama tak diubah).

---

## [Blok 2+3 — Split/Extract + Operasi Halaman] — 2026-10-22

### Ditambahkan
- `SPLIT.html` — Ekstrak halaman terpilih ke-1-PDF, atau Split per bagian (multi-bagian → ZIP via jszip lazy-load).
- `assets/js/features/page-ops/rangeParser.js` — parser `"1-3, 5, 7-9"` (swap otomatis, dedup, validasi bounds) + self-check Node (`node rangeParser.js` → OK).
- `assets/js/features/page-ops/split.js` — `pageCountOf` / `extractPages` (pdf-lib, `ignoreEncryption`).
- `OPERASI.html` — grid thumbnail: drag-reorder (SortableJS), rotasi per kartu (90/180/270 akumulatif), hapus per kartu, simpan urutan+rotasi baru.
- `assets/js/features/page-ops/thumbnails.js` — `openPdfDoc` (salin buffer, anti-detach) + `renderThumb` (pdf.js, dukung rotasi tambahan).
- `assets/js/features/page-ops/pageOps.js` — `assemblePages(bytes, order, rotations)`; rotasi akumulatif atas rotasi bawaan halaman.

### Diperbaiki
- `split.js` awalnya memakai global `PDFDocument` — ternyata build CDN pdf-lib mengekspos `PDFLib`; dikoreksi jadi `const { PDFDocument } = PDFLib` (pola `merger.js`).

---

## [Blok 1 — Cangkang] — 2026-10-22

### Ditambahkan
- Strip nav suite (`suite-nav`) di `PDFM_V2.html` — cangkang navigasi antar halaman fitur; tautan ditambah saat tiap fitur selesai.
- `assets/css/suite.css` — base gaya bersama (palet merah, tombol, dropzone, tabel, dark mode) untuk halaman fitur baru.
- `CHANGELOG.md` ini.

### Keputusan desain (dari grill-me)
- Scope: seluruh `fiturbaru_PDFMERGER.md` (Fase 1–5 + Workflow Builder).
- Hanya folder `Productive/pdf-merger/` — `router.js`/`tool-card.js` tidak disentuh; semua fitur dicapai dari entry `#utilities/merger` → `PDFM_V2.html`.
- Urutan "paling berguna dulu": Split/Extract → operasi halaman → kompresi → konverter gambar → stamp → crop/n-up → office → anotasi → workflow builder.
- Library: CDN terpin dulu; npm di dalam folder hanya bila tidak ada build CDN.
- Kepatuhan: CHANGELOG ya, Vitest tidak (self-check Node untuk logika murni), teks UI inline Indonesia.
