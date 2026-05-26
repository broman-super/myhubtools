# SUPERSUB Activity Tracker — Panduan Pengguna

Manual ini menjelaskan cara menggunakan sistem pelacakan aktivitas kerja SUPERSUB untuk karyawan dan supervisor (SPV).

**Zona waktu resmi:** WIB (GMT+7 / Asia-Jakarta)  
**Format jam:** 24 jam (`09:00`, `17:30`)

---

## 1. Memulai

### 1.1 Login
1. Buka halaman `Tracking.html` di browser.
2. Masukkan **nama pengguna** dan **password** sesuai data di sheet `Daftar_User`.
3. Klik **Masuk Sistem**.

Setelah login berhasil, Anda diarahkan ke tab **Input Aktivitas**.

### 1.2 Peran (Role)
| Role | Akses |
|------|--------|
| Karyawan (SMS, CSO, dll.) | Input aktivitas, riwayat pribadi, template, export CSV pribadi |
| SPV | Semua fitur karyawan + tab Beban Kerja Tim + Audit Evaluasi |

---

## 2. Input Aktivitas

### 2.1 Tanggal aktivitas (WIB)
- Gunakan **satu pemilih tanggal** di kanan atas bilah tab (label berubah per tab: *Tanggal Input*, *Periode Tim*, dll.).
- Pilih **Hari Ini**, **Kemarin**, atau tanggal di kalender.
- **Batas:** maksimal 30 hari ke belakang; tidak boleh tanggal masa depan.
- Badge **Target: YYYY-MM-DD (WIB)** menunjukkan tanggal yang akan disimpan ke kolom `Tanggal_Log`.

### 2.2 Mengisi form
| Field | Keterangan |
|-------|------------|
| Bidang Tugas / Divisi | Kategori pekerjaan |
| Tipe Tugas | Core, Support, Ad-hoc, Cross |
| Beban Kerja | Ringan / Sedang / Tinggi |
| Aktivitas Spesifik | Deskripsi teknis (wajib) |
| Waktu Mulai / Selesai | Picker jam analog; selesai harus setelah mulai |
| Output / Hasil | Hasil kerja (opsional) |

### 2.3 Submit
Klik **Submit Aktivitas**. Data tersimpan ke Google Sheets (`Log_Aktivitas`) dengan:
- **Tanggal_Log** = tanggal yang Anda pilih
- **Timestamp** = tanggal + jam mulai (WIB)

### 2.4 Ringkasan durasi harian
Di bawah tombol aksi cepat, kotak **Ringkasan durasi** menampilkan total jam kerja tercatat untuk tanggal aktivitas yang dipilih (mis. `7j 30m · 4 aktivitas`).

---

## 3. Fitur Cepat di Form Input

### 3.1 Salin dari Kemarin
- Klik **Salin dari Kemarin**.
- Sistem mengisi kategori, tipe, beban, deskripsi, dan output dari **aktivitas terakhir kemarin**.
- **Anda tetap harus** mengatur tanggal (jika bukan hari ini) dan waktu mulai/selesai, lalu submit.

### 3.2 Template aktivitas
1. Isi form seperti biasa.
2. Klik **+ Simpan Template** → beri nama (mis. "Rapat CSO pagi").
3. Pilih template dari dropdown **Template** untuk mengisi form (maks. 12 template, disimpan di browser Anda).

### 3.3 Export CSV (pribadi)
- Klik **Export CSV** di form input.
- File berisi aktivitas **Anda saja** sesuai periode filter di **Riwayat Aktivitas**.

---

## 4. Reminder jam 18:00 WIB

Jika sudah pukul **18:00 WIB** dan belum ada aktivitas tercatat untuk **hari ini**, sistem menampilkan peringatan sekali per hari.

- Reminder disimpan di browser (localStorage).
- Isi log sebelum akhir hari agar data evaluasi tim akurat.

---

## 5. Riwayat Aktivitas

1. Scroll ke bawah tab Input — riwayat **otomatis mengikuti tanggal input** di toolbar.
2. Perlu rentang lain (mis. 7 hari)? Klik **Rentang lain** di bagian riwayat.
3. Klik **Refresh** jika perlu.
4. **Edit** / **Hapus** hanya untuk data milik Anda sendiri.

---

## 6. Panduan SPV

### 6.1 Tab Beban Kerja Tim
- Pilih periode tanggal.
- Lihat KPI: tugas selesai, total jam, beban tertinggi, overlap per orang.
- Timeline visual per karyawan (08:00–18:00 WIB).

### 6.2 Tab Audit Evaluasi

#### System Audit Log (rekam jejak sistem)
Kartu ini **bukan** pemilih tanggal sendiri — mengikuti **Periode Laporan** di kanan atas.

**Langkah:**
1. Buka tab **Audit AI** (khusus SPV).
2. Klik pemilih tanggal kanan atas → label **Periode Laporan**.
3. Pilih preset (mis. **7 Hari**) atau rentang di kalender → klik **Set Date**.
4. Klik sub-tab **System Audit** — log terisi (koneksi, total aktivitas, overlap, dll.).
5. Jika kosong, klik **Muat ulang log**.

**Isi log:** status backend, periode aktif, jumlah entri, overlap per orang, overlap lintas user, misalignment, waktu pembaruan terakhir.

### 6.3 Metrik Analytics
| Metrik | Arti |
|--------|------|
| Beban Harian Divisi | Jam kerja per divisi; peringatan jika > 8 jam |
| Overlap (per user) | Dua aktivitas **satu orang** bersamaan — indikator multitasking |
| Job Misalignment | Tugas di luar spesialisasi role |
| **Overlap Lintas User** | Dua orang berbeda aktif di jam yang sama — **indikator beban paralel / menumpuk**, bukan error |

### 6.4 Export CSV (tim)
Di panel **Overlap Lintas User**, klik **Export CSV Periode** untuk unduh semua log tim dalam periode audit.

### 6.5 AI Auditor (opsional)
Masukkan Gemini API Key → **Gunakan AI Auditor** untuk ringkasan eksekutif otomatis.

---

## 7. Waktu & validasi

- **Waktu selesai** harus lebih lambat dari waktu mulai (picker mengunci opsi invalid).
- Semua perhitungan tanggal memakai **WIB**, bukan UTC browser.
- Overlap **tidak diblokir** — sengaja dipertahankan sebagai sinyal beban kerja.

---

## 8. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Submit gagal | Cek koneksi internet & URL di `assets/config.js` |
| Data tidak muncul di riwayat | Pastikan filter periode mencakup `Tanggal_Log` input |
| Tanggal salah 1 hari | Pastikan deploy backend terbaru (zona Asia/Jakarta) |
| Template hilang | Template di localStorage browser; jangan hapus data situs |
| Reminder tidak muncul | Sudah input hari ini, atau belum jam 18:00 WIB |
| System Audit Log kosong | Harus di tab **Audit AI** → pilih periode → **Set Date** → buka sub-tab **System Audit** |

---

## 9. Kontak & dukungan

Untuk penambahan user, ubah password, atau reset sheet, hubungi administrator sistem / SPV yang mengelola Google Spreadsheet backend.

*Versi panduan: V2 — selaras dengan kolom `Tanggal_Log` dan fitur bundle dashboard.*
