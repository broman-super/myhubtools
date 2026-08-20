# Plan: Tab Mobile untuk Retur Tracker (`Productive/tr-retur/retur-track.html`)

## Masalah
Di layar sempit (≤900px) layout menumpuk jadi dua panel (panel-left di atas, panel-right di bawah), masing-masing punya scroll sendiri. Pengguna merasa "terbelah dua" dan sulit. Solusi: ganti dengan **tab khusus mobile** — Tab "Input Retur" (form + staging table) dan Tab "Riwayat" (history). Hanya satu panel tampil per saat, satu konteks scroll (halaman), tanpa dual-scroll. Desktop tetap side-by-side (tabs tersembunyi).

## Mapping Konten (sudah sesuai struktur existing)
- `panel-left` = Terminal Input Retur (search, inputResi, operator radios, staging table, action-bar) → **Tab "Input Retur"**
- `panel-right` = Riwayat Scan (filter-bar + theme-toggle, search, pending badge, history-list) → **Tab "Riwayat"**

## Perubahan (5 edit, semua di file yang sama)

### 1. HTML — body + bar tab (letakkan antara `<body>` dan `<div class="container">`)
OLD:
```
<body>

<div class="container">
```
NEW:
```
<body data-mtab="input">

<div class="mobile-tabs" id="mobileTabs">
  <button type="button" class="mtab-btn active" data-tab="input">Input Retur</button>
  <button type="button" class="mtab-btn" data-tab="riwayat">Riwayat</button>
</div>

<div class="container">
```

### 2. CSS base — sembunyikan tabs di desktop (tambah setelah blok `.panel-right {…}`)
OLD:
```
    .panel-right {
      width: 45%; padding: 24px 28px;
      display: flex; flex-direction: column;
      background: var(--surface); overflow: hidden;
    }
```
NEW (tambah 1 baris di bawah):
```
    .panel-right {
      width: 45%; padding: 24px 28px;
      display: flex; flex-direction: column;
      background: var(--surface); overflow: hidden;
    }

    .mobile-tabs { display: none; }
```

### 3. CSS — ganti seluruh blok `@media (max-width: 900px)` menjadi logika tab
OLD:
```
    @media (max-width: 900px) {
      .panel-left { padding: 20px 24px; }
      .panel-right { padding: 20px 24px; overflow-y: auto; }
      .container { flex-direction: column; }
      .panel-left, .panel-right { width: 100%; height: auto; }
      .panel-left { padding: 20px 20px; max-height: 55vh; border-right: none; border-bottom: 1px solid var(--border); }
      body { flex-direction: column; overflow: auto; }
      .table-wrap { min-height: 160px; }
      .panel-right { max-height: 45vh; padding: 20px; }
    }
```
NEW:
```
    @media (max-width: 900px) {
      .mobile-tabs {
        display: flex; gap: 8px; padding: 10px 14px;
        background: var(--bg); border-bottom: 1px solid var(--border);
        position: sticky; top: 0; z-index: 30;
      }
      .mtab-btn {
        flex: 1; min-height: 44px; border: 1px solid var(--border);
        background: var(--surface); color: var(--text-muted);
        font-weight: 600; font-size: 14px; border-radius: 9px;
        cursor: pointer; font-family: inherit;
      }
      .mtab-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
      .container { flex-direction: column; }
      .panel-left, .panel-right {
        width: 100%; height: auto; max-height: none; overflow: visible;
        border-right: none; border-bottom: none; padding: 16px; display: none;
      }
      body[data-mtab="input"]   .panel-left  { display: flex; }
      body[data-mtab="riwayat"] .panel-right { display: flex; }
      .table-wrap, .table-scroll, .history-list { overflow: visible; flex-grow: 0; }
      body { flex-direction: column; overflow: auto; }
      .table-wrap { min-height: 160px; }
    }
```

### 4. CSS — blok `@media (max-width: 768px)` lepas max-height/overflow (hindari scroll bersarang)
OLD:
```
    @media (max-width: 768px) {
      .panel-left { padding: 14px 16px; max-height: 50vh; }
      .panel-right { padding: 14px 16px; max-height: 50vh; overflow-y: auto; }
      #inputResi { padding: 14px 16px; font-size: 18px; }
      .filter-btn { font-size: 12px; padding: 4px 10px; }
    }
```
NEW:
```
    @media (max-width: 768px) {
      .panel-left { padding: 14px 16px; }
      .panel-right { padding: 14px 16px; }
      #inputResi { padding: 14px 16px; font-size: 18px; }
      .filter-btn { font-size: 12px; padding: 4px 10px; }
    }
```

### 5. JS — switch tab (sisipkan tepat setelah `<script>`)
OLD:
```
<script>
  // ============================================================
```
NEW:
```
<script>
  // ── Mobile tabs (input / riwayat) ──
  (function () {
    var btns = document.querySelectorAll('.mtab-btn');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        document.body.setAttribute('data-mtab', b.dataset.tab);
        btns.forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });
  })();

  // ============================================================
```

## Verifikasi (Playwright, Chromium)
1. Viewport 390px: `.mobile-tabs` terlihat (display flex), `panel-left` tampil, `panel-right` tersembunyi (offsetParent null).
2. Klik "Riwayat" → `data-mtab="riwayat"`, `panel-right` tampil, `panel-left` tersembunyi, tombol aktif pindah.
3. `document.documentElement.scrollWidth === clientWidth` (tidak ada horizontal scroll).
4. Viewport 1200px: `.mobile-tabs` hidden, kedua panel side-by-side (layout desktop tidak berubah).
5. Tidak ada JS error konsol (abaikan warning fetch `products.json`/GAS).

## Catatan
- Tidak mengubah data/backend; murni layout responsif.
- Theme-toggle ada di dalam `panel-right` (tab Riwayat) — tetap bisa diakses dari sana.
- `git` tidak tersedia di environment ini; commit dilakukan secara lokal setelah implementasi.
