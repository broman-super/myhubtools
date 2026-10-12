# AGENT-06 — Atasan / Direksi

> **Persona:** Kepala Dinas yang hanya punya 10-20 detik sebelum rapat dan tidak akan menggulir halaman · **Fokus:** Dashboard, Daftar Event, hero "Progres persiapan" dan flowbar Layar Kerja · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 0 |
| TINGGI | 3 |
| SEDANG | 6 |
| RENDAH | 3 |
| **Total** | **12** |

Saya butuh 18 detik untuk menjawab tiga pertanyaan atasan: "ada masalah?", "uangnya aman?", "siapa yang perlu takut?". Jawabannya: aplikasi ini tidak bisa menjawabnya.

Dashboard tidak punya satu pun penanda masalah. Saya scan 13 kata kunci termasuk "perlu perhatian", "Prioritas", "menunggu", "belum cair", "minus", "tidak cair", "kurang", "risiko", "gagal", dan tanda "!". Hasilnya nol ketemu.

Angka "Saldo Akhir Rp 36.670.000" terlihat meyakinkan di layar pertama, padahal di dalamnya ada Rp 10.500.000 dana anggaran yang belum tercatat masuk sepeser pun, serta Rp 13.850.000 sisa dana event yang statusnya sudah "Selesai". Lencana hijau "Saldo aman" menyala di 9 dari 9 event, termasuk event yang datanya masih kosong.

Navigasi utama Layar Kerja, yaitu 8 tombol "Alur Kerja", ada 281 sampai 381 px di bawah lipatan layar dan tidak sticky. Begitu dipakai sekali, dia hilang.

Di balik semua itu, performanya justru bagus (render 0,7 sampai 27 ms) dan angka antar halaman konsisten 100 persen. Jadi ini bukan bug hitungan, tapi masalah prioritas dan semantik.

---

## Environment yang dipakai

- Edge headless (`--headless=new`), profil unik per ukuran layar: `prof_ag06_1440`, `prof_ag06_1280`, plus `prof_ag06perf`.
- `localStorage.clear()` di paling awal `<head>` setiap harness, sehingga data selalu seed default dan tidak tercemar.
- Tailwind CDN dan Google Fonts terbukti ter-load. Dicek lewat `document.fonts.check('16px Geomini') = true` dan probe elemen `.grid` yang menghasilkan `display: grid`.
- Harness di `_QA_TMP/a06_atasan.html` (9 seksi tes, dirangkai dengan `setTimeout(20ms)`) dan `_QA_TMP/a06_perf.html`.
- Rute diuji: `#/dashboard`, `#/events`, `#/events/evt-1`, `#/events/ev-d1`, `#/events/ev-d2`, `#/events/ev-d3`, `#/events/ev-d5`, `#/events/ev-d6`, `#/reports`, `#/archive`, `#/guide`, `#/settings`.
- Catatan penting soal ukuran layar. Flag `--window-size=1440,900` menghasilkan `window.innerHeight = 761px` karena ada chrome browser. Flag `--window-size=1280,800` menghasilkan `innerHeight = 661px`. Semua angka "di bawah lipatan" memakai nilai innerHeight nyata, bukan angka nominal yang saya minta.
- Waktu render diukur di harness terpisah tanpa `--virtual-time-budget`, karena mode itu membekukan `performance.now()`. Bukti: tiga render berturut-turut untuk halaman 1.462 node semuanya melaporkan `0.0ms`.

---

## Temuan

### [BUG-01] Angka "Saldo" dihitung dari anggaran, bukan dari uang yang benar-benar masuk, dan lencana hijau "Saldo aman" menyala di semua event — severity: TINGGI

**Persona dan use-case:** Atasan membuka satu event, mau tahu "uangnya sudah cair semua belum, dan masih ada sisa dana?"

**Langkah reproduksi:**
1. Buka aplikasi dengan seed default.
2. Buka Layar Kerja event mana pun, baca baris sub-teks hero dan lencana di blok cek persiapan.
3. Bandingkan dengan angka internal: `store.financeSummary(id).danaCair` melawan `.danaAwal`.
4. Buka seksi 08 "Uang - Laporan", cari tabel perbandingan SPPD, Realisasi, dan Penjualan.

**Harapan:** "Saldo aman" berarti uang yang tercatat benar-benar ada di tangan. Kalau Dana Awal Rp 3.000.000 tapi Dana Cair Rp 0, hero harus merah dan menyebut "belum ada dana masuk".

**Kenyataannya:** Rumus saldo di `js/store.js:806` adalah `saldo: danaAwal + totalSales + totalKasAdj - pengeluaran`. `danaAwal` adalah anggaran SPPD, sedangkan `danaCair` adalah uang yang benar-benar dicatat masuk, dan `danaCair` tidak masuk rumus sama sekali. Field `sppd.realisasi` juga tidak pernah dipakai di perhitungan mana pun. Pencarian `\.realisasi` hanya menemukan penyimanan di `actions.js:122` dan tampilan di `pages.js:459` serta `pages2.js:506`.

**Evidence:**
```
evt-1  [berjalan]  danaAwal=2500000 danaCair=1500000 belumCair=1000000 saldo=4545000 heroSaldoAman=true
evt-3  [selesai]   danaAwal=3000000 danaCair=0       belumCair=0       saldo=3000000 heroSaldoAman=true
ev-d2  [diajukan]  danaAwal=1800000 danaCair=0       belumCair=0       saldo=1250000 heroSaldoAman=true
ev-d4  [berjalan]  danaAwal=2200000 danaCair=0       belumCair=0       saldo=1550000 heroSaldoAman=true
ev-d5  [disetujui] danaAwal=3500000 danaCair=0       belumCair=0       saldo=8570000 heroSaldoAman=true
ev-d6  [selesai]   danaAwal=5000000 danaCair=5000000 belumCair=0       saldo=10850000 heroSaldoAman=true
```
- Empat event punya `danaAwal > 0` tapi `danaCair = 0`. Total Rp 10.500.000 tetap ditampilkan sebagai saldo padahal belum ada satu rupiah pun tercatat masuk.
- `heroSaldoAman = true` di 9 dari 9 event. Indikator ini secara harfiah tidak pernah merah. Kodenya di `pages2.js:307`: `{ ok: !(s.danaAwal > 0 && fin.saldo < 0), label: 'Saldo aman' }`.
- Kontradiksi internal paling parah ada di `ev-d6`. Seed-nya berisi catatan "Rampung, laporan disetor, saldo 0." dan milestone "Laporan disetor, saldo 0.", dengan `sppd.realisasi: 4300000`. Tapi sistem menampilkan Rp 10.850.000. Nota internal bilang saldo nol, aplikasi bilang saldo sepuluh juta.

**Dampak ke pengguna awam:** Atasan menyetujui anggaran tanpa melihat Dana Cair. Waktu PIC kembali dari lapangan dengan sisa Rp 1.000.000 yang belum cair, seperti kondisi `evt-1` di seed, hero tetap hijau "Saldo aman". Angka Rp 10.850.000 di `ev-d6` bisa dibawa ke rapat sebagai "sisa dana", padahal memo event-nya sendiri sudah menyatakan saldo nol.

**Usulan perbaikan (deskriptif):** Pisahkan jadi tiga angka berlabel jelas di hero, yaitu "Dana Cair (sudah masuk)", "Belum Cair", dan "Sisa Saldo". Pecah cek "Saldo aman" menjadi dua cek terpisah, yaitu "Dana lengkap masuk" yang membandingkan `danaCair` dengan `danaAwal`, dan "Saldo tidak minus". Kalau `danaCair = 0` sementara `danaAwal > 0`, tampilkan merah secara eksplisit. Field `sppd.realisasi` kalau sudah diisi harus masuk hitungan, atau diberi label bahwa field itu tidak dipakai dalam perhitungan saldo.

---

### [BUG-02] Dashboard tidak menjawab "ada masalah?", nol penanda, dan 4 dari 9 event hilang dari halaman — severity: TINGGI

**Persona dan use-case:** Atasan buka `index.html`, punya 15 detik, cari satu hal yaitu ada apa yang perlu ditandai sebelum rapat.

**Langkah reproduksi:**
1. Buka `#/dashboard`.
2. Scan seluruh teks halaman untuk kata penanda masalah.
3. Scan `app.textContent` untuk nama-nama event yang ada di `store.events()`.

**Harapan:** Ada blok "Perlu Perhatian" atau "Menunggu Tindakan" di baris atas, berisi event berstatus `diajukan`, event `disetujui` yang dananya belum cair, dan event `selesai` yang masih punya sisa saldo.

**Kenyataannya:** Tidak ada satu pun blok seperti itu. Empat stat card semuanya netral dan tidak ada yang memakai warna peringatan. Empat dari sembilan event juga tidak muncul di halaman sama sekali.

**Evidence:**
```
Kata penanda masalah di teks dashboard: (TIDAK ADA SATU PUN)
dicek 13 kata: perlu perhatian, Perlu Perhatian, Prioritas, perhatian, menunggu,
               belum cair, minus, tidak cair, kurang, risiko, gagal, tanda "!"
total event DB=9 | TIDAK muncul di dashboard=4 ->
   Bazar Ramadan Ceria 2026       [selesai]
   Festival Kerajinan Nusantara   [diajukan]
   Dukungan Booth UMKM Regional   [disetujui]
   Pekan Inovasi Daerah           [selesai]
```
- Penyebabnya di `pages.js:96`. Blok bawah hanya memakai `next = evs.filter(function (e) { return e.status === 'draft'; })`, sehingga status `diajukan` dan `disetujui` tidak pernah dirender.
- `Festival Kerajinan Nusantara` berstatus `diajukan` dengan catatan "SPPD lengkap, menunggu approval." dan `sppd.status = 'diajukan'`. Ini persis event yang harus jadi prioritas atasan, dan ia tidak ada di layar.
- Sebaliknya, stat card "Event Berjalan = 3 dari 9 total" dan chip navigasi "3 event berjalan" keduanya tidak menghitung status `diajukan` dan `disetujui`, sehingga dua event yang sebenarnya hidup di lapangan hilang dari hitungan.

**Dampak ke pengguna awam:** Atasan percaya "3 event berjalan, semua baik-baik saja", padahal ada satu surat tugas yang menunggu persetujuan atasan dan satu event yang sudah disetujui tapi belum ada dana masuk. Keputusan rapat dibuat dari angka yang tidak lengkap.

**Usulan perbaikan (deskriptif):** Tambahkan baris pertama Dashboard berupa strip "Perlu perhatian (N)" yang berisi event dengan kondisi: status `diajukan`; status `disetujui` tanpa milestone aktif; `danaAwal > 0` dengan `danaCair < danaAwal`; status `selesai` dengan saldo bukan nol; dan `sppd.status` bukan `disetujui` maupun `selesai`. Perlebar hitungan "Event Berjalan" ke semua event non-terminal, yaitu bukan draft, bukan selesai, dan bukan dibatalkan.

---

### [BUG-03] Flowbar "Alur Kerja", satu-satunya navigasi delapan seksi, ada 281 px (1440x900) sampai 381 px (1280x800) di bawah lipatan dan tidak sticky sehingga hilang permanen setelah dipakai — severity: TINGGI

**Persona dan use-case:** Atasan mau langsung loncat ke "08 Laporan" untuk mengecek angka pertanggungjawaban, tidak mau menggulir 11.000 px.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Ukur `.flowbar` dengan `getBoundingClientRect()` pada posisi scroll 0, lalu bandingkan dengan `window.innerHeight`.
3. Klik tombol "08 Laporan" yang punya `data-sel="#ps-8"`. Handler-nya `scroll:to` di `js/actions.js:562-565`.
4. Ukur ulang posisi `.flowbar`.

**Harapan:** Flowbar dibuat `position: sticky` dengan `top: 64px` sesuai tinggi header, sehingga selalu menempel di bawah header. Ini pola navigasi seksi standar untuk halaman dengan delapan seksi.

**Kenyataannya:** Flowbar ada di bawah blok "Cek Persiapan" yang setinggi 502 px, dan `position: static`. Begitu dipakai sekali, dia terguling ke luar layar dan mustahil diklik lagi tanpa menggulir balik ke atas lebih dari 11.000 px.

**Evidence (1440x900, lipatan nyata 761 px):**
```
ev-head       top=97    bottom=206
HERO          top=224   bottom=492   (268px)  -> DI-FOLD, semua cek dan tombol terlihat
Cek Persiapan top=516   bottom=1018  (502px)  -> menutup 245px dari lipatan
FLOWBAR       top=1042  bottom=1092  (50px)   -> BAWAH-FOLD(+281px), wajib scroll dulu
              position=static   zIndex=auto   -> hilang begitu di-scroll
#ps-1         top=1114
#ps-8         top=11479   (jarak lompatan = 11.479px)
[setelah scroll ke #ps-8]  FLOWBAR top=-10311 bottom=-10261 -> DI LUAR LAYAR
```
**Evidence (1280x800, lipatan nyata 661 px):** FLOWBAR `top=1042` sehingga BAWAH-FOLD(+381px), `#ps-1 top=1114` atau +453px, `#ps-8 top=11555`, tinggi halaman 14.395 px atau 21,8 layar.

**Dampak ke pengguna awam:** Atasan yang mau cek laporan harus menggulir melewati 502 px checklist, menggulir lagi 281 px, mengeklik tombol, lalu undergo smooth scroll sejauh 11.479 px. Untuk pindah ke seksi berikutnya harus menggulir balik 11.479 px. Rata-rata 4 sampai 6 klik atau lintas layar untuk memeriksa satu angka.

**Usulan perbaikan (deskriptif):** Jadikan `.flowbar`_position sticky_ dengan `top: 64px` dan `z-index: 30` supaya menempel di bawah header sticky. Pindahkan blok "Cek Persiapan" ke sesudah flowbar, atau jadikan tab tersendiri, supaya urutan baca menjadi ev-head, hero, Alur Kerja, lalu seksi. Ganti handler `scroll:to` agar `scroll-margin-top` dihitung dari tinggi header ditambah flowbar sekitar 130 px, bukan angka tetap 96 px di `.psec`.

---

### [BUG-04] Blok "Cek Persiapan" setinggi 502 px disisipkan di antara hero dan flowbar, sehingga navigasi delapan seksi terdorong satu layar penuh — severity: SEDANG

**Persona dan use-case:** Sama dengan BUG-03. Ini akar penyebabnya.

**Langkah reproduksi:**
1. Buka `#/events/evt-1` pada posisi scroll 0.
2. Baca urutan elemen dari kode `pages2.js:344-346`, yaitu `return hero + '<div class="mb-6">' + ckSection(ev) + '</div>' + flowBar + ...`.
3. Ukur tinggi masing-masing blok.

**Harapan:** Konten paling penting untuk navigasi, yaitu flowbar, harus sedekat mungkin dengan hero.

**Kenyataannya:** Fungsi `ckSection` membakar 502 px di tengah halaman. Checklist itu konten operasional PIC, bukan konten atasan. Sekali lewat scroll, tidak ada cara kembali tanpa ke atas.

**Evidence:**
```
HERO bottom=492
Cek Persiapan: top=516 bottom=1018 h=502
  textContent lengkap tanpa spasi antar elemen:
  "Cek Persiapan15 / 24 selesaiDokumenSPPD dibuat (no surat, tujuan, kegiatan)
   SPPD disetujui atasanData instansi & NIP lengkapDokumen"
  isi = judul "Cek Persiapan" + badge "15 / 24 selesai" + grid sm:grid-cols-2
        berisi 4 kategori (kode pages2.js:364: Dokumen, Logistik, Keberangkatan, Laporan)
        total 24 item checklist
FLOWBAR top=1042   (jarak dari hero = 550px; jarak dari lipatan = 281px di 1440x900,
                    381px di 1280x800)
#ps-1 top=1114
```
Status saat ini untuk `evt-1` adalah 15 dari 24 checklist selesai, jadi sembilan butir tersisa adalah pekerjaan PIC, bukan sesuatu yang perlu dilihat direksi sebelum rapat.

**Dampak ke pengguna awam:** Atasan mengira aplikasinya error karena delapan seksi yang katanya ada tidak terlihat, atau malah menyerah dan beralih ke WhatsApp.

**Usulan perbaikan (deskriptif):** Pindahkan `ckSection` ke bawah flowbar, idealnya menjadi seksi tersendiri misalnya "01b Cek Persiapan" yang secara bawaan terlipat. Alternatifnya, ringkas menjadi satu baris ringkasan "Cek Persiapan 15/24" dengan tombol perluas, sehingga hanya occupying sekitar 40 px.

---

### [BUG-05] Halaman Event tidak punya filter untuk status `diajukan` dan `disetujui`, sehingga 2 dari 9 event mustahil dicari, dan chip juga tidak menampilkan jumlah — severity: SEDANG

**Persona dan use-case:** Atasan mau melihat hanya event yang statusnya menunggu persetujuan dirinya.

**Langkah reproduksi:**
1. Buka `#/events`.
2. Hitung status yang ada di `store.events()`.
3. Baca chip filter `data-action="events:filter"` yang tersedia di DOM.

**Harapan:** Chip filter lengkap dan konsisten dengan data yang ada, minimal Semua, Draft, Diajukan, Berjalan, Disetujui, dan Selesai, masing-masing dengan jumlah.

**Kenyataannya:** Hanya ada empat chip. Dua status yang ada di data, yaitu `diajukan` dan `disetujui`, tidak punya chip. Fungsi filter-nya sendiri sebenarnya sehat, hanya tombolnya yang tidak ada. Lebihironis, Halaman Arsip punya tujuh opsi termasuk `diajukan` dan `disetujui` untuk data yang sama, jadi filter ada di satu halaman dan tidak ada di halaman lain.

**Evidence:**
```
status di DB = {"berjalan":3,"draft":2,"selesai":2,"diajukan":1,"disetujui":1} | total event=9
chip filter tersedia (4): semua="Semua"  draft="Draft"  berjalan="Berjalan"  selesai="Selesai"
STATUS DI DB TANPA CHIP = diajukan (1 event), disetujui (1 event)
[Uji nyata] dipaksa SPT.eventFilter('diajukan') lalu render
             -> 1 kartu muncul: Festival Kerajinan Nusantara, saldo Rp 1.250.000
             -> filter-nya BENAR, tombolnya yang tidak ada
chip "Semua"   innerHTML="Semua"    tanpa angka jumlah
chip "Draft"   innerHTML="Draft"    tanpa angka jumlah
chip "Berjalan" innerHTML="Berjalan" tanpa angka jumlah
chip "Selesai" innerHTML="Selesai"  tanpa angka jumlah
kode: pages.js:112 (chip 4 opsi)  vs  pages.js:573 (Arsip 7 opsi)
```
Urutan tampilannya juga monoton, dari tanggal paling awal ke paling akhir, dan event `selesai` justru diletakkan paling atas. Tidak ada urutan prioritas.

**Dampak ke pengguna awam:** Atasan harus memilih Semua, lalu menggulir ke bawah untuk menemukan Festival Kerajnannya di kartu keempat. Kalau nanti ada 30 event, dia tidak akan menemukannya sama sekali.

**Usulan perbaikan (deskriptif):** Turunkan daftar status dari satu konstanta bersama, misalnya `STORE.STATUS_EVENT = ['draft','diajukan','berjalan','disetujui','selesai','dibatalkan']`, lalu pakai untuk chip Halaman Event, select Halaman Arsip, dan lencana status, supaya tidak bisa lagi tidak sinkron. Tambahkan jumlah di dalam chip, misalnya "Diajukan 1". Tambahkan urutan bawaan Prioritas, yaitu `diajukan`, lalu `disetujui`, lalu `berjalan`, lalu `draft`, lalu `selesai`.

---

### [BUG-06] Angka "Saldo Akhir Rp 36.670.000" menjumlahkan saldo sembilan event tanpa pemisahan, dan Rp 13.850.000 atau 37,8 persen di antaranya adalah sisa dana event yang sudah Selesai — severity: SEDANG

**Persona dan use-case:** Atasan membaca satu angka besar di atas dan menyimpulkan "Rp 36 juta aman semua".

**Langkah reproduksi:**
1. Baca stat card keempat di Dashboard.
2. Jumlahkan saldo per event dari Halaman Event.
3. Pisahkan mana yang berstatus `selesai`.

**Harapan:** Angka agregat disertai keterangan pecahan, yaitu berapa saldo event aktif, berapa sisa dana event selesai yang belum disetor, dan berapa saldo negatif.

**Kenyataannya:** Ketiga hal itu tidak ada. Hanya satu angka besar, dengan sub-label "dana + penjualan - biaya", di dalam kartu gelap. Label yang sama di Halaman Rekap Global berbeda kata, yaitu "Saldo Akhir" di Dashboard dan "Saldo Total" di Rekap Global, dengan sub-label berbeda juga. Perlakuan visualnya pun berbeda: Dashboard selalu gelap karena pemanggilannya `statCard(..., true)`, sedangkan Rekap Global hanya gelap kalau saldo negatif, yaitu `statCard(..., rep.totalSaldo < 0)`.

**Evidence:**
```
DASHBOARD stat-num  = ["Dashboard","3","Rp 25.555.000","Rp 11.360.000","Rp 36.670.000"]
REKAP GLOBAL stat-num= ["Rekap Global","Rp 25.555.000","Rp 11.360.000","Rp 36.670.000","9"]
EVENT LIST, saldo per kartu:
  Bazar Ramadan Ceria        [Selesai]    = Rp  3.000.000
  Pameran UMKM Nusantara      [Berjalan]   = Rp  4.545.000
  Gelar UMKM Kota 2026        [Draft]      = Rp          0
  Sosialisasi UMKM Kota       [Draft]      = Rp          0
  Festival Kerajinan Nusantara [Diajukan]   = Rp  1.250.000
  Expo Produk Lokal 2026      [Berjalan]   = Rp  6.905.000
  Kunjungan Mitra Sektor      [Berjalan]   = Rp  1.550.000
  Dukungan Booth UMKM Regional[Disetujui]  = Rp  8.570.000
  Pekan Inovasi Daerah        [Selesai]    = Rp 10.850.000
  ------------------------------------------------------------------
  TOTAL = Rp 36.670.000  (cocok persis dengan Dashboard)
  Sisa dana event SELESAI = 3.000.000 + 10.850.000 = Rp 13.850.000 (37,8 persen)
```
Catatan positif: angka antar halaman konsisten 100 persen dan tidak ada bug selisih angka. Yang salah adalah makna dan labelnya.

**Dampak ke pengguna awam:** Rp 13.850.000 sisa dana dari event yang sudah selesai terkonsentrasi jadi satu kalimat "saldo aman Rp 36 juta". Justru angka itu yang paling perlu ditindak, karena uang pemerintah belum disetor.

**Usulan perbaikan (deskriptif):** Pecah stat card keempat menjadi dua, yaitu "Saldo Event Aktif" dan "Sisa Dana Belum Disetor" untuk event `selesai` dengan saldo bukan nol. Samakan label di Dashboard dan Rekap Global memakai satu konstanta yang sama. Selaraskan juga perlakuan visual, yaitu merah kalau ada saldo negatif atau ada sisa yang belum disetor, di kedua halaman.

---

### [BUG-07] Panel Progress di Dashboard hanya menampilkan satu dari empat event yang punya milestone aktif, tanpa penjelasan — severity: SEDANG

**Persona dan use-case:** Atasan mau tahu kegiatan mana yang sedang berjalan di lapangan.

**Langkah reproduksi:**
1. Buka `#/dashboard` dan baca panel kanan bernama Progress.
2. Bandingkan dengan `store.milestones(e.id)` untuk semua event.

**Harapan:** Daftar pendek event yang sedang berjalan, atau setidaknya angka "4 event punya tahap aktif" supaya atasan tahu ada tiga yang terlewat.

**Kenyataannya:** Kode `pages.js:50-52` memakai `evs.forEach` dan berhenti diam-diam lewat flag `!anyMs`, sehingga event pertama yang ketemu menang. Tidak ada penghitung dan tidak ada teks "dan 3 lainnya".

**Evidence:**
```
Panel Progress: "Sedang berjalan | Pameran UMKM Nusantara Expo 2026 | 40% |
                Tahap aktif: Event H-1 | 2 dari 5 selesai (40%)"
link: #/events/evt-1/roadmap
Milestone berstatus aktif per event:
  evt-1  aktif = "Event H-1"   (2/5 selesai, 40%)  <-- yang ditampilkan
  ev-d2  aktif = "Berangkat"   (1/5 selesai, 20%)  <-- TIDAK ditampilkan, statusnya diajukan
  ev-d3  aktif = "Event (H-0)" (2/5 selesai, 40%)  <-- TIDAK ditampilkan
  ev-d4  aktif = "Berangkat"   (1/4 selesai, 25%)  <-- TIDAK ditampilkan
```
Jadi tiga dari empat event yang sedang aktif di lapangan tidak punya tempat di panel satu-item itu. Ironisnya `ev-d2` yang berstatus `diajukan` justru punya tahap Berangkat yang aktif, dan tidak ada validasi yang mencegah itu.

**Dampak ke pengguna awam:** Tulisan "Progress 40%" di Dashboard dibaca sebagai progress semua event, padahal itu cuma `evt-1`. Kalau PIC-nya sedang berada di lapangan, atasan tidak akan tahu ada kegiatan lain yang berjalan.

**Usulan perbaikan (deskriptif):** Ubah panel menjadi daftar mini semua event yang punya milestone aktif, berisi nama, persentase, dan tahapnya, diurutkan dari yang paling lama aktif. Kalau hanya mau menampilkan satu, berikan teks yang jujur, misalnya "Fokus: Pameran UMKM. Tiga event lain juga aktif". Tambahkan validasi di `saveEvent` dan `saveMilestone` agar status `draft` dan `diajukan` tidak bisa punya milestone berstatus `aktif`.

---

### [BUG-08] Jumlah cek di hero berubah-ubah antara 4 dan 6, sehingga event tanpa aset terlihat lebih bersih padahal belum pernah diperiksa — severity: SEDANG

**Persona dan use-case:** Atasan membandingkan jumlah centang hijau antar event untuk melihat mana yang siap.

**Langkah reproduksi:**
1. Buka tujuh event berbeda.
2. Hitung elemen `hero .hero-checks span` per event, dan catat mana yang hijau.

**Harapan:** Jumlah cek konstan, misalnya enam, supaya bisa dibandingkan. Kalau tidak bisa dinilai, tampilkan abu dengan label "belum dinilai".

**Kenyataannya:** Kode `pages2.js:309` bersyarat `if (eps.length > 0 || items.length > 0)`. Event tanpa produk dan tanpa item preparation kehilangan dua cek paling kritikal, yaitu "Siap berangkat" dan "Pulang tuntas". Efeknya persis terbalik: event yang belum diisi sama sekali terlihat paling bersih.

Selain itu, cek "Item persiapan dibawa" di `pages2.js:306` ditulis `ok: items.length === 0 || itemDone === items.length`, jadi nol item dianggap lulus. Inilah alasan `evt-2` dan `ev-d1`, yang keduanya draft dan kosong, tetap menampilkan centang hijau.

**Evidence:**
```
evt-1  produk=3 item=3 -> check=6 hijau=3 abu=3 | HIJAU: SPPD lengkap, Produk dicatat
                                                    ABU: Item persiapan dibawa
                                                    HIJAU: Saldo aman
                                                    ABU: Siap berangkat, Pulang tuntas
evt-2  produk=0 item=0 -> check=4 hijau=2 abu=2 | ABU: SPPD lengkap, Produk dicatat
                                                    HIJAU: Item persiapan dibawa, Saldo aman
evt-3  produk=0 item=0 -> check=4 hijau=3 abu=1 | HIJAU: SPPD lengkap, Item persiapan dibawa,
                                                              Saldo aman  <== 3 dari 4 HIJAU
                                                    ABU: Produk dicatat
ev-d1  produk=0 item=0 -> check=4 hijau=2 abu=2 | sama seperti evt-2
ev-d2  produk=0 item=2 -> check=6 hijau=1 abu=5 | hanya HIJAU: Saldo aman
ev-d5  produk=2 item=2 -> check=6 hijau=5 abu=1
ev-d6  produk=3 item=3 -> check=6 hijau=5 abu=1
```
`evt-3` atau Bazar Ramadan berstatus Selesai, punya `danaAwal=3.000.000`, `produk=0`, `item=0`, `milestone=0/0`, dan hero-nya tiga dari empat cek hijau. `ev-d1` yang berstatus draft dan seluruhnya kosong tetap hijau di Item persiapan dibawa dan Saldo aman.

**Dampak ke pengguna awam:** Hijau berarti kosong. Atasan melihat event draft yang kosong dan berpikir sudah aman, padahal sistemnya sebenarnya tidak punya cukup data untuk memeriksa.

**Usulan perbaikan (deskriptif):** Selalu render enam cek. Untuk cek yang tidak bisa dinilai, pakai kelas netral abu-abu solid dengan label "Belum dinilai" dan atribut `title` yang menjelaskan prasyaratnya. Pisahkan gradasi warna: hijau berarti lulus, kuning berarti perlu dilengkapi, merah berarti gagal, abu berarti belum bisa dinilai. Tambahkan hitungan ringkas di hero, misalnya "3 dari 6 siap".

---

### [BUG-09] Di 1280x800 angka dan kartu pertama sudah terpotong: panel Progress kepotong 44 px, kartu event ketiga kepotong 197 px, dan hanya 1 dari 9 kartu Daftar Event yang utuh — severity: SEDANG

**Persona dan use-case:** Laptop atasan 1280x800, kelas ThinkPad T480, bukan layar besar. Desktop kantornya 1920, tapi laptopnya 1280.

**Langkah reproduksi:**
1. Jalankan harness dengan `--window-size=1280,800`, yang menghasilkan lipatan nyata 661 px.
2. Bandingkan `getBoundingClientRect().bottom` tiap kartu dengan `window.innerHeight`.
3. Ulangi dengan `--window-size=1440,900`, lipatan nyata 761 px, sebagai pembanding.

**Harapan:** Empat stat card, semua kartu Event Berjalan, dan panel Progress muat dalam satu layar, karena itu inti dari 15 detik pertama.

**Kenyataannya:** Yang pertama terpotong adalah kartu event ketiga, yaitu Kunjungan Mitra Sektor. Panel Progress di kolom kanan justru ikut terpotong 44 px, sehingga teks "2 dari 5 selesai" hilang.

**Evidence (1280x800, lipatan 661 px):**
```
app scrollHeight = 1183
stat card [0..3]  top=181 bottom=359 h=178 -> semua DI-FOLD, OK
  [0] "Event Berjalan"    = "3"             | top=181 bottom=359 | DI-FOLD
  [1] "Total Penjualan"   = "Rp 25.555.000" | top=181 bottom=359 | DI-FOLD
  [2] "Total Pengeluaran" = "Rp 11.360.000" | top=181 bottom=359 | DI-FOLD
  [3] "Saldo Akhir"       = "Rp 36.670.000" | top=181 bottom=359 | DI-FOLD
kartu event [4] Pameran UMKM    top=423 bottom=653 -> utuh
kartu event [5] Expo Produk     top=423 bottom=653 -> utuh
kartu event [6] Kunjungan Mitra top=669 bottom=858 -> TERPOTONG 197px, top-nya +8px di bawah lipatan
Panel Progress (watch-stat)      top=423 bottom=705 -> TERPOTONG 44px
Draft "Gelar UMKM Kota 2026"    top=941  -> BAWAH-FOLD(+280px)
Banner "Prototype"               top=1156 -> BAWAH-FOLD(+495px)
Halaman Daftar Event: "kartu event yang utuh di atas lipatan = 1 dari 9" (scrollHeight = 2329px)
```
**Evidence (1440x900, lipatan 761 px):** app `scrollHeight=1143`, stat card `top=181 bottom=319 h=138` semua DI-FOLD. Kartu `[6] Kunjungan Mitra bottom=818` sehingga TERPOTONG 57 px. "kartu event utuh = 2 dari 9". Draft card `top=901` sehingga BAWAH-FOLD(+140 px). Banner Prototype `top=1116` sehingga BAWAH-FOLD(+355 px).

Jadi di kedua ukuran standar, event yang sedang berjalan selalu menjadi yang pertama hilang, dan di 1280x800 panel Progress ikut rusak.

**Dampak ke pengguna awam:** Atasan yang terbiasa melihat tiga kartu event utuh di layar 1920 akan membuka laptop 1280x800 dan langsung menyimpulkan hanya ada satu event yang jalan, padahal ada tiga.

**Usulan perbaikan (deskriptif):** (a) Buat stat card lebih kompak, dari `p-6` ke `p-4` dan dari `text-4xl` ke `text-3xl`, sehingga tinggi sekarang 178 px bisa turun ke sekitar 120 px. (b) Ubah grid Event Berjalan dari `sm:grid-cols-2` menjadi satu kolom kartu ringkas, atau baris horizontal yang bisa digulir, supaya tiga event muat. (c) Pindahkan panel Progress ke baris penuh di bawah stat card pada breakpoint `lg`, supaya tidak menjadi kolom sempit yang tinggi. (d) Kurangi tinggi halaman Daftar Event: kartu saat ini 237 sampai 238 px dan bisa jadi sekitar 150 px dengan memadatkan lokasi dan tanggal jadi satu baris.

---

### [BUG-10] Flowbar tidak punya status aktif atau scroll-spy, dan tidak ada penanda jumlah masalah per seksi — severity: RENDAH

**Persona dan use-case:** Atasan setelah melompat ke seksi 08 ingin tahu sedang di seksi mana, sekaligus tahu seksi mana yang bermasalah.

**Langkah reproduksi:**
1. Buka `#/events/evt-1`.
2. Periksa delapan elemen `.flow-pill`: kelas, atribut ARIA, dan isi.
3. Klik salah satu, lalu periksa apakah ada perubahan state.

**Harapan:** Tombol yang sedang dilihat berubah warna dan mendapat `aria-current="page"`. Tombol bermasalah punya lencana merah berisi jumlah, misalnya "04 Item 2".

**Kenyataannya:** Kedelapan tombol identik, tanpa state, tanpa ARIA, dan tanpa tooltip.

**Evidence:**
```
pill=8
 [0] "01 SPPD"      sel=#ps-1 top=1053 w=71 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
 [1] "02 Jadwal"    sel=#ps-2 top=1053 w=79 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
 [2] "03 Produk"    sel=#ps-3 top=1053 w=80 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
 [3] "04 Item"      sel=#ps-4 top=1053 w=63 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
 [4] "05 Penjualan" sel=#ps-5 top=1053 w=95 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
 [5] "06 Kas"       sel=#ps-6 top=1053 w=61 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
 [6] "07 Pulang"    sel=#ps-7 top=1053 w=79 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
 [7] "08 Laporan"   sel=#ps-8 top=1053 w=86 h=28 | active? false | aria-current=- | penanda? TIDAK | title? -
label "Alur Kerja" top=1059 left=45 (pill pertama top=1053, jadi label dan pill satu baris)
```
Varian yang sama juga dipakai di `tabPersiapan` pada `pages2.js:404` dengan label "Alur Persiapan".

**Dampak ke pengguna awam:** Atasan tidak tahu lagi sedang berada di bagian mana. Untuk atasan yang bolak-balik antara 05 Penjualan dan 08 Laporan, dia harus membaca ulang sub-teks seksi tiap kali.

Tambahan: nama seksi tidak konsisten antara flowbar dan judul seksi. Tombol menyebut "01 SPPD" tetapi judul seksi di `pages2.js:348` adalah "01 SPPD dan Dana Cair". Tombol "02 Jadwal" sedangkan judulnya "02 Jadwal dan Milestone" di `pages2.js:349`.

**Usulan perbaikan (deskriptif):** Tambahkan `IntersectionObserver`, atau dengarkan event scroll, untuk menandai tombol yang seksi-nya sedang terlihat, lalu tambahkan kelas `.active` dan `aria-current="true"`. Beri tiap tombol lencana kecil berisi jumlah item yang belum beres di seksi itu, dihitung dari data yang sudah ada, misalnya pada 04 Item dengan `itemDone !== items.length`. Tambahkan atribut `title` berisi sub-teks seksi, misalnya "3 item, 2 dibawa", supaya hover memberi konteks tanpa perlu klik.

---

### [BUG-11] Klik tombol trigger smooth scroll sejauh 11.479 px, dan tidak ada umpan balik kalau seksi tujuan sedang terlipat — severity: RENDAH

**Persona dan use-case:** Klik 08 Laporan dari atas halaman.

**Langkah reproduksi:**
1. Hitung `getBoundingClientRect().top + pageYOffset` untuk `#ps-8`, hasilnya 11.479 px.
2. Klik tombolnya. Handler `scroll:to` di `js/actions.js:562-565` memakai `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
3. Buka `#ps-4`, tambahkan kelas `closed`, ukur ulang tingginya, lalu klik tombol 04 Item.

**Harapan:** Lompatan tidak terlalu jauh, atau setidaknya ada konteks di titik tujuan.

**Kenyataannya:** Lompatan halus sepanjang 11.479 px. Dan kalau seksi tujuan terlipat, pengguna mendarat di header setinggi 48 px dan harus mengeklik tombol buka lagi tanpa tahu bahwa itu tombolnya.

**Evidence:**
```
jarak yang harus ditempuh scroll = 11479px  (dan 11555px di 1280x800)
[scrollTop=11479] #ps-8 top=0 -> TERTLIHAT
   Catatan: scrollIntoView asli menghormati .psec scroll-margin-top:96px sehingga tidak tertutup.
   Pada penggunaan normal terpotong 0 px, jadi ini TIDAK saya laporkan sebagai bug.
[scrollTop=11479] FLOWBAR top=-10311 -> DI LUAR LAYAR
[scrollTop=11479] FLOWBAR top=-10331 -> tidak bisa dipakai lagi tanpa scroll balik 11.479px
[uji lipat] #ps-4 tinggi 1830px -> ditutup jadi 48px, 1798px tersembunyi
[uji lipat] tombol "04 Item" tetap melompat ke header seksi yang tertutup,
             jadi pengguna melihat isi tertutup tanpa teks "klik untuk buka"
```

**Dampak ke pengguna awam:** Menunggu animasi, mendarat di halaman yang terasa kosong, lalu mengira aplikasinya membeku.

**Usulan perbaikan (deskriptif):** Batasi lompatan halus. Kalau jaraknya lebih dari dua layar, pakai `behavior: 'auto'` supaya langsung lompat. Saat handler `scroll:to` dipanggil, periksa `document.querySelector(sel)`. Kalau punya kelas `closed`, buka otomatis dengan `classList.remove('closed')` dan set ikon buka sebelum melakukan scroll.

---

### [BUG-12] Halaman Daftar Event tidak punya pencarian, tidak ada urutan prioritas, dan chip filter tidak menampilkan jumlah — severity: RENDAH

**Persona dan use-case:** Atasan masuk dengan daftar sembilan event dan bertanya "mana yang perlu perhatian hari ini?"

**Langkah reproduksi:**
1. Buka `#/events`.
2. Hitung elemen `input` dan `select`, lalu cari kata prioritas.

**Harapan:** Setidaknya ada pencarian nama dan urutan Perlu Perhatian di bagian atas, serta chip yang berisi jumlah.

**Kenyataannya:** Halaman ini benar-benar tanpa kontrol apa pun selain empat chip dan tombol buat. Bandingkan dengan Halaman Arsip yang punya empat kontrol, yaitu status, bulan, tahun, dan cari kata. Halaman yang paling sering dipakai atasan justru tidak punya satu pun.

**Evidence:**
```
kartu event = 9
input cari di list = 0 | select = 0
ada kata Perlu/Prioritas/Perhatian? false
urutan tanggalMulai, naik apa adanya:
  0. 2026-03-02 selesai   Bazar Ramadan Ceria 2026
  1. 2026-04-22 berjalan  Pameran UMKM Nusantara Expo 2026
  2. 2026-05-16 draft     Gelar UMKM Kota 2026
  3. 2026-07-21 draft     Sosialisasi UMKM Kota
  4. 2026-08-10 diajukan  Festival Kerajinan Nusantara
  5. 2026-09-14 berjalan  Expo Produk Lokal 2026
  6. 2026-10-06 berjalan  Kunjungan Mitra Sektor
  7. 2026-11-12 disetujui Dukungan Booth UMKM Regional
  8. 2026-12-01 selesai   Pekan Inovasi Daerah
app scrollHeight = 2329px  (3,1x lipatan di 1440x900, 3,5x di 1280x800)
```
Catatan: urutan tanggal selalu naik atau terlama dulu, sehingga event yang sudah selesai justru ditempatkan paling atas. Untuk atasan yang butuh tahu sedang apa yang berjalan, daftar ini menyembunyikan `evt-1` di posisi kedua dan tiga event berjalan lain di posisi kelima sampai ketujuh.

**Dampak ke pengguna awam:** Harus menggulir 3,5 layar dan membaca setiap kartu satu per satu untuk mengetahui status apa pun.

**Usulan perbaikan (deskriptif):** Tambahkan input pencarian nama dan lokasi seperti di Halaman Arsip. Tambahkan urutan bawaan Prioritas, yaitu `diajukan`, lalu `disetujui` dengan dana belum cair, lalu `berjalan`, lalu `draft`, lalu `selesai`. Tambahkan jumlah di dalam chip. Tambahkan satu baris ringkas per kartu berisi "Dana Cair X dari Y" dan "Saldo", supaya kartu bisa dibandingkan tanpa klik.

---

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Angka antar halaman 100 persen konsisten.** Saya cek silang tiga tempat. Dashboard menunjukkan Rp 25.555.000, Rp 11.360.000, dan Rp 36.670.000. Rekap Global identik. Jumlah sembilan saldo kartu Event List persis Rp 36.670.000. Detail `evt-1` di hero menunjukkan Kas akhir Rp 4.545.000 dan sama dengan saldo kartu Event List. Tidak ada satu pun selisih pembulatan atau basis hitung yang berbeda.
- **Performa sangat baik dan tidak ada bug lambat.** Diukur dengan jam nyata, yaitu harness tanpa `--virtual-time-budget`. Kalibrasi loop 50 ms menghasilkan 721 ms untuk 172.238 iterasi, jadi jamnya tidak beku.
```
label                       renderJS ms   forcedLayout ms   html chars   nodes   scrollHeight
Dashboard                   27,00         36,20             5.948        105     1.569
Daftar Event                 2,00         16,00             9.733        209     1.851
Layar Kerja evt-1 run 1     14,10         89,50             69.858       1.462   14.883
Layar Kerja evt-1 run 2      7,50         29,70             69.858       1.462   14.883
Layar Kerja ev-d6            7,00         28,70             64.886       1.359   13.997
Rekap Global                 3,30          1,70             5.653        107     1.467
Arsip                       1,50          2,20             6.503        106     1.584
Panduan                      0,80          8,60             7.996         89     2.092
Pengaturan                   0,70          5,80             2.397         48     1.082
```
  Terberat sekitar 104 ms, yaitu 14,1 ditambah 89,5, dan termurah 0,7 ms. Tidak ada spinner dan tidak ada layout shift. Rasio HTML 70 KB dengan 1.462 node masih aman untuk prototype.
- **Empat stat card Dashboard terlihat tanpa scroll di kedua ukuran.** Pada 1440x900 posisinya `top=181 bottom=319` dengan tinggi 138 px, dan pada 1280x800 posisinya `top=181 bottom=359` dengan tinggi 178 px. Jadi keempatnya di atas lipatan 761 px dan 661 px. Judul Dashboard dengan Geomini 36 px juga terpotong di lipatan. Masalahnya bukan di baris paling atas, tapi di kedalaman halaman.
- **Lencana status event jelas dan berbeda satu sama lain. Ini bukan bug.** Fungsi `ui.badge` di `ui.js:42-51` memberi warna dan bentuk ikon berbeda: Draft abu dengan bulatan, Berjalan hitam dengan bulatan, Disetujui hijau dengan bulatan, Diajukan kuning dengan bulatan, Selesai biru dengan centang, Dibatalkan merah dengan silang, dan Belum abu dengan bulatan kosong. Diuji nyata di DOM, kartu event menampilkan lencana "Selesai", "Berjalan", "Draft", "Diajukan", dan "Disetujui" dengan warna serta bentuk yang jelas berbeda. Yang bermasalah adalah cara mencari status tersebut, lihat BUG-05, bukan tampilannya.
- **`scroll-margin-top: 96px` di `.psec` benar.** Saat `scrollIntoView` dipakai sungguhan, judul seksi mendarat 96 px dari atas, sedangkan header sticky hanya 65 px. Tidak ada seksi yang tertutup header.
- **Ringkasan status di dalam kartu event selalu akurat.** Sub-teks seksi selalu menyebut angka nyata, misalnya `#ps-1` menampilkan SPPD Disetujui, 2 rute, dan Dana cair Rp 1.500.000. `#ps-4` menampilkan 3 item dan 2 dibawa. `#ps-7` menampilkan Belum siap berangkat. Ini bagus karena setiap seksi punya penomoran dan sub-teks ringkas sendiri, jadi pengguna tidak perlu menebak isinya sebelum membuka.
- **Tombol lipat seksi benar-benar berfungsi.** Diuji `#ps-4` berubah dari 1.830 px menjadi 48 px saat ditutup, isi `psec-body` hilang, dan ikon berubah dari segitiga kanan ke segitiga bawah.
- **Fungsi filter status di Halaman Event dan Halaman Arsip benar-benar fungsional.** Saat dipaksa `eventFilter('diajukan')`, satu kartu yang benar muncul, yaitu Festival Kerajinan Nusantara dengan saldo Rp 1.250.000. Logikanya sehat, hanya tombolnya yang tidak ada.
- **Tidak ada kerentanan yang mengganggu di halaman atas.** Semua teks event di-escape lewat `ui.esc`, tidak ada `eval`, dan tidak ada `innerHTML` dari input mentah pada halaman yang saya uji.

## Pertanyaan terbuka / perlu konfirmasi

- **Perlu konfirmasi, paling penting:** apakah `financeSummary.saldo` yang memakai `danaAwal` atau anggaran adalah keputusan desain, atau bug? Kalau memang disengaja, perlu ada field kedua bernama Saldo Riil berbasis `danaCair`. Karena sekarang ini satu-satunya cara atasan mengetahui bahwa Rp 1.000.000 di `evt-1` belum cair adalah dengan membuka seksi 01 dan membaca blok Dana Cair secara manual. Saya menilai ini akar masalah utama BUG-01, tapi ini keputusan produk, bukan keputusan QA.
- **Perlu konfirmasi:** `ev-d6` punya catatan "saldo 0" dan `sppd.realisasi: 4.300.000`, tapi sistem menghitung Rp 10.850.000. Apakah `realisasi` yang tidak dipakai itu disengaja karena akan diisi manual di akhir periode, atau terlupa dipakai di rumus? Perlu diklarifikasi pihak produk sebelum temuan ini dinaikkan ke KRITIS.
- **Perlu konfirmasi:** status `diajukan` dan `disetujui` di `store.js:132` dan `store.js:142` adalah status resmi produk atau sisa data dummy? Kalau resmi, BUG-05 naik ke TINGGI karena 2 dari 9 event mustahil dicari dari halaman utama. Kalau hanya sisa dummy, minimal Halaman Arsip yang punya tujuh opsi perlu diseragamkan.
- **Tidak bisa diverifikasi secara headless:** animasi smooth scroll. `behavior: 'smooth'` tidak bergerak di headless, dengan `pageYOffset=0` setelah 300 kali polling, jadi durasi asli lompatan 11.479 px hanya estimasi. Perlu dicek manual di Edge atau Chrome desktop. Geometri akhir sudah saya verifikasi dengan akurat.
- **Tidak bisa diverifikasi:** kontras visual dan keterbacaan Geomini, karena headless tidak bisa membaca tangkapan layar. Semua temuan di sini berbasis `getBoundingClientRect`, `getComputedStyle`, dan teks DOM, sesuai aturan main.
- **Catatan minor, bukan bug:** dengan `--virtual-time-budget`, `performance.now()` dibekukan sehingga semua render melaporkan `0.0ms`. Harness QA berikutnya jangan mengukur performa di mode itu, harus dijalankan tanpa flag tersebut seperti yang saya lakukan di `_QA_TMP/a06_perf.html`.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Kecepatan buka Dashboard | 4 | Render 27 ms ditambah layout 36 ms, semua stat card di atas lipatan di dua ukuran layar, tidak ada spinner. Terasa instan. |
| Menjawab "ada masalah?" | 1 | 13 kata penanda masalah discan dan nol ketemu. Tidak ada blok prioritas dan tidak ada warna peringatan. Untuk persona yang punya 15 detik, ini nol informasi. |
| Kepercayaan angka, uang aman atau tidak | 1 | Lencana Saldo aman hijau di 9 dari 9 event termasuk event kosong. Saldo berbasis anggaran, bukan dana cair. Rp 10.500.000 tetap ditampilkan sebagai saldo padahal belum masuk sepeser pun. Angka ini bisa dipakai mengambil keputusan salah. |
| Menemukan event yang perlu takut | 1 | 4 dari 9 event tidak muncul di dashboard. Status diajukan dan disetujui tidak punya chip filter. Chip tanpa jumlah dan tanpa pencarian. Urutan selesai di awal. Butuh 3,5 layar scroll untuk pertanyaan sederhana. |
| Navigasi Layar Kerja atau flowbar | 2 | Delapan tombol ada, berfungsi normal, dan tidak tertutup header. Tapi ada 281 sampai 381 px di bawah lipatan, `position:static` jadi hilang setelah dipakai, tanpa active state, dan 11.479 px smooth scroll per lompatan. Setengah jalan. |
| Konsistensi angka antar halaman | 5 | Dashboard sama dengan Rekap Global sama dengan jumlah Daftar Event sama dengan detail, semua persis sampai rupiah. Ini fondasi yang sangat kuat, jangan dibongkar saat refactor. |
| Kesesuaian ukuran layar laptop 1280x800 | 2 | Panel Progress kepotong 44 px, kartu event ketiga kepotong 197 px, hanya 1 dari 9 kartu Daftar Event yang utuh. Desktop besar baik, laptop standar jelek. |
| Pembacaan status event | 4 | Lencana berwarna dengan ikon berbeda sudah jelas untuk Draft, Berjalan, Diajukan, Disetujui, Selesai, dan Dibatalkan. Yang hilang bukan keterbacaan, tapi cara mencarinya. |

**Rata-rata: 2,5 dari 5.** Kesimpulan: aplikasinya cepat dan angkanya konsisten. Masalahnya bukan aplikasi lambat atau rusak, tapi tidak memberi tanda peringatan saat ada yang salah. Prioritas perbaikan: BUG-01, lalu BUG-02, lalu BUG-03, karena ketiganya cepat diperbaiki dan berdampak langsung pada uang serta keputusan. Sisanya adalah polesan.
