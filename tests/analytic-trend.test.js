// Regresi Analytic: rentang periode pembanding grafik TREN.
// Bug: setMonth(-1) pada tanggal 29-31 "melempar" hari ke bulan berikutnya
// (31 Okt → 1 Okt), sehingga periode pembanding memakan data periode ini dan
// grafik memunculkan bulan di luar rentang (mis. NOV yang cuma punya garis pembanding).
// Jalankan: node --test "tests/*.test.js"
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'Productive', 'analytic', 'Analytic.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = scripts.find(s => s.includes('function hitungRentangPembanding'));
if (!src) { console.error('FAIL: blok <script> utama Analytic tidak ditemukan'); process.exit(1); }

// Ekstrak deklarasi fungsi top-level berdasarkan indentasi baris pembuka + penutupnya.
function extractFn(source, name) {
  const at = source.indexOf('function ' + name + '(');
  if (at < 0) throw new Error('fungsi tidak ditemukan: ' + name);
  const lineStart = source.lastIndexOf('\n', at) + 1;
  const indent = source.slice(lineStart, at);
  let idx = source.indexOf('\n', at) + 1;
  while (idx > 0 && idx < source.length) {
    const nl = source.indexOf('\n', idx);
    const end = nl < 0 ? source.length : nl;
    let line = source.slice(idx, end);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line === indent + '}') return source.slice(lineStart, end);
    idx = end + 1;
  }
  throw new Error('penutup tidak ketemu: ' + name);
}

const ANALYTIC_FNS = ['toDateOnly', 'countDaysInclusive', 'geserBulanClamp_', 'hitungRentangPembanding', 'bucketTrend'];
const code = ANALYTIC_FNS.map(n => extractFn(src, n)).join('\n');

const range = { start: '2026-01-01', end: '2026-10-31', mode: 'monthly' };
const documentStub = {
  getElementById(id) {
    if (id === 'startDate') return { value: range.start };
    if (id === 'endDate') return { value: range.end };
    if (id === 'comparisonMode') return { value: range.mode };
    return null;
  }
};
const f = new Function('document', code + '\nreturn { ' + ANALYTIC_FNS.join(', ') + ' };')(documentStub);

const isoDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dt = (s) => { const p = s.split('-'); return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)); };
function prev(mode, s, e) {
  const r = f.hitungRentangPembanding(dt(s), dt(e), mode);
  return { start: isoDate(r.pStart), end: isoDate(r.pEnd) };
}

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) pass++;
  else { fail++; console.error('FAIL ' + label + ': expected ' + e + ', got ' + a); }
}

// 1. Kasus laporan: Januari–Oktober, "Bulan Lalu" tidak boleh meluber ke 1 Okt.
eq(prev('monthly', '2026-01-01', '2026-10-31'), { start: '2025-12-01', end: '2026-09-30' }, 'monthly Jan–Okt 2026');

// 2. Tanggal 31 bulan berjalan: clamp ke akhir bulan, bukan geser ke periode ini.
eq(prev('monthly', '2026-03-31', '2026-10-31'), { start: '2026-02-28', end: '2026-09-30' }, 'monthly 31 Mar–31 Okt 2026');

// 3. 31 Desember tidak boleh menyisakan seluruh Desember di periode pembanding.
eq(prev('monthly', '2026-01-31', '2026-12-31'), { start: '2025-12-31', end: '2026-11-30' }, 'monthly Jan–Des 2026');

// 4. Mode rolling tidak berubah: jumlah hari sama, tepat sebelum rentang.
eq(prev('rolling', '2026-01-01', '2026-10-31'), { start: '2025-03-03', end: '2025-12-31' }, 'rolling Jan–Okt 2026');

// 5. Bucket bulanan: label pembanding ikut periode pembanding, bukan disalin periode ini.
const tA = [
  { ts: 0, label: '01 Jan', sales: 100, retur: 0, salesLalu: 50 },
  { ts: 31, label: '01 Feb', sales: 200, retur: 0, salesLalu: 60 }
];
const buckets = f.bucketTrend(tA, 'monthly');
eq(buckets.slice(0, 2).map(b => b.label), ['JAN 26', 'FEB 26'], 'label bucket bulanan');
eq(buckets.slice(0, 2).map(b => b.labelLalu), ['DES 25', 'JAN 26'], 'label pembanding bucket bulanan');
eq(buckets.slice(0, 2).map(b => b.salesLalu), [50, 60], 'nilai pembanding tidak bertambah');

// 6. Bulan di luar rentang tidak boleh muncul walau data membawa offset lebih (kasus NOV 26).
const withPhantom = f.bucketTrend([
  { ts: 0, label: '01 Jan', sales: 100, retur: 0, salesLalu: 50 },
  { ts: 304, label: '01 Nov', sales: 0, retur: 0, salesLalu: 999 }
], 'monthly');
eq(withPhantom.length, 10, 'jumlah bucket = jumlah bulan dalam rentang');
eq(withPhantom.map(b => b.salesLalu).reduce((a, b) => a + b, 0), 50, 'pembanding di luar rentang dibuang');

console.log((fail === 0 ? 'PASS' : 'FAIL') + ' analytic-trend: ' + pass + ' pass, ' + fail + ' fail');
if (fail) process.exit(1);
