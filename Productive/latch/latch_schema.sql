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
  click_count int default 0,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists latch_config (
  key text primary key,
  value text
);

-- Seed config awal (pin admin + announcement).
insert into latch_config (key, value) values
  ('pin', '1234'),
  ('announcement', 'Selamat datang di LATCH.')
on conflict (key) do nothing;

-- ============================================================
-- Row Level Security
-- Model sama dengan backend GAS lama: siapa pun (anon) bisa
-- baca semua, dan bisa tulis. PIN adalah penyaring akses di
-- frontend, bukan security nyata — konsisten dengan perilaku lama.
-- Sesuaikan/rapatkan di sini bila nanti butuh autentikasi asli.
-- ============================================================
alter table latch_links      enable row level security;
alter table latch_categories enable row level security;
alter table latch_config     enable row level security;

create policy "latch links read"  on latch_links      for select using (true);
create policy "latch links write" on latch_links      for all    using (true) with check (true);
create policy "latch cat read"    on latch_categories for select using (true);
create policy "latch cat write"   on latch_categories for all    using (true) with check (true);
create policy "latch cfg read"    on latch_config     for select using (true);
create policy "latch cfg write"   on latch_config     for all    using (true) with check (true);
