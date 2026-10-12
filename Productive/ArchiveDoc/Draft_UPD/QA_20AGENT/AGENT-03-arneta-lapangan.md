# AGENT-03 — Arneta Lapangan

> **Persona:** PIC UMKM di lapangan yang selalu bergerak, sinyal sering hilang, satu tangan memegang HP, mencatat banyak produk/qty/harga cepat lalu langsung move on · **Fokus:** input cepat di HP (390×844), seksi 03 (Produk & Qty), seksi 05 (Penjualan), seksi 06 (Pengeluaran & Penyesuaian) · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 1 |
| TINGGI | 7 |
| SEDANG | 7 |
| RENDAH | 4 |
| **Total** | **19** |

Kesimpulan: aplikasinya jalan dan datanya tersimpan rapi di `localStorage`, tapi di layar HP
390×844 halaman ini **melebar jadi 612px** — 34 dari 44 kontrol di seksi 03/05/06 berada
di luar layar, termasuk tombol "Hapus" (x=539–597) yang harus digeser sideways 207px dulu.
Untuk orang yang sambil jalan, satu tangan, dan tidak sabar, itu pemecah paling besar: yang
paling sering diketik (qty, harga) justru yang paling sering gagal diam-diam. Saya membuktikan
`250.000` tersimpan sebagai **Rp 250**, `Kopi Bubuk` (harga master 35.000) tersimpan
**Rp 250.000**, dan qty `1.500.000` tersimpan sebagai **total Rp 0** — semuanya tanpa satu
pun peringatan. Tidak ada Enter untuk submit, tidak ada preview total, tidak ada autosave
di kolom qty (ubah 99/7 lalu tap "Tambah" → balik lagi ke 20/0), dan tombol Hapus di tiga
seksi langsung menghapus tanpa konfirmasi maupun undo. Di sisi lain, tata letak, sticky
header dengan `scroll-margin-top`, flowbar 8 pil, validasi sisa stok (kalau produk ada di
checklist), dan `check11.html` sudah rapi — fondasinya bagus, masalahnya semua di lapisan
"kecepatan mengetik di layar kecil".

## Environment yang dipakai

- Edge headless (`msedge.exe`), **profil unik** `prof_a3 / prof_a3a…prof_a3f` di
  `AppData\Local\Temp\opencode`, tiap run dihapus dulu.
- `localStorage.clear()` di dalam iframe aplikasi **sebelum** semua tes, jadi yang diuji
  selalu seed default (dibuktikan: `evt-1` = 4 sales, 3 expenses, 3 eventProducts).
- Rute diuji:
  - `#/events/evt-1` (berjalan, seed penuh) — seksi 03, 05, 06, 07, 08
  - `#/events/evt-2` (draft, 0 produk di checklist) — uji batas stok
- Cara ukur: aplikasi asli dimuat di `<iframe width=390 height=844>` sehingga
  `innerWidth=390 / innerHeight=844` sungguhan. Semua angka diambil dari
  `getBoundingClientRect()`, `getComputedStyle()`, `gridTemplateColumns`, `scrollWidth`,
  dan `localStorage`/store — bukan dari screenshot.
- Harness di `_QA_TMP/a3_01_layout.html`, `a3_02_diag.html`, `a3_03a…a3_03f.html`,
  hasil ditulis ke `<pre id="out">` lalu dibaca dari `--dump-dom`. Semua harness milik
  agen ini sudah dihapus setelah selesai; isi `_QA_TMP/` kini hanya `a04_uang.html`
  milik agen lain.
- Catatan: Tailwind CDN termuat (`probe .text-4xl = 36px`, `.w-24 = 96px`), jadi pengukuran
  tidak dipengaruhi Tailwind yang gagal load.

## Temuan

### [BUG-01] Halaman jadi 612px di layar 375px — 34 dari 44 kontrol seksi 03/05/06 keluar layar — severity: KRITIS

**Persona dan use-case:** Arneta sedang berdiri di stan, buka `#/events/evt-1` di HP, mau
catat penjualan cepat.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` di viewport 390×844.
2. Lihat `documentElement.scrollWidth`.
3. Cek `gridTemplateColumns` grid luar di seksi 05.
4. Cek `getBoundingClientRect()` setiap `button/input/select` di `#ps-3`, `#ps-5`, `#ps-6`.

**Harapan:** halaman muat 390px, tidak ada scroll horizontal sama sekali.

**Kenyataannya:** halaman melebar ke **612px** (`clientWidth=375` karena scrollbar vertikal
15px; di HP asli overlay scrollbar → 390px, tapi tetap melebar 222px). Penyebabnya saya
karakterisasi sampai ke akarnya:

- Grid luar seksi 05 (`div.grid.grid-cols-1.lg:grid-cols-3`) punya
  `grid-template-columns: 595.719px` padahal induknya (`section#ps-5.psec`) cuma **343px**.
- `styles.css:370-378` (container query `@container seksi (max-width:819px)`) menimpa
  `grid-template-columns` jadi `1fr`. `1fr` = `minmax(auto,1fr)`, dan **minimum otomatis**-
  nya adalah *min-content*, bukan 0.
- Item grid-nya (`div.lg:col-span-2`) punya `min-width:auto`, jadi ikut melebar ikut
  min-content — dan min-content itu datang dari **tabel 7 kolom** "Riwayat Transaksi".
- Bukti uji fangsing: sembunyikan tabel → `grid-template-columns` jatuh dari `595.719px`
  ke `343px`. Set `min-width:0` pada item grid → juga `343px`. Di seksi 06, sembunyikan
  tabel "Daftar Pengeluaran" → `459.188px` jadi `343px`.

**Evidence:**
```
documentElement.scrollWidth = 612   (clientWidth = 375)
#ps-5 outer grid grid-template-columns = 595.719px   (container 343px)
#ps-6 outer grid grid-template-columns = 459.188px   (container 343px)
Kontrol di luar layar di #ps-3/#ps-5/#ps-6 : 34 dari 44
#sa-produk / #sa-tgl / #sa-qty / #sa-harga / #sa-wallet / #sa-catatan : 546px  (harus 293px)
#ex-kategori / #ex-tgl / #ex-deskripsi / #ex-jumlah / #ex-wallet     : 409px
tombol "+ Catat Penjualan"  : x=436..587   (hanya 436..390 yang kelihatan)
tombol "+ Catat Pengeluaran": x=281..450
tombol "Cetak Laporan"      : x=41..450
```
Konsekuensi yang terasa di jari: saat halaman digeser ke kanan, **seluruh halaman ikut
geser** — termasuk header sticky. Jadi setiap sapuan horizontal bikin Arneta kehilangan
arah, dan form yang tadinya kelihatan jadi geser lagi.

**Dampak ke pengguna awam:** di HP semuanya jadi ribet. Dia harus geser layar untuk sampai
kolom "Rusak/Hilang", untuk sampai tombol simpan, untuk sampai tombol catat.
Setelah geser, formnya keluar lagi karena ada elemen lain yang lebih lebar. Orang lapangan
biasanya sudah punya toleransi salah ketuk yang rendah — mereka mengira aplikasinya rusak.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** ubah `1fr` jadi
`minmax(0, 1fr)` di aturan container query `styles.css:370-378`, **dan/atau** beri
`min-width:0` pada item grid (`.lg:col-span-2`, `.lg:col-span-3`) supaya min-content
tabel tidak ikut menentukan ukuran track — `overflow-x-auto` di dalam `.card` baru bisa bekerja
sebagai penjaga. Setelah dua hal itu, `grid-template-columns` saya ukur ulang sudah
menjadi `343px` (sudah saya buktikan di harness, tidak saya simpan ke kode aplikasi).

---

### [BUG-02] Tombol "Hapus" di seksi 03/05/06 berada di luar layar (x=539–597) — severity: TINGGI

**Persona dan use-case:** setelah acaranya selesai, dia mau memotong satu produk yang tidak jadi bawa,
atau membatalkan satu transaksi yang keliru ketik.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` di 390px.
2. Gulur ke seksi 03 (y=8073px dari atas).
3. Lihat posisi kolom "Hapus" di tabel Produk & Qty.

**Harapan:** tombol Hapus di dalam layar, ukurannya cukup untuk jempol.

**Kenyataannya:** tombol Hapus ada di `left=539px … right=597px`. Di layar 390px berarti
harus **geser kontainer 207px** sebelum tombolnya kelihatan. INPUT "Rusak/Hilang" juga
potong: `left=340 … right=436`, jadi hanya **50px dari 96px** field yang terlihat
(`35px` kalau scrollbar 15px ikut). Tombol Hapus di tabel penjualan `left=518…577`,
dan tombol Hapus di daftar Penyesuaian Kas `left=390…448` — tombolnya **tepat di tepi
kanan layar**, praktis mustahil diketuk.

**Evidence:**
```
#ps-3 tombol Hapus : 59x32, left=539 right=597   -> perlu geser 207px
#ps-3 input rusak  : 96px, left=340 right=436    -> 50px terlihat
#ps-5 tombol Hapus : 59x32, left=518 right=577   -> perlu geser 187px
#ps-6 tombol Hapus (kas adj): 59x32, left=390 right=448
#ps-3 .overflow-x-auto : client=293 scroll=566  (butuh geser 273px untuk sampai kolom terakhir)
tombol "Simpan Perubahan" sendiri: x=173..334 -> masih di layar (OK)
```

**Dampak ke pengguna awam:** untuk menghapus satu baris, dia harus menemukan "scroll
horizontal" yang tidak ada affordance-nya (tidak ada panah, tidak ada indikator, tidak ada
"geser →"). Kalau tidak ketemu, dia benar-benar meninggalkan data salah di laporan.

**Usulan perbaikan:** di layar < 640px, ganti baris tabel produk jadi kartu (produk di
atas, lalu deretan input qty dibawa / rusak / kembali jadi full-width, tombol Hapus lebar
penuh minimal 44px). Kalau tabel tetap dipakai, pastikan container punya `min-width:0`
(BUG-01) dan tambahkan petunjuk visual + `scroll-snap` supaya ada tanda "bisa digeser".

---

### [BUG-03] Format uang yang biasa dipakai orang diterjemah jadi nilai lain yang diam-diam — severity: TINGGI

**Persona dan use-case:** di kasbon, nominal ditulis `250.000` atau `10rb`. Arneta
mengetik persis seperti itu sambil mengendorong motor.

**Langkah reproduksi:**
1. Buka seksi 05 → form "Tambah Transaksi".
2. Isi `Qty = 2`.
3. Ketik `250.000` di field "Harga Satuan", lalu tap `+ Catat Penjualan`.
4. Ulangi dengan `1.500.000`, `10rb`, `1,5`, dan `0`.

**Harapan:** `250.000` diterima sebagai 250.000, atau ditolak dengan pesan jelas
("format salah"), bukan diterjemahkan jadi angka lain.

**Kenyataannya:** semua field uang memakai `A.moneyInput` → `<input type="number">`
(`ui.js:130`). Akibatnya:

| yang diketik | yang dibaca `.value` | yang tersimpan |
|---|---|---|
| `250000` | `250000` | 250.000 (benar) |
| **`250.000`** | **`250.000`** | **Rp 250** (salah 1000×) |
| `1.500.000` | `""` (kosong) | Rp 0, transaksi tetap tersimpan |
| `10rb` | `""` | Rp 0 |
| `1,5` | `""` | Rp 0 / ditolak |
| `0` | `0` | Rp 0 tersimpan |

**Evidence (end-to-end, bukan teoretis):**
```
user isi qty=2, harga="250.000", tap + Catat Penjualan
  -> record tersimpan: qty=2 hargaSatuan=250 total=500   (harusnya 500.000)
user isi ex-jumlah="250.000", tap + Catat Pengeluaran
  -> pengeluaran tersimpan (jumlah = 250, bukan 250.000)
user isi harga="1.500.000" qty=2, tap + Catat Penjualan
  -> transaksi 4 -> 5 ; tersimpan qty=2 harga=0 total=0   (tanpa warning)
```
`ui.num()` memakai `parseFloat`, dan `parseFloat("250.000") = 250` — inilah akar
kehilangan nolnya.

**Dampak ke pengguna awam:** uang di layar dan di laporan bisa berbeda ribuan sampai
jutaan, padahal layar terlihat "berhasil". Arneta tidak mungkin sadar, karena selisih
`Rp 500` vs `Rp 500.000` jauh sekali tapi keduanya "terlihat normal". Ini tipe
kehilangan data diam-diam yang paling mahal.

**Usulan perbaikan:** ganti `type="number"` jadi `type="text"` `inputmode="numeric"`
untuk field uang, lalu normalisasi di satu fungsi: buang `.` dan spasi, ganti `,`→`.`
(jika desimal memang perlu), terima akhiran `rb`/`jt`/`k`, dan kalau hasilnya tidak
valid tampilkan pesan **di bawah field** ("ditulis 250.000, dibaca Rp 250") sebelum
disimpan — konfirmasi eksplisit, bukan diam-diam.

---

### [BUG-04] Harga satuan tidak ikut berubah saat produk diganti — Rp 35.000 jadi Rp 250.000 — severity: TINGGI

**Persona dan use-case:** jual 5 pcs Kopi Bubuk Premium yang harga master-nya 35.000.

**Langkah reproduksi:**
1. Buka seksi 05.
2. Lihat `#sa-harga` saat form dibuka → `250000` (harga Batik Tulis, produk pertama).
3. Ganti `<select id="sa-produk">` ke "Kopi Bubuk Premium", lalu tap `+ Catat Penjualan`.

**Harapan:** harga ikut berubah ke 35.000 saat produk diganti (developer bahkan sudah
menyiapkan atributnya: `<option ... data-harga="35000">`).

**Kenyataannya:** tidak ada satu pun listener yang membaca `data-harga`. Ganti produk →
`#sa-harga` tetap `250000` → transaksi tersimpan sebagai **Rp 250.000 untuk Kopi Bubuk**.
Di seksi 05 tidak ada input event listener sama sekali (grep `js/`: nol `addEventListener('input')`).

**Evidence:**
```
opsi: 0:"Batik Tulis (sisa 11)" dh=250000 | 1:"Kopi Bubuk Premium (sisa 68)" dh=35000 | 2:"Gantungan Kunci Kayu (sisa 38)" dh=15000
#sa-harga saat form dibuka      = 250000
pilih Kopi Bubuk + fire change -> #sa-harga = 250000   (tidak berubah)
!! TERSIMPAN: Kopi Bubuk Premium qty=1 harga=250000 total=250000   (harga benar 35.000)
```

**Dampak ke pengguna awam:** margin terpaut 7× (35.000 × 7 = 245.000). Dia percaya
aplikasi karena harga sudah terisi otomatis, padahal itu harga produk lain. Melihat angka
250.000 dia bahkan mungkin sadar ada yang salah — tapi pencatatannya sudah salah dan rekap
per produk langsung jadi tidak dipercaya.

**Usulan perbaikan:** pasang listener `change` pada `#sa-produk` yang membaca
`option[data-harga]` dan mengisi `#sa-harga`; kalau user sudah mengubah harga manual,
 tandai field sebagai "diubah manual" dan jangan ditimpa diam-diam. Tampilkan pratinjau
total langsung di bawah form.

---

### [BUG-05] Input qty di seksi 03 hilang tanpa warning saat halaman di-render ulang — severity: TINGGI

**Persona dan use-case:** di stan, dia sudah ketik qty bawa 20→99 untuk dua produk,
lalu teringat "ah sekalian tambahin Totebag" dan tap tombol **Tambah**.

**Langkah reproduksi:**
1. Seksi 03 → ubah `Qty Dibawa` produk pertama jadi `99`, `Rusak/Hilang` jadi `7`.
   **Jangan** tap "Simpan Perubahan".
2. Tap tombol `Tambah` di kartu "Tambah Produk" (atau pindah tab lewat nav).
3. Baca ulang kedua input itu.

**Harapan:** ada autosave, atau ada peringatan "perubahan belum disimpan", atau input
tidak hilang.

**Kenyataannya:** tidak ada. Kolom qty di `pages2.js:35-37` punya **tanpa `data-action`**,
tidak ada handler `blur`, tidak ada handler `input`, tidak ada pending state. Satu-satunya
cara menyimpan adalah tap "Simpan Perubahan" (`actions.js:186`). Begitu `A.reload()`
dipicu — dan itu terjadi di **setiap** action: tambah produk, catat penjualan, catat
pengeluaran, hapus baris, ubah checklist, ubah milestone — seluruh 8 seksi dirender
ulang dan input yang belum disimpan **kembali ke nilai lama**.

**Evidence:**
```
produk pertama Batik Tulis ; bawa=20 rusak=0
user ubah jadi 99 / 7, BELUM tap Simpan
tap "Tambah" -> A.reload() -> #ep-evp-1-bawa="20"  #ep-evp-1-rusak="0"
store: qtyDibawa=20 qtyRusakHilang=0   => 99 / 7 hilang tanpa warning
```
(jumlah produk di checklist evt-1 = 3, sales = 4, expenses = 3 saat seed — jadi datanya
memang benar-benar hilang, bukan cuma tampil beda.)

**Dampak ke pengguna awam:** ini pola klasik "kehilangan data tanpa sebab". Di lapangan
form datanya sudah diisi, lalu satu ketuk lain membuat semua hilang. Dia akan mengulang
dari awal — atau lebih buruk, jalan dengan angka lamanya dan tidak sadar.

**Usulan perbaikan:** (1) simpan qty **otomatis** saat `blur`/`change` per baris (pola
`data-action="eventproduct:qty"` + `store.saveEventProduct`), sehingga tidak ada tombol
"Simpan" yang bisa terlupa; atau (2) kalau tetap manual, tandai seksi dirty dengan badge
"Tidak disimpan" di kepala seksi dan konfirmasi saat `A.reload()` dipicu. Tambah juga
pengingatan saat menutup halaman dengan perubahan belum tersimpan.

---

### [BUG-06] Tidak ada satu pun hitungan real-time padahal UI menjanjikan "total dihitung otomatis" — severity: TINGGI

**Persona dan use-case:** dia ingin memastikan "10 batik + 3 kopi = Rp 3.605.000" **sebelum**
menekan tombol, supaya tidak perlu buka kalkulator HP.

**Langkah reproduksi:**
1. Seksi 05 → isi `Qty = 7`, `Harga Satuan = 350000`.
2. Fire event `input` dan `change` pada kedua field.
3. Bandingkan HTML seksi 05 sebelum/sesudah, dan cari elemen pratinjau total di dalam form.

**Harapan:** ada baris "Total: Rp 2.450.000" yang berubah saat mengetik, supaya dia
tidak perlu menekan dulu untuk tahu salah/tidak.

**Kenyataannya:** `innerHTML` seksi 05 **tidak berubah sama sekali** setelah event
input. Pratinjau total di dalam form = **0 elemen**. Yang ada di seksi 05 cuma "Rekap per
Produk" yang terisi setelah data tersimpan. Copy di `pages2.js:164` menulis
"Pencatatan manual — total dihitung otomatis", padahal di depan matanya tidak ada
total yang bisa dilihat. Hal yang sama di seksi 03: kolom "Kembali", kolom "Terjual", dan
3 kartu statistik (`Total Dibawa / Terjual / Rusak-Hilang`) semuanya beku.

**Evidence:**
```
#ps-5 berubah setelah ketik qty=7 harga=350000 + fire input? TIDAK
pratinjau total di dalam form penjualan = 0 elemen
seksi 03: kolom Terjual/Kembali = 11 / 9 ; setelah bawa=500 + fire input -> 11 / 9 (tetap)
statCard "Total Dibawa" = 171 (belum ikut 500)
seksi 06: isi #ps-6 tidak berubah saat mengetik jumlah
saldo hanya berubah setelah tap tombol: Rp 2.500.000 | 3.480.000 | 475.000 | 1.985.000 | 4.470.000
```
Kombinasi BUG-03/04/06 adalah yang paling berbahaya: karena tidak ada pratinjau, dia tidak
punya kesempatan tahu bahwa "250.000" jadi 250 sebelum datanya tersimpan.

**Dampak ke pengguna awam:** dia menekan tombol, baru sadar totalnya salah, lalu harus
hapus dan ulangi — persis alur yang paling mahal di lapangan (sudah buka struk/QRIS).

**Usulan perbaikan:** pasang satu `input` listener per form yang menghitung
`qty × harga` dan menampilkannya sebagai baris "Total" besar (mono, tabular-nums) di
bawah field harga, plus peringatan inline bila `harga` berbeda dari `data-harga` produk.
Di seksi 03, hitung ulang `Kembali`, `Terjual`, dan kartu statistik langsung saat angka
diketikan.

---

### [BUG-07] Form penjualan di-reset total setiap kali transaksi disimpan — severity: SEDANG

**Persona dan use-case:** dia mau catat 8 produk dalam 5 menit sambil tetap berdiri.

**Langkah reproduksi:**
1. Seksi 05 → pilih produk ke-2, isi `Qty = 3`, isi `Catatan = "bayar QRIS bu Yanti"`.
2. Tap `+ Catat Penjualan`.
3. Lihat isi form lagi.

**Harapan:** produk, qty, dan metode bertahan; tanggal sudah otomatis jadi hari ini; cukup
ganti produk dan tap lagi.

**Kenyataannya:** `A.reload()` merender ulang seluruh form dari nol.

**Evidence:**
```
sebelum: produk idx=1 qty=3 catatan="bayar QRIS bu Yanti"
sesudah: produk idx=0 ("Batik Tulis (sisa 11)") qty=1 catatan="" tanggal=2026-10-01
```
Per transaksi butuh ± 8–16 sentuhan (pilih produk, ketik qty, ketik harga, pilih metode,
gulir ke tombol, tap, lalu ulangi dari awal). Tidak ada tombol Enter, tidak ada
"Tambah & lanjut".

**Dampak ke pengguna awam:** capek, berhenti di tengah, dan catatan yang sudah diketik
rapi hilang. Untuk 8 produk berarti 8× mengetik ulang catatan pola yang sama.

**Usulan perbaikan:** pertahankan `produkTerakhir`, `qty`, `metode`, `wallet`, dan
`catatan` di state aplikasi setelah `A.reload()` (contohnya `A.saleDraft`), atau
sedikan mode "batch": satu baris input ringkas per produk dengan tombol Enter untuk
memindahkan kursor ke baris berikutnya.

---

### [BUG-08] Enter tidak pernah menambah baris dan tidak pernah submit — severity: SEDANG

**Persona dan use-case:** di HP dia mengetik dengan dua tangan di atas keyboard virtual,
biasanya jempol kanan menekan Enter untuk lanjut.

**Langkah reproduksi:**
1. Fokus `#sa-qty`, lalu `#sa-harga`, lalu `#sa-catatan`.
2. Di masing-masing field kirim `keydown`/`keypress`/`keyup` dengan `key='Enter'`
   (3× per field).
3. Ulangi di `#ex-jumlah`, `#ex-deskripsi`, `#evp-qty`, `#adj-jumlah`, `#adj-keterangan`.
4. Hitung jumlah record sebelum/sesudah.

**Harapan:** Enter mengirim form (atau menambah baris baru), minimal di form penjualan dan
pengeluaran.

**Kenyataannya:** tidak terjadi apa-apa. Aplikasi **tidak punya satu pun elemen `<form>`**
(`document.querySelectorAll('form').length = 0`), dan satu-satunya `keydown` listener
seluruh aplikasi adalah handler Escape untuk modal (`ui.js:80,86`). Tidak ada
`preventDefault` Enter, tidak ada "tambah baris lagi".

**Evidence:**
```
tekan Enter di 8 field (penjualan, pengeluaran, produk, penyesuaian kas):
  penjualan 7 -> 7 ; pengeluaran 4 -> 4 ; produk 4 -> 4   (tidak ada yang berubah)
elemen <form> = 0
tombol spinner input uang step="500" -> dari 0 naik 500 per sentuhan
  (untuk 75.000 butuh 150x sentuhan; tidak ada tombol "+ Rp 10.000")
```

**Dampak ke pengguna awam:** di HP, pintasan Enter itu gratis dan itu yang paling
diharapkan. Tidak ada Enter = harus pakai jempol untuk menekan tombol yang 43px di
bawah keyboard virtual, sering terpotong keyboard.

**Usulan perbaikan:** bungkus tiap form input dalam `<form>` (atau tambahkan handler
`keydown` Enter) yang memaksa submit; untuk form multi-baris (produk, pengeluaran)
 Tambahkan tombol Enter untuk menambah baris baru, dan sediakan tombol cepat nilai
umum (mis. +10.000, +50.000) supaya nominal besar tidak diketik dari nol.

---

### [BUG-09] Tombol Hapus di seksi 03/05/06 menghapus seketika — tanpa konfirmasi, tanpa undo — severity: TINGGI

**Persona dan use-case:** dia sudah capek, jarinya sudah besar, dan tabel itu mulai
menggeser sendiri (BUG-01). Salah satu sentukan menghapus revenue yang sudah tercatat.

**Langkah reproduksi:**
1. Seksi 06 → catat pengeluaran, mis. 15.000 (jalankan dulu supaya barisnya ada).
2. Cek `#modal-root .modal-backdrop` → 0.
3. Tap satu kali `[data-action="expense:delete"]`.
4. Ulangi untuk `sale:delete` dan `eventproduct:remove`.

**Harapan:** ada konfirmasi (aplikasi sudah punya `A.confirm()` yang rapi), atau ada undo.

**Kenyataannya:** ketiganya langsung `store.delete*` + `A.reload()`. Bandingkan dengan
`event:delete` dan `master:catdel` yang **memakai** `A.confirm()` — jadi tidak konsisten.

**Evidence:**
```
seksi 06: pengeluaran = 4 ; modal konfirmasi = 0
  1 tap Hapus -> pengeluaran = 3 ; elemen [data-action*=undo] = 0
seksi 05: 1 tap Hapus -> transaksi 7 -> 6
seksi 03: 1 tap Hapus -> produk di checklist 4 -> 3
```
Yang paling menyakitkan terjadi di seksi 03: menghapus baris produk ikut
menghapus qty bawa yang sudah diketik manual — dan penjualan yang sudah tercatat tidak
lagi punya acuan stok (lihat BUG-13).

**Dampak ke pengguna awam:** satu sentukan salah = catatan penjualan atau pengeluaran
hilang permanen, tidak ada cara recovery di UI. Untuk orang yang mencatat sambil
berjalan, ini kejadian yang akan benar-benar terjadi.

**Usulan perbaikan:** samakan semua `*:delete` dengan `A.confirm()` yang sudah ada, dan
tambahkan toast berumur panjang dengan tombol **"Urungkan"** (undo) yang menyimpan
snapshot record sebelum dihapus selama, misalnya, 10 detik.

---

### [BUG-10] Toast penanda sukses menutupi tombol yang baru saja ditekan — severity: SEDANG

**Persona dan use-case:** dia menekan `+ Catat Pengeluaran` berulang; setelah berhasil
toast muncul tepat di tempat tombol itu.

**Langkah reproduksi:**
1. Seksi 06 → scroll `+ Catat Pengeluaran` ke bawah layar (`scrollIntoView({block:'end'})`).
2. Catat posisi tombol: `y=786…829`.
3. Panggil `A.toast('Pengeluaran dicatat Rp 75.000','success')`, ukur rect toast.

**Harapan:** toast muncul di area yang tidak menutupi kontrol yang sedang dipakai,
minimal tidak menutupi tombol submit yang baru saja ditekan.

**Kenyataannya:** `#toast-root` = `fixed bottom-4 right-4 w-[min(92vw,360px)] z-50`.
Toast rect `y=776…821`, tombol `y=786…829` → **beririsan di y=786…821 dan x=281…359**.

**Evidence:**
```
toast-root: position=fixed bottom=16px right=16px width=358.797px z=50
tombol "+ Catat Pengeluaran": y=786..829
toast A rect: x=0 y=776 w=359 h=45 bottom=821  -> menimpa tombol? YA
toast pesan panjang (65 karakter, "Stok tidak cukup — sisa 9. ..."): h=66 = 3 baris, bottom=821 -> masih di layar
2 toast bertumpuk: y = 723..768 dan 776..821 -> masih di layar
```
Kabar baiknya: toast tidak keluar layar dan pesan panjang membungkus jadi 3 baris, bukan
terpotong. Dan `#toast-root` tidak memasang listener klik, jadi ketukan meleset ke toast
tidak melakukan apa-apa (tidak memicu navigasi yang berbahaya).

**Dampak ke pengguna awam:** setelah menekan simpan, tombolnya "hilang" 3 detik. Kalau
dia mau langsung catat baris berikutnya (hal yang paling sering dilakukan), ketukannya
dimakan dan tidak terjadi apa-apa — terasa seperti aplikasi nge-hang.

**Usulan perbaikan:** pindahkan toast ke **atas** layar (`top:` di bawah header sticky)
atau ke tengah atas, atau beri `pointer-events:none` pada toast supaya ketukan tembus
ke tombol di bawahnya. Kalau tetap di bawah, beri `margin-bottom` saat keyboard virtual
aktif — *perlu konfirmasi di perangkat nyata*.

---

### [BUG-11] Kondisi lipat seksi hilang setiap kali action apa pun dijalankan — severity: SEDANG

**Persona dan use-case:** dia melipat seksi 01–02 dan 04 supaya tidak ada yang
mengganggu, biar yang penting (05 Penjualan) tetap kelihatan di layar.

**Langkah reproduksi:**
1. Tap tombol `▾` pada kepala seksi 03 dan seksi 05 (`psec:toggle`).
2. Cek `section.closed`.
3. Catat pengeluaran di seksi 06 (yang memicu `A.reload()`).
4. Cek `section.closed` lagi.

**Harapan:** kondisi lipat bertahan, minimal selama sesi.

**Kenyataannya:** `psec:toggle` cuma `classList.toggle` di DOM (`actions.js:567-572`),
tidak pernah disimpan ke `localStorage`. `A.reload()` membangun ulang 8 seksi dari
template → semuanya terbuka lagi.

**Evidence:**
```
lipat 03 & 05 -> ps-3.closed=true ps-5.closed=true ; tinggi ps-3 saat dilipat = 48px (dari 1279px)
catat pengeluaran -> ps-3.closed=false ps-5.closed=false  (kembali terbuka)
```

**Dampak ke pengguna awam:** di halaman setinggi 22.492px (26,6 layar), lipatan adalah
satu-satunya alat untuk membuat layar pendek. Kalau lipatan hilang sendiri setiap kali dia
mencatat, alat itu jadi tidak berguna dan areanya yang tersisa makin berantakan.

**Usulan perbaikan:** simpan daftar seksi yang terlipat di `localStorage` (per event),
dan terapkan lagi saat render; atau paling tidak, jangan buka kembali seksi yang
sedang dikerjakan.

---

### [BUG-12] `scroll-margin-top: 96px` lebih kecil dari tinggi header saat menu HP terbuka — severity: RENDAH

**Langkah reproduksi:**
1. Tap tombol hamburger (`nav:mobile`) → `#mobilenav` terbuka.
2. Ukur tinggi header sticky (65px → jadi **133px**).
3. Tap flow-pill "05 Penjualan" (`scroll:to`, `scrollIntoView({block:'start'})`).
4. Ukur `y` judul seksi.

**Harapan:** judul seksi berhenti di bawah header.

**Kenyataannya:** `.psec { scroll-margin-top: 96px }` nilainya tetap, padahal header jadi
133px. Judul seksi berhenti di `y=96` → **37px tertutup header**.

**Evidence:**
```
header tinggi = 65px (sticky, z-index 40)
scroll:to #ps-5 dengan menu tertutup -> y=96  (terlihat, karena 96 > 65)
setelah buka menu HP: mobilenav tinggi=68 -> total header=133
  -> judul ps-5 y=96 ; 37px dari kepala seksi tertutup header
flow-pill "06 Kas" saat menu terbuka: TERTUTUP
```

**Dampak ke pengguna awam:** sebagian judul seksi dan tombol lipat `▾` (=26×26px, lihat
BUG-14) tertutup selama menu masih terbuka.

**Usulan perbaikan:** jadikan `scroll-margin-top` berbasis CSS variable yang ikut
naik saat `#mobilenav` terbuka, atau tutup `#mobilenav` otomatis setiap kali flow-pill
ditap.

---

### [BUG-13] Tidak ada batas stok dan tidak ada info "(sisa N)" kalau produk belum masuk checklist — severity: TINGGI

**Persona dan use-case:** event baru, dia lupa mencentang produk, langsung mau catat
penjualan. Ini kondisi yang sangat mungkin terjadi.

**Langkah reproduksi:**
1. Pindah ke `#/events/evt-2` ("Gelar UMKM Kota 2026", draft, `eventProducts = 0`).
2. Buka seksi 05, lihat isi `<select id="sa-produk">`.
3. Isi `Qty = 999`, tap `+ Catat Penjualan`.

**Harapan:** sistem menolak atau setidaknya memberi tahu.

**Kenyataannya:** di `pages2.js:122`, kalau `eps.length === 0` pool diganti dengan
**seluruh 8 produk master**, dan `stokSisa()` mengembalikan `null`. Di `actions.js:435`
pengecekannya `if (sisa !== null && qty > sisa)` — jadi kalau `null`, **validasi
dinonaktifkan sepenuhnya**. Label `(sisa N)` juga hilang karena `suf` hanya diisi kalau
`sisa !== null`.

**Evidence:**
```
evt-2 eventProducts=0 ; 8 opsi produk: "Batik Tulis", "Tenun Ikat", ... (tanpa "(sisa N)")
stokSisa(evt-2, Batik Tulis) = null
catat qty 999 -> transaksi evt-2 0 -> 1
!! TERSIMPAN: Batik Tulis qty=999 total=249750000  -> tanpa satupun peringatan di layar
"Total Terjual" rekap seksi 05 = Rp 249.750.000
statCard "Terjual" di seksi 03    = 0            <-- tidak nyambung dengan rekap di seksi 05!
statCard "Saldo" di seksi 06      = Rp 249.750.000
```
Perhatikan baris terakhir: kartu **"Terjual" di seksi 03 = 0** padahal ada transaksi
Rp 249.750.000, karena `sumTerjual` dihitung dari `eps` (produk di checklist), bukan dari
sales. Dua seksi menampilkan dua angka berbeda untuk hal yang sama — itu sendiri sudah
sumber kebingungan saat dia mau cek ulang.

**Dampak ke pengguna awam:** satu transaksi salah ketik jadi Rp 249 juta di laporan
penjualan dan saldo. Dan karena kartu di seksi 03 bilang "0", dia punya alasan untuk
tidak percaya laporannya sendiri.

**Usulan perbaikan:** kalau produk yang dijual belum ada di checklist, tolak dengan pesan
("tambahkan produk ini di seksi 03 dulu, qty dibawa belum diisi") atau, kalau memang
diizinkan, tetap tampilkan `(sisa tidak dibatasi)` plus peringatan keras di rekap. Dan
pastikan angka "Terjual" di seksi 03 dan rekap seksi 05 memakai sumber yang sama.

---

### [BUG-14] Hampir semua target sentuh di bawah standar 44px — severity: SEDANG

**Langkah reproduksi:**
1. Buka 390×844, untuk tiap seksi hitung `getBoundingClientRect()` semua kontrol.
2. Bandingkan dengan standar Android/iOS 44×44 CSS px.

**Evidence:**
```
#ps-3: kontrol=14 | <44px=14  | tinggi min 26px, lebar min 26px
#ps-5: kontrol=13 | <44px=12  | tinggi min 26px
#ps-6: kontrol=19 | <44px=17  | tinggi min 26px
.psec-fold  (tombol ▾/▸ lipat seksi): 26 x 26   x8   <-- paling parah
.flow-pill  (pil lompat seksi)      : 71 x 28   x8, jarak antar pil 6px
.btn-sm     (tombol Hapus / milestone): 79 x 32  x43
tombol utama "Tambah" 87x43 ; "+ Catat Penjualan" 151x43 ; "+ Catat Pengeluaran" 169x43  (OK-ish)
input teks tinggi = 43px
jarak vertikal antar 2 tombol Hapus di tabel = 66px (aman); jarak horizontal antar kolom = 0px
```
Catatan adil: tombol aksi utama sudah 43px — bagus, dan jaraknya antar baris tabel
66px juga tidak berdempet. Yang masalah ada di navigasi: 8 `flow-pill` (tinggi 28px,
jarak 6px) dan 8 `psec-fold` (26×26) adalah kontrol yang paling sering dipakai orang
yang sedang memindai halaman, justru yang paling kecil.

**Dampak ke pengguna awam:** salah ketuk `▾` berarti menutup/membuka seksi yang sedang
dikerjakan; salah ketuk flow-pill berarti lompat ke seksi yang salah dan harus scroll balik
puluhan ribu piksel (lihat BUG-18).

**Usulan perbaikan:** `.psec-fold` → minimal 44×44 (dengan ikon tetap kecil di tengah),
`.flow-pill` → `min-height:44px; padding:10px 14px`, dan jarak antar pil naik ke 8px.
Area sentuh bisa diperbesar dengan `padding` tanpa mengubah tampilan visual.

---

### [BUG-15] Peringatan "oversold" tidak muncul di seksi tempat qty-nya diisi — severity: SEDANG

**Langkah reproduksi:**
1. Seksi 03 → ubah `Qty Dibawa` Batik Tulis dari 20 jadi `3` (sudah terjual 9).
2. Tap `Simpan Perubahan`.
3. Cek kolom "Kembali", lalu cari kata "oversold" di seksi 03, 07, dan 08.

**Harapan:** seksi tempat dia mengetik memberi tanda bahaya saat angkanya tidak masuk akal.

**Kenyataannya:** di seksi 03, `kembali` dijaga `Math.max(bawa-terjual-rusak, 0)` sehingga
selalu tampil sebagai angka nonnegative yang "wajar" (0). Tidak ada badge, tidak ada
keterangan. `store.epAnomali()` yang memang sudah menghitung selisihnya **dipakai** di
`tabLaporan` (seksi 08) dan `tabCrossCheck` (seksi 07) — tapi bukan di `tabProduk` (seksi 03).

**Evidence:**
```
dibawa=3 terjual=9 -> epAnomali=6
teks seksi 03 mengandung "oversold"? TIDAK
kolom "Kembali" di seksi 03 = 0 (di-clamp max 0, tidak ada tanda bahaya)
teks seksi 07 mengandung "oversold"? YA
teks seksi 08 mengandung "oversold"? YA
ps-7 y=17246px (20,4 layar) ; ps-8 y=18544px (22,0 layar)
```

**Dampak ke pengguna awam:** dia sudah yakin produknya habis, padahal barangnya masih
4 di koper. Kesalahan ini baru ketahuan saat sudah di laporan — yang sudah dicetak.

**Usulan perbaikan:** tampilkan badge yang sama dengan `tabLaporan` (mis. "cek +6" warna
merah) tepat di baris `tabProduk` yang bermasalah, plus satu kalimat di kartu seksi 03:
"ada produk yang qty dibawa lebih kecil dari qty terjual". Gripe yang sama berlaku untuk
`eventproduct:save` yang menerima `bawa=3` tanpa validasi apa pun (`actions.js:192`).

---

### [BUG-16] Tombol submit jauh di bawah — halaman Layar Kerja setinggi 22.492px (26,6 layar) — severity: SEDANG

**Langkah reproduksi:**
1. Buka `#/events/evt-1` di 390×844, `scrollTo(0,0)`.
2. Catat offsetY tiap landmark.

**Harapan:** form yang sering dipakai tidak terlalu jauh di bawah.

**Evidence:**
```
hero Progres          : y=574    (0,7 layar)
Cek Persiapan         : y=1059   (1,3 layar)
flowbar Alur Kerja    : y=2164   (2,6 layar)   <- harus dilewati dulu
ps-1 SPPD             : y=2304   (2,7 layar)
ps-2                  : y=6781   (8,0 layar)
ps-3 Produk            : y=8073   (9,6 layar)
ps-4 Item              : y=9375  (11,1 layar)
ps-5 Penjualan         : y=12696 (15,0 layar)
ps-6 Kas               : y=14230 (16,9 layar)
ps-7 Pulang            : y=17246 (20,4 layar)
ps-8 Laporan           : y=18544 (22,0 layar)
total dokumen = 22492px = 26,65 layar
tombol "Tambah" ps-3            y=9285
tombol "+ Catat Penjualan" ps-5 y=13315
tombol "+ Catat Pengeluaran"    y=15564
```

**Penilaian yang adil:** ini memang halaman "8 seksi dalam 1 tab" jadi secara desain
panjang. Yang menolong sudah ada dan bekerja: **flowbar 8 pil** benar-benar melompat ke
seksi yang benar, dan `scroll-margin-top:96px` membuat judul seksi mendarat tepat di
bawah header (terukur `y=96`, header 65px). Yang hilang cuma: saat flowbar melompat,
seksi tujuan masih dalam keadaan **terlipat** kalau sebelumnya terlipat — jadi dia melompat
ke kepala seksi tapi isi badannya tidak ada; dan tidak ada indikator "kamu sekarang di
seksi berapa" saat menggulir.

**Dampak ke pengguna awam:** saat sinyal jelek dan halamannya 26 layar, dia harus scroll
berkali-kali. Risiko utamanya salah ketuk dan salah tempat.

**Usulan perbaikan:** pertahankan (A) buka otomatis seksi tujuan saat flow-pill ditekan,
(B) buat flowbar `position:sticky; top:65px` supaya selalu terjangkau, (C) tandai pil
yang sedang aktif saat seksi terlihat (IntersectionObserver).

---

### [BUG-17] Tombol spinner input uang melompat 500 dan tidak ada tombol cepat — severity: RENDAH

**Langkah reproduksi:** `A.moneyInput` menghasilkan `step="500" min="0"` (`ui.js:130`).

**Evidence:** dari `0`, satu sentuhan spinner = `+500`. Untuk nominal `75.000` butuh 150
sentuhan. Tidak ada tombol `+10.000` / `+50.000`.

**Dampak ke pengguna awam:** kalau dia salah ketik `0`, memperbaiki lewat spinner adalah
mimpi. (Catatan: `0` sendiri diterima dan **tersimpan** untuk `#sa-harga`, lihat BUG-03.)

**Usulan perbaikan:** `step="any"` (atau `1`) plus preset cepat, dan validasi
`jumlah > 0` di `sale:add` supaya harga `0` tidak pernah tersimpan diam-diam.

---

### [BUG-18] `eventproduct:add` diam-diam mengubah qty 0 (atau kosong) jadi 1 — severity: RENDAH

**Langkah reproduksi:** di `#evp-qty`, kosongkan field atau ketik `0`, tap `Tambah`.

**Evidence:** `actions.js:173` → `Math.max(parseInt(...) || 1, 1)`. Terbaca `0` → `0` di
input, tapi yang tersimpan `1`. Kolom "Qty Dibawa" di baris baru langsung `1`.

**Dampak ke pengguna awam:** kalau maksudnya "bawa 0 (tidak bawa)", yang tercatat `1` —
selisih satu pcs per produk, dan tidak ada yang ingat. Tidak ada toast yang bilang
"diubah jadi 1".

**Usulan perbaikan:** izinkan 0 secara eksplisit, atau tampilkan pesan "Qty 0 tidak
mungkin, diisi 1" supaya dia tahu alasan angkanya berubah.

---

### [BUG-19] Sebagian besar `<label>` tidak punya `for`, dan tidak ada `inputmode` — severity: RENDAH

**Langkah reproduksi:** hitung atribut `for` pada label di form seksi 05.

**Evidence:**
```
label di seksi 05: (tanpa for), (tanpa for), (tanpa for), sa-harga, (tanpa for), (tanpa for)
seksi 03/05/06: 11 input type="number", semuanya inputmode="(kosong)"
font-size input = 14px
```

**Dampak ke pengguna awam:** (1) mengetuk label ("Produk", "Tanggal", "Qty") tidak
memunculkan keyboard — dia harus kena kotaknya yang benar; (2) `type=number` memaksa
keypad dengan format locale Indonesia (koma sebagai desimal) sementara isi moneyInput
menganggap `250.000` sebagai 250 (BUG-03); (3) `font-size:14px` di bawah 16px — di iOS
Safari fokus field memicu zoom otomatis yang tidak kembali, dan memperkecil area layar
yang tersisa untuk keyboard virtual.

**Usulan perbaikan:** tambahkan `for`/`id` berpasangan di semua label, set
`inputmode="numeric"` (untuk qty) dan `inputmode="decimal"` (untuk nominal), dan naikkan
`font-size` input ke 16px pada layar kecil.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Sticky header + `scroll-margin-top: 96px` benar-benar bekerja.** Terbukti: `scroll:to
  #ps-5` mendarat di `y=96` dengan header setinggi 65px — judul seksi tidak pernah
  tertutup header dalam keadaan normal. Ini detail kecil yang sering lupa.
- **Flowbar 8 pil benar-benar melompat ke seksi yang benar** dengan
  `scrollIntoView({block:'start'})` dan 8 target `#ps-1`…`#ps-8` semuanya ada. Untuk
  halaman 26 layar, ini menghemat waktu scroll.
- **Validasi sisa stok bekerja saat produknya sudah ada di checklist.** Terbukti:
  `qty 999` untuk Batik Tulis (sisa 11) **ditolak**, dan `#sa-produk` menampilkan
  `(sisa 9)` / `(sisa 38)` yang dihitung = dibawa − terjual − rusak. Label "sisa" ini
  sangat membantu karena dia tahu sisa fisik yang boleh dijual.
- **Tombol aksi utama sudah nyaman:** 87×43 / 151×43 / 169×43 px, dan jarak vertikal
  antar tombol Hapus di tabel 66px (tidak berdempet).
- **Posisi scroll tidak lompat setelah action.** Terbukti: `scrollY` tetap `12616` dan
  `#ps-5` tetap di `y=96` setelah catat pengeluaran. Re-render total (`A.reload()`) tapi
  tempat Arneta tidak diterjang ke atas — ini penting dan sering rusak di aplikasi lain.
- **Toast tidak keluar layar dan pesan panjang membungkus rapi**: pesan 65 karakter
  (`"Stok tidak cukup — sisa 9. Qty > sisa (dibawa − terjual − rusak)."`) membungkus jadi
  3 baris di `width 359px`, `bottom=821` (viewport 844), dan dua toast bertumpuk
  (y=723..768 dan 776..821) masih muat.
- **Modal confirmations muat di layar kecil.** Modal konfirmasi: `336×160` di `y=36`,
  tombol "Hapus" `75×42` dan "Batal" `67×42` dengan jarak 8px — keduanya terjangkau tanpa
  scroll. Modal form produk (yang paling panjang) `tinggi 592`, bawah `632` < 844, tombol
  "Simpan" di `y=566` — **tidak perlu scroll sama sekali**.
- **Tombol "Simpan Perubahan" di seksi 03 tetap terjangkau tanpa geser** (`x=173..334`,
  `y` di dalam viewport) meski wrapper tabelnya bisa digeser — jadi aksi utama seksi 03
  tidak ikut hilang oleh overflow. Tombol "Hapus" di baris yang sama tetap di luar layar
  (BUG-02).
- **`localStorage` konsisten dan idempoten**: `localStorage.clear()` + reload selalu
  mengembalikan seed yang sama (evt-1: 3 eventProducts, 4 sales, 3 expenses), jadi hasil
  tes bisa diulang.
- **`check11.html` (21 assert) lulus semua** dan tidak menyentuh area yang saya uji, jadi
  tidak perlu dikhawatirkan.

## Pertanyaan terbuka / perlu konfirmasi

- **Toast di belakang keyboard virtual** — `#toast-root` `fixed bottom-4` di HP asli bisa
  tertutup keyboard yang menutupi ~40–45% tinggi layar. Tidak bisa diuji headless. Perlu
  dicek di perangkat nyata; kalau benar tertutup, itu naik ke TINGGI karena toast adalah
  satu-satunya umpan balik setelah menekan simpan.
- **`input type=number` di keyboard Android locale id-ID** — apakah keypad-nya menghasilkan
  `,` (koma) atau `.`? Kalau koma, maka pola `250.000` yang sering dipakai orang justru
  Mustahil diketik, dan BUG-03 berubah jadi "selalu ditolak" (lebih parah dari "tersimpan
  salah"). Perlu diuji di HP nyata.
- **Zoom otomatis iOS Safari karena `font-size:14px`** — saya hanya bisa membaca angka
  fontnya; perilaku zoom harus diuji di iPhone asli.
- **Perilaku saat sinyal hilang / app di-background** — `A.reload()` menyimpan ke
  `localStorage` secara sinkron di setiap action, jadi secara teori aman. Tapi
  `store.load()` dipanggil ulang di banyak tempat (`store.js` menyaring array tiap
  pemanggilan) — belum saya uji apakah ada race saat tab browser di-background saat
  `localStorage` penuh. Perlu diuji dengan storage penuh / mode private.
- **BUG-05 (hilang tanpa warning) mungkin juga terjadi di seksi 01, 02, dan 04** karena
  pola `tombol Simpan manual + A.reload()` serupa; saya hanya menguji seksi 03 secara
  numerik karena itu area saya.
- **`localStorage` di `file://` lintas origin** — harness saya memakai iframe dengan
  `--allow-file-access-from-files`. Dalam pemakaian nyata (file dibuka langsung) perilakunya
  seharusnya sama, tapi belum saya verifikasi.
- **Vibrasi/haptic saat tap** — tidak ada `navigator.vibrate` di seluruh aplikasi.
  Untuk konfirmasi haptic di tombol hapus/lipat seksi mungkin sudah jadi standar di
  Android. Saran saja.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Ketepatan input angka (uang/qty) | **1** | `250.000` tersimpan jadi `250`, `1.500.000`/`10rb` jadi `0`, dan transaksi `total 0` tetap tersimpan tanpa warning (BUG-03). Ini merusak angka, bukan cuma annoy. |
| Kecepatan input cepat (batch) | **2** | Tidak ada Enter, tidak ada pratinjau total, form reset total tiap kali simpan, tombol utama harus digulir dari bawah keyboard (BUG-06/07/08). |
| Tata letak di layar 390px | **1** | Halaman 612px di layar 375px; 34 dari 44 kontrol keluar layar; tombol Hapus di x=539–597 (BUG-01/02). |
| Keamanan data (tidak hilang diam-diam) | **1** | qty yang diketik hilang tanpa warning saat re-render (BUG-05); Hapus tanpa konfirmasi & tanpa undo di 3 seksi (BUG-09). |
| Umpan balik visual | **3** | Toast muat di layar dan tidak memotong pesan panjang; modal konfirmasi rapi dan terjangkau; kartu statistik seksi 06 lengkap 5 kolom. Yang hilang semua: live preview. |
| Navigasi cepat antar seksi | **3** | Flowbar 8 pil benar-benar bekerja dan `scroll-margin-top` tepat. Dikurangi karena pilnya cuma 28px dan hilang begitu menu HP terbuka (BUG-12/14). |
| Ketahanan target sentuh | **2** | Tombol utama 43px (bagus), tapi `flow-pill` 28px, `psec-fold` 26×26, `btn-sm` 32px — semuanya di bawah standar 44px (BUG-14). |
| Kesesuaian dengan peran pengguna lapangan | **3** | Ringkas, single-page, warna jelas, `Rp` pakai `toLocaleString('id-ID')` sehingga format uang enak dibaca orang Indonesia. |
| **Rata-rata (persona Arneta)** | **1,9** | Fondasi rapi, tapi semua kegagalan ada di jalur yang paling sering dipakai: ketik angka cepat di layar kecil sambil berdiri. |
