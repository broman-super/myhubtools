# Product

<!-- impeccable:product-schema 1 -->

Scope: tool **RND Roadmap Tracker** (`Productive/Project_develop/`) di dalam repo multi-tool REYNAHUB. File ini khusus produk tool ini, bukan hub.

## Platform

web

## Stack

Vite + React 19 + Tailwind v4 + `@base-ui/react` (shadcn preset `base-mira` "mist"). Build **wajib satu file** (`vite-plugin-singlefile`, `base: "./"`) → `dist/index.html` (±790 KB) untuk dimuat sebagai iframe hub (`#productive/rnd-roadmap`) atau dibuka langsung. Backend: Supabase (RLS read) + write melalui bridge GAS via `src/supabase.js`. Keputusan user (2026-09-11): backend didelegasikan ke AI, jangan diubah.

## Users

Divisi R&D internal; dipakai personal dan untuk memantau progres tim. Situasi: mencatat produk baru dari ide sampai rilis. Tugas utama: membuat & memantau project (status, tahapan, checklist, evaluasi Go/No-Go), melihat ringkasan progres, dan menangkap peringatan target yang hampir atau sudah lewat.

## Product Purpose

Pendataan & pelacakan roadmap pengembangan produk R&D (pengganti spreadsheet): project dengan tahapan bertingkat, checklist, lampiran foto, evaluasi keputusan; ringkasan + peringatan + ekspor CSV/PDF. Ukuran sukses: data roadmap terpantau, ringkas, tanpa kehilangan atau duplikasi.

## Positioning

Roadmap produk sebagai pohon tahapan + checklist pribadi per tahap dengan evaluasi Go/No-Go, satu file HTML dibangun sendiri (bisa dibuka tanpa server) plus sinkronisasi cloud. Spreadsheet tidak bisa meniru ini: peringatan overdue/upcoming otomatis dan ringkasan progres keseluruhan tanpa bikin formula.

## Operating Context

Dibuka di dalam hub REYNAHUB (iframe) atau file `dist/index.html` lokal. Tema dark/light via toggle (`storageKey "rnd-theme"`, hotkey `d`, default light). Setiap perubahan menyimpan ke backend dengan busy-state/spinner; ini mencegah klik ganda dan simpan dobel. Ekspor lewat download CSV dan printable report (A4).

## Capabilities and Constraints

- **Project**: nama, kode/SKU, kategori, deskripsi (rich text ringkas: `**bold**`, `- ` bullet, `> ` kutipan; di-render aman via escape), tanggal mulai, target rilis, status (Ideation / On Track / At Risk / Done), **prioritas (P1-P3)**, **tag**, **mode auto-status** (status tampilan dihitung dari tahapan, tanpa menulis ulang data), **log aktivitas & komentar** (history inline di data project).
- **Tahapan (milestone)**: pohon bertingkat (tahapan + sub), status (Belum mulai / Berjalan / Selesai), target date, checklist per item (dengan foto terkompresi maks 1024px), evaluasi (skor /5 + keputusan Go/No-Go + catatan). **Timeline/Gantt** (read-only) di tab detail: bar per tahapan, sumbu tanggal, garis "Hari ini", warna status.
- **Template**: simpan struktur tahapan project sebagai template (`rnd-templates`) untuk dipakai saat membuat project baru (milestone di-instantiate bersih: id baru, status/checklist di-reset).
- **Salin checklist**: tarik item checklist dari template atau project lain ke sebuah tahapan (skip duplikat judul). **Duplikasi project**: salinan penuh dengan id baru + history di-reset.
- **Notifikasi**: peringatan overdue/upcoming per milestone dikumpulkan di bel (dropdown, "tandai semua sudah dibaca"), + **badge angka di kartu hub** (`localStorage['rnd-alert-count']` dibaca shell hub interval 5 dtk).
- **Ringkasan mingguan** di dashboard: 7 metrik (project aktif/selesai/at-risk, lewat target, target 14 hari, selesai minggu ini, total selesai) + tombol salin ringkasan teks.
- **Dashboard**: ringkasan per status, progres keseluruhan (ring), panel peringatan (overdue/upcoming), arsip & trash (dengan hitung mundur hari), pencarian/sort(termasuk prioritas)/filter(status+tag), ekspor CSV & laporan cetak.
- **Konstrain teknis**: satu file output wajib; semua gaya via token preset mist (tidak boleh hardcode warna/font baru); backend tidak boleh diubah; field baru cukup ditambah ke JSON blob (`id, data, updated_at`), tanpa perubahan skema.
- **Terbuka/belum diputuskan**: perilaku *concurrent editing* multi-device belum teruji (tidak ada lock; simpanan terakhir menang). Verifikasi visual timeline bars menunggu project dengan milestone ber-tanggal target (2026-09-12: data server saat ini belum ada).

## Brand Commitments

Tidak ada komitmen brand yang mengikat untuk tool ini. Keputusan final yang disetujui (2026-09-11): tampilan mengikuti **preset shadcn mist** (biru), **bukan** Design System REYNAHUB merah (`docs/DESIGN.md`). Nama produk yang sah: "RND Roadmap Tracker".

## Evidence on Hand

Screenshot dashboard light: `docs/screenshot-dashboard-light.png`. Tidak ada testimoni, press, atau case study. Belum ada dokumentasi resmi produk di luar file ini.

## Product Principles

- **Satu sumber visual**: warna/font/radius selalu lewat token preset mist; dilarang hardcode hex baru.
- **Anti-data-hilang**: aksi simpan menunggu status backend sebelum tombol aktif kembali (cegah dobel-kirim).
- **Tetap sederhana & portabel**: pendataan inti dapat diekspor CSV/PDF dan berjalan sebagai satu file HTML.
- **Tidak merombak fungsi lama**: setiap edit wajib menjaga seluruh workflow yang sudah berjalan.

## Accessibility & Inclusion

Tema dark/light penuh; `prefers-reduced-motion` dihormati; focus ring lewat token; build satu file supaya muat cepat di dalam iframe hub.