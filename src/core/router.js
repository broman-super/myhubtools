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

  goHome() {
    window.location.hash = '#dashboard';
  }

  getToolPath(hash) {
    var map = {
      '#productive/planner': 'Productive/Task/taskschedule.html',
      '#productive/analytic': 'Productive/Analytic.html',
      '#productive/latch': 'Productive/latch/latch.html',
      '#utilities/outbond': 'Productive/Outbondtrack.html',
      '#utilities/activity': 'Productive/tr/tracking.html',
      '#utilities/retur': 'Productive/tr-retur/retur-track.html',
      '#utilities/merger': 'Productive/PDF-Merger/PDFM_V2.html',
      '#doc/dak': 'Doc/form-dak.html',
      '#external/resi': 'Productive/Resi-Generator/Index.html'
    };
    return map[hash] || '';
  }
}

if (typeof module !== 'undefined') module.exports = { ReynaHubRouter };
