# SUPERSUB Ops — Activity Tracker

Pencatatan dan pemantauan performa progres kerja harian seluruh anggota tim, dengan login per-user, dashboard bundle, SPV summary, template aktivitas, dan auditor AI (Gemini).

- **File:** `Productive/tr/tracking.html` (UI, ±3700 baris) + `assets/config.js`, `assets/app-core.js`, `assets/app-features.js`
- **Backend:** Google Apps Script (Web App) via `assets/config.js`
- **Status:** ✅ Stable — GAS integration

---

## 1. Fitur & Cara Pakai

- **Login** per user (`checkLogin`) → sesi di global `sessionUser`.
- **Dashboard bundle** — fetch agregat efisien (`getDashboardBundle`) untuk satu rentang tanggal.
- **SPV Summary** — ringkasan untuk Supervisor.
- **CRUD aktivitas** — submit, edit, hapus (per user + index baris).
- **Template & "Salin Kemarin"** — isi cepat aktivitas berulang.
- **Reminder, ringkasan durasi, export CSV, deteksi overlap lintas user** (`app-features.js`).
- **Gemini AI Auditor** — analisis via API Gemini 2.0 Flash (butuh API key).

---

## 2. Keterkaitan

### 2.1 Backend GAS — config terpusat
- **`assets/config.js` = satu-satunya tempat ubah URL backend** (komentar asli di file-nya menyatakan ini). `global.GAS_URL` + `SUPERSUB_CONFIG`.
- `SUPERSUB_CONFIG`: `{ gasUrl, timezone: 'Asia/Jakarta', maxBackdateDays: 30 }`.
- **Urutan load wajib:** `config.js` **pertama**, lalu `app-core.js`, `app-features.js`, baru `tracking.html`. Pindah urutan = `GAS_URL`/`SUPERSUB_CONFIG` undefined.

### 2.2 Wrapper API & action
Semua panggilan backend lewat wrapper **`gasFetch`** (di `app-core.js`) atau **`api(...)`** (di `app-features.js`) — keduanya memakai action:
`getUsersList` · `checkLogin` · `getDashboardBundle` · `getSPVSummary` · `submitActivity` · `getUserActivities` · `deleteActivity` · `editActivity` · `getYesterdayActivities` · `getDayDuration`.

- Nama action frontend harus **persis** dengan case di backend (contoh: `getDayDuration` — jangan tulis `getDayduration`).
- Sesi diambil dari response `checkLogin` → disimpan ke `window.sessionUser`. Operasi berikutnya mengirim `username: sessionUser.name`.

### 2.3 Hub & Shell
- Router: `#utilities/activity` → `Productive/tr/tracking.html`.
- Memuat **CSS bersama hub** (`../../src/styles/tools.css`) + **Tailwind CDN** (`cdn.tailwindcss.com`). Dua sumber CSS ini bisa bertabrakan — kalau ada style tak berubah, cek utility Tailwind dulu.

### 2.4 Storage
- `localStorage 'gemini_api_key'` — API key Gemini (diinput user / tombol simpan).
- Tidak ada sesi persist — `sessionUser` **in-memory**, hilang saat refresh.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Config dulu, bukan hardcode
- Jangan hardcode URL GAS di `tracking.html` — pindah `GAS_URL` ke `config.js`.
- `maxBackdateDays: 30` membatasi backdate — ubah di config, bukan di logika.

### 3.2 Wrapper — jangan bypass
- Selalu lewat `gasFetch`/`api` (mereka menangani error `{success:false}` + timeout). Panggilan `fetch` mentah di tempat lain akan kehilangan penanganan error seragam.

### 3.3 Sesi global
- Cek login sebelum aksi: `if (!sessionUser.name) return;`. Pattern ini dipakai di semua fitur — jangan "sederhanakan" dengan cara yang melewati cek.
- Karena sesi tidak persist, jangan menjadikan `sessionUser` sebagai sumber data yang tahan refresh (gunakan data dari GAS lagi).

### 3.4 Gemini AI Auditor
- API key dikirim sebagai **query parameter** ke `generativelanguage.googleapis.com` — key tetap terlihat di client (kelemahan yang diketahui, wajar untuk tool internal). Jangan pindahkan key ke file yang di-commit publik.
- Model: `gemini-2.0-flash`. Ganti model = sesuaikan juga struktur `generateContent`.

### 3.5 Multi-file — pahami pembagian
| File | Isi |
|---|---|
| `tracking.html` | Struktur UI + event handler utama |
| `assets/config.js` | URL backend & konfigurasi |
| `assets/app-core.js` | Core API & dashboard bundle |
| `assets/app-features.js` | Fitur lanjutan (template, CSV, overlap, dst) |

Kalau menambah fitur: taruh logika API di `app-core.js`/`app-features.js`, UI di `tracking.html`. Jangan menumpuk semua di satu file.

---

## 4. Flow Data (ringkas)

```
Load: config.js → app-core.js → app-features.js → tracking.html
Login: api('checkLogin', {username, password}) → window.sessionUser = res
Dashboard: gasFetch('getDashboardBundle', {startDate, endDate})
Aktivitas: submitActivity / editActivity / deleteActivity (username = sessionUser.name)
AI Audit: (bila ada key) fetch Gemini generateContent → render rekomendasi
```
