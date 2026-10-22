// nup.js - N-up (2/4 halaman per lembar A4) & Booklet (imposisi duplex).
// Ceiling sadar: semua halaman asli di-embed sekali dalam memori — PDF ratusan halaman
// bisa berat; cell kosong (halaman ganjil booklet) dilewati tanpa digambar.

const NUP_MARGIN = 12; // pt

function drawFit(page, emb, x, y, w, h) {
    const s = Math.min(w / emb.width, h / emb.height);
    page.drawPage(emb, {
        x: x + (w - emb.width * s) / 2,
        y: y + (h - emb.height * s) / 2,
        width: emb.width * s,
        height: emb.height * s
    });
}

async function makeNup(bytes, mode) {
    const { PDFDocument } = PDFLib;
    const out = await PDFDocument.create();
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const n = src.getPageCount();
    if (n < 1) throw new Error('PDF tanpa halaman.');
    const m = NUP_MARGIN;
    const allIdx = [];
    for (let i = 0; i < n; i++) allIdx.push(i);

    if (mode === '2up' || mode === '4up') {
        const cells = mode === '4up' ? 4 : 2;
        const emb = await out.embedPdf(bytes, allIdx);
        const cellW = (595.28 - 3 * m) / 2;
        const cellH = (841.89 - 3 * m) / 2;
        const sheets = Math.ceil(n / cells);
        for (let k = 0; k < sheets; k++) {
            const p = out.addPage([595.28, 841.89]);
            for (let c = 0; c < cells; c++) {
                const idx = k * cells + c;
                if (idx >= n) break;
                let x, y, w, h;
                if (cells === 2) { // ditumpuk vertikal (atas lalu bawah) — pola dokumen
                    w = 595.28 - 2 * m;
                    h = cellH;
                    x = m;
                    y = c === 0 ? m + cellH + m : m;
                } else { // 2x2: kiri-atas, kanan-atas, kiri-bawah, kanan-bawah
                    w = cellW;
                    h = cellH;
                    x = m + (c % 2) * (cellW + m);
                    y = c < 2 ? m + cellH + m : m;
                }
                drawFit(p, emb[idx], x, y, w, h);
            }
        }
    } else if (mode === 'booklet') {
        const sheets = Math.ceil(n / 4);
        const N = sheets * 4; // jumlah halaman virtual (kelipatan 4, sisa = kosong)
        const emb = await out.embedPdf(bytes, allIdx);
        const wSheet = 841.89, hSheet = 595.28;
        const cellW = (wSheet - 3 * m) / 2;
        const cellH = hSheet - 2 * m;
        for (let i = 0; i < sheets; i++) {
            // pasangan 1-based: depan [N-2i, 2i+1], belakang [2i+2, N-2i-1]
            const sides = [
                [N - 2 * i - 1, 2 * i],       // 0-based depan
                [2 * i + 1, N - 2 * i - 2]    // 0-based belakang
            ];
            for (let s = 0; s < 2; s++) {
                const p = out.addPage([wSheet, hSheet]);
                for (let c = 0; c < 2; c++) {
                    const idx = sides[s][c];
                    if (idx < 0 || idx >= n) continue;
                    drawFit(p, emb[idx], m + c * (cellW + m), m, cellW, cellH);
                }
            }
        }
    } else {
        throw new Error('Mode tidak dikenal: ' + mode);
    }
    return await out.save();
}
