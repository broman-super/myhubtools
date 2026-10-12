# R1 — Item Persiapan · UI/UX-DESIGN

**Pola:** seksi bernomor `psec` (yang sama dengan Persian/Uang v0.3).
**Penempatan:** tab Persiapan → `03 Item Persiapan` (01 SPPD, 02 Produk, 04 Jadwal).

**Komposisi seksi:**
- Kartu stat (`grid sm:grid-cols-3`): **Item Persiapan** (jumlah), **Siap / Selesai** (x dari y), **Biaya Persiapan** (fmt Rupiah).
- Tabel checklist: Item (nama + catatan), Kategori (badge `#F3F0EC/#111`), Qty (`N×`), Biaya (`mono bold`), Status (select), Hapus.
- Form tambah: nama (full), kategori (select 4), qty, biaya (moneyInput), status awal, catatan; tombol prima "Tambah ke Checklist".

**Token:** pakai kartu & input yang sudah ada; tidak menambah warna baru (badge netral dari palet `surface`); tanpa emoji.

**Roadmap:** chip `hero-checks` tambahan `{ done: <semua item Selesai> , label: 'Persiapan siap' }`, muncul hanya jika ada item persiapan → menghindari noise di event kosong.

**Responsif:** tabel dibungkus `.overflow-x-auto` (sama seperti tabel lain); select status `w-36`.

**Status:** ✅ sesuai DESIGN SPEC divisi UI/UX (tidak menyimpang dari Design System Baku sbc).