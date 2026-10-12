# R2 — Cross-check Berangkat/Pulang · BACKEND-DATA & FE-BLUEPRINT

## Data
- Kolom `dibawa` (bool) & `pulang` (bool) pada `prepItems` sudah disiapkan sejak R1 → **R2 tanpa migrasi schema**.
- Rumus anomali: `epAnomali(e, p) = qtyTerjual + qtyRusakHilang − qtyDibawa`. ≤ 0 = rekap tuntas (selisih maka "kembali"); > 0 = oversold/kehilangan.

## store.js (R2)
- `epAnomali(eventId, productId)` — anomali pengawas.
- `berangkatOk(eventId)` — semua `eventProducts` punya `qtyDibawa >= qtyTerjual + qtyRusakHilang` && `prepItemsDone(eventId)`.
- `pulangOk(eventId)` — semua `epAnomali <= 0` && semua prep `pulang === true` (syarat ada item jerat: `prepItems.length > 0`).
- Export: tambah `epAnomali`, `berangkatOk`, `pulangOk`.

## actions.js (R2)
- `prepitem:pulang` (change): `p.pulang = !!el.checked; store.savePrepItem(p); A.reload();`.

## pages2.js (R2)
- `tabCrossCheck(ev)` — 2 kartu `.vc` (berangkat/pulang) + 2 tabel audit.
- `tabPersiapan` dikoordinasi ulang: 01 SPPD, 02 Produk, 03 Item Persiapan, 04 Cross-check, 05 Jadwal.

## pages.js (R2)
- Hero checks: chip "Siap berangkat" (`store.berangkatOk`) & "Pulang tuntas" (`store.pulangOk`), hanya bila ada aset (`eventProducts`/`prepItems`).

## app.js (R2 — bug double-binding)
- Delegasi `click` men-skip `INPUT/SELECT/TEXTAREA` (dikelola delegasi `change`). Sebelumnya checkbox `prepitem:pulang` dapat dipanggil dua kali (click + change) → nilai salah & reload node tak konsisten.
- Lokasi: blok `document.addEventListener('click', ...)` (app.js 81-96).

## css (R2)
- `.vc`, `.vc-go`, `.vc-dot (.go/.no)`, `.vc-title`, `.vc-sub`, `.vc-miss` di akhir `styles.css` (token `--border`, `--success`, `--text-secondary` + color-mix; `@supports` fallback).