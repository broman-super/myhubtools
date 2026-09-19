# Faktur Penjualan — Supersub

Pembuat faktur penjualan format resmi **A4** berbasis web: pilih produk dari katalog Resi Generator, isi pembeli, lalu **Simpan PDF via `window.print()`** — tanpa backend.

- **File:** `Productive/Faktur-Penjualan/Index.html`
- **Backend:** ⛔ Tidak ada (pure client-side)
- **Status:** ✅ Stable — client-side

---

## 1. Fitur & Cara Pakai

- **Data penjual default** — terisi otomatis dari `DEFAULT_PENJUAL` (Supersub). Bisa diedit per-faktur.
- **Dropdown/autocomplete produk** — dari `products.json` milik Resi Generator (path relatif `../Resi-Generator/products.json`); fallback `EMBEDDED_PRODUCTS` saat `file://`.
- **No. faktur auto** — `INV-YYYYMMDD-SEQ` (SEQ harian, `localStorage 'invSeq_<tanggal>'`), bisa di-override manual.
- **Status faktur** — dropdown Terbit/Dibayar per faktur, tampil di kop & riwayat (badge hijau saat Dibayar).
- **Logo kop opsional** — unggah PNG/JPG ≤1 MB (`localStorage 'invoiceLogo'`), tampil di kiri atas lembar faktur; bisa dihapus.
- **Satuan per baris** — default `pcs`, bisa diganti (unit, dus, meter, dll), ikut tercetak di kolom Satuan.
- **PPN 11%** otomatis (UU HPP), diskon per baris, ongkir manual.
- **Live preview A4** — pane kanan update realtime (`iframe.srcdoc`).
- **Simpan PDF** — popup → `window.print()` → pilih "Save as PDF"; faktur valid otomatis masuk **Riwayat**.
- **Riwayat faktur** — `localStorage 'invoiceHistory'` (max 200): simpan saat print, daftar dengan total & status, aksi **Muat** (kembali ke form, cetak ulang/edit), **Cetak ulang**, **Hapus**.
- **Database Supabase (sama dengan Universal Tools)** — proyek `iyraamxkrygtzsqkvnqz.supabase.co`, tabel `faktur_penjualan`. Riwayat disinkronkan ke cloud (upsert per no. faktur); saat offline/DB belum ada, otomatis fallback ke localStorage. Badge di panel "Riwayat Faktur" menandakan mode: **DB online** / **DB lokal**.
- **Validasi pengisian**:
  - **Diskon** maksimal **100%** — nilai yang diketik >100 atau negatif langsung dikoreksi ke 100/0.
  - **No. telpon** hanya boleh **angka & `+`** — karakter lain langsung dibuang saat mengetik (`+` hanya di posisi pertama).
  - **No. faktur otomatis** — terisi otomatis saat halaman dibuka dan saat **halaman/faktur baru**; jika field kosong lalu ditinggalkan/blur, nomor di-generate ulang. Tersedia tombol **Auto** untuk membuat nomor baru.
- **Bulk edit produk** — tombol **Tambah Banyak** membuka modal; tempel banyak baris sekaligus (`nama` atau `nama, qty, satuan, harga, diskon%`, pisahkan dengan koma/pipa/titik-koma, satu produk per baris) lalu **Tambah Semua**. Baris kosong/tidak valid dilewati dan dihitung.
- **Kelola harga produk** — tombol "Kelola Harga Produk" membuka modal daftar katalog + harga default per SKU (simpan ke `localStorage 'invoicePrices'`); ada pencarian produk.
- **Draft persist** — form tersimpan otomatis di `localStorage 'invoiceDraft'`; halaman dimuat ulang → data kembali.

---

## 2. Keterkaitan

### 2.1 Data (client)
| Sumber | Isi | Catatan |
|---|---|---|
| `../Resi-Generator/products.json` | katalog produk (`{name, sku}`) | dimuat via fetch; **jangan di-edit dari tool ini** |
| `EMBEDDED_PRODUCTS` (inline) | fallback produk | dipakai saat fetch gagal (`file://`) |
| `localStorage 'invoiceDraft'` | draft faktur | auto-save + restore |
| `localStorage 'invoicePrices'` | harga default per SKU | modal "Kelola Harga Produk" + auto-fill |
| `localStorage 'invoiceHistory'` | riwayat faktur tersimpan | max 200 entri, terbaru di atas |
| `localStorage 'invoiceLogo'` | logo kop (dataURL) | tampil di kiri atas lembar |
| `localStorage 'invSeq_<tanggal>'` | counter nomor faktur harian | reset otomatis per hari |
| **Supabase** `faktur_penjualan` | riwayat faktur cloud | mencerminkan `invoiceHistory` (upsert) |

### 2.2 Hub & Shell
- Router: `#utilities/faktur` → `Productive/Faktur-Penjualan/Index.html`.
- CSS: `../../src/styles/tools.css` + token REYNAHUB (`var(--bg-card)`, `var(--accent)`, dst).
- Tema dark/light: `toggleTheme()` inline + `postMessage` tipe `SET_THEME` dari hub.

---

## 3. Aturan & Catatan

### 3.1 Produk — jangan edit `products.json` Resi Generator
- Tool ini membaca file tersebut (read-only, via fetch).
- Untuk mengubah katalog produk: ubah di **Resi Generator** (`Productive/Resi-Generator/products.json`) atau fallback `EMBEDDED_PRODUCTS` di tool ini.

### 3.2 PPN & pembulatan
- PPN **11%** (`CONFIG_FAKTUR.ppnPersen`).
- Semua nilai Rupiah **dibulatkan bulat (`Math.round`)** — tidak ada sen.
- Rumus: `jumlahBaris = qty × harga × (1 − diskon%)` → `subtotal = Σ jumlahBaris` → `ppn = round(subtotal × 11%)` → `total = subtotal + ppn + ongkir`.

### 3.3 Print = popup, bukan library PDF
- `window.open(...)` → `document.write(buildInvoiceHTML(d))` → `setTimeout(...,350)` → `w.print()`.
- Browser menyediakan "Save as PDF". **Jangan** ganti ke library PDF kecuali benar-benar butuh.

### 3.4 Supabase (wajib satu kali setup di dashboard)
- Proyek sama dengan kumpulan tool **Universal Tools** (UNITOOLS): `iyraamxkrygtzsqkvnqz.supabase.co`.
- **Tabel belum otomatis dibuat** — tool otomatis fallback ke localStorage sampai tabel ada. Buat sekali di **Supabase Dashboard → SQL Editor**, jalankan:

```sql
-- Tabel riwayat faktur (mirror localStorage 'invoiceHistory')
create table if not exists public.faktur_penjualan (
  id text primary key,             -- = no. faktur (INV-YYYYMMDD-NNNN)
  data jsonb not null,             -- satu entri riwayat lengkap
  updated_at timestamptz not null default now()
);

alter table public.faktur_penjualan enable row level security;

-- Anon (browser) boleh SELECT & INSERT/UPDATE agar tool tanpa login bisa memakai DB
drop policy if exists "faktur_penjualan_select" on public.faktur_penjualan;
create policy "faktur_penjualan_select" on public.faktur_penjualan for select to anon using (true);
drop policy if exists "faktur_penjualan_upsert" on public.faktur_penjualan;
create policy "faktur_penjualan_upsert" on public.faktur_penjualan for insert to anon with check (true);
drop policy if exists "faktur_penjualan_update" on public.faktur_penjualan;
create policy "faktur_penjualan_update" on public.faktur_penjualan for update to anon using (true) with check (true);
```

- Setelah tabel jadi, badge "Riwayat Faktur" berubah **DB online**: riwayat tersimpan ke cloud & tersinkron dari semua perangkat.
- `SUPABASE_URL`/`ANON_KEY` disimpan di `CONFIG_DB` (pola `Productive/tr-retur/retur-track.html`). **Jangan commit anon key proyek lain** — proyek ini memang tanpa auth (public), sama seperti tool Universal lain.

### 3.5 Seed katalog produk (opsional, rekomendasi)
- Konversi katalog Resi-Generator (`products.json`, 390 item) ke tabel **`faktur_produk`** (SKU, nama, harga) sudah disiapkan: **`seed-produk.sql`** — buka, masuk ke **Supabase Dashboard → SQL Editor → New query**, paste seluruh isi file, **Run**.
- Idempotent: aman dijalankan ulang (upsert per SKU). Kolom `harga` default `0` — isi via tool ("Kelola Harga Produk") atau Table Editor.
- Isi harga semua katalog sekaligus lewat **`seed-harga.sql`** (Classic/Xtreme/Aerogrip/Twotone = 185.000, Waterproof = 200.000). Setelah di-Run, tool otomatis memakai harga tersebut saat buka (fetch `faktur_produk`, fallback ke `invoicePrices`/`invoicePrices` localStorage bila DB offline).
- Faktur Penjualan tetap membaca katalog dari `products.json`/`EMBEDDED_PRODUCTS`; tabel DB disiapkan untuk sinkronisasi katalog lintas perangkat berikutnya.
- Namun **harga default sudah diambil dari Supabase** (`faktur_produk.harga`) saat tool dibuka — relevan kalau nanti sinkronisasi katalog berjalan.

---

## 4. Flow Data (ringkas)

```
loadProductDatabase (fetch products.json → fallback embedded)
→ isi form (autocomplete produk + qty/harga/diskon) → hitungFaktur (pure)
→ render preview iframe (srcdoc) → auto-save draft (localStorage)
→ "Simpan PDF" → popup A4 (buildInvoiceHTML) → window.print() → Save as PDF
→ simpanRiwayat → riwayat (localStorage) → Muat / Cetak ulang / Hapus
```