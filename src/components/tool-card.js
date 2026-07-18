// src/components/tool-card.js - Card generation (non-module)
var ToolCard = {
  configs: [
    // Productive
    {
      group: 'productive',
      hash: '#productive/planner',
      title: 'Team Planner',
      desc: 'Manajemen perencanaan tugas tim dan sinkronisasi log harian secara real-time.',
      search: 'team planner manajemen tugas tim real-time'
    },
    {
      group: 'productive',
      hash: '#productive/analytic',
      title: 'Analytic Dashboard',
      desc: 'SAS Bento Edition. Grafik interaktif analisis penjualan dan visualisasi performa data.',
      search: 'analytic dashboard sales analytic simplify sas visualisasi data'
    },
    {
      group: 'productive',
      hash: '#productive/latch',
      title: 'LATCH Web Link',
      desc: 'Portal pengumpul dan manajemen tautan/link berkas penting kebutuhan operasional.',
      search: 'latch web link kumpulan link penting kegiatan'
    },
    // Universal
    {
      group: 'universal',
      hash: '#external/resi',
      title: 'Resi Generator',
      desc: 'Pembuatan resi logistik otomatis yang terintegrasi secara dinamis.',
      search: 'resi generator pembuatan resi operasional otomatis'
    },
    {
      group: 'universal',
      hash: '#utilities/outbond',
      title: 'Pendataan Paket',
      desc: 'Sistem logging dan scanning barcode untuk pencatatan paket masuk/keluar.',
      search: 'pendataan paket sistem pencatatan masuk keluar scan'
    },
    {
      group: 'universal',
      hash: '#utilities/activity',
      title: 'Activity Tracker',
      desc: 'Pencatatan dan pemantauan performa progres kerja harian seluruh anggota tim.',
      search: 'activity tracker pencatatan aktivitas pekerjaan tim'
    },
    {
      group: 'universal',
      hash: '#utilities/retur',
      title: 'Retur Tracker',
      desc: 'Sistem pencatatan terpusat untuk pelacakan, status, dan riwayat barang retur.',
      search: 'retur tracker pencatatan data barang retur'
    },
    {
      group: 'universal',
      hash: '#doc/dak',
      title: 'Form Pengajuan DAK',
      desc: 'Pembuatan dokumen pengajuan sistematis untuk program Dana Amanah Karyawan.',
      search: 'form pengajuan dak dana amanah karyawan pembuatan dokumen'
    },
    {
      group: 'universal',
      hash: '#utilities/merger',
      title: 'PDFM Merger',
      desc: 'Penyatuan berkas resi terpisah menjadi satu dokumen PDF tanpa memburamkan barcode/QR.',
      search: 'pdfm merger satukan semua resi pdf gabung'
    }
  ],

  createCard: function(config) {
    var card = document.createElement('div');
    card.className = 'bento-card';
    card.setAttribute('data-search', config.search);
    card.setAttribute('data-hash', config.hash);
    card.innerHTML =
      '<div class="card-top">' +
        '<h3>' + config.title + '</h3>' +
        '<p>' + config.desc + '</p>' +
      '</div>' +
      '<div class="card-action">' +
        'Buka Modul' +
        '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      '</div>';
    return card;
  },

  renderAll: function() {
    var groups = { productive: [], universal: [] };
    for (var i = 0; i < this.configs.length; i++) {
      var c = this.configs[i];
      var card = this.createCard(c);
      if (groups[c.group]) groups[c.group].push(card);
    }
    var prodGrid = document.getElementById('grid-productive');
    var utilGrid = document.getElementById('grid-universal');
    if (prodGrid) {
      for (var j = 0; j < groups.productive.length; j++) prodGrid.appendChild(groups.productive[j]);
    }
    if (utilGrid) {
      for (var k = 0; k < groups.universal.length; k++) utilGrid.appendChild(groups.universal[k]);
    }
  }
};

if (typeof module !== 'undefined') module.exports = { ToolCard };
