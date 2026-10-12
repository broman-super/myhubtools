# R2 — Cross-check Berangkat/Pulang · UIUX-DESIGN

**Penempatan:** tab Persiapan → `04 Cross-check Berangkat / Pulang` (01 SPPD, 02 Produk, 03 Item Persiapan, 04 Cross-check, 05 Jadwal).

## Kartu verdict (`.vc`)
- `.vc` = kartu border token `--border`, `border-radius` mengikuti kartu lain.
- `.vc-go`: background `color-mix(in srgb, var(--success) 8%, transparent)`; `.vc-dot.go` = `--success`; `.vc-dot.no` = `#B91C1C`.
- Struktur: `.vc-title` (judul audacious "Siap Berangkat"/"Pulang Tuntas" + dot status), `.vc-sub` (keterangan ringkas), `.vc-miss` (daftar item yang masih menghalangi, warna miss merah lembut di atas `#FEE2E2`/10%).
- Warna merah/badge memakai nilai yang sudah ada di seed (`#B91C1C`, `#059669`, `#ECFDF5`, `#FEE2E2`) agar token tidak meledak.

## Tabel audit
- Kolom: nama | dibawa | terjual | rusak/hilang | selisih (badge `rekap tuntas`/`perlu cek`) | checkbox "dibawa pulang".
- Badge tuntas = hijau lembut; perlu cek = merah lembut; selaras badge status lain.

## Chip roadmap
`hero-check` + 2 chip: **Siap berangkat** (`berangkatOk`) & **Pulang tuntas** (`pulangOk`), keduanya `done` hijau bila true. Chip R1 "Persiapan siap" diganti.

## Responsif
Seluruh seksi dalam `.overflow-x-auto` (mobile 390px, docOverflow −15 bersih).