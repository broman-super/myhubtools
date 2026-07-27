# Instruksi AI — REYNAHUB_SYS

**Update:** 2026-07-27
**Untuk:** AI assistant yang bekerja pada proyek REYNAHUB_SYS

---

## 1. Proyek Ini Punya Apa ?

REYNAHUB_SYS adalah workspace hub internal — satu halaman shell yang menampung multiple web tools via iframe. Setiap tool adalah file HTML standalone (self-contained: CSS + JS di dalamnya). Backend-nya pakai Google Apps Script (GAS) + Google Sheets.

### Tools yang Terpasang
1. **Team Planner** (`Productive/Task/taskschedule.html`) — Calender, timeline, task/campaign/event/reminder, print view
2. **SAS Analytic** (`Productive/Analytic.html`) — Sales dashboard, chart, import Excel
3. **LATCH** (`Productive/latch/latch.html`) — Link manager
4. **Activity Tracker** (`Productive/tr/tracking.html`) — Daily activity + team workload
5. **Retur Tracker** (`Productive/tr-retur/retur-track.html`) — Package return logging
6. **Package Tracker** (`Productive/Outbondtrack.html`) — Package scan log
7. **PDF Merger** (`Productive/PDF-Merger/PDFM_V2.html`) — PDF combine + label parser
8. **Resi Generator** (`Productive/Resi-Generator/Index.html`) — Shipping label generator
9. **Form DAK** (`Doc/form-dak.html`) — DAK application form
10. **Expense Tracker** (`Productive/expense-tracker/`) — Planned, belum diimplement

---

## 2. Struktur Kode Utama

### Shell (Hub)
- **`index.html`** — SPA shell, landing page + workspace + sidebar + iframe router
- **`src/core/router.js`** — Hash-based router: `#productive/planner` → file path
- **`src/core/theme-manager.js`** — Dark/light theme, persists to localStorage, cross-frame sync
- **`src/core/iframe-communicator.js`** — postMessage bridge: shell ↔ iframe
- **`src/components/tool-card.js`** — Bento card renderer, defines tool list
- **`src/app.js`** — Main init, event listeners, navigation logic
- **`src/styles/tools.css`** — Global styles, font baseline, utility classes
- **`src/styles/design-system.css`** — CSS custom properties (design tokens), dark mode
- **`src/styles/components.css`** — Reusable component styles (cards, modals, etc.)
- **`src/styles/utilities.css`** — Utility classes

### Tools
- Setiap tool di folder `Productive/` (atau `Doc/`, `Resi-Generator/`, dll.)
- Tiap tool memiliki: `index.html` (atau `*.html`), `code-*.gs` (GAS backend), kadang `css/`, `js/`, `assets/`
- Tool files are self-contained — CSS bisa inline atau linked, JS bisa inline atau linked

### GAS Backend
- File `code-*.gs` adalah fungsi GAS yang deploy ke Google Apps Script
- `doPost(e)` — entry point, router berdasarkan `action` parameter
- `doGet(e)` — entry point untuk read operations
- Semua function diawali underscore `_` untuk internal (convention)

---

## 3. Pola Kode yang Dipakai

### 3.1 JavaScript — Vanilla ES6+
- **Tidak pakai framework.** Tidak ada React, Vue, Angular, jQuery (kecuali SAS Analytic)
- **Tidak pakai module system.** Semua JS standalone, IIFE atau global scope
- **Gunakan `var`, bukan `let/const`** di kode lama, `const`/`let` di kode baru
- **Class untuk encapsulation:** `class ThemeManager { ... }`, `class ReynaHubRouter { ... }`
- **IIFE untuk module:** `(function() { ... })()` atau `var ToolCard = { ... }`

### 3.2 CSS — Desain Sistem
- **CSS Custom Properties** di `:root` untuk theming
- **Dark mode:** `[data-theme="dark"]` selector untuk override
- **Bento grid:** `display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`
- **Bebas framework CSS.** Tidak ada Tailwind, Bootstrap, dll di production
- **Font:** `'Plus Jakarta Sans', sans-serif` — self-hosted atau CDN fallback
- **Print styles:** `@media print` di setiap tool yang support cetak

### 3.3 HTML
- **Semantic HTML5:** `<header>`, `<main>`, `<nav>`, `<aside>`, `<button>`, `<section>`
- **Self-contained:** CSS inline `<style>` di `<head>` (kecuali shell)
- **Font:** Google Fonts CDN link, tapi `file://` protocol tidak support CDN — handle gracefully

### 3.4 Google Apps Script
- **URL-based actions:** `doPost` menerima `{ action, ...data }`, dispatch ke fungsi
- **Sheet naming:** `Tasks`, `Events`, `Reminders`, `Expenses` (planned)
- **Response format:** `{ success: boolean, data: ... }` atau `{ success: false, message: string }`
- **Date format:** ISO `YYYY-MM-DD`
- **Number format:** Integer (Rupiah tanpa desimal), format di display

---

## 4. File yang Paling Sering Diubah

| Prioritas | File | Kenapa |
|-----------|------|--------|
| 1 | `Productive/Task/taskschedule.html` | Team Planner — paling kompleks, paling banyak fitur |
| 2 | `code-taskschedule.gs` | GAS backend untuk planner |
| 3 | `index.html` | Shell — navigation, tool card updates |
| 4 | `src/app.js` | Hub logic changes |
| 5 | `src/styles/design-system.css` | Design token changes |
| 6 | `src/components/tool-card.js` | Tool list changes (add/remove tools) |

### File yang Jarang Ubah
- `src/core/router.js` — hanya ubah saat menambah tool baru
- `src/core/theme-manager.js` — stable
- `src/core/iframe-communicator.js` — stable

---

## 5. Cara Kerja Saat Ini (Current State)

### Shell Boot Flow
```
1. index.html loads
2. Landing page shown
3. User clicks "Akses Workspace"
4. Landing hides, workspace shows
5. Router reads hash, maps to tool file path
6. Tool HTML loads in iframe
7. Tool initializes (fetch GAS data or use localStorage)
8. Tool renders UI
```

### Tool → GAS Communication
```
Tool frontend:
  fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "getCalendarData", ... }) })
    → GAS doPost(e) parses e.postData.contents
    → GAS function executes query on Google Sheet
    → Returns JSON response
  Tool parsed response → renders DOM
```

### Dark Mode Sync
```
Shell theme toggle → data-theme attribute on <html>
  → postMessage to all iframes
  → Each tool iframe listens 'theme-changed' CustomEvent
  → Tool applies [data-theme="dark"] CSS overrides
```

---

## 6. Konvensi Penamaan

| Item | Konvensi | Contoh |
|------|----------|--------|
| HTML files | snake_case atau PascalCase | `taskschedule.html`, `PDFM_V2.html` |
| GAS files | `code-<nama>.gs` | `code-taskschedule.gs` |
| CSS classes | kebab-case | `p-dot`, `btn-primary`, `bento-card` |
| CSS custom properties | `--nama-variabel` | `--accent`, `--bg-primary` |
| JavaScript functions | camelCase | `getCalendarData`, `saveCalendarItem_` |
| GAS functions | snake_case dengan underscore | `getCalendarData_`, `getSheetData_` |
| GAS sheet names | Capitalized singular | `Tasks`, `Events`, `Reminders`, `Expenses` |
| Tool folder | lowercase | `Productive/latch/`, `Productive/Task/` |
| HTML element IDs | snake_case atau camelCase | `linkGrid`, `searchInput`, `dashNav` |

---

## 7. Hal yang TIDAK Boleh Dilakukan

1. **Jangan tambah framework/library** ke tools yang sudah ada kecuali ada alasan kuat dan sudah didiskusikan
2. **Jangan ubah desain sistem (CSS custom properties)** tanpa alasan — ganti hanya untuk perbaikan bug
3. **Jangan rename file yang sudah ada** tanpa update semua referensi (router.js, tool-card.js, README.md, Update_Plan.md, etc.)
4. **Jangan hapus fitur yang sudah ada** tanpa konfirmasi pengguna — mark disabled dulu kalau perlu
5. **Jangan tambah dead code** — jika feature tidak dipakai lagi, hapus (bersihkan)
6. **Jangan ubah GAS sheet schema tanpa update semua fungsi** yang baca/sheet tersebut
7. **Jangan modify `node_modules/`** — itu bukan bagian dari proyek kita
8. **Jangan commit secrets/URL GAS** ke version control (sudah ditempatkan di file, ganti dengan placeholder jika perlu)

---

## 8. Cara Memperbaiki Bug

### Step-by-step

1. **Pahami gejalanya** — apa yang salah di user-facing?
2. **Trace aliran data** — dari mana data masuk, di mana diproses, di mana ditampilkan
3. **Cari fungsi yang relevan** — grep untuk nama fungsi/variabel
4. **Identifikasi root cause** — bukan symptom, akar masalahnya
5. **Perbaiki di satu tempat** — kalau bug bisa diperbaiki di shared function, perbaiki di situ saja (jangan fix di setiap caller)
6. **Verify** — reload tool, cek browser console untuk error
7. **Update Update_Plan.md** — catat perubahan

### Debugging Tips
- Buka tool langsung via `file://` path (no dev server needed)
- Browser DevTools → Console untuk error
- GAS → Apps Script editor → Execution log untuk backend error
- `file://` protocol tidak support CORS — jika fetch GAS gagal di `file://`, kemungkinan GAS URL atau sheet permission

---

## 9. Cara Menambah Tool Baru

1. Buat folder `Productive/<nama-tool>/`
2. Buat `index.html` (atau `<nama-tool>.html`) — self-contained
3. Buat `code-<nama-tool>.gs` — GAS backend (jika perlu)
4. Daftarkan di `router.js` → `getToolPath()`
5. Daftarkan di `tool-card.js` → `configs` array
6. Update `README.md` → tools list dan struktur file
7. Update `Update_Plan.md` → log perubahan

---

## Cara Manual Via URL (GAS Web App)

Setiap function dalam GAS backend bisa dipanggil via URL setelah deploy.

### Untuk initSpreadsheet (Fase Pertama Kali Setup):
```
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?action=initSpreadsheet
```
Cukup buka URL tersebut di browser — spreadsheet `Expenses` akan otomatis terbuat dengan 13 kolom header.

### Untuk function lain (POST):
Gunakan Postman/curl dengan body JSON:
```json
{"action": "submitExpense", "data": {"tanggal": "2026-07-27", "kategori": "transport", "deskripsi": "Test", "jumlah": 10000}}
```

---

## 10. GAS Deployment Checklist

Untuk setiap tool yang pakai GAS backend:

1. Buka [Google Apps Script](https://script.google.com)
2. Buat project baru atau buka existing
3. Copy fungsi `doPost` dan `doGet` yang dibutuhkan
4. Deploy → New Deployment → Web App
5. Set access: "Anyone" (atau org-specific)
6. Copy URL deployment
7. Update URL di tool file:
   - `Productive/Task/taskschedule.html` — GAS_URL variable
   - `Productive/latch/js/app.js` — `API_URL`
   - `Productive/tr/tracking.html` — GAS URL
   - `Productive/tr-retur/retur-track.html` — GAS URL
8. Test endpoint dengan curl atau Postman sebelum deploy

---

## 11. Pattern Penting di code-taskschedule.gs

### doPost Router
```javascript
function doPost(e) {
  var res = { success: false, message: '' };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    if (action === 'getCalendarData') { res.result = getCalendarData_(); }
    else if (action === 'saveCalendarItem' || action === 'saveTask') { res.result = saveCalendarItem_(params.data); }
    else if (action === 'deleteCalendarItem' || action === 'deleteTask') { res.result = deleteCalendarItem_(params.data.id, params.data.type); }
    else { res.message = 'Unknown action: ' + action; }
    res.success = true;
  } catch (e) { res.message = String(e.message || e); }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
```

### Sheet Data Reading
```javascript
function getSheetData_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return []; // header + no data
  var headers = rows[0].map(String);
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue; // skip empty rows
    var obj = {};
    headers.forEach(function(h, j) { obj[h.toLowerCase()] = rows[i][j]; });
    result.push(obj);
  }
  return result;
}
```

### data normalization (frontend → sheet)
```
GAS raw field → frontend field:
  nama → title
  mulai → date
  selesai → enddate
  warna → color
  deskripsi → description
  type (row header) → tipe

Semua field harus ada empty string fallback ('')
Kapanpun field mungkin kosong.
```

---

## 12. Konvensi CSS untuk Print View

Semua tool yang punya print view harus mengikuti pola ini:

```css
@media print {
  body { padding: 0; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
  @page { size: A4 landscape; margin: 15mm !important; }
  .no-print { display: none !important; }
  /* Override colors for print */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

---

## 14. Cara Membuat Webtool Baru — Panduan Praktis

Panduan ini menjelaskan **dokumen mana yang harus dibaca dan diikuti** saat membuat webtool baru.

### Langkah 0: Persiapan
Baca dokumen ini secara berurutan:

| Urutan | Dokumen | Bagian yang dibaca | Kenapa |
|--------|---------|-------------------|--------|
| 1 | `docs/PRD.md` | Section 4 (Expense Tracker) sebagai contoh template | Pahami format spesifikasi kebutuhan |
| 2 | `docs/arsitektur.md` | Section 4-6 (Tool Structure + Integration Path) | Pahami bagaimana tool baru masuk ke shell |
| 3 | `docs/design.md` | Section 4-11 (Components + Patterns) | Dapatkan semua pola UI yang bisa langsung dipakai |
| 4 | `docs/roadmap.md` | Tool Status Matrix | Lihat posisi tool baru dalam roadmap |
| 5 | `docs/instruksi_ai.md` | Bagian ini (Section 14) | Panduan langkah demi langkah |

### Langkah 1: Definisikan Kebutuhan (copy PRD pattern)
Buka `docs/PRD.md` dan lihat **Section 4 (Expense Tracker)** sebagai contoh template. Untuk tool baru, tulis:
- Status flow (status diagram)
- UI halaman & komponen
- Sheet/backend schema
- GAS functions yang dibutuhkan
- Data normalization rules

Isi dengan data tool baru Anda.

### Langkah 2: Buat folder tool
```
Productive/<nama-tool>/
  ├── <nama-tool>.html
  ├── code-<nama-tool>.gs  (jika pakai GAS)
  └── (opsional) css/ style.css, js/ app.js, assets/
```

### Langkah 3: Tulis HTML tool (ikuti design system)
Buka `docs/design.md` dan ikuti panduan ini:
1. **Struktur HTML** — Section 4.2: ikuti skeleton tool container
2. **CSS tokens** — Section 2.1: pakai `var(--bg-card)`, bukan hardcode warna
3. **Dark mode** — Section 2.2: tambahkan `[data-theme="dark"]` override
4. **Komponen yang dibutuhkan** — Section 4: pilih pattern yang sesuai
   - Butuh card grid? → Section 4.2 (Bento Card)
   - Butuh table? → Section 4.6 (Table)
   - Butuh form? → Section 4.5 (Form)
   - Butuh badge status? → Section 4.7 (Status Badges)
   - Butuh modal? → Section 4.3 (Modal)
   - Butuh toast? → Section 4.4 (Toast)
   - Butuh search? → Section 4.8 (Search Bar)
5. **Print view** — Section 6: ikuti print CSS template jika perlu cetak
6. **Anti-patterns** — Section 10: pastikan tidak melanggar aturan

### Langkah 4: Tulis GAS backend (jika perlu)
Buka `docs/instruksi_ai.md` Section 11 untuk pola `doPost` dan `getSheetData_`.

Contoh structure GAS:
```javascript
function doPost(e) {
  var res = { success: false, message: '' };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    if (action === 'myAction') { res.result = myFunction_(params.data); }
    else { res.message = 'Unknown action: ' + action; }
    res.success = true;
  } catch (e) { res.message = String(e.message || e); }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
```

### Langkah 5: Daftarkan ke shell
Buka `docs/arsitektur.md` Section 5 dan ikuti:
1. **router.js** — tambahkan satu baris mapping hash → file path (Section 3.1)
2. **tool-card.js** — tambahkan satu object ke `configs` array (Section 3.2)
3. Pilih `group` yang sesuai (`productive` atau `universal`)

### Langkah 6: Update documentasi
1. `docs/PRD.md` — tambahkan tool ke daftar modul
2. `docs/roadmap.md` — tambahkan ke tool status matrix
3. `docs/arsitektur.md` — tambahkan tool ke data flow diagram
4. `docs/instruksi_ai.md` — update references jika perlu
5. `README.md` (root) — update daftar tools dan struktur file
6. `Update_Plan.md` — tambahkan log perubahan

### Langkah 7: Test
1. Buka `index.html` di browser via `file://`
2. Klik sidebar — tool baru harus muncul
3. Klik tool card — iframe harus load tool HTML
4. Buka DevTools Console — pastikan tidak ada error
5. Toggle theme — pastikan dark mode bekerja
6. Jika ada print view — test `Ctrl+P` dengan A4 landscape
7. Jika ada GAS — test endpoint dengan Postman/curl

### Langkah 8: Deploy
- **Frontend:** Push ke `main` → GitHub Pages auto-deploy
- **GAS:** Deploy manual, update URL di tool file + dokumentasi

---

### Ringkasan Dokumen & Fungsinya

```
docs/PRD.md            → Apa yang harus dibangun (kebutuhan)
docs/arsitektur.md     → Bagaimana tool baru terintegrasi (struktur & pola)
docs/design.md         → Bagaimana desain tool baru (tampilan & komponen)
docs/roadmap.md        → Di mana tool baru berada dalam timeline (status & prioritas)
docs/instruksi_ai.md   → Bagaimana cara membangun tool baru (step-by-step + pola kode)
docs/Readme.md         → Navigasi ke semua dokumen di atas (peta jalan)
```

Baca berurutan dari atas ke bawah saat memulai tool baru. Setiap dokumen saling merujuk — tidak berdiri sendiri.

| Konteks | Convention | Example |
|---------|-----------|---------|
| GAS sheet rows | `rows[i][j]` atau destructured | `var row = rows[i]` |
| Frontend campaign | `t`, `g`, `ci` (in loops) | `daySlots.map(function(t) { ... })` |
| Frontend unique group | `g` | `uniqueCampaigns.map(function(g) { ... })` |
| DOM element | lowercase semantic | `dotTitle`, `dotColor`, `dotContent` |
| Boolean flags | `is` or `has` prefix | `isMultiDay`, `hasData` |
| Counters | `idx`, `i`, `j`, `num` | `for (var i = 0; ...)` |
| Strings to escape | `esc()` function | `esc(g.title)` |


