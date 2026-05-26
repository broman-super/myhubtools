# SUPERSUB Activity Tracker V2

Sistem pelacakan aktivitas kerja terintegrasi Google Sheets (zona waktu **WIB / GMT+7**).

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [docs/PANDUAN-PENGGUNA.md](docs/PANDUAN-PENGGUNA.md) | Manual pengguna (login, input, template, SPV, export) |
| [docs/IMPLEMENTASI.md](docs/IMPLEMENTASI.md) | Panduan teknis developer (API, sheet, deploy) |

## File utama

- `Tracking.html` — antarmuka aplikasi
- `code.gs` — backend Google Apps Script
- `assets/app-core.js` — API bundle & cache
- `assets/app-features.js` — template, reminder, CSV, overlap audit

## Deploy singkat

1. Deploy `code.gs` sebagai Web App di Google Apps Script.
2. Salin URL deployment ke **`assets/config.js`** (satu-satunya tempat konfigurasi URL).
3. Host `Tracking.html` dan folder `assets/` di path yang sama.
