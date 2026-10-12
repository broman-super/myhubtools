# TEST_SCENARIOS.md
Skenario testing end-to-end untuk **Fieldwork & Event Booth Webtools**.

---

## 📋 Cara Menggunakan Dokumen Ini

1. Jalankan test secara berurutan (Flow 1 → Flow 5)
2. Centang `[x]` setiap test yang **PASS**
3. Catat bug/issue di bagian **Bug Report**
4. Pastikan semua **Critical** tests pass sebelum deploy

**Priority Legend:**

- 🔴 **Critical** - Harus pass, blocking deployment
- 🟡 **High** - Penting, harus pass sebelum production
- 🟢 **Medium** - Nice to have, bisa ditunda
- 🔵 **Low** - Minor, cosmetic issue

---

## 🧪 FLOW 1: Create Event

### Test 1.1: Create Event - Happy Path 🔴 Critical **Deskripsi:** Membuat event baru dari Dashboard

**Steps:**

1. Buka Dashboard (`/`)
2. Klik tombol "+ Buat Event Baru"
3. Modal muncul
4. Isi form:
  - Nama: "Test Event 2026"
  - Tanggal: "2026-10-15"
  - Lokasi: "Jakarta"
5. Klik "Simpan"

**Expected Result:**

- [ ] Modal tertutup
- [ ] Redirect ke halaman Detail Event
- [ ] Event muncul di list dengan status "draft"
- [ ] Progress bar menunjukkan 0%
- [ ] Data tersimpan di Supabase (tabel `events`)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 1.2: Create Event - Validasi Input 🔴 Critical **Deskripsi:** Validasi form tidak boleh kosong

**Steps:**

1. Buka modal "Buat Event Baru"
2. Kosongkan semua field
3. Klik "Simpan"

**Expected Result:**

- [ ] Form tidak submit
- [ ] Error message muncul di field yang kosong
- [ ] Modal tetap terbuka

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 1.3: Create Event - Mobile UX 🟡 High **Deskripsi:** Test create event di HP

**Steps:**

1. Buka di HP (Chrome DevTools mobile emulation)
2. Klik "+ Buat Event Baru"
3. Isi form
4. Submit

**Expected Result:**

- [ ] Modal full-screen di mobile
- [ ] Input field mudah di-tap (min-height 48px)
- [ ] Keyboard tidak menutupi input
- [ ] Tombol submit mudah dijangkau jempol

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## 🧪 FLOW 2: Create Trip + Auto-Generate Checklist

### Test 2.1: Create Trip - Happy Path 🔴 Critical **Deskripsi:** Menambahkan perjalanan dinas baru

**Steps:**

1. Di halaman Detail Event, klik "+ Tambah Perjalanan Baru"
2. Isi form:
  - Tipe: "Execution"
  - Tanggal mulai: "2026-10-14"
  - Tanggal selesai: "2026-10-17"
  - Personnel: "Budi, Ani"
3. Klik "Simpan"

**Expected Result:**

- [ ] Redirect ke halaman Checklist Step 1
- [ ] 24 checklist items ter-generate (6 per kategori)
- [ ] Status trip: "draft"
- [ ] Data tersimpan di Supabase (tabel `trips` & `checklist_items`)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 2.2: Verify Checklist Template 🟡 High **Deskripsi:** Memastikan 24 items ter-generate dengan benar

**Steps:**

1. Buka halaman Checklist
2. Cek setiap step (Dokumen, Logistik, Keberangkatan, Laporan)

**Expected Result:**

- [ ] Step 1 (Dokumen): 6 items
- [ ] Step 2 (Logistik): 6 items
- [ ] Step 3 (Keberangkatan): 6 items
- [ ] Step 4 (Laporan): 6 items
- [ ] Total: 24 items
- [ ] Urutan sesuai template (order_index)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## 🧪 FLOW 3: Fill Checklist + Upload Photo

### Test 3.1: Check Checklist Item 🔴 Critical **Deskripsi:** Menandai item sebagai selesai

**Steps:**

1. Di Step 1, centang item pertama: "SPPD dibuat dan ditandatangani"
2. Tunggu 500ms (auto-save)

**Expected Result:**

- [ ] Checkbox tercentang (animasi fade-in)
- [ ] Teks menjadi strikethrough
- [ ] Field catatan muncul
- [ ] Progress bar update (misal: 1/6 = 16%)
- [ ] Data tersimpan di Supabase (`is_checked: true`, `checked_at: timestamp`)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 3.2: Add Notes to Checklist Item 🟡 High **Deskripsi:** Menambahkan catatan pada item yang di-check

**Steps:**

1. Centang item "SPPD dibuat dan ditandatangani"
2. Ketik catatan: "Sudah ditandatangani Pak Direktur"
3. Tunggu 500ms

**Expected Result:**

- [ ] Catatan tersimpan di Supabase (field `notes`)
- [ ] Catatan muncul saat reload halaman

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 3.3: Upload Photo - Desktop 🟡 High
**Deskripsi:** Upload foto dari desktop

**Steps:**

1. Centang item "Booking tiket pesawat/kereta" (requires_attachment: true)
2. Klik tombol upload foto
3. Pilih file JPG dari komputer
4. Tunggu upload selesai

**Expected Result:**

- [ ] Loading indicator muncul saat upload
- [ ] Thumbnail foto muncul setelah upload
- [ ] Foto tersimpan di Google Drive (folder: `Fieldwork Webtools/Attachments/Photos/`)
- [ ] URL tersimpan di Supabase (field `attachment_url`)
- [ ] Link foto bisa dibuka di tab baru

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 3.4: Upload Photo - Mobile (Camera) 🔴 Critical **Deskripsi:** Upload foto langsung dari kamera HP

**Steps:**

1. Buka di HP
2. Centang item "Boarding pass tersimpan"
3. Klik tombol upload foto
4. Pilih "Camera" (bukan "Photo Library")
5. Ambil foto
6. Tunggu upload selesai

**Expected Result:**

- [ ] Kamera HP terbuka langsung
- [ ] Foto bisa diambil
- [ ] Upload berhasil
- [ ] Thumbnail muncul
- [ ] URL tersimpan di Supabase

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 3.5: Navigate Between Steps 🟡 High
**Deskripsi:** Navigasi antar step checklist

**Steps:**

1. Di Step 1, centang minimal 1 item
2. Klik "Selanjutnya"
3. Pindah ke Step 2
4. Klik "Kembali"

**Expected Result:**

- [ ] Tombol "Selanjutnya" aktif jika minimal 1 item di-check
- [ ] Progress per step update
- [ ] Data tidak hilang saat pindah step
- [ ] Step indicator update (active step highlighted)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 3.6: Auto-Save Debounce 🟢 Medium
**Deskripsi:** Memastikan auto-save tidak spam request

**Steps:**

1. Centang 3 item berturut-turut dengan cepat
2. Buka Network tab di DevTools
3. Cek request ke GAS

**Expected Result:**

- [ ] Hanya 1 request yang terkirim (debounce 500ms)
- [ ] Tidak ada request duplikat
- [ ] Semua 3 item tersimpan di Supabase

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## 🧪 FLOW 4: Generate PDF Report

### Test 4.1: Generate PDF - Happy Path 🔴 Critical **Deskripsi:** Generate laporan akhir trip

**Steps:**

1. Di Step 4, pastikan semua item sudah di-check
2. Klik "Generate Laporan Akhir"
3. Tunggu proses selesai

**Expected Result:**

- [ ] PDF ter-download otomatis
- [ ] PDF muncul di Google Drive (folder: `Fieldwork Webtools/Attachments/Documents/`)
- [ ] Metadata tersimpan di tabel `documents`
- [ ] Status trip berubah menjadi "completed"
- [ ] Redirect ke halaman Detail Event
- [ ] Progress event update

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 4.2: PDF Format Verification 🟡 High **Deskripsi:** Memastikan format PDF sesuai standar

**Steps:**

1. Buka PDF yang baru di-generate
2. Cek konten

**Expected Result:**

- [ ] Format A4 portrait
- [ ] Header: Logo perusahaan, judul dokumen, nomor SPPD
- [ ] Section: Data Event, Data Trip, Personnel
- [ ] Table checklist dengan kolom: No, Item, Status, Catatan, Bukti
- [ ] Footer: Tanggal generate
- [ ] Tidak ada warna-warni (hitam putih, formal)
- [ ] Font terbaca jelas

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 4.3: PDF Link Accessible 🟡 High
**Deskripsi:** Memastikan link PDF bisa dibuka

**Steps:**

1. Di halaman Detail Event, scroll ke section "Dokumen Tergenerate"
2. Klik link PDF

**Expected Result:**

- [ ] PDF terbuka di tab baru
- [ ] Bisa di-download
- [ ] Permission: "Anyone with link can view"

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## 🧪 FLOW 5: Archive & Search

### Test 5.1: View Archive 🔴 Critical
**Deskripsi:** Melihat daftar event yang sudah selesai

**Steps:**

1. Klik menu "Arsip" di navbar
2. Tunggu data load

**Expected Result:**

- [ ] Hanya event dengan status "completed" atau "archived" yang muncul
- [ ] Event "draft" dan "in_progress" tidak muncul
- [ ] List terurut berdasarkan tanggal (terbaru dulu)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 5.2: Filter Archive by Month 🟡 High **Deskripsi:** Filter arsip berdasarkan bulan

**Steps:**

1. Di halaman Arsip, klik dropdown "Bulan"
2. Pilih "Oktober"
3. Tunggu filter apply

**Expected Result:**

- [ ] Hanya event di bulan Oktober yang muncul
- [ ] Filter real-time (tanpa reload halaman)
- [ ] URL update dengan query parameter (opsional)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 5.3: Search Archive 🟡 High
**Deskripsi:** Pencarian event berdasarkan nama

**Steps:**

1. Di halaman Arsip, ketik "UMKM" di search box
2. Tunggu 300ms (debounce)

**Expected Result:**

- [ ] Hanya event dengan nama mengandung "UMKM" yang muncul
- [ ] Search case-insensitive
- [ ] Real-time filter (debounce 300ms)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test 5.4: Open Document from Archive 🟢 Medium **Deskripsi:** Buka dokumen PDF dari halaman arsip

**Steps:**

1. Di halaman Arsip, klik event
2. Klik dokumen PDF

**Expected Result:**

- [ ] Detail event muncul (expand atau navigate)
- [ ] List dokumen PDF muncul
- [ ] Klik dokumen → terbuka di tab baru

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## ## 🧪 Api Endpoint Testing

### Test API.1: Get Events 🔴 Critical
**cURL:**
```bash
curl -X POST "https://script.google.com/macros/s/XXXXX/exec" \ -H "Content-Type: application/json" \ -d '{"action":"get_events","token":"your-token"}' ```

**Expected Result:**

- [ ] Response: `{"success": true, "data": [...]}`
- [ ] Data berisi array of events
- [ ] Setiap event punya field: id, event_name, event_date, location, status, progress

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test API.2: Invalid Token 🔴 Critical
**cURL:**
```bash
curl -X POST "https://script.google.com/macros/s/XXXXX/exec" \ -H "Content-Type: application/json" \ -d '{"action":"get_events","token":"wrong-token"}' ```

**Expected Result:**

- [ ] Response: `{"success": false, "error": "Unauthorized"}`
- [ ] HTTP status: 401

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test API.3: Upload File 🔴 Critical
**cURL:**
```bash
curl -X POST "https://script.google.com/macros/s/XXXXX/exec" \ -H "Content-Type: application/json" \ -d '{ "action":"upload_file", "token":"your-token", "trip_id":"uuid-trip-1", "file_name":"test.jpg", "file_data":"base64-string...", "file_type":"image/jpeg" }' ```

**Expected Result:**

- [ ] Response: `{"success": true, "file_id": "...", "file_url": "..."}`
- [ ] File muncul di Google Drive
- [ ] File permission: "Anyone with link can view"

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## ## 🧪 Mobile Ux Testing

### Test UX.1: Touch Target Size 🔴 Critical
**Deskripsi:** Semua tombol & interactive elements mudah di-tap

**Steps:**

1. Buka di HP
2. Coba tap semua tombol, checkbox, link

**Expected Result:**

- [ ] Semua tombol min-height 48px
- [ ] Checkbox min 24x24px (touch area 44x44px)
- [ ] Tidak ada accidental tap
- [ ] Jempol bisa reach semua tombol

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test UX.2: Input Zoom Prevention 🔴 Critical **Deskripsi:** Input field tidak auto-zoom di iOS

**Steps:**

1. Buka di iPhone (Safari)
2. Tap input field

**Expected Result:**

- [ ] Font size minimal 16px
- [ ] Tidak ada auto-zoom
- [ ] Keyboard muncul dengan benar

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test UX.3: Responsive Layout 🟡 High
**Deskripsi:** Layout adaptif di berbagai ukuran layar

**Steps:**

1. Test di berbagai ukuran:
  - Mobile: 375px (iPhone SE)
  - Mobile Large: 414px (iPhone 12)
  - Tablet: 768px (iPad)
  - Desktop: 1200px

**Expected Result:**

- [ ] Tidak ada horizontal scroll
- [ ] Text tidak overflow
- [ ] Gambar responsive
- [ ] Grid adaptif (1 kolom mobile, 2-3 kolom desktop)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test UX.4: Anti-Slop Design Compliance 🔴 Critical **Deskripsi:** Memastikan UI mematuhi guideline Anti-Slop

**Checklist:**

- [ ] TIDAK ADA `rounded-lg`, `rounded-xl`, `rounded-full`
- [ ] TIDAK ADA gradient warna-warni
- [ ] TIDAK ADA drop-shadow berlebihan
- [ ] Background: `#FAFAFA` (off-white)
- [ ] Text: `#111111` (hampir hitam)
- [ ] Accent: Merah Bata `#991B1B` atau Biru Navy `#1E3A8A`
- [ ] Font heading: Inter/System UI, weight 800
- [ ] Font data: JetBrains Mono (monospace)
- [ ] Border radius maksimal 2px (`rounded-sm`)

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## ## 🧪 Performance Testing

### Test PERF.1: Initial Load Time 🟡 High
**Deskripsi:** Waktu load halaman pertama

**Steps:**

1. Buka DevTools → Network tab
2. Disable cache
3. Reload halaman
4. Cek "Load" time

**Expected Result:**

- [ ] Load time < 3 detik (4G connection)
- [ ] Total size < 500KB
- [ ] Tidak ada request yang gagal

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Load time: ___ ms
- Catatan:

---

### Test PERF.2: Checklist Page Performance 🟢 Medium **Deskripsi:** Performa halaman checklist dengan 24 items

**Steps:**

1. Buka halaman checklist
2. Scroll ke bawah
3. Centang beberapa item

**Expected Result:**

- [ ] Tidak ada lag saat scroll
- [ ] Checkbox response < 100ms
- [ ] Progress bar update smooth

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## ## 🧪 Edge Cases & Error Handling

### Test EDGE.1: Network Error 🔴 Critical
**Deskripsi:** Handling saat koneksi internet putus

**Steps:**

1. Buka aplikasi
2. Matikan koneksi internet
3. Coba submit form

**Expected Result:**

- [ ] Error message muncul: "Koneksi internet terputus"
- [ ] Data tidak hilang (tersimpan di localStorage sementara)
- [ ] Retry button muncul
- [ ] Saat koneksi nyala lagi, data auto-sync

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test EDGE.2: Large File Upload 🟡 High
**Deskripsi:** Upload file besar (>5MB)

**Steps:**

1. Upload foto 10MB
2. Tunggu proses

**Expected Result:**

- [ ] Loading indicator muncul
- [ ] Progress bar upload (jika ada)
- [ ] Upload berhasil atau error message jelas jika terlalu besar
- [ ] Tidak ada crash/hang

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

### Test EDGE.3: Concurrent Users 🟢 Medium
**Deskripsi:** Multiple users edit trip yang sama

**Steps:**

1. Buka trip di 2 browser berbeda
2. User A centang item 1
3. User B centang item 2

**Expected Result:**

- [ ] Kedua perubahan tersimpan
- [ ] Tidak ada data conflict
- [ ] Progress bar update di kedua browser

**Actual Result:**

- Status: ⬜ Not Tested / ✅ Pass / ❌ Fail
- Catatan:

---

## ## 📊 Test Summary

### Critical Tests (Must Pass)
| Test ID | Deskripsi | Status |
|---------|-----------|--------|
| 1.1 | Create Event - Happy Path | ⬜ |
| 1.2 | Create Event - Validasi | ⬜ |
| 2.1 | Create Trip - Happy Path | ⬜ |
| 3.1 | Check Checklist Item | ⬜ |
| 3.4 | Upload Photo - Mobile | ⬜ |
| 4.1 | Generate PDF | ⬜ |
| 5.1 | View Archive | ⬜ |
| API.1 | Get Events | ⬜ |
| API.2 | Invalid Token | ⬜ |
| API.3 | Upload File | ⬜ |
| UX.1 | Touch Target Size | ⬜ |
| UX.2 | Input Zoom Prevention | ⬜ |
| UX.4 | Anti-Slop Compliance | ⬜ |
| EDGE.1 | Network Error | ⬜ |

**Total Critical: 14 tests**
**Passed: ___ / 14**

---

### High Priority Tests
| Test ID | Deskripsi | Status |
|---------|-----------|--------|
| 1.3 | Create Event - Mobile | ⬜ |
| 2.2 | Verify Checklist Template | ⬜ |
| 3.2 | Add Notes | ⬜ |
| 3.3 | Upload Photo - Desktop | ⬜ |
| 3.5 | Navigate Steps | ⬜ |
| 4.2 | PDF Format | ⬜ |
| 4.3 | PDF Link Accessible | ⬜ |
| 5.2 | Filter Archive | ⬜ |
| 5.3 | Search Archive | ⬜ |
| UX.3 | Responsive Layout | ⬜ |
| PERF.1 | Initial Load Time | ⬜ |
| EDGE.2 | Large File Upload | ⬜ |

**Total High: 12 tests**
**Passed: ___ / 12**

---

### Medium/Low Priority Tests
| Test ID | Deskripsi | Status |
|---------|-----------|--------|
| 3.6 | Auto-Save Debounce | ⬜ |
| 5.4 | Open Document from Archive | ⬜ |
| PERF.2 | Checklist Performance | ⬜ |
| EDGE.3 | Concurrent Users | ⬜ |

**Total Medium/Low: 4 tests**
**Passed: ___ / 4**
