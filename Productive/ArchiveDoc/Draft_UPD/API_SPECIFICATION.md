# API_SPECIFICATION.md
Dokumentasi lengkap endpoint Google Apps Script (GAS) yang berfungsi sebagai **API Gateway** untuk Fieldwork & Event Booth Webtools.

---

## 🌐 Base Information

| Item | Value |
| --- | --- |
| **Base URL** | `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec` |
| **Method** | `POST` (semua request menggunakan POST) |
| **Content-Type** | `application/json` |
| **Authentication** | Token-based (via field `token` di body request) |
| **Response Format** | JSON |
| **CORS** | Auto-handled oleh GAS Web App deployment |

---

## 🔐 Authentication

Setiap request **WAJIB** menyertakan token di body JSON:

```json
{
  "action": "nama_action",
  "token": "your-secret-token-here",
  ...
}
```

- Token disimpan di `.env` frontend sebagai `PUBLIC_API_TOKEN`
- Token disimpan di `Code.gs` sebagai konstanta `API_TOKEN`
- Jika token tidak valid → response `401 Unauthorized`

---

## 📦 Response Format (Standar)

### Success Response
```json
{
  "success": true,
  "data": { ... },
"message": "Operation completed successfully" } ```

### Error Response
```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Error Codes
| Code | Deskripsi |
|------|-----------|
| `UNAUTHORIZED` | Token tidak valid atau tidak ada |
| `INVALID_ACTION` | Action tidak dikenali |
| `MISSING_FIELD` | Field wajib tidak disertakan |
| `DB_ERROR` | Gagal query ke Supabase |
| `DRIVE_ERROR` | Gagal upload ke Google Drive |
| `NOT_FOUND` | Resource tidak ditemukan |

---

## 🎯 Daftar Endpoint (Actions)

### 1. `get_events` — Ambil Semua Event
**Deskripsi:** Mengambil daftar event untuk Dashboard.

**Request:**
```json
{
  "action": "get_events",
  "token": "xxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "event_name": "Pameran UMKM 2026",
      "event_date": "2026-10-15",
      "location": "JCC Jakarta",
      "status": "in_progress",
      "created_at": "2026-09-20T08:00:00Z",
      "updated_at": "2026-09-28T10:30:00Z",
      "progress": 65,
      "total_trips": 3,
      "completed_trips": 2
    }
  ]
}
```

---

### 2. `create_event` — Buat Event Baru
**Deskripsi:** Membuat event baru dengan status `draft`.

**Request:**
```json
{
  "action": "create_event",
  "token": "xxx",
  "event_name": "Pameran UMKM 2026",
  "event_date": "2026-10-15",
  "location": "JCC Jakarta"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-new-event",
    "event_name": "Pameran UMKM 2026",
    "status": "draft",
    "created_at": "2026-09-29T10:00:00Z"
  }
}
```

---

### 3. `get_event_detail` — Detail Event + Trips **Deskripsi:** Mengambil detail event beserta daftar trips dan progress.

**Request:**
```json
{
  "action": "get_event_detail",
  "token": "xxx",
  "event_id": "uuid-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
"event": { "id": "...", "event_name": "...", "status": "in_progress" }, "trips": [ { "id": "uuid-trip-1", "trip_type": "execution", "start_date": "2026-10-15", "end_date": "2026-10-17", "personnel": ["Budi", "Ani"], "status": "in_progress", "progress": 75 } ], "documents": [ { "id": "uuid-doc-1", "document_type": "final_report", "gdrive_url": "https://drive.google.com/...", "generated_at": "2026-09-28T14:00:00Z" } ], "progress_overview": { "overall": 65, "documents": 100, "logistics": 80, "departure": 50, "report": 30 } } } ```

---

### 4. `update_event` — Update Status Event
**Deskripsi:** Mengubah status event (misal: archive).

**Request:**
```json
{
  "action": "update_event",
  "token": "xxx",
  "event_id": "uuid-123",
  "status": "archived"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event status updated"
}
```

---

### 5. `create_trip` — Buat Perjalanan Dinas Baru **Deskripsi:** Membuat trip baru + **auto-generate checklist items** dari template.

**Request:**
```json
{
  "action": "create_trip",
  "token": "xxx",
  "event_id": "uuid-123",
  "trip_type": "execution",
  "start_date": "2026-10-15",
  "end_date": "2026-10-17",
  "personnel": ["Budi", "Ani"],
  "notes": "Trip utama pameran"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-new-trip",
    "status": "draft",
    "checklist_generated": 24
  }
}
```

> ⚠️ **Catatan:** Backend otomatis insert 24 checklist items (6 per kategori) berdasarkan template di PRD.

---

### 6. `get_checklist` — Ambil Checklist per Trip **Deskripsi:** Mengambil semua checklist items untuk satu trip, dikelompokkan per kategori.

**Request:**
```json
{
  "action": "get_checklist",
  "token": "xxx",
  "trip_id": "uuid-trip-1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trip_id": "uuid-trip-1",
    "categories": {
      "documents": {
        "total": 6,
        "checked": 4,
        "progress": 66,
        "items": [
          {
            "id": "uuid-item-1",
"item_name": "SPPD ditandatangani", "is_checked": true, "checked_at": "2026-09-28T09:00:00Z", "notes": "Sudah ditandatangani Pak Direktur", "attachment_url": null, "order_index": 1 } ] }, "logistics": { ... }, "departure": { ... }, "report": { ... } } } } ```

---

### 7. `update_checklist` — Update Status Checkbox **Deskripsi:** Menandai item checklist sebagai checked/unchecked (Flow 1).

**Request:**
```json
{
  "action": "update_checklist",
  "token": "xxx",
  "trip_id": "uuid-trip-1",
  "item_id": "uuid-item-1",
  "is_checked": true,
  "notes": "Sudah selesai"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "item_id": "uuid-item-1",
    "is_checked": true,
    "checked_at": "2026-09-29T10:15:00Z",
    "trip_progress": 75
  }
}
```

---

### 8. `upload_file` — Upload File (Foto/PDF) **Deskripsi:** Upload file Base64 ke Google Drive (Flow 2 & 3).

**Request:**
```json
{
  "action": "upload_file",
  "token": "xxx",
  "trip_id": "uuid-trip-1",
  "item_id": "uuid-item-1",
  "file_name": "boarding_pass.jpg",
  "file_data": "base64-encoded-string...",
  "file_type": "image/jpeg",
  "document_type": null
}
```

**Fields:**
| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `trip_id` | uuid | ✅ | ID trip |
| `item_id` | uuid | ❌ | ID checklist item (untuk foto attachment) |
| `file_name` | string | ✅ | Nama file |
| `file_data` | string | ✅ | Base64 string (tanpa prefix `data:...`) |
| `file_type` | string | ✅ | MIME type |
| `document_type` | enum | ❌ | Isi jika upload PDF laporan: `sppd_checklist`, `logistics_checklist`, `departure_checklist`, `final_report` |

**Response:**
```json
{
  "success": true,
  "data": {
    "file_id": "drive-file-id-789",
"file_url": "https://drive.google.com/file/d/.../view", "file_name": "boarding_pass.jpg", "size_bytes": 245678 } } ```

---

### 9. `save_document` — Simpan Metadata PDF Laporan **Deskripsi:** Menyimpan metadata PDF yang sudah di-generate di frontend.

**Request:**
```json
{
  "action": "save_document",
  "token": "xxx",
  "trip_id": "uuid-trip-1",
  "document_type": "final_report",
  "gdrive_file_id": "drive-file-id-789",
  "gdrive_url": "https://drive.google.com/..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-doc-new",
    "document_type": "final_report",
    "generated_at": "2026-09-29T11:00:00Z"
  }
}
```

---

### 10. `complete_trip` — Tandai Trip Selesai **Deskripsi:** Mengubah status trip menjadi `completed` dan memicu auto-update status event.

**Request:**
```json
{
  "action": "complete_trip",
  "token": "xxx",
  "trip_id": "uuid-trip-1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trip_status": "completed",
    "event_status_updated": true,
    "event_new_status": "completed"
  }
}
```

---

### 11. `get_archive` — Data untuk Halaman Arsip **Deskripsi:** Mengambil event yang sudah `completed` atau `archived` dengan filter.

**Request:**
```json
{
  "action": "get_archive",
  "token": "xxx",
  "filter_month": 9,
  "filter_year": 2026,
  "search": "UMKM"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "event_name": "Pameran UMKM 2026",
      "event_date": "2026-10-15",
      "location": "JCC Jakarta",
      "status": "completed",
      "documents_count": 3,
      "trips_count": 3
    }
  ]
}
```

---

## 🔄 Status Workflow (Auto-Update)

GAS akan otomatis menghitung dan mengupdate status berdasarkan kondisi:

### Event Status
| Kondisi | Status Baru |
|---------|-------------|
| Trip kosong | `draft` |
| Minimal 1 trip `in_progress` atau `completed` | `in_progress` |
| Semua trip `completed` | `completed` |
| Manual archive | `archived` |

### Trip Status
| Kondisi | Status Baru |
|---------|-------------|
| Checklist belum ada yang di-check | `draft` |
| Minimal 1 item di-check | `in_progress` |
| Semua item di-check | `completed` |

---

## 🧪 Testing dengan cURL

### Test Koneksi Dasar
```bash
curl -X POST "https://script.google.com/macros/s/XXXXX/exec" \ -H "Content-Type: application/json" \ -d '{ "action": "get_events", "token": "your-secret-token" }' ```

### Test Upload File
```bash
curl -X POST "https://script.google.com/macros/s/XXXXX/exec" \ -H "Content-Type: application/json" \ -d '{ "action": "upload_file", "token": "your-secret-token", "trip_id": "uuid-trip-1", "file_name": "test.jpg", "file_data": "'$(base64 -i test.jpg)'", "file_type": "image/jpeg" }' ```

---

## ⚠️ Catatan Penting

1. **Ukuran Payload:** GAS memiliki limit 50MB per request. Untuk file besar, kompres dulu di frontend.
2. **Base64 Prefix:** Kirim Base64 **tanpa** prefix `data:image/jpeg;base64,`. Frontend harus strip prefix sebelum kirim.
3. **Timeout:** GAS memiliki timeout 6 menit. PDF generation dilakukan di frontend, hanya upload hasilnya ke GAS.
4. **Rate Limit:** Hindari spam request. Gunakan **debounce 500ms** di frontend untuk auto-save checklist.
5. **Folder Drive:** Semua file otomatis masuk ke folder `Fieldwork Webtools/Attachments/` (subfolder `Photos/` atau `Documents/` dibuat otomatis).
6. **Permission File:** Semua file yang di-upload otomatis di-set `Anyone with link can view`.

---

## 📝 Changelog

| Tanggal | Versi | Perubahan |
| --- | --- | --- |
| 2026-09-29 | 1.0.0 | Initial release |
