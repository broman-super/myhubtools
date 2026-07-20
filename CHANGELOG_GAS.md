# CHANGELOG — Perbaikan Koneksi GAS (Google Apps Script)

**Tanggal:** 2026-07-20
**Isu:** Semua perkakas web (tools) mengalami "Kesulitan Terhubung Ke GAS".

---

## Ringkasan Investigasi

Dilakukan uji konektivitas langsung (HTTP) ke seluruh 5 deployment Web App GAS yang digunakan tools:

| Tool | Status Endpoint | Hasil |
|------|----------------|-------|
| Analytic.html | `AKfycbyAZ8...` | `200 OK` ✅ hidup |
| Outbondtrack.html | `AKfycbzWGe...` | `200 OK` ✅ hidup |
| taskschedule.html | `AKfycbw4M...` | `200 OK` ✅ hidup |
| retur-track.html | `AKfycbzAL...` | `200 OK` ✅ hidup |
| tracking.html | `AKfycbwNP...` | `302 → 200 OK` + JSON valid + `Access-Control-Allow-Origin: *` ✅ hidup |

**Kesimpulan:** Backend GAS **TIDAK** mati/expired. Semua deployment masih aktif dan merespons.
Masalah berada di sisi **klien (browser)** saat tool dijalankan melalui `file://` di dalam iframe shell (`index.html`).

### Akar Masalah (Root Cause)
Saat tool di-load via `file://` (origin = `null`) di dalam iframe, permintaan `fetch()` ke GAS melewati
redirect cross-origin (`script.google.com` → `script.googleusercontent.com`). Tanpa opsi CORS eksplisit,
Chrome dapat melempar error silent *"Failed to fetch"* pada leg ke-2 redirect, sehingga semua tool gagal
terhubung secara bersamaan.

### Defek konkret yang ditemukan
- `retur-track.html`: GAS `fetch` **tanpa** `Content-Type` header dan tanpa `mode: 'cors'` / `redirect: 'follow'`.
- Tool lain: memang sudah pakai `text/plain` (aman dari CORS preflight), tetapi **tidak** eksplisit menyetel
  `mode: 'cors'` + `redirect: 'follow'`, sehingga rentan terhadap kegagalan redirect pada origin `null`.
- Tidak ada diskriminasi error (CORS vs network vs server) → pesan "Gagal terhubung" ambigu.

---

## Perubahan (Fixes Applied)

### 1. `Productive/tr-retur/retur-track.html`
- `GAS.call()` sekarang mengirim `Content-Type: text/plain;charset=utf-8`, `mode: 'cors'`, `redirect: 'follow'`.
- Tambah pengecekan `response.ok` dan `console.error("[GAS] fetch gagal: …)` untuk diagnostik.

### 2. `Productive/Outbondtrack.html`
- `apiCall()` ditambah `mode: 'cors'`, `redirect: 'follow'`, cek `response.ok`.
- Pesan error diperjelas: menyarankan cek koneksi / deploy GAS (akses = **Anyone**).

### 3. `Productive/Task/taskschedule.html`
- `api()` ditambah `mode: 'cors'`, `redirect: 'follow'` pada GET dan POST; header `charset=utf-8`.
- Cek `response.ok` + `console.error("[GAS] fetch gagal: …)`.

### 4. `Productive/tr/tracking.html`
- Ditambahkan helper terpusat **`gasFetch(bodyObj, timeoutMs)`**:
  - `mode: 'cors'`, `redirect: 'follow'`, `Content-Type: text/plain;charset=utf-8`
  - `AbortController` timeout 30 detik (anti hang)
  - Cek `response.ok`, diskriminasi error (AbortError → "Timeout koneksi GAS")
- Seluruh 8 titik `fetch(GAS_URL, …)` diganti pakai `gasFetch({ action: …, … })`.

### 5. `Productive/Analytic.html`
- `sendExcelToGAS()` POST ditambah `mode: 'cors'`, `redirect: 'follow'`.

---

## Catatan Penting untuk Deployment GAS

Agar koneksi dari `file://` / domain apa pun berhasil, pastikan di Google Apps Script:
- **Execute as:** *Me*
- **Who has access:** **Anyone** (BUKAN "Anyone with Google account")
- Setelah mengubah kode GAS, lakukan **Deploy → New deployment** (URL Web App tetap sama jika pakai
  "Manage deployments", atau perbarui URL di tool jika buat deployment baru).

---

## Status
- ✅ Backend GAS: hidup (terverifikasi)
- ✅ Client fetch: di-hardening dengan CORS/redirect/timeout eksplisit
- ⏳ Perlu verifikasi manual di browser (buka tool → cek Console, pastikan tidak ada error CORS)
