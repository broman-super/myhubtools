# R1 — Item Persiapan · QA.md

**Runner:** headless Chrome + dump DOM + CDP (harness `mobile_test.ps1`, `snap_ps.ps1`). Model tidak melihat layar; screenshot disimpan untuk review manusia.

## Hasil

| Cek | Status | Bukti |
| --- | --- | --- |
| Tab Persiapan render 4 seksi | ✅ | dump: 4 × `psec-num` |
| 3 item seed tampil | ✅ | 6 × `ppi-` (id di baris + tombol hapus) |
| Select status per item | ✅ | 3 × `prepitem:setstatus` |
| Biaya & kategori render | ✅ | "1.350.000", badge "Hotel & Penginapan" |
| Hero-chip "Persiapan siap" | ✅ | hadir di roadmap; 3 check-yes / 2 check-no (evt-1: Milestone + Persiapan belum rampung) |
| Overflow mobile 390px | ✅ | `docOverflow -15` (tabel di dalam overflow-x-auto, bukan overflow halaman) |
| Console error / exception | ✅ | tidak ada |
| data-action ↔ handler | ✅ | prepitem:add/setstatus/delete ada semua di actions.js |
| Preservasi data | ✅ | migrasi `[]`; `deleteEvent` bersihkan prepItems; harness snapshot siap dipakai pre/post ronde |

## Defect
- Tidak ada defect 🔴/🟠. Catatan: `dibawa`/`pulang` belum punya UI di R1 (disiapkan untuk R2, bukan pemborosan karena memakai kolom yang sudah ada).

## Verdict
**PASS.** Ronde naik ke R2 (cross-check berangkat/pulang) saat lanjut.