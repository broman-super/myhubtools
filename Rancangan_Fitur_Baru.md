# Rancangan Fitur Baru — RND Roadmap Tracker

> Status: **DRAFT / RANCANGAN** — belum diimplementasi. Tujuannya untuk disepakati dulu sebelum coding.
> Tanggal rancangan: 2026-08-18

## 1. Ringkasan
Tiga penambahan diusulkan:
- **A. Sidebar + Navigasi**: area samping di Dashboard untuk **Panel Peringatan** (alert terbaca jelas) + menu navigasi **Project / Archive / Trash**.
- **B. Sistem Trash (Hapus Project)**: Hapus → masuk Trash → tahan **14 hari** → auto-purge, dengan tombol **Recovery** selama masa tahan.
- **C. Automasi Input Teks**: kombinasi `-` + `>` otomatis jadi `->` saat mengetik.

---

## 2. Asumsi (harap dikoreksi bila salah)
- "14 Hr" = **14 hari** retensi.
- **Archive** (ada saat ini, `archived=true`, tanpa batas waktu) tetap terpisah dari **Trash** (pending delete 14 hari). Keduanya disembunyikan dari daftar Project aktif.
- Sidebar berada di **kiri** Dashboard; Panel Peringatan mengisi area samping tersebut (bisa di-scroll).
- Automasi teks berlaku untuk **semua input teks** (judul project, deskripsi, tahapan, checklist, komentar evaluasi).
- Source GAS (`gscode/rndtracker.gs`) **perlu dicek/modifikasi** untuk hard-delete project (lihat B.6).

---

## 3. Fitur A — Sidebar & Navigasi (Project / Archive / Trash)

### 3.1 Layout
Dashboard diubah jadi **2 kolom**:
- Kiri (sidebar, ~280px, sticky): menu navigasi + Panel Peringatan.
- Kanan (fleksibel): konten sesuai view terpilih.

```
┌──────────────┬──────────────────────────────┐
│ NAVIGASI     │  [Project | Archive | Trash]  │
│ • Project    │  ───────────────────────────  │
│ • Archive    │  Konten (grid/daftar)         │
│ • Trash      │                               │
│              │                               │
│ PANEL        │                               │
│ PERINGATAN   │                               │
│ • Overdue X  │                               │
│ • Target <7h │                               │
│ • Tanpa tgl  │                               │
└──────────────┴──────────────────────────────┘
```

### 3.2 State & routing view
- Ganti toggle `showArchived` dengan state `navView: "project" | "archive" | "trash"`.
- `Dashboard` menerima prop `navView` dan memfilter:
  - `project`: `!archived && !trashedAt`
  - `archive`: `archived && !trashedAt`
  - `trash`:   `trashedAt != null`
- Top nav ( `#rnd-topnav` ) tetap; menu bisa di sidebar (utama) — hindari duplikasi.

### 3.3 Panel Peringatan
- Array `alerts` (sudah dihitung di `Dashboard`: overdue + upcoming) diperluas:
  - Project tanpa `targetReleaseDate`.
  - Tahapan overdue / target < 7 hari.
  - (Opsional) project di Trash yang mendekati purge (< 2 hari tersisa).
- Tampil di sidebar, tiap item: ikon + teks + klik → buka project terkait (`onOpen`).
- Bisa diberi `id="rnd-alert-panel"` untuk rujukan.

---

## 4. Fitur B — Sistem Trash (Hapus Project)

### 4.1 Alur
```
Kartu Project → tombol "Hapus" → window.confirm
  → set trashedAt = sekarang (soft delete)
  → hilang dari Project & Archive → masuk view Trash
Trash view:
  • "Pulihkan"  → trashedAt = null  (kembali ke Project/Archive sesuai archived)
  • "Hapus Permanen" → hard delete (deletes)
  • Tampil: "Otomatis dihapus pada <tgl>, <x> hari lagi"
Setelah 14 hari → auto-purge (lihat 4.4)
```

### 4.2 Data model
Tambah kolom di row project (Supabase `rnd_roadmap`):
- `trashedAt` : ISO timestamp | `null`
- `archived`  : sudah ada (tetap dipakai untuk Archive).
Filter dasbor pakai `!trashedAt` (bukan hanya `!archived`).

### 4.3 UI Trash
- View `trash` menampilkan kartu serupa Project, tapi dengan:
  - Badge "Trash · <x> hari lagi".
  - Tombol **Pulihkan** & **Hapus Permanen**.
- Recovery: `updateProject(id, { trashedAt: null })`.
- Permanen: masukkan `id` ke `deletes` lalu `syncToSupabase`.

### 4.4 Retensi 14 hari & auto-purge
Dua opsi (rekomendasi: jalankan keduanya):
1. **Client-side (wajib, simpel)**: saat app load / buka view Trash, cek `trashedAt`; bila `now - trashedAt > 14 hari` → kirim `deletes=[id]` ke GAS. (Hanya jalan bila app dibuka — cukup untuk kasus umum.)
2. **GAS cron (opsional, ideal)**: trigger harian di GAS hapus row dengan `trashedAt` kadaluarsa. Butuh setup trigger GAS.

Peringatan di Panel Peringatan untuk item Trash yang mendekati purge (< 2 hari).

### 4.5 Recovery & permanen delete
- Recovery aman (hanya clear flag).
- Permanen delete = hapus row project + (GAS sebaiknya juga hapus foto Storage terkait, best-effort seperti `deleteFromStorage` saat hapus milestone).

### 4.6 Dependensi GAS (perlu verifikasi)
- `syncToSupabase(rows, deletes)` → `deletes:[id]` saat ini dipakai untuk item nested. Perlu dipastikan GAS `sync` **juga menghapus row project utuh** bila id = project id. Bila tidak, tambah aksi `deleteProject` di GAS.
- Source GAS (`gscode/rndtracker.gs`) belum dibaca di sesi ini → harus dicek sebelum implementasi B.

---

## 5. Fitur C — Automasi Input Teks

### 5.1 Mekanisme
Saat mengetik, jika urutan terakhir adalah `-` lalu `>`, ubah menjadi `->`.
Implementasi minimal: **intersep pada nilai (value), bukan keydown**, agar robust terhadap paste & IME:
```
function applyAutoText(v) {
  return v.replace(/(^|[^>])->/g, ...) // bukan ini
}
```
Pendekatan benar: cukup ganti pola `"->"` yang terbentuk dari `-`+`>`. Karena user mengetik `-` lalu `>`, string mentah sudah `"->"` secara natural — **tidak perlu diubah** kecuali kita mau juga menangani `- >` (dengan spasi) atau `-->`.
- Minimal (sesuai permintaan): tangani `-` + `>` → `->`. Jika user mengetik `-` kemudian `>`, React sudah menghasilkan `->`. Jadi "otomatisasi" sebenarnya = **mencegah spasi/format salah** + mungkin macro lain.
- Usulan konkret: buat `smartInput(value)` yang melakukan replace map:
  - `- >` → `->`
  - `-->` → `->` (opsional)
  - (bisa diperluas: `..` → `…`, `==>` → `⇒`, dll.)

### 5.2 Cakupan
Semua `<input>`/`<textarea>` teks: Project (judul/desc), Milestone, Checklist, Evaluasi, dan search (search mungkin dikecualikan).

### 5.3 Implementasi
- Buat helper `smartText(v)` (pure function).
- Bungkus `onChange` teks dengan `setForm(f => ({...f,[k]: smartText(e.target.value)}))` — atau buat komponen `<SmartInput>` pengganti `<input>`/`textarea` yang menerapkan `smartText` sebelum memanggil `onChange`.
- Pointer: jangan ganggu posisi kursor pada kasus sederhana (replace di akhir string aman).

---

## 6. Breakdown Implementasi (urutan saran)
1. **Data model**: tambah `trashedAt` di Supabase + pastikan `loadProjects` mengembalikannya.
2. **Navigasi + Sidebar (A)**: refactor `Dashboard` 2 kolom, `navView`, menu Project/Archive/Trash, sembunyikan `trashedAt` dari Project/Archive.
3. **Panel Peringatan (A.3)**: tampilkan `alerts` + item Trash mendekati purge di sidebar; `id="rnd-alert-panel"`.
4. **Trash flow (B)**: tombol Hapus→trash, view Trash, Pulihkan, Hapus Permanen.
5. **Auto-purge 14 hari (B.4)**: client-side purge saat load + (opsional) GAS cron.
6. **Auto-text (C)**: `smartText` + `<SmartInput>` di semua input teks.
7. **Verifikasi GAS (B.6)**: pastikan hard-delete project berfungsi; deploy GAS.

---

## 7. Pertanyaan Terbuka (perlu jawaban sebelum coding)
1. Posisi sidebar: **kiri** (asumsi) atau kanan?
2. Apakah Archive & Trash keduanya diinginkan, atau Trash menggantikan Archive?
3. Automasi teks: hanya `->`, atau juga macro lain (`-->`, `==>`, dll.)?
4. Auto-purge: cukup client-side (app harus dibuka), atau wajib GAS cron harian?
5. Punya akses source GAS (`gscode/rndtracker.gs`)? (wajib untuk hard-delete project & cron).
6. Recovery dari Trash boleh dikembalikan ke Archive atau selalu ke Project aktif?

---
*Rancangan ini adalah draft. Setelah disepakati, akan dipecah jadi task implementasi dan dikerjakan bertahap.*
