# Retur Track — Terminal Scanner

Terminal scanning barcode untuk pencatatan & pemantauan paket retur, dengan auto-detect ekspedisi, staging batch, dan update status.

- **File:** `Productive/tr-retur/retur-track.html` (±970 baris, single-file)
- **Backend:** Google Apps Script → **`gscode/code-retur-track.gs`** (bukan file `.txt` di folder ini — lihat §3.2)
- **Status:** ✅ Stable — GAS integration

---

## 1. Fitur & Cara Pakai

- **Scan terminal** — input barcode/resi berulang, data masuk ke *staging* sebelum di-submit batch.
- **Auto-detect ekspedisi** — `lookupExpedition` + regex di `getExpeditionConfig` (JNE, SiCepat, Shopee Xpress, J&T, POS, Ninja, AnterAja, Wahana, Tiki, Lazada, ID Express). Penambahan ekspedisi = tambah entry di `getExpeditionConfig` **dua sisi** (HTML render + GS config).
- **Submit batch** — `submitBatchData(stagingData)` → Sheet "Tracking".
- **Riwayat + filter** — `getTrackingHistory(filter)`; **update status** per baris `updateTrackingStatus(rowNum, status)`.
- **Operator** — radio `name="operator"`, default `'Salsa'`.

---

## 2. Keterkaitan

### 2.1 Bridge GAS dual-mode
`GAS.call(fnName, args, onSuccess, onFailure)` di `retur-track.html` (baris 522):
1. **Hosted di GAS** → pakai `google.script.run` (native).
2. **Hosted di GitHub/hub** → `fetch` ke `GAS_URL`, `POST` `text/plain;charset=utf-8`, body `JSON.stringify({ function, args })`, **timeout 30s via AbortController**.

- `GAS_URL` = `AKfycbx2cU-R0KL9HW_0RJQ2I4AkNSdea-F9NFB1XUQbCT1Dz9cNVI7ULnI477szUH--DHFNCQ/exec` (baris 554).
- Response diharapkan `{ success, result }` atau `{ error }`.
- **Jangan ganti `text/plain`** (menghindari CORS preflight).

### 2.2 Backend — mana yang benar
- **`gscode/code-retur-track.gs` = backend yang aktif**, cocok dengan pemanggilan HTML: `submitBatchData`, `getTrackingHistory`, `updateTrackingStatus`, `getExpeditionConfig`, `lookupExpedition`.
- Backend ini pakai **allowlist `FN_MAP`** — fungsi yang tidak terdaftar ditolak. Aman; pertahankan model ini.
- Sheet: **"Tracking"** — kolom `Nomor Resi | Ekspedisi | Waktu Scan | Tanggal | Operator | Status`. Header dibuat otomatis kalau sheet belum ada.
- `doGet` mengembalikan `{result:"ok"}` (untuk cek deploy).

### 2.3 ⚠️ `Kode GS.txt` = salinan LAMA (jangan dipakai)
`Productive/tr-retur/Kode GS.txt` berisi backend versi lama (sheet "Retur", dispatch `this[fnName]` tanpa allowlist, fungsi `addRetur/getAllRetur/updateRetur/deleteRetur`) yang **tidak cocok** dengan pemanggilan HTML saat ini. Ini sisa sejarah — **bisa dihapus** untuk menghindari salah-salin. (Hash `Kode GS.txt` ≠ `gscode/code-retur-track.gs`.)

### 2.4 Hub & Shell
- Router: `#utilities/retur` → `Productive/tr-retur/retur-track.html`.
- Memuat CSS bersama hub `../../src/styles/tools.css`.
- Spreadsheet terhubung: `docs.google.com/spreadsheets/d/1ZsvtLM8tLrdJKRlR0NobBPxmq0DQG52vNU6p83PdhqI`.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Backend frontend harus sinkron
- Ubah fungsi backend → salin hasilnya ke **`gscode/code-retur-track.gs`** (bukan ke `Kode GS.txt`).
- Tambah fungsi baru → daftarkan ke **`FN_MAP`** juga, kalau tidak akan ditolak.

### 3.2 Jangan pernah hapus doGet ok
Link `google.script.run` vs fetch memakai pengecekan `typeof google !== "undefined"` — saat deploy di GAS, `doGet` yang salah/rusak bikin tool ikut gagal di embed GAS.

### 3.3 Ekspedisi — dua sumber regex
Daftar ekspedisi & regex baku ada di `getExpeditionConfig()` (GS) — **default kode selalu menang** untuk nama ekspedisi standar (J&T, Sicepat, Shopee Xpress, dst.), jadi deploy lama dengan regex basi (mis. J&T tanpa `JY`/`JD`/`JX`, atau `SPX` tertimpa `Sicepat`) otomatis ter-fix tanpa edit sheet. Isi sheet `Ekspedisi` hanya **menambah** ekspedisi baru (nama yang tidak ada di default). Perhatian: jika ingin mengubah regex ekspedisi standar, ubah **kode**, bukan sel — isi sheet untuk nama standar diabaikan.

### 3.4 Update status by row
`updateTrackingStatus(rowNum, status)` memakai **nomor baris di sheet** — sensitif terhadap hapus/sisip baris. Jangan ubah posisi kolom "Status" di sheet tanpa mengubah logika backend.

---

## 4. Flow Data (ringkas)

```
Scan → staging array → GAS.call("submitBatchData", staging) → Sheet "Tracking"
Auto-detect: GAS.call("lookupExpedition", resi) → regex ekspedisi
Riwayat:    GAS.call("getTrackingHistory", filter) → render list
Status:     GAS.call("updateTrackingStatus", rowNum, status)
```
