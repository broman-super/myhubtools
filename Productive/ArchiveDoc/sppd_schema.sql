-- ============================================================
-- SPPD Toolbox (ArchiveDoc) — Skema Supabase
-- Proyek : iyraamxkrygtzsqkvnqz  (UNITOOLS / Universal Tools)
-- Prefix : sppd_  → menghindari tabrakan dengan tabel tool lain.
--          Contoh: nama polos `settings` SUDAH dipakai Analytic
--          Dashboard (supabase/migrasi_analytic.sql), jadi wajib di-prefix.
--
-- Sumber kebenaran model = js/store.js  (BUKAN Draft_UPD/SQL_SEED_DATA.sql —
--   file itu memakai model lama events/trips/documents dan tidak cocok
--   dengan aplikasi yang benar-benar dibangun).
--
-- Akses: SEMUA baca/tulis lewat GAS bridge memakai service_role
--   (bypass RLS). Karena itu RLS diaktifkan TANPA policy anon →
--   anon key tidak bisa menyentuh satu baris pun. service_role key
--   disimpan di GAS PropertiesService, JANGAN pernah di frontend/repo.
--
-- Cara pakai: Supabase Dashboard → SQL Editor → tempel file ini → Run.
--
-- ponytail: kolom tanggal bertipe `text`, bukan `date`, karena aplikasi
--   menulis '' untuk field kosong (mis. milestone.tanggal). Cast di SQL
--   bila butuh operasi tanggal. id juga `text` karena dibuat klien
--   (A.uid() → 'id-<base36>-<rand>'), bukan uuid.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Events (inti; semua tabel anak merujuk ke sini)
-- ------------------------------------------------------------
create table if not exists public.sppd_events (
  id              text primary key,
  user_id         text not null default 'u1',
  nama            text not null,
  jenis           text,
  lokasi          text,
  tanggal_mulai   text,
  tanggal_selesai text,
  status          text not null default 'draft'
                    check (status in ('draft','diajukan','berjalan','disetujui','selesai')),
  peran_pic       text,
  catatan         text,
  created_at      text,
  updated_at      text
);

-- ------------------------------------------------------------
-- 2. SPPD / Surat Tugas (1 event = 1 sppd)
--    budget = array JSON alokasi per komponen (nested di store.js)
-- ------------------------------------------------------------
create table if not exists public.sppd_surat (
  id                  text primary key,
  user_id             text not null default 'u1',
  event_id            text not null references public.sppd_events(id) on delete cascade,
  no_surat            text,
  tanggal_terbit      text,
  tujuan              text,
  kegiatan            text,
  instansi            text,
  status              text not null default 'draft'
                        check (status in ('draft','diajukan','disetujui','selesai')),
  dana_awal           numeric(14,2) not null default 0,
  realisasi           numeric(14,2) not null default 0,
  tampilkan_realisasi boolean not null default false,
  link_dokumen        text,
  catatan             text,
  budget              jsonb not null default '[]'::jsonb,
  constraint sppd_surat_event_unique unique (event_id)
);

-- ------------------------------------------------------------
-- 3. Transportasi (leg perjalanan)
--    detail = JSON sesuai mode (sewa/umum/pribadi)
-- ------------------------------------------------------------
create table if not exists public.sppd_transports (
  id          text primary key,
  user_id     text not null default 'u1',
  event_id    text not null references public.sppd_events(id) on delete cascade,
  leg         text,
  tanggal     text,
  mode        text check (mode in ('sewa','umum','pribadi')),
  rute_asal   text,
  rute_tujuan text,
  total_biaya numeric(14,2) not null default 0,
  wallet      text,
  detail      jsonb not null default '{}'::jsonb,
  catatan     text
);

-- ------------------------------------------------------------
-- 4. Master Produk
-- ------------------------------------------------------------
create table if not exists public.sppd_products (
  id                 text primary key,
  user_id            text not null default 'u1',
  nama               text not null,
  sku                text,
  satuan             text,
  harga_jual_default numeric(14,2) not null default 0,
  stok_kantor        integer not null default 0,
  aktif              boolean not null default true
);

-- ------------------------------------------------------------
-- 5. Produk per event (checklist produk dibawa)
-- ------------------------------------------------------------
create table if not exists public.sppd_event_products (
  id               text primary key,
  user_id          text not null default 'u1',
  event_id         text not null references public.sppd_events(id) on delete cascade,
  product_id       text references public.sppd_products(id) on delete cascade,
  qty_dibawa       integer not null default 0,
  qty_rusak_hilang integer not null default 0,
  qty_kembali      integer not null default 0,
  catatan          text
);

-- ------------------------------------------------------------
-- 6. Penjualan
-- ------------------------------------------------------------
create table if not exists public.sppd_sales (
  id           text primary key,
  user_id      text not null default 'u1',
  event_id     text not null references public.sppd_events(id) on delete cascade,
  product_id   text references public.sppd_products(id) on delete cascade,
  tanggal      text,
  qty          integer not null default 0,
  harga_satuan numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0,
  metode       text,
  wallet       text,
  catatan      text
);

-- ------------------------------------------------------------
-- 7. Pengeluaran
-- ------------------------------------------------------------
create table if not exists public.sppd_expenses (
  id             text primary key,
  user_id        text not null default 'u1',
  event_id       text not null references public.sppd_events(id) on delete cascade,
  kategori       text,
  tanggal        text,
  deskripsi      text,
  jumlah         numeric(14,2) not null default 0,
  wallet         text,
  bukti_drive_id text,
  bukti_link     text,
  catatan        text
);

-- ------------------------------------------------------------
-- 8. Milestone / Timeline
--    attachments = array JSON metadata dokumen bukti (bukan blob)
-- ------------------------------------------------------------
create table if not exists public.sppd_milestones (
  id          text primary key,
  user_id     text not null default 'u1',
  event_id    text not null references public.sppd_events(id) on delete cascade,
  judul       text,
  tanggal     text,
  status      text not null default 'todo'
                check (status in ('todo','aktif','selesai')),
  urutan      integer not null default 0,
  catatan     text,
  attachments jsonb not null default '[]'::jsonb
);

-- ------------------------------------------------------------
-- 9. Penyesuaian kas (± jumlah)
-- ------------------------------------------------------------
create table if not exists public.sppd_kas_adj (
  id         text primary key,
  user_id    text not null default 'u1',
  event_id   text not null references public.sppd_events(id) on delete cascade,
  tanggal    text,
  keterangan text,
  jumlah     numeric(14,2) not null default 0,
  wallet     text,
  created_at text
);

-- ------------------------------------------------------------
-- 10. Dana cair (checklist dana masuk)
-- ------------------------------------------------------------
create table if not exists public.sppd_dana_cair (
  id           text primary key,
  user_id      text not null default 'u1',
  event_id     text not null references public.sppd_events(id) on delete cascade,
  sumber       text,
  rekening     text,
  nominal      numeric(14,2) not null default 0,
  tanggal_cair text,
  status       text not null default 'belum'
                 check (status in ('cair','belum')),
  catatan      text
);

-- ------------------------------------------------------------
-- 11. Item persiapan (non-produk)
-- ------------------------------------------------------------
create table if not exists public.sppd_prep_items (
  id          text primary key,
  user_id     text not null default 'u1',
  event_id    text not null references public.sppd_events(id) on delete cascade,
  template_id text,
  nama        text not null,
  kategori    text,
  qty         integer not null default 0,
  biaya       numeric(14,2) not null default 0,
  status      text not null default 'belum'
                check (status in ('belum','proses','disetujui','selesai')),
  dibawa      boolean not null default false,
  pulang      boolean not null default false,
  catatan     text
);

-- ------------------------------------------------------------
-- 12. Checklist 24 item (template statis)
-- ------------------------------------------------------------
create table if not exists public.sppd_checklist_templates (
  id       text primary key,
  user_id  text not null default 'u1',
  kategori text,
  nama     text not null,
  urutan   integer not null default 0
);

create table if not exists public.sppd_checklist_items (
  id          text primary key,
  user_id     text not null default 'u1',
  event_id    text not null references public.sppd_events(id) on delete cascade,
  template_id text,
  status      text not null default 'todo'
                check (status in ('todo','aktif','selesai')),
  updated_at  text
);

-- ------------------------------------------------------------
-- 13. Master barang dibawa (aksesor)
-- ------------------------------------------------------------
create table if not exists public.sppd_item_cats (
  id      text primary key,
  user_id text not null default 'u1',
  nama    text not null,
  urutan  integer not null default 0
);

create table if not exists public.sppd_item_templates (
  id      text primary key,
  user_id text not null default 'u1',
  cat_id  text references public.sppd_item_cats(id) on delete cascade,
  nama    text not null,
  urutan  integer not null default 0
);

-- ------------------------------------------------------------
-- 14. Pengaturan (satu baris per user)
-- ------------------------------------------------------------
create table if not exists public.sppd_settings (
  user_id           text primary key,
  nama              text,
  instansi          text,
  tarif_km          numeric(14,2) not null default 4500,
  folder_drive_id   text,
  catatan_integrasi text
);

-- ------------------------------------------------------------
-- 15. Index untuk foreign key (query per event)
-- ------------------------------------------------------------
create index if not exists sppd_surat_event_idx          on public.sppd_surat(event_id);
create index if not exists sppd_transports_event_idx     on public.sppd_transports(event_id);
create index if not exists sppd_event_products_event_idx on public.sppd_event_products(event_id);
create index if not exists sppd_event_products_prod_idx  on public.sppd_event_products(product_id);
create index if not exists sppd_sales_event_idx          on public.sppd_sales(event_id);
create index if not exists sppd_sales_product_idx        on public.sppd_sales(product_id);
create index if not exists sppd_expenses_event_idx       on public.sppd_expenses(event_id);
create index if not exists sppd_milestones_event_idx     on public.sppd_milestones(event_id);
create index if not exists sppd_kas_adj_event_idx        on public.sppd_kas_adj(event_id);
create index if not exists sppd_dana_cair_event_idx      on public.sppd_dana_cair(event_id);
create index if not exists sppd_prep_items_event_idx     on public.sppd_prep_items(event_id);
create index if not exists sppd_checklist_items_event_idx on public.sppd_checklist_items(event_id);
create index if not exists sppd_item_templates_cat_idx   on public.sppd_item_templates(cat_id);

-- ------------------------------------------------------------
-- 16. RLS: aktifkan, TANPA policy anon
--     → anon/authenticated tertutup total; hanya service_role
--       (dipakai GAS) yang bisa baca/tulis.
-- ------------------------------------------------------------
alter table public.sppd_events             enable row level security;
alter table public.sppd_surat              enable row level security;
alter table public.sppd_transports         enable row level security;
alter table public.sppd_products           enable row level security;
alter table public.sppd_event_products     enable row level security;
alter table public.sppd_sales              enable row level security;
alter table public.sppd_expenses           enable row level security;
alter table public.sppd_milestones         enable row level security;
alter table public.sppd_kas_adj            enable row level security;
alter table public.sppd_dana_cair          enable row level security;
alter table public.sppd_prep_items         enable row level security;
alter table public.sppd_checklist_templates enable row level security;
alter table public.sppd_checklist_items    enable row level security;
alter table public.sppd_item_cats          enable row level security;
alter table public.sppd_item_templates     enable row level security;
alter table public.sppd_settings           enable row level security;

-- ------------------------------------------------------------
-- 17. Cek: 16 tabel harus ada
-- ------------------------------------------------------------
-- select table_name from information_schema.tables
--   where table_schema = 'public' and table_name like 'sppd_%'
--   order by table_name;
