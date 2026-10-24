// Guard hapus SPPD: fullSave_ hanya boleh menghapus id yang klien lihat saat load.
// Jalankan: node tests/sppd-delete-guard.test.js  (exit 1 bila gagal; tanpa framework)
'use strict';
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'gas', 'sppdtoolbox.gs'), 'utf8');
const start = src.indexOf('function fullSave_(');
if (start < 0) { console.error('FAIL: fullSave_ tidak ditemukan'); process.exit(1); }
const end = src.indexOf('\n}\n', start);
const fn = src.slice(start, end + 3);

function run(db) {
  const calls = [];
  const sandbox = {
    TABLES: { events: { table: 'sppd_events', pk: 'id', cols: [] } },
    USER_ID: 'u',
    supabaseRequest_: (m, p, b, pref) => { calls.push({ m, p, b }); return { getContentText: () => '[]' }; },
    toRow_: (c, r) => r
  };
  const fullSave_ = new Function(...Object.keys(sandbox), fn + '\nreturn fullSave_;')(...Object.values(sandbox));
  fullSave_(db);
  return calls;
}

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; } else { fail++; console.error('FAIL: ' + name); }
}

// 1. Klien lama (tanpa __loadedIds): tidak menghapus apa pun
let c = run({ events: [{ id: 'a' }] });
check('tanpa __loadedIds = tanpa delete', c.filter(x => x.m === 'delete').length === 0);
check('upsert tetap jalan', c.some(x => x.m === 'post'));

// 2. Hanya id yang hilang yang dihapus
c = run({ events: [{ id: 'a' }, { id: 'b' }], __loadedIds: { events: ['a', 'b', 'c'] } });
const del = c.filter(x => x.m === 'delete');
check('satu delete untuk id hilang', del.length === 1 && /in\.\(c\)$/.test(del[0].p));

// 3. Daftar load kosong: jangan hapus (tab basi)
c = run({ events: [{ id: 'a' }], __loadedIds: { events: [] } });
check('__loadedIds kosong = tanpa delete', c.filter(x => x.m === 'delete').length === 0);

// 4. User benar-benar menghapus semua baris yang ia lihat: hapus boleh
c = run({ events: [], __loadedIds: { events: ['a'] } });
check('hapus semua baris yang dilihat = boleh', c.filter(x => x.m === 'delete').length === 1);

// 5. Key tabel lain tidak ikut terhapus
c = run({ events: [{ id: 'a' }], __loadedIds: { sppd: ['x'] } });
check('key tanpa baris = tanpa delete', c.filter(x => x.m === 'delete').length === 0);

console.log((fail ? 'FAIL' : 'OK') + ': ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
