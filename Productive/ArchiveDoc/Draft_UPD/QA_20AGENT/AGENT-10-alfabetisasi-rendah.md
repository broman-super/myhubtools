# AGENT-10 — Alfabetisasi Rendah

> **Persona:** pengguna yang bisa baca sedikit, bergerak cepat, dan butuh ikon atau kalimat satu kata untuk tahu harus klik apa · **Fokus:** keterbacaan istilah, instruksi, angka, dan pesan error · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 10 |
| SEDANG | 13 |
| RENDAH | 6 |
| **Total** | **29** |

Kesimpulan: aplikasi ini **berjalan** dan angka rupiah yang sudah diformat selalu enak dibaca (`Rp 2.500.000`, bukan `Rp 2500000`). Yang jadi masalah besar justru lapisan bahasanya. Di Layar Kerja saja `SPPD` muncul 25x, `E-Money` 15x, `Alokasi` 13x, `Wallet` 11x, `Qty` 10x, `QRIS` 9x, `Rekap` 8x, `Realisasi` 6x, plus `Draft`, `Cross-check`, `oversold`, `opname`, `Leg`, `pcs/pack`, `est.`, `dana talangan`, `NIP` — hampir semua tanpa penjelasan di halaman tempat dipakai.

Tiga temuan yang paling berbahaya adalah yang menampilkan angka atau tombol yang **salah tanpa memberi tanda**: kartu "Penyesuaian Kas" menulis "− Rp 0" padahal ada pengeluaran Rp 25.000; kategori "Operasional" ditulis ulang diam-diam menjadi "Operasional Lain" dengan `Sisa` negatif `Rp -420.000`; dan tombol "Download Dokumen" mati di 9 event dari 9 event. Ketiganya membuat user salah yakin tanpa pernah berhenti untuk memeriksa.

Untuk persona alfabetisasi rendah, strukturnya juga terlalu berat: **0 ikon dan 0 gambar di seluruh aplikasi**, navigasi 8 menu berbasis teks saja, 117 elemen teks berukuran 11px, dan pesan error browser yang masuk dalam Bahasa Inggris ("Please enter a valid value...").

## Environment yang dipakai

- Edge headless (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), flag `--headless=new --disable-gpu --no-sandbox --virtual-time-budget=9000 --dump-dom`
- Profil unik per run: `C:\Users\Kael\AppData\Local\Temp\opencode\prof_agent10`, `prof_agent10b`, `prof_agent10c`
- `localStorage.clear()` lalu `store.resetData()`. Seed terverifikasi: `events=9`, `produk=8`, key `sppd_toolbox_db_v2`
- Rute diuji: `#/dashboard`, `#/events`, `#/archive`, `#/events/evt-1` (8 seksi), `#/products`, `#/master`, `#/reports`, `#/guide`, `#/settings`, dan `A.printHTML(evt-1)`
- Harness read-only di `_QA_TMP/`: `a10_alfabet.html` (388 baris log), `a10_alfabet_b.html` (114 baris), `a10_alfabet_c.html` (129 baris)
- Log mentah: `C:\Users\Kael\AppData\Local\Temp\opencode\a10_out.txt`, `a10_b_out.txt`, `a10_c_out.txt`
- Catatan metodologi: bagian frekuensi istilah di harness `c` memakai `new RegExp(...)` tanpa escaping, jadi angka untuk term bertanda baca (`Biaya (est.)`, `Est.`, `vs`) tidak dipakai di laporan ini. Hanya term polos yang dipakai.

## Temuan

### [BUG-01] Kartu "Penyesuaian Kas" menulis "− Rp 0" padahal ada pengeluaran Rp 25.000 — TINGGI

**Persona dan use-case:** bendahara event memeriksa ulang kas sebelum lapor ke ketua. Dia mempercayai 5 kartu angka besar di seksi 06.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Lihat kartu "Penyesuaian Kas" di seksi 06 Kas.
3. Bandingkan dengan baris penyesuaian dari `store.kasAdj('evt-1')`.

**Harapan:** Sub-label kartu menunjukkan pemecahan komponen, jadi jumlah masuk dan jumlah keluar terlihat terpisah.

**Kenyataannya:** Kartu memecah **total neto**, bukan komponen. Satu penyesuaian negatif di seed tidak pernah terlihat di mana pun.

**Evidence:**
```
kasAdj evt-1 (mentah):
  2026-04-25 | Selisih kas opname | -25000
  2026-04-24 | Setoran kas dari tim panitia | 500000
totalKasAdj = 475000 -> "Rp 475.000"
sub-label UI = "+ Rp 475.000 / − Rp 0"    <-- yang tampil
outflow sebenarnya = "Rp 25.000"          <-- data sebenarnya
```
Sumber: `js/pages2.js:210` — `'+ ' + ui.fmt(Math.max(s.totalKasAdj, 0)) + ' / − ' + ui.fmt(Math.max(-s.totalKasAdj, 0))`.

**Dampak ke pengguna awam:** User melihat "− Rp 0" dan menyimpulkan tidak ada kas keluar, padahal ada pengurangan Rp 25.000. Justru di kartu yang paling sering dipandangi. Kalau selisih ini tidak sengaja tercatat, laporan ke atasan jadi salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pecah per komponen dari array `kasAdj`, bukan dari `Math.max` atas total; atau ganti sub-label menjadi "total bersih" supaya tidak terbaca sebagai pemecahan.

---

### [BUG-02] Kategori "Operasional" muncul sebagai "Operasional Lain" dengan Sisa negatif — TINGGI

**Persona dan use-case:** user mencatat pengeluaran booth biasa, lalu membuka tabel laporan untuk memverifikasi apa yang dia catat.

**Langkah reproduksi:**
1. Simpan pengeluaran `kategori: 'Operasional'`, `jumlah: 100000`, `wallet: 'Kas'` pada `evt-1`.
2. Buka tabel "Anggaran vs Realisasi per Komponen" di seksi 08.

**Harapan:** Nama komponen di tabel sama dengan yang dipilih user di form.

**Kenyataannya:** Yang diketik "Operasional", yang tampil "Operasional Lain". Baris itu juga punya `Alokasi Rp 0`, sehingga `Sisa` jadi negatif.

**Evidence:**
```
opsi kategori di form (js/pages2.js:205):
  Penginapan, Konsumsi, Operasional, Uang Saku, Kas Kecil, BBM & Tol, Lainnya
BUDGET_POS (js/store.js:533):
  Penginapan, Sewa Transport, Transport Umum, Uang Saku, Kas Kecil, BBM & Tol, E-Money, Operasional Lain

baris tabel setelah input Rp 100.000 kategori "Operasional":
  Operasional Lain | Rp 0 | Rp 420.000 | Rp -420.000 | Kas
```
Sumber pemetaan: `js/store.js:589` — cabang `else` yang menangkap semua kategori yang tidak ada di `BUDGET_POS`.

**Dampak ke pengguna awam:** Dua masalah sekaligus. (1) User tidak menemukan kembali apa yang dia ketik, lalu mengira aplikasinya salah. (2) `Sisa Rp -420.000` tampil tanpa penjelasan apakah artinya "kelebihan Rp 420.000" atau "sisa Rp 420.000", dan minus-nya ditulis ASCII `-` sementara halaman lain memakai `−`.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Samakan nama komponen dengan nama kategori form, dan beri label eksplisit untuk Sisa negatif, misalnya "Rp 420.000 lebih terpakai".

---

### [BUG-03] Tombol "Download Dokumen" mati di semua 9 event — TINGGI

**Persona dan use-case:** user selesai mengisi SPPD dan menekan tombol besar di hero untuk mengunduh surat tugas.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, klik "Download Dokumen".
2. Ulangi untuk 9 event.

**Harapan:** Tombol membuka berkas SPPD yang sudah dilampirkan.

**Kenyataannya:** Semua `linkDokumen` kosong di seed, sehingga `href` jatuh ke `'#'` dan klik hanya memuat ulang halaman.

**Evidence:**
```
linkDokumen semua event: "#", "#", "#", "#", "#", "#", "#", "#", "#"
```
Sumber: `js/store.js:148-161` (`linkDokumen: ''` di 9 record SPPD), `js/pages2.js:326` dan `js/pages.js:315` (`ui.esc(s.linkDokumen || '#')`).

**Dampak ke pengguna awam:** Tombol diberi styling tombol resmi yang sama dengan "Cetak SPPD", jadi user percaya berkas sudah terunduh. Tidak ada pesan apa pun. User pulang tanpa berkas dan tanpa tahu kenapa.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Sembunyikan tombol saat `linkDokumen` kosong, atau nonaktifkan dan ganti label menjadi "Belum ada dokumen".

---

### [BUG-04] Validasi `step="500"` menampilkan pesan browser dalam Bahasa Inggris — TINGGI

**Persona dan use-case:** user mencatat harga jual yang wajar, misalnya Rp 3.750 per bungkus atau Rp 12.345.

**Langkah reproduksi:**
1. Buka seksi 05 Penjualan.
2. Ubah `#sa-harga` menjadi `12345`, lalu `3750`.
3. Lihat pesan browser saat input kehilangan fokus.

**Harapan:** Aplikasi menolak input dengan kalimat sendiri berbahasa Indonesia, atau menerima semua nominal yang masuk akal.

**Kenyataannya:** Atribut `step="500"` memunculkan pesan miliknya sendiri, dalam Bahasa Inggris, dan menolak nominal yang wajar.

**Evidence:**
```
input 12345 -> stepMismatch=true
validationMessage: "Please enter a valid value. The two nearest valid values are 12000 and 12500."
input 3750 -> stepMismatch=true
validationMessage: "Please enter a valid value. The two nearest valid values are 3500 and 4000."
```
Sumber: `js/ui.js:130` (`moneyInput`) dan `js/ui.js:135` (`signedInput`). impacted: `#spp-dana`, `#bg-alokasi`, `#dc-nominal`, `#sa-harga`, `#ex-jumlah`, `#adj-jumlah`, `#prep-biaya`, `#st-tarif`.

**Dampak ke pengguna awam:** User tidak tahu apa itu "step mismatch", dan angka 12000/12500 tidak ada hubungannya dengan pengetahuan dia. Dia akan mengira aplikasinya rusak, atau lebih buruk, menyimpan 12.500 sebagai pengganti 12.345 karena itu yang ditawarkan. Angka tersimpan tidak sama dengan yang diketik.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Ubah `step` ke `1`, lalu validasi di sisi aplikasi dengan kalimat Indonesia. Kalau kelipatan 500 memang wajib, Valley buttom perlu kalimat: "Isi nominal bulat, contoh: 12500."

---

### [BUG-05] Pesan error `JSON.parse` mentah tampil ke pengguna — TINGGI

**Persona dan use-case:** user memilih file yang salah saat "Pulihkan dari File", misalnya berkas `.txt` atau foto.

**Langkah reproduksi:**
1. Trigger `data:import` (`js/actions.js:548`) dengan isi non-JSON.
2. Lihat toast yang muncul.

**Harapan:** "File itu bukan file backup. Pilih berkas .json hasil 'Backup ke File'."

**Kenyataannya:** `e.message` dari parser JavaScript ditampilkan mentah ke layar.

**Evidence:**
```
import teks ngawur : "Unexpected token 'b', "bukan json" is not valid JSON"
import json lain   : "Format backup tidak dikenali: bukan file backup SPPD Toolbox."
```
Sumber: `js/actions.js:553` — `ui.toast(e.message, 'error')`. Pola serupa di `js/actions.js:534` (`'Gagal membuat backup: ' + e.message`) dan `js/store.js:331` (`'Gagal menyimpan ke localStorage'`).

**Dampak ke pengguna awam:** User melihat kata "Unexpected token" dan "JSON" — dua hal yang tidak pernah dia dengar, dan tidak ada tindakan yang bisa dia lakukan. Risikonya: karena tidak paham, dia mencoba "Backup ke File" (menimpa) lalu mencoba pulihkan lagi, atau menyerah dan menganggap datanya hilang.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Jangan pernah menampilkan `e.message` ke pengguna awam. Tulis pesan tetap berbahasa Indonesia dan sertakan nama berkas yang tadi dipilih.

---

### [BUG-06] Instruksi developer ditampilkan ke pengguna sebagai bagian UI — TINGGI

**Persona dan use-case:** user awam membuka Dashboard atau Pengaturan hanya untuk tahu "apakah data saya aman".

**Langkah reproduksi:**
1. Buka `#/dashboard`, baca banner di bawah.
2. Buka `#/settings`, baca kartu "Status Integrasi".

**Harapan:** Banner menjelaskan kondisi data dengan bahasa sehari-hari.

**Kenyataannya:** Dua tempat memuat catatan untuk pengembang, termasuk sintaks komentar kode.

**Evidence:**
```
banner dashboard (js/pages.js:36):
"Data tersimpan di browser (localStorage) + contoh dummy. GAS & Supabase belum tersambung — tandai // FUTURE: GAS / SUPABASE di kode."

kartu Status Integrasi (js/pages2.js:892):
"Setelah key GAS & Supabase tersedia, tinggal ganti data layer di js/store.js — struktur sudah disiapkan. Tandai // FUTURE."
```
Istilah lain di `#/settings`: `Pending` 3x, `GAS` 2x, `Supabase` 2x, `Drive` 2x, `NIP` 1x, `localStorage` 1x, `dummy` 1x.

**Dampak ke pengguna awam:** `// FUTURE`, `js/store.js`, "data layer", "struktur sudah disiapkan" adalah bahasa mesin. Untuk persona ini kalimat itu bukan "berlebihan" — dia sama sekali tidak bisa memakainya, dan teks panjang teknis justru menutupi satu-satunya informasi yang dia butuhkan: "data saya disimpan di HP ini, belum tersinkron".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Hilangkan catatan `// FUTURE` dari UI; ganti dengan satu kalimat status yang bisa ditindaklanjuti.

---

### [BUG-07] Footer salah dan memakai jargon — TINGGI

**Persona dan use-case:** user mencari "halaman Roadmap" karena footer mengatakannya ada.

**Langkah reproduksi:**
1. Baca footer di halaman mana pun.
2. Cari menu atau pill bernama "Roadmap".
3. Hitung jumlah tab di Layar Kerja.

**Harapan:** Footer menggambarkan struktur aplikasi yang sedang tampil.

**Kenyataannya:** Footer menyebut 3 tab yang sudah tidak ada, dan menjanjikan "Roadmap Pengawasan" sebagai "permukaan utama" — padahal tidak ada halaman Roadmap sama sekali.

**Evidence:**
```
footer (index.html:57): "SPPD Toolbox — Prototype v0.6 · Event terfokus 3 tab: Roadmap · Persiapan · Uang & Laporan."
footer (index.html:58): "GAS & Supabase pending — lihat halaman Pengaturan. Serius digarap: Roadmap Pengawasan jadi permukaan utama."
apakah kata "Roadmap" muncul di UI? TIDAK
pill alur sebenarnya: 01 SPPD | 02 Jadwal | 03 Produk | 04 Item | 05 Penjualan | 06 Kas | 07 Pulang | 08 Laporan
```

**Dampak ke pengguna awam:** User menangkap nama "Roadmap" dari footer, mencarinya di 8 menu, tidak menemukannya, lalu menyimpulkan ada menu yang hilang atau aplikasinya belum selesai. Kata `pending` juga Bahasa Inggris. "Serius digarap ... jadi permukaan utama" adalah bahasa internal tim.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tulis footer yang menggambarkan kondisi saat ini (jumlah halaman, jumlah seksi). Pindahkan catatan roadmap ke dokumen internal.

---

### [BUG-08] "Event H-1" menempel dengan angka "2" dan terbaca "Event H-12" — TINGGI

**Persona dan use-case:** user membuka Dashboard untuk memutuskan tahap mana yang harus dikerjakan hari ini.

**Langkah reproduksi:**
1. Buka `#/dashboard`.
2. Ambil `textContent` dari blok `.overall-progress`.
3. Bandingkan dengan node teks terpisah di DOM.

**Harapan:** Nama tahap dan penghitung progres terpisah jelas, tanpa menyatu jadi angka palsu.

**Kenyataannya:** Dua node teks bersebelahan tanpa spasi. secara visual masih dua baris, tapi saat dibaca teknologi apa pun (screen reader, salin-tempel, Ctrl+F) keduanya menyatu.

**Evidence:**
```
milestone evt-1: Persiapan[selesai], Berangkat[selesai], Event H-1[aktif], Pulang[todo], Laporan[todo]
textContent hero: "Sedang berjalanPameran UMKM Nusantara Expo 202640%Tahap aktif: Event H-12 dari 5 selesai (40%)"
node A: "Tahap aktif: Event H-1"   (js/pages.js:62)
node B: "2 dari 5 selesai (40%)"  (js/pages.js:30)
=> terbaca "Tahap aktif: Event H-12 dari 5 selesai (40%)"
```
Tidak ada milestone bernama "H-12" di seed. Kalau 3 tahap selesai, teksnya jadi "Event H-13".

**Dampak ke pengguna awam:** Nama tahap berubah tergantung angka. User akan mencari tahap "H-12" yang tidak ada, atau mengira tahapnya sudah bergeser. Ini jenis hal yang membuat user berhenti percaya pada angka aplikasi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan spasi atau pemisah yang terlihat di akhir node A, dan tulis `H-1` sebagai "1 hari sebelum event" supaya tidak bisa tertukar dengan angka lain.

---

### [BUG-09] Satuan produk diabaikan, selalu tampil "pcs" — TINGGI

**Persona dan use-case:** user menjual "Kopi Bubuk Premium" yang satuan aslinya `pack`, lalu memeriksa rekap penjualan.

**Langkah reproduksi:**
1. Buka seksi 05 Penjualan pada `evt-1`.
2. Baca blok "Rekap per Produk".
3. Bandingkan dengan satuan produk di katalog.

**Harapan:** Satuan yang tampil mengikuti satuan produk (`pcs` / `pack` / `botol`).

**Kenyataannya:** Kode mengetik literal `" pcs"`, mengabaikan `p.satuan`.

**Evidence:**
```
satuan produk di seed (js/store.js:100-107):
  Batik Tulis=pcs, Tenun Ikat=pcs, Kopi Bubuk Premium=pack,
  Gantungan Kunci Kayu=pcs, Totebag Kanvas=pcs, Kripik Pisang=pack,
  Kerajinan Bambu=pcs, Minuman Herbal=botol
baris rekap: "Kopi Bubuk Premium 30 pcs Rp 1.050.000"   <-- seharusnya 30 pack
semua "N pcs" di blok Penjualan: ["12 pcs","9 pcs","30 pcs"]
```
Sumber: `js/pages2.js:154` dan `js/pages2.js:780`.

**Dampak ke pengguna awam:** User yang menjual per bungkus melihat "30 pcs" di laporan. Kalau dia mencatat stok dalam satuan bungkus, angka di laporan tidak bisa dibandingkan dengan catatan fisiknya. Salah satuan berarti salah laporan keuangan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pakai `p.satuan` dari katalog, dan tampilkan satuan produk secara eksplisit di tiap baris rekap.

---

### [BUG-10] Tombol "Cetak SPPD" tapi hasilnya "Laporan Penggunaan Uang" — TINGGI

**Persona dan use-case:** user ingin mencetak surat tugas untuk dibawa ke instansi, menekan tombol besar di hero.

**Langkah reproduksi:**
1. Baca label tombol di hero Layar Kerja.
2. Klik, lalu baca `<h1>` dokumen yang tercetak.

**Harapan:** Label tombol dan isi hasil cetakan sama.

**Kenyataannya:** Label menyebut SPPD, isi dokumen menyebut laporan keuangan.

**Evidence:**
```
tombol di UI  : "Cetak SPPD"   (js/pages.js:313, js/pages.js:480, js/pages2.js:324)
judul h1 cetak: "Laporan Penggunaan Uang"   (js/pages2.js:983)
header tabel cetak: Leg | Rute | Mode | Biaya | Kategori | Deskripsi | Tanggal | Wallet | Jumlah | ...
```
Isi cetak juga memakai header `Wallet`, `Leg`, `Mode`, `Alokasi`, `Realisasi` yang bukan istilah surat dinas.

**Dampak ke pengguna awam:** User mencetak, bahkan menandatangani, lalu bawa ke instansi — dan yang keluar adalah tabel keuangan. Persis skenario "salah tanpa sadar" yang paling merusak kepercayaan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pisahkan dua aksi: "Cetak Surat SPPD" dan "Cetak Laporan Keuangan", dan samai dengan isi dokumen.

---

### [BUG-11] Nol ikon dan nol gambar di seluruh aplikasi — SEDANG

**Persona dan use-case:** user yang mengenali aplikasi lewat bentuk, bukan lewat tulisan.

**Langkah reproduksi:**
1. Untuk setiap 9 rute, hitung `svg`, `img`, dan elemen berkelas emoji.
2. Periksa tombol navigasi dan tombol seksi.

**Harapan:** Ikon atau gambar sebagai penanda utama, teks sebagai pendamping.

**Kenyataannya:** Tidak ada satu pun ikon atau gambar di konten yang dirender. Semua penanda visual berupa teks atau karakter.

**Evidence:**
```
#/dashboard                   : svg=0 img=0
#/events                     : svg=0 img=0
#/archive                    : svg=0 img=0
#/events/evt-1 (Layar Kerja) : svg=0 img=0
#/products                   : svg=0 img=0
#/master                     : svg=0 img=0
#/reports                    : svg=0 img=0
#/guide                      : svg=0 img=0
#/settings                   : svg=0 img=0
```
Satu-satunya SVG di aplikasi adalah tombol hamburger di `index.html:42`, dan chevron lipatan seksi memakai karakter teks `▾` / `▸`.

**Dampak ke pengguna awam:** 8 menu navigasi semuanya teks tanpa pembeda bentuk (`js/app.js:10-17`): `Dashboard`, `Event & Tugas`, `Arsip`, `Produk`, `Master Barang`, `Rekap Global`, `Panduan`, `Pengaturan`. User harus membaca dan mengingat nama, bukan mengenali bentuk. Ini beban terbesar untuk persona ini.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan ikon sederhana per menu dan per seksi, dan biarkan teks tetap sebagai keterangan.

---

### [BUG-12] Lebih dari 15 istilah teknis tanpa penjelasan di tempat dipakai — SEDANG

**Persona dan use-case:** user membuka seksi 05 Penjualan untuk pertama kali. Kata "Wallet", "Qty", dan "rekap" tidak berarti apa-apa baginya.

**Langkah reproduksi:**
1. Render Layar Kerja `evt-1`, ambil `textContent`.
2. Hitung frekuensi tiap istilah.
3. Cari apakah ada kalimat penjelas di halaman yang sama.

**Harapan:** Istilah teknis disertai penjelasan singkat di halaman tempat muncul pertama kali.

**Kenyataannya:** Hampir semua istilah muncul tanpa penjelasan. Penjelasan yang ada pun tidak memadai: penjelasan `SPPD` berupa kalimat panjang, dan penjelasan `Milestone` di Panduan justru memakai kata itu tanpa menguraikannya.

**Evidence:**
```
SPPD 25 | E-Money 15 | Alokasi 13 | Wallet 11 | Qty 10 | QRIS 9 | Rekap 8 |
Realisasi 6 | rekap 5 | Transfer 4 | Cash 3 | Milestone 2 | opname 2 | Audit 2 |
Cross-check 1 | oversold 1 | Leg 1 | Draft 1 | NIP 1 | H-1 1 | dana talangan 1

Cek penjelasan di halaman yang sama:
  SPPD      -> ADA, tapi kalimat panjang 100+ karakter
  Milestone -> hanya kata "tahap" yang muncul di teks lain,
               itu pemakaian ulang kata, bukan definisi
  Wallet    -> satu help text: "Alokasi ini dicatat ke dompet ini
               saat dana dipakai." (js/pages.js:449)
               kata "dompet" != kata "Wallet" yang tampil di 11 tempat
  QRIS      -> TIDAK ADA
  Rekap     -> TIDAK ADA
  oversold  -> TIDAK ADA
  NIP       -> TIDAK ADA
```
Sumber per istilah: `SPPD` `js/pages.js:480`; `E-Money` / `QRIS` `js/pages2.js:170`; `Wallet` `js/pages2.js:485`; `Qty` `js/pages2.js:168`; `Cross-check` `js/pages2.js:354`; `oversold` `js/pages2.js:692`; `opname` `js/pages2.js:208`; `Leg` `js/pages.js:509`; `dana talangan` `js/pages2.js:237`; `NIP` `js/pages2.js:878`; `pcs/pack` `js/pages2.js:51`.

Catatan: Panduan **ada** (`js/pages2.js:849`) dan memakai kata "Milestone" 3x, tetapi tidak pernah menguraikannya: "Milestone bawaan (Persiapan → Berangkat → Event → Pulang → Laporan) tinggal ditandai Belum/Berjalan/Selesai."

**Dampak ke pengguna awam:** User berhenti di kata pertama yang tidak dikenal dan tidak pernah sampai ke angka. `oversold` khususnya berbahaya karena muncul sebagai label tabel audit (`js/pages2.js:692`) dan satu-satunya penjelasannya melingkar: "Badge = rekap keuangan-selesai saat tidak oversold." (`js/pages2.js:466`).

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan satu baris glosarium di bawah tiap judul seksi yang memuat istilah baru. Ganti istilah Inggris dengan Bahasa Indonesia, simpan aslinya dalam kurung hanya di Panduan.

---

### [BUG-13] Nilai uang tampil mentah di dalam kotak input — SEDANG

**Persona dan use-case:** user ingin memverifikasi nominal yang sudah diketik sebelum menekan Simpan.

**Langkah reproduksi:**
1. Render Layar Kerja.
2. Baca `value` setiap input uang.

**Harapan:** Kotak input menampilkan `2.500.000` atau `Rp 2.500.000` agar mudah dicocokkan dengan surat tugas.

**Kenyataannya:** Semua input uang menampilkan angka mentah tanpa pemisah ribuan dan tanpa awalan `Rp`. Baris transportasi juga menampilkan tarif per kilometer mentah.

**Evidence:**
```
#spp-dana    value="2500000" step=500 type=number
#bg-alokasi  value="0"        step=500 type=number
#dc-nominal  value="0"        step=500 type=number
#sa-harga    value="250000"   step=500 type=number
#ex-jumlah   value="0"        step=500 type=number
#adj-jumlah  value="0"        step=500 type=number
#prep-biaya  value="0"        step=500 type=number

baris transportasi tampil: "20 km x 4500 + bensin/tol Rp 0 - bayar Kas"
data: leg=Pulang mode=pribadi detail={"jarakKm":20,"tarifPerKm":4500,"biayaBensinTol":0}
```
Sumber: `js/ui.js:130`, `js/ui.js:135`, dan `js/pages.js:493`.

**Dampak ke pengguna awam:** `2500000` tanpa pemisah harus dihitung sendiri oleh user. `250000` bisa berarti 250 ribu atau 2 juta 500 ribu. Untuk user alfabetisasi rendah ini sumber kesalahan input yang sangat mungkin terjadi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tampilkan pemisah ribuan realtime saat input kehilangan fokus (simpan nilai numeriknya di `data-*`), dan tambahkan awalan "Rp" di dalam field.

---

### [BUG-14] Campuran Bahasa Inggris dan singkatan di seluruh Layar Kerja — SEDANG

**Persona dan use-case:** user membaca daftar pilihan metode pembayaran dan tidak tahu apa yang berbeda di antaranya.

**Langkah reproduksi:**
1. Render Layar Kerja, kumpulkan seluruh `<option>` dan label.
2. Hitung frekuensi term.

**Harapan:** Semua pilihan menggunakan Bahasa Indonesia yang jelas.

**Kenyataannya:** Banyak pilihan memuat Bahasa Inggris atau singkatan tanpa penjelasan.

**Evidence:**
```
select Metode/Wallet (Penjualan), js/pages2.js:170:
  "Cash (Kas)"         <-- "Cash" Inggris
  "QRIS"               <-- akronim tanpa penjelasan
  "Transfer (Bank)"   <-- "Transfer" Inggris
  "E-Money"            <-- Inggris

select Status Alur (SPPD), js/pages.js:471: Draft | Diajukan | Disetujui | Selesai
  "Draft" Inggris; badge "draft" di js/pages.js:113

badge status integrasi, js/pages2.js:888-891: "Pending" 3x
label "Nama / NIP", js/pages2.js:878                 -> NIP = Nomor Induk Pegawai
label "Tarif Reimbursement / km", js/pages2.js:880   -> jargon
label "Folder Drive Bukti (ID)", js/pages2.js:881
heading "Anggaran vs Realisasi per Komponen", js/pages2.js:497
heading "Bandingkan SPPD vs Realisasi vs Penjualan", js/pages2.js:531
heading "Audit Aset Berangkat & Pulang", js/pages2.js:717
nav "Rekap Global", js/app.js:15
nav "Master Barang", js/app.js:14
nav "Dashboard", js/app.js:10
toast "Popup diblokir - buka lewat jendela cetak di bawah", js/actions.js:584
empty state "Belum ada progress berjalan", js/pages.js:48
keterangan penyesuaian "dana talangan", js/pages2.js:237
keterangan mode "(reimbursement km x tarif)", js/pages.js:504
```
Frekuensi di Layar Kerja: `Cash` 3x, `Transfer` 4x, `Draft` 1x, `NIP` 1x, `Audit` 2x, `dana talangan` 1x, `Leg` 1x.

**Dampak ke pengguna awam:** "Cash" dan "Transfer" mungkin masih kebaca, tetapi "Pending", "Reimbursement", "NIP", "vs", dan "Popup" tidak. User harus menebak dari konteks, dan menebak nominal uang selalu berisiko.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Ganti seluruh label Inggris dengan Bahasa Indonesia. Untuk "Cash (Kas)" dan "Transfer (Bank)" arahnya sudah benar, tinggal buang kata Inggrisnya.

---

### [BUG-15] Tanda minus tidak konsisten, bahkan di dalam satu tabel — SEDANG

**Persona dan use-case:** user membandingkan kolom Masuk dan Keluar pada tabel Arus Kas.

**Langkah reproduksi:**
1. Render tabel "Laporan Arus Kas per Wallet" di seksi 08.
2. Bandingkan glyph pada kolom Keluar dan kolom Saldo.

**Harapan:** Satu gaya penandaan angka minus di seluruh aplikasi.

**Kenyataannya:** Ada dua glyph berbeda dipakai berdampingan di tabel yang sama.

**Evidence:**
```
tabel Arus Kas per Wallet (js/pages2.js:968), evt-1:
  Bank     | +Rp 1.000.000 | -Rp 0          | Rp 1.000.000
  QRIS     | +Rp 1.250.000 | -Rp 0          | Rp 1.250.000
  Kas      | +Rp 1.730.000 | -Rp 1.935.000  | Rp -205.000
  E-Money  | +Rp 0         | -Rp 0          | Rp 0

Kolom "Keluar" memakai U+2212 (tanda minus typografis).
Kolom "Saldo" memakai ASCII U+002D lewat ui.fmt(): "Rp -205.000".
Sumber: js/pages2.js:968 vs js/ui.js:17-20.
```
Selain itu `ui.fmt(-25000)` menghasilkan `"Rp -25.000"` (ASCII), sementara teks lain memakai U+2212, misalnya `"−Rp 0"` pada kartu penyesuaian kas.

**Dampak ke pengguna awam:** Dua tanda yang berarti sama tapi tampil berbeda dalam satu layar membuat user curiga ada dua jenis pengurangan. ASCII `-` juga mudah tertukar dengan tanda hubung biasa.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pilih satu glyph (U+2212) dan pakai di `ui.fmt` serta semua pemformatan manual, lewat satu fungsi helper.

---

### [BUG-16] Tanda centang dan bullet tanpa legenda — SEDANG

**Persona dan use-case:** user membuka Layar Kerja untuk pertama kali dan ingin tahu apakah sudah siap berangkat.

**Langkah reproduksi:**
1. Render blok `.hero-checks`.
2. Hitung elemen `.check-yes` dan `.check-no`.
3. Cari penjelasan arti tanda di halaman.

**Harapan:** Dua status dengan label yang jelas, atau legenda singkat.

**Kenyataannya:** Hanya dua tanda yang sangat mirip, tanpa keterangan. Bullet `•` untuk yang belum selesai terlihat lebih netral daripada centang untuk yang selesai.

**Evidence:**
```
hero-checks: check-yes=3 check-no=3
isi: "SPPD lengkap" | "Produk dicatat" | "Item persiapan dibawa" |
     "Saldo aman" | "Siap berangkat" | "Pulang tuntas"
tanda: 3 check dan 3 bullet, tanpa legenda
sumber: js/pages2.js:314 -> (c.ok ? '✓ ' : '• ') + c.label
gaya: css/styles.css:318 (.hero-checks span, font-size 12px)
status yang dipakai: "Berjalan", "Belum", "Selesai" (js/ui.js:50, js/ui.js:53)
```

**Dampak ke pengguna awam:** User melihat bullet dan mengira itu berarti "netral atau belum dijawab", bukan "belum dikerjakan". Karena tidak ada legenda, dia tidak tahu harus mencari mana yang salah, padahal daftar ini adalah syarat keberangkatan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Ganti bullet dengan label teks "belum" dan "sudah", atau tambahkan satu kalimat legenda di bawah daftar.

---

### [BUG-17] Persentase besar tanpa keterangan apa yang dihitung — SEDANG

**Persona dan use-case:** user melihat angka "40%" sebesar itu di hero dan mengira itu berarti "sudah 40 persen selesai".

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, baca angka besar di hero.
2. Buka `#/dashboard`, baca angka besar di kartu event.
3. Cari kalimat yang menjelaskan apa yang dihitung.

**Harapan:** Setiap `%` selalu terkait dengan sesuatu yang dinamai.

**Kenyataannya:** Angka besar berdiri sendiri tanpa keterangan. Baris penjelas ada tapi sangat kecil, dan di Dashboard penjelasannya tidak lengkap.

**Evidence:**
```
hero Layar Kerja (js/pages2.js:319-321):
  "Progres persiapan" / "40%" / bar
  "2 dari 5 tahap selesai - Kas akhir Rp 4.545.000 - Dana cair Rp 1.500.000"

Dashboard (js/pages.js:60-63):
  "40%" + bar, lalu "Tahap aktif: Event H-1"
  progressBar() = "2 dari 5 selesai (40%)"

ui.progress() (js/ui.js:138-143) -> hanya bar + "40%", tanpa teks
kartu event di Dashboard memakai ui.progress() -> hanya "40%"

baris metrik: font 12px muted (css/styles.css:279)
```

**Dampak ke pengguna awam:** "40%" tidak berarti apa-apa tanpa nama. Baris penjelas menggabungkan tiga angka berbeda dalam satu baris kecil, jadi user tidak tahu angka mana yang sedang dia baca.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tulis di bawah angka besar apa yang dihitung, dan pisahkan tiga angka metrik menjadi tiga baris atau tiga kartu.

---

### [BUG-18] Janji "selisihnya tampil di bawah" tidak ditepati — SEDANG

**Persona dan use-case:** user mengira total rincian dan Dana Awal sudah dibandingkan otomatis oleh aplikasi.

**Langkah reproduksi:**
1. Buka seksi 01 SPPD.
2. Baca teks pengantar blok Rincian Alokasi.
3. Cari baris nilai selisih di bawah blok itu.

**Harapan:** Aplikasi menampilkan selisihnya seperti yang dijanjikan teks.

**Kenyataannya:** Hanya dua baris nilai yang tampil (total rinci dan Dana Awal), tanpa baris selisih. Selisih harus dihitung manual oleh user.

**Evidence:**
```
teks promise (js/pages.js:424):
  "Total bisa beda dari Dana Awal - selisihnya tampil di bawah dan di seksi 08."
yang tampil (js/pages.js:439-442):
  "Total alokasi rinci   Rp 2.850.000"
  "Dana Awal SPPD        Rp 2.500.000"
  (tidak ada baris selisih di seksi 01)
```
Teks juga memuat rumus dalam prosa: "Kembali = dibawa − terjual − rusak/hilang" (`js/pages2.js:58`) dan "dana awal + penjualan + koreksi kas − transport − pengeluaran" (`js/pages2.js:823`).

**Dampak ke pengguna awam:** User melihat dua angka yang berbeda 350 ribu dan mengira ada kesalahan, karena tidak ada yang menjelaskan selisihnya. Risikonya user justru mengoreksi sendiri dengan cara yang salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan baris "Selisih: +Rp 350.000 (total rinci lebih besar dari Dana Awal)" tepat di bawah, sesuai janji teks.

---

### [BUG-19] Urutan judul Panduan salah: "9b." muncul sebelum "1." — SEDANG

**Persona dan use-case:** user membuka Panduan sebagai halaman pertama untuk belajar memakai aplikasi.

**Langkah reproduksi:**
1. Buka `#/guide`.
2. Baca urutan seluruh `<h3>`.

**Harapan:** Judul bernomor berurutan dari 1.

**Kenyataannya:** Judul bernomor "9b." muncul di posisi ketiga, sebelum "1.". Dua judul pertama juga tidak bernomor, dan tidak ada daftar isi.

**Evidence:**
```
urutan h3 di Panduan:
  [1] Peta Menu - 8 halaman
  [2] Keterhubungan Data
  [3] 9b. Bagaimana alokasi rinci tersinkron dengan kas?   <-- di sini
  [4] 1. Sistem ini untuk apa?
  [5] 2. Bagaimana memulai?
  ...
  [15] 12. Kenapa ada "Prototype" di pojok?
sumber: js/pages2.js:827 (9b) vs js/pages2.js:830 (1)
total karakter Panduan = 6097, tanpa daftar isi
```

**Dampak ke pengguna awam:** User yang mencari bagian "Bagaimana memulai" harus melewati judul bernomor 9b. Worse, karena tidak ada daftar isi, dia menyimpulkan ada bagian yang hilang dan nomornya salah cetak.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pindahkan blok 9b ke dalam blok 9, atau beri nomor "Pengantar". Tambahkan daftar isi di bagian atas Panduan.

---

### [BUG-20] Tombol konfirmasi "Hapus" untuk dialog "Reset data?" — SEDANG

**Persona dan use-case:** user ingin mengembalikan aplikasi ke data contoh, lalu menekan "Reset Data Dummy".

**Langkah reproduksi:**
1. Buka `#/settings`, klik "Reset Data Dummy".
2. Baca judul dialog dan label tombol OK.

**Harapan:** Tombol OK sesuai dengan aksinya, misalnya "Reset".

**Kenyataannya:** `ui.confirm` selalu memakai teks "Hapus" untuk semua konfirmasi, termasuk reset dan hapus grup.

**Evidence:**
```
dialog reset (js/actions.js:513):
  "Reset data?" / "Semua data kamu diganti dengan contoh dummy." / "Batal" / "Hapus"

dialog hapus event:
  "Hapus event?" / "Semua data SPPD, produk, penjualan & keuangan event ini ikut terhapus." / "Batal" / "Hapus"

tombol: js/ui.js:101 -> data-action="modal:ok">Hapus</button>  (hardcoded)
tombol pemicu: js/pages2.js:900 -> "Reset Data Dummy"
```

**Dampak ke pengguna awam:** User melihat "Hapus" dan mempercayai semua datanya akan dihapus, padahal yang terjadi adalah diganti contoh. User mungkin membatalkan aksi yang memang dia inginkan. Sebaliknya, risk-nya user membatalkan reset karena takut kehilangan data.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Beri `ui.confirm` parameter label tombol, jadi "Hapus" untuk hapus dan "Ganti dengan Contoh" untuk reset.

---

### [BUG-21] "Kas akhir" dan "Saldo akhir" untuk angka yang sama — SEDANG

**Persona dan use-case:** user memverifikasi angka akhir dari dua tempat berbeda.

**Langkah reproduksi:**
1. Baca baris ringkasan di hero Layar Kerja.
2. Baca sub-judul seksi 08.
3. Bandingkan nama yang dipakai untuk angka `Rp 4.545.000`.

**Harapan:** Satu istilah untuk satu angka.

**Kenyataannya:** Angka identik punya dua nama berbeda di dua tempat.

**Evidence:**
```
hero (js/pages2.js:321): "2 dari 5 tahap selesai - Kas akhir Rp 4.545.000 - Dana cair Rp 1.500.000"
sub-judul seksi 08 (js/pages2.js:355): "Saldo akhir Rp 4.545.000"
baris tabel saldo (js/pages2.js:998): "Saldo akhir" | "Rp 4.545.000"
frekuensi di Layar Kerja: "Kas akhir" 1x, "Saldo akhir" 4x (js/pages2.js:267, 537, 547, 998)
ketika yang sama dihitung: ui.fmt(s.saldo) -> Rp 4.545.000
```

**Dampak ke pengguna awam:** User mengira "Kas akhir" dan "Saldo akhir" adalah dua pos berbeda, lalu salah memilih mana yang benar saat membuat laporan keuangan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pilih satu istilah ("Saldo akhir") dan pakai konsisten di hero, seksi 06, dan seksi 08.

---

### [BUG-22] Instruksi panjang tanpa contoh — SEDANG

**Persona dan use-case:** user membaca blok pengantar di seksi 01 untuk memahami cara mengisi alokasi.

**Langkah reproduksi:**
1. Ukur panjang teks pengantar tiap blok.
2. Cari apakah ada contoh konkret dengan kata "mis.".

**Harapan:** Satu kalimat pendek plus satu contoh konkret.

**Kenyataannya:** Paragraf panjang tanpa satu pun contoh, sementara field lain di bagian yang sama justru punya placeholder contoh.

**Evidence:**
```
[Rincian Alokasi SPPD, js/pages.js:424] 268 karakter, tanpa contoh
  "Anggaran per komponen seperti di surat SPPD (penginapan, transport, uang saku,
   kas kecil, tol, bensin, e-money, dll). Tentukan juga wallet tujuan - dana
   alokasi ini akan masuk ke dompet mana. Total bisa beda dari Dana Awal -
   selisihnya tampil di bawah dan di seksi 08."

[Rekap Item Persiapan, js/pages2.js:718] 190 karakter, tanpa contoh
[Rekap Produk & Qty, js/pages2.js:466] 155 karakter, tanpa contoh
[blok Pengeluaran] 204 karakter, tanpa contoh
ada kata "mis." di blok Rincian Alokasi? false

bandingkan, field yang punya placeholder contoh:
  "Kategori Lain" -> "mis. Sewa Generator"  (js/pages.js:447)
  "Keterangan"    -> "mis. 2 malam hotel"
  "Nomor Surat"   -> "mis. 039/SPPD/2026"
```

**Dampak ke pengguna awam:** 268 karakter tanpa contoh jauh lebih sulit dipatuhi daripada satu kalimat. User tidak tahu harus mengisinya dengan nilai apa, jadi sering kosong atau diisi asal.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pecah menjadi maksimal dua kalimat, tambahkan satu contoh angka konkret, lalu pindahkan rumusnya ke Panduan.

---

### [BUG-23] 117 elemen teks hanya 11px, dan judul tabel 11px huruf kapital — SEDANG

**Persona dan use-case:** user membaca tabel Penjualan dan Rekap di layar HP.

**Langkah reproduksi:**
1. Render Layar Kerja.
2. Hitung `getComputedStyle(el).fontSize` untuk semua elemen yang punya teks langsung.

**Harapan:** Font minimal 12-14px, dan judul tabel tidak ditulis kapital semua dengan `letter-spacing`.

**Kenyataannya:** Lebih dari seperempat elemen teks Layar Kerja berukuran 11px atau 12px, dan judul tabel 11px uppercase.

**Evidence:**
```
sebaran font-size (px: jumlah elemen teks) di Layar Kerja:
  {"11":117, "12":113, "14":279, "16":220, "19":2, "22":8, "24":23, "32":1, "56":1}
=> 230 dari 776 elemen teks (30%) berukuran 11-12px

.table th      font-size=11px  text-transform=uppercase  letter-spacing=.04em  (css/styles.css:95-96)
.psec-title    font-size=14px  text-transform=uppercase  letter-spacing=.03em  (css/styles.css:271-273)
.ev-head-kicker font-size=11px text-transform=uppercase                        (css/styles.css:303)
.badge         font-size=11px                                                   (css/styles.css:89)
.btn-sm        font-size=12px                                                   (css/styles.css:69)
.psec-sub      font-size=12px                                                   (css/styles.css:279)
```

**Dampak ke pengguna awam:** 11px itu kira-kira 8 poin. Huruf kapital dengan `letter-spacing` menambah jarak antar huruf sehingga kata panjang seperti "REALISASI" dan "KATEGORI" lebih sulit dipecah mata. Untuk orang yang membaca lambat, judul tabel justru bagian paling penting untuk dipindai cepat.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Naikkan `.table th` ke minimal 13px, hapus `uppercase` pada judul tabel dengan menggantinya `font-weight` lebih tebal, dan naikkan `.badge` ke 12px.

---
### [BUG-24] Singkatan "SPP" tidak konsisten dengan "SPPD" — RENDAH

**Persona dan use-case:** user mencari label tombol yang sama persis dengan yang tertulis di surat tugas.

**Langkah reproduksi:**
1. Baca semua tombol di Layar Kerja.
2. Bandingkan dengan label di seksi 01 SPPD.

**Harapan:** Satu istilah untuk satu dokumen.

**Kenyataannya:** Tombol "Cetak SPPD" dan "Simpan SPPD" memakai kepanjangan, tapi satu tombol memakai singkatan yang berbeda.

**Evidence:**
```
tombol "Simpan SPPD"  -> js/pages.js:480
tombol "Cetak SPPD"   -> js/pages.js:313, js/pages2.js:324
tombol "Edit SPP"     -> js/pages2.js:325   <-- singkatan lain
judul seksi           -> "01 SPPD - Surat Perintah Payments Delegasi"
```

**Dampak ke pengguna awam:** User yang mengingat "SPP" dari satu tombol akan mencari kata itu di tempat lain dan tidak menemukannya. Dampaknya kecil, tapi bertambah satu hal yang harus diingat.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Gunakan satu bentuk saja, misalnya "SPPD" di semua tombol dan judul.

---

### [BUG-25] Kata Inggris "minus!" di sub-label angka negatif — RENDAH

**Persona dan use-case:** user membaca sub-label di bawah kartu "Penyesuaian Kas".

**Langkah reproduksi:**
1. Buka seksi 06 Kas.
2. Baca sub-label angka penyesuaian.

**Harapan:** Sub-label berbahasa Indonesia.

**Kenyataannya:** Kalimat penanda memakai kata Inggris "minus" dan tanda seru, gaya bahasa yang tidak konsisten dengan sisanya.

**Evidence:**
```
teks: "+ Rp 500.000 / minus! Rp 25.000"
sumber: js/pages2.js:210-212
bandingkan teks lain: "Dana Awal", "Dana Cair", "Belum ada", "Sudah ada"
```
Catatan: di bagian lain aplikasi sudah benar-benar memakai tanda minus, misalnya `"−Rp 0"`, sehingga gaya penandaan negateif sudah tidak konsisten (lihat BUG-15).

**Dampak ke pengguna awam:** Kalimat "minus!" terdengar seperti teguran dan membingungkan, bukan keterangan. Untuk user alfabetisasi rendah, tanda seru ditambah kata Inggris membuat sub-label ini paling sulit dibaca di kartu yang paling penting.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Ganti menjadi satu gaya yang sama dengan tabel, misalnya "masuk Rp 500.000 / keluar Rp 25.000".

---

### [BUG-26] Singkatan dan label sampingan yang tidak ada artinya — RENDAH

**Persona dan use-case:** user mencari daftar barang yang perlu dibawa.

**Langkah reproduksi:**
1. Buka seksi 07 Persiapan dan seksi 04 Item Barang.
2. Baca seluruh sub-label dan tabel.

**Harapan:** Setiap label menjelaskan diri sendiri.

**Kenyataannya:** Ada label satu kata dan satu huruf yang hanya dipahami kalau sudah paham istilah.

**Evidence:**
```
sub-judul seksi 07: "Total Dibawa (pcs/pack)"        (js/pages2.js:51)
keterangan produk:  "Est."                             (kategori biaya di master)
keterangan rekap:   "Rekap / status"                   (kolom tabel rekap)
status baris:       "rekap tuntas"                     (js/pages2.js)
kolom tabel:        "vs" pada "Anggaran vs Realisasi"  (js/pages2.js:497)
```
Satu-satunya penjelasan yang tersedia: `Keterangan di sini yang muncul di Rekap Produk & Qty` (`js/pages2.js:466`), yang memakai istilah "Rekap Produk & Qty" tanpa menguraikannya.

**Dampak ke pengguna awam:** User tidak bisa memastikan "pcs/pack" berarti apa, sehingga salah menghitung barang bawaan. "Est." tidak menjelaskan apakah perkiraan atau akhir.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tulis satuan lengkap per baris, dan ganti "Est." dengan "perkiraan".

---

### [BUG-27] Mode transportasi tampil mentah sebagai "umum", "pribadi", "sewa" — RENDAH

**Persona dan use-case:** user memeriksa kembali mode kendaraan yang dicatat.

**Langkah reproduksi:**
1. Buka seksi 02 Jadwal atau 03 Produk pada `evt-1`.
2. Baca kolom mode pada baris transportasi.

**Harapan:** Label mode sesuai dengan yang tertulis di pilihan form.

**Kenyataannya:** Yang tampil adalah nilai mentah internal huruf kecil, bukan label panjang yang dipakai di form.

**Evidence:**
```
pilihan form: "Transportasi Umum" | "Transportasi Pribadi" | "Sewa Kendaraan"
nilai data : mode = "umum" | "pribadi" | "sewa"
yang tampil di tabel  : "umum"      (js/pages.js:496)
yang tampil di hasil cetak: "umum"   (js/pages2.js:960)
```

**Dampak ke pengguna awam:** User mengira "umung" atau "sewe" adalah salah ketik, padahal memang itu isinya. Dia tidak bisa mencocokkan dengan apa yang dia pilih dulu karena bentuknya berbeda total.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tampilkan label lengkap yang sama dengan pilihan form, di UI maupun hasil cetak.

---

### [BUG-28] Hasil cetak hanya punya satu garis tanda tangan tanpa nama jabatan — RENDAH

**Persona dan use-case:** user mencetak dokumen untuk mendapat tanda tangan dari atasan.

**Langkah reproduksi:**
1. Panggil `A.printHTML('evt-1')`.
2. Baca bagian paling bawah dokumen.

**Harapan:** Blok tanda tangan menyebut nama jabatan yang harus menandatangani.

**Kenyataannya:** Hanya ada satu kalimat "Mengetahui" dan satu garis kosong, tanpa nama jabatan.

**Evidence:**
```
isi footer cetak: "Mengetahui, ______________"
ada nama jabatan? tidak
sumber: js/pages2.js:999
```

**Dampak ke pengguna awam:** User harus menebak siapa yang mengisi, dandocumentsatafirm yang tidak tepat membuat dokumen tidak sah saat dipakai. Ini agak di luar lingkup keterbacaan bahasa, tapi tetap berpengaruh.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan nama jabatan di bawah garis, minimal "Ketua Panitia".

---

### [BUG-29] "Belum ada progress berjalan" dan "rekap tuntas" memakai Bahasa Inggris — RENDAH

**Persona dan use-case:** user membuka Dashboard atau tabel audit untuk pertama kali.

**Langkah reproduksi:**
1. Buka `#/dashboard`, baca empty state.
2. Buka tabel audit di seksi 08, baca kolom status.

**Harapan:** Kalimat Bahasa Indonesia yang menjelaskan langkah berikutnya.

**Kenyataannya:** Kata "progress" dipakai sebagai bahasa sehari-hari, dan satu label status memakai kata "tuntas" yang tidak pernah dijelaskan.

**Evidence:**
```
empty state Dashboard: "Belum ada progress berjalan"        (js/pages.js:48)
label status audit   : "rekap tuntas"                        (js/pages2.js:692)
kalimat penjelasan   : "Badge = rekap keuangan-selesai saat tidak oversold." (js/pages2.js:466)
```
Bandingkan empty state lain yang memakai Bahasa Indonesia: "Belum ada produk" (`js/pages.js:115`), "Belum ada data untuk ditampilkan" (`js/pages2.js:786`).

**Dampak ke pengguna awam:** "Belum ada progress berjalan" menggabungkan dua kata dari dua bahasa tanpa keterangan. "Rekap tuntas" tanpa definisi membuat user tidak tahu apakah artinya sudah cocok atau sudah lengkap.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tulis "Belum ada kegiatan yang sedang berjalan", dan ganti "rekap tuntas" dengan "sudah cocok" plus penjelasan satu kalimat.

---

## Yang sudah bagus (tidak diubah)

Bagian-bagian berikut sudah benar dan tidak perlu diperbaiki. Ini saya catat supaya tidak terperbaiki secara tidak sengaja:

- **Format uang sudah konsisten.** Semua nilai yang sudah diformat tampil dengan awalan `Rp` dan pemisah ribuan titik, misalnya `Rp 2.500.000` dan `Rp 4.545.000`. `ui.fmt()` memakai `toLocaleString('id-ID')` dengan `maximumFractionDigits: 0`, jadi tidak ada angka pecahan atau `NaN` yang muncul. Ini membuat laporan keuangan jauh lebih terbaca daripada banyak aplikasi lain.
- **Bar Alur Kerja memberi urutan yang jelas.** Delapan seksi diberi nomor `01 SPPD` sampai `08 Laporan`, dan seksi bisa dilipat lewat chevron. Untuk user alfabetisasi rendah, urutan bernumber adalah petunjuk navigasi yang jauh lebih kuat daripada daftar menu tanpa nomor.
- **Halaman sudah sepenuhnya berbahasa Indonesia secara umum.** Label tombol, nama menu, pesan validasi form, dan empty state konsisten memakai Bahasa Indonesia. only some istilah teknis yang lolos (dibahas di BUG-12 dan BUG-14).
- **Ada Panduan yang cukup panjang.** Halaman `#/guide` menyediakan 15 blok penjelasan, termasuk penjelasan mengapa ada label "Prototype". Yang hilang hanya daftar isi dan urutan nomornya (BUG-19).
- **Validasi form sudah memakai kalimat sendiri.** Sebagian besar pesan validasi aplikasi sudah berbahasa Indonesia, misalnya pesan panjang untuk Dana Awal di `js/pages.js:430`. Ini menunjukkan mekanisme pesan validasi yang benar sudah tersedia; hanya pesan bawaan browser yang masih bocor (BUG-04).
- **Tombol penting terlihat menonjol.** Tombol seperti "Tambah Produk" dan "Simpan SPPD" memakai warna primer dan label berupa kata kerja, bukan kode. Ini benar untuk persona awam.
- **Aksesibilitas label sudah baik di sisi lain.** Sebagian besar input punya `id` dan `placeholder` yang memuat petunjuk, dan tabel memakai header yang konsisten, sehingga struktur informasi sudah terbaca.

## Pertanyaan terbuka / perlu konfirmasi

Beberapa temuan bergantung pada keputusan produk yang belum saya ketahui. Semua ini perlu konfirmasi sebelum diperbaiki, karena perbaikannya bisa jadi arah produk yang salah:

1. **Apakah label "H-1" disengaja?** Jika ya, apakah artinya "1 hari sebelum event"? Kalau bukan, mohon menjelaskan maksud aslinya, karena sekarang label itu bisa menempel dengan angka lain (BUG-08).
2. **Apakah perbedaan kategori "Operasional" dan "Operasional Lain" disengaja?** Kalau memang ada dua pos berbeda, nama di form perlu dibedakan lebih tegas. Kalau tidak, salah satu nama bisa dihapus (BUG-02).
3. **Apakah nominal uang memang harus kelipatan 500?** Kalau tidak, `step="500"` sebaiknya dihapus. Kalau ya, validasi perlu kalimat Indonesia yang menjelaskan aturannya, bukan pesan browser (BUG-04).
4. **Apakah tombol "Download Dokumen" pernah dipakai dengan dokumen asli?** Kalau belum pernah, lebih aman disembunyikan daripada menampilkan tombol mati yang styling-nya sama dengan tombol yang benar-benar bekerja (BUG-03).
5. **Apakah "Cetak SPPD" yang tampil di sini memang seharusnya mencetak SPPD, atau memang Laporan Keuangan yang salah label?** Ini menentukan apakah perbaikannya mengganti isi cetak atau mengganti label tombol (BUG-10).
6. **Apakah "Kas akhir" dan "Saldo akhir" sengaja berbeda?** Kalau memang berbeda, perlu penjelasan tambahan apa yang masing-masing hitung (BUG-21).
7. **Apakah `rekap tuntas` dan `progress berjalan` adalah istilah yang biasa dipakai oleh user?** Kalau internal, sebaiknya tidak masuk UI (BUG-29).
8. **Apakah satu-satunya hamburger di `index.html:42` cukup sebagai ikon navigasi?** Untuk target persona ini, kemungkinan belum, tapi ini keputusan desain, bukan bug (BUG-11).

## Skor pengalaman (1 = sangat buruk, 5 = sangat baik)

| Aspek | Skor | Catatan singkat |
|---|---|---|
| Menemukan menu yang dicari | 2 | 8 menu teks tanpa ikon, footer bahkan menyebut menu yang tidak ada (BUG-07, BUG-11). |
| Membaca angka rupiah | 4 | `Rp 2.500.000` selalu rapi, tapi input uang masih mentah `2500000` (BUG-13). |
| Memahami istilah | 2 | `SPPD` 25x, `Wallet` 11x, tanpa penjelasan; satu-satunya penjelasan `Wallet` memakai kata lain (BUG-12). |
| Memahami pesan error | 1 | `Unexpected token` dan `Please enter a valid value` muncul apa adanya (BUG-04, BUG-05). |
| Memahami status dan tanda | 2 | `✓` dan `•` tanpa legenda, `rekap tuntas` tanpa arti, "Kas akhir" vs "Saldo akhir" (BUG-16, BUG-21, BUG-29). |
| Ikuti urutan halaman | 3 | Bar 01-08 sangat membantu, tapi urutan Panduan salah dan nomor "9b." muncul sebelum "1." (BUG-19). |
| Percaya pada angka aplikasi | 2 | "− Rp 0" padahal ada pengeluaran, "Operasional" jadi "Operasional Lain", tombol download mati (BUG-01, BUG-02, BUG-03). |
| **Keseluruhan** | **2** | Struktur dan format uangnya sudah baik, tapi lapisan bahasa membuat user sering berhenti, salah baca, atau salah yakin. |

## Catatan metodologi dan batasan

- Semua pengujian read-only lewat harness HTML di `_QA_TMP/` yang memanggil API internal (`window.SPT`, `A.store`, `A.pages`, `A.pages2`, `A.guide`, `A.printHTML`, `store.transports`). Tidak ada file `index.html`, `css/`, atau `js/` yang diubah.
- Setiap run memakai profil Edge headless baru dengan `localStorage.clear()` lalu `store.resetData()`, supaya angka selalu berasal dari seed dan bukan dari sisa run sebelumnya.
- Beberapa output PowerShell mengalami mojibake pada simbol `×`, `−`, dan `✓`. Karena itu setiap kutipan simbol dalam laporan ini diambil ulang dari source atau DOM, bukan dari teks log mentah.
- Harness memakai `new RegExp(...)` tanpa escaping untuk menghitung frekuensi istilah, sehingga hasil untuk term bertanda baca (`Biaya (est.)`, `Est.`, `vs`) tidak dipakai. Hanya term polos yang dipakai di atas.
- Font yang dipakai hanya bisa dinilai dari nilai `font-size` yang dihitung, bukan dari screenshots. Claims seperti "susah dibaca" adalah penilaian berdasarkan ukuran, `uppercase`, dan `letter-spacing`, dan perlu diuji langsung bersama pengguna alfabetisasi rendah.
- Tidak ada temuan KRITIS. Saya tidak menemukan kondisi yang membuat aplikasi crash total atau menghapus semua data tanpa jejak. Kesalahan paling serius di sini adalah kesalahan angka dan tombol mati yang tampil tanpa tanda, bukan kerusakan total.
