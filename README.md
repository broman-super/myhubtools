# REYNAHUB_SYS

Portal hub operasional internal berbasis web. Satu halaman, semua tools ringan, cepat, tanpa framework runtime.

**Live:** [reynahub.web.id](https://reynahub.web.id)

---

## Arsitektur

```
index.html          SPA Shell (landing + workspace + sidebar + iframe router)
  ├── src/
  │   ├── core/router.js              Hash-based routing (#/productive/planner)
  │   ├── core/theme-manager.js       Theme toggle + postMessage sync
  │   ├── components/tool-card.js     Bento card renderer
  │   ├── app.js                      Main app init
  │   └── styles/                     CSS (tools.css, design-system.css, components.css)
  ├── Productive/
  │   ├── Task/taskschedule.html      Team Planner + Calendar + Timeline + Print
  │   ├── analytic/Analytic.html      SAS Analytic Dashboard
  │   ├── latch/latch.html            LATCH Link Manager
  │   │   ├── css/style.css
  │   │   └── js/app.js              (GAS backend: https://script.google.com/macros/s/AKfycbwHxK9RHMPXuqlOmucA0GyHwzc33A6WsGeUAD0iwtaGVBSihAQaUeyg_Q7UUn7cULnp/exec)
  │   ├── outbondtrack/Outbondtrack.html  Package Tracker (logistics scan)
  │   ├── tr/tracking.html            Activity Tracker
  │   ├── tr-retur/retur-track.html   Retur Tracker
  │   ├── PDF-Merger/PDFM_V2.html     PDF Merger + Label Parser
  │   └── Resi-Generator/Index.html   Resi Generator
  ├── Doc/form-dak.html              Form Pengajuan DAK
  ├── gscode/                        GAS backend (code-*.gs)
  └── package.json                     Vite, ESLint, Prettier, Vitest (dev deps only)
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
| Font | Plus Jakarta Sans (offline, self-hosted via `src/styles/`) |
| Hosting | GitHub Pages (custom domain: reynahub.web.id) |
| Linting | ESLint (strict: no-var, prefer-const, single quotes) |
| Formatting | Prettier (single quotes, trailing commas, 100 width) |
| Testing | Vitest + jsdom (minimal) |

Zero runtime dependencies. Dev deps only: Vite, ESLint, Prettier, Vitest.

---

## Design System

### Font Baseline
- **HTML & Body:** Plus Jakarta Sans (200–800) — warna netral, heading typography
- **Form & Konten:** Plus Jakarta Sans — semua input, tombol, komponen form
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

---

## Modul Tools

### 01 / PRODUCTIVE

#### Team Planner (`Productive/Task/taskschedule.html`)
Manajemen tugas, event, reminder, dan campaign dengan calendar view, timeline, dan print view.

**4 Layer Item:**

| Layer | Warna Default | Fungsi |
|-------|---------------|--------|
| Task | Biru `#6366f1` | Tugas harian, bisa ditandai done/undone |
| Campaign | Sesuai platform | Kampanye marketing, terikat platform |
| Event | Teal `#14b8a6` | Acara dengan penyelenggara |
| Reminder | Kuning `#f59e0b` | Pengingat otomatis |

**Fitur:**
- **List View** — daftar task dengan filter status, tag, prioritas, search, pagination
- **Month View** — calendar bulanan dengan dot warna (satu dot per campaign per hari), ribbon bar untuk task multi-hari, weekend markers
- **Timeline View** — view horizontal per hari, zoom level, adjustable label width
- **Day Detail** — klik tanggal di timeline → expand detail panel
- **Print View** — versi cetak A4 landscape dengan two-page layout (calendar + list)
- **CRUD Modal** — create, edit, duplicate, delete semua jenis item
- **Campaign Platform System** — pilih platform → warna + prefix otomatis (IG, WA, TT, SP, WB, EVT)
- **Repeat/Ulangi** — auto-generate task berulang (harian/mingguan/bulan)
- **Multi-day Span** — task dengan tanggal mulai + selesai sebagai bar memanjang
- **Undo/Redo** — history action (Ctrl+Z / Ctrl+Y)
- **Data Normalization** — semua field frontend dinormalisasi (nama→title, mulai→date, selesai→enddate) + fallback kosong agar tidak undefined

**GAS Backend (`code-taskschedule.gs`):**

| Action | Fungsi |
|--------|--------|
| `getCalendarData` | Ambil semua data dari sheet Tasks, Events, Reminders |
| `saveCalendarItem` | Insert/update item ke sheet sesuai tipe |
| `deleteCalendarItem` | Hapus item berdasarkan ID dan tipe |

---

#### SAS Analytic Dashboard (`Productive/analytic/Analytic.html`)
**Judul:** SAS — Sales Analytic Simplify (Bento Edition)

Dashboard analitik penjualan dengan chart interaktif, import Excel, target & expense tracking.

**Fitur:**
- KPI Cards (total penjualan, profit, transaksi, rata-rata per transaksi)
- Line chart tren penjualan (zoom + pan via Chart.js)
- Bar chart margin profit, donut per kategori, bar rekap harian
- DataTables interaktif dengan sorting, search, pagination
- Date Range Picker (harian/mingguan/bulanan/custom)
- Compare Mode (bandingkan 2 periode)
- Import Excel (.xlsx) drag & drop, auto-detect mapping kolom, preview → kirim ke GAS
- Target & Expense tracking
- Dark mode toggle

---

#### LATCH Web Link (`Productive/latch/latch.html`)
**Judul:** LATCH — Link Attach

Portal pengumpul dan manajemen tautan/link penting.

**Fitur:**
- CRUD link (tambah, edit, hapus) dengan kategorisasi
- Search & filter
- Dark mode toggle
- **Backend:** GAS Web App (deploy) + localStorage fallback demo mode
- **GAS URL:** `https://script.google.com/macros/s/AKfycbwHxK9RHMPXuqlOmucA0GyHwzc33A6WsGeUAD0iwtaGVBSihAQaUeyg_Q7UUn7cULnp/exec`

---

#### Activity Tracker (`Productive/tr/tracking.html`)
**Judul:** SUPERSUB Ops — Tracker

Pencatatan aktivitas harian dan pemantauan beban kerja tim.

**Fitur:**
- Login system (autentikasi nama + password via GAS)
- 3 tab utama: Input Activity, Beban Kerja Tim (supervisor), Audit AI (supervisor)
- Personal history dengan filter tanggal
- Unified date picker
- Toast notification, delete/edit modal
- Dark mode toggle

---

#### Retur Tracker (`Productive/tr-retur/retur-track.html`)
Pencatatan dan pelacakan barang retur dengan auto-detect ekspedisi dan staging table.

---

#### Package Tracker (`Productive/outbondtrack/Outbondtrack.html`)
Pendataan paket masuk/keluar dengan scanning barcode/QR code, live counter, dan print options (A3 detail, thermal label).

---

#### PDF Merger (`Productive/PDF-Merger/PDFM_V2.html`)
Penyatuan berkas PDF + ekstraksi label resi (Shopee, TikTok, dll) dengan parse produk dan CSV export.

---

#### Resi Generator (`Productive/Resi-Generator/Index.html`)
Generator nomor dan label resi otomatis, multi-ekspedisi (JNE, POS, J&T, J&T Cargo, Baraka, Ojol), logo otomatis, preview cetak.

---

### 02 / UNIVERSAL TOOLS

#### Form Pengajuan DAK (`Doc/form-dak.html`)
Generator formulir untuk program Dana Amanah Karyawan (DAK) dengan perhitungan Qardh dan Murabahah, auto-format Rupiah & HP, foto upload, dan print langsung.

---

## Pengembangan

```bash
npm install      # Install dev dependencies
npm run dev      # Dev server (port 3000)
npm run lint     # ESLint
npm run format   # Prettier
npm run test     # Vitest
```

### Deploy

- **Frontend:** Push ke `main` → GitHub Pages auto-deploy. Custom domain: `reynahub.web.id`.
- **GAS Backend:** Deploy manual dari Google Apps Script editor. URL deployment ada di file masing-masing tool (taskschedule.html, latch/js/app.js, tracking.html, dst.)

---

## Lisensi

Internal use — REYNAHUB_SYS.