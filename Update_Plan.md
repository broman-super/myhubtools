# Update Plan — RND Roadmap Tracker (Next Phase)

Tanggal: 2026-08-13

> Isi sebelumnya (log Taskschedule) dihapus — diganti rencana pengembangan RND Roadmap Tracker.

## Cara Pakai Checkpoint
- Tiap fitur punya milestone bernomor (Mx.y). Centang `[x]` bila sudah.
- Kalau lagi sibuk di tempat lain lalu balik: cari baris **`Lanjutan:`** di tiap fitur → itu pekerjaan berikutnya yang belum kelar. Jangan mulai dari nol.

---

## Fitur 1: Foto Bukti Nyata (Simpan ke Supabase)
**Status:** ✅ Selesai (pivot dari Google Drive)  |  **Lanjutan:** `git push` lalu tes
- Tujuan: item checklist punya foto asli; thumbnail langsung tampil.
- **Pivot:** awalnya rencana upload ke Google Drive, tapi izin Drive berulang gagal ("Akses ditolak: DriveApp.") walau sudah grant scope & deploy baru. Maka foto disimpan langsung ke Supabase sebagai **data URL JPEG terkompresi (~100KB)** di kolom `data` jsonb (lewat jalur `sync` GAS yang sudah jalan). Beban masuk kuota DB Supabase free (500MB), bukan Storage bucket.

### M1.1 — Backend GAS `uploadPhoto` (DIBATALKAN)
- [ ] Upload ke Drive dibatalkan (izin gagal). `uploadPhoto` di GAS tetap ada tapi tidak dipakai frontend.

### M1.2 — Frontend (`src/App.jsx`)
- [x] `ChecklistModal`: input file + preview + `resizeImageFile` (canvas → JPEG 0.7, max 1024px)
- [x] Foto disimpan langsung sebagai `photoUrl` (data URL) ke item checklist
- [x] `MilestoneNode` & `ReportView`: render `<img>` thumbnail bila `photoUrl` ada (klik → full)
- [x] Rebuild dist + commit (`c745f77`)

---

## Fitur 2: Filter & Search Project di Dashboard
**Status:** 📋 Rencana  |  **Lanjutan:** M2.1 (search + chip status)
- Tujuan: cari project by nama/kode/kategori + filter by status. Client-side, tanpa backend.

### M2.1 — Dashboard (`src/App.jsx`)
- [x] Tambah input search (filter nama/kode/kategori/deskripsi + milestone/checklist title, case-insensitive, live)
- [x] Tambah chip filter status (Semua/Ideation/On Track/At Risk/Done)
- [x] Filter client-side pada array `projects` (sudah di-memory)
- [x] Rebuild dist + commit

---

## Fitur 3: Export Roadmap ke PDF / CSV
**Status:** 📋 Rencana  |  **Lanjutan:** M3.1 (CSV native dulu)
- Tujuan: unduh seluruh roadmap.

### M3.1 — CSV (native, tanpa lib)
- [x] Flatten project → milestone → checklist jadi baris
- [x] Download via `Blob` + `URL.createObjectURL` (BOM UTF-8)
- [x] Tombol "Export CSV" di dashboard (export semua project aktif)

### M3.2 — PDF
- [x] Print via window baru berisi HTML rapi + `window.print()` (zero-dep, tanpa jspdf)
- [x] Tombol "Export PDF" di dashboard (popup izinkan)

---

## Ringkasan Milestone
| ID | Fitur | Status |
|----|-------|--------|
| M1.1 | GAS `uploadPhoto` | ✅ code / ⏳ deploy |
| M1.2 | Frontend foto (thumbnail) | ✅ code / ⏳ push |
| M2.1 | Filter & search dashboard | ⬜ belum |
| M3.1 | Export CSV | ⬜ belum |
| M3.2 | Export PDF | ⬜ belum |
