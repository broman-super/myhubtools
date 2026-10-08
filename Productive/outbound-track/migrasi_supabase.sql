-- ============================================
-- OUTBOND TRACK — Migrasi ke Supabase (project UNITOOLS)
-- Jalankan di: Supabase Dashboard > SQL Editor (project UNITOOLS)
-- ============================================

-- Tabel tunggal paket. Kolom waktu DIJAGA TEXT dengan format "dd-MM-yyyy, HH:mm"
-- (format lama dari sheet) supaya render riwayat di frontend tidak berubah.
-- Prefiks nama tabel "outbond_" menandakan kepemilikan tool ini dalam project
-- UNITOOLS yang menggabungkan database beberapa tool.
create table if not exists public.outbond_paket (
  id bigserial primary key,
  "id_penginputan" text not null,
  resi text not null,
  ekspedisi text not null,
  waktu text not null,
  created_at timestamptz default now()
);

-- Akses: anon HANYA BISA MEMBACA. Insert/DELETE/UPDATE tidak ada policy
-- -> hanya bisa lewat service_role (Google Apps Script gscode/outbondtrack.gs).
alter table public.outbond_paket enable row level security;

create policy outbond_paket_read on public.outbond_paket
  for select using (true);

create index if not exists idx_outbond_paket_idpeng on public.outbond_paket ("id_penginputan");
