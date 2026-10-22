# KNOWN_ISSUES — Suite PDF (OFFICE / LibreOffice WASM)

Catatan risiko & batas yang diketahui. Ditulis saat Blok 8 (fitur Office &harr; PDF).

## 1. Unduhan runtime besar pertama kali
- `soffice.wasm` &plusmn;147MB + `soffice.data` &plusmn;99MB = &plusmn;240MB diunduh saat konversi pertama, lalu di-cache browser.
- GitHub Pages mengirim `Cache-Control: max-age=600` (10 menit). Setelah lewat, browser hanya revalidasi ETag (respons 304 kecil) — bukan unduh ulang penuh, tapi tetap ada request. Kalau di-hosting sendiri, set header cache lebih panjang untuk pengalaman lebih baik.

## 2. SharedArrayBuffer / cross-origin isolation WAJIB
- LibreOffice WASM memakai pthread, jadi butuh `SharedArrayBuffer` → halaman harus `crossOriginIsolated` (header `COOP: same-origin` + `COEP: require-corp`).
- Solusi yang dipakai: `coi-serviceworker.js` di root folder ini (client-side, sama seperti demo resmi repo matbee). Scope SW = folder `Productive/pdf-merger/` — **jangan dipindah ke subfolder** (kalau script-nya tidak selevel halaman, halaman tak terkontrol dan bisa reload-loop).
- Risiko iframe: registrasi service worker dari dalam iframe hub hanya untuk iframe same-origin. Kalau browser menolak / isolasi tetap nonaktif setelah reload, halaman menampilkan badge "Isolasi: nonaktif" + tombol **"Buka di tab baru"** (fallback yang berfungsi di top-level tab).
- `file://` tidak didukung (secure context wajib) untuk fitur ini.

## 3. Sinkronisasi versi glue vs binary
- Glue JS dikunci di `assets/vendor/lo/` dari unpkg **@2 binary berat diambil dari `https://erseco.github.io/libreoffice-document-converter` (mirror resmi komunitas, CORS `*`, versi "latest release")`.
- Kalau mirror update release sementara glue kita belum, bisa terjadi mismatch kecil. Saat upgrade: unduh ulang 4 file glue dari unpkg dengan versi yang sama, lalu cek halaman demo mirror.

## 4. Kualitas hasil PDF &rarr; Office
- LibreOffice mengimpor PDF lewat filter Draw: tiap halaman jadi objek teks+gambar. DOCX/XLSX hasilnya rapi dilihat, tapi **bukan struktur paragraf/tabel dokumen asli** (memang batas format PDF, bukan bug tool).
- `pdf &rarr; xlsx/pptx` sering tidak masuk akal untuk dokumen biasa (pas untuk lampiran tabel/visual sederhana).

## 5. Batas lain
- Fitur Office butuh http(s)/localhost — dynamic `import()` module diblokir browser di `file://` (alat lain di suite ini tetap bisa jalan dari file lokal).
- Satu arah per aksi, tanpa opsi kualitas/konversi lanjutan (one-shot per dokumen, sesuai desain Blok 8).
- Dukungan format mengikuti build LibreOffice WASM-nya (15+ format masuk/keluar); pasangan yang tidak didukung akan memunculkan error dari runtime — pesan ditampilkan apa adanya.
