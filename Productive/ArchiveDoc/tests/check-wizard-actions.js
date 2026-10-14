/* Self-check: handler wizard SPPD dipanggil seperti browser delegation —
   tombol dalam modal TANPA data-event (d = {}), id event dari A._wzEv.
   Jalankan: node Productive/ArchiveDoc/tests/check-wizard-actions.js */
'use strict';
var fs = require('fs');
var path = require('path');

var BASE = path.join(__dirname, '..');
function readJs(f) { return fs.readFileSync(path.join(BASE, 'js', f), 'utf8'); }

global.window = {};
var MEM = {};
global.localStorage = {
  getItem: function (k) { return k in MEM ? MEM[k] : null; },
  setItem: function (k, v) { MEM[k] = String(v); },
  removeItem: function (k) { delete MEM[k]; }
};
global.document = {
  addEventListener: function () {},
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () { return { style: {}, setAttribute: function () {}, appendChild: function () {}, addEventListener: function () {} }; },
  getElementById: function () { return null; },
  contains: function () { return false; },
  body: { appendChild: function () {} },
  activeElement: null
};
global.setTimeout = function () {};

eval(readJs('ui.js'));
eval(readJs('store.js'));
eval(readJs('pages.js'));
eval(readJs('actions.js'));

var T = window.SPT;
/* no-op side effect supaya unit test tidak butuh DOM penuh */
T.toast = function () {};
T.reload = function () {};
T.closeModal = function () { return true; };
T.confirm = function (title, text, onOk) { onOk(); };

var fail = 0;
function ok(cond, msg) { if (!cond) { fail++; console.error('FAIL: ' + msg); } else { console.log('ok  - ' + msg); } }
function el(attrs) {
  return { getAttribute: function (n) { return n in attrs ? attrs[n] : null; }, value: '' };
}
function act(name, e, d) { T.actions[name](e || el({}), d || {}); }   /* d = {} → tanpa data-event */
function phantom() {
  var db = JSON.parse(MEM['spt_db_v1'] || MEM[Object.keys(MEM)[0]] || '{}');
  return db.sppdWizard && ('undefined' in db.sppdWizard);
}
function reset() {
  MEM = {};
  T._sppdWizard = {}; T._wzEv = null;
}

/* --- 1. open tanpa data-event tetap pakai konteks, tanpa record hantu --- */
reset();
act('sppd:wizard:open', el({}), {});          /* d.event undefined → fallback A._wzEv = null → no-op */
ok(!phantom(), 'open tanpa id → tidak bikin record hantom "undefined"');
T._wzEv = 'ev1';
T._sppdWizard = { ev1: { step: 0, maxStep: 0 } };

/* --- 2. Next dari Langkah 1 → Langkah 2 (dulu TypeError) --- */
var w = T.store.getSppdWizard('ev1'); w.kota = 'Banyumas'; w.tglBerangkat = '2026-07-03'; w.target[0] = 'Buka stan';
T.store.saveSppdWizard('ev1', w);
var threw = null;
try { act('sppd:wizard:next'); } catch (e) { threw = e; }
ok(!threw, 'next tanpa data-event tidak melempar error' + (threw ? ' (' + threw.message + ')' : ''));
ok(T._sppdWizard.ev1.step === 1, 'next majukan step 0→1 pada event ev1');
ok(T._sppdWizard.ev1.maxStep === 1, 'maxStep terbuka sampai 1');

/* --- 3. Next dari Langkah 2 (validasi kota/tanggal/target) --- */
act('sppd:wizard:next');
ok(T._sppdWizard.ev1.step === 2, 'next majukan step 1→2 (validasi lolos)');

/* --- 4. Stepper: boleh kembali ke langkah terbuka, ditolak ke depan --- */
act('sppd:wizard:step', el({ 'data-step': '0' }));
ok(T._sppdWizard.ev1.step === 0, 'step bisa lompat balik ke Langkah 1');
act('sppd:wizard:step', el({ 'data-step': '4' }));
ok(T._sppdWizard.ev1.step === 0, 'step ditolak ke langkah yang belum terbuka');

/* --- 5. Prev --- */
act('sppd:wizard:next'); act('sppd:wizard:next');
act('sppd:wizard:prev');
ok(T._sppdWizard.ev1.step === 1, 'prev mundurkan step');

/* --- 6. addbiaya/delbiaya tanpa data-event → tersimpan ke ev1 (bukan hantu) --- */
var CAP = T.store.SPPD_BIAYA_MAX;
ok(T.store.getSppdWizard('ev1').biaya.length === 5, 'biaya default 5 baris (sesuai form referensi)');
while (T.store.getSppdWizard('ev1').biaya.length < CAP) { act('sppd:wizard:addbiaya'); }
ok(T.store.getSppdWizard('ev1').biaya.length === CAP, 'addbiaya menambah sampai cap ' + CAP);
act('sppd:wizard:addbiaya');                    /* cap penuh → ditolak, tidak boleh throw */
ok(T.store.getSppdWizard('ev1').biaya.length === CAP, 'addbiaya ditolak saat cap ' + CAP);
act('sppd:wizard:delbiaya');
ok(T.store.getSppdWizard('ev1').biaya.length === CAP - 1, 'delbiaya mengurangi di ev1');
act('sppd:wizard:addbiaya');
ok(T.store.getSppdWizard('ev1').biaya.length === CAP, 'addbiaya menambah di ev1 setelah slot kosong');
ok(!phantom(), 'addbiaya/delbiaya tidak menulis ke record "undefined"');

/* --- 7. addrow / delrow --- */
act('sppd:wizard:addrow', el({ 'data-list': 'petugas' }));
ok(T.store.getSppdWizard('ev1').petugas.length === 2, 'addrow petugas di ev1');
act('sppd:wizard:delrow', el({ 'data-list': 'petugas' }));
ok(T.store.getSppdWizard('ev1').petugas.length === 1, 'delrow petugas di ev1');

/* --- 8. imgclear tanpa data-event --- */
var wd = T.store.getSppdWizard('ev1'); wd.perusahaan.logo = 'data:image/png;base64,x';
T.store.saveSppdWizard('ev1', wd);
act('sppd:wizard:imgclear', el({ 'data-img': 'logo' }));
ok(T.store.getSppdWizard('ev1').perusahaan.logo === '', 'imgclear mengosongkan logo di ev1');
ok(!phantom(), 'seluruh handler tidak meninggalkan record "undefined"');

/* --- 9. save tanpa data-event → data ev1 tersimpan & legacy sinkron --- */
var w9 = T.store.getSppdWizard('ev1'); w9.noSurat = '039/SPPD/UKM/2026';
T.store.saveSppdWizard('ev1', w9);
var threw2 = null;
try { act('sppd:wizard:save'); } catch (e) { threw2 = e; }
ok(!threw2, 'save tanpa data-event tidak melempar error' + (threw2 ? ' (' + threw2.message + ')' : ''));
ok(T.store.getSppdWizard('ev1').kota === 'Banyumas', 'save menulis ke ev1, bukan key lain');
var legacy = T.store.getSppd('ev1');
ok(legacy && legacy.noSurat === '039/SPPD/UKM/2026', 'syncWizardToLegacy menyalin nomor surat ke data lama');

/* --- 10. P0: syncWizardToLegacy tidak mengosongkan data form lama --- */
var lg = T.store.getSppd('ev1');
lg.noSurat = 'LEGACY/2026'; lg.status = 'disetujui'; lg.danaAwal = 1500000;
T.store.saveSppd(lg);
var w10 = T.store.getSppdWizard('ev1'); w10.noSurat = ''; w10.status = 'draft'; w10.danaAwal = 0;
T.store.saveSppdWizard('ev1', w10);
T.store.syncWizardToLegacy('ev1');
lg = T.store.getSppd('ev1');
ok(lg.noSurat === 'LEGACY/2026', 'sync: wizard kosong tidak menimpa nomor surat legacy');
ok(lg.status === 'disetujui', 'sync: status legacy tetap (wizard default tidak menimpa)');
ok(lg.danaAwal === 1500000, 'sync: dana awal legacy tetap');
ok(T.store.getSppdWizard('ev1').noSurat === 'LEGACY/2026', 'sync: nilai legacy terbawa ke wizard (chip ikut terisi)');

/* --- 11. validasi gagal → lompat ke Langkah 2, bukan toast saja --- */
var w11 = T.store.getSppdWizard('ev1'); var keepKota = w11.kota; w11.kota = '';
T.store.saveSppdWizard('ev1', w11);
T._sppdWizard = { ev1: { step: 5, maxStep: 5 } };
act('sppd:wizard:save');
ok(T._sppdWizard.ev1.step === 1, 'save saat data kurang → lompat ke Langkah 2 (indeks 1)');
w11 = T.store.getSppdWizard('ev1'); w11.kota = keepKota; T.store.saveSppdWizard('ev1', w11);
ok(T.store.getSppd('ev1').noSurat === 'LEGACY/2026', 'save gagal tidak menyentuh data legacy');

/* --- 12. date picker: handler didelegasikan di document (bukan per-elemen),
       jadi kolom yang dirender ulang setelah load tetap responsif --- */
var reg = [];
global.document.addEventListener = function (type, fn) { reg.push({ type: type, src: String(fn) }); };
T._dpDelegated = false;
T._initDatePickers(document);
T._initDatePickers(document);
var dpClick = reg.filter(function (r) { return r.type === 'click' && r.src.indexOf('data-date-display') > -1 && r.src.indexOf('is-open') > -1; });
ok(dpClick.length === 1, 'klik date-display didelegasikan di document (sekali, bukan per-elemen)');
var dpChange = reg.filter(function (r) { return r.type === 'change' && r.src.indexOf('date-native') > -1; });
ok(dpChange.length === 1, 'change date-native didelegasikan di document');

/* --- 13. time picker (Jam Berangkat): delegasi + popover 24 jam --- */
T._tpDelegated = false;
T._initTimePickers();
T._initTimePickers();
var tpClick = reg.filter(function (r) { return r.type === 'click' && r.src.indexOf('data-time-display') > -1 && r.src.indexOf('data-time-hour') > -1; });
ok(tpClick.length === 1, 'klik time-display/jam didelegasikan di document (sekali)');
var tpChange = reg.filter(function (r) { return r.type === 'change' && r.src.indexOf('data-time-min') > -1; });
ok(tpChange.length === 1, 'ganti menit didelegasikan di document');
var fakePop = { innerHTML: '', dataset: {} };
T._buildTimePop(fakePop, '09.00 WIB');
ok(fakePop.innerHTML.indexOf('data-time-hour="9"') > -1 && fakePop.innerHTML.indexOf('data-time-hour="23"') > -1, 'popover jam render 00-23');
ok(fakePop.innerHTML.indexOf('is-selected') > -1 && fakePop.innerHTML.indexOf('data-time-min') > -1, 'popover jam punya jam terpilih + select menit');

console.log('\n' + (fail ? 'FAILED (' + fail + ')' : 'ALL PASS'));
process.exit(fail ? 1 : 0);
