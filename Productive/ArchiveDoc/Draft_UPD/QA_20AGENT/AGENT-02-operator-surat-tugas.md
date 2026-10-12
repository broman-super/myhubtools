# AGENT-02 — Operator Surat Tugas

> **Persona:** Staf administrasi yang setiap hari membuat dan menelusuri SPPD untuk fieldwork; hafal prosesnya, tapi bukan programmer · **Fokus:** Seksi 01 SPPD & Dana Cair, status/lifecycle event, halaman detail event · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 6 |
| SEDANG | 8 |
| RENDAH | 4 |
| **Total** | **18** |

Secara visual seksi 01 itu rapi dan informatif. Kartu "Dana Cair" dengan angka "Sudah cair Rp 1.500.000 / Rp 2.500.000" persis
yang saya cari setiap pagi, dan chip per wallet ("Alokasi Bank Rp 2.250.000") sangat membantu.

Tapi saat saya pakai seksi 01 untuk pekerjaan nyata — baca status surat, betulkan angka, tandai uang sudah masuk — ada tiga hal
yang membuat saya pasti salah:

1. **Dropdown "Status Alur" selalu menulis "Draft".** Satu klik "Simpan SPPD" — tombol yang justru saya pakai untuk menyimpan
   nomor surat — diam-diam mengembalikan SPPD yang sudah **Disetujui** menjadi **Draft**.
2. **Semua aksi di seksi 01 mereset halaman.** Semua yang saya ketik tapi belum disimpan hilang tanpa peringatan, cukup karena
   saya salah klik dropdown status Dana Cair.
3. **Empat angka yang harus saling cocok berdiri sendiri-sendiri** (Dana Awal 2.500.000, total alokasi 2.850.000, total sumber
   dana 2.500.000, sudah cair 1.500.000) tanpa satu pun peringatan, padahal jelas berbeda.

Selain itu: form "Tambah Rute" tidak punya kolom biaya sampai dropdown Mode disentuh, hapus baris Dana Cair langsung hilang
tanpa konfirmasi, dan tombol "Hapus" di dialog konfirmasi ternyata tidak berfungsi sama sekali. Angka SPPD dan status persetujuan
bisa rusak tanpa saya sadari, dan saya baru tahu setelah mencetak atau beres rekonsiliasi.

Tidak ada temuan KRITIS: tidak ada data hilang permanen, tidak ada crash, dan aplikasi tetap bisa dipakai. Yang rusak adalah
**kepercayaan** — dan bagi operator, itu barang mahal.

## Environment yang dipakai

- Edge headless (`--headless=new --virtual-time-budget`), profil unik per run: `prof_a02`, `prof_a02b`, `prof_a02c`,
  `prof_a02d`, `prof_a02e`, `prof_a02f`, `prof_a02g`, `prof_a02i`, `prof_a02j`.
- Semua harness menjalankan `localStorage.clear()` **sebelum render pertama** aplikasi, jadi yang diuji benar-benar seed default.
- Rute yang diuji: `#/events/evt-1` (Pameran UMKM, SPPD disetujui — kasus utama), `#/events/evt-3` (SPPD selesai),
  `#/events/ev-d2` (SPPD diajukan), `#/events/ev-d5` (status disetujui), `#/events/evt-2` (tanpa record SPPD),
  `#/events` (daftar + filter status), `#/dashboard`, dan `A.printHTML()` untuk cetakan.
- Harness sudah dihapus setelah selesai. Tidak ada file aplikasi yang diubah — semua pengujian read-only.

## Temuan

### [BUG-01] Dropdown "Status Alur" SPPD selalu menampilkan "Draft" — satu klik Simpan menurunkan SPPD yang sudah disetujui — TINGGI

**Persona dan use-case:** pagi hari saya buka detail event yang SPPD-nya sudah disetujui atasan, untuk mencatat nomor surat final.
Saya klik "Simpan SPPD". Surat yang tadinya **Disetujui** berubah jadi **Draft**.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` (seed: `spp-1.status = "disetujui"`).
2. Lihat sub-judul seksi 01 — terbaca "SPPD **Disetujui** · 2 rute · Dana cair Rp 1.500.000".
3. Lihat dropdown "Status Alur" — sudah terbaca "Draft", bukan "Disetujui".
4. Isi atau koreksi field lain, lalu klik **Simpan SPPD** tanpa menyentuh dropdown itu.
5. Periksa `store.getSppd('evt-1').status`.

**Harapan:** dropdown menampilkan status yang tersimpan ("Disetujui"), dan menekan Simpan tidak mengubah status apa pun.

**Kenyataannya:** status di store berubah dari `disetujui` menjadi `draft`. Dropdown selalu `selectedIndex = 0`.

**Evidence:**
```
status di store          = disetujui
dropdown value           = "draft"
dropdown selectedIndex   = 0  (label: Draft)
ada option selected attr = 0
sesudah simpan: status   = draft
sesudah simpan: subjudul = SPPD Draft · 2 rute · Dana cair Rp 1.500.000
```
Dampaknya spreading ke beberapa tempat, semuanya terukur:
```
sebelum  hero checks = "✓ SPPD lengkap"
sesudah  hero checks = "• SPPD lengkap"
sebelum  seksi 07   = (tidak ada baris SPPD)
sesudah  seksi 07   = "SPPD belum disetujui"
```
Bukan hanya render pertama. Uji round-trip: pilih "Diajukan" lalu Simpan, store menjadi `diajukan`; buka lagi, dropdown
kembali `"draft"`. Pilih "Disetujui" lalu Simpan, store `disetujui`; buka lagi, dropdown `"draft"` lagi.

**Dampak ke pengguna awam:** ini temuan yang paling menakutkan untuk saya. Saya menyimpan SPPD yang sudah disetujui, dan
aplikasi memberitahu "SPPD belum disetujui" di seksi 07 — tanpa saya sadari bahwa saya sendiri yang menggeser status itu.
Kalau saya cetak SPPD atau menyusun laporan pertanggungjawaban, berkas saya menyatakan surat belum disetujui.
Perbaikannya cuma satu klik, tapi saya baru sadar setelah mencocokkan dengan surat fisikan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** render `<option>` dengan atribut `selected` dari `s.status`
(pola yang sudah dipakai benar di `eventModal` — `sel.value = ev.status`). Lebih baik lagi: ganti dropdown bebas dengan
alur tombol yang sesuai birokrasi ("Ajukan", "Setujui") plus konfirmasi saat menurunkan status, karena pemakaian nyata saya
status hanya naik: draft → diajukan → disetujui → selesai.

### [BUG-02] Semua yang diketik di form SPPD hilang tanpa peringatan begitu aksi apa pun di seksi 01 dijalankan — TINGGI

**Persona dan use-case:** saya isi sepertegi SPPD (nomor surat, kegiatan, tujuan, catatan), lalu ingin sekaligus menandai uang terminimal
1.000.000 sudah cair. Saya klik dropdown status Dana Cair. Seluruh ketikan saya hilang.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Ketik `#spp-no` = `777/SPPD/UKM/2026-SEDANGDIKETIK`, `#spp-kegiatan` = `PIC booth - ketik dulu`, `#spp-tujuan` = `Bali`.
3. Ubah dropdown `#ps-1 [data-action="danaCair:status"]` pertama ke "cair" (satu klik).
4. Lihat isi ketiga field.

**Harapan:** isian yang belum disimpan tetap ada, atau ada peringatan "ada perubahan yang belum disimpan".

**Kenyataannya:** ketiga field dikembalikan ke nilai lama dari store. Tidak ada dialog, tidak ada toast peringatan. Yang muncul
hanya toast biasa dari aksinya, atau tidak ada toast sama sekali untuk ubah status.

**Evidence:**
```
sebelum: no="777/SPPD/UKM/2026-SEDANGDIKETIK"  kegiatan="PIC booth - ketik dulu"  tujuan="Bali"
sesudah: no="039/SPPD/UKM/2026"                 kegiatan="Menjadi PIC booth UMKM"   tujuan="Bali — Denpasar"
```
Sama terjadi dengan `danaCair:add`: saya ketik `999/SPPD/UKM/2026-SEMENTARA` di `#spp-no`, klik "+ Catat Sumber Dana",
field balik ke `039/SPPD/UKM/2026`. Penyebabnya semua handler memanggil `A.reload()` (`actions.js:332, 345, 370, 377`) yang
menulis ulang seluruh `#app` dari store.

**Dampak ke pengguna awam:** ini pola kehilangan input paling yang akan saya alami. Tidak ada yang hilang permanen — data yang
sudah tersimpan tetap aman, sudah saya verifikasi setelah reload halaman semua data utuh — tapi saya mengulang ketikan panjang.
Kalau saya salah klik lagi, nomor surat yang saya ketik ulang bisa jadi berbeda. Untuk orang yang tidak terbiasa dengan
browser, ini terasa seperti "halamannya carelessly refresh sendiri".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** jangan reload seluruh halaman untuk aksi lokal — pakai
partial re-render hanya untuk kartu yang berubah (kartu Dana Cair, kartu Rincian Alokasi). Tambahkan penanda "perubahan
belum disimpan" di kartu SPPD, dan saat `A.reload()` dipanggil sementara form SPPD sedang dirty, tanyakan lebih dulu:
"Simpan perubahan SPPD?" atau "Buang perubahan?".

### [BUG-03] Empat angka yang harus saling cocok berdiri sendiri, dan saldo menghitung dari Dana Awal padahal ada dana belum cair — TINGGI

**Persona dan use-case:** pagi hari saya cuma perlu tahu, uang tasked sudah ditransfer atau belum. Kalau belum, saya jangan beli tiket dulu.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` dalam keadaan seed.
2. Baca kartu SPPD (Dana Awal = Rp 2.500.000), kartu Rincian Alokasi (Total alokasi = Rp 2.850.000), kartu Dana Cair
   (Sudah cair Rp 1.500.000 / Rp 2.500.000), dan baris "Kas tunai harian Rp 1.000.000 — belum".
3. Cari peringatan apa pun yang menghubungkan keempat angka.

**Harapan:** ada baris ringkas yang menjelaskan, misalnya "Rp 1.000.000 belum cair — jangan belanja dulu", dan selisih total
alokasi terhadap Dana Awal (+Rp 350.000) disebut sebagai selisih beserta artinya.

**Kenyataannya:** tidak ada satu pun peringatan. Yang tampil hanya empat angka terpisah di tiga kartu berbeda. Teks bahkan
berjanji: "Total bisa beda dari Dana Awal — selisihnya tampil di bawah dan di seksi 08" — tapi di seksi 01 tidak ada baris
selisih sama sekali (lihat BUG-12). Dua baris penutup kartu Rincian Alokasi reads: `Rp 2.850.000` langsung diikuti
`Rp 2.500.000`, tanpa selisih. Saya harus menghitung sendiri di kepala.

Yang lebih halus dan lebih berbahaya: **saldo tetap dihitung dari Dana Awal penuh**, padahal Rp 1.000.000 belum cair.
```
Dana Awal SPPD             = Rp 2.500.000
Dana sudah cair            = Rp 1.500.000
Dana belum cair            = Rp 1.000.000
saldo oleh aplikasi        = Rp 4.545.000
saldo koreksi (hanya cair) = Rp 3.545.000
peringatan "belum cair" di seksi 01? = TIDAK ADA
```
Kalau saya salah baca "Dana Awal Rp 2.500.000" sebagai "uang sudah ada di tangan", saya akan melaporkan saldo Rp 4.545.000
padahal yang benar-benar masuk cuma 1.500.000 — overstatement Rp 1.000.000.

**Dampak ke pengguna awam:** ini sumber kebingungan nomor satu saya. Kalau ada satu baris saja — "Belum cair: Rp 1.000.000,
sisa yang bisa dibelanjakan" — plus konfirmasi bahwa saldo memakai Dana Awal, saya tidak akan salah hitung. Untuk laporan
yang jadi bahan pertanggungjawaban, selisih Rp 1.000.000 ini bisa jadi temuan auditor.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** di kartu Dana Cair tambahkan baris "Belum cair: Rp …" dan
peringatan visual bila `sudahCair < Dana Awal`. Tambahkan blok konsistensi kecil di bawah kartu Rincian Alokasi yang menyebut
empat angka sekaligus beserta selisih antar mereka. Beri tanda jelas pada baris "Saldo akhir" bahwa itu berdasarkan **Dana Awal**,
bukan **Dana Cair** — atau tambahkan baris pembanding "Saldo (hanya dana yang sudah cair)".

### [BUG-04] Form "Tambah Rute" tidak punya kolom biaya sama sekali sampai dropdown Mode disentuh — TINGGI

**Persona dan use-case:** saya catat rute lapangan: berangkat Jakarta ke Denpasar, bayar lewat Bank. Saya mengisi yang terlihat dan
klik "Tambah Rute". Biaya tersimpan Rp 0.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, gulir ke blok Transportasi di seksi 01.
2. Lihat form "Tambah Rute" pada keadaan baru dibuka (`#tr-detail`).
3. Isi `#tr-leg` = Berangkat, `#tr-tgl` = 2026-04-22, `#tr-asal` = Jakarta, `#tr-tujuan` = Denpasar, `#tr-wallet` = Bank.
4. Klik **Tambah Rute** tanpa menyentuh dropdown `#tr-mode`.
5. Lihat baris rute yang baru.

**Harapan:** form selalu menampilkan kolom yang relevan — vendor, kendaraan, durasi, dan biaya sewa untuk mode sewa; atau
jenis tiket dan harga untuk mode tiket; atau km, tarif, bensin, dan tol untuk mode bensin — sesuai mode yang sedang terpilih.

**Kenyataannya:** blok detail biaya **kosong** saat halaman dibuka. Kolomnya baru dirender setelah event `change` pada dropdown
Mode. Artinya operator harus menebak bahwa harus menyentuh dropdown dulu.

**Evidence:**
```
#tr-detail.innerHTML      = ""   (kosong)
input di dalam #tr-detail = 0
select #tr-mode            = "sewa"   (label: "Sewa Kendaraan")
rute baru tersimpan        = Berangkat Jakarta->Denpasar biaya Rp 0 wallet Bank
detail rute baru           = {"vendor":"","jenisKendaraan":"","durasi":""}
setelah Mode disentuh: input = tr-jarak, tr-tarif, tr-biyasewa, tr-durasi
```
Dampaknya ke angka: rute Rp 0 ini masuk daftar dan tidak menambah realisasi Transport Umum (realisasi tetap Rp 1.350.000
dari seed), jadi tabel "Anggaran vs Realisasi" jadi punya baris nyasar. Tidak ada toast atau peringatan soal biaya nol.

**Dampak ke pengguna awam:** saya akan mengira biaya sudah tercatat padahal Rp 0. Saat opname lapangan atau saat menyusun
laporan, angka transportasinya terlihat janggal, dan saya baru sadar beberapa hari kemudian.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** panggil renderer kolom detail saat render halaman dengan mode
default yang sama dengan nilai `<select>`, dan setiap kali `A.transportFields(mode)` berubah — jangan hanya pada event change.
Tambahkan validasi: `totalBiaya <= 0` ditolak dengan pesan "Isi biaya terlebih dahulu" (pola yang sudah dipakai di
`danaCair:add` dan `transport:add` untuk rute asal dan tujuan).

### [BUG-05] Hapus baris Dana Cair, Alokasi, dan Transportasi langsung hilang, tanpa konfirmasi, tanpa undo — TINGGI

**Persona dan use-case:** saya salah klik tombol "Hapus" di baris Dana Cair. Record transfer instansi langsung hilang selamanya dari
catatan — tidak ada dialog, tidak ada tombol batal.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` → kartu Dana Cair.
2. Klik tombol **Hapus** pada baris pertama.
3. Lihat jumlah baris dan isi `#modal-root`.

**Harapan:** ada dialog konfirmasi ("Hapus sumber dana ini?") dan/atau tombol batal atau undo.

**Kenyataannya:** record langsung dihapus saat itu juga. Tidak ada dialog, tidak ada undo.

**Evidence:**
```
sebelum hapus (3 baris) : Transfer instansi (BCA) / 1500000 / cair
                          Kas tunai harian      / 1000000 / belum
                          Transfer Humans 1     / 9000000 / cair
sesudah hapus (2 baris) : Transfer instansi (BCA) / 1500000 / cair
                          Transfer Humans 1     / 9000000 / cair
modal konfirmasi?    = TIDAK
undo / tombol batal? = TIDAK ADA
```
Pola sama persis di `budget:delete` (baris Rincian Alokasi) dan `transport:delete` (baris Transportasi) — ketiganya memakai
`A.reload()` langsung tanpa `ui.confirm`. Bandingkan dengan `event:delete` yang **memakai** `ui.confirm`: inkonsistensi
di dalam aplikasi sendiri. Kebetulan baris yang dihapus adalah yang tampil paling atas, yaitu baris yang **belum** cair —
jadi justru record "uang yang belum masuk" yang paling mudah hilang tanpa disadari.

**Dampak ke pengguna awam:** saya kehilangan catatan "sudah saya terima DP 60% 1.500.000" dan tidak ada cara tahu bahwa ada
yang hilang. Kalau baris yang hilang adalah "Transfer instansi 1.500.000 cair", angka "Sudah cair" di kartu ikut turun tanpa
jejak — persis ketakutan saya: angka hilang diam-diam.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** bungkus ketiganya dengan `ui.confirm` yang menyebutkan nominal
dan sumber ("Hapus sumber dana 'Transfer instansi (BCA)' Rp 1.500.000?"), dan tampilkan toast Undo selama beberapa detik
setelah hapus. Prioritaskan konfirmasi untuk baris Dana Cair karena itu alat bukti.

### [BUG-06] Tombol "Hapus" pada dialog konfirmasi tidak berfungsi — tidak bisa hapus event, produk, atau reset data — TINGGI

**Persona dan use-case:** saya menguji alur "Hapus event" dari header. Dialog muncul, saya klik "Hapus" — tidak terjadi apa-apa. Saya
klik lagi — tetap tidak terjadi. Saya pusing, lalu harus pakai "Batal".

**Langkah reproduksi:**
1. Buka `#/events/evt-1` → klik tombol **Hapus event** di header.
2. Dialog konfirmasi muncul dengan tombol "Batal" dan "Hapus".
3. Klik tombol **Hapus** pada dialog.
4. Periksa `store.events().length` dan apakah dialog masih ada.

**Harapan:** event terhapus, dialog menutup, muncul toast "Event dihapus".

**Kenyataannya:** tidak ada yang terjadi. Dialog tetap terbuka. Jumlah event tetap. Tidak ada toast.

**Evidence dari jalur nyata, klik di UI:**
```
tombol di header      = Hapus event
dialog muncul?        = YA
tombol konfirmasi     = Hapus
setelah klik "Hapus"  : jumlah event 9 -> 9 | dialog masih terbuka? true
```
**Evidence dari isolasi `ui.confirm`:**
```
tombol dalam dialog           = modal:close/Batal , modal:ok/Hapus
key actions yang di-binding    = modalClose, modalOk
key actions yang dipakai di DOM = modal:close, modal:ok
klik tombol Hapus 3x -> callback dipanggil 0x, dialog masih ada? true
klik tombol Batal   -> dialog ditutup? true
```
Akar masalahnya: `js/ui.js:104-107` mendaftarkan `A.actions.modalClose` dan `A.actions.modalOk` dengan camelCase, padahal
DOM di `js/ui.js:101-102` memakai `data-action="modal:close"` dan `"modal:ok"`, dan `actions.js:109` mendefinisikan
`'modal:ok'` sebagai fungsi kosong dengan komentar "diganti oleh ui.confirm". Jadi semua dialog konfirmasi di aplikasi —
`event:delete`, `product:delete`, `master:catdel`, `data:reset` — punya tombol yang tidak melakukan apa pun.

**Dampak ke pengguna awam:** bukan "hapus tanpa konfirmasi" yang bahaya, tapi "konfirmasi yang tidak bisa dipakai" — operator
terjebak karena satu-satunya tombol yang bekerja adalah "Batal". Untuk prototipe yang bertujuan menguji alur, ini membuat
salah satu alur lifecycle paling penting (event selesai, arsip, hapus) mustahil diuji. Karena `data:reset` juga ikut
bermasalah, tidak ada cara pulih ke seed lewat tombol.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** samakan nama action-nya — entah `ui.confirm` memasang
`data-action="modalOk"` dan `"modalClose"`, atau `actions.js` mendefinisikan `'modal:ok'` dan `'modal:close'` sungguhan
sehingga `ui.confirm` cukup menulis callback ke registry yang sama. Tambahkan dukungan judul konfirmasi spesifik, agar
"Hapus event?" tidak sama dengan "Hapus produk?". Tutup dialog dari dalam callback.

### [BUG-07] Status event "diajukan" dan "disetujui" tidak ada di dropdown, sehingga status terhapus saat edit event — SEDANG

**Persona dan use-case:** saya perlu mengoreksi lokasi event (menambah nama gedung). Saya klik "Edit event", ubah lokasi, klik
"Simpan Perubahan". Statusnya hilang.

**Langkah reproduksi:**
1. Buka `#/events/ev-d2` (seed: `ev-d2.status = "diajukan"`, badge header "● Diajukan").
2. Klik "Edit event" — amati dropdown "Status".
3. Ubah **hanya** `#ev-lokasi`, lalu klik "Simpan Perubahan".
4. Periksa `store.getEvent('ev-d2').status`.

**Harapan:** status tetap "Diajukan".

**Kenyataannya:** `value` dropdown = `""` dengan `selectedIndex = -1`, dan `event:save` membaca nilai kosong itu, sehingga status
tersimpan `""`.

**Evidence:**
```
status awal dari store  = "diajukan"
badge header sebelum    = "● Diajukan"
#ev-status value        = ""  | opsi: draft, berjalan, selesai, dibatalkan
status sesudah di store = ""
status di localStorage  = ""
badge header sesudah    = "●"    (titik kosong tanpa label)
kartu di daftar         = "● "  (tidak match filter manapun)
```
Hal yang sama pada `ev-d5` (status `disetujui` menjadi `""`). Yang membuat ini bug dan bukan sekadar pilihan desain:
**kedua status itu ada di data seed**, tapi tidak punya tempat di dropdown. Setelah terhapus, event tidak lagi cocok dengan
filter chip mana pun (hanya "Semua"), dan laporan global ikut tidak menampilkannya sebagai status apa pun. Event dengan status
`berjalan` (evt-1) aman karena `berjalan` memang ada opsinya — sudah saya uji: `#ev-status` = "berjalan", status tetap
"berjalan" setelah simpan.

**Dampak ke pengguna awam:** status jadi titik kosong, "●" tanpa tulisan. Saya kira aplikasinya rusak, atau statusnya memang
tidak penting. Padahal status SPPD-nya sendiri masih utuh (`spp-d2.status = "diajukan"`), jadi dua informasi jadi tidak sinkron
dan saya tidak tahu mana yang benar.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** pastikan daftar opsi status event memuat seluruh nilai yang
mungkin ada di data (tambah `diajukan` dan `disetujui`, atau normalisasi ke satu kosakata — lihat BUG-17). Selain itu, di
`event:save`, kalau `ui.readVal('ev-status')` kosong, jangan menimpa status yang ada — pertahankan nilai lama dan beri toast.
Render status yang tidak dikenal sebagai badge "Tanpa status" dengan ikon tanya, bukan titik kosong.

### [BUG-08] Menandai Dana Cair "Cair" tidak mengisi tanggal, muncul baris kontradiktif "cair" plus "belum ada tanggal" — SEDANG

**Persona dan use-case:** transfer masuk hari ini. Saya ubah dropdown "Belum" menjadi "Cair". Baris jadi bertuliskan "cair" tapi tetap
menulis "belum ada tanggal", dan angka "Sudah cair" langsung melonjak.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` → kartu Dana Cair, baris "Kas tunai harian" (status `belum`, `tanggalCair` = `""`).
2. Ubah dropdown baris itu ke "Cair".
3. Baca teks baris dan ringkasan kartu.

**Harapan:** begitu ditandai Cair, tanggal cair terisi (default hari ini) atau minimal ada input tanggal di baris itu.

**Kenyataannya:** status berubah ke `cair`, `tanggalCair` tetap `""`, dan baris menampilkan dua informasi yang saling
bertentangan. Tidak ada toast apa pun. Statusnya bisa dibalik: `cair` ke `belum` juga berjalan.

**Evidence:**
```
sesudah belum->cair : status=cair | tanggalCair=""
toast saat ubah status? TIDAK — diam saja
teks baris di layar = "Kas tunai harian" "cair" "belum ada tanggal · Cair saat approval final" "Rp 1.000.000"
                      "Belum" "Cair" "Hapus"
ringkasan kartu     = "Sudah cair Rp 2.500.000 / Rp 2.500.000"
kontrol yang bisa diedit per baris = select status + tombol Hapus. Input tanggal, nominal, rekening = 0
```
Jadi ini bukan bug "tidak bisa dibatalkan", tapi bug "penandaan yang bisa salah dan tidak bisa dikoreksi tanpa hapus". Karena
baris yang sudah ada tidak punya kolom tanggal, satu-satunya cara mengisi tanggal adalah **hapus baris lalu tambah ulang** — dan
itu berarti kehilangan `catatan` (misalnya "DP 60%"), karena form tambah tidak punya field catatan, padahal display
menampilkannya.

**Dampak ke pengguna awam:** untuk keperluan bukti, "cair tanpa tanggal" tidak bernilai. Karena tidak ada konfirmasi, saya
bisa menandai Cair untuk nominal yang sebenarnya belum masuk hanya karena salah klik dropdown — dan angka "Sudah cair" ikut
berubah tanpa jejak.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** saat operator memilih "Cair" dan `tanggalCair` masih kosong,
isi default dengan tanggal hari ini, atau tampilkan input tanggal kecil di baris itu. Tambahkan toast ringkas yang menyebut
sumber dan nominal ("Transfer instansi (BCA) Rp 1.500.000 ditandai sudah cair"). Berikan kolom "Catatan" di form Tambah
Sumber Dana supaya tidak perlu hapus-tambah hanya untuk menambah keterangan.

### [BUG-09] Wallet baris alokasi tidak bisa diganti, default "Kas", dan terkunci "E-Money" setelah ganti kategori — SEDANG

**Persona dan use-case:** saya salah pilih wallet untuk alokasi Penginapan (pilih Kas, seharusnya Bank). Untuk memperbaikinya saya
harus hapus baris itu — dan hapus tidak punya konfirmasi.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` → kartu Rincian Alokasi.
2. Lihat kontrol per baris alokasi.
3. Tambah baris baru: Komponen = Penginapan, Alokasi = 900.000, Wallet = Kas.
4. Ubah Komponen ke `E-Money` — dropdown wallet berubah sendiri jadi E-Money — lalu ganti lagi Komponen ke `Uang Saku`
   tanpa menyentuh dropdown wallet.

**Harapan:** setiap baris punya kontrol Ubah (nominal, kategori, wallet, keterangan), dan pilihan wallet kembali netral saat
kategori diganti.

**Kenyataannya:** tiap baris hanya punya tombol **Hapus**. Tidak ada Ubah. Wallet form tambah default-nya **"Kas"**, bukan Bank,
padahan majority alokasi SPPD datang lewat transfer. Setelah kategori `E-Money` dipaksa ke wallet `E-Money`, mengganti
kategori lain **tidak mengembalikan** wallet ke default.

**Evidence:**
```
kontrol per baris alokasi : tombol = 5 | select edit wallet = 0
default dropdown wallet    = "Kas"  (opsi: Bank, QRIS, Kas, E-Money)
baris seed                 = Penginapan=Bank · Transport Umum=Bank · BBM & Tol=Kas · Uang Saku=E-Money · Kas Kecil=Kas
setelah pilih E-Money     : #bg-wallet = "E-Money"
setelah pilih Uang Saku   : #bg-wallet = "E-Money"   (lupa dikembalikan)
baris baru                 = Penginapan Rp 900.000 wallet=Kas
                             total alokasi naik 2.850.000 -> 3.750.000
cara koreksi               = hapus baris (tanpa konfirmasi) lalu tambah ulang
```
Catatan positif: `store.budgetWallet()` memang memaksa kategori `E-Money` ke wallet `E-Money`, dan wallet yang tidak dikenal
jatuh ke `Kas`. Ini benar dan sudah punya regression test di `check11.html`.

**Dampak ke pengguna awam:** kesalahan wallet di alokasi tidak bisa diperbaiki dengan satu klik, dan jalan satu-satunya
menghapus record yang mungkin sudah saya benarkan effort-nya. Salah wallet berarti laporan Arus Kas per Wallet menyesatkan —
bendahara dan operator sama-sama terdampak.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** ubah baris alokasi jadi bisa diedit inline — klik baris,
form edit dengan tombol Simpan dan Batal — atau tambahkan select wallet kecil per baris. Saat kategori berubah dari
`E-Money` ke kategori lain, kembalikan wallet ke default komponen itu. Pertimbangkan default wallet "Bank" untuk kategori
berbiaya besar (Penginapan, Sewa Transport, Transport Umum), dan simpan pilihan terakhir per kategori supaya input berikutnya
tidak salah lagi.

### [BUG-10] Nomor surat, tanggal terbit, dan Dana Awal tanpa validasi apa pun — SEDANG

**Persona dan use-case:** saya butuh surat yang nomornya benar dan tanggalnya masuk akal — tidak lebih baru dari event, dan nominalnya
tidak negatif.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Kosongkan `#spp-no` dan `#spp-tgl`, set `#spp-dana` = 0, lalu klik Simpan.
3. Isi `#spp-tgl` = 2027-12-31 (event 22–25 Apr 2026) dan `#spp-dana` = -500.000, lalu Simpan.
4. Isi `#spp-no` dengan `039`, `abc`, `039/SPPD/UKM/2026/9999`, lalu `  039  ` — Simpan tiap kali.
5. Beri SPPD evt-2 nomor yang sama dengan evt-1.

**Harapan:** ada validasi — nomor surat wajib diisi dan berformat, tanggal terbit tidak melewati tanggal mulai event,
Dana Awal lebih besar dari nol.

**Kenyataannya:** semuanya diterima begitu saja, tanpa toast error.

**Evidence:**
```
sesudah no="" tgl="" dana=Rp 0   -> toast "SPPD disimpan" (sukses!)
tanggal = 2027-12-31 (event 22-25 Apr 2026) | danaAwal = Rp -500.000
input.checkValidity() = false  (min=0 dilanggar, tetap tersimpan)
saldo jadi = Rp 1.545.000       (turun drastis gara-gara dana negatif)
kolom dikosongkan -> danaAwal = Rp 0  (diam-diam jadi nol)
input "039" -> "039" | "abc" -> "abc" | "039/SPPD/UKM/2026/9999" -> tersimpan | "  039  " -> "  039  "
jumlah SPPD bernomor sama = 2 (evt-1, evt-2)   peringatan duplikat = TIDAK ADA
placeholder di form = "mis. 039/SPPD/2026"  (tidak sama dengan format seed/nyata)
```
Detail teknis yang menarik: atribut `min="0" step="500"` di `ui.moneyInput` **tidak dipakai** — karena tidak ada `<form>`
submit, `checkValidity()` mengembalikan `false` tapi `ui.num()` tetap membaca nilainya. Jadi atribut HTML itu kosmetik saja;
proteksi yang saya kira ada sebenarnya tidak ada. Kolom yang dikosongkan pun **diam-diam jadi Rp 0**, bukan ditolak.

**Dampak ke pengguna awam:** saya sering mengetik angka yang salah digit — 250.000 versus 2.500.000 — dan tidak ada yang
menegur. Kalau tanggal terbit atau nomor surat kosong, berkas tetap tercetak dengan kosong, dan saat diperiksa baru ketahuan.
Nomor kembar antar event sangat mungkin, karena tiap surat PIC memang diberi nomor dari pusat.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** blok simpan bila `noSurat` kosong dengan pesan spesifik
("Nomor surat wajib diisi"); beri pola dan saran format (misalnya `NNN/SPPD/<SINGKAT>/<TAHUN>`) dan normalisasi spasi;
peringatkan, bukan blokir, kalau `tanggalTerbit > tanggalMulai` event; cek duplikasi nomor surat di seluruh event dan
tawarkan "nomor ini sudah dipakai event X"; tolak `danaAwal <= 0` dengan pesan; samakan placeholder dengan format yang
benar-benar dipakai (`039/SPPD/UKM/2026`).

### [BUG-11] Field "Realisasi" SPPD adalah tulis-tanpa-baca — begitu checkbox dimatikan, nilainya hilang dari seluruh aplikasi — SEDANG

**Persona dan use-case:** saya mengisi realisasi untuk laporan pertanggungjawaban akhir. Karena saya cuma perlu tahu sisa dana, saya
matikan checkbox-nya. Sekarang angka itu tidak ada di mana pun.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, centang "Tampilkan realisasi" → klik "Simpan SPPD".
2. Isi `#spp-realisasi` = `7777777` → Simpan.
3. Buka lagi seksi 01: input masih ada dan nilainya tampil.
4. Matikan checkbox "Tampilkan realisasi" → Simpan.
5. Cari angka `7.777.777` di seluruh halaman, lalu di cetakan (`A.printHTML`).

**Harapan:** nilai realisasi tetap terlihat di laporan atau cetakan, atau minimal ada konfirmasi sebelum disembunyikan.

**Kenyataannya:** nilai tetap di database (`store.sppd.realisasi = 7777777`) tapi tidak muncul di halaman mana pun setelah
checkbox dimatikan, dan **tidak pernah** masuk ke cetakan — meskipun nilainya sudah saya isi.

**Evidence:**
```
nilai di store                        = 7777777
input tampil setelah simpan           = true, nilai 7777777
token "7.777.777" utuh di halaman     = false
setelah checkbox dimatikan: nilai store = 7777777 | input #spp-realisasi = tidak ada
token "7.777.777" di halaman           = false   | di cetakan = false
blok <h2> di cetakan = Event, SPPD, Transportasi, Pengeluaran Lain, Arus Kas per Wallet,
                      Anggaran vs Realisasi per Komponen, Alokasi per Wallet Tujuan
```
Perlu jujur soal batasnya: nilai Realisasi di level SPPD ini memang **tidak dipakai perhitungan apa pun** — `financeSummary`
menghitung realisasi sendiri dari transport plus pengeluaran. Jadi kalau checkbox dimatikan, angka itu jadi arsip mati yang
tidak bisa diaudit dan tidak bisa dicetak.

**Dampak ke pengguna awam:** saya percaya sudah mencatat realisasi Rp 7.777.777, lalu laporan yang dicetak tidak memuatnya.
Kalau angka itu penting saat audit, saya harus mengingat-ingat angkanya dari kepala — padahal itu justru yang paling sering
ditanyakan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** jadikan "Realisasi SPPD" angka yang benar-benar dipakai
(dibandingkan dengan Dana Awal dan Dana Cair), tampilkan sebagai baris di seksi 08 dan di cetakan — misalnya "Realisasi
tercatat (manual): Rp … · Realisasi sistem: Rp … · selisih: …". Kalau memang tidak dipakai, hapus fieldnya dari form agar
tidak ada data menggantung, atau beri label jelas "hanya catatan, tidak masuk perhitungan".

### [BUG-12] Rincian Alokasi menjanjikan "selisihnya tampil di bawah", tapi seksi 01 tidak pernah menampilkannya — SEDANG

**Persona dan use-case:** saya butuh tahu kenapa total alokasi (Rp 2.850.000) tidak sama dengan Dana Awal (Rp 2.500.000) — apakah
salah input, atau memang ada pos yang tidak ada di Dana Awal.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` → kartu "Rincian Alokasi SPPD".
2. Baca kalimat penjelasan di bawah judul.
3. Lihat dua baris penutup kartu dan cari angka selisihnya.

**Harapan:** ada baris seperti "Selisih vs Dana Awal: +Rp 350.000 (alokasi rinci lebih besar dari Dana Awal)".

**Kenyataannya:** teks mengandung janji, tapi baris selisih tidak ada. Yang tampil hanya dua angka bersebelahan. Di seksi 08
barisnya **ada** — jadi informasinya sebenarnya sudah ada di aplikasi, cuma tidak di tempat yang dijanjikan.

**Evidence:**
```
kalimat penjelasan = "Total bisa beda dari Dana Awal — selisihnya tampil di bawah dan di seksi 08."
teks penutup kartu = "Total alokasi rinci" "Rp 2.850.000" "Dana Awal SPPD" "Rp 2.500.000" "Tambah Alokasi per Komponen"
ada baris selisih di antaranya? TIDAK — langsung "Dana Awal SPPD"
seksi 08 menulis selisih = DanaAwal 2.500.000 / selisih "+ Rp 350.000"
chip per wallet = Alokasi Bank Rp 2.250.000 | Alokasi Kas Rp 350.000 | Alokasi E-Money Rp 250.000
```
Catatan: angka 350.000 memang muncul di kartu, tapi itu chip **"Alokasi Kas"** (BBM dan Tol 150.000 + Kas Kecil 200.000),
sama besar kebetulan dengan selisihnya. Jadi operator yang cepat mata bisa salah baca chip itu sebagai penjelasan selisih.

**Dampak ke pengguna awam:** Rp 350.000 selisih akan saya bawa ke rapat tanpa tahu itu disengaja atau salah ketik, karena
tidak ada yang mengatakannya. Untuk SPPD yang jadi alat pertanggungjawaban, ini sumber kebingungan yang mahal.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** tambahkan baris selisih di seksi 01 dengan warna sesuai tanda,
dan satu kalimat penjelasan — misalnya "Selisih +Rp 350.000 — total alokasi rinci lebih besar dari Dana Awal. Periksa
apakah ada pos yang belum disetujui atasan." Kalau selisih nol, tulis "Total alokasi sama dengan Dana Awal." Sama persis
dengan yang sudah ada di seksi 08, supaya tidak ada dua penjelasan berbeda.

### [BUG-13] Membuka aplikasi saja menulis record SPPD kosong ke localStorage untuk event yang belum punya SPPD — SEDANG

**Persona dan use-case:** saya scroll daftar event, satu event (Gelar UMKM Kota 2026) jelas belum punya SPPD sama sekali. Saya tidak
sengaja membuat SPPD-nya.

**Langkah reproduksi:**
1. `localStorage.clear()`, lalu jalankan aplikasi (route default = Dashboard).
2. Tidak melakukan klik, tidak mengisi form apa pun.
3. Periksa isi `sppd_toolbox_db_v2`.

**Harapan:** hanya membaca data tidak mengubah apa pun. Record SPPD lahir hanya saat operator benar-benar membuat.

**Kenyataannya:** record SPPD kosong untuk `evt-2` langsung ditulis ke localStorage hanya karena halaman dirender. Penyebabnya
`store.getSppd()` membuat record kalau tidak ada (`store.js:384`) dan langsung menyimpan. Dengan `getSppd()` dipanggil dari
`globalReports()` → `financeSummary()` untuk **semua** event, cukup membuka Dashboard sudah cukup untuk memicu.

**Evidence:**
```
sebelum boot render        : kosong
route saat boot            = (kosong -> dashboard)
localStorage setelah boot  : tertulis, 54931 karakter
jumlah record sppd di memori = 9 untuk 9 event
evt-2 punya record SPPD?   = true   (seed aslinya tidak punya)
isi record yang dibuat     = {"id":"id-muoda95f-f4xxgy","noSurat":"","tanggalTerbit":"","status":"draft",
                              "danaAwal":0,"budget":[]}
```
Detail tambahan: `store.load()` sendiri **tidak** menulis ke localStorage, hanya `save()` yang menulis — jadi pembuatan record
ini benar-benar terjadi saat render, bukan saat seed.

**Dampak ke pengguna awam:** tidak berisik dan tidak merusak, tapi berarti data "yang saya buat" dan "yang aplikasi buat
sendiri" tercampur. Kalau nanti ada laporan "berapa SPPD yang sudah dibuat", angka itu terlalu tinggi. Dan saat saya membuka
seksi 01 event itu, formnya sudah terisi `status: draft` — seolah saya sudah pernah mengisinya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** pisahkan fungsi baca dan tulis — sediakan
`getSppdReadonly(eventId)` yang mengembalikan objek default **tanpa** menyimpan, dan pakai `getSppd()` yang menyimpan
hanya dari handler aksi. Alternatifnya: jangan simpan record kosong; biarkan `danaAwal: 0` dan `status: 'draft'` dihitung di
memori saja sampai ada satu penyimpanan pertama.

### [BUG-14] Form SPPD tidak punya kolom nama petugas dan NIP, dan cetakan tidak memuat tanggal terbit, instansi, status, serta rincian dana cair — SEDANG

**Persona dan use-case:** saya ingin berkas yang bisa langsung saya serahkan: siapa petugasnya, suratnya tanggal berapa, sudah cair
atau belum per transfer.

**Langkah reproduksi:**
1. Daftar seluruh kontrol input di seksi 01 (`#ps-1 input, select, textarea`).
2. Cari label "nama petugas", "NIP", "pegawai", "jabatan", "lama perjalanan", "jumlah hari", "no rekening".
3. Lihat field SPPD di model data.
4. Panggil `A.printHTML(evt-1)` dan cari tanggal terbit, instansi, status SPPD, rincian dana cair per sumber.

**Harapan:** surat tugas memuat nama petugas, NIP, jabatan; dan cetakan memuat tanggal terbit, instansi, status SPPD,
serta rincian Dana Cair per sumber.

**Kenyataannya:** model SPPD hanya punya 14 field dan **tidak ada satupun** identitas petugas. Checklist bawaan memang memuat
item "Data instansi dan NIP lengkap" — jadi NIP dianggap penting, tapi tidak ada kolom untuk mengisinya. Di cetakan, tanggal
terbit dan instansi tidak ada; status SPPD tidak ada; hanya ada total "Dana sudah cair" tanpa rinciannya.

**Evidence:**
```
id kontrol di seksi 01 = spp-no, spp-tgl, spp-tujuan, spp-kegiatan, spp-instansi, spp-status, spp-dana,
                         spp-tampilreal, spp-catatan, bg-*, dc-*, tr-*
                         (tidak ada satu pun field identitas petugas)
label "nama petugas" ada? TIDAK   | "nip": TIDAK   | "pegawai": TIDAK   | "petugas": TIDAK
label "jabatan" ada? TIDAK         | "lama perjalanan": TIDAK | "jumlah hari": TIDAK | "no rekening": TIDAK
field SPPD di model = id, eventId, noSurat, tanggalTerbit, tujuan, kegiatan, instansi, status, danaAwal,
                      realisasi, tampilkanRealisasi, linkDokumen, catatan, budget
--- cetakan ---
tanggalTerbit di store = 2026-04-05 | ada di cetakan? TIDAK
status SPPD di store   = disetujui   | ada di cetakan? TIDAK
instansi di cetakan    = TIDAK
rincian dana cair per sumber di cetakan? TIDAK — hanya total "Dana sudah cair"
blok tanda tangan      = "Mengetahui, ______________"  (tanpa kolom Pemberi Tugas atau PIC)
```
**Dampak ke pengguna awam:** sebagai staf administrasi, **nama petugas adalah isi surat yang paling wajib**. Kalau saya
cetak dari sini, lembarnya tidak bisa dipakai sebagai surat tugas — cuma rekap angka. Saya harus menggabungkan dengan cetakan
dari sistem lain secara manual, dan itu bagian yang paling rawan salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** tambahkan blok "Pejabat dan Petugas" di kartu SPPD — nama,
NIP, jabatan, nama pemberi tugas, nomor rekening tujuan, lama perjalanan (jumlah hari) — minimal satu field "Nama Petugas"
yang wajib. Masukkan blok ini ke `printHTML` bersama Tanggal Terbit, Instansi, Status SPPD, dan tabel rincian Dana Cair
per sumber (sumber, rekening, tanggal cair, status). Tambahkan blok tanda tangan "Pemberi Tugas" di samping "Mengetahui".

### [BUG-15] Urutan baris Dana Cair: yang belum bertanggal tampil paling atas — RENDAH

**Persona dan use-case:** saya scan daftar sumber dana untuk cari yang masih tertinggal.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` → kartu Dana Cair.
2. Baca urutan baris dari atas.

**Harapan:** urut berdasarkan tanggal cair, atau setidaknya yang sudah Cair di atas.

**Kenyataannya:** baris tanpa `tanggalCair` diurutkan lebih dulu, karena string kosong lebih kecil dari `'2026-04-05'`.
Jadi "Kas tunai harian — belum" berada di atas "Transfer instansi (BCA) — cair 05 Apr".

**Evidence:**
```
1. Kas tunai harian       belum | select=belum | tanggal="belum ada tanggal · Cair saat approval final"
2. Transfer instansi (BCA) cair | select=cair  | tanggal="BCA — 8910 · cair 2026-04-05 · DP 60%"
```
Efek sampingnya: tombol Hapus pertama yang saya klik adalah baris yang **belum** cair (lihat BUG-05).

**Dampak ke pengguna awam:** urutan yang tidak kronologis membuat saya salah simpul mana yang paling lama tertinggal.
Tidak fatal, tapi membuat kerjaan lambat.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** urutkan dengan belum-cair sebagai penguat — yang sudah cair dulu
berdasarkan tanggal — atau tambah pengurut dengan label status sebagai kolom pertama: "Sudah cair" sebelum "Belum cair".

### [BUG-16] Status lipatan tiap seksi hilang setiap kali halaman di-render ulang — RENDAH

**Persona dan use-case:** saya melipat seksi 04 sampai 08 supaya tinggal satu kolom SPPD yang kelihatan, lalu lanjut mengetik di
seksi 01 — semua seksi terbuka lagi.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, klik tombol lipat `#ps-1`.
2. Amati: `class="psec closed"`.
3. Jalankan aksi apa pun yang memanggil `A.reload()` (misalnya `sppd:save`).

**Harapan:** kondisi terlipat bertahan.

**Kenyataannya:** `psec:toggle` hanya melakukan `classList.toggle` tanpa menyimpan apa pun, jadi setiap render mengembalikan
semua seksi terbuka.

**Evidence:**
```
setelah klik fold   = class "psec closed"
setelah A.reload()  = class "psec"
psec:toggle menyimpan state? TIDAK (hanya classList.toggle di actions.js:567)
```
Catatan: tinggi body tetap 1702px pada keenam pengukuran, jadi ini murni soal state, bukan soal layout.

**Dampak ke pengguna awam:** sekadar mengganggu, bukan fatal. Tapi untuk orang yang bekerja dengan satu kolom SPPD sambil
mengecek bagian lain, lipatan yang selalu terbuka membuat halaman jadi sangat panjang dan sulit dipindai.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** simpan status lipatan per seksi di memori
(`A.psecClosed = { 'ps-1': true }`) dan terapkan saat render, supaya tidak hilang saat `A.reload()`.

### [BUG-17] Dua kosakata status yang berbeda antara Event dan SPPD — RENDAH

**Persona dan use-case:** saya bilang "SPPD-nya sudah diajukan" ke atasan, lalu buka filter status event dan tidak ada kategori yang cocok.

**Langkah reproduksi:**
1. Bandingkan isi dropdown `#ev-status` (modal Edit Event) dengan `#spp-status` (seksi 01).

**Harapan:** satu kosakata status untuk seluruh aplikasi, atau minimal tiap kosakata ada penjelasan bedanya.

**Kenyataannya:** hanya dua nilai yang sama.

**Evidence:**
```
pilihan status EVENT = draft, berjalan, selesai, dibatalkan
pilihan status SPPD  = draft, diajukan, disetujui, selesai
hanya sama           = draft, selesai
```
Akibatnya status `diajukan` dan `disetujui` yang ada di data seed untuk event tidak bisa dipilih (BUG-07), dan "berjalan"
atau "dibatalkan" tidak bisa dipakai untuk SPPD.

**Dampak ke pengguna awam:** saya harus menghafal dua istilah berbeda; kalau salah pilih, saya mengira SPPD yang salah
statusnya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** pilih satu kosakata dan pakai di dua tempat — misalnya
`draft → diajukan → disetujui → selesai` untuk keduanya, dengan `berjalan` dan `dibatalkan` sebagai status event tambahan yang
punya arti jelas (event berjalan tanpa SPPD disetujui). Tambahkan teks bantuan satu kalimat di bawah dropdown yang menjelaskan
arti tiap status.

### [BUG-18] Angka "aneh" diterima diam-diam, dan kolom dikosongkan berubah jadi Rp 0 — RENDAH

**Persona dan use-case:** saya ingin input seksi 01 aman dari salah ketik angka.

**Langkah reproduksi:**
1. Isi `#spp-dana` = `2500550` → Simpan → cek validitas input.
2. Kosongkan `#spp-dana` → Simpan → cek nilai Dana Awal.

**Harapan:** input di luar kelipatan 500 atau kosong ditolak, atau diberi tanda.

**Kenyataannya:** `step="500"` dan `min="0"` **tidak ditegakkan** — karena tidak ada `<form>` submit, atribut HTML hanya
dipakai browser sebagai tampilan. Nilai sembarang langsung tersimpan; kolom kosong jadi 0 tanpa pesan.

**Evidence:**
```
danaAwal = Rp 2.500.550 | validitas input = false  (nilai tetap tersimpan)
kolom dikosongkan -> danaAwal = Rp 0 (diam-diam jadi nol)
```

**Dampak ke pengguna awam:** nominal yang aneh tidak pernah ditolak. Untuk SPPD, nominal biasanya harus kelipatan tertentu
(misalnya 5.000 atau 10.000), jadi angka ganjil seperti Rp 2.500.550 adalah tanda salah ketik yang bagus kalau ditangkap.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** validasi manual di `sppd:save` dan form lain: nominal harus lebih
besar dari nol, harus kelipatan 1.000 (atau kelipatan yang lazim), dan beri toast kalau dilanggar — jangan bergantung pada
`min` dan `step` yang tidak ditegakkan. Untuk kolom kosong, tahan nilai lama dan beri toast "Isi Dana Awal dulu", alih-alih
diam-diam jadi nol.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Kartu "Dana Cair" persis menjawab pertanyaan harian saya.** Angka "Sudah cair Rp 1.500.000 / Rp 2.500.000" ada di
  kanan atas kartu, selalu terlihat tanpa harus klik. Status tiap sumber punya badge hijau "cair" atau abu "belum" yang cepat
  dibaca sekilas, dan teks baris selalu menyebut rekening, tanggal cair, dan catatan ("BCA — 8910 · cair 2026-04-05 · DP 60%").
- **Select "Belum/Cair" langsung tersimpan dan bisa dibalik.** Sudah saya uji dua arah, keduanya bekerja. Untuk satu perubahan
  status ini sudah ideal — tinggal ditambah konfirmasi visual dan tanggal default.
- **Sub-judul seksi 01 sangat berguna sebagai kartu identitas berkas:** "SPPD Disetujui · 2 rute · Dana cair Rp 1.500.000".
  Saya bisa tahu posisi berkas tanpa scroll.
- **Chip alokasi per wallet** ("Alokasi Bank Rp 2.250.000", "Alokasi Kas Rp 350.000", "Alokasi E-Money Rp 250.000") sangat
  membantu rekonsiliasi cepat, dan warnanya konsisten dengan tabel seksi 08.
- **Badge wallet konsisten di seluruh aplikasi** (Bank biru, QRIS hitam, Kas hijau, E-Money merah) — saya bisa memastikan
  dompet mana yang terpakai hanya dari warna.
- **Normalisasi `wallet` saat `load()` dan `importJSON()`** mencegah data lama rusak: kategori `E-Money` selalu dipaksa ke
  wallet `E-Money`, dan wallet yang tidak dikenal jatuh ke `Kas`. Ini bahkan sudah punya regression test di `check11.html`
  (21 assert, semua lulus) — fondasi pengaman datanya sudah benar.
- **Total realisasi sengaja tidak menjumlahkan baris `E-Money`** supaya tidak dobel hitung, dan seksi 08 menjelaskannya di
  teks. Penjelasan yang jarang dilakukan aplikasi nascent.
- **Perhitungan "sudah cair" benar-benar memakai status, bukan tanggal.** `financeSummary` memisahkan `danaCairTotal`
  (semua sumber) dan `danaCair` (yang `status === 'cair'`). Jadi kalau saya menandai Cair, angkanya benar-benar berubah.
- **Validasi dasar di form tambah sudah cukup.** `danaCair:add` menolak sumber kosong ("Sumber dana wajib diisi") dan nominal
  nol ("Nominal harus lebih dari 0"); `budget:add` menolak alokasi nol atau negatif dan kategori kustom kosong;
  `transport:add` rute asal dan tujuan kosong. Pola toast error ini sudah benar dan tinggal dipakai lebih luas (BUG-10, BUG-04).
- **Persistensi localStorage kokoh.** Setelah banyak aksi — tambah dan hapus Dana Cair, tambah alokasi, tambah rute, ganti
  status berulang kali — lalu reload halaman, semua data tersimpan utuh di `sppd_toolbox_db_v2`:
  `spp-1 no="039/SPPD/UKM/2026" status=disetujui danaAwal=2500000`, `danaCair evt-1` 2 baris, `transports evt-1` 2 rute.
  Yang hilang hanya input yang belum disimpan (BUG-02) — bukan data yang sudah disimpan.
- **Bahanya memakai istilah birokras yang benar** ("Surat Perjalanan Dinas", "Diajukan", "Pertanggungjawaban", "Kas Kecil",
  "Sisa Dana"), dan ada halaman Panduan yang menjawab "Apa itu dana awal, dana cair, dan realisasi?". Untuk operator baru ini
  menghemat waktu banyak.
- **Cetakan sudah punya fondasi yang benar:** blok `<h2>SPPD</h2>` memuat No, Tujuan, Kegiatan, Dana awal; tabel "Anggaran vs
  Realisasi per Komponen" dengan baris "Selisih (Total alokasi - Dana Awal) +Rp 350.000" dan "Dana sudah cair" sudah ada.
  Yang kurang cuma beberapa baris (BUG-14) — bukan bikin dari nol.

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah "Status Alur" SPPD boleh diubah dua arah?** Kalau alurnya satu arah (draft → diajukan → disetujui → selesai),
  kontrolnya harusnya tombol "Ajukan" dan "Setujui" dengan konfirmasi, bukan dropdown bebas. Perlu keputusan produk.
- **Apakah selisih total alokasi terhadap Dana Awal itu boleh ada?** Seed evt-1 punya selisih +Rp 350.000. Kalau di dunia
  nyata selisih tidak boleh, seednya yang perlu dikoreksi; kalau boleh, selisihnya sebaiknya jadi peringatan di seksi 01,
  bukan catatan di seksi 08 saja.
- **Saldo harus pakai Dana Awal atau Dana Cair?** Sekarang memakai Dana Awal, padahal Rp 1.000.000 belum cair. Ini
  keputusan bendahara, bukan bug semata — tapi hasilnya berbeda Rp 1.000.000, jadi harus disepakati dan ditulis di Panduan.
- **Apakah `evt-2` (Gelar UMKM Kota 2026) sengaja tidak punya record SPPD di seed?** Kalau ya, efek samping pencatatan
  otomatis di BUG-13 perlu diperbaiki.
- **Apakah status event `diajukan` dan `disetujui` di `ev-d2` dan `ev-d5` sisa kosakata SPPD yang tidak sengaja, atau status
  event yang sah?** Kalau sah, dropdownnya yang salah; kalau tidak, seednya yang perlu dibersihkan.
- **Apakah "Realisasi" level SPPD (BUG-11) seharusnya dipakai perhitungan, atau cukup dihapus dari form?**
- **Siapa yang boleh menghapus, dan seberapa berat konfirmasinya?** Saat ini "Hapus event" ada konfirmasi (meskipun tombolnya
  rusak), sedangkan hapus baris Dana Cair tidak ada sama sekali. Perlu aturan tingkat: mana yang wajib konfirmasi, mana
  yang boleh undo.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Kesesuaian dengan cara kerja surat tugas | 2 | Ada nomor surat, tanggal, tujuan, kegiatan, instansi, Dana Awal, dan status — tapi **tidak ada nama petugas atau NIP**, padahal itu isi surat yang paling wajib. Checklist bawaan sendiri menyebut "Data instansi dan NIP lengkap" tapi tidak ada kolomnya. |
| Kemampuan menjawab "sudah cair atau belum?" | 4 | Kartu Dana Cair sangat jelas: "Sudah cair Rp 1.500.000 / Rp 2.500.000", badge per sumber, rekening, tanggal, dan catatan. Ini bagian yang paling sering saya pakai dan paling jarang mengecewakan. |
| Kepercayaan pada angka | 2 | Empat angka (Dana Awal 2.500.000, alokasi 2.850.000, total dana 2.500.000, sudah cair 1.500.000) tidak saling mengunci tanpa peringatan; saldo dihitung dari Dana Awal padahal Rp 1.000.000 belum cair; rute bisa tersimpan Rp 0; Dana Awal bisa jadi negatif atau Rp 0. |
| Kesalahan ketik dan apa yang terjadi | 2 | Status SPPD bisa turun sendiri ke Draft hanya karena saya klik "Simpan SPPD"; semua isian yang belum disimpan hilang begitu saya menyentuh dropdown lain; nomor surat kosong atau kembar tidak ditolak. |
| Kemampuan memperbaiki salah input | 2 | Tidak ada tombol Ubah di mana pun — baris Alokasi, Dana Cair, Transportasi. Satu-satunya jalan adalah Hapus, dan Hapus berjalan tanpa konfirmasi. Dialog konfirmasi yang ada tombolnya justru tidak berfungsi. |
| Ketahanan data setelah reload | 4 | Sudah diuji: setelah banyak aksi dan reload, semua data di `sppd_toolbox_db_v2` utuh. Yang hilang cuma input yang belum disimpan — itu masalah UX, bukan storage. |
| Kejelasan istilah dan bahasa | 4 | Semua memakai istilah birokras yang saya kenal, dan Panduan menjelaskan "apa itu dana awal, dana cair, dan realisasi". Tinggal ditambah penjelasan soal status yang sekarang ambigu. |
| Kecepatan mencari jawaban | 3 | Sub-judul seksi dan hero "Progres persiapan" sangat membantu, tapi state lipatan selalu hilang (BUG-16) dan halaman jadi sangat panjang, jadi saya sering harus scroll jauh. |