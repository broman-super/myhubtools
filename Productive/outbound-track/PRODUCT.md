# Product — Scanner Gudang (Pendataan Paket)

<!-- impeccable:product-schema 1 -->

**Scope:** dokumen ini hanya untuk tool `#utilities/outbond` (`Productive/outbound-track/outbound-track.html`). `PRODUCT.md` di root tetap mengatur hub REYNAHUB dan Analytic/SAS.

## Platform

web

## Users

**Utama — operator gudang.** Bekerja berdiri di area sortir/packing, memakai **HP Android** dengan **scanner barcode** (Bluetooth atau kamera), sering satu tangan, dan memindai puluhan sampai ratusan paket beruntun per sesi/batch. Tugasnya: memastikan setiap paket keluar tercatat tepat satu kali, lalu menutup sesi di akhir.

**Sekunder — admin/supervisor.** Membuka riwayat sesi sebelumnya, memeriksa detail per sesi, dan mencetak surat jalan atau rekap untuk serah-terima ke ekspedisi.

Konfirmasi user: pengguna adalah operator gudang dengan HP Android yang memakai scanner. Peran admin/supervisor diambil dari fitur riwayat + print yang sudah ada (bukan dari pernyataan eksplisit).

## Product Purpose

Scanner Gudang mencatat paket keluar satu per satu dari barcode, mengelompokkannya otomatis per ekspedisi, dan menutup batch dengan rekap serta surat jalan. Produk ini ada supaya rekap kiriman harian tidak lagi ditulis ulang dari kertas atau spreadsheet.

Sukses = satu batch selesai tanpa resi dobel, jumlah per ekspedisi cocok dengan hitungan fisik, dan cetakan bisa langsung diserahkan ke kurir.

## Positioning

Alat scan satu layar milik operasi sendiri: tanpa instalasi aplikasi, tanpa lisensi per-seat, jalan di browser HP dan berbagi backend dengan tool hub lain (Supabase `outbond_paket`, tulis lewat GAS service_role).

Yang tidak bisa ditiru alat scan generik atau spreadsheet: **proteksi dobel berlapis** (memori sesi + riwayat database tanpa batas hari, dengan bunyi peringatan) dan **penyesuaian resi per perangkat** (kode pengenal dipotong dari depan/akhir sebelum disimpan) sehingga nomor yang masuk database sama dengan nomor yang dicetak.

## Operating Context

- Di gudang, di sela pekerjaan fisik; layar tersentuh cahaya terang dan tangan sibuk.
- Scanner bekerja seperti keyboard: karakter masuk ke kolom yang sedang fokus, diakhiri Enter. Karena itu kolom scan harus selalu siap tanpa klik.
- Satu sesi = satu batch kiriman. Ditutup lewat **Selesai** (terkonfirmasi) → tulis ke Supabase; sesudahnya memori sesi dikosongkan.
- Ekspedisi tidak dipilih manual: diturunkan dari prefiks resi (POS Indonesia `SHPE`, Shopee Express `SPX`, JNE `CM`/15 digit, ID Express `IDS`, J&T `JP/JX/JT/JY/JD`, SiCepat `00`, sisanya `Lainnya`).
- Beberapa ekspedisi mencetak kode pengenal pada barcode; kode itu dipotong di perangkat (setelan `localStorage` per HP), bukan di server.
- Print dua format: surat jalan A3 (semua atau per ekspedisi) dan rekap thermal 100×150 mm.
- Di-embed di hub REYNAHUB lewat iframe (tema disinkronkan) atau dibuka mandiri.
- Bahasa Indonesia, tema terang dan gelap.

## Capabilities and Constraints

**Kemampuan terkonfirmasi:** scan dengan fokus otomatis; hitungan langsung per ekspedisi dan total; penanda resi dobel di sesi (dengan bunyi) dan dobel di database tanpa batas hari; konfirmasi sebelum menyimpan (termasuk opsi lanjut meski dobel); setelan pengenal resi maks 5 karakter depan/akhir; daftar resi per ekspedisi dengan hapus satuan dan pencarian; riwayat sesi (dikelompokkan per `id_penginputan`, dipisah tanggal, bisa dicari, dipaginasi); detail per sesi; print A3 dan thermal; tema gelap.

**Batasan teknis:**
- Satu file HTML mandiri (CSS + JS inline), tanpa build step.
- Warna/radius/bayangan hanya dari token desain; tidak ada hex baru di tengah kode.
- Rute hash `#utilities/outbond` stabil; jangan hapus fungsi atau hash yang sudah ada.
- Tulis data hanya lewat satu pintu `simpanDataGudang` (POST `text/plain;charset=utf-8` ke GAS); baca riwayat langsung ke Supabase REST dengan anon key.
- Tabel `outbond_paket` tidak punya policy insert — write dari browser mustahil secara desain.

**Belum diputuskan:** apakah paket **masuk/retur** juga akan dicatat di tool ini (lihat catatan di bawah); apakah data dipakai sebagai dasar penagihan/klaim ke klien; siapa selain operator yang boleh menghapus resi dari sesi.

Catatan keputusan arah: user mendelegasikan pilihan ("pilih opsi terbaik"), dan yang dipilih adalah **hanya paket keluar (pengiriman)** — cocok dengan judul layar "Surat Jalan Pengiriman" dan nama rute `outbond`. Ini keputusan yang bisa diubah bila operasi ternyata juga mencatat paket masuk.

## Brand Commitments

- Nama di dalam tool: **Scanner Gudang**. Nama di kartu hub: **Pendataan Paket** (grup Operasional & Logistik).
- Bagian dari REYNAHUB (`reynahub.web.id`); wajib terasa satu keluarga: satu navbar pola hub, token warna yang sama, Plus Jakarta Sans untuk teks kerja.
- Bahasa Indonesia, nada operasional dan singkat; istilah yang dipakai operator: resi, ekspedisi, sesi, dobel, pengenal.

## Evidence on Hand

- Data nyata tabel `outbond_paket` (riwayat sesi bertanggal, ribuan baris) — terbaca langsung saat pengujian; jangan mengarang angka, nama klien, atau testimoni.
- Backend: `gas/outbound-track.gs`; skema: `Productive/outbound-track/migrasi_supabase.sql`.
- Aturan anti-regresi dan riwayat bug nyata: `Productive/outbound-track/README.md` §3.
- Tidak ada testimoni, benchmark, pricing, atau logo pelanggan. Tidak ada aset merek khusus tool ini.

## Product Principles

1. **Satu paket, satu baris.** Proteksi dobel lebih penting daripada kenyamanan menambah; jangan pernah menyelesaikan konflik dobel dengan diam-diam.
2. **Scan tanpa menyentuh layar.** Setiap klik tambahan adalah kesalahan operator; fokus, Enter, dan umpan balik suara bekerja sendiri.
3. **Angka harus bisa dipertanggungjawabkan.** Hitungan per ekspedisi, total, dan cetakan adalah bukti serah-terima; jangan menampilkan angka yang tidak berasal dari data.
4. **Jangan mengubah nomor resi diam-diam.** Pemotongan pengenal selalu terlihat (baris info) dan bisa dimatikan dari HP itu.
5. **Satu keluarga dengan hub.** Tool ini hanya "selesai" kalau navbar, tema, token, dan bahasanya konsisten dengan tool REYNAHUB lain.

## Accessibility & Inclusion

Dipakai sambil berdiri, satu tangan, di bawah cahaya gudang dan kadang dengan sarung tangan: target sentuh harus besar, teks nomor resi harus terbaca jelas, status penting tidak boleh bergantung pada warna saja (dobel punya badge teks + bunyi), dan setiap keadaan (kosong, memuat, gagal simpan, offline) menyebut apa yang terjadi dan langkah berikutnya.
