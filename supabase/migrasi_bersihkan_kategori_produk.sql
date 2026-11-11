-- ============================================================
-- BERSIHKAN `produk."Kategori Produk"` YANG BERISI HARGA
-- Project: ANALYTIC (ciukvojsknsdnkysbpjl). Jalankan di SQL Editor.
--
-- Akar: sheet lama menaruh HPP di kolom "Kategori Produk" (kolom HPP
-- kosong), lalu gas/migrate-supabase.gs menyalin kolom itu apa adanya.
-- Hasilnya 261 dari 263 baris berisi angka harga, bukan kategori.
-- Kategori asli tidak ada di mana pun; satu-satunya klasifikasi yang
-- nyata di tabel adalah "Nama Series" (CLASSIC, XTREME, KEYCHAIN, ...).
--
-- Aturan pembersihan (idempoten, aman dijalankan ulang):
--   * angka / "-" / kosong  -> "Nama Series", atau 'UMUM' bila kosong
--   * kategori teks asli    -> tidak disentuh
--   * HPP TIDAK diubah di sini. HPP 0 tetap 0 dan harus diisi lewat tab HPP.
--
-- Jalankan sebagai owner (SQL Editor), bukan anon key.
-- ============================================================

begin;

-- 1. Cadangan nilai lama. Dibuat sekali; kalau tabelnya sudah ada,
--    isinya dibiarkan (jangan menimpa cadangan pertama).
--    RLS aktif tanpa policy = anon/authenticated tidak bisa baca/tulis,
--    meskipun tabel ada di schema public (PostgREST).
create table if not exists public.produk_kategori_backup as
select
  id,
  "Nama Barang"                    as nama_barang,
  "Kategori Produk"                as kategori_lama,
  "Nama Series"                    as nama_series,
  "HPP"                            as hpp,
  now()                            as dibuat_pada
from public.produk;

alter table public.produk_kategori_backup enable row level security;

-- 2. Ringkasan sebelum dibersihkan.
select
  count(*)                                                              as total_sku,
  count(*) filter (where trim("Kategori Produk") ~ '^[0-9]')             as kategori_angka,
  count(*) filter (where coalesce(trim("Kategori Produk"), '') in ('', '-')) as kategori_placeholder,
  count(*) filter (where "HPP" <= 0)                                     as hpp_kosong
from public.produk;

-- 3. Ganti kategori berupa angka dengan Nama Series.
--    Pola hanya angka polos/desimal — "5.750" (titik ribuan) tidak masuk
--    pola ini dan akan muncul di query verifikasi nomor 6 untuk dicek manual.
update public.produk p
set "Kategori Produk" = coalesce(nullif(trim(p."Nama Series"), ''), 'UMUM')
where trim(p."Kategori Produk") ~ '^[0-9]+(\.[0-9]+)?$';

-- 4. Placeholder "-" dan sel kosong juga bukan kategori.
update public.produk p
set "Kategori Produk" = coalesce(nullif(trim(p."Nama Series"), ''), 'UMUM')
where coalesce(trim(p."Kategori Produk"), '') in ('', '-');

-- 5. Ringkasan sesudah. kategori_angka dan kategori_placeholder harus 0.
select
  count(*)                                                              as total_sku,
  count(*) filter (where trim("Kategori Produk") ~ '^[0-9]')             as kategori_angka,
  count(*) filter (where coalesce(trim("Kategori Produk"), '') in ('', '-')) as kategori_placeholder,
  count(*) filter (where "HPP" <= 0)                                     as hpp_kosong,
  count(distinct "Kategori Produk")                                      as kategori_unik
from public.produk;

-- 6. Sisa yang perlu dicek manual (harus kosong). Kalau ada baris di sini,
--    nilainya bukan angka polos (mis. "5.750") — perbaiki satu per satu.
select id, "Nama Barang", "Kategori Produk", "Nama Series", "HPP"
from public.produk
where trim("Kategori Produk") ~ '^[0-9]'
   or coalesce(trim("Kategori Produk"), '') in ('', '-')
order by id;

commit;

-- ============================================================
-- ROLLBACK (kalau kategori hasil konversi tidak diinginkan):
--   update public.produk p
--   set "Kategori Produk" = b.kategori_lama
--   from public.produk_kategori_backup b
--   where b.id = p.id;
--
-- Setelah rollback, hapus tabel cadangan bila sudah tidak perlu:
--   drop table public.produk_kategori_backup;
-- ============================================================
