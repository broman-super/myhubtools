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
-- Model sama dengan LATCH / backend GAS lama: siapa pun (anon)
-- bisa baca semua dan bisa tulis. Konsisten dengan perilaku lama.
-- ============================================================
alter table retur_tracking     enable row level security;
alter table retur_expeditions  enable row level security;

create policy "retur tracking read"  on retur_tracking    for select using (true);
create policy "retur tracking write" on retur_tracking    for all    using (true) with check (true);
create policy "retur exp read"       on retur_expeditions for select using (true);
create policy "retur exp write"      on retur_expeditions for all    using (true) with check (true);