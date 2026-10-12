# _01_INDEX_SINTESIS — Ringkasan 20 Laporan QA

> Sumber: 20 laporan `AGENT-01` … `AGENT-20` di folder ini. Semua angka severity diambil
> apa adanya dari tabel "Ringkasan" masing-masing laporan. Tidak ada temuan baru di dokumen ini.
> Tanggal kompilasi: 2026-10-01.

---

## 1. Ringkasan Eksekutif

### 1.1 Total temuan

| Severity | Jumlah | Keterangan |
|---|---|---|
| KRITIS | 18 | Ditemukan 9 dari 20 agent (03, 05, 07, 08, 13, 15, 16, 17, 20) |
| TINGGI | 111 | Ditemukan 20 dari 20 agent |
| SEDANG | 131 | Ditemukan 19 dari 20 agent |
| RENDAH | 57 | Ditemukan 19 dari 20 agent |
| **TOTAL** | **317** | dari 20 laporan, 13.943 baris teks QA |

### 1.2 Lima kalimat kondisi aplikasi secara keseluruhan

1. Aplikasi ini **tidak pernah crash saat dipakai normal** — nol exception JavaScript, semua 8 halaman ter-render penuh, performanya bagus (render 0,7–27 ms menurut Agent-06), dan angka dasarnya (rumus saldo, penjumlahan rekap global, round-trip export/import uang) **benar secara aritmetika**.
2. Yang rusak hampir seluruhnya bukan di lapisan hitung, tapi di lapisan **kepercayaan**: indikator "aman/lengkap" menyala hijau pada event kosong (Agent-01, 04, 06, 19, 20), empat angka SPPD yang harus saling cocok berdiri sendiri tanpa peringatan (Agent-02), dan dokumen cetak menampilkan dua angka saldo berbeda dalam satu halaman (Agent-04, 05, 14, 20).
3. Tiga dari 20 agent menguji jalur **"Pulihkan dari File"** dan semuanya menemukan bahwa satu klik pada file JSON yang tidak lengkap menghapus seluruh database secara permanen, tanpa konfirmasi dan tanpa auto-backup (Agent-05, 15, 16, 17, 20) — ini klaster temuan paling padat di seluruh laporan.
4. Sebagian besar aksi hapus (10–12 dari 14–16, tergantung cakupan agent) berjalan seketika **tanpa konfirmasi dan tanpa undo**, termasuk seluruh transaksi keuangan (Agent-03, 04, 05, 08, 11, 13, 16).
5. Di sisi kemudahan pakai, Layar Kerja adalah halaman **20–26 layar** di HP dengan 8 seksi terbuka semua, kontrol di bawah standar sentuh, dan nol penanda "langkah berikutnya" — hasilnya skor pengalaman keseluruhan rata-rata 2/5.

### 1.3 Tiga masalah paling sistemik

| # | Masalah | Kenapa paling sistemik | Bukti |
|---|---|---|---|
| 1 | **Tidak ada validasi berlapis di `importJSON`** — overwrite `DB` sebelum memvalidasi koleksi lain, tidak ada konfirmasi, tidak ada auto-backup, tidak ada rollback | Menyeluruhi seluruh model data (event, produk, penjualan, anggaran) dan menjatuhkan aplikasi ke white screen. Karena data hanya di `localStorage`, satu klik = kehilangan permanen tanpa jalur pemulihan. | Agent-05 KRITIS, 15 (2 KRITIS), 16 (4 KRITIS total), 17 (2 KRITIS), 20 (2 KRITIS) |
| 2 | **Tidak ada jejak audit maupun undo di lapisan data** — 0 dari 16 key DB punya `auditLog`, `createdAt`/`updatedAt` hilang di 9 dari 12 koleksi, dan setiap `delete*` langsung `filter()` tanpa snapshot | Mengubah semua temuan hapus dari "tidak ideal" menjadi "tidak bisa dipulihkan". Selama tidak ada jejak, tidak ada temuan lain yang bisa diverifikasi ke atasan atau auditor — termasuk laporan cetak. | Agent-05 TINGGI, 08 KRITIS, 16 TINGGI, 07 TINGGI |
| 3 | **Aturan "aman/lengkap" dipakai sebagai boolean yang menyesatkan** — `items.length === 0` dan `danaAwal === 0` sama-sama dianggap "aman", dan `danaCair` tidak pernah masuk rumus saldo | Menyebar ke Dashboard, hero Layar Kerja, daftar event, dan Rekap Global, jadi satu keputusan kode yang salah menciptakan 5 temuan berbeda di 5 agent berbeda. Tidak ada error yang terlihat — indikatornya justru tampil sangat meyakinkan. | `js/pages2.js:306-307` (Agent-01, 04, 06, 19, 20) |

---

## 2. Tabel Rekap Semua Agent

| # | File Laporan | Persona | Baris | Temuan | KRITIS | TINGGI | SEDANG | RENDAH |
|---|---|---|---|---|---|---|---|---|
| 01 | AGENT-01-user-baru-hp.md | User Baru Pengguna HP | 844 | 19 | 0 | 5 | 10 | 4 |
| 02 | AGENT-02-operator-surat-tugas.md | Operator Surat Tugas | 778 | 18 | 0 | 6 | 8 | 4 |
| 03 | AGENT-03-arneta-lapangan.md | Arneta Lapangan (PIC di HP) | 817 | 19 | 1 | 7 | 7 | 4 |
| 04 | AGENT-04-bendahara.md | Bendahara Events | 534 | 16 | 0 | 7 | 7 | 2 |
| 05 | AGENT-05-auditor.md | Auditor Internal | 1071 | 17 | 1 | 8 | 5 | 3 |
| 06 | AGENT-06-atasan-direksi.md | Atasan / Direksi | 510 | 12 | 0 | 3 | 6 | 3 |
| 07 | AGENT-07-admin-backoffice.md | Admin Backoffice | 770 | 18 | 3 | 6 | 7 | 2 |
| 08 | AGENT-08-user-senior.md | User Senior / Lanjut Usia | 1114 | 13 | 2 | 5 | 3 | 3 |
| 09 | AGENT-09-aksesibilitas.md | Penyandang Disabilitas | 423 | 16 | 0 | 4 | 11 | 1 |
| 10 | AGENT-10-alfabetisasi-rendah.md | Alfabetisasi Rendah | 949 | 29 | 0 | 10 | 13 | 6 |
| 11 | AGENT-11-tidak-sabar.md | Tidak Sabar | 366 | 10 | 0 | 4 | 4 | 2 |
| 12 | AGENT-12-power-user.md | Power User | 485 | 14 | 0 | 6 | 7 | 1 |
| 13 | AGENT-13-multi-event.md | Organizer Multi-Event | 643 | 19 | 1 | 5 | 10 | 3 |
| 14 | AGENT-14-qris-emoney.md | Pedagang QRIS & E-Money | 818 | 14 | 0 | 4 | 6 | 4 |
| 15 | AGENT-15-salin-tempel.md | Pencinta Salin-Tempel | 552 | 11 | 2 | 4 | 3 | 2 |
| 16 | AGENT-16-khawatiran-data-hilang.md | Pengguna Traumatis Kehilangan Data | 704 | 17 | 4 | 5 | 5 | 3 |
| 17 | AGENT-17-lintas-perangkat.md | Lintas Perangkat | 244 | 7 | 2 | 2 | 1 | 2 |
| 18 | AGENT-18-pelajar-baru.md | Pelajar / Magang Baru | 424 | 14 | 0 | 7 | 5 | 2 |
| 19 | AGENT-19-orang-sibuk.md | Orang Sibuk | 649 | 12 | 0 | 5 | 5 | 2 |
| 20 | AGENT-20-skeptikus.md | Sang Skeptikus | 783 | 22 | 2 | 8 | 8 | 4 |
| | **TOTAL** | **20 persona** | **13.943** | **317** | **18** | **111** | **131** | **57** |

---

## 3. Temuan Lintas-Agent (Kelompokkan)

### T1. Penghapusan data tanpa konfirmasi / tanpa undo
**Agent:** 2, 3, 4, 5, 7, 8, 11, 13, 16, 19 (10 agent)

Dari 14–16 aksi hapus yang ada, hanya 4 yang memakai konfirmasi (`event:delete`, `product:delete`, `master:catdel`, `data:reset`). Sisanya — termasuk seluruh transaksi uang (`sale:delete`, `expense:delete`, `kasadj:delete`, `danaCair:delete`, `budget:delete`) — langsung `store.delete*()` lalu `A.reload()` tanpa dialog, tanpa undo, dan toast-nya berwarna sukses. Agent-08 mengukur langsung dengan klik nyata: 10 dari 11 action hapus di Layar Kerja menghapus data seketika. Agent-11 mengukur 0 ms. Agent-05 mencatat menghapus `sal-2` menurunkan penjualan Rp 3.480.000 → Rp 2.430.000 dalam satu ketukan.
- Sumber: `js/actions.js:164-167, 275-279, 297-300, 314-317, 335-338, 373-376, 404-407, 447-450, 463-466` (Agent-08); `js/actions.js:70-74` vs `:62-68` (Agent-07); `js/actions.js:447-451, 463-465` (Agent-04).
**Saran:** satu helper `konfirmasiHapus({judul, pesan, dampak, onOk})` untuk semua `*:delete`/`*:remove`, teks konfirmasi wajib menyebut nominal dan identitas record, plus toast "Urungkan" 8–10 detik. Pola `ui.confirm` sudah ada di `js/ui.js:94-109` — tinggal diterapkan konsisten.

### T2. Impor (`importJSON`) merusak atau menimpa data
**Agent:** 4, 5, 10, 15, 16, 17, 20 (7 agent)

Klaster temuan paling padat di seluruh laporan. `importJSON` melakukan `DB = obj` **sebelum** memvalidasi koleksi lain, jadi file JSON yang hanya berisi `{"events":[...]}` langsung mengganti seluruh database, membuat `sales()`/`products()`/`financeSummary()` melempar error, dan localStorage ikut tertimpa permanen begitu satu operasi biasa berikutnya berjalan. Tidak ada `ui.confirm`, tidak ada auto-backup, tidak ada rollback, dan pesan yang tampil ke user adalah bahasa mesin mentah. Agent-04 menemukan subtipe lain: nominal berformat teks Excel (`"1.250.000"`) diterima lalu jadi `Rp 0` karena semua perhitungan memakai `Number(x) || 0`.
- Sumber: `js/store.js` `importJSON` (Agent-05, 15, 16, 20); validasi hanya `Array.isArray(obj.events)` (Agent-15); `js/actions.js` `data:import` (tanpa `ui.confirm`) (Agent-05); `js/ui.js:17-20` (`ui.fmt` memakai `Number(n) || 0`) (Agent-04).
**Saran:** validasi seluruh koleksi di objek salinan sebelum commit, tolak file yang koleksi intinya kosong, bungkus dengan `ui.confirm` yang menyebut jumlah event sebelum/sesudah, dan tulis `sppd-autobackup-<tanggal>-<jam>.json` ke slot localStorage terpisah sebelum menimpa.

### T3. Status event / SPPD hilang atau tidak bisa disimpan (dropdown)
**Agent:** 2, 6, 7, 13, 18, 20 (6 agent)

Dua bug dropdown terpisah tapi berdekatan. (a) Dropdown "Status Alur" SPPD selalu `selectedIndex = 0` sehingga satu klik "Simpan SPPD" menurunkan SPPD yang sudah **Disetujui** menjadi **Draft**, dan cek hero berubah dari ✓ jadi abu. (b) Dropdown status Event tidak punya opsi `diajukan`/`disetujui` padahal keduanya ada di seed, sehingga `sel.value = ev.status` mengosongkan select dan `event:save` menulis string kosong — badge jadi titik kosong dan event tidak cocok filter mana pun. Agent-18 juga menemukan ada **dua kosakata status berbeda** di aplikasi yang sama dan Panduan tidak menjelaskannya.
- Sumber: `js/pages.js:471` (`<select id="spp-status">` tanpa atribut `selected`) dan `js/actions.js:119` yang selalu menulis `s.status` ulang (Agent-07); `js/pages.js:157` (4 opsi) dan `js/pages.js:165` (`sel.value = ev.status`) (Agent-07); `js/pages.js:96` hanya memfilter `draft` sehingga `diajukan`/`disetujui` tak pernah dirender di Dashboard (Agent-06).
**Saran:** satu konstanta `STORE.STATUS_EVENT = ['draft','diajukan','berjalan','disetujui','selesai','dibatalkan']` dipakai bersama untuk dropdown modal, chip filter, select Arsip, dan `ui.badge()`. Di `event:save`, jangan pernah menimpa status dengan nilai kosong. Untuk SPPD, ganti dropdown bebas dengan alur tombol Ajukan/Setujui + konfirmasi saat menurunkan status.

### T4. Perhitungan saldo / wallet / budget tidak konsisten antar halaman
**Agent:** 2, 4, 5, 6, 11, 12, 14, 19, 20 (9 agent)

Ini cluster temuan numerik terbesar. Rumus `saldo = danaAwal + totalSales + totalKasAdj − pengeluaran` (`js/store.js:806`) memakai **anggaran** sebagai uang ada, sehingga Rp 10.500.000 tetap tampil sebagai saldo di 4 event yang `danaCair = 0`. Tabel Arus Kas per Wallet tidak pernah memasukkan Dana Awal, sehingga jumlah kolom Saldo Rp 2.045.000 vs Saldo Akhir Rp 4.545.000 — selisih tepat Rp 2.500.000 tanpa baris penjelas dan tanpa baris TOTAL. Blok "Bandingkan SPPD" salah balance Rp 475.000 karena Penyesuaian Kas tidak punya baris. Baris Total tabel anggaran melanggar `Alokasi − Realisasi = Sisa` begitu ada alokasi E-Money. Satu angka saldo punya lima nama berbeda dalam satu alur.
- Sumber: `js/store.js:806` (Agent-06, 04); `js/store.js:796-802` + `js/pages2.js:487-493` (Agent-04); `js/pages2.js:533-537` (Agent-05 Agent-04); `js/store.js:617-621` + `js/pages2.js:516` dan `:975` (Agent-04); `pages2.js:487-493` vs `:968` (Agent-04).
**Saran:** pecah saldo menjadi tiga angka berlabel (Dana Cair / Belum Cair / Sisa), tambahkan baris "Saldo awal - Dana Awal SPPD" dan baris `<tfoot>TOTAL` di tabel Arus Kas, samakan filter `E-Money` di ketiga total anggaran, dan pakai satu helper saldo untuk kartu Saldo, hero, daftar event, Rekap Global, dan cetak.

### T5. Indikator "aman" / "lengkap" yang berbohong saat data kosong
**Agent:** 1, 4, 6, 13, 18, 19, 20 (7 agent)

Dua kondisi salah. `items.length === 0` dianggap "Item persiapan dibawa" ✅ dan `danaAwal === 0` dianggap "Saldo aman" ✅, sehingga event kosong punya 2 dari 4 chip hijau. Dan `if (eps.length > 0 || items.length > 0)` membuat event tanpa produk kehilangan cek "Siap berangkat" dan "Pulang tuntas", sehingga event kosong terlihat **lebih bersih** dari event yang sudah dikerjakan. Agent-04 membuktikan saldo minus Rp 1.000 tetap diberi centang hijau "Saldo aman"; Agent-20 menemukan saldo minus Rp 6.955.000 juga hijau. Agent-19: event status Selesai dan 100% padahal 3 aset belum ditandai pulang.
- Sumber: `js/pages2.js:306-307` (Agent-01, 04, 06); `js/pages2.js:309` (Agent-06, 19); `js/pages.js:358` memakai aturan `s.saldo < 0 ? 'minus' : 'aman'` — **dua aturan berbeda untuk data yang sama** (Agent-04).
**Saran:** chip hijau hanya kalau ada data DAN lengkap; `danaAwal > 0 ? saldo >= 0 : null` → tampil "— belum diisi"; selalu render 6 cek dengan state abu "Belum dinilai"; satu helper `saldoStatus()` untuk seluruh aplikasi.

### T6. Tidak ada jejak audit / riwayat perubahan
**Agent:** 5, 7, 8, 16 (4 agent)

Introspeksi 16 key DB, 75 fungsi API, dan seluruh UI: nol key `audit`/`log`/`history`, nol fungsi bernama audit, nol halaman audit, dan kata "Jejak"/"Riwayat Perubahan" tidak pernah muncul. 9 dari 12 koleksi tidak punya `createdAt`/`updatedAt`; hanya `events` dan `checklistItems` punya, dan `checklistItems.updatedAt` hanya berisi tanggal tanpa jam sehingga tidak bisa membuktikan urutan dalam hari yang sama. Record yang dihapus tidak punya tombstone — `indexOf('exp-1') = -1`. Kata "Audit" yang muncul di UI merujuk pada "Audit Aset Berangkat & Pulang", yaitu pemeriksaan stok, bukan audit data.
- Sumber: `js/store.js` (16 key DB, 75 fungsi API) (tanpa nomor baris di laporan); `js/store.js:366-379` cascade `deleteEvent` tanpa soft delete (Agent-07).
**Saran:** tambah koleksi `auditLog` (at, actor, aksi, entitas, id, sebelum, sesudah) yang ditulis di dalam `store.save()` dengan diff sebelum/sesudah, set `updatedAt` ISO penuh di semua `save*`, soft-delete dengan `deletedAt`, dan halaman `#/audit` yang bisa dicetak.

### T7. Layout: elemen penting di bawah lipatan, halaman terlalu panjang
**Agent:** 1, 3, 6, 8, 10, 11, 12, 13, 16, 19, 20 (11 agent)

Layar Kerja setinggi 17.000–28.618 px (20–26 layar HP) dengan 8 seksi terbuka semua secara default dan tidak ada seksi tertutup default. Di 1280×800 hanya 1 dari 9 kartu Event utuh di atas lipatan dan panel Progress kepotong 44 px. Flowbar "Alur Kerja" ada 281–381 px di bawah lipatan dan `position: static`, jadi hilang permanen setelah dipakai sekali. Tombol hapus milestone, form penjualan, dan seluruh kontrol penting jatuh di layar ke-9 sampai ke-22. Agent-01: nol tombol yang bisa diklik di layar pertama Dashboard.
- Sumber: `js/pages2.js:344-346` (urutan `hero + ckSection + flowBar`) (Agent-06); `.flowbar` `position: static` (Agent-06); `js/actions.js:562-565` handler `scroll:to` (Agent-06); `.psec { scroll-margin-top: 96px }` (Agent-03).
**Saran:** `.flowbar` jadi `position: sticky; top: 64px; z-index: 30`, pindahkan blok "Cek Persiapan" ke bawah flowbar atau ringkas jadi satu baris, default tertutup untuk seksi 02–08, dan pertahankan status lipatan di memori agar tidak hilang saat `A.reload()`.

### T8. Kemampuan aksesibilitas: font kecil, kontras, target sentuh, nama aksesibel
**Agent:** 3, 8, 9, 10, 11 (5 agent)

Layar Kerja punya 364 elemen (50%) di bawah 14px termasuk 117 elemen 11px dan 54 header tabel uppercase; 220 elemen terkunci `px` sehingga tidak ikut mengikuti preferensi ukuran huruf pengguna. 61 target sentuh di bawah 24px, kotak centang hanya 13×13px (60 buah), `.psec-fold` 26×26px, `.flow-pill` 28px, `.btn-sm` 32px. 27 elemen gagal kontras WCAG AA, terburuk hijau `#22C55E` hanya 2.28:1 — dipakai untuk "penyesuaian kas positif" dan untuk **toast sukses**. 22 input tanpa nama aksesibel, 54 dari 121 tanpa `<label for>`, semua toast/error tanpa live region, modal tanpa `aria-modal` dan tanpa focus trap (202 elemen di belakang tetap bisa difokus).
- Sumber: `css/styles.css:89` (`.badge` 11px), `:96` (`.table th` 11px), `:262` (`.ev-head-kicker` 11px), `:303` (`.flowbar-label` 11px), `:279` (`.psec-sub` 12px), `:285-291` (`.psec-fold` 26×26), `:69` (`.btn-sm`), `:17` (`--success: #22C55E`), `:19` (`--danger: #EF4444`), `:135-136` (`.toast`); `js/pages2.js:98-99` (tombol "✕" tanpa `aria-label`) (Agent-08); `css/styles.css:370-378` (container query yang menyebabkan overflow) (Agent-03).
**Saran:** ubah semua `font-size: NNpx` di `css/styles.css` ke `rem`, gelapkan `--success` ke `#15803D` dan `--danger` ke `#B91C1C` (nilai yang sudah dipakai di `STATUS_MAP.dibatalkan`), perbesar area ketuh ke 44×44px tanpa mengubah ukuran visual, tambahkan `aria-live="polite"` di `#toast-root`, dan **jangan pernah** tambahkan `user-scalable=no` (Agent-08 menyebut zoom tidak diblokir sebagai hal yang harus dipertahankan).

### T9. Tidak ada daftar "apa yang belum selesai" untuk pengguna sibuk
**Agent:** 1, 6, 18, 19 (4 agent)

Dashboard tidak punya satu pun blok "Perlu Perhatian": 13 kata penanda masalah discan dan nol ketemu, 4 dari 9 event tidak muncul di halaman sama sekali, panel Progress hanya menampilkan satu dari empat event yang punya milestone aktif, dan hero menyorot event yang sudah lewat 159 hari. Panel "Belum lengkap" sudah ada di kode tapi tidak bisa dibuka pengguna. Setelah buat event pertama, user mendarat di halaman 20 layar dengan 24 item checklist dan **nol** pesan "langkah berikutnya" (`/langkah|berikutnya|selanjut/i` → `false`).
- Sumber: `js/pages.js:50-52` (flag `!anyMs` membuat event pertama yang ketemu menang) (Agent-06); `js/pages.js:96` (hanya `draft` yang dirender) (Agent-06).
**Saran:** strip "Perlu Perhatian (N)" di baris atas Dashboard berisi event `diajukan`, `disetujui` tanpa dana cair, `selesai` dengan saldo bukan nol; panel Progress jadi daftar semua event ber-milestone aktif; dan tombol "Mulai: Buat Event Baru" sebagai elemen pertama di Dashboard.

### T10. Istilah yang tidak dipahami / panduan tidak memadai
**Agent:** 1, 10, 11, 12, 18 (5 agent)

Lebih dari 15 istilah teknis muncul tanpa penjelasan: SPPD, PIC, Saldo, Milestone, Wallet, Rekap, Alokasi, Dana Cair, Realisasi, Terjual, Kembali, Rusak/Hilang, cross-check, launch. Nol `<details>`, nol `<abbr>`, nol elemen `[d.title]`, nol ikon tanya di seluruh aplikasi. Modal "Buat Event Baru" memuat 8 field dengan 0 penanda wajib dan 0 teks bantuan. Panduan tidak bisa dicari, penomoran FAQ kacau ("9b." muncul sebelum "1."), dan tidak ada FAQ tentang kesalahan input, pembatalan, maupun cara backup. Istilah juga tidak konsisten: "Kas akhir" vs "Saldo akhir" untuk angka yang sama, "SPP" vs "SPPD", mode transport tampil mentah sebagai "umum"/"pribadi"/"sewa".
- Sumber: `js/pages.js` modal event (tanpa nomor baris di laporan); heading Panduan (tanpa nomor baris di laporan) (Agent-10, 18).
**Saran:** glosarium one-liner pada kemunculan pertama tiap istilah (tooltip native `title` atau teks kecil di bawah label), daftar isi sticky di Panduan dengan lompat per pertanyaan, dan satu konstanta istilah yang dipakai bersama seluruh aplikasi.

---

## 4. Daftar Temuan KRITIS

Semua 18 temuan berlabel KRITIS, dari 9 agent. Bagian ini yang paling penting karena semuanya menyangkut kehilangan data atau aplikasi mati total.

### 4.1 Cluster "Pulihkan dari File" / impor (10 KRITIS)

| # | Agent | Judul | Evidence ringkas | File sumber |
|---|---|---|---|---|
| K1 | 05 | "Pulihkan dari File" menghapus seluruh data secara permanen | `DB = obj` terjadi di karakter 263 fungsi, sebelum validasi koleksi lain; toast user = `Cannot read properties of undefined (reading 'forEach')`; `events` 9 → 1; `sales`/`products`/`financeSummary` semua THROW; localStorage ikut tertimpa setelah satu `saveSettings` biasa; 80.243 byte hilang | `js/store.js` `importJSON`; `js/actions.js` `data:import` (tanpa nomor baris di laporan) |
| K2 | 15 | Impor gagal = data di memori diganti; save berikutnya menghapus 99,4% database dan menampilkan toast "Event dibuat" | Toast "Event dibuat" muncul padahal 9 event → 0; file JSON dengan `sppd: {}` diterima | `js/store.js` `importJSON` |
| K3 | 15 | File backup tidak lengkap: toast "Data dipulihkan" (sukses) tapi 6 dari 9 halaman mati | Validasi hanya satu baris `Array.isArray(obj.events)`; hasil impor dianggap sukses | `js/store.js` `importJSON` |
| K4 | 16 | `importJSON` menimpa penyimpanan SEBELAM validasi selesai — 1 klik "Simpan" berikutnya memusnahkan semua data | Urutan `DB = obj` → validasi; data hilang permanen tanpa rollback | `js/store.js` `importJSON` |
| K5 | 16 | "Pulihkan dari File" tidak punya konfirmasi dan tidak ada auto-backup | Memulihkan backup lama menghapus semua kerjaan lebih baru, tapi toast-nya terlihat seperti sukses | `js/actions.js` `data:import` |
| K6 | 16 | localStorage rusak atau terpotong → aplikasi diam-diam memuat data dummy, lalu menimpa data asli | Tidak ada deteksi kegagalan parse; seed default ditimpa ke storage yang sebelumnya berisi data asli | `js/store.js` `load()` |
| K7 | 16 | "Reset Data Dummy" menghapus SELURUH data kerjaan secara permanen | Tombolnya berlabel "Hapus", teks konfirmasinya menenangkan; satu-satunya kontrol "pemulihan" justru menghapus semua | `js/actions.js` `data:reset`; `js/store.js` `resetData()` |
| K8 | 17 | "Pulihkan dari File" menimpa seluruh data perangkat tujuan tanpa konfirmasi | Kerjaan baru di HP hilang diam-diam saat restore file dari perangkat lain | `js/actions.js` `data:import` |
| K9 | 17 | File backup tidak utuh tetap diterima → 1 klik biasa menghapus semua data asli secara permanen | Tidak ada validasi kelengkapan; data dari 2 perangkat mudah tertukar | `js/store.js` `importJSON` |
| K10 | 20 | Impor backup tidak lengkap = kehilangan data aplikasi, dan storage ikut tertimpa rusak | Setelah impor parsial, `sales`/`expenses`/dsb. hilang → database setengah jadi | `js/store.js` `importJSON` |

### 4.2 Cluster "Aplikasi mati / hapus tanpa pemulihan" (5 KRITIS)

| # | Agent | Judul | Evidence ringkas | File sumber |
|---|---|---|---|---|
| K11 | 20 | Aplikasi mati total (layar putih permanen) kalau localStorage-nya tidak lengkap | Ketidaklengkapan koleksi membuat `load()` melempar error di luar try/catch; tidak ada guard | `js/store.js` `load()` |
| K12 | 07 | Tombol "Hapus" di semua dialog konfirmasi tidak melakukan apa-apa | `js/ui.js:101` memasang `data-action="modal:ok"` tapi `js/ui.js:104-105` mendaftarkan callback sebagai `A.actions.modalOk` (camelCase), sementara `js/actions.js:109` mendefinisikan `'modal:ok'` sebagai fungsi kosong. Semua dialog konfirmasi di aplikasi jadi tidak bisa dipakai | `js/ui.js:101-105`; `js/actions.js:109` |
| K13 | 07 | Dropdown Status SPPD selalu menampilkan "Draft" dan menimpa status tersimpan saat "Simpan SPPD" | `js/pages.js:471` tidak punya atribut `selected` dan tidak punya baris `sel.value = s.status` seperti `#ev-status` di `js/pages.js:165`; `js/actions.js:119` selalu menulis ulang `s.status` | `js/pages.js:471`; `js/actions.js:119` |
| K14 | 08 | 10 dari 11 action "Hapus" di Layar Kerja menghapus data seketika tanpa konfirmasi | Dihitung dengan klik MouseEvent nyata; semua berubah langsung di store, modal konfirmasi `TIDAK ADA`, tidak ada tombol Batal/Undo | `js/actions.js:164-167, 275-279, 297-300, 314-317, 335-338, 373-376, 404-407, 447-450, 463-466` |
| K15 | 08 | Tidak ada Undo, snapshot, atau tempat pemulihan setelah data dihapus | `grep -c "trash|undo|snapshot|riwayat" js/store.js` = 0; semua `delete*` langsung `filter()` tanpa menyimpan apa pun; "Reset Data Dummy" adalah satu-satunya tombol mirip pemulihan tapi justru menghapus semua | `js/store.js` (tanpa nomor baris di laporan); `js/actions.js` `backup` |
| K16 | 03 | Halaman jadi 612px di layar 375px — 34 dari 44 kontrol seksi 03/05/06 keluar layar | Grid luar seksi 05 punya `grid-template-columns: 595.719px` dalam container 343px; `css/styles.css:370-378` meng-override jadi `1fr` (= `minmax(auto,1fr)`, min-content = tabel 7 kolom); tombol "Hapus" di `left=539px right=597px` perlu geser 207px | `css/styles.css:370-378` |
| K17 | 13 | Transaksi penjualan terhapus dalam satu klik, tanpa konfirmasi dan tanpa undo | Dihapus di seksi 05; penjualan global turun seketika, tidak ada jalur pemulihan di UI | `js/actions.js:447-450` (`sale:delete`) |
| K18 | 07 | Modal Edit Event tidak punya opsi "Diajukan"/"Disetujui" — status event jadi STRING KOSONG | `js/pages.js:157` hanya berisi 4 opsi (`draft, berjalan, selesai, dibatalkan`) padahal badge di `js/ui.js:42-51` mengakui 6 status; `js/pages.js:165` menjalankan `sel.value = ev.status` untuk nilai yang tidak ada di daftar → browser mengosongkan select; badge jadi `"●"` tanpa label | `js/pages.js:157`; `js/pages.js:165`; `js/ui.js:42-51` |

---

## 5. Rekomendasi Prioritas (Top 10)

| # | Apa | Kenapa | Kompleksitas |
|---|---|---|---|
| 1 | Validasi `importJSON` berlapis + `ui.confirm` + auto-backup sebelum commit | Menutup 10 KRITIS sekaligus. Satu fungsi, dampak ke seluruh model data | **Sedang** — perlu daftar koleksi wajib, jalankan di objek salinan, tambah slot autobackup |
| 2 | Perbaiki dialog konfirmasi yang tombol "Hapus"-nya tidak berfungsi | Menutup K12/K13 dan membuka kembali 4 aksi hapus yang punya konfirmasi tapi macet. Skema `ui.confirm` sudah ada, hanya nama action-nya tidak cocok | **Kecil** — samakan nama key (`modalOk` vs `modal:ok`) atau pasang `onclick` closure per dialog |
| 3 | Terapkan konfirmasi + undo ke seluruh 12 aksi hapus tanpa konfirmasi | Menutup K14 dan menurunkan 5 temuan TINGGI lintas 6 agent. Pola konfirmasi dan pola toast sudah ada di codebase | **Sedang** — 12 handler + satu helper `konfirmasiHapus` + snapshot sebelum `delete*` |
| 4 | Satu sumber kebenaran untuk status (event + SPPD) | Menutup K13, K18, dan 5 temuan TINGGI lain. Utamakan konstanta bersama | **Sedang** — konstanta baru + update 4 tempat render (modal, chip, Arsip, badge) |
| 5 | Perbaiki aturan "aman/lengkap" + tambah cek Dana Cair | Satu keputusan kode yang salah (lihat T5) memengaruhi 5 agent sekaligus. Dampak langsung ke keputusan atasan | **Kecil** — ubah 3 kondisi di `js/pages2.js:306-307, 309` dan samakan dengan `js/pages.js:358` |
| 6 | Rekonsiliasi saldo: tabel Arus Kas + blok Bandingkan + baris Total anggaran | Menutup 9 temuan TINGGI numerik. Tanpa ini laporan tidak bisa dipakai sebagai alat bukti | **Besar** — menambahkan baris saldo awal, memetakan Dana Awal ke wallet, menyamakan filter E-Money, dan mungkin split saldo riil vs saldo anggaran |
| 7 | Validasi input angka: harga penjualan, nominal negatif, qty, format Indonesia | Menutup temuan `250.000` tersimpan jadi `250` (Agent-03, 15, 20) dan harga 0/negatif yang dipakai Agent-04. Jadi-duplikat validasi sudah ada di `expense:add` dan `sale:add` (stok) | **Sedang** — guard di `saveSale`/`saveExpense`, normalisasi angka ke `type="text"` + `inputmode="numeric"` |
| 8 | Koleksi `auditLog` + `updatedAt` di semua `save*` + soft delete | Satu lapisan yang menutup sebagian besar temuan "tidak bisa dibuktikan". Agent-05 menyatakan ini akar masalah bersama | **Besar** — diff di dalam `store.save()`, menambah halaman `#/audit` yang bisa dicetak |
| 9 | Layout Layar Kerja: flowbar sticky, seksi 02–08 tertutup default, pertahankan status lipatan | Menutup 11 temuan layout lintas 7 agent, dan memperbaiki 4 temuan sekaligus di Agent-06, 11, 12, 19 | **Sedang** — CSS sticky + satu baris state lipatan di memori + urutan render |
| 10 | Lapis aksesibilitas: `rem` untuk font, gelapkan `--success`/`--danger`, target sentuh 44px, `aria-live` di toast | Menutup 5 temuan TINGGI + 20 SEDANG lintas 5 agent. Perbaikannya mekanis dan satu warna sudah tersedia di dalam aplikasi sendiri | **Kecil–Sedang** — nonlinear CSS + satu token ukuran huruf + padding |

---

## 6. Klaim yang Saling Bertentangan

Klaim yang **tidak konsisten** antar laporan. Penting untuk menjaga kredibilitas laporan.

### B1. Tombol "Hapus" di dialog konfirmasi: rusak atau berfungsi?
- Agent-02 (BUG-06, TINGGI), Agent-07 (BUG-01, **KRITIS**), Agent-13 (BUG-02, TINGGI): tombol tidak melakukan apa-apa karena `ui.confirm` mendaftarkan callback dengan nama camelCase sementara DOM memakai `modal:ok`.
- Agent-01 ("Yang sudah baik"): menyebut konfirmasi hapus event "jujur dan bisa dibatalkan" — hanya menguji tombol **Batal**, bukan tombol **Hapus**.
- Agent-08 dan Agent-04: menemukan `event:delete` dan `product:delete` punya konfirmasi yang baik, dan tidak menemukan masalah pada tombolnya.
- **Catatan:** kemungkinan besar benar ada dua kondisi — dialog tampil dan tombol Batal berfungsi, tapi tombol Hapus tidak memanggil callback-nya. Agent-01 hanya menguji jalur Batal. Semua agent yang benar-benar mengklik tombol Hapus menemukan bug yang sama. **Severity berbeda (TINGGI vs KRITIS) karena agent yang menilai dampaknya ke seluruh alur kerja (Agent-07) memberi label lebih tinggi.**

### B2. Hapus tanpa konfirmasi: 10 dari 11, 12 dari 16, atau 28 dari 29?
- Agent-05: **12 dari 16** aksi hapus tanpa konfirmasi.
- Agent-08: **10 dari 11** action hapus di Layar Kerja tanpa konfirmasi (hanya `event:delete` aman).
- Agent-11: **28 dari 29** tombol hapus menghapus dalam 0 ms tanpa konfirmasi.
- Agent-16: **10 dari 14** tindakan destruktif tanpa konfirmasi.
- **Catatan:** angka pembagi berbeda karena cakupan berbeda (Layar Kerja saja vs seluruh aplikasi vs termasuk `data:reset`/`data:import`). Tidak benar-benar saling bertentangan, tapi perbandingan cross-agent tidak bisa dilakukan langsung. Semua agent sepakat polanya sama: hanya `event:delete` dan `product:delete` yang aman.

### B3. Dropdown status SPPD: TINGGI atau KRITIS?
- Agent-02 (BUG-01, TINGGI), Agent-18 (BUG-01, TINGGI), Agent-20 (BUG-05, TINGGI) — mendeskripsikan bug yang persis sama.
- Agent-07 (BUG-03, **KRITIS**).
- **Catatan:** bug identik, rekomendasi Agent-02 lebih spesifik (ganti dropdown dengan alur tombol Ajukan/Setujui). Perbedaan label kemungkinan karena Agent-07 mengaitkannya dengan kerusakan alur persetujuan bisnis.

### B4. "Angka antar halaman 100% konsisten" vs "dokumen cetak menampilkan dua angka saldo"
- Agent-06: skor **5/5** untuk konsistensi angka antar halaman — Dashboard = Rekap Global = jumlah 9 saldo kartu = detail event, semua persis sampai rupiah.
- Agent-04 (BUG-02), Agent-05 (BUG-04), Agent-14 (BUG-02, BUG-03), Agent-20 (BUG-10): tabel Arus Kas per Wallet ≠ Saldo Akhir, blok Bandingkan ≠ Saldo Akhir, tabel per-wallet-tujuan ≠ Arus Kas.
- **Catatan:** keduanya benar dan tidak bertentangan — Agent-06 hanya menguji angka **stat card** yang dipakai di atas, sedangkan Agent-04/05/14 menguji **rekonsiliasi internal tabel**. Yang berlebihan di Agent-06 adalah kesimpulan "angka antar halaman konsisten 100%"; yang kurang di Agent-04 adalah catatan bahwa stat card-nya justru konsisten. Seharusnya Agent-06 menulis "konsisten di level stat card, tidak konsisten di level tabel".

### B5. Kontras warna: TINGGI atau SEDANG?
- Agent-08 (BUG-07, **TINGGI**): 27 elemen gagal AA, toast sukses 2.28:1, hijau `#22C55E` untuk penyesuaian kas positif praktis tak terlihat.
- Agent-09 (BUG-05, BUG-06, **SEDANG**): badge status dan angka rupiah hijau/merah gagal kontras, tapi "perbaikannya mudah (gelapkan warna)".
- **Catatan:** temuan identik dengan severity berbeda. Agent-08 menilai dari sudut "penyandang disabilitas dengan mata 62 tahun", Agent-09 dari sudut "screen reader / buta warna" — di situlah perbedaan penilaiannya masuk akal.

### B6. Validasi sisa stok: bekerja atau tidak?
- Agent-03 & Agent-04: validasi stok bekerja **dengan sangat baik** — `qty 999` untuk Batik Tulis ditolak dengan pesan jelas.
- Agent-03 (BUG-13) & Agent-04 (BUG-04): untuk event yang produknya belum masuk checklist, `stokSisa()` mengembalikan `null` sehingga validasi **dinonaktifkan sepenuhnya** — `qty 999` tersimpan sebagai Rp 249.750.000 tanpa peringatan.
- **Catatan:** bukan pertentangan, tapi mudah salah baca. Validasi hanya bekerja kalau produk sudah ada di checklist seksi 03. Perlu disebut eksplisit di laporan mana pun yang menyebut "validasi stok baik".

### B7. Urutan daftar event oldest-first: SEDANG, RENDAH, atau bukan bug?
- Agent-01 (BUG-09, SEDANG), Agent-06 (BUG-12, RENDAH), Agent-13 (BUG-11, SEDANG): urutan `tanggalMulai` ascending menempatkan event "Selesai" paling atas.
- **Catatan:** konsisten dalam isi, berbeda severity. Agent-06 menurunkan karena persona-nya atasan dengan waktu 15 detik dan ia melihat masalah lebih besar di tidak adanya blok prioritas.

### B8. Apakah data hilang permanen atau ada auto-backup tersembunyi?
- Agent-05: "Pemulihan hanya mungkin kalau user kebetulan punya file backup" — tidak ada auto-backup.
- Agent-08: "Backup ke File hanya menyimpan kondisi sekarang; kalau backup dibuat setelah salah ketuk, data yang hilang juga sudah hilang dari backup".
- Agent-16 (BUG-08): `save()` **menelan error** saat localStorage penuh, hanya toast 3 detik — jadi perubahan bisa hilang tanpa jejak **dan tanpa indikasi**.
- **Catatan:** ketiga agent saling menguatkan. Ini bukan pertentangan; ini bukti bahwa tidak ada mekanisme pemulihan apa pun di seluruh aplikasi.

### B9. Apakah aplikasi "tidak crash"?
- Agent-01, Agent-06, Agent-08, Agent-12: nol exception, semua rute ter-render, performa bagus.
- Agent-05, Agent-15, Agent-16, Agent-17, Agent-20: aplikasi **mati total / white screen** / 6 dari 9 halaman mati.
- **Catatan:** bukan pertentangan — dua kondisi berbeda. Aplikasi stabil **selama** localStorage utuh, dan tidak stabil begitu isi localStorage tidak lengkap. Tidak ada satu pun agent yang menguji Impor lalu memverifikasi apakah aplikasi masih hidup; skenario inilah yang hampir selalu terlewat.

---

## 7. Metodologi & Keterbatasan

### 7.1 Metode yang dipakai

| Metode | Digunakan oleh | Detail |
|---|---|---|
| **Edge headless** | 20 dari 20 agent | `msedge.exe --headless=new --disable-gpu --no-sandbox --virtual-time-budget=15000 --dump-dom`, hasil dibaca dari `<pre id="out">` |
| **Profil unik per run** | 20 dari 20 agent | `--user-data-dir` ke `%TEMP%\opencode\prof_aXX*`, dihapus sebelum tiap run agar tidak ada data sisa antar-agent |
| **`localStorage.clear()` sebelum render** | 20 dari 20 agent | Harness dijalankan di `<head>` **sebelum** `js/store.js` dimuat, agar yang diuji benar-benar seed default (9 event, 8 produk, 11 penjualan) |
| **Iframe untuk viewport mobile** | Agent-01, 03, 08 | `--window-size` di Edge Windows terkunci minimum 492px, jadi `index.html` asli dibungkus `<iframe width=390/360 height=844>` dengan `--allow-file-access-from-files` |
| **Verifikasi numerik** | Semua agent | Semua angka dari `getBoundingClientRect`, `getComputedStyle`, `scrollWidth`, `getComputedStyle().fontSize`, dan `localStorage`/`store` — **tidak ada screenshot**, karena tidak bisa dibaca headless |
| **Klik nyata (MouseEvent)** | Agent-07, 08, 13 | Bukan panggilan API langsung; satu-satunya pengecualian Agent-07 yang memanggil `store.deleteProduct` langsung, dan itu ditandai eksplisit di laporan |
| **Harness di `_QA_TMP/`** | Semua agent | File `aXX_*.html` + skrip, dihapus setelah selesai. Tidak ada file aplikasi yang diubah — semua laporan read-only |

### 7.2 Keterbatasan yang muncul di laporan

- **Viewport ter-clamp Edge.** `--window-size=390,844` menghasilkan `innerWidth=492`; `--window-size=360,740` juga dikoreksi ke 492px. Agent-01, 03, 08 harus memakai iframe. Agent-06 mengalami hal serupa tapi untuk tinggi: `--window-size=1440,900` → `innerHeight=761` karena ada chrome browser.
- **`--virtual-time-budget` membekukan `performance.now()`** sehingga semua pengukuran performa melaporkan `0.0ms` (Agent-06). Harness performa harus dijalankan tanpa flag itu.
- **`setTimeout` tidak dieksekusi** pada kombinasi `--headless=new --virtual-time-budget` (Agent-07), jadi harness harus sinkron.
- **XHR diblokir di `file://`** sehingga tidak ada yang menguji integrasi GAS/Supabase — memang belum ada di kode.
- **Fitur browser yang butuh user gesture tidak bisa diuji** — `Blob` + `URL.createObjectURL` + `a.click()` untuk "Backup ke File" tidak bisa diverifikasi (Agent-05).
- **Popup blocker tidak bisa disimulasikan** sehingga fallback `report:global` diuji lewat analisis source, bukan observasi (Agent-05).
- **Tampilan visual cetakan tidak bisa dinilai** — tidak ada `@page`, tidak ada nomor halaman, dan tidak ada screenshot yang bisa dibaca (Agent-05).
- **Smooth scroll tidak bergerak di headless** — `pageYOffset=0` setelah 300 polling, sehingga durasi lompatan 11.479px hanya estimasi (Agent-06).
- **Perilaku perangkat nyata belum teruji** — keyboard virtual vs toast (Agent-03), zoom otomatis iOS Safari karena `font-size:14px` (Agent-03), keypad `type=number` di Android locale id-ID (Agent-03), kontras Geomini yang tidak bisa dibaca headless (Agent-06).
- **Multi-tab dan storage penuh belum diuji** — dua tab Edge dengan satu `save()` menimpa yang lain, atau `localStorage` dimodifikasi dari luar aplikasi (Agent-05, 16).
- **Beberapa harness menghasilkan false positive** yang ditandai sendiri oleh agent: probe "undo" di Agent-04 BUG-06 dan probe peringatan Dana Cair di Agent-04 BUG-13 — kesimpulan diambil dari source, bukan probe.

### 7.3 Apa yang BELUM diuji (celah yang tidak disentuh agent mana pun)

1. **Perilaku setelah Impor berhasil.** Tidak ada agent yang mengimpor file valid lalu memeriksa apakah semua 8 halaman masih hidup, apakah status SPPD/alokasi/milestone masih utuh, dan apakah angka rekap cocok dengan file asal. Semua agent berhenti begitu "data hilang" terdeteksi.
2. **Migrasi data versi lama sebagai fitur, bukan insiden.** Agent-20 menemukan data versi lama dihapus tanpa migrasi, Agent-05 dan Agent-16 menemukan round-trip `export(import(export(x)))` tidak byte-identical, tapi **tidak ada** yang menguji upgrade aplikasi dari versi lama ke versi baru dengan data dummy yang sengaja punya lebih banyak field.
3. **Ketahanan terhadap `localStorage` yang berisi JSON rusak parsial** — validasi hanya satu baris `Array.isArray(obj.events)`; tidak ada yang menguji file 10 MB, atau file dengan 10.000 event.
4. **Perilaku multi-tab bersamaan di browser yang sama** — Agent-17 mencatat tidak ada listener `storage` sebagai RENDAH, tapi tidak ada agent yang benar-benar membuka dua tab dan melakukan `save()` di keduanya.
5. **Performa pada data realistis.** Agent-20 menemukan performa melorot pada data yang cukup banyak, Agent-12 menemukan 192 baris tabel dirender sekaligus di halaman 28.618px, tapi **tidak ada** yang mengukur waktu render pada 50 event × 500 transaksi.
6. **Studi pengguna nyata dengan pengguna sungguhan.** Semua skor pengalaman 1–5 adalah penilaian agen terhadap persona, bukan hasil usability test. Beberapa agent sendiri menandai ini perlu konfirmasi (Agent-01 BUG-17, Agent-03 beberapa pertanyaan terbuka).
7. **Cetakan ke PDF/fisik.** Tidak ada agent yang benar-benar mencetak; semua analisis "cetak" dilakukan pada string HTML dari `printHTML()`. Akibatnya pertanyaan "apakah dokumen muat di 1 halaman A4 atau terpotong antar halaman" belum terjawab.
8. **Aksesibilitas dengan NVDA/VoiceOver sungguhan.** Agent-09 menguji DOM, ARIA, dan urutan fokus secara terprogram, tetapi tidak pernah menjalankan screen reader nyata.
9. **Alur di luar Layar Kerja.** Seksi 02 Jadwal & Milestone, seksi 04 Item Persiapan, dan halaman Rekap Global hanya disentuh sekilas oleh beberapa agent. Tidak ada agent yang secara khusus mengaudit salah satu dari tiga area itu.
10. **Perilaku setelah 30+ event.** Agent-07 dan Agent-13 sama-sama menandai "kalau nanti 50 produk dan 30 event, BUG-09 dan BUG-13 jadi masalah harian" — tapi **tidak ada** yang benar-benar menguji 30 event.

---

*Dokumen ini adalah indeks sintesis dari 20 laporan QA. Angka severity di semua bagian diambil apa adanya dari tabel ringkasan masing-masing laporan. Tidak ada temuan, skor, atau rekomendasi yang tidak berasal dari salah satu dari 20 laporan tersebut.*