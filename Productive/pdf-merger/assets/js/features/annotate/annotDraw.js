// annotDraw.js — penerapan Highlight, Sticky Note, dan Free Draw ke PDF (pdf-lib).
// Koordinat anotasi disimpan dalam ruang tampilan (pt, tanpa rotasi, y dari ATAS);
// di sini dikonversi ke ruang PDF (y dari bawah) memakai tinggi halaman.

function hexRgb(hex) {
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Bungkus teks catatan ke baris-baris yang muat (WinAnsi aman untuk Helvetica).
// -> { text, lines, width } — dipakai untuk tinggi kotak latar & drawText.
function wrapNoteText(font, text, size, maxW) {
    var clean = String(text || '')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?');
    var paras = clean.split('\n');
    var lines = [];
    for (var pi = 0; pi < paras.length; pi++) {
        var words = paras[pi].split(' ');
        var cur = '';
        for (var wi = 0; wi < words.length; wi++) {
            var test = cur ? cur + ' ' + words[wi] : words[wi];
            if (!cur || font.widthOfTextAtSize(test, size) <= maxW) {
                cur = test;
            } else {
                lines.push(cur);
                cur = words[wi];
            }
        }
        lines.push(cur);
    }
    var maxLines = 8;
    var truncated = lines.length > maxLines;
    if (truncated) lines = lines.slice(0, maxLines);
    var w = 0;
    for (var i = 0; i < lines.length; i++) {
        w = Math.max(w, font.widthOfTextAtSize(lines[i], size));
    }
    return { text: lines.join('\n') + (truncated ? '...' : ''), lines: lines.length, width: Math.ceil(w) };
}

function applyHighlights(pd, anns) {
    anns.forEach(function (a) {
        if (a.type !== 'hl') return;
        var page = pd.getPages()[a.page];
        if (!page || a.w < 2 || a.h < 2) return;
        var ph = page.getSize().height;
        page.drawRectangle({
            x: a.x,
            y: ph - a.y - a.h,
            width: a.w,
            height: a.h,
            color: hexRgb(a.color || '#fde047'),
            opacity: 0.45
        });
    });
}

function applyNotes(pd, anns) {
    // font diembed sekali untuk semua catatan
    var fontProm = pd.embedFont(PDFLib.StandardFonts.Helvetica);
    return fontProm.then(function (font) {
        anns.forEach(function (a) {
            if (a.type !== 'note') return;
            var page = pd.getPages()[a.page];
            if (!page) return;
            var ph = page.getSize().height;
            var iconH = 16, gap = 2, size = 9, lh = 11, padX = 4, padY = 3;
            page.drawRectangle({
                x: a.x, y: ph - a.y - iconH, width: iconH, height: iconH,
                color: hexRgb('#ffd54f'), borderColor: hexRgb('#b45309'), borderWidth: 0.8
            });
            page.drawText('i', { x: a.x + 5.5, y: ph - a.y - 12, size: 9, font: font, color: hexRgb('#7c2d12') });
            if (!a.text) return;
            var wrapped = wrapNoteText(font, a.text, size, 150);
            var boxW = Math.max(28, wrapped.width + padX * 2);
            var boxH = wrapped.lines * lh + padY * 2;
            var topView = a.y + iconH + gap;
            page.drawRectangle({
                x: a.x, y: ph - topView - boxH, width: boxW, height: boxH,
                color: hexRgb('#fffde7'), opacity: 0.94,
                borderColor: hexRgb('#eab308'), borderWidth: 0.7
            });
            page.drawText(wrapped.text, {
                x: a.x + padX,
                y: ph - topView - padY - size * 0.75,
                size: size, font: font, color: hexRgb('#1f2937'), lineHeight: lh
            });
        });
    });
}

function applyDraws(pd, anns) {
    anns.forEach(function (a) {
        if (a.type !== 'draw') return;
        var page = pd.getPages()[a.page];
        if (!page) return;
        var ph = page.getSize().height;
        var pts = a.pts || [];
        var col = hexRgb(a.color || '#ef4444');
        if (pts.length === 0) return;
        if (pts.length === 1) {
            page.drawCircle({ x: pts[0][0], y: ph - pts[0][1], size: 1.2, color: col });
            return;
        }
        // ponytail: rantai drawLine (bukan drawSvgPath — orientasi Y svg tak bisa diverifikasi tanpa browser)
        for (var i = 1; i < pts.length; i++) {
            var p0 = pts[i - 1], p1 = pts[i];
            var dx = p1[0] - p0[0], dy = p1[1] - p0[1];
            if (dx * dx + dy * dy < 2.25) continue;
            page.drawLine({
                start: { x: p0[0], y: ph - p0[1] },
                end: { x: p1[0], y: ph - p1[1] },
                thickness: 2,
                color: col,
                lineCap: PDFLib.LineCapStyle ? PDFLib.LineCapStyle.Round : undefined
            });
        }
    });
}
