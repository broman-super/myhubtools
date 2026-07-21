# 🗺️ Roadmap Optimasi Resi Generator

**Durasi:** 2 Minggu (14 Hari)  
**Target:** Reseller/Dropshipper  
**Fokus:** UX Improvement + Database Produk Offline  
**Platform:** Mobile-first, Multi-Platform  
**Output:** Tetap B&W Simple

---

## 🎯 Visi Besar

> "Membuat input resi secepat dan seasli mungkin — cukup klik, pilih, dan generate, tanpa perlu ngetik ulang data yang itu-itu saja."

---

## 📅 Milestone Overview

```
Minggu 1 :  Database Produk → Form Cerdas → Validasi & Auto-fill
Minggu 2 :  Mobile UX → Testing → Deployment & Dokumentasi
```

---

## 🏁 Milestone 1 — Database Produk Offline (Hari 1-2)

**Goal:** User bisa pilih produk dari database tanpa ngetik manual.

### Plan
1. **Buat struktur database produk di `products.gs`**
   - Array of objects: `{ name, sku, category, variants }`
   - Minimal 30 produk contoh (fashion/garment sesuai bisnis)
   
2. **Buat endpoint Apps Script**
   - `getProductDatabase()` → return all products
   - `searchProducts(query)` → return filtered by name/SKU
   - `getPopularProducts()` → return 5 produk paling sering dipakai

3. **Integrasi ke frontend**
   - Load database saat `window.onload`
   - Simpan di `window.productDatabase`

### Deliverable
- [ ] File `products.gs` dengan data produk
- [ ] Fungsi search & filter di server-side
- [ ] Produk siap di-load ke frontend

---

## 🏁 Milestone 2 — Autocomplete Input (Hari 3-4)

**Goal:** Input nama produk jadi dropdown dengan teks (combo box).

### Plan
1. **HTML structure**
   - Setiap `.product-row` punya container input + dropdown
   - Input dengan kelas `.product-name-input`
   - Dropdown container `.product-suggestions`

2. **CSS styling**
   - Dropdown muncul di bawah input
   - Styling mobile-friendly (touch area besar)
   - Scroll jika banyak hasil

3. **JavaScript logic**
   - Input event → filter `productDatabase` → tampilkan suggestions
   - Keyboard navigation (ArrowUp/Down + Enter)
   - Click to select
   - Auto-fill SKU field saat produk dipilih
   - Jika produk tidak ada di database, tetap bisa ngetik manual

### UX Rules
- Suggestions muncul setelah 2 karakter
- Maksimal 8 suggestions
- "Tambah baru..." di bagian bawah jika tidak ada di database

### Deliverable
- [ ] Autocomplete berfungsi di semua `.product-row`
- [ ] SKU auto-fill saat pilih dari database
- [ ] Tetap bisa input manual untuk produk baru
- [ ] Responsive di mobile

---

## 🏁 Milestone 3 — Form Cerdas & Auto-fill (Hari 5-6)

**Goal:** Form lebih pintar — isi sedikit, sisanya otomatis.

### Plan
1. **Smart defaults berdasarkan ekspedisi**
   - Jika pilih JNE → otomatis pilih "Reguler"
   - Base on previous selection

2. **Quick-fill untuk Reseller**
   - Tombol "Isi Seperti Sebelumnya" (isi dari form terakhir)
   - Simpan data pengirim terakhir di `localStorage`

3. **Auto-calculate berat**
   - Jika pilih produk tertentu, berat bisa otomatis terisi
   - Opsi: "Hitung otomatis" toggle

4. **Improve form flow**
   - Auto-focus ke field berikutnya setelah pilih produk
   - Better tab-order
   - Enter key untuk submit

### Deliverable
- [ ] localStorage untuk data terakhir
- [ ] Smart defaults per ekspedisi
- [ ] Auto-focus & better tab flow
- [ ] Quick-fill button

---

## 🏁 Milestone 4 — Mobile UX Optimasi (Hari 7-8)

**Goal:** Aplikasi nyaman dipakai di HP.

### Plan
1. **Layout responsiveness audit**
   - Test semua ukuran layar (320px - 768px)
   - Pastikan grid tidak pecah

2. **Touch-friendly improvements**
   - Ukuran tombol minimal 44x44px
   - Spacing antar field lebih lega di mobile
   - Hindari hover-only interactions

3. **Mobile form optimization**
   - Gunakan `input[type=tel]` untuk no HP
   - Gunakan `inputmode` yang sesuai
   - Hindari keyboard menutupi dropdown

4. **Bottom action bar di mobile**
   - Tombol Preview/Generate tetap terlihat saat scroll

### Deliverable
- [ ] Layout responsif di semua ukuran
- [ ] Touch-friendly UI
- [ ] Bottom action bar sticky di mobile
- [ ] Tested di Chrome Android

---

## 🏁 Milestone 5 — Testing & Refinement (Hari 9-10)

**Goal:** Semua fitur berfungsi dengan baik, bug free.

### Plan
1. **Functional testing**
   - Test semua flow: Tambah/Hapus produk, Pilih dari database, Input manual
   - Test mode Default vs Reseller
   - Test Preview dan Generate PDF

2. **Edge cases**
   - Produk dengan nama panjang
   - Banyak produk (10+ rows)
   - Koneksi lambat / offline handling

3. **Performance check**
   - Load time database
   - Responsivitas autocomplete
   - Memory usage (banyak produk rows)

4. **Bug fixes**
   - Fix semua issue yang ditemukan

### Deliverable
- [ ] Test cases passed
- [ ] Edge cases handled
- [ ] Performance acceptable

---

## 🏁 Milestone 6 — Dokumentasi & Deployment (Hari 11-14)

**Goal:** Project siap dipakai & mudah dikembangkan.

### Plan
1. **Buat dokumentasi (file markdown terpisah)**
   - Cara menambah produk ke database
   - Cara deploy update
   - Troubleshooting umum

2. **Final touch**
   - Code cleanup
   - Comment di bagian kompleks
   - Konsistensi coding style

3. **Deploy ke production**
   - Deploy ulang Apps Script
   - Test dari link production
   - Konfirmasi dengan user

### Deliverable
- [ ] Dokumentasi lengkap
- [ ] Code siap maintenance
- [ ] Production deployed

---

## 📊 Timeline Visual

```
Day  1 ████░░░░░░░░░░  Milestone 1: Database Produk
Day  3 ████████░░░░░░  Milestone 2: Autocomplete
Day  5 ████████████░░  Milestone 3: Form Cerdas
Day  7 ██████████████  Milestone 4: Mobile UX
Day  9 ██████████████  Milestone 5: Testing
Day 11 ██████████████  Milestone 6: Dokumentasi
```

---

## ✅ Kriteria Sukses

1. **Database Produk**: User bisa pilih dari 30+ produk tanpa ngetik
2. **Autocomplete**: Responsif < 200ms, navigasi keyboard works
3. **Mobile UX**: Form nyaman di HP, tidak perlu zoom
4. **Input Manual**: Produk baru tetap bisa ditambahkan dengan ngetik
5. **Stabilitas**: Tidak ada error, data tetap terkirim dengan benar

---

## 🔄 Risk & Mitigasi

| Risk | Dampak | Mitigasi |
|------|--------|----------|
| Database terlalu besar | Load lambat | Batasi 50 produk, lazy load |
| Browser tidak support | Autocomplete gagal | Fallback ke input biasa |
| User bingung dengan UI baru | Drop usage | Simpan opsi untuk tetap input manual |
| Mobile keyboard blocking | UX jelek | Scroll into view + fixed suggestions |

---

Siap lanjut ke **Milestone 1**? Saya akan buat file `products.gs` dengan data produk fashion yang lengkap, plus endpoint-endpoint yang diperlukan.
