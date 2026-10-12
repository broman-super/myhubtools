# AGENT-17 — Lintas Perangkat

> **Persona:** Pengguna lintas perangkat — mulai di laptop, lanjut di HP di lapangan, kadang buka di komputer borrow; ingin tahu apakah datanya ada di perangkat lain dan apakah aman pindah perangkat. · **Fokus:** Perilaku data saat ganti perangkat (localStorage per profil browser) + kejujuran aplikasi menginformasikan risiko. · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 2 |
| TINGGI | 2 |
| SEDENG | 1 |
| RENDAH | 2 |
| **Total temuan** | **7** |

**Kesimpulan:** Aplikasi memang **lokal per perangkat/per profil browser** dan ini terbukti benar secara teknis (data di `localStorage` terpisah antardevice, tidak terikat ke path file). Yang bermasalah adalah **kejujuran & keamanan jalur transfer manual**: "Pulihkan dari File" adalah satu-satunya cara pindah perangkat, dan jalur itu (a) **menimpa seluruh data tanpa konfirmasi**, (b) **menerima file backup tidak utuh** lalu setelah **satu klik biasa** data asli hilang permanen, dan (c) setelah itu aplikasi **tampil seperti instalasi baru** ("0 event", "Rp 0") tanpa pesan apa pun. Informasi "data tidak ikut pindah" memang ada, tapi hanya di dua tempat yang harus di-scroll, dan nol di halaman Pengaturan maupun Layar Kerja. **Tidak ada** akun/login, **tidak ada** sinkronisasi, **tidak ada** UUID perangkat, **tidak ada** indikator local-vs-sinkron.

## Environment yang dipakai

- Edge headless (Windows), **profil unik per simulasi perangkat**:
  - `prof_a17_devA` = Perangkat A (laptop)
  - `prof_a17_devB` = Perangkat B (HP)
  - `prof_a17_devC` = Perangkat C (profil baru, belum pernah dipakai)
  - `prof_a17_dupe`, `prof_a17_bad`, `prof_a17_loss*`, `prof_a17_ban2`, `prof_a17_stack`, `prof_a17_seed/timing` = uji khusus
- Semua harness di `_QA_TMP/` (a17_probe, a17_dupe, a17_seed, a17_timing, a17_stack, a17_banner, a17_origin, a17_loss), hasil dibaca dari `<pre id="out">`. **Tidak ada file aplikasi yang diubah.**
- Rute diuji: `#/dashboard`, `#/events`, `#/events/evt-1`, `#/events/evt-9`, `#/archive`, `#/products`, `#/master`, `#/reports`, `#/guide`, `#/settings` — viewport headless 1256×581 px.
- Data awal (penting): `store.load()` **tidak** langsung menulis seed ke `localStorage`. Tapi begitu aplikasi **render pertama**, `getSppd()` membuat SPPD default lalu `saveSppd() → save()` (**store.js:384 → 391 → 330**) menulis **54.931 byte** data dummy ke perangkat itu. Terbukti dari stack trace: `setItem("sppd_toolbox_db_v2", 54931 byte) ← save ← saveSppd ← getSppd`.

### Perbandingan 3 "perangkat" (angka asli dari DOM/localStorage)

| Metrik | Perangkat A (laptop) | Perangkat B (HP) | Perangkat C (baru) |
|---|---|---|---|
| Event | **10** | **9** | **9** |
| Produk | **9** | **8** | **8** |
| Penjualan / Pengeluaran | 11 / 10 | 11 / 10 | 11 / 10 |
| Nama di Pengaturan | `Kael (LAPTOP-A)` | `Kael` | `Kael` |
| Event `TES-LAPTOP-01` ada? | **YA** (id `id-muotxvfp-wuuih8`) | **TIDAK** (0) | **TIDAK** (0) |
| Produk `TES-LAPTOP-Produk` ada? | **YA** | **TIDAK** (0) | **TIDAK** (0) |
| Ukuran `sppd_toolbox_db_v2` | **62.483 byte** | **55.280 byte** | **0 byte → 54.931 setelah render 1** |
| Field identitas perangkat/sinkron di DB | **[]** (dicek 15 nama field) | **[]** | **[]** |
| Lokasi fisik data | `…\prof_a17_devA\Default\Local Storage\leveldb\*.ldb` | `…\prof_a17_devB\…` | `…\prof_a17_devC\…` |

→ Kesimpulan angka: kerjaan di laptop **tidak terlihat sama sekali** di HP, dan aplikasi di HP **tampak sama sehatnya**. Tidak ada satu pun angka yang berbeda secara visual bagi pengguna awam.

## Temuan

### [BUG-01] "Pulihkan dari File" menimpa seluruh data perangkat tujuan tanpa konfirmasi — kerjaan baru di HP hilang diam-diam — **severity: KRITIS**

**Persona dan use-case:** Ekspor backup dari laptop, kirim ke HP, buka di HP untuk melanjutkan. Di HP sudah ada event baru yang **belum di-backup**.

**Langkah reproduksi:**
1. Jalankan `?step=write` di profil A: buat event `TES-LAPTOP-01 (perangkat A)` + produk `TES-LAPTOP-Produk`, ubah nama di Pengaturan jadi `Kael (LAPTOP-A)` → A: events 9 → **10**.
2. Ambil `exportJSON()` sebagai "file backup laptop" (**81.500 byte**, nama file otomatis `sppd-backup-2026-10-01.json`).
3. Jalankan `?step=devB` di profil B (profil berbeda = perangkat lain): A.store lokal = seed, events **9**. Buat event `TES-HP-01` milik HP → events **10 → 11**.
4. Di perangkat B klik **Pulihkan dari File** dan pilih file backup dari langkah 2.

**Harapan:** Sebelum menimpa, muncul dialog konfirmasi bernadaKAN APA YANG AKAN HILANG, misal: *"Data lokal perangkat ini (11 event) akan **diganti seluruhnya** dengan isi file (10 event). Event TES-HP-01 akan hilang. Lanjutkan?"* Ada opsi **Gabung (merge)** atau minimal tombol **Batal** yang jelas.

**Kenyataannya:** `data:import` (**actions.js:538-559**) langsung `input.click()` → baca file → `store.importJSON()` → toast sukses. **Tidak ada `ui.confirm` sama sekali**, tidak ada perbandingan jumlah record, tidak ada merge. `importJSON` (**store.js:336-354**) melakukan `DB = obj` —_replace_ penuh.

**Evidence:**
- Perangkat B sebelum restore: events **11**; `return {"before":11,"after":10}`; sesudah restore events **10**; `TES-HP-01 tersisa = 0` → **hilang**.
- Perangkat A (restore file backup miliknya sendiri yang berumur lebih lama): `return {"before":12,"after":11}`; `TES-LAPTOP-01` ikut hilang.
- Toast yang muncul hanya: `Data dipulihkan: 11 → 10 event` — angka turun justru **dianggap keberhasilan**.

**Dampak ke pengguna awam:** Ini skenario paling wajar saat pindah perangkat. User bisa tanpa sadar menghapus data yang baru saja dicatat di lapangan, dan toast "berhasil" justru menenangkan. Tidak ada undo, tidak ada backup otomatis sebelum overwrite.

**Usulan perbaikan (deskriptif):** (1) Wajib dialog konfirmasi sebelum menulis: tampilkan jumlah event/produk/transaksi **sebelum vs sesudah**, plus daftar 3 event yang akan hilang. (2) Simpan snapshot otomatis `sppd_toolbox_db_v2.bak` (rotasi 3) sebelum overwrite, lalu tawarkan tombol **"Kembalikan"** di toast. (3) Pertimbangkan mode **Gabung** berbasis `id` event untuk restore parsial. (4) Jangan pakai kata "dipulihkan" bila isinya justru menimpa — gunakan "Data diganti dengan isi file".

### [BUG-02] File backup tidak utuh tetap diterima → 1 klik biasa menghapus semua data asli secara permanen — **severity: KRITIS**

**Persona dan use-case:** File `.json` dikirim via WhatsApp/kabel/email, terpotong di tengah, atau user keliru memilih file JSON lain (mis. export lama). Tekanan: "dipulihkan" = dianggap aman.

**Langkah reproduksi (3 tahap, profil sama):**
1. `?step=stage1`: buat `EV-REAL-01` + `PRODUK-REAL-01` + isi nama → `localStorage = 55.017 byte`, 10 event, `EV-REAL-01` **ada**.
2. `?step=stage2` (halaman dibuka lagi, data masih utuh): `localStorage = 55.492 byte`, `EV-REAL-01` **ada**. Lalu "Pulihkan dari File" dengan file `{"events":[]}`.
3. **Aksi biasa berikutnya:** buka Pengaturan → klik **Simpan Pengaturan** (menyimpan `settings` saja, bukan data bisnis).
4. Tutup & buka lagi aplikasi (`?step=stage3`).

**Harapan:** File tidak valid **ditolak** dan DB lokal **tidak boleh tersentuh** sama sekali. Bila ada error saat proses, state sebelumnya harus dipulihkan (rollback) dan user diberi pesan jelas.

**Kenyataannya:**
- Validasi `importJSON` hanya memeriksa `Array.isArray(obj.events)` (**store.js:338**). File `{"events":[]}` **lolos**.
- Setelah `DB = obj`, normalisasi langsung `DB.sppd.forEach(...)` → **TypeError: Cannot read properties of undefined (reading 'forEach')** (**store.js:346**). Memori aplikasi jadi `{events: [], settings: {...}}` (sppd/products/sales = `undefined`).
- `localStorage` **saat itu masih aman** (55.492 byte) — tapi begitu user melakukan **aksi apa pun** (`saveSettings` → `save()`), DB rusak **ditulis balik**: **`localStorage` menyusut dari 55.492 → 147 byte, 0 event, `EV-REAL-01` TIDAK ADA**.
- Setelah halaman dibuka lagi: `A.store.load()` **melempar TypeError** setiap kali dipanggil → seluruh aplikasi tidak bisa berfungsi normal.
- Tidak ada toast error ke user pada langkah-langkah ini: `saveSettings` "diam-diam berhasil".

**Evidence (run `a17_loss.html` stage1→2→3, profil `prof_a17_loss2`):**
```
[L3] sebelum restore   localStorage=55492 byte | 10 event | EV-REAL-01: YA
[L4] "Pulihkan dari File" file rusak -> TypeError: Cannot read properties of undefined (reading 'forEach')
[L5] setelah restore gagal  localStorage=55492 byte | EV-REAL-01: YA   (data di disk masih aman)
[L6] memori app: events=0 | sppd=undefined | products=undefined
[L8] saveSettings tidak melempar error (diam-diam berhasil)
[L9] SETELAH satu aksi biasa  localStorage=147 byte | 0 event | EV-REAL-01: TIDAK
[L10] setelah ditutup & dibuka lagi  localStorage=147 byte | EV-REAL-01: TIDAK
[L11] PANGGILAN PERTAMA A.store.load() -> TypeError: Cannot read properties of undefined (reading 'forEach')
```
Uji file lain: teks acak & JSON terpotong **ditolak** dengan benar (bagus), jadi celahnya hanya file "JSON valid tapi isinya bukan backup lengkap".

**Dampak ke pengguna awam:** Kehilangan data permanen (semua event, penjualan, pengeluaran) tanpa satu pun peringatan. Untuk bendahara/PIC yang mencatat penjualan lapangan selama 4 hari, ini benar-benar fatal.

**Usulan perbaikan (deskriptif):** Validasi ketat **sebelum** `DB = obj`: wajib ada array `events` **dan** `sppd`, `products`, `sales`, `checklistTemplates` (boleh array kosong, tapi wajib ada); tolak bila `events.length === 0`; bungkus seluruh proses dalam try/catch dan **jangan** menimpa `DB` sampai validasi lolos (atomic). Tambahkan `try/catch` di sekitar `load()` agar data rusak tidak mematikan seluruh aplikasi, plus guard `DB.sppd || []`, `DB.sales || []` di setiap accessor.

### [BUG-03] Setelah data rusak, aplikasi tampil "seperti instalasi baru" (0 event, Rp 0) tanpa pesan apa pun — **severity: TINGGI**

**Persona dan use-case:** Setelah kejadian [BUG-02], user membuka ulang aplikasi untuk melanjutkan kerjaan.

**Langkah reproduksi:**
1. Lanjutkan dari `?step=stage3` (state sudah rusak: `localStorage` 147 byte).
2. Buka `#/dashboard` lalu baca angka & pesan di layar.

**Harapan:** Aplikasi menampilkan banner error yang jelas: *"Data tersimpan tidak bisa dibaca (kemungkinan file backup terakhir tidak lengkap). Data Anda yang lama masih ada di perangkat lain — pulihkan dari file backup."*

**Kenyataannya:** Dashboard merender normal dengan angka nol dan pesan **yang terlihat sah**:

> "Event Berjalan **0** dari **0** total" · "Total Penjualan **Rp 0**" · "Total Pengeluaran **Rp 0**" · "Saldo Akhir **Rp 0**" · "**Tidak ada event berjalan** — Buat event baru via halaman Event untuk mulai tugas."

Tidak ada indikasi error, tidak ada tombol pemulihan. `#/products` bahkan **crash** saat render (`TypeError: Cannot read properties of undefined (reading 'map')`, 1 dari 9 rute gagal) — halaman putih sebagian.

**Evidence:** Dump DOM `#/dashboard` setelah state rusak (kutipan persis dari DOM) di atas; `[B5]` dari run `badfile`: `#/products [TypeError: Cannot read properties of undefined (reading 'map')]`.

**Dampak ke pengguna awam:** Dua skenario berbahaya: (1) user mengira datanya **hilang permanen** lalu panik; (2) lebih buruk — user mengira ini instalasi baru dan **mulai mencatat dari nol**, data lama (yang sudah lenyap dari storage) benar-benar hilang selamanya.

**Usulan perbaikan (deskriptif):** Deteksi "DB rusak/tidak terbaca" di `load()` → tandai state `corrupt`, tampilkan layar/kartu error full-width dengan tombol **"Pulihkan dari file backup"**, **"Coba lagi"**, dan **"Reset ke data contoh"** (dengan penjelasan bahwa data lama tidak bisa dibaca). Halaman harus menonaktifkan form input agar tidak ada pencatatan baru di atas data rusak.

### [BUG-04] Deep link event milik perangkat lain diarahkan diam-diam ke daftar — tidak ada penjelasan kenapa data tidak muncul — **severity: TINGGI**

**Persona dan use-case:** Di laptop user menyimpan/bookmark tautan `#/events/evt-1`. Di HP (data lokal) user membuka tautan yang sama dari WhatsApp grup tim.

**Langkah reproduksi:**
1. Di perangkat dengan seed default (evt-1 ada) buka `#/events/evt-1` → normal tampil.
2. Buka `#/events/evt-9` (event milik perangkat lain) → amati URL dan pesan di layar.

**Harapan:** Pesan jujur: *"Event ini tidak ada di perangkat ini. Datanya mungkin ada di laptop/komputer lain yang belum disinkronkan. Kembali ke daftar event."*

**Kenyataannya:** Router **diam-diam** mengubah hash: `#/events/evt-9` → **`#/events`** (`app.js:54-56`), teks halaman 1.418 karakter, regex pesan "tidak ditemukan" = **false**, toast = **(kosong)**. Tidak ada penjelasan. Menariknya, `pages.js:199` **sudah punya** pesan yang tepat (`ui.empty('Event tidak ditemukan', 'Kembali ke daftar event.')`) — tapi jalur router tidak pernah menampilkannya karena `getEvent()` dicek lebih dulu di `app.js`.

**Evidence:** `[18] buka deep link "#/events/evt-9": hash jadi "#/events" | teks halaman=1418 karakter | ada pesan "tidak ditemukan"? false | toast="(kosong)"` (run `write` dan `devB` identik).

**Dampak ke pengguna awam:** Tepat di skenario persona ini: user mengira aplikasinya rusak atau datanya hilang, padahal memang design-nya lokal. Tidak ada bridge menuju export/import file.

**Usulan perbaikan (deskriptif):** Ubah `app.js` agar merender `A.pages.eventDetail`-style empty state ("Event tidak ditemukan di perangkat ini") alih-alih redirect buta; sertakan tombol **"Pulihkan dari File Backup"** dan penjelasan satu kalimat bahwa data lokal tidak tersinkron antar perangkat.

### [BUG-05] Tidak ada peringatan eksplisit "data tidak pindah perangkat" di halaman yang relevan — penyampaian ada tapi harus di-scroll jauh — **severity: SEDENG**

**Persona dan use-case:** Sebelum pindah ke HP, user ingin tahu: "apakah data saya ada di perangkat lain? apakah aman pindah perangkat?"

**Langkah reproduksi:**
1. Buka `#/settings` (Pengaturan) → baca blok **Status Integrasi** dan blok **Data**.
2. Buka `#/dashboard` → cari banner peringatan, catat posisi vertikalnya vs tinggi layar.
3. Buka `#/guide` → cari kalimat jujur tentang perpindahan perangkat, catat posisinya.
4. Baca footer di `index.html`.

**Harapan:** Peringatan 1–2 kalimat, jelas, di halaman Pengaturan (tempat user mencari "Data") dan di halaman pertama; tidak perlu menggali 6.000 karakter Panduan.

**Kenyataannya:**
- `#/settings`: **0** kemunculan kata kunci lintas-perangkat (`perangkat/pindah/sinkron/ponsel/komputer/laptop/tidak ikut/cloud/akun/login`) dalam 582 karakter teks. Blok Data hanya berbunyi: "Backup menyimpan seluruh data ke file .json. Pulihkan mengembalikan data dari file backup. Reset mengembalikan contoh dummy." — **tidak** menyebut konsekuensi menimpa, tidak menyebut data tidak pindah perangkat, tidak ada urutan langkah lintas-perangkat.
- `#/dashboard`: banner `Prototype` ("Data tersimpan di browser (localStorage) + contoh dummy…") ada tapi di **y = 1.080 px** sementara tinggi halaman 1.032 px dan layar 581 px → **harus scroll ~529 px** untuk terlihat. Tidak ada di `#/events`, `#/events/evt-1`, `#/settings`, `#/products`, `#/guide`, `#/reports`, `#/archive` (0 elemen `.border-dashed` di semua halaman tsb).
- `#/guide`: kalimat jujur *"semua data tersimpan di localStorage browser ini. Belum ada server; data tidak ikut pindah perangkat"* ada di **y = 711 px** (tinggi halaman 1.886 px, layar 581 px) → harus scroll **~170 px**, di tengah 6.137 karakter teks.
- Footer: `"SPPD Toolbox — Prototype v0.6 · Event terfokus 3 tab… GAS & Supabase pending — lihat halaman Pengaturan."` → **tidak** menyebut apa pun soal data tidak ikut pindah perangkat.

**Evidence:** `[24] #/settings: … kata kunci lintas-perangkat=[]` · `[32] #/dashboard -> banner "Prototype" di y=1080px … perlu scroll 529px` · `[32] #/guide -> kalimat "data tidak ikut pindah perangkat" di y=711px … perlu scroll 170px` · `[25]/[26] footer menyinggung data tidak ikut pindah? TIDAK`.

**Dampak ke pengguna awam:** User awam menyimpulkan "pasti sudah tersimpan di cloud" karena tidak ada peringatan eksplisit di tempat yang ia cari. Warning ada, tapi tidak di jalur yang biasa dibaca orang.

**Usulan perbaikan (deskriptif):** Tambah 2 kalimat peringatan di blok **Data** Pengaturan: *"Data tersimpan hanya di browser/perangkat ini — tidak otomatis tersinkron ke HP atau komputer lain. Untuk pindah perangkat: (1) di perangkat lama: Backup ke File; (2) kirim file .json; (3) di perangkat baru: Pulihkan dari File (menimpa data lokal)."* Pindahkan banner `Prototype` ke **atas** Dashboard (atau jadikan baris tipis di header) dan tambahkan 1 frasa "…dan tidak ikut pindah perangkat".

### [BUG-06] Tidak ada identitas perangkat di data & nama file backup identik setiap hari — file dari 2 perangkat mudah tertukar — **severity: RENDAH**

**Persona dan use-case:** User backup dari laptop dan dari HP pada hari yang sama, nama file-nya sama-sama `sppd-backup-2026-10-01.json`.

**Langkah reproduksi:**
1. `exportJSON()` di dua perangkat → bandingkan nama file & isi.
2. Scan isi DB untuk field identitas perangkat (15 nama field diperiksa).
3. Cek apakah file backup memuat UUID/session.

**Harapan:** Nama file memuat sumber & waktu (mis. `sppd-backup-2026-10-01-0812-LAPTOP.json`), dan file backup memuat metadata `deviceName`/`exportedAt` agar jelas file itu dari mana.

**Kenyataannya:**
- Nama file = `'sppd-backup-' + A.isoToday() + '.json'` (**actions.js:528**) → **hanya tanggal**, tanpa jam, tanpa nama perangkat. Dev A dan B di hari sama = **nama identik**.
- Isi backup **tidak** memuat UUID/session perangkat (`regex UUID` → **false**).
- Field identitas/sinkron di DB: `deviceId, device, deviceName, sessionId, clientId, installId, uuid, syncedAt, lastSync, updatedBy, rev, version, sync, owner, perangkat` → **[] kosong** di ketiga perangkat.
- `userId` hanya berisi placeholder `u1` (bukan identitas orang/perangkat).
- Import juga **tidak menampilkan dari mana file berasal** (tidak ada metadata sumber di file, tidak ada preview isi file sebelum overwrite).

**Evidence:** `[28] nama file backup = "sppd-backup-2026-10-01.json" … dua perangkat di hari sama = nama file identik` (82.732 byte di A vs 81.899 byte di B — **beda isi, nama sama**) · `[29] file backup punya UUID device/session? false` · `[08] field identitas-perangkat/sinkron di DB = []`.

**Dampak ke pengguna awam:** Rendah–sedang: kesalahan pilih file = data tertimpa (kalau bug [BUG-01] sudah diperbaiki, dampaknya jadi jauh lebih ringan karena ada konfirmasi).

**Usulan perbaikan (deskriptif):** Tambahkan blok `meta: { app, version, exportedAt: <ISO lengkap>, deviceName }` di file backup, pakai `deviceName` di nama file, dan tampilkan "Berkas dari: HP Kael, 1 Okt 08.12 (10 event)" saat preview sebelum konfirmasi restore.

### [BUG-07] Tidak ada sinkronisasi otomatis antar tab di browser yang sama (tidak ada listener `storage`) — **severity: RENDAH**

**Persona dan use-case:** Buka aplikasi di 2 tab (misal daftar event di laptop, input penjualan di tab lain) dan mengharapkan perubahan langsung terlihat.

**Langkah reproduksi:**
1. Muat aplikasi, catat jumlah event di memori.
2. Tulis `localStorage` langsung (simulasi tab/perangkat lain menulis) → jumlah event bertambah.
3. Pancarkan `new StorageEvent('storage', {key, newValue})` → amati DOM.
4. Hanya setelah `A.reload()` paksa, data baru tampil.

**Harapan:** Aplikasi mendengarkan event `storage` untuk key yang sama dan me-refresh tampilan otomatis.

**Kenyataannya:** `addEventListener('storage'` → **0 kemunculan** di seluruh kode aplikasi. Setelah event dipancarkan: `DOM berubah=false | event asing tampil=false | memori store masih 10 event`; baru setelah reload paksa: `event asing tampil=true`. Catatan: antar **perangkat** berbeda memang mustahil via localStorage — ini keterbatasan browser, bukan bug; yang bisa diperbaiki hanya kasus antar tab.

**Evidence:** `[15] setelah event storage dipancarkan (terkirim=true): DOM berubah=false | event asing tampil=false | memori store masih 10 event` · `[16] HAKIMAT: tidak ada listener storage/sinkron` · grep kode: `addEventListener('storage'` = 0.

**Dampak ke pengguna awam:** Rendah. User mungkin mengira data "hilang" di tab kedua yang masih menampilkan tampilan lama.

**Usulan perbaikan (deskriptif):** Tambahkan `window.addEventListener('storage', function(e){ if (e.key === KEY) { DB = null; A.reload(); } })`, plus tampilkan chip kecil "diperbarui dari tab lain" bila perlu.

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Data lokal benar-benar terisolasi & konsisten.** Dibuktikan dengan 3 profil: perangkat C (baru) mulai dari **0 key** di `localStorage`, perangkat A masih **62.483 byte** — tidak ada kebocoran antar perangkat/profil. Ini persis perilaku yang diharapkan untuk prototype offline-first.
- **Hipotesis "path berbeda bikin data hilang" TIDAK terbukti.** Salinan app dibuka dari **`D:\a17_qa_copy\`** (drive & folder berbeda) memakai **profil yang sama** → data tetap utuh: `origin = file://` di kedua lokasi, `events=11`, `nama="Kael (LAPTOP-A)"`, `62.483 byte` identik. Jadi di Edge, `localStorage` untuk `file://` di-share per **profil browser**, bukan per path. Jangan buru-buru membuat "fix path" yang keliru — masalahnya bukan path.
- **Data benar-benar tersimpan di folder profil perangkat.** `Select-String` menemukan key `sppd_toolbox_db_v2` di `…\Default\Local Storage\leveldb\000003.ldb / 000006.ldb / 000009.ldb` milik profil A — bukti fisik bahwa data hidup di perangkat, bukan di berkas app.
- **Tidak ada panggilan jaringan tersembunyi.** `fetch(` = 1 kemunculan dan itu **di dalam komentar** (`store.js:5`), `XMLHttpRequest`/`WebSocket`/`BroadcastChannel`/`navigator.onLine`/`gasUrl`/`apiUrl`/`supabaseUrl`/`endpoint`/`http://`/`https://` = **0**. Tidak ada akun, tidak ada token, tidak ada kebocoran data ke pihak ketiga. Status integrasi "Pending" di Pengaturan **jujur**.
- **Validasi import ternyata menahan dua kasus umum:** teks acak (`Unexpected token 'b'`) dan file JSON terpotong (`Expected ',' or ']' …`) → ditolak dengan pesan error yang muncul lewat toast, tanpa merusak DB.
- **Tidak ada duplikasi data setelah bolak-balik import.** Setelah `import(export())` dan bolak-balik file antar "perangkat": `checklistItems` tetap **24 item per event**, pasangan (event,template) ganda = **0** (dicek pada 216, 240, dan 264 item). Angka checklist stabil.
- **Struktur export cukup jelas & lengkap.** 16 koleksi ikut terbawa (events, sppd, transports, products, eventProducts, sales, expenses, milestones, kasAdj, danaCair, prepItems, settings, checklistTemplates, checklistItems, itemCats, itemTemplates) — 1 file `.json` memang cukup untuk memindahkan seluruh pekerjaan satu event.
- **Ukuran data aman.** `sppd_toolbox_db_v2` hanya **55–62 KB** dari kuota yang dilaporkan Edge **10.240 MB** untuk origin `file://`. (Catatan jujur: uji "storage penuh" **tidak berhasil** memicu kegagalan simpan karena kuota terlalu besar — jadi **tidak ada temuan** soal kuota.)

## Pertanyaan terbuka / perlu konfirmasi

- Apakah `{"events":[]}` sebenarnya mungkin terjadi di dunia nyata (mis. user ekspor file dari akun/perangkat lain yang datanya kosong)? Kalau ya → severity [BUG-02] jelas KRITIS. Perlu konfirmasi tim produk.
- Restore di perangkat tujuan **sebaiknya** replace total (memang lagi pindah device) atau merge? Pertanyaan produk, bukan teknis.
- Apakah "Event tidak ditemukan" di `pages.js:199` pernah dipakai lewat jalur lain (misal dipanggil langsung)? Kalau tidak, ini UI mati yang layak dihidupkan untuk [BUG-04].
- Kop urged — perlu konfirmasi apakah "tidak ikut pindah perangkat" juga harus muncul saat user menekan tombol **Backup ke File** (bukan hanya di Pengaturan/footer).
- Browser berbeda (Chrome vs Edge) pada satu komputer = dua "perangkat" berbeda bagi app ini; perlu konfirmasi apakah ini perlu dijelaskan eksplisit di Panduan (belum ada teks untuk ini).

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Kejelasan status data lintas-perangkat | 2 | Tidak ada peringatan di Pengaturan/Dashboard-atas/Layar Kerja; satu-satunya pernyataan jujur harus digali di Panduan (scroll 170 px dari 1.886 px halaman). |
| Keamanan jalur pindah perangkat (restore) | 1 | Restore menimpa tanpa konfirmasi **dan** bisa menghapus seluruh data secara permanen setelah satu klik biasa. Ini titik paling lemah. |
| Kejujuran aplikasi (tidak menjanjikan sinkron) | 4 | Status integrasi Pending dinyatakan, tidak ada panggilan jaringan tersembunyi, kalimat "data tidak ikut pindah perangkat" memang ada — tapi belum di tempat yang tepat. |
| Transfer data yang tersedia | 3 | Hanya lewat file `.json` manual; tidak ada preview, tidak ada metadata asal file, nama file identik per hari, tidak ada merge. |
| Perubahan yang harus dilakukan untuk pindah perangkat | 1 | Tidak ada wizard/panduan; user harus menemukan sendiri tombol **Backup ke File** & **Pulihkan dari File** di Pengaturan, lalu tahu urutannya (lama → kirim → baru). |

**Rata-rata: 2.2 / 5** — belum layak dipakai untuk operasional nyata lintas perangkat sampai [BUG-01] & [BUG-02] diperbaiki (keduanya soal kehilangan data, bukan soal estetika).

**Prioritas perbaikan:** 1) [BUG-02] validasi import ketat + rollback + atomic overwrite; 2) [BUG-01] konfirmasi wajib + backup otomatis sebelum overwrite; 3) [BUG-03] layar error "data rusak" + cegah input baru; 4) [BUG-04] pesan "tidak ditemukan di perangkat ini" + shortcut restore; 5) [BUG-05] peringatan eksplisit di Pengaturan + banner di atas; 6) [BUG-06] metadata perangkat di nama file & isi; 7) [BUG-07] listener `storage` untuk antar tab.