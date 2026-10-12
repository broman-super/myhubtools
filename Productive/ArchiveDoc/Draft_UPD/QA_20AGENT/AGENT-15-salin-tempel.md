# AGENT-15 — Pencinta Salin-Tempel

> **Persona:** datanya datang dari Excel, WhatsApp, atau catatan lama, jadi maunya paste
> langsung tanpa edit satu-satu — dan tidak paham bedanya CSV, JSON, atau teks · **Fokus:**
> impor, ekspor, dan paste data dari luar aplikasi · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 2 |
| TINGGI | 4 |
| SEDANG | 3 |
| RENDAH | 2 |
| **Total** | **11** |

Kesimpulan jujur: **backup → pulihkan secara mekanis itu aman.** Saya buktikan round-trip
JSON-nya identik byte-demi-byte (80.243 karakter → 80.243 karakter) dan semua angka cocok.
Yang rusak adalah sisanya. Aplikasi **tidak punya jalur paste sama sekali** (nol listener
paste/clipboard, nol textarea impor), file `.csv`/`.txt` hasil salin dari Excel justru
**tidak bisa dipilih** karena `accept=".json"`, dan yang paling parah: **satu impor yang gagal
tidak mengubah localStorage, tapi diam-diam mengganti seluruh data di memori. Save
berikutnya menghapus 99,4% database secara permanen dan menampilkan toast "Event dibuat".**
Setelah refresh, aplikasi terbuka dengan layar tengah kosong. Saya buktikan ini dengan dua
halaman berurutan memakai profil Edge yang sama.

## Environment yang dipakai

- Edge headless (`msedge.exe --headless=new`), profil unik per run
  (`prof_a15`, `pa15b/c/d/e/f/g/h`, `pz15`, `pz15b/c`)
- `localStorage.clear()` di awal tiap harness → seed default dipakai
- Skrip aplikasi dimuat lewat `<script src="../../../js/...">` dari
  `Draft_UPD/QA_20AGENT/_QA_TMP/` (harness: `a15_rt`, `a15_b`, `a15_c`, `a15_d`, `a15_e`,
  `a15_p1`–`a15_p5`). Tidak ada file aplikasi yang saya sentuh.
- Rute diuji: `#/settings`, `#/events/evt-1` + 3 tabnya, `#/dashboard`, `#/events`,
  `#/archive`, `#/products`, `#/master`, `#/reports`, `#/guide` (12 route untuk "sensus paste")
- Test round-trip: ekspor → `resetData()` → impor → bandingkan
- Test impor: handler asli `data:import` dipicu sungguhan — `<input type=file>` di-intercept,
  diisi `File`/`DataTransfer`, lalu event `change` dipicu

## Temuan

### [BUG-01] Impor gagal = data di memori diganti; save berikutnya menghapus 99,4% database dan menampilkan toast "Event dibuat" — KRITIS

**Persona dan use-case:** Datanya dari Excel/catatan lama, jadi dia mau "paste file".
Dia pilih file yang kelihatan benar tapi salah sedikit. Toast merah muncul sebentar, dia
bingung, lalu **mengira aplikasinya rusak** dan buru-buru klik lagi — "Tambah Event" →
Simpan. Di situ seluruh datanya dihapus.

**Langkah reproduksi:**
1. Buka aplikasi, seed default. `localStorage` = 54.174 karakter, 9 event.
2. Siapkan file JSON yang isinya cuma `{"events":[]}` (lolos validasi `events`, tapi tanpa
   key `sppd`). Ini yang terjadi kalau user memotong sebagian isi backup, atau file
  dari tool lain.
3. **Pengaturan → Pulihkan dari File** → pilih file itu.
4. **Toast muncul:** `TypeError: Cannot read properties of undefined (reading 'forEach')`.
   `localStorage` masih 54.174 karakter — data lama masih aman di disk.
5. User klik **Daftar Event → Tambah Event → isi nama → Simpan** (handler asli `event:save`).
6. Refresh halaman (F5).

**Harapan:** impor gagal tidak mengubah apa pun di memori maupun disk. User tinggal coba lagi.

**Kenyataannya:** `importJSON()` menimpa `DB` **sebelum** validasi selesai
(`js/store.js:342`), lalu melempar di baris 346. Toast muncul, tapi `DB` sudah berisi file
rusak. Hampir semua aksi di aplikasi memanggil `save()`, dan `save()` menulis DB rusak itu ke
localStorage. Aksi `event:save` sendiri melempar exception, tapi toast sukses sudah tampil
lebih dulu ke user.

**Evidence (3 tahap, 3 halaman, profil Edge sama):**

*TAHAP 1 (`a15_p1.html`)*:
```
localStorage = 54174 karakter, events=9
importJSON('{"events":[]}') -> TypeError: Cannot read properties of undefined (reading 'forEach')
localStorage SESUDAH impor gagal = 54174 karakter (MASIH data lama yang aman)
tapi di MEMORI: events=0 <- sudah diganti objek file
-- user klik Tambah Event -> Simpan (handler asli) --
modal form muncul? ya, ada #ev-nama
event:save -> TypeError: Cannot read properties of undefined (reading 'filter')
toast = "Event dibuat"                      <-- toast SUKSES padahal error
ISI localStorage SEKARANG: panjang = 316 karakter
  keys = events,kasAdj,prepItems,danaCair
  events = 1 | sppd = undefined | products = undefined | sales = undefined
ringkasan: localStorage SUDAH RUSAK PERMANEN
```
**54.174 → 316 karakter = 99,4% data hilang, dan user melihat toast "Event dibuat".**

*TAHAP 2 (`a15_p2.html`, halaman baru = F5, localStorage tidak dikosongkan)*:
```
localStorage punya 316 karakter
isi #app setelah render otomatis = 0 karakter
-> LAYAR PENUH/KOSONG? YA, halaman hampir kosong
  #/dashboard -> #app 0 karakter, error+1
  #/events    -> #app 0 karakter, error+1
  #/products  -> #app 0 karakter, error+1
  #/settings  -> #app 566 karakter, error+0
  #/master    -> #app 236 karakter, error+0
  store.products("evt-1") -> TypeError: Cannot read properties of undefined (reading 'slice')
  store.sales("evt-1")     -> TypeError: Cannot read properties of undefined (reading 'filter')
```

*TAHAP 3 (`a15_p5.html`)* — stack asli, bukan "Script error" yang dimasking oleh `file://`:
```
TypeError: Cannot read properties of undefined (reading 'forEach')
  at Object.load (file:///.../js/store.js:308:13)
isi <main id="app"> = 0 karakter
<nav> masih ada? 0 item menu        <-- renderNav juga gagal
tombol "Reset Data Dummy" -> resetData() = ok   (app hidup lagi, tapi data asli hilang)
```

**Dampak ke pengguna awam:** user awam **tidak akan connect** "satu klik impor gagal" dengan
"semua data saya hilang". Toast "Event dibuat" meyakinkan dia bahwa aksinya berhasil.
  Saat refresh, dia cuma melihat layar putih kosong tanpa pesan sama sekali - dia akan
pikir aplikasinya rusak, bukan data yang hilang. Satu-satunya jalan keluar hanya "Reset Data
Dummy" (yang mengembalikan contoh, bukan datanya). Kalau dia punya file backup sendiri,
`Pulihkan dari File` **ikut gagal** dengan error yang sama, karena `DB.sppd` sudah
`undefined` — jadi user yang tidak paham teknis buntu total.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
1. Jadikan `importJSON()` **transaksional**: parse ke variabel lokal, jalankan seluruh
   normalisasi pada `obj`, baru pasang ke `DB` di baris paling akhir dan panggil `save()`.
   Kalau ada satu saja normalisasi yang melempar, `DB` tidak boleh tersentuh.
2. Pindahkan `DB.sppd.forEach` (dan semua akses `.forEach` di luar try) ke dalam blok
   `try`, atau tambahkan default `DB.sppd = DB.sppd || []` seperti yang sudah dilakukan
   untuk `kasAdj`/`prepItems`/`danaCair` — supaya file rusak tidak bisa mematikan startup.
3. Jangan tampilkan toast sukses kalau handler melempar setelah `save()` — pada `event:save`
   (`js/actions.js:95`) toast sukses diemitted tanpa mengecek hasil.

### [BUG-02] File backup tidak lengkap: toast "Data dipulihkan" (sukses) tapi 6 dari 9 halaman mati — KRITIS

**Persona dan use-case:** File backup datang dari PC lain / sesi lama, isinya "lumayan tapi
kurang". User paste, melihat toast hijau, lalu menemukan aplikasinya nyaris kosong di
halaman-halaman lain.

**Langkah reproduksi:**
1. Ekspor data ke `backup.json`.
2. Buka di Notepad, hapus blok `products`, `sales`, `expenses`, `milestones` (ini terjadi
   natural kalau file lewat WhatsApp, atau user "membersihkan" sebagian karena takut salah).
3. **Pulihkan dari File** → pilih file itu → toast sukses.
4. Klik tiap halaman.

**Harapan:** file tidak lengkap ditolak dengan pesan jelas sebelum apa pun ditimpa.

**Kenyataannya:** validasi hanya memeriksa `Array.isArray(obj.events)` — satu baris. File
diterima, toast sukses muncul, lalu 6 halaman crash.

**Evidence (`a15_b.html`):**
```
file: events=1, sppd=1, TANPA products/sales/expenses/milestones/checklistItems/itemCats/itemTemplates
importJSON(mini) -> {"before":9,"after":1}          <-- dianggap SUKSES
toast = "Data dipulihkan: 9 → 1 event"
#/dashboard    -> teks #app 566 karakter, error baru=1
#/events       -> teks #app 566 karakter, error baru=1
#/archive      -> teks #app 566 karakter, error baru=1
#/products     -> teks #app 566 karakter, error baru=1
#/reports      -> teks #app 566 karakter, error baru=1
#/events/evt-1 -> teks #app 566 karakter, error baru=1
#/master, #/guide, #/settings -> yang selamat (236 / 6097 / 566 karakter)
total error JS terkumpul = 6
```
Variasi: file yang hanya kehilangan `products` saja → lebih ringan, "cuma" 2 halaman error
(`#/products`, `#/events/evt-z`), tapi tetap rusak.

**Dampak ke pengguna awam:** toast hijau = "berhasil". User tidak akan membuka file backup-nya
untuk memastikan. Dia baru sadar saat rekap dan menemukan angkanya nol.
Tidak ada snapshot, tidak ada undo (BUG-06) — data yang tertimpa hilang permanen.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** tambahkan pre-flight validation
sebelum `DB = obj`: pastikan semua key yang dipakai halaman (`products`, `sales`, `expenses`,
`transports`, `eventProducts`, `milestones`, `prepItems`, `checklistTemplates`, `itemCats`,
`itemTemplates`, `settings`, `sppd`) bertipe array, dan setiap `eventId` di file benar-benar
ada di `events`. Kalau ada yang kurang → tolak dengan pesan **"File ini belum lengkap: tidak
  ada bagian Products dan Sales", bukan menerima lalu berkata "dipulihkan".

### [BUG-03] Angka gaya Excel salah 1000x tanpa warning sama sekali — TINGGI

**Persona dan use-case:** User menyalin angka dari Excel/WA yang diformat rupiah Indonesia
(`900.000`) lalu mem-paste-nya ke kolom uang.

**Harapan:** format Indonesia dikenali (titik = pemisah ribuan), atau ada warning.

**Kenyataannya:** `ui.num()` memakai `parseFloat()`, yang **berhenti di titik pertama**.
`parseFloat('900.000')` = `900`, bukan `900.000`. Angka jadi 1000x lebih kecil, tanpa toast,
tanpa tanda di layar.

**Evidence (`a15_c.html`, `a15_d.html`):**
```
parseFloat("900.000") = 900        Number("900.000") = 900        A.fmt("900.000") = "Rp 900"
A.fmt("2.500.000") = "Rp 0"        (dua titik -> NaN -> || 0 jadi nol)
<input type=number>.value = "2.500.000" -> browser jadi "" | checkValidity=true | validationMessage=""
<input type=number>.value = "900.000"  -> DITERIMA ("900.000"), lalu ui.num() -> 900
<input type=number>.value = "-"        -> jadi "" (dibuang diam-diam)
Impor file diedit Notepad: "danaAwal":"2.500.000" -> tampil "Rp 0" (aslinya Rp 2.500.000)
Impor file diedit Notepad: budget 900000 -> "900.000" -> budgetTotal = 1.950.900 (dari 2.850.000)
  -> Rp 899.100 hilang tanpa satu karakter pun yang memperingatkan
```
Perhatikan dua level kegagalan sekaligus: `2.500.000` jadi **Rp 0** (field tampil kosong),
`900.000` jadi **Rp 900** (field tetap tampil "900.000" — jadi angka yang tersimpan berbeda
dari yang terlihat di layar).

**Dampak ke pengguna awam:** user paste, field kelihatan terisi normal, klik Simpan, laporan
keluar 1000x terlalu kecil. Tidak ada satu pun indikasi error. User baru sadar saat
rekonsiliasi kas di akhir bulan — kalau sudah terlambat.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** normalisasi angka gaya Indonesia
sebelum parsing: kalau string cocok pola `^\d{1,3}(\.\d{3})+(,\d+)?$` → buang titiknya
jadi format tanpa pemisah ribuan; kalau tidak cocok pola dan tetap tidak bisa jadi number →
tandai field dengan warning "angka tidak terbaca" dan jangan diam-diam fallback ke 0. Dan
`A.fmt()` sebaiknya membedakan "0 karena tidak diisi" vs "0 karena gagal parse".

### [BUG-04] Pesan error teknis JavaScript tampil ke user, bukan pesan untuk manusia — TINGGI

**Persona dan use-case:** "Paste gagal, tidak tahu harus bagaimana" — dan yang tampil adalah
string error internal developer.

**Harapan:** pesan actionable dalam bahasa manusia.

**Kenyataannya:** `js/actions.js:553` melakukan `ui.toast(e.message, 'error')` — pesan error
mentah dari `JSON.parse` diteruskan apa adanya.

**Evidence — 6 file uji, pesan yang tampil persis (`a15_rt.html`):**
```
[1] "catatan-wa.txt"  (isi: "Batik Tulis\t3\t750.000\nTenun Ikat\t1\t350.000")
      → "Unexpected token 'B', "Batik Tuli"... is not valid JSON"   (55 karakter)
[2] "data.csv"        (isi: "nama,qty,harga\nBatik Tulis,3,750000")
      → "Unexpected token 'a', "nama,qty,ha"... is not valid JSON"   (56 karakter)
[3] "salin-excel.json"(isi: '{"nama":"Batik Tulis","qty":3,"harga":"750.000"}')
      -> "Format backup tidak dikenali: bukan file backup SPPD Toolbox."   <- bagus
[4] "array.json"      (isi: '[{"events":[]}]')  -> "Format backup tidak dikenali: ..." <- bagus
[5] "null.json"       (isi: 'null')             -> "Format backup tidak dikenali: ..." <- bagus
[6] "kosong.json"     (isi: '')                 -> "Unexpected end of JSON input"
[7] {"events":[]}     -> "TypeError: Cannot read properties of undefined (reading 'forEach')"
```
Tiga dari tujuh kasus sudah memakai bahasa manusia — arah dan kalimatnya sudah benar.
Empat sisanya bocor, dan dua yang bocor justru kasus **paling mungkin terjadi** untuk persona
ini (teks dari WhatsApp dan CSV dari Excel).

**Dampak ke pengguna awam:** user tidak akan berpikir "oh berarti file saya salah". Dia akan
mengira aplikasinya error, lalu mencoba-coba klik hal lain atau menyerah. Tidak ada petunjuk
file mana yang harus dipilih, format apa yang benar, atau harus ekspor ulang dulu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** petakan `e.name` ke pesan
panjang yang manusiawi: `SyntaxError` dari `JSON.parse` → "Format file tidak
dikenali. Yang bisa dipulihkan hanya file .json hasil tombol 'Backup ke File'."
`TypeError` → "File ini rusak / tidak lengkap, aplikasi menolaknya." sertakan nama file
yang dicoba. Jangan pernah menampilkan `e.message` mentah ke pengguna awam.

### [BUG-05] Tidak ada preview, tidak ada konfirmasi, dan toast "9 → 9" menutupi 2 transaksi yang hilang — TINGGI

**Persona dan use-case:** User mem-paste backup lama untuk "balik ke kondisi sebelum
masalah". Tidak sadar semua transaksi selesai yang terjadi setelah backup ikut terhapus.

**Harapan:** sebelum overwrite, tampilkan "File ini berisi 11 penjualan; data sekarang 13.
2 transaksi akan hilang. Lanjut?"

**Kenyataannya:** nol preview, nol konfirmasi, dan toast sukses yang **menyamakan jumlah
event** sehingga user punya ilusi tidak terjadi apa-apa.

**Evidence (`a15_b.html`, `a15_c.html`):**
```
handler data:import memanggil ui.confirm?              false
handler data:import memanggil A.modal untuk preview?   false
handler punya reader.onerror / reader.onabort?         false
handler cek ukuran file?                               false
handler cek ekstensi/nama file?                        false
handler cek isi sebelum menimpa selain events?          false
halaman Pengaturan: adakah preview sebelum impor?      TIDAK ADA
halaman Pengaturan: adakah tombol undo/rollback?       TIDAK ADA
halaman Pengaturan: ada peringatan "akan menimpa"?      TIDAK ADA
halaman Pengaturan total: 63 kata
```
Efeknya, diukur dengan angka:
```
Sebelum impor: penjualan evt-1 = 6, totalSales = 4.630.000, saldo = 5.695.000
toast        : "Data dipulihkan: 9 → 9 event"      <-- tidak ada perubahan yang disebut
Sesudah     : penjualan evt-1 = 4, totalSales = 3.480.000, saldo = 4.545.000
2 transaksi (Rp 1.150.000) hilang tanpa peringatan apa pun
```
Dan file yang cuma berisi 1 event:
```
toast = "Data dipulihkan: 9 → 1 event"
8 event hilang tanpa nama, tanpa jumlah, tanpa konfirmasi
```

**Dampak ke pengguna awam:** user awam mengira backup = undo. Dia melihat toast hijau
"9 → 9 event" dan berpikir "tidak ada yang berubah", padahal duit penjualan yang sudah
masuk catatan hilang. Ia baru sadar saat tutup bulan atau saat audit.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** sebelum mengganti, tampilkan
modal diff: jumlah event / penjualan / pengeluaran / produk di file vs yang ada sekarang,
dan berapa baris yang akan hilang. Setelah impor, toast harus menyebut **apa yang berubah**
("2 transaksi penjualan dihapus karena file backup lebih lama"), bukan cuma jumlah event.

### [BUG-06] Nol rollback — overwrite total tanpa jejak, dan "Reset Data Dummy" justru membuang data asli — TINGGI

**Persona dan use-case:** Salah pilih file. Tidak tahu harus bagaimana.

**Harapan:** minimal ada snapshot otomatis atau tombol "Urungkan Import Terakhir".

**Kenyataannya:** tidak ada key cadangan, tidak ada undo, tidak ada riwayat. Dan tombol
"Reset Data Dummy" yang ADA justru sering kali **memperburuk**: itu satu-satunya jalan
keluar dari BUG-01, tapi isinya mengembalikan contoh dummy, bukan data user.

**Evidence:**
```
Sebelum & sesudah impor → localStorage keys = sppd_toolbox_db_v2 (total 1 key)
adakah key cadangan/snapshot/undo?  TIDAK ADA (hanya sppd_toolbox_db_v2)
adakah [data-action*=undo] / [data-action*=rollback]?  TIDAK ADA
setelah 2 transaksi hilang: tidak ada cara mengembalikannya dari dalam app
```
Dan pada kasus BUG-01, `resetData()` = "sukses" (54.174 karakter kembali) - artinya satu-satunya
"pemulihan" yang tersedia adalah **membuang data asli**.

**Dampak ke pengguna awam:** user kehilangan datanya permanen dari sisi aplikasi. Kalau
tidak punya file backup di disk (banyak user awam tidak pernah klik "Backup ke File" karena
tidak tahu itu penting), tidak ada apa pun yang tersisa.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** sebelum `DB = obj`, simpan
snapshot ke key terpisah `sppd_toolbox_db_pre_import_v2` beserta timestamp-nya, dan tampilkan
tombol "Urungkan Impor Terakhir (2 menit lalu)" di Pengaturan. Di halaman Pengaturan,
tambahkan kalimat jujur: "Backup hanya *menyalin data ke file* — tidak ada tombol undo
di dalam aplikasi."

### [BUG-07] Validasi hanya satu baris: `Array.isArray(obj.events)` — SEDANG

**Persona dan use-case:** User menerima file `.json` dari siapa pun dan langsung menekan
"Pulihkan".

**Harapan:** sanity check minimum — file ini memang backup SPPD Toolbox versi ini.

**Kenyataannya:** satu kondisi. Tidak cek key lain, tidak cek referential integrity
`eventId`, tidak cek versi format, tidak cek tipe angka.

**Evidence:**
```
importJSON hanya cek: Array.isArray(obj.events)      <-- satu-satunya
importJSON throw Error(...) yang ada: 'Format backup tidak dikenali: bukan file backup SPPD Toolbox.'
Contoh lolos validasi tapi merusak: {"events":[]} -> lolos -> TypeError
Contoh lolos validasi tapi app mati: {events, sppd, settings} -> lolos -> 6 halaman error
```

**Dampak ke pengguna awam:** file JSON yang "kelihatan benar" dari sumber tidak dikenal
diterima begitu saja. User tidak punya cara memeriksa file sebelum menekan tombol.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** satu fungsi
`validateBackup(obj)` yang mengembalikan daftar masalah (key kurang, `eventId` yatim,
angka bertipe string), dipakai baik untuk menolak impor maupun untuk **pratinjau diff**
sebelum konfirmasi.

### [BUG-08] Tidak ada jalur paste data tabular di mana pun — SEDANG

**Persona dan use-case:** "Datanya dari Excel, jadi mau paste langsung."

**Harapan:** ada textarea multi-baris atau tombol "Impor dari CSV".

**Kenyataannya:** nol. Tidak ada listener `paste`, tidak ada `navigator.clipboard`, tidak
ada input file selain "Pulihkan dari File". Dua textarea yang ada (`ev-catatan`, `spp-catatan`)
bukan untuk impor.

**Evidence — sensus 12 route (`a15_b.html`):**
```
total <textarea> ditemukan = 4
  #/events/evt-1         -> spp-catatan
  #/events/evt-1/roadmap -> spp-catatan
  #/events/evt-1/siap    -> spp-catatan
  #/events/evt-1/uang    -> spp-catatan
  -> semuanya SATU textarea yang sama, muncul di 4 tab
input[type=file] statis di HTML = 0
kode paste/clipboard di seluruh app = tidak ada
```
Kalau user nekat paste ke sana (`a15_c.html`):
```
dipaste: "Batik Tulis\t3\t750.000\nTenun Ikat\t1\t350.000\nKopi Bubuk\t5\t35.000\nTotal\t\t1.135.000"
tersimpan: 79 karakter, 3 enter, 8 tab  (apa adanya di field "Catatan")
di hasil CETAK: (tidak ikut tercetak sama sekali)
white-space:pre di style cetak: false
```
Kolom-kolom hilang begitu saja. Yang terjadi: di dalam `<textarea>` HTML, karakter `\t` dan
newline **tetap utuh** sebagai isi field (itu sebabnya `79 karakter` masih lengkap), tapi
begitu data itu dipakai di luar textarea — di kartu event read-only (`js/pages.js:363`)
maupun di hasil cetak — baris baru diratakan dan tidak ikut tercetak.

**Dampak ke pengguna awam:** user coba paste ke satu-satunya kotak teks yang ada, melihat
hasilnya berantakan jadi satu baris panjang, menyimpulkan "ini bukan untuk data", lalu
kembali ke Excel dan input satu per satu — persis yang dia hindari.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** sediakan **satu** textarea
multi-baris + tombol "Impor dari Teks (Excel/WhatsApp)" di halaman Pengaturan, dengan
parser tab-delimited, preview jumlah baris × kolom, dan daftar baris yang tidak terbaca
sebelum commit. Tombol ini hanya perlu membaca data yang sudah ada di tabel
(produk, penjualan, pengeluaran) — cukup untuk menutup 80% kebutuhan persona ini.

### [BUG-09] `accept=".json"` membuat file `.csv`/`.txt` hasil salin dari Excel tidak bisa dipilih — SEDANG

**Persona dan use-case:** Data user ada di `data.csv` hasil export Excel. Dia klik
"Pulihkan dari File" dan file-nya tidak muncul di dialog.

**Harapan:** minimal ada petunjuk atau file yang umum bisa dipilih.

**Kenyataannya:** `input.accept = ".json,application/json"`. Dialog Windows bisa dibuka
dengan filter "Semua Berkas", tapi file tetap gagal di-parse karena isinya CSV/TSV.

**Evidence:**
```
accept = ".json,application/json"
file .csv/.txt/.xlsx TIDAK memenuhi accept -> tidak muncul di dialog
2 dari 6 kasus uji (.csv dan .txt) gagal dengan pesan teknis (BUG-04)
```

**Dampak ke pengguna awam:** user melihat dialog file terbuka tapi file-nya tidak ada.
Dia akan mencari-cari, mungkin me-rename `.csv` → `.json`, lalu dapat error teknis.
  Dua kali kecewa.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** longgarkan `accept` jadi
`.json,.csv,.txt,text/*`, dan arahkan `.csv`/`.txt` ke parser tab-delimited (satu parser
sama dengan usulan BUG-08). Tambahkan kalimat kecil di bawah tombol: "Hanya file .json
hasil 'Backup ke File' yang bisa dipulihkan."

### [BUG-10] Nama file backup tidak punya jam/menit — RENDAH

**Persona dan use-case:** User ragu, jadi klik "Backup ke File" beberapa kali sehari.

**Harapan:** nama file unik per-detik.

**Kenyataannya:** hanya tanggal.

**Evidence (`a15_d.html`):**
```
3x klik "Backup ke File" dalam 1 hari ->
  ["sppd-backup-2026-10-01.json", "sppd-backup-2026-10-01.json", "sppd-backup-2026-10-01.json"]
tanggal dari A.isoToday() = 2026-10-01
```

**Dampak ke pengguna awam:** user membuka folder Download, melihat beberapa file bernama
sama, tidak tahu mana yang terbaru. Kalau tidak tahu cara melihat modification time,
dia akan memulihkan dari yang salah — dan itu langsung memicu BUG-06.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** `sppd-backup-2026-10-01-143022.json`
supaya bisa diurutkan sesuai waktu.

### [BUG-11] Tombol "Hapus" dipakai untuk dialog "Reset Data Dummy" — RENDAH

**Persona dan use-case:** User salah klik "Reset Data Dummy", lalu ragu di dialog konfirmasi
karena tombolnya bernama "Hapus".

**Harapan:** label tombol sesuai aksi.

**Kenyataannya:** `ui.confirm` (`js/ui.js:94-109`) selalu hardcode label **"Hapus"** untuk
semua konfirmasi, termasuk reset.

**Evidence:** `dialog: judul="Reset data?" isi="Semua data kamu diganti dengan contoh dummy."`
→ konfirmasi muncul **1 kali**, label tombol = **"Hapus"**.

**Dampak ke pengguna awam:** dua arah risiko. (1) User melihat "Hapus" dan batal karena
takut data aslinya hilang — padahal reset hanya mengganti dengan contoh. (2) User
memperlakukan "Reset Data Dummy" sebagai tombol pemulihan terakhir (persis yang terjadi di
BUG-01), dan pada saat itu dia sudah tidak punya pilihan lain. *(Catatan: temuan ini juga
ditemukan AGENT-10; saya konfirmasi ulang sendiri karena menyangkut salvage path.)*

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** beri `ui.confirm` parameter
label tombol: "Hapus" untuk hapus, "Ganti dengan Contoh" untuk reset.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Backup → pulihkan secara mekanis LOSSLESS.** Ekspor → `resetData()` → impor →
  bandingkan 18 field: `events 9, products 8, sales 11, expenses 10, transports 10,
  kasAdj 2, danaCair 4, sppd 8, milestones 29, prepItems 13, checklistItems 216,
  itemTemplates 29, eventProducts 10, danaAwal 2.500.000, budgetRows 5, budgetTotal
  2.850.000, totalSales 3.480.000, totalExpense 470.000, saldo 4.545.000` →
  **"bedanya: IDENTIK"**, dan `ekspor ulang == file asal? true` (80.243 = 80.243 karakter).
  Tidak ada transformasi angka, tidak ada selisih. Ini inti aplikasi yang paling penting,
  jangan sampai dikacaukan saat refactor.
- **Format file backup pakai indentasi 2 spasi** (`JSON.stringify(load(), null, 2)`), jadi
  masih **bisa dibaca dan diedit manusia** di Notepad — penting untuk persona ini, meskipun
  edit manual justru sumber BUG-03.
- **Tiga dari tujuh pesan error impor sudah ramah.** `"Format backup tidak dikenali: bukan file
  backup SPPD Toolbox."` muncul untuk `null`, `[]`, dan JSON asing. Arah dan kalimatnya
  sudah benar — tinggal diekstrapolasi ke kasus `SyntaxError` (BUG-04).
- **Elemen `<a download>` dibersihkan dengan benar.** Tepat setelah klik: 1 elemen di body;
  setelah 420ms: 0. Tidak ada penumpukan DOM.
- **Impor yang gagal tidak merusak data lokal.** Pada impor yang gagal, localStorage
  benar-benar **tidak tersentuh** (54.174 karakter utuh di TAHAP 1). Yang rusak cuma
  memori — inilah yang membuat BUG-01 bisa diperbaiki tanpa kerja besar.
- **`resetData()` selalu bisa mengatasi aplikasi yang mati.** Dari kondisi `{"events":[]}`,
  `resetData()` mengembalikan 54.174 karakter dan dashboard 908 karakter. Ini safety net
  yang menyelamatkan user, meski datanya sendiri sudah hilang.
- **File backup kecil.** 80.243 karakter (~80 KB) berisi 16 key. Tidak membengkak.
- **Impor file besar (2,15 MB) berhasil normal.** Saya uji `catatan` sepanjang 2.199.999
  karakter di dalam event → `importJSON` tidak melempar, data tersimpan
  2.254.942 karakter, tidak ada toast error. Tidak ada temuan di sini.

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah file hasil "Backup ke File" benar-benar tersimpan di disk?** Semua tes saya
  headless: `<a download>` dibuat dan `.click()` dipanggil (`href="blob:null/92"`,
  `download="sppd-backup-2026-10-01.json"`), tapi file aktual di folder Download tidak
  bisa saya periksa dari headless. Perlu diuji manual di browser desktop.
- **Apakah dialog file Windows benar-benar memblokir `.csv`/`.txt`, atau bisa dipilih lewat
  "Semua Berkas"?** Saya menyimpulkan dari atribut `accept`, belum dari dialog aslinya.
- **Apakah `reader.onerror` benar-benar tidak ada?** Saya buktikan lewat
  `String(A.actions['data:import']).indexOf('onerror') === -1`. Tapi belum saya-trigger
  kondisi error FileReader sungguhan (mis. file terhapus saat dibaca). Perlu konfirmasi.
- **Berapa kuota localStorage sebenarnya?** Di satu profil penuh pada 5.000.000 karakter
  (`QuotaExceededError`), di profil lain probe berhenti di 8.388.608 karakter. Angkanya
  beda antar profil, jadi saya tidak menulis angka pasti. Konsekuensinya: **belum berhasil
  memicu `save()` gagal** — jadi apakah `importJSON` yang "berhasil" tapi gagal persisten
  masih **belum terbukti** dan perlu diuji lagi.
- **Apakah file backup yang sebagian besar isinya data otomatis akan jadi masalah?** Di
  file seed: `checklistItems 216 + itemTemplates 29 + checklistTemplates 24 = 269 baris
  otomatis` vs **38 baris** yang benar-benar diketik user (events 9 + products 8 +
  sales 11 + expenses 10). Kalau user menyalin file ini untuk "memperbaiki" satu angka,
  dia akan mengedit di antara ratusan baris yang tidak dia kenal. Perlu keputusan produk:
  apakah key ini sebaiknya dikeluarkan dari file backup atau dipisah ke file lain.
- **Apakah `danaAwal` bertipe string sudah pernah terjadi di dunia nyata** (mis. dari
  integrasi lain)? Semua temuan BUG-03 bergantung pada user yang mengedit file JSON
  sendiri — memang sesuai persona ini — tapi perlu dipastikan apakah ada jalur lain
  (mis. impor dari CSV di masa depan) yang akan menambah sumbernya.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Round-trip backup/pemulihan | 5 | Identik byte-demi-byte, semua angka cocok, tidak ada selisih. Ini bagian yang paling kokoh. |
| Paham format file | 2 | Tidak ada penjelasan bahwa hanya file `.json` hasil Backup yang bisa dipulihkan. File `.csv`/`.txt` justru diblokir. Tiga dari tujuh pesan sudah baik, sisanya teknis. |
| Kemudahan paste | 1 | Nol listener paste/clipboard, nol textarea impor. Satu-satunya textarea adalah "Catatan" yang tidak punya hubungan dengan data. |
| Akurasi input angka | 1 | `900.000` → 900, `2.500.000` → `Rp 0`. Salah 1000 kali atau jadi nol, tanpa peringatan. Kerusakan diam-diam. |
| Kepercayaan pada hasil | 2 | Toast hijau "Data dipulihkan: 9 → 9 event" padahal 2 transaksi (Rp 1.150.000) hilang. User baca toast, bukan data. |
| Reversibilitas | 1 | Nol rollback, nol preview, nol undo. Sekali salah impor, tidak ada jalan kembali dari dalam app. |
| Ketenangan hati | 1 | BUG-01: satu impor gagal + satu klik "Simpan" = 99,4% data hilang dengan toast "Event dibuat", lalu aplikasi terbuka kosong. |

### Catatan untuk tim produk

Untuk persona "Pencinta Salin-Tempel", **BUG-01 dan BUG-03 sudah cukup untuk membuat saya
tidak merekomendasikan aplikasi ini ke UMKM mana pun yang bekerja dengan uang asli.**
Dua-duanya adalah kebohongan yang terlihat benar: toast hijau dan field yang terisi normal.
Semua temuan lain (BUG-04 sampai BUG-11) memang serius, tapi masih bisa dipelajari user.
Setelah dua yang itu diperbaiki, sisanya bisa masuk antrean pemolesan.

### Catatan metodologi & kejujuran

- Semua angka berasal dari log harness Edge headless, bukan estimasi. Harness:
  `a15_rt` (ekspor + round-trip + error), `a15_b` (rollback senyap + angka string +
  sensus paste + settings), `a15_c` (anggaran 900.000 + paste ke Catatan + accept),
  `a15_d` (catatan di halaman lain + nama file + isi file), `a15_e` (catatan event + kuota),
  `a15_p1`→`a15_p2`→`a15_p5` (rantai kerusakan BUG-01 lintas halaman, profil sama).
- **Saya sempat salah mengukur di ronde pertama:** saya memanggil `budgetTotal()` dengan
  **SPPD id** (`spp-1`) padahal fungsinya menerima **event id** (`evt-1`), sehingga
  `getSppd('spp-1')` membuat 2 baris SPPD baru dan membuat round-trip tampak gagal
  ("sppd: 8 → 10"). Setelah dikoreksi, hasilnya **IDENTIK** — dan saya catat itu di bagian
  "Yang sudah baik" supaya tidak ada yang salah simpulkan. Ini bug harness saya, bukan bug aplikasi.
- Saya tidak mengarang temuan. Kalau suatu area bersih, saya tulis begitu (lihat bagian
  "Yang sudah baik" untuk round-trip, cleanup `<a>`, dan impor file besar).
