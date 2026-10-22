// viewer.js — Viewer anotasi Suite PDF: render pdf.js + layer overlay, alat
// (sorot/catatan/gambar/tanda-tangan/field/redact), panel form & catatan,
// ekspor/impor JSON, dan orkestrasi simpan ke PDF.
//
// Konvensi koordinat: semua anotasi disimpan dalam ruang TAMPILAN
// (pt, tanpa rotasi, y dari ATAS) — sama seperti pola Crop. Konversi ke ruang
// PDF (y dari bawah) terjadi saat penerapan (annotDraw/eSign/formFiller).

var AV = {
    docBytes: null, base: 'dokumen',
    pdfJs: null, pageCount: 0, cur: 0, zoom: 1,
    sizes: [], viewW: 0, viewH: 0,
    tool: 'hl', color: '#fde047', fieldFt: 'text',
    anns: [], sel: null, draft: null, moving: null, moved: false,
    formFields: [], formValues: {},
    signData: null, signW: 150, signAspect: 0.42, signSrc: null,
    canvas: null, ready: false, renderSeq: 0
};
var AVD = {};

function avId(id) { return document.getElementById(id); }

function avClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function avInit() {
    ['stage', 'preview-wrap', 'page-input', 'page-of', 'zoom',
     'btn-prev', 'btn-next', 'notes-list', 'notes-box', 'form-list', 'form-box',
     'flatten-chk', 'sign-box', 'sign-pad', 'sign-clear', 'sign-upload',
     'sign-size', 'sign-status', 'del-btn', 'save-btn'].forEach(function (id) {
        AVD[id] = avId(id);
    });

    var st = AVD.stage;
    st.addEventListener('pointerdown', avDown);
    st.addEventListener('pointermove', avMove);
    ['pointerup', 'pointercancel'].forEach(function (ev) {
        st.addEventListener(ev, avUp);
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="tool"]'), function (r) {
        r.addEventListener('change', function () {
            AV.tool = r.value;
            st.style.cursor = AV.tool === 'none' ? 'default' : 'crosshair';
            avRefreshPanels();
        });
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="col"]'), function (r) {
        r.addEventListener('change', function () { AV.color = r.value; });
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="fieldft"]'), function (r) {
        r.addEventListener('change', function () { AV.fieldFt = r.value; });
    });

    AVD['btn-prev'].addEventListener('click', function () { avGoto(AV.cur - 1); });
    AVD['btn-next'].addEventListener('click', function () { avGoto(AV.cur + 1); });
    AVD['page-input'].addEventListener('change', function () { avGoto(parseInt(AVD['page-input'].value, 10) - 1); });
    AVD['zoom'].addEventListener('change', function () {
        AV.zoom = parseFloat(AVD['zoom'].value) || 1;
        avRender();
    });
    AVD['del-btn'].addEventListener('click', avDeleteSel);
    AVD['save-btn'].addEventListener('click', avSave);
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (AV.sel) { e.preventDefault(); avDeleteSel(); }
    });

    avSignInit();
    st.style.cursor = 'crosshair';
}

function avGoto(i) {
    if (!AV.pdfJs) return;
    var n = avClamp(isNaN(i) ? AV.cur : i, 0, AV.pageCount - 1);
    if (n === AV.cur) return;
    AV.cur = n;
    avRender();
}

// ---------- muat file ----------
async function avLoad(bytes, base) {
    AV.docBytes = bytes;
    AV.base = base || 'dokumen';
    AV.anns = []; AV.sel = null; AV.draft = null; AV.moving = null;
    AV.formValues = {}; AV.formFields = []; AV.sizes = [];
    AV.ready = false;
    AV.pdfJs = await openPdfDoc(bytes);
    AV.pageCount = AV.pdfJs.numPages;
    try {
        var pd = await PDFLib.PDFDocument.load(bytes.slice(0), { ignoreEncryption: true, updateMetadata: false });
        var det = detectFormWidgets(pd);
        AV.sizes = det.sizes;
        AV.formFields = det.fields;
    } catch (e) {
        AV.sizes = []; // fallback di bawah
    }
    if (!AV.sizes.length) {
        for (var i = 0; i < AV.pageCount; i++) {
            var pg = await AV.pdfJs.getPage(i + 1);
            var vp = pg.getViewport({ scale: 1, rotation: 0 });
            AV.sizes.push({ w: vp.width, h: vp.height });
        }
    }
    AV.cur = 0;
    AV.ready = true;
    var nFields = AV.formFields.filter(function (f) { return !f.skip; }).length;
    setStatus('Dimuat: ' + AV.pageCount + ' halaman' +
        (nFields ? ', ' + nFields + ' field form terdeteksi.' : '.'), 'success');
    await avRender();
    avRefreshPanels();
}

function avGotoLoadError() { AV.ready = false; }

// ---------- render halaman ----------
async function avRender() {
    if (!AV.ready || !AV.pdfJs) return;
    var seq = ++AV.renderSeq;
    var sz = AV.sizes[AV.cur] || { w: 612, h: 792 };
    AV.viewW = sz.w; AV.viewH = sz.h;
    var avail = (AVD['preview-wrap'] ? AVD['preview-wrap'].clientWidth : 700) - 40;
    if (avail < 240) avail = 320;
    var targetW = Math.round(Math.min(760, avail) * AV.zoom);
    var canvas;
    try {
        canvas = await renderThumb(AV.pdfJs, AV.cur, targetW, 0, 0);
    } catch (e) {
        setStatus('Gagal render halaman.', 'error');
        return;
    }
    if (seq !== AV.renderSeq) return; // hasil basi, buang
    AV.canvas = canvas;
    AVD.stage.innerHTML = '';
    AVD.stage.appendChild(canvas);
    AVD['page-input'].value = AV.cur + 1;
    AVD['page-of'].textContent = 'dari ' + AV.pageCount;
    avOverlay();
}

// ---------- koordinat & hit-test ----------
function avPt(e) {
    var c = AV.canvas, r = c.getBoundingClientRect();
    return {
        x: (e.clientX - r.left) * AV.viewW / r.width,
        y: (e.clientY - r.top) * AV.viewH / r.height
    };
}

function avRectOf(a) {
    if (a.type === 'draw') {
        var xs = [], ys = [];
        (a.pts || []).forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
        if (!xs.length) return null;
        return { x: Math.min.apply(null, xs) - 2, y: Math.min.apply(null, ys) - 2,
                 w: Math.max.apply(null, xs) - Math.min.apply(null, xs) + 4,
                 h: Math.max.apply(null, ys) - Math.min.apply(null, ys) + 4 };
    }
    if (a.type === 'note') return { x: a.x, y: a.y, w: 16, h: 16 };
    return { x: a.x, y: a.y, w: a.w, h: a.h };
}

function avHit(p) {
    for (var i = AV.anns.length - 1; i >= 0; i--) {
        var a = AV.anns[i];
        if (a.page !== AV.cur) continue;
        var r = avRectOf(a);
        if (!r) continue;
        if (p.x >= r.x - 1 && p.x <= r.x + r.w + 1 && p.y >= r.y - 1 && p.y <= r.y + r.h + 1) return a;
    }
    return null;
}

function avPush(ann) {
    AV.anns.push(ann);
    AV.sel = ann;
    return ann;
}

function avDeleteSel() {
    if (!AV.sel) return;
    var i = AV.anns.indexOf(AV.sel);
    if (i >= 0) AV.anns.splice(i, 1);
    AV.sel = null;
    avOverlay();
    avRefreshPanels();
    setStatus('Anotasi dihapus.', 'info');
}

// ---------- pointer ----------
function avDown(e) {
    if (!AV.ready) return;
    if (e.button && e.button !== 0) return;
    try { AVD.stage.setPointerCapture(e.pointerId); } catch (err) {}
    var p = avPt(e);
    var hit = avHit(p);
    if (hit && AV.tool !== 'draw') {
        AV.sel = hit;
        var r = avRectOf(hit);
        AV.moving = { ann: hit, dx: p.x - r.x, dy: p.y - r.y };
        AV.moved = false;
        avOverlay();
        return;
    }
    AV.sel = null;
    if (AV.tool === 'hl' || AV.tool === 'redact') {
        AV.draft = { type: AV.tool, x: p.x, y: p.y, w: 0, h: 0, color: AV.color };
        AV.draftStart = p;
    } else if (AV.tool === 'draw') {
        AV.draft = { type: 'draw', pts: [[p.x, p.y]], color: AV.color };
    } else if (AV.tool === 'note') {
        var ann = avPush({ page: AV.cur, type: 'note', x: avClamp(p.x, 0, AV.viewW - 16), y: avClamp(p.y, 0, AV.viewH - 16), w: 16, h: 16, text: '' });
        avOverlay();
        avRefreshPanels();
        setTimeout(function () {
            var ta = document.querySelector('textarea[data-page="' + AV.cur + '"][data-idx="' + AV.anns.indexOf(ann) + '"]');
            if (ta) ta.focus();
        }, 0);
        return;
    } else if (AV.tool === 'sign') {
        if (!AV.signData) {
            setStatus('Buat tanda tangan dulu (gambar di pad atau upload).', 'error');
            return;
        }
        var w = AV.signW, h = w * AV.signAspect;
        avPush({
            page: AV.cur, type: 'sign',
            x: avClamp(p.x - w / 2, 0, AV.viewW - w),
            y: avClamp(p.y - h / 2, 0, AV.viewH - h),
            w: w, h: h, data: AV.signData
        });
        avOverlay();
        return;
    } else if (AV.tool === 'field') {
        var ft = AV.fieldFt;
        var fw = ft === 'checkbox' ? 14 : 150;
        var fh = ft === 'checkbox' ? 14 : 18;
        var idx = AV.anns.filter(function (a) { return a.type === 'field'; }).length + 1;
        avPush({
            page: AV.cur, type: 'field', ft: ft, name: 'Isian' + idx, value: '',
            x: avClamp(p.x, 0, AV.viewW - fw), y: avClamp(p.y, 0, AV.viewH - fh),
            w: fw, h: fh
        });
        avOverlay();
        avRefreshPanels();
        return;
    }
    // tool 'none' / area kosong: klik kosong = lepas seleksi
    AV.moved = false;
    avOverlay();
}

function avMove(e) {
    if (!AV.ready) return;
    var p = avPt(e);
    if (AV.moving) {
        var a = AV.moving.ann;
        var r = avRectOf(a);
        a.x = p.x - AV.moving.dx;
        a.y = p.y - AV.moving.dy;
        if (a.type !== 'draw') {
            a.x = avClamp(a.x, 0, AV.viewW - (r.w || 16));
            a.y = avClamp(a.y, 0, AV.viewH - (r.h || 16));
        }
        AV.moved = true;
        avOverlay();
        return;
    }
    if (!AV.draft) return;
    if (AV.draft.type === 'draw') {
        var last = AV.draft.pts[AV.draft.pts.length - 1];
        var dx = p.x - last[0], dy = p.y - last[1];
        if (dx * dx + dy * dy >= 2.25) AV.draft.pts.push([p.x, p.y]);
    } else {
        var s0 = AV.draftStart;
        AV.draft.x = Math.min(s0.x, p.x);
        AV.draft.y = Math.min(s0.y, p.y);
        AV.draft.w = Math.abs(p.x - s0.x);
        AV.draft.h = Math.abs(p.y - s0.y);
    }
    avOverlay();
}

function avUp() {
    if (AV.moving) {
        var a = AV.moving.ann;
        var wasMoved = AV.moved;
        AV.moving = null;
        if (!wasMoved && a.type === 'note') {
            avRefreshPanels(); // klik diam = fokus panel catatan
            var row = document.querySelector('.note-row[data-idx="' + AV.anns.indexOf(a) + '"]');
            if (row) row.scrollIntoView({ block: 'nearest' });
        }
        avRefreshPanels();
        return;
    }
    if (!AV.draft) return;
    var d = AV.draft;
    AV.draft = null;
    if (d.type === 'draw') {
        if (d.pts.length >= 2) avPush({ page: AV.cur, type: 'draw', pts: d.pts, color: d.color });
    } else {
        if (d.w > 3 && d.h > 3) avPush({ page: AV.cur, type: d.type, x: d.x, y: d.y, w: d.w, h: d.h, color: d.color });
        else { setStatus(d.type === 'redact' ? 'Kotak terlalu kecil — seret lebih lebar.' : 'Seret lebih lebar untuk membuat sorotan.', 'info'); }
    }
    avOverlay();
    avRefreshPanels();
}

// ---------- overlay ----------
function avOverlay() {
    var st = AVD.stage;
    if (!st || !AV.canvas) return;
    var s = AV.canvas.clientWidth / (AV.viewW || 1);
    var px = function (v) { return (v * s).toFixed(2) + 'px'; };

    var oldLayer = st.querySelector('.av-layer');
    if (oldLayer) oldLayer.remove();
    var oldSvg = st.querySelector('svg.av-svg');
    if (oldSvg) oldSvg.remove();

    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'av-svg');
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible';
    svg.setAttribute('width', AV.canvas.clientWidth);
    svg.setAttribute('height', AV.canvas.clientHeight);
    st.appendChild(svg);

    var layer = document.createElement('div');
    layer.className = 'av-layer';
    layer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;overflow:hidden';
    st.appendChild(layer);

    var mk = function (css) {
        var d = document.createElement('div');
        for (var k in css) d.style[k] = css[k];
        layer.appendChild(d);
        return d;
    };
    var sel = AV.sel;
    var selCss = '2px solid #2563eb';

    // field form yang sudah ada (hanya tampilan)
    AV.formFields.forEach(function (f) {
        if (f.skip || f.page !== AV.cur) return;
        var d = mk({
            left: px(f.x), top: px(f.y), width: px(f.w), height: px(f.h),
            border: '1px dashed rgba(37,99,235,.8)', background: 'rgba(37,99,235,.08)'
        });
        var lab = document.createElement('span');
        lab.textContent = f.name;
        lab.style.cssText = 'font-size:' + Math.max(8, 9 * s).toFixed(1) + 'px;color:#1d4ed8;' +
            'opacity:.85;white-space:nowrap;overflow:hidden;padding:0 2px;line-height:1;';
        d.appendChild(lab);
    });

    var pushDraw = function (a, isDraft) {
        var pl = document.createElementNS(ns, 'polyline');
        pl.setAttribute('points', a.pts.map(function (p) {
            return (p[0] * s).toFixed(1) + ',' + (p[1] * s).toFixed(1);
        }).join(' '));
        pl.setAttribute('fill', 'none');
        pl.setAttribute('stroke', a.color || '#ef4444');
        pl.setAttribute('stroke-width', (2 * s).toFixed(2));
        pl.setAttribute('stroke-linecap', 'round');
        pl.setAttribute('stroke-linejoin', 'round');
        if (isDraft) pl.setAttribute('opacity', '0.6');
        if (a === sel) {
            var halo = pl.cloneNode();
            halo.setAttribute('stroke', '#2563eb');
            halo.setAttribute('stroke-width', (2 * s + 3).toFixed(2));
            halo.setAttribute('opacity', '0.35');
            svg.appendChild(halo);
        }
        svg.appendChild(pl);
    };

    var renderAnn = function (a, isDraft) {
        if (a.page !== AV.cur) return;
        var isSel = a === sel;
        if (a.type === 'hl') {
            mk({
                left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h),
                background: a.color || '#fde047', opacity: '0.45',
                border: isSel ? selCss : 'none', boxSizing: 'border-box'
            });
        } else if (a.type === 'redact') {
            mk({
                left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h),
                background: '#000', border: isSel ? selCss : 'none', boxSizing: 'border-box'
            });
        } else if (a.type === 'note') {
            var ic = mk({
                left: px(a.x), top: px(a.y), width: px(16), height: px(16),
                background: '#ffd54f', border: '1px solid #b45309',
                borderRadius: '2px', boxSizing: 'border-box',
                boxShadow: isSel ? selCss : 'none', zIndex: '3'
            });
            ic.textContent = 'i';
            ic.style.cssText += 'color:#7c2d12;font:bold ' + Math.max(9, 11 * s).toFixed(1) +
                'px/16px sans-serif;text-align:center;';
            if (a.text) {
                var tb = mk({
                    left: px(a.x), top: px(a.y + 18), maxWidth: px(150),
                    background: 'rgba(255,253,231,.95)', border: '1px solid #eab308',
                    padding: px(3), fontSize: px(9), lineHeight: px(11),
                    color: '#1f2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    overflow: 'hidden', maxHeight: px(96), zIndex: '2'
                });
                tb.textContent = a.text;
            }
        } else if (a.type === 'sign') {
            var img = mk({
                left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h),
                border: isSel ? selCss : '1px dotted rgba(37,99,235,.5)', boxSizing: 'border-box',
                zIndex: '3'
            });
            img.style.backgroundImage = 'url(' + a.data + ')';
            img.style.backgroundSize = '100% 100%';
        } else if (a.type === 'field') {
            var fb = mk({
                left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h),
                border: isSel ? '2px dashed #2563eb' : '1px dashed #64748b',
                background: 'rgba(255,255,255,.65)', boxSizing: 'border-box', zIndex: '3'
            });
            var fl = document.createElement('span');
            fl.textContent = a.name || '';
            fl.style.cssText = 'font-size:' + Math.max(8, 9 * s).toFixed(1) + 'px;color:#334155;' +
                'white-space:nowrap;overflow:hidden;padding:0 2px;line-height:1;';
            fb.appendChild(fl);
        } else if (a.type === 'draw') {
            pushDraw(a, isDraft);
        }
    };

    AV.anns.forEach(function (a) { renderAnn(a, false); });
    if (AV.draft) renderAnn(AV.draft, true);
}

// ---------- panel ----------
function avRefreshPanels() {
    avRefreshNotes();
    avRefreshForm();
    if (AVD['sign-box']) AVD['sign-box'].classList.toggle('hidden', AV.tool !== 'sign');
}

function avRefreshNotes() {
    var box = avId('notes-box'), list = AVD['notes-list'];
    if (!box || !list) return;
    var notes = [];
    AV.anns.forEach(function (a, i) { if (a.type === 'note') notes.push({ a: a, i: i }); });
    var show = notes.length > 0 || AV.tool === 'note';
    box.classList.toggle('hidden', !show);
    list.innerHTML = '';
    if (!show) return;
    if (!notes.length) {
        var hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = 'Pilih alat Catatan, lalu klik halaman untuk menambah catatan.';
        list.appendChild(hint);
        return;
    }
    notes.forEach(function (n) {
        var row = document.createElement('div');
        row.className = 'note-row' + (AV.sel === n.a ? ' selected' : '');
        row.setAttribute('data-idx', n.i);
        var head = document.createElement('div');
        head.className = 'note-head';
        var jump = document.createElement('button');
        jump.type = 'button';
        jump.className = 'link-btn';
        jump.textContent = 'Hal. ' + (n.a.page + 1);
        jump.addEventListener('click', function () {
            if (AV.cur !== n.a.page) { AV.cur = n.a.page; avRender().then(function () { AV.sel = n.a; avOverlay(); }); }
            else { AV.sel = n.a; avOverlay(); }
            ta.focus();
        });
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'link-btn danger';
        del.textContent = 'Hapus';
        del.addEventListener('click', function () {
            var i = AV.anns.indexOf(n.a);
            if (i >= 0) AV.anns.splice(i, 1);
            if (AV.sel === n.a) AV.sel = null;
            avOverlay(); avRefreshPanels();
        });
        head.appendChild(jump);
        head.appendChild(del);
        var ta = document.createElement('textarea');
        ta.rows = 3;
        ta.placeholder = 'Tulis komentar...';
        ta.value = n.a.text || '';
        ta.setAttribute('data-page', n.a.page);
        ta.setAttribute('data-idx', n.i);
        ta.addEventListener('input', function () { n.a.text = ta.value; avOverlay(); });
        ta.addEventListener('focus', function () { AV.sel = n.a; avOverlay(); });
        row.appendChild(head);
        row.appendChild(ta);
        list.appendChild(row);
    });
}

function avRefreshForm() {
    var box = AVD['form-box'], list = AVD['form-list'];
    if (!box || !list) return;
    var fieldAnns = [];
    AV.anns.forEach(function (a, i) { if (a.type === 'field') fieldAnns.push({ a: a, i: i }); });
    var existing = [];
    var seen = {};
    AV.formFields.forEach(function (f) {
        if (f.skip || seen[f.name]) return;
        seen[f.name] = true;
        existing.push(f);
    });
    var show = existing.length > 0 || fieldAnns.length > 0 || AV.tool === 'field';
    box.classList.toggle('hidden', !show);
    list.innerHTML = '';
    if (!show) return;

    if (existing.length) {
        var h1 = document.createElement('h3');
        h1.textContent = 'Form ditemukan (' + existing.length + ')';
        list.appendChild(h1);
        existing.forEach(function (f) {
            var row = document.createElement('div');
            row.className = 'form-row';
            var lab = document.createElement('label');
            lab.textContent = f.name;
            row.appendChild(lab);
            var t = f.apiT;
            if (t === 'check') {
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!AV.formValues[f.name];
                cb.addEventListener('change', function () { AV.formValues[f.name] = cb.checked; });
                row.appendChild(cb);
            } else if (t === 'dropdown' || t === 'radio') {
                var sel = document.createElement('select');
                var opt0 = document.createElement('option');
                opt0.value = '';
                opt0.textContent = '(biarkan)';
                sel.appendChild(opt0);
                (f.options || []).forEach(function (o) {
                    var op = document.createElement('option');
                    op.value = o; op.textContent = o;
                    sel.appendChild(op);
                });
                sel.value = AV.formValues[f.name] || '';
                sel.addEventListener('change', function () { AV.formValues[f.name] = sel.value; });
                row.appendChild(sel);
            } else if (t === 'text') {
                var inp = document.createElement('input');
                inp.type = 'text';
                inp.placeholder = 'isi teks...';
                inp.value = AV.formValues[f.name] || '';
                inp.addEventListener('input', function () { AV.formValues[f.name] = inp.value; });
                row.appendChild(inp);
            }
            list.appendChild(row);
        });
    }

    var h2 = document.createElement('h3');
    h2.textContent = 'Field baru (klik halaman untuk memasang)';
    list.appendChild(h2);

    if (fieldAnns.length) {
        fieldAnns.forEach(function (n) {
            var row = document.createElement('div');
            row.className = 'form-row' + (AV.sel === n.a ? ' selected' : '');
            var nm = document.createElement('input');
            nm.type = 'text';
            nm.className = 'name-in';
            nm.value = n.a.name || '';
            nm.title = 'Nama field';
            nm.addEventListener('input', function () { n.a.name = nm.value; avOverlay(); });
            if (n.a.ft === 'checkbox') {
                var cv = document.createElement('input');
                cv.type = 'checkbox';
                cv.title = 'Centang field ini';
                cv.checked = !!n.a.value;
                cv.addEventListener('change', function () { n.a.value = cv.checked; });
                row.appendChild(nm);
                row.appendChild(cv);
            } else {
                var vi = document.createElement('input');
                vi.type = 'text';
                vi.placeholder = 'isi teks...';
                vi.value = n.a.value || '';
                vi.addEventListener('input', function () { n.a.value = vi.value; });
                row.appendChild(nm);
                row.appendChild(vi);
            }
            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'link-btn danger';
            del.textContent = 'Hapus';
            del.addEventListener('click', function () {
                var i = AV.anns.indexOf(n.a);
                if (i >= 0) AV.anns.splice(i, 1);
                if (AV.sel === n.a) AV.sel = null;
                avOverlay(); avRefreshPanels();
            });
            row.appendChild(del);
            list.appendChild(row);
        });
    }
    // Baris checkbox flatten statis di HTML (di luar form-list) — sengaja tidak disentuh
    // di sini agar tidak hancur oleh innerHTML=''.
}

// ---------- tanda tangan ----------
function avSignInit() {
    var pad = AVD['sign-pad'];
    if (!pad) return;
    var ctx = pad.getContext('2d');
    var clearPad = function () {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pad.width, pad.height);
    };
    clearPad();
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';

    var drawing = false, last = null;
    var padPt = function (e) {
        var r = pad.getBoundingClientRect();
        return { x: (e.clientX - r.left) * pad.width / r.width, y: (e.clientY - r.top) * pad.height / r.height };
    };
    pad.addEventListener('pointerdown', function (e) {
        if (AV.signSrc !== 'pad') { clearPad(); AV.signSrc = 'pad'; }
        try { pad.setPointerCapture(e.pointerId); } catch (err) {}
        drawing = true;
        last = padPt(e);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(last.x + 0.1, last.y);
        ctx.stroke();
    });
    pad.addEventListener('pointermove', function (e) {
        if (!drawing) return;
        var p = padPt(e);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last = p;
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
        pad.addEventListener(ev, function () {
            if (!drawing) return;
            drawing = false;
            AV.signData = pad.toDataURL('image/png');
            AV.signAspect = pad.height / pad.width;
            AV.signSrc = 'pad';
            avSignStatus();
        });
    });

    AVD['sign-clear'].addEventListener('click', function () {
        clearPad();
        AV.signData = null;
        AV.signSrc = null;
        avSignStatus();
    });

    AVD['sign-upload'].addEventListener('change', function () {
        var f = AVD['sign-upload'].files[0];
        if (!f) return;
        if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
            setStatus('Upload harus gambar PNG/JPG.', 'error');
            return;
        }
        var rd = new FileReader();
        rd.onload = function () {
            var img = new Image();
            img.onload = function () {
                AV.signData = String(rd.result);
                AV.signAspect = img.height / img.width;
                AV.signSrc = 'upload';
                // tampilkan sebagai pratinjau di pad
                clearPad();
                var scale = Math.min(1, Math.min(pad.width / img.width, pad.height / img.height));
                var dw = img.width * scale, dh = img.height * scale;
                ctx.drawImage(img, (pad.width - dw) / 2, (pad.height - dh) / 2, dw, dh);
                avSignStatus();
            };
            img.onerror = function () { setStatus('Gambar tidak bisa dibaca.', 'error'); };
            img.src = String(rd.result);
        };
        rd.readAsDataURL(f);
    });

    AVD['sign-size'].addEventListener('input', function () {
        AV.signW = parseInt(AVD['sign-size'].value, 10) || 150;
        avSignSizeLabel();
        if (AV.sel && AV.sel.type === 'sign') {
            var a = AV.sel;
            var ratio = a.h / a.w;
            a.w = AV.signW;
            a.h = AV.signW * ratio;
            avOverlay();
        }
    });
    avSignSizeLabel();
    avSignStatus();
}

function avSignSizeLabel() {
    var el = avId('sign-size-val');
    if (el) el.textContent = AV.signW + ' pt';
}

function avSignStatus() {
    var el = AVD['sign-status'];
    if (!el) return;
    el.textContent = AV.signData
        ? 'Tanda tangan siap — klik halaman untuk memasang.'
        : 'Belum ada tanda tangan.';
}

// ---------- JSON ----------
function avExportJson() {
    if (!AV.docBytes) return;
    var data = { v: 1, file: AV.base, anns: AV.anns, formValues: AV.formValues };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        AV.base + ' - anotasi.json');
    setStatus('JSON diekspor (' + AV.anns.length + ' anotasi). Bisa diimpor lagi nanti.', 'success');
}

function avImportJson(file) {
    if (!file) return;
    file.text().then(function (txt) {
        var d = JSON.parse(txt);
        if (!d || !Array.isArray(d.anns)) throw new Error('Format JSON tidak dikenal.');
        AV.anns = d.anns;
        AV.formValues = d.formValues || {};
        AV.sel = null;
        avOverlay();
        avRefreshPanels();
        setStatus('Impor JSON: ' + AV.anns.length + ' anotasi dipasang.', 'success');
    }).catch(function (e) {
        setStatus('Gagal impor: ' + (e && e.message ? e.message : e), 'error');
    });
}

// ---------- simpan ----------
async function avSave() {
    if (!AV.ready || !AV.docBytes) {
        setStatus('Muat PDF dulu.', 'error');
        return;
    }
    AVD['save-btn'].disabled = true;
    try {
        var reds = AV.anns.filter(function (a) { return a.type === 'redact'; });
        var base = AV.docBytes;
        if (reds.length) {
            var pages = {};
            reds.forEach(function (r) { pages[r.page] = true; });
            var ok = confirm(
                'Redact PERMANEN?\n' +
                reds.length + ' area di ' + Object.keys(pages).length + ' halaman akan dihapus.\n' +
                'Halaman terkait dirender ulang jadi gambar — teks asli hilang total dari file,\n' +
                'tapi teks/lapisan interaktif halaman itu ikut hilang. Lanjutkan?');
            if (!ok) return;
            setStatus('Merender ulang halaman teredact...');
            base = await redactRun(AV.docBytes, reds);
        }
        setStatus('Menerapkan anotasi...');
        var pd = await PDFLib.PDFDocument.load(base, { ignoreEncryption: true, updateMetadata: false });
        var fieldAnns = AV.anns.filter(function (a) { return a.type === 'field'; });
        var flatten = AVD['flatten-chk'] ? AVD['flatten-chk'].checked : false;
        applyFormFill(pd, AV.formValues, fieldAnns, flatten);
        applyHighlights(pd, AV.anns);
        await applyNotes(pd, AV.anns);
        applyDraws(pd, AV.anns);
        await applySigns(pd, AV.anns);
        var out = await pd.save();
        downloadBlob(new Blob([out], { type: 'application/pdf' }), AV.base + ' - anotasi.pdf');
        setStatus('Berhasil: ' + AV.anns.length + ' anotasi disimpan' +
            (reds.length ? ', ' + reds.length + ' kotak redact permanen' : '') + '.', 'success');
    } catch (e) {
        setStatus('Gagal menyimpan: ' + (e && e.message ? e.message : e), 'error');
    } finally {
        AVD['save-btn'].disabled = false;
    }
}
