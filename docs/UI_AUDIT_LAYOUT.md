# Audit UI & Layout Suite REYNAHUB / UNITOOLS

**Tanggal:** 2026-10-08 · **Cakupan:** 15 file HTML + CSS bersama · **Acuan:** `docs/guidebook/design.md` (Desain Sistem REYNAHUB_SYS) + skill `bro-ui`

---

## 1. Ringkasan Eksekutif

Suite ini berjalan di **5 dialek token yang saling menolak**, **6 nilai warna accent yang berbeda**, **3 strategi dark mode yang tidak kompatibel**, dan **sebagian besar elemen layout standar (`.tool-main`, `.topbar`, bottom-nav, `@media print`) tidak terimplementasi**. Total ≈ **966 hex hardcoded** tersebar di luar blok `:root`, membuat setiap tool berasa dibuat oleh tim berbeda.

Hub `index.html` adalah **satu-satunya bagian yang patuh** terhadap `design-system.css` — ia layak dijadikan acuan (source-of-truth) untuk seluruh suite.

---

## 2. Metodologi

1. `context.mjs` (Impeccable) membaca `docs/guidebook/design.md`.
2. Matriks per-file dihasilkan dengan membedah `<style>`/skeleton tiap HTML (token block, hex hardcode di CSS/JS, dark mode, print, grid, radius).
3. Setiap temuan dibandingkan dengan **tabel token kanonik** di bab 3 dan **spec layout** di bab 4.

---

## 3. Token Kanonik (Kitab `bro-ui` / `design-system.css`)

| Hub (`design-system.css`) | Tool (inline `<style>`) | Light | Dark |
|---|---|---|---|
| `--accent` / `--primary` | `--primary` | `#ff0000` | `#ff3b3b` |
| `--accent-glow` / `--primary-glow` | — | `rgba(255,0,0,0.08)` | `0.15` |
| `--primary-light` | — | `#ff7b7b` | `#ff6b6b` |
| `--primary-soft` | — | 10% | 18% |
| `--bg-primary` / `--bg` | `--bg` | `#f8fafc` | `#0f172a` |
| `--bg-card` / `--surface` | `--surface` | `#ffffff` | `#1e293b` |
| `--surface2` | `--surface2` | `#f1f5f9` | `#1e293b` |
| `--text-main` / `--text` | `--text` | `#0f172a` | `#f1f5f9` |
| `--text-muted` / `--muted` | `--muted`/`--text2` | `#64748b` | `#94a3b8` |
| `--border` | `--border` | `rgba(15,23,42,.06)` | `rgba(255,255,255,.07)` |
| `--danger` / `--success` / `--warning` | sama | `#ef4444` / `#22c55e` / `#f59e0b` | sama |
| `--radius-sm`(8) / `--radius-md`(12) / `--radius-bento`(18) | `--radius-*` | card / input / bento-modal | — |
| `--shadow-sm/md/lg` | `--shadow-*` | dari `components.css` | — |
| `--focus-ring` | — | `0 0 0 3px var(--accent-glow)` | — |
| Font | `--font-display` Geomini · `--font-sans` Plus Jakarta Sans | — | — |

**Aturan emas token:**
- Tidak ada warna hex hardcoded di CSS/JS/HTML — semua lewat token.
- Dark mode = *root-only override*, bukan per-element literal.
- Radius/shadow/space lewat token (`--radius-*`, `--shadow-*`, `--space-*`), bukan magic number.
- Sorot = `var(--primary-soft)` / `color-mix(... 10% ...)`, **bukan** border 2px + glow.

---

## 4. Matriks Audit per Tool

| # | Tool | Token block | Hex di luar `:root` (CSS/JS) | Dark mode | `.topbar` | Bottom-nav mobile | Radius tokenized | `@media print` | Catatan |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `index.html` (hub) | ✅ via `design-system.css` | 0 | ✅ root-only | — (sidebar) | ❌ | ✅ | ❌ | **Acuan terbaik**; bento grid `260px` |
| 2 | `retur-track/retur-track.html` | ⚠️ 7 token, tanpa radius/shadow | 29 | campuran (root + ~3 literal) | ❌ `.mobile-tabs` | ❌ | ❌ magic (22px) | ❌ | Accent **crimson `#DA0037`**; hijau `#16a34a` hardcode |
| 3 | `activity-tracker/tracking.html` | ⚠️ nama **tidak baku** (`--bg-color`, `--box-bg`) | **124** (+102 JS) | ❌ hardcode 62 hex / 38 rule | ❌ `.nav-bar`+`.sidebar` | ❌ | ❌ (40px) | ❌ | **Outlier terburuk**: Tailwind CDN, utility `bg-white/text-slate-*`, 25 gradient, 78 inline hex, CTA biru `#2563EB` |
| 4 | `outbound-track/outbound-track.html` | ⚠️ 6 token | 19 (+5 JS) | ✅ root + 2 element | ❌ `.header-container` | ✅ | ❌ (12px) | ✅ | Merah brand ✅; bottom-nav ✅ |
| 5 | `faktur-penjualan/Index.html` | ⚠️ 17 (paling lengkap) | 21 (+12 JS) | ✅ root-only | ✅ | ❌ | ✅ (20 var) | ✅ A4 | **Paling patuh** di antara tool |
| 6 | `resi-generator/Index.html` | ⚠️ Apple-gray + `--neo-*`, tanpa `--primary`/`--success` | 22 (+31 JS) | ✅ root-only | ✅ | ❌ | ❌ (21px) | ✅ | **Neumorphism** (`--neo-in/--neo-deep`); accent **amber `#F5A623`**; `--success: hitam` ⚠️ |
| 7 | `pdf-merger/PDFM_V2.html` | ⚠️ 7 token | 39 | ❌ hardcode 24 hex / 19 rule | ❌ bare `.container`+`h1` | ❌ | campuran | ❌ | Palette Bootstrap (`#dc3545`/`#28a745`) |
| 8 | `planner/taskschedule.html` | ⚠️ custom (`--accent #1B2A4A`) + `--platform-*` | 71 (+126 JS) | ✅ root-only (`.topbar` 0 hex) | ✅ | ❌ | campuran | ✅ | **Dunia navy/blue**, bukan merah brand |
| 9 | `analytic/Analytic.html` | ⚠️ 18, **tanpa `--surface/--radius/--shadow`** | 22 (+63 JS) | ✅ root + CDN daterangepicker | ❌ `.nav-bar` | ❌ | ❌ (25px) | ✅ A4 landscape | **`--accent: #f1f5f9` = warna kartu, NAMA MENIPU** — dipakai sebagai bg surface; merah brand ada di `--primary` |
| 10 | `expense-tracker/index.html` | ✅ 13 token tapi **nilai dark-only**, `--primary` biru | 29 (+9 JS) | ❌ **tidak berfungsi** | ❌ `.header` | ❌ | ✅ (13 var) | ❌ | Selalu gelap; `[data-theme]` ditulis tetapi 0 rule mengonsumsinya |
| 11 | `latch/latch.html` | `css/style.css`: `--primary #ff0000` ✅ + `--neo-*` | HTML 0; CSS 15 | ✅ root-only | ✅ | ❌ | ✅ (22 var) | ❌ | **Neumorphism** (`.raised/.pressable`, ATM-card) |
| 12 | `latch/admin_latch.html` | sama (#11) | 0 | ✅ | ✅ | ❌ | ✅ | ❌ | Dunia neumorphic sama |
| 13 | `Project_develop/index.html` | ❌ hampir kosong | 1 | ❌ | — | — | — | — | Scaffold Vite dev, bukan halaman tool |
| 14 | `Project_develop/dist/index.html` | 🔴 **oklch shadcn**, `--primary` biru | 10 | `.dark` class (bukan `data-theme`) | — | — | `--radius .625rem` | — | **Stack berbeda total**: Tailwind/shadcn/Inter |
| 15 | `dak/form-dak.html` | 🔴 namespaced `--dak-*` (5) | 9 | ✅ root-only | ❌ `.print-actions` | ❌ | ❌ (9px) | ✅ **terbaik** | Font Plus Jakarta Sans dideklarasikan tapi **tidak pernah dimuat**; accent navy `#1e3a8a` |

### Aset bersama

| File | Status |
|---|---|
| `src/styles/design-system.css` | ✅ Satu-satunya token block lengkap + alias `--bg/--surface/...` + dark root-only |
| `src/styles/components.css` | ⚠️ 7 hex + 6 radius mentah (landing/components hub) |
| `src/styles/tools.css` | 855 KB **hanya base64 font-face** (Plus Jakarta Sans, Geomini, SF Mono) — tanpa `.topbar`, `.tool-main`, print |
| `.tool-main` | **0 kemunculan di seluruh repo** |

---

## 5. Temuan Besar & Dampak

### 5.1 — Lima dialek token, bukan satu
Tidak ada satu pun tool yang me-link `design-system.css`. Tiap tool redefinisi palet sendiri (subset berbeda, nama berbeda: `--dak-*`, `--bg-color`, `--surface` vs `--box-bg`). Token `--radius-*`, `--shadow-*`, `--space-*` hampir tidak ada di tool → **22–43 nilai radius/shadow mentah per file**.

> **Dampak:** perubahan merek = 15 edit manual; tool baru tidak punya titik masuk yang jelas.

### 5.2 — Accent tidak pernah satu nilai
Merah `#ff0000` hanya di outbond/Faktur/latch/Analytic-`--primary`. Sisanya: crimson (retur), amber (Resi), navy (Task, form-dak), biru (expense, dist). **Kasus berbahaya:** `Analytic --accent: #f1f5f9` — token bernama "accent" yang nilainya warna kartu, dipakai sebagai `background: var(--accent)` di KPI/badge/thead.

> **Dampak:** merek tidak terbaca; `--accent` di Analytic menyesatkan kontributor berikutnya; `Resi --success: hitam` melanggar semantik sukses/gagal.

### 5.3 — Tiga strategi dark mode
- ✅ Root-only override: Faktur, Resi, Task, latch, form-dak, Analytic.
- ❌ Hardcode per-element: **tracking (62 hex)**, **pdf-merger (24 hex)** — merge masing-masing literal `#1e293b`/`#0f172a` saat dark toggled; rawan kontras rusak dan drift.
- ❌ Tidak berfungsi/paralel: **expense** selalu gelap (theme-init jalan, CSS tak mengonsumsi `data-theme`); **dist** memakai `.dark` class.

> **Dampak:** konsistensi toggle tema antar tool tidak terasa sama; dua tool berisiko kontras patah.

### 5.4 — Kerangka layout yang diwajibkan belum ada
- `.tool-main`: 0 kemunculan · `.topbar`: 5/15 · bottom-nav mobile: 1/15 (outbond) · `@media print`: 6/15.
- Header ad-hoc: `.nav-bar`, `.header-container`, `.mobile-tabs`, bare `h1`, `.print-actions`.
- Font Geomini hanya di hub + Analytic; beberapa tool tak me-link `tools.css`.

> **Dampak:** setiap tool punya struktur fungsi yang berbeda; navigasi/pindah-modul terasa patah-patah antar tool.

### 5.5 — Outlier visual
- **`tracking.html`**: Tailwind CDN (external dependency), 25 gradient, 78 inline `style` hex, palette biru — tidak terlihat satu keluarga dengan suite.
- **`dist/index.html` (Project_develop)**: shadcn/oklch/Tailwind/Inter — stack foreign, 2 blok `:root` oklch, dark `.dark` class.
- **resi-generator & latch**: **neumorphism disengaja** (`--neo-*`, `.raised/.pressable`, inset shadow) vs spec flat modern.
- **form-dak**: font deklarasi tak pernah dimuat → tool memakai font fallback.

> **Dampak:** dua tool tampak "beda produk"; dua tool lain berkarakter kuat namun keluar dari sistem.

---

## 6. Rencana Perbaikan Bertahap

### Fase A — Fondasi token (tanpa mengubah tampilan)
1. Perluas `design-system.css` dengan blok **alias tool** yang sudah lengkap (`--bg/--surface/--surface2/--text/--muted/--primary(+glow/light/soft)/--danger/--success/--warning/--border/--radius-* /--shadow-* /--space-* /--focus-ring`).
2. Buat `src/styles/tool-tokens.css` — snippet yang di-link setiap tool (atau di-inject via iframe hub) agar `:root` tool = alias baku + overrides domain masing-masing.
3. Catat pemetaan di `docs/guidebook/design.md` (tabel bab 3 di atas).

### Fase B — Perbaikan cepat per-tool (bertarget, risiko rendah)
| Tool | Tindakan |
|---|---|
| **Analytic** | Rename `--accent:#f1f5f9` → `--surface2`; ganti semua `background:var(--accent)` surface → `var(--surface2)/var(--surface)`; tambah `--surface/--radius-sm/md/--shadow-*`; arahkan aksen UI (active, toggle, badge) ke `--primary`. |
| **pdf-merger** | Pindahkan 19 rule dark literal → root-only token override (hapus 24 hex). |
| **retur-track** | Accent `#DA0037` → `--primary #ff0000`; `#16a34a` → `--success`; tambah `--danger/--radius-sm/md`. |
| **expense-tracker** | Implementasi dark via root-only override; `--primary` biru → merah brand; tambah toggle tema. |
| **form-dak** | Petakan `--dak-*` → `--bg/--surface/--text/--border/--primary` di `:root`; link `tools.css` (perbaiki font tak termuat). |
| **Resi** | `--success: hitam` → `#22c55e`; tambah `--primary` (merah) untuk aksen sistem; **keputusan neumorphism tertunda ke Fase C**. |
| **Task** | **Keputusan:** biarkan navy (`--accent #1B2A4A`) atau uniform ke merah brand? |
| **Faktur / outbond** | Sudah paling patuh — jadikan template referensi; bersihkan sisa hex di luar `:root`. |
| **Hub `components.css`** | Tokenisasi 7 hex + 6 radius mentah. |

### Fase C — Redesign outlier (perlu keputusan user)
1. **`tracking.html`** — migrasi Tailwind CDN → CSS vanilla + token suite; hilangkan 25 gradient & 78 inline hex; seragamkan CTA ke `--primary`. *(Pekerjaan terbesar.)*
2. **resi-generator & latch** — dua opsi: (a) pertahankan neumorphism sebagai "karakter tool" (dokumentasikan di DESIGN.md), atau (b) konversi ke flat modern (`--neo-*` → `--shadow-*`, hapus inset/`.pressable`).
3. **`dist/index.html`** — putuskan: container RND eksperimen (boleh beda stack) atau harus seragam.

### Fase D — Standarisasi shell/layout
1. Kerangka baku per tool: `.topbar` (brand + theme toggle) + `.tool-main` (scroll area) + footer, mengikuti pola Faktur/latch.
2. Bottom-nav mobile (56px + safe-area) untuk tool yang digunakan dominan mobile (outbond sudah).
3. `@media print` + `.no-print` untuk tool yang belum punya.
4. `prefers-reduced-motion`, `:focus-visible` `var(--focus-ring)`, ARIA pada ikon.

**Definisi done (Fase A–B):** 0 hex di luar `:root` per tool; `data-theme` konsumsi token-only; aksen sistem = `--primary`; ukuran CDP screenshot dark+light sama tanda visual suite.

---

## 7. Keputusan yang Perlu Diambil User

1. **Task** — navy khas dipertahankan, atau dikembalikan ke merah brand?
2. **Resi & latch** — neumorphism tetap (dokumentasikan) atau didatarkan?
3. **Accent suite** — semua tool satu merah, atau sistem bertingkat (merah utama + warna identitas per tool)?
4. **`tracking.html`** — redesign penuh sekarang, atau tunda ke proyek terpisah?
5. **`dist/index.html`** — dianggap laboratorium (di luar token), atau harus masuk satu keluarga?

---

*Dokumen ini adalah hasil audit statis (read-only). Belum ada perubahan kode aplikatif yang dilakukan.*