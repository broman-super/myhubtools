/* office.js — LibreOffice WASM: Office -> PDF dan PDF -> Office, client-side.
   Runtime vendor: assets/vendor/lo (glue dari unpkg @matbee/libreoffice-converter@2.7.2),
   binary berat (soffice.wasm/.data) dari mirror CORS resmi di KNOWN_ISSUES.md. */
var LO_CDN = 'https://erseco.github.io/libreoffice-document-converter';
var loConverter = null;
var loInitPromise = null;

function loAbs(p) { return new URL(p, document.baseURI).href; }

function loProgressAdapter(cb) {
    return function (info) {
        if (!cb) return;
        var pct = info && typeof info.percent === 'number' ? Math.round(info.percent) : null;
        cb(info && info.message ? info.message : '', pct);
    };
}

async function loGetConverter(onProgressCb) {
    if (loConverter) {
        loConverter.options.onProgress = loProgressAdapter(onProgressCb);
        return loConverter;
    }
    if (!loInitPromise) {
        loInitPromise = (async function () {
            var mod = await import('../../../vendor/lo/browser.js');
            var c = new mod.WorkerBrowserConverter({
                browserWorkerJs: loAbs('assets/vendor/lo/browser.worker.global.js'),
                sofficeJs: loAbs('assets/vendor/lo/soffice.js'),
                sofficeWorkerJs: loAbs('assets/vendor/lo/soffice.worker.js'),
                sofficeWasm: LO_CDN + '/wasm/soffice.wasm',
                sofficeData: LO_CDN + '/wasm/soffice.data',
                onProgress: loProgressAdapter(onProgressCb)
            });
            await c.initialize();
            loConverter = c;
            return c;
        })();
    }
    return loInitPromise;
}

/* bytes:Uint8Array, filename:string, outputFormat:'pdf'|'docx'|'xlsx'|'pptx'|'odt'|'txt'|'html'
   -> {data:Uint8Array, mimeType, filename, duration} */
async function runLoConvert(bytes, filename, outputFormat, onProgressCb) {
    if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
        var isoErr = new Error('Cross-origin isolation belum aktif; LibreOffice WASM butuh SharedArrayBuffer. Buka halaman ini lewat tombol "Buka di tab baru".');
        isoErr.code = 'NOT_ISOLATED';
        throw isoErr;
    }
    var c;
    try {
        c = await loGetConverter(onProgressCb);
    } catch (err) {
        loInitPromise = null; // biar bisa dicoba ulang
        throw new Error('Gagal menyiapkan runtime LibreOffice: ' + (err && err.message ? err.message : err));
    }
    return c.convert(bytes, { outputFormat: outputFormat || 'pdf' }, filename);
}
