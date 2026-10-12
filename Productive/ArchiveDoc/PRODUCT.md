# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Pengguna utama (v1):** **satu PIC / pemilik** — orang yang ditugaskan membuka booth/stan di sebuah event (expo UMKM, bazar, event balapan seperti MAG Enduro) dan harus mempertanggungjawabkan seluruh perjalanan dinasnya. Pemilik mengelola **roadmap-nya sendiri**; tidak ada role atau pembatasan akses antar pengguna. Kolom `user_id` sudah disiapkan agar suatu saat multi-akun dimungkinkan tanpa perombakan besar.

Situasi kerja: persiapan dilakukan di kantor (pengajuan SPPD, menyusun produk & item yang dibawa), lalu dipakai di lapangan lewat HP saat booth berjalan (input penjualan, pengeluaran, cek aset), dan ditutup dengan pertanggungjawaban uang serta cetak laporan.

## Product Purpose

Webtool untuk mengelola **satu siklus penuh satu tugas/event** di satu tempat: surat perjalanan dinas (SPPD), transportasi, produk & aset yang dibawa, progress tahap, penjualan, dan uang — dari persiapan sampai pertanggungjawaban.

Keberhasilan berarti: seorang PIC bisa mengawasi dan menutup tugas secara end-to-end — tahu apa yang belum dikerjakan, di tahap mana sekarang, apa yang sudah selesai beserta buktinya, dan berapa saldo akhir yang bisa dipertanggungjawabkan — lalu mencetak dokumen resminya.

## Positioning

**Roadmap Pengawasan per tahap.** Satu tugas = satu jalur tahap (Persiapan → Berangkat → Pelaksanaan → Pulang → Laporan) di mana setiap tahap membawa **dokumen bukti terlampir** + **biaya di tahap itu & kas kumulatif** (derivasi tanggal dari seluruh transaksi). Kemampuan yang sulit ditiru alat task generik adalah penggabungan tiga hal dalam satu catatan tugas: checklist kesiapan aset, rekonsiliasi kas berbasis wallet, dan **output dokumen yang identik dengan format resmi PT. ELFIQA KARYA TRIANGGA**.

## Operating Context

- Dipakai **mobile-first** di lapangan (HP di booth, sering sinyal buruk) dan di kantor saat persiapan.
- Mengikuti prosedur surat-menyurat perusahaan: persetujuan berjenjang **Maker → Checker → Signer**.
- **Empat wallet** untuk seluruh aliran uang: **Bank · QRIS · Kas · E-Money** — dipakai di penjualan, pengeluaran, transport, penyesuaian kas, dan baris alokasi SPPD.
- Jenis event beragam: expo/pameran produk, bazar, hingga event balapan (contoh nyata: **MAG Enduro 2026**, kota tujuan Banyumas).
- Bukti foto/dokumen disimpan di **Google Drive** (rencana), bukan base64 permanen di database.
- Cetak laporan lewat fitur print browser.
- Data saat ini persist di **localStorage** (prototipe, dummy data); integrasi **GAS + Supabase** ditunda menunggu key.

## Capabilities and Constraints

**Kapasitas yang dikonfirmasi (sudah ada di prototipe v0.6):**
- **Satu Layar Kerja** per event = satu halaman berisi 8 seksi (SPPD & Perjalanan, Jadwal, Produk & Item, Uang, Laporan, dst.); deep-link lama (`roadmap`/`persiapan`/`uang`/…) tetap resolve ke Layar Kerja via peta legacy.
- SPPD dengan alur status **Draft → Diajukan → Disetujui → Selesai**, kolom `dana_awal` + `realisasi` (realisasi punya toggle visibilitas).
- Transportasi **3 mode** per leg (sewa / transport umum / pribadi-reimbursement km).
- "Segitiga Produk": qty dibawa/terjual/rusak-hilang/kembali; penjualan manual per transaksi dibatasi sisa stok.
- Item Persiapan non-produk (hotel, kendaraan, tiket) dengan status & biaya estimasi informatif.
- **Cross-check** dua gerbang: *Siap berangkat* (`berangkatOk`) & *Pulang tuntas* (`pulangOk`).
- Uang: penjualan, pengeluaran berkategori, penyesuaian kas (±), laporan penggunaan uang siap print, Rekap Global lintas event.
- Master Produk, Panduan & FAQ, Pengaturan.

**Constraint teknis yang harus dipatuhi:**
- Frontend **vanilla JS** (gaya ES5: `var` + `function`), SPA hash-router, tanpa framework; Tailwind **pre-built** ke `css/tailwind.css` (tanpa CDN runtime, tanpa Node/npm).
- Arsitektur target: Frontend (GitHub Pages) → **GAS** (jembatan API, pemegang key Supabase & DriveApp) → **Supabase** (PostgreSQL) + **Google Drive** (file bukti). Titik integrasi ditandai `// FUTURE: GAS` / `// FUTURE: SUPABASE`. **Key Supabase tidak pernah boleh ada di browser.**
- Aturan wajib **anti-kehilangan-fungsi**: perubahan bersifat aditif; dilarang rebuild total atau menghapus fungsi yang sudah ada.
- Output dokumen **harus 100% identik dengan format resmi perusahaan** (lihat Evidence).

**Fakta produk yang masih terbuka (belum diputuskan — jangan diasumsikan):**
- Format & template dokumen SPPD (contoh surat yang dipakai kini).
- Perlu tidaknya memisahkan "modal/dana awal tugas" vs "uang pribadi".
- Perlu tidaknya kategori pengeluaran kustom.
- Waktu integrasi GAS & Supabase (menunggu key dari pemilik).

## Brand Commitments

- Nama produk: **SPPD Toolbox**.
- Identitas & format resmi yang mengikat: **PT. ELFIQA KARYA TRIANGGA**, Form **"Pengajuan Biaya Perjalanan Dinas"** (departemen SUPERSUB) — termasuk konvensi Maker/Checker/Signer dan kelompok biaya operasional (BBM, kas kecil) serta SPJ personil (uang weekday/weekend, penginapan). Lihat Evidence.
- Batasan visual yang dinyatakan pemilik (dari Project Brief, **direkam tanpa diperluas** kecuali butir sudut yang telah direkonsiliasi 2026-10-11): minimalist/tegas/anti-AI-slop, warna dasar off-white + teks hampir hitam + satu aksen solid, heading sans-serif tebal, angka/data monospace, **sudut soft-rounded** (`rounded-card` 20px, pill 999px) — *keputusan final: pertahankan implementasi soft; usulan awal "tajam" (`rounded-none`/`rounded-sm`) dibatalkan*, animasi micro-interaction CSS murni (opacity/transform ~200ms), tombol mobile min-height 48px.

## Evidence on Hand

- `Rancangan SPPD.md` — **contoh form resmi nyata** PT. ELFIQA KARYA TRIANGGA (Maker: Firman M./Supervisor; Checker: R.M Taqwalegawa/Head of HRD; Signer: Kusna S./Direktur), berisi angka nyata (BBM 300.000, Kas Kecil 200.000, SPJ personil, TOTAL 2.190.907). Ini acuan format output.
- `SPESIFIKASI.md` — spesifikasi produk & data model (sumber durable product truth saat ini).
- `CHANGELOG.md` + `devlog/` — riwayat ronde kerja (R1–R3) dan keputusan council.
- Data seed di `js/store.js` (contoh: SPPD `039/SPPD/UKM/2026`, instansi "Dinas Koperasi & UMKM Kota") bersifat **dummy/prototipe**, bukan data nyata.

**Absen yang tidak boleh difabrikasi:** tidak ada testimoni pelanggan, tidak ada benchmark kinerja, tidak ada harga/paket penjualan, tidak ada klaim deployment nyata, dan belum ada file key Supabase/GAS.

## Product Principles

1. **Satu tugas = satu siklus yang bisa ditutup.** Setiap tahap harus bisa membawa bukti dan biaya; tidak ada tahap tanpa jejak.
2. **Lapangan dulu.** Mobile-first, input cepat, tahan sinyal buruk — keputusan UI diuji pada HP di booth, bukan hanya di desktop.
3. **Uang yang jujur dan bisa direkonstruksi.** Saldo selalu = dana awal + penjualan + penyesuaian − pengeluaran, terpisah per wallet; koreksi kas eksplisit, tidak diam-diam.
4. **Fidelitas dokumen.** Keluaran cetak harus tak terbedakan dari format resmi perusahaan.
5. **Aman dari kehilangan.** Perubahan aditif; fungsi lama tidak boleh hilang, dan data pengguna tidak boleh rusak.

## Accessibility & Inclusion

Mobile-first untuk pemakaian satu tangan di lapangan; target tombol min-height 48px (dari Project Brief). Standar aksesibilitas formal (mis. kontras WCAG, screen reader, navigasi keyboard) **belum ditetapkan sebagai syarat produk** — persona QA internal menyebut kebutuhan pengguna senior, literasi rendah, dan disabilitas, tetapi ini belum dikonfirmasi sebagai requirement. Tandai sebagai keputusan terbuka.
