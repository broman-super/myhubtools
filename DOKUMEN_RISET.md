# 📑 Dokumen Riset Teknis & Kompilasi Kode Sumber REYNAHUB_SYS

Dokumen ini berisi rangkuman analisis struktur, tema, endpoints, dan integrasi modul yang ada di dalam repositori **REYNAHUB_SYS**. Dokumen ini disusun untuk mempermudah pemeliharaan (*maintenance*) dan pengembangan sistem oleh pengembang atau AI di masa mendatang.

---

## 🎨 1. Sistem Manajemen Tema (Theme System)
Beberapa tools internal sudah dilengkapi dengan fitur penyesuaian tema (*dark/light mode*). Berikut adalah rincian teknis penanganannya:

### A. Mekanisme pada `Productive/Analytic.html`
Aplikasi ini membaca atribut `data-theme` dari elemen `<html>` dan menyimpannya ke dalam `localStorage`:
*   **Inisialisasi Tema:**
    ```javascript
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    ```
*   **Fungsi Toggle Tema:**
    ```javascript
    function toggleTheme() {
        const html = document.documentElement;
        if (html.getAttribute('data-theme') === 'dark') {
            html.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            html.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
        // Update Chart default colors dynamically
        Chart.defaults.color = html.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b';
        if (typeof renderAllCharts === 'function') renderAllCharts();
    }
    ```

### B. Mekanisme pada `Productive/latch/latch.html` & `app.js`
Aplikasi LATCH menggunakan pembungkus (*wrapper*) `localStorage` kustom untuk mendeteksi preferensi tema pengguna:
*   **Implementasi Atribut:** `html[data-theme="dark"]` diatur di berkas CSS (`Productive/latch/css/style.css`).
*   **Mekanisme JS (`Productive/latch/js/app.js`):**
    ```javascript
    const theme = (() => {
      function apply(mode) {
        document.documentElement.setAttribute("data-theme", mode);
        state.set("theme", mode);
        storage.set("theme", mode);
      }
      function toggle() { 
        apply(state.get("theme") === "dark" ? "light" : "dark"); 
      }
      function init() {
        const saved = storage.get("theme", null);
        // ... inisialisasi default
      }
    })();
    ```

---

## 🔗 2. Daftar Endpoint Google Apps Script (GAS) Web App
Berikut adalah daftar seluruh tautan Web App Google Apps Script aktif yang digunakan sebagai jembatan database/Google Sheets untuk masing-masing tool:

| Nama Modul / Fitur | Berkas Kode | URL Endpoint GAS Web App |
| :--- | :--- | :--- |
| **Resi Generator** | `index.html` (Kartu Menu) | `https://script.google.com/macros/s/AKfycbwxfb_8qv9JEAhb_PqnD2ysFWkh_bjGq-SefVG0l6mwFjtFrbQeqek80o3auoewm5KLTg/exec` |
| **Pendataan Paket (Outbond)** | `Productive/Outbondtrack.html` | `https://script.google.com/macros/s/AKfycbzWGeJrkRT7Ll6DEgSz2IxswFQaTq7tI2gZAtDetMgy83HdZWeya1coh1Yvr5pC6_E/exec` |
| **Analytic Dashboard (SAS)** | `Productive/Analytic.html` | `https://script.google.com/macros/s/AKfycbyAZ8WhxeLzkeUAZoECFW0QyBsEaSKkBuvV-kPj37wfZq4fj4ylkBptmzjN-tfkh59AjQ/exec` |
| **Team Planner** | `Productive/Task/taskschedule.html` | `https://script.google.com/macros/s/AKfycbw4MGE3HRqbh-00pFUBJOD2a9BBe9pGteMHZneGewxBsR-mJMJIMZJURSYlJqnCJC2i/exec` |
| **Retur Tracker** | `Productive/tr-retur/retur-track.html` | `https://script.google.com/macros/s/AKfycbzALHk0Pz3tIJnhSwg0k2_pSNP7oJ8QS3l6ct3mmuaxhJNnWuFa87mV0Bm-oUzezJObuw/exec` |
| **Activity Tracker** | `Productive/tr/assets/config.js` | `https://script.google.com/macros/s/AKfycbwNPC8SwiV_K1kAca9R5CCfTeQr8RlMNQn6elLoRQfC11xIkYHiPE_BaUtFYSO5VzIVvQ/exec` |
| **LATCH Web Link** | `Productive/latch/js/app.js` | `https://script.google.com/macros/s/AKfycbwekDk4m_F4qSiu15VcwOwrYUOMcNwaZr7Ri32xn7FwiiJip5CXHf_SXKJit-atdTO4/exec` |

---

## 💾 3. Manajemen Caching & Penyimpanan Lokal (LocalStorage)
Untuk mencegah perlambatan (*latency*) akibat muat ulang (*loading*) berulang kali dari server, tools Anda menyimpan state operasional secara lokal di browser:

*   **SAS (Analytic Dashboard):** Menyimpan cache data penjualan harian berkapasitas besar menggunakan key `"intel_pro_cache_v3"` guna menghindari hit kuota Google API berlebih.
*   **Team Planner (Task Schedule):** Menyimpan cache daftar tugas tim pada key `"ts_cache_data"` dan data hari libur nasional tahunan pada `"ts_holidays_[Tahun]"` untuk performa rendering kalender instan.
*   **Activity Tracker (`app-features.js`):** Menyimpan cache template pelaporan harian tim pada `"TEMPLATE_KEY"` dan tanda pengingat harian pada `"REMINDER_KEY"`.

---

## 🛠️ 4. Library & Ekstraksi Berkas PDF Merger (`PDFM_V2.html`)
Tool ini menggabungkan dokumen tanpa merusak barcode/QR dengan mengandalkan beberapa CDN library yang dimuat langsung:
*   **PDF-Lib:** Membaca, mengedit, dan merender ulang dokumen PDF (`https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js`).
*   **Sortable.js:** Mendukung interaksi drag-and-drop dinamis untuk mengurutkan daftar file resi sebelum digabungkan (`https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js`).
*   **PDF.js (Mozilla):** Mengekstrak data halaman dan barcode dalam canvas (`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`).

---

## 🚀 5. Mekanisme Komunikasi Antara Shell (`index.html`) & Iframe Tools
Agar navigasi landing page baru dan pengaturan tema dapat berintegrasi secara aman, kami menerapkan arsitektur komunikasi berikut:

### A. Hash-Based Router (Pencegah Bug Refresh)
Navigasi di `index.html` tidak lagi bersifat statis. Kami mendeteksi perubahan hash URL (`window.location.hash`) untuk memuat tool yang sesuai secara dinamis:
```javascript
const routes = {
    '#dashboard': () => goHome(),
    '#productive/planner': () => openTool('Productive/Task/taskschedule.html'),
    '#productive/analytic': () => openTool('Productive/Analytic.html'),
    '#productive/latch': () => openTool('Productive/latch/latch.html'),
    '#utilities/outbond': () => openTool('Productive/Outbondtrack.html'),
    '#utilities/activity': () => openTool('Productive/tr/tracking.html'),
    '#utilities/retur': () => openTool('Productive/tr-retur/retur-track.html'),
    '#utilities/merger': () => openTool('Productive/PDF-Merger/PDFM_V2.html'),
    '#doc/dak': () => openTool('Doc/form-dak.html'),
    '#external/resi': () => openTool('https://script.google.com/macros/s/AKfycbwxfb_8qv9JEAhb_PqnD2ysFWkh_bjGq-SefVG0l6mwFjtFrbQeqek80o3auoewm5KLTg/exec')
};
```

### B. Broadcast Tema Global (PostMessage API)
Ketika tema global di `index.html` diubah, shell utama memancarkan pesan ke dalam iframe operasional.
*   **Sisi Shell (`index.html`):**
    ```javascript
    function broadcastTheme(themeMode) {
        const iframe = document.getElementById('tool-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'SET_THEME', theme: themeMode }, '*');
        }
    }
    ```
*   **Sisi Iframe Anak (Contoh pada `Analytic.html`):**
    ```javascript
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SET_THEME') {
            document.documentElement.setAttribute('data-theme', event.data.theme);
            localStorage.setItem('theme', event.data.theme);
            if (typeof renderAllCharts === 'function') renderAllCharts();
        }
    });
    ```
