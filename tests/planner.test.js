// C12: harness mini TaskSpace — ekstrak fungsi murni dari taskschedule.html, jalankan asersi.
// Jalankan: node tests/planner.test.js  (exit 1 bila gagal; tanpa framework)
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'Productive', 'planner', 'taskschedule.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = scripts.find(s => s.includes('function normDate'));
if (!src) { console.error('FAIL: blok <script> utama tidak ditemukan'); process.exit(1); }

// Ekstrak deklarasi fungsi top-level (indent 4 spasi; satu-liner langsung berakhir '}')
function extractFn(source, name) {
  const re = new RegExp('function ' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) throw new Error('fungsi tidak ditemukan: ' + name);
  const lineStart = source.lastIndexOf('\n', m.index) + 1;
  let lineEnd = source.indexOf('\n', m.index);
  if (lineEnd < 0) lineEnd = source.length;
  const firstLine = source.slice(lineStart, lineEnd);
  if (/\}\s*$/.test(firstLine)) return firstLine;
  let idx = lineEnd + 1;
  while (idx < source.length) {
    const nl = source.indexOf('\n', idx);
    const end = nl < 0 ? source.length : nl;
    if (/^\s{4}\}\s*$/.test(source.slice(idx, end))) return source.slice(lineStart, end);
    idx = end + 1;
  }
  throw new Error('penutup tidak ketemu: ' + name);
}

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CHANNELS = {};
// data uji untuk normalizeAll_ — S diikat per-call, isi sejak awal
const S = {
  tasks: [{ nama: 'T1', mulai: '2026-02-01', deskripsi: 'd', warna: '#123456' }],
  events: [{ nama: 'E1', mulai: '2026-02-02', selesai: '2026-02-03' }],
  reminders: [{ nama: 'R1', mulai: '2026-02-04' }]
};

const NAMES = ['pad', 'dateStr', 'normDate', 'formatShortDate', 'esc', 'isCampaignLike', 'hexToRgbArr', 'sortByUrutan', 'normalizeAll_', 'getWeekNumber', 'shareSlugFromHash'];
const code = NAMES.map(n => extractFn(src, n)).join('\n');
const f = new Function('MONTHS_ID', 'CHANNELS', 'S', code + '\nreturn { ' + NAMES.join(', ') + ' };')(MONTHS_ID, CHANNELS, S);

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error('FAIL ' + label + ': expected ' + e + ', got ' + a); }
}

eq(f.pad(7), '07', 'pad(7)');
eq(f.pad(12), 12, 'pad(12)');
eq(f.dateStr(new Date(2026, 0, 5)), '2026-01-05', 'dateStr');
eq(f.normDate(''), '', 'normDate kosong');
eq(f.normDate('2026-10-15'), '2026-10-15', 'normDate polos');
eq(f.normDate('2026-10-15T10:00:00.000'), '2026-10-15', 'normDate ISO lokal (tanpa Z = tanpa geser TZ)');
eq(f.formatShortDate('2026-10-15'), '15 Okt', 'formatShortDate');
eq(f.esc('a<b&"c"'), 'a&lt;b&amp;&quot;c&quot;', 'esc');
eq(f.isCampaignLike({ title: 'IG | Konten feed' }), true, 'isCampaignLike prefix IG');
eq(f.isCampaignLike({ title: 'Rapat mingguan' }), false, 'isCampaignLike bukan campaign');
eq(f.hexToRgbArr('#ff8800'), [255, 136, 0], 'hexToRgbArr');

// sortByUrutan: kosong/'' → 1e9 (belakang), stabil
eq(f.sortByUrutan([{ id: 'a' }, { id: 'b', urutan: 2 }, { id: 'c', urutan: 1 }, { id: 'd', urutan: '' }]).map(x => x.id),
  ['c', 'b', 'a', 'd'], 'sortByUrutan urut + kosong di belakang');

// normalizeAll_: row sheet lama (key Indonesia) → field standar
f.normalizeAll_();
eq(S.tasks[0].title, 'T1', 'normalizeAll_ task.title');
eq(S.tasks[0].date, '2026-02-01', 'normalizeAll_ task.date');
eq(S.tasks[0].color, '#123456', 'normalizeAll_ task.color');
eq(S.tasks[0].enddate, '2026-02-01', 'normalizeAll_ task.enddate fallback ke date');
eq(S.events[0].title, 'E1', 'normalizeAll_ event.title');
eq(S.events[0].enddate, '2026-02-03', 'normalizeAll_ event.enddate');
eq(S.reminders[0].title, 'R1', 'normalizeAll_ reminder.title');
eq(S.reminders[0].date, '2026-02-04', 'normalizeAll_ reminder.date');

// getWeekNumber: 2026-01-01 jatuh Kamis → minggu 1
eq(f.getWeekNumber(new Date(2026, 0, 1)), 1, 'getWeekNumber 2026-01-01');

// shareSlugFromHash: parse hash share mode (#ss-<slug>)
eq(f.shareSlugFromHash('#ss-campaign-oct2026'), 'ss-campaign-oct2026', 'shareSlugFromHash valid');
eq(f.shareSlugFromHash('#productive/planner'), '', 'shareSlugFromHash hash tool lama diabaikan');
eq(f.shareSlugFromHash(''), '', 'shareSlugFromHash kosong');
eq(f.shareSlugFromHash('#ss-Campaign'), '', 'shareSlugFromHash huruf besar ditolak');
eq(f.shareSlugFromHash('#ss-a b'), '', 'shareSlugFromHash spasi ditolak');

console.log((fail ? 'FAIL' : 'OK') + ': ' + pass + ' pass, ' + fail + ' fail — ' + NAMES.length + ' fungsi diekstrak dari taskschedule.html');
process.exit(fail ? 1 : 0);
