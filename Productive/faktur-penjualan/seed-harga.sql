-- ============================================================
-- HARGA KATALOG Faktur Penjualan
-- Terapkan SETELAH seed-produk.sql berhasil.
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > Paste > Run
-- ============================================================

-- Kolom harga asli (harga sebelum diskon) untuk chip "coret" otomatis di tool.
alter table public.faktur_produk
add column if not exists harga_asli numeric(12,0) not null default 0;

-- Classic (S ), Xtreme (SX), Aerogrip (SAG), Twotone (STT/STX/STC): 185.000, asli 195.000
update public.faktur_produk
set harga = 185000, harga_asli = 195000, updated_at = now()
where sku like 'S %'
   or sku like 'SX %'
   or sku like 'SAG %'
   or sku like 'STT %'
   or sku like 'STX %'
   or sku like 'STC %';

-- Waterproof (SWP): 200.000, asli 235.000
update public.faktur_produk
set harga = 200000, harga_asli = 235000, updated_at = now()
where sku like 'SWP %';

-- Cek hasil (total 390: 380 @185000 + 10 @200000)
select count(*) as total,
       count(*) filter (where harga = 185000 and harga_asli = 195000) as regular_ok,
       count(*) filter (where harga = 200000 and harga_asli = 235000) as waterproof_ok,
       count(*) filter (where harga = 0) as belum_isi
from public.faktur_produk;