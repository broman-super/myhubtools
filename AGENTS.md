# AGENTS.md — REYNAHUB / UNITOOLS

Panduan repo untuk AI coding agent (opencode, Claude, Cursor, dll.).

**Sebelum membuat/mengubah webtool, baca `docs/guidebook/README.md` →**
[`PANDUAN-TOOL-BARU.md`](docs/guidebook/PANDUAN-TOOL-BARU.md) (langkah cepat) →
[`design.md`](docs/guidebook/design.md) (sistem desain & konstitusi wajib).

## Aturan cepat

- Satu navbar, satu tema, satu bahasa desain; tool self-contained. Token, bukan hex.
- Hash rute di `src/core/router.js` **stabil** — jangan ubah hash tool lama.
- Folder tool **kebab-case**.
- Tool baru: daftar di `src/components/tool-card.js` + `src/core/router.js`. `group` kartu harus salah satu grup yang ada (`analitik`, `operasional`, `dokumen`, `tim`); grup baru = tambah section `#grid-<group>` + tombol sidebar di `index.html`. `src/sw.js` tidak perlu diubah.
- Edit kode lama: **jangan hapus fungsi yang sudah ada** (apa pun permintaannya).
- Skill `web-gas-dev` dan `bro-ui` wajib dipakai bila relevan.
- Backend GAS di `gas/*.gs`; tulis data selalu `POST text/plain;charset=utf-8`.
- Tool yang menulis data wajib mengirim kunci tim: header `x-write-token` (Supabase) atau field `token` (GAS). Setup & uji: [`docs/SECURITY.md`](docs/SECURITY.md).
- Commit/push **hanya jika diminta**.

## Cara berperilaku

Kamu bekerja di repo tool internal yang dipakai tim tiap hari. Salah warna atau satu
kurung kurawal salah tempat = seluruh tool mati. Jadi: hati-hati, sempit, dan buktikan.

1. **Baca dulu, jangan menebak.** Sebelum mengubah tool, baca file tool itu dan
   `README.md` satu foldernya. README tool mencatat bug yang pernah terjadi dan
   aturan anti-regresi. Bug yang kamu ulang adalah bug yang sudah dibayar orang lain.
2. **Jangan mengubah apa pun sebelum tahu penyebabnya.** Kalau user bilang "masih
   belum berubah", jangan menambah tambalan baru di atas tambalan lama. Cari dulu
   kenapa perubahan sebelumnya tidak berpengaruh (salah fungsi, salah file, nilai
   ditimpa belakangan).
3. **Satu masalah, satu titik akar, satu perbaikan.** Jangan sekalian merapikan,
   mengganti nama, atau memindahkan kode. Refactor hanya kalau diminta.
4. **Jangan menyalin aturan ke banyak tempat.** Kalau satu aturan (mis. warna kanal)
   dibutuhkan di layar dan dua mode cetak, buat satu helper dan panggil dari semua
   tempat. Salinan yang menyebar adalah akar bug: satu tempat terlewat, tampilan
   jadi tidak konsisten.
5. **Render tidak boleh mengubah data.** Hitung nilai tampilan ke variabel lokal;
   jangan menulis balik ke objek state saat menggambar.
6. **Jangan menyembunyikan error.** Dilarang `catch {}` kosong, test yang dilemahkan,
   atau menurunkan assertion supaya hijau. Kalau gagal, perbaiki penyebabnya.
7. **Tidak menambah dependency, config, atau file baru** kalau beberapa baris di file
   yang ada sudah cukup.

## Cara memecahkan masalah

Urutan yang dipakai untuk setiap bug, tanpa lompat langkah:

1. **Reproduksi.** Tentukan pemicu konkret: input apa, layar mana, data bulan apa.
   Tanpa kasus nyata, jangan menyentuh kode.
2. **Lokalisasi.** Telusuri dari gejala ke sumber: cari nama fungsi yang dipakai layar
   itu, bukan semua file. Pakai `grep`/pencarian kode untuk menemukan semua tempat
   nilai yang sama dipakai — sering ada salinan kedua yang ikut menimpa.
3. **Buktikan penyebabnya.** Tunjukkan baris yang salah dan mengapa. Kalau belum bisa
   menunjuk satu baris, berarti masih menduga.
4. **Perbaiki di akar, sekecil mungkin.** Hapus kode yang salah, jangan menumpuk kode
   baru di atasnya. Kalau perlu menambah, tambahkan sesedikit mungkin.
5. **Verifikasi.** Lihat bagian di bawah. Laporkan hasil nyata, bukan dugaan.
6. **Sebutkan risiko sisa.** Bagian yang tidak kamu uji harus disebut, bukan didiamkan.

## Verifikasi wajib untuk tool HTML single-file

Tool seperti `Productive/planner/taskschedule.html` menaruh seluruh logika di dalam
`<script>` inline. Satu kurung salah = halaman putih tanpa pesan. Setelah mengedit:

- Jalankan `node --check` untuk **setiap** blok `<script>` inline (ekstrak dulu, jangan
  cek file HTML-nya langsung). Ini menangkap syntax error yang tidak terlihat mata.
- Jalankan test yang ada: `node --test "tests/*.test.js"` (bentuk `node --test tests/`
  gagal di Node 24 — jangan dipakai).
- Sebut perintah yang kamu jalankan dan hasilnya di laporan akhir.
- Kalau tidak membuka browser, katakan verifikasinya statis. Jangan klaim "sudah tampil".

## Yang dilarang

- Menghapus atau mengganti nama fungsi, action GAS, atau hash rute yang sudah ada.
- Mengubah `GAS_URL`, kontrak `POST text/plain`, atau nama key `snake_case` yang
  dipertukarkan frontend↔backend.
- Menambah hex warna baru di tengah kode; pakai token atau nilai kanal yang sudah ada.
- Commit, push, atau deploy tanpa diminta.
- Menyatakan selesai tanpa satu pun pemeriksaan dijalankan.

## Format laporan akhir

1. Akar masalah, satu-dua kalimat, dengan `file:baris`.
2. Apa yang diubah dan mengapa hanya itu.
3. Verifikasi: perintah yang dijalankan + hasil (jumlah pass/fail).
4. Yang belum dicek atau risiko sisa.

Tulis dalam bahasa yang dipakai user. Jangan mengulang cerita proses; pembaca hanya
butuh sebab, perbaikan, dan bukti.
