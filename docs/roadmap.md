# Roadmap — REYNAHUB_SYS

**Updated:** 2026-07-27

---

## 1. Status Legend

| Icon | Status |
|------|--------|
| ✅ | Selesai |
| 🔄 | Sedang Dikerjakan |
| 📋 | Direncanakan |
| ⏸️ | Ditahan / Ditunda |

---

## 2. Completed Work (2026-07)

### Print View Improvements (Team Planner)
- Campaign grouping by title + description in list view
- Sorted dates ascending
- Color-group number system: multi-item color groups get sequential numbers, single-item colors show plain dot only
- Numbers synchronized between grid dots and list descriptions
- Grid dots simplified to plain colored circles (no shape characters)
- Bento flex-wrap grid for print calendar
- Two-page split print layout (calendar + list)
- Description area: background #f1f5f9, border-radius 4px, padding 4px 8px, margin 6px

### Bug Fixes
- Campaign edit now updates existing row (case-insensitive GAS ID lookup)
- Grid dot rendering: fixed undefined text in calendar cells
- Data normalization: all GAS raw fields → frontend fields with empty string fallbacks
- `formatShortDate()`, `renderDetail()` null guards
- TikTok chip color `#9ca3af` → `#a1a1a1` for better visibility

### LATCH Access Fix
- `latch/js/app.js`: API_URL changed from empty placeholder to real GAS web app URL
- GAS URL is configured in `Productive/latch/js/app.js` (not stored in documentation)

### Code Cleanup
- Removed unused `SHAPES` array
- Removed unused `shapeIdx`, `shapeMap`, `g.shape`, `g.shapeIdx`
- Removed duplicate `gridHtml` initialization

### Documentation
- README.md rewritten to reflect actual project state
- Update_Plan.md rewritten with full change log and Expense Tracker spec

---

## 3. Current Sprint: Expense Tracker

### In Progress
- [x] GAS backend (code-expense-tracker.gs) — 11 functions + initSpreadsheet
- [x] Frontend UI (index.html) — Form + List + Dashboard + Detail Modal
- [ ] Deploy & test end-to-end
- [ ] Upload bukti via Google Drive (saveFileToDrive_ implemented, perlu izin Drive)

### Status
Backend & frontend code complete. Menunggu deploy & test.

---

## 4. Planned (Not Yet Started)

### 4.1 Testing & Quality Assurance
- [ ] Test all print views across browsers (Chrome print preview for A4 landscape)
- [ ] Verify LATCH CRUD operations end-to-end with deployed GAS backend
- [ ] Add pagination/scroll for months with many campaigns per day
- [ ] Export print views to PDF generation on server side
- [ ] Unit tests for GAS functions (jest/jsdom)
- [ ] Cross-browser visual regression testing for all tools

### 4.2 Feature Enhancements
- [ ] Expense Tracker full cycle implementation
- [ ] User authentication system (shared across tools)
- [ ] Notification system (unread approvals, deadline reminders)
- [ ] Bulk operations across tools (batch approve, batch import/export)
- [ ] Data export (CSV bulk export per tool)
- [ ] Activity log (audit trail for all actions)

### 4.3 Infrastructure
- [ ] GAS backend versioning — track which GAS version each tool uses
- [ ] Automated GAS deployment pipeline
- [ ] CDN for static assets (fonts, icons) with fallback
- [ ] Error monitoring and logging
- [ ] Backup automation for Google Sheets data

---

## 5. Tool Status Matrix

| Tool | File | Status | Backend |
|------|------|--------|---------|
| Team Planner | `Productive/Task/taskschedule.html` | ✅ Stable | `code-taskschedule.gs` |
| SAS Analytic | `Productive/analytic/Analytic.html` | ✅ Stable | GAS integration |
| LATCH Link Manager | `Productive/latch/latch.html` | ✅ Fixed (2026-07-25) | GAS + localStorage |
| Activity Tracker | `Productive/tr/tracking.html` | ✅ Stable | GAS integration |
| Retur Tracker | `Productive/tr-retur/retur-track.html` | ✅ Stable | `code-retur-track.gs` |
| Package Tracker | `Productive/outbondtrack/Outbondtrack.html` | ✅ Stable | GAS integration |
| PDF Merger | `Productive/PDF-Merger/PDFM_V2.html` | ✅ Stable | None (client-side) |
| Resi Generator | `Productive/Resi-Generator/Index.html` | ✅ Stable | None (client-side) |
| Form DAK | `Doc/form-dak.html` | ✅ Stable | None (client-side) |
| Expense Tracker | `Productive/expense-tracker/` | 🔄 In Progress | `code-expense-tracker.gs` (includes init spreadsheet script + file upload) |

---

## 6. Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | 2026-07-25 | Print view redesign, LATCH fix, code cleanup, color-group numbering |
| 3.0-pre | 2026-07-23 | Campaign platform system, GAS Event/Reminder sheets |
| 2.0 | 2026-07-18 | CSS variable fixes, cache TTL + holiday fallback |
| 1.0 | 2026-07-15 | Initial release: shell + 7 tools |

---

## 7. Dependency Map

### External Dependencies (CDN)
| Tool | CDN | Purpose |
|------|-----|---------|
| All Tools | Google Fonts (Plus Jakarta Sans) | Typography |
| Team Planner | None | Pure vanilla |
| SAS Analytic | Chart.js, Chart.js Datalabels, Chart.js Zoom, Marked.js, jQuery, Moment.js, Daterangepicker, DataTables, SheetJS | Charts, markdown, date ranges, tables, Excel |
| LATCH | feather-icons (CDN) | Icons |
| Activity Tracker | Tailwind CSS (CDN) | Styling fallback |
| PDF Merger | pdf-lib, pdfjs-dist (CDN) | PDF manipulation |

### Internal Dependencies
| File | Depends On |
|------|------------|
| `index.html` (shell) | `tools.css`, `design-system.css`, `components.css` |
| `router.js` | None |
| `theme-manager.js` | None |
| `iframe-communicator.js` | None |
| `tool-card.js` | None |
| `app.js` | All `src/core/*`, `src/components/*` |

### GAS Backend Dependencies
| Tool | GAS Web App URL | Deployed? |
|------|-----------------|-----------|
| Team Planner | In `taskschedule.html` | Yes |
| LATCH | In `latch/js/app.js` | Yes |
| Activity Tracker | In `tracking.html` | Yes |
| Retur Tracker | In `retur-track.html` | Yes |
| Expense Tracker | TBD | Has init spreadsheet script — auto-creates sheet on first run |

---

## 8. Release Criteria

### For Each Release
- [ ] All existing tests pass (if any)
- [ ] Manual smoke test on Chrome, Firefox, Edge
- [ ] Print view tested in Chrome print preview (A4 landscape)
- [ ] Dark mode toggle works across all tools
- [ ] No console errors in any tool
- [ ] GAS backend deployed (for tools that need it)
- [ ] README.md updated to reflect new state
- [ ] Update_Plan.md reflects all changes

### For Expense Tracker (when implemented)
- [ ] Full CRUD via GAS
- [ ] Approve/reject workflow tested end-to-end
- [ ] Dashboard summary accuracy verified against sheet data
- [ ] Dark mode consistency with shell
- [ ] File upload (bukti kuitansi) working
- [ ] Toast notifications for all actions
- [ ] Empty state handling
- [ ] Mobile responsive (320px+)
