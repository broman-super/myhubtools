/* ============================================================
   DUMMY DATA TAHAP LANJUT — 6 event, seluruh spektrum progress
   ArchiveDoc / SPPD — konsisten dgn store seed & Rancangan SPPD.md 5-seksi
   ------------------------------------------------------------------
   Cara pakai (AMAN — tempel manual, jangan edit live pages2.js):
     1. Buka file data/seed app (store.js bagian `events:` / `data(){}`).
     2. Salin seluruh isi file ini ke bagian data dummy.
     3. Setiap seksi yang TIDAK terisi pada sebuah event → di cetak
        frame-5 otomatis DISEMBUNYIKAN (anti-fabrikasi, anti-mojibake).
   Seluruh angka = contoh; TIDAK men-duplikasi id nyata (pakai akhiran
   "-d" = dummy) sehingga tidak menimpa data pengguna.
   Marker akhir: @DUMMYPLURAL@
   ============================================================ */

/* PETA TAHAP (untuk konsistensi & verifikasi):
   ev-d1  DRAFT        : tanpa SPPD, hanya info event          -> seksi 1 saja
   ev-d2  DIAJUKAN     : SPPD lengkap, personil ada, approval kosong
   ev-d3  BERJALAN     : transport+expense sebagian, sales live
   ev-d4  SIAP-SETUJUI : semua rincian + personil + approval siap
   ev-d5  DISETUJUI    : maker+checker+signer (tanggal TTD terisi)
   ev-d6  SELESAI/LUNAS: konsolidasi penuh, saldo akhir 0        -> ALL 5 seksi
*/

var DUMMY_PROGRESS = {
  /* ---------- 6 EVENT ---------- */
  events: [
    { id: 'ev-d1', nama: 'Workshop Kemasan Produk', lokasi: 'Bandung',
      tanggalMulai: '2026-07-21', tanggalSelesai: '2026-07-21',
      status: 'draft', danaAwal: 0, catatan: 'Draf — SPPD belum dibuat.' },
    { id: 'ev-d2', nama: 'Survei Lokasi Booth Pameran', lokasi: 'Surabaya',
      tanggalMulai: '2026-08-04', tanggalSelesai: '2026-08-06',
      status: 'diajukan', danaAwal: 600000,
      sppdPersonil: [
        { nama: 'Firman M.', weekday: 2, weekend: 1, penginapan: 919090 }
      ],
      approval: { makerNama: 'Firman M.', makerJabatan: 'Supervisor',
        makerTanggal: '2026-08-01', checkerNama: '', checkerJabatan: '',
        checkerTanggal: '', signerNama: '', signerJabatan: '', signerTanggal: '' } },
    { id: 'ev-d3', nama: 'Dukungan Booth Event Expo Jakarta', lokasi: 'Jakarta',
      tanggalMulai: '2026-09-11', tanggalSelesai: '2026-09-15',
      status: 'berjalan', danaAwal: 1500000, catatan: 'Penjualan live 3 hari.',
      sppdPersonil: [
        { nama: 'R.M Taqwa', weekday: 4, weekend: 1, penginapan: 906500 }
      ],
      approval: { makerNama: 'R.M Taqwa', makerJabatan: 'Staf Marketing',
        makerTanggal: '2026-09-05', checkerNama: '', checkerJabatan: '',
        checkerTanggal: '', signerNama: '', signerJabatan: '', signerTanggal: '' } },
    { id: 'ev-d4', nama: 'Kunjungan Vendor Bahan Baku', lokasi: 'Yogyakarta',
      tanggalMulai: '2026-10-06', tanggalSelesai: '2026-10-08',
      status: 'siap_setujui', danaAwal: 700000,
      sppdPersonil: [
        { nama: 'Sari P.', weekday: 3, weekend: 0, penginapan: 0 },
        { nama: 'Budi H.', weekday: 3, weekend: 0, penginapan: 729522 }
      ],
      approval: { makerNama: 'Sari P.', makerJabatan: 'Purchasing',
        makerTanggal: '2026-10-01', checkerNama: 'Taqwa', checkerJabatan: 'Head of HRD',
        checkerTanggal: '2026-10-02', signerNama: '', signerJabatan: '',
        signerTanggal: '' } },
    { id: 'ev-d5', nama: 'Pameran Produk Daerah', lokasi: 'Semarang',
      tanggalMulai: '2026-11-12', tanggalSelesai: '2026-11-17',
      status: 'disetujui', danaAwal: 2500000,
      sppdPersonil: [
        { nama: 'Firman M.', weekday: 6, weekend: wash_day, penginapan: 1814974 }
      ],
      approval: { makerNama: 'Firman M.', makerJabatan: 'Supervisor',
        makerTanggal: '2026-11-01', checkerNama: 'Taqwa', checkerJabatan: 'Head of HRD',
        checkerTanggal: '2026-11-02', signerNama: 'Kusna S.', signerJabatan: 'Direktur',
        signerTanggal: '2026-11-03' } },
    { id: 'ev-d6', nama: 'Pengembangan Mitra Distributor', lokasi: 'Bali',
      tanggalMulai: '2026-12-01', tanggalSelesai: '2026-12-05',
      status: 'selesai', danaAwal: 900000, catatan: 'Sudah lunas / saldo 0.',
      sppdPersonil: [
        { nama: 'Budi H.', weekday: 5, weekend: 1, penginapan: 719795 }
      ],
      approval: { makerNama: 'Budi H.', makerJabatan: 'Key Account',
        makerTanggal: '2026-11-25', checkerNama: 'Taqwa', checkerJabatan: 'Head of HRD',
        checkerTanggal: '2026-11-27', signerNama: 'Kusna S.', signerJabatan: 'Direktur',
        signerTanggal: '2026-11-28' } }
  ],

  /* ---------- TRANSPORTASI (per event; beberapa leg) ---------- */
  transports: [
    { id: 'tr-d2-1', eventId: 'ev-d2', leg: 'Berangkat', tanggal: '2026-08-04',
      mode: 'umum', ruteAsal: 'Jakarta', ruteTujuan: 'Surabaya',
      totalBiaya: 350000, detail: { jenis: 'Kereta', noTiket: 'KTR-882' } },
    { id: 'tr-d2-2', eventId: 'ev-d2', leg: 'Pulang', tanggal: '2026-08-06',
      mode: 'umum', ruteAsal: 'Surabaya', ruteTujuan: 'Jakarta',
      totalBiaya: 350000, detail: { jenis: 'Kereta', noTiket: 'KTR-994' } },
    { id: 'tr-d3-1', eventId: 'ev-d3', leg: 'Berangkat', tanggal: '2026-09-11',
      mode: 'umum', ruteAsal: 'Jakarta', ruteTujuan: 'Jakarta',
      totalBiaya: 85000, detail: { jenis: 'Taksi', noTiket: '' } },
    { id: 'tr-d4-1', eventId: 'ev-d4', leg: 'Berangkat', tanggal: '2026-10-06',
      mode: 'pribadi', ruteAsal: 'Jogja', ruteTujuan: 'Kulon Progo',
      totalBiaya: 227500, detail: { jarakKm: 132000, tarifPerKm: 13.45 } },
    { id: 'tr-d5-1', eventId: 'ev-d5', leg: 'Berangkat', tanggal: '2026-11-12',
      mode: 'pesawat', ruteAsal: 'Jakarta', ruteTujuan: 'Semarang',
      totalBiaya: 980000, detail: { jenis: 'Pesawat', noTiket: 'GA-1144' } },
    { id: 'tr-d4-2', eventId: 'ev-d4', leg: 'Pulang', tanggal: '2026-10-08',
      mode: 'pribadi', ruteAsal: 'Kulon Progo', ruteTujuan: 'Jogja',
      totalBiaya: 27500, detail: { jarakKm: 132000, tarifPerKm: 13.45 } }
  ],

  /* ---------- PENJUALAN (beberapa event, sebagian kosong) ---------- */
  sales: [
    { id: 'sa-d3-1', eventId: 'ev-d3', productId: 'prd-1', tanggal: '2026-09-11',
      qty: 6, hargaSatuan: 150000, metode: 'QRIS', total: 900000 },
    { id: 'sa-d3-2', eventId: 'ev-d3', productId: 'prd-4', tanggal: '2026-09-12',
      qty: 20, hargaSatuan: 15000, metode: 'Cash', total: 300000 },
    { id: 'sa-d5-1', eventId: 'ev-d5', productId: 'prd-1', tanggal: '2026-11-13',
      qty: 12, hargaSatuan: 150000, metode: 'Transfer', total: 1800000 },
    { id: 'sa-d6-1', eventId: 'ev-d6', productId: 'prd-740', tanggal: '2026-12-02',
      qty: 20, hargaSatuan: 9000, metode: 'Cash', total: 180000 }
  ],

  /* ---------- PENGELUARAN OPERASIONAL (Lain-lain) ---------- */
  expenses: [
    { id: 'ex-d3-1', eventId: 'ev-d3', kategori: 'Operasional',
      tanggal: '2026-09-11', deskripsi: 'Sewa meja booth tambahan', jumlah: 250000 },
    { id: 'ex-d3-2', eventId: 'ev-d3', kategori: 'Konsumsi',
      tanggal: '2026-09-11', deskripsi: 'Makan kru booth', jumlah: 190000 },
    { id: 'ex-d4-1', eventId: 'ev-d4', kategori: 'Operasional',
      tanggal: '2026-10-06', deskripsi: 'Material sampel vendor', jumlah: 85000 },
    { id: 'ex-d5-1', eventId: 'ev-d5', kategori: 'Publikasi',
      tanggal: '2026-11-12', deskripsi: 'Cetak banner booth', jumlah: 300000 },
    { id: 'ex-d6-1', eventId: 'ev-d6', kategori: 'Operasional',
      tanggal: '2026-12-01', deskripsi: 'Transportasi lokal antar-mitra', jumlah: 120000 }
  ],

  /* ---------- SPPD / SPPD DETAIL per event (object sppd yang dipakai financeSummary) ---------- */
  sppd: {
    'ev-d1': null,
    'ev-d2': { noSurat: '001/SPPD/08/2026', pemberiTugas: 'Direktur',
      departemen: 'SUPERSUB', tujuan: 'Surabaya', kegiatan: 'Survei lokasi booth pameran',
      moda: 'Kereta Api', tanggalBerangkat: '2026-08-04', jamBerangkat: '06.00',
      tanggalKembali: '2026-08-06', jamKembali: '18.00', danaAwal: 600000 },
    'ev-d3': { noSurat: '002/SPPD/09/2026', pemberiTugas: 'Direktur',
      departemen: 'SUPERSUB', tujuan: 'Jakarta', kegiatan: 'Dukungan booth event expo',
      moda: 'Transportasi Umum', tanggalBerangkat: '2026-09-11', jamBerangkat: '05.00',
      tanggalKembali: '2026-09-15', jamKembali: '21.00', danaAwal: 1500000 },
    'ev-d4': { noSurat: '003/SPPD/10/2026', pemberiTugas: 'Direktur',
      departemen: 'PROCUREMENT', tujuan: 'Yogyakarta', kegiatan: 'Kunjungan vendor bahan baku',
      moda: 'Kendaraan Pribadi', tanggalBerangkat: '2026-10-06', jamBerangkat: '07.30',
      tanggalKembali: '2026-10-08', jamKembali: '16.45', danaAwal: 700000 },
    'ev-d5': { noSurat: '004/SPPD/11/2026', pemberiTugas: 'Direktur',
      departemen: 'SUPERSUB', tujuan: 'Semarang', kegiatan: 'Pameran produk daerah',
      moda: 'Pesawat Terbang', tanggalBerangkat: '2026-11-12', jamBerangkat: '08.00',
      tanggalKembali: '2026-11-17', jamKembali: '20.30', danaAwal: 2500000 },
    'ev-d6': { noSurat: '005/SPPD/12/2026', pemberiTugas: 'Direktur',
      departemen: 'BUSINESS DEV', tujuan: 'Bali', kegiatan: 'Pengembangan mitra distributor',
      moda: 'Pesawat Terbang', tanggalBerangkat: '2026-12-01', jamBerangkat: '09.15',
      tanggalKembali: '2026-12-05', jamKembali: '19.00', danaAwal: 900000 }
  },

  /* settings contoh — DIBAWA oleh printHTML frame-5 (live, bukan fabrikasi) */
  settings: { nama: 'PT. ELFIQA KARYA TRIANGGA', instansi: 'SUPERSUB' }
};

/* @DUMMYPLURAL@ */
