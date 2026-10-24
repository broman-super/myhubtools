# Keamanan — kunci tulis & RLS

> Status: SQL hardening sudah diterapkan di kedua project (24 Okt 2026).
> Kunci tulis dibaca dari Script Property `BRIDGE_TOKEN` (repo ini publik, jadi
> nilainya tidak ditulis di file). Sisa: deploy ulang GAS + publish klien.

Semua tool yang menulis data sekarang butuh **satu kunci tulis tim**. Kunci ini:

- disimpan di server sebagai `app_private.write_key.secret` (Supabase) dan
  Script Property `BRIDGE_TOKEN` (Apps Script);
- diketik **sekali per browser**, lalu disimpan di `localStorage['reynahub-write-key']`;
- dikirim sebagai header `x-write-token` (REST Supabase) atau field `token` (GAS).

Repo ini **tidak** menyimpan kunci di file GAS (repo publik). Tapi sejak
24 Okt 2026 kunci juga **ditanam di klien** (5 file) supaya tidak ada prompt saat
menulis — keputusan yang diterima sadar. Konsekuensinya: RLS hanya menahan
penulisan iseng, bukan orang yang membaca source halaman. Kalau kunci bocor/ganti,
perbarui di tiga tempat: `app_private.write_key` (2 project), Script Property
`BRIDGE_TOKEN` (4 GAS), dan `KEY_WRITE_VALUE` (5 klien).

## Urutan setup (sekali saja)

1. **Project UNITOOLS** (`iyraamxkrygtzsqkvnqz`, dipakai retur/latch/rnd/sppd):
   jalankan `supabase/security_hardening.sql` di Supabase SQL Editor.
2. **Project Analytic** (`ciukvojsknsdnkysbpjl`, database terpisah):
   jalankan `supabase/security_hardening_analytic.sql`.
3. Samakan kunci di kedua project:
   ```sql
   -- project UNITOOLS
   select secret from app_private.write_key;
   -- project Analytic
   update app_private.write_key set secret = '<secret dari langkah di atas>';
   ```
4. Set Script Property `BRIDGE_TOKEN` = secret yang sama di **setiap** project GAS
   (`sppdtoolbox`, `rndtracker`, `code-taskschedule`, `code-analytic`) — nilai ini
   tidak ditulis di file karena repo publik.
5. Deploy ulang keempat Web App GAS (Deploy → Manage deployments → Edit → New version).
6. Deploy ulang klien (hub + `Project_develop/dist`) supaya versi baru yang terpakai.
7. Buka tiap tool → muncul prompt kunci sekali → tempel secret.

Urutan ini penting: SQL dulu (RPC `latch_login` harus ada sebelum klien latch baru),
lalu GAS, lalu klien.

## Yang berubah

| Tool | Baca | Tulis |
|------|------|-------|
| retur-track | publik | header `x-write-token` (RLS `has_write_key()`) |
| latch | publik | PIN admin sebagai `x-write-token` (RLS `latch_can_write()`); klik lewat RPC `latch_click` |
| Analytic | lewat GAS (butuh `token`) | lewat GAS (POST + `token`) |
| ArchiveDoc / SPPD | lewat GAS (butuh `token`) | lewat GAS (POST + `token`); hapus baris hanya untuk id yang klien lihat saat load |
| RND tracker | Supabase anon (RLS select-only) | lewat GAS (POST + `token`) |
| Planner | `getTasks`/`getShare` publik | lewat GAS (POST + `token`) |

PIN latch masih `1234` setelah migrasi. Ganti:
```sql
update app_private.latch_pin set value = '<pin baru>';
```

## Checklist uji manual

- [ ] Tanpa kunci: `PATCH/POST` ke `retur_tracking` dan `latch_links` ditolak (401/403).
- [ ] Tanpa kunci: `rpc/get_all_transaksi` ditolak; `rpc/get_all_transaksi_secure('salah')` → `[]`.
- [ ] `select * from latch_config where key = 'pin';` → 0 baris.
- [ ] Login latch dengan PIN benar berhasil; PIN salah gagal.
- [ ] Klik link di halaman publik menambah `click_count` tanpa login.
- [ ] SPPD: buka dua tab, hapus 1 event di tab A, simpan tab B (data lama) → event lain tidak hilang.
- [ ] Analytic: simpan target, tambah/edit/hapus biaya, upload Excel → semua sukses dengan kunci, gagal tanpa kunci.
- [ ] Planner: simpan/edit/hapus tugas sukses; buka link `#ss-<slug>` tanpa kunci tetap bisa baca.
- [ ] RND: simpan project + upload/hapus foto sukses dengan kunci.

## Catatan

- Kunci ini adalah **satu kunci bersama**, bukan login per user. Siapa pun yang
  punya kunci bisa menulis; tidak ada audit trail per orang.
- `latch_login` tidak membatasi percobaan PIN. PIN lemah = bisa ditebak.
- Grant `get_all_transaksi` ke anon di `fase2_fungsi.sql` sudah dicabut; file
  itu hanya untuk setup baru.
