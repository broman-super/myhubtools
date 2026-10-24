-- ============================================================
-- RETUR TRACK — Supabase Schema
-- Copy-paste ke Supabase Dashboard > SQL Editor > Run.
-- Re-run aman: semua DDL pakai IF NOT EXISTS.
-- ============================================================

create table if not exists retur_tracking (
  id bigint generated always as identity primary key,
  resi text not null default '',
  ekspedisi text not null default '',
  waktu_scan text not null default '',
  tanggal date not null,
  operator text not null default '',
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create index if not exists retur_tracking_tanggal_idx
  on retur_tracking (tanggal desc, id asc);

create table if not exists retur_expeditions (
  id bigint generated always as identity primary key,
  nama text not null unique,
  regex text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- Baca publik; tulis hanya dengan header x-write-token yang cocok.
-- Prasyarat: jalankan supabase/security_hardening.sql lebih dulu
-- (membuat public.has_write_key()).
-- ============================================================
alter table retur_tracking     enable row level security;
alter table retur_expeditions  enable row level security;

drop policy if exists "retur tracking write" on retur_tracking;
drop policy if exists "retur exp write"      on retur_expeditions;

create policy "retur tracking read"   on retur_tracking    for select using (true);
create policy "retur tracking insert" on retur_tracking    for insert to anon, authenticated
  with check (public.has_write_key());
create policy "retur tracking update" on retur_tracking    for update to anon, authenticated
  using (public.has_write_key()) with check (public.has_write_key());
create policy "retur exp read"        on retur_expeditions for select using (true);
create policy "retur exp insert"      on retur_expeditions for insert to anon, authenticated
  with check (public.has_write_key());
create policy "retur exp update"      on retur_expeditions for update to anon, authenticated
  using (public.has_write_key()) with check (public.has_write_key());