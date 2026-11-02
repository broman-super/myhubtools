# Pendataan Paket (Package Tracker / Scanner Gudang)

Sistem logging dan scanning barcode untuk pencatatan paket masuk/keluar, live counter, dan print resi.

- **File:** `Productive/outbound-track/outbound-track.html` (±1130 baris, single-file)
- **Backend:** Hybrid — write lewat Google Apps Script `gas/outbound-track.gs` (service_role), read langsung Supabase REST (anon). Database: **Supabase** (project **UNITOOLS** — database gabungan beberapa tool, tabel per tool ber-prefix `outbond_`). Skema ada di `migrasi_supabase.sql`.
- **Status:** ✅ Stable — Supabase + GAS write hybrid

---

## 1. Fitur & Cara Pakai

- **Scanner Gudang** — scan barcode/QR, pencatatan paket masuk/keluar.
- **Live counter** — jumlah paket terdata real-time.
- **Print resi** — A3 detail & thermal label (`#printArea` + `<style id="dynamicPrintStyle">`).
- **Riwayat & detail** — data per penginputan (grouped) dan detail per paket.
- **Tema** dark/light + konfirmasi custom (`customConfirm`).

---

## 2. Keterkaitan

### 2.1 Backend — Hybrid Supabase + GAS
- **Read** (riwayat & detail) **tidak lagi lewat GAS** — langsung `fetch` ke Supabase REST dengan anon key:
  - `getRiwayatGrouped` → `GET /rest/v1/outbond_paket?select=...&order=id.desc`, digrup per `id_penginputan` di client.
  - `getDetailById` → `GET /rest/v1/outbond_paket?`"id_penginputan"`=eq.<id>`.
  - Kredensial: `SUPABASE_URL` + `SUPABASE_ANON_KEY` (baris ±641). Tabel `outbond_paket` punya policy `select using (true)` — baca publik, **tidak ada policy insert** (write mustahil via client).
- **Write** (`simpanDataGudang`) tetap lewat `SCRIPT_URL = .../exec` (GAS Web App, kode di `gas/outbound-track.gs`) dengan **service_role** — respons `{ success: true, data }` / `{ success: false, error }`.
- `apiCall(action, payload, onSuccess, onError)` = satu pintu: dispatch action read → Supabase, sisanya → GAS. Action lain yang ditambah ke frontend otomatis via GAS.
- Body POST GAS tetap `text/plain;charset=utf-8` (trik hindari CORS preflight — jangan diganti jadi `application/json`).

### 2.2 Hub & Shell
- Router: `#utilities/outbond` → `Productive/outbound-track/outbound-track.html`.
- Memuat **CSS bersama hub** `../src/styles/tools.css`.
- Ada `<base target="_top">` — sengaja, agar bisa di-embed di GAS. Jangan dihapus.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 ✅ Bug yang sudah diperbaiki (jangan regresi)
- **O1** — `<meta charset="UTF-8">` sudah ada (korupsi teks di beberapa browser). Jangan hapus.
- **O2** — `<html lang="id">` sudah ada (accessibility). Jangan hapus.

### 3.2 ✅ Backend tersimpan di repo
Kode backend ada di `gas/outbound-track.gs` (script GAS terpisah khusus outbond) dan skema DB di `migrasi_supabase.sql`. Deployment = paste file .gs ke project GAS baru → `setupSupabaseProps` → deploy Web App (akses = Anyone) → tempel URL ke `SCRIPT_URL`.

**Migrasi data lama** (Sheet `WAKTU_SCAN/ID_PENGINPUTAN/NOMOR_RESI/EKSPEDISI` → `outbond_paket`) sudah selesai dan kode migrasinya sengaja **tidak disertakan** di file `.gs` ini. Jika suatu saat perlu migrasi ulang, tambahkan fungsi batch-insert (contoh pola lama tersimpan di riwayat commit) atau minta ke maintainer.

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

### 3.6 🔴 Pengamanan resi double (sesi + database) — JANGAN DIHAPUS
**Yang dipasang:**
1. **Dobel di memori sesi** — `prosesResi()` tetap TIDAK menambah resi kedua ke rekap (hitungan & print tetap unik), tapi menghitungnya di `resiDuplikatSesi` dan menampilkan panel `#dupAlertBox` + badge `DOBEL Nx SESI INI` pada kartu resi. Jangan ubah ini jadi "tambah baris kedua", karena total paket dan surat jalan jadi dobel.
2. **Cek database tanpa batas hari** — `cekDuplikatDatabase()` memanggil Supabase REST (`outbond_paket`, filter `resi=in.(...)`, dipecah 100 resi/request, urut `id.desc`) dan mencatat `resiRiwayatDb`. Tidak ada filter tanggal: resi dari sesi lama (mis. Maret) tetap tertangkap. Read lewat anon (policy select), jadi tidak perlu action GAS baru.
3. **Konfirmasi saat simpan** — `simpanDanReset()` selalu cek DB dulu. Bila ada dobel: dialog `#dupConfirmOverlay` dengan dua pilihan — **Periksa Kembali Paket** (batal simpan, sesi & penanda tetap) atau **Lanjut Double** (`simpanSekarang()` menyimpan apa adanya). Tanpa dobel → konfirmasi simpan biasa.

**Aturan:**
- Jangan pindahkan `cekDuplikatDatabase()` ke `prosesResi()` per scan (satu request per barcode = scanner lambat) dan jangan menambahkan filter tanggal ke query-nya.
- Simpan tetap satu pintu: `simpanSekarang()` (dipanggil dari konfirmasi normal maupun Lanjut Double). Jangan panggil `apiCall('simpanDataGudang')` langsung dari handler baru.
- Kalau cek DB gagal (offline), simpan tetap boleh jalan **dengan catatan eksplisit** di konfirmasi — jangan blokir permanen dan jangan sembunyikan kegagalannya.
- Penanda dibersihkan saat resi dihapus (`hapusResi`) dan setelah simpan sukses; reset sesi tanpa membersihkannya akan menyisakan badge hantu.

---

## 4. Flow Data (ringkas)

```
Scan / isi data → apiCall("simpanDataGudang", data)
  → POST text/plain {action, payload} → GAS service_role INSERT ke tabel paket
  → res {success, data}
Buka riwayat → apiCall("getRiwayatGrouped") → GET Supabase REST (anon) → grup per id_penginputan
Klik detail  → apiCall("getDetailById", id) → GET Supabase REST filter id_penginputan
Print resi  → susun HTML #printArea → window.print()
```
