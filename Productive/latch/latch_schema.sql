-- ============================================================
-- LATCH — Supabase Schema
-- Copy-paste ke Supabase Dashboard > SQL Editor > Run.
-- Prefix "latch_" supaya tidak bentrok dengan tabel existing
-- (outbond_paket, produk, biaya, settings, transaksi, rnd_roadmap).
-- Re-run aman: semua DDL pakai IF NOT EXISTS / do nothing.
-- ============================================================

create table if not exists latch_categories (
  id text primary key,
  name text not null,
  icon text default 'folder',
  sort_order int default 0
);

create table if not exists latch_links (
  id text primary key,
  title text not null,
  url text not null,
  category_id text references latch_categories(id) on delete set null,
  badge text default '',
  description text default '',
  lock_pin text default '',
  click_count int default 0,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Fitur lock per-link: kolom PIN. Re-run aman (buat DB lama yang sudah ada).
alter table latch_links add column if not exists lock_pin text default '';

create table if not exists latch_config (
  key text primary key,
  value text
);

-- Seed config awal (announcement saja). PIN admin TIDAK disimpan di sini:
-- lihat app_private.latch_pin di supabase/security_hardening.sql.
insert into latch_config (key, value) values
  ('announcement', 'Selamat datang di LATCH.')
on conflict (key) do nothing;

-- ============================================================
-- Row Level Security
-- Baca publik; tulis hanya dengan PIN admin yang sudah login
-- (header x-write-token → public.latch_can_write()).
-- Prasyarat: jalankan supabase/security_hardening.sql lebih dulu.
-- ============================================================
alter table latch_links      enable row level security;
alter table latch_categories enable row level security;
alter table latch_config     enable row level security;

drop policy if exists "latch links write" on latch_links;
drop policy if exists "latch cat write"   on latch_categories;
drop policy if exists "latch cfg write"   on latch_config;

create policy "latch links read"   on latch_links      for select using (true);
create policy "latch links insert" on latch_links      for insert to anon, authenticated
  with check (public.latch_can_write());
create policy "latch links update" on latch_links      for update to anon, authenticated
  using (public.latch_can_write()) with check (public.latch_can_write());
create policy "latch links delete" on latch_links      for delete to anon, authenticated
  using (public.latch_can_write());
create policy "latch cat read"     on latch_categories for select using (true);
create policy "latch cat insert"   on latch_categories for insert to anon, authenticated
  with check (public.latch_can_write());
create policy "latch cat update"   on latch_categories for update to anon, authenticated
  using (public.latch_can_write()) with check (public.latch_can_write());
create policy "latch cat delete"   on latch_categories for delete to anon, authenticated
  using (public.latch_can_write());
create policy "latch cfg read"     on latch_config     for select using (true);
