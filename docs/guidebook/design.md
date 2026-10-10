# Panduan & Desain Sistem REYNAHUB / UNITOOLS

**Menggantikan `DESIGN.md` versi lama** — satu sumber tunggal: sistem desain, konstitusi webtool, template, dan prosedur bergabung.

**Update:** 2026-10-08 · **Sifat:** hidup (diperbarui saat ada token/komponen baru)

---

## Isi

1. [Apa itu yang membuat kepingan puzzle nyambung](#part-i-prinsip)
2. [Sistem Desain (Token & Komponen)](#part-ii-sistem-desain)
3. [Konstitusi Webtool — Aturan Wajib](#part-iii-konstitusi-webtool)
4. [Template + Snippet Siap Pakai](#part-iv-template--snippet)
5. [Menambahkan Tool Baru & Cara Bergabung](#part-v-menambahkan-tool-baru)
6. [Checklist Kelulusan](#part-vi-checklist-kelulusan)

---

## Part I — Prinsip

Sebuah webtool dianggap **bagian dari REYNAHUB** bila memenuhi satu janji:

> **Satu navbar, satu tema, satu bahasa desain — beda fungsi, sama keluarga.**

Artinya:
- Halaman tool **tidak boleh** menggambar header/navigasi ganda.
- Tool **mengikuti tema hub** (dark/light) secara otomatis.
- Warna, radius, font, spacing: lewat **token**, bukan nilai tebak.
- Tool yang dibuka di dalam hub = **kepingan**; tool yang dibuka langsung (URL sendiri) = **mandiri**. Dua mode itu ditangani satu kontrak (bagian IV).

---

## Part II — Sistem Desain

### 2.1 Identitas

| Elemen | Nilai |
|---|---|
| Aksen utama | Merah `#ff0000` (light) · `#ff3b3b` (dark) |
| Font display | **Geomini** (600–800) — judul, hero, logo |
| Font body | **Plus Jakarta Sans** (400–800) — UI, form, tabel |
| Font mono | SF Mono / Cascadia / Fira / Consolas — kode, resi, log |
| Sorot halus | `color-mix(in srgb, var(--primary) 10%, transparent)` (light) · 18% (dark) — **jangan** border 2px + glow |
| Radius | `--radius-sm` 8px (card/badge) · `--radius-md` 12px (input/form) · `--radius-bento` 18px (bento/modal) |

### 2.2 Token — Sumber Tunggal

Kanon ada di `src/styles/design-system.css`. Tool **tidak perlu me-link** file itu; tool cukup **menyalin blok token** ke `<style>` bawaan. Pemetaan nama yang wajib:

| Nama token (tool) | Light | Dark | Kegunaan |
|---|---|---|---|
| `--bg` | `#f8fafc` | `#0f172a` | Latar halaman |
| `--surface` | `#ffffff` | `#1e293b` | Kartu, modal, kontainer |
| `--surface2` | `#f1f5f9` | `#1e293b` | Latar sekunder, header tabel |
| `--text` | `#0f172a` | `#f1f5f9` | Teks utama |
| `--muted` (alias `--text2`) | `#64748b` | `#94a3b8` | Label, placeholder |
| `--border` | `rgba(15,23,42,.06)` | `rgba(255,255,255,.07)` | Garis dok |
| `--primary` | `#ff0000` | `#ff3b3b` | Aksi utama, aksen |
| `--primary-light` | `#ff7b7b` | `#ff6b6b` | Hover/active brand |
| `--primary-soft` | 10% primary | 18% primary | Latar sorot halus |
| `--danger` | `#ef4444` | sama | Error, hapus |
| `--success` | `#22c55e` | sama | Sukses, aktif |
| `--warning` | `#f59e0b` | sama | Perhatian |
| `--radius-sm/md/bento` | 8/12/18px | sama | Radius |
| `--shadow-sm/md/lg` | dari `components.css` | sama | Bayangan elevasi |
| `--focus-ring` | `0 0 0 3px var(--primary-glow)` | sama | Fokus keyboard |

**Aturan emas:**
1. **Nol hex/rgba hardcoded di luar blok `:root`** — CSS, JS, dan inline `style` sekalipun wajib `var(--...)` (pengecualian: `@media print` + warna khusus data chart/platform, itupun via token bila ada).
2. Dark mode = **hanya memperbarui nilai token di `[data-theme="dark"]`**, jangan per-element.
3. Radius/space lewat token (`--space-1..8` = 4/8/12/16/20/24/32px); jangan magic number.
4. `--danger` = bahaya, `--success` = sukses. **Jangan pernah** menyalahi semantik (mis. `--success` diisi warna hitam).
5. `--primary` adalah satu-satunya nama aksen sistem. Nama menipu (mis. `--accent` berisi warna kartu) dilarang.

### 2.3 Warna Platform (tool yang menampilkan banyak "kanal")

Tiga token per platform: solid `--platform-<id>`, background `--platform-<id>-bg` (12% light / 18% dark), text `--platform-<id>-txt`.

| ID | Solid | Badge-bg |
|---|---|---|
| `ig` | `#a855f7` | `rgba(168,85,247,0.12)` |
| `wa` | `#22c55e` | `rgba(34,197,94,0.12)` |
| `tt` | `#a1a1a1` | `rgba(161,161,161,0.12)` |
| `sp` | `#f97316` | `rgba(249,115,22,0.12)` |
| `wb` | `#3b82f6` | `rgba(59,130,246,0.12)` |
| `evt` | `#06b6d4` | `rgba(6,182,212,0.12)` |
| `other` | `#64748b` | `rgba(100,116,139,0.12)` |

Pola pakai: badge = `background: var(--platform-wa-bg); color: var(--platform-wa);`, dot/tombol solid = `background: var(--platform-wa)`, teks di atasnya = `var(--platform-wa-txt)`.

### 2.4 Komponen Standar

| Komponen | Resep |
|---|---|
| Tombol primary | `background: var(--primary); color:#fff; border-radius:var(--radius-md); padding:10px 20px; font-weight:700;` + `:active {transform:scale(.97)}` (min touch 44×44) |
| Tombol sekunder | `background: var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:8px 16px;` |
| Tombol ghost | `background:transparent; color:var(--primary);` |
| Kartu | `background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1.25rem;` |
| Kartu bento (hub) | `--radius-bento`; hover `translateY(-4px)` + `box-shadow: 0 12px 24px var(--primary-glow)` |
| Input/select/textarea | `border:1px solid var(--border); border-radius:var(--radius-md); background:var(--surface); color:var(--text); width:100%;` focus `outline:2px solid var(--primary); outline-offset:2px` |
| Tabel | `th`: 11px, 700, `var(--muted)`, uppercase, letter-spacing .5px, border-bottom 2px; `td`: 14px, border-bottom 1px `var(--border)`; bungkus `.table-wrapper{overflow-x:auto}` |
| Badge status | pill `border-radius:99px`, fontSize 11px, `--success-light/--danger-light/--warning-light` |
| Modal | `.modal-overlay` fixed inset 0 `rgba(0,0,0,.5)` + `.modal-card` `--surface`, `--radius-bento`, max-w 480px |
| Toast | fixed bottom/right, `var(--text)` bg? → pakai `--surface` + border + shadow |

### 2.5 Font, Ikon, Tooltip
- Font dimuat via `src/styles/tools.css` (base64, sudah merata). Tool yang **tidak** berjalan lewat hub wajib me-link `src/styles/tools.css` agar body font benar.
- Ikon: inline SVG gaya Feather (`stroke="currentColor" stroke-width="2"`), **bukan emoji** sebagai ikon fungsional.
- Setiap tombol ikon wajib punya `title` + `aria-label`.
- `:focus-visible` memakai `--focus-ring`; **dilarang** `outline:none`.

### 2.6 Print
Semua tool yang mencetak wajib punya:
```css
@media print {
  @page { size: A4 landscape; margin: 15mm; }
  .no-print { display: none !important; }
  body { background:#fff !important; color:#000 !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```
Angka minimal: teks ≥ 10px (body 12px). Kartu diberi `break-inside: avoid`.

---

## Part III — Konstitusi Webtool

### Aturan 1 (PALING PENTING) — Navbar Tunggal: Dua Mode, Satu Kontrak

Tujuan: **tidak ada header/navbar ganda** saat tool dibuka di dalam hub.

Setiap tool mengenalkan **dua mode** dengan deteksi sederhana:

```js
// Deteksi embedded — taruh di akhir <body> (atau module init)
document.body.classList.toggle('is-embedded', window.self !== window.top);
```

| Mode | Kapan | Yang dilakukan tool |
|---|---|---|
| **Standalone** | dibuka langsung (URL tool) | Tampilkan `.topbar` sendiri: brand kecil + tombol "Kembali ke Hub" + toggle tema. Tool jadi aplikasi utuh. |
| **Embedded** | dibuka lewat hub (`#main-frame`) | **Sembunyikan `.topbar`/`.tool-main` header sendiri.** Navigasi dipegang sidebar hub. Tool hanya render konten. |

```css
/* Tool punya satu topbar; saat embedded, topbar milik HUB yang jalan, punya tool disembunyikan */
.is-embedded .topbar { display: none !important; }
.is-embedded body    { height: 100%; overflow: hidden; }
.tool-main           { flex: 1; overflow-y: auto; }
```

Pola layout baku (kedua mode):
```html
<body>
  <header class="topbar">            <!-- otomatis hilang saat embedded -->
    <div class="topbar-brand">Logo · Nama Tool</div>
    <div class="topbar-actions">
      <a class="btn-ghost" href="../index.html">Hub ⤴</a>
      <button class="theme-toggle" id="theme-toggle" title="Ubah tema">◐</button>
    </div>
  </header>
  <main class="tool-main">
    <!-- konten fitur; scroll di sini -->
  </main>
</body>
```

> Catatan: tombol "Kembali ke Hub" cukup ada di mode standalone. Saat embedded, `../index.html` tidak berarti — sembunyikan bersama `.topbar`.

**Hybrid (tool dengan aksi esensial di header):** tools seperti dashboard/analytic punya baris aksi yang wajib dipakai di dalam tool (filter tanggal, import, cetak/export, tab). Untuk tool ini tidak semua chrome disembunyikan:

- Sembunyikan **hanya brand/warna lokal** (mis. `<h1>`, logo, tagline) saat embedded — bukan seluruh header.
- **Baris aksi tetap tampil** supaya tool berfungsi penuh di dalam hub; navigasi global tetap milik hub.
- Contoh (Sales Analytic) di `Productive/analytic/Analytic.html`:
  ```css
  .is-embedded .nav-bar h1 { display: none !important; }
  ```
- Aturan tetap: header/`nav-bar` semantik satu sumber; kontrol aksi di header tool dikelompokkan (`nav-group`) dengan pemisah antar-konteks (navigasi | preferensi | mutasi data | periode), dan saat `@media` sempit pemisahnya dilepas agar wrap tetap rapi.

### Aturan 2 — Tema Selalu Ikut Hub (Dual-Mode Bridge)

Semua warna via `data-theme` pada `<html>`. Kendali tema:

- **Mode embedded:** hub adalah otoritas. Tool (a) **tidak** membaca/menulis storage tema sendiri saat embedded, (b) minta tema saat baru dimuat (`request-theme`), (c) terima `SET_THEME`, (d) kirim `THEME_CHANGED` hanya saat user menekan toggle-nya sendiri.
- **Mode standalone:** tool membaca `reynahub-theme` (key global) **lebih awal di `<head>`** untuk mencegah flash salah tema; toggle menulis key itu.

Snippet lengkap ada di [Part IV → 4.2](#42-bridge-tema-dual-mode).

### Aturan 3 — Layout & Komponen Wajib

1. Struktur: `.topbar` + `.tool-main` (+ footer opsional). Tidak ada header ad-hoc (`nav-bar`, `header-container`, bare `<h1>`).
2. Bento/kartu untuk daftar: `display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:10px;` (mobile 1 kolom, tablet 2, desktop 3–4).
3. Mobile: bottom-nav `56px + env(safe-area-inset-bottom)` untuk tool navigasi-dominan; `100dvh/100vw`, scroll hanya di area konten.

### Aturan 4 — Dark & Light Dua-duanya Produksi

- `[data-theme="dark"]` **harus** mengubah nilai token, bukan menimpa elemen.
- Wajib dicek dua tema sebelum dianggap selesai.
- `prefers-reduced-motion: reduce` menghormati animasi/transisi (di design-system).

### Aturan 5 — Teknologi Bebas, Kontrak Tetap

Framework apa pun (vanilla, React, Vue, dsb.) boleh — asalkan **kontrak runtime** tetap: token bernama sesuai tabel 2.2, `<html data-theme>`, dual-mode navbar, registrasi hub. Komponen visual (tombol, kartu, tabel) tetap mengikuti resep 2.4 meski ditulis dalam komponen framework.

### Aturan 6 — Pendaftaran: Menjadi Kepingan

Tool "gabung" setelah file-nya ada + masuk daftar `src/components/tool-card.js` (lihat Part V). Hash routing hub memetakan setiap kartu ke file tool.

---

## Part IV — Template & Snippet

### 4.1 Kerangka HTML Siap Pakai (vanilla, patuh penuh)

```html
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <script>
    // ANTI-FLASH: terapkan tema sedini mungkin (standalone). Embedded di-set hub.
    (function () {
      if (window.self !== window.top) return; // embedded: hub yang tentukan
      var s = localStorage.getItem('reynahub-theme') || 'system';
      var d = s === 'dark' ? 'dark' : s === 'light' ? 'light'
            : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', d);
    })();
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Nama Tool — REYNAHUB</title>
  <link rel="stylesheet" href="../../src/styles/tools.css"> <!-- font, WAJIB utk standalone -->
  <style>
    :root {
      --bg:#f8fafc; --surface:#ffffff; --surface2:#f1f5f9;
      --text:#0f172a; --muted:#64748b; --border:rgba(15,23,42,.06);
      --primary:#ff0000; --primary-light:#ff7b7b;
      --primary-soft: color-mix(in srgb, #ff0000 10%, transparent);
      --danger:#ef4444; --success:#22c55e; --warning:#f59e0b;
      --radius-sm:8px; --radius-md:12px; --radius-bento:18px;
      --shadow-md:0 4px 12px rgba(15,23,42,.08);
      --focus-ring:0 0 0 3px color-mix(in srgb, #ff0000 15%, transparent);
    }
    [data-theme="dark"] {
      --bg:#0f172a; --surface:#1e293b; --surface2:#1e293b;
      --text:#f1f5f9; --muted:#94a3b8; --border:rgba(255,255,255,.07);
      --primary:#ff3b3b; --primary-light:#ff6b6b;
      --primary-soft: color-mix(in srgb, #ff3b3b 18%, transparent);
      --shadow-md:0 4px 12px rgba(0,0,0,.4);
      --focus-ring:0 0 0 3px color-mix(in srgb, #ff3b3b 25%, transparent);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif; /* dari tools.css */
      background: var(--bg); color: var(--text);
      height: 100vh; display: flex; flex-direction: column;
    }
    .topbar { display:flex; align-items:center; justify-content:space-between;
      padding:10px 16px; background:var(--surface); border-bottom:1px solid var(--border); }
    .tool-main { flex:1; overflow-y:auto; padding:16px; }
    /* Aturan 1: saat embedded, navbar satu — punya HUB */
    .is-embedded .topbar { display:none !important; }
    :focus-visible { outline:var(--focus-ring); outline-offset:2px; }
    @media print {
      @page { size: A4 landscape; margin: 15mm; }
      body { background:#fff !important; color:#000 !important; }
      .no-print { display:none !important; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-brand"><strong>Nama Tool</strong></div>
    <div class="topbar-actions">
      <a class="no-print" href="../../index.html" style="font-size:13px;color:var(--muted);text-decoration:none;">⤴ Kembali ke Hub</a>
      <button class="theme-toggle" id="theme-toggle" title="Ubah tema" aria-label="Ubah tema">◐</button>
    </div>
  </header>
  <main class="tool-main">
    <!-- KONTEN FITUR -->
  </main>
  <script>
    document.body.classList.toggle('is-embedded', window.self !== window.top);
    // ... muat theme bridge (4.2) + logika fitur ...
  </script>
</body>
</html>
```

### 4.2 Bridge Tema Dual-Mode

`theme-bridge.js` (framework-agnostik; bekerja pada `document.documentElement` — React/Vue tetap jalan karena CSS membaca `data-theme`):

```js
(function () {
  var root = document.documentElement;
  var isEmbedded = window.self !== window.top;
  function apply(theme) { root.setAttribute('data-theme', theme); }
  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  if (isEmbedded) {
    // Otoritas = hub. Minta tema saat load; ikuti perintah hub.
    window.addEventListener('message', function (e) {
      if (!e.data) return;
      if (e.data.type === 'SET_THEME' && (e.data.theme === 'dark' || e.data.theme === 'light')) apply(e.data.theme);
    });
    // Baru minta SETELAH listener terpasang (pastikan urutan ini)
    window.parent.postMessage({ type: 'request-theme' }, '*');
  } else {
    // Standalone: baca key global (sudah di anti-flash head); toggle menulisinya.
    apply(localStorage.getItem('reynahub-theme') === 'dark' ? 'dark' : 'light');
  }

  var btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    if (isEmbedded) {
      window.parent.postMessage({ type: 'THEME_CHANGED', theme: next }, '*');
    } else {
      localStorage.setItem('reynahub-theme', next);
    }
  });
})();
```

Urutan kunci: **pasang listener dulu, baru kirim `request-theme`** — hindari balasan yang datang sebelum listener aktif (bug yang sudah pernah terjadi).

### 4.3 Pendaftaran di Hub (`src/components/tool-card.js`)

Tambah satu entri ke array `ToolCard.configs`:

```js
{
  group: 'productive',                    // 'productive' | 'universal'
  hash: '#productive/nama-tool',          // rute unik (slug tools)
  title: 'Nama Tool',
  desc: 'Satu kalimat deskripsi fungsi bermanfaat.',
  search: 'kata kunci pencarian alternatif'
}
```

- `hash` menentukan rute + grup sidebar (bagian sebelum `/`).
- Router hub memetakan hash → path file di `src/core/router.js` — ikuti pola entri di sana.
- Badge `BARU` di kartu: tambahkan blok `if (config.hash === '...') newBadge` di `createCard` (contoh: Faktur).

### 4.4 Catatan Framework

- **React/Vue/Next** dst.: komponen header pakai CAKUPAN yang sama — `@media`/`.is-embedded .topbar { display:none }` cukup karena token dari `<style>` global; gunakan token via variable CSS, jangan inline hex di JSX.
- **Tailwind** (jika terpaksa): konfigurasi `theme.extend.colors` memetakan token REYNAHUB (`primary`, `bg`, `surface`, `text`, dst.) — jangan pakai slate default yang bukan palet sistem.
- Data chart: warna dataset tetapkan dari token (`getComputedStyle(root).getPropertyValue('--primary')`) atau palet platform, jangan literal.

---

## Part V — Menambahkan Tool Baru

### Peta repo — bagian apa yang disentuh

| Bagian | File | Peran |
|---|---|---|
| Shell | `index.html` + `src/app.js` | Halaman hub, sidebar grup, bridge tema (`postMessage`), render kartu |
| Rute | `src/core/router.js` | `getToolPath()`: hash → path file tool |
| Kartu | `src/components/tool-card.js` | `ToolCard.configs[]`: `group, hash, title, desc, search` |
| Gaya bersama | `src/styles/{design-system,components,tools}.css` | Token, komponen, font |
| Offline | `src/sw.js` | `/Productive/` = network-first → tool baru di bawah situ **otomatis keurus, tidak perlu daftar/bump** |
| Backend | `gas/*.gs` | Di-deploy ke GAS; URL `.../exec` ditempel di tool |
| Tool | `Productive/<nama-kebab>/` | Folder sendiri, HTML self-contained (CSS+JS inline) |

**Sidebar tidak perlu disentuh** — tombol nav hanya memfilter grup (`group` di config tool-card).

### Langkah

1. **Buat folder** `Productive/<nama-kebab>/` — kebab-case seragam (`pdf-merger`, `retur-track`, dst.) — plus file HTML utama (`Index.html` atau `<nama-tool>.html`).
2. **Kerangka HTML** — salin template 4.1 (anti-flash, token `:root` light+dark, `.topbar` + `.is-embedded .topbar{display:none}`) dan bridge tema 4.2.
3. **Daftar kartu** — satu entri di `ToolCard.configs` (`src/components/tool-card.js`, contoh 4.3).
4. **Daftar rute** — satu baris di `src/core/router.js`:
   ```js
   '#group/nama-tool': 'Productive/<nama-kebab>/<file>.html',
   ```
   Prefix hash: `#productive/…` · `#utilities/…` · `#doc/…` · `#external/…` — hash harus unik.
5. **Dokumentasi** — baris baru di peta folder `README.md` root + seksi "Modul Tools"; buat `README.md` dalam folder tool (pola yang sudah ada: File · Backend · Status · Keterkaitan · Aturan anti-bug · Flow).
6. **Uji** — langkah 1–5 di bawah, lalu checklist Part VI.

Badge `BARU` di kartu: tambahkan blok `if (config.hash === '…') newBadge` di `createCard` (lihat entri Faktur di `tool-card.js`).

### Backend GAS (bila tool butuh tulis data)

- Kode di `gas/<nama>.gs` (terpusat, bukan di folder tool) → deploy sebagai Web App → tempel URL `.../exec` ke konstanta di tool.
- Tulis data selalu `POST` body `text/plain;charset=utf-8` (kontrak GAS lama — hindari CORS preflight; jangan diganti).

### Uji sebelum submit

1. **Debug standalone** — buka langsung `file://`/localhost: tool tampil penuh, topbar sendiri, dark/light simpan ke localStorage.
2. **Debug embedded** — buka lewat hub; pastikan: (a) topbar tool hilang, (b) tema mengikuti hub saat toggle, (c) tidak ada error konsol `Cross origin`/postMessage, (d) isi tool muat dalam frame.
3. **Periksa** checklist Part VI; validasi dark + light.
4. **Dokumentasikan** pola unik tool (komponen/token baru) di bagian ini bila perlu.

## Part VI — Checklist Kelulusan

- [ ] `:root` berisi minimal: `--bg, --surface, --surface2, --text, --muted, --border, --primary(+light/soft), --danger, --success, --warning, --radius-sm/md`.
- [ ] **0 hex/rgba hardcoded** di luar blok `:root` (termasuk JS & inline style) — cek: `rg '(#[0-9a-fA-F]{3,6})|rgba\(' `.
- [ ] Dark mode: hanya override token; dua tema valid (kontras ≥ 4.5:1).
- [ ] Mode embedded: topbar sendiri tersembunyi; `request-theme`/`SET_THEME` jalan; tidak ada navbar ganda.
- [ ] Mode standalone: anti-flash di `<head>`, tombol "Kembali ke Hub" ada, font termuat (`tools.css`).
- [ ] Layout: `.tool-main` scroll area; bento untuk daftar; mobile bottom-nav bila perlu.
- [ ] Ikon: inline SVG (bukan emoji); setiap icon-button `aria-label`+`title`.
- [ ] Print (jika tool mencetak): `@page` + `@media print` + `.no-print`.
- [ ] Aksesibilitas: `:focus-visible` memakai `--focus-ring`; input punya `<label>`; `prefers-reduced-motion` dihormati.
- [ ] Terdaftar di `tool-card.js`, hash unik, kartu + deskripsi benar.
- [ ] Dibuka via hub: tidak ada error konsol; tema sinkron; ukuran frame pas.

---

*Sumber kebenaran teknis: `src/styles/design-system.css`, `src/app.js`, `src/core/theme-manager.js`, `src/components/tool-card.js`. Tool tolok ukur (sudah patuh): faktur-penjualan, outbound-track.*