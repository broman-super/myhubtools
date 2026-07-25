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
- **Data normalization:** All GAS raw fields mapped to frontend fields (nama→title, mulai→date, selesai→enddate, warna→color, deskripsi→description) with empty string fallbacks
- **undefined fix:** formatShortDate(), renderDetail(), and grid rendering all have null guards

### Bug Fixes
- **Campaign edit creating new row:** Fixed `saveCalendarItem_` ID column lookup to be case-insensitive (`headers.map(h => h.toLowerCase()).indexOf('id')`)
- **LATCH access:** `latch/js/app.js` API_URL was empty placeholder → updated to real GAS web app URL
- **TikTok chip color:** Changed from `#9ca3af` to `#a1a1a1` for better visibility on calendar grid and timeline

### Code Cleanup
- Removed unused `SHAPES` array from `taskschedule.html`
- Removed unused `shapeIdx` / `shapeMap` logic (no longer needed without shape rendering)
- Removed unused `g.shape` / `g.shapeIdx` property assignments

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
| 2026-07-25 | TikTok Chip | Color `#9ca3af` → `#a1a1a1` | ✅ |
| 2026-07-25 | Code Cleanup | Removed SHAPES array, shapeIdx, shapeMap dead code | ✅ |

---

## Prioritas Mendatang
- [ ] Test all print views across browsers (Chrome print preview for A4 landscape)
- [ ] Verify LATCH CRUD operations work end-to-end with deployed GAS backend
- [ ] Add pagination/scroll for months with many campaigns per day
- [ ] Export print views to PDF generation on server side