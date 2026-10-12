# AGENT-14 — PEDAGANG QRIS & E-Money

> **Persona:** Pedagang UMKM yang terima pembayaran digital (QRIS dan E-Money), cuma punya satu pertanyaan: "duit saya yang QRIS itu sekarang ada berapa, dan E-Money saya habis belum?" · **Fokus:** Alur pembayaran digital & saldo per wallet (Bank/QRIS/Kas/E-Money) di seluruh aplikasi · **Tanggal:** 2026-10-01

---

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 4 |
| SEDANG | 6 |
| RENDAH | 4 |
| **Total** | **14** |

Kesimpulan: **fungsi hitung saldo per wallet-nya sendiri benar** — saya hitung ulang 11 transaksi evt-1 secara
mandiri (sales, kasAdj, transports, expenses) dan hasilnya **persis sama** dengan `store.financeSummary()`.
Penjualan QRIS juga benar-benar masuk ke wallet QRIS (+500.000 pas), dan penjualan E-Money masuk ke wallet
E-Money (+140.000 pas). Jadi tidak ada bug "duit hilang".

Masalahnya ada di **layer informasi**: ada **dua tabel yang sama-sama mengaku "per wallet" tapi menghitung hal
berbeda**, dan keduanya berada di seksi 08 halaman yang sama. "Arus Kas per Wallet" memakai wallet yang
benar-benar dipakai transaksi. "Alokasi & Realisasi per Wallet Tujuan" memakai wallet dari **baris alokasi
SPPD**, bukan wallet transaksi — jadi untuk seed default saja Bank tertulis keluar Rp 1.500.000 padahal
transaksi Bank-nya **nol**. Pedagang yang cuma punya 2 menit dan cuma percaya satu angka akan salah murky
uang. Ditambah Dana Awal Rp 2.500.000 dan Dana Cair BCA Rp 1.500.000 **tidak pernah masuk ke wallet manapun**,
sehingga jumlah 4 saldo wallet (Rp 2.045.000) tidak akan pernah sama dengan "Saldo akhir" (Rp 4.545.000).

---

## Environment yang dipakai

- Edge headless (`msedge --headless=new --virtual-time-budget=15000 --dump-dom`), profil unik
  `prof_agent14` / `agent14b` / `agent14c` / `prof_agent14d4` di `%LOCALAPPDATA%\Temp\opencode`.
- `localStorage.clear()` di awal tiap harness → seed default, 9 event, 8 produk.
- Rute yang diuji: `#/events/evt-1` (Layar Kerja 8 seksi), `#/events/ev-d3`, `#/events/ev-d6`,
  `#/dashboard`, `#/reports`, `#/events`, `#/archive`, `#/products`, `#/master`, `#/guide`, `#/settings`.
- Cara uji: isi form + `el.click()` pada tombol `data-action` sungguhan (bukan panggil fungsi internal),
  lalu baca `<pre id="out">` dari hasil `--dump-dom`. Klaim yang tidak cocok dengan output harness
  diverifikasi ulang di harness terpisah, bukan ditulis apa adanya.
- Hitung ulang saldo per wallet dilakukan manual dari `store.load()` (mentah, tanpa `financeSummary`).
- Semua file aplikasi dibaca saja. Tidak ada file `js/`, `css/`, atau `index.html` yang saya ubah.
- Harness: `_QA_TMP/a14_wallet.html|js`, `a14_wallet2.html|js`, `a14_wallet3.html|js`, `a14_wallet4.html|js`
  (4 batch). Batch 4 khusus memverifikasi klaim pada BUG-07 karena hasil batch 1 tidak mendukung dugaan
  awal saya; klaim itu lalu dikoreksi di dalam temuan tersebut.

---

## Temuan

### [BUG-01] Kolom "Realisasi" di tabel per-wallet-tujuan memakai wallet dari BARIS ALOKASI, bukan wallet transaksi — TINGGI

**Persona dan use-case:** Saya buka seksi 08 untuk jawab "Rp 1.350.000 tiket pesawat itu keluar dari dompet
mana?". Saya lihat tabel "Alokasi & Realisasi per Wallet Tujuan" dan jawabannya: **Bank**.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` dengan seed default.
2. Lihat tabel **Arus Kas per Wallet** → catat kolom *Keluar*.
3. Lihat tabel kedua di card yang sama, judulnya "Alokasi & Realisasi per Wallet Tujuan" → catat kolom *Realisasi*.
4. Bandingkan keduanya.
5. Uji balik: ubah `wallet` baris alokasi `bg-1` (Penginapan, 900.000) dari `Bank` jadi `E-Money`, lalu
   bandingkan ulang kedua tabel.

**Harapan:** Kolom "Realisasi" di tabel per-wallet = uang yang benar-benar keluar dari dompet itu, sama
persis dengan kolom *Keluar* di tabel Arus Kas.

**Kenyataannya:** Kolom *Realisasi* = penjumlahan realisasi **per komponen budget**, yang dikelompokkan ke
wallet tujuan yang tertulis di baris alokasi. Dompet tujuan ("dana ini dialokasikan ke sini") dicampur
adalah dompet sumber ("dana ini dibayar dari sini"). Keduanya tidak sama, dan tidak ada catatan bahwa itu
beda konsep.

**Evidence** (evt-1 seed, angka asli dari DOM):
```
ARUS KAS (wallet BENAR-BENAR dipakai transaksi):
  Bank keluar       0
  QRIS keluar       0
  Kas keluar  1.935.000
  E-Money keluar    0
TABEL "Alokasi & Realisasi per Wallet Tujuan":
  Bank     alokasi 2.250.000   realisasi 1.500.000   <-- 0 rupiah BENAR-BENAR keluar dari Bank
  Kas      alokasi   350.000   realisasi   410.000   <-- 1.670.000 keluar dari Kas, cuma 410.000 dihitung
  E-Money  alokasi   250.000  sisa    realisasi     0
```
Uji balik (baris Penginapan diubah ke E-Money):
```
  Bank     alokasi 1.350.000   realisasi 1.350.000
  E-Money  alokasi 1.150.000   realisasi   150.000
  Arus Kas TIDAK berubah: Bank keluar=0  Kas keluar=1.935.000  E-Money keluar=0
```
Jadi angka "realisasi" hanya **pindah label**, uangnya tidak pindah. `1.350.000` tiket pesawat (`trs-1`) dan
`150.000` akomodasi (`exp-1`) keduanya tercatat `wallet: "Kas"` di data mentah, tapi ditulis sebagai
"realisasi Bank" karena alokasi Penginapan & Transport Umum menunjuk ke Bank.

**Dampak ke pengguna awam:** Ini tepat skenario yang saya khawatirkan. Saya percaya aplikasi dan saya
"Bank sudah habis Rp 1.500.000", padahal isi Bank tidak pernah berkurang. Sebaliknya saya kira
"Kas masih Rp 1.935.000" padahal tabel bilang sisa Kas hanya Rp 410.000. Kalau saya pakai angka ini untuk
menentukan "boleh tidak bayar hotel hari ini?", saya salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Pisahkan jadi dua tabel atau dua kolom dengan
nama berbeda: (1) "Pergerakan Nyata per Dompet" = masuk/keluar/saldo seperti Arus Kas; (2) "Anggaran per
Dompet Tujuan" = alokasi vs realisasi komponen, dengan kolom **sumber dana** terpisah dari kolom
**dompet tujuan**. Kalau tetap mau satu tabel, tambahkan badge/ikon eksplisit di header kolom Realisasi
("dihitung dari pos budget, bukan mutasi dompet") plus baris **Total** supaya angkanya bisa dicocokkan.

---

### [BUG-02] Dana Awal SPPD dan Dana Cair tidak pernah masuk ke wallet mana pun — TINGGI

**Persona dan use-case:** Hari balik dari Bali, saya cek "duit SPPD saya sekarang ada berapa, dan sudah saya
kasih ke siapa?". Saya buka seksi 01 untuk lihat Dana Cair, lalu seksi 08 untuk cek saldo per dompet.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` (seed): Dana Awal SPPD = Rp 2.500.000; Dana Cair = "Transfer instansi (BCA) /
   BCA — 8910 / Rp 1.500.000 / **cair**" + "Kas tunai harian / Rp 1.000.000 / belum".
2. Catat tabel Arus Kas per Wallet (4 baris).
3. Jumlahkan kolom *Saldo* 4 baris itu.
4. Bandingkan dengan statcard "Saldo" di seksi 06 dan "Saldo akhir" di seksi 08.
5. Ubah status Dana Cair "Kas tunai harian" jadi **Sudah cair** (jadi total cair 2.500.000), lalu cek lagi
   kolom *Masuk* wallet Bank.

**Harapan:** Saldo per wallet adalah saldo akhir yang benar, jadi jumlah 4 saldo wallet = "Saldo akhir".
Dan uang yang masuk dari instansi harus terlihat masuk ke dompet Bank.

**Kenyataannya:** `financeSummary` menghitung `wallets` **hanya** dari sales + kasAdj + transports +
expenses (`store.js:796-802`). `danaAwal` dan `danaCair` **tidak pernah masuk ke `wadd()`**. Tidak ada satu
pun fungsi yang menjembatani `danaCair` ke dompet. Angka "Saldo akhir" yang besar memakai `danaAwal`
secara terpisah, jadi dua angka itu memang mustahil sama.

**Evidence:**
```
Wallet    | Masuk       | Keluar      | Saldo
     Bank |   1.000.000 |           0 | 1.000.000
     QRIS |   1.250.000 |           0 | 1.250.000
      Kas |   1.730.000 |   1.935.000 |    -205.000
  E-Money |           0 |           0 |         0
  JUMLAH 4 saldo wallet                                   =  2.045.000
  "Saldo akhir" di seksi 06/08                            =  4.545.000
  selisih                                                 =  2.500.000  (= persis Dana Awal)
  Dana Cair BCA (tidak masuk wallet)                      =  1.500.000

Langkah 5: sebelum  wallets.Bank.masuk = 1.000.000 | danaCair(cair) = 1.500.000
          sesudah  wallets.Bank.masuk = 1.000.000 | danaCair(cair) = 2.500.000  <-- saldo Bank diam saja
```
Di seksi 08 teks penjelas tabel Arus Kas hanya berbunyi: *"Arus masuk/keluar per wallet (Bank, QRIS, Kas,
E-Money) dari penjualan, pengeluaran, transport & penyesuaian kas."* — **tidak ada disclaimer** bahwa Dana Awal
dan Dana Cair tidak termasuk (saya sudah grep `"tidak termasuk"` → TIDAK ADA).

**Dampak ke pengguna awam:** Saya jadi seperti dua orang berbeda. "Saldo Rp 4.545.000, aman" padahal kolom Kas
menulis `Rp -205.000` (merah) di tabel 3 baris di bawahnya. Kalau saya pulang bawa angka "Saldo akhir",
saya bawa pulang uang yang sebenarnya sudah dipakai. Sebaliknya, kalau saya cuma percaya tabel Arus Kas,
saya merasa uang SPPD saya "hilang" Rp 2.500.000 dan mungkin cari-cari atau lapor Atasan padahal uangnya ada
di amplop SPPD.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Beri `danaAwal` dan tiap baris `danaCair` status
`cair` sebuah **dompet tujuan** (default: `Bank` kalau sumbernya "Transfer", `Kas` kalau "Kas tunai"), lalu
masukkan sebagai baris *Masuk* di Arus Kas. Tambahkan baris **Saldo Awal Wallet** per dompet supaya bisa
dibandingkan dengan uang fisik. Setidaknya tambahkan satu kalimat jelas di bawah tabel: "Angka ini belum
termasuk Dana Awal SPPD Rp 2.500.000 dan Dana Cair yang belum masuk dompet."

---

### [BUG-03] Tabel per-wallet-tujuan menjumlahkan E-Money dua kali, dan tidak punya baris Total sehingga selisihnya tak terlihat — TINGGI

**Persona dan use-case:** Saya catat 2 pengeluaran yang saya bayar pakai E-Money (makan Rp 75.000 dan pulsa
Rp 50.000), lalu saya ingin tahu apakah alokasi E-Money saya sudah habis.

**Langkah reproduksi:**
1. `#/events/evt-1`, seed default.
2. Seksi 06 → form "Catat Pengeluaran": kategori `Konsumsi`, jumlah `75000`, "Dari Kas/Wallet" = `E-Money`,
   klik **+ Catat Pengeluaran**.
3. Ulangi: kategori `Uang Saku`, jumlah `50000`, wallet `E-Money`, klik **+ Catat Pengeluaran**.
4. Buka seksi 08, catat baris **Total Realisasi** di tabel "Anggaran vs Realisasi per Komponen".
5. Jumlahkan sendiri kolom *Realisasi* di tabel "Alokasi & Realisasi per Wallet Tujuan".
6. Bandingkan. Perhatikan apakah tabel kedua punya baris Total.

**Harapan:** Kalau kedua tabel di satu card sama-sama bicara "realisasi", jumlahnya harus sama, dan
tabel per-wallet harus punya baris **Total** supaya bisa dicocokkan.

**Kenyataannya:** Baris komponen `E-Money` (dari `BUDGET_POS`) sudah menambah semua outflow E-Money
**sekaligus** pos kategorinya ikut menambah (`store.js:585` + `store.js:588`). Tabel pertama yang
"Total" sengaja meng-*exclude* `E-Money` menghindari dobel hitung — dan memang ada catatan jujur di bawahnya.
Tapi tabel kedua (`perWallet`) **tidak** meng-exclude, dan **tidak punya footer Total**, jadi angkanya
diam-diam lebih besar.

**Evidence:**
```
wallets["E-Money"]: masuk=0  keluar=125.000  saldo=-125.000

Tabel 1 (Total):  Realisasi = Rp 2.035.000
Tabel 2 (suma kolom Realisasi) = Rp 2.160.000
selisih = Rp 125.000   (= persis total keluar E-Money)

Isi Tabel 2 (tidak ada baris Total):
  Bank     | Rp 2.250.000 | Rp 1.500.000 | Rp  750.000
  Kas      | Rp   350.000 | Rp   485.000 | Rp -135.000
  E-Money  | Rp   250.000 | Rp   175.000 | Rp   75.000
Isi Tabel 1 baris E-Money (ditulis merah):
  E-Money  | E-Money | Rp 0 | Rp 125.000 | Rp -125.000
```
Uji lain (seed + 1 expense E-Money Rp 40.000): `totalRealisasi = 2.000.000`, `sum perWallet = 2.040.000`,
selisih persis `40.000`. Polanya konsisten, bukan kebetulan.

**Dampak ke pengguna awam:** Saya jumlahkan sendiri karena tidak ada Total, hasilnya tidak cocok dengan
angka besar di atasnya. Saya akan menyimpulkan ada selisih Rp 125.000 yang "hilang" — padahal itu cuma
efek hitung dobel. Kalau saya pakai tabel ini untuk laporan ke ataasan, angkanya salah dan saya tidak
sadar.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Exclusion `kategori !== 'E-Money'` yang sudah
dipakai di `totalRealisasi`/`totalSisa` (`store.js:618-621`) ikutkan di perhitungan `perWallet`, atau
sebaliknya tambahkan baris `Total` + catatan "kolom Realisasi tabel ini termasuk E-Money sehingga tidak
bisa dijumlahkan dengan Total di atas".

---

### [BUG-04] Kategori custom "e-money" (huruf kecil) lolos dari force wallet, jadi baris tersendiri yang realisasinya selalu 0 — TINGGI

**Persona dan use-case:** Saya lihat daftar komponen di dropdown sudah ada "E-Money", tapi saya tetap mau
nama yang lebih jelas, jadi saya pilih **"Lainnya (kategori sendiri)…"** dan ketik `e-money`.

**Langkah reproduksi:**
1. `#/events/evt-1`, seksi 01, blok "Tambah Alokasi per Komponen".
2. `Komponen` → pilih **"Lainnya (kategori sendiri)…"**.
3. Ketik `e-money` di field "Kategori Lain".
4. `Alokasi (Rp)` = `300000`, **"Masuk ke Wallet"** = `Bank`.
5. Klik **+ Tambah Alokasi**.
6. Buka seksi 08 → "Anggaran vs Realisasi per Komponen" dan "Alokasi & Realisasi per Wallet Tujuan".

**Harapan:** Sistem mengenali `e-money` sebagai komponen E-Money — minimal tidak boleh muncul sebagai baris
yang selalu `Realisasi 0` / `Sisa 300.000` padahal uang e-money saya sudah terpakai.

**Kenyataannya:** Pencocokan kategori bersifat **case-sensitive dan exact** (`kategori === 'E-Money'` di
`store.js:31` dan `BUDGET_POS.indexOf(k)` di `store.js:588`). `e-money` lowercase tidak sama dengan
`E-Money`, jadi: (a) **tidak** di-force ke wallet E-Money — tersimpan `wallet: "Bank"`; (b) jadi baris
tersendiri di `budgetRealisasi`; (c) realisasinya **selalu 0** karena tidak ada expense bertipe `e-money`.
Sedangkan baris `E-Money` built-in tetap ada dan berisi realisasi sebenarnya. Hasilnya ada **dua baris
"e-money" bersebelahan** dengan wallet berbeda.

**Evidence:**
```
Baris tersimpan: kategori="e-money" wallet=Bank alokasi=300.000

Baris di seksi 08 (kategori | wallet | alokasi | realisasi | sisa):
       Penginapan    | Bank     |   900.000 |   150.000 |  750.000
  Transport Umum    | Bank     | 1.350.000 | 1.350.000 |        0
       Uang Saku    | E-Money  |   250.000 |         0 |  250.000
       Kas Kecil    | Kas      |   200.000 |         0 |  200.000
       BBM & Tol    | Kas      |   150.000 |    90.000 |   60.000
         E-Money    | E-Money  |    75.000 |    70.000 |    5.000   <-- yang sebenarnya berisi e-money
 Operasional Lain    | Kas      |         0 |   410.000 | -410.000
          e-money    | Bank     |   300.000 |         0 |  300.000   <-- hantu, selalu 0

Chip agregat seksi 01: Alokasi Bank Rp 2.550.000 | Alokasi Kas Rp 350.000 | Alokasi E-Money Rp 385.000
```
Perhatikan chip di seksi 01: 250.000 + 60.000 + 75.000 = 385.000 untuk E-Money, tapi tambahan 300.000
e-money custom ikut masuk ke chip **Bank** — jadi chip dan baris pun tidak konsisten satu sama lain.

**Dampak ke pengguna awam:** Saya akan selalu melihat "e-money: alokasi 300.000, realisasi 0, sisa 300.000"
dan memutuskan "e-money saya masih aman 300.000". Padahal uang e-money saya sudah habis. Ini kesalahan
belanja yang tidak akan ketahuan sampai rekonsiliasi dengan BANK/PJ.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Normalisasi nama kategori saat input
(trim + `toLowerCase()` + collapse spasi + sinonim seperti `emoney`, `e money`, `e-money`, `saldo e-money`
→ `E-Money`) sebelum dicocokkan; kalau tidak ada padanan, tanyakan ke user dengan konfirmasi eksplisit
("'e-money' Similar dengan komponen bawaan 'E-Money'. Gabungkan?") alih-alih diam-diam membuat baris baru.
Tambahkan juga deteksi kategori duplikat (huruf/spasi berbeda) saat menambah alokasi.

---

### [BUG-05] Setelah setiap penyimpanan, dropdown wallet melompat balik ke default — transaksi kedua diam-diam masuk wallet yang salah — SEDANG

**Persona dan use-case:** Booth saya ramai, saya catat penjualan pertama pakai QRIS. Tanpa melihat, saya
isi baris kedua untuk produk berikutnya dan klik "Tambah". Dua-duanya harusnya QRIS.

**Langkah reproduksi:**
1. `#/events/evt-1`, seksi 05.
2. Produk Batik Tulis, Qty `10`, Harga `15000`, **Metode / Wallet** = `QRIS`, klik **+ Catat Penjualan**.
3. **Jangan sentuh** dropdown wallet. Isi Qty `5` saja, klik **+ Catat Penjualan**.
4. Cek `store.sales('evt-1')` dua baris terakhir.
5. Ulangi polanya di form Transport (`#tr-wallet`) dan Pengeluaran (`#ex-wallet`).

**Harapan:** Form tetap menampilkan pilihan wallet yang sama, atau setidaknya memaksa saya memilih ulang
secara sadar untuk transaksi berikutnya.

**Kenyataannya:** Setiap aksi memicu `A.reload()`, dan `A.reload()` = `render()` penuh
(`app.js:108` + `app.js:75` `app.innerHTML = html`). Seluruh `<select>` dibangun ulang dari string, jadi
kembali ke opsi pertama yang otomatis terpilih. Tidak ada opsi kosong `-- pilih wallet --`. Efeknya:
transaksi berikutnya **diam-diam** memakai wallet default.

**Evidence:**
```
#1 pilih QRIS -> tersimpan QRIS/QRIS 150.000
#sa-wallet sekarang = "Cash"                          <-- sudah balik sendiri
#2 TIDAK sentuh wallet, klik Tambah -> tersimpan "Cash"/"Kas" 75.000

Transport : pilih E-Money, biaya 60.000 -> tersimpan wallet=E-Money
            #tr-wallet SESUDAH reload = "Kas"   -> rute berikutnya jadi Kas
Pengeluaran: pilih E-Money, 40.000      -> #ex-wallet SESUDAH reload = "Kas"
Penyesuaian: pilih E-Money, 100.000     -> #adj-wallet balik ke "Kas"

Semua dropdown tanpa opsi "-- pilih --":
  #sa-wallet  opsi pertama "Cash (Kas)"  selected=true
  #ex-wallet  opsi pertama "Kas"        selected=true
  #adj-wallet opsi pertama "Kas"        selected=true
  #tr-wallet  opsi pertama "Kas"        selected=true
  #bg-wallet  opsi pertama "Bank"       selected=false  (satu-satunya yang punya default eksplisit = Kas)
```
Produk ikut reset juga (`#sa-produk` balik ke produk pertama, `#sa-harga` balik ke harga default), jadi
untuk produk berbeda saya bisa diam-diam memakai harga yang salah juga.

**Dampak ke pengguna awam:** QRIS uangnya masuk catatan "Cash" dan vice versa. Saya baru sadar saat
rekap akhir hari: penghitung manual tidak cocok dengan aplikasi. Untuk E-Money lebih parah, karena
E-Money sering dipakai untuk hal kecil yang tidak dicatat lengkap.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** (a) Simpan pilihan wallet terakhir per form
di memori/`sessionStorage` dan pasang lagi setelah render; (b) atau tambahkan opsi pertama
`-- pilih dompet --` (value kosong) supaya `readVal` mengembalikan kosong dan handler menolak menyimpan
sampai user memilih; (c) tampilkan chip ringkas di bawah form: "Penjualan terakhir: QRIS · 150.000 ·
2 menit lalu" supaya pola wallet terakhir terlihat tanpa menggulir.

---

### [BUG-06] Badge wallet di tabel penjualan & pengeluaran semuanya merah — 4 wallet tidak bisa dibedakan — SEDANG

**Persona dan use-case:** Saya scan cepat tabel penjualan 30 baris untuk cari semua transaksi QRIS. Saya
 mengandalkan warna badge.

**Langkah reproduksi:**
1. `#/events/evt-1`, seksi 05 "Riwayat Transaksi".
2. Ambil `getComputedStyle`/atribut `style` dari setiap `span.badge` di kolom "Metode / Wallet" pada
   beberapa baris (Cash, QRIS, Transfer).
3. Bandingkan dengan output `ui.walletBadge('Bank' | 'QRIS' | 'Kas' | 'E-Money')`.
4. Ulangi di seksi 06 "Daftar Pengeluaran".

**Harapan:** Semua tempat yang menampilkan wallet memakai warna yang sama untuk wallet yang sama
(`ui.walletBadge()` sudah menyediakan 4 warna berbeda, dan dipakai di seksi 01 & 08).

**Kenyataannya:** Seksi 05 (`pages2.js:139`) dan seksi 06 (`pages2.js:199`) memakai **inline style
hardcoded** `background:#FDEAEA;color:#B8121F` untuk badge wallet — itu persis warna **E-Money**. Jadi
"Kas", "Bank", dan "QRIS" tampil merah muda di dua tabel terbesar, sementara di seksi 01 & 08 wallet yang
sama berwarna biru/hijau/putih. Warna jadi **kebohongan**: merah berarti E-Money di satu layar, dan
"apa pun" di layar lain.

**Evidence:**
```
Tabel penjualan, baris pertama: "Cash"{background:#F3F4F6;color:#111}  ||  "Kas"{background:#FDEAEA;color:#B8121F}
Tabel penjualan, 4 baris:  "QRIS"{#F3F4F6;#111} "QRIS"{#FDEAEA;#B8121F}  "E-Money"{#F3F4F6;#111} "E-Money"{#FDEAEA;#B8121F}
                          "Cash"{#F3F4F6;#111} "Kas"{#FDEAEA;#B8121F}  "Transfer"{#F3F4F6;#111} "Bank"{#FDEAEA;#B8121F}
Tabel pengeluaran baris 1 : "Kas"{background:#FDEAEA;color:#B8121F}
SEHARUSNYA (walletBadge):
  Bank     = #EFF6FF / #1D4ED8   QRIS = #F3F0EC / #111111
  Kas      = #ECFDF5 / #059669   E-Money = #FDEAEA / #B8121F   <-- merah hanya untuk E-Money
```

**Dampak ke pengguna awam:** Warna adalah cara tercepat buat pedagang supaya tahu dompet mana. Kalau
semua merah, warna tidak berguna dan justru bikin saya salah baca "ah ini e-money" padahal Kas.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Ganti kedua inline style itu dengan
`ui.walletBadge(wm)` / `ui.walletBadge(A.store.walletKey(e.wallet))` supaya konsisten dengan seksi 01/08.
Tambahkan juga ikon atau awalan huruf pada label ("QR", "EM", "BK", "KS") supaya tidak hanya bergantung
pada warna (bagus juga untuk pengguna dengan gangguan penglihatan warna).

---

### [BUG-07] `walletKey()` diam-diam memetakan semua string yang tidak persis ke "Kas" tanpa peringatan — SEDANG

**Persona dan use-case:** Saya dapat file backup dari rekan yang memakai aplikasi versi lama, atau saya
rekam dompet digital lain yang tidak didukung aplikasi ini (OVO, Dana, GoPay). Saya mengimpornya dan
tidak sadar ada baris yang tidak bisa dipetakan.

**Langkah reproduksi:**
1. `#/events/evt-1`, seed.
2. Ambil `store.exportJSON()`, ubah 4 field wallet di data mentah:
   - `expenses[0].wallet = "qris"` (huruf kecil)
   - `expenses[1].wallet = "E-Money "` (spasi akhir)
   - `transports[0].wallet = "EMoney"`
   - `kasAdj[0].wallet = "e money"` (spasi di tengah)
3. `store.importJSON(...)` (setara dengan tombol Import di halaman Pengaturan).
4. Cek `store.walletKey()` untuk tiap string, cek nilai `wallet` mentah tiap transaksi setelah import,
   cek `financeSummary().wallets`, cek isi `#toast-root` dan `#modal-root`, cek teks tabel.

**Harapan:** Impor menolak nilai wallet yang tidak dikenal, atau minimal memberi tahu saya ada baris yang
tidak bisa dipetakan ke dompet mana pun.

**Kenyataannya:** `walletKey()` (`store.js:19`) adalah `WALLETS.indexOf(w) >= 0 ? w : 'Kas'`. Jadi **apa
pun** yang tidak persis salah satu dari 4 nama dompet — termasuk `null` dan string kosong — dijawab
`Kas`. `wadd()` di `financeSummary()` (`store.js:792-796`) memanggil `walletKey()` untuk tiap transaksi,
artinya semua nilai asing itu **dihitung diam-diam sebagai uang Kas**. `importJSON()` tidak memvalidasi
satu pun nilai wallet, tidak menolak, tidak memberi toast, tidak membuka dialog.

Yang perlu diluruskan dari dugaan awal saya: `normWallets()` (`store.js:20-24`) **tidak** menulis ulang
nilai yang sudah ada — kodenya `if (!e.wallet) e.wallet = 'Kas'`, jadi hanya mengisi yang kosong. Values
asing tidak hilang dari `localStorage`. Yang terjadi adalah **salah buckling diam-diam**, bukan kehilangan
data.

**Evidence (harness `_QA_TMP/a14_wallet4.html`):**
```
W1 walletKey("qris") = "Kas"     walletKey("EMoney")  = "Kas"
   walletKey("E-Money ") = "Kas" walletKey("e money") = "Kas"
   walletKey("OVO")      = "Kas" walletKey("Dana Tunai") = "Kas"
   walletKey("")         = "Kas" walletKey(null)     = "Kas"

W3 importJSON return: {"before":9,"after":9}      <- diterima, tidak ada error

W4 nilai wallet mentah SESUDAH import (tidak dirusak):
   expenses[0].wallet = "qris"      expenses[1].wallet = "E-Money "
   transports[0].wallet = "EMoney"

W5 isi #toast-root = ""      isi #modal-root = ""
   kata peringatan di seluruh body: []          <- nol peringatan

W7 DOM: transaksi dengan wallet asing ditampilkan apa?
   pengeluaran[0] "...Akomodasi... Kas    Rp 150.000"   <- "qris" ditampilkan jadi "Kas"
   pengeluaran[1] "...Konsumsi...  Kas    Rp 120.000"   <- "E-Money " jadi "Kas"
   transport     "...bayar EMoney Rp 1.350.000"          <- ditampilkan APA ADANYA, tidak dipetakan
```
Baris transport adalah bukti paling berbahaya: di daftar pengeluaran dompet asing dirapikan jadi "Kas"
(terlihat wajar), tapi di daftar transport string asing ditampilkan mentah-mentah ("bayar EMoney").
Dua tampilan berbeda untuk kasus yang sama, jadi saya tidak bisa andalkan satu tabel saja.

**Catatan tambahan dari harness yang sama:** `importJSON({events:[],sppd:[]})` juga **tidak ditolak**,
tidak melempar error, dan lanjut menyimpan — artinya isinya hanya satu baris validasi
(`Array.isArray(obj.events)`), sisanya tidak diperiksa sama sekali. Ini di luar fokus wallet, tapi
memperkuat bahwa jalur impor tidak punya validasi apa pun.

**Dampak ke pengguna awam:** Uang e-money atau OVO saya dilaporkan sebagai "bayar Kas", saldo E-Money saya
tampak Rp 0 padahal ada isinya, dan saya tidak dapat peringatan apa pun. Untuk yang diperbaiki dari backup,
angka yang saya baca setelah import **tidak akan cocok dengan mutasi bank** saya, dan saya tidak akan pernah
tahu kalau yang salah ada di sisi import — bukan di sisi pencatatan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** (a) `walletKey` sebaiknya mengembalikan `null`
untuk nilai tak dikenal, lalu `normWallets` mengumpulkannya dan `importJSON` menampilkan dialog
"Ada 4 transaksi dengan dompet tidak dikenal: 'qris', 'E-Money ', 'EMoney', 'e money'. Petakan ke dompet
mana?" dengan pilihan petakan massal; (b) normalisasi otomatis dengan konfirmasi
(trim + case-insensitive + collapse spasi + peta sinonim `EMoney`→`E-Money`, `QR`/`QRIS Code`→`QRIS`,
`Transfer`→`Bank`, `Cash`/`Tunai`→`Kas`); (c) samakan cara render: semua tempat yang menampilkan wallet
harus lewat satu fungsi yang sama, supaya "EMoney" tidak pernah tampil mentah di satu tabel tapi "Kas" di
tabel lain; (d) jangan pernah menolak import secara diam-diam — kalau tidak bisa dipetakan, tetap
simpan nilai aslinya di field terpisah (misalnya `walletAsli`) supaya bisa diaudit dan dipulihkan.

---

### [BUG-08] Tidak ada satu pun halaman global (Dashboard/Rekap Global/Arsip) yang menampilkan saldo per wallet — SEDANG

**Persona dan use-case:** Akhir bulan saya mau tahu: total uang QRIS yang masuk bulan ini di semua event
berapa? Berapa E-Money yang tersisa? fornece jawaban?

**Langkah reproduksi:**
1. Kunjungi semua 8 rute: `#/dashboard`, `#/events`, `#/archive`, `#/products`, `#/master`, `#/reports`,
   `#/guide`, `#/settings`.
2. Hitung kemunculan teks `"QRIS"` dan `"E-Money"` pada `#app` innerHTML tiap halaman.
3. Cek `Object.keys(store.globalReports())`.

**Harapan:** Karena "Rekap Global" sudah menjumlahkan saldo seluruh event, seharusnya bisa menjumlahkan
saldo per dompet juga. Minimal ada satu kartu "Uang per Dompet".

**Kenyataannya:** Tidak ada. Satu-satunya halaman global yang menyebut wallet adalah **Panduan** (3x,
itu teks penjelasan). `globalReports()` (`store.js:820`) tidak punya field wallet sama sekali —
kuncinya hanya `byProduct, byEvent, totalSales, totalSalesQty, totalExpense, totalSaldo, events`.
Informasi per wallet hanya ada di dalam 1 event (seksi 08) dan di hasil cetak.

**Evidence:**
```
   #/dashboard QRIS=0  E-Money=0
     #/events QRIS=0  E-Money=0
    #/archive QRIS=0  E-Money=0
   #/products QRIS=0  E-Money=0
    #/master QRIS=0  E-Money=0
    #/reports QRIS=0  E-Money=0
     #/guide QRIS=3  E-Money=3   <-- cuma teks FAQ
  #/settings QRIS=0  E-Money=0
globalReports punya field wallet? ["byProduct","byEvent","totalSales","totalSalesQty","totalExpense","totalSaldo","events"]
```
Satu-satunya jalan: buka **tiap** event satu per satu → seksi 08 → jumlahkan sendiri.

**Dampak ke pengguna awam:** Untuk 1 event saya hafal. Untuk 6 event (seed punya 6 event dengan penjualan)
saya harus 6× buka, 6× scroll ke seksi 08, lalu hitung manual. wholeheartedly saya akan cuma pakai
"Saldo Total" yang bukan per dompet, dan pertanyaan soal "duit QRIS saya kemana" tidak terjawab sama sekali.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambahkan blok "Uang per Dompet (semua
event)" di `#/reports` dan kartu ringkas di `#/dashboard` — tabel 4 baris (Bank/QRIS/Kas/E-Money) dengan
kolom masuk, keluar, saldo, plus **Saldo Awal** supaya bisa dicocokkan dengan rekening. Dihitung dari
`globalReports()` yang sudah punya `events[eventId].wallets` untuk setiap event, jadi datanya sudah ada —
tinggal dijumlahkan.

---

### [BUG-09] Force wallet "E-Money" tidak bisa dibatalkan, dan pilihan manual diabaikan tanpa peringatan — SEDANG

**Persona dan use-case:** Saya salah pilih komponen "E-Money", mau ganti jadi "Kas Kecil" tapi ternyata
dropdown dompetnya masih nempel di E-Money.

**Langkah reproduksi:**
1. `#/events/evt-1`, seksi 01, "Tambah Alokasi per Komponen".
2. `Komponen` → pilih `E-Money` (event `change` memicu `budget:katmode`).
3. Perhatikan "Masuk ke Wallet" berubah otomatis jadi `E-Money`.
4. Ganti `Komponen` → `Kas Kecil`.
5. Perhatikan "Masuk ke Wallet" — masih `E-Money`?
6. Ulangi langkah 2, lalu paksa pilih "Masuk ke Wallet" = `Bank`, isi alokasi `75000`, klik Tambah.
7. Baca baris yang tersimpan dan isi toast.

**Harapan:** Force wallet hanya berlaku selama komponennya `E-Money`; kalau komponen diganti, dompet
harus balik ke default. Kalau user memilih dompet lain, pilihan itu yang dipakai (atau ada konfirmasi).

**Kenyataannya:** `budget:katmode` (`actions.js:349-355`) hanya melakukan setting satu arah
`if (el.value === 'E-Money') wsel.value = 'E-Money';` — tidak ada cabang kebalikannya. Dan bahkan kalau
user memaksa pilih `Bank`, `store.budgetWallet()` (`store.js:31-32`) tetap mengembalikan `E-Money`
untuk kategori `E-Money`, jadi pilihan `Bank` dibuang **tanpa peringatan apa pun**.

**Evidence:**
```
pilih Komponen=E-Money  -> #bg-wallet = "E-Money"   (dipaksa)
ganti Komponen=Kas Kecil-> #bg-wallet = "E-Money"   (MASIH, tidak balik)
pilih manual #bg-wallet=Bank, klik Tambah:
  baris tersimpan: kategori=E-Money alokasi=75.000 wallet=E-Money
  toast: "Alokasi E-Money Rp 75.000 ke E-Money"   (tidak menyebut bahwa pilihan Bank diabaikan)
```
Catatan: perilaku "pakai dompet digital untuk komponen E-Money" itu **memang benar secara bisnis** dan
wajar. Yang bermasalah adalah (a) tidak bisa dibatalkan dan (b) diam-diam mengabaikan pilihan user.

**Dampak ke pengguna awam:** Saya sudah yakin memilih Bank karena saya baca "Masuk ke Wallet = Bank" di
form, lalu baris tersimpan malah bilang E-Money. Kalau saya cuma percaya toast, rekap bulanan saya salah
dan baru saya sadari saat rekonsiliasi. Form yang menampilkan nilai berbeda dari yang tersimpan adalah
kebohongan halus yang jauh lebih berbahaya daripada form yang menolak menyimpan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Saat komponen berpindah dari `E-Money` ke
kategori lain, kembalikan dropdown ke `Kas` (atau ke komponen sebelumnya) dan tampilkan teks kecil
"Dompet mengikuti komponen E-Money (bisa diubah setelah disimpan)". Kalau user memilih dompet lain secara
eksplisit, lebih baik hormati dan beri disclaimer, atau tampilkan dialog konfirmasi
"Komponen E-Money memakai dompet E-Money. Tetap pakai Bank?"

---

### [BUG-10] Penyesuaian kas E-Money asimetris: yang positif tidak masuk ke baris komponen E-Money, yang negatif masuk — SEDANG

**Persona dan use-case:** Saya top-up e-money Rp 100.000 (catatan:isi saldo e-money), lalu ada kembalian
Rp 30.000. Saya ingin tahu sisa e-money.

**Langkah reproduksi:**
1. `#/events/evt-1`, seksi 06, blok "Penyesuaian Kas".
2. `Keterangan` = "Top up e-money", `Nominal (±)` = `100000`, "Ke Kas/Wallet" = `E-Money`, klik Tambah.
3. Catat: Arus Kas E-Money *Masuk*, dan baris `E-Money` di tabel Anggaran vs Realisasi.
4. `Keterangan` = "Kembalian e-money", `Nominal (±)` = `-30000`, wallet `E-Money`, klik Tambah.
5. Catat lagi keduanya.

**Harapan:** Setiap mutasi e-money (masuk maupun keluar) terlihat konsisten di kedua tabel.

**Kenyataannya:** `budgetRealisasi` hanya menghitung `kasAdj` E-Money kalau nilainya **negatif**
(`store.js:600`: `if (emCount(k.wallet) && v < 0)`). Jadi top-up e-money masuk ke Arus Kas tapi tidak
pernah muncul di tabel Anggaran.

**Evidence:**
```
+100.000 E-Money : ArusKas E-Money masuk = 240.000  | baris budget E-Money realisasi = 40.000  (tidak naik)
  -30.000 E-Money : ArusKas E-Money keluar =  70.000  | baris budget E-Money realisasi = 70.000  (naik)
ArusKas saldo E-Money = 170.000  ;  baris budget E-Money sisa = 180.000
```

**Catatan:** Ketidakcocokannya masuk akal karena alokasi E-Money (250.000) datang dari baris "Uang Saku"
yang wallet-nya E-Money, sementara baris komponen "E-Money" sendiri alokasi 0. Makanya terlihat sangat
membingungkan.

**Dampak ke pengguna awam:** Saya top-up Rp 100.000 dan tabel di bawahnya tidak bergerak sama sekali,
jadi saya merasa top-up saya tidak tercatat. Lalu saya lihat saldo E-Money berbeda di dua baris yang
bersebelahan. Untuk siapa pun yang memakai e-money harian, ini berarti saya tidak boleh percaya tabel
Anggaran untuk e-money, padahal itu satu-satunya tempat yang kelihatan rapi.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Perlakukan `kasAdj` E-Money positif sebagai
"Masuk wallet E-Money" (baris `+`) dan negatif sebagai "Keluar" (baris `−`) di baris komponen E-Money,
dengan catatan bahwa baris ini bersifat informasi. Kalau positif tetap diabaikan, beri minimal satu
baris catatan di bawah baris `E-Money`: "Hanya menghitung pengeluaran e-money; top-up tidak termasuk."

---

### [BUG-11] Tidak ada cara mengubah wallet pada baris alokasi yang sudah ada — harus hapus & tambah ulang — RENDAH

**Persona dan use-case:** Salah pilih dompet untuk baris "Penginapan". Saya mau dibetulkan.

**Langkah reproduksi:**
1. `#/events/evt-1`, seksi 01, "Rincian Alokasi SPPD".
2. Cari semua tombol `data-action^="budget:"` yang ada.
3. Lihat tombol apa saja per baris.

**Harapan:** Ada tombol edit per baris, atau minimal dropdown wallet inline.

**Kenyataannya:** Hanya `budget:add` dan `budget:delete`. Tidak ada `budget:edit`. Satu-satunya cara
mengubah wallet = hapus baris (id dan `ket` hilang) lalu tambah ulang — dan karena tidak ada edit,
`store.saveSppdBudgetItem` cabang `if (item.id)` (`store.js:541-543`) tidak pernah terpakai dari UI.

**Evidence:**
```
action budget:* di DOM seksi 01 = {"budget:delete":8,"budget:katmode":1,"budget:add":1}
jumlah baris alokasi = 8
tombol per baris hanya: [Hapus]
```

**Dampak ke pengguna awam:** Kalau saya salah pilih Bank vs QRIS untuk satu komponen, saya kehilangan
keterangan ("Hotel 2 malam") dan harus mengetik ulang. Untuk 5 baris, itu 5×hapus-tambah, dan berisiko
salah ketik ulang. Tidak ada konfirmasi "hapus baris ini?" juga.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Tambah aksi `budget:edit` — klik badge wallet
pada baris jadi dropdown, atau tombol "Ubah" yang memuat baris ke form "Tambah Alokasi" dengan mode edit
(tombol berubah jadi "Simpan Perubahan" + "Batal"). Tambahkan confirm dialog + toast "Baris alokasi
diperbarui" supaya angka di seksi 08 jelas ikut diperbarui.

---

### [BUG-12] Urutan & penamaan dropdown wallet tidak konsisten antar form, tidak ada opsi "-- pilih --" — RENDAH

**Persona dan use-case:** Saya hafal urutannya di satu form, lalu salah pilih di form lain karena posisinya
berbeda.

**Langkah reproduksi:**
1. Baca `textContent` dan `value` tiap `<option>` dari 5 dropdown wallet di `#/events/evt-1`.
2. Bandingkan urutan + penamaan + indeks terpilih.

**Harapan:** Satu daftar wallet konsisten (nilai + label + urutan) di semua form, dan ada opsi kosong
supaya user tidak bisa "lolos" tanpa memilih.

**Kenyataannya:** Tiga dropdown memakai urutan `Kas, Bank, QRIS, E-Money`; satu (`#bg-wallet`) memakai
`Bank, QRIS, Kas, E-Money` (dari `store.WALLETS`); satu lagi (`#sa-wallet`) memakai label
`Cash (Kas) / QRIS / Transfer (Bank) / E-Money`. Tidak ada yang punya `-- pilih dompet --`, dan 4 dari 5
otomatis terpilih di indeks 0.

**Evidence:**
```
#sa-wallet  = [Cash (Kas) | QRIS | Transfer (Bank) | E-Money]   terpilih "Cash" (idx 0)
#ex-wallet  = [Kas | Bank | QRIS | E-Money]                    terpilih "Kas" (idx 0)
#adj-wallet = [Kas | Bank | QRIS | E-Money]                    terpilih "Kas" (idx 0)
#tr-wallet  = [Kas | Bank | QRIS | E-Money]                    terpilih "Kas" (idx 0)
#bg-wallet  = [Bank | QRIS | Kas | E-Money]                    terpilih "Kas" (idx 2, satu-satunya default eksplisit)
store.WALLETS = [Bank, QRIS, Kas, E-Money]
label unik yang dipakai di form: seksi 05 "Metode / Wallet" (1 field = 2 konsep),
  seksi 06 "Dari Kas/Wallet" & "Ke Kas/Wallet", seksi 01 "Masuk ke Wallet" & "Dibayar Pakai"
```
Sebagai nilai, "Kas" **tidak pernah** jadi nilai di form penjualan (harus "Cash (Kas)"), sedangkan di 4 form
lainnya `Kas` adalah nilai. Risiko salah pilih: posisi "Kas" di indeks 0 vs indeks 2 beda makna buat orang.

**Dampak ke pengguna awam:** Untuk orang yang biasa ini sepele, untuk kasir warung yang setiap hari pilih dompet,
kasir warung yang setiap hari pilih dompet, "Kas" di indeks 0 vs indeks 2 itu berarti satu klik
berbeda bisa salah 1-2 juta rupiah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Buat satu helper yang meng-generate
`<option>` wallet dari `store.WALLETS` (supaya urutan & warna konsisten), pakai di kelima form.
Tambahkan ikon + warna walletBadge di dalam option (sebagian browser mendukung), dan tambahkan
`aria-label` yang menjelaskan konsekuensinya, mis. "QRIS — uang masuk ke saldo QRIS, bukan Kas tunai".

---

### [BUG-13] Data seed: catatan milestone ev-d6 bilang "saldo 0" sementara aplikasi menghitung Rp 10.850.000 — RENDAH

**Persona dan use-case:** Saya buka event yang sudah "selesai" untuk lihat contoh laporan yang rapih.

**Langkah reproduksi:**
1. Buka `#/events/ev-d6`.
2. Baca seksi 02 (Jadwal) → milestone "Laporan", kolom catatan.
3. Baca seksi 06 → statcard "Saldo".
4. Jumlahkan 4 saldo wallet di seksi 08.

**Harapan:** Catatan dan angka di aplikasi untuk event selesai akan cocok (contoh yang rapi).

**Kenyataannya:** Catatan milestone `mil-d6e` = "Laporan disetor, saldo 0." sementara
`financeSummary('ev-d6').saldo` = Rp 10.850.000 dan jumlah 4 saldo wallet = Rp 5.850.000. Dua-duanya
"benar" menurut kodenya, tapi tidak ada yang 0. Ini data seed yang tidak konsisten dengan perhitungan
sendiri — dan `catatan` SPPD untuk ev-d6 justru berbunyi "Laporan penggunaan uang sudah disetor." tanpa
angka.

**Evidence:**
```
seksi 02 milestone Laporan: "2026-12-08 · Laporan disetor, saldo 0."
statcard seksi 06          : "Saldo  Rp 10.850.000  sisa dana"
jumlah 4 saldo wallet      :  5.850.000
Dana Awal 5.000.000 | Dana Cair 5.000.000
Arus Kas ev-d6: Bank=900.000  QRIS=7.500.000  Kas=-2.550.000  E-Money=0
```

**Dampak ke pengguna awam:** Pengguna yang sedang belajar ("event selesai itu saldo 0 ya") akan salah
paham dan menganggap saldo Rp 10 juta itu normal. Auditor juga akan bertanya "kok catatan bilang 0 tapi
angka 10 juta?".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Perbaiki data seed agar konsisten dengan
`financeSummary` (pakai penyesuaian kas pengimbang, atau ubah catatan jadi "Laporan disetor, saldo
peny|Fee[a] Rp 10.850.000") — atau lebih baik, tampilkan angka saldo langsung di dalam catatan
sehingga tidak basi.

---

### [BUG-14] Tiga angka berbeda untuk "sisa E-Money" dalam satu layar yang sama — RENDAH

**Persona dan use-case:** Saya catat 2 pengeluaran e-money lalu buka seksi 08 untuk lihat sisa e-money.

**Langkah reproduksi:**
1. `#/events/evt-1`, seed. Catat 2 pengeluaran dengan wallet `E-Money`: `Konsumsi 75.000` dan
   `Uang Saku 50.000` (total 125.000).
2. Buka seksi 08 dan cari **tiga** tempat yang menyebut E-Money.

**Harapan:** Satu angka "sisa E-Money" yang jelas.

**Kenyataannya:** Baris komponen `E-Money` (dari `BUDGET_POS`, alokasi 0) dan baris `Uang Saku`
(alokasi 250.000, wallet E-Money) sama-sama berlabel E-Money, dan tabel per-wallet-tujuan menghitung
keluarannya dari `Uang Saku` saja. Jadi tiga angka berbeda muncul bersamaan.

**Evidence:**
```
DOM Anggaran vs Realisasi per Komponen:
  Uang Saku | E-Money | Rp 250.000 | Rp  50.000 | Rp  200.000
      E-Money | E-Money | Rp       0 | Rp 125.000 | Rp -125.000   [merah, alokasi 0]
  Total                    Rp 2.850.000 | Rp 2.035.000 | Rp 815.000
DOM Alokasi & Realisasi per Wallet Tujuan:
  E-Money | Rp 250.000 | Rp 175.000 | Rp 75.000
DOM Arus Kas per Wallet:
  E-Money | +Rp 0 | −Rp 125.000 | Rp -125.000
```
Jadi "sisa e-money" = **+200.000** (Uang Saku), **−125.000** (komponen E-Money, merah), **+75.000**
(per wallet tujuan), **−125.000** (Arus Kas). Empat angka dalam satu halaman.

**Dampak ke pengguna awam:** Saya akan lihat angka merah `Rp -125.000` dan langsung simpulkan e-money saya
over budget padahal baris itu tidak punya alokasi sama sekali. Atau saya ambil `Rp 75.000` dan ternyata
saldo fisik saya minus.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** Kalau memang perlu baris informasi E-Money,
beri judul yang berbeda dari komponen (`Pemakaian E-Money (memo)`), pindahkan ke bawah tabel sebagai
baris terpisah, dan beri satu angka sisa yang tunggal. Kalau tidak perlu, hapus `E-Money` dari
`BUDGET_POS` karena pos komponennya sudah ada ("Uang Saku"/"Kas Kecil" yang berlabel E-Money).

---

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Perhitungan saldo per wallet-nya benar.** Saya hitung ulang sendiri 11 transaksi evt-1 dari data mentah
  (`sales` 4, `kasAdj` 2, `transports` 2, `expenses` 3) tanpa memakai `financeSummary`, hasilnya
  **cocok persis**: Bank +1.000.000 / QRIS +1.250.000 / Kas −205.000 / E-Money 0. Tidak ada transaksi
  yang hilang atau salah wallet.
- **Penjualan QRIS benar-benar masuk ke wallet QRIS.** Uji klik sungguhan: pilih `QRIS`, catat Batik Tulis
  2 × 250.000 → `wallets.QRIS.masuk` 1.250.000 → 1.750.000 (delta **+500.000**, tepat).
- **Penjualan E-Money juga benar.** 4 × 35.000 → `wallets["E-Money"].masuk` 0 → 140.000 (delta **+140.000**, tepat).
- **Tidak ada wallet yang hilang dari dropdown.** Kelima dropdown (`sa`, `ex`, `adj`, `tr`, `bg`) punya
  **4 opsi lengkap** — tidak ada wallet yang hilang dari dropdown saat menambah transaksi baru. Ini poin
  yang saya khawatirkan tapi ternyata aman.
- **Komponen E-Money di-force ke dompet E-Money** memang keputusan bisnis yang tepat (emoney memang untuk
  dompet digital), dan diterapkan konsisten di `budgetWallet()`, `normBudgetWallet()` (dipanggil di
  `load`, `save`, dan `importJSON`), dan `saveSppdBudgetItem()` — jadi data impor langsung ikut dinormalkan.
- **Ada kejujuran soal dobel hitung di tabel utama.** Catatan di bawah "Anggaran vs Realisasi per Komponen"
  berbunyi eksplisit: *"Total realisasi tidak menjumlahkan E-Money agar tidak dobel hitung (sudah di pos
  kategori)"*, dan `totalRealisasi`/`totalSisa` memang benar-benar meng-exclude `E-Money`. Masalahnya
  cuma tabel kedua yang lupa aturan sama (BUG-03).
- **`Reset Data Dummy` benar-benar mengembalikan semua angka wallet ke seed.** Setelah semua manipulasi
  (5 penjualan, 4 pengeluaran, 3 penyesuaian, 4 baris alokasi, 1 transport, 2× import), `resetData()`
  mengembalikan Bank/QRIS/Kas/E-Money ke +1.000.000 / +1.250.000 / −205.000 / 0 — **4 dari 4 OK**,
  budget rows balik ke 5, sales balik ke 4.
- **Tabel Arus Kas selalu print 4 wallet** (`WALLETS.map`), bahkan yang 0/0 — jadi pengguna tidak
  pernah mengira "e-walletnya hilang". Ini kebalikan dari kekhawatiran saya.
- **Blok Dana Cair rapi dan informatif** — ada sumber, no rekening (`BCA — 8910`), nominal, tanggal cair,
  status, dan toggle status yang bekerja (`danaCair:status` benar-benar mengubah `danaCairAmt` dari
  1.500.000 → 2.500.000). Cuma belum tersambung ke dompet (BUG-02).
- **Ada validasi input dasar yang menahan salah input:** qty penjualan dicek terhadap sisa stok
  (`sisa 15` ditolak), alokasi harus `> 0`, jumlah pengeluaran harus `> 0`, dan `normWallets()`
  (**hanya** mengisi `wallet` yang kosong, tidak menimpa nilai yang sudah ada) sehingga data impor
  yang sudah terisi tetap utuh dan tidak ikut dirusak. Yang bermasalah adalah pemetaan diam-diamnya,
  bukan penimpaannya (BUG-07).
- **Seksi 01 menampilkan chip agregat per dompet** (`Alokasi Bank / Alokasi Kas / Alokasi E-Money`) —
  cepat untuk sanity-check, sayangnya angkanya bisa berbeda dari tabel per-wallet-tujuan (BUG-04).
- **Wallet punya warna konsisten di `ui.walletBadge()`** — 4 warna beda, dipakai di seksi 01 dan 08.
  Tinggal dipakai juga di seksi 05/06 (BUG-06).
- **Istilah wallet dijelaskan di Panduan & FAQ**, termasuk pasangan yang saya kira membingungkan:
  *"lengkap dengan metode & wallet (Cash/Kas, QRIS, Transfer/Bank, E-Money)"*.
- **Laporan cetak memuat tabel Arus Kas per Wallet** dengan 4 baris lengkap, plus tabel
  "Alokasi per Wallet Tujuan" dan baris Dana sudah cair — jadi bendahara/auditor punya jejak digital.

---

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah "Realisasi" di tabel per-wallet-tujuan memang *dioredisain* begitu atau ini bug?**
  Perlu konfirmasi dari produk: kalau niatnya "dana yang dialokasikan ke dompet X dan terpakai", maka
  label kolomnya harus eksplisit, karena sekarang terbaca = "uang keluar dari dompet X".
- **Kenapa baris komponen `E-Money` ada di `BUDGET_POS` sementara seed memakai kategori `Uang Saku` dengan
  wallet E-Money?** Kalau `E-Money` memang pos memo, harus dipindah; kalau memang pos resmi, seed-nya
  yang perlu diubah. Dua-duanya menghasilkan 2 baris e-money.
- **Haruskah `Dana Awal` dipecah per dompet?** SPPD sekarang tidak punya field dompet sama sekali
  (kunci: `id, eventId, noSurat, tanggalTerbit, tujuan, kegiatan, instansi, status, danaAwal, realisasi,
  tampilkanRealisasi, linkDokumen, catatan, budget`). Kalau data SPPD tidak menyebut per dompet, mungkin
  memang tidak perlu — tapi minimal harus ada disclaimer di tabel Arus Kas.
- **Apakah ada saldo awal dompet?** Sekarang tidak ada konsep "saldo awal wallet", sehingga semua dompet
  mulai dari nol. Untuk pengguna yang sudah punya saldo BCA/OVO dari sebelum memakai tool, ini membuat
  saldo terlihat salah.
- **Data seed ev-d6** — apakah catatan "saldo 0" disengaja atau sisa dummy? (BUG-13, perlu konfirmasi).
- **Roles/permission**: belum ada konsep siapa boleh mengubah dompet. Untuk toko dengan 2 orang (PIC +
  kasir), tidak ada jejak siapa mengubah wallet ke mana. Saya tidak menemukan field `userId` pada
  `sales`/`expenses`/`transports`/`kasAdj` (hanya `products` dan `checklistItems` yang punya `userId`).
- **`walletKey` dipakai di banyak tempat untuk tampilan** (`pages2.js:199`, `:253`, `pages2.js:963`),
  jadi begitu nilainya salah, **tampilan juga ikut salah**. Bukti konkretnya di BUG-07: `"qris"` di
  daftar pengeluaran dirender jadi "Kas", tapi `"EMoney"` di daftar transport dirender mentah sebagai
  "bayar EMoney". Tidak ada satu tempat pun untuk melihat nilai asli.
- **Semua temuan sudah direproduksi numerik di seed default `evt-1`**, tidak ada yang perlu konfirmasi
  selain soal niat desain di atas.

---

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Ketepatan saldo per dompet (angka akhirnya) | 4 | Hitung ulang manual cocok 100% dengan store untuk seed. Penjualan QRIS & E-Money masuk wallet yang benar. Tidak ada uang hilang. |
| Kejelasan tabel "per dompet" | 1 | **BUG-01 + BUG-02 + BUG-03.** Tiga tabel soal dompet di satu layar, saling tidak cocok: Bank keluar 0 tapi ditulis realisasi 1.500.000; jumlah 4 saldo = 2.045.000 vs "Saldo akhir" 4.545.000; tabel per-wallet lebih besar dari Total. Ini langsung menjawab pertanyaan inti persona. |
| Konsistensi dropdown dompet | 2 | **BUG-05 + BUG-12.** 5 dropdown dengan urutan/penamaan berbeda, default otomatis ke opsi pertama, dan reset ke default setelah tiap simpan sehingga transaksi kedua masuk dompet yang salah tanpa saya sadari. |
| Alokasi budget SPPD ke dompet | 2 | **BUG-04 + BUG-09 + BUG-11 + BUG-14.** Force wallet tidak bisa dibatalkan, pilihan manual dibuang diam-diam, kategori custom lowercase bikin baris hantu sisa 300.000, dan tidak ada cara edit wallet baris lama. |
| Visibilitas dompet lintas event | 1 | **BUG-08.** Nol tampilan dompet di Dashboard/Rekap Global/Arsip. Untuk 6 event harus buka satu-satu. |
| Keterlacakan / jejak dompet saat input salah | 2 | **BUG-07.** `walletKey` fallback diam-diam ke "Kas" tanpa toast atau dialog. Data mentahnya tidak hilang, tapi tidak ada tempat menampilkan nilai asli, dan dua tabel menampilkan bentuk berbeda untuk wallet yang sama. Tidak ada laporan "ada dompet tidak dikenal". |
| Konsistensi visual antar tabel | 2 | **BUG-06.** Badge wallet merah seragam di 2 tabel terbesar, warna tidak bisa dipakai bedakan dompet. |
| Kepercayaan terhadap angka (deteksi salah) | 2 | Tidak ada validasi silang antar tabel, padahal semua angka sudah dikumpulkan lengkap. Tidak ada peringatan "E-Money minus", "dompet tidak dikenal", atau "total tidak cocok". |
| Dokumentasi istilah dompet | 3 | Panduan & FAQ menjelaskan pasangan Cash/Kas, Transfer/Bank, dan menyebut 4 dompet. Tapi tidak menjelaskan perbedaan "dompet tujuan" vs "dompet sumber" yang jadi sumber bug utama. |
| Alur pembayaran digital end-to-end (catat QRIS lalu cek saldo) | 3 | Alur catat QRIS cepat dan benar. Yang kacau adalah tahap akhir, yaitu menyusun saldo per dompet di layar yang sama. |

**Skor keseluruhan: 2 / 5.** Fondasi datanya kuat dan tidak ada transaksi yang hilang — masalahnya
seluruhnya di bagaimana angka itu ditampilkan. Satu perbaikan terfokus (pisah "mutasi nyata per dompet" dari
"anggaran per dompet", tambahkan baris Total, masukkan Dana Awal/Dana Cair, dan kunci ulang dropdown
wallet setelah simpan) akan menaikkan skor ini ke 4 tanpa mengubah model data.
