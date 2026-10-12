# AGENT-01 — User Baru Pengguna HP

> **Persona:** Pengguna baru yang pertama kali buka aplikasi ini lewat HP karena rekan kerja bilang "coba aplikasi ini, gampang" - bukan orang IT, tidak tahu apa itu SPPD, dan tidak tahu harus ngapain pertama kali. | **Fokus:** first-run experience, halaman utama/dashboard, event list, dan alur awal masuk ke sebuah event. | **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 5 |
| SEDANG | 10 |
| RENDAH | 4 |
| **TOTAL** | **19** |

Kesimpulan: aplikasinya **tidak crash dan tidak blank** — itu kabar baik, tidak ada satu pun
error JavaScript yang saya temukan, dan seluruh 8 halaman berhasil dirender. Tapi dari sudut
pandang orang yang benar-benar baru, aplikasi ini **tidak memberi jawaban atas pertanyaan
"harus ngapain pertama"**. Tidak ada onboarding, tidak ada welcome, tidak ada tombol "Mulai",
nol tooltip, nol `<details>`. Satu-satunya petunjuk ada di halaman **Panduan**, dan halaman itu
sembunyi di balik tombol hamburger yang harus digeser horizontal 450px untuk ditemukan.
Peringatan bahwa 9 event bawaan itu **data contoh** hanya nangkring di 86% tinggi halaman
Dashboard, dan **tidak ada sama sekali** di halaman Event & Tugas maupun di Layar Kerja.
Setelah saya membuat event pertama (jalur paling natural untuk user baru), saya mendarat di
halaman setinggi **17.000px = 20,1 layar HP** dengan 0% progres, 24 item checklist, 53 field
form, dan **nol petunjuk langkah berikutnya** (`/langkah|berikutnya|selanjut/i` → `false`).
Yang paling memalukan untuk semua orang: indikator utama "Progres persiapan" memberi **tanda
centang hijau pada event yang benar-benar kosong** ("✓ Item persiapan dibawa", "✓ Saldo aman")
padahal pengguna belum mengisi apa pun. Di HP, tidak ada satu pun tombol yang bisa diklik di
layar pertama Dashboard. Skor pengalaman keseluruhan: **2 dari 5**.

## Environment yang dipakai

- Edge headless (`--headless=new`), **profil unik** per run: `%TEMP%\opencode\prof_a01*`,
  dihapus ulang tiap run.
- `localStorage.clear()` dijalankan di halaman pembungkus **sebelum** iframe app dimuat →
  benar-benar first-run dengan seed default. Terbukti: `jumlah_event_seed=9`, `produk=8`.
- Viewport 390x844. Cara achieve: `--window-size` **tidak bisa dipakai** di Edge Windows
  (terkunci minimum lebar jendela: saya ukur `innerWidth=492` walau diminta 390). Solusinya
  harness membungkus `index.html` asli di dalam `<iframe>` berukuran tepat 390x844 dengan flag
  `--allow-file-access-from-files`, sehingga media query Tailwind bereaksi seperti HP sungguhan.
  Terbukti: `viewport=390x844`, `tailwind_loaded=true`, `main_maxWidth=1800px`.
- Harness di `_QA_TMP/` (`a01_frame.html`, `a01_test.js`). Tidak ada file aplikasi yang diubah.
- Rute yang diuji: `#/dashboard`, `#/events`, `#/events/evt-1`, `#/events/evt-2`,
  `#/guide`, modal **Buat Event Baru** → simpan → halaman event baru, dialog konfirmasi
  Hapus event, dan tombol `Download Dokumen`.
- Semua angka di bawah diambil dari `getBoundingClientRect` / `getComputedStyle` /
  `scrollHeight`, bukan dari screenshot.

## Temuan

### [BUG-01] Nol onboarding — tidak ada satu pun petunjuk "mulai dari mana" — severity: TINGGI

**Persona dan use-case:** Pengguna baru menerima link `index.html` dari rekan kerja. Aplikasi
terbuka di Dashboard. Pertanyaan pertamanya: "ini buat ngapain, dan saya harus ngapain?"

**Langkah reproduksi:**
1. Buka `index.html` dengan `localStorage` kosong (first-run).
2. Lihat seluruh isi halaman pertama secara harfiah.
3. Cari apa pun yang memberi tahu alur: "Selamat datang", "Mulai dari sini", "Langkah",
   tombol "Mulai", atau penjelasan istilah.

**Harapan:** Ada onboarding singkat (modal/screen pertama) yang bilang "SPPD Toolbox dipakai
untuk apa" + "langkah 1: buka Event & Tugas, buat event".

**Kenyataannya:** Tidak ada. Nol.

**Evidence:**
- Pemindaian seluruh `body` untuk 14 kata kunci onboarding
  (`Selamat datang`, `Mulai dari sini`, `Langkah`, `onboarding`, `Pertama-tama`,
  `Apa yang harus`, `Mulai dengan`, `Tips`, `?`, `contoh dummy`, `Panduan`, …):
  `dashboard kata_kunci_onboarding_ditemukan=[Panduan]` — dan itu hanya teks menu di header,
  bukan isi halaman.
- `dashboard <details>=0 <abbr>=0 elemen[d.title]=0 ikon_tanya=0`
- Halaman `#/events`: `kata_kunci_onboarding_ditemukan=[Panduan]` (menu), `tautan_ke_panduan`
  di dalam konten = **0**.
- Halaman `#/events/evt-1`: `kata_kunci_onboarding_ditemukan=[? Panduan]`, `<details>=0`,
  `elemen[d.title]=0`.
- Halaman `#/guide`: `tautan_dari_dashboard_ke_panduan=0` — tidak ada satu pun tautan dari
  Dashboard ke Panduan.
- Jumlah elemen interaktif di Dashboard = **7**.

**Dampak ke pengguna awam:** Tidak ada yang menjawab pertanyaannya. Ia akan melihat angka
"Rp 25.555.000" dan 9 nama event, lalu menyimpulkan itu datanya sendiri. Tidak ada arah
sama sekali. Kalau ia memutuskan "yaudah, begitulah" lalu menutup HP. Bagian yang paling perlu
diperbaiki justru bagian ini: tidak ada peta sama sekali untuk orang yang benar-benar baru.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):**
- Tambah layar pertama (modal sekali saja, flag `seen_onboarding` di localStorage) berisi
  3 kalimat: "Tool ini untuk …", "Langkah 1: buka Event & Tugas → + Buat Event Baru",
  "Butuh penjelasan? buka Panduan".
- Tambahkan **tombol "Mulai: Buat Event Baru"** sebagai elemen pertama di Dashboard, bukan
  CTA yang sekarang ada di y=1274.
- Naikkan halaman Panduan dengan tautan "Mulai dari sini →" dan kotak daftar isi lompat ke
  tiap pertanyaan (saat ini jawaban "Bagaimana memulai?" ada di y=2611).

---

### [BUG-02] Peringatan "ini data contoh" hanya di 86% halaman Dashboard dan tidak ada di halaman lain — severity: TINGGI

**Persona dan use-case:** Pengguna baru melihat 9 event dengan nama-nama nyata
("Pameran UMKM Nusantara Expo 2026", "Bazar Ramadan Ceria 2026") dan 8 produk dagangan.
Ia akan mengira itu datanya, atau lebih buruk: mengira alat ini sudah dipakai rekan kerjanya.

**Langkah reproduksi:**
1. First-run, buka `#/dashboard`, gulir dari atas sampai bawah.
2. Perhatikan kapan muncul banner yang menjelaskan asal data.
3. Buka `#/events` dan `#/events/evt-1`, cari penjelasan yang sama.

**Harapan:** Peringatan "data contoh" tampil di atas, sebelum data apa pun, dan muncul lagi
di halaman yang relevan.

**Kenyataannya:** Banner itu ada tapi **paling bawah**; di halaman Event & Tugas dan Layar
Kerja **tidak ada sama sekali**.

**Evidence:**
- `PERINGATAN_DATA_DUMMY y=1894 h=148 layar_ke-2.24 harus_scroll=1050px posisi=86% dari tinggi halaman`
- Isinya: `"PrototypeData tersimpan di browser (localStorage) + contoh dummy. GAS & Supabase belum tersambung — tandai // FUTURE: GAS / SUPABASE di kode."`
- `#/events`: `kata_kunci_onboarding_ditemukan=[Panduan]` — tidak ada kata "dummy"/"contoh".
- `#/events/evt-1`: juga nihil.
- Data seed yang tampil: `jumlah_event_seed=9` = Pameran UMKM Nusantara Expo 2026[berjalan],
  Gelar UMKM Kota 2026[draft], Bazar Ramadan Ceria 2026[selesai], Sosialisasi UMKM Kota[draft],
  Festival Kerajinan Nusantara[diajukan], Expo Produk Lokal 2026[berjalan], Kunjungan Mitra
  Sektor[berjalan], Dukungan Booth UMKM Regional[disetujui], Pekan Inovasi Daerah[selesai].
- Tidak ada jalan membersihkan data contoh: satu-satunya tool adalah **Reset Data Dummy** di
  Pengaturan, yang justru mengembalikan data dummy (`actions.js:512` → `store.resetData()`).
  `grep` untuk "Hapus Semua|Bersihkan|Kosongkan" → nihil.

**Dampak ke pengguna awam:** Dua risiko sekaligus. (1) Ia mengira data orang lain = miliknya
dan mulai mengoreksi/menghapus. (2) Kalau ia memutuskan mau mulai dari kosong, tidak ada tombol
"mulai dari kosong" — harus menghapus 9 event satu per satu, masing-masing dengan dialog
konfirmasi.

**Usulan perbaikan:**
- Pindahkan banner "data contoh" ke **atas** Dashboard (tepat di bawah `h1`), atau jadikan
  strip tipis full-width.
- Tambahkan **kotak "Mulai dari kosong"** di halaman Event & Tugas: "Hapus semua 9 data contoh
  dan mulai dari event saya" — dengan konfirmasi yang menyebut jumlah event yang akan hilang.
- Ulangi penanda "contoh" pada kartu event (mis. label kecil "CONTOH" pada 9 kartu seed)
  supaya jelas saat sedang menggulir.

---

### [BUG-03] Setelah buat event pertama: mendarat di halaman 20,1 layar tanpa satu pun petunjuk langkah berikutnya — severity: TINGGI

**Persona dan use-case:** Jalur paling natural untuk user baru: `Event & Tugas` →
`+ Buat Event Baru` → isi nama → `Simpan`.

**Langkah reproduksi:**
1. Buka `#/events`.
2. Ketuk `+ Buat Event Baru` (y=225, 153x43px — kebetulan terlihat di layar pertama).
3. Isi `Nama Event / Tugas` = "Tes Uji Pertama", `Lokasi` = "Samarinda", biarkan yang lain.
4. Ketuk `Simpan`.

**Harapan:** Aplikasi memberi tahu "Bagus. Sekarang isi SPPD dulu di seksi 01" atau
menandai langkah 1 sebagai yang harus dikerjakan.

**Kenyataannya:** Aplikasi melompat ke Layar Kerja yang sangat panjang tanpa penjelasan apa pun.

**Evidence:**
- `after_save_hash=#/events/id-muodg2ev-kipync`, `toast="Event dibuat"` (hilang sendiri 2600ms).
- `docScrollHeight=17000 screens_needed=20.14`
- `apakah ada pesan "langkah berikutnya"?=false` (regex `/langkah|berikutnya|selanjut/i`)
- `hero isi="Progres persiapan0%0 dari 5 tahap selesai · Kas akhir Rp 0 · Dana cair Rp 0…"`
- `CEK_PERSIAPAN y=683 h=962` → sudah memakan 1,14 layar sebelum section apa pun
- `ps-1 y=1809` (layar ke-2.14) … `ps-8 y=14091` (layar ke-16.70)
- `total_kartu_di_event_baru=54 total_field=53`

**Dampak ke pengguna awam:** 20 layar tanpa peta. Di HP ia akan menggulir, melihat form
SPPD yang tidak ia pahami, lalu menutup app. Ini cocok dengan ciri persona saya: "cenderung
menutup HP kalau bingung".

**Usulan perbaikan:**
- Setelah event dibuat, tampilkan **tutan kosong/empty state per seksi**, bukan form penuh:
  "Seksi 01 — SPPD & Dana Cair · belum diisi · [Isi sekarang]".
- Tampilkan satu kartu **"Mulai dari sini"** di paling atas Layar Kerja yang berisi 3
  langkah pertama dalam bahasa sehari-hari, dan hilang setelah tahap 1 selesai.
- Tambahkan tombol **"Tutup semua seksi selain 01"** untuk event kosong.

---

### [BUG-04] Indikator utama menandai centang hijau pada event yang benar-benar kosong — severity: TINGGI

**Persona dan use-case:** Membuat event pertama lalu melihat hero "Progres persiapan" —
ini satu-satunya tempat yang menyatakan "sudah sampai mana".

**Langkah reproduksi:**
1. Buat event baru kosong (nama + lokasi saja).
2. Lihat chip di dalam hero "Progres persiapan".

**Harapan:** Semua chip belum tercentang karena belum ada yang dikerjakan.

**Kenyataannya:** **2 dari 4 chip hijau** padahal nol data.

**Evidence:**
- `hero isi="Progres persiapan 0% / 0 dari 5 tahap selesai / Kas akhir Rp 0 / Dana cair Rp 0 / [bullet] SPPD lengkap / [bullet] Produk dicatat / [centang] Item persiapan dibawa / [centang] Saldo aman"`
  (2 chip "hijau" berlatar `color(srgb 0.133 0.773 0.369 / 0.22)` diukur langsung; 2 chip
  "belum" berlatar `color(srgb 1 1 1 / 0.14)`)
- Penyebab di `js/pages2.js:306-307`:
  `{ ok: items.length === 0 || itemDone === items.length, label: 'Item persiapan dibawa' }`
  dan `{ ok: !(s.danaAwal > 0 && fin.saldo < 0), label: 'Saldo aman' }`
  `items.length === 0` dianggap **"aman"**, dan `danaAwal === 0` dianggap **"aman"**.
- Bandingkan evt-1 yang memang berisi data: `"✓ SPPD lengkap✓ Produk dicatat• Item
  persiapan dibawa✓ Saldo aman• Siap berangkat• Pulang tuntas"`.

**Dampak ke pengguna awam:** Ini "hasil salah diam-diam" yang paling berbahaya, karena tidak
ada error — hanya indikator yang bohong. Kalau user bertanya ke atasannya "udah siap belum?",
jawabannya akan diambil dari app yang terlihat sudah siap. Untuk UMKM yang bergantung pada
persiapan lapangan, ini berisiko nyata.

**Usulan perbaikan:**
- Ubah kondisi jadi: chip hijau hanya kalau **ada data DAN sudah lengkap**.
  `ok: items.length > 0 && itemDone === items.length` dan
  `ok: s.danaAwal > 0 ? fin.saldo >= 0 : null` ( tampil sebagai "— belum diisi", bukan ✓).
- Untuk yang belum relevan, pakai chip abu-abu dengan label "Belum relevan" supaya jelas
  bukan "selesai".

---

### [BUG-05] Tidak ada cara kembali / batal yang jelas dari Layar Kerja — severity: TINGGI

**Persona dan use-case:** User baru menyentuh nama event di daftar karena penasaran. Sekarang
ia terjebak di halaman 25 layar dan tidak tahu cara balik.

**Langkah reproduksi:**
1. Dari `#/events`, ketuk judul event mana pun.
2. Cari tombol "Kembali", breadcrumb, atau link "Daftar Event" di dalam `#app`.

**Harapan:** Ada tombol/breadcrumb "← Kembali ke daftar event" di bagian atas.

**Kenyataannya:** Tidak ada sama sekali.

**Evidence:**
```
halaman #/dashboard        tombol_kembali=0 breadcrumb_elemen=0
halaman #/events           tombol_kembali=0 breadcrumb_elemen=0
halaman #/events/evt-1     tombol_kembali=0 breadcrumb_elemen=0
halaman #/guide            tombol_kembali=0 breadcrumb_elemen=0
```
- Yang tersedia di `.ev-head-actions` cuma 2: `"Edit event" 81x32px` dan
  `"Hapus event" 95x32px` — keduanya tindakan menulis, bukan navigasi keluar.
- `ev-head y=89..486` (397px tinggi!) dan `hero y=504..900`, jadi area atas 486px habis
  dipakai judul + tombol Edit/Hapus tanpa satu pun arah kembali.

**Dampak ke pengguna awam:** Satu-satunya jalan keluar adalah tombol hamburger di kiri atas
atau tombol "back" HP yang mungkin tidak iasadari ada. Banyak orang mengira tombol back HP
keluar dari aplikasi/browser.

**Usulan perbaikan:**
- Tambahkan breadcrumb `‹ Event & Tugas › <nama event>` di atas judul, dan tombol
  "← Kembali" sticky di header.
- Tambahkan tombol **"Daftar Event"** sticky di bawah header saat berada di `#/events/*`.

---

### [BUG-06] Istilah jargon muncul di layar pertama tanpa penjelasan apa pun — severity: SEDANG

**Persona dan use-case:** Saya adalah orang UMKM yang dijelaskan aplikasinya lewat pesan WA.
Saya tidak tahu arti SPPD, PIC, saldo, atau wallet.

**Langkah reproduksi:**
1. Buka tiap halaman, ambil seluruh teks yang tampil.
2. Cari setiap istilah teknis dan cek apakah ada penjelasan (tooltip, `<details>`, teks
  isteding di bawahnya).

**Harapan:** Istilah pertama yang muncul disertai penjelasan singkat (satu kalimat) atau
minimal ada ikon tanya.

**Kenyataannya:** Nol penjelasan. Semua istilah berdiri sendiri.

**Evidence:**
```
jargon "PIC"     MUNCUL di dashboard tanpa penjelasan      ("Ringkasan tugas PIC kamu.")
jargon "Saldo"   MUNCUL di dashboard tanpa penjelasan
jargon "PIC"     MUNCUL di halaman events tanpa penjelasan ("Satu event = satu siklus tugas PIC lengkap.")
jargon "Saldo"   MUNCUL di halaman events tanpa penjelasan
jargon "SPPD" / "Milestone" / "Wallet" / "Rekap" / "Alokasi" / "Dana Cair" / "Realisasi"
                 MUNCUL di Layar Kerja tanpa penjelasan
```
- Di Layar Kerja, teks pertama yang welcoming: `kicker(ev-head)="Booth Pameran"` — bahkan
  *kickoff* memakai istilah industri.
- Label form pertama di seksi 01: `Nomor Surat | Tanggal Terbit | Tujuan | Kegiatan |
  Instansi Pemberi Tugas | Status Alur | Dana Awal (alokasi tugas) | Visibilitas` —
  semua jargon frase tanpa keterangan.
- `elemen[d.title]=0`, `<abbr>=0`, `<details>=0` di **seluruh** aplikasi (semua rute).
- Nilai bawaan jargon di modal: `Jenis Tugas = "Booth Event Balapan"`,
  `Peran PIC = "PIC Booth"` — user awam bahkan tidak tahu itu harus diganti.

**Dampak ke pengguna awam:** Ia akan bertanya ke rekan kerja tiap 2 menit, atau lebih buruk:
mengisi "Dana Awal (alokasi tugas)" dengan angka yang salah karena tidak paham bedanya dengan
"gaji". Salah input uang = sulit Dideteksikan sendiri.

**Usulan perbaikan:**
- Tambahkan **glosarium one-liner** pada kemunculan pertama tiap istilah (tooltip native
  `title` atau teks kecil di bawah label), contoh: *"Dana Awal = uang yanganine_INSTANSI
  serahkan untuk tugas ini, belum termasuk hasil penjualan."*
- Ubah kicker `Booth Pameran` menjadi kalimat biasa.
- Ganti nilai bawaan `Jenis Tugas` / `Peran PIC` dengan teks yang bisa Understand
  ("Contoh: Bazaar / Pameran dagang", "PIC = orang yang bertanggung jawab atas event ini").

---

### [BUG-07] Di HP, tidak ada satu pun tombol yang bisa diklik di layar pertama Dashboard — severity: SEDANG

**Persona dan use-case:** Membuka app di HP, melihat layar pertama, mencari "tombol untuk
mulai".

**Langkah reproduksi:**
1. Buka `#/dashboard` di 390x844, tanpa menggulir.
2. Hitung elemen yang bisa diklik di area 0–844px.

**Harapan:** Ada minimal satu aksi (mis. "Buat Event Baru" atau "Lihat semua event").

**Kenyataannya:** Tidak ada. Layar pertama habis oleh 4 kartu angka.

**Evidence:**
```
CTA_UTAMA "Lihat semua event" y=1274 h=43 w=156 tampil_di_layar1=false harus_scroll=430px
KARTU_PROGRESS y=1381 h=282  layar_ke-1.64 harus_scroll=537px
h1 "Dashboard" y=89  ·  subjudul "Ringkasan tugas PIC kamu." y=...
card[0] y=173 h=178  card[1] y=173 h=178  card[2] y=367 h=210
footer_y=2098 (2.5 layar)
tombol_aktif_di_layar1=5   (pada halaman detail event; di dashboard tidak ada CTA sama sekali)
```
- Isi layar pertama = judul + 4 stat card (tinggi 178/178/210/222px), total **sejak y=89 sampai
  y=863**, artinya first screen 100% berisi angka.
- `jumlah_kartu_total=8`, `docScrollHeight=2211 screens_needed=2.62`.

**Dampak ke pengguna awam:** "Berarti aplikasi ini cuma buat lihat angka ya?" Ia menekan
kembali. Di desktop mungkin tidak terasa, di HP ini menentukan.

**Usulan perbaikan:**
- Pada <640px, jadikan **1 CTA sticky di bawah** (position: fixed): `+ Buat Event Baru`.
- Rapatkan 4 stat card pada mobile (jadi 2 baris ringkas atau 1 baris angka kecil), agar
  section "Event berjalan" masuk layar pertama.

---

### [BUG-08] Layar Kerja = 25,3 layar HP; tidak ada seksi yang tertutup secara default — severity: SEDANG

**Langkah reproduksi:**
1. Buka `#/events/evt-1` di 390x844.
2. Ukur tinggi dokumen dan status buka/tutup tiap seksi.

**Harapan:** 8 seksi presented ringkas (collapsed) dengan daftar, atau minimal ada tombol
"tutup semua".

**Kenyataannya:** Semua 8 seksi terbuka semua dari awal.

**Evidence:**
```
total_docH=21346 layar_penuh=25.3   (run lain: 22584px = 26.76 layar)
psec_closed_default=0 dari 8
  ps-1 y=2344 h=4508   ps-2 y=6874 h=1271   ps-3 y=8167 h=1260
  ps-4 y=9449 h=3303   ps-5 y=12775 h=1520  ps-6 y=14316 h=3000
  ps-7 y=17339 h=1296  ps-8 y=18657 h=3737
tombol_lipat=8 ukuran=26x26px simbol="▾" aria="Buka / tutup seksi"
total_field_form=61
elemen_sticky_di_halaman=HEADER.sticky, DIV.fixed(toast-root)
scroll_spy_atau_nav_aktif=0
jumlah_kartu_progress_di_halaman=4
```
- Tombol lipat hanya **26x26px** — di bawah standar target sentuh 44x44px.
- Tidak ada elemen progress yang sticky: saat menggulir 25 layar, **tidak ada satu pun
  penanda "saya di seksi berapa / berapa persen"** yang tetap terlihat. `elemen_sticky` hanya
  header dan toast.
- `scroll_spy_atau_nav_aktif=0` → tidak ada indikator seksi aktif.

**Dampak ke pengguna awam:** Setelah menggulir 3 layar, ia sudah lupa sedang di section
mana. Tidak ada jejak "sudah sampai mana" selain angka % di y=504 yang sudah 20 layar di
atas.

**Usulan perbaikan:**
- Default **tertutup** untuk seksi 02–08 (01 tetap terbuka), dengan sub-judul yang sudah
  informatif (sudah ada: `"N produk dicatat"`, `"Saldo Rp …"`).
- Buat hero progress + mini flowbar **sticky** di bawah header saat di Layar Kerja.
- Perbesar target tombol lipat ke minimal 44x44px (dengan area sentuh yang diperbesar tanpa
  mengubah ukuran visual).
- Tambah tombol "Tutup semua / Buka semua".

---

### [BUG-09] Daftar event diurutkan dari yang paling lama — event "Selesai" tampil pertama — severity: SEDANG

**Langkah reproduksi:**
1. Buka `#/events` (filter "Semua").
2. Baca urutan dari atas.

**Harapan:** Yang paling relevan (event berjalan / draft terbaru) muncul lebih dulu, seperti
di Dashboard yang sudah mengelompokkan.

**Kenyataannya:** Urutan murni berdasarkan `tanggalMulai` **ascending**, jadi event yang
sudah selesai bulan lalu yang paling atas.

**Evidence:**
```
urutan_tampil="Bazar Ramadan Ceria 2026 -> Pameran UMKM Nusantara Expo 2026 -> Gelar UMKM Kota 2026 -> Sosialisasi UMKM Kota -> Festival Kerajinan Nusantara -> Expo Produk Lokal 2026 -> Kunjungan Mitra Sektor -> Dukungan Booth UMKM Regional -> Pekan Inovasi Daerah"
badge_status="✓ Selesai(rgb 239,246,255) ● Berjalan(rgb 245,245,245) ● Draft(rgb 243,244,246)"
ev[0] y=288 h=236 "Bazar Ramadan Ceria 2026"  (status: selesai, 2026-03-02)
ev[1] y=524 h=280 "Pameran UMKM Nusantara Expo 2026" (status: berjalan)
```
- Card pertama (Bazar Ramadan, **selesai**) menutupi 236px layar pertama yang seharusnya
  dipakai BERT Event yang sedang berjalan.
- Bandingkan Dashboard yang sudah benar: `KARTU_PROGRESS isi="Sedang berjalanPameran UMKM
  Nusantara Expo 2026…"` dan ada bagian `KARTU_DRAFT "Disiapkan (draft)…"`.

**Dampak ke pengguna awam:** User baru mengira aplikasi ini sudah selesai dipakai dan
datanya sudah lama. Ia tidak akan menemukan event yang harus ia kerjakan hari ini.

**Usulan perbaikan:**
- Urutkan: `berjalan` dulu (terbaru), lalu `draft`, lalu `diajukan/disetujui`, lalu
  `selesai/dibatalkan` (terlama dulu). Grouping dengan sub-judul seperti di Dashboard.
- Atau minimal: badge "Sedang dikerjakan" mencolok pada event `berjalan` di 3 baris pertama.

---

### [BUG-10] Tombol merah "Hapus event" ada di layar pertama, hanya 32px dari "Edit event" — severity: SEDANG

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Lihat dua tombol di kanan judul.

**Harapan:** Aksi destruktif tidak jadi tombol pertama yang_adjacent di layar pertama; lebih
ideal di dalam menu "…" atau di bagian bawah.

**Kenyataannya:** `Hapus event` (merah) adalah tombol kedua yang dilihat, berdampingan dengan
`Edit event`, keduanya 32px tinggi.

**Evidence:**
```
tombol_kepala "Edit event" 81x32px y=114 x=151 tampil_di_layar1=true class="btn btn-sm btn-ghost"
tombol_kepala "Hapus event" 95x32px y=114 x=239 tampil_di_layar1=true class="btn btn-sm btn-danger"
JARAK Edit->HapusEvent=32px vertikal, 89px horizontal
```
- **Yang sudah baik:** ada konfirmasi. `KONFIRM y=36 w=336 h=160 muat=true`, teks:
  `"Hapus event?Semua data SPPD, produk, penjualan & keuangan event ini ikut terhapus.BatalHapus"`,
  tombol `Batal 68x42px` dan `Hapus 76x42px`, keduanya di y=130 (nyata di layar).
  `setelah_batal_dialog_tutup=true jumlah_event=9` → membatalkan **tidak** menghapus apa pun.
- Yang kurang baik: pemicunya sendiri yang berbahaya (32px target sentuh, warna merah solid,
  89px dari "Edit event" — jari besar bisa meleset).

**Dampak ke pengguna awam:** Tidak akan kehilangan data (karena konfirmasi ada), tapi bisa
membuka dialog hapus karena salah sentuh — rasa takut yang tidak perlu di menit pertama.

**Usulan perbaikan:**
- Pindahkan `Hapus event` ke menu `⋯` di `.ev-head-actions` atau ke bagian bawah halaman.
- Naikkan tinggi target sentuh ke minimal 44px.
- Pertimbangkan tombol dengan ikon keranjang + label "Hapus" (bukan<Event></Event>).

---

### [BUG-11] Area ketuk kartu event hanya 6% — sisanya tidak bisa diklik — severity: SEDANG

**Langkah reproduksi:**
1. Buka `#/events`, ambil satu kartu event.
2. Hitung luas elemen yang punya `href` vs luas kartu.

**Harapan:** Seluruh kartu bisa diklik (pola standar mobile).

**Kenyataannya:** Hanya teks judul (18px) yang bisa diklik.

**Evidence:**
```
kartu 343x264px, elemen_punya_data_action_di_dalam_kartu=32 (anchor=26)
anchor_judul 234x23px dari 90552px kartu = 6% area ketuk
tautan_event_pertama tag=A href=#/events/evt-3 teks="Bazar Ramadan Ceria 2026"
```
- Anchor 234x23px = tinggi 23px, di bawah target sentuh 44px.
- (Angka `32`/`26` itu misleading karena `$$('[data-action]', card)` ikut menghitung
  elemen yang di-*render* oleh `$('#app')` saat iterasi; yang relevan adalah anchor-nya.)

**Dampak ke pengguna awam:** Di HP dengan jari 10mm, mengenai 23px tinggi teks judul adalah
misi. Widget besar 343x264px terlihat seperti tombol tapi matinya. Akibatnya user mengira
aplikasi macet.

**Usulan perbaikan:** Bungkus seluruh kartu dalam `<a>`/pakai `stretched-link` idiom
(`a::after { position:absolute; inset:0 }`) agar area ketuk = 100% kartu tanpa mengubah
tampilan. Pastikan baris "Hapus"-type action (kalau ada) dikecualikan.

---

### [BUG-12] Panduan: jawaban "Bagaimana memulai?" ada di layar ke-3, dan urutan nomornya salah — severity: SEDANG

**Persona dan use-case:** Saya akhirnya menemukan Panduan dan mencari "caranya mulai".

**Langkah reproduksi:**
1. Buka `#/guide`.
2. Cari bagian yang menjelaskan langkah pertama.
3. Perhatikan urutan judulnya.

**Harapan:** Pertanyaan awal ("Bagaimana memulai?") di paling atas, dengan daftar isi.

**Kenyataannya:** Berada di y=2611 (layar ke-3.09) dari total 6.33 layar, dan urutan
nomornya melompat.

**Evidence:**
```
docScrollHeight=5342 screens_needed=6.33   panjang_teks=6097 karakter
  h3 y=216   "Peta Menu - 8 halaman"
  h3 y=1141  "Keterhubungan Data"
  h3 y=2011  "9b. Bagaimana alokasi rinci tersinkron dengan kas?"     <-- nomor 9b
  h3 y=2418  "1. Sistem ini untuk apa?"
  h3 y=2611  "2. Bagaimana memulai?"                                    <-- harus scroll 1767px
  h3 y=2875  "3. Apa itu SPPD & alurnya?"
  h3 y=3092  "4. Apa itu dana awal, dana cair & realisasi?"
  … s.d. 12
  h3 y=5011  "12. Kenapa ada "Prototype" di pojok?"
cuplikan_tahap_1="Bagaimana memulai?Buka halaman Event & Tugas -> tombol "+ Buat Event Baru" -> isi nama, lokasi, tanggal, status. Lalu kerjakan di satu Layar Kerja dengan 8 seksi berurutan."
ada_langkah_1_khusus_pemula=true
```
- Tidak ada daftar isi / tautan lompat di halaman Panduan.
- Isi jawabannya sudah benar dan jelas — masalahnya **jaraknya**, bukan substansinya.

**Dampak ke pengguna awam:** User baru hanya akan melihat tiga paragraf panjang tentang
menu dan data sebelum menemukan jawaban. Sebagian besar akan menyerah sebelum y=2611.

**Usulan perbaikan:**
- Naikkan bagian "1. Sistem ini untuk apa?" dan "2. Bagaimana memulai?" ke paling atas.
- Tambahkan **daftar isi** sticky di atas (chip yang bisa diklik → `scroll:to`).
- Perbaiki penomoran: "9b" muncul sebelum "1" karena penomoran lama tidak dirapikan.

---

### [BUG-13] 4 dari 8 menu tidak terlihat di nav mobile — perlu geser 450px, dan "Panduan" tersembunyi di sana — severity: SEDANG

**Langkah reproduksi:**
1. Di 390px, ketuk tombol hamburger (38x38px, ikon saja, `aria-label="Menu"`).
2. Lihat menu apa yang terlihat tanpa menggeser.

**Harapan:** Semua menu utama terlihat, minimal ada indikasi masih ada menu lain.

**Kenyataannya:** Hanya 4 dari 8 yang terlihat; `Panduan` dan `Pengaturan` di luar jangkauan.

**Evidence:**
```
mobilenav_clientW=375 scrollW=825 HARUS_SCROLL_H=450px (120% tersembunyi)
  nav "Dashboard"     x=12..111   TERLIHAT=true
  nav "Event & Tugas" x=115..234  TERLIHAT=true
  nav "Arsip"         x=238..297  TERLIHAT=true
  nav "Produk"        x=301..374  TERLIHAT=true
  nav "Master Barang" x=378..501  TERLIHAT=false
  nav "Rekap Global"  x=505..619  TERLIHAT=false
  nav "Panduan"       x=623..707  TERLIHAT=false     <-- tempat semua penjelasan
  nav "Pengaturan"    x=711..813  TERLIHAT=false
nav_item_tinggi=36,36,36,36,36,36,36,36   (rekomendasi sentuh >=44px)
nav_last_item_right=813 dari 375px
```
- Tidak ada affordance apa pun (gradient, panah, titik-titik) yang memberi tahu ada menu
  lanjutan di kanan.
- Tombol hamburger hanya 38x38px dan **ikon saja** tanpa teks.

**Dampak ke pengguna awam:** Tiga masalah sekaligus: (1) ia mengira aplikasi cuma punya 4
menu; (2) tidak akan pernah menemukan Panduan → BUG-01 makin parah; (3) tidak akan pernah
temu Pengaturan → tidak akan pernah backup/reset data.

**Usulan perbaikan:**
- Ubah nav mobile jadi **grid 2 kolom** (4 baris) atau **`<select>`/bottom-sheet** — supaya 8
  menu muat tanpa scroll horizontal.
- Tambahkan penanda "geser →" di kanan bila masih overflow.
- Naikkan tinggi item nav ke minimal 44px, dan beri label teks pada hamburger (atau `aria-expanded`).

---

### [BUG-14] Nilai bawaan modal "Buat Event Baru" memakai jargon — severity: SEDANG

**Persona dan use-case:** Membuka modal untuk membuat event pertama; melihat isian yang sudah
terisi dan bingung apakah itu benar.

**Langkah reproduksi:**
1. `#/events` → ketuk `+ Buat Event Baru`.
2. Lihat isi modal.

**Harapan:** Modal singkat dengan 2–3 field wajib, teks bantuan, dan penanda wajib.

**Kenyataannya:** 8 field, 2 di antaranya sudah terisi jargon, 0 penanda wajib, 0 teks
bantuan.

**Evidence:**
```
modal w=336 h=767 y=42 muat_di_layar844=true scrollH=783 clientH=783 overflow_pjg=0
judul="Buat Event Baru"
  field id=ev-nama      label="Nama Event / Tugas"      value_awal=""                  required=false
  field id=ev-lokasi    label="Lokasi"                  value_awal=""                  required=false
  field id=ev-jenis     label="Jenis Tugas"             value_awal="Booth Event Balapan" required=false
  field id=ev-peran     label="Peran PIC"               value_awal="PIC Booth"         required=false
  field id=ev-tglmulai  label="Tanggal Mulai" type=date value_awal=""                  required=false
  field id=ev-tglselesai label="Tanggal Selesai" type=date value_awal=""                required=false
  field id=ev-status    label="Status" type=select-one  value_awal="draft"             required=false
  field id=ev-catatan   label="Catatan" type=textarea   value_awal=""
tanda_wajib_(*)=0 placeholder=1 teks_bantu=0
modal role=dialog aria-modal=none aria-label=none
tombol_X_tutup_di_pojok=0
tombol_modal "Batal" 68x42px y=744 ; "Simpan" 84x42px y=744
```
- **Yang sudah baik:** modal muat utuh di layar 844px tanpa scroll internal
  (`overflow_pjg=0`), semua field dan kedua tombol terlihat, ada `Batal`, dan validasi ada:
  `toast="Nama event wajib diisi" modal_masih_buka=true toast_y=791` → toast muncul di dalam
  layar (fold 844) dan **modal tetap terbuka** sehingga isian tidak hilang.
- **Yang bermasalah:** `Jenis Tugas` dan `Peran PIC` terisi default jargon; `aria-modal=none`,
  `aria-label=none` (tidak terbaca screen reader -temuan ini saya serahkan ke Agent 09); 0 teks bantuan.

**Dampak ke pengguna awam:** Ia akan menyimpan event dengan `Jenis Tugas = "Booth Event Balapan"`
dan `Peran PIC = "PIC Booth"` apa adanya, lalu bingung kenapa tampilannya terasa salah
untuk event yang ia kerjakan.

**Usulan perbaikan:**
- Kosongkan `Jenis Tugas` dan `Peran PIC`, ganti dengan `<select>` berisi pilihan umum
  ("Pameran dagang", "Bazar", "Sosialisasi", "Rapat", "Lainnya").
- Tandai `Nama Event / Tugas` dengan `*` + `required`, tambahkan 1 baris teks bantuan
  ("Boleh apa saja, nanti bisa diganti").
- Tambahkan `aria-modal="true"` dan `aria-labelledby` ke judul modal.

---

### [BUG-15] Angka "Rp 25.555.000" tidak wrap - halaman bisa digeser horizontal 50px (Dashboard) dan 218px (Layar Kerja) - severity: SEDANG

**Langkah reproduksi:**
1. Di 390px, buka `#/dashboard`, lalu coba geser halaman ke kanan.
2. Buka `#/events/evt-1`, lakukan hal sama.

**Harapan:** Tidak ada scroll horizontal sama sekali.

**Kenyataannya:** Ada, karena angka besar tidak diizinkan pecah baris.

**Evidence (Dashboard):**
```
docScrollWidth=425 clientWidth=375   -> 50px overflow
  <MAIN> [flex-1 w-full mx-auto max-w-[1800px] px-...] scrollW=425
  <DIV>  [grid grid-cols-2 lg:grid-cols-4 gap-4] scrollW=409
  <DIV>  [card card-pad p-6] w=164 scrollW=229 :: "Total PenjualanRp 25.555.000semua event"
  <DIV>  [card-dark p-6]      w=164 scrollW=229 :: "Saldo AkhirRp 36.670.000dana + penjualan − biaya"
stat[2] "Rp 25.555.000" fontSize=36px
```
**Evidence (Layar Kerja):**
```
docScrollWidth=608 clientWidth=375  -> 218px overflow
OVERFLOW_H_evdetail elemen_melebihi_390px=121
  ovf8:  DIV [lg:col-span-2] right=608 w=592 :: "Tambah Transaksi Pencatatan manual — total …"
  ovf1:  SELECT [select text-sm w-32] right=447 :: "Belum Berjalan Selesai"
  ovf2:  BUTTON [btn btn-sm btn-soft flex-none] right=552 :: "+ Dokumen"
  ovf3:  BUTTON [btn btn-sm btn-ghost flex-none] right=599 :: "✕"
```
- `.stat-num` font 36px + `Rp 25.555.000` = 229px di dalam kartu selebar 164px.
- Halaman `#/events` sendiri bersih: `OVERFLOW_H_events elemen_melebihi_390px=0` — jadi
  masalahnya spesifik di Dashboard & Layar Kerja.

**Dampak ke pengguna awam:** Di HP, geser horizontal yang tidak sengaja membuat tampilan terasa
"geser-geser" dan konten hilang di kanan tepi layar. Untuk yang tidak terbiasa, ini terlihat
seperti aplikasi rusak.

**Usulan perbaikan:**
- Pada <640px turunkan `.stat-num` ke `clamp(22px, 7vw, 36px)` dan izinkan wrap/geser angka
  (`word-break` atau `font-variant-numeric` + `white-space: nowrap` per token).
- Untuk blok milestone/seksi 02, ubah baris `select + tombol` menjadi `flex-wrap: wrap` dan
  tombol 32px dijadikan `flex-none` dengan baris penuh.
- Tambahkan regression check: `documentElement.scrollWidth <= clientWidth` pada 390px untuk
  semua 8 rute.

---

### [BUG-16] "Download Dokumen" adalah tautan mati tanpa feedback — severity: RENDAH

**Langkah reproduksi:**
1. Buka event yang `linkDokumen`-nya kosong (mis. `evt-2`, draft — kondisi default event
   baru).
2. Ketuk `Download Dokumen` di hero.

**Harapan:** Either membuka dokumen, atau memberi tahu "dokumen belum diunggah".

**Kenyataannya:** `href="#"` tanpa `data-action`, tanpa toast, tanpa perubahan apa pun —
memat. (Sudah saya uji: **tidak** melempar pengguna ke Dashboard, jadi ini murni soal
kebosanan.)

**Evidence:**
```
evt-2.linkDokumen="(kosong)"
tombol_ada=true href=# punya_data_action=null
hash_SESUDAH_klik="#/events/evt-2"
judul_SESUDAH_klik="Gelar UMKM Kota 2026"  perpindahan_dari_event_ke_dashboard=false
toast_memberi_penjelasan=0   (panjang teks toast = 0)
tombol_hero "Download Dokumen" href=# y=840 141x32px  (y=840 → 4px di bawah fold 844)
```

**Dampak ke pengguna awam:** "Kenapa tidak terjadi apa-apa?" Untuk user baru ini terasa
seperti aplikasi freeze. Tidak merusak data.

**Usulan perbaikan:** Kalau `linkDokumen` kosong, render tombol non-interaktif dengan label
"Download Dokumen (belum ada)" + `disabled`, atau arahkan ke input `linkDokumen` di seksi 01.
Naikkan posisinya ke atas fold sekalian (sekarang y=840 di 844).

---

### [BUG-17] Chip status siap-berangkat hanya dibedakan warna latar, teksnya sama-sama putih — severity: RENDAH

**Langkah reproduksi:**
1. Buka `#/events/evt-1`, baca 6 chip di hero.

**Harapan:** Jelas mana yang sudah selesai dan mana yang belum, sekilas.

**Kenyataannya:** Semua teks berwarna `rgb(255,255,255)`; pembeda hanya background
(`rgba(34,197,94,.22)` vs `rgba(255,255,255,.14)`). Bedanya nyata tapi halus, dan simbol
  centang (U+2713) vs bullet (U+2022) kecil (26px tinggi, 12px font).

**Evidence:**
```
chip "✓ SPPD lengkap"          bg=color(srgb 0.133 0.773 0.369 / 0.22) color=rgb(255,255,255) w=113 h=26
chip "• Item persiapan dibawa" bg=color(srgb 1 1 1 / 0.14)             color=rgb(255,255,255) w=163 h=26
chip "✓ Saldo aman"            bg=color(srgb 0.133 0.773 0.369 / 0.22) color=rgb(255,255,255) w=99  h=26
chip "• Siap berangkat"         bg=color(srgb 1 1 1 / 0.14)             color=rgb(255,255,255) w=119 h=26
```
- **Tidak salah baca di terang**, tapi di luar ruangan dengan layar redup, chip "hijau 22%"
  dan "putih 14%" di atas hero gelap bisa jadi nyaris sama.

**Usulan perbaikan:** Beri warna teks berbeda (`#BBF7D0` untuk selesai, `rgba(255,255,255,.75)`
untuk belum), tambahkan ikon berbeda (✓ / ○), dan sediikan ringkasan teks
"3 dari 6 siap".

---

### [BUG-18] Chip "3 event berjalan" tidak pernah muncul di HP — severity: RENDAH

**Langkah reproduksi:**
1. Buka `#/dashboard` di 390px.
2. Cari indikator jumlah event berjalan di header.

**Harapan:** Ada ringkasan singkat di header.

**Kenyataannya:** `#nav-chips` memakai `hidden sm:block`, jadi **tidak pernah tampil** di
bawah 640px.

**Evidence:**
```
nav_chips_display=none text="3 event berjalan"
```

**Dampak ke pengguna awam:** Kehilangan konteks cepat. Tidak fatal — informasinya tetap ada
di kartu "Event Berjalan 3".

**Usulan perbaikan:** Tampilkan sebagai badge kecil di hamburger pada mobile
(`☰ 3`), atau di dalam baris subjudul `h1`.

---

### [BUG-19] Halaman Event & Tugas tidak punya pencarian, padahal halaman Arsip punya — severity: RENDAH

**Langkah reproduksi:**
1. Buka `#/events` dan cari kotak cari.
2. Bandingkan dengan `#/archive`.

**Harapan:** Di HP, cara cepat menemukan event tertentu.

**Kenyataannya:** Hanya 4 chip filter status; nol input.

**Evidence:**
```
halaman events: input_cari_di_halaman_events=0  total_input_di_halaman_events=0
filter_chips=4 -> [Semua 74x38 (AKTIF) | Draft 63x38 | Berjalan 81x38 | Selesai 75x38]
halaman_events_docH=2838 = 3.4 layar   (9 kartu event)
halaman archive punya: input id="ar-q" placeholder="nama / lokasi / peran"
```
- Catatan positif: 4 chip status **muat semua dalam satu baris** di HP
  (74+63+81+75 = 293px < 375px) dan/+chip tinggi 38px masih wajar.

**Dampak ke pengguna awam:** Dengan 9 event (dan nanti 30+), menggulir 3,4 layar untuk
menemukan satu nama event adalah lambat. TidakYN blockers, tapi terasa lambat di HP.

**Usulan perbaikan:** Tambahkan `input` cari di atas chip filter, dengan
`placeholder="Cari nama event / lokasi"` dan filter langsung saat mengetik (tanpa perlu
ketuk tombol "Terapkan" seperti di Arsip).

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Tidak ada crash, tidak ada blank, tidak ada satu pun error JavaScript.** Semua 8 rute
  dirender penuh; probe saya dijalankan tanpa exception. Render selesai pada poll ke-14 s.d.
  ke-52 (≈0,3–1,0 detik setelah iframe load). Tidak ada halaman pertama yang kosong.
- **Halaman Event & Tugas punya CTA utama yang benar-benar terlihat di layar pertama HP:**
  `BTN_BUAT_EVENT y=225 w=153 h=43px tampil_di_layar1=true`. Ini satu-satunya tombol aksi
  di seluruh halaman pertama manapun yang bisa diklik — jadikan standar untuk halaman lain.
- **Modal "Buat Event Baru" dirancang rapi untuk HP:** 336x767px di y=42, `overflow_pjg=0`
  (tidak ada scroll internal yang menyesatkan), 8 field + tombol `Batal 68x42px` dan
  `Simpan 84x42px` semuanya terlihat tanpa menggulir.
- **Validasi tetap aman tanpa memaksa pengguna mengulang isi:** nama kosong ->
  `toast="Nama event wajib diisi"`, `modal_masih_buka=true`, dan toast muncul di y=791
  (masih di dalam layar 844). Tidak ada data yang hilang.
- **Hapus event punya konfirmasi yang jujur dan bisa dibatalkan:**
  `"Hapus event? Semua data SPPD, produk, penjualan & keuangan event ini ikut terhapus."` +
  `Batal 68x42px`. Terbukti `setelah_batal_dialog_tutup=true jumlah_event=9` → membatalkan
  benar-benar tidak menghapus apa pun. Jangan pernah dihapus tanpa konfirmasi.
- **Flowbar "Alur Kerja" rapi di HP:** 8 pil wrap jadi 2 baris,
  `clientW=341 scrollW=341` → nol scroll horizontal. Tiap pil punya label angka+yang jelas
  ("01 SPPD", "05 Penjualan") sehingga bahkan tanpa konteks sudah bisa menebak urutannya.
- **Badge status selalu pakai teks, bukan hanya warna** -
  `"<centang> Selesai"`, `"<titik> Berjalan"`, `"<titik> Draft"`. Bagus untuk pengguna low-vision.
- **Teks kecil 12px `#6B6B6B` di atas `#FFF` lolos WCAG AA** (rasio sekitar 5,2:1), masih terbaca di
  HP.
- **Tombol "Edit SPP" di hero memakai `scroll:to`, bukan pindah halaman** — pengguna tidak
  kehilangan posisi scroll-nya saat menyeberang dari hero ke seksi 01.
- **Dashboard sudah punya pengelompokan yang tepat** (`Event berjalan`, `Progress/Sedang
  berjalan`, `Disiapkan (draft)`) — ini yang paling "/nzak" dipakai. Sayang halaman
  `#/events` tidak mengikuti pola yang sama (BUG-09).
- **Routing hash bekerja stabil**, termasuk guard event tidak ditemukan →
  `location.hash = '#/events'` (tidak pernah blank).
- **Checkbox "Cek Persiapan" (13x13px) dibungkus `<label>` sel-baris**, jadi target sentuh
  efektifnya adalah seluruh baris, bukan kotak 13px-nya.

## Pertanyaan terbuka / perlu konfirmasi

- **Perlu konfirmasi:** di|$_ENV| Windows, `--window-size=390,844` terkunci minimum
  492px (`innerWidth=492`, `outerWidth=516`). Semua angka "390px" di catatan ini diambil
  lewat iframe 390x844 yang memuat `index.html` **asli** - jadi ini pengukuran layout
  Tailwind yang nyata, tapi bukan `window.innerWidth` proses Edge. Sudah dicek ulang bahwa
  media query bereaksi: `#topnav display=none`, `#mobilenav display=none` (hidden sampai
  diklik), `main maxWidth=1800px` → aturan `<640px` aktif. Saya yakin ini representatif,
  tapi perlu konfirmasi kalau tim mau 100% identik dengan device emulation.
- **Perlu konfirmasi:** chip check hero (BUG-17) — apakah perbedaan `rgba(34,197,94,.22)`
  vs `rgba(255,255,255,.14)` sudah cukup jelas bagi mata manusia? Angka warnanya memang
  berbeda jelas, tapi saya menilai riesgonya sedang, jadi saya taruh di RENDAH. Perlu test
  dengan pengguna nyata.
- **Perlu konfirmasi:** apakah 9 event seed memang *harus* ada di first-run? Kalau ya,
  minimal perlu label "CONTOH" per kartu. Kalau tidak, default-nya seharusnya kosong dengan
  empty state yang mengarahkan ke "+ Buat Event Baru".
- **Belum saya uji (di luar area persona ini):** alur setelah mengisi SPPD sebenarnya, koneksi
  jaringan buruk, dan perilaku saat `localStorage` penuh atau disabled (mode private Safari).
- **Tidak saya laporkan sebagai bug** (sudah dicek, ternyata aman): `Download Dokumen` dengan
  `href="#"` **tidak** melempar pengguna ke Dashboard - hash tetap `#/events/evt-2`.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Stabilitas / tidak crash | 5 | 0 exception di semua rute, tidak ada halaman blank, render < 1 detik |
| "Harus ngapain pertama" | 1 | Nol onboarding, nol tooltip, jawaban ada di halaman tersembunyi (Panduan, x=623px, butuh scroll 450px) |
| Pemahaman istilah oleh pemula | 2 | "PIC", "Saldo", "SPPD", "Milestone", "Wallet", "Dana Cair" muncul tanpa penjelasan; 0 `<details>`/`<abbr>`/`title` di seluruh app |
| Jejak "sudah sampai mana" | 2 | Ada angka % di hero, tapi (a) salah pada event kosong — 2 chip hijau palsu, (b) tidak sticky di halaman 25 layar, (c) 0 scroll-spy |
| Kenaikan mobile 390px | 2 | Layar pertama Dashboard tanpa satu pun aksi; Layar Kerja 25,3 layar; semua seksi terbuka default; 2 overflow horizontal (50px & 218px) |
| Jalan keluar / batal / kembali | 2 | `tombol_kembali=0` di semua rute; modal punya Batal (bagus) tapi Hapus event duduk 32px dari Edit di layar pertama |
| Kecepatan mencapai tugas pertama | 2 | Daftar event 3,4 layar tanpa pencarian; urutan tanggal oldest-first; tidak ada CTA di layar pertama Dashboard |
| Hal yang sudah benar (CTA terlihat, modal muat, validasi, konfirmasi hapus, badge bertulis) | 4 | Empat hal ini benar dan layak dipertahankan saat refactor |
| **SKOR PENGALAMAN KESELURUHAN** | **2 / 5** | Stabil tapi membingungkan: pengguna bertahan, tapi hanya karena tidak ada pilihan lain - bukan karena aplikasinya enak dipakai |

> Catatan honest: **tidak ada temuan KRITIS.** Tidak ada data yang hilang, tidak ada jalan
> buntu total, dan tidak ada hasil financialsalah diam-diam dari sisi perhitungan. Temuan
> terparah adalah indikator heroes yang menampilkan centang hijau pada event kosong — itu
> "hasil salah" tanpa error, jadi harus diprioritaskan meski severity-nya TINGGI, bukan
> KRITIS.
