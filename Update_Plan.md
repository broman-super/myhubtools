# Update Plan — Team Planner (taskschedule.html)

---

## Perubahan Terbaru (2026-07-25)

### Print View Improvements
- **Campaign grouping:** Group by title + description, sorted dates ascending
- **Calendar layout:** Two-page split (calendar p1, list p2), Bento flex-wrap grid
- **Grid dots:** Plain colored circles — no shape characters, no misleading numbers
- **Color-group numbering:** Dots show numbering only when multiple campaigns share the same color in the month; single-item colors show plain dot only. Numbers in grid match numbers in description list
- **Description area:** Added background (#f1f5f9), border-radius, increased padding (4px 8px), margin-top/bottom (6px)
- **Dot sizing:** Increased to 16x16px, border-radius 50%, gap 5px
- **Data normalization:** All GAS raw fields mapped to frontend fields (nama → title, mulai → date, selesai → enddate, warna → color, deskripsi → description) with empty string fallbacks
- **undefined fix:** formatShortDate(), renderDetail(), and grid rendering all have null guards

### Bug Fixes
- **Campaign edit creating new row:** Fixed saveCalendarItem_ ID column lookup to be case-insensitive (headers.map(h => h.toLowerCase()).indexOf('id'))
- **LATCH access:** latch/js/app.js API_URL was empty placeholder, updated to real GAS web app URL
- **TikTok chip color:** Changed from #9ca3af to #a1a1a1 for better visibility on calendar grid and timeline

### Code Cleanup
- Removed unused SHAPES array from taskschedule.html
- Removed unused shapeIdx / shapeMap logic (no longer needed without shape rendering)
- Removed unused g.shape / g.shapeIdx property assignments

---

## Log Perubahan

| Tanggal | Area | Perubahan | Status |
|---------|------|-----------|--------|
| 2026-07-25 | Print View | Campaign grouping, Bento grid layout, separate print pages | ✅ |
| 2026-07-25 | Print View | Grid dots: plain colored circles, color-group numbering | ✅ |
| 2026-07-25 | Print View | Description area spacing + background | ✅ |
| 2026-07-25 | Data Normalization | Frontend field mapping + undefined guards | ✅ |
| 2026-07-25 | Bug Fix | Campaign edit now updates existing row (case-insensitive ID lookup) | ✅ |
| 2026-07-25 | LATCH | API_URL fixed → real GAS web app | ✅ |
| 2026-07-25 | TikTok Chip | Color #9ca3af → #a1a1a1 | ✅ |
| 2026-07-25 | Code Cleanup | Removed SHAPES array, shapeIdx, shapeMap dead code | ✅ |

---

## Prioritas Mendatang

### [ ] Expense Tracker — Pengajuan, Realisasi & Reimburse

**Teknologi:** Vanilla HTML + CSS + JS (standalone), GAS Web App backend, Google Sheets database.
**File:** `Productive/expense-tracker/index.html` + `code-expense-tracker.gs`.
**Zero framework, zero runtime dependencies.**

---

#### 1. Workflow (Status Flow)

```
Draft → Pengajuan → { Disetujui | Ditolak } → Realisasi → { Reimburse → Selesai | Batal }
```

Langkah kerja:
1. User mengisi form → data masuk sheet dengan status `pengajuan`
2. Manager membuka list → approve atau reject tiap pengajuan
3. User input realisasi (jumlah aktual yang dikeluarkan) → status → `realisasi`
4. Admin memproses reimburse (pembayaran penggantian) → status → `selesai`
5. User atau admin bisa batalkan pengajuan kapan saja sebelum cair → status → `batal`

---

#### 2. UI Halaman & Komponen

**Halaman 1 — Form Tambah Pengajuan (halaman utama)**
- Tanggal (date picker) — wajib
- Kategori (select dropdown) — wajib, opsi: `Transport`, `Makan`, `Komunikasi`, `PPN`, `Hotel`, `Lainnya`
- Deskripsi (textarea) — wajib
- Jumlah (number input, format Rupiah otomatis dengan pemisah ribuan) — wajib
- Bukti Kuitansi (file upload, accept gambar/pdf, preview thumbnail sebelum kirim) — opsional
- Pengaju (auto-populate dari session/user, tidak bisa diedit)
- Tombol: `Simpan Draft`, `Kirim Pengajuan`

**Halaman 2 — List Pengajuan (tab terpisah)**
- Filter by status: semua, draft, pengajuan, disetujui, ditolak, realisasi, selesai, batal
- Filter by kategori (multi-select)
- Filter by tanggal (range picker: dari → sampai)
- Search by deskripsi (real-time, debounced)
- Setiap row menampilkan: tanggal | kategori badge | deskripsi (truncated) | jumlah terformat | status badge | aksi kontekstual (approve/reject/input realisasi/mark reimburse)
- Pagination (20 rows per page)

**Halaman 3 — Dashboard Ringkas (tab terpisah)**
- Ringkasan bulan berjalan: total pengajuan, total disetujui, total realisasi, total reimburse
- Per-kategori breakdown (bar chart sederhana, CSS-only)
- Pengajuan pending count (badge notifikasi di nav)
- Grafik tren 6 bulan terakhir (line chart CSS)

**Halaman 4 — Detail Pengajuan (modal/panel)**
- Semua field lengkap
- Timeline status perubahan (siapa ubah, kapan, status sebelumnya → baru)
- Bukti kuitansi preview (image thumbnail atau link download) jika ada
- Tombol aksi kontekstual sesuai status saat ini
- Tombol delete (hanya untuk draft)

---

#### 3. Sheet `Expenses` — Struktur Kolom

| # | Kolom | Tipe | Contoh | Keterangan |
|---|-------|------|--------|------------|
| 1 | `id` | string | `exp_20260725_001` | Auto-generated, unique per tanggal |
| 2 | `tanggal` | date string | `2026-07-25` | Tanggal expense (YYYY-MM-DD) |
| 3 | `kategori` | string | `transport` | Enum ketat, lowercase |
| 4 | `deskripsi` | string | `Uber ke bandara` | Detail expense |
| 5 | `jumlah` | integer | `85000` | Nilai Rupiah tanpa desimal |
| 6 | `buktiNama` | string | `struk_uber.pdf` | Nama file kuitansi |
| 7 | `buktiUrl` | string | `-` | URL file atau `-` jika tanpa bukti |
| 8 | `pengaju` | string | `joko` | User yang mengajukan |
| 9 | `status` | string | `pengajuan` | Enum ketat lowercase |
| 10 | `approvedBy` | string | `manager_adi` | User yang approve (kosong jika belum) |
| 11 | `tanggalApproved` | datetime | `2026-07-25 14:30` | Kapan disetujui (kosong jika belum) |
| 12 | `statusRealisasi` | string | `-` | Enum: `-`, `lunas`, `belum_lunas` |
| 13 | `tanggalUpdate` | datetime | `2026-07-25 14:30` | Timestamp perubahan terakhir |

Enum untuk `status`: `draft`, `pengajuan`, `disetujui`, `ditolak`, `realisasi`, `selesai`, `batal`
Enum untuk `kategori`: `transport`, `makan`, `komunikasi`, `ppn`, `hotel`, `lainnya`

---

#### 3.5 GAS Spreadsheet Initialization Script (Fase Awal)

**File:** `code-expense-tracker.gs` — function `initSpreadsheet_()`

Saat pertama kali dideploy atau saat spreadsheet belum memiliki sheet `Expenses`, run `initSpreadsheet_()` dari Apps Script editor (atau panggil via GAS Web App dengan action `initSpreadsheet`). Function ini:

1. Mengecek apakah sheet `Expenses` sudah ada
2. Jika sudah ada → clear isi, tetap pertahankan header
3. Jika belum ada → buat sheet baru, tambahkan header row

Hasilnya: spreadsheet langsung siap dipakai tanpa setup manual kolom. Cukup deploy GAS, run init, dan data bisa dimasukkan.

#### 4. GAS Functions — Daftar Lengkap

| Function | Aksi | Return |
|----------|------|--------|
| `submitExpense(data)` | Insert row baru, status=draft → auto-set ke pengajuan jika kirim | `{ success, id, row }` |
| `getExpenses(filter)` | Ambil data dengan filter status/kategori/tanggal/search/pagination | Array of objects |
| `getExpenseById(id)` | Ambil 1 row detail, termasuk timeline status | Object |
| `approveExpense(id, approver)` | Ubah status→disetujui, set approvedBy & tanggalApproved | `{ success }` |
| `rejectExpense(id, reason)` | Ubah status→ditolak, catat alasan di field tambahan | `{ success }` |
| `markRealisasi(id, lunas)` | Update statusRealisasi (lunas/belum_lunas), status→realisasi | `{ success }` |
| `markReimburse(id)` | Ubah status→selesai (reimburse cair) | `{ success }` |
| `cancelExpense(id)` | Ubah status→batal (hanya untuk draft/pengajuan) | `{ success }` |
| `deleteExpense(id)` | Hapus row (hanya untuk draft) | `{ success }` |
| `getExpenseSummary(periode)` | Ringkasan total per kategori, per status untuk dashboard | Object `{ totalPengajuan, totalDisetujui, totalRealisasi, totalReimburse, perKategori: {} }` |
| `getExpenseCountByStatus(periode)` | Hitung per status untuk badge notifikasi | Object `{ pengajuan: N, disetujui: N, realisasi: N, selesai: N, batal: N }` |

Semua function mengembalikan object dengan `{ success: boolean, data/error }` untuk konsistensi.

---

#### 5. Data Normalization (Frontend → Sheet)

- Semua tanggal disimpan format ISO `YYYY-MM-DD`
- Jumlah disimpan integer (rupiah tanpa desimal, tanpa pemisah ribuan — format hanya di display)
- Semua string field di-trim sebelum disimpan
- Status field menggunakan enum lowercase yang ketat (validasi di frontend sebelum kirim ke GAS)
- `buktiUrl` default `-` jika tidak ada file terupload
- `deskripsi` di-escape untuk aman di Google Sheets (hindari karakter yang rusak)
- `pengaju` diambil dari session yang sudah ter-authentikasi, tidak bisa dimanipulasi dari frontend
- `id` dibuat di frontend dengan pola `exp_YYYYMMDD_NNN` di mana NNN adalah nomor urut harian

---

#### 6. Gaya & UX (Desain)

- **Design system** yang sama dengan tool lain (Plus Jakarta Sans, CSS custom properties, dark mode toggle)
- **Tabel** responsive, scroll horizontal di mobile (overflow-x: auto)
- **Toast notification** untuk sukses/gagal submit/approve/reject/cancel/mark-reimburse
- **Konfirmasi dialog** (custom modal) sebelum: approve, reject, cancel, delete, mark reimburse
- **Loading state** — spinner/skeleton saat fetch GAS (API_TIMEOUT_MS: 10000)
- **Error handling** — pesan error yang mudah dipahami user (bukan raw error dari GAS)
- **Empty state** — tampilan visual saat tidak ada data untuk filter yang dipilih (illustration + text)

---

#### 7. File Struktur

```
Productive/expense-tracker/
  ├── index.html              # Halaman utama (form + list + dashboard + detail)
  ├── code-expense-tracker.gs # GAS backend (10 functions)
  ├── css/
  │   └── style.css           # Styling (ikuti design system existing)
  └── js/
      └── app.js              # Frontend logic (3 modules: form, list, dashboard)
```

---

#### 8. Definisi "Selesai" (Definition of Done)

- [ ] Form tambah pengajuan berfungsi dengan validasi field wajib
- [ ] List pengajuan dengan filter, search, pagination berfungsi
- [ ] Approve & Reject via GAS berfungsi
- [ ] Mark Realisasi (lunas/belum_lunas) berfungsi
- [ ] Mark Reimburse → Selesai berfungsi
- [ ] Cancel (Batal) pengajuan berfungsi (hanya draft/pengajuan)
- [ ] Dashboard ringkas menampilkan angka yang akurat
- [ ] Detail pengajuan menunjukkan timeline status perubahan
- [ ] Upload bukti kuitansi berfungsi (preview + simpan URL)
- [ ] Dark mode toggle berfungsi konsisten dengan tool lain
- [ ] Data normalization berjalan (tidak ada undefined di sheet)
- [ ] GAS functions semua mengembalikan consistent response format
- [ ] Loading state dan error handling berfungsi
- [ ] Toast notification untuk semua aksi user
- [ ] Konfirmasi dialog untuk aksi destruktif (approve/reject/cancel/delete)
- [ ] Test manual: buat → submit → approve → realisasi → reimburse → selesai