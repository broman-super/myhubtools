# LATCH — Link Attach

Portal pengumpul dan manajemen tautan/link berkas penting kebutuhan operasional. Berbasis multi-file (HTML + CSS + JS) dengan backend **Supabase**.

- **File:** `Productive/latch/latch.html` (UI) + `css/style.css` + `js/app.js` (logika)
- **Backend:** Supabase (REST, project `iyraamxkrygtzsqkvnqz`) — tabel `latch_links`, `latch_categories`, `latch_config`; punya mode demo localStorage.
- **Status:** ✅ Supabase migration + UI refresh

---

## 1. Fitur & Cara Pakai

- **Grid link** — daftar tautan berkas penting dengan ikon favicon, deskripsi, pencarian, tampilan bertahap (`BATCH_SIZE`).
- **Rich link card** — favicon otomatis + deskripsi singkat + waktu + jumlah klik.
- **Sort by popularity** — toggle "Terbaru" / "Populer" (urutan klik terbanyak).
- **Click counter** — `click_count` naik tiap link diklik di view publik.
- **Config via backend** — `announcement` & `pin` disimpan di tabel `latch_config`.
- **Mode demo** — kalau `SUPABASE_URL` kosong / gagal, tool tetap jalan pakai localStorage (`pin: "1234"`).

---

## 2. Keterkaitan

### 2.1 Backend Supabase
- Jalankan **`latch_schema.sql`** di Supabase Dashboard > SQL Editor (sekali) untuk membuat tabel + RLS + seed config.
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` di `js/app.js` → `CONFIG`. (Sudah terisi project `iyraamxkrygtzsqkvnqz`.)
- Data disimpan di: `latch_links`, `latch_categories`, `latch_config` — prefix `latch_` agar tidak bentrok dgn tabel lain.

### 2.2 RLS
- Policy: siapa pun (anon) bisa **baca** semua, dan bisa **tulis** semua — model sama dengan backend GAS lama. PIN = penyaring akses frontend, bukan security nyata.

### 2.3 Hub & Shell
- Router: `#productive/latch` → `Productive/latch/latch.html`.
- Memuat **CSS bersama hub** `../../src/styles/tools.css`.

### 2.4 Storage lokal
- Namespace localStorage **`latch:`**. Hanya untuk: theme, `adminSession`, dan fallback demo.

### 2.5 Dependency
- Feather icons via CDN `unpkg.com/feather-icons@4.29.2`.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Jangan kehilangan mode demo/offline
- Baca/tulis lewat helper `storage` (namespace `latch:`). Pertahankan namespace — ganti akan "kehilangan" data lama user.
- Remote punya `LOAD_TIMEOUT_MS`; jika timeout → fallback ke localStorage.

### 3.2 Supabase RLS tidak boleh dihapus
- Tanpa policy, Supabase menolak akses anon. Jalankan `latch_schema.sql`; jangan hapus policy di dashboard.

### 3.3 Kolom snake_case vs camelCase
- Supabase pakai `snake_case` (`category_id`, `click_count`, `sort_order`, `created_at`). `db` module menormalkan ke camelCase utk UI, lalu `toRow()` kembali ke snake_case saat tulis. Jangan ubah mapping ini tanpa serentak di kedua arah.

### 3.4 Migrasi data dari LATCH lama (Google Sheets)
- Buka LATCH lama (versi GAS) → admin → **Export CSV**, lalu import file itu di LATCH baru via **Import**.
- Format CSV: `Title,URL,Category,Badge,Description`. `click_count` mulai dari 0.

### 3.5 Shared CSS hub
- Tambahan CSS di `css/style.css`, bukan di hub, agar tidak mengubah tool lain.

---

## 4. Flow Data (ringkas)

```
Buka → db.getData(): GET latch_links + latch_categories + latch_config (Supabase REST)
      gagal/timeout? pakai default demo localStorage
Tampil link grid → search → sort (Terbaru/Populer) → batch load
Klik link → db.incrementClick(id): PATCH click_count+1
Admin CRUD → POST/PATCH/DELETE Supabase → re-render
```
