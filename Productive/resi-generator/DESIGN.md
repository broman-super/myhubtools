---
name: Resi Generator — Supersub
description: Generator label & resi cetak A6 (100×150mm) berbasis web, tanpa backend, untuk ekspedisi SuperSub.
colors:
  primary: "#ff0000"
  primary-dark: "#ff3b3b"
  on-primary: "#ffffff"
  surface: "#ffffff"
  surface-alt: "#f8fafc"
  surface-sunken: "#f1f5f9"
  border: "rgba(15,23,42,0.06)"
  ink: "#0f172a"
  ink-muted: "#64748b"
  success: "#22c55e"
  success-tint: "rgba(34,197,94,0.10)"
  danger: "#ef4444"
  danger-tint: "rgba(239,68,68,0.10)"
  accent-tint: "rgba(255,0,0,0.10)"
  paper: "#ffffff"
  paper-ink: "#000000"
  paper-muted: "#999999"
typography:
  display:
    fontFamily: "Geomini, Plus Jakarta Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.2
  data:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  action:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.2px"
  micro:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
  chip:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.4px"
rounded:
  xs: "6px"
  sm: "8px"
  md: "9px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "5px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "10px 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 18px"
    height: "44px"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 12px"
    height: "44px"
---

# Design System: Resi Generator — Supersub

## Overview

**Creative North Star: "The Logistics Desk"**

Resi Generator is a print-production tool, not a dashboard. It exists for one job: fill a form, see a 100×150mm label, print it. Everything else is subordinate to that path. The tool is deliberately sober and operational — Indonesian, plain, fast to scan — because the person using it is usually packing boxes with one hand.

The tool is **self-contained by design**: it is a single `index.html` plus data files, shipped inside the REYNAHUB hub. It does not load the hub's `design-system.css`, so it carries its own `:root` copy of the hub tokens rather than linking it. That is a deliberate architectural choice (offline / `file://` capable), not drift. **The values must stay identical to the hub** so a single theme change propagates everywhere.

**Key Characteristics:**
- One shell, one fixed topbar; the form is the app
- Preview is the artefact, always visible beside the form on desktop, placed below it on mobile
- Print output is a separate paper world (`#fff` / `#000`) — never themed by the UI palette
- Every color, radius, shadow, and shadow comes from `:root`; no raw hex outside it
- Touch targets are 44px minimum; hover states are gated behind `@media (hover: hover)`

## Colors

A single strong red accent carried over the hub brand, set against a cool near-white neutral field. Color is used to mean state, never decoration.

### Primary
- **SuperSub Red** (`#ff0000`): the accent. Active courier/service selection, primary action, focus ring, required-field marker. Dark: `#ff3b3b`.
- **Primary Foreground** (`#ffffff`): text/icon color sitting on red.

### Secondary
- **Signal Green** (`#22c55e`): success state only — the toast after a successful print and the "resi dibuat" result card.
- **Alert Red** (`#ef4444`): destructive and error state — delete-product button, validation toasts, the `.req` required marker.

### Tertiary
None. The tool has exactly one accent; adding a second would dilute it.

### Neutral
- **Paper White** (`#ffffff`): card, topbar, input, and preview surface.
- **Cool Field** (`#f8fafc`): app background behind the cards.
- **Sunken** (`#f1f5f9`): locked/read-only fields and dashed empty states; visually recedes.
- **Hairline** (`rgba(15,23,42,0.06)`): 1.5px borders. Dark: `rgba(255,255,255,0.07)`.
- **Ink** (`#0f172a`): body text and card titles.
- **Ink Muted** (`#64748b`): labels, captions, secondary text. Dark: `#94a3b8`.

### Named Rules

**The One Accent Rule.** Red marks selection, primary action, and focus — nothing else. If a red pixel is not telling the user "this is chosen, this is the way forward," it is wrong.

**The Paper Rule.** The label document is its own world and is **exempt from every scale in this file**. It is always `#ffffff` on `#000` (with `#999999` for empty-row placeholders), uses Arial, uses 4–5px corners, and uses 8–9px labels and 9–11px table text. Those values are correct for a 100mm sheet and are deliberately undersized relative to the UI ramp. Do not "fix" them to match the UI, and do not let the design detector's `design-system-*` findings inside the print stylesheet string be read as defects.

**The Copy-Not-Link Rule.** This tool deliberately re-declares hub token values in its own `:root` instead of linking `design-system.css`. Every value must match the hub. Divergence is a bug, not a local preference.

## Typography

**Display Font:** Geomini (self-hosted, weights 600/700/800) — headings, `.topbar-title`, `.layanan-txt` on the printed label.
**Body Font:** Plus Jakarta Sans (self-hosted, weights 400/500/600/700/800) — everything else. `font-display: swap`, with a system stack fallback.
**Label/Mono Font:** none distinct.

**Character:** Operational and legible. Plus Jakarta Sans keeps the form calm at small sizes; Geomini gives the printed label enough authority to read across a packing table.

### Hierarchy
- **Display** (800, 16px, 1.2): the app wordmark in the topbar. The label's service name (14px, 800, uppercase) is the print-world display role.
- **Data** (600, 14px, 1.3): values that carry meaning — delete-button glyph size, card titles' body counterpart, mobile suggestion rows.
- **Action** (600, 13px, 1.4): buttons, toasts, suggestion items, product rows, result-card titles. The working size of the tool.
- **Body** (400, 16px, 1.45): inputs and addresses. 16px is deliberate — below it iOS Safari force-zooms on focus and breaks the form.
- **Label** (600, 12px, 0.2px, muted): field labels above inputs.
- **Micro** (600, 11px, 1.4): version tag, `.r-sub`, "add manually" hint.
- **Chip** (600, 10px, 0.4px, uppercase): courier labels, locked-field badge, tag chips, suggestion SKU/category. Never below 10px.

Anything off this seven-step ramp is a bug. Concretely: `10.5px`, `12.5px`, `13.5px`, and `9.5px` were removed in the normalization pass — every UI size now lands on a declared step.

### Named Rules

**The 16px Input Rule.** Every text input, select, and textarea is 16px, always. It prevents iOS focus zoom and keeps the form usable one-handed. Never shrink inputs for density.

**The Print Is Arial Rule.** The popup print document uses Arial. It is a separate document with no access to the app's fonts, and Arial renders identically on every print driver. This is intentional, not a missing font.

**The Seven-Step Rule.** The UI ramp is `10 → 11 → 12 → 13 → 14 → 16px`, plus the 16px display. No other value is permitted in the UI stylesheet. The print document is exempt (see The Paper Rule).

## Layout

Fixed 58px topbar (sticky, `z-index: 100`) over a single scrolling column, max-width 1080px, centered.

Desktop is a two-column split: the form on the left (fluid, `minmax(0,1fr)`) and a 392px sticky preview pane on the right (`top: 76px`). The gap is 22px. The action card (Preview & Print) is sticky to the bottom of the form column.

Responsive breakpoints — content-driven, not device-driven:
- **≤900px** — preview drops below the form and loses its sticky position; single column.
- **≤680px** — outer padding tightens (28px/18px → 20px/14px), action buttons share width.
- **≤480px** — card padding drops to 16px, courier grid goes 6→3 columns, product row sheds its SKU/qty labels.
- **`pointer: coarse`** — independent of width: courier buttons, suggestions, action card, and toast all gain padding and respect `env(safe-area-inset-bottom)`.

Safe areas: the topbar and `.main` inset by `env(safe-area-inset-left/right)`; `viewport-fit=cover` is set. Long addresses wrap with `word-break: break-word`; the preview iframe scales down with JS (`transform: scale()`) rather than reflowing, so a 100mm label stays legible at any width.

## Elevation & Depth

A three-step shadow scale, copied from the hub. Shadows are **ambient, not structural** — surfaces are distinguished by border and background first.

### Shadow Vocabulary
- **sm** (`0 4px 6px -1px rgba(0,0,0,0.02)`): resting controls — courier buttons, pills, secondary buttons, the preview frame.
- **md** (`0 12px 24px -10px rgba(0,0,0,0.06)`): lifted containers — cards, preview pane, suggestions dropdown, toast.
- **lg** (`0 20px 40px rgba(0,0,0,0.15)`): the sticky action card and the lightbox.
- **press** (`inset 0 1px 3px rgba(0,0,0,0.10)`): the `:active` inset on buttons and inputs — tactile feedback, never at rest.

Dark mode multiplies the alphas (0.4 / 0.5 / 0.6 / 0.6).

### Named Rules

**The Flat-By-Default Rule.** Nothing carries a shadow at rest except the three scale roles above. Hover lifts by one step (`sm → md`), never two. `transform: translateY(-2px)` on hover is the only motion shadow.

## Shapes

Squarish, machined, and compact — a form tool, not a soft consumer app. Corners follow a five-step ladder: `6px` for micro chips (suggestion SKU/category tags), `8px` for inputs, chips, suggestion popovers, and small buttons, `9px` for primary/secondary buttons, toasts, courier buttons, and the result card, `12px` for cards and the preview pane, and full-round for the service pill and version tag.

Borders are 1.5px in `--border` — a hairline that reads as an edge, not a stroke.

### Named Rules

**The Pill Exception.** Only `.pill` (service selector) and the topbar version tag use full-round. Everything else is cornered. If it isn't a chip, it gets a real corner.

## Components

### Buttons
- **Shape:** 9px radius, `min-height: 44px`, 13.5px/600.
- **Primary** (`.btn-primary`): red fill, white text, `md` shadow at rest → `lg` on hover, `#000` 18% mix on active.
- **Secondary** (`.btn-secondary`): white surface, hairline border, ink text; hover raises the border to red and text to red.
- **Ghost / tertiary:** none. There is no third button weight.
- **`sm` variant** (`.btn-sm`): 8px 14px, still 44px tall, used in the result card.

### Chips
- **Courier button** (`.eksp-btn`): white surface, hairline border, greyscale logo at `brightness(.4)`, 8.5→9.5px uppercase label. Active state is a red border plus the `press` inset — not a fill.
- **Service pill** (`.pill`): full-round, 44px min-height. Active state *is* a red fill with white text.
- **Tag pill:** muted surface, muted text, 11px/600.

### Cards / Containers
- **Corner:** 12px.
- **Background:** white surface, 1.5px hairline border, `md` shadow.
- **Internal padding:** 20px 22px, dropping to 16px at ≤480px.

### Inputs / Fields
- **Style:** 1.5px hairline border, white surface, 8px radius, `11px 12px` padding, 16px text.
- **Focus:** border shifts to red plus a 3px `color-mix(in srgb, var(--accent) 20%, transparent)` ring and the `press` inset. No `outline: none` without a replacement.
- **Locked / read-only** (`.locked-field`): sunken `--surface-sunken` background, `--ink-muted` text, `cursor: not-allowed`, a lock icon, and a labeled badge saying the field is fixed.
- **Error / Disabled:** validation is toast-driven (see Do's and Don'ts); inputs themselves have no inline error state. Disabled buttons are `opacity: .5` with `pointer-events: none`.

### Navigation
- **Topbar only** — there is no in-tool navigation beyond it. 58px, sticky, white surface, hairline bottom border, `sm` shadow. Contains the wordmark, a version/size tag, and a 44px theme toggle.
- **Back to hub:** delegated to the hub's own iframe chrome; the tool shows no back button of its own.

### Preview Frame (signature component)
A live 378px-wide iframe whose `srcdoc` is the real label document — not a mock. It scales with `transform: scale()` to fit its column and reports its own height via a `load` listener that reads `contentDocument.body.scrollHeight`. Selection state, not a screenshot, is the source of truth, so the print output and the preview can never disagree.

## Do's and Don'ts

### Do:
- **Do** keep `:root` values identical to `src/styles/design-system.css`. The copy exists for offline/`file://` operation, not for independence.
- **Do** write every color, radius, and shadow through a token. The exception is the print document, which is a separate paper world.
- **Do** keep every text input at 16px to prevent iOS focus zoom.
- **Do** gate hover affordances behind `@media (hover: hover)` and give touch devices `pointer: coarse` equivalents.
- **Do** inset the topbar and main column by `env(safe-area-inset-*)` for notched phones.
- **Do** treat the preview iframe as the single source of truth for the label — build it once, print what it shows.

### Don't:
- **Don't** load a second web font beyond Plus Jakarta Sans and Geomini, and don't make the stylesheet render-blocking — `tools.css` is 855KB of inlined base64 and is loaded `media="print"` with `onload` promotion.
- **Don't** reintroduce neumorphism. The hard `--neo-*` double-shadow language was removed in the hub-convergence pass; shadows are the three-step scale only.
- **Don't** theme the print document. It stays `#fff`/`#000` with Arial in both light and dark.
- **Don't** use color alone for the active courier — it gets a red border plus an inset, and it must carry `aria-pressed`.
- **Don't** shrink the courier chip label below 10px, or any interactive target below 44px.
- **Don't** add `outline: none` to a focusable element without an equivalent visible focus treatment.
