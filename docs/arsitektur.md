# Arsitektur — REYNAHUB_SYS

**Updated:** 2026-07-27
**Scope:** System architecture for the shell AND all future tools — extensible, not tool-specific.

---

## 1. Architectural Pattern: Shell + Tools (iframe isolation)

REYNAHUB_SYS uses a **hosted tool** architecture:

- **Shell** (`index.html`): Navigation hub, theme management, routing, sidebar
- **Tools**: Standalone HTML files, loaded inside the shell's iframe. Each tool owns 100% of its own CSS and JS. No shared runtime.

This means adding a new tool requires exactly three shell-level changes:
1. Add an entry to `router.js` (`getToolPath()`)
2. Add a card to `tool-card.js` (`configs` array)
3. Add the tool folder + files in the appropriate directory

Everything else — theme, routing, navigation, search, responsive layout — works automatically for every tool.

---

## 2. System Diagram

```
┌───────────────────────────────────────────────────────────┐
│                    index.html (Shell)                       │
│                                                            │
│  ┌─────────────┐  ┌────────────────────────┐  ┌────────┐ │
│  │  Sidebar     │  │  Dashboard / Grid      │  │  About │ │
│  │  (nav links) │  │  (bento card grid)     │  │  Modal │ │
│  │              │  │  (tool-card.js renders) │  │        │ │
│  └─────────────┘  └────────────────────────┘  └────────┘ │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  <iframe id="main-frame" src="">                    │ │
│  │  → loads tool HTML (isolated CSS/JS scope)          │ │
│  │  → shell ↔ iframe via postMessage (theme sync)     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  Core Modules (src/core/):                               │
│    router.js          → hash → file path mapping         │
│    theme-manager.js   → dark/light with cross-frame sync │
│    iframe-comm.js     → postMessage bridge               │
│    app.js             → initialization & event wiring    │
│    tool-card.js       → card definition & rendering      │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Shell — How It Handles Tools (Generic)

### 3.1 Router (`src/core/router.js`)
The router is the single source of truth for tool-to-file mapping. Adding a new tool = adding one line to `getToolPath()`.

```
Hash pattern: #{group}/{tool-id}
Maps to: relative file path from repo root
```

**Pattern for new tools:**
```javascript
getToolPath(hash) {
  var map = {
    // Existing tool:
    '#productive/planner': 'Productive/Task/taskschedule.html',
    // ... add new tool below ...
    '#new-group/new-tool': 'Path/to/tool.html',
  };
  return map[hash] || '';
}
```

### 3.2 Tool Cards (`src/components/tool-card.js`)
Each tool has a card config:
```javascript
{
  group: 'productive' | 'universal',   // which sidebar section
  hash: '#group/tool-id',               // must match router
  title: 'Display Name',
  desc: 'Short description',
  search: 'keywords for search filtering'
}
```

**Pattern for new tools:** add one object to the `configs` array.

### 3.3 Groups
Tools are organized into groups — currently `productive` and `universal`. A new tool picks a group, and the sidebar filter buttons show/hide accordingly.

---

## 4. Tool — How It Must Be Structured (Generic Spec)

### 4.1 Every Tool Is a Standalone HTML File
No shared framework, no build step, no runtime dependency (unless the tool explicitly needs it — e.g., Chart.js for SAS Analytic).

**Minimum structure:**
```
Productive/<tool-name>/
  ├── <tool-name>.html          # Main file (100% self-contained)
  ├── code-<tool-name>.gs       # GAS backend (if any)
  └── (optional/)               # Assets directory
      ├── css/style.css
      ├── js/app.js
      └── assets/               # Images, logos, data files
```

### 4.2 HTML Requirements for New Tools
Every tool HTML must include:

1. **DOCTYPE + lang attribute:**
   ```html
   <!DOCTYPE html>
   <html lang="id" data-theme="light">
   ```

2. **Design system CSS (from shell):**
   ```html
   <link rel="stylesheet" href="../../src/styles/tools.css">
   ```
   (Path relative to tool location — adjust based on nesting depth)

3. **Charset & viewport meta:**
   ```html
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   ```

4. **Theme toggle:** Every tool should include a dark mode toggle that uses `data-theme` attribute on `<html>`.

5. **Script loading order (if external dependencies):**
   - CDN deps first (e.g., Chart.js, feather-icons)
   - Tool logic last

### 4.3 CSS Self-Containment
- Primary styles: inline `<style>` in `<head>` or linked CSS file
- Must use CSS custom properties from the design system for colors, spacing, typography
- Must support `[data-theme="dark"]` overrides
- Print view (if applicable) must have dedicated `@media print` block

### 4.4 JavaScript Self-Containment
- No module system (`import`/`export` not required)
- IIFE or standalone `<script>` is fine
- Use `fetch()` to communicate with GAS backend
- All user-facing strings should be escaped (XSS prevention)
- Toast notifications for user feedback

### 4.5 GAS Backend Pattern (if applicable)
Every GAS backend follows the same dispatch pattern:
```javascript
function doPost(e) {
  var res = { success: false, message: '' };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    if (action === 'myAction') { res.result = myFunction_(params.data); }
    else { res.message = 'Unknown action: ' + action; }
    res.success = true;
  } catch (e) { res.message = String(e.message || e); }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

// Helper to read sheet data
function getSheetData_(ss, sheetName) {
  // Returns array of objects with lowercase keys
}
```

### 4.6 File Naming Convention for New Tools
| Purpose | Pattern | Example |
|---------|---------|---------|
| Main HTML | Descriptive name | `expense-tracker.html` or `Index.html` |
| GAS backend | `code-<name>.gs` | `code-expense-tracker.gs` |
| CSS (if external) | `css/style.css` | Relative to tool folder |
| JS (if external) | `js/app.js` | Relative to tool folder |
| Assets | `assets/...` | Logos, images, data JSON |

---

## 5. Integration Path for a New Tool (Step-by-Step)

To add a new tool, follow these exact steps:

### Step 1: Create tool folder
```
Productive/<new-tool>/   or  Productive/<subgroup>/<new-tool>/
```

### Step 2: Create tool HTML file
- Follow structure in Section 4.2
- Include all CSS and JS
- Test in browser standalone before integrating

### Step 3: Create GAS backend (if needed)
- Follow pattern in Section 4.5
- Deploy to Google Apps Script
- Copy the deployment URL

### Step 4: Register in shell
**File: `src/core/router.js`** — Add one line:
```javascript
'#<group>/<tool-id>': 'Productive/<tool>/<file>.html',
```

**File: `src/components/tool-card.js`** — Add one object to `configs`:
```javascript
{
  group: '<group>',
  hash: '#<group>/<tool-id>',
  title: 'Display Name',
  desc: 'Short description',
  search: 'search keywords'
},
```

### Step 5: Update documentation
- `docs/PRD.md` — add tool to module list
- `docs/roadmap.md` — add to tool status matrix
- `README.md` (root) — update tools list and file structure

### Step 6: Test
- Open shell in browser
- Click new tool card
- Verify iframe loads correctly
- Verify GAS communication (if applicable)
- Verify dark mode toggle works
- Verify print view (if applicable)

---

## 6. Data Flow (Generic)

### 6.1 Read Operations
```
Tool renders UI
  → fetches GAS URL with ?action=getData&params...
  → GAS doGet(e) parses query params
  → GAS reads Google Sheet (getSheetData_)
  → Returns JSON array or object
  → Tool parses response
  → Tool renders DOM (no virtual DOM, direct DOM manipulation)
```

### 6.2 Write Operations
```
User interacts with form
  → Tool collects data into plain JSON object
  → Tool calls fetch(GAS_URL, { method: "POST", body: JSON.stringify(data) })
  → GAS doPost(e) parses body
  → GAC routes action to correct function
  → GAS executes (insert/update/delete on Sheet)
  → Returns JSON { success: true/false, data/error }
  → Tool updates UI based on response
```

### 6.3 Offline/Demo Mode
- When `API_URL` is empty string, tools use `localStorage` as database
- Tools should detect `useRemote = !!CONFIG.API_URL` and branch accordingly
- This allows development and demo without a live GAS deployment

---

## 7. Cross-Cutting Concerns

### 7.1 Theme System
- **Shell owns** the theme state and persistence (`localStorage`)
- **Shell propagates** to iframes via `postMessage`
- **Each tool** must listen for `theme-changed` CustomEvent or read `data-theme` attribute on `<html>`
- **Each tool** must implement dark mode CSS overrides using `[data-theme="dark"]` selector

### 7.2 Navigation
- **Shell owns** all navigation (sidebar clicks, hash routing, back/escape)
- **Tools never navigate** — they only change their own internal state
- **iframe src** is the only way to switch visible tool content

### 7.3 Responsive Breakpoints (Tool-Agnostic)
- Desktop: sidebar visible, bento grid 3-4 columns
- Tablet: sidebar can collapse, grid 2 columns
- Mobile: sidebar overlay, grid 1 column, scrollable iframe
- Touch targets minimum 44px × 44px

### 7.4 Security (Tool-Agnostic)
- No authentication at shell level (network/VPN protected)
- XSS prevention: escape all user input via `esc()` before DOM insertion
- Content Security: each iframe is isolated — cannot access shell DOM or other iframe DOM
- GAS web apps should be deployed with appropriate access level

---

## 8. Technology Decisions (Framework Decisions for Future Tools)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI framework | None (vanilla HTML/CSS/JS) | Zero runtime overhead, no bundle size, fast load |
| CSS framework | None (custom properties) | Full design system control, no dependency bloat |
| State management | none (local scope) | Each tool is independent, no global state |
| Routing | Hash-based (`#group/id`) | Works with `file://` and static hosting, no server needed |
| Backend | Google Apps Script + Sheets | Serverless, free tier sufficient, fast to deploy |
| Build | Vite (dev only) | Dev server with CORS/COEP support; no build in production |
| Hosting | GitHub Pages | Free, automatic deploy from `main` branch |
| Fonts | Plus Jakarta Sans (self-hosted) | No CDN dependency at runtime (CDN used in dev) |
| Icons | Feather Icons (inline SVG) | Lightweight, tree-shakeable per tool |
| Charts | Chart.js (CDN, tool-specific) | Only loaded by tools that need charts |

---

## 9. Extensibility Checklist

Any new tool should be buildable by following these steps and answering YES to each:

- [ ] Can the tool HTML be loaded in a standalone browser tab? YES
- [ ] Does it use CSS custom properties for all colors? YES
- [ ] Does it support `[data-theme="dark"]` overrides? YES
- [ ] Does it have a dark mode toggle? YES
- [ ] Does it handle missing GAS backend gracefully (localStorage fallback)? YES
- [ ] Can it be registered in shell with one router line + one tool-card line? YES
- [ ] Does it follow the `code-*.gs` naming for GAS backend? YES
- [ ] Does it use `fetch()` with `{ success, data/error }` response pattern? YES
- [ ] Does it escape all user input before DOM insertion? YES
- [ ] Does it print cleanly with `@media print` (if printing is needed)? YES
- [ ] Is it mobile-responsive (320px+)? YES

If all boxes are checked, the new tool is fully integrated with the REYNAHUB_SYS architecture.