/* ==========================================================================
   table.js — vista tabular del catálogo: orden, columnas y tamaño.
   ========================================================================== */
(function () {
  'use strict';

  var PAGE_SIZES = [25, 50, 100, 200];
  var DEFAULT_W = 124;

  function create(host) {
    var cols = DBX.cols().slice();
    var state = {
      q: '',
      sortKey: 'nombre',
      sortDir: 'asc',
      page: 0,
      pageSize: 50,
      order: cols.map(function (c) { return c.k; }),
      hidden: {},
      widths: {},
      font: 12.5
    };
    var colBy = {};
    cols.forEach(function (c) { colBy[c.k] = c; });

    host.innerHTML =
      '<div class="table-db-bar">' + DBX.switchHtml() +
        '<span class="db-count" id="tb-count"></span></div>' +
      '<div class="table-toolbar">' +
        '<div class="search">' + U.icon('search', 16) +
          '<input class="input" type="search" id="tb-search" placeholder="Buscar alimento, categoría o ID…" aria-label="Buscar en la tabla">' +
        '</div>' +
        '<div class="table-tools">' +
          '<label class="table-sort"><span>Ordenar</span>' +
            '<select class="select" id="tb-sort">' +
              cols.map(function (c) {
                return '<option value="' + U.esc(c.k) + '">' + U.esc(c.label) + '</option>';
              }).join('') +
            '</select></label>' +
          '<button class="btn btn-sm" id="tb-dir" title="Cambiar dirección de orden">A-Z ↑</button>' +
          '<details class="col-menu" id="tb-colmenu">' +
            '<summary class="btn btn-sm">' + U.icon('grid', 15) + '<span>Columnas</span></summary>' +
            '<div class="col-menu-body">' +
              '<div class="col-menu-actions">' +
                '<button class="btn btn-xs btn-ghost" data-cols="all">Mostrar todas</button>' +
                '<button class="btn btn-xs btn-ghost" data-cols="reset">Restablecer orden</button>' +
              '</div>' +
              '<div class="col-menu-list">' +
                cols.map(function (c) {
                  return '<label class="col-check"><input type="checkbox" data-col="' + U.esc(c.k) + '" checked> ' +
                    '<span>' + U.esc(c.label) + '</span></label>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</details>' +
          '<div class="table-font" role="group" aria-label="Tamaño de letra">' +
            '<button class="btn btn-xs" id="tb-fminus" title="Letra más pequeña">A−</button>' +
            '<span id="tb-fval">12.5</span>' +
            '<button class="btn btn-xs" id="tb-fplus" title="Letra más grande">A+</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="table-scroll" id="tb-scroll">' +
        '<table class="data-table" id="tb-table"><colgroup></colgroup><thead></thead><tbody></tbody></table>' +
      '</div>' +
      '<div class="table-foot">' +
        '<span class="note" id="tb-info"></span>' +
        '<span class="spacer"></span>' +
        '<label class="table-page-size"><span>Filas</span>' +
          '<select class="select" id="tb-psize">' +
            PAGE_SIZES.map(function (n) { return '<option value="' + n + '"' + (n === state.pageSize ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
          '</select></label>' +
        '<button class="btn btn-sm" id="tb-prev">Anterior</button>' +
        '<span class="table-page" id="tb-page">1 / 1</span>' +
        '<button class="btn btn-sm" id="tb-next">Siguiente</button>' +
      '</div>';

    var searchEl = host.querySelector('#tb-search');
    var sortEl = host.querySelector('#tb-sort');
    var dirEl = host.querySelector('#tb-dir');
    var tableEl = host.querySelector('#tb-table');
    var colgroupEl = tableEl.querySelector('colgroup');
    var theadEl = tableEl.querySelector('thead');
    var tbodyEl = tableEl.querySelector('tbody');
    var infoEl = host.querySelector('#tb-info');
    var pageEl = host.querySelector('#tb-page');
    var prevEl = host.querySelector('#tb-prev');
    var nextEl = host.querySelector('#tb-next');
    var countEl = host.querySelector('#tb-count');
    var fontVal = host.querySelector('#tb-fval');
    var scrollEl = host.querySelector('#tb-scroll');
    var colMenu = host.querySelector('#tb-colmenu');

    sortEl.value = state.sortKey;
    host.style.setProperty('--table-font', state.font + 'px');

    function visibleCols() {
      return state.order.map(function (k) { return colBy[k]; }).filter(function (c) {
        return c && !state.hidden[c.k];
      });
    }

    function compare(a, b, col) {
      var va, vb;
      if (col.tipo === 'texto') {
        va = a[col.k] == null ? '' : String(a[col.k]);
        vb = b[col.k] == null ? '' : String(b[col.k]);
        return U.norm(va).localeCompare(U.norm(vb));
      }
      va = a.nutrientes[col.k];
      vb = b.nutrientes[col.k];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return va - vb;
    }

    function filtered() {
      var q = U.norm(state.q);
      var list = DBX.foods().filter(function (a) {
        if (!q) return true;
        return U.norm(a.nombre).indexOf(q) >= 0 ||
          U.norm(a.nombre_en || '').indexOf(q) >= 0 ||
          U.norm(a.categoria).indexOf(q) >= 0 ||
          U.norm(a.id).indexOf(q) >= 0;
      });
      var col = colBy[state.sortKey] || colBy.nombre;
      var dir = state.sortDir === 'asc' ? 1 : -1;
      list.sort(function (a, b) {
        var r = compare(a, b, col);
        if (r === 0) r = U.norm(a.nombre).localeCompare(U.norm(b.nombre));
        return r * dir;
      });
      return list;
    }

    function cell(food, col) {
      var v = col.tipo === 'texto' ? food[col.k] : food.nutrientes[col.k];
      if (v == null || v === '') return '<span class="t-null">—</span>';
      if (col.tipo === 'texto') return U.esc(v);
      return U.fixed(v, col.dec);
    }

    function renderHead() {
      var vis = visibleCols();
      colgroupEl.innerHTML = vis.map(function (c) {
        return '<col style="width:' + (state.widths[c.k] || DEFAULT_W) + 'px">';
      }).join('');
      theadEl.innerHTML = '<tr>' + vis.map(function (c) {
        var arrow = state.sortKey === c.k ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : '';
        return '<th draggable="true" data-k="' + U.esc(c.k) + '" title="' + U.esc(c.desc) + '">' +
          '<span class="th-label">' + U.esc(c.label) + (c.unidad ? ' <small>(' + U.esc(c.unidad) + ')</small>' : '') +
          arrow + '</span><span class="th-resize" data-resize="' + U.esc(c.k) + '" title="Arrastra para cambiar el ancho"></span></th>';
      }).join('') + '</tr>';
    }

    function renderBody(list) {
      var vis = visibleCols();
      var pages = Math.max(1, Math.ceil(list.length / state.pageSize));
      if (state.page >= pages) state.page = pages - 1;
      if (state.page < 0) state.page = 0;
      var start = state.page * state.pageSize;
      var pageList = list.slice(start, start + state.pageSize);
      tbodyEl.innerHTML = pageList.map(function (a) {
        return '<tr data-id="' + U.esc(a.id) + '">' + vis.map(function (c) {
          var cls = c.k === 'nombre' ? ' class="td-name" title="Abrir ficha"' : '';
          return '<td' + cls + '>' + cell(a, c) + '</td>';
        }).join('') + '</tr>';
      }).join('');

      var from = list.length ? start + 1 : 0;
      var to = Math.min(list.length, start + state.pageSize);
      infoEl.textContent = list.length
        ? 'Mostrando ' + U.n(from, 0) + '–' + U.n(to, 0) + ' de ' + U.n(list.length, 0) + ' alimentos'
        : 'Sin resultados';
      pageEl.textContent = (state.page + 1) + ' / ' + pages;
      prevEl.disabled = state.page <= 0;
      nextEl.disabled = state.page >= pages - 1;
    }

    function render() {
      renderHead();
      var list = filtered();
      renderBody(list);
      if (countEl) {
        countEl.textContent = (DBX.mode() === 'extended' ? 'Base ampliada' : 'Base principal') +
          ' · ' + U.n(DBX.foods().length, 0) + ' alimentos · ' + U.n(visibleCols().length, 0) +
          ' de ' + U.n(cols.length, 0) + ' columnas visibles';
      }
      U.$$('[data-col]', host).forEach(function (cb) {
        cb.checked = !state.hidden[cb.getAttribute('data-col')];
      });
    }

    function setSort(k) {
      if (state.sortKey === k) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = k;
        state.sortDir = 'asc';
      }
      state.page = 0;
      sortEl.value = k;
      dirEl.textContent = state.sortDir === 'asc' ? 'A-Z ↑' : 'Z-A ↓';
      render();
    }

    /* ------------------------------------------------------------ eventos */

    searchEl.addEventListener('input', U.debounce(function () {
      state.q = searchEl.value;
      state.page = 0;
      render();
    }, 120));

    sortEl.addEventListener('change', function () {
      state.sortKey = sortEl.value;
      state.page = 0;
      render();
    });

    dirEl.addEventListener('click', function () {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      dirEl.textContent = state.sortDir === 'asc' ? 'A-Z ↑' : 'Z-A ↓';
      state.page = 0;
      render();
    });

    prevEl.addEventListener('click', function () {
      if (state.page > 0) { state.page--; render(); scrollEl.scrollTop = 0; }
    });
    nextEl.addEventListener('click', function () {
      state.page++;
      render();
      scrollEl.scrollTop = 0;
    });
    host.querySelector('#tb-psize').addEventListener('change', function () {
      state.pageSize = +this.value;
      state.page = 0;
      render();
    });

    host.querySelector('#tb-fminus').addEventListener('click', function () {
      state.font = Math.max(9, state.font - 0.5);
      host.style.setProperty('--table-font', state.font + 'px');
      fontVal.textContent = state.font;
    });
    host.querySelector('#tb-fplus').addEventListener('click', function () {
      state.font = Math.min(20, state.font + 0.5);
      host.style.setProperty('--table-font', state.font + 'px');
      fontVal.textContent = state.font;
    });

    host.querySelector('.col-menu-actions').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cols]');
      if (!b) return;
      if (b.getAttribute('data-cols') === 'all') {
        state.hidden = {};
      } else {
        state.order = cols.map(function (c) { return c.k; });
        state.widths = {};
      }
      render();
    });

    host.querySelector('.col-menu-list').addEventListener('change', function (e) {
      var cb = e.target.closest('[data-col]');
      if (!cb) return;
      var k = cb.getAttribute('data-col');
      if (cb.checked) delete state.hidden[k];
      else state.hidden[k] = true;
      render();
    });

    tableEl.addEventListener('click', function (e) {
      var name = e.target.closest('td.td-name');
      if (name) {
        var row = name.closest('tr');
        var food = row && DBX.byId(row.getAttribute('data-id'));
        if (food) Gallery.detail(food);
        return;
      }
      var th = e.target.closest('th');
      if (!th || e.target.closest('.th-resize')) return;
      if (th._dragged) { th._dragged = false; return; }
      setSort(th.getAttribute('data-k'));
    });

    /* ------------------------------------------------- arrastrar columnas */

    var dragKey = null;

    theadEl.addEventListener('dragstart', function (e) {
      var th = e.target.closest('th');
      if (!th || e.target.closest('.th-resize')) { e.preventDefault(); return; }
      dragKey = th.getAttribute('data-k');
      th._dragged = true;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragKey); } catch (err) { /* file:// */ }
      }
      th.classList.add('is-dragging');
    });

    theadEl.addEventListener('dragend', function () {
      dragKey = null;
      U.$$('th', theadEl).forEach(function (t) { t.classList.remove('is-dragging', 'is-drop'); });
    });

    theadEl.addEventListener('dragover', function (e) {
      var th = e.target.closest('th');
      if (!th || !dragKey || th.getAttribute('data-k') === dragKey) return;
      e.preventDefault();
      U.$$('th', theadEl).forEach(function (t) { t.classList.remove('is-drop'); });
      th.classList.add('is-drop');
    });

    theadEl.addEventListener('drop', function (e) {
      var th = e.target.closest('th');
      if (!th || !dragKey) return;
      e.preventDefault();
      var target = th.getAttribute('data-k');
      if (target === dragKey) return;
      var from = state.order.indexOf(dragKey);
      var to = state.order.indexOf(target);
      if (from < 0 || to < 0) return;
      state.order.splice(from, 1);
      state.order.splice(to, 0, dragKey);
      dragKey = null;
      render();
    });

    /* --------------------------------------------------- ancho de columnas */

    theadEl.addEventListener('mousedown', function (e) {
      var handle = e.target.closest('.th-resize');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();
      var k = handle.getAttribute('data-resize');
      var th = handle.closest('th');
      var startX = e.clientX;
      var startW = th.getBoundingClientRect().width;
      function move(ev) {
        var w = Math.max(58, Math.min(520, startW + ev.clientX - startX));
        state.widths[k] = Math.round(w);
        var idx = visibleCols().map(function (c) { return c.k; }).indexOf(k);
        var col = colgroupEl.children[idx];
        if (col) col.style.width = state.widths[k] + 'px';
      }
      function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.body.classList.remove('is-col-resizing');
      }
      document.body.classList.add('is-col-resizing');
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });

    DBX.bindSwitch(host);

    var unsub = DBX.subscribe(function () {
      if (!document.body.contains(host)) { unsub(); return; }
      DBX.bindSwitch(host);
      state.page = 0;
      render();
    });

    render();

    return {
      refresh: function () { render(); },
      element: host
    };
  }

  window.DBTable = { create: create };
})();
