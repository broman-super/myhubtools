// rangeParser.js - Parser rentang halaman ("1-3, 5, 7-9") untuk Split/Extract.
// Browser: dipakai lewat <script>. Node: `node rangeParser.js` menjalankan self-check.

function parsePageRange(str) {
    const parts = String(str == null ? '' : str).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) throw new Error('Rentang halaman kosong. Contoh: 1-3, 5, 7-9');
    const out = [];
    for (let p = 0; p < parts.length; p++) {
        const part = parts[p];
        const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
        if (m) {
            let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
            if (a < 1 || b < 1) throw new Error('Nomor halaman minimal 1.');
            if (a > b) { const t = a; a = b; b = t; } // swap ramah: "5-3" = "3-5"
            for (let i = a; i <= b; i++) out.push(i - 1);
        } else if (/^\d+$/.test(part)) {
            const n = parseInt(part, 10);
            if (n < 1) throw new Error('Nomor halaman minimal 1.');
            out.push(n - 1);
        } else {
            throw new Error('Format salah: "' + part + '". Contoh: 1-3, 5');
        }
    }
    return out.filter(function (v, i, arr) { return arr.indexOf(v) === i; }); // dedup, urutan tetap
}

function validateIndices(indices, pageCount) {
    for (let i = 0; i < indices.length; i++) {
        if (indices[i] >= pageCount) return 'Halaman ' + (indices[i] + 1) + ' melebihi jumlah halaman (' + pageCount + ').';
    }
    return null;
}

// Self-check Node — kontrak dokumen: parsePageRange("1-3,5") -> [0,1,2,4]
if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
    (function () {
        function eq(got, want, label) {
            if (JSON.stringify(got) !== JSON.stringify(want)) {
                console.error('GAGAL ' + label + ': ' + JSON.stringify(got) + ' != ' + JSON.stringify(want));
                process.exit(1);
            }
        }
        function throws(fn, label) {
            try { fn(); } catch (e) { return; }
            console.error('GAGAL ' + label + ': tidak melempar error');
            process.exit(1);
        }
        eq(parsePageRange('1-3,5'), [0, 1, 2, 4], 'kontrak dokumen');
        eq(parsePageRange(' 5 , 1 '), [4, 0], 'urutan as-list + trim');
        eq(parsePageRange('2,2'), [1], 'dedup');
        eq(parsePageRange('5-3'), [2, 3, 4], 'swap rentang terbalik');
        eq(parsePageRange('1-2, 10'), [0, 1, 9], 'gabungan rentang + tunggal');
        throws(function () { parsePageRange(''); }, 'kosong');
        throws(function () { parsePageRange('   '); }, 'hanya spasi');
        throws(function () { parsePageRange('abc'); }, 'bukan angka');
        throws(function () { parsePageRange('0'); }, 'nol');
        throws(function () { parsePageRange('0-2'); }, 'rentang mulai nol');
        eq(validateIndices([4], 3) === null, false, 'bounds terlalu besar terdeteksi');
        eq(validateIndices([2], 3) === null, true, 'bounds sah lolos');
        console.log('rangeParser self-check OK');
    })();
}
