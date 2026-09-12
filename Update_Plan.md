# Update Plan — Pengaman Tombol Database di Seluruh Webtools

Tanggal: 2026-09-11
Status: **Rencana — siap eksekusi Fase 1→8**
Goal: Setiap tombol yang menyentuh DB (Simpan/Edit/Load/Hapus/Import) mendapat (a) reaksi visual berupa spinner di dalam tombol + teks berubah, dan (b) pengaman anti dobel-kirim (disable sementara) agar tidak terjadi race input.

## Ringkasan Keputusan

- **Reaksi visual:** Spinner kecil di dalam tombol + teks berubah ("Menyimpan…/Mengirim…/Memuat…") + tombol `disabled` total. Ini pola yang SUDAH dipakai di `tracking.html` & `taskschedule.html` → dijadikan baku, bukan pola baru.
- **Pendekatan helper:** Karena tiap tool dimuat via iframe terpisah tanpa shared JS (hub tidak punya build system), helper `lockBtn/unlockBtn` + CSS `.btn-busy` **disalin per tool**, bukan di-inject dari shell.
- **Semua edit surgical** (per web-gas-dev: tidak merombak file, tidak menghapus fungsi lama).
- **Bug bonus yang disetujui ikut diperbaiki:** (1) throttle `incrementClick` di latch, (2) badge pending `deleteExpense`, (3) perketat cek sukses di expense-tracker.
- **Tanpa perubahan:** `tracking.html`, `outbondtrack`, `Resi-Generator`, `PDF-Merger`, shell `index.html`/`src/*` (tidak punya tombol DB).

## Matriks Status Audit (hasil pengecekan menyeluruh — read-only)

| Tool | File target | Kondisi saat ini |
|---|---|---|
| `tracking.html` (tr/) | — (tidak disentuh) | ✅ Semua tombol DB sudah: submit/delete/edit disable + "Mengirim…" |
| `outbondtrack` | — (tidak disentuh) | ✅ `btnReset` disable saat proses |
| `Resi-Generator` / `PDF-Merger` | — (tidak disentuh) | Tanpa tombol DB sama sekali |
| `taskschedule.html` | `Productive/Task/taskschedule.html` | ⚠️ `submitTask`/`refreshData` aman; **`toggleDone` tanpa guard** |
| `retur-track.html` | `Productive/tr-retur/retur-track.html` | ⚠️ `pushToDatabase` aman; **`markStatus` tanpa guard + failure handler kosong** |
| `expense-tracker` | `Productive/expense-tracker/index.html` | ⚠️ `submitForm` aman (jadi acuan); **6 aksi detail tanpa guard** |
| `latch` (+admin) | `Productive/latch/js/app.js` | ❌ **Nol pengaman** (tidak ada `disabled`) — prioritas tertinggi |
| `Analytic.html` | `Productive/analytic/Analytic.html` | ⚠️ Save/upload sudah overlay; **`deleteBiayaRow`, `runDataAnalysis`, 2 tombol Upload tidak dikunci saat in-flight** |
| `Project_develop` (React) | `Productive/Project_develop/src/**/App.jsx` | 🐛 **`PrimaryButton` tidak spread `...rest`** → `disabled={busy}` dibuang diam-diam |

## Definisi Kunci

- `Tombol DB` = tombol yang menulis/membaca data (Google Sheets, Supabase, atau localStorage-as-DB): Simpan/Save, Edit/Update, Load/Refresh/Analisis, Hapus/Delete, Import.
- `lockBtn(el, teks)` = set `disabled=true` + tambah class `.btn-busy` + ganti teks (opsional), simpan teks asli di `dataset`.
- `unlockBtn(el)` = kembalikan `disabled=false`, hapus class, pulihkan teks asli.
- `try/finally` = pola pembungkus agar tombol dijamin balik normal walau sukses ATAU gagal.
- `S.saving`/flag = guard re-entrancy untuk tombol yang di-render ulang tiap kali (pakai flag, bukan lockBtn, karena tombolnya diganti elemen baru).

## Pola Standar (disalin ke tiap tool yang butuh)

JS:
```js
function lockBtn(btn, text) {
  if (!btn) return;
  btn.dataset.orig = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('btn-busy');
  if (text) btn.innerHTML = text;
}
function unlockBtn(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.classList.remove('btn-busy');
  if (btn.dataset.orig) btn.innerHTML = btn.dataset.orig;
}
```
CSS (taruh di `<style>` tool, pakai token project):
```css
.btn-busy { opacity:.7; cursor:progress; pointer-events:none; }
.btn-busy::before {
  content:''; display:inline-block; width:.85em; height:.85em;
  margin-right:.45em; vertical-align:-2px;
  border:2px solid currentColor; border-top-color:transparent; border-radius:50%;
  animation:btnSpin .6s linear infinite;
}
@keyframes btnSpin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .btn-busy::before { animation:none; } }
```
Kriteria terima pola: diklik 2× cepat → hanya 1 panggilan; saat diproses tombol terlihat redup+spinner; tombol kembali normal setelah selesai/gagal.

---

## FASE 0 — Fondasi & Baseline

- [ ] 0.1 Tulis dokumen rencana ini ke `Update_Plan.md`. *(dilakukan)*
- [ ] 0.2 Verifikasi snapshot lokasi baris tiap target di awal eksekusi (nomor baris bisa bergeser) — grep ulang sebelum edit tiap file.
- Kriteria terima: daftar target Fase 1-8 cocok dengan kenyataan file.

## FASE 1 — `latch` (paling rawan: nol pengaman hari ini) — 2 file

Target: `Productive/latch/js/app.js` (+ CSS; tombol `latch.html`/`admin_latch.html` sudah punya id, tak perlu edit).

- [ ] 1.1 Tambah helper `lockBtn/unlockBtn` + CSS `.btn-busy` di `app.js`/style.
- [ ] 1.2 `saveDrawer` (app.js:1110) — `lockBtn('#drawerSave','Menyimpan…')` di awal; unlock di `finally`. Mencegah 2 klik = 2 baris duplikat (id dibuat per-kali panggil di `utils.uid()`).
- [ ] 1.3 `performDelete` (app.js:1069) — lock `#deleteConfirm` ("Menghapus…"); unlock di `finally`.
- [ ] 1.4 `saveCategory` (app.js:1220) — lock `#addCategoryBtn` ("Menyimpan…").
- [ ] 1.5 `confirmImport` (app.js:1268) — lock `#importConfirm` ("Mengimpor…"); unlock setelah `getData()` selesai.
- [ ] 1.6 Hapus kategori (modal, app.js:1179-1192) — lock tombol konfirmasi.
- [ ] 1.7 `doLogin` (app.js:1410) — lock `#loginSubmit` ("Memeriksa…").
- [ ] 1.8 Bonus throttle `incrementClick` (app.js:484) — flag per target: simpan timestamp klik terakhir per link id, tolak jika < 1 detik sejak klik terakhir.
- Verifikasi: tiap aksi dicoba klik ganda cepat → 1 POST; toast sukses/gagal tetap muncul; tombol balik normal.

## FASE 2 — `expense-tracker` — 1 file

Target: `Productive/expense-tracker/index.html`

- [ ] 2.1 `submitForm` sudah benar (L577-586) → dipakai sebagai acuan.
- [ ] 2.2 6 aksi detail di `showDetail` (dibangun via `addBtn` L748, callback L782/792/803/813/823/833): lock tombol aksi saat mulai, unlock di callback. Handler: `approveExpense`, `rejectExpense`, `markRealisasi`, `markReimburse`, `cancelExpense`, `deleteExpense`.
- [ ] 2.3 Bonus: `deleteExpense` (L833) tambah `loadPendingCount()` usai reload.
- [ ] 2.4 Bonus: perketat cek sukses — ganti `res.success || res.result` → `res.success === true` di 6 aksi + `submitForm`.
- Verifikasi: klik ganda Setujui/Hapus → 1 panggilan; badge Pending update saat hapus; simulasikan respons gagal → toast error, bukan sukses.

## FASE 3 — `Analytic.html` — 1 file

Target: `Productive/analytic/Analytic.html`

- [ ] 3.1 `sendExcelToGAS` (L5224) — `lockBtn('#btnSubmitUpload','Mengirim…')` di awal; unlock di success DAN error. `btnSubmitUpload` punya `disabled` attr markup → dikunci saat in-flight.
- [ ] 3.2 `sendBiayaToGAS` (L5618) — sama untuk `#btnSubmitBiayaUpload`.
- [ ] 3.3 `deleteBiayaRow` (L6104) — lock tombol HAPUS baris saat fetch; unlock di `finally`.
- [ ] 3.4 `runDataAnalysis` (L4912) — lock `#btnRunAnalysis` ("Memuat…"); unlock di `finally` (cegah RPC `get_all_transaksi` dipanggil dobel).
- [ ] 3.5 Jaga konsistensi `window.isProcessingGAS` agar tidak konflik dengan lockBtn (flag lama tetap jalan untuk overlay).
- Verifikasi: upload → tombol tak bisa diklik 2×; hapus baris biaya → tombol baris men-spinner; Run Analysis → tombol spinner sampai selesai.

## FASE 4 — `retur-track` — 1 file

Target: `Productive/tr-retur/retur-track.html`

- [ ] 4.1 `markStatus` (L1147) — `lockBtn(btnEl)` saat PATCH; unlock di success DAN failure.
- [ ] 4.2 Isi failure handler yang kini kosong (L1175) — tampilkan toast/alert + `console.error`; jika gagal, status optimistik dikembalikan/rollback.
- Verifikasi: klik Valid/Error cepat → 1 PATCH; matikan jaringan → pesan error jelas & status kembali sebelum klik.

## FASE 5 — `taskschedule` — 1 file

Target: `Productive/Task/taskschedule.html`

- [ ] 5.1 `toggleDone` (L3629) — guard re-entrancy: `if (S.toggleBusy) return; S.toggleBusy = true; try{...} finally { S.toggleBusy = false; }` (pakai flag, bukan lockBtn, karena tiap klik re-render → elemen tombol diganti).
- Verifikasi: klik ganda tanda cek → 1 write; status konsisten.

## FASE 6 — `Project_develop` (React) — 1 file

Target: `Productive/Project_develop/src/**/App.jsx`

- [ ] 6.1 `PrimaryButton` (L530) — destructure `...rest` dan teruskan ke elemen `<button>`, sehingga `disabled={busy}` (L1820) benar-benar dikirim (sekarang dibuang diam-diam).
- [ ] 6.2 Bersihkan `busy` di `finally` sesudah `onSave` selesai.
- [ ] 6.3 `trashProject`/`permanentDeleteProject` (L813/821) — pastikan aksi hapus (termasuk loop `deleteFromStorage`) tertutup flag busy.
- Verifikasi: saat simpan modal → tombol Simpan spinner & tak bisa diklik; autosave tetap jalan (debounce + saving guard existing).

## FASE 7 — Regresi & Build

- [ ] 7.1 Sweep akhir: semua handler DB di 6 tool sudah punya guard (grep `lockBtn(` hadir di tiap handler target).
- [ ] 7.2 Pastikan `tracking.html`, `outbondtrack`, `Resi-Generator`, `PDF-Merger`, shell `index.html`/`src/*` TIDAK tersentuh.
- [ ] 7.3 `npm run build` di `Productive/Project_develop` (tool React).
- Kriteria terima: seluruh tool tetap bisa dibuka, fungsi lama lengkap, tombol balik normal.

## FASE 8 — Verifikasi Pengguna & Deployment

- [ ] 8.1 Di tiap tool, klik dobel pada tombol DB → hanya 1 request, tombol men-spinner.
- [ ] 8.2 Deployment: frontend statis (auto-deploy GitHub Pages via push). GAS hanya perlu re-deploy bila `gscode/*.gs` berubah (di update ini tidak) — cukup informasikan.
- [ ] 8.3 Commit & push bila user minta.

## Checklist Akhir (web-gas-dev)

- [ ] Fungsi lama yang tak diminta diubah tetap ada; tidak ada id/class yang putus
- [ ] Failure handler/catch ada di semua async DB
- [ ] Token warna project dipakai (bukan warna baru)
- [ ] `prefers-reduced-motion` dihormati
- [ ] Tidak ada API key baru ditulis ke client
- [ ] Bug bonus (3) sudah diperbaiki & dilaporkan

---

# RND Roadmap Tracker — Paket 10 Fitur Baru (Fase 1→10 + Regresi)

Tanggal: 2026-09-12
Status: **Rencana — eksekusi bertahap, tiap fase diakhiri build + probe CDP**.
Scope: `Productive/Project_develop` (tool React, satu file build) + **edit surgical kecil di shell hub** (3 file, hanya untuk fitur #5 badge).

## Peta 10 Fitur → Fase

| # | Fitur | Fase | Inti perubahan |
|---|---|---|---|
| 8 | Prioritas P1–P3 | Fase 1 | field `priority` + chip kartu + opsi sort |
| 6 | Tag/label ganda | Fase 2 | field `tags[]` + input chips + filter kombinasi |
| 1 | Template Proyek | Fase 3 | simpan/ambil struktur project di `localStorage` |
| 9 | Salin Checklist | Fase 4 | picker" salin item checklist lintas project/template |
| 4 | Duplikasi cepat | Fase 5 | tombol duplikat project (deep copy id baru) |
| 2 | Alur status otomatis | Fase 6 | `autoStatus` + status turunan (display-only, TANPA tulis loop) |
| 3 | Timeline/Gantt | Fase 7 | tab "Timeline": milestone di sumbu tanggal |
| 5 | Notifikasi + badge hub | Fase 8 | lonceng + dropdown belum-dibaca; badge di kartu hub |
| 7 | Log aktivitas & komentar | Fase 9 | field `history[]` di blob + tab "Aktivitas" |
| 10 | Ringkasan mingguan | Fase 10 | kartu dashboard "Progres 7 hari" |

## Keputusan Arsitektur (WAJIB diikuti saat eksekusi)

- **TIDAK ada perubahan backend.** Supabase menyimpan project sebagai JSON blob (`id, data`) — semua field baru (priority, tags, autoStatus, history) cukup ditambahkan ke object project. `src/supabase.js`, `config.js`, GAS tidak disentuh.
- **Semua edit surgical** — JANGAN me-rewrite App.jsx. Tambah fungsi/komponen di dekat bagian yang relevan, pertahankan semua handler lama.
- **Simpan otomatis tetap jalan apa adanya** (debounce 400 ms, guard `saving`, retry 3×) — fitur baru cukup mengubah state `projects`, sisanya ditangani mekanisme yang ada.
- **Fitur 2 TANPA tulis-loop**: status otomatis = nilai turunan saat render (`effectiveStatus(p)`); hanya tampilan di Dashboard/Detail yang memakai nilai turunan. Nilai `status` tersimpan tetap manual. Tidak ada `useEffect` yang menulis status.
- **Template (F3) & daftar "sudah dibaca" notifikasi (F8)**: data pribadi/personal → `localStorage`. Blob project TIDAK diberi template/buku-baca.
- **Hub badge (F5)**: app menulis angka belum-dibaca ke `localStorage['rnd-alert-count']`; hub membaca via `setInterval` kecil di `src/app.js` (sama-origin, localStorage dibagi). Pengubahan shell = 3 file: `src/components/tool-card.js`, `src/app.js`, `src/styles/components.css`.
- **Anti-perusakan (Aturan Emas web-gas-dev)**: sebelum tiap edit, `grep` ulang nama fungsi/baris (nomor baris bergeser tiap fase); setelah selesai cek: render probe 0 error, build hijau, fungsi lama tetap ada.
- Setiap fase menghasilkan nilai `dist/index.html` baru (build ulang) → verifikasi CDP port 9224 (probe default: render + error count; fase dengan UI baru: probe interaksi).

## Definisi Kunci (field/fungsi baru, konsisten penamaan existing camelCase)

- `effectiveStatus(p)` — helper derived status; taruh dekat helper tree (`mapTree`/`flattenMilestones`).
- Project field: `priority` (''|'P1'|'P2'|'P3'), `tags` (string[]), `autoStatus` (bool), `history` (array obj `{id, at, type, text}`).
- `localStorage['rnd-templates']` = `[{id, name, savedAt, milestones}]`; `localStorage['rnd-seen-alerts']` = string[] key `pid:mid:kind`.
- `C.priority` warn: P1 merah/destructive, P2 `var(--warning)`, P3 `C.sky`. Pakai `color-mix` tint seperti chip status.
- Semua teks UI baru dalam Bahasa Indonesia, font/radius/shadow via token yang ada (`C.foo`, `R.foo`) — dilarang hex baru.

---

## FASE 1 — Prioritas P1–P3 (fitur 8)

Target: `Productive/Project_develop/src/App.jsx`

- [ ] 1.1 Tambah nilai `priority` di `seedData` sampel (1 project P1, 1 P2) — biar terlihat tanpa data baru.
- [ ] 1.2 `saveProject` (pembuatan baru, App.jsx:769) — turunkan `priority: ""` di object baru.
- [ ] 1.3 `ProjectModal` (App.jsx:1200) — input select Prioritas (Tidak ada/P1/P2/P3), field di samping Status.
- [ ] 1.4 Kartu project di `Dashboard` (App.jsx:1094) — chip Prioritas kecil di samping badge status (hanya bila `priority` terisi; warna per level).
- [ ] 1.5 Kombinator sort `comparators` (App.jsx:944) — tambah `priority: (a,b) => P1<P2<P3<''` (nilai kosong di akhir).
- [ ] 1.6 Dashboard select sort — opsi `value="priority"` "Prioritas".
- Verifikasi: buat/edit project set P1 → kartu menampilkan chip; sort Prioritas menempatkan P1 di atas; CSV/PDF/report tidak berubah (filter tidak menyentuh field lama).

## FASE 2 — Tag/label ganda (fitur 6)

Target: `App.jsx` (semua di tool)

- [ ] 2.1 `saveProject` object baru — `tags: []`.
- [ ] 2.2 `ProjectModal` — input chip tag: Input + tombol "Tambah" + Enter untuk menambah tag; tag tampil sebagai chip dengan ×; saran = tag yang sudah dipakai project lain (bandingkan dari semua `projects` via prop baru dari Dashboard/App). Props modal butuh `allTags` (tetap opsional).
- [ ] 2.3 Kartu project — render chips tag kecil (maks 3, sisa `+n`) di bawah deskripsi.
- [ ] 2.4 `Dashboard` toolbar — baris filter tag (multi-select): toggle chips dari semua tag; hasil = AND status-filter && (semua tag terpilih ada di project.tags).
- [ ] 2.5 Kelola saat `initial.status` dipakai — pastikan edit project menampilkan chips lama dengan benar (urgensi: jangan sampai edit menghapus tags — form default dari `initial.tags`).
- Verifikasi: buat project 2 tag → filter tag menampilkan project benar; edit 1 tag → yang lain tidak hilang; pencarian teks masih jalan gabungan.

## FASE 3 — Template Proyek (fitur 1)

Target: `App.jsx` + `localStorage`

- [ ] 3.1 Helper (dekat helper tree): `loadTemplates()`, `saveTemplates(list)` — JSON `rnd-templates`; get/set aman try/catch.
- [ ] 3.2 `ProjectDetail` toolbar (dekat Edit Project) — tombol "Simpan sebagai Template" → confirm nama (default nama project) → push `{id, name, savedAt, milestones: deepCopy(project.milestones)}` (hapus `id` tiap node? — pertahankan id lama boleh, saat instantiate buat ulang) → toast via `saveStatus`? (tidak—localStorage; kasih toast lokal atau pakai `confirm` sukses). Keputusan: gunakan `confirmDialog` info + simpan.
- [ ] 3.3 `ProjectModal` — saat mode `id:null` (Project Baru), tambah baris "Buat dari template" → pilih template → tombol "Terapkan" mengisi nama/deskripsi/kategori? Template simpan hanya milestones; saat simpan, project baru di-create dengan struktur milestones dari template (instantiate: semua node dapat `id: nid()`, checklist `id: nid()`, `isCompleted:false`, `hasPhoto:false`, `photoUrl` dihapus, `completedAt:null`, status milestone "Belum mulai").
- [ ] 3.4 `saveProject` — terima `milestones` dari template bila ada.
- Verifikasi: simpan template dari project ber-milestone → buat project baru dari template → struktur lengkap, checklist kosong ulang (isCompleted=false), id semua baru (cek via probe tidak ada key duplikat), foto tidak ikut (field photoUrl kosong).

## FASE 4 — Salin Checklist (fitur 9)

Target: `App.jsx`

- [ ] 4.1 `ChecklistModal` pasokan sumber: di modal TAMBAH (bukan edit) — tombol "Salin dari…" → panel kecil: select sumber "(a) Template", "(b) Project lain → Tahapan" (isi dropdown project aktif non-arsip, lalu tahapan punya checklist). Pilih → daftar item bisa dicentang → "Salin" menambahkan item ke milestone target: deep copy `{title, notes}` → `id:nid()`, `isCompleted:false`, `photoUrl:""`, `completedAt:null`.
- [ ] 4.2 Handler `addChecklist` lama TIDAK diubah — jalur baru lewat callback dari modal (akhiri dengan `onSave` yang sama? Bedakan: buat fungsi `importChecklistItems(milestoneId, items)` di `ProjectDetail` yang memanggil `updateMilestones`.
- Verifikasi: salin 2 item dari template → muncul sebagai 2 checklist baru belum selesai; salin dari project lain yang punya foto → foto tidak ikut (kosong).

## FASE 5 — Duplikasi cepat (fitur 4)

Target: `App.jsx`

- [ ] 5.1 `Dashboard` kartu menu: tombol ikon `Copy` (lucide `Copy`) di samping Edit (tidak di Trash). → `onDuplicate(p)`.
- [ ] 5.2 `App`: `duplicateProject(p)` — deep copy object, `id: crypto.randomUUID()`, `name: p.name + " (salinan)"`, `code` tetap/suffix, `status: "Ideation"` (agar tidak mengganggu data aktif), `startDate: todayStr()`, `archived:false`, `trashedAt:null`, reset semua `id` milestone/checklist/evaluasi ke `nid()`, checklist `isCompleted:false`, foto TIDAK ikut (photoUrl:"", hapus hasPhoto). `history` baru `[{…"Project diduplikasi"}]` bila fitur log sudah ada (urutan fase → di F9; di F5 cukup tanpa log, atau pasang `history:[]` kosong).
- [ ] 5.3 Pastikan `seedData`/rest tidak terpengaruh; toast "Tersimpan" otomatis muncul (state projects berubah).
- Verifikasi: duplikasi project 2× → 2 project baru status Ideation, checklist kosong, milestonenya lengkap; file foto di storage tidak digandakan (tidak ada panggilan upload). Hapus duplikat lewat Trash normal.

## FASE 6 — Alur status otomatis (fitur 2)

Target: `App.jsx` (derived — tanpa tulis-loop)

- [ ] 6.1 Helper `effectiveStatus(p)` (dekat helper tree):
  ```
  if (!p.autoStatus) return p.status;
  all = flattenMilestones(p.milestones);
  allDone = all.length>0 && all.every(m => m.status === 'Selesai');
  anyOverdue = all.some(m => m.targetDate && m.targetDate < todayStr() && m.status !== 'Selesai');
  return allDone ? 'Done' : anyOverdue ? 'At Risk' : p.status;
  ```
- [ ] 6.2 `ProjectModal` — checkbox "Status otomatis (target lewat → At Risk, semua selesai → Done)" → `autoStatus`.
- [ ] 6.3 Ganti pembacaan `p.status` untuk **tampilan** di `Dashboard`: kartu cfg (App.jsx:1097), `counts` (App.jsx:985-986), filter status (`statusFilter===f.key` harus cocok dengan nilai efektif), `comparators.status` → pakai `effectiveStatus`. Sort "Default" tetap.
- [ ] 6.4 `ProjectDetail` badge (App.jsx:1280, 1354) → `effectiveStatus`. Tambah chip kecil "⚠ Status otomatis aktif: {effectiveStatus}" di dekat badge.
- [ ] 6.5 `seedData` gunakan `autoStatus:false` default (tidak ditulis di seed, undefined = false via `!!p.autoStatus`).
- [ ] 6.6 PENTING anti-loop: TIDAK ada `useEffect` yang menulis `status`. Verifikasi konsol: setelah render, tidak ada save tambahan (hanya 1 write per perubahan user).
- Verifikasi: project autoStatus on, semua milestone Selesai → kartu tampil "Done" walau `status` tersimpan "On Track"; ProjectModal masih menampilkan nilai tersimpan; render probe: tidak ada request sync tambahan.

## FASE 7 — Timeline/Gantt (fitur 3)

Target: `App.jsx`

- [ ] 7.1 Komponen baru `TimelineView({ project })` (taruh sebelum `ReportView`). Data: `flattenMilestones` + kedalaman; rentang tanggal = min targetDate & startDate .. max(targetDate, today+30). Setiap milestone = 1 baris: label (indent depth), target, bar horizontal CSS — `left%` dari tanggal awal, `width%` = hingga tanggal selesai (atau targetDate; jika belum ada target → cukup label + "tanpa tanggal" grup bawah). Warna bar per status (Hijau=Selesai, primary=Berjalan, border/abu=Belum mulai, oranye=overdue). Garis vertikal "Hari ini". Legenda status.
- [ ] 7.2 `ProjectDetail` — tambah `TabsTrigger value="timeline"` + `TabsContent`; tab di antara Roadmap dan Laporan.
- [ ] 7.3 Pastikan tab lain tak terpengaruh: minimal probe klik tiap tab → 0 error.
- Verifikasi: project dengan 3 milestone target beda tanggal → bar tampil urut & proporsi benar; milestone tanpa target ada di grup bawah; proyek tanpa milestone → pesan kosong ramah.

## FASE 8 — Notifikasi internal + badge hub (fitur 5)

Target: `App.jsx` + shell hub 3 file (surgical)

- [ ] 8.1 Tulisan: pemijahan daftar alert belum dibaca:
  - key alert = `${p.id}:${m.id}:${kind}`.
  - `seenRef`/state dari `localStorage['rnd-seen-alerts']`.
  - `unseen = alerts.filter(a => !seen.includes(a.key))`; state `unseenCount`.
- [ ] 8.2 Topnav (App.jsx:868) — kanan: tombol lonceng (`Bell` lucide) + badge angka bila > 0; klik → dropdown panel (posisi fixed agar tak terguling layout; isi = daftar alerts belum dibaca: nama project + milestone + tanggal, klik buka project) + tombol "Tandai semua sudah dibaca".
- [ ] 8.3 Efek simpan: setiap `projects` berubah → hitung ulang `unseen` (tidak perlu tulis, cukup state) & tulis angka ke `localStorage['rnd-alert-count']` (selalu integer, 0 bila tak ada).
- [ ] 8.4 Clear tombol "Tandai semua": `seen = semua key alerts saat ini` → simpan ke localStorage → count 0.
- [ ] 8.5 Shell hub (surgical):
  - `src/components/tool-card.js` `createCard` — kalau `config.hash === '#productive/rnd-roadmap'`, tambahkan `<span class="card-badge" id="badge-rnd-roadmap" hidden></span>` di dalam card-top.
  - `src/styles/components.css` (dekati `.bento-card` L268) — style `.card-badge` (dot merah kecil / lingkaran angka, pakai token `--danger`).
  - `src/app.js` (setelah init) — `setInterval` 5 dtk baca `localStorage['rnd-alert-count']` → tampil/sembunyi + set teks pada `#badge-rnd-roadmap`. Bersihkan interval? tidak perlu (hidup seumur halaman).
- Verifikasi: 1 project overdue baru → app count 1 → hub (probe hub-probe) badge tampil "1"; klik "Ditandai dibaca" → count 0 → badge hilang; navigasi hub tidak rusak (probe render hub tetap berisi 11 kartu).

## FASE 9 — Log aktivitas & komentar (fitur 7)

Target: `App.jsx`

- [ ] 9.1 `App` — fungsi `logActivity(projectId, text, type='ubah')` → `updateProject(projectId, { history: [{id:nid(), at: new Date().toISOString(), type, text}, ...(existing||[])] })`. Pass ke `ProjectDetail` sebagai prop `onLog`.
- [ ] 9.2 Jejak di ProjectDetail (log singkat, jangan spam tiap ketik): add/edit/delete milestone, add/edit/delete checklist, toggle checklist, add evaluation, ubah status/target via modal project (harus via `onSave` saat edit → log di saveProject bila field berubah? cukup: saat Edit project disimpan dengan perubahan → log "Proyek diperbarui"). Batasi: jangan log perubahan ke-8.1 internal.
- [ ] 9.3 Tab baru "Aktivitas" di ProjectDetail (`TabsTrigger`) — daftar `history` terbaru di atas: tipe badge (ubah/komentar/hapus), waktu relatif (`X jam lalu`/`tanggal`), teks. Komposer komentar (Textarea + Kirim) → type 'komentar'.
- [ ] 9.4 `history` dibatasi maks 100 entri (slice) agar blob tidak membengkak.
- Verifikasi: toggle checklist → muncul "Item ditandai selesai: <judul>"; kirim komentar → muncul di daftar; data lama tanpa `history` tidak error (fallback `[]`).

## FASE 10 — Ringkasan mingguan (fitur 10)

Target: `App.jsx`

- [ ] 10.1 Helper `weeklyStats(projects)` (dekat helper stats) — 7 hari terakhir: (a) item checklist selesai baru (pakai `completedAt`), (b) milestone selesai baru (pakai `completedAt`), (c) jumlah milestone overdue aktif, (d) list item selesai terbaru (5).
- [ ] 10.2 `Dashboard` — kartu "Progres Minggu Ini" di bawah donut (baris summary): 3 angka (item selesai, milestone selesai, overdue aktif) + daftar 5 item terbaru (nama project — item). Tombol kecil "Cetak laporan mingguan" → buka window printable (varian `openPrintableReport` [project] tanpa markup berubah: panggil ulang dengan semua project aktif).
- [ ] 10.3 Jangan ubah `openPrintableReport` lama (fungsi dipakai ekspor per-project) — buat `openWeeklyReport(projects)` baru memakai pola yang sama.
- Verifikasi: seed punya `completedAt` lama (lewati batas 7 hari → 0) dan beberapa baru (cek benar); angka = hitungan manual 1 project contoh.

## FASE 11 — Regresi menyeluruh & build

- [ ] 11.1 Sweep: semua handler lama ada (grep fungsi inti: `saveProject`, `archiveProject`, `trashProject`, `recoverProject`, `permanentDeleteProject`, `updateProjectMilestones`, `addMilestone`, `editMilestone`, `deleteMilestone`, `addChecklist`, `editChecklist`, `toggleChecklist`, `deleteChecklist`, `addEvaluation`).
- [ ] 11.2 `npm run build` di `Productive/Project_develop` → `dist/index.html` satu file.
- [ ] 11.3 Probe CDP: dashboard light+dark (render, 0 console error, chip status), project detail (tabs, tambah checklist), modal baru (template/prioritas/tag), notifikasi dropdown, timeline view. Probe interaksi query/klik.
- [ ] 11.4 Probe hub: `#productive/rnd-roadmap` termuat; badge hub sesuai count.
- [ ] 11.5 Update `PROGRESS.md` + `PRODUCT.md` (capabilities bertambah).
- Kriteria terima: build hijau, 0 error di probe, semua fungsi lama utuh, file dist ~±100 KB dari baseline (pantau engorgement blob).

## FASE 12 — Verifikasi pengguna (setelah eksekusi)

- [ ] 12.1 User diminta cek cepat: buat project pake template, duplikasi, sort prioritas, tab Timeline, lonceng notifikasi, tab Aktivitas (komentar), kartu mingguan. 12.2 Laporkan ke user setiap bagian yang mengubah perilaku penyimpanan (tidak ada) dan bagian shell hub yang disentuh (3 file).

## Checklist web-gas-dev khusus paket ini

- [ ] Tidak menghapus kode lama (semua handler/gaya token tetap).
- [ ] Tidak ada tulis-loop (F2 display-only; verifikasi dengan probe count request).
- [ ] Semua teks/fitur baru respondif (probe viewport sempit).
- [ ] Token mist dipakai; tidak ada hex/warna baru (detector dijalankan F11).
- [ ] Api key/kredensial tidak ditambah; backend tidak disentuh (`git diff` cek hanya dir tool + 3 file shell).