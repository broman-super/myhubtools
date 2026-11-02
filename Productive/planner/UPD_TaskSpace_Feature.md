# UPD TaskSpace — Optimasi & Fitur Baru

Dokumen usulan (bukan kode final). Semua rujukan baris mengacu ke kondisi repo saat dokumen dibuat:
`Productive/planner/taskschedule.html` (5.352 baris) dan `gas/code-taskschedule.gs` (332 baris).

---

## 1. Diagnosis: kenapa terasa kurang

Keluhan "bingung harus isi apa" dan "butuh task berulang seperti campaign" bukan dua masalah terpisah. Akarnya satu: **TaskSpace menyimpan semua hal sebagai `task` datar**, sehingga tidak ada yang memberi tahu apa yang memang rutin, apa yang dadakan, dan apa yang harus dikerjakan hari ini.

| # | Akar masalah | Bukti di kode |
|---|---|---|
| A1 | Tidak ada konsep **kelompok tugas**. Semua task setara; rutin dan dadakan bercampur di satu daftar. | `renderList()` `:3182` hanya memfilter `pending/done/all` + tag + prioritas. State `S` `:2433` tidak punya dimensi grup. |
| A2 | **"Ulangi" bukan rutin.** Ia menyalin salinan fisik sekali, berhenti di akhir bulan tanggal mulai, tidak bisa "setiap Senin & Kamis", tidak bisa "sampai 31 Des", tidak bisa "10 kali". | `computeRepeats_` `:4702` (`until` = akhir bulan), hint form `:2282`, `repeatCalendarItem_` `:4943`. |
| A3 | Tidak ada **daftar rutinitas** yang berdiri sendiri. Menghapus satu kemunculan tidak mengubah jadwal; mengubah jam rutin = edit N baris manual. | Tidak ada sheet/entitas `Routine`; `mapTypeToSheet_` GAS hanya `Tasks/Events/Reminders`. |
| A4 | Tidak ada **pemicu "kerjakan apa sekarang"**. Buka tool → daftar panjang, bukan 3 hal prioritas. | `renderList()` default tampil semua `pending`; panel detail `:4650` hanya info item terpilih. |
| A5 | Tidak ada **pelacakan kepatuhan**. Rutin yang selalu terlewat tetap muncul selamanya → daftar membengkak, orang berhenti percaya tool. | `updateStats()` `:3114` hanya progress/pending/campaign. |

---

## 2. Prinsip desain (supaya tidak jadi dua sistem yang bertabrakan)

1. **Satu dimensi grup, bukan tipe baru.** `type` tetap `task | campaign | event | reminder` (dipakai print, share, kalender). Kelompok ditambah sebagai **kolom `grup`** pada task, bukan `type` baru — kalau dijadikan `type`, `renderList()` `:3184` (`t.type === 'campaign'`), `isCampaignRow_` GAS, dan print akan ikut rusak.
2. **Rutin = template + salinan.** Jadwal hidup di sheet `Routines`; yang tampil di kalender tetap baris `Tasks` biasa. Konsekuensi bagus: kalender, timeline, print, drag-reorder, share **tidak perlu diubah sama sekali**.
3. **Materialisasi idempoten.** Salinan punya kunci unik `rutin_id + tanggal`. Server menolak kunci ganda → aman dijalankan berkali-kali, aman dibuka di dua perangkat.
4. **Data lama tidak dimigrasi paksa.** Task tanpa `grup` dianggap `dadakan` saat render (derived), tidak ditulis ulang ke sheet.
5. **Jangan hapus yang ada.** Fitur "Ulangi" lama tetap hidup untuk kompatibilitas; mesin rutin baru berdiri sendiri dengan fungsi berbeda.

---

## 3. Model data

### 3.1 Kolom baru di sheet `Tasks`

| Kolom | Isi | Catatan |
|---|---|---|
| `Grup` | `rutin` / `dadakan` / `proyek` | kosong pada data lama = `dadakan` |
| `RutinId` | id rutin asal | kosong untuk task manual |
| `Kunci` | `RUTINID\|YYYY-MM-DD` | kunci anti-dobel materialisasi |

### 3.2 Sheet baru `Routines`

| Kolom | Isi |
|---|---|
| `ID` | `R` + uuid pendek |
| `Nama` | judul task |
| `Grup` | `rutin` (default) |
| `Frekuensi` | `harian` \| `mingguan` \| `bulanan` |
| `Hari` | mingguan: `1,3,5` (0=Min … 6=Sab); bulanan: `tgl:25` atau `nth:1,5` (Jumat pertama) |
| `Interval` | tiap N (default 1) |
| `Mulai` | `YYYY-MM-DD` |
| `Sampai` | `YYYY-MM-DD` atau kosong |
| `Jumlah` | batas N kemunculan, atau kosong |
| `Prioritas` / `Tag` / `Deskripsi` / `Subtasks` / `Warna` | default yang disalin ke setiap salinan |
| `Aktif` | `TRUE/FALSE` |
| `TerakhirGenerate` | tanggal terakhir materialisasi (audit, bukan penentu) |

Kolom `Subtasks` ditulis sebagai JSON string — sama seperti pola yang sudah ada di `Tasks` (`parseSubs_` `:2538`).

---

## 4. Usulan fitur (berurut dampak → usaha)

### F1 — Grup: Rutin / Dadakan / Proyek ★ dampak tinggi, usaha kecil

**Masalah:** A1. **Solusi:**
- Chip filter di atas daftar: `Semua · Rutin · Dadakan · Proyek`, disimpan di `S.activeGroups` (pola sama dengan `S.activeTags` `:2441`).
- Badge kecil di baris task: `RUTIN` / `DADAKAN` (warna token, bukan hex baru).
- Kartu statistik ke-4: jumlah rutin tertunda hari ini.
- Di form, pilihan grup (3 tombol, default `dadakan` untuk quick add, `rutin` bila dibuat dari template rutin).

**File:** `taskschedule.html` (`renderList` `:3182`, `openTaskModal` `:4262`, `submitTask` `:4769`) + auto-buat kolom di GAS `saveCalendarItem_` (pola persis blok `Urutan`/`Subtasks` di `code-taskschedule.gs:250–272`).

**Risiko:** `applyCalendarResult_` `:2586` harus memetakan `grup`/`rutin_id`/`kunci`, kalau tidak nilainya hilang setelah refresh. Cache `ts_cache_data_v2` perlu naik ke `v3` agar cache lama tidak membuat semua task tampak `dadakan`.

---

### F2 — Rutinitas berulang (inti permintaan) ★ dampak tinggi, usaha sedang

**Masalah:** A2 + A3. **Solusi:** menu baru **Rutinitas** (nav ke-7, view `#view-routine`) berisi daftar template + tombol `+ Rutinitas`.

Form rutin:
- Nama, grup, prioritas, tag, deskripsi, subtask.
- Frekuensi: **Harian** (tiap N hari) · **Mingguan** (pilih hari: Sen Sel Rab Kam Jum Sab Min, boleh >1) · **Bulanan** (tanggal ke-N, atau hari ke-N dalam bulan, mis. "Jumat pertama").
- Berakhir: `sampai tanggal` **atau** `setelah N kali` **atau** `selamanya`.
- Pratinjau: "Berikutnya: Sen 3 Nov, Kam 6 Nov, Sen 10 Nov … (12 dalam 30 hari)".

Mesin jadwal: fungsi baru `hitungJadwalRutin_(rule, dari, sampai)` yang **berdiri sendiri** — jangan mengubah `computeRepeats_` `:4702` (dipakai fitur Ulangi lama). Bentuk `rule`: `{freq, interval, hari:[1,3], bulanTgl, bulanNth, mulai, sampai, jumlah}`.

Materialisasi:
- Dipicu saat tool dibuka / `refreshData()` `:2705` / setelah simpan rutin.
- Horizon **30 hari ke depan** (cukup untuk kalender + timeline tanpa membanjiri sheet).
- Hanya membuat yang belum ada, berdasarkan `Kunci` dari task yang sudah dimuat.
- Dikirim lewat `saveTasksBatch` yang sudah ada (`:4952`) → **tidak perlu action baru**.
- Di server, `saveTasksBatch_` (GAS `:57`) melewati item yang `Kunci`-nya sudah ada di sheet (baca kolom Kunci sekali, bukan per item).
- Mode share (`SHARE` `:2406`) **wajib** skip materialisasi: viewer hanya baca.

Operasi rutin:
- `Jeda` (Aktif=FALSE) → kemunculan yang belum lewat dihapus, riwayat tetap.
- `Ubah` → hanya memengaruhi kemunculan **hari ini ke depan**; salinan lampau tidak disentuh.
- `Hapus` → hapus template; tanya "hapus juga jadwal yang belum lewat?" (default: ya, hanya yang belum lewat).

**Backend baru:** action `getRoutines`, `saveRoutine`, `deleteRoutine` di `doPost` GAS (pola token `requireToken_` wajib ikut), sheet `Routines` dibuat otomatis (`createRoutinesSheet_`). **Ini butuh 1 versi deployment GAS baru** — URL `/exec` tetap sama, hanya versi deployment yang di-perbarui.

---

### F3 — Quick capture + panel "Hari Ini" ★ dampak tinggi, usaha kecil

**Masalah:** A4 (dan sebagian A1: "bingung isi apa").

- **Quick add** satu baris di atas daftar: ketik apa saja → Enter = task **hari ini, grup dadakan, prioritas sedang**. `Ctrl+Enter` membuka form lengkap. Tanpa modal, tanpa wajib tanggal.
- **Panel "Hari Ini"** di atas daftar (bukan view baru): 3 baris teratas = (a) rutin yang jatuh tempo hari ini, (b) task bertanggal hari ini, (c) task overdue. Tombol `Fokus 3` menyembunyikan sisanya sampai besok (`S.fokusHariIni`).
- Tombol `Isi cepat` di modal: daftar preset judul siap pakai (lihat F5).

**File:** `taskschedule.html` saja (markup di dekat `:2014`, logika di sekitar `renderList`/`updateStats`). Tanpa backend.

---

### F4 — Reminder yang benar-benar mengingatkan ★ dampak sedang, usaha sedang

**Masalah:** saat ini `Reminders` hanya baris data; tidak ada notifikasi.

- **Dalam aplikasi:** banner "Jatuh tempo hari ini (N)" saat halaman dibuka, plus badge di nav Reminder (pola `nav-count-reminder` `:3136`).
- **Notifikasi browser:** `Notification.requestPermission()` dipicu user menekan tombol "Aktifkan pengingat" (bukan otomatis — Chrome memblokir permintaan tanpa gesture). Jadwal dicek tiap menit selama tab terbuka; jam pengingat disimpan per item (`jam` di `Reminders`).
- **Snooze:** 10 menit / 1 jam / besok pagi, disimpan di localStorage (bukan sheet, agar tidak menulis tiap snooze).
- **Opsional fase 3:** email harian 07:00 via *time-driven trigger* GAS (`ScriptApp.newTrigger`). Ini menambah beban kuota dan butuh izin scope baru — pisahkan dari rilis pertama.

**Catatan jujur:** tanpa trigger GAS, pengingat hanya jalan saat tab TaskSpace terbuka. Itu batasan nyata; jangan dijanjikan sebagai push notification.

---

### F5 — Pustaka isi task (menjawab "bingung harus isi apa") ★ dampak tinggi, usaha kecil

Konstanta `TASK_PRESETS` di dalam file (tanpa backend, tanpa dependency): 12–20 preset relevan operasional, mis.

| Preset | Grup | Tag | Subtask bawaan |
|---|---|---|---|
| Cek resi belum bergerak | rutin | Kiriman | buka tracking · cek 3 resi tertua · eskalasi ke ekspedisi |
| Rekap order marketplace | rutin | Marketplace | tarik data · cocokkan · catat selisih |
| Balas chat CS tertunda | rutin | CS | cek inbox · balas · tandai selesai |
| Update stok harian | rutin | Gudang | hitung · input · foto bukti |
| Tindak lanjut retur | dadakan | Retur | cek alasan · hubungi pembeli · putuskan |
| Setor bukti transfer | dadakan | Finance | foto bukti · unggah · arsip |

Satu klik → form terisi (judul, grup, tag, prioritas, subtask), user cukup ubah tanggal. Ini yang paling cepat menghilangkan rasa "kosong melompong".

---

### F6 — Kebersihan daftar: arsip otomatis untuk dadakan ★ dampak sedang, usaha kecil

**Masalah:** daftar membengkak oleh task dadakan yang sudah selesai.

- Task `dadakan` yang `done` lebih dari **7 hari** disembunyikan dari tab Tertunda/Semua (derived filter, **tidak menghapus** apa pun) dan muncul di tab baru **Arsip**.
- Rutin yang terlewat: tetap tampil hari itu, lalu hilang dari "Hari Ini" besoknya (tidak menumpuk).
- Tombol `Bersihkan arsip` (dengan `showConfirm` `:4986` + undo `:3908`) untuk hapus permanen bila diminta.

---

### F7 — Kepatuhan rutin (agar rutin yang tak berguna bisa dipensiunkan) ★ dampak sedang, usaha kecil

- Per rutin: `selesai / jatuh tempo` 30 hari terakhir, streak berjalan.
- Sorotan di daftar Rutinitas: "Rutin ini 3 minggu berturut-turut terlewat — jeda atau hapus?".
- Semua dihitung dari baris `Tasks` yang sudah dimuat (tidak ada query baru).

---

## 5. Kontrak backend yang berubah

| Akses | Sekarang | Setelah perubahan |
|---|---|---|
| `doPost` action | `getCalendarData`, `saveCalendarItem`, `saveTask`, `saveTasksBatch`, `deleteCalendarItem`, `deleteTask`, `createShare`, `deleteShare` | + `getRoutines`, `saveRoutine`, `deleteRoutine` |
| `saveCalendarItem_` | auto-buat kolom `Urutan`, `Subtasks` | + auto-buat `Grup`, `RutinId`, `Kunci` (pola `code-taskschedule.gs:250–272`) |
| `saveTasksBatch_` | simpan urut, stop-on-fail | + lewati item dengan `Kunci` yang sudah ada (idempoten) |
| Sheet baru | — | `Routines` (dibuat otomatis, header persis kolom §3.2) |
| Kunci tulis | `requireToken_` untuk semua action non-`getCalendarData` | action rutin **wajib** ikut `requireToken_` (jangan lupa, ini mudah terlewat) |
| URL | `.../exec` | **sama**; deploy = *Manage deployments → Edit → New version*. URL tidak ganti, jadi tidak ada file HTML lain yang perlu diedit. |

Aturan data: nama action frontend ↔ backend **harus identik**, key **snake_case** konsisten (bug T2/T3 di README lahir dari ketidakcocokan key).

---

## 6. Prioritas & urutan kerja

| Fase | Isi | Dampak | Usaha | Perlu deploy GAS? |
|---|---|---|---|---|
| **1** | F1 grup + F3 quick add & Hari Ini + F5 preset | Menghilangkan "bingung isi apa" dan daftar bercampur | ±1,5 hari | **Ya** (kolom `Grup` saja) |
| **2** | F2 rutinitas berulang + F6 arsip dadakan | Inti permintaan: rutin harian/mingguan otomatis | ±3 hari | **Ya** (sheet `Routines` + 3 action) |
| **3** | F4 pengingat (in-app + browser) + F7 kepatuhan | Tool mulai "menagih" dan bisa dievaluasi | ±2 hari | Belum (kecuali email harian) |
| **4** | Email harian via time trigger | Pengingat saat tab tertutup | ±1 hari | Ya (trigger + scope) |

Urutan ini disengaja: fase 1 memberi perbaikan yang langsung terasa, sekaligus menyiapkan kolom `Grup` yang dibutuhkan mesin rutin. Jangan mulai dari F2 tanpa F1 — nanti rutin dan dadakan kembali bercampur.

---

## 7. Yang TIDAK diubah (anti-regresi)

- `computeRepeats_` `:4702` dan alur "Ulangi" lama: **jangan diganti** isinya; mesin rutin baru adalah fungsi terpisah.
- `type` tetap 4 nilai; `isCampaignRow_` GAS tidak disentuh.
- Print (`printMonthView` `:5032`, `printTimelineView` `:3788`) dan share (`SHARE` `:2406`) tidak perlu diubah karena rutin tetap berupa baris task biasa — tapi wajib diuji: viewer share **tidak** boleh memicu materialisasi/tulis.
- `ts-theme`, `ts_cache_data_v2` (naik ke `v3`), dan kunci `localStorage` lain tetap memakai prefix `ts-`.
- CSS: token dari `src/styles/tools.css`, **tanpa hex baru** di tengah kode (aturan repo). Jangan menambah CSS ke file hub untuk fitur ini.
- Tidak menambah dependency, tidak memecah file (tool single-file).

---

## 8. Verifikasi yang akan dijalankan saat implementasi

1. `node --check` untuk **setiap** blok `<script>` inline (ekstrak dulu, jangan cek file HTML langsung).
2. `node --test "tests/*.test.js"` → harus tetap 10/10 lulus.
3. Uji mesin jadwal sebagai unit murni (fungsi tanpa DOM), kasus wajib:
   - mingguan `[1,4]` mulai Rabu → kemunculan pertama Senin berikutnya (bukan hari mulai).
   - bulanan tanggal 31 mulai 31 Jan → Feb dilewati/tidak error, Mar 31 kembali.
   - `sampai` dan `jumlah` bertabrakan → yang lebih dulu menang.
   - materialisasi dua kali berturut-turut → **0 baris baru** (kunci idempoten).
4. Uji manual: buat rutin mingguan 2 hari → cek kalender, timeline, print, dan share (share tidak menambah baris).
5. Uji regresi fitur lama: Ulangi (akhir bulan), drag-reorder, subtask, undo, offline reload.

---

## 9. Keputusan yang perlu Anda tentukan

1. **Nama grup final:** `Rutin · Dadakan · Proyek` (usulan) atau cukup dua (`Rutin · Dadakan`) dengan "Proyek" jadi tag?
2. **Materialisasi:** horizon 30 hari (usulan, hemat baris sheet) atau sampai akhir bulan berjalan saja?
3. **Rutin "selamanya":** boleh, atau wajib punya tanggal berakhir supaya sheet tidak tumbuh tanpa kendali?
4. **Pengingat:** cukup dalam aplikasi + notifikasi browser saat tab terbuka, atau harus email harian (butuh trigger GAS + izin tambahan)?
