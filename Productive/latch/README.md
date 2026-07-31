# LATCH — Link Attach

Portal pengumpul dan manajemen tautan/link berkas penting kebutuhan operasional. Berbasis multi-file (HTML + CSS + JS) dengan backend opsional Google Sheets/GAS.

- **File:** `Productive/latch/latch.html` (UI, 248 baris) + `css/style.css` + `js/app.js` (logika, 1333 baris)
- **Backend:** GAS (Google Sheets) — **opsional**; punya mode demo localStorage.
- **Status:** ✅ Fixed (2026-07-25)

---

## 1. Fitur & Cara Pakai

- **Grid link** — daftar tautan berkas penting dengan ikon Feather, pencarian, tampilan bertahap (`BATCH_SIZE`).
- **Config via backend** — `announcement` (pengumuman di header) dan `pin` (kunci akses) diambil dari GAS.
- **Mode demo** — kalau `API_URL` tidak diset / remote gagal, tool tetap jalan pakai localStorage (`pin: "1234"`).

---

## 2. Keterkaitan

### 2.1 Backend GAS (opsional)
- `API_URL = https://script.google.com/macros/s/AKfycbwHxK9RHMPXuqlOmucA0GyHwzc33A6WsGeUAD0iwtaGVBSihAQaUeyg_Q7UUn7cULnp/exec` (di `js/app.js` → `CONFIG.API_URL`)
- Data disimpan di Google Sheets (diolah di Apps Script Web App).
- `CONFIG` di `app.js`: `API_URL`, `APP_NAME`, `BATCH_SIZE`, `LOAD_TIMEOUT_MS`.

### 2.2 Hub & Shell
- Router: `#productive/latch` → `Productive/latch/latch.html`.
- Memuat **CSS bersama hub** `../../src/styles/tools.css` → perubahan di `src/styles/*.css` berdampak ke tool ini.

### 2.3 Storage
- Namespace localStorage **`latch:`** (const `NS = "latch:"`) → contoh key `latch:links`, `latch:config`, `latch:query`, `latch:visibleCount`.
- `config` default demo: `{ announcement: "Selamat datang di LATCH.", pin: "1234" }`.

### 2.4 Dependency
- Feather icons via CDN `unpkg.com/feather-icons@4.29.2` — dipanggil `feather.replace()` untuk render ikon.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Jangan kehilangan mode demo/offline
- Seluruh layer baca/tulis lewat helper `storage` (`localStorage.getItem(NS + key)`). **Pertahankan namespace `latch:`** — ganti namespace akan "kehilangan" data lama user.
- Remote punya `LOAD_TIMEOUT_MS`; jika timeout → tool **fallback ke localStorage**. Jangan jadikan fetch tanpa timeout sehingga UI menunggu selamanya saat backend mati.

### 3.2 Backend hanya config — bukan satu-satunya sumber
- `announcement` & `pin` diambil dari GAS, tapi ada default demo di frontend. Ubah config di **backend/Sheets**, bukan hardcode di JS (default JS hanya untuk mode demo).
- `pin` default `"1234"` di demo — catatan: ini bukan keamanan nyata, murni penyaring akses ringan.

### 3.3 Shared CSS hub
- `latch.html` memuat `src/styles/tools.css` (sama seperti Team Planner). Tambahan CSS sebaiknya di `css/style.css` sendiri, bukan di hub CSS, agar tidak mengubah tool lain.

### 3.4 Urutan load
- Feather icons harus selesai load sebelum `feather.replace()` — jangan pindah posisi `<script src="feather...">` setelah inisialisasi ikon.

---

## 4. Flow Data (ringkas)

```
Buka → baca config (announcement, pin):
  remote? fetch(GAS) → state.set("config", data.config)
  gagal/timeout? pakai default demo localStorage
Tampil link grid → search → batch load (visibleCount += BATCH_SIZE)
Semua state persist ke localStorage namespace "latch:"
```
