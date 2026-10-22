// crop.js - Crop semua halaman dengan kotak yang sama (CropBox + MediaBox).

async function applyCrop(bytes, rect) {
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    doc.getPages().forEach(function (p) {
        p.setCropBox(rect.x, rect.y, rect.w, rect.h);
        p.setMediaBox(rect.x, rect.y, rect.w, rect.h);
    });
    return await doc.save();
}
