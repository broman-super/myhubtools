/* ============================================================
   SPPD Toolbox — semua handler aksi (event delegation).
   ============================================================ */
window.SPT = window.SPT || {};

(function (A) {
  var store = A.store;
  var ui = A;

  function modalCloseAll() {
    if (!ui.closeModal()) {
      var root = ui.$('#modal-root');
      if (root) root.innerHTML = '';
    }
  }

  /* Hapus destruktif dengan undo: simpan snapshot DB sebelum mutasi,
     tampilkan toast "Batalkan", dan pulihkan bila diklik. */
  function undoDelete(msg, mutate) {
    var snap = store.snapshot();
    mutate();
    ui.toastUndo(msg, function () {
      store.restore(snap);
      A.reload();
    });
    A.reload();
  }

  A.actions = {

    'nav:go': function (el, d) {
      var href = d.href;
      if (href) { location.hash = href; A.reload(); }
    },

    'skip:app': function () {
      var main = ui.$('#app');
      if (!main) return;
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      try { main.focus(); } catch (e) {}
    },

    'nav:mobile': function (el) {
      var mn = ui.$('#mobilenav');
      if (!mn) return;
      var willOpen = mn.classList.contains('hidden');
      mn.classList.toggle('hidden');
      if (el && el.setAttribute) el.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    },

    'tab:goto': function (el, d) {
      location.hash = '#/events/' + d.event + '/' + d.tab;
      A.reload();
    },

    'events:filter': function (el, d) {
      A.eventFilter(d.f);
      A.reload();
    },

    'archive:set': function (el, d) {
      A.archiveState = A.archiveState || {};
      if (d.key === 'q') A.archiveState.q = ui.readVal('ar-q') || '';
      else if (d.key === 'status') A.archiveState.status = el.value;
      else if (d.key === 'month') A.archiveState.month = el.value;
      else if (d.key === 'year') A.archiveState.year = el.value;
      A.reload();
    },

    'master:catadd': function () {
      var nama = ui.readVal('mc-nama');
      if (!nama) { ui.toast('Nama grup wajib diisi', 'error'); return; }
      store.saveItemCat({ nama: nama });
      ui.toast('Grup "' + nama + '" dibuat', 'success');
      A.reload();
    },

    'master:itemadd': function (el, d) {
      var nama = ui.readVal('mi-' + d.cat);
      if (!nama) { ui.toast('Nama item wajib diisi', 'error'); return; }
      store.saveItemTemplate({ catId: d.cat, nama: nama });
      ui.toast('Item "' + nama + '" ditambahkan', 'success');
      A.reload();
    },

    'master:catdel': function (el, d) {
      ui.confirm('Hapus grup?', 'Item di dalam grup ikut terhapus dari master. Item yang sudah masuk Item Persiapan event tidak ikut terhapus.', function () {
        undoDelete('Grup dihapus', function () { store.deleteItemCat(d.id); });
      }, { confirm: 'Hapus grup' });
    },

    'master:itemdel': function (el, d) {
      undoDelete('Item dihapus dari master', function () { store.deleteItemTemplate(d.id); });
    },

    /* ---------- event ---------- */
    'event:new': function () { A.pages.eventModal(null); },
    'event:edit': function (el, d) { A.pages.eventModal(store.getEvent(d.id)); },

    'event:save': function (el, d) {
      var isNew = d.new === '1';
      var ev = isNew ? {} : store.getEvent(d.id);
      ev.nama = ui.readVal('ev-nama');
      ev.lokasi = ui.readVal('ev-lokasi');
      ev.jenis = ui.readVal('ev-jenis');
      ev.peranPic = ui.readVal('ev-peran');
      ev.tanggalMulai = ui.readVal('ev-tglmulai');
      ev.tanggalSelesai = ui.readVal('ev-tglselesai');
      ev.status = ui.readVal('ev-status');
      ev.catatan = ui.readVal('ev-catatan');
      if (!ev.nama) { ui.toast('Nama event wajib diisi', 'error'); return; }
      var saved = store.saveEvent(ev, isNew);
      modalCloseAll();
      if (isNew) { location.hash = '#/events/' + saved.id; }
      ui.toast(isNew ? 'Event dibuat' : 'Event diperbarui', 'success');
      A.reload();
    },

    'event:delete': function (el, d) {
      ui.confirm('Hapus event?', 'Semua data SPPD, produk, penjualan & keuangan event ini ikut terhapus.', function () {
        undoDelete('Event dihapus', function () { store.deleteEvent(d.id); });
        location.hash = '#/events';
        A.reload();
      }, { confirm: 'Hapus event' });
    },

    'modal:close': function () { modalCloseAll(); },
    'modal:ok': function () { /* diganti oleh ui.confirm */ },

    /* ---------- sppd ---------- */
    'sppd:save': function (el, d) {
      var s = store.getSppd(d.id);
      s.noSurat = ui.readVal('spp-no');
      s.tanggalTerbit = ui.readVal('spp-tgl');
      s.tujuan = ui.readVal('spp-tujuan');
      s.kegiatan = ui.readVal('spp-kegiatan');
      s.instansi = ui.readVal('spp-instansi');
      s.status = ui.readVal('spp-status');
      s.danaAwal = ui.num('spp-dana');
      s.tampilkanRealisasi = ui.$('#spp-tampilreal') ? ui.$('#spp-tampilreal').checked : false;
      if (s.tampilkanRealisasi) s.realisasi = ui.num('spp-realisasi');
      s.catatan = ui.readVal('spp-catatan');
      store.saveSppd(s);
      ui.toast('SPPD disimpan', 'success');
      A.reload();
    },

    /* ---------- transport ---------- */
    'transport:mode': function (el) {
      var mode = el.value;
      var box = ui.$('#tr-detail');
      if (box) box.innerHTML = A.transportFields(mode);
    },

    'transport:add': function (el, d) {
      var ev = store.getEvent(d.event);
      var mode = ui.readVal('tr-mode');
      var t = {
        eventId: d.event, leg: ui.readVal('tr-leg'), tanggal: ui.readVal('tr-tgl'),
        mode: mode, wallet: ui.readVal('tr-wallet') || 'Kas',
        ruteAsal: ui.readVal('tr-asal'), ruteTujuan: ui.readVal('tr-tujuan'),
        detail: {}, totalBiaya: 0, catatan: ''
      };
      if (mode === 'sewa') {
        t.detail = { vendor: ui.readVal('tr-vendor'), jenisKendaraan: ui.readVal('tr-jeniskend'), durasi: ui.readVal('tr-durasi') };
        t.totalBiaya = ui.num('tr-biyasewa');
      } else if (mode === 'umum') {
        t.detail = { jenis: ui.readVal('tr-jeniskend'), noTiket: ui.readVal('tr-vendor'), durasi: ui.readVal('tr-durasi') };
        t.totalBiaya = ui.num('tr-biyasewa');
      } else {
        var km = ui.num('tr-jarak');
        var tarif = ui.num('tr-tarif') || store.settings().tarifKm;
        var bt = ui.num('tr-biyasewa');
        t.detail = { jarakKm: km, tarifPerKm: tarif, biayaBensinTol: bt, durasi: ui.readVal('tr-durasi') };
        t.totalBiaya = km * tarif + bt;
      }
      if (!t.ruteAsal || !t.ruteTujuan) { ui.toast('Rute asal & tujuan wajib diisi', 'error'); return; }
      store.saveTransport(t);
      ui.toast('Rute ditambahkan (total ' + ui.fmt(t.totalBiaya) + ')', 'success');
      A.reload();
    },

    'transport:delete': function (el, d) {
      undoDelete('Rute dihapus', function () { store.deleteTransport(d.id); });
    },

    /* ---------- event product ---------- */
    'eventproduct:add': function (el, d) {
      var pid = ui.readVal('evp-produk');
      var qty = Math.max(parseInt(ui.readVal('evp-qty'), 10) || 1, 1);
      if (!pid) { ui.toast('Pilih produk yang akan dibawa.', 'error'); return; }
      store.saveEventProduct({ eventId: d.event, productId: pid, qtyDibawa: qty, qtyRusakHilang: 0, qtyKembali: 0, catatan: '' });
      ui.toast('Produk ditambahkan ke checklist', 'success');
      A.reload();
    },

    'eventproduct:remove': function (el, d) {
      undoDelete('Produk dihapus dari checklist', function () { store.removeEventProduct(d.id); });
    },

    'eventproduct:save': function (el, d) {
      var bawa = ui.$$('[id^="ep-"][id$="-bawa"]');
      var rusak = ui.$$('[id^="ep-"][id$="-rusak"]');
      bawa.forEach(function (inp) {
        var id = inp.id.replace('ep-', '').replace('-bawa', '');
        var ep = store.eventProducts(d.event).find(function (x) { return x.id === id; });
        if (ep) { ep.qtyDibawa = parseInt(inp.value, 10) || 0; store.saveEventProduct(ep); }
      });
      rusak.forEach(function (inp) {
        var id = inp.id.replace('ep-', '').replace('-rusak', '');
        var ep = store.eventProducts(d.event).find(function (x) { return x.id === id; });
        if (ep) { ep.qtyRusakHilang = parseInt(inp.value, 10) || 0; store.saveEventProduct(ep); }
      });
      ui.toast('Checklist tersimpan', 'success');
      A.reload();
    },

    'bring:toggle': function (el, d) {
      var sel = (A.bringSel = A.bringSel || {});
      if (el.checked) {
        var tpl = store.itemTemplates().find(function (t) { return t.id === d.tpl; });
        if (tpl) sel[d.tpl] = 1;
      } else {
        delete sel[d.tpl];
      }
      A.reloadAt(['#ps-4']);
    },

    'bring:qty': function (el, d) {
      var sel = (A.bringSel = A.bringSel || {});
      sel[d.tpl] = Math.max(parseInt(el.value, 10) || 1, 1);
    },

    'bring:remove': function (el, d) {
      delete (A.bringSel = A.bringSel || {})[d.tpl];
      A.reloadAt(['#ps-4']);
    },

    'bring:clear': function () {
      A.bringSel = {};
      ui.toast('Pilihan dibatalkan', '');
      A.reloadAt(['#ps-4']);
    },

    'bring:commit': function (el, d) {
      var sel = A.bringSel || {};
      var keys = Object.keys(sel);
      if (!keys.length) { ui.toast('Belum ada item dicentang', 'error'); return; }
      var tpls = store.itemTemplates();
      var cats = store.itemCats();
      var n = 0;
      keys.forEach(function (tid) {
        if (store.prepItemByTemplate(d.event, tid)) return;
        var tpl = tpls.find(function (t) { return t.id === tid; });
        if (!tpl) return;
        var c = cats.find(function (x) { return x.id === tpl.catId; });
        store.savePrepItem({
          eventId: d.event, templateId: tpl.id, nama: tpl.nama,
          kategori: c ? c.nama : 'Barang', qty: Math.max(parseInt(sel[tid], 10) || 1, 1), biaya: 0,
          status: 'belum', dibawa: true, pulang: false, catatan: ''
        });
        n++;
      });
      A.bringSel = {};
      A.bringEv = d.event;
      ui.toast(n > 0 ? n + ' item masuk ke Item Persiapan' : 'Item sudah tercatat di Item Persiapan', n > 0 ? 'success' : '');
      A.reloadAt(['#work-hero', '#ps-4', '#ps-7', '#ps-8']);
      if (n > 0) {
        var tbl = A.$('#ck3-saved');
        if (tbl) tbl.scrollIntoView({ behavior: ui.scrollBehavior(), block: 'start' });
      }
    },

    /* ---------- milestone ---------- */
    'milestone:add': function (el, d) {
      var judul = ui.readVal('mil-judul');
      if (!judul) { ui.toast('Judul milestone wajib diisi', 'error'); return; }
      var urutan = (store.milestones(d.event).length || 0) + 1;
      store.saveMilestone({ eventId: d.event, judul: judul, tanggal: ui.readVal('mil-tgl'), status: 'todo', urutan: urutan, catatan: '' });
      ui.toast('Milestone ditambahkan', 'success');
      A.reload();
    },

    'milestone:set': function (el, d) {
      var ms = store.milestones(d.event).find(function (m) { return m.id === d.id; });
      if (ms) { ms.status = el.value; store.saveMilestone(ms); }
      A.reloadAt(['#work-hero', '#ps-2'], '[data-action="milestone:set"][data-id="' + d.id + '"]');
    },

    'milestone:delete': function (el, d) {
      undoDelete('Milestone dihapus', function () { store.deleteMilestone(d.id); });
    },

    /* ---------- dokumen bukti (roadmap) ---------- */
    'milestone:att:add': function (el, d) {
      A.roadmapAttModal(d.id);
    },

    'milestone:att:save': function (el, d) {
      var nama = ui.readVal('att-nama');
      if (!nama) { ui.toast('Nama dokumen wajib diisi', 'error'); return; }
      store.saveMilestoneAttachment(d.id, {
        nama: nama, noSurat: ui.readVal('att-nosurat'), url: ui.readVal('att-url'), catatan: ui.readVal('att-catatan')
      });
      modalCloseAll();
      ui.toast('Dokumen terlampir di tahap', 'success');
      A.reload();
    },

    'milestone:att:delete': function (el, d) {
      undoDelete('Dokumen dihapus', function () { store.deleteMilestoneAttachment(d.milestone, d.id); });
    },

    /* ---------- penyesuaian kas ---------- */
    'kasadj:add': function (el, d) {
      var jumlah = ui.num('adj-jumlah');
      var keterangan = ui.readVal('adj-keterangan');
      if (jumlah === 0) { ui.toast('Nominal penyesuaian tidak boleh 0', 'error'); return; }
      if (!keterangan) { ui.toast('Keterangan wajib diisi', 'error'); return; }
      store.saveKasAdj({ eventId: d.event, tanggal: ui.readVal('adj-tanggal') || ui.isoToday(), keterangan: keterangan, jumlah: jumlah, wallet: ui.readVal('adj-wallet') || 'Kas' });
      ui.toast('Penyesuaian kas dicatat ' + ui.fmt(jumlah), 'success');
      A.reload();
    },

    'kasadj:delete': function (el, d) {
      undoDelete('Penyesuaian dihapus', function () { store.deleteKasAdj(d.id); });
    },

    /* ---------- dana cair ---------- */
    'danaCair:add': function (el, d) {
      var sumber = ui.readVal('dc-sumber');
      var nominal = ui.num('dc-nominal');
      if (!sumber) { ui.toast('Sumber dana wajib diisi', 'error'); return; }
      if (nominal <= 0) { ui.toast('Nominal harus lebih dari 0', 'error'); return; }
      store.saveDanaCair({
        eventId: d.event, sumber: sumber, rekening: ui.readVal('dc-rekening'),
        nominal: nominal, tanggalCair: ui.readVal('dc-tgl') || '',
        status: ui.readVal('dc-status') || 'belum', catatan: ''
      });
      ui.toast('Sumber dana dicatat ' + ui.fmt(nominal), 'success');
      A.reload();
    },

    'danaCair:delete': function (el, d) {
      undoDelete('Sumber dana dihapus', function () { store.deleteDanaCair(d.id); });
    },

    'danaCair:status': function (el, d) {
      var list = store.danaCair(d.event);
      var hit = list.find(function (z) { return z.id === d.id; });
      if (hit) { hit.status = el.value; store.saveDanaCair(hit); }
      A.reloadAt(['#work-hero', '#ps-1'], '[data-action="danaCair:status"][data-id="' + d.id + '"]');
    },

    /* ---------- alokasi SPPD rinci (anggaran per komponen + wallet tujuan) ---------- */
    'budget:katmode': function (el) {
      var wrap = A.$('#bg-custom-wrap');
      if (wrap) { wrap.classList.toggle('hidden', el.value !== '__custom__'); }
      /* komponen E-Money otomatis memakai wallet E-Money */
      var wsel = A.$('#bg-wallet');
      if (wsel && el.value === 'E-Money') { wsel.value = 'E-Money'; }
    },

    'budget:add': function (el, d) {
      var kategori = ui.readVal('bg-kategori');
      var custom = ui.readVal('bg-custom');
      var alokasi = ui.num('bg-alokasi');
      var walletDipilih = ui.readVal('bg-wallet');
      if (kategori === '__custom__') {
        kategori = custom;
        if (!kategori) { ui.toast('Tulis nama kategori sendiri', 'error'); return; }
      }
      if (alokasi <= 0) { ui.toast('Alokasi wajib lebih dari 0', 'error'); return; }
      var wallet = store.budgetWallet(kategori, walletDipilih);
      store.saveSppdBudgetItem(d.event, { kategori: kategori, alokasi: alokasi, ket: ui.readVal('bg-ket'), wallet: wallet });
      ui.toast('Alokasi ' + kategori + ' ' + ui.fmt(alokasi) + ' ke ' + wallet, 'success');
      A.reload();
    },

    'budget:delete': function (el, d) {
      undoDelete('Alokasi dihapus', function () { store.deleteSppdBudgetItem(d.event, d.id); });
    },

    /* ---------- item persiapan ---------- */
    'prepitem:add': function (el, d) {
      var nama = ui.readVal('prep-nama');
      if (!nama) { ui.toast('Nama item wajib diisi', 'error'); return; }
      store.savePrepItem({
        eventId: d.event, nama: nama, kategori: ui.readVal('prep-kategori'),
        qty: parseInt(ui.readVal('prep-qty'), 10) || 1, biaya: ui.num('prep-biaya'),
        status: ui.readVal('prep-status') || 'belum', dibawa: false, pulang: false, catatan: ui.readVal('prep-catatan')
      });
      ui.toast('Item persiapan ditambahkan', 'success');
      A.reload();
    },

    'prepitem:setstatus': function (el, d) {
      var p = store.prepItems(d.event).find(function (x) { return x.id === d.id; });
      if (p) { p.status = el.value; store.savePrepItem(p); }
      A.reload();
    },

    'prepitem:done': function (el, d) {
      var p = store.prepItems(d.event).find(function (x) { return x.id === d.id; });
      if (p) { p.status = el.checked ? 'selesai' : 'belum'; store.savePrepItem(p); }
      A.reloadAt(['#work-hero', '#ps-4', '#ps-7', '#ps-8'], '[data-action="prepitem:done"][data-id="' + d.id + '"]');
    },

    'prepitem:delete': function (el, d) {
      undoDelete('Item persiapan dihapus', function () { store.deletePrepItem(d.id); });
    },

    'prepitem:pulang': function (el, d) {
      var p = store.prepItems(d.event).find(function (x) { return x.id === d.id; });
      if (p) { p.pulang = !!el.checked; store.savePrepItem(p); }
      A.reloadAt(['#work-hero', '#ps-7', '#ps-8'], '[data-action="prepitem:pulang"][data-id="' + d.id + '"]');
    },

    'checklist:toggle': function (el, d) {
      var item = store.checklistItems(d.event).filter(function (c) { return c.templateId === d.tpl; })[0];
      if (!item) { return; }
      item.status = el.checked ? 'selesai' : 'todo';
      item.updatedAt = A.isoToday();
      store.saveChecklistItem(item);
      /* update di tempat — jangan render ulang agar scroll & isian lain tidak hilang */
      var label = el.closest ? el.closest('label') : null;
      var span = label ? label.querySelector('span') : null;
      if (span) { span.className = 'text-sm' + (el.checked ? ' text-muted line-through' : ''); }
      var done = store.checklistDone(d.event);
      var total = store.checklistItems(d.event).length;
      ui.$$('[data-ck-count]').forEach(function (n) {
        if (n.getAttribute('data-ck-count') === 'hero') {
          n.textContent = done + '/' + total;
        } else {
          n.textContent = done + ' / ' + total + ' item selesai · checklist wajib sebelum berangkat';
        }
      });
    },

    /* ---------- penjualan ---------- */
    'sale:add': function (el, d) {
      var ev = store.getEvent(d.event);
      var pid = ui.readVal('sa-produk');
      var qty = parseInt(ui.readVal('sa-qty'), 10) || 0;
      var harga = ui.num('sa-harga');
      var mVal = ui.readVal('sa-wallet') || 'Cash';
      var wMap = A.store.METODE_TO_WALLET;
      if (!pid || qty <= 0) { ui.toast('Pilih produk dan isi qty minimal 1.', 'error'); return; }
      var sisa = store.stokSisa(d.event, pid);
      if (sisa !== null && qty > sisa) {
        ui.toast('Stok tidak cukup. Sisa yang bisa dijual: ' + sisa + ' (dibawa − terjual − rusak). Kurangi qty.', 'error');
        return;
      }
      store.saveSale({
        eventId: d.event, productId: pid, tanggal: ui.readVal('sa-tgl') || ui.isoToday(),
        qty: qty, hargaSatuan: harga, metode: mVal, wallet: wMap[mVal] || 'Kas', total: qty * harga, catatan: ui.readVal('sa-catatan')
      });
      ui.toast('Penjualan tercatat ' + ui.fmt(qty * harga), 'success');
      A.reload();
    },

    'sale:delete': function (el, d) {
      undoDelete('Transaksi dihapus', function () { store.deleteSale(d.id); });
    },

    /* ---------- pengeluaran ---------- */
    'expense:add': function (el, d) {
      var jumlah = ui.num('ex-jumlah');
      var deskripsi = ui.readVal('ex-deskripsi');
      if (jumlah <= 0) { ui.toast('Jumlah wajib lebih dari 0', 'error'); return; }
      store.saveExpense({ eventId: d.event, kategori: ui.readVal('ex-kategori'), tanggal: ui.readVal('ex-tgl') || ui.isoToday(), deskripsi: deskripsi, jumlah: jumlah, wallet: ui.readVal('ex-wallet') || 'Kas', buktiDriveId: '', buktiLink: '' });
      ui.toast('Pengeluaran dicatat ' + ui.fmt(jumlah), 'success');
      A.reload();
    },

    'expense:delete': function (el, d) {
      undoDelete('Pengeluaran dihapus', function () { store.deleteExpense(d.id); });
    },

    /* ---------- produk ---------- */
    'product:new': function () { A.productModal(null); },
    'product:edit': function (el, d) {
      var p = store.products().find(function (x) { return x.id === d.id; });
      A.productModal(p);
    },

    'product:save': function (el, d) {
      var isNew = d.new === '1';
      var p = isNew ? {} : store.products().find(function (x) { return x.id === d.id; });
      p.nama = ui.readVal('pr-nama');
      p.sku = ui.readVal('pr-sku');
      p.satuan = ui.readVal('pr-satuan');
      p.hargaJualDefault = ui.num('pr-harga');
      p.stokKantor = parseInt(ui.readVal('pr-stok'), 10) || 0;
      p.aktif = ui.$('#pr-aktif') ? ui.$('#pr-aktif').checked : true;
      if (!p.nama) { ui.toast('Nama produk wajib diisi', 'error'); return; }
      store.saveProduct(p, isNew);
      modalCloseAll();
      ui.toast('Produk disimpan', 'success');
      A.reload();
    },

    'product:delete': function (el, d) {
      ui.confirm('Hapus produk?', 'Produk ikut terhapus dari checklist & penjualan event.', function () {
        undoDelete('Produk dihapus', function () { store.deleteProduct(d.id); });
      }, { confirm: 'Hapus produk' });
    },

    /* ---------- pengaturan ---------- */
    'settings:save': function () {
      var st = store.settings();
      st.nama = ui.readVal('st-nama');
      st.instansi = ui.readVal('st-instansi');
      st.tarifKm = ui.num('st-tarif');
      st.folderDriveId = ui.readVal('st-folder');
      store.saveSettings(st);
      ui.toast('Pengaturan disimpan', 'success');
      A.reload();
    },

    'data:clear': function () {
      ui.confirm('Kosongkan semua data?', 'Seluruh event, produk, penjualan, dan pengeluaran dihapus permanen. Template bawaan (checklist & master barang) tetap. Backup dulu jika perlu.', function () {
        store.clearAll();
        location.hash = '#/dashboard';
        ui.toast('Semua data dikosongkan', 'success');
        A.reload();
      }, { confirm: 'Kosongkan data' });
    },

    'data:export': function () {
      try {
        var json = store.exportJSON();
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'sppd-backup-' + A.isoToday() + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        ui.toast('Backup diunduh ke file', 'success');
      } catch (e) {
        ui.toast('Gagal membuat file backup. Coba lagi atau gunakan browser lain.', 'error');
      }
    },

    'data:import': function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) { return; }
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var r = store.importJSON(String(reader.result));
            ui.toast('Data dipulihkan: ' + r.before + ' → ' + r.after + ' event', 'success');
            location.hash = '#/dashboard';
            A.reload();
          } catch (e) {
            ui.toast(e.message, 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    /* ---------- navigasi dalam halaman ---------- */
    'scroll:to': function (el, d) {
      var t = document.querySelector(d.sel || '');
      if (!t) { return; }
      if (t.classList && t.classList.contains('psec') && t.classList.contains('closed')) {
        t.classList.remove('closed');
        var f = t.querySelector('.psec-fold');
        if (f) { f.textContent = '▾'; f.setAttribute('aria-expanded', 'true'); }
      }
      t.scrollIntoView({ behavior: ui.scrollBehavior(), block: 'start' });
    },

    'psec:toggle': function (el, d) {
      var sec = A.$(d.sel || '');
      if (!sec) { return; }
      var closed = sec.classList.toggle('closed');
      el.textContent = closed ? '▸' : '▾';
      el.setAttribute('aria-expanded', closed ? 'false' : 'true');
    },

    /* ---------- cetak ---------- */
    'report:event': function (el, d) { A.printEvent(store.getEvent(d.event)); },

    'print:open': function (el, d) {
      modalCloseAll();
      var ev = store.getEvent(d.event);
      if (!ev) { return; }
      var w = window.open('', '_blank');
      if (!w) {
        var html = A.printHTML(ev);
        ui.toast('Popup diblokir — buka lewat jendela cetak di bawah');
        ui.modal(
          '<div class="card-pad">' +
          '<h3 class="text-lg font-extrabold mb-1">Cetak Laporan</h3>' +
          '<p class="text-muted text-sm mb-3">Popup diblokir browser. Klik <b>Cetak</b> untuk membuka dialog cetak dari jendela ini.</p>' +
          '<iframe id="print-frame" style="width:100%;height:52vh;border:1px solid #ddd;background:#fff" srcdoc="' + ui.esc(html) + '"></iframe>' +
          '<div class="flex justify-end mt-3 gap-2"><button class="btn btn-ghost" data-action="modal:close">Tutup</button>' +
          '<button class="btn btn-ink" data-action="print:iframe">Cetak</button></div></div>'
        );
        return;
      }
      w.document.write(A.printHTML(ev));
      w.document.close();
      setTimeout(function () { w.focus(); w.print(); }, 250);
    },

    'print:iframe': function () {
      var f = A.$('#print-frame');
      if (!f || !f.contentWindow) { ui.toast('Konten belum siap, coba lagi', 'error'); return; }
      setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); }, 250);
    },

    'report:global': function () {
      var rep = store.globalReports();
      var rows = store.events().map(function (e) {
        var s = rep.events[e.id] || { totalSales: 0, pengeluaran: 0, saldo: 0 };
        return '<tr><td>' + e.nama + '</td><td>' + e.tanggalMulai + '</td><td>' + ui.fmt(s.totalSales) + '</td><td>' + ui.fmt(s.pengeluaran) + '</td><td>' + ui.fmt(s.saldo) + '</td></tr>';
      }).join('');
      var w = window.open('', '_blank');
      if (!w) { ui.toast('Izinkan popup untuk cetak', 'error'); return; }
      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rekap Global</title>' +
        '<style>body{font-family:sans-serif;padding:32px;max-width:720px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:8px;font-size:12px;text-align:left}th{background:#f5f5f5}</style></head><body>' +
        '<h1>Rekap Global</h1>' +
        '<p>Total penjualan: ' + ui.fmt(rep.totalSales) + ' (' + rep.totalSalesQty + ' barang) · Total biaya: ' + ui.fmt(rep.totalExpense) + ' · Saldo: ' + ui.fmt(rep.totalSaldo) + '</p>' +
        '<table><thead><tr><th>Event</th><th>Mulai</th><th>Penjualan</th><th>Biaya</th><th>Saldo</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</body></html>');
      w.document.close();
      setTimeout(function () { w.focus(); w.print(); }, 250);
    }
  };
})(window.SPT);