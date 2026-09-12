# Progress: RND Roadmap Tracker (Project_develop)

> Catatan progres untuk resume sesi berikutnya. Dibuat 2026-09-11.

## Tujuan (state saat ini: SELESAI)
- Tool tampil **persis preset shadcn mist** (palet oklch, biru primary, Inter, radius 10px, komponen shadcn).
- Tugas anti-dobel-kirim + spinner (FASE 1–8) selesai di sesi sebelumnya. Jangan diutak-atik.

## Keputusan desain (penting)
- User **sengaja tidak** mengikuti Design System REYNAHUB (merah, `docs/DESIGN.md`) untuk tool ini. Brief: **persis preset shadcn mist**. Aksen biru, bukan merah.
- Semua #fff di elemen aktif → `var(--primary-foreground)`. Semua pastel hardcode status → tint `color-mix(in oklch, <warna> 13%, var(--card))`.

## Stack
- React 19 + Vite + Tailwind v4 + `@base-ui/react` (bukan Radix) + `cn` + class-variance-authority + `@remixicon/react` + `lucide-react` + `@fontsource-variable/inter`.
- Build **wajib satu file** (`vite-plugin-singlefile`, `base: "./"`) → `dist/index.html` (±766 KB) untuk hub iframe `#productive/rnd-roadmap` (router `src/core/router.js:43`).
- Backend: Supabase (RLS read) + GAS bridge via `src/supabase.js`; jangan diubah.

## Struktur file utama
- `src/App.jsx` (±2400 baris, JSX monolith): seluruh UI. Token map `C`, `R` di baris ~19–40 → semua mengarah ke token shadcn.
- `src/index.css`: preset mist + `@layer base`; tidak ada token alias lama yang dipakai App lagi (App pakai `var(--...)` langsung).
- `src/main.jsx`: `ThemeProvider storageKey="rnd-theme"` (default light, hotkey `d`), tanpa StrictMode.
- `src/components/ui/*`: button, tabs, badge, card, input, textarea, select, dialog, alert-dialog, separator, label (base-ui).
- Hub localStorage theme key: `reynahub-theme` (jangan disamakan dengan `rnd-theme`).

## UI conversion (yang sudah dikonversi di sesi ini)
- `IconButton/PrimaryButton/SecondaryButton/FieldLabel` → shadcn `Button`/`Label` (ghost icon-sm, default, outline; danger → text-destructive).
- `inputStyle` → `Input`/`Textarea`/class select (`inputCls` + `cn`).
- `Modal` → `Dialog` (base-ui) + **handler Escape (capture) + klik overlay + klik popup** manual karena Escape/close bawaan base-ui tidak responsif. Guard `onCloseAttempt` (dirty-check "Keluar?") tetap jalan.
- `ConfirmProvider` → `AlertDialog` (Cancel/Batal=false, Action/Keluar=true; `variant destructive` saat `danger`) + fallback Escape. CSS mati `.rnd-confirm`/`.rnd-btn-*` dihapus.
- Eksport CSV/PDF dashboard & detail → `SecondaryButton`. Filter chips/nav/sidebar tetap custom tapi sudah pakai token shadcn.

## Verifikasi (cara kerja)
- Build: `npm.cmd run build` (npm.ps1 diblokir execution policy). Git tidak di PATH.
- Probe CDP: Chrome remote-debugging (`--headless=new --remote-debugging-port=9224 --user-data-dir=...\Temp\opencode\chrome-probeN`) + script node di `C:\Users\MEDIAS~1\AppData\Local\Temp\opencode\probe*.mjs` (probe4=render, probe5=interaksi, probe7=cek `--json/new`, screenshot.mjs = capture PNG).
- Error `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` saat exit node = harmless.
- Detector mekanis: 2 warning wajar (border kutipan rich-text `.rt-quote`, `transition: width` progressbar). Dibiarkan.

## Hal yang ditinggalkan sengaja (ponytail)
- Warna di `@media print` (report) & marker pencarian (`#fff3a3`) tetap hardcode; konteks print/search, aman.
- Lightbox, DatePicker, toast, filter chips pakai default styling (bukan komponen shadcn) tapi sudah menyesuaikan token.

## Dokumentasi & aset (2026-09-11)
- `PRODUCT.md` (scope tool ini): deskripsi produk, user (personal + R&D internal), stack, konstrain; fakta dikonfirmasi user.
- `docs/screenshot-dashboard-light.png`: screenshot dashboard (light, 1280×900) sebagai bukti visual.
- `src/index.css`: alias bridge dipangkas: hanya `--surface2`, `--focus-ring`, `--radius-full`, `--shadow-sm/md`, `--warning`, `--success`. Yang dibuang (`--bg`, `--surface`, `--text`, `--primary-light`, `--radius-bento`, `--font-sans` duplikat) tidak dipakai App.jsx.

## Paket 10 fitur baru (2026-09-12): Fase 1–11 selesai
Rencana rinci di `Update_Plan.md` (Fase 1–12). Fitur dikerjakan surgical di `src/App.jsx`; backend & hub shell diubah minimal.
- **Fase 1 Prioritas**: `PRIORITY_META` (P1 dark-red/P2 amber/P3 sky), select + chip kartu, sort "Prioritas". Build 767.30 kB.
- **Fase 2 Tag**: state tags di ProjectModal + saran (`allTags`), filter tag multi (AND) + chip kartu (maks 3 + `+n`). 770.24.
- **Fase 3 Template**: localStorage `rnd-templates` (`loadTemplates/saveTemplates`), `cloneNodeClean` + `instantiateMilestones`, `TemplateSelector` di Project Baru, tombol "Simpan Template" di detail. 772.07.
- **Fase 4 Salin Checklist**: prop `allProjects`, `importSources` (template + project lain), UI pilih sumber/centang, `importChecklistItems` (skip duplikat judul). 774.62.
- **Fase 5 Duplikasi**: `duplicateProject` (deep copy, id baru, " (salinan)", status Ideation, milestone via `cloneNodeClean`, history di-reset). 775.42.
- **Fase 6 Auto Status**: `effectiveStatus(p)` + `STAT_EFF` (display-only, tanpa tulis-loop), checkbox modal, filter/count/card/ProjectDetail pakai status efektif + chip "Auto: …". 776.35.
- **Fase 7 Timeline** (Gantt readonly): `flattenDepth`, `TimelineView` (bar per milestone, indent depth, sumbu tanggal lo→hi, garis "Hari ini", warna status, grup "Tanpa tanggal target", empty-state). Tab `Timeline` di detail. 779.86.
- **Fase 8 Notifikasi + badge hub**: `allAlerts` (overdue+upcoming), bel + dropdown (mark-all-read via `localStorage['rnd-seen-alerts']`), menulis `localStorage['rnd-alert-count']`. Hub shell diubah: `src/components/tool-card.js` (elemen `#badge-rnd-roadmap`), `src/styles/components.css` (`.card-badge`, pakai `var(--danger)`), `src/app.js` (`updateRndBadge` + `setInterval` 5 dtk). 783.35.
- **Fase 9 Log Aktivitas**: `logActivity` (prepend history cap 100, via `updateProject`), log di semua handler milestone/checklist/eval/simpan-template + data proyek (dirty-check field). Tab `Aktivitas` + komposer komentar (Ctrl+Enter). `duplicateProject` reset history. 787.42.
- **Fase 10 Ringkasan Mingguan**: `weeklySummary(projects)`, `WeeklyPanel` di dashboard (7 metrik + "Salin Ringkasan" pakai clipboard). 790.60.
- **Fase 11 Regresi**: 2 bug lama ditemukan & diperbaiki. Dashboard filter memakai `needle` tak terdefinisi (2 titik: filter `.filter` & empty-state), diganti `q`. Probe CDP `probe-regresi.mjs` PASS semua (dashboard, weekly, pencarian saring, tab detail, bel, badge hub; 0 console error). Verifikasi visual bar timeline menunggu project dengan targetDate berisi (data server saat ini tidak punya milestone ber-tanggal).

## Catatan penting
- App memuat data dari **Supabase (Jaringan aktif)**. Data server menimpa localStorage. Probe jangan mengandalkan seeding localStorage untuk data nyata.
- Badge hub angka dibaca dari `localStorage['rnd-alert-count']` (ditulis App, dibaca shell interval 5 dtk; origin berbeda, keduanya terpisah tapi konsisten).
- `d` = toggle dark/light (ThemeProvider `storageKey="rnd-theme"`).

## Next steps (jika lanjut)
1. (Optional) Verifikasi visual & pengujian manual fitur oleh user (Fase 12). Fokus: Timeline bar (butuh milestone ber-tanggal), notifikasi, salin checklist, template, duplikasi.
2. (Optional) Update Impeccable ke v4.3.1: `npx impeccable update` (jalankan di sesi berikutnya).
3. (Optional) Verifikasi visual hub nyata; keluhan desain baru → tanya arah dulu (preset mist vs Design System REYNAHUB).