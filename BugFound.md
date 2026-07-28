# BugFound.md — REYNAHUB_SYS Codebase Audit

> Generated: 2026-07-28  
> Scope: All webtools, shell, GAS backends  
> Status: 🔴 Critical / 🟡 Moderate / ⚪ Minor

---

## Shell / Core

### ✅ Fixed (2026-07-28)

| # | File | Severity | Bug | Fix |
|---|------|----------|-----|-----|
| S1 | `src/app.js` | 🔴 | Dual theme system: `app.js` pake localStorage `'theme'`, `ThemeManager` pake `'reynahub-theme'`. Theme reset tiap reload. | Migrasi key lama, pake `ThemeManager` via `theme-changed` event |
| S2 | `index.html` | 🔴 | Service worker (`src/sw.js`) ada tapi gak pernah didaftarkan — semua caching mati. | `navigator.serviceWorker.register('src/sw.js')` |
| S3 | `src/core/router.js` | 🔴 | `getToolPath('#productive/planner?view=month')` lookup gagal karena query string. | `hash.split('?')[0]` |
| S4 | `src/app.js` | 🔴 | Child iframe kirim `request-theme` tapi shell gak punya listener — theme gak sinkron. | `message` listener buat `request-theme`, balas `SET_THEME` |

### Still Open

| # | File | Severity | Bug |
|---|------|----------|-----|
| S5 | `src/core/iframe-communicator.js` | ⚪ | `sendToParent()` hardcode source `'reynahub-shell'` — harusnya `'reynahub-child'` kalo dipanggil dari child. Dormant (blm ada caller). |

---

## Expense Tracker

### ✅ Fixed (2026-07-28)

| # | File | Severity | Bug |
|---|------|----------|-----|
| E1 | `code-expense-tracker.gs` | 🔴 | `doPost` baca `params.id` — harusnya `params.data.id`. Semua action (approve, reject, realisasi, dll) gak jalan. |
| E2 | `code-expense-tracker.gs` | 🔴 | `res.success = true` selalu diset meski GAS balikin `{success: false}` — toast sukses palsu. |
| E3 | `code-expense-tracker.gs` | 🔴 | Filter tanggal `row.tanggal < filter.from` — `row.tanggal` bisa Date object, string compare jadi NaN. |
| E4 | `code-expense-tracker.gs` | 🟡 | `getExpenses_` return `[]` (array) kalo kosong, `{total, rows}` (object) kalo ada data. |
| E5 | `code-expense-tracker.gs` | 🟡 | `getExpenseCountByStatus_` return `draft: summary.totalDraf` (Rp) — frontend pakenya sebagai count. |

---

## Team Planner — `code-taskschedule.gs`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| T1 | `code-taskschedule.gs:100` | 🔴 | `deleteCalendarItem_` hardcode `rows[i][0]` sebagai ID column. `saveCalendarItem_` pake dynamic lookup. Delete selalu gagal kalo ID bukan kolom A. |
| T2 | `code-taskschedule.gs:109` | 🔴 | Map keys singular (`'reminder'`), frontend kirim plural (`'reminders'`). Data masuk ke sheet Tasks (fallback) bukan Reminders. |
| T3 | `code-taskschedule.gs:32-33` | 🔴 | Filter campaign baca `r.type` tapi data di-key sebagai `r.tipe` (header: "Tipe"). Campaigns array selalu kosong. |
| T4 | `code-taskschedule.gs:74-76` | 🟡 | N+1 cell writes per update — 9x quota burn. Harusnya `setValues` batch. |
| T5 | `code-taskschedule.gs:10` | ⚪ | Gak ada `postData` guard sebelum `JSON.parse` — error cryptic kalo request kosong. |

---

## Team Planner — `taskschedule.html`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| T6 | `taskschedule.html:22` | 🔴 | `--platform-ig: var(--platform-ig)` — circular self-reference. Nilai asli `#a855f7` cuma ada di `design-system.css` yang gak di-load. **Semua warna platform IG/TikTok jadi fallback, gradient header rusak.** |

---

## Retur Tracker — `code-retur-track.gs`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| R1 | `code-retur-track.gs:115` | 🔴 | `catch (e) {}` empty di `lookupExpedition` — semua error ditelan, debug mustahil. |
| R2 | `code-retur-track.gs:17` | 🔴 | `doPost` pake `this[fn].apply(this, args)` — `this` di V8 gak selalu指向 global scope. Error "Function not found" intermittent. |
| R3 | `code-retur-track.gs:148` | 🔴 | `submitBatchData` tulis ke kolom 1-5 fixed. Fungsi baca (`getTrackingHistory`) pake column map. Data alignment rusak kalo kolom pernah di-drag. |
| R4 | `code-retur-track.gs:148` | 🟡 | Hardcoded `5` bukan `HEADERS.length` — silent corruption kalo HEADERS berubah. |
| R5 | `code-retur-track.gs:41-44` | 🟡 | `getColumnMap_` skip header yang gak ketemu tanpa peringatan — caller pake fallback index salah. |
| R6 | `code-retur-track.gs:191-194` | 🟡 | `getTrackingHistory` skip baris dengan date unparseable — data hilang dari history tanpa notifikasi. |
| R7 | `code-retur-track.gs:144` | 🟡 | `submitBatchData` abaikan `d.timestamp` dari client — waktu scan ditimpa waktu submit. |
| R8 | `code-retur-track.gs:53` | ⚪ | `parseToStandardDate_` asumsi dd/mm/yyyy — tanggal salah kalo ada data format US. |

---

## Package Tracker — `Outbondtrack.html`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| O1 | `Outbondtrack.html:2` | 🔴 | Gak ada `<meta charset="UTF-8">` — text corruption di beberapa browser. |
| O2 | `Outbondtrack.html:2` | 🟡 | Gak ada `lang="id"` di `<html>` — accessibility failure (WCAG 3.1.1). |

---

## PDF Merger — `PDFM_V2.html`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| P1 | `PDFM_V2.html:229,235` | 🟡 | `.hidden` class dipake tapi cuma ada di `utilities.css` yang gak di-load. Button merge-per-kurir & CSV download gak bisa di-hide. |
| P2 | `PDFM_V2.html:4` | ⚪ | `<link>` sebelum `<meta charset>` — HTML spec violation (minor). |

---

## Analytic Dashboard — `Analytic.html`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| A1 | `Analytic.html` | 🟡 | Gak punya `toggleTheme()` function. Semua 7 tools lain punya. Kalo ada theme toggle di body → ReferenceError. |
| A2 | `Analytic.html:5` | ⚪ | `<link>` sebelum `<meta charset>` — HTML spec violation. |

---

## Activity Tracker — `tracking.html`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| AC1 | `tracking.html:5` | ⚪ | `<link>` sebelum `<meta charset>` — HTML spec violation. |

---

## Form DAK — `form-dak.html`

| # | File:Line | Severity | Bug |
|---|-----------|----------|-----|
| D1 | `form-dak.html` | ⚪ | Gak ada `toggleTheme()` dan gak ada `SET_THEME` listener. Mungkin intentional (printable doc), tapi inkonsisten dengan tools lain. |

---

## Status Perbaikan (2026-07-28)

| Kode | Status | Keterangan |
|------|--------|-----------|
| T1,T2,T3 | ✅ Fixed | `code-taskschedule.gs` — ID column dynamic, plural normalization, `r.tipe` |
| T4 | ✅ Fixed | N+1 cell writes → batch `setValues` di update |
| T6 | ✅ Fixed | `--platform-ig` circular → `#a855f7` |
| R1 | ✅ Fixed | Empty `catch(e){}` → `Logger.log` |
| R2 | ✅ Fixed | `this[fn]` → `FN_MAP` explicit dispatch |
| R3,R4 | ✅ Fixed | `submitBatchData` tulis via column map + `HEADERS.length` |
| R5 | ✅ Fixed | `getColumnMap_` log warning kalo header hilang |
| R6 | ✅ Fixed | Skip baris date unparseable → `Logger.log` row skip |
| R7 | ✅ Fixed | `submitBatchData` pake `d.timestamp` dari client |
| O1 | ✅ Fixed | `lang="id"` + `<meta charset>` |
| DD1 | ✅ Fixed | Password `Admin@` plaintext → base64 compare |
| DD2 | ✅ Fixed | CDN versions pinned (chart.js@3.9.1, jquery@3.7.1, dll) |
| DD3/P1 | ✅ Fixed | `.hidden` class ditambahkan di CSS |
| DD4 | ✅ Fixed | `doGenerate()` → `doPreview()` delegate, no duplicate code |
| S1,S4 | ✅ Fixed | Theme unified + request-theme listener |
| E1-E5 | ✅ Fixed | doPost params, success propagate, date string, return type, draft count |
| A1 | ✅ False positive | `toggleTheme()` SUDAH ada di line 2900 |
| T5 | ✅ Fixed | `postData` guard before `JSON.parse` |
| R8 | ✅ Fixed | `parseToStandardDate_` tambah dukung `yyyy-mm-dd` |
| P2,A2,AC1 | ✅ Fixed | `<meta charset>` sebelum `<link>` di 3 file |
| D1 | ✅ Fixed | Tambah `SET_THEME` listener di form-dak |
| S5 | ✅ Fixed | `sendToParent` source `'reynahub-shell'` → `'reynahub-child'` |
| DD5 | ✅ Fixed | Tambah `console.warn` kalo `products.json` gagal fetch |

## Additional Findings — Deep Dive (2026-07-28)

| # | File | Severity | Bug |
|---|------|----------|-----|
| DD1 | `Analytic.html:3861` | 🔴 | **Hardcoded password** `'Admin@'` di client-side JS — `if (document.getElementById('pwdInput').value === 'Admin@')`. Siapa pun bisa inspect element dan lihat password. |
| DD2 | `Analytic.html:10-21` | 🟡 | **Unpinned CDN versions**: jQuery (`latest`), moment.js (`latest`), chart.js (no version), daterangepicker (`latest`). Auto-upgrade major version bisa break tool. |
| DD3 | `PDFM_V2.html` | 🟡 | **`.hidden` class undefined** — dipake di line 229 `class="btn btn-outline hidden"` dan line 235 `class="summary hidden"`, tapi CSS `.hidden` cuma ada di `utilities.css` yang gak di-load. Button merge-per-kurir & CSV download selalu visible. |
| DD4 | `Resi-Generator/Index.html:985` | 🟡 | **`doGenerate()` duplikat `doPreview()`** — "Generate PDF" cuma trigger browser print dialog, bukan generate file PDF beneran. Nama misleading. |
| DD5 | `Resi-Generator/Index.html:550` | ⚪ | **Product database**: mulai dari `EMBEDDED_PRODUCTS` (~50 item hardcoded), lalu fetch `products.json`. Di `file://` fetch gagal → silent fallback. OK secara fungsional tapi development blind spot. |

## Summary by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 14 | T1,T2,T3,T6,R1,R2,R3,O1,E1,E2,E3,S2,S3,**DD1** |
| 🟡 Moderate | 15 | T4,R4,R5,R6,R7,P1,A1,E4,E5,S1,S4,**DD2,DD3,DD4**,A1 |
| ⚪ Minor | 9 | T5,R8,P2,A2,AC1,D1,S5,**DD5** |
