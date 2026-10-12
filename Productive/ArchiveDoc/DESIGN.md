---
name: SPPD Toolbox
description: REYNAHUB webtool for a PIC's official work travel — one screen per task, from SPPD to accountability.
colors:
  accent: "#ff0000"
  accent-dark: "#ff3b3b"
  accent-hover: "#e60000"
  accent-soft: "#ffe6e6"
  bg: "#f8fafc"
  surface: "#ffffff"
  surface-2: "#f1f5f9"
  border: "rgba(15,23,42,0.06)"
  text: "#0f172a"
  muted: "#64748b"
  ink: "#0f172a"
  dark-bg: "#090d16"
  dark-surface: "#121826"
  dark-surface-2: "#1e293b"
  dark-border: "rgba(255,255,255,0.07)"
  dark-text: "#f1f5f9"
  dark-muted: "#94a3b8"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  success-deep: "#047857"
  success-tint: "#ECFDF5"
  warning-deep: "#D97706"
  warning-tint: "#FEF3C7"
  info-deep: "#1D4ED8"
  info-tint: "#EFF6FF"
  danger-deep: "#B91C1C"
  danger-tint: "#FEE2E2"
  slate: "#64748b"
  slate-tint: "#f1f5f9"
typography:
  display:
    fontFamily: "'Geomini', 'Plus Jakarta Sans', system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: 0
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.06em"
rounded:
  card: "18px"
  sm: "12px"
  xs: "10px"
  focus: "8px"
  pill: "999px"
spacing:
  card-pad: "24px"
  card-pad-desktop: "32px"
  field-pad: "10px 12px"
  form-gap: "14px"
  section-gap: "24px"
components:
  btn-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  card-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
    border: "1px solid {colors.border}"
  badge-pill:
    backgroundColor: "{colors.slate-tint}"
    textColor: "{colors.slate}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  tabseg-active:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
---

# Design System: SPPD Toolbox

## Overview

The SPPD Toolbox is one webtool inside **REYNAHUB**, and it speaks the hub's
one visual language: the same red accent, the same Geomini + Plus Jakarta Sans
type, the same soft surfaces, the same radius and shadows, and the same light /
dark theme. A PIC should feel they never left the hub.

What stays local to this tool is the *workflow*: one task is one screen of
eight numbered, collapsible sections, mobile-first, driven end to end from
SPPD to accountability. The identity is the task screen, not a bespoke palette.

**Key characteristics:**
- Hub tokens only — accent `#ff0000` (dark `#ff3b3b`), bg `#f8fafc`, surface
  `#ffffff`, border `rgba(15,23,42,.06)`, text `#0f172a`, muted `#64748b`.
- **Geomini** display face for titles and every money/quantity value; **Plus
  Jakarta Sans** for all body and label text.
- Soft, low-elevation surfaces: 18px cards, 12px fields, 999px pills, a single
  hairline border, and a barely-there ambient shadow (no heavy depth except
  modals).
- Full light / dark theme via `[data-theme]` (hub bridge or the local toggle).
- The eight-section work surface is the signature layout.
- Restrained motion (opacity/transform, ~150–200ms) that dies under
  `prefers-reduced-motion`.

## Colors

### Accent (hub red)
- **Accent** `#ff0000` (dark `#ff3b3b`): primary CTA fill, `.psec-num` section
  numbers, section kickers, active navlink text, input focus border + ring, the
  "next" flow pill, and progress fills.
- **Accent hover** `#e60000` (dark `#ff6b6b`): primary-button hover and
  `.btn-soft` text.
- **Accent soft** `#ffe6e6` (dark `rgba(255,59,59,.18)`): navlink-active and
  `.btn-soft` fill; `--accent-soft-hover` `#ffd4d4` on hover.

### Neutral
- **Bg** `#f8fafc` (dark `#090d16`): page background.
- **Surface** `#ffffff` (dark `#121826`): cards, fields, modals, top bar.
- **Surface 2** `#f1f5f9` (dark `#1e293b`): hover fills, disabled fields,
  table-row hover.
- **Border** `rgba(15,23,42,.06)` (dark `rgba(255,255,255,.07)`): every
  hairline.
- **Text** `#0f172a` (dark `#f1f5f9`): primary text and `--ink` (dark panels,
  active pills).
- **Muted** `#64748b` (dark `#94a3b8`): secondary text, labels, eyebrows.

### Semantic status (pill set)
Tint + deep-text pairs on the 999px `.badge`: Success `#059669` on `#ECFDF5`;
Warning `#D97706` on `#FEF3C7`; Info `#1D4ED8` on `#EFF6FF`; Danger `#B91C1C`
on `#FEE2E2` (button fill `#EF4444`); Neutral `#64748b` on `#f1f5f9`. Wallet
badges: Bank → blue tint, QRIS → neutral tint (`#f1f5f9`/`#0f172a`), Kas →
green tint, E-Money → accent tint (`#ffe6e6`/`#e60000`). These pills carry
their own background + text, so they stay readable in dark mode without a
separate dark value.

**The Red Discipline Rule.** Red marks decisions: the CTA that advances the
task, the number of the section you are in, the next
step. Active navigation and bulk progress render in Ink instead, so red never
dilutes into screen-wide decoration.

## Typography

**Display:** Geomini (600/700/800) — titles, section titles, page titles, and
all numerals. Loaded from the shared hub loader `src/styles/tools.css`.
**Body:** Plus Jakarta Sans (400–800) — everything else.
**Tabular figures, not mono:** money and quantity values use
`font-variant-numeric: tabular-nums`.

### Hierarchy
- **Display title / numeral** (Geomini 700–800, line-height .9, tabular-nums):
  page titles (`.stat-num text-4xl`), section numbers (`.psec-num`), stat-card
  values (`1.875rem → 2.25rem ≥640px`), watch/hero big numbers (`44px`/`56px`).
  `overflow-wrap: break-word` guards long Rupiah.
- **Section title** (Geomini via `h3`, 14px uppercase): `.psec-title`.
- **Card title** (Geomini via `h1–h6`, text-lg): all `<h2>`/`<h3>` headings,
  including modal titles and the empty-state title.
- **Body** (Plus Jakarta 400, 14px): content, table cells, descriptions (12px
  for `.vc-sub`).
- **Label / eyebrow** (Plus Jakarta 800, 11px, uppercase, `.06–.09em`):
  stat-card labels, nav-group eyebrows, section kickers, table headers, form
  labels (12px), the "next" hero label.

## Layout

The app shell reuses the hub pattern: a sticky 64px top bar (surface/95% blur,
hairline bottom border), content in one centered column capped at `1800px`,
padding `16 → 24 → 32px`.

- **Eight-section work surface:** sections stack as one column and split into
  two balanced multi-column streams only at ≥1500px (28px gutter,
  `break-inside: avoid`). DOM order 01–08 is unchanged; each `.psec` is a
  container so internal grids collapse by *column width* (`≤819px` → 1 column),
  not viewport.
- **Sections:** `scroll-margin-top: 96px`; numbered Geomini accent numeral +
  uppercase title + folding hairline rule; open/closed state and scroll survive
  a reload.
- **Forms:** one column on narrow, two from ≥640px (more room ≥1440px); 14px gap.
- **Cards:** 24px padding, `28px 32px` at ≥1024px.
- **Rhythm:** section gap 24px; tables collapse row rhythm rather than dropping
  columns.

**The Usable-Column Rule.** Grids never create a column too narrow to read a
form or table on a field phone. Splits happen only where the wide column stays
≥820px; otherwise everything stacks.

## Elevation & Shapes

Flat at rest, ambient lift only. Card shadow `0 4px 6px -1px rgba(0,0,0,.02)`
(light) / `rgba(0,0,0,.3)` (dark). The only heavy depth is the modal:
`0 20px 40px rgba(0,0,0,.15)` (dark `.6`) over a 45% blurred backdrop,
entering at 0.18s ease-out.

Radii: cards 18px, fields/buttons 12px, small buttons 10px, focus outline 8px,
navigation / segmented tabs / flow pills / badges 999px. 1px `Border` hairline
outlines every sheet. Focus: 2px accent outline (2px offset) for
links/buttons/tabs; a red border + `0 0 0 3px rgba(255,0,0,.10)` ring
(`rgba(255,59,59,.18)` dark) for fields.

## Components

### Buttons — *solid, decisive*
- 12px radius (10px small); padding `10px 16px` (small `6px 10px`, 12px).
- **Primary:** accent fill, white text; hover accent-hover.
- **Ink:** `--ink` fill, white text; hover `--ink-hover`.
- **Soft:** accent-soft fill, accent-hover text; hover `--accent-soft-hover`.
- **Ghost:** surface fill, 1px border; hover border → text color.
- **Danger:** `#EF4444` fill, white text.
- **Light:** translucent white on dark heroes.

### Pills & badges
- **`.badge`:** 999px, 11px/800, `3px 10px`, tint + deep text.
- **`.doc-chip`:** surface fill, hairline; `surat` variant uses accent-soft +
  accent-hover.
- **`.flow-pill`:** surface pill; `.is-next` accent fill; `.is-done` green tint
  (`#ECFDF5`/`#047857`).
- **`.tabseg` / `.tab-btn` / navlink:** 999px shell; active = `--ink` fill,
  white text.

### Cards
- 18px radius, `--surface` background, 1px `--border`, ambient shadow, 24px pad.
- Dark authority panels use `--ink`; `.card-accent` uses the accent.
- **Papan Dinas hero:** surface sheet, hero
  numeral in accent, progress track with **Ink** fill, green/neutral check pills.

### Inputs
- Surface fill, 1px border, 12px radius, `10px 12px`, 14px Plus Jakarta Sans.
- Focus: border → accent + 3px `--ring-accent`.
- Label 12px/700 muted above the field.

### Navigation
- Three eyebrow groups — Kerja · Katalog · Bantuan — with 1px × 22px `nav-sep`
  rules and 11px uppercase muted `.nav-group-label`.
- Top bar: 64px sticky, surface/95% blur, hairline border; brand in Geomini
  ExtraBold with "Toolbox" in accent; status chip far right.
- Pill items: 14px/600, `8px 12px`, 999px; hover `--surface-2`; active = Ink
  fill + white text (`aria-current="page"`).

## Theming & integration

- `css/styles.css` declares all tokens in `:root` and a full `[data-theme="dark"]`
  block.
- The prebuilt `css/tailwind.css` bakes color utilities to literal hex, so they
  can't follow `[data-theme]`; `index.html` therefore re-maps the themed
  utilities (`.bg-surface`, `.text-ink`, `.border-line`, `.font-display`, the
  `accent-[#E11D2E]`/`border-[#E11D2E]` arbitrary classes, …) to `var()` in an
  inline `<style>` loaded **after** `tailwind.css`.
- Fonts come from the shared loader `src/styles/tools.css` (base64 `@font-face`
  + global baselines), matching every other hub tool.
- Theme is driven by the hub bridge when embedded (`request-theme` /
  `SET_THEME` / `THEME_CHANGED`) or by the local toggle + `reynahub-theme`
  storage when standalone. `.is-embedded` hides the duplicated brand and footer.

## Do's and Don'ts

### Do:
- **Do** use hub tokens and `var()` — never a raw hex for a themed surface.
- **Do** set every Rupiah and quantity in Geomini with `tabular-nums`.
- **Do** keep sheets soft-cornered (18px cards, 999px pills) and hairline-outlined.
- **Do** let flat surfaces breathe; the ambient shadow is the lift, not a border.
- **Do** honor `prefers-reduced-motion`.

### Don't:
- **Don't** add a second accent hue; status tints live only in pills.
- **Don't** give a second screen-role to red — active nav and bulk progress are
  ink, not red.
- **Don't** ship gradients, glass, or glow.
- **Don't** force two columns where a form/table would collapse to a sliver.
- **Don't** change the print-mode `<style>` blocks (the printable SPPD/report
  output must stay byte-stable for the official document format).
