-- ============================================================
-- MIGRASI ANALYTIC WEBTOOL → SUPABASE — FASE 0 (DDL + RLS)
-- Jalankan SEMUA blok ini di SQL Editor Supabase (sekali jalan).
-- Aman dijalankan ulang (DROP IF EXISTS).
-- ============================================================

-- ---------- RESET (hanya untuk fase pengembangan) ----------
DROP TABLE IF EXISTS settings  CASCADE;
DROP TABLE IF EXISTS biaya     CASCADE;
DROP TABLE IF EXISTS produk    CASCADE;
DROP TABLE IF EXISTS transaksi CASCADE;

-- ---------- 3.1 TABEL transaksi ----------
-- Kolom = persis header sheet Transaksi:
-- Tanggal | Nomor # | Tipe Transaksi | Nama Pelanggan | Nama Kategori Pelanggan |
-- Nama Barang | Kuantitas | Total Harga | Penjualan
CREATE TABLE transaksi (
    id BIGSERIAL PRIMARY KEY,
    "Tanggal"                 DATE NOT NULL,
    "Nomor #"                 TEXT,
    "Tipe Transaksi"          TEXT,
    "Nama Pelanggan"          TEXT,
    "Nama Kategori Pelanggan" TEXT,
    "Nama Barang"             TEXT,
    "Kuantitas"               INT,
    "Total Harga"             NUMERIC(12,2),
    "Penjualan"               NUMERIC(12,2),
    dedupe_key                TEXT,
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- dedupe_key TIDAK unique: sheet bisa punya beberapa baris ber-(Nomor #, Nama Barang) sama.
-- Import menyimpan SEMUA baris (fidelity). dedupe_key dipakai bulkUpsert Fase 5
-- (UPDATE ... WHERE dedupe_key = ...; INSERT bila tak ada) — bukan ON CONFLICT.
CREATE INDEX idx_transaksi_dedupe ON transaksi (dedupe_key);
CREATE INDEX idx_transaksi_tanggal ON transaksi ("Tanggal");
CREATE INDEX idx_transaksi_produk  ON transaksi (upper(trim("Nama Barang")));

-- ---------- 3.2 TABEL produk ----------
CREATE TABLE produk (
    id BIGSERIAL PRIMARY KEY,
    "Nama Barang"     TEXT,
    "Kode Series"     TEXT,
    "Nama Series"     TEXT,
    "Kategori Produk" TEXT,
    "HPP"             NUMERIC(12,2),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_produk_nama ON produk (upper(trim("Nama Barang")));

-- ---------- 3.3 TABEL biaya ----------
CREATE TABLE biaya (
    id BIGSERIAL PRIMARY KEY,
    "Tanggal"        DATE,
    "Kategori Biaya" TEXT,
    "Nominal"        NUMERIC(12,2),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 3.4 TABEL settings ----------
CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    "Key"   TEXT UNIQUE,
    "Value" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 3.5 RLS (aktifkan sebelum anon key dipakai publik) ----------
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE produk    ENABLE ROW LEVEL SECURITY;
ALTER TABLE biaya     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow public read" ON transaksi FOR SELECT USING (true);
CREATE POLICY "allow public read" ON produk    FOR SELECT USING (true);
CREATE POLICY "allow public read" ON biaya     FOR SELECT USING (true);
CREATE POLICY "allow public read" ON settings  FOR SELECT USING (true);

-- TIDAK ada policy INSERT/UPDATE/DELETE untuk anon.
-- Semua write hanya lewat GAS (service_role) yang melewati RLS.
