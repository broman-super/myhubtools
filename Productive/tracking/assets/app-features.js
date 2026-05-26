/**
 * SUPERSUB - Fitur: template, salin kemarin, reminder, ringkasan durasi, export CSV, overlap lintas user
 */
(function (global) {
  'use strict';

  var TEMPLATE_KEY = 'supersub_activity_templates';
  var REMINDER_KEY = 'supersub_reminder_last';
  var REMINDER_HOUR = 18;

  function api(action, payload) {
    if (global.SuperSubApi) return global.SuperSubApi.post(action, payload);
    return Promise.reject(new Error('SuperSubApi tidak tersedia.'));
  }

  function getTemplates() {
    try {
      return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveTemplates(list) {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(list));
  }

  function renderTemplateSelect() {
    var sel = document.getElementById('inp-template-select');
    if (!sel) return;
    var list = getTemplates();
    sel.innerHTML = '<option value="">— Template tersimpan —</option>';
    list.forEach(function (t, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = t.name || ('Template ' + (i + 1));
      sel.appendChild(opt);
    });
  }

  function applyTemplate(indexStr) {
    if (!indexStr) return;
    var list = getTemplates();
    var t = list[parseInt(indexStr, 10)];
    if (!t) return;
    var map = {
      'inp-kategori': t.kategori,
      'inp-tipe': t.tipe,
      'inp-beban': t.beban,
      'inp-deskripsi': t.deskripsi,
      'inp-output': t.output
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && map[id] != null) el.value = map[id];
    });
    if (typeof global.updateKategoriDesc === 'function') global.updateKategoriDesc();
    if (typeof global.showToast === 'function') {
      global.showToast('success', 'Template Diterapkan', (t.name || 'Template') + ' dimuat ke form.');
    }
  }

  function saveCurrentAsTemplate() {
    var name = prompt('Nama template (contoh: Rapat harian CSO):');
    if (!name || !name.trim()) return;
    var list = getTemplates();
    list.push({
      name: name.trim(),
      kategori: document.getElementById('inp-kategori').value,
      tipe: document.getElementById('inp-tipe').value,
      beban: document.getElementById('inp-beban').value,
      deskripsi: document.getElementById('inp-deskripsi').value,
      output: document.getElementById('inp-output').value
    });
    if (list.length > 12) list = list.slice(-12);
    saveTemplates(list);
    renderTemplateSelect();
    if (typeof global.showToast === 'function') {
      global.showToast('success', 'Template Disimpan', 'Maks. 12 template di browser Anda.');
    }
  }

  function copyFromYesterday() {
    if (!global.sessionUser || !global.sessionUser.name) return;
    api('getYesterdayActivities', { username: global.sessionUser.name })
      .then(function (res) {
        if (!res.success) throw new Error(res.msg);
        var list = res.data || [];
        if (list.length === 0) {
          if (typeof global.showToast === 'function') {
            global.showToast('info', 'Kosong', 'Tidak ada aktivitas kemarin untuk disalin.');
          }
          return;
        }
        var last = list[list.length - 1];
        document.getElementById('inp-kategori').value = last.kategori || '';
        document.getElementById('inp-tipe').value = last.tipe || '';
        document.getElementById('inp-beban').value = last.beban || '';
        document.getElementById('inp-deskripsi').value = last.aktivitas || '';
        document.getElementById('inp-output').value = last.output || '';
        if (typeof global.updateKategoriDesc === 'function') global.updateKategoriDesc();
        if (typeof global.showToast === 'function') {
          global.showToast('success', 'Disalin dari Kemarin', 'Bidang & deskripsi aktivitas terakhir kemarin diisi. Sesuaikan waktu lalu submit.');
        }
      })
      .catch(function (err) {
        if (typeof global.showToast === 'function') {
          global.showToast('error', 'Gagal', err.message || 'Tidak dapat memuat data kemarin.');
        }
      });
  }

  function refreshDurationSummary() {
    var el = document.getElementById('inp-durasi-ringkasan');
    if (!el || !global.sessionUser || !global.sessionUser.name) return;
    var tanggal = (document.getElementById('inp-tanggal') || {}).value;
    if (!tanggal && typeof global.getTodayJakarta === 'function') {
      tanggal = global.getTodayJakarta();
    }
    if (!tanggal) return;
    el.innerHTML = '<span style="color:#94A3B8;">Menghitung durasi...</span>';
    api('getDayDuration', { username: global.sessionUser.name, tanggal: tanggal })
      .then(function (res) {
        if (!res.success || !res.data) throw new Error(res.msg);
        var d = res.data;
        el.innerHTML =
          '<strong style="color:#1E40AF;">' + d.label + '</strong>' +
          ' · ' + d.count + ' aktivitas · tanggal ' + d.tanggal + ' (WIB)';
      })
      .catch(function () {
        el.innerHTML = '<span style="color:#94A3B8;">Ringkasan durasi tidak tersedia.</span>';
      });
  }

  function downloadCsv(startDate, endDate) {
    api('exportCsv', { startDate: startDate, endDate: endDate || startDate })
      .then(function (res) {
        if (!res.success || !res.data) throw new Error(res.msg || 'Export gagal.');
        var blob = new Blob(['\ufeff' + res.data.csv], { type: 'text/csv;charset=utf-8;' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = res.data.filename || 'export.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof global.showToast === 'function') {
          global.showToast('success', 'Export CSV', 'File berhasil diunduh.');
        }
      })
      .catch(function (err) {
        if (typeof global.showToast === 'function') {
          global.showToast('error', 'Export Gagal', err.message);
        }
      });
  }

  function exportMyHistoryCsv() {
    var start = document.getElementById('history-date-filter').value;
    var end = document.getElementById('history-date-end').value || start;
    if (!start) {
      if (typeof global.showToast === 'function') {
        global.showToast('warning', 'Pilih Periode', 'Atur filter riwayat terlebih dahulu.');
      }
      return;
    }
    if (!global.sessionUser || !global.sessionUser.name) return;
    api('exportUserCsv', {
      username: global.sessionUser.name,
      startDate: start,
      endDate: end
    }).then(function (res) {
      if (!res.success || !res.data) throw new Error(res.msg);
      var blob = new Blob(['\ufeff' + res.data.csv], { type: 'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = res.data.filename || 'riwayat.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      if (typeof global.showToast === 'function') {
        global.showToast('success', 'Export CSV', 'Riwayat pribadi berhasil diunduh.');
      }
    }).catch(function (err) {
      if (typeof global.showToast === 'function') {
        global.showToast('error', 'Export Gagal', err.message);
      }
    });
  }

  function exportSpvCsv() {
    var start = document.getElementById('filter-start').value;
    if (!start && typeof global.getTodayJakarta === 'function') start = global.getTodayJakarta();
    downloadCsv(start, start);
  }

  function renderCrossOverlapPanel(overlapData) {
    var panel = document.getElementById('audit-cross-overlap-panel');
    if (!panel) return;
    if (!overlapData || overlapData.count === 0) {
      panel.innerHTML =
        '<div style="font-size:11px;font-weight:700;color:#10B981;">Tidak ada overlap lintas user — beban paralel rendah.</div>';
      return;
    }
    var html =
      '<div style="font-size:10px;font-weight:800;color:#B45309;text-transform:uppercase;margin-bottom:8px;">' +
      '⚡ ' + overlapData.count + ' overlap lintas user (indikator beban menumpuk)</div>';
    overlapData.items.slice(0, 8).forEach(function (o) {
      html +=
        '<div style="font-size:10px;padding:8px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin-bottom:6px;line-height:1.5;">' +
        '<strong>' + o.tanggal + '</strong> · ' + o.userA + ' ↔ ' + o.userB +
        ' · overlap ~' + o.overlapMinutes + ' menit<br>' +
        '<span style="color:#64748B;">' + (o.actA || '').substring(0, 40) + ' … / ' + (o.actB || '').substring(0, 40) + '…</span></div>';
    });
    if (overlapData.items.length > 8) {
      html += '<div style="font-size:9px;color:#94A3B8;">+' + (overlapData.items.length - 8) + ' lainnya</div>';
    }
    panel.innerHTML = html;
  }

  function checkDailyReminder() {
    if (!global.sessionUser || !global.sessionUser.name) return;
    if (typeof global.getTodayJakarta !== 'function' || typeof global.getJakartaNow !== 'function') return;

    var now = global.getJakartaNow();
    var today = global.getTodayJakarta();
    var last = localStorage.getItem(REMINDER_KEY);
    if (last === today + '_done' || last === today + '_dismiss') return;

    if (now.getHours() < REMINDER_HOUR) return;

    api('getDayDuration', { username: global.sessionUser.name, tanggal: today })
      .then(function (res) {
        var count = (res.data && res.data.count) || 0;
        if (count > 0) {
          localStorage.setItem(REMINDER_KEY, today + '_done');
          return;
        }
        if (typeof global.showToast === 'function') {
          global.showToast(
            'warning',
            'Reminder Input (18:00 WIB)',
            'Belum ada aktivitas tercatat hari ini. Segera isi log sebelum akhir hari.',
            12000
          );
        }
        localStorage.setItem(REMINDER_KEY, today + '_dismiss');
      })
      .catch(function () {});
  }

  function initFeatures() {
    renderTemplateSelect();
    refreshDurationSummary();
    setInterval(checkDailyReminder, 60000);
    setTimeout(checkDailyReminder, 3000);

    var tplSel = document.getElementById('inp-template-select');
    if (tplSel) {
      tplSel.addEventListener('change', function () {
        applyTemplate(this.value);
        this.value = '';
      });
    }

    var inpTanggal = document.getElementById('inp-tanggal');
    if (inpTanggal) {
      inpTanggal.addEventListener('change', refreshDurationSummary);
    }
  }

  global.AppFeatures = {
    init: initFeatures,
    copyFromYesterday: copyFromYesterday,
    saveCurrentAsTemplate: saveCurrentAsTemplate,
    refreshDurationSummary: refreshDurationSummary,
    exportMyHistoryCsv: exportMyHistoryCsv,
    exportSpvCsv: exportSpvCsv,
    renderCrossOverlapPanel: renderCrossOverlapPanel,
    invalidateAndRefresh: function () {
      if (global.SuperSubApi) global.SuperSubApi.invalidateDashboardCache();
      refreshDurationSummary();
    }
  };
})(typeof window !== 'undefined' ? window : this);
