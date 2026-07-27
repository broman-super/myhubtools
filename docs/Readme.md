# REYNAHUB_SYS — Dokumentasi Proyek

Portal hub operasional internal berbasis web. Satu halaman, semua tools ringan, cepat, tanpa framework runtime.

**Live:** [reynahub.web.id](https://reynahub.web.id)

---

## Daftar Isi

1. [PRD (Product Requirements Document)](#prd)
2. [Arsitektur](#arsitektur)
3. [Desain](#desain)
4. [Roadmap](#roadmap)
5. [Instruksi AI](#instruksi-ai)
6. [Dokumentasi Utama (root)](#dokumentasi-utama-root)

---

## PRD

**File:** [PRD.md](PRD.md)

Berisi kebutuhan produk untuk semua modul yang terpasang dan direncanakan, termasuk Expense Tracker (planned).

---

## Arsitektur

**File:** [arsitektur.md](arsitektur.md)

Berisi arsitektur tinggi: shell-and-tools pattern, file structure, data flow, build/deploy pipeline, security model, dan diagram navigasi.

---

## Desain

**File:** [design.md](design.md)

Berisi design system lengkap: color palette (light & dark), typography, spacing tokens, layout system (bento grid, sidebar, iframe), component library (cards, buttons, modals, toasts, forms), tool-specific design patterns (calendar grid, timeline, print view), animation guidelines, dan accessibility standards.

---

## Roadmap

**File:** [roadmap.md](roadmap.md)

Berisi status semua tool (✅/🔄/📋), completed work log, current sprint (Expense Tracker), planned features, dependency map, dan release criteria.

---

## Instruksi AI

**File:** [instruksi_ai.md](instruksi_ai.md)

Berisi instruksi untuk AI assistant yang bekerja pada proyek ini: proyek overview, code patterns, file modification priorities, banned patterns, step-by-step debugging guide, dan cara menambah tool baru.

---

## Dokumentasi Utama (root)

Dua file markdown juga tersedia di root proyek:

### README.md (root)
Dokumentasi utama proyek yang mencakup struktur file, tech stack, design system, dan daftar modul tools. Diperbarui 2026-07-25 untuk mencerminkan kondisi aktual proyek.

### Update_Plan.md (root)
Log perubahan teknis yang terperinci, termasuk setiap fix dan improvement yang dikerjakan beserta statusnya. Berisi juga spesifikasi Expense Tracker yang terperinci.

---

## Struktur Folder docs/

```
docs/
  ├── PRD.md           → Kebutuhan produk semua modul
  ├── arsitektur.md    → Arsitektur sistem & data flow
  ├── design.md        → Design system & component library
  ├── roadmap.md       → Timeline & status alat
  ├── instruksi_ai.md  → Panduan untuk AI assistant
  └── Readme.md        → File ini (dokumentasi docs/)
```

---

## Quick Start

1. Buka `index.html` di browser (atau gunakan `npm run dev` untuk dev server)
2. Klik "Akses Workspace" di landing page
3. Pilih tool dari sidebar atau dashboard grid
4. Setiap tool berjalan independen di iframe-nya sendiri

## Kontak & Tim

Internal use only — REYNAHUB_SYS.

Versi 3.0 (Minimalist Edition)
