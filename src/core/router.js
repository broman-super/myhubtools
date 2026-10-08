// src/core/router.js - Hash-based routing (non-module)
class ReynaHubRouter {
  constructor() {
    this.currentHash = '';
    this.onNavigate = null;
    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  handleRoute() {
    var hash = window.location.hash || '';
    if (hash === this.currentHash) return;
    this.currentHash = hash;

    if (!hash || hash === '#' || hash === '#dashboard') {
      if (this.onNavigate) this.onNavigate(null);
    } else {
      var path = this.getToolPath(hash);
      if (path && this.onNavigate) {
        this.onNavigate({ hash: hash, path: path });
      }
    }
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  getToolPath(hash) {
    var clean = hash.split('?')[0];
    var map = {
      '#productive/planner': 'Productive/planner/taskschedule.html',
      '#productive/analytic': 'Productive/analytic/Analytic.html',
      '#productive/latch': 'Productive/latch/latch.html',
      '#productive/expense': 'Productive/expense-tracker/index.html',
      '#productive/rnd-roadmap': 'Productive/Project_develop/dist/index.html',
      '#utilities/outbond': 'Productive/outbound-track/outbound-track.html',
      '#utilities/activity': 'Productive/activity-tracker/tracking.html',
      '#utilities/retur': 'Productive/retur-track/retur-track.html',
      '#utilities/merger': 'Productive/pdf-merger/PDFM_V2.html',
      '#utilities/faktur': 'Productive/faktur-penjualan/Index.html',
      '#doc/dak': 'dak/form-dak.html',
      '#external/resi': 'Productive/resi-generator/Index.html'
    };
    return map[clean] || '';
  }
}
