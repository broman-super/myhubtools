# 📘 Panduan Implementasi Web Pengelola PDF — Untuk AI Agent

> **Tujuan Dokumen:** Panduan eksekusi bertahap untuk membangun fitur-fitur PDF pada web yang sudah ada (yang saat ini hanya memiliki fitur PDF Merger). Dokumen ini dirancang agar dapat dikerjakan secara mandiri oleh AI Agent dengan urutan fase yang jelas, kriteria selesai (*acceptance criteria*), dan pola kode acuan.

---

## 🎯 Ringkasan Fitur yang Akan Dibangun

| Kategori | Fitur | Kompleksitas |
| --- | --- | --- |
| Operasi Halaman | Split, Extract, Reorder, Rotate, Delete, Crop, N-up, Booklet, Page Numbers, Watermark | Rendah–Sedang |
| Konversi | PDF→Gambar, Gambar→PDF, PDF→Office, Office→PDF | Sedang–Tinggi |
| Edit & Anotasi | Highlight, Sticky Note, Free Draw, Form Filler, E-Sign, Redact | Sedang–Tinggi |
| Optimasi | Kompresi, Repair | Rendah–Sedang |

---

## 🏗️ Prinsip Arsitektur (WAJIB DIPATUHI)

1. **100% Client-Side.** Tidak ada file pengguna yang diunggah ke server. Semua proses di browser.
2. **Web Worker untuk operasi berat.** Konversi, kompresi, dan OCR harus berjalan di Web Worker agar UI tidak *freeze*.
3. **Lazy Loading.** Library besar (LibreOffice WASM, PDF.js, dll.) hanya dimuat saat fitur terkait dipakai.
4. **Struktur Folder Modular.** Setiap fitur berada di modul terpisah agar mudah di-*maintain*.

### Struktur Folder Rekomendasi
```
src/
├── core/
│   ├── pdfLoader.js        # Wrapper PDFDocument.load & PDF.js │   ├── fileHelper.js       # Download, preview, validasi │   └── workerManager.js    # Pengelolaan Web Worker ├── features/ │   ├── page-ops/ │   │   ├── split.js │   │   ├── extract.js │   │   ├── reorder.js │   │   ├── rotate.js │   │   ├── delete.js │   │   ├── crop.js │   │   ├── nup.js │   │   ├── pageNumbers.js │   │   └── watermark.js │   ├── convert/ │   │   ├── pdfToImage.js │   │   ├── imageToPdf.js │   │   ├── pdfToOffice.js │   │   └── officeToPdf.js │   ├── annotate/ │   │   ├── highlighter.js │   │   ├── stickyNote.js │   │   ├── freeDraw.js │   │   ├── formFiller.js │   │   ├── eSign.js │   │   └── redact.js │   └── optimize/ │       ├── compress.js │       └── repair.js ├── workers/ │   ├── convert.worker.js │   ├── compress.worker.js │   └── libreoffice.worker.js └── ui/ ├── components/ └── pages/ ```

### Library Inti (Install Sekali di Awal)
```bash
npm install pdf-lib pdfjs-dist @pdf-lib/fontkit npm install fresh-air-pdf           # untuk anotasi & form npm install @matbee/libreoffice-converter   # untuk Office→PDF ```

---

## 🚦 Aturan Eksekusi untuk AI Agent

1. **Kerjakan fase secara berurutan.** Jangan lompat ke fase berikutnya sebelum semua *acceptance criteria* fase saat ini terpenuhi.
2. **Setiap fitur harus punya:** (a) file logika di `features/`, (b) komponen UI, (c) validasi input, (d) penanganan error, (e) tombol download hasil.
3. **Gunakan pola fungsi async yang konsisten:** ```js export async function namaFitur(inputFile, options) { try { // 1. validasi // 2. proses // 3. return { success: true, data: Uint8Array } } catch (err) { return { success: false, error: err.message } } } ```
4. **Setiap kali selesai satu fitur, tulis unit test minimal** (Vitest/Jest) untuk fungsi logika utamanya.
5. **Jangan hardcode teks UI.** Gunakan file `i18n.js` (walau hanya bahasa Indonesia dulu).
6. **Update file `CHANGELOG.md`** setelah tiap fitur selesai.

---

## 📋 FASE 0 — Fondasi Proyek (Prasyarat)

**Tujuan:** Menyiapkan infrastruktur dasar sebelum menulis fitur.

### Tasks
- [ ] Setup `pdfLoader.js` sebagai wrapper `PDFDocument.load()` dari `pdf-lib` dengan opsi `{ ignoreEncryption: true, updateMetadata: false }`.
- [ ] Setup `fileHelper.js`: fungsi `downloadFile(bytes, filename)`, `bytesToBlob()`, `validatePdf(file)`.
- [ ] Setup `workerManager.js` untuk membuat/mengelola Web Worker secara generik.
- [ ] Setup konfigurasi header HTTP untuk `SharedArrayBuffer` (diperlukan nanti untuk WASM). Untuk Vercel, tambahkan di `vercel.json`:
  ```json
  {
    "headers": [{
      "source": "/(.*)",
      "headers": [
{ "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }, { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" } ] }] } ```
- [ ] Buat halaman `/tools` sebagai hub untuk semua fitur baru.

### ✅ Acceptance Criteria Fase 0

- File PDF kecil (1 halaman) bisa dimuat dan disimpan ulang tanpa error.
- `downloadFile` berfungsi di semua browser target (Chrome, Firefox, Safari).
- Web Worker kosong bisa berkomunikasi 2 arah dengan main thread.

---

## 📋 FASE 1 — Operasi Halaman (`page-ops`)

**Tujuan:** Memperluas fitur merger menjadi suite operasi halaman lengkap.
**Estimasi:** 3–5 hari kerja AI Agent.

### 1.1 Split / Extract
**File:** `features/page-ops/split.js`, `extract.js`

**Logika:**
```js
import { PDFDocument } from 'pdf-lib';

export async function extractPages(fileBytes, pageIndices) { const src = await PDFDocument.load(fileBytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, pageIndices);
  pages.forEach(p => out.addPage(p));
  return await out.save();
}
```
**UI:** Text input untuk rentang halaman (`1-3, 5, 7-9`). Parser → array indeks.

- [ ] Parser rentang halaman (`parsePageRange("1-3,5") → [0,1,2,4]`).
- [ ] Fitur Split: pilih rentang → hasilkan file per rentang atau ZIP.
- [ ] Fitur Extract: pilih halaman → 1 PDF hasil.

### 1.2 Reorder / Rotate / Delete
**File:** `reorder.js`, `rotate.js`, `delete.js`

**Logika Rotate (PENTING):**
```js
import { degrees } from 'pdf-lib';
const current = page.getRotation().angle;
page.setRotation(degrees((current + angle) % 360));  // akumulatif ``` **UI Reorder:** Grid thumbnail (render via PDF.js) dengan drag-and-drop → kirim urutan baru.

- [ ] Thumbnail renderer untuk semua halaman.
- [ ] Drag-and-drop reorder.
- [ ] Rotate dengan tombol per halaman (⟲ 90°, ⟳ 90°, 180°).
- [ ] Delete dengan tombol × per halaman.

### 1.3 Crop / Resize
**File:** `crop.js`

**Logika:**
```js
const { x, y, width, height } = cropBox; // koordinat dari UI page.setCropBox(x, y, width, height);
page.setMediaBox(x, y, width, height);
```
**UI:** Overlay selection rectangle di atas thumbnail, drag untuk menentukan area crop.

- [ ] Selection rectangle interaktif.
- [ ] Preset ukuran (A4, Letter, F4, dsb).
- [ ] Preview hasil sebelum download.

### 1.4 N-up / Booklet
**File:** `nup.js`

**Logika:** Buat halaman baru berukuran A4, gambar 2/4/6 halaman asli yang di-scale ke dalamnya.
```js
import { PDFDocument, rgb } from 'pdf-lib';
const newPage = out.addPage([595, 842]); // A4 portrait const [embedded] = await out.embedPdf(srcBytes, [0]);
newPage.drawPage(embedded, {
x: margin, y: newPage.getHeight() / 2, width: halfW, height: halfH });
```

- [ ] Mode 2-up (2 halaman per lembar).
- [ ] Mode 4-up.
- [ ] Mode Booklet (duplex-friendly, urutan halaman otomatis).

### 1.5 Page Numbers / Watermark
**File:** `pageNumbers.js`, `watermark.js`

**Logika Watermark:**
```js
const font = await pdf.embedFont(StandardFonts.HelveticaBold);
page.drawText('CONFIDENTIAL', {
  x: 100, y: 400,
  size: 60, font,
  color: rgb(1, 0, 0),
  opacity: 0.3,
  rotate: degrees(45),
});
```

- [ ] Page Numbers: posisi (top/bottom, kiri/tengah/kanan), format (`Halaman X dari Y`), start number.
- [ ] Watermark: teks atau gambar, opacity slider, rotasi slider, posisi.
- [ ] **Wajib:** Preview live sebelum download.

### ✅ Acceptance Criteria Fase 1

- Semua 9 fitur bisa dipakai end-to-end di browser tanpa server.
- Setiap fitur memiliki halaman route sendiri (`/tools/split`, `/tools/rotate`, dst).
- PDF hasil bisa dibuka di Adobe Reader, Chrome, dan Preview macOS tanpa error.
- Rotasi tidak "merusak" halaman yang sudah miring sebelumnya (test dengan PDF landscape).

---

## 📋 FASE 2 — Edit & Anotasi (`annotate`)

**Tujuan:** Menyediakan editor PDF visual.
**Estimasi:** 5–7 hari kerja AI Agent.

### 2.1 Setup Viewer (Fondasi Anotasi)
**File:** `features/annotate/viewer.js`

Gunakan `fresh-air-pdf` atau setup manual `PDF.js` + layer overlay.

- [ ] Render PDF.js dengan layer: `canvas` (render), `textLayer` (teks), `annotationLayer` (overlay).
- [ ] Toolbar dasar: zoom, next/prev page, pilih halaman.
- [ ] Sistem state untuk menyimpan daftar anotasi: `[{ page, type, data }]`.

### 2.2 Highlight, Sticky Note, Free Draw
**File:** `highlighter.js`, `stickyNote.js`, `freeDraw.js`

- [ ] Highlight: user drag di atas teks → simpan sebagai rect + warna.
- [ ] Sticky Note: klik di posisi → textarea untuk komentar.
- [ ] Free Draw: canvas overlay, simpan sebagai path SVG atau points.
- [ ] **Ekspor anotasi ke JSON** agar bisa diimpor kembali.

### 2.3 Form Filler
**File:** `formFiller.js`

**Logika Isi Form yang Ada:**
```js
const form = pdfDoc.getForm();
form.getTextField('nama').setText('John');
form.getCheckBox('setuju').check();
form.getDropdown('kota').select('Jakarta');
form.flatten(); // agar permanen
```
**Logika Form Baru (yang belum ada):** User menempatkan field teks/checkbox baru di atas PDF → simpan di JSON → saat export, gambar field ke PDF via `pdf-lib`.

- [ ] Deteksi field formulir otomatis (via `form.getFields()`).
- [ ] Isi field teks, checkbox, radio, dropdown.
- [ ] Tambah field baru (teks, checkbox, tanggal, signature).

### 2.4 E-Sign
**File:** `eSign.js`

- [ ] Canvas tanda tangan (mouse + touch).
- [ ] Atau upload gambar tanda tangan.
- [ ] Placeholder yang bisa digeser/di-resize ke posisi mana pun di halaman.
- [ ] Simpan ke PDF sebagai gambar via `pdf.embedPng()` + `page.drawImage()`.

### 2.5 Redact (PERHATIAN: Bukan Sekadar Kotak Hitam) **File:** `redact.js`

**Logika Sejati:** Hapus teks dari content stream PDF, bukan hanya tutup dengan kotak. Untuk versi ringkas yang aman:
```js
// 1. Identifikasi area rect yang diredact
// 2. Via PDF.js: cari semua text item yang beririsan dengan rect // 3. Render ulang halaman ke canvas // 4. Gambar kotak hitam di canvas (menutup visual) // 5. Buat PDF BARU dari canvas → teks asli hilang total ``` **Penting:** Jangan modifikasi PDF asli (text tetap ada di file). Selalu **render ulang ke PDF baru**.

- [ ] User drag untuk membuat kotak redact.
- [ ] Konfirmasi "Redact permanen?" sebelum proses.
- [ ] Hasil di-render ulang sebagai gambar (kehilangan text layer, tapi konten benar-benar hilang).

### ✅ Acceptance Criteria Fase 2

- PDF dengan anotasi bisa di-download dan anotasi terlihat di Adobe Reader.
- Form filler bisa mengisi form interaktif AcroForm asli.
- E-Sign menghasilkan gambar tanda tangan yang menempel di PDF.
- Redact menghasilkan PDF baru yang teks targetnya benar-benar tidak ada (verifikasi via select-all → copy → paste di editor, teks teredact tidak muncul).

---

## 📋 FASE 3 — Konversi Dasar

**Tujuan:** Implementasi konversi PDF↔Gambar yang paling umum diminta.
**Estimasi:** 2–3 hari kerja AI Agent.

### 3.1 PDF → Gambar (JPG/PNG)
**File:** `features/convert/pdfToImage.js`

**Logika:**
```js
import * as pdfjsLib from 'pdfjs-dist';
const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
const viewport = page.getViewport({ scale: 2 }); // 2x untuk kualitas const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
  // push ke array
}
```

- [ ] Pilihan format (JPG/PNG), DPI (72/150/300), kualitas (untuk JPG).
- [ ] Halaman tertentu atau semua.
- [ ] Jika >1 halaman → download sebagai ZIP (gunakan `jszip`).

### 3.2 Gambar → PDF
**File:** `features/convert/imageToPdf.js`

**Logika:**
```js
const pdf = await PDFDocument.create();
for (const imgFile of imageFiles) {
  const bytes = await imgFile.arrayBuffer();
  const img = imgFile.type === 'image/png'
    ? await pdf.embedPng(bytes)
    : await pdf.embedJpg(bytes);
  const page = pdf.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
}
```

- [ ] Multi-image → 1 PDF.
- [ ] Atur ukuran halaman (fit-to-image, A4, Letter).
- [ ] Atur margin dan orientasi.

### ✅ Acceptance Criteria Fase 3

- PDF 10 halaman → 10 JPG dalam 1 ZIP, resolusi sesuai pilihan.
- 5 JPG → 1 PDF, bisa dibuka normal, kualitas gambar tidak menurun drastis.
- Semua berjalan < 30 detik untuk file < 20 MB (di laptop standar).

---

## 📋 FASE 4 — Konversi Lanjutan (Office ↔ PDF)

**Tujuan:** Konversi format Office.
**Estimasi:** 4–7 hari kerja AI Agent (paling kompleks).

### 4.1 Office → PDF (LibreOffice WASM)
**File:** `features/convert/officeToPdf.js` + `workers/libreoffice.worker.js`

**Alur:**

1. Load `@matbee/libreoffice-converter` secara lazy.
2. Kirim file ke Web Worker.
3. Worker menjalankan LibreOffice WASM → hasilkan PDF.
4. Return bytes ke main thread → download.

- [ ] Setup Worker dengan `SharedArrayBuffer` (cek header HTTP dari Fase 0).
- [ ] Loading indicator yang jelas (proses ini bisa 10–30 detik).
- [ ] Support: DOCX, XLSX, PPTX, ODT, ODS, ODP.
- [ ] Batasan ukuran file (misalnya max 20 MB) → tampilkan pesan jika lewat.

### 4.2 PDF → Office (WASM)
**File:** `features/convert/pdfToOffice.js`

**Catatan:** Konversi ini paling tidak akurat secara client-side. Rekomendasi: **gunakan library `pdfto-tools` atau sejenis berbasis WASM**, dan beri disclaimer ke user bahwa layout mungkin tidak 100% sama.

- [ ] PDF → DOCX (fokus utama).
- [ ] PDF → XLSX (jika ada tabel).
- [ ] PDF → PPTX (opsional).
- [ ] Disclaimer di UI: "Konversi client-side, layout mungkin berbeda dari aslinya."

### ✅ Acceptance Criteria Fase 4

- DOCX sederhana → PDF, hasilnya bisa dibuka dan teksnya benar.
- PDF teks → DOCX, teks bisa di-edit (walau format mungkin berubah).
- Tidak ada crash browser saat proses berjalan.
- Worker bisa di-*cancel* oleh user jika terlalu lama.

---

## 📋 FASE 5 — Optimasi

**Tujuan:** Kompresi dan repair.
**Estimasi:** 2–3 hari kerja AI Agent.

### 5.1 Kompresi
**File:** `features/optimize/compress.js`

**Logika Dua Lapis:**
```js
// Lapis 1: object streams (ringan, aman)
const compressed = await pdfDoc.save({ useObjectStreams: true });

// Lapis 2: kompresi gambar (lebih agresif)
// 1. Ekstrak semua image XObject dari PDF
// 2. Re-encode ke JPEG kualitas lebih rendah // 3. Replace di PDF // 4. Save ulang ```

- [ ] Level kompresi: Rendah / Sedang / Tinggi (atur kualitas gambar & DPI).
- [ ] Tampilkan perbandingan ukuran sebelum vs sesudah.
- [ ] Preservasi teks & link (jangan render ulang seluruh PDF).

### 5.2 Repair
**File:** `features/optimize/repair.js`

**Logika:**
```js
try {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach(p => out.addPage(p));
  return await out.save();
} catch (e) {
  throw new Error('PDF terlalu rusak untuk diperbaiki.');
}
```

- [ ] Coba load dengan opsi toleran.
- [ ] Rebuild dokumen baru dari halaman yang berhasil dibaca.
- [ ] Jika gagal total → tampilkan pesan jelas + saran gunakan tool desktop.

### ✅ Acceptance Criteria Fase 5

- PDF 10 MB dengan banyak gambar → hasil kompresi < 5 MB, masih bisa dibaca.
- PDF dengan error minor (header rusak) berhasil di-repair dan bisa dibuka.
- PDF yang sangat rusak memberi error yang informatif, tidak crash.

---

## ✅ Checklist Global (Sebelum Rilis)

- [ ] Semua fitur punya halaman route sendiri.
- [ ] Semua fitur punya loading state dan error handling.
- [ ] Semua fitur punya tombol download + preview (jika relevan).
- [ ] File besar (>20 MB) ditolak dengan pesan jelas.
- [ ] Test di Chrome, Firefox, Safari (terutama Safari — kadang WASM bermasalah).
- [ ] Test dengan file PDF terenkripsi (harus beri pesan "tidak didukung").
- [ ] Test dengan PDF scan (image-only) — pastikan tidak crash saat anotasi.
- [ ] Semua kode di-lint (`eslint`), lolos TypeScript (jika pakai TS).
- [ ] Bundle size per route < 500 KB (kecuali route yang butuh WASM).
- [ ] `CHANGELOG.md` diperbarui.
- [ ] README berisi daftar fitur final + batasan (disclaimer).

---

## 🎁 Bonus: Fitur "Workflow Builder" (Setelah Semua Fase Selesai)

Jika semua fase di atas lulus, AI Agent dapat menambahkan fitur **Workflow Builder** — sebuah UI di mana user bisa drag-and-drop urutan operasi (misal: **Compress → Watermark → Split → Download ZIP**) dan menjalankannya otomatis dalam satu klik. Ini adalah fitur pembeda yang kuat dan relatif mudah karena semua fungsi sudah ada.

---

## 📌 Catatan Akhir untuk AI Agent

- **Prioritaskan fungsionalitas di atas estetika** pada fase awal. UI bisa dipercantik belakangan.
- **Selalu uji dengan file PDF nyata** (minimal 3 sampel: 1 teks, 1 scan, 1 campuran gambar+teks).
- **Jika sebuah library gagal di browser tertentu**, dokumentasikan di `KNOWN_ISSUES.md` dan sediakan fallback.
- **Commit per fitur**, bukan per fase. Pesan commit format: `feat(page-ops): add split by page range`.
- **Jika ada ambiguitas requirement**, buat asumsi paling masuk akal, catat di komentar kode, dan lanjutkan — jangan berhenti menunggu klarifikasi.

> **Target Akhir:** Web pengelola PDF yang sepenuhnya privat (client-side), cepat, dan kaya fitur — bersaing dengan tool komersial tanpa biaya API atau server.

---
*Dokumen ini adalah panduan hidup. Update jika ada perubahan requirement atau temuan teknis baru selama implementasi.*
