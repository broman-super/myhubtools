// split.js - Logika Split/Extract halaman via pdf-lib (global PDFLib dari CDN).

async function pageCountOf(bytes) {
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
}

async function extractPages(bytes, pageIndices) {
    const { PDFDocument } = PDFLib;
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, pageIndices);
    pages.forEach(function (p) { out.addPage(p); });
    return await out.save();
}
