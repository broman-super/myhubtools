# Resi Generator — Supersub

Generator label & resi cetak (A6) berbasis web: pilih eksedisi, logo perusahaan, produk, lalu **cetak via popup `window.print()`** — tidak butuh backend.

- **File:** `Productive/Resi-Generator/Index.html` (≈1089) + `expedisi.js`, `logo.js`, `products.json`, folder `Logo/*.png`
- **Backend:** ⛔ Tidak ada (pure client-side, cetak via popup)
- **Status:** ✅ Stable — client-side

---

## 1. Fitur & Cara Pakai

- **Form isi resi** — pengirim, penerima, berat, nomor resi, dsb.
- **Dropdown ekspedisi** — logo otomatis dari `EXPEDISI_LOGOS` (`expedisi.js`).
- **Dropdown logo perusahaan** — `COMPANY_LOGO_BASE64` (`logo.js`) + file `Logo/*.png`.
- **Dropdown produk** — dari `products.json`.
- **Preview → Print** — buka popup (`window.open`) lalu `window.print()`.

---

## 2. Keterkaitan

### 2.1 Data (client)
| Sumber | Isi | Catatan |
|---|---|---|
| `expedisi.js` | `EXPEDISI_LOGOS` | logo b64 tiap ekspedisi |
| `logo.js` | `COMPANY_LOGO_BASE64` (1 baris, sangat panjang) | logo perusahaan |
| `Logo/*.png` | file logo ekspedisi | alternatif b64 |
| `products.json` | katalog produk | pakai di dropdown |

- `EMBEDDED_EXPEDISI` (inline di `Index.html`) dipakai sebagai **fallback** jika `expedisi.js` gagal load — render teks, bukan logo. Jangan hapus.

### 2.2 Script load (WAJIB semua `defer`)
- `logo.js` → `expedisi.js` (urutan didefinisikan di HTML, semua `defer`).
- Keduanya **mengisi global** yang dipakai `Index.html` pada saat render. Jika salah satu gagal load, `Index.html` harus tetap render pakai fallback.
- `logo.js` adalah **satu baris base64** — sangat panjang, jangan dibuka/minify kecuali tahu bahwa editingnya rawan.

### 2.3 Hub & Shell
- Router: `#utilities/resi` → `Productive/Resi-Generator/Index.html`.
- CSS: `../../src/styles/tools.css` + `:root` tema lokal. **Tema merah/indigo** tidak bentrok, override lokal.
- Tema dark/light: `toggleTheme()` inline + `postMessage` tipe `SET_THEME` dari hub.

### 2.4 Storage
- `localStorage 'resiFormState'` — menyimpan form pakai `try { localStorage.setItem(...) }` (cross-origin guard).
- **Degraded dengan aman** bila localStorage diblokir (tidak ada fatal error).
- Load pada startup (`getItem`) + clear setelah submit (L831 `removeItem`).

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Tambah ekspedisi — 3 tempat
1. Gambar logo → taruh di `Logo/<NAME>.png` (atau encode ke b64).
2. Set di `EXPEDISI_LOGOS` (`expedisi.js`).

### 3.2 Print = popup, bukan PDF
- `window.open(...)` popup diisi HTML ringkas lalu `w.print()`.
- **Jangan** pakai `location.href` ke PDF atau library PDF — ini sengaja ringan.
- `setTimeout(...stampPages(w); w.print();, 350)` — 350ms kasih waktu popup render. Jangan dihapus/kurangi.

### 3.3 `logo.js` jangan disentuh paksa
Satu baris base64 ratusan KB. Editing harus berhati-hati (mis. prettier akan memprooknya). Jika perlu logo perusahaan baru, tambah key baru — jangan ganti seluruhnya.

### 3.4 `products.json` — struktur katalog
- Pastikan valid JSON; formatnya dikonsumsi dropdown produk. Tambah baris pakai kombinasi `name`+`price` (atau field apa pun yang dipakai `Index.html` render) — cek field di `Index.html` parse sebelum rename.

---

## 4. Flow Data (ringkas)

```
Pilih/logo/produk → isi form → localStorage 'resiFormState' (persist)
Preview: window.open(popup URL) → load HTML hasil → stampPages → w.print()
```
