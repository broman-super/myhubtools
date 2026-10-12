# AGENT-13 — Organizer Multi-Event

> **Persona:** Organizer Dinas Koperasi & UMKM yang menangani 10+ event dengan status berbeda (draft, diajukan, berjalan, selesai, dibatalkan) dan sering lupa event mana yang sedang aktif · **Fokus:** halaman daftar event, dashboard, dan navigasi antar event · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 1 |
| TINGGI | 5 |
| SEDANG | 10 |
| RENDAH | 3 |
| **TOTAL** | **19** |

Kesimpulan: arsitektur data aplikasi ini **tidak bocor antar event** — saya cek angka per event satu per satu dan tidak ada kontaminasi (lihat bagian "Yang sudah bagus"). Yang rusak justru **lapisan informasi**: aplikasi tidak pernah memberi tahu event mana yang harus dikerjakan hari ini. Dashboard hanya menampilkan 5 dari 9 event seed, hero "Sedang berjalan" menunjuk event yang sudah selesai 5 bulan lalu, angka total mencampur event selesai dengan yang sedang jalan, dan dua status resmi (`diajukan`, `disetujui`) hilang **diam-diam** begitu event-nya kamu edit. Untuk persona saya ini lebih buruk daripada aplikasi yang error: statistiknya salah dan tidak ada yang memberi tanda bahaya. Saya baru sadar setelah membandingkan angka dashboard dengan daftar event satu per satu. Temuan paling parah ada dua sisi: tombol **"Hapus event" mati total** (dialog konfirmasi tidak pernah diproses) sehingga saya tidak bisa merapikan 17 event, sementara **hapus transaksi penjualan jalan tanpa konfirmasi sama sekali** sehingga satu klik salah bisa menghapus bukti keuangan tanpa jejak.

## Environment yang dipakai

- Edge headless (`--headless=new`), 5 profil unik terpisah, `localStorage.clear()` di awal tiap run.
- Rute yang diuji: `#/dashboard`, `#/events`, `#/archive`, `#/events/<id>`, `#/events/evt-1/roadmap`, `#/products`, `#/master`, `#/reports`, `#/settings`, plus URL ngawur `#/events/evt-999`.
- Data seed default (9 event): 3 `berjalan`, 2 `draft`, 2 `selesai`, 1 `diajukan`, 1 `disetujui`.
- Event tambahan dibuat **lewat UI sungguhan** (klik `+ Buat Event Baru` → isi form → `Simpan`), total sampai 17 event.
- 5 harness HTML di `_QA_TMP/` (`a13_multi`, `a13_r2`..`a13_r5`), semuanya sudah dihapus setelah selesai.

## Temuan

### [BUG-01] Status "Diajukan" dan "Disetujui" hilang diam-diam setiap kali event di-edit — TINGGI

**Persona dan use-case:** Saya membuka event yang SPPD-nya sudah diajukan, cuma mau menambah satu kalimat catatan, lalu menyimpan. Tidak ada satu pun peringatan bahwa status approval-nya hilang.

**Langkah reproduksi:**
1. Buka `#/events/ev-d2` ("Festival Kerajinan Nusantara", badge `● Diajukan`).
2. Klik `Edit event`.
3. Perhatikan dropdown Status: di badge tertulis "Diajukan", tapi di form tidak ada pilihan itu.
4. Tambahkan satu kata di kolom Catatan, klik `Simpan Perubahan`.
5. Perhatikan badge di header.

**Harapan:** Status `diajukan` tetap `diajukan` setelah edit, karena status approval adalah bagian dari alur kerja, bukan bagian dari form event.

**Kenyataannya:** Status menjadi string kosong `''`. Badge berubah jadi `●` tanpa tulisan. Event langsung hilang dari dashboard dan tidak bisa difilter di halaman mana pun.

**Evidence:**
```
ev-d2 sebelum edit : status="diajukan"
opsi pada select #ev-status : draft,berjalan,selesai,dibatalkan
#ev-status value = "" selectedIndex=-1
ev-d2 SESUDAH edit: status=""   <-- turun dari "diajukan"
badge sekarang : ●
badge markup : <span class="badge" style="background:#F3F4F6;color:#6B7280">●&nbsp;</span>
```
Uji yang sama pada `ev-d5` (`disetujui`) → `status=""`. Tidak ada toast, tidak ada dialog, tidak ada highlight field. Gejala yang sama terjadi di sisi buat-event: saat saya membuat event dan mencoba memberi status `diajukan`, status tersimpan `""`.

**Dampak ke pengguna awam:** Ini menciptakan rasa aman palsu. Badge `● Diajukan` di layar meyakinkan saya suratnya sudah diserahkan. Setelah edit, event itu jadi berstatus kosong — hilang dari dashboard, tidak bisa difilter, tidak bisa dicari statusnya. Kalau saya mengandalkan aplikasi untuk tahu "event mana yang masih nunggu approval", daftar itu akan pelan-pelan kosong tanpa saya sadari.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Dropdown Status di form event harus memuat seluruh status yang dikenali aplikasi (6: draft, diajukan, berjalan, disetujui, selesai, dibatalkan) agar konsisten dengan `STATUS_MAP` di `ui.js` dan dengan filter di halaman Arsip. `event:save` sebaiknya menolak menyimpan bila `status` kosong. `eventModal` juga sebaiknya menandai opsi aktif secara eksplisit, bukan mengandalkan `select.value = ev.status` yang gagal diam-diam (`selectedIndex = -1`) saat opsi tidak ada.

---

### [BUG-02] Tombol "Hapus event" tidak melakukan apa-apa — konfirmasi tidak pernah diproses — TINGGI

**Persona dan use-case:** Daftar saya sudah 17 event. Saya mau bersihkan event lama supaya tidak tiap search. Saya klik `Hapus event`, dialog muncul, saya klik `Hapus`. Dialog membeku, data tetap ada.

**Langkah reproduksi:**
1. Buka `#/events/ev-d6`.
2. Klik tombol merah `Hapus event`.
3. Dialog muncul: "Hapus event? / Semua data SPPD, produk, penjualan & keuangan event ini ikut terhapus. / Batal | Hapus".
4. Klik tombol `Hapus`.
5. Hitung ulang isi database.

**Harapan:** Event terhapus dan saya diarahkan ke `#/events`.

**Kenyataannya:** Tidak ada yang terjadi. Dialog tetap terbuka. Satu-satunya jalan keluar adalah `Batal` atau Escape.

**Evidence:**
```
SPT.actions["modal:ok"]   = function () { /* diganti oleh ui.confirm */ }
SPT.actions["modalOk"]    = tidak ada
SPT.actions["modalClose"] = tidak ada
sebelum klik Hapus : events=11 sppd=11 sales=11 prepItems=13
SETELAH klik Hapus: events=11 sppd=11 sales=11
modal masih terbuka? true | toast: true | hash=#/events/ev-d6
```
Diverifikasi juga di Master Barang:
```
grup master sebelum=5 sesudah=5 (tidak berubah = konfirmasi tidak berjalan)
```
Penyebabnya terlihat di kode: `ui.confirm()` memasang handler sebagai `A.actions.modalOk` (camelCase, `ui.js:105`) sementara tombolnya memanggil `data-action="modal:ok"` (ada titik dua, `ui.js:102`). `app.js:93` mencari `ui.actions[action]` persis dengan nama itu, jadi tidak ketemu dan jatuh ke stub no-op di `actions.js:109`. Akibatnya **empat** tombol destruktif mati: `event:delete`, `master:catdel`, `product:delete`, dan `data:reset` (Reset Data di Pengaturan).

**Dampak ke pengguna awam:** Untuk saya yang 17 event, ini menutup satu-satunya cara merapikan. Saya akan coba berulang, lalu memutuskan biarkan saja dan memakai Excel sebagai catatan pribadi di samping aplikasi. Untuk pengguna awam, perilakunya seperti aplikasi yang kadang macet — tapi karena tidak ada pesan error, orang akan menyalahkan diri sendiri "kliknya meleset").

**Usulan perbaikan (deskriptif):** Samakan nama kuncinya — `ui.confirm` sebaiknya memasang `A.actions['modal:ok']` dan `A.actions['modal:close']`, atau tombolnya diubah ke `data-action="modalOk"`. Perlu juga umpan balik kalau confirm gagal diproses. Terpisah dari itu, daftar panjang memang perlu cara "arsipkan/sembunyikan" supaya Hapus tidak jadi satu-satunya opsi (lihat BUG-08).

---

### [BUG-03] Transaksi penjualan terhapus dalam satu klik, tanpa konfirmasi dan tanpa undo — KRITIS

**Persona dan use-case:** Saya sedang merapikan rekap satu event lama, di Layar Kerja. Saya klik ikon hapus di baris transaksi — ternyata tidak ada apa-apa yang menahanku, dan barisnya hilang.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` (seksi 05 "Uang - Penjualan").
2. Catat jumlah transaksi: 4.
3. Klik tombol hapus pada baris pertama.
4. Periksa: dialog? tombol undo? jumlah transaksi?

**Harapan:** Minimal ada konfirmasi ("Hapus transaksi Rp 480.000 tanggal 23 Apr 2026?"), atau ada mekanisme undo singkat.

**Kenyataannya:** Baris langsung hilang. Tidak ada dialog. Toast singkat "Transaksi dihapus" muncul lalu ikut hilang sendiri. Tidak ada undo, tidak ada recycle bin.

**Evidence:**
```
evt-1 transaksi penjualan: 4 | tombol hapus baris: 4
setelah 1 klik: transaksi=3 | dialog konfirmasi? false | toast="Transaksi dihapus"
kunci DB: events,sppd,transports,products,eventProducts,sales,expenses,milestones,kasAdj,danaCair,prepItems,settings,checklistTemplates,checklistItems,itemCats,itemTemplates
kunci berlabel trash/arsip di DB : TIDAK ADA
```
Pola yang sama berlaku untuk semua aksi hapus **baris**: `sale:delete`, `expense:delete`, `transport:delete`, `milestone:delete`, `prepitem:delete`, `danaCair:delete`, `kasadj:delete` semuanya langsung `store.deleteX()` lalu reload. Di halaman Arsip urutannya DESC, jadi saya sering salah klik baris karena mengira masih ASC.

**Dampak ke pengguna awam:** Ini kebalikan dari BUG-02 dan justru lebih berbahaya. Satu klik = satu transaksi penjualan hilang, dan saya baru sadar saat rekap tidak balance. Di prototipe yang menyimpan semuanya di satu `localStorage`, tidak ada yang bisa memulihkan. Untuk petugas yang harus menyetor laporan ke dinas, itu berarti laporan salah dan tidak ada bukti transaksi mana yang sebenarnya terjadi.

**Usulan perbaikan (deskriptif):** Semua `*:delete` di `actions.js` sebaiknya lewat `ui.confirm` yang menyebut entitas yang terhapus, atau punya undo pada toast selama 5 detik. Kalau belum memungkinkan sekarang, minimal konfirmasi eksplisit untuk semua yang nilainya uang.

---

### [BUG-04] Empat dari sembilan event tidak terlihat sama sekali di dashboard — TINGGI

**Persona dan use-case:** Saya buka aplikasi pagi hari untuk tahu "hari ini saya di event yang mana". Saya baca dashboard. Yang terlihat cuma 5 event.

**Langkah reproduksi:**
1. Buka `#/dashboard` dengan seed default.
2. Bandingkan 9 nama event di store dengan teks di seluruh halaman dashboard.

**Harapan:** Ada tempat untuk melihat semua event, minimal satu baris ringkas untuk yang `selesai` dan `diajukan`.

**Kenyataannya:** 4 event tidak muncul di seluruh halaman dashboard. Section dashboard hanya "Event berjalan" (3 kartu) dan blok "Disiapkan (draft)" (2 baris). Tidak ada section untuk selesai, diajukan, disetujui, atau dibatalkan.

**Evidence:**
```
total event di store : 9
histogram status    : {"berjalan":3,"draft":2,"selesai":2,"diajukan":1,"disetujui":1}
event yang namanya muncul di dashboard : evt-1(berjalan), evt-2(draft), ev-d1(draft), ev-d3(berjalan), ev-d4(berjalan)
event TIDAK muncul sama sekali : evt-3(selesai), ev-d2(diajukan), ev-d5(disetujui), ev-d6(selesai)
judul bagian dashboard: Event berjalan | Progress
```
Korban paling menyakitkan: `Festival Kerajinan Nusantara` — status **Diajukan**, progress 20%, saldo Rp 1.250.000, SPPD `021/SPPD/UKM/2026` menunggu approval atasan. Event yang butuh **tindakan saya** justru tidak terlihat di dashboard. Setelah status `diajukan` habis (BUG-01), event itu jadi benar-benar tak terjangkau dari dashboard.

Catatan tambahan: chip navigasi kanan atas hanya menulis `"3 event berjalan"` tanpa total, padahal kodenya sudah punya cabang `"0 berjalan · 9 total"` untuk kondisi nol (`app.js:43`). Saya jadi tidak tahu ada 6 event lain yang tidak tampil.

**Dampak ke pengguna awam:** Saya akan menyelesaikan daftar "event yang harus saya urus" secara salah, padahal ada satu yang nunggu tanda tangan. Untuk pengguna awam yang tidak tahu istilah "diajukan", dia akan mengira event itu belum terdaftar sama sekali.

**Usulan perbaikan (deskriptif):** Tambah section ringkas "Perlu perhatian" berisi event `diajukan` dan `dibatalkan`, plus baris "Selesai terakhir" (3–5 terbaru). Dan tampilkan total event di chip navigasi agar organizer tahu ada event yang tidak tampil di halaman depan.

---

### [BUG-05] Hero "Sedang berjalan" menunjuk event yang sudah lewat 5 bulan — TINGGI

**Persona dan use-case:** Saya klik hero besar di dashboard karena itulah yang paling jelas di layar. Saya mendarat di event yang salah.

**Langkah reproduksi:**
1. Catat tanggal hari ini di harness: `2026-10-01`.
2. Buka `#/dashboard`, klik link di dalam kartu "Sedang berjalan".
3. Bandingkan dengan event yang benar-benar sedang berjalan: `ev-d4` (Kunjungan Mitra Sektor, 6–8 Okt 2026).

**Harapan:** Hero menunjukkan event yang paling relevance dengan hari ini.

**Kenyataannya:** Hero menunjuk `evt-1` — Pameran UMKM Nusantara Expo 2026, 22–25 April 2026, sudah lewat hampir 6 bulan, progress masih 40%, statusnya masih `berjalan` karena tidak ada yang memperbarui.

**Evidence:**
```
hero link href  : #/events/evt-1/roadmap
hero nama       : Pameran UMKM Nusantara Expo 2026
hero tahap aktif: Tahap aktif: Event H-1
event yg punya milestone "aktif" : evt-1/berjalan/2026-04-22 , ev-d2/diajukan/2026-08-10 , ev-d3/berjalan/2026-09-14 , ev-d4/berjalan/2026-10-06
tanggal hari ini : 2026-10-01
```
`ev-d4` punya milestone `aktif` ("Berangkat") dan rentang 6–8 Oktober 2026 — itu event yang benar-benar sedang berjalan. Tapi algoritma `dashboard()` mengambil event **pertama** di array `store.events()` yang punya milestone `aktif` (`pages.js:50-52`), tanpa melihat status `berjalan` maupun tanggal hari ini. Index 0 menang.

Catatan tambahan: setelah saya membuat 4 event baru berstatus `berjalan` lewat UI, hero **tidak berubah sama sekali** — masih `evt-1/roadmap`.

**Dampak ke pengguna awam:** Ini klik pertama saya setiap pagi, dan saya selalu mendarat di event yang salah. Untuk yang sudah accustomed, mungkin akhirnya tahu hero itu "asal saja". Untuk orang biasa, saya akan input penjualan ke event yang sudah 5 bulan lalu — dan karena inputnya valid secara teknis, saya tidak akan curiga sampai rekap bulanan salah.

**Ususan perbaikan (deskriptif):** Urutkan kandidat hero berdasarkan (a) status `berjalan`, (b) jarak `tanggalMulai`/`tanggalSelesai` terhadap hari ini, (c) paling dekat dengan sekarang. Kalau tidak ada yang cocok, tampilkan empty state yang jujur ("Tidak ada event berjalan hari ini") daripada menunjuk event basi.

---

### [BUG-06] Angka total di dashboard mencampur event selesai dengan yang aktif — TINGGI

**Persona dan use-case:** Saya lihat 4 kartu angka besar: "Event Berjalan 3", "Total Penjualan Rp 25.555.000", "Total Pengeluaran Rp 11.360.000", "Saldo Akhir Rp 36.670.000". Saya mau tahu posisi kas event yang sedang saya pegang.

**Langkah reproduksi:**
1. Buka `#/dashboard`, catat 4 angka di `.stat-num`.
2. Hitung ulang penjualan dan saldo per status lewat `store.financeSummary`.
3. Bandingkan dengan angka di kartu.

**Harapan:** Ada angka yang bisa dipercaya sebagai "posisi kas event yang sedang berjalan", atau minimal ada filter/penjelas.

**Kenyataannya:** Ketiga angka uang menjumlahkan **semua** event tanpa kecuali — termasuk 2 event `selesai`, 1 `disetujui`, 1 `diajukan`. Kartu "Event Berjalan" menulis 3, tapi angka di sebelahnya bukan milik 3 event itu.

**Evidence:**
```
berjalan   n=3 penjualan=8055000  saldo=13000000 danaAwal=8700000
draft      n=2 penjualan=0       saldo=0        danaAwal=0
selesai    n=2 penjualan=9000000  saldo=13850000 danaAwal=8000000
diajukan   n=1 penjualan=0       saldo=1250000  danaAwal=1800000
disetujui  n=1 penjualan=8500000  saldo=8570000  danaAwal=3500000
TOTAL (semua event) penjualan=25555000 pengeluaran=11360000 saldo=36670000
4 statCard dashboard: 3 | Rp 25.555.000 | Rp 11.360.000 | Rp 36.670.000
subtitle: Event Berjalan | dari 9 total | Total Penjualan | semua event | ...
```
Penjualan event yang benar-benar `berjalan` hanya **Rp 8.055.000**. Selisih **Rp 17.500.000** datang dari event yang sudah selesai atau tinggal menunggu approval. Subtitle "semua event" memang jujur, tapi tidak ada filter atau rincian untuk memecahkannya.

Catatan tambahan: setelah saya hapus 1 transaksi (BUG-03), kartu turun ke `Rp 25.375.000` / `Rp 36.490.000` — perubahan Rp 180.000 dari satu klik, tanpa jejak audit.

**Dampak ke pengguna awam:** Untuk bendahara yang perlu menjawab "kas event Bali sekarang berapa" dari dashboard, angka Rp 36.670.000 itu menyesatkan. Saya akan turun ke tiap event satu per satu buat cek ulang — persis pekerjaan yang seharusnya dihemat oleh dashboard.

**Usulan perbaikan (deskriptif):** Kalau memang ingin menampilkan total semua event, beri pengaman visual yang jelas (label "Gabungan semua event" atau rincian per status yang bisa dibuka). Kalau tidak, defaultkan ke event yang sedang berjalan dengan opsi "Lihat gabungan semua event" sebagai sekunder. Angka di bawah "Event Berjalan" sebaiknya memakai scope yang sama.

---

### [BUG-07] Tidak ada tombol "Duplikat Event" di seluruh aplikasi — SEDANG

**Persona dan use-case:** Saya punya pola event yang mirip — "Bazar Ramadan" dan "Pesta Rakyat" struktur dan daftarnya sama, cuma lokasi dan tanggal beda. Saya harus buat satu per satu dan isi manual semua field.

**Langkah reproduksi:**
1. Dari `#/events`, klik `+ Buat Event Baru`.
2. Isi form event baru dari nol.
3. Ulangi untuk event berikutnya yang strukturnya sama.

**Harapan:** Ada tombol "Duplikat" di halaman detail atau di menu kartu, sehingga saya tinggal mengganti nama, lokasi, dan tanggal.

**Kenyataannya:** Saya harus buat manual. Saya scan seluruh `data-action` di 8 halaman dan tidak ada satu pun aksi duplikat/salin/clone.

**Evidence:**
```
#/events        -> 31 elemen data-action
#/dashboard     -> 22
#/archive       -> 30
#/events/evt-1  -> 148 elemen, 36 jenis aksi unik
#/products      -> 26   #/master -> 49   #/reports -> 31   #/settings -> 30
aksi level event yang tersedia: event:edit, event:delete  (hanya 2)
=> tidak ada satu pun aksi duplikat/salin di 8 halaman
```

**Dampak ke pengguna awam:** Saya yang punya 10 event tahu bahwa membuat satu event dari nol itu mahal. Kalau saya lupa satu field (misal `peranPic`), saya baru sadar setelah event berjalan — dan saya baru ingat kalau event itu muncul di daftar dan kelihatan "aneh". Duplikasi seperti ini akan mengurangi salah input secara drastis.

**Usulan perbaikan (deskriptif):** Tambahkan `event:duplicate` di header event (`evHead`) — salin seluruh field event menjadi record baru berstatus `draft`, tanpa menyalin penjualan/keuangan/prep item. Kalau terlalu invasif, alternatif murah: pre-fill form dengan default yang lebih berguna, misalnya `peranPic` = PIC terakhir yang dipakai, dan `jenis` = "Booth Pameran".

---

### [BUG-08] Tidak ada cara mengarsipkan, menyembunyikan, atau menyematkan event lama — SEDANG

**Persona dan use-case:** Daftar saya membludak. Saya punya beberapa event selesai dari Januari dan beberapa yang sudah dibatalkan. Saya mau sembunyikan, bukan hapus.

**Langkah reproduksi:**
1. Buka `#/events`, periksa setiap kartu untuk tombol arsip/sembunyikan/pin.
2. Buka `#/events/ev-d6`, periksa header event.

**Harapan:** Ada opsi "Arsipkan" supaya event selesai tersembunyi dari daftar utama tapi tetap bisa dicari.

**Kenyataannya:** Tidak ada. Yang tersedia hanya `Edit event` dan `Hapus event` — dan `Hapus` tidak jalan (BUG-02).

**Evidence:**
```
tombol di header event : Edit event[event:edit] | Hapus event[event:delete]
ada tombol "duplikat"? : 0
ada tombol arsip/sembunyikan? : 0
kunci berlabel trash/arsip di DB : TIDAK ADA
=> organizers TIDAK bisa Membersihkan daftar event lama
```
Catatan: karena Hapus mati, saya benar-benar tidak punya cara merapikan 17 event. Satu-satunya "halaman bersih" adalah Arsip, tapi isinya duplikat dengan daftar event (BUG-09).

**Dampak ke pengguna awam:** Setiap pagi saya scroll melewati event yang sudah selesai sebelum sampai ke event aktif, dan tidak ada opsi untukrw membersihkannya maupun menghapus. Saya cenderung membuka Excel di samping aplikasi.

**Usulan perbaikan (deskriptif):** Tambahkan field `arsip` (boolean) di record event, di-set lewat tombol di header, dan default-exclude dari daftar utama tapi tetap bisa dicari lewat Arsip. Ini jauh lebih murah daripada Hapus dan sesuai kebutuhan "sembunyikan yang lama, jangan hilangkan".

---

### [BUG-09] Filter status di daftar hanya 4 dari 6 status yang dipakai aplikasi — SEDANG

**Persona dan use-case:** Saya mau lihat hanya event yang "diajukan" — yang nunggu approval atasan. Saya klik chip satu per satu.

**Langkah reproduksi:**
1. Buka `#/events`, klik chip `Draft`, lalu `Berjalan`, lalu `Selesai`.
2. Cari cara melihat `diajukan`.

**Harapan:** Filter yang mencakup semua status yang ada di aplikasi — minimal 6.

**Kenyataannya:** Hanya ada 4 chip: `Semua`, `Draft`, `Berjalan`, `Selesai`. Chip untuk `diajukan`, `disetujui`, dan `dibatalkan` tidak ada. Event dengan status itu hanya terlihat di `Semua`, tercampur dengan 8 event lain.

**Evidence:**
```
chip tersedia: Semua | Draft | Berjalan | Selesai
klik "Draft"    -> kartu=2 : Gelar UMKM Kota 2026 ; Sosialisasi UMKM Kota
klik "Berjalan" -> kartu=3 : Pameran UMKM Nusantara ; Expo Produk Lokal ; Kunjungan Mitra Sektor
klik "Selesai"  -> kartu=2 : Bazar Ramadan Ceria 2026 ; Pekan Inovasi Daerah
chip untuk diajukan/disetujui/dibatalkan: TIDAK ADA (0 dari 3)
event yang stuck di "Semua": ev-d2(diajukan), ev-d5(disesetujui)
```
Catatan: status `diajukan` juga **tidak bisa dipilih** saat membuat event (form hanya punya 4 opsi: draft/berjalan/selesai/dibatalkan). Saya berakhir membuat event dengan status kosong, yang:
```
coba buat dengan status="diajukan" -> status tersimpan = "" (Kosong!)
event dengan status KOSONG : 1 -> "Rapat KOOLOBI 2027"
kartu di daftar : Rapat KOOLOBI 2027Bogor · 2027-01-10 → 2027-01-12● Progress0%PenjualanRp 0SaldoRp 00%
```
Event berstatus kosong ini juga hilang dari dashboard dan tidak bisa difilter di halaman mana pun.

**Dampak ke pengguna awam:** Banyak orang awam akan mengira aplikasinya cuma punya 4 status. Padahal ada event `disetujui` (semua approval lengkap, siap jalan) dan saya tidak bisa memfilternya untuk melihat mana yang sudah clear. Event tanpa status — badge cuma menampilkan `●` — akan terlihat seperti belum terkategori.

**Usulan perbaikan (deskriptif):** Tambahkan chip untuk semua status yang dikenal (`draft`, `diajukan`, `berjalan`, `disetujui`, `selesai`, `dibatalkan`). Kalau ruang layar terbatas, jadikan satu dropdown dengan label Bahasa yang jelas. Batasi `event:save` agar status tidak boleh kosong.

---

### [BUG-10] Halaman "Arsip" adalah satu-satunya tempat yang punya pencarian — tapi isinya bukan arsip — SEDANG

**Persona dan use-case:** Saya ingat ada event di Solo tapi tidak ingat namanya. Saya buka halaman event, tidak ada kotak pencarian, jadi saya harus scroll semua kartu satu per satu.

**Langkah reproduksi:**
1. Buka `#/events`, cari kotak pencarian.
2. Buka `#/archive`, cari kotak pencarian dan filter status.

**Harapan:** Halaman daftar event punya pencarian.

**Kenyataannya:** Halaman daftar event **tidak punya** input pencarian sama sekali. Kotak pencarian hanya ada di `#/archive` — dan halaman itu menampilkan **semua** event, termasuk yang sedang berjalan, bukan hanya riwayat.

**Evidence:**
```
input pencarian di halaman Event & Tugas : 0
jumlah kontrol filter arsip : 3 -> status(7 opsi), month(13 opsi), year(3 opsi)
cari "bazar" di Arsip -> 3 baris : Bazar Ramadan 2027 ; Bazar Dibatalkan ; Bazar Ramadan Ceria 2026
arsip difilter status=berjalan -> 4 baris (Pameran UMKM ; Expo Produk Lokal ; Kunjungan Mitra ; Bazar Ramadan 2027)
=> "Arsip" menampilkan event BERJALAN, bukan hanya riwayat
baris arsip : 17 dari total event 17
link ke #/archive dari halaman daftar event : 0
```
Catatan: urutan halaman Arsip DESC berdasarkan tanggal, sedangkan halaman daftar event ASC. Dua halaman menampilkan data yang sama dengan urutan berlawanan — sumber kebingungan yang nyata kalau saya-ingat "yang tadi di atas".

**Dampak ke pengguna awam:** Saya akan mengira aplikasi tidak punya fitur search, padahal ada di tempat yang tidak saya duga. Nama "Arsip" juga menyesatkan karena isinya bukan arsip — dan tidak ada link ke sana dari halaman daftar event, hanya dari nav atas yang kecil.

**Usulan perbaikan (deskriptif):** Tambahkan kotak pencarian di header halaman daftar event dengan logika sama seperti Arsip (nama + lokasi). Untuk halaman Arsip, pertimbangkan untuk tidak menampilkan event berjalan secara default atau ganti label jadi "Riwayat & Pencarian" supaya sesuai isinya.

---

### [BUG-11] Urutan hanya berdasarkan tanggal — event yang berjalan justru jauh di bawah — SEDANG

**Persona dan use-case:** Saya buka daftar event dan langsung klik baris pertama, mengira itu yang paling penting. Eh, itu event yang sudah selesai bulan lalu.

**Langkah reproduksi:**
1. Buat 8 event baru lewat UI sampai total 17 event.
2. Buka `#/events` dengan filter `Semua`.
3. Baca urutan dari atas ke bawah dan catat posisi tiap status.

**Harapan:** Event yang sedang berjalan tampil di atas atau di grup yang jelas; ada opsi urutkan menurut status/tanggal/nama.

**Kenyataannya:** Urutan **hanya** `tanggalMulai` ascending. Tidak ada kontrol sort sama sekali. Event yang sedang berjalan berada di baris 4, 5, 11, 12, 16, dan 17. Event selesai menduduki baris 3, 14, 15 — di atas yang sedang berjalan.

**Evidence:**
```
kartu total 17 | kontrol sort/urutkan : 0 (0 = tidak ada sama sekali)
pos 1/17  [draft]     (tanpa tanggal) "Pameran UMKM 2027"          <- event tanpa tanggal = PALING ATAS
pos 2/17  [draft]     (tanpa tanggal) "Marketplace rampingan"
pos 3/17  [selesai]   2026-03-02 "Bazar Ramadan Ceria 2026"          <- selesai, di atas yang jalan
pos 4/17  [berjalan]  2026-04-05 "Panggung Seni Kota"
pos 5/17  [berjalan]  2026-04-22 "Pameran UMKM Nusantara Expo 2026"
pos 11/17 [berjalan]  2026-09-14 "Expo Produk Lokal 2026"
pos 12/17 [berjalan]  2026-10-06 "Kunjungan Mitra Sektor"             <- yang benar-benar jalan, baris 12
pos 14/17 [selesai]   2026-12-01 "Pekan Inovasi Daerah"
pos 17/17 [berjalan]  2027-03-01 "Bazar Ramadan 2027"
```
Catatan tambahan: event tanpa `tanggalMulai` selalu dapat baris paling atas, di atas semua event yang sedang berjalan — padahal justru event yang belum jelas tanggalnya yang paling perlu saya periksa.

**Dampak ke pengguna awam:** Saya sering salah klik baris pertama. Karena tidak ada yang menandai "ini yang sedang jalan" dan tidak ada pengurutan lain, saya harus baca satu per satu setiap kali.

**Usulan perbaikan (deskriptif):** Tambahkan opsi urutan minimal tiga (status, tanggal, nama), dengan default yang mengutamakan `berjalan` di atas. Event tanpa tanggal sebaiknya diberi label "Belum ada tanggal" dan diletakkan paling bawah, bukan paling atas.

---

### [BUG-12] Halaman daftar memanjang tanpa batas — 17 event = 9,3 layar scroll — SEDANG

**Persona dan use-case:** Daftar saya sudah 17 event. Setiap pagi saya scroll panjang untuk cari yang aktif.

**Langkah reproduksi:**
1. Bangun 17 event lewat UI.
2. Buka `#/events` dengan filter `Semua`.
3. Hitung tinggi dokumen vs tinggi viewport.

**Harapan:** Ada paginasi, load-more, atau pengelompokan (misal running di atas, jadi punya grup "Riwayat").

**Kenyataannya:** Halaman merender semua event sekaligus, satu per satu, tanpa paginasi maupun pengelompokan.

**Evidence:**
```
9 event  : kartu=9  | tinggi dokumen 2133 px | viewport 441 px = 4.8 layar
10 event : kartu=10 | tinggi dokumen 3747 px = 8.5 layar
15 event : kartu=15 | tinggi dokumen 4498 px
17 event : kartu=17 | tinggi dokumen 4093 px | viewport 441 px = 9.3 layar
ada paginasi/load more/grouped? : 0
```
Pertumbuhan tinggi linear — akan terus membengkak seiring event berikutnya.

**Dampak ke pengguna awam:** Di HP, 9 layar scroll berarti banyak swipe. Tiap kartu juga padat (4 baris teks + progress bar + 3 angka), jadi lambat. Rasanya seperti "harus scroll jauh" setiap kali membuka app.

**Usulan perbaikan (deskriptif):** Tampilkan lebih dulu yang sedang berjalan/diajukan (maksimal 3–5 kartu), lalu grup "Riwayat" terpisah dengan tombol "Tampilkan semua". Alternatif murah: tambah pengelompokan per tahun dengan header sticky, jadi tidak perlu scroll melewati semua card.

---

### [BUG-13] Jebakan filter: filter yang aktif bertahan dan event baru langsung hilang dari daftar — SEDANG

**Persona dan use-case:** Saya sedang fokus ke event yang berjalan, filter chip "Berjalan" aktif. Di tengah jalan saya buat event baru. Setelah itu, event baru saya tidak ada di mana-mana.

**Langkah reproduksi:**
1. Buka `#/events`, klik chip `Berjalan` (3 kartu).
2. Klik `+ Buat Event Baru`, isi, status `draft`, `Simpan`.
3. Kembali ke `#/events`.
4. Periksa daftar event baru.

**Harapan:** Event baru yang baru dibuat langsung kelihatan, dan filter yang aktif kelihatan jelas sehingga saya tahu kenapa yang lain tidak tampil.

**Kenyataannya:** Filter masih `berjalan`. Daftar tetap 3 kartu. Event baru **tidak terlihat** di daftar maupun di dashboard. Baru muncul setelah saya klik `Semua`, dan itupun di posisi paling bawah.

**Evidence:**
```
filter="berjalan" -> kartu=3 : Pameran UMKM Nusantara ; Expo Produk Lokal ; Kunjungan Mitra Sektor
event baru dibuat: "Pameran Debog 2028" status=draft | total event di store: 10
kembali ke daftar: filter MASIH "berjalan" -> kartu=3
event baru kelihatan di daftar? false
di dashboard juga tidak kelihatan? true
setelah klik Semua -> kartu=10 | "Pameran Debog 2028" muncul di posisi 10
kembali dari Arsip ke daftar: filter="berjalan" (state bertahan lintas halaman)
```
Catatan: chip aktif memang diberi warna berbeda (`bg-ink text-white`), tapi tidak ada teks atau angka yang memberi tahu "3 dari 10 event ditampilkan". Dan tidak ada pengingat filter kalau daftar hasil filter kosong.

**Dampak ke pengguna awam:** Ini akan membuat saya mengira pembuatan event gagal, lalu membuat event duplikat. Untuk pengguna awam, "event saya kok hilang?" adalah pertanyaan yang sangat sering muncul di aplikasi dengan filter tersembunyi.

**Usulan perbaikan (deskriptif):** Tampilkan label aktif seperti "Menampilkan 3 dari 10 event" dengan tombol "Bersihkan filter", dan reset filter ke `semua` setiap kali event baru dibuat lewat UI. Kalau hasil filter kosong, tampilkan pesan yang menyebut filter yang aktif beserta cara membatalkan filter.

---

### [BUG-14] Tidak ada switcher event atau tombol pindah event di Layar Kerja — SEDANG

**Persona dan use-case:** Saya di dalam event Bali, baru selesai. Tidak sempat cek event Semarang. Saya harus cek satu-satu.

**Langkah reproduksi:**
1. Dari daftar, klik salah satu event untuk masuk Layar Kerja.
2. Cari dropdown/daftar event, tombol "event berikutnya", atau breadcrumb.
3. Klik nav `Event & Tugas`, lalu scroll untuk cari event yang lain.

**Harapan:** Ada dropdown kecil di header Layar Kerja untuk hop antar event tanpa keluar, atau breadcrumb yang bisa diklik.

**Kenyataannya:** Tidak ada. Layar Kerja punya 148 elemen interaktif (36 jenis aksi), tapi yang bisa diakses hanya `event:edit` dan `event:delete`. Nol dropdown event, nol tombol next/prev, nol breadcrumb.

**Evidence:**
```
total elemen ber-data-action : 139 | jenis aksi unik: 36
ada pemilih event (dropdown switcher) di layar kerja? : 0
tombol "event berikutnya/sebelumnya"? : 0
breadcrumb? : (tidak ada)
tombol kembali ke daftar dari layar kerja? : (tidak ada)
kembali ke daftar -> scrollY=0 (halaman 1 lagi, posisi scroll tidak dipulihkan)
cara pindah event dari dalam event: 0 dropdown switcher
```
Korea yang lebih menyebalkan: `app.js:106` menjalankan `window.scrollTo(0,0)` pada setiap `hashchange`. Jadi kalau saya sedang di baris ke-12 dari 17 lalu masuk event lalu kembali, saya mulai lagi dari paling atas.

**Dampak ke pengguna awam:** Untuk persona yang bolak-balik antar event, ini terutama 3–4 klik per perpindahan, dan daftar yang panjang harus di-scroll ulang tiap kali. Tidak ada jejak "terakhir dibuka" juga — lokalStorage hanya punya satu kunci `sppd_toolbox_db_v2`, tidak ada `lastOpenedEvent`.

**Usulan perbaikan (deskriptif):** Tambahkan dropdown compact di header Layar Kerja yang berisi daftar event berjalan (grouping per status), plus breadcrumb "Event & Tugas / Nama Event". Jangan reset scroll saat pindah hash — atau minimal simpan posisi scroll daftar sebelum masuk event.

---

### [BUG-15] Area klik pada kartu event hanya 2,5% — SEDANG

**Persona dan use-case:** Saya buka aplikasi sambil bawa tas, satu tangan. Saya klik kartu event — tidak terjadi apa-apa karena yang bisa diklik cuma teks judul.

**Langkah reproduksi:**
1. Buka `#/events`, ambil kartu pertama.
2. Hitung `getBoundingClientRect()` dari link judul dan dari kartu.

**Harapan:** Mengklik kartu di mana saja (kecuali tombol) membuka event-nya, atau ada tombol "Buka" yang jelas.

**Kenyataannya:** Yang bisa diklik hanya link teks di judul. 97,5% area kartu tidak responsif, dan cursor di area kartu tetap `auto` (tidak ada affordance bahwa ini bisa diklik).

**Evidence:**
```
kartu "Bazar Ramadan Ceria 2026"
link judul : 198x17 px = 3372 px2
kartu total: 725x185 px = 134125 px2
coverage area klik = 2.5%
cursor pada kartu (style cursor) : auto | link: pointer
ada tombol "Buka/Lihat" di kartu? 0
```
Catatan: tidak ada tombol sekunder di kartu sama sekali (0 `button` di dalam kartu) — jadi satu-satunya affordance adalah teks biru yang kecil.

**Dampak ke pengguna awam:** Di HP atau sambil memegang barang, saya akan sering meleset dan menggulir halaman alih-alih membuka event. Untuk pengguna awam, "`kok tidak terjadi apa-apa`" adalah bentuk frustrasi paling umum di daftar.

**Usulan perbaikan (deskriptif):** Jadikan seluruh kartu elemen yang bisa diklik (dengan handler `nav:go` dan `data-href`), tambahkan `cursor: pointer`, dan sertakan tombol sekunder "Buka" di kanan kartu untuk kejelasan. Pastikan area tombol hapus tidak ikut memicu navigasi.

---

### [BUG-16] Event `selesai` masih bisa diedit dan ditambah transaksi tanpa peringatan — SEDANG

**Persona dan use-case:** Saya membuka event yang sudah selesai tahun lalu karena mau lihat laporannya. Eh, semua form masih aktif dan tombol tambah penjualan masih bisa diklik.

**Langkah reproduksi:**
1. Buka `#/events/ev-d6` ("Pekan Inovasi Daerah", badge `✓ Selesai`).
2. Hitung elemen input/select yang aktif.
3. Cari peringatan read-only.

**Harapan:** Event yang sudah selesai seharusnya read-only, atau setidaknya ada peringatan sebelum menyimpan perubahan.

**Kenyataannya:** 139 elemen ber-`data-action` aktif, termasuk input qty penjualan dan tombol tambah pengeluaran. Tidak ada indications read-only sama sekali. Satu-satunya tanda adalah badge biru `✓ Selesai` di header.

**Evidence:**
```
ev-d6 (selesai) h1 : "Pekan Inovasi Daerah" badge=✓ Selesai
peringatan "read only"? : TIDAK ADA
jumlah input/select yang bisa diedit di layar kerja : 121
ada input qty penjualan? : 3 | tombol tambah pengeluaran? 1
```

**Dampak ke pengguna awam:** Tidak ada yang memperingatkan auditor saya akan mengira data tahun lalu sudah final karena statusnya "Selesai". Kalau saya tidak sengaja menambah transaksi ke sana, laporan tukar tahun itu jadi kacau — dan tidak ada jejak bahwa ada perubahan.

**Usulan perbaikan (deskriptif):** Untuk event berstatus `selesai`/`dibatalkan`, nonaktifkan input dan tombol tambah (atau minta konfirmasi eksplisit dengan label "Buka edit"). Setidaknya tampilkan banner di atas Layar Kerja: "Event ini sudah selesai. Edit masih diizinkan — perubahan akan tercatat."

---

### [BUG-17] Membuka halaman event menulis ke storage dan membuat record SPPD kosong — RENDAH

**Persona dan use-case:** Saya hanya mau lihat-lihat daftar event, tanpa mengubah apa pun. Data berubah sendiri.

**Langkah reproduksi:**
1. Mulai dari seed default dan catat isi `sppd`.
2. Buka `#/events` dan beberapa halaman event tanpa mengetik apa pun.
3. Catat ulang isi `sppd` dan ukuran `localStorage`.

**Harapan:** Membaca tidak mengubah data.

**Kenyataannya:** `store.getSppd(eventId)` membuat record SPPD baru **dan langsung menyimpannya** kalau belum ada (`store.js:384`), dan `financeSummary()` memanggilnya. Setiap event yang belum punya SPPD langsung mendapat satu record kosong permanen.

**Evidence:**
```
sppd total=11 event total=11 sppd orphan=0
placeholder SPPD kosong(dibuat otomatis, tanpa isian) : 4
contoh id sppd placeholder : spp-d1, id-muoi1f3a-5g, id-muoi1f9q-6z
ukuran localStorage : 63935 byte
kunci localStorage : sppd_toolbox_db_v2
```
Catatan ringan: `load()` juga menambahkan `checklistItems` untuk setiap event × setiap template (264 baris untuk 11 event), sehingga backup JSON cepat membengkak.

**Dampak ke pengguna awam:** Untuk Organizeer, tidak dramatIS — tapi kalau nanti ditambah multi-pengguna (GAS/Supabase), "buka halaman = tulis record" akan jadi sumber data dummy yang membingungkan.

**Usulan perbaikan (deskriptif):** Pisahkan `getSppd` read-only dari `getSppdOrCreate` yang dipakai saat form benar-benar disimpan. Record placeholder sebaiknya ditandai (misal `placeholder: true`) supaya tidak ikut dihitung sebagai SPPD terisi di laporan.

---

### [BUG-18] Satu event punya dua URL berbeda, dan judul tab tidak pernah berubah — RENDAH

**Persona dan use-case:** Saya buka beberapa tab untuk beberapa event sekaligus. Semua tab namanya sama, dan satu event punya dua "alamat".

**Langkah reproduksi:**
1. Dari dashboard, klik hero "Sedang berjalan" → catat URL.
2. Dari daftar event, klik event yang sama → catat URL.
3. Baca `document.title` di Layar Kerja.

**Harapan:** Satu event = satu URL, dan judul tab menyebut nama event.

**Kenyataannya:** Dashboard mengarahkan ke `#/events/evt-1/roadmap`, daftar ke `#/events/evt-1`. Keduanya merender 8 seksi identik, tapi `hashchange` plus pemanggilan `A.reload()` membuat render dua kali dan menambah `history.length` dua entry untuk satu klik. `document.title` tidak pernah diubah dari default.

**Evidence:**
```
link di hero dashboard : #/events/evt-1/roadmap
link di daftar untuk event yang sama : #/events/evt-1
setelah klik hero -> hash=#/events/evt-1/roadmap h1="Pameran UMKM Nusantara Expo 2026"
jumlah section psec: 8 (identik dengan halaman polos)
history.length = 15 setelah beberapa perpindahan
```
Catatan kecil: `A.reload()` dipanggil di setiap handler `nav:go`, sementara `hashchange` juga memanggil `render()`. Jadi setiap klik nav = dua render penuh.

**Dampak ke pengguna awam:** Kalau saya pakai Ctrl+Tab untuk bolak-balik antar event, semua tab bernama "SPPD Toolbox — Manajemen Tugas PIC" dan saya tidak bisa tahu mana yang mana. Tombol Back juga perlu dua kali untuk kembali ke posisi semula.

**Usulan perbaikan (deskriptif):** Set `document.title` jadi `Nama Event · SPPD Toolbox` di `render()`, dan hapus pemanggilan `A.reload()` yang redundan di `nav:go` (hashchange sudah memicu render). Backward-compatible URL tetap boleh, tapi jangan mengarahkan link internal ke URL legacy.

---

### [BUG-19] Kartu event tidak menampilkan jenis, peran PIC, atau catatan — event kosong nyaris identik — RENDAH

**Persona dan use-case:** Saya punya 4 event draft. Saya buka daftar dan keempatnya terlihat sama saja: 0%, Penjualan Rp 0, Saldo Rp 0.

**Langkah reproduksi:**
1. Buka `#/events` dengan filter `Semua`.
2. Bandingkan isi visual 4 kartu berstatus draft.

**Harapan:** Kartu menampilkan info pembeda (jenis tugas, peran PIC, atau satu baris catatan).

**Kenyataannya:** Kartu hanya berisi nama, lokasi, rentang tanggal, badge status, progress %, penjualan, dan saldo. Tidak ada jenis tugas, peran PIC, catatan, maupun jumlah item persiapan. Empat event draft tampil hampir identik.

**Evidence:**
```
event draft: 4
- Gelar UMKM Kota 2026 | Balai Kota, Bandung · 2026-05-16 → 2026-05-16 | Draft | 0% | Rp 0 | Rp 0
- Sosialisasi UMKM Kota | Jakarta · 2026-07-21 → 2026-07-21 | Draft | 0% | Rp 0 | Rp 0
- Pameran UMKM 2027 | Makassar · → | Draft | 0% | Rp 0 | Rp 0
- Pelatihan UMKM Src | Surabaya · 2026-05-20 → 2026-05-21 | Draft | 0% | Rp 0 | Rp 0
```
Catatan kecil: event tanpa tanggal menampilkan `" · → "` yang menggantung (`Makassar · →`) karena `pages.js:126` selalu mencetak pemisah dan tanda panah.

**Dampak ke pengguna awam:** Kalau dua event punya tanggal berdekatan, saya harus klik satu per satu untuk tahu mana yang mana. Untuk pengguna awam yang belum mengisi `peranPic`, seluruh draft terlihat "kosong dan sama".

**Usulan perbaikan (deskriptif):** Tambahkan satu baris kecil berisi `jenis` dan `peranPic` di kartu, plus jumlah item persiapan yang sudah dibawa. Untuk tanggal kosong, tampilkan teks "Tanggal belum diisi" alih-alih `" · → "`.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Tidak ada kontaminasi data antar event di lapisan store.** Saya verifikasi angka per event satu per satu dan semuanya terpisah: `evt-1` danaAwal 2.500.000 / sales 3.480.000 / budget 2.850.000 / prep 3 / ms 5; `ev-d3` 4.000.000 / 4.575.000 / prep 2; `ev-d6` 5.000.000 / 9.000.000; sedangkan 4 event yang saya buat lewat UI semuanya `danaAwal=0 sales=0 saldo=0 prep=0 eps=0`. Tidak ada satu pun angka yang bocor. Semua accessor store menyaring `eventId` dengan benar.
- **Tidak ada ID event yang di-hardcode di renderer.** `grep` terhadap `evt-1|ev-d1|currentEvent|activeEvent` di `pages.js`, `pages2.js`, `actions.js`, dan `app.js` nihil. Ini penting untuk multi-event dan sering jadi sumber bug di aplikasi lain.
- **Hipotesis "tidak bisa buka event dari daftar" SALAH.** Klik link judul dari daftar bekerja sempurna: `hash=#/events/evt-3`, `h1="Bazar Ramadan Ceria 2026"`, 8 section `.psec` ter-render. Delegasi `data-action="nav:go"` jalan benar.
- **Hipotesis "tidak bisa di-bookmark" SALAH.** Hash routing rapi: `#/events/ev-d4` yang diketik langsung membuka "Kunjungan Mitra Sektor" dengan badge `● Berjalan` dan subjudul "Semarang · 2026-10-06 → 2026-10-08". URL yang ngawur (`#/events/evt-999`) dialihkan rapi ke daftar tanpa error.
- **Hipotesis "event selesai tercampur dengan yang aktif di dashboard" SALAH untuk kartu.** Section "Event berjalan" hanya berisi 3 event berstatus `berjalan`; yang `draft` dipisah di blok "Disipelagoan (draft)". Yang selesai tidak masuk ke mana pun. Pencampuran hanya terjadi di 4 kartu angka total (BUG-06).
- **Chip filter status benar-benar bekerja** untuk status yang ada: `Draft` → 2 kartu, `Berjalan` → 3, `Selesai` → 2, `Semua` → 9. persistently diuji setelah re-render.
- **Filter halaman Arsip lengkap dan berfungsi**: status (7 opsi termasuk `diajukan`/`disetujui`/`dibatalkan`), bulan (13), tahun (3), dan pencarian teks yang benar-benar menyaring ("bazar" → 3 baris).
- **Event baru selalu punya 5 milestone default** (`ensureDefaultMilestones`), jadi Layar Kerja tidak pernah kosong total.
- **Routing dan guard aman**: `location.hash = '#/events'` saat ID tidak ditemukan, tanpa exception.

## Pertanyaan terbuka / perlu konfirmasi

- **`deleteEvent` tidak menghapus `checklistItems`.** Dari kode (`store.js:366-379`) ia memfilter `events, sppd, transports, eventProducts, sales, expenses, milestones, kasAdj, danaCair, prepItems` — tapi tidak `checklistItems`. Saya tidak bisa membuktikannya lewat UI karena tombol Hapus mati (BUG-02), jadi saya tandai **perlu konfirmasi** setelah BUG-02 diperbaiki.
- **Status `diajukan` dan `disetujui`perlu konfirmasi**: apakah ini status yang merupakan status resmi yang dirancang (artinya form event harus punya opsinya), atau hanya sisa dummy seed yang tidak pernah dihasilkan UI sama sekali? Ini menentukan apakah BUG-01 diperbaiki dengan menambah opsi dropdown atau dengan membersihkan `STATUS_MAP`.
- **Catatan: `#nav-chips` tidak menampilkan total event ketika ada event berjalan.** Saya menduga ini disengaja untuk menghemat ruang, tapi jadi membingungkan saat event banyak.
- **Prioritas "Event berjalan" pada daftar** perlu konfirmasi produk: apakah urutan default memang harus tanggal naik, atau sudah direncanakan ada pengelompokan status? Tidak ada catatan di `SPESIFIKASI.md` maupun `CHANGELOG.md` yang menyebut sort.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Membuka event dari daftar | 4 | Klik link judul bekerja dan cepat, tapi hanya 2,5% area kartu yang bisa diklik (BUG-15) dan tidak ada tombol "Buka". |
| Membuka event via URL / bookmark | 4 | Hash routing rapi dan deep link selalu benar; hanya title tab tidak berubah (BUG-18). |
| Memahami event mana yang sedang aktif | 1 | Hero dashboard menunjuk event yang lewat 5 bulan (BUG-05) dan 4 dari 9 event tidak terlihat sama sekali (BUG-04). |
| Mencari event tertentu | 2 | Tidak ada pencarian di halaman daftar (BUG-10); harus ke Arsip yang tidak khusus. |
| Membedakan status antar event | 2 | Hanya 4 dari 6 status bisa difilter (BUG-09), dan dua status resmi hilang saat edit (BUG-01). |
| Merapikan daftar event lama | 1 | Tidak ada arsip/sembunyikan (BUG-08) dan Hapus tidak berfungsi (BUG-02). |
| Melihat posisi kas per event | 2 | Angka di dashboard tercampur semua status tanpa filter (BUG-06); harus turun ke tiap event. |
| Bertindah antar event dari dalam event | 2 | Tidak ada switcher maupun breadcrumb (BUG-14), scroll di-reset tiap pindah halaman. |
| Panjang halaman daftar | 2 | 17 event = 9,3 layar scroll tanpa paginasi atau grup (BUG-12). |
| Keamanan data keuangan saat salah klik | 1 | Hapus transaksi jalan tanpa konfirmasi maupun undo (BUG-03). |
| Kecepatan render daftar | 4 | 17 event = 148 elemen interaktif di Layar Kerja, render terasa normal; bottleneck-nya panjang halaman, bukan performa. |
| Kontaminasi data antar event | 5 | Tidak ditemukan sama sekali di lapisan store maupun renderer; angka tiap event benar-benar terpisah. |
| **Rata-rata** | **2,4** | Fondasi datanya bagus, tapi lapisan "peta event" untuk organizer masih sangat underdeveloped. |
