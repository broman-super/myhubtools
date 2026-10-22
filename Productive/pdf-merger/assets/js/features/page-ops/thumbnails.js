// thumbnails.js - Renderer thumbnail via pdf.js (dipakai Operasi, Crop, N-up).
// Catatan: pdf.js men-transfer buffer ke worker (buffer jadi detached) — salin dulu di openPdfDoc.

function openPdfDoc(bytes) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return pdfjsLib.getDocument({ data: bytes.slice() }).promise;
}

// extraRot: rotasi tambahan (0/90/180/270) di atas rotasi bawaan halaman.
// absRot: bila diisi, paksa rotasi absolut (abaikan rotasi bawaan) — untuk Crop.
async function renderThumb(pdfDoc, pageIndex0, targetW, extraRot, absRot) {
    const page = await pdfDoc.getPage(pageIndex0 + 1);
    const base = page.rotate || 0;
    const rot = absRot != null ? absRot : (((base + (extraRot || 0)) % 360 + 360) % 360);
    const vp1 = page.getViewport({ scale: 1, rotation: rot });
    const scale = targetW / vp1.width;
    const vp = page.getViewport({ scale: scale, rotation: rot });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return canvas;
}
