# Label Merger V2 — Gabung & Analisis PDF Resi A6

Alat proses PDF resi A6: gabung urut, ekstrak teks/halaman, deteksi duplikat, dan export CSV. **100% client-side — tidak butuh backend.**

- **File:** `Productive/PDF-Merger/PDFM_V2.html` (UI, ±311 baris) + `assets/js/{utils,merger,extractor,parser,app}.js`
- **Backend:** ⛔ Tidak ada (pure browser)
- **Status:** ✅ Stable — client-side

---

## 1. Fitur & Cara Pakai

- **Drag-drop** file → urutkan (SortableJS, handle `☰`).
- **Merge** — gabung semua halaman ke satu PDF (pdf-lib).
- **Merge per kurir** — kelompokkan output berdasarkan ekspedisi yang terdeteksi parser.
- **Analyze** — ekstrak teks + thumbnail tiap halaman (pdf.js), deteksi duplikat, statistik.
- **Export CSV** — ringkasan paket (platform, resi, kurir, layanan, penerima, dst).

---

## 2. Keterkaitan

### 2.1 Library (CDN — versi terjepret)
| Library | Versi | Pakai |
|---|---|---|
| `pdf-lib` | **1.17.1** | merge/assemble PDF |
| `SortableJS` | **1.15.0** | drag reorder daftar file |
| `pdf.js` | **3.11.174** (+ `pdf.worker.min.js`) | ekstrak teks + thumbnail (`extractor.js`) |

- Versi ini saling tergantung — jangan "update sembarangan" satu-satunya. API pdf-lib (mis. `PDFDocument.embedPages`, `copyPages`) dan pdfjsLib (`getDocument`, `getDocument({data})`) berubah signifikan antar mayor versi → **upgrade semua sekaligus dan cek `merger.js`/`extractor.js`.**

### 2.2 Script load order (WAJIB)
`utils.js` → `merger.js` → `extractor.js` → `parser.js` → `app.js`.
- `app.js` (orchestrator) pakai API dari keempat file di atas. Pindah urutan = `ReferenceError` saat startup.

### 2.3 Hub & Shell
- Router: `#utilities/pdf-merger` → `Productive/PDF-Merger/PDFM_V2.html`.
- Memuat CSS bersama hub `../../src/styles/tools.css` + `:root` tema lokal (`--primary: #ff0000` → **tema merah**, ciri khas Label Merger).

---

## 2.x Storage & Tema
- **Tema tidak persisten** — `toggleTheme()` hanya set `data-theme` di memori; ia **tidak** `localStorage.setItem`. Refresh selalu kembali `light`. (Bisa ditambahkan bila perlu.)
- Menerima sink tema dari hub via `postMessage` tipe `SET_THEME` → `e.data.theme`.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Parser resi — pola hardcoded
- `parser.js` memakai regex/atau keyword untuk mengekstrak `platform`, `resi`, `kurir`, `layanan`, `penerima`, `pengirim`, `noPesanan`, `produk` dari teks PDF.
- PDF resi berubah layout → **buka `parser.js` dulu**, bukan `app.js`.

### 3.2 Versi library jangan dibilang
- pdf.js 3.x vs 2.x: `getDocument` & worker berbeda. Jelang upgrade, cek `GlobalWorkerOptions.workerSrc` (`extractor.js` baris 3).
- pdf-lib 1.x vs 2.x: API `embedPages`/`copyPages`/`save` berubah. Cek `merger.js` baris 1 area kerja.

### 3.3 Urutan file & dependency
- Jangan letakkan `app.js` sebelum `parser.js`/`merger.js`.
- `app.js` pakai IIFE `(function(){...})()` — semua elemen di-`getElementById`. Jika tambah elemen HTML, daftarkan juga variabel DOM di `app.js`.

### 3.4 Reset state saat reorder
- Sortable `onEnd` reset `parsedData = []` + menyembunyikan summary/CSV — karena `parsedData` per halaman (posisi array tak jamin setelah reorder). Jangan meng-"optimasi" ini hilangkan.

---

## 4. Flow Data (ringkas)

```
Drop file → Sortable reorder (files[])
Analyze → extractor.js (pdf.js) → parser.js → parsedData per halaman
Merge   → merger.js (pdf-lib) → blob → download
Per kurir → parser kelompokkan parsedData → merge terpisah
CSV     → gabung parsedData → download CSV
```
