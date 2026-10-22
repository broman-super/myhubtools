// utils.js - Fungsi bantuan

function setStatus(msg, type = 'info') {
    const el = document.getElementById('status');
    if (!el) return;
    el.innerHTML = msg;
    el.style.color = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#333';
    if (type !== 'error') {
        clearTimeout(el._st);
        el._st = setTimeout(function() { el.innerHTML = ''; }, 5000);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadCSV(rows, filename) {
    let csv = '\uFEFF'; // BOM untuk Excel
    rows.forEach(row => {
        csv += row.map(cell => {
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
}

// formatSize — format ukuran byte (penambahan murni; tidak mengubah fungsi lama).
function formatSize(n) {
    if (n == null || isNaN(n)) return '-';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

// loadJszip — jszip dimuat lazy hanya saat butuh ZIP (prinsip dokumen: library besar saat dipakai).
function loadJszip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = function () { res(window.JSZip); };
        s.onerror = function () { rej(new Error('Gagal memuat jszip (cek koneksi).')); };
        document.head.appendChild(s);
    });
}

// dataUrlToBytes — dataURL base64 -> Uint8Array (dipakai E-Sign & Redact).
function dataUrlToBytes(dataUrl) {
    var comma = dataUrl.indexOf(',');
    var b64 = dataUrl.slice(comma + 1);
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}