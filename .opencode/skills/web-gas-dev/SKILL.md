---
name: web-gas-dev
description: Panduan untuk develop website dan web tool (dashboard, kalkulator, generator, converter, hub multi-tool, dll) menggunakan HTML/CSS/JS vanilla, opsional backend Google Apps Script (GAS), dan opsional build tool (Vite). WAJIB dipakai setiap kali user minta buat, edit, perbaiki, atau optimize website/web app/web tool, terutama yang menyebut GAS, Google Apps Script, doGet, doPost, HtmlService, google.script.run, Google Sheets sebagai database, atau menyebut SPA shell/hub multi-tool berbasis Vite/hash-routing/iframe. Skill ini juga WAJIB dipakai setiap kali user minta "edit", "perbaiki", "optimize", "refactor", atau "rapikan" kode yang SUDAH ADA — karena berisi aturan wajib anti-kehilangan-fungsi, dan mewajibkan agent bersikap seperti professional web developer (review kode, tangkap bug/kekurangan fitur, bukan cuma eksekusi permintaan literal). Jangan lewati skill ini walau requestnya terlihat kecil/sederhana.
---

# Web & Web Tool Development (Vanilla JS, opsional GAS + opsional Vite)

Skill ini dipakai untuk membantu user (**level pemula**, paham sedikit soal web, biasa menyerahkan keputusan teknis/styling ke AI) membangun website dan web tool. Stack bisa bervariasi antar project, jadi **jangan asumsikan satu pola arsitektur untuk semua project** — selalu deteksi dulu (lihat section "Kenali Dulu Arsitektur Project").

**Prinsip komunikasi:** hasil kerja harus setara developer profesional (aman, rapi, tidak asal-asalan), tapi **cara menjelaskannya ke user harus tetap sederhana** — pakai analogi, hindari jargon tanpa penjelasan, dan selalu sebutkan alasan di balik sebuah keputusan teknis, bukan cuma istilahnya saja.

Dua pola arsitektur yang paling umum ditemui:

- **Pola A — GAS Web App sederhana (single tool, tanpa build step):** `doGet()`/`doPost()` sebagai entry point, HTML di-serve lewat `HtmlService`, tanpa Node/build tool.
- **Pola B — SPA Shell multi-tool (hub) dengan build tool:** satu shell (`index.html`) berisi landing + sidebar + routing, tiap tool dimuat lewat `<iframe>`, dibangun pakai bundler (mis. Vite), dilengkapi linting/formatting/testing. GAS di sini **opsional** — cuma dipakai sebagai backend untuk tool yang memang butuh data dinamis dari Google Sheets; tool lain boleh 100% client-side (localStorage, library JS murni) tanpa GAS sama sekali.

Prioritas utama skill ini, urut dari yang paling penting:

1. **Jangan pernah menghapus/merusak fungsi yang sudah ada** saat mengedit kode.
2. **Bertindak seperti professional web developer**: aktif mengoreksi kesalahan penulisan kode dan menandai fitur penting yang terlewat, bukan cuma mengerjakan permintaan secara literal.
3. Hasil visual harus terlihat rapi & profesional, konsisten dengan design token project yang sudah ada.
4. Kode harus tetap jalan sesuai arsitektur project yang terdeteksi (jangan asumsikan ada Node/build tool kalau ternyata project-nya Pola A, dan sebaliknya).

---

## ATURAN EMAS #1 — Jangan Menghapus Kode yang Sudah Ada

Ini masalah utama yang sering dialami user: setiap kali minta AI "optimize" atau "perbaiki", fungsi lain yang tidak diminta ikut hilang, atau kode di-rewrite total padahal cuma diminta fix sebagian kecil.

**Wajib ikuti alur ini setiap kali mengedit file yang sudah ada (bukan file baru):**

1. **Baca dulu seluruh file yang relevan sebelum mengubah apa pun.** Jangan menebak isi file dari ingatan/asumsi.
2. **Buat daftar mental semua fungsi, event listener, dan blok kode yang ada** di file itu sebelum mulai edit. Contoh: "file ini punya fungsi `hitungTotal()`, `simpanData()`, `loadDataFromSheet()`, dan 3 event listener tombol."
3. **Edit sesempit mungkin (surgical edit).** Gunakan `str_replace` / pengeditan bagian kecil, BUKAN menulis ulang seluruh file dari nol — kecuali user secara eksplisit minta rewrite total atau file-nya memang baru.
4. **Setelah selesai edit, cek ulang (self-check) sebelum menyerahkan hasil ke user:**
   - Apakah semua fungsi yang tadinya ada, masih ada?
   - Apakah semua `id`/`class` HTML yang dipakai JS lama masih cocok?
   - Apakah semua event listener lama masih terpasang?
   - Kalau ada yang sengaja dihapus/diganti, **sebutkan eksplisit ke user** apa yang dihapus dan kenapa. Jangan hapus diam-diam.
5. Kalau perubahan yang diminta kecil (misal "ganti warna tombol jadi biru"), **jangan sentuh bagian lain sama sekali**, walau menurutmu bagian lain itu "bisa dioptimasi juga". Optimasi yang tidak diminta = risiko merusak = dilarang, kecuali user minta.
6. Untuk perubahan besar/refactor menyeluruh, **tanya dulu ke user** apakah mereka mau full rewrite atau tetap incremental, karena rewrite total meningkatkan risiko ada fitur yang kelupaan.

Anggap kode user seperti dokumen penting: kamu boleh menambah dan memperbaiki, tapi tidak boleh menghapus bagian yang tidak diminta untuk dihapus.

---

## Peran Agent: Professional Web Developer / Code Reviewer

Selain mengerjakan permintaan literal user, agent WAJIB bersikap seperti developer profesional yang mampu memecah masalah dan menandai risiko — karena user sendiri kadang kurang jelas menyampaikan instruksi/kekurangan teknis. Setiap kali membaca atau mengedit kode, aktif cek hal-hal berikut (tidak perlu diminta):

- **Kesalahan penulisan kode** — typo di key/property (mis. nama sheet, id, key object), tag/kurung/kutip yang tidak tertutup, kesalahan tanda kutip pada template string, variabel yang dideklarasikan tapi tidak pernah dipakai (atau dipakai tapi tidak pernah dideklarasikan).
- **Fitur/kondisi penting yang terlewat**: validasi input kosong, error handling saat request gagal, kondisi edge-case (data kosong/null, network lambat/timeout), duplicate-submit prevention pada tombol simpan.
- **Keamanan dasar**: hindari `innerHTML` untuk data yang berasal dari input user/eksternal tanpa sanitasi (rawan XSS) — pakai `textContent` atau escaping; kalau ada komunikasi antar-iframe via `postMessage`, cek origin pengirim, jangan percaya semua pesan begitu saja.
- **Konsistensi lint/format** — kalau project punya `.eslintrc`/`.prettierrc`/config sejenis, ikuti aturannya (mis. `no-var`, `prefer-const`, single quotes, indentasi) alih-alih gaya bebas.
- **Testing** — kalau project punya test runner (mis. Vitest) dan kamu mengubah logic penting, ingatkan/tawarkan untuk menambah atau memperbarui test terkait.
- **Konsistensi desain** — jangan mengarang warna/font baru; selalu cek dan pakai design token yang sudah ada di project (lihat section "Design Token").

**Aturan pelaporan:** kalau menemukan bug/kekurangan yang **di luar scope permintaan saat ini**, jangan diam-diam dibiarkan dan jangan diam-diam diperbaiki tanpa bilang — laporkan secara eksplisit ke user dulu (apa masalahnya, risikonya apa), baru tanyakan atau sarankan apakah mau sekalian diperbaiki sekarang atau nanti.

**Cara melapor ke user (level pemula):** jelaskan pakai bahasa sederhana dan analogi sehari-hari, bukan istilah teknis mentah. Contoh: daripada bilang "terjadi race condition pada fungsi submit", bilang "kalau tombol simpan diklik dua kali cepat-cepat, datanya bisa kesimpan dobel — ini yang saya perbaiki". Selalu jelaskan **kenapa** sesuatu penting, bukan cuma **apa** yang diubah.

---

## Kenali Dulu Arsitektur Project Sebelum Kerja

Sebelum menulis atau mengedit kode, cek dulu struktur project untuk tahu ini Pola A atau Pola B (atau hybrid):

- Ada `package.json`, `vite.config.js`, `.eslintrc*`, `.prettierrc*`, `vitest.config.js`? → kemungkinan besar **Pola B (SPA Shell + build tool)**.
- Cuma ada `Code.gs` + beberapa `.html` tanpa config build apapun? → **Pola A (GAS Web App sederhana)**.
- Project hub dengan banyak sub-folder tool, sebagian ada `.gs`/`GAS_URL`, sebagian lagi cuma HTML/CSS/JS murni tanpa GAS sama sekali → **hybrid**, umum terjadi di hub multi-tool. Jangan asumsikan semua tool di hub yang sama pasti pakai GAS — cek per tool.

Jangan menebak dari nama file/folder saja — buka `README.md`/dokumentasi project (kalau ada) dan file konfigurasi build sebelum memutuskan pendekatan.

---

## Struktur Project

### Pola A — GAS Web App sederhana (single tool, tanpa build step)

```
project/
├── Code.gs              # Entry point: doGet(), doPost(), fungsi server-side
├── Index.html            # HTML utama (di-serve lewat HtmlService)
├── Stylesheet.html        # <style>...</style> — dipisah biar rapi, di-include ke Index.html
├── JavaScript.html        # <script>...</script> — logic client-side, di-include ke Index.html
└── (opsional) module lain: Utils.html, Sidebar.html, dll
```

```javascript
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Nama Tool Kamu')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

Di `Index.html`, panggil dengan:
```html
<?!= include('Stylesheet'); ?>
...
<?!= include('JavaScript'); ?>
```

Kalau project kecil/simple (misal cuma 1 kalkulator sederhana), boleh 1 file HTML saja — tidak perlu dipaksakan struktur di atas.

### Pola B — SPA Shell multi-tool (hub) dengan build tool

Dipakai kalau user punya banyak tool yang mau digabung dalam satu portal/hub. Contoh struktur nyata (sesuaikan nama folder dengan project user):

```
project-root/
├── index.html                     # SPA shell: landing + sidebar + workspace area
├── src/
│   ├── app.js                     # Inisialisasi utama
│   ├── sw.js                      # Service worker (opsional, untuk caching)
│   ├── core/
│   │   ├── router.js              # Hash-based routing (#/kategori/nama-tool)
│   │   ├── theme-manager.js       # Toggle tema + sinkronisasi via postMessage
│   │   └── iframe-communicator.js # Komunikasi shell ↔ iframe tool
│   ├── components/
│   │   └── tool-card.js           # Komponen card Bento di grid dashboard
│   └── styles/
│       ├── design-system.css      # Design token (CSS custom properties)
│       ├── components.css         # Komponen UI reusable
│       ├── utilities.css          # Utility class
│       └── tools.css              # Font baseline global + utility tool
├── <kategori>/<nama-tool>/        # Tiap tool: folder sendiri, dimuat via iframe
│   ├── index.html (atau nama lain)
│   └── (opsional) code-<nama>.gs  # ADA HANYA JIKA tool ini butuh backend GAS
├── package.json
├── vite.config.js                 # Dev server + build config, path alias (@, @core, dst)
├── .eslintrc.json                 # Lint rules
├── .prettierrc                    # Format rules
├── vitest.config.js               # Test runner config
└── README.md
```

Poin penting Pola B:
- **Shell memuat tool via `<iframe>`.** Sinkronisasi tema (dark/light) antar-frame pakai `postMessage`, bukan pakai GAS.
- **GAS bersifat opsional per-tool.** Tool yang butuh data dinamis dari Google Sheets punya `GAS_URL` sendiri (disimpan sebagai satu konstanta di file/config tool tersebut, jangan hardcode berulang). Tool yang sifatnya murni olah-data client-side (mis. generator, converter, merger file) boleh tidak punya backend GAS sama sekali.
- **Build & tooling**: kalau project pakai Vite, jalur kerja standarnya `npm run dev` untuk development, `npm run build` untuk production, plus `npm run lint` dan `prettier --write` untuk konsistensi gaya kode, dan `npm run test` (Vitest) kalau ada test suite. Ikuti config yang sudah ada di project (`.eslintrc`, `.prettierrc`), jangan pakai gaya bebas.
- **Deploy frontend** biasanya otomatis (push ke branch utama → hosting statis semacam GitHub Pages auto-deploy). **Deploy backend GAS tetap manual** (lihat section Deployment).

---

## Styling Default

User tidak paham desain dan mengandalkan AI untuk keputusan visual — jadi ambil keputusan yang aman & terlihat profesional secara default, tanpa perlu ditanya tiap kali:

- **Prioritaskan vanilla CSS dengan CSS Custom Properties (design token)**, dipecah ke beberapa file (`design-system.css` untuk token, `components.css` untuk komponen reusable, `utilities.css` untuk utility class) — bukan Tailwind CDN, supaya project tetap **zero/minim runtime dependency** dan konsisten dengan gaya project nyata. Kalau project yang sedang dikerjakan sudah eksplisit pakai Tailwind (atau framework CSS lain), ikuti yang sudah ada — jangan ganti pendekatan di tengah jalan tanpa diminta.
- **WAJIB pakai Design Token Baku** di section "Design Token" di bawah — JANGAN improvisasi warna/font sendiri per tool. Ini untuk mengatasi masalah utama user: tiap webtool jadi warna-warni tidak senada.
- **Font tunggal: Plus Jakarta Sans** (weight 200–800) untuk semua teks — heading, body, form, tombol. Fallback: `'Plus Jakarta Sans', sans-serif`, diterapkan di semua halaman/tool.
- Pastikan **responsive** (mobile-friendly) by default, karena user kemungkinan besar tidak akan minta ini secara eksplisit.
- **Dark mode** wajib didukung lewat selector `[data-theme="dark"]` di root, dengan tombol toggle (icon sun/moon) di tiap tool. Kalau tool ini berjalan di dalam hub (Pola B), sinkronkan state tema shell ↔ iframe lewat `postMessage`.
- Hindari alert()/confirm() bawaan browser untuk notifikasi — bikin toast/modal sederhana yang lebih enak dilihat.
- Kasih loading state (spinner/disable tombol) setiap kali ada pemanggilan async ke backend (baik `google.script.run` maupun `fetch`), supaya user akhir tahu sistem sedang bekerja.

---

## Design Token — WAJIB dipakai di SEMUA tool dalam satu project/hub

**Masalah yang harus dihindari**: tiap tool baru dibuat dengan warna/font berbeda-beda sehingga terlihat tidak senada saat digabung (misal dilihat dari hub). Solusinya: SATU set design token dipakai berulang di setiap tool, tidak boleh diubah/ditebak ulang oleh AI setiap kali bikin tool baru.

**Langkah wajib sebelum menulis token baru**: cek dulu apakah project sudah punya file token (mis. `design-system.css` atau setara). Kalau sudah ada, **pakai ulang nilai yang ada** — jangan menebak/mengarang hex baru. Baseline nama variable berikut adalah acuan standar; nilai hex aktual ambil dari file token project yang bersangkutan (atau tanyakan ke user kalau project ini benar-benar baru dan belum punya token sama sekali):

```css
:root {
  /* Font */
  --font-body: 'Plus Jakarta Sans', sans-serif; /* satu-satunya font, dipakai di semua elemen */

  /* Warna dasar & permukaan */
  --bg: <sesuaikan dengan token project>;
  --card: <sesuaikan dengan token project>;
  --border: <sesuaikan dengan token project>;

  /* Warna teks */
  --text: <sesuaikan dengan token project>;
  --text-muted: <sesuaikan dengan token project>;

  /* Warna aksen brand — dipakai di SEMUA tool untuk tombol, header, link, elemen UI utama */
  --primary: <sesuaikan dengan token project>;
  --accent: <sesuaikan dengan token project>;

  /* Status — dipakai sama di semua tool biar konsisten */
  --success: <sesuaikan dengan token project>;
  --success-light: <sesuaikan dengan token project>;
  --danger: <sesuaikan dengan token project>;
  --danger-light: <sesuaikan dengan token project>;
  --warning: <sesuaikan dengan token project>;
  --warning-light: <sesuaikan dengan token project>;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
}
```

### Palet Kategorikal (khusus tool yang butuh banyak warna, misal Kalender/Kanban)

Token inti di atas sengaja sempit — itu untuk elemen **UI/brand** (tombol, header, navigasi, link) supaya semua tool terlihat senada. Tapi untuk tool yang butuh banyak warna guna membedakan kategori data (event/tag/status), pakai palet kategorikal terpisah yang **konsisten dipakai ulang** di semua tool yang butuh, bukan diciptakan ulang tiap kali. Contoh pola nyata (dari fitur Team Planner/Campaign Platform):

| Kategori | Warna | Catatan |
|---|---|---|
| Task | biru | tugas harian |
| Event | teal `#14b8a6` | acara dengan penyelenggara |
| Reminder | kuning `#f59e0b` | pengingat otomatis |
| Campaign — Instagram | ungu `#a855f7` | prefix `IG \|` |
| Campaign — WhatsApp | hijau `#22c55e` | prefix `WA \|` |
| Campaign — TikTok | pink `#ec4899` | prefix `TT \|` |
| Campaign — Shopee/Tokopedia | oranye `#f97316` | prefix `SP \|` |
| Campaign — Web | biru `#3b82f6` | prefix `WEB \|` |
| Campaign — Event | cyan `#06b6d4` | prefix `EVT \|` |

**Kapan pakai yang mana:**
- **Tombol, link, header, active state, elemen navigasi** → SELALU pakai `--primary`/`--accent`. Tidak boleh pakai warna kategorikal di sini.
- **Label kategori/tag/event/data yang butuh dibedakan visual** → boleh pakai palet kategorikal.
- Kalau butuh lebih dari palet yang tersedia, turunkan varian terang/gelap dari warna yang sama (opacity/lightness) daripada menambah warna baru di luar daftar yang sudah disepakati project.
- Palet kategorikal yang sudah disepakati di satu project **dipakai sama persis di semua tool lain dalam project/hub yang sama** — supaya tool baru (misal Kanban board) warnanya tetap konsisten dengan tool lama (misal Kalender), bukan bikin set warna baru lagi.

**Aturan wajib:**
- **Jangan pernah generate warna baru di luar token yang sudah disepakati project** (inti + kategorikal). Kalau butuh variasi, turunkan dari token yang sudah ada, bukan pilih warna baru.
- Kalau user secara eksplisit minta ganti warna aksen brand, ubah HANYA nilai token aksen di token inti (`--primary`/`--accent`), lalu **ingatkan user tool/file mana saja yang ikut perlu di-update** supaya tetap konsisten (karena tiap tool bisa jadi file/deployment terpisah).

### Prinsip Bento UI (grid dashboard di landing/hub)

- Layout berbasis **grid card** dengan ukuran bervariasi (ada yang besar/highlight, ada yang kecil) dalam satu grid rapi — bukan card seragam kotak-kotak monoton.
- Setiap card: `background: var(--card)`, border-radius konsisten, shadow halus, padding lega (24–32px).
- Gunakan `gap` grid yang konsisten (16–20px) antar card.
- Hover state halus: card sedikit terangkat (`transform: translateY(-2px)`) + shadow sedikit lebih tebal — jangan dramatis.

---

## Konsistensi Penamaan (Naming Convention)

Sama seperti masalah warna yang tidak senada, penamaan file/fungsi/variabel yang berubah-ubah gaya antar tool bikin kode susah dibaca ulang di kemudian hari — baik oleh user maupun oleh AI di sesi berikutnya. Kalau project sudah punya gaya penamaan (cek kode yang sudah ada), **ikuti gaya itu**. Kalau project benar-benar baru dan belum ada acuan, pakai default berikut:

| Elemen | Gaya | Contoh |
|---|---|---|
| Nama file HTML/JS | kebab-case | `resi-generator.html`, `theme-manager.js` |
| Nama fungsi & variabel JS | camelCase | `hitungTotal()`, `dataPengirim` |
| Nama fungsi GAS (`Code.gs`) | camelCase, deskriptif, awali dengan kata kerja | `getCalendarData()`, `saveTaskItem()` |
| CSS custom property (token) | kebab-case dengan prefix `--` | `--text-muted`, `--danger-light` |
| id/class HTML | kebab-case | `id="tool-frame"`, `class="card-header"` |

Kalau harus mengubah/menambah penamaan baru, samakan dengan pola yang sudah dominan di file tersebut — jangan campur dua gaya sekaligus dalam satu file.

---

## Struktur Shell/Hub (Pola B — SPA multi-tool)

- Landing page berisi hero + tombol masuk ke workspace, sidebar navigasi (icon-based, hover-expand), dan dashboard grid Bento dengan search bar untuk mencari tool.
- Routing berbasis hash (mis. `#/kategori/nama-tool`) supaya bisa di-bookmark/refresh tanpa perlu server-side routing.
- Saat card tool diklik, tool dimuat ke `<iframe>` area workspace lewat path relatif (untuk tool statis) atau `GAS_URL` (untuk tool yang punya backend GAS terpisah).
- Kalau tool baru punya deployment GAS sendiri, **simpan URL-nya di satu tempat terpusat** (mis. konstanta/config di router atau file konfigurasi tool tersebut) supaya gampang ditambah tanpa berantakan.
- **Setiap kali bikin tool baru untuk digabung ke hub**, otomatis lakukan tanpa perlu diminta:
  1. Pakai design token yang sudah ada di project (jangan generate ulang).
  2. Kalau tool ini butuh entry terpusat (daftar tool/menu di shell), ingatkan user untuk menambahkan entry tersebut — sebutkan file mana yang perlu diedit.
  3. Kalau tool baru butuh deployment GAS sendiri, ingatkan user untuk deploy dan mengambil URL-nya setelah selesai (lihat section Deployment).

---

## Pola Komunikasi Frontend ↔ Backend GAS

Berlaku untuk tool (di Pola A maupun tool tertentu di Pola B) yang memang punya backend GAS. Gunakan `google.script.run` untuk memanggil fungsi server-side dari client:

```javascript
google.script.run
  .withSuccessHandler(function(result) {
    // update UI di sini
  })
  .withFailureHandler(function(error) {
    // WAJIB selalu ada failure handler — GAS gampang timeout/error
    console.error(error);
    // tampilkan pesan error yang ramah ke user, jangan biarkan silent fail
  })
  .namaFungsiServer(parameter1, parameter2);
```

Aturan penting:
- **Selalu sertakan `withFailureHandler`.** Tanpa ini, error di server jadi silent dan user bingung kenapa tool-nya "diam saja".
- Fungsi server-side di `Code.gs` yang dipanggil dari client **tidak boleh** `async` dan tidak bisa langsung return Promise ke client — pastikan return value berupa data biasa (string/object/array) yang bisa di-serialize.
- Kalau berhubungan dengan Google Sheets, selalu ambil referensi sheet lewat `SpreadsheetApp.getActiveSpreadsheet()` atau `SpreadsheetApp.openById(ID)` — kalau pakai `openById`, simpan ID di satu tempat (misal konstanta di atas `Code.gs`), jangan hardcode berulang di banyak fungsi.
- Simpan `GAS_URL` (kalau tool memanggil GAS dari domain lain, bukan `HtmlService` langsung) sebagai satu konstanta terpusat per tool/config file, bukan hardcode berulang di banyak tempat.
- Tool yang tidak butuh data dinamis dari Sheets **tidak wajib punya backend GAS** — jangan paksakan pola ini kalau tool-nya memang cukup client-side (localStorage, file processing di browser, dll).

---

## Keamanan Dasar: Jangan Sampai API Key/Password "Kelihatan"

Bayangkan API key (misal untuk Gemini AI) itu seperti kunci rumah. Kalau kunci itu ditaruh di kode HTML/JS yang dikirim ke browser, sama saja seperti menempel kunci di depan pintu — siapapun yang buka "DevTools" (klik kanan → Inspect di browser) bisa melihat dan memakainya, bukan cuma pemilik tool.

**Aturan wajib:**
- **Jangan pernah tulis API key, password, atau kredensial sensitif langsung di file HTML/JS/CSS** yang akan dibuka lewat browser (baik di Pola A maupun Pola B) — walau cuma untuk "sementara" atau "testing".
- Kalau tool butuh API key (misal fitur AI Diagnostics), **simpan key di sisi server (GAS)**, bukan di sisi client. Di GAS, key bisa disimpan pakai `PropertiesService.getScriptProperties()` — jadi browser cuma minta "tolong analisis data ini" ke GAS, dan GAS yang menyimpan serta memakai key-nya secara rahasia.
- Kalau user memang minta user meng-input API key mereka sendiri lewat form di tool (bukan key milik developer/tool), itu boleh — tapi tetap ingatkan supaya key itu tidak ikut ke-commit ke Git/dibagikan ke orang lain.
- Kalau menemukan API key/kredensial sudah kadung ditulis langsung di kode lama, **laporkan ke user** (jangan diam-diam hapus tanpa bilang) dan sarankan cara memindahkannya ke sisi server.

---

## GAS Ada Batasnya (Performa & Kuota)

Google Apps Script itu gratis tapi ada batasnya — salah satu yang paling sering bikin tool user "lemot" atau macet adalah cara mengambil/menyimpan data ke Google Sheets.

- **Jangan ambil/simpan data satu baris satu-baris dalam loop** (misal `for` yang manggil `getRange(i, j).setValue()` berkali-kali). Ini lambat sekali kalau datanya ratusan baris, dan gampang bikin tool terasa "hang".
- **Ambil/simpan data sekaligus dalam satu batch**: baca semua data sekali pakai `getDataRange().getValues()`, olah datanya di memory (array/object biasa), baru tulis balik sekaligus pakai `setValues()`. Analoginya: daripada bolak-balik ke dapur ambil satu piring tiap kali, sekalian angkat semua piring dalam satu nampan.
- Ingat juga: satu eksekusi GAS ada batas waktu (sekitar 6 menit). Kalau tool mengolah data yang berpotensi sangat banyak (ribuan baris), pertimbangkan proses bertahap/terpisah, dan kasih tahu user kalau prosesnya memang akan makan waktu.

---

## Checklist Sebelum Menyerahkan Hasil ke User

Sebelum bilang "sudah selesai" ke user, cek:

- [ ] Semua fungsi lama yang tidak diminta diubah, masih ada dan masih dipanggil dengan benar
- [ ] Tidak ada `id`/`class` yang disebut di JS tapi hilang di HTML (atau sebaliknya)
- [ ] Ada `withFailureHandler`/`catch` di setiap pemanggilan async ke backend
- [ ] Tampilan responsive dan tidak berantakan di layar kecil
- [ ] Design token (font, warna aksen, radius, shadow) dari section "Design Token" sudah dipakai — tidak ada warna/font baru yang mengarang sendiri
- [ ] Kode mengikuti lint/format rules project kalau ada (`.eslintrc`, `.prettierrc`)
- [ ] Sudah dicek potensi XSS/keamanan dasar kalau ada render data eksternal via `innerHTML`
- [ ] Kalau tool ini baru dan akan digabung ke hub, sudah diingatkan untuk menambahkan entry-nya di tempat yang sesuai
- [ ] Kalau ada perubahan yang menghapus/mengganti sesuatu, sudah dijelaskan ke user apa dan kenapa
- [ ] Kalau menemukan bug/kekurangan di luar scope permintaan, sudah dilaporkan eksplisit ke user (bukan didiamkan atau diam-diam diperbaiki)
- [ ] File HTML/JS/CSS yang dipisah (kalau pakai struktur multi-file) semuanya ter-include/ter-link dengan benar
- [ ] Tidak ada API key/password yang ditulis langsung di kode sisi client (HTML/JS yang dikirim ke browser)
- [ ] Kalau ada pengambilan/penyimpanan data ke Google Sheets, dilakukan secara batch (bukan loop satu-baris-satu-baris)
- [ ] **Kalau mengubah rumus/kalkulasi yang menyangkut uang** (misal cicilan, margin, total harga): sudah dicoba hitung manual pakai 1-2 contoh angka untuk memastikan hasilnya benar, sebelum diserahkan ke user
- [ ] Penamaan file/fungsi/variabel konsisten dengan gaya yang sudah dipakai di project (lihat section "Konsistensi Penamaan")
- [ ] Ada jejak/log sederhana untuk error penting (lihat section "Jejak Error untuk Debug"), supaya kalau tool error di sisi user, ada cara menelusurinya

---

## Deployment

Ingatkan user langkah deploy setiap kali ada perubahan yang perlu di-publish (sumber kebingungan umum buat pemula):

**Kalau ada frontend dengan build tool (Pola B):**
1. `npm run build` untuk memastikan build production sukses (kalau ada script build).
2. Push ke branch utama → auto-deploy ke hosting statis (kalau sudah dikonfigurasi, mis. GitHub Pages).
3. Ingatkan cek custom domain/`CNAME` kalau ada, supaya tidak salah alamat.

**Kalau ada backend GAS (Pola A, atau tool tertentu di Pola B):**
1. Di GAS editor: **Deploy → Manage deployments → Edit (ikon pensil) → New version → Deploy**.
2. Kalau ini deployment pertama kali: **Deploy → New deployment → Web App**, set "Execute as: Me" dan "Who has access" sesuai kebutuhan (biasanya "Anyone" untuk tool publik, atau "Anyone within organization" untuk internal).
3. Ingatkan: **edit kode saja tidak otomatis update Web App yang sudah live** — harus selalu bikin versi deployment baru.
4. Kalau `GAS_URL` berubah (deployment baru dengan URL berbeda), ingatkan user untuk update konstanta URL tersebut di file/config tool yang memanggilnya.

---

## Jejak Error untuk Debug (Logging Sederhana)

Kalau tool sudah dipakai orang lain (bukan cuma developer-nya) dan tiba-tiba error, biasanya yang sampai ke user cuma laporan "tool-nya nggak jalan" tanpa detail — karena bukan dia yang buka console browser. Supaya ada jejak yang bisa ditelusuri:

- Di sisi client, pastikan setiap `catch`/`withFailureHandler` minimal mencatat error ke `console.error()` dengan pesan yang jelas (bukan cuma `console.log(error)` polos) — sebutkan di fungsi/proses mana error terjadi.
- Untuk tool dengan backend GAS, kalau errornya penting (misal gagal simpan data), pertimbangkan mencatatnya ke sheet log terpisah (mis. sheet "ErrorLog" dengan kolom timestamp, fungsi, pesan error) — supaya developer bisa cek riwayat error tanpa perlu akses langsung ke laptop user yang mengalami masalah.
- Ini tidak perlu rumit — cukup cukup informatif untuk membantu menelusuri "apa yang terjadi, kapan, di fungsi mana", bukan sistem monitoring yang canggih.

---

## Backup Kode yang Lebih Aman (Opsional: clasp)

Editor GAS bawaan (di script.google.com) tidak punya riwayat perubahan yang benar-benar bisa diandalkan — kalau ada kode lama yang tidak sengaja hilang/tertimpa, sulit dikembalikan hanya lewat editor GAS. Aturan Emas #1 di skill ini membantu mencegah kehilangan kode saat AI mengedit, tapi tetap ada risiko manusiawi (salah klik, lupa save versi lama, dll).

Kalau user makin sering minta edit berulang pada tool berbasis GAS, ini opsional tapi direkomendasikan: pakai **`clasp`** (Command Line Apps Script Projects), alat resmi dari Google untuk menghubungkan kode GAS dengan Git — jadi kode GAS bisa disimpan riwayat perubahannya di GitHub/GitLab seperti project Vite di Pola B, bukan cuma mengandalkan editor bawaan.

- Ini bersifat **opsional dan agak teknis** — tawarkan ke user, jangan dipaksakan kalau user belum siap/belum butuh.
- Kalau user tertarik, cukup jelaskan secara ringkas dulu (clasp itu semacam "jembatan" antara GAS dan Git), lalu bantu setup langkah demi langkah kalau mereka setuju — jangan langsung eksekusi tanpa konfirmasi karena ini menyangkut koneksi ke akun Google mereka.
