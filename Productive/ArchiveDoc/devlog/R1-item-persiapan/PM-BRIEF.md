# R1 — Item Persiapan (non-produk) · PM-BRIEF

**Tujuan:** user butuh checklist untuk hal-hal persiapan yang BUKAN produk dagangan
(sewa hotel, sewa kendaraan, pembelian tiket, dst.) — lengkap dengan status per
item dan biaya, agar persiapan bisa dikelola sampai "siap".

**Target user:** PIC booth / tim event yang mempersiapkan acara lapangan.

**Cakupan R1:**
- CRUD item persiapan per event: nama, kategori, qty, biaya (estimasi), status.
  4 status: Belum dipesan / Dalam proses / Disetujui / Selesai.
- Tampil sebagai seksi bernomor 03 di tab **Persiapan** (setelah Produk, sebelum Jadwal).
- Stat: jumlah item, berapa yang siap (Selesai), total biaya tercatat.
- Chip "Persiapan siap" di hero Roadmap (muncul hanya jika ada item persiapan).

**Batas (di luar R1):** biaya persiapan belum masuk hitungan saldo kas/laporan
— itu wilayah R3 (sinkron ke laporan). Cross-check berangkat/pulang → R2.

**Kriteria sukses:**
1. Item bisa ditambah/hapus + ganti status tanpa reload rusak.
2. Tidak ada fungsi lama yang hilang (sbc rule #1).
3. Desain konsisten: seksi bernomor, kartu stat, token lama, tanpa emoji.
4. QA hijau: render, overflow mobile ≤ 0, tanpa console error.

**Status:** ✅ selesai → lanjut R2.