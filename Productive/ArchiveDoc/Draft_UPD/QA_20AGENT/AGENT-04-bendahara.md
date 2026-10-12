# AGENT-04 - Bendahara

> **Persona:** Bendahara Events yang setiap akhir event harus merekap kas, mencocokkan dengan SPPD dan Dana Cair, lalu melaporkan saldo ke laporan keuangan - **Fokus:** angka, saldo, rekonsiliasi (Seksi 01, 05, 06, 08, Rekap Global, laporan cetak) - **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 7 |
| SEDANG | 7 |
| RENDAH | 2 |
| **Total** | **16** |

Kesimpulan: tidak ada bug yang membuat aplikasi mati atau menghapus data otomatis, jadi tidak ada temuan KRITIS. Tapi bagi bendahara, yang paling penting justru angka yang bisa dipercaya saat dia presentasi laporan, dan di situ aplikasi ini lemah. Tujuh temuan TINGGI: field "Realisasi" manual yang sama sekali tidak dipakai padahal saya isi, saldo negatif tetap diberi centang hijau "Saldo aman", kolom Saldo di tabel Arus Kas per Wallet selalu kurang Rp 2.500.000 dari Saldo Akhir yang tercetak di halaman yang sama, blok "Bandingkan SPPD vs Realisasi vs Penjualan" tidak balance, baris Total tabel anggaran melanggar A - R = S begitu ada alokasi E-Money, harga satuan penjualan menerima 0/kosong/minus, dan menghapus transaksi keuangan terjadi dalam satu klik tanpa konfirmasi. Angka dasarnya sendiri ternyata benar: `financeSummary().saldo` sama dengan hitung manual, Rekap Global cocok dengan penjumlahan per event, semua transaksi seed benar qty x harga. Jadi masalahnya bukan hitungannya salah, tapi **rekonsiliasi antar tampilan yang tidak seimbang dan tidak ada yang memberi tahu**.

## Environment yang dipakai

- Edge headless, profil unik (`...\Temp\opencode\prof_agent04_bendahara`, dihapus lalu dibuat ulang tiap run), seed default (`localStorage.clear()` + `store.resetData()` di baris pertama harness).
- Perintah: `msedge --headless=new --disable-gpu --no-sandbox --user-data-dir=<profil unik> --virtual-time-budget=15000 --dump-dom "file:///C:/.../ArchiveDoc/_QA_TMP/a04_uang.html"`, hasil dibaca dari `<pre id="out">` (19.308 karakter, 17 blok pemeriksaan).
- Harness: `_QA_TMP/a04_uang.html`, skrip uji 501 baris. Semua pemeriksaan sinkron (tanpa `setTimeout` besar), hanya memanggil `A.reload()` untuk memaksa render.
- Rute yang diuji: `#/events/evt-1` (Layar Kerja, seksi 01-08), `#/events/evt-3`, `#/events/ev-d1`, `#/events/ev-d6`, `#/events`, `#/reports` (Rekap Global), `#/dashboard`, `#/archive`, plus fungsi murni `A.pages2.keuangan()`, `A.pages2.penjualan()`, `A.pages2.kerja()`, `A.printHTML()`, dan API store `financeSummary / budgetRealisasi / globalReports / getSppd / deleteProduct / importJSON`.
- Aplikasi diperlakukan read-only. Tidak ada file di `js/`, `css/`, atau `index.html` yang saya sentuh. Setiap temuan diverifikasi ulang ke baris source yang saya kutip, supaya tidak ada temuan karangan.
- Verifikasi numerik lewat teks DOM dan `getComputedStyle`, bukan screenshot.

## Temuan

### [BUG-01] Field "Realisasi" manual di SPPD disimpan tapi tidak pernah dipakai - TINGGI

**Persona dan use-case:** Di akhir event saya mengisi field "Realisasi (dana yang benar-benar terpakai)" di Seksi 01 karena itu angka yang saya yakini akan muncul di laporan pertanggungjawaban. Saya pindah ke Seksi 06/08 untuk mencocokkannya dengan kas.

**Langkah reproduksi:**
1. Buka `#/events/evt-3` (Bazar Ramadan Ceria 2026, status `selesai`, Dana Awal Rp 3.000.000, `tampilkanRealisasi = true`).
2. Baca nilai input berlabel "Realisasi (dana yang benar-benar terpakai)" -> Rp 1.850.000.
3. Baca kartu Saldo, blok "Rekap Penggunaan Uang" (Seksi 06), tabel anggaran (Seksi 08), dan `A.printHTML()`.
4. Cari kemunculan angka "1.850.000" di keempat tempat itu.

**Harapan:** Saldo akhir memakai Realisasi Rp 1.850.000 -> Rp 1.150.000, dan angka Rp 1.850.000 muncul di laporan sebagai realisasi terpakai.

**Kenyataannya:** Saldo tetap Rp 3.000.000 (persis sama dengan Dana Awal, seolah tidak ada pengeluaran sama sekali). Angka Rp 1.850.000 tidak muncul di mana pun. Tabel anggaran menunjukkan Realisasi Rp 0, dan di Rekap Global baris evt-3 tertulis `jual Rp 0 / biaya Rp 0 / Rp 3.000.000`.

**Evidence:**
```
event = Bazar Ramadan Ceria 2026 status=selesai
Dana Awal = 3000000
tampilkanRealisasi = true
input "Realisasi" di seksi 01 = 1850000
SALDO yang dihitung aplikasi = 3000000
saldo kalau realisasi manual yang dipakai = 1150000
pengeluaran tercatat evt-3 = 0 item, transport 0 rute, penjualan 0
"1.850.000" muncul di seksi 06? = false
"1.850.000" muncul di seksi 08? = false
"1.850.000" muncul di laporan cetak? = false
total realisasi otomatis tabel anggaran = 0
baris evt-3 di Ringkasan per Event = Bazar Ramadan Ceria 2026 jual Rp 0 biaya Rp 0 Rp 3.000.000
```
Sumber: `store.js:806` - `saldo: danaAwal + totalSales + totalKasAdj - pengeluaran`; `sppd.realisasi` tidak pernah dibaca di mana pun. Field-nya tetap tersimpan karena `getSppd()` memang menulis field itu (`store.js:384`), tapi tidak ada konsumennya. Panduan aplikasi sendiri (`pages2.js:855`, FAQ 4) menyatakan "Realisasi = nominal yang benar-benar terpakai di akhir".

**Dampak ke pengguna awam:** Saya mengira sudah mengentry angka yang benar karena saya sudah mengisinya. Kalau saya presenta angka Rp 3.000.000 padahal sebenarnya terpakai Rp 1.850.000, selisih Rp 1.850.000 hilang begitu saja di laporan. Untuk event yang memang menunggu semua pengeluaran dicatat manual lewat form (bukan lewat tiap transaksi), saldo di aplikasi selalu lebih besar daripada kenyataan sebesar nilai Realisasi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Perlakukan "Realisasi" sebagai sumber resmi dan tentukan prioritasnya secara eksplisit. Misalnya: jika ada transaksi tercatat, Realisasi otomatis menang dan field manual diberi badge "diabaikan, sudah ada N transaksi"; jika tidak ada transaksi sama sekali, pakai Realisasi manual sebagai pengeluaran. Tampilkan di Seksi 06 angka mana yang dipakai. Jangan diam-diam membuang input yang sudah saya ketik.

### [BUG-02] Kolom Saldo di Arus Kas per Wallet selalu kurang Rp 2.500.000 dari Saldo Akhir - TINGGI

**Persona dan use-case:** Saya menutup buku kas akhir bulan: Bank ada 1 juta, QRIS 1,25 juta, Kas minus 205 ribu, E-Money nol, jadi saldo 2.045 juta. Lalu saya cocokkan dengan angka besar di seksi yang sama dan tidak cocok. Saya harus temukan ke mana hilangnya uang.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` (seed default), scroll ke "Laporan Arus Kas per Wallet" (Seksi 08).
2. Jumlahkan kolom **Saldo** keempat baris (Bank, QRIS, Kas, E-Money).
3. Bandingkan dengan baris "Saldo akhir" di blok "Rekap Penggunaan Uang" dan subjudul Seksi 08.

**Harapan:** Jumlah kolom Saldo = Saldo Akhir Rp 4.545.000, atau ada baris "Saldo awal (Dana Awal SPPD)" dan baris TOTAL sehingga selisih bisa dijelaskan.

**Kenyataannya:** Jumlah kolom Saldo = Rp 2.045.000. Selisihnya **tepat Rp 2.500.000** = Dana Awal SPPD. Tabel tidak punya baris saldo awal, tidak punya baris TOTAL, dan tidak ada catatan apa pun soal penjelasannya. Baris "Dana Cair" juga tidak punya field wallet, jadi tidak pernah muncul di tabel ini sama sekali.

**Evidence:**
```
Bank = masuk 1000000 | keluar 0 | SALDO 1000000
QRIS = masuk 1250000 | keluar 0 | SALDO 1250000
Kas = masuk 1730000 | keluar -1935000 | SALDO -205000
E-Money = masuk 0 | keluar 0 | SALDO 0
JUMLAH kolom Saldo = 2045000
"Saldo akhir" seksi 08 = 4545000
selisih tidak dijelaskan = 2500000
Dana Awal SPPD = 2500000
Dana Cair (sudah cair) = 1500000
field wallet di record danaCair = Transfer instansi (BCA) -> TIDAK ADA FIELD wallet | Kas tunai harian -> TIDAK ADA FIELD wallet | Transfer instansi -> TIDAK ADA FIELD wallet | Transfer instansi (Mandiri) -> TIDAK ADA FIELD wallet
ada baris TOTAL di tabel arus kas? = false
ada baris saldo awal / saldo bring? = false
```
Sumber: `store.js:796-802` hanya menghitung masuk dari penjualan + penyesuaian kas dan keluar dari transport + pengeluaran; `danaAwal` tidak pernah masuk ke objek `wallets`, padahal `store.js:806` menghitungnya ke `saldo`. `pages2.js:487-493` hanya me-loop 4 wallet tanpa footer.

**Dampak ke pengguna awam:** Ini rekonsiliasi yang saya lakukan setiap akhir bulan. Kalau saya tanda tangan bahwa saldo kas = Rp 2.045.000, sedangkan aplikasi bilang Rp 4.545.000 di tempat lain, saya yang salah bukan angkanya. Kas di tangan saya beneran ada Rp 2.500.000 dari SPPD, jadi tabel ini mengira uang SPPD itu hilang. Saya akan membuang waktu mencari "hilang Rp 2,5 juta".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambah baris "Saldo awal - Dana Awal SPPD" di atas, atau beri kolom "Saldo awal" per wallet (kalau SPPD punya wallet tujuan, pakai wallet tujuan itu), lalu wajibkan baris **TOTAL** di `tfoot`. Kalau Dana Awal belum dipetakan ke wallet, tampilkan baris "Belum dipetakan" daripada menghilang. Saldo negatif per wallet juga harus warna merah, seperti yang sudah dilakukan tabel anggaran.

### [BUG-03] Blok "Bandingkan SPPD vs Realisasi vs Penjualan" tidak balance dan Dana Cair berlabel "+" - TINGGI

**Persona dan use-case:** Ini blok yang paling saya pakai untuk menjelaskan "dari mana asal uang, sudah berapa keluar, sisanya berapa" saat briefing ke ketua panitia. Saya baca berurutan dari atas.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, scroll ke blok "Bandingkan SPPD vs Realisasi vs Penjualan".
2. Jumlahkan keempat baris di atas "Saldo akhir".
3. Bandingkan dengan baris "Saldo akhir" di blok itu sendiri.

**Harapan:** Baris-baris itu konsisten secara aritmetika: Alokasi + Hasil penjualan - Realisasi = Saldo akhir, dan Penyesuaian Kas ikut terlihat karena dia bagian dari saldo.

**Kenyataannya:** Tidak ada satupun pembacaan yang menghasilkan Saldo akhir. Tanpa baris "Dana sudah cair": Rp 2.500.000 - Rp 1.910.000 + Rp 3.480.000 = Rp 4.070.000, sedangkan blok menampilkan Rp 4.545.000. Selisihnya **Rp 475.000**, yang persis jumlah Penyesuaian Kas yang tidak ditampilkan di blok ini. Dengan baris "Dana sudah cair" ikut dijumlah: Rp 5.570.000. Jadi satu-satunya baris yang benar adalah "Saldo akhir"; semua baris pendukungnya tidak bisa dipakai untuk berpresentasi.

**Evidence:**
```
Alokasi SPPD (dana awal) = Rp 2.500.000
Dana sudah cair = +Rp 1.500.000
Realisasi terpakai = -Rp 1.910.000
Hasil penjualan = +Rp 3.480.000
Saldo akhir = Rp 4.545.000
jumlah 4 baris tanpa "Dana sudah cair" = 4070000
saldo akhir tampil = 4545000
SELISIH TANPA KETERANGAN = 475000
total penyesuaian kas (tidak ada di blok ini) = 475000
kalau "Dana sudah cair" ikut dijumlah = 5570000
```
Sumber: `pages2.js:533-537`. Dua masalah terpisah di sini. Pertama, `s.danaCair` masuk ke tampilan dengan prefix "+" (`pages2.js:534`) padahal Dana Cair adalah uang **keluar** dari Kas Instansi menuju bendahara, bukan pemasukan, dan tidak masuk ke `saldo` (`store.js:806`). Kedua, `s.totalKasAdj` tidak punya baris di blok ini padahal masuk ke `saldo`. Paragraf penjelasan (`pages2.js:532`) memakai tanda panah "alokasi SPPD -> dana cair -> realisasi terpakai -> hasil penjualan -> saldo", yang secara semantik menyiratkan urutan aritmetika. Bandingkan dengan blok "Rekap Penggunaan Uang" tepat di bawahnya (`pages2.js:542-547`) yang **benar** balance karena memuat Penyesuaian Kas.

**Dampak ke pengguna awam:** Saya sering pakai blok ini sebagai "rekonsiliasi satu layar" untuk ketua. Kalau ditanya "kenapa saldo 4,5 juta?", penjelasannya saya susun sendiri, dan dua kemungkinan hitungan saya sama-sama salah. Dengan label "+" di Dana Cair, ada yang bisa mengira dana cair menambah saldo kita.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Hapus baris "Dana sudah cair" dari blok aritmetika ini (ia sudah punya tempat sendiri di Seksi 01), atau pindahkan ke catatan di bawah dengan label "informasi, bukan bagian dari hitungan". Tambahkan baris Penyesuaian Kas supaya `2.500.000 - 1.910.000 + 3.480.000 + 475.000 = 4.545.000` benar-benar terbukti di depan mata. Kalau memang mau dua-duanya masuk, tambahkan baris Total di bawah supaya angkanya bisa dicek sendiri.

### [BUG-04] Harga satuan penjualan menerima 0, kosong, dan negatif - TINGGI

**Persona dan use-case:** Saya catat penjualan booth di lapangan. Tangan sudah benar saat mengetik 9 sambil menggenggat HP, jadi tidak jarang saya salah ketik angka harga atau mengosongkan field.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, Seksi 05 "Uang - Penjualan".
2. Isi Produk = Batik Tulis, Qty = 2, Harga Satuan = `0`, klik "Simpan".
3. Ulangi dengan Harga Satuan kosong, lalu dengan Harga Satuan `-5000`.
4. Periksa toast, tabel transaksi, dan "Total Terjual".

**Harapan:** Harga satuan harus lebih dari 0. Kalau tidak, aplikasi menolak dengan pesan jelas, persis seperti yang sudah dilakukan form pengeluaran (`actions.js:457`: `if (jumlah <= 0) { toast('Jumlah wajib lebih dari 0', 'error'); return; }`).

**Kenyataannya:** Semua tiga diterima dan diberi toast **sukses**. Harga negatif tercatat sebagai transaksi penjualan negatif; Total Terjual justru **turun** Rp 5.000; qty Batik naik dua kali (11 -> 13) sehingga barang tercatat "terjual" padahal tidak ada uang masuk. Input-nya sudah punya `min="0" step="500"` tapi atribut itu tidak dipakai apa pun karena tidak ada form validation.

**Evidence:**
```
nilai awal input harga = 250000 | atribut min=0 step=500
[harga 0] toast = ["Penjualan tercatat Rp 0"]
[harga 0] transaksi tersimpan = ["2x0=0"]
[harga KOSONG] toast = ["Penjualan tercatat Rp 0"]
[harga KOSONG] transaksi = ["2x0=0","1x0=0"]
[harga -5000] toast = ["Penjualan tercatat Rp -5.000"]
[harga -5000] transaksi = ["2x0=0","1x0=0","1x-5000=-5000"]
[harga -5000] rekap per produk = Batik Tulis13 pcsRp 2.245.000 || ... || Total TerjualRp 3.475.000
[harga -5000] baris tabel menampilkan minus? = ya, "Rp -5.000"
[harga -5000] toast penolakan validasi harga? = TIDAK ADA validasi harga
[qty 999] toast = [... "Stok tidak cukup - sisa 11. Qty > sisa (dibawa - terjual - rusak)."]
[qty 999] jumlah transaksi = 4 (tetap 4 = ditolak)
```
Sumber: `actions.js` `sale:add` hanya mengecek `if (!pid || qty <= 0)` dan validasi stok; `harga` tidak pernah divalidasi.

**Dampak ke pengguna awam:** Saya tidak akan sadar ada transaksi Rp 0 dan Rp -5.000 sampai saya cek laporan, karena toast-nya berwarna hijau dan berbunyi "tercatat". Di lapangan, satu transaksi negatif Rp 5.000 cukup untuk membuat seluruh laporan bulanan terlihat salah. Perhatikan bahwa validasi **stok** bekerja dengan sangat baik (qty 999 ditolak dengan pesan yang menjelaskan sisa), jadi pola yang benar sudah ada di sini, cuma tidak dipakai untuk harga.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan guard yang sama dengan `expense:add`: harga harus finite, lebih dari 0, dan (kalau mau) kelipatan `step` Rp 500 dengan pesan yang menyebut koreksinya. Kalau input dikosongkan, perlakukan sebagai tidak terisi, bukan Rp 0. Atau lebih baik lagi, kalau nominal penjualan belum diketahui, simpan qty-nya dan tandai "harga belum diisi" supaya bisa dilengkapi kemudian.

### [BUG-05] Saldo minus tetap diberi centang hijau "Saldo aman" - TINGGI

**Persona dan use-case:** Saya buka halaman event untuk cek cepat "aman atau belum" sebelum memutuskan lanjut atau stop belanja.

**Langkah reproduksi:**
1. Buka `#/events/ev-d1` (Sosialisasi UMKM Kota, Dana Awal = Rp 0).
2. Catat isi checklist hero.
3. Tambahkan satu pengeluaran Rp 1.000, lihat kartu Saldo dan checklist hero lagi.

**Harapan:** Kalau saldo minus, checklist tidak menampilkan "Saldo aman" dengan centang hijau.

**Kenyataannya:** Dengan Dana Awal = 0 dan saldo = **Rp -1.000**, hero tetap menampilkan `Saldo aman` dengan centang hijau. Kartu Saldo di seksi yang sama sudah benar berubah jadi `Rp -1.000` dengan sub-label "minus!", jadi dua bagian halaman ini saling bertentangan di event yang sama.

**Evidence:**
```
event = Sosialisasi UMKM Kota | danaAwal=0
saldo setelah pengeluaran Rp 1.000 = Rp -1.000 | sub="minus!"
hero checks = - SPPD lengkap - Produk dicatat + Item persiapan dibawa + Saldo aman
psec-06 sub = 1 pengeluaran - saldo Rp -1.000
psec-08 sub = Saldo akhir Rp -1.000
hero: ada tanda centang "Saldo aman"? = true
saldo di Rekap Global untuk ev-d1 = -1000
```
Sumber: `pages2.js:307` - `{ ok: !(s.danaAwal > 0 && fin.saldo < 0), label: 'Saldo aman' }`. Syarat `danaAwal > 0` membuat saldo minus pada event tanpa alokasi SPPD lolos sebagai "aman". Bandingkan dengan kartu event di daftar event (`pages.js:358`) yang memakai aturan berbeda: `s.saldo < 0 ? 'minus' : 'aman'` - jadi aplikasi punya dua aturan aman/minus yang berbeda untuk data yang sama. Untuk evt-1 (Dana Awal Rp 2.500.000, saldo Rp -455.000) hero sudah benar menampilkan bulatan bukan centang, jadi masalahnya khusus event tanpa alokasi.

**Dampak ke pengguna awam:** Saya akan membawa "Saldo aman" sebagai persetujuan untuk belanja lanjut, padahal kas saya minus Rp 1.000. Saldo minus di event tanpa Dana Awal justru kondisi yang paling sering terjadi di awal persiapan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Satu aturan tunggal untuk seluruh aplikasi: saldo < 0 = perlu perhatian, tanpa syarat `danaAwal > 0`. Untuk event tanpa alokasi, ganti label "Saldo aman" dengan yang jujur seperti "Belum ada Dana Awal" supaya tidak menyesatkan. Pastikan kartu Saldo, checklist hero, daftar event, Rekap Global, dan laporan cetak semuanya memakai satu helper yang sama.

### [BUG-06] Hapus transaksi keuangan langsung berlaku, tanpa konfirmasi dan tanpa undo - TINGGI

**Persona dan use-case:** Saya ingin membersihkan salah catat. Kadang salah klik baris yang salah, terutama di HP.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, Seksi 06, klik "Hapus" pada salah satu pengeluaran.
2. Periksa apakah muncul dialog konfirmasi.
3. Ulangi pada tabel penjualan (Seksi 05/03) untuk transaksi `sal-1`.

**Harapan:** Karena ini angka keuangan, menghapus harus minta konfirmasi, minimal yang menyebut nominal-nya. Konfirmasi sudah dipakai di tempat lain (hapus produk master).

**Kenyataannya:** Langsung hilang. Tidak ada dialog, tidak ada tombol undo, dan toast-nya berwarna sukses berbunyi "Transaksi dihapus" / "Pengeluaran dihapus". Saldo dan semua rekap ikut berubah seketika.

**Evidence:**
```
modal konfirmasi? = 0 (0 = hilang langsung, tanpa konfirmasi)
toast = ["Pengeluaran dihapus"]
saldo sebelum = 4545000 -> saldo sesudah (harap 4695000) = 4695000
"Realisasi terpakai" seksi 08 = -Rp 1.910.000 -> -Rp 1.760.000
"Pengeluaran lain" seksi 06 = -Rp 470.000 -> -Rp 320.000
[7b] modal konfirmasi? = 0 | toast = ["Transaksi dihapus"]
[7b] saldo sebelum = 4545000 -> saldo sesudah (harap 3295000) = 3295000
```
Sumber: `actions.js:447-451` (`sale:delete`) dan `actions.js:463-465` (`expense:delete`) memanggil `store.deleteSale/deleteExpense` lalu `toast(..., 'success')` tanpa `confirm()` atau modal. Saya sudah mencari di `ui.js`, `pages.js`, `pages2.js`: tidak ada mekanisme undo/batal untuk transaksi. Catatan: probe "ada tombol undo?" di harness saya menghasilkan `true`, tapi itu false positive (yang cocok adalah tombol "Batal" di blok lain), jadi kesimpulan "tidak ada undo" saya ambil dari source, bukan dari probe itu.

**Dampak ke pengguna awam:** Satu salah ketuk menghapus bukti pengeluaran Rp 1.250.000 dan saldo langsung berubah Rp 1.250.000. Karena tidak ada undo, pemulihannya harus manual, dan kalau transaksinya sudah ikut tercetak di laporan, saya harus mencetak ulang. Untuk bendahara yang sering mengoreksi di depan forum, ini sumber data hilang yang nyata meskipun tidak disengaja.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Konfirmasi yang menyebut nominal, tanggal, dan kategori, misalnya "Hapus pengeluaran Rp 470.000 - Konsumsi, 22 Apr 2026?", minimal untuk transaksi bernilai di atas nominal tertentu. Tombol batal harus jadi default, bukan yang fokus. Kalau memungkinkan, simpan snapshot singkat agar bisa "Batalkan" dalam beberapa detik.

### [BUG-07] Baris Total tabel anggaran melanggar Alokasi - Realisasi = Sisa saat ada alokasi E-Money - TINGGI

**Persona dan use-case:** Saya memeriksa apakah anggaran SPPD masih cukup: jumlahkan kolom Alokasi, Realisasi, dan Sisa, lalu cek apakah Alokasi - Realisasi sama dengan Sisa.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, Seksi 08, tabel "Anggaran vs Realisasi per Komponen".
2. Catat baris Total di seed: Alokasi Rp 2.850.000, Realisasi Rp 1.910.000, Sisa Rp 940.000 -> 2.850.000 - 1.910.000 = 940.000, benar.
3. Seksi 01 SPPD -> alokasikan Rp 500.000 ke komponen "E-Money" (wallet E-Money).
4. Kembali ke tabel, hitung ulang.

**Harapan:** Baris Total selalu memenuhi Alokasi - Realisasi = Sisa, dan penjelasannya di bawah tabel ("Total realisasi tidak menjumlahkan E-Money agar tidak dobel hitung") menjadi jelas.

**Kenyataannya:** Setelah alokasi E-Money Rp 500.000, Total Alokasi menjadi Rp 3.350.000 (E-Money ikut dijumlahkan) tetapi Total Realisasi tetap Rp 1.910.000 dan Total Sisa Rp 940.000 (E-Money dikecualikan dari keduanya). 3.350.000 - 1.910.000 = **Rp 1.440.000**, sedangkan Sisa yang tertulis Rp 940.000. Selisihnya persis Rp 500.000, yaitu nilai alokasi E-Money. Baris detailnya sendiri benar (E-Money: alokasi 500.000, realisasi 0, sisa 500.000); yang salah hanya penjumlahan di baris Total.

**Evidence:**
```
E-Money = alokasi 500000 | realisasi 0 | sisa 500000
Total = alokasi 3350000 | realisasi 1910000 | sisa 940000
alokasi - realisasi = 1440000
BEDA dengan TOTAL sisa = 500000
kode totalAlokasi/Realisasi/Sisa = {"a":3350000,"r":1910000,"s":940000}
[seed] Total = alokasi 2850000 | realisasi 1910000 | sisa 940000
[seed] sama dengan TOTAL sisa? = true
tabel "per Wallet Tujuan": Bank alokasi 2250000 | Kas alokasi 350000 | E-Money alokasi 750000
jumlah alokasi per-wallet == TOTAL tabel? = true
ada baris TOTAL di tabel per-wallet-tujuan? = false
```
Sumber: `store.js:617` `totalAlokasi` menjumlahkan semua baris; `store.js:618-621` `totalRealisasi` dan `totalSisa` memfilter `r.kategori !== 'E-Money'`. Ketiga angka ini dicetak berdampingan di `pages2.js:516` (dan lagi di `pages2.js:975` untuk laporan cetak), jadi ketidakkonsistenan ikut tercetak.

**Dampak ke pengguna awam:** Saya akan menyimpulkan sisa anggaran Rp 940.000 padahal yang benar Rp 1.440.000, dan justru saat saya butuh tahu "apakah uang E-Money masih bisa dipakai", saya diberi angka yang terlambat Rp 500.000. Kalau saya sudah committing belanja Rp 500.000 berdasarkan angka itu, saya habis over budget tanpa ada peringatan. Di seed default bug ini tersembunyi karena alokasi E-Money masih 0; baru muncul setelah alokasi pertama.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Buat ketiga total dihitung dengan filter yang sama, lalu tampilkan E-Money sebagai baris memo di luar penjumlahan (atau masukkan baris Total kedua "Total tanpa E-Money"). Kalau memang niatnya menghindari dobel hitung, perlakukan E-Money sebagai pos-info dengan label berbeda, bukan diselipkan di antara Alokasi dan Realisasi dalam tabel yang menjumlahkan kolom.

### [BUG-08] Hapus produk master menghapus Rp 17.750.000 penjualan lintas event tanpa menyebut nominal - SEDANG

**Persona dan use-case:** Sekali saya salah mengelola produk, misalnya SKU lama sudah tidak dipakai. Saya hapus dari Master Produk, dan rekap semua event langsung berubah.

**Langkah reproduksi:**
1. Catat `store.globalReports()` di seed -> Total Penjualan Rp 25.555.000, Saldo Total Rp 36.670.000.
2. Master Produk -> hapus "Batik Tulis" (`prd-1`).
3. Catat ulang kedua angka.

**Harapan:** Konfirmasi-hapus menyebut dampaknya secara nominal, karena produk yang dihapus masih tertaut ke transaksi di 5 event berbeda.

**Kenyataannya:** Dialog konfirmasi ada, tapi hanya berbunyi "Produk ikut terhapus dari checklist & penjualan event", tanpa menyebut jumlah transaksi, nominal, atau event mana. Total Penjualan jatuh dari Rp 25.555.000 ke Rp 7.805.000 (selisih Rp 17.750.000) dan Saldo Total jatuh dari Rp 36.670.000 ke Rp 18.920.000. Tidak ada jalan undo.

**Evidence:**
```
penjualan prd-1 di semua event = 5 transaksi, total 17750000
event yang kehilangan transaksi = evt-1,evt-1,ev-d3,ev-d5,ev-d6
total penjualan global sebelum = 25555000 | total saldo global 36670000
total penjualan global sesudah = 7805000 (selisih -17750000)
total saldo global sesudah = 18920000 (selisih -17750000)
teks konfirmasi di UI = "Hapus produk? Produk ikut terhapus dari checklist & penjualan event." - tidak menyebut nominal
jumlah produk master = 7 (dari 8)
baris evt-1 di Rekap Global sesudah = Pameran UMKM Nusantara Expo 2026 jual Rp 1.230.000 biaya Rp 1.910.000 Rp 2.295.000
```
**Dampak ke pengguna awam:** Saya bisa menghapus 5 transaksi senilai Rp 17,75 juta hanya dengan satu konfirmasi yang tidak menjelaskan apa yang akan hilang. Setelah dihapus, semua rekap benar tapi salah, dan berat untuk direkonstruksi kalau ternyata tidak sengaja.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tampilkan ringkasan dampak di dialog: jumlah transaksi, total nominal, dan daftar event terdampak. Kalau produk masih punya transaksi, tawarkan Archive (nonaktifkan) alih-alih hapus.

### [BUG-09] Tiga dari tujuh kategori pengeluaran jatuh ke "Operasional Lain" yang tidak punya alokasi - SEDANG

**Persona dan use-case:** Saya mencatat biaya konsumsi dan operasional lewat form, lalu saya cocokkan dengan alokasi SPPD saya untuk melihat mana yang over.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, Seksi 08, tabel "Anggaran vs Realisasi per Komponen".
2. Bandingkan daftar kategori di form Seksi 06 dengan daftar komponen di tabel anggaran.
3. Lihat baris "Operasional Lain" dan hitung dari mana asalnya.

**Harapan:** Kategori yang bisa saya pilih di form punya komponen yang cocok di tabel anggaran, supaya saya bisa mengetahui pos mana yang over-budget.

**Kenyataannya:** Form Seksi 06 menawarkan: Penginapan, Konsumsi, Operasional, Uang Saku, Kas Kecil, BBM & Tol, Lainnya. Tabel anggaran punya: Penginapan, Sewa Transport, Transport Umum, Uang Saku, Kas Kecil, BBM & Tol, E-Money, Operasional Lain. "Konsumsi" dan "Operasional" (dan "Lainnya") tidak punya komponen sendiri, semuanya dibuang ke "Operasional Lain" yang di seed alokasinya Rp 0, sehingga baris itu langsung tampil Sisa **Rp -320.000** (warna merah, benar). "Akomodasi" dipetakan diam-diam ke "Penginapan" (Rp 150.000 masuk ke alokasi Rp 900.000), jadi kategori berbeda nama bisa masuk ke pos yang salah.

**Evidence:**
```
"Akomodasi" 150000 -> baris "Penginapan" di tabel anggaran
"Konsumsi" 120000 -> baris "Operasional Lain" di tabel anggaran
"Operasional" 200000 -> baris "Operasional Lain" di tabel anggaran
baris "Operasional Lain" di layar = alokasi 0 | realisasi 320000 | sisa -320000
isi form kategori (seksi 06) = Penginapan, Konsumsi, Operasional, Uang Saku, Kas Kecil, BBM & Tol, Lainnya
komponen tabel anggaran = Penginapan, Sewa Transport, Transport Umum, Uang Saku, Kas Kecil, BBM & Tol, E-Money, Operasional Lain
```
Sumber: `store.js:533` `BUDGET_POS` tidak memuat Konsumsi/Operasional/Lainnya; `store.js:588-589` jatuh ke `real['Operasional Lain']`.

**Dampak ke pengguna awam:** Saya belum tahu bahwa pilihan "Konsumsi" dan "Operasional" adalah dua pos yang berbeda, dan saya tidak akan pernah mengetahuinya kecuali saya membaca kode atau menghitung tebakan. Sisa negatif Rp 320.000 terlihat seperti kesalahan hitung aplikasi, padahal itu konsekuensi kategori yang tidak punya alokasi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Samakan daftar kategori form dan daftar komponen tabel anggaran satu-satu. Kalau memang mau ada pos "Operasional Lain" tanpa alokasi, beri baris alokasi Rp 0 dengan label jelas "tanpa alokasi" supaya yang terjadi bukan sisa minus yang Misterius. Ganti nama "Penginapan" supaya "Akomodasi" dan "Penginapan" tidak bercampur.

### [BUG-10] Satuan hardcode "pcs" untuk semua produk, padahal bisa pack/botol - SEDANG

**Persona dan use-case:** Saya Jugend stok fisik dalamcee amatan. Kalau rekap bilang "Kopi Bubuk Premium 30 pcs", saya akan menghitung 30 bungkus kopi = 30 pcs.

**Langkah reproduksi:**
1. Cek satuan asli produk: Batik Tulis=pcs, Kopi Bubuk Premium=pack, Minuman Herbal=botol.
2. Buka Seksi 05 "Rekap per Produk" dan lihat baris Kopi Bubuk Premium.
3. Buka `#/reports` (Rekap Global) bagian "Penjualan per Produk" dan lihat baris yang sama.

**Harapan:** Satuan mengikuti produk masing-masing (pack/botol/pcs).

**Kenyataannya:** Dua-duanya tulis "pcs" apa pun satuan produknya. Kopi Bubuk Premium (pack) tampil "30 pcs" di Seksi 05 dan "75 pcs" di Rekap Global. Seksi 03 bahkan punya sub-label "pcs/pack" yang mengakui satuan bisa beda, jadi inkonsistensinya terlihat jelas.

**Evidence:**
```
satuan asli produk = Batik Tulis=pcs, Tenun Ikat=pcs, Kopi Bubuk Premium=pack, Gantungan Kunci Kayu=pcs, Totebag Kanvas=pcs, Kripik Pisang=pack, Kerajinan Bambu=pcs, Minuman Herbal=botol
[Kopi Bubuk Premium] 30 pcsRp 1.050.000
Penjualan per Produk: Kopi Bubuk Premium75 pcsRp 2.625.000   [qty=75 | satuan=pack]
```
Sumber: `pages2.js:154` dan `pages2.js:780` - keduanya hardcode `' pcs'`.

**Dampak ke pengguna awam:** Saya menghitung fisik barang jadi salah. Kalau saya buat laporan stok fisik ke gudang, "30 pcs" untuk 30 pack kopi berarti saya melapor 30 bungkus tapi maksudnya 30 pcs = 10 pack, atau sebaliknya. Untuk bendahara yang ikut bertanggung jawab atas stock opname, ini memengaruhi nilai persediaan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pakai `satuan` dari masing-masing produk di kedua rekap. Kalau satu event punya campuran satuan, tampilkan qty per satuan ("30 pack / 12 pcs") atau tambahkan kolom satuan per baris.

### [BUG-11] Laporan cetak tidak memuat rekap penjualan dan tidak mewarnai saldo minus - SEDANG

**Persona dan use-case:** Saya cetak laporan untuk arsip dan lampiran SPJ.

**Langkah reproduksi:**
1. Di Seksi 06 atau 08, klik "Cetak Laporan" (panggil `A.printHTML()`).
2. Inventarisasi bagian yang ada: Event, SPPD, Transportasi, Pengeluaran Lain, Arus Kas per Wallet, Anggaran vs Realisasi, Alokasi per Wallet Tujuan, lalu ringkasan (Hasil penjualan, Total biaya, Penyesuaian kas, Saldo akhir).
3. Cari tabel penjualan/rekap produk dan tanda visual untuk saldo minus.

**Harapan:** Laporan memuat rekap penjualan (atau minimal rekap per produk), dan saldo minus ditandai jelas karena laporan ini jadi dokumen bertanda tangan.

**Kenyataannya:** Tidak ada tabel penjualan sama sekali, hanya total "Hasil penjualan". Tidak ada rekap produk. Tidak ada checklist hero. Saldo minus Rp -455.000 tercetak hitam polos tanpa warna apa pun, padahal di layar kartu Saldo punya sub-label "minus!". Baris "Realisasi terpakai" juga tidak ada di laporan. Dan tabel Arus Kas per Wallet yang tercetak adalah tabel yang sama persis dengan yang salah di layar (BUG-02), jadi dokumen resmi ikut mewarisi selisih Rp 2.500.000.

**Evidence:**
```
print: kata "minus"? = true
print: warna merah? = false
print: "Saldo akhir" = Rp -455.000
print: baris "Penyesuaian kas" = +Rp 475.000
print: Total tabel anggaran = Rp 2.850.000
print: Realisasi terpakai = undefined
print: ada tabel rekap produk? = false
print: ada tabel penyesuaian kas? = true
```
Sumber: `pages2.js:981-1000` (fungsi `printHTML`) - memang tidak punya blok penjualan/produk, dan `ui.fmt` dipakai polos tanpa kelas warna.

**Dampak ke pengguna awam:** Laporan yang saya tanda tangani kehilangan bagian yang justru paling penting bagi bendahara, yaitu dari mana uang masuk (rincian penjualan). Untuk laporan bulanan, saya harus lampirkan data penjualan terpisah. Dan angka minus yang tercetak hitam tanpa tanda peringatan bisa lolos saat direview.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan tabel penjualan (tanggal, produk, qty, harga, total, metode) dan/atau rekap per produk ke laporan. Warnai saldo minus dengan label "MINUS" atau warna merah di versi cetak. Pastikan tabel Arus Kas di laporan sudah konsisten dengan layar sebelum dipakai sebagai dokumen resmi.

### [BUG-12] Membuka Rekap Global menulis record SPPD baru ke localStorage - SEDANG

**Persona dan use-case:** Saya buka Rekap Global untuk melihat total semua event.

**Langkah reproduksi:**
1. Setelah `localStorage.clear()` + seed, catat jumlah record SPPD: 8, jumlah event: 9 (event `evt-2` "Gelar UMKM Kota 2026" belum punya SPPD).
2. Buka `#/reports` (Rekap Global).
3. Catat jumlah record SPPD lagi.

**Harapan:** Membuka halaman hanya membaca data; jumlah record tidak berubah.

**Kenyataannya:** Record SPPD bertambah dari 8 -> 9. `getSppd()` adalah getter yang **menyimpan**: kalau record tidak ada, dia membuat record baru (danaAwal 0, noSurat kosong) lalu menyimpannya. Record baru untuk `evt-2` punya id acak `id-muodn8n2-98th6h`. Setelah itu ada **dua** record SPPD tanpa nomor surat: `ev-d1` (`spp-d1`, danaAwal 0) dan `evt-2` (yang baru).

**Evidence:**
```
record SPPD sebelum membuka Rekap Global = 8 | jumlah event = 9
event tanpa SPPD di seed: evt-2 Gelar UMKM Kota 2026
record SPPD sesudah membuka Rekap Global = 9 (tambah 1)
record SPPD tanpa nomor surat = ev-d1 id=spp-d1 danaAwal=0 | evt-2 id=id-muodn8n2-98th6h danaAwal=0
```
Sumber: `store.js:384` (`getSppd` memanggil `saveSppd` saat record hilang), dipanggil oleh `budgetRealisasi` (`store.js:570`) dan `financeSummary` (`store.js:778`), yang keduanya dipanggil `globalReports()` (`store.js:822`) untuk setiap event.

**Dampak ke pengguna awam:** Saya baru membuka halaman, dan data saya berubah untuk-- yang tidak suka hal tak terduga (agent 16), ini menurunkan kepercayaan. Kalau nanti saya isi SPPD untuk `evt-2`, saya menemukan record sudah ada (kosong) dan mungkin bingung apakah itu datanya. Untuk jejak audit, dokumen SPPD bisa muncul tanpa pernah saya buat.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pisahkan fungsi baca dari fungsi tulis - `getSppd` harus read-only, dan pembuatan record harus eksplisit (tombol "Buat SPPD" di Seksi 01). Kalau memang mau auto-create, lakukan saat event dibuat, bukan saat halaman dibuka, dan beri record kosong tersebut status yang jelas.

### [BUG-13] Blok Dana Cair tidak pernah dibandingkan dengan Dana Awal - SEDANG

**Persona dan use-case:** Saya cek apakah semua dana tugas saya sudah benar-benar cair, dan apakah ada yang lebih dicairkan dari alokasi.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, Seksi 01, blok "Dana Cair - mana saja yang sudah masuk".
2. Baca angka yang ditampilkan di header blok.
3. Cari perbandingan dengan Dana Awal SPPD dan cari peringatan over-cair.

**Harapan:** Blok menampilkan "Sudah cair Rp 1.500.000 / Rp 2.500.000 (dana awal)" atau peringatan kalau total/cair melebihi alokasi.

**Kenyataannya:** Blok hanya menampilkan "Sudah cair Rp 1.500.000 / Rp 2.500.000" - angka pembaginya adalah **total** Dana Cair yang dicatat, bukan Dana Awal SPPD, dan tidak ada perbandingan ke alokasi maupun peringatan over-cair sama sekali. Di seed, ketiga event yang punya data justru selalu sama (evt-1: 2.500.000/2.500.000; evt-2: 4.000.000/4.000.000; ev-d6: 5.000.000/5.000.000), jadi tidak ada peringatan yang pernah terpicu, dan mechanism-nya memang tidak ada.

**Evidence:**
```
[evt-1] Pameran UMKM Nusantara Expo 20 | danaAwal 2500000 | total danaCair 2500000 | sudah cair 1500000
[evt-2] Expo Produk Lokal 2026 | danaAwal 4000000 | total danaCair 4000000 | sudah cair 4000000
[ev-d6] Pekan Inovasi Daerah | danaAwal 5000000 | total danaCair 5000000 | sudah cair 5000000
```
Catatan: probe harness yang mencari literal "dana cair melebihi dana awal" dan "1.000.000" menghasilkan `true`, tapi itu false positive (teks itu tidak ada di source). Kesimpulan diambil dari source `pages.js:371-401`, yang tidak merujuk `danaAwal` sama sekali.

**Dampak ke pengguna awam:** Saya harus menghitung mental lintas halaman untuk tahu apakah ada dana yang over-cair. Kalau saya salah input satu sumber dana Rp 5.000.000 di event beralokasi Rp 2.500.000, aplikasi diam saja, dan proporsi "Dana Cair" tidak menambah saldo, jadi efeknya tidak terlihat di halaman.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tampilkan Dana Awal SPPD sebagai pembanding di header blok, dan beri peringatan eksplisit kalau total Dana Cair > Dana Awal. Kalau Dana Cair adalah pengeluaran dari Kas Instansi (bukan pemasukan), beri label supaya tidak disalahartikan sebagai tambahan saldo.

### [BUG-14] Impor backup dengan nominal berformat teks diterima lalu berubah jadi Rp 0 - SEDANG

**Persona dan use-case:** Saya backup/restore, atau menerima file JSON dari rekan yang nominalnya masih format Excel (`"1.250.000"` dengan titik).

**Langkah reproduksi:**
1. Seed, lalu ambil dump JSON.
2. Ubah `sales[0].total` jadi string `"1.250.000"`, `sales[0].hargaSatuan` jadi `"250.000"`, `expenses[0].jumlah` jadi `"150.000"`, `kasAdj[0].jumlah` jadi `"500.000"`.
3. Panggil `store.importJSON()` dengan dump itu.
4. Buka `#/events/evt-1`, Seksi 05.

**Harapan:** Impor menolak data dengan nominal non-numerik, atau setidaknya mengotomatis parsing `"1.250.000"` menjadi 1250000.

**Kenyataannya:** Import diterima tanpa error. `store.load().sales[0].total` tetap berupa string `"1.250.000"`. Karena semua perhitungan memakai `Number(x) || 0`, string itu jadi `NaN` lalu jatuh ke `0`. Di layar, transaksi Rp 1.250.000 berubah jadi **Rp 0**, dan pengeluaran Rp 150.000 jadi **Rp 150** (`Number("150.000")` = 150). Saldo dan rekap ikut berubah tanpa satu pun pesan error.

**Evidence:**
```
importJSON error? = 0 (0 = diterima tanpa validasi)
sales[0].total di store = "1.250.000" tipe=string
Number("1.250.000") = NaN
baris transaksi sal-1 di layar = 2026-04-22 Batik Tulis 5 Rp 250 QRIS QRIS Rp 0 Hapus
baris pengeluaran exp-1 di layar = 2026-04-22 Akomodasi Top-up biaya antar ke venue Kas Rp 150 Hapus
jumlah toast error = 9 (semua dari langkah sebelumnya, tidak satu pun dari import)
```
Sumber: `store.js` `importJSON` hanya memvalidasi bentuk file (harus object dengan array `events`), tidak memvalidasi tipe/isi angka. `ui.fmt` (`ui.js:17-20`) memakai `Number(n) || 0`, yang mengubah `NaN` jadi `0` diam-diam.

**Dampak ke pengguna awam:** Saya restore backup dan semua penjualan jadi nol atau jadi pembulatan aneh, tanpa ada yang memberi tahu. Kalau saya baru melirik laporan, saya tidak akan curiga penyebabnya file backup-nya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Validasi semua field nominal saat impor: harus finite number, dan kalau string, coba parse format `Rp`/pemisah ribuan lalu tolak kalau ambigu. Tampilkan ringkasan "N baris ditolak" sebelum menimpa data yang ada. Jangan pernah diam-diam mengubah nilai jadi 0; `Number(x) || 0` sebaiknya diganti dengan sesuatu yang setidaknya menandai nilai tidak valid sebagai tanda hubung.

### [BUG-15] Sub-label kartu "Penyesuaian Kas" hanya mengulang nilai net dan selalu menulis "- Rp 0" - RENDAH

**Persona dan use-case:** Saya perlu tahu pos penyesuaian mana yang masuk dan mana yang menarik kas, misalnya selisih opname.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, Seksi 06, kartu "Penyesuaian Kas".
2. Baca nilai dan sub-labelnya, lalu bandingkan dengan daftar catatan penyesuaian kas di bawahnya.

**Harapan:** Sub-label menunjukkan komposisi, misalnya "+ Rp 500.000 / - Rp 25.000", sehingga saya tahu ada pengurangan.

**Kenyataannya:** Kartu menampilkan `Rp 475.000` dengan sub-label `+ Rp 475.000 / - Rp 0`. Padahal ada **dua** catatan: setoran kas Rp 500.000 (24 Apr) dan selisih opname **-Rp 25.000** (25 Apr). Jadi ada pengurangan Rp 25.000, tapi sub-label menulis "- Rp 0", karena sub-label itu dihitung dari nilai **net** yang sama, jadi tidak pernah bisa membedakan "tidak ada adjustment negatif" dari "ada adjustment negatif".

**Evidence:**
```
Penyesuaian Kas | Rp 475.000 | sub="+ Rp 475.000 / - Rp 0"
2026-04-25 | Selisih kas opname = -25000 | wallet=Kas
2026-04-24 | Setoran kas dari tim panitia (di luar transaksi booth) = 500000 | wallet=Kas
```
Sumber: `pages2.js:210` - `'+ ' + fmt(max(n,0)) + ' / - ' + fmt(max(-n,0))` dengan `n` = net.

**Dampak ke pengguna awam:** Saya mengira semua penyesuaian masuk, padahal ada opname minus Rp 25.000 yang tidak kelihatan di kartu. Untuk selisih opname yang besar (ratusan ribu), ini cukup untuk membuat saya salah menjelaskan kenapa saldo berbeda dari uang fisik di tangan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Hitung sub-label dari jumlah catatan positif dan negatif secara terpisah (bukan dari net), atau tampilkan jumlah catatan: "2 catatan, 1 jadi, 1 pulls".

### [BUG-16] Format angka tidak konsisten (desimal, tanda minus, minus nol, NaN tersembunyi) - RENDAH

**Persona dan use-case:** Saya baca angka cepat di tabel dan di laporan, kadang di HP dengan layar kecil.

**Langkah reproduksi:**
1. Hitung ulang beberapa format lewat `A.fmt`.
2. Ambil semua string nominal di tabel Arus Kas per Wallet.

**Harapan:** Semua nominal rupiah bulat tanpa desimal, satu gaya tanda minus, dan nilai tidak valid tampil sebagai tanda hubung bukan Rp 0.

**Kenyataannya:** Empat hal kecil. Pertama, `fmt(1234567.891)` = `Rp 1.234.567,891`, tiga desimal untuk nominal rupiah. Kedua, `fmt(NaN)` = `Rp 0`, nilai tidak valid berubah jadi nol. Ketiga, tanda minus dipakai dua gaya: kolom Saldo memakai ASCII `-` (`Rp -205.000`) sementara kolom Masuk/Keluar memakai U+2212 (`-Rp 0` dengan minus tipografis). Keempat, muncul "minus nol" seperti `-Rp 0` di kolom Keluar untuk Bank/QRIS/E-Money, sementara kolom lain menampilkan `Rp 0`.

**Evidence:**
```
fmt(3480000) = Rp 3.480.000
fmt(-205000) = Rp -205.000
fmt(NaN) = Rp 0
fmt(1234567.891) = Rp 1.234.567,891
fmt(999) = Rp 999
tanda minus di tabel arus kas = Rp 1.000.000, -Rp 0, Rp 1.000.000, Rp 1.250.000, -Rp 0, Rp 1.250.000, Rp 1.730.000, -Rp 1.935.000, Rp -205.000, Rp 0, -Rp 0, Rp 0
```
Sumber: `ui.js:17-20` (`toLocaleString('id-ID')` tanpa opsi pembulatan; `Number(n) || 0`), `pages2.js:490` vs `pages2.js:968` (gaya minus hardcode berbeda di layar vs cetak).

**Dampak ke pengguna awam:** "Rp 1.234.567,891" bikin saya mengira ada komponen pecahan; "Rp 0" untuk data rusak bikin saya percaya ada transaksi Rp 0; dua gaya minus dan "minus nol" bikin saya baca tabel lambat saat buru-buru. Sendiri kecil, tapi semuanya soal parsing cepat.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Bulatkan nominal ke rupiah penuh saat format (atau toleransi desimal hanya di kalkulator), samakan semua tanda minus (pakai U+2212 atau ASCII, pilih satu), dan tampilkan tanda hubung untuk nilai tidak valid alih-alih `Rp 0`.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Angka dasarnya benar.** `financeSummary().saldo` untuk evt-1 = Rp 4.545.000, identik dengan hitung manual saya (Dana Awal 2.500.000 + Penjualan 3.480.000 + Penyesuaian 475.000 - Transport 1.440.000 - Pengeluaran lain 470.000). Kartu Penjualan, Pengeluaran, dan Saldo semuanya cocok dengan hitung manual.
- **Blok "Rekap Penggunaan Uang" (Seksi 08) balance dengan benar.** Enam barisnya (Dana Awal, Hasil penjualan, Transport, Pengeluaran lain, Penyesuaian kas, Saldo akhir) konsisten dan menghasilkan saldo yang sama dengan `financeSummary`. Ini blok yang benar; blok "Bandingkan" di sebelahnya yang bermasalah.
- **Rekap per produk (Seksi 05) akurat di seed.** Jumlah nominal baris = "Total Terjual" = Penjualan = Rp 3.480.000; qty dari rekap = qty dari transaksi = 51.
- **Rekap Global konsisten.** Total Penjualan Rp 25.555.000 = penjumlahan manual semua transaksi; Saldo Total Rp 36.670.000 = jumlah saldo per 9 event; jumlah nominal "Penjualan per Produk" = kartu "Total Penjualan"; qty 223 cocok dengan sub "223 barang". Seksi 05, kartu Seksi 06, hero, dan Rekap Global semuanya menunjukkan saldo evt-1 = Rp 4.545.000 (konsisten).
- **Pemeriksaan kontra di seed bersih.** Semua transaksi punya `total = qty x harga` (0 yang salah); untuk semua event, total realisasi tabel anggaran = pengeluaran dan `Alokasi - Realisasi = Sisa` (seed alokasi E-Money masih 0, jadi BUG-07 belum muncul).
- **Validasi stok penjualan bekerja dengan sangat baik.** Qty 999 ditolak dengan pesan jelas: "Stok tidak cukup - sisa 11. Qty > sisa (dibawa - terjual - rusak)". Pola validasi yang benar sudah ada di sini dan form pengeluaran, tinggal dipakai untuk harga.
- **Pengeluaran menolak jumlah kecil dari 0** dengan toast error "Jumlah wajib lebih dari 0".
- **Sisa anggaran negatif diwarnai merah** (`#B91C1C`, `pages2.js:502`) - jadi kebocoran budget kelihatan.
- **Selisih total alokasi vs Dana Awal SPPD sudah ditampilkan** ("Dana Awal SPPD: Rp 2.500.000 - selisih +Rp 350.000 dari total alokasi") - pola "bandingkan dan beri tahu" yang bagus, cuma belum dipakai di blok lain.
- **Hero jadi tidak centang saat saldo minus** untuk event yang punya Dana Awal (evt-1 dengan saldo Rp -455.000 menampilkan bulatan "Saldo aman", bukan centang) - benar untuk kasus umum.
- **Impor JSON menolak file yang bukan backup** ("Format backup tidak dikenali") - ada validasi bentuk dasar.
- **Laporan cetak punya blok tanda tangan** ("Mengetahui, ______") dan tetap memuat tabel Penyesuaian Kas serta baris Total anggaran.
- **Uang Saku punya wallet E-Money** di alokasi seed (`{ id: 'bg-4', kategori: 'Uang Saku', wallet: 'E-Money' }`), jadi mapping wallet sudah ada. Koneksi "komponen ke wallet tujuan" bukan hal yang baru harus dibangun.

## Pertanyaan terbuka / perlu konfirmasi

- Apakah "Realisasi" manual (BUG-01) **benar-benar disengaja** diabaikan (misal karena deprecated tapi UI-nya belum dibersihkan), atau ini regresi? Kalau memang deprecated, formnya sebaiknya disembunyikan atau diberi label jelas.
- **BUG-02** - perlu keputusan produk: apakah Dana Awal SPPD harus dipetakan ke wallet tujuan (dari Rincian Alokasi) supaya tabel Arus Kas bisa rekonsiliasi penuh, atau memang cukup jadi "Saldo Akhir = kolom Saldo + Dana Awal"? Dua pembacaan berbeda menghasilkan UX yang sangat berbeda.
- **BUG-07** - perlu konfirmasi apakah "Total realisasi tidak menjumlahkan E-Money" (keterangan di `pages2.js:498`) memang disengaja sebagai pos memo, atau konsekuensi filter yang tidak ikut diterapkan ke `totalAlokasi`. Kalau disengaja, pertanyaannya kenapa `totalAlokasi` ikut menjumlahkannya.
- **BUG-12** - apakah record SPPD yang otomatis dibuat juga muncul di halaman lain (Dashboard, Arsip, daftar event) yang memanggil `financeSummary` per event? Saya hanya mengonfirmasi efeknya di Rekap Global; halaman lain belum saya uji khusus.
- **BUG-08** - apakah ada backup/export sebelum hapus produk? Kalau ada, tingkat keparahan bisa turun dari SEDANG.
- Saya menjalankan harness secara sinkron setelah semua skrip app termuat (semua pemeriksaan saya baca saat itu). Aplikasi nyata (`index.html`) belum saya uji untuk skenario yang sama, khusus untuk memastikan tidak ada perbedaan perilaku antara harness dan app asli (misal karena urutan render). Perlu konfirmasi kalau tim mau reproduksi manual.
- **BUG-14** - format nominal apa yang WhatsApp/Excel biasanya dipakai user? Kalau string `"1.250.000"` umum terjadi, prioritas perbaikannya lebih tinggi.
- Dua probe harness saya menghasilkan false positive yang saya tandai eksplisit di atas (probe "undo" di BUG-06 dan probe peringatan Dana Cair di BUG-13). Semua kesimpulan untuk dua temuan itu diambil dari source, bukan dari probe.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Kepercayaan angka yang tampil | 2 | Angka dasarnya benar (financeSummary cocok dengan hitung manual, Rekap Global konsisten), tapi ada 7 temuan TINGGI di mana angka yang ditampilkan berbeda dari angka yang harusnya: A-R tidak sama S, saldo wallet tidak sama saldo akhir, blok Bandingkan tidak sama saldo. |
| Rekonsiliasi kas | 1 | Tabel Arus Kas per Wallet tidak bisa direkonsiliasi dengan Saldo Akhir (selisih Rp 2.500.000 tanpa penjelasan, tanpa baris total/saldo awal), Dana Cair tidak punya wallet, blok Dana Cair tidak dibandingkan ke Dana Awal. |
| Report pertanggungjawaban | 2 | Blok "Rekap Penggunaan Uang" benar, tapi blok "Bandingkan SPPD" (yang paling sering dipakai) salah balance, dan field "Realisasi" manual diabaikan sama sekali. Laporan cetak juga kehilangan rekap penjualan. |
| Validasi input | 2 | Stok dan jumlah pengeluaran divalidasi dengan baik (pesan jelas), tapi harga satuan penjualan menerima 0/kosong/minus dan toast-nya berwarna sukses. Import file dengan nominal rusak diterima tanpa warning. |
| Pencegahan kesalahan diam-diam | 1 | 3 kasus hasil salah tanpa ada tanda: saldo minus diberi centang "Saldo aman" (danaAwal 0), sisa anggaran E-Money salah di baris Total, dan nominal string jadi Rp 0. Semuanya lolos karena tidak ada validasi atau penanda. |
| Kecepatan menemukan jawaban | 2 | Informasi tersebar: saldo ada di kartu, baris, hero, subjudul seksi, dan Rekap Global (semuanya konsisten, bagus), tapi "dari mana asal uang" harus direkonstruksi manual dari blok yang salah balance. |
| Pembersihan data (hapus) | 2 | Validasi stok dan pengeluaran ada, tapi menghapus transaksi keuangan terjadi dalam satu klik tanpa konfirmasi dan tanpa undo. Hapus produk master ada konfirmasi tapi tidak menyebut nominal dampaknya. |
