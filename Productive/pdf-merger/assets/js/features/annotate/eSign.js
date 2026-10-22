// eSign.js — tempelkan tanda tangan (gambar PNG/JPG dari pad atau upload) ke halaman.

function applySigns(pd, anns) {
    var jobs = [];
    var cache = {};
    anns.forEach(function (a) {
        if (a.type !== 'sign' || !a.data) return;
        var page = pd.getPages()[a.page];
        if (!page) return;
        jobs.push((function (a, page) {
            var key = a.data;
            var isPng = key.indexOf('data:image/png') === 0;
            var p = cache[key] ? cache[key]
                : (cache[key] = (isPng ? pd.embedPng(dataUrlToBytes(key)) : pd.embedJpg(dataUrlToBytes(key))));
            return p.then(function (img) {
                var ph = page.getSize().height;
                page.drawImage(img, {
                    x: a.x,
                    y: ph - a.y - a.h,
                    width: a.w,
                    height: a.h
                });
            });
        })(a, page));
    });
    return Promise.all(jobs);
}
