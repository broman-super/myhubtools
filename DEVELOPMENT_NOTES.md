# Catatan Pengembangan & Riset Teknis: REYNAHUB_SYS

Dokumen ini memuat catatan riset, daftar kebutuhan teknis, dan informasi sistem untuk mendukung pengembangan dan optimasi REYNAHUB_SYS.

---

## 🔍 1. Ringkasan Riset Sistem

### A. Manajemen Tema (Dark/Light Mode)
Tools internal menggunakan atribut `data-theme` pada elemen `<html>` untuk manajemen tema.
*   **Key:** `localStorage.getItem('theme')`
*   **Atribut:** `data-theme="dark"` atau `data-theme="light"`
*   **Contoh Implementasi:**
    ```javascript
    // Deteksi & Terapkan
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    ```

### B. Endpoint Google Apps Script (GAS)
Sistem mengandalkan endpoint berikut untuk sinkronisasi data:
*   **Resi Generator:** `.../macros/s/AKfycbwxfb_8qv9JEAhb_PqnD2ysFWkh_bjGq-SefVG0l6mwFjtFrbQeqek80o3auoewm5KLTg/exec`
*   **Analytic Dashboard:** `.../macros/s/AKfycbyAZ8WhxeLzkeUAZoECFW0QyBsEaSKkBuvV-kPj37wfZq4fj4ylkBptmzjN-tfkh59AjQ/exec`
*   *(Lihat file `README.md` untuk daftar lengkap)*

---

## 🛠️ 2. Daftar Kebutuhan & Checklist Pengembangan

Daftar ini diperlukan untuk menjaga kestabilan fitur setelah optimasi:

- [x] **Hash-Based Router:** Implementasi routing di `index.html` menggunakan `window.location.hash` untuk navigasi aman.
- [x] **PostMessage Theme Broadcast:** Fungsi untuk sinkronisasi tema dari shell ke iframe (menggunakan `postMessage`).
- [x] **Loading Bar:** Implementasi indikator muatan halaman saat iframe loading.
- [ ] **State Persistence:** (Opsional) Memastikan cache `localStorage` tidak terhapus saat berpindah modul.
- [ ] **Komunikasi API:** Memastikan integrasi `postMessage` tidak terblokir oleh *cross-origin policy* (saat ini sudah aman untuk domain yang sama).

---

## 🚀 3. Rencana Komunikasi Antar-Modul (Arsitektur)

Agar modul dalam iframe dapat menerima perintah dari shell utama (seperti perubahan tema), gunakan handler pesan berikut pada setiap file tools:

```javascript
// Contoh implementasi di dalam tool (iframe child)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_THEME') {
        document.documentElement.setAttribute('data-theme', event.data.theme);
        localStorage.setItem('theme', event.data.theme);
        // Tambahkan fungsi update chart/style di sini
    }
});
```

---

## 📂 4. Library Eksternal & Dependensi

*   **PDF Merger:** `pdf-lib`, `Sortable.js`, `pdf.js` (dimuat via CDN).
*   **Analytic:** `Chart.js`, `jQuery`, `DataTables`, `daterangepicker`.
*   *Catatan: Pastikan koneksi internet stabil karena library ini dimuat dari CDN.*
