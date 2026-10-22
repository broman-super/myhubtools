// pageOps.js - Susun ulang halaman (urutan baru + rotasi tambahan) menjadi PDF baru.
// Rotasi akumulatif terhadap rotasi bawaan halaman — PDF landscape tidak "dipaksa" tegak.

async function assemblePages(bytes, orderIndices, rotations) {
    const { PDFDocument, degrees } = PDFLib;
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, orderIndices);
    pages.forEach(function (p, i) {
        const r = (rotations && rotations[i] ? rotations[i] : 0) % 360;
        if (r) p.setRotation(degrees((p.getRotation().angle + r) % 360));
        out.addPage(p);
    });
    return await out.save();
}
