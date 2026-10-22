// redact.js — Redact SEJATI: halaman yang kena kotak dirender ulang via pdf.js,
// area ditutup hitam di canvas, lalu halaman jadi gambar di PDF BARU.
// Teks asli hilang total dari content stream (bukan sekadar kotak hitam di atas teks).

async function redactRun(bytes, reds) {
    if (!reds || !reds.length) return bytes;
    var src = await openPdfDoc(bytes);
    var out = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    var byPage = {};
    reds.forEach(function (r) {
        (byPage[r.page] = byPage[r.page] || []).push(r);
    });
    var keys = Object.keys(byPage).sort(function (a, b) { return (+a) - (+b); });
    for (var ki = 0; ki < keys.length; ki++) {
        var pi = parseInt(keys[ki], 10);
        var page = await src.getPage(pi + 1);
        var scale = 2; // ~144 dpi
        var vp = page.getViewport({ scale: scale, rotation: 0 });
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        var ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        ctx.fillStyle = '#000000';
        byPage[keys[ki]].forEach(function (r) {
            ctx.fillRect(
                Math.round(r.x * scale),
                Math.round(r.y * scale),
                Math.ceil(r.w * scale),
                Math.ceil(r.h * scale)
            );
        });
        var img = await out.embedJpg(dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.92)));
        var op = out.getPages()[pi];
        var sz = op.getSize();
        out.removePage(pi);
        var np = out.insertPage(pi, [sz.width, sz.height]);
        np.drawImage(img, { x: 0, y: 0, width: sz.width, height: sz.height });
    }
    return await out.save();
}
