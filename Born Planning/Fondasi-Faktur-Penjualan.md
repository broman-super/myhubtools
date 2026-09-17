# Fondasi: Web Faktur Penjualan (Invoice Builder)

Dokumen fondasi untuk membangun web tool **Faktur Penjualan** — membuat faktur resmi (A4) dan menyimpannya sebagai PDF. Database produk diisi dari data **Resi Generator** (`Productive/Resi-Generator/products.json`).

- **Pola arsitektur:** Pola B hybrid (tool client-side murni, opsional backend GAS nanti)
- **Stack:** HTML/CSS/JS vanilla + design token REYNAHUB (tidak perlu build tool / framework)
- **Status:** 🟡 Fondasi / blueprint — belum ada kode

---

## 1. Ringkasan Kebutuhan

| Kebutuhan | Detail |
|---|---|
| Output | Faktur **A4** format resmi, bisa di-save jadi **PDF** |
| Sumber produk | `Productive/Resi-Generator/products.json` (390 produk: `name`, `sku`) |
| Cara PDF | Popup cetak → `window.print()` (browser "Save as PDF") — konsisten dengan Resi-Generator, tanpa library PDF |
| Backend | ⛔ Fase 1: tidak ada (client-side). Opsional GAS nanti untuk riwayat/sinkron |
| Penyimpanan data faktur | Batch draft dianggap opsional → `localStorage` (lihat §5.7) |
| Target pengguna | Pemula sampai advance; responsive & dark mode wajib |

**Keputusan penting (cek):** `products.json` TIDAK punya kolom harga. Faktur butuh harga satuan. Solusinya di §3.1 (harga diberikan dari tool ini sendiri, bukan mengubah `products.json` — file itu dipakai bersama Resi-Generator).

---

## 2. Struktur Folder (Blueprint)

```
Productive/Faktur-Penjualan/
├── Index.html                 # UI utama + rendering faktur (single file, gaya Resi-Generator)
├── products.json              # [OPSIONAL] salinan/copy dari ../../Resi-Generator/products.json
│                              #   (load dedup + price override, lihat §3.1)
├── README.md                  # Cara pakai + catatan deploy (gaya README tool lain)
```
> Cukup 1 file HTML. Kalau mau dirapikan boleh pecah ke `assets/config.js` (data pengirim default, dsb.) — tapi tidak wajib di fase 1. `Index.html` memuat CSS hub via `../../src/styles/tools.css` (gaya tool lain).

**Folder target:** `Productive/Faktur-Penjualan/` → route hub `#utilities/faktur` (atau kategori sesuai menu hub). Entry router + nama tool ditambah saat tool dibuat (ingatkan — §7).

---

## 3. Arsitektur

### 3.1 Sumber Data Produk (integrasi Resi-Generator)

```
products.json (Resi-Generator, 390 {name, sku})
        │
        ├─> fetch('products.json')  ── pakai jika berhasil (jalan di hosting)
        └─> fallback: EMBEDDED_PRODUCTS inline (jalan saat double-click / file://)
                │
                ▼
        ProductDatabase = [{...produk, price: 0, unit: 'pcs', tax: '11%'}]
                │
                └─> price diisi MANUAL oleh user (tidak pernah menulis balik products.json)
```

- **Jangan pernah edit `products.json` milik Resi-Generator.** Jika tool ini butuh salinan lokal, buat `Productive/Faktur-Penjualan/products.json` sendiri (salinan pertama kali, lalu bebas dikembangkan).
- Setiap produk diberi **harga satuan default** oleh tool ini (kolom `price`) — disimpa di `localStorage` per SKU (lihat §5.7) supaya tidak isi ulang tiap buat faktur.
- Pencarian produk pakai **autocomplete/render ulang filter** dengan prefix `name` | `sku` (case-insensitive, `toLowerCase()`, skip diakritik — produk sudah konsisten tanpa diakritik).

### 3.2 Komponen UI (satu halaman, tiga zona)

```
┌────────────────────────────── Faktur V2 ──────────────────────────────┐
│ Header tool (judul + toggle tema + export PDF)                        │
├──────────────────────────────┬────────────────────────────────────────┤
│  FORM (kiri, scroll)         │  PREVIEW FAKTUR (kanan, A4, live)      │
│  • Data penjual (dari        │  • Mirip pola preview Resi-Generator   │
│    config lokal)             │    (rendered as srcdoc iframe,         │
│  • Data pembeli              │    autofit via scale)                  │
│  • Baris item: produk        │                                        │
│    (autocomplete) + qty +    │                                        │
│    harga + diskon%           │                                        │
│  • Subtotal / Diskon / PPN / │                                        │
│    Ongkir / Total            │                                        │
│  • No. faktur (auto) + tanggal│                                       │
└──────────────────────────────┴────────────────────────────────────────┘
```
- **Print/PDF:** tombol → `window.open()` popup ringkas berisi HTML faktur A4 (standalone, tanpa JS hub) → `w.print()` → dialog "Save as PDF". (Hotel dari Resi-Generator §2.2: `setTimeout(...,350)` sebelum `print`; jangan hapus.)
- **Live preview** meringankan ekspek: form → `buildInvoiceHTML(data)` → `iframe.srcdoc`.

### 3.3 Alur Data (ringkas)

```
User pilih produk (autocomplete) → tambah baris item (qty × price − diskon)
→ hitung subtotal / diskon / PPN 11% / ongkir / total (fungsi hitung murni)
→ data di-render ke preview iframe (srcdoc)
→ tombol "Simpan PDF" → popup A4 → window.print() → save as PDF
→ (opsional) simpan draft faktur ke localStorage 'invoiceDraft'
```

### 3.4 Opsional: Backend GAS (fase lanjut)

Jika nanti mau riwayat faktur / sinkron antar perangkat:
- `gscode/code-faktur.gs` — `doPost` simpan ke Sheet, `doGet` list faktur; endpoint disimpan sebagai satu konstanta `GAS_URL` di config tool (jangan hardcode berulang).
- Gunakan pola batch (`getDataRange().getValues()` / `setValues()`) — bukan loop per-baris.
- Tarif PPN & jurnal mengikuti tool lain yang sudah ada (`supabase/fase2_fungsi.sql` punya pola `fmt_label_id`, bisa dicontoh untuk penomoran faktur).

**Fase 1 TIDAK butuh GAS.** Jangan tambahkan sampai ada kebutuhan riil.

---

## 4. Design

Semua token diambil dari `src/styles/design-system.css` (REYNAHUB). **Jangan mengarang hex baru.**

### 4.1 Token yang dipakai
```css
/* UI tool — konsisten dengan hub */
background: var(--bg-primary);
card:      var(--bg-card);
text:      var(--text-main);
muted:     var(--text-muted);
primary/aksen: var(--accent)        /* #ff0000 light / #ff3b3b dark */
border:    var(--border);
radius:    var(--radius-md)          /* form/card */, var(--radius-full) /* pill */
shadow:    var(--shadow-sm) / var(--shadow-md)
font:      var(--font-sans)          /* 'Plus Jakarta Sans' */
focus:     var(--focus-ring)
status:    var(--success), var(--danger), var(--warning)
```
Dark mode via `[data-theme="dark"]` (telah disediakan hub). Tool menanggapi `postMessage` tipe `SET_THEME` + punya `toggleTheme()` lokal (pola semua tool hub).

### 4.2 Format Faktur Resmi (aturan cetak A4)
Mengambil standar faktur penjualan umum (siapa-pun tidak menyebutkan NPWP — opsional):

1. **Kop (header):** Nama & logo perusahaan (opsional) kiri; judul **"FAKTUR PENJUALAN"** besar di kanan (atau tengah) + nomor faktur.
2. **Blok info:**
   - Kiri: `Penjual` (nama, alamat, telp/HP, opsional NPWP)
   - Kanan: `Pembeli` (nama, alamat, telp/HP) — boleh di-isi manual per faktur
   - Info faktur: `No. Faktur`, `Tanggal`, `Jatuh Tempo`, `Status` (Terbit/Dibayar)
3. **Tabel item:** `No | Nama Produk | SKU | Qty | Satuan | Harga Satuan | Diskon% | Jumlah` (border bawah per baris, garis tebal signature di header tabel).
4. **Ringkasan (kanan bawah):** `Subtotal`, `Diskon`, `Subtotal setelah diskon`, `PPN (11%)`, `Ongkir`, `Total` (bold besar).
5. **Catatan/footer:** kolom `Catatan` (opsional), `Termin/Ongkir` bila perlu, lalu tanda tangan **"Hormat kami"** + **"Penerima"**.

Font faktur A4: `var(--font-sans)`, ukuran 11–12px, warna `--text-main`; dalam dark mode **cetak harus tetap gelap-on-fond putih** (ada aturan print – §5.6).

### 4.3 Layout Responsive
- Form kolom kiri (`flex`) saat ≥ 900px; mobile: tumpuk (grid 1 kolom), preview mengecil (scale, pola `fitPreview()` Resi-Generator).
- Tabel item di mobile menjadi scroll horizontal.

---

## 5. Algoritma (inti & aturan angka)

> Semua fungsi hitung = fungsi **murni** (pure function), bebas DOM, agar bisa di-test manual/hand.

### 5.1 Nomor Faktur (auto-increment harian)
Format: `INV-<YYYYMMDD>-<SEQ>` contoh `INV-20260710-0042`

```
SEQ = (jumlah faktur yang pernah dibuat tanggal itu, disimpan di localStorage 'invSeq_<YYYYMMDD>') + 1
```
- Disimpan per hari; hari baru mulai dari angka 1 kembali.
- Format `SEQ` minimal 4 digit (`padStart(4,'0')`).
- User boleh override manual (mis. kombinasi nomor kontrak), validasi format `INV-YYYYMMDD-NNNN`.

### 5.2 Item & Rupiah
```
jumlahBaris  = qty × hargaSatuan × (1 − diskon%/100)
hargaSatuan  = round2(hargaSatuan)          // simpan secara utuh rupiah
quantitas    = bilangan bulat ≥ 1 (jika 0 => baris dianggap hapus)
```
- **Rupiah TIDAK pakai sen/desimal:** semua rupiah dihitung bulat (`Math.round`) di level per-baris sebelum dijumlah.

### 5.3 Total (urutan wajib)
```
subtotal             = Σ jumlahBaris                        // round per baris dulu
diskonTotal          = Σ (diskons per baris)                // OPSIONAL: diskon global juga
dpp (dasar pjk)      = subtotal − diskonTotal
ppn                  = round(dp × 11/100)                   // PPN 11% (UU HPP)
total                = subtotal − diskonTotal + ppn + ongkir
```
> Aturan berlaku **konsisten** antara preview, popup cetak, dan perhitungan total. Satu fungsi `hitungFaktur(items)` dipakai semua.

### 5.4 Format uang (tampil)
`new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', minimumFractionDigits:0, maximumFractionDigits:0})`
→ contoh `Rp1.250.000`.

### 5.5 Tanggal
- Input `<input type="date">` (native, tanpa library). Default = hari ini (`toISOString().slice(0,10)`).
- "Jatuh tempo" default +14 hari (opsional; jika tidak butuh, hapus field).
- Tampilan cetak: `new Intl.DateTimeFormat('id-ID', {dateStyle:'long'})`.

### 5.6 Aturan Print (wajib, checklist)
- Popup cetak diisi HTML **standalone** (CSS inline di `srcdoc`/`document.write`), warna tetap kontras di kertas putih — **jangan** ikut `color-scheme: dark` saat print (setel `@media print { }` atau palette light di popup).
- `@page { size: A4; margin: 0 }` + konten berpadding; `print-color-adjust: exact` supaya garis header tabel tetap kelihatan.
- `setTimeout(..., 350)` sebelum `w.print()` (kasih waktu render, lihat Resi-Generator §3.2).

### 5.7 Persistensi (localStorage, opsional tapi disarankan)
```
'invoiceDraft'     → { penjual, pembeli, items[], ongkir, catatan, createdAt }  // auto-save saat input
'invSeq_<YYYYMMDD>'→ { seq }                                                    // penomoran
'invoicePrices'    → { "<sku>": hargaSatuan }                                   // harga default per SKU
```
- `try { localStorage.setItem(...) } catch {}` — degradasi aman kalau diblokir (cross-origin guard, pola Resi-Generator).
- Restore draft saat load; tidak ada draft → form kosong + `invSeq` segmen tetap jalan.

### 5.8 Validasi input (edge-case)
- Produk kosong / qty 0 → baris tidak ikut dihitung; tombol "Simpan PDF" disable bila **belum ada 1 baris item valid**.
- Nomor faktur tidak boleh kosong; tanggal wajib.
- Pembeli wajib nama (alamat/telp opsional).
- Cegah **double-submit** tombol print (disable s/d popup terbuka).

---

## 6. Algoritma Render Faktur (pseudo)

```
function hitungFaktur(items):                    // pure
  rows = items.filter(i => i.qty>0)
  return {
    rows, subtotal, dpp, ppn, ongkir, total      // semua round ke rupiah bulat
  }

function buildInvoiceHTML(data):                 // pure, dipakai preview & popup
  rows   = hitungFaktur(data.items).rows
  tbody  = rows.map(buildRowHTML).join('')
  return `<!DOCTYPE html>...<table>…${tbody}…</table>...`

function fitPreview():                           // pola Resi-Generator
  scale = min(1, availWidth / 794)               // 794px ≈ A4@96dpi
  iframe.style.transform = scale(...)

// Print:
// window.open('', '_blank') → write buildInvoiceHTML → setTimeout(350) → w.print()
```

---

## 7. Langkah Implementasi (urutan eksekusi)

1. Buat folder `Productive/Faktur-Penjualan/` + `Index.html` (kopi kerangka tool hub: `src/styles/tools.css`, toggle tema, `SET_THEME` listener).
2. Implementasi `ProductDatabase` (load `products.json` → fallback `EMBEDDED_PRODUCTS`), autocomplete produk.
3. Mengisi data penjual default di `config` (copy dari kebutuhan user di `<head>` script).
4. Builder + preview (zona kanan) + hitung total (pure functions §5).
5. Popup print A4 (§5.6) + test: isi contoh, print, cek PDF ter-unduh & format benar.
6. Persistensi draft + no-faktur auto-seq (§5.7).
7. Entry hub + README di folder tool + (jika perlu) `GAS_URL` config.
8. **Test manual uang:** gunakan 1–2 contoh angka untuk memverifikasi subtotal/PPN/total sebelum menyerahkan ke user (wajib aturan skill §Checking).

---

## 8. Checklist Kualitas (acuan skill web-gas-dev)

- [ ] Semua fungsi hitung murni + 1-2 contoh angka diuji manual
- [ ] Rupiah dibulatkan konsisten (no sen)
- [ ] Format faktur: kop, blok penjual/pembeli, tabel item, ringkasan, ttd
- [ ] `window.print()` popup dengan `setTimeout(350)`; `@page A4`; print tidak menggelapkan warna
- [ ] Dark mode + postMessage `SET_THEME` dari hub
- [ ] Responsive (mobile tumpuk; tabel scroll)
- [ ] Tidak ada API key/kredensial di client
- [ ] Tanpa `innerHTML` untuk input user tanpa sanitasi (pakai `textContent`/escape saat render data user)
- [ ] Produk diambil dari `products.json`, TIDAK pernah menulis balik ke sana
- [ ] Validasi empty + double-submit btn
- [ ] Nama file/fungsi kebab-case/camelCase konsisten
```