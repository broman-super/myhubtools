# DEVELOPMENT_CHECKLIST.md
Dokumen ini digunakan untuk melacak progress pengembangan **Fieldwork & Event Booth Webtools** secara harian. 
Centang `[x]` setiap tugas yang telah selesai diselesaikan.

---

## 📋 Fase 1: Fondasi & Desain (Hari 1-2)
**Fokus:** Setup repository, konfigurasi design system "Anti-Slop", dan struktur dasar.

### Hari 1: Setup Project & Design System
- [ ] Inisialisasi project Astro.js (`npm create astro@latest`).
- [ ] Install dan konfigurasi Tailwind CSS.
- [ ] **Konfigurasi Anti-Slop di `tailwind.config.js`:**
  - [ ] Set warna background (`#FAFAFA`), teks (`#111111`), aksen (`#991B1B` / `#1E3A8A`).
  - [ ] Set font family (Inter/System UI untuk heading, JetBrains Mono untuk angka).
  - [ ] Override default border-radius menjadi `rounded-none` atau `rounded-sm` (2px).
  - [ ] Hapus/disable default drop-shadow dan gradient.
- [ ] Buat struktur folder (`src/pages`, `src/components`, `src/lib`, `src/layouts`).
- [ ] Buat file `.env` dan isi `PUBLIC_GAS_ENDPOINT` (placeholder) & `PUBLIC_API_TOKEN`.
- [ ] Buat Layout dasar (`Layout.astro`), `Navbar.astro`, dan `Footer.astro`.

### Hari 2: UI Components & Static Pages
- [ ] Buat komponen reusable: `EventCard`, `TripCard`, `ChecklistItem`.
- [ ] Buat komponen UI: `ProgressBar`, `StepIndicator`, `Modal`.
- [ ] Buat halaman statis: `index.astro` (Dashboard dummy), `archive.astro`, `roadmap.astro`.
- [ ] Pastikan semua komponen mematuhi aturan *Mobile UX* (tombol min-height 48px, whitespace disengaja).

---

## 🗄️ Fase 2: Database & GAS Proxy (Hari 3-4)
**Fokus:** Membangun backend infrastructure (Supabase & Google Apps Script).

### Hari 3: Supabase & Database Setup
- [ ] Buat project baru di Supabase.
- [ ] Eksekusi SQL untuk membuat tabel: `events`, `trips`, `checklist_items`, `documents`.
- [ ] Setup Row Level Security (RLS) / Policy untuk allow all operations via Service Role Key.
- [ ] Insert data *seed* / template default untuk 4 kategori checklist (Dokumen, Logistik, Keberangkatan, Laporan).
- [ ] Copy `Project URL` dan `Service Role Key` untuk digunakan di GAS.

### Hari 4: Google Apps Script (GAS) Middleware
- [ ] Buat project baru di Google Apps Script (`script.google.com`).
- [ ] Implementasi fungsi `doPost(e)` sebagai API Gateway & router.
- [ ] Implementasi validasi `API_TOKEN` untuk keamanan.
- [ ] Buat fungsi helper `supabaseQuery(endpoint, method, body)` untuk komunikasi dengan Supabase.
- [ ] Buat fungsi helper `uploadFile(data)` dan `getOrCreateFolder(name)` untuk Google Drive.
- [ ] **Deploy GAS:** Pilih *Web app*, Execute as: *Me*, Access: *Anyone*.
- [ ] Copy URL deployment GAS, paste ke `.env` frontend (`PUBLIC_GAS_ENDPOINT`).
- [ ] Test endpoint GAS menggunakan Postman/cURL (Test action: `get_events`, `upload_file`).

---

## 🧩 Fase 3: Form Wizard & PDF Generator (Hari 5-7)
**Fokus:** Membangun logika bisnis utama, multi-step form, dan integrasi file.

### Hari 5: Event & Trip Management
- [ ] Implementasi `src/lib/api.js` (fungsi `fetch` ke GAS dengan token).
- [ ] Bangun fitur "Buat Event Baru" (Modal + POST ke GAS).
- [ ] Bangun halaman `event/[id].astro` (Detail Event, fetch data trips & progress).
- [ ] Bangun fitur "Tambah Perjalanan Baru" (POST ke GAS, trigger auto-generate checklist items).

### Hari 6: Multi-step Checklist Form
- [ ] Bangun halaman `trip/checklist/[id].astro` dengan Step Indicator (4 Steps).
- [ ] Implementasi logika checkbox, auto-save (debounced 500ms), dan field catatan.
- [ ] Implementasi fitur Upload Foto (Frontend convert Base64 → kirim ke GAS → GAS upload ke GDrive).
- [ ] Pastikan `attachment_url` dari GDrive tersimpan dan ter-update di Supabase.
- [ ] Test Flow 1 (Simpan Data Checklist) dan Flow 2 (Upload File).

### Hari 7: PDF Generation & Final Report
- [ ] Install library PDF (`html2pdf.js` atau `jspdf` + `html2canvas`).
- [ ] Buat template HTML/CSS khusus untuk PDF (gunakan `@page` dan `@media print`).
- [ ] Implementasi Flow 3: Render HTML → Convert ke PDF → Base64 → Upload via GAS → Simpan metadata di tabel `documents`.
- [ ] Pastikan status `trip` berubah menjadi `completed` setelah PDF berhasil di-generate.
- [ ] Tampilkan link download PDF di halaman Detail Event.

---

## 📦 Fase 4: Arsip, Polish & Mobile UX (Hari 8-10)
**Fokus:** Menyelesaikan halaman sekunder, optimasi UX, dan testing menyeluruh.

### Hari 8: Halaman Arsip & Dokumentasi
- [ ] Bangun halaman Arsip (`archive.astro`) yang mengambil data event `completed` / `archived`.
- [ ] Tambahkan fitur filter (bulan/tahun) dan pencarian (nama event).
- [ ] Tampilkan list dokumen PDF yang sudah di-generate dari tabel `documents`.
- [ ] Pastikan link dokumen membuka tab baru di Google Drive.

### Hari 9: Mobile UX & Micro-interactions
- [ ] Audit UI: Pastikan **TIDAK ADA** `rounded-lg`, `rounded-full`, gradient, atau `drop-shadow` (Anti-Slop check).
- [ ] Tambahkan micro-interactions CSS murni (transisi opacity/transform 200ms ease-out, tanpa bounce).
- [ ] Test responsivitas di berbagai ukuran layar HP (terutama saat mengisi checklist dan upload foto).
- [ ] Pastikan area klik (touch target) nyaman untuk jempol.

### Hari 10: End-to-End Testing & Bug Fixing
- [ ] Test Flow 1 s/d Flow 4 secara berurutan dari Dashboard sampai Arsip.
- [ ] Verifikasi kalkulasi *Auto-calculate Progress* (Event, Trip, dan per Step).
- [ ] Verifikasi Status Workflow (draft → in_progress → completed → archived).
- [ ] Troubleshooting: Cek CORS, permission folder GDrive, dan validitas Supabase Key jika ada error.

---

## 🚀 Fase 5: Deployment (Hari 11)
**Fokus:** Memastikan aplikasi live, aman, dan siap digunakan di lapangan.

### Hari 11: Final Deployment
- [ ] Buat file `.github/workflows/deploy.yml` untuk GitHub Actions (auto-build Astro ke `/dist`).
- [ ] Push semua kode final ke repository GitHub (branch `main`).
- [ ] Aktifkan GitHub Pages di Settings → Pages (Source: GitHub Actions).
- [ ] Verifikasi URL frontend live dan dapat diakses publik.
- [ ] **Field Testing Simulation:** Buka URL di HP, simulasikan pengisian checklist di lapangan (tes upload foto via kamera HP).
- [ ] Done! 🎉

---

## 🛑 Definition of Done (DoD) & Testing Checklist
Sebelum menyatakan project selesai, pastikan semua poin di bawah ini sudah *pass*:

- [ ] Frontend berhasil connect ke GAS tanpa CORS error.
- [ ] GAS berhasil query & mutate data di Supabase.
- [ ] GAS berhasil upload file (Foto/PDF) ke Google Drive dengan permission yang benar.
- [ ] Create Event & Create Trip berjalan mulus (termasuk auto-generate checklist).
- [ ] Update Checklist tersimpan real-time dan progress bar update.
- [ ] Upload foto dari HP berhasil dan URL tersimpan di DB.
- [ ] Generate PDF berhasil, format identik dengan standar resmi, dan tersimpan di GDrive.
- [ ] Link PDF dari frontend bisa dibuka dan di-download.
- [ ] UI 100% mematuhi guideline "Anti-Slop" (Tajam, minimalis, tipografi tegas).
- [ ] Semua halaman 100% responsif dan mudah digunakan di HP (Mobile-First).

---

## 📝 Log Harian / Catatan Troubleshooting
*Gunakan bagian ini untuk mencatat bug, error, atau solusi yang ditemukan selama development.*

**Hari ke- :**
- **Tugas:** 
- **Kendala:** 
- **Solusi / Catatan:** 

---

## 🧭 Lampiran: Peta Status & Migrasi Data dari Prototype (ArchiveDoc)

Prototype lama (SPPD Toolbox, vanilla JS + localStorage) memakai 6 status event.
Status workflow baru (Supabase) hanya punya 4. **Peta wajib** ini harus dipakai
ketika menulis skrip migrasi agar tidak ada data yang hilang diam-diam:

| Status prototype (localStorage) | Status Supabase (`events.status`) | Catatan |
|---|---|---|
| `draft` | `draft` | Baru dibuat / belum lengkap |
| `diajukan` | `in_progress` | SPPD diajukan, menunggu approval |
| `berjalan` | `in_progress` | Trip berlangsung / checklist berjalan |
| `disetujui` | `in_progress` | Approval selesai, siap laporan |
| `selesai` | `completed` | Laporan disetor, saldo tuntas |
| `dibatalkan` | `archived` | Batal / arsip |

Status item checklist di prototype juga perlu dipetakan ke `checklist_items.is_checked`:
`todo` → `false`, `aktif` → `false`, `selesai` → `true`.

### Format backup = format seed migrasi
- Prototype punya tombol **Backup ke File (JSON)** di Pengaturan (`data:export`)
  dan **Pulihkan dari File** (`data:import`). File backup = snapshot penuh
  key `sppd_toolbox_db_v1` (events, sppd, transports, eventProducts, sales,
  expenses, milestones, kasAdj, prepItems, checklistTemplates, checklistItems, settings).
- Sebelum cutover ke Supabase: **wajib** ekspor backup terlebih dahulu.
- Mapping field saat migrasi (prototype → columns):
  - `events[].id` → `events.id` (self: bikin `id_lama` untuk traceability)
  - `events[].nama` → `event_name`, `events[].lokasi` → `location`
  - `events[].tanggalMulai` → `event_date` (atau `trips.start_date`)
  - `sppd[].noSurat` → `trips.sppd_number`
  - `prepItems[].{nama,kategori,biaya,qty,status}` + `checklistTemplates[]` → `checklist_items` (auto-generate 24 item per trip)
  - `sales[]`, `expenses[]`, `kasAdj[]`, `milestones[]` → lampiran laporan PDF / tabel pelengkap
- Selama prototype masih dipakai operasional, backup JSON menggantikan database cloud.

---
### Fase 5 - Audit pemahaman menu/alur/data (council, selesai)
- Verifikasi read-path: semua entitas terbaca & tertulis, tidak ada phantom (nama asli: sales, expenses, kasAdj, transports). `LEGACY` di pages.js:176 mengalihkan URL tab lama ke tab baru.
- Struktur nyata: 8 rute -> 4 halaman umum + 2 katalog (Produk, Master Barang) + event (3 tab: Roadmap Pengawasan / Persiapan = 5 seksi / Uang & Laporan = 3 seksi).
- Panduan (#/guide) diperkuat menjadi peta interaktif: blok "Peta Menu - 8 halaman" (tautan klik ke tiap halaman), "Alur utama" (tautan klik ke 3 tab event pertama), "Keterhubungan Data" (rumus saldo, relasi katalog ke seksi 02/03, pernyataan localStorage = database, belum ada server).
- Keputusan council: (A) peta terpisah & (C) redesign nav ditolak. Diambil jalur D (Panduan in-app) + stop-rule Critic (kode tidak disentuh tanpa bukti kontradiksi). Selisih kosmetik label nav vs judul halaman ("Produk" vs "Master Produk", "Master Barang" vs "Master Barang Dibawa") sengaja tidak diubah.
- Hasil diagnostik user: paham localStorage; titik nyeri = alur antar tab & data antar halaman -> ditangani lewat Panduan interaktif.
- Verifikasi: cscript parse OK; check5 (Panduan + klik) 8/8 PASS; check (regresi) 7/7 PASS; mojibake 0. pages2.js SHA256 D17EE558E735875FE1858579D9C8DA5BCD6792158975F340FECE6AFC4E2D650E.

---
### Fase 6 - "Checklist Item Persiapan" dikembalikan ke model checklist (defect penalaran)
- Keluhan user: seksi 03 dinamai checklist tapi berperilaku seperti daftar pemesanan (dropdown Belum dipesan/Dalam proses/Disetujui; subtitle sewa hotel/tiket). Diperbaiki menjadi CHECKBOX: dicentang = `status:'selesai'` ("Sudah dibawa"), tidak = `'belum'`.
- Breaking-model (PENTING UTK MIGRASI): `prepItems[].status` kini BINER (`belum`|`selesai`). Normalisasi di `load()` & `importJSON`: status `proses`/`disetujui` yg tersisa dari DB lama otomatis menjadi `belum`. Di UI, item lama dengan status tsb tampil sebagai "Belum dibawa".
- Fly: field "Status awal" di form manual dihapus (default belum); kategori manual jadi [Alat & Tools, Perbekalan, Materi Kerja, Konsumsi, Lainnya]; subtitle & kosong-state menjelaskan uang (sewa/tiket) dicatat di tab Uang & Laporan. Seed dummy diselaraskan. Handler `prepitem:setstatus` lama dipertahankan (mati, tidak ter-render); handler baru `prepitem:done`.
- Konsistensi diverifikasi: semua read-path `p.status` biner (berangkatOk/prepItemsDone/cross-check/rekap/laporan cetak). Sisa kata `disetujui`/`proses` di kode hanya untuk SPPD/event, bukan prepItems.
- Verifikasi: cscript parse OK; check6 (perilaku baru+toggle) 6/6; check6b (normalisasi DB lama) 2/2; regresi check/check3/check4/check5 semua PASS; mojibake 0. Hash baru: store.js 93C9E137...; pages2.js 4C8F5EAE...; actions.js B118F310....
- Catatan: QA subagent divisi tidak dapat diluncurkan (limit env) — pemeriksaan QA dilakukan inline dengan hasil bersih. 

---
### Fase 7 - Tab Persiapan: alur seksi diurutkan ulang + keterbacaan (audit flow user)
- Keluhan user: "flow tab Persiapan kurang jelas & kurang mudah dibaca". Audit (read-only) menemukan: (1) urutan seksi melawan narasi kerja — Jadwal/milestones (rencana) ada di posisi 5, Cross-check (verifikasi) di tengah; (2) tanpa jembatan antar-seksi; (3) seksi 03/04 lama menimbun 5 kartu dgn checklist harian terkubur; (4) label "Checklist" 3x bentrok; (5) jargon bocor ("Simpan ke Data Base", "di DB", "Form Khusus", badge "terhitung/tunggu cek").
- URUTAN SEKSI BARU: 01 SPPD & Perjalanan → 02 Jadwal (Timeline) → 03 Produk & Qty → 04 Item Persiapan → 05 Cross-check Berangkat/Pulang. Murni render-order — tanpa ubah data model/action/formula.
- Sambungan: blok `flowbar` (pill 01-05 klik → scroll halus via action baru `scroll:to`) + baris status rekap per seksi (`psec-sub`) yang read-only (SPPD status, jumlah rute/tahap/produk/item, verdict berangkat/pulang).
- Seksi 04 (Item Persiapan): urutan kartu dibalik — checklist harian jadi kartu pertama; master pick & konfirmasi & form manual turun ke bawah. Kategori stat-card misleading text disesuaikan.
- Bahasa: "Produk & Checklist"→"Produk & Qty"; "Checklist Persiapan"→"Cek Persiapan" (roadmap); badge pulang → "dibawa pulang"/"belum dibawa pulang"; "Simpan ke Data Base"→"Simpan ke Item Persiapan"; "di DB"→"tercatat"; "Form Khusus"→"Konfirmasi Item Pilihan". Semua referensi "seksi NN" (empty-state, ringkasan, cross-check, guide) ikut diperbarui.
- CSS: `.psec-sub`, `.flowbar`, `.flow-pill`, `scroll-margin-top` pada `.psec`. CATATAN: `var(--text-muted)` TIDAK ada (Tailwind CDN hanya bikin utilitas `.text-muted`, bukan var) → pakai `var(--text-secondary)`.
- Verifikasi: check6 9/9 (baru: urutan-seksi, flowbar-sub, jargon-bersih), check6b 2/2, check5 8/8, check3 6/6, check/check4 PASS; cscript parse OK; mojibake 0. Hash: pages2.js 77354B95..., pages.js 538FF912..., actions.js B193A8D8..., styles.css 5CAAE5F6.... (ui/store/app TIDAK berubah.)
- Catatan: `check2.html` adalah harness warisan era "Barang yang Dibawa"/seksi-06 — TIDAK lagi bagian suite aktif. 

---
### Fase 8 - Rombak IA: 3 tab -> 1 "Layar Kerja" per event (keputusan Arsitektur A, atas kuasa user)
- Pertanyaan user: "Apakah kita perlu perubahan arsitektur? Aku rasa kurang efektif" → sumbu dipilih: Struktur tampilan/navigasi (IA). Council (`skill council`, 4 suara: Architect A / Skeptic B-measured / Pragmatist B / Critic C-dulu) MENOLAK rombak besar A sekarang (tanpa bukti pemakaian nyata; rekomendasi = hotfix + widget B). USER MENGOVERRIDE memilih "Langsung ke A". Eksekusi A dijalankan dengan jalan aman: REUSE 100% fungsi render teruji; tanpa ubah model data/action/formula; disertai hotfix defect nyata.
- DEFECT NYATA (dari sudut itu Critic): `A.bringSel` (pilihan Master Barang) tidak di-reset saat pindah event → pilihan event A bisa tercatat ke event B. Fix: guard di `eventDetail(id)`: jika `A.bringEv !== id` → `A.bringSel = {}`. `bring:commit` kini set `A.bringEv = d.event`. Terverifikasi oleh tes cross-event.
- NAVIGASI: `TABS` jadi satu `{ key:'kerja', label:'Layar Kerja' }`; `LEGACY` memetakan semua rute lama (roadmap/ringkasan/persiapan/sppd/produk/timeline/uang/penjualan/keuangan) → `kerja`; bar `tabseg` dihapus dari event detail. URL lama (`#/events/:id/persiapan` dst) tetap bekerja.
- LAYAR KERJA (`tabKerja` di pages2.js): hero `Progres persiapan` (pct milestone, checks, tombol Cetak SPPD / Edit SPP (scroll ke seksi 01) / Download) + kartu `Cek Persiapan` + bar `flowbar "Alur Kerja"` 8 pill (scroll:to) + 8 seksi `psec` (dgn `psec-sub` status + tombol lipat baru `psec:toggle`, indikator selesai):
  - 01 SPPD & Perjalanan (A.tabSppd) · 02 Jadwal (tabTimeline) · 03 Produk & Qty (tabProduk) · 04 Item Persiapan (tabPrepItems) · 05 Uang — Penjualan (tabPenjualan) · 06 Uang — Pengeluaran & Penyesuaian (tabKeuangan) · 07 Uang — Laporan (tabLaporan) · 08 Cross-check Berangkat/Pulang (tabCrossCheck).
- ANTI-HILANG-FUNGSI: bukti dokumen per milestone (sebelumnya hanya di Roadmap kini tak ter-render) dipindahkan ke seksi 02 — baris timeline sekarang punya tombol "+ Dokumen" + chip bukti + hapus (`milestone:att:*`); `tabRoadmap`/`tabPersiapan`/`tabUang` lama dipertahankan (dead-but-valid).
- Teks: Panduan & FAQ ditulis ulang (Peta Menu, Alur utama, Q2/Q3/Q8/Q9, Keterhubungan) dari "3 tab" → satu Layar Kerja 8 seksi; semua rujukan "tab ..." → "seksi NN".
- CSS: `.psec-fold` (tombol lipat) + `.psec.closed .psec-body{display:none}` + hover. `--text-muted` tetap TIDAK dipakai (lihat catatan Fase 7).
- Verifikasi: check6 11/11 (baru: urutan 01-08, flowbar 8 pill "Alur Kerja", workspace-hero, no-tabseg), check6b 2/2, check5 8/8 (alur baru + klik layar kerja), check3 6/6, check 7/7, check4 6/6, **check7 (BARU) 7/7** (default-route, fold-toggle/untoggle, cross-event-bringsel, legacy-roadmap, legacy-uang). cscript parse OK; mojibake 0.
- Hash final: ui.js F4C45DA8... (tdk berubah), store.js 93C9E137... (tdk berubah), app.js 2573FA80... (tdk berubah), pages.js DA5699FC..., pages2.js 7D2CE134..., actions.js BE3FC82C..., styles.css 164D654B... (hash FINAL — Fase 7 mencatat 5CAAE5F6 yg dihitung SEBELUM fix `--text-muted`).
- Catatan: council mentor untuk A dicatat jujur (dissent 3 suara); eksekusi mengikuti kuasa user dengan mitigasi risiko. `qa` subagent tetap tidak dapat diluncurkan → QA inline. 

---
### Fase 9 - Alur PIC (Paket Lengkap): Dana Cair + dimensi Wallet + pembanding SPPD (keputusan user)
- User memaparkan alur kerja nyata di lapangan: SPPD → checklist dana yang SUDAH CAIR → kesiapan (Hotel, Transport, Aset promosi/booth, Produk jual) → Hari-H 2-3 hari (input Penjualan/Rekap Kas) → pulang cek aset tidak hilang → rekap stok produk di kantor → laporan keuangan membandingkan SPPD vs realisasi + penjualan + dokumen pendukung → arus lengkap tiap wallet (Bank, QRIS, Kas, E-Money). Asisten memetakan ke aplikasi: 3 celah (Dana Cair 🟥, dimensi Wallet 🟥, pembanding 🟨) + usulan susun ulang seksi. USER MEMILIH "Paket Lengkap (Recommended)".
- MODEL BARU #1 — **danaCair[]** per event `{id, eventId, sumber, rekening, nominal, tanggalCair, status:'cair'|'belum', catatan}`: CRUD `danaCair`/`saveDanaCair`/`deleteDanaCair` di store, blok UI di seksi 01 (list eq + ringkas "Sudah cair X / Y" + form Catat Sumber Dana), handler `danaCair:add/:delete/:status`, `financeSummary.danaCair` (hanya status 'cair'), ikut seed + `deleteEvent` + migrasi `load()`/`importJSON()`.
- MODEL BARU #2 — **dimensi Wallet**: `A.WALLETS=['Bank','QRIS','Kas','E-Money']`, `walletKey()`, `METODE_TO_WALLET` (Cash→Kas, QRIS→QRIS, Transfer→Bank, E-Money→E-Money). Field `wallet` ditambahkan ke sales/expenses/kasAdj/transports; form kini: `sa-wallet` (Metode/Wallet), `ex-wallet`, `adj-wallet`, `tr-wallet`. **Migrasi data lama**: normalisasi wallet di `load()` & `importJSON()` DAN di `save()` (krusial: `load()` memakai cache `if (DB) return DB`, jadi normalisasi hanya di load tidak cukup). Ledger `financeSummary.wallets = {Bank:{masuk,keluar},...}` (masuk = sales+penyesuaian+, keluar = transport+expense+penyesuaian−).
- MODEL BARU #3 — **pembanding & laporan cetak**: seksi 08 `tabLaporan` + kartu "Bandingkan SPPD vs Realisasi" (Alokasi SPPD → Dana sudah cair → Realisasi terpakai → Hasil penjualan → Saldo akhir) + kartu "Laporan Arus Kas per Wallet"; `printHTML` ditambah tabel per-wallet + baris Dana sudah cair + kolom Wallet di pengeluaran.
- URUTAN SEKSI AKHIR (Fase 8 = 01 SPPD & Perjalanan, 07 Uang-Laporan, 08 Cross-check). Kini mengikuti alur narasi PIC: **01 SPPD & Dana Cair → 02 Jadwal & Milestone → 03 Produk & Qty (Aset Jual) → 04 Item Persiapan (Aset & Alat) → 05 Uang — Penjualan (Hari-H) → 06 Uang — Pengeluaran & Penyesuaian → 07 Cross-check Berangkat/Pulang → 08 Uang — Laporan**. `id` seksi `ps-1..ps-8` dan flowbar/scrol:to/hero "Edit SPP" TIDAK berubah. Transport tetap di seksi 01; Hotel = expense Akomodasi + checklist "Penginapan dipesan".
- Defect nyata yang dicegat saat QA: `financeSummary` sempat memakai `var danaCair = ...` yang menaungi fungsi `danaCair()` (hoisting) → TypeError "danaCair is not a function" di semua halaman; diperbaiki jadi `danaCairAmt`. Kedua, normalisasi wallet harus ikut `save()` (bukan hanya `load()`/`importJSON()`) karena cache `load()`.
- Verifikasi: **check8 (BARU) 7/7** (dana-cair-render, pembanding-wallet-render, ledger-invariants, dana-cair-added, migrasi-wallet-default, dana-cair-delete, print-contains-wallet), check6 13/13 (urutan seksi baru, dana-cair-block, wallet-render), check7 7/7, check5 8/8, check3 6/6, check4 6/6, check6b 2/2, check 7/7. cscript parse OK (`actions.js` tetap false-positive `-2146827278` biasa, terbukti jalan di browser); mojibake 0 di kode hidup.
- Hash final: store.js 374C7BB7..., pages.js 2431FC88..., pages2.js FDE6336A..., actions.js 67C5DAC8... (ui.js F4C45DA8..., app.js 2573FA80..., styles.css 164D654B... TIDAK berubah). Backup seed kini memuat `danaCair[]` — catatan migrasi di Lampiran atas perlu diperbarui saat cutover ke Supabase. 

---
### Fase 10 - SPPD rinci sesuai surat: Alokasi per Komponen + sinkronisasi otomatis realisasi (keputusan user)
- User menjelaskan isi nyata surat SPPD: penginapan, sewa transport, jenis transport, uang saku, kas kecil, biaya tol, biaya bensin, saldo e-money, dll → perlu pastikan webtool memudahkan ini: selain input penjualan ada juga input kas yang nantinya tersinkronisasi otomatis dengan uang dari SPPD. USER MEMILIH "Paket A + B (Recommended)": (A) Rincian Alokasi SPPD per komponen + (B) sinkronisasi otomatis realisasi tiap komponen. Soal Dana Awal vs total alokasi: **biarkan terpisah**, tampilkan baris/kolom **Selisih** bila berbeda, dan ada baris **Total** di akhir (jawaban user).
- MODEL BARU — **`sppd.budget[]`** per SPPD `{id, kategori, alokasi, ket}` + `BUDGET_POS = ['Penginapan','Sewa Transport','Transport Umum','Uang Saku','Kas Kecil','BBM & Tol','E-Money','Operasional Lain']`. CRUD: `sppdBudget`/`saveSppdBudgetItem`/`deleteSppdBudgetItem`/`budgetTotal`. Default `budget: []` di `getSppd` (SPPD baru), normalisasi `s.budget = s.budget || []` di `load()`/`importJSON()`, seed spp-1 (evt-1) diberi 5 baris contoh (total alokasi 2.850.000 vs Dana Awal 2.500.000 → selisih +350.000 agar fitur langsung terlihat).
- **Sinkronisasi otomatis** — `budgetRealisasi(eventId)`: tiap input kas otomatis menabalkan realisasi komponennya. Aturan: expense kategori dicocokkan ke komponen (alias `Akomodasi`→`Penginapan`, plus kategori baru Penginapan/Uang Saku/Kas Kecil/BBM & Tol); transport sewa→Sewa Transport, umum→Transport Umum, pribadi→BBM & Tol; uang saku/kas kecil dari expense kategori sama; sisa expense (Konsumsi/Operasional/Lainnya/kustom) → Operasional Lain. Baris E-Money = nilai yang dibayar dari wallet E-Money (dan TIDAK dijumlahkan ke total realisasi agar tidak dobel hitung dengan pos kategori). Hasil: `{rows:[{kategori,alokasi,realisasi,sisa,ket}], totalAlokasi, totalRealisasi, totalSisa, danaAwal, selisihDanaAwal}`. Disematkan ke `financeSummary.budget`.
- UI #1 — seksi 01 (tabSppd, blok baru `sppdBudgetBlock` di antara kartu SPPD & Dana Cair): "Rincian Alokasi SPPD" (list per komponen + badge + ket + Hapus, ringkas Total Alokasi vs Dana Awal SPPD), form "Tambah Alokasi per Komponen" (`bg-kategori` select 8 pos + opsi `__custom__` → input `bg-custom` muncul, `bg-alokasi`, `bg-ket`), handler `budget:add/:delete/:katmode`.
- UI #2 — seksi 08 (tabLaporan, kartu baru "Anggaran vs Realisasi per Komponen"): tabel Komponen|Alokasi|Realisasi|Sisa + baris Total (alokasi/realisasi/sisa) + baris info Dana Awal dan selisih berwarna bila ≠ 0; `printHTML` mendapat tabel + baris total yang sama.
- UI #3 — kategori pengeluaran diperluas: `catOpt = ['Penginapan','Konsumsi','Operasional','Uang Saku','Kas Kecil','BBM & Tol','Lainnya']` (data lama 'Akomodasi' tetap di-aliaskan → Penginapan di realisasi) — panduan FAQ ditambah Q9b "Bagaimana alokasi rinci tersinkron dengan kas?" dan paragraf Saldo dijelaskan sinkron otomatis.
- Defect yang dicegat saat QA: tombol `budget:delete` sempat tidak membawa `data-event` (handler butuh event) → ditambahkan. Test harness check9 sempat mengarah ke `#/reports` padahal tabel ada di layar kerja (seksi 08) → dikoreksi.
- Verifikasi: **check9 (BARU) 9/9** (budget-render, budget-total-selisih, budget-realisasi [sewa/umum/pribadi + alias Akomodasi + Operasional Lain], budget-migrasi-default, budget-report-table, print-contains-budget, budget-add [kategori kustom], budget-custom-realisasi, budget-delete), check8 7/7, check6 13/13, check7 7/7, check5 8/8, check3 6/6, check4 6/6, check6b 2/2, check 7/7. cscript parse OK (actions.js false-positive biasa); mojibake 0.
- Hash final Fase 10: store.js 728016D7..., pages.js 1269C5D9..., pages2.js 50DA214B..., actions.js 131DA70E... (ui.js, app.js, styles.css TIDAK berubah). Backup seed kini memuat `budget[]` — diperbarui lagi saat cutover ke Supabase.
### Fase 11 - Varian Data Dummy baru (tema UMKM) + Penghapusan data lama
- Permintaan user: setelah test manual lulus, buat varian data dummy baru dan HAPUS yang lama. Ganti total tema seed dari "balap / PT Racing Merah" ke **"Dinas Koperasi & UMKM Kota" / exhibition UMKM**.
- PRODUK (8, semua berganti nama & harga): prd-1 Batik Tulis 250.000, prd-2 Tenun Ikat 350.000, prd-3 Kopi Bubuk Premium 35.000, prd-4 Gantungan Kunci Kayu 15.000, prd-5 Totebag Kanvas 60.000, prd-6 Kripik Pisang 15.000, prd-7 Kerajinan Bambu 45.000, prd-8 Minuman Herbal 12.000.
- EVENT inti baru: evt-1 "Pameran UMKM Nusantara Expo 2026" (Booth Pameran, Bali Nusa Dua/Denpasar, 22-25 Apr 2026, berjalan), evt-2 "Gelar UMKM Kota 2026" (draft), evt-3 "Bazar Ramadan Ceria 2026" (selesai). Event dummy: ev-d5 diubah dari "Dukungan Booth Event Balapan" -> "Dukungan Booth UMKM Regional" (lokasi "Venue Pameran, Lombok"), sisanya tetap agar spektrum status app terjaga.
- SPPD: instansi semua baris -> "Dinas Koperasi & UMKM Kota". No surat DIR/2026 -> UKM/2026; tujuan evt-1 "NTB - Lombok" -> "Bali - Denpasar". **Angka budget evt-1 dipertahankan** (5 baris, total 2.850.000 vs Dana Awal 2.500.000, selisih +350.000) agar regression harness check9 tetap valid.
- TRANSPORT/SALES/EXPENSE/MILESTONE/KAS/DANA/PREP: rute & tanggal evt-1 diselaraskan ke April 2026 & Denpasar; harga jual sales mengikuti harga produk baru (mis. sal-1 Batik 5 x 250.000 = 1.250.000); noSurat lampiran milestone ikut UKM/2026. Dana Cair evt-1 (Transfer instansi (BCA) / BCA - 8910 / 1.500.000 cair + 1.000.000 belum) SENGAJA DIJAGA agar check6/check8 tetap valid. Expense evt-1 tetap memakai kategori legacy 'Akomodasi' 150.000 untuk tetap menguji alias ke Penginapan.
- PENGHAPUSAN DATA LAMA (wajib, karena localStorage): KEY di-bump sppd_toolbox_db_v1 -> **sppd_toolbox_db_v2**, plus LEGACY_KEYS = ['sppd_toolbox_db_v1'] yang di-removeItem() di load(). Efeknya: browser yang masih menyimpan DB lama otomatis pakai seed baru, dan key lama benar-benar terhapus. resetData() tetap reseed ke key baru.
- Verifikasi: check 7/7, check3 6/6, check4 6/6, check5 8/8, check6 13/13, check6b 3/3 (+test baru legacy-key-dibuang membuktikan key v1 hilang & store.KEY = v2), check7 7/7, check8 7/7, check9 9/9, check10 7/7. check2 (legacy harness) tetap FAIL 7 - **set failure identik byte-per-byte dengan baseline sebelum perubahan**, jadi bukan regresi. cscript parse store.js OK; scan mojibake 0 (sisa cp=8722/8594 hanya tanda <= / -> di komentar lama); scan sisa tema lama (Racing/Balap/MotoGP/merchandise/Sirkuit/DIR-2026) 0.
- Hash final Fase 11: **store.js C89C03C6...** (hanya file ini yang berubah - pages.js 1269C5D9, pages2.js 50DA214B, actions.js 131DA70E, ui.js 1174F870, app.js 3EC3A8B5, styles.css 58313464 TIDAK berubah).
---
### Fase 12 - Layout "full width" + Wallet Tujuan per baris Alokasi SPPD (permintaan user)
- Permintaan user (2 hal): (1) layout lama terasa "terkunci" di tengah layar (container max-w-6xl) -> harus benar-benar full width; (2) pada **Rincian Alokasi SPPD** tiap baris perlu ada **pilihan wallet** (dana alokasi masuk ke dompet mana). User menyatakan "sisa lainnya aku serahkan" -> asisten menentukan detail & QA sendiri.
- PERBAIKAN LAYOUT (surgical, tanpa mengubah alur/ID): (a) `index.html` header/main/footer `max-w-6xl` -> **`max-w-[1800px]`** + padding responsif `px-4 sm:px-6 lg:px-8`; (b) `styles.css` `.card-pad` desktop jadi `28px 32px` (dari 24px) + spacing `.form-grid` lebih longgar di >=1440px; (c) **`.work-cols`** - seksi 01..08 pada halaman kerja dibungkus 1 wrapper, jadi **2 kolom di >=1500px**. **DOM order tetap 01..08** (sengaja pakai CSS multi-column, bukan `order`/reorder) agar `scroll:to`, flowbar, dan check6 `urutan-seksi` tidak rusak.
- **PENTING - container query untuk isi dalam kolom**: grid Tailwind lama pakai breakpoint **viewport** (`lg:grid-cols-3`, `lg:col-span-2`). Kalau hanya diganti jadi 2 kolom, isi di dalamnya jadi sempit/cramped di kolom ~700px. Solusi: `.work-cols > .psec { container-type: inline-size; container-name: seksi }` + `@container seksi (max-width:819px)` memaksa balik 1 kolom, `(min-width:820px)` mengembalikan lagi 2 kolom form. Ini wajib agar "Aturan #1 skill sbc: jangan bikin tabel/form sempit" tetap terpenuhi.
- MODEL BARU -> **wallet tujuan alokasi**: item budget jadi `{id, kategori, alokasi, ket, wallet}`. Helper baru di store: **`budgetWallet(kategori, w)`** - komponen kategori `'E-Money'` **dipaksa** jadi wallet `'E-Money'` (memang untuk dompet digital), komponen lain mengikuti pilihan user, default `'Kas'` (re-use `WALLETS` + `walletKey()` yang sudah ada). Fungsi `normBudgetWallet(db)` menormalisasi SEMUA `db.sppd[].budget[].wallet`.
- **Normalisasi di 3 tempat** (pola yang sudah dipakai wallet di Fase 9): `load()`, `importJSON()`, **dan `save()`** - `save()` wajib karena `load()` memakai cache `if (DB) return DB`, jadi normalisasi hanya di load tidak cukup. QA membuktikannya: test `semua-sppd-ter-normalisasi` GAGAL sebelum `save()` ikut menormalisasi.
- `budgetRealisasi()` sekarang mengembalikan `rows[].wallet` + **`perWallet`** (rekap `{wallet, alokasi, realisasi}` untuk 4 wallet, jumlah `alokasi` selalu == `totalAlokasi` - diuji). Angka alokasi/realisasi/selisih **tidak berubah** (tidak ada double count; wallet cuma metadata tujuan).
- UI: (a) `ui.js` helper baru **`A.walletBadge(w)`** (warna Bank biru / QRIS hitam / Kas hijau / E-Money merah + escape XSS); (b) `sppdBudgetBlock` dapat select **`bg-wallet`** (4 opsi, default Kas) + badge wallet di tiap baris list + strip ringkas "Alokasi Bank/… " per wallet; (c) handler `budget:katmode` otomatis memaksa select wallet jadi `E-Money` saat komponen dipilih E-Money; handler `budget:add` baca + simpan `wallet`; (d) seksi 08 `tabLaporan` dapat **kolom Wallet** + **tabel baru "Alokasi & Realisasi per Wallet Tujuan"**; (e) `printHTML` dapat kolom Wallet + tabel per-wallet + baris **Selisih** (label lama "Alokasi SPPD (dana awal)" **dipakai lagi** - sempat diganti jadi "Dana Awal SPPD" lalu check9 pecah, dikembalikan ke string lama).
- Seed: 5 baris budget evt-1 diberi wallet - bg-1 Penginapan **Bank**, bg-2 Transport Umum **Bank**, bg-3 BBM & Tol **Kas**, bg-4 Uang Saku **E-Money**, bg-5 Kas Kecil **Kas** (rekap Bank 2.250.000 / Kas 350.000 / E-Money 250.000 / QRIS 0).
- **check11.html (BARU) 21/21**: seed-5-baris, semua-baris-punya-wallet, wallet-bank-untuk-hotel, wallet-e-money-uang-saku, rows-punya-wallet, perWallet-ada, perWallet-kategori-lengkap, perWallet-bank-2jt25, total-alokasi-tetap, selisih-tetap, sum-perWallet-==-total, emoney-dipaksa, unknown-default-kas, pilihan-dihormati, item-baru-tersimpan, wallet-item-baru, emoney-dipaksa-saat-simpan, semua-sppd-ter-normalisasi, import-normalisasi-wallet, badge-wallet-render, badge-escape-aman.
- **Catatan alat QA (penting untuk sesi berikutnya)**: `cscript`+JScript itu ES3 - ia **menolak method shorthand/getter ES6** sehingga `actions.js` selalu FAIL `-2146827278 "Expected identifier"` padahal kodenya SAH. Dibuktikan: file `actions.js` yang **sudah di-revert penuh** ke versi sebelum perubahan tetap FAIL identik. Jadi WAJIB verifikasi syntax lewat **engine browser sungguhan** (Edge headless `--dump-dom` + `new Function(src)`), bukan cscript. Helper `mkparsecheck.ps1` membangun HTML berisi semua sumber di-inline (XHR diblokir di `file://`) -> hasil: store/pages/pages2/actions/ui/app **6/6 OK**.
- Regression penuh: check 7/7, check3 6/6, check4 6/6, check5 8/8, check6 13/13, check6b 3/3, check7 7/7, check8 7/7, check9 9/9, check10 7/7, **check11 21/21**. check2 tetap FAIL 7 (legacy, bukan regresi). Total 97 assert pass.
- Hash final Fase 12 (MD5): index.html 84658252..., **css/styles.css 43F47E03...**, **js/store.js 42A726B6...**, js/pages.js 0890D61F..., js/pages2.js B5611830..., js/actions.js A3A788F3..., **js/ui.js 27F3E1F3...** (2 file ini berubah), js/app.js 3EC3A8B5... TIDAK berubah, check11.html DA0C20D8....
- Catatan Supabase: kolom `budget[].wallet` baru harus ikut blueprint tabel budget saat cutover (menyuk field `wallet text` default `'Kas'`).
- **Koreksi Fase 12 saat QA (penting!)**: implementasi 2 kolom AWAL pakai `display:grid` + `grid-auto-flow:column` + `grid-template-rows:repeat(4,auto)`. Diuji di browser sungguhan (Edge headless + probe `getBoundingClientRect`) dan **ternyata menghasilkan celah besar**: tinggi tiap baris dipaksa = sel tertinggi, jadi kolom kanan kosong **1185px (kiri) & 2113px (kanan)**. Diganti ke **CSS multi-column** (`column-count:2` + `break-inside:avoid`) => tinggi kolom otomatis seimbang, ruang terbuang hanya **78px per kolom**, 0 seksi tumpang-tindih, DOM order tetap `ps-1..ps-8`. Probe mengukur di 3 lebar: 1280px -> 1 kolom, 1500px -> 1 kolom, 1919px -> 2 kolom (sesuai `min-width:1500px`).
- **Metode QA layout tanpa bisa lihat gambar**: saya tidak bisa membaca screenshot, jadi verifikasi visual diganti **numerik**: inject probe `getComputedStyle`/`getBoundingClientRect` ke `index.html` (file `probe_tmp.html`, dihapus setelah), lalu `--dump-dom` Edge. Angka yang dipakai: `main.clientWidth` 1800 (bukan ~1152 = kunci lama), `card-pad` `28px 32px`, `column-count` 2, jumlah kolom distinct 2, `wasted` per kolom, overlap 0, urutan DOM.
