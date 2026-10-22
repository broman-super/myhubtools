// repair.js - Perbaikan PDF rusak (load toleran + rebuild halaman).
// Dimuat SEBELUM compress.js — compress.js memakai loadTolerant() dari file ini.

// Buang sampah sebelum header %PDF (kasus header rusak / BOM / teks aneh di depan).
function stripLeadingJunk(bytes) {
    const head = bytes.subarray(0, 2048);
    for (let i = 0; i < head.length - 4; i++) {
        if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46) { // %PDF
            return i === 0 ? bytes : bytes.slice(i);
        }
    }
    return bytes;
}

function loadTolerant(bytes) {
    const { PDFDocument } = PDFLib;
    return PDFDocument.load(stripLeadingJunk(bytes), {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false
    });
}

async function repairPdf(bytes) {
    const { PDFDocument } = PDFLib;
    try {
        const src = await loadTolerant(bytes);
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(function (p) { out.addPage(p); });
        return await out.save({ useObjectStreams: true });
    } catch (e) {
        throw new Error('PDF terlalu rusak untuk diperbaiki di browser. Coba buka di Chrome dulu (Chrome sering tetap merender), atau perbaiki dengan tool desktop.');
    }
}
