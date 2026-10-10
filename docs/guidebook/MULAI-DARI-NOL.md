# Starter Kit — Webtool REYNAHUB (PC Fresh, Tanpa Repo)

> **Untuk AI:** baca **seluruh** file ini sebelum menulis kode. Jangan mengarang pola sendiri — pakai template di §3 dan penuhi kontrak di §2. Jika ada yang tidak jelas, **tanya**, jangan asumsi.

> **Untuk kamu (manusia):** bawa file `.md` ini saja ke PC mana pun. AI bisa langsung membuat tool yang **kompatibel** dengan hub REYNAHUB walau repo tidak ada. Saat kembali ke repo, tinggal daftarkan (§7).

**Versi kanonik (paling baru):** `docs/guidebook/design.md` — jika berbeda, yang di repo menang.

---

## 1. Konteks singkat

REYNAHUB adalah **hub statis** yang memuat banyak webtool mandiri lewat `<iframe>`. Tool = satu file HTML self-contained (CSS+JS di dalam). Tema (dark/light) disinkronkan dari hub ke tool via `postMessage`.

Prinsip: **satu navbar, satu tema, satu bahasa desain — beda fungsi, sama keluarga.**

Tool yang dibuat di PC fresh = **mode standalone** (dibuka sendiri). Tool yang sama, begitu dimasukkan ke hub, otomatis jadi **mode embedded** (navbarnya menyingkir, tema ikut hub).

---

## 2. Empat kontrak mutlak

1. **Satu navbar** — saat embedded, topbar tool disembunyikan:
   `.is-embedded .topbar { display:none !important; }` + `document.body.classList.toggle('is-embedded', window.self !== window.top)`.
   Standalone: topbar tampil + link "⤴ Kembali ke Hub".
2. **Ikut tema hub** — pasang bridge di §3. **Urutan wajib: pasang listener dulu, baru kirim `request-theme`** (kalau terbalik, tema bisa tidak tersinkron — bug yang pernah terjadi).
3. **Token, bukan hex** — semua warna/radius/shadow dari `:root`. **0 hex/rgba di luar blok `:root`** (termasuk JS & inline style). Dark mode = override token saja.
4. **Self-contained** — CSS+JS di file yang sama; tanpa build. Framework (React/Vue/Tailwind) boleh, selama 3 kontrak di atas tetap.

---

## 3. Template HTML lengkap (copy-paste)

Ganti `Nama Tool` dan isi `<!-- KONTEN FITUR -->`. Sisanya jangan diubah tanpa alasan.

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
  <link rel="stylesheet" href="../../src/styles/tools.css"> <!-- font; di repo WAJIB -->
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
    /* Gaya tool di sini — SEMUA warna pakai var(--...), jangan hex. */
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

    // BRIDGE TEMA (kontrak 2) — urutan: listener DULU, baru request-theme
    (function () {
      var root = document.documentElement;
      var isEmbedded = window.self !== window.top;
      function apply(t) { root.setAttribute('data-theme', t); }

      if (isEmbedded) {
        window.addEventListener('message', function (e) {
          if (e.data && e.data.type === 'SET_THEME' &&
              (e.data.theme === 'dark' || e.data.theme === 'light')) apply(e.data.theme);
        });
        window.parent.postMessage({ type: 'request-theme' }, '*'); // SETELAH listener
      } else {
        apply(localStorage.getItem('reynahub-theme') === 'dark' ? 'dark' : 'light');
      }

      var btn = document.getElementById('theme-toggle');
      if (btn) btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        if (isEmbedded) window.parent.postMessage({ type: 'THEME_CHANGED', theme: next }, '*');
        else localStorage.setItem('reynahub-theme', next);
      });
    })();

    // ... logika fitur tool di sini ...
  </script>
</body>
</html>
```

**Kalau tanpa repo (PC fresh):** link `tools.css` tidak ada → font auto-fallback. Sementara tambahkan sebelum `</head>` agar tetap rapi, dan **hapus saat masuk repo**:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap" rel="stylesheet">
```

---

## 4. Nama & file

- Nama file: `Index.html` atau `<nama-tool>.html`.
- Nanti di repo: taruh di folder **kebab-case** → `Productive/<nama-kebab>/` (mis. `pdf-merger`, `retur-track`).
- Path `../../src/styles/tools.css` sudah pas untuk folder `Productive/<nama-kebab>/`.

---

## 5. Backend (opsional, hanya bila butuh simpan data)

- Backend = **Google Apps Script (GAS)**. Tidak perlu repot di PC fresh — buat fungsi dulu, sambungkan nanti.
- Pola tulis yang **wajib** dipertahankan: `POST` dengan body `text/plain;charset=utf-8` (JSON di dalam body) — hindari CORS preflight. Jangan pakai `application/json`.
- Simpan URL Web App (`.../exec`) di satu konstanta di tool:
  ```js
  var API_URL = 'URL_WEB_APP_ANDA_DISINI'; // tempel hasil deploy GAS
  ```
- Untuk data lokal saja (tanpa server): pakai `localStorage`.

---

## 6. Checklist kualitas (sebelum dianggap selesai)

- [ ] `:root` berisi minimal: `--bg, --surface, --surface2, --text, --muted, --border, --primary(+light/soft), --danger, --success, --warning, --radius-sm/md`.
- [ ] **0 hex/rgba di luar `:root`** — grep: `#` dan `rgba(`.
- [ ] Dark mode hanya override token; kontras dua tema ≥ 4.5:1.
- [ ] `.is-embedded .topbar { display:none }` + `is-embedded` di-set lewat JS.
- [ ] Bridge tema: listener **sebelum** `request-theme`.
- [ ] Standalone: anti-flash di `<head>`, tombol "Kembali ke Hub".
- [ ] Ikon = inline SVG (bukan emoji); tombol ikon punya `aria-label` + `title`.
- [ ] `:focus-visible` pakai `--focus-ring`; input punya `<label>`.
- [ ] Bila mencetak: `@page` + `@media print` + `.no-print`.

---

## 7. Nanti: cara mendaftarkan ke repo (2 titik wajib)

Setelah kembali ke repo, AI cukup menambahkan:

```js
// src/components/tool-card.js — dalam array ToolCard.configs
{ group: 'productive', hash: '#productive/nama-tool',
  title: 'Nama Tool', desc: 'Satu kalimat.', search: 'kata kunci' }

// src/core/router.js — dalam map getToolPath()
'#productive/nama-tool': 'Productive/nama-tool/Index.html',
```

Lalu: baris di `README.md` root (peta folder + "Modul Tools") dan `README.md` di folder tool.
**Tidak perlu disentuh:** sidebar (`group` cukup) dan `src/sw.js`.

---

## 8. Prompt siap pakai (paste ke AI di PC fresh)

```
Baca file STARTER-KIT ini sampai habis, lalu buat webtool baru mengikuti
template §3 dan kontrak §2 — jangan mengarang §pola sendiri.
- Nama: <Nama Tool>
- Fungsi: <deskripsi singkat>
- Data: <tidak perlu / localStorage / GAS nanti>
- Framework: <vanilla / bebas>
Hasil: satu file HTML self-contained + jalankan checklist §6.
Catatan: ini PC fresh tanpa repo, jadi buat mode standalone dulu;
bagian daftar ke repo (§7) tulis saja sebagai catatan TODO.
```
