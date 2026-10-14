# PANDUAN UNTUK AI — Proyek "SPPD Generator"

> Baca file ini **sebelum** mengubah apa pun. Tujuannya agar kamu paham maksud proyek, bukan hanya isi kodenya.

## 1. Maksud proyek (apa & kenapa)

Perusahaan (PT Elfiqa Karya Triangga) memakai **Form Pengajuan Biaya Perjalanan Dinas (SPPD)** berbentuk Excel yang dicetak A4 landscape. Pemilik proyek ingin:

1. **Print View** — tampilan form yang *persis* seperti form Excel aslinya (1 halaman A4 landscape, siap cetak/PDF).
2. **Halaman Pengisian** — wizard bertahap supaya orang tidak mengisi form Excel langsung.
3. **Riwayat berbentuk file** — setiap form yang disimpan menjadi **file** (.html print view) yang bisa dipreview & diunduh kapan saja, tampilannya identik dengan Print View.

Pengguna pemilik proyek **pemula**, mengandalkan AI untuk keputusan teknis & visual. Stack: **HTML/CSS/JS vanilla + Google Apps Script (GAS)**, tanpa framework & tanpa build tool.

## 2. Isi proyek

| File | Peran |
|---|---|
| `Index.html` | **Seluruh frontend** (UI wizard, riwayat, preview, renderer print view). 1 file. |
| `Code.gs` | Backend GAS: simpan/baca/hapus riwayat + profil perusahaan (Sheet + Drive). |
| `PANDUAN_AI.md` | File ini. |

`Index.html` bisa dibuka di luar GAS (mis. hosting biasa) → otomatis masuk **Mode Demo** (data di `localStorage`). Di GAS → memakai `google.script.run`.

## 3. Arsitektur & aturan emas

**Renderer tunggal.** Fungsi `buildHTML(data)` di `Index.html` adalah *satu-satunya* sumber tampilan form. Ia menghasilkan dokumen HTML lengkap (CSS inline, A4 landscape). Hasilnya dipakai untuk: review di wizard, preview riwayat, file yang disimpan ke Drive, unduhan, dan cetak.
- ❌ Jangan membuat renderer kedua (mis. di `Code.gs`). Tampilan akan berbeda-beda.
- ✅ Mau ubah tampilan form? Ubah `PRINT_CSS` / `buildHTML()` saja.

**Server hanya penyimpan.** `Code.gs` tidak tahu soal tampilan. Ia menerima `{json, html, meta}` lalu menyimpannya.

**Adapter.** Semua pemanggilan backend lewat `api(fn, arg)`. Di GAS → `google.script.run` (dengan failure handler). Di luar GAS → objek `mock`. Jika menambah fungsi backend, **tambahkan di tiga tempat**: `Code.gs`, objek `mock`, dan pemanggilnya.

**Aturan dari pemilik proyek:**
1. **Jangan hapus fungsi/kode yang tidak diminta dihapus.** Edit sempit (surgical), bukan rewrite total. Setelah edit, cek: semua fungsi lama masih ada, semua `id`/`class` yang dipakai JS masih ada di HTML. Jika sengaja menghapus sesuatu, **sebut eksplisit** ke pemilik.
2. Tampilan harus rapi & profesional tanpa diminta, responsif (mobile OK).
3. Jangan pakai `alert()` untuk notifikasi → pakai `toast()`.
4. Setiap `google.script.run` wajib punya `withFailureHandler` (sudah ada di `api()`).
5. Tetap kompatibel GAS: tanpa Node/npm/bundler; fungsi server tidak boleh `async`; kembalian server harus data biasa (string/number/object/array — **jangan Date**; simpan tanggal sebagai string ISO).
6. Ingatkan pemilik: perubahan di GAS baru tampil setelah **Deploy → Manage deployments → Edit → New version → Deploy**.

## 4. Skema data (objek `S` / kolom JSON)

```js
{
  id,
  perusahaan: { nama, logo:'dataURL', wmMode:'teks|logo|gambar|off', wmImg:'dataURL' },
  pemberiTugas, departemen,
  tglBerangkat:'YYYY-MM-DD', jamBerangkat:'09.00 WIB',
  tglKembali:'YYYY-MM-DD', ketKembali:'sampai dengan selesai',
  transport:{ pribadi:bool, travel:bool, kereta:bool, lainnya:'teks' },
  kota, target:[t1,t2,t3],
  biaya:[ {item,jumlah,ket} ],            // 1–8 item (huruf A–H), MAX_BIAYA = 8
  // Biaya SPJ = EMPAT DAFTAR INDEPENDEN, tidak terikat per orang (maks CONFIG.maxSpjRows = 6 per daftar)
  petugas:   [ 'nama', ... ],
  uangSaku:  [ {wq,wa,eq,ea}, ... ],      // weekday qty/@ , weekend qty/@
  penginapan:[ {q,a}, ... ],              // qty/@
  konsumsi:  [ nominal, ... ],
  sign:{ maker|checker|signer:{nama,jabatan,tanggal:'YYYY-MM-DD',img:'dataURL'} }
}
```
**Penting:** daftar `petugas`, `uangSaku`, `penginapan`, `konsumsi` hanya disejajarkan **berdasarkan nomor baris saat dicetak**. Baris ke-i di form memuat item ke-i dari tiap daftar; jumlah baris = daftar terpanjang. Jangan mengembalikan ke model "satu objek per orang".
Data lama berformat `spj:[{nama,wq,wa,eq,ea,pq,pa,ks}]` otomatis dikonversi oleh `migrate()` saat dibuka lewat Edit.

Rumus (`calc()`): jumlah = qty × @; **Total SPJ** = Σweekday + Σweekend + Σpenginapan + Σkonsumsi; **TOTAL BIAYA** = Σ biaya + Total SPJ.

**Kompaksi 1 halaman:** `buildHTML()` menghitung tinggi baris `--rh` (maks 5 mm, min 3,8 mm) dari jumlah baris biaya + baris SPJ, dan menurunkan font ke 8pt bila rapat. Jika menambah baris/bagian baru, perbarui konstanta unit di rumus `H` (angka `23` = unit baris tetap, `190` = tinggi tersedia mm).

## Wizard (6 langkah)
1 Perusahaan (nama, logo, watermark, tombol "default perusahaan") · 2 Info Perjalanan · 3 Biaya Umum (1–8 item) · 4 Biaya SPJ (4 daftar) · 5 Penandatangan · 6 Review & Simpan. Konstanta indeks langkah: `STEP_SPJ`, `STEP_REVIEW`; validasi ada di langkah 2.

## 5. Penyimpanan di GAS

- **Sheet `Riwayat`** (dibuat otomatis): `id, dibuat, diubah, kota, tglBerangkat, total, jsonFileId, htmlFileId, fileUrl`.
- **Drive folder `SPPD_Riwayat`**: per riwayat ada `*.html` (print view) dan `*.json` (data mentah untuk fitur Edit). JSON dipisah karena TTD berupa gambar dan melebihi batas sel Sheet.
- Edit riwayat = menimpa isi kedua file yang sama (id tetap).

## 6. Logo, nama perusahaan & watermark

Diatur pengguna di **Langkah 1 (Perusahaan)**: nama, unggah logo, jenis watermark (teks nama / logo / gambar khusus / tanpa). Tombol "Simpan sebagai default perusahaan" menyimpan profil lewat `saveProfile()` (Drive: `profil_perusahaan.json`; demo: `localStorage`) dan dimuat otomatis di form baru (`loadProf()`).
Gambar diperkecil di browser (logo 400px, watermark 900px, TTD 500px) sebelum disimpan.
`CONFIG.logoSrc` / `CONFIG.watermarkSrc` (`TODO-ASSET`) hanya nilai awal bila profil belum pernah disimpan. Jika logo kosong, form menampilkan kotak dummy "LOGO". File riwayat lama tidak berubah otomatis; buka lewat **Edit** lalu simpan ulang.

## 7. Batasan yang perlu kamu ketahui

- Muat **1 halaman**: tinggi kertas 209 mm; biaya umum maks 8 item dan SPJ maks 6 baris; tinggi baris menyesuaikan otomatis (lihat bagian kompaksi).
- PDF dibuat oleh browser (Cetak → Simpan sebagai PDF: A4, Landscape, Margin None, Scale 100%). Server tidak membuat PDF karena konversi HTML→PDF GAS tidak andal untuk layout ini.
- Belum ada login/hak akses; akses diatur lewat setelan deployment GAS ("Who has access").

## 8. Cara menguji cepat

1. Buka `Index.html` di browser → Mode Demo.
2. Isi 6 langkah → Simpan → tab Riwayat → Preview/Unduh/Edit/Hapus.
3. Bandingkan hasil dengan referensi: 3 baris header, Biaya A–E, SPJ (Weekday/Weekend/Penginapan/Konsumsi), Total Biaya, tiga kotak tanda tangan.
