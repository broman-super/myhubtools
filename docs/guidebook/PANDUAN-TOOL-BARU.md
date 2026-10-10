# Panduan Webtool Baru — REYNAHUB / UNITOOLS

**Untuk:** developer/AI yang membuat webtool baru, supaya langsung nyambung dengan hub.
**Sumber lengkap:** `design.md` (template penuh, tabel token, checklist kelulusan).
**Update:** 2026-10-08

---

## 1. Website utama kita seperti apa

Hub statis tanpa build (GitHub Pages, reynahub.web.id) yang memuat banyak webtool mandiri lewat **iframe**.

- **Shell (hub):** `index.html` + `src/app.js` — sidebar grup, kartu tool, routing hash, sinkronisasi tema antar-frame.
- **Tool:** HTML self-contained (CSS + JS inline), punya folder sendiri: `Productive/<nama-kebab>/`.
- **Backend:** Google Apps Script (`gas/*.gs`, di-deploy → URL `.../exec`) + Google Sheets / Supabase.
- **Routing:** URL berbasis hash, mis. `/#utilities/faktur` → dimuat ke iframe. Hash tidak pernah berubah walau folder pindah.

> **Prinsip tunggal:** *satu navbar, satu tema, satu bahasa desain — beda fungsi, sama keluarga.*

---

## 2. Kontrak wajib (4 hal yang bikin tool "diterima")

1. **Satu navbar** — saat dibuka lewat hub, topbar tool harus hilang:
   ```css
   .is-embedded .topbar { display: none !important; }
   ```
   ```js
   document.body.classList.toggle('is-embedded', window.self !== window.top);
   ```
   Saat dibuka langsung (standalone), topbar sendiri tetap tampil + tombol "⤴ Kembali ke Hub".

2. **Ikut tema hub** — pasang bridge ini (atau salin utuh dari `design.md` §4.2). **Urutan wajib: listener dulu, baru minta tema** (bug ini pernah terjadi):
   ```js
   (function () {
     var root = document.documentElement;
     var isEmbedded = window.self !== window.top;
     function apply(t) { root.setAttribute('data-theme', t); }

     if (isEmbedded) {
       window.addEventListener('message', function (e) {
         if (e.data && e.data.type === 'SET_THEME') apply(e.data.theme);
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
   ```
   Anti-flash di `<head>` (standalone): baca `reynahub-theme` → set `data-theme` sebelum render.

3. **Token, bukan hex** — semua warna/radius/shadow dari `:root` (palet lihat `design.md` Part II). **0 hex/rgba di luar `:root`** (termasuk JS & inline style). Dark mode = override token saja, jangan style per-elemen.

4. **HTML mandiri** — CSS+JS di dalam file; framework (React/Vue/Tailwind) boleh selama kontrak di atas tetap dipenuhi.

---

## 3. Titik sentuh di repo

| # | File | Isi |
|---|---|---|
| 1 | `Productive/<nama-kebab>/<file>.html` | tool-nya (folder **kebab-case**: `pdf-merger`, `outbound-track`, …) |
| 2 | `src/components/tool-card.js` | entri di `ToolCard.configs[]` |
| 3 | `src/core/router.js` | baris hash → path file |
| 4 | `README.md` (root) | baris di peta folder + seksi "Modul Tools" |
| 5 | `Productive/<nama-kebab>/README.md` | File · Backend · Status · Keterkaitan · Aturan anti-bug · Flow |

Contoh entri (poin 2 + 3):

```js
// tool-card.js
{
  group: 'productive',                       // 'productive' | 'universal'
  hash: '#productive/nama-tool',             // unik; prefix = grup sidebar
  title: 'Nama Tool',
  desc: 'Satu kalimat deskripsi.',
  search: 'kata kunci alternatif'
}

// src/core/router.js — di dalam map getToolPath()
'#productive/nama-tool': 'Productive/nama-tool/Index.html',
```

**Tidak perlu disentuh:**
- **Sidebar** — nav hanya memfilter grup (`group` di config).
- **`src/sw.js`** — tool di bawah `/Productive/` sudah network-first, otomatis keurus.

---

## 4. Langkah

1. Buat folder + HTML — kerangka siap pakai di `design.md` §4.1, bridge §4.2.
2. Daftar di `tool-card.js` + `src/core/router.js` (§3 di atas).
3. Update README root + buat README folder tool.
4. Uji **standalone** (`file://`/localhost): tampil penuh, topbar sendiri, toggle tema tersimpan.
5. Uji **lewat hub**: topbar tool hilang, tema ikut toggle hub, tidak ada error konsol.
6. Lolos checklist `design.md` Part VI (0 hex liar, kedua tema kontras OK, aksesibilitas, print bila perlu).

---

## 5. Checklist singkat (paste ke PR)

- [ ] Folder kebab-case, HTML self-contained, `tools.css` di-link (font).
- [ ] `.is-embedded .topbar` disembunyikan; tombol "Kembali ke Hub" untuk standalone.
- [ ] Bridge tema terpasang; **listener sebelum `request-theme`**.
- [ ] `:root` light + dark lengkap; 0 hex di luar `:root`.
- [ ] Terdaftar di `tool-card.js` + `src/core/router.js`; hash unik.
- [ ] README root + README folder tool diperbarui.
- [ ] Uji standalone & embedded bersih (0 error konsol).
