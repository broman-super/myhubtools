# Update Plan — Team Planner (taskschedule.html)

---

## Perubahan Terbaru (2026-07-25)

### Print View Improvements
- **Campaign grouping:** Group by title + description, sorted dates ascending
- **Calendar layout:** Two-page split (calendar p1, list p2), Bento flex-wrap grid
- **Grid dots:** Plain colored circles — no shape characters, no misleading numbers
- **Color-group numbering:** Dots show numbering only when multiple campaigns share the same color in the month; single-item colors show plain dot only. Numbers in grid match numbers in description list
- **Description area:** Added background (#f1f5f9), border-radius, increased padding (4px 8px), margin-top/bottom (6px)
- **Dot sizing:** Increased to 16x16px, border-radius 50%, gap 5px
- **Data normalization:** All GAS raw fields mapped to frontend fields (nama → title, mulai → date, selesai → enddate, warna → color, deskripsi → description) with empty string fallbacks
- **undefined fix:** formatShortDate(), renderDetail(), and grid rendering all have null guards

### Bug Fixes
- **Campaign edit creating new row:** Fixed saveCalendarItem_ ID column lookup to be case-insensitive (headers.map(h => h.toLowerCase()).indexOf('id'))
- **LATCH access:** latch/js/app.js API_URL was empty placeholder, updated to real GAS web app URL
- **TikTok chip color:** Changed from #9ca3af to #a1a1a1 for better visibility on calendar grid and timeline

### Code Cleanup
- Removed unused SHAPES array from taskschedule.html
- Removed unused shapeIdx / shapeMap logic (no longer needed without shape rendering)
- Removed unused g.shape / g.shapeIdx property assignments

---

## Log Perubahan

| Tanggal | Area | Perubahan | Status |
|---------|------|-----------|--------|
| 2026-07-25 | Print View | Campaign grouping, Bento grid layout, separate print pages | ✅ |
| 2026-07-25 | Print View | Grid dots: plain colored circles, color-group numbering | ✅ |
| 2026-07-25 | Print View | Description area spacing + background | ✅ |
| 2026-07-25 | Data Normalization | Frontend field mapping + undefined guards | ✅ |
| 2026-07-25 | Bug Fix | Campaign edit now updates existing row (case-insensitive ID lookup) | ✅ |
| 2026-07-25 | LATCH | API_URL fixed → real GAS web app | ✅ |
| 2026-07-25 | TikTok Chip | Color #9ca3af → #a1a1a1 | ✅ |
| 2026-07-25 | Code Cleanup | Removed SHAPES array, shapeIdx, shapeMap dead code | ✅ |
| 2026-07-29 | Bug Fix | Campaign date normalization — added `c.tanggal` fallback at 4 normalization blocks | ✅ |
| 2026-07-29 | Bug Fix | Timeline wheel zoom — added Ctrl/Meta key guard | ✅ |
| 2026-07-29 | Bug Fix | Reminder bar color teal → amber (#14b8a6 → #f59e0b) | ✅ |
| 2026-07-29 | Bug Fix | Reminder label icon — added isReminder check for 🔔 | ✅ |
| 2026-07-29 | Bug Fix | Event stripe gradient overridden — added !important | ✅ |
| 2026-07-29 | Bug Fix | Event/reminder description crash from GAS Date object — String() coercion in all mappings | ✅ |
| 2026-07-29 | CSS | Merged redundant 650px/1023px responsive blocks in taskschedule.html | ✅ |
| 2026-07-29 | CSS | `filter:grayscale(100%)` → `opacity: 0.4` (GPU paint fix) | ✅ |
| 2026-07-29 | CSS | Fixed undefined tokens `--sp-*` → `--space-*`, `--r-full` → `--radius-full` in utilities.css | ✅ |
| 2026-07-29 | CSS | Added `--space-2/3/4`, `--radius-full` to design-system.css | ✅ |
| 2026-07-29 | UI | Custom confirmation modal (`showConfirm()`) — replaced all native `confirm()` calls | ✅ |
| 2026-07-29 | UI | Loading spinner on save button (CSS `@keyframes spin`) | ✅ |
| 2026-07-29 | UI | Empty states — search results, timeline, month grid, week cells | ✅ |
| 2026-07-29 | UI | Offline indicator banner (sticky red, `online`/`offline` events) | ✅ |
| 2026-07-29 | UI | Time picker (`<input type="time">`) in event/reminder modal | ✅ |
| 2026-07-29 | SPA | Search debounce 300ms | ✅ |
| 2026-07-29 | SPA | Iframe loading spinner (CSS `::after` pseudo-element) | ✅ |
| 2026-07-29 | SPA | Search empty state ("🔍 Tidak ditemukan") | ✅ |
| 2026-07-29 | SPA | Card keyboard accessibility (tabindex, role="button", Enter/Space) | ✅ |
| 2026-07-29 | SPA | Card filter animation (opacity/scale transition) | ✅ |
| 2026-07-29 | SPA | Dashboard↔iframe crossfade transition | ✅ |
| 2026-07-29 | Dark Mode | tracking.html — toast dark mode + inline modal dark overrides | ✅ |
| 2026-07-29 | Dark Mode | form-dak.html — Full dark mode via CSS variables, theme toggle | ✅ |
| 2026-07-29 | Layout Fix | Fixed duplicate action-bar in retur-track.html (berantakan), fixed duplicate closing divs, fixed table header widths (30+30+30+10=100%) | ✅ |
| 2026-07-29 | Feature | Removed item-waktu header column, added Operator column, reorder staging table to Tanggal | Operator | Nomor Resi | ✅ |
| 2026-07-29 | Feature | Added operator input field (#inputOperator) with CSS styling to retur-track.html | ✅ |
| 2026-07-29 | Feature | Added operator capture in addStaging() and save to staging data | ✅ |
| 2026-07-29 | Feature | Added Operator column to code-retur-track.gs database schema | ✅ |
| 2026-07-29 | Crosscheck | 4 agents cross-checked all changes — found 10 bugs, all fixed | ✅ |
| 2026-07-29 | Bug Fix | postMessage theme type mismatch — template-iframe.html now handles both 'theme-changed' and 'SET_THEME' | ✅ |
| 2026-07-29 | Bug Fix | iframe.onerror destroys iframe element — changed to appendChild error element | ✅ |
| 2026-07-29 | Bug Fix | Crossfade not bidirectional — goHome() now has 300ms delay | ✅ |
| 2026-07-29 | Bug Fix | Offline banner no initial check — added `if (!navigator.onLine)` on load | ✅ |
| 2026-07-29 | Bug Fix | Confirm modal no Esc/click-outside — added handler + closeConfirm() | ✅ |
| 2026-07-29 | Bug Fix | form-dak signature lines #000 invisible on dark → var(--dak-text) | ✅ |
| 2026-07-29 | Bug Fix | form-dak theme restore on load — localStorage + IIFE | ✅ |
| 2026-07-29 | Bug Fix | Outbondtrack native confirm() → customConfirm() (already existed) | ✅ |
| 2026-07-29 | Bug Fix | taskschedule toggleTheme() localStorage save + restore on load | ✅ |

---

---

## Perubahan Terbaru (2026-07-29)

### Bug Fixes
- **Campaign date hilang:** `c.tanggal` fallback ditambahkan di semua normalization blocks (taskschedule.html)
- **Timeline zoom tanpa Ctrl/Meta:** `handleTimelineWheel()` sekarang ngecek `e.ctrlKey || e.metaKey` sebelum zoom
- **Reminder bar warna salah:** Teal (#14b8a6) → Amber (#f59e0b)
- **Label icon reminder:** Ditambahkan `isReminder ? '🔔'` check
- **Stripes event kehapus:** `!important` di CSS `.timeline-bar.event`
- **Description crash:** GAS Date object menyebabkan `item.description.substring()` error — fixed dengan `String()` coercion di semua mapping + normalization

### CSS Konsolidasi
- **Responsive blocks:** Dua `@media (max-width: 650px)` blocks digabung nested di dalam `@media (max-width: 1023px)`
- **GPU performance:** `filter: grayscale(100%)` → `opacity: 0.4` pada `.cal-cell.other`
- **Design tokens:** Fix undefined CSS variables `--sp-*` → `--space-*`, `--r-full` → `--radius-full`; tambah `--space-2/3/4` + `--radius-full` ke design-system.css
- **`.day-dots` dedup:** Hanya didefinisikan sekali (base: `display:none`, mobile: `display:flex`)

### Missing UI Features
- **Custom confirmation modal:** `showConfirm()` Promise-based menggantikan semua native `confirm()` calls
- **Loading spinner:** Save button menampilkan `<span class="spinner"></span> Menyimpan...`
- **Empty states:** Search → "🔍 Tidak ada hasil", timeline → "📭 Tidak ada agenda", month/week grid
- **Offline indicator:** Sticky red banner, toggle via `window online/offline` events
- **Time picker:** `<input type="time">` untuk event/reminder di modal, format `date+T+time`

### SPA Hub (src/)
- **Search debounce:** 300ms timer sebelum filter
- **Iframe loading spinner:** CSS `::after` pseudo-element, `.loading` class toggle
- **Search empty state:** "🔍 Tidak ditemukan" saat no cards match
- **Card keyboard accessibility:** `tabindex="0"`, `role="button"`, Enter/Space handler
- **Card filter animation:** `opacity`/`scale` transition via `.hidden-card` class
- **Dashboard↔iframe crossfade:** Opacity transition 0.3s saat switch view

### Dark Mode
- **tracking.html:** Dark mode untuk toast + inline modals
- **form-dak.html:** Full dark mode via CSS variables, theme toggle button, `postMessage` listener

### Crosscheck Fixes (4 Agent)
- **template-iframe.html:** `postMessage` theme listener now accepts both `'theme-changed'` (old) and `'SET_THEME'` (parent hub) — fix theme sync
- **app.js:** `iframe.onerror` no longer destroys `<iframe>` element — uses `appendChild` error message instead; crossfade `goHome()` now bidirectional with 300ms delay
- **taskschedule.html:** Offline banner checks initial `navigator.onLine` state; confirm modal supports Esc key + click-outside close; `toggleTheme()` saves to localStorage + restores on load
- **form-dak.html:** Signature lines use `var(--dak-text)` instead of `#000` (invisible on dark); theme restore on page load via localStorage + `postMessage`
- **Outbondtrack.html:** Native `confirm()` replaced with existing `customConfirm()`
- **CSS group selector bug:** FALSE POSITIVE — selectors already correctly prefixed with `[data-theme="dark"]`

### UI Audit (4 Agent)
- **Agent 1:** Task scheduler — 15 optimasi, 14 missing features, 15 rekomendasi animasi
- **Agent 2:** Tracking tools — 20+ issues, cross-tool consistency problems
- **Agent 3:** Document tools — 40+ issues across 6 tools (Resi, PDF, LATCH, Expense, DAK, Analytic)
- **Agent 4:** SPA hub — undefined tokens, dead code, missing loading/empty/error states, aksesibilitas

---

## Prioritas Mendatang

### [ ] Expense Tracker — Pengajuan, Realisasi & Reimburse

**Teknologi:** Vanilla HTML + CSS + JS (standalone), GAS Web App backend, Google Sheets database.
**File:** `Productive/expense-tracker/index.html` + `code-expense-tracker.gs`.
**Zero framework, zero runtime dependencies.**

---

#### 1. Workflow (Status Flow)

```
Draft → Pengajuan → { Disetujui | Ditolak } → Realisasi → { Reimburse → Selesai | Batal }
```

Langkah kerja:
1. User mengisi form → data masuk sheet dengan status `pengajuan`
2. Manager membuka list → approve atau reject tiap pengajuan
3. User input realisasi (jumlah aktual yang dikeluarkan) → status → `realisasi`
4. Admin memproses reimburse (pembayaran penggantian) → status → `selesai`
5. User atau admin bisa batalkan pengajuan kapan saja sebelum cair → status → `batal`

---

#### 2. UI Halaman & Komponen

**Halaman 1 — Form Tambah Pengajuan (halaman utama)**
- Tanggal (date picker) — wajib
- Kategori (select dropdown) — wajib, opsi: `Transport`, `Makan`, `Komunikasi`, `PPN`, `Hotel`, `Lainnya`
- Deskripsi (textarea) — wajib
- Jumlah (number input, format Rupiah otomatis dengan pemisah ribuan) — wajib
- Bukti Kuitansi (file upload, accept gambar/pdf, preview thumbnail sebelum kirim) — opsional
- Pengaju (auto-populate dari session/user, tidak bisa diedit)
- Tombol: `Simpan Draft`, `Kirim Pengajuan`

**Halaman 2 — List Pengajuan (tab terpisah)**
- Filter by status: semua, draft, pengajuan, disetujui, ditolak, realisasi, selesai, batal
- Filter by kategori (multi-select)
- Filter by tanggal (range picker: dari → sampai)
- Search by deskripsi (real-time, debounced)
- Setiap row menampilkan: tanggal | kategori badge | deskripsi (truncated) | jumlah terformat | status badge | aksi kontekstual (approve/reject/input realisasi/mark reimburse)
- Pagination (20 rows per page)

**Halaman 3 — Dashboard Ringkas (tab terpisah)**
- Ringkasan bulan berjalan: total pengajuan, total disetujui, total realisasi, total reimburse
- Per-kategori breakdown (bar chart sederhana, CSS-only)
- Pengajuan pending count (badge notifikasi di nav)
- Grafik tren 6 bulan terakhir (line chart CSS)

**Halaman 4 — Detail Pengajuan (modal/panel)**
- Semua field lengkap
- Timeline status perubahan (siapa ubah, kapan, status sebelumnya → baru)
- Bukti kuitansi preview (image thumbnail atau link download) jika ada
- Tombol aksi kontekstual sesuai status saat ini
- Tombol delete (hanya untuk draft)

---

#### 3. Sheet `Expenses` — Struktur Kolom

| # | Kolom | Tipe | Contoh | Keterangan |
|---|-------|------|--------|------------|
| 1 | `id` | string | `exp_20260725_001` | Auto-generated, unique per tanggal |
| 2 | `tanggal` | date string | `2026-07-25` | Tanggal expense (YYYY-MM-DD) |
| 3 | `kategori` | string | `transport` | Enum ketat, lowercase |
| 4 | `deskripsi` | string | `Uber ke bandara` | Detail expense |
| 5 | `jumlah` | integer | `85000` | Nilai Rupiah tanpa desimal |
| 6 | `buktiNama` | string | `struk_uber.pdf` | Nama file kuitansi |
| 7 | `buktiUrl` | string | `-` | URL file atau `-` jika tanpa bukti |
| 8 | `pengaju` | string | `joko` | User yang mengajukan |
| 9 | `status` | string | `pengajuan` | Enum ketat lowercase |
| 10 | `approvedBy` | string | `manager_adi` | User yang approve (kosong jika belum) |
| 11 | `tanggalApproved` | datetime | `2026-07-25 14:30` | Kapan disetujui (kosong jika belum) |
| 12 | `statusRealisasi` | string | `-` | Enum: `-`, `lunas`, `belum_lunas` |
| 13 | `tanggalUpdate` | datetime | `2026-07-25 14:30` | Timestamp perubahan terakhir |

Enum untuk `status`: `draft`, `pengajuan`, `disetujui`, `ditolak`, `realisasi`, `selesai`, `batal`
Enum untuk `kategori`: `transport`, `makan`, `komunikasi`, `ppn`, `hotel`, `lainnya`

---

#### 3.5 GAS Spreadsheet Initialization Script (Fase Awal)

**File:** `code-expense-tracker.gs` — function `initSpreadsheet_()`

Saat pertama kali dideploy atau saat spreadsheet belum memiliki sheet `Expenses`, run `initSpreadsheet_()` dari Apps Script editor (atau panggil via GAS Web App dengan action `initSpreadsheet`). Function ini:

1. Mengecek apakah sheet `Expenses` sudah ada
2. Jika sudah ada → clear isi, tetap pertahankan header
3. Jika belum ada → buat sheet baru, tambahkan header row

Hasilnya: spreadsheet langsung siap dipakai tanpa setup manual kolom. Cukup deploy GAS, run init, dan data bisa dimasukkan.

#### 4. GAS Functions — Daftar Lengkap

| Function | Aksi | Return |
|----------|------|--------|
| `submitExpense(data)` | Insert row baru, status=draft → auto-set ke pengajuan jika kirim | `{ success, id, row }` |
| `getExpenses(filter)` | Ambil data dengan filter status/kategori/tanggal/search/pagination | Array of objects |
| `getExpenseById(id)` | Ambil 1 row detail, termasuk timeline status | Object |
| `approveExpense(id, approver)` | Ubah status→disetujui, set approvedBy & tanggalApproved | `{ success }` |
| `rejectExpense(id, reason)` | Ubah status→ditolak, catat alasan di field tambahan | `{ success }` |
| `markRealisasi(id, lunas)` | Update statusRealisasi (lunas/belum_lunas), status→realisasi | `{ success }` |
| `markReimburse(id)` | Ubah status→selesai (reimburse cair) | `{ success }` |
| `cancelExpense(id)` | Ubah status→batal (hanya untuk draft/pengajuan) | `{ success }` |
| `deleteExpense(id)` | Hapus row (hanya untuk draft) | `{ success }` |
| `getExpenseSummary(periode)` | Ringkasan total per kategori, per status untuk dashboard | Object `{ totalPengajuan, totalDisetujui, totalRealisasi, totalReimburse, perKategori: {} }` |
| `getExpenseCountByStatus(periode)` | Hitung per status untuk badge notifikasi | Object `{ pengajuan: N, disetujui: N, realisasi: N, selesai: N, batal: N }` |

Semua function mengembalikan object dengan `{ success: boolean, data/error }` untuk konsistensi.

---

#### 5. Data Normalization (Frontend → Sheet)

- Semua tanggal disimpan format ISO `YYYY-MM-DD`
- Jumlah disimpan integer (rupiah tanpa desimal, tanpa pemisah ribuan — format hanya di display)
- Semua string field di-trim sebelum disimpan
- Status field menggunakan enum lowercase yang ketat (validasi di frontend sebelum kirim ke GAS)
- `buktiUrl` default `-` jika tidak ada file terupload
- `deskripsi` di-escape untuk aman di Google Sheets (hindari karakter yang rusak)
- `pengaju` diambil dari session yang sudah ter-authentikasi, tidak bisa dimanipulasi dari frontend
- `id` dibuat di frontend dengan pola `exp_YYYYMMDD_NNN` di mana NNN adalah nomor urut harian

---

#### 6. Gaya & UX (Desain)

- **Design system** yang sama dengan tool lain (Plus Jakarta Sans, CSS custom properties, dark mode toggle)
- **Tabel** responsive, scroll horizontal di mobile (overflow-x: auto)
- **Toast notification** untuk sukses/gagal submit/approve/reject/cancel/mark-reimburse
- **Konfirmasi dialog** (custom modal) sebelum: approve, reject, cancel, delete, mark reimburse
- **Loading state** — spinner/skeleton saat fetch GAS (API_TIMEOUT_MS: 10000)
- **Error handling** — pesan error yang mudah dipahami user (bukan raw error dari GAS)
- **Empty state** — tampilan visual saat tidak ada data untuk filter yang dipilih (illustration + text)

---

#### 7. File Struktur

```
Productive/expense-tracker/
  ├── index.html              # Halaman utama (form + list + dashboard + detail)
  ├── code-expense-tracker.gs # GAS backend (10 functions)
  ├── css/
  │   └── style.css           # Styling (ikuti design system existing)
  └── js/
      └── app.js              # Frontend logic (3 modules: form, list, dashboard)
```

---

#### 8. Definisi "Selesai" (Definition of Done)

- [ ] Form tambah pengajuan berfungsi dengan validasi field wajib
- [ ] List pengajuan dengan filter, search, pagination berfungsi
- [ ] Approve & Reject via GAS berfungsi
- [ ] Mark Realisasi (lunas/belum_lunas) berfungsi
- [ ] Mark Reimburse → Selesai berfungsi
- [ ] Cancel (Batal) pengajuan berfungsi (hanya draft/pengajuan)
- [ ] Dashboard ringkas menampilkan angka yang akurat
- [ ] Detail pengajuan menunjukkan timeline status perubahan
- [ ] Upload bukti kuitansi berfungsi (preview + simpan URL)
- [ ] Dark mode toggle berfungsi konsisten dengan tool lain
- [ ] Data normalization berjalan (tidak ada undefined di sheet)
- [ ] GAS functions semua mengembalikan consistent response format
- [ ] Loading state dan error handling berfungsi
- [ ] Toast notification untuk semua aksi user
- [ ] Konfirmasi dialog untuk aksi destruktif (approve/reject/cancel/delete)
- [ ] Test manual: buat → submit → approve → realisasi → reimburse → selesai

---

## Perubahan Terbaru (2026-08-04)

### Audit Menyeluruh 9 Webtool — Kecacatan Koneksi Element

Audit baca-ulang (READ-ONLY) semua webtool di `Productive/` untuk memeriksa koneksi antar element (id HTML ↔ JS, action frontend ↔ backend GAS, path relatif, template string). Hasil dibagi: **[DIPERBAIKI]** / **[BUG]** / **[MINOR]** / **[DEAD CODE]** / **[GAP]**.

Setiap point menyertakan **"Terhubung dengan"** = elemen/fungsi lain yang ikut terpengaruh, supaya saat perbaikan tidak ada yang kehilangan fungsi (Aturan Emas #1).

---

#### 1. [DIPERBAIKI ✅] Path CSS patah setelah pindah folder — Analytic & Outbondtrack

- **Lokasi:** `Productive/analytic/Analytic.html` L7 · `Productive/outbondtrack/Outbondtrack.html` L6
- **Masalah:** `href="../src/styles/tools.css"` hanya naik 1 level → resolve ke `Productive\src\styles\tools.css` yang tidak ada. Regresi dari reorganisasi folder (tool dipindah lebih dalam 1 level tapi path CSS tidak ikut).
- **Terhubung dengan:**
  - File `src/styles/tools.css` (di root repo) — target yang benar; dipakai juga oleh Task (`../../src/styles/tools.css`), latch, tr, tr-retur, PDF-Merger, Resi-Generator, expense-tracker.
  - Router hub `src/core/router.js`: `#productive/analytic` → `Productive/analytic/Analytic.html`, `#utilities/outbond` → `Productive/outbondtrack/Outbondtrack.html` (sudah benar, tidak perlu diubah).
- **Perbaikan:** `../src` → `../../src`. **Sudah diterapkan.**
- **Verifikasi:** `Test-Path Productive\src` = False; `Test-Path src\styles\tools.css` = True.

---

#### 2. [BUG 🔴] Hapus Task/Campaign tidak pernah tersimpan — Team Planner

- **Lokasi:** `Productive/Task/taskschedule.html` L2955
- **Masalah:** `api('deleteTask', id)` mengirim **string** id, sedangkan backend `deleteCalendarItem_(params.data.id, params.data.type)` (code-taskschedule.gs L18) mengharap **objek `{id, type}`** → `params.data.id` = `undefined` → baris di sheet tidak dihapus. Frontend tetap menampilkan toast sukses + undo (L2956-2957) sehingga user mengira berhasil; data kembali setelah refresh.
- **Terhubung dengan:**
  - Backend `gscode/code-taskschedule.gs`: dispatch `deleteCalendarItem_` (L18) & fungsi `deleteCalendarItem_(id, type)` (L95).
  - Pola yang **sudah benar** (jangan ikut diubah): hapus Event/Reminder L2940 `api('deleteCalendarItem', { id: id, type: type })`.
  - Alur UI: `pushUndo()` (L2948), `S.tasks` filter (L2950), `showUndoSnackbar` (L2956), `refreshData(true)` (L2957).
- **Perbaikan:** ubah L2955 menjadi `api('deleteTask', { id: id, type: 'task' })` — atau seragamkan contract backend untuk menerima string. **Belum diterapkan.**

---

#### 3. [BUG 🟠] Fallback `getTasks` via GET mati — Team Planner

- **Lokasi:** `Productive/Task/taskschedule.html` L2099-2101
- **Masalah:** fallback `api('getTasks')` → `fetch(GAS_URL?action=getTasks)` via **GET**, tapi `gscode/code-taskschedule.gs` **tidak punya `doGet`** (hanya `doPost`, L7) → response bukan JSON → `.catch()` kosong menelan error.
- **Terhubung dengan:**
  - Backend code-taskschedule.gs L4 — komentar "query via doGet" yang tidak pernah direalisasikan.
  - Alur refresh data `refreshData()` / `getCalendarData` — pastikan fallback ini hanya jaring pengaman, bukan jalur utama.
- **Perbaikan:** tambah `doGet(e)` di backend (return JSON via `?action=getTasks`), atau hapus fallback GET dan jadikan POST konsisten. **Belum diterapkan.**

---

#### 4. [BUG 🟠] `products.json` invalid (trailing comma) — Resi Generator

- **Lokasi:** `Productive/Resi-Generator/products.json` L391 (item terakhir diakhiri `},` sebelum `]`)
- **Masalah:** trailing comma membuat **JSON tidak valid** → `fetch('products.json')` (Index.html L589-595) selalu masuk `.catch` → autocomplete produk **selalu** pakai `EMBEDDED_PRODUCTS`; update katalog di `products.json` tidak pernah terbaca.
- **Terhubung dengan:**
  - `Index.html`: `loadProductDatabase()` (L589-595), autocomplete yang memakai `p.name`/`p.sku` (L671-672, L733, L745-746), field structure di semua item products.json.
  - Fallback `EMBEDDED_PRODUCTS` — akan terus menutupi produk baru selama JSON invalid.
- **Perbaikan:** hapus koma di akhir item terakhir. **Belum diterapkan.**

---

#### 5. [BUG 🟠] Enter tidak memilih saran autocomplete — Resi Generator

- **Lokasi:** `Productive/Resi-Generator/Index.html` L716 (`active.click()`) vs L734 (selection terikat `mousedown`)
- **Masalah:** `click()` tidak membangkitkan event `mousedown` → navigasi keyboard (Enter) tidak pernah memilih suggestion.
- **Terhubung dengan:** list suggestion autocomplete, handler keydown, handler `mousedown` tiap item saran. Jangan sentuh handler `click` item lain yang sudah benar.
- **Perbaikan:** pada L716 ganti pemicu agar langsung memilih saran aktif (panggil fungsi pilihan langsung), bukan `active.click()`. **Belum diterapkan.**

---

#### 6. [BUG 🟡] `COMPANY_LOGO_BASE64` tanpa guard — Resi Generator

- **Lokasi:** `Productive/Resi-Generator/Index.html` L897
- **Masalah:** `buildResiHTML` memakai `COMPANY_LOGO_BASE64` (global dari `logo.js`) **tanpa** cek `typeof` — berbeda dengan `EXPEDISI_LOGOS` yang di-guard (L905). Jika `logo.js` (1MB base64) gagal load → `ReferenceError` → seluruh preview/generate resi mati.
- **Terhubung dengan:** global `COMPANY_LOGO_BASE64` (logo.js L1), `EXPEDISI_LOGOS` guard L905 (pola yang harus diikuti), alur `buildResiHTML` → preview → print.
- **Perbaikan:** tambah fallback `(typeof COMPANY_LOGO_BASE64 !== 'undefined' ? COMPANY_LOGO_BASE64 : '')`. **Belum diterapkan.**

---

#### 7. [BUG 🔴] Parsing produk PDF mati total — PDF Merger

- **Lokasi:** `Productive/PDF-Merger/assets/js/parser.js` L40 (`normalizeText`)
- **Masalah:** `normalizeText` meratakan **semua whitespace termasuk newline** (`\s+` → spasi) → parser produk yang butuh baris terpisah (`parseShopeeProducts` L129-135 butuh `\s{2,}` + split `\r?\n`; `parseTikTokProducts` L141 butuh `^(\d+)\s*$/m`) tidak akan pernah match → kolom `produk` selalu `[]`.
- **Terhubung dengan:**
  - `app.js` L160 yang memanggil `normalizeText` sebelum parsing (alur `analyze`).
  - Definisi kedua `normalizeText` di `app.js` L145 (lihat point 8) — dua versi berbeda hasilnya.
  - Fitur CSV & statistik yang bergantung pada data produk.
- **Perbaikan:** pertahankan newline (mis. ganti `\s+` dengan `[ \t]+` + keep `\n`), seragamkan satu implementasi `normalizeText`. **Belum diterapkan.**

---

#### 8. [BUG 🟡] `normalizeText` didefinisikan 2 kali — PDF Merger

- **Lokasi:** `parser.js` L39 vs `app.js` L145
- **Masalah:** versi lokal di `app.js` men-shadow versi global di `parser.js` → hasil normalisasi bisa berbeda tergantung urutan/konteks pemanggilan.
- **Terhubung dengan:** point 7 (perbaiki keduanya sekaligus), alur `analyze` di `app.js`.
- **Perbaikan:** pertahankan SATU definisi (di `parser.js`), hapus versi lokal di `app.js`. **Belum diterapkan.**

---

#### 9. [BUG 🟡] `new Sortable(...)` dibuat ulang tanpa destroy — PDF Merger

- **Lokasi:** `Productive/PDF-Merger/assets/js/app.js` L36 (di dalam `renderList()`)
- **Masalah:** setiap `renderList()` membuat instance Sortable baru pada elemen `#file-list` yang sama tanpa `destroy()` → listener/observer menumpuk seiring render ulang.
- **Terhubung dengan:** `fileListEl`, `renderList()` (dipanggil di init & setelah clear), alur reorder `onEnd`.
- **Perbaikan:** simpan instance global + `destroy()` sebelum buat baru (atau buat sekali di init). **Belum diterapkan.**

---

#### 10. [BUG 🟡 / Security] Nama file masuk `innerHTML` tanpa escape — PDF Merger

- **Lokasi:** `Productive/PDF-Merger/assets/js/app.js` L33
- **Masalah:** `f.name` (nama file PDF) dimasukkan mentah ke `innerHTML` — nama file berisi `<`/`"` merusak markup baris daftar, rawan XSS.
- **Terhubung dengan:** `renderList()` (L22-48), tombol remove `✕`, Sortable handle.
- **Perbaikan:** escape HTML (`esc()` helper) sebelum innerHTML, atau pakai `textContent` + createElement. **Belum diterapkan.**

---

#### 11. [BUG 🟡] Rentang tanggal basi antar tab — Activity Tracker (tracking.html)

- **Lokasi:** `Productive/tr/tracking.html` L3803 (`beban`) & L3812 (`global`)
- **Masalah:** `selectedEndDate = selectedEndDate || selectedStartDate` **mewarisi** nilai lama dari konteks lain → rentang bisa salah/terbalik (start > end). Sama pada `runGeminiAudit()` (L3063) yang memakai `selectedEndDate` global.
- **Terhubung dengan:** `selectedStartDate`/`selectedEndDate` global, semua date-range picker tab (Input/Beban/Global), label audit AI, `applyDateRange`, `openTimePickerModal`.
- **Perbaikan:** reset `selectedEndDate` = `selectedStartDate` saat ganti konteks (jangan `||`); di `runGeminiAudit` pakai tanggal dari elemen audit-nya sendiri. **Belum diterapkan.**

---

#### 12. [BUG 🟡] Cek duplikat resi case-sensitive — Retur Tracker

- **Lokasi:** `Productive/tr-retur/retur-track.html` L608
- **Masalah:** `d.resi === resi` membedakan huruf besar/kecil → resi `SPX001` dan `spx001` dianggap dua entri beda.
- **Terhubung dengan:** `stagingData`, render staging table, badge `stagedCount`, alur submit batch (`submitBatchData`).
- **Perbaikan:** bandingkan dengan `.toUpperCase()` di kedua sisi (atau `.toLowerCase()`). **Belum diterapkan.**

---

#### 13. [MINOR] Id HTML hilang (di-guard, fitur mati) — Team Planner

- **Lokasi:** `Productive/Task/taskschedule.html` L1986 `refresh-btn` · L2198 `page-meta` · L2247 `page-title`
- **Masalah:** `getElementById` merujuk id yang tidak ada di HTML → animasi spin tombol refresh tidak aktif, baris tanggal header & judul view tidak pernah tampil. Tidak crash (di-guard), tapi fitur mati diam-diam.
- **Terhubung dengan:** elemen `refresh-btn-top` (L1503) yang ada, header tanggal, judul view Task List/Weekly/Month.
- **Perbaikan:** ubah id ke yang ada, atau tambahkan elemen dengan id tersebut. **Belum diterapkan.**

---

#### 14. [MINOR] CSS mati — PDF Merger dark-mode & class tak ada

- **Lokasi:** `Productive/PDF-Merger/PDFM_V2.html` L189 `.dropzone` (elemen ber-id `#dropzone`) · L182 `.card`/`.file-label`/`.file-item` (class tidak ada di halaman)
- **Masalah:** selector tidak cocok → styling dark-mode dropzone & beberapa class mati.
- **Terhubung dengan:** `[data-theme="dark"]` blok, elemen `#dropzone` (L211), gaya `.card`.
- **Perbaikan:** samakan selector dengan id/class aktual. **Belum diterapkan.**

---

#### 15. [MINOR] Default tema tak konsisten — Expense Tracker

- **Lokasi:** `Productive/expense-tracker/index.html` L2 `<html data-theme="light">` vs L926 (skrip tema default `'dark'`)
- **Masalah:** saat standalone tanpa `reynahub-theme`, atribut sudah `light` tapi skrip menganggap default `dark` → tema awal ambigu.
- **Terhubung dengan:** `reynahub-theme` (L935), postMessage `SET_THEME` (L927-931), block `[data-theme="dark"]`.
- **Perbaikan:** samakan default (ganti L2 ke `dark`, atau skrip baca atribut yang sudah ada). **Belum diterapkan.**

---

#### 16. [DEAD CODE] Elemen loading & variabel tak terpakai

- `Productive/expense-tracker/index.html` L270 `listLoading` & L292 `dashLoading` — ada di HTML, tidak pernah di-show/hide JS; `var totalAll` (L656) tak terpakai.
- `Productive/Task/taskschedule.html` L2743 `setTimelineZoom(px)` tak pernah dipanggil (hanya `resetTimelineZoom` L2152); L1635/1651 `event-filter-bar` & `reminder-filter-bar` dead markup.
- `Productive/latch/js/app.js` L1126 `querySelectorAll("#themeToggle svg, #themeToggleDash svg").forEach(...)` — baris no-op tanpa isi; `state.off()` (L176-179) tak pernah dipanggil; export alias `confirmDelete: confirmBulkDelete` (L1114) menyesatkan nama.
- `Productive/PDF-Merger/PDFM_V2.html` L261-297 `var ICONS` tak terpakai (app.js pakai SVG inline sendiri); `parser.js` L225 `console.log('Normalized:', ...)` debug sisa.
- `Productive/Resi-Generator/Index.html` L1063 `setBtnState` tak terpakai; `expedisi.js` L11-18 `EXPEDISI_FALLBACK` tidak pernah dikonsumsi (Index.html pakai `EMBEDDED_EXPEDISI` L902-904 — dua mekanisme fallback paralel tidak sinkron); rantai `.catch()` dobel L596-601 (catch kedua tak akan terpanggil); komentar L556-562 "logo asli di expedisi.js" tidak sinkron dengan mekanisme aktual.

---

#### 17. [GAP] Backend `.gs` tidak tersimpan di repo

- **Outbondtrack:** action `simpanDataGudang`, `getRiwayatGrouped`, `getDetailById` (Outbondtrack.html L971/1002/1040) — backend tidak ada di `gscode/` (hanya tercatat di `Productive/outbondtrack/README.md` §3.2).
- **Activity Tracker:** action `getUsersList`, `checkLogin`, `submitActivity`, `getUserActivities`, `deleteActivity`, `editActivity`, `getSPVSummary`, `getDashboardBundle`, `getYesterdayActivities`, `getDayDuration`, `exportCsv`, `exportUserCsv` — backend tidak ada di repo.
- **LATCH:** action `getData/login/addLink/updateLink/deleteLink/deleteLinks/reorderLinks/addCategory/deleteCategory/updateCategory/importCsv` — backend tidak ada di repo (ada fallback demo localStorage).
- **Risiko:** kontrak `{success, data}` vs `{success, result}` tidak bisa diverifikasi lintas sisi; perubahan sheet/kolom tidak terlacak.
- **Terhubung dengan:** semua action call frontend di file terkait + `gscode/` sebagai satu-satunya lokasi .gs terpusat (sesuai reorganisasi sebelumnya).

---

#### 18. [VERIFIKASI BERSIH ✅] — Sudah dicek, tidak ada masalah

- Semua `getElementById`/`querySelector` di analytic, outbondtrack, tr, tr-retur, expense-tracker, PDF-Merger, LATCH cocok dengan id di HTML.
- 12 action expense-tracker & 5 fungsi retur-track (`getExpeditionConfig`, `lookupExpedition`, `submitBatchData`, `getTrackingHistory`, `updateTrackingStatus`) 100% cocok dengan backend `.gs`.
- Urutan load script: tr (`config.js` → `app-core.js` → `app-features.js`) & PDF-Merger (`utils→merger→extractor→parser→app`) benar.
- Semua target di `src/core/router.js` ada (10/10 OK).
- Template string seimbang (backtick), brace CSS seimbang, id tidak ada yang duplikat.

---

### Prioritas Perbaikan (rekomendasi)

| Prioritas | Point | Effort | Risiko jika tidak diperbaiki |
|---|---|---|---|
| P0 | #1 CSS patah | ~1 menit | **Sudah diperbaiki** |
| P0 | #2 deleteTask | kecil | Data Task/Campaign hilang tak terdeteksi |
| P0 | #7 parser produk PDF | sedang | Fitur analisis produk mati total |
| P0 | #4 products.json | 1 baris | Katalog produk luar tidak terbaca |
| P1 | #3 fallback getTasks | kecil | Fallback offline mati |
| P1 | #5 Enter autocomplete | kecil | Keyboard tak bisa pilih produk |
| P1 | #6 logo tanpa guard | kecil | Preview error jika logo.js gagal |
| P1 | #11 rentang tanggal basi | kecil | Audit/range salah antar tab |
| P2 | #8 #9 #10 #12 #13 #14 #15 | kecil-sedang | Kosmetik/keamanan/kualitas |
| P3 | #16 dead code, #17 gap backend | — | Kebersihan & traceability |