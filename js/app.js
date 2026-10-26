/* ==========================================================================
   app.js — arranque, navegación y datos (importar / exportar reportes).
   ========================================================================== */
(function () {
  'use strict';

  var VIEWS = {
    catalogo: 'Catálogo de alimentos',
    metas: 'Calculadora de metas',
    comida: 'Calculadora de comida',
    reportes: 'Reportes'
  };

  var current = null;
  var els = {};
  var catalog = null;

  /* ---------------------------------------------------------------- catálogo */

  function buildCatalogo() {
    var host = U.$('#view-catalogo');
    host.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<h1>Catálogo de alimentos</h1>' +
          '<p>' + DB.meta.filas + ' alimentos · ' + DB.meta.columnas + ' columnas · ' +
            DB.categorias.length + ' categorías. Toca un alimento para ver su ficha completa.</p>' +
        '</div>' +
        '<div class="head-actions">' +
          '<span class="badge green">' + U.icon('leaf', 13) + '<span>Base mexicana</span></span>' +
        '</div>' +
      '</div>' +
      '<div id="cat-gallery"></div>';

    catalog = Gallery.create(U.$('#cat-gallery', host), {
      card: (Store.prefs && Store.prefs.card) || 132,
      onOpen: function (food) { App.food(food.id); }
    });
  }

  /* -------------------------------------------------------------- navegación */

  function bindNav() {
    els.nav.addEventListener('click', function (e) {
      var b = e.target.closest('.nav-item');
      if (!b) return;
      go(b.getAttribute('data-view'));
    });
  }

  function go(view) {
    if (!VIEWS[view]) view = 'catalogo';
    current = view;

    U.$$('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.id === 'view-' + view);
    });
    U.$$('.nav-item', els.nav).forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === view);
    });

    if (view === 'reportes' && window.Reports) Reports.render();
    if (view === 'catalogo' && catalog) catalog.refresh();

    els.main.scrollTop = 0;
    document.title = 'Nutrición · ' + VIEWS[view];
  }

  /* ------------------------------------------------------------ ficha alimento */

  function food(id) {
    var f = Gallery.byId(id);
    if (!f) return;
    Gallery.detail(f, {
      onUse: function (alimento) {
        Meal.addFood(alimento.id);
        go('comida');
      }
    });
  }

  /* ------------------------------------------------------------------ pie */

  function paintMeta() {
    if (els.dbInfo) {
      els.dbInfo.textContent = DB.meta.filas + ' alimentos · ' + DB.meta.columnas + ' col.';
      els.dbInfo.title = DB.meta.fuente + ' · generado ' + DB.meta.generado;
    }
    if (els.storeState) {
      var n = Store.metab.length + Store.comidas.length;
      if (!n) {
        els.storeState.textContent = 'memoria (0 reportes)';
        els.storeState.title = 'Todo se mantiene en memoria; no se modifican archivos. Usa Exportar para guardar.';
      } else {
        els.storeState.textContent = 'memoria (' + n + ' reporte' + (n === 1 ? '' : 's') + ')';
        els.storeState.title = 'Los reportes viven solo en memoria. Usa Exportar para guardarlos en archivo.';
      }
    }
  }

  /* ---------------------------------------------------------------- exportar */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function exportReports() {
    var n = Store.metab.length + Store.comidas.length;
    if (!n) {
      U.toast('No hay reportes guardados para exportar', 'warn');
      return;
    }
    var d = new Date();
    var stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    U.download('reportes-nutricion-' + stamp + '.json', Store.exportJSON());
    U.toast('Exportados ' + n + ' reporte' + (n === 1 ? '' : 's'));
  }

  /* ---------------------------------------------------------------- importar */

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();

    reader.onerror = function () {
      U.toast('No se pudo leer el archivo', 'err');
    };

    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (e) {
        U.toast('El archivo no es un JSON válido', 'err');
        return;
      }

      var nm = Array.isArray(data) ? 0 : (Array.isArray(data.metab) ? data.metab.length : 0);
      var nc = Array.isArray(data) ? data.length : (Array.isArray(data.comidas) ? data.comidas.length : 0);

      if (!nm && !nc) {
        U.toast('El archivo no contiene reportes', 'warn');
        return;
      }

      var actuales = Store.metab.length + Store.comidas.length;
      var m = U.modal({
        title: 'Importar reportes',
        subtitle: 'Archivo: ' + file.name,
        size: 'sm',
        body:
          '<p class="note" style="font-size:12.8px;line-height:1.65">El archivo contiene ' +
            '<b>' + nm + '</b> reporte' + (nm === 1 ? '' : 's') + ' metabólico' + (nm === 1 ? '' : 's') +
            ' y <b>' + nc + '</b> reporte' + (nc === 1 ? '' : 's') + ' de alimentos.</p>' +
          '<div class="note mt-14" style="border:1px solid var(--line);border-radius:10px;' +
            'padding:11px 13px;background:var(--bg-2)">' +
            '<b style="color:var(--txt-2)">Combinar</b> añade los reportes que aún no existen y ' +
            'conserva los actuales (' + actuales + ').<br>' +
            '<b style="color:var(--txt-2)">Reemplazar</b> borra todos los reportes actuales y deja ' +
            'solo los del archivo.</div>',
        footer: [
          { label: 'Cancelar', onClick: function (h) { h.close(); } },
          {
            label: 'Reemplazar',
            kind: 'btn-danger',
            onClick: function (h) { h.close(); run('replace'); }
          },
          {
            label: 'Combinar',
            kind: 'btn-acc',
            onClick: function (h) { h.close(); run('merge'); }
          }
        ]
      });

      function run(mode) {
        try {
          var r = Store.importJSON(JSON.stringify(data), mode);
          if (mode === 'replace') {
            U.toast('Reportes reemplazados · ' + (r.replaced || 0) + ' anteriores descartados');
          } else {
            U.toast('Importados ' + r.added + ' · ya existían ' + r.skipped);
          }
          paintMeta();
        } catch (err) {
          U.toast(err && err.message ? err.message : 'No se pudo importar el archivo', 'err');
        }
      }

      return m;
    };

    reader.readAsText(file, 'utf-8');
  }

  function bindIO() {
    U.$('#btn-import').addEventListener('click', function () { els.file.click(); });

    els.file.addEventListener('change', function () {
      var f = els.file.files && els.file.files[0];
      if (f) importFile(f);
      els.file.value = '';
    });

    U.$('#btn-export').addEventListener('click', exportReports);

    // si el usuario arrastra un archivo JSON sobre la ventana
    ['dragover', 'drop'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
        e.preventDefault();
      });
    });
    document.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /\.json$/i.test(f.name)) importFile(f);
    });
  }

  /* ------------------------------------------------------------------- init */

  function init() {
    if (!window.DB) {
      U.$('#main').innerHTML =
        '<div class="empty">' + U.icon('alert', 42) +
        '<b>No se encontró la base de alimentos</b>' +
        '<p>Falta <code>data/alimentos.js</code>. Genéralo con <code>py tools/build_data.py</code>.</p></div>';
      return;
    }

    els.nav = U.$('#nav');
    els.main = U.$('#main');
    els.dbInfo = U.$('#db-info');
    els.storeState = U.$('#store-state');
    els.file = U.$('#file-import');

    buildCatalogo();
    Metab.init();
    Meal.init();
    Reports.init();

    bindNav();
    bindIO();

    paintMeta();
    Store.subscribe(paintMeta);

    go('catalogo');

    if (!Store.available) {
      U.toast('Este navegador no permite guardar datos: los reportes se perderán al cerrar.', 'warn');
    }
  }

  var App = {
    go: go,
    food: food,
    init: init,
    current: function () { return current; },
    refreshCatalog: function () { if (catalog) catalog.refresh(); }
  };

  window.App = App;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
