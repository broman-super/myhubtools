// formFiller.js — deteksi widget AcroForm (posisi via /Annots + /Rect, nama via /T)
// dan pengisian form: field yang sudah ada + field baru yang ditempatkan user, opsional flatten.

function pdfStr(o) {
    if (!o || !o.asBytes) return '';
    try {
        var b = o.asBytes();
        if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) {
            var s = '';
            for (var i = 2; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
            return s;
        }
        var t = '';
        for (var j = 0; j < b.length; j++) t += String.fromCharCode(b[j]);
        return t.replace(/\u0000/g, '');
    } catch (e) { return ''; }
}

// -> { fields: [{page, name, ft, apiT, options, x, y, w, h, skip}], sizes: [{w,h}] }
// x,y,w,h sudah dalam ruang tampilan (y dari ATAS, tanpa rotasi) — siap untuk overlay.
function detectFormWidgets(pd) {
    var PN = PDFLib.PDFName, PS = PDFLib.PDFString, PH = PDFLib.PDFHexString;
    var PD = PDFLib.PDFDict, PA = PDFLib.PDFArray, PNum = PDFLib.PDFNumber;
    var sizes = pd.getPages().map(function (p) {
        var s = p.getSize();
        return { w: s.width, h: s.height };
    });
    var fields = [];
    pd.getPages().forEach(function (page, pi) {
        var annots = page.node && page.node.Annots && page.node.Annots();
        if (!annots) return;
        for (var i = 0; i < annots.size(); i++) {
            var a = annots.lookupMaybe(i, PD);
            if (!a) continue;
            var st = a.lookupMaybe(PN.of('Subtype'), PN);
            if (!st || st.asString() !== PN.of('Widget').asString()) continue;
            // ponytail: lookup tanpa assert tipe — /T bisa PDFString ATAU PDFHexString
            // (pdf-lib menulis HexString); lookupMaybe(tipe) melempar saat tipe beda.
            var t = a.lookup(PN.of('T'));
            var par = a.lookupMaybe(PN.of('Parent'), PD);
            if (!t && par) t = par.lookup(PN.of('T'));
            var name = pdfStr(t);
            if (!name) continue;
            var ftO = a.lookupMaybe(PN.of('FT'), PN) || (par && par.lookupMaybe(PN.of('FT'), PN));
            var ftRaw = ftO ? ftO.asString() : '';
            var ft = ftRaw.indexOf('Tx') >= 0 ? 'text'
                : ftRaw.indexOf('Btn') >= 0 ? 'check'
                : ftRaw.indexOf('Ch') >= 0 ? 'choice'
                : 'text';
            if (ft === 'check') {
                var ff = a.lookupMaybe(PN.of('Ff'), PNum) || (par && par.lookupMaybe(PN.of('Ff'), PNum));
                if (ff && (ff.asNumber() & 32768) !== 0) ft = 'radio';
            }
            var rect = a.lookupMaybe(PN.of('Rect'), PA);
            if (!rect || rect.size() < 4) continue;
            var x1 = rect.lookup(0, PNum).asNumber(), y1 = rect.lookup(1, PNum).asNumber();
            var x2 = rect.lookup(2, PNum).asNumber(), y2 = rect.lookup(3, PNum).asNumber();
            var rx1 = Math.min(x1, x2), rx2 = Math.max(x1, x2);
            var ry1 = Math.min(y1, y2), ry2 = Math.max(y1, y2);
            var sz = sizes[pi];
            fields.push({
                page: pi, name: name, ft: ft,
                x: rx1, y: sz.h - ry2, w: rx2 - rx1, h: ry2 - ry1
            });
        }
    });
    // Lengkapi tipe + opsi lewat API form publik (per nama).
    var api = {};
    try {
        pd.getForm().getFields().forEach(function (f) {
            var n = f.getName(), ty = 'text', opts = [];
            if (f instanceof PDFLib.PDFTextField) ty = 'text';
            else if (f instanceof PDFLib.PDFCheckBox) ty = 'check';
            else if (f instanceof PDFLib.PDFDropdown) { ty = 'dropdown'; try { opts = f.getOptions() || []; } catch (e) {} }
            else if (f instanceof PDFLib.PDFRadioGroup) { ty = 'radio'; try { opts = f.getOptions() || []; } catch (e) {} }
            else ty = 'button';
            api[n] = { t: ty, opts: opts };
        });
    } catch (e) {}
    fields.forEach(function (fl) {
        var m = api[fl.name];
        if (m) {
            fl.apiT = m.t;
            fl.options = m.opts;
            if (m.t === 'text') fl.ft = 'text';
        } else {
            fl.apiT = fl.ft === 'radio' ? 'radio' : fl.ft === 'choice' ? 'dropdown' : fl.ft === 'check' ? 'check' : 'text';
            fl.options = [];
        }
        if (fl.apiT === 'button') fl.skip = true;
    });
    return { fields: fields, sizes: sizes };
}

// values: { nama: isi } — string kosong untuk text = biarkan; checkbox false = centang-bersih.
// fieldAnns: anotasi type 'field' hasil penempatan user; flatten: rapikan permanen.
function applyFormFill(pd, values, fieldAnns, flatten) {
    var form = pd.getForm();
    (fieldAnns || []).forEach(function (f, i) {
        var page = pd.getPages()[f.page];
        if (!page) return;
        var ph = page.getSize().height;
        var name = String(f.name || '').trim() || ('Isian' + (i + 1));
        var opts = {
            x: f.x, y: ph - f.y - f.h,
            width: Math.max(f.w, 12), height: Math.max(f.h, 8),
            borderWidth: 0.5, borderColor: PDFLib.rgb(0.45, 0.45, 0.45)
        };
        try {
            if (f.ft === 'checkbox') {
                var cb = form.createCheckBox(name);
                cb.addToPage(page, opts);
                if (f.value) cb.check();
            } else {
                var tf = form.createTextField(name);
                tf.addToPage(page, opts);
                if (f.value) tf.setText(String(f.value));
            }
        } catch (e) {
            // nama kemungkinan sudah dipakai — biarkan, pesan dikumpulkan pemanggil
            if (window.console) console.warn('Field baru gagal:', name, e);
        }
    });
    var names = values ? Object.keys(values) : [];
    if (names.length) {
        pd.getForm().getFields().forEach(function (fld) {
            var n = fld.getName();
            if (!(n in values)) return;
            var v = values[n];
            try {
                if (fld instanceof PDFLib.PDFTextField) {
                    if (v !== undefined && v !== null && String(v) !== '') fld.setText(String(v));
                } else if (fld instanceof PDFLib.PDFCheckBox) {
                    if (v) fld.check(); else fld.uncheck();
                } else if (fld instanceof PDFLib.PDFDropdown || fld instanceof PDFLib.PDFRadioGroup) {
                    if (v) fld.select(String(v));
                }
            } catch (e) {}
        });
    }
    if (flatten) {
        try { form.flatten(); } catch (e) {} // form kosong -> no-op
    }
}
