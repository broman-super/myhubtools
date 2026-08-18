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
- **Pivot:** awalnya rencana upload ke Google Drive, tapi izin Drive berulang gagal ("Akses ditolak: DriveApp.") walau sudah grant scope & deploy baru. Maka foto **dikompresi di client** lalu **diupload ke Supabase Storage** (bucket `roadmap-photos`, public) lewat GAS `action:'uploadStorage'`; yang disimpan di jsonb hanyalah **URL**-nya. DB tetap kecil & payload sync ringan. Kapasitas Storage free = 1 GB (terpisah dari DB 500 MB).

### M1.1 — Backend GAS `uploadPhoto` (DIBATALKAN)
- [ ] Upload ke Drive dibatalkan (izin gagal). `uploadPhoto` di GAS tetap ada tapi tidak dipakai frontend.

### M1.2 — Frontend (`src/App.jsx`)
- [x] `ChecklistModal`: input file + preview + `resizeImageFile` (canvas → JPEG 0.7, max 1024px)
- [x] Foto diupload ke Supabase Storage, `photoUrl` menyimpan URL-nya (bukan base64)
- [x] `MilestoneNode` & `ReportView`: render `<img>` thumbnail bila `photoUrl` ada (klik → full)
- [x] Rebuild dist + commit (`c745f77`)

---

## Fitur 2: Filter & Search Project di Dashboard
**Status:** ✅ Selesai  |  **Lanjutan:** — (selesai)
- Tujuan: cari project by nama/kode/kategori + filter by status. Client-side, tanpa backend.

### M2.1 — Dashboard (`src/App.jsx`)
- [x] Tambah input search (filter nama/kode/kategori/deskripsi + milestone/checklist title, case-insensitive, live)
- [x] Tambah chip filter status (Semua/Ideation/On Track/At Risk/Done)
- [x] Filter client-side pada array `projects` (sudah di-memory)
- [x] Rebuild dist + commit

---

## Fitur 3: Export Roadmap ke PDF / CSV
**Status:** ✅ Selesai  |  **Lanjutan:** — (selesai)
- Tujuan: unduh seluruh roadmap.

### M3.1 — CSV (native, tanpa lib)
- [x] Flatten project → milestone → checklist jadi baris
- [x] Download via `Blob` + `URL.createObjectURL` (BOM UTF-8)
- [x] Tombol "Export CSV" di dashboard (export semua project aktif)

### M3.2 — PDF
- [x] Print via window baru berisi HTML rapi + `window.print()` (zero-dep, tanpa jspdf)
- [x] Tombol "Export PDF" di dashboard (popup izinkan)
- [x] Bonus: tombol Export CSV/PDF juga di dalam project view (per-project)

---

## Ringkasan Milestone
| ID | Fitur | Status |
|----|-------|--------|
| M1.1 | GAS `uploadPhoto` (Drive) | ❌ dibatalkan (izin gagal) |
| M1.2 | Frontend foto (thumbnail + lightbox + hapus) | ✅ selesai |
| M2.1 | Filter & search dashboard (+ highlight) | ✅ selesai |
| M3.1 | Export CSV | ✅ selesai |
| M3.2 | Export PDF (+ per-project) | ✅ selesai |

---

## Rincian Update (Final)

**Arsitektur**
- React + Vite, build single-file `dist/index.html` (live di reynahub.web.io `#productive/rnd-roadmap`).
- Data: Supabase UNITOOLS (`rnd_roadmap`), anon **read-only**; tulis lewat **GAS bridge** (`service_role`) agar key tidak terekspos. CORS `text/plain` (tanpa preflight).
- Simpan **optimistic** + debounce 400ms.

**1. Foto Bukti (per checklist item)** — `c745f77`, `863b5eb`, `f6f2c88`
- Kompresi di client, lalu **upload ke Supabase Storage** (bucket `roadmap-photos`); DB hanya simpan **URL** (pivot dari Google Drive karena izin gagal).
- Thumbnail 48px (milestone), 28px (laporan), preview 260px (modal).
- Klik thumbnail → **lightbox** in-app (× / Esc / klik luar).
- Tombol **Hapus foto** di modal checklist.

**2. Search & Filter** — `d8e159a`, `fd6854b`
- Search live, case-insensitive: nama/kode/deskripsi project **+** judul milestone/checklist.
- **Highlight** kata cocok (kuning) di kartu dashboard.
- Chip filter status (Semua / Ideation / On Track / At Risk / Done).
- Dropdown **sorting**: Default / Status / Target Rilis / Progress.

**3. Export** — `01e13bf`, `18fc5b6`, `853ac68`
- **CSV** native (Blob, BOM UTF-8), flatten project→milestone→checklist.
- **PDF** via window baru (HTML rapi + `window.print()`), zero-dep.
- Dari **dashboard** (seluruh roadmap) & **project view** (per-project).

**4. Dashboard** — `de6f4d1`
- 4 kartu ringkasan status + **donut progress keseluruhan** (persen + `done/total` checklist).
- Panel peringatan overdue/upcoming.

**5. UX / Bug-fix** — `a7ad0de`, `61aa54d`
- Modal **remount per item** (`key`) → tiap checklist/project/milestone simpan datanya sendiri (fix state-bleed antar-item).
- Badge **"Tersimpan" auto-hide 3 detik**; **"Gagal"** tetap.

**Catatan**
- Menghapus project/item = foto ikut dihapus dari Storage (GAS `deleteStorage` best-effort); DB hanya simpan URL.
- Deploy: `src/config.js` → `GAS_SCRIPT_URL`; ubah config = rebuild + `git push`.
- Foto butuh **bucket Storage `roadmap-photos` (Public)** di Supabase + **redeploy GAS** (update deployment) agar action `uploadStorage`/`deleteStorage` live.

---

## Polish (tahapan)
- [x] **Phase 1 — Custom Date Picker**: `DatePicker` (kalender popover styled + ikon) ganti `<input type="date">` di Project & Milestone modal.
- [x] **Phase 2 — Konfirmasi hapus** milestone & checklist (`window.confirm` sebelum hapus).
- [x] **Phase 3 — Badge "Lewat Target"** merah di kartu dashboard bila ada milestone overdue.
- [ ] **Phase 4 — Esc + klik backdrop tutup modal** + auto-focus field pertama.
- [ ] **Phase 5 — Drag-and-drop / paste gambar** di modal checklist.
- [ ] **Phase 6 — Thumbnail foto di PDF export** (bukan cuma 📷).
- [ ] **Phase 7 — Skeleton loading** saat memuat data.
- [ ] **Phase 8 — Indikator "ada foto"** (ikon kamera) di timeline checklist.
