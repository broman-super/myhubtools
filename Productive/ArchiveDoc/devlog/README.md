# Devlog — SPPD Toolbox / Roadmap Pengawasan Event

Pola tim mandiri (council R0): ronde otonom berbatas, satu fitur per ronde,
artefak markdown per agen, verifikasi fail-lock tiap ronde, CHANGELOG sebagai
log kebenaran. Anggaran total 4–5 jam = budget kumulatif; tiap ronde punya
batas waktu yang dilacak.

| Ronde | Fitur | Status | Risiko | Log |
| --- | --- | --- | --- | --- |
| R0 | Fondasi: backup, snapshot har, devlog | ✅ | — | CHANGELOG v0.4 |
| R1 | Item persiapan (non-produk) + status + biaya | ✅ | Rendah | devlog/R1-item-persiapan/ |
| R2 | Cross-check berangkat/pulang → "0 aset tertinggal" | ✅ | Sedang | devlog/R2-crosscheck/ |
| R3 | Produk Dibawa ↔ Produk Terjual sinkron + laporan | ✅ | Tinggi | devlog/R3-dibawa-terjual/ |

Folder ronde: `devlog/R{n}-{nama}/` berisi:
- `PM-BRIEF.md` — apa & kenapa, target user, kriteria sukses.
- `UIUX-DESIGN.md` — keputusan desain (layout, token, responsif).
- `BACKEND-DATA.md` — schema & migrasi, aksi baru.
- `FE-BLUEPRINT.md` — file & fungsi yang disentuh.
- `QA.md` — hasil verifikasi (dump, CDP, overflow, console), defect.

Kebenaran dipegang kode + script verifikasi + CHANGELOG; markdown ini artefak
catatan, bukan sumber kebenaran.