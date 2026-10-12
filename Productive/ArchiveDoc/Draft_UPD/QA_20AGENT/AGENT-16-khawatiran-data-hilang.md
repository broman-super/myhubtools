# AGENT-16 — Pengguna Traumatis Kehilangan Data

> **Persona:** User UMKM yang pernah kehilangan data kerjaan sekali dan sekarang trauma — sebelum nge-klik apa pun yang menghapus, dia selalu cek backup dulu · **Fokus:** backup, restore, dan ketahanan terhadap kehilangan data · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 4 |
| TINGGI | 5 |
| SEDANG | 5 |
| RENDAH | 3 |
| **TOTAL** | **17** |

Kesimpulan: **backup dan restore di SPPD Toolbox secara teknis jalan, tapi belum aman dipakai untuk recover.** Kabar baiknya: `exportJSON` benar-benar menumpahkan seluruh 16 koleksi (389 record seed, semuanya ikut), dan `importJSON` berhasil memulihkan 399 record hasil kerja saya dengan selisih jumlah record **nol**. Yang rusak: tidak ada satu pun lapis pengaman di sekitar dua operasi paling berbahaya, yaitu `importJSON` dan `resetData`. Keduanya menimpa penyimpanan tanpa konfirmasi, tanpa auto-backup, tanpa undo. Saya membuktikan bahwa satu import file yang agak salah, disusul satu klik "Simpan Pengaturan" yang paling innocent, memangkas `localStorage` dari **55.117 karakter menjadi 188 karakter** — transaksi penjualan saya yang sudah tercatat hari itu hilang permanen, dan tidak ada satu pun cara mengembalikannya dari dalam aplikasi. Totalnya: **10 dari 14** tindakan destruktif tidak punya konfirmasi, dan nol di antaranya punya undo. Saya tidak akan memakai aplikasi ini untuk data sungguhan sampai ada minimal: backup otomatis harian di key kedua, konfirmasi bertingkat untuk import/reset, dan karantina saat file import gagal.

## Environment yang dipakai

- Edge headless (`msedge.exe --headless=new --virtual-time-budget=9000 --dump-dom`), **profil unik per run** (`prof_a16t1`, `prof_a16t2*`, `prof_a16t3*`, `prof_a16t4`, `prof_a16t5`, `prof_a16t6`, `prof_a16t7`)
- `localStorage.clear()` dieksekusi di dalam `<head>` **sebelum** `js/store.js` dimuat, jadi `store.load()` pertama selalu = seed default
- Rute yang diuji: `#/dashboard`, `#/events`, `#/events/evt-1` (8 seksi), `#/archive`, `#/products`, `#/master`, `#/reports`, `#/guide`, `#/settings`
- Fungsi store dipanggil langsung dari skrip harness (XHR diblokir di `file://`, jadi tidak dipakai)
- Harness: `Draft_UPD/QA_20AGENT/_QA_TMP/a16_*.html` + `a16_*.js` (7 skenario, sengaja dibiarkan agar bisa direproduksi)
- Angka seed yang dipakai sebagai acuan: 9 event · 8 produk · 11 penjualan · 10 pengeluaran · 29 milestone · 216 checklistItem · **389 record total** · **54.931 karakter** JSON

---

## Temuan

### [BUG-01] `importJSON` menimpa penyimpanan SEBELUM validasi selesai — 1 klik "Simpan" berikutnya memusnahkan semua data — **KRITIS**

**Persona dan use-case:** Saya sudah punya backup hari ini. Tiba-tiba saya curiga ada transaksi yang salah input, jadi saya buka **Pengaturan → Pulihkan dari File** untuk balik ke backup pagi. Saya pilih file yang salah — backup minggu lalu, yang isinya `sppd` belum ada (wajar, itu versi lama). Harapan saya: aplikasi bilang "file tidak cocok" dan **data saya tetap utuh**. Saya tidak akan tahu bahwa file backup saya bisa tidak kompatibel.

**Langkah reproduksi:**
1. Buka app, catat 1 transaksi penjualan baru (`catatan: 'PENTING'`) → `sales evt-1 = 5`
2. Catat ukuran penyimpanan: **55.117 karakter**, `events=9 sales=12`
3. Panggil `store.importJSON('{"events":[{"id":"evt-1","nama":"Pameran"}]}')` — JSON valid, punya key `events`, tapi tidak punya `sppd`
4. Lihat toast: `"Cannot read properties of undefined (reading 'forEach')"` — **error teknis bahasa Inggris**, bukan pesan yang bisa dicerna user awam
5. Cek `localStorage`: **masih data sehat** (`events=9 sales=12`) — jadi kelihatannya aman
6. User menyimpulkan "berarti data belum kena, aman". Dia buka **Pengaturan**, mengisi Nama/NIP, klik **Simpan Pengaturan** (tombol paling innocent di aplikasi)
7. Cek `localStorage` lagi

**Harapan:** Import yang gagal harus **ditolak sepenuhnya**, state aplikasi tetap pada data yang valid, dan toast sebaiknya berbunyi "File backup tidak cocok / tidak lengkap — data kamu tidak berubah".

**Kenyataannya:** Gagal import **sudah mengganti variabel `DB` di memori** sebelum normalisasi selesai. `js/store.js:341-342`:
```js
var before = events().length;
DB = obj;                        // <-- ditimpa DULU, di baris ini
if (!DB.kasAdj) DB.kasAdj = [];
DB.sppd.forEach(...)             // <-- baru meledak di baris berikutnya
```
Pada langkah 7, penyimpanan **turun dari 55.117 → 188 karakter**: `events=1`, `sales=MISSING`. Transaksi `PENTING` lenyap, seluruh 12 penjualan dan 10 pengeluaran lenyap, `budget` lenyap, `checklistItems` lenyap. Setelah itu hampir semua halaman error: `#/events` → `Cannot read properties of undefined (reading 'find')`, tambah pengeluaran → `Cannot read properties of undefined (reading 'push')`. Dan **`Backup ke File` yang saya klik untuk menyelamatkan keadaan justru menghasilkan file 271 byte berisi `events=1, sales=0`** — jadi backup terbaru justru merekam keadaan yang sudah rusak.

**Evidence:**
```
[A] sales evt-1 = 5 (termasuk 1 transaksi PENTING)   ukuran DB = 55117 karakter
[B] hasil importJSON : GAGAL: Cannot read properties of undefined (reading 'forEach')
    DB di memori sekarang: events=1 sppd=undefined sales=undefined
    Isi localStorage (di disk) masih data SEHAT? ya, events=9 sales=12
[C] 1) Simpan Pengaturan -> jalan, TIDAK error
    localStorage sekarang = 188 karakter
    isi disk: events=1 sales=MISSING
    ★ DATA SEHAT YANG MASIH DI DISK SUDAH HILANG: YA — file 55KB jadi 188 byte
[4] klik "Backup ke File" -> 271 byte, events=1 sales=0
```
Catatan tambahan: `deleteEvent` dan `deleteProduct` punya konfirmasi, tapi `importJSON` — satu-satunya pintu yang bisa menimpa **seluruh** basis data — **tidak punya validasi schema sama sekali** selain satu baris `Array.isArray(obj.events)`.

**Dampak ke pengguna awam:** Ini skenario klasik "jam 21.00 di hotel": user ingin balik ke versi aman, justru kehilangan semuanya, dan tidak sadar karena halaman masih terbuka. Dia baru sadar besok pagi saat mau print laporan. Tidak ada jalur recover: file backup yang ada di HP adalah **file 271 byte berisi data rusak** kalau dia sempat mem-backup setelah kejadian.

**Usulan perbaikan (deskriptif):** `importJSON` harus menguji salinan sementara, bukan menimpa `DB` global. Urutan yang aman: parse → cek minimal 10 koleksi wajib ada dan berupa array (`events, sppd, transports, products, eventProducts, sales, expenses, milestones, kasAdj, prepItems`) → normalisasi objek sementara → hanya kalau semuanya lolos, baru timpa `DB` lalu `save()`. Kalau ada satu saja gagal, lempar error berbahasa Indonesia dan **jangan sentuh `DB` sama sekali**.

---

### [BUG-02] "Pulihkan dari File" tidak punya konfirmasi dan tidak ada auto-backup — memulihkan backup lama menghapus semua kerjaan lebih baru, tapi toast-nya terlihat seperti sukses — **KRITIS**

**Persona dan use-case:** Pagi saya catat penjualan dan pengeluaran. Siang saya realize ada salah input. Sore saya klik "Backup ke File" (agak lupa file mana yang terbaru). Malam, setelah Validator selesai, saya klik "Pulihkan dari File" dan pilih **backup lama**. Ini skenario yang akan benar-benar terjadi pada orang yang punya 5 file `sppd-backup-2026-04-xx.json` di folder Download dan tidak ingat mana yang terbaru.

**Langkah reproduksi:**
1. Buat 1 penjualan (`catatan: 'PENJUALAN HARI INI'`) + 1 pengeluaran (`deskripsi: 'ONGKOS HARI INI'`) → `sales evt-1 = 7`, `expenses evt-1 = 6`
2. Klik **Backup ke File** → file `backup.json` berisi kondisi **lama**
3. Klik **Pulihkan dari File** → pilih `backup.json`
4. Periksa hasil

**Harapan:**
- Dialog konfirmasi yang menyebut konsekuensinya: "Data yang ada SEKARANG (termasuk penjualan hari ini) akan diganti. Yakin?"
- Otomatis simpan snapshot data sekarang ke key `localStorage` kedua, supaya pembatalan bisa satu klik
- Toast yang jujur menyebut konsekuensi, bukan cuma jumlah event

**Kenyataannya:**
- `js/actions.js:538-559` handler `data:import` **tidak memanggil `ui.confirm` sama sekali** — langsung `FileReader` → `store.importJSON`
- Tidak ada `exportJSON()` dipanggil sebelum import, jadi tidak ada snapshot
- `importJSON` adalah **REPLACE, bukan MERGE** — `DB = obj`, total
- Toast: `"Data dipulihkan: 9 → 9 event"` — karena jumlah event di file lama = jumlah event sekarang, **user melihat angka yang sama dan mengira tidak ada yang berubah**
- Kedua record hari ini hilang permanen

**Evidence:**
```
data "hari ini" dibuat: sales evt-1 = 7, expenses evt-1 = 6
apakah data:import memanggil konfirmasi? TIDAK — langsung menimpa
apakah ada auto-backup sebelum import?  TIDAK
setelah import backup lama: {"before":9,"after":9}
  sales evt-1  : 6 (penjualan "HARI INI" hilang? HILANG)
  expenses evt-1: 5 ("ONGKOS HARI INI": HILANG)
  toast ke user: "Data dipulihkan: 9 → 9 event" (terlihat SUKSES, jumlah event sama)
  tidak ada undo, tidak ada snapshot sebelum import
```
Bukti tambahan dari source (`js/actions.js:538-559`): di dalam handler `data:import` tidak ada string `ui.confirm` maupun `exportJSON`.

**Dampak ke pengguna awam:** Ini yang akan membuat orang berhenti memakai aplikasi sama sekali. User tidak tahu bahwa "pulihkan" berarti "timpa", dan tidak ada apa pun yang mencegahnya menimpa dirinya sendiri dengan file 3 minggu lalu. Untuk orang yang trauma kehilangan data, tombol "Pulihkan dari File" yang langsung menimpa tanpa konfirmasi adalah tombol paling menakutkan di aplikasi ini — dan justru tidak ada tanda bahaya apa pun.

**Usulan perbaikan (deskriptif):** (1) sebelum `importJSON`, tulis `localStorage['sppd_toolbox_previous_db']` berisi JSON data saat ini, lalu tampilkan tombol "Kembalikan Data Sebelumnya" di halaman Pengaturan. (2) buka modal konfirmasi yang menyebut konsekuensi konkret: jumlah event sebelum → sesudah, plus jumlah record per koleksi yang akan hilang. (3) tombol konfirmasi di modal harus berbunyi **"Timpa Data"**, bukan "Hapus". (4) setelah import berhasil, simpan "riwayat restore" berisi timestamp + jumlah record, supaya user tahu file yang barusan dipulihkan memang yang benar.

---

### [BUG-03] localStorage rusak atau terpotong → aplikasi diam-diam memuat data dummy, tanpa peringatan, lalu menimpa data asli — **KRITIS**

**Persona dan use-case:** Saya di lapangan, HP lama, memori terbatas. HP restart saat saya membuka aplikasi. `localStorage` yang tersimpan jadi tidak lengkap — `setItem` terputus di tengah jalan, atau value-nya terpotong. Saya buka ulang app dan yang muncul adalah data contoh semua: 9 event Pameran, 8 produk, angka saldo yang jelas bukan milik saya. Saya mengira catatan penjualan saya hilang, tanpa tahu ada sesuatu yang rusak.

**Langkah reproduksi:**
1. Pasang `localStorage['sppd_toolbox_db_v2']` berisi JSON terpotong: `{"events":[{"id":"evt-1","nama":"Pameran"}],"sales":[{"id":"s1"` (63 byte — persis bentuk value yang tertinggal kalau HP mati saat menulis)
2. Buka aplikasi
3. Lihat isi layar, toast, dan penyimpanan

**Harapan:** Aplikasi harus mendeteksi value rusak, **tidak menulis apa pun** di atasnya, dan menampilkan banner merah besar: "Data tersimpan tidak bisa dibaca. Data asli kamu masih ada di penyimpanan — jangan tutup app ini."

**Kenyataannya:**
- `js/store.js:296-304`, fungsi `load()` dibungkus `try/catch`; kalau `JSON.parse` gagal, catch-nya `DB = seed()` — **tanpa toast, tanpa banner, tanpa log**
- `localStorage` yang rusak **tidak dikarantina** (tidak disalin ke key terpisah)
- Karena `getSppd()` memanggil `saveSppd()` → `save()` (lihat BUG-12), **hanya dengan membuka app, penyimpanan yang rusak langsung tertimpa 54.931 byte data dummy**
- Data asli 63 byte itu hilang selamanya. Tidak ada tombol recover, tidak ada backup otomatis

**Evidence:**
```
=== MODE: truncated ===
localStorage saat app dimuat: 63 byte -> {"events":[{"id":"evt-1","nama":"Pameran"}],"sales":[{"id":"s1"
toast_root isi saat boot    : (KOSONG = tidak ada peringatan)
SETELAH load():
  events        = 9      <-- data contoh, bukan 1 event punya saya
  sales         = 11
  apakah data user yang di-backup masih terbaca? TIDAK — sudah diganti/di-overwrite
localStorage SESUDAH user jalan-jalan:
  panjang = 55072 byte
  berubah dari kondisi boot? YA — file lama yang rusak SUDAH TERTIMPA
  toast yang muncul selama sesi: 0 (0 = user tidak diberi tahu apa pun)
```
Uji yang sama dengan value non-JSON (`"Data aplikasi rusak, hubungi admin."`, 35 byte) memberi hasil identik: 0 toast, 0 banner, storage tertimpa 55.072 byte.

Varian lebih buruk — `evenspponly` (`{"events":[{...1 event...}],"sppd":[]}`, 141 byte, JSON valid tapi koleksi inti hilang): `load()` **tidak** jatuh ke catch, jadi DB diterima apa adanya. Akibatnya `sales`, `expenses`, `products` = `undefined` dan **hampir semua halaman error**: `Cannot read properties of undefined (reading 'filter')`. Penyimpanan tetap ditimpa (141 → 8.473 byte) dan data asli hilang.

**Dampak ke pengguna awam:** Cerita pemulihan data yang berhasil biasanya dimulai dengan "kenapa semua data saya balik ke contoh?". User **tidak akan pernah diberi tahu** bahwa ada data asli yang masih bisa diselamatkan di value yang rusak itu — kalau aplikasi tidak menimpanya. Ini menghapus semua harapan: bagi saya, data yang sudah tertulis di HP sebenarnya masih ada di suatu tempat; aplikasi ini menghapus jejaknya sendiri.

**Usulan perbaikan (deskriptif):** pisahkan tegas antara "gagal parse" dan "data kosong". Kalau `JSON.parse` gagal: (1) **jangan** panggil `seed()`, (2) simpan value mentah ke `localStorage['sppd_toolbox_corrupt_<timestamp>']`, (3) tampilkan layar konfirmasi "Data rusak ditemukan — data asli kamu disimpan di sini" dengan dua pilihan: "Pulihkan dari backup" atau "Mulai dari data contoh (data rusak akan dihapus)". Tambahkan juga pemeriksaan bentuk: kalau `events` ada tapi `sales`/`expenses`/`sppd` `undefined`, perlakukan sama sebagai rusak, bukan "cukup normalisasi sebagian".

---

### [BUG-04] "Reset Data Dummy" menghapus SELURUH data kerjaan secara permanen; tombolnya berlabel "Hapus", teks konfirmasinya menenangkan — **KRITIS**

**Persona dan use-case:** Saya selesai event Ramadan, mau mulai season baru. Saya klik **Pengaturan → Reset Data Dummy** — dengan asumsi kalau ada tombol "Reset Data Dummy", yang hilang cuma data contoh. Saya klik, dan **langsung saja** saya klik "Hapus" di dialog konfirmasi.

**Langkah reproduksi:**
1. Kerjakan data nyata: 13 penjualan, 12 pengeluaran, 9 produk, 6 baris alokasi SPPD (`danaAwal` diubah ke 3.000.000, ada `catatan: 'Tambahan 500rb dari patio atasan'`), nama di Pengaturan diubah jadi `Kael (PIC)`, tarif km jadi 5.200. Total 399 record
2. Amankan juga secara manual: `store.exportJSON()` (file aman, 84.052 byte)
3. Klik **Pengaturan → Reset Data Dummy**, lalu klik tombol konfirmasi
4. Periksa apa yang hilang dan apa yang masih bisa dipulihkan dari dalam app

**Harapan:** Karena ini keputusan yang **tidak bisa dibatalkan**, dialognya harus: (a) menyebut konsekuensi lengkap — "**seluruh** data yang kamu masukkan akan dihapus permanen dan tidak bisa dikembalikan dari aplikasi", (b) menawarkan "Backup otomatis dulu sebelum reset" sebagai tombol utama, (c) tombol konfirmasinya berbunyi "Hapus Permanen", bukan "Hapus".

**Kenyataannya:**
- Yang hilang: 2 penjualan baru, 1 produk baru, `danaAwal` kembali `2.500.000` (dari 3.000.000), `catatan SPPD` kembali ke isi seed, `nama` kembali ke `"Kael"`, tarif kembali ke 4.500, plus 1 transport, 1 prepItem, 1 milestone, 1 danaCair, 2 pengeluaran, 1 baris alokasi
- **Tombol konfirmasi di dialog diberi label "Hapus"** — label yang sama persis dengan delete event dan delete produk, tidak membedakan tingkat bahaya
- **Tidak ada auto-backup** sebelum reset
- **Tidak ada snapshot di `localStorage`**: setelah reset, `Object.keys(localStorage)` = `["sppd_toolbox_db_v2"]` — satu key saja, tidak ada bayangan yang bisa dipulihkan
- Toast yang muncul hanya `"Data di-reset ke contoh"` dengan warna **sukses** (hijau). Tidak ada peringatan bahwa data lama hilang

**Evidence:**
```
=== [3] RESET DATA (store.resetData) ===
ukuran raw LS sebelum reset: 56710 karakter
  sppd 9 -> 8, transports 11 -> 10, products 9 -> 8, eventProducts 11 -> 10,
  sales 13 -> 11, expenses 12 -> 10, milestones 30 -> 29, danaCair 5 -> 4, prepItems 14 -> 13
penjualan hasil kerja hilang?  0 dari 2
produk baru masih ada?         TIDAK
catatan SPPD hasil kerja?      "Penginapan diinapkan ke hotel panitia."
danaAwal kembali ke?           2500000
nama settings kembali ke?      "Kael"
laporan ke user (toast)        : "Data di-reset ke contoh" (sukses) — TIDAK ada peringatan bahwa data lama hilang permanen
localStorage keys setelah reset: ["sppd_toolbox_db_v2"]  (tidak ada salinan bayangan/undo)

Modal konfirmasi:
  teks="Reset data? Semua data kamu diganti dengan contoh dummy. BatalHapus"  tombol="Batal" , "Hapus"
  ★ tombol konfirmasi untuk RESET diberi label "Hapus"
  ★ tidak ada auto-backup sebelum reset, tidak ada opsi "backup dulu baru lanjut"
  ★ tidak ada opsi "hapus per event" — reset bersifat TOTAL
```
Kabar baik: **kalau user sudah punya file `.json` di tangannya, restore-nya berhasil sempurna** — semua 399 record kembali, termasuk produk baru, 2 penjualan baru, `catatan SPPD`, baris alokasi ke-6, `nama: 'Kael (PIC)'`, dan `tarifKm: 5200`. Yang hilang adalah key `localStorage`-nya sendiri, yang memang mustahil dikembalikan tanpa file.

**Dampak ke pengguna awam:** Tombol paling berbahaya di aplikasi ini justru **tidak terlihat berbahaya**: berwarna merah muda, tetapi efektif langsung menghapus transaksi permanen.

**Usulan perbaikan (deskriptif):** sebelum `resetData()`, (1) otomatis tulis snapshot ke `localStorage['sppd_toolbox_previous_db']`, (2) buka dialog dua tahap dengan daftar jumlah record yang akan dihapus per koleksi beserta konsekuensinya, (3) minta user mengetik kata `HAPUS` untuk konfirmasi, (4) setelah reset sukses, simpan snapshot di key terpisah dan tampilkan tombol "Kembalikan Data Sebelumnya" selama 7 hari. Ganti label tombol jadi "Hapus Permanen & Ganti dengan Data Contoh".

---

### [BUG-05] 10 dari 14 tindakan destruktif menghapus data TANPA konfirmasi apa pun — **TINGGI**

**Persona dan use-case:** Seksi 05 (Penjualan) punya 7 transaksi dengan nominal besar. Saya salah sentuh tombol "Hapus" di baris ke-3. Karena tidak ada dialog, hapus terjadi seketika. Saya baru sadar 30 detik kemudian.

**Langkah reproduksi:**
1. Masuk ke `#/events/evt-1`
2. Klik langsung (tanpa hesitation) tombol `Hapus`/`Buang` pada tiap seksi, lalu periksa apakah ada modal konfirmasi di `#modal-root`

**Harapan:** Setiap aksi yang menghapus record harus punya minimal konfirmasi satu kalimat. Kalau sudah ada konfirmasi, tombol harus berbunyi "Hapus" dan bukan "Ya" agar tidak terjadi klik refleks.

**Kenyataannya:** Saya menguji 14 tindakan destruktif dengan klik DOM sungguhan. **10 tidak memunculkan modal sama sekali** — langsung hapus permanen. Yang punya konfirmasi hanya 3, dan `event:delete` (yang paling besar dampaknya) tidak bisa saya uji lewat route default, tapi source-nya jelas punya konfirmasi.

**Evidence (hasil klik DOM nyata; `TIDAK ADA MODAL` = langsung hapus):**
```
hapus 1 transaksi PENJUALAN          : TIDAK ADA MODAL (langsung hapus!)
hapus 1 transaksi PENGELUARAN        : TIDAK ADA MODAL (langsung hapus!)
hapus 1 data TRANSPORTASI            : TIDAK ADA MODAL (langsung hapus!)
hapus 1 MILESTONE                    : TIDAK ADA MODAL (langsung hapus!)
hapus 1 PENYESUAIAN KAS              : TIDAK ADA MODAL (langsung hapus!)
hapus 1 SUMBER DANA                  : TIDAK ADA MODAL (langsung hapus!)
hapus 1 BARIS ALOKASI SPPD           : TIDAK ADA MODAL (langsung hapus!)
hapus 1 ITEM PERSIAPAN               : TIDAK ADA MODAL (langsung hapus!)
hapus 1 PRODUK dari checklist        : TIDAK ADA MODAL (langsung hapus!)
hapus 1 DOKUMEN / LAMPIRAN           : TIDAK ADA MODAL (langsung hapus!)
hapus 1 ITEM MASTER                  : TIDAK ADA MODAL (langsung hapus!)
hapus 1 PRODUK master                : ada modal: "Hapus produk? Produk ikut terhapus dari checklist & penjualan event. BatalHapus"
hapus 1 GRUP MASTER                  : ada modal: "Hapus grup? Item di dalam grup ikut terhapus dari master. ..."
★ RINGKASAN: 10 dari 14 tindakan destruktif TIDAK punya konfirmasi sama sekali.
```
Bukti source (`js/actions.js`): hanya **4 pemanggilan** `ui.confirm` di seluruh file, di baris **63** (master:catdel), **100** (event:delete), **493** (product:delete), **513** (data:reset). Semua `store.deleteX()` lain dipanggil langsung lalu `ui.toast('... dihapus', 'success')`.

Yang paling menyakitkan: **hapus dokumen bukti** (`milestone:att:delete`, `js/actions.js:297`) tidak punya konfirmasi. Itu lampiran scan SPPD yang disetor ke Google Drive — dokumen yang tidak ada duplikatnya di tempat lain.

**Dampak ke pengguna awam:** Di HP, ukuran tombol "Hapus" dan tombol "Simpan" praktis sama, dan jari sering meleset. Setiap transaksi penjualan yang hilang berarti uang yang tidak bisa dibuktikan saat pemeriksaan keuangan. Tidak ada cara tahu ada yang hilang kecuali membandingkan angka secara manual.

**Usulan perbaikan (deskriptif):** (1) untuk aksi 1-record (sale, expense, kasAdj, danaCair, prepitem, transport, budget, itemTemplate, eventproduct, attachment): konfirmasi satu kalimat berisi identitas record — "Hapus penjualan Batik Tulis 5 pcs Rp 1.250.000?". (2) untuk dokumen lampiran: konfirmasi wajib dengan nama file. (3) pindahkan tombol hapus ke posisi yang tidak mudah tersentuh (ikon kecil di ujung kanan, atau butuh tekan-tahan), karena konfirmasi tetap bisa salah klik. (4) untuk hapus event: tampilkan daftar jumlah record yang akan hilang (lihat BUG-06).

---

### [BUG-06] Tidak ada undo, tidak ada recycle bin, tidak ada riwayat versi — hapus 1 event = 48 record hilang dalam 1 klik — **TINGGI**

**Persona dan use-case:** Saya salah klik "Hapus event" untuk event yang **sudah selesai** dan laporannya sudah disetor. Saya baru ingat setelah 5 menit. Saya masuk ke Arsip untuk mengoreksi — event-nya sudah tidak ada.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, catat isi: `sales=4, expenses=3, transports=2, eventProducts=3, milestones=5, prepItems=3, danaCair=2, kasAdj=2, checklist=24` = **48 record**
2. Panggil `store.deleteEvent('evt-1')`
3. Coba berbagai cara mengembalikannya

**Harapan:** Minimal ada (a) konfirmasi yang menyebut "**48 record** akan hilang", (b) recycle bin: event yang dihapus pindah ke `db.trash` dan bisa dipulihkan minimal 30 hari, (c) atau undo di toast: "Event dihapus — Urungkan" selama 10 detik.

**Kenyataannya:**
- 48 record hilang seketika, `getEvent('evt-1')` = `null`
- **Tidak ada** `undo`, `redo`, `restoreLast`, `recycleBin`, `trash`, atau `history` di mana pun pada `A.store` — saya dump seluruh 82 nama fungsi `A.store` untuk memastikan
- Setiap `deleteX()` di `store.js` hanya melakukan `arr = arr.filter(...)` lalu `save()` — **tidak pernah menyimpan salinan**
- `A.store.deleteSale.length = 1` (cuma menerima id, tidak mengembalikan apa pun)
- **Bonus bug (lihat BUG-16): `checklistItems` untuk evt-1 TIDAK ikut terhapus → 24 record yatim tersisa**, tidak terlihat di UI tapi tetap makan kuota

**Evidence:**
```
=== [6] KONSEKUENSI NYATA: hapus event = berapa record hilang? ===
evt-1 sebelum hapus: {"sales":4,"exp":3,"tr":2,"evp":3,"mil":5,"prep":3,"dana":2,"kas":2,"ck":24}  TOTAL 48 record
setelah hapus, getEvent("evt-1") = null (event hilang)
★ 48 record hilang dalam 1 klik. Tidak ada undo, tidak ada tong sampah.
★ checklistItems evt-1 TIDAK ikut terhapus (deleteEvent tidak memfilter checklistItems)
  A.event = 24 item yatim

=== [4] APAKAH ADA UNDO / RECYCLE BIN? ===
A.store punya fungsi: KEY, load, save, exportJSON, importJSON, resetData, WALLETS, ... globalReports
★ tidak ada undo / redo / restoreLast / recycleBin / trash / riwayat di A.store
★ setiap deleteX() langsung men-filter array lalu save() — hilang permanen
bukti: A.store.deleteSale.length = 1 argumen, tidak ada return/snapshot
hapus 1 penjualan -> sales evt-1 3 -> 2, tidak ada cara kembalikan dari dalam app
```

**Dampak ke pengguna awam:** Untuk aplikasi yang dipakai untuk laporan keuangan pemerintah daerah, "hapus permanen tanpa undo" tidak bisa diterima. Berbeda dengan aplikasi biasa — di sini data yang hilang adalah **bukti penggunaan uang**. Kalau salah hapus, satu-satunya jalan adalah mengembalikan file backup, dan seperti BUG-02, tidak ada yang mengarahkan user ke sana atau memberi tahu bahwa file itu ada.

**Usulan perbaikan (deskriptif):** (1) tambahkan `db.trash` dengan struktur `{id, tipe, payload, dihapusPada}`; setiap `deleteX()` memindahkan record ke `trash` alih-alih membuangnya, dan `save()` tetap menulis. (2) halaman baru "Sampah / Riwayat" di nav, dengan tombol "Kembalikan" per item dan "Kosongkan Sampah" (dengan konfirmasi). (3) tombol hapus event menampilkan modal berisi daftar rincian: "Event ini berisi 4 penjualan, 3 pengeluaran, 2 transport, 5 milestone, 24 checklist. Hapus?" (4) di `deleteEvent`, tambahkan filter untuk `checklistItems`.

---

### [BUG-07] Validasi file backup cuma satu baris — file yang hampir kosong tetap diterima dan MENGOSONGKAN seluruh aplikasi — **TINGGI**

**Persona dan use-case:** Saya dapat file `.json` dari Google Drive atau WhatsApp. File yang saya pilih ternyata bukan backup SPPD Toolbox — misalnya `{"events":[],"sppd":[],"products":[],"settings":{}}` dari tool lain, atau file versi lama yang belum punya koleksi `kasAdj`. Saya tidak sadar, dan saya klik "Simpan".

**Langkah reproduksi:**
1. Data sehat: 9 event, 11 penjualan, 10 pengeluaran
2. Coba `importJSON` dengan 6 jenis file, masing-masing diuji apakah diterima dan apakah DB di memori diam-diam berubah

**Harapan:** Hanya file yang **lengkap dan berasal dari SPPD Toolbox** yang diterima. File yang kurang dari N koleksi inti harus ditolak dengan pesan jelas, dan penolakan **tidak boleh** mengubah state (lihat BUG-01).

**Kenyataannya:**

| File yang dicoba | Hasil | DB berubah diam-diam? |
|---|---|---|
| `{"halo":"dunia"}` | TOLAK — "Format backup tidak dikenali" | tidak |
| `{"events":[],"sppd":[],"products":[],"settings":{}}` | **TERIMA** → `{"before":9,"after":0}` | **YA** |
| `{"events":[{"id":"x","nama":"E"}]}` (tanpa `sppd`) | TOLAK — TypeError | **YA** (terlalu dini, lihat BUG-01) |
| `{"events":[{"id":"x"}],"sppd":[],"sales":null,"settings":{}}` | **TERIMA** → `{"before":1,"after":1}` | **YA** |
| `{"events":[{"id":"evt-1"}` (terpotong) | TOLAK — SyntaxError | tidak |
| `<!DOCTYPE html>404 Not Found` | TOLAK — SyntaxError | tidak |

Dua masalah terpisah:
1. **Terlalu longgar**: `Array.isArray(obj.events)` adalah satu-satunya syarat. File dengan 4 key dan `events: []` **diterima**, dan karena `DB = obj`, seluruh 9 event saya jadi 0.
2. **Terlalu rapuh**: file yang hanya kurang `sppd` sudah cukup untuk membuat `DB` ikut ter-overwrite sebelum error dilempar (BUG-01).

**Evidence:**
```
=== [6] VALIDASI FILE BACKUP ===
  [file JSON acak valid tanpa events] TOLAK -> Format backup tidak dikenali: bukan file backup SPPD Toolbox.
      DB di memori berubah Diam-diam? tidak
  [file backup dari app LAIN (versi beda)] TERIMA -> {"before":9,"after":0}
      DB di memori berubah Diam-diam? YA — state jadi file cacat, Data SEHARUSNYA tidak berubah
  [events ada tapi sppd tidak ada] TOLAK -> Cannot read properties of undefined (reading 'forEach')
      DB di memori berubah Diam-diam? YA
  [events ada tapi sales null] TERIMA -> {"before":1,"after":1}
      DB di memori berubah Diam-diam? YA
  [file terpotong (JSON rusak)] TOLAK -> Expected ',' or ']' after array element in JSON at position 25
  [file HTML terdownload salah] TOLAK -> Unexpected token '<', "<!DOCTYPE "... is not valid JSON
setelah 6 percobaan import, isi DB = ["events","sppd","sales","settings","kasAdj","prepItems","danaCair","milestones"] / events=1
raw localStorage masih backup benar? 117 byte, events=1
```
Perhatikan baris terakhir: setelah rangkaian import, **`localStorage` hanya tersisa 117 byte** — semula 56.710 byte. Salah satu import yang "TERIMA" sudah menimpa penyimpanan dengan file kosong.

**Dampak ke pengguna awam:** User awam tidak bisa membedakan file mana yang backup miliknya. Dia bahkan tidak tahu aplikasi ini punya format file tertentu. Kalau dia pernah "coba-coba" tombol Pulihkan dengan file JSON lain, dia baru sadar setelah data hilang semua — dan tidak ada peringatan sebelumnya.

**Usulan perbaikan (deskriptif):** (1) di dalam file backup, tulis header: `{"_app":"SPPD Toolbox","_schemaVersion":N,"_exportedAt":"2026-10-01T08:12:33+07:00","_counts":{...},"data":{...}}`. (2) `importJSON` menolak file tanpa `_app === "SPPD Toolbox"`. (3) validasi seluruh koleksi wajib dan cocokkan `_counts` dengan isi file. (4) sebelum mengganti, tampilkan pratinjau: "File ini berisi 9 event, 11 penjualan, dibuat 2026-04-20. Data kamu sekarang berisi 9 event, 13 penjualan. Lanjutkan?"

---

### [BUG-08] localStorage penuh: `save()` menelan error, hanya toast 3 detik, tanpa indikator — data hilang diam-diam — **TINGGI**

**Persona dan use-case:** Setelah 2 tahun dipakai rutin, database saya sudah besar. Saya catat penjualan hari ini. Saya lihat daftarnya sudah nambah. Saya lega. Malam saya tutup app. Besok pagi record itu tidak ada.

**Langkah reproduksi:**
1. Isi `localStorage` dengan 52 blok × 100.000 karakter sampai kena `QuotaExceededError` (total 5.200.000 karakter)
2. Panggil `store.saveSale({...})` — aplikasi "menyimpan" penjualan baru
3. Periksa toast, halaman, dan isi disk

**Harapan:**
- Toast error **tidak boleh hilang dalam 3 detik** untuk kasus kehilangan data — harus jadi banner persisten
- Ada indikator di header: "⚠ 3 data belum tersimpan" sampai user menyelesaikan masalah
- Aplikasi harus **menolak** operasi yang tidak bisa disimpan, bukan menerima lalu diam

**Kenyataannya:**
- Toast error **memang muncul**: `"[toast error] Gagal menyimpan ke localStorage"` — ini kabar baik, tapi hanya 3 detik (`ui.js:67`: `setTimeout(..., 2600)` lalu `remove()` di 3000ms)
- **`save()` menelan error** (`store.js:330-331`: `try{...}catch(e){ A.toast(...) }`) — `saveSale()` **tidak melempar exception**, jadi pemanggil tidak tahu bahwa datanya **ditolak**
- UI tetap menampilkan transaksi itu di daftar penjualan (datanya masih ada di memori) — user melihat "berhasil"
- Tidak ada banner, tidak ada counter, tidak ada "terakhir disimpan"
- Dinding kuota yang terukur di environment ini: **5.200.000 karakter** (blok ke-53 gagal dengan `QuotaExceededError`). Kapasitas ini **tidak pernah dihitung atau ditampilkan** oleh aplikasi
- Angkanya: DB seed 54.931 karakter = **1,06%** dari kuota. 1 transaksi penjualan ≈ 220 karakter JSON compact. Jadi user butuh **±23.500 transaksi** (±590 event penuh) sebelum kena dinding — dan saat itu ia mulai diam-diam

**Evidence:**
```
=== [1] ISI localStorage SAMPAI DINDING KUOTA ===
isi total localStorage : 5200000 karakter (~10156 KB) dari 52 blok
error pertama         : QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'junk52' exceeded the quota.
kuota realistis di file:// = sekitar 5.242.880 byte UTF-16 => ~2.621.440 karakter per origin

=== [2] PENGGUNA CATAT TRANSAKSI SAAT KUOTA PENUH ===
sales evt-1 di memori : 4 -> 5
toast sesudah         : "[toast error] Gagal menyimpan ke localStorage"
apakah ada di halaman penanda? hanya toast, hilang sendiri dalam 3 detik, tidak ada banner
localStorage masih berisi data LAMA? YA (tidak berubah)
★ transaksi "uang terakhir 3 pcs" ada di disk? TIDAK — HILANG
4. Karena save() catch menelan error, saveSale() TIDAK melempar exception ke pemanggil.
   => app tidak pernah tahu dia sedang MENOLAK menyimpan.
```
Bukti tambahan dari run yang sama: `store.saveSale` dijalankan 400× berturut-turut tanpa error yang terlihat di pemanggil, sementara ukuran DB naik 54.931 → 154.131 karakter dan jumlah sales **di disk (411) ≠ di memori (404)** — selisih 7 transaksi hilang tanpa jejak. Jadi mekanismenya sudah terbukti: setiap save yang gagal = data hilang diam-diam.

**Dampak ke pengguna awam:** Ini pola kehilangan data yang paling ditakuti: user **tidak diberi tahu**, dan aplikasi **bertingkah seolah normal**. Karena localStorage sudah ada di HP, kuota tidak akan penuh dalam 2 minggu — tapi kalau dipakai serius selama 2 tahun, atau datanya banyak deskripsi panjang, hal ini akan terjadi. Pertanyaan klasik user seperti saya: "kenapa record saya hilang sendiri?"

**Usulan perbaikan (deskriptif):** (1) `save()` kembalikan boolean sukses/gagal, dan semua aksi tulis memeriksa nilai itu; kalau gagal, **batalkan** perubahan di memori atau setidaknya tandai record itu "belum tersimpan" dengan badge. (2) tampilkan di header permanen: "Tersimpan 08:12 · 54 KB / 5,2 MB (1%)". (3) saat rasio > 80%, tampilkan banner kuning: "Penyimpanan hampir penuh — perform Backup ke File sekarang". (4) toast error yang menyentuh data harus berumur ∞ (sampai user menutupnya), bukan 3 detik.

---

### [BUG-09] Tidak ada indikator "terakhir disimpan" di halaman mana pun — **TINGGI**

**Persona dan use-case:** Saya selalu ingin tahu: "sudah aman belum?". Kalau ada jam di header, saya bisa tenang. Kalau tidak ada, saya selalu curiga — dan saya akan melakukan backup setiap 5 menit untuk menenangkan hati.

**Langkah reproduksi:**
1. Kunjungi 8 rute satu per satu, ambil `innerText`, cari kata kunci: `terakhir`, `terakhir disimpan`, `disimpan pada`, `last saved`, `sinkron`, `cadangan`, `backup`, `aman`, `penuh`, `kuota`, `gagal menyimpan`, `offline`
2. Periksa juga `header` dan `footer`

**Harapan:** Ada indikator waktu yang jelas di semua halaman, misalnya "Tersimpan 08:12" atau badge "✓ Semua data tersimpan".

**Kenyataannya:** **Tidak ada satu pun** dari 8 rute yang menampilkan waktu simpan terakhir. Header hanya berisi: `dashboard event & tugas arsip produk master barang rekap global panduan pengaturan 3 event berjalan`. `nav-chips` = `"3 event berjalan"`. Yang muncul cuma kata "backup" di halaman Pengaturan (nama tombol) dan "sinkron" di Panduan (dalam konteks lain). **0 kemunculan** untuk "terakhir", "terakhir disimpan", "last saved", "gagal menyimpan", "penuh", "kuota", "offline".

**Evidence:**
```
route            | char | match kata kunci
  #/dashboard     |   960 | -
  #/events        |  1248 | -
  #/archive       |  1307 | -
  #/products      |   572 | -
  #/master        |  1042 | cadangan, aman
  #/reports       |  1085 | -
  #/guide         |  6177 | sinkron, aman
  #/settings      |   592 | backup
  footer          |    29 | -
  header          |    92 | dashboardevent & tugasarsipprodukmaster barangrekap globalpanduanpengaturan 3 event berjalan
  ★ tidak ada indikator global pun (tidak ada badge "tersimpan"/"sinkron")
```
Bukti source: grep `terakhir`, `last saved`, `disimpan pada`, `offline` di `js/*.js` dan `index.html` → **0 hasil**. Yang ada cuma `ui.toast('... tersimpan', 'success')` (4 tempat) dan teks statis di Panduan.

Yang **sudah** ada dan bagus: banner "Prototype" di Dashboard — `"Data tersimpan di browser (localStorage) + contoh dummy. GAS & Supabase belum tersambung"`. Ini jujur dan harus dipertahankan.

**Dampak ke pengguna awam:** Ketiadaan indikator ini adalah alasan nomor satu user trauma kehilangan data melakukan backup berlebihan, atau sebaliknya — karena tidak tahu kondisinya, dia **tidak pernah** tahu kapan harus backup. Aturan yang efektif: setiap selesai satu event, atau setiap akhir hari, atau setelah jumlah transaksi melewati ambang tertentu. Tanpa penanda waktu, tidak ada pemicu yang wajar.

**Usulan perbaikan (deskriptif):** tambahkan di header, di sebelah `#nav-chips`, indikator persisten: `● Tersimpan 08:12` (hijau) / `◐ Menyimpan…` (kuning) / `⚠ Gagal menyimpan` (merah, tidak bisa hilang sampai selesai). Ambil waktunya di dalam `save()`: `db.meta.lastSavedAt = new Date().toISOString()`. Bonus: tampilkan juga "149 record · 58 KB" supaya user punya gambaran kasar tentang datanya.

---

### [BUG-10] Nama file backup tidak unik dan tidak informatif — 2 backup di hari yang sama bernama sama — **SEDANG**

**Persona dan use-case:** Kebiasaan saya ambil backup setiap selesai ganti shift, 2-3 kali sehari. Setelah sebulan, folder Download saya berisi 60+ file dan saya tidak tahu yang mana terbaru.

**Langkah reproduksi:**
1. Panggil `A.actions['data:export']` dan baca nilai `a.download`
2. Bandingkan nama file untuk backup ke-1 dan ke-2 di hari yang sama

**Harapan:** Nama file urut dan self-explaining, misalnya `SPPD-Backup-Kael_2026-10-01_14-32.json`.

**Kenyataannya:**
- Pola nama: `'sppd-backup-' + A.isoToday() + '.json'` (`actions.js:528`)
- `A.isoToday()` hanya menghasilkan `YYYY-MM-DD` — **tidak ada jam/menit/detik**
- Dua backup di hari yang sama → **nama file identik**; browser menyimpan yang kedua sebagai `... (1).json` dan yang ketiga `... (2).json` — user **tidak akan tahu** file mana isi mana
- Tidak ada nama/NIP/instansi di nama file → 5 orang yang sama-sama memakai "SPPD Toolbox" menghasilkan file yang tidak bisa dibedakan
- Tidak ada lokasi file yang ditampilkan setelah unduhan
- Tidak ada fallback kalau browser memblokir unduhan (tidak ada tombol "salin ke papan klip")

**Evidence:**
```
=== [3] MEKANISME UNDUH BACKUP ===
  nama file = "sppd-backup-" + A.isoToday() + ".json"
  nama file hari ini : sppd-backup-2026-10-01.json
  nama file besok     : sppd-backup-2026-10-02.json
  ★ TIDAK ada jam/menit/detik -> 2 backup di hari yang sama = nama file IDENTIK
  ★ TIDAK ada nama/NIP/instansi di nama file
  ★ tidak ada fallback "salin ke clipboard" kalau browser memblokir unduhan
  cek apakah app pernah menyebut lokasi file: TIDAK — user harus ingat sendiri mencarinya
  simulasi dua backup di hari yang sama:
    file#1 = sppd-backup-2026-10-01.json
    file#2 = sppd-backup-2026-10-01.json  -> identik? YA (browser simpan sebagai "...json" dan "... (1).json")
```

**Dampak ke pengguna awam:** Justru saat paling butuh — file backup yang banyak tapi tidak bisa dibedakan — user akan salah pilih dan restore dari versi lama (BUG-02), kehilangan data yang lebih baru. Instrumen yang seharusnya menyelamatkan justru menambah beban.

**Ususan perbaikan (deskriptif):** pola nama `SPPD-YYYY-MM-DD_HH-mm-ss__<nama-user>__<jumlah-record>record.json` (contoh: `SPPD-2026-10-01_14-32-08__Kael-PIC__399record.json`). Setelah unduhan, tampilkan toast yang menyebut path: "Tersimpan di folder Download — cari file `SPPD-2026-10-01...` kalau tidak terlihat". Tambahkan tombol kedua "Salin ke Papan Klip" sebagai cadangan kalau browser memblokir unduhan.

---

### [BUG-11] File backup tidak punya marker versi/tanggal — tidak ada validasi kompatibilitas saat restore — **SEDANG**

**Persona dan use-case:** Saya backup hari ini. Sebulan kemudian aplikasinya diperbarui (misalnya ada koleksi baru atau format berubah). Saya restore file lama, dan saya tidak tahu apakah app yang baru bisa membacanya.

**Langkah reproduksi:**
1. `store.exportJSON()` → `JSON.parse` hasilnya
2. Periksa apakah ada field versi / tanggal / nama aplikasi

**Harapan:** File backup punya header yang jelas, misalnya `{"_app":"SPPD Toolbox","_schemaVersion":2,"_exportedAt":"...","data":{...}}`.

**Kenyataannya:** 16 top-level key, **semuanya** koleksi data — tidak ada satu pun metadata. `parsed.version`, `parsed.schemaVersion`, `parsed.appVersion`, `parsed.exportedAt`, `parsed.app` → semuanya `undefined`. Konsekuensinya, aplikasi tidak bisa (a) menolak file dari versi lama yang tidak kompatibel, (b) memberi tahu user "file ini dibuat 3 bulan lalu", (c) melakukan migrasi saat format berubah.

**Evidence:**
```
=== [2] BACKUP (store.exportJSON) ===
panjang string backup : 84052 byte
JSON valid            : ya (JSON.parse ok)
top-level key backup  : 16 -> events,sppd,transports,products,eventProducts,sales,expenses,milestones,kasAdj,danaCair,prepItems,settings,checklistTemplates,checklistItems,itemCats,itemTemplates
ada field versi/schema: TIDAK ADA (tidak ada marker versi/tanggal)
```

**Dampak ke pengguna awam:** User awam tidak akan pernah membaca file JSON, jadi dia tidak bisa memeriksa sendiri. Semua pemeriksaan harus dilakukan aplikasi — dan saat ini tidak ada sama sekali.

**Usulan perbaikan (deskriptif):** bungkus export dengan envelope berversi (lihat BUG-07). `importJSON` membaca envelope-nya: kalau `_schemaVersion` lebih baru dari versi app → tolak dengan jelas; kalau lebih lama → jalankan migrasi. Tetap kompatibel dengan file lama (baca langsung kalau tidak ada envelope) supaya file backup yang sudah terlanjur diunduh tidak jadi sia-sia.

---

### [BUG-12] Membuka aplikasi saja sudah MENULIS ke database — "baca" bukan baca — **SEDANG**

**Persona dan use-case:** Saya mengira aplikasi ini read-only sampai saya mengetuk. Saya juga khawatir: kalau storage sedang kritis atau kuota hampir penuh, **hanya membuka app** bisa memicu penulisan yang gagal atau menimpa data.

**Langkah reproduksi:**
1. `localStorage.clear()` → catat panjang = 0
2. Muat `app.js` (yang me-render dashboard) tanpa interaksi apa pun
3. Catat panjang storage setelahnya

**Harapan:** Membuka aplikasi tidak mengubah data. Penulisan hanya terjadi karena aksi pengguna.

**Kenyataannya:** Hanya dengan memuat `app.js`, panjang `localStorage` berubah dari **0 → 54.931 karakter**, dan `sppd` berisi **9 record**, padahal di `store.js` seed hanya berisi **8** (`evt-2` memang tidak punya SPPD). Penyebabnya `store.getSppd(eventId)` (`store.js:382-386`) — yang mestinya hanya "ambil" — diam-diam **membuat** record SPPD baru lalu memanggil `saveSppd()` → `save()`. `getSppd` dipanggil saat render halaman mana pun yang menyentuh data event.

Dampaknya untuk persona saya:
- Setiap membuka app = 1 penulisan penuh 55 KB. Kalau kuota hampir penuh, **hanya membuka app** bisa jadi aksi yang membuat penulisan gagal (BUG-08)
- Setiap membuka app = 1 kesempatan untuk menimpa penyimpanan yang korup (BUG-03)
- `A.store.getSppd.length = 2` (hanya `eventId`, tanpa opsi "buat bila tidak ada") — pemanggil tidak punya cara meminta read-only

**Evidence:**
```
=== APAKAH APP MENULIS KE localStorage TANPA USER MELAKUKAN APA-APA? ===
panjang localStorage SEBELUM app script dimuat : 0 karakter
panjang localStorage SESUDAH app.js render dashboard : 54931 karakter
isi sekarang: events=9 sppd=9
=> hanya dengan MEMBUKA app, satu record SPPD baru untuk evt-2 sudah ditulis ke penyimpanan
```

**Dampak ke pengguna awam:** Agak halus, tapi untuk orang yang sudah pernah kehilangan data, "kenapa dataku berubah sendiri saat cuma dibuka?" adalah sumber kecemasan yang nyata. Secara teknis, "menulis saat hanya membaca" juga akan menyulitkan setiap perbaikan ke depan (misalnya membuat fitur read-only atau cache).

**Usulan perbaikan (deskriptif):** pisahkan `getSppd(eventId)` (read-only, mengembalikan `null` kalau tidak ada) dari `ensureSppd(eventId)` (membuat + menyimpan). Halaman yang butuh SPPD memanggil `ensureSppd()` secara eksplisit satu kali saat event dibuat, bukan di setiap render. Kalau auto-perbaikan tetap diinginkan, lakukan di dalam `saveEvent()` saat event dibuat, bukan di fungsi pembaca.

---

### [BUG-13] Panduan tidak pernah menyebut cara backup maupun risikonya — tombol backup sulit ditemukan — **SEDANG**

**Persona dan use-case:** Saya baca Panduan mencari "bagaimana cara backup". Saya tidak menemukannya. Saya tidak tahu bahwa meng-install ulang app, membersihkan cache browser, atau ganti HP akan menghapus semua data saya. Saya juga tidak tahu bahwa aplikasi ini punya tombol backup.

**Langkah reproduksi:**
1. Buka `#/guide`, ambil seluruh `innerText` (6.177 karakter)
2. Cari kata kunci: `backup`, `cadangan`, `simpan data`, `risiko`, `salin`, `ekspor`, `pindah HP`, `ganti HP`, `data tidak bisa`

**Harapan:** Ada bagian eksplisit di Panduan: "Data kamu hanya ada di perangkat ini. Lakukan backup minimal setiap selesai 1 event" + langkah persisnya + risiko (bersihkan data browser, uninstall, ganti perangkat, mode penyamaran).

**Kenyataannya:** Dari 13 kata kunci, yang **tidak** ada: `backup`, `cadangan`, `simpan data`, `risiko`, `salin`, `ekspor`, `pindah HP`, `ganti HP`, `data tidak bisa`. Yang **ada**: `localStorage` (2×), `hilang` (1×), `aman` (1×), `browser` (1×). Seluruh pembahasan backup cuma **satu pertanyaan FAQ**, dua kalimat:

> **10. Berapa batas data? Buat apa lalu hilang?**
> Prototype ini menyimpan data di **localStorage browser** — aman selama browser yang sama & belum di-clear. Saat nanti GAS/Supabase tersambung, data dipindah ke database cloud.

Yang **tidak** disebut di situ: (a) kuota ±5 juta karakter, (b) tidak ada cara backup di dalam app kecuali tombol di halaman kedelapan, (c) risiko nyata — bersihkan data browser / uninstall app / ganti perangkat / mode penyamaran = semua hilang, (d) saran frekuensi backup.

**Evidence:**
```
=== [1] ISI HALAMAN PANDUAN ===
panjang Panduan: 6177 karakter
  "backup" -> TIDAK ADA
  "cadangan" -> TIDAK ADA
  "simpan data" -> TIDAK ADA
  "localStorage" -> ADA
  "hilang" -> ADA
  "risiko" -> TIDAK ADA
  "aman" -> ADA
  "salin" -> TIDAK ADA
  "ekspor" -> TIDAK ADA
  "pindah HP" -> TIDAK ADA
  "ganti HP" -> TIDAK ADA
  "data tidak bisa" -> TIDAK ADA
```
Daftar FAQ yang ada: Q1 sistem untuk apa, Q2 bagaimana memulai, Q3 SPPD, Q4 dana awal, Q5 transportasi, Q6 produk vs penjualan, Q7 timeline, Q8 rekap penjualan, Q9 laporan penggunaan uang, **Q10 batas data**, Q11 GAS/Supabase, Q12 kenapa ada "Prototype". Tidak ada satu pun Q tentang backup/recovery/kehilangan data selain Q10.

**Dampak ke pengguna awam:** Tombol "Backup ke File" ada di halaman **Pengaturan** — item **kedelapan** di navigasi, di bawah "Status Integrasi" yang isinya masih "Pending" semua. User yang tidak tahu urusannya tidak akan pernah menemukan tombol itu sampai sudah kehilangan data. Untuk orang seperti saya, dokumentasi adalah garis pertahanan pertama.

**Usulan perbaikan (deskriptif):** (1) tambah bagian **"Jaga Data Kamu"** di Panduan sebagai Q1 (paling atas), berisi risiko lengkap, kapan harus backup, langkah persisnya, dan kapan harus restore. (2) sebut kata "Backup" minimal 5× di Panduan, dengan link langsung `data-action="data:export"`. (3) di Pengaturan, naikkan kartu "Data" ke posisi **paling atas**, dengan subjudul "Backup WAJIB — data kamu hanya ada di HP ini". (4) tampilkan reminder di Dashboard kalau backup terakhir sudah lebih dari 3 hari (butuh field `lastBackupAt` di `db.settings`).

---

### [BUG-14] Tidak ada peringatan saat menutup app dengan input belum disimpan — **SEDANG**

**Persona dan use-case:** Saya buka form tambah penjualan, mengetik qty dan harga. Tiba-tiba ada telepon masuk. Saya tutup app untuk menjawab. Saya buka lagi — semua ketikan saya hilang, tidak ada peringatan.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, klik tombol tambah penjualan
2. Ketik nilai di form
3. Periksa: apakah ada draft, autosave, atau peringatan?

**Harapan:** Minimal ada (a) peringatan `beforeunload` kalau ada isian yang belum disimpan, atau (b) isian form disimpan otomatis sebagai draft.

**Kenyataannya:** `window.onbeforeunload = null`. Grep di `js/*.js` dan `index.html` untuk `beforeunload`, `visibilitychange`, `debounce`, `autosave` → **0 hasil**. Form baru commit saat tombol Simpan ditekan. Menutup tab atau HP mati = ketikan hilang tanpa peringatan.

**Catatan — perlu konfirmasi:** pada uji klik DOM, `#modal-root` bertahan saat pindah hash (router hanya menulis ulang `#app`), jadi isi modal kemungkinan bertahan saat navigasi **di dalam app**. Yang hilang adalah saat **menutup tab/app** atau menekan tombol "Batal" — keduanya tidak memberi peringatan. `beforeunload` tidak bisa dipicu di headless, tapi ketiadaan listener di source sudah pasti.

**Dampak ke pengguna awam:** Di lapangan, form sering diisi sambil ada panggilan masuk. Mengulang transaksi 3-4 kali bukan hal yang langka. Dan tidak ada yang memberi tahu Anda mengulang.

**Usulan perbaikan (deskriptif):** (1) pasang `window.addEventListener('beforeunload', e => { if (adaFormDirty) e.preventDefault(); })` saat ada isian form yang belum disimpan. (2) simpan isian form ke `sessionStorage` setiap saat user mengetik, lalu pulihkan saat modal dibuka lagi — ini yang paling berguna di lapangan. (3) tombol "Batal" di form yang sudah terisi: ubah jadi "Batal (data tidak disimpan)" atau minta konfirmasi sekali.

---

### [BUG-15] Export → import bukan round trip sempurna — `attachments: []` disuntikkan diam-diam — **RENDAH**

**Persona dan use-case:** Kalau saya menyimpan backup hari ini, menambah data, lalu restore, saya berharap datanya identik seperti semula — supaya saya percaya prosesnya benar.

**Langkah reproduksi:**
1. Kerjakan data nyata (399 record)
2. `var before = JSON.parse(JSON.stringify(store.load()))` — salinan dalam
3. `var backup = store.exportJSON()`
4. `store.resetData()` lalu `store.importJSON(backup)`
5. Bandingkan `before` dengan hasil restore, karakter demi karakter

**Harapan:** Restore mengembalikan kondisi yang **identik 100%**.

**Kenyataannya:** Jumlah record **sama persis di semua 16 koleksi** (selisih nol) dan hash hampir sama, tapi **tidak identik**: 56.710 → 56.727 karakter (+17). Penyebabnya `importJSON` menambahkan `attachments: []` ke setiap milestone yang belum punya field itu (`store.js:351`). Jadi **restore mengubah bentuk data**, meskipun isinya utuh. Ini bukan kehilangan data, tapi membuat verifikasi integritas backup mustahil — "backup identik" tidak akan pernah bernilai true.

**Evidence:**
```
=== [4] PULIHKAN (store.importJSON(backup)) ===
return importJSON : {"before":9,"after":9}
selisih jumlah record: TIDAK ADA
IDENTIK 100%?             : TIDAK
ukuran JSON restore : 56727 byte  hash=5d272f2e
fingerprint sebelum kerja : 56710 byte hash=7679f286
  BEDA di "milestones" (panjang 4500 vs 4517)
produk baru kembali?   YA
2 penjualan baru kembali? 2/2
catatan SPPD kembali?  "Tambahan 500rb dari patio atasan"
budget tambahan kembali? 6 baris (seed=5)
pilihan checklist hasil kerja? 15 selesai
```

**Dampak ke pengguna awam:** Dampak langsung kecil. Tapi penting untuk **kepercayaan**: kalau user punya cara membandingkan file backup-nya sendiri dan melihat bedanya, dia akan meragukan seluruh sistem backup. Lebih baik dikembalikan persis seperti semula.

**Ususan perbaikan (deskriptif):** normalisasi harus berjalan di **kedua** arah: `exportJSON` juga menjalankan normalisasi yang sama sebelum di-`stringify` (jadi file backup selalu memuat `attachments: []` konsisten), atau `importJSON` tidak menambahkan default field sama sekali dan cukup membaca data apa adanya dengan `m.attachments || []` di tempat pembaca. Pilih salah satu — yang penting output stabil dan deterministik.

---

### [BUG-16] Hapus event meninggalkan 24 record checklist yatim yang tidak terlihat dan tetap makan kuota — **RENDAH**

**Persona dan use-case:** Saya sudah 3 tahun memakai aplikasi ini, sudah 40 event selesai. Di halaman Arsip saya hapus yang lama. Saya tidak tahu bahwa 24 baris checklist per event masih nyangkut di database.

**Langkah reproduksi:**
1. Catat `checklistItems evt-1` = 24
2. `store.deleteEvent('evt-1')`
3. Hitung ulang item yang `eventId = 'evt-1'`

**Harapan:** Hapus event membersihkan semua jejaknya.

**Kenyataannya:** Tetap ada **24 item** dengan `eventId = 'evt-1'`, padahal `getEvent('evt-1')` sudah `null`. `store.deleteEvent` (`store.js:366-379`) memfilter 10 koleksi: `events, sppd, transports, eventProducts, sales, expenses, milestones, kasAdj, danaCair, prepItems` — tapi **tidak** `checklistItems`. Item-item ini tidak pernah tampil di UI lagi (karena halaman di-render dari `getEvent()`), jadi tidak terlihat user, tapi tetap tersimpan di `localStorage` dan ikut di `exportJSON`.

**Evidence:**
```
=== HAPUS EVENT: BERAPA RECORD YATIM TERSISA ===
checklistItems evt-1 sebelum hapus = 24
checklistItems evt-1 SETELAH hapus = 24  <-- data yatim tidak ikut terhapus
event dengan id itu masih ada? tidak
orphan tidak terlihat di UI mana pun, tapi tetap makan kuota: 24 record
```

**Dampak ke pengguna awam:** Setelah 40 event dihapus, ada **960 record yatim** diam-diam di database. Dampaknya kecil (mungkin 200-300 KB, di bawah 5% kuota), tapi untuk user yang sudah cemas soal kuota (BUG-08) ini menambah tekanan yang tidak bisa mereka lihat atau kendalikan.

**Usulan perbaikan (deskriptif):** tambahkan `db.checklistItems = db.checklistItems.filter(function (c) { return c.eventId !== id; });` di dalam `deleteEvent`. Lalu, sebagai perawatan rutin, jalankan sekali di `load()`: buang `checklistItems` yang `eventId`-nya tidak ada di `db.events` — housekeeping yang aman, karena data itu tidak bisa diakses dari UI.

---

### [BUG-17] Konten backup membengkak 48% karena format pretty-print — **RENDAH**

**Persona dan use-case:** Saya ingin backup-nya kecil supaya bisa dikirim lewat WhatsApp ke diri sendiri (sebagai lapis kedua). File-nya ternyata besar.

**Langkah reproduksi:**
1. Bandingkan `store.exportJSON()` (pretty, indent 2) dengan `JSON.stringify(db)` (compact)

**Harapan:** Backup file seadil mungkin supaya gampang dikirim lewat email/chat.

**Kenyataannya:** Backup seed = **81.386 karakter** pretty vs **54.931** compact. Selisih **26.455 karakter** — ini masuk akal karena pretty menambah indentasi dan newline, dan tidak ada data hilang di mode compact.

**Evidence:**
```
compact = 54931 karakter, pretty (file backup) = 81386 karakter,
selisih 26455 karakter (148% dari compact)
```

**Dampak ke pengguna awam:** Rendah. Hanya relevan kalau nanti ada fitur "kirim backup ke WhatsApp" atau "simpan 7 snapshot di localStorage". Saya menyebutkannya karena ini memengaruhi rancangan auto-backup: 7 snapshot pretty = 570 KB, jauh lebih baik dari compact = 385 KB, tapi 30 snapshot sudah 1,6 MB dan jadi masalah.

**Ususan perbaikan (deskriptif):** sediakan **dua** mode export: default `pretty` (untuk dibaca manusia) dan opsi "compact" (tanpa indent) untuk dikirim atau disimpan otomatis. Auto-backup internal harus memakai yang compact.

---

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Backup benar-benar lengkap.** Saya uji dengan teliti: `exportJSON` menumpahkan **semua 16 koleksi** — `events, sppd, transports, products, eventProducts, sales, expenses, milestones, kasAdj, danaCair, prepItems, settings, checklistTemplates, checklistItems, itemCats, itemTemplates`. **Selisih jumlah record: nol.** Tidak ada koleksi yang tertinggal. Ini fondasi yang benar dan wajib dipertahankan.
- **Restore-round-trip-nya benar-benar memulihkan data kerja nyata.** Setelah reset total, `importJSON` mengembalikan **399 dari 399 record**, termasuk: 2 penjualan baru, 2 pengeluaran baru, 1 transport, 1 prepItem, 1 milestone, 1 danaCair, produk baru (`Tas Ransel Batik`), baris alokasi SPPD ke-6, `catatan: 'Tambahan 500rb dari patio atasan'`, `danaAwal` = 3.000.000, `nama: 'Kael (PIC)'`, `tarifKm` = 5.200, dan checklist yang dicentang. **Fungsinya 100% benar.**
- **Ada konfirmasi pada 4 operasi paling besar**: hapus event (dengan peringatan data anaknya ikut terhapus), hapus produk (dengan peringatan ikut terhapus dari checklist & penjualan), hapus grup master, dan reset data. Modal selalu punya tombol **Batal** yang jelas.
- **Error localStorage penuh TIDAK diabaikan.** `save()` punya `try/catch` dan benar-benar memunculkan toast `"Gagal menyimpan ke localStorage"`. Banyak prototype tidak melakukan ini. Yang kurang hanya ketahanannya (BUG-08).
- **Ada validasi dasar import**: JSON rusak, file HTML salah download, dan file yang sama sekali bukan backup SPPD semuanya **ditolak** dengan pesan. 3 dari 6 kasus uji file salah ditangani.
- **Jujur soal status prototype.** Banner di Dashboard: `"Data tersimpan di browser (localStorage) + contoh dummy. GAS & Supabase belum tersambung"`. Ada FAQ Q10 yang menjelaskan localStorage. Halaman Pengaturan menampilkan status integrasi (Database/API/Drive = "Pending", Penyimpanan = "localStorage"). Tidak ada klaim palsu soal cloud sync. Ini penting dan harus tetap ada.
- **Tombol backup/ekspor/reset dikelompokkan rapi** di satu kartu "Data" dengan penjelasan singkat soal apa yang dilakukan masing-masing. Arahnya sudah benar, tinggal diperdalam (BUG-10, BUG-13).
- **Ada migrasi `LEGACY_KEYS`** (`sppd_toolbox_db_v1` dihapus bersih saat load) — menunjukkan application's author berpikir soal versi data.
- **`importJSON` mengembalikan objek `{before, after}`** — hook yang bagus untuk tindak lanjut "tampilkan pratinjau jumlah record sebelum/sesudah" tanpa mengubah signature.
- **Reset mengembalikan data seed yang utuh dan konsisten** — setelah reset semua 16 koleksi kembali ke angka seed yang benar. Jadi kalau user memang ingin mulai dari nol, hasilnya bersih.

---

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah unduhan file benar-benar berhasil di `file://`?** Saya hanya bisa memverifikasi bahwa app membuat `Blob` dengan tipe `application/json` dan `URL.createObjectURL` berhasil — **tidak** bisa memastikan file benar-benar sampai ke folder Download dari headless. Perlu diuji manual di Edge nyata, khususnya di Android. **Perlu konfirmasi.**
- **`beforeunload`:** tidak bisa dipicu di headless. Grep source menunjukkan tidak ada listener-nya, tapi perlu dicek manual apakah ada perilaku tak terduga di Android saat aplikasi di-swipe dari multitasking.
- **Ukuran kuota di perangkat nyata bisa berbeda.** Saya mengukur **5.200.000 karakter** di desktop Windows/Edge headless. Di Android/iOS kuotanya **jauh lebih kecil** (bisa 2-5 MB, kadang lebih kecil lagi per aplikasi). Kalau begitu, BUG-08 bisa terjadi **jauh lebih cepat** dari estimasi saya (±23.500 transaksi). Perlu diukur di perangkat nyata.
- **Apakah `localStorage` di `file://` terisolasi per file atau per origin?** Ini menentukan apakah backup di HP dan di laptop benar-benar terpisah, dan apakah "ganti perangkat" pasti berarti kehilangan. Agent 17 (lintas perangkat) kemungkinan sudah mengukurnya; saya tidak mengulang.
- **Apakah masih ada jalur `save()` lain yang bisa dieksekusi setelah import gagal?** Saya menguji jalur yang paling umum (`settings:save` → `saveSettings` → `save()`) dan itu sudah cukup untuk menghancurkan data. Tapi `A.reload()` di `data:import` dipanggil **setelah** `catch`; kalau `A.reload()` atau render halaman ternyata memanggil `getSppd`/`ensureChecklistItems` (keduanya memanggil `save()`), maka/data bisa langsung hilang **tanpa satu pun klik tambahan**. **Perlu konfirmasi — kalau benar, BUG-01 severity-nya naik lagi.**
- **Apakah `A.store.load()` aman dari pemanggil lain** yang bisa melempar exception kalau koleksi `undefined`? Saya melihat `getSppd` aman, tapi `sales()`/`expenses()` melempar kalau koleksinya `undefined` — inilah yang membuat BUG-01 terasa sangat parah.

---

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| **Kelengkapan backup (apakah datanya berutuh?)** | **5** | 16 dari 16 koleksi ikut, 0 record hilang saat ekspor. Fondasinya benar total. |
| **Keandalan restore** | **4** | 399/399 record kembali dengan benar. Turun 1 karena tidak identik 100% (BUG-15) dan karena file cacat bisa diterima (BUG-07). |
| **Proteksi dari kehilangan data (tindakan destruktif)** | **1** | 10 dari 14 hapus tanpa konfirmasi, 0 undo, 0 recycle bin, 48 record hilang dalam 1 klik event. Tidak aman. |
| **Kepercayaan pada app (bisakah dipegang datanya?)** | **1** | Import menimpa sebelum validasi (55 KB → 188 karakter), error kuota hanya toast 3 detik, storage korup ditimpa tanpa suara. Tiga kegagalan diam-diam berturut-turut. |
| **Transparansi status penyimpanan** | **1** | Tidak ada "terakhir disimpan", tidak ada ukuran data, tidak ada rasio kuota, tidak ada lokasi file backup di 8 halaman. |
| **Keterjelasan dokumentasi backup** | **1** | Panduan 6.177 karakter, **0 kali** menyebut "backup". FAQ Q10 cuma 2 kalimat dan tidak menyebut cara maupun risikonya. |
| **Kemudahan recover manual** | **2** | Tombolnya ada dan bekerja. Tapi ada di halaman kedelapan, tanpa panduan, tanpa pratinjau, dan import yang salah langsung menghancurkan. |
| **Ketahanan terhadap crash / HP mati** | **1** | Tidak ada draft, tidak ada autosave, tidak ada `beforeunload`, JSON terpotong langsung ditimpa data dummy. |
| **Kejujuran error (tidak ada hasil salah diam-diam)** | **2** | Toast error ada, tapi hanya 3 detik dan state tetap menampilkan data seolah sudah tersimpan. |
| **Skor keseluruhan untuk persona saya** | **1,5** | Mekanikanya ada dan benar, tapi dilindungi nol lapis pengaman. Saya akan tetap backup manual tiap selesai 1 event, dan **tidak akan pernah** memakai tombol "Pulihkan dari File" atau "Reset Data Dummy" tanpa backup manual yang baru saja dibuat. |
