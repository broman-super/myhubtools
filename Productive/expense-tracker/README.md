# Expense Tracker

Pencatatan, approval, dan laporan pengeluaran tim — **role pengaju vs approver**, draft/pengajuan, dan lifecycle status.

- **File:** `Productive/expense-tracker/index.html` (≈941 baris, single-file)
- **Backend:** Google Apps Script (Web App) — `GAS_URL` di dalam IIFE
- **Status:** ✅ Stable — GAS integration

---

## 1. Fitur & Cara Pakai

- **Form pengajuan** — tanggal, kategori, deskripsi, jumlah (rupiah), file bukti (`fileData`).
- **Simpan draft** / **Kirim pengajuan**.
- **Daftar + filter** — status, kategori, rentang tanggal, pencarian.
- **Lifecycle persetujuan:** draft → pengajuan → (approve / reject) → markRealisasi → markReimburse; bisa cancel/delete.
- **Dashboard:** summary, trend, count by status.
- **User persisten:** nama pengaju disimpan `localStorage`.

---

## 2. Keterkaitan

### 2.1 Backend GAS
- `GAS_URL = https://script.google.com/macros/s/AKfycbw9iBZCPDohANTqxt4aP38qTk3_HxqYADn5yj4u3IFysnow3BMhUrhIS5dKMgMrNHEtDg/exec` (IIFE, line 372).
- Semua panggilan via **`fetchGAS(action, data, callback)`**:
  - `POST` `text/plain;charset=utf-8`, body `JSON.stringify({ action, data })`.
  - Callback terima `{ success, result }` atau `{ success:false, message }`. Parse pakai `try/catch` (jaga response tak valid).
  - **Jangan ganti ke `application/json`** — perlu `text/plain` untuk hindari CORS preflight.

#### Action (12)
| Action | Payload | Efek |
|---|---|---|
| `submitExpense` | `{tanggal,kategori,deskripsi,jumlah,pengaju,status,file}` (status: `draft`/`pengajuan`) | Submit / draft |
| `getExpenses` | filters `{status,kategori,from,to,search}` | List riwayat |
| `getExpenseById` | `{id}` | Detail |
| `approveExpense` | `{id, approver}` | Setujui |
| `rejectExpense` | `{id, reason, pengaju}` | Tolak |
| `markRealisasi` | `{id, lunas:true}` | Tandai terbayar |
| `markReimburse` | `{id}` | Tandai reimburse |
| `cancelExpense` | `{id}` | Batalkan |
| `deleteExpense` | `{id}` | Hapus |
| `getExpenseSummary` | `{periode:'this_month'}` | Ringkasan |
| `getExpenseTrend` | `{}` | Tren chart |
| `getExpenseCountByStatus` | `{periode:'this_month'}` | Count per status |

### 2.2 Storage
| Key | Isi |
|---|---|
| `expense_user` | Nama pengaju (persist) |
| `expense_draft` | Draft form yang belum disubmit |
| `reynahub-theme` | Tema (`light`/`dark`, pakai bila standalone, **bukan** untuk disimpan sendiri dua — hub sudah kelola) |

> `reynahub-theme` **jangan ditimpa**; ini jalur fallback bila tool dibuka tanpa iframe (bukan di hub).

### 2.3 Theme handshake
- Di dalam hub (iframe): post `request-theme` ke parent → parent balas `SET_THEME`.
- Standalone: baca `reynahub-theme` → default `dark` bila tidak ada.

### 2.4 Hub & Shell
- Router: `#utilities/expense` → `Productive/expense-tracker/index.html`.
- CSS: `../../src/styles/tools.css` + kategori warna lokal `CAT_COLORS` (transport, makan, komunikasi, ppn, hotel, lainnya). Jangan rename kategori tanpa update sekutu `CAT_COLORS`.

---

## 3. Catatan Perubahan & Aturan Anti-Bug

### 3.1 Tambah status / lifecycle
- Workflow status ada di **backend** (`doPost` / `switch(action)`). Penambahan status baru memerlukan: action GAS baru + tombol UI + handler → **ketiganya sekaligus**. Jangan hanya di frontend.

### 3.2 `fetchGAS` — contract tunggal
- Nama action, key payload (`action`, `data`), dan `text/plain` harus konsisten semua action. Jangan pakai endpoint/kontrak campuran.

### 3.3 Draft persistence otomatis
- Draft disimpan `localStorage` tiap kali field berubah; clear pakai `removeItem('expense_draft')` setelah submit sukses (L596). Pastikan `clearForm()` tetap panggil `removeItem`, jangan hapus.

### 3.4 Penggunaan `window.parent` untuk tema
- Pengecekan `if (window.parent !== window)` membedakan hub vs standalone. Jika di-host ulang (mis. halaman sama tapi iframe lain), tema bisa salah. Jangan pernah hardcode `data-theme`, lewatkan ke parent.

### 3.5 Format mata uang
- `parseRupiah`/`formatRupiah` memakai `toLocaleString('id-ID')`. Jika ingin dukung mata uang lain, ubah sekutu fungsi + CAT_COLORS, bukan satu-satunya.

---

## 4. Flow Data (ringkas)

```
Isi form → draft disimpan localStorage ('expense_draft')
Kirim (draft/pengajuan) → fetchGAS('submitExpense', data) → onSuccess: clearForm, removeItem('expense_draft'), refresh list
List → fetchGAS('getExpenses', filters)
Detail/click baris → fetchGAS('getExpenseById', {id})
Approval → fetchGAS('approveExpense'/'rejectExpense' | 'markRealisasi' | 'markReimburse')
Dashboard → getExpenseSummary + getExpenseTrend + getExpenseCountByStatus
```
