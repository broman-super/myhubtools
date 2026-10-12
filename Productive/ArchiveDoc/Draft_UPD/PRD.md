# PROJECT BRIEF: Fieldwork & Event Booth Webtools

## 1. Executive Summary

Webtools pribadi untuk efisiensi kerja lapangan, khususnya perjalanan dinas dan persiapan booth di event.

**Karakteristik Utama:**
- Mobile-first (sering dipakai di HP saat di lapangan)
- Output dokumen 100% identik dengan format resmi perusahaan
- Desain minimalist, tegas, anti-AI-slop

---

## 2. Tech Stack

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| Frontend | Astro.js + Tailwind CSS | Statically generated, performa maksimal |
| Database | Supabase (PostgreSQL) | Simpan metadata, teks checklist, link file |
| Middleware | Google Apps Script (GAS) | API Gateway, sembunyikan Supabase Key, upload ke GDrive |
| Storage | Google Drive (via GAS) | Simpan PDF dan foto dokumentasi |
| Hosting | GitHub Pages | Deploy frontend |

---

## 3. Design Guidelines (Anti-Slop)

**Bentuk:**
- DILARANG: `rounded-lg`, `rounded-full`, gradient warna-warni, drop-shadow
- WAJIB: `rounded-none` atau maksimal `rounded-sm` (2px), border tipis

**Warna:**
- Background: `#FAFAFA` (off-white)
- Teks: `#111111` (hampir hitam)
- Aksen: `#000000` atau satu warna solid (Merah Bata `#991B1B` atau Biru Navy `#1E3A8A`)

**Tipografi:**
- Heading: Sans-serif tebal (Inter/System UI, weight 800)
- Data/Angka: Monospace (JetBrains Mono/Roboto Mono)

**Animasi:**
- Hanya micro-interactions CSS murni
- Transisi opacity dan transform dengan durasi 200ms ease-out
- Tidak ada bounce atau spring

**Mobile UX:**
- Tombol min-height 48px
- Whitespace yang disengaja
- Mudah diklik dengan jempol

---

## 4. Database Schema

### Tabel: events
- id (uuid, primary key)
- event_name (text) - Contoh: "Pameran UMKM 2026"
- event_date (date) - Tanggal event dimulai
- location (text) - Lokasi venue
- status (enum: draft, in_progress, completed, archived)
- created_at (timestamp)
- updated_at (timestamp)

### Tabel: trips
- id (uuid, primary key)
- event_id (uuid, foreign key → events.id)
- trip_type (enum: preparation, departure, execution, post_event)
- sppd_number (text, nullable)
- start_date (date)
- end_date (date)
- personnel (text[]) - Array nama peserta
- notes (text, nullable)
- status (enum: draft, in_progress, completed)
- created_at (timestamp)

### Tabel: checklist_items
- id (uuid, primary key)
- trip_id (uuid, foreign key → trips.id)
- category (enum: documents, logistics, departure, report)
- item_name (text) - Contoh: "SPPD ditandatangani"
- is_checked (boolean, default: false)
- checked_at (timestamp, nullable)
- notes (text, nullable)
- attachment_url (text, nullable) - Link ke GDrive
- order_index (integer) - Urutan pengisian

### Tabel: documents
- id (uuid, primary key)
- trip_id (uuid, foreign key → trips.id)
- document_type (enum: sppd_checklist, logistics_checklist, departure_checklist, final_report)
- gdrive_file_id (text) - ID file di Google Drive
- gdrive_url (text) - Link download/view
- generated_at (timestamp)

---

## 5. Halaman & Fitur

### A. Dashboard (Beranda)

**Konten:**
- Overview stats: Active Events, In Progress, Completed This Month
- List Upcoming Events dengan card yang menampilkan:
  - Nama event
  - Tanggal & lokasi
  - Progress bar (persentase checklist selesai)
  - Status badge (draft/in_progress/completed)
  - Tombol "Lihat Detail"

**Visual Card Event:**
- Border kiri tebal 4px dengan warna berdasarkan status
- Progress bar dengan warna dinamis
- Tombol full-width di bawah

### B. Detail Event

**Konten:**
- Header: Nama event, tanggal, lokasi
- Progress Overview:
  - Progress bar utama (persentase keseluruhan)
  - Progress per kategori (Persiapan Dokumen, Logistik, Keberangkatan, Laporan)
  - Status emoji: ✅ (100%), 🔄 (in progress), ⏳ (belum mulai)
- List Perjalanan Dinas:
  - Card per trip dengan tanggal, personnel, status
  - Tombol "Buka Checklist" atau "Lanjutkan Checklist"
  - Tombol "Tambah Perjalanan Baru"
- Dokumen Tergenerate:
  - List file PDF yang sudah dibuat
  - Tombol "Lihat Semua Dokumen"

### C. Checklist (Multi-step Form)

**Struktur:**
- Step Indicator di atas: 4 step (Dokumen → Logistik → Keberangkatan → Laporan)
- Setiap step menampilkan checklist items sesuai kategori
- Progress bar per step
- Tombol navigasi: Kembali, Selanjutnya, Simpan Draft

**Komponen Checklist Item:**
- Checkbox custom (kotak tajam)
- Saat di-check: animasi fade-in, teks strikethrough
- Field catatan (muncul saat checkbox di-centang)
- Tombol upload foto (untuk item tertentu: tiket, boarding pass, dll)

**Interaksi:**
- Auto-save ke Supabase setiap kali ada perubahan (debounced 500ms)
- Progress bar update real-time
- Tombol "Selanjutnya" aktif jika minimal 1 item di-check

### D. Arsip

**Konten:**
- List semua event dengan status completed atau archived
- Filter berdasarkan bulan/tahun
- Pencarian berdasarkan nama event
- Klik event → tampil detail + list dokumen PDF
- Klik dokumen → buka di tab baru (link GDrive)

### E. Roadmap

Halaman statis berisi daftar fitur yang akan ditambahkan di masa depan.

---

## 6. User Flow

### Flow 1: Membuat Event Baru
1. Klik "+ Buat Event Baru" di Dashboard
2. Modal muncul: Input nama event, tanggal, lokasi
3. Submit → Data masuk ke tabel events dengan status draft
4. Redirect ke halaman Detail Event

### Flow 2: Menambahkan Perjalanan Dinas
1. Di Detail Event, klik "+ Tambah Perjalanan Baru"
2. Form muncul: Pilih tipe trip, tanggal, personnel
3. Submit → Data masuk ke tabel trips, status draft
4. Otomatis generate checklist items default dari template
5. Redirect ke halaman Checklist Step 1

### Flow 3: Mengisi Checklist
1. User di halaman Checklist Step 1
2. Centang item-item yang sudah selesai
3. Upload foto jika diperlukan (file → GAS → GDrive → URL disimpan di Supabase)
4. Progress bar update real-time
5. Klik "Selanjutnya" → pindah ke Step 2
6. Ulangi sampai Step 4
7. Di Step 4, klik "Generate Laporan Akhir"
8. Sistem generate PDF dari semua data
9. PDF → GAS → GDrive → URL disimpan di tabel documents
10. Status trip berubah menjadi completed
11. Redirect ke Detail Event (progress event ikut update)

### Flow 4: Melihat Arsip
1. Klik menu "Arsip" di navbar
2. Tampil list event completed/archived
3. Filter berdasarkan bulan/tahun
4. Klik event → tampil detail + list dokumen PDF
5. Klik dokumen → buka di tab baru

---

## 7. Status Workflow

### Event Status
- draft: Event baru dibuat, belum ada trip
- in_progress: Minimal 1 trip dengan status in_progress atau completed
- completed: Semua trip sudah completed
- archived: Event lama (manual archive oleh user)

### Trip Status
- draft: Trip baru dibuat, checklist belum diisi
- in_progress: Minimal 1 item checklist sudah di-check
- completed: Semua item checklist sudah di-check

### Checklist Item State
- unchecked: Default state
- checked: User sudah centang, timestamp tercatat
- with_attachment: Item checked + ada file upload

### Auto-calculate Progress
- Progress Event = (completedTrips / totalTrips) × 100
- Progress Trip = (checkedItems / totalItems) × 100
- Progress per Step = (checkedItemsInCategory / totalItemsInCategory) × 100

---

## 8. Template Checklist Default

Setiap kali trip baru dibuat, sistem otomatis generate checklist items dari template:

### Template: Persiapan Dokumen (SPPD)
- SPPD dibuat dan ditandatangani
- Surat tugas dari atasan
- Foto copy KTP peserta
- Booking tiket pesawat/kereta
- Booking hotel
- Asuransi perjalanan

### Template: Logistik & Promosi
- Rollup banner (jumlah: ___)
- Flyer/brosur (jumlah: ___)
- Merchandise (jumlah: ___)
- Alat teknis (laptop, projector, dll)
- Kabel extension & adapter
- Name tag peserta

### Template: Keberangkatan
- Tiket sudah di-print
- Boarding pass tersimpan
- Hotel check-in selesai
- Alat teknis booth sudah tiba
- Merchandise sudah diterima
- Koordinasi dengan panitia event

### Template: Laporan Akhir
- Foto dokumentasi booth (minimal 5 foto)
- Foto interaksi dengan pengunjung
- Evaluasi jumlah pengunjung
- Evaluasi jumlah leads/prospek
- Catatan kendala selama event
- Rekomendasi untuk event selanjutnya

---

## 9. Execution Plan

### Fase 1: Fondasi & Desain (Hari 1-2)
- Setup repo Astro + Tailwind
- Terapkan konfigurasi Anti-Slop di tailwind.config.js
- Buat layout dasar (Navbar, Footer, Container)

### Fase 2: Database & GAS Proxy (Hari 3-4)
- Buat tabel di Supabase
- Tulis script GAS untuk endpoint POST dan fungsi DriveApp
- Test koneksi Frontend → GAS → Supabase/GDrive

### Fase 3: Form Wizard & PDF Generator (Hari 5-7)
- Bangun UI Multi-step form untuk 4 checklist
- Buat template HTML untuk PDF (gunakan CSS @page dan @media print)
- Implementasi library JS (html2pdf.js atau jspdf + html2canvas)

### Fase 4: Arsip & Polish (Hari 8-10)
- Bangun halaman Arsip yang mengambil data dari Supabase
- Pastikan semua halaman 100% responsif di HP
- Tambahkan animasi transisi halus antar halaman

### Fase 5: Deployment (Hari 11)
- Deploy Frontend ke GitHub Pages
- Publish GAS Web App
- Testing end-to-end di lapangan (simulasi pakai HP)

---

## 10. Cara Menggunakan Dokumen Ini

Dokumen ini dirancang sebagai panduan lengkap untuk development. Anda bisa:

1. **Copy-paste ke AI coding tools** (Cursor, GitHub Copilot, Claude) saat mulai coding
2. **Gunakan sebagai checklist** untuk memastikan semua fitur terimplementasi
3. **Referensi desain** untuk menjaga konsistensi UI/UX

**Contoh prompt untuk AI:**