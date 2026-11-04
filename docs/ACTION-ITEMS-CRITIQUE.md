# Action Items dari Review/Critique

> File ini berisi daftar temuan yang **belum ditindaklanjuti** dan perlu respon/tindakan.
> Tandai selesai dengan `[x]` setelah dikerjakan dan verifikasi.

## Cara Pakai
- Tambahkan temuan baru per review/critique dengan sumber, lokasi file, prioritas, dan aksi yang jelas.
- Fokus pada hal yang butuh **tindakan** (perbaikan bug, perbaiki UX, perbaiki konsistensi, dsb). Saran bersifat informatif bisa dipisah.
- Setelah selesai, pindahkan atau tandai `[x]` beserta tanggal/commit jika relevan.

## Daftar Tindakan

| Status | Prioritas | Sumber | File/Lokasi | Temuan | Tindakan yang Diperlukan | Verifikasi | Catatan |
|---|---|---|---|---|---|---|---|
| [ ] | P0 | UI Audit 2026-10-08 | `Productive/activity-tracker/tracking.html` | Outlier terburuk: Tailwind CDN, 25 gradient, 78 inline hex, 124+ hex di luar `:root`, dark mode bercampur literal | Migrasi ke CSS vanilla + token suite, hapus Tailwind CDN, ganti inline hex ke token, seragamkan CTA ke `--primary`, perbaiki dark mode root-only | Bandingkan tampilan light/dark, cek konsol, pastikan tidak ada style berantakan | Butuh redesign cukup besar. |
| [ ] | P0 | UI Audit 2026-10-08 | `Productive/Project_develop/dist/index.html` | Stack berbeda total (oklch/shadcn/Tailwind/Inter), dark pakai `.dark` class bukan `data-theme` | Tentukan apakah tetap laboratorium (di luar token) atau diseragamkan. Jika wajib seragam, konversi ke pola suite (token + `data-theme`). | Cek kompatibilitas dengan hub/router | Putuskan dulu (lihat bab 7 keputusan). |
| [ ] | P0 | UI Audit 2026-10-08 | `Productive/analytic/Analytic.html` | `--accent: #f1f5f9` menyesatkan (dipakai sbg bg surface), kurang `--surface/--radius/--shadow` | Rename `--accent` → `--surface2`, arahkan surface bg ke `--surface`/`--surface2`, tambahkan token radius/shadow, arahkan aksen UI ke `--primary` | Cek KPI/badge/thead di light+dark | Berisiko visual kalau salah ganti. |
| [ ] | P0 | UI Audit 2026-10-08 | `Productive/expense-tracker/index.html` | Selalu gelap, `data-theme` tak dikonsumsi CSS, `--primary` biru bukan merah brand | Implementasi dark/light via root-only override yg konsisten, ganti `--primary` ke `#ff0000`/`#ff3b3b`, tambah toggle tema | Coba switch theme, cek kontras | Saat ini tidak bisa di-toggle dengan benar. |
| [ ] | P0 | UI Audit 2026-10-08 | `Productive/pdf-merger/PDFM_V2.html` | Dark mode hardcode (24 hex / 19 rule), palette Bootstrap | Pindahkan literal dark ke root-only token override, ganti warna Bootstrap ke token suite | Cek dark mode, print jika ada | Rawan drift kontras. |
| [ ] | P1 | UI Audit 2026-10-08 | `Productive/retur-track/retur-track.html` | Accent `#DA0037`, hijau `#16a34a` hardcode, radius/shadow raw, dark campuran | Peta ke `--primary`/`--success`/`--danger`, tambah radius token, pindahkan dark literal ke root-only | Light+dark, list/aksi | Cepat & aman kalau bertahap. |
| [ ] | P1 | UI Audit 2026-10-08 | `dak/form-dak.html` | `--dak-*` namespaced, font Plus Jakarta Sans dideklarasikan tapi tak dimuat, accent navy `#1e3a8a` | Petakan ke token baku (`--bg/--surface/--text/--border/--primary`), link `tools.css`/font, tentukan warna aksen (navy vs merah brand) | Cek font & cetak A4 | Cek keputusan aksen dulu. |
| [ ] | P1 | UI Audit 2026-10-08 | `Productive/resi-generator/Index.html` | `--success: hitam`, aksen amber `#F5A623`, neumorphism kuat | Ganti `--success` ke `#22c55e`, tambahkan/arahkan `--primary` merah, putuskan neumorphism (pertahankan vs datarkan) | Cek status sukses/gagal, dark mode | Butuh keputusan desain. |
| [ ] | P1 | UI Audit 2026-10-08 | `Productive/latch/latch.html`, `Productive/latch/admin_latch.html` | Neumorphism (`--neo-*`, `.raised/.pressable`) berbeda dari flat modern | Dokumentasikan sebagai karakter tool ATAU konversi ke shadow token. Jika dikonversi, ganti inset ke `var(--shadow-*)` | Bandingkan dengan Faktur sebagai template | Konsistenkan keputusan lintas tool. |
| [ ] | P1 | UI Audit 2026-10-08 | `Productive/planner/taskschedule.html` | Dunia navy/blue (`--accent #1B2A4A`), bukan merah brand | Putuskan: pertahankan navy (identitas) atau uniform ke `--primary` merah | Cek header/nav & dark mode | Ada di bab 7 keputusan. |
| [ ] | P2 | UI Audit 2026-10-08 | Seluruh tool non-standar | Tidak ada `.tool-main`/.topbar standar, bottom-nav hanya outbond, `@media print` tidak merata | Terapkan shell baku (`.topbar` + `.tool-main`), tambahkan bottom-nav jika mobile-dominan, perkuat print rules | Navigasi & cetak lintas tool | Bertahap, bisa bareng tokenisasi. |
| [ ] | P2 | UI Audit 2026-10-08 | `src/styles/components.css`, `src/styles/tools.css` | Hex radius mentah di components.css, tools.css base64 font only (tanpa shell/layout) | Tokenisasi components.css, pertimbangkan tambah util `.tool-main/.topbar` ke tools.css | Build/check visual | Fondasi jangka panjang. |

## Template Per Temuan
```markdown
- [ ] **[P0/P1/P2]** _(Sumber: Critique YYYY-MM-DD)_  
  - **Lokasi:** `src/.../file.js:123`  
  - **Masalah:** ...  
  - **Dampak:** ...  
  - **Aksi:** ...  
  - **Verifikasi:** ...  
  - **Status:** Belum | Sedang | Selesai
```

## Selesai (Arsip)
Pindahkan item yang sudah `[x]` ke bagian ini dengan tanggal penyelesaian.
