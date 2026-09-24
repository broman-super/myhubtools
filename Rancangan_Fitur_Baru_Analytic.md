# Rancangan Fitur Baru — Web Analytic: Panel Issue & Rekomendasi (Weekly Review)

> Status: **DRAFT / RANCANGAN** — belum diimplementasi. Dibuat agar bisa dibahas di weekly meeting.
> Tanggal rancangan: 2026-09-24

## 1. Ringkasan

Tambahan **satu kolom/panel** di dashboard Analytic yang berisi **kumpulan issue yang harus dibahas minggu ini + rekomendasi tindakan** untuk tiap issue.

Tujuan:
- Data yang sudah ada (KPI, trend, retur, piutang, biaya, margin) **diterjemahkan jadi pertanyaan meeting** (`"Omzet turun 12% vs periode lalu — kenapa?"`) bukan hanya angka.
- Setiap issue punya **rekomendasi tindakan konkret** yang tinggal diverifikasi/diskusi.
- Status tiap issue bisa ditandai (belum/bisa dibahas/selesai) agar meeting punya alur jelas.
- Bisa **di-cetak** sebagai lembar agenda mingguan (mengikuti area print view yang sudah diperbaiki).

## 2. Asumsi (harap dikoreksi bila salah)

- Fitur **web-only (tanpa backend)** — deteksi issue berbasis aturan di sisi client dari data yang sudah dimuat (KPI, dataFrame, biaya). Status issue disimpan di `localStorage`.
- Tidak butuh AI eksternal; aturan sederhana + ambang batas (threshold) yang bisa disesuaikan.
- Panel tampil sebagai satu **bento-item** baru di grid `#mainContainer` (default: `col-span-12`, bisa di set di bawah KPI).
- "Issue" = temuan terukur (dari angka), bukan catatan bebas.
- Print view (area yang sudah diperbaiki) ikut mencetak panel ini — sebagai agenda meeting.

## 3. Detail Fitur

### 3.1 Yang terdeteksi (rule-based)

Dari data yang ada sekarang, usulan aturan awal (ambang masih bisa diubah):

| # | Issue (aturan) | Sumber data | Rekomendasi tindakan awal |
|---|---|---|---|
| 1 | **Omzet turun** vs periode pembanding (mis. < -10%) | DataTable tren/omzet | Cek: hari-hari mana yang turun; korelasikan dgn promo/stock/stok kosong; banding kanal teratas |
| 2 | **Retur rate tinggi** (retur/omzet > mis. 5%) | Total Retur / Omzet | Breakdown retur per tanggal & produk; cek alasan retur, sesuaikan QC/pelabelan |
| 3 | **Target mingguan terancam** (run-rate < perlu per hari) | `kpiSalesRunRate` | Prioritas produk/konsumen terbesar; cek piutang yang tertahan |
| 4 | **Piutang besar atau menaik** (mis. > X% dari omzet) | KPI Piutang | Rekap piutang per pelanggan; follow-up pembayaran |
| 5 | **Margin menyusut** (margin < ambang / turun vs pembanding) | chartMargin | Cek harga jual vs COGS, item rugi, diskon berlebih |
| 6 | **Periode tanpa data** | emptyState / dataFrame kosong | Konfirmasi data sudah di-input (sheet / db) — paling sering jadi alasan meeting |
| 7 | **Pergerakan kategori ekstrem** (top naik/turun) | chartKategori | Bahas kategori pemenang/tertinggal, alokasi stok |
| 8 | **Golden day lemah** (hari paling sepi) | KPI Golden Day | Evaluasi promo/operasional di hari itu |

Aturan ini cukup dievaluasi saat data selesai dimuat (satu fungsi `detectIssues()`).

### 3.2 Isi tiap kartu issue

- Judul singkat (mis. "Omzet turun 12% vs periode lalu").
- Badge prioritas: `Tinggi / Sedang / Rendah` (dari besarnya deviasi).
- Detail singkat (angka + dari mana asalnya).
- **Rekomendasi tindakan** (2–4 langkah, sudah tertulis di 3.1).
- Status: `Belum dibahas → Dibahas → Selesai` (klik siklus / dropdown; disimpan `localStorage`).

### 3.3 Layout

Satu bento-item di `#mainContainer`:

```
┌────────────────────────────────────────────────────┐
│ ISSUE WEEKLY — 3 temuan      [Cetak Agenda]  :has() │
│ ┌───────────────────────────────────────────────┐  │
│ │ ● Omzet turun 12% vs periode lalu      [Prioritas] │
│ │   Rekomendasi: cek hari turun → cek stok → …  │  │
│ │   Status: Belum dibahas                        │  │
│ └───────────────────────────────────────────────┘  │
│ … item 2, 3 …                                       │
└────────────────────────────────────────────────────┘
```

- Default `col-span-12` di bawah KPI, sengaja penuh agar muat dicetak.
- Panel kosong ("Tidak ada temuan") — tampilkan teks hijau/aman (mirip empty-state positif).

### 3.4 Cetak agenda meeting

- Tombol "Cetak Agenda" → `window.print()` (media print) → panel ikut masuk lembar cetak sebagai halaman agenda.
- Di print: tetap `display:grid`; tiap kartu issue `break-inside: avoid`.

### 3.5 State & penyimpanan

- `localStorage['analytic.weeklyReview']` = `{ "2026-09-21": { issueKey: "status" } }` (per-minggu, minggu dihitung dari periode terpilih).
- Status tidak perlu cloud; meeting tinggal lihat hasil cetak/screen.
- Data issue dihitung ulang tiap load period — tidak disimpan, karena harus selalu segar terhadap data.

## 4. Breakdown Implementasi (urutan saran)

1. Fungsi `detectIssues()` v1 (6–8 aturan, ambang configurable) + test data kecil.
2. Render bento-item `#weeklyIssue` + kartu issue + badge prioritas + status toggle.
3. Persist status per-minggu di localStorage.
4. Integrasi print CSS (kolom baru ikut layout + `break-inside`).
5. Refine threshold setelah 1–2 minggu pemakaian nyata.

## 5. Pertanyaan Terbuka (untuk meeting)

1. Aturan mana yang paling berguna dulu? (mulai dari 1–3 rule yang paling sering dikeluhkan?)
2. Ambang default: omzet -10%? retur 5%? piutang %? — atau mau dibuat config input di halaman?
3. Letak panel: di bawah KPI (full-width) atau kolom samping (4/8)?
4. Status perlu disimpan permanen (localStorage sudah cukup) atau juga ingin tercatat di sheet/GAS?
5. Cetak agenda: cukup panel issue saja, atau sekalian dijadikan halaman pertama di print view?

---
*Rancangan ini draft — setelah disepakati di meeting, dipecah jadi task implementasi bertahap.*