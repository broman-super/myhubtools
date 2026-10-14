# Rencana Update: SPPD Wizard + Chip View di 01 SPPD & Dana Cair

> Dokumen petunjuk progress. Dipisahkan dari plan lama (`plan-sppd-form-focus.md`) karena **arah desain berubah**: preview 2-pane diganti menjadi chip + wizard modal.

---

## 1. Tujuan

Di seksi **01 (ps-1) SPPD & Dana Cair** pada Layar Kerja event:

1. **Dashboard hanya tampil chip item** jika SPPD sudah dibuat — atau tombol **"+ Buat SPPD Baru"** jika belum.
2. Klik chip / tombol → buka **wizard modal 6 langkah** (versi pengisian resmi).
3. **Alur pembuatan file** mengikuti draft di `Draft_UPD/Form_Web_SPPD/` (renderer `buildHTML` + riwayat simpan sebagai `.html`/`.json`).
4. **Dana Cair** tampil sebagai section terpisah (Q3.3: 2 tampilan — SPPD & List Dana yang sudah Cair dari SPPD).
5. Bagian "Dana Awal SPPD" tampil di **atas** wizard supaya jadi sumber semua alokasi.

## 2. Keputusan Desain (locked)

| Item | Keputusan |
|------|-----------|
| Konsep "File" | **Visual only** — data asli teks/JSON di Supabase, UI menampilkan *seolah* file |
| Wizard | Modal inline di ps-1 (`ui.modal` + stepper), **6 langkah penuh** |
| Jumlah SPPD | **Satu per event** (SSOT), bukan riwayat multi |
| Data model | Semua tabel terhubung ke `event_id`; tabel Supabase boleh dibangun ulang |
| Stack | HTML/CSS/JS vanilla (ES5), SPA hash-router, tanpa framework/npm |
| GAS wajib | `POST text/plain;charset=utf-8`, `withFailureHandler`, server data biasa (bukan Date) |
| Anti-kehilangan | Tambahkan, jangan hapus fungsi/kode lama (kecuali diminta eksplisit) |
| Print | Tetap `<style>` block terpisah, format A4 landscape identik surat resmi |

## 3. Skema Data Baru (Supabase)

Tabel utama (sudah dibuat di `sppd_schema.sql`):

```
sppd_header     (id, event_id UNIQUE, pemberi_tugas, departemen, tgl_berangkat, jam_berangkat,
                 tgl_kembali, ket_kembali, transport_*, kota, target_1..3, status, no_surat,
                 dana_awal, realisasi, catatan, ...)
sppd_biaya       (id, sppd_id, urutan 0..7, item, jumlah, ket)          -- max 8 (A–H)
sppd_petugas     (id, sppd_id, urutan, nama)
sppd_uang_saku   (id, sppd_id, urutan, wq, wa, eq, ea)                  -- Weekday/Weekend
sppd_penginapan  (id, sppd_id, urutan, qty, tarif)
sppd_konsumsi    (id, sppd_id, urutan, nominal)
sppd_ttd         (id, sppd_id, peran maker/checker/signer, nama, jabatan, tanggal, img_base64)
sppd_perusahaan  (id, user_id, nama, logo_base64, wm_mode, wm_text, wm_img_base64, is_default)
sppd_alokasi     (id, sppd_id, kategori, alokasi, ket, wallet)          -- Bank/QRIS/Kas/E-Money
view v_sppd_full -- join semua jadi satu objek untuk renderer cetak
```

**Catatan penting:** 4 daftar SPJ (`petugas`, `uangSaku`, `penginapan`, `konsumsi`) **independen**, tidak terikat per orang; disejajarkan hanya berdasarkan **nomor urut baris** saat dicetak. Baris = daftar terpanjang (max 6).

## 4. Wizard 6 Langkah

1. **Perusahaan** — nama, logo, watermark (teks/logo/gambar/off), tombol "simpan sebagai default" → `sppd_perusahaan`
2. **Info Perjalanan** — pemberi tugas, departemen, tanggal & jam berangkat/kembali, transportasi (4 checkbox), kota tujuan, target pekerjaan 1–3 → `sppd_header`
3. **Biaya Umum** — item A–H (item, jumlah, keterangan), total live → `sppd_biaya`
4. **Biaya SPJ** — 4 daftar independen (petugas, uang saku weekday/weekend, penginapan, konsumsi) → tabel SPJ
5. **Penandatangan** — Maker/Checker/Signer (nama, jabatan, tanggal, upload gambar TTD, diperkecil max 500px) → `sppd_ttd`
6. **Review & Simpan** — preview form 1 halaman A4 landscape + tombol simpan

## 5. Perubahan Kode

### 5.1 `js/store.js`
- [x] `newSppdWizard()` — default object hasil wizard
- [x] `getSppdWizard(eventId)` / `saveSppdWizard(eventId, data)` / `deleteSppdWizard(eventId)` (SSOT per event)
- [x] `syncWizardToLegacy(eventId)` — sinkron ke `store.getSppd` lama (tampilRealisasi, budget, dll)
- [x] `getSppdPrintData(eventId)` — objek siap pakai untuk renderer
- [x] Export konstanta `SPPD_BIAYA_MAX`, `SPPD_SPJ_MAX_ROWS`
- [ ] Migrasi: `load()` pastikan `db.sppdWizard` ada & default kan setiap event yang belum punya
- [ ] `importJSON/restore` ikut mempertahankan `sppdWizard`

### 5.2 `js/pages.js`
- [x] `tabSppd()` — **ganti 2-pane jadi chip view**:
  - Jika wizard ada → chip SPPD (no surat, kota, tanggal, status, total, ringkas SPJ/TTD) + tombol **Edit SPPD / Pratinjau Cetak / Unduh .html / Hapus**
  - Jika belum ada → tombol besar **"+ Buat SPPD Baru"**
  - Form lama (data cepat) tetap tampil di bawah dengan label "Data Lama"
- [ ] `sppdWizardModal(eventId)` — render wizard 6 langkah
- [ ] `sppdWizardStepHTML(step, data)` — tiap langkah
- [ ] `sppdWizardValidate(step, data)` — minimal langkah wajib (kota, tanggal, target 1)
- [ ] Stepper CSS: aktif/hijau, ringkasan 3 daftar jadi satu, live subtotal di langkah 6
- [ ] Hasil `buildHTML` 1 halaman A4 landscape (renderer tunggal, 1-satunya)

### 5.3 `js/actions.js`
State: `A._sppdWizard[eventId] = { step:0, maxStep:0, data:... }`
- [ ] `sppd:wizard:open` — buka modal, `render()`
- [ ] `sppd:wizard:step` — klik langkah (jump)
- [ ] `sppd:wizard:next` / `sppd:wizard:prev` — gerak stepper; panggil `validate()` sebelum next
- [ ] `sppd:wizard:addrow` / `sppd:wizard:delrow` — 4 daftar SPJ
- [ ] `sppd:wizard:addbiaya` / `delbiaya` — max 8
- [ ] `sppd:wizard:upload` — file picker logo/wm/TTD (resize via canvas, simpan base64)
- [ ] `sppd:wizard:save` — susun payload `{json, html, meta}` → `store.saveSppdWizard()` + `syncWizardToLegacy()`; tampilkan toast & chip muncul
- [ ] `sppd:viewPrint` / `sppd:print:download` — render `A.sppdPrintForm` jadi html, modal preview atau unduh file
- [ ] `sppd:wizard:delete` — konfirmasi + undo (pakai pola `undoDelete`)

### 5.4 `js/pages2.js`
- [ ] Tombol hero **"Lihat Form SPPD"** → arahkan ke aksi viewPrint modal (bukan scroll ke ps-1, fungsinya tetap)
- [ ] Judul seksi 01 menjadi "SPPD & Dana Cair"; blok `#ps-1c` menampilkan **List Dana Cair** sebagai section tersendiri

### 5.5 `css/styles.css`
- [x] Loader overlay `.loader-overlay` (pointer-events fix sudah)
- [ ] `.wz-*` (wizard modal): stepper, stepper aktif/selesai, stepper compact di mobile, `wz-done`/`wz-current`
- [ ] Chip SPPD `.chip-card`, tampilan responsif
- [ ] `.dana-cair-*` section list chip
- [ ] Langkah review live preview wk dalam `.vw` (zoom scale supaya muat 1 halaman)
- [ ] `@media (prefers-reduced-motion)` tetap matiin animasi

### 5.6 `js/gas` / `js/app.js` (GAS bridge)
- [ ] `gas/sppdtoolbox.gs` menerima `{action:'sppd:save', payload:{json, html, meta}}`
- [ ] Supabase insert/update: header + child tables pada `event_id`; idempoten (upsert)
- [ ] Handler `sppd:list` untuk load awal
- [ ] Kompatibel: header sync tetap `store.load()/save()` full-DB; sync `sppdWizard` ikut diserialkan

## 6. Alur Pengguna

```
1. Buka event → Kerja → 01 SPPD & Dana Cair
2. Belum ada SPPD → tombol "+ Buat SPPD Baru"
3. Klik → modal wizard 6 langkah (mobile friendly)
4. Isi data (validasi masuk next step)
   Step 6 review: form render side-by-side / preview in modal (fit to viewport)
5. Simpan → entry DB (Supabase + localStorage) → modal tutup
6. ps-1 sekarang tampil CHIP: no surat, kota, tanggal, status, total, ringkas SPJ/TTD
7. Chip buttons: [Edit SPPD] [Pratinjau Cetak] [Unduh .html] [Hapus]
8. "Pratinjau Cetak" → modal iframe/render + [Cetak / Simpan PDF] [Unduh] [Tutup]
9. List Dana Cair tetap dibawah / bersebelahan dengan chip
```

## 7. Verifikasi Sebelum Commit

- [ ] `node --check` semua `js/*.js`
- [ ] Wizard jalan di mobile (lebar 360px): semua tombol nyaman, stepper tidak meluber
- [ ] Cetak 1 halaman A4 landscape: margin `0`, no page break di tengah tabel
- [ ] Form cetak tetap sama dengan surat resmi (3 header, biaya A–E, SPJ weekday/weekend/penginapan/konsumsi, TOTAL BIAYA, 3 kotak TTD)
- [ ] Upload TTD/logo/watermark: max "reasonable" (500px/900px), dbokean `localStorage.size` dengan `ping size`
- [ ] Kartu chip tampil di layar kerja; button tidak tumpang tindih
- [ ] Supabase: cek row insert/update pada `sppd_header` + child tables
- [ ] Tidak ada fungsi lama yang hilang

## 8. Out of Scope (jangan dikerjakan sekarang)

- Multi-SPPD per event / riwayat versioning
- Server-side PDF conversion (tetap pakai browser cetak)
- Drive storage untuk file html (tahap berikutnya; sekarang simpan sebagai teks/HTML di DB/cloud)
- Login/hak akses

## 9. Status Eksekusi

- [x] `sppd_schema.sql` dibuat (tabel + view + default perusahaan)
- [x] `store.js` tambah `sppdWizard*` helpers + export
- [x] `tabSppd()` diganti chip view + button "+ Buat SPPD Baru"/Edit SPPD
- [ ] **TERTAHAN di sini:** implementasi fungsi wizard modal
  - `sppdWizardModal()`, `sppdWizardStepHTML()`, `sppdWizardValidate()` **sudah di-export di `pages.js` tetapi belum didefinisikan** → akan `ReferenceError` saat file eksekusi. Harus ditambahkan fungsi aslinya sebelum commit.
- [ ] Actions wizard di `actions.js`
- [ ] Styling wizard (stepper, chip, mobile)
- [ ] Hero button "Lihat Form SPPD" + ganti judul seksi 01
- [ ] GAS bridge insert child tables

## 10. Next Step Paling Kecil

Tulis 3 fungsi wizard yang sudah di-export (di atas `function archive()` di `pages.js`):

```js
function sppdWizardModal(ev) {
  A._sppdWizard = A._sppdWizard || {};
  var st = A._sppdWizard[ev.id] || (A._sppdWizard[ev.id] = { step: 0, maxStep: 0 });
  var data = store.getSppdWizard(ev.id);
  return '<div class="card-pad wz">' + stepper(st) + '<div id="wz-body">' +
         sppdWizardStepHTML(st.step, data) + '</div>' + wzFooter(ev, st) + '</div>';
}
function sppdWizardStepHTML(n, d) { ... tiap step ... }
function sppdWizardValidate(n, d) { if (n === 1) return !!(d.kota && d.tglBerangkat && d.target[0]); return true; }
```

Lalu handler di `actions.js`: `sppd:wizard:open` (modal), `sppd:wizard:next/prev/step`, `sppd:wizard:addrow/delrow`, `sppd:wizard:save`, `sppd:wizard:delete`.

---

*Terakhir diupdate: setelah `store.js` helpers + chip view selesai; wizard modal belum diimplementasikan.*
