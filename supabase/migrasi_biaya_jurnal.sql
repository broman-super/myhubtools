-- ============================================================
-- MIGRASI BIAYA (JURNAL) — AMAN, IDEMPOTEN, TANPA DROP
-- Jalankan HANYA file ini di SQL Editor Supabase untuk fitur import
-- Excel biaya (No Bukti, Keterangan Jurnal, Debit, Platform, Nama Toko).
-- Boleh dijalankan berulang — kolom yang sudah ada dilewati.
-- TIDAK menghapus data apa pun.
-- ============================================================
ALTER TABLE biaya ADD COLUMN IF NOT EXISTS "No Bukti"          TEXT;
ALTER TABLE biaya ADD COLUMN IF NOT EXISTS "Keterangan Jurnal" TEXT;
ALTER TABLE biaya ADD COLUMN IF NOT EXISTS "Debit"            NUMERIC(12,2);
ALTER TABLE biaya ADD COLUMN IF NOT EXISTS "Platform"         TEXT;
ALTER TABLE biaya ADD COLUMN IF NOT EXISTS "Nama Toko"        TEXT;
