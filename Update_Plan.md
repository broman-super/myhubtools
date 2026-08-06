# Update Plan

---

## Perubahan Terbaru (2026-08-05)

### Taskschedule — Fix Tampilan Campaign / Event / Reminder

#### 1. Campaign tidak muncul di Tab Task List
- **Akar masalah:** `renderList()` sudah mengecualikan `type === 'campaign'`, tapi jalur `getTasks` (fallback/cache) menormalkan type dari `t.type` padahal backend menyimpan dengan key `tipe` (header sheet "Tipe") → semua item jadi `type:'task'` → campaign masuk Task List, dan sebaliknya tersembunyi di Month/Timeline.
- **Perbaikan:** normalisasi type di `api('getTasks')` sekarang baca `t.type || t.tipe`. `taskschedule.html:1952`.

#### 2. Campaign / Event / Reminder tidak tampil di Month View & Timeline View
- **Month View:** `S.showMonthEvents`/`S.showMonthReminders` default `false` (padahal checkbox HTML `checked`) → event & reminder tidak pernah render padahal UI menunjukkan aktif.
  - **Perbaikan:** default disetel `true` agar sinkron dengan checkbox. `taskschedule.html:1888`.
- **Timeline View:** toggle dibaca langsung dari checkbox (sudah benar: campaign/event/reminder default on). Yang membuat kosong adalah jalur `getTasks` yang tidak pernah memuat `S.events`/`S.reminders` sama sekali (hanya bisa lewat `getCalendarData`).
- **Cache:** key `ts_cache_data` → `ts_cache_data_v2` untuk membuang cache lama yang menyimpan type salah. `taskschedule.html:1955` & `:2107`, `Productive/Task/README.md`.

### ⚠️ KENDALA / BUTUH APPROVAL — Deploy GAS wajib
- `gscode/code-taskschedule.gs` HARUS dideploy ulang ke Web App GAS. Backend yang aktif harus punya action `getCalendarData` (POST) + `doGet` (GET fallback).
- Jika versi yang terdeploy masih lama (tanpa `getCalendarData`), maka `getCalendarData` gagal → jatuh ke fallback `getTasks` → event & reminder TIDAK akan pernah muncul (data tersebut memang tidak ada di sheet Tasks), hanya campaign yang muncul.
- Kalau sudah terdeploy versi terbaru, kedua perbaikan di atas langsung bekerja.

### 🔧 Campaign Masih di Task List + Hilang di Month/Timeline (data lama)
- **Akar masalah 2:** backend hanya memisahkan campaign via kolom `Tipe == 'campaign'`. Data campaign LAMA yang kolom `Tipe`-nya kosong (dibuat sebelum fitur tipe ada) ikut masuk `plainTasks` → frontend menandai `type:'task'` → muncul di Task List, tersaring dari Month View (`showMonthTasks:false`) dan ditampilkan sebagai task (bukan campaign) di Timeline.
- **Perbaikan:** backend `getCalendarData_` kini memakai heuristic yang sama dengan deteksi edit mode di app (`isCampaignRow_`: `tipe == campaign` ATAU `tag` = channel ATAU judul berprefix `IG|`/`WA|`/`TT|`/`SP|`/`WB|`/`EV|`). `code-taskschedule.gs:44-57`. Frontend fallback `getTasks` juga pakai `isCampaignLike` yang sama. Log console kini menampilkan jumlah campaign (`... tasks + N campaigns, ...`).
- **Wajib deploy ulang GAS** agar split baru aktif.
- **Iterasi 2:** campaign masih muncul di Task List padahal Timeline sudah benar → baris yang tersisa di list diduga punya penanda dengan nama kolom lain (`Type`/`Kategori`). `isCampaignRow_` diperluas: cek `tipe`/`type`/`kategori` bernilai `campaign`. Console juga menampilkan `[Planner] sample keys:` (nama kolom baris pertama) untuk verifikasi skema sheet. **Deploy GAS ulang wajib.**
- **Konfirmasi user (2026-08-05):** skema sheet = kolom `Type`, nilai `campaign`. Cocok dengan `isCampaignRow_`. **Deploy GAS ulang terakhir lalu verifikasi `?v=3`.**
- **✅ VERIFIED SELESAI:** user konfirmasi "Sudah Sempurna" — campaign tidak lagi masuk Task List, tampil benar di Timeline/Month View. Semua item tertutup.

### 🔍 Kenapa "Tidak Menunjukkan Hasil" — Service Worker cache-first
- **Akar masalah:** `src/sw.js` versi `reynahub-v3` menyajikan semua path `/Productive/` dengan strategi **cache-first tanpa revalidasi** — begitu `taskschedule.html` masuk cache, browser terus menyajikan salinan LAMA, edit frontend tidak pernah termuat meski sudah save/deploy GAS.
- **Perbaikan:** (1) handler `/Productive/` diubah ke **network-first** (fetch dulu, cache hanya untuk fallback offline) sehingga editan tool langsung tampil saat reload; (2) versi cache di-bump `reynahub-v3` → `reynahub-v4` supaya cache lama yang basi ikut terhapus saat SW baru aktif.
- **Aksi user:** reload/hard-refresh hub (1–2x) agar SW baru terpasang & cache lama dibuang. Verifikasi juga bahwa URL Web App yang dideploy sama persis dengan `GAS_URL` di `taskschedule.html:1859` (berbeda dari yang tertulis di README — README harus diperbarui).

### 🔍 Diagnostik Baru (untuk memastikan layer mana yang gagal)
- `taskschedule.html` sekarang menampilkan **banner merah** di atas tool: "Mode fallback: action getCalendarData tidak tersedia di backend" → muncul HANYA jika backend yang aktif adalah versi lama (tanpa `getCalendarData`). Jika banner ini muncul = backend belum dideploy ulang, bukan masalah cache.
- Di DevTools Console juga muncul `[Planner] getCalendarData OK: X tasks, Y events, Z reminders` saat backend versi baru berhasil.
- **Tes cepat tanpa menunggu SW:** buka `Productive/Task/taskschedule.html?v=<angka>` di tab baru (query string membuat SW tidak menemukan salinan cache lama → fetch versi terbaru langsung).
- Deployment: `gscode/code-taskschedule.gs` → Deploy → Manage deployments → Edit → **Deploy** (Web App, Execute as: Me, Who has access: Anyone).

---

## Log Perubahan

| Tanggal | Area | Perubahan | Status |
|---------|------|-----------|--------|
| 2026-08-05 | Taskschedule | Fix campaign di Task List — normalisasi `tipe` di jalur getTasks | ✅ |
| 2026-08-05 | Taskschedule | Fix Month View — default showMonthEvents/Reminders sinkron checkbox | ✅ |
| 2026-08-05 | Taskschedule | Cache key → `ts_cache_data_v2` (buang data type salah) | ✅ |
| 2026-08-05 | SW Hub | `/Productive/` cache-first → network-first + bump `reynahub-v3`→`v4` (fix edit tidak termuat) | ✅ |
| 2026-08-05 | Taskschedule | **Deploy ulang GAS** `code-taskschedule.gs` agar getCalendarData + doGet aktif | ✅ (verified) |
| 2026-08-05 | Taskschedule | Banner fallback + console.info count getCalendarData (diagnostik layer) | ✅ |
| 2026-08-05 | Taskschedule | **Verifikasi akhir** — console: `getCalendarData OK: 116 tasks, 6 events, 5 reminders`; backend split campaign (code-taskschedule.gs:47-48); renderList exclude campaign (L2300); Month render event/reminder (L2522-2535). Ketiga bug tuntas. | ✅ |
| 2026-08-05 | Taskschedule | Campaign data lama tetap jadi task → split campaign via heuristic (`isCampaignRow_` di backend + `isCampaignLike` di frontend). **Deploy GAS ulang wajib.** | ✅ code / ⏳ deploy |
| 2026-08-05 | Taskschedule | `isCampaignRow_` diperluas ke kolom `tipe`/`type`/`kategori` + diagnostik `sample keys` di console | ✅ |
| 2026-08-05 | Taskschedule | **SELESAI — verifikasi user:** skema sheet `Type`=`campaign` cocok; campaign tampil benar di Timeline, Task List bersih, deploy GAS terakhir sukses. | ✅ |
| 2026-08-05 | Analytic/SAS | Kalibrasi GAS: auto-provision tab kosong/hilang (`pastikanTabAda_` + `TAB_HEADERS_`); Alasan Retur ditunda; catatan anti-error ditambah. **Deploy GAS ulang wajib.** | ✅ code / ⏳ deploy |
| 2026-08-05 | Analytic/SAS | Fix tooltip Trend Sales vs Retur menampilkan `<svg...>` di mode "Bandingkan Bulan Lalu" — `ICONS.calendar` dihapus dari tooltip `title` callback (Chart.js tooltip text-only) | ✅ |
