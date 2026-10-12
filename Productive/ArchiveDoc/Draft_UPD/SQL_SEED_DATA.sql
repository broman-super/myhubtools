-- ============================================================ -- FIELDWORK & EVENT BOOTH WEBTOOLS - DATABASE SETUP -- Database: Supabase (PostgreSQL) -- Versi: 1.0.0 -- Tanggal: 2026-09-29 -- ============================================================ -- CARA PAKAI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy-paste seluruh isi file ini
-- 3. Klik "Run"
-- 4. Verifikasi tabel & data template sudah terbuat -- ============================================================

-- ============================================================ -- BAGIAN 1: CLEANUP (Jalankan hanya jika ingin reset total) -- ============================================================ -- Uncomment baris di bawah jika ingin DROP semua tabel dulu /* DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
*/

-- ============================================================ -- BAGIAN 2: CREATE ENUM TYPES -- ============================================================ CREATE TYPE event_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');
CREATE TYPE trip_status AS ENUM ('draft', 'in_progress', 'completed');
CREATE TYPE trip_type AS ENUM ('preparation', 'departure', 'execution', 'post_event');
CREATE TYPE checklist_category AS ENUM ('documents', 'logistics', 'departure', 'report');
CREATE TYPE document_type AS ENUM ('sppd_checklist', 'logistics_checklist', 'departure_checklist', 'final_report');

-- ============================================================ -- BAGIAN 3: CREATE TABLES -- ============================================================

-- Tabel: events
CREATE TABLE events (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_name TEXT NOT NULL, event_date DATE NOT NULL, location TEXT NOT NULL, status event_status NOT NULL DEFAULT 'draft', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() );

-- Tabel: trips
CREATE TABLE trips (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE, trip_type trip_type NOT NULL DEFAULT 'execution', sppd_number TEXT, start_date DATE NOT NULL, end_date DATE NOT NULL, personnel TEXT[] NOT NULL DEFAULT '{}', notes TEXT, status trip_status NOT NULL DEFAULT 'draft', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() );

-- Tabel: checklist_items
CREATE TABLE checklist_items (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE, category checklist_category NOT NULL, item_name TEXT NOT NULL, is_checked BOOLEAN NOT NULL DEFAULT FALSE, checked_at TIMESTAMPTZ, notes TEXT, attachment_url TEXT, order_index INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() );

-- Tabel: documents
CREATE TABLE documents (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE, document_type document_type NOT NULL, gdrive_file_id TEXT NOT NULL, gdrive_url TEXT NOT NULL, generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() );

-- ============================================================ -- BAGIAN 4: INDEXES (untuk performa query) -- ============================================================ CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_trips_event_id ON trips(event_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_checklist_trip_id ON checklist_items(trip_id);
CREATE INDEX idx_checklist_category ON checklist_items(category);
CREATE INDEX idx_documents_trip_id ON documents(trip_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- ============================================================ -- BAGIAN 5: AUTO-UPDATE updated_at TRIGGER -- ============================================================ CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================ -- BAGIAN 6: ROW LEVEL SECURITY (RLS) -- ============================================================ -- Aktifkan RLS untuk semua tabel ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations via Service Role Key (dari GAS) -- Catatan: Service Role Key bypass RLS, tapi policy ini untuk keamanan ekstra CREATE POLICY "Allow all operations on events" ON events FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on trips" ON trips FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on checklist_items" ON checklist_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on documents" ON documents FOR ALL USING (true) WITH CHECK (true);

-- ============================================================ -- BAGIAN 7: HELPER FUNCTIONS -- ============================================================

-- Function: Hitung progress trip (persentase checklist checked) CREATE OR REPLACE FUNCTION calculate_trip_progress(p_trip_id UUID) RETURNS INTEGER AS $$ DECLARE total_items INTEGER;
    checked_items INTEGER;
    progress INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_items
    FROM checklist_items
    WHERE trip_id = p_trip_id;


SELECT COUNT(*) INTO checked_items
FROM checklist_items
WHERE trip_id = p_trip_id AND is_checked = TRUE;

IF total_items = 0 THEN
    RETURN 0;
END IF;


    progress := (checked_items * 100) / total_items;
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- Function: Hitung progress event (persentase trip completed) CREATE OR REPLACE FUNCTION calculate_event_progress(p_event_id UUID) RETURNS INTEGER AS $$ DECLARE total_trips INTEGER;
    completed_trips INTEGER;
    progress INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_trips
    FROM trips
    WHERE event_id = p_event_id;


SELECT COUNT(*) INTO completed_trips
FROM trips
WHERE event_id = p_event_id AND status = 'completed';

IF total_trips = 0 THEN
    RETURN 0;
END IF;


    progress := (completed_trips * 100) / total_trips;
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- ============================================================ -- BAGIAN 8: SEED DATA - TEMPLATE CHECKLIST (24 ITEMS) -- ============================================================ -- Template ini akan di-copy otomatis ke setiap trip baru via GAS -- Disimpan sebagai "trip template" dengan trip_id khusus (NULL atau UUID dummy)

-- Buat trip template dummy (tidak terhubung ke event manapun) -- Kita gunakan trip_id = '00000000-0000-0000-0000-000000000000' sebagai marker template -- ATAU lebih baik: simpan di tabel terpisah (checklist_templates)

-- Opsi 1: Tabel terpisah untuk template (RECOMMENDED) CREATE TABLE checklist_templates ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category checklist_category NOT NULL, item_name TEXT NOT NULL, order_index INTEGER NOT NULL, requires_attachment BOOLEAN NOT NULL DEFAULT FALSE, is_active BOOLEAN NOT NULL DEFAULT TRUE );

-- Insert 24 template items sesuai PRD section 8 INSERT INTO checklist_templates (category, item_name, order_index, requires_attachment) VALUES -- Kategori: documents (6 items) ('documents', 'SPPD dibuat dan ditandatangani', 1, FALSE), ('documents', 'Surat tugas dari atasan', 2, FALSE), ('documents', 'Foto copy KTP peserta', 3, TRUE), ('documents', 'Booking tiket pesawat/kereta', 4, TRUE), ('documents', 'Booking hotel', 5, TRUE), ('documents', 'Asuransi perjalanan', 6, FALSE),

-- Kategori: logistics (6 items)
('logistics', 'Rollup banner siap', 1, TRUE), ('logistics', 'Flyer/brosur siap', 2, TRUE), ('logistics', 'Merchandise siap', 3, TRUE), ('logistics', 'Alat teknis (laptop, projector, dll)', 4, FALSE), ('logistics', 'Kabel extension & adapter', 5, FALSE), ('logistics', 'Name tag peserta', 6, FALSE),

-- Kategori: departure (6 items)
('departure', 'Tiket sudah di-print', 1, TRUE), ('departure', 'Boarding pass tersimpan', 2, TRUE), ('departure', 'Hotel check-in selesai', 3, TRUE), ('departure', 'Alat teknis booth sudah tiba', 4, FALSE), ('departure', 'Merchandise sudah diterima', 5, FALSE), ('departure', 'Koordinasi dengan panitia event', 6, FALSE),

-- Kategori: report (6 items)
('report', 'Foto dokumentasi booth (minimal 5 foto)', 1, TRUE), ('report', 'Foto interaksi dengan pengunjung', 2, TRUE), ('report', 'Evaluasi jumlah pengunjung', 3, FALSE), ('report', 'Evaluasi jumlah leads/prospek', 4, FALSE), ('report', 'Catatan kendala selama event', 5, FALSE), ('report', 'Rekomendasi untuk event selanjutnya', 6, FALSE);

-- ============================================================ -- BAGIAN 9: SAMPLE DATA (Opsional - untuk testing) -- ============================================================ -- Uncomment jika ingin data sample untuk testing UI

/*
-- Sample Event
INSERT INTO events (event_name, event_date, location, status) VALUES ('Pameran UMKM 2026', '2026-10-15', 'JCC Jakarta', 'in_progress'), ('Expo Teknologi 2026', '2026-11-20', 'ICE BSD', 'draft');

-- Sample Trip
INSERT INTO trips (event_id, trip_type, sppd_number, start_date, end_date, personnel, notes, status) VALUES ( (SELECT id FROM events WHERE event_name = 'Pameran UMKM 2026'), 'execution', 'SPPD/2026/001', '2026-10-14', '2026-10-17', ARRAY['Budi Santoso', 'Ani Wijaya'], 'Trip utama pameran', 'in_progress' );

-- Sample Checklist Items (copy dari template) INSERT INTO checklist_items (trip_id, category, item_name, order_index, is_checked, checked_at, notes) SELECT (SELECT id FROM trips WHERE sppd_number = 'SPPD/2026/001'), category, item_name, order_index, CASE WHEN order_index <= 3 THEN TRUE ELSE FALSE END, CASE WHEN order_index <= 3 THEN NOW() - (order_index || ' hours')::INTERVAL ELSE NULL END, CASE WHEN order_index = 1 THEN 'Sudah ditandatangani Pak Direktur' ELSE NULL END FROM checklist_templates;
*/

-- ============================================================ -- BAGIAN 10: VERIFICATION QUERIES -- ============================================================ -- Jalankan query di bawah untuk verifikasi setup berhasil

-- Cek semua tabel terbuat
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('events', 'trips', 'checklist_items', 'documents', 'checklist_templates');

-- Cek jumlah template checklist (harus 24)
SELECT category, COUNT(*) as total_items
FROM checklist_templates
GROUP BY category
ORDER BY category;

-- Cek indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('events', 'trips', 'checklist_items', 'documents');

-- ============================================================ -- SETUP SELESAI!
-- ============================================================ -- Next steps:
-- 1. Copy Project URL dan Service Role Key dari Supabase Dashboard 
-- 2. Paste ke Code.gs (variabel SUPABASE_URL dan SUPABASE_SERVICE_KEY) 
-- 3. Test koneksi dari GAS -- ============================================================ ```
