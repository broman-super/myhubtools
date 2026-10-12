# BRIEF KONTEKS — QA 20 Agent (WAJIB DIBACA SEMUA AGENT)

> Semua agent WAJIB baca file ini dulu. Isinya: peta aplikasi, cara menjalankan
> app secara headless, aturan main, dan nama file output masing-masing agent.

---

## 1. Aplikasi yang diuji

**SPPD Toolbox** — prototype web tool untuk mengelola satu siklus tugas PIC
event: surat tugas (SPPD), transportasi, barang bawaan, progress, penjualan,
dan uang, dalam satu tempat.

- Lokasi: `C:\Users\Kael\Documents\AI Project\ArchiveDoc\`
- Stack: **Vanilla JS ES5** (pakai `var` + `function`), Tailwind via CDN,
  data di `localStorage`. Tanpa build step, tanpa backend.
- Buka `index.html` langsung lewat `file://` sudah jalan.

### Berkas penting (BACA SAJA, jangan diubah)

| File | Isi |
|---|---|
| `index.html` | Shell: header, nav, `<main id="app">`, footer, modal-root, toast-root |
| `js/app.js` | Bootstrap, router hash, event delegation, `A.reload()` |
| `js/store.js` | Semua data model + seed dummy + localStorage (v2) |
| `js/pages.js` | Halaman: dashboard, events, eventDetail, seksi 01 dan 02 |
| `js/pages2.js` | Halaman: seksi 03-08, products, reports, guide, settings, print |
| `js/actions.js` | Semua handler aksi (`data-action`) |
| `js/ui.js` | Helper: `esc`, `fmt`, `readVal`, `moneyInput`, `walletBadge`, `toast` |
| `css/styles.css` | Styling |
| `check11.html` | Harness QA yang sudah ada (21 assert, semua lulus) |

### Peta navigasi (8 halaman)

`#/dashboard` · `#/events` · `#/archive` · `#/products` · `#/master` ·
`#/reports` · `#/guide` · `#/settings`

### Layar Kerja (inti aplikasi)

`#/events/<id>` membuka **satu tab saja** ("Layar Kerja") berisi **8 seksi**:

| # | ID | Judul | Isi |
|---|---|---|---|
| 01 | `ps-1` | SPPD & Dana Cair | kartu SPPD, blok Dana Cair, blok Rincian Alokasi SPPD (budget + wallet), blok Transport |
| 02 | `ps-2` | Jadwal & Milestone | milestone bawaan + lampiran dokumen |
| 03 | `ps-3` | Produk dan Qty (Aset Jual) | checklist produk, qty dibawa/terjual/rusak/kembali |
| 04 | `ps-4` | Item Persiapan (Aset & Alat) | barang kerja PIC + status dibawa/pulang |
| 05 | `ps-5` | Uang — Penjualan | form penjualan per transaksi + rekap per produk |
| 06 | `ps-6` | Uang — Pengeluaran & Penyesuaian | pengeluaran, penyesuaian kas, saldo |
| 07 | `ps-7` | Cross-check Berangkat/Pulang | checklist berangkat & pulang |
| 08 | `ps-8` | Uang — Laporan | Anggaran vs Realisasi, Arus Kas per Wallet, tombol cetak |

Tiap seksi punya tombol lipat (`psec:toggle`). Ada `hero` "Progres persiapan"
dan `flowbar` "Alur Kerja" berisi 8 pill untuk lompat ke seksi.

### Data seed (dari `store.js`)

- Instansi: **Dinas Koperasi & UMKM Kota**
- `evt-1` = "Pameran UMKM Nusantara Expo 2026" (berjalan, Bali/Denpasar, 22-25 Apr 2026)
  - SPPD `039/SPPD/UKM/2026`, Dana Awal **2.500.000**
  - Budget 5 baris total **2.850.000** (selisih +350.000):
    Penginapan 900.000 (Bank) · Transport Umum 1.350.000 (Bank) ·
    BBM dan Tol 150.000 (Kas) · Uang Saku 250.000 (E-Money) ·
    Kas Kecil 200.000 (Kas)
  - Dana Cair: Transfer instansi (BCA) / BCA - 8910 / 1.500.000 (cair)
    + 1.000.000 (belum)
- `evt-2` = "Gelar UMKM Kota 2026" (draft), `evt-3` = "Bazar Ramadan Ceria 2026" (selesai)
- Produk: Batik Tulis 250.000, Tenun Ikat 350.000, Kopi Bubuk 35.000,
  Gantungan Kunci 15.000, Totebag 60.000, Kripik Pisang 15.000,
  Kerajinan Bambu 45.000, Minuman Herbal 12.000
- Masih ada event lain (`ev-d1`, `ev-d5`, dst) untuk menjaga spektrum status.

### 4 wallet

`Bank` · `QRIS` · `Kas` · `E-Money` — dipakai di penjualan, pengeluaran,
transport, penyesuaian kas, **dan** baris alokasi SPPD.

---

## 2. Cara menjalankan app secara headless (WAJIB pakai cara ini)

Pakai **Edge headless**. Ini satu-satunya cara yang sudah terbukti jalan.

```powershell
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$tmp="C:\Users\Kael\AppData\Local\Temp\opencode"
$prof="$tmp\prof_namaagent"          # WAJIB unik per agent
if(Test-Path $prof){Remove-Item $prof -Recurse -Force}
$u="file:///C:/Users/Kael/Documents/AI%20Project/ArchiveDoc/index.html#/events/evt-1"
& $edge --headless=new --disable-gpu --no-sandbox --user-data-dir="$prof" `
       --virtual-time-budget=9000 --dump-dom $u
```

### Jebakan yang sudah ditemukan (JANGAN ulangi)

1. **localStorage**: tanpa `--user-data-dir` unik, data bisa tercemar dari run
   sebelumnya. Selalu pakai profil unik **dan** `localStorage.clear()` di awal.
2. **XHR diblokir di `file://`** — jangan pakai `XMLHttpRequest` untuk baca file.
3. **Hasil tes harus ditulis ke `<pre id="out">`** (atau `document.title`), lalu
   dibaca dari hasil `--dump-dom`.
4. **`setTimeout` besar TIDAK jalan** dengan `--virtual-time-budget`.
   Pakai polling: `if (!target && tries < 300) { setTimeout(run, 20); return; }`
5. **Screenshot tidak bisa dibaca** — verifikasi visual harus **numerik**
   (`getBoundingClientRect`, `getComputedStyle`, `offsetWidth`).
6. **`cscript`/JScript itu ES3** — selalu gagal parse ES6, terutama
   `js/actions.js`. JANGAN pakai cscript untuk cek syntax. Kalau perlu, cek
   syntax lewat browser memakai `new Function(src)`.

### Cara membuat harness

Buat file `.html` di dalam folder `_QA_TMP/` (buat foldernya kalau belum ada).
Isinya: `<script src="file:///C:/Users/Kael/Documents/AI Project/ArchiveDoc/js/ui.js">`
dan seterusnya, lalu skrip tes yang menulis hasil ke `<pre id="out">`.

**WAJIB** taruh harness di `_QA_TMP/` — JANGAN di root project. Root project
hanya boleh `index.html` dan `check11.html`. Hapus file harness kalau tidak
dipakai lagi.

---

## 3. Aturan main (WAJIB)

1. **JANGAN ubah kode aplikasi.** Semua file di `js/`, `css/`, dan `index.html`
   bersifat **read-only**. Tugasmu **mencari masalah**, bukan memperbaiki.
   Kalau merasa perlu memperbaiki → tulis di catatan, jangan diedit.
2. **Satu file markdown per agent.** Tulis hanya ke file yang namamu ditetapkan
   di bagian 4. **Jangan** menulis file milik agent lain dan jangan edit BRIEF ini.
3. **Mulai dari `localStorage.clear()`** supaya menguji seed default, bukan data
   sisa agent lain.
4. **Jujur.** Kalau tidak menemukan bug di suatu area, tulis begitu. Jangan
   mengarang. Lebih baik 2 temuan nyata daripada 10 karangan.
5. **Bukti tiap temuan.** Setiap temuan wajib punya: langkah reproduksi
   (bernomor), hasil yang diharapkan, hasil sebenarnya, dan evidence (angka dari
   DOM atau pesan error).
6. Bahasa **Indonesia**, santai tapi teknis dan jelas.
7. Panjang catatan **minimum 120 baris**, sedetail mungkin.
8. Kalau tidak yakin, tandai **"perlu konfirmasi"**.

---

## 4. Pembagian tugas — nama file output setiap agent

| Agent | Persona | Area fokus | File output |
|---|---|---|---|
| 01 | User Baru Pengguna HP | Onboarding, first-run, halaman utama | `AGENT-01-user-baru-hp.md` |
| 02 | Operator Surat Tugas | Seksi 01 SPPD, status, Dana Cair | `AGENT-02-operator-surat-tugas.md` |
| 03 | Arneta Lapangan | Mobile, input cepat, sinyal buruk | `AGENT-03-arneta-lapangan.md` |
| 04 | Bendahara | Angka, saldo, rekonsiliasi | `AGENT-04-bendahara.md` |
| 05 | Auditor | Bukti, jejak, print | `AGENT-05-auditor.md` |
| 06 | Atasan / Direksi | Dashboard, kilat, angka pertama | `AGENT-06-atasan-direksi.md` |
| 07 | Admin Backoffice | Master data, produk, arsip | `AGENT-07-admin-backoffice.md` |
| 08 | User Senior / Lanjut Usia | Font besar, kontras, keterbatasan fisik | `AGENT-08-user-senior.md` |
| 09 | Penyandang Disabilitas | Kontras, screen reader, keyboard | `AGENT-09-aksesibilitas.md` |
| 10 | Alfabetisasi Rendah | Icon dulu, baca sedikit | `AGENT-10-alfabetisasi-rendah.md` |
| 11 | Tidak Sabar | 5 detik, cari jawaban cepat | `AGENT-11-tidak-sabar.md` |
| 12 | Power User | Input banyak, keyboard cepat | `AGENT-12-power-user.md` |
| 13 | Multi-Event | Banyak event, cari cepat | `AGENT-13-multi-event.md` |
| 14 | QRIS dan E-Money | Alur pembayaran digital | `AGENT-14-qris-emoney.md` |
| 15 | Pencinta Salin-Tempel | Impor dari Excel/WA | `AGENT-15-salin-tempel.md` |
| 16 | Traumatis Kehilangan Data | Takut hilang, backup, reset | `AGENT-16-khawatiran-data-hilang.md` |
| 17 | Lintas Perangkat | Pindah HP dan komputer | `AGENT-17-lintas-perangkat.md` |
| 18 | Pelajar / Juin | Belajar, salah paham istilah | `AGENT-18-pelajar-baru.md` |
| 19 | Orang Sibuk | 10 menit, deadline mepet | `AGENT-19-orang-sibuk.md` |
| 20 | Sang Skeptikus | Curiga, uji batas, cari celah | `AGENT-20-skeptikus.md` |

---

## 5. Format output tiap catatan (WAJIB IKUTI)

```markdown
# AGENT-NN — <Nama Persona>

> **Persona:** <1 kalimat> · **Fokus:** <area utama> · **Tanggal:** 2026-10-01

## Ringkasan
<Tabel jumlah temuan per severity, lalu 1 paragraf kesimpulan>

## Environment yang dipakai
- Edge headless, profil unik, seed default (localStorage dikosongkan)
- Rute yang diuji: ...

## Temuan

### [BUG-01] <Judul singkat> — <severity: KRITIS | TINGGI | SEDANG | RENDAH>

**Persona dan use-case:** ...

**Langkah reproduksi:**
1. ...
2. ...

**Harapan:** ...

**Kenyataannya:** ...

**Evidence:** `...angka atau kutipan dari DOM...`

**Dampak ke pengguna awam:** ...

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** ...

## Yang sudah bagus (agar tidak hilang saat refactor)
- ...

## Pertanyaan terbuka / perlu konfirmasi
- ...

## Skor pengalaman (1-5)
| Aspek | Skor | Alasan |
|---|---|---|
| ... | ... | ... |
```

### Arti severity

- **KRITIS** — pengguna kehilangan data atau tidak bisa menjalankan aplikasi sama sekali
- **TINGGI** — pengguna terjebak, salah input tanpa sadar, atau hasil salah diam-diam
- **SEDANG** — membingungkan tapi ada jalan keluar
- **RENDAH** — kosmetik atau polish

---

## 6. Aturan harian untuk menulis
- Tulis dalam Bahasa Indonesia yang natural, seperti catatan QA internal.
- Sertakan angka nyata dari hasil tes, bukan deskripsi generik.
- Hindari menyalin paragraf BRIEF; tulis ulang sesuai pengalamanmu.
