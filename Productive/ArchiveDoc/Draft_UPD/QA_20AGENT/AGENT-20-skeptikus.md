# AGENT-20 - Sang Skeptikus

> **Persona:** Curiga, uji batas, cari celah -- saya tidak percaya aplikasi ini sampai angkanya benar sendiri - **Fokus:** recoverability, konsistensi rumus uang, validasi input, dan kejujuran UI - **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 2 |
| TINGGI | 8 |
| SEDANG | 8 |
| RENDAH | 4 |
| **Total** | **22** |

Kesimpulan: SPPD Toolbox secara visual rapi dan seed demo-nya benar-benar terisi
(9 event, 8 produk, 24 checklist per event), tapi fondasinya rapuh di dua hal yang
paling mahal: **localStorage yang tidak lengkap bisa membuat aplikasi mati total
dan tidak punya jalan keluar** (layar putih permanen), dan **impor backup bisa
menghapus seluruh isi aplikasi**. Di luar itu, tabel uang punya beberapa angka
yang berbeda satu sama lain tanpa rekonsiliasi (Rp 2.045.000 vs Rp 4.545.000),
blok "Bandingkan" salah hitung Rp 1.025.000, dan input negatif di mana saja
diterima tanpa satu pun peringatan -- termasuk harga jual negatif yang tercatat
sebagai penjualan. Yang paling menyebalkan dari sisi skeptis: hampir semua
keluhan aplikasi ini muncul sebagai angka yang terlihat "wajar", bukan
sebagai pesan error. Pengguna biasa tidak akan pernah tahu ada yang salah.
Yang sudah membebaskan dari tuduhan: JSON rusak di localStorage justru pulih ke
seed, dan identitas `Alokasi - Realisasi = Sisa` terbukti konsisten.

## Environment yang dipakai

- Edge headless (`--headless=new --dump-dom`), profil unik per run di
  `%TEMP%\opencode\prof_a20_*`, `localStorage.clear()` di awal (kecuali uji boot).
- Rute yang diuji: `#/dashboard`, `#/events`, `#/events/evt-1` (semua 8 seksi
  Layar Kerja), `#/events/ev-d2`, `#/events/ev-d5`, `#/events/ev-d6`,
  `#/products`, `#/master`, `#/reports`, `#/settings`, plus `printHTML()` dan
  `report:global` (jendela cetak).
- 10 harness: `a20_core`, `core2` sampai `core9` (fungsional), `a20_boot`
  (6 payload localStorage rusak diuji diMUAT ULANG dari nol, bukan lewat setter).
- Data seed yang dipakai sebagai pembanding: Dana Awal 2.500.000 / Budget
  2.850.000 / Realisasi 1.910.000 / Penjualan 3.480.000 / Transport 1.440.000 /
  Pengeluaran 470.000 / Penyesuaian kas +475.000 / Saldo 4.545.000.

## Temuan

### [BUG-01] Aplikasi mati total (layar putih permanen) kalau localStorage-nya tidak lengkap - severity: KRITIS

**Persona dan use-case:** Bettari, bendahara events, membuka aplikasi di komputer
bersama. Data lokalStorage pernah ditulis sebagian (mis. oleh versi sebelumnya,
oleh ekstensi browser, atau oleh proses yang kehabisan ruang saat menulis).
Bettari cuma mau membuka "#/events".

**Langkah reproduksi:**
1. Tulis `localStorage["sppd_toolbox_db_v2"] = {"events":[]}` (JSON valid, field
   `sppd` tidak ada) lalu muat ulang `index.html`.
2. Ulangi dengan `{"sppd":[]}` (field `events` tidak ada).
3. Ulangi dengan `{"events":[{"id":"x1","nama":"Event Tanpa Sppd"}],"sppd":[]}`.

**Harapan:** Aplikasi memvalidasi database saat boot, memulihkan field yang
hilang, atau minimal menampilkan pesan "data rusak, klik Pulihkan Data".

**Kenyataannya:** Aplikasi tidak pernah selesai boot. Halaman kosong total,
tanpa navigasi, tanpa tombol apa pun. Satu-satunya cara keluar adalah menghapus
data lewat DevTools. Karena tidak ada tombol "Reset" di UI, pengguna awam akan
menyerah dan mengira aplikasinya rusak selamanya.

**Evidence:**
- `{"events":[]}` -> `Uncaught TypeError: Cannot read properties of undefined (reading 'forEach') @ store.js:308`, `#app panjang HTML: 0`, `#topnav panjang: 0`.
- `{"sppd":[]}` -> error sama di `store.js:315` (`DB.events.forEach`), dan localStorage justru **membesar** dari 13 byte jadi 2.747 byte berisi SPPD phantom untuk `evt-1` yang tidak ada datanya.
- Tanpa field `sales` -> error di `store.js:448` (`sales()`), lagi-lagi layar putih.
- Setelah error: `store.products()` dan `store.financeSummary('evt-1')` melempar error yang sama. Payload rusak tetap tersimpan, jadi **reload berikutnya tidak menolong**.

**Dampak ke pengguna awam:** Kehilangan akses total ke aplikasi, dan karena
tidak ada UI pemulihan, pengguna mengira datanya hilang selamanya lalu mulai
memakai DevTools untuk memaksa app.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pindahkan seluruh
normalisasi `load()` ke dalam blok `try/catch` yang sama dengan parsing JSON,
dan jadikan `sppd`, `events`, `products`, `sales`, `eventProducts`, `transports`,
`expenses` sebagai array wajib (bukan hanya 7 collection yang sekarang
dinormalisasi). Tambahkan halaman "Data rusak terdeteksi" dengan tombol
"Perbaiki otomatis" dan "Mulai ulang dari seed", plus backup payload mentah
sebelum menimpanya.

### [BUG-02] Impor backup tidak lengkap = kehilangan data aplikasi, dan storage ikut tertimpa rusak - severity: KRITIS

**Persona dan use-case:** Rangga, PIC yang paranoid, ingin memindahkan data dari
komputer lama. Dia menyalin file backup, memotong bagian yang tidak dipahami,
lalu mengimpornya.

**Langkah reproduksi:**
1. Siapkan `JSON.stringify({ events: [] })` -- backup yang isinya cuma satu
   array, tanpa `sppd`, `products`, `sales`, dan lainnya.
2. Panggil `store.importJSON(...)` dari UI Import Backup.
3. Setelah error, buat satu event baru lewat form biasa (nama + tanggal).

**Harapan:** Impor gagal dengan pesan jelas dan **tidak menyentuh data yang ada**,
sehingga user masih bisa menyimpan data lamanya.

**Kenyataannya:** Validasi hanya memeriksa `Array.isArray(obj.events)`, lalu
langsung `DB = obj`. `DB.sppd.forEach(...)` meledak dengan
`Cannot read properties of undefined (reading 'forEach')` -- tanpa rollback,
tanpa pesan. Aplikasi lalu dalam keadaan setengah mati. Dan yang paling parah:
satu aksi simpan event biasa menulis ulang seluruh database, menghasilkan
`{"events":[1 event],"sppd":undefined,"products":undefined,"sales":undefined,...}`.
**Sembilan event lama hilang permanen**, dan `getSppd()` juga ikut meledak.

**Evidence:**
- `importJSON('{"events":[]}')` -> `TypeError: Cannot read properties of undefined (reading 'forEach')` (`store.js:346`).
- Setelah itu: `events()` = 0, sementara `products()`, `getSppd()`, dan `financeSummary()` semuanya error.
- `saveEvent(...)` sekali -> `localStorage` berisi `events=1`, `sppd=undefined`, `products=undefined`, `sales=undefined`; reload -> aplikasi benar-benar kosong.

**Dampak ke pengguna awam:** Ini skenario "traumatis kehilangan data" paling
murni: tidak ada backup, tidak ada undo, tidak ada peringatan. Satu file backup
rusak = proyek 9 event hilang.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Validasi seluruh
collection wajib **sebelum** `DB` diganti, snapshot `DB` lama dan pulihkan
otomatis bila ada exception, serta jalur "Pratinjau import" yang menampilkan
jumlah event/produk/penjualan yang akan hilang sebelum user menekan konfirmasi.

### [BUG-03] Data versi lama dihapus tanpa migrasi - severity: TINGGI (perlu konfirmasi apakah v1 pernah dipakai user)

**Persona dan use-case:** User yang aplikasinya di-upgrade, punya data nyata di
key lama `sppd_toolbox_db_v1`, lalu membuka versi sekarang untuk pertama kali.

**Langkah reproduksi:**
1. Tulis data pada `localStorage["sppd_toolbox_db_v1"]` (JSON dengan `events`).
2. Muat `index.html` versi sekarang (key `sppd_toolbox_db_v2` masih kosong).

**Harapan:** Data lama dimigrasi ke key baru, atau setidaknya tidak dihapus
sebelum ada jalur import.

**Kenyataannya:** Baris pertama `load()` yang jalan adalah
`LEGACY_KEYS.forEach(k => localStorage.removeItem(k))` -- data lama **dihapus
tanpa migrasi dan tanpa peringatan**, lalu aplikasi memakai seed. Setelah itu
key lama benar-benar tidak ada, jadi tidak ada yang bisa di-recover.

**Evidence:** Setelah boot dengan `sppd_toolbox_db_v1` terisi:
`store.events().length = 9` (seed, bukan data lama) dan
`localStorage v1 (legacy) masih ada? TIDAK`.

**Dampak ke pengguna awam:** Kalau v1 pernah dipakai sungguhan, faktanya ini
penghapusan data diam-diam tepat di hari pertama buka aplikasi baru.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Migrasikan key
legacy (mapping field + transformasi), simpan salinan mentah di key arsip
`sppd_toolbox_db_v1_bak`, dan tampilkan toast "Data lama berhasil dimigrasi".

### [BUG-04] Blok "Bandingkan" di Seksi 08 salah hitung Rp 1.025.000 - severity: TINGGI

**Persona dan use-case:** Auditor yang sedang mereview `#/events/evt-1` dan
membandingkan angka-angka sebelum menandatangani laporan.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` -> seksi 08 "Uang - Laporan".
2. Lihat blok "Bandingkan" dan blok "Rekap Penggunaan Uang" tepat di bawahnya.

**Harapan:** Kedua blok menghasilkan saldo yang sama, atau blok "Bandingkan"
memakai persamaan yang benar dan bisa dihitung ulang.

**Kenyataannya:** Blok "Bandingkan" menjumlahkan **Dana Cair** (uang yang belum
berpindah dan sama sekali tidak memengaruhi saldo) sekaligus **tidak
menyertakan Penyesuaian Kas**. Dua kesalahan aritmetika dalam satu baris. Blok
"Rekap Penggunaan Uang" di bawahnya justru benar dan menghasilkan saldo yang
sama dengan `financeSummary`. Jadi aplikasi menampilkan jawaban benar dengan
dua cara sekaligus, dan yang salah justru diberi label pembanding.

**Evidence:**
- "Bandingkan": Dana Awal 2.500.000 + Dana sudah cair 1.500.000 - Realisasi 1.910.000 + Hasil penjualan 3.480.000 = **5.570.000**, sedangkan tertulis "Saldo akhir Rp 4.545.000". Selisih **1.025.000**.
- "Rekap": 2.500.000 + 3.480.000 - 1.440.000 - 470.000 + 475.000 = **4.545.000** (benar).
- Sumber: `pages2.js:531-547`.

**Dampak ke pengguna awam:** Auditor yang percaya angka "Bandingkan" akan
melaporkan sisa dana 1 juta lebih besar dari kenyataan, atau mengira ada
selisih 1 juta yang harus ditelusuri.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Hitung ulang blok
dari `financeSummary`, sertakan baris Penyesuaian Kas, dan beri label eksplisit
bahwa Dana Cair **bukan** bagian dari saldo (dengan keterangan "dana belum
mengalir").

### [BUG-05] Status event "diajukan"/"disetujui" hilang diam-diam saat PIC mengedit data lain - severity: TINGGI

**Persona dan use-case:** PIC yang menerima tugas revisi lokasi event, membuka
"Edit Event", memperbaiki satu field, lalu Simpan. Dia tidak bermaksud menyentuh
status.

**Langkah reproduksi:**
1. Buka `#/events/ev-d2` (status seed **diajukan**) atau `#/events/ev-d5`
   (status seed **disetujui**).
2. Klik "Edit Event".
3. **Jangan sentuh dropdown Status.** Ubah satu field lain (mis. Lokasi) atau
   langsung klik "Simpan Perubahan".
4. Lihat badge status di halaman.

**Harapan:** Status tetap `diajukan` / `disetujui`, karena dropdown-nya
menampilkan status yang benar saat dibuka.

**Kenyataannya:** Dropdown `#ev-status` hanya punya 4 opsi
(`draft, berjalan, selesai, dibatalkan`) sedangkan seed memakai 5 status
(`berjalan, draft, selesai, diajukan, disetujui`). Tidak ada opsi yang cocok,
jadi `.value` menjadi **string kosong**. Saat disimpan, status event ditulis
sebagai `""`. Toast tetap saja berbunyi "Event diperbarui" -- tidak ada
peringatan sedikit pun.

**Evidence:**
- `ev-d2`: status `"diajukan"` -> `#ev-status` terpilih `""` -> setelah "Simpan Perubahan" status jadi `""`, toast "Event diperbarui", badge berubah jadi teks "[titik kosong tanpa label]".
- `ev-d5`: `"disetujui"` -> `""`, badge berubah jadi teks "[titik kosong tanpa label]".
- Kasus nyata: PIC hanya mengubah Lokasi `"Venue Pameran, Lombok"` -> `"Bogor (PIC ubah lokasi)"`, status tetap berubah `"disetujui"` -> `""`.
- Sumber: `pages.js:157` (daftar opsi) dan `pages.js:165` (`sel.value = ev.status` tanpa fallback).

**Dampak ke pengguna awam:** Ini kehilangan data yang tidak terlihat sama sekali.
Status workflow menentukan siapa yang boleh menyetor laporan; setelah hilang,
event terlihat "tanpa status" dan tidak masuk filter mana pun.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Bangun opsi
dropdown dari satu sumber `STATUS_MAP` yang sama dengan yang dipakai badge, dan
kalau nilai tersimpan tidak ada di daftar, tambahkan opsi "(status lama: diajukan)"
supaya user tahu dan bisa mempertahankan atau mengubahnya dengan sadar.

### [BUG-06] Saldo minus Rp 6.955.000 ditampilkan hijau dengan label "Saldo aman" - severity: TINGGI

**Persona dan use-case:** Bendahara yang masuk ke event yang belum diisi Dana
Awal, padahal sudah ada pengeluaran dan penjualan kredit.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` -> seksi 01, simpan SPPD dengan **Dana Awal = 0**.
2. Geser Dana Awal (atau input langsung `0`, lalu klik Simpan) sampai saldo
   menjadi negatif.
3. Lihat badge hero dan daftar event.

**Harapan:** Saldo negatif selalu diberi tanda bahaya, terlepas dari nilai Dana
Awal.

**Kenyataannya:** Syarat deteksi adalah
`!(s.danaAwal > 0 && fin.saldo < 0)` -- jadi kalau `danaAwal` 0 atau negatif,
**saldo negatif dianggap aman**. Badge hijau "Saldo aman" muncul, dan nol
peringatan di daftar event. Logikanya terbalik: justru ketika Dana Awal tidak
diisi (user paling mungkin salah input), sistem seharusnya paling membantu
menandai bahwa ada yang salah.

**Evidence:** `danaAwal tersimpan=0 | toast="SPPD disimpan"` lalu
`danaAwal=0 saldo=-6955000 | badge "Saldo aman" class=check-yes teks="[centang] Saldo aman"`;
peringatan "Saldo minus" di daftar event: **0** dari 9 event.

**Dampak ke pengguna awam:** Bendahara melihat centang hijau dan percaya
keuangan aman, padahal uang sudah minus hampir 7 juta. Ini tipe kesalahan yang
baru ketahuan setelah ape-nya sudah habis.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Uji
`fin.saldo < 0` secara langsung sebagai kondisi bahaya, dan pisahkan
peringatan "Dana Awal belum diisi" dari "saldo minus".

### [BUG-07] Input nilai negatif diterima di mana-mana, sebagian bahkan menaikkan saldo - severity: TINGGI

**Persona dan use-case:** PIC yang salah ketik atau ingin "koreksi" cepat
dengan mengetik angka negatif, tanpa usaha konfirmasi.

**Langkah reproduksi:**
1. Seksi 01: ubah **Dana Awal** jadi `-5.000.000`, simpan.
2. Seksi 04: buat item persiapan dengan qty `-10` dan biaya `-750.000`, simpan.
3. Seksi 03: ubah **qty dibawa** produk jadi `-5`, simpan.
4. Seksi 01: tambah rute transport pribadi dengan `jarak = -25` (tarif
   4.500/km) atau mode umum dengan `biaya = -500.000`.

**Harapan:** Setiap field uang dan qty menolak nilai negatif dengan pesan jelas
("tidak boleh negatif") atau minimal konfirmasi.

**Kenyataannya:** Semua diterima dan dianggap sah. Yang paling berbahaya,
transport dengan biaya negatif **membuat saldo naik**: saldo evt-1 berubah dari
4.545.000 menjadi **5.045.000** karena biaya negatif mengurangi total biaya.
Tidak ada satu pun input yang ditolak.

**Evidence:**
- Dana Awal `-5.000.000` tersimpan, toast "SPPD disimpan".
- Item persiapan qty `-10` / biaya `-750.000` -> `prepBiaya = -220.000`.
- Qty dibawa `-5` -> baris checklist menampilkan "-5" dan `stokSisa = 0`.
- Transport pribadi `jarak=-25` -> `totalBiaya = -112.500`; transport umum `biaya=-500.000` -> saldo `5.045.000`.

**Dampak ke pengguna awam:** Angka negatif adalah kode yang tidak dibaca manusia
 sebagai penjelasan di audit. Laporan jadi terlihat tidak masuk akal, dan PIC
akan disalahkan padahal aplikasinya yang menerima data seperti itu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Validasi
`>= 0` di layer `actions.js` untuk semua field uang dan qty, dengan pesan
error spesifik per field; hanya "Penyesuaian Kas" yang boleh negatif karena
memang koreksi.

### [BUG-08] Harga jual negatif dan nol dicatat sebagai penjualan sungguhan - severity: TINGGI

**Persona dan use-case:** Kasir yang salah ketik harga, atau yang memang ingin
mencatat "barang gratis" tanpa berpikir soal konfirmasi.

**Langkah reproduksi:**
1. Seksi 05 "Uang - Penjualan" -> tambah penjualan dengan qty `2` dan harga
   `-200.000`.
2. Ulangi dengan harga `0`.

**Harapan:** Harga harus positif; kalau nol, minimal ada konfirmasi atau label
"gratis".

**Kenyataannya:** Keduanya tersimpan dan langsung memengaruhi rekap. Harga
negatif menghasilkan **penjualan negatif Rp 400.000** -- total penjualan turun
dan saldo ikut turun, padahal user mungkin bermaksud koreksi. Harga nol menambah
jumlah transaksi dan qty terjual tanpa menambah satu rupiah pun.

**Evidence:** qty 2 x harga -200.000 -> `total = -400.000`, toast
"Penjualan tercatat Rp -400.000"; `totalSales` turun dan saldo berkurang.
Harga 0 -> jumlah transaksi naik, qty terjual naik, `totalSales` tetap.

**Dampak ke pengguna awam:** Rekap per produk dan laporan penjualan berisi
angka negatif atau nol yang tidak bisa dijelaskan ke atasan. Sulit dibedakan dari
"barang yang memang diberikan gratis".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tolak
`hargaSatuan <= 0` (atau minta konfirmasi eksplisit untuk 0), dan beri label
"gratis" agar rekap tetap bisa dibaca.

### [BUG-09] Tambah rute transport defaultnya menyimpan biaya Rp 0 dengan toast sukses - severity: TINGGI

**Persona dan use-case:** PIC yang menambah rute di seksi 01 dan mengira
sistem akan menghitung ongkos otomatis.

**Langkah reproduksi:**
1. Seksi 01 -> blok Transport -> isi asal & tujuan -> klik "Tambah Rute" tanpa
   mengisi biaya.
2. Perhatikan toast dan baris tabel.

**Harapan:** Rute tanpa biaya ditandai belum lengkap, atau biaya dihitung dari
tarif default.

**Kenyataannya:** Rute tersimpan dengan `totalBiaya = 0` dan toast
"Rute ditambahkan (total Rp 0)". Tidak ada peringatan, tidak ada tanda
"belum diisi". Untuk mode **umum** ternyata tidak ada input biaya sama sekali
di form, jadi user tidak punya jalan mengisinya lewat form rute.

**Evidence:** `totalBiaya=0`, toast `"Rute ditambahkan (total Rp 0)"`;
untuk mode `umum` input biaya hanya bisa diisi manual, dan nilai negatif
juga diterima (lihat BUG-07).

**Dampak ke pengguna awam:** Rute "menghilang" dari hitungan realisasi transport
karena tercatat nol. Dana yang sebenarnya dikeluarkan jadi tidak tercatat, dan
selisih seperti itu akan muncul di tangan orang yang salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tandai baris dengan
biaya 0 sebagai "biaya belum diisi" (ikon + warna berbeda), dan tampilkan input
biaya untuk mode umum juga.

### [BUG-10] Laporan cetak menampilkan dua total yang berbeda tanpa rekonsiliasi - severity: TINGGI

**Persona dan use-case:** Auditor yang mencetak laporan untuk diarsipkan atau
dilampirkan di handover.

**Langkah reproduksi:**
1. `#/events/evt-1` -> seksi 08 -> klik cetak (atau `SPT.printHTML(event)`).
2. Baca tabel "Arus Kas per Wallet" dan ringkasan paling bawah.

**Harapan:** Ada satu persamaan yang bisa dicek auditor, misalnya
"Dana Awal + Penjualan - Biaya + Penyesuaian = Saldo", dan angka per wallet bisa
dijelaskan.

**Kenyataannya:** Tabel Arus Kas menampilkan Bank 1.000.000, QRIS 1.250.000,
Kas **-205.000**, E-Money 0 -> total **2.045.000**, sementara ringkasan bawah
menulis "Saldo akhir Rp 4.545.000". Gap-nya persis sebesar Dana Awal
(2.500.000), tapi **tidak ada baris penjelas** di laporan. Ringkasan bawah juga
tidak menyebut Dana Awal, padahal Dana Awal muncul 3x di header tabel lain --
jadi pembaca harus menjadikannya sendiri secara manual.

**Evidence:** Isi `printHTML` (panjang 4.896 karakter): baris
"Arus Kas per Wallet" -> Kas `+Rp 1.730.000 / -Rp 1.935.000 / Rp -205.000`;
ringkasan -> "Hasil penjualan Rp 3.480.000 / Total biaya Rp 1.910.000 /
Penyesuaian kas +Rp 475.000 / Saldo akhir Rp 4.545.000". Frasa "Dana awal"
muncul 3x di dokumen (Rp 2.500.000) tapi tidak di bagian ringkasan.

**Dampak ke pengguna awam:** Auditor yang tidak teliti akan mengarsipkan
dokumen yang isinya tampak kontradiktif. Justru dokumen yang membawa kontradiksi
seperti ini berbahaya, karena kelihatan resmi tapi salah baca.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan baris
rekonsiliasi di bagian atas laporan (termasuk Dana Awal dan catatan kenapa
Arus Kas tidak sama dengan Saldo), dan beri baris "Saldo belum dijelaskan:
Rp 2.500.000 (Dana Awal)".

### [BUG-11] Event tanpa aset sama sekali tetap ditandai "Pulang tuntas" - severity: SEDANG

**Persona dan use-case:** Atasan yang memakai checklist untuk memastikan semua
barang PIC kembali.

**Langkah reproduksi:**
1. Buka event yang belum punya produk maupun item persiapan (mis. `evt-2`).
2. Lihat Seksi 07 "Cross-check Berangkat/Pulang".

**Harapan:** Event tanpa aset seharusnya berstatus "belum ada data", bukan
"tuntas".

**Kenyataannya:** Logika `pulangOk` memakai `[].every(...)` (selalu `true` untuk
array kosong) plus `items.length === 0`, sehingga event kosong dianggap sudah
pulang semua. UI menampilkan "Siap Pulang" dan "0 Aset Tertinggal".

**Evidence:** `pulangOk('evt-2') = true`, teks "Pulang tuntas",
"0 Aset Tertinggal".

**Dampak ke pengguna awam:** Kehilangan barang tidak akan terdeteksi, karena
cross-check justru memberi rasa aman. Ini tipe silent failure yang paling
berbahaya untuk inventaris.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Bedakan "tuntas"
dari "belum ada data yang diperiksa", dan tampilkan instruksi mengisi aset
sebelum cross-check bisa dipakai.

### [BUG-12] Hapus event tidak menghapus checklist-nya, 24 item yatim per event - severity: SEDANG

**Persona dan use-case:** Admin yang membuat event salah lalu menghapusnya.

**Langkah reproduksi:**
1. Catat jumlah checklist item di database (seed: 9 event x 24 = 216).
2. Hapus satu event lewat `store.deleteEvent('evt-1')` atau tombol Hapus.
3. Hitung ulang.

**Harapan:** Hapus event membersihkan semua data turunannya, termasuk checklist.

**Kenyataannya:** `deleteEvent` memfilter banyak collection tapi **tidak
menyentuh `checklistItems`**. Jumlah checklist total tetap 216 padahal event
tersisa hanya 8. Item-item itu yatim dan akan "mewarisi" event berikutnya yang
membuka checklist -- jadi event baru diam-diam mewarisi 24 checklist item dari
event lama.

**Evidence:** Setelah `deleteEvent('evt-1')`: `events=8` tetapi
`checklist evt-1=24` dan `total checklist DB=216`. Event berikutnya yang dibuat
langsung punya 24 checklist item.

**Dampak ke pengguna awam:** Checklist event lama ikut "muncul" di event baru,
sehingga seolah-olah PIC yang lupa mengisi checklist. Data membusuk diam-diem.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Masukkan
`checklistItems` (dan `eventProducts`, `sales`, `danaCair`, `transports`) ke
dalam daftar filter `deleteEvent`, atau tambahkan garbage collector berkala saat
boot.

### [BUG-13] Nama event disisipkan mentah ke HTML jendela cetak (HTML injection) - severity: SEDANG

**Persona dan use-case:** Siapa pun yang mengisi form event, atau yang mengimpor
backup dari sumber tak dikenal.

**Langkah reproduksi:**
1. Beri nama event: `<img src=x onerror="window.__XSS=1">`.
2. Klik "Cetak" / Rekap Global dari daftar event.

**Harapan:** Semua teks dari pengguna di-escape sebelum masuk HTML.

**Kenyataannya:** Di aplikasi utama DOM-nya aman (nama tampil normal), tapi
`report:global` menulis `e.nama` **tanpa `ui.esc()`** ke dokumen jendela cetak.
Payload sampai apa adanya ke HTML, sehingga `onerror` bisa dieksekusi di
konteks origin yang sama. Pada prototipe tanpa server dampaknya terbatas
(XSS butuh input korban sendiri), tapi ini persis pola berbahaya kalau
prototipe ini nanti jadi basis aplikasi nyata.

**Evidence:** `SPT.printHTML`/report global menghasilkan HTML yang memuat
payload mentah; badge status tetap aman karena bukan string pengguna.

**Dampak ke pengguna awam:** Untuk kasus sekarang: rendah. Untuk versi berbasis
server: nama event dari satu user bisa dieksekusi di browser user lain yang
membuka rekap.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pakai `ui.esc()`
untuk semua string yang berasal dari user di `actions.js:606-622`, dan
tambahkan `Content-Security-Policy` saat sudah berjalan di server.

### [BUG-14] Restore backup versi lama mengosongkan Master Barang tanpa peringatan - severity: SEDANG

**Persona dan use-case:** User lama yang backup-nya dibuat sebelum fitur Master
Barang ada.

**Langkah reproduksi:**
1. Siapkan backup JSON versi lama (ada `events` dan `products`, tidak ada
   `itemCats`/`itemTemplates`).
2. `store.importJSON(...)`, lalu buka `#/master`.

**Harapan:** Aplikasi melengkapi data bawaan yang hilang (memangnya `load()`
melakukan ini) atau memberi tahu user.

**Kenyataannya:** `importJSON` **tidak** menjalankan normalisasi bawaan yang
dilakukan `load()`. `itemCats` jadi `0` (dari 5) dan `itemTemplates` jadi `0`
(dari 29), jadi Master Barang jadi kosong total. Tidak ada toast, tidak ada
peringatan. `checklistTemplates` juga `undefined` sampai pertama kali diakses
(lalu self-heal via `ensureChecklistItems`), jadi perilakunya tidak konsisten
antar collection.

**Evidence:** Setelah restore: `itemCats() = 0`, `itemTemplates() = 0`,
`checklistTemplates() = undefined` (setelah `checklistItems('ev-old')` jadi 24).
Semua halaman tetap bisa dibuka (dashboard, events, master, daftar event OK).

**Dampak ke pengguna awam:** User melihat Master Barang kosong dan mengira
seluruh master-nya hilang, padahal hanya daftar kategori dan barang bawaan yang
tidak ikut di backup.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Panggil satu fungsi
normalisasi yang sama dari `load()` dan `importJSON()`, dan tampilkan ringkasan
hasil import (jumlah produk, event, item master yang dipulihkan).

### [BUG-15] Validasi input nyaris tidak ada: nama spasi, tanggal terbalik, nama ganda - severity: SEDANG

**Persona dan use-case:** PIC yang terburu-buru, mengetik cepat, tanpa disiplin.

**Langkah reproduksi:**
1. Buat event dengan nama `"   "` (spasi saja) -> tersimpan, toast sukses.
2. Buat event dengan Tanggal Selesai **lebih dulu** dari Tanggal Mulai ->
   tersimpan.
3. Buat dua event bernama sama "Rapat Tahunan" dengan tanggal berbeda ->
   keduanya tersimpan.

**Harapan:** Nama kosong atau duplikat dan tanggal terbalik ditolak dengan pesan
yang jelas.

**Kenyataannya:** Ketiganya lolos. `event:save` hanya mengecek nama non-kosong,
tidak cek unik dan tidak cek urutan tanggal. Daftar event kemudian menampilkan
tiga kartu "Rapat Tahunan" -- sulit dibedakan mana yang asli. Hal serupa pada
Produk: nama produk ganda juga bisa tersimpan.

**Evidence:** `"   "` -> toast "Event dibuat"; tanggal terbalik -> tersimpan;
duplikat -> jumlah record = 2, toast "Event dibuat" dua kali, dua kartu
terlihat di daftar.

**Dampak ke pengguna awam:** Data jadi berantakan dan sulit dicari; saat laporan
akhir dirangkum, user tidak tahu event mana yang benar.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Trim nama sebelum
validasi, tolak nama duplikat (case-insensitive) dengan suggest "ubah nama atau
gabung", dan validasi `tanggalSelesai >= tanggalMulai`.

### [BUG-16] Membuka halaman event diam-diam membuat record SPPD baru - severity: SEDANG

**Persona dan use-case:** Admin yang sekadar iseng membuka daftar event.

**Langkah reproduksi:**
1. Catat jumlah SPPD (seed: 8 untuk 9 event).
2. Buka `#/events/evt-2` yang belum punya SPPD.

**Harapan:** Melihat halaman tidak mengubah data.

**Kenyataannya:** `getSppd()` membuat record SPPD default dan **menyimpannya**
saat dipanggil, dan `getSppd` dipanggil dari jalur render. Jumlah SPPD naik dari
8 ke 9 hanya karena membuka halaman.

**Evidence:** Setelah `goto('#/events/evt-2')`: jumlah SPPD 8 -> 9, record
`evt-2` adalah SPPD kosong (`danaAwal 0`, `noSurat ''`).

**Dampak ke pengguna awam:** Database terisi data palsu. Ekspor backup jadi berisi
SPPD kosong, dan statistik "jumlah SPPD" tidak lagi berarti apa-apa.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pisahkan
`getSppd()` (baca) dari `ensureSppd()` (tulis), dan hanya buat record saat user
benar-benar menyimpan form SPPD.

### [BUG-17] Performa melorot tajam pada data yang sedikit banyak - severity: SEDANG

**Persona dan use-case:** Admin backoffice yang mengumpulkan banyak event dalam
sepanjang tahun.

**Langkah reproduksi:**
1. Tambahkan event hingga sekitar 300, ukur render dashboard.
2. Tambahkan lagi hingga sekitar 1.530 event, ukur lagi dan lihat ukuran
   localStorage.

**Harapan:** Ribuan event masih bisa dibuka dalam hitungan detik.

**Kenyataannya:** Nonlinier dan sangat lambat. 300 event masih oke, tapi 1.530
event membuat dashboard memuat **22,7 detik**. Penyebabnya jelas: setiap render
menjalankan `load()` yang menormalisasi ulang banyak collection, dan
`checklistItems()` dipanggil per event saat render.

**Evidence:** 300 event -> sekitar 757 ms; 1.530 event -> localStorage sekitar
514 KB, dashboard sekitar 22.754 ms.

**Dampak ke pengguna awam:** Admin akan mengira aplikasinya hang dan menutup tab
-- data tetap ada, tapi user cenderung melakukan refresh paksa berulang.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Virtualisasi
daftar, index byId untuk `checklistItems` dan `eventProducts`, dan jangan
normalisasi ulang seluruh DB setiap `load()`.

### [BUG-18] Galat JSON ditampilkan mentah dalam bahasa Inggris - severity: SEDANG

**Persona dan use-case:** User yang mengimpor file yang keliru pilih.

**Langkah reproduksi:**
1. Pilih file JSON yang bukan backup SPPD Toolbox, atau file yang terpotong.

**Harapan:** Pesan error bahasa Indonesia yang mengarahkan apa yang harus
dilakukan.

**Kenyataannya:** Exception dari `JSON.parse` ditangkap dan pesan mentahnya
ditampilkan (mis. `Unexpected token ...`), tanpa penjelasan format yang
diharapkan dan tanpa jalan keluar yang aman. Karena `importJSON` sudah mengganti
`DB` sebelum error (lihat BUG-02), pesan bahasa Inggris ini datang dengan
masalah yang jauh lebih besar: state sudah setengah rusak.

**Dampak ke pengguna awam:** User tidak paham apa yang salah dan cenderung mencoba
lagi mengimpor file yang sama, memperbesar kerusakan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tangkap error,
ganti dengan pesan Indonesia yang menyebut "format tidak dikenali" plus contoh
struktur, dan pastikan `DB` tidak berubah kalau parse gagal.

### [BUG-19] Angka desimal dapat disimpan dan tampil tidak utuh (Rp 0 untuk 0,0001) - severity: RENDAH

**Persona dan use-case:** User yang mengetik angka dengan pemisah ribuan atau
koma desimal.

**Langkah reproduksi:**
1. Simpan penyesuaian kas `0.0001`.
2. Simpan produk dengan harga `1234.5`.
3. Lihat angka di layar.

**Harapan:** Rupiah ditampilkan bulat, atau input non-bulat ditolak.

**Kenyataannya:** Nilai desimal diterima (`kasadj:add` hanya menolak `0`), dan
`fmt()` memakai `toLocaleString('id-ID')` sehingga menampilkan satu sampai tiga
angka desimal: `1234.5` -> "Rp 1.234,5". Lebih buruk, `0.0001` -> **"Rp 0"**,
padahal saldo sebenarnya berubah dari 4.545.000 menjadi 4.545.000,0001 -- jadi
ada perubahan saldo yang **tidak terlihat sama sekali**.

**Evidence:** `fmt(1234.5)="Rp 1.234,5"`, `fmt(1234.5678)="Rp 1.234,568"`,
`fmt(0.0001)="Rp 0"`; saldo setelah penyesuaian `0.0001` = `4545000.0001` tapi
tampil `Rp 4.545.000`.

**Dampak ke pengguna awam:** Tampilan "Rp 0" membuat user mengira penyesuaian
gagal padahal tercatat; angka desimal yang muncul di tabel membuat dokumen
terlihat tidak profesional.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Bulatkan ke rupiah
penuh saat menyimpan (atau saat menampilkan) dan beri validasi input hanya
menerima kelipatan seratus.

### [BUG-20] Parser angka tidak cope dengan format Indonesia - severity: RENDAH

**Persona dan use-case:** User lokal yang mengetik "150.000" atau "1e3".

**Langkah reproduksi:**
1. Isi field uang dengan `150.000` (memang ingin 150 ribu).
2. Isi field qty dengan `1e3` (berniat 1000).

**Harapan:** "150.000" dipahami sebagai 150.000, dan qty satu ribu jadi 1000.

**Kenyataannya:** `ui.num` memakai `parseFloat` tanpa membersihkan pemisah
 ribuan, jadi `150.000` -> **150** (seratus lima puluh!), dan
`parseInt("1e3")` -> **1**. Di field uang berbasis `type=number` browser
sebagian besar melakukan sanitasi sehingga risikonya lebih kecil, tapi field qty
yang memakai `parseInt` tetap salah untuk notasi eksponensial.

**Evidence:** `num("150.000")=150`, `num("1e5")=100000` (harusnya 150.000),
`parseInt("1e3")=1`.

**Dampak ke pengguna awam:** Salah ketik angka menjadi kesalahan yang tidak
terdeteksi -- user melihat angka masuk dan percaya begitu saja.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Normalisasi
pemisah ribuan sebelum parse, atau gunakan `inputmode="numeric"` dengan format
terbaca yang konsisten.

### [BUG-21] Qty dan nominal tidak punya batas atas - severity: RENDAH

**Persona dan use-case:** User yang salah ketik jumlah digit.

**Langkah reproduksi:**
1. Isi qty dibawa `999.999` (atau nominal besar) -> tersimpan tanpa batas.

**Harapan:** Ada batas atas yang masuk akal dengan pesan valid.

**Kenyataannya:** Tidak ada validasi batas atas sama sekali untuk qty item
persiapan maupun nominal. Yang *dapat* ditolak adalah qty melebihi stok
(`stokSisa`), dan itu bekerja: toast "Stok tidak cukup - sisa 11".

**Evidence:** qty `999.999` diterima; qty `999.999.999.999` untuk produk dalam
checklist ditolak dengan toast "Stok tidak cukup".

**Dampak ke pengguna awam:** Angka fantastis masuk laporan dan sulit
dipertanggungjawabkan; tidak langsung merusak, tapi memperparah reputasi data.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Batas atas per
field (misalnya 1.000.000) dengan pesan yang jelas.

### [BUG-22] `importJSON` tidak konsisten dengan `load()` dan bisa menyisakan database setengah jadi - severity: RENDAH

**Persona dan use-case:** Developer yang baca kode, atau user yang melakukan
impor berulang.

**Langkah reproduksi:**
1. Bandingkan urutan langkah di `load()` (baris 296-326) dengan `importJSON()`
   (baris 336-354).
2. Perhatikan collection mana yang dinormalisasi masing-masing.

**Harapan:** Satu fungsi normalisasi dipakai di kedua jalur.

**Kenyataannya:** `load()` menormalisasi tujuh collection (`kasAdj`,
`prepItems`, `danaCair`, `checklistTemplates`, `checklistItems`, `itemCats`,
`itemTemplates`); `importJSON()` hanya empat. Akibatnya `checklistTemplates`
bisa `undefined` setelah import (self-heal lambat), dan `sppd` yang hilang
langsung meledak (BUG-02). Pertahanan di jalur import masih bolong.

**Evidence:** `checklistTemplates()` mengembalikan `undefined` setelah import
backup lama, lalu `store.js:313` memulihkannya hanya saat
`ensureChecklistItems` dipanggil.

**Dampak ke pengguna awam:** Rendah langsung, tapi ini akar penyebab BUG-02 dan
BUG-14 -- memperbaiki normalisasi tunggal akan menutup keduanya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Ekstrak
`normalize(db)` dan panggil dari `load()`, `importJSON()`, dan setelah
`resetData()`.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Seed demo benar-benar dipakai.** Setelah `localStorage.clear()`, load pertama
  mengisi 9 event, 8 SPPD, 8 produk, 13 item persiapan, 24 checklist per event,
  dan 5 kategori item.
- **Angka seed konsisten.** Identitas `Alokasi - Realisasi = Sisa` saya uji di
  dua konfigurasi (seed, dan seed setelah ditambah satu baris alokasi E-Money)
  dan **selalu hold**: A 2.850.000 - R 1.910.000 = S 940.000, lalu
  A 2.950.000 - R 1.910.000 = S 1.040.000. Dugaan awal saya bahwa "total budget
  tidak konsisten" ternyata SALAH dan tidak saya masukkan ke daftar temuan.
- **Pulih dari JSON rusak.** Payload `{"events":[` yang terpotong tidak membuat
  crash -- `load()` jatuh ke seed dan aplikasi jalan normal. Ini yang menyelamatkan
  pengguna dari BUG-01 kalau kerusakannya hanya "kurang kurung".
- **Penolakan stok bekerja.** Qty dibawa melebihi `stokSisa` ditolak dengan toast
  "Stok tidak cukup - sisa 11", jadi invariant stok tidak bisa dilanggar lewat form.
- **Duplikasi produk di checklist dicegah lewat UI.** Dropdown produk hanya
  menampilkan produk yang belum dipakai event tersebut, jadi user tidak bisa
  salah klik dua kali untuk produk yang sama.
- **Toast jelas untuk aksi yang berhasil.** Hampir setiap mutasi memunculkan
  toast spesifik ("Event dibuat", "Event diperbarui", "Penjualan tercatat
  Rp ..."), jadi user selalu tahu aksinya diterima.
- **`save()` punya penanganan penuh localStorage** -- ada try/catch dan toast
  "Gagal menyimpan ke localStorage" alih-alih crash diam-diam.
- **Escaping di DOM utama rapi.** Nama event berisi HTML tampil sebagai teks di
  aplikasi utama; hanya jendela cetak yang bocor (BUG-13).
- **`getSppd()` dan `checklistItems()` punya self-heal** -- checklist 24 item
  otomatis di-backfill untuk event baru, jadi event baru tidak pernah tampil
  dengan checklist kosong.
- **`importJSON` menolak file yang bukan backup** dengan pesan Indonesia
  "Format backup tidak dikenali" -- jadi guard awal sudah ada, tinggal
  diperdalam cakupannya.
- **Dialog hapus event menyebutkan konsekuensinya** dengan teks eksplisit
  "Semua data SPPD, produk, penjualan & keuangan event ini ikut terhapus".

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah `sppd_toolbox_db_v1` pernah dipakai user sungguhan?** Kalau ya,
  BUG-03 adalah kehilangan data senyap di hari pertama upgrade; kalau tidak, ini
  hanya kode mati yang sebaiknya dihapus.
- **Apakah "Bandingkan" dan "Rekap Penggunaan Uang" memang sengaja berbeda?**
  Kalau memang dua definisi berbeda, keduanya perlu label dan persamaan
  sendiri; kalau tidak, yang salah hitung harus dibetulkan. PERLU KONFIRMASI
  ke owner produk.
- **Kenapa Dana Cair ikut dijumlahkan di blok "Bandingkan"?** Kemungkinan
  disengaja, tapi tidak ada catatan atau label yang menjelaskan, jadi saya
  tandai sebagai bug.
- **Apakah desainnya memang "dana awal tidak masuk wallet"?** Kalau iya, tabel
  Arus Kas perlu baris penyeimbang eksplisit; kalau bukan, berarti ada alokasi
  yang hilang saat input.
- **Berapa batas wajar untuk qty dan nominal?** Saya tidak menemukan konstanta,
  sehingga severity BUG-21 hanya perkiraan.
- **Baris `E-Money` yang sengaja tidak masuk total realisasi** -- di kode ada
  komentar "avoid double count". Saya tidak menemukan kasus di mana baris itu
  benar-benar terisi (realisasi E-Money = 0 di seed), jadi perilakunya belum
  terverifikasi.
- **Klaim tombol CSV/share di halaman `#/guide`** tidak saya verifikasi dan tidak
  saya laporkan karena tidak ada bukti bertentangan.
- **Migrasi v1 ke v2** -- belum jelas apakah pernah dijalankan manual di luar
  mekanisme `LEGACY_KEYS`.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Keandalan data (tidak hilang diam-diam) | 1 | Import tak lengkap menghapus 9 event; localStorage tidak lengkap = layar putih permanen tanpa UI pemulihan (BUG-01, BUG-02) |
| Kebenaran angka keuangan | 2 | Blok "Bandingkan" salah Rp 1.025.000; Arus Kas vs Saldo beda Rp 2.500.000 tanpa penjelas; input negatif menaikkan saldo |
| Validasi dan error handling | 2 | Negatif, nol, duplikat, tanggal terbalik lolos semua; galat JSON mentah bahasa Inggris |
| Kejujuran UI | 2 | "Saldo aman" saat saldo minus; "Pulang tuntas" tanpa aset; "total Rp 0" dianggap sukses; status hilang tanpa peringatan |
| Recoverability dan dokumentasi | 2 | Tidak ada tombol reset atau pulihkan di UI; backup legacy dihapus tanpa migrasi; tidak ada jejak audit |
| Performa | 3 | 300 event masih cepat (0,76 detik), tapi 1.530 event melambat ke 22,7 detik |
| Isi seed dan pengalaman awal | 4 | Seed demo kaya dan konsisten; checklist auto-backfill; toast hampir selalu informatif |
| Kemudahan keluar dari masalah | 2 | User harus DevTools untuk keluar dari kondisi brick; tidak ada tombol reset di UI |
