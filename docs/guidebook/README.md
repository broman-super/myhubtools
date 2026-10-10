# Guidebook — REYNAHUB / UNITOOLS

**Satu pintu masuk** untuk developer & AI yang akan membuat atau mengubah webtool di repo ini. Baca berurutan sebelum menyentuh kode.

---

## Bab

| # | Bab | Untuk apa |
|---|---|---|
| 0 | [`MULAI-DARI-NOL.md`](MULAI-DARI-NOL.md) | **Portabel / PC fresh tanpa repo.** Berisi kontrak + template utuh + checklist, siap dibawa ke mana saja. |
| 1 | [`PANDUAN-TOOL-BARU.md`](PANDUAN-TOOL-BARU.md) | Cepat: apa itu hub, 4 kontrak wajib, langkah membuat + mendaftarkan tool. |
| 2 | [`design.md`](design.md) | Lengkap: sistem token, konstitusi 6 aturan, template HTML utuh, checklist kelulusan. **Referensi utama.** |
| — | [`../UI_AUDIT_LAYOUT.md`](../UI_AUDIT_LAYOUT.md) | Konteks (bukan aturan): audit kondisi UI tiap tool. |

## Urutan baca

**Di dalam repo:** `PANDUAN-TOOL-BARU.md` → `design.md` → coding.

**Di PC lain, tanpa repo:** bawa `MULAI-DARI-NOL.md` saja → beri ke AI → ikuti §8-nya.

## Aturan repo (jangan dilanggar)

- **Satu navbar, satu tema, satu bahasa desain**; tool self-contained (CSS+JS inline).
- **Token, bukan hex** — 0 hex/rgba di luar `:root`.
- **Hash rute stabil** — `src/core/router.js`. Folder boleh di-rename, hash tool lama tidak berubah.
- **Folder tool kebab-case** (`pdf-merger`, `retur-track`, `outbound-track`, …).
- Tool baru: daftar di `src/components/tool-card.js` + `src/core/router.js`. **Sidebar `tool-card.js` cukup lewat `group`; `src/sw.js` tidak diubah.**
- Saat mengedit kode lama: **jangan hapus fungsi yang sudah ada**.

## Konteks AI (opencode)

- Skill terpasang: `web-gas-dev` (dev web/tool) dan `bro-ui` (UI/UX) — dipakai otomatis sesuai konteks.
- Pintu masuk AI: [`AGENTS.md`](../../AGENTS.md) di root.
- Guidebook ini = konteks proyek; skill = instruksi kerja.
