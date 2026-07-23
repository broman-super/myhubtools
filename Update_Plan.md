# Update Plan — Team Planner (taskschedule.html)

## Phase 1 — CSS & Variable Fixes
**Risiko: Sangat Rendah** — cuma ubah CSS, gak sentuh logic

| Item | Lokasi | Tindakan | Validasi |
|------|--------|----------|----------|
| Tutup `}` di print CSS | line 3476 | Tambah `}` | Print month view — cek tampil normal |
| Hapus `--primary: #ff0000` | :root line 19 | Hapus variabel | Gak ada efek visual |
| **Status: ✅ Selesai (Y/T)** | | | |

---

## Phase 2 — Cache TTL + Holiday Fallback
**Risiko: Rendah** — logic tambahan, gak ubah yang existing

| Item | Tindakan | Validasi |
|------|----------|----------|
| Cache TTL 5 menit di `api('getTasks')` | Simpan timestamp + validasi | Refresh — cache expired setelah 5 menit |
| Holiday cache + fallback static | Simpan di localStorage | Matikan internet — holiday tetap muncul |
| **Status: ✅ Selesai (Y/T)** | | |

---

## Phase 3 — GAS Backend Baru
**Risiko: Sedang** — fungsi baru, data lama tetap terbaca via `getTasks`

| Item | Detail |
|------|--------|
| Sheet baru `Events` | ID, Nama, Mulai, Selesai, Deskripsi, Penyelenggara, Warna, Status, Tipe |
| Sheet baru `Reminders` | ID, Nama, Mulai, Selesai, Deskripsi, Warna, Status |
| Fungsi `getCalendarData()` | return {tasks, campaigns, events, reminders} |
| Fungsi `saveCalendarItem(data)` | Insert/update sesuai tipe |
| Fungsi `deleteCalendarItem(id, type)` | Hapus dari sheet sesuai tipe |
| **Status: ✅ Selesai (Y/T)** | Deploy GAS → test via browser |

---

## Phase 4 — Frontend: Radio Button + Field Dinamis
**Risiko: Tinggi** — ubah modal, logic submit, validasi

| Item | Detail |
|------|--------|
| Ganti dropdown "Tipe" jadi radio | `○ Task ○ Campaign ○ Event ○ Reminder` |
| Field dinamis | Event → tambah "Penyelenggara". Reminder → sederhana |
| Status Pending/Done | Semua tipe punya status |
| Warna fixed | Campaign=bebas, Event=teal stripe, Reminder=amber dot |
| **Status: ✅ Selesai (Y/T)** | Bikin 1 tiap tipe → cek muncul |

---

## Phase 5 — Frontend: Multi-Layer Checkbox + Rendering
**Risiko: Tinggi** — render 3 tipe baru bareng existing di grid yang sama

| Item | Detail |
|------|--------|
| Checkbox toolbar | `[Task] [Campaign] [Event] [Reminder]` |
| Month view | Campaign=bar solid, Event=bar stripe, Reminder=dot |
| Timeline view | Campaign=bar panjang, Event=bar pendek, Reminder=marker |
| Filter on/off | Hide/show — tanpa fetch ulang |
| **Status: ✅ Selesai (Y/T)** | Centang semua → tampil. Matikan → ilang |

---

## Log Pengerjaan

| Date | Phase | Perubahan | Status |
|------|-------|-----------|--------|
| 2026-07-23 | Phase 1 | CSS fix `}` + rename `--primary`→`--danger` | ✅ |
| 2026-07-23 | Phase 2 | Cache TTL 5m + holiday fallback static | ✅ |
| 2026-07-23 | Phase 3 | GAS backend: Events + Reminders sheets, 3 functions | ✅ |
| 2026-07-23 | Phase 4 | Frontend: Event/Reminder tab + view + CRUD modal | ✅ |
| 2026-07-23 | Phase 5 | Multi-layer calendar: checkbox toolbar + render events/reminders di Month + Timeline + Day Detail | ✅ |
