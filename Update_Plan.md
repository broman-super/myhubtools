# Update Plan — RND Roadmap Tracker (Next Phase)

Tanggal: 2026-08-13

> Isi sebelumnya (log Taskschedule) dihapus — diganti rencana pengembangan RND Roadmap Tracker.

## Ide / Fitur Berikutnya

### 1. Foto Bukti Nyata (Upload ke Google Drive)
- **Tujuan:** item checklist bisa punya foto bukti asli; thumbnail langsung tampil di milestone. Storage di **Google Drive** (bukan Supabase) → tidak membebani kuota akun Supabase free.
- **Alur:**
  - Frontend (`ChecklistModal`): ganti checkbox simulasi `hasPhoto` menjadi `<input type="file" accept="image/*">`. Baca file → `FileReader` → base64/dataURL.
  - Tambah action `uploadPhoto` di GAS `rndtracker.gs`: terima `{ name, base64, mime }`, simpan ke folder Google Drive khusus (buat folder jika belum ada via `DriveApp`), set izin "siapa saja dengan link bisa lihat", kembalikan `thumbnailLink`/`webContentLink`.
  - Frontend simpan `photoUrl` ke item checklist → ikut tersimpan di `data` jsonb lewat sync GAS yang sudah ada.
  - Tampilan: di `MilestoneNode` checklist, bila `photoUrl` ada → render `<img>` thumbnail (klik buka full).
- **File:** `gscode/rndtracker.gs` (action `uploadPhoto`), `src/App.jsx` (ChecklistModal + MilestoneNode), `src/supabase.js` (kirim base64 lewat payload foto / panggil action terpisah).
- **Catatan:** base64 foto lewat GAS (bukan langsung ke Supabase) → aman & nol beban storage Supabase.

### 2. Filter & Search Project di Dashboard
- **Tujuan:** cari project by nama / kode / kategori + filter by status.
- **Alur:** tambah input search + chip status di `Dashboard`. Filter client-side pada array `projects` (sudah di-memory) — tidak perlu backend.
- **File:** `src/App.jsx` (komponen `Dashboard`).

### 3. Export Roadmap ke PDF / CSV
- **Tujuan:** unduh seluruh roadmap.
- **CSV (native, tanpa lib):** flatten project → milestone → checklist menjadi baris; download via `Blob` + `URL.createObjectURL`.
- **PDF:** Opsi A — `window.print()` dengan print stylesheet (zero-dep). Opsi B — `jspdf` (tambah dependency) untuk PDF terstruktur. Rekomendasi: mulai dengan print-based; pakai jsPDF hanya bila butuh styling khusus.
- **File:** `src/App.jsx` (tombol export di Dashboard / ProjectDetail).

## Status

| # | Fitur | Pendekatan | Status |
|---|-------|-----------|--------|
| 1 | Foto bukti → Google Drive | GAS `uploadPhoto` + thumbnail | 📋 Rencana |
| 2 | Filter & search dashboard | filter client-side | 📋 Rencana |
| 3 | Export PDF / CSV | CSV native + print PDF | 📋 Rencana |
