// watermark.js - Watermark teks atau gambar (opacity, rotasi, posisi) ke semua halaman.
// Posisi dihitung sebagai TARGET TENGAH watermark (inset 24pt dari tepi) sehingga preview
// DOM (translate -50%) cocok dengan keluaran PDF (rotasi dihitung terhadap pusat box).

async function addWatermark(bytes, opts) {
    const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = doc.getPages();

    let img = null, font = null;
    if (opts.kind === 'image') {
        if (!opts.imageBytes) throw new Error('Pilih file gambar watermark dulu.');
        img = opts.imageMime === 'image/png' ? await doc.embedPng(opts.imageBytes) : await doc.embedJpg(opts.imageBytes);
    } else {
        if (!opts.text) throw new Error('Isi teks watermark dulu.');
        font = await doc.embedFont(StandardFonts.HelveticaBold);
    }
    const colorMap = { red: rgb(0.86, 0.08, 0.08), black: rgb(0, 0, 0), blue: rgb(0.12, 0.35, 0.75) };
    const color = colorMap[opts.color] || colorMap.red;
    const opacity = opts.opacity == null ? 0.3 : opts.opacity;
    const rot = (((opts.rotation || 0) % 360) + 360) % 360;
    const rad = rot * Math.PI / 180;
    const inset = 24;

    for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const w = p.getWidth(), h = p.getHeight();
        let bw, bh;
        if (opts.kind === 'text') {
            bw = font.widthOfTextAtSize(opts.text, opts.size);
            bh = opts.size * 0.72; // tinggi huruf kapital ~0.72em
        } else {
            bw = (opts.scale == null ? 50 : opts.scale) / 100 * w;
            bh = bw * img.height / img.width;
        }
        let cx = w / 2, cy = h / 2;
        if (opts.pos === 'top-left') { cx = inset + bw / 2; cy = h - inset - bh / 2; }
        else if (opts.pos === 'top-right') { cx = w - inset - bw / 2; cy = h - inset - bh / 2; }
        else if (opts.pos === 'bottom-left') { cx = inset + bw / 2; cy = inset + bh / 2; }
        else if (opts.pos === 'bottom-right') { cx = w - inset - bw / 2; cy = inset + bh / 2; }
        // geser anchor agar pusat box (setelah rotasi CCW) jatuh di (cx,cy)
        const x = cx - ((bw / 2) * Math.cos(rad) - (bh / 2) * Math.sin(rad));
        const y = cy - ((bw / 2) * Math.sin(rad) + (bh / 2) * Math.cos(rad));
        if (opts.kind === 'text') {
            p.drawText(opts.text, { x: x, y: y, size: opts.size, font: font, color: color, opacity: opacity, rotate: degrees(rot) });
        } else {
            p.drawImage(img, { x: x, y: y, width: bw, height: bh, opacity: opacity, rotate: degrees(rot) });
        }
    }
    return await doc.save();
}
