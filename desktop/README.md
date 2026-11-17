# ReynaHub Desktop (Electron)

Catatan penanda untuk pembungkus Windows ReynaHub. Baca ini sebelum menyentuh folder
`desktop/`. Aplikasi webnya sendiri tidak berubah sama sekali — semua tool tetap
hidup di `Productive/`, `dak/`, dan `index.html` seperti biasa.

## Keputusan inti (jangan diubah tanpa alasan kuat)

**Aplikasi ini memuat `https://reynahub.web.id` langsung, bukan membundel aset.**
Konsekuensi yang disengaja:

- Update tool cukup `git push` ke `main`; semua anggota tim langsung dapat versi baru
  tanpa install ulang aplikasi.
- Tidak ada salinan kedua dari 12 MB aset, tidak ada library CDN yang perlu
  di-*vendor*, tidak ada service worker yang perlu diurus.
- Origin tetap `reynahub.web.id`, jadi `localStorage` (tema, kunci tulis tim) sama
  persis dengan saat memakai browser — tidak ada input ulang.
- Konsekuensi yang diterima: **tanpa internet aplikasi tidak bisa dipakai**. Itu
  memang desain produknya. Yang disediakan hanyalah layar "internet mati".

Kalau suatu hari aplikasi harus bisa dipakai offline, itu bukan tambalan kecil:
library CDN (Chart.js, jQuery, SheetJS, pdf-lib, pdf.js, Sortable, Tailwind CDN di
`activity-tracker`) harus dipindahkan ke lokal dulu. Jangan janjikan offline sebelum
itu dikerjakan.

## Mode shell (menu native)

Situs dimuat dengan **`?shell=1`**. Di mode itu hub menambahkan kelas
`html.shell-mode` (lihat `src/app.js` + `src/styles/components.css`) yang
menyembunyikan landing dan sidebar hub, sehingga tool memakai seluruh jendela.
Browser biasa tidak terpengaruh karena tanpa query itu mode ini tidak aktif.

Navigasi disediakan menu jendela native:

- **ReynaHub → Beranda** (`Alt+←`), **Cari Tool…** (`Ctrl+K`), **Muat ulang** (`Ctrl+R`).
- Submenu per grup: Analitik & Insight, Operasional & Logistik, Dokumen & Arsip,
  Perencanaan & Tim.
- **Tampilan**: layar penuh, zoom, ukuran normal (DevTools hanya saat dev).
- Pindah tool memakai `location.hash`, bukan muat ulang halaman, supaya tool
  berganti tanpa kedip. Tool terakhir diingat di `window-state.json`.
- Palette `Ctrl+K` (`palette.html`) mencari judul/deskripsi/hash, `↑ ↓` pilih,
  `Enter` buka, `Esc` tutup, dan menutup sendiri saat kehilangan fokus.

**Daftar tool tidak ditulis dua kali.** `scripts/build-tools.js` membaca
`src/components/tool-card.js` + `src/core/router.js` lalu menghasilkan
`tools.json` (di-ignore git, dibuat ulang setiap `npm start` / `npm run build`).
Kalau ada tool baru di hub, menu aplikasi ikut bertambah tanpa edit di sini —
tapi `npm run build` harus dijalankan lagi agar daftar di aplikasi ikut baru.

Tool tetap berjalan di dalam iframe hub. Itu disengaja: sinkronisasi tema lewat
`window.parent.postMessage` dan logika share link planner (`parent.location.hash`)
bergantung pada parent HTML. Jangan pindahkan tool keluar iframe tanpa
memindahkan logika tema ke `localStorage` per tool.

## Struktur

```
desktop/
├── main.js            proses utama: jendela, probe koneksi, layar offline, menu, palette
├── preload.js         jembatan minimal: retry, tools, open, close
├── palette.html       pencarian tool Ctrl+K (tanpa sumber daya eksternal)
├── scripts/build-tools.js  generator tools.json dari hub (satu sumber data)
├── offline.html       layar "Tidak ada koneksi internet" (tanpa sumber daya eksternal)
├── build/icon.png     ikon aplikasi 256×256 (dipakai electron-builder)
├── package.json       manifest + konfigurasi build (portable + zip)
└── dist/              hasil build (diabaikan git)
```

Tidak ada `node_modules` di repo — jalankan `npm install` di folder ini setelah clone.

## Menjalankan & membangun

```bash
cd desktop
npm install            # sekali per mesin
npm start              # generate tools.json lalu jalankan (dev)
npm run build:dir      # hasil unpacked di dist/win-unpacked (cepat, untuk uji)
npm run build          # installer portable .exe + .zip di dist/
```

Build pertama mengunduh Electron (± 100 MB) dan toolchain NSIS. Setelah itu offline.

## Cara kerja deteksi koneksi

1. Saat aplikasi dibuka, `main.js` mengirim `HEAD https://reynahub.web.id/?ping=...`
   dengan batas waktu **6 detik**.
2. Gagal → tampil `offline.html`, lalu probe diulang **tiap 5 detik** sampai berhasil.
3. Berhasil → situs dimuat, lalu probe berkala **tiap 30 detik**. Dua kegagalan
   berturut-turut dianggap internet mati (`MISS_LIMIT = 2`) supaya tidak berkedip
   saat jaringan hanya tersendat.
4. `did-fail-load` pada frame utama juga langsung memunculkan layar offline, untuk
   kasus internet putus saat pindah halaman.

**Jangan pakai `navigator.onLine` sebagai penentu.** WiFi bisa tersambung tanpa
internet, dan itu justru kasus yang paling sering terjadi di lapangan.

## Aturan keamanan yang sudah dipasang

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- Navigasi dikunci ke origin `reynahub.web.id`; tautan keluar dibuka di browser
  lewat `shell.openExternal`, bukan di dalam aplikasi.
- `Menu` bawaan Electron dihapus supaya tidak ada menu yang membingungkan.

Kalau nanti menambah IPC baru, tambahkan di `preload.js` dengan nama spesifik — jangan
membuka `ipcRenderer` mentah ke halaman.

## Distribusi ke tim

1. `npm run build` → `desktop/dist/ReynaHub-1.0.0-portable.exe` (jalankan langsung,
   tanpa instalasi) dan `ReynaHub-1.0.0-win.zip` (extract lalu jalankan).
2. Bagikan lewat drive internal/WhatsApp. **Tidak ditandatangani**, jadi Windows
   menampilkan "Unknown publisher" sekali per PC: More info → Run anyway.
3. Kalau antivirus menandai `.exe` portable (sering terjadi pada NSIS tanpa tanda
   tangan), gunakan versi `.zip`.

Tidak perlu build ulang saat tool di situs berubah — hanya saat `desktop/` berubah.

## Penanda lanjutan (belum dikerjakan, sengaja)

- [ ] **Domain berubah** → ubah satu konstanta `APP_URL` di `main.js`, naikkan
      `version`, build ulang, distribusi ulang. Ini satu-satunya perubahan yang
      memaksa semua orang install ulang.
- [ ] **Auto-update** (`electron-updater` + GitHub Releases) kalau pengguna > 5 orang
      dan distribusi manual mulai merepotkan.
- [ ] **Code signing** kalau tim melebar atau ada kebijakan IT. Sertifikat OV
      ± $200–400/tahun; tanpa itu SmartScreen tetap muncul.
- [ ] **Tray + auto-start** kalau aplikasi dipakai sebagai jendela harian.
- [ ] **Update Electron 2× setahun** — Chromium tertanam bisa usang. Cukup naikkan
      versi `electron` di devDependencies lalu build ulang.

## Risiko yang diketahui

- Bukan aplikasi offline; kegagalan jaringan = layar offline, bukan data cache.
- `localStorage` (termasuk kunci tulis tim) tersimpan di profil aplikasi
  (`%APPDATA%/ReynaHub`), terpisah dari browser. Kunci yang sama tetap berlaku.
- Aplikasi membuka koneksi ke GAS dan Supabase seperti browser biasa; kuota backend
  tidak bertambah karena wrapper.
- Kalau situs memakai dialog `window.open` atau redirect ke domain lain, tautan itu
  keluar ke browser (bukan bug, memang disengaja).
