---
name: supabase
description: Cek dan query database Supabase project SPPD Toolbox (iyraamxkrygtzsqkvnqz) langsung dari terminal â€” daftar tabel, struktur kolom, isi data sppd_*, cek RLS/row count. Use when user asks "cek database", "query supabase", "data sppd_ di Supabase", "berapa baris tabel", "schema/RLS supabase", or verify data before/after the GAS bridge runs.
---

# Skill: Supabase (PostgREST)

Koneksi langsung ke PostgREST â€” tanpa MCP, tanpa install tambahan.

## Konfigurasi (sekali set)

- `SUPA_URL` â€” sudah baked: `https://iyraamxkrygtzsqkvnqz.supabase.co`
- `SUPA_KEY` â€” **service_role key** (bukan anon; tabel `sppd_*` RLS-nya menolak anon).
  Kalau `$env:SUPA_KEY` kosong â†’ beri tahu user untuk menjalankan sendiri di terminal
  (JANGAN minta key ditempel ke chat/repo):
  `setx SUPA_KEY "eyJhbGciOi..."`
  Sumber key: Supabase Dashboard â†’ Project Settings â†’ API â†’ `service_role` secret,
  atau dari Script Properties GAS (`SUPA_KEY`).

## Perintah dasar (PowerShell â€” dilarang `&&`)

Simpan header + URL sekali (fallback ke URL baked kalau env belum kebaca):

```powershell
$u = $env:SUPA_URL; if (-not $u) { $u = 'https://iyraamxkrygtzsqkvnqz.supabase.co' }
$h = @{ apikey = $env:SUPA_KEY; Authorization = "Bearer $env:SUPA_KEY" }
if (-not $env:SUPA_KEY) { 'SUPA_KEY belum diisi â€” minta user jalankan setx' }
```

**Cek koneksi + daftar tabel & kolom** (root PostgREST = spec OpenAPI):

```powershell
$spec = Invoke-RestMethod -Headers $h "$u/rest/v1/"
$spec.paths.PSObject.Properties.Name   # nama tabel terexpose
```

**Isi data (contoh: header SPPD):**

```powershell
Invoke-RestMethod -Headers $h "$u/rest/v1/sppd_header?select=*&limit=5"
```

**Hitung baris tepat** (header `Prefer: count=exact`, baca `Content-Range`):

```powershell
$r = Invoke-WebRequest -Headers ($h + @{ Prefer = 'count=exact' }) -Method Head "$u/rest/v1/sppd_header?select=*"
$r.Headers['content-range']   # "0-9/42" â†’ 42 baris
```

**Filter/order/pagination:** query-string PostgREST standar â€”
`?event_id=eq.<id>&order=tgl_berangkat.desc&limit=20&offset=0`,
operator: `eq,neq,gt,gte,lt,lte,like,ilike,in,is`.

**Tulis data** (wajib `Content-Type: application/json`; POST = insert, `Prefer: merge-duplicates` = upsert per PK):

```powershell
Invoke-RestMethod -Headers ($h + @{ 'Content-Type' = 'application/json'; Prefer = 'return=representation' }) `
  -Method Post -Body (@{ event_id = 'x'; kota = 'Banyumas' } | ConvertTo-Json) "$u/rest/v1/sppd_header"
```

## Aturan keamanan

- `service_role` = **bypass RLS**. Baca bebas. Tulis/UPDATE/DELETE **hanya kalau user
  secara eksplisit minta**; sebutkan tabel + baris yang akan disentuh sebelum eksekusi.
- Jangan pernah log/cetak `SUPA_KEY` ke chat, file, atau commit.
- Skema resmi (sumber kebenaran DDL): `Productive/ArchiveDoc/sppd_schema.sql`
  (9 tabel + view `v_sppd_full`). Migrasi lama: `supabase/*.sql`.
- Jalur data aplikasi: web â†’ localStorage (`store.js`) â†’ GAS bridge
  (`gas/sppdtoolbox.gs`, action `sppd:save`) â†’ PostgREST. Web TIDAK menyentuh
  Supabase langsung.

## Troubleshooting

- `401/403` â†’ key salah atau anon key dipakai untuk tabel ber-RLS.
- `permission denied` / tabel hilang dari spec â†’ tabel belum dibuat / grant belum
  diberikan; jalankan `Productive/ArchiveDoc/sppd_schema.sql` di SQL Editor.
- Timeout dari jaringan â†’ cek `SUPA_URL` benar (harus `https://...supabase.co`).
