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

### 3.7 🔴 Pengenal resi (potong kode depan/akhir) + bunyi dobel — JANGAN DIREGRESI
**Yang dipasang:**
1. **Menu Pengenal** — tombol gear di `Area Scanner Barcode` membuka `#prefixModal`: input kode (maks 5 karakter, hanya A–Z/0–9, otomatis di-uppercase), pilihan **Di depan**/**Di akhir**, checkbox aktif, dan baris contoh `#prefixPreview`. Setelan disimpan di `localStorage` key `outbond_pengenal_resi` sebagai `{aktif, kode, posisi}` — per perangkat, tidak masuk DB/sheet.
2. **Pemotongan di satu titik masuk scan** — handler keypress `#inputResi` memanggil `terapkanPengenal_(mentah)` sebelum `prosesResi()`. Karena itu deteksi kurir, deteksi dobel, tampilan kartu, dan data yang disimpan otomatis memakai resi bersih.
3. **Baris info `#prefixInfo`** — menampilkan setelan aktif dan hasil potong terakhir (`ABCX12345 → 12345 (pengenal dipotong)`) selama 6 detik, supaya resi tidak berubah diam-diam.
4. **Bunyi dobel** — `bunyiResiDouble_()` (WebAudio, dua nada 880→620 Hz, tanpa file/dependency) dipanggil **hanya** dari cabang duplikat sesi di `prosesResi()`.

**Aturan:**
- Pemotongan wajib tetap di handler keypress `#inputResi`. Jangan pindahkan ke `simpanSekarang()` (tampilan & cek dobel jadi tidak sinkron) dan jangan menambah titik potong kedua.
- `terapkanPengenal_()` harus tetap **tidak** memotong kalau kode tidak cocok, kalau hasil potong kosong, atau kalau `aktif` false. Resi harus lewat apa adanya, tanpa error dan tanpa blokir scan.
- Jangan mengubah `outbond_pengenal_resi` jadi data backend/sheet tanpa migrasi: ini setelan alat scan, bukan data kiriman.
- Bunyi jangan dipindah ke jalur scan normal (bunyi tiap barcode = operator cepat terganggu) dan jangan ditambahkan tombol bisu tanpa permintaan.
- Suara butuh interaksi user dulu (policy autoplay browser); karena selalu dipicu scan manual, `AudioContext` dibuat saat pertama dipakai — jangan dibuat di awal load.

---

### 3.8 Tampilan daftar resi & tabel ekspedisi — jangan diulang salahnya
**Yang pernah salah (sudah diperbaiki):**
1. **Nomor resi berisi `<`, `&`, atau `'` tampil beda dari yang discan** — kartu resi dibangun dengan `innerHTML` sehingga `AB<CD>EF&GH` tampil `ABEF&GH` dan `AB'CD` mematikan tombol Hapus. Sekarang kartu di `renderListDetail()` dibuat lewat DOM + `textContent` dan tombol Hapus memakai `addEventListener`, bukan `onclick` berisi string resi. Jangan kembali ke string HTML.
2. **Resi panjang melebarkan kartu dan panel** — `.resi-card .resi-text` sekarang `min-width:0; overflow-wrap:anywhere; word-break:break-word`, dan `.del-btn` `flex-shrink:0`. Tanpa ini resi ±45 karakter membuat halaman bisa digeser ke samping.
3. **Baris `Total Semua` tidak terbaca di tema gelap** — warna `<th>` di `<tfoot>` dulu hex gelap tetap; sekarang `var(--text)`. Jangan mengembalikan hex tetap di elemen tabel.

**Aturan:**
- Teks dari data (resi, ekspedisi, waktu) wajib lewat `textContent` atau `escHtml()` — jangan pernah disisipkan mentah ke `innerHTML`/onclick.
- `renderDetailRiwayat()` memakai `escHtml()`; pertahankan.

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
