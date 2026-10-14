/* Self-check: renderer SPPD + wizard wizard-helpers.
   Jalankan: node Productive/ArchiveDoc/tests/check-sppd.js
   Tidak pakai framework: stub window + A minimal, lalu assert. */
'use strict';
var fs = require('fs');
var path = require('path');

var BASE = path.join(__dirname, '..');
function readJs(f) { return fs.readFileSync(path.join(BASE, 'js', f), 'utf8'); }

global.window = {};
global.document = undefined;

var A = global.window;
A.SPT = {};                     // target export IIFE (window.SPT)
var T = A.SPT;                  // fungsi-fungsi di-export ke sini
T.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
A.toast = function () {};
A.fmt = function (n) { return 'Rp' + (Number(n) || 0).toLocaleString('id-ID'); };
/* stub helper ui yang dipakai renderer halaman (tidak perlu asli untuk assert render) */
T.toast = function () {};
T.fmt = A.fmt;
T.dateField = function (id, label, v, o) { return '<label class="label">' + label + '</label><input id="' + id + '" type="date" value="' + (v || '') + '">'; };
T.moneyInput = function (id, label, v) { return '<label class="label">' + label + '</label><input id="' + id + '" value="' + (v || 0) + '">'; };

/* eksekusi modul dalam scope IIFE pakai `window` sebagai A */
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

var noSurat = '039/SPPD/UKM/2026';
function wizardData() {
  return {
    perusahaan: { nama: 'PT. ELFIQA KARYA TRIANGGA', logo: '', wmMode: 'teks', wmImg: '', wmText: 'PT. ELFIQA KARYA TRIANGGA' },
    pemberiTugas: 'Direktur', departemen: 'SUPERSUB',
    tglBerangkat: '2026-07-03', jamBerangkat: '09.00 WIB',
    tglKembali: '2026-07-05', ketKembali: 'sampai dengan selesai',
    transport: { pribadi: true, travel: false, kereta: false, lainnya: '' },
    kota: 'BANYUMAS', target: ['Membuka Stan di Event MAG Enduro 2026', '', ''],
    biaya: [
      { item: 'BBM Pertalite', jumlah: 300000, ket: '' },
      { item: 'Kas Kecil', jumlah: 200000, ket: 'Untuk Kembalian' },
      { item: '', jumlah: 0, ket: '' }, { item: '', jumlah: 0, ket: '' },
      { item: '', jumlah: 0, ket: '' }, { item: '', jumlah: 0, ket: '' },
      { item: '', jumlah: 0, ket: '' }, { item: '', jumlah: 0, ket: '' }
    ],
    petugas: ['FIRMAN', 'R.M TAQWA'],
    uangSaku: [
      { wq: 2, wa: 100000, eq: 1, ea: 150000 },
      { wq: 2, wa: 100000, eq: 1, ea: 150000 }
    ],
    penginapan: [{ qty: 2, a: 495454 }, { qty: 0, a: 0 }],
    konsumsi: [0, 0],
    ttd: {
      maker: { nama: 'Firman M.', jabatan: 'Supervisor', tanggal: '2026-06-19', img: '' },
      checker: { nama: 'R.M Taqwalegawa', jabatan: 'Head of HRD', tanggal: '', img: '' },
      signer: { nama: 'Kusna S.', jabatan: 'Direktur', tanggal: '', img: '' }
    },
    status: 'disetujui', danaAwal: 2190907, realisasi: 0, tampilkanRealisasi: false
  };
}

var fail = 0;
function ok(cond, msg) { if (!cond) { fail++; console.error('FAIL: ' + msg); } else { console.log('ok  - ' + msg); } }

/* --- 1. buildSppdHtml: dokumen lengkap + angka resmi --- */
var html = T.buildSppdHtml(wizardData());

ok(/@page\{size:A4 landscape;margin:0\}/.test(html), 'CSS print A4 landscape inline');
ok(/id="|class="paper"/.test(html) && /FORM PENGAJUAN BIAYA PERJALANAN DINAS/.test(html), 'judul form resmi ada');
ok(html.indexOf('BBM Pertalite') > -1, 'item biaya umum muncul');
ok(html.indexOf('FIRMAN') > -1 && html.indexOf('R.M TAQWA') > -1, 'nama petugas SPJ muncul');
/* Catatan: surat resmi menulis Penginapan 2 x Rp 495.454 = Rp 990.907, padahal
   2 x 495.454 = 990.908. Terima 990.907..990.909 (pembulatan dokumen asal). */
ok(/Rp\s?2\.190\.90[789]/.test(html), 'TOTAL BIAYA ~2.190.907 (sesuai surat resmi)');
ok(html.indexOf('Maker') > -1 && html.indexOf('Checker') > -1 && html.indexOf('Signer') > -1, '3 kotak tanda tangan ada');
ok(html.indexOf('Firman M.') > -1, 'nama Maker terbawa');
ok(html.indexOf('19 Juni 2026') > -1, 'tanggal Maker format panjang');
ok(!/~[^{}]*?<div style="--rh:--/.test(html), 'tinggi baris terisi (bukan null/undefined)');
var rh = html.match(/--rh:([\d.]+)mm/);
ok(rh && parseFloat(rh[1]) >= 3.8 && parseFloat(rh[1]) <= 5, 'tinggi baris dalam rentang 3,8-5mm: ' + (rh && rh[1]));
ok(html.indexOf('undefined') === -1, 'tidak ada string "undefined" di output');
ok(html.indexOf('NaN') === -1, 'tidak ada NaN di output');

/* --- 2. wizard step & validate --- */
var d = wizardData();
ok(T.sppdWizardValidate(1, d) === true, 'validate step 1 lolos saat data lengkap');
var empty = wizardData(); empty.kota = ''; empty.tglBerangkat = ''; empty.target[0] = '';
ok(T.sppdWizardValidate(1, empty) === false, 'validate step 1 gagal saat kota/tanggal/target kosong');
ok(T.sppdWizardValidate(0, empty) === true, 'validate step lain tidak memblok');
var stepHtml = T.sppdWizardStepHTML(1, d);
ok(stepHtml.indexOf('wz-kota') > -1, 'step render input kota');
ok(stepHtml.indexOf('Kendaraan Pribadi') > -1, 'step render checkbox transportasi');

/* --- 3. data wizard default lengkap (store) --- */
if (typeof global.window.SPT !== 'undefined' && global.window.SPT.store && global.window.SPT.store.newSppdWizard) {
  var w0 = global.window.SPT.store.newSppdWizard();
  ok(w0.biaya.length === 8, 'default 8 baris biaya');
  ok(w0.petugas.length === 1, 'default 1 petugas');
  var h0 = T.buildSppdHtml(w0);
  ok(h0.indexOf('undefined') === -1 && h0.indexOf('NaN') === -1, 'render form kosong tetap bersih');
  ok(h0.indexOf('LOGO') > -1, 'logo dummy tampil saat belum diunggah');

  /* --- 4. wizard modal render penuh (stepper + step aktif + footer) --- */
  var modal = T.sppdWizardModal({ id: 'ev-test' });
  ok(modal.indexOf('wz-steps') > -1, 'stepper 6 langkah dirender');
  ok(modal.indexOf('Perusahaan') > -1 && modal.indexOf('Review') > -1 && modal.indexOf('Simpan') > -1, 'semua nama langkah ada');
  ok(modal.indexOf('wz-foot') > -1, 'footer navigasi wizard ada');
  ok(modal.indexOf('undefined') === -1, 'tidak ada "undefined" di wizard modal');

  /* --- 5. tabSppd render (regresi: realisasiHtml / w.status) --- */
  if (T.tabSppd) {
    var pane = T.tabSppd({ id: 'ev-regresi' });
    ok(typeof pane === 'string' && pane.length > 100, 'tabSppd tanpa wizard tetap render');
    ok(pane.indexOf('Buat SPPD Baru') > -1, 'tabSppd tawarkan buat SPPD baru');
    ok(pane.indexOf('undefined') === -1, 'tabSppd tanpa wizard tanpa "undefined"');
    /* wizard kosong hasil getSppdWizard tidak membuat chip */
    ok(pane.indexOf('chip-card') === -1, 'wizard kosong → tidak ada chip');

    /* wizard terisi → chip muncul */
    var wFilled = T.store ? T.store.getSppdWizard('ev-regresi') : null;
    if (wFilled) { wFilled.noSurat = '039/SPPD/UKM/2026'; T.store.saveSppdWizard('ev-regresi', wFilled); }
    var pane2 = T.tabSppd({ id: 'ev-regresi' });
    ok(pane2.indexOf('chip-card') > -1, 'wizard terisi → chip muncul');
    ok(pane2.indexOf('039/SPPD/UKM/2026') > -1, 'chip menampilkan nomor surat');
  }
} else {
  console.log('skip - store tidak dimuat');
}

console.log('\n' + (fail ? 'FAILED (' + fail + ')' : 'ALL PASS'));
process.exit(fail ? 1 : 0);
