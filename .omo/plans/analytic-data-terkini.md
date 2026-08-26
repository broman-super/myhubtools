# Plan: analytic-data-terkini

## Objective
Improve the "Data Terkini" status text in SAS Analytic so it shows the date of the most recent "Penjualan" (sales) invoice, e.g. "Data Terkini 13 Juni 2026". Frontend-only; no GAS change, no redeploy.

## Important Details
- Locked decisions:
  - Implementation location: **FRONTEND only** (user chose). No edit to `code-analytic.gs`, no GAS redeploy.
  - Display format: `"Data Terkini " + dt.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })` → "13 Juni 2026" (year included for clarity; trivial to drop later if preferred).
  - Sales filter: `Tipe Transaksi` contains `penjualan` OR `faktur` OR `sales` (reuse existing classification at `Analytic.html:2105`).
- Data facts (verified read-only):
  - `dataMentah.transaksi` (`Analytic.html:2682`) holds every transaction row from backend RPC `get_all_transaksi`, each with `Tanggal` (ISO `YYYY-MM-DD`) and `Tipe Transaksi`.
  - `syncStatus` element: `Analytic.html:1258`; its text is set at `Analytic.html:2699`.
  - Supabase `DATE` column → ISO `YYYY-MM-DD`; lexicographic compare is chronological.
- Timezone: parse with `new Date(y, m-1, d)` (local), NOT `new Date('YYYY-MM-DD')` (UTC → off-by-one in GMT+7).
- git not in sandbox → user commits/pushes.
- **Must-NOT-Have:** do NOT edit `code-analytic.gs`; do NOT touch the `"Data Offline (Cached)"` / `"Gagal Sinkronisasi"` branches (line ~2709); do NOT change date format without ask.

## Work State
### Completed
- (none)
### Active
- Edit `Analytic.html` to compute + render the latest Penjualan date in `syncStatus`.
### Blocked
- (none)

## Next Move
- Apply the single edit in `Analytic.html`; verify via reload; hand off for user commit.

## Relevant Files
- `C:\Users\Mediasuper\Documents\GitHub\myhubtools\Productive\analytic\Analytic.html` — only file changed (line ~2699).

## Todos
- [x] 1. Analytic.html (~2699, inside the `getSalesData` success path): replace the static `if(syncStatus) syncStatus.innerText = "Data Terkini";` with a block that computes the latest Penjualan date from `dataMentah.transaksi` and sets `syncStatus.innerText`.
  - WHERE: the try-block success branch at `Analytic.html:2699` (currently `if(syncStatus) syncStatus.innerText = "Data Terkini";`).
  - HOW: replace that one line with the block below (keep surrounding indentation ~16 spaces).
  - WHY: backend already sends all transaksi rows; the client can derive the max Penjualan date with no GAS round-trip/redeploy.
  - ACCEPTANCE: with a Penjualan row dated 2026-06-13 present, header status shows "Data Terkini 13 Juni 2026"; with no Penjualan rows, shows "Data Terkini".
  - QA: see F1 / F2.
  - COMMIT: user (git not in sandbox).

  Exact replacement block:
  ```js
  if (syncStatus) {
    // Data Terkini + tanggal faktur Penjualan paling akhir
    const latestPenjualan = (function (rows) {
      if (!Array.isArray(rows)) return null;
      let max = null;
      for (const r of rows) {
        const tipe = String(r['Tipe Transaksi'] || r.tipe || r.Tipe || r.Status || '').toLowerCase();
        if (!(tipe.includes('penjualan') || tipe.includes('faktur') || tipe.includes('sales'))) continue;
        const s = String(r['Tanggal'] || r.tanggal || '').slice(0, 10);
        if (!s) continue;
        if (max === null || s > max) max = s; // ISO YYYY-MM-DD compares chronologically
      }
      return max;
    })(dataMentah.transaksi);
    if (latestPenjualan) {
      const p = latestPenjualan.split('-').map(Number);
      const dt = new Date(p[0], p[1] - 1, p[2]); // local, avoid UTC off-by-one
      syncStatus.innerText = 'Data Terkini ' + dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } else {
      syncStatus.innerText = 'Data Terkini';
    }
  }
  ```

## Final verification wave
- [x] F1. Reload the analytic page (real or sample data); confirm the header `syncStatus` reads "Data Terkini <tanggal penjualan terakhir>" and that the date equals the maximum `Tanggal` among rows whose `Tipe Transaksi` contains penjualan/faktur/sales. Confirm it does NOT change when only Retur/Pembelian rows exist.
- [x] F2. (Optional, agent-executed) Extract the `latestPenjualan` logic into a temp Node script with sample rows (mixed types, ISO timestamps, no-penjualan case); assert max date + `id-ID` formatting + fallback. Clean up temp file after.
