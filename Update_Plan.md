# Update Plan — RND Roadmap Tracker (Next Phase)

Tanggal: 2026-08-13

> Isi sebelumnya (log Taskschedule) dihapus — diganti rencana pengembangan RND Roadmap Tracker.

## Cara Pakai Checkpoint
- Tiap fitur punya milestone bernomor (Mx.y). Centang `[x]` bila sudah.
- Kalau lagi sibuk di tempat lain lalu balik: cari baris **`Lanjutan:`** di tiap fitur → itu pekerjaan berikutnya yang belum kelar. Jangan mulai dari nol.

---

## Fitur 1: Foto Bukti Nyata (Upload ke Google Drive)
**Status:** 🔧 Dikerjakan  |  **Lanjutan:** Deploy GAS baru + `git push`, lalu tes upload foto di live
- Tujuan: item checklist punya foto asli; thumbnail langsung tampil. Storage di Drive → nol beban kuota Supabase free.

### M1.1 — Backend GAS (`gscode/rndtracker.gs`)
- [x] Buat/temukan folder Drive tujuan (`DriveApp.getFoldersByName` / `createFolder`)
- [x] `doPost` tangani `action:'uploadPhoto'` → terima `{ name, base64, mime }`
- [x] `Drive.Files.create` dari base64 (decode)
- [x] Set izin: siapa saja dgn link bisa lihat (`setSharing`)
- [x] Kembalikan `{ photoUrl }` (`https://drive.google.com/uc?export=view&id=...`)
- [ ] Deploy ulang GAS → tes via POST (curl / extension)  ← aksi user

### M1.2 — Frontend (`src/App.jsx` + `src/supabase.js`)
- [x] `ChecklistModal`: ganti checkbox simulasi `hasPhoto` → `<input type="file" accept="image/*">` + preview
- [x] `FileReader` → base64, panggil `uploadPhoto`
- [x] Simpan `photoUrl` ke item checklist (`addChecklist`/`editChecklist`)
- [x] `MilestoneNode` & `ReportView`: render `<img>` thumbnail bila `photoUrl` ada (klik → full)
- [x] `supabase.js`: export `uploadPhoto` (fetch GAS, text/plain)
- [ ] Rebuild dist + push  ← aksi user (sudah di-build, tinggal push)

---

## Fitur 2: Filter & Search Project di Dashboard
**Status:** 📋 Rencana  |  **Lanjutan:** M2.1 (search + chip status)
- Tujuan: cari project by nama/kode/kategori + filter by status. Client-side, tanpa backend.

### M2.1 — Dashboard (`src/App.jsx`)
- [ ] Tambah input search (filter nama/kode/kategori, case-insensitive)
- [ ] Tambah chip/select filter status (Ideation/On Track/At Risk/Done)
- [ ] Filter client-side pada array `projects` (sudah di-memory)
- [ ] Rebuild dist + push

---

## Fitur 3: Export Roadmap ke PDF / CSV
**Status:** 📋 Rencana  |  **Lanjutan:** M3.1 (CSV native dulu)
- Tujuan: unduh seluruh roadmap.

### M3.1 — CSV (native, tanpa lib)
- [ ] Flatten project → milestone → checklist jadi baris
- [ ] Download via `Blob` + `URL.createObjectURL`

### M3.2 — PDF
- [ ] Print stylesheet + `window.print()` (zero-dep)
- [ ] (Opsional) `jspdf` bila butuh styling terstruktur
- [ ] Rebuild dist + push

---

## Ringkasan Milestone
| ID | Fitur | Status |
|----|-------|--------|
| M1.1 | GAS `uploadPhoto` | ✅ code / ⏳ deploy |
| M1.2 | Frontend foto (thumbnail) | ✅ code / ⏳ push |
| M2.1 | Filter & search dashboard | ⬜ belum |
| M3.1 | Export CSV | ⬜ belum |
| M3.2 | Export PDF | ⬜ belum |
