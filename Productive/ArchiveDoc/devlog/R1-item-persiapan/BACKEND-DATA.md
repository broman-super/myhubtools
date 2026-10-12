# R1 — Item Persiapan · BACKEND-DATA & FE-BLUEPRINT

## BE (store.js)

**Schema** — array baru `prepItems` (no migration required, additive):

```
{ id, eventId, nama, kategori, qty, biaya, status, dibawa:false, pulang:false, catatan }
```

- `dibawa`/`pulang` sudah disiapkan sejak R1 = nol migrasi di R2 (cross-check).
- Migrasi load: `if (!DB.prepItems) DB.prepItems = [];` — data lama aman.
- `deleteEvent` ikut membersihkan `prepItems`.
- Fungsi baru (diexport): `prepItems(eventId)`, `prepItemsDone(eventId)` (≥1 item & semua `selesai`), `prepBiaya(eventId)`, `savePrepItem(p)`, `deletePrepItem(id)`.

**Aksi (actions.js):** `prepitem:add` (validasi nama), `prepitem:setstatus` (select onchange), `prepitem:delete`.

## FE (pages2.js / pages.js)

- `tabPrepItems(ev)` — seksi produksi HTML string, list + form (id baru: `prep-nama`, `prep-kategori`, `prep-qty`, `prep-biaya`, `prep-status`, `prep-catatan`).
- `tabPersiapan`: `03 Item Persiapan` disisipkan; `04 Jadwal (Timeline)`.
- `pages.js` roadmap `checks[]`: conditional push chip "Persiapan siap" saat `prepItems.length > 0`.

**Anti-slop:** semua id `prep-*` unik per tab; `data-action` baru semua punya handler; tidak ada id duplikat dengan tab lain.

**Status:** ✅ terpasang & terverifikasi.