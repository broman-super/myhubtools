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

## ⭐️ 2. Penilaian & Evaluasi Sistem

### 👍 Kelebihan (Pros)
1.  **Performa Maksimal (Ultra Lightweight):** Berjalan tanpa framework JavaScript berat (React/Vue/Angular), membuat pemuatan portal dan navigasi antar-modul berjalan secara instan.
2.  **Arsitektur Modular (Decoupled):** Pemisahan kode antar-modul memastikan jika satu tool mengalami gangguan/error, portal utama dan modul lainnya tetap dapat diakses dengan normal.
3.  **Responsivitas Mobile:** Perpindahan layout dari sidebar kiri (desktop) menjadi bottom-navigation (mobile) dirancang dengan baik, menghemat ruang layar dan ramah sentuhan.
4.  **UI Tool Internal yang Matang:** Beberapa tool internal seperti Analytic (Bento Style) dan Outbondtrack memiliki antarmuka yang modern, fungsional, dan siap pakai.

### 👎 Kelemahan Saat Ini (Cons)
1.  **Navigasi & Riwayat Browser:** Penggunaan iframe standar memecah alur navigasi browser. Menekan tombol "Back" pada browser dapat mengeluarkan pengguna dari portal utama, alih-alih kembali ke halaman dashboard.
2.  **State Halaman Tidak Bertahan:** Saat portal utama di-refresh (F5), aplikasi akan mereset tampilan kembali ke dashboard awal, menutup tool yang sedang aktif dibuka pengguna.
3.  **Konsistensi Desain:** Desain luar dari shell (`index.html`) saat ini cenderung kaku dan monokrom, kontras dengan beberapa halaman tools internal yang memiliki desain visual dinamis.

---

## 🔄 3. Rencana Peningkatan (Workflow & UI/UX)

Untuk mengoptimalkan fungsionalitas dan kenyamanan operasional sistem, berikut adalah rencana peningkatan yang dapat diterapkan:

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

## 🚀 4. Integrasi Landing Page & Redesign Modern Minimalis

Sebagai bagian dari rencana penambahan **Landing Page**, berkas utama `index.html` dapat dikembangkan dengan struktur hibrida yang memisahkan area presentasi (*Landing Mode*) dengan area operasional (*Workspace Mode*):

1.  **Landing Mode:** Bertindak sebagai pintu masuk pertama yang memuat slogan operasional, deskripsi singkat ekosistem REYNAHUB, status sistem, serta tombol transisi dinamis *"Akses Workspace"*.
2.  **Workspace Mode:** Menyembunyikan elemen landing page dengan efek transisi geser ke atas (*slide-up*), kemudian membuka antarmuka dashboard utama dan sidebar dengan animasi halus.

---

## 🛠️ Pengembangan Mandiri & Kontribusi
Semua modul tools berada di dalam direktori `/Productive` dan `/Doc`. Untuk memodifikasi atau menambahkan fungsionalitas tracker baru, pastikan file baru didaftarkan ke dalam grid kartu bento di `index.html` dan disesuaikan dengan skema API Google Apps Script yang telah dikonfigurasi.
