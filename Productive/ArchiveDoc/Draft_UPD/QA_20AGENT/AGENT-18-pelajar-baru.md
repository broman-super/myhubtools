# AGENT-18 — Pelajar / Magang Baru

> **Persona:** Mahasiswa magang di Dinas UMKM, baru 2 minggu pakai tool ini, sering salah paham istilah dan tidak berani menebak - **Fokus:** Halaman Panduan, tooltip, dan discovery mandiri tanpa bantuan - **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 7 |
| SEDANG | 5 |
| RENDAH | 2 |
| **Total** | **14** |

Kesimpulan: isi Panduan sebenarnya cukup jujur dan beberapa klaimnya benar (8 seksi memang ada, checkbox "Tampilkan realisasi" memang ada, tombol cetak memang di seksi 06 dan 08). Masalah saya bukan isinya salah, tapi (a) tidak ada cara mencari dan tidak ada glosarium di halaman yang isinya 892 kata dalam 1 kartu setinggi 2169 px (kira-kira 5 layar laptop), (b) penomoran FAQ rusak - "9b." muncul mendahului pertanyaan "1." dan tidak ada "9a", (c) ada tiga tempat yang mengarahkan saya mengisi status SPPD secara diam-diam, dan itulah yang paling sering bikin panik: saya isi SPPD, klik "Simpan SPPD", lalu dengan tenang approval saya berubah dari "Disetujui" jadi "Draft" tanpa ada pesan apa pun. (d) Kaki halaman (footer) masih bicara tentang "3 tab: Roadmap / Persiapan / Uang & Laporan" padahal di layar tidak ada satu pun tab, dan Dashboard bahkan masih menautkan URL lama `/roadmap`. Masalah tambahan: tidak ada satupun tooltip (`title=`) di 9 rute yang saya uji, dan tidak ada satu pun cara bertanya atau minta bantuan.

## Environment yang dipakai

- Edge headless (`--headless=new --dump-dom`), profil unik `%TEMP%\opencode\prof_a18` dan `prof_a18c`.
- `localStorage.clear()` plus hapus key `sppd_toolbox_db_v1` dan `sppd_toolbox_db_v2` dijalankan lebih dulu dengan profil yang sama, lalu seed default dipakai ulang. Hasil: 9 event, `events()[0].id = evt-1` ("Pameran UMKM Nusantara Expo 2026").
- Rute yang diuji: `#/dashboard`, `#/events`, `#/archive`, `#/products`, `#/master`, `#/reports`, `#/settings`, `#/guide`, `#/events/evt-1`, plus URL legacy `#/events/evt-1/roadmap` dan `#/events/evt-1/persiapan`, dan satu event kosong yang saya buat sendiri.
- Harness: `_QA_TMP/a18_probe.html`, `a18_probe3.html`, `a18_probe4.html`, `a18_probe5.html`, `a18_clear.html`, runner `a18_run.ps1`. Semua hasil ditulis ke `<pre id="out">` lalu dibaca dari `--dump-dom`.
- Tidak ada file aplikasi yang saya ubah (read-only). Perubahan data hanya terjadi di salinan localStorage browser uji.

## Temuan

### [BUG-01] Dropdown "Status Alur" SPPD tidak menampilkan status yang tersimpan, dan "Simpan SPPD" mengubahnya diam-diam — TINGGI
**Persona dan use-case:** Saya mengisi seksi 01 untuk event yang SPPD-nya sudah disetujui atasan, lalu klik "Simpan SPPD" karena mau menambah catatan. Saya mengira tidak ada yang berubah.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Lihat `<select id="spp-status">` di kartu "Surat Perjalanan Dinas".
3. Tekan tombol "Simpan SPPD" tanpa mengubah apa pun.
4. Perhatikan baris cek di hero "Progres persiapan".

**Harapan:** Dropdown menampilkan status yang sedang tersimpan, dan tombol Simpan tidak mengubah apa pun yang tidak saya sentuh.

**Kenyataannya:** Dropdown selalu menampilkan "Draft" sebagai pilihan aktif, padahal status sebenarnya "disetujui". Setelah "Simpan SPPD" ditekan, status benar-benar berubah jadi `draft`, dan centang hijau di hero berubah jadi bulatan kosong - tanpa toast, tanpa peringatan.

**Evidence:**
- `data SPPD evt-1 di store : status=disetujui | danaAwal=2500000`
- `isi <select id="spp-status"> yang tampil : Draft [SELECTED] / Diajukan / Disetujui / Selesai`
- `data SPPD evt-1 setelah Simpan : status=draft`
- hero sebelum: `SPPD lengkap [centang] - Produk dicatat [centang] - Item persiapan dibawa [bulat] - Saldo aman [centang] - Siap berangkat [bulat] - Pulang tuntas [bulat]`
- hero sesudah: `SPPD lengkap [bulat] - Produk dicatat [centang] - Item persiapan dibawa [bulat] - Saldo aman [centang] - Siap berangkat [bulat] - Pulang tuntas [bulat]`
- Sumber: `js/pages.js:471` - `<select id="spp-status">` tidak punya atribut `selected` yang mengikuti `s.status`, berbeda dari form event yang memakai JS (`js/pages.js:165`).

**Dampak ke pengguna awam:** Ini skenario yang paling mungkin terjadi pada magang: buka event, isi satu field, klik Simpan. Approval yang sudah sah tiba-tiba hilang dari tampilan, dan saya baru sadar jauh-jauh waktu mau menyetor laporan. Tidak ada cara melihat "status ini tersimpan otomatis" selain mengira-nebira.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** render opsi status SPPD dengan menandai opsi yang cocok dengan `s.status` sebagai terpilih; kalau status di luar daftar, tampilkan opsi "(tidak dikenal)" dan jangan diam-diam menyimpan ulang. Tambahkan satu kalimat kecil di bawah dropdown: "Status ini sama dengan badge di atas halaman." Tambahkan jawaban FAQ di Panduan: "Kenapa status SPPD saya berubah sendiri setelah Simpan?"

---

### [BUG-02] Ada DUA daftar status berbeda, dan Panduan tidak menjelaskannya sama sekali — TINGGI
**Persona dan use-case:** Saya bingung melihat status event di daftar Event ("Berjalan") berbeda dengan status SPPD ("Disetujui"), dan tidak tahu mana yang dipakai Dashboard.

**Langkah reproduksi:**
1. Baca Panduan FAQ 2: "isi nama, lokasi, tanggal, status".
2. Baca Panduan FAQ 3: "Alur status: Draft - Diajukan - Disetujui - Selesai".
3. Buka form "Buat Event Baru", lihat pilihan status.
4. Buka seksi 01 event mana pun, lihat "Status Alur" SPPD.
5. Buka form "Edit Event" untuk event `ev-d2` (status aslinya "diajukan").

**Harapan:** Panduan menjelaskan bahwa status Event dan status SPPD itu dua hal berbeda, dan mana yang dipakai filter atau Dashboard.

**Kenyataannya:** Dua daftar status berbeda muncul berdampingan tanpa penjelasan, dan form Edit Event menampilkan dropdown KOSONG untuk event yang statusnya di luar daftar form. Setelah "Simpan Perubahan", status event jadi string kosong dan badge di daftar Event hanya menampilkan satu titik tanpa teks.

**Evidence:**
- Panduan FAQ 3 (kutipan persis): `Alur status: Draft -> Diajukan -> Disetujui -> Selesai.`
- `select status di seksi 01 SPPD: Draft / Diajukan / Disetujui / Selesai`
- `form "+ Event Baru" -> select status : Draft [SELECTED] / Berjalan / Selesai / Dibatalkan`
- `status event di store : evt-1=berjalan, evt-2=draft, evt-3=selesai, ev-d1=draft, ev-d2=diajukan, ev-d3=berjalan, ev-d4=berjalan, ev-d5=disetujui, ev-d6=selesai`
- `form Edit event tsb -> nilai select#ev-status : "" | selectedIndex=-1`
- `opsi yang tampil: "Draft", "Berjalan", "Selesai", "Dibatalkan"` (tidak ada yang aktif)
- `setelah "Simpan Perubahan" -> status di store = ""`
- `badge status di daftar Event: ... "● Berjalan" , "● Draft" , "● Draft" , "●" , "● Berjalan" ...` - event `ev-d2` berubah jadi badge titik saja tanpa teks
- Sumber: `js/pages.js:157` hanya punya 4 opsi; `js/pages.js:165` berisi `sel.value = ev.status` sehingga status yang tidak dikenal membuat `selectedIndex = -1`.

**Dampak ke pengguna awam:** Hampir saya kembalikan seluruh data karena mengira data saya rusak. Selain itu saya mengira menandai event "Diajukan" akan membuatnya muncul di Dashboard - padahal Dashboard cuma menghitung `status === 'berjalan'` (`js/pages.js:44`), jadi mustahil. Saya jadi salah paham selama berhari-hari.

**Usulan perbaikan (deskriptif):** satu FAQ baru bertipe "Apa bedanya status Event dan status SPPD?" dengan tabel kecil 2 kolom. Samakan kosakata status (pakai "Diajukan/Disetujui" untuk event juga, atau hapus status event yang tidak punya arti). Pastikan form Edit selalu punya opsi terpilih; kalau tidak, tampilkan peringatan "status lama tidak dikenal, pilih ulang".

---

### [BUG-03] Penomoran FAQ kacau: "9b." mendahului pertanyaan "1.", tidak ada "9a", tidak ada daftar isi — TINGGI
**Persona dan use-case:** Saya membuka Panduan karena salah klik, lalu mengira sudah sampai bagian bawah karena langsung melihat angka besar "9b", lalu menggulir ke bawah untuk membaca nomor 1 ke atas.

**Langkah reproduksi:**
1. Buka `#/guide`.
2. Baca urutan semua `<h3>` dari atas.

**Harapan:** Nomor pertanyaan naik 1 sampai 12 berurutan, ada daftar isi atau pencarian supaya saya bisa melompat ke pertanyaan tertentu.

**Kenyataannya:** Pertanyaan bernomor "9b." berada di posisi ke-3 (sebelum nomor 1), tidak ada "9a" sama sekali, dan tidak ada daftar isi, pencarian, maupun anchor - padahal kartunya setinggi 2169 px di viewport 441 px (kira-kira 5 layar scroll).

**Evidence:**
- `posisi 1: "Peta Menu - 8 halaman"`
- `posisi 2: "Keterhubungan Data"`
- `posisi 3: "9b. Bagaimana alokasi rinci tersinkron dengan kas?"`
- `posisi 4: "1. Sistem ini untuk apa?"` ... `posisi 15: "12. Kenapa ada "Prototype" di pojok?"`
- `nomor terbaca berurutan: - | - | 9b | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12`
- `LOMPATAN NOMOR: "9b" (posisi 3) -> "1" (posisi 4)`
- `ada nomor "9a"? false` dan `jumlah pertanyaan bernomor (1..N): 12`
- `jumlah anchor internal (daftar isi) : 0`
- `heading yang punya id (bisa ditaut dari daftar isi): 0`
- `jumlah <details> (accordion) : 0`
- `total tinggi kartu: 2169px di viewport 441px`
- Sumber: `js/pages2.js:827` untuk blok "9b."

**Dampak ke pengguna awam:** Saya menyimpulkan dokumennya rusak atau terpotong, berhenti mempercayai halaman Panduan, lalu ChallengerMenebak sendiri tanpa panduan. Ini hasil yang paling tidak diinginkan untuk halaman yang jadi satu-satunya sumber belajar.

**Usulan perbaikan (deskriptif):** ubah blok "9b." menjadi bagian bernomor normal (misalnya bagian 3 "Keterhubungan Data" dengan sub-bagian 3a dan 3b, atau FAQ bernomor 13-14 di akhir). Tambahkan daftar isi di atas (15 link ke 15 heading) dan beri `id` pada tiap heading. Pertimbangkan accordion per pertanyaan supaya tidak butuh 5 layar gulir.

---

### [BUG-04] Tidak ada glosarium, padahal UI penuh istilah yang tidak pernah dijelaskan — TINGGI
**Persona dan use-case:** Saya mencari arti "wallet", "Aset Jual", "Aset dan Alat", "Komponen", "Cek Persiapan", dan "Audit Aset" - tidak ada satu pun yang dijelaskan di Panduan.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, catat semua istilah di judul seksi dan kartu.
2. Buka `#/guide`, cari satu per satu di teks Panduan.

**Harapan:** Ada kamus istilah (bisa berupa tabel) yang memetakan istilah UI ke artinya.

**Kenyataannya:** Istilah yang tampil besar di layar tidak ada di Panduan. Saya akhirnya klik-klik untuk menebak-nebak.

**Evidence:**
- Kutipan judul seksi di Layar Kerja: `Produk & Qty (Aset Jual)`, `Item Persiapan (Aset & Alat)`, `Cross-check Berangkat/Pulang`, `Uang - Pengeluaran & Penyesuaian`
- Di Panduan: `TIDAK "Aset Jual"`, `TIDAK "Aset & Alat"`, `TIDAK "Aset"`, `TIDAK "Cek Persiapan"`, `TIDAK "Audit"`, `TIDAK "dompet"`, `TIDAK "template"`, `TIDAK "Peran PIC"`
- Kartu/judul di Layar Kerja yang tidak disebut di Panduan: `Cek Persiapan`, `Surat Perjalanan Dinas`, `Pilih Item dari Master Barang`, `Konfirmasi Item Pilihan`, `Tambah Transaksi`, `Riwayat Transaksi`, `Catat Pengeluaran`, `Daftar Pengeluaran`, `Penyesuaian Kas`, `Audit Aset Berangkat & Pulang`, `Rekap Item Persiapan`, `Alokasi & Realisasi per Wallet Tujuan`, `Bandingkan SPPD vs Realisasi vs Penjualan`, `Rekap Penggunaan Uang`
- Kata "wallet" hanya muncul sebagai daftar nama di Panduan: `Tiap transaksi bisa dibedakan per wallet (Bank, QRIS, Kas, E-Money)` - tidak pernah dijelaskan itu apa. Padahal UI menyebut hal yang sama dengan "dompet": `Tentukan juga wallet tujuan - dana alokasi ini akan masuk ke dompet mana` dan `Alokasi ini dicatat ke dompet ini saat dana dipakai` (`js/pages.js:424` dan `js/pages.js:450`).
- Sumber: blok Panduan (`js/pages2.js:810`) memang tidak punya tabel apa pun (`<table> = 0`, `<dl>/<dt>/<dd> = 0`).

**Dampak ke pengguna awam:** Saya mengisi data dengan asumsi sendiri (misalnya saya kira "Aset" sama dengan "stok dagangan"), lalu angkanya tidak cocok dengan Klingkungan atasan. Karena tidak berani menebak, saya justru menunda pekerjaan.

**Usulan perbaikan (deskriptif):** tambah bagian "Kamus Istilah" (glosarium) di awal Panduan: tabel 2 kolom Istilah / Artinya, isi minimal: Event, SPPD, Dana Awal, Dana Cair, Realisasi, Alokasi/Komponen, Wallet, Milestone, Cek Persiapan, Aset Jual, Aset dan Alat, Cross-check, Penyesuaian Kas, Rekap, Arsip, Cetak. Pilih satu istilah baku (misalnya "Wallet (dompet)") supaya UI dan Panduan konsisten.

---

### [BUG-05] Nol tooltip dan nol bantuan inline di seluruh aplikasi — TINGGI
**Persona dan use-case:** Saya berhenti di kata yang tidak saya kenal (misalnya "oversold", "dombel hitung", "rekap keuangan-selesai") dan tidak ada cara melihat artinya tanpa pergi ke halaman lain.

**Langkah reproduksi:**
1. Kunjungi 9 rute utama.
2. Hitung elemen beratribut `title` (tooltip bawaan browser) per rute.

**Harapan:** Istilah teknis punya tooltip atau teks penjelasan kecil di tempatnya muncul.

**Kenyataannya:** 0 elemen ber-`title` di seluruh 9 rute. Dua-satunya `title=` yang ada di seluruh kode hanya berada di dalam kartu "Pilih Item dari Master Barang", dan hanya muncul setelah item dicentang. Beberapa kalimat teknis yang sulit dimengerti justru berdiri tanpa penjelasan.

**Evidence:**
- `#/dashboard -> 0 elemen ber-title`, `#/events -> 0`, `#/archive -> 0`, `#/products -> 0`, `#/master -> 0`, `#/reports -> 0`, `#/settings -> 0`, `#/guide -> 0`, `#/events/evt-1 -> 0`
- Teks yang muncul tanpa penjelasan:
  - `Badge = rekap keuangan-selesai saat tidak oversold.` (`js/pages2.js:466`)
  - `Total realisasi tidak menjumlahkan E-Money agar tidak dobel hitung (sudah di pos kategori).` (`js/pages2.js:498`)
  - `Wallet E-Money dihitung nilai yang dibayar dari e-money agar saldo bank/kas/QRIS tetap terjaga.` (Panduan, blok 9b)
  - `Setiap input kas menambal realisasi komponennya secara otomatis` - istilah "menambal" tidak pernah dijelaskan
- Sumber `title=` yang ada di kode: `js/pages2.js:574` (`"Sudah tercatat di Item Persiapan event ini"`) dan `js/pages2.js:598` (`"Buang dari pilihan"`)
- Tidak ada tombol "?" atau Bantuan di header maupun halaman mana pun; header `index.html` hanya berisi logo, nav, dan `#nav-chips`.

**Dampak ke pengguna awam:** Setiap istilah baru berarti saya harus menebak atau berhenti bekerja. Untuk magang yang tidak berani salah, ini alasan utama tugas tidak selesai.

**Usulan perbaikan (deskriptif):** tambah tooltip singkat (`title` atau `aria-describedby`) pada istilah teknis: "oversold", "E-Money", "wallet", "Operasional Lain", "Komponen", "Realisasi", "Penyesuaian Kas", "Audit". Tambahkan tombol "?" kecil di header atau di tiap seksi yang melompat ke bagian Kamus Istilah di Panduan. Ubah kalimat "menambal" menjadi "mengisi otomatis".

---

### [BUG-06] Halaman Panduan tidak bisa dicari, padahal halaman Arsip punya "Cari kata" — SEDANG
**Persona dan use-case:** Saya tahu jawabannya pasti ada di Panduan, tapi tidak tahu kata kuncinya, jadi harus ctrl+F di browser - di HP tidak ada tombol itu.

**Langkah reproduksi:**
1. Buka `#/guide`, hitung jumlah input.
2. Buka `#/archive`, lihat input yang tersedia.

**Harapan:** Ada kotak cari di dalam Panduan (minimal 15 heading dan 892 kata perlu difilter).

**Kenyataannya:** 0 input di halaman Panduan; halaman Arsip punya `input#ar-q` dengan placeholder `"nama / lokasi / peran"`.

**Evidence:**
- `jumlah input/select/textarea (kotak cari) : 0`
- `jumlah input di halaman Panduan : 0`
- `jumlah <button> di Panduan : 0`
- `halaman Arsip -> input#ar-q ada? true | placeholder="nama / lokasi / peran"`
- `total elemen interaktif di kartu Panduan : 10` - semuanya link navigasi, tidak satu pun alat bantu.

**Dampak ke pengguna awam:** Saya harus menebak kata kunci (E-Money? e-money? ewallet? dompet digital?) atau menggulir 5 layar. Di HP hasilnya menyerah dan bertanya ke teman - padahal aplikasi tidak punya fitur tanya (lihat BUG-10).

**Usulan perbaikan (deskriptif):** tambah kotak "Cari di Panduan..." di atas daftar yang menyaring heading dan paragraf secara langsung; tambahkan daftar isi sebagai jaring kedua.

---

### [BUG-07] Footer bertentangan dengan UI dan dengan Panduan, dan Dashboard masih menautkan URL lama /roadmap — TINGGI
**Persona dan use-case:** Setelah selesai baca Panduan ("berisi 8 seksi"), saya menggulir ke bawah dan menemukan aplikasi ini bicara soal 3 tab.

**Langkah reproduksi:**
1. Baca Panduan: "Klik satu event membuka satu Layar Kerja berisi 8 seksi."
2. Buka event, hitung elemen tab dan jumlah seksi.
3. Gulir ke footer.
4. Klik event dari kartu "Sedang berjalan" di Dashboard dan amati URL.

**Harapan:** Semua keterangan aplikasi konsisten: satu Layar Kerja, 8 seksi, tanpa tab.

**Kenyataannya:** Tidak ada tab sama sekali (0 elemen `.tab-btn` dan `.tabseg-item`), tapi footer masih berjanji "3 tab: Roadmap / Persiapan / Uang & Laporan" ditambah catatan internal developer. Dashboard juga masih menautkan `#/events/evt-1/roadmap`, dan URL itu tidak pernah diubah walau isinya sudah jadi Layar Kerja - jadi kalau saya bookmark atau menyalin URL, saya punya alamat yang menunjuk halaman "Roadmap" padahal isinya lain.

**Evidence:**
- Kutipan footer persis dari `index.html`: `SPPD Toolbox - Prototype v0.6 . Event terfokus 3 tab: Roadmap . Persiapan . Uang & Laporan. GAS & Supabase pending - lihat halaman Pengaturan. Serius digarap: Roadmap Pengawasan jadi permukaan utama.`
- `jumlah seksi tampil: 8` dan `elemen tab (.tab-btn/.tabseg-item): 0`
- `link: href="#/events/evt-1/roadmap" teks="Pameran UMKM Nusantara Expo 2026"` (di Dashboard)
- `buka #/events/evt-1/roadmap -> URL tetap: #/events/evt-1/roadmap | seksi tampil: 8 | label flowbar: Alur Kerja`
- Sumber: `js/pages.js:59` (tautan `/roadmap`), `js/pages.js:174` (`LEGACY` masih memetakan roadmap ke kerja), `js/pages2.js:330-337` (8 pill `Alur Kerja`).

**Dampak ke pengguna awam:** Tiga keterangan berbeda tentang bentuk aplikasi (Panduan 8 seksi, footer 3 tab, URL /roadmap). Saya tidak tahu mana yang benar, dan takut menunjukkan link yang salah ke atasan.

**Usulan perbaikan (deskriptif):** samakan footer dengan kenyataan (satu Layar Kerja, 8 seksi), hapus catatan internal "Serius digarap...", dan perbarui semua tautan internal dari `/roadmap` ke alamat kanonik; kalau URL lama harus tetap diterima, alihkan dengan `location.replace` supaya address bar ikut rapi.

---

### [BUG-08] Istilah tidak konsisten antara Panduan dan UI — SEDANG
**Persona dan use-case:** Saya mencari "Penyesuaian Kas" di Panduan karena itulah tulisan di tombolnya, dan tidak ketemu.

**Langkah reproduksi:**
1. Cari kata "Penyesuaian Kas" di Panduan.
2. Cari "koreksi kas" di Panduan.
3. Baca kalimat Panduan tentang bar Alur Kerja.

**Harapan:** Satu istilah per konsep, sama persis antara UI dan Panduan.

**Kenyataannya:** UI menulis "Penyesuaian Kas", Panduan menulis "koreksi kas". UI menulis "dompet", Panduan tidak pernah menyebutnya. Kalimat Panduan memakai kata "bar" yang di aplikasi berarti dua hal berbeda.

**Evidence:**
- `TIDAK "Penyesuaian Kas"` di Panduan, padahal di UI ada: `+ Catat Penyesuaian`, `Penyesuaian Kas`, `Ke Kas/Wallet`
- Panduan: `Saldo tiap event dihitung otomatis dari seksi Uang (05-06 & 08): dana awal + penjualan + koreksi kas - transport - pengeluaran.`
- Panduan: `Setiap input kas (transport, pengeluaran, penyesuaian) otomatis tersinkron...` - kata "penyesuaian" muncul sebagai kata sifat, bukan istilah bernama.
- Panduan: `Gunakan bar Alur Kerja untuk melompat ke seksi mana pun` - sedangkan di UI ada elemen `class="flowbar"` berlabel "Alur Kerja" **dan** elemen `class="bar"` (progress bar) di hero `Progres persiapan`. Terbukti: `elemen class="bar" (progress bar) di hero: 1`.
- Yang konsisten (bagus): `Rekap Global`, `Arsip`, `Master Barang`, `Master Produk` - semua nama halaman disebut persis seperti judul h1 di layar.

**Dampak ke pengguna awam:** Saya sering mengira fitur yang saya cari tidak ada karena saya mencarinya dengan kata yang salah, lalu memutuskan "berarti tool ini tidak lengkap".

**Usulan perbaikan (deskriptif):** pilih istilah baku (usulkan "Penyesuaian Kas" sebagai nama resmi, sebut "koreksi kas" sebagai sinonim di dalam kurung pada kemunculan pertama), dan ganti "bar Alur Kerja" menjadi "baris Alur Kerja" atau "tombol-tombol Alur Kerja".

---

### [BUG-09] Tidak ada FAQ tentang kesalahan input, pembatalan, dan cara backup — SEDANG
**Persona dan use-case:** Saya salah ketik nominal penjualan (misal 250.000 jadi 25.000), dan tidak tahu harus apa.

**Langkah reproduksi:**
1. Cari di Panduan: "undo", "batal", "salah", "backup", "pulihkan".
2. Periksa daftar handler di `js/actions.js`.
3. Buka `#/settings` dan lihat tombol yang tersedia.

**Harapan:** Ada cara memperbaiki kesalahan input, dan ada penjelasan cara menyimpan salinan data.

**Kenyataannya:** Tidak ada satu pun dari kata-kata itu di Panduan. Untuk transaksi penjualan, pengeluaran, transport, penyesuaian kas, dan alokasi SPPD, aplikasi hanya punya tambah dan hapus - tidak ada edit. Jadi memperbaiki salah ketik berarti hapus lalu catat ulang. Padahal di Pengaturan sudah ada tombol "Backup ke File" dan "Pulihkan dari File" yang tidak disebut sama sekali di Panduan, padahal justru di situ saya ingin aman.

**Evidence:**
- `TIDAK ADA di Panduan: bantuan, hubungi, kontak, telp, whatsapp, feedback, backup, pulihkan, undo, batal, salah, templat, template, dompet, aset, audit, cek`
- Daftar handler di `js/actions.js` (dicek dengan grep seluruh `data-action`): hanya `'sale:add'`, `'sale:delete'`, `'expense:add'`, `'expense:delete'`, `'kasadj:add'`, `'kasadj:delete'`, `'transport:add'`, `'transport:delete'`, `'danaCair:add'`, `'danaCair:delete'`, `'budget:add'`, `'budget:delete'`, `'prepitem:add'`, `'prepitem:delete'` - tidak ada handler `edit` untuk semua itu.
- Yang punya edit hanya: `event:edit`, `sppd:save` (form penuh), `product:edit`, `master:*`.
- `#/settings` memuat `Backup ke File` dan `Pulihkan dari File` (`js/pages2.js:898-899`). Terbukti: `Pengaturan = "Backup ke File" -> ADA / BENAR`, tapi `Panduan sebut "Backup" -> false`.
- Perilaku "bisa diedit" ternyata tidak seragam: di seksi 03 angka qty bisa diedit langsung di tabel (`eventproduct:save`), sedangkan di seksi 05 penjualan tidak bisa. Ini tidak dijelaskan di mana pun.

**Dampak ke pengguna awam:** Saya takut menghapus transaksi karena hilang bukti, jadi saya memilih membiarkan angka salah tetap di laporan. Itu lebih buruk daripada salah input sebentar, karena saya tidak sadar.

**Usulan perbaikan (deskriptif):** tambah minimal tiga FAQ baru: "Saya salah input, bagaimana?", "Bagaimana cara menyimpan salinan data saya?", "Bagaimana kalau saya hapus salah event?". Sebutkan tombol Backup dan Pulihkan di awal FAQ 10, dan jelaskan pola "sebagian data bisa diedit di tempatnya, sebagian harus dihapus lalu dicatat ulang".

---

### [BUG-10] Tidak ada cara bertanya atau meminta bantuan sama sekali — SEDANG
**Persona dan use-case:** Saya mentok di satu tempat (misalnya "kenapa saldo saya beda dari hitungan manual?") dan tidak ada siapa pun yang bisa dihubungi.

**Langkah reproduksi:**
1. Buka `#/guide`.
2. Cari kata "bantuan", "hubungi", "kontak", "telp", "whatsapp", "feedback".
3. Hitung tombol di halaman Panduan.

**Harapan:** Minimal ada satu kalimat "Kalau tidak menemukan jawaban, tanyakan ke ..." beserta nama bagian atau kontak.

**Kenyataannya:** Nol. Tidak ada kontak, tidak ada tombol, tidak ada catatan. Untuk magang hal ini terasa tidak aman - lebih baik diam tidak bertanya daripada bertanya ke orang yang salah.

**Evidence:**
- Pemeriksaan dengan batas kata (bukan substring): `kata "bantuan" sebagai kata utuh: false`, `"hubungi": false`, `"kontak": false`, `"tanya": false`, `"feedback": false`
- Substring yang sempat muncul ("mencari event lama", "tombol cetak laporan", "tidak menghapus data event") ternyata hanya bagian kata lain, bukan makna "tanya/minta bantuan".
- `total elemen interaktif di kartu Panduan : 10` = 10 tag `<a>` navigasi, `jumlah <button> di Panduan : 0`
- Tidak ada tombol "?" di header `index.html`.

**Dampak ke pengguna awam:** Tidak ada "rem darurat" secara psikologis. Saya cenderung berhenti, atau lebih buruk: membuat workaround sendiri yang merusak data.

**Usulan perbaikan (deskriptif):** tambah blok penutup di Panduan: "Masih bingung? Catat nama event dan nomor seksi yang bermasalah, lalu tanyakan ke ..." - isi dengan kontak atau tim yang sebenarnya, dan sediakan tombol "Salin Ringkasan Masalah" yang menyalin nama event, lokasi, dan langkah ke clipboard.

---

### [BUG-11] Tanda centang hijau muncul untuk hal yang belum dikerjakan; seksi 07 sudah bilang "Pulang tuntas" — TINGGI
**Persona dan use-case:** Saya baru membuat event kosong untuk latihan, lalu mengira sudah ada yang selesai.

**Langkah reproduksi:**
1. Buat event baru lewat tombol "Buat Event Baru", atau buka event kosong.
2. Lihat baris cek di hero "Progres persiapan".
3. Lihat subjudul seksi 07.

**Harapan:** Semua cek kosong sampai memang dikerjakan.

**Kenyataannya:** Event kosong sudah menampilkan dua centang hijau ("Item persiapan dibawa" dan "Saldo aman"), dan seksi 07 berbalas "Pulang tuntas" padahal belum ada satu pun data.

**Evidence:**
- `cek hero : SPPD lengkap [bulat] - Produk dicatat [bulat] - Item persiapan dibawa [centang] - Saldo aman [centang]`
- `07 Cross-check Berangkat/Pulang` subjudul = `Pulang tuntas`, sedangkan isi body = `Belum Siap Berangkat`
- Sumber: `js/pages2.js:306` (`items.length === 0 || itemDone === items.length` bernilai benar saat items kosong) dan `js/pages2.js:307` (`!(s.danaAwal > 0 && fin.saldo < 0)` bernilai benar saat danaAwal 0)
- Tidak ada penjelasan di Panduan: `Panduan menjelaskan tanda centang dan bulat? tidak`, dan kata "lengkap" di Panduan hanya muncul dalam arti lain (`riwayat semua event lengkap dengan filter`, `Satu Event = satu siklus lengkap`).

**Dampak ke pengguna awam:** Saya percaya "sudah aman" padahal belum menyiapkan apa pun. Ini membuat saya melewatkan persiapan, dan baru sadar saat hari-H.

**Usulan perbaikan (deskriptif):** bedakan keadaan "belum ada data" dari "sudah dicek": tampilkan abu-abu dengan teks "belum ada data" alih-alih centang hijau; tambahkan baris kecil "Centang berarti semua item sudah ditandai dibawa" di bawah daftar cek; klarifikasi subjudul seksi 07 agar tidak menyebut "tuntas" saat data masih kosong.

---

### [BUG-12] Beberapa pesan error tidak menjelaskan masalahnya, dan istilah di dalamnya tidak ada glosarium — SEDANG
**Persona dan use-case:** Saya salah pilih kategori "Lainnya" lalu klik "+ Tambah Alokasi", dan toast-nya terbaca seperti perintah, bukan penjelasan.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, bagian "Rincian Alokasi SPPD", lalu "Tambah Alokasi per Komponen".
2. Pilih Komponen = `Lainnya (kategori sendiri)`, biarkan kolom "Kategori Lain" kosong, Alokasi = 0.
3. Klik "+ Tambah Alokasi", baca toast.
4. Ulangi untuk penjualan, pengeluaran, penyesuaian kas, Dana Cair, rute, milestone, grup, dan item.

**Harapan:** Pesan error menyebutkan field mana yang salah dan apa yang harus diisi.

**Kenyataannya:** Sebagian besar pesan bagus dan spesifik ("Rute asal & tujuan wajib diisi", "Nama event wajib diisi", "Nominal penyesuaian tidak boleh 0"). Tapi ada yang membingungkan: "Tulis nama kategori sendiri" muncul sebagai error padahal isinya perintah, dan "Produk & qty wajib valid" memakai bahasa yang tidak ada maksudnya. Pesan "Stok tidak cukup" memakai istilah "sisa" dan "Qty" yang tidak dijelaskan di Panduan.

**Evidence:**
- Sumber `js/actions.js:364`: `if (!kategori) { ui.toast('Tulis nama kategori sendiri', 'error'); return; }`
- `js/actions.js:433`: `if (!pid || qty <= 0) { ui.toast('Produk & qty wajib valid', 'error'); return; }`
- `js/actions.js:436`: `ui.toast('Stok tidak cukup - sisa ' + sisa + '. Qty > sisa (dibawa - terjual - rusak).', 'error')`
- `js/actions.js:233`: `if (!keys.length) { ui.toast('Belum ada item dicentang', 'error'); return; }`
- Validasi kategori di `js/actions.js:364` berada DI DALAM blok `if (kategori === '__custom__')` (`js/actions.js:362`). Jadi kalau saya justru membiarkan dropdown Kategori kosong (bukan memilih "Lainnya"), cek kategori sama sekali tidak jalan - yang muncul cuma `Alokasi wajib lebih dari 0` (`js/actions.js:366`), padahal yang belum saya isi justru kolom Kategori. Percobaan saya: Kategori dibiarkan kosong + Alokasi 0 -> toast `Alokasi wajib lebih dari 0`.
- Yang baik (tidak jadi temuan): `Jumlah wajib lebih dari 0`, `Sumber dana wajib diisi`, `Judul milestone wajib diisi`, `Nama grup wajib diisi`.

**Dampak ke pengguna awam:** Saya tidak tahu apakah data saya yang salah atau aplikasinya yang salah. Untuk "Tulis nama kategori sendiri" saya sempat mencari field yang memang ada tapi tersembunyi - buang 5 menit.

**Usulan perbaikan (deskriptif):** ubah jadi pola "Kolom <nama> belum diisi. Isi dulu, lalu simpan."; untuk validasi penjualan, sebutkan nama kolom ("Pilih produk dulu di dropdown"); untuk "sisa", tambahkan satu kalimat penjelasan di Panduan: "sisa = jumlah yang masih boleh dijual (dibawa - terjual - rusak)".

---

### [BUG-13] Judul FAQ 10 janggal dan tidak wajar — RENDAH
**Persona dan use-case:** Saya memindai judul FAQ untuk cari jawaban soal batas data, dan berhenti membaca karena tidak masuk akal.

**Langkah reproduksi:**
1. Buka `#/guide`.
2. Baca judul pada posisi 13.

**Harapan:** Judul FAQ menyebut kondisi nyata yang dicari pembaca, misalnya "Kenapa data saya hilang setelah ganti browser?"

**Kenyataannya:** Bagian "Buat apa lalu hilang?" menggantung dan tidak bermakna sebagai pertanyaan. Isi jawabannya juga cuma satu kalimat tentang localStorage, padahal ada tombol Backup di Pengaturan yang tidak disebut (lihat BUG-09). Catatan kecil lain: judul FAQ 12 memakai tanda kutip di dalam teks yang tidak dirender rapi sehingga tampil menjadi `"Prototype"` polos tanpa penjelasan.

**Evidence:**
- Kutipan persis dari layar: `10. Berapa batas data? Buat apa lalu hilang?`
- Isi jawaban (25 kata): `Prototype ini menyimpan data di localStorage browser - aman selama browser yang sama & belum di-clear. Saat nanti GAS/Supabase tersambung, data dipindah ke database cloud.`
- Panduan menyebut "Undo"? false. Menyebut "Batal"? false.
- Tombol "Batal" sebenarnya ada di modal: `tombol di modal Buat Event: "Batal", "Simpan"`
- Tombol hapus yang ada di Layar Kerja: `Hapus event , Hapus`

**Dampak ke pengguna awam:** Saya menandai judul ini sebagai tidak jelas dan tidak membacanya, padahal justru memuat info penting soal keamanan data.

**Usulan perbaikan (deskriptif):** ganti judul menjadi dua pertanyaan pendek: "10. Apakah data saya hilang kalau ganti browser?" dan "11. Kenapa data saya hilang setelah saya bersihkan browser?"; jawabannya menyebutkan tombol Backup dan Pulihkan di Pengaturan.

---

### [BUG-14] Halaman Panduan tidak bisa dilipat dan tidak ada tombol kembali ke atas — RENDAH
**Persona dan use-case:** Setelah menggulir 5 layar, saya ingin balik ke atas tanpa gesture.

**Langkah reproduksi:**
1. Buka `#/guide`.
2. Gulir ke bawah.
3. Cari tombol "kembali ke atas" atau back-to-top.

**Harapan:** Tombol back-to-top atau struktur yang bisa dilipat.

**Kenyataannya:** 0 tombol, 0 `<details>`, 0 tombol back-to-top. Kartu Panduan adalah satu blok panjang 2169 px.

**Evidence:**
- `tinggi kartu Panduan (px): 2169`, `jumlah kata : 892`, `jumlah karakter : 6043`
- `tombol back-to-top / "kembali ke atas" : 0`
- `accordion <details>? 0`
- `jumlah <button> di Panduan : 0`
- 4 dari 15 heading punya jawaban "PADAT" (45 kata atau lebih), termasuk FAQ 4 (79 kata) dan blok 9b (60 kata).

**Dampak ke pengguna awam:** Di HP, kalimat panjang tanpa spasi membuat saya kehilangan tempat ("kalimat mana ya yang tadi?"). Sebagian besar isinya mungkin tidak dibaca sampai habis.

**Usulan perbaikan (deskriptif):** pecah FAQ menjadi accordion per pertanyaan (satu pertanyaan terbuka pada satu waktu) atau tabs (Panduan / Peta Menu / Kamus Istilah), plus tombol back-to-top kecil.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Klaim "8 seksi" di Panduan benar.** Terbukti `jumlah seksi di Layar Kerja: 8` dan judul seksi sesuai urutan yang dijanjikan: seksi 01 = "SPPD & Dana Cair", seksi 08 = "Uang - Laporan".
- **FAQ 4 soal "Tampilkan realisasi" benar dan sangat membantu.** Checkbox `#spp-tampilreal` benar-benar ada (`js/pages.js:474`), jadi kalimat "aktifkan checkbox 'Tampilkan realisasi' supaya kolomnya muncul" bukan mengarang.
- **FAQ 9 soal tombol cetak benar.** Terbukti `tombol cetak di seksi 06 -> ADA` dan `tombol cetak di seksi 08 -> ADA` - memang ada tombol "Cetak Laporan" di seksi 06 (`js/pages2.js:268`) dan seksi 08 (`js/pages2.js:548`).
- **Link "buka layar kerja (contoh)" benar-benar bekerja.** `href="#/events/evt-1/persiapan"` membuka 8 seksi dengan label `Alur Kerja` dan 8 pill: `01 SPPD / 02 Jadwal / 03 Produk / 04 Item / 05 Penjualan / 06 Kas / 07 Pulang / 08 Laporan`.
- **Konsistensi nama halaman bagus.** Tujuh nama halaman disebut persis sama dengan judul h1 yang tampil: Dashboard, Event & Tugas, Master Produk, Master Barang Dibawa, Arsip, Rekap Global, Pengaturan. Tidak ada halaman yang saya cari di Panduan tapi tidak ada di sana.
- **Penjelasan rumus di FAQ 6 benar.** "Kembali = dibawa - terjual - rusak" cocok dengan kode (`js/pages2.js:32` dan `js/pages2.js:437`) dan dengan teks UI yang sama.
- **FAQ 11 (GAS dan Supabase) sangat lulus untuk anak magang** - mendefinisikan masing-masing dengan satu kalimat sederhana dan menyatakan keduanya belum aktif. Tidak ada janji palsu.
- **Penjelasan selisih alokasi vs Dana Awal jujur.** Panduan bilang "boleh beda total dari Dana Awal; selisihnya ditampilkan" dan memang ada baris `selisih +Rp 350.000 dari total alokasi` di seksi 08 - jadi saya tidak kaget saat angkanya beda.
- **Banyak pesan error benar-benar bagus dan spesifik** (bukan temuan): `Rute asal & tujuan wajib diisi`, `Nama event wajib diisi`, `Nominal penyesuaian tidak boleh 0`, `Sumber dana wajib diisi`, `Alokasi wajib lebih dari 0`, `Judul milestone wajib diisi`.
- **Status Dana Cair punya dua lapis penjelasan** (`Belum / Cair` di tabel dan `Belum cair / Sudah cair` di form), sehingga tidak ambigu.

## Pertanyaan terbuka / perlu konfirmasi

- **Perlu konfirmasi:** dropdown Status SPPD yang tidak mengikuti data - apakah ini disengaja (misalnya "Status Alur" dimaksudkan selalu diisi manual setiap dibuka) atau murni bug render? Kalau disengaja, tetap perlu penjelasan, karena perilakunya merusak data secara diam-diam.
- **Perlu konfirmasi:** status event `diajukan` dan `disetujui` yang ada di seed tapi tidak ada di form (`js/pages.js:157`) - apakah dua status itu memang sudah dihapus dari desain, atau form yang lupa diperbarui? Perlu konfirmasi pemilik produk sebelum menetapkan severity akhir.
- **Perlu konfirmasi:** "9b." pada `js/pages2.js:827` - apakah ada sub-bagian "9a" yang belum ditulis, atau hanya salah ketik penomoran?
- **Perlu konfirmasi:** teks footer "3 tab: Roadmap / Persiapan / Uang & Laporan" dan "Roadmap Pengawasan jadi permukaan utama" - apakah catatan rencana yang sengaja dibiarkan untuk tim, atau teks sisa yang harus disembunyikan dari pengguna akhir?
- Tidak sempat menguji perilaku nyata penyimpanan ke file (`Backup ke File` dan `Pulihkan dari File`) karena butuh dialog file system; hanya saya pastikan tombolnya ada dan tidak disebut di Panduan.
- Hanya menguji 1 event berisi data (evt-1) plus 1 event kosong; mungkin ada masalah status select di event lain juga tapi belum saya periksa semua.
- `budget:katmode` diam-diam memaksa dropdown Wallet berubah ke "E-Money" saat komponen "E-Money" dipilih (`js/actions.js:353-354`); baris seed "Uang Saku" memang memakai wallet E-Money. Ini perilaku "sihir" yang tidak dijelaskan Panduan - saya laporkan sebagai catatan, belum saya jadikan temuan tersendiri karena tidak sempat mengukurnya dari sisi pengguna.
- Angka "892 kata" dan "2169 px" diambil di viewport headless 756x441; di layar desktop lebar, tinggi kartu akan lebih pendek karena teks membungkus lebih banyak per baris.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Menemukan jawaban di halaman Panduan | 2 | 0 kotak cari, 0 daftar isi, 0 heading punya id, kartu 2169 px (kira-kira 5 layar), dan penomoran "9b lalu 1" bikin orang menyerah. |
| Kesesuaian isi Panduan dengan UI | 3 | 8 seksi, "Tampilkan realisasi", tombol cetak 06 dan 08, rumus Kembali: semua benar. Tapi ada footer "3 tab" dan URL `/roadmap` yang bertentangan, plus dropdown status yang merusak data. |
| Ketersediaan tooltip dan bantuan inline | 1 | 0 elemen `title` di 9 rute; istilah "oversold", "menambal", "dobel hitung" berdiri tanpa penjelasan. |
| Kejelasan istilah (glosarium) | 2 | Enam istilah besar di UI ("Aset Jual", "Aset dan Alat", "Cek Persiapan", "Audit Aset", "wallet/dompet", "Komponen") tidak ada di Panduan. |
| Onboarding magang baru | 2 | Tidak ada urutan belajar yang jelas; status ganda, centang hijau palsu, dan footer usang membuat saya salah percaya pada aplikasi. |
| Rasa aman saat salah input | 2 | Tidak ada Undo, transaksi tidak bisa diedit (hanya hapus), tombol Backup ada tapi tidak disebut, tidak ada cara bertanya. |
| Kejujuran dokumentasi | 4 | FAQ 11 dan FAQ 12 jujur bahwa ini prototype dan GAS/Supabase belum aktif; tidak ada janji palsu. |
| **Keseluruhan** | **2** | Konten ada dan sebagian benar, tapi tidak ada alat untuk mencarinya, tidak ada glosarium, dan ada tiga instruksi UI yang bisa merusak data tanpa memberi tahu. |