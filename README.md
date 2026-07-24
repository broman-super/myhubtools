# REYNAHUB_SYS

Portal hub operasional internal berbasis web. Satu halaman, semua tools — ringan, cepat, tanpa framework runtime.

**Live:** [reynahub.web.id](https://reynahub.web.id)

---

## Arsitektur

```
index.html (SPA Shell)
├── Landing page → hero + "Akses Workspace" button
├── Sidebar navigasi (icon-based, hover-expand)
├── Hash-based routing (#/productive/analytic)
├── Bento grid dashboard dengan search bar
├── postMessage API → sinkronisasi theme ke iframe
└── iframe loader → modul tools
    ├── Productive/Task/          → Team Planner + Calendar
    ├── Productive/Analytic.html  → Dashboard analitik
    ├── Productive/latch/         → Link manager
    ├── Productive/tr/            → Activity tracker
    ├── Productive/tr-retur/      → Retur tracker
    ├── Productive/Outbondtrack.html → Package tracker
    ├── Productive/PDF-Merger/    → PDF merger + label parser
    ├── Productive/Resi-Generator/ → Resi generator
    └── Doc/form-dak.html         → Form DAK
```

Shell memuat tools via iframe. Komunikasi antar frame menggunakan `postMessage` untuk sinkronisasi theme (dark/light).

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3 (Grid, Custom Properties), JavaScript ES6+ |
| Build | Vite (dev server, esbuild minify, sourcemaps, manual chunks) |
| Backend | Google Apps Script (GAS) — serverless |
| Database | Google Sheets |
| Font | Plus Jakarta Sans (offline, self-hosted) |
| Hosting | GitHub Pages (custom domain: reynahub.web.id) |
| Linting | ESLint (strict: no-var, prefer-const, single quotes) |
| Formatting | Prettier (single quotes, trailing commas, 100 width) |
| Testing | Vitest + jsdom |

Zero runtime dependencies. Dev deps only: Vite, ESLint, Prettier, Vitest.

---

## Design System

### Font Baseline
- **HTML & Body:** Plus Jakarta Sans (200–800) — warna netral, heading typography
- **Form & Konten:** Plus Jakarta Sans — semua input, tombol, komponen form
- **Monospace:** Dilindungi untuk kode, log, receipt, catatan teknis
- **Fallback:** `'Plus Jakarta Sans', sans-serif` — diterapkan di semua halaman

### CSS Custom Properties
```css
--primary, --accent, --bg, --card
--text, --text-muted, --border
--success, --success-light
--danger, --danger-light
--warning, --warning-light
```

### Dark Mode
Semua tool mendukung dark mode via `data-theme="dark"` selector. Toggle tersedia di:
- Shell: tombol sidebar (sun/moon icon)
- Tiap tool: tombol theme toggle individu
- Sinkronisasi antar frame via `postMessage`

### Shell Architecture (`src/`)

| File | Fungsi |
|------|--------|
| `src/core/router.js` | Hash-based routing (`#/productive/analytic`) |
| `src/core/theme-manager.js` | Theme toggle + postMessage sync |
| `src/core/iframe-communicator.js` | Shell ↔ iframe communication |
| `src/components/tool-card.js` | Bento card component renderer |
| `src/app.js` | Main app initialization |
| `src/styles/tools.css` | Font baseline global + utility classes |
| `src/styles/design-system.css` | Design tokens, CSS custom properties |
| `src/styles/components.css` | Reusable UI components |
| `src/styles/utilities.css` | Utility classes |
| `src/sw.js` | Service worker (caching) |

---

## Modul Tools

### 📂 01 / PRODUCTIVE

#### Team Planner
**File:** `Productive/Task/taskschedule.html` + `code-taskschedule.gs`
**Fungsi:** Manajemen tugas, event, reminder, dan campaign dengan calendar view, timeline, dan print view.

**4 Layer Item:**

| Layer | Warna Default | Fungsi |
|-------|---------------|--------|
| Task | Biru | Tugas harian, bisa ditandai done/undone |
| Campaign | Sesuai platform | Kampanye marketing, terikat platform |
| Event | Teal `#14b8a6` | Acara dengan penyelenggara |
| Reminder | Kuning `#f59e0b` | Pengingat otomatis |

**Fitur:**
- **List View** — daftar task dengan filter status, tag, prioritas, search, pagination
- **Month View** — calendar bulanan, ribbon bar untuk task multi-hari, weekend markers (Minggu)
- **Timeline View** — view horizontal per hari, zoom level (0–2), adjustable label width (140–260px)
- **Day Detail** — klik tanggal di timeline → expand detail panel dengan task + reminder
- **Print View** — versi cetak timeline dan calendar (optimized untuk A4/Landscape)
- **CRUD Modal** — create, edit, duplicate, delete semua jenis item
- **Campaign Platform System** — pilih platform → warna + prefix otomatis:
  - Instagram (`IG |`, ungu `#a855f7`)
  - Whatsapp (`WA |`, hijau `#22c55e`)
  - Tiktok (`TT |`, pink `#ec4899`)
  - Shopee/Tokopedia (`SP |`, oranye `#f97316`)
  - Web (`WEB |`, biru `#3b82f6`)
  - Event (`EVT |`, cyan `#06b6d4`)
- **Repeat/Ulangi** — auto-generate task berulang (harian/mingguan/bulanan)
- **Multi-day Span** — task bisa punya tanggal mulai + selesai, ditampilkan sebagai bar memanjang
- **Undo/Redo** — historkri action (Ctrl+Z / Ctrl+Y)
- **Cache TTL 5 menit** — data dari GAS di-cache di localStorage
- **Holiday Cache** — fallback static jika internet mati
- **Double-click Prevention** — `S.saving` flag mencegah save berulang

**GAS Backend (`code-taskschedule.gs`):**

| Action | Fungsi |
|--------|--------|
| `getCalendarData` | Ambil semua data dari sheet Tasks, Events, Reminders |
| `saveCalendarItem` / `saveTask` | Simpan/update item ke sheet yang sesuai tipe |
| `deleteCalendarItem` / `deleteTask` | Hapus item berdasarkan ID dan tipe |

Mapping tipe ke sheet:
- `task` / `campaign` → Sheet **Tasks**
- `event` → Sheet **Events**
- `reminder` → Sheet **Reminders`

---

#### SAS Analytic Dashboard
**File:** `Productive/Analytic.html`
**Judul:** SAS — Sales Analytic Simplify (Bento Edition)

**Dependencies:** Chart.js, Chart.js Datalabels, Chart.js Zoom (Hammer.js), Marked.js, jQuery, Moment.js, Daterangepicker, DataTables, SheetJS (xlsx)

**Fitur:**
- **KPI Cards** — total penjualan, profit, transaksi, rata-rata per transaksi
- **Chart Tren Penjualan** — line chart dengan zoom + pan (Chart.js Zoom plugin)
- **Chart Margin Profit** — bar chart profit vs revenue
- **Chart per Kategori** — donut/pie chart pembagian kategori
- **Chart per Hari** — bar chart rekap harian
- **DataTables** — tabel produk interaktif dengan sorting, search, pagination
- **Date Range Picker** — filter periode (harian, mingguan, bulanan, custom range)
- **Compare Mode** — bandingkan 2 periode (vs kemarin, vs minggu lalu, vs bulan lalu)
- **Import Excel** — upload file Excel (.xlsx) dengan drag & drop, auto-detect mapping kolom, preview sebelum upload, bulk upsert ke GAS
- **Upload Modal** — 3-step wizard: Upload → Mapping → Preview → Kirim ke GAS
- **Target & Expense** — input target penjualan dan biaya operasional, simpan ke GAS
- **AI Diagnostics** — integrasi Gemini API untuk analisis otomatis (opsional)
- **Dark Mode** — toggle theme light/dark
- **Responsive** — layout bento grid adaptif

**GAS Integration:** `syncDashboardData()` → fetch data dari GAS, `saveTargetToGAS()`, `saveExpenseToGAS()`, `sendExcelToGAS()` untuk import bulk.

---

#### Activity Tracker
**File:** `Productive/tr/tracking.html`
**Judul:** SUPERSUB Ops — Tracker

**Dependencies:** Tailwind CSS (via CDN), GAS backend

**Fitur:**
- **Login System** — autentikasi user berbasis nama + password via GAS
- **3 Tab Utama:**
  1. **Input Activity** — form pencatatan aktivitas harian:
     - Bidang Tugas / Divisi (Manajemen, HRD, Operasional, Marketing, CS, Gudang, Luar Divisi)
     - Kategori pekerjaan + deskripsi
     - Tipe pekerjaan (Internal/External)
     - Beban kerja (Ringan/Sedang/Berat)
     - Durasi (jam:menit)
     - Output deskripsi
     - Validasi tanggal (hanya hari ini yang bisa diinput)
  2. **Beban Kerja Tim** (Supervisor only) — visualisasi beban kerja seluruh tim:
     - KPI cards: Total Jam, Tugas Selesai, Rata-rata/Jam, Warning Beban
     - Timeline grid per user (horizontal bar chart)
     - Detail divisi breakdown
     - Filter tanggal
     - Export CSV
  3. **Audit AI** (Supervisor only) — audit aktivitas dengan AI:
     - **Analytics Sub-tab:** Harian Divisi, Overlap Detection, Role Misalign Detection
     - **System Audit Sub-tab:** Log audit system (otomatis terisi saat periode dipilih)
     - **Gemini AI Auditor:** Input API key Gemini → kirim data aktivitas → dapat ringkasan eksekutif + saran strategis
     - **Heuristic Report:** Jika Gemini gagal, generate laporan heuristik lokal
     - Export CSV periode
- **Personal History** — riwayat aktivitas pribadi dengan filter tanggal
- **Unified Date Picker** — satu picker tanggal untuk semua tab
- **Toast Notification** — notifikasi sukses/error
- **Delete/Edit Modal** — edit atau hapus aktivitas yang sudah diinput
- **Responsive** — bento grid layout

**GAS Backend:** `gasFetch()` → POST ke GAS endpoint dengan action: `login`, `submitActivity`, `getDashboardBundle`, `getHistory`, `deleteActivity`, `editActivity`.

---

#### Retur Tracker
**File:** `Productive/tr-retur/retur-track.html` + `code-retur-track.gs`
**Fungsi:** Pencatatan dan pelacakan barang retur.

**Fitur:**
- **Scan Input** — scan resi barcode/QR untuk input cepat
- **Auto-detect Ekspedisi** — regex matching nomor resi ke ekspedisi (JNE, J&T, Shopee, Tokopedia, dll)
- **Staging Table** — tabel sementara sebelum push ke database:
  - Edit ekspedisi per baris
  - Hapus baris
  - Search/filter resi
- **History Panel** — riwayat retur dengan filter:
  - Semua / Hari Ini / 7 Hari / 1 Bulan
  - Search nomor resi
  - Link ke Google Sheets database
- **Copy Resi** — tombol copy nomor resi ke clipboard
- **Push to Database** — push semua data staging ke GAS sekaligus
- **Cache Lokal** — cegah scan duplikat dalam session yang sama
- **Dark Mode** — toggle theme

**GAS Backend:** `processScan`, `pushToDatabase`, `loadHistory`, `getDetailById`

---

#### LATCH Web Link
**File:** `Productive/latch/latch.html` + `css/style.css` + `js/app.js`
**Fungsi:** Pusat penyimpanan dan kurasi tautan/link eksternal penting.

**Fitur:**
- **Link Collection** — kumpulan tautan terorganisir
- **Categorization** — kategori untuk pengelompokan link
- **Search** — pencarian link
- **Dark Mode** — toggle theme

---

#### Package Tracker (Outbondtrack)
**File:** `Productive/Outbondtrack.html`
**Fungsi:** Pendataan paket masuk/keluar dengan scanning barcode/QR code.

**Fitur:**
- **Scan Frame** — area scanning barcode/QR dengan input autofocus
- **Auto-detect Ekspedisi** — regex matching nomor resi:
  - JNE, J&T, J&T Cargo, Shopee, Tokopedia, Pos, Baraka, dll
- **Live Counter** — hitung paket per ekspedisi secara real-time
- **Detail Panel** — expand detail per kurir dengan search
- **Riwayat** — log semua sesi scan sebelumnya:
  - Group by sesi (waktu scan)
  - Detail per sesi
  - Search resi/ekspedisi
- **Print Options:**
  - Cetak Detail A3 — cetak detail paket per kurir di kertas A3
  - Cetak Thermal — cetak label ringkas di kertas thermal
- **Save & Reset** — simpan sesi scan ke GAS, reset untuk sesi baru
- **Custom Alert/Confirm** — modal konfirmasi kustom
- **Dark Mode** — toggle theme

**GAS Backend:** `simpanDataGudang`, `getRiwayatGrouped`, `getDetailById`

---

#### PDF Merger
**File:** `Productive/PDF-Merger/PDFM_V2.html` + `assets/js/` (app.js, merger.js, extractor.js, parser.js, utils.js)
**Fungsi:** Penyatu berkas resi terpisah ke satu dokumen PDF tanpa merusak resolusi barcode/QR.

**Dependencies:** pdf-lib (via CDN), pdfjs-dist (via CDN)

**Fitur:**
- **Drag & Drop Upload** — dropzone untuk upload multiple PDF files
- **Merge All** — gabungkan semua file PDF menjadi satu
- **Merge per Kurir** — gabungkan PDF berdasarkan ekspedisi (auto-detect)
- **Label Parsing** — ekstrak teks dari PDF resi:
  - Auto-detect platform (Shopee, TikTok, dll)
  - Extract: nomor resi, kurir, layanan, penerima, pengirim, no pesanan, produk
  - Parse produk (nama, SKU, variasi, qty)
- **CSV Export** — download data hasil parse sebagai CSV
- **Duplicate Detection** — tandai file duplikat
- **File Management** — reorder, remove file sebelum merge
- **Theme Toggle** — light/dark mode

**Arsitektur Modular:**
```
assets/js/
├── app.js          → Main logic, dropzone, UI
├── merger.js       → PDF merge menggunakan pdf-lib
├── extractor.js    → Text extraction dari PDF per halaman
├── parser.js       → Parse label data (Shopee, TikTok, etc)
└── utils.js        → Utility functions (download, CSV, status)
```

---

#### Resi Generator
**File:** `Productive/Resi-Generator/Index.html` + `expedisi.js` + `logo.js` + `products.json`
**Fungsi:** Pembuat nomor dan label resi otomatis terhubung dengan sistem logistik.

**Fitur:**
- **Multi-Expediton** — support 6+ ekspedisi:
  - JNE, POS, J&T, J&T Cargo, Baraka, Ojol (GoSend/GrabExpress)
  - Logo ekspedisi otomatis muncul di resi
- **Form Lengkap:**
  - Pengirim: nama, HP, alamat
  - Penerima: nama, HP, alamat
  - Detail: berat (kg), COD/nontunai
  - Produk: autocomplete dari database (`products.json`)
- **Product Database** — autocomplete produk dari JSON:
  - Search by nama/SKU
  - Auto-fill variasi
  - Multi-produk (tambah/hapus baris)
- **Quick Fill** — data pengirim tersimpan di localStorage, auto-restore
- **Preview** — preview resi sebelum cetak
- **Print** — cetak langsung via `window.print()`
- **Footer Otomatis** — footer dicetak di setiap halaman
- **Dark Mode** — toggle theme
- **Form State Persistence** — form tersimpan di localStorage

---

### 📂 02 / UNIVERSAL TOOLS

#### Form Pengajuan DAK
**File:** `Doc/form-dak.html`
**Fungsi:** Generator dokumen formulir untuk program Dana Amanah Karyawan (DAK).

**Fitur:**
- **2 Jenis Formulir:**
  1. **Qardh** — pinjaman tanpa margin (interest-free)
  2. **Murabahah** — pinjaman dengan margin barang
- **Auto Calculation:**
  - Qardh: cicilan = nominal / tenor
  - Murabahah: margin = (harga jual - harga beli), total = harga jual + margin, cicilan = total / tenor
- **Format Rupiah** — auto-format angka dengan pemisah ribuan
- **Phone Format** — auto-format nomor HP (08xx-xxxx-xxxx)
- **Photo Upload** — upload foto KTP/pegawai dengan preview
- **Print** — cetak formulir via `window.print()`
- **Validation** — validasi field wajib sebelum cetak
- **Dark Mode** — toggle theme

---

## Pengembangan

```bash
# Install dev dependencies
npm install

# Jalankan dev server (port 3000, COOP/COEP headers)
npm run dev

# Lint
npm run lint

# Format
npx prettier --write .

# Test
npm run test
```

### Konfigurasi

| File | Fungsi |
|------|--------|
| `vite.config.js` | Build config, dev server (port 3000), chunk splitting, path aliases (`@`, `@core`, `@components`, `@styles`, `@assets`) |
| `.eslintrc.json` | Lint rules (strict: no-var, prefer-const, single quotes, 2-space indent) |
| `.prettierrc` | Format (single quotes, trailing commas, 100 width, LF endings) |
| `vitest.config.js` | Test runner config |
| `package.json` | `reynahub-sys` v2.0.0, zero runtime deps |

### Deploy

- **Frontend:** Push ke `main` → GitHub Pages auto-deploy. Custom domain: `reynahub.web.id` (via `CNAME`).
- **GAS Backend:** Deploy manual dari Google Apps Script editor. URL deployment ada di file `taskschedule.html` (variabel `GAS_URL`) dan `tracking.html`.

---

## Struktur File

```
myhubtools/
├── index.html                     # SPA shell (landing + workspace + sidebar)
├── CNAME                          # reynahub.web.id
├── src/
│   ├── app.js                     # Main app initialization
│   ├── sw.js                      # Service worker
│   ├── core/
│   │   ├── router.js              # Hash-based routing
│   │   ├── theme-manager.js       # Theme toggle + postMessage sync
│   │   └── iframe-communicator.js # Shell ↔ iframe communication
│   ├── components/
│   │   └── tool-card.js           # Bento card component
│   ├── styles/
│   │   ├── tools.css              # Font baseline global + utilities
│   │   ├── design-system.css      # Design tokens, CSS custom properties
│   │   ├── components.css         # Reusable UI components
│   │   └── utilities.css          # Utility classes
│   ├── assets/                    # Static assets
│   └── tests/                     # Vitest tests
├── Productive/
│   ├── Task/
│   │   ├── taskschedule.html      # Team Planner frontend (~3900 baris)
│   │   └── code-taskschedule.gs   # GAS backend
│   ├── tr/
│   │   ├── tracking.html          # Activity Tracker (~4400 baris)
│   │   └── assets/
│   │       ├── app-core.js        # Core logic
│   │       ├── app-features.js    # Feature modules
│   │       └── config.js          # Configuration
│   ├── tr-retur/
│   │   ├── retur-track.html       # Retur Tracker
│   │   ├── Kode GS.txt            # GAS backup (text)
│   │   └── code-retur-track.gs    # GAS backend
│   ├── latch/
│   │   ├── latch.html             # Link Manager
│   │   ├── css/style.css
│   │   └── js/app.js
│   ├── PDF-Merger/
│   │   ├── PDFM_V2.html           # PDF Merger frontend
│   │   └── assets/js/
│   │       ├── app.js             # Main logic, dropzone, UI
│   │       ├── merger.js          # PDF merge (pdf-lib)
│   │       ├── extractor.js       # Text extraction (pdfjs-dist)
│   │       ├── parser.js          # Label parser (Shopee, TikTok)
│   │       └── utils.js           # Utilities (download, CSV)
│   ├── Resi-Generator/
│   │   ├── Index.html             # Resi Generator frontend
│   │   ├── expedisi.js            # Ekspedisi config + logos
│   │   ├── logo.js                # Company logo (base64)
│   │   ├── products.json          # Product database
│   │   └── Logo/                  # Logo ekspedisi (JNE, J&T, etc)
│   ├── Analytic.html              # SAS Analytic Dashboard (~3900 baris)
│   └── Outbondtrack.html          # Package Tracker
├── Doc/
│   └── form-dak.html              # Form DAK generator
├── package.json
├── vite.config.js
├── vitest.config.js
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── Update_Plan.md                 # Development roadmap (5 phases)
└── README.md                      # Dokumentasi ini
```

---

## Update Plan (Riwayat Pengembangan)

| Phase | Deskripsi | Status |
|-------|-----------|--------|
| Phase 1 | CSS & Variable Fixes (tutup `}`, rename `--primary`) | ✅ |
| Phase 2 | Cache TTL 5 menit + Holiday fallback static | ✅ |
| Phase 3 | GAS Backend baru: Events + Reminders sheets | ✅ |
| Phase 4 | Frontend: Radio button tipe + field dinamis | ✅ |
| Phase 5 | Multi-layer calendar: checkbox toolbar + rendering | ✅ |
| Campaign Platform | Platform/Channel dropdown + auto color/prefix | ✅ |
| Double-click Prevention | `S.saving` flag di `submitTask()` | ✅ |

---

## Lisensi

Internal use — REYNAHUB_SYS.
