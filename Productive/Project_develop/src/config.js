// Kredensial & endpoint. Isi bagian kosong ini.
//
// SUPABASE_URL / SUPABASE_ANON_KEY = project UNITOOLS.
//   - anon key bersifat publik & hanya punya akses READ (RLS select-only).
//   - write dilakukan lewat GAS bridge (service_role), bukan dari sini.
// GAS_SCRIPT_URL = URL .../exec hasil deploy gscode/rndtracker.gs
//
// Tips: bisa juga pakai .env (Vite baca VITE_*):
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... VITE_GAS_SCRIPT_URL=...
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://iyraamxkrygtzsqkvnqz.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cmFhbXhrcnlndHpzcWt2bnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDE3NTQsImV4cCI6MjEwMjA3Nzc1NH0.g9naRe6CJaZ-FIZHjUkVx_62GZlxVFixQbIUzDF3M7s';
export const GAS_SCRIPT_URL = import.meta.env.VITE_GAS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzYnv_jNa-6B5HA7wnTmWPrkB3Dboza6miXzA-4e3EcvSBUfAVJ0aKQe0-hQYdNjCKA6g/exec';
