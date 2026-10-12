# AGENT-11 — Tidak Sabar

> **Persona:** Pengguna yang tidak sabar, memberi aplikasi ini 5 detik, dan hanya ingin tahu "berapa saldo saya sekarang" lewat angka besar yang langsung terlihat. · **Fokus:** Waktu sampai jawaban penting, posisi angka kunci terhadap lipatan, jumlah klik, konfirmasi yang mengejutkan, toast yang cepat hilang, ukuran target sentuh. · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah Temuan |
|---|---|
| KRITIS | 0 |
| TINGGI | 4 |
| SEDANG | 4 |
| RENDAH | 2 |

Kesimpulan: aplikasinya **tidak lambat**. Render halaman terbesar (Layar Kerja, 69.743 karakter HTML dengan 8 seksi penuh) cuma 9,8 ms di desktop dan 8,1 ms di mobile; data dari localStorage termuat 0,7 ms; pindah hash ke Layar Kerja 153 ms. Bottleneck persona tidak sabar bukan kecepatan, tapi **jarak dan urutan informasi**. Di halaman kerja, satu-satunya angka saldo moneter besar (36px) muncul di posisi 14,9 layar scroll pada desktop dan 18,6 layar pada mobile, sementara layar pertama hanya menampilkan "40%" (progres) dan kalimat saldo kecil 14px. Latar masalahnya: 8 seksi terbuka penuh secara default sehingga dokumen setinggi 14.164 px (22,5 layar); melipat semua seksi hanya butuh 8 klik dan memangkas tinggi halaman 8,1 kali. Di atas itu ada 20 dari 139 kontrol di bawah 40 px (paling kecil 13x13 px), 28 dari 29 tombol hapus tanpa konfirmasi dan tanpa undo, serta toast yang umurnya hanya 3 detik. Ringkasnya: cepat sampai aplikasi terbuka, lambat sampai ke jawaban.

## Environment yang dipakai

- Edge headless (`--headless=new`) dengan **profil unik per run** (`--user-data-dir` di folder temp), `--virtual-time-budget=15000`, hasil dibaca dari `--dump-dom` pada elemen `<pre id="out">`.
- **Seed default**: harness menjalankan `localStorage.clear()` plus penghapusan kunci `sppd_toolbox_db_v1` dan `sppd_toolbox_db_v2` sebelum tag `<script>` aplikasi dimuat. Yang teruji adalah seed bawaan: 9 event, `evt-1` = "Pameran UMKM Nusantara Expo 2026" (berjalan, Dana Awal 2.500.000, total budget 2.850.000, Dana Cair 1.500.000 sudah cair dan 1.000.000 belum).
- Dua ukuran viewport: **desktop 1342x629** (dari `--window-size 1366,768` dikurangi chrome headless) dan **viewport pendek 492x705** (dari `390,844`). Catatan jujur: Edge headless tidak melakukan emulasi perangkat, sehingga ukuran kedua adalah *layar pendek*, bukan HP 390 px sungguhan. Sebagian temuan mobile saya tandai perlu konfirmasi di perangkat nyata.
- Rute yang diuji: `#/dashboard`, `#/events`, `#/events/evt-1` (Layar Kerja, 8 seksi), `#/reports`, `#/guide`, `#/settings`, `#/products`, `#/archive`, `#/master`.
- Metrik yang dipakai: `performance.now()` dengan rata-rata 5 iterasi untuk waktu render (dikonfirmasi silang dengan `Date.now()`), `MutationObserver` pada `#app` untuk menghitung render ganda, `MutationObserver` pada `#toast-root` untuk umur toast, `getBoundingClientRect()` digabung `window.scrollY` untuk posisi absolut elemen, `window.innerHeight` sebagai batas lipatan, `getComputedStyle().fontSize` untuk hierarki angka, serta `getBoundingClientRect()` pada seluruh elemen `[data-action]` untuk audit target sentuh.
- Tiga harness dibuat di folder `_QA_TMP/` (`a11.html`, `a11b.html`, `a11c.html`) dan **sudah dihapus** setelah pengujian selesai. Tidak ada file aplikasi yang diubah.

## Temuan

### [BUG-01] Angka "Saldo" besar justru yang paling jauh di halaman — TINGGI

**Persona dan use-case:** Saya cuma mau tahu "berapa saldo saya sekarang" untuk event yang sedang jalan. Saya buka app, klik event, dan dalam 5 detik yang saya lihat cuma satu angka besar: **40%** (persen progres). Angka uang yang saya cari justru ada, tapi kecil dan jauh di bawah.

**Langkah reproduksi:**
1. Buka `index.html`, hash default `#/dashboard`.
2. Klik kartu event "Pameran UMKM Nusantara Expo 2026" di blok "Event berjalan" (1 klik).
3. Sekarang berada di Layar Kerja `#/events/evt-1`. Ukur posisi seluruh elemen `.big-num` dan `.stat-num` terhadap `innerHeight` **tanpa melakukan scroll sama sekali**.
4. Ulangi langkah 1 sampai 3 pada ukuran viewport pendek.

**Harapan:** Setelah 1 klik, layar pertama menampilkan **angka uang** sebesar mungkin, karena itulah yang saya tanya. Kalau tidak sempat, minimal ada tombol lompat yang langsung terlihat di layar pertama.

**Kenyataannya:**
- `.big-num` di hero berisi `40%`, font **56px**, `top=275.5px`, status LIPAT_ATAS. Jadi angka terbesar di layar bukan uang, melainkan persentase.
- Saldo di hero hanya muncul sebagai kalimat kecil: `"2 dari 5 tahap selesai - Kas akhir Rp 4.545.000 - Dana cair Rp 1.500.000"`, font **14px**, `top=357.9px`, lebar 1207 px. Angka di dalam kalimat selebar 1207 px itu nyaris tidak menonjol.
- Satu-satunya `.stat-num` yang berisi "Rp" (font 36px) berada di `top_doc=9389.1px`, yaitu **14,93 layar di bawah** pada desktop. Pada viewport pendek: `top_doc=13080.6px` atau **18,6 layar di bawah**.
- Total ada 13 elemen angka besar di halaman; hanya 2 yang berada di lipatan atas, 11 sisanya di bawah lipatan.
- Di halaman pertama `#/dashboard` sendiri tidak ada masalah sama sekali: label "Saldo Akhir" di `top=205px` dan nilainya `Rp 36.415.000` di `top=229px` sudah di lipatan atas. Jadi masalahnya khas di Layar Kerja, bukan di Dashboard.

**Evidence:**
```
desktop innerH=629 -> docScrollHeight kerja=14164px (22.5 layar)
  NUM mt-2 | 40%         | top=275.5   | fs=56px | LIPAT_ATAS
  NUM text-4xl | Rp 4.545.000 | top=9389.1 | fs=36px | BAWAH  <- satu-satunya saldo besar
  teks saldo hero: fs=14px, top=357.9, w=1207
viewport pendek innerH=705 -> docScrollHeight=20201px (28.7 layar)
  NUM text-4xl | Rp 4.545.000 | top=13080.6 | fs=36px | BAWAH
```

**Dampak ke pengguna awam:** Saya menyimpulkan "saldo saya tidak ada di sini" atau "aplikasi ini lambat", lalu menutup tab dalam 5 detik. Padahal jawabannya ada, cuma kecil dan jauh. Untuk PIC UMKM yang squeezer Review kas di sela jualan, ini langsung mendorong mereka cek manual lewat buku atau pesan WhatsApp, bukan pakai aplikasi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Letakkan satu **kartu saldo moneter besar** di bagian paling atas Layar Kerja (misalnya "Saldo sekarang - Rp 4.545.000" dengan font 40 px atau lebih), sebelum atau di dalam hero, sehingga mendominasi layar pertama. Persentase progres turunkan prioritas visualnya (bar tipis atau chip kecil), karena untuk orang yangbicara soal uang, saldo lebih penting daripada progres. Alternatif: satu baris "Ringkasan Cepat" berisi tiga angka besar (Saldo, Terjual, Terpakai) yang diletakkan tepat sebelum flowbar.

---

### [BUG-02] Layar Kerja setinggi 22,5 layar scroll dan 8 seksi terbuka semua secara default — TINGGI

**Persona dan use-case:** Saya masuk Layar Kerja untuk satu angka, tapi saya dapat dokumen sepanjang 14.164 piksel. Saya tidak akan menggulir 22 layar. Saya akan menutup aplikasinya.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Catat `document.documentElement.scrollHeight` (hasil: **14164** desktop, **20201** viewport pendek).
3. Hitung `document.querySelectorAll('.psec.closed').length` (hasil: **0**, tidak ada seksi yang terlipat).
4. Klik seluruh 8 tombol `.psec-fold` satu per satu, lalu catat tinggi dokumen lagi.

**Harapan:** Halaman kerja yang memuat 8 modul sebaiknya datang dalam keadaan ringkas: misalnya seksi 01 dan 02 terbuka, sisanya terlipat, atau ada tombol "Ringkas semua".

**Kenyataannya:** Semua 8 seksi terbuka penuh sejak halaman dimuat. Tinggi dokumen 22,5 layar. Setelah 8 klik lipatan, tinggi turun menjadi **1793 px** (hemat 12.680 px, atau **8,1 kali lebih ringkas**). Artinya sekitar 87 persen tinggi dokumen adalah konten yang bukan jawaban atas pertanyaan awal. Pada viewport pendek, 8 seksi terbuka = 20.201 px (28,7 layar); dilipat semua menjadi 2.359 px (hemat 17.842 px, 8,6 kali). Status lipatan juga **tidak disimpan** di mana pun (`localStorage` tidak memuat kata kunci `closed`), sehingga setiap kunjungan saya mengulang halaman 22,5 layar yang sama dari awal.

**Evidence:**
```
tinggi_doc_8_seksi_terbuka=14473 -> semua dilipat=1793 (hemat 12680px, 8.1x)
jumlah_klik_untuk_mengecilkan=8
viewport pendek: 20201 -> 2359 (hemat 17842px, 8.6x)
psec_closed saat halaman pertama dimuat = 0 dari 8
tinggi tiap seksi (desktop): 01=2944  02=812  03=830  04=1830  05=825  06=1783  07=709  08=2889
```

**Dampak ke pengguna awam:** Kesan pertama saya adalah "ini aplikasi laporan tahunan, bukan alat kerja harian". Untuk orang yang cuma mau cek saldo atau mencatat satu pengeluaran, beban untuk memahami bentuk halamannya jauh lebih besar daripada pekerjaan yang mau ia lakukan. Karena status lipatan tidak diingat, saya juga kehilangan konteks setiap kali membuka ulang.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Simpan status lipatan tiap seksi di localStorage (bukan hanya di DOM) dan pilih kondisi awal yang ramah waktu: buka hanya seksi 01 dan 02, sisanya terlipat. Tambahkan satu tombol global "Ringkas semua" dan "Buka semua" di flowbar agar pengguna bisa mengubah halaman 22,5 layar menjadi 3 layar dalam satu klik. Alternatif yang lebihmendasar: jadikan 8 seksi sebagai tab atau route terpisah (misalnya `#/events/evt-1/kas`), sehingga satu pertanyaan sama dengan satu halaman pendek.

---

### [BUG-03] "Alur Kerja" (flowbar), alat lompat tercepat, justru ada di bawah lipatan — TINGGI

**Persona dan use-case:** Saya tahu ada 8 seksi di halaman ini dan saya cuma butuh seksi 06 (Kas). Saya mencari tombol lompat, tapi tombol itu sendiri harus dicari lewat scroll lebih dulu.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Ukur `getBoundingClientRect()` elemen `.flowbar` lalu tambahkan `window.scrollY`.
3. Bandingkan hasilnya dengan `window.innerHeight`.

**Harapan:** Kontrol navigasi internal (delapan pill lompat) ada di layar pertama, justru karena kontrol itulah yang membuat halaman panjang bisa dipakai dalam 5 detik.

**Kenyataannya:** Flowbar berada di `top_doc=1041.9px` pada desktop, yaitu **1,66 layar** di bawah lipatan. Pada viewport pendek: `top_doc=1581.9px`, yaitu **2,24 layar**. Yang memenuhi layar pertama sebelum flowbar adalah blok **"Cek Persiapan"** setinggi 502 px (desktop) atau 882 px (viewport pendek) yang berisi 24 checkbox. Artinya untuk mencapai satu-satunya kontrol navigasi internal, saya harus membaca seluruh blok checklist terlebih dahulu.

**Evidence:**
```
flowbar top_doc=1041.9 h=50 vh=629  -> harus scroll 1.66 layar
flowbar top_doc=1581.9 h=84 vh=705  -> harus scroll 2.24 layar
cek_persiapan h=502 top=515.9 (desktop) / h=882 top=675.9 (viewport pendek)
pill ke-8, teks: 01 SPPD / 02 Jadwal / 03 Produk / 04 Item / 05 Penjualan / 06 Kas / 07 Pulang / 08 Laporan
tinggi pill = 28px, lebar pill = 71.4px
```

**Dampak ke pengguna awam:** Pertanyaan paling mendasar saat memakai aplikasi panjang, yaitu "di mana cara cepat pindah?", berubah menjadi "harus scroll dulu baru bisa lompat". Kombinasi ini membuat halaman 22,5 layar terasa 24,5 layar. Di viewport pendek, checklist 882 px-lane berarti 1,25 layar penuh terbuang sebelum kontrol navigasi kelihatan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pindahkan flowbar ke **tepat setelah hero**, sebelum blok Cek Persiapan, atau jadikan bagian dari header sticky. Kalau Cek Persiapan memang penting, ringkas menjadi satu baris seperti "Cek Persiapan 2 dari 24" yang bisa dibuka-tutup, bukan 24 checkbox yang langsung dirender. Pastikan flowbar menjadi elemen pertama yang terlihat di layar pertama baik di desktop maupun di layar sempit.

---

### [BUG-04] Tombol "Hapus" menghapus data dalam 0 ms tanpa konfirmasi, pada 28 dari 29 tombol — TINGGI

**Persona dan use-case:** Saya sedang terburu-buru, salah menekan baris yang salah, dan data saya hilang seketika tanpa kesempatan membatalkan. Justru karena tidak ada konfirmasi, saya tidak menyadari itu terjadi sampai jauh kemudian.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, lalu gulir ke seksi 05 "Uang - Penjualan" (`top_doc=8338.3px`).
2. Klik tombol "Hapus" pada baris transaksi pertama.
3. Periksa `#modal-root .modal-backdrop` dan hitung baris penjualan sebelum serta sesudah.

**Harapan:** Aksi destruktif seperti menghapus transaksi penjualan, pengeluaran, alokasi, atau rute meminta konfirmasi, atau setidaknya ada tombol "Urungkan" selama beberapa detik.

**Kenyataannya:** Baris hilang **seketika** (`ms_sampai_data_terhapus=0`), **tanpa modal konfirmasi sama sekali** (`modal konfirmasi muncul? false`), dan **tanpa tombol batal** (`ada tombol "Urungkan"/"Undo"? false`). Yang muncul hanya toast sekejap. Saldo ikut berubah seketika tanpa jejak. Dari 29 tombol hapus yang saya hitung, hanya 1 yang memakai konfirmasi (yaitu `event:delete`). Sembilan belas jenis aksi lain tidak pernah meminta konfirmasi sama sekali: `budget:delete`, `danaCair:delete`, `transport:delete`, `milestone:delete`, `milestone:att:delete`, `prepitem:delete`, `sale:delete`, `expense:delete`, `kasadj:delete`, `eventproduct:remove`, `prepitem:pulang`, dan `itemtemplate:delete`.

**Evidence:**
```
tombol Hapus di tabel penjualan: "Hapus" top_doc=8338.3 w=59.1 h=32
ms_sampai_data_terhapus=0
modal konfirmasi muncul? false
baris penjualan 4 -> 3
saldo Rp 4.470.000 -> Rp 4.290.000
ada tombol "Urungkan"/"Undo"? false
total_tombol_hapus=29 | tombol_hapus_TANPA_konfirmasi=28
```

**Dampak ke pengguna awam:** Kerugian data yang **tidak terasa** sampai saat administrasi reckoning adalah jenis kesalahan yang paling mahal untuk UMKM. Untuk orang tidak sabar yang menekan cepat, ini bukan fitur "cepat" melainkan bom waktu. Perhatikan juga sisi sebaliknya: konfirmasi yang **hanya** ada untuk `event:delete` setinggi 148 px dan muncul sebagai pop-up gelap mendadak tanpa konteks, sehingga kalau tidak sengaja tersentuh justru membingungkan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Untuk seluruh aksi hapus baris, gunakan pola konfirmasi yang sangat singkat dan tidak mengganggu, misalnya tombol berubah menjadi "Yakin hapus? / Batal" secara inline selama 3 detik (satu klik tambahan, bukan modal)._LEBIH BAGIK lagi: beri **undo** pada toast, misalnya toast "Transaksi dihapus" dilengkapi tombol "Urungkan" dengan sisa waktu 5 sampai 8 detik. Perkuat konfirmasi `event:delete` yang sudah ada. Hapus tidak perlu konfirmasi untuk hapus item checklist bernilai kecil, tapi tetap perlu untuk nominal uang.

---

### [BUG-05] Toast hanya hidup 3 detik dan menumpuk bertumpuk — SEDANG

**Persona dan use-case:** Setelah saya menekan "Hapus" atau "Catat Pengeluaran", saya ingin bukti singkat bahwa aksinya berhasil. Tapi toast-nya hilang sebelum sempat saya baca.

**Langkah reproduksi:**
1. Pasang `MutationObserver` pada `#toast-root`, catat waktu anak pertama masuk dan waktu anak terakhir keluar.
2. Panggil `SPT.toast('Pengeluaran dicatat Rp 150.000','success')`.
3. Tunggu sampai `#toast-root` kosong, lalu hitung selisih waktunya.

**Harapan:** Konfirmasi visual bertahan minimal 5 detik, idealnya dengan tombol aksi, sehingga sempat membaca nominalnya.

**Kenyataannya:** Toast muncul dengan animasi masuk, **mulai memudar di 2600 ms**, dan **dihapus total di 3000 ms**; umur terukur persis **3000,0 ms**. Karena inilah satu-satunya umpan balik dari 28 tombol hapus tanpa konfirmasi, verifikasi setiap aksi cepat praktis hilang. Selain itu toast **menumpuk** karena `space-y-2` tanpa batas jumlah: setelah tiga aksi beruntun ada tiga toast bertumpuk ("Pengeluaran dicatat Rp 150.000", "Pengeluaran dicatat Rp 75.000", "Transaksi dihapus") dan tidak ada cara menutupnya secara manual.

**Evidence:**
```
umur toast: add=1540.6ms, rem=4540.6ms, total=3000ms
ukuran toast: w=360 h=45, left=951 top=576 (desktop) / left=101 top=652 (viewport pendek)
kode: setTimeout(fade 2600ms); setTimeout(remove 3000ms)
toast bertumpuk setelah 3 aksi: 2 masih tampil = "Pengeluaran dicatat Rp 150.000 || Pengeluaran dicatat Rp 75.000"
```

**Dampak ke pengguna awam:** Saya menekan beberapa kali dengan cepat, melihat beberapa toast bertumpuk, lalu semuanya hilang dalam 3 detik. Saya tidak yakin data terakhir saya masuk atau tidak, dan saya akan menekan ulang. Asterisk: dobel entry sendiri sudah tercegah karena form ke-reset dan validasi `jumlah <= 0` menolak, tapi pengguna tetap bingung dan cenderung mengulang.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Naikkan durasi toast menjadi 5 sampai 6 detik dengan indikator waktu tersisa, batasi jumlah toast yang tampil bersamaan (maksimal 3, sisanya ringkas jadi "dan 2 lainnya"), serta sediakan tombol aksi di dalam toast, khususnya "Urungkan" untuk aksi hapus. Untuk toast sukses tanpa aksi, jangan hilang otomatis selama pengguna masih berada di halaman itu.

---

### [BUG-06] Hampir semua kontrol di Layar Kerja terlalu kecil untuk ditekan cepat - SEDANG

**Persona dan use-case:** Saya sedang di HP, sambil sibuk, dan ingin mencentang checklist atau pindah seksi secepat mungkin. Jari saya tidak mendarat di target 13 piksel.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` pada ukuran viewport pendek.
2. Ukur `getBoundingClientRect()` seluruh elemen `[data-action]`, kelompokkan yang punya sisi di bawah 40 px.
3. Baca tabel jumlah dan ukuran per jenis aksi.

**Harapan:** Semua kontrol yang sering dipakai punya area sentuh minimal 44x44 px (standar Material dan Apple), terutama di mobile.

**Kenyataannya:** Dari **139 elemen actionable**, **138 (99 persen)** punya setidaknya satu sisi di bawah 44 px, dan ada **20 sampai 21 jenis kontrol** di bawah 40 px. Yang paling parah:
- `checklist:toggle` sebanyak **24 buah**, hanya **13x13 px** (checkbox bawaan browser, tanpa kelas `w-4 h-4`).
- `bring:toggle` sebanyak **29 buah**, juga **13x13 px** (checkbox master barang).
- `prepitem:done` dan `prepitem:pulang`, keduanya **13x13 px**.
- `psec:toggle` (tombol lipat seksi) **8 buah**, **26x26 px**.
- `flow-pill` dan `scroll:to` **9 buah**, **86x28 px** (tinggi 28 px di bawah ambang 44 px).
- Seluruh tombol `*:delete` bertinggi **32 px**.
- `milestone:delete` **31,8x32 px**, dan pada viewport pendek `milestone:set` (dropdown status) hanya **26x40 px**.

Sebagai pembanding, tombol utama seperti `expense:add`, `event:new`, dan `data:export` berukuran 43 px, jadi masih di bawah 44 px tapi jauh lebih layak.

**Evidence (viewport 492x705):**
```
total_actionable=139 | jenis_kecil(<40px)=21
KECIL checklist:toggle x24 @ 13x13
KECIL bring:toggle     x29 @ 13x13
KECIL psec:toggle      x8  @ 26x26
KECIL scroll:to        x9  @ 86x28
KECIL semua *:delete (10 jenis) @ 58.7x32
KECIL milestone:delete x5  @ 31.8x32
KECIL milestone:set    x1  @ 26x40   (hanya muncul di viewport pendek)
KECIL nav:go           x1  @ 390.2x30
desktop: total_actionable=139, jenis_kecil=20
```

**Dampak ke pengguna awam:** Saya akan salah mencentang checklist, salah memilih seksi saat melompat, atau salah menekan Hapus (yang kebetulan menghapus tanpa konfirmasi, lihat BUG-04). Kombinasi "target 13x13 px" dengan "hapus tanpa konfirmasi" adalah kombinasi paling berbahaya di aplikasi ini, karena dua kelemahan saling menguatkan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Beri kelas `w-4 h-4` atau lebih (idealnya `w-5 h-5`) pada semua checkbox `checklist:toggle`, `bring:toggle`, `prepitem:done`, dan `prepitem:pulang`, atau bungkus seluruh baris label menjadi elemen yang menjadi target sentuh penuh (tinggi baris sekitar 32 px). Naikkan `psec-fold` ke minimal 36x36 px dengan padding, dan `flow-pill` ke tinggi 36 sampai 40 px. Pastikan jarak antar kontrol minimal 8 px supaya tidak salah target.

---

### [BUG-07] Setiap klik navigasi internal merender halaman dua kali (69.858 karakter HTML dua kali) — SEDANG

**Persona dan use-case:** Saya klik link di dalam aplikasi, dan halaman berkedip karena dirender dua kali berturut-turut. Rasanya lambat, padahal totalnya cuma sekitar 20 ms.

**Langkah reproduksi:**
1. Dari `#/dashboard`, pasang `MutationObserver` pada `#app` dengan `{childList:true}`.
2. Reset penghitung, lalu klik satu kali link kartu event.
3. Tunggu 700 ms supaya event `hashchange` selesai, lalu baca penghitung dan `performance.now()`.

**Harapan:** Satu klik menghasilkan satu render.

**Kenyataannya:** Satu klik menghasilkan **dua render penuh dengan HTML identik** (`69858, 69858`). Penyebabnya terlihat jelas di `js/app.js` dan `js/actions.js`: handler `nav:go` menjalankan `location.hash = href; A.reload();` sementara listener `hashchange` juga memanggil `render()`. Jadi `A.reload()` merender sekali, lalu event `hashchange` merender lagi. Pola yang sama ada di `tab:goto`, `events:filter`, dan `archive:set`. Selain boros kerja, ini juga berarti `window.scrollTo(0,0)` di handler `hashchange` terjadi **setelah** render pertama, sehingga posisi scroll bisa berkedip sebentar di koordinat lama sebelum dikoreksi.

**Evidence:**
```
1 klik ke kartu event -> #app berubah 2x, panjang html = 69858, 69858
1x render eventDetail = 9.8ms  ->  2x = sekitar 19,6ms plus jeda hashchange
```

**Dampak ke pengguna awam:** Untuk persona tidak sabar, ini terasa seperti "klik tidak merespons" atau kedipan, terutama di HP kelas bawah yang perangkatnya lebih lambat. Bukan fatal, tapi menutupi arsitektur yang sebenarnya sudah bagus dan membuat aplikasi terasa kurang "instan".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pilih satu sumber render saja: biarkan listener `hashchange` yang melakukan render, lalu hapus pemanggilan `A.reload()` dari handler `nav:go`, `tab:goto`, `events:filter`, dan `archive:set`; atau sebaliknya, ubah hash dengan `history.pushState` lalu panggil `render()` secara manual tanpa listener `hashchange` yang dobel. Dengan begitu satu klik menghasilkan satu render dan satu reset scroll yang deterministik.

---

### [BUG-08] Modal form panjang meluber di layar pendek, tombol Simpan jatuh di bawah lipatan — SEDANG

**Persona dan use-case:** Dari halaman Event saya menekan "Buat Event Baru" untuk cepat menambah tugas. Modal-nya lebih tinggi dari layar saya, dan tombol "Simpan" ada di paling bawah, jadi harus menggulir di dalam modal dulu.

**Langkah reproduksi:**
1. Dari `#/events/evt-1`, panggil aksi `event:new` (tombol "+ Buat Event Baru" di halaman Event membuka modal yang sama).
2. Ukur tinggi `.modal` terhadap `innerHeight` di desktop (629) dan di viewport pendek (705).
3. Periksa apakah `.modal-backdrop` memakai `align-items: flex-start` dan apakah ada sticky footer.

**Harapan:** Modal muat di layar, atau minimal tombol aksi utama (Simpan dan Batal) selalu terlihat tanpa perlu menggulir.

**Kenyataannya:** Modal "Buat Event Baru" setinggi **457,7 px** di desktop (masuk, `perlu_scroll_dalam_modal=false`) tetapi **766,4 px** di viewport pendek, yaitu **lebih besar dari 705 px** (`perlu_scroll_dalam_modal=true`). Karena `.modal-backdrop` memakai `align-items: flex-start`, modal mulai dari atas dan ujung bawahnya, tempat tombol Simpan dan Batal berada, jatuh di luar area terlihat. Tidak ada sticky footer dan tidak ada indikasi bahwa isinya bisa digulir. Modal konfirmasi hapus yang kecil (148 px) aman, jadi masalahnya hanya khusus modal form panjang.

**Evidence:**
```
desktop 629px : modal "Buat Event Baru" h=457.7 -> perlu_scroll=false (aman)
viewport 705px: modal "Buat Event Baru" h=766.4 -> perlu_scroll=TRUE (meluber 61px)
modal hapus event: h=148 (desktop) / h=159.7 (viewport pendek) -> OVERFLOW_BAWAH=false (aman)
```

**Dampak ke pengguna awam:** Di HP saya menekan "Simpan" dan tidak terjadi apa-apa karena tombolnya di luar layar. Saya akan menekan berulang, atau menutup modal dan mengira penyimpanan gagal, lalu mengulang dari awal. Ini persis cabang yang membuat orang berhenti di tengah jalan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Beri modal form panjang dua kolom yang bisa dilipat pada layar pendek, atau jadikan area body modal `overflow-y: auto` dengan tinggi maksimum `calc(100vh - 32px)` dan **sticky footer** berisi tombol Simpan dan Batal, sehingga aksi utama selalu terjangkau. Pastikan juga ada affordance visual yang jelas bahwa area modal bisa digulir.

---

### [BUG-09] Satu angka "saldo" punya lima nama berbeda — RENDAH

**Persona dan use-case:** Saya mencari angka saldo, lalu menemukan label "Kas akhir", "Saldo", "Saldo akhir", "Saldo Akhir", dan "Saldo aman". Saya tidak yakin itu angka yang sama atau bukan.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`; catat label yang dipakai di hero, seksi 06, seksi 08, dan checklist hero.
2. Buka `#/dashboard`; catat label kartu ringkasan.
3. Buka `#/events`; catat label di tiap baris event.
4. Bandingkan semua dengan nilai `financeSummary(ev.id).saldo` yang sama.

**Harapan:** Satu konsep ("saldo") punya satu nama yang konsisten di seluruh aplikasi.

**Kenyataannya:** Angka `financeSummary(...).saldo` yang sama, yaitu `Rp 4.290.000` saat pengujian, ditampilkan dengan lima nama berbeda:
- hero Layar Kerja: **"Kas akhir"**, di dalam kalimat "2 dari 5 tahap selesai - Kas akhir Rp 4.290.000 - Dana cair ..."
- statcard seksi 06: **"Saldo"**
- seksi 08: **"Saldo akhir"**, muncul dua kali di "Bandingkan SPPD vs Realisasi vs Penjualan" dan "Rekap Penggunaan Uang"
- Dashboard: **"Saldo Akhir"**
- checklist hero: **"Saldo aman"**, dan yang ini memakai ikoncentang, bukan angka sama sekali

Satu istilah tambahan yang kadang membingungkan: di seksi 01, "Dana Cair" **hanya menghitung yang sudah berstatus `cair`** (`danaCair=1.500.000`), sedangkan `danaCairTotal=2.500.000` sehingga ada Rp 1.000.000 yang belum cair. Ini bukan bug perhitungan, tetapi penamaan yang menyesatkan, karena nominal yang belum cair tetap tampil sebagai baris dengan penanda hanya lewat dropdown status.

**Evidence:**
```
financeSummary(Rp 4.290.000) -> hero "Kas akhir", seksi 06 "Saldo", seksi 08 "Saldo akhir",
                                dashboard "Saldo Akhir", checklist "Saldo aman"
Dana Awal=Rp 2.500.000 | Dana Cair (cair saja)=Rp 1.500.000 | Dana Cair total=Rp 2.500.000
Dana Cair yang belum cair = Rp 1.000.000
```

**Dampak ke pengguna awam:** Lima nama untuk satu angka berarti dua detik tambahan untuk memutuskan "yang ini benar tidak?". Risiko nyatanya, pengguna menghitung ulang sendiri karena tidak percaya pada label yang berbeda-beda, dan itu justru menambah pekerjaan lambat yang tidak perlu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Samakan satu istilah di semua tempat, usulnya **"Saldo"** sebagai label utama dengan sublabel kontekstual bila perlu. Untuk "Dana Cair", bedakan secara tegas di tampilan: "Dana Cair (sudah masuk) Rp 1.500.000" dan "Belum Cair Rp 1.000.000", supaya tidak tertukar dengan "Dana Awal Rp 2.500.000".

---

### [BUG-10] Tidak ada pencarian global dan tidak ada jalan pintas untuk melihat saldo — RENDAH

**Persona dan use-case:** Saya mau cepat cek saldo tanpa harus ingat harus membuka halaman mana. Saya mencari kotak pencarian global atau tombol saldo. Keduanya tidak ada.

**Langkah reproduksi:**
1. Di `#/dashboard` dan `#/events/evt-1`, cari `input[type=search]` dan `input[placeholder*="Cari"]` (case-insensitive).
2. Hitung jumlah item navigasi di `topnav` dan `mobilenav`.
3. Cari apakah ada kontrol yang secara langsung membuka kartu saldo besar.

**Harapan:** Ada kotak pencarian global, atau tombol "Saldo" yang selalu terlihat.

**Kenyataannya:** `input[type=search]` berjumlah **0** dan `input[placeholder*="Cari"]` juga **0**. Yang ada hanyalah kolom "Cari kata" di halaman Arsip, dan ituJvarnsevarn untuk memfilter daftar event, bukan untuk mencari saldo. Navigasi punya 8 item (Dashboard, Event dan Tugas, Arsip, Produk, Master Barang, Rekap Global, Panduan, Pengaturan) dan **tidak ada satu pun** yang mengarah ke ringkasan saldo cepat. Jadi satu-satunya cara menjawab "berapa saldo saya" adalah membuka Dashboard, atau Event lalu menggulir, dan menggulir lagi. Tidak ada tombol yang melompat langsung ke angka saldo besar.

**Evidence:**
```
input[type=search]=0 | input[placeholder*=Cari]=0
nav_items=16 (8 link, muncul dua kali di topnav dan mobilenav)
TOTAL_KLIK_MINIMUM dari dashboard ke saldo evt-1 = 1
tapi jarak scroll ke angka saldo besar di Layar Kerja = 14,93 layar
```

**Dampak ke pengguna awam:** Jawaban cepat harus direkonstruksi setiap kali. Untuk orang yang membuka aplikasi 5 sampai 10 kali sehari, ini sangat mengganggu; untuk orang yang membukanya sekali, aplikasi ini terasa terlalu dalam.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan input pencarian global di header (cukup untuk	event, produk, dan saldo), dan satu tombol atau chip **"Saldo"** di header sticky yang langsung membuka ringkasan saldo seluruh event yang sedang berjalan. Ini mengubah pertanyaan "berapa saldo saya" dari satu klik dan 15 kali scroll menjadi satu klik tanpa scroll, atau bahkan terlihat permanen di header.

---

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Render sangat cepat.** Halaman terbesar (`eventDetail-kerja`, 69.743 karakter HTML, 8 seksi penuh) render dalam **9,8 ms** desktop dan **8,1 ms** viewport pendek (rata-rata 5 iterasi, `performance.now()` dikonfirmasi `Date.now()`). Halaman lain: dashboard 1,1 ms, daftar event 1,0 ms, Rekap Global 0,9 ms, panduan 0,2 ms, master barang 0,3 ms. `store.load()` hanya 0,7 ms. Ini sangat baik untuk vanilla JS tanpa build step.
- **Dashboard sudah memenuhi kebutuhan "5 detik".** Semua yang penting ada di lipatan atas: `Event Berjalan 3`, `Total Penjualan Rp 25.375.000`, `Total Pengeluaran Rp 11.435.000`, `Saldo Akhir Rp 36.415.000`, ditambah kartu event berjalan pertama yang menampilkan `Penjualan` dan `Saldo` per event (`Rp 4.290.000`) dengan progres `40%`. Chip header "3 event berjalan" juga informatif. Ini justru **halaman pertama yang paling tepat** untuk persona tidak sabar.
- **Jalur klik ke saldo event hanya 1 klik** dari Dashboard lewat kartu event. Tidak ada labirin. Yang perlu diperbaiki hanya *jarak scroll* di dalam Layar Kerja, bukan jumlah klik.
- **Angka besar benar-benar besar.** `.big-num` 56 px dan `.stat-num` 36 px dengan font monospace. Hierarki tipografinya sudah tepat untuk "angka yang harus langsung terbaca". Yang salah hanya *di mana* angka itu diletakkan, bukan *seberapa besar*.
- **`scroll-margin-top: 96px` pada `.psec`** (`css/styles.css:268`). Detail seperti ini jarang ada dan penting: saat pill flowbar melompat ke sebuah seksi, judul seksi tidak tertutup header sticky. Sudah saya uji: `target_top_doc=8591.3` dan pemanggilan `scrollIntoView` memang menghormati offset tersebut.
- **Klik ganda tidak menghasilkan dobel entry.** Saya menekan tombol "Catat Pengeluaran" tiga kali secepat mungkin: jumlah baris pengeluaran hanya bertambah **1** (dari 3 ke 4), saldo menjadi `Rp 4.470.000`, dan field ke-reset setelah simpan sehingga klik kedua ditolak validasi dengan toast error. Penjaga validasi `jumlah <= 0` bekerja.
- **Ada konfirmasi untuk aksi besar.** `event:delete` (menghapus event beserta seluruh datanya), `product:delete`, dan `master:catdel` memakai `ui.confirm()` dengan teks penjelas yang jelas. Modal hapus event ringkas (148 px), muat di layar, punya tombol Batal dan Hapus yang perbedaannya jelas, serta punya penanganan tombol Escape.
- **Checkbox utama di SPPD sudah diberi ukuran yang benar.** `spp-tampilreal` memakai kelas `w-4 h-4` (16 px). Jadi sudah ada standar internal yang bisa dipakai untuk menyeragamkan `checklist:toggle` dan `bring:toggle` yang masih 13 px.
- **Klik pada input, select, dan textarea tidak memicu aksi samping.** Ada pengaman di `app.js` yang mengembalikan lebih dulu kalau target adalah elemen formulir, jadi mengisi form sambil klik tidak menyebabkan efek samping.
- **Tidak ada `setTimeout` besar maupun XHR di jalur render utama.** Semua perhitungan lokal, tidak ada panggilan jaringan (kecuali Tailwind CDN dan Google Fonts di luar kendali aplikasi). Tidak ada "loading lambat" dari API.

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah "Dashboard adalah halaman pertama" sudah menjadi keputusan desain yang disepakati?** Kalau sudah, pertanyaannya untuk tim: mengapa Layar Kerja, yang justru tempat kerja harian, tidak punya ringkasan setara? Menurut saya Layar Kerja butuh minimal satu kartu saldo besar di bagian atas.
- **Label "Dana Cair" yang hanya menghitung status `cair`** perlu konfirmasi: apakah ini disengaja (hanya dana yang benar-benar masuk) atau menyesatkan? Kalau disengaja, sebaiknya dieksplisitkan di tampilan.
- **Apakah status lipatan seksi seharusnya disimpan?** Tidak ada jejak penyimpanan saat ini, kata kunci `closed` tidak pernah masuk ke localStorage. Kalau ini kelalaian, fitur ini mudah ditambahkan.
- **Simulasi mobile saya terbatas.** Edge headless tidak melakukan emulasi perangkat, sehingga ukuran 492x705 adalah "layar pendek", bukan HP 390 px. Temuan BUG-03, BUG-06, dan BUG-08 (flowbar 2,24 layar, target 13x13 px, modal 766 px) **perlu konfirmasi di perangkat nyata**; di HP kelas bawah kemungkinan hasilnya lebih parah.
- **Tailwind via CDN.** `index.html` memuat `https://cdn.tailwindcss.com` dan Google Fonts. Di jaringan lambat atau sinyal buruk, angka bisa muncul tanpa styling (misalnya field `#ex-jumlah` tanpa tinggi input). Saya tidak mengukurnya secara terpisah karena fokus tugas di tempat lain, tapi ini risiko nyata untuk persona tidak sabar dengan koneksi jelek, dan perlu konfirmasi apakah ada penanganan flash-of-unstyled-content.
- **Kedipan render ganda (BUG-07)** perlu konfirmasi apakah benar-benar terlihat kasatmata. Render ganda saya hitung secara deterministik lewat dua MutationObserver, tetapi kesan "flicker" sulit dinilai tanpa screenshot, dan brief menyatakan screenshot tidak bisa dibaca.
- **Satu numbers yang tidak saya klaim sebagai bug:** `ms_total=700` pada pengukuran navigasi. Nilai itu didominasi oleh polling dan settle virtual time di headless, bukan render sungguhan. Saya tidak menyimpulkan apa pun darinya.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Kecepatan render | 5 | Halaman terbesar 9,8 ms desktop dan 8,1 ms viewport pendek; storage 0,7 ms. Tidak ada loading lambat sama sekali. |
| Jalur klik menuju jawaban | 4 | Cukup 1 klik dari Dashboard ke event. Yang jadi masalah adalah jarak scroll di dalam Layar Kerja, bukan jumlah klik. |
| Visibilitas di halaman pertama (`#/dashboard`) | 5 | Semua angka kunci (Penjualan, Pengeluaran, Saldo Akhir, dan Saldo per event) ada di lipatan atas dengan font besar. Ini yang paling sempurna untuk persona ini. |
| Visibilitas di halaman kerja (`#/events/<id>`) | 2 | Saldo besar 14,9 sampai 18,6 layar di bawah; angka besar di layar pertama cuma "40%"; flowbar navigasi 1,7 sampai 2,2 layar di bawah; dokumen setinggi 22,5 sampai 28,7 layar. |
| Kepastian aksi (konfirmasi dan undo) | 2 | 28 dari 29 tombol hapus tanpa konfirmasi dan tanpa undo; toast berumur 3 detik. Aksi cepat berarti data hilang tanpa disadari. |
| Kemudahan sentuh (mobile) | 2 | 20 dari 139 kontrol di bawah 40 px; 24 ditambah 29 checkbox berukuran 13x13 px; lipatan seksi 26x26 px; pill lompat setinggi 28 px; modal form panjang meluber layar. |
| Kejelasan istilah | 3 | Lima nama berbeda untuk satu angka saldo, ditambah ambiguitas "Dana Cair" antara nilai sudah masuk dan total. |
| Rasa instan saat dipakai cepat | 3 | Render ganda pada setiap klik navigasi (BUG-07) dan toast yang menumpuk tanpa batas mengurangi rasa instan, meski secara angka tetap cepat. |
| **Rata-rata/bootstrap singkat** | **3,3** | Bagus di atas: Dashboard cepat dan jelas, render tetap cepat, klik ganda aman. Lemah di bawah lipatan halaman kerja, konfirmasi hapus, dan target sentuh, yaitu tiga hal yang paling menentukan apakah orang menyerah dalam 5 detik. |
