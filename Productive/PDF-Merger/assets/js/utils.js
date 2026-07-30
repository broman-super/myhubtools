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