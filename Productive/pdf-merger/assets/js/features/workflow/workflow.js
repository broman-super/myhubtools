// workflow.js — Workflow Builder: rangkai operasi suite jadi satu rantai,
// seret untuk mengurutkan (SortableJS), jalankan sekali klik.
// Semua langkah memakai fungsi fitur yang sudah ada (compress/watermark/numbers/nup/split).

var WF = { bytes: null, base: '' };

var WF_TYPES = {
    compress: {
        label: 'Kompres',
        html: '<label>Level <select name="level">' +
            '<option value="ringan">Ringan</option>' +
            '<option value="sedang" selected>Sedang</option>' +
            '<option value="tinggi">Tinggi</option>' +
            '</select></label>',
        run: function (b, row) {
            return compressPdf(b, row.querySelector('[name=level]').value);
        }
    },
    watermark: {
        label: 'Watermark Teks',
        html: '<label>Teks <input name="wtext" type="text" value="RAHASIA" size="9"></label>' +
            '<label>Warna <select name="wcolor">' +
            '<option value="red">Merah</option>' +
            '<option value="black">Hitam</option>' +
            '<option value="blue">Biru</option>' +
            '</select></label>' +
            '<label>Ukuran <input name="wsize" type="number" value="36" min="6" max="120" style="width:60px"></label>' +
            '<label>Opasitas <input name="wop" type="number" value="0.3" min="0.05" max="1" step="0.05" style="width:64px"></label>',
        run: function (b, row) {
            var q = function (n) { return row.querySelector('[name=' + n + ']').value; };
            return addWatermark(b, {
                kind: 'text', text: q('wtext'), color: q('wcolor'),
                size: +q('wsize'), opacity: +q('wop'), rotation: 0, pos: 'center'
            });
        }
    },
    numbers: {
        label: 'Nomor Halaman',
        html: '<label>Format <select name="nformat">' +
            '<option value="xsl" selected>1 / 10</option>' +
            '<option value="xy">Halaman 1 dari 10</option>' +
            '<option value="x">1</option>' +
            '</select></label>' +
            '<label>Posisi <select name="npos">' +
            '<option value="bottom|center" selected>Bawah tengah</option>' +
            '<option value="bottom|left">Bawah kiri</option>' +
            '<option value="bottom|right">Bawah kanan</option>' +
            '<option value="top|left">Atas kiri</option>' +
            '<option value="top|center">Atas tengah</option>' +
            '<option value="top|right">Atas kanan</option>' +
            '</select></label>' +
            '<label>Ukuran <input name="nsize" type="number" value="10" min="6" max="36" style="width:56px"></label>',
        run: function (b, row) {
            var pa = row.querySelector('[name=npos]').value.split('|');
            return addPageNumbers(b, {
                format: row.querySelector('[name=nformat]').value,
                pos: pa[0], align: pa[1],
                size: +row.querySelector('[name=nsize]').value || 10,
                start: 1
            });
        }
    },
    nup: {
        label: 'N-Up / Booklet',
        html: '<label>Mode <select name="numode">' +
            '<option value="2up" selected>2-up (vertikal)</option>' +
            '<option value="4up">4-up (2x2)</option>' +
            '<option value="booklet">Booklet</option>' +
            '</select></label>',
        run: function (b, row) {
            return makeNup(b, row.querySelector('[name=numode]').value);
        }
    },
    split: {
        label: 'Split (wajib terakhir)',
        terminal: true,
        html: '<label>Rentang <input name="srange" type="text" placeholder="1-3, 5, 7-9" size="12" autocomplete="off"></label>',
        run: null // ditangani khusus di wfRun (multi-output -> ZIP)
    }
};

function wfList() { return document.getElementById('chain-list'); }

function wfAdd(type) {
    var t = WF_TYPES[type];
    if (!t || !wfList()) return;
    if (t.terminal && wfList().querySelector('.wf-row[data-type="split"]')) {
        setStatus('Langkah Split sudah ada di rantai.', 'info');
        return;
    }
    var row = document.createElement('div');
    row.className = 'wf-row';
    row.setAttribute('data-type', type);
    row.innerHTML =
        '<span class="grip" title="Tarik untuk mengurutkan">&#10216;&#10216;</span>' +
        '<strong class="wf-label"></strong>' +
        '<span class="wf-params">' + t.html + '</span>' +
        '<button type="button" class="link-btn danger wf-del">Hapus</button>';
    row.querySelector('.wf-label').textContent = t.label;
    row.querySelector('.wf-del').addEventListener('click', function () {
        row.parentNode.removeChild(row);
    });
    wfList().appendChild(row);
}

function wfReset() {
    if (wfList()) wfList().innerHTML = '';
    setStatus('Rantai dikosongkan.', 'info');
}

async function wfRun(runBtn) {
    if (!WF.bytes) {
        setStatus('Muat PDF dulu.', 'error');
        return;
    }
    var rows = Array.prototype.slice.call(wfList().querySelectorAll('.wf-row'));
    if (!rows.length) {
        setStatus('Tambah langkah dulu lewat tombol di atas.', 'error');
        return;
    }
    var splitAt = -1;
    rows.forEach(function (r, i) { if (r.getAttribute('data-type') === 'split') splitAt = i; });
    if (splitAt >= 0 && splitAt !== rows.length - 1) {
        setStatus('Langkah Split harus jadi TERAKHIR dalam rantai.', 'error');
        return;
    }
    if (runBtn) runBtn.disabled = true;
    try {
        var bytes = WF.bytes;
        var splitRow = null;
        var steps = rows;
        if (splitAt >= 0) {
            splitRow = rows[splitAt];
            steps = rows.slice(0, splitAt);
        }
        var total = rows.length;
        for (var i = 0; i < steps.length; i++) {
            var type = steps[i].getAttribute('data-type');
            var t = WF_TYPES[type];
            setStatus('Langkah ' + (i + 1) + '/' + total + ': ' + t.label + '...');
            bytes = await t.run(bytes, steps[i]);
        }
        if (splitRow) {
            setStatus('Membuat bagian split & ZIP...');
            var raw = splitRow.querySelector('[name=srange]').value.trim();
            if (!raw) throw new Error('Isi rentang halaman untuk Split (mis. 1-3, 5).');
            var n = await pageCountOf(bytes);
            var parts = [];
            raw.split(',').forEach(function (seg) {
                seg = seg.trim();
                if (!seg) return;
                var idx = parsePageRange(seg);
                var err = validateIndices(idx, n);
                if (err) throw new Error(err);
                parts.push({ label: seg, idx: idx });
            });
            if (!parts.length) throw new Error('Rentang split kosong.');
            var JSZip = await loadJszip();
            var zip = new JSZip();
            for (var j = 0; j < parts.length; j++) {
                zip.file(WF.base + ' - ' + parts[j].label + '.pdf', await extractPages(bytes, parts[j].idx));
            }
            var blob = await zip.generateAsync({ type: 'blob' });
            downloadBlob(blob, WF.base + ' - workflow.zip');
            setStatus('Selesai: ' + parts.length + ' bagian di ZIP (hasil ' + steps.length + ' langkah sebelum split).', 'success');
        } else {
            downloadBlob(new Blob([bytes], { type: 'application/pdf' }), WF.base + ' - workflow.pdf');
            setStatus('Selesai: ' + steps.length + ' langkah dijalankan.', 'success');
        }
    } catch (e) {
        setStatus('Gagal: ' + (e && e.message ? e.message : e), 'error');
    } finally {
        if (runBtn) runBtn.disabled = false;
    }
}

function wfInit() {
    var list = wfList();
    if (!list) return;
    if (window.Sortable) {
        new Sortable(list, { handle: '.grip', animation: 150 });
    }
}
