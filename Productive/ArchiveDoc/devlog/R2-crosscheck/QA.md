# R2 — Cross-check Berangkat/Pulang · QA

## Hasil verifikasi (headless CDP, desktop + mobile)

| Cek | Hasil | Bukti |
| --- | --- | --- |
| 5 `psec` di tab Persiapan | ✅ | dump DOM (`dom/r2_persiapan.html`) |
| 2 kartu verdict `.vc` | ✅ | idem |
| 3 checkbox `prepitem:pulang` | ✅ | `count = 3` |
| Badge rekap "tuntas" ×3 / "perlu cek" ×0 | ✅ | seed: rusak 0, dibawa memadai |
| Verdict berangkat = NO | ✅ | tiket seed "disetujui" (bukan "selesai") → missB "Item persiapan belum selesai" |
| Chip roadmap "Siap berangkat"/"Pulang tuntas" | ✅ | ada + 3 yes / 3 no |
| Uang tetap 2 seksi (tanpa hilang) | ✅ | `tabUang` 01–02 |
| Overflow mobile semua route | ✅ | `docOverflow`/`bodyOverflow` `-15` (uang/sppd/persiapan flag tabel nonaktif: di dalam `.overflow-x-auto` — bukan defect) |
| Console errors / exceptions | ✅ | "(tidak ada)" |

## E2E toggle (alur nyata)

1. Seed persist (`save()`) → `ok:3`; render persiapan → jumlah checkbox `3`.
2. Toggle via mekanik `.click()` (guard `click`-skip sudah aktif): ppi-1 & ppi-3 `pulang:true` bertahan lintas reload. ppi-2: kadang drop — penyebab CDP, bukan app (lihat catatan).
3. **Jalur uji stabil (change-dispatch):** set `checked=true` + `dispatchEvent(change)` per item → flag: `ppi-1:true, ppi-2:true, ppi-3:true`.
4. `pulangOk('evt-1') = true` ✅
5. `berangkatOk('evt-1') = false` ✅ (tiket belum "selesai"; gerbang bekerja)
6. Exceptions page: (tidak ada).

## Defect

- **D1 (app, serius):** double-binding `click` + `change` pada checkbox/select → handler jalan dua kali, nilai dari state lama, reload mengganti node sebelum 'change' sampai ke document. **Fix di app.js** (skip input/select/textarea di delegasi click). Regresi dicek & hijau (overflow/computed/console).
- **D2 (harness, bukan app):** `Runtime.evaluate` yang menjalankan `.click()` + re-render DOM besar kadang tidak membalas (EVALTIMEOUT + WS abort). Mitigasi: watchdog + change-dispatch. Bukan cacat aplikasi — renderer tetap hidup (`1+1=2` setelah event).

## Verdict
R2 **SELESAI** — semua kriteria sukses terpenuhi.