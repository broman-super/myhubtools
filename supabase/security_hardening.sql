-- ============================================================
-- SECURITY HARDENING — project UNITOOLS (iyraamxkrygtzsqkvnqz).
-- Jalankan SEKALI di Supabase SQL Editor.
-- Menutup: tulis retur/latch tanpa login dan PIN latch yang terbaca.
--
-- Project Analytic punya database sendiri (ciukvojsknsdnkysbpjl):
-- jalankan juga supabase/security_hardening_analytic.sql di sana.
--
-- Urutan aman:
--   1) Jalankan file ini di SQL Editor.
--   2) Salin kunci:  select secret from app_private.write_key;
--   3) Samakan kunci di project Analytic (lihat file itu).
--   4) Set kunci yang sama sebagai BRIDGE_TOKEN di setiap project GAS
--      (sppdtoolbox, rndtracker, code-taskschedule, code-analytic).
--   5) Baru deploy file HTML/GAS versi baru.
-- ============================================================

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

-- Kunci tulis tim. Tidak pernah dikirim ke browser; browser hanya
-- menyimpan salinan yang diketik user (localStorage).
create table if not exists app_private.write_key (
  id integer primary key default 1 check (id = 1),
  secret text not null
);
alter table app_private.write_key enable row level security;

insert into app_private.write_key (id, secret)
values (1, replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- true bila request membawa header x-write-token yang cocok.
create or replace function public.has_write_key()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from app_private.write_key
    where secret = coalesce(current_setting('request.headers', true)::jsonb ->> 'x-write-token', '')
  );
$$;
revoke all on function public.has_write_key() from public;
grant execute on function public.has_write_key() to anon, authenticated;

-- get_all_transaksi_secure TIDAK dibuat di sini: tabel transaksi ada di
-- project Analytic (lihat security_hardening_analytic.sql).

-- Bersihkan grant lama (kalau fase2_fungsi.sql pernah dijalankan).
do $$
begin
  execute 'revoke execute on function public.get_all_transaksi() from anon, authenticated';
exception when undefined_function then null;
end $$;

-- ============================================================
-- RETUR TRACKER
-- Baca tetap publik. Tulis wajib kunci; tidak ada policy DELETE
-- karena tool tidak pernah menghapus.
-- ============================================================
alter table public.retur_tracking   enable row level security;
alter table public.retur_expeditions enable row level security;

drop policy if exists "retur tracking write" on public.retur_tracking;
drop policy if exists "retur tracking insert" on public.retur_tracking;
drop policy if exists "retur tracking update" on public.retur_tracking;
drop policy if exists "retur exp write" on public.retur_expeditions;
drop policy if exists "retur exp insert" on public.retur_expeditions;
drop policy if exists "retur exp update" on public.retur_expeditions;

create policy "retur tracking insert" on public.retur_tracking
  for insert to anon, authenticated with check (public.has_write_key());
create policy "retur tracking update" on public.retur_tracking
  for update to anon, authenticated
  using (public.has_write_key()) with check (public.has_write_key());
create policy "retur exp insert" on public.retur_expeditions
  for insert to anon, authenticated with check (public.has_write_key());
create policy "retur exp update" on public.retur_expeditions
  for update to anon, authenticated
  using (public.has_write_key()) with check (public.has_write_key());

-- ============================================================
-- LATCH
-- PIN pindah dari latch_config (terbaca anon) ke schema privat.
-- Tulis link/kategori memakai PIN yang sudah diketik admin.
-- Klik link publik lewat RPC latch_click (hanya +1, tidak bisa
-- mengubah kolom lain).
-- ============================================================
create table if not exists app_private.latch_pin (
  id integer primary key default 1 check (id = 1),
  value text not null
);
alter table app_private.latch_pin enable row level security;

insert into app_private.latch_pin (id, value)
select 1, value from public.latch_config where key = 'pin'
on conflict (id) do nothing;
insert into app_private.latch_pin (id, value)
select 1, '1234'
where not exists (select 1 from app_private.latch_pin)
on conflict (id) do nothing;

delete from public.latch_config where key = 'pin';

create or replace function public.latch_login(p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select coalesce(
    (select value from app_private.latch_pin where id = 1) = coalesce(p_pin, ''),
    false
  );
$$;
revoke all on function public.latch_login(text) from public;
grant execute on function public.latch_login(text) to anon, authenticated;

create or replace function public.latch_can_write()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select coalesce(
    (select value from app_private.latch_pin where id = 1) =
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-write-token', ''),
    false
  );
$$;
revoke all on function public.latch_can_write() from public;
grant execute on function public.latch_can_write() to anon, authenticated;

-- Penghitung klik publik: hanya menambah click_count, tidak bisa
-- menyentuh kolom lain.
create or replace function public.latch_click(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.latch_links
     set click_count = coalesce(click_count, 0) + 1
   where id = p_id;
$$;
revoke all on function public.latch_click(text) from public;
grant execute on function public.latch_click(text) to anon, authenticated;

drop policy if exists "latch links write" on public.latch_links;
drop policy if exists "latch links insert" on public.latch_links;
drop policy if exists "latch links update" on public.latch_links;
drop policy if exists "latch links delete" on public.latch_links;
drop policy if exists "latch cat write" on public.latch_categories;
drop policy if exists "latch cat insert" on public.latch_categories;
drop policy if exists "latch cat update" on public.latch_categories;
drop policy if exists "latch cat delete" on public.latch_categories;
drop policy if exists "latch cfg write" on public.latch_config;

create policy "latch links insert" on public.latch_links
  for insert to anon, authenticated with check (public.latch_can_write());
create policy "latch links update" on public.latch_links
  for update to anon, authenticated
  using (public.latch_can_write()) with check (public.latch_can_write());
create policy "latch links delete" on public.latch_links
  for delete to anon, authenticated using (public.latch_can_write());

create policy "latch cat insert" on public.latch_categories
  for insert to anon, authenticated with check (public.latch_can_write());
create policy "latch cat update" on public.latch_categories
  for update to anon, authenticated
  using (public.latch_can_write()) with check (public.latch_can_write());
create policy "latch cat delete" on public.latch_categories
  for delete to anon, authenticated using (public.latch_can_write());

-- ============================================================
-- VERIFIKASI
--   select secret from app_private.write_key;
--   select count(*) from latch_config where key = 'pin';  -- harus 0
--   select public.latch_login('1234');                    -- true (PIN lama)
-- ============================================================
