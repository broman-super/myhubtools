# AGENT-07 — Admin Backoffice

> **Persona:** Admin backoffice yang upholding banyak data — master produk, arsip event lama, dan orang yang harus approve; bukan power user, tapi teliti dan sering salah pilih dropdown karena opsi mirip · **Fokus:** Master Barang, Master Produk, halaman Arsip, dan seluruh dropdown/selector · **Tanggal:** 2026-10-01

## Ringkasan

| Severity | Jumlah |
|---|---|
| KRITIS | 3 |
| TINGGI | 6 |
| SEDANG | 7 |
| RENDAH | 2 |
| **Total** | **18** |

Jawaban langsung atas pertanyaan saya ("kenapa saya tidak bisa mengubah master data atau mengarsipkan event?"):
**saya tidak bisa menghapus apa pun di Master Barang dan Master Produk**, karena tombol "Hapus" di dalam dialog konfirmasi literally
tidak melakukan apa-apa (BUG-01). Dan kalau saya berhasil mengubah status event, saya justru **merusak data approval** —
status "Disetujui" berubah jadi kosong atau "Draft" hanya karena saya menyimpan form tanpa sengaja menyentuh dropdown
(BUG-03, BUG-04). Dua bug ini yang paling mematikan bagi saya: satu membuat saya tidak bisa menghapus
apa pun sama sekali, satu lagi membuat saya menghancurkan approval orang lain tanpa saya sadari.

Di luar itu, Master Barang ternyata tidak bisa di-*rename* sama sekali (BUG-07), grup yang sudah saya hapus akan
muncul lagi sendiri begitu aplikasi dibuka ulang (BUG-02), dan halaman Arsip ternyata **bukan arsip** — dia cuma
salinan daftar event tanpa ada konsep "arsipkan" (BUG-13).

## Environment yang dipakai

- Edge headless (`--headless=new`), **profil unik per run** (`prof_agent07a..h`, `prof_agent07w`, `prof_agent07x`),
  `localStorage.clear()` di awal supaya dapat seed default.
- Harness HTML di `_QA_TMP/` (a07_master.html, a07_w2/w3.html, a07_x.html), hasil dibaca dari `--dump-dom` pada `<pre id="out">`.
  Catatan operasional: `setTimeout` tidak pernah dieksekusi di kombinasi `--headless=new --virtual-time-budget`, jadi
  harness saya berjalan sinkron (`location.hash = ...; SPT.reload()`).
- Rute yang diuji: `#/master`, `#/products`, `#/archive`, `#/events/evt-1`, `#/events/ev-d5`, `#/events/ev-d6`,
  `#/events`, `#/reports`.
- Skenario multi-run (wajib untuk menguji restore): hapus semua grup → tutup → **buka lagi dengan profil yang sama**
  → lihat apakah master benar-benar hilang.
- Kode aplikasi **tidak diubah** satu byte pun. Semua pengujian memakai klik/dispatch event sungguhan; satu-satunya
  pemanggilan API langsung (`store.deleteProduct`, `store.deleteItemCat`) saya tandai eksplisit karena jalur UI-nya
  terkunci BUG-01.

## Temuan

### [BUG-01] Tombol "Hapus" di semua dialog konfirmasi tidak melakukan apa-apa — tidak bisa menghapus master data — severity: KRITIS

**Persona dan use-case:** Saya mau Membersihkan Master Barang: ada grup "Alat Berat" yang salah kirim, dan saya mau hapus.
Saya klik "Hapus Grup", muncul dialog, saya baca teksnya, saya klik "Hapus" —dialog tetap di layar, tidak ada yang berubah.

**Langkah reproduksi:**
1. Buka `#/master`.
2. Klik tombol "Hapus Grup" pada salah satu kartu grup.
3. Dialog konfirmasi muncul, dua tombol: `modal:close`/"Batal" dan `modal:ok`/"Hapus".
4. Klik tombol **Hapus**.
5. Hitung ulang `store.itemCats().length` dan `store.itemTemplates().length`.

**Harapan:** Grup terhapus, toast "Grup dihapus" muncul, dialog menutup.

**Kenyataannya:** Tidak terjadi apa-apa. Dialog tetap terbuka. Jumlah grup dan item tidak berubah.

**Evidence:**
```
M-11 | klik Hapus Grup -> dialog konfirmasi muncul? = YA
       tombol di dialog: modal:close/Batal , modal:ok/Hapus
M-12 | key actions yg di-bind ui.confirm   = modalOk + modalClose
       key actions yg dipakai DOM         = modal:ok + modal:close
M-13 | typeof A.actions["modal:ok"] = function
       A.actions["modal:ok"] = function () { /* diganti oleh ui.confirm */ }
M-14 | setelah klik "Hapus" di dialog = grup 6->6, item 29->29
       dialog masih terbuka? YA (tombol Hapus tidak melakukan apa-apa)
P-14 | setelah klik Hapus di dialog: total penjualan global 25555000 -> 25555000
       produk masih ada? YA (tidak terhapus)
```
Akar masalahnya terlihat jelas di source: `js/ui.js:101` menuliskan `data-action="modal:ok"`, tapi `js/ui.js:104-105`
mendaftarkan callback-nya sebagai `A.actions.modalOk` / `A.actions.modalClose` (camelCase, tanpa titik dua), sedangkan
`js/actions.js:109` mendefinisikan `'modal:ok': function () { /* diganti oleh ui.confirm */ }` — fungsi kosong.
Jadi callback asli tersimpan di key yang tidak pernah dipanggil delegasi.

**Dampak ke pengguna awam:** Ini menutup *semua* jalur hapus yang pakai konfirmasi: Hapus Grup (master barang),
Hapus Produk, Hapus Event, Reset Data Dummy, Hapus Pengeluaran, Hapus milestone, Hapus lampiran dokumen.
Admin backoffice akan menekan tombol berulang kali, mengira aplikasinya hang, lalu menyerah dan mulai buat data
duplikat ("Kelistrikan 2", "Kelistrikan 3") supaya tidak perlu hapus. Persis seperti yang saya lakukan saat menguji (M-07).

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** samakan nama aksi — entah `ui.confirm` memasang
`data-action="modalOk"`/`"modalClose"`, atau `actions.js` mendefinisikan `'modal:ok'` dan `'modal:close'` sungguhan
serta `ui.confirm` menulis callback ke sana. Lebih baik lagi: jangan pakai registry global sama sekali, tapi
tombol dialog dibuat dengan `addEventListener` closure (`onclick = onOk`), supaya tiap dialog punya callback sendiri
dan bisaushed menampilkan judul tombol yang sesuai ("Hapus Produk" vs "Hapus Grup").

---

### [BUG-02] Master Barang yang sudah dihapus MUNCUL LAGI sendiri saat aplikasi dibuka ulang — severity: TINGGI

**Persona dan use-case:** Saya sudah rapikan master: hapus 5 grup bawaan yang tidak relevan untuk tugas saya, karena
saya mau mulai dari master yang bersih sendiri. Besok saya buka browser lagi untuk lanjut kerja.

**Langkah reproduksi:**
1. Jalankan harness `a07_w2.html` (profil baru): seed → `localStorage` terisi 5 grup + 29 item.
2. Hapus semua grup lewat `store.deleteItemCat()` untuk masing-masing id (disimulasikan lewat API karena UI-nya
   terkunci BUG-01).
3. Verifikasi isi `localStorage`: `itemCats=0, itemTemplates=0`.
4. **Tutup browser.** Jalankan harness `a07_w3.html` dengan **profil yang sama** dan tanpa `localStorage.clear()`
   (setara user menekan F5 / membuka browser besok).

**Harapan:** Master Barang tetap kosong, dan saya bisa membangun master sendiri dari nol.

**Kenyataannya:** Kelima grup bawaan dan 29 itemnya muncul lagi, seolah tidak pernah saya hapus.

**Evidence:**
```
RUN 1 (hapus semua grup)
W2-01 seed: grup=5 item=29
W2-02 setelah hapus semua grup, localStorage itemCats=0 itemTemplates=0

RUN 2 (buka lagi, tanpa clear — sama seperti F5)
R-01 localStorage SEBELUM load(): itemCats=0 itemTemplates=0
R-02 setelah load() di halaman BARU: grup=5 item=29
R-03 nama grup yang muncul lagi: Kelistrikan | Materi Promosi | Peralatan Stand | Alat Tulis & Admin | Keselamatan & Medis
R-07 kartu grup yang tampil di UI: 5 | tombol hapus item: 29
```
Penyebabnya `js/store.js:323-324` di dalam `load()`:
`if (!DB.itemCats || !DB.itemCats.length) DB.itemCats = builtinItemCats();` — "kOSong" dianggap "belum pernah di-set",
jadi dianggap perlu diisi default. Tidak ada flag yang membedakan "master memang kosong" dari "master belum ada".

**Dampak ke pengguna awam:** Goodbye, master kustom. Untuk admin yang hanya butuh satu grup sendiri (mis. hanya "Alat Berat"
untuk satu tugas), aplikasi **tidak mungkin** menyimpan master yang kosong. Tidak ada toast, tidak ada peringatan —
pengguna mengira data sudah hilang, lalu diam-diam memakai data bawaan yang salah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** pakai flag eksplisit, misalnya `db.masterInit = true` yang
di-set sekali saat pertama kali seed, danrowseUl hillside hanya isi default kalau flag itu belum ada — bukan berdasarkan
`length === 0`. Alternatif yang lebih aman untuk prototipe: beri tombol "Kembalikan Master Bawaan" di halaman
Master Barang, dan hapus auto-restore sama sekali.

---

### [BUG-03] Dropdown Status SPPD selalu menampilkan "Draft" dan menimpa status tersimpan saat "Simpan SPPD" — severity: KRITIS

**Persona dan use-case:** Saya masuk untuk mengoreksi satu typo di nomor surat SPPD event yang sudah **disetujui atasan**.
Saya buka seksi 01, koreksi satu karakter, klik "Simpan SPPD". Selesai. Lalu saya sadar — approval sudah hilang.

**Langkah reproduksi:**
1. Seed default, buka `#/events/evt-1`.
2. Baca status SPPD dari `localStorage` → `disetujui` (evt-1 memang sudah disetujui atasan, SPPD `039/SPPD/UKM/2026`).
3. Buka seksi 01 "SPPD & Dana Cair", baca nilai dropdown "Status Alur" → **`draft`**.
4. **Jangan sentuh dropdown.** Klik "Simpan SPPD".

**Harapan:** Status tetap "Disetujui".

**Kenyataannya:** Status turun menjadi `draft`. Dropdown itu tidak pernah menampilkan nilai yang benar.

**Evidence:**
```
D-01 | status SPPD evt-1 di localStorage = disetujui
       nilai yang TAMPIL di dropdown seksi 01 = draft
D-03 | status SPPD evt-1 sesudah klik "Simpan SPPD" (dropdown tidak disentuh)
       = disetujui -> draft
X-01 | status SPPD evt-1  = disetujui
X-03 | hero checks sebelum = ✓ SPPD lengkap  ✓ Produk dicatat  • Item persiapan dibawa ...
X-04 | status SPPD evt-1 SESUDAH = draft
X-06 | hero checks sesudah = • SPPD lengkap  ✓ Produk dicatat  • Item persiapan dibawa ...
X-07 | ringkasan seksi 01 di header = SPPD Draft · 2 rute · Dana cair Rp 1.500.000
```
Lihat `js/pages.js:471`: `<select id="spp-status" ...><option value="draft">Draft</option>...` — tidak ada atribut
`selected` dan tidak ada baris `sel.value = s.status` seperti yang dilakukan untuk `#ev-status` di `js/pages.js:165`.
 Sementara `js/actions.js:119` selalu menulis ulang `s.status = ui.readVal('spp-status')`.

**Dampak ke pengguna awam:** Ini yang paling "diam-diam" — tidak ada error, tidak ada toast peringatan, toast-nya
justru berbunyi "SPPD disimpan" (sukses). Akibatnya: cek "SPPD lengkap" di hero berubah dari hijau ✓ jadi merah •,
dan secara bisnis berarti SPPD yang sudah disetujui atasan kembali jadi draft tanpa jejak siapa yang mengubahnya.
Kalau tidak ada `updatedAt`/audit trail di SPPD, tidak ada yang bisa tahu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** (1) samakan nilai awal dropdown dengan data, entah lewat
atribut `selected` yang dihitung saat render atau `sel.value = s.status` sesudah element dibuat; (2) di `sppd:save`,
jangan pernah membaca field yang tidak berubah user — simpan `status` lama kalau field tidak ada di `formData`;
(3) kalau memang bisa diubah status, buat alur eksplisit (Draft→Diajukan→Disetujui) dengan konfirmasi +
`updatedAt` + nama siapa yang mengubah.

---

### [BUG-04] Modal Edit Event tidak punya opsi "Diajukan"/"Disetujui" — status event jadi STRING KOSONG — severity: KRITIS

**Persona dan use-case:** Yanguinangan saya adalah mengoreksi metadata event yang sudah full approval: saya ubah
lokasi dari "Venue Pameran, Lombok" jadi "Venue Pameran, Lombok (ruangBx)". Saya klik Simpan Perubahan.

**Langkah reproduksi:**
1. Seed default, buka `#/events/ev-d5` (status `disetujui`, catatannya "Semua approval lengkap, siap laporan.").
2. Klik tombol "Edit event".
3. Baca opsi dropdown "Status" dan nilainya.
4. Ubah **hanya** field Lokasi. Klik "Simpan Perubahan".

**Harapan:** Status tetap `disetujui`.

**Kenyataannya:** Status jadi string kosong `""`. Badge di kepala halaman berubah jadi titik bulat tanpa tulisan.

**Evidence:**
```
D-04 | opsi dropdown Status Event di modal Edit = draft,berjalan,selesai,dibatalkan  (jumlah=4)
D-05 | status yang dipakai data tapi TIDAK ada di dropdown = diajukan,disetujui
       status unik di DB: berjalan,draft,selesai,diajukan,disetujui
D-06 | status ev-d5 SEBELUM diedit = "disetujui"
D-07 | nilai dropdown Status Event saat modal dibuka = ""   (tidak ada <option> itu → value kosong)
D-08 | status ev-d5 SESUDAH Simpan Perubahan = "disetujui" -> ""
D-09 | badge status di kepala halaman = "●"   (label kosong)
D-09b| badge di halaman Event & Tugas: [..., "●&nbsp;Diajukan", ..., "●", ...]
       → event ev-d5 tampil dengan badge tanpa label
```
Sumber: `js/pages.js:157` — `<select id="ev-status">` hanya berisi 4 opsi, padahal `store.js` dan badge di
`js/ui.js:42-51` mengakui 6 status. `js/pages.js:165` menjalankan `sel.value = ev.status`, yaitu memberi nilai yang tidak ada
di daftar opsi → browser mengosongkan select.

**Dampak ke pengguna awam:** Event yang sudah disetujui atasan kehilangan statusnya setiap kali ada yang menyunting
nama/lokasi/tanggal. Di halaman Event & Tugas, badge-nya jadi bulatan kosong sehingga user bahkan tidak bisa
bertanya "ini status apa?". `ev-d2` (diajukan) punya masalah yang sama persis. Ini persis kejadian "orang yang harus approve"
yang saya tangani — dan saya justru merusak kelulusannya, bukan menyelesaikannya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** satu sumber kebenaran untuk daftar status
(mis. `store.EVENT_STATUS = [...]` dengan label + warna), lalu pakai daftar itu untuk dropdown event modal, filter
chip di halaman Event, filter Arsip, dan `ui.badge()`. Tambahkan guard di `event:save`: kalau `readVal('ev-status')`
kosong, tolak simpan dengan toast error, jangan tulis string kosong.

---

### [BUG-05] Hapus item Master Barang langsung jalan, tanpa konfirmasi sama sekali — severity: TINGGI

**Persona dan use-case:** Daftar item di grup "Kelistrikan" panjang. Saya mau bersihkan satu item yang salah ketik.
Klik "Hapus" — dan langsung hilang.

**Langkah reproduksi:**
1. Buka `#/master`, buat grup baru "Test", tambahkan item "Kabel rol 5m".
2. Klik "Hapus" pada item tersebut.
3. Hitung `store.itemTemplates().length` sebelum/sesudah dan hitung elemen dialog di `#modal-root`.

**Harapan:** Dialog konfirmasi muncul (bandingkan: Hapus **Grup** memang pakai konfirmasi).

**Kenyataannya:** Item hilang seketika, tidak ada dialog, tidak ada toast yang informatif (hanya "Item dihapus"),
tidak ada tombol Undo.

**Evidence:**
```
M-09 | tambah item ke grup baru = 1
M-10 | klik Hapus item -> dialog konfirmasi muncul? = TIDAK (langsung hapus)
       item sebelum=30 sesudah=29
```
Bandingkan `js/actions.js:70-74` (`master:itemdel` → langsung `store.deleteItemTemplate`) vs `js/actions.js:62-68`
(`master:catdel` → `ui.confirm`). Inkonsisten dalam satu halaman yang sama.

**Dampak ke pengguna awam:** Salah klik = master hilang permanen, dan karena master dipakai sebagai template checklist
di 9 event, koreksinya jauh lebih repot. Untuk orang yang "boring dan teliti", justru orang seperti saya yang paling
sering salah klik dan paling électrophobia menghapus tanpa sengaja.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** samakan semua aksi hapus lewat satu helper
`konfirmasiHapus({judul, pesan, dampak, onOk})`. Untuk item master, tampilkan dampak nyata: "Item ini sudah dipakai di
N event sebagai Item Persiapan" (data `store.prepItemByTemplate` sudah tersedia, jadi tidak sulit).

---

### [BUG-06] 29 item master "yatim" muncul diam-diam: tidak terlihat di UI dan tidak bisa dihapus — severity: TINGGI

**Persona dan use-case:** Saya tidak suka master bawaan. Saya hapus semua item dari semua grup tapi **mau menyisakan
satu grup** ("Alat Berat") supaya tidak kosong. Besok saya buka lagi untuk lanjut menambah item.

**Langkah reproduksi:**
1. Jalankan `a07_w3.html#write` dengan profil yang sama → tulis `localStorage` dengan `itemCats=[{nama:'Alat Berat'}]`,
   `itemTemplates=[]`.
2. Tutup browser, jalankan `a07_w3.html` lagi (tanpa clear).

**Harapan:** Master berisi 1 grup kosong, 0 item.

**Kenyataannya:** `itemTemplates` di-*restore* jadi 29 item — tapi `catId`-nya menunjuk grup `mcat-01..05` yang sudah
tidak ada. UI cuma menampilkan 1 kartu grup dengan 0 item dan **0 tombol hapus**, sementara 29 record]="menggantung"
di database tanpa bisa dihapus dari mana pun.

**Evidence:**
```
RUN 3  R-09 | localStorage diganti -> itemCats=[Alat Berat], itemTemplates=[]
RUN 4  R-01 | localStorage SEBELUM load(): itemCats=1 itemTemplates=0
       R-02 | setelah load(): grup=1 item=29
       R-03 | nama grup yang muncul: Alat Berat
       R-05 | item YATIM (grupnya tidak ada): 29
             -> Kabel rol / stop kontak, T-connector / stop kontak cabang, Lampu LED meja, Terminal listrik, Power bank cadangan, Adaptor / charger cadangan ...
       R-07 | kartu grup yang tampil di UI: 1 | tombol hapus item: 0
```
(Itu juga akar BUG-02: baris `js/store.js:323` dan `:324` dipanggil secara terpisah, jadi dua proses restore
bisa berjalan tidak sinkron — keduanya aktif hanya kalau array masing-masing kosong.)

**Dampak ke pengguna awam:** Data zombie. Tidak terlihat, tidak bisa dihapus, dan akan "muncul" lagi kalau grup dengan
id `mcat-01..mcat-05` suatu saat tercipta. Untuk admin yang mengaudit master, ini mimpi buruk tanpa tombol hapus.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** selain memperbaiki BUG-02, tambahkan *garbage collect* di
`load()`: buang `itemTemplates` yang `catId`-nya tidak ada di `itemCats` (dengan log/toast di mode debug), dan
sebaliknya buang `itemCats` yang tidak punya item kalau memang tidak dipakai.

---

### [BUG-07] Tidak ada cara mengubah (rename) grup atau item Master Barang sama sekali — severity: SEDANG

**Persona dan use-case:** Seed memberi saya grup "Alat Tulis & Admin". Kantor saya menanyakan alpanya berbeda: mau
ubah jadi "Administrasi & ATK". Saya buka Master Barang untuk mencari tombol Ubah.

**Langkah reproduksi:**
1. Buka `#/master`.
2. Inventarisasi semua `data-action` yang ada di halaman.

**Harapan:** Ada tombol "Edit" per grup dan per item, seperti di halaman Master Produk (yang punya Edit/Hapus).

**Kenyataannya:** Hanya 4 jenis aksi: tambah grup, hapus grup, tambah item, hapus item. **Nol** aksi ubah.
Satu-satunya "input" yang ada adalah 1 input tambah-item per grup (`id="mi-<catId>"`), bukan input ubah nama.

**Evidence:**
```
M-04 | daftar data-action di halaman master (4 jenis)
       {"master:catadd":1,"master:catdel":5,"master:itemadd":5,"master:itemdel":29}
M-05 | tombol edit/rename di halaman master = 0  → TIDAK ADA
M-06 | input nama item per item (bukan per grup) = 5  → hanya 1 input per grup, di atas daftar
```
Bandingkan halaman Produk: `data-action="product:edit"` tersedia untuk tiap baris (`js/pages2.js:740`).

**Dampak ke pengguna awam:** Salah ketik pada master = harus hapus (yang mustahil karena BUG-01) lalu buat ulang,
dan **semua item di dalam grup itu ikut hilang** karena cascade `deleteItemCat`. Jadi satu salah ketik =
menghapus 6 item sekaligus. Memalukan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** ubah nama jadi inline-edit — klik teks nama jadi
`contenteditable`/input, atau tombol pensil kecil di samping setiap item. `store.saveItemCat` dan
`store.saveItemTemplate` sudah mendukung update by-`id`, jadi tidak perlu kerja data layer baru.

---

### [BUG-08] Nama grup dan SKU produk boleh duplikat — opsi dropdown jadi tidak bisa dibedakan — severity: SEDANG

**Persona dan use-case:** Saya buat grup "Kelistrikan" karena tidak yakin grup itu sudah ada (saya tidak ingat).
Lalu masuk ke seksi 04 dan pilih item — sekarang ada dua checkbox dengan teks identik.

**Langkah reproduksi:**
1. Buka `#/master`, ketik "Kelistrikan" di kolom "Buat Grup Baru", klik "Buat Grup".
2. Hitung grup bernama "Kelistrikan".
3. Buka `#/products`, buat produk baru dengan nama "Batik Tulis Premium" dan SKU "BTC-1" (keduanya sudah dipakai).

**Harapan:** Ditolak dengan pesan "nama sudah dipakai", atau setidaknya ada penanda "(duplikat)".

**Kenyataannya:** Diterima begitu saja. Dua grup dengan nama identik, dua produk dengan nama & SKU identik.

**Evidence:**
```
M-07 | buat grup dengan nama yang sama = 6 (dari 5) | jumlah grup bernama Kelistrikan = 2
M-08 | id grup duplikat = mcat-01, id-muofixjo-f8v9rr (beda id, nama identik)
P-12 | produk baru tersimpan = total=9 | nama duplikat=2, SKU duplikat=2 (tidak ada validasi unik)
```
`js/store.js:701-713` (`saveItemCat`, `saveItemTemplate`) dan `js/actions.js:476-490` (`product:save`) tidak punya
cek unik sama sekali — satu-satunya validasi adalah "nama wajib diisi".

**Dampak ke pengguna awam:** Ini yang saya maksud "sering salah pilih dropdown karena opsi mirip". Di seksi 04,
baris konfirmasi menampilkan badge grup + nama item (`js/pages2.js:595-599`), jadi dua grup "Kelistrikan"
akan terlihat identik. Tidak ada cara tahu item itu milik grup yang mana. Untuk reagent/catalog dagangan,
dua produk "Batik Tulis Premium" di daftar penjualan = potential salah faktur.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** validasi unik (case-insensitive, trim) untuk `itemCats.nama`,
`itemTemplates.nama` per grup, `products.nama`, `products.sku`. Kalau tetap mau izinkan duplikat, minimal tampilkan
SKU di dalam teks `<option>` (sekarang hanya `p.nama`, tanpa SKU dan tanpa satuan).

---

### [BUG-09] Halaman Master Produk tanpa cari, filter, sort, atau pagination — severity: SEDANG

**Persona dan use-case:** Kantor saya punya katalog 60+ produk. Saya cuma mau lihat satu produk.

**Langkah reproduksi:**
1. Buka `#/products`.
2. Hitung jumlah `<select>`, `<input type=search>`, dan kata paginasi.

**Harapan:** Minimal ada kotak cari + filter status (aktif/nonaktif) + sortir kolom.

**Kenyataannya:** Nol. Satu tabel statis.

**Evidence:**
```
P-01 | baris produk di tabel = 8 | total produk di store = 8
P-02 | dropdown filter / input cari di halaman produk = 0 select, 0 search
P-04 | indikator pagination / jumlah data = 0  → user tidak tahu ada berapa produk
P-03 | judul kolom tabel produk = Produk | Satuan | Harga Jual | Stok Kantor | Status | (kosong)
```
Kolom Status memang ada (badge "aktif"/"nonaktif") tapi tidak bisa disaring — padahal justru filter yang paling akan dipakai admin.

**Dampak ke pengguna awam:** Daftar memanjang ke bawah tanpa ujung; tidak ada hitungan "menampilkan 8 dari 8".
Untuk katalog 60 produk, harus scroll jauh dan mencocokkan mata.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** tambahkan kotak cari (nama + SKU), filter chip status
(Semua/Aktif/Nonaktif), sortable header, dan paging sederhana (mis. 25 per halaman) dengan penanda
"Menampilkan 1–25 dari 60". Untuk list < 100 baris, paging tidak wajib; cari + filter sudah cukup.

---

### [BUG-10] Produk nonaktif tetap muncul di dropdown seksi 03 & 05, tanpa penanda apa pun — severity: SEDANG

**Persona dan use-case:** Produk "Minuman Herbal" sudah discontinue. Saya buka produknya, matikan centang
"Produk aktif", simpan. Harusnya produk itu hilang dari pilihan PIC.

**Langkah reproduksi:**
1. `#/products` → Edit "Minuman Herbal" → uncentang "Produk aktif" → Simpan. Pastikan `aktif=false`.
2. Buka `#/events/evt-1` → seksi 03 "Tambah Produk" → baca opsi `<select id="evp-produk">`.
3. Paksa produk itu masuk checklist, lalu baca opsi `<select id="sa-produk">` di seksi 05.

**Harapan:** Produk nonaktif tidak muncul, atau muncul dengan label "(nonaktif)".

**Kenyataannya:** Muncul dengan teks yang **persis sama** dengan produk aktif. Tidak ada bedanya sama sekali.

**Evidence:**
```
P-07 | set Minuman Herbal jadi nonaktif = aktif=false
P-08 | produk nonaktif (Minuman Herbal) di dropdown "Tambah Produk" seksi 03 = YA (masih muncul)
       opsi: Tenun Ikat | Totebag Kanvas | Kripik Pisang | Kerajinan Bambu | Minuman Herbal
P-10 | penanda nonaktif di dropdown? = TIDAK ADA — teksnya sama persis dengan produk aktif
P-09 | produk nonaktif di dropdown "Produk" seksi 05 = YA (masih muncul, tanpa penanda)
       opsi: Batik Tulis Premium (sisa 11) | Kopi Bubuk Premium (sisa 68) | Gantungan Kunci Kayu (sisa 38) | Minuman Herbal (sisa 1)
```
`js/pages2.js:43-45` (`avail`) dan `js/pages2.js:122-129` (pool penjualan) tidak memfilter `p.aktif`. Dan tidak ada
satu kalimat pun di halaman Produk yang menjelaskan arti flag "aktif" — jadi orang tidak tahu itu untuk apa.

**Dampak ke pengguna awam:** Flag "aktif" adalah kontrol yang sama sekali tidak berfungsi sebagai filter. Admin yang sudah tidak
menjual Batik masih bisa memilih Batik, dan tidak ada jejak bahwa produk itu nonaktif. Untuk dropdown, label
`(nonaktif)` saja sudah cukup memperbaiki 90% masalah.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** (1) di `products()` tambahkan teks penjelasan singkat
"Nonaktif = tidak muncul di pilihan checklist & penjualan event baru"; (2) di `avail`/`pool`, sertakan
`(nonaktif)` pada teks opsi, atau jangan tampilkan sama sekali kecuali produk itu sudah dipakai event tersebut;
(3) tombol cepat "Nonaktifkan" di baris tabel tanpa harus buka modal.

---

### [BUG-11] Filter halaman Arsip tidak pernah di-reset dan bertahan setelah pindah halaman — severity: TINGGI

**Persona dan use-case:** Saya set filter Status = Draft karena mau cek antrean approval. Then sayaMaryuk ke
Master Barang untuk bikin grup.uya filmmakers balik ke Arsip — dan hanya 2 event yang muncul. Saya kira datanya hilang.

**Langkah reproduksi:**
1. Buka `#/archive`, ubah dropdown Status ke `draft`.
2. Navigasi ke `#/products`.
3. Navigasi kembali ke `#/archive`.
4. Periksa jumlah baris, isi `#app select[data-key="status"]`, dan cari teks indikator "filter aktif".

**Harapan:** Kembali ke semua event, atau ada badge "Filter aktif: Draft" + tombol "Reset".

**Kenyataannya:** Tetap terfilter. Tidak ada indikator apa pun di mana pun di halaman. Filter disimpan di
`A.archiveState` yang tidak pernah di-reset oleh router.

**Evidence:**
```
A-15 | kembali ke Arsip setelah berpindah ke Produk = 2 baris
       A.archiveState masih = {"status":"draft","month":"","year":"q":""}
       select status di UI = draft
       baris: Sosialisasi UMKM Kota | Gelar UMKM Kota 2026
A-16 | apakah ada badge/indikator "filter aktif"? = TIDAK ADA  → user mengira datanya hilang
A-09 | reset manual semua dropdown = 9 baris
       tidak ada tombol Reset Filter di halaman: TIDAK ADA
A-20 | pencarian tanpa hasil (kata "zzz") = pesan "Tidak ada event yang cocok" muncul, TAPI...
       tombol reset? TIDAK ADA → harus pilih "Semua" di 3 dropdown + kosongkan kata secara manual
```
`js/pages.js:542` (`A.archiveState = A.archiveState || {...}`) tidak pernah di-reset; `js/app.js:47-77` (router)
tidak membersihkan state saat meninggalkan halaman.

**Dampak ke pengguna awam:** Ini pola klasik "data hilang". Admin yang tidak paham teknologi akan:
+ mengira aplikasinya rusak,
+ melapor ke helpdesk,
+ atau (lebih mungkin) mengosongkan localStorage dan kehilangan seluruh datanya sendiri.
Berat secara emosional dan berisiko kehilangan data.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** (1) reset `A.archiveState` saat hash berubah dari
`#/archive` ke halaman lain, **atau** (2) lebih baik: simpan filter di URL (`#/archive?status=draft`) supaya bisa
di-bookmark/dibagikan dan tombol Back browser bekerja; (3) tampilkan chip ringkasan
"Filter: Status Draft, Bulan Semua — 2 dari 9 event · [Reset]" kalau ada filter aktif.

---

### [BUG-12] Pencarian Arsip tidak mengincludeks nomor surat SPPD — severity: SEDANG

**Persona dan use-case:** Atasan saya minta laporan lama. Saya cuma ingat nomor suratnya: **039/SPPD/UKM/2026**.

**Langkah reproduksi:**
1. Buka `#/archive`.
2. Ketik `039/SPPD` di kolom "Cari kata", klik "Terapkan".

**Harapan:** Event Pameran UMKM Nusantara Expo 2026 muncul (nomor suratnya `039/SPPD/UKM/2026`).

**Kenyataannya:** 0 baris. Pencarian hanya meng-cover `nama + lokasi + jenis + peranPic`
(`js/pages.js:553-556`). Nomor surat ada di data tapi tidak dicari.

**Evidence:**
```
A-10 | cari kata "039/SPPD" (nomor surat) = 0 baris
       placeholder: "nama / lokasi / peran" — nomor SPPD tidak ikut dicari
A-11 | cari kata "Dinas" (field jenis, TIDAK disebut di placeholder) = 1 baris → Kunjungan Mitra Sektor
A-12 | cari kata "bali" (lokasi) = 1 baris (case-insensitive OK)
```
Catatan tambahan: placeholder-nya juga **tidak akurat** — app sebenarnya mencari `jenis` (A-11 berhasil) tapi
placeholder tidak menyebutnya. Jadi user bisa salah EXPECTASI dua arah: coba nomor surat (gagal) dan tidak tahu
bahwa "jenis-task" bisa dicari.

**Dampak ke pengguna awam:** Di backoffice, nomor surat adalah pengenal yang paling sering dipakai orang untuk
mencari dokumen. Tidak bisa dicari = harus buka tiap event satu-satu (9 event di seed, tapi nyata bisa 50+).

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** masukkan `sppd.noSurat` dan `sppd.tujuan` ke `hay`;
ganti placeholder jadi "nama / lokasi / nomor SPPD / peran"; dan tampilkan nomor surat di baris arsip supaya user
bisa sekaligus melihat pengenalnya (sekarang hanya lokasi + tanggal + saldo).

---

### [BUG-13] Halaman "Arsip" sebenarnya bukan arsip — tidak ada aksi apa pun untuk mengarsipkan — severity: SEDANG

**Persona dan use-case:** Saya sudah menutup semua event yang selesai, tapi saya tidak punya cara menandai mana yang
"tidak perlu dilihat lagi". Saya filter manual tiap kali.

**Langkah reproduksi:**
1. Inventarisasi `data-action` di halaman `#/archive`.
2. Cari aksi selain yang dealing filter.

**Harapan:** Ada konsep arsip: tombol "Arsipkan", kolom status "Diarsipkan", atau section terpisah
"Aktif / Selesai / Diarsipkan".

**Kenyataannya:** Satu-satunya aksi adalah `archive:set` (4 dropdown + tombol Terapkan) dan `nav:go` (nama event).
Tidak ada field `diarsipkan` di model data, tidak ada aksi arsip, tidak ada filter "hanya arsip". Arsip = daftar
event dengan sort + filter, identik secara data dengan halaman Event & Tugas.

**Evidence:**
```
A-01 | event di store vs baris di arsip = 9 vs 9 (arsip menampilkan SEMUA status)
A-02 | data-action di halaman arsip = archive:set, nav:go
       {"archive:set":4,"nav:go":9}
A-03 | tombol/aksi "arsipkan" (tandai arsip) = 0
       → TIDAK ADA — tidak ada konsep arsip terpisah dari status
A-17 | event di store tapi tidak tampil di Arsip = 0 (semua 9 tampil)
A-18 | jumlah baris arsip = 9 (tanpa pagination untuk list panjang)
```
Yang paling membingungkan: nama menunya "Arsip", tapi isinya juga daftar event aktif — `ev-d1` (draft, SPPD belum diisi) dan
`ev-d4` (berjalan) sama-sama tampil. Untuk orang yang datang mencari "arsip", melihat event draft baru masuk di halaman
"Arsip" itu membingungkan: apakah isinya sudah final atau belum?

**Dampak ke pengguna awam:** Tidak ada cara "membereskan" workspace. Setelah 2 tahun, halaman Arsip akan jadi
tumpukan 100+ event dengan tidak ada cara menyembunyikan yang noise. Ini yang membuat orang menyimpan "Event 2024 (lama)"
di kepala mereka.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** minimal tambahkan preset filter cepat ("Perlu approval",
"Selesai tahun ini", "Semua") dan tombol "Sembunyikan dari daftar aktif" yang menambah flag `arsip: true`
di level event — tanpa mengubah status bisnis. Alternatif yang lebih murah dan cukup untuk prototipe: rename menunya
jadi "Riwayat Event" supaya tidak menjanjikan fungsi yang tidak ada, dan tambahkan section "Sudah Closing"
di halaman Event & Tugas.

---

### [BUG-14] Event yang sudah Closing (Selesai) masih bisa diedit bebas, bahkan diturunkan ke Draft — severity: TINGGI

**Persona dan use-case:** Event "Pekan Inovasi Daerah" sudah selesai, laporan sudah disetor. Saya perlu buka untuk
ecksport SPPD saja — tapi saya juga perlu verify bahwa datanya sudah beku.

**Langkah reproduksi:**
1. Buka `#/events/ev-d6` (status `selesai`, `catatan: "Rampung, laporan disetor, saldo 0."`).
2. Hitung kontrol yang aktif di halaman.
3. Ubah "Qty Dibawa" Batik Tulis dari 80 → 999, klik "Simpan Perubahan".
4. Buka "Edit event", ubah Status ke Draft, klik "Simpan Perubahan".

**Harapan:** Event yang sudah closing minimal read-only, atau ada banner + konfirmasi kalau mau mengubah.

**Kenyataannya:** 181 kontrol aktif tanpa satu pun peringatan read-only. Qty diubah diam-diam, dan status closing
bisa diturunkan ke Draft tanpa konfirmasi.

**Evidence:**
```
D-10 | event ev-d6 (status Selesai) — kontrol aktif = 181
       tombol Edit event? YA | peringatan read-only? TIDAK ADA
D-11 | ubah Qty Dibawa di event yang sudah Closing = 80 -> 999
       penjualan event ini tetap Rp 7.500.000 → cross-check jadi tidak tuntas | konfirmasi? TIDAK ADA
D-12 | event Closing bisa dikembalikan jadi Draft? = selesai -> draft | tidak ada kunci/konfirmasi
```
Yang paling berbahaya adalah D-11: penjualan `sal-d6a` (Rp 7.500.000) tidak ikut berubah, jadi `store.epAnomali`
jadi negatif besar dan tabel cross-check seksi 07 langsung reports anomali — artinya **data yang sudahClosing jadi
tidak legitimate sendiri karena satu klik typos**.

**Dampak ke pengguna awam:** Pertanggungjawaban yang sudah disetor bisa "diubah" tanpa jejak siapa yang mengubah.
Kalau ada sengketa, tidak ada jejak audit yang menunjukkan kapan dan siapa yang mengubahnya.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** (1) kalau `ev.status === 'selesai'`, tampilkan banner
permanen "Event sudah Closing — perubahan akan tercatat di riwayat" dan **(2) wajibkan** setiap perubahan lewat
jalur reopen: "Buka Kembali Event" yang meminta alasan + mencatat `reopenedAt`/`reopenedBy`;
(3) sebagai jaring pengaman minimal: konfirmasi untuk perubahan qty/penjualan pada event selesai, dan baca
`store.eventProducts()` (bukan `p.qtyDibawa` yang bisa diedit bebas) saat menghitung anomali.

---

### [BUG-15] Hapus produk akan menghapus penjualan di 4 event lama tanpa menyebut jumlah — severity: TINGGI (perlu konfirmasi)

**Persona dan use-case:** Ada produk yang tidak relevan lagi. Saya klik "Hapus" dan dialog-nya hanya berbunyi
"Produk ikut terhapus dari checklist & penjualan event." — tanpa angka.

**Langkah reproduksi:**
1. `#/products` → klik "Hapus" pada Batik Tulis (`prd-1`).
2. Dialog muncul. Saya klik "Hapus" → **tidak terjadi apa-apa** (BOSS BUG-01).
3. Untuk membuktikan risikonya, saya panggil `store.deleteProduct('prd-1')` langsung (jalur UI tidak bisa dicapai).

**Harapan:** Konfirmasi menyebut Impact: "5 transaksi penjualan di 4 event, total Rp 17.750.000, akan hilang dari
Rekap Global dan Cetak Laporan".

**Kenyataannya:** `deleteProduct` menghapus `products`, `eventProducts`, **dan `sales`** untuk semua event tanpa
batas waktu — termasuk event yang sudah Closing.

**Evidence:**
```
P-13 | klik Hapus produk -> dialog? = YA
       jumlah transaksi yg akan hilang = 5 | event = 4 | nominal = 17750000
P-14 | setelah klik Hapus di dialog: total penjualan global 25555000 -> 25555000 (produk tidak terhapus)
P-15 | cascade delete via store.deleteProduct(): 25555000 -> 7805000
       hilang 17750000 dari Rekap Global; transaksi hilang = 5
       (baris eventProducts yang ikut hilang: evt-1, ev-d3, ev-d5, ev-d6 — 4 event)
```
Sumber: `js/store.js:414-419`.

**Dampak ke pengguna awam:** Kalau BUG-01 diperbaiki tanpa memperbaiki konfirmasi ini, admin bisa menghapus satu
produk dan **langsung menghilangkan Rp 17.750.000 dari seluruh laporan keuangan**, termasuk dari event yang sudah
telah closing dan disetor. Tidak ada undo, tidak ada backup otomatis. Ini bom waktu.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** dialog konfirmasi harus menghitung dan menampilkan
impact nyata (jumlah transaksi, total nominal, daftar event yang terdampak — dengan menandai yang status `selesai`
secara khusus). Kalau produk sudah dipakai di event yang closing, blok penghapusan dan tawarkan alternatif
"Nonaktifkan" (BUG-10) atau arsipkan produk. Tambahkan juga "Undo 30 detik" untuk semua operasi cascade.

---

### [BUG-16] Satuan produk diabaikan di Rekap Global — "pack"/"botol" ditulis sebagai "pcs" — severity: RENDAH

**Persona dan use-case:** Rekap Global dipakai untuk lapor ke atasan. Kopi Bubuk Premium satuan `pack`,
saya jual 75 pack, tapi laporan tulis "75 pcs".

**Langkah reproduksi:**
1. Seed default. Buka `#/products` — Kopi Bubuk Premium satuan = `pack`, Minuman Herbal satuan = `botol`.
2. Buka `#/reports`, baca blok "Penjualan per Produk".

**Harapan:** "75 pack" dan "15 botol".

**Kenyataannya:** Semua ditulis "pcs".

**Evidence:**
```
A-21 | satuan di Rekap Global untuk produk satuan "pack"
       = Kopi Bubuk Premium75 pcsRp 2.625.000 ...
       (di halaman Produk satuan Kopi Bubuk = "pack")
A-22 | "Minuman Herbal" tidak muncul di blok itu — qty 0 di seed, jadi tidak terlihat (perlu konfirmasi)
```
Sumber: `js/pages2.js:780` (`rep.byProduct[k].qty + ' pcs'`) dan `js/pages2.js:152` (rekap seksi 05).
Kolom "Satuan" di halaman Produk sudah ada, tapi tidak pernah dipakai di mana pun saat render rekap.

**Dampak ke pengguna awam:** Untuk UMKM yang jual per pack/botol/box, laporan ke.instansi terlihat salah satuan.
Angka rupiahnya benar, jadi tidak "~kerugian", tapi tetap bahan untuk dikoreksi dan merusak kredibilitas.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** pakai `p.satuan` dari master produk pada semua rekap
(`Penjualan per Produk` di Rekap Global dan rekap seksi 05). Karena `p` sudah diambil di kedua tempat,
perbaikannya satu baris. Kalau produk dihapus (jadi `p` undefined), tampilkan "—".

---

### [BUG-17] Pilihan checklist di seksi 04 bocor lintas halaman, dan item yang dihapus dari master tetap ikut dihitung — severity: SEDANG

**Persona dan use-case:** Saya centang satu item master untuk event yang sedang saya kerjakan. Teringat ada yang
salah, saya mampir ke Master Barang untuk menghapus item itu.-balik ke event.

**Langkah reproduksi:**
1. `#/events/evt-1` → seksi 04 → centang "Power bank cadangan". Tombol menjadi "Simpan ke Item Persiapan (1)".
2. Pergi ke `#/master` → klik "Hapus" pada item itu (berhasil, tanpa konfirmasi — BUG-05).
3. Balik ke `#/events/evt-1` seksi 04.

**Harapan:** Pilihan yang item master-nya sudah dihapus hilang dari daftar, dan hitungan di tombol ikut turun.

**Kenyataannya:** Daftar konfirmasi kosong (0 baris), tapi tombol tetap menulis "(1)". `A.bringSel` masih memegang
`mtpl-05` yang sudah tidak ada. Klik tombolnya → **0 item** tersimpan, tapi toast bilang
"Item sudah tercatat di Item Persiapan" — penjelasan yang salah dan membuat orang mengira memang sudah ada.

**Evidence:**
```
S-01 | setelah centang 1 item master = "Simpan ke Item Persiapan (1)" | baris konfirmasi: 1
S-03 | setelah klik Hapus di Master (tanpa konfirmasi) = terhapus
S-04 | kembali ke seksi 04: tombol = "Simpan ke Item Persiapan (1)"
       item yang tercatat di daftar konfirmasi: 0 | A.bringSel = {"mtpl-05":1}
S-05 | toast setelah klik simpan = "Item sudah tercatat di Item Persiapan" | prepItems evt-1 = 3 (tidak bertambah)
```
Sumber: `js/pages2.js:591-593` (baris `''` untuk template yang hilang, tapi `selKeys.length` tetap dipakai di
tombol baris 610) dan `js/actions.js` `bring:commit` yang `return` diam-diam kalau `tpl` tidak ditemukan.

**Dampak ke pengguna awam:** Pengguna menekan tombol, melihat toast sukses, padahal **tidak ada yang disimpan**.
Untuk orang yang menghitung daftar barang bawaan sebelum berangkat, ini berarti barang bawaan lupa dicatat — dan sekali
tidak ada toast error yang mencurigakan.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** (1) saat render, buang key `A.bringSel` yang template-nya
sudah tidak ada (`A.bringSel` di-reset per event juga); (2) tombol harus memakai jumlah **yang valid**;
(3) kalau `n === 0` tapi `keys.length > 0`, toast harus error ("item yang dipilih sudah tidak ada di Master") —
bukan "sudah tercatat".

---

### [BUG-18] Tekan Enter di kolom "Cari kata" tidak melakukan apa-apa — severity: RENDAH

**Persona dan use-case:** Saya isi kata kunci lalu langsung tekan Enter, seperti di Google.

**Langkah reproduksi:**
1. `#/archive`, ketik `solo` di "Cari kata".
2. Tekan Enter.

**Harapan:** Filter langsung dijalankan (saya sudah di 9 baris).

**Kenyataannya:** Tidak ada apa-apa. Harus klik tombol "Terapkan".

**Evidence:**
```
A-14 | tekan Enter di kolom "Cari kata" = 9 baris (tidak berubah dari 9)
       tidak ada handler keydown -> harus klik tombol Terapkan
```
Bandingkan: `js/pages.js:588` memakai `<input id="ar-q" class="input w-full">` di luar `<form>`, dan tidak ada
listener `keydown` di seluruh aplikasi untuk input ini.

**Dampak ke pengguna awam:** Rendah, tapi annoying — dan karena form-nya bukan `<form>`, beberapa user akan menekan
Enter 2–3 kali sambil mengira aplikasinya hang — gejala yang sama seperti BUG-01.

**Usulan perbaikan (deskriptif, jangan diimplementasikan):** bungkus blok filter dalam `<form onsubmit>` dengan
`type="submit"` pada tombol Terapkan, plus fokus otomatis ke kolom "Cari kata" saat halaman Arsip dibuka.

---

## Yang sudah bagus (agar tidak hilang saat refactor)

- **Arsip benar-benar menampilkan semua event, tidak ada yang hilang.** 9/9 muncul; tidak ada bug "data lama tidak
  tampil di halaman" yang saya khawatirkan (A-01, A-17).
- **Sort Arsip benar**: descending `tanggalMulai`, dari "Pekan Inovasi Daerah" (2026-12-01) sampai
  "Bazar Ramadan Ceria 2026" (2026-03-02) (A-04).
- **Kombinasi filter status + bulan bekerja**: Status=Selesai → 2 baris; Status=Selesai+Bulan=Mar → 1 baris
  ("Bazar Ramadan Ceria 2026") (A-05, A-08).
- **Pencarian case-insensitive** dan cepat: `bali` → 1, `Dinas` → 1 (A-11, A-12).
- **Klik nama event di Arsip benar-benar navigasi** ke Layar Kerja (A-19).
- **Edit Master Produk berfungsi sempurna**: form ter-prefill lengkap (`nama/sku/satuan/harga/stok/aktif`),
  perubahan tersimpan, modal menutup (P-05, P-06).
- **Validasi nama produk wajib diisi bekerja** — tidak ada produk kosong yang masuk (P-11).
- **Hapus Grup benar-benar mengcascade item-nya** — tidak ada item yatim setelah hapus grup (M-18 = 0 yatim,
  saat UI-nya masih bisa jalan). Ini foundation yang bagus; hanya perlu di-pakai juga saat item dihapus satu-satu.
- **Tombol "Batal" di dialog konfirmasi berfungsi** dan menutup dengan benar (M-15) — jadi user punya jalan keluar
  dari dialog yang macet (BUG-01), meskipun tidak bisa menyelesaikan aksinya.
- **Cascade `deleteEvent` bersih** — menghapus event juga membuang SPPD, transport, produk event, penjualan,
  pengeluaran, milestone, kasAdj, danaCair, prepItems-nya (`js/store.js:366-379`).
- **Label status event sudah punya warna konsisten** dan badge nonaktif/nonaktif produk di tabel Produk pakai
  warna hijau/merah yang jelas (`js/pages2.js:739`).

## Pertanyaan terbuka / perlu konfirmasi

- **Apakah "Produk aktif" memang semestinya tidak memengaruhi dropdown?** Tidak ada teks penjelasan di
  halaman Produk. Kalau memang tidak berisiko, tolong diberi keterangan; kalau berisiko, ini jadi
  bug (BUG-10) yang perlu diperbaiki bersama tim.
- **Apakah restore otomatis `itemCats`/`itemTemplates` (BUG-02) disengaja sebagai "pemulihan default"?** Kalau
  ya, harus ada toast yang bilang "Master Barang dipulihkan ke bawaan" — kalau tidak, harus dihapus.
- **Siapa pemilik CONFIRM dialog yang benar?** BUG-01 bisa diperbaiki di dua tempat (`ui.js` atau `actions.js`).
  Perlu diputuskan di level produk dulu supaya tidak bentrok dengan temuan agent lain.
- **Event `ev-d5` yang statusnya sudah `""` — apakah ada alur approval di luar aplikasi ini (mis. Google Form/email)?**
  Kalau iya, tool ini mungkin tidak boleh menulis status event sama sekali dari UI backoffice.
- **Produk nonaktif + item master yatim: apakah perlu "Arsip" untuk master (soft-delete) seperti di event?** Ini
  akan menyelesaikan BUG-05, BUG-06, dan BUG-15 sekaligus.
- **Berapa batas realistis jumlah produk & event di prototyping ini?** Kalau nanti ada 50 produk dan 30 event, BUG-09
  (tanpa cari/paginasi) dan BUG-13 (arsip bukan arsip) akan jadi masalah harian, bukan cosmetic.

## Skor pengalaman (1-5)

| Aspek | Skor | Alasan |
|---|---|---|
| Menambah master data baru (grup/item/produk) | 3 | Tambah cepat dan jelas (M-09, P-12), tapi tanpa validasi unik dan bisa langsung bikin duplikat yang membingungkan (M-07, P-12). |
| Mengubah / rename master data | 1 | Tidak ada jalur sama sekali di Master Barang (M-05 = 0 tombol ubah). Satu-satunya "perbaikan" adalah hapus+buat ulang — dan hapus tidak bisa dipakai (BUG-01, BUG-07). |
| Menghapus master data | 1 | Konfirmasi untuk grup tidak bisa dikonfirmasi (BUG-01); item dihapus tanpa konfirmasi (BUG-05); kalau dihapus semua, datanya balik sendiri (BUG-02). Tiga lapis masalah di satu task sederhana. |
| Halaman Arsip sebagai alat cari arsip lama | 2 | Sort & filter status/bulan jalan, tapi tidak bisa cari nomor surat, filter tidak pernah di-reset dan tidak ada indikator (BUG-11, BUG-12), dan "Arsip" sebenarnya bukan arsip (BUG-13). |
| Membuka event yang sudah Closing | 2 | Bisa dibuka dan dibaca tanpa masalah, tapi 181 kontrol aktif tanpa read-only — sekali salah ketik, laporan yang sudah disetor jadi tidak valid (BUG-14). |
| Dropdown yang "mirip" | 2 | Produk nonaktif & produk aktif tampil identik (BUG-10); grup duplikat menghasilkan dua checkbox dengan teks sama (BUG-08); teks `<option>` tidak pernah menampilkan SKU/satuan (BUG-08, BUG-16). Persis keluhan saya di persona. |
| Kepercayaan diri terhadap data setelah salah klik | 1 | Dua dropdown status bisa merusak/menghapus status approval tanpa warning (BUG-03, BUG-04); hapus produk diam-diam menghapus Rp 17.750.000 dari 4 event (BUG-15); checklist bisa "sukses" padahal 0 item tersimpan (BUG-17). |
| Keseluruhan untuk admin backoffice | 2 | Tampilan rapi dan dokumen selalu menampilkan semua data dengan benar, tapi **tindakan**-nya yang payah: sebagian besar aksi hapus/ganti gagal diam-diam dan sebagian merusak status. |