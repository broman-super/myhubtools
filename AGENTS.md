# AGENTS.md — REYNAHUB / UNITOOLS

Panduan repo untuk AI coding agent (opencode, Claude, Cursor, dll.).

**Sebelum membuat/mengubah webtool, baca `docs/guidebook/README.md` →**
[`PANDUAN-TOOL-BARU.md`](docs/guidebook/PANDUAN-TOOL-BARU.md) (langkah cepat) →
[`design.md`](docs/guidebook/design.md) (sistem desain & konstitusi wajib).

## Aturan cepat

- Satu navbar, satu tema, satu bahasa desain; tool self-contained. Token, bukan hex.
- Hash rute di `src/core/router.js` **stabil** — jangan ubah hash tool lama.
- Folder tool **kebab-case**.
- Tool baru: daftar di `src/components/tool-card.js` + `src/core/router.js`. Sidebar (`group`) & `src/sw.js` tidak perlu diubah.
- Edit kode lama: **jangan hapus fungsi yang sudah ada** (apa pun permintaannya).
- Skill `web-gas-dev` dan `bro-ui` wajib dipakai bila relevan.
- Backend GAS di `gas/*.gs`; tulis data selalu `POST text/plain;charset=utf-8`.
- Commit/push **hanya jika diminta**.
