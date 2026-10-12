# Spesifikasi Website — Form Pengajuan Biaya Perjalanan Dinas SUPERSUB

## Tujuan

Buat website HTML yang menggantikan pengisian laporan Excel/PDF **FORM PENGAJUAN BIAYA PERJALANAN DINAS**. Pengguna harus dapat mengisi laporan secara manual melalui browser tanpa membuka Excel.

Dokumen referensi yang menjadi dasar struktur adalah laporan 1 halaman yang diberikan pengguna. Struktur dan istilah harus dipertahankan, bukan diganti dengan format laporan baru.

## Referensi Isi

Dokumen referensi memiliki:
- Judul: **FORM PENGAJUAN BIAYA PERJALANAN DINAS**
- PEMBERI TUGAS
- DEPARTEMEN
- TANGGAL DAN JAM BERANGKAT
- TANGGAL DAN JAM KEMBALI
- TRANSPORTASI
- KOTA TUJUAN
- TARGET PEKERJAAN 1–3
- BIAYA-BIAYA
- BIAYA SPJ
- Maker / Checker / Signer

Contoh pada laporan:
- Pemberi tugas: Direktur
- Departemen: SUPERSUB
- Berangkat: 3-Jul-26, 09.00 WIB
- Kembali: 5-Jul-26
- Transportasi: Kendaraan Pribadi
- Kota tujuan: BANYUMAS
- Target pekerjaan: Membuka Stan di Event MAG Enduro 2026
- Biaya: BBM Pertalite Rp300.000 dan Kas Kecil Rp200.000
- Petugas SPJ: FIRMAN dan R.M TAQWA
- Maker: Firman M., Supervisor
- Checker: R.M Taqwalegawa, Head of HRD
- Signer: Kusna S., Direktur

## Layout yang Harus Dipertahankan

Gunakan **A4 landscape** saat dicetak.

Urutan visual:
1. Judul besar di tengah.
2. Tabel informasi perjalanan di bagian atas.
3. Kotak logo/perusahaan di kanan atas.
4. Tabel target pekerjaan.
5. Bagian BIAYA-BIAYA.
6. Bagian BIAYA SPJ.
7. Total biaya.
8. Tiga kolom tanda tangan: Maker, Checker, Signer.

Tampilan harus menyerupai spreadsheet/form perusahaan:
- border hitam tegas,
- tabel rapat,
- font sans-serif seperti Arial,
- header tabel biaya berwarna biru/cyan,
- total penginapan dapat diberi highlight hijau,
- ruang tanda tangan cukup tinggi,
- jangan menggunakan desain dashboard modern yang mengubah bentuk laporan.

## Field yang Bisa Diisi

### Informasi Perjalanan

- Pemberi Tugas
- Departemen
- Tanggal berangkat
- Jam berangkat
- Tanggal kembali
- Jam kembali
- Transportasi:
  - Kendaraan Pribadi
  - Travel
  - Kereta Api
  - Lainnya / Pesawat Terbang
- Kota Tujuan
- Target pekerjaan 1
- Target pekerjaan 2
- Target pekerjaan 3

### BIAYA-BIAYA

Kolom:
- NO
- ITEMS
- JUMLAH
- KETERANGAN

Sediakan beberapa baris kosong untuk item tambahan.

### BIAYA SPJ

Kolom utama:
- No
- Yang Bertugas
- Uang Weekday
  - Qty
  - @
  - Jumlah
- Uang Weekend
  - Qty
  - @
  - Jumlah
- Penginapan
  - Qty
  - @
  - Jumlah
- Lain lain / Konsumsi

Sediakan minimal 5 baris petugas.

## Perhitungan Otomatis

Website wajib menghitung:
- Jumlah Weekday = Qty × @
- Jumlah Weekend = Qty × @
- Jumlah Penginapan = Qty × @
- Total biaya lain-lain/konsumsi
- Total BIAYA-BIAYA
- Total seluruh biaya perjalanan dinas

Rumus:

```text
Total Biaya Item
= SUM seluruh JUMLAH pada tabel BIAYA-BIAYA

Total Weekday
= SUM(Qty Weekday × @ Weekday)

Total Weekend
= SUM(Qty Weekend × @ Weekend)

Total Penginapan
= SUM(Qty Penginapan × @ Penginapan)

Total Lain-lain
= SUM seluruh input Lain-lain/Konsumsi

TOTAL BIAYA
= Total Biaya Item
+ Total Weekday
+ Total Weekend
+ Total Penginapan
+ Total Lain-lain
```

Format angka harus Rupiah Indonesia, contoh:

```text
Rp 300.000
Rp 1.690.907
Rp 2.190.907
```

## Tanda Tangan

Buat 3 kolom:
- Maker
- Checker
- Signer

Masing-masing mempunyai:
- ruang tanda tangan,
- Nama,
- Jabatan,
- Tanggal.

Data contoh:
- Maker: Firman M. — Supervisor
- Checker: R.M Taqwalegawa — Head of HRD
- Signer: Kusna S. — Direktur

## Fitur Website

### Wajib
1. Form dapat diedit langsung di browser.
2. Perhitungan biaya otomatis saat angka berubah.
3. Tombol **Cetak / Simpan PDF** menggunakan `window.print()`.
4. Print layout A4 landscape.
5. Tombol **Simpan di Browser** menggunakan `localStorage`.
6. Tombol **Muat Data**.
7. Tombol **Reset**.
8. Tidak membutuhkan server untuk fungsi dasar.
9. Tidak membutuhkan framework atau library eksternal.
10. Bisa dibuka cukup dengan double-click file `.html`.

### UX

Input harus terasa seperti mengisi form Excel:
- klik sel → ketik,
- angka biaya dapat langsung diubah,
- hasil perhitungan tidak perlu diketik manual,
- data tidak hilang ketika halaman dicetak,
- warna dan border tetap jelas pada hasil print.

## Ketentuan Visual

Jangan mengubah struktur menjadi:
- dashboard kartu,
- sidebar,
- form wizard,
- tabel modern dengan banyak rounded corner,
- tampilan mobile-first yang merusak bentuk laporan desktop.

Prioritas utama adalah **kemiripan dengan laporan referensi**.

Untuk layar:
- gunakan canvas/form sekitar 1120px,
- putih di atas background abu-abu tipis,
- tabel berada di tengah.

Untuk print:
- A4 landscape,
- margin kecil,
- toolbar dan tombol tidak ikut tercetak.

## Ketentuan Teknis

Buat minimal 2 file:

```text
index.html
README_AI.md
```

`index.html` harus self-contained:
- HTML
- CSS
- JavaScript

Tidak perlu:
- React
- Vue
- Bootstrap
- Tailwind
- database
- backend

Jika suatu saat ingin dikembangkan menjadi aplikasi multi-user, struktur JavaScript harus tetap mudah dipindahkan ke backend/API.

## Prinsip Pengembangan Berikutnya

Jika diminta menambah fitur, **jangan merombak layout utama**.

Fitur yang dapat ditambahkan kemudian:
- nomor dokumen otomatis,
- upload logo SUPERSUB,
- tanda tangan digital,
- export PDF,
- export Excel,
- database riwayat perjalanan,
- pencarian laporan,
- filter berdasarkan tanggal,
- approval Maker → Checker → Signer,
- login user,
- daftar karyawan/petugas,
- template tarif uang harian,
- otomatis menghitung jumlah hari perjalanan,
- otomatis mengisi tarif berdasarkan hari kerja/weekend.

Setiap fitur baru harus mempertahankan tampilan laporan utama.

## Instruksi Singkat untuk AI

> Buat dan kembangkan website Form Pengajuan Biaya Perjalanan Dinas SUPERSUB berdasarkan spesifikasi ini. Pertahankan struktur tabel, istilah, urutan bagian, dan gaya visual seperti laporan referensi. Jangan mengganti laporan menjadi dashboard modern. Semua field harus dapat diisi manual melalui browser. Semua perhitungan biaya harus otomatis. Hasil akhirnya harus bisa dicetak sebagai A4 landscape dengan layout yang menyerupai dokumen sumber. Jika menambahkan fitur baru, pertahankan layout utama dan jangan menghapus field yang sudah ada.
