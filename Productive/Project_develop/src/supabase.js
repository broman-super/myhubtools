import { SUPABASE_URL, SUPABASE_ANON_KEY, GAS_SCRIPT_URL } from './config.js';

const TABLE = 'rnd_roadmap';

// --- READ: langsung ke Supabase REST pakai anon key (RLS select-only) ---
export async function loadProjects() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?select=id,data,updated_at&order=updated_at.desc`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error('Gagal memuat data roadmap (' + res.status + ')');
  const rows = await res.json();
  return (rows || []).map((r) => {
    const data = Array.isArray(r.data) ? r.data[0] : r.data;
    return { ...data, id: r.id };
  });
}

// --- WRITE: lewat GAS bridge (service_role), bukan anon ---
// rows = [{ id, data }], deletes = [id,...] yang dihapus.
export async function syncToSupabase(rows, deletes) {
  if (!GAS_SCRIPT_URL) return { skipped: true };
  const res = await fetch(GAS_SCRIPT_URL, {
    method: 'POST',
    // text/plain (bukan application/json) agar tidak memicu CORS preflight OPTIONS
    // yang tidak dijawab GAS. e.postData.contents tetap berisi JSON mentah.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'sync', payload: { rows, deletes: deletes || [] } }),
  });
  if (!res.ok) throw new Error('Gagal menyimpan roadmap (' + res.status + ')');
  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
}

// --- Upload foto ke Supabase Storage lewat GAS (service_role) ---
// base64 = data URL hasil resizeImageFile (sudah dikompresi di client)
export async function uploadToStorage(base64, name, mime) {
  if (!GAS_SCRIPT_URL) return { skipped: true };
  const res = await fetch(GAS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'uploadStorage', payload: { base64, name, mime } }),
  });
  if (!res.ok) throw new Error('Gagal upload foto (' + res.status + ')');
  const r = await res.json().catch(() => ({}));
  if (r && r.success === false) throw new Error(r.error || 'Gagal upload foto');
  return r; // { success: true, photoUrl }
}

// Hapus objek foto lama di Storage (best-effort)
export async function deleteFromStorage(url) {
  if (!GAS_SCRIPT_URL || !url) return;
  try {
    await fetch(GAS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteStorage', payload: { url } }),
    });
  } catch {
    /* abaikan: cleanup terbaik */
  }
}
