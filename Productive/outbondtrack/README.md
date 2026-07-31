# Pendataan Paket (Package Tracker / Scanner Gudang)

Sistem logging dan scanning barcode untuk pencatatan paket masuk/keluar, live counter, dan print resi.

- **File:** `Productive/outbondtrack/Outbondtrack.html` (±1089 baris, single-file)
- **Backend:** Google Apps Script (Web App) — kode backend **tidak tersimpan di repo ini** (lihat §3.2)
- **Status:** ✅ Stable — GAS integration

---

## 1. Fitur & Cara Pakai

- **Scanner Gudang** — scan barcode/QR, pencatatan paket masuk/keluar.
- **Live counter** — jumlah paket terdata real-time.
- **Print resi** — A3 detail & thermal label (`#printArea` + `<style id="dynamicPrintStyle">`).
- **Riwayat & detail** — data per penginputan (grouped) dan detail per paket.
- **Tema** dark/light + konfirmasi custom (`customConfirm`).

---

## 2. Keterkaitan

### 2.1 Backend GAS
- `SCRIPT_URL = https://script.google.com/macros/s/AKfycbzWGeJrkRT7Ll6DEgSz2IxswFQaTq7tI2gZAtDetMgy83HdZWeya1coh1Yvr5pC6_E/exec` (baris 641).
- Semua panggilan lewat **satu helper** `apiCall(action, payload, onSuccess, onError)`:
  - `POST` dengan `Content-Type: text/plain;charset=utf-8` (trik hindari CORS preflight — jangan diganti jadi `application/json`).
  - Body: `JSON.stringify({ action, payload })`.
  - Response yang diharapkan: `{ success: true, data }` atau `{ success: false, error }`.
- **Action yang dipakai frontend:**
  - `simpanDataGudang` (payload: data paket)
  - `getRiwayatGrouped`
  - `getDetailById` (payload: id penginputan)

### 2.2 Hub & Shell
- Router: `#utilities/outbond` → `Productive/outbondtrack/Outbondtrack.html`.
- Memuat **CSS bersama hub** `../src/styles/tools.css`.
- Ada `<base target="_top">` — sengaja, agar bisa di-embed di GAS. Jangan dihapus.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 ✅ Bug yang sudah diperbaiki (jangan regresi)
- **O1** — `<meta charset="UTF-8">` sudah ada (korupsi teks di beberapa browser). Jangan hapus.
- **O2** — `<html lang="id">` sudah ada (accessibility). Jangan hapus.

### 3.2 ⚠️ Backend GAS tidak tersimpan di repo
Kode `.gs` dari tool ini **belum ada** di `gscode/` (tidak seperti tool lain yang sudah dipindahkan ke sana). Backend hanya hidup di Apps Script / Sheets. **Sebaiknya simpan salinannya ke `gscode/`** agar perubahan bisa dilacak dan tidak hilang.

### 3.3 Kontrak `{ action, payload }`
- Nama action di frontend harus **persis** dengan yang di-cek backend (`doPost` → `JSON.parse(e.postData.contents)`).
- Tambah fitur = tambah action baru di kedua sisi. Pola key singular/plural yang tidak konsisten pernah jadi akar bug di tool lain (lihat README Team Planner §3.1).
- Guard `SCRIPT_URL === "URL_WEB_APP_ANDA_DISINI"` → alert. Jangan hardcode URL kosong, dan jangan hapus guard ini (mencegah tool "diam" saat URL belum diisi).

### 3.4 `text/plain` + JSON — jangan diganti
`application/json` memicu CORS preflight yang mempersulit deploy di hosting/domain lain. Pertahankan `text/plain;charset=utf-8`.

### 3.5 Struktur & catatan kecil
- **Tidak ada `<title>`** di `<head>` — tab/iframe menampilkan nama file. Tambahkan bila perlu.
- Print pakai `#printArea` + style dinamis; saat mengubah tampilan print, pastikan `@media print` dan `dynamicPrintStyle` tidak bertabrakan.
- `padding-bottom: 80px` di body memberi ruang bottom-nav — jangan dihapus tanpa menyesuaikan nav.

---

## 4. Flow Data (ringkas)

```
Scan / isi data → apiCall("simpanDataGudang", data)
  → POST text/plain {action, payload} → res {success, data}
Buka riwayat → apiCall("getRiwayatGrouped") → render grouped
Klik detail  → apiCall("getDetailById", id) → render detail
Print resi  → susun HTML #printArea → window.print()
```
