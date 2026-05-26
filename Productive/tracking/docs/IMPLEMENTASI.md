# SUPERSUB V2 — Dokumentasi Implementasi Teknis

Dokumen ini untuk developer yang memelihara frontend (`Tracking.html`), modul JS (`assets/`), dan backend Google Apps Script (`code.gs`).

---

## 1. Arsitektur

```
┌─────────────────┐     POST JSON      ┌──────────────────────┐
│  Tracking.html  │ ─────────────────► │  Web App (code.gs)   │
│  + app-core.js  │ ◄───────────────── │  Google Spreadsheet  │
│  + app-features │                    └──────────────────────┘
└─────────────────┘
```

| File | Peran |
|------|--------|
| `assets/config.js` | **URL GAS & konfigurasi pusat** (`window.GAS_URL`) |
| `Tracking.html` | UI, styling, logika tab/SPV/audit/time picker |
| `assets/app-core.js` | API wrapper, cache `getDashboardBundle` |
| `assets/app-features.js` | Template, salin kemarin, reminder, CSV, overlap panel |
| `code.gs` | Backend: CRUD log, filter WIB, export, audit overlap |

---

## 2. Struktur Sheet `Log_Aktivitas`

| Kolom | Nama | Tipe |
|-------|------|------|
| A | Timestamp | DateTime (tanggal aktivitas + jam mulai, WIB) |
| B | Tanggal_Log | String `YYYY-MM-DD` (sumber filter utama) |
| C | Nama | String |
| D | Fungsi | String (kategori/divisi) |
| E | Tipe_Tugas | String |
| F | Beban | String |
| G | Aktivitas | String |
| H | Waktu_Mulai | String `HH:mm` |
| I | Waktu_Selesai | String `HH:mm` |
| J | Output | String |

### Migrasi otomatis
`ensureLogSheetStructure()` di `code.gs`:
- Jika header `Tanggal_Log` belum ada → sisipkan kolom B.
- Isi baris lama dari `formatDateJakarta(Timestamp)`.

---

## 3. Zona waktu (WIB)

```javascript
var APP_TIMEZONE = 'Asia/Jakarta'; // GMT+7, tanpa DST
```

| Operasi | Fungsi |
|---------|--------|
| Tanggal hari ini | `getTodayJakarta()` |
| Parse submit | `buildActivityTimestamp(tanggal, mulai)` |
| Filter baris | `getRowTanggalLog(row)` → prioritas kolom B |
| Format jam dari Date | `formatTimeCell()` → `HH:mm` via `Utilities.formatDate` |

**Frontend:** `getTodayJakarta()`, `getJakartaNow()` — hindari `toISOString()` untuk tanggal kalender.

---

## 4. API Backend (`doPost`)

| action | Payload | Response |
|--------|---------|----------|
| `checkLogin` | username, password | success, role, name |
| `submitActivity` | data{ tanggal, mulai, selesai, ... } | success, msg |
| `getSPVSummary` | startDate, endDate | { activities, staff } |
| `getDashboardBundle` | startDate, endDate | { spvSummary, crossOverlap } |
| `getUserActivities` | username, startDate, endDate | array |
| `getYesterdayActivities` | username | array (kemarin WIB) |
| `getDayDuration` | username, tanggal | { totalMinutes, label, count } |
| `getCrossOverlap` | startDate, endDate | { count, items[] } |
| `exportCsv` | startDate, endDate | { csv, filename } (semua user) |
| `exportUserCsv` | username, startDate, endDate | { csv, filename } |
| `deleteActivity` | rowIndex, username | success |
| `editActivity` | rowIndex, username, data | success |

### Cache user (efisiensi)
`getCachedUsers()` → `CacheService` script cache, TTL 600 detik (`USERS_CACHE_KEY`).

---

## 5. Pemangkasan jalur (efisiensi)

| Optimasi | Implementasi |
|----------|----------------|
| Bundle dashboard | `getDashboardBundle` — satu fetch untuk SPV timeline + audit + overlap lintas user |
| Cache client | `SuperSubApi.fetchDashboardBundle` — key `start\|end`, invalidate setelah submit |
| Cache user GAS | `getCachedUsers()` mengurangi read `Daftar_User` |
| CSS deduplikasi | Blok daterange/picker kedua di `Tracking.html` dihapus (~400 baris) |
| Refresh riwayat selektif | Setelah submit, `loadUserHistory()` hanya jika tanggal input ∈ filter aktif |

### Invalidate cache
```javascript
SuperSubApi.invalidateDashboardCache();
AppFeatures.invalidateAndRefresh();
```

---

## 6. Fitur produk

### 6.1 Salin dari kemarin
- API: `getYesterdayActivities`
- Frontend: `AppFeatures.copyFromYesterday()` — mengisi form dari entri terakhir kemarin.

### 6.2 Template aktivitas
- Penyimpanan: `localStorage` key `supersub_activity_templates` (maks. 12).
- Tidak melalui server.

### 6.3 Reminder 18:00 WIB
- `AppFeatures.checkDailyReminder()` — interval 60 detik + cek awal 3 detik setelah login.
- `getDayDuration` untuk hari ini; toast jika `count === 0` dan jam ≥ 18.

### 6.4 Ringkasan durasi
- API: `getDayDuration`
- UI: `#inp-durasi-ringkasan`

### 6.5 Export CSV
- Karyawan: `exportUserCsv`
- SPV: `exportCsv` via `AppFeatures.exportSpvCsv()`

### 6.6 Overlap lintas user (audit)
- API: `getCrossUserOverlapAudit` — pasangan user berbeda, rentang waktu bersinggungan.
- **Tidak memblokir submit** — indikator beban menumpuk.
- UI: `#audit-cross-overlap-panel`

Algoritme singkat:
```
untuk setiap tanggal D:
  untuk setiap pasangan aktivitas (A, B) dengan nama berbeda:
    jika startA < endB dan startB < endA → catat overlap
```

---

## 7. Deploy

### 7.1 Google Apps Script
1. Buka project Spreadsheet → Extensions → Apps Script.
2. Tempel `code.gs` terbaru.
3. **Deploy** → New deployment → Web app.
4. Execute as: Me · Who has access: sesuai kebijakan organisasi.
5. Salin URL deployment ke `assets/config.js` → variabel `GAS_WEB_APP_URL`.

### 7.2 Hosting frontend
- Host `Tracking.html` + folder `assets/` di path yang sama agar script src valid.
- Jika hanya deploy via GAS `HtmlService`: gabungkan `app-core.js` / `app-features.js` inline atau gunakan `<?!= include('app-core'); ?>`.

### 7.3 Verifikasi pasca-deploy
```bash
# GET health
curl "<GAS_URL>"
# Harus: {"status":"active","timezone":"Asia/Jakarta"}
```

---

## 8. Konstanta konfigurasi

| Konstanta | Lokasi | Default |
|-----------|--------|---------|
| `MAX_BACKDATE_DAYS` | code.gs + Tracking.html | 30 |
| `APP_TIMEZONE` | code.gs | Asia/Jakarta |
| `USERS_CACHE_TTL` | code.gs | 600 detik |
| `REMINDER_HOUR` | app-features.js | 18 |

---

## 9. Keputusan desain

| Topik | Keputusan |
|-------|-----------|
| Overlap aktivitas | **Diizinkan** — tidak divalidasi di submit |
| Tanggal vs Timestamp | `Tanggal_Log` untuk laporan; `Timestamp` untuk urutan + jam mulai |
| Tidak ada blokir overlap | Sesuai permintaan: overlap = indikator beban |

---

## 10. Pengembangan lanjutan (opsional)

- [ ] `HtmlService` template terpisah untuk GAS native deploy
- [ ] Trigger email reminder jam 18 (Time-driven GAS) selain toast browser
- [ ] Kolom `Updated_At` untuk audit trail edit
- [ ] Rate limit submit per user

---

## 11. Struktur folder

```
V2/
├── Tracking.html
├── code.gs
├── assets/
│   ├── config.js      ← URL GAS (satu tempat)
│   ├── app-core.js
│   └── app-features.js
└── docs/
    ├── PANDUAN-PENGGUNA.md   ← manual pengguna
    └── IMPLEMENTASI.md       ← dokumen ini
```

*Terakhir diperbarui: implementasi V2 bundle + Tanggal_Log + fitur AppFeatures.*
