/* ==========================================================================
   gallery.js — galería reutilizable (catálogo y selector de la calculadora)
   y ficha completa de un alimento.
   ========================================================================== */
(function () {
  'use strict';

  var SECCIONES = [
    { k: 'macro',  label: 'Energía y macronutrientes', open: true },
    { k: 'grasas', label: 'Ácidos grasos' },
    { k: 'vit',    label: 'Vitaminas' },
    { k: 'min',    label: 'Minerales' },
    { k: 'fito',   label: 'Fitoesteroles y otros compuestos' }
  ];

  var PAGE = 120;

  /* --------------------------------------------------------------- galería */

  /**
   * @param {HTMLElement} host
   * @param {{
   *   selectable?:boolean, selected?:Set<string>, onToggle?:function,
   *   onOpen?:function, card?:number, showDbSwitch?:boolean
   * }} opts
   */
  function create(host, opts) {
    opts = opts || {};
    var allCats = [];
    var state = {
      q: '',
      cats: {},
      limit: PAGE,
      card: opts.card || (window.Store ? Store.prefs.card : 132) || 132
    };

    function resetCats() {
      allCats = DBX.categorias().slice();
      state.cats = {};
      allCats.forEach(function (c) { state.cats[c] = true; });
      state.limit = PAGE;
    }
    resetCats();

    host.innerHTML =
      '<div class="gallery-db-bar">' +
        (opts.showDbSwitch === false ? '' : DBX.switchHtml()) +
        '<span class="db-count" id="gl-count"></span>' +
      '</div>' +
      '<div class="toolbar">' +
        '<div class="search">' + U.icon('search', 16) +
          '<input class="input" type="search" placeholder="Buscar alimento, categoría o ID…" ' +
          'aria-label="Buscar alimento">' +
        '</div>' +
        '<div class="zoom">' +
          '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
          'stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/>' +
          '<rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" ' +
          'height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>' +
          '<input type="range" min="96" max="200" step="2" value="' + state.card + '" ' +
          'aria-label="Tamaño de la cuadrícula">' +
        '</div>' +
      '</div>' +
      '<div class="chips"></div>' +
      '<div class="grid"></div>' +
      '<div class="grid-more"></div>' +
      '<div class="empty hidden"></div>';

    var searchEl = host.querySelector('input[type="search"]');
    var rangeEl = host.querySelector('input[type="range"]');
    var chipsEl = host.querySelector('.chips');
    var gridEl = host.querySelector('.grid');
    var moreEl = host.querySelector('.grid-more');
    var emptyEl = host.querySelector('.empty');
    var countEl = host.querySelector('#gl-count');

    function applyCard() {
      host.style.setProperty('--card', state.card + 'px');
      gridEl.style.setProperty('--card', state.card + 'px');
    }

    function counts() {
      var c = {};
      DBX.foods().forEach(function (a) { c[a.categoria] = (c[a.categoria] || 0) + 1; });
      return c;
    }

    function renderChips() {
      var CT = counts();
      var total = DBX.foods().length;
      var allOn = allCats.every(function (c) { return state.cats[c]; });
      var html = '<button class="chip chip-all' + (allOn ? ' is-on' : '') +
        '" data-cat="__all">Todos <span class="n">' + total + '</span></button>';
      allCats.forEach(function (c) {
        html += '<button class="chip' + (state.cats[c] ? ' is-on' : '') + '" data-cat="' +
          U.esc(c) + '">' + U.esc(c) + ' <span class="n">' + (CT[c] || 0) + '</span></button>';
      });
      chipsEl.innerHTML = html;
      if (countEl) {
        countEl.textContent = DBX.mode() === 'extended'
          ? 'Base ampliada · ' + U.n(total, 0) + ' alimentos'
          : 'Base principal · ' + U.n(total, 0) + ' alimentos';
      }
    }

    function filtered() {
      var q = U.norm(state.q);
      return DBX.foods().filter(function (a) {
        if (!state.cats[a.categoria]) return false;
        if (!q) return true;
        return U.norm(a.nombre).indexOf(q) >= 0 ||
          U.norm(a.nombre_en || '').indexOf(q) >= 0 ||
          U.norm(a.categoria).indexOf(q) >= 0 ||
          U.norm(a.id).indexOf(q) >= 0;
      });
    }

    function renderGrid() {
      var list = filtered();
      var sel = opts.selected || null;
      var selEmpty = !opts.selectable;

      if (!list.length) {
        gridEl.innerHTML = '';
        moreEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        if (!allCats.some(function (c) { return state.cats[c]; })) {
          emptyEl.innerHTML = U.icon('grid', 42) +
            '<b>Ninguna categoría seleccionada</b>' +
            '<p>Elige una o varias categorías en los filtros de arriba, o vuelve a activar “Todos”.</p>' +
            '<button class="btn btn-sm" data-act="all">Mostrar todos</button>';
        } else {
          emptyEl.innerHTML = U.icon('search', 42) +
            '<b>Sin resultados</b>' +
            '<p>No hay alimentos que coincidan con “' + U.esc(state.q) + '”.</p>' +
            '<button class="btn btn-sm" data-act="clear">Limpiar búsqueda</button>';
        }
        return;
      }
      emptyEl.classList.add('hidden');

      var shown = list.slice(0, state.limit);
      var html = '';
      for (var i = 0; i < shown.length; i++) {
        var a = shown[i];
        var on = !selEmpty && sel && sel.has(a.id);
        html += '<button class="food-card' + (on ? ' is-selected' : '') +
          '" data-id="' + U.esc(a.id) + '" title="' + U.esc(a.nombre) + '">' +
          (opts.selectable ? '<span class="tick">' + U.icon('check', 12) + '</span>' : '') +
          '<img src="' + U.esc(a.icono) + '" alt="" loading="lazy" draggable="false">' +
          '<span class="fc-name">' + U.esc(a.nombre) + '</span>' +
          '<span class="fc-cat">' + U.esc(a.categoria) + '</span>' +
          '</button>';
      }
      gridEl.innerHTML = html;

      if (list.length > shown.length) {
        moreEl.innerHTML = '<button class="btn btn-sm btn-outline" data-act="more">' +
          'Mostrar más <span class="n">' + U.n(list.length - shown.length, 0) + ' restantes</span></button>' +
          '<span class="note">Mostrando ' + U.n(shown.length, 0) + ' de ' + U.n(list.length, 0) + '</span>';
      } else {
        moreEl.innerHTML = '<span class="note">' + U.n(list.length, 0) +
          ' alimento' + (list.length === 1 ? '' : 's') + '</span>';
      }
    }

    function refresh() {
      renderChips();
      renderGrid();
    }

    /* ---------------------------------------------------------- eventos */

    searchEl.addEventListener('input', U.debounce(function () {
      state.q = searchEl.value;
      state.limit = PAGE;
      renderGrid();
    }, 120));

    rangeEl.addEventListener('input', function () {
      state.card = +rangeEl.value;
      applyCard();
      if (window.Store) Store.setPref('card', state.card);
    });

    chipsEl.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var cat = chip.getAttribute('data-cat');
      if (cat === '__all') {
        var allOn = allCats.every(function (c) { return state.cats[c]; });
        allCats.forEach(function (c) { state.cats[c] = !allOn; });
      } else {
        state.cats[cat] = !state.cats[cat];
      }
      state.limit = PAGE;
      refresh();
    });

    gridEl.addEventListener('click', function (e) {
      var card = e.target.closest('.food-card');
      if (!card) return;
      var food = DBX.byId(card.getAttribute('data-id'));
      if (!food) return;
      if (opts.selectable) {
        if (opts.onToggle) opts.onToggle(food, card);
      } else if (opts.onOpen) {
        opts.onOpen(food);
      } else {
        detail(food);
      }
    });

    moreEl.addEventListener('click', function (e) {
      if (!e.target.closest('[data-act="more"]')) return;
      state.limit += PAGE;
      renderGrid();
    });

    emptyEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'all') {
        allCats.forEach(function (c) { state.cats[c] = true; });
        refresh();
      } else {
        searchEl.value = '';
        state.q = '';
        state.limit = PAGE;
        renderGrid();
      }
    });

    DBX.bindSwitch(host);

    var unsub = DBX.subscribe(function () {
      if (!document.body.contains(host)) { unsub(); return; }
      resetCats();
      DBX.bindSwitch(host);
      refresh();
    });

    applyCard();
    refresh();

    return {
      refresh: refresh,
      setSelected: function (set) { opts.selected = set; renderGrid(); },
      focusSearch: function () { searchEl.focus(); },
      element: host
    };
  }

  /* ---------------------------------------------------------- ficha modal */

  function val(food, col) {
    var v = col.tipo === 'texto' ? food[col.k] : food.nutrientes[col.k];
    if (v == null || v === '') {
      return '<span class="v null" title="La fuente no reporta este dato">—</span>';
    }
    if (col.tipo === 'texto') return '<span class="v">' + U.esc(v) + '</span>';
    return '<span class="v">' + U.fixed(v, col.dec) +
      (col.unidad ? ' <small>' + U.esc(col.unidad) + '</small>' : '') + '</span>';
  }

  function kvRows(cols, food) {
    return '<div class="kv-grid">' + cols.map(function (c) {
      return '<div class="kv"><span class="k" title="' + U.esc(c.desc) + '">' +
        U.esc(c.label) + '</span>' + val(food, c) + '</div>';
    }).join('') + '</div>';
  }

  function detail(food, opts) {
    opts = opts || {};
    var bySec = {};
    DBX.cols().forEach(function (c) {
      (bySec[c.sec] = bySec[c.sec] || []).push(c);
    });

    var identKeys = { porcion: 1, unidad: 1, equiv: 1, fuente: 1, notas: 1 };
    var ident = (bySec.ident || []).filter(function (c) { return identKeys[c.k]; });

    var html =
      '<div class="food-hero">' +
        '<img src="' + U.esc(food.icono) + '" alt="">' +
        '<div>' +
          '<h2>' + U.esc(food.nombre) + '</h2>' +
          (food.nombre_en && food.nombre_en !== food.nombre
            ? '<p class="hero-en">' + U.esc(food.nombre_en) + '</p>' : '') +
          '<div class="hero-tags">' +
            '<span class="badge">' + U.esc(food.id) + '</span>' +
            '<span class="badge blue">' + U.esc(food.categoria) + '</span>' +
            '<span class="badge">' + U.esc(food.grupo) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="note mb-8">Valores por <b>' + U.n('' + food.porcion, 0) + '</b> ' +
        U.esc(food.unidad || 'g') + '. Una celda vacía significa que la fuente no lo reporta, ' +
        'no que valga cero.</p>' +
      '<div class="kv-grid">' +
        '<div class="kv"><span class="k">Nombre en inglés (USDA)</span><span class="v" style="white-space:normal;text-align:right">' +
          U.esc(food.nombre_en || '—') + '</span></div>' +
        '<div class="kv"><span class="k">Equivalencia casera</span><span class="v">' +
          U.esc(food.equiv || '—') + '</span></div>' +
        '<div class="kv"><span class="k">Fuente</span><span class="v" style="white-space:normal;text-align:right">' +
          U.esc(food.fuente || '—') + '</span></div>' +
      '</div>' +
      (food.notas ? '<p class="prose">' + U.esc(food.notas) + '</p>' : '');

    SECCIONES.forEach(function (s) {
      var cols = (bySec[s.k] || []).filter(function (c) { return c.tipo === 'num'; });
      if (!cols.length) return;
      var hay = cols.filter(function (c) { return food.nutrientes[c.k] != null; }).length;
      html += '<details class="section"' + (s.open ? ' open' : '') + '>' +
        '<summary>' + U.esc(s.label) +
        '<span class="s-count">' + hay + ' de ' + cols.length + ' con dato</span></summary>' +
        kvRows(cols, food) + '</details>';
    });

    var textos = (bySec.texto || []);
    textos.forEach(function (c) {
      var t = food.texto && food.texto[c.k];
      if (!t) return;
      html += '<div class="section"><div class="card-title" style="margin:14px 0 6px">' +
        '<h2>' + U.esc(c.label) + '</h2></div>' +
        '<p class="prose">' + U.esc(t) + '</p></div>';
    });

    var m = U.modal({
      title: 'Ficha del alimento',
      subtitle: 'Todos los datos disponibles en la base',
      body: html,
      footer: [
        { label: 'Cerrar', onClick: function (h) { h.close(); } },
        {
          label: 'Usar en calculadora',
          kind: 'btn-acc',
          icon: 'utensils',
          onClick: function (h) {
            h.close();
            if (opts.onUse) opts.onUse(food);
            else if (window.Meal) { Meal.addFood(food.id); }
          }
        }
      ]
    });
    return m;
  }

  window.Gallery = {
    create: create,
    detail: detail,
    byId: function (id) {
      var f = DBX.byId(id);
      if (f) return f;
      /* Los reportes guardados con alimentos extendidos siguen abriendo aunque
         la base activa sea la principal. */
      if (window.DB_EXT) {
        for (var i = 0; i < DB_EXT.alimentos.length; i++) {
          if (DB_EXT.alimentos[i].id === id) return DB_EXT.alimentos[i];
        }
      }
      return null;
    }
  };
})();
