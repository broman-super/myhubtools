/* ============================================================
   DUMMY DATA "TAHAP LANJUT" — 6 EVENT, SELURUH SPEKTRUM PROGRESS
   ArchiveDoc / Rancangan SPPD (frame 5-seksi)
   ------------------------------------------------------------
   Asal: atas permintaan user ("dummy data yang lebih lanjut &
   bervariasi progress"). AMAN: file ini di _defects/, TIDAK
   menyentuh pages2.js / store.js live. Tempel ke layer data-mu
   bila ingin dipakai sebagai rujukan/uji.
   Konsisten dgn schema: events[], transports[], expenses[],
   sales[], sppd{}, approval{}. Angka contoh, bukan fakta.
   ============================================================ */

var DUMMY_LANJUT = {
  events: [
    /* ev-d1 DRAFT — hanya info event, belum SPPD (frame cetak: seksi 1 saja) */
    { id: 'ev-d1', nama: 'Workshop Kemasan Produk', lokasi: 'Bandung',
      tanggalMulai: '2026-07-21', tanggalSelesai: '2026-07-21',
      status: 'draft', danaAwal: 0, catatan: 'Draf — SPPD belum dibuat.' },

    /* ev-d2 DIAJUKAN — SPPD lengkap, personil ada, approval kosong */
    { id: 'ev-d2', nama: 'Survei Lokasi Booth Pameran', lokasi: 'Surabaya',
      tanggalMulai: '2026-08-04', tanggalSelesai: '2026-08-06',
      status: 'diajukan', danaAwal: 600000,
      sppdPersonil: [ { nama: 'Firman M.', weekday: 2, weekend: 1, penginapan: 919090 } ],
      approval: { makerNama: 'Firman M.', makerJabatan: 'Supervisor',
        makerTanggal: '2026-08-01', checkerNama: '', checkerJabatan: '',
        checkerTanggal: '', signerNama: '', signerJabatan: '', signerTanggal: '' } },

    /* ev-d3 BERJALAN — transport+expense+penjualan live, sebagian approval */
    { id: 'ev-d3', nama: 'Dukungan Booth Event Expo Jakarta', lokasi: 'Jakarta',
      tanggalMulai: '2026-09-11', tanggalSelesai: '2026-09-15',
      status: 'berjalan', danaAwal: 1500000, catatan: 'Penjualan live hari-1.',
      sppdPersonil: [ { nama: 'R.M Taqwa', weekday: 4, weekend: 1, penginapan: 906500 } ],
      approval: { makerNama: 'R.M Taqwa', makerJabatan: 'Supervisor',
        makerTanggal: '2026-09-09', checkerNama: 'Sunti', checkerJabatan: 'Head of HRD',
        checkerTanggal: '', signerNama: '', signerJabatan: '', signerTanggal: '' } },

    /* ev-d4 SIAP SETUJUI — semua rincian + personil + approval siap */
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

    /* ev-d5 DISETUJUI — maker+checker+signer lengkap */
    { id: 'ev-d5', nama: 'Pameran Produk Daerah', lokasi: 'Semarang',
      tanggalMulai: '2026-11-12', tanggalSelesai: '2026-11-17',
      status: 'disetujui', danaAwal: 2500000,
      sppdPersonil: [
        { nama: 'Firman M.', weekday: 6, weekend: 1, penginapan: 1814974 }
      ],
      approval: { makerNama: 'Firman M.', makerJabatan: 'Supervisor',
        makerTanggal: '2026-11-01', checkerNama: 'Taqwa', checkerJabatan: 'Head of HRD',
        checkerTanggal: '2026-11-02', signerNama: 'Kusna S.', signerJabatan: 'Direktur',
        signerTanggal: '2026-11-03' } },

    /* ev-d6 LUNAS — konsolidasi penuh, saldo akhir 0 */
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

  /* ---------- TRANSPORTASI ---------- */
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
      totalBiaya: 227500, detail: { jarakKm: 132000, tarifPerKm: 14 } },
    { id: 'tr-d5-1', eventId: 'ev-d5', leg: 'Berangkat', tanggal: '2026-11-12',
      mode: 'pesawat', ruteAsal: 'Jakarta', ruteTujuan: 'Semarang',
      totalBiaya: 1475000, detail: { jenis: 'Pesawat', noTiket: 'GA-1144' } },
    { id: 'tr-d6-1', eventId: 'ev-d6', leg: 'Berangkat', tanggal: '2026-12-01',
      mode: 'pesawat', ruteAsal: 'Jakarta', ruteTujuan: 'Denpasar',
      totalBiaya: 2100000, detail: { jenis: 'Pesawat', noTiket: 'GA-420' } }
  ],

  /* ---------- PENGELUARAN OPERASIONAL ---------- */
  expenses: [
    { id: 'ex-d2-1', eventId: 'ev-d2', kategori: 'Operasional',
      tanggal: '2026-08-05', deskripsi: 'Sewa lokasi survei', jumlah: 250000 },
    { id: 'ex-d3-1', eventId: 'ev-d3', kategori: 'Konsumsi',
      tanggal: '2026-09-11', deskripsi: 'Makan kru booth', jumlah: 190000 },
    { id: 'ex-d3-2', eventId: 'ev-d3', kategori: 'Operasional',
      tanggal: '2026-09-11', deskripsi: 'Sewa meja booth tambahan', jumlah: 250000 },
    { id: 'ex-d4-1', eventId: 'ev-d4', kategori: 'Operasional',
      tanggal: '2026-10-06', deskripsi: 'Material sampel vendor', jumlah: 85000 },
    { id: 'ex-d5-1', eventId: 'ev-d5', kategori: 'Publikasi',
      tanggal: '2026-11-12', deskripsi: 'Cetak banner booth', jumlah: 300000 },
    { id: 'ex-d6-1', eventId: 'ev-d6', kategori: 'Operasional',
      tanggal: '2026-12-01', deskripsi: 'Transportasi lokal antar-partner', jumlah: 120000 }
  ],

  /* ---------- PENJUALAN (beberapa live) ---------- */
  sales: [
    { id: 'sa-d3-1', eventId: 'ev-d3', productId: 'prd-1', tanggal: '2026-09-11',
      qty: 6, hargaSatuan: 150000, metode: 'QRIS', total: 900000 },
    { id: 'sa-d3-2', eventId: 'ev-d3', productId: 'prd-4', tanggal: '2026-09-12',
      qty: 20, hargaSatuan: 15000, metode: 'Cash', total: 900000 },
    { id: 'sa-d5-1', eventId: 'ev-d5', productId: 'prd-1', tanggal: '2026-11-13',
      qty: 12, hargaSatuan: 200000, metode: 'Transfer', total: 2400000 },
    { id: 'sa-d6-1', eventId: 'ev-d6', productId: 'prd-2', tanggal: '2026-12-02',
      qty: 8, hargaSatuan: 45000, metode: 'QRIS', total: 360000 }
  ]
};
/* @DUMMYLANJUT@ */
