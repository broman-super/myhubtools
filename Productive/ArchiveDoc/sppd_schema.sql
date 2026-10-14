-- ============================================================
-- SPPD Toolbox — Supabase Schema (New Design)
-- Single SPPD per event, all linked by event_id
-- 6-step wizard data structure
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. EVENTS (already exists, referenced by event_id)
-- ============================================================
-- Assuming events table exists with: id (uuid), nama, lokasi, tanggal_mulai, tanggal_selesai, user_id, created_at, updated_at

-- ============================================================
-- 2. SPPD HEADER (1:1 with event)
-- ============================================================
CREATE TABLE IF NOT EXISTS sppd_header (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  
  -- 1. Informasi Umum Perjalanan
  pemberi_tugas VARCHAR(255) DEFAULT 'Direktur',
  departemen VARCHAR(255) DEFAULT 'SUPERSUB',
  tgl_berangkat DATE NOT NULL,
  jam_berangkat VARCHAR(50) DEFAULT '09.00 WIB',
  tgl_kembali DATE NOT NULL,
  ket_kembali VARCHAR(255) DEFAULT 'sampai dengan selesai',
  
  -- Transportasi (checkboxes)
  transport_pribadi BOOLEAN DEFAULT true,
  transport_travel BOOLEAN DEFAULT false,
  transport_kereta BOOLEAN DEFAULT false,
  transport_lainnya TEXT,
  
  kota VARCHAR(255) NOT NULL,
  target_1 TEXT,
  target_2 TEXT,
  target_3 TEXT,
  
  -- SPPD Status
  status VARCHAR(50) DEFAULT 'konsep', -- konsep, diajukan, disetujui, selesai
  no_surat VARCHAR(100),
  tanggal_terbit DATE,
  tujuan TEXT,
  kegiatan TEXT,
  instansi TEXT,
  
  -- Dana
  dana_awal NUMERIC(18,2) DEFAULT 0,
  realisasi NUMERIC(18,2) DEFAULT 0,
  tampilkan_realisasi BOOLEAN DEFAULT false,
  catatan TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. SPPD BIAYA UMUM (1-8 items, letters A-H)
-- ============================================================
CREATE TABLE IF NOT EXISTS sppd_biaya (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sppd_id UUID NOT NULL REFERENCES sppd_header(id) ON DELETE CASCADE,
  urutan INT NOT NULL, -- 0-7 maps to A-H
  item VARCHAR(255) NOT NULL,
  jumlah NUMERIC(18,2) DEFAULT 0,
  ket TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sppd_biaya_sppd ON sppd_biaya(sppd_id);

-- ============================================================
-- 4. SPPD SPJ — 4 DAFTAR INDEPENDEN (disejajarkan by index)
-- Petugas, Uang Saku, Penginapan, Konsumsi
-- Baris di cetak = daftar terpanjang di antaranya
-- ============================================================

-- 4a. Petugas (Yang Bertugas)
CREATE TABLE IF NOT EXISTS sppd_petugas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sppd_id UUID NOT NULL REFERENCES sppd_header(id) ON DELETE CASCADE,
  urutan INT NOT NULL,
  nama VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4b. Uang Saku (Weekday/Weekend qty & @)
CREATE TABLE IF NOT EXISTS sppd_uang_saku (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sppd_id UUID NOT NULL REFERENCES sppd_header(id) ON DELETE CASCADE,
  urutan INT NOT NULL,
  wq NUMERIC(10,2) DEFAULT 0,   -- Weekday Qty
  wa NUMERIC(18,2) DEFAULT 0,   -- Weekday @
  eq NUMERIC(10,2) DEFAULT 0,   -- Weekend Qty
  ea NUMERIC(18,2) DEFAULT 0,   -- Weekend @
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4c. Penginapan (Qty & @)
CREATE TABLE IF NOT EXISTS sppd_penginapan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sppd_id UUID NOT NULL REFERENCES sppd_header(id) ON DELETE CASCADE,
  urutan INT NOT NULL,
  qty NUMERIC(10,2) DEFAULT 0,
  at_ NUMERIC(18,2) DEFAULT 0,  -- @ (tarif)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4d. Konsumsi (Lain-lain)
CREATE TABLE IF NOT EXISTS sppd_konsumsi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sppd_id UUID NOT NULL REFERENCES sppd_header(id) ON DELETE CASCADE,
  urutan INT NOT NULL,
  nominal NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for SPJ tables
CREATE INDEX IF NOT EXISTS idx_sppd_petugas_sppd ON sppd_petugas(sppd_id);
CREATE INDEX IF NOT EXISTS idx_sppd_uang_saku_sppd ON sppd_uang_saku(sppd_id);
CREATE INDEX IF NOT EXISTS idx_sppd_penginapan_sppd ON sppd_penginapan(sppd_id);
CREATE INDEX IF NOT EXISTS idx_sppd_konsumsi_sppd ON sppd_konsumsi(sppd_id);

-- ============================================================
-- 5. SPPD TANDA TANGAN (Maker, Checker, Signer)
-- ============================================================
CREATE TABLE IF NOT EXISTS sppd_ttd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sppd_id UUID NOT NULL REFERENCES sppd_header(id) ON DELETE CASCADE,
  peran VARCHAR(20) NOT NULL CHECK (peran IN ('maker', 'checker', 'signer')),
  nama VARCHAR(255),
  jabatan VARCHAR(255),
  tanggal DATE,
  img_base64 TEXT,  -- data URI, diperkecil 500px max
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sppd_id, peran)
);

-- ============================================================
-- 6. PERUSAHAAN PROFIL (Global default, bisa override per SPPD)
-- ============================================================
CREATE TABLE IF NOT EXISTS sppd_perusahaan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- future multi-user
  nama VARCHAR(255) DEFAULT 'PT. ELFIQA KARYA TRIANGGA',
  logo_base64 TEXT,
  wm_mode VARCHAR(20) DEFAULT 'teks' CHECK (wm_mode IN ('teks', 'logo', 'gambar', 'off')),
  wm_text VARCHAR(255) DEFAULT 'PT. ELFIQA KARYA TRIANGGA',
  wm_img_base64 TEXT,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. DANA CAIR (existing, linked to event_id)
-- ============================================================
-- Already exists: dana_cair (id, event_id, sumber, rekening, tanggal_cair, nominal, status, catatan)

-- ============================================================
-- 8. SPPD ALOKASI (Budget per komponen + wallet tujuan)
-- ============================================================
CREATE TABLE IF NOT EXISTS sppd_alokasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sppd_id UUID NOT NULL REFERENCES sppd_header(id) ON DELETE CASCADE,
  kategori VARCHAR(100) NOT NULL,
  alokasi NUMERIC(18,2) DEFAULT 0,
  ket TEXT,
  wallet VARCHAR(20) DEFAULT 'Kas' CHECK (wallet IN ('Bank', 'QRIS', 'Kas', 'E-Money')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sppd_alokasi_sppd ON sppd_alokasi(sppd_id);

-- ============================================================
-- VIEWS / HELPER FUNCTIONS
-- ============================================================

-- View: SPPD lengkap per event (untuk print view / wizard review)
CREATE OR REPLACE VIEW v_sppd_full AS
SELECT 
  e.id AS event_id,
  e.nama AS event_nama,
  e.lokasi AS event_lokasi,
  e.tanggal_mulai,
  e.tanggal_selesai,
  sh.*,
  jsonb_agg(jsonb_build_object(
    'urutan', b.urutan, 'item', b.item, 'jumlah', b.jumlah, 'ket', b.ket
  ) ORDER BY b.urutan) FILTER (WHERE b.id IS NOT NULL) AS biaya,
  jsonb_agg(jsonb_build_object(
    'urutan', p.urutan, 'nama', p.nama
  ) ORDER BY p.urutan) FILTER (WHERE p.id IS NOT NULL) AS petugas,
  jsonb_agg(jsonb_build_object(
    'urutan', u.urutan, 'wq', u.wq, 'wa', u.wa, 'eq', u.eq, 'ea', u.ea
  ) ORDER BY u.urutan) FILTER (WHERE u.id IS NOT NULL) AS uang_saku,
  jsonb_agg(jsonb_build_object(
    'urutan', pg.urutan, 'qty', pg.qty, 'at', pg.at_
  ) ORDER BY pg.urutan) FILTER (WHERE pg.id IS NOT NULL) AS penginapan,
  jsonb_agg(jsonb_build_object(
    'urutan', k.urutan, 'nominal', k.nominal
  ) ORDER BY k.urutan) FILTER (WHERE k.id IS NOT NULL) AS konsumsi,
  jsonb_agg(jsonb_build_object(
    'peran', t.peran, 'nama', t.nama, 'jabatan', t.jabatan, 'tanggal', t.tanggal, 'img', t.img_base64
  )) FILTER (WHERE t.id IS NOT NULL) AS ttd,
  jsonb_agg(jsonb_build_object(
    'kategori', a.kategori, 'alokasi', a.alokasi, 'ket', a.ket, 'wallet', a.wallet
  )) FILTER (WHERE a.id IS NOT NULL) AS alokasi
FROM events e
LEFT JOIN sppd_header sh ON sh.event_id = e.id
LEFT JOIN sppd_biaya b ON b.sppd_id = sh.id
LEFT JOIN sppd_petugas p ON p.sppd_id = sh.id
LEFT JOIN sppd_uang_saku u ON u.sppd_id = sh.id
LEFT JOIN sppd_penginapan pg ON pg.sppd_id = sh.id
LEFT JOIN sppd_konsumsi k ON k.sppd_id = sh.id
LEFT JOIN sppd_ttd t ON t.sppd_id = sh.id
LEFT JOIN sppd_alokasi a ON a.sppd_id = sh.id
GROUP BY e.id, sh.id;

-- Function: Auto-create default SPJ rows when SPPD header created
-- (Optional: can be handled in frontend)

-- Row Level Security (enable when multi-user)
-- ALTER TABLE sppd_header ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only access own events" ON sppd_header
--   USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

-- ============================================================
-- SEED: Default company profile
-- ============================================================
INSERT INTO sppd_perusahaan (user_id, nama, wm_text, is_default)
VALUES ('00000000-0000-0000-0000-000000000001', 'PT. ELFIQA KARYA TRIANGGA', 'PT. ELFIQA KARYA TRIANGGA', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTES FOR FRONTEND INTEGRATION
-- ============================================================
-- 1. All tables linked via event_id → sppd_header(event_id) → child tables(sppd_id)
-- 2. Frontend store.js will mirror this structure in localStorage first
-- 3. GAS bridge (gas/sppdtoolbox.gs) will map these tables to Supabase
-- 4. Wizard 6 steps maps to:
--    Step 1: Perusahaan → sppd_perusahaan + sppd_header(perusahaan fields)
--    Step 2: Info Perjalanan → sppd_header (tgl, transport, kota, target)
--    Step 3: Biaya Umum → sppd_biaya (max 8)
--    Step 4: Biaya SPJ → sppd_petugas, sppd_uang_saku, sppd_penginapan, sppd_konsumsi
--    Step 5: Penandatangan → sppd_ttd (3 rows)
--    Step 6: Review & Simpan → buildHTML() → save all
-- 5. Print renderer (A.sppdPrintForm) reads from this unified structure