# Desain Sistem — REYNAHUB_SYS

**Updated:** 2026-07-27
**Scope:** Design system and patterns for the shell AND all current/future tools

---

## 1. Design Philosophy

Every tool in REYNAHUB_SYS shares a consistent look and feel through **CSS custom properties**. The shell defines the design tokens; each tool interprets them independently. No tool should feel like it was built by a different team — the tokens make them all look like one system.

**Three pillars:**
1. **Consistency** — same colors, spacing, typography across all tools
2. **Isolation** — each tool owns its styles; no CSS conflicts
3. **Adaptability** — dark mode, print, mobile all handled per tool via tokens

---

## 2. Design Tokens (The Source of Truth)

All design decisions in every tool should reference these tokens. No hardcoded colors, font sizes, or spacing values.

### 2.1 Color Palette
```css
/* Base */
--bg-primary:    #f8fafc;    /* Page/shell background */
--bg-card:       #ffffff;     /* Card, modal, container background */
--text-main:     #0f172a;     /* Body text */
--text-muted:    #64748b;     /* Labels, secondary text, placeholders */
--accent:        #ff0000;     /* Primary brand accent (red) */
--accent-glow:   rgba(255, 0, 0, 0.08);
--border:        rgba(15, 23, 42, 0.06);
--sidebar-bg:    #000000;
--sidebar-color: #ffffff;
```

### 2.2 Platform Colors — Centralized System (Untuk Tools dengan Banyak Warna)
Tools seperti Task Scheduler yang memerlukan banyak warna (per platform: IG, WA, TT, SP, WB, EVT) harus menggunakan sistem warna terpusat ini.

**Pattern:** Setiap platform punya 3 token yang saling terkait:
- `--platform-<id>`: warna utama (solid)
- `--platform-<id>-bg`: background 12% opacity (untuk badge/badge-light)
- `--platform-<id>-txt`: text color yang kontras dengan `--platform-<id>-bg` (biasanya putih)

**Daftar platform yang sudah terdaftar:**
| ID | Warna | Badge Background | Contoh Penggunaan |
|----|-------|-------------------|-------------------|
| `ig` | `#a855f7` (purple) | `rgba(168,85,247,0.12)` | Instagram campaign |
| `wa` | `#22c55e` (green) | `rgba(34,197,94,0.12)` | WhatsApp campaign |
| `tt` | `#a1a1a1` (grey) | `rgba(161,161,161,0.12)` | TikTok campaign |
| `sp` | `#f97316` (orange) | `rgba(249,115,22,0.12)` | Shopee/Tokopedia |
| `wb` | `#3b82f6` (blue) | `rgba(59,130,246,0.12)` | Web campaign |
| `evt` | `#06b6d4` (cyan) | `rgba(6,182,212,0.12)` | Event |
| `other` | `#64748b` (slate) | `rgba(100,116,139,0.12)` | Unknown / fallback |

**Cara menggunakan di tool:**
```css
/* Badge background — pakai platform-bg, bukan platform warna langsung */
.badge-wa {
  background: var(--platform-wa-bg);
  color: var(--platform-wa);
}

/* Dot indicator — pakai platform warna langsung */
.dot-ig {
  background: var(--platform-ig);
}

/* Tombol utama platform — pakai platform warna sebagai bg */
.btn-platform {
  background: var(--platform-tt);
  color: var(--platform-tt-txt);
}
```

**Mengapa 3 token per platform?**
- `--platform-wa` (solid): untuk dot, icon, tombol tebal
- `--platform-wa-bg` (12% opacity): untuk badge ringan, background chip, hover state
- `--platform-wa-txt` (putih): untuk teks di atas badge bg — menjamin kontras

**Dark mode:** platform colors (`--platform-X`) tetap sama. Hanya badge backgrounds yang naik opacity dari 12% → 18% agar tetap terbaca di dark background.

**Menambah platform baru:** cukup tambahkan 3 baris di `design-system.css`:
```css
:root {
  --platform-baru:   #hexcodemunakat;
  --platform-baru-bg: rgba(r, g, b, 0.12);
  --platform-baru-txt:  #ffffff; /* atau #0f172a kalau warnanya terang */
}
```
Tidak perlu ubah tool apapun — platform baru akan langsung tersedia di semua tool yang pakai token ini.

**Contrast ratio requirement:** semua `--platform-X` colors harus mencapai rasio kontras 4.5:1 terhadap `--bg-card` (light) dan `--bg-card` (dark). Gunakan tool: https://webAIM.org/resources/contrastchecker/
--accent-glow:   rgba(255, 0, 0, 0.08);
--border:        rgba(15, 23, 42, 0.06);

/* Semantic */
--success:       #22c55e;
--success-light: rgba(34, 197, 94, 0.1);
--danger:        #ef4444;
--danger-light:  rgba(239, 68, 68, 0.1);
--warning:       #f59e0b;
--warning-light: rgba(245, 158, 11, 0.1);
--info:          #3b82f6;
--info-light:    rgba(59, 130, 246, 0.1);
```

**How new tools should use colors:**
- Never hardcode `#f8fafc` or `#ffffff` — use `var(--bg-primary)` and `var(--bg-card)`
- Never hardcode text colors — use `var(--text-main)` or `var(--text-muted)`
- Brand-specific colors (e.g., Tiktok #a1a1a1, campaign colors) are defined per-tool, not in tokens

### 2.2 Dark Mode Overrides
```css
[data-theme="dark"] {
  --bg-primary:    #090d16;
  --bg-card:       #121826;
  --text-main:     #f1f5f9;
  --text-muted:    #94a3b8;
  --accent:        #ff3b3b;
  --accent-glow:   rgba(255, 59, 59, 0.15);
  --border:        rgba(255, 255, 255, 0.07);
}
```

**How new tools should handle dark mode:**
- Override semantic tokens (backgrounds, text, borders) under `[data-theme="dark"]` — never override the base values
- Do NOT write separate dark mode CSS files — use the same selector in the same stylesheet

### 2.3 Typography
| Role | Font | Weight | Size | Applied To |
|------|------|--------|------|------------|
| Brand/Logo | Gemini | 900 | 1.6rem | Shell heading |
| Page Titles | Gemini | 900 | clamp(2.4rem, 6vw, 4rem) | Landing hero |
| Body | Plus Jakarta Sans | 400 | 1rem | All tool body text |
| Headings (tool) | Plus Jakarta Sans | 800 | 1.1–1.5rem | Tool section headings |
| Labels/Small | Plus Jakarta Sans | 600–700 | 0.75–0.875rem | Badges, captions, table headers |
| Code/Technical | Plus Jakarta Sans | 400 | inherit | Monospace reserved for logs, technical content |

### 2.4 Spacing & Sizing

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 16px | Card, modal, bento corner radius |
| `--radius-sm` | 12px | Button, input, small container |
| `--transition` | 0.3s cubic-bezier(0.4, 0, 0.2, 1) | Standard transition |

### 2.5 How New Tools Should Define Their Own Tokens
Each tool may define tool-specific tokens for its domain. These go in `:root` within the tool's `<style>` block:

```css
:root {
  /* Tool-specific tokens — only if needed */
  --tool-specific: value;
}
```
Always fall back to shell tokens first. Only create tool-specific tokens when no shell token covers the need.

---

## 3. Layout System (Generic)

### 3.1 Tool Container Pattern (All Tools)
Every tool page should follow this layout skeleton:

```html
<body>
  <!-- Optional: top bar (brand + theme toggle + user actions) -->
  <header class="topbar"> ... </header>

  <!-- Main content area (scrollable) -->
  <main class="tool-main">
    <!-- Tool-specific content -->
  </main>

  <!-- Optional: bottom bar / footer -->
  <footer class="tool-footer"> ... </footer>
</body>
```

### 3.2 Card Grid (Bento)
Every tool that displays a list of items should use bento grid:

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
```

Responsive behavior:
- Desktop (≥1024px): 3-4 columns
- Tablet (≥640px): 2 columns
- Mobile (<640px): 1 column, scrollable horizontally for tables

### 3.3 Flex Utilities
Common flex patterns available in tools:
```css
.flex-row     { display: flex; align-items: center; gap: 8px; }
.flex-col     { display: flex; flex-direction: column; gap: 4px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-center  { display: flex; align-items: center; justify-content: center; }
```

---

## 4. Component Design System

### 4.1 Button

| Variant | CSS | Usage |
|---------|-----|-------|
| Primary | `background: var(--accent); color: #fff; border-radius: var(--radius-sm); padding: 10px 20px; font-weight: 700;` | Main actions (submit, save, approve) |
| Raised | `background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 8px 16px;` | Secondary actions |
| Ghost | `background: transparent; color: var(--accent);` | Tertiary actions (cancel, skip) |
| Pressable | Add `transform: scale(0.97)` on `:active` | Any button that benefits from tactile feedback |

**Minimum touch target:** 44px × 44px

### 4.2 Card

```css
.bento-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  transition: var(--transition);
  cursor: pointer;
}
.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px var(--accent-glow);
}
```

### 4.3 Modal / Dialog

```css
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 1.5rem;
  max-width: 480px;
  width: 90vw;
}
```

### 4.4 Toast Notification
```css
.toast {
  position: fixed; bottom: 20px; right: 20px;
  background: var(--text-main); color: var(--bg-primary);
  padding: 12px 20px; border-radius: var(--radius-sm);
  animation: slideIn 0.3s ease;
  z-index: 2000;
}
@keyframes slideIn {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
```

### 4.5 Form Elements
```css
input, select, textarea {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-main);
  width: 100%;
}
input:focus, select:focus, textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### 4.6 Table (for data-heavy tools)
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px;
  border-bottom: 2px solid var(--border);
}
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
/* Responsive: scroll horizontally on mobile */
.table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
```

### 4.7 Status Badges
```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
}
.badge-success { background: var(--success-light); color: var(--success); }
.badge-danger  { background: var(--danger-light);  color: var(--danger); }
.badge-warning { background: var(--warning-light); color: var(--warning); }
.badge-info    { background: var(--info-light);   color: var(--info); }
```

### 4.8 Search Bar
```css
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  width: 100%;
  max-width: 400px;
}
.search-box input {
  border: none; background: transparent;
  outline: none; flex: 1;
  font-family: inherit; font-size: 14px;
}
```

---

## 5. Tool-Specific Design Patterns

### 5.1 When to Use a Calendar Grid (Month View)
Applies to: any tool that shows time-based items on a grid (tasks, events, schedules, leave tracking, etc.)

**Grid structure:**
```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--border);
}
.cal-cell {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  min-height: 80px;
  padding: 4px;
  font-size: 12px;
}
```

**Indicator dots:** Plain colored circles, 16px diameter, no text by default, number only when multi-item same color.

### 5.2 When to Use a Timeline/Horizontal View
Applies to: per-day drill-down, activity logs, event streams.

**Structure:** Fixed-width date labels on the left, scrollable content area on the right.

### 5.3 When to Use a List View
Applies to: detailed item list (campaigns, expenses, links, activities).

**Structure:** Cards in a bento grid, each card has: title row (badge + name), metadata row (dates/tags), description section, actions row.

### 5.4 When to Use a Dashboard
Applies to: summary/overview tool (analytics, expense summary, KPI tracking).

**Structure:** KPI cards at top (4 across desktop, 2 on tablet, 1 on mobile), chart below, detailed table at bottom.

### 5.5 When to Use a Form View
Applies to: any CRUD tool (expense submission, task creation, link management).

**Structure:** Form grouped by logical sections, required fields marked, validation inline, submit button sticky bottom.

### 5.6 When to Use a Print View
Applies to: any tool whose data users need on paper (calendar, timeline, list, form).

**Required print features:**
- `@media print` block with `@page { size: A4 landscape; margin: 15mm !important; }`
- Hidden UI elements via `.no-print { display: none !important; }`
- Color fidelity: `-webkit-print-color-adjust: exact; print-color-adjust: exact;`
- Font size: minimum 10px in print; 12px for body
- Two-page spread for tools with both summary + detail (page 1: grid, page 2: list)

---

## 6. Print-Specific Design (All Tools That Support Printing)

### 6.1 Print CSS Block Template
Every tool that supports printing must include this base block:

```css
@media print {
  body {
    padding: 0;
    margin: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #ffffff !important;
    color: #000000 !important;
  }
  @page {
    size: A4 landscape;
    margin: 15mm !important;
  }
  .no-print {
    display: none !important;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

### 6.2 Print Layout Patterns

**Pattern A — Two-page spread (Calendar + List):**
- Page 1: Calendar grid (`.cal-side` with `page-break-after: always`)
- Page 2: List of items (`.list-side`)

**Pattern B — Single page:**
- Tool renders entirely on one page
- If content overflows, add `page-break-inside: avoid` to cards/items

### 6.3 Dot/Indicator Styling for Print
For calendar grid dots or similar indicators:
- Use `border-radius: 50%` for circle dots
- Minimum size: 16px × 16px for visibility
- No text inside dot unless showing number (color-group numbering)
- Background color is the primary identifier

---

## 7. Animation & Interaction Patterns

### 7.1 Transitions That All Tools Should Have
| Element | Transition | Duration | Easing |
|---------|-----------|----------|--------|
| Theme change | background + color | 0.3s | ease |
| Card hover | translateY + box-shadow | 0.3s | cubic-bezier(0.4,0,0.2,1) |
| Modal open/close | opacity + transform | 0.3s | ease |
| Toast appear/disappear | translateY + opacity | 0.3s | ease |
| Sidebar toggle | width | 0.3s | ease |
| Page transition (landing → workspace) | translateY + opacity | 0.5s → 0.6s | cubic-bezier(0.85,0,0.15,1) |

### 7.2 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

### 7.3 Loading States (Skeleton)
For tools with async data loading:
```css
.skeleton {
  background: linear-gradient(90deg, var(--border) 25%, transparent 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 8. Accessibility (WCAG 2.1 AA)

### 8.1 Required for Every New Tool
- **Semantic HTML5:** use `<header>`, `<main>`, `<nav>`, `<section>`, `<button>`, `<table>`
- **Focus visible:** always show `:focus-visible` outline (2px solid var(--accent))
- **Color contrast:** text must meet 4.5:1 ratio on backgrounds (both light and dark themes)
- **Touch targets:** minimum 44px × 44px for all interactive elements
- **Keyboard navigation:** all actions reachable via Tab + Enter/Space

### 8.2 Icon Buttons
Every icon-only button must have a `title` attribute for screen readers:
```html
<button title="Tambah" aria-label="Tambah item">
  <svg ...><path .../></svg>
</button>
```

### 8.3 Form Accessibility
- Every `<input>` has a `<label>` element
- Required fields are visually indicated (asterisk + ARIA `aria-required="true"`)
- Error messages are associated with the input via `aria-describedby`

---

## 9. Icon System

### 9.1 Tool Icons
Tools use Feather Icons (inline SVG, not icon font):
```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="5" y1="12" x2="19" y2="12"/>
</svg>
```

### 9.2 Shell Icons
The shell sidebar uses inline SVG for all nav icons — loaded directly in HTML, no CDN dependency.

### 9.3 Custom Tool Icons
If a tool needs a custom icon (e.g., LATCH logo, expense icon), use inline SVG with proper `viewBox` and `stroke`/`fill`. Do not use emoji as functional icons.

---

## 10. Design Anti-Patterns (What NOT To Do)

1. **No inline `!important`** — except in print media overrides
2. **No hardcoded pixel dimensions** for layout — use CSS Grid, Flexbox, `clamp()`, percentages
3. **No `@import`** in CSS — all styles inline (`<style>`) or linked (`<link>`)
4. **No framework utility classes** in production — no Tailwind, Bootstrap, etc.
5. **No emoji as functional icons** — use inline SVG (Feather) instead
6. **No `position: fixed`** on anything except topbar or landing page
7. **No `overflow: hidden`** on `<body>` — only on contained scrollable areas
8. **No new CSS custom properties without updating this design system** — check tokens first, use what exists or add to the shared token set
9. **Do not duplicate design tokens across tools** — use the same `--var` names; they are shared by design
10. **Do not use `!important` on colors in dark mode** — use the `[data-theme="dark"]` override pattern

---

## 11. File Structure for New Tool CSS

Every tool should organize its styles this way:

```css
/* ============================================
   Layer 1: Reset & Base
   ============================================ */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Plus Jakarta Sans', sans-serif; ... }

/* ============================================
   Layer 2: Design Tokens (tool-specific overrides only)
   ============================================ */
:root { --tool-color-primary: #...; }

/* ============================================
   Layer 3: Layout
   ============================================ */
.tool-container { ... }
.tool-header { ... }
.tool-main { ... }
.tool-footer { ... }

/* ============================================
   Layer 4: Components (reuse design system tokens)
   ============================================ */
.tool-card { ... }
.tool-btn { ... }
.tool-input { ... }
.tool-table { ... }
.tool-badge { ... }

/* ============================================
   Layer 5: Dark Mode
   ============================================ */
[data-theme="dark"] .tool-card { ... }

/* ============================================
   Layer 6: Print (if applicable)
   ============================================ */
@media print { ... }

/* ============================================
   Layer 7: Utilities
   ============================================ */
.hidden { display: none !important; }
.text-center { text-align: center; }
```

Never skip layers. This ensures consistency across tools.