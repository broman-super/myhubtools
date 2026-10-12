# CHANGELOG — SPPD Toolbox / Roadmap Pengawasan Event

Format log per ronde. Setiap entri = hasil kerja tim (PM, UI/UX, FE, BE, QA).

---

## v0.6 · R3 — Sinkron Stok Penjualan + Laporan Lengkap — SELESAI ✓

**Tujuan (pilihan user):** (1) validasi stok saat input penjualan, (2) laporan lengkap. Tanpa migrasi schema.

| Agen | Peran | Hasil |
| --- | --- | --- |
| PM | Brief | Qty penjualan dibatasi sisa stok; laporan satu layar (produk & qty, item persiapan, penggunaan uang). |
| UI/UX | Design | Seksi bernomor **03 Laporan** di tab Uang & Laporan: 3 kartu (Rekap Produk & Qty, Rekap Item Persiapan, Rekap Penggunaan Uang); opsi produk menampilkan `(sisa N)`; teks bantuan validasi. |
| FE | Implementasi | `tabLaporan()` di pages2.js; label sisa stok pada `<option>` form penjualan. |
| BE | Data | `stokSisa(eventId, productId)` di store.js = `max(dibawa − terjual − rusak, 0)`, `null` bila produk tak ada di checklist; tidak ada kolom baru → **tanpa migrasi**. |
| QA | Verifikasi | stokSisa seed: prd-1=11, prd-3=68, prd-4=38, produk-luar=null ✓; oversold qty 12 (sisa 11) **DITOLAK** dan tidak tercatat (terjual tetap 9) ✓; jual valid qty 5 → terjual 14, sisa 6 ✓; seksi 03 + 3 kartu render ✓; overflow mobile `-15` ✓; tanpa console error ✓. |

**Catatan:** biaya item persiapan ditampilkan di laporan sebagai **estimasi informatif** (tidak memotong saldo kas) — sinkron penuh biaya→kas tidak termasuk pilihan R3.

**Amendemen (council 22-09-2026):** halaman nav `#/reports` diganti label **"Rekap Global"** dengan judul & deskripsi baru — filosofi ditegaskan: `Rekap Global` = ringkasan lintas event, **bukan** laporan resmi; laporan yang dimaksud tetap **per event** (seksi `03 Laporan` di tab Uang & Laporan tiap event). Tidak ada data/fungsi yang dihapus. Keputusan jalur C (relabel) vs B (indeks per-event) — pilihan user.

**File:** `js/store.js` `js/actions.js` `js/pages2.js` `SPESIFIKASI.md`

**Status:** ✅ ronde SELESAI (aman). Map R0–R3 tuntas.

---

## v0.5 · R2 — Cross-check Berangkat/Pulang — SELESAI ✓

**Tujuan:** verifikasi "0 aset tertinggal" — dua gerbang: **Siap berangkat** (semua produk & item persiapan tuntas: `berangkatOk`) dan **Pulang tuntas** (tidak ada produk kelebihan jual/kehilangan & semua item persiapan pulang: `pulangOk`).

| Agen | Peran | Hasil |
| --- | --- | --- |
| PM | Brief | Definisi anomali = `terjual + rusak/hilang − dibawa`; ✓ selesai bila ≤ 0 (sisa dibawa pulang), ✗ perlu cek bila > 0 (oversold). Gerbang berangkat ∶ semua produk `qtyDibawa ≥ qtyTerjual+rusak` && semua item persiapan `selesai`. |
| UI/UX | Design | Seksi bernomor **04** Cross-check di tab Persiapan: 2 kartu verdict `.vc` (dot hijau/merah), deskripsi, daftar miss; gaya audit Produk & Item Persiapan; chip roadmap "Siap berangkat"/"Pulang tuntas". |
| FE | Implementasi | `tabCrossCheck()` di pages2.js + `.vc` block di styles.css; chip hero di pages.js memakai `berangkatOk/pulangOk`. |
| BE | Data | `epAnomali/berangkatOk/pulangOk` di store.js; toggle checkbox `prepitem:pulang` (pakai kolom `pulang` yang sudah disiapkan R1 = tanpa migrasi); aksi `prepitem:pulang` di actions.js. |
| QA | Verifikasi | 2 vc card + 3 checkbox ✓, badge rekap "tuntas ×3" / "cek ×0", berangkat NO (tiket "disetujui" belum "selesai") ✓, roadmap 3 yes/3 no ✓, overflow mobile `-15` ✓, tanpa console error ✓. |

**Defect ditemukan & diperbaiki (E2E):** checkbox `prepitem:pulang` ter-bind ganda — delegasi `click` dan `change` di app.js sama-sama memangil `h(el, readData(el))`. Klik memicu handler `click` (baca `checked` lama, tulis nilai salah, reload) lalu `change` ke node yang sudah ter-replace → toggle tidak deterministik. Fix: listener `click` men-skip `INPUT/SELECT/TEXTAREA` karena elemen formulir dikelola oleh `change` (app.js:81-96). Terverifikasi: `pulangOk('evt-1') = true` setelah 3 toggle, `berangkatOk = false` (benar), tanpa exception.

**File:** `js/store.js` `js/actions.js` `js/pages2.js` `js/pages.js` `js/app.js` `css/styles.css` `SPESIFIKASI.md`

**Status:** ✅ ronde SELESAI (aman). Lanjut R3 — Produk Dibawa ↔ Produk Terjual sinkron + laporan.

---

## v0.4 · R1 — Item Persiapan (non-produk) — SELESAI ✓

**Tujuan (R0 council):** tujuan "web sempurna" dipecah jadi ronde otonom berbatas, risikonya diukur. R1 = fitur additif yang paling aman (tanpa migrasi schema).

| Agen | Peran | Hasil |
| --- | --- | --- |
| PM | Brief | Checklist item persiapan non-produk (hotel, kendaraan, tiket) + status + biaya. |
| UI/UX | Design | Seksi bernomor **03** dalam tab Persiapan; kartu stat (Item/Seiap/Biaya); konsisten token; follow psec. |
| FE | Implementasi | `tabPrepItems()` di pages2.js (list + form), chip hero di roadmap "Persiapan siap". |
| BE | Data | Array `prepItems` di store (seed 3 contoh + migrasi `[]` tanpa muat data lama), CRUD `savePrepItem/deletePrepItem/prepItemsDone/prepBiaya`, aksi `prepitem:add/setstatus/delete` di actions.js. |
| QA | Verifikasi | Render 4 seksi ✓, 3 item seed ✓, overflow mobile `-15` ✓, tanpa console error ✓, snapshot localStorage harness dibangun. |

**File:** `js/store.js` `js/actions.js` `js/pages2.js` `js/pages.js` `SPESIFIKASI.md`

**Status:** ✅ ronde SELESAI (aman). Lanjut R2 — Cross-check berangkat/pulang.

---

## v0.3 — Konsolidasi 3 Tab (Roadmap / Persiapan / Uang & Laporan)

- 7 tab → 3 tab + peta LEGACY deep-link (ringkasan→roadmap, sppd/produk/timeline→persiapan, penjualan/keuangan→uang).
- Design pass: `.ev-head` (kicker accent + judul Geomini), `.tabseg`, `.psec` bernomor, `hero-checks`, `.phase-num`; footer v0.3.
- Fix defect overflow mobile 86px (grid `lg:grid-cols-3` → `grid grid-cols-1 lg:grid-cols-3`).
- QA: tanpa console error, tanpa NaN, tiap `data-action` ↔ handler cocok (audit independen), warna token memakai `var()`/color-mix, copy Panduan disesuaikan.

## v0.2 — Reframe Roadmap Pengawasan

- Landing event = Roadmap: hero angka besar (Geomini) + fase milestone berurutan + badge status + dokumen bukti per tahap + biaya & kas kumulatif (derivasi tanggal).
- Tab baru dipertahankan: Ringkasan, SPPD, Produk, Timeline, Penjualan, Keuangan, Master Produk, Laporan, Panduan, Pengaturan.