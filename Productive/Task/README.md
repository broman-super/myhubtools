# Premium Team Planner

Manajemen perencanaan tugas tim, campaign, event, dan reminder dengan tampilan kalender + timeline, plus view cetak. Backend Google Sheets + GAS.

- **File:** `Productive/Task/taskschedule.html` (±3920 baris)
- **Backend:** `gscode/code-taskschedule.gs` (Web App GAS)
- **Status:** ✅ Stable
- **Catatan:** file backend pernah di `Productive/Task/`, sekarang dipusatkan di `gscode/`.

---

## 1. Fitur & Cara Pakai

- **Kalender** bulanan + **timeline** tugas/campaign/event per hari.
- **CRUD** task, campaign, event, reminder (simpan/ubah/hapus via GAS).
- **Print** kalender/timeline & daftar tugas (landscape, `@page` khusus — lihat string `html` cetak di dalam file).
- Deteksi **hari libur nasional** via API eksternal (tanggalmerah), di-cache per tahun.
- **Tema** sendiri (toggle) — independen dari tema hub (key `ts-theme`).

---

## 2. Keterkaitan

### 2.1 Backend GAS
- `GAS_URL = https://script.google.com/macros/s/AKfycbztQF43rq6TcEJvb1qUheMddor1ESSiVQHX0Hc3NRX6ipunZpiyi9bysIRhTVOL_OJC/exec` (sesuai `taskschedule.html:1859`)
- **Baca data:** `GET ?action=getTasks` → array objek task.
- **Tulis data:** `POST` JSON `{ action, data }` dengan header `Content-Type: text/plain;charset=utf-8` (bukan `application/json` — jangan diganti, GAS butuh `postData.contents`).
- Action tulis didefinisikan di `gscode/code-taskschedule.gs` (save/update/delete item per tipe).

### 2.2 Hub & Shell
- Router: `#productive/planner` → `Productive/Task/taskschedule.html` (`src/core/router.js`).
- Dimuat via iframe — CSS/JS terisolasi, TAPI file ini **menautkan CSS bersama hub**: `../../src/styles/tools.css`.

### 2.3 CSS bersama hub — ⚠️ berbeda dari tool lain
`taskschedule.html` memuat `src/styles/tools.css`. Artinya:
- Perubahan di `src/styles/*.css` **berdampak langsung** ke tampilan tool ini (dan tool lain yang memuatnya).
- Bug lama (T6): `--platform-ig: var(--platform-ig)` — *circular self-reference*, nilai asli hanya ada di `design-system.css` yang tidak di-load. Sudah diperbaiki jadi `#a855f7`. **Jangan kembalikan ke `var(--platform-ig)`.**
- Kalau menambah CSS, prioritaskan inline di file ini, jangan menambah ke hub CSS tanpa uji semua tool pemakainya.

### 2.4 Storage & API eksternal
| Key | Scope | Fungsi |
|---|---|---|
| `ts_cache_data_v2` | localStorage | Cache hasil `getTasks` (offline/caching cepat) |
| `ts_holidays_<tahun>` | localStorage | Cache libur nasional per tahun |
| `ts-theme` | localStorage | Tema tool (key khusus tool ini, **bukan** `theme` milik hub) |

- **API libur:** `https://tanggalmerah.upset.dev/api/holidays?year=<tahun>` → `{ success, data: [{ date, ... }] }`.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 ✅ Bug backend yang sudah diperbaiki (jangan regresi)
Bug di `gscode/code-taskschedule.gs` ini pernah terjadi dan sudah fixed:
- **T1** — hapus item pakai `rows[i][0]` hardcode → kini lookup kolom ID dinamis. Jangan hardcode index kolom.
- **T2** — frontend kirim `reminders` (plural), backend map key `reminder` → dinormalisasi. Pertahankan konsistensi key frontend↔backend.
- **T3** — filter campaign baca `r.type` padahal data ber-key `r.tipe`. Sudah diselaraskan ke `r.tipe` (header sheet: "Tipe").
- **T4** — update N+1 cell → di-batch dengan `setValues` (hemat quota).
- **T5** — `JSON.parse(postData.contents)` tanpa guard → kini ada guard untuk request kosong.

### 3.2 Pola request GAS yang harus dijaga
- GET pakai `?action=...`; tulis selalu POST **text/plain** + body JSON `{ action, data }`.
- Setiap aksi baru: pastikan backend punya nama action yang sama persis dengan frontend, dan map key tidak singular/plural tidak konsisten (ini akar T2/T3).

### 3.3 Cache & libur
- `ts_cache_data_v2` menyimpan `{ timestamp, data }` — jangan buang field `timestamp`, dipakai logika kesegaran cache. Key di-versioning (v2, 2026-08-05) karena data lama menyimpan campaign dengan `type:'task'` (campaign jadi muncul di Task List).
- Cache libur per-tahun (`ts_holidays_${year}`) — saat pindah tahun, key baru otomatis dibuat.

### 3.4 Cetak
- Halaman cetak dibuat lewat window baru (string HTML berisi `@page{size:landscape}`). Saat mengubah tampilan, pastikan selektor `.p-grid`, `.p-track`, `.p-leg` dkk tidak ikut berubah — print view terpisah total dari UI utama.

### 3.5 Struktur file
- Tool ini single-file. Satu-satunya file pendamping = `gscode/code-taskschedule.gs`.
- `Productive/Task/` sekarang hanya berisi `taskschedule.html`.

---

## 4. Flow Data (ringkas)

```
Buka → baca tema (ts-theme) → load tugas:
  fetch(GAS_URL?action=getTasks)
    → simpan ts_cache_data
    → render kalender + timeline
  fetch(tanggalmerah?year=) → cache ts_holidays_<tahun> → tandai libur
Simpan/Ubah/Hapus item:
  fetch(GAS_URL, { POST text/plain, JSON {action, data} })
```
