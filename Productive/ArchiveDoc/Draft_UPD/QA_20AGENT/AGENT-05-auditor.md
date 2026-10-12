# AGENT-05 - Auditor Internal

> **Persona:** Auditor internal yang datang memeriksa angka, tidak percaya klaim aplikasi, dan butuh jejak yang bisa ditunjukkan saat_,
> **Fokus:** jejak audit (siapa ubah apa, kapan), halaman laporan, tombol cetak / `printHTML`, konsistensi angka, dan stabilitas data_,
> **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 1 |
| TINGGI | 8 |
| SEDANG | 5 |
| RENDAH | 3 |
| **TOTAL** | **17** |

Aplikasi ini **sangat rapi secara visual dan angkanya konsisten di dalam satu tabel**,
tapi **tidak punya satu pun jejak audit**. Saya cari key `audit`/`log`/`histori`/`riwayat`
di 16 koleksi data, di 75 fungsi API `SPT.store`, dan di seluruh halaman UI: **nol hasil**.
Tidak ada field `createdAt`/`updatedAt`/`oleh` pada `sppd`, `sales`, `expenses`, `kasAdj`,
`danaCair`, `transports`, `prepItems`, `eventProducts`, `milestones`. Hanya `events` (9 record)
dan `checklistItems` punya `updatedAt`, dan `checklistItems.updatedAt` hanya berisi **tanggal
saja tanpa jam** — tidak bisa membuktikan urutan perubahan di hari yang sama.

Yang paling parah: **tombol "Pulihkan dari File" bisa menghapus seluruh data secara permanen
dalam satu klik, tanpa konfirmasi, tanpa backup otomatis.** Saya buktikan 9 event + 8 produk +
11 transaksi penjualan (81.033 byte data) hilang begitu file JSON kurang lengkap dipilih.

---

## Environment yang dipakai

- Edge headless (`msedge.exe --headless=new --virtual-time-budget=15000 --dump-dom`).
- Profil unik **6x** (`prof_agent05` … `prof_agent05o`), tiap run dihapus lalu dibuat ulang.
- `localStorage.clear()` di awal tiap harness → seed default selalu uji, tidak pernah data sisa.
- Semua hasil tes ditulis ke `<pre id="out">`, dibaca balik dari `--dump-dom`.
- **Tidak ada file aplikasi yang saya ubah.** Semua harness ada di `_QA_TMP/a05*.html`.
- Rute yang diuji: `#/events/evt-1` (Layar Kerja seksi 01–08), `uang/penjualan/keuangan`
  (seksi 05–06), `kerja` (paket 8 seksi), `#/reports`, `#/settings`, `#/products`, `#/master`,
  plus fungsi murni `SPT.store.*` dan `SPT.printHTML(ev)`.
- Angka seed yang dipakai sebagai acuan (evt-1, seed utuh):
  Dana Awal 2.500.000 · Penjualan 3.480.000 · Transport 1.440.000 · Pengeluaran 470.000 ·
  Penyesuaian kas 475.000 · Pengeluaran total 1.910.000 · **Saldo 4.545.000** ·
  Dana cair 1.500.000 dari total 2.500.000 · Alokasi budget 2.850.000 · Selisih +350.000.

---

## Temuan

### [BUG-01] "Pulihkan dari File" menghapus seluruh data secara permanen — **KRITIS**

**Persona dan use-case:** Auditor diberi file JSON backup dariquarters lalu. Dia ingin
memverifikasi isinya dengan cara aman: klik "Cadangkan dulu" → "Pulihkan dari File".
Yang terjadi: datanya hilang, dan aplikasi ikut error.

**Langkah reproduksi:**
1. Buka `#/settings`, seed default aktif (9 event, 8 produk, 11 penjualan).
2. Simpan salinan `store.exportJSON()` sebagai "backup yang benar" (81.033 byte).
3. Pilih file JSON yang **hanya berisi** `{"events":[{"id":"x1","nama":"Event Impor"}]}` —
   ini persis bentuk file yangklärung muncul kalau user diedarkan file JSON lama / partial /
   hasil edit manual oleh yang tidak paham struktur.
4. Klik "Pulihkan dari File" → pilih file tersebut.

**Harapan:**
File yang tidak lengkap ditolak dengan pesan jelas, data lama tetap utuh, dan ada konfirmasi
sebelum menimpa. Kalau memang diterima, minimal ada backup otomatis lebih dulu.

**Kenyataannya:**
`store.importJSON()` melakukan `DB = obj` **sebelum** memvalidasi koleksi lain
(posisi `DB = obj` = karakter 263 dari fungsi, terlihat di source: validasi hanya
`Array.isArray(obj.events)`, lalu langsung `DB = obj`, baru `DB.sppd.forEach(...)` yang
meledak karena `sppd` tidak ada di file). Efeknya berantai:
- Error yang tampil ke user adalah bahasa mesin mentah: `Cannot read properties of undefined (reading 'forEach')`.
- Data di memori langsung tertimpa: `events` 9 → **1**.
- `store.sales('evt-1')`, `store.products()`, `S.reports()`, `S.pages.dashboard()`,
  `store.financeSummary('evt-1')` semuanya **THROW** — aplikasi tidak bisa dipakai.
- LocalStorage **ikut tertimpa permanen** begitu user melakukan satu saja operasi biasa
  berikutnya. Saya tes `store.saveSettings({...})` → sukses → `localStorage` sekarang berisi
  `events: 1`, `products: 0`, `sales: 0`.
- Tidak ada `ui.confirm` di `data:import` (sumber aksi = 729 karakter, nol kemunculan
  `confirm`), dan tidak ada `exportJSON` sebagai auto-backdown.

**Evidence:**
```
B1 toast error yang dilihat user: "Cannot read properties of undefined (reading 'forEach')"
B1 events di memori sekarang=1 (dari 9 -> 1)
B1 sales evt-1 di memori=THROW: Cannot read properties of undefined (reading 'filter')
B1 produk di memori=THROW: Cannot read properties of undefined (reading 'length')
B1 raw localStorage events=1 -> ["Event Impor"]
B1 raw localStorage products=0
B1 raw localStorage sales=0
B1 >>> DATA ASLI HILANG PERMANEN? YA (9 event + produk + penjualan hilang)
E1 mengandung ui.confirm? TIDAK ADA
E1 ada auto-backdown sebelum import? TIDAK ADA
E1 -> Tidak konsisten: reset minta konfirmasi, import yang lebih destruktif TIDAK
```

**Dampak ke pengguna awam:**
User awam yang tidak paham JSON akan pilih file apa saja yang namanya "data". Satu klik,
seluruh 9 event beserta transaksi dan produk hilang, aplikasi error total, dan **pemulihan
hanya mungkin kalau user kebetulan punya file backup** — yang notanya aplikasi tidak pernah
catat. Yang lebih buruk: aplikasi diam-diam mengarang error teknis, bukan "format file tidak dikenali".

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Validasi **seluruh** koleksi yang dibutuhkan (`events`, `sppd`, `sales`, `expenses`,
  `products`, `transports`, `kasAdj`, `danaCair`, `prepItems`, `milestones`, `eventProducts`)
  **sebelum** `DB = obj`, dan jalankan di objek salinan, bukan di `DB`.
- Tolak file yang koleksi intinya kosong walau `events` ada: `products: 0` + `sales: 0`
  + `events: 1` bukan hasil backup SPPD Toolbox yang sah.
- Ganti pesan error teknis dengan pesan domainspeak: "File ini bukan backup SPPD Toolbox
  yang lengkap. Data kamu TIDAK berubah."
- Bungkus `data:import` dengan `ui.confirm` yang menyebutkan jumlah event sebelum/sesudah,
  sama seperti `data:reset`.
- Sebelum menimpa, simpan otomatis `sppd-autobackup-<tanggal>-<jam>.json` ke localStorage
(slot terpisah) dan beri tahu user file ada di mana.

---

### [BUG-02] Tidak ada jejak audit sama sekali — **TINGGI**

**Persona dan use-case:** Ada selisih Rp 1.050.000 antara laporan yang dicetak bulan lalu
dan laporan hari ini. Auditor harus bisa menunjukkan siapa mengubah apa dan kapan.

**Langkah reproduksi:**
1. Ambil `SPT.store.load()`, introspeksi seluruh key DB dan seluruh key API store.
2. Ubah satu transaksi penjualan secara programatik (setara user mengedit angka), lalu
   `saveSale()`, lalu baca ulang `localStorage`.

**Harapan:**
Ada tabel `auditLog` (atau similar) berisi: `timestamp`, `actor`, `aksi`, `entitas`,
`id`, `nilaiSebelum`, `nilaiSesudah`. Ada halaman "Riwayat Perubahan" yang bisa dicetak.

**Kenyataannya:**
- 16 key DB: `events, sppd, transports, products, eventProducts, sales, expenses, milestones,
  kasAdj, danaCair, prepItems, settings, checklistTemplates, checklistItems, itemCats,
  itemTemplates`. **Tidak ada** key audit/log/history.
- 75 fungsi API di `SPT.store`. **Tidak ada** satu pun bernama audit/log/history.
- Di seluruh UI (Layar Kerja + Rekap Global + Pengaturan + Panduan), kata
  `Jejak` / `Log Perubahan` / `Riwayat Perubahan` / `Audit Trail` **tidak pernah muncul**.
- Halaman yang tersedia hanya 8: dashboard, events, archive, products, master, reports,
  guide, settings. **Tidak ada halaman audit.**
- Saya mengubah transaksi `sal-1`: `total` 1.250.000 → **4.995**, `hargaSatuan` 250.000 → **999**.
  Record hasil simpan: `{"id":"sal-1",...,"total":4995,...}` — **tanpa** `updatedAt`,
  **tanpa** `createdAt`, **tanpa** `userId`, dan nilai lama 1.250.000 **tidak ada di mana pun**.
- Hapus pengeluaran `exp-1` (Akomodasi 150.000): `raw.expenses` 10 → 9, `JSON.stringify(...).indexOf('exp-1')`
  = **-1**. Tidak ada tombstone, tidak ada catatan penghapusan.

**Evidence:**
```
T1 key audit-ish: [] jumlah=0
T2 API audit-ish: [] jumlah=0
T2 cari S.audit/log: TIDAK ADA
T1 sales n=11 createdAt=false updatedAt=false userId=false
T1 expenses n=10 createdAt=false updatedAt=false userId=false
T1 kasAdj n=2 createdAt=false updatedAt=false userId=false
T1 danaCair n=4 createdAt=false updatedAt=false userId=false
T1 transports n=10 createdAt=false updatedAt=false userId=false
T1 prepItems n=13 createdAt=false updatedAt=false userId=false
T1 milestones n=29 createdAt=false updatedAt=false userId=false
T1 sppd n=8 createdAt=false updatedAt=false userId=false
T3 record punya updatedAt? false | createdAt? false
T3 SEBELUM total=1250000 -> SESUDAH total=4995
T3 audit trail di raw JSON? false
T4 apakah record masih ada di raw (tombstone)? -1 | raw.expenses=9 (tidak ada jejak dihapus)
```

**Dampak ke pengguna awam:**
Untuk UMAUM sendiri, dampaknya "cuma" tidak ada riwayat. Untuk **peng.cyee_atasan yang
menerima laporan dari PIC**, dampaknya jauh lebih serius: tidak ada cara yang bisa
membuktikan atau menyangkal kalau angka diubah.-suited cleanly: laporan yang dicetak hari ini
sama persis dengan laporan hari itu juga, padahal tidak ada bedanya — **dokumencet tidak
mempunyai nilai bukti.** Kalau ada sengketa atau pemeriksaan internal, aplikasi ini tidak
bisa dipakai sebagai alat bukti sama sekali.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Tambah koleksi `auditLog` di DB dengan isi minimal: `{id, at (ISO lengkap dgn jam), actor,
  aksi, entitas, entitasId, eventId, field, sebelum, sesudah}`.
- Tulis satu entri di dalam `store.save()` adalah cara paling murah dan paling tidak
  berisiko: bandingkan `DB` sebelum & sesudah, catat Differences. Minimal catat
  `create` / `update` / `delete` per koleksi dengan ringkasan field berubah.
- Tambahkan halaman `#/audit` yang bisa difilter per event, per tanggal, per aksi, dan
  **bisa dicetak** sebagai "Lampiran Bukti Perubahan".
- Set `updatedAt` (ISO lengkap dengan jam) di **semua** fungsi `save*`, bukan hanya event
  dan checklist. Tambahkan `actor` dari satu sumber (mis. nama di Pengaturan atau ID
  perangkat/sesi), walaupun di prototype ini `userId` hardcoded `'u1'` — minimal tetap ada
  kolomnya supaya struktur siap saat GAS/Supabase tersambung.
- Pertahankan record yang dihapus sebagai arsip (soft delete) dengan penanda
  `deletedAt`, supaya bisa ditelusuri.

---

### [BUG-03] 12 aksi hapus tanpa konfirmasi dan tanpa BATALKAN — **TINGGI**

**Persona dan use-case:** PIC di HP sambil berdiri di booth. Ingin hapus satu transaksi
yang salah catat. Jari mengetuk "Hapus".

**Langkah reproduksi:**
1. Buka seksi 05 Penjualan (`#/events/evt-1/uang`), tabel "Riwayat Transaksi".
2. Perhatikan setiap baris punya tombol "Hapus".
3. Ketuk salah satu.

**Harapan:**
Muncul dialog konfirmasi ("Hapus transaksi Rp 1.050.000 ini?"), dan kalau salah, ada
"Urungkan / BATALKAN" beberapa detik setelahnya.

**Kenyataannya:**
Dialog konfirmasi **hanya ada di 4 aksi dari 16** yang menghapus sesuatu. Yang_editor
**12 aksi menghapus data keuangan dan aset tanpa konfirmasi apa pun** — dan semuanya
menampilkan toast sukses, sehingga user merasa aksinya terkonfirmasi.

**Evidence:**
```
A6 action delete-ish DENGAN confirm (4): master:catdel,event:delete,product:delete,data:reset
A6 action delete-ish TANPA confirm (12): master:itemdel,transport:delete,eventproduct:remove,
   bring:remove,milestone:delete,milestone:att:delete,kasadj:delete,danaCair:delete,
   budget:delete,prepitem:delete,sale:delete,expense:delete
C3   sale:delete      -> confirm=TIDAK | toast='Transaksi dihapus'
C3   expense:delete   -> confirm=TIDAK | toast='Pengeluaran dihapus'
C3   kasadj:delete    -> confirm=TIDAK | toast='Penyesuaian dihapus'
C3   danaCair:delete  -> confirm=TIDAK | toast='Sumber dana dihapus'
C3   transport:delete -> confirm=TIDAK | toast='Rute dihapus'
C3   budget:delete    -> confirm=TIDAK | toast='Alokasi dihapus'
C3   bring:remove     -> confirm=TIDAK | toast=(tanpa toast)
C3 ada tombol "Batalkan"/undo setelah hapus? TIDAK ADA
C3 kolom tabel riwayat: ["Tanggal","Produk","Qty","Harga","Metode / Wallet","Total",""]
```
Dampak angka: menghapus `sal-2` (Kopi Bubuk 30 × 35.000) menurunkan penjualan
**3.480.000 → 2.430.000** dan saldo **4.545.000 → 3.495.000** dalam satu ketukan.

**Dampak ke pengguna awam:**
Ini temuan yang paling mungkin benar-benar terjadi di lapangan. Di HP dengan tombol kecil,
salah ketuk = Rp 1.050.000 hilang dari laporan, toast masih bilang "Transaksi dihapus"
(seolahnya berhasil), dan **tidak ada jalan kembali** selain hope punya backup.
Untuk pengeluaran, Dana Cair, dan alokasi budget — semuanya angka yang jadi bahan
pertanggungjawaban ke atasan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Semua `*:delete` / `*:remove` harus lewat `ui.confirm` yang menyebutkan **nilai**
  yang akan hilang (bukan "Hapus?" generik), lalu tidak ada aksi yang menghapus nilai
  uang tanpa menyebut nominalnya.
- Tambahkan penanda `hapus` bergaya "Batalkan 8 detik" (undo) di `toast` untuk semua
  aksi hapus, karena undo lebih cepat daripada dialog untuk kesalahan ketik-tap.
- Tombol "Hapus" di tabel dengan nominal besar sebaiknya ikon seru dengan label yang
  selalu terlihat, atau minimal `aria-label` berisi nominal.

---

### [BUG-04] Satu dokumen cetak menampilkan DUA angka "saldo" yang berbeda — **TINGGI**

**Persona dan use-case:** Auditor menerima Laporan Penggunaan Uang evt-1 dalam bentuk cetak.
Dia menjumlahkan kolom "Saldo" di tabel Arus Kas per Wallet, lalu membandingkan dengan
baris "Saldo akhir" di halaman terakhir.

**Langkah reproduksi:**
1. `SPT.store.resetData()` (seed utuh), lalu `SPT.printHTML(SPT.store.getEvent('evt-1'))`.
2. Jumlahkan kolom `Saldo` pada tabel "Arus Kas per Wallet".
3. Bandingkan dengan baris `Saldo akhir` di tabel rekap akhir.

**Harapan:**
Satu dokumen pertanggungjawaban punya satu angka saldo. Kalau memang ada perbedaan,
harus ada baris penjelas (mis. "Dana awal belum direkening").

**Kenyataannya:**
Jumlah saldo per wallet = **Rp 2.045.000**. Baris "Saldo akhir" di dokumen yang sama =
**Rp 4.545.000**. Selisih **Rp 2.500.000** — persis sama dengan Dana Awal SPPD.
Penyebabnya: `financeSummary()` menghitung saldo dari `danaAwal + penjualan + kasAdj − pengeluaran`,
sedangkan tabel wallet hanya Menjumlahkan `masuk` dari penjualan & kasAdj — **dana awal tidak
pernah masuk ke wallet mana pun**, dan tidak ada satu pun baris di dokumen yang
menjelaskan itu.

**Evidence:**
```
B4 SALDO TOTAL wallet (jumlah kolom Saldo tabel Arus Kas)=2045000
B4 SALDO AKHIR di tabel rekap akhir=4545000
B4 SELISIH=2500000 (= dana awal? YA)
B4 >>> Dokumen cetak menampilkan dua angka "saldo" berbeda tanpa catatan? YA
Tabel Arus Kas di cetak: Bank +Rp 1.000.000 | −Rp 0 | Rp 1.000.000
                         QRIS +Rp 1.250.000 | −Rp 0 | Rp 1.250.000
                         Kas  +Rp 1.730.000 | −Rp 1.935.000 | Rp -205.000
                         E-Money +Rp 0 | −Rp 0 | Rp 0
Baris akhir di cetak: Hasil penjualan Rp 3.480.000 · Total biaya Rp 1.910.000
                       Penyesuaian kas +Rp 475.000 · Saldo akhir Rp 4.545.000
```

**Dampak ke pengguna awam:**
Auditor atau bendahara yang jujur akan menghitung ulang, menemukan Rp 2.500.000 tidak
terjelaskan, lalu **mencatat laporan ini sebagai tidak dapat dipertanggungjawabkan**.
Justru dokumen yang seharusnya jadi bukti, jadi alatktiv Questions..overheid
Pic sendiri juga bisa salah paham: "kok uang di Bank 1 juta tapi saldo 4,5 juta?"

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Tambahkan baris eksplisit di tabel Arus Kas per Wallet: "Saldo awal / Dana Awal
  (dialokasikan dari SPPD, belum direkening)" dengan Allocate per wallet sesuai
  kolom Wallet di Rincian Alokasi SPPD, supaya total kolom Saldo = Saldo akhir.
- Atau tambahkan baris penjelas di bawah tabel: "Selisih antara jumlah saldo wallet
  (Rp 2.045.000) dan saldo akhir (Rp 4.545.000) sebesar Rp 2.500.000 adalah Dana Awal
  SPPD yang belum direkening."
- Kas (-Rp 205.000) negatif juga perlu catatan eksplisit, karena saldo kas negatif itu
  kondisi yang harus dijelaskan, bukan sekadar angka merah.

---

### [BUG-05] Tabel "Alokasi & Realisasi per Wallet Tujuan" bertentangan dengan "Arus Kas per Wallet" — **TINGGI**

**Persona dan use-case:** Auditor ingin tahu "¿apa benar-benar keluar dari rekening Bank?"
Dua tabel di dokumen yang sama_should jawabnya.

**Langkah reproduksi:**
1. Seed utuh, ambil `financeSummary('evt-1').budget.perWallet`.
2. Bandingkan `realisasi` per wallet dengan `wallets[wallet].keluar` dari tabel Arus Kas.
3. Lihat keduanya di dokumen cetak.

**Harapan:**
Satu wallet punya satu angka realisasi. KalaubedanyaMemakai dompet berbeda, itu harus
dijelaskan (mis. "realisasi dibayar dari Kas, alokasi ditugaskan ke Bank").

**Kenyataannya:**
Di dokumen yang sama:
- Tabel Arus Kas: **Bank keluar Rp 0**, Kas keluar **Rp 1.935.000**, E-Money keluar Rp 0.
- Tabel Alokasi & Realisasi per Wallet Tujuan: **Bank realisasi Rp 1.500.000**,
  **Kas realisasi Rp 410.000**, E-Money Rp 0.

Selisih Bank 1.500.000 dan Kas −1.525.000. Penyebabnya: `budgetRealisasi()`
menghitung realisasi per komponen lalu menempelkan wallet **dari baris alokasi**
(`b.wallet`), bukan wallet **dari transaksi yang benar-benar dibayar**. Jadi
"Penginapan" saya dialokasikan ke Bank, maka realisasinya otomatis dihitung sebagai
terbayar dari Bank — padahal expense-nya tercatat wallet Kas.

**Evidence:**
```
B4 tabel "Alokasi & Realisasi per Wallet Tujuan" Bank: alokasi=2250000 realisasi=1500000
B4  Realisasi wallet sebenernya (Arus Kas keluar Bank)=0 -> COCOK? TIDAK (beda 1500000)
B4 tabel "Alokasi & Realisasi per Wallet Tujuan" Kas: alokasi=350000 realisasi=410000
B4  Realisasi wallet sebenernya (Arus Kas keluar Kas)=1935000 -> COCOK? TIDAK (beda -1525000)
```

**Dampak ke pengguna awam:**
Kalau dokumen ini dipakai untuk rekonsiliasi rekening, Bank akan terlihat sudah
men wisely Rp 1.500.000 padahal rekening Bank tidak tersentuh sama sekali
(Arus Kas Bank keluar Rp 0). Akuntan akan segera mempertahankan bahwa tabel ini salah,
dan seluruh laporan jadi meragukan. Ini galat yang secara tipe data benar-benar
menyesatkan — bukan sekadar tidak lengkap.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Pisahkan dua konsep secara eksplisit di dokumen: "Realisasi per **sumber dana**
  (wallet transaksi)" dan "Realisasi per **wallet tujuan alokasi**", dengan judul
  berbeda dan satu kalimat penjelas bahwa keduanya bisa berbeda.
- Kalau memang perlu satu angka, tambahkan kolom `sumberDanaRiil` per baris realisasi
  yang diambil dari wallet transaksi, bukan dari wallet alokasi.
- Tambah baris rekonsiliasi: "Total realisasi menurut wallet transaksi harus sama dengan
  Total realisasi pada tabel Anggaran" sebagai assertion visual bila tidak sama.

---

### [BUG-06] Laporan cetak kehilangan blok yang ada di layar — **TINGGI**

**Persona dan use-case:** PIC mencetak laporan pertanggungjawaban untuk diserahkan ke
atasan. Atasan adalah yang membandingkan laporan itu denganPICsial yang mereka lihat
sebelumnya.

**Langkah reproduksi:**
1. Render seksi 05–08 di layar: `SPT.pages2.uang(ev)` → 13.604 karakter.
2. Render dokumen cetak: `SPT.printHTML(ev)` → 4.896 karakter.
3. Bandingkan blok yang ada.

**Harapan:**
Dokumen cetak adalah versi arsip dari apa yangPICsial lihat. Kalau begitu, tidak ada
blok yang hilang.

**Kenyataannya:**
Halaman "Uang – Laporan" di layar punya 8 blok. Dokumen cetaknya **tidak punya**:
1. **Rekap Produk & Qty** (dibawa / terjual / rusak / kembali + badge tuntas) — **hilang**.
2. **Rekap Item Persiapan** + total estimasi biaya — **hilang**.
3. **Bandingkan SPPD vs Realisasi vs Penjualan** (baris pembanding 5 angka) — **hilang**.
4. **Laporan Arus Kas per Wallet** sebagai judul & konteks — **hilang**.
5. **Rekap Penggunaan Uang** sebagai blok tersendiri — **hilang**.
6. **Rincian penjualan per transaksi** — hanya total `Rp 3.480.000`, tanpa tanggal/qty/metode.
7. **Detail Dana Cair** — hanya total "Dana sudah cair Rp 1.500.000". Sumber
   "Transfer instansi (BCA) / BCA — 8910 / tanggal 2026-04-05" **tidak ikut**.
8. **Tanggal terbit SPPD** (`2026-04-05`) — **tidak ikut**, padahal no surat `039/SPPD/UKM/2026` ikut.
9. **Catatan SPPD** ("Penginapan diinapkan ke hotel panitia.") — **tidak ikut**.
10. **Status SPPD** (`disetujui`) — **tidak ikut**. Laporan dicetak dari SPPD yang belum
    disetujui sama dengan yang sudah, tidak ada bedanya di kertas.
11. **Milestone** (5 buah, status selesai/todo) — **tidak ikut**.
12. **Checklist** 24 item, 15 selesai — **tidak ikut**.

**Evidence:**
```
B3 judul di LAYAR "Rekap Produk"? YA   | di CETAK? TIDAK
B3 judul di LAYAR "Rekap Item Persiapan"? YA | di CETAK? TIDAK
B3 judul di LAYAR "Bandingkan SPPD vs Realisasi"? YA | di CETAK? TIDAK
B3 judul di LAYAR "Rekap Penggunaan Uang"? YA | di CETAK? TIDAK
B3 produk ("Batik Tulis") qty dibawa/terjual/kembali di cetak? TIDAK ADA
B3 item persiapan=3 -> di cetak? TIDAK ADA (contoh "Kabel Rol 5 m")
B3 checklist items=24 done=15 -> di cetak? TIDAK ADA
B3 milestones=5 -> status/catatan milestone di cetak? TIDAK ADA
B3 sppd.tanggalTerbit="2026-04-05" di cetak? TIDAK ADA (tanggal surat hilang)
B3 sppd.catatan di cetak? TIDAK ADA
B3 danaCair rows=2 -> detail (sumber/rekening/tanggal) di cetak? TIDAK | hanya total
B3 approval SPPD (status=disetujui) tercatat di cetak? TIDAK
B3 approve transaksi penjualan evt-1=4 -> hanya total (tidak ada tanggal/qty/metode)
```

**Dampak ke pengguna awam:**
Laporan yang diserahkan ke atasan **tidak bisa dipakai untuk memverifikasi barang**.
Yang paling krusial untuk UMKM: berapa barang dibawa, berapa laku, berapa rusak/hilang,
berapa kembali — tidak ada satu pun di kertas. Kalau ada produk hilang di booth, laporan
cetak ini **sama sekali tidak bisa dipakai sebagai alat bukti**.-atasan juga tidak bisa
melihat apakah SPPD sudah disetujui atau belum, padahal laporan ini untuk pertanggungjawaban.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- `printHTML()` sebaiknya dibangun dari komponen yang sama dengan `tabLaporan()` agar
  mustahil ada blok yang "terlupa". Kalau tetap terpisah, tambahkan daftar blok wajib
  dan tes yang membandingkan set of headings di layar vs di cetak.
- Minimal tambahkan: Rekap Produk & Qty, Rekap Item Persiapan, rincian penjualan per
  transaksi (tanggal/produk/qty/harga/metode/total), detail Dana Cair (sumber/rekening/
  tanggal/status), tanggal terbit & status SPPD, catatan SPPD.
- Tambahkan blok "Lampiran: Dokumen Bukti" berisi daftar lampiran milestone yang sudah
  diunggah (dengan kolom "terlampir / belum" ), supaya cetak dan arsip berkas sinkron.

---

### [BUG-07] Dokumen cetak tidak punya bukti siapa dan kapan — **TINGGI**

**Persona dan use-case:** Auditor menerima laporan cetak. Ia mencatat: siapa yang
menyusun, tanggal berapa dicetak, NIP berapa, halaman ke-berapa ini.

**Langkah reproduksi:**
1. `SPT.printHTML(SPT.store.getEvent('evt-1'))`.
2. Cari elemen penanda identitas dan waktu cetak.

**Harapan:**
Header berisi nama + NIP + instansi, footer berisi "Dicetak pada &lt;tanggal&gt; &lt;jam&gt;"
oleh &lt;nama&gt;", nomor halaman, serta blok tanda tangan minimal 2 kolom
(Penyusun / Mengetahui) dengan nama & jabatan.

**Kenyataannya:**
- Yang ada: `Kael · Dinas Koperasi & UMKM Kota` (dari `settings.nama` dan `settings.instansi`).
- `settings` hanya punya 5 field: `nama, instansi, tarifKm, folderDriveId, catatanIntegrasi`.
  **Tidak ada field NIP sama sekali** — padahal label di Pengaturan menulis "Nama / NIP",
  jadi UI menjanjikan field yang tidak ada.
- **Tidak ada** tanggal/jam cetak (`Dicetak` = TIDAK ADA).
- **Tidak ada** nomor halaman (`counter(page)` = tidak ada, `@page` = tidak ada).
- Tanda tangan hanya satu baris: `Mengetahui, ______________` — **tanpa nama, tanpa
  jabatan, tanpa NIP**, dan tidak ada kolom "Disusun oleh".
- Status SPPD `disetujui` tidak tercetak, sehingga tidak ada bukti bahwa laporan ini
  dibuat dari SPPD yang sudah disetujui.

**Evidence:**
```
B8 settings = {"nama":"Kael","instansi":"Dinas Koperasi & UMKM Kota","tarifKm":4500,
   "folderDriveId":"","catatanIntegrasi":"Key GAS & Supabase belum diisi (prototype)."}
B8 NIP ada di settings? TIDAK ADA (tidak ada field NIP sama sekali)
B8 field settings: nama,instansi,tarifKm,folderDriveId,catatanIntegrasi
B8 tanggal/jam cetak di dokumen? TIDAK ADA
B8 nomor halaman? TIDAK ADA
B8 kolom "disetujui oleh"/"diperiksa"? ADA "Mengetahui" -> hanya 1 ttd, tanpa nama & jabatan
B8 tanggalTerbit SPPD tercatat? TIDAK
B5 ada @page / margin cetak? TIDAK (cetak browser default, bisa keluar weird)
B5 Landscape/portrait diset? TIDAK (default)
```

**Dampak ke pengguna awam:**
Laporan tanpa tanggal cetak tidak bisa dipakaiSTF sebagai bukti. Kalau ada dua laporan
dengan angka sama persis, auditor tidak bisa membedakannya, dan tidak bisa memastikan
mana yang terbaru. Label "Nama / NIP" yang tidak ada isinya juga membuat PIC
meny_impulkan NIP-nya sudah tercatat padahal tidak — data kepribadiannya hilang begitu
cetak.

**Ususan perbaikan (deskriptif, jangan diimplementasikan):**
- Tambah `nip` (dan opsional `jabatan`, `noHp`) ke `settings` + form Pengaturan, dan
  perbaiki label jadi dua input terpisah: "Nama" dan "NIP".
- Tambahkan footer di dokumen: "Dicetak oleh &lt;nama&gt; (&lt;NIP&gt;) pada
  2026-10-01 14:32 WIB" — diambil dari `new Date()` saat tombol ditekan.
- Tambahkan `@page { size: A4; margin: 14mm }` dan nomor halaman via
  `@page { @bottom-center { content: "Halaman " counter(page) " dari " counter(pages) } }`
  atau tabel footer manual yang diulang tiap halaman.
- Sediakan **dua** blok tanda tangan: "Disusun oleh (nama, NIP, tanggal)" dan
  "Mengetahui (nama, jabatan, NIP, tanggal)".

---

### [BUG-08] Wallet tak dikenal tetap disimpan, tapi dipaksa jadi "Kas" saat tampil & cetak — **TINGGI**

**Persona dan use-case:** PIC mencatat pengeluaran dari "Rekening Pasar" atau(user salah
pilih "BCA" karena Think). Dia menyimpan, lalu semuanya tersimpan

**Langkah reproduksi:**
1. Set `expenses('evt-1')[0].wallet = 'Rekening Pasar'`, `saveExpense()`, `save()`.
2. Render halaman Uang dan `printHTML(ev)`.

**Harapan:**
Nilai yang tidak dikenal dari daftar wallet **ditolak saat input** dengan pesan
"pilih dari daftar", atau minimal **ditampilkan apa adanya** supaya user tahu labelnya salah.

**Kenyataannya:**
- Record tersimpan dengan `wallet: "Rekening Pasar"` — jadi data **terlihat benar di tempat
  lain** (mis. diekspor ke JSON mentah).
- `normWallets()` hanya mengisi wallet yang **falsy** (`if (!e.wallet) e.wallet = 'Kas'`),
  jadi nilai tak dikenal tidak pernah diganti saat simpan.
- Tapi saat **tampil di layar** dan **saat DICETAK**, `printHTML()` memanggil
  `ui.esc(A.store.walletKey(e.wallet))` dan `walletKey()` mengembalikan `'Kas'` untuk
  apa pun yang bukan 4 wallet resmi.
- Hasil: dokumen cetak berbunyi **"Kas"** untuk transaksi yang sebenarnya bukan dari Kas.
  Angka tidak hilang, tapi **labelnya menyesatkan**, dan tidak ada tanda peringatan.

**Evidence:**
```
D2 expense wallet="Rekening Pasar" (normWallets tidak menimpa karena nilai truthy)
D2 walletKey("Rekening Pasar")="Kas" -> semua wallet tak dikenal dibuang jadi Kas saat tampil
D2 saldo summary tetap=4545000 (uang tidak hilang)
D2 label wallet di layar: "Rekening Pasar" muncul? TIDAK (dibaca Kas)
D2 label wallet di CETAK: "Rekening Pasar" muncul? TIDAK (cetak walletKey -> Kas)
D2 printHTML pakai A.store.walletKey(e.wallet) -> nilainya "<td>Kas</td><td>Rp"
C1 expense wallet="Debit BCA" -> setelah normWallets: "Debit BCA"
```

**Dampak ke pengguna awam:**
Ini temuan yang paling "hal tidak jelas tapi akibatnya besar". Rekonsiliasi kas harian
menjadi tidak bisa dipercaya: transaksi yang sebenarnya dibayar dari rekening lain
tercatat "Kas" di laporan. Untuk UMKM yang memakai 2–3 sumber dana, ini membuat laporan
cetak menyesatkan secara halus — dan user tidak pernah diberi tahu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Validasi wallet **di lapisan store**, bukan hanya di UI: `saveExpense`/`saveTransport`/
  `saveSale`/`saveKasAdj` harus menolak atau menormalkan nilai di luar
  `SPT.store.WALLETS`, dan mengembalikan pesan ke pemanggil.
- Jangan pakai `walletKey()` (yang diam-diam jatuh ke `'Kas'`) untuk **menampilkan** nilai
  yang sudah tersimpan. Tampilkan nilai aslinaya plus badge "tidak dikenal" agar
  ketahuan ada data yang perlu dibenahi.
- Pertimbangkan rename "Kas" jadi label yang lebih spesifik, atau menambah opsi wallet
  kustom (mis. "Kas Utama", "Kas Event") supaya user's rekening bisaeksplisit.

---

### [BUG-09] Pengeluaran dengan jumlah tidak valid tersimpan tapi dihitung Rp 0 — **TINGGI**

**Persona dan use-case:** PIC mengetik "12.500" tanpa titik, atau mengetik "abc" saat
terganggu. Form terisi, toast hijau muncul.

**Langkah reproduksi:**
1. `saveExpense({ ..., jumlah: 'abc', wallet: 'Kas' })`.
2. `financeSummary('evt-1')` → `totalExpense`.

**Harapan:**
Input tidak valid ditolak saat simpan dengan pesan jelas, atau minimal ada toast
peringatan "nominal tidak terbaca, dianggap Rp 0".

**Kenyataannya:**
Record **tersimpan** (`saveExpense` tidak memvalidasi `jumlah` seperti `saveKasAdj`/
`saveDanaCair` yang melakukan `Number(x.jumlah) || 0`), toast "Pengeluaran dicatat"
menyala hijau, tapi `totalExpense` **tidak bertambah sama sekali** — angkanya tidak
berubah. Jadi user melihat "Pengeluaran dicatat" padahal uang yang dicatat tidak masuk
perhitungan mana pun.

**Evidence:**
```
A8 setelah jumlah="abc" -> expense total=471050.5 saldo=4543949.5
   (sebelumnya expense=471050.5 -> saldo SAMA SEKALI, tidak bergerak)
A8 budget Penginapan realisasi=151050.5 (tidak naik dari 'abc')
A8 fmt NaN -> "Rp 0"
C4 (bandingkan) saveExpense tanpa jumlah tetap "OK"
```
Catatan tambahan: input desimal juga diterima tanpa peringatan —
`jumlah: 1050.5` menghasilkan `saldo = 4543949.5` dan tampil sebagai `Rp 4.543.949,5`.
Untuk uang rupiah yang tidak pakai koma desimal, ini menghasilkan angka yang tidak
pernah terjadi di dunia nyata dan sulit dipertanggungjawabkan.

**Dampak ke pengguna awam:**
PIC sincerely mengira sudah mencatat pengeluaran. Laporan yang diserahkan ke atasan
tidak memuat pengeluaran itu. Selisih Rp 500.000 atau Rp 1.000.000 baru Ketahuan saat
rekonsiliasi — dan karena tidak ada jejak audit (BUG-02), mustahil dibuktikan siapa yang
salah input.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Validasi di `saveExpense()`: `var v = Number(e.jumlah); if (!isFinite(v) || v <= 0) return false;`
  — sama seperti yang sudah dilakukan `saveKasAdj` (line 506) dan `saveDanaCair` (line 522).
  Saya perhatikan **`saveExpense` dan `saveTransport` tidak punya validasi ini** — ini
  inkonsistensi di dalam store yang mudah diperbaiki.
- Tolak juga angka desimal untuk currency (-round ke integer atau tampilkan peringatan).
- Balikkan nilai balik dari `save*` (true/false) agar `actions.js` bisa menampilkan
  toast error dan **tidak** reload halaman kalau simpan gagal.

---

### [BUG-10] Judul "Audit Aset Berangkat & Pulang" menyesatkan untuk auditor — **SEDANG**

**Persona dan use-case:** Auditor mencari halaman "Audit". Ia menemukan seksi 07
berjudul **"Audit Aset Berangkat & Pulang"** dan mengira itu fiturnya.

**Langkah reproduksi:**
1. Buka Layar Kerja evt-1.
2. Baca daftar `<h2>` yang dirender.

**Harapan:**
Istilah "Audit" dipakai untuk jejak perubahan data, atau minimal ada catatan bahwa
"Audit" di sini berarti pemeriksaan aset fisik.

**Kenyataannya:**
Judul yang muncul memuat `Audit Aset Berangkat & Pulang` — satu-satunya kemunculan kata
"Audit" di seluruh UI. Isinya murni rekap qty (dibawa = terjual + rusak/hilang + kembali)
dan centang "dibawa pulang". **Tidak ada hubungannya sama sekali** dengan siapa mengubah
apa. Tidak ada halaman audit di peta 8 halaman, dan kata `Jejak` / `Log Perubahan` /
`Riwayat Perubahan` tidak pernah muncul di seluruh aplikasi.

**Evidence:**
```
D4 judul yang muncul: [...,"Audit Aset Berangkat & Pulang", "Rekap Produk & Qty", ...]
D4 kata "riwayat"/"Jejak"/"Log perubahan" muncul di UI? TIDAK ADA
D4 adakah halaman berlabel "Audit" di peta 8 halaman? TIDAK
D4 settings ada tombol "Riwayat"? TIDAK
```

**Dampak ke pengguna awam:**
Sedikit, tapi]]: untuk auditor atau manajer yang membaca dokumentasi, "Audit" yang ada
justru mengarahkan ke tempat yang salah dan menciptakan ekspektasi palsu.
mengira fiturnya sudah ada. Risikonya: fitur audit dianggap sudah selesai padahal nol.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Rename menjadi "Pemeriksaan Aset Berangkat & Pulang" atau "Cross-check Aset" supaya
  tidak bentrok dengan istilah audit.
- Setelah fitur jejak audit ada, sediakan halaman `#/audit` dengan nama berbeda dan
  taruh tautan silang dari halaman ini: "Lihat riwayat perubahan data event ini".

---

### [BUG-11] `printHTML()` efek samping menulis record baru ke database — **SEDANG**

**Persona dan use-case:** Auditor memicu cetak. Sesudahnya, dia memeriksa data
dan menemukan baris yang tidak ada sebelumnya.

**Langkah reproduksi:**
1. Seed default: 8 baris `sppd` untuk 9 event (evt-2 memang belum punya SPPD).
2. Panggil `SPT.printHTML(SPT.store.getEvent('evt-2'))`.
3. Baca ulang `localStorage` → `sppd`.

**Harapan:**
Mencetak/membaca tidak mengubah data. Fungsi `print*` harusnya read-only.

**Kenyataannya:**
`printHTML()` memanggil `store.getSppd(ev.id)`, dan `getSppd()` **menyimpan record baru
bila tidak ditemukan** (`saveSppd(s)` dipanggil di dalam fungsi yang harusnya read-only).
Hasilnya: `sppd` 8 → **9**. Record baru:
`{"id":"id-muodr3fh-...","eventId":"evt-2","status":"draft","danaAwal":0,"budget":[]}`.
Untuk kasus yang lebih parah, `printHTML({id:'evt-999', ...})` (id event yang tidak ada)
juga membuat record SPPD **yatim** → `sppd` 9 → **10**, sementara `events` tetap 9.
JadiOperasi "cetak" bisa menciptakan data di DB yang tidak pernah diinput user.

**Evidence:**
```
A1 sppd rows seed=8 events=9
A1 event tanpa sppd: evt-2 (Gelar UMKM Kota 2026)
A1 sppd rows setelah printHTML(evt-2)=9 (naik? YA)
A1 sppd evt-2 sekarang: [{"id":"id-muodr3fh-k2u5iy","eventId":"evt-2","noSurat":"",
   "tanggalTerbit":"","tujuan":"","kegiatan":"","instansi":"","status":"draft","danaAwal":0,
   "realisasi":0,"tampilkanRealisasi":false,"linkDokumen":"","catatan":"","budget":[]}]
A1 sppd rows setelah printHTML(id palsu)=10
A1 record hantu: [{"id":"id-muodr3g1-6jscr0","eventId":"evt-999", ...}]
A1.events masih 9 -> record yatim di DB
A1 printHTML(undefined) -> THROW: Cannot read properties of undefined (reading 'id')
```

**Dampak ke pengguna awam:**
Tidak terlihat langsung, tapi untuk auditor efeknya penting: jumlah baris di database
**berubah karena aksi mencetak**, sehingga hasil pemeriksaan "berapa banyak data yang
tercatat" bisa berbeda tergantung urutan saya menekan tombol. Selain itu, SPPD yatim
(`evt-999`) tidak pernah dibersihkan dan tidak muncul di halaman mana pun — data sampah
yang tidak bisa dijelaskan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Pisahkan reader dari writer: sediakan `store.peekSppd(eventId)` yang **tidak** menyimpan
  bila tidak ada, dan biarkan `getSppd()` (yang lazily-create) hanya dipakai dari
  halaman edit. Semua fungsi `print*`, `financeSummary`, `budgetRealisasi` pakai `peekSppd`.
- Validasi `eventId` di `printHTML()`: kalau `getEvent(id)` tidak ditemukan, kembalikan
  pesan "Event tidak ditemukan" alih-alih membuat record.

---

### [BUG-12] "Cetak Rekap Global" tidak punya jalur cadangan dan tidak bisa diarsipkan — **SEDANG**

**Persona dan use-case:** Auditor ingin mengarsipkan rekap seluruh event dalam satu
berkas. Ia klik "Cetak Rekap Global" dari halaman Rekap Global.

**Langkah reproduksi:**
1. Buka `#/reports`, klik "Cetak Rekap Global".
2. Popup diblokir browser (setting default Office/kantor).

**Harapan:**
ada jalur cadangan seperti di `print:open` (iframe + tombol Cetak), dan dokumennya
lengkap sebagai arsip.

**Kenyataannya:**
- `report:global` **tidak punya fallback**. Sumber: `if (!w) { ui.toast('Izinkan popup untuk cetak', 'error'); return; }`
  — selesai. Bandingkan `print:open` yang sudah punya fallback iframe `srcdoc` lengkap
  dengan tombol "Cetak". Jadi **dua fitur cetak di aplikasi ini punya kualitas berbeda**.
- Dokumen rekap global juga sangat minimal: 1 baris ringkasan + tabel 9 baris (1 per event).
  **Tidak ada** baris total/subtotal, tidak ada tanggal cetak, tidak ada nama penyusun,
  tidak ada tanda tangan.
- Tidak ada tombol unduh/cetak ke PDF dari dalam halaman — semuanya bergantung pada
  `window.print()` browser.

**Evidence:**
```
C6 report:global fallback kalau popup diblokir? TIDAK (hanya toast "Izinkan popup untuk cetak")
C6 report:global escape nama event? TIDAK - e.nama mentah masuk HTML
C6 jumlah baris rekap global = jumlah event (9), tiap event 1 baris -> tidak ada subtotal
A5 totalSales=25555000 totalExpense=11360000 totalSaldo=36670000 qty=223 events=9
```

**Dampak ke pengguna awam:**
Di komputer kantor dengan ekstensi pemblokir popup (atau Edge dengan pengaturan ketat),
user klik "Cetak Rekap Global", dapat toast error, dan **tidak ada jalan lain** untuk
mencetak rekap global — tidak seperti laporan per-event yang punya fallback. Untuk
arsip, tidak ada opsi unduh berkas.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Samakan kualitas dua jalur cetak: `report:global` sebaiknya memakai helper fallback
  yang sama dengan `print:open`, atau lebih baik **ekstrak** helper `cetakHTML(html, judul)`
  supaya popup-diblokir ditangani di satu tempat.
- Tambahkan baris `Total` di tabel rekap global, plus tanggal cetak dan blok tanda tangan.
- Tambahkan tombol "Unduh laporan (HTML/PDF)" yang tidak bergantung pada popup.

---

### [BUG-13] Backup file: nama menimpa per hari, tanpa jam/versi, round-trip tidak reproducible — **SEDANG**

**Persona dan use-case:** Auditor ingin menyimpan **tiga** versi laporan harian
(1 April, 2 April, 3 April) sebagai bukti berurutan.

**Langkah reproduksi:**
1. `#/settings` → "Backup ke File" sebanyak beberapa kali pada hari yang sama.
2. Bandingkan nama file, dan bandingkan `exportJSON()` sebelum vs sesudah `importJSON()`.

**Harapan:**
Nama file unik (punya jam/menit/detik), isi file mencantumkan kapan diekspor dan aplikasi
versi berapa, dan `export(import(export(x))) == export(x)` — byte-identical.

**Kenyataannya:**
- Nama file = `sppd-backup-2026-10-01.json` (**hanya tanggal**). Dua backup pada hari
  yang sama menghasilkan nama sama → browser menambahkan "(1)", tapi user tidak punya
  cara tahu mana yang lebih baru tanpa melihat metadata file di luar aplikasi.
- File hasil export **tidak punya** field `exportedAt` (timestamp) maupun `appVersion`
  (versi aplikasi). Tidak ada apa pun di dalam file yang memberi tahu kapan dan dari
  aplikasi versi berapa file itu dibuat.
- Round-trip **tidak byte-identical**: `exportJSON()` → 80.243 byte, `importJSON()` →
  `exportJSON()` → 81.033 byte. Yang berubah: key `sppd` dan `milestones`. Penyebabnya
  `getSppd()` yang lazily-create (BUG-11) plus normalisasi `m.attachments = m.attachments || []`.
  Setelah satu putaran, hasilnya stabil (81.033 = 81.033), tapi **file backup pertama
  dan kedua tidak identik** — artinya "restore lalu backup lagi" mengubah isi file,
  sehingga perbandingan antar-file backup (diff) selalu menunjukkan perubahan palsu.

**Evidence:**
```
D1 export #1 length=80243
D1 export #2 length=81033 identik? TIDAK
D1 beda key "sppd": #1 n=8 #2 n=8
D1 beda key "milestones": #1 n=29 #2 n=29
D1 export #3 panjang=81033 stabil setelah 1x? YA
C4 nama file backup: "sppd-backup-" + isoToday() + ".json" -> 2026-10-01
   (hanya TANGGAL, tanpa jam; 2 backup hari sama menimpa)
C4 tidak ada timestamp/jam di dalam file? TIDAK ADA
C4 tidak ada nama pembuat/versi aplikasi di file? TIDAK ADA
C4 saldo setelah import=3767223 -> identik dengan sebelum reset? YA (angka uang Round-trip BAGUS)
```

**Catatan positif:** secara **angka uang**, round-trip ternyata benar —
saldo 3.767.223 sebelum reset = 3.767.223 sesudah import, termasuk budget E-Money
(777.777) dan wallet E-Money keluar (777.777). Jadi tidak ada kehilangan nilai.

**Dampak ke pengguna awam:**
Kalau user menyimpan beberapa backup dan Comparing antar file, dia akan melihat
"perubahan" yang sebenarnya artefak normalisasi, dan waste time mencari penyebabnya.
Tanpa timestamp di dalam file, user tidak bisa memastikan backup mana yang benar-benar
terbaru — dan ini justru file yang jadi alat bukti.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Tambahkan nama file dengan waktu: `sppd-backup-2026-10-01-1432.json`.
- Bungkus payload export dengan amplop: `{appVersion, exportedAt, schemaVersion, data: {...}}`
  supaya file backup **self-describing** dan bisa dibandingkan antar versi aplikasi.
- Hilangkan efek samping saat import: pakai `peekSppd()` (BUG-11) supaya
  `export(import(export(x))) === export(x)` benar-benar byte-identical.
- Consider: sertakan checksum/hash isi data supaya file yang korup bisa dideteksi.

---

### [BUG-14] Status item persiapan yang tak dikenal ditimpa jadi "belum" tanpa peringatan — **SEDANG**

**Persona dan use-case:** Data event diimpor dari backup versi lain (atau diedit manual),
dengan status `"sudah-dibawa"`. Aplikasi "memperbaiki" diam-diam.

**Langkah reproduksi:**
1. Ubah `prepItems[*].status` di localStorage menjadi `"sudah-dibawa"` (nilai di luar
   vocabulary aplikasi).
2. Jalankan `importJSON()` dengan data tersebut.

**Harapan:**
Nilai yang tidak dikenal **dipertahankan** atau ditolak dengan pesan, minimal ada
peringatan.-overwrite diam-diam layak dianggap kehilangan data.

**Kenyataannya:**
`importJSON()` dan `load()` sama-sama menjalankan
`DB.prepItems.forEach(function (p) { if (p.status !== 'selesai') p.status = 'belum'; });`
Semua status selain literal `'selesai'` — termasuk `'aktif'`, `'sudah-dibawa'`,
`'dibawa'`, atau typo `'selesai '` (dengan spasi) — **dijejek menjadi `'belum'`.**
Nilai asli hilang permanen, tanpa toast, tanpa log. Setelah import, status yang tersisa:
`{"belum":3}` — semua informasi status sebelumnya hilang.

**Evidence:**
```
C1 prepItem seed status="selesai" | nama="Kabel Rol 5 m"
C1 setelah import dgn status="sudah-dibawa" -> status jadi: {"belum":3}
C1 >>> import/load menimpa nilai status yang tidak dikenal jadi "belum" tanpa warning? YA
```

**Dampak ke pengguna awam:**
Dari sudut pandang user, ini "normalisasi yang membantu". Dari sudut pandang auditor,
ini **kehilangan data tanpa jejak**: nilai yang tidak dikenali kode dianggap tidak valid,
padahal mungkin itu informasi dari versi aplikasi lain atau catatan lapangan. Tidak ada
cara mengetahui bahwa ada data yang ditimpa.

**Ususan perbaikan (deskriptif, jangan diimplementasikan):**
- Normalisasi harus **mempetakan** status yang dikenal secara eksplisit
  (`{todo:'belum', aktif:'berjalan', selesai:'selesai'}`) dan **mempertahankan** nilai
  tak dikenal sambil menambah field `statusAsal`, plus satu toast: "3 item preparation
  punya status yang tidak dikenali dan diubah ke 'belum'."
- Idealnya, `importJSON()` harus melaporkan **ringkasan normalisasi** (jumlah item yang
  diubah, jumlah field yang ditambahkan) sebagai bagian dari hasil import yang
  ditampilkan ke user.

---

### [BUG-15] "Cetak Rekap Global" tidak meng-escape nama event (HTML mentah masuk ke dokumen) — **RENDAH**

**Persona dan use-case:** Nama event berisi `&` atau tanda kutip (mis. "Bazar Ramadan &
Ramadhan 2026"). User mencetak Rekap Global.

**Langkah reproduksi:**
1. Set `events[0].nama = '<img src=x onerror=alert(1)>Uji & "Kutip"'`.
2. Bangun baris tabel dengan pola yang sama seperti `actions.js` `report:global`.
3. Periksa apakah `&`/`<` di-escape.

**Harapan:**
Semua data yang masuk ke HTML dicetak harus melewati `ui.esc()`, seperti yang sudah
benar dilakukan di `printHTML()`.

**Kenyataannya:**
- Di `actions.js` (`report:global`, ~baris 610): `'<td>' + e.nama + '</td><td>' + e.tanggalMulai + '</td>'`
  — **mentah**, tanpa `ui.esc()`. `e.nama` masuk apa adanya ke HTML yang ditulis ke
  jendela cetak.
- Bandingkan `printHTML()` di `pages2.js`: sudah benar memakai `ui.esc(ev.nama)`,
  `ui.esc(ev.lokasi)`, `ui.esc(sppd.noSurat)`, dll.
- Verifikasi: nama event berisi `<img src=x ...>` **masuk apa adanya** ke baris HTML
  global; sementara di `printHTML` yang sama **ter-escape** jadi `&lt;img`.

**Evidence:**
```
A5 nama event mentah: <img src=x onerror=alert(1)>Uji & "Kutip"
A5 masuk apa adanya ke HTML global? YA (TIDAK di-escape)
A5 printHTML event escape <img? YA (esc)
A5 printHTML event escape &lt;? YA
C6 report:global escape nama event? TIDAK - e.nama mentah masuk HTML
```

**Dampak ke pengguna awam:**
Karena datanya lokal (tidak ada server), risikonya kecil — ini bukan serangan dari luar.
Tapi konsekuensi nyata: nama event dengan `&` akan **merusak tampilan tabel** di dokumen
cetak (teks berantakan), dan nama event yang mengandung `<` bisa membuat dokumen cetak
berubah layout atau gagal dirender. Untuk dokumen yang akan diarsipkan/diserahkan, itu
mengganggu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Bungkus semua data dinamis di `report:global` dengan `ui.esc()` — sama seperti
  `printHTML()` sudah lakukan. Ini perbaikan satu baris per kolom.

---

### [BUG-16] Sisa anggaran negatif tampil tanpa penjelasan; format minus tidak konsisten — **RENDAH**

**Persona dan use-case:** Ada pengeluaran yang tidak ada aloksinya. Auditor membaca
kolom "Sisa" dan melihat angka minus tanpa konteks.

**Langkah reproduksi:**
1. Seed utuh → `printHTML(evt-1)`.
2. Lihat baris "Operasional Lain" pada tabel Anggaran vs Realisasi.

**Harapan:**
Baris dengan alokasi 0 dan realisasi > 0 diberi label penjelasan, supaya auditor tahu
ini pengeluaran **di luar rencana**, bukan error perhitungan.

**Kenyataannya:**
Baris `Operasional Lain | alokasi Rp 0 | realisasi Rp 320.000 | sisa Rp -320.000`.
Di layar, `sisa` negatif diberi `style="color:#B91C1C"` (merah) — bagus. Di cetak,
**warna hilang** (cetak hitam-putih) dan hasilnya cuma teks `Rp -320.000`:
- Format minus memakai `-` ASCII, sedangkan dokumen lain memakai `−` (U+2212), dan
  bahkan di dalam satu baris ada dua gaya: tabel Arus Kas memakai `−Rp 205.000`
  dengan prefix, tabel Anggaran memakai `Rp -320.000` dengan suffix.
- Tiga baris budget (`Sewa Transport`, `E-Money`, `Operasional Lain`) punya alokasi 0
  dan tetap dicetak, menambah ruido tanpa nilai informasi.

**Evidence:**
```
A2 BUDGET Operasional Lain | w=Kas alok=0 real=320000 sisa=-320000  <<< SISA NEGATIF
A7 baris budget dengan alokasi=0: 3 -> Sewa Transport,E-Money,Operasional Lain
Cetak: | Operasional Lain | Kas | Rp 0 | Rp 320.000 | Rp -320.000 |
Cetak tabel wallet: | Kas | +Rp 1.730.000 | −Rp 1.935.000 | Rp -205.000 |
A8 sisa budget negatif ditampilkan apa? Rp -320.000
```

**Dampak ke pengguna awam:**
Kecil. Angka sudah benar. Tapi dokumen pertanggungjawaban lebih mudah dibaca kalau
selisih negatif diberi label ("di luar alokasi") dan format minus konsisten.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Tambahkan label/keterangan eksplisit pada baris dengan alokasi 0 dan realisasi > 0
  (mis. "tanpa alokasi — pengeluaran di luar rencana"), dan pertahankan penanda warna
  lewat simbol (mis. `⚠` atau `[!]`) supaya tetap terbaca saat dicetak hitam-putih.
- Samakan gaya penandaan negatif di seluruh dokumen: satu helper `fmtNegatif(n)` yang
  selalu memakai karakter dan posisi yang sama.
- Baris dengan alokasi 0 **dan** realisasi 0 boleh disembunyikan dari cetak untuk
  mengurangi halaman kosong.

---

### [BUG-17] `save()` bisa melempar error di luar `try` saat DB belum termuat — **RENDAH**

**Persona dan use-case:** Edge case — kode store dipanggil sebelum `load()` selesai.
Tidak terjadi lewat UI normal, tapi saya temukan saat menulis harness.

**Langkah reproduksi:**
1. Muat `store.js` saja, **tanpa** memanggil `load()`.
2. Panggil `SPT.store.save()`.

**Harapan:**
`save()` aman dipanggil kapan saja.

**Kenyataannya:**
`save()` dimulai dengan `normWallets(DB); normBudgetWallet(DB);` **di luar** blok
`try`, lalu baru `try { localStorage.setItem(...) } catch ...`. Kalau `DB` masih `null`
(belum ada `load()`), `normWallets(null)` langsung melempar
`Cannot read properties of null (reading 'sales')` — error **tidak** ditangkap,
`try/catch` yang ada tidak berguna untuk kasus ini. Saya mengalami ini di harness
karena `store.save()` dipanggil tanpa `load()` lebih dulu.

**Evidence:**
```
C5 src save(): function save() { normWallets(DB); normBudgetWallet(DB);
   try { localStorage.setItem(KEY, JSON.stringify(DB)); }
   catch (e) { A.toast('Gagal menyimpan ke localStorage', 'error'); } }
C5 normWallets dipanggil di save SEBELUM try -> kalau DB null, lempar error di luar try? YA (risiko)
Error aktual saat dijalankan: Cannot read properties of null (reading 'sales')
   at normWallets (js/store.js:21:9)
```

**Catatan:** `save()` juga **tidak punya rollback**. Kalau `setItem` gagal (mis. quota
penuh), toast muncul tapi DB di memori sudah berubah — jadi angka di layar menunjukkan
nilai baru sementara yang tersimpan masih nilai lama. Setelah refresh, perubahan hilang
tanpa penjelasan.

**Dampak ke pengguna awam:**
Tidak terjadi lewat UI normal (semua `save*` memanggil `load()` lebih dulu). Yang
user bisa saja melanjutkan dan mengira datanya sudah aman.
user bisa saja tetap melanjutkan dan mengira datanya sudah aman.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Pindahkan `normWallets`/`normBudgetWallet` ke dalam `try`, dan panggil `load()` di
  awal `save()` supaya `DB` tidak pernah `null`.
- Saat `setItem` gagal, beri pesan yang lebih jujur: "Perubahan BELUM tersimpan.
  Penyimpanan browser penuh.Backup data lalu kosongkan ruang." — dan tawarkan
  otomatis unduh backup sebagai lifeline.

---

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Angka inti konsisten dengan formula yang didokumentasikan.** Saya verifikasi
  `2.500.000 + 3.480.000 + 475.000 − 1.910.000 = 4.545.000` — persis sama dengan
  `financeSummary().saldo`. Aritmetika bersih, tidak ada pembulatan mengambang.
- **Total baris tabel Anggaran benar-benar dihitung dari baris, bukan hardcode.**
  `totalRealisasi` = 1.910.000 = jumlah `pengeluaran` (transport + expense). Saya juga
  tes kasus E-Money (500.000 dibayar e-money) dan totalnya tetap cocok.
- **Round-trip export/import mempertahankan semua nilai uang dengan benar.** Saya tambahkan
  expense 777.777 wallet E-Money, reset, lalu import: saldo 3.767.223 → 3.767.223, budget
  E-Money realisasi 777.777 → 777.777, wallet E-Money keluar 777.777 → 777.777. Tidak ada
  rupiah yang hilang. Ini penting dan sering rusak di prototype lain.
- **Validasi import sudah ada SOME entry point.** `Array.isArray(obj.events)` +
  pesan error dalam bahasa manusia ("Format backup tidak dikenali: bukan file backup SPPD
  Toolbox.") sudah menolak 4 dari 8 kasus file rusak dengan pesan yang benar. Yang hilang
  hanya validasi koleksi lanjutan dan rollback (BUG-01).
- **`printHTML()` meng-escape dengan benar.** Semua data dinamis melewati `ui.esc()`:
  nama event, lokasi, no surat, tujuan, kegiatan, deskripsi expense, kategori, rute
  transport. Field tambahan kustom pun ikut terbawa ke export (`notes` kustom tetap ada
  di JSON) — jadi forward-compatible.
- **`print:open` sudah punya jalur cadangan saat popup diblokir**: iframe `srcdoc` +
  tombol "Cetak" terpisah. Ini pola yang benar dan **seharusnya dicontoh oleh
  `report:global`** (BUG-12) — sudah ada referensi implementasinya di codebase yang sama.
- **Hapus yang memang berisiko besar sudah dikonfirmasi**: `event:delete` ("Semua data
  SPPD, produk, penjualan & keuangan event ini ikut terhapus"), `product:delete`
  ("Produk ikut terhapus dari checklist & penjualan event"), `master:catdel`,
  `data:reset`.-copy-paste teks konfirmasi ini bagus — tinggal diperluas cakupannya.
- **`normWallets()` + `normBudgetWallet()` menjaga data lama tetap bisa dibaca** saat
  versi aplikasi berubah (mis. `sales` versi lama tanpa kolom `wallet`). Arahnya benar;
  yang kurang adalah validasi input (BUG-08) dan pelaporan normalisasi (BUG-14).
- **`budgetRealisasi()` punya aturan yang jelas dan terdokumentasi** (mapping kategori
expense ke pos budget, memetakan "Akomodasi" ke "Penginapan"), termasuk keputusan sadar bahwa
  E-Mony tidak dijumlahkan ke total agar tidak dobel hitung — dan keputusan itu **benar**,
  sudah saya buktikan secara numerik (D3).
- **Struktur data sudah dekat dengan kebutuhan GAS/Supabase** — `userId` sudah ada di
  `events`, `products`, `checklistItems`, `itemCats`, `itemTemplates`. Menambah `auditLog`
  dengan pola yang sama akan terasa natural.

---

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah "Backup ke File" diuji pernah gagal diam-diam?** Saya tidak bisa menguji
  `Blob` + `URL.createObjectURL` + `a.click()` di headless (tidak ada user gesture /
  download manager). Perlu konfirmasi manual: apakah file yang terunduh benar-benar
  berisi seluruh data, dan apakah nama file berduplikasi saat dua backup di hari sama?
- **Apakah `data:reset` benar-benar pulih dari amnesia?** Saya tes `resetData()` beberapa
  kali dan hasilnya konsisten (9 event, saldo 4.545.000). Tapi `resetData()` hanya
menulis seed ke localStorage - **tidak** membersihkan data di luar `KEY`. Perlu konfirmasi
  apakah ada data lain di luar `sppd_toolbox_db_v2`.
- **Beberapa angka seed terlihat "sengajapagination" untuk baris budget 0** (`Sewa Transport`,
  `E-Money`, `Operasional Lain` dengan alokasi 0). Ini keputusan desain atau sisa? Kalau
  disengaja, baik; kalau tidak, mungkin alokasi yang hilang saat seed dibuat.
- **BUG-04 (dua angka saldo) - perlu konfirmasi mana yang benar.** Apakah tabel
  Arus Kas per Wallet **seharusnya** memuat Dana Awal sebagai saldo awal? Kalau iya,
  BUG-04 adalah bug tampilan yang harus diperbaiki. Kalau tidak (memang Dana Awal
  dianggap "dana institutes yang belum masuk rekening"), maka tabelnya perlu label
  yang berbeda supaya tidak disalahpahami.
- **BUG-05 — perlu konfirmasi Welcome yang dimaksud.** Apakah "Realisasi per Wallet
  Tujuan" memang dimaksudkan berbeda dari "Arus Kas per Wallet"? Kalau ya, judulnya
  perlu diperjelas. Kalau tidak, itu bug perhitungan yang serius.
- **Apakah `E3` (hapus `sal-2`) mengubah angka global dengan benar?** Ya — turun 1.050.000
  di penjualan dan saldo. Konsisten. Tapi saya tidak menemukan **mekanisme pemulihan**
  apa pun; perlu konfirmasi apakah ada roadmap untuk undo.
- **Saya tidak bisa verifikasi tampilan visual cetakan** (brief menyatakan screenshot
tidak terbaca). Jadi, apakah dokumen 4.896 karakter itu muat rapi di 1 halaman A4
  atau terpotong antar halaman. Perlu cetak fisik / PDF nyata untuk menilai. Yang bisa
  saya pastikan: **tidak ada `@page`**, jadi margin & orientasi sepenuhnya default browser
  dan bisa berbeda antar printer — ini risiko nyata untuk dokumen formal.
- **Tidak diuji:** perilaku multi-tab (dua tab Edge terbuka, satu `save()` menimpa yang
  lain), dan perilaku saat localStorage dimodifikasi dari luar aplikasi (mis. oleh
  Ekstensi). Keduanya di luar cakupan headless.

---

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| **Keberadaan jejak audit** | **1** | Tidak ada sama sekali. 0 dari 16 key DB, 0 dari 75 fungsi API, 0 halaman. Tidak ada `createdAt`/`updatedAt` pada 9 dari 12 koleksi. Angka lama 1.250.000 hilang tanpa jejak saat diubah jadi 4.995. |
| **Bukti siapa & kapan di dokumen cetak** | **1** | Tidak ada tanggal/jam cetak, tidak ada NIP (field-nya memang tidak ada), tidak ada nomor halaman, satu blok TTD tanpa nama/jabatan, status approval SPPD tidak tercetak. |
| **Konsistensi internal angka** | **3** | Aritmetika benar dan round-trip uang sempurna. Tapi dokumen yang sama menampilkan dua angka saldo berbeda (BUG-04) dan dua angka "realisasi per wallet" berbeda (BUG-05). |
| **Kelengkapan laporan cetak vs layar** | **2** | 5 dari 8 blok layar hilang di cetak, termasuk Rekap Produk & Qty dan Rekap Item Persiapan — justru blok yang paling dibutuhkan untuk memverifikasi barang. |
| **Kes meantime hapus data** | **2** | 4 dari 16 aksi hapus punya konfirmasi; 12 lain — termasuk seluruh transaksi uang — tidak. Tidak ada undo. Toast succes membuat user merasa aman. |
| **Ktextscoring keseluruhan** | **2** | 80.243 byte data bisa hilang permanen lewat satu klik "Pulihkan dari File" (BUG-01). Untuk persona auditor, ini menutup escalar: aplikasi ini **tidak dapat dipakai sebagai alat bukti**. |
| **Rapikan kode & verifikasi numerik** | **4** | Aritmetika bersih, `printHTML` sudah escape dengan benar, validasi import ada SOME entry, struktur data sudah dekat GAS/Supabase, `print:open` sudah punya pola fallback yang benar. Fondasinya bagus — yang belum ada lapisan auditnya. |

**Catatan penutup untuk tim produk:** semua temuan TINGGI/KRITIS di sini bukan karena
kodenya buruk secara teknis, melainkan karena **satu lapisan saja yang belum dibangun**:
catatan siapa mengubah apa. Kalau `auditLog` ditambahkan di `store.save()`, BUG-02,
setbagian BUG-03, dan fear terbesar BUG-01 (pengguna bisa melihat "data 9 event terakhir
disimpan sebelum import") bisa ikut tertutup. Prioritas saya: **BUG-01 → BUG-02 →
BUG-04/BUG-05 → BUG-06**, sisanya polish.

---

*Catatan QA internal — AGENT-05 (Auditor). Semua aplikasi read-only; harness di
`_QA_TMP/a05*.html`. Angka berasal dari 6 run Edge headless dengan profil unik dan
`localStorage.clear()` di setiap awal.*
