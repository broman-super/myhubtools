// convert.js - Konversi PDF <-> Gambar (pdf.js render + pdf-lib embed).

// PDF -> array { index, blob }. dpi: 72/150/300 (scale = dpi/72).
async function pdfToImages(bytes, pageIndices, dpi, mime, quality) {
    const doc = await openPdfDoc(bytes);
    const scale = dpi / 72;
    const out = [];
    for (let k = 0; k < pageIndices.length; k++) {
        const page = await doc.getPage(pageIndices[k] + 1);
        const vp = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const blob = await new Promise(function (res, rej) {
            canvas.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob gagal')); }, mime, quality);
        });
        out.push({ index: pageIndices[k], blob: blob });
        canvas.width = 0; canvas.height = 0; // lepas memori
    }
    return out;
}

// Gambar (PNG/JPG) -> PDF. opts: { size: 'fit'|'a4'|'letter', orientation: 'portrait'|'landscape', margin: pt }
async function imagesToPdf(files, opts) {
    const { PDFDocument } = PDFLib;
    if (!files.length) throw new Error('Pilih gambar PNG/JPG dulu.');
    const pdf = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const isPng = f.type === 'image/png' || /\.png$/i.test(f.name);
        const isJpg = f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name);
        if (!isPng && !isJpg) throw new Error('"' + f.name + '" bukan PNG/JPG — konversi dulu ke PNG/JPG.');
        const bytes = new Uint8Array(await f.arrayBuffer());
        const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        if (opts.size === 'fit') {
            const page = pdf.addPage([img.width, img.height]);
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        } else {
            let pw = opts.size === 'a4' ? 595.28 : 612;   // A4 / Letter (pt)
            let ph = opts.size === 'a4' ? 841.89 : 792;
            if (opts.orientation === 'landscape') { const t = pw; pw = ph; ph = t; }
            const m = Math.max(0, opts.margin || 0);
            const maxW = pw - 2 * m, maxH = ph - 2 * m;
            const r = Math.min(maxW / img.width, maxH / img.height);
            const w = img.width * r, h = img.height * r;
            const page = pdf.addPage([pw, ph]);
            page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
        }
    }
    return await pdf.save();
}
