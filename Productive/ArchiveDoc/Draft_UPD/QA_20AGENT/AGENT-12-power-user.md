# AGENT-12 — Power User

> **Persona:** Operator yang mengisi puluhan transaksi dalam satu sesi, sudah hafal alur 8 seksi, dan ingin bekerja almost entirely lewat keyboard tanpa mouse · **Fokus:** input banyak, batch, keyboard cepat, konsistensi grid/edit · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 6 |
| SEDANG | 7 |
| RENDAH | 1 |
| **Total** | **14** |

Kesimpulan: Layar Kerja *bisa* diisi cepat, tapi hanya dengan mouse-to-button untuk setiap baris. Aplikasi ini tidak punya satu pun primitif kecepatan yang diharapkan power user: nol `<form>`, nol `tabindex`, nol `accesskey`, nol shortcut global, nol pagination, dan nol aksi edit per baris. Tiga temuan paling berbahaya bukan soal lambat, tapi soal **diam-diam salah**: harga penjualan tidak ikut berubah saat produk diganti (BUG-01), form penjualan di-reset ke produk pertama sehingga transaksi berikutnya diam-diam memakai harga Rp 250.000 (BUG-02), dan perubahan qty di seksi 03 hilang tanpa warning begitu halaman di-render ulang (BUG-03). Untuk operator yang harus mencatat 80 baris, aplikasi ini memaksa 80 putaran pilih-dropdown-dan-klik, ditambah menggulir halaman setinggi 28.618 px untuk menemukan tabel (BUG-06). Di sisi lain, tiga hal justrubagus dan harus dijaga saat refactor: penyimpanan status di seksi 04 benar-benar autosave, milestone punya urutan (`urutan`) yang persist, dan label `data-harga` sudah tersedia di setiap `<option>` produk sehingga perbaikan BUG-01 cukup beberapa baris kode.

## Environment yang dipakai

- Edge headless (`--headless=new --disable-gpu --no-sandbox --virtual-time-budget=20000`), profil unik per run, `localStorage.clear()` di awal sehingga hanya seed default yang teruji.
- Harness: `Draft_UPD/QA_20AGENT/_QA_TMP/a12_harness.html` plus `a12_test.js`, 20 seksi tes, seluruh hasil ditulis ke `<pre id="out">` lalu dibaca dari `--dump-dom`.
- Rute diuji: `#/events/evt-1` (Layar Kerja, 8 seksi), `#/events`, `#/archive`, `#/products`. Seed berisi 9 event dan 8 produk.
- Skenario skala: menyuntik 80 penjualan, 60 pengeluaran, dan 40 milestone tambahan ke event seed sebelum mengukur render.
- Tidak ada file aplikasi (`js/`, `css/`, `index.html`) yang diubah. Semua temuan di bawah hanya baca.

## Temuan

### [BUG-01] Harga penjualan tidak ikut berubah saat produk diganti — TINGGI

**Persona dan use-case:** Power user mencatat 80 penjualan semalam. Alurnya: pilih produk, lihat harga, ubah qty, klik Catat. Ia tidak punya waktu membaca ulang harga tiap baris, dan mengira harga itu diisi otomatis karena sudah terisi.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, lipat yang perlu dilipat sampai ke seksi 05 "Uang — Penjualan".
2. Baca `#sa-harga`. Nilainya `250000`.
3. Ubah `#sa-produk` dari "Batik Tulis (sisa 11)" ke "Kopi Bubuk Premium (sisa 68)".
4. Dispatch event `change` pada select tersebut.
5. Baca ulang `#sa-harga`.

**Harapan:** Harga satuan otomatis mengikuti produk terpilih, karena setiap `<option>` sudah membawa atribut `data-harga`.

**Kenyataannya:** Harga tetap `250000`. Atribut `data-harga` ada lengkap di keempat opsi, tapi tidak ada satu pun handler di `js/actions.js` yang membacanya, dan tidak ada `change` listener di UI mana pun untuk `#sa-produk`.

**Evidence:**
```
#sa-produk punya 4 opsi:
  [0] value=prd-1 | "Batik Tulis (sisa 11)"          | data-harga=250000
  [1] value=prd-3 | "Kopi Bubuk Premium (sisa 68)"  | data-harga=35000
  [2] value=prd-4 | "Gantungan Kunci Kayu (sisa 38)"| data-harga=15000
  [3] value=prd-2 | "Tenun Ikat (sisa 1)"           | data-harga=350000

pilih "Batik Tulis (sisa 11)"        -> #sa-harga=250000
pilih "Kopi Bubuk Premium (sisa 68)" -> #sa-harga=250000
default #sa-harga di DOM = 250000 ; pool[0] = Batik Tulis (sisa 11)
```

**Dampak ke pengguna awam:** Salah input tanpa sadar. Operator mengira menjual Kopi Rp 35.000, sebenarnya application mencatat Rp 250.000. Selisih 7 kali. Karena total baris dan rekap seksi 05 sama-sama dihitung dari harga yang salah, tidak ada angka lain di layar yang bisa dipakai untuk menangkap kekeliruan. Di HP, field harga bahkan berada di luar area fokus mata (verifikasi silang: AGENT-03 BUG-04 melaporkan hal yang sama dari sisi input cepat).

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Bangun satu fungsi `syncSaleForm()` yang menyetel `#sa-harga` dari `selectedOptions[0].dataset.harga`, dipanggil pada `change` `#sa-produk`, dan juga saat form dirender ulang supaya nilai default selalu mengikuti `selectedIndex`.

### [BUG-02] Setelah "Catat Penjualan", form di-reset ke produk pertama sehingga transaksi berikutnya diam-diam memakai harga Rp 250.000 — TINGGI

**Persona dan use-case:** Setelah satu transaksi tercatat, power user mengisi form berikutnya. Ia mengira tanggal dan wallet sudah benar, dan inginvars Hammer untuk mengganti produk saja.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, seksi 05.
2. Set produk ke pool[1] (Kopi), qty `2`, harga `10000`, catatan `trx-0`, wallet index 1. Klik "Catat Penjualan".
3. Isi ulang: produk pool[2] (Gantungan Kunci), qty `3`, harga `15000`, catatan `trx-1`. Klik "Catat Penjualan".
4. Ulangi sekali lagi.
5. Periksa isi keenam field form setelah tiap klik.

**Harapan:** Field yangEME perlukan pilihan ulang (produk, qty, catatan) dikosongkan atau ditandai wajib dipilih ulang. Field yang memang berulang (tanggal, wallet) boleh bertahan.

**Kenyataannya:** Form di-reset ke produk **pertama**, bukan dikosongkan. `#sa-produk` kembali ke `prd-1` (Batik Tulis), `#sa-qty` ke `1`, `#sa-harga` ke `250000`, `#sa-catatan` ke kosong. Harga yang diketik manual (`10000`, lalu `15000`) juga ikut hilang. Jadi transaksi kedua dan seterusnya, kalau operator tidak ingat untuk mengetik harga dan tidak ingat untuk memilih produk, memakai Batik Tulis Rp 250.000 — dan transaksi itu tersimpan tanpa warning.

**Evidence:**
```
formwal = {"produk":"prd-3","qty":"1","harga":"250000","wallet":"Cash","cat":"","tgl":"2026-10-01"}
trx 1   = {"produk":"prd-1","qty":"1","harga":"250000","wallet":"Cash","cat":"","tgl":"2026-10-01"}
trx 2   = {"produk":"prd-1","qty":"1","harga":"250000","wallet":"Cash","cat":"","tgl":"2026-10-01"}
trx 3   = {"produk":"prd-1","qty":"1","harga":"250000","wallet":"Cash","cat":"","tgl":"2026-10-01"}
penjualan evt-1: 4 -> 7   (ketiga transaksi benar-benar tersimpan)
tombol submit regained? "Catat Penjualan" ada lagi = true
```

**Dampak ke pengguna awam:** Form menampilkan "Batik Tulis" sebagai isinya, jadi pengguna awam mengira itulah yang ia jual dan hanya mengetik qty. Ia tidak pernah mengetik harga karena field terisi, dan tidak pernah memeriksa produk karena dropdown terlihat benar. Omzet tercatat jauh lebih besar dari seharusnya, dan yang salah bukan hanya satu baris tapi seluruh baris berikutnya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Setelah submit, kosongkan `produk`, `qty`, `catatan`, dan `harga`, biarkan `tanggal` serta `wallet` bertahan; tambahkan toast ringkas berisi produk, qty, dan total transaksi yang baru tersimpan supaya operator bisa memverifikasi sebelum lanjut.

### [BUG-03] Perubahan qty di seksi 03 hilang tanpa warning saat pindah halaman — TINGGI

**Persona dan use-case:** Power user mengoreksi qty bawa 9 produk sekaligus sambil mencocokkan daftar cetak. Di tengah jalan ia harus pindah halaman sebentar untuk cek sesuatu, lalu kembali.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, seksi 03.
2. Set `#evp-qty` menjadi `999`.
3. Navigasi ke `#/events`, lalu kembali ke `#/events/evt-1`.
4. Baca ulang `#evp-qty`.

**Harapan:** Perubahan tersimpan saat diketik seperti checkbox di seksi 04, atau setidaknya ada peringatan dan konfirmasi saat pindah halaman.

**Kenyataannya:** `#evp-qty` kembali ke `1`. Perubahan hilang tanpa jejak. Tidak ada dialog konfirmasi, tidak ada tombol Batal, tidak ada indikator dirty, dan tidak ada peringatan "belum disimpan" di mana pun.

**Evidence:**
```
ps-03 input qty: 9 ; punya data-action? TIDAK (perlu klik "Simpan Perubahan")
ps-04 checkbox dibawa: prepitem:done (otomatis)
ps-01 #spp-dana data-action = TIDAK (perlu "Simpan SPPD")
tombol "Simpan ..." : "Simpan SPPD", "Simpan Perubahan"
peringatan unsaved / "belum disimpan" = 0
indikator belum disimpan / tombol Batal = 0

ps-03 #evp-qty data-action = TIDAK ADA
ubah #evp-qty 1 -> 999 (tanpa klik "Simpan Perubahan")
setelah pindah halaman lalu kembali: #evp-qty = 1 (HILANG, kembali ke default)
```

**Dampak ke pengguna awam:** Kehilangan pekerjaan tanpa jejak. Kalau operator tidak ingat persis produk mana yang tadi ia ubah, angka bawaan yang kembali diam-diam dipakai untuk laporan resmi. Karena tidak ada warning, ia tidak pernah tahu bahwa ada data yang belum masuk.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Beri `data-action` pada input angka seksi 03 agar autosave konsisten dengan seksi 04; alternatifnya simpan draft di memori per event sampai tombol "Simpan Perubahan" ditekan, dan tampilkan penanda jumlah field yang belum tersimpan plus konfirmasi saat pindah halaman.

### [BUG-04] Fokus jatuh ke `<body>` setelah setiap aksi, jarak Tab antar seksi mencapai 93 — TINGGI

**Persona dan use-case:** Power user mengisi berurutan seksi 03 (produk bawa) lalu seksi 05 (penjualan) lalu seksi 06 (pengeluaran) dalam satu uninterrupted flow, tanpa menyentuh mouse sama sekali.

**Langkah reproduksi:**
1. Fokus ke `#mil-judul`, klik "Tambah Milestone".
2. Periksa `document.activeElement`.
3. Ulangi untuk "Tambah Produk" di seksi 03.
4. Enumerasi seluruh elemen tabbable di Layar Kerja, lalu cari posisi absolut tiap kontrol kunci.

**Harapan:** Setelah render ulang, fokus kembali ke field form yang sedang dikerjakan, dan jarak Tab antar form tetap pendek.

**Kenyataannya:** Fokus jatuh ke `BODY` setiap kali `A.reload()` berjalan, jadi operator harus Shift+Tab berulang atau klik lagi. Jarak Tab antar kontrol kunci justru sangat jauh: 46 Tab dari `#evp-qty` ke `#sa-produk`, lalu 93 Tab dari `#sa-catatan` ke `#ex-deskripsi`. Di satu halaman ada 480 elemen tab-stop.

**Evidence:**
```
sebelum klik: activeElement = INPUT#mil-judul
sesudah klik Tambah Milestone: activeElement = BODY ; isi #mil-judul = ""
sesudah klik Tambah Produk:    activeElement = BODY ; eventProducts=4

total tab-stop di Layar Kerja = 480
  #evp-produk      -> #255
  #evp-qty        -> #256   (jarak 1 Tab dari kontrol sebelumnya)
  #sa-produk       -> #302   (jarak 46 Tab)
  #sa-qty         -> #304   (jarak 2 Tab)
  #sa-harga       -> #305   (jarak 1 Tab)
  #sa-catatan     -> #307   (jarak 2 Tab)
  #ex-deskripsi   -> #400   (jarak 93 Tab)
tombol "Catat Penjualan" -> #308 (jarak 1 Tab dari #sa-catatan)
D. elemen dengan tabindex = 0
```

**Dampak ke pengguna awam:** Setiap transaksi butuh puluhan klik mouse tambahan hanya untuk memindahkan fokus. Untuk orang dengan gangguan motorik ringan, 93 Tab untuk pindah seksi mengubah input cepat jadi sangat melelahkan. Verifikasi silang: AGENT-09 BUG-01 sudah menemukan fokus hilang ke `<body>` dari sisi aksesibilitas; temuan ini mengukur dampaknya secara kuantitatif untuk produktivitas.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Simpan `id` elemen yang sedang aktif sebelum `A.reload()` dan pulihkan fokus sesudah render, dengan fallback ke field pertama seksi tadi; tambahkan anchor lompat seksi (`Alt+1` sampai `Alt+8`) agar jarak Tab tidak lagi menentukan kecepatan.

### [BUG-05] Nol pagination: 192 baris tabel dirender sekaligus di halaman setinggi 28.618 px — TINGGI

**Persona dan use-case:** Power user mencari satu transaksi tertua di akhir tabel penjualan, atau ingin menghapus 10 baris hasil import yang keliru.

**Langkah reproduksi:**
1. Suntik 80 penjualan, 60 pengeluaran, dan 40 milestone ke `store`.
2. Muat ulang `#/events/evt-1`.
3. Hitung total baris `<tbody>`, jumlah node di `#app`, tinggi halaman, dan cari kontrol paginasi atau sortable header.

**Harapan:** Tabel panjang dipaginasi, atau minimal ada pencarian lokal dan tombol "tampilkan lebih banyak".

**Kenyataannya:** Seluruh isi dirender sekaligus. 192 baris tabel di satu layar, 3.495 node DOM, 154 tombol "Hapus" aktif, dan halaman setinggi **28.618 px** pada viewport 441 px — setara 65 layar penuh. Nol kontrol paginasi, dan nol dari 54 `<th>` yang bisa di-sort.

**Evidence:**
```
simpan 80 sale + 60 expense + 40 milestone = 127 ms
render ulang Layar Kerja = 19 ms
total node DOM di #app = 3495
baris tabel penjualan = 88 ; pengeluaran = 63
total baris <tbody> di layar = 192
tombol hapus di tabel = 154
tinggi halaman = 28618 px ; tinggi viewport = 441 px  (sekitar 65x lipatan)
kontrol paginasi / "tampilkan lebih" = 0
th sortable = 0 (dari total th = 54)
```

**Dampak ke pengguna awam:** Mencari satu baris di 28.618 px dengan scroll wheel atau thumb mouse tidak realistis. Pengguna awam akan menyimpulkan aplikasinya hang dan menutup tab. Performa render-nya sendiri justru bagus (19 ms), jadi masalahnya murni discovery, bukan kecepatan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Terapkan pola "tampilkan lebih banyak" per tabel mulai 25 baris dengan nomor halaman, tambahkan pencarian lokal per tabel transaksi, dan jadikan `<th>` tanggal serta nominal sortable. Ketiganya independen dan bisa dikerjakan terpisah.

### [BUG-06] Nol aksi edit, duplikat, atau bulk di 10 tabel Layar Kerja — TINGGI

**Persona dan use-case:** Power user salah ketik qty penjualan 3 menjadi 5. Alih-alih menghapus baris yang sudah tercatat lalu mengetik ulang, ia ingin klik sekali di baris itu dan ubah angkanya.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Enumerasi setiap `<table>` di `#app`: jumlah baris, daftar kolom, dan semua `data-action` unik di dalamnya.
3. Cari tombol berlabel edit, duplikat, salin, copy, bulk, atau "pilih semua".
4. Hitung seluruh `input[type=checkbox]` dan cek apakah ada yang berfungsi sebagai seleksi baris.

**Harapan:** Tiap baris transaksi punya aksi edit; ada duplikat untuk transaksi rutin; ada bulk delete untuk membersihkan salah import.

**Kenyataannya:** Dari 10 tabel, hanya 5 yang punya `data-action` sama sekali, dan semuanya hanya `*:delete` atau toggle status. Nol aksi edit, nol duplikat, nol bulk. Ada 60 checkbox di halaman, tapi nol checkbox "pilih semua" — semuanya untuk status dan data, tidak satu pun untuk seleksi baris. Lima tabel benar-benar tanpa aksi apa pun, termasuk tabel Arus Kas per Wallet dan Rekap Produk.

**Evidence:**
```
T1 [4 baris] Produk/Qty Dibawa/Terjual/Rusak/Kembali    aksi: eventproduct:remove
T2 [3 baris] Item/Kategori/Qty/Biaya/Dibawa?            aksi: prepitem:done, prepitem:delete
T3 [7 baris] Tanggal/Produk/Qty/Harga/Metode/Total      aksi: sale:delete
T4 [3 baris] Tanggal/Kategori/Wallet/Jumlah              aksi: expense:delete
T5 [9 baris] Aset/Jenis/Rekap/Dibawa pulang/Audit        aksi: prepitem:pulang
T6 [5 baris] Produk/Dibawa/Terjual/Rusak/Kembali/Rekap  aksi: TIDAK ADA - teks saja
T7 [4 baris] Item/Kategori/Qty/Biaya/Status/Pulang       aksi: TIDAK ADA - teks saja
T8 [4 baris] Wallet/Masuk/Keluar/Saldo                   aksi: TIDAK ADA - teks saja
T9 [9 baris] Komponen/Wallet/Alokasi/Realisasi/Sisa     aksi: TIDAK ADA - teks saja
T10[3 baris] Wallet/Alokasi/Realisasi/Sisa               aksi: TIDAK ADA - teks saja

kata "edit" -> 2 tombol
kata "dupl"/"salin"/"copy" -> 0
kata "pilih semua"/"bulk"/"hapus semua"/"batch" -> 0
input checkbox total = 60 ; checkbox "pilih semua" = 0
```

**Dampak ke pengguna awam:** Satu kesalahan angka berarti menghapus transaksi yang sudah tercatat lalu mengetik ulang enam field. Karena aksi hapus di aplikasi ini diketahui langsung berlaku tanpa konfirmasi (AGENT-08 BUG-01), pengguna awam akan hesitate di tombol Hapus, membatalkan sendiri, dan membiarkan tidak lengkap tanpa ada yang tahu. Itu corrupsi data yang lebih sulit diperbaiki daripada salah ketik aslinya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Prioritaskan `sale:edit` dan `expense:edit` dengan modal yang memuat ulang nilai tersimpan, lalu `sale:duplicate` untuk transaksi berulang, lalu checkbox baris plus bulk delete dengan konfirmasi yang menyebut jumlah baris dan total nominal yang akan dihapus.

### [BUG-07] Empat wallet punya lima nama dan tiga urutan berbeda di enam tempat — SEDANG

**Persona dan use-case:** Power user merekap saldo per wallet untuk laporan bulanan. Ia membangun mental model "Bank selalu baris pertama" dari definisi store, lalu membandingkannya dengan form.

**Langkah reproduksi:**
1. Baca urutan `store.WALLETS`.
2. Baca opsi setiap dropdown wallet: `#bg-wallet`, `#tr-wallet`, `#ex-wallet`, `#adj-wallet`, `#sa-wallet`.
3. Baca urutan baris tabel Arus Kas per Wallet di seksi 08.
4. Bandingkan urutan dan label satu per satu.

**Harapan:** Satu daftar wallet global dipakai konsisten di seluruh aplikasi, dengan label identik di mana pun, sehingga tabel dan form bisa dibandingkan baris-per-baris.

**Kenyataannya:** Satu konstanta global memang ada, tapi dipakai dengan urutan berbeda di tiga dari lima dropdown, dan label berubah total di `#sa-wallet`. Tabel Arus Kas mengikuti urutan konstanta global, jadi baris "pertama" tabel adalah Bank sementara baris "pertama" form pengeluaran adalah Kas.

**Evidence:**
```
store.WALLETS (urutan resmi) : Bank > QRIS > Kas > E-Money
#bg-wallet (alokasi SPPD)    : Bank > QRIS > Kas > E-Money
#tr-wallet  (transport)      : Kas > Bank > QRIS > E-Money
#ex-wallet  (pengeluaran)    : Kas > Bank > QRIS > E-Money
#adj-wallet (penyesuaian)    : Kas > Bank > QRIS > E-Money
#sa-wallet  (penjualan)      : Cash > QRIS > Transfer > E-Money
Urutan baris tabel Arus Kas  : Bank > QRIS > Kas > E-Money
```
Catatan: label penjualan memakai *metode pembayaran* (Cash, Transfer) sementara semua tempat lain memakai *nama wallet* (Kas, Bank). Tidak ada teks yang menjelaskan bahwa "Cash" berarti "Kas" dan "Transfer" berarti "Bank".

**Dampak ke pengguna awam:** Saat melaporkan saldo, pengguna awam melihat tabel Arus Kas dan menyimpulkan wallet pertama adalah Bank, padahal form yang ia pakai untuk mencatat pengeluaran menempatkan Kas di posisi pertama. Ia harus menebak pemetaannya sendiri, dan kalau salah, angka yang dilaporkan ke atasan berubah tanpa ada warning.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Render semua dropdown wallet dari satu helper yang memakai `store.WALLETS` tanpa urutan ulang, dan samakan labelnya: pakai nama wallet persis di semua tempat, atau tulis "Cash (Kas)" dan "Transfer (Bank)" supaya pemetaannya terbaca tanpa perlu menebak.

### [BUG-08] Pil Alur Kerja tidak cocok dengan judul seksi — "Uang —" dan "Cross-check" hilang — SEDANG

**Persona dan use-case:** Power user memakai flowbar Alur Kerja sebagai navigasi utama saat berpindah seksi berulang. Ia harus tahu bahwa pill "06 Kas" menunjuk seksi bernama "Uang — Pengeluaran & Penyesuaian".

**Langkah reproduksi:**
1. Baca teks seluruh 8 `.flow-pill` di flowbar.
2. Baca teks judul seluruh 8 `.psec-title`.
3. Bandingkan pasangan satu per satu.

**Harapan:** Nama pill sama dengan nama seksi yang dituju, supaya operator tidak perlu menghafat dua istilah berbeda untuk satu tempat.

**Kenyataannya:** Empat dari delapan judul tidak identik dengan pill-nya. Prefix "Uang —" hilang di tiga seksi, dan seksi 07 memakai kata "Cross-check" di judul tapi hanya "Pulang" di pill.

**Evidence:**
```
Pill Alur Kerja    : 01 SPPD | 02 Jadwal | 03 Produk | 04 Item | 05 Penjualan | 06 Kas | 07 Pulang | 08 Laporan
Judul seksi ps-1..8: SPPD & Dana Cair | Jadwal & Milestone | Produk & Qty (Aset Jual) | Item Persiapan (Aset & Alat) | Uang — Penjualan | Uang — Pengeluaran & Penyesuaian | Cross-check Berangkat/Pulang | Uang — Laporan
Cocok? TIDAK
```

**Dampak ke pengguna awam:** Dua istilah untuk satu tempat. Pengguna awam yang mencari teks "Uang — Pengeluaran" tidak menemukan apa pun di flowbar, dan sebaliknya. Tidak ada data yang hilang, tapi pencarian mental melambat tiap berpindah seksi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Turunkan satu sumber kebenaran untuk nama seksi (misalnya objek `{id, pill, title}`) lalu pakai nilai `pill` yang sama persis di flowbar dan sebagai caption ringkas seksi.

### [BUG-09] Status lipatan seksi hilang setiap kali `A.reload()` berjalan — SEDANG

**Persona dan use-case:** Power user melipat 5 seksi yang tidak ia perlukan supaya layar tidak dipenuhi, lalu mulai input. Di tengah jalan ia mencatat satu penjualan.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, klik tombol lipatan seksi 05.
2. Periksa `class` seksi tersebut dan teks tombol lipatnya.
3. Catat satu penjualan lewat tombol "Catat Penjualan".
4. Periksa `class` dan teks tombol lipatan sekali lagi.

**Harapan:** Seksi yang dilipat tetap terlipat setelah data baru masuk, karena operator sengaja melipatnya.

**Kenyataannya:** Seksi terbuka kembali dengan sendirinya. Aksi `psec:toggle` hanya menambah atau menghapus kelas CSS di DOM; keadaan itu tidak pernah disimpan, dan setiap render ulang membangun ulang semua seksi dalam kondisi terbuka.

**Evidence:**
```
setelah tutup ps-5                      : class="psec closed" ; tombol=collapse icon
setelah 1x Catat Penjualan              : class="psec"        ; tombol=expand icon
LIPATAN IKUT TERBUKA (state hilang, harus lipat ulang)
```

**Dampak ke pengguna awam:** Tampilan melompat sendiri di tengah operator sedang mengisi form lain. Ini membingungkan tapi ada jalan keluar (lipat lagi), jadi bukan TINGGI. Untuk power user yang menjaga susunan layar spesifik, ini terjadi pada tiap transaksi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Simpan daftar id seksi yang terlipat di state store per event, lalu terapkan kelas `closed` saat merender seksi tersebut.

### [BUG-10] Dari Layar Kerja tidak ada jalan kembali ke Daftar Event selain tombol browser — SEDANG

**Persona dan use-case:** Power user selesai merekap satu event lalu ingin langsung membuka event berikutnya. Ia mencari link "kembali".

**Langkah reproduksi:**
1. Buka `#/events/evt-1` dari daftar.
2. Cari seluruh `a[href="#/events"]` di dalam `#app`.
3. Enumerasi tombol yang ada di header event.
4. Cari link berlabel "Kembali" atau panah kiri.

**Harapan:** Ada link kembali, minimal di bagian atas halaman.

**Kenyataannya:** Nol link kembali. Dua tombol di header event adalah "Edit event" dan "Hapus event", keduanya destruktif atau edit, tidak ada satupun untuk navigasi keluar. Daftar event berisi 9 event, jadi power user harus menekan tombol Back browser atau membuka menu navigasi atas.

**Evidence:**
```
link ke daftar event (#/events) di dalam #app = 0
tombol di .ev-head = 2 -> "Edit event", "Hapus event"
link berlabel Kembali / panah kiri di #app = 0
jumlah event dalam daftar = 9
```

**Dampak ke pengguna awam:** Untuk pengguna awam yang tidak tahu cara pakai tombol Back browser, layar ini terasa seperti jalan buntu. Ia perlu menemukan menu navigasi di bagian atas yang mungkin sedang ter-scroll keluar layar.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan link "Kembali ke Daftar Event" di bagian atas Layar Kerja, idealnya dengan shortcut keyboard, dan pertahankan fokus serta posisi scroll saat kembali ke event yang tadi dibuka.

### [BUG-11] Tidak ada pencarian di Layar Kerja, Daftar Event, dan Master Produk — SEDANG

**Persona dan use-case:** Power user mencari satu produk spesifik di antara 8 produk, atau satu event di antara 9, atau satu transaksi di antara 88 baris.

**Langkah reproduksi:**
1. Di Layar Kerja, hitung input yang placeholder-nya memuat "cari" atau "search".
2. Hitung jumlah `<th>` yang punya `data-action` (ind sortable) terhadap total `<th>`.
3. Pindah ke `#/products`, hitung input, select, dan baris.
4. Untuk pembanding, pindah ke `#/archive` dan uji cari berdasarkan nomor SPPD.

**Harapan:** Halaman dengan banyak data punya pencarian dan sortable header. Arsip sudah punya pencarian, jadi pola ini sudah ada di aplikasi.

**Kenyataannya:** Halaman yang paling padat justru yang paling steril. Di Layar Kerja tidak ada satu pun input cari, dan nol dari 54 `<th>` bisa di-sort. Master Produk tidak punya input, select, maupun sort sama sekali. Arsip punya 3 select filter dan pencarian yang bekerja (saya menemukan 1 dari 10 kartu saat mengetik "039"), jadi kemampuan ada di aplikasi, hanya tidak dibawa ke halaman lain.

**Evidence:**
```
#/archive       : input cari ada = ya ; tombol Terapkan = 1 ; 3 select filter
  cari "039" (no. SPPD evt-1 = 039/SPPD/UKM/2026): kartu hasil = 1 / total 10
  opsi filter: Status={draft,diajukan,berjalan,disetujui,selesai,dibatalkan}
              Bulan (mulai)={01..12} ; Tahun (mulai)={2026}
#/products      : input cari = 0 ; select filter = 0 ; baris = 8
                 th sortable = 0 / total th = 6
Layar Kerja     : input cari = 0 ; th sortable = 0 / total th = 54
```

**Dampak ke pengguna awam:** Tidak bisa mencari. Untuk power user yang punya 9 event, satu-satunya cara menemukan event tertentu adalah menggulir daftar penuh.n membaca semua judul._exists jalan keluar, jadi bukan TINGGI, tapi untuk power user ini}}-\removal biaya waktu terbesar kedua setelah pagination.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan pencarian teks di Layar Kerja (produk, item, catatan transaksi) dan di Master Produk, plus jadikan `<th>` tanggal dan nominal sortable. Arkadalah pencarian yang sudah ada di Arsip bisa dijadikan acuan pola.

### [BUG-12] Urutan bawaan tabel penjualan ascending, dan event aktif tenggelam di antara event selesai — SEDANG

**Persona dan use-case:** Power user membuka daftar event setiap pagi untuk melanjutkan event yang sedang berjalan. Ia membuka daftar penjualan untuk mengoreksi transaksi minggu lalu.

**Langkah reproduksi:**
1. Baca urutan `tanggal` dari penjualan `evt-1` yang sudah diurutkan renderer.
2. Baca urutan tampil kartu di `#/events`.
3. Cari kontrol pengurutan di kedua halaman.
4. Baca daftar chip status di `#/events`.

**Harapan:** Penjualan terbaru di atas, karena itu yang paling sering dikoreksi. Event yang sedang berjalan di atas daftar event.

**Kenyataannya:** Penjualan dirender **ascending**, jadi transaksi terbaru justru ada paling bawah. Di daftar event, urutan bawaan menempatkan "Bazar Ramadan Ceria 2026" (sudah selesai) di posisi pertama, sementara event yang sedang berjalan di posisi kedua. Nol kontrol pengurutan di kedua halaman.ipariter chip status juga tidak lengkap: Daftar Event hanya punya Semua, Draft, Berjalan, Selesai, sementara Arsip punya enam status termasuk Diajukan, Disetujui, dan Dibatalkan.

**Evidence:**
```
penjualan: 5 tanggal pertama tampil = 2026-04-22, 2026-04-22, 2026-04-23, 2026-04-23, 2026-10-01
urutan = ASC
daftar event tampil: Bazar Ramadan Ceria 2026 > Pameran UMKM Nusantara Expo 2026 > Gelar UMKM Kota 2026 >
                  Sosialisasi UMKM Kota > Festival Kerajinan Nusantara > Expo Produk Lokal 2026 >
                  Kunjungan Mitra Sektor > Dukungan Booth UMKM Regional > Pekan Inovasi Daerah
filter chip Daftar Event: Semua , Draft , Berjalan , Selesai
filter chip Arsip      : Semua , draft , diajukan , berjalan , disetujui , selesai , dibatalkan
kontrol urutan di daftar event = 0
milestone: urutan = 1 .. 139 ; tombol naik/turun/geser = 0
```

**Dampak ke pengguna awam:** Pengguna awam yang mengira daftar penjualan terbaru-first akan mengoreksi transaksi tertua di baris paling bawah tanpa sadar. Event berstatus Diajukan atau Disetujui tidak bisa difilter dari Daftar Event, jadi harus dicari satu per satu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Urutkan penjualan descending secara bawaan dengan opsi toggle ascending, letakkan event berjalan sebelum event selesai di daftar utama, dan samakan daftar chip status dengan Arsip.

### [BUG-13] Ladder saldo identik tampil dua sampai tiga kali di satu halaman — SEDANG

**Persona dan use-case:** Power user butuh satu angka saldo akhir untuk laporan. Di Layar Kerja ia menemukan "Saldo akhir" lebih dari sekali dan harus menentukan mana yang otoritatif.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Kumpulkan seluruh elemen `.eq`, ambil teksnya, dan kelompokkan berdasarkan string identik.
3. Laporkan setiap `.eq` yang muncul lebih dari sekali, serta yang memiliki judul kartu sama persis.

**Harapan:** Satu ladder saldo per layar, di satu tempat yang jelas.

**Kenyataannya:** Enam baris `.eq` tampil lebih dari sekali. "Saldo akhir" muncul tiga kali dengan angka identik, "Dana awal (SPPD)" dua kali, dan blok kartu berisi judul yang sama muncul di seksi 06 dan seksi 08 sekaligus.

**Evidence:**
```
.eq "Dana awal (SPPD) Rp 2.500.000"        muncul 2x
.eq "Hasil penjualan + Rp 4.730.000"        muncul 3x
.eq "Transport Rp 1.440.000"                muncul 2x
.eq "Pengeluaran lain Rp 770.000"           muncul 2x
.eq "Penyesuaian kas + Rp 475.000"          muncul 2x
.eq "Saldo akhir Rp 5.495.000"              muncul 3x
total .eq = 38 ; total h2 = 23

Blok "Dana awal (SPPD) ... Saldo akhir" di layar yang sama = 2
Kartu di ps-06 + ps-08: {"Catat Pengeluaran":1,"Daftar Pengeluaran":1,"Penyesuaian Kas":1,
  "Laporan Penggunaan Uang":1,"Rekap Produk & Qty":1,"Rekap Item Persiapan":1,
  "Laporan Arus Kas per Wallet":1,"Anggaran vs Realisasi per Komponen":1,
  "Bandingkan SPPD vs Realisasi vs Penjualan":1,"Rekap Penggunaan Uang":1}
```
Verifikasi silang: AGENT-05 BUG-04 dan AGENT-06 BUG-06 sudah melaporkan duplikasi angka saldo dari sisi dokumen cetak dan dashboard. Yang ditambahkan di sini: duplikasi terjadi **di dalam satu halaman** yang sama, bukan antar dokumen.

**Dampak ke pengguna awam:** Tiga angka identik dengan label sama membuat pengguna awam ragu dan memilih yang salah tanpa ada penjelasan mana yang utama. Tidak ada data yang hilang atau salah, tapi kebingungan nyata.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pilih satu lokasi kanonik untuk ladder saldo (saran: seksi 08 "Uang — Laporan") dan ganti kemunculan lain dengan ringkasan satu baris atau tautan "lihat di Laporan" agar tidak ada dua sumber angka yang sama dalam satu layar.

### [BUG-14] Nol shortcut keyboard global, dan tidak ada `input[type=search]` di seluruh aplikasi — RENDAH

**Persona dan use-case:** Power user.Movie tangan kosong ingin trigger aksi cepat: tambah penjualan, lompat ke pencarian, buka daftar event.

**Langkah reproduksi:**
1. Dispatch 12 `keydown` beruntun di `document.body`: `n`, `/`, `g`, `?`, `1`, `5`, `8`, `e`, `a`, `Escape`, `Alt+n`, `Control+k`.
2. Bandingkan panjang `innerHTML` `#app` sebelum dan sesudah.
3. Hitung seluruh `input[type=search]` di aplikasi.

**Harapan:** Setidaknya satu shortcut untuk aksi utama, dan kolom pencarian memakai `type="search"` agar dapat tombol hapus bawaan browser.

**Kenyataannya:** Nol efek dari 12 kunci. Panjang HTML `#app` tidak berubah sama sekali. Listener `keydown` di seluruh aplikasi hanya satu, yaitu `Escape` untuk menutup modal. Ini murni fitur yang belum ada, bukan kerusakan, dan semua aksi tetap bisa lewat mouse, sehingga severity RENDAH sesuai definisi brief.

**Evidence:**
```
dispatch 12 kunci: n,/,g,?,1,5,8,e,a,Escape,Alt+n,Control+k
panjang HTML #app 9730 -> 9730 ; berubah = false
listener keydown di seluruh aplikasi = 1 (hanya Escape di ui.js A.modal)

D. elemen dengan tabindex = 0
E. elemen dengan accesskey = 0
G. input[type=search] = 0
```

**Dampak ke pengguna awam:** Tidak ada dampak ke pengguna awam, karena mereka memang tidak mengandalkan keyboard. Untuk power user ini kehilangan produktivitas, dan `/` untuk fokus pencarian adalah ekspektasi paling umum di aplikasi web modern.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan peta shortcut global yang tidak bentrok dengan pengetikan teks (contoh `/` untuk fokus cari, `Alt+1`..`Alt+8` untuk lompat seksi), dokumentasikan di halaman Panduan, dan ganti kolom pencarian menjadi `type="search"`.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Autosave status di seksi 04 benar-benar bekerja.** Checkbox "Dibawa?" punya `data-action="prepitem:done"` dan langsung tersimpan saat dicentang. Ini pola yang benar dan harus dipakai sebagai standar untuk seksi 03 (lihat BUG-03).
- **Milestone punya urutan yang persist.** Field `urutan` di store bertahan dari 1 sampai 139 setelah 40 milestone disuntik, jadi urutan input operator tidak kacau. Yang belum ada hanya kontrol untuk mengubahnya.
- **Atribut `data-harga` sudah tersedia di setiap `<option>` produk.** Empat dari empat opsi punya nilainya. Perbaikan BUG-01 hanya butuh satu handler yang membacanya, tanpa perlu mengubah model data.
- **Performa render sangat baik di skala data.** Menyuntik 180 transaksi took 127 ms, dan render ulang Layar Kerja hanya 19 ms untuk 3.495 node DOM. Masalah di BUG-05 murni soal discovery, bukan soal kecepatan komputasi.
- **Pencarian di Arsip bekerja dan cukup lengkap.** Enam opsi status, filter bulan, filter tahun, dan pencarian yang berhasil menemukan event lewat nomor SPPD "039" (1 dari 10 kartu). Pola ini sudah ada, tinggal direplikasi.
- **`store.savePrepItem` menormalkan status kosong ke `"belum"`.** Saat form mengirim status string kosong karena `#prep-status` tidak ada di DOM, store tetap menyimpan `"belum"`. Normalisasi di lapisan store ini menyelamatkan data dari status kosong — bagus.
- **Tombol submit tetap bisa dipakai ulang.** Setelah `A.reload()`, tombol "Catat Penjualan" muncul kembali dalam kondisi aktif (`"Catat Penjualan" ada lagi = true`), jadi tidak ada keystroke yang hilang setelah reload.

## Pertanyaan terbuka / perlu konfirmasi

- **Nol `<form>` dan Enter yang tidak berfungsi** mungkin perlu konfirmasi apakah ini keputusan sadar untuk menjaga kompatibilitas cetak/laporan, atau murni terlewat. Perlu konfirmasi: apakah ada rencanaDdigrate renderer ke `<form>` tanpa merusak 10 tabel laporan yang sudah berjalan.
- **Tidak adanya aksi edit per baris** bisa jadi keputusan sadar untuk menjaga jejak audit (data transaksi dianggap immutable). Perlu konfirmasi dengan pemilik produk: jika immutable, minimal harus adaSaldo koreksi atau pembatalan, karena sekarang jalur koreksi hanya hapus lalu ketik ulang.
- **`broughtHome=undefined` pada item persiapan yang baru ditambah.** Field ini tidak diisi saat item dibuat, hanya saat tombol pulang diklik. Saya belum menguji apakah ada tempat yang membaca `broughtHome` secara langsung dan salah klasifikasi item baru sebagai "belum pulang". Perlu konfirmasi.
- **Kategori pengeluaran yang jatuh ke "Operasional Lain"** sudah dilaporkan AGENT-04 BUG-09. Dari sisi power user, saya tidak menguji input cepat ke kategori itu, jadi saya tidak impregnkan temuan yang sama.
- **Konsistensi label wallet (`Cash`/`Transfer` vs `Kas`/`Bank`)** perlu konfirmasi apakah itu keputusan bisnis (memode pembayaran memang beda dari nama wallet) atau sisa penamaan lama.
- **Urutan ascending penjualan** mungkin disengaja untuk mencocokkan urutan input, tapi untuk power user yang mengoreksi transaksi terbaru, descending lebih berguna. Perlu konfirmasi dari pemilik produk.
- **Milestone `urutan` 1 sampai 139** setelah 40 milestone disuntik. Field ini bekerja, tapi kalau someday dihapus dari tengah urutan, saya belum menguji apakah ada penomoran ulang otomatis.
- **Performa pada data yang jauh lebih besar** belum diuji. Angka saya berdasarkan 180 transaksi tambahan. Event yang berjalan sepanjang tahun dengan ribuan transaksi mungkin punya perilaku berbeda, dan perlu konfirmasi batas volumenya.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Kecepatan input transaksi | 2 | Nol `<form>`, nol Enter di 9 dari 9 form, fokus jatuh ke `BODY` tiap aksi, jarak 93 Tab antar seksi. Butuh mouse untuk setiap baris. |
| Kecepatan koreksi data | 2 | Tidak ada edit, duplikat, atau bulk di 10 tabel. Koreksi berarti hapus (tanpa konfirmasi) lalu ketik ulang. |
| Findability di data banyak | 2 | 192 baris tanpa pagination, halaman 28.618 px, nol pencarian di Layar Kerja dan Master Produk, nol sortable header. |
| Konsistensi model input | 2 | Tiga dropdown wallet beda urutan, satu dropdown beda label total, pill flowbar tidak cocok judul seksi, qty perlu klik "Simpan" sementara checkbox autosave. |
| P.keyboard & akses cepat | 2 | Nol shortcut, nol `tabindex`, nol `accesskey`, nol `input[type=search]`. Listener `keydown` hanya Escape untuk modal. |
| Konsistensi penyimpanan | 3 | Seksi 04 autosave dengan benar dan store menormalkan status kosong, tapi seksi 03 dan SPPD kehilangan input tanpa warning. |
| Performa | 4 | 180 transaksi tersimpan dalam 127 ms, render 19 ms untuk 3.495 node. Cepat secara teknis. |
| Kepercayaan pada angka | 2 | Harga penjualan diam-diam salah (BUG-01 dan BUG-02), "Saldo akhir" identik tampil 3× di satu halaman. Angka tampil benar, tapi input yang menuju angka itu bisa salah tanpa warning. |
| Alur mental workflow | 3 | Alur 8 seksi logis dan flowbar ada sebagai navigasi, tapi tidak ada link kembali, status lipatan hilang, dan nama seksi berbeda antara pill dan judul. |
| Keseluruhan untuk power user | 2 | Enam temuan TINGGI, tiga di antaranya merusak data secara diam-diam. Fungsinya lengkap untuk {{{memasukkan satu transaksi}}, tapi belum dioptimalkan untuk {{{banyak transaksi}}. |
