-- ============================================================
-- RND ROADMAP TRACKER — schema (project UNITOOLS)
-- Jalankan sekali di SQL Editor Supabase project UNITOOLS.
-- ============================================================

create table if not exists public.rnd_roadmap (
  id          text primary key,          -- id project (mis. "id-1000" atau uuid)
  data        jsonb not null,            -- seluruh object project (nested milestone/checklist/evaluasi)
  updated_at  timestamptz not null default now()
);

create index if not exists rnd_roadmap_updated_at_idx
  on public.rnd_roadmap (updated_at desc);

-- Trigger agar updated_at ikut berubah tiap kali data disimpan.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists rnd_roadmap_touch on public.rnd_roadmap;
create trigger rnd_roadmap_touch
  before update on public.rnd_roadmap
  for each row execute function public.touch_updated_at();

-- ============================================================
-- RLS: anon HANYA boleh baca. Tidak ada policy write untuk anon,
-- sehingga public anon key di frontend tidak bisa mengubah data.
-- Write dilakukan oleh service_role lewat GAS bridge.
-- ============================================================
alter table public.rnd_roadmap enable row level security;

drop policy if exists "rnd_roadmap_anon_read" on public.rnd_roadmap;
create policy "rnd_roadmap_anon_read"
  on public.rnd_roadmap
  for select
  using (true);
