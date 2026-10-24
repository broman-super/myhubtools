// src/components/tool-card.js - Card generation (non-module)
// Grup kartu = id section di index.html (`grid-<group>` + tombol sidebar `data-group`).
var ToolCard = {
  configs: [
    // Analitik & Insight
    {
      group: 'analitik',
      hash: '#productive/analytic',
      title: 'Analytic Dashboard',
      desc: 'Dashboard analisis penjualan & biaya: grafik interaktif, target, impor Excel, laporan cetak/PDF.',
      search: 'analytic dashboard sales analytic simplify sas visualisasi data penjualan biaya'
    },
    {
      group: 'analitik',
      hash: '#productive/meta-insight',
      title: 'Meta Insight Dashboard',
      desc: 'Analisis insight konten Meta (Facebook/Instagram): unggah CSV, dapatkan KPI, grafik, dan temuan otomatis.',
      search: 'meta insight dashboard facebook instagram csv konten analisis engagement reach views likes'
    },
    // Operasional & Logistik
    {
      group: 'operasional',
      hash: '#external/resi',
      title: 'Resi Generator',
      desc: 'Pembuatan resi logistik otomatis yang terintegrasi secara dinamis.',
      search: 'resi generator pembuatan resi operasional otomatis'
    },
    {
      group: 'operasional',
      hash: '#utilities/outbond',
      title: 'Pendataan Paket',
      desc: 'Sistem logging dan scanning barcode untuk pencatatan paket masuk/keluar.',
      search: 'pendataan paket sistem pencatatan masuk keluar scan'
    },
    {
      group: 'operasional',
      hash: '#utilities/retur',
      title: 'Retur Tracker',
      desc: 'Sistem pencatatan terpusat untuk pelacakan, status, dan riwayat barang retur.',
      search: 'retur tracker pencatatan data barang retur'
    },
    // Dokumen & Arsip
    {
      group: 'dokumen',
      hash: '#productive/sppd',
      title: 'SPPD Toolbox',
      desc: 'Kelola perjalanan dinas (SPPD): budget, transport, produk, penjualan, checklist, dan laporan.',
      search: 'sppd perjalanan dinas budget transport produk laporan arsip'
    },
    {
      group: 'dokumen',
      hash: '#utilities/faktur',
      title: 'Faktur Penjualan',
      desc: 'Pembuatan faktur penjualan format resmi A4, siap disimpan sebagai PDF.',
      search: 'faktur penjualan invoice tagihan pdf harga produk'
    },
    {
      group: 'dokumen',
      hash: '#utilities/merger',
      title: 'PDFM Merger',
      desc: 'Penyatuan berkas resi terpisah menjadi satu dokumen PDF tanpa memburamkan barcode/QR.',
      search: 'pdfm merger satukan semua resi pdf gabung'
    },
    {
      group: 'dokumen',
      hash: '#doc/dak',
      title: 'Form Pengajuan DAK',
      desc: 'Pembuatan dokumen pengajuan sistematis untuk program Dana Amanah Karyawan.',
      search: 'form pengajuan dak dana amanah karyawan pembuatan dokumen'
    },
    {
      group: 'dokumen',
      hash: '#productive/latch',
      title: 'LATCH Web Link',
      desc: 'Portal pengumpul dan manajemen tautan/link berkas penting kebutuhan operasional.',
      search: 'latch web link kumpulan link penting kegiatan'
    },
    // Perencanaan & Tim
    {
      group: 'tim',
      hash: '#productive/planner',
      title: 'TaskSpace',
      desc: 'Manajemen perencanaan tugas tim dan sinkronisasi log harian secara real-time.',
      search: 'taskspace team planner manajemen tugas tim real-time'
    },
    {
      group: 'tim',
      hash: '#productive/rnd-roadmap',
      title: 'RND Roadmap Tracker',
      desc: 'Pelacakan roadmap produk baru Divisi R&D: tahapan, checklist, dan evaluasi kelayakan.',
      search: 'rnd roadmap tracker produk baru riset pengembangan tahapan evaluasi'
    },
    {
      group: 'tim',
      hash: '#utilities/activity',
      title: 'Activity Tracker',
      desc: 'Pencatatan dan pemantauan performa progres kerja harian seluruh anggota tim.',
      search: 'activity tracker pencatatan aktivitas pekerjaan tim'
    }
  ],

  createCard: function(config) {
    var card = document.createElement('div');
    card.className = 'bento-card';
    card.setAttribute('data-search', config.search);
    card.setAttribute('data-hash', config.hash);
    card.setAttribute('data-group', config.group);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
    card.innerHTML =
      '<div class="card-top">' +
        '<h3>' + config.title + '</h3>' +
        '<p>' + config.desc + '</p>' +
      '</div>' +
      '<div class="card-action">' +
        'Buka Modul' +
        '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      '</div>';
    // Badge notifikasi RND Roadmap: angka dibaca dari localStorage['rnd-alert-count']
    if (config.hash === '#productive/rnd-roadmap') {
      var badge = document.createElement('span');
      badge.className = 'card-badge';
      badge.id = 'badge-rnd-roadmap';
      badge.setAttribute('hidden', '');
      card.appendChild(badge);
    }
    // Badge penanda webtool baru
    if (config.hash === '#productive/meta-insight') {
      var newBadge = document.createElement('span');
      newBadge.className = 'card-badge card-badge-new';
      newBadge.textContent = 'BARU';
      card.appendChild(newBadge);
    }
    return card;
  },

  renderAll: function() {
    for (var i = 0; i < this.configs.length; i++) {
      var c = this.configs[i];
      var grid = document.getElementById('grid-' + c.group);
      if (!grid) { console.warn('[hub] grup tidak punya section:', c.group, c.hash); continue; }
      grid.appendChild(this.createCard(c));
    }
  }
};
