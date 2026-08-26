# Draft: analytic-data-terkini

- intent: clear
- review_required: false
- status: awaiting-approval (fork resolved: frontend-only, no GAS change)

## Outcome
Improve the "Data Terkini" status text in SAS Analytic so it shows the date of the most recent "Penjualan" (sales) invoice, e.g. "Data Terkini 13 Juni 2026".

## Exploration findings (read-only)
- `Analytic.html:2699` sets `syncStatus.innerText = "Data Terkini"` (static). `syncStatus` element defined at `Analytic.html:1258` (small status div, font-size 11px).
- Backend `getSalesData` (code-analytic.gs:44) -> `getCachedDashboardData` -> `getAllDashboardData` (code-analytic.gs:104) returns `{ transaksi, produk, biaya, settings }` where `transaksi` = ALL rows from Supabase RPC `get_all_transaksi`.
- Frontend receives this as `dataMentah` (Analytic.html:2682) and `dataMentah.transaksi` already contains every transaction row with `Tanggal` (ISO YYYY-MM-DD, from Supabase DATE column) and `Tipe Transaksi`.
- Existing sales classification at Analytic.html:2105: `isPenjualan = tipe.includes('penjualan') || tipe.includes('faktur') || tipe.includes('sales')`.
- Supabase `Tanggal` is a DATE column -> returned as ISO "YYYY-MM-DD"; lexicographic compare == chronological.

## Decision (default, may be overridden by fork answer)
- Compute client-side in Analytic.html from `dataMentah.transaksi` (no GAS change, no redeploy). Filter rows whose `Tipe Transaksi` matches penjualan/faktur/sales, take max `Tanggal`, format with `toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })`.
- Parse with `new Date(y, m-1, d)` (local) to avoid UTC off-by-one.
- Display format default: "Data Terkini 13 Juni 2026" (day + month long + year). If user prefers shorter (no year), trivial tweak.
- Fallback: if no Penjualan row found, keep "Data Terkini".

## Files
- `Productive/analytic/Analytic.html` (only file changed in frontend-only approach)

## Fork resolved
- User chose **frontend-only** (no GAS change, no redeploy).
- Only `Productive/analytic/Analytic.html` is edited. No backend/edit/redeploy.
