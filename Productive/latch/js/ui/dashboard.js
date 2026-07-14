(function () {
  'use strict';
  var state = window.LATCH.state;
  var db = window.LATCH.db;
  var C = window.LATCH.components;
  var U = window.LATCH.utils;
  var $ = U.$id;

  var D = {};
  var selected = {};
  var selectMode = false;

  function catName(id) {
    var c = state.get('cats').find(function (x) { return x.id === id; });
    return c ? c.name : '';
  }
  function catId(name) {
    var c = state.get('cats').find(function (x) { return x.name === name; });
    return c ? c.id : '';
  }

  D.render = function () {
    D.renderTable();
    D.renderNav();
    D.renderCount();
    D.updateDrawerCatList();
  };

  D.renderTable = function () {
    var el = $('dashboardTable');
    if (!el) return;
    var cats = state.get('cats');
    var links = state.get('links');
    var q = ($('dashSearchInput') || {}).value || '';

    function highlight(text) {
      if (!q) return U.esc(text);
      var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return U.esc(text).replace(re, '<span class="search-highlight">$1</span>');
    }

    var html = '';
    var total = 0;

    cats.forEach(function (cat) {
      var catLinks = links.filter(function (l) { return l.categoryId === cat.id; });
      catLinks.sort(function (a, b) {
        return (typeof a.sort === 'number' ? a.sort : 0) - (typeof b.sort === 'number' ? b.sort : 0);
      });
      if (!catLinks.length) return;
      if (q) {
        catLinks = catLinks.filter(function (l) {
          return l.title.toLowerCase().indexOf(q.toLowerCase()) !== -1 ||
                 l.url.toLowerCase().indexOf(q.toLowerCase()) !== -1;
        });
        if (!catLinks.length) return;
      }
      total += catLinks.length;
      html += '<div class="dash-group" id="dash-group-' + cat.id + '" data-cat="' + cat.id + '">';
      html += '<div class="dash-group-header"><i data-feather="' + cat.feather + '"></i><span>' + U.esc(cat.name) + '</span><span class="tab-count">' + catLinks.length + '</span></div>';
      catLinks.forEach(function (l) {
        var cn = catName(l.categoryId);
        var checked = selected[l.id] ? 'checked' : '';
        var catOpts = state.get('cats').map(function(c) {
          var s = c.name === cn ? 'selected' : '';
          return '<option value="' + U.esc(c.name) + '" ' + s + '>' + U.esc(c.name) + '</option>';
        }).join('');
        html += '<div class="dash-row' + (selected[l.id] ? ' selected' : '') + '" data-id="' + l.id + '" draggable="true">' +
          '<div class="dash-field dash-grip" data-a="grip" title="Seret untuk urutkan">⠿</div>' +
          '<div class="dash-field dash-title" style="display:flex;align-items:center;gap:4px">' +
          '<input type="checkbox" class="dash-checkbox" data-a="check" ' + checked + '>' +
          '<input type="text" value="' + U.esc(l.title) + '" data-f="title"></div>' +
          '<div class="dash-field dash-url"><input type="text" value="' + U.esc(l.url) + '" data-f="url"></div>' +
          '<div class="dash-field dash-cat"><div class="dash-select-wrap"><select data-f="cat">' + catOpts + '</select><svg class="dash-select-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div>' +
          '<div class="dash-field dash-time"><span>' + U.relTime(l.updated) + '</span></div>' +
          '<div class="dash-field dash-act">' +
          '<button class="dash-btn dash-btn-danger" data-a="del" title="Hapus">🗑</button>' +
          '<button class="dash-btn dash-btn-save" data-a="save" title="Simpan" style="display:none">💾</button>' +
          '<button class="dash-btn" data-a="copy" title="Salin link">📋</button>' +
          '</div></div>';
      });
      html += '</div>';
    });
    el.innerHTML = html;

    links.forEach(function (l) {
      l._orig = { title: l.title, url: l.url, cat: catName(l.categoryId) };
    });

    var dragSrcId = null;
    var dragSrcGroup = null;

    el.querySelectorAll('.dash-row').forEach(function (row) {
      row.querySelectorAll('input[data-f]').forEach(function (inp) {
        inp.addEventListener('input', function () { rowChange(row); });
      });
      row.querySelectorAll('select[data-f]').forEach(function (sel) {
        sel.addEventListener('change', function () { rowChange(row); });
      });
      var delBtn = row.querySelector('[data-a="del"]');
      var saveBtn = row.querySelector('[data-a="save"]');
      var copyBtn = row.querySelector('[data-a="copy"]');
      var check = row.querySelector('[data-a="check"]');
      if (delBtn) delBtn.addEventListener('click', function () { delClick(row.dataset.id); });
      if (saveBtn) saveBtn.addEventListener('click', function () { saveClick(row.dataset.id); });
      if (copyBtn) copyBtn.addEventListener('click', function () { copyLink(row.dataset.id); });
      if (check) check.addEventListener('change', function () { toggleSelect(row.dataset.id, this.checked); });

      row.addEventListener('dragstart', function (e) {
        dragSrcId = this.dataset.id;
        dragSrcGroup = this.closest('.dash-group');
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.id);
      });
      row.addEventListener('dragend', function () {
        this.classList.remove('dragging');
        el.querySelectorAll('.dash-row.drag-over').forEach(function (r) { r.classList.remove('drag-over'); });
        dragSrcId = null;
        dragSrcGroup = null;
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      row.addEventListener('dragenter', function (e) {
        e.preventDefault();
        if (this.dataset.id !== dragSrcId) this.classList.add('drag-over');
      });
      row.addEventListener('dragleave', function () {
        this.classList.remove('drag-over');
      });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        var targetId = this.dataset.id;
        if (!dragSrcId || dragSrcId === targetId) return;
        var srcGroup = dragSrcGroup;
        var tgtGroup = this.closest('.dash-group');
        if (srcGroup && tgtGroup && srcGroup.dataset.cat !== tgtGroup.dataset.cat) return;
        var group = tgtGroup || srcGroup;
        if (!group) return;
        var catId = group.dataset.cat;
        var rows = group.querySelectorAll('.dash-row');
        var orderedIds = [];
        rows.forEach(function (r) {
          if (r.dataset.id === dragSrcId) return;
          if (r.dataset.id === targetId) {
            orderedIds.push(dragSrcId);
          }
          orderedIds.push(r.dataset.id);
        });
        if (orderedIds.indexOf(dragSrcId) === -1) orderedIds.push(dragSrcId);
        db.reorderLinks(catId, orderedIds).then(function (r) {
          if (r.success) {
            db.getData(true).then(function (data) {
              state.set({ cats: data.categories, links: data.links });
              D.renderTable();
            });
          }
        });
      });
    });

    if (typeof feather !== 'undefined') feather.replace();
    D.updateCatList();
  };

  function copyLink(id) {
    var links = state.get('links');
    var link = links.find(function (l) { return l.id === id; });
    if (!link) return;
    U.copyToClipboard(link.url).then(function (ok) {
      if (ok) C.toast('Link disalin: ' + link.title, 'success');
      else C.toast('Gagal menyalin link', 'error');
    });
  }

  function toggleSelect(id, checked) {
    if (checked) { selected[id] = true; }
    else { delete selected[id]; }
    var row = $('dashboardTable').querySelector('[data-id="' + id + '"]');
    if (row) {
      row.classList.toggle('selected', !!selected[id]);
      row.querySelector('[data-a="check"]').checked = !!selected[id];
    }
    updateBulkDeleteBtn();
  }

  function updateBulkDeleteBtn() {
    var btn = $('bulkDeleteBtn');
    if (!btn) return;
    var count = Object.keys(selected).length;
    if (count > 0) {
      btn.style.display = '';
      btn.title = 'Hapus ' + count + ' terpilih';
      btn.textContent = '🗑 ' + count;
    } else {
      btn.style.display = 'none';
    }
  }

  D.selectMode = function (on) {
    selectMode = on;
    var rows = ($('dashboardTable') || {}).querySelectorAll('.dash-row');
    rows.forEach(function (r) {
      r.classList.toggle('select-mode', on);
      var cb = r.querySelector('[data-a="check"]');
      if (cb) cb.style.display = on ? '' : 'none';
      if (!on) { cb.checked = false; delete selected[r.dataset.id]; }
    });
    if (!on) {
      selected = {};
      updateBulkDeleteBtn();
    }
  };

  D.bulkDelete = function () {
    var ids = Object.keys(selected);
    if (!ids.length) return;
    var msg = $('deleteMessage');
    if (msg) msg.textContent = 'Hapus ' + ids.length + ' link terpilih?';
    state.set('bulkIds', ids);
    C.showModal('deleteModal');
  };

  D.updateCatList = function () {
    var el = $('dashCatList');
    if (!el) return;
    el.innerHTML = state.get('cats').map(function (c) { return '<option value="' + U.esc(c.name) + '">'; }).join('');
  };

  D.updateDrawerCatList = function () {
    var el = $('drawerCatInput');
    if (!el) return;
    var cur = el.value;
    el.innerHTML = state.get('cats').map(function (c) {
      return '<option value="' + U.esc(c.name) + '">' + U.esc(c.name) + '</option>';
    }).join('');
    el.value = cur;
  };

  function rowVals(row) {
    return {
      title: row.querySelector('[data-f="title"]').value,
      url: row.querySelector('[data-f="url"]').value,
      cat: row.querySelector('[data-f="cat"]').value
    };
  }

  function rowChange(row) {
    var id = row.dataset.id;
    var links = state.get('links');
    var link = links.find(function (l) { return l.id === id; });
    if (!link || !link._orig) return;
    var v = rowVals(row);
    var changed = v.title !== link._orig.title || v.url !== link._orig.url || v.cat !== link._orig.cat;
    row.querySelector('[data-a="save"]').style.display = changed ? '' : 'none';
  }

  function saveClick(id) {
    var row = $('dashboardTable').querySelector('[data-id="' + id + '"]');
    if (!row) return;
    var v = rowVals(row);
    try { new URL(v.url); } catch (e) { C.toast('URL tidak valid', 'error'); return; }
    var btn = row.querySelector('[data-a="save"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>';
    db.saveRow(id, { title: v.title, url: v.url, categoryId: v.cat }).then(function (r) {
      if (r.success) {
        var links = state.get('links');
        var link = links.find(function (l) { return l.id === id; });
        if (link) {
          link.title = v.title;
          link.url = v.url;
          var cid = catId(v.cat);
          if (cid) link.categoryId = cid;
          link.updated = 0;
          link._orig = { title: v.title, url: v.url, cat: v.cat };
        }
        btn.disabled = false;
        btn.textContent = '💾';
        btn.style.display = 'none';
        var ts = row.querySelector('.dash-time span');
        if (ts) ts.textContent = 'Hari ini';
        C.toast('Link berhasil disimpan', 'success');
      } else {
        btn.disabled = false;
        btn.textContent = '💾';
        C.toast('Gagal menyimpan link', 'error');
      }
    });
  }

  function delClick(id) {
    var links = state.get('links');
    var link = links.find(function (l) { return l.id === id; });
    if (!link) return;
    state.set('delId', id);
    state.set('bulkIds', null);
    var msg = $('deleteMessage');
    if (msg) msg.textContent = 'Hapus "' + link.title + '"?';
    C.showModal('deleteModal');
  }

  D.confirmDelete = function () {
    var bulkIds = state.get('bulkIds');
    var id = state.get('delId');
    C.hideModal('deleteModal');
    if (bulkIds && bulkIds.length) {
      D.deleteMultiple(bulkIds);
    } else if (id) {
      var links = state.get('links');
      var deletedLink = links.find(function (l) { return l.id === id; });
      db.deleteRow(id).then(function (r) {
        if (r.success) {
          db.getData(true).then(function (data) {
            state.set({ cats: data.categories, links: data.links });
            selected = {};
            updateBulkDeleteBtn();
            D.render();
            if (deletedLink) {
              C.toastUndo('"' + deletedLink.title + '" dihapus', function () {
                db.addRow({ title: deletedLink.title, url: deletedLink.url, categoryId: deletedLink.categoryId }).then(function () {
                  db.getData(true).then(function (d) {
                    state.set({ cats: d.categories, links: d.links });
                    D.render();
                    C.toast('Link dikembalikan', 'success');
                  });
                });
              });
            } else {
              C.toast('Link berhasil dihapus', 'success');
            }
          });
        } else {
          C.toast('Gagal menghapus link', 'error');
        }
      });
    }
  };

  D.deleteMultiple = function (ids) {
    db.deleteMany(ids).then(function (r) {
      if (r.success) {
        db.getData(true).then(function (data) {
          state.set({ cats: data.categories, links: data.links });
          selected = {};
          updateBulkDeleteBtn();
          D.render();
          C.toast(ids.length + ' link berhasil dihapus', 'success');
        });
      } else {
        C.toast('Gagal menghapus link', 'error');
      }
    });
  };

  /* ───── DRAWER ───── */
  D.openDrawer = function (link) {
    $('drawerTitle').textContent = link ? 'Edit Link' : 'Tambah Link';
    $('drawerTitleInput').value = link ? link.title : '';
    $('drawerUrlInput').value = link ? link.url : '';
    var defCat = link ? catName(link.categoryId) : (state.get('cats').length ? state.get('cats')[0].name : '');
    $('drawerCatInput').value = defCat;
    $('slideDrawer').dataset.editId = link ? link.id : '';
    C.showModal('slideDrawer');
    $('drawerTitleInput').focus();
  };

  D.saveDrawer = function () {
    var id = $('slideDrawer').dataset.editId;
    var title = $('drawerTitleInput').value.trim();
    var url = $('drawerUrlInput').value.trim();
    var catName2 = $('drawerCatInput').value.trim();
    if (!title || !url) { C.toast('Judul dan URL harus diisi', 'error'); return; }
    try { new URL(url); } catch (e) { C.toast('URL tidak valid. Gunakan format https://...', 'error'); return; }
    var cid = catId(catName2) || (state.get('cats').length ? state.get('cats')[0].id : '');
    var btn = $('drawerSave');
    btn.disabled = true;
    btn.textContent = '⏳';
    var promise;
    if (id) {
      promise = db.saveRow(id, { title: title, url: url, categoryId: cid });
    } else {
      promise = db.addRow({ title: title, url: url, categoryId: cid });
    }
    promise.then(function (r) {
      btn.disabled = false;
      btn.textContent = 'Simpan';
      if (r.success) {
        db.getData(true).then(function (data) {
          state.set({ cats: data.categories, links: data.links });
          D.render();
          C.hideModal('slideDrawer');
          C.toast('Link berhasil ' + (id ? 'diperbarui' : 'ditambahkan'), 'success');
        });
      } else {
        C.toast('Gagal menyimpan link', 'error');
      }
    });
  };

  D.closeDrawer = function () {
    C.hideModal('slideDrawer');
  };

  /* ───── BOTTOM SHEET ───── */
  D.openSheet = function () {
    var body = $('catSheetBody');
    if (!body) return;
    var cats = state.get('cats').filter(function (c) {
      return state.get('links').some(function (l) { return l.categoryId === c.id; });
    });
    var currentTab = state.get('tab');
    body.innerHTML = cats.map(function (c) {
      var cnt = state.get('links').filter(function (l) { return l.categoryId === c.id; }).length;
      var a = c.id === currentTab ? 'active' : '';
      return '<button class="sheet-item ' + a + '" data-id="' + c.id + '"><i data-feather="' + c.feather + '"></i><span>' + U.esc(c.name) + '</span><span class="sheet-count">' + cnt + '</span></button>';
    }).join('');
    body.querySelectorAll('.sheet-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var id = this.dataset.id;
        var el = document.getElementById('dash-group-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        D.closeSheet();
      });
    });
    if (typeof feather !== 'undefined') feather.replace();
    C.showModal('catSheet');
  };

  D.closeSheet = function () {
    C.hideModal('catSheet');
  };

  /* ───── CATEGORY MANAGEMENT ───── */
  D.openCatModal = function () {
    D.renderCatList();
    $('catNameInput').value = '';
    C.showModal('catModal');
  };

  D.renderCatList = function () {
    var el = $('catList');
    if (!el) return;
    var cats = state.get('cats');
    el.innerHTML = cats.map(function (c) {
      return '<div class="cat-item"><span class="cat-item-name">' + U.esc(c.name) + '</span><button class="cat-item-del" data-cat-id="' + c.id + '" title="Hapus">✕</button></div>';
    }).join('');
    el.querySelectorAll('.cat-item-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        D.deleteCategory(this.dataset.catId);
      });
    });
  };

  D.addCategory = function () {
    var name = $('catNameInput').value.trim();
    if (!name) { C.toast('Nama kategori harus diisi', 'error'); return; }
    db.addCategory(name).then(function (r) {
      if (r.success) {
        db.getData(true).then(function (data) {
          state.set({ cats: data.categories, links: data.links });
          D.renderCatList();
          D.updateCatList();
          D.updateDrawerCatList();
          $('catNameInput').value = '';
          C.toast('Kategori berhasil ditambahkan', 'success');
        });
      } else {
        C.toast('Gagal menambah kategori', 'error');
      }
    });
  };

  D.deleteCategory = function (id) {
    var cats = state.get('cats');
    var cat = cats.find(function (c) { return c.id === id; });
    if (!cat) return;
    var linksInCat = state.get('links').filter(function (l) { return l.categoryId === id; });
    if (linksInCat.length > 0) {
      C.toast('Kategori tidak dapat dihapus: masih ada ' + linksInCat.length + ' link', 'error');
      return;
    }
    if (!confirm('Hapus kategori "' + cat.name + '"?')) return;
    db.deleteCategory(id).then(function (r) {
      if (r.success) {
        db.getData(true).then(function (data) {
          state.set({ cats: data.categories, links: data.links });
          D.renderCatList();
          D.updateCatList();
          D.updateDrawerCatList();
          D.render();
          C.toast('Kategori berhasil dihapus', 'success');
        });
      } else {
        C.toast('Gagal menghapus kategori', 'error');
      }
    });
  };

  /* ───── NAV ───── */
  D.renderNav = function () {
    var nav = $('dashNav');
    if (!nav) return;
    var cats = state.get('cats').filter(function (c) {
      return state.get('links').some(function (l) { return l.categoryId === c.id; });
    });
    if (!cats.length) { nav.style.display = 'none'; return; }
    nav.style.display = '';
    nav.innerHTML = '<div class="dash-nav-title">Daftar Kategori</div>' +
      cats.map(function (c) {
        var cnt = state.get('links').filter(function (l) { return l.categoryId === c.id; }).length;
        return '<a href="#" class="dash-nav-item" data-target="dash-group-' + c.id + '"><i data-feather="' + c.feather + '"></i><span>' + U.esc(c.name) + '</span><span class="dash-nav-count">' + cnt + '</span></a>';
      }).join('');
    nav.querySelectorAll('.dash-nav-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var el = document.getElementById(this.dataset.target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    if (typeof feather !== 'undefined') feather.replace();
    D.setupNavObserver();
  };

  D.setupNavObserver = function () {
    var nav = $('dashNav');
    if (!nav) return;
    var items = nav.querySelectorAll('.dash-nav-item');
    if (!items.length) return;
    var groups = document.querySelectorAll('.dash-group');
    if (!groups.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id.replace('dash-group-', '');
          items.forEach(function (item) {
            item.classList.toggle('active', item.dataset.target === 'dash-group-' + id);
          });
        }
      });
    }, { rootMargin: '-70px 0px -65% 0px' });
    groups.forEach(function (g) { observer.observe(g); });
  };

  D.renderCount = function () {
    var el = $('dashCount');
    if (el) el.textContent = state.get('links').length + ' link';
  };

  D.addRow = function () {
    D.openDrawer(null);
  };

  /* ───── CSV ───── */
  D.exportCsv = function () {
    var links = state.get('links');
    var cats = state.get('cats');
    if (!links.length) { C.toast('Tidak ada link untuk di-export', 'error'); return; }
    var rows = [['id', 'title', 'url', 'category', 'updated', 'badge', 'sort']];
    links.forEach(function (l) {
      var cn = catName(l.categoryId);
      rows.push([l.id, l.title, l.url, cn, l.updated, l.badge || '', typeof l.sort === 'number' ? l.sort : '']);
    });
    var csv = rows.map(function (r) {
      return r.map(function (v) {
        var s = String(v);
        if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'latch-links-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    C.toast('Export berhasil: ' + links.length + ' link', 'success');
  };

  D.importCsv = function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var text = e.target.result;
        var lines = text.split('\n').filter(function (l) { return l.trim(); });
        if (lines.length < 2) { C.toast('File CSV kosong atau tidak valid', 'error'); return; }
        var header = lines[0].split(',').map(function (h) { return h.trim().toLowerCase(); });
        var titleIdx = header.indexOf('title');
        var urlIdx = header.indexOf('url');
        var catIdx = header.indexOf('category');
        if (titleIdx === -1 || urlIdx === -1) { C.toast('CSV harus memiliki kolom "title" dan "url"', 'error'); return; }
        var cats = state.get('cats');
        var added = 0;
        var chain = Promise.resolve();
        for (var i = 1; i < lines.length; i++) {
          (function (rowStr) {
            var vals = rowStr.split(',').map(function (v) { return v.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'); });
            var title = vals[titleIdx] || '';
            var url = vals[urlIdx] || '';
            var catName2 = catIdx !== -1 ? (vals[catIdx] || '') : '';
            if (!title || !url) return;
            var cid = catId(catName2) || (cats.length ? cats[0].id : '');
            chain = chain.then(function () {
              return db.addRow({ title: title, url: url, categoryId: cid });
            }).then(function (r) {
              if (r.success) added++;
            });
          })(lines[i]);
        }
        chain.then(function () {
          db.getData(true).then(function (data) {
            state.set({ cats: data.categories, links: data.links });
            D.render();
            C.toast('Import selesai: ' + added + ' link ditambahkan', 'success');
          });
        });
      };
      reader.readAsText(file);
    });
    input.click();
  };

  D.init = function () {
    D.render();
    D.startDashClock();
    D.bindEvents();
  };

  D.startDashClock = function () {
    var el = $('dashClock');
    if (!el || el.dataset.clockStarted) return;
    el.dataset.clockStarted = '1';
    function update() {
      var d = new Date();
      var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      var dayName = days[d.getDay()];
      var date = d.getDate();
      var month = months[d.getMonth()];
      var year = d.getFullYear();
      var h = String(d.getHours()).padStart(2, '0');
      var m = String(d.getMinutes()).padStart(2, '0');
      el.textContent = dayName + ', ' + date + ' ' + month + ' ' + year + ' · ' + h + ':' + m;
    }
    update();
    setInterval(update, 30000);
  };

  D.bindEvents = function () {
    var closeDrawer = function (e) { if (e.target === $('slideDrawer')) D.closeDrawer(); };

    if ($('slideDrawer')) {
      $('slideDrawer').addEventListener('click', closeDrawer);
    }
    if ($('drawerClose')) {
      $('drawerClose').addEventListener('click', D.closeDrawer);
    }
    if ($('drawerSave')) {
      $('drawerSave').addEventListener('click', D.saveDrawer);
    }
    if ($('drawerCancel')) {
      $('drawerCancel').addEventListener('click', D.closeDrawer);
    }
    if ($('bulkDeleteBtn')) {
      $('bulkDeleteBtn').addEventListener('click', D.bulkDelete);
    }
    if ($('dashSearchInput')) {
      var debouncedSearch = U.debounce(function () {
        D.renderTable();
        D.renderNav();
        D.renderCount();
      }, 300);
      $('dashSearchInput').addEventListener('input', debouncedSearch);
    }
    if ($('catManageBtn')) {
      $('catManageBtn').addEventListener('click', D.openCatModal);
    }
    if ($('catAddBtn')) {
      $('catAddBtn').addEventListener('click', D.addCategory);
    }
    if ($('catNameInput')) {
      $('catNameInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') D.addCategory();
      });
    }
    if ($('catClose')) {
      $('catClose').addEventListener('click', function () { C.hideModal('catModal'); });
    }
    if ($('catModal')) {
      $('catModal').addEventListener('click', function (e) { if (e.target === this) C.hideModal('catModal'); });
    }
    if ($('shortcutModal')) {
      $('shortcutModal').addEventListener('click', function (e) { if (e.target === this) C.hideModal('shortcutModal'); });
    }
    if ($('shortcutClose')) {
      $('shortcutClose').addEventListener('click', function () { C.hideModal('shortcutModal'); });
    }
    if ($('dashNavToggle')) {
      $('dashNavToggle').addEventListener('click', D.openSheet);
    }
    if ($('catSheet')) {
      $('catSheet').addEventListener('click', function (e) { if (e.target === this) D.closeSheet(); });
    }
    if ($('exportCsvBtn')) {
      $('exportCsvBtn').addEventListener('click', D.exportCsv);
    }
    if ($('importCsvBtn')) {
      $('importCsvBtn').addEventListener('click', D.importCsv);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        C.showModal('shortcutModal');
      }
    });
  };

  window.LATCH = window.LATCH || {};
  window.LATCH.dashboard = D;
})();
