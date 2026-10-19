---
name: REYNAHUB — Workspace Operasional
description: Hub kumpulan webtools dengan bahasa desain Professional Business Minimalist — permukaan netral, tipografi tegas, satu aksen merah brand.
colors:
  accent-red: "#ff0000"
  accent-red-dark: "#ff3b3b"
  accent-ink: "#cc0000"
  bg-light: "#f8fafc"
  bg-dark: "#090d16"
  surface-light: "#ffffff"
  surface-dark: "#121826"
  ink: "#0f172a"
  ink-dark: "#f1f5f9"
  ink-muted: "#64748b"
  ink-muted-dark: "#94a3b8"
  surface2: "#f1f5f9"
  surface2-dark: "#1e293b"
  sidebar-ink: "#000000"
  sidebar-ink-dark: "#060911"
typography:
  display:
    fontFamily: "Geomini, Plus Jakarta Sans, sans-serif"
    fontWeight: 900
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontWeight: 600
rounded:
  xs: "2px"
  sm: "6px"
  md: "8px"
  btn: "10px"
  card: "12px"
  panel: "16px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
---

# Design System: REYNAHUB — Workspace Operasional

## Overview

**Creative North Star: "The Executive Desk"**

REYNAHUB adalah wadah kumpulan webtools yang mempermudah aktivitas kerja harian. Bahasa desainnya **Professional Business Minimalist**: permukaan bersih bernetral, hierarki tipografi yang tegas, dan satu aksen merah brand yang dipakai hemat. Halaman awal memperkenalkan siapa pembuatnya lewat banner identitas, lalu membawa pengguna masuk ke toolbox yang rapi dan mudah dipindai.

Tidak ada metafora dekoratif. Kedalaman datang dari hairline border dan bayangan lembut saat hover; kecepatan kerja datang dari grid yang konsisten, pencarian yang jelas, dan copy yang langsung. Estetikanya bisnis — tenang, profesional, siap dipakai setiap hari.

**Key Characteristics:**
- Permukaan netral (kertas putih / malam gelap) dengan hairline border.
- Satu aksen merah brand (logo, fokus, aksi hover) — jarang dan disengaja.
- Plus Jakarta Sans untuk kerja, Geomini untuk display wordmark.
- Kartu modular dengan lift halus saat hover; tanpa hiasan skeuomorfik.
- Banner identitas sebagai medium deskripsi diri di halaman awal.
- Motion terkurasi: satu urutan kedatangan banner; ambient (orb/chip) hanya di dalam panel dan mati pada reduced-motion.

## Colors

Palet netral profesional dengan satu aksen merah.

### Primary
- **Brand Red** (#ff0000 / dark #ff3b3b): aksen tunggal. Titik logo, ring fokus, teks aksi saat hover, badge. Dipakai <10% luas layar.
- **Accent Ink** (#cc0000 / dark #ff3b3b): merah digelapkan untuk teks kecil di permukaan terang (≥4.5:1).

### Neutral
- **Canvas** (#f8fafc / dark #090d16): `bg-primary`, ground shell.
- **Surface** (#ffffff / dark #121826): `bg-card`, kartu, bar navigasi, modal.
- **Ink** (#0f172a / dark #f1f5f9): `text-main`, judul & teks utama.
- **Muted Ink** (#64748b / dark #94a3b8): `text-muted`, deskripsi & meta.
- **Surface Two** (#f1f5f9 / dark #1e293b): `surface2`, state hover netral.
- **Stamp Ink** (#111111): tinta gelap untuk blok berlatar merah (CTA inversi).
- **Hairline** (`--border`): pemisah 1px, tak pernah tebal.

### Named Rules
**The Scarce Red Rule.** Merah hanya untuk identitas (titik logo), fokus keyboard, dan indikator aksi. Jangan menjadikannya warna latar luas, gradien, atau judul. Teks merah kecil memakai `--accent-ink`; blok merah berisi teks memakai tinta `#111` (atau CTA memakai inversi token `text-main`/`bg-primary`).

## Typography

**Display Font:** Geomini (fallback Plus Jakarta Sans)
**Body/Label Font:** Plus Jakarta Sans (fallback system-ui stack)

**Character:** Satu keluarga sans yang bersih untuk seluruh antarmuka kerja; Geomini hanya muncul di wordmark display dan fallback banner — pasangan yang bisnis, bukan hiburan.

### Hierarchy
- **Display** (Geomini, 900, clamp 2.4–3.4rem): judul halaman awal.
- **Title** (PJS, 800, 1.35–1.7rem): judul header dashboard, judul modal.
- **Card Title** (PJS, 700, .98rem): judul kartu modul.
- **Body** (PJS, 400, .82–1.05rem, line-height 1.55–1.65): lead & deskripsi; measure ≤46ch untuk lead.
- **Label** (PJS, 600–700, .75–.95rem): nav, tombol, meta, section.

### Named Rules
**The One Family Rule.** Antarmuka memakai Plus Jakarta Sans di semua peran teks. Geomini hanya untuk display wordmark/banner. Monospace tidak dipakai di shell ini.

## Layout

Shell kolom: strip navigasi sticky di atas (desktop) atau bar bawah tetap (mobile ≤768px, kontrak `frame-container`), lalu area kerja scroll-sendiri. Grid modul `auto-fill, minmax(260px, 1fr)`. Halaman awal **banner-led**: bar logo, lalu satu panel banner radius 20px (min-height clamp 430–580px) berisi komposisi artistik (grid halus, dua orb drift), kopy identitas di kiri, panel foto diri 4:5 (lebar maks 340px; plat monogram sampai `assets/banner.jpg` terpasang), dan tiga chip berisi nama modul asli yang melayang di tepi bawah panel foto. Di ≤880px kopy menumpuk dengan foto di bawahnya (rasio 16:10) dan chip disembunyikan. Rhythm spacing: 8/14/20/28px; pemisah kelompok (34px) lebih lega dari gap kartu (15px).

## Elevation & Depth

Datar saat diam; bayangan hanya sebagai respons. Kartu: shadow samar saat diam, mengangkat 2px + bayangan lembut saat hover/fokus. Panel banner & CTA memakai bayangan tegas sebagai benda utama viewport. Gradien hanya di dalam banner (mesh lembut + orb blur terbatas) — tidak menyebar ke permukaan kerja.

### Shadow Vocabulary
- **Card rest** (`0 1px 2px rgba(17,17,17,.04)`): pemisah halus.
- **Card hover** (`0 10px 24px -12px rgba(17,17,17,.18)`): angkat saat disorot.
- **Hero objects** (`0 24px 54px -26px` banner / `0 8px 20px -10px` CTA): benda utama halaman awal.

### Named Rules
**The Response-Only Shadow Rule.** Bayangan tidak muncul tanpa sebab (hover/fokus/benda utama). Permukaan diam selalu datar.

## Shapes

Radius terkendali: 6px badge, 8px nav, 10px CTA, 12px kartu, 16px panel banner/modal, 999px scrollbar. Border selalu hairline 1px `--border`. Tidak ada hard offset shadow.

## Components

### Halaman Awal (Landing)
Bar logo (wordmark + titik merah + tag "Workspace Operasional"), lalu panel banner: **judul klaim** ("Satu meja kerja untuk semua alat harian."), lead identitas pertama-orang, meta jumlah modul (dinamis dari data), CTA inversi "Buka Workspace" + tautan sekunder "Lihat isi workspace" (membuka modal Tentang, z-index di atas gate), panel foto diri 4:5 (plat monogram `R` + wordmark sampai `assets/banner.jpg` terpasang), tiga chip melayang berisi nama modul asli (Analytic Dashboard, Resi Generator, SPPD Toolbox), serta lapisan seni terbatas (grid halus, orb drift, sheen sekali lewat).

### Motion (Halaman Awal)
Satu urutan kedatangan terkurasi (~1,1s): banner masuk (banner-in) → kopy stagger 180–540ms (rise-in) → foto fade → sheen lewat sekali. Ambient terbatas hanya di dalam banner: dua orb drift 15–18s + tiga chip float 6,5–8s (transform/opacity saja; chip disembunyikan ≤880px). Parallax pointer di desktop (`hover: hover`): art + chips ±12px, foto ∓7px, smoothing 400ms. CTA hover: sweep highlight sekali + panah geser 3px. Exit gate dipercepat (450ms). Seluruh gerak spasial & ambient dimatikan di `prefers-reduced-motion`; opasitas/state tetap.

### Tombol Utama (CTA)
Inversi token: `background: text-main; color: bg-primary`, radius 10px, bayangan lembut. Hover: lift 1px + terang sedikit; panah bergeser.

### Navigasi
Strip atas `surface` dengan wordmark (hairline kanan), cluster nav ikon+label, kontrol tema/about. Aktif: `surface2` + hairline. Mobile: bar bawah posisi tetap, label disembunyikan, ikon 44px.

### Kartu Modul
Permukaan `surface`, radius 12px, judul PJS 700, deskripsi muted, baris aksi "Buka →" muted → merah hover. Badge `BARU` / notifikasi di pojok kanan-atas. Seluruh kartu adalah tombol (tabindex + role dari tool-card.js).

### Pencarian
Input hairline radius 10px dengan ikon kaca; ring fokus `accent-glow`.

### Empty State
Blok hairline putus-putus: "Modul tidak ditemukan" + "Coba kata kunci lain".

### Modal Tentang
Panel radius 16px (maks tinggi viewport, scroll bila perlu), judul PJS 800, paragraf arsitektur, lalu daftar 13 modul yang **dibangun dari `ToolCard.configs`** (satu sumber kebenaran dengan grid): tiap item tombol yang menutup modal dan membuka hash modulnya. Semantik `role="dialog"` + `aria-modal`, fokus masuk ke tombol tutup, terkunci di dalam dialog, dan kembali ke pemicu saat ditutup. Kaki "REYNAHUB · reynahub.web.id".

## Do's and Don'ts

### Do:
- **Do** pakai merah hanya untuk titik logo, fokus, dan hover aksi.
- **Do** pertahankan hierarki tipografi PJS (weight & size steps, bukan warna) sebagai pemisah utama.
- **Do** angkat kartu `translateY(-2px)` + bayangan lembut saat hover/fokus.
- **Do** hormati `prefers-reduced-motion`.
- **Do** isi jumlah modul dari data (`count-*` di app.js), jangan hardcode.
- **Do** pertahankan kontrak selector (`#landing-page`, `#enter-btn`, `#grid-productive`, `#grid-universal`, `.nav-btn`).

### Don't:
- **Don't** memakai metafora dekoratif (tiket, stempel, barcode, rotasi cap).
- **Don't** menjadikan merah latar luas atau gradien dekoratif.
- **Don't** pakai monospace sebagai kostum "teknikal" di shell.
- **Don't** pakai hard offset shadow atau border kiri tebal.
- **Don't** memakai emoji/glyph sebagai ikon — semua ikon SVG inline.
- **Don't** menambah kicker/eyebrow di atas judul — judul membawa bobotnya sendiri.
