# AGENT-08 — User Senior / Lanjut Usia

> **Persona:** Pensiunan Dinas Koperasi & UMKM, usia 62 tahun; dulu masih sering menggulir layar panjang, sekarang tidak; membaca lewat kacamata baca, kadang lupa kacamata, dan jarinya besar · **Fokus:** keterbacaan visual (ukuran huruf, kontras, target sentuh) dan ketahanan terhadap salah ketuk · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 2 |
| TINGGI | 5 |
| SEDANG | 3 |
| RENDAH | 3 |
| **Total** | **13** |

Saya menguji aplikasi ini dengan mata orang tua: stromanya pelan, matanya mulai buram,
dan jarinya tidak sedetik pun. Yang paling bikin saya berhenti bukan satu bug, tapi
tiga hal yang menumpuk: **data bisa hilang permanen hanya karena satu ketukan**,
**setengah teks di Layar Kerja cuma 11–12px**, dan **kotak centang saya cuma
13×13px — sebesar ujung kuku**. **Sepuluh dari sebelas action "Hapus" di Layar Kerja**
saya tekan satu kali dan datanya langsung hilang, tanpa konfirmasi, tanpa tombol Batal,
dan tanpa Undo; pesan toast-nya cuma bertahan 3 detik tanpa menyebut data apa yang
hilang. Di sisi lain, aplikasi ini **tidak memblokir zoom browser**, angka besar
30–56px punya kontras 18–21:1, dan halaman Panduan/Rekap/Master benar-benar bersih
(tidak ada satu pun teks di bawah 12px dan nol kontras gagal). Jadi fondasinya
sudah benar — yang bermasalah adalah Layar Kerja, tempat saya bekerja setiap hari.

## Environment yang dipakai

- **Edge headless** (`--headless=new --disable-gpu --no-sandbox`), **profil unik
  per run** (`--user-data-dir` di `C:\Users\Kael\AppData\Local\Temp\opencode\p_a08_*`),
  dihapus sebelum tiap run.
- **Seed default** — `localStorage.clear()` di `<head>` sebelum `js/store.js`
  dimuat, di setiap harness. Dikonfirmasi `lsKeys=0` dan `errors=[]` di blok META
  setiap run.
- **Harness** di `Draft_UPD/QA_20AGENT/_QA_TMP/`:
  `a08_measure.html` + `a08_measure.js` (mesin pengukuran),
  `a08_detail.html` + `a08_detail.js`, `a08_interact.html` + `a08_interact.js`
  (klik hapus sungguhan), `a08_scale.html` + `a08_scale.js` (skala huruf),
  `a08_verify.html` (verifikasi silang), plus `a08_iframe.html` +
  `a08_frame_child.html` untuk viewport 360px sejati, dan `batch08.ps1`/`run08.ps1`
  sebagai runner.
- **Rute diuji** (10 rute × 2 lebar): `#/dashboard`, `#/events`, `#/events/evt-1`,
  `#/events/evt-3`, `#/archive`, `#/products`, `#/master`, `#/reports`, `#/guide`,
  `#/settings`.
- **Lebar layar**: 1600×900 (`--window-size`, viewport terbaca 1576×761) dan
  **360×640 CSS asli** lewat `<iframe width="360">`. `--window-size=360,740` ternyata
  di-clamp Edge headless ke 492px CSS, jadi angka "layar HP senior" tidak bisa
  dipercaya tanpa iframe.
- **Cara hitung**: `getComputedStyle().fontSize` dalam px untuk ukuran huruf;
  rasio kontras dihitung sendiri dengan formula WCAG 2.x `((L1+0.05)/(L2+0.05))`
  dari `getComputedStyle().color` versus **latar efektif** (naik ke parent sampai
  ketemu `alpha >= 0.999`, komposit alpha dihitung); target sentuh lewat
  `getBoundingClientRect().width/height`; konfirmasi diuji dengan **klik MouseEvent
  sungguhan** lalu dicek apakah `#modal-root .modal-backdrop` muncul dan apakah
  jumlah baris di store berubah.

## Temuan

### [BUG-01] 10 dari 11 action "Hapus" di Layar Kerja menghapus data seketika tanpa konfirmasi — severity: KRITIS

**Persona dan use-case:**
Saya menata keuangan di Seksi 06. Ada tiga baris pengeluaran, masing-masing
berakhir dengan tombol "Hapus" berwarna putih bertepi abu. Saya mau menghapus
**satu** baris saja, yang salah catat. Jari saya menyentuh baris yang salah.

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`, gulir ke Seksi 06 "Uang — Pengeluaran & Penyesuaian".
2. Klik tombol **"Hapus"** pada baris pertama (59×32px).
3. Amati tiga hal: apakah dialog konfirmasi muncul, apa isi toast-nya, dan
   apakah jumlah baris di `store.expenses('evt-1')` berkurang.

**Harapan:**
Menghapus catatan keuangan harus minta konfirmasi yang **menyebut nama datanya**,
menawarkan tombol **Batal**, dan idealnya menyediakan **Undo**.

**Kenyataannya:**
```
Pengeluaran / "Hapus" 59x32
   jumlah data SEBELUM = 3   SESUDAH = 2   -> DATA LANGSUNG HILANG
   modal konfirmasi muncul? TIDAK ADA
   toast: "Pengeluaran dihapus"
   pesan menyebut nama data yang dihapus? TIDAK
   ada tombol BATAL / UNDO di toast? TIDAK ADA
```
Saya menguji **10 dari 11** action hapus di Layar Kerja dengan klik nyata dan
menghitung ulang isi store. Hasilnya seragam:

| data-action | Ada konfirmasi? | Jumlah data sebelum → sesudah |
|---|---|---|
| `sale:delete` (Penjualan) | **TIDAK** | 4 → 3 |
| `milestone:delete` (tombol "✕") | **TIDAK** | 5 → 4 |
| `expense:delete` (Pengeluaran) | **TIDAK** | 3 → 2 |
| `prepitem:delete` (Item Persiapan) | **TIDAK** | 3 → 2 |
| `transport:delete` (Transport) | **TIDAK** | 2 → 1 |
| `danaCair:delete` (Dana Cair) | **TIDAK** | 2 → 1 |
| `budget:delete` (Alokasi SPPD) | **TIDAK** | 5 → 4 |
| `eventproduct:remove` (Produk checklist) | **TIDAK** | 3 → 2 |
| `kasadj:delete` (Penyesuaian Kas) | **TIDAK** | 2 → 1 |
| `milestone:att:delete` (Dokumen) | **TIDAK** | 1 → 0 |
| `event:delete` (Hapus event) | **YA** (modal, ada Batal) | — |

Hanya `event:delete` yang aman, dan di halaman Produk `product:delete` juga aman.
Polanya sudah ada di aplikasi; hanyaApplied sebagian.

**Evidence (kode, read-only):**
```
js/actions.js:164-167   transport:delete        -> store.deleteTransport(d.id) langsung
js/actions.js:275-279   milestone:delete        -> store.deleteMilestone(d.id) langsung
js/actions.js:297-300   milestone:att:delete    -> store.deleteMilestoneAttachment(...) langsung
js/actions.js:314-317   kasadj:delete           -> store.deleteKasAdj(d.id) langsung
js/actions.js:335-338   danaCair:delete         -> store.deleteDanaCair(d.id) langsung
js/actions.js:373-376   budget:delete           -> store.deleteSppdBudgetItem(...) langsung
js/actions.js:404-407   prepitem:delete         -> store.deletePrepItem(d.id) langsung
js/actions.js:447-450   sale:delete             -> store.deleteSale(d.id) langsung
js/actions.js:463-466   expense:delete          -> store.deleteExpense(d.id) langsung
Bandingkan:
js/actions.js:99-103    event:delete            -> ui.confirm('Hapus event?', ...)
js/actions.js:492-495   product:delete          -> ui.confirm('Hapus produk?', ...)
```
Jumlah tombol hapus di halaman: **32**, tersebar di 11 `data-action`
(`budget:delete` 5, `milestone:delete` 5, `sale:delete` 4, `expense:delete` 3,
`prepitem:delete` 3, `eventproduct:remove` 3, `danaCair:delete` 2,
`kasadj:delete` 2, `milestone:att:delete` 2, `transport:delete` 2,
`event:delete` 1).

**Dampak ke pengguna awam:**
Ini bisa membuat saya **kehilangan bukti pertanggungjawaban**. Seksi 06 dan 08
adalah dokumen yang akan saya tunjukkan ke bendahara dan auditor. Kalau
"Kas Kecil Rp 200.000" hilang karena salah ketuk, saya harus mengetik ulang dari
nol — dan kalau lupa, laporan saya **tidak balancing** tanpa saya sadari. Toast-nya
cuma "Pengeluaran dihapus" tanpa menyebut **kategori/jumlah**, jadi saya bahkan
tidak tahu **data yang mana** yang baru saja hilang, hanya bahwa "sesuatu" hilang.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Bungkus seluruh handler `*:delete`, `*:remove`, dan `*:att:delete` dengan
`ui.confirm()` seperti yang sudah dipakai `event:delete`. Isi teks konfirmasi
dengan **identitas data** — mis. "Hapus pengeluaran *Konsumsi · Rp 120.000 ·
22 Apr 2026*?" — supaya saya bisa mencocokkan dengan yang saya ingat. Untuk
`event:delete` yang dampaknya paling besar, pertimbangkan konfirmasi dengan
mengetik ulang nama event.

---

### [BUG-02] Tidak ada Undo, snapshot, atau tempat pemulihan setelah data dihapus — severity: KRITIS

**Persona dan use-case:**
Saya salah ketuk "Hapus" untuk pengeluaran "Konsumsi · Rp 120.000". Sekarang data
itu hilang. **Apa yang harus saya lakukan?** Saya mencari tombol "Batalkan" atau
"Urungkan" seperti di aplikasi lain.

**Langkah reproduksi:**
1. Klik "Hapus" pada pengeluaran mana pun di `#/events/evt-1`.
2. Hitung `[data-action*="undo"]`, `[data-action*="cancel"]`, `[data-action*="batal"]`.
3. Buka `#/settings` — cari kontrol pemulihan apa pun.

**Harapan:**
Ada **cara pemulihan** yang mudah dijangkau: Undo di dalam toast, atau "Baris
Terhapus" (Trash) dengan tombol "Kembalikan".

**Kenyataannya:**
```
data-action mengandung "undo"  = 0
data-action mengandung "cancel" = 0
data-action mengandung "batal" = 0
tombol di #app + #modal-root   = 70 ; yang teksnya mengandung undo/urungkan/batalkan = 0
tombol "data-action*=\"add\""   = 14   (tombol tambah ada, tombol kembalikan tidak)
```
Semua fungsi `delete*` di `js/store.js` memakai pola yang sama — langsung memfilter
tanpa menyimpan apa pun:
```js
function deleteExpense(id) {
  load().expenses = load().expenses.filter(function (e) { return e.id !== id; });
  save();
}
```
Tidak ada array `trash`, tidak ada riwayat, tidak ada snapshot. "Backup ke File"
hanya menyimpan kondisi **sekarang**; kalau backup dibuat **setelah** salah ketuk,
data yang hilang juga sudah hilang dari backup. "Pulihkan dari File" butuh file
backup yang belum pernah dibuat.

**Evidence (kode, read-only):**
```
grep -c "trash|undo|snapshot|riwayat" js/store.js  -> 0
"Backup ke File" hanya menulis state saat itu juga (js/actions.js:backup)
tombol "Pulihkan dari File" butuh input file; tidak ada backup default
tombol berlabel pemulihan di Pengaturan: hanya "Reset Data Dummy" (= hapus semua)
```
Setelah 10 action hapus dijalankan berurutan pada sesi yang sama, tidak ada satu pun
tombol atau menu baru yang muncul di `#app`, `#modal-root`, atau `#toast-root`. Yang
muncul hanya teks toast satu kalimat tanpa aksi di dalamnya.

**Dampak ke pengguna awam:**
Data yang hilang jadi **permanen**. Dan satu-satunya tombol yang terdengar seperti
"kembalikan" — **"Reset Data Dummy"** di Pengaturan — justru menghapus **semua**
event dan seluruh data saya. Jadi jalan keluar yang saya kira aman justru
memperburuk keadaan. Untuk saya ini bukan sekadar kehilangan satu baris Rp 120.000;
ini kehilangan **kepercayaan** pada catatan yang saya buat sendiri, dan saya akan
menyalin semua uang masuk ke kolom/base data lain di luar aplikasi ini.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Tambahkan array `DB.trash` yang menerima objek sebelum di-`filter()`, lengkap
dengan `type` dan `deletedAt`, lalu tampilkan daftar "Baris Terhapus" dengan tombol
"Kembalikan" di halaman Pengaturan (retensi minimal 30 hari). Alternatif yang lebih
ringan: simpan satu snapshot penuh sebelum setiap `*_delete` dan sediakan
"Urungkan perubahan terakhir" di footer. Tombol "Reset Data Dummy" sebaiknya dipindah
ke bagian berlabel jelas dan tidak diberi label yang menyerupai pemulihan.

---

### [BUG-03] 50% teks Layar Kerja di bawah 14px, termasuk 117 elemen 11px — severity: TINGGI

**Persona dan use-case:**
Saya buka Layar Kerja `#/events/evt-1` untuk mengecek apakah persiapan sudah
lengkap sebelum berangkat. Saya harus baca **judul kolom tabel**, **badge wallet**
(Bank / Kas / QRIS / E-Money), dan **subjudul seksi** ("2 dari 5 tahap selesai").
Ketiga grup itu justru yang paling menentukan keputusan saya.

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1` di Edge.
2. Di DevTools Console, hitung elemen yang punya teks langsung:
   ```js
   [...document.querySelectorAll('#app *')].filter(
     e => [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())
   ).map(e => getComputedStyle(e).fontSize)
   ```

**Harapan:**
Teks pendukung minimal **14px** untuk pengguna 60-an dengan presbiopia, idealnya
16px. Badge dan header tabel tidak boleh lebih kecil daripada isi tabel.

**Kenyataannya:**
```
totalElemenTeks = 734
   11px -> 117 elemen
   12px -> 247 elemen
   14px -> 252 elemen
   15px ->   2 elemen
   16px ->  69 elemen
   18px ->  24 elemen
   22px ->   8 elemen
   30px ->   1 elemen
   36px ->  11 elemen
   56px ->   1 elemen
RINGKASAN  <12px=117 | 12px=247 | 13px=0 | >=14px=370
```
- **117 elemen (16%) 11px** — badge dan header tabel.
- **364 elemen (50%) di bawah 14px.** Saya harus memakai kacamata untuk setengah layar.
- **65 badge, semuanya 11px**,tinggi baris hanya **22.5px**
  (contoh badge "Berjalan" 73.1×22.5px, `padding: 3px 10px`).
- **54 `th` (header tabel), semuanya 11px**, `text-transform: uppercase`,
  `letter-spacing: 0.44px`, tinggi baris **33px**.
- `.ev-head-kicker` 11px — label "Booth Pameran" di paling atas.
- `.flowbar-label` 11px — label "Alur Kerja".
- `.psec-title` 14px uppercase; `.psec-sub` 12px.

**Evidence:**
```
CSS: .badge     { font-size: 11px }                     css/styles.css:89
     .table th  { font-size: 11px; text-transform: uppercase; letter-spacing: .04em }
                                                           css/styles.css:96
     .ev-head-kicker { font-size: 11px; font-weight: 800; text-transform: uppercase }
                                                           css/styles.css:262
     .flowbar-label  { font-size: 11px; font-weight: 800 } css/styles.css:303
     .psec-sub       { font-size: 12px }                  css/styles.css:279
Cuplikan elemen <12px:
   11px w700 rgb(5,150,105)   span.badge            | "Kas"
   11px w700 rgb(29,78,216)   span.badge            | "Bank"
   11px w800 rgb(107,107,107) span.flowbar-label    | "Alur Kerja"
   11px w800 rgb(225,29,46)   div.ev-head-kicker    | "Booth Pameran"
   11px w800 rgb(107,107,107) th                     | "Rusak/Hilang"
```

**Dampak ke pengguna awam:**
Presbiopia hampir universal di usia 60+. Kombinasi **11px uppercase + letter-spacing
0.44px** adalah yang terburuk untuk mata saya: huruf kapital kecil dengan spasi
pecah-pecah. Badge "Kas" dan "Bank" sering saya salah baca kategori, dan badge itu
justru informasi inti untuk keputusan "dana ini dari mana?".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Naikkan `.badge` ke 13–14px dengan padding vertikal lebih besar, `.table th` ke
13px dan turunkan `text-transform: uppercase` ke `capitalize`, `.ev-head-kicker` dan
`.flowbar-label` ke 12px minimum. Yang lebih penting: jadikan ukuran huruf dasar
satu token CSS (mis. `--fs-label: 0.875rem`) supaya sekali ubah berlaku ke semua
komponen dan tidak ada yang tertinggal.

---

### [BUG-04] Ukuran huruf terkunci px — 220 elemen tetap 11px meski font browser dinaikkan ke 24px — severity: TINGGI

**Persona dan use-case:**
Mata saya makin kabur. Solusi yang sudah saya pelajari sendiri: **Ctrl + `+`**,
atau Settings browser → Font size → besar. Kalau ternyata aplikasi ini mengunci
ukuran huruf, saya tidak punya cara lain sama sekali.

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`.
2. Di Console:
   ```js
   document.documentElement.style.fontSize = '24px'; document.body.offsetHeight;
   ```
   Ini mensimulasikan pengguna yang mengubah "Display size / Font size" di
   pengaturan aksesibilitas OS.
3. Ukur ulang `getComputedStyle` untuk `.badge`, `.psec-title`, `.psec-sub`,
   `.btn`, `.label`, `.table th`, `.table td`, `.input`.

**Harapan:**
Semua teks mengikuti preferensi ukuran huruf sistem. Kalau literal `px` dipakai di
CSS, minimal harus ada **tombol "Perbesar/Perkecil huruf"** di halaman Pengaturan.

**Kenyataannya:**
```
elemen yang MEMBESAR = 114   TETAP = 298
   dari yang tetap: class custom px (css/styles.css) = 220
-> ukuran huruf TIDAK bisa diperbesar pengguna untuk 220 elemen teks kecil
psec-title  : 14px -> 14px  (TETAP)
psec-sub    : 12px -> 12px  (TETAP)
badge       : 11px -> 11px  (TETAP)
label       : 12px -> 12px  (TETAP)
table th    : 11px -> 11px  (TETAP)
table td    : 14px -> 14px  (TETAP)
flow-pill   : 12px -> 12px  (TETAP)
body        : 16px -> 24px  (MEMBESAR)
```
Hanya elemen yang memakai class Tailwind berbasis `rem` (`text-xs`, `text-sm`) yang
ikut membesar. Yang di-style lewat `css/styles.css` dengan satuan `px` **menghawk**.
Dan **`elemen kontrol ukuran huruf di DOM = 0`** — di 10 route yang saya uji tidak ada
satu pun tombol atau selector untuk memperbesar huruf.

**Evidence:**
```
elemen kontrol ukuran huruf di DOM = 0   (dicek di 10 route: dashboard, events,
   events/evt-1, events/evt-3, archive, products, master, reports, guide, settings)
CSS px yang mengunci: .btn 14px (:54) .btn-sm 12px (:69) .input 14px (:77)
   .label 12px (:85) .badge 11px (:89) .table th 11px (:96) .psec-title 14px (:272)
   .psec-sub 12px (:279) .flow-pill 12px (:311)
```

**Dampak ke pengguna awam:**
Ini yang paling **menyakitkan**. Hasilnya bukan "teks jadi kebaca", tapi layout jadi
**berantakan**: paragraf membesar dan mendorong tombol yang tetap kecil. Saya justru
bingung lebih dari sebelumnya, dan saya merasa aplikasi ini **mengabaikan** preferensi
aksesibilitas yang sudah saya set di HP saya. Satu-satunya jalan tinggal Ctrl + `+`,
dan itu bukan solusi
yang selalu tersedia di Android yang hanya punya tombol "Display size".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Ubah semua `font-size: NNpx` di `css/styles.css` menjadi satuan `rem` agar ikut
skala pengguna. Tambahkan juga preferensi **"Ukuran huruf"** di halaman Pengaturan
(Normal / Besar / Sangat Besar) yang menyimpan nilai di `store.settings()` dan
menerapkan lewat satu variabel CSS custom property. Manfaatkan keuntungan yang
sudah ada: zoom browser **tidak diblokir**, jadi jangan pernah tambahkan
`user-scalable=no`.

---

### [BUG-05] 61 target sentuh di bawah 24px — kotak centang hanya 13×13px — severity: TINGGI

**Persona dan use-case:**
Tugas inti saya di Seksi 04 dan Seksi 07 adalah **mencentang** barang:
"Kabel Rol — dibawa", "Materi Cetak — dibawa pulang". Saya tidak mengetik, saya
cuma mau **klik kotak kecil itu** dan jalan. Di HP saya jari telunjukebarisis
sekitar 16–20px, tapi **kotak centangnya cuma 13×13px**.

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`, Seksi 04 "Item Persiapan".
2. Hitung: `document.querySelectorAll('#app input[type=checkbox]').length` → **60**.
3. Ukur:
   ```js
   var cb = document.querySelector('#app input[type=checkbox]');
   cb.getBoundingClientRect();
   cb.closest('label').getBoundingClientRect();
   ```

**Harapan:**
Target sentuh minimal **44×44px** (rekomendasi Apple/Google untuk jari orang dewasa).
Kotak centang visual boleh 16–20px, tapi area ketuknya harus diperbesar.

**Kenyataannya:**
```
total checkbox = 60
checkbox tanpa <label> pembungkus = 0
checkbox yang <label>-nya masih < 44px = 60
contoh: checkbox 13.0 x 13.0px
   <label> pembungkus = 642 x 28px   (tinggi 28px < 44px)
   font label = 16px ; font span teks = 14px weight=400
```
Distribusi seluruh target sentuh di Layar Kerja:
```
elemen interaktif = 202 | <44px = 191 | <24px = 61
   tinggi 13px -> 53 elemen   <- kotak centang
   tinggi 16px ->  7 elemen
   tinggi 26px ->  8 elemen   <- tombol lipat seksi (.psec-fold)
   tinggi 28px ->  9 elemen   <- pill Alur Kerja (.flow-pill, 71.4x28.0px)
   tinggi 32px -> 41 elemen   <- semua .btn-sm ("Hapus", "+ Dokumen", "✕")
   tinggi 36px ->  8 elemen
   tinggi 40px -> 21 elemen   <- <select>
   tinggi 43px -> 43 elemen   <- .btn dan .input (nyaris 44)
```
Sebarannya per seksi: Seksi 01 = 1, Seksi 04 = **32**, Seksi 07 = 3, dan **24 lagi**
berada di kartu "Cek Persiapan" (Dokumen 6, Logistik 6, Keberangkatan 6,
Laporan 6).

**Evidence:**
```
25 target terkecil di halaman:
   INPUT 13x13  input.mt-1.accent-[#E11D2E]  | (10+)   <- kotak centang
   BUTTON 26x26 button.psec-fold                       <- tombol lipat seksi
   BUTTON 32x32 button.btn.btn-sm.btn-ghost | "✕"     <- hapus milestone
   pill  71.4x28.0 "01 SPPD"  font=12px                <- lompat seksi
CSS: .psec-fold { width:26px; height:26px }  css/styles.css:285-291
     .btn-sm     { padding:6px 10px; font-size:12px } css/styles.css:69
     .flow-pill  { padding:4px 10px; font-size:12px } css/styles.css:306-311
```

**Dampak ke pengguna awam:**
Ini yang paling **frustrasi**. Saya akan ketuk kotak centang, **tidak terjadi apa-apa**,
lalu saya ketuk lagi — masih tidak terjadi — lalu saya **geser sedikit** dan barulah
centangnya kena. Kalau saya memegang HP dengan dua tangan, saya sering kena **dua**
item berbeda sekaligus. Di Seksi 04 ada **32 checkbox**, jadi 32 chances salah ketuk.
Akibatnya checklist jadi **tidak dipercaya**, dan saya kehilangan confidence pada data
yang saya input sendiri.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Naikkan semua target ke minimal 44×44px. Untuk checkbox, perbesar **area ketuk bukan
kotak visualnya**: bungkus dengan `<label class="min-h-[44px] inline-flex items-center">`
atau tambahkan `padding: 12px` + `::before { content:''; position:absolute; inset:-12px }`.
Naikkan `.psec-fold` dari 26×26 ke 44×44 (label `aria-label`-nya sudah ada, tinggal
diperbesar). Naikkan `.btn-sm` dari `padding: 6px 10px` ke `padding: 11px 16px`.

---

### [BUG-06] Tombol "✕" hapus milestone 32x32px tanpa nama terbaca, 16px dari tombol "+ Dokumen" - severity: TINGGI

**Persona dan use-case:**
Saya baca daftar tahap (Persiapan, Berangkat, Event H-1, Pulang, Laporan). Ada
kotak kecil berisi tanda silang di kanan setiap baris. Saya **tidak tahu** itu
tombol hapus — bisa jadi "tutup", "rincian", atau "pindahkan".

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`, Seksi 02 "Jadwal & Milestone".
2. Ukur baris milestone pertama:
   ```js
   var r = document.querySelector('#ps-2 .psec-body .flex.items-start');
   [...r.querySelectorAll('button,select')].map(function (e) {
     var b = e.getBoundingClientRect();
     return (e.textContent || '').trim() + ' ' + Math.round(b.width) + 'x' + Math.round(b.height);
   });
   ```
3. Periksa `aria-label` dan `title` tiap tombol.

**Harapan:**
Tombol ikon-only minimal punya `aria-label` **dan** `title`, target 44px, dan untuk
pengguna senior sebaiknya pakai **teks** "Hapus" supaya saya punya saat baca
sebelum menekan.

**Kenyataannya:**
```
baris: "Belum/Berjalan/Selesai" 128x40 | "+ Dokumen" 87x32 | "✕" 32x32
   jarak "+ Dokumen" -> "✕" = 16px
   jarak select      -> "+ Dokumen" = 16px
tombol dengan teks kosong / <=2 karakter = 13
   teks="✕"  aria="(TANPA aria-label)"  32x32  button.btn.btn-sm.btn-ghost  (5 buah)
   teks="▾"  aria="Buka / tutup seksi"  26x26  button.psec-fold            (8 buah)
```
- **5 tombol "✕" hapus milestone: tanpa `aria-label`, tanpa `title`.**
- Yang memperburuk, **gaya visualnya berbeda tipis**: `"+ Dokumen"` memakai
  `btn-soft` (teks merah muda di merah sangat pucat) sedangkan `"✕"` memakai `btn-ghost`
  (hitam di putih) — jadi keduanya **tampak seperti tombol sekunder biasa**, bukan
  sepasang aksi tambah/hapus yang harus diwaspadai.
- Keduanya juga **saling kehilangan konteks**: `"+ Dokumen"` juga tidak punya
  `aria-label`/`title`.

**Evidence:**
```
js/pages2.js:98-99
  '<button class="btn btn-sm btn-soft flex-none" data-action="milestone:att:add" ...>+ Dokumen</button>' +
  '<button class="btn btn-sm btn-ghost flex-none" data-action="milestone:delete" ...>✕</button>'
Computed (evt-1):
  "+ Dokumen" fg=rgb(184,18,31) bg=rgb(253,234,234)  aria-label=(tak ada) title=(tak ada)
  "✕"        fg=rgb(17,17,17)  bg=rgb(255,255,255)  aria-label=(tak ada) title=(tak ada)
Sebanding — sudah lebih baik:
  pages2.js:598, 741 dan pages.js:414 memakai teks "Hapus"/"Buang"
```

**Dampak ke pengguna awam:**
Saya **menunda** sebelum menekan karena tidak yakin. Yang terjadi bukan "saya salah
ketuk", tapi "saya tidak berani menekan sama sekali" — dan itu berulang di 5 baris.
Kalau sampai tidak sengaja kena, saya **tidak akan tahu saya baru menghapus apa**,
karena tidak ada konfirmasi (BUG-01) dan toast-nya cuma "Milestone dihapus".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Ganti "✕" dengan teks **"Hapus"** (seperti yang sudah dipakai
`eventproduct:remove`). Kalau tetap ikon, tambahkan `aria-label="Hapus tahap <judul>"`
dan `title="Hapus tahap: <judul>"` yang **dinamis** per baris. Perbesar ke 44×44px dan
beri `aria-label="Tambah dokumen ke tahap <judul>"` untuk "+ Dokumen". Naikkan `.psec-fold`
dan beri label spesifik: `"Lipat seksi 03: Produk dan Qty (Aset Jual)"`, bukan
"Buka / tutup seksi" yang identik untuk 8 tombol.

---

### [BUG-07] 27 elemen gagal kontras AA, terburuk hijau "+ Rp 500.000" hanya 2.28:1 — severity: TINGGI

**Persona dan use-case:**
Saya perlu membedakan beberapa status tanpa membaca semua: sudah/belum, dana sudah
cair/belum, aman/belum aman. Aplikasi mengandalkan **warna** — dan warna berarti
kontras. Saya perlu tahu apakah "hijau = baik" atau "hijau pucat = hampir tak terlihat".

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`.
2. Untuk setiap elemen berteks, hitung rasio kontras WCAG terhadap **latar efektif**
   (naik ke parent sampai ketemu `alpha >= 0.999`, komposit alpha dihitung).

**Harapan:**
Semua teks **≥ 4.5:1** (AA untuk teks normal), **≥ 3:1** untuk teks besar.

**Kenyataannya:**
```
jumlahTeksDiperiksa = 734
min = 2.28:1     <- TERBURUK
p5  = 4.74:1     p25 = 5.33:1     median = 18.09:1     max = 21:1
jumlah < 4.5:1 = 27
jumlah < 3:1   = 1
```
Tujuh pola gagal:

| # | Rasio | Font | Warna teks | Latar | Elemen | Teks |
|---|---|---|---|---|---|---|
| 1 | **2.28:1** | 14px | `rgb(34,197,94)` hijau | `#FFFFFF` | `.adj-in .amt` | "**+ Rp 500.000**" |
| 2 | 3.58:1 | 11px | `rgb(5,150,105)` hijau | `#ECFDF5` | `.badge` | "Kas" ×18 |
| 3 | 3.76:1 | 12px | `rgb(255,255,255)` putih | `#EF4444` merah | `.btn-danger` | "**Hapus event**" |
| 4 | 3.77:1 | 12px | `rgb(5,150,105)` hijau | `#FFFFFF` | `td.text-xs.font-bold` | "otomatis ✓" ×3 |
| 5 | 3.77:1 | 12px | `rgb(5,150,105)` hijau | `#FFFFFF` | `span.font-bold` | "+Rp 350.000" |
| 6 | 3.86:1 | 12px | `rgb(119,119,119)` abu | `#EEEEEE` | `.w-6.h-6` nomor tahap | "4" / "5" ×2 |
| 7 | 3.76:1 | 14px | `rgb(239,68,68)` merah | `#FFFFFF` | `.adj-out .amt` | "− Rp 25.000" |

Pola di luar Layar Kerja: `#/products` **16 elemen** gagal (8× badge "aktif" 3.58:1 +
8× tombol "Hapus" 3.76:1), `#/events/evt-3` 12, `#/settings` 5, `#/archive` 4,
`#/events` 4, `#/dashboard` 2. Halaman **Panduan**, **Rekap Global**, dan
**Master Barang** = **nol** gagal.

Yang paling berbahaya justru **toast**:
```
toast sukses  = teks rgb(255,255,255) di latar rgb(34,197,94) -> 2.28:1
toast gagal   = teks rgb(255,255,255) di latar rgb(239,68,68) -> 3.76:1
```
Artinya **pesan yang seharusnya menenangkan saya justru yang paling susah dibaca** —
dan toast itulah satu-satunya umpan balik setelah salah ketuk.

Nomor 1 adalah yang paling halus: **hijau `#22C55E` dengan rasio 2.28:1** dipakai
untuk menunjukkan **penyesuaian kas positif / pemasukan**. Di layar terang, hijau muda
di atas putih praktis tak terlihat. Saya akan mengira penyesuaian kas = nol.

Nomor 6 perlu dicatat: nomor tahap yang belum dikerjakan dirender dengan inline style
`background:#eee; color:#777` yang **secara sengaja** dibuat lebih redup dari tahap
yang selesai (`background:#111; color:#fff`). Secara logika benar, tapi 3.86:1 tetap
di bawah ambang — dan ini informasi yang sangat penting buat saya ("tahap ini belum
kerjakan").

**Evidence:**
```
CSS: --success: #22C55E   css/styles.css:17
     --danger : #EF4444   css/styles.css:19
     .adj-in  .amt { color: var(--success) }  css/styles.css:224
     .adj-out .amt { color: var(--danger) }   css/styles.css:225
     .btn-danger { background: var(--danger); color:#fff } css/styles.css:68
     .toast.success { background: var(--success) } css/styles.css:136
     .toast.error   { background: var(--danger) }  css/styles.css:135
Badge hijau 3.58:1 dan oranye "Pending" 2.86:1 datang dari STATUS_MAP / walletBadge
di js/ui.js.
```

**Dampak ke pengguna awam:**
Ini **`kena()` yang paling halus** — dan justru itu sebabnya berbahaya, karena saya
**tidak sadar ada yang salah**. Kasus nyata: Seksi 06 menampilkan "Setoran kas dari
tim panitia **+ Rp 500.000**" dalam hijau pucat. Kalau saya tidak membandingkan dengan
baris di bawahnya ("Selisih kas opname − Rp 25.000" yang merah muda sedikit lebih
jelas), saya akan mengira penyesuaian kas nol dan laporan saya salah. "otomatis ✓"
di Seksi 07 yang hilang artinya saya **kehilangan kepastian bahwa barang saya benar
tercatat pulang**.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Gelapkan `--success` dari `#22C55E` ke versi yang mencapai ≥4.5:1 di atas putih
(mis. `#15803D` atau `#166534`). Gelapkan `--danger` dari `#EF4444` ke `#B91C1C` —
nilai itu **sudah dipakai** di dalam aplikasi sendiri untuk
`STATUS_MAP.dibatalkan` dan rasionya jauh lebih baik, jadi konsistensi internal
justru meningkat. Perbaiki inline style nomor tahap (`#777` di `#eee`) ke abu-abu
lebih gelap, atau lebih baik lagi: **berikan label teks eksplisit** ("Belum dikerjakan")
supaya informasi tidak bergantung pada warna saja.

---

### [BUG-08] 8 dari 12 tabel harus digeser horizontal 57–303px di layar 360px — severity: SEDANG

**Persona dan use-case:**
Layar HP saya 360px. Saya sedang mengisi Seksi 03 "Produk dan Qty" — kolom
"Dibawa", "Terjual", "Rusak/Hilang", "Kembali". Tabelnya **jauh lebih lebar dari
layar**, dan kolom "Hapus" ada di ujung kanan.

**Langkah reproduksi:**
1. Buka aplikasi di viewport **360px CSS**. Saya memakai `<iframe width="360">`
   karena `--window-size=360` di Edge headless di-clamp ke 492px, jadi angka dari
   window langsung tidak valid.
2. Di dalam iframe:
   ```js
   [...document.querySelectorAll('.overflow-x-auto')].forEach(function (w) {
     var t = w.querySelector('table');
     if (t && w.scrollWidth > w.clientWidth + 2) {
       console.log(t.textContent.slice(0, 30), t.offsetWidth, w.clientWidth);
     }
   });
   ```

**Harapan:**
Tabel utama di layar 360px harus terbaca tanpa digeser, atau minimal ada **indikator
yang jelas** bahwa tabel bisa digeser.

**Kenyataannya:**
```
viewport dalam iframe = 360 x 640
apakah terjadi overflow horizontal? YA, scrollWidth = 612px  (1.7x lebar layar)

jumlah tabel yang perlu digeser horizontal = 8 dari 12
   "Produk / Qty Dibawa / Terjual / Rusak/Hilang / Kembali"  lebar=566px vs container=263px -> geser 303px
   "Produk / Dibawa / Terjual / Rusak / Kembali / Rekap"      lebar=463px vs container=263px -> geser 200px
   "Item / Kategori / Qty / Biaya / Dibawa?"                 lebar=453px vs container=263px -> geser 190px
   "Item / Kategori / Qty / Biaya (est.) / Status / Pulang"  lebar=445px vs container=263px -> geser 182px
   "Aset / Jenis / Rekap - status / Dibawa pulang / Audit"    lebar=432px vs container=263px -> geser 169px
   "Wallet / Masuk / Keluar / Saldo"                         lebar=320px vs container=263px -> geser  57px
```
Container hanya **263px** (bukan 360px), jadi tabel terpanjang harus digeser
**303px** — hampir seluruh lebar layar. Dan `documentElement.scrollWidth = 612px`
berarti **seluruh halaman** ikut meluber, bukan cuma di dalam wrapper tabel.

`#toast-root` juga meluber: di viewport 360px, toast 331px berada di
`x = -2 .. 329` (keluar layar karena diposisikan `right-4` dalam flex
`w-[min(92vw,360px)]`).

**Evidence (iframe 360px, harness `_QA_TMP/a08_iframe.html`):**
```
viewport dalam iframe            = 360 x 640
dokumen scrollWidth              = 612px   -> 1.7x lebar layar
jumlah tabel perlu digeser       = 8 dari 12
container wrapper (clientWidth)  = 263px
tabel terpanjang                 = 566px   -> harus digeser 303px
tabel paling ringan yang meluber = 320px   -> harus digeser  57px
#toast-root                       = 331 x 45px  pada x = -2 .. 329
elemen < 200px di 360px          = 13 dari 60 kontrol input/select
```
Angka ini diambil dari DOM di dalam iframe, bukan dari `window.outerWidth`, karena
`--window-size=360` di Edge headless dikoreksi ke 492px dan akan memberi hasil
optimis yang tidak terjadi di HP asli.

**Dampak ke pengguna awam:**
Geser horizontal satu jari **sulit dan sering salah** — terutama kalau saya sedang
memegang HP dengan dua tangan. Lebih parah, **kolom "Hapus" ada di ujung kanan** tabel, jadi
untuk menghapus satu baris saya harus menggeser sampai ke kanan, persis seperti
keluhan saya di BUG-06. Untuk pengguna seperti saya yang tidak suka drag layar,
ini menghentikan pekerjaan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Pada layar < 640px, ubah tabel bertumpuk menjadi **kartu satu-per-baris**: nama
produk sebagai judul kartu, lalu pasangan label-nilai di bawahnya — ini menghapus
kebutuhan scroll horizontal sepenuhnya. Kalau tetap memakai tabel, tambahkan
**indikator geser yang jelas** (panah atau teks "Geser →") di tepi kanan, dan
letakkan kolom aksi ("Hapus") di kolom pertama yang **beku** (`position: sticky; left: 0`).
Perbaiki juga `#toast-root` supaya tidak meluber di layar sempit.

---

### [BUG-09] Toast hilang dalam 3 detik dan tidak menyebut data yang berubah — severity: SEDANG

**Persona dan use-case:**
Setelah saya klik "Hapus" atau "Simpan", saya **tidak sempat** membaca pesan
konfirmasi. Saya sedang memiringkan kepala untuk membaca — eh, pesannya sudah
hilang.

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`, klik tombol "Hapus" di form mana saja.
2. Amati toast di kanan bawah.
3. Baca kode `js/ui.js:67-68`.

**Harapan:**
Toast bertahan **minimal 5–6 detik** dan **menyebutkan data yang berubah**, supaya
saya bisa mencocokkannya dengan yang saya ingat. Untuk pesan destruktif, harus ada
**Undo**.

**Kenyataannya:**
```
js/ui.js:67   setTimeout(function () { el.style.opacity='0'; el.style.transition='opacity .3s'; }, 2600);
js/ui.js:68   setTimeout(function () { el.remove(); }, 3000);
toast = 360x45px  font=14px  fg=rgb(255,255,255)  bg=rgb(34,197,94)  -> kontras 2.28:1
posisi di layar 360px: x = -2 .. 329  -> MELEBUR keluar layar
durasi = 2600ms fade + 3000ms remove = 3 detik, tanpa parameter durasi
```
Dan pesan **tidak pernah** menyebut data yang berubah untuk aksi destruktif:
```
"Rute dihapus"            (rute mana?)
"Milestone dihapus"       (tahap mana?)
"Dokumen dihapus"        (dokumen mana?)
"Penyesuaian dihapus"     (Rp berapa?)
"Sumber dana dihapus"    (sumber mana?)
"Alokasi dihapus"        (kategori mana?)
"Item persiapan dihapus" (item mana?)
"Transaksi dihapus"       (produk apa? qty berapa?)
"Pengeluaran dihapus"     (kategori apa? Rp berapa?)
```
Polanya **tidak konsisten**: pesan yang menambah data justru **sudah** menyebut
nominal — `"Penjualan tercatat Rp 250.000"`, `"Pengeluaran dicatat Rp 320.000"`,
`"Penyesuaian kas dicatat Rp 500.000"`, `"Alokasi Penginapan Rp 900.000 ke Bank"`.
Jadi polanya sudah tersedia, cuma tidak dipakai di jalur hapus — padahal di jalur hapus
justru saya paling butuh tahu **data yang mana** yang hilang.

**Evidence:**
```
src js/ui.js:60-69 (A.toast) — 2600ms/3000ms hardcoded, tanpa opsi durasi
src js/actions.js — 9 pesan hapus tanpa detail:
   :166 "Rute dihapus"          :277 "Milestone dihapus"
   :299 "Dokumen dihapus"       :316 "Penyesuaian dihapus"
   :337 "Sumber dana dihapus"   :375 "Alokasi dihapus"
   :406 "Item persiapan dihapus" :449 "Transaksi dihapus"  :465 "Pengeluaran dihapus"
src js/actions.js — pesan tambah sudah menyebut nominal (pola yang benar):
   :310 "Penyesuaian kas dicatat " + ui.fmt(jumlah)
   :369 "Alokasi " + kategori + " " + ui.fmt(alokasi) + " ke " + wallet
   :443 "Penjualan tercatat " + ui.fmt(qty * harga)
   :459 "Pengeluaran dicatat " + ui.fmt(jumlah)
```

**Dampak ke pengguna awam:**
Ini **frustrasi** yang halus. Situasi saya: klik "Hapus", toast muncul (putih di hijau,
kontras 2.28:1), saya **tidak sempat** memastikan itu transaksi yang benar. Tiga detik
kemudian pesannya hilang, dan saya **tidak yakin** saya menghapus yang benar atau
tidak. Ketidakyakinan ini **membekukan** — saya berhenti bekerja untuk memeriksa ulang
seluruh tabel, padahal datanya sudah tidak ada.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Buat `A.toast(msg, type, opts)` menerima opsi durasi; gunakan **6–8 detik** untuk
pesan penghapusan atau perubahan yang tidak bisa dibatalkan, dan sediakan tombol
tutup manual. Untuk pesan hapus, **sebutkan identitas data** — contoh:
"Pengeluaran *Konsumsi · Rp 120.000* dihapus". Karena toast hapus adalah tempat
alami untuk menyisipkan **"Urungkan" (Undo)**, perubahan ini sekaligus menutup
separuh BUG-02. Perbaiki juga kontras toast (BUG-07) dan posisinya di layar sempit.

---

### [BUG-10] Tombol hapus bertumpuk 21–29px dari "Hapus" lain; "Hapus event" hanya 8px dari "Edit event" — severity: SEDANG

**Persona dan use-case:**
Di Seksi 08 ada lima tombol "Hapus" berurutan vertikal, semua sama saja. Di header
event ada deretan tombol: "Cetak SPPD", "Edit SPPD", "Download Dokumen",
"Edit event", "**Hapus event**". Saya ingin menyunting, tapi jari saya salah mendarat
di ujung kanan yang berwarna merah.

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`.
2. Hitung jarak antar target interaktif di sekitar setiap tombol hapus:
   ```js
   document.querySelectorAll('[data-action*="delete"],[data-action*="remove"]')
   ```
3. Untuk header: ukur `[data-action="event:edit"]` vs `[data-action="event:delete"]`.

**Harapan:**
Antara dua aksi yang berlawanan (tambah vs hapus), dan antara "Edit" vs "Hapus
event", harus ada jarak fisik yang jelas dan pengelompokan visual yang berbeda.

**Kenyataannya:**
```
tombol hapus dengan target interaktif lain < 12px = 3 dari 32
   "Hapus event" [event:delete]  jarak  8px -> button.btn.btn-sm.btn-ghost | "Edit event"
   "Hapus"       [danaCair:delete] jarak  8px -> select.select.text-sm.w-28  | "Belum/Cair"
   "Hapus"       [danaCair:delete] jarak  8px -> select.select.text-sm.w-28  | "Belum/Cair"
tombol hapus dengan target lain 12-30px = 16
   "Hapus" [budget:delete]   jarak 29px -> button.btn.btn-sm.btn-ghost | "Hapus"   (5x)
   "✕"     [milestone:delete] jarak 16px -> button.btn.btn-sm.btn-soft | "+ Dokumen" (5x)
   "Hapus" [prepitem:delete] jarak 26px -> button.btn.btn-sm.btn-ghost | "Hapus"
   "Hapus" [prepitem:delete] jarak 21px -> button.btn.btn-sm.btn-ghost | "Hapus"
Header: "Edit event" 79x32px ; "Hapus event" 93x32px ; jarak horizontal = 8px
```
Jadi: **lima tombol "Hapus" identik** bertumpuk dengan jarak 29px, **dua** tombol
"Hapus" Dana Cair hanya **8px** dari dropdown statusnya, dan tombol merah
"Hapus event" hanya **8px** dari "Edit event".

Kabar baiknya: `event:delete` **sudah** punya konfirmasi, dan teks modalnya jelas —
"All data SPPD, produk, penjualan & keuangan event ini ikut terhapus." Jadi risikonya
sedang, bukan kritis. Yang memperburuk hanya jaraknya dan posisinya di ujung paling kanan.

Modal konfirmasinya sendiri juga perlu Catatan: tombol **"Batal" 68×42px** dan
**"Hapus" 76×42px**, keduanya `font=14px`, dengan **jarak 8px** — tombol konfirmasi
merah berada di kanan, jadi refs refleks "Batal" yang aman memang tidak salah posisi.

**Evidence:**
```
src js/pages.js:194
  '<button class="btn btn-sm btn-danger" data-action="event:delete">Hapus event</button>'
jarak 8px = jarak standar Tailwind gap-2 pada .ev-head-actions
Modal konfirmasi (diuji lewat product:delete): modal 549x148px
   "Batal" 68x42  font=14px      "Hapus" 76x42  font=14px
   jarak "Batal" -> "Hapus" = 8px horizontal
   teks modal 14px / rgb(107,107,107) -> "Produk ikut terhapus dari checklist & penjualan event."
   src js/ui.js:94-109 (A.confirm)
```

**Dampak ke pengguna awam:**
Saya harus **menahan diri** setiap mau menghapus apa pun, karena tidak yakin saya akan
menekan yang benar. Untuk pengguna yang tidak terbiasa dengan keyboard atau tombol
**Escape**, "Batal" adalah save mereka — dan thankfully "Batal" ada di sebelah kiri,
jadi aman untuk diklik. Yang tidak aman adalah "Hapus" di Dana Cair yang cuma 8px
dari dropdown status: saya bisa saja intending **mengubah status** lalu menyentuh
"Hapus".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Berikan jarak lebih lebar (`gap-6` atau `ml-6`) antara "Edit event" dan "Hapus event",
atau pindahkan "Hapus event" ke menu `⋯`. Untuk daftar bertumpuk, beri pemisah
visual setiap baris atau relegated tombol hapus ke ujung baris yang berjauhan dari
kontrol lain. Naikkan tinggi tombol modal dari 42px ke ≥44px.

---

### [BUG-11] Target sentuh di header dan nav: link 36px, logo 28px, link Arsip hanya 23px — severity: RENDAH

**Persona dan use-case:**
Saya pindah halaman dengan mengetik nama halaman di nav: "Dashboard", "Event & Tugas",
"Arsip". Di halaman Arsip saya klik nama event-nya.

**Langkah reproduksi:**
1. Buka `index.html#/archive`, lalu `#/dashboard`.
2. Ukur `a.whitespace-nowrap.px-3.py-2` di nav, `a.font-display.text-xl` di logo,
   dan `a.font-extrabold.hover:text-accent` (nama event) di Arsip.

**Harapan:**
Semua target navigasi minimal **44px** tinggi, dan yang berada di konten minimal
44×44px.

**Kenyataannya:**
```
#/archive : elemen interaktif = 23 | <44px = 23 | <24px = 9
   A 189.6x23  "Pekan Inovasi Daerah"    <- nama event di daftar arsip
   A  203x23   "Sosialisasi UMKM Kota"   <- nama event di daftar arsip
   A  129.5x28 "SPPDToolbox"             <- logo di header
   A  59.8x36  "Arsip"                   <- link nav
   A  72.2x36  "Produk"                  <- link nav
   A  97.1x36  "Dashboard"               <- link nav
   A 120.2x36  "Event & Tugas"           <- link nav
   A 121.3x36  "Master Barang"           <- link nav
   A 113.5x36  "Rekap Global"            <- link nav
   A 101x36    "Pengaturan"              <- link nav
#/dashboard : elemen interaktif = 16 | <44px = 16 | <24px = 0
   target terkecil di header = 24px -> 5 elemen
```
Perhatikan juga: **9 target di halaman Arsip lebih kecil dari 24px** — lebih kecil
dari setengah lebar jari telunjuk dewasa.

**Evidence (desktop 1576×761, harness `_QA_TMP/a08_measure.js`):**
```
#/archive    : elemen interaktif = 23 | <44px = 23 | <24px = 9
#/dashboard  : elemen interaktif = 16 | <44px = 16 | <24px = 0
selector sumber: nav a = .px-3.py-2 ; logo = .font-display ; nama event = a.font-extrabold
```
Jadi di halaman Arsip **23 dari 23 target** lebih kecil dari 44px, sedangkan di
Dashboard semuanya 36px. Tidak ada target sentuh di header maupun nav yang mencapai
standar 44px, di kedua halaman.

**Dampak ke pengguna awam:**
Ini bukan yang paling parah, tapi nav adalah hal pertama yang harus benar, karena
saya harus pindah halaman sering. Klik kosong pada link nav 36px sering tidak
tercatat dan saya harus klik dua kali.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Naikkan `padding` vertikal link nav dari `py-2` (36px) ke `py-3` (44px), dan beri
`min-height: 44px` pada nama event di daftar Arsip plus `display: flex;
align-items: center`. Logo di header tidak wajib 44px karena bukan target utama,
tapi area kliknya sebaiknya diperluas.

---

### [BUG-12] 13 dari 60 input hanya 96–100px di layar 360px untuk kolom kuantitas — severity: RENDAH

**Persona dan use-case:**
Di Seksi 03 saya mengisi kolom "Dibawa", "Rusak", "Kembali" untuk setiap produk.
Kolomnya sempit sekali di layar HP.

**Langkah reproduksi:**
1. Buka aplikasi di viewport **360px CSS** (lewat `<iframe width="360">`).
2. Hitung input yang lebih sempit dari 200px:
   ```js
   [...document.querySelectorAll('#app .input, #app .select')]
     .filter(function (e) { return e.getBoundingClientRect().width < 200; })
   ```

**Harapan:**
Input kuantitas minimal ~120px, dan input angka sebaiknya `inputmode="numeric"`
supaya HP membuka keyboard angka.

**Kenyataannya:**
```
input/select < 200px = 13 dari 60
   #ep-evp-*-rusak   100x40px
   #ep-evp-*-rusak   100x40px
   (tanpa id)         98x40px   (6x)
   #ep-evp-1-bawa     96x43px
Lebar 96–100px = sekitar 5 karakter. Angka seperti "1.350.000" tidak muat,
dan kotak ini hanya ~2.5x lebar jari telunjuk saya.
input angka: total 16, terkecil 43px tinggi
   #ep-evp-1-bawa  96x43  value="20"   min=0 step=null class="input w-24"
```

**Evidence (iframe 360px + kode):**
```
total input/select di Seksi 03 = 60
lebar < 200px                   = 13   (semua di kolom kuantitas)
lebar terlebar di grup ini     = 100px, terkecil 96px
class sumber                   = .input.w-24  -> 6rem = 96px
atribut inputmode="numeric"    = 0 dari 16 input angka
```
Semua 13 input sempit itu adalah kolom qty ("Dibawa", "Terjual", "Rusak", "Kembali"),
yaitu input yang paling sering saya isi. Tidak satu pun punya `inputmode`, jadi HP
membuka keyboard alphabetic dan menambah satu langkah annoyance di setiap pengisian.

**Dampak ke pengguna awam:**
Saya sering salah ketik digit karena kolom terlalu sempit dan tidak ada ruang untuk
membandingkan dengan angka di sebelahnya. Untuk kolom qty yang isinya kecil (1–100)
masih tolerable, tapi kalau ada qty tiga digit, saya harus ekstra hati-hati.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Naikkan `w-24` menjadi `w-28`/`w-32` di layar < 640px, atau ubah baris tabel produk
menjadi kartu bertumpuk seperti usulan BUG-08. Pastikan `inputmode="numeric"` dan
`pattern` yang sesuai agar keyboard HP langsung menampilkan angka.

---

### [BUG-13] `.psec-sub` hanya 16px per baris dan `th` uppercase 11px membuat teks berdesakan — severity: RENDAH

**Persona dan use-case:**
Saya memindai halaman cepat untuk mencari baris tertentu — pola yang saya pelajari
dari koran: cari **judul kolom** dulu, baru turun ke baris. Setelah itu saya baca
**subjudul seksi** untuk tahu apakah seksi itu sudah tuntas.

**Langkah reproduksi:**
1. Buka `index.html#/events/evt-1`, Seksi 03 atau 08.
2. Di Console:
   ```js
   getComputedStyle(document.querySelector('.table th')).lineHeight;
   getComputedStyle(document.querySelector('.psec-sub')).lineHeight;
   document.querySelector('.psec-sub').getBoundingClientRect().height;
   ```

**Harapan:**
`line-height` minimal **1.5** untuk teks 12px (≈18px per baris), dan tinggi baris
header tabel minimal 36–40px.

**Kenyataannya:**
```
.table th : font=11px weight=800 uppercase letterSpacing=0.44px
             padding=8px 10px  -> tinggi baris 33px   (54 th)
.psec-sub  : font=12px weight=500 color=rgb(107,107,107)
             tinggi baris = 16px   (ratio 1.33)
             teks contoh: "SPPD Disetujui - 2 rute - Dana cair Rp 1.500.000"
CSS: .psec-title { font-size:14px; font-weight:800; line-height:1.3 }  css/styles.css:272-275
     .psec-sub   { font-size:12px; font-weight:500; color:var(--text-secondary) }
                                                                     css/styles.css:279-281
     .table th   { font-size:11px; padding:8px 10px }                 css/styles.css:96-97
```
`.psec-title` punya `line-height: 1.3` (≈18px untuk font 14px). `.psec-sub` tidak
punya `line-height` eksplisit sama sekali, jadi mewarisi default browser ≈1.2.

**Evidence (computed style, `evt-1` desktop 1576×761):**
```
.table th   : font-size 11px, uppercase, letter-spacing 0.44px, padding 8px 10px
               tinggi baris = 33px   (jumlah elemen th = 54)
.psec-sub    : font-size 12px, weight 500, color rgb(107,107,107)
               tinggi baris = 16px   -> rasio line-height 1.33 (butuh >= 1.5)
               target 12px x 1.5 = 18px  -> kekurangan 2px per baris
.psec-title  : font-size 14px, line-height 1.3  (css/styles.css:272-275)
.psec-sub    : tanpa line-height eksplisit        (css/styles.css:279-281)
.table th    : font-size 11px, padding 8px 10px   (css/styles.css:96-97)
kontras .psec-sub = 5.33:1  -> LULUS AA, jadi ini murni masalah kerapatan
```
Angka `18px` adalah target `12px × 1.5`, bukan hasil pengukuran — semua angka lain
di blok ini hasil `getComputedStyle` langsung.

**Dampak ke pengguna awam:**
`.psec-sub` adalah **ringkasan status** — "2 dari 5 tahap selesai", "3 item · 2
dibawa", "4 transaksi · Rp 3.480.000". Ini justru informasi paling berharga untuk
keputusan cepat saya, tapi dirender paling rapat (12px, abu-abu, baris 16px).
Kontras teksnya **lulus AA** di 5.33:1 — jadi masalahnya murni kerapatan, bukan
warna. `th` 11px uppercase + letter-spacing memperparah (BUG-03).

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
Tambahkan `line-height: 1.5` pada `.psec-sub`, `.label`, `.badge`, `.table td`, dan
`.psec-title`. Naikkan padding vertikal `.table th` dari 8px ke 12px agar tinggi
baris jadi ~38px. Setelah font diperbesar (BUG-03), `th` 14px dengan `line-height:1.4`
akan punya tinggi ~42px — cukup untuk pemindaian yang nyaman.

---

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Zoom browser TIDAK diblokir.** `<meta name="viewport" content="width=device-width, initial-scale=1">`
  — **tidak ada** `user-scalable=no` dan **tidak ada** `maximum-scale=1`. Ini
  **sangat penting** untuk saya dan sering hilang di refactor. Jangan pernah tambahkan.
- **Angka besar sangat mudah dibaca.** `.overall-progress .big-num` **56px** dengan
  rasio kontras **21:1** (rasio tertinggi di seluruh aplikasi), `.stat-num` 30px
  untuk judul event, `.psec-num` 22px untuk nomor seksi. Saldo, total, dan progres
  persiapan langsung terbaca dari jauh.
- **Halaman Panduan bersih total.** Distribusi font `12px=3, 14px=9, 15px=15, 16px=69,
  20px=2, 36px=1` — **nol elemen di bawah 12px**, dan **nol kontras gagal**
  (`jumlah <4.5:1 = 0`, min 4.74:1). Halaman **Rekap Global** (`81` elemen teks,
  nol di bawah 12px, nol kontras gagal) dan **Master Barang** (`91` elemen teks,
  nol di bawah 12px, nol kontras gagal) juga bersih. Ini **membuktikan** developer
  bisa membuat halaman readable — tinggal menerapkannya ke Layar Kerja.
- **Tombol besar sudah benar ukurannya.** `.btn` (bukan `btn-sm`) = **43px tinggi**,
  `.input`/`.select` = **43px**. Secara praktis sudah 44px. Jadi **sudah ada** fondasi
  yang benar; hanya `btn-sm`, `badge`, `psec-fold`, dan `flow-pill` yang perlu diperbesar.
- **Semua 60 checkbox sudah dibungkus `<label>` — 0 tanpa label.** Ini penting: area
  ketuk sudah lebar (**642px**) dan **label bisa diketuk**; hanya **tinggi**-nya (28px)
  yang perlu diperbesar. Fondasi sudah benar.
- **Pola konfirmasi sudah ada dan dipakai di tempat yang paling berisiko.** `event:delete`
  dan `product:delete` memakai `ui.confirm()` dengan **teks penjelasan lengkap**
  ("Semua data SPPD, produk, penjualan & keuangan event ini ikut terhapus"), dan
  modalnya menaruh **"Batal" di kiri, "Hapus" (merah) di kanan** — posisi yang aman
  untuk refleks. Tinggal diterapkan konsisten ke action lain.
- **Tombol hamburger punya `aria-label="Menu"`** dan **tombol lipat seksi punya
  `aria-label="Buka / tutup seksi"`**. Developer **sudah** sadar akan kebutuhan
  nama-yang-dibaca; hanya tombol "✕" dan "+ Dokumen" yang terlewat.
- **Tombol tanpa teks DAN tanpa nama terbaca = 0** di semua 10 route yang diuji.
- **Nav memiliki label teks, bukan ikon saja.** Semua 8 halaman punya label jelas:
  "Dashboard", "Event & Tugas", "Arsip", "Produk", "Master Barang", "Rekap Global",
  "Panduan", "Pengaturan". Tidak ada ikon misterius di nav.
- **Toast untuk aksi yang menambah data sudah menyebut nominal** —
  "Penjualan tercatat **Rp 250.000**", "Alokasi **Penginapan Rp 900.000** ke **Bank**".
  Ini **pola yang benar** dan harus ikut diterapkan ke pesan hapus.
- **Tombol "Reset Data Dummy" sudah memakai konfirmasi** dengan teks
  "Semua data kamu diganti dengan contoh dummy."
- **Hampir semua input punya `<label>` yang terlihat** (103 elemen `<label>`, hanya 7 yang
   punya atribut `for=`). Pengecualian 3 input yang hanya punya placeholder tanpa label
   terlihat: "judul milestone", "nama item - mis. Kabel Rol 5 m", "catatan (opsional)" —
   tapi judul seksi di atasnya sudah menjelaskan, jadi **tidak kritis**.
- **Layout responsif bekerja dan rapi.** `@media (min-width: 1024px) .card-pad { padding: 28px 32px }`,
  `.form-grid-2` jadi 2 kolom di ≥640px, `.work-cols` jadi 2 kolom di ≥1500px dengan
  `break-inside: avoid`. Pada 360px, layout tetap utuh — tidak ada elemen yang menumpuk
  berantakan atau tumpang tindih.
- **Tidak ada error JavaScript sama sekali** di 10 route yang diuji (`errors=[]`),
  dan data seed selalu konsisten (`lsKeys=0` setiap run).
- **Jumlah elemen teks per halaman di luar Layar Kerja sangat terkendali** —
  Dashboard 67, Arsip 65, Produk 85, Master 91, Rekap 81, Panduan 99, Pengaturan 39.
  Hanya Layar Kerja yang besar: 734 elemen dengan 50% di bawah 14px.

---

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah target resminya desktop kantor atau HP lapangan?** Aplikasi jelas dirancang
  untuk layar lebar (`max-w-[1800px]`, 2 kolom di ≥1500px, `work-cols` 2 kolom).
  **Perlu konfirmasi**: kalau targetnya laptop di kantor, perbaikan BUG-08 (tabel jadi
  kartu) bisa ditunda dan cukup perbaiki `btn-sm`, `badge`, `th`. Kalau HP di lapangan,
  BUG-08 jadi prioritas setara dengan BUG-01.

- **Apakah batas minimum lebar yang disepakati adalah 360px?** Saya menguji 360px
  karena itu HP lama yang paling sering dipakai UMKM. **Perlu konfirmasi** apakah ada
  target min-width lebih besar (mis. 390–430px untuk iPhone modern). Kalau 390px+,
  sebagian temuan BUG-08 mungkin tidak separah; tapi **BUG-01, 02, 03, 04, 05, 06, 07
  tetap berlaku di semua lebar layar**.

- **Apakah "prioritas" perbaikannya kontras atau ukuran?** Dari sudut pandang saya,
  **ukuran** (BUG-03, BUG-04) lebih penting karena 50% elemen di bawah 14px. Tapi
  **kontras hijau 2.28:1** (BUG-07 nomor 1) adalah yang paling **berbahaya** justru
  karena **tidak terlihat** — saya tidak tahu ada yang salah. Keduanya penting, dan
  urutan pengerjaannya perlu diputuskan produk.

- **Apakah boleh mengubah palet warna untuk mencapai WCAG AA?** Hijau `#22C55E`
  (2.28:1) dan oranye `#D97706` (2.86:1) mungkin warna brand yang dipakai konsisten.
  **Perlu konfirmasi**: boleh diganti dengan versi gelap (`#15803D` / `#166534`),
  atau harus mempertahankan warna dan menambah border/underline pada teks
  berkontras rendah? Catatan: aplikasi **sudah** memakai `#B91C1C` untuk status
  "dibatalkan", jadi precedent untuk warna yang lebih gelap sudah ada.

- **BUG-02 (tidak ada pemulihan) — apakah ini in-scope untuk prototype?** Bagaimana
  prototipe ini akan berevolusi ke GAS + Supabase? Kalau nanti ada backend, apakah
  **soft-delete / arsip** akan diambil? Saya tahu ini mungkin di luar scope prototipe,
  tapi dampaknya nyata dan saya tidak tahu apakah sudah ada rencana. **Perlu konfirmasi**
  dari produk.

- **Apakah target audiens sudah diputuskan? (untuk istilah akuntansi)** Aplikasi ini
  untuk UMKM, tapi istilah seperti "opname", "Rekap Global", "Milestone",
  "Cross-check", dan kolom "Sisa" bernilai negatif (`Rp -320.000`, `Rp -60.000`,
  `Rp -205.000` ketiganya muncul di Layar Kerja) cenderung teknis. **Perlu konfirmasi**:
  apakah ada glosarium di halaman Panduan? Kalau belum, ini peluang bagus — dan
  `Rp` sendiri muncul **46 kali** di Layar Kerja, jadi format uangnya sendiri perlu
   agak dijelaskan untuk audiens luas.

- **Saya tidak menemukan bug "teks abu-abu di atas putih yang nyaris tak terlihat"
  yang murni abu-abu.** Semua teks muted (`#6B6B6B` di atas `#FFFFFF` / `#FAFAFA`)
  punya kontras **5.11–5.33:1** dan **lulus AA**. Yang gagal adalah **hijau** (2.28:1),
  **oranye** (2.86:1), dan **putih-di-atas-merah** (3.76:1). Jadi masalah kontras di
  aplikasi ini **bukan** abu-abu di putih seperti yang saya duga, tapi **warna status
  yang terlalu cerah/saturasi** — dan warna brand itu justru dipakai paling luas.
  Ini catatan positif: palet netralnya sehat.

---

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| **Ukuran huruf** | 1.5 / 5 | 117 elemen (16%) 11px, 364 elemen (50%) di bawah 14px, semua badge dan header tabel 11px. Tidak ada cara memperbesar di dalam aplikasi, dan 220 elemen terkunci px tidak ikut skala font browser. (BUG-03, BUG-04) |
| **Kontras** | 2.5 / 5 | Median bagus (18.09:1) tapi **27 elemen gagal AA** di Layar Kerja, termasuk **hijau 2.28:1** untuk penyesuaian kas positif dan **toast sukses 2.28:1**. Yang gagal justru yang **paling penting** dan **tidak terlihat**. Palet abu-abunya justru sehat (5.1–5.3:1). (BUG-07) |
| **Target sentuh** | 1.5 / 5 | **61 target < 24px** termasuk **checkbox 13×13px** (sebesar ujung kuku) dan **tombol lipat 26×26px**. 191 dari 202 target < 44px. Checkbox sudah ada `<label>`nya (fondasi benar) tapi tingginya cuma 28px. (BUG-05, BUG-11) |
| **Ketahanan salah ketuk** | 1 / 5 | **Ini paling lemah.** 10 dari 11 action hapus menghapus data seketika tanpa konfirmasi, **8px** antara "Edit" dan "Hapus event", **16px** antara "+ Dokumen" dan "✕", tombol hapus bertumpuk 21–29px, target 59×32px. Sekali salah ketuk → data hilang **permanen** (0 undo, 0 snapshot, 0 tempat pemulihan). (BUG-01, BUG-02, BUG-06, BUG-10) |
| **Label & kejelasan** | 3 / 5 | Nav dan heading **jelas** (label teks, bukan ikon; 0 tombol tanpa nama terbaca). Tapi ada **tombol "✕" 32px tanpa `aria-label` maupun `title`** (5 buah), 8 tombol lipat dengan label identik, istilah "opname" tanpa penjelasan, dan kolom "Sisa" bernilai negatif tanpa keterangan. (BUG-06, BUG-10) |
| **Kemudahan navigasi** | 3.5 / 5 | **8 dari 12 tabel** harus digeser 57–303px di layar 360px, dan halaman meluber (`scrollWidth 612px`). Tapi di layar lebar, layout 2 kolom (`work-cols`) + pill Alur Kerja (8 shortcut) sangat membantu. Pilar untuk desktop sangat baik. (BUG-08) |
| **Konsistensi visual** | 3.5 / 5 | **Konsisten** — semua `.btn-sm` ukurannya sama (32px), semua badge 11px, semua `th` 11px, palet merah/putih/hijau dipakai seragam. Satu kartu bisa memuat 3 ukuran huruf sekaligus (12/14/18px) sehingga agak ramai, tapi bukan parah. |
| **Pesan / feedback** | 2.5 / 5 | Toast **3 detik** terlalu singkat, kontrasnya **2.28:1** (gagal AA), dan pesan hapus **tidak menyebut data yang dihapus** ("Transaksi dihapus" — yang mana?). **Tidak ada Undo**. Pesan tambah **sudah bagus** (menyebut nominal) — polanya sudah ada, tinggal diterapkan ke jalur hapus. (BUG-02, BUG-09) |
| **Halaman non-inti (Panduan/Rekap/Master)** | 4.5 / 5 | **Sangat bagus.** Nol elemen < 12px, nol kontras gagal, font 15–16px dominan. Ini membuktikan developer bisa — tinggal menerapkannya ke Layar Kerja. |
| **Stabilitas teknis** | 4 / 5 | **Nol error JavaScript** di 10 route, data seed konsisten, `localStorage.clear()` selalu menghasilkan `lsKeys=0`. Tidak ada temuan crash atau data korup selain penghapusan yang memang disengaja. |
| **Skor keseluruhan (bobot: keterbacaan visual = 50%)** | **2.2 / 5** | **Secara visual sangat "wah"** tapi **belum bisa dipakai** oleh saya tanpa risiko kehilangan data. Prioritas perbaikan saya: **(1)** konfirmasi + Undo untuk semua action hapus, **(2)** perbesar checkbox dan semua `.btn-sm` ke 44px, **(3)** perbaiki kontras hijau 2.28:1 + toast + tombol "Hapus", **(4)** naikkan `badge`/`th` ke 13–14px dan hapus `uppercase` di `th`, **(5)** ubah `px` ke `rem` dan tambah kontrol ukuran huruf di Pengaturan. |
