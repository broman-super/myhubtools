# Spesifikasi Web — SPPD Toolbox: Roadmap Pengawasan Event

> Dokumen perencanaan awal. Dibuat sebelum implementasi kode. Semua keputusan teknis/data ada di sini sebagai acuan Divisi Web Builder.

---

> **Status:** Prototype **v0.6 (R3: Sinkron Stok Penjualan + Laporan Lengkap)** — lanjutan council 21-09-2026 (map R0→R3: fondasi → item persiapan → cross-check berangkat/pulang → sinkron produk↔terjual + laporan; jalankan ronde otonom berbatas, fail-lock, log per agen di `devlog/` + `CHANGELOG.md`). R3 selesai: **validasi stok penjualan** (`stokSisa` = dibawa − terjual − rusak, qty > sisa ditolak; opsi produk menampilkan sisa) + **seksi 03 Laporan** di tab Uang & Laporan (Rekap Produk & Qty, Rekap Item Persiapan, Rekap Penggunaan Uang) — tanpa migrasi schema. R2 selesai: **2 gerbang audit** — **Siap berangkat** (`berangkatOk`) dan **Pulang tuntas** (`pulangOk`) — seksi `04` Cross-check di tab Persiapan dengan kartu verdict `.vc` + chip roadmap "Siap berangkat"/"Pulang tuntas". Defect double-binding `click`+`change` di app.js diperbaiki (input/select/textarea dikelola `change`). R1 selesai: **checklist item persiapan non-produk** dengn 4 status & biaya (estimasi informatif) — seksi `03`. Konteks v0.3 — konsolidasi 7 tab → **3 tab**: **Roadmap Pengawasan** (default), **Persiapan** (SPPD+Transport+Produk+Timeline), **Uang & Laporan** (Penjualan+Keuangan+Penyesuaian Kas+Laporan); deep-link lama tetap resolve via peta legacy; design pass signifikan. Semua fungsi lama dipertahankan. Persistensi sementara tetap localStorage + dummy data. Integrasi GAS & Supabase **ditunda** (menunggu key dari user); titik integrasi ditandai `// FUTURE: GAS` / `// FUTURE: SUPABASE`.

---

## 1. Ringkasan Proyek

Webtool pribadi (siap multi-user nanti) untuk **PIC yang bertugas buka booth di event balapan**. Satu event/tugas = satu siklus penuh yang harus dikelola: surat perjalanan (SPPD), transportasi, produk yang dibawa, progress, penjualan, dan pertanggungjawaban uang.

**Pengguna (v1):** 1 akun pemilik. Data model sudah menyiapkan kolom `user_id` agar nanti bisa multi-akun tanpa perombakan besar (tiap akun punya "roadmap" sendiri-sendiri, tanpa sistem role).

**Tujuan utama:**
1. **Roadmap Pengawasan per event** — tampilan tahap-demi-tahap: apa yang belum dikerjakan, sedang di tahap mana, dan yang sudah selesai dengan **dokumen bukti terlampir + rincian biaya & kas** per tahap (ini penggerak utama desain).
2. Tracking & manajemen surat perjalanan dinas (SPPD).
3. Checklist produk yang dibawa & selisihnya (terjual / kembali / rusak).
4. Timeline progress tugas.
5. Recap penjualan.
6. Detail penggunaan uang (pertanggungjawaban), termasuk **penyesuaian kas**.

---

## 2. Arsitektur (Tiga Lapis)

```
+------------------------------------------------------------+
|  FRONTEND  (GitHub Pages — static files di repo GitHub)    |
|  HTML + CSS + JS vanilla + Tailwind CDN    (tanpa build)   |
|  Semua halaman = SPA, data di-fetch dari GAS               |
+------------------------------------------------------------+
        │  fetch() → https://script.google.com/macros/s/XX/exec
        ▼
+------------------------------------------------------------+
|  GAS — "JEMBATAN" (backend API)                            |
|  • doPost()/doGet() action router → JSON                   |
|  • PEGANG SUPABASE SERVICE KEY (rahsia, tidak pernah       |
|    bocor ke frontend/browser)                              |
|  • UrlFetchApp → REST Supabase (PostgreSQL + Storage)      |
|  • DriveApp → simpan file bukti foto ke Google Drive       |
|  • (Fase 2) buat dokumen SPPD dari template Google Docs    |
+------------------------------------------------------------+
        │
        ├──► Supabase : database PostgreSQL (event, produk,
        │             penjualan, keuangan, timeline, bukti-ref)
        └──► Google Drive : file bukti foto / dokumen
```

**Alur data (baca):** Frontend → `fetch(action=list)` → GAS cek payload → GAS panggil Supabase REST dengan service key → JSON balik → Frontend render.

**Alur data (tulis):** Frontend → `fetch(action=saveX, payload)` → GAS validasi → tulis ke Supabase → JSON `{ok:true,data}` → Frontend.

### Mengapa begini?
- **Key Supabase tidak pernah ada di browser** — tidak bisa diintip via DevTools. Ini menggantikan supabase-js client-side.
- Satu URL GAS sebagai single entry point API.
- Kebebasan memilih: data di Supabase (relasional, cepat), file di Google Drive (15GB gratis, cocok bukti foto).

### Catatan penting
- `google.script.run` TIDAK dipakai (hanya valid kalau halaman di-serve GAS). Frontend di GitHub Pages → pakai `fetch` ke Web App URL (deploy mode "Anyone" / "execute as Me").
- Mengirim foto: frontend **kompres & resize dulu** (canvas → JPEG ~800px, kualitas ~0.7) agar hemat bandwidth; lalu kirim base64 sementara ke GAS, GAS simpan ke Drive via `DriveApp.createFile()`. **base64 TIDAK disimpan permanen** di database — cukup Drive file id + link. (Menyimpan base64 di DB = boros & lambat.)

---

## 3. Struktur Menu / Halaman

```
Dashboard
│
├─ Event / Tugas (daftar semua tugas PIC, tiap baris tampil progress %)
│   └─ Detail Event — 3 TAB (default = Roadmap Pengawasan):
│      ├─ Roadmap Pengawasan  ← default landing
│      ├─ Persiapan   (SPPD & Perjalanan → Produk & Checklist → Item Persiapan → Cross-check Berangkat/Pulang → Jadwal/Timeline)
│      └─ Uang & Laporan (Penjualan → Pengeluaran & Penyesuaian Kas → Laporan)
│      (deep-link lama /ringkasan /sppd /produk /timeline /penjualan /keuangan
│       tetap resolve via peta LEGACY ke 3 tab di atas)
│
├─ Master Produk
├─ Laporan
├─ Panduan & FAQ
└─ Pengaturan
```

### Peran tiap halaman

| Halaman | Peran |
| --- | --- |
| **Dashboard** | Permukaan pengawasan: **1 angka dominan** (progres event berjalan, Geomini besar di card gelap) + KPI kas/penjualan + daftar event dengan progress bar. |
| **Event (list)** | Daftar semua tugas + filter status + **progress % per event**. Tombol "Buat Event Baru". |
| **Detail Event → Roadmap Pengawasan** | **Default landing event.** Hero: progres % keseluruhan (angka besar) + strip cek "belum lengkap" (SPPD/produk/milestone/saldo). Di bawahnya daftar tahap/milestone terurut dengan status **belum → sedang → selesai**; per tahap: nomor urut, badge status, **dokumen bukti** (chip metadata: nama/nomor/link), **biaya di tahap ini** (dari transaksi bertanggal) & **kas kumulatif** (derivasi tanggal dari seluruh transaksi). Tombol "+ Dokumen" menyimpan attachment metadata. |
| **Detail Event → Persiapan** | Bagian seksi bernomor: **01 SPPD & Perjalanan** (surat tugas: no surat, tujuan, kegiatan, status alur, dana awal + leg perjalanan 3 mode transport), **02 Produk & Checklist** (pilih produk dari Master Produk, qty dibawa, qty terjual otomatis / kembali / rusak-hilang), **03 Item Persiapan (non-produk)** (sewa hotel, kendaraan, tiket, dll — kategori, qty, biaya estimasi, status: belum/proses/disetujui/selesai, checkbox "dibawa" & "dibawa pulang"), **04 Cross-check Berangkat/Pulang** (2 kartu verdict: *Siap berangkat* = semua produk `dibawa ≥ terjual+rusak` && semua item selesai; *Pulang tuntas* = semua anomali `terjual+rusak−dibawa ≤ 0` && semua item pulang; tabel audit Produk & Item Persiapan + badge rekap), **05 Jadwal (Timeline)** (milestone bawaan + custom dengan status todo/berjalan/selesai). |
| **Detail Event → Uang & Laporan** | Baris stat KPI (dana awal/penjualan/penyesuaian/pengeluaran/saldo) lalu seksi: **01 Penjualan** (transaksi manual dibatasi sisa stok + rekap per produk), **02 Pengeluaran & Penyesuaian** (kategori pengeluaran, **penyesuaian kas** form+riwayat, Laporan Penggunaan Uang siap print), **03 Laporan** (Rekap Produk & Qty, Rekap Item Persiapan — biaya estimasi informatif, Rekap Penggunaan Uang). |
| **Master Produk** | Katalog produk (nama, satuan, harga jual default, stok kantor). |
| **Rekap Global** | Ringkasan keuangan lintas event (Total Penjualan, Total Pengeluaran, Saldo Total, Penjualan per Produk, Ringkasan per Event). **Bukan** laporan resmi — laporan pertanggungjawaban selalu **per event**: seksi **03 Laporan** di tab Uang & Laporan tiap event. |
| **Panduan & FAQ** | Menjelaskan semua modul & alur (isi lengkap di §7). |
| **Pengaturan** | Identitas pemilik, folder Drive bukti, info deploy GAS, dsb. |

---

## 4. Hubungan Antar Halaman

```
Dashboard ──(agregat)──► semua Event aktif & angka kunci
Event list ──► Detail Event (3 tab, default = Roadmap Pengawasan)
  Detail Event:
    Roadmap Pengawasan ──► milestone & status; dokumen bukti (metadata, siap Drive/GAS); biaya+kas per tahap (derivasi tanggal)
    Persiapan ──► 01 SPPD & Perjalanan (node data identitas ─► Pengaturan)
                ──► 02 Produk & Checklist (katalog dari Master Produk; qty_terjual otomatis dari Penjualan)
                ──► 03 Jadwal/Timeline (milestone)
    Uang & Laporan ──► 01 Penjualan (sinkron ─► keuangan: pemasukan otomatis)
                    ──► 02 Pengeluaran & Penyesuaian Kas (ref bukti ─► Google Drive)
                    ──► Laporan Penggunaan Uang (print)
Laporan ──(agregat semua event)──► data dari Event detail
Panduan/FAQ ──(statis)──► menjelaskan semua hal di atas
```

Hubungan data (kunci):
- **Event → SPPD** : 1 event punya 1 SPPD.
- **Event → Transport** : 1 event banyak leg perjalanan.
- **Event → Event_Produk** : banyak produk dibawa; tiap produk merujuk Master Produk.
- **Event_Produk → Penjualan** : qty terjual = SUM transaksi penjualan untuk produk-event tsb; **R3** batasi qty ≤ `stokSisa` = dibawa − terjual − rusak/hilang.
- **Event → Keuangan** : pemasukan = dana awal + SUM(sales) + SUM(kas_adj); pengeluaran = SUM(expenses)+transport; saldo = pemasukan − pengeluaran.
- **Event → Timeline** : banyak milestone.
- **Event → Item Persiapan** : banyak item (hotel/kendaraan/tiket/dll); `biaya` = **estimasi informatif** di Laporan R3 (tidak memotong saldo kas — opsional R berikutnya).

---

## 5. Logic Inti

### 5.1 Alur SPPD
```
Draft → Diajukan → Disetujui → Selesai
```
- Field: no surat, tanggal terbit, tujuan, kegiatan, instansi pemberi tugas, **dana_awal** (alokasi dana tugas), **realisasi** (nominal dana yang benar-benar terpakai / dipertanggungjawabkan di akhir), link dokumen (fase 2), catatan.
- **Visibilitas realisasi:** ada toggle "Tampilkan realisasi" per SPPD. Saat masih awal tugas, kolom realisasi boleh disembunyikan agar tidak rancu; saat mau close/pertanggungjawaban, toggle dinyalakan dan isi nominal realisasi.
- Status bisa mundur (koreksi) tapi dicatat `updated_at`.
- (Fase 2) Tombol "Buat Surat" → GAS isi template Google Docs dari data event → simpan PDF di Drive → link muncul di halaman.

### 5.2 Transportasi — 3 mode (per leg: Berangkat / Pulang / Lainnya)

| Mode | Isi form utama |
| --- | --- |
| **Sewa kendaraan** | vendor, jenis kendaraan, biaya sewa, durasi |
| **Transport umum** | jenis (kereta/bus/pesawat), no tiket, harga |
| **Pribadi** | jarak km, tarif/km (default dari Pengaturan), biaya bensin/tol, **total reimbursement otomatis** |

Setiap leg punya: tanggal, rute asal → tujuan, total biaya, catatan. Total biaya transport otomatis masuk kategori "transport" di Keuangan (bisa di-toggle/edit).

### 5.3 Segitiga Produk (Checklist ↔ Penjualan)
```
qty_terjual (otomatis dari Penjualan)
qty_dibawa (manual saat setup)
qty_rusak_hilang (manual)
qty_kembali = qty_dibawa − qty_terjual − qty_rusak_hilang
```
- Percobaan close event: tampilkan selisih & minta konfirmasi sebelum event ditandai selesai.

### 5.4 Keuangan / Penggunaan Uang
```
Saldo = dana_awal(SPPD) + SUM(sales) + SUM(kas_adj) − (SUM(transports) + SUM(expenses))
```
- **Pemasukan:** dari penjualan (otomatis), dana awal tugas (kolom SPPD), **penyesuaian kas** (setoran di luar transaksi booth, dana talangan masuk).
- **Pengeluaran:** transport (otomatis dari tab SPPD & Perjalanan) + expenses manual (kategori akomodasi, konsumsi, operasional, lainnya). Tiap item: tanggal, deskripsi, jumlah, bukti foto (opsional → Drive).
- **Penyesuaian kas (kas_adj):** entri koreksi ± (setoran, selisih opname, koreksi). Form di tab Keuangan + riwayat; tersortir tanggal desc.
- **Laporan "Detail Penggunaan Uang":** rincian per kategori + penyesuaian + total + saldo → tampilan siap print browser.

### 5.5 Timeline Progress
- Milestone bawaan: Persiapan → Berangkat → Event (H-0) → Pulang → Laporan.
- Bisa tambah custom milestone; tiap milestone: tanggal, status (todo/berjalan/selesai), catatan.
- Dashboard menampilkan milestone yang sedang berjalan.

### 5.6 Penjualan (manual, per transaksi)
- Isi: produk, tanggal, qty, harga satuan, metode (Cash/QRIS/Transfer), catatan.
- Rekap otomatis per event, per produk, per tanggal.

---

## 6. Data Model (Supabase PostgreSQL)

Semua tabel punya `user_id` (uuid, nullable) — siap multi-akun; v1 pakai nilai default tetap pemilik.

| Tabel | Kolom kunci |
| --- | --- |
| `events` | id, user_id, nama, jenis, lokasi, tanggal_mulai, tanggal_selesai, status, peran_pic, catatan |
| `sppd` | id, event_id (1:1), no_surat, tanggal_terbit, tujuan, kegiatan, instansi, status, dana_awal, realisasi, tampilkan_realisasi, link_dokumen, catatan |
| `transports` | id, event_id, leg, tanggal, mode(sewa/umum/pribadi), rute_asal, rute_tujuan, total_biaya, detail(mode)-fields, catatan |
| `products` | id, user_id, nama, sku, satuan, harga_jual_default, stok_kantor, aktif |
| `event_products` | id, event_id, product_id, qty_dibawa, qty_rusak_hilang, qty_kembali, catatan |
| `sales` | id, event_id, product_id, tanggal, qty, harga_satuan, metode, total, catatan |
| `expenses` | id, event_id, kategori, tanggal, deskripsi, jumlah, bukti_drive_id, bukti_link |
| `milestones` | id, event_id, judul, tanggal, status, urutan, catatan |
| `milestone_attachments` **BARU** | id, milestone_id (1:N), event_id (denormalisasi utk report), nama, no_surat, url, catatan, created_at — metadata-only; `url` kelak jadi `drive_id` (DriveApp). DILARANG base64 blob. |
| `kas_adj` **BARU** | id, event_id, tanggal, keterangan, jumlah (±), created_at — sort selalu `tanggal desc, id desc`. |
| `prep_items` **BARU v0.4** | id, event_id, nama, kategori, qty, biaya (estimasi), status (belum/proses/disetujui/selesai), dibawa (bool), pulang (bool), catatan — `dibawa`/`pulang` dipakai R2 (cross-check berangkat/pulang); `biaya` = estimasi informatif di Laporan R3, tidak memotong saldo kas. |
| `settings` | id, user_id, identitas_pemilik, tarif_km_default, folder_drive_id |

---

## 7. API GAS (action router — `doPost`/`doGet` → JSON)

Semua respons berformat `{ok:true,data}` / `{ok:false,error}`.

| Action | Fungsi |
| --- | --- |
| `bootstrap` | Ambil config awal (produk, settings) untuk seed frontend |
| `events.list` / `events.get` / `events.save` / `events.delete` | CRUD event |
| `sppd.get` / `sppd.save` | SPPD per event |
| `transports.list` / `transports.save` / `transports.delete` | Leg perjalanan |
| `products.list` / `products.save` / `products.delete` | CRUD master produk |
| `event_products.list` / `event_products.save` | Checklist produk event |
| `sales.list` / `sales.save` / `sales.delete` | Transaksi penjualan |
| `expenses.list` / `expenses.save` / `expenses.delete` | Pengeluaran |
| `milestones.list` / `milestones.save` | Timeline |
| `milestones.attachment.save` / `milestones.attachment.delete` | Dokumen bukti per tahap (metadata: nama, no_surat, url → drive_id) |
| `kas_adj.add` / `kas_adj.delete` | Penyesuaian kas (jumlah ±) |
| `finance.summary` | `{danaAwal, totalSales, totalKasAdj, totalTransport, totalExpense, pengeluaran, saldo}` |
| `bukti.upload` | Terima base64 (foto terkompres) → DriveApp → simpan ref |
| `reports.penjualan` / `reports.keuangan` | Rekap per event / global |

Keamanan: key Supabase disimpan di PropertiesService GAS (bukan hardcode di frontend), kunci sebisa mungkin via variabel. Payload GAS divalidasi sebelum diproses.

---

## 8. FAQ (isi halaman "Panduan & FAQ")

### Umum
1. **Sistem ini untuk apa?** Mengawasi persiapan event via **Roadmap Pengawasan**: satu event = jalur tahap (Persiapan → Berangkat → Pelaksanaan → Pulang → Laporan). Terlihat yang belum dikerjakan, tahap mana yang sedang jalan, dan tahap selesai membawa **dokumen bukti + rincian biaya & kas**. Plus modul pendukung: surat dinas (SPPD), transport, produk/checklist, penjualan, keuangan.
2. **Siapa penggunanya?** Saat ini akun pemilik. Nanti bisa beberapa akun, tiap akun punya data (roadmap) sendiri.
3. **Di mana data disimpan?** Database PostgreSQL (Supabase) untuk semua data; foto bukti di Google Drive; file aplikasi di GitHub (GitHub Pages). GAS menjadi jembatan API yang menjaga keamanan key.

### Alur kerja
4. **Bagaimana mulai?** Buka halaman Event/Tugas → "Buat Event Baru" → isi nama, lokasi, tanggal → lalu lengkapi tab satu per satu.
5. **Apa itu SPPD & alurnya?** Surat tugas perjalanan dinas. Alur: Draft → Diajukan → Disetujui → Selesai. Semua isian untuk surat ada di tab "SPPD & Perjalanan".
6. **3 jenis transport, kapan pakai yang mana?**
   - *Sewa kendaraan* saat butuh mobilitas penuh di lokasi (masukan vendor & biaya).
   - *Transport umum* saat pakai kereta/bus/pesawat (masukan no tiket & harga).
   - *Pribadi* saat pakai kendaraan sendiri (jarak & tarif → reimbursement dihitung otomatis).
   Isi per leg: berangkat dan pulang bisa beda mode.
7. **Bedanya "Produk & Checklist" dan "Penjualan"?**
   - *Produk & Checklist* = rencana & kondisi stok: berapa dibawa, berapa kembali, berapa rusak/hilang.
   - *Penjualan* = transaksi per barang terjual. Angka terjual otomatis masuk perhitungan selisih di checklist.
8. **Bagaimana timeline membantu?** Milestone (Persiapan → Berangkat → Event → Pulang → Laporan) membuat progress terlihat; tandai satu per satu agar dashboard selalu update.
9. **Di tab "Roadmap Pengawasan" ada angka "Biaya di tahap ini" dan "Kas sampai tahap ini" — akurat?** Angka itu derivasi tanggal dari seluruh transaksi (penjualan, penyesuaian, transport, pengeluaran) versus tanggal tiap tahap. Akurat untuk gambaran cepat; untuk angka final yang dipertanggungjawabkan selalu pakai tab **Keuangan** (saldo = dana awal + penjualan + penyesuaian − biaya).
10. **Bagaimana melampirkan dokumen ke tahap?** Tombol "+ Dokumen" per tahap → isi nama, nomor surat, link, catatan. Di prototype metadata tersimpan di sini; saat GAS tersambung link menunjuk file Google Drive (file asli tetap di Drive, bukan disimpan binary di sini).

### Keuangan
11. **Bagaimana rekap penjualan dihitung?** Otomatis dari tiap transaksi yang kamu input (produk × qty × harga). Di tab Penjualan ada rekap per produk & per tanggal.
12. **Apa itu "Detail Penggunaan Uang"?** Laporan pertanggungjawaban: dana awal + uang masuk dari penjualan + penyesuaian kas − semua pengeluaran = saldo akhir. Rincian per kategori siap dicetak.
13. **Apa itu "Penyesuaian Kas"?** Koreksi kas di luar transaksi umum: setoran dari panitia, selisih cash opname, dana talangan. Masuk pakai positif, keluar negatif.
14. **Boleh upload bukti foto?** Bisa, per pengeluaran. Foto dikompres otomatis lalu disimpan di Google Drive (bukan memakan database).

### Teknis & troubleshooting
15. **Kenapa GAS & Supabase?** Supabase sebagai database cepat & aman; GAS sebagai jembatan agar key Supabase tidak pernah tampil di browser, sekaligus pintu ke Google (Drive, nanti Docs/email).
16. **Kenapa kadang "membuat surat" terasa lambat?** GAS butuh beberapa detik pertama (cold start); semua aksi punya indikator loading. Kalau error, tampil pesan — coba lagi.
17. **Apa yang harus dilakukan setelah mengubah file GitHub?** Frontend di GitHub Pages: push ke repo → otomatis ter-deploy. Backend GAS: edit Code.gs di editor GAS → Deploy → Manage deployments → New version.

---

## 9. Roadmap

- **Fase 1 (v1):** Single owner, semua halaman di atas, GAS jadi jembatan Supabase, upload bukti ke Drive, laporan print via browser.
- **Fase 2:** Generate dokumen SPPD (template Google Docs → PDF), multi-akun dengan login ringan (tiap akun roadmap sendiri), kirim laporan via email.
- **Fase 3:** Integrasi payment (QRIS), dashboard statistik lanjutan, notifikasi deadline.

---

## 10. Keputusan yang Sudah Diambil (catatan untuk divilyang bekerja)

- Multi-user nanti, tiap akun = roadmap sendiri, TANPA role/pembatasan akses; v1 cukup 1 akun (ditandai `user_id`).
- GAS = jembatan keamanan: **key Supabase hanya di GAS**, frontend tidak pernah pegang key.
- Bukti foto: simpan di **Google Drive via GAS**, bukan base64 permanen di DB; frontend kompres/resize dulu.
- Penjualan: **manual per transaksi** (Cash/QRIS/Transfer), rekap otomatis.
- SPPD: kolom **dana_awal + realisasi**; realisasi punya toggle **visibilitas** (boleh disembunyikan saat awal tugas, dimunculkan saat pertanggungjawaban).
- <span style="color:red">**Council 21-09-2026 — jalur A+B (roadmap-first additive):**</span> transisi v0.1→v0.2. Detail event default = **Roadmap Pengawasan**; **enam tab lama tetap ada & setara, Keuangan tidak didemote** (Critic/Pragmatist win). Larangan: rebuild total & hapus fungsi. Tambahan skema hanya 2: `milestone_attachments` (metadata-only, no base64) & `kas_adj`. Saldo baru = danaAwal + sales + kasAdj − biaya. Design pass token-based (type scale/spacing/hierarchy) menyembuhkan "AI Slop". Silent-premise draw dari Skeptic: tahap = status soft (belum/sedang/selesai), bukan hard gate.
- Prototype v0.2: persistensi **localStorage + dummy data**; titik GAS & Supabase ditandai `// FUTURE: GAS` / `// FUTURE: SUPABASE`.

## 11. Pertanyaan Terbuka (diputuskan saat implementasi / diskusi lanjut)

- Format & template dokumen SPPD (template Docs) — konfirmasi contoh surat yang dipakai kini.
- Perlu perbedaan "modal" (dana awal tugas) vs "uang pribadi"? Atau cukup 1 kolom dana awal.
- Label kategori pengeluaran apakah perlu tambahan kustom.