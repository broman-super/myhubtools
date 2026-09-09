# Retur Track — Terminal Scanner

Terminal scanning barcode untuk pencatatan & pemantauan paket retur, dengan auto-detect ekspedisi, staging batch, dan update status.

- **File:** `Productive/tr-retur/retur-track.html` (single-file)
- **Backend:** Supabase (project UNITOOLS `iyraamxkrygtzsqkvnqz`) — REST langsung dari browser, **tanpa GAS**
- **Schema:** `Productive/tr-retur/retur_schema.sql` (jalankan sekali di Supabase SQL Editor)
- **Status:** ✅ Stable — Supabase integration

---

## 1. Fitur & Cara Pakai

- **Scan terminal** — input barcode/resi berulang, data masuk ke *staging* sebelum di-submit batch.
- **Auto-detect ekspedisi** — `lookupExpedition` (exact match + prefix-learning) + regex `getExpeditionConfig`. Daftar baku di `EXP_DEFAULTS` (HTML) & tabel `retur_expeditions` (tambahan). Penambahan ekspedisi = tambah entry di `EXP_DEFAULTS` **dua sisi** (JSON + SQL seed bila perlu).
- **Submit batch** — `submitBatchData(stagingData)` → tabel `retur_tracking`.
- **Riwayat + filter** — `getTrackingHistory(filter)`; **update status** per baris `updateTrackingStatus(id, status)` (pakai `id`, bukan nomor baris).
- **Operator** — radio `name="operator"`, default `'Salsa'`.

---

## 2. Keterkaitan

### 2.1 Bridge data — Supabase REST tanpa GAS
Semua akses data lewat REST `https://iyraamxkrygtzsqkvnqz.supabase.co/rest/v1/` dengan header `apikey` + `Authorization: Bearer` (anon key). Helper `sb(path, opts)` di `retur-track.html`; fungsi `db*` membungkus 5 operasi lama (mirror `GAS.call` lama).

- `CONFIG.SUPABASE_URL` / `CONFIG.SUPABASE_ANON_KEY` di `retur-track.html`.
- Response diharapkan array JSON dari PostgREST; error dibungkus `Supabase <status> <path>: <body>`.
- **Jangan hapus guard/error handler** — mencegah tool "diam" saat table belum dibuat/RLS belum jalan.

### 2.2 Backend — mana yang benar
- **`retur_tracking`** (tabel utama): `resi, ekspedisi, waktu_scan, tanggal, operator, status`.
- **`retur_expeditions`** (daftar ekspedisi tambahan): `nama, regex`. Default kode (`EXP_DEFAULTS` di HTML) selalu menang; isi tabel hanya **menambah** ekspedisi baru.
- RLS: anon bisa baca & tulis (model sama dengan LATCH / backend GAS lama — konsisten).
- `gscode/code-retur-track.gs` = backend GAS **LAMA**, tidak lagi dipanggil oleh HTML. Dapat diarsip.

### 2.3 ⚠️ `Kode GS.txt` = salinan LAMA (jangan dipakai)
`Productive/tr-retur/Kode GS.txt` berisi backend versi lama (sheet "Retur", dispatch `this[fnName]` tanpa allowlist, fungsi `addRetur/getAllRetur/updateRetur/deleteRetur`) yang **tidak cocok** dengan pemanggilan HTML saat ini. Ini sisa sejarah — **bisa dihapus** untuk menghindari salah-salin.

### 2.4 Hub & Shell
- Router: `#utilities/retur` → `Productive/tr-retur/retur-track.html`.
- Memuat CSS bersama hub `../../src/styles/tools.css`.
- Supabase: project `iyraamxkrygtzsqkvnqz`, tabel `retur_tracking` & `retur_expeditions` (lih. `retur_schema.sql`).

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Backend frontend harus sinkron
- Ubah query REST → pastikan kolom mengikuti schema (`waktu_scan`, `tanggal`, dll. **snake_case**).
- Tambah fungsi baru → daftarkan ke `DB._fns` juga, kalau tidak akan ditolak.

### 3.2 Jangan pernah hapus fallback error
Setiap `DB.call` harus punya `onFailure` yang menampilkan pesan — tool tanpa koneksi ke Supabase harus menampilkan error, bukan diam.

### 3.3 Ekspedisi — dua sumber regex
Daftar ekspedisi & regex baku ada di `EXP_DEFAULTS` (HTML) — **default kode selalu menang** untuk nama ekspedisi standar. Tabel `retur_expeditions` hanya **menambah** ekspedisi baru.

### 3.4 Update status by id
`updateTrackingStatus(id, status)` memakai **`id`** (primary key) — aman dari hapus/sisip baris (beda dari backend GAS lama yang pakai nomor baris sheet).

---

## 4. Flow Data (ringkas)

```
Scan → staging array → DB.call("submitBatchData", staging) → POST retur_tracking
Auto-detect: DB.call("lookupExpedition", resi) → regex ekspedisi / prefix-learning
Riwayat:    DB.call("getTrackingHistory", filter) → GET retur_tracking → grup per tanggal
Status:     DB.call("updateTrackingStatus", id, status) → PATCH by id
```

## 5. Deploy (sekali saja)

1. **Supabase Dashboard » SQL Editor** → jalankan isi `retur_schema.sql` (bikin tabel + RLS).
2. Pastikan `CONFIG.SUPABASE_URL` / `SUPABASE_ANON_KEY` di `retur-track.html` cocok dengan project (`iyraamxkrygtzsqkvnqz`).
3. **(Migrasi data lama)** — buka project Apps Script dari spreadsheet Retur Track, tempel `gscode/migrate-retur-supabase.gs`, isi `__SUPABASE_CONFIG__` (URL + service_role project yang sama), Run `setupSupabaseProps` lalu `migrateReturToSupabase`. Cek hasil di Table Editor. (*Langkah ini satu kali; setelah selesai script tidak dipakai lagi.*)
