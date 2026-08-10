-- ============================================================
-- MIGRASI ANALYTIC WEBTOOL → SUPABASE — FASE 2 (FUNGSI SQL)
-- Jalankan SEMUA blok ini di SQL Editor Supabase.
-- Rekam logika: prosesData() di Productive/analytic/Analytic.html.
-- ============================================================

-- ---------- helper: label tanggal id-ID (mirror toLocaleDateString('id-ID',{day:'2-digit',month:'short'})) ----------
CREATE OR REPLACE FUNCTION fmt_label_id(d date) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(d, 'DD') || ' ' ||
    (ARRAY['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[extract(MONTH FROM d)::int];
$$;

-- ============================================================
-- 4.1 rekap_dashboard — READ (SECURITY INVOKER, RLS anon berlaku)
-- ============================================================
CREATE OR REPLACE FUNCTION rekap_dashboard(
  p_start        date,
  p_end          date,
  p_start_lalu   date,
  p_end_lalu     date,
  p_kat_filter   text DEFAULT 'ALL',
  p_pel_filter   text DEFAULT 'ALL'
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER AS $$
WITH
t AS (
  SELECT
    tr."Tanggal" AS d,
    lower(coalesce(tr."Tipe Transaksi", '')) AS tipe,
    coalesce(nullif(tr."Total Harga", 0), nullif(tr."Penjualan", 0), 0)::numeric AS nilai,
    coalesce(tr."Kuantitas", 0)::int AS qty,
    coalesce(nullif(upper(tr."Nama Kategori Pelanggan"), ''), 'UMUM') AS kat,
    coalesce(nullif(tr."Nama Pelanggan", ''), 'Tanpa Nama') AS pel,
    upper(trim(coalesce(tr."Nama Barang", ''))) AS prod,
    coalesce(pk."HPP", 0)::numeric AS hpp,
    coalesce(nullif(pk."Kode Series", ''), 'LAINNYA') AS seri
  FROM transaksi tr
  LEFT JOIN LATERAL (
    SELECT pr."HPP", pr."Kode Series"
    FROM produk pr
    WHERE upper(trim(pr."Nama Barang")) = upper(trim(tr."Nama Barang"))
    ORDER BY pr.id DESC LIMIT 1   -- katalog JS: baris terakhir yang menang
  ) pk ON true
),
tx AS (
  SELECT t.*,
    -- Klasifikasi terpadu (§4.2). is_batal = false: tabel transaksi TIDAK punya kolom Status.
    (t.tipe LIKE '%retur%' OR t.tipe LIKE '%kembali%') AS is_retur,
    (t.tipe LIKE '%faktur%' OR t.tipe LIKE '%penjualan%' OR t.tipe LIKE '%sales%'
     OR NOT (t.tipe LIKE '%retur%' OR t.tipe LIKE '%kembali%')) AS is_penjualan,
    -- passProductFilter (Analytic.html L2317-2319)
    (p_kat_filter = 'ALL' OR p_kat_filter IS NULL OR t.kat = p_kat_filter)
    AND (
      p_kat_filter IS NULL OR p_kat_filter = 'ALL'
      OR upper(p_kat_filter) NOT LIKE '%RESELLER%'
      OR p_pel_filter IS NULL OR p_pel_filter = 'ALL'
      OR t.pel = p_pel_filter
    ) AS pass
  FROM t
),
fp AS (  -- firstPurchaseData: min tanggal per pelanggan, global, tanpa 'Tanpa Nama'
  SELECT pel, min(d) AS fp_date
  FROM t
  WHERE pel <> 'Tanpa Nama'
  GROUP BY pel
),
kpi_s AS (  -- dSkrg
  SELECT
    coalesce(sum(nilai)        FILTER (WHERE NOT is_retur), 0) AS sales,
    coalesce(sum(abs(qty))     FILTER (WHERE NOT is_retur), 0) AS sales_qty,
    coalesce(sum(abs(nilai))   FILTER (WHERE is_retur), 0) AS retur,
    coalesce(sum(abs(qty))     FILTER (WHERE is_retur), 0) AS retur_qty,
    coalesce(count(*)          FILTER (WHERE NOT is_retur), 0)::bigint AS trx,
    coalesce(sum(CASE WHEN is_retur THEN -abs(hpp * qty) ELSE abs(hpp * qty) END), 0) AS cogs
  FROM tx WHERE d BETWEEN p_start AND p_end
),
kpi_l AS (  -- dLalu; trx DIKOSONGKAN (engine lama lupa increment lalu.trx → aovLalu selalu 0)
  SELECT
    coalesce(sum(nilai)      FILTER (WHERE NOT is_retur), 0) AS sales,
    coalesce(sum(abs(qty))   FILTER (WHERE NOT is_retur), 0) AS sales_qty,
    coalesce(sum(abs(nilai)) FILTER (WHERE is_retur), 0) AS retur,
    coalesce(sum(abs(qty))   FILTER (WHERE is_retur), 0) AS retur_qty,
    0::bigint AS trx,
    coalesce(sum(CASE WHEN is_retur THEN -abs(hpp * qty) ELSE abs(hpp * qty) END), 0) AS cogs
  FROM tx WHERE p_start_lalu IS NOT NULL AND d BETWEEN p_start_lalu AND p_end_lalu
),
skrg_trend AS (  -- rekapTren periode ini (sales & retur), entry ada bila ada baris
  SELECT (d - p_start) AS off,
    sum(nilai)      FILTER (WHERE NOT is_retur) AS sale,
    sum(abs(nilai)) FILTER (WHERE is_retur)     AS ret
  FROM tx WHERE d BETWEEN p_start AND p_end
  GROUP BY 1
),
lalu_trend AS (  -- rekapTren periode lalu (hanya sales; retur tidak masuk tren)
  SELECT (d - p_start_lalu) AS off,
    sum(nilai) FILTER (WHERE NOT is_retur) AS sale_lalu,
    count(*) AS cnt
  FROM tx WHERE p_start_lalu IS NOT NULL AND d BETWEEN p_start_lalu AND p_end_lalu
  GROUP BY 1
),
today_t AS (  -- blok statis: 'today' = realToday bila gEnd di bulan berjalan, else gEnd
  SELECT CASE WHEN date_trunc('month', p_end) = date_trunc('month', current_date)
              THEN current_date ELSE p_end END AS today
),
monthinfo AS (
  SELECT tt.today,
    extract(DAY FROM (date_trunc('month', tt.today) + interval '1 month - 1 day')::date)::int AS dim,
    extract(DAY FROM tt.today)::int AS today_day
  FROM today_t tt
),
static AS (  -- blok statis bulan berjalan (pakai klasifikasi terpadu, bukan Status lama)
  SELECT
    coalesce(sum(CASE WHEN date_trunc('month', x.d) = date_trunc('month', m.today)
                      THEN CASE WHEN x.is_retur THEN -abs(x.nilai) ELSE x.nilai END END), 0) AS sales,
    coalesce(sum(CASE WHEN date_trunc('month', x.d) = date_trunc('month', m.today)
                      THEN CASE WHEN x.is_retur THEN -abs(x.qty) ELSE abs(x.qty) END END), 0) AS qty,
    coalesce(sum(CASE WHEN date_trunc('month', x.d) = date_trunc('month', m.today) - interval '1 month'
                       AND (m.today_day = m.dim OR extract(DAY FROM x.d) <= m.today_day)
                       THEN CASE WHEN x.is_retur THEN -abs(x.qty) ELSE abs(x.qty) END END), 0) AS prev_qty,
    coalesce(max(extract(DAY FROM x.d)::int) FILTER (
      WHERE date_trunc('month', x.d) = date_trunc('month', m.today) AND x.d BETWEEN p_start AND m.today
    ), 1) AS max_date
  FROM tx x CROSS JOIN monthinfo m
),
biaya_s AS (SELECT coalesce(sum("Nominal"), 0) AS s FROM biaya WHERE "Tanggal" BETWEEN p_start AND p_end),
biaya_l AS (SELECT coalesce(sum("Nominal"), 0) AS s FROM biaya WHERE p_start_lalu IS NOT NULL AND "Tanggal" BETWEEN p_start_lalu AND p_end_lalu)
SELECT jsonb_build_object(
  'kpi', jsonb_build_object(
    'sales', ks.sales, 'salesQty', ks.sales_qty, 'retur', ks.retur, 'returQty', ks.retur_qty, 'trx', ks.trx, 'cogs', ks.cogs
  ),
  'kpiLalu', jsonb_build_object(
    'sales', kl.sales, 'salesQty', kl.sales_qty, 'retur', kl.retur, 'returQty', kl.retur_qty, 'trx', kl.trx, 'cogs', kl.cogs
  ),
  'net', jsonb_build_object(
    'netSales',      ks.sales - ks.retur,
    'netSalesLalu',  kl.sales - kl.retur,
    'grossProfit',   (ks.sales - ks.retur) - ks.cogs,
    'netProfit',     ((ks.sales - ks.retur) - ks.cogs) - bs.s,
    'netProfitLalu', ((kl.sales - kl.retur) - kl.cogs) - bl.s,
    'netMargin',     CASE WHEN ks.sales - ks.retur > 0
                          THEN (((ks.sales - ks.retur) - ks.cogs - bs.s) / (ks.sales - ks.retur)) * 100 ELSE 0 END,
    'opexRatio',     CASE WHEN ks.sales - ks.retur > 0
                          THEN (bs.s / (ks.sales - ks.retur)) * 100 ELSE 0 END,
    'runRate',       (ks.sales - ks.retur) / greatest(1, least(current_date, p_end) - p_start + 1) * greatest(1, p_end - p_start + 1),
    'dailyVelocity', (ks.sales - ks.retur) / greatest(1, least(current_date, p_end) - p_start + 1),
    'aovSkrg',       CASE WHEN ks.trx > 0 THEN (ks.sales - ks.retur) / ks.trx ELSE 0 END,
    'aovLalu',       CASE WHEN kl.sales - kl.retur > 0 AND kl.trx > 0 THEN (kl.sales - kl.retur) / kl.trx ELSE 0 END
  ),
  'staticMonthly', jsonb_build_object(
    'sales',   st.sales,
    'qty',     st.qty,
    'prevQty', st.prev_qty,
    'avg',     st.sales / greatest(st.max_date, m.today_day),
    'runRate', (st.sales / greatest(st.max_date, m.today_day)) * m.dim,
    'maxDate', st.max_date,
    'pembagi', greatest(st.max_date, m.today_day)
  ),
  'trend', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'label',     fmt_label_id(p_start + coalesce(s.off, l.off)),
      -- ponytail: labelLalu deterministik (ada bila tak ada data skrg di offset tsb).
      -- JS bisa meng-set labelLalu lebih awal bila baris lalu muncul duluan di sheet.
      'labelLalu', CASE WHEN s.off IS NULL THEN fmt_label_id(p_start_lalu + l.off) END,
      'sales',     coalesce(s.sale, 0),
      'retur',     coalesce(s.ret, 0),
      'salesLalu', coalesce(l.sale_lalu, 0),
      'ts',        coalesce(s.off, l.off)
    ) ORDER BY coalesce(s.off, l.off))
    FROM skrg_trend s FULL JOIN lalu_trend l ON l.off = s.off
  ), '[]'::jsonb),
  'kategori', coalesce((
    SELECT jsonb_object_agg(kat, v) FROM (
      SELECT kat, sum(CASE WHEN is_retur THEN -abs(nilai) ELSE nilai END) AS v
      FROM tx WHERE d BETWEEN p_start AND p_end GROUP BY kat
    ) g
  ), '{}'::jsonb),
  'kategoriLalu', coalesce((
    SELECT jsonb_object_agg(kat, v) FROM (
      SELECT kat, sum(CASE WHEN is_retur THEN -abs(nilai) ELSE nilai END) AS v
      FROM tx WHERE p_start_lalu IS NOT NULL AND d BETWEEN p_start_lalu AND p_end_lalu GROUP BY kat
    ) g
  ), '{}'::jsonb),
  'produkDetail', coalesce((
    SELECT jsonb_object_agg(prod, jsonb_build_object(
      'qty',      qty,
      'sales',    sales,
      'cogs',     cogs,
      'returQty', returQty,
      'returRp',  returRp
    )) FROM (
      SELECT prod,
        coalesce(sum(abs(qty)) FILTER (WHERE NOT is_retur), 0) AS qty,
        coalesce(sum(nilai)    FILTER (WHERE NOT is_retur), 0) AS sales,
        coalesce(sum(abs(hpp * qty)) FILTER (WHERE NOT is_retur), 0) AS cogs,
        coalesce(sum(abs(qty)) FILTER (WHERE is_retur), 0) AS returQty,
        coalesce(sum(abs(nilai)) FILTER (WHERE is_retur), 0) AS returRp
      FROM tx WHERE d BETWEEN p_start AND p_end AND pass GROUP BY prod
    ) g
  ), '{}'::jsonb),
  'trendProd', coalesce((
    SELECT jsonb_object_agg(prod, jsonb_build_object(
      'skrg', skrg,
      'lalu', lalu
    )) FROM (
      SELECT prod,
        coalesce(sum(qty) FILTER (WHERE d BETWEEN p_start AND p_end), 0) AS skrg,
        coalesce(sum(qty) FILTER (WHERE p_start_lalu IS NOT NULL AND d BETWEEN p_start_lalu AND p_end_lalu), 0) AS lalu
      FROM tx WHERE is_penjualan AND pass GROUP BY prod
    ) g
  ), '{}'::jsonb),
  'series', coalesce((
    SELECT jsonb_object_agg(k, v) FROM (
      SELECT
        CASE WHEN seri IS NOT NULL AND seri <> 'LAINNYA' THEN seri
             ELSE CASE
               WHEN prod LIKE 'S WP%' THEN 'S WP'
               WHEN prod LIKE 'SAG%' THEN 'SAG'
               WHEN prod LIKE 'STT%' THEN 'STT'
               WHEN prod LIKE 'STX%' THEN 'STX'
               WHEN prod LIKE 'STC%' THEN 'STC'
               WHEN prod LIKE 'SX%'  THEN 'SX'
               WHEN prod LIKE 'S%'   THEN 'S'
             END
        END AS k,
        sum(qty) AS v
      FROM tx WHERE is_penjualan AND d BETWEEN p_start AND p_end
      GROUP BY k
    ) x WHERE k IS NOT NULL
  ), '{}'::jsonb),
  'warna', coalesce((
    SELECT jsonb_object_agg(w, v) FROM (
      SELECT
        (SELECT u.w FROM unnest(regexp_split_to_array(tx.prod, '[[:space:]-]+')) AS u(w)
         WHERE u.w = ANY(ARRAY['HITAM','PUTIH','MERAH','BIRU','HIJAU','UNGU','ABU','KUNING','ORANGE','COKLAT','PINK','SILVER','GOLD','NAVY','MAROON','CREAM'])
         LIMIT 1) AS w,
        sum(qty) AS v
      FROM tx WHERE is_penjualan AND d BETWEEN p_start AND p_end
      GROUP BY w
    ) x WHERE w IS NOT NULL
  ), '{}'::jsonb),
  'reseller', coalesce((
    SELECT jsonb_object_agg(pel, v) FROM (
      SELECT pel, sum(nilai) AS v
      FROM tx WHERE NOT is_retur AND d BETWEEN p_start AND p_end AND kat LIKE '%RESELLER%' GROUP BY pel
    ) g
  ), '{}'::jsonb),
  'marketplace', coalesce((
    SELECT jsonb_object_agg(pel, v) FROM (
      SELECT pel, sum(nilai) AS v
      FROM tx WHERE NOT is_retur AND d BETWEEN p_start AND p_end AND kat NOT LIKE '%RESELLER%' GROUP BY pel
    ) g
  ), '{}'::jsonb),
  'kontributor', coalesce((
    SELECT jsonb_object_agg(pel, v) FROM (
      SELECT pel, sum(nilai) AS v
      FROM tx WHERE NOT is_retur AND d BETWEEN p_start AND p_end GROUP BY pel
    ) g
  ), '{}'::jsonb),
  'freq', coalesce((
    SELECT jsonb_object_agg(pel, cnt) FROM (
      SELECT pel, count(*) AS cnt
      FROM tx WHERE NOT is_retur AND d BETWEEN p_start AND p_end AND pel <> 'Tanpa Nama' GROUP BY pel
    ) f
  ), '{}'::jsonb),
  'lastOrder', coalesce((
    SELECT jsonb_object_agg(pel, to_char(maxd, 'YYYY-MM-DD')) FROM (
      SELECT pel, max(d) AS maxd
      FROM tx WHERE is_penjualan AND d BETWEEN p_start AND p_end GROUP BY pel
    ) g
  ), '{}'::jsonb),
  'firstPurchase', coalesce((
    SELECT jsonb_object_agg(pel, to_char(fp_date, 'YYYY-MM-DD')) FROM fp
  ), '{}'::jsonb),
  'omzetBaru', (
    SELECT coalesce(sum(CASE WHEN fp.fp_date IS NULL
                             OR (extract(YEAR FROM fp.fp_date) = extract(YEAR FROM tx.d)
                                 AND extract(MONTH FROM fp.fp_date) = extract(MONTH FROM tx.d))
                       THEN tx.nilai END), 0)
    FROM tx LEFT JOIN fp USING (pel)
    WHERE NOT tx.is_retur AND tx.d BETWEEN p_start AND p_end
  ),
  'omzetLama', (
    SELECT coalesce(sum(CASE WHEN fp.fp_date IS NOT NULL
                             AND NOT (extract(YEAR FROM fp.fp_date) = extract(YEAR FROM tx.d)
                                      AND extract(MONTH FROM fp.fp_date) = extract(MONTH FROM tx.d))
                       THEN tx.nilai END), 0)
    FROM tx LEFT JOIN fp USING (pel)
    WHERE NOT tx.is_retur AND tx.d BETWEEN p_start AND p_end
  ),
  'basket', (
    SELECT jsonb_build_object(
      'COUNT',             count(*)::bigint,
      'QTY',               coalesce(sum(qty), 0),
      'NOMINAL',           coalesce(sum(nominal), 0),
      'RESELLER_COUNT',    count(*) FILTER (WHERE is_reseller)::bigint,
      'RESELLER_NOMINAL',  coalesce(sum(nominal) FILTER (WHERE is_reseller), 0),
      'OTHER_COUNT',       count(*) FILTER (WHERE NOT is_reseller)::bigint,
      'OTHER_NOMINAL',     coalesce(sum(nominal) FILTER (WHERE NOT is_reseller), 0)
    )
    FROM (
      SELECT d, pel,
        sum(abs(qty)) AS qty,
        sum(nilai) AS nominal,
        bool_or(kat LIKE '%RESELLER%') AS is_reseller
      FROM tx WHERE NOT is_retur AND d BETWEEN p_start AND p_end
      GROUP BY d, pel
    ) b
  ),
  'biaya', coalesce((
    SELECT jsonb_object_agg(kb, v) FROM (
      SELECT upper(coalesce(nullif("Kategori Biaya", ''), 'Lain-lain')) AS kb, sum("Nominal") AS v
      FROM biaya WHERE "Tanggal" BETWEEN p_start AND p_end
      GROUP BY kb
    ) b
  ), '{}'::jsonb),
  'totalBiaya', bs.s,
  'totalBiayaLalu', bl.s,
  'target', coalesce((
    SELECT nullif("Value"::numeric, 0) FROM settings WHERE "Key" = 'Target' AND "Value" ~ '^[0-9]+(\.[0-9]+)?$' LIMIT 1
  ), 0),
  'rekapHari', (
    SELECT jsonb_build_object(
      'Minggu', coalesce(sum(nilai) FILTER (WHERE extract(DOW FROM d) = 0), 0),
      'Senin',  coalesce(sum(nilai) FILTER (WHERE extract(DOW FROM d) = 1), 0),
      'Selasa', coalesce(sum(nilai) FILTER (WHERE extract(DOW FROM d) = 2), 0),
      'Rabu',   coalesce(sum(nilai) FILTER (WHERE extract(DOW FROM d) = 3), 0),
      'Kamis',  coalesce(sum(nilai) FILTER (WHERE extract(DOW FROM d) = 4), 0),
      'Jumat',  coalesce(sum(nilai) FILTER (WHERE extract(DOW FROM d) = 5), 0),
      'Sabtu',  coalesce(sum(nilai) FILTER (WHERE extract(DOW FROM d) = 6), 0)
    )
    FROM tx WHERE NOT is_retur AND d BETWEEN p_start AND p_end
  )
)
FROM kpi_s ks, kpi_l kl, static st, monthinfo m, biaya_s bs, biaya_l bl;
$$;

GRANT EXECUTE ON FUNCTION rekap_dashboard(date, date, date, date, text, text) TO anon;

-- ============================================================
-- 4.4 bulk_upsert_transaksi — WRITE (SECURITY DEFINER, service_role)
-- dedupe_key TIDAK unique → upsert manual:
--   update baris dengan id terakhir ber-key sama; bila tak ada → insert.
--   skipped bila data identik (mirror perilaku sheet GAS).
-- SET-BASED (bukan loop baris-per-baris): 20rb baris di bawah 1 detik.
-- ============================================================
CREATE OR REPLACE FUNCTION bulk_upsert_transaksi(rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  added int := 0; updated int := 0; skipped int := 0; cnt bigint;
BEGIN
  IF jsonb_typeof(rows) <> 'array' THEN
    RAISE EXCEPTION 'rows harus berupa array JSON';
  END IF;

  -- Normalisasi sekali jalan, lalu buang baris invalid (key/tanggal kosong).
  CREATE TEMP TABLE _in ON COMMIT DROP AS
  SELECT
    nullif(x."dedupe_key", '') AS key,
    CASE
      WHEN x."Tanggal" ~ '^\d{4}-\d{2}-\d{2}'     THEN x."Tanggal"::date
      WHEN x."Tanggal" ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN to_date(x."Tanggal", 'DD/MM/YYYY')
      ELSE NULL END AS tgl,
    nullif(x."Nomor #", '') AS nom,
    nullif(x."Tipe Transaksi", '') AS tipe,
    nullif(x."Nama Pelanggan", '') AS pel,
    nullif(x."Nama Kategori Pelanggan", '') AS kat,
    nullif(x."Nama Barang", '') AS barang,
    CASE WHEN nullif(x."Kuantitas", '')   ~ '^[0-9]+$'   THEN x."Kuantitas"::int     ELSE NULL END AS qty,
    CASE WHEN nullif(x."Total Harga", '') ~ '^[0-9.-]+$' THEN x."Total Harga"::numeric ELSE NULL END AS hrg,
    CASE WHEN nullif(x."Penjualan", '')  ~ '^[0-9.-]+$' THEN x."Penjualan"::numeric  ELSE NULL END AS penjualan
  FROM jsonb_to_recordset(rows) AS x(
    "dedupe_key" text, "Tanggal" text, "Nomor #" text, "Tipe Transaksi" text,
    "Nama Pelanggan" text, "Nama Kategori Pelanggan" text, "Nama Barang" text,
    "Kuantitas" text, "Total Harga" text, "Penjualan" text);

  DELETE FROM _in WHERE key IS NULL OR tgl IS NULL;

  -- UPDATE hanya baris yang benar-benar berbeda (anti-wipe: payload kosong
  -- tidak menimpa nilai existing via COALESCE).
  WITH upd AS (
    UPDATE transaksi t SET
      "Tanggal" = COALESCE(i.tgl, t."Tanggal"),
      "Nomor #" = COALESCE(i.nom, t."Nomor #"),
      "Tipe Transaksi" = COALESCE(i.tipe, t."Tipe Transaksi"),
      "Nama Pelanggan" = COALESCE(i.pel, t."Nama Pelanggan"),
      "Nama Kategori Pelanggan" = COALESCE(i.kat, t."Nama Kategori Pelanggan"),
      "Nama Barang" = COALESCE(i.barang, t."Nama Barang"),
      "Kuantitas" = COALESCE(i.qty, t."Kuantitas"),
      "Total Harga" = COALESCE(i.hrg, t."Total Harga"),
      "Penjualan" = COALESCE(i.penjualan, t."Penjualan")
    FROM _in i
    WHERE t.dedupe_key = i.key
      AND t.id = (SELECT t2.id FROM transaksi t2 WHERE t2.dedupe_key = i.key ORDER BY t2.id DESC LIMIT 1)
      AND NOT (
        t."Tanggal" IS NOT DISTINCT FROM COALESCE(i.tgl, t."Tanggal")
        AND t."Nomor #" IS NOT DISTINCT FROM COALESCE(i.nom, t."Nomor #")
        AND t."Tipe Transaksi" IS NOT DISTINCT FROM COALESCE(i.tipe, t."Tipe Transaksi")
        AND t."Nama Pelanggan" IS NOT DISTINCT FROM COALESCE(i.pel, t."Nama Pelanggan")
        AND t."Nama Kategori Pelanggan" IS NOT DISTINCT FROM COALESCE(i.kat, t."Nama Kategori Pelanggan")
        AND t."Nama Barang" IS NOT DISTINCT FROM COALESCE(i.barang, t."Nama Barang")
        AND t."Kuantitas" IS NOT DISTINCT FROM COALESCE(i.qty, t."Kuantitas")
        AND t."Total Harga" IS NOT DISTINCT FROM COALESCE(i.hrg, t."Total Harga")
        AND t."Penjualan" IS NOT DISTINCT FROM COALESCE(i.penjualan, t."Penjualan")
      )
    RETURNING 1
  )
  SELECT count(*) INTO updated FROM upd;

  -- matched = jumlah key yang sudah ada di tabel
  SELECT count(*) INTO cnt FROM (SELECT DISTINCT t.dedupe_key FROM transaksi t JOIN _in i ON i.key = t.dedupe_key) s;
  skipped := cnt - updated;

  -- INSERT baris baru (key belum ada)
  WITH ins AS (
    INSERT INTO transaksi ("Tanggal", "Nomor #", "Tipe Transaksi", "Nama Pelanggan",
      "Nama Kategori Pelanggan", "Nama Barang", "Kuantitas", "Total Harga", "Penjualan", dedupe_key)
    SELECT i.tgl, i.nom, i.tipe, i.pel, i.kat, i.barang, i.qty, i.hrg, i.penjualan, i.key
    FROM _in i
    WHERE NOT EXISTS (SELECT 1 FROM transaksi t WHERE t.dedupe_key = i.key)
    RETURNING 1
  )
  SELECT count(*) INTO added FROM ins;

  RETURN jsonb_build_object('status', 'success', 'added', added, 'updated', updated, 'skipped', skipped);
END;
$$;

REVOKE EXECUTE ON FUNCTION bulk_upsert_transaksi(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bulk_upsert_transaksi(jsonb) TO service_role;

-- Akselerasi pencocokan dedupe_key (dipakai upsert & anti-duplikat)
CREATE INDEX IF NOT EXISTS idx_transaksi_dedupe_key_id ON transaksi(dedupe_key, id);

-- ============================================================
-- get_all_transaksi — READ semua baris (untuk preview upload &
-- sinkronisasi GAS). RETURN TYPE HARUS jsonb: PostgREST memotong
-- fungsi SETOF di ~1000 baris (Range header pun tak digubris),
-- sedangkan respons jsonb tunggal TIDAK dibatasi → jsonb_agg.
-- ============================================================
DROP FUNCTION IF EXISTS get_all_transaksi();
CREATE FUNCTION get_all_transaksi()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_agg(t ORDER BY id) FROM transaksi t;
$$;

REVOKE ALL ON FUNCTION get_all_transaksi() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_transaksi() TO anon, service_role;

-- ============================================================
-- VERIFIKASI (jalankan di SQL Editor setelah CREATE sukses)
-- SELECT rekap_dashboard('2026-07-01','2026-07-31','2026-06-01','2026-06-30','ALL','ALL');
-- SELECT jsonb_array_length(get_all_transaksi()); -- harus = count(*) transaksi
-- ============================================================
