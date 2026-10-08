/**
 * SUPERSUB - Core API & dashboard bundle (efisiensi fetch)
 */
(function (global) {
  'use strict';

  var dashboardCache = {};

  function resolveGasUrl() {
    if (global.GAS_URL) return global.GAS_URL;
    if (global.SUPERSUB_CONFIG && global.SUPERSUB_CONFIG.gasUrl) return global.SUPERSUB_CONFIG.gasUrl;
    return '';
  }

  function gasApi(action, payload) {
    var url = resolveGasUrl();
    if (!url) {
      return Promise.reject(new Error('GAS_URL belum dikonfigurasi. Isi URL di assets/config.js lalu refresh halaman.'));
    }
    var body = Object.assign({ action: action }, payload || {});
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (res) { return res.json(); });
  }

  function cacheKey(start, end) {
    return (start || '') + '|' + (end || start || '');
  }

  function fetchDashboardBundle(startDate, endDate, forceRefresh) {
    var end = endDate || startDate;
    var key = cacheKey(startDate, end);
    if (!forceRefresh && dashboardCache[key]) {
      return Promise.resolve(dashboardCache[key]);
    }
    return gasApi('getDashboardBundle', { startDate: startDate, endDate: end }).then(function (res) {
      if (!res.success) throw new Error(res.msg || 'Gagal memuat dashboard.');
      dashboardCache[key] = res.data;
      return res.data;
    });
  }

  function invalidateDashboardCache() {
    dashboardCache = {};
  }

  global.SuperSubApi = {
    post: gasApi,
    fetchDashboardBundle: fetchDashboardBundle,
    invalidateDashboardCache: invalidateDashboardCache
  };
})(typeof window !== 'undefined' ? window : this);
