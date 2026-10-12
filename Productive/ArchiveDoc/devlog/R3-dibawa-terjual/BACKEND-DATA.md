# R3 — Sinkron Stok Penjualan + Laporan · BACKEND-DATA & FE-BLUEPRINT

## Data
- **Tanpa migrasi schema.** `stokSisa` adalah turunan: `max(qtyDibawa − SUM(terjual) − qtyRusakHilang, 0)`.

## store.js
- `stokSisa(eventId, productId)` → `null` bila produk tak ada di `eventProducts` (master-only = tak dibatasi); export ditambah.

## actions.js
- `sale:add`: setelah validasi produk/qty, `var sisa = store.stokSisa(d.event, pid)`; bila `sisa !== null && qty > sisa` → toast error + `return` (tanpa `saveSale`, tanpa reload).

## pages2.js
- `tabLaporan(ev)` (baru): 3 kartu — Rekap Produk & Qty (total row), Rekap Item Persiapan (total biaya estimasi + keterangan informatif), Rekap Penggunaan Uang (financeSummary + Cetak).
- `tabUang`: `+ psec('03', 'Laporan', tabLaporan(ev))`.
- `tabPenjualan`: `<option>` diberi `(sisa N)` saat hasil `stokSisa` bukan null; teks bantuan kartu diperbarui.

## Tidak diubah
- `app.js` (guard click dari R2 tetap), `pages.js`, `styles.css` (pakai kelas existing), `ui.js`, SPPD/Produk/Timeline.