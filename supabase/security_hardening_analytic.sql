-- ============================================================
-- SECURITY HARDENING — project ANALYTIC (ciukvojsknsdnkysbpjl).
-- Jalankan SEKALI di SQL Editor project Analytic. Berbeda dari
-- security_hardening.sql (project retur/latch), file ini hanya
-- menutup dump transaksi lewat get_all_transaksi().
--
-- Kunci tulis HARUS sama dengan project utama supaya user cukup
-- mengetik sekali di browser:
--   1) Jalankan file ini → kunci acak dibuat.
--   2) Salin secret dari project utama:
--        select secret from app_private.write_key;             -- project utama
--        update app_private.write_key set secret = '<secret>'; -- project ini
--   3) Set secret itu juga sebagai BRIDGE_TOKEN di project GAS Analytic.
-- ============================================================

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table if not exists app_private.write_key (
  id integer primary key default 1 check (id = 1),
  secret text not null
);
alter table app_private.write_key enable row level security;

insert into app_private.write_key (id, secret)
values (1, replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

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

-- Snapshot transaksi penuh: hanya untuk pemegang kunci (preview upload).
create or replace function public.get_all_transaksi_secure(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public, app_private
as $$
  select case
    when exists (select 1 from app_private.write_key where secret = coalesce(p_key, ''))
    then (select jsonb_agg(t order by id) from public.transaksi t)
    else '[]'::jsonb
  end;
$$;
revoke all on function public.get_all_transaksi_secure(text) from public;
grant execute on function public.get_all_transaksi_secure(text) to anon, authenticated;

-- Tutup dump publik yang lama (fase2_fungsi.sql dulu memberi grant ke anon).
do $$
begin
  execute 'revoke execute on function public.get_all_transaksi() from anon, authenticated';
exception when undefined_function then null;
end $$;

-- ============================================================
-- VERIFIKASI
--   select secret from app_private.write_key;
--   select length(public.get_all_transaksi_secure('salah'));  -- 2 ('[]')
--   select public.has_write_key();                            -- false tanpa header
-- ============================================================
