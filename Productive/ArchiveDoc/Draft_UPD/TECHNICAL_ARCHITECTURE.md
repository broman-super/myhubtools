## 1. Overview Architecture

Sistem ini terdiri dari 4 komponen utama yang saling terhubung:

```
┌─────────────────────────────────────────────────────────────┐
│                    **USER** (Browser/HP)                         │
└──────────────────────┬──────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│              **FRONTEND** (Astro.js + Tailwind)                 │
│              Hosted: GitHub Pages                           │
│              - UI/UX Interface                              │
│              - Form Handling                                │
│              - **PDF** Generation                               │
└──────────────────────┬──────────────────────────────────────┘
    │
    │ **HTTPS** Request (**JSON**)
    ▼
┌─────────────────────────────────────────────────────────────┐
│         **MIDDLEWARE** (Google Apps Script)                     │
│         - **API** Gateway                                       │
│         - Security Layer (sembunyikan Supabase Key)        │
│         - File Uploader ke Google Drive                     │
└─────────┬───────────────────────────────────┬───────────────┘
    │                                   │
    │                                   │
    ▼                                   ▼
┌──────────────────────┐          ┌──────────────────────────┐
│   **SUPABASE**           │          │   **GOOGLE** **DRIVE**           │
│   (PostgreSQL)       │          │   (File Storage)         │
│   - Database         │          │   - **PDF** Files            │
│   - Metadata         │          │   - Photos               │
│   - Link File        │          │   - Documents            │
└──────────────────────┘          └──────────────────────────┘
```

---

## 2. Data Flow Diagram

### Flow 1: Simpan Data Checklist (Tanpa File)

```
## User centang checkbox di Frontend
   ↓
## Frontend kirim POST request ke GAS endpoint
    {
    *action*: *update_checklist*,
    *trip_id*: *uuid-**123***,
    *item_id*: *uuid-**456***,
    *is_checked*: true
    }
    ↓
## GAS validasi request (cek token/password)
   ↓
## GAS kirim UPDATE query ke Supabase
    (menggunakan Service Role Key yang disembunyikan)
    ↓
## Supabase update data, return success
   ↓
## GAS return response ke Frontend
    {
    *success*: true,
    *message*: *Checklist updated*
    }
    ↓
## Frontend update UI (progress bar, dll)
```

### Flow 2: Upload File (Foto/PDF)

```
## User upload foto di Frontend
   ↓
## Frontend convert file ke Base64
   ↓
## Frontend kirim POST request ke GAS endpoint
    {
    *action*: *upload_file*,
    *trip_id*: *uuid-**123***,
    *file_name*: *boarding_pass.jpg*,
    *file_data*: *base64-encoded-string...*,
    *file_type*: *image/jpeg*
    }
    ↓
## GAS validasi request
   ↓
## GAS decode Base64 → Blob
   ↓
## GAS upload Blob ke Google Drive
    (simpan di folder khusus: *Fieldwork Webtools/Attachments*)
    ↓
## Google Drive return file_id dan download_url
   ↓
## GAS simpan metadata ke Supabase
    **INSERT** ke tabel documents atau update checklist_items.attachment_url
    ↓
## GAS return response ke Frontend
    {
    *success*: true,
    *file_id*: *drive-file-id-**789***,
    *file_url*: *[https://drive.google.com/...*](https://drive.google.com/...")
    }
    ↓
## Frontend simpan file_url, tampilkan preview/link
```

### Flow 3: Generate PDF Dokumen

```
## User klik *Generate Laporan* di Frontend
   ↓
## Frontend ambil semua data dari Supabase
    (via **GAS** endpoint)
    ↓
## Frontend render HTML template PDF
    (gunakan **CSS** @page dan @media print)
    ↓
## Frontend convert HTML → PDF
    (gunakan library: html2pdf.js atau jspdf + html2canvas)
    ↓
## Frontend convert PDF → Base64
   ↓
## Frontend kirim POST request ke GAS endpoint
    {
    *action*: *upload_file*,
    *trip_id*: *uuid-**123***,
    *file_name*: *Laporan_Trip1_2026.pdf*,
    *file_data*: *base64-encoded-pdf...*,
    *file_type*: *application/pdf*
    }
    ↓
## GAS upload ke Google Drive (sama seperti Flow 2)
   ↓
## GAS simpan metadata ke tabel documents
   ↓
## GAS return file_url ke Frontend
   ↓
## Frontend tampilkan link download PDF
```

---

## 3. Component Details

### A. Frontend (Astro.js)

**Teknologi:**
- Astro.js (static site generator)
- Tailwind **CSS** (styling)
- Vanilla JS / Alpine.js (interaktivitas ringan)
- html2pdf.js (**PDF** generation)

**Struktur Folder:** ``` fieldwork-webtools/ ├── src/ │   ├── pages/              # Halaman website │   │   ├── index.astro     # Dashboard │   │   ├── event/ │   │   │   ├── [id].astro  # Detail Event │   │   │   └── new.astro   # Buat Event Baru │   │   ├── trip/ │   │   │   ├── [id].astro  # Detail Trip │   │   │   └── checklist/ │   │   │       └── [id].astro  # Checklist Form │   │   ├── archive.astro   # Arsip │   │   └── roadmap.astro   # Roadmap │   │ │   ├── components/         # Komponen UI reusable │   │   ├── Navbar.astro │   │   ├── Footer.astro │   │   ├── EventCard.astro │   │   ├── TripCard.astro │   │   ├── ChecklistItem.astro │   │   ├── ProgressBar.astro │   │   ├── StepIndicator.astro │   │   └── Modal.astro │   │ │   ├── layouts/            # Layout template │   │   └── Layout.astro │   │ │   ├── lib/                # Utility functions │   │   ├── api.js          # Fungsi untuk panggil **GAS** │   │   ├── pdf.js          # Fungsi untuk generate **PDF** │   │   ├── utils.js        # Helper functions │   │   └── constants.js    # Konstanta (warna, dll) │   │ │   └── styles/             # Global styles │       └── global.css │ ├── public/                 # Static assets │   ├── logo.svg │   └── favicon.ico │ ├── astro.config.mjs        # Konfigurasi Astro ├── tailwind.config.js      # Konfigurasi Tailwind ├── package.json └── .env                    # Environment variables (jangan commit!) ```

**Environment Variables (.env):** ```env # GAS Endpoint URL PUBLIC_GAS_ENDPOINT=[https://script.google.com/macros/s/**XXXXX**/exec](https://script.google.com/macros/s/**XXXXX**/exec)

# Security Token (harus sama dengan yang di GAS)

PUBLIC_API_TOKEN=your-secret-token-here ```

### B. Middleware (Google Apps Script)

**Fungsi:**
1. ****API** Gateway:** Terima semua request dari frontend
2. **Security Layer:** Sembunyikan Supabase Service Role Key
3. **File Uploader:** Upload file ke Google Drive

**Struktur Script:** ```javascript // Code.gs

// Konfigurasi const SUPABASE_URL = '[https://xxxxx.supabase.co';](https://xxxxx.supabase.co';) const SUPABASE_SERVICE_KEY = 'eyJhbGc...'; // Service Role Key const API_TOKEN = 'your-secret-token-here'; const DRIVE_FOLDER_NAME = 'Fieldwork Webtools';

// Main handler
function doPost(e) {
    try {
    // Validasi token
    const token = e.parameter.token || e.postData.contents.token;
    if (token !== API_TOKEN) {
    return ContentService.createTextOutput(**JSON**.stringify({
    success: false,
    error: 'Unauthorized'
    })).setMimeType(ContentService.MimeType.**JSON**);
    }
    
    // Parse request
    const data = **JSON**.parse(e.postData.contents);
    const action = data.action;
    
    // Route ke fungsi yang sesuai
    let result;
    switch(action) {
    case 'get_events':
    result = getEvents();
    break;
    case 'create_event':
    result = createEvent(data);
    break;
    case 'update_checklist':
    result = updateChecklist(data);
    break;
    case 'upload_file':
    result = uploadFile(data);
    break;
    // ... action lainnya
    default:
    result = { success: false, error: 'Unknown action' };
    }
    
    return ContentService.createTextOutput(**JSON**.stringify(result))
    .setMimeType(ContentService.MimeType.**JSON**);
    
    } catch(error) {
    return ContentService.createTextOutput(**JSON**.stringify({
    success: false,
    error: error.toString()
    })).setMimeType(ContentService.MimeType.**JSON**);
    }
}

// Fungsi untuk query Supabase
function supabaseQuery(endpoint, method, body) {
    const url = SUPABASE_URL + endpoint;
    const options = {
    method: method,
    headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
    }
    };
  
    if (body) {
    options.payload = **JSON**.stringify(body);
    }
  
    const response = UrlFetchApp.fetch(url, options);
    return **JSON**.parse(response.getContentText());
}

// Fungsi untuk upload file ke Google Drive
function uploadFile(data) {
    try {
    // Decode Base64
    const decoded = Utilities.base64Decode(data.file_data);
    const blob = Utilities.newBlob(decoded, data.file_type, data.file_name);
    
    // Cari atau buat folder
    const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    
    // Upload file
    const file = folder.createFile(blob);
    
    // Set permission (anyone with link can view)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.**VIEW**);
    
    // Return file info
    return {
    success: true,
    file_id: file.getId(),
    file_url: file.getUrl(),
    file_name: file.getName()
    };
    
    } catch(error) {
    return {
    success: false,
    error: error.toString()
    };
    }
}

// Helper: Cari atau buat folder di Drive
function getOrCreateFolder(folderName) {
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
    return folders.next();
    } else {
    return DriveApp.createFolder(folderName);
    }
}

// ... fungsi lainnya (getEvents, createEvent, updateChecklist, dll) ```

**Deploy **GAS**:** ## Buka Google Apps Script (script.google.com) ## Paste kode di atas ## Klik *Deploy* → *New deployment* ## Pilih type: *Web app* ## Execute as: *Me* ## Who has access: *Anyone* ## Copy URL yang muncul (contoh: [https://script.google.com/macros/s/XXXXX/exec](https://script.google.com/macros/s/XXXXX/exec)) ## Paste URL ini ke .env frontend (PUBLIC_GAS_ENDPOINT)

### C. Database (Supabase)

**Struktur Tabel:** (Sudah didefinisikan di **PRD**, lihat FIELDWORK_WEBTOOLS_PROJECT_BRIEF.md)

**Konfigurasi Supabase:** ## Buat project baru di supabase.com ## Aktifkan *Row Level Security* (RLS) untuk semua tabel ## Buat policy untuk allow all operations (karena akses via Service Role Key di GAS) ## Copy *Project URL* dan *Service Role Key* ke GAS

****RLS** Policy (untuk keamanan ekstra):** ```sql -- Allow all operations dari **GAS** (karena pakai Service Role Key) -- Policy ini sebenarnya tidak diperlukan jika pakai Service Role Key, -- tapi bisa ditambahkan untuk keamanan ekstra

**CREATE** **POLICY** *Allow all operations* ON events **FOR** **ALL** **USING** (true) **WITH** **CHECK** (true); ```

### D. File Storage (Google Drive)

**Struktur Folder:**
```
Fieldwork Webtools/
├── Attachments/
│   ├── Photos/
│   │   ├── boarding_pass_trip1.jpg
│   │   └── booth_photo_trip2.jpg
│   └── Documents/
│       ├── SPPD_Checklist_Trip1.pdf
│       └── Laporan_Trip2.pdf
└── Templates/
    └── (opsional: template dokumen)
```

**Permission:**
- Folder: Private (hanya Anda yang bisa akses)
- File: *Anyone with link can view* (agar bisa dibuka dari frontend)

---

## 4. Security Flow

### Bagaimana GAS Melindungi Supabase?

**Masalah:** Jika frontend langsung akses Supabase, Service Role Key harus disimpan di frontend (tidak aman, bisa dicuri).

**Solusi:** **GAS** sebagai *penjaga* di tengah.

```
┌──────────────┐
│   Frontend   │  ← Tidak punya Service Role Key
│   (Public)   │     Hanya punya PUBLIC_API_TOKEN
└──────┬───────┘
    │
    │ Request + PUBLIC_API_TOKEN
    ▼
┌──────────────┐
│     **GAS**      │  ← Punya Service Role Key (disimpan aman di server **GAS**)
│  (Middleware)│     Validasi PUBLIC_API_TOKEN dulu
└──────┬───────┘
    │
    │ Request + Service Role Key
    ▼
┌──────────────┐
│   Supabase   │  ← Hanya terima request dari **GAS**
│  (Database)  │
└──────────────┘
```

**Keamanan:**
1. **PUBLIC_API_TOKEN:** Disimpan di .env frontend (bisa dilihat, tapi tidak berbahaya)
2. **Service Role Key:** Hanya ada di **GAS** (server-side, tidak bisa diakses publik)
3. ****GAS** Validation:** Setiap request dari frontend harus punya token yang valid

**Cara Ganti Token:**
## Ganti token di .env frontend
## Ganti token di GAS (variabel API_TOKEN)
## Redeploy GAS
4. Done!

---

## 5. Integration Points

### A. Frontend → GAS

**Endpoint:** ```javascript const GAS_ENDPOINT = import.meta.env.PUBLIC_GAS_ENDPOINT; const API_TOKEN = import.meta.env.PUBLIC_API_TOKEN; ```

**Contoh Panggilan:** ```javascript // src/lib/api.js

export async function getEvents() {
    const response = await fetch(GAS_ENDPOINT, {
    method: '**POST**',
    body: **JSON**.stringify({
    action: 'get_events',
    token: API_TOKEN
    })
    });
  
    const data = await response.json();
    return data;
}

export async function uploadFile(file, tripId) {
    // Convert file ke Base64
    const base64 = await fileToBase64(file);
  
    const response = await fetch(GAS_ENDPOINT, {
    method: '**POST**',
    body: **JSON**.stringify({
    action: 'upload_file',
    token: API_TOKEN,
    trip_id: tripId,
    file_name: file.name,
    file_data: base64,
    file_type: file.type
    })
    });
  
    const data = await response.json();
    return data;
}

// Helper: Convert File ke Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Ambil Base64 saja
    reader.onerror = reject;
    reader.readAsDataURL(file);
    });
}
```

### B. GAS → Supabase

**Contoh Query:** ```javascript // Di Code.gs

function getEvents() {
    const result = supabaseQuery('/rest/v1/events?select=*', '**GET**');
    return { success: true, data: result };
}

function createEvent(data) {
    const body = {
    event_name: data.event_name,
    event_date: data.event_date,
    location: data.location,
    status: 'draft'
    };
  
    const result = supabaseQuery('/rest/v1/events', '**POST**', body);
    return { success: true, data: result[0] };
}

function updateChecklist(data) {
    const body = {
    is_checked: data.is_checked,
    checked_at: data.is_checked ? new Date().toISOString() : null
    };
  
    const result = supabaseQuery(
    `/rest/v1/checklist_items?id=eq.${data.item_id}`,
    '**PATCH**',
    body
    );
  
  return { success: true, data: result[0] };
}
```

### C. GAS → Google Drive

**Sudah dijelaskan di bagian Component Details → Middleware**

---

## 6. Deployment Flow

### A. Frontend (GitHub Pages)

## Push kode ke GitHub

## Aktifkan GitHub Pages di Settings → Pages ## Pilih branch: main, folder: /dist ## Tambahkan GitHub Actions workflow untuk auto-build:

```yaml # .github/workflows/deploy.yml

name: Deploy to GitHub Pages

on:
    push:
    branches: [main]

jobs:
    build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node
    uses: actions/setup-node@v3
    with:
    node-version: 18
    
    - name: Install dependencies
    run: npm install
    
    - name: Build
    run: npm run build
    
    - name: Deploy
    uses: peaceiris/actions-gh-pages@v3
    with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
```

### B. Middleware (Google Apps Script)

## Buka script.google.com

## Paste kode ## Deploy → New deployment → Web app ## Copy URL ## Paste URL ke .env frontend

### C. Database (Supabase)

## Buat project di supabase.com

## Run SQL untuk buat tabel (dari PRD) ## Copy Project URL dan Service Role Key ## Paste ke GAS

---

## 7. Testing Checklist

Sebelum deploy, test semua flow ini:

- [ ] Frontend bisa connect ke **GAS**
- [ ] **GAS** bisa query Supabase
- [ ] **GAS** bisa upload file ke Google Drive
- [ ] Create event berhasil
- [ ] Update checklist berhasil
- [ ] Upload foto berhasil
- [ ] Generate **PDF** berhasil
- [ ] **PDF** tersimpan di Google Drive
- [ ] Link **PDF** bisa dibuka dari frontend
- [ ] Semua halaman responsif di HP

---

## 8. Troubleshooting

### Masalah: CORS Error

**Solusi:** **GAS** otomatis handle **CORS** untuk Web App deployment

### Masalah: File tidak muncul di Google Drive

**Solusi:** Cek permission folder, pastikan **GAS** punya akses

### Masalah: Supabase query gagal

**Solusi:** Cek Service Role Key, pastikan valid dan tidak expired

### Masalah: PDF tidak ter-generate

**Solusi:** Cek library html2pdf.js, pastikan sudah di-import dengan benar

---

## 9. Migrasi Data dari Prototype (SPPD Toolbox → Webtools)

Prototype memakai 6 status; Supabase hanya 4. **Peta status wajib** saat menulis
skrip migrasi agar tidak ada data yang hilang:

| Prototype (localStorage) | Supabase `events.status` |
|---|---|
| `draft` | `draft` |
| `diajukan` | `in_progress` |
| `berjalan` | `in_progress` |
| `disetujui` | `in_progress` |
| `selesai` | `completed` |
| `dibatalkan` | `archived` |

- Checklist prototype: `todo`/`aktif` → `is_checked=false`; `selesai` → `is_checked=true`.
- Format backup prototype = file JSON penuh key `sppd_toolbox_db_v1` (bisa diekspor dari
  Pengaturan → **Backup ke File**). Skrip migrasi memakai format ini sebagai input seed;
  mapping field lengkap ada di `DEVELOPMENT_CHECKLIST.md` → Lampiran.