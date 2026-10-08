// merger.js - Gabung PDF menggunakan pdf-lib

async function mergePDFs(files) {
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
        const buf = await file.arrayBuffer();
        const pdf = await PDFDocument.load(buf);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
    }
    return await mergedPdf.save();
}

async function mergePDFsGrouped(groups) {
    // groups: { key: [files] }
    const results = {};
    for (const [key, files] of Object.entries(groups)) {
        const bytes = await mergePDFs(files);
        results[key] = bytes;
    }
    return results;
}