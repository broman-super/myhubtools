# AGENT-19 — Orang Sibuk

> **Persona:** PIC UMKM dengan sisa 10 menit sebelum acara, satu-satunya pertanyaan di kepalanya: "apa yang BELUM selesai?" · **Fokus:** progress tracking, checklist tersisa, deteksi "belum selesai" di semua halaman · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 5 |
| SEDANG | 5 |
| RENDAH | 2 |
| **Total** | **12** |

Kesimpulan jujur untuk persona saya: **SPPD Toolbox sangat rapi dalam menghitung, tapi tidak pernah menampilkan daftar
pekerjaan yang tersisa.** Seed default sebenarnya menyimpan **121 item yang belum selesai** (14 milestone + 89 item
checklist + 4 item persiapan belum dibawa + 13 item belum ditandai pulang + 1 sumber dana belum cair) — dan **nol**
dari angka itu muncul sebagai "tugas tersisa" di 9 halaman aplikasi. Yang tampil cuma **satu angka persentase besar**
yang dihitung dari 5 milestone saja. Untuk event `evt-1` angkanya **40%**, padahal checklist-nya sudah **63%**.

Yang lebih menyakitkan: **fitur yang saya cari itu sudah ada di kodenya, tapi mati.** `pages.js:364` merender panel
"Belum lengkap" persis yang saya butuhkan, tapi tidak ada satu pun route yang membukanya — `TABS` hanya berisi satu tab
`kerja`, dan semua tab legacy dipaksa diarahkan ke `kerja`. Jadi ini bukan fitur yang belum pernah dipikirkan; ini
fitur yang **jalannya terputus**.

Tidak ada temuan KRITIS: tidak ada data yang hilang dan tidak ada jalan buntu total. Semua tugas tetap bisa dikerjakan,
hanya tidak tersusun menjadi daftar yang bisa saya eksekusi dalam 10 menit.

## Environment yang dipakai

- Edge headless: `msedge.exe --headless=new --disable-gpu --no-sandbox --virtual-time-budget=12000 --dump-dom`
- Profil unik per run: `%TEMP%\prof_a19busy` dan `%TEMP%\prof_a19busy2`, keduanya dihapus sebelum dijalankan
- `localStorage.clear()` + `localStorage.removeItem('sppd_toolbox_db_v1')` di dalam `<head>`, **sebelum** `js/store.js`
  dimuat → ujinya benar-benar memakai seed default (9 event, 24 template checklist, 4 wallet)
- Harness: `_QA_TMP/a19_busy.html` (tes statis + 1 klik nyata) dan `_QA_TMP/a19_busy2.html` (dashboard, lipatan seksi,
  biaya klik, cetak). Semua file harness sudah dihapus setelah selesai.
- Rute yang diuji: `#/events/evt-1` dengan router sungguhan, `#/events/evt-2`, plus render langsung
  `SPT.pages.dashboard / eventsList / archive / products / reports / guide / settings / master` dan `SPT.printHTML()`
- Tanggal "hari ini" di environment: **2026-10-01** — penting untuk semua hitungan tenggat

## Temuan

### [BUG-01] Angka besar "Progres persiapan" hanya menghitung 5 milestone, bukan pekerjaan sebenarnya — TINGGI

**Persona dan use-case:** Saya buka `index.html#/events/evt-1` (Pameran UMKM, 22–25 Apr 2026). Saya butuh tahu dalam
satu detik: "berapa persen beres?". Di hero sudah tertulis **40%**.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` dengan seed default.
2. Baca angka besar di hero "Progres persiapan" beserta sub-teksnya: `2 dari 5 tahap selesai`.
3. Buka blok "Cek Persiapan" tepat di bawahnya: `15 / 24 selesai`.
4. Buka seksi 04 Item Persiapan: 1 dari 3 item belum ditandai "dibawa".
5. Buka seksi 01 Dana Cair: 1 dari 2 sumber dana masih `belum`.
6. Buka seksi 07: muncul dua daftar kekurangan (`Ada item persiapan belum ditandai dibawa`,
   `Ada item persiapan belum ditandai dibawa pulang`).

**Harapan:** Angka besar itu menyatukan semua yang belum selesai, atau minimal ada daftar tugas di bawahnya.

**Kenyataannya:** Angka besar = `msDone / ms.length` saja (`pages2.js:291`). Checklist 24 item — justru pekerjaan
harian PIC — tidak masuk hitungan sama sekali, dan tidak ada blok yang menggabungkan semuanya.

**Evidence:**

```
evt-1   hero= 40% (ms 2/5)   cek 15/24 = 63%   selisih 23 poin
evt-3   hero=  0% (ms 0/0)   cek 24/24 = 100%  selisih 100 poin
ev-d2   hero= 20% (ms 1/5)   cek 12/24 = 50%   selisih 30 poin
ev-d4   hero= 25% (ms 1/4)   cek 15/24 = 63%   selisih 38 poin
ev-d5   hero= 80% (ms 4/5)   cek 20/24 = 83%   selisih 3 poin
GRAND TOTAL item belum selesai di seed = 121  -> angka ini tidak pernah tampil di UI
```

`evt-3` (Bazar Ramadan, status **selesai**) menampilkan **0%** karena tidak punya milestone sama sekali, padahal
checklist-nya **24/24 tuntas**. Jadi bahkan 0% pun tidak berarti "belum mulai".

**Dampak ke pengguna awam:** Saya menutup laptop karena melihat "40%" padahal masih ada 9 centang checklist, 1 item
barang, 1 dana yang belum cair, dan 3 barang yang belum ditandai pulang. Kalau saya melapor ke atasan dengan angka
40%, saya salah prediksi. Sebaliknya, bila saya menghabiskan 5-6 jam menyelesaikan checklist tanpa melihat perubahan
angka, saya akan menyangka hampir selesai. Keduanya sama-sama berbahaya untuk atasan yang memutuskan dari satu layar.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** jadikan checklist "Cek Persiapan" penyusun persentase
utama, atau beri bobot berimbang (milestone 30% + checklist 40% + item persiapan 15% + dana cair 15%). Tampilkan dua
angka berdampingan: "40% tahap · 63% cek persiapan". Kalau status event sudah `selesai` tapi angka di bawah 100%,
tampilkan badge peringatan, jangan diam.

---

### [BUG-02] Panel "Belum lengkap" — fitur yang sudah dikode tapi tidak bisa dibuka user — TINGGI

Ini temuan yang paling saya pedulikan. Panel yang saya cari **ada di `pages.js`, sudah ditulis lengkap dengan
petunjuk tindakan, dan tidak pernah dirender**.

**Persona dan use-case:** Saya butuh satu kartu berisi daftar: "3 milestone belum selesai — lengkapi di seksi 02".

**Langkah reproduksi:**
1. Buka `#/events/evt-1/ringkasan` — route yang masih dipakai Panduan di dalam aplikasi.
2. Buka `#/events/evt-1/roadmap` — route yang masih diklaim jadi "permukaan utama" di footer `index.html`.
3. Klik seluruh menu dan sub-menu yang ada di header.

**Harapan:** Route `#/events/<id>/ringkasan` menampilkan kartu "Belum lengkap" berisi semua kekurangan.

**Kenyataannya:** `pages.js:174` — `var TABS = [{ key: 'kerja', label: 'Layar Kerja' }]`. Semua tab lain dipetakan ke
`'kerja'` pada `LEGACY`. `eventDetail` (`pages.js:200-204`) hanya bisa memanggil `A.pages2.kerja`. Fungsi
`tabRingkasan` dan `tabRoadmap` diekspor di `pages.js:604-605` tetapi **tidak pernah dipanggil siapa pun** di seluruh
aplikasi.

**Evidence:**

```
SPT.pages.tabRingkasan = function        <- fungsi ADA di kode
SPT.pages.tabRoadmap   = function        <- fungsi ADA di kode
route /ringkasan -> mengandung "Belum lengkap"? false
route /ringkasan identik dengan /kerja?   true      <- HTML yang sama persis
route /roadmap  -> mengandung "roadmap-phase"? false
jumlah "Belum lengkap" di DOM nyata (#app): 0
isi kalau dipaksa render:
  "Belum lengkap ● 3 milestone belum selesai — Lengkapi di seksi 02 Jadwal."
```

Pencarian keyword ke **9 halaman** (dashboard, daftar event, arsip, produk, laporan, panduan, pengaturan, master,
layar kerja):

```
"Belum lengkap"    -> TIDAK ADA di 9 halaman
"Sisa pekerjaan"   -> TIDAK ADA
"MASIH harus"      -> TIDAK ADA
"Belum dikerjakan" -> TIDAK ADA
"Prioritas"        -> TIDAK ADA
"Mendesak"         -> TIDAK ADA
"Terlambat"        -> TIDAK ADA
"Terpenting"       -> TIDAK ADA
Teks Layar Kerja = 11.628 karakter; memuat "belum selesai"? false | "tinggal"? false | "jangan lupa"? false
```

**Dampak ke pengguna awam:** Persis fitur yang dibutuhkan orang terburu-buru sudah ada, tapi terkubur. Rekan saya yang
non-teknis akan dihajar atasan karena dianggap tidak bisa memakai aplikasi, padahal memang tidak ada jalan masuk ke
fitur tersebut.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** pasang kembali `tabRingkasan`, atau lebih sederhana pindahkan
blok "Belum lengkap" (yang tinggal dipindah) ke dalam `ckSection()` di `tabKerja` (`pages2.js:359`) sebagai kartu
**pertama** di Layar Kerja, di atas hero. Tambahkan tombol kecil "sembunyikan yang sudah beres" supaya daftar hanya
memuat sisa.

---

### [BUG-03] Dashboard menyorot event yang sudah lewat 159 hari; tidak ada urutan prioritas — TINGGI

**Persona dan use-case:** Saya buka aplikasi pagi hari, tujuh hari sebelum event "Kunjungan Mitra Sektor"
(6–8 Okt 2026). Saya mau tahu event mana yang paling gawat.

**Langkah reproduksi:**
1. Buka `#/dashboard`.
2. Baca panel kanan "Progress / Sedang berjalan".
3. Bandingkan dengan tiga event berstatus `berjalan`.

**Harapan:** Event yang paling dekat dengan tanggal selesai, atau yang paling banyak kekurangannya.

**Kenyataannya:** Panel "Sedang berjalan" mengambil **event pertama yang punya milestone berstatus `aktif`** dalam urutan
seed (`pages.js:50-52`), yaitu `evt-1` yang `tanggalSelesai`-nya **2026-04-25** — sudah **159 hari lalu**. Tidak ada
perhitungan sisa hari, tidak ada pengurutan, tidak ada penanda tenggat.

**Evidence:**

```
panel "Sedang berjalan" menunjuk ke: Pameran UMKM Nusantara Expo 2026
  [2026-04-22 -> 2026-04-25] tahap="Event H-1" | 159 HARI lewat dari tanggal selesai

event berstatus "berjalan" = 3:
  - Pameran UMKM Nusantara Expo 2026   selesai 2026-04-25 (lewat 159 hari) kurang=12
  - Expo Produk Lokal 2026              selesai 2026-09-17 (lewat  14 hari) kurang=12
  - Kunjungan Mitra Sektor              selesai 2026-10-08 (7 HARI LAGI)   kurang=12

Teks "hari lagi" / "hari tersisa" / "terlambat" / "deadline" / "tenggat" / "segera" / "due"
  di dashboard + daftar event + layar kerja + arsip  =  0 (nol dari semuanya)
```

Urutan `#/events` juga ascending berdasarkan tanggal mulai, sehingga yang paling mendesak ada di baris paling bawah:

```
#1 2026-03-02 selesai    Bazar Ramadan Ceria 2026
#2 2026-04-22 berjalan   Pameran UMKM Nusantara Expo 2026
#3 2026-05-16 draft      Gelar UMKM Kota 2026
#4 2026-07-21 draft      Sosialisasi UMKM Kota
#5 2026-08-10 diajukan   Festival Kerajinan Nusantara
#6 2026-09-14 berjalan   Expo Produk Lokal 2026
#7 2026-10-06 berjalan   Kunjungan Mitra Sektor        <- paling dekat, baris 7 dari 9
#8 2026-11-12 disetujui  Dukungan Booth UMKM Regional
#9 2026-12-01 selesai    Pekan Inovasi Daerah
```

Field event: `id,userId,nama,jenis,lokasi,tanggalMulai,tanggalSelesai,status,peranPic,catatan,createdAt,updatedAt` —
tidak ada `prioritas` atau `urgent`. Field milestone juga sama: `id,eventId,judul,tanggal,status,urutan,catatan,attachments`
— tidak ada `prioritas`, `urgent`, `penting`, `darurat`, atau `flag`.

**Dampak ke pengguna awam:** Saya hampir salah ingat event mana yang mendesak. Tujuh hari sebelum acara saya menyibukkan diri
mengurus event yang sudah selesai lima bulan lalu. Untuk UMKM yang biasanya cuma punya satu tugas aktif, bug ini
tidak terlihat — justru muncul di hari paling sibuk.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** urutkan event berstatus `berjalan` berdasarkan
`tanggalSelesai` terdekat lebih dulu, tambahkan badge "H-7" atau "lewat 159 hari", dan sorot kartu dengan
jumlah item tersisa terbanyak. Warnai merah bila `tanggalSelesai < today` sementara status masih `berjalan`.

---

### [BUG-04] Hapus satu milestone tanpa konfirmasi → persentase naik sendiri — TINGGI

**Persona dan use-case:** Saya terburu-buru, salah klik `✕` di baris milestone. Tidak ada konfirmasi, tidak ada undo.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, seksi 02 "Jadwal & Milestone".
2. Klik `✕` pada baris milestone "Event H-1" (status `aktif`).
3. Lihat angka besar di hero.

**Harapan:** Ada dialog "Hapus milestone?" dan persentase tidak berubah sendiri.

**Kenyataannya:** `actions.js:275-279` langsung memanggil `deleteMilestone`, lalu toast, lalu reload. **Tidak ada
`ui.confirm` dan tidak ada undo.** Karena penyebutnya persentase, menghapus tahap yang belum selesai membuat angka
**naik**.

**Evidence:**

```
sebelum: 40% (2/5)  ->  hapus milestone "Event H-1"  ->  50% (2/4)
kena naik 10 poin tanpa mengerjakan apa pun
isi #modal-root setelah diklik = ""   (kosong, tidak ada dialog sama sekali)
```

Bandingkan dengan aksi hapus lain: `event:delete`, `product:delete`, `master:catdel`, `data:reset` **memakai**
`ui.confirm`. Yang **tidak** memakai konfirmasi: `transport:delete`, `milestone:delete`, `milestone:att:delete`,
`kasadj:delete`, `danaCair:delete`, `budget:delete`, `prepitem:delete`, `sale:delete`, `expense:delete` — sembilan
dari tiga belas aksi hapus berjalan tanpa konfirmasi.

Catatan tambahan: `ensureDefaultMilestones` (`store.js:488`) hanya menambah milestone kembali bila jumlahnya **nol**.
Jadi menghapus satu dari lima berarti hilang permanen; menghapus kelima berarti lima muncul lagi dengan tanggal kosong
ketika halaman dibuka berikutnya. Perilaku ini tidak konsisten dan tidak dijelaskan ke pengguna.

**Dampak ke pengguna awam:** Salah klik → angka progres naik → saya melapor "sudah 50%" padahal tahap inti (Event H-1)
hilang dari daftar, dan tidak ada cara memulihkannya tanpa mengetik ulang. Ini pola "salah input tanpa sadar" yang
paling merusak untuk orang yang sedang buru-buru.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** bungkus `milestone:delete` dengan `ui.confirm` yang
menyebut dampaknya secara eksplisit ("Hapus tahap 'Event H-1'? Persentase akan naik menjadi 50%."), dan sediakan satu
tombol **UNDO** di dalam toast selama sekitar 8 detik. Memperbaiki sekaligus masalah "tidak bisa dibatalkan" tanpa
menambah layar.

---

### [BUG-05] Event berstatus "Selesai" dan 100% padahal 3 aset belum ditandai pulang — TINGGI

**Persona dan use-case:** Di `#/events`, baris "Pekan Inovasi Daerah" (`ev-d6`) menampilkan badge **Selesai** dan
progress **100%**. Saya audit cepat lalu siap serah terima.

**Langkah reproduksi:**
1. Buka `#/events`, cari baris "Pekan Inovasi Daerah".
2. Bandingkan tiga angka: status `selesai`, progress `100%`, checklist `24/24`.
3. Buka `#/events/ev-d6` dan baca blok cek di hero.

**Harapan:** Kalau masih ada aset yang belum ditandai pulang, statusnya belum layak `Selesai` dan belum layak 100%.

**Kenyataannya:** Hero menunjukkan 5 dari 6 cek hijau dan satu merah, tapi angka besarnya tetap **100%** dan badge-nya
tetap **Selesai**. Daftar event tidak menampilkan peringatan itu sama sekali.

**Evidence:**

```
ev-d6  status=selesai   hero=100%  cek=24/24 | item belum dibawa pulang = 3
       hero-checks: [ok] SPPD lengkap [ok] Produk dicatat [ok] Item persiapan dibawa
                    [ok] Saldo aman [ok] Siap berangkat [no] Pulang tuntas
       -> 5 hijau, 1 merah, angka besar tetap 100%
ev-d5  status=disetujui hero=80%   cek=20/24 | belum pulang = 2
evt-3  status=selesai   hero=  0%  cek=24/24 | belum pulang = 0
       hero-checks: [ok] SPPD lengkap [no] Produk dicatat [ok] Item persiapan dibawa [ok] Saldo aman
```

Perhatikan `evt-3`: badge **Selesai**, checklist **24/24**, tetapi hero **0%** karena tidak punya milestone (`0/0`).
Angka besar dan badge saling bertentangan di layar yang sama.

**Dampak ke pengguna awam:** Kalau saya print dan tanda tangan berdasarkan daftar event, saya sedang menyatakan tiga
barang aset selesai padahal belum saya lihat lagi. Untuk UMKM kecil, barang seperti kabel, tenda, dan laptop punya
nilai nyata. Ini "hasil salah diam-diam".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** jadikan `store.pulangOk()` dan `checklistDone() == 24`
sebagai syarat untuk menyimpan status `Selesai`, dengan pesan "Masih ada 3 aset belum ditandai pulang". Tampilkan badge
"Selesai · perlu cek 3 aset" di daftar event. Untuk event `0/0` milestone, tampilkan `—` atau `100% (24/24 cek)`,
bukan `0%`.

---

### [BUG-06] Checklist 24 item: tidak ada filter "yang belum", tidak ada aksi massal — SEDANG

**Persona dan use-case:** Sisa `evt-1` adalah **9 item checklist** (posisi 16 sampai 24). Saya harus melewati
**15 item yang sudah selesai** lebih dulu.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, blok "Cek Persiapan" berisi empat kategori: Dokumen, Logistik, Keberangkatan, Laporan.
2. Geser melewati seluruh item teratas.
3. Cari kontrol apa pun untuk menyaring atau menandai banyak sekaligus.

**Harapan:** Ada "Sembunyikan yang sudah selesai (15)" dan/atau "Tandai semua yang sudah beres".

**Kenyataannya:** Dua puluh empat checkbox memang bisa ditandai dengan satu klik (itu bagus), tapi urutannya mengikuti
template asli dan **item selesai selalu tampil lebih dulu** karena seed menandai 15 item awal sebagai `selesai`. Tidak
ada filter, tidak ada aksi massal, dan tidak ada cara melewati tahap.

**Evidence:**

```
posisi status evt-1 (x=selesai, .=belum) menurut urutan template 1..24:
  xxxxxxxxxxxxxxx.........
item BELUM selesai yang pertama ada di posisi ke-16
kontrol "sembunyikan yang selesai" / filter  = TIDAK ADA
tombol "tandai semua yang beres"            = TIDAK ADA
tombol "lewati tahap ini" di seksi 02      = TIDAK ADA
aksi yang menyentuh checklist di seluruh aplikasi = ["checklist:toggle"]   (cuma satu)
```

Jumlah aksi unik di Layar Kerja = 36, termasuk 24 `checklist:toggle`, 5 `select[data-action="milestone:set"]`, dan
2 `select[data-action="danaCair:status"]`.

**Dampak ke pengguna awam:** Lima belas baris selesai menutupi sembilan baris yang penting. Di HP itu kira-kira tiga
layar scroll sebelum menemukan tugas sebenarnya. Efeknya saya cenderung mencentang asal agar "%" bergerak, lalu lupa
tugas aslinya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** ubah pengurutan render agar status `todo` tampil di atas
(di `store.js:678` atau saat render di `pages2.js:366`), tambahkan sakelar "Sembunyikan yang sudah selesai (15)",
tambahkan "Tandai semua di kategori ini selesai" per kartu kategori, dan ubah teks ringkasan dari `15 / 24 selesai`
menjadi **"9 belum selesai"** ketika angka belum lebih besar.

---

### [BUG-07] Tanggal milestone yang sudah ada tidak bisa diedit; 21 klik untuk menuntaskan satu event — SEDANG

**Persona dan use-case:** Jadwal berubah dan informasi booth geser ke jam 09.00. Saya ingin mengubah tanggal di tempat.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, seksi 02.
2. Cari kolom tanggal di baris milestone mana pun.
3. Klik baris "Laporan" yang teksnya `tanpa tanggal`.

**Harapan:** Tanggal bisa diklik dan diedit langsung di baris itu.

**Kenyataannya:** Satu-satunya `<input type="date">` di seksi 02 adalah milik form **Tambah Milestone** (`id=mil-tgl`).
Baris milestone yang sudah ada hanya menampilkan teks, satu `<select>` status, tombol `+ Dokumen`, dan tombol `✕`.
Tidak ada `milestone:edit` di seluruh aplikasi. Milestone "Laporan" juga lahir tanpa tanggal dan **tidak bisa diisi
dari UI**.

**Evidence:**

```
input[type=date] di seksi 02 = 1  (hanya form tambah: id=mil-tgl)
tombol edit milestone yang sudah ada = 0
milestone evt-1 tanpa tanggal = ["Laporan"]   <- tidak bisa diperbaiki dari UI
field milestone = id,eventId,judul,tanggal,status,urutan,catatan,attachments
filter field untuk prioritas/urgent/penting/darurat/flag = [] (tidak ada)
```

Biaya menuntaskan `evt-1` dengan cara yang tersedia sekarang:

```
sisa evt-1: milestone belum     = 3  -> 2 klik masing-masing (buka <select> + pilih "Selesai") = 6 klik
            checklist belum     = 9  -> 1 klik masing-masing                                 = 9 klik
            item belum dibawa   = 1                                                       = 1 klik
            item belum pulang   = 3                                                       = 3 klik
            dana belum cair     = 1  -> 2 klik (buka <select> + pilih "Cair")               = 2 klik
TOTAL interaksi minimum untuk menuntaskan evt-1 = 21 klik
Dengan tombol "tandai semua yang beres" idealnya  = 2 klik
```

Ada inkonsistensi affordance: sebagian "tandai selesai" satu klik (checkbox checklist, checkbox item dibawa, checkbox
item pulang), sebagian dua klik (`<select>` milestone dan Dana Cair).

**Dampak ke pengguna awam:** 21 klik ditambah 15 baris yang harus dilewati plus halaman setinggi 21 layar. Di sela 10
menit, saya akan menyerah dan mencentang beberapa checkbox asal-asalan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** ganti `<select>` status milestone dengan tombol centang
satu klik `milestone:done` plus opsi lanjutannya di menu, jadikan tanggal sebagai `<input type="date">` inline yang
menyimpan saat `change`, dan tambahkan tombol "Tandai tahap ini selesai" di tiap baris.

---

### [BUG-08] Tidak ada indikator "tersimpan"; 26 aksi menulis tanpa feedback — SEDANG

**Persona dan use-case:** Saya mencentang lima checkbox beruntun, lalu internet di booth padan. "Ini sudah kesimpan
belum ya?"

**Langkah reproduksi:**
1. Centang satu item di "Cek Persiapan".
2. Centang satu checkbox "dibawa" di seksi 04.
3. Ubah status Dana Cair di seksi 01.
4. Perhatikan apa pun yang berubah di layar.

**Harapan:** Toast "Tersimpan", atau indikator permanen "Tersimpan 10:42" di header atau footer.

**Kenyataannya:** Ketiga aksi itu **diam-diam** menulis ke `localStorage` lalu membangun ulang seluruh halaman, tanpa
toast apa pun. Tidak ada teks "Tersimpan", "Autosave", atau "disimpan otomatis" di mana pun, tidak ada jam simpan, dan
tidak ada undo.

**Evidence:**

```
key localStorage = ["sppd_toolbox_db_v2"]     (satu saja)
key level-atas DB = ["events","sppd","transports","products","eventProducts","sales","expenses",
                     "milestones","kasAdj","danaCair","prepItems","settings",
                     "checklistTemplates","checklistItems","itemCats","itemTemplates"]
field "terakhir disimpan" / lastSaved di DB = []
teks "Tersimpan" / "terakhir disimpan" / "Autosave" / "disimpan otomatis" di Layar Kerja = 0 / 0 / 0 / 0

26 dari 65 action tidak memunculkan toast:
  nav:go, nav:mobile, tab:goto, events:filter, archive:set, event:new, event:edit, modal:close, modal:ok,
  transport:mode, bring:toggle, bring:qty, bring:remove, milestone:set, milestone:att:add,
  danaCair:status, budget:katmode, prepitem:setstatus, prepitem:done, prepitem:pulang,
  checklist:toggle, product:new, product:edit, scroll:to, psec:toggle, report:event
  -> termasuk checklist:toggle (24 item), prepitem:done, prepitem:pulang, milestone:set, danaCair:status
   -> jadi semua aksi "menandai selesai" yang paling sering dipakai justru senyap
action undo/redo = []  (tidak ada)
```

Yang **tidak** hilang: posisi scroll tetap (3000 menjadi 3000 setelah satu klik) dan checkbox tetap tercentang setelah
halaman dibangun ulang. Yang hilang hanya fokus keyboard — `document.activeElement` menjadi `BODY` setiap kali satu
checkbox dicentang.

**Dampak ke pengguna awam:** Tidak ada cara memastikan apakah data aman. Saya akan reload tiga kali hanya untuk
memastikan, atau lebih buruk, menekan F5 berulang sambil berharap. Bagi orang yang sudah 10 menit, ini sumber stres
nomor satu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** tampilkan badge permanen di header
`Tersimpan 10:42:11`, di-update dari fungsi `save()` yang sudah ada di `store.js:327` (cukup menulis ke satu elemen
DOM). Beri toast singkat non-blocking untuk `checklist:toggle`, `prepitem:done`, `prepitem:pulang`, `milestone:set`,
dan `danaCair:status`, serta jadikan pesan "Gagal menyimpan ke localStorage" yang sudah ada menjadi toast merah
permanen dengan tombol unduh backup.

---

### [BUG-09] Hasil cetak tidak memuat snapshot status — orang lain tidak tahu sampai mana — SEDANG

**Persona dan use-case:** Saya print laporan dan serahkan ke bendahara. Dia perlu tahu **status persiapan** pada saat
dicetak.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, klik "Cetak SPPD" di hero, lalu "Buka & Cetak".
2. Periksa isi laporan yang dihasilkan, lewat `SPT.printHTML()`.

**Harapan:** Laporan tercetak memuat tanda centang 24 checklist, status tahap, dan status item aset.

**Kenyataannya:** Yang dicetak murni laporan **keuangan**. Semua data status — justru yang paling ingin dilihat orang
lain — tidak ikut. Selain itu tidak ada kolom "Dicetak oleh" maupun tanggal dan jam cetak.

**Evidence:**

```
panjang printHTML = 4.896 karakter, 7 judul bagian:
  Event / SPPD / Transportasi / Pengeluaran Lain / Arus Kas per Wallet /
  Anggaran vs Realisasi per Komponen / Alokasi per Wallet Tujuan

24 nama item checklist muncul di cetak = 0/24
kata "checklist" = 0 | "milestone" = 0 | "tahap" = 0 | "status" = 0
3 item persiapan evt-1 muncul di cetak = 0/3
"Transfer instansi" (rincian sumber dana cair) = false
tanggal dan jam cetak = false | kata "dicetak" = 0 | "Dicetak oleh" = false
yang tersedia: nama PIC lewat baris "Mengetahui ______________" (1 kali) dan settings.nama
```

**Dampak ke pengguna awam:** Bendahara atau atasan menerima kertas angka tanpa tahu apakah laporannya berasal dari
event yang sudah 40% atau yang sudah 100%. Justru di detik paling sibuk, orang yang menggantikan saya tidak bisa
tahu posisi saya tanpa membuka browser saya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** tambahkan satu halaman pertama berjudul "Ringkasan Status
Persiapan" berisi nama event, tanggal dan jam cetak, nama PIC, enam cek hero, tabel 24 checklist dengan tanda centang,
status lima tahap, dan tabel item aset dibawa atau pulang. Tempel di atas laporan keuangan yang sekarang.

---

### [BUG-10] Tidak ada "lanjutkan terakhir" maupun "langkah berikutnya" — SEDANG

**Persona dan use-case:** Besok saya buka lagi dan ingin langsung menyambung ke tempat saya berhenti.

**Langkah reproduksi:**
1. Tutup tab atau browser.
2. Buka `index.html` tanpa mengetik hash.
3. Lihat halaman pertama yang muncul.

**Harapan:** Kembali ke event terakhir beserta posisi terakhir.

**Kenyataannya:** `app.js:48` — `var h = location.hash || '#/dashboard'`. Membuka file polos selalu mendarat di
**Dashboard**, bukan event saya. Tidak ada key localStorage untuk menyimpan halaman atau posisi terakhir, tidak ada
tombol "Lanjutkan", dan tidak ada tautan "Lanjut ke langkah berikutnya".

**Evidence:**

```
tidak ada key localStorage untuk halaman terakhir: ["sppd_toolbox_db_v2"]  (1 key, isinya hanya data)
tombol "Lanjutkan / terakhir diklik / kembali ke kerja / sambung lagi" di dashboard = TIDAK ADA
tautan "berikutnya / selanjutnya / next / lanjut ke" di Layar Kerja               = TIDAK ADA
flow-pill Alur Kerja = ["01 SPPD","02 Jadwal","03 Produk","04 Item","05 Penjualan","06 Kas","07 Pulang","08 Laporan"]
  -> lompat ke SEKSI, bukan ke ITEM yang belum dikerjakan
```

Yang sudah ada dan sangat membantu: panel "Sedang berjalan" di dashboard menyebut nama event dan tahap aktif
(`Tahap aktif: Event H-1`). Jadi, separuh jalan sudah ada — tinggal ditambah tombol "Lanjut kerjakan" yang langsung
membawa ke item checklist pertama yang belum tercentang.

**Dampak ke pengguna awam:** Saya harus mengingat event mana, membuka daftar event, mencari barisnya di antara sembilan
event (urutan ascending, lihat BUG-03), lalu menggulir ke blok checklist dan menggulir lagi sampai item ke-16. Untuk
pekerjaan 10 menit, satu sampai dua menit terbuang.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** simpan `lastEventId` dan `lastAnchor` ke localStorage tiap
kali render, lalu tampilkan di atas dashboard: "Terakhir dikerjakan: Pameran UMKM · 9 checklist tersisa ·
[Lanjut sekarang]", yang langsung menggulir ke checkbox pertama yang belum tercentang.

---

### [BUG-11] Lipatan seksi tidak tersimpan, dan pill "Alur Kerja" mendarat di seksi tertutup — RENDAH

**Persona dan use-case:** Saya melipat enam dari delapan seksi supaya muat di layar, lalu klik pill "05 Penjualan"
karena mau mencatat penjualan cepat.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Klik tombol lipatan `▾` pada seksi 05.
3. Klik pill `05 Penjualan` di bar "Alur Kerja".
4. Muat ulang halaman (F5).

**Harapan:** Pill membuka atau menavigasi ke isi seksi, dan posisi lipatan bertahan setelah muat ulang.

**Kenyataannya:** Pill hanya memanggil `scrollIntoView` (`actions.js:562`). Kalau seksi tertutup, saya mendarat di
**batang lipatan setinggi 48px** — isinya tidak terlihat. Setelah muat ulang, kedelapan seksi terbuka lagi di halaman
setinggi 15.457px.

**Evidence:**

```
jumlah seksi = 8 | class awal: ps-1 sampai ps-8 semuanya open
tinggi dokumen = 15457px  -> 21 layar scroll (asumsi layar 720px)
jumlah section = 8, jumlah kartu = 47
setelah klik lipatan ps-5: class="psec closed", tinggi = 48px
pill "05 Penjualan" diklik -> posisi ps-5 = 8265, tinggi tetap 48px
  => pill sia-sia; perlu klik lipatan kedua kali
setelah reload: ps-5 class = "psec"  -> state lipatan TIDAK disimpan
```

**Dampak ke pengguna awam:** Bukan penghalang, tetapi membuat saya menghabiskan lima sampai sepuluh detik menebak-nebak
kenapa klik tidak menampilkan apa-apa. Di halaman setinggi 21 layar, tombol lipatan justru fitur yang paling saya
andalkan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** di `scroll:to`, periksa apakah target punya kelas
`closed`, lalu buka dulu sebelum menggulir; simpan daftar seksi tertutup di localStorage agar tetap utuh setelah
muat ulang.

---

### [BUG-12] Tidak ada pencarian cepat; pencarian di Arsip tidak jalan tanpa klik "Terapkan" — RENDAH

**Persona dan use-case:** Saya menghabiskan sepuluh menit Googling, hanya ingin tahu satu hal: "dana transfer sudah masuk
belum?"

**Langkah reproduksi:**
1. Gunakan Ctrl+F browser di halaman setinggi 15.457px — tidak ada yang cocok, karena isi halaman dirender ulang
   lewat `<select>` dan tabel dinamis.
2. Buka `#/archive`, ketik sebuah kata di kotak "Cari kata".
3. Tekan Enter.
4. Klik tombol "Terapkan".

**Harapan:** Ada kotak pencarian di Layar Kerja, atau Enter langsung memfilter.

**Kenyataannya:** Nol `input[type=search]` di Layar Kerja; isinya 21 elemen `<select>` yang seluruhnya berisi status.
Yang ada hanya di Arsip, dan input `id="ar-q"` **tidak punya atribut `data-action`**, sehingga harus menekan tombol
"Terapkan". `app.js` hanya mendaftarkan listener `click`, `change`, dan `hashchange`; tidak ada listener `keydown`
untuk Enter di luar modal.

**Evidence:**

```
input[type=search] di Layar Kerja = 0
total <select> di Layar Kerja     = 21   (semuanya status, bukan teks)
Arsip: input id=ar-q ada? true | punya data-action? TIDAK -> harus klik "Terapkan"
shortcut Ctrl/Cmd+K = TIDAK ADA
panjang Panduan = 6.192 karakter teks
```

**Dampak ke pengguna awam:** Saya berakhir di pencarian Google, bukan di aplikasi. Persis skenario "sepuluh menit
 Googling". Tidak ada data yang hilang, tetapi waktu habis.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** satu kotak "Cari cepat" yang tetap di header, mencari
lintas sembilan halaman (nama event, item produk, milestone, catatan, transaksi), dipicu `Ctrl/Cmd+K`; dan tambahkan
listener `keydown` Enter untuk `ar-q` supaya tidak perlu menekan tombol.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Checklist 24 item memakai checkbox asli dan bisa ditandai satu klik.** `checklist:toggle` langsung menyimpan ke
  `localStorage`, lalu teksnya berubah jadi `line-through` dan meredup. Ini affordance "satu klik berarti selesai" yang
  benar, dan seharusnya jadi pola untuk milestone serta Dana Cair (BUG-07).
- **Seksi 07 "Audit Aset Berangkat & Pulang" justru punya daftar kekurangan yang persis seperti yang saya cari**, tapi
  hanya di satu tempat: `Ada item persiapan belum ditandai dibawa`, `Ada item persiapan belum ditandai dibawa pulang`,
  dan `Produk ada yang oversold / kehilangan`. Pola `missB[]` dan `missP[]` (`pages2.js:661-678`) layak diangkat ke atas
  hero untuk seluruh aplikasi, bukan hanya seksi 07.
- **Angka absolut selalu tampil berdampingan dengan persentase**: hero menulis "2 dari 5 tahap selesai", bukan hanya
  "40%". Ini sangat membantu — hanya basis perhitungannya yang salah pilih (BUG-01).
- **Blok Dana Cair jujur** membedakan status `cair` dan `belum` dengan badge, menampilkan total "sudah cair X / Y",
  dan secara eksplisit dibedakan dari "alokasi".
- **`store.save()` sudah menangkap kegagalan penyimpanan** dan menampilkan toast "Gagal menyimpan ke localStorage"
  (`store.js:330-331`). Jangan dihapus saat refactor.
- **Validasi stok penjualan ketat**: `sale:add` menolak kuantitas melebihi sisa dengan pesan
  "Stok tidak cukup — sisa N. Qty > sisa (dibawa − terjual − rusak)", jadi tidak ada oversold diam-diam.
- **Bar "Alur Kerja" delapan pill** plus tombol lipatan per seksi: pola navigasi yang tepat untuk halaman setinggi 21
  layar, walau perlu perbaikan pada BUG-11.
- **Posisi scroll bertahan** setelah aksi checklist (3000 menjadi 3000) meski seluruh DOM dibangun ulang.
- **Backup dan pemulihan sudah ada** di Pengaturan: `data:export` menghasilkan `sppd-backup-<tanggal>.json`, dan
  `data:import` memvalidasi bahwa `events` harus berupa array dengan pesan error yang ramah.
- **Sebagian besar aksi hapus besar sudah memakai `ui.confirm`** (event, produk, master, reset data) — pola yang benar,
  tinggal diperluas ke sembilan aksi hapus yang lain (BUG-04).

## Pertanyaan terbuka / perlu konfirmasi

- **Perlu konfirmasi:** apakah `tabRingkasan` dan `tabRoadmap` dihapus dengan sengaja saat desain berubah menjadi
  "Layar Kerja satu tab", atau terlewat? Kalau terlewat, menghidupkan kembali `tabRingkasan` saja sudah menutup
   BUG-02 tanpa perlu kerja baru sama sekali. Kalau sengaja dihapus, berarti belum ada permukaan yang disepakati untuk
   "apa yang belum selesai", jadi perlu keputusan produk lebih dulu.
- **Perlu konfirmasi:** apakah checklist 24 item itu wajib untuk semua event, atau template per jenis tugas? Sekarang
  kesembilan event — termasuk yang berstatus `draft` dan tanpa produk — punya 24 item. Untuk `evt-2` (draft) itu 23
  item yang tidak akan pernah dikerjakan, dan tidak bisa disembunyikan.
- **Perlu konfirmasi:** `evt-3` dan `evt-2` disemai tanpa milestone, tetapi `eventDetail` otomatis menambah lima
  milestone default saat halaman dibuka. Apakah itu memang diinginkan untuk event yang statusnya sudah `selesai`?
- **Perlu konfirmasi:** Panduan masih menyebut `Roadmap` sebagai permukaan utama, dan footer `index.html` juga
  menulis "Roadmap Pengawasan jadi permukaan utama", sementara aplikasi tidak lagi punya tab Roadmap. Teksnya perlu
  disinkronkan.
- Belum diuji: perilaku ketika storage penuh atau localStorage diblokir (mode private). Pesan errornya sudah ada,
  tapi belum saya paksa terjadi.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| "Apa yang belum selesai?" | **1** | Tidak ada daftar eksplisit di 9 halaman; 121 item kurang tidak terlihat; panel "Belum lengkap" sudah ada di kode tapi mati (BUG-02). |
| Progress tracking | 2 | Bar, pill, dan hero konsisten merender dengan rapi, tapi basis hitungannya salah pilih (hanya 5 milestone) dan bisa naik sendiri saat tahap dihapus (BUG-01, BUG-04). |
| Checklist satu klik | 3 | Checkbox 24 item benar-benar satu klik dan langsung tersimpan; nilainya hilang karena tidak ada filter, tidak ada sembunyikan selesai, tidak ada aksi massal, dan urutannya salah (BUG-06). |
| Prioritas dan urgensi | 1 | Nol countdown, nol badge H-minus, nol field prioritas; dashboard justru menyorot event yang lewat 159 hari (BUG-03). |
| Kecepatan pakai (10 menit) | 2 | 21 klik dan 21 layar scroll untuk menuntaskan satu event; tidak ada "lanjutkan terakhir" maupun "langkah berikutnya" (BUG-07, BUG-10). |
| Rasa aman / "tersimpan?" | 2 | Posisi scroll dan centang bertahan, tapi nol indikator simpan dan 26 aksi senyap, termasuk semua aksi tandai-selesai (BUG-08). |
| Bukti untuk orang lain (cetak) | 2 | Laporan keuangan rapi dan lengkap, tapi nol dari 32 baris status ikut tercetak serta tanpa stempel waktu dan cetak-oleh (BUG-09). |
| Konsistensi status | 2 | Badge "Selesai", angka 100%, dan 100% pada `0/0` milestone bisa bertentangan satu sama lain di layar yang sama (BUG-05). |
| **Rata-rata** | **1,9** | Yang hilang bukan fiturnya, melainkan urutan dan kalimatnya. |

## Catatan metodologi

Semua angka di dokumen ini diambil dari DOM atau dari state `localStorage` yang dibaca setelah seed dimuat, bukan dari
kira-kira. Harness pertama sempat gagal total karena `location.hash` belum disetel sehingga `A.reload()` merender
Dashboard alih-alih Layar Kerja — hasil yang salah itu dibuang dan tes diulang dengan hash yang benar; angka scroll
dan fokus pada laporan ini berasal dari run kedua. Tidak ada satu pun angka yang diperkirakan atau dibulatkan tanpa
dasar.
