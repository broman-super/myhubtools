# AI_PROMPT_LIBRARY.md
Kumpulan prompt siap pakai untuk AI Coding Assistant (Cursor, Copilot, Claude, dll) saat mengembangkan **Fieldwork & Event Booth Webtools**.

> 💡 **Cara pakai:** Copy prompt → paste ke AI → tambahkan konteks file yang relevan (PRD.md, TECHNICAL_ARCHITECTURE.md, dll).

---

## 🎯 Cara Menggunakan Prompt Ini

Sebelum menggunakan prompt, pastikan AI memiliki konteks:
```
Baca file-file berikut sebagai referensi:

- PRD.md (requirement lengkap)
- TECHNICAL_ARCHITECTURE.md (arsitektur sistem)
- API_SPECIFICATION.md (detail endpoint)
- DEVELOPMENT_CHECKLIST.md (progress tracking)
  ```

---

## 🏗️ FASE 1: Fondasi & Desain (Hari 1-2)

### Prompt 1.1: Setup Project Astro
```
Buat struktur project Astro.js untuk "Fieldwork & Event Booth Webtools" dengan spesifikasi:

- Astro.js v4+ dengan output static (untuk GitHub Pages)
- Tailwind CSS v3 terintegrasi
- Struktur folder sesuai TECHNICAL_ARCHITECTURE.md bagian A
- File .env dengan placeholder PUBLIC_GAS_ENDPOINT dan PUBLIC_API_TOKEN
- astro.config.mjs dengan base: '/fieldwork-webtools/' (untuk GitHub Pages)

Jangan install framework tambahan (React/Vue). Gunakan Vanilla JS + Alpine.js jika perlu interaktivitas.
```

### Prompt 1.2: Konfigurasi Anti-Slop Tailwind ``` Buat tailwind.config.js dengan desain system "Anti-Slop" sesuai PRD.md:

WAJIB:

- Background: #FAFAFA (off-white)
- Teks: #111111 (hampir hitam)
- Aksen: #991B1B (merah bata) dan #1E3A8A (biru navy)
- Font heading: Inter / system-ui, weight 800
- Font data/angka: JetBrains Mono (monospace)
- Border radius: override semua ke rounded-none, tambahkan utility .rounded-sm (2px)
- HAPUS semua default drop-shadow, box-shadow, gradient
- Tidak ada rounded-lg, rounded-xl, rounded-full

Tambahkan custom utilities:

- .border-thick (4px solid)
- .btn-primary (bg hitam, text putih, min-height 48px, rounded-sm)
- .card-event (border kiri 4px, bg putih, shadow-none)

Mobile-first, semua tombol min-height 48px untuk touch-friendly.
```

### Prompt 1.3: Layout Dasar & Navbar
```
Buat Layout.astro, Navbar.astro, dan Footer.astro dengan gaya "Anti-Slop":

Layout.astro:

- Container max-width 1200px, padding 16px mobile / 32px desktop
- Background #FAFAFA, text #111111
- Font Inter untuk body

Navbar.astro:

- Logo kiri (text tebal, bukan gambar)
- Menu: Dashboard, Arsip, Roadmap
- Sticky top, border bawah tipis 1px #E5E5E5
- Mobile: hamburger menu dengan slide-in panel

Footer.astro:

- Text kecil, warna #666
- Border atas tipis

Tidak ada gradient, tidak ada shadow, tidak ada rounded besar.
```

---

## 🗄️ FASE 2: Database & GAS (Hari 3-4)

### Prompt 2.1: SQL Schema Supabase
```
Buat SQL script untuk membuat 4 tabel di Supabase sesuai PRD.md section 4:

1. events (id uuid PK, event_name, event_date, location, status enum, timestamps)
2. trips (id uuid PK, event_id FK, trip_type enum, sppd_number, start_date, end_date, personnel text[], notes, status enum, timestamps)
3. checklist_items (id uuid PK, trip_id FK, category enum, item_name, is_checked boolean, checked_at, notes, attachment_url, order_index int)
4. documents (id uuid PK, trip_id FK, document_type enum, gdrive_file_id, gdrive_url, generated_at)

Tambahkan:

- RLS enabled untuk semua tabel
- Policy allow all via service_role (karena akses dari GAS)
- Index untuk kolom yang sering di-query (event_id, trip_id, status)
- Function auto-generate UUID
- Trigger updated_at otomatis

Sertakan juga INSERT untuk template checklist default (24 items, 6 per kategori) sesuai PRD section 8.
```

### Prompt 2.2: Google Apps Script Middleware ``` Buat Code.gs untuk Google Apps Script sebagai API Gateway dengan spesifikasi:

Konfigurasi:

- SUPABASE_URL, SUPABASE_SERVICE_KEY, API_TOKEN, DRIVE_FOLDER_NAME

Fungsi utama:

1. doPost(e) - router utama, validasi token, parse JSON, route ke action
2. supabaseQuery(endpoint, method, body) - helper query ke Supabase REST API
3. uploadFile(data) - decode Base64 → Blob → upload ke GDrive
4. getOrCreateFolder(name) - helper cari/buat folder di Drive

Actions yang harus diimplementasi (sesuai API_SPECIFICATION.md):

- get_events, create_event, get_event_detail, update_event
- create_trip (auto-generate 24 checklist items dari template)
- get_checklist, update_checklist
- upload_file (foto & PDF)
- save_document, complete_trip
- get_archive (dengan filter bulan/tahun & search)

Error handling:

- Return JSON standar {success, data/message, error}
- Validasi field wajib
- Try-catch di setiap fungsi

Deploy sebagai Web App, Execute as Me, Access Anyone.
```

### Prompt 2.3: Frontend API Client
```
Buat src/lib/api.js sebagai wrapper untuk komunikasi dengan GAS endpoint.

Fungsi yang dibutuhkan:

- getEvents()
- createEvent(data)
- getEventDetail(eventId)
- updateEvent(eventId, status)
- createTrip(data)
- getChecklist(tripId)
- updateChecklist(data)
- uploadFile(file, tripId, itemId?)
- saveDocument(data)
- completeTrip(tripId)
- getArchive(filters)

Setiap fungsi:

- Ambil endpoint & token dari import.meta.env
- Kirim POST dengan body JSON
- Return response.data atau throw error
- Handle error dengan message yang jelas

Helper:

- fileToBase64(file) - convert File ke Base64 string (strip prefix data:...)
- handleApiError(error) - format error message user-friendly
  ```

---

## 🧩 FASE 3: Form Wizard & PDF (Hari 5-7)

### Prompt 3.1: Event & Trip Management UI
```
Buat halaman dan komponen untuk manajemen Event dan Trip:

1. index.astro (Dashboard):
  - Overview stats: Active Events, In Progress, Completed This Month
  - List EventCard (nama, tanggal, lokasi, progress bar, status badge)
  - Tombol "+ Buat Event Baru" → buka Modal

2. event/new.astro (Modal/Form buat event):
  - Input: nama, tanggal (date picker), lokasi
  - Submit → POST create_event → redirect ke detail

3. event/[id].astro (Detail Event):
  - Header: nama, tanggal, lokasi
  - Progress overview (overall + per kategori dengan emoji ✅🔄⏳)
  - List TripCard (tanggal, personnel, status, tombol "Buka Checklist")
  - Tombol "+ Tambah Perjalanan Baru"
  - Section "Dokumen Tergenerate" (list PDF)

4. Komponen: EventCard.astro, TripCard.astro, Modal.astro, ProgressBar.astro

Semua komponen harus:

- Mobile-first, tombol min-height 48px
- Border kiri EventCard 4px dengan warna sesuai status
- Progress bar dengan warna dinamis (merah <30%, kuning 30-70%, hijau >70%)
- Tanpa rounded besar, tanpa shadow, tanpa gradient
  ```

### Prompt 3.2: Multi-step Checklist Form
```
Buat halaman trip/checklist/[id].astro dengan multi-step form:

Struktur:

- StepIndicator di atas (4 step: Dokumen → Logistik → Keberangkatan → Laporan)
- Progress bar per step
- List ChecklistItem per kategori aktif
- Navigasi: Kembali, Selanjutnya, Simpan Draft

ChecklistItem.astro:

- Checkbox custom (kotak tajam, border 2px)
- Saat checked: animasi fade-in 200ms, teks strikethrough
- Field catatan (muncul saat checked, textarea)
- Tombol upload foto (muncul untuk item tertentu: tiket, boarding pass, foto dokumentasi)
- Preview thumbnail jika sudah ada attachment

Interaksi:

- Auto-save setiap perubahan dengan debounce 500ms
- Progress bar update real-time (lokal dulu, sync ke server)
- Tombol "Selanjutnya" aktif jika minimal 1 item di-check
- Saat upload foto: convert ke Base64 → POST upload_file → simpan URL

State management:

- Gunakan Alpine.js x-data untuk state lokal
- Fetch data awal via get_checklist
- Sync ke server via update_checklist

Mobile UX:

- Checkbox besar (min 44x44px) untuk mudah di-tap
- Upload foto langsung dari kamera HP (accept="image/*" capture="environment")
- Sticky bottom bar untuk tombol navigasi
  ```

### Prompt 3.3: PDF Generator
```
Buat sistem PDF generation di frontend dengan spesifikasi:

Library: html2pdf.js (atau jspdf + html2canvas)

File src/lib/pdf.js:

- generateTripReport(tripData) - generate PDF laporan akhir trip
- generateChecklistReport(tripId, category) - generate PDF per kategori

Template HTML PDF:

- Gunakan CSS @page A4, margin 20mm
- Header: Logo perusahaan (text), judul dokumen, nomor SPPD
- Section: Data Event, Data Trip, Personnel
- Table checklist dengan kolom: No, Item, Status (✓/✗), Catatan, Bukti (link)
- Footer: Tanggal generate, tanda tangan digital (text)
- Gunakan @media print untuk styling khusus

Flow (sesuai Flow 3 di TECHNICAL_ARCHITECTURE.md):

1. Fetch semua data trip via get_checklist
2. Render HTML template dengan data
3. Convert HTML → PDF (A4, portrait)
4. Convert PDF → Base64
5. POST upload_file ke GAS dengan document_type: "final_report"
6. POST save_document untuk simpan metadata
7. POST complete_trip untuk ubah status trip → completed
8. Redirect ke halaman detail event

Styling PDF harus IDENTIK dengan format resmi perusahaan (tajam, formal, tanpa warna-warni).
```

---

## 📦 FASE 4: Arsip & Polish (Hari 8-10)

### Prompt 4.1: Halaman Arsip
```
Buat halaman archive.astro dengan fitur:

Konten:

- Header "Arsip Event"
- Filter bar: dropdown bulan, dropdown tahun, search input nama event
- Grid/list event cards (hanya status completed/archived)
- Setiap card tampilkan: nama, tanggal, lokasi, jumlah dokumen, tombol "Lihat Detail"

Interaksi:

- Filter real-time (debounce 300ms untuk search)
- Klik event → expand atau navigate ke detail dengan section dokumen
- Klik dokumen → buka tab baru ke Google Drive URL

Mobile:

- Filter jadi collapsible
- Card full-width
- Tombol besar untuk touch

Data dari endpoint get_archive dengan parameter filter_month, filter_year, search.
```

### Prompt 4.2: Mobile UX Audit & Micro-interactions ``` Lakukan audit dan perbaikan Mobile UX untuk semua halaman:

Checklist Anti-Slop (WAJIB PASS):

- [ ] TIDAK ADA rounded-lg, rounded-xl, rounded-full
- [ ] TIDAK ADA gradient warna-warni
- [ ] TIDAK ADA drop-shadow atau box-shadow berlebihan
- [ ] Semua tombol min-height 48px
- [ ] Touch target minimal 44x44px
- [ ] Font size minimal 16px untuk input (hindari zoom iOS)
- [ ] Whitespace disengaja (padding cukup)

Micro-interactions (CSS murni):

- Hover button: opacity 0.9, transition 200ms ease-out
- Checkbox checked: fade-in checkmark 200ms
- Page transition: fade 200ms
- NO bounce, NO spring, NO overshoot

Mobile-specific:

- Sticky bottom bar untuk aksi utama di halaman checklist
- Swipe gesture (opsional) untuk navigasi step
- Pull-to-refresh (opsional) di dashboard
- Safe area untuk notch/home indicator
- Prevent zoom on input focus

Tambahkan CSS global untuk semua micro-interactions di src/styles/global.css.
```

### Prompt 4.3: End-to-End Testing
```
Buat skenario testing end-to-end untuk Fieldwork Webtools:

Test Flow 1 (Create Event):

- Buka dashboard
- Klik "+ Buat Event Baru"
- Isi form, submit
- Verifikasi event muncul di list dengan status draft
- Verifikasi redirect ke detail

Test Flow 2 (Create Trip + Checklist):

- Di detail event, klik "+ Tambah Perjalanan Baru"
- Isi form trip, submit
- Verifikasi checklist items ter-generate (24 items)
- Verifikasi redirect ke step 1

Test Flow 3 (Isi Checklist + Upload):

- Centang 3 item di step 1
- Verifikasi auto-save (cek Supabase)
- Upload foto untuk 1 item
- Verifikasi foto muncul di GDrive
- Verifikasi URL tersimpan di Supabase
- Lanjut ke step 2, 3, 4

Test Flow 4 (Generate PDF):

- Di step 4, klik "Generate Laporan Akhir"
- Verifikasi PDF ter-download
- Verifikasi PDF muncul di GDrive
- Verifikasi metadata tersimpan di tabel documents
- Verifikasi status trip → completed
- Verifikasi status event auto-update

Test Flow 5 (Arsip):

- Buka halaman arsip
- Filter berdasarkan bulan
- Search nama event
- Klik event, klik dokumen
- Verifikasi dokumen terbuka di tab baru

Untuk setiap test, catatkan: expected result, actual result, screenshot (jika gagal).
```

---

## 🚀 FASE 5: Deployment (Hari 11)

### Prompt 5.1: GitHub Actions Workflow
```
Buat file .github/workflows/deploy.yml untuk auto-deploy Astro ke GitHub Pages:

Trigger: push ke branch main
Steps:

1. Checkout code
2. Setup Node.js 18
3. Cache npm dependencies
4. Install dependencies (npm ci)
5. Build Astro (npm run build)
6. Deploy ke GitHub Pages menggunakan peaceiris/actions-gh-pages@v3
  - publish_dir: ./dist
  - github_token: ${{ secrets.GITHUB_TOKEN }}

Tambahkan juga:

- Environment variables dari GitHub Secrets (jika perlu)
- Badge status di README
- Script post-build untuk verifikasi output

Pastikan base URL di astro.config.mjs sesuai dengan nama repo GitHub.
```

### Prompt 5.2: README.md Project
```
Buat README.md profesional untuk repository Fieldwork Webtools:

Struktur:

1. Header dengan nama project & badge (build status, license)
2. Deskripsi singkat (1 paragraf)
3. Screenshot / Demo GIF (placeholder)
4. Fitur Utama (bullet points)
5. Tech Stack (table)
6. Arsitektur Sistem (diagram ASCII atau link ke TECHNICAL_ARCHITECTURE.md)
7. Quick Start:
  - Prerequisites
  - Clone & install
  - Setup .env
  - Setup Supabase (link ke SQL script)
  - Setup GAS (link ke Code.gs)
  - Run local dev
8. Deployment Guide:
  - Frontend (GitHub Pages)
  - GAS (Web App)
  - Supabase (project setup)
9. Dokumentasi (link ke file-file .md)
10. Contributing / License

Gaya: profesional, ringkas, banyak link ke file dokumentasi internal.
```

---

## ## 🐛 Troubleshooting Prompts

### Prompt T.1: Debug CORS Error
```
Saya dapat error CORS saat frontend memanggil GAS endpoint:
"Access to fetch at '[script.google.com](https://script.google.com/)...' has been blocked by CORS policy"

Request saya:
[paste kode fetch]

Tolong:

1. Analisis penyebab (biasanya karena GAS belum di-deploy sebagai Web App, atau mode deployment salah)
2. Berikan solusi step-by-step
3. Verifikasi apakah ada masalah di cara saya memanggil endpoint
  ```

### Prompt T.2: Debug Base64 Upload Gagal
```
Upload foto dari frontend ke GAS gagal. Error di GAS:
"Exception: Invalid base64 input"

Kode frontend (fileToBase64):
[paste kode]

Kode GAS (uploadFile):
[paste kode]

Tolong:

1. Cek apakah format Base64 sudah benar (tanpa prefix data:...)
2. Verifikasi cara decode di GAS (Utilities.base64Decode)
3. Berikan versi yang diperbaiki untuk kedua sisi
4. Tambahkan error handling yang lebih baik
  ```

### Prompt T.3: Debug PDF Tidak Ter-generate
```
Tombol "Generate Laporan" tidak menghasilkan PDF. Tidak ada error di console, tapi file tidak muncul.

Kode pdf.js:
[paste kode]

Tolong:

1. Cek apakah html2pdf.js sudah di-import dengan benar
2. Verifikasi apakah selector HTML target sudah ada
3. Cek apakah ada masalah dengan CSS @page / @media print
4. Berikan versi debug dengan logging di setiap step
5. Pastikan flow upload ke GAS sudah benar
  ```

### Prompt T.4: Optimize Performance Mobile
```
Aplikasi terasa lambat di HP saat load dashboard dan buka checklist.

Kondisi saat ini:

- Astro output: static
- Jumlah event: ~50
- Jumlah checklist items per trip: 24
- Ada banyak gambar preview dari GDrive

Tolong analisis dan berikan solusi:

1. Lazy loading untuk gambar
2. Virtual scrolling untuk list panjang
3. Caching strategy (localStorage / sessionStorage)
4. Image optimization (compress sebelum upload)
5. Code splitting (jika perlu)
6. Preload data kritis

Prioritaskan solusi yang paling impact dengan effort minimal.
```

---

## ## 🎨 Design Prompts

### Prompt D.1: Generate Komponen Spesifik
```
Buat komponen [NAMA_KOMPONEN].astro dengan spesifikasi:

Fungsi: [deskripsi]
Props: [list props dengan tipe]
Style: Anti-Slop (rounded-sm max, no shadow, no gradient) Mobile: touch-friendly, min-height 48px untuk interactive elements Animasi: micro-interaction CSS 200ms ease-out (jika relevan)

Contoh penggunaan:
[paste contoh HTML]

Referensi desain: lihat PRD.md section 3 (Design Guidelines) ```

### Prompt D.2: Konversi Design ke Code
```
Konversi deskripsi desain berikut menjadi komponen Astro + Tailwind:

[Deskripsi desain detail: layout, warna, spacing, tipografi, interaksi]

Constraint:

- WAJIB Anti-Slop style
- Mobile-first
- Gunakan warna dari tailwind.config.js (bg-primary, text-primary, accent-red, accent-blue)
- Tidak boleh ada inline style kecuali untuk dynamic values

Output:

1. File .astro lengkap
2. Penjelasan struktur
3. Contoh penggunaan
  ```

---

## 📝 Prompt Template (Blank)

Gunakan template ini untuk membuat prompt custom:

```
Konteks:

- Project: Fieldwork & Event Booth Webtools
- Referensi: PRD.md, TECHNICAL_ARCHITECTURE.md, API_SPECIFICATION.md
- Hari ke: [X] dari execution plan
- File yang sedang dikerjakan: [nama file]

Tugas:
[Deskripsi tugas spesifik]

Constraint:

- Design: Anti-Slop (lihat PRD section 3)
- Mobile-first
- Vanilla JS / Alpine.js (no React/Vue)
- Follow API_SPECIFICATION.md untuk integrasi GAS

Output yang diharapkan:
[Format output: kode, penjelasan, checklist, dll]

Contoh referensi (jika ada):
[paste kode atau desain yang jadi acuan]
```

---

## 💡 Tips Menggunakan Prompt

1. **Spesifik > Umum:** Semakin detail prompt, semakin akurat output AI
2. **Sertakan Konteks:** Selalu sebutkan file referensi yang relevan
3. **Iteratif:** Jika output pertama kurang pas, berikan feedback spesifik
4. **Verifikasi:** Selalu cek hasil AI terhadap PRD & Technical Architecture
5. **Simpan Prompt Bagus:** Jika ada prompt yang menghasilkan output bagus, simpan di bagian atas file ini untuk reuse

---

## 📚 Prompt per Hari (Quick Reference)

| Hari | Fokus | Prompt Utama |
| --- | --- | --- |
| 1 | Setup Project | 1.1, 1.2 |
| 2 | UI Components | 1.3, 3.1 |
| 3 | Database | 2.1 |
| 4 | GAS Middleware | 2.2, 2.3 |
| 5 | Event & Trip UI | 3.1 |
| 6 | Checklist Form | 3.2 |
| 7 | PDF Generator | 3.3 |
| 8 | Arsip | 4.1 |
| 9 | Mobile Polish | 4.2 |
| 10 | Testing | 4.3, T.1-T.4 |
| 11 | Deployment | 5.1, 5.2 |

Gunakan tabel ini sebagai quick reference saat mulai kerja harian.
