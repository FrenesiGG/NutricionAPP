/* ==========================================================================
   reports.js — consulta, edición, duplicado y borrado de reportes.
   ========================================================================== */
(function () {
  'use strict';

  var root = null;
  var els = {};
  var tab = 'metab';

  function build() {
    root.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1>Reportes</h1>' +
          '<p>Tus cálculos activos en memoria (exporta para guardar en archivo).</p>' +
        '</div>' +
        '<div class="head-actions">' +
          '<button class="btn btn-sm" id="rp-metab">' + U.icon('target', 15) +
            '<span>Nueva meta</span></button>' +
          '<button class="btn btn-sm" id="rp-comida">' + U.icon('utensils', 15) +
            '<span>Nueva comida</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="tabs">' +
        '<button class="tab is-on" data-tab="metab">Metabólicos <span class="n"></span></button>' +
        '<button class="tab" data-tab="comida">Alimentos <span class="n"></span></button>' +
      '</div>' +
      '<div id="rp-body"></div>';

    els.body = U.$('#rp-body', root);

    U.$('#rp-metab', root).addEventListener('click', function () {
      Metab.reset();
      App.go('metas');
    });
    U.$('#rp-comida', root).addEventListener('click', function () {
      Meal.reset();
      App.go('comida');
    });

    U.$$('.tab', root).forEach(function (t) {
      t.addEventListener('click', function () {
        tab = t.getAttribute('data-tab');
        render();
      });
    });

    els.body.addEventListener('click', function (e) {
      /* v1.4: clic en botón de acción explícito */
      var b = e.target.closest('[data-act]');
      if (b) {
        e.stopPropagation();
        var act = b.getAttribute('data-act');
        var id = b.getAttribute('data-id');
        var tipo = b.getAttribute('data-tipo');
        if (act === 'edit') edit(id, tipo);
        else if (act === 'rename') rename(id, tipo);
        else if (act === 'dupe') dupe(id, tipo);
        else if (act === 'del') remove(id, tipo);
        else if (act === 'new-metab') { Metab.reset(); App.go('metas'); }
        else if (act === 'new-comida') { Meal.reset(); App.go('comida'); }
        return;
      }
      /* v1.4: clic en la tarjeta (fuera de los botones) → editar */
      var card = e.target.closest('.rp-clickable');
      if (card) {
        edit(card.getAttribute('data-edit-id'), card.getAttribute('data-edit-tipo'));
      }
    });
  }

  /* -------------------------------------------------------------- pintado */

  function render() {
    var m = Store.metab, c = Store.comidas;

    U.$$('.tab', root).forEach(function (t) {
      var isMetab = t.getAttribute('data-tab') === 'metab';
      t.classList.toggle('is-on', t.getAttribute('data-tab') === tab);
      U.$('.n', t).textContent = isMetab ? m.length : c.length;
    });

    if (tab === 'metab') {
      if (!m.length) {
        els.body.innerHTML = emptyState('target',
          'Todavía no hay reportes metabólicos',
          'Calcula tu TMB y TDEE para usarlos como meta en la calculadora de comida.',
          'new-metab', 'Crear una meta');
        return;
      }
      els.body.innerHTML = '<div class="reports-grid">' + m.map(cardMetab).join('') + '</div>';
    } else {
      if (!c.length) {
        els.body.innerHTML = emptyState('utensils',
          'Todavía no hay reportes de alimentos',
          'Arma tus meriendas en la calculadora y guarda el resultado para consultarlo aquí.',
          'new-comida', 'Crear un reporte de comida');
        return;
      }
      els.body.innerHTML = '<div class="reports-grid">' + c.map(cardComida).join('') + '</div>';
    }
  }

  function emptyState(icon, title, text, act, label) {
    return '<div class="empty">' + U.icon(icon, 42) +
      '<b>' + U.esc(title) + '</b><p>' + U.esc(text) + '</p>' +
      '<button class="btn btn-acc btn-sm" data-act="' + act + '">' +
        U.icon('plus', 15) + '<span>' + U.esc(label) + '</span></button></div>';
  }

  function actions(id, tipo) {
    return '<div class="report-foot">' +
      '<span class="r-link"></span>' +
      btn('rename', id, tipo, 'edit', 'Renombrar') +
      btn('dupe', id, tipo, 'copy', 'Duplicar') +
      btn('del', id, tipo, 'trash', 'Eliminar', true) +
    '</div>';
  }

  function btn(act, id, tipo, icon, title, danger) {
    return '<button class="icon-btn' + (danger ? ' danger' : '') + '" title="' + title +
      '" aria-label="' + title + '" data-act="' + act + '" data-id="' + U.esc(id) +
      '" data-tipo="' + tipo + '">' + U.icon(icon, 15) + '</button>';
  }

  function cardMetab(r) {
    var usos = Store.metabInUse(r.id);
    var link = usos.length
      ? usos.length + ' reporte' + (usos.length > 1 ? 's' : '') + ' de alimentos lo usa' + (usos.length > 1 ? 'n' : '')
      : 'Sin usar en reportes de alimentos';

    return '<article class="report-card rp-clickable" data-edit-id="' + U.esc(r.id) + '" data-edit-tipo="metab">' +
      '<div class="report-top">' +
        '<div class="r-kind">' + U.icon('target', 17) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<h3>' + U.esc(r.nombre) + '</h3>' +
          '<div class="r-date">' + U.date(r.fecha) + ' · ' +
            (r.sexo === 'M' ? 'Hombre' : 'Mujer') + ' · ' + U.esc(r.edad) + ' años · ' +
            U.esc(r.peso) + ' kg' + (r.ganarMusculo ? ' · Hipertrofia (' + (r.protGKg || 2.0) + ' g/kg)' : '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="report-stats">' +
        stat('TMB', r.tmb, 'kcal') +
        stat('TDEE', r.tdee, 'kcal') +
        stat('Meta', r.meta, 'kcal') +
      '</div>' +
      actions(r.id, 'metab').replace('<span class="r-link"></span>',
        '<span class="r-link">' + U.esc(link) + '</span>') +
    '</article>';
  }

  function cardComida(r) {
    var metab = r.metabId ? Store.getMetab(r.metabId) : null;
    var n = (r.meriendas || []).length;
    var items = 0;
    (r.meriendas || []).forEach(function (m) { items += (m.items || []).length; });

    var res = r.resumen || {};
    var link = metab ? 'Comparado con “' + metab.nombre + '”' : 'Sin comparación metabólica';

    return '<article class="report-card rp-clickable" data-edit-id="' + U.esc(r.id) + '" data-edit-tipo="comida">' +
      '<div class="report-top">' +
        '<div class="r-kind food">' + U.icon('utensils', 17) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<h3>' + U.esc(r.nombre) + '</h3>' +
          '<div class="r-date">' + U.date(r.fecha) + ' · ' + n + ' merienda' +
            (n === 1 ? '' : 's') + ' · ' + items + ' alimento' + (items === 1 ? '' : 's') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="report-stats">' +
        stat('Energía', res.kcal, 'kcal', 0) +
        stat('Proteína', res.protein, 'g', 1) +
        stat('Carbo', res.carb, 'g', 1) +
        stat('Grasas', res.fat, 'g', 1) +
      '</div>' +
      actions(r.id, 'comida').replace('<span class="r-link"></span>',
        '<span class="r-link">' + U.esc(link) + '</span>') +
    '</article>';
  }

  function stat(label, v, unit, dec) {
    return '<div><span>' + label + '</span><b>' +
      (v == null ? '—' : U.n(v, dec == null ? 0 : dec)) + '<small>' + unit + '</small></b></div>';
  }

  /* -------------------------------------------------------------- acciones */

  function find(id, tipo) {
    return tipo === 'metab' ? Store.getMetab(id) : Store.getComida(id);
  }

  function edit(id, tipo) {
    var r = find(id, tipo);
    if (!r) return;
    if (tipo === 'metab') { Metab.edit(r); App.go('metas'); }
    else { Meal.edit(r); App.go('comida'); }
  }

  function rename(id, tipo) {
    var r = find(id, tipo);
    if (!r) return;
    U.prompt({
      title: 'Renombrar reporte',
      label: 'Nombre',
      value: r.nombre,
      confirmLabel: 'Guardar'
    }).then(function (n) {
      if (!n) return;
      var copia = JSON.parse(JSON.stringify(r));
      copia.nombre = n;
      if (tipo === 'metab') Store.updateMetab(copia);
      else Store.updateComida(copia);
      U.toast('Nombre actualizado');
      render();
    });
  }

  function dupe(id, tipo) {
    var r = find(id, tipo);
    if (!r) return;
    var copia = JSON.parse(JSON.stringify(r));
    copia.id = U.uid(tipo === 'metab' ? 'met' : 'com');
    copia.nombre = r.nombre + ' (copia)';
    copia.fecha = new Date().toISOString();
    copia.editado = copia.fecha;
    if (tipo === 'metab') Store.addMetab(copia);
    else {
      // cada merienda necesita ids propios para no chocar al editar
      (copia.meriendas || []).forEach(function (m) { m.id = U.uid('mer'); });
      Store.addComida(copia);
    }
    U.toast('Reporte duplicado');
    render();
  }

  function remove(id, tipo) {
    var r = find(id, tipo);
    if (!r) return;

    if (tipo === 'metab') {
      var usos = Store.metabInUse(id);
      if (usos.length) {
        var lista = usos.map(function (c) {
          return '<li style="margin-bottom:4px">' + U.esc(c.nombre) + '</li>';
        }).join('');
        var extra =
          '<div class="note mt-14" style="border:1px solid rgba(243,185,95,.35);' +
          'background:rgba(243,185,95,.08);border-radius:10px;padding:11px 13px">' +
          '<b style="color:#f6c87f">Este reporte metabólico está en uso:</b>' +
          '<ul style="margin:7px 0 8px;padding-left:18px;color:var(--txt-2)">' + lista + '</ul>' +
          'Si lo eliminas, esos reportes de alimentos conservarán sus datos pero perderán ' +
          'la comparación contra tus metas.</div>';

        U.confirm({
          title: 'Eliminar reporte en uso',
          message: 'Estás a punto de borrar <b>' + U.esc(r.nombre) + '</b>, que se usa como ' +
            'referencia en ' + usos.length + ' reporte' + (usos.length > 1 ? 's' : '') + ' de alimentos.',
          extra: extra,
          confirmLabel: 'Eliminar de todas formas',
          cancelLabel: 'Cancelar',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          Store.unlinkMetab(id);
          Store.removeMetab(id);
          U.toast('Reporte eliminado y comparaciones desvinculadas');
          render();
        });
        return;
      }

      U.confirm({
        title: 'Eliminar reporte',
        message: '¿Eliminar <b>' + U.esc(r.nombre) + '</b>? Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        Store.removeMetab(id);
        U.toast('Reporte eliminado');
        render();
      });
      return;
    }

    U.confirm({
      title: 'Eliminar reporte',
      message: '¿Eliminar <b>' + U.esc(r.nombre) + '</b>? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      Store.removeComida(id);
      U.toast('Reporte eliminado');
      render();
    });
  }

  window.Reports = {
    init: function () {
      root = U.$('#view-reportes');
      build();
      Store.subscribe(function () {
        if (root.classList.contains('is-active')) render();
      });
      render();
    },
    render: render,
    showTab: function (t) { tab = t; render(); }
  };
})();
