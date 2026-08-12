---
name: bro-ui
description: Kitab desain REYNAHUB/UNITOOLS. Gunakan saat: UI/UX, CSS, styling, warna, tema, token, design-system, tools.css, font, radius, spacing, dark/light mode, aksesibilitas, platform colors.
---

# Bro-UI — Kitab Desain REYNAHUB/UNITOOLS

## 1. Brand Identity
- **Aksen utama**: Merah `#ff0000` (`--accent`) — light; `#ff3b3b` — dark.
- **Display font**: `Geomini` (600-800) — judul, hero, logo, pill.
- **Body font**: `Plus Jakarta Sans` (400-800) — teks, UI, form.
- **Mono font**: `SF Mono`, `Cascadia Code`, `Fira Code`, `Consolas` — kode, resi, log.
- **Subtle highlight principle**: `color-mix(in srgb, var(--accent) 10%, transparent)` light / 18% dark. **Jangan pernah** border 2px + glow berlebihan; gunakan latar tipis (`.hit-card`) atau sorot teks (`.hit-resi`).
- **Bento radius**: 18px (`--radius-bento`); **Card radius**: 8px (`--radius-sm`); **Input radius**: 12px (`--radius-md`).

## 2. Token Mapping — Hub ↔ Tool (Single Source of Truth)

| Hub (`design-system.css`) | Tool (inline `<style>`) | Catatan |
|---|---|---|
| `--accent` / `--primary` | `--primary` | Merah brand. Dark: `#ff3b3b`. |
| `--accent-glow` / `--primary-glow` | — | `rgba(255,0,0,0.08)` / dark `0.15`. |
| `--primary-light` | — | `#ff7b7b` light / `#ff6b6b` dark (hover/active). |
| `--primary-soft` | — | Latar sorot halus: 10% light / 18% dark. |
| `--bg-primary` / `--bg` | `--bg` | Light `#f8fafc` / Dark `#0f172a` (tool: `#0f172a`). |
| `--bg-card` / `--surface` | `--surface` | Light `#ffffff` / Dark `#1e293b` (tool: `#1e293b`). |
| `--surface2` | `--surface2` | Light `#f1f5f9` / Dark `#1e293b`. |
| `--text-main` / `--text` | `--text` | Light `#0f172a` / Dark `#f1f5f9`. |
| `--text-muted` / `--muted` | `--muted` / `--text2` | Light `#64748b` / Dark `#94a3b8`. |
| `--border` | `--border` | Light `rgba(15,23,42,0.06)` / Dark `rgba(255,255,255,0.07)`. |
| `--danger` | `--danger` | `#ef4444`. |
| `--success` | `--success` | `#22c55e`. |
| `--warning` | `--warning` | `#f59e0b`. |
| `--radius-sm` (8px) | `--radius-sm` (8px) | Card, badge. |
| `--radius-md` (12px) | `--radius-md` (12px) | Input, search box. |
| `--radius-bento` (18px) | — | Bento grid, modal. |
| `--radius-full` | `--radius-full` | Pill, badge, avatar. |
| `--shadow-sm/md/lg` | `--shadow-*` | Nilai asli `components.css`. |
| `--space-1..8` | `--space-*` | 4/8/12/16/20/24/32px. |
| `--focus-ring` | — | `0 0 0 3px var(--accent-glow)`. |

## 3. Dark / Light Rules
- **Wajib** cek dua tema: semua warna via token, **tidak ada hardcode** hex/rgba di CSS/JS/HTML.
- Tool dark defaults: `--bg:#0f172a`, `--surface:#1e293b`, `--primary:#ff3b3b`.
- Platform background opacity: 12% light / 18% dark (`--platform-*-bg`).
- `color-mix(in srgb, var(--accent) X%, transparent)` untuk sorot: 10% light / 18% dark.
- Focus ring: `var(--focus-ring)` = `0 0 0 3px var(--accent-glow)`.

## 4. Spacing & Radius Discipline
- Gunakan `--space-*` variabel, **jangan** magic number.
- Radius: `--radius-sm` (8px) card/badge, `--radius-md` (12px) input/form, `--radius-bento` (18px) bento/modal, `--radius-full` pill.
- Shadow: gunakan `--shadow-sm/md/lg` dari design-system.

## 5. Platform Colors
- IG `#a855f7`, WA `#22c55e`, TT `#a1a1a1`, SP `#f97316`, WB `#3b82f6`, EVT `#06b6d4`, Other `#64748b`.
- Background otomatis 12%/18% via `--platform-*-bg`.
- Text on platform bg: `--platform-*-txt` (`#ffffff`).

## 6. Mobile-First & Layout
- Bottom nav fixed di mobile (`56px + safe-area`), sidebar → bottom bar.
- `100dvh` / `100vw` lock, `overflow: hidden` di body, scroll di area konten.
- Bento grid: `repeat(auto-fill, minmax(260px, 1fr))`.
- Safe-area inset: `env(safe-area-inset-bottom)`.

## 7. Accessibility (A11y)
- `:focus-visible` pakai `var(--focus-ring)` — **jangan** `outline: none`.
- Kontras teks ≥ 4.5:1 (token sudah menjamin).
- `prefers-reduced-motion` respected (sudah di design-system).
- Font size ≥ 13px (`--space-1` = 4px baseline).
- ARIA labels pada elemen interaktif.

## 8. Do / Don't
| ✅ Do | ❌ Don't |
|---|---|
| `var(--primary-soft)` untuk sorot halus | `border: 2px solid var(--primary)` + box-shadow berlebihan |
| `color-mix(in srgb, var(--accent) 10%, transparent)` | Hardcode `rgba(255,0,0,0.2)` |
| Token radius/shadow/space | Magic number `8px`, `12px`, `0 4px 6px...` |
| Cek dark & light sebelum commit | Asumsi satu tema cukup |
| `var(--font-sans)` / `var(--font-display)` | Hardcode `'Plus Jakarta Sans'` / `'Geomini'` |
| Load skill `bro-ui` saat kerja UI | Asumsi selera desain tanpa cek kitab |

## 9. File Referensi
- `src/styles/design-system.css` — token utama.
- `src/styles/components.css` — komponen hub (pakai token).
- `src/styles/tools.css` — font loader + baseline (token font ada di design-system).
- `src/styles/utilities.css` — utilitas gap/padding/typography.
- Tool masing-masing `<style>` — target migrasi token (gradual).

---

**Saat review UI**: cek diff vs tabel token di atas; jika ada hardcode → ganti ke token; jika ada border/glow berlebihan → ganti ke `primary-soft`; jika radius/shadow/space magic number → ganti ke token.