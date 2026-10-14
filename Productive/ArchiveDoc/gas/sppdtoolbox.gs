const SPT_GAS_URL = PropertiesService.getScriptProperties().getProperty('SPT_GAS_URL') || '';
const SUPA_URL = PropertiesService.getScriptProperties().getProperty('SUPA_URL') || '';
const SUPA_KEY = PropertiesService.getScriptProperties().getProperty('SUPA_KEY') || '';

function doPost(e) {
  try {
    var data = e.postData && e.postData.contents ? e.postData.contents : '';
    var obj = {};
    try { obj = JSON.parse(data); } catch (err) { obj = { action: data }; }
    var action = obj.action || '';
    var payload = obj.payload || obj;

    if (action === 'sppd:save') return CORS(JSON.stringify(saveSppdWizard(payload)));
    if (action === 'sppd:list') return CORS(JSON.stringify(listSppd(payload)));
    if (action === 'sppd:get') return CORS(JSON.stringify(getSppd(payload)));

    return CORS(JSON.stringify({ ok: false, error: 'Unknown action: ' + action }));
  } catch (err) {
    return CORS(JSON.stringify({ ok: false, error: err.toString() }));
  }
}

function CORS(body) {
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.TEXT);
}

function supaFetch(table, method, body) {
  if (!SUPA_URL || !SUPA_KEY) return { ok: false, error: 'Supabase config missing' };
  var url = SUPA_URL.replace(/\/$/, '') + '/rest/v1/' + table;
  var opts = {
    method: method,
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : ''
    },
    muteHttpExceptions: true
  };
  if (body !== undefined) opts.payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch(url, opts);
  var code = res.getResponseCode();
  var txt = res.getContentText();
  try {
    var j = txt ? JSON.parse(txt) : {};
  } catch (e) {
    var j = { raw: txt };
  }
  return { ok: code >= 200 && code < 300, code: code, data: j };
}

function supaUpsert(table, row, keys) {
  if (!SUPA_URL || !SUPA_KEY) return { ok: false, error: 'Supabase config missing' };
  var url = SUPA_URL.replace(/\/$/, '') + '/rest/v1/' + table;
  var opts = {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    payload: JSON.stringify(row),
    muteHttpExceptions: true
  };
  if (keys) opts.headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
  var res = UrlFetchApp.fetch(url, opts);
  var code = res.getResponseCode();
  var txt = res.getContentText();
  try { var j = txt ? JSON.parse(txt) : {}; } catch (e) { var j = { raw: txt }; }
  return { ok: code >= 200 && code < 300, code: code, data: j };
}

/* Helpers */
function num(v) { v = Number(v); return isNaN(v) ? 0 : v; }
function str(v) { return v == null ? '' : String(v); }
function bool(v) { return !!v; }

/* Save wizard payload (from web) into normalized Supabase tables */
function saveSppdWizard(p) {
  var eid = str(p.event_id);
  if (!eid) return { ok: false, error: 'event_id kosong' };

  var perusahaan = p.perusahaan || {};
  var ttd = p.ttd || {};
  var maker = ttd.maker || {}, checker = ttd.checker || {}, signer = ttd.signer || {};
  var transport = p.transport || {};

  /* header */
  var hdr = {
    event_id: eid,
    no_surat: str(p.noSurat),
    perusahaan_nama: str(perusahaan.nama),
    perusahaan_logo: str(perusahaan.logo || ''),
    wm_mode: str(perusahaan.wmMode || 'teks'),
    wm_img: str(perusahaan.wmImg || ''),
    wm_text: str(perusahaan.wmText || ''),
    pemberi_tugas: str(p.pemberiTugas),
    departemen: str(p.departemen),
    kota: str(p.kota),
    target1: str((p.target && p.target[0]) || ''),
    target2: str((p.target && p.target[1]) || ''),
    target3: str((p.target && p.target[2]) || ''),
    tgl_berangkat: str(p.tglBerangkat || ''),
    jam_berangkat: str(p.jamBerangkat || ''),
    tgl_kembali: str(p.tglKembali || ''),
    ket_kembali: str(p.ketKembali || ''),
    tr_pribadi: bool(transport.pribadi),
    tr_travel: bool(transport.travel),
    tr_kereta: bool(transport.kereta),
    tr_lainnya: str(transport.lainnya || ''),
    petugas_count: num((p.petugas || []).length),
    status: str(p.status || 'draft'),
    dana_awal: num(p.danaAwal),
    realisasi: num(p.realisasi),
    tampilkan_realisasi: bool(p.tampilkanRealisasi),
    ttd_maker_nama: str(maker.nama),
    ttd_maker_jabatan: str(maker.jabatan),
    ttd_maker_tanggal: str(maker.tanggal),
    ttd_maker_img: str(maker.img || ''),
    ttd_checker_nama: str(checker.nama),
    ttd_checker_jabatan: str(checker.jabatan),
    ttd_checker_tanggal: str(checker.tanggal),
    ttd_checker_img: str(checker.img || ''),
    ttd_signer_nama: str(signer.nama),
    ttd_signer_jabatan: str(signer.jabatan),
    ttd_signer_tanggal: str(signer.tanggal),
    ttd_signer_img: str(signer.img || '')
  };
  var h = supaUpsert('sppd_header', hdr, ['event_id']);
  if (!h.ok) return { ok: false, error: 'header: ' + (h.error || h.code) };

  /* Delete children */
  var del = function (t) {
    var url = SUPA_URL.replace(/\/$/, '') + '/rest/v1/' + t + '?event_id=eq.' + encodeURIComponent(eid);
    UrlFetchApp.fetch(url, {
      method: 'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY },
      muteHttpExceptions: true
    });
  };
  del('sppd_biaya'); del('sppd_petugas'); del('sppd_uang_saku'); del('sppd_penginapan'); del('sppd_konsumsi');

  /* biaya (max 8) */
  var biaya = p.biaya || [];
  for (var i = 0; i < Math.min(biaya.length, 8); i++) {
    var b = biaya[i] || {};
    if (!b.item && num(b.jumlah) === 0) continue;
    supaFetch('sppd_biaya', 'POST', { event_id: eid, urut: i + 1, item: str(b.item), jumlah: num(b.jumlah), ket: str(b.ket) });
  }
  /* petugas */
  var pet = p.petugas || [];
  for (var j = 0; j < pet.length; j++) {
    supaFetch('sppd_petugas', 'POST', { event_id: eid, urut: j + 1, nama: str(pet[j]) });
  }
  /* uang saku (2 rows default) */
  var us = p.uangSaku || [];
  for (var k = 0; k < Math.min(us.length, 4); k++) {
    var u = us[k] || {};
    supaFetch('sppd_uang_saku', 'POST', { event_id: eid, urut: k + 1, wq: num(u.wq), wa: num(u.wa), eq: num(u.eq), ea: num(u.ea) });
  }
  /* penginapan */
  var pg = p.penginapan || [];
  for (var m = 0; m < Math.min(pg.length, 4); m++) {
    var ph = pg[m] || {};
    supaFetch('sppd_penginapan', 'POST', { event_id: eid, urut: m + 1, qty: num(ph.qty), a: num(ph.a) });
  }
  /* konsumsi (4 cols 0-3) */
  var ks = p.konsumsi || [];
  for (var n = 0; n < 4; n++) {
    supaFetch('sppd_konsumsi', 'POST', { event_id: eid, urut: n + 1, jml: num(ks[n]) });
  }

  return { ok: true, event_id: eid };
}

function listSppd(p) {
  var eid = str(p.event_id);
  if (eid) {
    var r = supaFetch('sppd_header?select=*&event_id=eq.' + encodeURIComponent(eid) + '&limit=1', 'GET');
    return { ok: r.ok, data: r.data && r.data[0] ? r.data[0] : null };
  }
  var r2 = supaFetch('sppd_header?select=event_id,no_surat,kota,tgl_berangkat,status,dana_awal&order=event_id.desc', 'GET');
  return { ok: r2.ok, data: r2.data || [] };
}

function getSppd(p) {
  var eid = str(p.event_id);
  if (!eid) return { ok: false, error: 'event_id kosong' };
  var h = supaFetch('sppd_header?select=*&event_id=eq.' + encodeURIComponent(eid) + '&limit=1', 'GET');
  if (!h.ok || !h.data || !h.data[0]) return { ok: false, error: 'not found' };
  var hdr = h.data[0];
  var out = { header: hdr, biaya: [], petugas: [], uangSaku: [], penginapan: [], konsumsi: [] };
  var b = supaFetch('sppd_biaya?select=urut,item,jumlah,ket&event_id=eq.' + encodeURIComponent(eid) + '&order=urut', 'GET');
  if (b.ok && b.data) out.biaya = b.data;
  var pt = supaFetch('sppd_petugas?select=urut,nama&event_id=eq.' + encodeURIComponent(eid) + '&order=urut', 'GET');
  if (pt.ok && pt.data) out.petugas = pt.data;
  var us = supaFetch('sppd_uang_saku?select=urut,wq,wa,eq,ea&event_id=eq.' + encodeURIComponent(eid) + '&order=urut', 'GET');
  if (us.ok && us.data) out.uangSaku = us.data;
  var pg = supaFetch('sppd_penginapan?select=urut,qty,a&event_id=eq.' + encodeURIComponent(eid) + '&order=urut', 'GET');
  if (pg.ok && pg.data) out.penginapan = pg.data;
  var ks = supaFetch('sppd_konsumsi?select=urut,jml&event_id=eq.' + encodeURIComponent(eid) + '&order=urut', 'GET');
  if (ks.ok && ks.data) out.konsumsi = ks.data;
  return { ok: true, data: out };
}
