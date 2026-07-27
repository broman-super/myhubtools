# Product Requirements Document — REYNAHUB_SYS

**Version:** 3.0 (Minimalist Edition)
**Date:** 2026-07-27
**Author:** REYNAHUB Development Team
**Status:** Draft

---

## 1. Overview

REYNAHUB_SYS is an internal operational workspace portal — a single-page shell application that hosts multiple lightweight web tools, each running in its own isolated iframe. The system is designed to be fast, minimal, and free of heavy framework runtimes. Every tool is a standalone HTML file with its own CSS and JavaScript, communicating with the hub via `postMessage`. Data persists in Google Sheets via Google Apps Script (GAS) web app endpoints — with localStorage serving as a fallback demo mode.

### Goals
- One-click access to all internal tools from a unified hub
- Consistent design language across all embedded tools
- Dark/light theme synchronization across iframe boundaries
- Zero runtime dependencies in the browser (pure vanilla HTML/CSS/JS)
- Google Sheets as the universal database backend
- No build step required at runtime (Vite used only for development)

---

## 2. Target Users

Internal team members of the organization using REYNAHUB_SYS for:
- Task and campaign coordination
- Sales performance analytics
- Link/resource management (LATCH)
- Package and return tracking
- PDF document merging and label parsing
- Invoice/receipt generation
- Daily activity logging
- Expense management (planned)

---

## 3. Installed Modules

### 3.1 Productive Group

#### Team Planner (`Productive/Task/taskschedule.html`)
**Purpose:** Daily task management, campaign scheduling, event tracking, and reminder management.

**4 Item Types:**
| Type | Color | Purpose |
|------|-------|---------|
| Task | Blue `#6366f1` | Daily tasks with done/undone toggle |
| Campaign | Platform-dependent | Marketing campaigns tied to platforms (IG, WA, TT, SP, WB, EVT) |
| Event | Teal `#14b8a6` | Events with organizer |
| Reminder | Amber `#f59e0b` | Auto-triggered reminders |

**Views:**
- **List View** — Filterable, searchable task list with pagination
- **Month View** — Calendar grid with colored dots per campaign, ribbon bars for multi-day tasks, weekend markers (Minggu)
- **Timeline View** — Horizontal per-day view with zoom levels (0–2×)
- **Day Detail** — Click date to expand panel with all items for that day
- **Print View** — A4 landscape optimized, two-page spread (calendar + list)

**Features (implemented):**
- CRUD operations (create, edit, duplicate, delete)
- Campaign platform selector (auto color/prefix: IG 🟣 WA 🟢 TT 🔘 SP 🟠 WB 🔵 EVT 🩵)
- Repeat/recurring tasks (daily/weekly/monthly)
- Multi-day span with ribbon visualization
- Undo/Redo history (Ctrl+Z / Ctrl+Y)
- Double-click prevention via `S.saving` flag
- 5-minute client-side cache TTL
- Holiday fallback cache for offline use
- Data normalization (GAS raw fields → frontend fields) with empty string fallbacks

**Features (planned/improved, 2026-07):**
- Print view campaign grouping by title + description
- Color-group number system for calendar grid dots
- Grid dots are plain colored circles (no shape characters)

**Backend (`code-taskschedule.gs`):**
- Sheets: `Tasks`, `Events`, `Reminders`
- Functions: `getCalendarData`, `saveCalendarItem`, `deleteCalendarItem`
- ID column is case-insensitive for column lookup

---

#### SAS Analytic Dashboard (`Productive/Analytic.html`)
**Purpose:** Sales performance analysis with interactive charts, importable Excel data, and target/expense tracking.

**Features:**
- KPI cards (total sales, profit, transactions, avg per transaction)
- Line chart with zoom + pan (Chart.js Zoom plugin)
- Bar chart for profit vs revenue
- Donut/pie chart for category breakdown
- Daily recap bar chart
- Interactive DataTables (sorting, search, pagination)
- Date range picker (daily/weekly/monthly/custom)
- Compare mode (vs yesterday, vs last week, vs last month)
- Excel import: drag & drop, auto column mapping, preview before import, bulk upsert to GAS
- 3-step upload wizard: Upload → Mapping → Preview → Send to GAS
- Target & expense input/ tracking
- AI diagnostics via Gemini API (optional)
- Dark mode toggle
- Responsive bento grid layout

**Backend:** GAS integration for `syncDashboardData()`, `saveTargetToGAS()`, `saveExpenseToGAS()`, `sendExcelToGAS()`

---

#### LATCH Link Manager (`Productive/latch/latch.html`)
**Purpose:** Curated collection and management of important external links.

**Features:**
- CRUD for external links with categorization
- Search and filter
- Dark mode toggle
- GAS backend with localStorage fallback demo mode

**File Structure:**
```
Productive/latch/
  ├── latch.html
  ├── css/style.css
  └── js/app.js
```

**Backend:** GAS Web App (URL configured in `Productive/latch/js/app.js`, not stored here)
- localStorage mode when `API_URL` is empty

**Bug fixed (2026-07-25):** API_URL was an empty placeholder; updated to the real GAS web app URL.

---

### 3.2 Universal Tools Group

#### Activity Tracker (`Productive/tr/tracking.html`)
**Purpose:** Daily activity logging and team workload monitoring.

**Features:**
- User authentication via GAS (name + password)
- 3 tabs: Input Activity, Workload (supervisor), AI Audit (supervisor)
- Activity input: divisi, category, work type (internal/external), workload level, duration, output
- Supervisor workload dashboard with KPI cards and timeline grid
- AI audit via Gemini API (heuristic fallback)
- Personal activity history
- Date picker, toast notifications, delete/edit modals
- Dark mode toggle

---

#### Retur Tracker (`Productive/tr-retur/retur-track.html`)
**Purpose:** Return/logistics tracking with auto-detect shipping carrier.

**Features:**
- Barcode/QR resi scanning input
- Auto-detect carrier (JNE, J&T, Shopee, Tokopedia, etc.) via regex
- Staging table (temporary before push to database)
- History panel with filters (today, 7 days, 1 month)
- Copy resi to clipboard
- Bulk push to GAS
- Duplicate detection in session
- Dark mode toggle

**Backend:** `code-retur-track.gs` — functions: `processScan`, `pushToDatabase`, `loadHistory`, `getDetailById`

---

#### Package Tracker (`Productive/Outbondtrack.html`)
**Purpose:** Package receiving/sending with scan logging.

**Features:**
- Scan frame with autofocus input
- Auto-detect carrier (JNE, J&T, J&T Cargo, Shopee, Tokopedia, Pos, Baraka, etc.)
- Live counter per carrier
- Detail panel per courier with search
- Scan history grouped by session
- Print options: A3 detail, thermal label
- Save session to GAS, reset for new session
- Custom confirmation dialogs
- Dark mode toggle

---

#### PDF Merger (`Productive/PDF-Merger/PDFM_V2.html`)
**Purpose:** Combine multiple PDFs and extract label data from shipping receipts.

**Features:**
- Drag & drop multi-PDF upload
- Merge all or per-carrier
- Label parsing: auto-detect platform (Shopee, TikTok), extract resi, courier, service, sender, recipient, order number, products
- CSV export of parsed data
- Duplicate file detection
- File management (reorder, remove)
- Theme toggle

**Dependencies (CDN):** pdf-lib, pdfjs-dist

---

#### Resi Generator (`Productive/Resi-Generator/Index.html`)
**Purpose:** Auto-generate shipping labels/resi numbers.

**Features:**
- 6+ carriers: JNE, POS, J&T, J&T Cargo, Baraka, Ojol (GoSend/GrabExpress)
- Full form: sender (name, HP, address), recipient (name, HP, address), weight, COD, products
- Product database autocomplete from `products.json` (search by name/SKU, auto-fill variant, multi-product support)
- Quick fill from localStorage
- Print preview and direct print via `window.print()`
- Auto footer on every printed page
- Dark mode toggle
- Form state persistence in localStorage

**Dependencies:** Carrier logos in `Logo/` directory

---

#### Form DAK (`Doc/form-dak.html`)
**Purpose:** Generate DAK (Dana Amanah Karyawan) application documents.

**Features:**
- Two form types: Qardh (interest-free loan), Murabahah (profit margin)
- Auto-calculation of installments, margin, total
- Auto-format Rupiah and phone number
- Photo upload with preview
- Print directly via `window.print()`
- Required-field validation
- Dark mode toggle

---

### 3.3 Planned Modules

#### Expense Tracker (planned)
**Purpose:** Expense request submission, manager approval, actualization tracking, reimbursement processing.

See Section 6 (Expense Tracker Requirements) for full specification.

---

## 4. Expense Tracker Requirements (Planned)

See `Update_Plan.md` for the full Expense Tracker spec. Summary:

### Status Flow
```
Draft → Pengajuan → { Disetujui | Ditolak } → Realisasi → { Reimburse → Selesai | Batal }
```

### Form Fields
| Field | Type | Required |
|-------|------|----------|
| Tanggal | Date picker | ✅ |
| Kategori | Select enum | ✅ |
| Deskripsi | Textarea | ✅ |
| Jumlah | Number (Rupiah) | ✅ |
| Bukti Kuitansi | File upload (image/pdf) | ❌ optional |
| Pengaju | Auto from session | ✅ |

### Spreadsheet Schema (`Expenses` sheet)
| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Auto-generated, unique per date |
| `tanggal` | date string | YYYY-MM-DD |
| `kategori` | string | Enum: transport/makan/komunikasi/ppn/hotel/lainnya |
| `deskripsi` | string | Detail |
| `jumlah` | integer | Rupiah without decimal |
| `buktiNama` | string | Filename |
| `buktiUrl` | string | URL or `-` |
| `pengaju` | string | Submitting user |
| `status` | string | Enum: draft/pengajuan/disetujui/ditolak/realisasi/selesai/batal |
| `approvedBy` | string | Approver username |
| `tanggalApproved` | datetime | When approved |
| `statusRealisasi` | string | `-`/`lunas`/`belum_lunas` |
| `tanggalUpdate` | datetime | Last modified timestamp |

### GAS Functions Required
- `submitExpense(data)` — insert new row
- `getExpenses(filter)` — query with filters
- `getExpenseById(id)` — single row detail
- `approveExpense(id, approver)` — approve
- `rejectExpense(id, reason)` — reject
- `markRealisasi(id, lunas)` — record actualization
- `markReimburse(id)` — mark reimbursed
- `cancelExpense(id)` — cancel
- `deleteExpense(id)` — delete (draft only)
- `getExpenseSummary(periode)` — dashboard summary
- `getExpenseCountByStatus(periode)` — notification counts

---

## 5. System Constraints

- **Browser:** Modern browsers (Chrome, Firefox, Edge) — `file://` protocol supported, `http://` recommended for dev
- **Backend:** Google Apps Script as Web App, deployed with access set to "Anyone" (or org-specific)
- **Database:** Google Sheets, one sheet per data domain
- **Font:** Plus Jakarta Sans, self-hosted via `src/styles/`
- **No runtime framework:** No React, Vue, Angular, or jQuery in production
- **Build:** Vite for dev server and production build; GAS is deployed manually
- **Mobile:** Responsive with bento grid, touch-friendly 44px+ tap targets
- **Accessibility:** keyboard-navigable, ARIA labels, semantic HTML5
- **Theme:** CSS custom properties with `data-theme` attribute, `prefers-color-scheme` media query support, postMessage cross-frame sync

---

## 6. Design Decisions

1. **iframe isolation:** Each tool has its own CSS/JS context, preventing style and JS collisions. The shell is responsible for theme sync and navigation.
2. **Hash-based routing:** No server required, works with static file hosting (GitHub Pages, `file://`).
3. **GAS as backend:** Google Sheets serves as both database and API (via GAS Web App), eliminating the need for a separate server.
4. **localStorage fallback:** Tools work in demo/offline mode with no backend, useful for development and testing.
5. **postMessage for theme:** Theme changes in the shell propagate to all iframes without coupling.
6. **Plain object data:** No ORM, no schema validation library — GAS functions return plain JS objects and the frontend manipulates them directly.
7. **No build step at runtime:** Source files serve directly (no transpilation, no bundling in production for most tools). Vite is only for dev experience.

---

## 7. Success Metrics

- All tools load and function without framework runtime errors
- Print views produce readable A4 landscape output
- Dark/light mode syncs across shell and all iframes (no flash of wrong theme)
- LATCH and all GAS-dependent tools have working backend URLs
- Expense Tracker: full cycle (submit → approve → realisasi → reimburse) takes <2 minutes per request
- Mobile: all core workflows usable on screens ≥320px wide
