# REYNAHUB_SYS — Operating Hub & Workspace

Selamat datang di repositori **REYNAHUB_SYS**, sebuah portal hub internal (Operating Shell) berbasis web yang dirancang khusus untuk mengonsolidasikan berbagai alat bantu operasional harian dan produktivitas tim dalam satu sistem terintegrasi yang cepat, ringan, dan responsif.

---

## 🔍 1. Temuan Sistem & Pemetaan Tools

Sistem ini dikembangkan dengan arsitektur **Single Page Application (SPA) berbasis iframe**, di mana halaman utama (`index.html`) bertindak sebagai shell penampung (host), sedangkan masing-masing perkakas dimuat secara dinamis tanpa membebani browser.

### A. Struktur & Klasifikasi Modul
Berikut adalah pembagian kategori serta deskripsi fungsionalitas dari setiap tool yang ditemukan di dalam repositori ini:

#### 📂 01 / PRODUCTIVE (Modul Produktivitas Tim)
*   **Team Planner** (`Productive/Task/taskschedule.html`): Panel manajemen tugas tim real-time untuk perencanaan tugas dan koordinasi harian.
*   **Analytic Dashboard** (`Productive/Analytic.html`): Dashboard analisis penjualan interaktif yang kaya fitur (SAS - Bento Edition) menggunakan pustaka visualisasi (*Chart.js, Marked.js, DataTables, daterangepicker*).
*   **LATCH Web Link** (`Productive/latch/latch.html`): Pusat penyimpanan dan kurasi tautan/link eksternal penting untuk menunjang kelancaran kegiatan operasional.

#### 📂 02 / UNIVERSAL TOOLS (Modul Alat Bantu Operasional)
*   **Resi Generator** (Integrasi Google Apps Script): Layanan pembuat nomor dan label resi otomatis terhubung langsung dengan sistem logistik.
*   **Pendataan Paket** (`Productive/Outbondtrack.html`): Sistem pendataan paket masuk/keluar terintegrasi dengan fitur scanning barcode/QR code cepat.
*   **Activity Tracker** (`Productive/tr/tracking.html`): Logger pencatatan riwayat aktivitas kerja dari masing-masing anggota tim.
*   **Retur Tracker** (`Productive/tr-retur/retur-track.html`): Sistem terdedikasi untuk pencatatan dan pelacakan barang retur.
*   **Form Pengajuan DAK** (`Doc/form-dak.html`): Generator dokumen formulir untuk program Dana Amanah Karyawan (DAK).
*   **PDFM Merger** (`Productive/PDF-Merger/PDFM_V2.html`): Tool utilitas khusus untuk menyatukan banyak berkas resi terpisah ke dalam satu dokumen PDF tanpa merusak kualitas resolusi QR Code atau Barcode.

### B. Arsitektur Teknologi
*   **Antarmuka Shell:** Vanilla HTML5, CSS3 (CSS Grid & Custom Properties), JavaScript ES6.
*   **Penyimpanan & Integrasi:** Google Sheets & Google Apps Script (GAS) bertindak sebagai database serverless untuk perekaman data dari tools tracker.

---

## ⭐️ 2. Perbaikan Sistem & Penilaian Ulang Fungsi Inti

### Kelebihan Baru (Pros)
1.  **Font Sistem Terstandarisasi (Plus Jakarta Sans + Geomini):** Mengadopsi sistem font modern berbasis Google Fonts yang lengkap (200–800 Plus Jakarta Sans + 400–900 Geomini), di-embed secara offline (BAHASA Indonesia), dan diterapkan pada semua bagian halaman dengan seragam.
2.  **Dark Mode di Semua Tool:** Menerapkan tema gelap yang konsisten di 7 tool, dilengkapi dengan toggle theme biasa (tombol kecil) dan tema melalui shell (tombol sidebar).
3.  **Shell Berbasis Iframe Modular:** Menerapkan konfigurasi font yang menerapkan standard font 'Plus Jakarta Sans' untuk seluruh modul di shell (index.html) dan font berbasis Google Fonts yang diterapkan di semua widget internal.
4.  **Tata Kelola Baseline Global yang Efektif:** Menerapkan aturan dasar komprehensif untuk font baseline di seluruh halaman:
   * **HTML & BODY:** Plus Jakarta Sans untuk warna netral & umumnya (heading typography di proyek)
   * **Heading & Display:** Geomini (Plus Jakarta Sans sebagai fallback) untuk judul, judul besar
   * **Form & Konten:** Plus Jakarta Sans untuk semua input, tombol, dan komponen form
   * **Monospace:** Dilindungi untuk kode, log, receipt, catatan teknis
5.  **Pengurangan Hardcoded Colors:** Menyediakan CSS custom properties yang lengkap: `--primary`, `--accent`, `--bg`, `--text`, `--text-muted`, `--border` 
for consistent theming, integrated with the tool theme toggle features.

### Kualitas Aktual (Cons)
1.  **Navigasi & Riwayat Browser:** Penggunaan iframe standar memecah alur navigasi browser. Menekan tombol "Back" pada browser dapat mengeluarkan pengguna dari portal utama, alih-alih kembali ke halaman dashboard.
2.  **State Halaman Tidak Bertahan:** Saat portal utama di-refresh (F5), aplikasi akan mereset tampilan kembali ke dashboard awal, menutup tool yang sedang aktif dibuka pengguna.
3.  **Konsistensi Desain:** Desain luar dari shell (`index.html`) saat ini cenderung kaku dan monokrom, kontras dengan beberapa halaman tools internal yang memiliki desain visual dinamis.

---

## 🔄 3. Upaya Penanganan/Sinting Ulang

### ⚙️ Alur Kerja (Workflow)
*   **Hash-Based Routing:** Menerapkan navigasi berbasis hash (contoh: `index.html#/productive/analytic`). Memungkinkan fitur bookmark halaman, refresh pada modul aktif, serta mendukung fungsionalitas tombol "Back" browser.
*   **Pencarian Global Instan:** Menambahkan bar pencarian di dashboard utama untuk menyaring daftar modul tools secara real-time berdasarkan input keyboard.
*   **PostMessage API (Komunikasi Iframe):** Menghubungkan shell induk dengan dokumen iframe anak agar dapat berbagi pengaturan global seperti *Dark/Light Theme* secara real-time.
*   **Pemberitahuan Loading State:** Menampilkan indikator loading bar tipis di bagian atas ketika iframe sedang memuat konten (terutama untuk modul GAS eksternal).

### 🎨 Antarmuka (UI/UX)
*   **Transisi Bento Grid:** Mengubah daftar menu menjadi susunan kartu bento modern dengan sudut melengkung halus (`border-radius: 16px`), border minimalis, dan bayangan lembut.
*   **Interaksi Hover:** Memberikan umpan balik visual mikro-interaksi seperti transisi *soft-scale up* dan pendaran warna saat kursor menyorot kartu menu.
*   **Sidebar dengan Tooltip:** Menambahkan visualisasi perluasan menu sidebar desktop ketika diarahkan kursor (hover-expand) demi estetika workspace yang lebih dinamis.

---

## 🏗️ Perbaikan Sistem Berbasis Iframe — Pembaruan Font & Tema

### Rincian Perbaikan
*   **Penyesuaian Font Path:** Memperbaiki path `tools.css` di beberapa komponen (`Analytic.html`, `Outbondtrack.html`) agar tetap ter-load dengan benar, menerapkan sistem font yang terstandarisasi.
*   **Hari Perlindungan: Font Substitutions di All Components:** Memperbarui font-family pada komponen sistem seperti `components.css`, `design-system.css` menjadi `Plus Jakarta Sans` dan `Geomini`, menghapus ketergantungan pada fon legacy (*Outfit*, *Inter*).
*   **Font Defaulten Baru: tools.css:** Menambahkan basis font global yang komprehensif di `tools.css` agar diterapkan melalui sistem font baseline global di semua document (shell dan tools).
*   **Daftar To Do Modual:** Membangun daftar tugas terstruktur untuk memastikan API framework font dijaga tetap terkini di seluruh 7 original tools.
*   **Penghapusan Hardcoded Colors:** Mengganti warna hardcoded di seluruh tool ({~80} occurrences di `taskschedule.html`, `tracking.html`, `PDFM_V2.html`, `Outbondtrack.html`, `Analytic.html`, `retur-track.html`) menjadi custom CSS properties.
*   **Implementasi Dark Mode Komprehensif:** Menerapkan dark mode di seluruh tools melalui CSS custom properties dan `data-theme="dark"` selector, menyediakan pengalaman UI seragam yang memudahkan migrasi mode gelap.

### Catatan Pengembangan Mandiri
*   Font facing model telah diubah - kini terintegrasi dengan seluruh bagian dari sistem
*   Komponen fungsionalitas independen dikembangkan agar tetap harmonis dengan shell
*   Layanan font sudah offline dan dapat dipanggil kapan saja, bukan melalui internet
*   Font juga diterapkan pada shell index - menjamin konsistensi di seluruh platform
*   Komponen yang dimuat melalui iframe mampu menerapkan sistem font dengan benar
