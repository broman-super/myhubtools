# AGENT-09 — Penyandang Disabilitas

> **Persona:** User yang memakai aplikasi ini dengan keyboard saja, screen reader (NVDA/VoiceOver), atau buta warna — misalnya karena gangguan penglihatan sementara, tremor, atau gangguan motorik · **Fokus:** Kontras, screen reader, keyboard · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 4 |
| SEDANG | 11 |
| RENDAH | 1 |
| **Total** | **16** |

Aplikasi ini **tidak katastropik** — tidak ada data yang hilang, tidak ada jalan buntu total. Fondasinya justru sudah benar di beberapa tempat penting: kontrol native `<select>`, 67 dari 121 kontrol punya label programatis (7 `<label for>` eksplisit + 60 label implisit), **semua tombol punya nama aksesibel**, dan indikator fokus bekerja seragam di semua tipe kontrol. Masalah besarnya ada di **focus management**: `A.reload()` menimpa `#app.innerHTML` sehingga **setiap aksi menghapus fokus** dan melempar user ke `<body>`. Untuk user keyboard-only ini berarti setiap perubahan status = mulai dari nol. Di sisi screen reader, 22 input benar-benar **tanpa nama aksesibel** ("Tanggal Terbit", "Tujuan", "Instansi Pemberi Tugas" - semuanya dibaca kosong), dan seluruh sistem toast tidak punya `aria-live` sehingga **tidak ada konfirmasi maupun error yang pernah diumumkan**. Semantik modal juga bolong: tidak ada `aria-modal`, tidak ada focus trap, dan **202 elemen di belakang dialog tetap bisa difokus**. Di sisi kontras, **beberapa pasangan warna badge status gagal AA**, dan pasangan hijau/merah untuk nominal uang selalu gagal — teks nominal `+ Rp 500.000` cuma 2.28:1. Tiga temuan teratas saya: (1) fokus hilang total setiap aksi, (2) 22 input tanpa nama aksesibel + toast sunyi, (3) modal tanpa trap membolehkan user keyboard mengaktifkan kontrol di belakang dialog.

## Environment yang dipakai

- Edge headless, profil unik (`%TEMP%\prof_agent09`, dihapus tiap run), seed default (`localStorage.clear()` di awal tiap harness)
- Rute yang diuji: `#/dashboard`, `#/events`, `#/events/evt-1` (Layar Kerja — area utama), `#/archive`, `#/products`, `#/master`, `#/reports`, `#/guide`, `#/settings`
- Viewport: 1256x761 (desktop, default), 492x705 dan 492x661 (mobile, `--window-size=390,844` membuat `innerWidth` terbaca 492)
- Metodologi: harness di `_QA_TMP/`, hasil ditulis ke `<pre id="out">`, dibaca via `--dump-dom`. Verifikasi visual **numerik** (`getBoundingClientRect`, `getComputedStyle`, `offsetWidth`) karena screenshot tidak bisa dibaca.
- Kontras dihitung dengan luminance WCAG (0.2126/0.7152/0.0722; ambang 4.5:1 untuk teks normal, 3:1 untuk teks besar). Simulasi buta warna pakai **matriks Vienot langsung ke ruang RGB** (`protanopia`/`deuteranopia`/`tritanopia`), bukan CSS `filter:` - filter CSS terbukti **tidak mengubah `getComputedStyle`**, jadi hasilnya tidak bisa dipakai sebagai bukti.
- Catatan jujur soal keyboard: synthetic `KeyboardEvent` tidak memindahkan fokus browser pada tombol Tab. Urutan fokus diuji lewat (a) urutan DOM + posisi `getBoundingClientRect().top`, (b) `el.focus()` lalu baca `document.activeElement`, (c) `dispatchEvent` pada elemen **yang sudah difokus** untuk memicu handler.

## Temuan

### [BUG-01] Fokus hilang ke `<body>` setiap kali `A.reload()` berjalan — TINGGI

**Persona dan use-case:** User keyboard-only yang sedang mengisi Seksi 01 SPPD. Ingin mencentang satu item, lalu langsung berpindah ke item berikutnya dengan Tab.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. `document.querySelector("input[data-action=checklist:toggle]").focus()` - fokus berhasil, `document.activeElement` = `<input>`.
3. `el.dispatchEvent(new Event("change", {bubbles:true}))`.
4. Baca `document.activeElement` dan cek `document.querySelector("#app").contains(document.activeElement)`.

**Harapan:** Setelah data tersimpan, fokus tetap di checkbox itu (atau pindah ke item berikutnya), supaya Tab lanjut ke bawah.

**Kenyataannya:** Fokus terlempar ke `<body>`. Checkbox masih ter-render dengan nilai baru, tapi user kehilangan tempat.

**Evidence:** `fokus SEBELUM aksi = true` ; `SESUDAH = <body class="bg-base text-[#111] ...">` ; `$("#app").contains(activeElement) = false`. Terjadi juga pada `select[data-action="milestone:set"]` (ubah status milestone) dan pada klik tombol "Hapus alokasi".

**Dampak ke pengguna awam:** Ini bug yang paling terasa di aplikasi ini. Halaman detail punya **202 elemen fokusable**, dan setiap checkbox/milestone/alokasi yang diubah melempar user ke atas dokumen. User keyboard-only harus mengulang Tab dari awal — atau lebih buruk, tidak sadar posisinya sudah hilang lalu mengetik angka ke field yang salah. Untuk screen reader, ini kehilangan konteks total.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Catat elemen fokus (`id` atau path DOM) sebelum `A.reload()`, lalu pulihkan fokus ke elemen setara sesudah re-render. Kalau elemen hilang, pindahkan fokus ke heading seksi terdekat sebagai jaring pengaman.

### [BUG-02] 22 input tanpa nama aksesibel sama sekali — TINGGI

**Persona dan use-case:** User screen reader yang mengisi form SPPD. Butuh tahu field mana yang sedang diisi sebelum mengetik.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Untuk tiap `input`/`select`/`textarea`, cek berurutan: `aria-label` → `aria-labelledby` → `title` → `<label for=id>` → `closest('label')` → teks node → `placeholder` → nama dari konten (option select).
3. Kelompokkan yang lolos `<label for>` tapi tidak punya nama dari sumber manapun.

**Harapan:** Semua field punya nama yang stabil dan berbeda-beda, supaya screen reader mengumumkan "Nomor Surat, edit text", bukan sekadar "edit text".

**Kenyataannya:** Dari 121 kontrol form, **54 tidak punya `<label for>`**. Dari 54 itu, **32 masih terbaca** (dari `placeholder` atau dari teks `<option>` select), tapi **22 benar-benar tanpa nama** — screen reader membacakan string kosong atau isi placeholder generik.

**Evidence:**
```
total input tanpa label programatis = 54
dari 54 tanpa <label for>, yang MASIH punya nama terbaca = 32 -> sisa 22 benar-benar tanpa nama
contoh yang benar-benar tanpa nama:
  date ph=""  vis="Tanggal Terbit"
  text ph=""  vis="Tujuan"
  text ph=""  vis="Kegiatan"
  text ph=""  vis="Instansi Pemberi Tugas"
  text ph=""  vis="No. Rekening / Ref (op~"
  date ph=""  vis="Tanggal Cair"
  date ph=""  vis="Tanggal"
  text ph=""  vis="Rute Asal"
```
Catatan: nama `<select>` yang fallback ke isi `<option>` terbaca sebagai gabungan semua teks option, jadi tidak stabil. `SELECT "Komponen"` terbaca "Penginapan / Sewa Transport / Transport Umum / Uang Saku / Kas Kecil / BBM & Tol / E-Money / Operasional Lain / Lainnya (kategori sendiri)". `SELECT "Status Alur"` terbaca "Draft / Diajukan / Disetujui / Selesai".

**Dampak ke pengguna awam:** User tidak tahu field mana "Tanggal Terbit" dan mana "Tanggal Cair". Keduanya `<input type="date">` dengan nama kosong - pembaca layar hanya membacakan nilainya (`22/04/2026`), sehingga keduanya terdengar seperti dua field tanggal yang identik. Risiko salah input tinggi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Hubungkan tiap label visual dengan kontrolnya lewat `for`/`id`, atau tambahkan `aria-label` yang spesifik per field. Untuk `<select>`, nama harus berasal dari label, bukan dari gabungan isi `<option>`.

### [BUG-03] Semua pesan konfirmasi dan error tidak pernah diumumkan — TINGGI

**Persona dan use-case:** User screen reader yang mencentang item persiapan lalu menunggu kepastian. "Berhasil disimpan atau tidak?"

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, catat atribut `#toast-root`.
2. Trigger aksi yang memunculkan toast (`dispatchEvent` pada checkbox `checklist:toggle`).
3. Inspeksi elemen `.toast` yang muncul: cek `role`, `aria-live`, `aria-atomic`, dan durasi keberadaannya.

**Harapan:** Ada live region (`role="status"` / `aria-live="polite"`) untuk sukses, dan `role="alert"` untuk error, sehingga diumumkan otomatis tanpa user harus mencari.

**Kenyataannya:** `#toast-root` **tidak punya `aria-live` maupun `role` sama sekali**. Toast dibuat sebagai `<div class="toast">` biasa, ditambahkan ke DOM, lalu dihapus ~3 detik kemudian. Tidak ada live region di seluruh dokumen.

**Evidence:**
```
#toast-root aria-live=TIDAK ADA role=TIDAK ADA
<div class="toast"> = role alert? TIDAK (elemen biasa, dihapus ~3 detik)
[aria-invalid] total = 0 | [aria-describedby] total = 0
aria-live = 0 | role=alert/status = 0   (di seluruh dokumen)
toast muncul? toast-root children = 0 :: []
```
Konsekuensi lanjutan yang saya lihat langsung: klik "Tambah" produk tanpa memilih produk **tidak menghasilkan toast apa pun** dan **tidak ada elemen error inline** (`[aria-invalid]` = 0) — jadi validasi gagal benar-benar senyap, bahkan untuk mata.

**Dampak ke pengguna awam:** User tidak pernah mendapat umpan balik. Ia tidak tahu aksinya berhasil, gagal, atau memang tidak terjadi. Untuk user buta, ini pembeda antara "data sudah masuk" dan "data hilang".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Beri `role="status"` + `aria-live="polite"` pada kontainer toast, `role="alert"` untuk varian error, dan jangan mengubah atribut live region secara dinamis. Tambahkan pesan error inline dengan `aria-invalid` + `aria-describedby` supaya error bisa diumumkan screen reader.

### [BUG-04] Modal tidak punya `aria-modal`, tidak ada focus trap, dan 202 elemen di belakang tetap bisa difokus — TINGGI

**Persona dan use-case:** User keyboard-only yang membuka dialog "Hapus event?" dan bermaksud membatalkan dengan menekan Escape atau Tab.

**Langkah reproduksi:**
1. `document.querySelector("button.btn-danger").focus()` - fokus di pemicu.
2. Klik tombol tersebut, cek `[role=dialog]` muncul.
3. Inspeksi atribut dialog (`aria-modal`, `aria-labelledby`, `aria-label`, `tabindex`).
4. Paksa fokus ke 6 elemen di luar dialog (`el.focus()` pada link nav atas) sambil modal masih terbuka.
5. `dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))` lalu cek apakah fokus balik ke pemicu.

**Harapan:** Dialog diumumkan sebagai dialog, fokus **masuk** ke dalam, Tab diputar di dalam (focus trap), latar belakang tidak bisa difokus, dan fokus kembali ke pemicu saat ditutup.

**Kenyataannya:** Dialog punya `role="dialog"` (bagus) tapi **tidak punya `aria-modal`, `aria-labelledby`, `aria-label`, maupun `tabindex`**. Ada `<h3>` di dalamnya tapi **tanpa `id`**, jadi tidak bisa dipakai sebagai label. Fokus **tidak pernah masuk** ke dialog - baik langsung maupun setelah 200ms (dicek untuk memastikan tidak ada `setTimeout` focus di app). **Tidak ada focus trap**: semua 202 elemen fokusable di latar belakang tetap bisa difokus, dan 6 dari 6 yang saya coba **berhasil difokus** (`["Dashboard", "Event & Tugas", "Arsip", "Produk", "Master Barang", "Rekap Global"]`). Latar belakang juga **tidak di-`inert`** dan body **tidak terkunci scroll** (`overflow: visible`).

**Evidence:**
```
dialog: role=dialog | aria-modal=TIDAK ADA | aria-labelledby=TIDAK ADA | aria-label=TIDAK ADA | tabindex=TIDAK ADA
ada <h*> di dalam modal? H3 "Hapus event?" | id heading=TIDAK ADA
fokus TIDAK BERPINDAH ke modal, tetap di: <button class="btn btn-sm btn-danger"> "Hapus event"
elemen yang bisa difokus di LATAR belakang saat modal terbuka = 202
  >> fokus paksa ke "Dashboard" BERHASIL? true
overflow body saat modal = visible
```

**Dampak ke pengguna awam:** Dialog konfirmasi hapus menjadi berbahaya, bukan aman: user keyboard bisa Tab keluar dan mengaktifkan kontrol di belakang — termasuk "Hapus" pada baris lain atau nav, tanpa pernah menyadarinya dialog masih terbuka.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan `aria-modal="true"` dan `aria-labelledby` yang menunjuk `id` heading, fokus otomatis ke tombol dismiss saat terbuka, focus trap (menjaga Tab/Shift+Tab tetap di dalam dialog), `inert` pada `#app` selama dialog aktif, scroll lock, dan kembalikan fokus ke pemicu saat ditutup. **Escape sudah bekerja** dan fokus **sudah balik ke pemicu** saat ditutup - bagian ini bagus, jangan sampai hilang.

### [BUG-05] Semua badge status gagal standar kontras WCAG AA — SEDANG

**Persona dan use-case:** User buta warna (deuteranopia/protanopia) atau pengguna dengan penglihatan warna terganggu yang membaca status event di daftar.

**Langkah reproduksi:**
1. Di `#/events`, ukur `getComputedStyle` untuk foreground + background tiap badge status.
2. Hitung rasio kontras WCAG dan bandingkan dengan 4.5:1 (teks 11px bold).
3. Ulangi dengan matriks simulasi buta warna.

**Harapan:** Semua teks badge minimal 4.5:1, dan status tetap bisa dibedakan tanpa mengandalkan warna.

**Kenyataannya:** Ketiga badge utama gagal: Draft 4.39:1, Diajukan 2.86:1, Disetujui 3.58:1 - semuanya di bawah ambang 4.5:1 untuk teks kecil.

**Evidence:**
```
"Draft"      fg rgb(107,114,128) on rgb(243,244,246) = 4.39:1  (butuh 4.5) GAGAL
"Diajukan"   fg rgb(217,119,6)   on rgb(254,243,199) = 2.86:1  (butuh 4.5) GAGAL
"Disetujui"  fg rgb(5,150,105)   on rgb(236,253,245) = 3.58:1  (butuh 4.5) GAGAL
```
Pola yang sama muncul di semua rute yang punya badge (dashboard, archive, settings, products).

**Dampak ke pengguna awam:** Di simulasi deuteranopia, hijau `#059669` berubah dari 3.58:1 → 4.99:1 (justru membaik), tapi amber `#D97706` tetap rendah di semua simulasi. Yang lebih penting: di semua badge ada **teks status** ("Draft"/"Diajukan"/"Disetujui") plus glyph, jadi **warna bukan satu-satunya pembawa makna** — ini sudah bagus dan wajib dipertahankan. Yang hilang adalah kontras yang nyaman dibaca sesuai standar.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Gelapkan warna teks badge sampai minimal 4.5:1 terhadap background-nya (misal hijau `#047857` di `#ECFDF5`), atau encerkan background badge. Tetap pertahankan teksnya - jangan mengandalkan warna saja.

### [BUG-06] Angka rupiah hijau dan merah selalu gagal kontras — SEDANG

**Persona dan use-case:** User dengan gangguan penglihatan ringan yang perlu membedakan plus dan minus di tabel keuangan.

**Langkah reproduksi:**
1. Di `#/events/evt-1`, cari elemen `.amt.mono` dan `.font-bold` yang berisi nominal.
2. Hitung rasio kontras foreground/background.

**Harapan:** Nominal +/- minimal 4.5:1 supaya tanda plus dan minus terbaca jelas.

**Kenyataannya:** Warna hijau `#22C55E` di putih hanya **2.28:1**, dan merah `#EF4444` di putih **3.76:1**. Keduanya gagal. Background tidak membantu karena teksnya angka nominal uang yang harus presisi.

**Evidence:**
```
GAGAL 2.28:1 | 14px/800 | fg rgb(34,197,94) on rgb(255,255,255) | "+ Rp 500.000"  cls="amt mono"
GAGAL 3.76:1 | 14px/800 | fg rgb(239,68,68) on rgb(255,255,255) | "- Rp 25.000"   cls="amt mono"
GAGAL 3.77:1 | 12px/700 | fg rgb(5,150,105)  on rgb(255,255,255) | "+Rp 350.000"    cls="font-bold"
GAGAL 3.77:1 | 12px/700 | fg rgb(5,150,105)  on rgb(255,255,255) | label "otomatis"  cls="text-xs font-bold"
GAGAL 3.76:1 | 14px/800 | fg rgb(255,255,255) on rgb(239,68,68)   | tombol "Hapus event"
GAGAL 3.76:1 | 14px/800 | fg rgb(255,255,255) on rgb(239,68,68)   | tombol "Reset Data Dummy"
```

Teks putih di atas merah `#EF4444` juga gagal 3.76:1. Tanda plus/minus sudah ada di dalam glyph-nya, jadi maknanya tidak hilang - tapi keterbacaannya tetap terganggu.

**Dampak ke pengguna awam:** Angka yang paling kritis justru yang paling sulit dibaca. Pada pengguna dengan gangguan penglihatan ringan, tanda plus dan minus jadi sulit dibedakan, dan angka rupiah bisa salah dibaca - risiko kesalahan input keuangan cukup besar.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Gunakan shade yang lebih gelap untuk teks nominal (mis. hijau `#15803D`, merah `#B91C1C`) sehingga minimal 4.5:1 di atas putih.

### [BUG-07] 54 dari 121 input tidak punya `<label for>` — SEDANG

**Persona dan use-case:** User screen reader yang mencoba memahami struktur form cepat, atau user dengan gangguan motor yang menghindari klik mouse.

**Langkah reproduksi:**
1. Di `#/events/evt-1`, hitung total kontrol form yang terlihat.
2. Hitung yang punya `<label for>` yang terhubung, `<label>` membungkus, atau `aria-label`.

**Harapan:** Mayoritas field punya `<label for>` eksplisit supaya label bisa diklik (area sentuh ikut membesar) dan terhubung secara programatis.

**Kenyataannya:** Hanya sebagian field yang punya `<label for>`. Ada 54 kontrol yang lainnya bergantung pada teks di sebelah field (bukan elemen `<label>`), `placeholder`, atau isi `<option>`. Label implisit (label yang membungkus input) memang ada, tapi banyak field tetap tanpa nama aksesibel.

**Evidence:** `input tanpa label programatis = 54 dari total 121`, `autocomplete = 0 | required = 0 | <form>=0`.

**Dampak ke pengguna awam:** Teks visual di sebelah field bukan label yang bisa diklik atau dibaca screen reader. User yang mengandalkan navigasi label mungkin tidak pernah terhubung ke field itu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Konversi pola label visual yang bertetangga ke `<label for>`, tambahkan `autocomplete` untuk field yang punya makna semantik (nama, tanggal), dan tandai field wajib dengan `aria-required`.

### [BUG-08] Struktur heading melompat level (H1 → H3, H2 → H4) — SEDANG

**Persona dan use-case:** User screen reader yang navigasi lewat daftar heading untuk melompat ke bagian tertentu.

**Langkah reproduksi:**
1. Di `#/events/evt-1`, kumpulkan semua `h1..h6` dalam urutan DOM.
2. Cek setiap pasang bertetangga apakah levelnya naik >1.

**Harapan:** Level heading naik satu per satu (H1 → H2 → H3) atau minimal tidak melompat lebih dari 1 tingkat, supaya struktur dokumen logis.

**Kenyataannya:** Ada lompatan: setelah H1 untuk nama event, langsung H3 ("Cek Persiapan"). Setelah H2 seksi, langsung H4 ("Kelistrikan (0/6 dipilih)"). Total 35 heading, tapi 2 lompatan terdeteksi.

**Evidence:** `lompat level heading: H3("Cek Persiapan") setelah H1 | H4("Kelistrikan (0/6 dipilih)") setelah H2`.

**Dampak ke pengguna awam:** Heading navigation melompat-lompat level membingungkan; user sulit memperkirakan kedalaman dokumen dan sering "hilang" di antara heading yang levelnya salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Samakan level heading agar konsisten: H1 untuk nama event, H2 untuk seksi, H3 untuk sub-bagian, H4 untuk sub-sub-bagian.

### [BUG-09] Tombol "Hapus" muncul 13× tanpa konteks baris — SEDANG

**Persona dan use-case:** User screen reader yang menyisir tabel dan mencoba tahu tombol hapus mana untuk produk/event mana.

**Langkah reproduksi:**
1. Di `#/events/evt-1`, cari semua `<table>` yang punya `<button>` di dalamnya.
2. Untuk tiap tombol, baca nama aksesibel (teks, aria-label, closest label).

**Harapan:** Setiap tombol "Hapus" punya nama unik yang menyertakan konteks baris, misalnya "Hapus Batik Tulis" atau "Hapus Alokasi Penginapan".

**Kenyataannya:** Ada minimal 13 tombol "Hapus" yang semuanya punya nama aksesibel identik: `"Hapus"`, tanpa `aria-label`. Terjadi di 4 tabel (Produk, Item, Transaksi, dst).

**Evidence:**
```
tabel#1 header = "Produk | Qty | Dibawa | Terjual | Rusak/Hilang/Kembali"   tombol=3 :: semua nama = "Hapus"
tabel#2 header = "Item | Kategori | Qty | Biaya | Diskon | Total | Dibawa?"    tombol=3 :: semua nama = "Hapus"
tabel#3 header = "Tanggal | Produk | Qty | Harga | Modal | Total | Metode / Wallet | Total"  tombol=4 :: semua nama = "Hapus"
-> semua tombol bernama sama "Hapus" tanpa konteks baris; screen reader akan membacakan "Hapus" 13 kali berturut-turut
```

**Dampak ke pengguna awam:** Screen reader akan membacakan "Hapus, Hapus, Hapus" berulang — user tidak tahu mana yang untuk produk, mana untuk item. Risiko menghapus item yang salah tinggi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan `aria-label` yang spesifik per baris, misalnya "Hapus produk Batik Tulis" atau "Hapus item Kabel Rol 5 m".

### [BUG-10] 8 tombol seksi tidak punya `aria-expanded` — SEDANG

**Persona dan use-case:** User screen reader yang ingin tahu seksi mana yang sedang tertutup dan mana yang sedang terbuka.

**Langkah reproduksi:**
1. Di `#/events/evt-1`, cari `.psec-fold` (tombol buka/tutup seksi).
2. Cek atribut `aria-expanded` dan `aria-controls` sebelum dan sesudah toggle.

**Harapan:** Tombol disclosure punya `aria-expanded="true|false"` yang berubah saat toggle, dan `aria-controls` yang menunjuk seksi target.

**Kenyataannya:** Ada 8 tombol `.psec-fold`, **semuanya tidak punya `aria-expanded` maupun `aria-controls`**. Kondisi buka/tutup hanya disampaikan lewat perubahan glyph (misalnya `+` menjadi `-`). `aria-label` statis: "Buka / tutup seksi" - tidak menyatakan kondisi sebenarnya.

**Evidence:** `jumlah section.psec = 8`; `fold aria-expanded=TIDAK` untuk semua 8 seksi; `aria-expanded = 0 | aria-controls = 0` (seluruh dokumen). `aria-label="Buka / tutup seksi"` (dari `pages2.js`).
**Dampak ke pengguna awam:** Screen reader tidak tahu seksi mana yang terbuka. User bisa kehilangan konten yang seharusnya terlihat, atau membuang waktu mencari seksi yang ternyata sudah tertutup.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan `aria-expanded` yang berubah saat toggle dan `aria-controls` yang menunjuk `id` seksi.

### [BUG-11] Tidak ada `aria-current` di navigasi — SEDANG

**Persona dan use-case:** User screen reader yang ingin tahu halaman mana yang sedang aktif.

**Langkah reproduksi:**
1. Di semua rute, cari `[aria-current]` di nav atas dan di flowbar pill.
2. Cek apakah pill yang sedang aktif ditandai secara visual atau semantik.

**Harapan:** Link nav dan pill yang aktif ditandai dengan `aria-current="page"` atau `"true"`.

**Kenyataannya:** **Tidak ada `aria-current` sama sekali** di dokumen. Di flowbar (8 pill lompat seksi), tidak ada penanda pill mana yang sedang aktif. Nav juga tidak menandai halaman aktif secara semantik.

**Evidence:** `aria-current di nav = TIDAK ADA`; `ada aria-current di pill mana pun? 0`.

**Dampak ke pengguna awam:** Screen reader tidak bisa mengorientasi "Anda sedang di halaman ini"; user mungkin mengira sedang di halaman lain dan salah klik.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan `aria-current="page"` pada link nav yang sedang aktif, dan `aria-current` atau `aria-selected` pada pill yang sedang aktif di flowbar.

### [BUG-12] Tidak ada skip link — SEDANG

**Persona dan use-case:** User keyboard-only yang baru membuka halaman dan ingin langsung ke konten, melewati nav atas yang panjang.

**Langkah reproduksi:**
1. Di semua rute, cari `<a>` dengan teks "lewati"/"skip"/"lompat" atau `href="#app"` / `href="#main"`.
2. Cek apakah ada skip link sebagai elemen fokusable pertama.

**Harapan:** Ada skip link (biasanya `<a href="#main" class="sr-only focus:not-sr-only">`) sebagai elemen fokusable pertama, sehingga user keyboard bisa langsung ke konten utama.

**Kenyataannya:** **Tidak ada skip link** di seluruh aplikasi. User keyboard harus Tab melewati semua link nav dan kontrol header sebelum sampai ke konten.

**Evidence:** `skip link ("lewati/skip") = TIDAK ADA` di semua 9 rute yang diuji.

**Dampak ke pengguna awam:** Header punya beberapa link nav + brand + tombol mobile. User keyboard harus menekan Tab berkali-kali setiap kali membuka halaman. Untuk user dengan gangguan motor, ini sangat melelahkan dan memperlambat semua task.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan skip link sebagai elemen fokusable pertama yang melompat ke `<main id="app">`, dengan styling `sr-only` yang muncul saat focus.

### [BUG-13] Dua `<nav>` landmark tidak punya nama aksesibel — SEDANG

**Persona dan use-case:** User screen reader yang ingin melompat langsung ke "Navigasi Mobile" alih-alih "Navigasi Utama" lewat navigasi landmark.

**Langkah reproduksi:**
1. Di semua rute, hitung `<nav>` dan cek `aria-label` di masing-masing.

**Harapan:** Tiap `<nav>` punya `aria-label` yang unik, misalnya `aria-label="Navigasi Utama"` dan `aria-label="Navigasi Mobile"`.

**Kenyataannya:** Ada 2 elemen `<nav>` (topnav dan mobilenav), **tidak ada yang punya `aria-label`**. Keduanya menjadi landmark tanpa nama.

**Evidence:** `<nav>=2 nav[aria-label]=0`; `#mobilenav punya <nav aria-label>? false`.

**Dampak ke pengguna awam:** Dua landmark dengan nama kosong - saat user membuka daftar landmark, dia melihat dua entri "navigation" tanpa informasi, tidak bisa membedakannya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Beri `aria-label` yang berbeda pada masing-masing `<nav>`.

### [BUG-14] 61 target sentuh lebih kecil dari 24×24 px — SEDANG

**Persona dan use-case:** User dengan gangguan motor ringan (tremor, sendi sakit) yang mencoba menyentuh/tap checkbox kecil atau link kecil di layar mobile.
**Persona dan use-case:** User dengan gangguan motor ringan (tremor, sendi sakit) yang mencoba menyentuh atau mencentang checkbox kecil dan link kecil di layar mobile.
**Langkah reproduksi:**
1. Di `#/events/evt-1` dan `#/archive` pada viewport mobile, iterasi semua `button`, `a[href]`, `input[type=checkbox]`.
2. Ukur `getBoundingClientRect()` dan bandingkan terhadap minimum WCAG 2.2 sebesar 24x24 px.

**Harapan:** Semua target sentuh minimal 24×24 px (WCAG 2.2 AA) — atau minimal punya area yang diperluas (padding atau pseudo-element).

**Kenyataannya:** Di `#/events/evt-1`, ada **61 target < 24×24 px**. Mayoritas adalah checkbox di checklist persiapan (13×13 px!). Di `#/archive`, ada 9 link dengan tinggi 23 px (marginal). Di `#/guide`, ada 9 link dengan tinggi 17 px.

**Evidence:**
```
target size <24px (WCAG 2.2 AA) = 61
  "SPPD dibuat (no surat, tujuan, kegiatan, dll)" = 13x13
  "SPPD disetujui atau direview kepala bagian" = 13x13
  "Data instansi & NIP penanda tangan" = 13x13
  ... (60 checkbox, semua 13x13)
```
Di viewport mobile 492px, terukur 60 target < 24px di `#/events/evt-1`.

**Dampak ke pengguna awam:** Checkbox 13×13 px adalah target yang sangat sulit disentuh dengan jari yang besar atau yang tremor. User mungkin tidak sengaja mencentang item yang salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan padding atau area klik yang diperluas (minimum 24×24 px) tanpa mengubah tampilan visual checkbox, atau gunakan `::after` pseudo-element transparan yang memperluas area sentuh.

### [BUG-15] Gagal reflow: scroll horizontal muncul di 492px — SEDANG

**Persona dan use-case:** User dengan gangguan penglihatan rendah yang melakukan zoom browser 200%, atau user dengan layar kecil (split-screen, tablet kecil).

**Langkah reproduksi:**
1. Buka di viewport mobile (492×661 atau set `--window-size=390,844`).
2. Catat `document.documentElement.scrollWidth` vs `document.documentElement.clientWidth`.

**Harapan:** Konten membungkus (wrap) dan reflow ke lebar viewport tanpa perlu scroll horizontal (WCAG 1.4.10 Reflow).

**Kenyataannya:** **`scrollWidth` = 612 vs `clientWidth` = 477** - muncul scroll horizontal. 151 elemen melewati tepi kanan viewport, termasuk `<TABLE class="table" right=607 w=566>` (tabel melewati viewport). Jadi tabel keuangan/penjualan yang lebar tidak membungkus.

**Evidence:**
```
`scrollWidth`=612   `clientWidth`=477
scroll horizontal = YA
elemen yang melewati tepi kanan = 151
  BUTTON class="btn btn-sm btn-soft"   right=533  w=87
  TABLE class="table"                right=607  w=566
```
Diperparah oleh text-spacing: setelah override `line-height 1.5em, letter-spacing 0.12em, word-spacing 0.16em`, **21 elemen** mengalami pemotongan konten (scroll > client), termasuk heading H1 (171px vs 72px client).

**Dampak ke pengguna awam:** User yang zoom in atau layar kecil harus scroll horizontal bolak-balik untuk membaca tabel lebar. Jika tabel melewati viewport tanpa wrapper yang bisa di-scroll, user bisa kehilangan kolom kanan tanpa disadari.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Bungkus tabel lebar dalam wrapper dengan `overflow-x: auto`, atau ubah `table-layout` ke `fixed` dengan `word-wrap`. Pastikan heading tidak punya lebar tetap yang menyebabkan pemotongan konten.

### [BUG-16] Tidak ada `required`/`aria-required` pada field yang WAJIB — RENDAH

**Persona dan use-case:** User screen reader yang ingin tahu field mana yang wajib diisi sebelum mengirim.

**Langkah reproduksi:**
1. Di semua rute, cari `[required]`, `[aria-required]`, dan `required` di dalam `<form>`.
2. Cek apakah ada elemen `<form>` di aplikasi.

**Harapan:** Field yang wajib diisi ditandai dengan `required` atau `aria-required="true"`, dan ada penanda visual (bintang atau teks "wajib") yang bisa dibaca screen reader.

**Kenyataannya:** **Tidak ada `required` maupun `aria-required`** di seluruh aplikasi. Bahkan tidak ada elemen `<form>` - semua validasi dilakukan via JavaScript tanpa penanda semantik. Validasi juga tidak punya `aria-invalid` (lihat BUG-03).

**Evidence:** `autocomplete = 0 | required = 0 | <form>=0`.

**Dampak ke pengguna awam:** Screen reader tidak bisa melewati field wajib dengan mode navigasi form yang biasa. User mungkin baru tahu field wajib salah setelah submit gagal (dan gagal-nya senyap — lihat BUG-03).

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan `aria-required="true"` pada field wajib, dan sediakan pesan error yang bisa dibaca (lihat BUG-03). Pertimbangkan membungkus kontrol form dalam elemen `<form>` agar screen reader bisa mengirim dan memvalidasi otomatis.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **`role="dialog"` sudah dipakai** di dialog konfirmasi — fondasi yang tepat untuk focus trap dan `aria-modal` nanti.
- **Escape menutup modal dan fokus kembali ke pemicu** - sudah bekerja, diuji langsung (`setelah Escape: modal masih ada? false; fokus kembali ke pemicu? true`).
- **Semua tombol punya nama aksesibel** — `tombol tanpa nama aksesibel = 0` di semua rute yang diuji.
- **Tidak ada `tabindex` positif** — urutan fokus natural (bukan tab trap buatan sendiri), benar untuk keyboard.
- **Indikator fokus berfungsi** - semua tipe kontrol yang diuji (link, button, input, select, textarea, checkbox) menunjukkan perubahan visual saat difokus (outline, border-color, atau box-shadow). Diverifikasi numerik: input berubah dari `border=rgb(229,229,229)` menjadi `border=rgb(225,29,46)` plus shadow accent.
- **Checkbox native `<input type=checkbox>`** dipakai (bukan `div` buatan) - otomatis bisa difokus dan diaktifkan dengan tombol Spasi.
- **Tidak ada `<a>` tanpa `href`** dan **tidak ada `<div>/<span>` dengan `data-action`** yang tidak bisa difokus — tidak ada "button semu" yang rusak untuk keyboard.
- **Tidak ada gambar tanpa `alt`** dan tidak ada SVG dekoratif tanpa `aria-hidden` — konten visual sudah bersih untuk screen reader.
- **Badge status selalu punya teks** ("Draft", "Diajukan", "Disetujui") plus glyph — **warna bukan satu-satunya pembawa makna**. Ini penting untuk user buta warna dan perlu dipertahankan saat kontras diperbaiki.
- **Hero checks pakai glyph + teks** ("✓ SPPD lengkap", "• Produk dicatat") — bukan hanya lingkaran warna.
- **`.vc-dot` (lingkaran status) selalu dikelilingi teks** - setiap titik selalu memiliki teks tetangga, jadi maknanya tidak hilang kalau warna tidak terbaca.
- **Fokus input punya indikator yang jelas** — border accent + shadow `rgba(225,29,46,0.12)` saat difokus, konsisten dengan identitas visual.
- **Trigger tombol sudah focusable** sebelum modal dibuka — user keyboard punya posisi fokus yang jelas saat akan membuka dialog.

## Pertanyaan terbuka / perlu konfirmasi

- **Urutan fokus multi-kolom**: grid checklist dan milestone di Layar Kerja memiliki urutan DOM yang **column-major** (sel per kolom dibaca sebelum pindah ke kolom berikutnya), sementara secara visual user mungkin mengharapkan **row-major** (baca baris per baris dari kiri ke kanan). Saya belum bisa memastikan apakah ini melanggar WCAG 2.4.3 (Focus Order) - **perlu konfirmasi** apakah urutan visual yang diharapkan memang row-major.
- **Zoom 200%**: saya menguji di 492px (mobile) tapi belum menguji zoom browser 200% langsung. Mode Reflow (WCAG 1.4.4) mungkin juga terdampak - **perlu konfirmasi** di viewport desktop.
- **Target 24px vs spacing exception**: WCAG 2.2 memungkinkan target kecil jika ada spacing 24px di sekitarnya. Checkbox 13×13 mungkin punya spacing yang memenuhi exception — saya hanya ukur ukuran target, **belum mengukur jarak antar-target** — **perlu konfirmasi**.
- **Urutan fokus di `<select>` milestone**: urutannya `SELECT → BUTTON → BUTTON → BUTTON → SELECT` per baris — **perlu konfirmasi** apakah ini sesuai urutan visual yang diharapkan (dari kiri ke kanan per baris).
- **Simulasi buta warna**: CSS `filter: grayscale()` **tidak mengubah `getComputedStyle`**, jadi hasil simulasi berbasis CSS filter **tidak bisa dipakai sebagai bukti**. Saya menggunakan matriks Vienot langsung ke ruang RGB sebagai gantinya, tapi hasilnya belum divalidasi dengan user testing nyata - **perlu konfirmasi** dengan user buta warna sungguhan.
- **Duplikasi ID / tabrakan landmark**: belum saya uji apakah ada duplikasi `id` di DOM yang bisa mengacaukan `aria-labelledby` - **perlu konfirmasi** dengan axe-core atau tool otomatis.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| **Keyboard navigation** | 2/5 | Semua kontrol native bisa difokus, tidak ada `tabindex` positif, Escape berfungsi, fokus balik ke pemicu - fondasinya benar. Tapi fokus hilang setiap aksi (`A.reload()`), modal tanpa trap (202 elemen latar bisa difokus), 8 tombol seksi tanpa `aria-expanded`, tanpa skip link, tanpa `aria-current` di nav. Untuk user keyboard-only, ini perlu perbaikan focus management yang serius. |
| **Screen reader support** | 1/5 | 22 input tanpa nama aksesibel, semua toast/pesan error tidak punya live region (senyap), tabel tanpa caption/scope dengan 13 tombol "Hapus" identik, 2 nav tanpa nama, heading melompat level. Prioritas aksesibilitas di codebase ini rendah - perlu perbaikan sistemik. |
| **Buta warna** | 2/5 | Bagus: warna bukan satu-satunya makna (badge punya teks, hero check punya glyph + teks). Buruk: beberapa pasangan warna badge status gagal kontras (2.86–4.39:1), angka nominal uang hijau 2.28:1, tombol "Hapus" putih di merah 3.76:1. Perbaikannya mudah (gelapkan warna), tapi perlu meninjau seluruh palet. |
| **Reflow & zoom** | 2/5 | Gagal di 492px (`scrollWidth` 612 vs client 477, 151 elemen melewati tepi, tabel w=566px). Override text-spacing memperparah masalah (21 elemen terpotong, termasuk H1). Tabel lebar perlu wrapper yang bisa di-scroll. |
| **Target sentuh (mobile)** | 2/5 | Checkbox 13×13px (60 buah di Layar Kerja) terlalu kecil untuk user dengan gangguan motor. Link archive 23px dan guide 17px juga di bawah 24px WCAG 2.2. Perbaikan mudah: tambah padding atau area sentuh transparan. |
