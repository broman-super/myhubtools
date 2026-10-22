// compress.js - Kompresi PDF 2 lapis:
//   Lapis 1 (aman, semua level)  : save({ useObjectStreams:true }) — struktur dirapikan.
//   Lapis 2 (agresif, sedang/tinggi): re-encode gambar JPEG (DCTDecode) via canvas.
// Ceiling (sadar): gambar PNG/Flate & warna non-sederhana TIDAK dikompres ulang (aman);
// gambar dengan SMask tidak di-downscale (agar mask tetap cocok).

function isJpegFilter(dict) {
    const { PDFName, PDFArray } = PDFLib;
    const f = dict.get(PDFName.of('Filter'));
    if (f instanceof PDFName) return f.asString() === '/DCTDecode';
    if (f instanceof PDFArray) {
        return f.asArray().some(function (x) { return x instanceof PDFName && x.asString() === '/DCTDecode'; });
    }
    return false;
}

function isSimpleColorSpace(dict) {
    const { PDFName } = PDFLib;
    const cs = dict.get(PDFName.of('ColorSpace'));
    if (!cs) return true; // default DCT = RGB
    if (cs instanceof PDFName) {
        const n = cs.asString();
        return n === '/DeviceRGB' || n === '/DeviceGray';
    }
    return false; // ICCBased/Indexed/CMYK → lewati (risiko salah warna)
}

function hasSMask(dict) {
    return !!dict.get(PDFLib.PDFName.of('SMask'));
}

async function recompressJpegImages(doc, quality, scale) {
    const { PDFName, PDFNumber, PDFRawStream } = PDFLib;
    const objs = doc.context.enumerateIndirectObjects();
    for (let i = 0; i < objs.length; i++) {
        const stream = objs[i][1];
        if (!(stream instanceof PDFRawStream)) continue;
        const dict = stream.dict;
        if (!isJpegFilter(dict)) continue;
        if (!isSimpleColorSpace(dict)) continue;
        const effScale = hasSMask(dict) ? 1 : scale; // SMask harus ikut di-downscale → jangan sama sekali
        try {
            const blob = new Blob([stream.getContents()], { type: 'image/jpeg' });
            const bmp = await createImageBitmap(blob);
            const w = Math.max(1, Math.round(bmp.width * effScale));
            const h = Math.max(1, Math.round(bmp.height * effScale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bmp, 0, 0, w, h);
            bmp.close();
            const jpeg = await new Promise(function (res, rej) {
                canvas.toBlob(function (b) {
                    if (!b) { rej(new Error('toBlob gagal')); return; }
                    b.arrayBuffer().then(function (ab) { res(new Uint8Array(ab)); }, rej);
                }, 'image/jpeg', quality);
            });
            stream.setContents(jpeg);
            dict.set(PDFName.of('Width'), PDFNumber.of(w));
            dict.set(PDFName.of('Height'), PDFNumber.of(h));
        } catch (e) {
            // gambar gagal decode → lewati, PDF tetap valid
        }
    }
}

// level: 'ringan' | 'sedang' | 'tinggi' → kembalikan Uint8Array hasil simpan.
async function compressPdf(bytes, level) {
    const doc = await loadTolerant(bytes);
    if (level === 'sedang' || level === 'tinggi') {
        const quality = level === 'tinggi' ? 0.5 : 0.75;
        const scale = level === 'tinggi' ? 0.75 : 1;
        await recompressJpegImages(doc, quality, scale);
    }
    return await doc.save({ useObjectStreams: true });
}
