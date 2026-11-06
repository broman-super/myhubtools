# Self Management — ReynaHub

Pengelolaan diri harian dalam satu tool: target harian, karya mingguan, jadwal, catatan, dan keuangan pribadi.

- **File:** `Productive/self-management/Index.html` (single-file, CSS + JS inline)
- **Backend:** belum ada — **semua data di `localStorage`** (key `reynahub-self-mgmt-v1`)
- **Status:** ✅ Stable (lokal perangkat, tanpa sinkronisasi) · diisi **data contoh** saat pertama dibuka
- **Visual:** mengikuti tampilan aplikasi acuan — latar `#eef2f6`, kartu putih, aksen indigo `#4f39f6`, radius besar, bayangan halus (lihat `design.md` Part VII)
- **Rute hub:** `#productive/self-management` · grup kartu `tim`
- **Topbar standalone:** "⤴ Kembali ke Hub" + "Buka versi final ↗" (buka `https://self-management-app-rho.vercel.app` di tab baru, `target="_blank"` + `rel="noopener noreferrer"`) + toggle tema. Di layar ≤480 px labelnya dipendekkan jadi "⤴ Hub".

---

## 1. Fitur

| Modul | Isi |
|---|---|
| **Ringkasan** | Salam + tanggal, kartu Target Harian (selesai/target), Karya Mingguan (persen pekan ini), Sisa Keuangan bulan ini, Total Tabungan, daftar tugas & jadwal hari ini |
| **Tugas Harian** | CRUD tugas (tanggal, kategori, prioritas, jam mulai–selesai, catatan), filter Hari ini / Minggu ini / Hari ini & ke depan / Semua, target harian yang bisa diubah, hapus massal tugas selesai |
| **Karya Mingguan** | Karya per kategori dengan target jumlah dan tombol +/− progres; terikat awal pekan (Senin) |
| **Jadwal** | Agenda bertanggal dengan jam mulai dan selesai, dikelompokkan per tanggal, hanya yang hari ini & ke depan |
| **Kalender** | Tampilan bulan (Senin–Minggu), sel berisi penanda `T<n>` jumlah tugas dan `J<n>` jumlah jadwal (hijau = semua tugas selesai), navigasi ‹ › bulan, tombol **Hari ini**, klik tanggal → daftar tugas & jadwal hari itu (checkbox tetap bisa menandai selesai) |
| **Catatan** | Catatan harian (tanggal, judul, isi) dengan edit dan hapus |
| **Keuangan** | Pemasukan per sumber, pengeluaran per kategori, tabungan (setor/tarik) ke beberapa target dengan progress bar; rekap pemasukan, pengeluaran, dan sisa bulan berjalan |

### 1.1 Footer & penjelasan web

- **Footer** (`footer.site-footer`, di akhir `.tool-main`): "© <tahun> Copyright Muhammad Alfathan" + tombol **Tentang web ini**. Tahun diambil otomatis lewat `initTahunFooter()`.
- **Popup penjelasan** (`#modal-tentang`): menjelaskan bahwa web dibangun untuk memperbaiki struktur dan sistem manajemen di **PT Elfiqa Karya Triangga**. Tutup lewat tombol X, tombol "Mengerti", klik latar, atau `Escape`; fokus kembali ke tombol pemicu setelah ditutup.
- Overlay memakai token `--overlay` (light `rgba(15,23,44,.55)`, dark `rgba(3,7,18,.7)`) — jangan tulis `rgba()` langsung di aturan CSS.

### 1.2 Data contoh, ekspor, impor (toolbar Ringkasan)

| Tombol | Perilaku |
|---|---|
| **Muat data contoh** | Mengganti seluruh data dengan `buatDataContoh()` (tugas, karya, jadwal, catatan, keuangan, tabungan). Selalu minta konfirmasi. |
| **Ekspor JSON** | Unduh `self-management-<tanggal>.json` berisi seluruh state. |
| **Impor JSON** | Baca berkas hasil ekspor, **validasi** (`object` + `Array.isArray(data.tugas)`), konfirmasi, baru ganti state. Berkas asing ditolak dengan `alert`, data lama utuh. |
| **Kosongkan data** | Kembali ke `buatStateAwal()` (kosong, bukan data contoh) setelah konfirmasi. |

Seed dijalankan hanya bila `localStorage` belum punya key ini (`perluSimpanAwal`), lalu langsung disimpan — jadi tidak menimpa data pengguna yang sudah ada.

---

## 2. Model data (`localStorage`)

```js
{
  targetHarian: 5,
  tugas:     [{ id, tanggal, judul, kategori, prioritas, mulai, selesai, catatan, done }],
  karya:     [{ id, pekan, kategori, judul, target, selesai }],   // pekan = tanggal Senin
  jadwal:    [{ id, tanggal, judul, mulai, selesai, kategori }],
  catatan:   [{ id, tanggal, judul, isi }],
  pemasukan: [{ id, tanggal, sumber, jumlah }],
  pengeluaran:[{ id, tanggal, kategori, jumlah, ket }],
  tabungan:  [{ id, tanggal, jenis: 'setor'|'tarik', targetId, jumlah }],
  targetTabungan: [{ id, nama, nominal }]                          // id tetap: goal-tabungan-umum
}
```

`tanggal` selalu `YYYY-MM-DD` lokal (bukan ISO UTC) supaya tidak bergeser sehari untuk WIB/WITA/WIT. Saldo tabungan **tidak disimpan** — dihitung ulang dari riwayat (`totalTabungan()`), jadi tidak bisa desync.

---

## 3. Aturan anti-bug

1. **Jangan menulis nilai tampilan ke state.** Persen, saldo, dan status dihitung di fungsi render.
2. **Urutan bridge tema:** pasang listener `SET_THEME` dulu, baru `postMessage({type:'request-theme'})`. Membalik urutan = tool tetap tema terang di hub gelap.
3. **`.is-embedded .topbar { display:none }`** wajib; tool ini punya topbar sendiri untuk mode standalone.
4. **Ubah data → `simpan()` → render.** Jangan render dari objek hasil salinan.
5. **`confirm()`/`prompt()`** dipakai untuk aksi hapus dan edit nominal cepat; jangan diganti modal tanpa menghapus jalur aksi lama.
6. **Target harian minimal 1** (dibatasi 1–50) supaya pembagian persen tidak `NaN`/`Infinity`.
7. **`karya.selesai` dijepit 0…target** saat +/− supaya bar tidak melewati 100%.
8. **Seed hanya saat kosong.** `muat()` mengembalikan `buatDataContoh()` **hanya** kalau key belum ada; jangan pindahkan seed ke `renderSemua()` atau ke `buatStateAwal()` — itu akan menghapus data pengguna tiap reload.
9. **Impor wajib validasi dulu**, baru konfirmasi, baru timpa. Jangan membalik urutan; berkas salah tidak boleh mengosongkan data.
10. **Warna aksen tool ini indigo, bukan merah merek.** Jangan menukar `--primary` kembali ke merah tanpa memperbarui `design.md` Part VII.
11. **Popup `#modal-tentang` wajib tetap bisa ditutup tiga cara** (X, Mengerti, Escape/backdrop). Jangan hapus `hidden` awal di markup — tanpa itu popup tampil saat halaman dibuka.
12. **Footer hanya milik tool ini**, bukan komponen hub; jangan ditambahkan ke `index.html` hub secara tidak sengaja.
13. **Kalender membaca `state.tugas` & `state.jadwal` langsung**, bukan salinan. `kalBulan`/`kalTerpilih` hanya state tampilan: jangan disimpan ke `localStorage`, dan jangan di-reset oleh `renderSemua()` — kalau di-reset, pilihan bulan pengguna kembali ke bulan berjalan setiap kali ada data disimpan.
14. **Sel kalender harus `<button>`** (bukan `div` + listener terpisah) supaya bisa diakses keyboard/Tab dan `aria-pressed` menandai tanggal terpilih.

---

## 4. Belum ada (rencana)

- Sinkronisasi database (Supabase/GAS) — saat ini murni perangkat sendiri.
- Peran pengguna/viewer dan autentikasi.
- Rekap mingguan/bulanan keuangan dalam bentuk grafik.
