// pageNumbers.js - Nomor halaman otomatis (pdf-lib, font Helvetica bawaan).

async function addPageNumbers(bytes, opts) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const total = pages.length;
    const size = opts.size || 10;
    for (let i = 0; i < total; i++) {
        const num = opts.start + i;
        const label = opts.format === 'xy' ? 'Halaman ' + num + ' dari ' + total
            : opts.format === 'xsl' ? num + ' / ' + total
            : String(num);
        const p = pages[i];
        const w = p.getWidth(), h = p.getHeight();
        const tw = font.widthOfTextAtSize(label, size);
        const mx = 24, my = 20;
        const x = opts.align === 'left' ? mx : opts.align === 'right' ? w - mx - tw : (w - tw) / 2;
        const y = opts.pos === 'top' ? h - my - size : my;
        p.drawText(label, { x: x, y: y, size: size, font: font, color: rgb(0, 0, 0) });
    }
    return await doc.save();
}

// Dipakai preview agar label sama persis dengan yang digambar.
function buildNumberLabel(pageNum, total, format) {
    return format === 'xy' ? 'Halaman ' + pageNum + ' dari ' + total
        : format === 'xsl' ? pageNum + ' / ' + total
        : String(pageNum);
}
