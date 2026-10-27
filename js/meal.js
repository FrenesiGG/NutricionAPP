/* ==========================================================================
   meal.js — Calculadora de comida.
   Flujo: elegir alimentos → cantidades → añadir merienda (repetible) →
   resultados con comparación contra un reporte metabólico.
   ========================================================================== */
(function () {
  'use strict';

  var root = null;
  var els = {};
  var galleryHost = null;
  var COLBY = {};

  var S = {
    step: 1,
    sel: {},
    draft: [],
    draftName: '',
    editingId: null,
    meriendas: [],
    counter: 1,
    include: {},
    compareId: null,
    editingReportId: null
  };

  /* ------------------------------------------------------------ utilidades */

  function foodOf(id) {
    var f = window.Gallery ? Gallery.byId(id) : null;
    if (f) return f;
    /* Un alimento de la base ampliada sigue contando aunque luego se vuelva a la principal. */
    if (window.DB_EXT) {
      for (var i = 0; i < DB_EXT.alimentos.length; i++) {
        if (DB_EXT.alimentos[i].id === id) return DB_EXT.alimentos[i];
      }
    }
    return null;
  }

  function col(k) { return COLBY[k] || null; }

  function meriendaKcal(m) {
    var t = 0;
    (m.items || []).forEach(function (it) {
      var f = foodOf(it.id);
      if (f && f.nutrientes.kcal != null) t += f.nutrientes.kcal * (+it.gramos || 0) / 100;
    });
    return t;
  }

  function includedItems() {
    var items = [];
    S.meriendas.forEach(function (m) {
      if (!S.include[m.id]) return;
      (m.items || []).forEach(function (it) {
        var f = foodOf(it.id);
        if (f) items.push({ food: f, gramos: +it.gramos || 0, merienda: m.nombre });
      });
    });
    return items;
  }

  /* ---- v1.3: obtener alimentos que contribuyen a un nutriente ---- */
  function nutrientContributors(k, items) {
    var contribs = [];
    var c = col(k);
    (items || []).forEach(function (it) {
      var raw = it.food.nutrientes ? it.food.nutrientes[k] : null;
      var sinDato = (raw == null || raw === '');
      var amount = sinDato ? null : (raw * it.gramos / 100);
      contribs.push({
        nombre: it.food.nombre,
        icono: it.food.icono || null,
        gramos: it.gramos,
        unit: c ? c.unidad : null,
        amount: amount,
        sinDato: sinDato,
        merienda: it.merienda || ''
      });
    });
    /* Sort: those with data first, descending by amount */
    contribs.sort(function (a, b) {
      if (a.sinDato && !b.sinDato) return 1;
      if (!a.sinDato && b.sinDato) return -1;
      return (b.amount || 0) - (a.amount || 0);
    });
    return contribs;
  }

  function renderContributors(k, items) {
    var c = col(k);
    var dec = c ? (c.dec != null ? c.dec : 1) : 1;
    var contribs = nutrientContributors(k, items);
    if (!contribs.length) {
      return '<div class="nc-empty">Sin alimentos incluidos</div>';
    }
    /* total for percentage calculation (sum of those with data) */
    var total = 0;
    contribs.forEach(function (ct) { if (!ct.sinDato) total += (ct.amount || 0); });

    var html = '<div class="nc-list">';
    contribs.forEach(function (ct) {
      var pct = (!ct.sinDato && total > 0) ? (ct.amount / total * 100) : 0;
      var amtStr = ct.sinDato ? '<span class="nc-nodata">sin dato reportado</span>' :
        ('<b>' + U.fixed(ct.amount, dec) + (ct.unit ? ' ' + U.esc(ct.unit) : '') + '</b>' +
         '<span class="nc-pct"> (' + U.n(pct, 0) + '% del total)</span>');
      var barW = Math.min(pct, 100).toFixed(1);
      html += '<div class="nc-row">' +
        '<div class="nc-food">' +
          (ct.icono ? '<img class="nc-img" src="' + U.esc(ct.icono) + '" alt="" loading="lazy">' :
                      '<div class="nc-img nc-img-ph"></div>') +
          '<div class="nc-info">' +
            '<span class="nc-name">' + U.esc(ct.nombre) + '</span>' +
            '<span class="nc-mer">' + U.n(ct.gramos, 0) + ' g · ' + U.esc(ct.merienda) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="nc-right">' +
          '<div class="nc-amt">' + amtStr + '</div>' +
          (!ct.sinDato ? '<div class="nc-bar-wrap"><div class="nc-bar-fill" style="width:' + barW + '%"></div></div>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function unitOf(id) {
    var f = foodOf(id);
    return f ? U.baseUnit(f) : 'g';
  }

  function stepBar() {
    var labels = ['Elegir alimentos', 'Cantidades', 'Resultados'];
    var html = '';
    labels.forEach(function (lab, i) {
      var n = i + 1;
      var cls = 'step' + (S.step === n ? ' is-on' : (S.step > n ? ' is-done' : ''));
      html += '<div class="' + cls + '"><i>' + (S.step > n ? '✓' : n) + '</i><span>' + lab + '</span></div>';
      if (n < 3) html += '<span class="step-sep"></span>';
    });
    return html;
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    els.strip.style.display = (S.meriendas.length || S.step === 2) ? '' : 'none';
    renderStrip();
    els.stepbar.innerHTML = stepBar();

    if (S.step === 1) renderSelect();
    else if (S.step === 2) renderAmounts();
    else renderResult();

    els.state.textContent = S.editingReportId ? 'Editando' : 'Nuevo';
    els.state.className = 'badge' + (S.editingReportId ? ' amber' : '');
    els.newBtn.style.display = (S.meriendas.length || S.editingReportId) ? '' : 'none';
  }

  function renderStrip() {
    var html = '';
    S.meriendas.forEach(function (m) {
      html += '<div class="m-card-wrap">' +
        '<button class="m-card' + (S.editingId === m.id ? ' is-editing' : '') +
        '" data-mid="' + m.id + '" title="Editar ' + U.esc(m.nombre) + '">' +
        '<span class="m-name">' + U.esc(m.nombre) + '</span>' +
        '<span class="m-kcal">' + U.n(meriendaKcal(m), 0) + ' kcal</span>' +
        '</button>' +
        '<button class="icon-btn" data-copy="' + m.id + '" title="Copiar merienda" aria-label="Copiar ' +
        U.esc(m.nombre) + '">' + U.icon('copy', 14) + '</button>' +
        '<button class="icon-btn danger" data-del="' + m.id + '" title="Eliminar" aria-label="Eliminar ' +
        U.esc(m.nombre) + '">' + U.icon('x', 12) + '</button></div>';
    });
    if (S.step !== 3) {
      html += '<button class="m-add" data-act="new">' + U.icon('plus', 15) + ' Nueva merienda</button>';
    }
    els.strip.innerHTML = html;
  }

  /* ------------------------------------------------------------- paso 1 */

  function renderSelect() {
    els.body.innerHTML =
      '<p class="note mb-8">Marca los alimentos que vas a comer y pulsa <b>Siguiente</b>.</p>' +
      '<div id="ml-gallery"></div>';
    galleryHost = U.$('#ml-gallery', els.body);

    var selSet = new Set(Object.keys(S.sel).filter(function (k) { return S.sel[k]; }));

    Gallery.create(galleryHost, {
      selectable: true,
      selected: selSet,
      onToggle: function (food, card) {
        if (S.sel[food.id]) delete S.sel[food.id];
        else S.sel[food.id] = true;
        card.classList.toggle('is-selected', !!S.sel[food.id]);
        updateSelectBar();
      }
    });

    els.bar.innerHTML =
      '<span class="count"><b id="ml-count">0</b> alimentos seleccionados</span>' +
      '<span class="spacer"></span>' +
      (S.meriendas.length
        ? '<button class="btn" id="ml-finish">' + U.icon('chart', 16) + '<span>Terminar</span></button>'
        : '') +
      '<button class="btn btn-acc" id="ml-next">Siguiente' + U.icon('arrowRight', 16) + '</button>';
    U.$('#ml-next', els.bar).addEventListener('click', goAmounts);
    if (S.meriendas.length) {
      U.$('#ml-finish', els.bar).addEventListener('click', function () {
        S.draft = [];
        S.editingId = null;
        S.step = 3;
        render();
      });
    }
    updateSelectBar();
  }

  function updateSelectBar() {
    var n = Object.keys(S.sel).filter(function (k) { return S.sel[k]; }).length;
    var c = U.$('#ml-count');
    if (c) c.textContent = n;
    var b = U.$('#ml-next');
    if (b) b.disabled = n === 0;
  }

  function goAmounts() {
    var ids = Object.keys(S.sel).filter(function (k) { return S.sel[k]; });
    if (!ids.length) { U.toast('Elige al menos un alimento', 'warn'); return; }
    S.draft = ids.map(function (id) { return { id: id, gramos: 100 }; });
    S.draftName = 'Merienda ' + S.counter;
    S.step = 2;
    render();
  }

  /* ------------------------------------------------------------- paso 2 */

  function openAddFoodsModal() {
    var draftMap = {};
    S.draft.forEach(function (it) { draftMap[it.id] = true; });
    var modalSel = new Set(Object.keys(draftMap));

    var modal = U.modal({
      title: 'Añadir alimentos a la merienda',
      subtitle: S.draftName ? ('Merienda: ' + S.draftName) : 'Selecciona alimentos adicionales para incorporar',
      size: 'lg',
      body: '<div id="ml-modal-gallery" style="min-height:360px"></div>',
      footer: [
        { label: 'Cancelar' },
        {
          label: 'Añadir a la merienda',
          kind: 'btn-acc',
          onClick: function (h) {
            var added = 0;
            modalSel.forEach(function (id) {
              if (!draftMap[id]) {
                S.draft.push({ id: id, gramos: 100 });
                S.sel[id] = true;
                added++;
              }
            });
            h.close();
            if (added > 0) {
              U.toast('Se añadieron ' + added + ' alimento' + (added === 1 ? '' : 's'));
              renderAmounts();
            } else {
              U.toast('No se seleccionaron alimentos nuevos', 'warn');
            }
          }
        }
      ]
    });

    var host = U.$('#ml-modal-gallery', modal.body);
    if (host && window.Gallery) {
      Gallery.create(host, {
        selectable: true,
        selected: modalSel,
        onToggle: function (food, card) {
          if (modalSel.has(food.id)) {
            modalSel.delete(food.id);
            card.classList.remove('is-selected');
          } else {
            modalSel.add(food.id);
            card.classList.add('is-selected');
          }
        }
      });
    }
  }

  function renderAmounts() {
    var editing = !!S.editingId;
    var rows = S.draft.map(function (it, idx) {
      var f = foodOf(it.id);
      if (!f) return '';
      var u = U.baseUnit(f);
      var kcal = f.nutrientes.kcal;
      return '<div class="amt-row" draggable="true" data-id="' + U.esc(f.id) + '" data-idx="' + idx + '">' +
        '<span class="drag-handle" title="Arrastra para reordenar">' + U.icon('grip', 16) + '</span>' +
        '<img src="' + U.esc(f.icono) + '" alt="">' +
        '<div><div class="a-name">' + U.esc(f.nombre) + '</div>' +
          '<div class="a-sub">' + U.esc(f.unidad || '') + ' · ' +
          (kcal == null ? 'sin dato' : U.n(kcal, 0) + ' kcal/100 ' + u) + '</div></div>' +
        '<div class="input-suffix"><input class="input" type="number" min="0" max="5000" ' +
          'step="1" inputmode="decimal" value="' + it.gramos + '" ' +
          'aria-label="Cantidad de ' + U.esc(f.nombre) + '"><span>' + u + '</span></div>' +
        '<div class="a-tools">' +
          '<span class="a-kcal" data-kcal="' + U.esc(f.id) + '">' +
            (kcal == null ? '—' : U.n(kcal * it.gramos / 100, 0) + ' kcal') + '</span>' +
          '<button class="icon-btn danger" data-rm="' + U.esc(f.id) + '" title="Quitar">' +
            U.icon('trash', 15) + '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    els.body.innerHTML =
      '<div class="amt-header-bar">' +
        '<div class="amt-empty-name" style="margin-bottom:0">' +
          '<label for="ml-mname">Nombre de la merienda</label>' +
          '<input id="ml-mname" class="input" maxlength="50" value="' + U.esc(S.draftName) + '">' +
          '<span class="note">' + (editing ? 'Editando una merienda existente' : 'Se guardará como una merienda más') + '</span>' +
        '</div>' +
        '<button type="button" class="btn btn-sm btn-outline" id="ml-add-more-food">' +
          U.icon('plus', 15) + '<span>Añadir alimentos a esta merienda</span>' +
        '</button>' +
      '</div>' +
      '<div class="amt-list">' + (rows || '<div class="empty"><b>Sin alimentos</b></div>') + '</div>' +
      '<p class="note mt-14">Los valores de la base están por 100 g o 100 ml. Puedes arrastrar las filas para reordenar los alimentos.</p>';

    els.bar.innerHTML =
      '<span class="count">Total de la merienda: <b id="ml-tot">0</b> kcal</span>' +
      '<span class="spacer"></span>' +
      '<button class="btn" id="ml-cancel">Cancelar</button>' +
      '<button class="btn btn-acc" id="ml-addm">' + U.icon('plus', 16) +
        '<span>' + (editing ? 'Guardar cambios' : 'Añadir merienda') + '</span></button>';

    var nameEl = U.$('#ml-mname', els.body);
    nameEl.addEventListener('input', function () { S.draftName = nameEl.value; });

    var addMoreBtn = U.$('#ml-add-more-food', els.body);
    if (addMoreBtn) addMoreBtn.addEventListener('click', openAddFoodsModal);

    var rowsEl = U.$$('.amt-row', els.body);
    var dragSrcIdx = null;

    rowsEl.forEach(function (row) {
      var id = row.getAttribute('data-id');
      var inp = U.$('input', row);
      inp.addEventListener('input', function () {
        var it = S.draft.filter(function (x) { return x.id === id; })[0];
        var f = foodOf(id);
        if (it) it.gramos = Math.max(0, +inp.value || 0);
        var span = U.$('[data-kcal]', row);
        if (span && f && f.nutrientes.kcal != null) {
          span.textContent = U.n(f.nutrientes.kcal * Math.max(0, +inp.value || 0) / 100, 0) + ' kcal';
        }
        updateDraftTotal();
      });
      inp.addEventListener('focus', function () { inp.select(); });
      inp.addEventListener('mousedown', function (e) { e.stopPropagation(); });

      /* Drag & Drop */
      row.addEventListener('dragstart', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
          e.preventDefault();
          return;
        }
        dragSrcIdx = parseInt(row.getAttribute('data-idx'), 10);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragSrcIdx));
        row.classList.add('is-dragging');
      });

      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var rect = row.getBoundingClientRect();
        var relY = e.clientY - rect.top;
        if (relY < rect.height / 2) {
          row.classList.add('drop-above');
          row.classList.remove('drop-below');
        } else {
          row.classList.add('drop-below');
          row.classList.remove('drop-above');
        }
      });

      row.addEventListener('dragleave', function () {
        row.classList.remove('drop-above', 'drop-below');
      });

      row.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove('drop-above', 'drop-below');
        var targetIdx = parseInt(row.getAttribute('data-idx'), 10);
        var rect = row.getBoundingClientRect();
        var relY = e.clientY - rect.top;
        if (relY >= rect.height / 2 && targetIdx < S.draft.length - 1) {
          targetIdx++;
        }
        if (dragSrcIdx != null && dragSrcIdx !== targetIdx) {
          var item = S.draft.splice(dragSrcIdx, 1)[0];
          if (dragSrcIdx < targetIdx) targetIdx--;
          S.draft.splice(targetIdx, 0, item);
          renderAmounts();
        }
      });

      row.addEventListener('dragend', function () {
        dragSrcIdx = null;
        rowsEl.forEach(function (r) {
          r.classList.remove('is-dragging', 'drop-above', 'drop-below');
        });
      });
    });

    els.body.onclick = function (e) {
      var rm = e.target.closest('[data-rm]');
      if (!rm) return;
      var id = rm.getAttribute('data-rm');
      S.draft = S.draft.filter(function (x) { return x.id !== id; });
      delete S.sel[id];
      if (!S.draft.length) { S.step = 1; render(); return; }
      renderAmounts();
    };

    U.$('#ml-cancel', els.bar).addEventListener('click', function () {
      S.draft = [];
      S.editingId = null;
      S.step = 1;
      render();
    });
    U.$('#ml-addm', els.bar).addEventListener('click', commitMerienda);

    updateDraftTotal();
  }

  function updateDraftTotal() {
    var total = 0;
    S.draft.forEach(function (it) {
      var f = foodOf(it.id);
      if (f && f.nutrientes.kcal != null) total += f.nutrientes.kcal * (+it.gramos || 0) / 100;
    });
    var el = U.$('#ml-tot');
    if (el) el.textContent = U.n(total, 0);
  }

  function commitMerienda() {
    var valid = S.draft.filter(function (it) { return +it.gramos > 0; });
    if (!valid.length) { U.toast('Escribe cuánto vas a comer de cada alimento', 'warn'); return; }
    if (valid.length !== S.draft.length) { U.toast('Hay alimentos con 0; quítalos o ajusta la cantidad', 'warn'); return; }

    var nombre = (S.draftName || '').trim() || ('Merienda ' + S.counter);

    if (S.editingId) {
      for (var i = 0; i < S.meriendas.length; i++) {
        if (S.meriendas[i].id === S.editingId) {
          S.meriendas[i].nombre = nombre;
          S.meriendas[i].items = valid.map(function (it) { return { id: it.id, gramos: +it.gramos }; });
          break;
        }
      }
      U.toast('Merienda actualizada');
    } else {
      var m = {
        id: U.uid('mer'),
        nombre: nombre,
        items: valid.map(function (it) { return { id: it.id, gramos: +it.gramos }; })
      };
      S.meriendas.push(m);
      S.include[m.id] = true;
      S.counter++;
      U.toast('Merienda añadida');
    }

    S.draft = [];
    S.editingId = null;
    S.sel = {};
    S.step = 1;
    render();
  }

  function editMerienda(id) {
    var m = S.meriendas.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    S.draft = m.items.map(function (it) { return { id: it.id, gramos: it.gramos }; });
    S.draftName = m.nombre;
    S.editingId = id;
    S.step = 2;
    render();
  }

  function copyMerienda(id) {
    var original = S.meriendas.filter(function (m) { return m.id === id; })[0];
    if (!original) return;
    var copia = {
      id: U.uid('mer'),
      nombre: original.nombre + ' (copia)',
      items: original.items.map(function (it) { return { id: it.id, gramos: it.gramos }; })
    };
    S.meriendas.push(copia);
    S.include[copia.id] = !!S.include[id];
    S.counter += 1;
    render();
    U.toast('Merienda copiada');
  }

  function deleteMerienda(id) {
    S.meriendas = S.meriendas.filter(function (x) { return x.id !== id; });
    delete S.include[id];
    if (S.editingId === id) { S.editingId = null; S.draft = []; S.step = 1; }
    if (!S.meriendas.length && S.step === 3) S.step = 1;
    render();
    U.toast('Merienda eliminada');
  }

  /* ------------------------------------------------------------- paso 3 */

  var mealWpState = { mode: 'initial', zero: true, manualKcal: 0, manualPct: 0, scale: 'log' };

  function renderResult() {
    var items = includedItems();
    var tot = N.totals(items);
    var metab = S.compareId ? Store.getMetab(S.compareId) : null;
    var userMeta = metab || { sexo: 'F', edad: 30, peso: 70, actividad: 'moderado', objetivo: 'mantener', ganarMusculo: false, meta: 2000, tdee: 2000 };
    var refs = metab
      ? N.refsFromReport(metab)
      : N.refs(userMeta, 2000);

    var html = '';

    /* Requisito 5: Dashboard de gráficos (4 tarjetas métricas + dona de distribución y micronutrientes clave) */
    html += renderDashboard(tot, refs, userMeta, metab);

    /* Energía estimada aportada por cada macronutriente (factores generales 4/4/9). */
    var kcalProteina = (tot.v.protein || 0) * 4;
    var kcalCarbohidratos = (tot.v.carb || 0) * 4;
    var kcalGrasas = (tot.v.fat || 0) * 9;
    html += '<div class="card mb-14" style="margin-bottom:14px">' +
      '<div class="card-title"><h2>Calorías por macronutriente</h2>' +
      '<span class="hint">Estimación con factores 4/4/9 kcal por gramo</span></div>' +
      '<div class="macro-kcal-grid">' +
        '<div class="metric-card"><span class="metric-label">Proteína</span><b>' + U.n(kcalProteina, 0) + ' kcal</b><span class="note">' + U.n(tot.v.protein || 0, 1) + ' g × 4</span></div>' +
        '<div class="metric-card"><span class="metric-label">Carbohidratos</span><b>' + U.n(kcalCarbohidratos, 0) + ' kcal</b><span class="note">' + U.n(tot.v.carb || 0, 1) + ' g × 4</span></div>' +
        '<div class="metric-card"><span class="metric-label">Grasas</span><b>' + U.n(kcalGrasas, 0) + ' kcal</b><span class="note">' + U.n(tot.v.fat || 0, 1) + ' g × 9</span></div>' +
      '</div></div>';

    /* meriendas incluidas */
    html += '<div class="card mb-14" style="margin-bottom:14px">' +
      '<div class="card-title"><h2>Meriendas incluidas</h2>' +
        '<span class="hint">Desmarca una para ver cómo cambian los totales</span></div>' +
      '<div class="chips" style="border-top:0;margin-top:0;padding-top:0">';
    S.meriendas.forEach(function (m) {
      var on = !!S.include[m.id];
      html += '<button class="chip' + (on ? ' is-on' : '') + '" data-inc="' + m.id + '">' +
        (on ? U.icon('check', 12) : U.icon('minus', 12)) +
        U.esc(m.nombre) + ' <span class="n">' + U.n(meriendaKcal(m), 0) + ' kcal</span></button>';
    });
    html += '</div></div>';

    /* selector de reporte metabólico */
    html += '<div class="card mb-14" style="margin-bottom:14px">' +
      '<div class="card-title"><h2>Comparación con tu meta diaria</h2>' +
      '<span class="hint">Requiere un reporte metabólico</span></div>';

    if (!metab) {
      html += '<div class="empty" style="padding:24px 20px">' + U.icon('target', 34) +
        '<b>Sin reporte metabólico seleccionado</b>' +
        '<p>Añade uno para ver qué porcentaje de tus requerimientos cubren estas meriendas.</p>' +
        '<button class="btn btn-acc btn-sm" data-act="pickmetab">' +
          U.icon('plus', 15) + '<span>Añadir reporte metabólico para comparación</span></button>' +
        '</div>';
    } else {
      html += '<div class="compare-head">' +
        '<div class="grow"><b style="font-size:14px">' + U.esc(metab.nombre) + '</b>' +
          '<div class="note">TDEE ' + U.n(metab.tdee, 0) + ' kcal · meta ' +
          U.n(metab.meta, 0) + ' kcal · ' + N.formulaLabel(metab.formula) +
          (metab.ganarMusculo ? ' · Hipertrofia' : '') + '</div></div>' +
        '<button class="btn btn-sm" data-act="pickmetab">Cambiar</button>' +
        '<button class="btn btn-sm btn-ghost" data-act="clearmetab">Quitar</button>' +
      '</div>';
    }
    html += '</div>';

    /* v1.7: proyección de peso (método Meta calórica inicial) justo encima del desglose */
    if (metab) html += '<div class="card weight-chart-card mb-14" style="margin-bottom:14px" id="ml-weight-chart"></div>';

    /* Requisito 6: Desglose nutrimental completo sin repetir vitaminas y minerales, todas las 6 secciones en la misma burbuja */
    html += '<div class="card mb-14" style="margin-bottom:14px">' +
      '<div class="card-title"><h2>Desglose nutrimental completo</h2>' +
      '<span class="hint">' + (metab ? 'Barras calculadas contra tu meta metabólica' : 'Barras contra referencia estándar para adultos (2,000 kcal)') +
      '</span></div>' +
      (metab ? '' : '<p class="note mb-8">Usa una referencia general para adultos (2,000 kcal). Añade tu meta metabólica para personalizarla.</p>') +
      breakdown(tot, refs, userMeta, items) +
      '</div>';

    html += '<p class="note mb-8">Haz clic en cualquier nutriente para ver qué alimentos lo aportan. Pasa el cursor para ver la explicación, la fuente oficial, el <b>riesgo por déficit</b>, el <b>riesgo por exceso</b> y el límite máximo seguro (UL) cuando existe. Los totales marcados con * indican que algún alimento no reporta ese nutriente.</p>';

    els.body.innerHTML = html;
    U.bindMacroPie(els.body);
    if (metab) {
      var wh = U.$('#ml-weight-chart', els.body);
      U.weightProjection(wh, {
        person: { sexo: metab.sexo, edad: +metab.edad, peso: +metab.peso, talla: +metab.talla, grasa: metab.grasa, actividad: metab.actividad, formula: metab.formula, objetivo: metab.objetivo },
        defaultKcal: tot.v.kcal || 0,
        modes: ['initial'],
        state: mealWpState,
        title: 'Proyección de peso con las calorías de esta comida',
        hint: '1 año · eje X logarítmico',
        note: 'Meta calórica inicial = Calorías Totales de la comida (' + U.n(tot.v.kcal || 0, 0) + ' kcal/día) frente al TDEE de ' + U.esc(metab.nombre) + '.'
      });
    }

    /* Inicializar tooltips flotantes en tiempo real */
    initNutrientTooltips(els.body, tot, refs, userMeta);

    /* acciones */
    els.bar.innerHTML =
      '<button class="btn" id="ml-edit">' + U.icon('arrowLeft', 16) + '<span>Volver a editar</span></button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-acc" id="ml-save">' + U.icon('save', 16) +
        '<span>' + (S.editingReportId ? 'Guardar cambios' : 'Guardar reporte de alimentos') + '</span></button>';

    U.$('#ml-edit', els.bar).addEventListener('click', function () { S.step = 1; render(); });
    U.$('#ml-save', els.bar).addEventListener('click', saveReport);

    /* eventos del cuerpo */
    els.body.onclick = function (e) {
      var inc = e.target.closest('[data-inc]');
      if (inc) {
        var id = inc.getAttribute('data-inc');
        S.include[id] = !S.include[id];
        renderResult();
        return;
      }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'pickmetab') pickMetab();
      if (a === 'clearmetab') { S.compareId = null; renderResult(); }
    };
  }

  /* ------------------------------------------------------------- Dashboard */

  function renderDashboard(tot, refs, userMeta, metab) {
    var totKcal = tot.v.kcal || 0;
    var metaKcal = refs.kcal ? refs.kcal.v : (metab ? metab.meta : 2000);
    var pctKcal = metaKcal > 0 ? (totKcal / metaKcal) * 100 : 0;
    var remKcal = Math.round(metaKcal - totKcal);

    var totProt = tot.v.protein || 0;
    var metaProt = refs.protein ? refs.protein.v : 140;
    var pctProt = metaProt > 0 ? (totProt / metaProt) * 100 : 0;
    var pesoUser = userMeta ? (+userMeta.peso || 70) : 70;
    var gkgVal = (metaProt / pesoUser).toFixed(1);

    var totCarb = tot.v.carb || 0;
    var metaCarb = refs.carb ? refs.carb.v : 250;
    var pctCarb = metaCarb > 0 ? (totCarb / metaCarb) * 100 : 0;

    var totFiber = tot.v.fiber || 0;
    var metaFiber = refs.fiber ? refs.fiber.v : 28;

    var totFat = tot.v.fat || 0;
    var metaFat = refs.fat ? refs.fat.v : 60;
    var pctFat = metaFat > 0 ? (totFat / metaFat) * 100 : 0;

    var n3Val = tot.v.n3 || (tot.v.ala || 0) + (tot.v.epa || 0) + (tot.v.dha || 0);
    var n3Text = n3Val >= (refs.n3 ? refs.n3.v : 1.6) ? 'Omega 3 OK' : (U.fixed(n3Val, 1) + 'g Omega 3');

    // Gráfico de dona de distribución
    var donutSvg = U.macroPie((tot.v.protein || 0) * 4, (tot.v.carb || 0) * 4, (tot.v.fat || 0) * 9, tot.v.kcal || 0, 'KCAL TOTALES');

    // 3 Micronutrientes clave
    var vcVal = tot.v.vc || 0, vcRef = refs.vc ? refs.vc.v : 90;
    var mgVal = tot.v.mg || 0, mgRef = refs.mg ? refs.mg.v : 400;
    var feVal = tot.v.fe || 0, feRef = refs.fe ? refs.fe.v : 18;

    return '<div class="dash-grid mb-14">' +
      '<div class="dash-left-grid">' +
        /* 1. Calorías Totales */
        '<div class="dash-card">' +
          '<div class="dash-card-head">' +
            '<span class="dash-title">Calorías Totales</span>' +
            '<span class="dash-badge orange">' + U.icon('flame', 15) + '</span>' +
          '</div>' +
          '<div class="dash-bignum">' +
            '<b>' + U.n(totKcal, 0) + '</b><span>/ ' + U.n(metaKcal, 0) + ' kcal</span>' +
          '</div>' +
          '<div class="dash-bar-wrap">' +
            '<div class="dash-bar-track">' +
              '<div class="dash-bar-fill orange" style="width:' + Math.min(pctKcal, 100).toFixed(1) + '%"></div>' +
            '</div>' +
            '<span class="dash-pct">' + Math.round(pctKcal) + '%</span>' +
          '</div>' +
          '<div class="dash-sub">' +
            (remKcal >= 0 ? ('Quedan: <b>' + U.n(remKcal, 0) + ' kcal</b>') : ('Exceso: <b>' + U.n(-remKcal, 0) + ' kcal</b>')) +
          '</div>' +
        '</div>' +

        /* 2. Proteínas */
        '<div class="dash-card">' +
          '<div class="dash-card-head">' +
            '<span class="dash-title">Proteínas</span>' +
            '<span class="dash-badge pink">' + U.icon('dumbbell', 15) + '</span>' +
          '</div>' +
          '<div class="dash-bignum">' +
            '<b>' + U.n(totProt, 0) + 'g</b><span>/ ' + U.n(metaProt, 0) + 'g</span>' +
          '</div>' +
          '<div class="dash-bar-wrap">' +
            '<div class="dash-bar-track">' +
              '<div class="dash-bar-fill pink" style="width:' + Math.min(pctProt, 100).toFixed(1) + '%"></div>' +
            '</div>' +
            '<span class="dash-pct">' + Math.round(pctProt) + '%</span>' +
          '</div>' +
          '<div class="dash-sub">' +
            'Meta: <b>' + gkgVal + 'g / kg</b>' +
          '</div>' +
        '</div>' +

        /* 3. Carbohidratos */
        '<div class="dash-card">' +
          '<div class="dash-card-head">' +
            '<span class="dash-title">Carbohidratos</span>' +
            '<span class="dash-badge blue">' + U.icon('wheat', 15) + '</span>' +
          '</div>' +
          '<div class="dash-bignum">' +
            '<b>' + U.n(totCarb, 0) + 'g</b><span>/ ' + U.n(metaCarb, 0) + 'g</span>' +
          '</div>' +
          '<div class="dash-bar-wrap">' +
            '<div class="dash-bar-track">' +
              '<div class="dash-bar-fill blue" style="width:' + Math.min(pctCarb, 100).toFixed(1) + '%"></div>' +
            '</div>' +
            '<span class="dash-pct">' + Math.round(pctCarb) + '%</span>' +
          '</div>' +
          '<div class="dash-sub">' +
            'Fibra: <b>' + U.n(totFiber, 0) + 'g / ' + U.n(metaFiber, 0) + 'g</b>' +
          '</div>' +
        '</div>' +

        /* 4. Grasas Saludables */
        '<div class="dash-card">' +
          '<div class="dash-card-head">' +
            '<span class="dash-title">Grasas Saludables</span>' +
            '<span class="dash-badge teal">' + U.icon('drop', 15) + '</span>' +
          '</div>' +
          '<div class="dash-bignum">' +
            '<b>' + U.n(totFat, 0) + 'g</b><span>/ ' + U.n(metaFat, 0) + 'g</span>' +
          '</div>' +
          '<div class="dash-bar-wrap">' +
            '<div class="dash-bar-track">' +
              '<div class="dash-bar-fill teal" style="width:' + Math.min(pctFat, 100).toFixed(1) + '%"></div>' +
            '</div>' +
            '<span class="dash-pct">' + Math.round(pctFat) + '%</span>' +
          '</div>' +
          '<div class="dash-sub">' +
            'Esenciales: <b>' + n3Text + '</b>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* Columna derecha: Distribución de macronutrientes */
      '<div class="dash-right-card">' +
        '<div class="dash-donut-head">' +
          '<h3>Distribución de Macronutrientes</h3>' +
          '<span class="note">Proporción del día actual</span>' +
        '</div>' +
        donutSvg +
        '<div class="dash-micro-sec">' +
          '<div class="dash-micro-title">Micronutrientes Clave</div>' +
          '<div class="dash-micro-list">' +
            '<div class="dash-micro-item">' +
              '<span class="micro-dot green"></span>' +
              '<span class="micro-name">Vitamina C</span>' +
              '<span class="micro-val">' + U.fixed(vcVal, 1) + ' mg / ' + vcRef + ' mg</span>' +
              '<span class="micro-pct">(' + Math.round(U.pct(vcVal, vcRef) || 0) + '%)</span>' +
            '</div>' +
            '<div class="dash-micro-item">' +
              '<span class="micro-dot purple"></span>' +
              '<span class="micro-name">Magnesio</span>' +
              '<span class="micro-val">' + U.fixed(mgVal, 0) + ' mg / ' + mgRef + ' mg</span>' +
              '<span class="micro-pct">(' + Math.round(U.pct(mgVal, mgRef) || 0) + '%)</span>' +
            '</div>' +
            '<div class="dash-micro-item">' +
              '<span class="micro-dot blue"></span>' +
              '<span class="micro-name">Hierro</span>' +
              '<span class="micro-val">' + U.fixed(feVal, 1) + ' mg / ' + feRef + ' mg</span>' +
              '<span class="micro-pct">(' + Math.round(U.pct(feVal, feRef) || 0) + '%)</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }


  /* ------------------------------------------------------------- Barras y desglose */

  /* v1.3: barRow ahora acepta `items` para el panel de contribuidores */
  function barRow(k, tot, refs, userMeta, items) {
    var c = col(k);
    if (!c) return '';
    var v = tot.v[k] || 0;
    var r = refs ? refs[k] : null;
    var star = (tot.missing[k] ? '*' : '');
    var pct = r ? U.pct(v, r.v) : null;

    var weight = userMeta ? (+userMeta.peso || 70) : 70;
    var kcal = userMeta ? (+userMeta.meta || +userMeta.tdee || 2000) : 2000;
    var ulStatus = N.getUlStatus(k, v, weight, kcal);

    /* Requisito 8: Alerta UL (naranja >=85%, rojo >=100% de UL) */
    var cls = '';
    if (ulStatus.status === 'danger') {
      cls = ' ul-danger';
    } else if (ulStatus.status === 'warn') {
      cls = ' ul-warn';
    } else {
      var st = r ? N.status(pct, r.tipo) : 'none';
      cls = st === 'ok' ? '' : (st === 'warn' ? ' warn' : (st === 'over' ? ' over' : (st === 'low' ? ' low' : '')));
    }

    /* Requisito 7: Si supera el 100%, la barra completa representa el total alcanzado y se dibuja un marcador en 100% */
    var w = 0;
    var markerHtml = '';
    if (pct != null && pct > 0) {
      if (pct <= 100) {
        w = pct;
      } else {
        w = 100;
        var markerPos = (100 / pct) * 100;
        markerHtml = '<div class="b-mark-100" style="left:' + markerPos.toFixed(2) + '%" title="100%">' +
          '<div class="b-mark-pin"></div><span class="b-mark-lbl">100%</span></div>';
      }
    }

    var ulBadge = '';
    if (ulStatus.status === 'danger') {
      ulBadge = '<span class="ul-pill danger" title="Supera el límite máximo tolerable (UL)">⚠️ Límite superado</span>';
    } else if (ulStatus.status === 'warn') {
      ulBadge = '<span class="ul-pill warn" title="Cerca del límite máximo tolerable (UL)">⚡ Cerca del límite</span>';
    }

    /* v1.3: contibuidores panel */
    var contribHtml = items ? renderContributors(k, items) : '';

    return '<div class="bar-row-wrap" data-expand-key="' + U.esc(k) + '">' +
      '<div class="bar-row" data-tip-nutrient="' + U.esc(k) + '" tabindex="0">' +
        '<div class="b-label" title="' + U.esc(c.desc) + '">' +
          U.esc(c.label) + star + ulBadge +
        '</div>' +
        '<div class="b-track">' +
          '<div class="b-fill' + cls + '" style="width:' + w.toFixed(1) + '%"></div>' +
          markerHtml +
        '</div>' +
        '<div class="b-val">' +
          (r ? '<b>' + U.n(pct, 0) + ' %</b>' : '') +
          '<em>' + U.fixed(v, c.dec) + (c.unidad ? ' ' + U.esc(c.unidad) : '') +
          (r ? ' / ' + U.n(r.v, 0) : '') + '</em>' +
        '</div>' +
        '<div class="b-chevron" aria-hidden="true">' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="4 6 8 10 12 6"/></svg>' +
        '</div>' +
      '</div>' +
      '<div class="nc-panel">' + contribHtml + '</div>' +
    '</div>';
  }

  /* Requisito 6: Desglose completo de las 6 secciones en la misma burbuja/tarjeta, sin repetir filas */
  function sectionPills(cols, tot, refs, userMeta) {
    var counts = { ok: 0, low: 0, close: 0, over: 0, none: 0 };
    var weight = userMeta ? (+userMeta.peso || 70) : 70;
    var kcal = userMeta ? (+userMeta.meta || +userMeta.tdee || 2000) : 2000;

    cols.forEach(function (c) {
      var r = refs ? refs[c.k] : null;
      if (!r) { counts.none += 1; return; }
      var v = tot.v[c.k] || 0;
      var pct = U.pct(v, r.v);
      var st = N.status(pct, r.tipo);
      var ul = N.getUlStatus(c.k, v, weight, kcal);
      if (ul.status === 'danger') counts.over += 1;
      else if (ul.status === 'warn') counts.close += 1;
      else if (st === 'over') counts.over += 1;
      else if (st === 'warn') counts.close += 1;
      else if (st === 'low') counts.low += 1;
      else counts.ok += 1;
    });

    var defs = [
      ['ok', '✓', 'en rango', 'Cumplen la meta o están dentro del límite máximo'],
      ['low', '↓', 'faltan', 'Por debajo del 50 % de la meta diaria'],
      ['close', '~', 'cerca', 'Entre 50 y 99 % de la meta, o cerca del límite máximo (UL)'],
      ['over', '!', 'exceden', 'Superan la meta máxima o el límite máximo tolerable (UL)'],
      ['none', '—', 'sin meta', 'La app no tiene una referencia diaria para estos nutrientes']
    ];
    var html = '<span class="s-pills">';
    defs.forEach(function (d) {
      if (!counts[d[0]]) return;
      html += '<span class="spill ' + d[0] + '" title="' + d[3] + '">' + d[1] + ' ' + counts[d[0]] + ' ' + d[2] + '</span>';
    });
    html += '</span>';
    return html;
  }

  function breakdown(tot, refs, userMeta, items) {
    var used = {};
    var html = '';

    var sections = [
      { t: '1. Energía y macronutrientes', sec: 'macro', open: true, order: ['kcal', 'protein', 'carb', 'fat', 'fiber', 'sugars', 'sfa', 'trans', 'cholesterol', 'water', 'starch', 'ash'] },
      { t: '2. Ácidos grasos esenciales y lípidos', sec: 'grasas', open: false, order: ['la', 'ala', 'epa', 'dha', 'dpa', 'ara', 'n3', 'n6', 'ratio'] },
      { t: '3. Vitaminas', sec: 'vit', open: false, order: ['va', 'retinol', 'beta_car', 'alpha_car', 'beta_cryp', 'lycopene', 'lutein', 'vc', 'vd', 've', 'vk', 'b1', 'b2', 'b3', 'b5', 'b6', 'biotin', 'folate', 'b12', 'choline', 'betaine'] },
      { t: '4. Minerales', sec: 'min', open: false, order: ['ca', 'fe', 'mg', 'p', 'k', 'na', 'zn', 'cu', 'mn', 'se', 'iodine', 'chromium', 'molybdenum', 'fluoride'] },
      { t: '5. Fitoesteroles y otros compuestos', sec: 'fito', open: false, order: ['caffeine', 'theobromine', 'fitosteroles', 'beta_sitosterol'] }
    ];

    sections.forEach(function (s) {
      var cols = DBX.cols().filter(function (c) { return c.sec === s.sec && c.tipo === 'num'; });
      if (!cols.length) return;

      var withRef = [], without = [];
      cols.forEach(function (c) {
        used[c.k] = true;
        if (refs && refs[c.k]) withRef.push(c);
        else without.push(c);
      });
      if (s.order) {
        withRef.sort(function (a, b) {
          var ia = s.order.indexOf(a.k), ib = s.order.indexOf(b.k);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });
      }

      html += '<details class="section"' + (s.open ? ' open' : '') + '>' +
        '<summary><span class="s-title">' + s.t + '</span>' +
        sectionPills(cols, tot, refs, userMeta) +
        '<span class="s-count">' + cols.length + ' nutrientes</span></summary>';

      if (withRef.length) {
        html += '<div class="bars">';
        withRef.forEach(function (c) { html += barRow(c.k, tot, refs, userMeta, items); });
        html += '</div>';
      }

      if (without.length) {
        html += '<div class="kv-grid" style="margin-top:' + (withRef.length ? '10px' : '0') + '">';
        without.forEach(function (c) {
          var v = tot.v[c.k];
          /* v1.3: kv items también son expandibles para ver contribuidores */
          var contribHtml = items ? renderContributors(c.k, items) : '';
          html += '<div class="kv-wrap" data-expand-key="' + U.esc(c.k) + '">' +
            '<div class="kv" data-tip-nutrient="' + U.esc(c.k) + '" tabindex="0">' +
              '<span class="k" title="' + U.esc(c.desc) + '">' + U.esc(c.label) + '</span>' +
              '<div class="kv-right">' +
                '<span class="v">' +
                  (v == null ? '—' : U.fixed(v, c.dec)) +
                  (c.unidad ? ' <small>' + U.esc(c.unidad) + '</small>' : '') +
                '</span>' +
                '<span class="kv-chevron" aria-hidden="true">' +
                  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><polyline points="4 6 8 10 12 6"/></svg>' +
                '</span>' +
              '</div>' +
            '</div>' +
            '<div class="nc-panel">' + contribHtml + '</div>' +
          '</div>';
        });
        html += '</div>';
      }

      html += '</details>';
    });

    /* Sección 6: Bioactivos y textos cualitativos */
    var bioHtml = bioactive(items);
    html += '<details class="section">' +
      '<summary><span class="s-title">6. Compuestos bioactivos y texto nutricional</span>' +
      '<span class="s-pills"><span class="spill qual" title="Sección cualitativa: describe antioxidantes y fitoquímicos, sin metas numéricas">Cualitativo</span></span>' +
      '<span class="s-count">Antioxidantes y fitoquímicos</span></summary>' +
      (bioHtml || '<p class="note" style="padding:8px 0">No se detectaron notas de compuestos bioactivos adicionales en los alimentos seleccionados.</p>') +
      '</details>';

    return html;
  }

  function bioactive(items) {
    var seen = {};
    (items || []).forEach(function (it) {
      if (it.food && it.food.texto && it.food.texto.antiox) {
        var t = it.food.texto.antiox;
        if (!seen[t]) seen[t] = [];
        if (seen[t].indexOf(it.food.nombre) < 0) seen[t].push(it.food.nombre);
      }
    });
    var keys = Object.keys(seen);
    if (!keys.length) return '';
    return keys.map(function (t) {
      return '<p class="prose" style="margin-bottom:8px"><b style="color:var(--txt)">' +
        U.esc(seen[t].slice(0, 4).join(', ')) + (seen[t].length > 4 ? '…' : '') +
        '</b><br>' + U.esc(t) + '</p>';
    }).join('');
  }

  /* ----------------------- Requisito 9: Tooltip flotante al pasar el cursor */
  /* v1.3: click en nutriente → expandir panel de alimentos contribuidores    */

  function initNutrientTooltips(container, tot, refs, userMeta) {
    var tipRoot = U.$('#nutrient-tooltip-root');
    if (!tipRoot) {
      tipRoot = document.createElement('div');
      tipRoot.id = 'nutrient-tooltip-root';
      tipRoot.className = 'nutrient-tooltip-root';
      document.body.appendChild(tipRoot);
    }

    /* v1.3: click handler en los wrappers de nutrientes */
    U.$$('[data-expand-key]', container).forEach(function (wrap) {
      var row = wrap.querySelector('[data-tip-nutrient]');
      if (!row) return;
      row.addEventListener('click', function (e) {
        /* Ocultar tooltip inmediatamente */
        tipRoot.style.opacity = '0';
        tipRoot.style.display = 'none';

        var isOpen = wrap.classList.contains('is-expanded');
        /* Cerrar todos los demás */
        U.$$('[data-expand-key].is-expanded', container).forEach(function (other) {
          if (other !== wrap) other.classList.remove('is-expanded');
        });
        wrap.classList.toggle('is-expanded', !isOpen);
        e.stopPropagation();
      });
    });

    U.$$('[data-tip-nutrient]', container).forEach(function (el) {
      el.addEventListener('mouseenter', function (e) {
        /* No mostrar tooltip si el panel está expandido */
        var wrap = el.closest('[data-expand-key]');
        if (wrap && wrap.classList.contains('is-expanded')) return;
        var k = el.getAttribute('data-tip-nutrient');
        var v = tot.v[k] || 0;
        var info = N.nutrientBubbleInfo(k, v, refs, userMeta);
        if (!info) return;

        var ulAlertHtml = '';
        if (info.ulStatus === 'danger') {
          ulAlertHtml = '<div class="tip-alert danger">' + U.icon('alert', 14) +
            ' <b>Supera el límite seguro:</b> ' + U.esc(info.ulRisk) + '</div>';
        } else if (info.ulStatus === 'warn') {
          ulAlertHtml = '<div class="tip-alert warn">' + U.icon('alert', 14) +
            ' <b>Cerca del límite seguro:</b> Ingesta al ' + Math.round(info.ulRatio * 100) +
            ' % del límite tolerable. ' + U.esc(info.ulRisk) + '</div>';
        }

        var ulNoteHtml = '';
        if (info.ulNote) {
          ulNoteHtml = '<div class="tip-sec">' +
            '<div class="tip-lbl">Nota:</div>' +
            '<div class="tip-txt">' + U.esc(info.ulNote) + '</div>' +
          '</div>';
        }

        /* v2.1: riesgos por déficit y por exceso, con su fuente. */
        var riskHtml =
          '<div class="tip-sec tip-risk low">' +
            '<div class="tip-lbl">Riesgo por déficit:</div>' +
            '<div class="tip-txt">' + U.esc(info.deficit) + '</div>' +
            '<div class="tip-src">Fuente: ' + U.esc(info.deficitSource) + '</div>' +
          '</div>' +
          '<div class="tip-sec tip-risk high">' +
            '<div class="tip-lbl">Riesgo por exceso:</div>' +
            '<div class="tip-txt">' + U.esc(info.excess) + '</div>' +
            '<div class="tip-src">Fuente: ' + U.esc(info.excessSource) + '</div>' +
          '</div>';

        tipRoot.innerHTML =
          '<div class="tip-head">' +
            '<b>' + U.esc(info.name) + '</b>' +
            '<span class="tip-val">' + U.fixed(info.totVal, 1) + (info.unit ? ' ' + U.esc(info.unit) : '') +
              (info.pct != null ? ' (' + Math.round(info.pct) + ' %)' : '') + '</span>' +
          '</div>' +
          '<div class="tip-sec">' +
            '<div class="tip-lbl">Cómo se calculó la meta:</div>' +
            '<div class="tip-txt">' + U.esc(info.how) + '</div>' +
          '</div>' +
          '<div class="tip-sec">' +
            '<div class="tip-lbl">Fuente oficial:</div>' +
            '<div class="tip-txt italic">' + U.esc(info.source) + '</div>' +
          '</div>' +
          '<div class="tip-sec">' +
            '<div class="tip-lbl">Límite máximo seguro diario (UL):</div>' +
            '<div class="tip-txt">' + U.esc(info.ul) + '</div>' +
          '</div>' +
          ulNoteHtml +
          riskHtml +
          ulAlertHtml;

        tipRoot.style.display = 'block';
        tipRoot.style.opacity = '1';

        var rect = el.getBoundingClientRect();
        var tipH = tipRoot.offsetHeight || 180;
        var tipW = tipRoot.offsetWidth || 300;

        var top = rect.top - tipH - 10;
        if (top < 10) top = rect.bottom + 10;
        /* v2.1: la burbuja es más alta (incluye riesgos); no dejar que se salga de la ventana. */
        if (top + tipH > window.innerHeight - 10) {
          top = Math.max(10, window.innerHeight - tipH - 10);
        }
        var left = rect.left + (rect.width / 2) - (tipW / 2);
        if (left < 10) left = 10;
        if (left + tipW > window.innerWidth - 10) left = window.innerWidth - tipW - 10;

        tipRoot.style.top = (top + window.scrollY) + 'px';
        tipRoot.style.left = (left + window.scrollX) + 'px';
      });

      el.addEventListener('mouseleave', function () {
        tipRoot.style.opacity = '0';
        setTimeout(function () {
          if (tipRoot.style.opacity === '0') tipRoot.style.display = 'none';
        }, 150);
      });
    });
  }

  /* ------------------------------------------------- comparar con metabólico */

  function pickMetab() {
    if (!Store.metab.length) {
      U.confirm({
        title: 'Sin reportes metabólicos',
        message: 'Todavía no has guardado ningún reporte metabólico. ¿Quieres crear uno ahora?',
        confirmLabel: 'Ir a calculadora de metas'
      }).then(function (ok) { if (ok) App.go('metas'); });
      return;
    }

    var body = '<div class="amt-list">';
    Store.metab.forEach(function (r) {
      var on = r.id === S.compareId;
      body += '<button class="amt-row" data-pick="' + r.id + '" style="width:100%;text-align:left;cursor:pointer;' +
        (on ? 'border-color:var(--acc-dim);background:rgba(95,217,141,.07)' : '') + '">' +
        '<div style="grid-column:1 / span 3">' +
          '<div class="a-name">' + U.esc(r.nombre) + (on ? ' · actual' : '') + '</div>' +
          '<div class="a-sub">' + U.date(r.fecha) + ' · TDEE ' + U.n(r.tdee, 0) +
          ' kcal · meta ' + U.n(r.meta, 0) + ' kcal</div>' +
        '</div>' +
        '<div class="a-kcal">' + (r.sexo === 'M' ? 'H' : 'M') + ' · ' + r.edad + ' años</div>' +
      '</button>';
    });
    body += '</div>';

    var m = U.modal({
      title: 'Reporte metabólico para comparación',
      subtitle: 'Elige contra qué metas quieres medir estas meriendas',
      body: body,
      footer: [{ label: 'Cancelar', onClick: function (h) { h.close(); } }]
    });

    m.body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick]');
      if (!b) return;
      S.compareId = b.getAttribute('data-pick');
      m.close();
      renderResult();
    });
  }

  /* --------------------------------------------------------------- guardar */

  function saveReport() {
    if (!S.meriendas.length) { U.toast('Añade al menos una merienda', 'warn'); return; }

    var prev = S.editingReportId ? Store.getComida(S.editingReportId) : null;
    var items = includedItems();
    if (!items.length) {
      U.toast('Selecciona al menos una merienda para guardar', 'warn');
      return;
    }
    var tot = N.totals(items);

    function commit(nombre) {
      var r = {
        id: S.editingReportId || U.uid('com'),
        tipo: 'comida',
        nombre: nombre,
        fecha: prev ? prev.fecha : new Date().toISOString(),
        editado: new Date().toISOString(),
        metabId: S.compareId || null,
        meriendas: S.meriendas.map(function (m) {
          return {
            id: m.id,
            nombre: m.nombre,
            items: m.items.map(function (it) { return { id: it.id, gramos: it.gramos }; })
          };
        }),
        incluidas: S.meriendas.filter(function (m) { return !!S.include[m.id]; })
          .map(function (m) { return m.id; }),
        resumen: {
          kcal: Math.round(tot.v.kcal || 0),
          protein: Math.round((tot.v.protein || 0) * 10) / 10,
          carb: Math.round((tot.v.carb || 0) * 10) / 10,
          fat: Math.round((tot.v.fat || 0) * 10) / 10
        }
      };
      if (S.editingReportId) {
        Store.updateComida(r);
        U.toast('Reporte de alimentos actualizado');
      } else {
        Store.addComida(r);
        U.toast('Reporte de alimentos guardado');
      }
      reset();
      App.go('reportes');
    }

    var sugerido = S.editingReportId && prev ? prev.nombre :
      ('Reporte de alimentos ' + (Store.comidas.length + 1));

    U.prompt({
      title: 'Guardar reporte de alimentos',
      label: 'Nombre del reporte',
      value: sugerido,
      confirmLabel: 'Guardar'
    }).then(function (n) { if (n) commit(n); });
  }

  /* ----------------------------------------------------------------- reset */

  function reset() {
    S = {
      step: 1,
      sel: {},
      draft: [],
      draftName: '',
      editingId: null,
      meriendas: [],
      counter: 1,
      include: {},
      compareId: null,
      editingReportId: null
    };
    if (root) render();
  }

  function edit(report) {
    S = {
      step: 3,
      sel: {},
      draft: [],
      draftName: '',
      editingId: null,
      meriendas: (report.meriendas || []).map(function (m) {
        return {
          id: m.id || U.uid('mer'),
          nombre: m.nombre || 'Merienda',
          items: (m.items || []).map(function (it) { return { id: it.id, gramos: +it.gramos || 0 }; })
        };
      }),
      counter: (report.meriendas || []).length + 1,
      include: {},
      compareId: report.metabId || null,
      editingReportId: report.id
    };
    // respeta las meriendas que estaban desmarcadas al guardar
    var guardadas = Array.isArray(report.incluidas) ? report.incluidas : null;
    S.meriendas.forEach(function (m) {
      S.include[m.id] = guardadas ? guardadas.indexOf(m.id) >= 0 : true;
    });
    if (!S.meriendas.length) S.step = 1;
    render();
  }

  function addFood(id) {
    if (!foodOf(id)) return;
    S.sel[id] = true;
    if (S.step === 3) S.step = 1;
    if (root) render();
    U.toast('Añadido a la selección');
  }

  /* ------------------------------------------------------------------ init */

  function build() {
    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1>Calculadora de comida</h1>' +
          '<p>Arma tus meriendas y compara lo que comes contra tus metas.</p>' +
        '</div>' +
        '<div class="head-actions">' +
          '<span class="badge" id="ml-state">Nuevo</span>' +
          '<button class="btn btn-sm" id="ml-new" style="display:none">' +
            U.icon('plus', 15) + '<span>Nuevo</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="merienda-strip" id="ml-strip" style="display:none"></div>' +
      '<div class="stepbar" id="ml-stepbar"></div>' +
      '<div id="ml-body"></div>' +
      '<div class="sticky-bar" id="ml-bar"></div>';

    els.strip = U.$('#ml-strip', root);
    els.stepbar = U.$('#ml-stepbar', root);
    els.body = U.$('#ml-body', root);
    els.bar = U.$('#ml-bar', root);
    els.state = U.$('#ml-state', root);
    els.newBtn = U.$('#ml-new', root);

    els.newBtn.addEventListener('click', function () {
      if (!S.meriendas.length) { reset(); return; }
      U.confirm({
        title: 'Empezar de nuevo',
        message: 'Se perderán las meriendas de esta sesión. Los reportes guardados no se tocan.',
        confirmLabel: 'Empezar de nuevo',
        danger: true
      }).then(function (ok) { if (ok) reset(); });
    });

    els.strip.addEventListener('click', function (e) {
      var copy = e.target.closest('[data-copy]');
      if (copy) { e.stopPropagation(); copyMerienda(copy.getAttribute('data-copy')); return; }
      var del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); deleteMerienda(del.getAttribute('data-del')); return; }
      var card = e.target.closest('[data-mid]');
      if (card) { editMerienda(card.getAttribute('data-mid')); return; }
      if (e.target.closest('[data-act="new"]')) {
        S.draft = [];
        S.editingId = null;
        S.sel = {};
        S.step = 1;
        render();
      }
    });

    render();
  }

  window.Meal = {
    init: function () {
      root = U.$('#view-comida');
      DBX.cols().forEach(function (c) { COLBY[c.k] = c; });
      build();
      Store.subscribe(function () {
        if (S.compareId && !Store.getMetab(S.compareId)) {
          S.compareId = null;
          if (S.step === 3 && root) renderResult();
        }
      });
    },
    edit: edit,
    reset: reset,
    addFood: addFood,
    get state() { return S; }
  };
})();
