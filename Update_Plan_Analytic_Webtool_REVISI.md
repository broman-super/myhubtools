# Update Plan (Revisi) — Dashboard SAS (Sales Analytic Simplify)
**Dasar revisi:** Membandingkan `Rencana_Update_plan_analytic_Webtool.md` (rencana awal) dengan `artifac_analytic.md` (hasil pembacaan kode nyata `Analytic.html` + `code-analytic.gs`).

**Kesimpulan utama:** Rencana awal disusun dengan asumsi backend **belum punya** data HPP/Biaya sama sekali, sehingga mengusulkan sheet-sheet baru dari nol. Faktanya, backend **sudah punya** struktur untuk HPP (tab `Produk`, kolom `HPP`) dan Biaya (tab `Biaya`), lengkap dengan endpoint GAS (`addBiaya`) dan formula Laba/Margin/Opex yang **sudah benar secara logika** (`prosesData()` L2457-2462). Kartu-kartu terlihat "menyesatkan" (Laba = Omzet, Margin 100%) kemungkinan besar karena **datanya kosong/belum diisi**, bukan karena logikanya salah — meskipun ada satu bug nyata: sistem tidak membedakan "produk belum ada di master" vs "HPP memang 0", sehingga tampil seolah margin sempurna.

Dokumen ini membagi ulang rencana jadi 4 bagian:
1. **Koreksi asumsi** — apa yang sebenarnya sudah ada vs yang rencana awal kira belum ada
2. **Struktur data** — penyesuaian ke skema nyata (bukan sheet baru dari nol)
3. **Logic perhitungan per kartu** — direvisi sesuai kode yang sudah jalan
4. **Roadmap prioritas** — diurutkan ulang berdasarkan effort riil (data-entry vs dev-work)

---

## 0. KALIBRASI (2026-08-05) — Sudah Dieksekusi

### 0.1 Auto-Provision Tab GAS (solusi tab kosong/tidak ditemukan)
- `gscode/code-analytic.gs` kini punya `TAB_HEADERS_()` (sumber tunggal header per tab) dan `pastikanTabAda_(ss, nama)`.
- `getAllDashboardData()` memanggil `pastikanTabAda_` untuk 4 tab (`Transaksi`, `Produk`, `Biaya`, `Settings`) sebelum baca data → tab yang **tidak ada ATAU kosong** otomatis dibuat dengan header standar.
- Bila terjadi pembuatan tab → cache GAS `dash_data_v2` ikut di-invalidasi supaya tidak menyajikan data lama.
- `saveTarget` & `addBiaya` di-refactor memakai `TAB_HEADERS_()` yang sama → tidak ada lagi drift header hardcoded (ini menutup gap "auto-create header addBiaya L88-91" dari review).

### 0.2 Keputusan User — Alasan Retur DITUNDA
- Kolom `Alasan Retur` (§2.3) **tidak dibutuhkan untuk sementara**. Seluruh turunannya dibatalkan/ditunda: roadmap item #4 lama, §3.5 breakdown alasan retur, dan perubahan `TARGET_COLUMNS`/`findColIndex` untuk kolom itu. `Transaksi` tidak perlu disentuh terkait ini.

### 0.3 Catatan Anti-Error (wajib dipatuhi saat implementasi berikutnya)
1. **Bump cache localStorage `intel_pro_cache_v3` → `v4`** setiap kali SKEMA sheet berubah (tambah kolom `Channel`, nanti `Stok`, dll). Cache ini dipakai fallback offline; tanpa bump, data lama yang tanpa kolom baru tampil diam-diam. Cache GAS `dash_data_v2` saja tidak cukup.
2. **Null-HPP (roadmap #3) butuh flag `hppKnown` yang di-carry penuh**: agregasi memakai `b.totalHpp || 0` (`Analytic.html:2313`) dan margin Top Produk pakai `d.cogs` agregat (`:2746`) — info "belum terdaftar"/"HPP belum diisi" hilang di agregasi. Flag harus dibawa `olahDataMentah` → `rekapProdukDetail` → render.
3. **Lokasi lookup HPP per-transaksi = `Analytic.html:1723-1724`** (bukan 1699-1713 — itu parsing katalog).
4. **Nama tab baru (Stok) harus literal `Stok`** — `getAllDashboardData` baca string persis (komentar di GAS menegaskan huruf besar).
5. **README analytic §2.2** sudah disinkronkan ke SW `reynahub-v4` (network-first) — jangan kembalikan ke v3.



## 1. Koreksi Asumsi: Rencana Awal vs Kenyataan Kode

| Asumsi di rencana awal | Kenyataan di webtool (`artifac_analytic.md`) | Dampak ke rencana |
|---|---|---|
| Backend baru punya `Transaksi Penjualan` & `Transaksi Retur` (2 sheet terpisah) | Hanya **1 tab** `Transaksi`; retur dibedakan lewat kolom `Tipe Transaksi` mengandung "retur"/"kembali" (§3.6) | Kolom baru (mis. `alasan_retur`) harus masuk ke tab `Transaksi`, bukan bikin sheet "Transaksi Retur" baru |
| HPP/COGS **belum ada sama sekali** → perlu sheet `Master_HPP` baru | Tab `Produk` **sudah ada** kolom `HPP` (dibaca `getAllDashboardData()`, dipakai `hppSatuan × qty` di `totalHpp`, L1755) | Tidak perlu sheet baru — cukup **isi kolom HPP** yang sudah ada di tab `Produk`, plus tambah mekanisme periodisasi (lihat §2.1) |
| Biaya operasional **belum ada** → perlu sheet `Biaya_Operasional` baru | Tab `Biaya` **sudah ada** (`Tanggal`, `Kategori Biaya`, `Nominal`), plus endpoint `addBiaya` dan form input (Modal Expense) sudah jalan di frontend | "Radar Kebocoran Biaya" kosong karena **belum ada data**, bukan karena fitur belum dibangun. Cukup mulai input rutin |
| `Laba Bersih = Omzet` (bug formula) | Formula sudah benar: `netProfit = grossProfit − totalBiaya`, `grossProfit = netSales − cogs` (L2457-2459) | Bukan bug logika — kalau tetap terlihat `Laba = Omzet`, itu tanda `cogs` dan `totalBiaya` = 0 karena data HPP/Biaya kosong |
| Margin default 100% saat HPP kosong (dianggap bug tampilan) | **Ini bug nyata**: produk yang tidak ketemu di katalog (atau HPP-nya blank) jatuh ke fallback `{hpp:0}` (L1723 area, `infoProduk` fallback), bukan ditandai "N/A" | Perlu **perbaikan kode**, bukan cuma isi data — lihat §3.2 |
| CAC = Rp 0 (dianggap belum dihitung) | CAC **sudah dihitung**: `CAC = totalBiaya / pelangganBaru` (L2592), tapi versi **agregat total**, bukan per channel/kategori iklan | Yang perlu dibangun bukan CAC dari nol, tapi **breakdown per channel** |
| Progress Menuju Target = kartu baru dari nol | Sudah ada logic setara: `runRate`, `staticRunRate`, badge "TARGET TEMBUS"/"Defisit", diagnostik #1 "Target Projection" (§3.8 tabel poin 1) | Ini lebih ke **penataan UI (progress bar/gauge)**, bukan logic baru — effort lebih kecil dari perkiraan awal |
| Market Share = dasar untuk "channel" (TikTok/Shopee/Reseller) | Dimensi channel yang benar-benar ada di data cuma **Kategori Pelanggan** (`RESELLER` vs `UMUM`/marketplace, lihat `rekapReseller`/`rekapMarketplace` L2647-2731) — **tidak ada** kolom platform iklan/marketplace eksplisit di `Transaksi` | Rencana ROI/CAC "per channel iklan" (TikTok, Shopee, dst.) **butuh kolom channel baru** di `Transaksi` DAN di `Biaya` — datanya belum tersedia di dua sisi, bukan cuma satu |
| LTV sekarang "1 angka statis (18.3 pcs)" | Tidak ditemukan metrik LTV eksplisit di kode. Yang ada: Basket Intelligence (`UPT`, `avgRsl`, `avgOth`) dan RFM VIP (frekuensi & recency per pelanggan, badge SULTAN/AWAS KABUR, L2647-2731) | LTV tren memang genuinely belum ada — tapi sebaiknya dibangun **di atas** data RFM yang sudah ada, bukan dari nol |
| Sheet `Master_Stok` opsional, kerja paling akhir | Tidak ada tab stok sama sekali di 4 tab yang dibaca (`Transaksi`, `Produk`, `Biaya`, `Settings`) | Konfirmasi genuinely belum ada — urutan prioritas paling akhir tetap masuk akal |

---

## 2. Struktur Data — Penyesuaian ke Skema Nyata

Prinsip revisi: **jangan bikin sheet paralel baru untuk hal yang sudah ada tabnya.** GAS (`getAllDashboardData()`, `ambilDataDariSheet()`) sudah dikunci ke 4 nama tab persis: `Transaksi`, `Produk`, `Biaya`, `Settings`. Menambah sheet baru di luar itu berarti menambah kode baca-tulis baru juga di GAS — effort lebih besar dari sekadar menambah kolom di tab yang sudah dibaca.

### 2.1 Tab `Produk` (bukan `Master_HPP` baru) — tambah periodisasi HPP
Saat ini kolom `HPP` di tab `Produk` cuma 1 nilai statis per produk (tidak ada rentang tanggal), sehingga histori laba akan ikut berubah kalau HPP diupdate. Dua opsi, urutkan dari effort kecil ke besar:

**Opsi A (cepat, tanpa ubah struktur tab):** tetap 1 tab `Produk`, tapi izinkan **baris duplikat per `Nama Barang`** dengan kolom tambahan `Tgl Berlaku Mulai` / `Tgl Berlaku Selesai`. GAS `ambilDataDariSheet()` sudah baca semua baris jadi array objek — tinggal ubah logic katalog di `olahDataMentah()` (frontend, L1699-1713) supaya saat lookup HPP per transaksi, pilih baris yang `tgl_berlaku_mulai <= tgl_transaksi <= tgl_berlaku_selesai`, bukan ambil baris terakhir/pertama begitu saja.

**Opsi B (lebih rapi, effort lebih besar):** sheet terpisah `Produk_HPP_Histori` khusus histori harga (mirip usulan awal `Master_HPP`), sementara tab `Produk` tetap jadi kamus nama/series/kategori. Ini butuh tambahan kode baca di `getAllDashboardData()` GAS + logic gabung di frontend.

> Rekomendasi: mulai Opsi A dulu (tidak nambah tab, cukup kolom + logic lookup), baru pindah ke Opsi B kalau volume perubahan harga sudah tinggi.

### 2.2 Tab `Biaya` (bukan `Biaya_Operasional` baru) — tambah kolom `Channel`
Tab `Biaya` sudah punya `Tanggal`, `Kategori Biaya`, `Nominal`. Tambah 1 kolom:

| Kolom baru | Tipe | Contoh | Keterangan |
|---|---|---|---|
| `Channel` | text | TikTok / Shopee / Reseller / Umum | dropdown, harus konsisten dengan nilai `Nama Kategori Pelanggan` di tab `Transaksi` supaya bisa di-join |

Perubahan backend: `addBiaya` di `doGet` (L79-97) perlu terima parameter `channel` tambahan dan tulis ke kolom baru; datalist OPEX di frontend (`saveExpenseToGAS`, L3213-3260) perlu field channel di form modal.

> **Catatan penting:** karena `Transaksi` **tidak** punya kolom platform iklan eksplisit (TikTok/Shopee sebagai baris jualan), "Channel" di sini realistisnya dipetakan ke dimensi yang sudah ada: `Nama Kategori Pelanggan` (Reseller vs Umum/Marketplace). Kalau mau breakdown sampai level platform iklan (TikTok Ads vs Shopee Ads), kolom `Channel` di `Biaya` bisa diisi granular, tapi sisi **pendapatan**-nya (`Transaksi`) tidak akan bisa dipecah sampai level itu tanpa tambah kolom `Channel`/`Platform` juga di `Transaksi` — ini effort tambahan yang tidak disebut di rencana awal.

### 2.3 Tab `Transaksi` — tambah kolom `Alasan Retur`
Bukan sheet "Transaksi Retur" terpisah (itu tidak ada). Tambah 1 kolom opsional yang hanya diisi kalau `Tipe Transaksi` = retur:

| Kolom baru | Tipe | Contoh |
|---|---|---|
| `Alasan Retur` | text (dropdown) | Cacat Produk / Salah Ukuran / Salah Kirim / Berubah Pikiran / Lainnya |

Dampak kode: `TARGET_COLUMNS` di alur upload Excel (L3305-3318) dan `findColIndex`/`findExcelValue` (GAS, L448-470) perlu tambah 1 kandidat kolom baru; validasi backend `bulkUpsertTransactions` (L243-264) tidak perlu berubah karena kolom ini opsional (boleh kosong untuk baris non-retur).

### 2.4 Sheet baru yang genuinely dibutuhkan: `Stok`
Ini satu-satunya sheet benar-benar baru yang perlu ditambah (tidak ada padanan tab existing):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id_produk` / `Nama Barang` | text | key ke tab `Produk`, harus konsisten uppercase seperti lookup katalog lain |
| `Stok Tersedia` | number | |
| `Reorder Point` | number | |

Butuh: tambahan di `getAllDashboardData()` GAS (baca tab ke-5), tambahan endpoint tulis (mis. `updateStok`), dan tambahan logic join di frontend.

### 2.5 Ringkasan Perubahan Struktur

| Perubahan | Jenis | Sheet/tab terdampak |
|---|---|---|
| Isi kolom `HPP` yang sudah ada | Data-entry murni | `Produk` |
| Periodisasi HPP (Opsi A) | Kolom baru + logic lookup | `Produk` |
| Isi data `Biaya` rutin | Data-entry murni | `Biaya` |
| Kolom `Channel` di Biaya | Kolom baru + form + endpoint | `Biaya` |
| Kolom `Alasan Retur` | Kolom baru + mapping upload | `Transaksi` |
| Tab `Stok` | Sheet baru + endpoint baru | baru: `Stok` |

---

## 3. Logic Perhitungan per Kartu — Direvisi

### 3.1 Laba Bersih & Margin Kesehatan Keuangan — **tidak perlu perbaikan formula**
`netSales`, `grossProfit`, `netProfit`, `netMargin`, `opexRatio` semua sudah benar di `prosesData()` (L2457-2462). **Tidak ada pekerjaan dev di sini.** Yang perlu dilakukan hanya §2.1 dan §2.2 (isi data), lalu angka-angka ini otomatis benar dengan sendirinya.

### 3.2 Margin Produk — **ini perlu perbaikan kode (bug nyata)**
Saat ini: produk yang tidak ketemu di katalog `Produk` jatuh ke fallback `{hpp:0}`, dan produk yang ketemu tapi kolom `HPP`-nya kosong kemungkinan juga terbaca `0` setelah regex cleanup. Dua kasus ini **tidak dibedakan** dari "HPP memang sengaja 0" — akibatnya margin tampil 100% padahal datanya belum lengkap.

**Perbaikan yang perlu dilakukan (di `olahDataMentah()` dan tabel Top Produk, sekitar L1699-1757 & L2734-2770):**
```
Jika produk TIDAK ada di katalog Produk     → tandai hppSatuan = null, label "Produk Belum Terdaftar"
Jika produk ADA di katalog TAPI kolom HPP kosong/0 secara eksplisit → tandai hppSatuan = null, label "HPP Belum Diisi"
Margin (%) = hppSatuan === null ? "N/A" : ((Harga Jual − HPP) / Harga Jual) × 100
```
Ini satu-satunya perubahan formula yang genuinely dibutuhkan dari seluruh usulan rencana awal — sisanya (2.1–2.3 di rencana awal) sudah otomatis benar begitu data terisi.

### 3.3 Progress Menuju Target — sudah ada logic-nya, tinggal UI
Data yang dibutuhkan (`runRate`, `staticRunRate`, `kpiSalesPct`, gap/defisit, diagnostik #1 "Target Projection") **sudah dihitung**. Pekerjaan yang tersisa murni presentasi: render sebagai gauge/progress bar, tambahkan label "Kecepatan Dibutuhkan" (`Sisa Target / Sisa Hari`) yang belum ada sebagai output eksplisit — ini satu-satunya angka baru yang perlu ditambah ke `prosesData()`.

### 3.4 CAC per Channel & ROI per Channel — genuinely butuh dev + data baru
CAC agregat sudah ada (L2592) tapi pembaginya `totalBiaya` (semua kategori biaya, bukan cuma Ads) — perlu difilter `Kategori Biaya = Ads` dulu supaya CAC akurat secara definisi. Breakdown per channel baru bisa dibangun **setelah** kolom `Channel` di §2.2 terisi, dan idealnya juga setelah `Transaksi` punya dimensi channel yang sepadan (lihat catatan di §2.2). ROI per channel (`(Omzet − HPP − Biaya Ads) / Biaya Ads`) juga baru bisa dihitung akurat kalau omzet & HPP bisa dipecah per channel yang sama.

> Realistis: kalau channel yang dipakai hanya Reseller vs Marketplace (dimensi yang sudah ada di `Nama Kategori Pelanggan`), CAC/ROI per channel bisa dibangun lebih cepat karena sisi omzetnya sudah kepecah (`rekapReseller`/`rekapMarketplace`). Kalau mau granular sampai TikTok/Shopee, effort naik karena `Transaksi` perlu kolom channel baru juga.

### 3.5 Breakdown Alasan Retur — genuinely baru, tapi kecil
Setelah kolom `Alasan Retur` (§2.3) ada, tinggal agregasi count per alasan dari baris retur yang sudah difilter (`isRetur`, L2304-2309) dan render donut/bar kecil di sebelah `kpiRetur` (L2580-2583). Effort kecil, murni frontend, tidak sentuh GAS kecuali mapping kolom upload.

### 3.6 Tren LTV — bangun di atas data RFM yang sudah ada
Karena tidak ada metrik LTV statis untuk digantikan (koreksi asumsi rencana awal), definisikan dari awal berbasis data yang sudah dihitung di RFM VIP (L2647-2731):
```
LTV Periode = Total Omzet per Pelanggan Reseller (dari rekapReseller) / Jumlah Pelanggan Reseller Aktif Periode itu
```
Plot sebagai sparkline di kartu Basket Intelligence (`#basketIntel`, L2602-2645) — nama kartu di kode adalah "Basket Intelligence", bukan "Intelijen Keranjang & CAC" seperti disebut rencana awal (kemungkinan nama tampilan UI berbeda dari nama variabel; cek label aktual di HTML sebelum implementasi).

### 3.7 Status Stok/Inventori — sesuai rencana awal, tambah cek konsistensi key
Setelah tab `Stok` (§2.4) dibangun, alert kritis bisa disambung ke `rekapProdukDetail`/`rekapTrendProd` yang sudah ada untuk momentum, sama seperti usulan awal. Pastikan key `id_produk`/`Nama Barang` dinormalisasi uppercase-trim sama seperti lookup katalog Produk lain (L1699-1713) — kalau tidak, join akan diam-diam gagal seperti risiko yang disebut di §1.4 rencana awal.

### 3.8 Insight Positif — genuinely baru, effort kecil
Tidak butuh data baru. Bisa dibangun dari data yang sama dipakai `jalankanDiagnosaLokal()` (10 pengecekan warning, L2992-3154) — cukup tambah pengecekan versi positif (produk momentum tertinggi & retur rendah, hari kontribusi tertinggi dari `rekapHari`, kategori/channel growth tertinggi dari `rekapKat`) dan render di kartu terpisah warna hijau, terpisah dari `#localWarningBox` supaya tidak tercampur growth 10 warning yang semuanya merah/kuning.

---

## 4. Perubahan Backend GAS yang Genuinely Dibutuhkan

Aksi GAS yang sudah ada (`getSalesData`, `saveTarget`, `addBiaya`, `getAnalysis`, `bulkUpsertTransactions`) **tidak perlu diganti**, tapi beberapa perlu diperluas:

| Aksi | Perubahan | Alasan |
|---|---|---|
| `addBiaya` | Terima & tulis parameter `channel` | §2.2 |
| `bulkUpsertTransactions` | Tambah kandidat kolom `Alasan Retur` di `findColIndex`/`TARGET_COLUMNS` | §2.3 |
| *(baru)* `updateStok` | Endpoint baru: tulis/upsert ke tab `Stok` | §2.4 |
| `getAllDashboardData()` | Tambah baca tab `Stok` ke-5 | §2.4 |
| — | Semua penulisan baru **wajib** invalidasi cache `dash_data_v2` (pola yang sudah konsisten dipakai di `saveTarget`/`addBiaya`, L338) | konsistensi arsitektur existing |

Tidak perlu endpoint baru untuk HPP kalau pakai Opsi A (§2.1) — cukup edit manual di sheet `Produk` seperti sekarang, karena tidak ada UI form untuk edit katalog produk (beda dengan Biaya yang sudah ada Modal Expense). Kalau volume edit HPP tinggi, baru worth it bikin endpoint `updateProduk`.

---

## 5. Roadmap Prioritas (Revisi — dipisah Data-Entry vs Dev-Work)

| Prioritas | Item | Jenis Kerja | Effort | Kenapa |
|---|---|---|---|---|
| 1 | Isi kolom `HPP` di tab `Produk` untuk 20 produk teratas | **Data-entry murni** | Kecil | Tidak butuh kode sama sekali — begitu terisi, Laba Bersih/Gross Profit/Net Profit otomatis benar |
| 2 | Mulai input rutin ke tab `Biaya` (kategori Ads & Ongkir dulu) | **Data-entry murni** | Kecil | Form-nya (Modal Expense + `addBiaya`) sudah jalan, tinggal dipakai |
| 3 | Fix bug fallback HPP (§3.2) — bedakan "belum terdaftar" vs "HPP 0" | **Dev — bug fix** | Kecil-Sedang | Satu-satunya bug logika nyata dari seluruh temuan; tanpa ini, margin tetap menyesatkan meski data sudah diisi |
| 4 | Insight Positif (§3.8) | **Dev — logic only** | Kecil | Tidak butuh data baru, pakai ulang data diagnostik yang sudah ada |
| 5 | Progress Menuju Target sebagai gauge UI (§3.3) | **Dev — UI only** | Kecil | Logic sudah ada (`runRate`, dsb.), tinggal render + 1 angka baru (Kecepatan Dibutuhkan) |
| 6 | Periodisasi HPP — Opsi A (§2.1) | **Dev — kolom + logic lookup** | Sedang | Supaya histori laba tidak berubah saat HPP produk berubah |
| 7 | Kolom `Channel` di `Biaya` + CAC per channel (filter Ads dulu) (§2.2, §3.4) | **Dev — kolom + form + logic** | Sedang | Sebaiknya mulai dari dimensi yang sudah ada (Reseller/Marketplace) sebelum granular ke platform iklan |
| 8 | ROI per Channel (§3.4) | **Dev — logic** | Sedang | Bergantung pada item 7 selesai duluan |
| 9 | Tren LTV berbasis RFM (§3.6) | **Dev — logic + chart** | Sedang | Nice-to-have, dibangun di atas data RFM yang sudah ada |
| 10 | Tab `Stok` + endpoint `updateStok` + Status Stok (§2.4, §3.7) | **Dev — sheet baru + endpoint** | Besar | Satu-satunya sheet benar-benar baru; butuh disiplin update stok manual/otomatis |
| ~~4~~ | ~~Alasan Retur + breakdown chart (§2.3, §3.5)~~ | **DITUNDA** (keputusan user 2026-08-05) | — | Kolom belum dibutuhkan; §2.3 dan §3.5 nonaktif sampai dinyatakan perlu |

**Perbedaan paling signifikan dari roadmap awal:** item #1 dan #2 di roadmap awal ("bikin sheet `Master_HPP`" dan "bikin sheet `Biaya_Operasional`") berubah dari **pekerjaan development** menjadi **pekerjaan data-entry murni**, karena sheet-nya sudah ada. Ini seharusnya memangkas waktu implementasi tahap awal secara signifikan. Effort dev yang sebelumnya dialokasikan ke situ bisa dialihkan ke item yang genuinely butuh kode: fix bug margin (#3) dan periodisasi HPP (#6).

**Catatan roadmap per 2026-08-05:** item Alasan Retur dihapus dari urutan aktif (ditunda), sehingga prioritas di atas sudah renumber. Tab `Produk`/`Biaya`/`Transaksi`/`Settings` sekarang otomatis dibuat bila hilang/kosong oleh GAS (§0.1) — jadi tidak ada lagi skenario "data tidak ketemu karena tab belum dibuat".

---

## 6. Catatan Praktis Pendataan (masih berlaku, sedikit disesuaikan)

1. **Jangan isi HPP semua produk sekaligus.** Mulai dari 20 produk teratas di tab `Produk` yang sudah ada — kolomnya sudah tersedia, tidak perlu sheet baru.
2. **HPP boleh estimasi dulu.** Karena belum ada periodisasi (sebelum item #6 di roadmap selesai), ingat bahwa **mengubah HPP sekarang akan ikut mengubah histori laba masa lalu** — ini efek samping dari belum adanya rentang tanggal. Kalau mau mulai isi HPP sebelum periodisasi dibangun, sadari trade-off ini dulu.
3. **Biaya operasional cukup dicatat mingguan** lewat form Modal Expense yang sudah ada (`addBiaya`) — tidak perlu tunggu kolom `Channel` selesai dibangun untuk mulai mencatat total ads + ongkir + packing.
4. **Kalau sumber HPP tidak seragam**, pakai rata-rata tertimbang (weighted average) per periode — poin ini baru relevan begitu periodisasi (item #6) selesai; sebelum itu, sistem hanya menyimpan 1 angka HPP terkini per produk.
5. **Konsistensi key wajib dijaga**: `Nama Barang` di `Transaksi` harus sama persis (uppercase-trim) dengan `Nama Barang`/`id_produk` di `Produk`, dan nanti di `Stok` — kalau tidak, lookup akan diam-diam fallback ke default tanpa error yang terlihat (perilaku ini sudah dikonfirmasi ada di kode, L1723 area).

---

## 7. Log Pembaharuan (2026-08-05)

| # | Perubahan | File | Status |
|---|---|---|---|
| 1 | Auto-provision tab: `TAB_HEADERS_()` + `pastikanTabAda_()` — tab hilang/kosong dibuat otomatis dengan header standar | `gscode/code-analytic.gs` | ✅ |
| 2 | `getAllDashboardData()` memanggil auto-provision untuk 4 tab + invalidasi `dash_data_v2` saat ada pembuatan | `gscode/code-analytic.gs` | ✅ |
| 3 | `saveTarget` & `addBiaya` pakai `TAB_HEADERS_()` (hapus header hardcoded yang bisa drift) | `gscode/code-analytic.gs` | ✅ |
| 4 | Alasan Retur ditunda — §2.3/§3.5 nonaktif, roadmap renumber 11→10 item aktif | `Update_Plan_Analytic_Webtool_REVISI.md` | ✅ |
| 5 | Catatan Anti-Error §0.3 (bump `intel_pro_cache_v3`, flag `hppKnown`, lokasi L1723-1724, tab `Stok` literal) | `Update_Plan_Analytic_Webtool_REVISI.md` | ✅ |
| 6 | README analytic disinkronkan ke SW `reynahub-v4` (network-first) | `Productive/analytic/README.md` | ✅ |
| 7 | Deploy ulang GAS agar auto-provision aktif | (user, GAS Web App) | ⏳ |

**Wajib berikutnya (satu langkah, di sisi user):** deploy ulang `code-analytic.gs` → Deploy → Manage deployments → Edit → Deploy. Verifikasi: buka `API_URL?action=getSalesData` → JSON tetap `{transaksi, produk, biaya, settings}` (tab kosong yang hilang akan muncul otomatis di Spreadsheet setelah akses pertama).
